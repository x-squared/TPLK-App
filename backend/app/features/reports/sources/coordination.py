from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ....models import Coordination, CoordinationDonor, CoordinationEpisode, Episode
from ..engine import join_unique_text
from ..types import FieldDef, JoinDef, SourceDef


def build_coordination_source() -> SourceDef:
    fields: tuple[FieldDef, ...] = (
        FieldDef("id", "ID", "number", ("eq", "gte", "lte"), lambda row: row.id),
        FieldDef("start", "Start", "date", ("eq", "gte", "lte"), lambda row: row.start),
        FieldDef("end", "End", "date", ("eq", "gte", "lte"), lambda row: row.end),
        FieldDef("status_name", "Status", "string", ("eq", "contains"), lambda row: row.status.name_default if row.status else ""),
        FieldDef("donor_nr", "Donor Nr", "string", ("eq", "contains"), lambda row: row.donor_nr),
        FieldDef("swtpl_nr", "SWTPL Nr", "string", ("eq", "contains"), lambda row: row.swtpl_nr),
        FieldDef("national_coordinator", "National Coordinator", "string", ("eq", "contains"), lambda row: row.national_coordinator),
        FieldDef("donor_full_name", "Donor Name", "string", ("eq", "contains"), lambda row: row.donor.full_name if row.donor else ""),
        FieldDef("created_at", "Created At", "datetime", ("gte", "lte"), lambda row: row.created_at),
    )

    joins: tuple[JoinDef, ...] = (
        JoinDef(
            key="DONOR",
            label="Donor",
            fields=(
                FieldDef("donor_birth_date", "Donor Birth Date", "date", ("eq", "gte", "lte"), lambda row: row.donor.birth_date if row.donor else None),
                FieldDef("donor_height_cm", "Donor Height (cm)", "number", ("eq", "gte", "lte"), lambda row: row.donor.height if row.donor else None),
                FieldDef("donor_weight_kg", "Donor Weight (kg)", "number", ("eq", "gte", "lte"), lambda row: row.donor.weight if row.donor else None),
                FieldDef("donor_organ_fo", "Donor Organ FO", "string", ("eq", "contains"), lambda row: row.donor.organ_fo if row.donor else ""),
                FieldDef(
                    "donor_sex_name",
                    "Donor Sex",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.donor.sex.name_default if row.donor and row.donor.sex else "",
                ),
                FieldDef(
                    "donor_blood_type_name",
                    "Donor Blood Type",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.donor.blood_type.name_default if row.donor and row.donor.blood_type else "",
                ),
                FieldDef(
                    "donor_diagnosis_name",
                    "Donor Diagnosis",
                    "string",
                    ("eq", "contains"),
                    lambda row: row.donor.diagnosis.name_default if row.donor and row.donor.diagnosis else "",
                ),
            ),
        ),
        JoinDef(
            key="COORDINATION_EPISODES",
            label="Coordination Episodes",
            fields=(
                FieldDef(
                    "linked_episode_count",
                    "Linked Episode Count",
                    "number",
                    ("eq", "gte", "lte"),
                    lambda row: len(row.coordination_episodes or []),
                ),
                FieldDef(
                    "linked_episode_ids",
                    "Linked Episode IDs",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text([link.episode.id for link in (row.coordination_episodes or []) if link.episode]),
                ),
                FieldDef(
                    "linked_episode_fall_nrs",
                    "Linked Episode Fall Nrs",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text([link.episode.fall_nr for link in (row.coordination_episodes or []) if link.episode]),
                ),
                FieldDef(
                    "linked_episode_organs",
                    "Linked Episode Organs",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text([link.organ.name_default for link in (row.coordination_episodes or []) if link.organ]),
                ),
                FieldDef(
                    "linked_episode_tpl_dates",
                    "Linked Episode TPL Dates",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text([link.tpl_date.isoformat() for link in (row.coordination_episodes or []) if link.tpl_date]),
                ),
            ),
        ),
        JoinDef(
            key="EPISODE_PATIENT_VIA_COORDINATION_EPISODES",
            label="Episode -> Patient via Coordination Episodes",
            fields=(
                FieldDef(
                    "linked_patient_pids",
                    "Linked Patient PIDs",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text(
                        [link.episode.patient.pid for link in (row.coordination_episodes or []) if link.episode and link.episode.patient]
                    ),
                ),
                FieldDef(
                    "linked_patient_names",
                    "Linked Patient Names",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text(
                        [
                            f"{link.episode.patient.first_name} {link.episode.patient.name}".strip()
                            for link in (row.coordination_episodes or [])
                            if link.episode and link.episode.patient
                        ]
                    ),
                ),
                FieldDef(
                    "linked_patient_birth_dates",
                    "Linked Patient Birth Dates",
                    "string",
                    ("eq", "contains"),
                    lambda row: join_unique_text(
                        [
                            link.episode.patient.date_of_birth.isoformat()
                            for link in (row.coordination_episodes or [])
                            if link.episode and link.episode.patient and link.episode.patient.date_of_birth
                        ]
                    ),
                ),
            ),
        ),
    )

    def query(db: Session) -> list[Coordination]:
        return (
            db.query(Coordination)
            .options(
                joinedload(Coordination.status),
                joinedload(Coordination.donor).joinedload(CoordinationDonor.sex),
                joinedload(Coordination.donor).joinedload(CoordinationDonor.blood_type),
                joinedload(Coordination.donor).joinedload(CoordinationDonor.diagnosis),
                joinedload(Coordination.coordination_episodes).joinedload(CoordinationEpisode.organ),
                joinedload(Coordination.coordination_episodes).joinedload(CoordinationEpisode.episode).joinedload(Episode.patient),
            )
            .all()
        )

    return SourceDef("COORDINATION", "Coordinations", fields, joins, query)
