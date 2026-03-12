from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.tasks import (
    create_task_group as create_task_group_service,
    delete_task_group as delete_task_group_service,
    ensure_coordination_protocol_task_groups as ensure_coordination_protocol_task_groups_service,
    list_task_groups as list_task_groups_service,
    update_task_group as update_task_group_service,
)
from ..models import User
from ..schemas import CoordinationProtocolTaskGroupsEnsureResponse, TaskGroupCreate, TaskGroupResponse, TaskGroupUpdate

router = APIRouter(prefix="/task-groups", tags=["task-groups"])


@router.get("/", response_model=list[TaskGroupResponse])
def list_task_groups(
    patient_id: int | None = None,
    episode_id: int | None = None,
    colloqium_agenda_id: int | None = None,
    coordination_id: int | None = None,
    organ_id: int | None = None,
    task_group_template_id: list[int] | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.tasks")),
):
    return list_task_groups_service(
        patient_id=patient_id,
        episode_id=episode_id,
        colloqium_agenda_id=colloqium_agenda_id,
        coordination_id=coordination_id,
        organ_id=organ_id,
        task_group_template_ids=task_group_template_id,
        db=db,
    )


@router.post("/", response_model=TaskGroupResponse, status_code=201)
def create_task_group(
    payload: TaskGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return create_task_group_service(
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/coordination/{coordination_id}/ensure-protocol", response_model=CoordinationProtocolTaskGroupsEnsureResponse)
def ensure_coordination_protocol_task_groups(
    coordination_id: int,
    organ_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    created_group_count = ensure_coordination_protocol_task_groups_service(
        coordination_id=coordination_id,
        changed_by_id=current_user.id,
        db=db,
        organ_id=organ_id,
    )
    return CoordinationProtocolTaskGroupsEnsureResponse(created_group_count=created_group_count)


@router.patch("/{task_group_id}", response_model=TaskGroupResponse)
def update_task_group(
    task_group_id: int,
    payload: TaskGroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return update_task_group_service(
        task_group_id=task_group_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{task_group_id}", status_code=204)
def delete_task_group(
    task_group_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("edit.tasks")),
):
    delete_task_group_service(task_group_id=task_group_id, db=db)
