from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.medical_values import (
    get_medical_value_template_or_404,
    list_medical_value_templates as list_medical_value_templates_service,
)
from ..models import User
from ..schemas import MedicalValueTemplateResponse

router = APIRouter(prefix="/medical-value-templates", tags=["medical-value-templates"])


@router.get("/", response_model=list[MedicalValueTemplateResponse])
def list_medical_value_templates(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_medical_value_templates_service(db)


@router.get("/{template_id}", response_model=MedicalValueTemplateResponse)
def get_medical_value_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return get_medical_value_template_or_404(template_id, db)
