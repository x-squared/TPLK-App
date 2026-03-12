#!/usr/bin/env python3
"""Delete all rows from the SQLite DB while keeping the file."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


def _default_db_path() -> Path:
    return Path(__file__).resolve().parents[2] / "database" / "tpl_app.db"


def _quote_identifier(name: str) -> str:
    return f'"{name.replace("\"", "\"\"")}"'


def clean_database(db_path: Path) -> int:
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found: {db_path}")

    conn = sqlite3.connect(str(db_path))
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = OFF")
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        table_names = [row[0] for row in cursor.fetchall()]

        for table in table_names:
            cursor.execute(f"DELETE FROM {_quote_identifier(table)}")

        # sqlite_sequence exists only when AUTOINCREMENT is used.
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM sqlite_sequence")
        conn.commit()
        cursor.execute("VACUUM")
        conn.commit()
        return len(table_names)
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Wipe SQLite content but keep the database file.",
    )
    parser.add_argument(
        "--db",
        default=str(_default_db_path()),
        help="Path to sqlite db file (default: repo/database/tpl_app.db)",
    )
    args = parser.parse_args()

    db_path = Path(args.db).resolve()
    cleaned = clean_database(db_path)
    print(f"Cleaned {cleaned} table(s) in: {db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
