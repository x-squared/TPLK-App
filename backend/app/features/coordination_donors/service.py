from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Code, Coordination, CoordinationDonor
from ...schemas import CoordinationDonorCreate, CoordinationDonorUpdate


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _query_with_joins(db: Session):
    return db.query(CoordinationDonor).options(
        joinedload(CoordinationDonor.sex),
        joinedload(CoordinationDonor.blood_type),
        joinedload(CoordinationDonor.diagnosis),
        joinedload(CoordinationDonor.death_kind),
        joinedload(CoordinationDonor.changed_by_user),
    )


def _validate_code(code_id: int | None, expected_type: str, field_name: str, db: Session) -> None:
    if code_id is None:
        return
    entry = db.query(Code).filter(Code.id == code_id, Code.type == expected_type).first()
    if not entry:
        raise HTTPException(status_code=422, detail=f"{field_name} must reference CODE.{expected_type}")


def _validate_code_optional(code_id: int | None, expected_type: str, field_name: str, db: Session) -> None:
    if code_id is None:
        return
    entry = db.query(Code).filter(Code.id == code_id, Code.type == expected_type).first()
    if not entry:
        raise HTTPException(status_code=422, detail=f"{field_name} must reference CODE.{expected_type}")


def _validate_payload(
    *,
    sex_id: int | None,
    blood_type_id: int | None,
    diagnosis_id: int | None,
    death_kind_id: int | None,
    db: Session,
) -> None:
    _validate_code(sex_id, "SEX", "sex_id", db)
    _validate_code_optional(blood_type_id, "BLOOD_TYPE", "blood_type_id", db)
    _validate_code_optional(diagnosis_id, "DIAGNOSIS_DONOR", "diagnosis_id", db)
    _validate_code(death_kind_id, "DEATH_KIND", "death_kind_id", db)


def get_coordination_donor(*, coordination_id: int, db: Session) -> CoordinationDonor:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        _query_with_joins(db)
        .filter(CoordinationDonor.coordination_id == coordination_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination donor not found")
    return item


def upsert_coordination_donor(
    *,
    coordination_id: int,
    payload: CoordinationDonorCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationDonor:
    _ensure_coordination_exists(coordination_id, db)
    _validate_payload(
        sex_id=payload.sex_id,
        blood_type_id=payload.blood_type_id,
        diagnosis_id=payload.diagnosis_id,
        death_kind_id=payload.death_kind_id,
        db=db,
    )
    item = db.query(CoordinationDonor).filter(CoordinationDonor.coordination_id == coordination_id).first()
    if not item:
        item = CoordinationDonor(
            coordination_id=coordination_id,
            changed_by_id=changed_by_id,
            **payload.model_dump(),
        )
        db.add(item)
    else:
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        item.changed_by_id = changed_by_id
    db.commit()
    return (
        _query_with_joins(db)
        .filter(CoordinationDonor.coordination_id == coordination_id)
        .first()
    )


def update_coordination_donor(
    *,
    coordination_id: int,
    payload: CoordinationDonorUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationDonor:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationDonor).filter(CoordinationDonor.coordination_id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination donor not found")

    data = payload.model_dump(exclude_unset=True)
    _validate_payload(
        sex_id=data.get("sex_id"),
        blood_type_id=data.get("blood_type_id"),
        diagnosis_id=data.get("diagnosis_id"),
        death_kind_id=data.get("death_kind_id"),
        db=db,
    )
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return (
        _query_with_joins(db)
        .filter(CoordinationDonor.coordination_id == coordination_id)
        .first()
    )


def delete_coordination_donor(*, coordination_id: int, db: Session) -> None:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationDonor).filter(CoordinationDonor.coordination_id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination donor not found")
    db.delete(item)
    db.commit()
