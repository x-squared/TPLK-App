from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.colloqiums import (
    create_colloqium as create_colloqium_service,
    delete_colloqium as delete_colloqium_service,
    list_colloqiums as list_colloqiums_service,
    update_colloqium as update_colloqium_service,
)
from ..models import User
from ..schemas import ColloqiumCreate, ColloqiumResponse, ColloqiumUpdate

router = APIRouter(prefix="/colloqiums", tags=["colloqiums"])


@router.get("/", response_model=list[ColloqiumResponse])
def list_colloqiums(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.colloquiums")),
):
    return list_colloqiums_service(db)


@router.post("/", response_model=ColloqiumResponse, status_code=201)
def create_colloqium(
    payload: ColloqiumCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    return create_colloqium_service(payload=payload, changed_by_id=current_user.id, db=db)


@router.patch("/{colloqium_id}", response_model=ColloqiumResponse)
def update_colloqium(
    colloqium_id: int,
    payload: ColloqiumUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    return update_colloqium_service(
        colloqium_id=colloqium_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{colloqium_id}", status_code=204)
def delete_colloqium(
    colloqium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    delete_colloqium_service(colloqium_id=colloqium_id, db=db)
