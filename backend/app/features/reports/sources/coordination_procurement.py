from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ....models import (
    CoordinationProcurementTypedData,
    CoordinationProcurementTypedDataPersonList,
    CoordinationProcurementTypedDataTeamList,
)
from ..engine import join_unique_text
from ..types import FieldDef, JoinDef, SourceDef


def _person_label(person) -> str:
    if not person:
        return ""
    return f"{person.first_name} {person.surname}".strip()


def _iso(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _bool_text(value) -> str:
    if value is None:
        return ""
    return "true" if bool(value) else "false"


def _enum_value(raw) -> str:
    return raw.value if hasattr(raw, "value") else str(raw or "")


def build_coordination_procurement_source() -> SourceDef:
    fields: tuple[FieldDef, ...] = (
        FieldDef("id", "ID", "number", ("eq", "gte", "lte"), lambda row: row.id),
        FieldDef("coordination_id", "Coordination ID", "number", ("eq", "gte", "lte"), lambda row: row.coordination_id),
        FieldDef("organ_id", "Organ ID", "number", ("eq", "gte", "lte"), lambda row: row.organ_id),
        FieldDef("slot_key", "Slot Key", "string", ("eq", "contains"), lambda row: row.slot_key.value if hasattr(row.slot_key, "value") else (row.slot_key or "")),
        FieldDef("incision_time", "Incision Time", "string", ("eq", "contains"), lambda row: _iso(row.incision_time)),
        FieldDef("cardiac_arrest_time", "Cardiac Arrest Time", "string", ("eq", "contains"), lambda row: _iso(row.cardiac_arrest_time)),
        FieldDef("cold_perfusion", "Cold Perfusion", "string", ("eq", "contains"), lambda row: _iso(row.cold_perfusion)),
        FieldDef("cold_perfusion_abdominal", "Cold Perfusion Abdominal", "string", ("eq", "contains"), lambda row: _iso(row.cold_perfusion_abdominal)),
        FieldDef("ehb_box_nr", "EHB Box Nr", "string", ("eq", "contains"), lambda row: row.ehb_box_nr or ""),
        FieldDef("ehb_nr", "EHB Nr", "string", ("eq", "contains"), lambda row: row.ehb_nr or ""),
        FieldDef("incision_donor_time", "Incision Donor Time", "string", ("eq", "contains"), lambda row: _iso(row.incision_donor_time)),
        FieldDef("nmp_used", "NMP Used", "string", ("eq", "contains"), lambda row: _bool_text(row.nmp_used)),
        FieldDef("cross_clamp_time", "Cross Clamp Time", "string", ("eq", "contains"), lambda row: _iso(row.cross_clamp_time)),
        FieldDef("procurement_team_departure_time", "Procurement Team Departure Time", "string", ("eq", "contains"), lambda row: _iso(row.procurement_team_departure_time)),
        FieldDef("evlp_used", "EVLP Used", "string", ("eq", "contains"), lambda row: _bool_text(row.evlp_used)),
        FieldDef("departure_donor_time", "Departure Donor Time", "string", ("eq", "contains"), lambda row: _iso(row.departure_donor_time)),
        FieldDef("hope_used", "HOPE Used", "string", ("eq", "contains"), lambda row: _bool_text(row.hope_used)),
        FieldDef("arrival_time", "Arrival Time", "string", ("eq", "contains"), lambda row: _iso(row.arrival_time)),
        FieldDef("lifeport_used", "LifePort Used", "string", ("eq", "contains"), lambda row: _bool_text(row.lifeport_used)),
        FieldDef("arzt_responsible_person_id", "Responsible Physician ID", "number", ("eq", "gte", "lte"), lambda row: row.arzt_responsible_person_id),
        FieldDef("chirurg_responsible_person_id", "Responsible Surgeon ID", "number", ("eq", "gte", "lte"), lambda row: row.chirurg_responsible_person_id),
        FieldDef("procurment_team_team_id", "External Procurement Team ID", "number", ("eq", "gte", "lte"), lambda row: row.procurment_team_team_id),
        FieldDef("recipient_episode_id", "Recipient Episode ID", "number", ("eq", "gte", "lte"), lambda row: row.recipient_episode_id),
        FieldDef("created_at", "Created At", "datetime", ("gte", "lte"), lambda row: row.created_at),
        FieldDef("updated_at", "Updated At", "datetime", ("gte", "lte"), lambda row: row.updated_at),
    )

    joins: tuple[JoinDef, ...] = (
        JoinDef(
            key="ORGAN",
            label="Organ",
            fields=(
                FieldDef("organ_key", "Organ Key", "string", ("eq", "contains"), lambda row: row.organ.key if row.organ else ""),
                FieldDef("organ_name", "Organ Name", "string", ("eq", "contains"), lambda row: row.organ.name_default if row.organ else ""),
            ),
        ),
        JoinDef(
            key="PERSON_REFS",
            label="Person Refs",
            fields=(
                FieldDef("on_site_coordinator_ids", "On-site Coordinator IDs", "string", ("eq", "contains"), lambda row: join_unique_text([ref.person_id for ref in sorted((row.person_lists or []), key=lambda item: item.pos) if _enum_value(ref.list_key) == "ON_SITE_COORDINATORS"])),
                FieldDef("procurement_team_int_ids", "Procurement Team Int IDs", "string", ("eq", "contains"), lambda row: join_unique_text([ref.person_id for ref in sorted((row.person_lists or []), key=lambda item: item.pos) if _enum_value(ref.list_key) == "PROCUREMENT_TEAM_INT"])),
                FieldDef("on_site_coordinator_names", "On-site Coordinator Names", "string", ("eq", "contains"), lambda row: join_unique_text([_person_label(ref.person) for ref in sorted((row.person_lists or []), key=lambda item: item.pos) if _enum_value(ref.list_key) == "ON_SITE_COORDINATORS"])),
                FieldDef("procurement_team_int_names", "Procurement Team Int Names", "string", ("eq", "contains"), lambda row: join_unique_text([_person_label(ref.person) for ref in sorted((row.person_lists or []), key=lambda item: item.pos) if _enum_value(ref.list_key) == "PROCUREMENT_TEAM_INT"])),
            ),
        ),
        JoinDef(
            key="TEAM_REFS",
            label="Team Refs",
            fields=(
                FieldDef("implant_team_ids", "Implant Team IDs", "string", ("eq", "contains"), lambda row: join_unique_text([ref.team_id for ref in sorted((row.team_lists or []), key=lambda item: item.pos) if _enum_value(ref.list_key) == "IMPLANT_TEAM"])),
                FieldDef("implant_team_names", "Implant Team Names", "string", ("eq", "contains"), lambda row: join_unique_text([ref.team.name for ref in sorted((row.team_lists or []), key=lambda item: item.pos) if _enum_value(ref.list_key) == "IMPLANT_TEAM" and ref.team])),
            ),
        ),
        JoinDef(
            key="EPISODE_REF",
            label="Episode Ref",
            fields=(
                FieldDef("episode_fall_nr", "Episode Fall Nr", "string", ("eq", "contains"), lambda row: row.recipient_episode.fall_nr if row.recipient_episode else ""),
            ),
        ),
    )

    def query(db: Session) -> list[CoordinationProcurementTypedData]:
        return (
            db.query(CoordinationProcurementTypedData)
            .options(
                joinedload(CoordinationProcurementTypedData.organ),
                joinedload(CoordinationProcurementTypedData.arzt_responsible_person),
                joinedload(CoordinationProcurementTypedData.chirurg_responsible_person),
                joinedload(CoordinationProcurementTypedData.procurment_team_team),
                joinedload(CoordinationProcurementTypedData.recipient_episode),
                joinedload(CoordinationProcurementTypedData.person_lists).joinedload(CoordinationProcurementTypedDataPersonList.person),
                joinedload(CoordinationProcurementTypedData.team_lists).joinedload(CoordinationProcurementTypedDataTeamList.team),
            )
            .all()
        )

    return SourceDef("COORDINATION_PROCUREMENT", "Coordination Procurement", fields, joins, query)
