from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.features.medical_values.normalization import normalize_medical_value
from app.features.medical_values.service import create_medical_value_for_patient, update_medical_value_for_patient
from app.models import Code, DatatypeDefinition, MedicalValueGroupTemplate, Patient
from app.schemas import MedicalValueCreate, MedicalValueUpdate


def test_normalize_numeric_value_converts_input_unit_to_canonical(db_session: Session) -> None:
    """Verify number normalization converts from allowed input UCUM unit to canonical unit."""
    datatype = DatatypeDefinition(
        code_id=1,
        primitive_kind="number",
        unit="kg",
        canonical_unit_ucum="kg",
        allowed_units_ucum_json='["kg","g"]',
        conversion_group="mass",
        precision=3,
    )
    normalized = normalize_medical_value(
        raw_value="2500",
        unit_input_ucum="g",
        datatype_definition=datatype,
    )
    assert normalized.value_canonical == "2.5", (
        "2500 g should normalize to canonical 2.5 kg when mass conversion is configured."
    )
    assert normalized.unit_canonical_ucum == "kg", (
        "Canonical unit should remain kg after conversion."
    )


def test_medical_value_service_persists_normalized_fields(db_session: Session, user_factory) -> None:
    """Verify create/update flows persist input and canonical value fields consistently."""
    actor = user_factory(ext_id="MV_UNIT_ACTOR")
    datatype_code = Code(type="DATATYPE", key="KG", pos=1, name_default="Kilogram")
    group = MedicalValueGroupTemplate(key="USER_CAPTURED", name_default="User Captured", pos=1)
    patient = Patient(
        pid="MVU-001",
        first_name="Unit",
        name="Patient",
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add_all([datatype_code, group, patient])
    db_session.flush()
    datatype_def = DatatypeDefinition(
        code_id=datatype_code.id,
        primitive_kind="number",
        unit="kg",
        canonical_unit_ucum="kg",
        allowed_units_ucum_json='["kg","g"]',
        conversion_group="mass",
        precision=3,
    )
    db_session.add(datatype_def)
    db_session.commit()

    created = create_medical_value_for_patient(
        patient_id=patient.id,
        payload=MedicalValueCreate(
            datatype_id=datatype_code.id,
            medical_value_group_id=group.id,
            name="Weight",
            value_input="2500",
            unit_input_ucum="g",
        ),
        changed_by_id=actor.id,
        db=db_session,
    )
    assert created.value_input == "2500", "Service should keep raw user input for traceability."
    assert created.value_canonical == "2.5", "Service should store canonical normalized value for computations."
    assert created.value == "2.5", "Legacy value field should mirror canonical value for backward compatibility."

    updated = update_medical_value_for_patient(
        patient_id=patient.id,
        medical_value_id=created.id,
        payload=MedicalValueUpdate(value_input="3", unit_input_ucum="kg"),
        changed_by_id=actor.id,
        db=db_session,
    )
    assert updated.value_canonical == "3", "Update should recompute canonical value when input payload changes."
    assert updated.unit_canonical_ucum == "kg", "Canonical unit should remain configured datatype unit."


def test_normalize_dimensionless_numeric_value_with_ucum_one() -> None:
    """Verify dimensionless UCUM unit `1` normalizes deterministically for generic numeric datatypes."""
    datatype = DatatypeDefinition(
        code_id=1,
        primitive_kind="number",
        unit="1",
        canonical_unit_ucum="1",
        allowed_units_ucum_json='["1"]',
        conversion_group="dimensionless",
        precision=3,
    )
    normalized = normalize_medical_value(
        raw_value="12.340",
        unit_input_ucum=None,
        datatype_definition=datatype,
    )
    assert normalized.value_canonical == "12.34", (
        "Dimensionless numbers should be rounded/trimmed using datatype precision."
    )
    assert normalized.unit_canonical_ucum == "1", (
        "Generic numeric datatypes should now persist canonical UCUM unit `1`."
    )
    assert normalized.normalization_status == "NORMALIZED", (
        "Dimensionless normalization should still report successful normalization status."
    )
