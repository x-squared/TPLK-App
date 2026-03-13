from __future__ import annotations

import json
from urllib import parse, request

from ..shared import execute_sync_call
from .provider_base import ProviderClient, ProviderReady, ProviderResult


def _fetch_json(*, url: str, timeout_seconds: float) -> dict | list:
    req = request.Request(url=url, method="GET")
    with request.urlopen(req, timeout=timeout_seconds) as response:  # noqa: S310
        payload = response.read().decode("utf-8")
    return json.loads(payload)


class HttpProviderClient(ProviderClient):
    def __init__(self, *, base_url: str) -> None:
        self._base_url = base_url.rstrip("/") + "/"

    def get_patient(self, *, patient_id: str, timeout_ms: int) -> ProviderResult:
        endpoint = f"/patients/{patient_id}"
        url = parse.urljoin(self._base_url, endpoint.lstrip("/"))
        payload = execute_sync_call(
            endpoint=endpoint,
            call_fn=lambda timeout_seconds: _fetch_json(url=url, timeout_seconds=timeout_seconds),
            timeout_ms=timeout_ms,
            max_attempts=3,
            idempotent=True,
        )
        return ProviderReady(payload=payload)

    def list_conditions(
        self,
        *,
        patient_id: str,
        date_from: str | None,
        date_to: str | None,
        timeout_ms: int,
    ) -> ProviderResult:
        query = {}
        if date_from:
            query["dateFrom"] = date_from
        if date_to:
            query["dateTo"] = date_to
        query_suffix = ("?" + parse.urlencode(query)) if query else ""
        endpoint = f"/patients/{patient_id}/conditions{query_suffix}"
        url = parse.urljoin(self._base_url, endpoint.lstrip("/"))
        payload = execute_sync_call(
            endpoint=endpoint,
            call_fn=lambda timeout_seconds: _fetch_json(url=url, timeout_seconds=timeout_seconds),
            timeout_ms=timeout_ms,
            max_attempts=3,
            idempotent=True,
        )
        return ProviderReady(payload=payload)

    def complete_mock_operation(self, *, operation_id: str, payload: dict | list) -> bool:  # noqa: ARG002
        return False

    def fail_mock_operation(self, *, operation_id: str, status_code: int, error_code: str, detail: str) -> bool:  # noqa: ARG002
        return False

    def get_mock_operation(self, *, operation_id: str) -> dict | None:  # noqa: ARG002
        return None

    def list_mock_operations(self) -> list[dict]:
        return []

    def cancel_mock_operation(self, *, operation_id: str) -> bool:  # noqa: ARG002
        return False

    def delete_mock_operation(self, *, operation_id: str) -> bool:  # noqa: ARG002
        return False

    def clear_closed_mock_operations(self) -> int:
        return 0
