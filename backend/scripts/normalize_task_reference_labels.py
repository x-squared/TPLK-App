#!/usr/bin/env python3
"""Normalize legacy task/task-group labels to human-readable references."""

from __future__ import annotations

import argparse
import re
import sqlite3
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path


LEGACY_TASK_DESCRIPTION_RE = re.compile(r"^New task for P#\d+(?:\s+·\s+E#\d+)?(?:\s+·\s+.+)?$")


@dataclass(frozen=True)
class GroupContext:
    group_id: int
    name: str | None
    patient_first_name: str | None
    patient_last_name: str | None
    patient_birth_date: str | None
    patient_pid: str | None
    episode_id: int | None
    episode_start: str | None
    organ_name: str | None
    phase_name: str | None


def _default_db_path() -> Path:
    return Path(__file__).resolve().parents[2] / "database" / "tpl_app.db"


def _trim(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def _format_date_ddmmyyyy(value: str | None) -> str:
    if value is None:
        return "-"
    text = value.strip()
    if not text:
        return "-"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        try:
            parsed = datetime.combine(date.fromisoformat(text), datetime.min.time())
        except ValueError:
            return "-"
    return parsed.strftime("%d.%m.%Y")


def _format_patient_reference(context: GroupContext) -> str:
    full_name = f"{_trim(context.patient_first_name)} {_trim(context.patient_last_name)}".strip()
    if not full_name:
        full_name = "Unknown patient"
    birth_date = _format_date_ddmmyyyy(context.patient_birth_date)
    pid = _trim(context.patient_pid) or "-"
    return f"{full_name} ({birth_date}), {pid}"


def _format_episode_reference(context: GroupContext) -> str:
    patient_part = _format_patient_reference(context)
    organ = _trim(context.organ_name) or "Unknown organ"
    start = _format_date_ddmmyyyy(context.episode_start)
    return f"{patient_part}, {organ}, {start}"


def _build_group_name(context: GroupContext) -> str:
    base_reference = (
        _format_episode_reference(context)
        if context.episode_id is not None
        else _format_patient_reference(context)
    )
    phase = _trim(context.phase_name)
    if phase:
        return f"Other tasks - {base_reference} · Phase: {phase}"
    return f"Other tasks - {base_reference}"


def _build_task_description(context: GroupContext) -> str:
    reference = (
        _format_episode_reference(context)
        if context.episode_id is not None
        else _format_patient_reference(context)
    )
    phase = _trim(context.phase_name)
    if phase:
        return f"New task for {reference} · Phase: {phase}"
    return f"New task for {reference}"


def _load_group_contexts(cursor: sqlite3.Cursor) -> dict[int, GroupContext]:
    cursor.execute(
        """
        SELECT
            tg.ID,
            tg.NAME,
            p.FIRST_NAME,
            p.NAME,
            p.DATE_OF_BIRTH,
            p.PID,
            e.ID,
            e.START,
            organ.NAME_DEFAULT,
            phase.NAME_DEFAULT
        FROM TASK_GROUP tg
        JOIN PATIENT p ON p.ID = tg.PATIENT_ID
        LEFT JOIN EPISODE e ON e.ID = tg.EPISODE_ID
        LEFT JOIN CODE organ ON organ.ID = e.ORGAN_ID
        LEFT JOIN CODE phase ON phase.ID = tg.TPL_PHASE_ID
        ORDER BY tg.ID
        """
    )
    rows = cursor.fetchall()
    contexts: dict[int, GroupContext] = {}
    for row in rows:
        context = GroupContext(
            group_id=int(row[0]),
            name=row[1],
            patient_first_name=row[2],
            patient_last_name=row[3],
            patient_birth_date=row[4],
            patient_pid=row[5],
            episode_id=row[6],
            episode_start=row[7],
            organ_name=row[8],
            phase_name=row[9],
        )
        contexts[context.group_id] = context
    return contexts


def normalize_task_references(db_path: Path) -> tuple[int, int]:
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found: {db_path}")

    conn = sqlite3.connect(str(db_path))
    try:
        cursor = conn.cursor()
        contexts = _load_group_contexts(cursor)

        updated_groups = 0
        for context in contexts.values():
            current_name = _trim(context.name)
            if not current_name.startswith("Other tasks (") and not current_name.startswith("Other tasks -"):
                continue
            next_name = _build_group_name(context)
            if current_name == next_name:
                continue
            cursor.execute("UPDATE TASK_GROUP SET NAME = ? WHERE ID = ?", (next_name, context.group_id))
            updated_groups += 1

        cursor.execute("SELECT ID, TASK_GROUP_ID, DESCRIPTION FROM TASK ORDER BY ID")
        tasks = cursor.fetchall()
        updated_tasks = 0
        for task_id, task_group_id, description in tasks:
            current_description = _trim(description)
            if not LEGACY_TASK_DESCRIPTION_RE.match(current_description):
                continue
            context = contexts.get(task_group_id)
            if context is None:
                continue
            next_description = _build_task_description(context)
            if current_description == next_description:
                continue
            cursor.execute("UPDATE TASK SET DESCRIPTION = ? WHERE ID = ?", (next_description, task_id))
            updated_tasks += 1

        conn.commit()
        return updated_groups, updated_tasks
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Normalize TASK/TASK_GROUP labels to human-readable references.",
    )
    parser.add_argument(
        "--db",
        default=str(_default_db_path()),
        help="Path to sqlite db file (default: repo/database/tpl_app.db)",
    )
    args = parser.parse_args()

    db_path = Path(args.db).resolve()
    updated_groups, updated_tasks = normalize_task_references(db_path)
    print(f"Updated task groups: {updated_groups}")
    print(f"Updated tasks: {updated_tasks}")
    print(f"Database: {db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
