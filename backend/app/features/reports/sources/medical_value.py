from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ....models import MedicalValue, MedicalValueGroup, MedicalValueTemplate
from ..types import FieldDef, JoinDef, SourceDef


def build_medical_value_source() -> SourceDef:
    fields: tuple[FieldDef, ...] = (
        FieldDef("id", "ID", "number", ("eq", "gte", "lte"), lambda row: row.id),
        FieldDef("patient_id", "Patient ID", "number", ("eq", "gte", "lte"), lambda row: row.patient_id),
        FieldDef("name", "Name", "string", ("eq", "contains"), lambda row: row.name or ""),
        FieldDef("value", "Value", "string", ("eq", "contains"), lambda row: row.value_canonical or row.value or ""),
        FieldDef("value_input", "Value Input", "string", ("eq", "contains"), lambda row: row.value_input or ""),
        FieldDef("unit_input_ucum", "Input Unit UCUM", "string", ("eq", "contains"), lambda row: row.unit_input_ucum or ""),
        FieldDef(
            "unit_canonical_ucum",
            "Canonical Unit UCUM",
            "string",
            ("eq", "contains"),
            lambda row: row.unit_canonical_ucum or "",
        ),
        FieldDef(
            "normalization_status",
            "Normalization Status",
            "string",
            ("eq", "contains"),
            lambda row: row.normalization_status or "",
        ),
        FieldDef("pos", "Position", "number", ("eq", "gte", "lte"), lambda row: row.pos or 0),
        FieldDef("context_key", "Context Key", "string", ("eq", "contains"), lambda row: row.context_key or ""),
        FieldDef("is_donor_context", "Donor Context", "boolean", ("eq",), lambda row: bool(row.is_donor_context)),
        FieldDef("renew_date", "Renew Date", "date", ("eq", "gte", "lte"), lambda row: row.renew_date),
        FieldDef("created_at", "Created At", "datetime", ("gte", "lte"), lambda row: row.created_at),
        FieldDef("updated_at", "Updated At", "datetime", ("gte", "lte"), lambda row: row.updated_at),
    )

    joins: tuple[JoinDef, ...] = (
        JoinDef(
            key="PATIENT",
            label="Patient",
            fields=(
                FieldDef("patient_pid", "Patient PID", "string", ("eq", "contains"), lambda row: row.patient.pid if row.patient else ""),
                FieldDef(
                    "patient_name",
                    "Patient Name",
                    "string",
                    ("eq", "contains"),
                    lambda row: f"{row.patient.first_name} {row.patient.name}".strip() if row.patient else "",
                ),
            ),
        ),
        JoinDef(
            key="TEMPLATE",
            label="Template",
            fields=(
                FieldDef(
                    "template_name",
                    "Template Name",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.medical_value_template.name_default if row.medical_value_template else "",
                ),
                FieldDef(
                    "template_lab_key",
                    "Template Lab Key",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.medical_value_template.lab_key if row.medical_value_template else "",
                ),
                FieldDef(
                    "template_kis_key",
                    "Template KIS Key",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.medical_value_template.kis_key if row.medical_value_template else "",
                ),
                FieldDef(
                    "template_pos",
                    "Template Position",
                    "number",
                    ("eq", "gte", "lte"),
                    lambda row: row.medical_value_template.pos if row.medical_value_template else 0,
                ),
                FieldDef(
                    "template_is_main",
                    "Template Is Main",
                    "boolean",
                    ("eq",),
                    lambda row: bool(row.medical_value_template.is_main) if row.medical_value_template else False,
                ),
            ),
        ),
        JoinDef(
            key="GROUP",
            label="Group",
            fields=(
                FieldDef(
                    "group_key",
                    "Group Key",
                    "string",
                    ("eq", "contains"),
                    lambda row: (
                        row.medical_value_group.medical_value_group_template.key
                        if row.medical_value_group and row.medical_value_group.medical_value_group_template
                        else (row.medical_value_group_template.key if row.medical_value_group_template else "")
                    ),
                ),
                FieldDef(
                    "group_name",
                    "Group Name",
                    "string",
                    ("eq", "contains"),
                    lambda row: (
                        row.medical_value_group.medical_value_group_template.name_default
                        if row.medical_value_group and row.medical_value_group.medical_value_group_template
                        else (row.medical_value_group_template.name_default if row.medical_value_group_template else "")
                    ),
                ),
                FieldDef(
                    "group_pos",
                    "Group Position",
                    "number",
                    ("eq", "gte", "lte"),
                    lambda row: (
                        row.medical_value_group.medical_value_group_template.pos
                        if row.medical_value_group and row.medical_value_group.medical_value_group_template
                        else (row.medical_value_group_template.pos if row.medical_value_group_template else 0)
                    ),
                ),
                FieldDef(
                    "group_instance_renew_date",
                    "Group Instance Renew Date",
                    "date",
                    ("eq", "gte", "lte"),
                    lambda row: row.medical_value_group.renew_date if row.medical_value_group else None,
                ),
            ),
        ),
        JoinDef(
            key="DATATYPE",
            label="Datatype",
            fields=(
                FieldDef(
                    "datatype_key",
                    "Datatype Key",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.datatype.key if row.datatype else "",
                ),
                FieldDef(
                    "datatype_name",
                    "Datatype Name",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.datatype.name_default if row.datatype else "",
                ),
            ),
        ),
        JoinDef(
            key="DATATYPE_DEFINITION",
            label="Datatype Definition",
            fields=(
                FieldDef(
                    "datatype_primitive_kind",
                    "Datatype Primitive Kind",
                    "string",
                    ("eq", "contains"),
                    lambda row: (
                        row.medical_value_template.datatype_definition.primitive_kind
                        if row.medical_value_template and row.medical_value_template.datatype_definition
                        else ""
                    ),
                ),
                FieldDef(
                    "datatype_unit",
                    "Datatype Unit",
                    "string",
                    ("eq", "contains"),
                    lambda row: (
                        row.medical_value_template.datatype_definition.unit
                        if row.medical_value_template and row.medical_value_template.datatype_definition
                        else ""
                    ),
                ),
            ),
        ),
        JoinDef(
            key="ORGAN_CONTEXT",
            label="Organ Context",
            fields=(
                FieldDef("organ_id", "Organ ID", "number", ("eq", "gte", "lte"), lambda row: row.organ_id),
                FieldDef(
                    "organ_name",
                    "Organ Name",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.organ.name_default if row.organ else "",
                ),
            ),
        ),
    )

    def query(db: Session) -> list[MedicalValue]:
        return (
            db.query(MedicalValue)
            .options(
                joinedload(MedicalValue.patient),
                joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.medical_value_group_template),
                joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.datatype_definition),
                joinedload(MedicalValue.medical_value_group_template),
                joinedload(MedicalValue.medical_value_group).joinedload(MedicalValueGroup.medical_value_group_template),
                joinedload(MedicalValue.datatype),
                joinedload(MedicalValue.organ),
            )
            .all()
        )

    return SourceDef("MEDICAL_VALUE", "Medical Values", fields, joins, query)
