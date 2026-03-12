from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.medical_values import (
    create_medical_value_for_patient,
    delete_medical_value_for_patient,
    instantiate_templates_for_patient,
    list_medical_values_for_patient,
    update_medical_value_for_patient,
)
from ..models import User
from ..schemas import MedicalValueCreate, MedicalValueResponse, MedicalValueUpdate

router = APIRouter(prefix="/patients/{patient_id}/medical-values", tags=["medical-values"])


@router.get("/", response_model=list[MedicalValueResponse])
def list_medical_values(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_medical_values_for_patient(patient_id=patient_id, db=db)


@router.post("/instantiate", status_code=200)
def instantiate_medical_values(
    patient_id: int,
    include_donor_context: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return instantiate_templates_for_patient(
        db,
        patient_id,
        include_donor_context=include_donor_context,
        changed_by_id=current_user.id,
    )


@router.post("/", response_model=MedicalValueResponse, status_code=201)
def create_medical_value(
    patient_id: int,
    payload: MedicalValueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return create_medical_value_for_patient(
        patient_id=patient_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{medical_value_id}", response_model=MedicalValueResponse)
def update_medical_value(
    patient_id: int,
    medical_value_id: int,
    payload: MedicalValueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_medical_value_for_patient(
        patient_id=patient_id,
        medical_value_id=medical_value_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{medical_value_id}", status_code=204)
def delete_medical_value(
    patient_id: int,
    medical_value_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    delete_medical_value_for_patient(patient_id=patient_id, medical_value_id=medical_value_id, db=db)
