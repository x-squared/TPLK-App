from __future__ import annotations

import argparse
import os
from dataclasses import dataclass

from sqlalchemy import inspect


@dataclass
class SchemaRuntime:
    engine: object
    base: object


@dataclass
class SchemaDrift:
    missing_tables: list[str]
    missing_columns: list[str]
    type_mismatches: list[str]
    nullable_mismatches: list[str]
    missing_indexes: list[str]
    missing_unique_constraints: list[str]
    missing_foreign_keys: list[str]

    @property
    def has_drift(self) -> bool:
        return any(
            (
                self.missing_tables,
                self.missing_columns,
                self.type_mismatches,
                self.nullable_mismatches,
                self.missing_indexes,
                self.missing_unique_constraints,
                self.missing_foreign_keys,
            )
        )


def _configure_env(*, app_env: str | None, database_url: str | None) -> None:
    if app_env:
        os.environ["TPL_ENV"] = app_env
    if database_url:
        os.environ["TPL_DATABASE_URL"] = database_url


def _load_runtime() -> SchemaRuntime:
    from . import models  # noqa: F401 - ensure model metadata is registered
    from .database import Base, engine

    return SchemaRuntime(engine=engine, base=Base)


def _normalize_type_name(raw: str) -> str:
    base = raw.upper().split("(", 1)[0].strip()
    groups = {
        "INTEGER": {"INTEGER", "INT", "BIGINT", "SMALLINT"},
        "STRING": {"VARCHAR", "NVARCHAR", "CHAR", "TEXT", "STRING"},
        "BOOLEAN": {"BOOLEAN", "BOOL"},
        "DATETIME": {"DATETIME", "TIMESTAMP"},
        "DATE": {"DATE"},
        "FLOAT": {"FLOAT", "REAL", "DOUBLE"},
        "NUMERIC": {"NUMERIC", "DECIMAL"},
        "JSON": {"JSON"},
    }
    for normalized, aliases in groups.items():
        if base in aliases:
            return normalized
    return base


def verify_schema_drift(runtime: SchemaRuntime, *, strict: bool = True) -> SchemaDrift:
    insp = inspect(runtime.engine)
    db_tables = set(insp.get_table_names())
    model_tables = set(runtime.base.metadata.tables.keys())

    missing_tables = sorted(model_tables - db_tables)
    missing_columns: list[str] = []
    type_mismatches: list[str] = []
    nullable_mismatches: list[str] = []
    missing_indexes: list[str] = []
    missing_unique_constraints: list[str] = []
    missing_foreign_keys: list[str] = []

    for table_name in sorted(model_tables & db_tables):
        table = runtime.base.metadata.tables[table_name]
        db_cols_raw = insp.get_columns(table_name)
        db_cols = {entry["name"]: entry for entry in db_cols_raw}
        model_cols = {column.name: column for column in table.columns}
        for col in sorted(set(model_cols.keys()) - set(db_cols.keys())):
            missing_columns.append(f"{table_name}.{col}")

        if strict:
            for col_name in sorted(set(model_cols.keys()) & set(db_cols.keys())):
                model_col = model_cols[col_name]
                db_col = db_cols[col_name]
                model_type = _normalize_type_name(str(model_col.type))
                db_type = _normalize_type_name(str(db_col.get("type", "")))
                if model_type and db_type and model_type != db_type:
                    type_mismatches.append(f"{table_name}.{col_name} model={model_type} db={db_type}")

                db_nullable = bool(db_col.get("nullable", True))
                model_nullable = bool(model_col.nullable)
                if db_nullable != model_nullable:
                    nullable_mismatches.append(
                        f"{table_name}.{col_name} model_nullable={model_nullable} db_nullable={db_nullable}"
                    )

            db_index_signatures = {
                tuple(index.get("column_names") or [])
                for index in insp.get_indexes(table_name)
                if not index.get("unique", False)
            }
            model_index_signatures = {
                tuple(col.name for col in index.columns)
                for index in table.indexes
                if not getattr(index, "unique", False)
            }
            for signature in sorted(model_index_signatures - db_index_signatures):
                missing_indexes.append(f"{table_name}({', '.join(signature)})")

            db_unique_signatures = {
                tuple(item.get("column_names") or [])
                for item in insp.get_unique_constraints(table_name)
                if item.get("column_names")
            }
            db_unique_signatures.update(
                tuple(index.get("column_names") or [])
                for index in insp.get_indexes(table_name)
                if index.get("unique", False) and index.get("column_names")
            )
            model_unique_signatures = {
                tuple(col.name for col in constraint.columns)
                for constraint in table.constraints
                if constraint.__class__.__name__ == "UniqueConstraint"
            }
            model_unique_signatures.update(
                (column.name,)
                for column in table.columns
                if getattr(column, "unique", False)
            )
            for signature in sorted(model_unique_signatures - db_unique_signatures):
                missing_unique_constraints.append(f"{table_name}({', '.join(signature)})")

            db_fk_signatures = {
                (
                    tuple(fk.get("constrained_columns") or []),
                    fk.get("referred_table"),
                    tuple(fk.get("referred_columns") or []),
                )
                for fk in insp.get_foreign_keys(table_name)
                if fk.get("constrained_columns") and fk.get("referred_table")
            }
            model_fk_signatures = set()
            for fk in table.foreign_key_constraints:
                constrained = tuple(element.parent.name for element in fk.elements)
                referred_table = fk.referred_table.name if fk.referred_table is not None else None
                referred_columns = tuple(element.column.name for element in fk.elements)
                if constrained and referred_table:
                    model_fk_signatures.add((constrained, referred_table, referred_columns))
            for signature in sorted(model_fk_signatures - db_fk_signatures):
                cols, ref_table, ref_cols = signature
                missing_foreign_keys.append(
                    f"{table_name}({', '.join(cols)}) -> {ref_table}({', '.join(ref_cols)})"
                )

    return SchemaDrift(
        missing_tables=missing_tables,
        missing_columns=missing_columns,
        type_mismatches=type_mismatches,
        nullable_mismatches=nullable_mismatches,
        missing_indexes=missing_indexes,
        missing_unique_constraints=missing_unique_constraints,
        missing_foreign_keys=missing_foreign_keys,
    )


def _print_drift(drift: SchemaDrift) -> None:
    if drift.missing_tables:
        print("Missing tables:")
        for item in drift.missing_tables:
            print(f"  - {item}")
    if drift.missing_columns:
        print("Missing columns:")
        for item in drift.missing_columns:
            print(f"  - {item}")
    if drift.type_mismatches:
        print("Type mismatches:")
        for item in drift.type_mismatches:
            print(f"  - {item}")
    if drift.nullable_mismatches:
        print("Nullable mismatches:")
        for item in drift.nullable_mismatches:
            print(f"  - {item}")
    if drift.missing_indexes:
        print("Missing indexes:")
        for item in drift.missing_indexes:
            print(f"  - {item}")
    if drift.missing_unique_constraints:
        print("Missing unique constraints:")
        for item in drift.missing_unique_constraints:
            print(f"  - {item}")
    if drift.missing_foreign_keys:
        print("Missing foreign keys:")
        for item in drift.missing_foreign_keys:
            print(f"  - {item}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Schema management (DDL only).")
    parser.add_argument(
        "--mode",
        choices=("recreate", "migrate", "verify"),
        default="migrate",
        help="recreate=drop/create, migrate=create missing, verify=drift check only",
    )
    parser.add_argument(
        "--check-level",
        choices=("basic", "strict"),
        default="strict",
        help="Schema drift depth for migrate/verify: basic=tables+columns, strict=includes types/nullability/indexes/constraints/FKs",
    )
    parser.add_argument("--env", default=os.getenv("TPL_ENV", "DEV"), help="Application env (DEV/TEST/PROD)")
    parser.add_argument("--db-url", default=None, help="Optional DB URL override")
    args = parser.parse_args()

    _configure_env(app_env=args.env, database_url=args.db_url)
    runtime = _load_runtime()

    if args.mode == "recreate":
        runtime.base.metadata.drop_all(bind=runtime.engine)
        runtime.base.metadata.create_all(bind=runtime.engine)
        print("Schema recreated (drop + create).")
        return 0

    if args.mode == "migrate":
        runtime.base.metadata.create_all(bind=runtime.engine)
        drift = verify_schema_drift(runtime, strict=args.check_level == "strict")
        if drift.has_drift:
            print(
                "Schema migrate incomplete: database still differs from current model metadata "
                f"(check-level={args.check_level})."
            )
            _print_drift(drift)
            print("Hint: run with --mode recreate for a full rebuild.")
            return 2
        print("Schema migrated successfully.")
        return 0

    drift = verify_schema_drift(runtime, strict=args.check_level == "strict")
    if not drift.has_drift:
        print(f"Schema verify OK: database matches current model metadata (check-level={args.check_level}).")
        return 0
    _print_drift(drift)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
