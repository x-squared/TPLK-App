from __future__ import annotations

import uuid
import webbrowser
from typing import TYPE_CHECKING

from ..shared import ensure_appmodules_pythonpath
from .dto import ConditionDto, PatientDto
from .provider_base import ProviderClient, ProviderErrored, ProviderPending, ProviderReady, ProviderResult

if TYPE_CHECKING:
    from mock_operation_store import FileBackedMockOperationStore


class MockFormProviderClient(ProviderClient):
    """In-memory delayed provider used while manual web-form mocks are filled."""

    def __init__(self, *, ui_base_url: str, auto_open_form: bool = False, store_path: str | None = None) -> None:
        ensure_appmodules_pythonpath()
        from mock_operation_store import FileBackedMockOperationStore

        self._ui_base_url = ui_base_url.rstrip("/")
        self._auto_open_form = auto_open_form
        self._store: FileBackedMockOperationStore = FileBackedMockOperationStore(store_path=store_path)

    def _make_key(self, *, operation_type: str, patient_id: str, date_from: str | None = None, date_to: str | None = None) -> str:
        return f"{operation_type}|{patient_id}|{date_from or ''}|{date_to or ''}"

    def _schema_for_operation(self, operation_type: str) -> dict:
        def with_patient_enum_hints(schema: dict) -> dict:
            defs = schema.get("$defs")
            if isinstance(defs, dict):
                communication = defs.get("CommunicationDto")
                if isinstance(communication, dict):
                    props = communication.get("properties")
                    if isinstance(props, dict):
                        comm_type = props.get("communicationType")
                        if isinstance(comm_type, dict):
                            comm_type["enum"] = [
                                "PHONE",
                                "EMAIL",
                                "FAX",
                                "PAGER",
                                "URL",
                                "SMS",
                            ]
                        use = props.get("use")
                        if isinstance(use, dict):
                            use["enum"] = [
                                "WORK",
                                "PRIVATE",
                                "HOME",
                                "TEMP",
                                "OLD",
                                "HOLIDAY",
                                "MOBILE",
                                "OTHER",
                            ]
            props = schema.get("properties")
            if isinstance(props, dict):
                gender = props.get("gender")
                if isinstance(gender, dict):
                    gender["enum"] = ["male", "female", "diverse", "other", "unknown"]
            return schema

        def with_condition_enum_hints(schema: dict) -> dict:
            props = schema.get("properties")
            if isinstance(props, dict):
                clinical_status = props.get("clinicalStatus")
                if isinstance(clinical_status, dict):
                    clinical_status["enum"] = ["active", "recurrence", "relapse", "inactive", "remission", "resolved"]
                verification_status = props.get("verificationStatus")
                if isinstance(verification_status, dict):
                    verification_status["enum"] = [
                        "unconfirmed",
                        "provisional",
                        "differential",
                        "confirmed",
                        "refuted",
                        "entered-in-error",
                    ]
            return schema

        if operation_type == "patient":
            return with_patient_enum_hints(PatientDto.model_json_schema())
        return {
            "type": "array",
            "items": with_condition_enum_hints(ConditionDto.model_json_schema()),
        }

    def _sample_payload_for_operation(self, operation_type: str, patient_id: str) -> dict | list:
        if operation_type == "patient":
            return {
                "id": patient_id,
                "resourceType": "Patient",
                "resourceName": "Patient",
                "ehrId": "123456",
                "communications": [],
                "addresses": [],
            }
        return [
            {
                "id": "cnd_sample_1",
                "resourceType": "Condition",
                "resourceName": "Condition",
                "patientId": patient_id,
            }
        ]

    def _pending_for_key(self, *, key: str, operation_type: str, patient_id: str) -> ProviderPending:
        operation_id = str(uuid.uuid4())
        form_url = f"{self._ui_base_url}/{operation_id}/form"
        op = self._store.create_or_get_pending(
            key=key,
            operation_id=operation_id,
            operation_type=operation_type,
            schema=self._schema_for_operation(operation_type),
            sample_payload=self._sample_payload_for_operation(operation_type, patient_id),
            form_url=form_url,
        )
        resolved_operation_id = str(op["operation_id"])
        resolved_form_url = str(op.get("form_url") or f"{self._ui_base_url}/{resolved_operation_id}/form")
        if self._auto_open_form and op["status"] == "pending":
            webbrowser.open(resolved_form_url)
        if op["status"] == "ready":
            return ProviderPending(
                operation_id=resolved_operation_id,
                operation_type=operation_type,
                retry_after_seconds=0,
                form_url=resolved_form_url,
            )
        return ProviderPending(
            operation_id=resolved_operation_id,
            operation_type=operation_type,
            form_url=resolved_form_url,
        )

    def _resolve(self, pending: ProviderPending) -> ProviderResult:
        op = self._store.get(operation_id=pending.operation_id)
        if op and op["status"] == "ready":
            return ProviderReady(payload=op["payload"])
        if op and op["status"] in {"errored", "cancelled"}:
            return ProviderErrored(
                status_code=int(op["status_code"] or 500),
                error_code=str(op["error_code"] or "MOCK_ERROR"),
                detail=str(op["error_detail"] or "Mock provider returned error"),
            )
        return pending

    def get_patient(self, *, patient_id: str, timeout_ms: int) -> ProviderResult:  # noqa: ARG002
        pending = self._pending_for_key(
            key=self._make_key(operation_type="patient", patient_id=patient_id),
            operation_type="patient",
            patient_id=patient_id,
        )
        return self._resolve(pending)

    def list_conditions(
        self,
        *,
        patient_id: str,
        date_from: str | None,
        date_to: str | None,
        timeout_ms: int,  # noqa: ARG002
    ) -> ProviderResult:
        pending = self._pending_for_key(
            key=self._make_key(
                operation_type="conditions",
                patient_id=patient_id,
                date_from=date_from,
                date_to=date_to,
            ),
            operation_type="conditions",
            patient_id=patient_id,
        )
        return self._resolve(pending)

    def complete_mock_operation(self, *, operation_id: str, payload: dict | list) -> bool:
        return self._store.complete(operation_id=operation_id, payload=payload)

    def fail_mock_operation(self, *, operation_id: str, status_code: int, error_code: str, detail: str) -> bool:
        return self._store.fail(
            operation_id=operation_id,
            status_code=status_code,
            error_code=error_code,
            detail=detail,
        )

    def get_mock_operation(self, *, operation_id: str) -> dict | None:
        operation = self._store.get(operation_id=operation_id)
        if not operation:
            return None
        if not operation.get("form_url"):
            operation["form_url"] = f"{self._ui_base_url}/{operation_id}/form"
        return operation

    def list_mock_operations(self) -> list[dict]:
        operations = self._store.list()
        for operation in operations:
            operation_id = str(operation.get("operation_id") or "")
            if operation_id and not operation.get("form_url"):
                operation["form_url"] = f"{self._ui_base_url}/{operation_id}/form"
        return operations

    def cancel_mock_operation(self, *, operation_id: str) -> bool:
        return self._store.cancel(operation_id=operation_id)

    def delete_mock_operation(self, *, operation_id: str) -> bool:
        return self._store.delete(operation_id=operation_id)

    def clear_closed_mock_operations(self) -> int:
        return self._store.clear_closed()
