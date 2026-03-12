from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ...enums import FavoriteTypeKey
from ...models import Colloqium, Coordination, CoordinationDonor, Episode, Favorite, Patient
from ...schemas import FavoriteCreate


def _format_date_dd_mm_yyyy(value):
    if not value:
        return "–"
    return value.strftime("%d.%m.%Y")


def _derive_name(payload: FavoriteCreate, db: Session) -> str:
    if payload.favorite_type_key == FavoriteTypeKey.PATIENT and payload.patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if patient:
            full_name = f"{patient.first_name} {patient.name}".strip()
            birthday = _format_date_dd_mm_yyyy(patient.date_of_birth)
            pid = patient.pid or "–"
            return f"{full_name} ({birthday}), {pid}"
    if payload.favorite_type_key == FavoriteTypeKey.EPISODE and payload.episode_id is not None:
        episode = db.query(Episode).filter(Episode.id == payload.episode_id).first()
        if episode:
            if episode.patient:
                full_name = f"{episode.patient.first_name} {episode.patient.name}".strip()
                birthday = _format_date_dd_mm_yyyy(episode.patient.date_of_birth)
                pid = episode.patient.pid or "–"
                patient_name = f"{full_name} ({birthday}), {pid}"
            else:
                patient_name = "Unknown patient (–), –"
            organ_names = [organ.name_default for organ in (episode.organs or []) if organ and organ.name_default]
            if organ_names:
                organ = " + ".join(dict.fromkeys(organ_names))
            else:
                organ = episode.organ.name_default if episode.organ else "Unknown organ"
            start = _format_date_dd_mm_yyyy(episode.start)
            return f"{patient_name}, {organ}, {start}"
    if payload.favorite_type_key == FavoriteTypeKey.COLLOQUIUM and payload.colloqium_id is not None:
        colloqium = db.query(Colloqium).filter(Colloqium.id == payload.colloqium_id).first()
        if colloqium:
            colloqium_type_name = colloqium.colloqium_type.name if colloqium.colloqium_type else "Colloquium"
            return f"{colloqium_type_name} ({colloqium.date})"
    if payload.favorite_type_key == FavoriteTypeKey.COORDINATION and payload.coordination_id is not None:
        coordination = db.query(Coordination).filter(Coordination.id == payload.coordination_id).first()
        if coordination:
            donor = (
                db.query(CoordinationDonor)
                .filter(CoordinationDonor.coordination_id == coordination.id)
                .first()
            )
            if donor and donor.full_name:
                return donor.full_name
            return f"Coordination #{coordination.id}"
    return ""


def _find_existing(user_id: int, payload: FavoriteCreate, db: Session) -> Favorite | None:
    query = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.favorite_type_key == payload.favorite_type_key,
    )
    if payload.favorite_type_key == FavoriteTypeKey.PATIENT:
        query = query.filter(Favorite.patient_id == payload.patient_id)
    elif payload.favorite_type_key == FavoriteTypeKey.EPISODE:
        query = query.filter(Favorite.episode_id == payload.episode_id)
    elif payload.favorite_type_key == FavoriteTypeKey.COLLOQUIUM:
        query = query.filter(Favorite.colloqium_id == payload.colloqium_id)
    elif payload.favorite_type_key == FavoriteTypeKey.COORDINATION:
        query = query.filter(Favorite.coordination_id == payload.coordination_id)
    return query.first()


def list_favorites(*, user_id: int, db: Session) -> list[Favorite]:
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.sort_pos.asc(), Favorite.id.asc())
        .all()
    )


def create_favorite(*, user_id: int, payload: FavoriteCreate, db: Session) -> Favorite:
    existing = _find_existing(user_id, payload, db)
    if existing:
        next_context = (payload.context_json or "").strip() or None
        if existing.context_json != next_context:
            existing.context_json = next_context
            db.commit()
            db.refresh(existing)
        return existing
    max_sort_pos = db.query(Favorite.sort_pos).filter(Favorite.user_id == user_id).order_by(Favorite.sort_pos.desc()).first()
    next_sort_pos = (max_sort_pos[0] if max_sort_pos else 0) + 1
    favorite = Favorite(
        user_id=user_id,
        favorite_type_key=payload.favorite_type_key,
        name=payload.name.strip() or _derive_name(payload, db),
        patient_id=payload.patient_id,
        episode_id=payload.episode_id,
        colloqium_id=payload.colloqium_id,
        coordination_id=payload.coordination_id,
        context_json=(payload.context_json or "").strip() or None,
        sort_pos=next_sort_pos,
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def delete_favorite(*, favorite_id: int, user_id: int, db: Session) -> None:
    favorite = (
        db.query(Favorite)
        .filter(Favorite.id == favorite_id, Favorite.user_id == user_id)
        .first()
    )
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(favorite)
    db.commit()


def reorder_favorites(*, user_id: int, favorite_ids: list[int], db: Session) -> list[Favorite]:
    favorites = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.sort_pos.asc(), Favorite.id.asc())
        .all()
    )
    existing_ids = [item.id for item in favorites]
    if not favorites:
        return []
    if len(favorite_ids) != len(existing_ids) or set(favorite_ids) != set(existing_ids):
        raise HTTPException(status_code=422, detail="favorite_ids must contain all user favorites exactly once")
    index_by_id = {favorite_id: index for index, favorite_id in enumerate(favorite_ids, start=1)}
    for item in favorites:
        item.sort_pos = index_by_id[item.id]
    db.commit()
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.sort_pos.asc(), Favorite.id.asc())
        .all()
    )
