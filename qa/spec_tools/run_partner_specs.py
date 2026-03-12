from __future__ import annotations

import datetime as dt
import json
import os
import sqlite3
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DB_FILE = PROJECT_ROOT / "database" / "tpl_app.db"
REPORT_DIR = PROJECT_ROOT / "qa" / "reports"
CREATED_PATIENT_FILE = REPORT_DIR / "created-patient.json"
LATEST_REPORT = REPORT_DIR / "latest-partner-report.md"


def _run_playwright() -> tuple[int, str]:
    env = {
        **dict(**os.environ),
        "TPL_CREATED_PATIENT_FILE": str(CREATED_PATIENT_FILE),
    }
    cmd = ["npm", "run", "test:spec-e2e"]
    proc = subprocess.run(cmd, cwd=FRONTEND_DIR, capture_output=True, text=True, env=env)
    output = (proc.stdout or "") + "\n" + (proc.stderr or "")
    return proc.returncode, output


def _verify_patient_in_db(pid: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.execute('SELECT COUNT(1) FROM "PATIENT" WHERE "PID" = ?', (pid,))
        row = cursor.fetchone()
        return bool(row and row[0] > 0)
    finally:
        conn.close()


def _build_suggestions(playwright_exit: int, db_ok: bool, created_pid: str | None, output: str) -> list[tuple[str, str, str]]:
    if playwright_exit == 0 and db_ok:
        return [
            (
                "MAINTAIN_PARTNER_FLOW",
                "Partner flow passed",
                "Keep this test in CI and add more UI+DB scenarios in spec/testing/client-server.",
            )
        ]

    suggestions: list[tuple[str, str, str]] = []
    has_connection_refused = (
        "ECONNREFUSED" in output
        or "ERR_CONNECTION_REFUSED" in output
        or "NS_ERROR_CONNECTION_REFUSED" in output
        or "Connection refused" in output
    )
    if has_connection_refused:
        suggestions.append(
            (
                "START_SERVERS",
                "Start backend and frontend before rerun",
                "Backend: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`; "
                "Frontend: `cd frontend && npm run dev`",
            )
        )
    if playwright_exit != 0 and not has_connection_refused:
        suggestions.append(
            (
                "FIX_UI_AUTOMATION",
                "Review Playwright failure and selectors",
                "Inspect failing step in `frontend/test/create-patient-from-recipients.spec.ts` and adapt selectors/flow.",
            )
        )
    if created_pid and not db_ok:
        suggestions.append(
            (
                "CHECK_BACKEND_PERSISTENCE",
                "Patient not found in DB after UI save",
                f"Verify backend create route and transaction handling for PID `{created_pid}`.",
            )
        )
    if not suggestions:
        suggestions.append(
            (
                "REVIEW_PARTNER_REPORT",
                "Review report output and patch first failing issue",
                "Read the test output excerpt in the report and fix the first concrete error.",
            )
        )
    return suggestions


def _write_report(playwright_exit: int, db_ok: bool, created_payload: dict | None, output: str, suggestions: list[tuple[str, str, str]]) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    created_pid = created_payload.get("pid") if created_payload else None

    lines: list[str] = []
    lines.append("# Partner Spec Report")
    lines.append("")
    lines.append(f"- Generated at: `{now}`")
    lines.append(f"- Playwright exit code: `{playwright_exit}`")
    lines.append(f"- Created PID: `{created_pid or 'n/a'}`")
    lines.append(f"- DB verification: `{'ok' if db_ok else 'failed'}`")
    lines.append("")
    lines.append("## Suggestion List")
    lines.append("")
    for action_id, title, detail in suggestions:
        lines.append(f"- `{action_id}`: **{title}** - {detail}")
    lines.append("")
    lines.append("## Test Output Excerpt")
    lines.append("")
    lines.append("```text")
    lines.append((output[-5000:] if len(output) > 5000 else output).rstrip())
    lines.append("```")
    lines.append("")
    lines.append("## Execute Suggestions")
    lines.append("")
    lines.append("```bash")
    lines.append("cd /path/to/TPL-App")
    lines.append("python -m qa.spec_tools.run_suggestions --report qa/reports/latest-partner-report.md")
    lines.append("```")
    LATEST_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    if CREATED_PATIENT_FILE.exists():
        CREATED_PATIENT_FILE.unlink()

    playwright_exit, output = _run_playwright()
    created_payload = None
    if CREATED_PATIENT_FILE.exists():
        created_payload = json.loads(CREATED_PATIENT_FILE.read_text(encoding="utf-8"))
    created_pid = created_payload.get("pid") if created_payload else None

    db_ok = bool(created_pid and _verify_patient_in_db(created_pid))
    suggestions = _build_suggestions(playwright_exit, db_ok, created_pid, output)
    _write_report(playwright_exit, db_ok, created_payload, output, suggestions)

    print(f"Report written: {LATEST_REPORT}")
    print(output)
    return 0 if (playwright_exit == 0 and db_ok) else 1


if __name__ == "__main__":
    raise SystemExit(main())
