from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_protocol_events import (
    create_coordination_protocol_event as create_coordination_protocol_event_service,
    list_coordination_protocol_events as list_coordination_protocol_events_service,
)
from ..models import User
from ..schemas import CoordinationProtocolEventLogCreate, CoordinationProtocolEventLogResponse

router = APIRouter(prefix="/coordinations/{coordination_id}/protocol-events", tags=["coordination_protocol_event"])


@router.get("/", response_model=list[CoordinationProtocolEventLogResponse])
def list_coordination_protocol_events(
    coordination_id: int,
    organ_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return list_coordination_protocol_events_service(coordination_id=coordination_id, organ_id=organ_id, db=db)


@router.post("/", response_model=CoordinationProtocolEventLogResponse, status_code=201)
def create_coordination_protocol_event(
    coordination_id: int,
    payload: CoordinationProtocolEventLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return create_coordination_protocol_event_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
