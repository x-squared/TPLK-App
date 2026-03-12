from sqlalchemy.orm import Session

from ....models import Code, TaskGroupTemplate, TaskTemplate


def sync_task_templates_core(db: Session) -> None:
    """Upsert core TASK_GROUP_TEMPLATE and TASK_TEMPLATE rows."""
    from ...datasets.core.task_templates import (
        TASK_GROUP_TEMPLATES,
        TASK_TEMPLATES,
    )

    created_group_templates: dict[str, TaskGroupTemplate] = {}
    for entry in TASK_GROUP_TEMPLATES:
        raw = dict(entry)
        scope_key = raw.pop("scope_key")
        organ_key = raw.pop("organ_key", None)
        tpl_phase_key = raw.pop("tpl_phase_key", None)

        scope = db.query(Code).filter(Code.type == "TASK_SCOPE", Code.key == scope_key).first()
        if not scope:
            continue

        organ_id = None
        if organ_key:
            organ = db.query(Code).filter(Code.type == "ORGAN", Code.key == organ_key).first()
            if not organ:
                continue
            organ_id = organ.id

        tpl_phase_id = None
        if tpl_phase_key:
            tpl_phase = db.query(Code).filter(Code.type == "TPL_PHASE", Code.key == tpl_phase_key).first()
            if not tpl_phase:
                continue
            tpl_phase_id = tpl_phase.id

        key = raw["key"]
        template = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.key == key).first()
        if not template:
            template = TaskGroupTemplate(
                scope_id=scope.id,
                scope_key=scope.key,
                organ_id=organ_id,
                tpl_phase_id=tpl_phase_id,
                **raw,
            )
            db.add(template)
        else:
            template.name = raw.get("name", template.name)
            template.description = raw.get("description", template.description)
            template.scope_id = scope.id
            template.scope_key = scope.key
            template.organ_id = organ_id
            template.tpl_phase_id = tpl_phase_id
            template.is_active = raw.get("is_active", template.is_active)
            template.sort_pos = raw.get("sort_pos", template.sort_pos)
            template.changed_by_id = raw.get("changed_by_id", template.changed_by_id)
        db.flush()
        created_group_templates[key] = template

    for entry in TASK_TEMPLATES:
        raw = dict(entry)
        task_group_template_key = raw.pop("task_group_template_key")
        priority_key = raw.pop("priority_key")

        task_group_template = created_group_templates.get(task_group_template_key)
        if not task_group_template:
            continue

        priority = db.query(Code).filter(Code.type == "PRIORITY", Code.key == priority_key).first()
        if not priority:
            continue

        task_template = (
            db.query(TaskTemplate)
            .filter(
                TaskTemplate.task_group_template_id == task_group_template.id,
                TaskTemplate.description == raw.get("description", ""),
            )
            .first()
        )
        if not task_template:
            task_template = TaskTemplate(
                task_group_template_id=task_group_template.id,
                priority_id=priority.id,
                priority_key=priority.key,
                **raw,
            )
            db.add(task_template)
        else:
            task_template.comment_hint = raw.get("comment_hint", task_template.comment_hint)
            task_template.kind_key = raw.get("kind_key", task_template.kind_key)
            task_template.priority_id = priority.id
            task_template.priority_key = priority.key
            task_template.offset_minutes_default = raw.get("offset_minutes_default", task_template.offset_minutes_default)
            task_template.is_active = raw.get("is_active", task_template.is_active)
            task_template.sort_pos = raw.get("sort_pos", task_template.sort_pos)
            task_template.changed_by_id = raw.get("changed_by_id", task_template.changed_by_id)

    db.commit()
