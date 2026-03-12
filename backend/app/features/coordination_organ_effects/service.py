from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ...models import Code, Coordination, CoordinationOrganEffect
from ...schemas import CoordinationOrganEffectCreate, CoordinationOrganEffectUpdate


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _query_with_joins(db: Session):
    return db.query(CoordinationOrganEffect).options(
        joinedload(CoordinationOrganEffect.organ),
        joinedload(CoordinationOrganEffect.procurement_effect),
        joinedload(CoordinationOrganEffect.changed_by_user),
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


def _validate_payload(*, organ_id: int, procurement_effect_id: int | None, db: Session) -> None:
    _validate_code(organ_id, "ORGAN", "organ_id", db)
    _validate_code_optional(procurement_effect_id, "PROCUREMENT_EFFECT", "procurement_effect_id", db)


def list_coordination_organ_effects(*, coordination_id: int, db: Session) -> list[CoordinationOrganEffect]:
    _ensure_coordination_exists(coordination_id, db)
    return (
        _query_with_joins(db)
        .filter(CoordinationOrganEffect.coordination_id == coordination_id)
        .all()
    )


def create_coordination_organ_effect(
    *,
    coordination_id: int,
    payload: CoordinationOrganEffectCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationOrganEffect:
    _ensure_coordination_exists(coordination_id, db)
    _validate_payload(
        organ_id=payload.organ_id,
        procurement_effect_id=payload.procurement_effect_id,
        db=db,
    )
    item = CoordinationOrganEffect(
        coordination_id=coordination_id,
        organ_id=payload.organ_id,
        procurement_effect_id=payload.procurement_effect_id,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Organ effect already exists for this coordination")
    return _query_with_joins(db).filter(CoordinationOrganEffect.id == item.id).first()


def update_coordination_organ_effect(
    *,
    coordination_id: int,
    organ_effect_id: int,
    payload: CoordinationOrganEffectUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationOrganEffect:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        db.query(CoordinationOrganEffect)
        .filter(
            CoordinationOrganEffect.id == organ_effect_id,
            CoordinationOrganEffect.coordination_id == coordination_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination organ effect not found")

    data = payload.model_dump(exclude_unset=True)
    organ_id = data.get("organ_id", item.organ_id)
    procurement_effect_id = data.get("procurement_effect_id", item.procurement_effect_id)
    _validate_payload(organ_id=organ_id, procurement_effect_id=procurement_effect_id, db=db)

    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Organ effect already exists for this coordination")
    return _query_with_joins(db).filter(CoordinationOrganEffect.id == organ_effect_id).first()


def delete_coordination_organ_effect(*, coordination_id: int, organ_effect_id: int, db: Session) -> None:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        db.query(CoordinationOrganEffect)
        .filter(
            CoordinationOrganEffect.id == organ_effect_id,
            CoordinationOrganEffect.coordination_id == coordination_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination organ effect not found")
    db.delete(item)
    db.commit()
