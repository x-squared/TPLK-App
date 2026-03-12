from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ....models import Patient, User
from ..types import FieldDef, JoinDef, SourceDef


def build_patient_source() -> SourceDef:
    fields: tuple[FieldDef, ...] = (
        FieldDef("id", "ID", "number", ("eq", "gte", "lte"), lambda row: row.id),
        FieldDef("pid", "PID", "string", ("eq", "contains"), lambda row: row.pid),
        FieldDef("first_name", "First Name", "string", ("eq", "contains"), lambda row: row.first_name),
        FieldDef("name", "Name", "string", ("eq", "contains"), lambda row: row.name),
        FieldDef("date_of_birth", "Date of Birth", "date", ("eq", "gte", "lte"), lambda row: row.date_of_birth),
        FieldDef("ahv_nr", "AHV Nr.", "string", ("eq", "contains"), lambda row: row.ahv_nr),
        FieldDef("lang", "Language", "string", ("eq", "contains"), lambda row: row.lang),
        FieldDef("translate", "Translate", "boolean", ("eq",), lambda row: row.translate),
        FieldDef("resp_coord_name", "Responsible Coord.", "string", ("eq", "contains"), lambda row: row.resp_coord.name if row.resp_coord else ""),
        FieldDef("created_at", "Created At", "datetime", ("gte", "lte"), lambda row: row.created_at),
    )

    joins: tuple[JoinDef, ...] = (
        JoinDef(
            key="RESP_COORD",
            label="Responsible Coordinator",
            fields=(
                FieldDef(
                    "resp_coord_ext_id",
                    "Resp. Coord. Ext ID",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.resp_coord.ext_id if row.resp_coord else "",
                ),
                FieldDef(
                    "resp_coord_role",
                    "Resp. Coord. Role",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.resp_coord.role.name_default if row.resp_coord and row.resp_coord.role else "",
                ),
            ),
        ),
    )

    def query(db: Session) -> list[Patient]:
        return (
            db.query(Patient)
            .options(
                joinedload(Patient.resp_coord).joinedload(User.role),
            )
            .all()
        )

    return SourceDef("PATIENT", "Patients", fields, joins, query)
