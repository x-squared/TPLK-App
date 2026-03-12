from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...models import AccessPermission, Code
from ...schemas import AccessControlMatrixResponse, AccessPermissionResponse, CodeResponse, RolePermissionsUpdate


def get_access_control_matrix(*, db: Session) -> AccessControlMatrixResponse:
    roles = (
        db.query(Code)
        .filter(Code.type == "ROLE")
        .order_by(Code.pos.asc(), Code.name_default.asc())
        .all()
    )
    permissions = (
        db.query(AccessPermission)
        .order_by(AccessPermission.key.asc())
        .all()
    )
    role_permissions = {
        role.key: sorted(permission.key for permission in (role.permissions or []))
        for role in roles
    }
    return AccessControlMatrixResponse(
        roles=[CodeResponse.model_validate(role) for role in roles],
        permissions=[AccessPermissionResponse.model_validate(permission) for permission in permissions],
        role_permissions=role_permissions,
    )


def update_role_permissions(*, role_key: str, payload: RolePermissionsUpdate, db: Session) -> AccessControlMatrixResponse:
    role = db.query(Code).filter(Code.type == "ROLE", Code.key == role_key).first()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.key == "ADMIN" and "view.admin" not in payload.permission_keys:
        raise HTTPException(status_code=400, detail="ADMIN must keep view.admin permission")

    unique_permission_keys = list(dict.fromkeys(payload.permission_keys))
    permissions = db.query(AccessPermission).filter(AccessPermission.key.in_(unique_permission_keys)).all()
    permission_keys_found = {permission.key for permission in permissions}
    missing = [key for key in unique_permission_keys if key not in permission_keys_found]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown permission keys: {', '.join(missing)}")

    role.permissions = permissions
    db.add(role)
    db.commit()

    return get_access_control_matrix(db=db)
