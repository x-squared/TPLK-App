from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Code, Coordination, CoordinationProtocolEventLog, Task
from ...schemas import CoordinationProtocolEventLogCreate


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _ensure_organ_exists(organ_id: int, db: Session) -> None:
    organ = db.query(Code).filter(Code.id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=422, detail="organ_id must reference CODE")
    if organ.type != "ORGAN":
        raise HTTPException(status_code=422, detail="organ_id must reference CODE type ORGAN")


def _query_with_joins(db: Session):
    return db.query(CoordinationProtocolEventLog).options(
        joinedload(CoordinationProtocolEventLog.organ),
        joinedload(CoordinationProtocolEventLog.task),
        joinedload(CoordinationProtocolEventLog.changed_by_user),
    )


def list_coordination_protocol_events(*, coordination_id: int, organ_id: int, db: Session) -> list[CoordinationProtocolEventLog]:
    _ensure_coordination_exists(coordination_id, db)
    _ensure_organ_exists(organ_id, db)
    return (
        _query_with_joins(db)
        .filter(
            CoordinationProtocolEventLog.coordination_id == coordination_id,
            CoordinationProtocolEventLog.organ_id == organ_id,
        )
        .order_by(CoordinationProtocolEventLog.time.desc(), CoordinationProtocolEventLog.id.desc())
        .all()
    )


def create_coordination_protocol_event(
    *,
    coordination_id: int,
    payload: CoordinationProtocolEventLogCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProtocolEventLog:
    _ensure_coordination_exists(coordination_id, db)
    _ensure_organ_exists(payload.organ_id, db)
    task = None
    if payload.task_id is not None:
        task = db.query(Task).filter(Task.id == payload.task_id).first()
        if not task:
            raise HTTPException(status_code=422, detail="task_id must reference TASK")
    item = CoordinationProtocolEventLog(
        coordination_id=coordination_id,
        organ_id=payload.organ_id,
        event=payload.event,
        time=payload.effective_time,
        task_id=payload.task_id,
        task_text=(payload.task_text.strip() if payload.task_text else None) or (task.description if task else None),
        task_comment=(payload.task_comment.strip() if payload.task_comment else None),
        changed_by_id=changed_by_id,
    )
    db.add(item)
    db.commit()
    return _query_with_joins(db).filter(CoordinationProtocolEventLog.id == item.id).first()
