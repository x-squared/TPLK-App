from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...enums import PriorityKey, TaskKindKey
from ...models import Code, TaskGroupTemplate, TaskTemplate
from ...schemas import TaskTemplateCreate, TaskTemplateUpdate


def _get_code_or_422(*, db: Session, code_id: int, code_type: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.id == code_id, Code.type == code_type).first()
    if not code:
        raise HTTPException(status_code=422, detail=f"{field_name} must reference CODE with type {code_type}")
    return code


def _get_default_code_or_422(*, db: Session, code_type: str, code_key: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.type == code_type, Code.key == code_key).first()
    if not code:
        raise HTTPException(status_code=422, detail=f"default {field_name} code not found: {code_type}.{code_key}")
    return code


def _get_task_group_template_or_422(*, db: Session, task_group_template_id: int) -> TaskGroupTemplate:
    template = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.id == task_group_template_id).first()
    if not template:
        raise HTTPException(status_code=422, detail="task_group_template_id references unknown TASK_GROUP_TEMPLATE")
    return template


def _task_template_query(db: Session):
    return db.query(TaskTemplate).options(
        joinedload(TaskTemplate.task_group_template),
        joinedload(TaskTemplate.priority),
        joinedload(TaskTemplate.changed_by_user),
    )


def _normalize_kind_or_422(kind_key: str | None, *, field_name: str) -> str:
    if kind_key is None:
        return TaskKindKey.TASK.value
    normalized = kind_key.strip().upper()
    valid = {entry.value for entry in TaskKindKey}
    if normalized not in valid:
        raise HTTPException(status_code=422, detail=f"{field_name} must be one of {sorted(valid)}")
    return normalized


def list_task_templates(
    *,
    task_group_template_id: int | None,
    is_active: bool | None,
    db: Session,
) -> list[TaskTemplate]:
    query = _task_template_query(db)
    if task_group_template_id is not None:
        query = query.filter(TaskTemplate.task_group_template_id == task_group_template_id)
    if is_active is not None:
        query = query.filter(TaskTemplate.is_active == is_active)
    return query.order_by(TaskTemplate.sort_pos.asc(), TaskTemplate.id.asc()).all()


def create_task_template(*, payload: TaskTemplateCreate, changed_by_id: int, db: Session) -> TaskTemplate:
    _get_task_group_template_or_422(db=db, task_group_template_id=payload.task_group_template_id)
    priority = (
        _get_code_or_422(db=db, code_id=payload.priority_id, code_type="PRIORITY", field_name="priority_id")
        if payload.priority_id is not None
        else _get_default_code_or_422(
            db=db,
            code_type="PRIORITY",
            code_key=PriorityKey.NORMAL.value,
            field_name="priority_id",
        )
    )
    template = TaskTemplate(
        task_group_template_id=payload.task_group_template_id,
        description=payload.description,
        comment_hint=payload.comment_hint,
        kind_key=_normalize_kind_or_422(payload.kind_key, field_name="kind_key"),
        priority_id=priority.id,
        priority_key=priority.key,
        offset_minutes_default=payload.offset_minutes_default,
        is_active=payload.is_active,
        sort_pos=payload.sort_pos,
        changed_by_id=changed_by_id,
    )
    db.add(template)
    db.commit()
    return _task_template_query(db).filter(TaskTemplate.id == template.id).first()


def update_task_template(
    *,
    task_template_id: int,
    payload: TaskTemplateUpdate,
    changed_by_id: int,
    db: Session,
) -> TaskTemplate:
    template = db.query(TaskTemplate).filter(TaskTemplate.id == task_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Task template not found")
    data = payload.model_dump(exclude_unset=True)
    if "task_group_template_id" in data:
        _get_task_group_template_or_422(db=db, task_group_template_id=data["task_group_template_id"])
    if "kind_key" in data:
        data["kind_key"] = _normalize_kind_or_422(data["kind_key"], field_name="kind_key")
    if "priority_id" in data and data["priority_id"] is not None:
        priority = _get_code_or_422(db=db, code_id=data["priority_id"], code_type="PRIORITY", field_name="priority_id")
        data["priority_key"] = priority.key
    for key, value in data.items():
        setattr(template, key, value)
    template.changed_by_id = changed_by_id
    db.commit()
    return _task_template_query(db).filter(TaskTemplate.id == task_template_id).first()


def delete_task_template(*, task_template_id: int, db: Session) -> None:
    template = db.query(TaskTemplate).filter(TaskTemplate.id == task_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Task template not found")
    db.delete(template)
    db.commit()
