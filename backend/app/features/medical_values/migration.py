from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Engine, inspect, text


@dataclass
class MedicalValueUnitMigrationResult:
    tables_scanned: int
    columns_added: int
    rows_backfilled: int


def _quote_identifier(engine: Engine, identifier: str) -> str:
    return engine.dialect.identifier_preparer.quote(identifier)


def migrate_medical_value_unit_fields(*, engine: Engine) -> MedicalValueUnitMigrationResult:
    """Add and backfill LOINC/UCUM related medical-value columns."""
    columns_added = 0
    rows_backfilled = 0

    wanted_columns: dict[str, list[tuple[str, str]]] = {
        "MEDICAL_VALUE_DATATYPE": [
            ("CANONICAL_UNIT_UCUM", "VARCHAR(32)"),
            ("ALLOWED_UNITS_UCUM_JSON", "VARCHAR(1024)"),
            ("CONVERSION_GROUP", "VARCHAR(32)"),
        ],
        "MEDICAL_VALUE_TEMPLATE": [
            ("LOINC_CODE", "VARCHAR(32)"),
            ("LOINC_DISPLAY_NAME", "VARCHAR(128)"),
        ],
        "MEDICAL_VALUE": [
            ("VALUE_INPUT", "VARCHAR"),
            ("UNIT_INPUT_UCUM", "VARCHAR(32)"),
            ("VALUE_CANONICAL", "VARCHAR"),
            ("UNIT_CANONICAL_UCUM", "VARCHAR(32)"),
            ("NORMALIZATION_STATUS", "VARCHAR(32)"),
            ("NORMALIZATION_ERROR", "VARCHAR(512)"),
        ],
    }

    with engine.begin() as conn:
        inspector = inspect(conn)
        table_names = inspector.get_table_names()
        table_name_set = set(table_names)

        for table_name, column_defs in wanted_columns.items():
            if table_name not in table_name_set:
                continue
            existing_cols = {str(col.get("name", "")).upper() for col in inspector.get_columns(table_name)}
            table_ref = _quote_identifier(engine, table_name)
            for column_name, column_type in column_defs:
                if column_name in existing_cols:
                    continue
                column_ref = _quote_identifier(engine, column_name)
                conn.execute(text(f"ALTER TABLE {table_ref} ADD COLUMN {column_ref} {column_type}"))
                columns_added += 1

        if "MEDICAL_VALUE" in table_name_set:
            update_result = conn.execute(
                text(
                    'UPDATE "MEDICAL_VALUE" '
                    'SET "VALUE_INPUT" = COALESCE("VALUE_INPUT", "VALUE", ""), '
                    '"VALUE_CANONICAL" = COALESCE("VALUE_CANONICAL", "VALUE", ""), '
                    '"NORMALIZATION_STATUS" = COALESCE("NORMALIZATION_STATUS", \'MIGRATED\'), '
                    '"NORMALIZATION_ERROR" = COALESCE("NORMALIZATION_ERROR", \'\') '
                    'WHERE "VALUE_INPUT" IS NULL OR "VALUE_CANONICAL" IS NULL OR "NORMALIZATION_STATUS" IS NULL OR "NORMALIZATION_ERROR" IS NULL'
                )
            )
            if update_result.rowcount and update_result.rowcount > 0:
                rows_backfilled += int(update_result.rowcount)

        if "MEDICAL_VALUE_DATATYPE" in table_name_set:
            update_result = conn.execute(
                text(
                    'UPDATE "MEDICAL_VALUE_DATATYPE" '
                    'SET "CANONICAL_UNIT_UCUM" = COALESCE("CANONICAL_UNIT_UCUM", "UNIT") '
                    'WHERE "CANONICAL_UNIT_UCUM" IS NULL AND "UNIT" IS NOT NULL'
                )
            )
            if update_result.rowcount and update_result.rowcount > 0:
                rows_backfilled += int(update_result.rowcount)

    return MedicalValueUnitMigrationResult(
        tables_scanned=len(wanted_columns),
        columns_added=columns_added,
        rows_backfilled=rows_backfilled,
    )
