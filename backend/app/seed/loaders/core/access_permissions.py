from sqlalchemy.orm import Session

from ....models import AccessPermission, Code


def sync_access_permissions(db: Session) -> None:
    """Ensure RBAC permission catalog exists; preserve non-empty runtime role mappings."""
    from ...datasets.core.access_rules import PERMISSIONS, ROLE_PERMISSIONS

    permissions_by_key = {
        permission.key: permission
        for permission in db.query(AccessPermission).all()
    }
    for entry in PERMISSIONS:
        key = entry["key"]
        existing = permissions_by_key.get(key)
        if existing is None:
            permission = AccessPermission(**entry)
            db.add(permission)
            db.flush()
            permissions_by_key[permission.key] = permission
            continue
        # Keep labels aligned with core dataset while preserving role assignments.
        existing.name_default = entry.get("name_default", existing.name_default)

    roles = db.query(Code).filter(Code.type == "ROLE").all()
    role_by_key = {role.key: role for role in roles}
    for role_key, permission_keys in ROLE_PERMISSIONS.items():
        role = role_by_key.get(role_key)
        if role is None:
            continue
        # Preserve access rules managed in Admin UI once a role has assignments.
        if role.permissions:
            continue
        role.permissions = [
            permissions_by_key[key]
            for key in permission_keys
            if key in permissions_by_key
        ]

    db.commit()
