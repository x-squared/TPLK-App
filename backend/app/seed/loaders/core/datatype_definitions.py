from sqlalchemy.orm import Session

from ....models import Code, DatatypeDefinition


def sync_datatype_definitions(db: Session) -> None:
    """Replace all MEDICAL_VALUE_DATATYPE rows with core datatype metadata definitions."""
    from ...datasets.core.datatype_definitions import RECORDS as datatype_records

    db.query(DatatypeDefinition).delete()
    for entry in datatype_records:
        raw = dict(entry)
        code_key = raw.pop("code_key")
        raw.setdefault("canonical_unit_ucum", raw.get("unit"))
        raw.setdefault("allowed_units_ucum_json", None)
        raw.setdefault("conversion_group", None)
        code = (
            db.query(Code)
            .filter(Code.type == "DATATYPE", Code.key == code_key)
            .first()
        )
        if not code:
            continue
        db.add(DatatypeDefinition(code_id=code.id, **raw))
    db.commit()
