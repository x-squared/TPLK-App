from __future__ import annotations

import unittest
from unittest.mock import patch
import os
import tempfile

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from app.features.interfaces.patients_client import service as patient_service
from app.features.interfaces.patients_client.dto import ConditionDto, PatientDto
from app.features.interfaces.patients_client.provider import HttpProviderClient
from app.features.interfaces.patients_client.mapper import InterfacePayloadValidationError, from_api_conditions, from_api_patient
from app.features.interfaces.patients_client.results import PendingResult, ReadyResult
from app.routers.patient_interface import (
    _to_http_response,
    cancel_patient_interface_mock_operation,
    clear_done_patient_interface_mock_operations,
    list_patient_interface_mock_operations,
    remove_patient_interface_mock_operation,
    trigger_patient_interface_mock_conditions_operation,
    trigger_patient_interface_mock_patient_operation,
    MockTriggerConditionsRequest,
    MockTriggerPatientRequest,
)


class PatientInterfaceMapperTests(unittest.TestCase):
    def test_patient_mapper_success(self) -> None:
        dto = from_api_patient({"id": "pat_1", "resourceName": "Patient", "ehrId": "123"})
        self.assertEqual(dto.id, "pat_1", "Patient mapper should parse minimal required patient payload.")

    def test_patient_mapper_validation_error(self) -> None:
        with self.assertRaises(InterfacePayloadValidationError):
            from_api_patient({"id": "pat_1"})

    def test_conditions_mapper_success(self) -> None:
        dtos = from_api_conditions(
            [{"id": "c1", "resourceName": "Condition", "patientId": "pat_1"}]
        )
        self.assertEqual(len(dtos), 1, "Conditions mapper should parse list payload entries into DTOs.")


class PatientInterfacePendingLifecycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self._original_store_file = os.environ.get("TPL_PATIENT_INTERFACE_MOCK_STORE_FILE")
        os.environ["TPL_PATIENT_INTERFACE_MOCK_STORE_FILE"] = f"{self._tmpdir.name}/mock-ops.json"
        patient_service.get_provider.cache_clear()

    def tearDown(self) -> None:
        patient_service.get_provider.cache_clear()
        if self._original_store_file is None:
            os.environ.pop("TPL_PATIENT_INTERFACE_MOCK_STORE_FILE", None)
        else:
            os.environ["TPL_PATIENT_INTERFACE_MOCK_STORE_FILE"] = self._original_store_file
        self._tmpdir.cleanup()

    def test_mock_provider_forced_off_outside_dev(self) -> None:
        class _Cfg:
            env = "PROD"

        with (
            patch("app.features.interfaces.patients_client.service.get_config", return_value=_Cfg()),
            patch("app.features.interfaces.patients_client.service._provider_kind_from_env", return_value="mock_form"),
        ):
            provider = patient_service.get_provider()
            self.assertIsInstance(
                provider,
                HttpProviderClient,
                "Outside DEV, provider selection should force HTTP mode even if mock is requested.",
            )

    def test_mock_provider_pending_then_ready(self) -> None:
        with patch("app.features.interfaces.patients_client.service._provider_kind_from_env", return_value="mock_form"):
            pending = patient_service.get_patient(patient_id="pat_7")
            self.assertIsInstance(pending, PendingResult, "First mock call should return pending operation.")
            operation_id = pending.operation.operation_id
            self.assertTrue(
                bool(pending.operation.form_url),
                "Pending mock operation should expose a form URL for interactive completion.",
            )

            applied = patient_service.complete_mock_operation(
                operation_id=operation_id,
                payload={"id": "pat_7", "resourceName": "Patient", "ehrId": "777"},
            )
            self.assertTrue(applied, "Completing existing mock operation should succeed.")

            ready = patient_service.get_patient(patient_id="pat_7")
            self.assertIsInstance(ready, ReadyResult, "Subsequent call should return ready result after completion.")
            self.assertEqual(
                ready.data.id,
                "pat_7",
                "Ready patient DTO should contain the payload completed via mock operation endpoint.",
            )

    def test_mock_provider_pending_then_error(self) -> None:
        with patch("app.features.interfaces.patients_client.service._provider_kind_from_env", return_value="mock_form"):
            pending = patient_service.get_patient(patient_id="pat_error")
            self.assertIsInstance(pending, PendingResult, "Initial mock call should return pending operation.")
            operation_id = pending.operation.operation_id

            applied = patient_service.fail_mock_operation(
                operation_id=operation_id,
                status_code=503,
                error_code="UPSTREAM_UNAVAILABLE",
                detail="Mocked upstream unavailable.",
            )
            self.assertTrue(applied, "Failing existing mock operation should succeed.")

            with self.assertRaises(HTTPException):
                patient_service.get_patient(patient_id="pat_error")

    def test_list_mock_operations_contains_pending_operation(self) -> None:
        with patch("app.features.interfaces.patients_client.service._provider_kind_from_env", return_value="mock_form"):
            pending = patient_service.get_patient(patient_id="pat_list")
            self.assertIsInstance(pending, PendingResult, "Initial mock call should return pending operation.")
            operation_id = pending.operation.operation_id
            operations = patient_service.list_mock_operations()
            self.assertTrue(
                any(op.get("operation_id") == operation_id for op in operations),
                "Mock operation listing should include newly created pending operation.",
            )

    def test_mock_provider_pending_then_cancelled(self) -> None:
        with patch("app.features.interfaces.patients_client.service._provider_kind_from_env", return_value="mock_form"):
            pending = patient_service.get_patient(patient_id="pat_cancel")
            self.assertIsInstance(pending, PendingResult, "Initial mock call should return pending operation.")
            operation_id = pending.operation.operation_id
            applied = patient_service.cancel_mock_operation(operation_id=operation_id)
            self.assertTrue(applied, "Cancelling existing pending operation should succeed.")
            with self.assertRaises(HTTPException):
                patient_service.get_patient(patient_id="pat_cancel")


class PatientInterfaceRouterMappingTests(unittest.TestCase):
    def test_pending_result_maps_to_202(self) -> None:
        pending = PendingResult(
            operation=patient_service.PendingOperationDto(
                operation_id="op1",
                operation_type="patient",
                retry_after_seconds=3,
            )
        )
        response = _to_http_response(pending)
        self.assertIsInstance(response, JSONResponse, "Pending result should map to JSONResponse for 202 handling.")
        self.assertEqual(response.status_code, 202, "Pending result should map to HTTP 202.")

    def test_ready_result_maps_to_dto_payload(self) -> None:
        ready = ReadyResult(data=PatientDto(id="pat_1", resourceName="Patient", ehrId="1"))
        response = _to_http_response(ready)
        self.assertIsInstance(response, PatientDto, "Ready result should pass DTO payload through unchanged.")

    def test_ready_conditions_result_maps_to_condition_dtos(self) -> None:
        ready = ReadyResult(data=[ConditionDto(id="c1", resourceName="Condition", patientId="pat_1")])
        response = _to_http_response(ready)
        self.assertIsInstance(response, list, "Ready condition result should map to a DTO list response.")
        self.assertEqual(len(response), 1, "Ready condition result should preserve mapped DTO entries.")

    def test_mock_operations_list_route_wraps_operations(self) -> None:
        class _Cfg:
            env = "DEV"

        with (
            patch("app.routers.patient_interface.get_config", return_value=_Cfg()),
            patch("app.routers.patient_interface.list_mock_operations", return_value=[{"operation_id": "op1"}]),
        ):
            response = list_patient_interface_mock_operations()
            self.assertIsInstance(response, JSONResponse, "Mock operations list route should return JSONResponse.")
            payload = response.body.decode("utf-8")
            self.assertIn("operations", payload, "Mock operations list route should return operations wrapper.")
            self.assertIn("op1", payload, "Operations wrapper should include listed operations.")

    def test_trigger_patient_route_maps_pending_to_202(self) -> None:
        class _Cfg:
            env = "DEV"

        pending = PendingResult(
            operation=patient_service.PendingOperationDto(
                operation_id="op-patient",
                operation_type="patient",
                retry_after_seconds=3,
            )
        )
        with (
            patch("app.routers.patient_interface.get_config", return_value=_Cfg()),
            patch("app.routers.patient_interface.get_patient", return_value=pending),
        ):
            response = trigger_patient_interface_mock_patient_operation(
                MockTriggerPatientRequest(patient_id="pat_router")
            )
            self.assertIsInstance(response, JSONResponse, "Pending trigger response should map to JSONResponse.")
            self.assertEqual(response.status_code, 202, "Pending trigger response should map to 202.")

    def test_trigger_conditions_route_maps_ready_payload(self) -> None:
        class _Cfg:
            env = "DEV"

        ready = ReadyResult(data=[ConditionDto(id="c1", resourceName="Condition", patientId="pat_1")])
        with (
            patch("app.routers.patient_interface.get_config", return_value=_Cfg()),
            patch("app.routers.patient_interface.list_conditions", return_value=ready),
        ):
            response = trigger_patient_interface_mock_conditions_operation(
                MockTriggerConditionsRequest(patient_id="pat_router", date_from="2026-01-01", date_to="2026-01-31")
            )
            self.assertIsInstance(response, list, "Ready conditions trigger should return mapped DTO list.")
            self.assertEqual(len(response), 1, "Ready conditions trigger should preserve DTO list entries.")

    def test_cancel_route_returns_204_for_pending_operation(self) -> None:
        class _Cfg:
            env = "DEV"

        with (
            patch("app.routers.patient_interface.get_config", return_value=_Cfg()),
            patch("app.routers.patient_interface.cancel_mock_operation", return_value=True),
        ):
            response = cancel_patient_interface_mock_operation("op-cancel")
            self.assertIsNone(response, "Cancel endpoint should return empty 204 response body.")

    def test_remove_and_clear_done_routes(self) -> None:
        class _Cfg:
            env = "DEV"

        with (
            patch("app.routers.patient_interface.get_config", return_value=_Cfg()),
            patch("app.routers.patient_interface.delete_mock_operation", return_value=True),
            patch("app.routers.patient_interface.clear_closed_mock_operations", return_value=3),
        ):
            remove_response = remove_patient_interface_mock_operation("op-remove")
            self.assertIsNone(remove_response, "Remove endpoint should return empty 204 response body.")
            clear_response = clear_done_patient_interface_mock_operations()
            self.assertEqual(clear_response.get("cleared_count"), 3, "Clear done endpoint should report removed count.")


if __name__ == "__main__":
    unittest.main()
