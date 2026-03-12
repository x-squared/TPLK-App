from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_protocol_state import get_coordination_protocol_state as get_coordination_protocol_state_service
from ..models import User
from ..schemas import CoordinationProtocolStateResponse

router = APIRouter(prefix="/coordinations/{coordination_id}/protocol-state", tags=["coordination_protocol_state"])


@router.get("/", response_model=CoordinationProtocolStateResponse)
def get_coordination_protocol_state(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return get_coordination_protocol_state_service(coordination_id=coordination_id, db=db)
