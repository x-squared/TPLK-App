from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_user_permission_keys, require_permission
from ..database import get_db
from ..features.information import (
    create_information as create_information_service,
    delete_information as delete_information_service,
    list_information as list_information_service,
    mark_information_read as mark_information_read_service,
    update_information as update_information_service,
)
from ..models import User
from ..schemas import InformationCreate, InformationResponse, InformationUpdate

router = APIRouter(prefix="/information", tags=["information"])


@router.get("/", response_model=list[InformationResponse])
def list_information(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view.information")),
):
    return list_information_service(db=db, current_user_id=current_user.id)


@router.post("/", response_model=InformationResponse, status_code=201)
def create_information(
    payload: InformationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.information")),
):
    return create_information_service(payload=payload, db=db, current_user_id=current_user.id)


@router.patch("/{information_id}", response_model=InformationResponse)
def update_information(
    information_id: int,
    payload: InformationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.information")),
):
    permissions = set(get_user_permission_keys(db, current_user))
    return update_information_service(
        information_id=information_id,
        payload=payload,
        db=db,
        current_user_id=current_user.id,
        current_user_is_admin="view.admin" in permissions,
    )


@router.delete("/{information_id}", status_code=204)
def delete_information(
    information_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.information")),
):
    permissions = set(get_user_permission_keys(db, current_user))
    delete_information_service(
        information_id=information_id,
        db=db,
        current_user_id=current_user.id,
        current_user_is_admin="view.admin" in permissions,
    )


@router.post("/{information_id}/mark-read", response_model=InformationResponse)
def mark_information_read(
    information_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view.information")),
):
    return mark_information_read_service(
        information_id=information_id,
        current_user_id=current_user.id,
        db=db,
    )
