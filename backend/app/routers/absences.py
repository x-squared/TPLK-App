from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.absences import (
    create_absence as create_absence_service,
    delete_absence as delete_absence_service,
    list_absences as list_absences_service,
    update_absence as update_absence_service,
)
from ..models import User
from ..schemas import AbsenceCreate, AbsenceResponse, AbsenceUpdate

router = APIRouter(prefix="/patients/{patient_id}/absences", tags=["absences"])


@router.get("/", response_model=list[AbsenceResponse])
def list_absences(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_absences_service(patient_id=patient_id, db=db)


@router.post("/", response_model=AbsenceResponse, status_code=201)
def create_absence(
    patient_id: int,
    payload: AbsenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return create_absence_service(
        patient_id=patient_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{absence_id}", response_model=AbsenceResponse)
def update_absence(
    patient_id: int,
    absence_id: int,
    payload: AbsenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_absence_service(
        patient_id=patient_id,
        absence_id=absence_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{absence_id}", status_code=204)
def delete_absence(
    patient_id: int,
    absence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    delete_absence_service(patient_id=patient_id, absence_id=absence_id, db=db)
