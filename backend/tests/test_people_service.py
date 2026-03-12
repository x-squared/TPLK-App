from __future__ import annotations

from sqlalchemy.orm import Session

from app.features.people.service import create_person, update_person
from app.models import Person, User
from app.schemas import PersonCreate, PersonUpdate


def test_update_person_syncs_linked_user_name(db_session: Session, user_factory) -> None:
    """Verify person name updates also synchronize the linked user display name."""
    actor = user_factory(ext_id="PEOPLE_ACTOR")

    linked_person = Person(first_name="Old", surname="Name")
    db_session.add(linked_person)
    db_session.flush()
    linked_user = User(ext_id="LINKED_USER", person_id=linked_person.id, name="Old Name")
    db_session.add(linked_user)
    db_session.commit()

    updated = update_person(
        person_id=linked_person.id,
        payload=PersonUpdate(first_name="New", surname="Surname"),
        changed_by_id=actor.id,
        db=db_session,
    )
    db_session.refresh(linked_user)

    assert updated.first_name == "New", "update_person should persist the new first name."
    assert updated.surname == "Surname", "update_person should persist the new surname."
    assert updated.changed_by_id == actor.id, (
        "update_person should set changed_by_id to the acting user for auditability."
    )
    assert linked_user.name == "New Surname", (
        "When a linked user exists, update_person should keep USER.NAME in sync "
        "with the person's full name."
    )


def test_create_person_trims_values_and_saves(db_session: Session, user_factory) -> None:
    """Verify create_person trims schema-normalized input and persists audit actor."""
    actor = user_factory(ext_id="PEOPLE_CREATE_ACTOR")

    created = create_person(
        payload=PersonCreate(first_name="  Alice  ", surname="  Example  ", user_id="  AEX01  "),
        changed_by_id=actor.id,
        db=db_session,
    )

    assert created.first_name == "Alice", "First name should be trimmed before persistence."
    assert created.surname == "Example", "Surname should be trimmed before persistence."
    assert created.user_id == "AEX01", "User ID should be trimmed before persistence."
    assert created.changed_by_id == actor.id, (
        "create_person should persist changed_by_id using the passed acting user."
    )
