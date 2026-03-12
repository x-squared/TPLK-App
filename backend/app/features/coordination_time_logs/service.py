from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Coordination, CoordinationTimeLog, User
from ...schemas import (
    CoordinationTimeClockStateResponse,
    CoordinationTimeLogCreate,
    CoordinationTimeLogUpdate,
)


def _ensure_coordination_exists(coordination_id: int, db: Session) -> None:
    item = db.query(Coordination).filter(Coordination.id == coordination_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Coordination not found")


def _ensure_user_exists(user_id: int, db: Session) -> None:
    item = db.query(User).filter(User.id == user_id).first()
    if not item:
        raise HTTPException(status_code=422, detail="user_id must reference USER")


def _query_with_joins(db: Session):
    return db.query(CoordinationTimeLog).options(
        joinedload(CoordinationTimeLog.user),
        joinedload(CoordinationTimeLog.changed_by_user),
    )


def _active_time_logs_for_user(*, user_id: int, db: Session) -> list[CoordinationTimeLog]:
    return (
        _query_with_joins(db)
        .filter(
            CoordinationTimeLog.user_id == user_id,
            CoordinationTimeLog.start.isnot(None),
            CoordinationTimeLog.end.is_(None),
        )
        .order_by(CoordinationTimeLog.start.asc(), CoordinationTimeLog.id.asc())
        .all()
    )


def _build_clock_state_response(
    *,
    coordination_id: int,
    user_id: int,
    active_time_log: CoordinationTimeLog | None,
    auto_stopped_time_log_ids: list[int] | None = None,
    auto_stopped_coordination_ids: list[int] | None = None,
) -> CoordinationTimeClockStateResponse:
    active_coordination_id = active_time_log.coordination_id if active_time_log is not None else None
    return CoordinationTimeClockStateResponse(
        user_id=user_id,
        active_time_log=active_time_log,
        active_coordination_id=active_coordination_id,
        active_on_current_coordination=active_coordination_id == coordination_id if active_coordination_id is not None else False,
        auto_stopped_time_log_ids=auto_stopped_time_log_ids or [],
        auto_stopped_coordination_ids=auto_stopped_coordination_ids or [],
    )


def _validate_interval(start: datetime | None, end: datetime | None) -> None:
    if start is None and end is None:
        return
    if start is None or end is None:
        raise HTTPException(status_code=422, detail="start and end must both be set")
    if start >= end:
        raise HTTPException(status_code=422, detail="start must be before end")


def _ensure_no_overlap(
    *,
    coordination_id: int,
    user_id: int,
    start: datetime | None,
    end: datetime | None,
    db: Session,
    exclude_id: int | None = None,
) -> None:
    if start is None or end is None:
        return
    query = db.query(CoordinationTimeLog).filter(
        CoordinationTimeLog.coordination_id == coordination_id,
        CoordinationTimeLog.user_id == user_id,
        CoordinationTimeLog.start.isnot(None),
        CoordinationTimeLog.end.isnot(None),
    )
    if exclude_id is not None:
        query = query.filter(CoordinationTimeLog.id != exclude_id)
    overlaps = query.filter(
        CoordinationTimeLog.start < end,
        CoordinationTimeLog.end > start,
    ).first()
    if overlaps:
        raise HTTPException(status_code=422, detail="Time interval overlaps with existing log entry")


def list_coordination_time_logs(*, coordination_id: int, db: Session) -> list[CoordinationTimeLog]:
    _ensure_coordination_exists(coordination_id, db)
    return (
        _query_with_joins(db)
        .filter(CoordinationTimeLog.coordination_id == coordination_id)
        .all()
    )


def create_coordination_time_log(
    *,
    coordination_id: int,
    payload: CoordinationTimeLogCreate,
    changed_by_id: int,
    db: Session,
) -> CoordinationTimeLog:
    _ensure_coordination_exists(coordination_id, db)
    _ensure_user_exists(payload.user_id, db)
    _validate_interval(payload.start, payload.end)
    _ensure_no_overlap(
        coordination_id=coordination_id,
        user_id=payload.user_id,
        start=payload.start,
        end=payload.end,
        db=db,
    )
    item = CoordinationTimeLog(
        coordination_id=coordination_id,
        user_id=payload.user_id,
        start=payload.start,
        end=payload.end,
        comment=payload.comment,
        changed_by_id=changed_by_id,
    )
    db.add(item)
    db.commit()
    return _query_with_joins(db).filter(CoordinationTimeLog.id == item.id).first()


def update_coordination_time_log(
    *,
    coordination_id: int,
    time_log_id: int,
    payload: CoordinationTimeLogUpdate,
    changed_by_id: int,
    db: Session,
) -> CoordinationTimeLog:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        db.query(CoordinationTimeLog)
        .filter(
            CoordinationTimeLog.id == time_log_id,
            CoordinationTimeLog.coordination_id == coordination_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination time log not found")

    data = payload.model_dump(exclude_unset=True)
    user_id = data.get("user_id", item.user_id)
    if "user_id" in data and data["user_id"] is not None:
        _ensure_user_exists(user_id, db)
    start = data.get("start", item.start)
    end = data.get("end", item.end)
    _validate_interval(start, end)
    _ensure_no_overlap(
        coordination_id=coordination_id,
        user_id=user_id,
        start=start,
        end=end,
        db=db,
        exclude_id=item.id,
    )
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    db.commit()
    return _query_with_joins(db).filter(CoordinationTimeLog.id == time_log_id).first()


def delete_coordination_time_log(*, coordination_id: int, time_log_id: int, db: Session) -> None:
    _ensure_coordination_exists(coordination_id, db)
    item = (
        db.query(CoordinationTimeLog)
        .filter(
            CoordinationTimeLog.id == time_log_id,
            CoordinationTimeLog.coordination_id == coordination_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Coordination time log not found")
    db.delete(item)
    db.commit()


def get_coordination_clock_state(
    *,
    coordination_id: int,
    user_id: int,
    db: Session,
) -> CoordinationTimeClockStateResponse:
    _ensure_coordination_exists(coordination_id, db)
    _ensure_user_exists(user_id, db)
    active_logs = _active_time_logs_for_user(user_id=user_id, db=db)
    active_log = active_logs[-1] if active_logs else None
    return _build_clock_state_response(
        coordination_id=coordination_id,
        user_id=user_id,
        active_time_log=active_log,
    )


def start_coordination_clock(
    *,
    coordination_id: int,
    user_id: int,
    changed_by_id: int,
    comment: str,
    db: Session,
) -> CoordinationTimeClockStateResponse:
    _ensure_coordination_exists(coordination_id, db)
    _ensure_user_exists(user_id, db)

    now = datetime.now()
    active_logs = _active_time_logs_for_user(user_id=user_id, db=db)
    auto_stopped_ids: list[int] = []
    auto_stopped_coordination_ids: list[int] = []
    active_on_target = next((row for row in active_logs if row.coordination_id == coordination_id), None)

    for log in active_logs:
        if active_on_target is not None and log.id == active_on_target.id:
            continue
        log.end = now
        suffix = f"Stopped automatically due to switch to coordination #{coordination_id}."
        existing_comment = (log.comment or "").strip()
        log.comment = f"{existing_comment} {suffix}".strip() if existing_comment else suffix
        log.changed_by_id = changed_by_id
        auto_stopped_ids.append(log.id)
        auto_stopped_coordination_ids.append(log.coordination_id)

    if active_on_target is None:
        next_comment = (comment or "").strip()
        active_on_target = CoordinationTimeLog(
            coordination_id=coordination_id,
            user_id=user_id,
            start=now,
            end=None,
            comment=next_comment,
            changed_by_id=changed_by_id,
        )
        db.add(active_on_target)

    db.commit()
    refreshed = _query_with_joins(db).filter(CoordinationTimeLog.id == active_on_target.id).first()
    return _build_clock_state_response(
        coordination_id=coordination_id,
        user_id=user_id,
        active_time_log=refreshed,
        auto_stopped_time_log_ids=auto_stopped_ids,
        auto_stopped_coordination_ids=sorted(set(auto_stopped_coordination_ids)),
    )


def stop_coordination_clock(
    *,
    coordination_id: int,
    user_id: int,
    changed_by_id: int,
    comment: str,
    db: Session,
) -> CoordinationTimeClockStateResponse:
    _ensure_coordination_exists(coordination_id, db)
    _ensure_user_exists(user_id, db)
    active_logs = _active_time_logs_for_user(user_id=user_id, db=db)
    active_log = next((row for row in active_logs if row.coordination_id == coordination_id), None)
    if active_log is None:
        raise HTTPException(status_code=422, detail="No active running clock found for this coordination and user")

    now = datetime.now()
    active_log.end = now
    stop_comment = (comment or "").strip()
    if stop_comment:
        existing = (active_log.comment or "").strip()
        active_log.comment = f"{existing} {stop_comment}".strip() if existing else stop_comment
    active_log.changed_by_id = changed_by_id
    db.commit()
    return _build_clock_state_response(
        coordination_id=coordination_id,
        user_id=user_id,
        active_time_log=None,
    )
