from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator

from .reference import CodeResponse, UserResponse


class EpisodeBase(BaseModel):
    patient_id: int
    organ_id: int
    start: date | None = None
    end: date | None = None
    fall_nr: str = ""
    status_id: int | None = None
    phase_id: int | None = None
    closed: bool = False
    comment: str = ""
    cave: str = ""
    eval_start: date | None = None
    eval_end: date | None = None
    eval_assigned_to: str = ""
    eval_stat: str = ""
    eval_register_date: date | None = None
    eval_excluded: bool = False
    eval_non_list_sent: date | None = None
    list_start: date | None = None
    list_end: date | None = None
    list_rs_nr: str = ""
    list_reason_delist: str = ""
    list_expl_delist: str = ""
    list_delist_sent: date | None = None
    tpl_date: date | None = None
    fup_recipient_card_done: bool = False
    fup_recipient_card_date: date | None = None


class EpisodeCreate(BaseModel):
    organ_id: int | None = None
    organ_ids: list[int] | None = None
    start: date | None = None
    end: date | None = None
    fall_nr: str = ""
    status_id: int | None = None
    phase_id: int | None = None
    closed: bool = False
    comment: str = ""
    cave: str = ""
    eval_start: date | None = None
    eval_end: date | None = None
    eval_assigned_to: str = ""
    eval_stat: str = ""
    eval_register_date: date | None = None
    eval_excluded: bool = False
    eval_non_list_sent: date | None = None
    list_start: date | None = None
    list_end: date | None = None
    list_rs_nr: str = ""
    list_reason_delist: str = ""
    list_expl_delist: str = ""
    list_delist_sent: date | None = None
    tpl_date: date | None = None
    fup_recipient_card_done: bool = False
    fup_recipient_card_date: date | None = None

    @model_validator(mode="after")
    def closed_requires_end(self):
        if self.closed and not self.end:
            raise ValueError("closed can only be true if end date is set")
        has_single = self.organ_id is not None
        has_multi = bool(self.organ_ids)
        if not has_single and not has_multi:
            raise ValueError("organ_id or organ_ids is required")
        if self.organ_ids is not None and len(self.organ_ids) == 0:
            raise ValueError("organ_ids cannot be empty")
        return self


class EpisodeUpdate(BaseModel):
    organ_id: int | None = None
    organ_ids: list[int] | None = None
    start: date | None = None
    end: date | None = None
    fall_nr: str | None = None
    status_id: int | None = None
    phase_id: int | None = None
    closed: bool | None = None
    comment: str | None = None
    cave: str | None = None
    eval_start: date | None = None
    eval_end: date | None = None
    eval_assigned_to: str | None = None
    eval_stat: str | None = None
    eval_register_date: date | None = None
    eval_excluded: bool | None = None
    eval_non_list_sent: date | None = None
    list_start: date | None = None
    list_end: date | None = None
    list_rs_nr: str | None = None
    list_reason_delist: str | None = None
    list_expl_delist: str | None = None
    list_delist_sent: date | None = None
    tpl_date: date | None = None
    fup_recipient_card_done: bool | None = None
    fup_recipient_card_date: date | None = None


class EpisodeStartListingRequest(BaseModel):
    start: date


class EpisodeCloseRequest(BaseModel):
    end: date


class EpisodeRejectRequest(BaseModel):
    end: date | None = None
    reason: str = ""


class EpisodeCancelRequest(BaseModel):
    end: date | None = None
    reason: str = ""


class EpisodeOrganBase(BaseModel):
    episode_id: int
    organ_id: int
    date_added: date | None = None
    comment: str = ""
    is_active: bool = True
    date_inactivated: date | None = None
    reason_activation_change: str = ""


class EpisodeOrganCreate(BaseModel):
    organ_id: int
    date_added: date | None = None
    comment: str = ""
    reason_activation_change: str = ""


class EpisodeOrganUpdate(BaseModel):
    date_added: date | None = None
    comment: str | None = None
    is_active: bool | None = None
    date_inactivated: date | None = None
    reason_activation_change: str | None = None


class EpisodeOrganResponse(EpisodeOrganBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organ: CodeResponse | None = None


class EpisodeResponse(EpisodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organ: CodeResponse | None = None
    organ_ids: list[int] = []
    organs: list[CodeResponse] = []
    episode_organs: list[EpisodeOrganResponse] = []
    status: CodeResponse | None = None
    phase: CodeResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class EpisodeListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    organ_id: int
    organ: CodeResponse | None = None
    organs: list[CodeResponse] = []
    start: date | None = None
    end: date | None = None
    fall_nr: str = ""
    status_id: int | None = None
    status: CodeResponse | None = None
    phase_id: int | None = None
    phase: CodeResponse | None = None
    closed: bool = False
    tpl_date: date | None = None
    list_rs_nr: str = ""
