from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .reference import UserResponse


class PersonBase(BaseModel):
    first_name: str
    surname: str
    user_id: str | None = None

    @field_validator("first_name", "surname")
    @classmethod
    def _validate_required_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed

    @field_validator("user_id")
    @classmethod
    def _validate_user_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if len(trimmed) > 12:
            raise ValueError("user_id must be at most 12 characters")
        return trimmed


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    first_name: str | None = None
    surname: str | None = None
    user_id: str | None = None

    @field_validator("first_name", "surname")
    @classmethod
    def _validate_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed

    @field_validator("user_id")
    @classmethod
    def _validate_optional_user_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if len(trimmed) > 12:
            raise ValueError("user_id must be at most 12 characters")
        return trimmed


class PersonResponse(PersonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class PersonTeamBase(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name must not be empty")
        return trimmed


class PersonTeamCreate(PersonTeamBase):
    member_ids: list[int] = Field(default_factory=list)


class PersonTeamUpdate(BaseModel):
    name: str | None = None

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name must not be empty")
        return trimmed


class PersonTeamMembersUpdate(BaseModel):
    member_ids: list[int]


class PersonTeamResponse(PersonTeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    members: list[PersonResponse] = Field(default_factory=list)
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class PersonTeamListResponse(PersonTeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class PersonSearchResult(BaseModel):
    items: list[PersonResponse]
