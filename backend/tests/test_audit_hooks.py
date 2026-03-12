from __future__ import annotations

from sqlalchemy.orm import Session

from app.audit_context import clear_current_changed_by_id, set_current_changed_by_id
from app.models import Person


def test_audit_hook_sets_changed_by_on_insert(db_session: Session, user_factory) -> None:
    """Verify inserts are auto-stamped with the current audit-context user."""
    actor = user_factory(ext_id="AUDIT_ACTOR")
    set_current_changed_by_id(actor.id)

    created = Person(first_name="Inserted", surname="Person")
    db_session.add(created)
    db_session.commit()
    db_session.refresh(created)

    assert created.changed_by_id == actor.id, (
        "Person.changed_by_id should be set by the global audit hook during insert "
        "when current_changed_by_id is present in request context."
    )
    clear_current_changed_by_id()


def test_audit_hook_sets_on_update_but_keeps_explicit_value(db_session: Session, user_factory) -> None:
    """Verify update stamping occurs, but explicit changed_by_id updates remain respected."""
    actor_one = user_factory(ext_id="AUDIT_ACTOR_ONE")
    actor_two = user_factory(ext_id="AUDIT_ACTOR_TWO")

    target = Person(first_name="Initial", surname="Person")
    db_session.add(target)
    db_session.commit()

    set_current_changed_by_id(actor_one.id)
    target.surname = "Updated"
    db_session.commit()
    db_session.refresh(target)
    assert target.changed_by_id == actor_one.id, (
        "On normal updates, changed_by_id should be auto-updated to the current audit actor."
    )

    set_current_changed_by_id(actor_two.id)
    target.first_name = "UpdatedAgain"
    target.changed_by_id = None
    db_session.commit()
    db_session.refresh(target)

    assert target.changed_by_id is None, (
        "If changed_by_id was explicitly modified in the same update, "
        "the audit hook must not overwrite that explicit value."
    )
    clear_current_changed_by_id()
