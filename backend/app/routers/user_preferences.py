from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..features.user_preferences import get_user_preferences, update_user_preferences
from ..models import User
from ..schemas import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter(prefix="/user-preferences", tags=["user-preferences"])


@router.get("/me", response_model=UserPreferencesResponse)
def read_my_preferences(current_user: User = Depends(get_current_user)):
    return get_user_preferences(user=current_user)


@router.patch("/me", response_model=UserPreferencesResponse)
def patch_my_preferences(
    payload: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_user_preferences(db=db, user=current_user, payload=payload)
