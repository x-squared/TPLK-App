from sqlalchemy.orm import Session

from ....models import Code, CoordinationProcurementProtocolTaskGroupSelection, TaskGroupTemplate, TaskTemplate


def sync_task_templates(db: Session) -> None:
    """Replace all TASK_GROUP_TEMPLATE and TASK_TEMPLATE rows with seed data."""
    from ...datasets.sample.task_templates import (
        PROTOCOL_TASK_GROUP_SELECTIONS,
        SAMPLE_CHANGED_BY_ID,
        TASK_GROUP_TEMPLATES,
        TASK_TEMPLATES,
    )

    db.query(CoordinationProcurementProtocolTaskGroupSelection).delete()
    db.query(TaskTemplate).delete()
    db.query(TaskGroupTemplate).delete()
    db.flush()

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
        template = TaskGroupTemplate(
            scope_id=scope.id,
            scope_key=scope.key,
            organ_id=organ_id,
            tpl_phase_id=tpl_phase_id,
            **raw,
        )
        db.add(template)
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

        db.add(
            TaskTemplate(
                task_group_template_id=task_group_template.id,
                priority_id=priority.id,
                priority_key=priority.key,
                **raw,
            )
        )

    for entry in PROTOCOL_TASK_GROUP_SELECTIONS:
        template = created_group_templates.get(entry["task_group_template_key"])
        if not template:
            continue
        organ_id = None
        organ_key = entry.get("organ_key")
        if organ_key:
            organ = db.query(Code).filter(Code.type == "ORGAN", Code.key == organ_key).first()
            if not organ:
                continue
            organ_id = organ.id
        db.add(
            CoordinationProcurementProtocolTaskGroupSelection(
                task_group_template_id=template.id,
                organ_id=organ_id,
                pos=entry.get("pos", 0),
                changed_by_id=SAMPLE_CHANGED_BY_ID,
            )
        )

    db.commit()
