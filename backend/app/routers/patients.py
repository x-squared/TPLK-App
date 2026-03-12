from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.patients import (
    create_patient as create_patient_service,
    delete_patient as delete_patient_service,
    get_patient_or_404,
    list_patients as list_patients_service,
    update_patient as update_patient_service,
)
from ..models import User
from ..schemas import PatientCreate, PatientListResponse, PatientResponse, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/", response_model=list[PatientListResponse])
def list_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_patients_service(skip=skip, limit=limit, db=db)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return get_patient_or_404(patient_id=patient_id, db=db)


@router.post("/", response_model=PatientResponse, status_code=201)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return create_patient_service(payload=payload, changed_by_id=current_user.id, db=db)


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_patient_service(
        patient_id=patient_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    delete_patient_service(patient_id=patient_id, db=db)
