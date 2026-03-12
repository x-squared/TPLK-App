from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Code, Colloqium, ColloqiumAgenda, ColloqiumType, Episode
from ...schemas import ColloqiumAgendaCreate, ColloqiumAgendaUpdate

_DECISION_CODE_TYPE = "COLLOQUIUM_DECISION"


def _validate_colloqium_or_422(*, db: Session, colloqium_id: int) -> None:
    item = db.query(Colloqium).filter(Colloqium.id == colloqium_id).first()
    if not item:
        raise HTTPException(status_code=422, detail="colloqium_id references unknown COLLOQIUM")


def _validate_episode_or_422(*, db: Session, episode_id: int) -> None:
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=422, detail="episode_id references unknown EPISODE")


def _validate_unique_episode_link_or_422(
    *,
    db: Session,
    colloqium_id: int,
    episode_id: int,
    exclude_agenda_id: int | None = None,
) -> None:
    query = db.query(ColloqiumAgenda).filter(
        ColloqiumAgenda.colloqium_id == colloqium_id,
        ColloqiumAgenda.episode_id == episode_id,
    )
    if exclude_agenda_id is not None:
        query = query.filter(ColloqiumAgenda.id != exclude_agenda_id)
    existing = query.first()
    if existing:
        raise HTTPException(
            status_code=422,
            detail="episode is already linked in this colloqium agenda",
        )


def _normalize_agenda_text_fields(data: dict[str, object]) -> dict[str, object]:
    normalized = dict(data)
    for field in ("presented_by", "decision", "decision_reason", "comment"):
        if field in normalized and isinstance(normalized[field], str):
            normalized[field] = normalized[field].strip()
    return normalized


def _validate_decision_catalogue_or_422(
    *,
    db: Session,
    decision_key: str | None = None,
    decision: str | None = None,
) -> None:
    # Keep backward-compatible argument handling to avoid runtime failures
    # if older call sites still pass `decision=...`.
    resolved_decision_key = decision_key if decision_key is not None else decision
    if not resolved_decision_key:
        return
    existing = db.query(Code).filter(
        Code.type == _DECISION_CODE_TYPE,
        Code.key == resolved_decision_key,
    ).first()
    if not existing:
        raise HTTPException(
            status_code=422,
            detail=f"decision must reference CODE.{_DECISION_CODE_TYPE}",
        )


def _validate_decision_reason_or_422(*, decision: str, decision_reason: str) -> None:
    if decision and not decision_reason:
        raise HTTPException(
            status_code=422,
            detail="decision_reason is required when decision is set",
        )
    if decision_reason and not decision:
        raise HTTPException(
            status_code=422,
            detail="decision is required when decision_reason is set",
        )


def _agenda_query(db: Session):
    return db.query(ColloqiumAgenda).options(
        joinedload(ColloqiumAgenda.colloqium)
        .joinedload(Colloqium.colloqium_type)
        .joinedload(ColloqiumType.organ),
        joinedload(ColloqiumAgenda.episode),
        joinedload(ColloqiumAgenda.changed_by_user),
    )


def list_colloqium_agendas(*, colloqium_id: int | None, episode_id: int | None, db: Session) -> list[ColloqiumAgenda]:
    query = _agenda_query(db)
    if colloqium_id is not None:
        query = query.filter(ColloqiumAgenda.colloqium_id == colloqium_id)
    if episode_id is not None:
        query = query.filter(ColloqiumAgenda.episode_id == episode_id)
    return query.order_by(ColloqiumAgenda.id.asc()).all()


def create_colloqium_agenda(*, payload: ColloqiumAgendaCreate, changed_by_id: int, db: Session) -> ColloqiumAgenda:
    normalized_payload = _normalize_agenda_text_fields(payload.model_dump())
    _validate_colloqium_or_422(db=db, colloqium_id=payload.colloqium_id)
    _validate_episode_or_422(db=db, episode_id=payload.episode_id)
    _validate_decision_catalogue_or_422(db=db, decision_key=str(normalized_payload.get("decision", "")))
    _validate_decision_reason_or_422(
        decision=str(normalized_payload.get("decision", "")),
        decision_reason=str(normalized_payload.get("decision_reason", "")),
    )
    _validate_unique_episode_link_or_422(
        db=db,
        colloqium_id=payload.colloqium_id,
        episode_id=payload.episode_id,
    )
    item = ColloqiumAgenda(**normalized_payload, changed_by_id=changed_by_id)
    db.add(item)
    db.commit()
    return _agenda_query(db).filter(ColloqiumAgenda.id == item.id).first()


def update_colloqium_agenda(
    *,
    colloqium_agenda_id: int,
    payload: ColloqiumAgendaUpdate,
    changed_by_id: int,
    db: Session,
) -> ColloqiumAgenda:
    item = db.query(ColloqiumAgenda).filter(ColloqiumAgenda.id == colloqium_agenda_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Colloqium agenda not found")
    data = _normalize_agenda_text_fields(payload.model_dump(exclude_unset=True))
    if "colloqium_id" in data:
        _validate_colloqium_or_422(db=db, colloqium_id=data["colloqium_id"])
    if "episode_id" in data:
        _validate_episode_or_422(db=db, episode_id=data["episode_id"])
    target_decision = str(data["decision"]) if "decision" in data else str(item.decision or "")
    target_decision_reason = (
        str(data["decision_reason"]) if "decision_reason" in data else str(item.decision_reason or "")
    )
    _validate_decision_catalogue_or_422(db=db, decision_key=target_decision)
    _validate_decision_reason_or_422(
        decision=target_decision,
        decision_reason=target_decision_reason,
    )
    target_colloqium_id = data["colloqium_id"] if "colloqium_id" in data else item.colloqium_id
    target_episode_id = data["episode_id"] if "episode_id" in data else item.episode_id
    _validate_unique_episode_link_or_422(
        db=db,
        colloqium_id=target_colloqium_id,
        episode_id=target_episode_id,
        exclude_agenda_id=item.id,
    )
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return _agenda_query(db).filter(ColloqiumAgenda.id == colloqium_agenda_id).first()


def delete_colloqium_agenda(*, colloqium_agenda_id: int, db: Session) -> None:
    item = db.query(ColloqiumAgenda).filter(ColloqiumAgenda.id == colloqium_agenda_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Colloqium agenda not found")
    db.delete(item)
    db.commit()
