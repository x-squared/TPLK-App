from __future__ import annotations

import json

from sqlalchemy.orm import Session

from ...models import TranslationBundle
from ...schemas import TranslationOverridesResponse, TranslationOverridesUpdate


def _normalize_locale(locale: str) -> str:
    normalized = (locale or "").strip().lower()
    return normalized or "en"


def _normalize_translation_key(key: str) -> str:
    if key == "app.views.donations":
        return "app.views.donors"
    if key == "donations":
        return "donors"
    if key.startswith("donations."):
        return f"donors.{key.removeprefix('donations.')}"
    return key


_DEV_FORUM_CAPTURE_CONTEXT_KEY = "devForum.capture.captureContext"
_LEGACY_CAPTURE_LABELS = {
    "capture current context",
    "aktuellen kontext erfassen",
}


def _normalized_capture_context_label(locale: str) -> str:
    return "Ticket öffnen" if _normalize_locale(locale) == "de" else "Open ticket"


def _normalize_legacy_dev_forum_capture_entries(entries: dict[str, str], *, locale: str) -> tuple[dict[str, str], bool]:
    normalized_entries = dict(entries)
    current = normalized_entries.get(_DEV_FORUM_CAPTURE_CONTEXT_KEY)
    if not isinstance(current, str):
        return normalized_entries, False
    if current.strip().lower() not in _LEGACY_CAPTURE_LABELS:
        return normalized_entries, False
    normalized_entries[_DEV_FORUM_CAPTURE_CONTEXT_KEY] = _normalized_capture_context_label(locale)
    return normalized_entries, True


def get_translation_overrides(*, locale: str, db: Session) -> TranslationOverridesResponse:
    target_locale = _normalize_locale(locale)
    entries: dict[str, str] = {}
    row = db.query(TranslationBundle).filter(TranslationBundle.locale == target_locale).first()
    if row and row.payload_json:
        try:
            payload = json.loads(row.payload_json)
            if isinstance(payload, dict):
                for key, value in payload.items():
                    normalized_key = (str(key) if isinstance(key, str) else "").strip()
                    normalized_text = (str(value) if isinstance(value, str) else "").strip()
                    if normalized_key and normalized_text:
                        entries[_normalize_translation_key(normalized_key)] = normalized_text
        except json.JSONDecodeError:
            entries = {}
    return TranslationOverridesResponse(locale=target_locale, entries=entries)


def replace_translation_overrides(
    *,
    locale: str,
    payload: TranslationOverridesUpdate,
    changed_by_id: int,
    db: Session,
) -> TranslationOverridesResponse:
    target_locale = _normalize_locale(locale)
    entries = payload.entries or {}
    normalized_entries: dict[str, str] = {}
    for key, text in entries.items():
        normalized_key = (str(key) if isinstance(key, str) else "").strip()
        normalized_text = (str(text) if isinstance(text, str) else "").strip()
        if not normalized_key or not normalized_text:
            continue
        normalized_entries[_normalize_translation_key(normalized_key)] = normalized_text
    row = db.query(TranslationBundle).filter(TranslationBundle.locale == target_locale).first()
    if row is None:
        row = TranslationBundle(
            locale=target_locale,
            payload_json=json.dumps(normalized_entries, ensure_ascii=False, sort_keys=True),
            changed_by_id=changed_by_id,
        )
        db.add(row)
    else:
        row.payload_json = json.dumps(normalized_entries, ensure_ascii=False, sort_keys=True)
        row.changed_by_id = changed_by_id
        db.add(row)
    db.commit()
    return get_translation_overrides(locale=target_locale, db=db)


def normalize_legacy_dev_forum_capture_label_overrides(*, db: Session) -> dict[str, int]:
    rows = db.query(TranslationBundle).all()
    scanned_bundles = 0
    updated_bundles = 0
    skipped_invalid_payload = 0
    for row in rows:
        scanned_bundles += 1
        payload: object = {}
        if row.payload_json:
            try:
                payload = json.loads(row.payload_json)
            except json.JSONDecodeError:
                skipped_invalid_payload += 1
                continue
        if not isinstance(payload, dict):
            skipped_invalid_payload += 1
            continue
        raw_entries: dict[str, str] = {}
        for key, value in payload.items():
            if isinstance(key, str) and isinstance(value, str) and key.strip():
                raw_entries[key.strip()] = value
        normalized_entries, changed = _normalize_legacy_dev_forum_capture_entries(raw_entries, locale=row.locale or "en")
        if not changed:
            continue
        row.payload_json = json.dumps(normalized_entries, ensure_ascii=False, sort_keys=True)
        db.add(row)
        updated_bundles += 1
    if updated_bundles > 0:
        db.commit()
    return {
        "scanned_bundles": scanned_bundles,
        "updated_bundles": updated_bundles,
        "skipped_invalid_payload": skipped_invalid_payload,
    }
