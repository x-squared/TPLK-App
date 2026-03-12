from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.medical_value_groups import (
    list_medical_value_groups as list_medical_value_groups_service,
    update_medical_value_group as update_medical_value_group_service,
)
from ..models import User
from ..schemas import MedicalValueGroupTemplateResponse, MedicalValueGroupTemplateUpdate

router = APIRouter(prefix="/medical-value-groups", tags=["medical-value-groups"])


@router.get("/", response_model=list[MedicalValueGroupTemplateResponse])
def list_medical_value_groups(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_medical_value_groups_service(db=db)


@router.patch("/{group_id}", response_model=MedicalValueGroupTemplateResponse)
def update_medical_value_group(
    group_id: int,
    payload: MedicalValueGroupTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_medical_value_group_service(
        group_id=group_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
