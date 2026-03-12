from __future__ import annotations

from datetime import UTC, date, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...models import Code, CoordinationEpisode, Episode

PHASE_CODE_TYPE = "TPL_PHASE"
STATUS_CODE_TYPE = "TPL_STATUS"

PHASE_EVALUATION = "EVALUATION"
PHASE_LISTING = "LISTING"
PHASE_TRANSPLANTATION = "TRANSPLANTATION"
PHASE_FOLLOW_UP = "FOLLOW_UP"

STATUS_EVALUATION = "EVALUATION"
STATUS_TRANSPLANTABLE = "TRANSPLANTABLE"
STATUS_ALLOCATED = "ALLOCATED"
STATUS_TRANSPLANTED = "TRANSPLANTED"
STATUS_REJECTED = "REJECTED"
STATUS_CANCELLED = "CANCELLED"

_COMMON_EDITABLE_KEYS = {
    "fall_nr",
    "comment",
    "cave",
    "organ_id",
    "organ_ids",
}

_PHASE_EDITABLE_KEYS: dict[str, set[str]] = {
    PHASE_EVALUATION: {
        "start",
        "eval_start",
        "eval_end",
        "eval_assigned_to",
        "eval_stat",
        "eval_register_date",
        "eval_excluded",
        "eval_non_list_sent",
    },
    PHASE_LISTING: {
        "list_start",
        "list_end",
        "list_rs_nr",
        "list_reason_delist",
        "list_expl_delist",
        "list_delist_sent",
    },
    PHASE_TRANSPLANTATION: {
        "tpl_date",
    },
    PHASE_FOLLOW_UP: {
        "fup_recipient_card_done",
        "fup_recipient_card_date",
    },
}

_WORKFLOW_ACTION_LABELS = {
    "START_LISTING": "start listing",
    "ALLOCATE_COORDINATION": "start coordination allocation",
    "MARK_TRANSPLANTATION": "mark transplantation",
    "START_FOLLOW_UP": "start follow-up",
    "CLOSE": "close episode",
    "REJECT": "reject episode",
    "CANCEL": "cancel episode",
}

_ALLOWED_PHASES_BY_ACTION: dict[str, set[str]] = {
    "START_LISTING": {PHASE_EVALUATION, PHASE_LISTING},
    "ALLOCATE_COORDINATION": {PHASE_LISTING, PHASE_TRANSPLANTATION, PHASE_FOLLOW_UP},
    "MARK_TRANSPLANTATION": {PHASE_EVALUATION, PHASE_LISTING, PHASE_TRANSPLANTATION, PHASE_FOLLOW_UP},
    "START_FOLLOW_UP": {PHASE_EVALUATION, PHASE_LISTING, PHASE_TRANSPLANTATION, PHASE_FOLLOW_UP},
    "CLOSE": {PHASE_FOLLOW_UP},
    "REJECT": {PHASE_EVALUATION, PHASE_LISTING, PHASE_TRANSPLANTATION, PHASE_FOLLOW_UP},
    "CANCEL": {PHASE_EVALUATION, PHASE_LISTING, PHASE_TRANSPLANTATION, PHASE_FOLLOW_UP},
}


def _code_or_500(*, db: Session, code_type: str, code_key: str) -> Code:
    code = db.query(Code).filter(Code.type == code_type, Code.key == code_key).first()
    if code is None:
        raise HTTPException(status_code=500, detail=f"Missing code {code_type}.{code_key}")
    return code


def _set_phase(*, episode: Episode, phase_key: str, db: Session) -> None:
    phase = _code_or_500(db=db, code_type=PHASE_CODE_TYPE, code_key=phase_key)
    episode.phase_id = phase.id


def _set_status(*, episode: Episode, status_key: str, db: Session) -> None:
    status = _code_or_500(db=db, code_type=STATUS_CODE_TYPE, code_key=status_key)
    episode.status_id = status.id


def _resolved_phase_key(episode: Episode) -> str:
    phase_key = ((episode.phase.key if episode.phase else "") or "").strip().upper()
    if phase_key:
        return phase_key
    if episode.fup_recipient_card_date is not None:
        return PHASE_FOLLOW_UP
    if episode.tpl_date is not None:
        return PHASE_TRANSPLANTATION
    if episode.list_start is not None or episode.list_end is not None:
        return PHASE_LISTING
    return PHASE_EVALUATION


def resolved_phase_key(episode: Episode) -> str:
    return _resolved_phase_key(episode)


def _assert_action_phase_allowed(*, episode: Episode, action: str, detail: str | None = None) -> str:
    phase_key = _resolved_phase_key(episode)
    allowed = _ALLOWED_PHASES_BY_ACTION.get(action, set())
    if phase_key not in allowed:
        if detail:
            raise HTTPException(status_code=422, detail=detail)
        action_label = _WORKFLOW_ACTION_LABELS.get(action, action.lower())
        allowed_label = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot {action_label} from episode phase {phase_key}. "
                f"Allowed phases: {allowed_label}"
            ),
        )
    return phase_key


def _is_terminal(episode: Episode) -> bool:
    status_key = ((episode.status.key if episode.status else "") or "").strip().upper()
    return bool(episode.closed) or status_key in {STATUS_REJECTED, STATUS_CANCELLED}


def initialize_episode_workflow(
    *,
    episode: Episode,
    changed_by_id: int,
    db: Session,
) -> None:
    if episode.start is None:
        raise HTTPException(status_code=422, detail="Episode start date is required")
    if episode.eval_start is None:
        episode.eval_start = episode.start
    _set_phase(episode=episode, phase_key=PHASE_EVALUATION, db=db)
    _set_status(episode=episode, status_key=STATUS_EVALUATION, db=db)
    episode.changed_by_id = changed_by_id


def enforce_phase_editability(
    *,
    episode: Episode,
    changed_keys: set[str],
) -> None:
    forbidden_direct_keys = {"phase_id", "status_id"}
    attempted_direct = forbidden_direct_keys.intersection(changed_keys)
    if attempted_direct:
        raise HTTPException(
            status_code=422,
            detail="phase_id/status_id are workflow-managed and cannot be edited directly",
        )

    if "closed" in changed_keys or "end" in changed_keys:
        raise HTTPException(
            status_code=422,
            detail="Use episode workflow actions to close/reject/cancel an episode",
        )

    phase_key = _resolved_phase_key(episode)
    allowed = set(_COMMON_EDITABLE_KEYS)
    allowed.update(_PHASE_EDITABLE_KEYS.get(phase_key, set()))
    disallowed = sorted([key for key in changed_keys if key not in allowed])
    if disallowed:
        raise HTTPException(
            status_code=422,
            detail=f"Fields not editable in current episode phase ({phase_key}): {', '.join(disallowed)}",
        )


def start_listing_phase(
    *,
    episode: Episode,
    start_date: date,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        raise HTTPException(status_code=422, detail="Cannot start listing for a closed/cancelled/rejected episode")
    phase_key = _assert_action_phase_allowed(
        episode=episode,
        action="START_LISTING",
        detail="Listing can only be started from evaluation",
    )
    if episode.eval_start and start_date < episode.eval_start:
        raise HTTPException(status_code=422, detail="Listing start cannot be before evaluation start")
    episode.list_start = start_date
    if episode.eval_end is None or episode.eval_end < start_date:
        episode.eval_end = start_date
    _set_phase(episode=episode, phase_key=PHASE_LISTING, db=db)
    _set_status(episode=episode, status_key=STATUS_TRANSPLANTABLE, db=db)
    episode.changed_by_id = changed_by_id


def mark_coordination_allocation_started(
    *,
    episode: Episode,
    coordination_start: date | None,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        raise HTTPException(status_code=422, detail="Cannot allocate a closed/cancelled/rejected episode")
    phase_key = _assert_action_phase_allowed(
        episode=episode,
        action="ALLOCATE_COORDINATION",
    )
    if phase_key == PHASE_EVALUATION:
        raise HTTPException(status_code=422, detail="Episode must be in listing before coordination allocation")
    if coordination_start is not None and (episode.list_end is None or episode.list_end < coordination_start):
        episode.list_end = coordination_start
    _set_phase(episode=episode, phase_key=PHASE_TRANSPLANTATION, db=db)
    _set_status(episode=episode, status_key=STATUS_ALLOCATED, db=db)
    episode.changed_by_id = changed_by_id


def mark_transplantation_started(
    *,
    episode: Episode,
    transplant_date: date,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        raise HTTPException(status_code=422, detail="Cannot transplant a closed/cancelled/rejected episode")
    _assert_action_phase_allowed(episode=episode, action="MARK_TRANSPLANTATION")
    if episode.tpl_date is None or transplant_date < episode.tpl_date:
        episode.tpl_date = transplant_date
    _set_phase(episode=episode, phase_key=PHASE_TRANSPLANTATION, db=db)
    _set_status(episode=episode, status_key=STATUS_TRANSPLANTED, db=db)
    episode.changed_by_id = changed_by_id


def mark_follow_up_started(
    *,
    episode: Episode,
    started_at: date,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        return
    _assert_action_phase_allowed(episode=episode, action="START_FOLLOW_UP")
    _set_phase(episode=episode, phase_key=PHASE_FOLLOW_UP, db=db)
    episode.changed_by_id = changed_by_id
    if episode.tpl_date is None:
        episode.tpl_date = started_at


def close_episode(
    *,
    episode: Episode,
    end_date: date,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        raise HTTPException(status_code=422, detail="Episode is already terminal")
    _assert_action_phase_allowed(
        episode=episode,
        action="CLOSE",
        detail="Episode can only be closed from follow-up phase",
    )
    episode.end = end_date
    episode.closed = True
    episode.changed_by_id = changed_by_id


def reject_episode(
    *,
    episode: Episode,
    end_date: date,
    reason: str,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        raise HTTPException(status_code=422, detail="Episode is already terminal")
    _assert_action_phase_allowed(episode=episode, action="REJECT")
    has_coordination = (
        db.query(CoordinationEpisode.id)
        .filter(CoordinationEpisode.episode_id == episode.id)
        .first()
        is not None
    )
    if has_coordination:
        raise HTTPException(status_code=422, detail="Episode cannot be rejected after coordination has started")
    episode.end = end_date
    episode.closed = True
    _set_status(episode=episode, status_key=STATUS_REJECTED, db=db)
    if reason.strip():
        episode.comment = reason.strip()
    episode.changed_by_id = changed_by_id


def cancel_episode(
    *,
    episode: Episode,
    end_date: date,
    reason: str,
    changed_by_id: int,
    db: Session,
) -> None:
    if _is_terminal(episode):
        raise HTTPException(status_code=422, detail="Episode is already terminal")
    _assert_action_phase_allowed(episode=episode, action="CANCEL")
    episode.end = end_date
    episode.closed = True
    _set_status(episode=episode, status_key=STATUS_CANCELLED, db=db)
    if reason.strip():
        episode.comment = reason.strip()
    episode.changed_by_id = changed_by_id


def today_utc_date() -> date:
    return datetime.now(UTC).date()
