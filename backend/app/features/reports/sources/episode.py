from __future__ import annotations

from sqlalchemy.orm import Session, joinedload, selectinload

from ....models import Episode, Patient
from ..engine import join_unique_text
from ..types import FieldDef, JoinDef, SourceDef


def _episode_organ_names(row: Episode) -> list[str]:
    names = [organ.name_default for organ in (row.organs or []) if organ and organ.name_default]
    if names:
        return list(dict.fromkeys(names))
    if row.organ and row.organ.name_default:
        return [row.organ.name_default]
    return []


def build_episode_source() -> SourceDef:
    fields: tuple[FieldDef, ...] = (
        FieldDef("id", "ID", "number", ("eq", "gte", "lte"), lambda row: row.id),
        FieldDef("patient_pid", "Patient PID", "string", ("eq", "contains"), lambda row: row.patient.pid if row.patient else ""),
        FieldDef(
            "patient_name",
            "Patient Name",
            "string",
            ("eq", "contains"),
            lambda row: f"{row.patient.first_name} {row.patient.name}".strip() if row.patient else "",
        ),
        FieldDef(
            "organ_name",
            "Primary Organ",
            "string",
            ("eq", "contains"),
            lambda row: _episode_organ_names(row)[0] if _episode_organ_names(row) else "",
        ),
        FieldDef(
            "organ_names",
            "Organs",
            "string",
            ("eq", "contains"),
            lambda row: join_unique_text(_episode_organ_names(row)),
        ),
        FieldDef(
            "organ_count",
            "Organ Count",
            "number",
            ("eq", "gte", "lte"),
            lambda row: len(_episode_organ_names(row)),
        ),
        FieldDef("status_name", "Status", "string", ("eq", "contains"), lambda row: row.status.name_default if row.status else ""),
        FieldDef("start", "Start", "date", ("eq", "gte", "lte"), lambda row: row.start),
        FieldDef("end", "End", "date", ("eq", "gte", "lte"), lambda row: row.end),
        FieldDef("fall_nr", "Fall Nr", "string", ("eq", "contains"), lambda row: row.fall_nr),
        FieldDef("closed", "Closed", "boolean", ("eq",), lambda row: row.closed),
    )

    joins: tuple[JoinDef, ...] = (
        JoinDef(
            key="PATIENT",
            label="Patient",
            fields=(
                FieldDef("patient_ahv_nr", "Patient AHV Nr.", "string", ("eq", "contains"), lambda row: row.patient.ahv_nr if row.patient else ""),
                FieldDef("patient_lang", "Patient Language", "string", ("eq", "contains"), lambda row: row.patient.lang if row.patient else ""),
                FieldDef("patient_translate", "Patient Translate", "boolean", ("eq",), lambda row: row.patient.translate if row.patient else False),
                FieldDef(
                    "patient_sex_name",
                    "Patient Sex",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.patient.sex.name_default if row.patient and row.patient.sex else "",
                ),
            ),
        ),
    )

    def query(db: Session) -> list[Episode]:
        return (
            db.query(Episode)
            .options(
                joinedload(Episode.patient).joinedload(Patient.sex),
                joinedload(Episode.organ),
                selectinload(Episode.organs),
                joinedload(Episode.status),
            )
            .all()
        )

    return SourceDef("EPISODE", "Episodes", fields, joins, query)
