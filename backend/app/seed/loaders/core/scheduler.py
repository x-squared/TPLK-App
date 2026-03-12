from datetime import UTC, datetime

from sqlalchemy.orm import Session

from ....models import ScheduledJob


def sync_scheduled_jobs_core(db: Session) -> None:
    from ...datasets.core.scheduled_jobs import RECORDS

    existing_by_key = {
        row.job_key: row
        for row in db.query(ScheduledJob).all()
    }
    desired_keys = {record["job_key"] for record in RECORDS}

    for row in list(existing_by_key.values()):
        if row.job_key not in desired_keys:
            db.delete(row)

    for record in RECORDS:
        row = existing_by_key.get(record["job_key"])
        if row is None:
            row = ScheduledJob(job_key=record["job_key"])
            db.add(row)
        row.name = record["name"]
        row.description = record["description"]
        row.is_enabled = bool(record["is_enabled"])
        row.interval_seconds = int(record["interval_seconds"])
        row.max_retries = int(record["max_retries"])
        row.retry_delay_seconds = int(record["retry_delay_seconds"])
        if row.is_enabled and row.next_run_at is None:
            row.next_run_at = datetime.now(UTC)
        if not row.is_enabled:
            row.next_run_at = None

    db.commit()
