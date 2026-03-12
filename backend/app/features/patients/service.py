from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload, subqueryload

from ...features.medical_values import instantiate_templates_for_patient
from ...models import (
    Absence,
    ContactInfo,
    Diagnosis,
    Episode,
    MedicalValue,
    MedicalValueGroup,
    MedicalValueTemplate,
    Patient,
)
from ...schemas import PatientCreate, PatientListResponse, PatientResponse, PatientUpdate


def _episode_organ_ids(episode: Episode) -> list[int]:
    organ_ids = [organ.id for organ in (episode.organs or []) if organ and organ.id is not None]
    if organ_ids:
        return list(dict.fromkeys(organ_ids))
    if episode.organ_id is not None:
        return [episode.organ_id]
    return []


def _static_medical_values(patient: Patient) -> list[dict[str, str]]:
    rows: list[MedicalValue] = []
    for mv in patient.medical_values or []:
        if bool(mv.is_donor_context):
            continue
        group_key = None
        if mv.medical_value_group and mv.medical_value_group.medical_value_group_template:
            group_key = mv.medical_value_group.medical_value_group_template.key
        elif mv.medical_value_group_template:
            group_key = mv.medical_value_group_template.key
        elif mv.medical_value_template and mv.medical_value_template.medical_value_group_template:
            group_key = mv.medical_value_template.medical_value_group_template.key

        # Prefer semantic grouping; fall back to legacy STATIC context records.
        if group_key != "STATIC_PATIENT":
            if mv.organ_id is not None:
                continue
            if mv.context_key and mv.context_key != "STATIC":
                continue
        # Patients overview should show only static values marked as main.
        if not bool(mv.medical_value_template and mv.medical_value_template.is_main):
            continue
        datatype_key = (mv.datatype.key if mv.datatype else "") or (
            mv.medical_value_template.datatype.key
            if mv.medical_value_template and mv.medical_value_template.datatype
            else ""
        )
        if datatype_key != "BLOOD_TYPE":
            continue
        rows.append(mv)
    rows.sort(key=lambda mv: ((mv.pos or 0), mv.id))
    for mv in rows:
        value = (mv.value or "").strip()
        if not value:
            continue
        return [
            {
                "name": (mv.name or (mv.medical_value_template.name_default if mv.medical_value_template else "") or "Blood type"),
                "value": value,
            }
        ]
    return []


def _patient_detail_query(db: Session):
    return db.query(Patient).options(
        joinedload(Patient.changed_by_user),
        joinedload(Patient.sex),
        joinedload(Patient.resp_coord),
        subqueryload(Patient.contact_infos).joinedload(ContactInfo.type),
        subqueryload(Patient.contact_infos).joinedload(ContactInfo.changed_by_user),
        subqueryload(Patient.absences).joinedload(Absence.changed_by_user),
        subqueryload(Patient.diagnoses).joinedload(Diagnosis.catalogue),
        subqueryload(Patient.diagnoses).joinedload(Diagnosis.changed_by_user),
        subqueryload(Patient.medical_values).joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.datatype),
        subqueryload(Patient.medical_values).joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.medical_value_group_template),
        subqueryload(Patient.medical_values).joinedload(MedicalValue.medical_value_group_template),
        subqueryload(Patient.medical_values)
        .joinedload(MedicalValue.medical_value_group)
        .joinedload(MedicalValueGroup.medical_value_group_template),
        subqueryload(Patient.medical_values).joinedload(MedicalValue.datatype),
        subqueryload(Patient.medical_values).joinedload(MedicalValue.changed_by_user),
        subqueryload(Patient.episodes).joinedload(Episode.organ),
        subqueryload(Patient.episodes).subqueryload(Episode.organs),
        subqueryload(Patient.episodes).joinedload(Episode.status),
        subqueryload(Patient.episodes).joinedload(Episode.changed_by_user),
    )


def list_patients(*, skip: int, limit: int, db: Session) -> list[PatientListResponse]:
    patients = (
        db.query(Patient)
        .options(
            joinedload(Patient.changed_by_user),
            joinedload(Patient.sex),
            joinedload(Patient.resp_coord),
            subqueryload(Patient.contact_infos),
            subqueryload(Patient.medical_values).joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.medical_value_group_template),
            subqueryload(Patient.medical_values).joinedload(MedicalValue.medical_value_group_template),
            subqueryload(Patient.medical_values)
            .joinedload(MedicalValue.medical_value_group)
            .joinedload(MedicalValueGroup.medical_value_group_template),
            subqueryload(Patient.episodes).joinedload(Episode.organ),
            subqueryload(Patient.episodes).subqueryload(Episode.organs),
            subqueryload(Patient.episodes).joinedload(Episode.status),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    result: list[PatientListResponse] = []
    for p in patients:
        episodes = p.episodes or []
        open_episodes = sorted(
            [ep for ep in episodes if not ep.closed],
            key=lambda ep: ep.status.pos if ep.status else 999,
        )
        result.append(
            PatientListResponse(
                id=p.id,
                pid=p.pid,
                first_name=p.first_name,
                name=p.name,
                date_of_birth=p.date_of_birth,
                date_of_death=p.date_of_death,
                ahv_nr=p.ahv_nr,
                lang=p.lang,
                sex_id=p.sex_id,
                sex=p.sex,
                resp_coord_id=p.resp_coord_id,
                resp_coord=p.resp_coord,
                translate=p.translate,
                contact_info_count=len(p.contact_infos or []),
                open_episode_count=len(open_episodes),
                open_episode_indicators=[
                    (
                        "/".join(
                            (organ.name_default[:2] if organ and organ.name_default else "??")
                            for organ in (ep.organs or ([ep.organ] if ep.organ else []))
                        )
                        or "??"
                    )
                    for ep in open_episodes
                ],
                episode_organ_ids=[
                    organ_id
                    for ep in episodes
                    for organ_id in _episode_organ_ids(ep)
                ],
                open_episode_organ_ids=[
                    organ_id
                    for ep in open_episodes
                    for organ_id in _episode_organ_ids(ep)
                ],
                static_medical_values=_static_medical_values(p),
            )
        )
    return result


def get_patient_or_404(*, patient_id: int, db: Session) -> PatientResponse:
    patient = _patient_detail_query(db).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def create_patient(*, payload: PatientCreate, changed_by_id: int, db: Session) -> PatientResponse:
    patient = Patient(**payload.model_dump(), changed_by_id=changed_by_id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    instantiate_templates_for_patient(db, patient.id, include_donor_context=False, changed_by_id=changed_by_id)
    db.refresh(patient)
    return patient


def update_patient(*, patient_id: int, payload: PatientUpdate, changed_by_id: int, db: Session) -> PatientResponse:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)
    patient.changed_by_id = changed_by_id
    db.commit()
    return _patient_detail_query(db).filter(Patient.id == patient_id).first()


def delete_patient(*, patient_id: int, db: Session) -> None:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
