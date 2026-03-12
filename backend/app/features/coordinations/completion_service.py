from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...enums import PriorityKey, TaskKindKey, TaskScopeKey
from ...features.episodes.workflow_service import mark_follow_up_started
from ...models import Code, Coordination, CoordinationEpisode, Episode, Task, TaskGroup, TaskGroupTemplate, TaskTemplate
from ...schemas import (
    CoordinationCompletionStateResponse,
    CoordinationCompletionTaskGroupResponse,
    TaskCreate,
    TaskGroupCreate,
)
from ..tasks import create_task, create_task_group

BLOCK_1_TEMPLATE_KEY = "COORD_COMPLETION_BLOCK_1"
BLOCK_2_TEMPLATE_KEY = "COORD_COMPLETION_BLOCK_2"
BLOCK_1_DUE_WINDOW_DAYS = 1
BLOCK_2_DUE_WINDOW_DAYS = 7


def _coordination_or_404(*, coordination_id: int, db: Session) -> Coordination:
    item = (
        db.query(Coordination)
        .options(
            joinedload(Coordination.completion_confirmed_by_user),
        )
        .filter(Coordination.id == coordination_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")
    return item


def _tasks_for_group(*, task_group_id: int, db: Session) -> list[Task]:
    return (
        db.query(Task)
        .options(
            joinedload(Task.priority),
            joinedload(Task.status),
            joinedload(Task.assigned_to),
            joinedload(Task.closed_by),
            joinedload(Task.changed_by_user),
        )
        .filter(Task.task_group_id == task_group_id)
        .order_by(Task.until.asc(), Task.id.asc())
        .all()
    )


def _default_code_or_500(*, db: Session, code_type: str, code_key: str) -> Code:
    code = db.query(Code).filter(Code.type == code_type, Code.key == code_key).first()
    if not code:
        raise HTTPException(status_code=500, detail=f"Missing default code {code_type}.{code_key}")
    return code


def _completion_template_or_422(*, key: str, db: Session) -> TaskGroupTemplate:
    template = (
        db.query(TaskGroupTemplate)
        .options(
            joinedload(TaskGroupTemplate.scope),
            joinedload(TaskGroupTemplate.task_templates).joinedload(TaskTemplate.priority),
        )
        .filter(TaskGroupTemplate.key == key)
        .first()
    )
    if not template:
        raise HTTPException(status_code=422, detail=f"Task group template not found: {key}")
    scope_key = template.scope_key or (template.scope.key if template.scope else None)
    if scope_key != TaskScopeKey.COORDINATION_PROTOCOL.value:
        raise HTTPException(status_code=422, detail=f"Task group template {key} must use TASK_SCOPE.COORDINATION_PROTOCOL")
    return template


def _resolve_coordination_patient_id(*, coordination_id: int, db: Session) -> int | None:
    existing_group = (
        db.query(TaskGroup)
        .filter(TaskGroup.coordination_id == coordination_id)
        .order_by(TaskGroup.id.asc())
        .first()
    )
    if existing_group and existing_group.patient_id is not None:
        return existing_group.patient_id
    first_episode = (
        db.query(CoordinationEpisode)
        .join(Episode, Episode.id == CoordinationEpisode.episode_id)
        .filter(CoordinationEpisode.coordination_id == coordination_id)
        .order_by(CoordinationEpisode.id.asc())
        .first()
    )
    if first_episode and first_episode.episode is not None:
        return first_episode.episode.patient_id
    return None


def _all_coordination_tasks(*, coordination_id: int, db: Session) -> list[Task]:
    return (
        db.query(Task)
        .join(TaskGroup, TaskGroup.id == Task.task_group_id)
        .options(
            joinedload(Task.priority),
            joinedload(Task.status),
            joinedload(Task.assigned_to),
            joinedload(Task.closed_by),
            joinedload(Task.changed_by_user),
        )
        .filter(TaskGroup.coordination_id == coordination_id)
        .order_by(Task.until.asc(), Task.id.asc())
        .all()
    )


def _get_or_create_coordination_group(
    *,
    coordination_id: int,
    template: TaskGroupTemplate,
    changed_by_id: int,
    db: Session,
) -> TaskGroup:
    item = (
        db.query(TaskGroup)
        .filter(
            TaskGroup.coordination_id == coordination_id,
            TaskGroup.organ_id.is_(None),
            TaskGroup.task_group_template_id == template.id,
        )
        .first()
    )
    if item:
        return item
    # Migrate older ad-hoc completion groups to template-backed groups.
    legacy = (
        db.query(TaskGroup)
        .filter(
            TaskGroup.coordination_id == coordination_id,
            TaskGroup.organ_id.is_(None),
            TaskGroup.task_group_template_id.is_(None),
            TaskGroup.name == template.name,
        )
        .first()
    )
    if legacy:
        legacy.task_group_template_id = template.id
        legacy.name = template.name
        legacy.changed_by_id = changed_by_id
        db.commit()
        db.refresh(legacy)
        return legacy
    patient_id = _resolve_coordination_patient_id(coordination_id=coordination_id, db=db)
    return create_task_group(
        payload=TaskGroupCreate(
            patient_id=patient_id,
            task_group_template_id=template.id,
            coordination_id=coordination_id,
            name=template.name,
        ),
        changed_by_id=changed_by_id,
        db=db,
    )


def _ensure_group_tasks(
    *,
    template: TaskGroupTemplate,
    task_group_id: int,
    changed_by_id: int,
    db: Session,
) -> None:
    existing_descriptions = {
        (task.description or "").strip()
        for task in db.query(Task).filter(Task.task_group_id == task_group_id).all()
    }
    now_utc = datetime.now(UTC)
    default_priority = _default_code_or_500(db=db, code_type="PRIORITY", code_key=PriorityKey.NORMAL.value)
    active_templates = sorted(
        [item for item in template.task_templates if item.is_active],
        key=lambda item: (item.sort_pos, item.id),
    )
    for task_template in active_templates:
        description = (task_template.description or "").strip()
        if not description or description in existing_descriptions:
            continue
        until_at = now_utc + timedelta(minutes=task_template.offset_minutes_default or 0)
        priority = task_template.priority or default_priority
        create_task(
            payload=TaskCreate(
                task_group_id=task_group_id,
                description=description,
                kind_key=(task_template.kind_key.value if hasattr(task_template.kind_key, "value") else task_template.kind_key) or TaskKindKey.TASK.value,
                priority_id=priority.id,
                until=until_at,
            ),
            changed_by_id=changed_by_id,
            db=db,
        )


def ensure_coordination_completion_tasks(
    *,
    coordination_id: int,
    changed_by_id: int,
    db: Session,
) -> tuple[TaskGroup, TaskGroup]:
    _ = _coordination_or_404(coordination_id=coordination_id, db=db)
    block_1_template = _completion_template_or_422(key=BLOCK_1_TEMPLATE_KEY, db=db)
    block_2_template = _completion_template_or_422(key=BLOCK_2_TEMPLATE_KEY, db=db)
    block_1_group = _get_or_create_coordination_group(
        coordination_id=coordination_id,
        template=block_1_template,
        changed_by_id=changed_by_id,
        db=db,
    )
    block_2_group = _get_or_create_coordination_group(
        coordination_id=coordination_id,
        template=block_2_template,
        changed_by_id=changed_by_id,
        db=db,
    )
    _ensure_group_tasks(
        template=block_1_template,
        task_group_id=block_1_group.id,
        changed_by_id=changed_by_id,
        db=db,
    )
    _ensure_group_tasks(
        template=block_2_template,
        task_group_id=block_2_group.id,
        changed_by_id=changed_by_id,
        db=db,
    )
    return block_1_group, block_2_group


def get_coordination_completion_state(
    *,
    coordination_id: int,
    changed_by_id: int,
    db: Session,
) -> CoordinationCompletionStateResponse:
    block_1_template = _completion_template_or_422(key=BLOCK_1_TEMPLATE_KEY, db=db)
    block_2_template = _completion_template_or_422(key=BLOCK_2_TEMPLATE_KEY, db=db)
    block_1_group, block_2_group = ensure_coordination_completion_tasks(
        coordination_id=coordination_id,
        changed_by_id=changed_by_id,
        db=db,
    )
    coordination = _coordination_or_404(coordination_id=coordination_id, db=db)
    block_1_tasks = _tasks_for_group(task_group_id=block_1_group.id, db=db)
    block_2_tasks = _tasks_for_group(task_group_id=block_2_group.id, db=db)
    all_tasks = _all_coordination_tasks(coordination_id=coordination_id, db=db)
    return CoordinationCompletionStateResponse(
        coordination_id=coordination.id,
        completion_confirmed=bool(coordination.completion_confirmed),
        completion_comment=coordination.completion_comment or "",
        completion_confirmed_at=coordination.completion_confirmed_at,
        completion_confirmed_by_id=coordination.completion_confirmed_by_id,
        completion_confirmed_by_user=coordination.completion_confirmed_by_user,
        all_tasks=all_tasks,
        block_1=CoordinationCompletionTaskGroupResponse(
            task_group_template_id=block_1_template.id,
            group_name=block_1_template.name,
            due_window_days=BLOCK_1_DUE_WINDOW_DAYS,
            tasks=block_1_tasks,
        ),
        block_2=CoordinationCompletionTaskGroupResponse(
            task_group_template_id=block_2_template.id,
            group_name=block_2_template.name,
            due_window_days=BLOCK_2_DUE_WINDOW_DAYS,
            tasks=block_2_tasks,
        ),
    )


def confirm_coordination_completion(
    *,
    coordination_id: int,
    comment: str,
    changed_by_id: int,
    db: Session,
) -> CoordinationCompletionStateResponse:
    coordination = _coordination_or_404(coordination_id=coordination_id, db=db)
    coordination.completion_confirmed = True
    coordination.completion_comment = (comment or "").strip()
    coordination.completion_confirmed_at = datetime.now(UTC)
    coordination.completion_confirmed_by_id = changed_by_id
    coordination.changed_by_id = changed_by_id
    follow_up_start = coordination.completion_confirmed_at.date()
    linked_episodes = (
        db.query(Episode)
        .join(CoordinationEpisode, CoordinationEpisode.episode_id == Episode.id)
        .filter(CoordinationEpisode.coordination_id == coordination_id)
        .all()
    )
    for episode in linked_episodes:
        mark_follow_up_started(
            episode=episode,
            started_at=follow_up_start,
            changed_by_id=changed_by_id,
            db=db,
        )
    db.commit()
    return get_coordination_completion_state(
        coordination_id=coordination_id,
        changed_by_id=changed_by_id,
        db=db,
    )
