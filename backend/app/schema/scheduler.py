from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from .reference import UserResponse


class ScheduledJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_key: str
    name: str
    description: str
    is_enabled: bool
    interval_seconds: int
    next_run_at: datetime | None = None
    max_retries: int
    retry_delay_seconds: int
    last_started_at: datetime | None = None
    last_finished_at: datetime | None = None
    last_status: str | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class ScheduledJobRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    trigger_type: str
    status: str
    attempt: int
    correlation_id: str
    summary: str
    error_text: str
    metrics_json: str
    started_at: datetime
    finished_at: datetime | None = None
    duration_ms: int | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class ScheduledJobEnabledUpdate(BaseModel):
    is_enabled: bool


class TriggerScheduledJobRequest(BaseModel):
    correlation_id: str | None = None
