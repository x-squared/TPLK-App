from __future__ import annotations

import unittest
from unittest.mock import patch

from app.features.interfaces.patients_client.provider import HttpProviderClient


class PatientInterfaceClientTests(unittest.TestCase):
    def test_http_provider_get_patient_uses_sync_runtime(self) -> None:
        """Verify HTTP provider delegates patient fetch through shared sync runtime."""
        seen: dict[str, object] = {}

        def fake_execute_sync_call(*, endpoint, call_fn, timeout_ms, max_attempts, idempotent):  # noqa: ANN001
            seen["endpoint"] = endpoint
            seen["timeout_ms"] = timeout_ms
            seen["max_attempts"] = max_attempts
            seen["idempotent"] = idempotent
            return call_fn(0.25)

        def fake_fetch_json(*, url: str, timeout_seconds: float):  # noqa: ANN001
            seen["url"] = url
            seen["timeout_seconds"] = timeout_seconds
            return {"id": "pat_1", "resourceName": "Patient", "ehrId": "1"}

        with (
            patch("app.features.interfaces.patients_client.http_provider.execute_sync_call", fake_execute_sync_call),
            patch("app.features.interfaces.patients_client.http_provider._fetch_json", fake_fetch_json),
        ):
            provider = HttpProviderClient(base_url="https://sys.example")
            result = provider.get_patient(patient_id="pat_1", timeout_ms=3000)

        self.assertEqual(result.payload["id"], "pat_1", "Provider should return fetched patient payload.")
        self.assertEqual(
            seen["endpoint"],
            "/patients/pat_1",
            "Provider should call the patient-by-id interface endpoint.",
        )
        self.assertTrue(seen["idempotent"], "Read-only patient calls should be idempotent for retry safety.")

    def test_http_provider_list_conditions_builds_date_query(self) -> None:
        """Verify HTTP provider maps date filters into the conditions query endpoint."""
        seen: dict[str, object] = {}

        def fake_execute_sync_call(*, endpoint, call_fn, timeout_ms, max_attempts, idempotent):  # noqa: ANN001
            seen["endpoint"] = endpoint
            return call_fn(0.3)

        def fake_fetch_json(*, url: str, timeout_seconds: float):  # noqa: ANN001
            seen["url"] = url
            return [{"id": "cnd_1"}, {"id": "cnd_2"}, "skip-me"]

        with (
            patch("app.features.interfaces.patients_client.http_provider.execute_sync_call", fake_execute_sync_call),
            patch("app.features.interfaces.patients_client.http_provider._fetch_json", fake_fetch_json),
        ):
            provider = HttpProviderClient(base_url="https://sys.example")
            result = provider.list_conditions(
                patient_id="pat_7",
                date_from="2026-01-01",
                date_to="2026-01-31",
                timeout_ms=3000,
            )

        self.assertEqual(
            seen["endpoint"],
            "/patients/pat_7/conditions?dateFrom=2026-01-01&dateTo=2026-01-31",
            "Provider should include both dateFrom and dateTo query parameters.",
        )
        self.assertEqual(
            len(result.payload),
            3,
            "Provider should return list payload entries as fetched without business filtering.",
        )


if __name__ == "__main__":
    unittest.main()
