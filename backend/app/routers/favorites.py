from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..features.favorites import (
    create_favorite as create_favorite_service,
    delete_favorite as delete_favorite_service,
    list_favorites as list_favorites_service,
    reorder_favorites as reorder_favorites_service,
)
from ..models import User
from ..schemas import FavoriteCreate, FavoriteReorderRequest, FavoriteResponse

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=list[FavoriteResponse])
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_favorites_service(user_id=current_user.id, db=db)


@router.post("/", response_model=FavoriteResponse, status_code=201)
def create_favorite(
    payload: FavoriteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_favorite_service(user_id=current_user.id, payload=payload, db=db)


@router.delete("/{favorite_id}", status_code=204)
def delete_favorite(
    favorite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_favorite_service(favorite_id=favorite_id, user_id=current_user.id, db=db)


@router.patch("/order", response_model=list[FavoriteResponse])
def reorder_favorites(
    payload: FavoriteReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return reorder_favorites_service(user_id=current_user.id, favorite_ids=payload.favorite_ids, db=db)
