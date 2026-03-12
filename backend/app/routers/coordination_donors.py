from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_donors import (
    delete_coordination_donor as delete_coordination_donor_service,
    get_coordination_donor as get_coordination_donor_service,
    update_coordination_donor as update_coordination_donor_service,
    upsert_coordination_donor as upsert_coordination_donor_service,
)
from ..models import User
from ..schemas import CoordinationDonorCreate, CoordinationDonorResponse, CoordinationDonorUpdate

router = APIRouter(prefix="/coordinations/{coordination_id}/donor", tags=["coordination_donor"])


@router.get("/", response_model=CoordinationDonorResponse)
def get_coordination_donor(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return get_coordination_donor_service(coordination_id=coordination_id, db=db)


@router.put("/", response_model=CoordinationDonorResponse)
def upsert_coordination_donor(
    coordination_id: int,
    payload: CoordinationDonorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return upsert_coordination_donor_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/", response_model=CoordinationDonorResponse)
def update_coordination_donor(
    coordination_id: int,
    payload: CoordinationDonorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return update_coordination_donor_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/", status_code=204)
def delete_coordination_donor(
    coordination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    _ = current_user
    delete_coordination_donor_service(coordination_id=coordination_id, db=db)
