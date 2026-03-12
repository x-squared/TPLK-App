from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Catalogue, Coordination, CoordinationOrigin
from ...schemas import CoordinationOriginCreate, CoordinationOriginUpdate


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _query_with_joins(db: Session):
    return db.query(CoordinationOrigin).options(
        joinedload(CoordinationOrigin.detection_hospital),
        joinedload(CoordinationOrigin.procurement_hospital),
        joinedload(CoordinationOrigin.changed_by_user),
    )


def _validate_catalogue(catalogue_id: int | None, expected_type: str, field_name: str, db: Session) -> None:
    if catalogue_id is None:
        return
    entry = db.query(Catalogue).filter(Catalogue.id == catalogue_id, Catalogue.type == expected_type).first()
    if not entry:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must reference CATALOGUE.{expected_type}",
        )


def _validate_payload(*, detection_hospital_id: int | None, procurement_hospital_id: int | None, db: Session) -> None:
    _validate_catalogue(detection_hospital_id, "HOSPITAL", "detection_hospital_id", db)
    _validate_catalogue(procurement_hospital_id, "HOSPITAL", "procurement_hospital_id", db)


def get_coordination_origin(*, coordination_id: int, db: Session) -> CoordinationOrigin:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        _query_with_joins(db)
        .filter(CoordinationOrigin.coordination_id == coordination_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination origin not found")
    return item


def upsert_coordination_origin(
    *,
    coordination_id: int,
    payload: CoordinationOriginCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationOrigin:
    _ensure_coordination_exists(coordination_id, db)
    _validate_payload(
        detection_hospital_id=payload.detection_hospital_id,
        procurement_hospital_id=payload.procurement_hospital_id,
        db=db,
    )
    item = db.query(CoordinationOrigin).filter(CoordinationOrigin.coordination_id == coordination_id).first()
    if not item:
        item = CoordinationOrigin(
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
    refreshed = (
        _query_with_joins(db)
        .filter(CoordinationOrigin.coordination_id == coordination_id)
        .first()
    )
    return refreshed


def update_coordination_origin(
    *,
    coordination_id: int,
    payload: CoordinationOriginUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationOrigin:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationOrigin).filter(CoordinationOrigin.coordination_id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination origin not found")

    data = payload.model_dump(exclude_unset=True)
    _validate_payload(
        detection_hospital_id=data.get("detection_hospital_id"),
        procurement_hospital_id=data.get("procurement_hospital_id"),
        db=db,
    )
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    refreshed = (
        _query_with_joins(db)
        .filter(CoordinationOrigin.coordination_id == coordination_id)
        .first()
    )
    return refreshed


def delete_coordination_origin(*, coordination_id: int, db: Session) -> None:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationOrigin).filter(CoordinationOrigin.coordination_id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination origin not found")
    db.delete(item)
    db.commit()
