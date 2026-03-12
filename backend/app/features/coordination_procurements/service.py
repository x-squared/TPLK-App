from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Coordination, CoordinationProcurement
from ...schemas import CoordinationProcurementCreate, CoordinationProcurementUpdate


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _query_with_joins(db: Session):
    return db.query(CoordinationProcurement).options(joinedload(CoordinationProcurement.changed_by_user))


def get_coordination_procurement(*, coordination_id: int, db: Session) -> CoordinationProcurement:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        _query_with_joins(db)
        .filter(CoordinationProcurement.coordination_id == coordination_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination procurement not found")
    return item


def upsert_coordination_procurement(
    *,
    coordination_id: int,
    payload: CoordinationProcurementCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurement:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationProcurement).filter(CoordinationProcurement.coordination_id == coordination_id).first()
    if not item:
        item = CoordinationProcurement(
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
        .filter(CoordinationProcurement.coordination_id == coordination_id)
        .first()
    )


def update_coordination_procurement(
    *,
    coordination_id: int,
    payload: CoordinationProcurementUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurement:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationProcurement).filter(CoordinationProcurement.coordination_id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination procurement not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return (
        _query_with_joins(db)
        .filter(CoordinationProcurement.coordination_id == coordination_id)
        .first()
    )


def delete_coordination_procurement(*, coordination_id: int, db: Session) -> None:
    _ensure_coordination_exists(coordination_id, db)
    item = db.query(CoordinationProcurement).filter(CoordinationProcurement.coordination_id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination procurement not found")
    db.delete(item)
    db.commit()
