from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session, joinedload

from ...models import ContactInfo, Patient
from ...schemas import ContactInfoCreate, ContactInfoUpdate


def _get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def list_contact_infos(*, patient_id: int, db: Session) -> list[ContactInfo]:
    _get_patient_or_404(patient_id, db)
    return (
        db.query(ContactInfo)
        .options(joinedload(ContactInfo.type), joinedload(ContactInfo.changed_by_user))
        .filter(ContactInfo.patient_id == patient_id)
        .all()
    )


def create_contact_info(*, patient_id: int, payload: ContactInfoCreate, changed_by_id: int, db: Session) -> ContactInfo:
    _get_patient_or_404(patient_id, db)
    max_pos = (
        db.query(sa_func.max(ContactInfo.pos))
        .filter(ContactInfo.patient_id == patient_id)
        .scalar()
    ) or 0
    ci = ContactInfo(
        patient_id=patient_id,
        **payload.model_dump(),
        pos=max_pos + 1,
        changed_by_id=changed_by_id,
    )
    db.add(ci)
    db.commit()
    db.refresh(ci)
    return ci


def update_contact_info(
    *,
    patient_id: int,
    contact_id: int,
    payload: ContactInfoUpdate,
    changed_by_id: int,
    db: Session,
) -> ContactInfo:
    ci = (
        db.query(ContactInfo)
        .filter(ContactInfo.id == contact_id, ContactInfo.patient_id == patient_id)
        .first()
    )
    if not ci:
        raise HTTPException(status_code=404, detail="Contact info not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ci, key, value)
    ci.changed_by_id = changed_by_id
    db.commit()
    db.refresh(ci)
    return ci


def delete_contact_info(*, patient_id: int, contact_id: int, db: Session) -> None:
    ci = (
        db.query(ContactInfo)
        .filter(ContactInfo.id == contact_id, ContactInfo.patient_id == patient_id)
        .first()
    )
    if not ci:
        raise HTTPException(status_code=404, detail="Contact info not found")
    db.delete(ci)
    db.commit()
