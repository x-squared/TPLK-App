from __future__ import annotations

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from .audit_context import get_current_changed_by_id
from .database import SessionLocal

_hooks_registered = False


def _has_changed_by_column(instance: object) -> bool:
    return hasattr(instance, "changed_by_id")


def _has_created_by_column(instance: object) -> bool:
    return hasattr(instance, "created_by_id")


def register_audit_hooks() -> None:
    global _hooks_registered
    if _hooks_registered:
        return

    @event.listens_for(SessionLocal, "before_flush")
    def _apply_changed_by_id(session: Session, flush_context, instances) -> None:  # noqa: ANN001
        current_user_id = get_current_changed_by_id()
        if current_user_id is None:
            return

        for instance in session.new:
            if _has_created_by_column(instance) and getattr(instance, "created_by_id", None) is None:
                setattr(instance, "created_by_id", current_user_id)
            if not _has_changed_by_column(instance):
                continue
            if getattr(instance, "changed_by_id", None) is None:
                setattr(instance, "changed_by_id", current_user_id)

        for instance in session.dirty:
            if instance in session.deleted:
                continue
            if not _has_changed_by_column(instance):
                continue
            if not session.is_modified(instance, include_collections=False):
                continue
            state = inspect(instance)
            if "changed_by_id" in state.attrs and state.attrs.changed_by_id.history.has_changes():
                continue
            setattr(instance, "changed_by_id", current_user_id)

    _hooks_registered = True
