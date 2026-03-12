from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .generate_tests import PROJECT_ROOT, SPEC_ROOT
from .spec_parser import SpecCase, parse_all_specs

REPORT_DIR = PROJECT_ROOT / "qa" / "reports"


@dataclass(frozen=True)
class CaseResult:
    case_id: str
    name: str
    status: str
    message: str
    source_file: str


def _request(method: str, full_url: str) -> tuple[int, str]:
    req = urllib.request.Request(full_url, method=method)
    with urllib.request.urlopen(req, timeout=8) as response:
        body = response.read().decode("utf-8")
        return response.status, body


def _evaluate_case(case: SpecCase, base_url: str) -> CaseResult:
    url = base_url.rstrip("/") + case.path
    try:
        try:
            status, body = _request(case.method, url)
        except urllib.error.HTTPError as exc:
            status = exc.code
            body = exc.read().decode("utf-8", errors="replace")

        if status != case.expect_status:
            return CaseResult(
                case_id=case.id,
                name=case.name,
                status="FAIL",
                message=f"Unexpected HTTP status: expected {case.expect_status}, got {status}.",
                source_file=case.source_file,
            )

        for needle in case.expect_body_contains:
            if needle.lower() not in body.lower():
                return CaseResult(
                    case_id=case.id,
                    name=case.name,
                    status="FAIL",
                    message=f"Expected body to contain '{needle}'.",
                    source_file=case.source_file,
                )

        if case.expect_json_subset is not None:
            try:
                parsed = json.loads(body)
            except json.JSONDecodeError:
                return CaseResult(
                    case_id=case.id,
                    name=case.name,
                    status="FAIL",
                    message="Expected JSON response body but parsing failed.",
                    source_file=case.source_file,
                )
            for key, expected in case.expect_json_subset.items():
                if key not in parsed:
                    return CaseResult(
                        case_id=case.id,
                        name=case.name,
                        status="FAIL",
                        message=f"Missing JSON key '{key}'.",
                        source_file=case.source_file,
                    )
                if parsed[key] != expected:
                    return CaseResult(
                        case_id=case.id,
                        name=case.name,
                        status="FAIL",
                        message=f"Unexpected JSON value for '{key}'.",
                        source_file=case.source_file,
                    )

        return CaseResult(
            case_id=case.id,
            name=case.name,
            status="PASS",
            message="",
            source_file=case.source_file,
        )
    except Exception as exc:  # noqa: BLE001
        return CaseResult(
            case_id=case.id,
            name=case.name,
            status="FAIL",
            message=str(exc),
            source_file=case.source_file,
        )


def collect_case_results(scope: str | None = None) -> list[CaseResult]:
    all_cases = parse_all_specs(SPEC_ROOT)
    if scope is not None:
        all_cases = [case for case in all_cases if case.scope == scope]

    server_base = os.getenv("TPL_TEST_BACKEND_URL", "http://localhost:8000")
    client_base = os.getenv("TPL_TEST_FRONTEND_URL", "http://localhost:5173")

    results: list[CaseResult] = []
    for case in all_cases:
        base = server_base if case.scope == "server" else client_base
        results.append(_evaluate_case(case, base))
    return results


def source_link_from_report(source_file: str) -> str:
    source = Path(source_file)
    if not source.is_absolute():
        source = (PROJECT_ROOT / source).resolve()
    return os.path.relpath(source, REPORT_DIR)
