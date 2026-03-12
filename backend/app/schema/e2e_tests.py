from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

E2ETestRunnerKey = Literal["all", "specification", "client_server", "server"]


class E2ETestRunnerOption(BaseModel):
    key: E2ETestRunnerKey
    label: str
    description: str


class E2ETestMetadataResponse(BaseModel):
    runners: list[E2ETestRunnerOption]


class E2ETestRunRequest(BaseModel):
    runner: E2ETestRunnerKey
    output_tail_lines: int = 160


class E2ETestCaseResultResponse(BaseModel):
    case_id: str
    name: str
    status: str
    message: str
    source_link: str
    source_file_abs: str


class E2ETestRunResponse(BaseModel):
    runner: E2ETestRunnerKey
    success: bool
    exit_code: int
    started_at: datetime
    finished_at: datetime
    duration_seconds: float
    report_path: str | None
    report_file_abs: str | None
    output_tail: str
    report_excerpt: str | None
    case_results: list[E2ETestCaseResultResponse]
