from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from ...model.coordination_procurement import (
    CoordinationProcurementTypedData,
    ProcurementPersonListKey,
    ProcurementTeamListKey,
)


@dataclass(frozen=True)
class ProcurementTypedFieldSpec:
    key: str
    column: str | None
    kind: str


# Fixed procurement attribute catalog: field-template key -> explicit typed model target.
PROCUREMENT_TYPED_FIELD_CATALOG: tuple[ProcurementTypedFieldSpec, ...] = (
    ProcurementTypedFieldSpec("INCISION_TIME", "incision_time", "datetime"),
    ProcurementTypedFieldSpec("CARDIAC_ARREST_TIME", "cardiac_arrest_time", "datetime"),
    ProcurementTypedFieldSpec("COLD_PERFUSION", "cold_perfusion", "datetime"),
    ProcurementTypedFieldSpec("COLD_PERFUSION_ABDOMINAL", "cold_perfusion_abdominal", "datetime"),
    ProcurementTypedFieldSpec("EHB_BOX_NR", "ehb_box_nr", "string"),
    ProcurementTypedFieldSpec("EHB_NR", "ehb_nr", "string"),
    ProcurementTypedFieldSpec("INCISION_DONOR_TIME", "incision_donor_time", "datetime"),
    ProcurementTypedFieldSpec("NMP_USED", "nmp_used", "boolean"),
    ProcurementTypedFieldSpec("CROSS_CLAMP_TIME", "cross_clamp_time", "datetime"),
    ProcurementTypedFieldSpec("PROCUREMENT_TEAM_DEPARTURE_TIME", "procurement_team_departure_time", "datetime"),
    ProcurementTypedFieldSpec("EVLP_USED", "evlp_used", "boolean"),
    ProcurementTypedFieldSpec("DEPARTURE_DONOR_TIME", "departure_donor_time", "datetime"),
    ProcurementTypedFieldSpec("HOPE_USED", "hope_used", "boolean"),
    ProcurementTypedFieldSpec("ARRIVAL_TIME", "arrival_time", "datetime"),
    ProcurementTypedFieldSpec("LIFEPORT_USED", "lifeport_used", "boolean"),
    ProcurementTypedFieldSpec("ARZT_RESPONSIBLE", "arzt_responsible_person_id", "person_single"),
    ProcurementTypedFieldSpec("CHIRURG_RESPONSIBLE", "chirurg_responsible_person_id", "person_single"),
    ProcurementTypedFieldSpec("PROCURMENT_TEAM", "procurment_team_team_id", "team_single"),
    ProcurementTypedFieldSpec("RECIPIENT", "recipient_episode_id", "episode_single"),
    ProcurementTypedFieldSpec("ON_SITE_COORDINATORS", None, "person_list"),
    ProcurementTypedFieldSpec("PROCUREMENT_TEAM_INT", None, "person_list"),
    ProcurementTypedFieldSpec("IMPLANT_TEAM", None, "team_list"),
)

PROCUREMENT_TYPED_SPEC_BY_KEY = {entry.key: entry for entry in PROCUREMENT_TYPED_FIELD_CATALOG}

PERSON_LIST_KEY_BY_FIELD = {
    "ON_SITE_COORDINATORS": ProcurementPersonListKey.ON_SITE_COORDINATORS.value,
    "PROCUREMENT_TEAM_INT": ProcurementPersonListKey.PROCUREMENT_TEAM_INT.value,
}

TEAM_LIST_KEY_BY_FIELD = {
    "IMPLANT_TEAM": ProcurementTeamListKey.IMPLANT_TEAM.value,
}


def parse_scalar_value(kind: str, raw_value: str) -> Any:
    if kind == "string":
        return raw_value
    if kind == "boolean":
        normalized = raw_value.strip().lower()
        return normalized in {"1", "true", "yes", "y", "on"}
    if kind == "date":
        if not raw_value.strip():
            return None
        return date.fromisoformat(raw_value.strip())
    if kind == "datetime":
        if not raw_value.strip():
            return None
        # Accept plain "YYYY-MM-DDTHH:MM" and ISO variants.
        normalized = raw_value.strip()
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"
        return datetime.fromisoformat(normalized)
    return raw_value


def format_scalar_value(kind: str, value: Any) -> str:
    if value is None:
        return ""
    if kind == "boolean":
        return "true" if bool(value) else "false"
    if kind == "date" and isinstance(value, date):
        return value.isoformat()
    if kind == "datetime" and isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def get_typed_column_value(row: CoordinationProcurementTypedData, key: str) -> Any:
    spec = PROCUREMENT_TYPED_SPEC_BY_KEY.get(key)
    if not spec or not spec.column:
        return None
    return getattr(row, spec.column)


def set_typed_column_value(row: CoordinationProcurementTypedData, key: str, value: Any) -> None:
    spec = PROCUREMENT_TYPED_SPEC_BY_KEY.get(key)
    if not spec or not spec.column:
        return
    setattr(row, spec.column, value)
