from __future__ import annotations

from pydantic import ValidationError

from .dto import ConditionDto, PatientDto


class InterfacePayloadValidationError(ValueError):
    """Raised when upstream payload does not satisfy the expected DTO contract."""


def from_api_patient(payload: dict) -> PatientDto:
    try:
        return PatientDto.model_validate(payload)
    except ValidationError as exc:
        raise InterfacePayloadValidationError("Invalid patient payload") from exc


def from_api_conditions(payload: list[dict]) -> list[ConditionDto]:
    mapped: list[ConditionDto] = []
    try:
        for entry in payload:
            mapped.append(ConditionDto.model_validate(entry))
    except ValidationError as exc:
        raise InterfacePayloadValidationError("Invalid conditions payload") from exc
    return mapped
