from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ...models import Colloqium, ColloqiumParticipant, ColloqiumType, ColloqiumTypeParticipant, Person
from ...schemas import ColloqiumCreate, ColloqiumUpdate


def _validate_colloqium_type_or_422(*, db: Session, colloqium_type_id: int) -> ColloqiumType:
    item = db.query(ColloqiumType).filter(ColloqiumType.id == colloqium_type_id).first()
    if not item:
        raise HTTPException(status_code=422, detail="colloqium_type_id references unknown COLLOQIUM_TYPE")
    return item


def _colloqium_query(db: Session):
    return db.query(Colloqium).options(
        joinedload(Colloqium.colloqium_type).joinedload(ColloqiumType.organ),
        joinedload(Colloqium.colloqium_type).joinedload(ColloqiumType.participant_links).joinedload(ColloqiumTypeParticipant.person),
        joinedload(Colloqium.changed_by_user),
        joinedload(Colloqium.participant_links).joinedload(ColloqiumParticipant.person),
    )


def _format_participants(people: list[Person]) -> str:
    return ", ".join(f"{person.first_name} {person.surname}".strip() for person in people if person)


def _resolve_people_or_422(*, db: Session, participant_ids: list[int]) -> list[Person]:
    if not participant_ids:
        return []
    unique_ids = list(dict.fromkeys(participant_ids))
    people = db.query(Person).filter(Person.id.in_(unique_ids)).all()
    by_id = {person.id: person for person in people}
    missing = [person_id for person_id in unique_ids if person_id not in by_id]
    if missing:
        raise HTTPException(status_code=422, detail=f"Unknown participant_ids: {', '.join(map(str, missing))}")
    return [by_id[person_id] for person_id in unique_ids]


def _set_colloqium_participants(*, item: Colloqium, people: list[Person], db: Session) -> None:
    item.participant_links.clear()
    db.flush()
    for pos, person in enumerate(people, start=1):
        item.participant_links.append(
            ColloqiumParticipant(
                person_id=person.id,
                pos=pos,
            )
        )
    item.participants = _format_participants(people)


def list_colloqiums(db: Session) -> list[Colloqium]:
    return (
        _colloqium_query(db)
        .order_by(Colloqium.date.desc(), Colloqium.id.desc())
        .all()
    )


def create_colloqium(*, payload: ColloqiumCreate, changed_by_id: int, db: Session) -> Colloqium:
    colloqium_type = _validate_colloqium_type_or_422(db=db, colloqium_type_id=payload.colloqium_type_id)
    payload_data = payload.model_dump()
    participant_ids = payload_data.pop("participant_ids", [])
    item = Colloqium(**payload_data, changed_by_id=changed_by_id)
    db.add(item)
    default_people = [link.person for link in (colloqium_type.participant_links or []) if link.person is not None]
    if participant_ids:
        people = _resolve_people_or_422(db=db, participant_ids=participant_ids)
    else:
        people = default_people
    _set_colloqium_participants(item=item, people=people, db=db)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail="colloqium with same colloqium_type_id and date already exists",
        ) from None
    return _colloqium_query(db).filter(Colloqium.id == item.id).first()


def update_colloqium(
    *,
    colloqium_id: int,
    payload: ColloqiumUpdate,
    changed_by_id: int,
    db: Session,
) -> Colloqium:
    item = db.query(Colloqium).filter(Colloqium.id == colloqium_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Colloqium not found")
    data = payload.model_dump(exclude_unset=True)
    if "colloqium_type_id" in data:
        _validate_colloqium_type_or_422(db=db, colloqium_type_id=data["colloqium_type_id"])
    participant_ids = data.pop("participant_ids", None)
    for key, value in data.items():
        setattr(item, key, value)
    if participant_ids is not None:
        people = _resolve_people_or_422(db=db, participant_ids=participant_ids)
        _set_colloqium_participants(item=item, people=people, db=db)
    item.changed_by_id = changed_by_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail="colloqium with same colloqium_type_id and date already exists",
        ) from None
    return _colloqium_query(db).filter(Colloqium.id == colloqium_id).first()


def delete_colloqium(*, colloqium_id: int, db: Session) -> None:
    item = db.query(Colloqium).filter(Colloqium.id == colloqium_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Colloqium not found")
    db.delete(item)
    db.commit()
