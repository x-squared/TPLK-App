from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.tasks import (
    create_task_group_template as create_task_group_template_service,
    delete_task_group_template as delete_task_group_template_service,
    instantiate_task_group_template as instantiate_task_group_template_service,
    list_task_group_templates as list_task_group_templates_service,
    update_task_group_template as update_task_group_template_service,
)
from ..models import User
from ..schemas import (
    TaskGroupResponse,
    TaskGroupTemplateCreate,
    TaskGroupTemplateInstantiateRequest,
    TaskGroupTemplateResponse,
    TaskGroupTemplateUpdate,
)

router = APIRouter(prefix="/task-group-templates", tags=["task-group-templates"])


@router.get("/", response_model=list[TaskGroupTemplateResponse])
def list_task_group_templates(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.tasks")),
):
    return list_task_group_templates_service(is_active=is_active, db=db)


@router.post("/", response_model=TaskGroupTemplateResponse, status_code=201)
def create_task_group_template(
    payload: TaskGroupTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return create_task_group_template_service(
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{template_id}", response_model=TaskGroupTemplateResponse)
def update_task_group_template(
    template_id: int,
    payload: TaskGroupTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return update_task_group_template_service(
        template_id=template_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{template_id}", status_code=204)
def delete_task_group_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("edit.tasks")),
):
    delete_task_group_template_service(template_id=template_id, db=db)


@router.post("/{template_id}/instantiate", response_model=TaskGroupResponse, status_code=201)
def instantiate_task_group_template(
    template_id: int,
    payload: TaskGroupTemplateInstantiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return instantiate_task_group_template_service(
        template_id=template_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
