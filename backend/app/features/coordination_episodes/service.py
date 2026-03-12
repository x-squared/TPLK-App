from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from ...features.episodes.workflow_service import (
    mark_coordination_allocation_started,
    mark_transplantation_started,
)
from ...features.tasks import ensure_coordination_protocol_task_groups
from ...models import Code, Coordination, CoordinationEpisode, Episode
from ...schemas import CoordinationEpisodeCreate, CoordinationEpisodeUpdate

_DUAL_ASSIGNMENT_ORGAN_KEYS = {"KIDNEY", "LUNG"}


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _query_with_joins(db: Session):
    return db.query(CoordinationEpisode).options(
        joinedload(CoordinationEpisode.episode).joinedload(Episode.phase),
        joinedload(CoordinationEpisode.organ),
        joinedload(CoordinationEpisode.organ_rejection_sequel),
        joinedload(CoordinationEpisode.changed_by_user),
    )


def _validate_code(code_id: int, expected_type: str, field_name: str, db: Session) -> None:
    entry = db.query(Code).filter(Code.id == code_id, Code.type == expected_type).first()
    if not entry:
        raise HTTPException(status_code=422, detail=f"{field_name} must reference CODE.{expected_type}")


def _validate_code_optional(code_id: int | None, expected_type: str, field_name: str, db: Session) -> None:
    if code_id is None:
        return
    entry = db.query(Code).filter(Code.id == code_id, Code.type == expected_type).first()
    if not entry:
        raise HTTPException(status_code=422, detail=f"{field_name} must reference CODE.{expected_type}")


def _validate_episode_exists(episode_id: int, db: Session) -> None:
    entry = db.query(Episode).filter(Episode.id == episode_id).first()
    if not entry:
        raise HTTPException(status_code=422, detail="episode_id must reference EPISODE")


def _max_assignments_for_organ(*, organ_id: int, db: Session) -> int:
    organ = db.query(Code).filter(Code.id == organ_id, Code.type == "ORGAN").first()
    organ_key = ((organ.key if organ else "") or "").strip().upper()
    return 2 if organ_key in _DUAL_ASSIGNMENT_ORGAN_KEYS else 1


def _enforce_assignment_limit(
    *,
    coordination_id: int,
    organ_id: int,
    db: Session,
    exclude_coordination_episode_id: int | None = None,
) -> None:
    query = db.query(CoordinationEpisode).filter(
        CoordinationEpisode.coordination_id == coordination_id,
        CoordinationEpisode.organ_id == organ_id,
    )
    if exclude_coordination_episode_id is not None:
        query = query.filter(CoordinationEpisode.id != exclude_coordination_episode_id)
    current_count = query.count()
    max_allowed = _max_assignments_for_organ(organ_id=organ_id, db=db)
    if current_count >= max_allowed:
        raise HTTPException(
            status_code=422,
            detail=f"At most {max_allowed} episode assignment(s) are allowed for the selected organ in this coordination.",
        )


def _validate_payload(
    *,
    episode_id: int,
    organ_id: int,
    organ_rejection_sequel_id: int | None,
    db: Session,
) -> None:
    _validate_episode_exists(episode_id, db)
    _validate_code(organ_id, "ORGAN", "organ_id", db)
    _validate_code_optional(
        organ_rejection_sequel_id,
        "ORGAN_REJECTION_SEQUEL",
        "organ_rejection_sequel_id",
        db,
    )


def list_coordination_episodes(*, coordination_id: int, db: Session) -> list[CoordinationEpisode]:
    _ensure_coordination_exists(coordination_id, db)
    return (
        _query_with_joins(db)
        .filter(CoordinationEpisode.coordination_id == coordination_id)
        .all()
    )


def list_coordination_episodes_for_recipient_selection(
    *,
    coordination_id: int,
    organ_id: int,
    db: Session,
) -> list[CoordinationEpisode]:
    _ensure_coordination_exists(coordination_id, db)
    rows = (
        _query_with_joins(db)
        .filter(CoordinationEpisode.coordination_id == coordination_id)
        .all()
    )
    result: list[CoordinationEpisode] = []
    for row in rows:
        episode = row.episode
        if not episode:
            continue
        phase_key = ((episode.phase.key if episode.phase else "") or "").strip().upper()
        if phase_key != "LISTING":
            continue
        organs = episode.organs or []
        if not organs:
            continue
        if not any(organ.id == organ_id for organ in organs):
            continue
        result.append(row)
    return result


def list_recipient_selectable_episodes(
    *,
    coordination_id: int,
    organ_id: int,
    db: Session,
) -> list[Episode]:
    _ensure_coordination_exists(coordination_id, db)
    rows = (
        db.query(Episode)
        .options(
            joinedload(Episode.status),
            joinedload(Episode.phase),
            selectinload(Episode.organs),
            joinedload(Episode.organ),
        )
        .filter(Episode.phase.has(and_(Code.type == "TPL_PHASE", Code.key == "LISTING")))
        .filter(
            or_(
                Episode.organs.any(Code.id == organ_id),
                Episode.organ_id == organ_id,
            )
        )
        .all()
    )
    return rows


def create_coordination_episode(
    *,
    coordination_id: int,
    payload: CoordinationEpisodeCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationEpisode:
    _ensure_coordination_exists(coordination_id, db)
    _validate_payload(
        episode_id=payload.episode_id,
        organ_id=payload.organ_id,
        organ_rejection_sequel_id=payload.organ_rejection_sequel_id,
        db=db,
    )
    _enforce_assignment_limit(
        coordination_id=coordination_id,
        organ_id=payload.organ_id,
        db=db,
    )
    item = CoordinationEpisode(
        coordination_id=coordination_id,
        episode_id=payload.episode_id,
        organ_id=payload.organ_id,
        tpl_date=payload.tpl_date,
        procurement_team=payload.procurement_team,
        exvivo_perfusion_done=payload.exvivo_perfusion_done,
        is_organ_rejected=payload.is_organ_rejected,
        organ_rejection_sequel_id=payload.organ_rejection_sequel_id,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    episode = db.query(Episode).filter(Episode.id == payload.episode_id).first()
    coordination = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if episode is not None and not item.is_organ_rejected:
        mark_coordination_allocation_started(
            episode=episode,
            coordination_start=coordination.start if coordination else None,
            changed_by_id=changed_by_id,
            db=db,
        )
        if payload.tpl_date is not None:
            mark_transplantation_started(
                episode=episode,
                transplant_date=payload.tpl_date,
                changed_by_id=changed_by_id,
                db=db,
            )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Coordination episode already exists")
    ensure_coordination_protocol_task_groups(coordination_id=coordination_id, changed_by_id=changed_by_id, db=db)
    return _query_with_joins(db).filter(CoordinationEpisode.id == item.id).first()


def update_coordination_episode(
    *,
    coordination_id: int,
    coordination_episode_id: int,
    payload: CoordinationEpisodeUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationEpisode:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        db.query(CoordinationEpisode)
        .filter(
            CoordinationEpisode.id == coordination_episode_id,
            CoordinationEpisode.coordination_id == coordination_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination episode not found")

    data = payload.model_dump(exclude_unset=True)
    episode_id = data.get("episode_id", item.episode_id)
    organ_id = data.get("organ_id", item.organ_id)
    organ_rejection_sequel_id = data.get("organ_rejection_sequel_id", item.organ_rejection_sequel_id)
    _validate_payload(
        episode_id=episode_id,
        organ_id=organ_id,
        organ_rejection_sequel_id=organ_rejection_sequel_id,
        db=db,
    )
    _enforce_assignment_limit(
        coordination_id=coordination_id,
        organ_id=organ_id,
        db=db,
        exclude_coordination_episode_id=coordination_episode_id,
    )

    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    episode = db.query(Episode).filter(Episode.id == item.episode_id).first()
    coordination = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if episode is not None and not item.is_organ_rejected:
        mark_coordination_allocation_started(
            episode=episode,
            coordination_start=coordination.start if coordination else None,
            changed_by_id=changed_by_id,
            db=db,
        )
        if item.tpl_date is not None:
            mark_transplantation_started(
                episode=episode,
                transplant_date=item.tpl_date,
                changed_by_id=changed_by_id,
                db=db,
            )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Coordination episode already exists")
    ensure_coordination_protocol_task_groups(coordination_id=coordination_id, changed_by_id=changed_by_id, db=db)
    return _query_with_joins(db).filter(CoordinationEpisode.id == coordination_episode_id).first()


def delete_coordination_episode(*, coordination_id: int, coordination_episode_id: int, db: Session) -> None:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        db.query(CoordinationEpisode)
        .filter(
            CoordinationEpisode.id == coordination_episode_id,
            CoordinationEpisode.coordination_id == coordination_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination episode not found")
    db.delete(item)
    db.commit()
