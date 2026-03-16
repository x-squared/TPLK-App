#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

TMP_DB_PATH="$(mktemp -t tplk-schema-seed-XXXXXX.db)"
trap 'rm -f "${TMP_DB_PATH}"' EXIT
TMP_DB_URL="sqlite:///${TMP_DB_PATH}"

echo "[schema-seed-check] Recreate schema in temporary database"
cd "${BACKEND_DIR}"
python3 -m app.db_schema --mode recreate --env TEST --db-url "${TMP_DB_URL}"

echo "[schema-seed-check] Seed CORE_SAMPLE into temporary database"
python3 -m app.db_data --mode seed --env TEST --seed-profile CORE_SAMPLE --db-url "${TMP_DB_URL}"

echo "[schema-seed-check] Verify strict schema drift"
python3 -m app.db_schema --mode verify --check-level strict --env TEST --db-url "${TMP_DB_URL}"

echo "[schema-seed-check] Verify required contact reference codes"
python3 - <<'PY' "${TMP_DB_PATH}"
import sqlite3
import sys

db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
cur = conn.cursor()

contact_count = cur.execute('SELECT COUNT(*) FROM "CODE" WHERE "TYPE" = ?', ("CONTACT",)).fetchone()[0]
contact_use_count = cur.execute('SELECT COUNT(*) FROM "CODE" WHERE "TYPE" = ?', ("CONTACT_USE",)).fetchone()[0]
has_use_id = cur.execute(
    "SELECT COUNT(*) FROM pragma_table_info('CONTACT_INFO') WHERE name = 'USE_ID'"
).fetchone()[0] > 0

errors: list[str] = []
if contact_count <= 0:
    errors.append("CODE.CONTACT is empty")
if contact_use_count <= 0:
    errors.append("CODE.CONTACT_USE is empty")
if not has_use_id:
    errors.append("CONTACT_INFO.USE_ID column missing")

if errors:
    print("[schema-seed-check] FAILED")
    for issue in errors:
        print(f"[schema-seed-check] ERROR {issue}")
    raise SystemExit(1)

print(
    "[schema-seed-check] OK "
    + f"(CONTACT={contact_count}, CONTACT_USE={contact_use_count}, CONTACT_INFO.USE_ID={has_use_id})"
)
PY

echo "[schema-seed-check] Schema and seed consistency checks passed"
