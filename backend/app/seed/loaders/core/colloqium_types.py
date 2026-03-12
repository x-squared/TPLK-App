from sqlalchemy.orm import Session

from ....models import Code, Colloqium, ColloqiumAgenda, ColloqiumType, ColloqiumTypeParticipant, Person


def sync_colloqium_types_core(db: Session) -> None:
    """Load production-safe colloquium type definitions."""
    from ...datasets.core.colloqium_types import RECORDS as colloqium_type_records

    db.query(ColloqiumAgenda).delete()
    db.query(Colloqium).delete()
    db.query(ColloqiumTypeParticipant).delete()
    db.query(ColloqiumType).delete()
    db.flush()

    people_by_user_id = {
        person.user_id: person
        for person in db.query(Person).all()
        if person.user_id
    }

    for entry in colloqium_type_records:
        raw = dict(entry)
        organ = db.query(Code).filter(Code.type == "ORGAN", Code.key == raw.pop("organ_key")).first()
        if not organ:
            continue
        participant_user_ids = list(raw.pop("participant_user_ids", []))
        item = ColloqiumType(organ_id=organ.id, **raw)
        db.add(item)
        db.flush()
        for pos, user_id in enumerate(participant_user_ids, start=1):
            person = people_by_user_id.get(user_id)
            if person:
                db.add(
                    ColloqiumTypeParticipant(
                        colloqium_type_id=item.id,
                        person_id=person.id,
                        pos=pos,
                    )
                )
    db.commit()
