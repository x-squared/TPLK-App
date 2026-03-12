from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Engine, inspect, text


@dataclass
class MedicalValueUnitVerificationResult:
    tables_checked: int
    template_rows_missing_loinc: int
    numeric_datatypes_missing_canonical_unit: int
    value_rows_missing_normalization_status: int
    value_rows_missing_canonical_value: int

    @property
    def issue_count(self) -> int:
        return (
            self.template_rows_missing_loinc
            + self.numeric_datatypes_missing_canonical_unit
            + self.value_rows_missing_normalization_status
            + self.value_rows_missing_canonical_value
        )


def verify_medical_value_unit_coverage(*, engine: Engine) -> MedicalValueUnitVerificationResult:
    """Check LOINC/UCUM rollout completeness for templates, datatypes, and runtime values."""
    with engine.begin() as conn:
        inspector = inspect(conn)
        table_names = set(inspector.get_table_names())
        tables_checked = 0

        template_rows_missing_loinc = 0
        if "MEDICAL_VALUE_TEMPLATE" in table_names:
            tables_checked += 1
            template_rows_missing_loinc = int(
                conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "MEDICAL_VALUE_TEMPLATE" '
                        'WHERE COALESCE(TRIM("LOINC_CODE"), \'\') = \'\''
                    )
                ).scalar_one()
            )

        numeric_datatypes_missing_canonical_unit = 0
        if "MEDICAL_VALUE_DATATYPE" in table_names:
            tables_checked += 1
            numeric_datatypes_missing_canonical_unit = int(
                conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "MEDICAL_VALUE_DATATYPE" '
                        "WHERE LOWER(COALESCE(TRIM(\"PRIMITIVE_KIND\"), '')) = 'number' "
                        'AND COALESCE(TRIM("CANONICAL_UNIT_UCUM"), \'\') = \'\''
                    )
                ).scalar_one()
            )

        value_rows_missing_normalization_status = 0
        value_rows_missing_canonical_value = 0
        if "MEDICAL_VALUE" in table_names:
            tables_checked += 1
            value_rows_missing_normalization_status = int(
                conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "MEDICAL_VALUE" '
                        'WHERE COALESCE(TRIM("NORMALIZATION_STATUS"), \'\') = \'\''
                    )
                ).scalar_one()
            )
            value_rows_missing_canonical_value = int(
                conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "MEDICAL_VALUE" '
                        'WHERE COALESCE(TRIM("VALUE_INPUT"), \'\') <> \'\' '
                        'AND COALESCE(TRIM("VALUE_CANONICAL"), \'\') = \'\''
                    )
                ).scalar_one()
            )

    return MedicalValueUnitVerificationResult(
        tables_checked=tables_checked,
        template_rows_missing_loinc=template_rows_missing_loinc,
        numeric_datatypes_missing_canonical_unit=numeric_datatypes_missing_canonical_unit,
        value_rows_missing_normalization_status=value_rows_missing_normalization_status,
        value_rows_missing_canonical_value=value_rows_missing_canonical_value,
    )
