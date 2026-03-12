from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.tasks import (
    create_task as create_task_service,
    delete_task as delete_task_service,
    list_tasks as list_tasks_service,
    update_task as update_task_service,
)
from ..models import User
from ..schemas import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    task_group_id: int | None = None,
    status_key: list[str] | None = Query(default=None),
    assigned_to_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.tasks")),
):
    return list_tasks_service(
        task_group_id=task_group_id,
        status_key=status_key,
        assigned_to_id=assigned_to_id,
        db=db,
    )


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return create_task_service(
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return update_task_service(
        task_id=task_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    _ = current_user
    delete_task_service(task_id=task_id, db=db)
