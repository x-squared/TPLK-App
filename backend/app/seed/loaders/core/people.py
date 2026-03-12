from sqlalchemy.orm import Session

from ....models import ColloqiumParticipant, ColloqiumTypeParticipant, Person, PersonTeam


def sync_people_core(db: Session) -> None:
    """Load production-safe person and team reference data."""
    from ...datasets.core.people import RECORDS as people_records
    from ...datasets.core.people import TEAM_RECORDS as team_records

    db.query(ColloqiumParticipant).delete()
    db.query(ColloqiumTypeParticipant).delete()
    people_by_user_id: dict[str, Person] = {
        person.user_id: person
        for person in db.query(Person).all()
        if person.user_id
    }
    for entry in people_records:
        raw = dict(entry)
        user_id = raw.get("user_id")
        item = people_by_user_id.get(user_id) if user_id else None
        if item is None:
            item = db.query(Person).filter(Person.first_name == raw["first_name"], Person.surname == raw["surname"]).first()
        if item is None:
            item = Person(**raw)
            db.add(item)
            db.flush()
        else:
            for key, value in raw.items():
                setattr(item, key, value)
        if item.user_id:
            people_by_user_id[item.user_id] = item

    for entry in team_records:
        raw = dict(entry)
        member_user_ids = list(raw.pop("member_user_ids", []))
        team = db.query(PersonTeam).filter(PersonTeam.name == raw["name"]).first()
        if team is None:
            team = PersonTeam(**raw)
            db.add(team)
            db.flush()
        else:
            for key, value in raw.items():
                setattr(team, key, value)
        unique_user_ids = list(dict.fromkeys(member_user_ids))
        team.members = [people_by_user_id[user_id] for user_id in unique_user_ids if user_id in people_by_user_id]

    db.commit()
