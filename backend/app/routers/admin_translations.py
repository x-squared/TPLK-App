from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..features.translations import (
    get_translation_overrides as get_translation_overrides_service,
    replace_translation_overrides as replace_translation_overrides_service,
)
from ..models import User
from ..schemas import TranslationOverridesResponse, TranslationOverridesUpdate

router = APIRouter(prefix="/admin/translations", tags=["admin_translations"])


@router.get("/", response_model=TranslationOverridesResponse)
def get_admin_translation_overrides(
    locale: str = "de",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return get_translation_overrides_service(locale=locale, db=db)


@router.put("/", response_model=TranslationOverridesResponse)
def replace_admin_translation_overrides(
    payload: TranslationOverridesUpdate,
    locale: str = "de",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return replace_translation_overrides_service(
        locale=locale,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
