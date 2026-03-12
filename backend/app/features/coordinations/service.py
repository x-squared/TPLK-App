from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...enums import CoordinationStatusKey
from ...features.tasks import ensure_coordination_protocol_task_groups
from ...models import Code, Coordination
from ...schemas import CoordinationCreate, CoordinationUpdate

DEFAULT_COORDINATION_STATUS_KEY = CoordinationStatusKey.OPEN.value
COORDINATION_STATUS_TYPE = "COORDINATION_STATUS"


def _base_query(db: Session):
    return db.query(Coordination).options(
        joinedload(Coordination.status),
        joinedload(Coordination.completion_confirmed_by_user),
        joinedload(Coordination.changed_by_user),
    )


def get_coordination_or_404(coordination_id: int, db: Session) -> Coordination:
    item = _base_query(db).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")
    return item


def _resolve_default_status_id(db: Session) -> int:
    status = (
        db.query(Code)
        .filter(Code.type == COORDINATION_STATUS_TYPE, Code.key == DEFAULT_COORDINATION_STATUS_KEY)
        .first()
    )
    if not status:
        raise HTTPException(
            status_code=500,
            detail="Default coordination status code missing",
        )
    return status.id


def _ensure_status_exists(status_id: int, db: Session) -> Code:
    status = (
        db.query(Code)
        .filter(Code.id == status_id, Code.type == COORDINATION_STATUS_TYPE)
        .first()
    )
    if not status:
        raise HTTPException(
            status_code=422,
            detail="status_id must reference CODE.COORDINATION_STATUS",
        )
    return status


def list_coordinations(db: Session) -> list[Coordination]:
    return _base_query(db).all()


def create_coordination(*, payload: CoordinationCreate, changed_by_id: int, db: Session) -> Coordination:
    status_id = payload.status_id if payload.status_id is not None else _resolve_default_status_id(db)
    status = _ensure_status_exists(status_id, db)
    item = Coordination(
        start=payload.start,
        end=payload.end,
        status_id=status_id,
        status_key=status.key,
        donor_nr=payload.donor_nr,
        swtpl_nr=payload.swtpl_nr,
        national_coordinator=payload.national_coordinator,
        comment=payload.comment,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    organ_ids = [
        row.id
        for row in db.query(Code)
        .filter(Code.type == "ORGAN")
        .order_by(Code.pos.asc(), Code.id.asc())
        .all()
    ]
    if organ_ids:
        for organ_id in organ_ids:
            ensure_coordination_protocol_task_groups(
                coordination_id=item.id,
                changed_by_id=changed_by_id,
                db=db,
                organ_id=organ_id,
            )
    else:
        ensure_coordination_protocol_task_groups(coordination_id=item.id, changed_by_id=changed_by_id, db=db)
    return get_coordination_or_404(item.id, db)


def update_coordination(
    *,
    coordination_id: int,
    payload: CoordinationUpdate,
    changed_by_id: int,
    db: Session,
) -> Coordination:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")

    data = payload.model_dump(exclude_unset=True)
    if "status_id" in data and data["status_id"] is not None:
        status = _ensure_status_exists(data["status_id"], db)
        data["status_key"] = status.key

    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return get_coordination_or_404(coordination_id, db)


def delete_coordination(*, coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")
    db.delete(item)
    db.commit()
