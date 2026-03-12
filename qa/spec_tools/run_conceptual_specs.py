from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from .check_architecture_dependencies import run_check as run_architecture_check
from .check_domain_sync import run_check as run_domain_check
from .conceptual_parser import parse_conceptual_cases
from .generate_tests import PROJECT_ROOT, SPEC_ROOT


REPORT_DIR = PROJECT_ROOT / "qa" / "reports"
LATEST_REPORT = REPORT_DIR / "latest-conceptual-report.md"


def _write_report(results: list[tuple[str, str, int, str]], errors: list[str]) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    passed = sum(1 for _, _, code, _ in results if code == 0)
    failed = sum(1 for _, _, code, _ in results if code != 0)

    lines: list[str] = []
    lines.append("# Conceptual Specification Report")
    lines.append("")
    lines.append(f"- Generated at: `{now}`")
    lines.append(f"- Cases executed: `{len(results)}`")
    lines.append(f"- Passed: `{passed}`")
    lines.append(f"- Failed: `{failed}`")
    lines.append("")
    lines.append("## Case Results")
    lines.append("")
    for case_id, name, exit_code, _source_file in results:
        state = "PASS" if exit_code == 0 else "FAIL"
        lines.append(f"- `{case_id}`: **{name}** -> `{state}`")
    lines.append("")
    lines.append("<!-- TPL:CASE_RESULTS:BEGIN -->")
    lines.append(
        json.dumps(
            [
                {
                    "case_id": case_id,
                    "status": "PASS" if exit_code == 0 else "FAIL",
                    "name": name,
                    "message": "",
                    "source_link": f"../../spec/{source_file}",
                }
                for case_id, name, exit_code, source_file in results
            ],
            ensure_ascii=False,
            indent=2,
        )
    )
    lines.append("<!-- TPL:CASE_RESULTS:END -->")
    if errors:
        lines.append("")
        lines.append("## Execution Errors")
        lines.append("")
        for item in errors:
            lines.append(f"- {item}")
    LATEST_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    cases = parse_conceptual_cases(SPEC_ROOT)
    if not cases:
        print("No conceptual-case blocks found under spec/testing/conceptual.")
        _write_report(results=[], errors=[])
        return 0

    results: list[tuple[str, str, int, str]] = []
    errors: list[str] = []
    for case in cases:
        if case.checker == "domain_database_sync":
            if not case.diagram or not case.mapping:
                errors.append(
                    f"{case.source_file} ({case.id}): checker `domain_database_sync` requires `diagram` and `mapping`."
                )
                results.append((case.id, case.name, 1, case.source_file))
                continue
            diagram_path = PROJECT_ROOT / case.diagram
            mapping_path = PROJECT_ROOT / case.mapping
            exit_code = run_domain_check(diagram_path=diagram_path, mapping_path=mapping_path)
            results.append((case.id, case.name, exit_code, case.source_file))
            continue

        if case.checker == "architecture_dependency_sync":
            if not case.rules:
                errors.append(
                    f"{case.source_file} ({case.id}): checker `architecture_dependency_sync` requires `rules`."
                )
                results.append((case.id, case.name, 1, case.source_file))
                continue
            rules_path = PROJECT_ROOT / case.rules
            exit_code = run_architecture_check(rules_path=rules_path)
            results.append((case.id, case.name, exit_code, case.source_file))
            continue

        if case.checker not in {"domain_database_sync", "architecture_dependency_sync"}:
            errors.append(
                f"{case.source_file} ({case.id}): unknown checker `{case.checker}`."
            )
            results.append((case.id, case.name, 1, case.source_file))

    _write_report(results=results, errors=errors)
    print(f"Report written: {LATEST_REPORT}")
    return 1 if any(code != 0 for _, _, code, _ in results) or errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
