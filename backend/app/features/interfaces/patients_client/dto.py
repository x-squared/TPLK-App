from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CommunicationDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    communicationType: str
    use: str
    value: str


class AddressDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country: str | None = None
    city: str | None = None
    state: str | None = None
    postalCode: str | None = None
    street: str | None = None
    addressSupplement: str | None = None


class PatientDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    resourceType: str = "Patient"
    resourceName: str
    ehrId: str
    ahvNumber: str | None = None
    gender: str | None = None
    name: str | None = None
    surname: str | None = None
    birthdate: str | None = None
    deceased: bool | None = None
    addresses: list[AddressDto] = Field(default_factory=list)
    communications: list[CommunicationDto] = Field(default_factory=list)


class CodingDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    system: str
    code: str
    display: str | None = None
    version: str | None = None


class ConditionDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    resourceType: str = "Condition"
    resourceName: str
    patientId: str
    clinicalStatus: str | None = None
    verificationStatus: str | None = None
    diagnosis: str | None = None
    notes: str | None = None
    classifications: list[CodingDto] = Field(default_factory=list)
    severity: str | None = None
    bodySites: list[CodingDto] = Field(default_factory=list)
    stagings: list[CodingDto] = Field(default_factory=list)
    onsetDate: str | None = None
    abatementDate: str | None = None
    recordedDate: str | None = None
    encounterId: str | None = None
    clinicalCaseId: str | None = None
    recordingPractitionerId: str | None = None
    assertingPractitionerId: str | None = None


class PendingOperationDto(BaseModel):
    operation_id: str
    status: str = "pending"
    operation_type: str
    retry_after_seconds: int = 3
    form_url: str | None = None
