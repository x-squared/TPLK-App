from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ...enums import PriorityKey, TaskKindKey, TaskScopeKey, TaskStatusKey
from ...models import (
    Code,
    CoordinationEpisode,
    CoordinationProcurementProtocolTaskGroupSelection,
    Task,
    TaskGroup,
    TaskGroupTemplate,
    TaskTemplate,
)


def _get_default_code(db: Session, *, code_type: str, code_key: str) -> Code | None:
    return db.query(Code).filter(Code.type == code_type, Code.key == code_key).first()


def ensure_coordination_protocol_task_groups(
    *,
    coordination_id: int,
    changed_by_id: int,
    db: Session,
    organ_id: int | None = None,
) -> int:
    episodes = (
        db.query(CoordinationEpisode)
        .options(joinedload(CoordinationEpisode.episode))
        .filter(CoordinationEpisode.coordination_id == coordination_id)
        .order_by(CoordinationEpisode.id.asc())
        .all()
    )
    by_organ_id: dict[int, CoordinationEpisode] = {}
    for entry in episodes:
        if entry.organ_id not in by_organ_id:
            by_organ_id[entry.organ_id] = entry

    if organ_id is not None:
        target_organ_ids = [organ_id]
    else:
        target_organ_ids = sorted(by_organ_id.keys())
    if not target_organ_ids:
        return 0

    fallback_patient_id: int | None = None
    existing_group = (
        db.query(TaskGroup)
        .filter(TaskGroup.coordination_id == coordination_id)
        .order_by(TaskGroup.id.asc())
        .first()
    )
    if existing_group is not None:
        fallback_patient_id = existing_group.patient_id
    if fallback_patient_id is None:
        first_episode_row = next(
            (
                row
                for row in episodes
                if row.episode is not None and row.episode.patient_id is not None
            ),
            None,
        )
        if first_episode_row is not None and first_episode_row.episode is not None:
            fallback_patient_id = first_episode_row.episode.patient_id

    selections = (
        db.query(CoordinationProcurementProtocolTaskGroupSelection)
        .options(
            joinedload(CoordinationProcurementProtocolTaskGroupSelection.task_group_template).joinedload(TaskGroupTemplate.scope),
            joinedload(CoordinationProcurementProtocolTaskGroupSelection.task_group_template).joinedload(TaskGroupTemplate.task_templates).joinedload(TaskTemplate.priority),
        )
        .filter(
            or_(
                CoordinationProcurementProtocolTaskGroupSelection.organ_id.is_(None),
                CoordinationProcurementProtocolTaskGroupSelection.organ_id.in_(target_organ_ids),
            )
        )
        .order_by(
            CoordinationProcurementProtocolTaskGroupSelection.pos.asc(),
            CoordinationProcurementProtocolTaskGroupSelection.id.asc(),
        )
        .all()
    )
    if not selections:
        return 0

    pending_status = _get_default_code(db, code_type="TASK_STATUS", code_key=TaskStatusKey.PENDING.value)
    default_priority = _get_default_code(db, code_type="PRIORITY", code_key=PriorityKey.NORMAL.value)
    if pending_status is None or default_priority is None:
        return 0

    created_group_count = 0
    now_utc = datetime.now(timezone.utc)
    for current_organ_id in target_organ_ids:
        coordination_episode = by_organ_id.get(current_organ_id)
        episode = coordination_episode.episode if coordination_episode is not None else None
        patient_id = episode.patient_id if episode is not None else fallback_patient_id
        selected_templates: list[TaskGroupTemplate] = []
        seen_template_ids: set[int] = set()
        for selection in selections:
            if selection.organ_id is not None and selection.organ_id != current_organ_id:
                continue
            template = selection.task_group_template
            if not template or template.id in seen_template_ids:
                continue
            if not template.is_active:
                continue
            scope_key = template.scope_key or (template.scope.key if template.scope else None)
            if scope_key != TaskScopeKey.COORDINATION_PROTOCOL.value:
                continue
            seen_template_ids.add(template.id)
            selected_templates.append(template)
        if not selected_templates:
            continue
        for template in selected_templates:
            existing = (
                db.query(TaskGroup)
                .filter(
                    TaskGroup.coordination_id == coordination_id,
                    TaskGroup.organ_id == current_organ_id,
                    TaskGroup.task_group_template_id == template.id,
                )
                .first()
            )
            if existing:
                continue

            task_group = TaskGroup(
                patient_id=patient_id,
                task_group_template_id=template.id,
                name=template.name,
                episode_id=episode.id if episode is not None else None,
                colloqium_agenda_id=None,
                coordination_id=coordination_id,
                organ_id=current_organ_id,
                tpl_phase_id=template.tpl_phase_id,
                changed_by_id=changed_by_id,
            )
            db.add(task_group)
            db.flush()
            created_group_count += 1

            active_templates = sorted(
                [item for item in template.task_templates if item.is_active],
                key=lambda item: (item.sort_pos, item.id),
            )
            for task_template in active_templates:
                until = now_utc
                if task_template.offset_minutes_default is not None:
                    until = now_utc + timedelta(minutes=task_template.offset_minutes_default)
                priority = task_template.priority or default_priority
                db.add(
                    Task(
                        task_group_id=task_group.id,
                        description=task_template.description,
                        kind_key=task_template.kind_key or TaskKindKey.TASK.value,
                        priority_id=priority.id,
                        priority_key=priority.key,
                        assigned_to_id=changed_by_id,
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

    if created_group_count > 0:
        db.commit()
    return created_group_count
