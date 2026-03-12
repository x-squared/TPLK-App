from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..features.e2e_tests import (
    ensure_dev_tools_enabled,
    get_e2e_test_metadata as get_e2e_test_metadata_service,
    run_e2e_tests as run_e2e_tests_service,
)
from ..models import User
from ..schemas import (
    E2ETestMetadataResponse,
    E2ETestRunRequest,
    E2ETestRunResponse,
)

router = APIRouter(prefix="/e2e-tests", tags=["e2e-tests"])


@router.get("/metadata", response_model=E2ETestMetadataResponse)
def get_e2e_test_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = (db, current_user)
    return get_e2e_test_metadata_service()


@router.post("/run", response_model=E2ETestRunResponse)
def run_e2e_tests(
    payload: E2ETestRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = (db, current_user)
    return run_e2e_tests_service(payload)


@router.post("/health-check/create-422")
def create_health_check_422(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = (db, current_user)
    ensure_dev_tools_enabled()
    raise HTTPException(
        status_code=422,
        detail=[
            {
                "loc": ["body", "health_check"],
                "msg": "Health check test endpoint intentionally triggered a 422 error.",
                "type": "value_error",
            }
        ],
    )
