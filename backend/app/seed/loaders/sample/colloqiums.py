from sqlalchemy.orm import Session

from ....models import Colloqium, ColloqiumAgenda, ColloqiumParticipant, ColloqiumType, Person


def sync_colloqiums(db: Session) -> None:
    """Replace all COLLOQIUM rows with sample seed data."""
    from ...datasets.sample.colloqiums import RECORDS as colloqium_records

    db.query(ColloqiumAgenda).delete()
    db.query(ColloqiumParticipant).delete()
    db.query(Colloqium).delete()
    db.flush()

    created_types: dict[str, ColloqiumType] = {
        row.name: row
        for row in db.query(ColloqiumType).all()
    }

    people_by_user_id = {
        person.user_id: person
        for person in db.query(Person).all()
        if person.user_id
    }

    for entry in colloqium_records:
        raw = dict(entry)
        type_name = raw.pop("type_name")
        participant_user_ids = list(raw.pop("participant_user_ids", []))
        colloqium_type = created_types.get(type_name)
        if not colloqium_type:
            continue
        colloqium = Colloqium(colloqium_type_id=colloqium_type.id, **raw)
        db.add(colloqium)
        db.flush()
        for pos, user_id in enumerate(participant_user_ids, start=1):
            person = people_by_user_id.get(user_id)
            if person:
                db.add(
                    ColloqiumParticipant(
                        colloqium_id=colloqium.id,
                        person_id=person.id,
                        pos=pos,
                    )
                )

    db.commit()
