from sqlalchemy.orm import Session

from ....models import Code, Coordination, CoordinationEpisode, Episode, Patient, Task, TaskGroup, TaskGroupTemplate, User


def sync_tasks(db: Session) -> None:
    """Replace all TASK_GROUP and TASK rows with seed data on every startup."""
    from ...datasets.sample.patient_cases import COORDINATIONS, TASK_GROUPS, TASKS

    db.query(Task).delete()
    db.query(TaskGroup).delete()
    db.query(CoordinationEpisode).delete()
    db.query(Coordination).delete()
    db.flush()

    for entry in COORDINATIONS:
        raw = dict(entry)
        patient_pid = raw.pop("patient_pid")
        episode_organ_key = raw.pop("episode_organ_key")
        status_key = raw.pop("status_key")
        raw.pop("seed_key", None)

        patient = db.query(Patient).filter(Patient.pid == patient_pid).first()
        if not patient:
            continue
        status = db.query(Code).filter(Code.type == "COORDINATION_STATUS", Code.key == status_key).first()
        organ = db.query(Code).filter(Code.type == "ORGAN", Code.key == episode_organ_key).first()
        if not status or not organ:
            continue
        episode = (
            db.query(Episode)
            .filter(Episode.patient_id == patient.id, Episode.organ_id == organ.id)
            .first()
        )
        if not episode:
            continue

        coordination = Coordination(
            status_id=status.id,
            status_key=status.key,
            **raw,
        )
        db.add(coordination)
        db.flush()
        db.add(
            CoordinationEpisode(
                coordination_id=coordination.id,
                episode_id=episode.id,
                organ_id=organ.id,
                changed_by_id=raw.get("changed_by_id"),
            )
        )

    created_groups: dict[str, TaskGroup] = {}
    for entry in TASK_GROUPS:
        raw = dict(entry)
        seed_key = raw.pop("seed_key")
        patient_pid = raw.pop("patient_pid")
        task_group_template_key = raw.pop("task_group_template_key", None)
        tpl_phase_key = raw.pop("tpl_phase_key", None)

        patient = db.query(Patient).filter(Patient.pid == patient_pid).first()
        if not patient:
            continue

        tpl_phase_id = None
        if tpl_phase_key:
            tpl_phase = (
                db.query(Code)
                .filter(Code.type == "TPL_PHASE", Code.key == tpl_phase_key)
                .first()
            )
            if not tpl_phase:
                continue
            tpl_phase_id = tpl_phase.id

        task_group_template_id = None
        if task_group_template_key:
            task_group_template = (
                db.query(TaskGroupTemplate)
                .filter(TaskGroupTemplate.key == task_group_template_key)
                .first()
            )
            if not task_group_template:
                continue
            task_group_template_id = task_group_template.id

        task_group = TaskGroup(
            patient_id=patient.id,
            task_group_template_id=task_group_template_id,
            tpl_phase_id=tpl_phase_id,
            **raw,
        )
        db.add(task_group)
        db.flush()
        created_groups[seed_key] = task_group

    for entry in TASKS:
        raw = dict(entry)
        task_group_seed_key = raw.pop("task_group_seed_key")
        priority_key = raw.pop("priority_key")
        status_key = raw.pop("status_key")
        assigned_to_ext_id = raw.pop("assigned_to_ext_id", None)
        closed_by_ext_id = raw.pop("closed_by_ext_id", None)

        task_group = created_groups.get(task_group_seed_key)
        if not task_group:
            continue

        priority = (
            db.query(Code)
            .filter(Code.type == "PRIORITY", Code.key == priority_key)
            .first()
        )
        status = (
            db.query(Code)
            .filter(Code.type == "TASK_STATUS", Code.key == status_key)
            .first()
        )
        if not priority or not status:
            continue

        assigned_to_id = None
        if assigned_to_ext_id:
            assigned_to = db.query(User).filter(User.ext_id == assigned_to_ext_id).first()
            assigned_to_id = assigned_to.id if assigned_to else None

        closed_by_id = None
        if closed_by_ext_id:
            closed_by = db.query(User).filter(User.ext_id == closed_by_ext_id).first()
            closed_by_id = closed_by.id if closed_by else None

        db.add(
            Task(
                task_group_id=task_group.id,
                priority_id=priority.id,
                priority_key=priority.key,
                status_id=status.id,
                status_key=status.key,
                assigned_to_id=assigned_to_id,
                closed_by_id=closed_by_id,
                **raw,
            )
        )

    db.commit()
