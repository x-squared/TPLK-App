from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator

from .clinical_episodes import (
    EpisodeBase,
    EpisodeCancelRequest,
    EpisodeCloseRequest,
    EpisodeCreate,
    EpisodeListResponse,
    EpisodeOrganBase,
    EpisodeOrganCreate,
    EpisodeOrganResponse,
    EpisodeOrganUpdate,
    EpisodeRejectRequest,
    EpisodeResponse,
    EpisodeStartListingRequest,
    EpisodeUpdate,
)
from .clinical_medical_values import (
    DatatypeDefinitionBase,
    DatatypeDefinitionResponse,
    MedicalValueBase,
    MedicalValueCreate,
    MedicalValueGroupBase,
    MedicalValueGroupContextTemplateBase,
    MedicalValueGroupContextTemplateResponse,
    MedicalValueGroupResponse,
    MedicalValueGroupTemplateBase,
    MedicalValueGroupTemplateResponse,
    MedicalValueGroupTemplateUpdate,
    MedicalValueResponse,
    MedicalValueTemplateBase,
    MedicalValueTemplateContextTemplateBase,
    MedicalValueTemplateContextTemplateResponse,
    MedicalValueTemplateCreate,
    MedicalValueTemplateResponse,
    MedicalValueUpdate,
)
from .reference import CatalogueResponse, CodeResponse, UserResponse


class DiagnosisBase(BaseModel):
    patient_id: int
    catalogue_id: int
    comment: str = ""
    is_main: bool = False


class DiagnosisCreate(BaseModel):
    catalogue_id: int
    comment: str = ""
    is_main: bool = False


class DiagnosisUpdate(BaseModel):
    catalogue_id: int | None = None
    comment: str | None = None
    is_main: bool | None = None


class DiagnosisResponse(DiagnosisBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    catalogue: CatalogueResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class AbsenceBase(BaseModel):
    patient_id: int
    start: date
    end: date
    comment: str = ""


class AbsenceCreate(BaseModel):
    start: date
    end: date
    comment: str = ""

    @model_validator(mode="after")
    def end_not_before_start(self):
        if self.end < self.start:
            raise ValueError("end must be equal to or after start")
        return self


class AbsenceUpdate(BaseModel):
    start: date | None = None
    end: date | None = None
    comment: str | None = None

    @model_validator(mode="after")
    def end_not_before_start(self):
        if self.start is not None and self.end is not None and self.end < self.start:
            raise ValueError("end must be equal to or after start")
        return self


class AbsenceResponse(AbsenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class ContactInfoBase(BaseModel):
    patient_id: int
    type_id: int
    data: str
    comment: str = ""
    main: bool = False
    pos: int = 0


class ContactInfoCreate(BaseModel):
    type_id: int
    data: str
    comment: str = ""
    main: bool = False


class ContactInfoUpdate(BaseModel):
    type_id: int | None = None
    data: str | None = None
    comment: str | None = None
    main: bool | None = None
    pos: int | None = None


class ContactInfoResponse(ContactInfoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: CodeResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


