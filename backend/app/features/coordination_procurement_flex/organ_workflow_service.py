from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...enums import TaskStatusKey
from ...models import (
    Code,
    CoordinationEpisode,
    CoordinationProcurementOrganRejection,
    CoordinationProcurementTypedData,
    CoordinationProtocolEventLog,
    Task,
    TaskGroup,
)
from ...schemas import (
    CoordinationProcurementOrganCreate,
    CoordinationProcurementOrganResponse,
    CoordinationProcurementOrganUpdate,
)
from .query_service import get_procurement_flex
from .shared import ORGAN_WORKFLOW_CLEARED_EVENT, ensure_coordination_exists


def clear_organ_workflow_marker(
    *,
    coordination_id: int,
    organ_id: int,
    db: Session,
) -> None:
    db.query(CoordinationProtocolEventLog).filter(
        CoordinationProtocolEventLog.coordination_id == coordination_id,
        CoordinationProtocolEventLog.organ_id == organ_id,
        CoordinationProtocolEventLog.event == ORGAN_WORKFLOW_CLEARED_EVENT,
    ).delete(synchronize_session=False)


def mark_organ_workflow_cleared(
    *,
    coordination_id: int,
    organ_id: int,
    changed_by_id: int,
    db: Session,
) -> None:
    clear_organ_workflow_marker(coordination_id=coordination_id, organ_id=organ_id, db=db)
    db.add(
        CoordinationProtocolEventLog(
            coordination_id=coordination_id,
            organ_id=organ_id,
            event=ORGAN_WORKFLOW_CLEARED_EVENT,
            changed_by_id=changed_by_id,
        )
    )


def upsert_procurement_organ(
    *,
    coordination_id: int,
    organ_id: int,
    payload: CoordinationProcurementOrganCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementOrganResponse:
    ensure_coordination_exists(coordination_id, db)
    row = (
        db.query(CoordinationProcurementOrganRejection)
        .filter(
            CoordinationProcurementOrganRejection.coordination_id == coordination_id,
            CoordinationProcurementOrganRejection.organ_id == organ_id,
        )
        .first()
    )
    if not row:
        row = CoordinationProcurementOrganRejection(
            coordination_id=coordination_id,
            organ_id=organ_id,
            is_rejected=bool(payload.organ_rejected),
            rejection_comment=(payload.organ_rejection_comment or "").strip(),
            changed_by_id=changed_by_id,
        )
        db.add(row)
    else:
        row.is_rejected = bool(payload.organ_rejected)
        row.rejection_comment = (payload.organ_rejection_comment or "").strip()
        row.changed_by_id = changed_by_id

    if row.is_rejected:
        db.query(CoordinationProcurementTypedData).filter(
            CoordinationProcurementTypedData.coordination_id == coordination_id,
            CoordinationProcurementTypedData.organ_id == organ_id,
        ).update(
            {CoordinationProcurementTypedData.recipient_episode_id: None},
            synchronize_session=False,
        )
        db.query(CoordinationEpisode).filter(
            CoordinationEpisode.coordination_id == coordination_id,
            CoordinationEpisode.organ_id == organ_id,
        ).delete(synchronize_session=False)
    else:
        clear_organ_workflow_marker(coordination_id=coordination_id, organ_id=organ_id, db=db)

    db.commit()
    response = get_procurement_flex(coordination_id=coordination_id, db=db)
    existing = next((item for item in response.organs if item.organ_id == organ_id), None)
    if existing:
        return existing
    return CoordinationProcurementOrganResponse(
        id=organ_id,
        coordination_id=coordination_id,
        organ_id=organ_id,
        procurement_surgeon="",
        organ_rejected=bool(payload.organ_rejected),
        organ_rejection_comment=(payload.organ_rejection_comment or "").strip(),
        organ_workflow_cleared=False,
        organ=None,
        slots=[],
        changed_by_id=changed_by_id,
        changed_by_user=None,
        created_at=datetime.now(),
        updated_at=None,
    )


def update_procurement_organ(
    *,
    coordination_id: int,
    organ_id: int,
    payload: CoordinationProcurementOrganUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementOrganResponse:
    ensure_coordination_exists(coordination_id, db)
    existing = (
        db.query(CoordinationProcurementOrganRejection)
        .filter(
            CoordinationProcurementOrganRejection.coordination_id == coordination_id,
            CoordinationProcurementOrganRejection.organ_id == organ_id,
        )
        .first()
    )
    if existing is None:
        return upsert_procurement_organ(
            coordination_id=coordination_id,
            organ_id=organ_id,
            payload=CoordinationProcurementOrganCreate(
                procurement_surgeon=payload.procurement_surgeon or "",
                organ_rejected=bool(payload.organ_rejected),
                organ_rejection_comment=payload.organ_rejection_comment or "",
            ),
            changed_by_id=changed_by_id,
            db=db,
        )

    if payload.organ_rejected is not None:
        existing.is_rejected = bool(payload.organ_rejected)
    if payload.organ_rejection_comment is not None:
        existing.rejection_comment = payload.organ_rejection_comment.strip()
    existing.changed_by_id = changed_by_id

    if existing.is_rejected:
        db.query(CoordinationProcurementTypedData).filter(
            CoordinationProcurementTypedData.coordination_id == coordination_id,
            CoordinationProcurementTypedData.organ_id == organ_id,
        ).update(
            {CoordinationProcurementTypedData.recipient_episode_id: None},
            synchronize_session=False,
        )
        db.query(CoordinationEpisode).filter(
            CoordinationEpisode.coordination_id == coordination_id,
            CoordinationEpisode.organ_id == organ_id,
        ).delete(synchronize_session=False)
    else:
        clear_organ_workflow_marker(coordination_id=coordination_id, organ_id=organ_id, db=db)

    db.commit()
    response = get_procurement_flex(coordination_id=coordination_id, db=db)
    item = next((entry for entry in response.organs if entry.organ_id == organ_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Coordination procurement organ not found")
    return item


def clear_rejected_organ_workflow(
    *,
    coordination_id: int,
    organ_id: int,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementOrganResponse:
    ensure_coordination_exists(coordination_id, db)
    rejection = (
        db.query(CoordinationProcurementOrganRejection)
        .filter(
            CoordinationProcurementOrganRejection.coordination_id == coordination_id,
            CoordinationProcurementOrganRejection.organ_id == organ_id,
        )
        .first()
    )
    if rejection is None or not rejection.is_rejected:
        raise HTTPException(status_code=422, detail="Organ must be marked as rejected before clearing workflow")

    cancelled_status = (
        db.query(Code)
        .filter(
            Code.type == "TASK_STATUS",
            Code.key == TaskStatusKey.CANCELLED.value,
        )
        .first()
    )
    if cancelled_status is None:
        raise HTTPException(status_code=422, detail="Task status CANCELLED is missing")

    now = datetime.now()
    pending_tasks = (
        db.query(Task)
        .join(TaskGroup, Task.task_group_id == TaskGroup.id)
        .filter(
            TaskGroup.coordination_id == coordination_id,
            TaskGroup.organ_id == organ_id,
            Task.status_key == TaskStatusKey.PENDING.value,
        )
        .all()
    )
    for task in pending_tasks:
        task.status_id = cancelled_status.id
        task.status_key = cancelled_status.key
        task.closed_at = now
        task.closed_by_id = changed_by_id
        task.changed_by_id = changed_by_id

    mark_organ_workflow_cleared(
        coordination_id=coordination_id,
        organ_id=organ_id,
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()

    response = get_procurement_flex(coordination_id=coordination_id, db=db)
    item = next((entry for entry in response.organs if entry.organ_id == organ_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Coordination procurement organ not found")
    return item
