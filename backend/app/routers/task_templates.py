from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.tasks import (
    create_task_template as create_task_template_service,
    delete_task_template as delete_task_template_service,
    list_task_templates as list_task_templates_service,
    update_task_template as update_task_template_service,
)
from ..models import User
from ..schemas import TaskTemplateCreate, TaskTemplateResponse, TaskTemplateUpdate

router = APIRouter(prefix="/task-templates", tags=["task-templates"])


@router.get("/", response_model=list[TaskTemplateResponse])
def list_task_templates(
    task_group_template_id: int | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.tasks")),
):
    return list_task_templates_service(
        task_group_template_id=task_group_template_id,
        is_active=is_active,
        db=db,
    )


@router.post("/", response_model=TaskTemplateResponse, status_code=201)
def create_task_template(
    payload: TaskTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return create_task_template_service(
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{task_template_id}", response_model=TaskTemplateResponse)
def update_task_template(
    task_template_id: int,
    payload: TaskTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return update_task_template_service(
        task_template_id=task_template_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{task_template_id}", status_code=204)
def delete_task_template(
    task_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    delete_task_template_service(task_template_id=task_template_id, db=db)
