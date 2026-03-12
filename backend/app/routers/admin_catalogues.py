from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..features.reference import list_catalogue_types, list_catalogues, update_catalogue
from ..models import User
from ..schemas import CatalogueResponse, CatalogueTypeSummaryResponse, CatalogueUpdate

router = APIRouter(prefix="/admin/catalogues", tags=["admin_catalogues"])


@router.get("/types", response_model=list[CatalogueTypeSummaryResponse])
def get_catalogue_types(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_catalogue_types(db=db)


@router.get("/", response_model=list[CatalogueResponse])
def get_catalogues(
    type: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_catalogues(catalogue_type=type, db=db)


@router.patch("/{catalogue_id}", response_model=CatalogueResponse)
def patch_catalogue(
    catalogue_id: int,
    payload: CatalogueUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return update_catalogue(catalogue_id=catalogue_id, payload=payload, db=db)
