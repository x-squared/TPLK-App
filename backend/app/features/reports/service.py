from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...schemas import ReportExecuteRequest, ReportExecuteResponse, ReportMetadataResponse
from .engine import active_field_map, build_metadata_response, execute_report_request
from .sources import build_sources

SOURCES = build_sources()


def get_report_metadata(*, db: Session) -> ReportMetadataResponse:
    _ = db
    return build_metadata_response(SOURCES)


def execute_report(*, payload: ReportExecuteRequest, db: Session) -> ReportExecuteResponse:
    source = SOURCES.get(payload.source)
    if not source:
        raise HTTPException(status_code=422, detail=f"Unknown source '{payload.source}'")
    field_map = active_field_map(source, payload.joins)
    return execute_report_request(payload, source, field_map, db)

