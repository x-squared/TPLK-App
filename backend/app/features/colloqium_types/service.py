from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Code, ColloqiumType, ColloqiumTypeParticipant, Person
from ...schemas import ColloqiumTypeCreate, ColloqiumTypeUpdate


def _validate_organ_or_422(*, db: Session, organ_id: int) -> None:
    organ = db.query(Code).filter(Code.id == organ_id, Code.type == "ORGAN").first()
    if not organ:
        raise HTTPException(status_code=422, detail="organ_id must reference CODE with type ORGAN")


def _colloqium_type_query(db: Session):
    return db.query(ColloqiumType).options(
        joinedload(ColloqiumType.organ),
        joinedload(ColloqiumType.changed_by_user),
        joinedload(ColloqiumType.participant_links).joinedload(ColloqiumTypeParticipant.person),
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


def _set_type_participants(*, item: ColloqiumType, people: list[Person], db: Session) -> None:
    item.participant_links.clear()
    db.flush()
    for pos, person in enumerate(people, start=1):
        item.participant_links.append(
            ColloqiumTypeParticipant(
                person_id=person.id,
                pos=pos,
            )
        )
    item.participants = _format_participants(people)


def list_colloqium_types(*, db: Session) -> list[ColloqiumType]:
    return _colloqium_type_query(db).order_by(ColloqiumType.name.asc(), ColloqiumType.id.asc()).all()


def create_colloqium_type(*, payload: ColloqiumTypeCreate, changed_by_id: int, db: Session) -> ColloqiumType:
    _validate_organ_or_422(db=db, organ_id=payload.organ_id)
    payload_data = payload.model_dump()
    participant_ids = payload_data.pop("participant_ids", [])
    item = ColloqiumType(**payload_data, changed_by_id=changed_by_id)
    db.add(item)
    people = _resolve_people_or_422(db=db, participant_ids=participant_ids)
    _set_type_participants(item=item, people=people, db=db)
    db.commit()
    return _colloqium_type_query(db).filter(ColloqiumType.id == item.id).first()


def update_colloqium_type(
    *,
    colloqium_type_id: int,
    payload: ColloqiumTypeUpdate,
    changed_by_id: int,
    db: Session,
) -> ColloqiumType:
    item = db.query(ColloqiumType).filter(ColloqiumType.id == colloqium_type_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Colloqium type not found")
    data = payload.model_dump(exclude_unset=True)
    if "organ_id" in data:
        _validate_organ_or_422(db=db, organ_id=data["organ_id"])
    participant_ids = data.pop("participant_ids", None)
    for key, value in data.items():
        setattr(item, key, value)
    if participant_ids is not None:
        people = _resolve_people_or_422(db=db, participant_ids=participant_ids)
        _set_type_participants(item=item, people=people, db=db)
    item.changed_by_id = changed_by_id
    db.commit()
    return _colloqium_type_query(db).filter(ColloqiumType.id == colloqium_type_id).first()


def delete_colloqium_type(*, colloqium_type_id: int, db: Session) -> None:
    item = db.query(ColloqiumType).filter(ColloqiumType.id == colloqium_type_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Colloqium type not found")
    db.delete(item)
    db.commit()
