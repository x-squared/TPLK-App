from typing import Any

from sqlalchemy.orm import Session

from ....models import (
    Code,
    DatatypeDefinition,
    MedicalValueGroupContextTemplate,
    MedicalValueGroupTemplate,
    MedicalValueTemplate,
    MedicalValueTemplateContextTemplate,
)


def sync_medical_value_templates(db: Session) -> None:
    """Replace all MEDICAL_VALUE_TEMPLATE rows with seed data on every startup."""
    from ...datasets.core.medical_value_templates import RECORDS as mv_records
    group_by_key = {
        row.key: row.id
        for row in db.query(MedicalValueGroupTemplate).all()
    }
    datatype_def_by_code_id = {
        row.code_id: row.id
        for row in db.query(DatatypeDefinition).all()
    }

    organ_by_key = {
        row.key: row.id
        for row in db.query(Code).filter(Code.type == "ORGAN").all()
    }

    def infer_group_key(raw_entry: dict[str, Any]) -> str:
        explicit = raw_entry.get("medical_value_group_key")
        if isinstance(explicit, str) and explicit:
            return explicit
        use_liver = bool(raw_entry.get("use_liver"))
        use_kidney = bool(raw_entry.get("use_kidney"))
        use_heart = bool(raw_entry.get("use_heart"))
        use_lung = bool(raw_entry.get("use_lung"))
        use_donor = bool(raw_entry.get("use_donor"))
        if use_donor and not (use_liver or use_kidney or use_heart or use_lung):
            return "DONOR"
        return "LAB_VALUES"

    def context_rows_from_flags(raw_entry: dict[str, Any], include_static_flag: bool) -> list[tuple[str, int | None]]:
        rows: list[tuple[str, int | None]] = []
        if include_static_flag and bool(raw_entry.get("is_static")):
            rows.append(("STATIC", None))
        if bool(raw_entry.get("use_donor")):
            rows.append(("DONOR", None))
        if bool(raw_entry.get("use_liver")) and organ_by_key.get("LIVER") is not None:
            rows.append(("ORGAN", organ_by_key["LIVER"]))
        if bool(raw_entry.get("use_kidney")) and organ_by_key.get("KIDNEY") is not None:
            rows.append(("ORGAN", organ_by_key["KIDNEY"]))
        if bool(raw_entry.get("use_heart")) and organ_by_key.get("HEART") is not None:
            rows.append(("ORGAN", organ_by_key["HEART"]))
        if bool(raw_entry.get("use_lung")) and organ_by_key.get("LUNG") is not None:
            rows.append(("ORGAN", organ_by_key["LUNG"]))
        if not rows:
            rows.append(("STATIC", None))
        deduped = list(dict.fromkeys(rows))
        return deduped

    db.query(MedicalValueTemplateContextTemplate).delete()
    db.query(MedicalValueTemplate).delete()
    for entry in mv_records:
        raw = dict(entry)
        contexts = context_rows_from_flags(raw, include_static_flag=False)
        datatype_key = raw.pop("datatype_key")
        group_key = infer_group_key(raw)
        raw.setdefault("loinc_code", None)
        raw.setdefault("loinc_display_name", None)
        raw.pop("use_liver", None)
        raw.pop("use_kidney", None)
        raw.pop("use_heart", None)
        raw.pop("use_lung", None)
        raw.pop("use_donor", None)
        raw.pop("medical_value_group_key", None)
        group_id = group_by_key.get(group_key) or group_by_key.get("UNGROUPED")
        code = (
            db.query(Code)
            .filter(Code.type == "DATATYPE", Code.key == datatype_key)
            .first()
        )
        if code:
            template = MedicalValueTemplate(
                datatype_id=code.id,
                datatype_def_id=datatype_def_by_code_id.get(code.id),
                medical_value_group_id=group_id,
                **raw,
            )
            db.add(template)
            db.flush()
            for context_kind, organ_id in contexts:
                db.add(
                    MedicalValueTemplateContextTemplate(
                        medical_value_template_id=template.id,
                        context_kind=context_kind,
                        organ_id=organ_id,
                        changed_by_id=1,
                    )
                )
    db.commit()


def sync_medical_value_groups(db: Session) -> None:
    """Replace all MEDICAL_VALUE_GROUP rows with core group definitions."""
    from ...datasets.core.medical_value_groups import RECORDS as group_records

    organ_by_key = {
        row.key: row.id
        for row in db.query(Code).filter(Code.type == "ORGAN").all()
    }

    def context_rows_from_flags(raw_entry: dict[str, Any]) -> list[tuple[str, int | None]]:
        rows: list[tuple[str, int | None]] = []
        if bool(raw_entry.get("is_static")):
            rows.append(("STATIC", None))
        if bool(raw_entry.get("use_donor")):
            rows.append(("DONOR", None))
        if bool(raw_entry.get("use_liver")) and organ_by_key.get("LIVER") is not None:
            rows.append(("ORGAN", organ_by_key["LIVER"]))
        if bool(raw_entry.get("use_kidney")) and organ_by_key.get("KIDNEY") is not None:
            rows.append(("ORGAN", organ_by_key["KIDNEY"]))
        if bool(raw_entry.get("use_heart")) and organ_by_key.get("HEART") is not None:
            rows.append(("ORGAN", organ_by_key["HEART"]))
        if bool(raw_entry.get("use_lung")) and organ_by_key.get("LUNG") is not None:
            rows.append(("ORGAN", organ_by_key["LUNG"]))
        if not rows:
            rows.append(("STATIC", None))
        deduped = list(dict.fromkeys(rows))
        return deduped

    db.query(MedicalValueGroupContextTemplate).delete()
    db.query(MedicalValueGroupTemplate).delete()
    for entry in group_records:
        raw = dict(entry)
        contexts = context_rows_from_flags(raw)
        raw.pop("is_static", None)
        raw.pop("use_liver", None)
        raw.pop("use_kidney", None)
        raw.pop("use_heart", None)
        raw.pop("use_lung", None)
        raw.pop("use_donor", None)
        group = MedicalValueGroupTemplate(**raw)
        db.add(group)
        db.flush()
        for context_kind, organ_id in contexts:
            db.add(
                MedicalValueGroupContextTemplate(
                    medical_value_group_id=group.id,
                    context_kind=context_kind,
                    organ_id=organ_id,
                    changed_by_id=1,
                )
            )
    db.commit()
