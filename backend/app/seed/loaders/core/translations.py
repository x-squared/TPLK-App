from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from ....models import TranslationBundle


def _is_record(value: object) -> bool:
    return isinstance(value, dict)


def _load_default_translation_bundles_from_frontend() -> dict[str, dict[str, str]]:
    root = Path(__file__).resolve().parents[5]
    source_file = root / "frontend" / "src" / "i18n" / "translations.json"
    if not source_file.exists():
        return {}
    payload = json.loads(source_file.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return {}

    by_locale: dict[str, dict[str, str]] = {}

    def walk(node: object, path: list[str]) -> None:
        if not isinstance(node, dict):
            return
        text_node = node.get("text")
        if isinstance(text_node, dict):
            key = ".".join(path)
            if key:
                for locale, value in text_node.items():
                    if not isinstance(locale, str) or not isinstance(value, str):
                        continue
                    locale_key = locale.strip().lower()
                    if not locale_key:
                        continue
                    by_locale.setdefault(locale_key, {})[key] = value
        for child_key, child_value in node.items():
            if child_key in {"text", "label"}:
                continue
            if isinstance(child_key, str):
                walk(child_value, [*path, child_key])

    walk(payload, [])
    return by_locale


def _load_runtime_snapshot_bundles() -> dict[str, dict[str, str]]:
    from ...datasets.core.translations_runtime_snapshot import RUNTIME_TRANSLATION_BUNDLES

    if not isinstance(RUNTIME_TRANSLATION_BUNDLES, list):
        return {}
    by_locale: dict[str, dict[str, str]] = {}
    for item in RUNTIME_TRANSLATION_BUNDLES:
        if not _is_record(item):
            continue
        locale = item.get("locale")
        entries = item.get("entries")
        if not isinstance(locale, str) or not isinstance(entries, dict):
            continue
        locale_key = locale.strip().lower()
        if not locale_key:
            continue
        normalized_entries: dict[str, str] = {}
        for key, value in entries.items():
            if isinstance(key, str) and isinstance(value, str) and key.strip() and value.strip():
                normalized_entries[key.strip()] = value
        by_locale[locale_key] = normalized_entries
    return by_locale


def sync_translation_bundles_core(db: Session) -> None:
    """Replace TRANSLATION_BUNDLE rows using frontend defaults + runtime snapshot overlay."""
    defaults = _load_default_translation_bundles_from_frontend()
    runtime_snapshot = _load_runtime_snapshot_bundles()

    merged_locales = set(defaults.keys()) | set(runtime_snapshot.keys())
    db.query(TranslationBundle).delete()
    for locale in sorted(merged_locales):
        merged_entries = dict(defaults.get(locale, {}))
        merged_entries.update(runtime_snapshot.get(locale, {}))
        db.add(
            TranslationBundle(
                locale=locale,
                payload_json=json.dumps(merged_entries, ensure_ascii=False, sort_keys=True),
                changed_by_id=None,
            )
        )
    db.commit()
