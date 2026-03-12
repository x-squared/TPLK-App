from sqlalchemy.orm import Session

from ....models import (
    Code,
    CoordinationProcurementFieldGroupTemplate,
    CoordinationProcurementFieldScopeTemplate,
    CoordinationProcurementFieldTemplate,
    DatatypeDefinition,
)
from ....features.coordination_procurement_flex.catalog import PROCUREMENT_TYPED_SPEC_BY_KEY


def sync_coordination_procurement_field_templates(db: Session) -> None:
    """Replace procurement field templates with fixed typed-model overlay definitions."""
    from ...datasets.core.coordination_procurement_field_templates import GROUPS as groups
    from ...datasets.core.coordination_procurement_field_templates import RECORDS as records

    datatype_def_by_code_key = {
        row.code.key: row.id
        for row in db.query(DatatypeDefinition).all()
        if row.code is not None
    }

    db.query(CoordinationProcurementFieldTemplate).delete()
    db.query(CoordinationProcurementFieldGroupTemplate).delete()

    group_by_key: dict[str, CoordinationProcurementFieldGroupTemplate] = {}
    grouped_records = [dict(entry) for entry in records]
    grouped_group_records = [dict(entry) for entry in groups]

    for index, group_entry in enumerate(grouped_group_records):
        group_key = group_entry.get("key")
        if not group_key:
            continue
        if group_key in group_by_key:
            continue
        group = CoordinationProcurementFieldGroupTemplate(
            key=group_key,
            name_default=group_entry.get("name_default") or group_key.replace("_", " ").title(),
            comment=group_entry.get("comment", ""),
            is_active=group_entry.get("is_active", True),
            display_lane=group_entry.get("display_lane", "PRIMARY"),
            pos=group_entry.get("pos", index),
            changed_by_id=1,
        )
        db.add(group)
        db.flush()
        group_by_key[group_key] = group

    # Backwards-compatibility: if a group is only described inline on records,
    # still materialize it.
    for index, entry in enumerate(grouped_records):
        group_key = entry.get("group_key")
        if not group_key:
            continue
        if group_key in group_by_key:
            continue
        group = CoordinationProcurementFieldGroupTemplate(
            key=group_key,
            name_default=entry.get("group_name_default") or group_key.replace("_", " ").title(),
            comment=entry.get("group_comment", ""),
            is_active=entry.get("group_is_active", True),
            display_lane=entry.get("group_display_lane", "PRIMARY"),
            pos=index,
            changed_by_id=1,
        )
        db.add(group)
        db.flush()
        group_by_key[group_key] = group

    for raw in grouped_records:
        datatype_key = raw.pop("datatype_key")
        group_key = raw.pop("group_key", None)
        field_key = raw.get("key")
        if not field_key or field_key not in PROCUREMENT_TYPED_SPEC_BY_KEY:
            raise RuntimeError(f"Unknown procurement field template key for typed model: {field_key!r}")
        raw.pop("group_name_default", None)
        raw.pop("group_comment", None)
        raw.pop("group_is_active", None)
        raw.pop("group_display_lane", None)
        datatype_def_id = datatype_def_by_code_key.get(datatype_key)
        if datatype_def_id is None:
            continue
        db.add(
            CoordinationProcurementFieldTemplate(
                datatype_def_id=datatype_def_id,
                group_template_id=group_by_key[group_key].id if group_key and group_key in group_by_key else None,
                changed_by_id=1,
                **raw,
            )
        )
    db.commit()


def sync_coordination_procurement_field_scopes(db: Session) -> None:
    """Replace procurement field scope templates with core definitions."""
    from ...datasets.core.coordination_procurement_field_scopes import RECORDS as records

    field_by_key = {
        row.key: row.id
        for row in db.query(CoordinationProcurementFieldTemplate).all()
    }
    organ_by_key = {
        row.key: row.id
        for row in db.query(Code).filter(Code.type == "ORGAN").all()
    }

    db.query(CoordinationProcurementFieldScopeTemplate).delete()
    for entry in records:
        raw = dict(entry)
        field_id = field_by_key.get(raw.pop("field_key"))
        organ_id = organ_by_key.get(raw.pop("organ_key"))
        if field_id is None or organ_id is None:
            continue
        db.add(
            CoordinationProcurementFieldScopeTemplate(
                field_template_id=field_id,
                organ_id=organ_id,
                changed_by_id=1,
                **raw,
            )
        )
    db.commit()
