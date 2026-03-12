from pydantic import BaseModel, ConfigDict

from .reference import CodeResponse


class AccessPermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name_default: str


class AccessControlMatrixResponse(BaseModel):
    roles: list[CodeResponse]
    permissions: list[AccessPermissionResponse]
    role_permissions: dict[str, list[str]]


class RolePermissionsUpdate(BaseModel):
    permission_keys: list[str]
