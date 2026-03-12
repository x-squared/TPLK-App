from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...models import Coordination

DUAL_ASSIGNMENT_ORGAN_KEYS = {"KIDNEY", "LUNG"}
ORGAN_WORKFLOW_CLEARED_EVENT = "Organ workflow cleared after rejection"


def ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def next_value_id(*, slot_row_id: int, field_template_id: int) -> int:
    return (slot_row_id * 10000) + field_template_id


def enum_value(raw: object) -> str:
    return raw.value if hasattr(raw, "value") else str(raw or "")
