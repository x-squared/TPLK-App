from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .reference import CodeResponse, UserResponse


class InformationBase(BaseModel):
    context_id: int | None = None
    context_ids: list[int] = Field(default_factory=list)
    text: str
    author_id: int
    date: dt.date
    valid_from: dt.date

    @field_validator("text")
    @classmethod
    def _validate_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("text must not be empty")
        if len(trimmed) > 1024:
            raise ValueError("text must be at most 1024 characters")
        return trimmed


class InformationCreate(InformationBase):
    pass


class InformationUpdate(BaseModel):
    context_id: int | None = None
    context_ids: list[int] | None = None
    text: str | None = None
    author_id: int | None = None
    date: dt.date | None = None
    valid_from: dt.date | None = None

    @field_validator("text")
    @classmethod
    def _validate_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("text must not be empty")
        if len(trimmed) > 1024:
            raise ValueError("text must be at most 1024 characters")
        return trimmed


class InformationResponse(InformationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    context: CodeResponse | None = None
    contexts: list[CodeResponse] = []
    author: UserResponse | None = None
    current_user_read_at: dt.datetime | None = None
    withdrawn: bool = False
    has_reads: bool = False
