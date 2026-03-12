from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Diagnosis, Patient
from ...schemas import DiagnosisCreate, DiagnosisUpdate


def _get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _clear_other_main_diagnoses(patient_id: int, db: Session, keep_id: int | None = None) -> None:
    query = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id, Diagnosis.is_main.is_(True))
    if keep_id is not None:
        query = query.filter(Diagnosis.id != keep_id)
    query.update({Diagnosis.is_main: False}, synchronize_session=False)


def list_diagnoses(*, patient_id: int, db: Session) -> list[Diagnosis]:
    _get_patient_or_404(patient_id, db)
    return (
        db.query(Diagnosis)
        .options(joinedload(Diagnosis.catalogue), joinedload(Diagnosis.changed_by_user))
        .filter(Diagnosis.patient_id == patient_id)
        .all()
    )


def create_diagnosis(*, patient_id: int, payload: DiagnosisCreate, changed_by_id: int, db: Session) -> Diagnosis:
    _get_patient_or_404(patient_id, db)
    has_existing = (
        db.query(Diagnosis.id)
        .filter(Diagnosis.patient_id == patient_id)
        .first()
        is not None
    )
    payload_data = payload.model_dump()
    if not has_existing:
        # First diagnosis for a patient must always be the main diagnosis.
        payload_data["is_main"] = True
    if payload_data.get("is_main"):
        _clear_other_main_diagnoses(patient_id, db)
    diagnosis = Diagnosis(
        patient_id=patient_id,
        **payload_data,
        changed_by_id=changed_by_id,
    )
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


def update_diagnosis(
    *,
    patient_id: int,
    diagnosis_id: int,
    payload: DiagnosisUpdate,
    changed_by_id: int,
    db: Session,
) -> Diagnosis:
    diagnosis = (
        db.query(Diagnosis)
        .filter(Diagnosis.id == diagnosis_id, Diagnosis.patient_id == patient_id)
        .first()
    )
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    if payload.is_main is True:
        _clear_other_main_diagnoses(patient_id, db, keep_id=diagnosis.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(diagnosis, key, value)
    diagnosis.changed_by_id = changed_by_id
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


def delete_diagnosis(*, patient_id: int, diagnosis_id: int, db: Session) -> None:
    diagnosis = (
        db.query(Diagnosis)
        .filter(Diagnosis.id == diagnosis_id, Diagnosis.patient_id == patient_id)
        .first()
    )
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    db.delete(diagnosis)
    db.commit()
