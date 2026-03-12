from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Callable

from sqlalchemy.orm import Session


@dataclass(frozen=True)
class SchedulerJobDefinition:
    job_key: str
    name: str
    description: str
    interval_seconds: int
    is_enabled_by_default: bool
    max_retries: int = 0
    retry_delay_seconds: int = 60


@dataclass(frozen=True)
class SchedulerJobResult:
    summary: str
    metrics: dict[str, int]


SchedulerJobHandler = Callable[[Session, datetime], SchedulerJobResult]


def run_coordination_explantation_24h_completeness_check(_: Session, __: datetime) -> SchedulerJobResult:
    return SchedulerJobResult(
        summary="24h completeness check is configured and ready for implementation.",
        metrics={"checked_coordinations": 0, "created_tasks": 0},
    )


JOB_DEFINITIONS: tuple[SchedulerJobDefinition, ...] = (
    SchedulerJobDefinition(
        job_key="coordination.explantation_24h_completeness_check",
        name="Coordination Explantation 24h Completeness Check",
        description="Checks 24h after explantation whether required data is complete and creates follow-up tasks per organ.",
        interval_seconds=900,
        is_enabled_by_default=False,
        max_retries=1,
        retry_delay_seconds=60,
    ),
)

JOB_HANDLERS: dict[str, SchedulerJobHandler] = {
    "coordination.explantation_24h_completeness_check": run_coordination_explantation_24h_completeness_check,
}
