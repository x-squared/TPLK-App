from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.coordination_time_logs import (
    create_coordination_time_log as create_coordination_time_log_service,
    delete_coordination_time_log as delete_coordination_time_log_service,
    get_coordination_clock_state as get_coordination_clock_state_service,
    list_coordination_time_logs as list_coordination_time_logs_service,
    start_coordination_clock as start_coordination_clock_service,
    stop_coordination_clock as stop_coordination_clock_service,
    update_coordination_time_log as update_coordination_time_log_service,
)
from ..models import User
from ..schemas import (
    CoordinationTimeClockStartRequest,
    CoordinationTimeClockStateResponse,
    CoordinationTimeClockStopRequest,
    CoordinationTimeLogCreate,
    CoordinationTimeLogResponse,
    CoordinationTimeLogUpdate,
)

router = APIRouter(prefix="/coordinations/{coordination_id}/time-logs", tags=["coordination_time_log"])


@router.get("/", response_model=list[CoordinationTimeLogResponse])
def list_coordination_time_logs(
    coordination_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return list_coordination_time_logs_service(coordination_id=coordination_id, db=db)


@router.post("/", response_model=CoordinationTimeLogResponse, status_code=201)
def create_coordination_time_log(
    coordination_id: int,
    payload: CoordinationTimeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return create_coordination_time_log_service(
        coordination_id=coordination_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{time_log_id}", response_model=CoordinationTimeLogResponse)
def update_coordination_time_log(
    coordination_id: int,
    time_log_id: int,
    payload: CoordinationTimeLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return update_coordination_time_log_service(
        coordination_id=coordination_id,
        time_log_id=time_log_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{time_log_id}", status_code=204)
def delete_coordination_time_log(
    coordination_id: int,
    time_log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("edit.donors")),
):
    delete_coordination_time_log_service(coordination_id=coordination_id, time_log_id=time_log_id, db=db)


@router.get("/clock-state", response_model=CoordinationTimeClockStateResponse)
def get_coordination_clock_state(
    coordination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view.donors")),
):
    return get_coordination_clock_state_service(
        coordination_id=coordination_id,
        user_id=current_user.id,
        db=db,
    )


@router.post("/clock/start", response_model=CoordinationTimeClockStateResponse)
def start_coordination_clock(
    coordination_id: int,
    payload: CoordinationTimeClockStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return start_coordination_clock_service(
        coordination_id=coordination_id,
        user_id=current_user.id,
        changed_by_id=current_user.id,
        comment=payload.comment,
        db=db,
    )


@router.post("/clock/stop", response_model=CoordinationTimeClockStateResponse)
def stop_coordination_clock(
    coordination_id: int,
    payload: CoordinationTimeClockStopRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return stop_coordination_clock_service(
        coordination_id=coordination_id,
        user_id=current_user.id,
        changed_by_id=current_user.id,
        comment=payload.comment,
        db=db,
    )
