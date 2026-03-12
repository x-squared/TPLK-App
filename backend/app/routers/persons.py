from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.people import (
    create_person as create_person_service,
    list_teams as list_teams_service,
    search_people as search_people_service,
)
from ..models import User
from ..schemas import PersonCreate, PersonResponse, PersonTeamListResponse

router = APIRouter(prefix="/persons", tags=["persons"])


@router.get("/search", response_model=list[PersonResponse])
def search_people(
    query: str = Query(""),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.tasks")),
):
    return search_people_service(query_text=query, db=db, limit=20)


@router.post("/", response_model=PersonResponse, status_code=201)
def create_person(
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.tasks")),
):
    return create_person_service(payload=payload, changed_by_id=current_user.id, db=db)


@router.get("/teams", response_model=list[PersonTeamListResponse])
def list_teams(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.tasks")),
):
    return list_teams_service(db=db, include_members=False)
