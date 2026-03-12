from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

from .case_results import collect_case_results, source_link_from_report
from .generate_tests import PROJECT_ROOT, generate

REPORT_DIR = PROJECT_ROOT / "qa" / "reports"
LATEST_REPORT = REPORT_DIR / "latest-spec-report.md"


def _collect_suggestions(output: str, exit_code: int) -> list[tuple[str, str, str]]:
    suggestions: list[tuple[str, str, str]] = []

    if exit_code == 0:
        return [
            (
                "MAINTAIN_SPEC_COVERAGE",
                "All generated spec tests are passing",
                "Add additional spec cases for new features and rerun the pipeline.",
            )
        ]

    if "Connection refused" in output and ":8000" in output:
        suggestions.append(
            (
                "START_BACKEND",
                "Start backend server and rerun specs",
                "From repo root: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`",
            )
        )
    if "Connection refused" in output and ":5173" in output:
        suggestions.append(
            (
                "START_FRONTEND",
                "Start frontend dev server and rerun specs",
                "From repo root: `cd frontend && npm run dev`",
            )
        )
    if "Unexpected HTTP status" in output:
        suggestions.append(
            (
                "CHECK_ROUTE_OR_CONTRACT",
                "Review failing endpoint path and expected status/json in spec",
                "Compare `spec/**/*.md` expectations with current route implementation.",
            )
        )
    if not suggestions:
        suggestions.append(
            (
                "REVIEW_FAILURE_LOG",
                "Inspect failure log and update spec or code",
                "Read this report's failure excerpt and address the first failing case.",
            )
        )
    return suggestions


def _write_report(
    exit_code: int,
    output: str,
    generated_summary: dict[str, int],
    case_results: list,
) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    suggestions = _collect_suggestions(output, exit_code)
    failures = len(re.findall(r"FAIL:|ERROR:", output))

    lines: list[str] = []
    lines.append("# Specification Test Report")
    lines.append("")
    lines.append(f"- Generated at: `{now}`")
    lines.append(f"- Exit code: `{exit_code}`")
    lines.append(f"- Spec cases: total `{generated_summary['total']}`, server `{generated_summary['server']}`, client-server `{generated_summary['client_server']}`")
    lines.append(f"- Failure markers found: `{failures}`")
    lines.append("")
    lines.append("## Suggestion List")
    lines.append("")
    for action_id, title, details in suggestions:
        lines.append(f"- `{action_id}`: **{title}** - {details}")
    lines.append("")
    lines.append("## Test Output Excerpt")
    lines.append("")
    excerpt = output[-4000:] if len(output) > 4000 else output
    lines.append("```text")
    lines.append(excerpt.rstrip())
    lines.append("```")
    lines.append("")
    lines.append("## Test Case Results")
    lines.append("")
    lines.append("| Case ID | Result | Name | Message | Testcase document |")
    lines.append("| --- | --- | --- | --- | --- |")

    def _md_cell(value: str) -> str:
        normalized = value.replace("\n", " ").replace("|", "\\|").strip()
        return normalized

    for result in case_results:
        source_link = source_link_from_report(result.source_file)
        lines.append(
            "| "
            + f"`{_md_cell(result.case_id)}` | "
            + f"**{_md_cell(result.status)}** | "
            + f"{_md_cell(result.name)} | "
            + f"{_md_cell(result.message or '-')} | "
            + f"[Testcase document]({_md_cell(source_link)}) |"
        )
    lines.append("")
    lines.append("<!-- TPL:CASE_RESULTS:BEGIN -->")
    lines.append(
        json.dumps(
            [
                {
                    "case_id": result.case_id,
                    "status": result.status,
                    "name": result.name,
                    "message": result.message or "",
                    "source_link": source_link_from_report(result.source_file),
                }
                for result in case_results
            ],
            ensure_ascii=False,
            indent=2,
        )
    )
    lines.append("<!-- TPL:CASE_RESULTS:END -->")
    lines.append("")
    lines.append("## How To Execute Suggestions")
    lines.append("")
    lines.append("Run:")
    lines.append("")
    lines.append("```bash")
    lines.append("cd /path/to/TPL-App")
    lines.append("python -m qa.spec_tools.run_suggestions --report qa/reports/latest-spec-report.md")
    lines.append("```")

    LATEST_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    generated_summary = generate()
    case_results = collect_case_results(scope=None)
    cmd = [sys.executable, "-m", "unittest", "discover", "-s", "qa/tests/generated", "-p", "test_*.py", "-v"]
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    output = (proc.stdout or "") + "\n" + (proc.stderr or "")
    _write_report(proc.returncode, output, generated_summary, case_results)
    print(f"Report written: {LATEST_REPORT}")
    print(output)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
