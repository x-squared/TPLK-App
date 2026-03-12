from sqlalchemy import create_engine, text

from app.features.audit_fields import migrate_created_by_columns, verify_created_by_consistency


def test_migrate_created_by_adds_and_backfills_values(tmp_path) -> None:
    """Verify audit migration adds CREATED_BY and backfills from CHANGED_BY."""
    db_path = tmp_path / "audit-migration.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

    with engine.begin() as conn:
        conn.execute(
            text(
                'CREATE TABLE "EXAMPLE_AUDIT" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"CHANGED_BY" INTEGER, '
                '"UPDATED_AT" TEXT'
                ")"
            )
        )
        conn.execute(text('INSERT INTO "EXAMPLE_AUDIT" ("ID", "CHANGED_BY") VALUES (1, 42), (2, NULL)'))

    first_run = migrate_created_by_columns(engine=engine)
    assert first_run.tables_with_changed_by == 1, (
        "Migration should detect exactly one table that uses CHANGED_BY in this isolated fixture."
    )
    assert first_run.created_by_columns_added == 1, (
        "Migration should add missing CREATED_BY column on first execution."
    )
    assert first_run.created_by_values_backfilled == 1, (
        "Exactly one row should be backfilled because only one row has CHANGED_BY set."
    )

    with engine.begin() as conn:
        created_by_values = conn.execute(
            text('SELECT "CREATED_BY" FROM "EXAMPLE_AUDIT" ORDER BY "ID"')
        ).scalars().all()
    assert created_by_values == [42, None], (
        "CREATED_BY should mirror CHANGED_BY for populated rows and keep NULL for empty rows."
    )

    second_run = migrate_created_by_columns(engine=engine)
    assert second_run.created_by_columns_added == 0, (
        "Running migration again should be idempotent and not add CREATED_BY a second time."
    )
    assert second_run.created_by_values_backfilled == 0, (
        "Running migration again should not backfill values that are already set."
    )


def test_verify_created_by_consistency_detects_missing_backfills(tmp_path) -> None:
    """Verification should fail when CHANGED_BY is populated but CREATED_BY is still NULL."""
    db_path = tmp_path / "audit-verify.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

    with engine.begin() as conn:
        conn.execute(
            text(
                'CREATE TABLE "EXAMPLE_AUDIT" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"CHANGED_BY" INTEGER, '
                '"CREATED_BY" INTEGER'
                ")"
            )
        )
        conn.execute(text('INSERT INTO "EXAMPLE_AUDIT" ("ID", "CHANGED_BY", "CREATED_BY") VALUES (1, 7, NULL), (2, 8, 8)'))

    result = verify_created_by_consistency(engine=engine)
    assert result.tables_with_changed_by == 1, (
        "Verification should inspect tables that contain CHANGED_BY columns."
    )
    assert result.tables_missing_created_by == 0, (
        "Verification should not report missing CREATED_BY when column is present."
    )
    assert result.rows_missing_created_by_backfill == 1, (
        "Verification must report rows where CHANGED_BY is set but CREATED_BY is still NULL."
    )
