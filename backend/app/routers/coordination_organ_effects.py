from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_organ_effects import (
    create_coordination_organ_effect as create_coordination_organ_effect_service,
    delete_coordination_organ_effect as delete_coordination_organ_effect_service,
    list_coordination_organ_effects as list_coordination_organ_effects_service,
    update_coordination_organ_effect as update_coordination_organ_effect_service,
)
from ..models import User
from ..schemas import (
    CoordinationOrganEffectCreate,
    CoordinationOrganEffectResponse,
    CoordinationOrganEffectUpdate,
)

router = APIRouter(
    prefix="/coordinations/{coordination_id}/organ-effects",
    tags=["coordination_organ_effect"],
)


@router.get("/", response_model=list[CoordinationOrganEffectResponse])
def list_coordination_organ_effects(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return list_coordination_organ_effects_service(coordination_id=coordination_id, db=db)


@router.post("/", response_model=CoordinationOrganEffectResponse, status_code=201)
def create_coordination_organ_effect(
    coordination_id: int,
    payload: CoordinationOrganEffectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return create_coordination_organ_effect_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{organ_effect_id}", response_model=CoordinationOrganEffectResponse)
def update_coordination_organ_effect(
    coordination_id: int,
    organ_effect_id: int,
    payload: CoordinationOrganEffectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return update_coordination_organ_effect_service(
        coordination_id=coordination_id,
        organ_effect_id=organ_effect_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{organ_effect_id}", status_code=204)
def delete_coordination_organ_effect(
    coordination_id: int,
    organ_effect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    _ = current_user
    delete_coordination_organ_effect_service(coordination_id=coordination_id, organ_effect_id=organ_effect_id, db=db)
