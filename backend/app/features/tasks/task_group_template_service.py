from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Code, TaskGroupTemplate
from ...schemas import TaskGroupTemplateCreate, TaskGroupTemplateUpdate
from .template_instantiation_service import validate_template_links


def _task_group_template_query(db: Session):
    return db.query(TaskGroupTemplate).options(
        joinedload(TaskGroupTemplate.scope),
        joinedload(TaskGroupTemplate.organ),
        joinedload(TaskGroupTemplate.tpl_phase),
        joinedload(TaskGroupTemplate.changed_by_user),
    )


def list_task_group_templates(*, is_active: bool | None, db: Session) -> list[TaskGroupTemplate]:
    query = _task_group_template_query(db)
    if is_active is not None:
        query = query.filter(TaskGroupTemplate.is_active == is_active)
    return query.order_by(TaskGroupTemplate.sort_pos.asc(), TaskGroupTemplate.id.asc()).all()


def create_task_group_template(*, payload: TaskGroupTemplateCreate, changed_by_id: int, db: Session) -> TaskGroupTemplate:
    validate_template_links(
        db=db,
        scope_id=payload.scope_id,
        organ_id=payload.organ_id,
        tpl_phase_id=payload.tpl_phase_id,
    )
    existing = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.key == payload.key).first()
    if existing:
        raise HTTPException(status_code=422, detail="key already exists")
    scope = db.query(Code).filter(Code.id == payload.scope_id, Code.type == "TASK_SCOPE").first()
    if not scope:
        raise HTTPException(status_code=422, detail="scope_id must reference CODE with type TASK_SCOPE")
    template = TaskGroupTemplate(**payload.model_dump(), scope_key=scope.key, changed_by_id=changed_by_id)
    db.add(template)
    db.commit()
    return _task_group_template_query(db).filter(TaskGroupTemplate.id == template.id).first()


def update_task_group_template(
    *,
    template_id: int,
    payload: TaskGroupTemplateUpdate,
    changed_by_id: int,
    db: Session,
) -> TaskGroupTemplate:
    template = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Task group template not found")
    data = payload.model_dump(exclude_unset=True)
    if "key" in data and data["key"] != template.key:
        existing = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.key == data["key"]).first()
        if existing:
            raise HTTPException(status_code=422, detail="key already exists")
    scope_id = data.get("scope_id", template.scope_id)
    organ_id = data.get("organ_id", template.organ_id)
    tpl_phase_id = data.get("tpl_phase_id", template.tpl_phase_id)
    validate_template_links(db=db, scope_id=scope_id, organ_id=organ_id, tpl_phase_id=tpl_phase_id)
    if "scope_id" in data and data["scope_id"] is not None:
        scope = db.query(Code).filter(Code.id == data["scope_id"], Code.type == "TASK_SCOPE").first()
        if not scope:
            raise HTTPException(status_code=422, detail="scope_id must reference CODE with type TASK_SCOPE")
        data["scope_key"] = scope.key
    for key, value in data.items():
        setattr(template, key, value)
    template.changed_by_id = changed_by_id
    db.commit()
    return _task_group_template_query(db).filter(TaskGroupTemplate.id == template_id).first()


def delete_task_group_template(*, template_id: int, db: Session) -> None:
    template = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Task group template not found")
    db.delete(template)
    db.commit()
