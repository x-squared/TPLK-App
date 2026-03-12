from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import (
    Code,
    CoordinationProcurementFieldGroupTemplate,
    CoordinationProcurementProtocolTaskGroupSelection,
    CoordinationProcurementFieldScopeTemplate,
    CoordinationProcurementFieldTemplate,
    DatatypeDefinition,
    TaskGroupTemplate,
)
from ...schemas import (
    CoordinationProcurementAdminConfigResponse,
    CoordinationProcurementFieldGroupTemplateCreate,
    CoordinationProcurementFieldGroupTemplateUpdate,
    CoordinationProcurementProtocolTaskGroupSelectionCreate,
    CoordinationProcurementProtocolTaskGroupSelectionUpdate,
    CoordinationProcurementFieldScopeTemplateCreate,
    CoordinationProcurementFieldTemplateCreate,
    CoordinationProcurementFieldTemplateUpdate,
)


def _lane_rank(value: str | None) -> int:
    return 0 if value == "PRIMARY" else 1


def _normalize_group_positions(db: Session) -> None:
    ordered = (
        db.query(CoordinationProcurementFieldGroupTemplate)
        .order_by(
            CoordinationProcurementFieldGroupTemplate.pos.asc(),
            CoordinationProcurementFieldGroupTemplate.id.asc(),
        )
        .all()
    )
    ordered.sort(
        key=lambda entry: (
            _lane_rank(entry.display_lane),
            entry.pos,
            entry.id,
        )
    )
    for index, entry in enumerate(ordered, start=1):
        entry.pos = index


def _field_template_query(db: Session):
    return db.query(CoordinationProcurementFieldTemplate).options(
        joinedload(CoordinationProcurementFieldTemplate.datatype_definition).joinedload(DatatypeDefinition.code),
        joinedload(CoordinationProcurementFieldTemplate.group_template),
    )


def _scope_template_query(db: Session):
    return db.query(CoordinationProcurementFieldScopeTemplate).options(
        joinedload(CoordinationProcurementFieldScopeTemplate.organ),
        joinedload(CoordinationProcurementFieldScopeTemplate.field_template),
    )


def _protocol_task_group_selection_query(db: Session):
    return db.query(CoordinationProcurementProtocolTaskGroupSelection).options(
        joinedload(CoordinationProcurementProtocolTaskGroupSelection.task_group_template).joinedload(TaskGroupTemplate.scope),
        joinedload(CoordinationProcurementProtocolTaskGroupSelection.task_group_template).joinedload(TaskGroupTemplate.organ),
        joinedload(CoordinationProcurementProtocolTaskGroupSelection.organ),
        joinedload(CoordinationProcurementProtocolTaskGroupSelection.changed_by_user),
    )


def _resolve_protocol_task_group_template_or_422(*, task_group_template_id: int, db: Session) -> TaskGroupTemplate:
    item = (
        db.query(TaskGroupTemplate)
        .options(joinedload(TaskGroupTemplate.scope))
        .filter(TaskGroupTemplate.id == task_group_template_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=422, detail="task_group_template_id not found")
    scope_key = item.scope_key.value if hasattr(item.scope_key, "value") else item.scope_key
    if scope_key != "COORDINATION_PROTOCOL":
        raise HTTPException(status_code=422, detail="task_group_template_id must reference TASK_SCOPE.COORDINATION_PROTOCOL")
    return item


def get_procurement_admin_config(*, db: Session) -> CoordinationProcurementAdminConfigResponse:
    field_group_templates = (
        db.query(CoordinationProcurementFieldGroupTemplate)
        .order_by(CoordinationProcurementFieldGroupTemplate.pos.asc(), CoordinationProcurementFieldGroupTemplate.id.asc())
        .all()
    )
    field_templates = (
        _field_template_query(db)
        .order_by(CoordinationProcurementFieldTemplate.pos.asc(), CoordinationProcurementFieldTemplate.id.asc())
        .all()
    )
    field_scope_templates = (
        _scope_template_query(db)
        .order_by(CoordinationProcurementFieldScopeTemplate.id.asc())
        .all()
    )
    protocol_task_group_selections = (
        _protocol_task_group_selection_query(db)
        .order_by(CoordinationProcurementProtocolTaskGroupSelection.pos.asc(), CoordinationProcurementProtocolTaskGroupSelection.id.asc())
        .all()
    )
    datatype_definitions = (
        db.query(DatatypeDefinition)
        .options(joinedload(DatatypeDefinition.code))
        .order_by(DatatypeDefinition.id.asc())
        .all()
    )
    organs = (
        db.query(Code)
        .filter(Code.type == "ORGAN")
        .order_by(Code.pos.asc(), Code.name_default.asc(), Code.id.asc())
        .all()
    )
    return CoordinationProcurementAdminConfigResponse(
        field_group_templates=field_group_templates,
        field_templates=field_templates,
        field_scope_templates=field_scope_templates,
        protocol_task_group_selections=protocol_task_group_selections,
        datatype_definitions=datatype_definitions,
        organs=organs,
    )


def create_field_group_template(
    *,
    payload: CoordinationProcurementFieldGroupTemplateCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementFieldGroupTemplate:
    key = payload.key.strip().upper()
    if not key:
        raise HTTPException(status_code=422, detail="key must not be empty")
    existing = db.query(CoordinationProcurementFieldGroupTemplate).filter(
        CoordinationProcurementFieldGroupTemplate.key == key
    ).first()
    if existing is not None:
        raise HTTPException(status_code=422, detail="key already exists")
    item = CoordinationProcurementFieldGroupTemplate(
        key=key,
        name_default=payload.name_default.strip(),
        comment=payload.comment.strip(),
        is_active=bool(payload.is_active),
        display_lane=payload.display_lane,
        pos=payload.pos,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    db.flush()
    _normalize_group_positions(db)
    db.commit()
    return item


def update_field_group_template(
    *,
    group_template_id: int,
    payload: CoordinationProcurementFieldGroupTemplateUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementFieldGroupTemplate:
    item = db.query(CoordinationProcurementFieldGroupTemplate).filter(CoordinationProcurementFieldGroupTemplate.id == group_template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Field group template not found")
    data = payload.model_dump(exclude_unset=True)
    allowed = {"key", "name_default", "comment", "is_active", "pos", "display_lane"}
    forbidden = [key for key in data.keys() if key not in allowed]
    if forbidden:
        raise HTTPException(status_code=422, detail=f"Unsupported group update fields: {', '.join(sorted(forbidden))}")
    if "key" in data:
        normalized_key = data["key"].strip().upper()
        if not normalized_key:
            raise HTTPException(status_code=422, detail="key must not be empty")
        duplicate = db.query(CoordinationProcurementFieldGroupTemplate).filter(
            CoordinationProcurementFieldGroupTemplate.id != item.id,
            CoordinationProcurementFieldGroupTemplate.key == normalized_key,
        ).first()
        if duplicate is not None:
            raise HTTPException(status_code=422, detail="key already exists")
        data["key"] = normalized_key
    if "name_default" in data:
        data["name_default"] = data["name_default"].strip()
    if "comment" in data:
        data["comment"] = data["comment"].strip()
    for key, value in data.items():
        setattr(item, key, value)
    _normalize_group_positions(db)
    item.changed_by_id = changed_by_id
    db.commit()
    return item


def delete_field_group_template(*, group_template_id: int, db: Session) -> None:
    item = db.query(CoordinationProcurementFieldGroupTemplate).filter(CoordinationProcurementFieldGroupTemplate.id == group_template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Field group template not found")
    db.query(CoordinationProcurementFieldTemplate).filter(
        CoordinationProcurementFieldTemplate.group_template_id == group_template_id
    ).update({CoordinationProcurementFieldTemplate.group_template_id: None})
    db.delete(item)
    db.commit()


def create_field_template(
    *,
    payload: CoordinationProcurementFieldTemplateCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementFieldTemplate:
    raise HTTPException(
        status_code=422,
        detail="Procurement field templates are fixed and cannot be created",
    )


def update_field_template(
    *,
    field_template_id: int,
    payload: CoordinationProcurementFieldTemplateUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementFieldTemplate:
    item = db.query(CoordinationProcurementFieldTemplate).filter(CoordinationProcurementFieldTemplate.id == field_template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Field template not found")
    data = payload.model_dump(exclude_unset=True)
    allowed = {"group_template_id", "pos"}
    forbidden = [key for key in data.keys() if key not in allowed]
    if forbidden:
        raise HTTPException(status_code=422, detail=f"Only arrangement updates are allowed for fields (invalid: {', '.join(sorted(forbidden))})")
    if "group_template_id" in data and data["group_template_id"] is not None:
        group_template = db.query(CoordinationProcurementFieldGroupTemplate).filter(
            CoordinationProcurementFieldGroupTemplate.id == data["group_template_id"]
        ).first()
        if not group_template:
            raise HTTPException(status_code=422, detail="group_template_id not found")
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return _field_template_query(db).filter(CoordinationProcurementFieldTemplate.id == item.id).first()


def delete_field_template(*, field_template_id: int, db: Session) -> None:
    item = db.query(CoordinationProcurementFieldTemplate).filter(CoordinationProcurementFieldTemplate.id == field_template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Field template not found")
    raise HTTPException(
        status_code=422,
        detail="Field templates are protected and cannot be deleted",
    )


def create_field_scope_template(
    *,
    payload: CoordinationProcurementFieldScopeTemplateCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementFieldScopeTemplate:
    field_template = db.query(CoordinationProcurementFieldTemplate).filter(
        CoordinationProcurementFieldTemplate.id == payload.field_template_id
    ).first()
    if not field_template:
        raise HTTPException(status_code=422, detail="field_template_id not found")
    if payload.organ_id is not None:
        organ = db.query(Code).filter(Code.id == payload.organ_id, Code.type == "ORGAN").first()
        if not organ:
            raise HTTPException(status_code=422, detail="organ_id must reference CODE.ORGAN")
    duplicate = db.query(CoordinationProcurementFieldScopeTemplate).filter(
        CoordinationProcurementFieldScopeTemplate.field_template_id == payload.field_template_id,
        CoordinationProcurementFieldScopeTemplate.organ_id == payload.organ_id,
        CoordinationProcurementFieldScopeTemplate.slot_key == payload.slot_key.value,
    ).first()
    if duplicate:
        raise HTTPException(status_code=422, detail="Field scope already exists")
    item = CoordinationProcurementFieldScopeTemplate(
        field_template_id=payload.field_template_id,
        organ_id=payload.organ_id,
        slot_key=payload.slot_key.value,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    db.commit()
    return _scope_template_query(db).filter(CoordinationProcurementFieldScopeTemplate.id == item.id).first()


def delete_field_scope_template(*, scope_template_id: int, db: Session) -> None:
    item = db.query(CoordinationProcurementFieldScopeTemplate).filter(CoordinationProcurementFieldScopeTemplate.id == scope_template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Field scope template not found")
    db.delete(item)
    db.commit()


def create_protocol_task_group_selection(
    *,
    payload: CoordinationProcurementProtocolTaskGroupSelectionCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementProtocolTaskGroupSelection:
    _resolve_protocol_task_group_template_or_422(task_group_template_id=payload.task_group_template_id, db=db)
    if payload.organ_id is not None:
        organ = db.query(Code).filter(Code.id == payload.organ_id, Code.type == "ORGAN").first()
        if not organ:
            raise HTTPException(status_code=422, detail="organ_id must reference CODE.ORGAN")
    duplicate = db.query(CoordinationProcurementProtocolTaskGroupSelection).filter(
        CoordinationProcurementProtocolTaskGroupSelection.task_group_template_id == payload.task_group_template_id,
        CoordinationProcurementProtocolTaskGroupSelection.organ_id == payload.organ_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=422, detail="Protocol task group selection already exists for this scope")
    item = CoordinationProcurementProtocolTaskGroupSelection(
        task_group_template_id=payload.task_group_template_id,
        organ_id=payload.organ_id,
        pos=payload.pos,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    db.commit()
    return _protocol_task_group_selection_query(db).filter(CoordinationProcurementProtocolTaskGroupSelection.id == item.id).first()


def update_protocol_task_group_selection(
    *,
    selection_id: int,
    payload: CoordinationProcurementProtocolTaskGroupSelectionUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationProcurementProtocolTaskGroupSelection:
    item = db.query(CoordinationProcurementProtocolTaskGroupSelection).filter(
        CoordinationProcurementProtocolTaskGroupSelection.id == selection_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Protocol task group selection not found")
    data = payload.model_dump(exclude_unset=True)
    if "organ_id" in data:
        if data["organ_id"] is not None:
            organ = db.query(Code).filter(Code.id == data["organ_id"], Code.type == "ORGAN").first()
            if not organ:
                raise HTTPException(status_code=422, detail="organ_id must reference CODE.ORGAN")
        duplicate = db.query(CoordinationProcurementProtocolTaskGroupSelection).filter(
            CoordinationProcurementProtocolTaskGroupSelection.id != item.id,
            CoordinationProcurementProtocolTaskGroupSelection.task_group_template_id == item.task_group_template_id,
            CoordinationProcurementProtocolTaskGroupSelection.organ_id == data["organ_id"],
        ).first()
        if duplicate:
            raise HTTPException(status_code=422, detail="Protocol task group selection already exists for this scope")
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return _protocol_task_group_selection_query(db).filter(CoordinationProcurementProtocolTaskGroupSelection.id == item.id).first()


def delete_protocol_task_group_selection(*, selection_id: int, db: Session) -> None:
    item = db.query(CoordinationProcurementProtocolTaskGroupSelection).filter(
        CoordinationProcurementProtocolTaskGroupSelection.id == selection_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Protocol task group selection not found")
    db.delete(item)
    db.commit()
