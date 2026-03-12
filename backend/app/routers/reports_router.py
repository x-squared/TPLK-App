from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.reports.service import execute_report as execute_report_service
from ..features.reports.service import get_report_metadata as get_report_metadata_service
from ..models import User
from ..schemas import ReportExecuteRequest, ReportExecuteResponse, ReportMetadataResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/metadata", response_model=ReportMetadataResponse)
def get_report_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view.reports")),
):
    _ = (db, current_user)
    return get_report_metadata_service(db=db)


@router.post("/execute", response_model=ReportExecuteResponse)
def execute_report(
    payload: ReportExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view.reports")),
):
    _ = current_user
    return execute_report_service(payload=payload, db=db)
