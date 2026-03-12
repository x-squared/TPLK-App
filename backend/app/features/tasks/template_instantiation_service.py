from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...enums import TaskKindKey, TaskStatusKey, TaskScopeKey
from ...models import Code, Episode, Patient, Task, TaskGroup, TaskGroupTemplate
from ...schemas import TaskGroupTemplateInstantiateRequest
from .group_service import episode_organ_ids


def _get_code_or_422(*, db: Session, code_id: int, code_type: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.id == code_id, Code.type == code_type).first()
    if not code:
        raise HTTPException(status_code=422, detail=f"{field_name} must reference CODE with type {code_type}")
    return code


def get_default_code_or_422(*, db: Session, code_type: str, code_key: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.type == code_type, Code.key == code_key).first()
    if not code:
        raise HTTPException(status_code=422, detail=f"default {field_name} code not found: {code_type}.{code_key}")
    return code


def validate_template_links(
    *,
    db: Session,
    scope_id: int,
    organ_id: int | None,
    tpl_phase_id: int | None,
) -> None:
    _get_code_or_422(db=db, code_id=scope_id, code_type="TASK_SCOPE", field_name="scope_id")
    if organ_id is not None:
        _get_code_or_422(db=db, code_id=organ_id, code_type="ORGAN", field_name="organ_id")
    if tpl_phase_id is not None:
        _get_code_or_422(db=db, code_id=tpl_phase_id, code_type="TPL_PHASE", field_name="tpl_phase_id")


def instantiate_task_group_template(
    *,
    template_id: int,
    payload: TaskGroupTemplateInstantiateRequest,
    changed_by_id: int,
    db: Session,
) -> TaskGroup:
    template = (
        db.query(TaskGroupTemplate)
        .options(
            joinedload(TaskGroupTemplate.scope),
            joinedload(TaskGroupTemplate.organ),
            joinedload(TaskGroupTemplate.tpl_phase),
            joinedload(TaskGroupTemplate.task_templates),
        )
        .filter(TaskGroupTemplate.id == template_id)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Task group template not found")
    if not template.is_active:
        raise HTTPException(status_code=422, detail="Template is inactive")

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    episode = None
    if payload.episode_id is not None:
        episode = db.query(Episode).filter(Episode.id == payload.episode_id).first()
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        if episode.patient_id != payload.patient_id:
            raise HTTPException(status_code=422, detail="episode_id must belong to patient_id")

    scope_key = template.scope_key or (template.scope.key if template.scope else None)
    if scope_key == TaskScopeKey.EPISODE.value and episode is None:
        raise HTTPException(status_code=422, detail="episode_id is required for templates with TASK_SCOPE.EPISODE")

    if template.organ_id is not None:
        if episode is None:
            raise HTTPException(status_code=422, detail="episode_id is required when template has organ_id")
        if template.organ_id not in episode_organ_ids(episode):
            raise HTTPException(status_code=422, detail="episode organ must match template organ_id")

    effective_tpl_phase_id = payload.tpl_phase_id if payload.tpl_phase_id is not None else template.tpl_phase_id
    if effective_tpl_phase_id is not None and episode is None:
        raise HTTPException(status_code=422, detail="tpl_phase_id can only be set if episode_id is set")
    if template.tpl_phase_id is not None and effective_tpl_phase_id != template.tpl_phase_id:
        raise HTTPException(status_code=422, detail="tpl_phase_id must match template tpl_phase_id")
    if effective_tpl_phase_id is not None:
        _get_code_or_422(
            db=db,
            code_id=effective_tpl_phase_id,
            code_type="TPL_PHASE",
            field_name="tpl_phase_id",
        )

    task_group = TaskGroup(
        patient_id=payload.patient_id,
        task_group_template_id=template.id,
        name=template.name,
        episode_id=payload.episode_id,
        tpl_phase_id=effective_tpl_phase_id,
        changed_by_id=changed_by_id,
    )
    db.add(task_group)
    db.flush()

    pending_status = get_default_code_or_422(
        db=db,
        code_type="TASK_STATUS",
        code_key=TaskStatusKey.PENDING.value,
        field_name="status_id",
    )

    active_task_templates = sorted(
        [item for item in template.task_templates if item.is_active],
        key=lambda item: (item.sort_pos, item.id),
    )
    for item in active_task_templates:
        # Tasks/events must always have a target datetime. If template has no offset, use anchor_at.
        until = payload.anchor_at
        if item.offset_minutes_default is not None:
            until = payload.anchor_at + timedelta(minutes=item.offset_minutes_default)
        db.add(
            Task(
                task_group_id=task_group.id,
                description=item.description,
                comment_hint=item.comment_hint,
                kind_key=item.kind_key or TaskKindKey.TASK.value,
                priority_id=item.priority_id,
                priority_key=item.priority_key or (item.priority.key if item.priority else None),
                assigned_to_id=None,
                until=until,
                event_time=None,
                status_id=pending_status.id,
                status_key=pending_status.key,
                closed_at=None,
                closed_by_id=None,
                comment="",
                changed_by_id=changed_by_id,
            )
        )

    db.commit()
    return (
        db.query(TaskGroup)
        .options(
            joinedload(TaskGroup.tpl_phase),
            joinedload(TaskGroup.changed_by_user),
        )
        .filter(TaskGroup.id == task_group.id)
        .first()
    )


def resolve_anchor_date(payload: TaskGroupTemplateInstantiateRequest) -> datetime:
    return payload.anchor_at
