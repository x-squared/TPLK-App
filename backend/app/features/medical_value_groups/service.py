from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import MedicalValueGroupContextTemplate, MedicalValueGroupTemplate
from ...schemas import MedicalValueGroupTemplateUpdate


def _query_with_joins(db: Session):
    return db.query(MedicalValueGroupTemplate).options(
        joinedload(MedicalValueGroupTemplate.changed_by_user),
        joinedload(MedicalValueGroupTemplate.context_templates).joinedload(MedicalValueGroupContextTemplate.organ),
        joinedload(MedicalValueGroupTemplate.context_templates).joinedload(MedicalValueGroupContextTemplate.changed_by_user),
    )


def list_medical_value_groups(*, db: Session) -> list[MedicalValueGroupTemplate]:
    return (
        _query_with_joins(db)
        .order_by(MedicalValueGroupTemplate.pos.asc(), MedicalValueGroupTemplate.name_default.asc())
        .all()
    )


def update_medical_value_group(
    *,
    group_id: int,
    payload: MedicalValueGroupTemplateUpdate,
    changed_by_id: int,
    db: Session,
) -> MedicalValueGroupTemplate:
    group = db.query(MedicalValueGroupTemplate).filter(MedicalValueGroupTemplate.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Medical value group not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, key, value)
    group.changed_by_id = changed_by_id
    db.commit()
    return _query_with_joins(db).filter(MedicalValueGroupTemplate.id == group_id).first()
