from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import ScheduledJob, ScheduledJobRun
from ...schemas import ScheduledJobResponse, ScheduledJobRunResponse
from .jobs import JOB_DEFINITIONS, JOB_HANDLERS


def _utc_now() -> datetime:
    return datetime.now(UTC)


def ensure_registered_jobs(*, db: Session) -> None:
    existing = {item.job_key: item for item in db.query(ScheduledJob).all()}
    changed = False
    for definition in JOB_DEFINITIONS:
        row = existing.get(definition.job_key)
        if row is None:
            row = ScheduledJob(
                job_key=definition.job_key,
                name=definition.name,
                description=definition.description,
                is_enabled=definition.is_enabled_by_default,
                interval_seconds=definition.interval_seconds,
                next_run_at=_utc_now() + timedelta(seconds=definition.interval_seconds) if definition.is_enabled_by_default else None,
                max_retries=definition.max_retries,
                retry_delay_seconds=definition.retry_delay_seconds,
                last_status=None,
            )
            db.add(row)
            changed = True
            continue
        row.name = definition.name
        row.description = definition.description
        if row.interval_seconds <= 0:
            row.interval_seconds = definition.interval_seconds
        if row.max_retries < 0:
            row.max_retries = definition.max_retries
        if row.retry_delay_seconds <= 0:
            row.retry_delay_seconds = definition.retry_delay_seconds
    if changed:
        db.commit()


def list_scheduled_jobs(*, db: Session) -> list[ScheduledJobResponse]:
    ensure_registered_jobs(db=db)
    rows = (
        db.query(ScheduledJob)
        .options(joinedload(ScheduledJob.changed_by_user))
        .order_by(ScheduledJob.job_key.asc())
        .all()
    )
    return [ScheduledJobResponse.model_validate(row, from_attributes=True) for row in rows]


def list_scheduled_job_runs(*, job_key: str, db: Session, limit: int = 50) -> list[ScheduledJobRunResponse]:
    ensure_registered_jobs(db=db)
    job = db.query(ScheduledJob).filter(ScheduledJob.job_key == job_key).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    rows = (
        db.query(ScheduledJobRun)
        .options(joinedload(ScheduledJobRun.changed_by_user))
        .filter(ScheduledJobRun.job_id == job.id)
        .order_by(ScheduledJobRun.started_at.desc(), ScheduledJobRun.id.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )
    return [ScheduledJobRunResponse.model_validate(row, from_attributes=True) for row in rows]


def set_scheduled_job_enabled(
    *,
    job_key: str,
    is_enabled: bool,
    changed_by_id: int,
    db: Session,
) -> ScheduledJobResponse:
    ensure_registered_jobs(db=db)
    job = db.query(ScheduledJob).filter(ScheduledJob.job_key == job_key).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    job.is_enabled = bool(is_enabled)
    if job.is_enabled:
        if job.next_run_at is None:
            job.next_run_at = _utc_now() + timedelta(seconds=job.interval_seconds)
    else:
        job.next_run_at = None
    job.changed_by_id = changed_by_id
    db.commit()
    refreshed = (
        db.query(ScheduledJob)
        .options(joinedload(ScheduledJob.changed_by_user))
        .filter(ScheduledJob.id == job.id)
        .first()
    )
    return ScheduledJobResponse.model_validate(refreshed, from_attributes=True)


def _execute_job(
    *,
    job: ScheduledJob,
    trigger_type: str,
    changed_by_id: int | None,
    db: Session,
    correlation_id: str | None = None,
) -> ScheduledJobRun:
    started_at = _utc_now()
    run = ScheduledJobRun(
        job_id=job.id,
        trigger_type=trigger_type,
        status="RUNNING",
        attempt=1,
        correlation_id=(correlation_id or str(uuid.uuid4())).strip(),
        summary="",
        error_text="",
        metrics_json="{}",
        started_at=started_at,
        changed_by_id=changed_by_id,
    )
    db.add(run)
    job.last_started_at = started_at
    job.last_status = "RUNNING"
    db.flush()

    handler = JOB_HANDLERS.get(job.job_key)
    if handler is None:
        run.status = "FAILED"
        run.summary = "No job handler registered."
        run.error_text = f"No handler found for job_key={job.job_key}"
        run.metrics_json = "{}"
        finished_at = _utc_now()
        run.finished_at = finished_at
        run.duration_ms = int((finished_at - started_at).total_seconds() * 1000)
        job.last_finished_at = finished_at
        job.last_status = "FAILED"
        if trigger_type == "SCHEDULED" and job.is_enabled:
            job.next_run_at = _utc_now() + timedelta(seconds=job.interval_seconds)
        db.commit()
        return run

    try:
        result = handler(db, started_at)
        run.status = "SUCCESS"
        run.summary = result.summary
        run.error_text = ""
        run.metrics_json = json.dumps(result.metrics, ensure_ascii=True, sort_keys=True)
        job.last_status = "SUCCESS"
    except Exception as exc:  # noqa: BLE001
        run.status = "FAILED"
        run.summary = "Scheduled job execution failed."
        run.error_text = str(exc)[:4000]
        run.metrics_json = "{}"
        job.last_status = "FAILED"
    finally:
        finished_at = _utc_now()
        run.finished_at = finished_at
        run.duration_ms = int((finished_at - started_at).total_seconds() * 1000)
        job.last_finished_at = finished_at
        if trigger_type == "SCHEDULED" and job.is_enabled:
            job.next_run_at = _utc_now() + timedelta(seconds=job.interval_seconds)
        db.commit()

    return run


def trigger_scheduled_job(
    *,
    job_key: str,
    changed_by_id: int,
    db: Session,
    correlation_id: str | None = None,
) -> ScheduledJobRunResponse:
    ensure_registered_jobs(db=db)
    job = db.query(ScheduledJob).filter(ScheduledJob.job_key == job_key).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Scheduled job not found")
    run = _execute_job(
        job=job,
        trigger_type="MANUAL",
        changed_by_id=changed_by_id,
        db=db,
        correlation_id=correlation_id,
    )
    refreshed = (
        db.query(ScheduledJobRun)
        .options(joinedload(ScheduledJobRun.changed_by_user))
        .filter(ScheduledJobRun.id == run.id)
        .first()
    )
    return ScheduledJobRunResponse.model_validate(refreshed, from_attributes=True)


def run_due_jobs(*, db: Session) -> int:
    ensure_registered_jobs(db=db)
    now = _utc_now()
    due_jobs = (
        db.query(ScheduledJob)
        .filter(
            ScheduledJob.is_enabled.is_(True),
            ScheduledJob.next_run_at.isnot(None),
            ScheduledJob.next_run_at <= now,
        )
        .order_by(ScheduledJob.next_run_at.asc(), ScheduledJob.id.asc())
        .all()
    )
    executed = 0
    for job in due_jobs:
        _execute_job(
            job=job,
            trigger_type="SCHEDULED",
            changed_by_id=None,
            db=db,
        )
        executed += 1
    return executed
