from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ...features.coordination_procurement_flex.catalog import (
    PERSON_LIST_KEY_BY_FIELD,
    PROCUREMENT_TYPED_SPEC_BY_KEY,
    TEAM_LIST_KEY_BY_FIELD,
    format_scalar_value,
    get_typed_column_value,
)
from ...models import (
    CoordinationProcurement,
    CoordinationProcurementFieldGroupTemplate,
    CoordinationProcurementFieldScopeTemplate,
    CoordinationProcurementFieldTemplate,
    CoordinationProcurementOrganRejection,
    CoordinationProcurementProtocolTaskGroupSelection,
    CoordinationProcurementTypedData,
    CoordinationProcurementTypedDataPersonList,
    CoordinationProcurementTypedDataTeamList,
    CoordinationProtocolEventLog,
    TaskGroupTemplate,
)
from ...schemas import (
    CoordinationProcurementFieldGroupTemplateResponse,
    CoordinationProcurementFieldScopeTemplateResponse,
    CoordinationProcurementFieldTemplateResponse,
    CoordinationProcurementFlexResponse,
    CoordinationProcurementOrganResponse,
    CoordinationProcurementSlotResponse,
    CoordinationProcurementValueResponse,
)
from .shared import ORGAN_WORKFLOW_CLEARED_EVENT, ensure_coordination_exists, enum_value, next_value_id


def load_typed_rows(*, coordination_id: int, db: Session) -> list[CoordinationProcurementTypedData]:
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
            joinedload(CoordinationProcurementTypedData.changed_by_user),
        )
        .filter(CoordinationProcurementTypedData.coordination_id == coordination_id)
        .all()
    )


def build_value_response(
    *,
    row: CoordinationProcurementTypedData,
    field_template: CoordinationProcurementFieldTemplate,
) -> CoordinationProcurementValueResponse | None:
    spec = PROCUREMENT_TYPED_SPEC_BY_KEY.get(field_template.key)
    if not spec:
        return None

    persons: list[dict[str, object]] = []
    teams: list[dict[str, object]] = []
    episode_ref = None
    value_text = ""

    if spec.kind in {"string", "date", "datetime", "boolean"}:
        raw_value = get_typed_column_value(row, field_template.key)
        if raw_value is None:
            return None
        value_text = format_scalar_value(spec.kind, raw_value)
    elif spec.kind == "person_single":
        person = row.arzt_responsible_person if field_template.key == "ARZT_RESPONSIBLE" else row.chirurg_responsible_person
        if not person:
            return None
        persons = [{"id": next_value_id(slot_row_id=row.id, field_template_id=field_template.id), "pos": 0, "person": person}]
    elif spec.kind == "team_single":
        team = row.procurment_team_team
        if not team:
            return None
        teams = [{"id": next_value_id(slot_row_id=row.id, field_template_id=field_template.id), "pos": 0, "team": team}]
    elif spec.kind == "episode_single":
        episode = row.recipient_episode
        if not episode:
            return None
        episode_ref = {
            "id": next_value_id(slot_row_id=row.id, field_template_id=field_template.id),
            "episode_id": episode.id,
            "episode": episode,
        }
    elif spec.kind == "person_list":
        list_key = PERSON_LIST_KEY_BY_FIELD.get(field_template.key)
        selected = [entry for entry in sorted(row.person_lists, key=lambda item: item.pos) if enum_value(entry.list_key) == list_key]
        if not selected:
            return None
        persons = [{"id": entry.id, "pos": entry.pos, "person": entry.person} for entry in selected if entry.person is not None]
    elif spec.kind == "team_list":
        list_key = TEAM_LIST_KEY_BY_FIELD.get(field_template.key)
        selected = [entry for entry in sorted(row.team_lists, key=lambda item: item.pos) if enum_value(entry.list_key) == list_key]
        if not selected:
            return None
        teams = [{"id": entry.id, "pos": entry.pos, "team": entry.team} for entry in selected if entry.team is not None]
    else:
        return None

    return CoordinationProcurementValueResponse(
        id=next_value_id(slot_row_id=row.id, field_template_id=field_template.id),
        slot_id=row.id,
        field_template_id=field_template.id,
        value=value_text,
        field_template=field_template,
        changed_by_id=row.changed_by_id,
        changed_by_user=row.changed_by_user,
        created_at=row.created_at,
        updated_at=row.updated_at,
        persons=persons,
        teams=teams,
        episode_ref=episode_ref,
    )


def build_flex_response_from_typed_data(
    *,
    coordination_id: int,
    procurement: CoordinationProcurement | None,
    field_templates: list[CoordinationProcurementFieldTemplate],
    field_scope_templates: list[CoordinationProcurementFieldScopeTemplate],
    field_group_templates: list[CoordinationProcurementFieldGroupTemplate],
    protocol_task_group_selections: list[CoordinationProcurementProtocolTaskGroupSelection],
    typed_rows: list[CoordinationProcurementTypedData],
    organ_rejections: list[CoordinationProcurementOrganRejection],
    db: Session,
) -> CoordinationProcurementFlexResponse:
    slot_rows_by_organ: dict[int, list[CoordinationProcurementTypedData]] = {}
    for row in typed_rows:
        slot_rows_by_organ.setdefault(row.organ_id, []).append(row)
    rejection_by_organ_id = {entry.organ_id: entry for entry in organ_rejections}
    cleared_workflow_by_organ_id = {
        int(row[0])
        for row in db.query(CoordinationProtocolEventLog.organ_id)
        .filter(
            CoordinationProtocolEventLog.coordination_id == coordination_id,
            CoordinationProtocolEventLog.event == ORGAN_WORKFLOW_CLEARED_EVENT,
        )
        .all()
        if row and row[0] is not None
    }
    organ_ids = sorted(set(slot_rows_by_organ.keys()) | set(rejection_by_organ_id.keys()))
    organs: list[CoordinationProcurementOrganResponse] = []
    for organ_id in organ_ids:
        rows_for_organ = sorted(
            slot_rows_by_organ.get(organ_id, []),
            key=lambda item: item.slot_key.value if hasattr(item.slot_key, "value") else item.slot_key,
        )
        sample_row = rows_for_organ[0] if rows_for_organ else None
        rejection_row = rejection_by_organ_id.get(organ_id)
        slots: list[CoordinationProcurementSlotResponse] = []
        for row in rows_for_organ:
            values = []
            for field_template in field_templates:
                value = build_value_response(row=row, field_template=field_template)
                if value is not None:
                    values.append(value)
            slot_key = row.slot_key.value if hasattr(row.slot_key, "value") else row.slot_key
            slots.append(
                CoordinationProcurementSlotResponse(
                    id=row.id,
                    coordination_procurement_organ_id=organ_id,
                    slot_key=slot_key,
                    values=values,
                    changed_by_id=row.changed_by_id,
                    changed_by_user=row.changed_by_user,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
            )
        organs.append(
            CoordinationProcurementOrganResponse(
                id=organ_id,
                coordination_id=coordination_id,
                organ_id=organ_id,
                procurement_surgeon="",
                organ_rejected=bool(rejection_row.is_rejected) if rejection_row else False,
                organ_rejection_comment=(rejection_row.rejection_comment or "") if rejection_row else "",
                organ_workflow_cleared=bool(rejection_row and rejection_row.is_rejected and organ_id in cleared_workflow_by_organ_id),
                organ=sample_row.organ if sample_row else None,
                slots=slots,
                changed_by_id=(
                    rejection_row.changed_by_id
                    if rejection_row is not None
                    else (sample_row.changed_by_id if sample_row else None)
                ),
                changed_by_user=(
                    rejection_row.changed_by_user
                    if rejection_row is not None
                    else (sample_row.changed_by_user if sample_row else None)
                ),
                created_at=(
                    rejection_row.created_at
                    if rejection_row is not None
                    else (sample_row.created_at if sample_row else None)
                ),
                updated_at=(
                    rejection_row.updated_at
                    if rejection_row is not None
                    else (sample_row.updated_at if sample_row else None)
                ),
            )
        )

    return CoordinationProcurementFlexResponse(
        procurement=procurement,
        organs=organs,
        field_group_templates=[
            CoordinationProcurementFieldGroupTemplateResponse.model_validate(group, from_attributes=True)
            for group in field_group_templates
        ],
        field_templates=[
            CoordinationProcurementFieldTemplateResponse.model_validate(template, from_attributes=True)
            for template in field_templates
        ],
        field_scope_templates=[
            CoordinationProcurementFieldScopeTemplateResponse.model_validate(scope, from_attributes=True)
            for scope in field_scope_templates
        ],
        protocol_task_group_selections=protocol_task_group_selections,
    )


def get_procurement_flex(*, coordination_id: int, db: Session) -> CoordinationProcurementFlexResponse:
    ensure_coordination_exists(coordination_id, db)
    procurement = (
        db.query(CoordinationProcurement)
        .options(joinedload(CoordinationProcurement.changed_by_user))
        .filter(CoordinationProcurement.coordination_id == coordination_id)
        .first()
    )
    typed_rows = load_typed_rows(coordination_id=coordination_id, db=db)
    field_templates = (
        db.query(CoordinationProcurementFieldTemplate)
        .options(
            joinedload(CoordinationProcurementFieldTemplate.datatype_definition),
            joinedload(CoordinationProcurementFieldTemplate.group_template),
        )
        .filter(CoordinationProcurementFieldTemplate.is_active.is_(True))
        .order_by(CoordinationProcurementFieldTemplate.pos.asc(), CoordinationProcurementFieldTemplate.id.asc())
        .all()
    )
    field_group_templates = (
        db.query(CoordinationProcurementFieldGroupTemplate)
        .filter(CoordinationProcurementFieldGroupTemplate.is_active.is_(True))
        .order_by(CoordinationProcurementFieldGroupTemplate.pos.asc(), CoordinationProcurementFieldGroupTemplate.id.asc())
        .all()
    )
    field_scope_templates = (
        db.query(CoordinationProcurementFieldScopeTemplate)
        .options(
            joinedload(CoordinationProcurementFieldScopeTemplate.organ),
            joinedload(CoordinationProcurementFieldScopeTemplate.field_template),
        )
        .order_by(CoordinationProcurementFieldScopeTemplate.id.asc())
        .all()
    )
    protocol_task_group_selections = (
        db.query(CoordinationProcurementProtocolTaskGroupSelection)
        .options(
            joinedload(CoordinationProcurementProtocolTaskGroupSelection.task_group_template).joinedload(TaskGroupTemplate.scope),
            joinedload(CoordinationProcurementProtocolTaskGroupSelection.task_group_template).joinedload(TaskGroupTemplate.organ),
            joinedload(CoordinationProcurementProtocolTaskGroupSelection.organ),
            joinedload(CoordinationProcurementProtocolTaskGroupSelection.changed_by_user),
        )
        .order_by(CoordinationProcurementProtocolTaskGroupSelection.pos.asc(), CoordinationProcurementProtocolTaskGroupSelection.id.asc())
        .all()
    )
    organ_rejections = (
        db.query(CoordinationProcurementOrganRejection)
        .options(
            joinedload(CoordinationProcurementOrganRejection.organ),
            joinedload(CoordinationProcurementOrganRejection.changed_by_user),
        )
        .filter(CoordinationProcurementOrganRejection.coordination_id == coordination_id)
        .all()
    )
    return build_flex_response_from_typed_data(
        coordination_id=coordination_id,
        procurement=procurement,
        field_templates=field_templates,
        field_scope_templates=field_scope_templates,
        field_group_templates=field_group_templates,
        protocol_task_group_selections=protocol_task_group_selections,
        typed_rows=typed_rows,
        organ_rejections=organ_rejections,
        db=db,
    )
