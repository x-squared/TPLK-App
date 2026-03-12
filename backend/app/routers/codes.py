from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..features.reference import list_codes as list_codes_service
from ..schemas import CodeResponse

router = APIRouter(prefix="/codes", tags=["codes"])


@router.get("/", response_model=list[CodeResponse])
def list_codes(
    type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return list_codes_service(code_type=type, db=db)
