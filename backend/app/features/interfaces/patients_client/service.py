from __future__ import annotations

from functools import lru_cache
import os
from pathlib import Path

from fastapi import HTTPException

from ....config import get_config
from .dto import PendingOperationDto
from .mapper import from_api_conditions, from_api_patient
from .provider import HttpProviderClient, MockFormProviderClient, ProviderClient, ProviderErrored, ProviderPending, ProviderReady
from .results import PendingResult, ReadyResult


DEFAULT_TIMEOUT_MS = 3000


def _provider_kind_from_env() -> str:
    return os.getenv("TPL_PATIENT_INTERFACE_PROVIDER", "mock_form").strip().lower()


@lru_cache(maxsize=1)
def get_provider() -> ProviderClient:
    env = get_config().env.strip().upper()
    requested_kind = _provider_kind_from_env()
    kind = requested_kind if env == "DEV" else "http"
    if kind == "http":
        base_url = os.getenv("TPL_PATIENT_INTERFACE_BASE_URL", "http://localhost:8090")
        return HttpProviderClient(base_url=base_url)
    ui_base_url = os.getenv(
        "TPL_PATIENT_INTERFACE_MOCK_UI_BASE_URL",
        "http://localhost:8000/api/interfaces/patients/mock/operations",
    )
    auto_open_form = os.getenv("TPL_PATIENT_INTERFACE_MOCK_AUTO_OPEN_FORM", "0").strip() == "1"
    default_store_path = (
        Path(__file__).resolve().parents[4] / ".runtime" / "patient_interface_mock_operations.json"
    )
    store_path = os.getenv("TPL_PATIENT_INTERFACE_MOCK_STORE_FILE", str(default_store_path))
    return MockFormProviderClient(ui_base_url=ui_base_url, auto_open_form=auto_open_form, store_path=store_path)


def _map_provider_result(result: ProviderReady | ProviderPending | ProviderErrored, *, operation_type: str):
    if isinstance(result, ProviderErrored):
        raise HTTPException(
            status_code=result.status_code,
            detail={
                "error_code": result.error_code,
                "message": result.detail,
            },
        )
    if isinstance(result, ProviderPending):
        return PendingResult(
            PendingOperationDto(
                operation_id=result.operation_id,
                operation_type=result.operation_type or operation_type,
                retry_after_seconds=result.retry_after_seconds,
                form_url=result.form_url,
            )
        )
    return result


def get_patient(*, patient_id: str, timeout_ms: int = DEFAULT_TIMEOUT_MS):
    provider = get_provider()
    provider_result = provider.get_patient(patient_id=patient_id, timeout_ms=timeout_ms)
    mapped = _map_provider_result(provider_result, operation_type="patient")
    if isinstance(mapped, PendingResult):
        return mapped
    payload = mapped.payload
    if not isinstance(payload, dict):
        raise ValueError("Expected patient response object")
    return ReadyResult(from_api_patient(payload))


def list_conditions(
    *,
    patient_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
):
    provider = get_provider()
    provider_result = provider.list_conditions(
        patient_id=patient_id,
        date_from=date_from,
        date_to=date_to,
        timeout_ms=timeout_ms,
    )
    mapped = _map_provider_result(provider_result, operation_type="conditions")
    if isinstance(mapped, PendingResult):
        return mapped
    payload = mapped.payload
    if not isinstance(payload, list):
        raise ValueError("Expected condition list response")
    entries = [item for item in payload if isinstance(item, dict)]
    return ReadyResult(from_api_conditions(entries))


def complete_mock_operation(*, operation_id: str, payload: dict | list) -> bool:
    provider = get_provider()
    operation = provider.get_mock_operation(operation_id=operation_id)
    if not operation:
        return False
    operation_type = operation.get("operation_type")
    if operation_type == "patient":
        if not isinstance(payload, dict):
            raise HTTPException(status_code=422, detail="Patient mock payload must be an object")
        from_api_patient(payload)
    elif operation_type == "conditions":
        if not isinstance(payload, list):
            raise HTTPException(status_code=422, detail="Conditions mock payload must be a list")
        entries = [item for item in payload if isinstance(item, dict)]
        if len(entries) != len(payload):
            raise HTTPException(status_code=422, detail="Conditions payload entries must be objects")
        from_api_conditions(entries)
    return provider.complete_mock_operation(operation_id=operation_id, payload=payload)


def fail_mock_operation(*, operation_id: str, status_code: int, error_code: str, detail: str) -> bool:
    provider = get_provider()
    return provider.fail_mock_operation(
        operation_id=operation_id,
        status_code=status_code,
        error_code=error_code,
        detail=detail,
    )


def get_mock_operation(*, operation_id: str) -> dict | None:
    provider = get_provider()
    return provider.get_mock_operation(operation_id=operation_id)


def list_mock_operations() -> list[dict]:
    provider = get_provider()
    return provider.list_mock_operations()


def cancel_mock_operation(*, operation_id: str) -> bool:
    provider = get_provider()
    return provider.cancel_mock_operation(operation_id=operation_id)


def delete_mock_operation(*, operation_id: str) -> bool:
    provider = get_provider()
    return provider.delete_mock_operation(operation_id=operation_id)


def clear_closed_mock_operations() -> int:
    provider = get_provider()
    return provider.clear_closed_mock_operations()
