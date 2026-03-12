from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from fastapi import HTTPException

from ...models import DatatypeDefinition


@dataclass
class NormalizedMedicalValue:
    value_input: str
    unit_input_ucum: str | None
    value_canonical: str
    unit_canonical_ucum: str | None
    normalization_status: str
    normalization_error: str
    value_legacy: str


_UNIT_FACTORS: dict[str, tuple[str, Decimal]] = {
    "1": ("dimensionless", Decimal("1")),
    "kg": ("mass", Decimal("1")),
    "g": ("mass", Decimal("0.001")),
    "cm": ("length", Decimal("1")),
    "m": ("length", Decimal("100")),
}


def _parse_allowed_units(raw_json: str | None) -> list[str]:
    if not raw_json:
        return []
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    result: list[str] = []
    for item in parsed:
        if isinstance(item, str) and item.strip():
            result.append(item.strip())
    return result


def _quantize_decimal(value: Decimal, precision: int | None) -> Decimal:
    if precision is None or precision < 0:
        return value
    if precision == 0:
        return value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    quant = Decimal("1").scaleb(-precision)
    return value.quantize(quant, rounding=ROUND_HALF_UP)


def normalize_medical_value(
    *,
    raw_value: str,
    unit_input_ucum: str | None,
    datatype_definition: DatatypeDefinition | None,
) -> NormalizedMedicalValue:
    value_input = raw_value or ""
    input_unit = (unit_input_ucum or "").strip() or None

    if datatype_definition is None:
        return NormalizedMedicalValue(
            value_input=value_input,
            unit_input_ucum=input_unit,
            value_canonical=value_input,
            unit_canonical_ucum=input_unit,
            normalization_status="NO_METADATA",
            normalization_error="",
            value_legacy=value_input,
        )

    primitive = (datatype_definition.primitive_kind or "text").strip().lower()
    canonical_unit = (
        (datatype_definition.canonical_unit_ucum or "").strip()
        or (datatype_definition.unit or "").strip()
        or None
    )
    allowed_units = _parse_allowed_units(datatype_definition.allowed_units_ucum_json)
    if not allowed_units and canonical_unit:
        allowed_units = [canonical_unit]

    if input_unit and allowed_units and input_unit not in allowed_units:
        raise HTTPException(status_code=422, detail=f"unit_input_ucum '{input_unit}' is not allowed for this datatype")

    if primitive != "number":
        # Non-numeric values are not converted; canonical mirrors input.
        return NormalizedMedicalValue(
            value_input=value_input,
            unit_input_ucum=input_unit,
            value_canonical=value_input,
            unit_canonical_ucum=canonical_unit or input_unit,
            normalization_status="NORMALIZED",
            normalization_error="",
            value_legacy=value_input,
        )

    if not value_input.strip():
        return NormalizedMedicalValue(
            value_input=value_input,
            unit_input_ucum=input_unit,
            value_canonical="",
            unit_canonical_ucum=canonical_unit or input_unit,
            normalization_status="NORMALIZED",
            normalization_error="",
            value_legacy="",
        )

    try:
        numeric_value = Decimal(value_input.strip())
    except InvalidOperation as exc:
        raise HTTPException(status_code=422, detail="Value must be numeric for this datatype") from exc

    if not canonical_unit:
        normalized = _quantize_decimal(numeric_value, datatype_definition.precision)
        normalized_text = format(normalized, "f").rstrip("0").rstrip(".") if "." in format(normalized, "f") else format(normalized, "f")
        return NormalizedMedicalValue(
            value_input=value_input,
            unit_input_ucum=input_unit,
            value_canonical=normalized_text,
            unit_canonical_ucum=None,
            normalization_status="NORMALIZED",
            normalization_error="",
            value_legacy=normalized_text,
        )

    effective_input_unit = input_unit or canonical_unit
    if effective_input_unit == canonical_unit:
        normalized = _quantize_decimal(numeric_value, datatype_definition.precision)
    else:
        source = _UNIT_FACTORS.get(effective_input_unit)
        target = _UNIT_FACTORS.get(canonical_unit)
        expected_group = (datatype_definition.conversion_group or "").strip() or None
        if source is None or target is None:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported unit conversion: {effective_input_unit} -> {canonical_unit}",
            )
        if source[0] != target[0]:
            raise HTTPException(status_code=422, detail="Incompatible unit dimensions for conversion")
        if expected_group and source[0] != expected_group:
            raise HTTPException(status_code=422, detail="Configured conversion_group does not match unit dimensions")
        normalized_base = numeric_value * source[1]
        normalized = _quantize_decimal(normalized_base / target[1], datatype_definition.precision)

    normalized_text = format(normalized, "f").rstrip("0").rstrip(".") if "." in format(normalized, "f") else format(normalized, "f")
    return NormalizedMedicalValue(
        value_input=value_input,
        unit_input_ucum=effective_input_unit,
        value_canonical=normalized_text,
        unit_canonical_ucum=canonical_unit,
        normalization_status="NORMALIZED",
        normalization_error="",
        value_legacy=normalized_text,
    )
