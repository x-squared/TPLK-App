from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..features.admin_access import (
    get_access_control_matrix as get_access_control_matrix_service,
    update_role_permissions as update_role_permissions_service,
)
from ..models import User
from ..schemas import AccessControlMatrixResponse, RolePermissionsUpdate

router = APIRouter(prefix="/admin/access", tags=["admin_access"])


@router.get("/matrix", response_model=AccessControlMatrixResponse)
def get_access_control_matrix(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return get_access_control_matrix_service(db=db)


@router.put("/roles/{role_key}", response_model=AccessControlMatrixResponse)
def update_role_permissions(
    role_key: str,
    payload: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return update_role_permissions_service(role_key=role_key, payload=payload, db=db)
