from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import MetaData, inspect, text


def _configure_env(*, app_env: str | None, database_url: str | None, seed_profile: str | None) -> None:
    if app_env:
        os.environ["TPL_ENV"] = app_env
    if database_url:
        os.environ["TPL_DATABASE_URL"] = database_url
    if seed_profile is not None:
        os.environ["TPL_SEED_PROFILE"] = seed_profile


def _clean_data() -> int:
    from .database import engine

    metadata = MetaData()
    metadata.reflect(bind=engine)
    table_count = len(metadata.sorted_tables)

    with engine.begin() as conn:
        is_sqlite = str(conn.dialect.name).lower() == "sqlite"
        if is_sqlite:
            conn.execute(text("PRAGMA foreign_keys = OFF"))
        for table in reversed(metadata.sorted_tables):
            conn.execute(table.delete())
        if is_sqlite:
            row = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
            ).first()
            if row:
                conn.execute(text("DELETE FROM sqlite_sequence"))
            conn.execute(text("PRAGMA foreign_keys = ON"))
    return table_count


def _write_translation_snapshot_file(*, bundles: list[dict[str, object]]) -> Path:
    target = Path(__file__).resolve().parent / "seed" / "datasets" / "core" / "translations_runtime_snapshot.py"
    lines = [
        '"""Runtime translation snapshot written from DB during clean/refresh."""',
        "",
        f"RUNTIME_TRANSLATION_BUNDLES = {json.dumps(bundles, ensure_ascii=False, sort_keys=True, indent=4)}",
        "",
    ]
    target.write_text("\n".join(lines), encoding="utf-8")
    return target


def _read_translation_bundles_from_db() -> list[dict[str, object]]:
    from .database import engine

    bundles: list[dict[str, object]] = []
    with engine.begin() as conn:
        inspector = inspect(conn)
        if inspector.has_table("TRANSLATION_BUNDLE"):
            rows = conn.execute(
                text('SELECT "LOCALE" AS locale, "PAYLOAD_JSON" AS payload_json FROM "TRANSLATION_BUNDLE" ORDER BY "LOCALE"')
            ).mappings().all()
            for row in rows:
                locale = (row.get("locale") or "").strip().lower()
                raw_payload = row.get("payload_json")
                if not locale:
                    continue
                entries: dict[str, str] = {}
                if isinstance(raw_payload, str) and raw_payload.strip():
                    try:
                        parsed = json.loads(raw_payload)
                        if isinstance(parsed, dict):
                            for key, value in parsed.items():
                                if isinstance(key, str) and isinstance(value, str) and key.strip() and value.strip():
                                    entries[key.strip()] = value
                    except json.JSONDecodeError:
                        entries = {}
                bundles.append({"locale": locale, "entries": entries})
        elif inspector.has_table("TRANSLATION_OVERRIDE"):
            rows = conn.execute(
                text(
                    'SELECT "LOCALE" AS locale, "KEY" AS key, "TEXT" AS text FROM "TRANSLATION_OVERRIDE" '
                    'ORDER BY "LOCALE", "KEY", "ID"'
                )
            ).mappings().all()
            by_locale: dict[str, dict[str, str]] = {}
            for row in rows:
                locale = (row.get("locale") or "").strip().lower()
                key = (row.get("key") or "").strip()
                value = (row.get("text") or "").strip()
                if not locale or not key or not value:
                    continue
                by_locale.setdefault(locale, {})[key] = value
            bundles = [{"locale": locale, "entries": entries} for locale, entries in sorted(by_locale.items())]
    return bundles


def _export_translation_snapshot_to_core_seed() -> tuple[Path, int]:
    bundles = _read_translation_bundles_from_db()
    target = _write_translation_snapshot_file(bundles=bundles)
    return target, len(bundles)


def _load_frontend_translation_config(
    target: Path,
) -> tuple[dict[str, dict[str, str]], dict[str, dict[str, str]]]:
    texts_by_locale: dict[str, dict[str, str]] = {}
    labels_by_key: dict[str, dict[str, str]] = {}
    if not target.exists():
        return texts_by_locale, labels_by_key
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return texts_by_locale, labels_by_key
    if not isinstance(payload, dict):
        return texts_by_locale, labels_by_key

    def walk(node: object, path: list[str]) -> None:
        if not isinstance(node, dict):
            return
        text_node = node.get("text")
        label_node = node.get("label")
        if isinstance(text_node, dict):
            key = ".".join(path)
            if key:
                for locale, value in text_node.items():
                    if not isinstance(locale, str) or not isinstance(value, str):
                        continue
                    locale_key = locale.strip().lower()
                    text_value = value.strip()
                    if not locale_key or not text_value:
                        continue
                    texts_by_locale.setdefault(locale_key, {})[key] = text_value
        if isinstance(label_node, dict):
            key = ".".join(path)
            if key:
                for locale, value in label_node.items():
                    if not isinstance(locale, str) or not isinstance(value, str):
                        continue
                    locale_key = locale.strip().lower()
                    label_value = value.strip()
                    if not locale_key or not label_value:
                        continue
                    labels_by_key.setdefault(key, {})[locale_key] = label_value
        for child_key, child_value in node.items():
            if child_key in {"text", "label"}:
                continue
            if isinstance(child_key, str):
                walk(child_value, [*path, child_key])

    walk(payload, [])
    return texts_by_locale, labels_by_key


def _build_frontend_translation_tree(
    *,
    keys: set[str],
    texts_by_locale: dict[str, dict[str, str]],
    labels_by_key: dict[str, dict[str, str]],
) -> dict[str, object]:
    root: dict[str, object] = {}
    for key in sorted(keys):
        parts = [part for part in key.split(".") if part]
        if not parts:
            continue
        cursor: dict[str, object] = root
        for part in parts[:-1]:
            existing = cursor.get(part)
            if not isinstance(existing, dict):
                existing = {}
                cursor[part] = existing
            cursor = existing
        leaf_key = parts[-1]
        leaf: dict[str, object] = {}
        labels = labels_by_key.get(key, {})
        if labels:
            leaf["label"] = {locale: labels[locale] for locale in sorted(labels)}
        text_for_key = {
            locale: by_key[key]
            for locale, by_key in texts_by_locale.items()
            if key in by_key and by_key[key].strip()
        }
        if text_for_key:
            leaf["text"] = {locale: text_for_key[locale] for locale in sorted(text_for_key)}
        if leaf:
            cursor[leaf_key] = leaf
    return root


def _export_translation_json_from_db() -> tuple[Path, int]:
    root = Path(__file__).resolve().parents[2]
    target = root / "frontend" / "src" / "i18n" / "translations.json"
    existing_texts_by_locale, labels_by_key = _load_frontend_translation_config(target)
    merged_texts_by_locale: dict[str, dict[str, str]] = {
        locale: dict(entries)
        for locale, entries in existing_texts_by_locale.items()
    }
    bundles = _read_translation_bundles_from_db()
    for item in bundles:
        locale = str(item.get("locale", "")).strip().lower()
        entries = item.get("entries")
        if not locale or not isinstance(entries, dict):
            continue
        target_entries = merged_texts_by_locale.setdefault(locale, {})
        for key, value in entries.items():
            if not isinstance(key, str) or not isinstance(value, str):
                continue
            normalized_key = key.strip()
            normalized_value = value.strip()
            if not normalized_key or not normalized_value:
                continue
            target_entries[normalized_key] = normalized_value
    all_keys = set(labels_by_key.keys())
    for by_key in merged_texts_by_locale.values():
        all_keys.update(by_key.keys())
    tree = _build_frontend_translation_tree(
        keys=all_keys,
        texts_by_locale=merged_texts_by_locale,
        labels_by_key=labels_by_key,
    )
    target.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target, len(all_keys)


def _clear_translation_bundles() -> int:
    from .database import engine

    deleted_rows = 0
    with engine.begin() as conn:
        inspector = inspect(conn)
        if inspector.has_table("TRANSLATION_BUNDLE"):
            deleted_rows += int(conn.execute(text('SELECT COUNT(*) FROM "TRANSLATION_BUNDLE"')).scalar_one())
            conn.execute(text('DELETE FROM "TRANSLATION_BUNDLE"'))
        if inspector.has_table("TRANSLATION_OVERRIDE"):
            deleted_rows += int(conn.execute(text('SELECT COUNT(*) FROM "TRANSLATION_OVERRIDE"')).scalar_one())
            conn.execute(text('DELETE FROM "TRANSLATION_OVERRIDE"'))
    return deleted_rows


def _normalize_legacy_dev_forum_capture_label_overrides() -> dict[str, int]:
    from .database import SessionLocal
    from .features.translations import normalize_legacy_dev_forum_capture_label_overrides

    db = SessionLocal()
    try:
        return normalize_legacy_dev_forum_capture_label_overrides(db=db)
    finally:
        db.close()


def _default_dev_forum_export_base_dir() -> Path:
    from .config import get_config

    database_url = (get_config().database_url or "").strip()
    if database_url.startswith("sqlite:///"):
        db_path = Path(database_url.removeprefix("sqlite:///")).expanduser()
        if not db_path.is_absolute():
            db_path = (Path.cwd() / db_path).resolve()
        return db_path.parent / "dev_forum_exports"
    return Path(__file__).resolve().parents[2] / "database" / "dev_forum_exports"


def _normalize_export_dir(target: str | None) -> Path:
    if target and target.strip():
        return Path(target).expanduser().resolve()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return (_default_dev_forum_export_base_dir() / f"export-{timestamp}").resolve()


def _json_safe(value: object) -> object:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()  # type: ignore[no-any-return]
        except Exception:  # noqa: BLE001
            return str(value)
    return str(value)


def _export_dev_forum_snapshot(*, export_dir: Path) -> dict[str, object]:
    from .config import get_config
    from .database import engine

    export_dir.mkdir(parents=True, exist_ok=True)
    requests_path = export_dir / "dev_forum_requests.json"
    readme_path = export_dir / "README.md"
    exported_at = datetime.now(timezone.utc).isoformat()

    rows_payload: list[dict[str, object]] = []
    with engine.begin() as conn:
        inspector = inspect(conn)
        if not inspector.has_table("DEV_REQUEST"):
            payload = {
                "exported_at": exported_at,
                "database_url": get_config().database_url,
                "count": 0,
                "requests": [],
                "note": "DEV_REQUEST table not found. Nothing exported.",
            }
            requests_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            readme_path.write_text(
                "\n".join(
                    [
                        "# Dev-Forum Export",
                        "",
                        f"- Exported at (UTC): `{exported_at}`",
                        "- Result: `DEV_REQUEST` table not found, no rows exported.",
                        "",
                    ]
                ),
                encoding="utf-8",
            )
            return {"export_dir": str(export_dir), "count": 0, "table_found": False}

        rows = conn.execute(
            text(
                'SELECT d.*, '
                'submitter."EXT_ID" AS "SUBMITTER_USER_EXT_ID", '
                'claimer."EXT_ID" AS "CLAIMED_BY_USER_EXT_ID", '
                'decider."EXT_ID" AS "DECIDED_BY_USER_EXT_ID" '
                'FROM "DEV_REQUEST" d '
                'LEFT JOIN "USER" submitter ON submitter."ID" = d."SUBMITTER_USER_ID" '
                'LEFT JOIN "USER" claimer ON claimer."ID" = d."CLAIMED_BY_USER_ID" '
                'LEFT JOIN "USER" decider ON decider."ID" = d."DECIDED_BY_USER_ID" '
                'ORDER BY d."ID"'
            )
        ).mappings().all()
        for row in rows:
            item = {str(key): _json_safe(value) for key, value in row.items()}
            rows_payload.append(item)

    payload = {
        "exported_at": exported_at,
        "database_url": get_config().database_url,
        "count": len(rows_payload),
        "requests": rows_payload,
    }
    requests_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    readme_path.write_text(
        "\n".join(
            [
                "# Dev-Forum Export",
                "",
                f"- Exported at (UTC): `{exported_at}`",
                f"- Requests exported: `{len(rows_payload)}`",
                "",
                "## Files",
                "",
                "- `dev_forum_requests.json`: full export payload for restore.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return {"export_dir": str(export_dir), "count": len(rows_payload), "table_found": True}


def _import_dev_forum_snapshot(*, export_dir: Path) -> dict[str, object]:
    from .database import engine

    requests_path = export_dir / "dev_forum_requests.json"
    if not requests_path.exists():
        return {"ok": False, "hint": f"Missing export file: {requests_path}"}

    raw = json.loads(requests_path.read_text(encoding="utf-8"))
    source_rows = raw.get("requests", []) if isinstance(raw, dict) else []
    if not isinstance(source_rows, list):
        return {"ok": False, "hint": "Invalid export format: requests must be an array."}

    with engine.begin() as conn:
        inspector = inspect(conn)
        if not inspector.has_table("DEV_REQUEST"):
            return {"ok": False, "hint": 'Target schema has no "DEV_REQUEST" table.'}
        dev_columns = {col["name"] for col in inspector.get_columns("DEV_REQUEST")}
        required = {
            "ID",
            "SUBMITTER_USER_ID",
            "STATUS",
            "CAPTURE_URL",
            "CAPTURE_GUI_PART",
            "CAPTURE_STATE_JSON",
            "REQUEST_TEXT",
        }
        missing_required = sorted(required - dev_columns)
        if missing_required:
            return {
                "ok": False,
                "hint": "Target DEV_REQUEST schema missing required columns: " + ", ".join(missing_required),
            }

        user_id_by_ext: dict[str, int] = {}
        if inspector.has_table("USER"):
            user_columns = {col["name"] for col in inspector.get_columns("USER")}
            if "ID" in user_columns and "EXT_ID" in user_columns:
                user_rows = conn.execute(text('SELECT "ID", "EXT_ID" FROM "USER"')).mappings().all()
                for user in user_rows:
                    ext_id = str(user.get("EXT_ID") or "").strip()
                    if ext_id:
                        user_id_by_ext[ext_id] = int(user["ID"])
        existing_user_ids = set()
        if inspector.has_table("USER") and "ID" in {col["name"] for col in inspector.get_columns("USER")}:
            existing_user_ids = {
                int(row["ID"]) for row in conn.execute(text('SELECT "ID" FROM "USER"')).mappings().all()
            }

        def resolve_user_id(value: object, ext_value: object, *, required_user: bool) -> int | None:
            resolved: int | None = None
            if value is not None and str(value).strip():
                try:
                    candidate = int(value)  # type: ignore[arg-type]
                    if candidate in existing_user_ids:
                        resolved = candidate
                except (TypeError, ValueError):
                    resolved = None
            if resolved is None and isinstance(ext_value, str):
                ext_key = ext_value.strip()
                if ext_key:
                    resolved = user_id_by_ext.get(ext_key)
            if resolved is None and required_user:
                return None
            return resolved

        conn.execute(text('DELETE FROM "DEV_REQUEST"'))
        inserted = 0
        for source in source_rows:
            if not isinstance(source, dict):
                continue
            submitter_id = resolve_user_id(
                source.get("SUBMITTER_USER_ID"),
                source.get("SUBMITTER_USER_EXT_ID"),
                required_user=True,
            )
            if submitter_id is None:
                return {
                    "ok": False,
                    "hint": (
                        f'Could not resolve submitter user for request ID {source.get("ID")} '
                        "(missing user ID and no matching EXT_ID)."
                    ),
                }
            claimed_id = resolve_user_id(
                source.get("CLAIMED_BY_USER_ID"),
                source.get("CLAIMED_BY_USER_EXT_ID"),
                required_user=False,
            )
            decided_id = resolve_user_id(
                source.get("DECIDED_BY_USER_ID"),
                source.get("DECIDED_BY_USER_EXT_ID"),
                required_user=False,
            )

            payload: dict[str, object] = {}
            for column in dev_columns:
                if column == "SUBMITTER_USER_ID":
                    payload[column] = submitter_id
                    continue
                if column == "CLAIMED_BY_USER_ID":
                    payload[column] = claimed_id
                    continue
                if column == "DECIDED_BY_USER_ID":
                    payload[column] = decided_id
                    continue
                if column in source:
                    payload[column] = source.get(column)
            if "ID" not in payload:
                continue
            column_list = ", ".join(f'"{name}"' for name in payload.keys())
            value_list = ", ".join(f":{name}" for name in payload.keys())
            conn.execute(text(f'INSERT INTO "DEV_REQUEST" ({column_list}) VALUES ({value_list})'), payload)
            inserted += 1

    return {"ok": True, "imported_count": inserted, "export_dir": str(export_dir)}


def _seed(*, app_env: str | None, seed_profile: str | None) -> dict[str, object]:
    from .database import SessionLocal
    from .seed import run_seed_profile

    db = SessionLocal()
    try:
        return run_seed_profile(db, app_env=app_env, seed_profile=seed_profile)
    finally:
        db.close()


def _migrate_procurement_runtime() -> dict[str, int]:
    from .database import engine

    migrated_values = 0
    migrated_person_links = 0
    migrated_team_links = 0

    with engine.begin() as conn:
        runtime_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_DATA'")
        ).scalar_one_or_none()
        runtime_person_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_DATA_PERSON'")
        ).scalar_one_or_none()
        runtime_team_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_DATA_TEAM'")
        ).scalar_one_or_none()
        old_value_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_VALUE'")
        ).scalar_one_or_none()
        if (
            not runtime_table_exists
            or not runtime_person_table_exists
            or not runtime_team_table_exists
            or not old_value_table_exists
        ):
            return {
                "migrated_values": migrated_values,
                "migrated_person_links": migrated_person_links,
                "migrated_team_links": migrated_team_links,
            }

        old_value_person_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_VALUE_PERSON'")
        ).scalar_one_or_none()
        old_value_team_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_VALUE_TEAM'")
        ).scalar_one_or_none()
        old_value_episode_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='COORDINATION_PROCUREMENT_VALUE_EPISODE'")
        ).scalar_one_or_none()

        value_rows = conn.execute(
            text(
                'SELECT v."ID" AS value_id, '
                'v."FIELD_TEMPLATE_ID" AS field_template_id, '
                'v."VALUE" AS value_text, '
                'v."CHANGED_BY" AS changed_by_id, '
                'v."CREATED_AT" AS created_at, '
                'v."UPDATED_AT" AS updated_at, '
                's."SLOT_KEY" AS slot_key, '
                'o."COORDINATION_ID" AS coordination_id, '
                'o."ORGAN_ID" AS organ_id '
                'FROM "COORDINATION_PROCUREMENT_VALUE" v '
                'JOIN "COORDINATION_PROCUREMENT_SLOT" s ON s."ID" = v."SLOT_ID" '
                'JOIN "COORDINATION_PROCUREMENT_ORGAN" o ON o."ID" = s."COORDINATION_PROCUREMENT_ORGAN_ID"'
            )
        ).mappings().all()
        if not value_rows:
            return {
                "migrated_values": migrated_values,
                "migrated_person_links": migrated_person_links,
                "migrated_team_links": migrated_team_links,
            }

        person_rows = []
        if old_value_person_table_exists:
            person_rows = conn.execute(
                text(
                    'SELECT "VALUE_ID" AS value_id, "PERSON_ID" AS person_id '
                    'FROM "COORDINATION_PROCUREMENT_VALUE_PERSON" '
                    'ORDER BY "VALUE_ID", "POS", "ID"'
                )
            ).mappings().all()
        team_rows = []
        if old_value_team_table_exists:
            team_rows = conn.execute(
                text(
                    'SELECT "VALUE_ID" AS value_id, "TEAM_ID" AS team_id '
                    'FROM "COORDINATION_PROCUREMENT_VALUE_TEAM" '
                    'ORDER BY "VALUE_ID", "POS", "ID"'
                )
            ).mappings().all()
        episode_rows = []
        if old_value_episode_table_exists:
            episode_rows = conn.execute(
                text(
                    'SELECT "VALUE_ID" AS value_id, "EPISODE_ID" AS episode_id '
                    'FROM "COORDINATION_PROCUREMENT_VALUE_EPISODE"'
                )
            ).mappings().all()

        person_ids_by_value: dict[int, list[int]] = {}
        for row in person_rows:
            person_ids_by_value.setdefault(int(row["value_id"]), []).append(int(row["person_id"]))
        team_ids_by_value: dict[int, list[int]] = {}
        for row in team_rows:
            team_ids_by_value.setdefault(int(row["value_id"]), []).append(int(row["team_id"]))
        episode_id_by_value: dict[int, int] = {}
        for row in episode_rows:
            episode_id_by_value[int(row["value_id"])] = int(row["episode_id"])

        for row in value_rows:
            value_id = int(row["value_id"])
            payload = {
                "coordination_id": row["coordination_id"],
                "organ_id": row["organ_id"],
                "slot_key": row["slot_key"] or "MAIN",
                "field_template_id": row["field_template_id"],
                "value_text": row["value_text"] or "",
                "episode_id": episode_id_by_value.get(value_id),
                "changed_by_id": row["changed_by_id"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            before_count = conn.execute(
                text(
                    'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_DATA" '
                    'WHERE "COORDINATION_ID" = :coordination_id '
                    'AND "ORGAN_ID" = :organ_id '
                    'AND "SLOT_KEY" = :slot_key '
                    'AND "FIELD_TEMPLATE_ID" = :field_template_id'
                ),
                payload,
            ).scalar_one()
            conn.execute(
                text(
                    'INSERT OR IGNORE INTO "COORDINATION_PROCUREMENT_DATA" ('
                    '"COORDINATION_ID","ORGAN_ID","SLOT_KEY","FIELD_TEMPLATE_ID","VALUE",'
                    '"EPISODE_ID","CHANGED_BY","CREATED_AT","UPDATED_AT","ROW_VERSION"'
                    ') VALUES ('
                    ':coordination_id,:organ_id,:slot_key,:field_template_id,:value_text,'
                    ':episode_id,:changed_by_id,:created_at,:updated_at,1'
                    ')'
                ),
                payload,
            )
            after_count = conn.execute(
                text(
                    'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_DATA" '
                    'WHERE "COORDINATION_ID" = :coordination_id '
                    'AND "ORGAN_ID" = :organ_id '
                    'AND "SLOT_KEY" = :slot_key '
                    'AND "FIELD_TEMPLATE_ID" = :field_template_id'
                ),
                payload,
            ).scalar_one()
            if int(after_count) > int(before_count):
                migrated_values += 1
            data_id = conn.execute(
                text(
                    'SELECT "ID" FROM "COORDINATION_PROCUREMENT_DATA" '
                    'WHERE "COORDINATION_ID" = :coordination_id '
                    'AND "ORGAN_ID" = :organ_id '
                    'AND "SLOT_KEY" = :slot_key '
                    'AND "FIELD_TEMPLATE_ID" = :field_template_id'
                ),
                payload,
            ).scalar_one_or_none()
            if data_id is None:
                continue
            for pos, person_id in enumerate(person_ids_by_value.get(value_id, [])):
                before_count = conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_DATA_PERSON" '
                        'WHERE "DATA_ID" = :data_id AND "PERSON_ID" = :person_id'
                    ),
                    {"data_id": data_id, "person_id": person_id},
                ).scalar_one()
                conn.execute(
                    text(
                        'INSERT OR IGNORE INTO "COORDINATION_PROCUREMENT_DATA_PERSON" ('
                        '"DATA_ID","PERSON_ID","POS","CHANGED_BY","CREATED_AT","UPDATED_AT","ROW_VERSION"'
                        ') VALUES ('
                        ':data_id,:person_id,:pos,:changed_by_id,:created_at,:updated_at,1'
                        ')'
                    ),
                    {
                        "data_id": data_id,
                        "person_id": person_id,
                        "pos": pos,
                        "changed_by_id": row["changed_by_id"],
                        "created_at": row["created_at"],
                        "updated_at": row["updated_at"],
                    },
                )
                after_count = conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_DATA_PERSON" '
                        'WHERE "DATA_ID" = :data_id AND "PERSON_ID" = :person_id'
                    ),
                    {"data_id": data_id, "person_id": person_id},
                ).scalar_one()
                if int(after_count) > int(before_count):
                    migrated_person_links += 1
            for pos, team_id in enumerate(team_ids_by_value.get(value_id, [])):
                before_count = conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_DATA_TEAM" '
                        'WHERE "DATA_ID" = :data_id AND "TEAM_ID" = :team_id'
                    ),
                    {"data_id": data_id, "team_id": team_id},
                ).scalar_one()
                conn.execute(
                    text(
                        'INSERT OR IGNORE INTO "COORDINATION_PROCUREMENT_DATA_TEAM" ('
                        '"DATA_ID","TEAM_ID","POS","CHANGED_BY","CREATED_AT","UPDATED_AT","ROW_VERSION"'
                        ') VALUES ('
                        ':data_id,:team_id,:pos,:changed_by_id,:created_at,:updated_at,1'
                        ')'
                    ),
                    {
                        "data_id": data_id,
                        "team_id": team_id,
                        "pos": pos,
                        "changed_by_id": row["changed_by_id"],
                        "created_at": row["created_at"],
                        "updated_at": row["updated_at"],
                    },
                )
                after_count = conn.execute(
                    text(
                        'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_DATA_TEAM" '
                        'WHERE "DATA_ID" = :data_id AND "TEAM_ID" = :team_id'
                    ),
                    {"data_id": data_id, "team_id": team_id},
                ).scalar_one()
                if int(after_count) > int(before_count):
                    migrated_team_links += 1

    return {
        "migrated_values": migrated_values,
        "migrated_person_links": migrated_person_links,
        "migrated_team_links": migrated_team_links,
    }


def _migrate_procurement_to_typed() -> dict[str, int]:
    from .database import engine

    migrated_rows = 0
    migrated_scalar_updates = 0
    migrated_person_links = 0
    migrated_team_links = 0

    with engine.begin() as conn:
        required_tables = (
            "COORDINATION_PROCUREMENT_DATA",
            "COORDINATION_PROCUREMENT_FIELD_TEMPLATE",
            "COORDINATION_PROCUREMENT_TYPED_DATA",
            "COORDINATION_PROCUREMENT_TYPED_DATA_PERSON_LIST",
            "COORDINATION_PROCUREMENT_TYPED_DATA_TEAM_LIST",
        )
        for table_name in required_tables:
            exists = conn.execute(
                text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
            ).scalar_one_or_none()
            if not exists:
                return {
                    "migrated_rows": migrated_rows,
                    "migrated_scalar_updates": migrated_scalar_updates,
                    "migrated_person_links": migrated_person_links,
                    "migrated_team_links": migrated_team_links,
                }

        value_rows = conn.execute(
            text(
                'SELECT d."ID" AS data_id, d."COORDINATION_ID" AS coordination_id, d."ORGAN_ID" AS organ_id, '
                'd."SLOT_KEY" AS slot_key, d."VALUE" AS value_text, d."EPISODE_ID" AS episode_id, '
                'd."CHANGED_BY" AS changed_by_id, d."CREATED_AT" AS created_at, d."UPDATED_AT" AS updated_at, '
                'f."KEY" AS field_key '
                'FROM "COORDINATION_PROCUREMENT_DATA" d '
                'JOIN "COORDINATION_PROCUREMENT_FIELD_TEMPLATE" f ON f."ID" = d."FIELD_TEMPLATE_ID"'
            )
        ).mappings().all()
        if not value_rows:
            return {
                "migrated_rows": migrated_rows,
                "migrated_scalar_updates": migrated_scalar_updates,
                "migrated_person_links": migrated_person_links,
                "migrated_team_links": migrated_team_links,
            }

        scalar_sql_by_field_key = {
            "INCISION_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "INCISION_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "CARDIAC_ARREST_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "CARDIAC_ARREST_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "COLD_PERFUSION": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "COLD_PERFUSION" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "COLD_PERFUSION_ABDOMINAL": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "COLD_PERFUSION_ABDOMINAL" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "EHB_BOX_NR": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "EHB_BOX_NR" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "EHB_NR": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "EHB_NR" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "INCISION_DONOR_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "INCISION_DONOR_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "CROSS_CLAMP_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "CROSS_CLAMP_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "PROCUREMENT_TEAM_DEPARTURE_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "PROCUREMENT_TEAM_DEPARTURE_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "DEPARTURE_DONOR_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "DEPARTURE_DONOR_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "ARRIVAL_TIME": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "ARRIVAL_TIME" = :value_text, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "NMP_USED": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "NMP_USED" = CASE WHEN trim(lower(:value_text)) IN (\'1\',\'true\',\'yes\',\'y\',\'on\') THEN 1 WHEN trim(:value_text) = \'\' THEN NULL ELSE 0 END, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "EVLP_USED": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "EVLP_USED" = CASE WHEN trim(lower(:value_text)) IN (\'1\',\'true\',\'yes\',\'y\',\'on\') THEN 1 WHEN trim(:value_text) = \'\' THEN NULL ELSE 0 END, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "HOPE_USED": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "HOPE_USED" = CASE WHEN trim(lower(:value_text)) IN (\'1\',\'true\',\'yes\',\'y\',\'on\') THEN 1 WHEN trim(:value_text) = \'\' THEN NULL ELSE 0 END, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "LIFEPORT_USED": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "LIFEPORT_USED" = CASE WHEN trim(lower(:value_text)) IN (\'1\',\'true\',\'yes\',\'y\',\'on\') THEN 1 WHEN trim(:value_text) = \'\' THEN NULL ELSE 0 END, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
            "RECIPIENT": 'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" SET "RECIPIENT_EPISODE_ID" = :episode_id, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id',
        }

        for row in value_rows:
            payload = {
                "coordination_id": row["coordination_id"],
                "organ_id": row["organ_id"],
                "slot_key": row["slot_key"] or "MAIN",
                "changed_by_id": row["changed_by_id"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            before_count = conn.execute(
                text(
                    'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_TYPED_DATA" '
                    'WHERE "COORDINATION_ID" = :coordination_id AND "ORGAN_ID" = :organ_id AND "SLOT_KEY" = :slot_key'
                ),
                payload,
            ).scalar_one()
            conn.execute(
                text(
                    'INSERT OR IGNORE INTO "COORDINATION_PROCUREMENT_TYPED_DATA" ('
                    '"COORDINATION_ID","ORGAN_ID","SLOT_KEY","CHANGED_BY","CREATED_AT","UPDATED_AT","ROW_VERSION"'
                    ') VALUES (:coordination_id,:organ_id,:slot_key,:changed_by_id,:created_at,:updated_at,1)'
                ),
                payload,
            )
            after_count = conn.execute(
                text(
                    'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_TYPED_DATA" '
                    'WHERE "COORDINATION_ID" = :coordination_id AND "ORGAN_ID" = :organ_id AND "SLOT_KEY" = :slot_key'
                ),
                payload,
            ).scalar_one()
            if int(after_count) > int(before_count):
                migrated_rows += 1
            typed_id = conn.execute(
                text(
                    'SELECT "ID" FROM "COORDINATION_PROCUREMENT_TYPED_DATA" '
                    'WHERE "COORDINATION_ID" = :coordination_id AND "ORGAN_ID" = :organ_id AND "SLOT_KEY" = :slot_key'
                ),
                payload,
            ).scalar_one()

            field_key = row["field_key"]
            if field_key in scalar_sql_by_field_key:
                conn.execute(
                    text(scalar_sql_by_field_key[field_key]),
                    {
                        "typed_id": typed_id,
                        "value_text": row["value_text"] or "",
                        "episode_id": row["episode_id"],
                        "changed_by_id": row["changed_by_id"],
                    },
                )
                migrated_scalar_updates += 1

            if field_key in {"ARZT_RESPONSIBLE", "CHIRURG_RESPONSIBLE", "ON_SITE_COORDINATORS", "PROCUREMENT_TEAM_INT"}:
                person_rows = conn.execute(
                    text(
                        'SELECT "PERSON_ID" AS person_id, "POS" AS pos, "ID" AS id FROM "COORDINATION_PROCUREMENT_DATA_PERSON" '
                        'WHERE "DATA_ID" = :data_id ORDER BY "POS", "ID"'
                    ),
                    {"data_id": row["data_id"]},
                ).mappings().all()
                if field_key == "ARZT_RESPONSIBLE" and person_rows:
                    conn.execute(
                        text(
                            'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" '
                            'SET "ARZT_RESPONSIBLE_PERSON_ID" = :person_id, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id'
                        ),
                        {"typed_id": typed_id, "person_id": person_rows[0]["person_id"], "changed_by_id": row["changed_by_id"]},
                    )
                    migrated_scalar_updates += 1
                elif field_key == "CHIRURG_RESPONSIBLE" and person_rows:
                    conn.execute(
                        text(
                            'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" '
                            'SET "CHIRURG_RESPONSIBLE_PERSON_ID" = :person_id, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id'
                        ),
                        {"typed_id": typed_id, "person_id": person_rows[0]["person_id"], "changed_by_id": row["changed_by_id"]},
                    )
                    migrated_scalar_updates += 1
                elif field_key in {"ON_SITE_COORDINATORS", "PROCUREMENT_TEAM_INT"}:
                    list_key = field_key
                    for person_row in person_rows:
                        before_count = conn.execute(
                            text(
                                'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_TYPED_DATA_PERSON_LIST" '
                                'WHERE "DATA_ID" = :data_id AND "LIST_KEY" = :list_key AND "PERSON_ID" = :person_id'
                            ),
                            {"data_id": typed_id, "list_key": list_key, "person_id": person_row["person_id"]},
                        ).scalar_one()
                        conn.execute(
                            text(
                                'INSERT OR IGNORE INTO "COORDINATION_PROCUREMENT_TYPED_DATA_PERSON_LIST" ('
                                '"DATA_ID","LIST_KEY","PERSON_ID","POS","CHANGED_BY","CREATED_AT","UPDATED_AT","ROW_VERSION"'
                                ') VALUES (:data_id,:list_key,:person_id,:pos,:changed_by_id,:created_at,:updated_at,1)'
                            ),
                            {
                                "data_id": typed_id,
                                "list_key": list_key,
                                "person_id": person_row["person_id"],
                                "pos": person_row["pos"] or 0,
                                "changed_by_id": row["changed_by_id"],
                                "created_at": row["created_at"],
                                "updated_at": row["updated_at"],
                            },
                        )
                        after_count = conn.execute(
                            text(
                                'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_TYPED_DATA_PERSON_LIST" '
                                'WHERE "DATA_ID" = :data_id AND "LIST_KEY" = :list_key AND "PERSON_ID" = :person_id'
                            ),
                            {"data_id": typed_id, "list_key": list_key, "person_id": person_row["person_id"]},
                        ).scalar_one()
                        if int(after_count) > int(before_count):
                            migrated_person_links += 1

            if field_key in {"PROCURMENT_TEAM", "IMPLANT_TEAM"}:
                team_rows = conn.execute(
                    text(
                        'SELECT "TEAM_ID" AS team_id, "POS" AS pos, "ID" AS id FROM "COORDINATION_PROCUREMENT_DATA_TEAM" '
                        'WHERE "DATA_ID" = :data_id ORDER BY "POS", "ID"'
                    ),
                    {"data_id": row["data_id"]},
                ).mappings().all()
                if field_key == "PROCURMENT_TEAM" and team_rows:
                    conn.execute(
                        text(
                            'UPDATE "COORDINATION_PROCUREMENT_TYPED_DATA" '
                            'SET "PROCURMENT_TEAM_TEAM_ID" = :team_id, "CHANGED_BY" = :changed_by_id WHERE "ID" = :typed_id'
                        ),
                        {"typed_id": typed_id, "team_id": team_rows[0]["team_id"], "changed_by_id": row["changed_by_id"]},
                    )
                    migrated_scalar_updates += 1
                elif field_key == "IMPLANT_TEAM":
                    list_key = "IMPLANT_TEAM"
                    for team_row in team_rows:
                        before_count = conn.execute(
                            text(
                                'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_TYPED_DATA_TEAM_LIST" '
                                'WHERE "DATA_ID" = :data_id AND "LIST_KEY" = :list_key AND "TEAM_ID" = :team_id'
                            ),
                            {"data_id": typed_id, "list_key": list_key, "team_id": team_row["team_id"]},
                        ).scalar_one()
                        conn.execute(
                            text(
                                'INSERT OR IGNORE INTO "COORDINATION_PROCUREMENT_TYPED_DATA_TEAM_LIST" ('
                                '"DATA_ID","LIST_KEY","TEAM_ID","POS","CHANGED_BY","CREATED_AT","UPDATED_AT","ROW_VERSION"'
                                ') VALUES (:data_id,:list_key,:team_id,:pos,:changed_by_id,:created_at,:updated_at,1)'
                            ),
                            {
                                "data_id": typed_id,
                                "list_key": list_key,
                                "team_id": team_row["team_id"],
                                "pos": team_row["pos"] or 0,
                                "changed_by_id": row["changed_by_id"],
                                "created_at": row["created_at"],
                                "updated_at": row["updated_at"],
                            },
                        )
                        after_count = conn.execute(
                            text(
                                'SELECT COUNT(*) FROM "COORDINATION_PROCUREMENT_TYPED_DATA_TEAM_LIST" '
                                'WHERE "DATA_ID" = :data_id AND "LIST_KEY" = :list_key AND "TEAM_ID" = :team_id'
                            ),
                            {"data_id": typed_id, "list_key": list_key, "team_id": team_row["team_id"]},
                        ).scalar_one()
                        if int(after_count) > int(before_count):
                            migrated_team_links += 1

    return {
        "migrated_rows": migrated_rows,
        "migrated_scalar_updates": migrated_scalar_updates,
        "migrated_person_links": migrated_person_links,
        "migrated_team_links": migrated_team_links,
    }


def _verify_schema_after_migration(*, check_level: str = "strict") -> int:
    from .db_schema import _load_runtime, _print_drift, verify_schema_drift

    runtime = _load_runtime()
    drift = verify_schema_drift(runtime, strict=check_level == "strict")
    if drift.has_drift:
        print(
            "Post-migration schema verification failed: database still differs from current model metadata "
            f"(check-level={check_level})."
        )
        _print_drift(drift)
        return 2
    print(f"Post-migration schema verification OK (check-level={check_level}).")
    return 0


def _verify_audit_field_integrity() -> int:
    from .database import engine
    from .features.audit_fields import verify_created_by_consistency

    result = verify_created_by_consistency(engine=engine)
    if result.issue_count > 0:
        print(
            "Audit-field integrity verification failed: "
            + f"tables_with_changed_by={result.tables_with_changed_by} "
            + f"tables_missing_created_by={result.tables_missing_created_by} "
            + f"rows_missing_created_by_backfill={result.rows_missing_created_by_backfill}"
        )
        return 2
    print(
        "Audit-field integrity verification OK: "
        + f"tables_with_changed_by={result.tables_with_changed_by}"
    )
    return 0


def _verify_medical_value_unit_integrity() -> int:
    from .database import engine
    from .features.medical_values import verify_medical_value_unit_coverage

    result = verify_medical_value_unit_coverage(engine=engine)
    if result.issue_count > 0:
        print(
            "Medical-value unit verification failed: "
            + f"tables_checked={result.tables_checked} "
            + f"template_rows_missing_loinc={result.template_rows_missing_loinc} "
            + f"numeric_datatypes_missing_canonical_unit={result.numeric_datatypes_missing_canonical_unit} "
            + f"value_rows_missing_normalization_status={result.value_rows_missing_normalization_status} "
            + f"value_rows_missing_canonical_value={result.value_rows_missing_canonical_value}"
        )
        return 2
    print(
        "Medical-value unit verification OK: "
        + f"tables_checked={result.tables_checked}"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Data management (DML only).")
    parser.add_argument(
        "--mode",
        choices=(
            "clean",
            "seed",
            "refresh",
            "export-dev-forum",
            "import-dev-forum",
            "migrate-audit-fields",
            "migrate-medical-value-units",
            "verify-medical-value-units",
            "migrate-procurement-runtime",
            "migrate-procurement-typed",
            "export-translations-json",
            "clear-translation-bundles",
            "normalize-legacy-dev-forum-capture-label",
        ),
        default="refresh",
        help=(
            "clean=wipe data, seed=seed only, refresh=clean+seed, "
            "export-dev-forum=export DEV_REQUEST rows to JSON/Markdown snapshot, "
            "import-dev-forum=import DEV_REQUEST rows from snapshot, "
            "migrate-audit-fields=add missing CREATED_BY columns and backfill values from CHANGED_BY, "
            "migrate-medical-value-units=add/backfill LOINC+UCUM medical value columns, "
            "verify-medical-value-units=read-only coverage check for LOINC/UCUM rollout, "
            "migrate-procurement-runtime=backfill legacy procurement runtime, "
            "migrate-procurement-typed=backfill typed procurement model from generic runtime rows, "
            "export-translations-json=write DB translations to frontend/src/i18n/translations.json, "
            "clear-translation-bundles=delete translation override rows from DB only, "
            "normalize-legacy-dev-forum-capture-label=normalize stale devForum.capture.captureContext override labels"
        ),
    )
    parser.add_argument("--env", default=os.getenv("TPL_ENV", "DEV"), help="Application env (DEV/TEST/PROD)")
    parser.add_argument("--seed-profile", default=os.getenv("TPL_SEED_PROFILE"), help="Optional seed profile override")
    parser.add_argument("--db-url", default=None, help="Optional DB URL override")
    parser.add_argument(
        "--dev-forum-export-dir",
        default=None,
        help="Optional export directory used by export-dev-forum/import-dev-forum.",
    )
    parser.add_argument(
        "--migration-check-level",
        choices=("basic", "strict"),
        default="strict",
        help=(
            "Schema verification depth after migration modes: "
            "basic=tables+columns, strict=includes types/nullability/indexes/constraints/FKs"
        ),
    )
    args = parser.parse_args()

    _configure_env(app_env=args.env, database_url=args.db_url, seed_profile=args.seed_profile)

    if args.mode in {"clean", "refresh"}:
        snapshot_path, bundle_count = _export_translation_snapshot_to_core_seed()
        print(f"Translation snapshot exported: {snapshot_path} (locales: {bundle_count})")
        cleaned_tables = _clean_data()
        print(f"Data clean complete. Tables wiped: {cleaned_tables}")

    if args.mode == "export-dev-forum":
        export_dir = _normalize_export_dir(args.dev_forum_export_dir)
        result = _export_dev_forum_snapshot(export_dir=export_dir)
        print(
            "Dev-Forum export complete: "
            + f"dir={result['export_dir']} "
            + f"rows={result['count']} "
            + f"table_found={result['table_found']}"
        )

    if args.mode == "import-dev-forum":
        export_dir = _normalize_export_dir(args.dev_forum_export_dir)
        result = _import_dev_forum_snapshot(export_dir=export_dir)
        if not bool(result.get("ok")):
            print(
                "Dev-Forum import skipped: "
                + str(result.get("hint") or "unknown reason")
                + f" | export_dir={export_dir}"
            )
            return 3
        print(
            "Dev-Forum import complete: "
            + f"dir={result['export_dir']} "
            + f"rows={result['imported_count']}"
        )

    if args.mode in {"seed", "refresh"}:
        result = _seed(app_env=args.env, seed_profile=args.seed_profile)
        print(
            "Seed complete: "
            + f"env={result['environment']} "
            + f"categories={','.join(result['categories'])} "
            + f"jobs={','.join(result['executed_jobs'])}"
        )

    if args.mode == "migrate-procurement-runtime":
        result = _migrate_procurement_runtime()
        print(
            "Procurement runtime migration complete: "
            + f"values={result['migrated_values']} "
            + f"person_links={result['migrated_person_links']} "
            + f"team_links={result['migrated_team_links']}"
        )
        verification_exit = _verify_schema_after_migration(check_level=args.migration_check_level)
        if verification_exit != 0:
            return verification_exit

    if args.mode == "migrate-procurement-typed":
        result = _migrate_procurement_to_typed()
        print(
            "Procurement typed migration complete: "
            + f"rows={result['migrated_rows']} "
            + f"scalar_updates={result['migrated_scalar_updates']} "
            + f"person_links={result['migrated_person_links']} "
            + f"team_links={result['migrated_team_links']}"
        )
        verification_exit = _verify_schema_after_migration(check_level=args.migration_check_level)
        if verification_exit != 0:
            return verification_exit

    if args.mode == "migrate-audit-fields":
        from .database import engine
        from .features.audit_fields import migrate_created_by_columns

        result = migrate_created_by_columns(engine=engine)
        print(
            "Audit-field migration complete: "
            + f"tables_scanned={result.tables_scanned} "
            + f"tables_with_changed_by={result.tables_with_changed_by} "
            + f"created_by_columns_added={result.created_by_columns_added} "
            + f"created_by_values_backfilled={result.created_by_values_backfilled}"
        )
        verification_exit = _verify_schema_after_migration(check_level=args.migration_check_level)
        if verification_exit != 0:
            return verification_exit
        integrity_exit = _verify_audit_field_integrity()
        if integrity_exit != 0:
            return integrity_exit

    if args.mode == "migrate-medical-value-units":
        from .database import engine
        from .features.medical_values import migrate_medical_value_unit_fields

        result = migrate_medical_value_unit_fields(engine=engine)
        print(
            "Medical-value unit migration complete: "
            + f"tables_scanned={result.tables_scanned} "
            + f"columns_added={result.columns_added} "
            + f"rows_backfilled={result.rows_backfilled}"
        )
        verification_exit = _verify_schema_after_migration(check_level=args.migration_check_level)
        if verification_exit != 0:
            return verification_exit
        integrity_exit = _verify_medical_value_unit_integrity()
        if integrity_exit != 0:
            return integrity_exit

    if args.mode == "verify-medical-value-units":
        return _verify_medical_value_unit_integrity()

    if args.mode == "export-translations-json":
        output_path, key_count = _export_translation_json_from_db()
        print(f"Frontend translations exported: {output_path} (keys: {key_count})")

    if args.mode == "clear-translation-bundles":
        deleted_rows = _clear_translation_bundles()
        print(f"Translation bundle rows deleted from DB: {deleted_rows}")

    if args.mode == "normalize-legacy-dev-forum-capture-label":
        result = _normalize_legacy_dev_forum_capture_label_overrides()
        print(
            "Legacy Dev-Forum capture label normalization complete: "
            + f"scanned_bundles={result['scanned_bundles']} "
            + f"updated_bundles={result['updated_bundles']} "
            + f"skipped_invalid_payload={result['skipped_invalid_payload']}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
