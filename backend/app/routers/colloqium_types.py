from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.colloqium_types import (
    create_colloqium_type as create_colloqium_type_service,
    delete_colloqium_type as delete_colloqium_type_service,
    list_colloqium_types as list_colloqium_types_service,
    update_colloqium_type as update_colloqium_type_service,
)
from ..models import User
from ..schemas import (
    ColloqiumTypeCreate,
    ColloqiumTypeResponse,
    ColloqiumTypeUpdate,
)

router = APIRouter(prefix="/colloqium-types", tags=["colloqium-types"])


@router.get("/", response_model=list[ColloqiumTypeResponse])
def list_colloqium_types(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.colloquiums")),
):
    return list_colloqium_types_service(db=db)


@router.post("/", response_model=ColloqiumTypeResponse, status_code=201)
def create_colloqium_type(
    payload: ColloqiumTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    return create_colloqium_type_service(
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{colloqium_type_id}", response_model=ColloqiumTypeResponse)
def update_colloqium_type(
    colloqium_type_id: int,
    payload: ColloqiumTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    return update_colloqium_type_service(
        colloqium_type_id=colloqium_type_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{colloqium_type_id}", status_code=204)
def delete_colloqium_type(
    colloqium_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    _ = current_user
    delete_colloqium_type_service(colloqium_type_id=colloqium_type_id, db=db)
