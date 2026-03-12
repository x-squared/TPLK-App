from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...enums import ProcurementSlotKey
from ...features.coordination_procurement_flex.catalog import (
    PERSON_LIST_KEY_BY_FIELD,
    PROCUREMENT_TYPED_SPEC_BY_KEY,
    TEAM_LIST_KEY_BY_FIELD,
    get_typed_column_value,
    parse_scalar_value,
    set_typed_column_value,
)
from ...models import (
    CoordinationEpisode,
    CoordinationProcurementFieldTemplate,
    CoordinationProcurementOrganRejection,
    CoordinationProcurementTypedData,
    CoordinationProcurementTypedDataPersonList,
    CoordinationProcurementTypedDataTeamList,
    Episode,
    Person,
    PersonTeam,
)
from ...schemas import CoordinationProcurementValueCreate, CoordinationProcurementValueResponse
from .episode_link_service import attach_episode_link, sync_episode_links_from_typed_rows
from .query_service import build_value_response
from .shared import ensure_coordination_exists, enum_value, next_value_id


def _validate_person_ids(*, person_ids: list[int], db: Session) -> list[int]:
    unique_person_ids = list(dict.fromkeys(person_ids))
    if unique_person_ids:
        existing_people = db.query(Person).filter(Person.id.in_(unique_person_ids)).all()
        by_id = {row.id: row for row in existing_people}
        missing = [person_id for person_id in unique_person_ids if person_id not in by_id]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown person_ids: {', '.join(map(str, missing))}")
    return unique_person_ids


def _validate_team_ids(*, team_ids: list[int], db: Session) -> list[int]:
    unique_team_ids = list(dict.fromkeys(team_ids))
    if unique_team_ids:
        existing_teams = db.query(PersonTeam).filter(PersonTeam.id.in_(unique_team_ids)).all()
        by_id = {row.id: row for row in existing_teams}
        missing = [team_id for team_id in unique_team_ids if team_id not in by_id]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown team_ids: {', '.join(map(str, missing))}")
    return unique_team_ids


def _get_or_create_typed_row(
    *,
    coordination_id: int,
    organ_id: int,
    slot_key: ProcurementSlotKey,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementTypedData:
    typed_row = (
        db.query(CoordinationProcurementTypedData)
        .filter(
            CoordinationProcurementTypedData.coordination_id == coordination_id,
            CoordinationProcurementTypedData.organ_id == organ_id,
            CoordinationProcurementTypedData.slot_key == slot_key.value,
        )
        .first()
    )
    if typed_row:
        return typed_row
    typed_row = CoordinationProcurementTypedData(
        coordination_id=coordination_id,
        organ_id=organ_id,
        slot_key=slot_key.value,
        changed_by_id=changed_by_id,
    )
    db.add(typed_row)
    db.flush()
    return typed_row


def _validate_episode_assignment_mix(
    *,
    coordination_id: int,
    organ_id: int,
    slot_key: ProcurementSlotKey,
    typed_row_id: int,
    db: Session,
) -> None:
    other_slot_rows = (
        db.query(CoordinationProcurementTypedData)
        .filter(
            CoordinationProcurementTypedData.coordination_id == coordination_id,
            CoordinationProcurementTypedData.organ_id == organ_id,
            CoordinationProcurementTypedData.id != typed_row_id,
            CoordinationProcurementTypedData.recipient_episode_id.isnot(None),
        )
        .all()
    )
    current_slot_value = slot_key.value
    has_main_assignment_elsewhere = any(
        (row.slot_key.value if hasattr(row.slot_key, "value") else str(row.slot_key)) == ProcurementSlotKey.MAIN.value
        for row in other_slot_rows
    )
    has_side_assignment_elsewhere = any(
        (row.slot_key.value if hasattr(row.slot_key, "value") else str(row.slot_key))
        in {ProcurementSlotKey.LEFT.value, ProcurementSlotKey.RIGHT.value}
        for row in other_slot_rows
    )
    if current_slot_value == ProcurementSlotKey.MAIN.value and has_side_assignment_elsewhere:
        raise HTTPException(
            status_code=422,
            detail="Use either MAIN or LEFT/RIGHT recipient assignment slots, not both",
        )
    if current_slot_value in {ProcurementSlotKey.LEFT.value, ProcurementSlotKey.RIGHT.value} and has_main_assignment_elsewhere:
        raise HTTPException(
            status_code=422,
            detail="Use either MAIN or LEFT/RIGHT recipient assignment slots, not both",
        )


def upsert_procurement_value(
    *,
    coordination_id: int,
    organ_id: int,
    slot_key: ProcurementSlotKey,
    field_template_id: int,
    payload: CoordinationProcurementValueCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementValueResponse:
    field_template = (
        db.query(CoordinationProcurementFieldTemplate)
        .options(joinedload(CoordinationProcurementFieldTemplate.group_template))
        .filter(CoordinationProcurementFieldTemplate.id == field_template_id)
        .first()
    )
    if not field_template:
        raise HTTPException(status_code=404, detail="Field template not found")
    if not field_template.is_active:
        raise HTTPException(status_code=422, detail="Field template is inactive")
    spec = PROCUREMENT_TYPED_SPEC_BY_KEY.get(field_template.key)
    if not spec:
        raise HTTPException(status_code=422, detail=f"No typed attribute mapping defined for field key '{field_template.key}'")

    ensure_coordination_exists(coordination_id, db)
    rejection = (
        db.query(CoordinationProcurementOrganRejection)
        .filter(
            CoordinationProcurementOrganRejection.coordination_id == coordination_id,
            CoordinationProcurementOrganRejection.organ_id == organ_id,
            CoordinationProcurementOrganRejection.is_rejected.is_(True),
        )
        .first()
    )
    if rejection is not None and payload.episode_id is not None:
        raise HTTPException(
            status_code=422,
            detail="Cannot assign recipient episode while organ is marked as rejected",
        )

    typed_row = _get_or_create_typed_row(
        coordination_id=coordination_id,
        organ_id=organ_id,
        slot_key=slot_key,
        changed_by_id=changed_by_id,
        db=db,
    )

    if spec.kind in {"string", "date", "datetime", "boolean"}:
        parsed_value = parse_scalar_value(spec.kind, payload.value or "")
        set_typed_column_value(typed_row, field_template.key, parsed_value)
    elif spec.kind == "person_single":
        unique_person_ids = _validate_person_ids(person_ids=payload.person_ids, db=db)
        if len(unique_person_ids) > 1:
            raise HTTPException(status_code=422, detail="PERSON_SINGLE mode accepts at most one person_id")
        set_typed_column_value(typed_row, field_template.key, unique_person_ids[0] if unique_person_ids else None)
    elif spec.kind == "person_list":
        list_key = PERSON_LIST_KEY_BY_FIELD[field_template.key]
        unique_person_ids = _validate_person_ids(person_ids=payload.person_ids, db=db)
        typed_row.person_lists = [entry for entry in typed_row.person_lists if enum_value(entry.list_key) != list_key]
        for index, person_id in enumerate(unique_person_ids):
            typed_row.person_lists.append(
                CoordinationProcurementTypedDataPersonList(
                    list_key=list_key,
                    person_id=person_id,
                    pos=index,
                    changed_by_id=changed_by_id,
                )
            )
    elif spec.kind == "team_single":
        unique_team_ids = _validate_team_ids(team_ids=payload.team_ids, db=db)
        if len(unique_team_ids) > 1:
            raise HTTPException(status_code=422, detail="TEAM_SINGLE mode accepts at most one team_id")
        set_typed_column_value(typed_row, field_template.key, unique_team_ids[0] if unique_team_ids else None)
    elif spec.kind == "team_list":
        list_key = TEAM_LIST_KEY_BY_FIELD[field_template.key]
        unique_team_ids = _validate_team_ids(team_ids=payload.team_ids, db=db)
        if field_template.key == "IMPLANT_TEAM" and len(unique_team_ids) > 1:
            raise HTTPException(status_code=422, detail="IMPLANT_TEAM accepts at most one team_id")
        typed_row.team_lists = [entry for entry in typed_row.team_lists if enum_value(entry.list_key) != list_key]
        for index, team_id in enumerate(unique_team_ids):
            typed_row.team_lists.append(
                CoordinationProcurementTypedDataTeamList(
                    list_key=list_key,
                    team_id=team_id,
                    pos=index,
                    changed_by_id=changed_by_id,
                )
            )
    elif spec.kind == "episode_single":
        episode_id = payload.episode_id
        if episode_id is None:
            previous_episode_id = get_typed_column_value(typed_row, field_template.key)
            set_typed_column_value(typed_row, field_template.key, None)
            if previous_episode_id is not None:
                # Keep coordination_episode rows in sync with slot-level recipient selection.
                # Remove the link only when no other slot for this organ still references it.
                db.flush()
                still_referenced = (
                    db.query(CoordinationProcurementTypedData)
                    .filter(
                        CoordinationProcurementTypedData.coordination_id == coordination_id,
                        CoordinationProcurementTypedData.organ_id == organ_id,
                        CoordinationProcurementTypedData.recipient_episode_id == previous_episode_id,
                    )
                    .first()
                )
                if not still_referenced:
                    (
                        db.query(CoordinationEpisode)
                        .filter(
                            CoordinationEpisode.coordination_id == coordination_id,
                            CoordinationEpisode.organ_id == organ_id,
                            CoordinationEpisode.episode_id == previous_episode_id,
                        )
                        .delete()
                    )
        else:
            _validate_episode_assignment_mix(
                coordination_id=coordination_id,
                organ_id=organ_id,
                slot_key=slot_key,
                typed_row_id=typed_row.id,
                db=db,
            )
            duplicate_slot = (
                db.query(CoordinationProcurementTypedData)
                .filter(
                    CoordinationProcurementTypedData.coordination_id == coordination_id,
                    CoordinationProcurementTypedData.organ_id == organ_id,
                    CoordinationProcurementTypedData.id != typed_row.id,
                    CoordinationProcurementTypedData.recipient_episode_id == episode_id,
                )
                .first()
            )
            if duplicate_slot is not None:
                raise HTTPException(
                    status_code=422,
                    detail="episode_id is already assigned to another slot for this organ in this coordination",
                )
            episode = (
                db.query(Episode)
                .options(joinedload(Episode.organs))
                .filter(Episode.id == episode_id)
                .first()
            )
            if not episode:
                raise HTTPException(status_code=422, detail="episode_id must reference EPISODE")
            organ_ids = [entry.id for entry in (episode.organs or []) if entry and entry.id is not None]
            if not organ_ids and episode.organ_id is not None:
                organ_ids = [episode.organ_id]
            if organ_id not in organ_ids:
                raise HTTPException(
                    status_code=422,
                    detail="episode_id must reference an episode with the selected organ",
                )
            attach_episode_link(
                coordination_id=coordination_id,
                organ_id=organ_id,
                episode_id=episode_id,
                changed_by_id=changed_by_id,
                db=db,
            )
            set_typed_column_value(typed_row, field_template.key, episode_id)
        # SessionLocal uses autoflush=False, so persist slot recipient changes
        # before synchronizing coordination_episode links from typed rows.
        db.flush()
        sync_episode_links_from_typed_rows(
            coordination_id=coordination_id,
            organ_id=organ_id,
            changed_by_id=changed_by_id,
            db=db,
        )

    typed_row.changed_by_id = changed_by_id
    db.commit()
    refreshed = (
        db.query(CoordinationProcurementTypedData)
        .options(
            joinedload(CoordinationProcurementTypedData.arzt_responsible_person),
            joinedload(CoordinationProcurementTypedData.chirurg_responsible_person),
            joinedload(CoordinationProcurementTypedData.procurment_team_team),
            joinedload(CoordinationProcurementTypedData.recipient_episode),
            joinedload(CoordinationProcurementTypedData.person_lists).joinedload(CoordinationProcurementTypedDataPersonList.person),
            joinedload(CoordinationProcurementTypedData.team_lists).joinedload(CoordinationProcurementTypedDataTeamList.team),
            joinedload(CoordinationProcurementTypedData.changed_by_user),
        )
        .filter(CoordinationProcurementTypedData.id == typed_row.id)
        .first()
    )
    response = build_value_response(row=refreshed, field_template=field_template)
    if response is None:
        return CoordinationProcurementValueResponse(
            id=next_value_id(slot_row_id=refreshed.id, field_template_id=field_template.id),
            slot_id=refreshed.id,
            field_template_id=field_template.id,
            value="",
            field_template=field_template,
            changed_by_id=refreshed.changed_by_id,
            changed_by_user=refreshed.changed_by_user,
            created_at=refreshed.created_at,
            updated_at=refreshed.updated_at,
            persons=[],
            teams=[],
            episode_ref=None,
        )
    return response
