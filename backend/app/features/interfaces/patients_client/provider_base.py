from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderReady:
    payload: dict | list


@dataclass(frozen=True)
class ProviderPending:
    operation_id: str
    operation_type: str
    retry_after_seconds: int = 3
    form_url: str | None = None


@dataclass(frozen=True)
class ProviderErrored:
    status_code: int
    error_code: str
    detail: str


ProviderResult = ProviderReady | ProviderPending | ProviderErrored


class ProviderClient(ABC):
    @abstractmethod
    def get_patient(self, *, patient_id: str, timeout_ms: int) -> ProviderResult: ...

    @abstractmethod
    def list_conditions(
        self,
        *,
        patient_id: str,
        date_from: str | None,
        date_to: str | None,
        timeout_ms: int,
    ) -> ProviderResult: ...

    @abstractmethod
    def complete_mock_operation(self, *, operation_id: str, payload: dict | list) -> bool: ...

    @abstractmethod
    def fail_mock_operation(self, *, operation_id: str, status_code: int, error_code: str, detail: str) -> bool: ...

    @abstractmethod
    def get_mock_operation(self, *, operation_id: str) -> dict | None: ...

    @abstractmethod
    def list_mock_operations(self) -> list[dict]: ...

    @abstractmethod
    def cancel_mock_operation(self, *, operation_id: str) -> bool: ...

    @abstractmethod
    def delete_mock_operation(self, *, operation_id: str) -> bool: ...

    @abstractmethod
    def clear_closed_mock_operations(self) -> int: ...
