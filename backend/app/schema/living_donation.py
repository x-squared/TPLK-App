from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from .reference import CodeResponse, UserResponse


class LivingDonationPatientRefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pid: str
    first_name: str
    name: str


class LivingDonationRecipientEpisodeRefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    fall_nr: str = ""
    start: date | None = None
    end: date | None = None
    patient: LivingDonationPatientRefResponse | None = None


class LivingDonationDonorBase(BaseModel):
    living_donation_episode_id: int
    donor_patient_id: int
    relation_id: int | None = None
    status_id: int
    comment: str = ""


class LivingDonationDonorCreate(BaseModel):
    donor_patient_id: int
    relation_id: int | None = None
    status_id: int | None = None
    comment: str = ""


class LivingDonationDonorUpdate(BaseModel):
    relation_id: int | None = None
    status_id: int | None = None
    comment: str | None = None


class LivingDonationDonorResponse(LivingDonationDonorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    donor_patient: LivingDonationPatientRefResponse | None = None
    relation: CodeResponse | None = None
    status: CodeResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class LivingDonationEpisodeBase(BaseModel):
    recipient_episode_id: int | None = None
    start: date | None = None
    end: date | None = None
    comment: str = ""


class LivingDonationEpisodeCreate(BaseModel):
    recipient_episode_id: int | None = None
    organ_ids: list[int] | None = None
    start: date | None = None
    end: date | None = None
    comment: str = ""


class LivingDonationEpisodeUpdate(BaseModel):
    recipient_episode_id: int | None = None
    organ_ids: list[int] | None = None
    start: date | None = None
    end: date | None = None
    comment: str | None = None


class LivingDonationEpisodeCloseRequest(BaseModel):
    end: date


class LivingDonationEpisodeResponse(LivingDonationEpisodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organ_ids: list[int] = []
    organs: list[CodeResponse] = []
    recipient_episode: LivingDonationRecipientEpisodeRefResponse | None = None
    donors: list[LivingDonationDonorResponse] = []
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None
