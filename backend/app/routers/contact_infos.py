from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.contact_infos import (
    create_contact_info as create_contact_info_service,
    delete_contact_info as delete_contact_info_service,
    list_contact_infos as list_contact_infos_service,
    update_contact_info as update_contact_info_service,
)
from ..models import User
from ..schemas import ContactInfoCreate, ContactInfoResponse, ContactInfoUpdate

router = APIRouter(prefix="/patients/{patient_id}/contacts", tags=["contact_infos"])


@router.get("/", response_model=list[ContactInfoResponse])
def list_contact_infos(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_contact_infos_service(patient_id=patient_id, db=db)


@router.post("/", response_model=ContactInfoResponse, status_code=201)
def create_contact_info(
    patient_id: int,
    payload: ContactInfoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return create_contact_info_service(
        patient_id=patient_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{contact_id}", response_model=ContactInfoResponse)
def update_contact_info(
    patient_id: int,
    contact_id: int,
    payload: ContactInfoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_contact_info_service(
        patient_id=patient_id,
        contact_id=contact_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{contact_id}", status_code=204)
def delete_contact_info(
    patient_id: int,
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    delete_contact_info_service(patient_id=patient_id, contact_id=contact_id, db=db)
