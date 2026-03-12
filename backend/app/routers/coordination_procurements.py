from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_procurements import (
    delete_coordination_procurement as delete_coordination_procurement_service,
    get_coordination_procurement as get_coordination_procurement_service,
    update_coordination_procurement as update_coordination_procurement_service,
    upsert_coordination_procurement as upsert_coordination_procurement_service,
)
from ..models import User
from ..schemas import (
    CoordinationProcurementCreate,
    CoordinationProcurementResponse,
    CoordinationProcurementUpdate,
)

router = APIRouter(prefix="/coordinations/{coordination_id}/procurement", tags=["coordination_procurement"])


@router.get("/", response_model=CoordinationProcurementResponse)
def get_coordination_procurement(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return get_coordination_procurement_service(coordination_id=coordination_id, db=db)


@router.put("/", response_model=CoordinationProcurementResponse)
def upsert_coordination_procurement(
    coordination_id: int,
    payload: CoordinationProcurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return upsert_coordination_procurement_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/", response_model=CoordinationProcurementResponse)
def update_coordination_procurement(
    coordination_id: int,
    payload: CoordinationProcurementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return update_coordination_procurement_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/", status_code=204)
def delete_coordination_procurement(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("edit.donors")),
):
    delete_coordination_procurement_service(coordination_id=coordination_id, db=db)
