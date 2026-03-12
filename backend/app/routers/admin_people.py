from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..features.people import (
    create_person as create_person_service,
    create_team as create_team_service,
    delete_person as delete_person_service,
    delete_team as delete_team_service,
    get_team as get_team_service,
    list_people as list_people_service,
    list_teams as list_teams_service,
    set_team_members as set_team_members_service,
    update_person as update_person_service,
    update_team as update_team_service,
)
from ..models import User
from ..schemas import (
    PersonCreate,
    PersonResponse,
    PersonTeamCreate,
    PersonTeamListResponse,
    PersonTeamMembersUpdate,
    PersonTeamResponse,
    PersonTeamUpdate,
    PersonUpdate,
)

router = APIRouter(prefix="/admin/people", tags=["admin_people"])


@router.get("/", response_model=list[PersonResponse])
def list_people(
    query: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_people_service(query_text=query, db=db)


@router.post("/", response_model=PersonResponse, status_code=201)
def create_person(
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return create_person_service(payload=payload, changed_by_id=current_user.id, db=db)


@router.patch("/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return update_person_service(person_id=person_id, payload=payload, changed_by_id=current_user.id, db=db)


@router.delete("/{person_id}", status_code=204)
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    delete_person_service(person_id=person_id, db=db)


@router.get("/teams", response_model=list[PersonTeamListResponse])
def list_teams(
    include_members: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return list_teams_service(db=db, include_members=include_members)


@router.get("/teams/{team_id}", response_model=PersonTeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return get_team_service(team_id=team_id, db=db, include_members=True)


@router.post("/teams", response_model=PersonTeamListResponse, status_code=201)
def create_team(
    payload: PersonTeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return create_team_service(payload=payload, changed_by_id=current_user.id, db=db)


@router.patch("/teams/{team_id}", response_model=PersonTeamListResponse)
def update_team(
    team_id: int,
    payload: PersonTeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return update_team_service(team_id=team_id, payload=payload, changed_by_id=current_user.id, db=db)


@router.put("/teams/{team_id}/members", response_model=PersonTeamResponse)
def set_team_members(
    team_id: int,
    payload: PersonTeamMembersUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return set_team_members_service(
        team_id=team_id,
        member_ids=payload.member_ids,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/teams/{team_id}", status_code=204)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    delete_team_service(team_id=team_id, db=db)
