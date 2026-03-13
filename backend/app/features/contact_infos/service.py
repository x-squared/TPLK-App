from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session, joinedload

from ...models import Code, ContactInfo, Patient
from ...schemas import ContactInfoCreate, ContactInfoUpdate


def _get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _get_code_or_422(*, code_id: int, expected_type: str, db: Session, label: str) -> Code:
    code = db.query(Code).filter(Code.id == code_id, Code.type == expected_type).first()
    if not code:
        raise HTTPException(status_code=422, detail=f"Invalid {label}")
    return code


def list_contact_infos(*, patient_id: int, db: Session) -> list[ContactInfo]:
    _get_patient_or_404(patient_id, db)
    return (
        db.query(ContactInfo)
        .options(
            joinedload(ContactInfo.type),
            joinedload(ContactInfo.use),
            joinedload(ContactInfo.changed_by_user),
        )
        .filter(ContactInfo.patient_id == patient_id)
        .all()
    )


def create_contact_info(*, patient_id: int, payload: ContactInfoCreate, changed_by_id: int, db: Session) -> ContactInfo:
    _get_patient_or_404(patient_id, db)
    _get_code_or_422(code_id=payload.type_id, expected_type="CONTACT", db=db, label="communicationType")
    if payload.use_id is not None:
        _get_code_or_422(code_id=payload.use_id, expected_type="CONTACT_USE", db=db, label="use")
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
    if payload.type_id is not None:
        _get_code_or_422(code_id=payload.type_id, expected_type="CONTACT", db=db, label="communicationType")
    if payload.use_id is not None:
        _get_code_or_422(code_id=payload.use_id, expected_type="CONTACT_USE", db=db, label="use")
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
