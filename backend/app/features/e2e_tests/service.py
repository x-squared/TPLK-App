from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

from fastapi import HTTPException

from ...config import get_config
from ...schemas import (
    E2ETestCaseResultResponse,
    E2ETestMetadataResponse,
    E2ETestRunRequest,
    E2ETestRunResponse,
    E2ETestRunnerOption,
)

PROJECT_ROOT = Path(__file__).resolve().parents[4]
REPORT_DIR = PROJECT_ROOT / "qa" / "reports"

RUNNERS = {
    "all": {
        "label": "All tests",
        "description": "Run specification, client-server, and server test pipelines in sequence.",
        "module": "qa.spec_tools.run_all_tests",
        "report_path": PROJECT_ROOT / "qa" / "reports" / "latest-all-tests-report.md",
    },
    "specification": {
        "label": "Specification tests (Domain + Architecture)",
        "description": "Run conceptual consistency checks from spec/testing/conceptual.",
        "module": "qa.spec_tools.run_conceptual_specs",
        "report_path": PROJECT_ROOT / "qa" / "reports" / "latest-conceptual-report.md",
    },
    "client_server": {
        "label": "Client-Server tests",
        "description": "Run generated client-server specification tests.",
        "module": "qa.spec_tools.run_client_server_specs",
        "report_path": PROJECT_ROOT / "qa" / "reports" / "latest-client-server-spec-report.md",
    },
    "server": {
        "label": "Server tests",
        "description": "Run generated server specification tests.",
        "module": "qa.spec_tools.run_server_specs",
        "report_path": PROJECT_ROOT / "qa" / "reports" / "latest-server-spec-report.md",
    },
}

ALL_RUNNER_CASE_REPORTS = [
    PROJECT_ROOT / "qa" / "reports" / "latest-conceptual-report.md",
    PROJECT_ROOT / "qa" / "reports" / "latest-client-server-spec-report.md",
    PROJECT_ROOT / "qa" / "reports" / "latest-server-spec-report.md",
]

CASE_RESULTS_MARKER_PATTERN = re.compile(
    r"<!--\s*TPL:CASE_RESULTS:BEGIN\s*-->\s*(.*?)\s*<!--\s*TPL:CASE_RESULTS:END\s*-->",
    re.DOTALL,
)


def _tail_lines(text: str, max_lines: int) -> str:
    lines = text.splitlines()
    if max_lines <= 0:
        max_lines = 1
    return "\n".join(lines[-max_lines:])


def _extract_case_results_from_report(report_path: Path) -> list[E2ETestCaseResultResponse]:
    if not report_path.exists():
        return []
    report_text = report_path.read_text(encoding="utf-8")
    marker_match = CASE_RESULTS_MARKER_PATTERN.search(report_text)
    if marker_match:
        try:
            payload = json.loads(marker_match.group(1))
        except json.JSONDecodeError:
            payload = []
        rows_from_marker: list[E2ETestCaseResultResponse] = []
        if isinstance(payload, list):
            for entry in payload:
                if not isinstance(entry, dict):
                    continue
                source_link = str(entry.get("source_link") or "").strip()
                source_abs = str((REPORT_DIR / source_link).resolve()) if source_link else ""
                rows_from_marker.append(
                    E2ETestCaseResultResponse(
                        case_id=str(entry.get("case_id") or ""),
                        status=str(entry.get("status") or ""),
                        name=str(entry.get("name") or ""),
                        message=str(entry.get("message") or ""),
                        source_link=source_link,
                        source_file_abs=source_abs,
                    )
                )
        rows_from_marker = [row for row in rows_from_marker if row.case_id.strip()]
        if rows_from_marker:
            return rows_from_marker

    lines = report_text.splitlines()
    in_section = False
    rows: list[E2ETestCaseResultResponse] = []

    def _parse_cell(cell: str) -> str:
        value = cell.strip()
        if value.startswith("`") and value.endswith("`") and len(value) >= 2:
            value = value[1:-1]
        if value.startswith("**") and value.endswith("**") and len(value) >= 4:
            value = value[2:-2]
        return value.replace("\\|", "|").strip()

    for line in lines:
        if line.strip() == "## Test Case Results":
            in_section = True
            continue
        if in_section and line.startswith("## "):
            break
        if not in_section:
            continue
        if "|" not in line:
            continue
        if line.strip().startswith("| ---"):
            continue
        cells = [part.strip() for part in line.split("|")[1:-1]]
        if len(cells) < 5:
            continue
        if cells[0].strip().lower() == "case id":
            continue
        source_cell = cells[4]
        link_match = re.search(r"\(([^)]+)\)", source_cell)
        source_link = link_match.group(1).strip() if link_match else ""
        source_abs = str((REPORT_DIR / source_link).resolve()) if source_link else ""
        rows.append(
            E2ETestCaseResultResponse(
                case_id=_parse_cell(cells[0]),
                status=_parse_cell(cells[1]),
                name=_parse_cell(cells[2]),
                message=_parse_cell(cells[3]) if _parse_cell(cells[3]) != "-" else "",
                source_link=source_link,
                source_file_abs=source_abs,
            )
        )
    return rows


def ensure_dev_tools_enabled() -> None:
    env = get_config().env.strip().upper()
    if env not in {"DEV", "TEST"}:
        raise HTTPException(status_code=403, detail="E2E test runner is available only in DEV/TEST mode.")


def get_e2e_test_metadata() -> E2ETestMetadataResponse:
    ensure_dev_tools_enabled()
    return E2ETestMetadataResponse(
        runners=[
            E2ETestRunnerOption(
                key=key,  # type: ignore[arg-type]
                label=entry["label"],
                description=entry["description"],
            )
            for key, entry in RUNNERS.items()
        ]
    )


def run_e2e_tests(payload: E2ETestRunRequest) -> E2ETestRunResponse:
    ensure_dev_tools_enabled()
    runner = RUNNERS.get(payload.runner)
    if not runner:
        raise HTTPException(status_code=422, detail=f"Unknown runner '{payload.runner}'")

    started = dt.datetime.now(dt.timezone.utc)
    proc = subprocess.run(
        [sys.executable, "-m", str(runner["module"])],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    finished = dt.datetime.now(dt.timezone.utc)

    output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    output_tail = _tail_lines(output, payload.output_tail_lines)
    report_path = runner["report_path"]
    report_excerpt: str | None = None
    report_path_value: str | None = None
    report_file_abs: str | None = None
    if isinstance(report_path, Path) and report_path.exists():
        report_path_value = str(report_path.relative_to(PROJECT_ROOT))
        report_file_abs = str(report_path.resolve())
        report_excerpt = _tail_lines(report_path.read_text(encoding="utf-8"), 120)

    case_results: list[E2ETestCaseResultResponse] = []
    if payload.runner == "all":
        aggregated: list[E2ETestCaseResultResponse] = []
        for source_report in ALL_RUNNER_CASE_REPORTS:
            aggregated.extend(_extract_case_results_from_report(source_report))
        case_results = aggregated
    elif isinstance(report_path, Path) and report_path.exists():
        case_results = _extract_case_results_from_report(report_path)

    return E2ETestRunResponse(
        runner=payload.runner,
        success=proc.returncode == 0,
        exit_code=proc.returncode,
        started_at=started,
        finished_at=finished,
        duration_seconds=(finished - started).total_seconds(),
        report_path=report_path_value,
        report_file_abs=report_file_abs,
        output_tail=output_tail,
        report_excerpt=report_excerpt,
        case_results=case_results,
    )

