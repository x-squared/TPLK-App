from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...models import Code, CoordinationEpisode, CoordinationProcurementTypedData
from .shared import DUAL_ASSIGNMENT_ORGAN_KEYS


def max_assignments_for_organ(*, organ_id: int, db: Session) -> int:
    organ = db.query(Code).filter(Code.id == organ_id, Code.type == "ORGAN").first()
    organ_key = ((organ.key if organ else "") or "").strip().upper()
    return 2 if organ_key in DUAL_ASSIGNMENT_ORGAN_KEYS else 1


def attach_episode_link(
    *,
    coordination_id: int,
    organ_id: int,
    episode_id: int,
    changed_by_id: int,
    db: Session,
) -> CoordinationEpisode:
    existing_for_episode = (
        db.query(CoordinationEpisode)
        .filter(
            CoordinationEpisode.coordination_id == coordination_id,
            CoordinationEpisode.organ_id == organ_id,
            CoordinationEpisode.episode_id == episode_id,
        )
        .first()
    )
    if existing_for_episode:
        return existing_for_episode

    existing_rows = (
        db.query(CoordinationEpisode)
        .filter(
            CoordinationEpisode.coordination_id == coordination_id,
            CoordinationEpisode.organ_id == organ_id,
        )
        .order_by(CoordinationEpisode.id.asc())
        .all()
    )
    max_allowed = max_assignments_for_organ(organ_id=organ_id, db=db)

    # For single-assignment organs, treat a new selection as replacement.
    if max_allowed == 1 and existing_rows:
        row = existing_rows[0]
        row.episode_id = episode_id
        row.changed_by_id = changed_by_id
        db.flush()
        return row

    if len(existing_rows) >= max_allowed:
        raise HTTPException(
            status_code=422,
            detail=f"At most {max_allowed} episode assignment(s) are allowed for the selected organ in this coordination.",
        )

    row = CoordinationEpisode(
        coordination_id=coordination_id,
        episode_id=episode_id,
        organ_id=organ_id,
        changed_by_id=changed_by_id,
    )
    db.add(row)
    db.flush()
    return row


def sync_episode_links_from_typed_rows(
    *,
    coordination_id: int,
    organ_id: int,
    changed_by_id: int,
    db: Session,
) -> None:
    referenced_episode_ids = {
        row.recipient_episode_id
        for row in (
            db.query(CoordinationProcurementTypedData)
            .filter(
                CoordinationProcurementTypedData.coordination_id == coordination_id,
                CoordinationProcurementTypedData.organ_id == organ_id,
                CoordinationProcurementTypedData.recipient_episode_id.isnot(None),
            )
            .all()
        )
        if row.recipient_episode_id is not None
    }
    existing_rows = (
        db.query(CoordinationEpisode)
        .filter(
            CoordinationEpisode.coordination_id == coordination_id,
            CoordinationEpisode.organ_id == organ_id,
        )
        .order_by(CoordinationEpisode.id.asc())
        .all()
    )
    existing_by_episode_id: dict[int, CoordinationEpisode] = {}
    duplicate_row_ids: set[int] = set()
    for row in existing_rows:
        if row.episode_id in existing_by_episode_id:
            duplicate_row_ids.add(row.id)
            continue
        existing_by_episode_id[row.episode_id] = row

    for row in existing_rows:
        if row.id in duplicate_row_ids:
            db.delete(row)
            continue
        if row.episode_id not in referenced_episode_ids and not row.is_organ_rejected:
            db.delete(row)

    for episode_id in referenced_episode_ids:
        existing = existing_by_episode_id.get(episode_id)
        if existing is None:
            continue
        if existing.is_organ_rejected:
            existing.is_organ_rejected = False
            existing.changed_by_id = changed_by_id

    existing_episode_ids = set(existing_by_episode_id.keys())
    missing_episode_ids = referenced_episode_ids - existing_episode_ids
    for episode_id in missing_episode_ids:
        db.add(
            CoordinationEpisode(
                coordination_id=coordination_id,
                organ_id=organ_id,
                episode_id=episode_id,
                changed_by_id=changed_by_id,
            )
        )
