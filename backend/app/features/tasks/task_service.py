from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ...enums import PriorityKey, TaskKindKey, TaskStatusKey
from ...models import Code, CoordinationProtocolEventLog, Task, TaskGroup, User
from ...schemas import TaskCreate, TaskUpdate


def _format_event_time_for_log(value: datetime) -> str:
    return value.astimezone().strftime("%d.%m.%Y/%H:%M")


def _get_code_or_422(*, db: Session, code_id: int, code_type: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.id == code_id, Code.type == code_type).first()
    if not code:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must reference CODE with type {code_type}",
        )
    return code


def _get_default_code_or_422(*, db: Session, code_type: str, code_key: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.type == code_type, Code.key == code_key).first()
    if not code:
        raise HTTPException(
            status_code=422,
            detail=f"default {field_name} code not found: {code_type}.{code_key}",
        )
    return code


def _get_task_group_or_422(*, db: Session, task_group_id: int) -> TaskGroup:
    tg = db.query(TaskGroup).filter(TaskGroup.id == task_group_id).first()
    if not tg:
        raise HTTPException(status_code=422, detail="task_group_id references unknown TASK_GROUP")
    return tg


def _get_user_or_422(*, db: Session, user_id: int, field_name: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=422, detail=f"{field_name} references unknown USER")
    return user


def _is_closed_status_key(status_key: str | None) -> bool:
    return status_key in {TaskStatusKey.COMPLETED.value, TaskStatusKey.CANCELLED.value}


def _is_task_group_closed(*, db: Session, task_group_id: int) -> bool:
    total_count = db.query(Task).filter(Task.task_group_id == task_group_id).count()
    open_count = db.query(Task).filter(
        Task.task_group_id == task_group_id,
        or_(
            Task.status_key.is_(None),
            ~Task.status_key.in_([TaskStatusKey.COMPLETED.value, TaskStatusKey.CANCELLED.value]),
        ),
    ).count()
    return total_count > 0 and open_count == 0


def _normalize_kind_or_422(kind_key: str | None, *, field_name: str) -> str:
    if kind_key is None:
        return TaskKindKey.TASK.value
    normalized = kind_key.strip().upper()
    valid = {entry.value for entry in TaskKindKey}
    if normalized not in valid:
        raise HTTPException(status_code=422, detail=f"{field_name} must be one of {sorted(valid)}")
    return normalized


def _normalize_event_time_or_422(*, kind_key: str | None, event_time: datetime | None) -> datetime | None:
    if kind_key != TaskKindKey.EVENT.value and event_time is not None:
        raise HTTPException(status_code=422, detail="event_time can only be set for EVENT tasks")
    return event_time


def _task_query(db: Session):
    return db.query(Task).options(
        joinedload(Task.priority),
        joinedload(Task.status),
        joinedload(Task.assigned_to),
        joinedload(Task.closed_by),
        joinedload(Task.changed_by_user),
    )


def _build_protocol_task_event_name(*, task: Task, status_key: str | None) -> str:
    _ = status_key
    description = (task.description or "").strip() or "Task"
    comment = (task.comment or "").strip()
    if comment:
        base_text = f"{description} | {comment}"
    else:
        base_text = description
    if task.kind_key == TaskKindKey.EVENT.value and task.event_time is not None:
        return f"{base_text} ({_format_event_time_for_log(task.event_time)})"
    return base_text


def _maybe_create_coordination_protocol_event_log(
    *,
    task: Task,
    status_key_before: str | None,
    status_key_after: str | None,
    changed_by_id: int,
    db: Session,
) -> None:
    if not _is_closed_status_key(status_key_after):
        return
    if _is_closed_status_key(status_key_before):
        return
    task_group = db.query(TaskGroup).filter(TaskGroup.id == task.task_group_id).first()
    if not task_group or task_group.coordination_id is None or task_group.organ_id is None:
        return
    db.add(
        CoordinationProtocolEventLog(
            coordination_id=task_group.coordination_id,
            organ_id=task_group.organ_id,
            event=_build_protocol_task_event_name(task=task, status_key=status_key_after),
            task_id=task.id,
            task_text=None,
            task_comment=None,
            changed_by_id=changed_by_id,
        )
    )


def list_tasks(
    *,
    task_group_id: int | None,
    status_key: list[str] | None,
    assigned_to_id: int | None,
    db: Session,
) -> list[Task]:
    query = _task_query(db)
    if task_group_id is not None:
        query = query.filter(Task.task_group_id == task_group_id)
    if assigned_to_id is not None:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
    if status_key:
        normalized = [value.upper() for value in status_key]
        query = query.filter(Task.status_key.in_(normalized))
    return query.all()


def create_task(*, payload: TaskCreate, changed_by_id: int, db: Session) -> Task:
    task_group = _get_task_group_or_422(db=db, task_group_id=payload.task_group_id)
    if _is_task_group_closed(db=db, task_group_id=task_group.id):
        raise HTTPException(status_code=422, detail="Cannot add task to a completed/discarded task group")
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
    status = (
        _get_code_or_422(db=db, code_id=payload.status_id, code_type="TASK_STATUS", field_name="status_id")
        if payload.status_id is not None
        else _get_default_code_or_422(
            db=db,
            code_type="TASK_STATUS",
            code_key=TaskStatusKey.PENDING.value,
            field_name="status_id",
        )
    )
    if payload.assigned_to_id is not None:
        _get_user_or_422(db=db, user_id=payload.assigned_to_id, field_name="assigned_to_id")
    if payload.closed_by_id is not None:
        _get_user_or_422(db=db, user_id=payload.closed_by_id, field_name="closed_by_id")
    kind_key = _normalize_kind_or_422(payload.kind_key, field_name="kind_key")
    event_time = _normalize_event_time_or_422(kind_key=kind_key, event_time=payload.event_time)
    closed_at = payload.closed_at
    closed_by_id = payload.closed_by_id
    if status.key in {TaskStatusKey.COMPLETED.value, TaskStatusKey.CANCELLED.value} and closed_at is None:
        closed_at = datetime.now()
    if status.key in {TaskStatusKey.COMPLETED.value, TaskStatusKey.CANCELLED.value} and closed_by_id is None:
        closed_by_id = changed_by_id
    if not _is_closed_status_key(status.key):
        closed_at = None
        closed_by_id = None
    if kind_key != TaskKindKey.EVENT.value:
        event_time = None
    elif status.key == TaskStatusKey.COMPLETED.value and event_time is None:
        event_time = datetime.now()
    if payload.until is None:
        raise HTTPException(status_code=422, detail="until is required")
    task = Task(
        task_group_id=payload.task_group_id,
        description=payload.description,
        comment_hint=payload.comment_hint,
        kind_key=kind_key,
        priority_id=priority.id,
        priority_key=priority.key,
        assigned_to_id=payload.assigned_to_id,
        until=payload.until,
        event_time=event_time,
        status_id=status.id,
        status_key=status.key,
        closed_at=closed_at,
        closed_by_id=closed_by_id,
        comment=payload.comment,
        changed_by_id=changed_by_id,
    )
    db.add(task)
    db.flush()
    _maybe_create_coordination_protocol_event_log(
        task=task,
        status_key_before=None,
        status_key_after=status.key,
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()
    db.refresh(task)
    return _task_query(db).filter(Task.id == task.id).first()


def update_task(*, task_id: int, payload: TaskUpdate, changed_by_id: int, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    data = payload.model_dump(exclude_unset=True)
    original_group_id = task.task_group_id
    if "task_group_id" in data:
        target_group = _get_task_group_or_422(db=db, task_group_id=data["task_group_id"])
        if data["task_group_id"] != original_group_id and _is_task_group_closed(db=db, task_group_id=target_group.id):
            raise HTTPException(status_code=422, detail="Cannot move task into a completed/discarded task group")
    if "assigned_to_id" in data and data["assigned_to_id"] is not None:
        _get_user_or_422(db=db, user_id=data["assigned_to_id"], field_name="assigned_to_id")
    if "closed_by_id" in data and data["closed_by_id"] is not None:
        _get_user_or_422(db=db, user_id=data["closed_by_id"], field_name="closed_by_id")
    if "until" in data and data["until"] is None:
        raise HTTPException(status_code=422, detail="until cannot be null")
    if "kind_key" in data:
        data["kind_key"] = _normalize_kind_or_422(data["kind_key"], field_name="kind_key")
    status_key_before = task.status_key or (task.status.key if task.status else None)
    kind_key_before = task.kind_key or TaskKindKey.TASK.value
    status_key = status_key_before
    kind_key = kind_key_before
    if "status_id" in data and data["status_id"] is not None:
        status = _get_code_or_422(
            db=db,
            code_id=data["status_id"],
            code_type="TASK_STATUS",
            field_name="status_id",
        )
        status_key = status.key
        data["status_key"] = status.key
    if "priority_id" in data and data["priority_id"] is not None:
        priority = _get_code_or_422(db=db, code_id=data["priority_id"], code_type="PRIORITY", field_name="priority_id")
        data["priority_key"] = priority.key
    if "kind_key" in data:
        kind_key = data["kind_key"]
    if "event_time" in data:
        data["event_time"] = _normalize_event_time_or_422(kind_key=kind_key, event_time=data["event_time"])
    for key, value in data.items():
        setattr(task, key, value)
    if _is_closed_status_key(status_key) and task.closed_at is None:
        task.closed_at = datetime.now()
    if _is_closed_status_key(status_key) and task.closed_by_id is None:
        task.closed_by_id = changed_by_id
    if not _is_closed_status_key(status_key):
        task.closed_at = None
        task.closed_by_id = None
    if kind_key != TaskKindKey.EVENT.value:
        task.event_time = None
    elif status_key == TaskStatusKey.COMPLETED.value and task.event_time is None:
        task.event_time = datetime.now()
    task.changed_by_id = changed_by_id
    _maybe_create_coordination_protocol_event_log(
        task=task,
        status_key_before=status_key_before,
        status_key_after=status_key,
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()
    return _task_query(db).filter(Task.id == task_id).first()


def delete_task(*, task_id: int, db: Session) -> None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
