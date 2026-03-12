from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ...models import Person, PersonTeam, User
from ...schemas import PersonCreate, PersonTeamCreate, PersonTeamUpdate, PersonUpdate


def _person_query(db: Session):
    return db.query(Person).options(joinedload(Person.changed_by_user))


def _team_query(db: Session, *, include_members: bool):
    query = db.query(PersonTeam).options(
        joinedload(PersonTeam.changed_by_user),
    )
    if include_members:
        query = query.options(
            joinedload(PersonTeam.members).joinedload(Person.changed_by_user),
        )
    return query


def _validate_user_id_uniqueness(*, db: Session, user_id: str | None, exclude_person_id: int | None = None) -> None:
    if not user_id:
        return
    query = db.query(Person).filter(Person.user_id == user_id)
    if exclude_person_id is not None:
        query = query.filter(Person.id != exclude_person_id)
    if query.first():
        raise HTTPException(status_code=422, detail="user_id already exists")


def _sync_linked_user_name(*, person: Person, db: Session) -> None:
    linked_user = db.query(User).filter(User.person_id == person.id).first()
    if linked_user:
        linked_user.name = f"{person.first_name} {person.surname}".strip()


def search_people(*, query_text: str, db: Session, limit: int = 20) -> list[Person]:
    normalized = query_text.strip()
    if not normalized:
        return []
    like = f"%{normalized}%"
    return (
        _person_query(db)
        .filter(
            or_(
                Person.first_name.ilike(like),
                Person.surname.ilike(like),
                Person.user_id.ilike(like),
            )
        )
        .order_by(Person.surname.asc(), Person.first_name.asc(), Person.id.asc())
        .limit(limit)
        .all()
    )


def list_people(*, query_text: str | None, db: Session) -> list[Person]:
    query = _person_query(db)
    if query_text:
        like = f"%{query_text.strip()}%"
        query = query.filter(
            or_(
                Person.first_name.ilike(like),
                Person.surname.ilike(like),
                Person.user_id.ilike(like),
            )
        )
    return query.order_by(Person.surname.asc(), Person.first_name.asc(), Person.id.asc()).all()


def create_person(*, payload: PersonCreate, changed_by_id: int, db: Session) -> Person:
    data = payload.model_dump()
    _validate_user_id_uniqueness(db=db, user_id=data.get("user_id"))
    item = Person(**data, changed_by_id=changed_by_id)
    db.add(item)
    db.flush()
    _sync_linked_user_name(person=item, db=db)
    db.commit()
    return _person_query(db).filter(Person.id == item.id).first()


def update_person(*, person_id: int, payload: PersonUpdate, changed_by_id: int, db: Session) -> Person:
    item = db.query(Person).filter(Person.id == person_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Person not found")
    data = payload.model_dump(exclude_unset=True)
    if "user_id" in data:
        _validate_user_id_uniqueness(db=db, user_id=data.get("user_id"), exclude_person_id=person_id)
    for key, value in data.items():
        setattr(item, key, value)
    item.changed_by_id = changed_by_id
    _sync_linked_user_name(person=item, db=db)
    db.commit()
    return _person_query(db).filter(Person.id == person_id).first()


def delete_person(*, person_id: int, db: Session) -> None:
    item = db.query(Person).filter(Person.id == person_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Person not found")
    linked_user = db.query(User).filter(User.person_id == person_id).first()
    if linked_user:
        raise HTTPException(status_code=422, detail="Cannot delete person linked to a user account")
    db.delete(item)
    db.commit()


def list_teams(*, db: Session, include_members: bool = False) -> list[PersonTeam]:
    return _team_query(db, include_members=include_members).order_by(PersonTeam.name.asc(), PersonTeam.id.asc()).all()


def get_team(*, team_id: int, db: Session, include_members: bool = True) -> PersonTeam:
    team = _team_query(db, include_members=include_members).filter(PersonTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def create_team(*, payload: PersonTeamCreate, changed_by_id: int, db: Session) -> PersonTeam:
    if db.query(PersonTeam).filter(PersonTeam.name == payload.name).first():
        raise HTTPException(status_code=422, detail="Team name already exists")
    team = PersonTeam(name=payload.name, changed_by_id=changed_by_id)
    db.add(team)
    db.flush()
    set_team_members(team_id=team.id, member_ids=payload.member_ids, changed_by_id=changed_by_id, db=db, commit=False)
    db.commit()
    return _team_query(db, include_members=False).filter(PersonTeam.id == team.id).first()


def update_team(*, team_id: int, payload: PersonTeamUpdate, changed_by_id: int, db: Session) -> PersonTeam:
    team = db.query(PersonTeam).filter(PersonTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        existing = db.query(PersonTeam).filter(PersonTeam.name == data["name"], PersonTeam.id != team_id).first()
        if existing:
            raise HTTPException(status_code=422, detail="Team name already exists")
    for key, value in data.items():
        setattr(team, key, value)
    team.changed_by_id = changed_by_id
    db.commit()
    return _team_query(db, include_members=False).filter(PersonTeam.id == team_id).first()


def set_team_members(
    *,
    team_id: int,
    member_ids: list[int],
    changed_by_id: int,
    db: Session,
    commit: bool = True,
) -> PersonTeam:
    team = db.query(PersonTeam).filter(PersonTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    unique_member_ids = list(dict.fromkeys(member_ids))
    members = db.query(Person).filter(Person.id.in_(unique_member_ids)).all() if unique_member_ids else []
    by_id = {member.id: member for member in members}
    missing = [person_id for person_id in unique_member_ids if person_id not in by_id]
    if missing:
        raise HTTPException(status_code=422, detail=f"Unknown member_ids: {', '.join(map(str, missing))}")
    team.members = [by_id[person_id] for person_id in unique_member_ids]
    team.changed_by_id = changed_by_id
    if commit:
        db.commit()
    return _team_query(db, include_members=True).filter(PersonTeam.id == team_id).first()


def delete_team(*, team_id: int, db: Session) -> None:
    team = db.query(PersonTeam).filter(PersonTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()
