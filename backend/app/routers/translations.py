from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..features.translations import get_translation_overrides as get_translation_overrides_service
from ..models import User
from ..schemas import TranslationOverridesResponse

router = APIRouter(prefix="/translations", tags=["translations"])


@router.get("/overrides", response_model=TranslationOverridesResponse)
def get_translation_overrides(
    locale: str = "de",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_translation_overrides_service(locale=locale, db=db)
