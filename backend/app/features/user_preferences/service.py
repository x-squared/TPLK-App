from __future__ import annotations

import json

from sqlalchemy.orm import Session

from ...models import User
from ...schemas import UserPreferencesResponse, UserPreferencesUpdate


def _default_preferences() -> dict[str, object]:
    return {
        "locale": "en",
        "start_page": "patients",
    }


def _normalize_preferences(raw: object) -> dict[str, object]:
    defaults = _default_preferences()
    if not isinstance(raw, dict):
        return defaults
    normalized = dict(defaults)
    locale = raw.get("locale")
    if locale in {"en", "de"}:
        normalized["locale"] = locale
    start_page = raw.get("start_page")
    if start_page == "donations":
        start_page = "donors"
    if start_page in {"my-work", "patients", "donors", "colloquiums", "coordinations", "reports", "admin", "e2e-tests", "dev-forum"}:
        normalized["start_page"] = start_page
    return normalized


def _load_user_preferences(user: User) -> dict[str, object]:
    raw = user.preferences_json
    if not raw:
        return _default_preferences()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return _default_preferences()
    return _normalize_preferences(parsed)


def get_user_preferences(*, user: User) -> UserPreferencesResponse:
    return UserPreferencesResponse.model_validate(_load_user_preferences(user))


def update_user_preferences(*, db: Session, user: User, payload: UserPreferencesUpdate) -> UserPreferencesResponse:
    current = _load_user_preferences(user)
    patch = payload.model_dump(exclude_unset=True)
    merged = dict(current)
    if "locale" in patch:
        merged["locale"] = patch["locale"]
    if "start_page" in patch:
        merged["start_page"] = patch["start_page"]
    normalized = _normalize_preferences(merged)
    user.preferences_json = json.dumps(normalized, ensure_ascii=False, sort_keys=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserPreferencesResponse.model_validate(normalized)
