from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..features.scheduler import (
    list_scheduled_job_runs as list_scheduled_job_runs_service,
    list_scheduled_jobs as list_scheduled_jobs_service,
    set_scheduled_job_enabled as set_scheduled_job_enabled_service,
    trigger_scheduled_job as trigger_scheduled_job_service,
)
from ..models import User
from ..schemas import (
    ScheduledJobEnabledUpdate,
    ScheduledJobResponse,
    ScheduledJobRunResponse,
    TriggerScheduledJobRequest,
)

router = APIRouter(prefix="/admin/scheduler", tags=["admin_scheduler"])


@router.get("/jobs", response_model=list[ScheduledJobResponse])
def list_scheduled_jobs(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_scheduled_jobs_service(db=db)


@router.get("/jobs/{job_key}/runs", response_model=list[ScheduledJobRunResponse])
def list_scheduled_job_runs(
    job_key: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_scheduled_job_runs_service(job_key=job_key, limit=limit, db=db)


@router.post("/jobs/{job_key}/trigger", response_model=ScheduledJobRunResponse)
def trigger_scheduled_job(
    job_key: str,
    payload: TriggerScheduledJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return trigger_scheduled_job_service(
        job_key=job_key,
        changed_by_id=current_user.id,
        correlation_id=payload.correlation_id,
        db=db,
    )


@router.put("/jobs/{job_key}/enabled", response_model=ScheduledJobResponse)
def set_scheduled_job_enabled(
    job_key: str,
    payload: ScheduledJobEnabledUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return set_scheduled_job_enabled_service(
        job_key=job_key,
        is_enabled=payload.is_enabled,
        changed_by_id=current_user.id,
        db=db,
    )
