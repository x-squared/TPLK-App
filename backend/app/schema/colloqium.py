from __future__ import annotations

from datetime import date as dt_date, datetime

from pydantic import BaseModel, ConfigDict, Field

from .clinical import EpisodeResponse
from .person import PersonResponse
from .reference import CodeResponse, UserResponse


class ColloqiumTypeBase(BaseModel):
    name: str
    organ_id: int
    participants: str = ""
    participant_ids: list[int] = []


class ColloqiumTypeCreate(ColloqiumTypeBase):
    pass


class ColloqiumTypeUpdate(BaseModel):
    name: str | None = None
    organ_id: int | None = None
    participants: str | None = None
    participant_ids: list[int] | None = None


class ColloqiumTypeResponse(ColloqiumTypeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organ: CodeResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    participants_people: list[PersonResponse] = []
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class ColloqiumBase(BaseModel):
    colloqium_type_id: int
    date: dt_date
    participants: str = ""
    completed: bool = False
    participant_ids: list[int] = []
    signatory_ids: list[int] = []


class ColloqiumCreate(ColloqiumBase):
    pass


class ColloqiumUpdate(BaseModel):
    colloqium_type_id: int | None = None
    date: dt_date | None = None
    participants: str | None = None
    completed: bool | None = None
    participant_ids: list[int] | None = None
    signatory_ids: list[int] | None = None


class ColloqiumResponse(ColloqiumBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    colloqium_type: ColloqiumTypeResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    participants_people: list[PersonResponse] = []
    signatories_people: list[PersonResponse] = []
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class ColloqiumAgendaBase(BaseModel):
    colloqium_id: int
    episode_id: int
    presented_by_id: int | None = None
    decision: str = Field(default="", max_length=64)
    decision_reason: str = Field(default="", max_length=128)
    comment: str = Field(default="", max_length=1024)


class ColloqiumAgendaCreate(ColloqiumAgendaBase):
    pass


class ColloqiumAgendaUpdate(BaseModel):
    colloqium_id: int | None = None
    episode_id: int | None = None
    presented_by_id: int | None = None
    decision: str | None = Field(default=None, max_length=64)
    decision_reason: str | None = Field(default=None, max_length=128)
    comment: str | None = Field(default=None, max_length=1024)


class ColloqiumAgendaResponse(ColloqiumAgendaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    colloqium: ColloqiumResponse | None = None
    episode: EpisodeResponse | None = None
    presented_by_person: PersonResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None
