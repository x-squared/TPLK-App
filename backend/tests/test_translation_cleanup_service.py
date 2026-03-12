from __future__ import annotations

import json

from app.features.translations import normalize_legacy_dev_forum_capture_label_overrides
from app.models import TranslationBundle


def test_normalize_legacy_dev_forum_capture_label_overrides_updates_only_legacy_values(db_session):
    db_session.add_all(
        [
            TranslationBundle(
                locale="en",
                payload_json=json.dumps(
                    {
                        "devForum.capture.captureContext": "Capture current context",
                        "other.key": "Keep me",
                    }
                ),
            ),
            TranslationBundle(
                locale="de",
                payload_json=json.dumps({"devForum.capture.captureContext": "Aktuellen Kontext erfassen"}),
            ),
            TranslationBundle(
                locale="fr",
                payload_json=json.dumps({"devForum.capture.captureContext": "Capture context now"}),
            ),
            TranslationBundle(
                locale="it",
                payload_json="{not-json}",
            ),
        ]
    )
    db_session.commit()

    result = normalize_legacy_dev_forum_capture_label_overrides(db=db_session)

    assert result["scanned_bundles"] == 4, "All translation bundles should be scanned."
    assert result["updated_bundles"] == 2, "Only EN/DE legacy labels should be rewritten."
    assert result["skipped_invalid_payload"] == 1, "Invalid JSON payloads should be skipped safely."

    rows = db_session.query(TranslationBundle).all()
    payload_by_locale = {}
    for row in rows:
        if row.payload_json.startswith("{not-json}"):
            continue
        payload_by_locale[row.locale] = json.loads(row.payload_json)

    assert payload_by_locale["en"]["devForum.capture.captureContext"] == "Open ticket"
    assert payload_by_locale["de"]["devForum.capture.captureContext"] == "Ticket öffnen"
    assert payload_by_locale["fr"]["devForum.capture.captureContext"] == "Capture context now"
    assert payload_by_locale["en"]["other.key"] == "Keep me"
