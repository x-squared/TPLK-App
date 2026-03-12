from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased, joinedload

from ...enums import TaskScopeKey
from ...models import Code, ColloqiumAgenda, Coordination, Episode, Patient, TaskGroup, TaskGroupTemplate
from ...schemas import TaskGroupCreate, TaskGroupUpdate


def get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def episode_organ_ids(episode: Episode) -> list[int]:
    organ_ids = [organ.id for organ in (episode.organs or []) if organ and organ.id is not None]
    if organ_ids:
        return list(dict.fromkeys(organ_ids))
    if episode.organ_id is not None:
        return [episode.organ_id]
    return []


def validate_task_group_links(
    *,
    patient_id: int | None,
    task_group_template_id: int | None,
    episode_id: int | None,
    colloqium_agenda_id: int | None,
    coordination_id: int | None,
    organ_id: int | None,
    tpl_phase_id: int | None,
    db: Session,
) -> None:
    if patient_id is not None:
        get_patient_or_404(patient_id, db)
    template = None
    if task_group_template_id is not None:
        template = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.id == task_group_template_id).first()
        if not template:
            raise HTTPException(status_code=422, detail="task_group_template_id references unknown TASK_GROUP_TEMPLATE")
    if episode_id is not None:
        episode = db.query(Episode).filter(Episode.id == episode_id).first()
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        if patient_id is None:
            raise HTTPException(
                status_code=422,
                detail="patient_id is required when episode_id is set",
            )
        if episode.patient_id != patient_id:
            raise HTTPException(
                status_code=422,
                detail="episode_id must reference an episode that belongs to patient_id",
            )
    if colloqium_agenda_id is not None:
        agenda = db.query(ColloqiumAgenda).filter(ColloqiumAgenda.id == colloqium_agenda_id).first()
        if not agenda:
            raise HTTPException(status_code=422, detail="colloqium_agenda_id references unknown COLLOQIUM_AGENDA")
        if episode_id is None:
            raise HTTPException(
                status_code=422,
                detail="episode_id is required when colloqium_agenda_id is set",
            )
        if agenda.episode_id != episode_id:
            raise HTTPException(
                status_code=422,
                detail="episode_id must match COLLOQIUM_AGENDA.episode_id",
            )
    if coordination_id is not None:
        coordination = db.query(Coordination).filter(Coordination.id == coordination_id).first()
        if not coordination:
            raise HTTPException(status_code=422, detail="coordination_id references unknown COORDINATION")
    if organ_id is not None:
        organ = db.query(Code).filter(Code.id == organ_id, Code.type == "ORGAN").first()
        if not organ:
            raise HTTPException(status_code=422, detail="organ_id must reference CODE with type ORGAN")
    if tpl_phase_id is not None:
        if episode_id is None:
            raise HTTPException(
                status_code=422,
                detail="tpl_phase_id can only be set if episode_id is set",
            )
        phase = (
            db.query(Code)
            .filter(Code.id == tpl_phase_id, Code.type == "TPL_PHASE")
            .first()
        )
        if not phase:
            raise HTTPException(
                status_code=422,
                detail="tpl_phase_id must reference CODE with type TPL_PHASE",
            )
    if template is None:
        return

    template_scope = db.query(Code).filter(Code.id == template.scope_id, Code.type == "TASK_SCOPE").first()
    if not template_scope:
        raise HTTPException(status_code=422, detail="Template scope_id must reference CODE with type TASK_SCOPE")
    if template_scope.key == TaskScopeKey.EPISODE.value and episode_id is None:
        raise HTTPException(status_code=422, detail="episode_id is required for templates with TASK_SCOPE.EPISODE")
    if template.organ_id is not None:
        if episode_id is None:
            raise HTTPException(status_code=422, detail="episode_id is required when template has organ_id")
        episode = db.query(Episode).filter(Episode.id == episode_id).first()
        if not episode or template.organ_id not in episode_organ_ids(episode):
            raise HTTPException(status_code=422, detail="episode organ must match template organ_id")
    if template.tpl_phase_id is not None:
        if episode_id is None:
            raise HTTPException(status_code=422, detail="episode_id is required when template has tpl_phase_id")
        if tpl_phase_id is not None and tpl_phase_id != template.tpl_phase_id:
            raise HTTPException(status_code=422, detail="tpl_phase_id must match template tpl_phase_id")
    if tpl_phase_id is None and template.tpl_phase_id is not None:
        raise HTTPException(status_code=422, detail="tpl_phase_id is required when template has tpl_phase_id")


def resolve_task_group_name(
    *,
    db: Session,
    task_group_template_id: int | None,
    name: str | None,
    episode_id: int | None,
    tpl_phase_id: int | None,
) -> str:
    trimmed = (name or "").strip()
    if trimmed:
        return trimmed
    if task_group_template_id is None:
        organ_label = "no organ"
        if episode_id is not None:
            episode = db.query(Episode).filter(Episode.id == episode_id).first()
            if episode:
                organ_ids = episode_organ_ids(episode)
                if organ_ids:
                    organ_names = [
                        code.name_default
                        for code in db.query(Code).filter(Code.type == "ORGAN", Code.id.in_(organ_ids)).all()
                        if code and code.name_default
                    ]
                    if organ_names:
                        organ_label = " + ".join(dict.fromkeys(organ_names))
        phase_label = "no phase"
        if tpl_phase_id is not None:
            phase = db.query(Code).filter(Code.id == tpl_phase_id, Code.type == "TPL_PHASE").first()
            if phase:
                phase_label = phase.name_default
        return f"Other tasks ({organ_label}, {phase_label})"
    template = db.query(TaskGroupTemplate).filter(TaskGroupTemplate.id == task_group_template_id).first()
    return template.name if template else ""


def list_task_groups(
    *,
    patient_id: int | None,
    episode_id: int | None,
    colloqium_agenda_id: int | None,
    coordination_id: int | None,
    organ_id: int | None,
    task_group_template_ids: list[int] | None,
    db: Session,
) -> list[TaskGroup]:
    episode_direct = aliased(Episode)
    episode_via_agenda = aliased(Episode)
    query = db.query(TaskGroup).options(
        joinedload(TaskGroup.organ),
        joinedload(TaskGroup.tpl_phase),
        joinedload(TaskGroup.changed_by_user),
    )
    query = (
        query
        .outerjoin(episode_direct, TaskGroup.episode_id == episode_direct.id)
        .outerjoin(ColloqiumAgenda, TaskGroup.colloqium_agenda_id == ColloqiumAgenda.id)
        .outerjoin(episode_via_agenda, ColloqiumAgenda.episode_id == episode_via_agenda.id)
    )
    if patient_id is not None:
        query = query.filter(
            or_(
                TaskGroup.patient_id == patient_id,
                episode_direct.patient_id == patient_id,
                episode_via_agenda.patient_id == patient_id,
            )
        )
    if episode_id is not None:
        query = query.filter(
            or_(
                TaskGroup.episode_id == episode_id,
                ColloqiumAgenda.episode_id == episode_id,
            )
        )
    if colloqium_agenda_id is not None:
        query = query.filter(TaskGroup.colloqium_agenda_id == colloqium_agenda_id)
    if coordination_id is not None:
        query = query.filter(TaskGroup.coordination_id == coordination_id)
    if organ_id is not None:
        query = query.filter(TaskGroup.organ_id == organ_id)
    if task_group_template_ids:
        query = query.filter(TaskGroup.task_group_template_id.in_(task_group_template_ids))
    return query.distinct().all()


def create_task_group(*, payload: TaskGroupCreate, changed_by_id: int, db: Session) -> TaskGroup:
    payload_data = payload.model_dump()
    resolved_name = resolve_task_group_name(
        db=db,
        task_group_template_id=payload_data.get("task_group_template_id"),
        name=payload_data.get("name"),
        episode_id=payload_data.get("episode_id"),
        tpl_phase_id=payload_data.get("tpl_phase_id"),
    )
    payload_data["name"] = resolved_name
    if payload_data.get("colloqium_agenda_id") is not None and payload_data.get("episode_id") is None:
        agenda = db.query(ColloqiumAgenda).filter(ColloqiumAgenda.id == payload_data["colloqium_agenda_id"]).first()
        if agenda:
            payload_data["episode_id"] = agenda.episode_id
    validate_task_group_links(
        patient_id=payload_data["patient_id"],
        task_group_template_id=payload_data.get("task_group_template_id"),
        episode_id=payload_data.get("episode_id"),
        colloqium_agenda_id=payload_data.get("colloqium_agenda_id"),
        coordination_id=payload_data.get("coordination_id"),
        organ_id=payload_data.get("organ_id"),
        tpl_phase_id=payload_data.get("tpl_phase_id"),
        db=db,
    )
    tg = TaskGroup(**payload_data, changed_by_id=changed_by_id)
    db.add(tg)
    db.commit()
    db.refresh(tg)
    return (
        db.query(TaskGroup)
        .options(
            joinedload(TaskGroup.organ),
            joinedload(TaskGroup.tpl_phase),
            joinedload(TaskGroup.changed_by_user),
        )
        .filter(TaskGroup.id == tg.id)
        .first()
    )


def update_task_group(
    *,
    task_group_id: int,
    payload: TaskGroupUpdate,
    changed_by_id: int,
    db: Session,
) -> TaskGroup:
    tg = db.query(TaskGroup).filter(TaskGroup.id == task_group_id).first()
    if not tg:
        raise HTTPException(status_code=404, detail="Task group not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "episode_id" in update_data and update_data["episode_id"] is None and "tpl_phase_id" not in update_data:
        update_data["tpl_phase_id"] = None
    patient_id = update_data.get("patient_id", tg.patient_id)
    task_group_template_id = update_data.get("task_group_template_id", tg.task_group_template_id)
    episode_id = update_data.get("episode_id", tg.episode_id)
    colloqium_agenda_id = update_data.get("colloqium_agenda_id", tg.colloqium_agenda_id)
    coordination_id = update_data.get("coordination_id", tg.coordination_id)
    organ_id = update_data.get("organ_id", tg.organ_id)
    tpl_phase_id = update_data.get("tpl_phase_id", tg.tpl_phase_id)
    if colloqium_agenda_id is not None and episode_id is None:
        agenda = db.query(ColloqiumAgenda).filter(ColloqiumAgenda.id == colloqium_agenda_id).first()
        if agenda:
            episode_id = agenda.episode_id
            update_data["episode_id"] = episode_id
    validate_task_group_links(
        patient_id=patient_id,
        task_group_template_id=task_group_template_id,
        episode_id=episode_id,
        colloqium_agenda_id=colloqium_agenda_id,
        coordination_id=coordination_id,
        organ_id=organ_id,
        tpl_phase_id=tpl_phase_id,
        db=db,
    )
    if "name" in update_data:
        update_data["name"] = (update_data["name"] or "").strip()
    for key, value in update_data.items():
        setattr(tg, key, value)
    tg.changed_by_id = changed_by_id
    db.commit()
    return (
        db.query(TaskGroup)
        .options(
            joinedload(TaskGroup.organ),
            joinedload(TaskGroup.tpl_phase),
            joinedload(TaskGroup.changed_by_user),
        )
        .filter(TaskGroup.id == task_group_id)
        .first()
    )


def delete_task_group(*, task_group_id: int, db: Session) -> None:
    tg = db.query(TaskGroup).filter(TaskGroup.id == task_group_id).first()
    if not tg:
        raise HTTPException(status_code=404, detail="Task group not found")
    db.delete(tg)
    db.commit()
