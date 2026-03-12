from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.audit_context import clear_current_changed_by_id
from app.audit_hooks import register_audit_hooks
from app.database import Base, SessionLocal
from app.models import Person, User  # noqa: F401


@pytest.fixture(scope="session", autouse=True)
def _register_global_audit_hooks() -> None:
    register_audit_hooks()


@pytest.fixture(autouse=True)
def _clear_audit_context_between_tests() -> Generator[None, None, None]:
    clear_current_changed_by_id()
    try:
        yield
    finally:
        clear_current_changed_by_id()


@pytest.fixture()
def db_session(tmp_path) -> Generator[Session, None, None]:
    db_path = tmp_path / "unit-tests.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record) -> None:  # noqa: ANN001, ARG001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    old_bind = SessionLocal.kw.get("bind")
    SessionLocal.configure(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()
        SessionLocal.configure(bind=old_bind)
        engine.dispose()


@pytest.fixture()
def user_factory(db_session: Session):
    def _create_user(*, ext_id: str, first_name: str = "Test", surname: str = "User") -> User:
        person = Person(first_name=first_name, surname=surname)
        db_session.add(person)
        db_session.flush()
        user = User(ext_id=ext_id, person_id=person.id, name=f"{first_name} {surname}".strip())
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user
