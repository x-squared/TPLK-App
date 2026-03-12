from __future__ import annotations

import argparse
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _resolve_dev_forum_export_dir(*, db_url: str | None) -> Path:
    if db_url and db_url.strip().startswith("sqlite:///"):
        db_path = Path(db_url.strip().removeprefix("sqlite:///")).expanduser()
        if not db_path.is_absolute():
            db_path = (Path.cwd() / db_path).resolve()
        base = db_path.parent
    else:
        base = Path(__file__).resolve().parents[2] / "database"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return (base / "dev_forum_exports" / f"export-{timestamp}").resolve()


def main() -> int:
    parser = argparse.ArgumentParser(description="Convenience wrapper for schema + data workflows.")
    parser.add_argument(
        "--mode",
        choices=(
            "recreate",
            "migrate",
            "refresh",
            "clean",
            "migrate-audit-fields",
            "migrate-medical-value-units",
            "verify-medical-value-units",
            "migrate-procurement-runtime",
            "migrate-procurement-typed",
            "clear-translation-bundles",
            "normalize-legacy-dev-forum-capture-label",
        ),
        default="refresh",
        help="recreate=drop/create+seed, migrate=schema only, refresh=migrate+clean+seed, clean=data only, migrate-audit-fields=add/backfill CREATED_BY from CHANGED_BY, migrate-medical-value-units=add/backfill LOINC+UCUM medical value columns, verify-medical-value-units=read-only LOINC+UCUM coverage verification, migrate-procurement-runtime=legacy->unified procurement backfill, migrate-procurement-typed=unified->typed procurement backfill, clear-translation-bundles=delete DB translation overrides, normalize-legacy-dev-forum-capture-label=normalize stale Dev-Forum capture label overrides",
    )
    parser.add_argument("--env", default=os.getenv("TPL_ENV", "DEV"), help="Application env (DEV/TEST/PROD)")
    parser.add_argument("--seed-profile", default=os.getenv("TPL_SEED_PROFILE"), help="Optional seed profile override")
    parser.add_argument("--db-url", default=None, help="Optional DB URL override")
    parser.add_argument(
        "--migration-check-level",
        choices=("basic", "strict"),
        default="strict",
        help="Schema verification depth used after db_data migration modes",
    )
    args = parser.parse_args()

    def run(module: str, module_args: list[str]) -> int:
        cmd = [sys.executable, "-m", module, *module_args]
        proc = subprocess.run(cmd, check=False)
        return int(proc.returncode)

    db_url_args = ["--db-url", args.db_url] if args.db_url else []
    seed_args = ["--seed-profile", args.seed_profile] if args.seed_profile else []
    migration_check_args = ["--migration-check-level", args.migration_check_level]

    def run_with_dev_forum_backup(
        *,
        schema_mode: str,
        data_mode: str,
        data_args: list[str],
    ) -> int:
        export_dir = _resolve_dev_forum_export_dir(db_url=args.db_url)
        export_args = ["--dev-forum-export-dir", str(export_dir)]
        export_code = run("app.db_data", ["--mode", "export-dev-forum", "--env", args.env, *export_args, *db_url_args])
        if export_code != 0:
            return export_code

        schema_code = run("app.db_schema", ["--mode", schema_mode, "--env", args.env, *db_url_args])
        if schema_code != 0 and data_mode == "refresh" and schema_mode == "migrate":
            # refresh fallback: recreate when migrate fails
            schema_code = run("app.db_schema", ["--mode", "recreate", "--env", args.env, *db_url_args])
        if schema_code != 0:
            return schema_code

        data_code = run("app.db_data", ["--mode", data_mode, "--env", args.env, *data_args, *db_url_args])
        if data_code != 0:
            return data_code

        import_code = run("app.db_data", ["--mode", "import-dev-forum", "--env", args.env, *export_args, *db_url_args])
        if import_code != 0:
            print(
                "WARNING: Dev-Forum import could not be applied after DB rebuild. "
                + f"Export kept at: {export_dir}"
            )
            print(
                "HINT: Schema/user references may have changed. "
                + "You can inspect/edit dev_forum_requests.json and retry:"
            )
            print(
                f'{sys.executable} -m app.db_data --mode import-dev-forum --env {args.env} '
                + f'--dev-forum-export-dir "{export_dir}"'
            )
        return 0

    if args.mode == "recreate":
        return run_with_dev_forum_backup(
            schema_mode="recreate",
            data_mode="seed",
            data_args=[*seed_args],
        )

    if args.mode == "migrate":
        return run("app.db_schema", ["--mode", "migrate", "--env", args.env, *db_url_args])

    if args.mode == "clean":
        return run("app.db_data", ["--mode", "clean", "--env", args.env, *db_url_args])

    if args.mode == "migrate-procurement-runtime":
        return run(
            "app.db_data",
            ["--mode", "migrate-procurement-runtime", "--env", args.env, *migration_check_args, *db_url_args],
        )

    if args.mode == "migrate-procurement-typed":
        return run(
            "app.db_data",
            ["--mode", "migrate-procurement-typed", "--env", args.env, *migration_check_args, *db_url_args],
        )

    if args.mode == "migrate-audit-fields":
        return run(
            "app.db_data",
            ["--mode", "migrate-audit-fields", "--env", args.env, *migration_check_args, *db_url_args],
        )

    if args.mode == "migrate-medical-value-units":
        return run(
            "app.db_data",
            ["--mode", "migrate-medical-value-units", "--env", args.env, *migration_check_args, *db_url_args],
        )

    if args.mode == "verify-medical-value-units":
        return run(
            "app.db_data",
            ["--mode", "verify-medical-value-units", "--env", args.env, *db_url_args],
        )

    if args.mode == "clear-translation-bundles":
        return run("app.db_data", ["--mode", "clear-translation-bundles", "--env", args.env, *db_url_args])

    if args.mode == "normalize-legacy-dev-forum-capture-label":
        return run(
            "app.db_data",
            ["--mode", "normalize-legacy-dev-forum-capture-label", "--env", args.env, *db_url_args],
        )

    # Default refresh with automatic Dev-Forum backup/restore.
    return run_with_dev_forum_backup(
        schema_mode="migrate",
        data_mode="refresh",
        data_args=[*seed_args],
    )


if __name__ == "__main__":
    raise SystemExit(main())
