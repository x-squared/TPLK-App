import json
from typing import Any

from sqlalchemy.orm import Session

from ....models import Code, Person, User


def _split_display_name(name: str | None, ext_id: str) -> tuple[str, str]:
    raw = (name or "").strip()
    if raw:
        parts = raw.split(" ", 1)
        return parts[0], (parts[1] if len(parts) > 1 else ext_id)
    return ext_id, "User"


def _resolve_person_for_user(*, db: Session, raw: dict[str, Any], existing: User | None) -> Person:
    first_name = raw.pop("first_name", None)
    surname = raw.pop("surname", None)
    person_user_id = raw.pop("person_user_id", None)
    display_name = raw.get("name")
    ext_id = raw.get("ext_id", "")
    if not first_name or not surname:
        fallback_first, fallback_surname = _split_display_name(display_name, ext_id)
        first_name = first_name or fallback_first
        surname = surname or fallback_surname
    person = existing.person if existing and existing.person_id else None
    if person is None and person_user_id:
        person = db.query(Person).filter(Person.user_id == person_user_id).first()
    if person is None:
        person = Person(first_name=first_name, surname=surname, user_id=person_user_id)
        db.add(person)
        db.flush()
    else:
        person.first_name = first_name
        person.surname = surname
        if person_user_id is not None:
            person.user_id = person_user_id
    return person


def _save_user_entry(db: Session, entry: dict[str, Any]) -> None:
    raw = dict(entry)
    preferences = raw.pop("preferences", None)
    role_keys = raw.pop("role_keys", None)
    role_key = raw.pop("role_key", "")
    if role_keys is None:
        role_keys = [role_key] if role_key else []
    roles = (
        db.query(Code)
        .filter(Code.type == "ROLE", Code.key.in_(role_keys))
        .all()
        if role_keys
        else []
    )
    primary_role = roles[0] if roles else None
    ext_id = raw.get("ext_id")
    if not ext_id:
        return
    existing = db.query(User).filter(User.ext_id == ext_id).first()
    person = _resolve_person_for_user(db=db, raw=raw, existing=existing)
    display_name = f"{person.first_name} {person.surname}".strip()
    raw["name"] = display_name
    if existing:
        existing.name = raw.get("name", existing.name)
        existing.person_id = person.id
        existing.role_id = primary_role.id if primary_role else None
        existing.roles = roles
        if preferences is not None:
            existing.preferences_json = json.dumps(preferences, ensure_ascii=False, sort_keys=True)
        return
    user_data = dict(raw)
    if preferences is not None:
        user_data["preferences_json"] = json.dumps(preferences, ensure_ascii=False, sort_keys=True)
    db.add(User(role_id=primary_role.id if primary_role else None, roles=roles, person_id=person.id, **user_data))


def sync_users_core(db: Session) -> None:
    """Load production-safe base users (e.g. SYSTEM)."""
    from ...datasets.core.users import RECORDS as user_records

    for entry in user_records:
        _save_user_entry(db, entry)
    db.commit()


def sync_users_sample(db: Session) -> None:
    """Load demo users for non-production environments."""
    from ...datasets.sample.users import RECORDS as user_records

    for entry in user_records:
        _save_user_entry(db, entry)
    db.commit()


def sync_users(db: Session) -> None:
    """Backward compatible full user seed load (core + sample)."""
    sync_users_core(db)
    sync_users_sample(db)
