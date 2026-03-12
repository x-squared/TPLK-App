from __future__ import annotations

import datetime as dt
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = PROJECT_ROOT / "qa" / "reports"
LATEST_REPORT = REPORT_DIR / "latest-all-tests-report.md"


PIPELINE_MODULES: list[tuple[str, str]] = [
    ("specification", "qa.spec_tools.run_conceptual_specs"),
    ("client_server", "qa.spec_tools.run_client_server_specs"),
    ("server", "qa.spec_tools.run_server_specs"),
]


def _tail(text: str, lines: int = 180) -> str:
    chunks = text.splitlines()
    return "\n".join(chunks[-lines:]) if chunks else ""


def main() -> int:
    started = dt.datetime.now(dt.timezone.utc)
    results: list[dict[str, object]] = []
    overall_success = True

    for key, module in PIPELINE_MODULES:
        proc = subprocess.run(
            [sys.executable, "-m", module],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )
        output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
        success = proc.returncode == 0
        if not success:
            overall_success = False
        results.append(
            {
                "key": key,
                "module": module,
                "exit_code": proc.returncode,
                "success": success,
                "output_tail": _tail(output),
            }
        )

    finished = dt.datetime.now(dt.timezone.utc)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    lines.append("# All Tests Report")
    lines.append("")
    lines.append(f"- Started: `{started.isoformat()}`")
    lines.append(f"- Finished: `{finished.isoformat()}`")
    lines.append(f"- Duration seconds: `{(finished - started).total_seconds():.3f}`")
    lines.append(f"- Success: `{overall_success}`")
    lines.append("")
    lines.append("## Pipelines")
    lines.append("")
    for result in results:
        lines.append(
            f"- `{result['key']}` (`{result['module']}`): "
            f"success=`{result['success']}` exit_code=`{result['exit_code']}`"
        )
    lines.append("")
    lines.append("## Output Tails")
    lines.append("")
    for result in results:
        lines.append(f"### {result['key']}")
        lines.append("")
        lines.append("```text")
        lines.append(str(result["output_tail"]).rstrip())
        lines.append("```")
        lines.append("")

    LATEST_REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Report written: {LATEST_REPORT}")
    return 0 if overall_success else 1


if __name__ == "__main__":
    raise SystemExit(main())
