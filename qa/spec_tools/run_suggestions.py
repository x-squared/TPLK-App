from __future__ import annotations

import argparse
import re
from pathlib import Path


def _extract_action_ids(report_text: str) -> list[str]:
    return re.findall(r"`([A-Z_]+)`:", report_text)


def _execute(action_id: str, project_root: Path) -> tuple[bool, str]:
    if action_id == "CHECK_ROUTE_OR_CONTRACT":
        return True, "Manual action: review failing route implementation and spec file."
    if action_id == "START_BACKEND":
        return True, "Manual action: start backend server as documented in doc/server-manual.qmd."
    if action_id == "START_FRONTEND":
        return True, "Manual action: start frontend server as documented in doc/client-manual.qmd."
    if action_id == "REVIEW_FAILURE_LOG":
        return True, "Manual action: inspect qa/reports/latest-spec-report.md and address first failing case."
    if action_id == "MAINTAIN_SPEC_COVERAGE":
        return True, "No fix required. Add new spec cases for newly delivered behavior."
    if action_id == "MAINTAIN_PARTNER_FLOW":
        return True, "No fix required. Extend partner scenarios as new workflows are added."
    if action_id == "START_SERVERS":
        return True, "Manual action: start backend and frontend servers, then rerun partner specs."
    if action_id == "FIX_UI_AUTOMATION":
        return True, "Manual action: update Playwright selectors/flow and rerun partner specs."
    if action_id == "CHECK_BACKEND_PERSISTENCE":
        return True, "Manual action: inspect backend create route and DB transaction behavior."
    if action_id == "REVIEW_PARTNER_REPORT":
        return True, "Manual action: inspect latest partner report and fix the first failing step."
    return False, f"Unknown action id: {action_id}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Execute suggestion actions from a specification report")
    parser.add_argument(
        "--report",
        default="qa/reports/latest-spec-report.md",
        help="Path to generated spec report markdown file",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[2]
    report_path = (project_root / args.report).resolve() if not Path(args.report).is_absolute() else Path(args.report)
    if not report_path.exists():
        print(f"Report file not found: {report_path}")
        return 1

    text = report_path.read_text(encoding="utf-8")
    action_ids = _extract_action_ids(text)
    if not action_ids:
        print("No actions found in report.")
        return 0

    print(f"Executing {len(action_ids)} suggestion action(s) from: {report_path}")
    for action_id in action_ids:
        ok, message = _execute(action_id, project_root)
        status = "OK" if ok else "SKIP"
        print(f"- [{status}] {action_id}: {message}")

    print("")
    rerun_cmd = "python -m qa.spec_tools.run_specs"
    if "latest-partner-report" in report_path.name:
        rerun_cmd = "python -m qa.spec_tools.run_partner_specs"
    print("Tip: after applying manual suggestions, rerun:")
    print(f"  {rerun_cmd}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
