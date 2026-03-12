from __future__ import annotations

from types import SimpleNamespace

from sqlalchemy import create_engine, text

from app.features.medical_values.verification import verify_medical_value_unit_coverage
from app.features.reports.sources.medical_value import build_medical_value_source


def test_verify_medical_value_unit_coverage_reports_missing_fields(tmp_path) -> None:
    """Coverage verification should detect missing LOINC/UCUM and normalization gaps."""
    db_path = tmp_path / "mv-verify.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

    with engine.begin() as conn:
        conn.execute(
            text(
                'CREATE TABLE "MEDICAL_VALUE_TEMPLATE" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"LOINC_CODE" VARCHAR(32)'
                ")"
            )
        )
        conn.execute(text('INSERT INTO "MEDICAL_VALUE_TEMPLATE" ("ID", "LOINC_CODE") VALUES (1, \'\')'))
        conn.execute(
            text(
                'CREATE TABLE "MEDICAL_VALUE_DATATYPE" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"PRIMITIVE_KIND" VARCHAR(32), '
                '"CANONICAL_UNIT_UCUM" VARCHAR(32)'
                ")"
            )
        )
        conn.execute(
            text(
                'INSERT INTO "MEDICAL_VALUE_DATATYPE" ("ID", "PRIMITIVE_KIND", "CANONICAL_UNIT_UCUM") '
                "VALUES (1, 'number', '')"
            )
        )
        conn.execute(
            text(
                'CREATE TABLE "MEDICAL_VALUE" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"VALUE_INPUT" VARCHAR, '
                '"VALUE_CANONICAL" VARCHAR, '
                '"NORMALIZATION_STATUS" VARCHAR(32)'
                ")"
            )
        )
        conn.execute(
            text(
                'INSERT INTO "MEDICAL_VALUE" ("ID", "VALUE_INPUT", "VALUE_CANONICAL", "NORMALIZATION_STATUS") '
                "VALUES (1, '12', '', '')"
            )
        )

    result = verify_medical_value_unit_coverage(engine=engine)
    assert result.template_rows_missing_loinc == 1, (
        "Verification must count template rows without LOINC codes."
    )
    assert result.numeric_datatypes_missing_canonical_unit == 1, (
        "Verification must count numeric datatypes without canonical UCUM units."
    )
    assert result.value_rows_missing_normalization_status == 1, (
        "Verification must detect runtime rows without normalization status."
    )
    assert result.value_rows_missing_canonical_value == 1, (
        "Verification must detect runtime rows with input but missing canonical value."
    )
    assert result.issue_count == 4, "Issue count should aggregate all missing-coverage categories."


def test_medical_value_report_prefers_canonical_value() -> None:
    """Report source should expose canonical value first and fallback to legacy value."""
    source = build_medical_value_source()
    field_by_key = {field.key: field for field in source.fields}
    value_getter = field_by_key["value"].getter

    canonical_row = SimpleNamespace(value_canonical="2.5", value="2500")
    legacy_row = SimpleNamespace(value_canonical="", value="2500")

    assert value_getter(canonical_row) == "2.5", (
        "Report value field should prefer canonical value when available."
    )
    assert value_getter(legacy_row) == "2500", (
        "Report value field should fallback to legacy value only when canonical value is missing."
    )


def test_verify_medical_value_unit_coverage_passes_for_fully_populated_rows(tmp_path) -> None:
    """Coverage verification should report zero issues when LOINC, UCUM, and runtime fields are complete."""
    db_path = tmp_path / "mv-verify-pass.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

    with engine.begin() as conn:
        conn.execute(
            text(
                'CREATE TABLE "MEDICAL_VALUE_TEMPLATE" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"LOINC_CODE" VARCHAR(32)'
                ")"
            )
        )
        conn.execute(text('INSERT INTO "MEDICAL_VALUE_TEMPLATE" ("ID", "LOINC_CODE") VALUES (1, \'8302-2\')'))
        conn.execute(
            text(
                'CREATE TABLE "MEDICAL_VALUE_DATATYPE" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"PRIMITIVE_KIND" VARCHAR(32), '
                '"CANONICAL_UNIT_UCUM" VARCHAR(32)'
                ")"
            )
        )
        conn.execute(
            text(
                'INSERT INTO "MEDICAL_VALUE_DATATYPE" ("ID", "PRIMITIVE_KIND", "CANONICAL_UNIT_UCUM") '
                "VALUES (1, 'number', '1')"
            )
        )
        conn.execute(
            text(
                'CREATE TABLE "MEDICAL_VALUE" ('
                '"ID" INTEGER PRIMARY KEY, '
                '"VALUE_INPUT" VARCHAR, '
                '"VALUE_CANONICAL" VARCHAR, '
                '"NORMALIZATION_STATUS" VARCHAR(32)'
                ")"
            )
        )
        conn.execute(
            text(
                'INSERT INTO "MEDICAL_VALUE" ("ID", "VALUE_INPUT", "VALUE_CANONICAL", "NORMALIZATION_STATUS") '
                "VALUES (1, '12', '12', 'NORMALIZED')"
            )
        )

    result = verify_medical_value_unit_coverage(engine=engine)
    assert result.issue_count == 0, (
        "Strict verification should pass when all required LOINC/UCUM and runtime normalization fields are populated."
    )
    assert result.template_rows_missing_loinc == 0, (
        "Template coverage should report no missing LOINC codes in the compliant fixture."
    )
    assert result.numeric_datatypes_missing_canonical_unit == 0, (
        "Numeric datatype coverage should report no missing canonical UCUM units in the compliant fixture."
    )
    assert result.value_rows_missing_normalization_status == 0, (
        "Runtime coverage should report no missing normalization statuses in the compliant fixture."
    )
    assert result.value_rows_missing_canonical_value == 0, (
        "Runtime coverage should report no missing canonical values for populated inputs."
    )
