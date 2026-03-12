from __future__ import annotations

from collections.abc import Iterable

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from ...models import (
    DatatypeDefinition,
    Episode,
    MedicalValue,
    MedicalValueGroup,
    MedicalValueGroupTemplate,
    MedicalValueTemplate,
    MedicalValueTemplateContextTemplate,
    Patient,
)
from ...schemas import MedicalValueCreate, MedicalValueUpdate
from .normalization import normalize_medical_value


def build_context_key(
    *,
    organ_id: int | None = None,
    is_donor_context: bool = False,
) -> str:
    if is_donor_context:
        return "DONOR"
    if organ_id is None:
        return "STATIC"
    return f"ORGAN:{organ_id}"


def _iter_episode_organs(episode: Episode) -> Iterable[int]:
    if episode.organs:
        for organ in episode.organs:
            if organ and organ.id is not None:
                yield organ.id
        return
    if episode.organ_id is not None:
        yield episode.organ_id


def ensure_group_instance(
    db: Session,
    *,
    patient_id: int,
    medical_value_group_id: int,
    context_key: str,
    organ_id: int | None,
    is_donor_context: bool,
    changed_by_id: int | None = None,
) -> MedicalValueGroup:
    instance = (
        db.query(MedicalValueGroup)
        .filter(
            MedicalValueGroup.patient_id == patient_id,
            MedicalValueGroup.medical_value_group_id == medical_value_group_id,
            MedicalValueGroup.context_key == context_key,
        )
        .first()
    )
    if instance:
        return instance
    instance = MedicalValueGroup(
        patient_id=patient_id,
        medical_value_group_id=medical_value_group_id,
        context_key=context_key,
        organ_id=organ_id,
        is_donor_context=is_donor_context,
        changed_by_id=changed_by_id,
    )
    db.add(instance)
    db.flush()
    return instance


def instantiate_templates_for_patient(
    db: Session,
    patient_id: int,
    *,
    include_donor_context: bool = False,
    changed_by_id: int | None = None,
) -> dict[str, int]:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"created_values": 0}

    groups = (
        db.query(MedicalValueGroupTemplate)
        .options(selectinload(MedicalValueGroupTemplate.context_templates))
        .all()
    )
    group_by_id = {group.id: group for group in groups}
    templates = (
        db.query(MedicalValueTemplate)
        .options(selectinload(MedicalValueTemplate.context_templates))
        .filter(MedicalValueTemplate.medical_value_group_id.isnot(None))
        .order_by(MedicalValueTemplate.pos.asc(), MedicalValueTemplate.id.asc())
        .all()
    )

    available_non_donor_tokens: set[tuple[str, int | None]] = {("STATIC", None)}
    open_episodes = db.query(Episode).filter(Episode.patient_id == patient_id, Episode.closed.is_(False)).all()
    seen_organ_ids: set[int] = set()
    for episode in open_episodes:
        for organ_id in _iter_episode_organs(episode):
            if organ_id in seen_organ_ids:
                continue
            seen_organ_ids.add(organ_id)
            available_non_donor_tokens.add(("ORGAN", organ_id))

    existing = {
        (
            row.medical_value_template_id,
            bool(row.is_donor_context),
        )
        for row in db.query(MedicalValue).filter(MedicalValue.patient_id == patient_id).all()
        if row.medical_value_template_id is not None
    }

    created = 0
    donor_token = ("DONOR", None)
    non_donor_context_key = build_context_key(organ_id=None, is_donor_context=False)
    donor_context_key = build_context_key(organ_id=None, is_donor_context=True)

    for template in templates:
        group = group_by_id.get(template.medical_value_group_id or -1)
        if not group:
            continue

        group_tokens = {(entry.context_kind, entry.organ_id) for entry in group.context_templates}
        template_tokens = {(entry.context_kind, entry.organ_id) for entry in template.context_templates}
        allowed_tokens = group_tokens & template_tokens

        non_donor_applicable = any(token in available_non_donor_tokens for token in allowed_tokens)
        donor_applicable = include_donor_context and donor_token in allowed_tokens

        if non_donor_applicable:
            key = (template.id, False)
            if key not in existing:
                group_instance = ensure_group_instance(
                    db,
                    patient_id=patient_id,
                    medical_value_group_id=template.medical_value_group_id,
                    context_key=non_donor_context_key,
                    organ_id=None,
                    is_donor_context=False,
                    changed_by_id=changed_by_id,
                )
                db.add(
                    MedicalValue(
                        patient_id=patient_id,
                        medical_value_template_id=template.id,
                        datatype_id=template.datatype_id,
                        medical_value_group_id=template.medical_value_group_id,
                        medical_value_group_instance_id=group_instance.id,
                        name=template.name_default or "",
                        pos=template.pos or 0,
                        value="",
                        value_input="",
                        unit_input_ucum=None,
                        value_canonical="",
                        unit_canonical_ucum=None,
                        normalization_status="UNSPECIFIED",
                        normalization_error="",
                        renew_date=None,
                        organ_id=None,
                        is_donor_context=False,
                        context_key=non_donor_context_key,
                        changed_by_id=changed_by_id,
                    )
                )
                existing.add(key)
                created += 1

        if donor_applicable:
            key = (template.id, True)
            if key not in existing:
                group_instance = ensure_group_instance(
                    db,
                    patient_id=patient_id,
                    medical_value_group_id=template.medical_value_group_id,
                    context_key=donor_context_key,
                    organ_id=None,
                    is_donor_context=True,
                    changed_by_id=changed_by_id,
                )
                db.add(
                    MedicalValue(
                        patient_id=patient_id,
                        medical_value_template_id=template.id,
                        datatype_id=template.datatype_id,
                        medical_value_group_id=template.medical_value_group_id,
                        medical_value_group_instance_id=group_instance.id,
                        name=template.name_default or "",
                        pos=template.pos or 0,
                        value="",
                        value_input="",
                        unit_input_ucum=None,
                        value_canonical="",
                        unit_canonical_ucum=None,
                        normalization_status="UNSPECIFIED",
                        normalization_error="",
                        renew_date=None,
                        organ_id=None,
                        is_donor_context=True,
                        context_key=donor_context_key,
                        changed_by_id=changed_by_id,
                    )
                )
                existing.add(key)
                created += 1

    db.commit()
    return {"created_values": created}


def _get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _get_default_group_id(db: Session) -> int | None:
    group = (
        db.query(MedicalValueGroupTemplate)
        .filter(MedicalValueGroupTemplate.key == "USER_CAPTURED")
        .first()
    )
    return group.id if group else None


def _resolve_datatype_definition_for_value(
    *,
    template_id: int | None,
    datatype_id: int | None,
    db: Session,
) -> DatatypeDefinition | None:
    if template_id is not None:
        template = (
            db.query(MedicalValueTemplate)
            .options(joinedload(MedicalValueTemplate.datatype_definition))
            .filter(MedicalValueTemplate.id == template_id)
            .first()
        )
        if template and template.datatype_definition is not None:
            return template.datatype_definition
        if template and template.datatype_id is not None:
            return db.query(DatatypeDefinition).filter(DatatypeDefinition.code_id == template.datatype_id).first()
    if datatype_id is not None:
        return db.query(DatatypeDefinition).filter(DatatypeDefinition.code_id == datatype_id).first()
    return None


def _group_key_for_id(db: Session, group_id: int | None) -> str | None:
    if group_id is None:
        return None
    group = db.query(MedicalValueGroupTemplate).filter(MedicalValueGroupTemplate.id == group_id).first()
    return group.key if group else None


def _assert_medical_value_unique_for_non_user_captured(
    *,
    patient_id: int,
    group_key: str | None,
    is_donor_context: bool,
    medical_value_template_id: int | None,
    name: str,
    db: Session,
    exclude_id: int | None = None,
) -> None:
    if group_key == "USER_CAPTURED":
        return
    query = db.query(MedicalValue).filter(
        MedicalValue.patient_id == patient_id,
        MedicalValue.is_donor_context == is_donor_context,
    )
    if medical_value_template_id is not None:
        query = query.filter(MedicalValue.medical_value_template_id == medical_value_template_id)
    else:
        normalized_name = name.strip().lower()
        if not normalized_name:
            return
        query = query.filter(
            MedicalValue.medical_value_template_id.is_(None),
            func.lower(MedicalValue.name) == normalized_name,
        )
    if exclude_id is not None:
        query = query.filter(MedicalValue.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=422,
            detail="Duplicate medical value is not allowed for non user-captured groups.",
        )


def list_medical_values_for_patient(*, patient_id: int, db: Session) -> list[MedicalValue]:
    _get_patient_or_404(patient_id, db)
    return (
        db.query(MedicalValue)
        .options(
            joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.datatype),
            joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.datatype_definition),
            joinedload(MedicalValue.medical_value_template).joinedload(MedicalValueTemplate.medical_value_group_template),
            joinedload(MedicalValue.medical_value_group_template),
            joinedload(MedicalValue.medical_value_group).joinedload(MedicalValueGroup.medical_value_group_template),
            joinedload(MedicalValue.datatype),
            joinedload(MedicalValue.changed_by_user),
        )
        .filter(MedicalValue.patient_id == patient_id)
        .order_by(MedicalValue.medical_value_group_id.asc(), MedicalValue.pos.asc(), MedicalValue.id.asc())
        .all()
    )


def create_medical_value_for_patient(
    *,
    patient_id: int,
    payload: MedicalValueCreate,
    changed_by_id: int,
    db: Session,
) -> MedicalValue:
    _get_patient_or_404(patient_id, db)
    data = payload.model_dump()
    template_id = data.get("medical_value_template_id")
    template = None
    if template_id:
        template = db.query(MedicalValueTemplate).filter(MedicalValueTemplate.id == template_id).first()
    if data.get("medical_value_group_id") is None:
        if template and template.medical_value_group_id is not None:
            data["medical_value_group_id"] = template.medical_value_group_id
        else:
            data["medical_value_group_id"] = _get_default_group_id(db)
    datatype_definition = _resolve_datatype_definition_for_value(
        template_id=data.get("medical_value_template_id"),
        datatype_id=data.get("datatype_id"),
        db=db,
    )
    normalized = normalize_medical_value(
        raw_value=(
            data.get("value_input")
            if (data.get("value_input") not in (None, ""))
            else (data.get("value") or "")
        ),
        unit_input_ucum=data.get("unit_input_ucum"),
        datatype_definition=datatype_definition,
    )
    data["value"] = normalized.value_legacy
    data["value_input"] = normalized.value_input
    data["unit_input_ucum"] = normalized.unit_input_ucum
    data["value_canonical"] = normalized.value_canonical
    data["unit_canonical_ucum"] = normalized.unit_canonical_ucum
    data["normalization_status"] = normalized.normalization_status
    data["normalization_error"] = normalized.normalization_error
    data.pop("episode_id", None)
    context_key = data.get("context_key") or build_context_key(
        organ_id=data.get("organ_id"),
        is_donor_context=bool(data.get("is_donor_context")),
    )
    data["context_key"] = context_key
    group_id = data.get("medical_value_group_id")
    if group_id is not None:
        group_instance = ensure_group_instance(
            db,
            patient_id=patient_id,
            medical_value_group_id=group_id,
            context_key=context_key,
            organ_id=data.get("organ_id"),
            is_donor_context=bool(data.get("is_donor_context")),
            changed_by_id=changed_by_id,
        )
        data["medical_value_group_instance_id"] = group_instance.id
    _assert_medical_value_unique_for_non_user_captured(
        patient_id=patient_id,
        group_key=_group_key_for_id(db, data.get("medical_value_group_id")),
        is_donor_context=bool(data.get("is_donor_context")),
        medical_value_template_id=data.get("medical_value_template_id"),
        name=data.get("name", ""),
        db=db,
    )
    mv = MedicalValue(
        patient_id=patient_id,
        **data,
        changed_by_id=changed_by_id,
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


def update_medical_value_for_patient(
    *,
    patient_id: int,
    medical_value_id: int,
    payload: MedicalValueUpdate,
    changed_by_id: int,
    db: Session,
) -> MedicalValue:
    mv = (
        db.query(MedicalValue)
        .filter(MedicalValue.id == medical_value_id, MedicalValue.patient_id == patient_id)
        .first()
    )
    if not mv:
        raise HTTPException(status_code=404, detail="Medical value not found")
    update_data = payload.model_dump(exclude_unset=True)
    update_data.pop("episode_id", None)
    for key, value in update_data.items():
        setattr(mv, key, value)
    if "medical_value_template_id" in update_data and "medical_value_group_id" not in update_data:
        template_id = update_data.get("medical_value_template_id")
        template = None
        if template_id:
            template = db.query(MedicalValueTemplate).filter(MedicalValueTemplate.id == template_id).first()
        mv.medical_value_group_id = (
            template.medical_value_group_id
            if template and template.medical_value_group_id is not None
            else _get_default_group_id(db)
        )
    if any(key in update_data for key in ("value", "value_input", "unit_input_ucum", "medical_value_template_id", "datatype_id")):
        datatype_definition = _resolve_datatype_definition_for_value(
            template_id=mv.medical_value_template_id,
            datatype_id=mv.datatype_id,
            db=db,
        )
        normalized = normalize_medical_value(
            raw_value=(
                update_data.get("value_input")
                if ("value_input" in update_data and update_data.get("value_input") not in (None, ""))
                else (update_data.get("value") if "value" in update_data else mv.value_input or mv.value or "")
            ),
            unit_input_ucum=(
                update_data.get("unit_input_ucum")
                if "unit_input_ucum" in update_data
                else mv.unit_input_ucum
            ),
            datatype_definition=datatype_definition,
        )
        mv.value = normalized.value_legacy
        mv.value_input = normalized.value_input
        mv.unit_input_ucum = normalized.unit_input_ucum
        mv.value_canonical = normalized.value_canonical
        mv.unit_canonical_ucum = normalized.unit_canonical_ucum
        mv.normalization_status = normalized.normalization_status
        mv.normalization_error = normalized.normalization_error
    if any(key in update_data for key in ("organ_id", "is_donor_context", "context_key", "medical_value_group_id")):
        mv.episode_id = None
        mv.context_key = update_data.get("context_key") or build_context_key(
            organ_id=mv.organ_id,
            is_donor_context=bool(mv.is_donor_context),
        )
        if mv.medical_value_group_id is not None:
            group_instance = ensure_group_instance(
                db,
                patient_id=patient_id,
                medical_value_group_id=mv.medical_value_group_id,
                context_key=mv.context_key,
                organ_id=mv.organ_id,
                is_donor_context=bool(mv.is_donor_context),
                changed_by_id=changed_by_id,
            )
            mv.medical_value_group_instance_id = group_instance.id
    should_validate_uniqueness = any(
        key in update_data
        for key in (
            "medical_value_template_id",
            "name",
            "organ_id",
            "is_donor_context",
            "context_key",
            "medical_value_group_id",
        )
    )
    if should_validate_uniqueness:
        _assert_medical_value_unique_for_non_user_captured(
            patient_id=patient_id,
            group_key=_group_key_for_id(db, mv.medical_value_group_id),
            is_donor_context=bool(mv.is_donor_context),
            medical_value_template_id=mv.medical_value_template_id,
            name=mv.name or "",
            db=db,
            exclude_id=mv.id,
        )
    mv.changed_by_id = changed_by_id
    db.commit()
    db.refresh(mv)
    return mv


def delete_medical_value_for_patient(*, patient_id: int, medical_value_id: int, db: Session) -> None:
    mv = (
        db.query(MedicalValue)
        .filter(MedicalValue.id == medical_value_id, MedicalValue.patient_id == patient_id)
        .first()
    )
    if not mv:
        raise HTTPException(status_code=404, detail="Medical value not found")
    db.delete(mv)
    db.commit()


def list_medical_value_templates(db: Session) -> list[MedicalValueTemplate]:
    return (
        db.query(MedicalValueTemplate)
        .options(
            joinedload(MedicalValueTemplate.datatype),
            joinedload(MedicalValueTemplate.datatype_definition).joinedload(DatatypeDefinition.code),
            joinedload(MedicalValueTemplate.medical_value_group_template),
            joinedload(MedicalValueTemplate.context_templates).joinedload(MedicalValueTemplateContextTemplate.organ),
            joinedload(MedicalValueTemplate.context_templates).joinedload(MedicalValueTemplateContextTemplate.changed_by_user),
        )
        .order_by(MedicalValueTemplate.pos)
        .all()
    )


def get_medical_value_template_or_404(template_id: int, db: Session) -> MedicalValueTemplate:
    mv = (
        db.query(MedicalValueTemplate)
        .options(
            joinedload(MedicalValueTemplate.datatype),
            joinedload(MedicalValueTemplate.datatype_definition).joinedload(DatatypeDefinition.code),
            joinedload(MedicalValueTemplate.medical_value_group_template),
            joinedload(MedicalValueTemplate.context_templates).joinedload(MedicalValueTemplateContextTemplate.organ),
            joinedload(MedicalValueTemplate.context_templates).joinedload(MedicalValueTemplateContextTemplate.changed_by_user),
        )
        .filter(MedicalValueTemplate.id == template_id)
        .first()
    )
    if not mv:
        raise HTTPException(status_code=404, detail="Medical value template not found")
    return mv
