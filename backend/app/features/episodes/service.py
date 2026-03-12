from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from ...models import Code, Episode, EpisodeOrgan, Patient
from ...schemas import EpisodeCreate, EpisodeOrganCreate, EpisodeOrganUpdate, EpisodeUpdate
from .workflow_service import (
    cancel_episode,
    close_episode,
    enforce_phase_editability,
    initialize_episode_workflow,
    reject_episode,
    resolved_phase_key,
    start_listing_phase,
    today_utc_date,
)


def get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _validated_organ_ids(db: Session, organ_ids: list[int]) -> list[int]:
    if not organ_ids:
        raise HTTPException(status_code=422, detail="At least one organ is required")
    unique_ids = list(dict.fromkeys(organ_ids))
    rows = (
        db.query(Code.id)
        .filter(Code.type == "ORGAN", Code.id.in_(unique_ids))
        .all()
    )
    found_ids = {row[0] for row in rows}
    missing = [organ_id for organ_id in unique_ids if organ_id not in found_ids]
    if missing:
        raise HTTPException(status_code=422, detail=f"Unknown organ ids: {missing}")
    return unique_ids


def _active_organ_ids(episode: Episode) -> list[int]:
    active_ids = [link.organ_id for link in episode.organ_links if link.organ_id is not None and link.is_active]
    if active_ids:
        return list(dict.fromkeys(active_ids))
    if episode.organ_links:
        return []
    if episode.organ_id is not None:
        return [episode.organ_id]
    return []


def _resolve_organ_ids_for_create(payload: EpisodeCreate) -> list[int]:
    if payload.organ_ids is not None:
        return payload.organ_ids
    if payload.organ_id is not None:
        return [payload.organ_id]
    return []


def _resolve_organ_ids_for_update(payload: EpisodeUpdate, episode: Episode) -> list[int]:
    if payload.organ_ids is not None:
        return payload.organ_ids
    if payload.organ_id is not None:
        return [payload.organ_id]
    existing_ids = _active_organ_ids(episode)
    if existing_ids:
        return existing_ids
    if episode.organ_id is not None:
        return [episode.organ_id]
    return []


def _replace_episode_organs(*, db: Session, episode: Episode, organ_ids: list[int]) -> None:
    requested_ids = list(dict.fromkeys(organ_ids))
    now = date.today()
    links_by_organ_id = {link.organ_id: link for link in episode.organ_links}

    for organ_id in requested_ids:
        link = links_by_organ_id.get(organ_id)
        if link:
            link.is_active = True
            link.date_inactivated = None
            if link.date_added is None:
                link.date_added = episode.start or now
        else:
            db.add(
                EpisodeOrgan(
                    episode_id=episode.id,
                    organ_id=organ_id,
                    date_added=episode.start or now,
                    is_active=True,
                    date_inactivated=None,
                )
            )

    for link in episode.organ_links:
        if link.organ_id in requested_ids:
            continue
        if link.is_active:
            link.is_active = False
            link.date_inactivated = now

    episode.organ_id = requested_ids[0]


def _episode_query(db: Session):
    return (
        db.query(Episode)
        .options(
            joinedload(Episode.organ),
            joinedload(Episode.phase),
            selectinload(Episode.organs),
            selectinload(Episode.organ_links).joinedload(EpisodeOrgan.organ),
            joinedload(Episode.status),
            joinedload(Episode.changed_by_user),
        )
    )


def _episode_list_query(db: Session):
    return (
        db.query(Episode)
        .options(
            joinedload(Episode.organ),
            joinedload(Episode.phase),
            selectinload(Episode.organs),
            joinedload(Episode.status),
        )
    )


def list_episodes(*, patient_id: int, db: Session) -> list[Episode]:
    get_patient_or_404(patient_id, db)
    return _episode_list_query(db).filter(Episode.patient_id == patient_id).all()


def create_episode(*, patient_id: int, payload: EpisodeCreate, changed_by_id: int, db: Session) -> Episode:
    get_patient_or_404(patient_id, db)
    organ_ids = _validated_organ_ids(db, _resolve_organ_ids_for_create(payload))
    payload_data = payload.model_dump(exclude={"organ_ids", "organ_id"})
    episode = Episode(
        patient_id=patient_id,
        **payload_data,
        organ_id=organ_ids[0],
        changed_by_id=changed_by_id,
    )
    db.add(episode)
    db.flush()
    _replace_episode_organs(db=db, episode=episode, organ_ids=organ_ids)
    initialize_episode_workflow(episode=episode, changed_by_id=changed_by_id, db=db)
    db.commit()
    return _episode_query(db).filter(Episode.id == episode.id).first()


def update_episode(
    *,
    patient_id: int,
    episode_id: int,
    payload: EpisodeUpdate,
    changed_by_id: int,
    db: Session,
) -> Episode:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    update_data = payload.model_dump(exclude_unset=True, exclude={"organ_ids", "organ_id"})
    changed_keys = {
        key
        for key, value in update_data.items()
        if getattr(episode, key, None) != value
    }
    if "organ_id" in payload.model_fields_set:
        changed_keys.add("organ_id")
    if "organ_ids" in payload.model_fields_set:
        changed_keys.add("organ_ids")
    enforce_phase_editability(episode=episode, changed_keys=changed_keys)
    for key, value in update_data.items():
        setattr(episode, key, value)
    if "organ_id" in payload.model_fields_set or "organ_ids" in payload.model_fields_set:
        organ_ids = _validated_organ_ids(db, _resolve_organ_ids_for_update(payload, episode))
        _replace_episode_organs(db=db, episode=episode, organ_ids=organ_ids)
    if episode.closed and not episode.end:
        raise HTTPException(status_code=422, detail="closed can only be true if end date is set")
    episode.changed_by_id = changed_by_id
    db.commit()
    return _episode_query(db).filter(Episode.id == episode_id).first()


def start_episode_listing(
    *,
    patient_id: int,
    episode_id: int,
    start_date: date,
    changed_by_id: int,
    db: Session,
) -> Episode:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    start_listing_phase(
        episode=episode,
        start_date=start_date,
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()
    return _episode_query(db).filter(Episode.id == episode_id).first()


def close_episode_workflow(
    *,
    patient_id: int,
    episode_id: int,
    end_date: date,
    changed_by_id: int,
    db: Session,
) -> Episode:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    close_episode(
        episode=episode,
        end_date=end_date,
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()
    return _episode_query(db).filter(Episode.id == episode_id).first()


def reject_episode_workflow(
    *,
    patient_id: int,
    episode_id: int,
    reason: str,
    end_date: date | None,
    changed_by_id: int,
    db: Session,
) -> Episode:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    reject_episode(
        episode=episode,
        reason=reason,
        end_date=end_date or today_utc_date(),
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()
    return _episode_query(db).filter(Episode.id == episode_id).first()


def cancel_episode_workflow(
    *,
    patient_id: int,
    episode_id: int,
    reason: str,
    end_date: date | None,
    changed_by_id: int,
    db: Session,
) -> Episode:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    cancel_episode(
        episode=episode,
        reason=reason,
        end_date=end_date or today_utc_date(),
        changed_by_id=changed_by_id,
        db=db,
    )
    db.commit()
    return _episode_query(db).filter(Episode.id == episode_id).first()


def add_or_reactivate_episode_organ(
    *,
    patient_id: int,
    episode_id: int,
    payload: EpisodeOrganCreate,
    changed_by_id: int,
    db: Session,
) -> Episode:
    episode = (
        db.query(Episode)
        .options(selectinload(Episode.organ_links))
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    if resolved_phase_key(episode) != "EVALUATION":
        raise HTTPException(status_code=422, detail="Organs can only be added during evaluation phase")
    _validated_organ_ids(db, [payload.organ_id])
    now = date.today()
    existing = next((link for link in episode.organ_links if link.organ_id == payload.organ_id), None)
    if existing:
        existing.is_active = True
        existing.date_inactivated = None
        if payload.comment is not None:
            existing.comment = payload.comment
        if payload.reason_activation_change:
            existing.reason_activation_change = payload.reason_activation_change
        if existing.date_added is None:
            existing.date_added = payload.date_added or now
    else:
        db.add(
            EpisodeOrgan(
                episode_id=episode.id,
                organ_id=payload.organ_id,
                date_added=payload.date_added or now,
                comment=payload.comment or "",
                is_active=True,
                date_inactivated=None,
                reason_activation_change=payload.reason_activation_change or "",
            )
        )
    episode.organ_id = payload.organ_id
    episode.changed_by_id = changed_by_id
    db.commit()
    return _episode_query(db).filter(Episode.id == episode_id).first()


def update_episode_organ(
    *,
    patient_id: int,
    episode_id: int,
    episode_organ_id: int,
    payload: EpisodeOrganUpdate,
    changed_by_id: int,
    db: Session,
) -> EpisodeOrgan:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    link = (
        db.query(EpisodeOrgan)
        .filter(EpisodeOrgan.id == episode_organ_id, EpisodeOrgan.episode_id == episode_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Episode organ row not found")
    if payload.is_active is True and not link.is_active and resolved_phase_key(episode) != "EVALUATION":
        raise HTTPException(status_code=422, detail="Organs can only be added during evaluation phase")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(link, key, value)
    if link.is_active and link.date_inactivated is not None:
        link.date_inactivated = None
    if not link.is_active and link.date_inactivated is None:
        link.date_inactivated = date.today()
    if link.date_added is None:
        link.date_added = episode.start or date.today()

    active_ids = [
        item.organ_id
        for item in db.query(EpisodeOrgan)
        .filter(EpisodeOrgan.episode_id == episode_id, EpisodeOrgan.is_active.is_(True))
        .order_by(EpisodeOrgan.id.asc())
        .all()
        if item.organ_id is not None
    ]
    if active_ids:
        episode.organ_id = active_ids[0]
    episode.changed_by_id = changed_by_id
    db.commit()
    return (
        db.query(EpisodeOrgan)
        .options(joinedload(EpisodeOrgan.organ))
        .filter(EpisodeOrgan.id == episode_organ_id)
        .first()
    )


def delete_episode(*, patient_id: int, episode_id: int, db: Session) -> None:
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.patient_id == patient_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    db.delete(episode)
    db.commit()
