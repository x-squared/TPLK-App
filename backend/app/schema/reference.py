from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CodeBase(BaseModel):
    type: str
    key: str
    pos: int
    ext_sys: str = ""
    ext_key: str = ""
    name_default: str = ""


class CodeCreate(CodeBase):
    pass


class CodeResponse(CodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class UserBase(BaseModel):
    ext_id: str
    name: str
    role_id: int | None = None
    role_ids: list[int] = []
    permissions: list[str] = []


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    role: CodeResponse | None = None
    roles: list[CodeResponse] = []


class CatalogueBase(BaseModel):
    type: str
    key: str
    pos: int
    ext_sys: str = ""
    ext_key: str = ""
    name_default: str = ""
    name_en: str = ""
    name_de: str = ""


class CatalogueCreate(CatalogueBase):
    pass


class CatalogueResponse(CatalogueBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CatalogueUpdate(BaseModel):
    pos: int | None = None
    ext_sys: str | None = None
    ext_key: str | None = None
    name_default: str | None = None
    name_en: str | None = None
    name_de: str | None = None


class CatalogueTypeSummaryResponse(BaseModel):
    type: str
    item_count: int
