from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..features.reference import list_catalogues as list_catalogues_service
from ..schemas import CatalogueResponse

router = APIRouter(prefix="/catalogues", tags=["catalogues"])


@router.get("/", response_model=list[CatalogueResponse])
def list_catalogues(
    type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return list_catalogues_service(catalogue_type=type, db=db)
