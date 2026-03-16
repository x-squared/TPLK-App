from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .generate_tests import PROJECT_ROOT, SPEC_ROOT
from .spec_parser import SpecCase, parse_all_specs

REPORT_DIR = PROJECT_ROOT / "qa" / "reports"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DEFAULT_DB_FILE = PROJECT_ROOT / "database" / "tpl_app.db"


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


def _verify_patient_in_db(pid: str) -> bool:
    db_file = Path(os.getenv("TPL_TEST_DB_FILE", str(DEFAULT_DB_FILE)))
    if not db_file.exists():
        return False
    conn = sqlite3.connect(db_file)
    try:
        cursor = conn.execute('SELECT COUNT(1) FROM "PATIENT" WHERE "PID" = ?', (pid,))
        row = cursor.fetchone()
        return bool(row and row[0] > 0)
    finally:
        conn.close()


def _run_ui_flow_case(case: SpecCase, base_url: str) -> tuple[bool, str]:
    if not isinstance(case.ui_flow, dict):
        return True, ""
    create_patient = case.ui_flow.get("create_patient")
    if not isinstance(create_patient, dict):
        return False, "ui_flow must contain a create_patient object."

    output_file = Path(tempfile.gettempdir()) / f"tpl-created-patient-{case.id}.json"
    if output_file.exists():
        output_file.unlink()

    env = {
        **dict(os.environ),
        "TPL_CREATED_PATIENT_FILE": str(output_file),
        "TPL_TEST_FRONTEND_URL": base_url.rstrip("/"),
        "TPL_SPEC_LOGIN_EXT_ID": str(case.ui_flow.get("login_ext_id") or "TKOORD"),
        "TPL_SPEC_OPEN_RECIPIENTS_VIEW": "1" if case.ui_flow.get("open_recipients_view", True) else "0",
        "TPL_SPEC_PID_PREFIX": str(create_patient.get("pid_prefix") or "AUTO"),
        "TPL_SPEC_FIRST_NAME": str(create_patient.get("first_name") or "Spec"),
        "TPL_SPEC_NAME": str(create_patient.get("name") or "Patient"),
        "TPL_SPEC_DATE_OF_BIRTH": str(create_patient.get("date_of_birth") or "1990-01-01"),
    }
    proc = subprocess.run(
        ["npm", "run", "test:spec-e2e"],
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True,
        env=env,
    )
    output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    if proc.returncode != 0:
        excerpt = output[-500:] if len(output) > 500 else output
        return False, f"ui_flow playwright execution failed. {excerpt.strip()}"

    verify = case.verify if isinstance(case.verify, dict) else {}
    created_payload: dict | None = None
    if output_file.exists():
        try:
            created_payload = json.loads(output_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return False, "ui_flow output artifact is not valid JSON."

    if bool(verify.get("database_contains_created_patient")):
        pid = str((created_payload or {}).get("pid") or "").strip()
        if not pid:
            return False, "ui_flow did not emit a created patient PID for DB verification."
        if not _verify_patient_in_db(pid):
            return False, f"ui_flow created patient PID '{pid}' was not found in database."

    if bool(verify.get("ui_contains_created_pid")) and not output_file.exists():
        return False, "ui_flow expected UI-created PID evidence, but no created-patient artifact was written."

    return True, ""


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

        ui_flow_ok, ui_flow_message = _run_ui_flow_case(case, base_url)
        if not ui_flow_ok:
            return CaseResult(
                case_id=case.id,
                name=case.name,
                status="FAIL",
                message=ui_flow_message,
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
