from __future__ import annotations

import datetime as dt


def can_manage_information(*, current_user_id: int, author_id: int, current_user_is_admin: bool) -> bool:
    """Return whether a user can edit/delete one information row."""
    return current_user_is_admin or current_user_id == author_id


def resolve_current_user_read_at(
    *,
    explicit_read_at: object | None,
    current_user_id: int,
    author_id: int,
    withdrawn: bool,
    now_utc: dt.datetime,
) -> object | None:
    """Authors implicitly read their own non-withdrawn information rows."""
    if explicit_read_at is not None:
        return explicit_read_at
    if current_user_id == author_id and not withdrawn:
        return now_utc
    return None
