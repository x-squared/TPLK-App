from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Engine, inspect, text


@dataclass
class AuditFieldMigrationResult:
    """Summary of created_by audit migration operations."""

    tables_scanned: int
    tables_with_changed_by: int
    created_by_columns_added: int
    created_by_values_backfilled: int


@dataclass
class AuditFieldVerificationResult:
    tables_with_changed_by: int
    tables_missing_created_by: int
    rows_missing_created_by_backfill: int

    @property
    def issue_count(self) -> int:
        return self.tables_missing_created_by + self.rows_missing_created_by_backfill


def _quote_identifier(engine: Engine, identifier: str) -> str:
    return engine.dialect.identifier_preparer.quote(identifier)


def migrate_created_by_columns(*, engine: Engine) -> AuditFieldMigrationResult:
    """Add missing CREATED_BY columns and backfill them from CHANGED_BY."""
    tables_scanned = 0
    tables_with_changed_by = 0
    created_by_columns_added = 0
    created_by_values_backfilled = 0

    with engine.begin() as conn:
        inspector = inspect(conn)
        table_names = sorted(inspector.get_table_names())
        tables_scanned = len(table_names)

        for table_name in table_names:
            column_names = {str(col.get("name", "")).upper() for col in inspector.get_columns(table_name)}
            if "CHANGED_BY" not in column_names:
                continue
            tables_with_changed_by += 1

            table_ref = _quote_identifier(engine, table_name)
            created_by_ref = _quote_identifier(engine, "CREATED_BY")
            changed_by_ref = _quote_identifier(engine, "CHANGED_BY")

            if "CREATED_BY" not in column_names:
                conn.execute(text(f"ALTER TABLE {table_ref} ADD COLUMN {created_by_ref} INTEGER"))
                created_by_columns_added += 1

            update_result = conn.execute(
                text(
                    f"UPDATE {table_ref} "
                    f"SET {created_by_ref} = {changed_by_ref} "
                    f"WHERE {created_by_ref} IS NULL AND {changed_by_ref} IS NOT NULL"
                )
            )
            if update_result.rowcount and update_result.rowcount > 0:
                created_by_values_backfilled += int(update_result.rowcount)

    return AuditFieldMigrationResult(
        tables_scanned=tables_scanned,
        tables_with_changed_by=tables_with_changed_by,
        created_by_columns_added=created_by_columns_added,
        created_by_values_backfilled=created_by_values_backfilled,
    )


def verify_created_by_consistency(*, engine: Engine) -> AuditFieldVerificationResult:
    """Validate CREATED_BY compatibility for all tables that have CHANGED_BY."""
    tables_with_changed_by = 0
    tables_missing_created_by = 0
    rows_missing_created_by_backfill = 0

    with engine.begin() as conn:
        inspector = inspect(conn)
        table_names = sorted(inspector.get_table_names())
        for table_name in table_names:
            column_names = {str(col.get("name", "")).upper() for col in inspector.get_columns(table_name)}
            if "CHANGED_BY" not in column_names:
                continue
            tables_with_changed_by += 1
            if "CREATED_BY" not in column_names:
                tables_missing_created_by += 1
                continue
            table_ref = _quote_identifier(engine, table_name)
            created_by_ref = _quote_identifier(engine, "CREATED_BY")
            changed_by_ref = _quote_identifier(engine, "CHANGED_BY")
            missing_count = int(
                conn.execute(
                    text(
                        f"SELECT COUNT(*) FROM {table_ref} "
                        f"WHERE {changed_by_ref} IS NOT NULL AND {created_by_ref} IS NULL"
                    )
                ).scalar_one()
            )
            rows_missing_created_by_backfill += missing_count

    return AuditFieldVerificationResult(
        tables_with_changed_by=tables_with_changed_by,
        tables_missing_created_by=tables_missing_created_by,
        rows_missing_created_by_backfill=rows_missing_created_by_backfill,
    )
