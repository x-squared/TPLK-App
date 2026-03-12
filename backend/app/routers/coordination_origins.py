from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_origins import (
    delete_coordination_origin as delete_coordination_origin_service,
    get_coordination_origin as get_coordination_origin_service,
    update_coordination_origin as update_coordination_origin_service,
    upsert_coordination_origin as upsert_coordination_origin_service,
)
from ..models import CoordinationOrigin, User
from ..schemas import CoordinationOriginCreate, CoordinationOriginResponse, CoordinationOriginUpdate

router = APIRouter(prefix="/coordinations/{coordination_id}/origin", tags=["coordination_origin"])


def _compute_organs_declined(_: CoordinationOrigin, __: Session) -> bool:
    # Placeholder until decline-reason entities are modeled.
    return False


def _to_response(item: CoordinationOrigin, db: Session) -> CoordinationOriginResponse:
    base = CoordinationOriginResponse.model_validate(item)
    return base.model_copy(update={"organs_declined": _compute_organs_declined(item, db)})


@router.get("/", response_model=CoordinationOriginResponse)
def get_coordination_origin(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    item = get_coordination_origin_service(coordination_id=coordination_id, db=db)
    return _to_response(item, db)


@router.put("/", response_model=CoordinationOriginResponse)
def upsert_coordination_origin(
    coordination_id: int,
    payload: CoordinationOriginCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    refreshed = upsert_coordination_origin_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
    return _to_response(refreshed, db)


@router.patch("/", response_model=CoordinationOriginResponse)
def update_coordination_origin(
    coordination_id: int,
    payload: CoordinationOriginUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    refreshed = update_coordination_origin_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
    return _to_response(refreshed, db)


@router.delete("/", status_code=204)
def delete_coordination_origin(
    coordination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    _ = current_user
    delete_coordination_origin_service(coordination_id=coordination_id, db=db)
