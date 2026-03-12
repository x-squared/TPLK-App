from sqlalchemy.orm import Session

from ....features.medical_values import instantiate_templates_for_patient
from ....models import (
    Code,
    ContactInfo,
    Episode,
    EpisodeOrgan,
    MedicalValue,
    MedicalValueGroup,
    MedicalValueTemplate,
    Patient,
)


def sync_patients(db: Session) -> None:
    """Replace all PATIENT and CONTACT_INFO rows with seed data on every startup."""
    from ...datasets.sample.patient_cases import CONTACT_INFOS, EPISODES, PATIENTS, SAMPLE_CHANGED_BY_ID

    db.query(MedicalValue).delete()
    db.query(MedicalValueGroup).delete()
    db.query(EpisodeOrgan).delete()
    db.query(Episode).delete()
    db.query(ContactInfo).delete()
    db.query(Patient).delete()
    patient_blood_types_by_pid: dict[str, str] = {}
    for entry in PATIENTS:
        raw = dict(entry)
        patient_blood_types_by_pid[raw["pid"]] = raw.pop("blood_type_key", "")
        db.add(Patient(**raw))
    db.flush()

    for entry in CONTACT_INFOS:
        raw = dict(entry)
        patient = db.query(Patient).filter(Patient.pid == raw.pop("patient_pid")).first()
        code = (
            db.query(Code)
            .filter(Code.type == raw.pop("code_type"), Code.key == raw.pop("code_key"))
            .first()
        )
        if patient and code:
            db.add(ContactInfo(patient_id=patient.id, type_id=code.id, **raw))

    for entry in EPISODES:
        raw = dict(entry)
        patient = db.query(Patient).filter(Patient.pid == raw.pop("patient_pid")).first()
        organ_keys = raw.pop("organ_keys", [])
        organ_ids: list[int] = []
        for organ_key in organ_keys:
            organ = db.query(Code).filter(Code.type == "ORGAN", Code.key == organ_key).first()
            if organ:
                organ_ids.append(organ.id)
        organ_ids = list(dict.fromkeys(organ_ids))
        status_key = raw.pop("status_key", None)
        phase_key = raw.pop("phase_key", None)
        status = (
            db.query(Code).filter(Code.type == "TPL_STATUS", Code.key == status_key).first()
            if status_key
            else None
        )
        phase = (
            db.query(Code).filter(Code.type == "TPL_PHASE", Code.key == phase_key).first()
            if phase_key
            else None
        )
        if patient and organ_ids:
            episode = Episode(
                patient_id=patient.id,
                organ_id=organ_ids[0],
                status_id=status.id if status else None,
                phase_id=phase.id if phase else None,
                **raw,
            )
            db.add(episode)
            db.flush()
            for organ_id in organ_ids:
                db.add(
                    EpisodeOrgan(
                        episode_id=episode.id,
                        organ_id=organ_id,
                        date_added=episode.start,
                        is_active=True,
                    )
                )
    db.commit()

    # Ensure sample patients have instantiated medical value rows based on templates.
    patients_by_pid = {row.pid: row for row in db.query(Patient).all()}
    static_blood_type_template = (
        db.query(MedicalValueTemplate)
        .filter(MedicalValueTemplate.lab_key == "STATIC_BLOOD_TYPE")
        .first()
    )
    for pid, patient in patients_by_pid.items():
        instantiate_templates_for_patient(
            db,
            patient.id,
            include_donor_context=False,
            changed_by_id=SAMPLE_CHANGED_BY_ID,
        )
        blood_type_key = patient_blood_types_by_pid.get(pid) or ""
        if static_blood_type_template and blood_type_key:
            row = (
                db.query(MedicalValue)
                .filter(
                    MedicalValue.patient_id == patient.id,
                    MedicalValue.medical_value_template_id == static_blood_type_template.id,
                    MedicalValue.context_key == "STATIC",
                )
                .first()
            )
            if row:
                row.value = blood_type_key
                row.changed_by_id = SAMPLE_CHANGED_BY_ID
    db.commit()
