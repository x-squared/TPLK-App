from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Absence, Patient
from ...schemas import AbsenceCreate, AbsenceUpdate


def _get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def list_absences(*, patient_id: int, db: Session) -> list[Absence]:
    _get_patient_or_404(patient_id, db)
    return (
        db.query(Absence)
        .options(joinedload(Absence.changed_by_user))
        .filter(Absence.patient_id == patient_id)
        .order_by(Absence.start.desc())
        .all()
    )


def create_absence(*, patient_id: int, payload: AbsenceCreate, changed_by_id: int, db: Session) -> Absence:
    _get_patient_or_404(patient_id, db)
    absence = Absence(
        patient_id=patient_id,
        **payload.model_dump(),
        changed_by_id=changed_by_id,
    )
    db.add(absence)
    db.commit()
    db.refresh(absence)
    return absence


def update_absence(
    *,
    patient_id: int,
    absence_id: int,
    payload: AbsenceUpdate,
    changed_by_id: int,
    db: Session,
) -> Absence:
    absence = (
        db.query(Absence)
        .filter(Absence.id == absence_id, Absence.patient_id == patient_id)
        .first()
    )
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(absence, key, value)
    absence.changed_by_id = changed_by_id
    db.commit()
    db.refresh(absence)
    return absence


def delete_absence(*, patient_id: int, absence_id: int, db: Session) -> None:
    absence = (
        db.query(Absence)
        .filter(Absence.id == absence_id, Absence.patient_id == patient_id)
        .first()
    )
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    db.delete(absence)
    db.commit()
