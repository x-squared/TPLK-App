from __future__ import annotations

import datetime as dt

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...models import Code, Information, InformationContext, InformationUser, User
from ...schemas import InformationCreate, InformationUpdate
from .access import can_manage_information, resolve_current_user_read_at


def _information_query(db: Session):
    return db.query(Information).options(
        joinedload(Information.context),
        joinedload(Information.author),
        joinedload(Information.context_links).joinedload(InformationContext.context),
    )


def _ensure_author_exists(*, db: Session, author_id: int) -> None:
    if not db.query(User).filter(User.id == author_id).first():
        raise HTTPException(status_code=422, detail="author_id references unknown USER")


def _ensure_context_valid(*, db: Session, context_id: int | None) -> None:
    if context_id is None:
        return
    context = db.query(Code).filter(Code.id == context_id).first()
    if not context:
        raise HTTPException(status_code=422, detail="context_id references unknown CODE")
    if context.type not in {"ORGAN", "INFORMATION_AREA"}:
        raise HTTPException(status_code=422, detail="context_id must reference CODE type ORGAN or INFORMATION_AREA")


def _normalize_context_ids(*, context_id: int | None, context_ids: list[int] | None) -> list[int]:
    raw = list(context_ids or [])
    if context_id is not None and context_id not in raw:
        raw.insert(0, context_id)
    normalized: list[int] = []
    seen: set[int] = set()
    for value in raw:
        if value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


def _ensure_contexts_valid(*, db: Session, context_ids: list[int]) -> None:
    for context_id in context_ids:
        _ensure_context_valid(db=db, context_id=context_id)


def _enforce_area_context_rules(*, db: Session, context_ids: list[int]) -> list[int]:
    has_information_area_codes = (
        db.query(Code).filter(Code.type == "INFORMATION_AREA").first() is not None
    )
    if not has_information_area_codes:
        return context_ids
    if not context_ids:
        general = db.query(Code).filter(Code.type == "INFORMATION_AREA", Code.key == "GENERAL").first()
        return [general.id] if general is not None else context_ids
    codes_by_id = {
        code.id: code
        for code in db.query(Code).filter(Code.id.in_(context_ids)).all()
    }
    area_codes = [
        code
        for context_id in context_ids
        for code in [codes_by_id.get(context_id)]
        if code is not None and code.type == "INFORMATION_AREA"
    ]
    organ_codes = [
        code
        for context_id in context_ids
        for code in [codes_by_id.get(context_id)]
        if code is not None and code.type == "ORGAN"
    ]
    if len(area_codes) > 1:
        raise HTTPException(status_code=422, detail="Only one INFORMATION_AREA context can be set")
    area_key = area_codes[0].key if area_codes else "GENERAL"
    if area_key == "ORGAN" and len(organ_codes) == 0:
        raise HTTPException(status_code=422, detail="At least one ORGAN context is required for INFORMATION_AREA.ORGAN")
    if area_key != "ORGAN" and len(organ_codes) > 0:
        raise HTTPException(status_code=422, detail="ORGAN contexts are only allowed for INFORMATION_AREA.ORGAN")
    if not area_codes:
        general = db.query(Code).filter(Code.type == "INFORMATION_AREA", Code.key == "GENERAL").first()
        if general is not None:
            return [general.id, *context_ids]
    return context_ids


def _sync_information_context_links(*, item: Information, context_ids: list[int]) -> None:
    item.context_id = context_ids[0] if context_ids else None
    item.context_links = [
        InformationContext(context_id=context_id, pos=pos)
        for pos, context_id in enumerate(context_ids)
    ]


def _next_working_day(today: dt.date | None = None) -> dt.date:
    base = today or dt.date.today()
    candidate = base + dt.timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += dt.timedelta(days=1)
    return candidate


def _validate_valid_from(*, valid_from: dt.date) -> None:
    min_valid_from = _next_working_day()
    if valid_from < min_valid_from:
        raise HTTPException(
            status_code=422,
            detail=f"valid_from must be at least {min_valid_from.isoformat()}",
        )


def _read_map_for_user(*, db: Session, current_user_id: int) -> dict[int, object]:
    rows = (
        db.query(InformationUser)
        .filter(InformationUser.user_id == current_user_id)
        .all()
    )
    return {row.information_id: row.seen_at for row in rows}


def _read_information_ids(*, db: Session) -> set[int]:
    rows = db.query(InformationUser.information_id).distinct().all()
    return {information_id for (information_id,) in rows}


def _ensure_read_marker(*, db: Session, information_id: int, user_id: int) -> InformationUser:
    marker = (
        db.query(InformationUser)
        .filter(
            InformationUser.information_id == information_id,
            InformationUser.user_id == user_id,
        )
        .first()
    )
    if marker:
        return marker
    marker = InformationUser(information_id=information_id, user_id=user_id)
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker


def _to_response_row(*, row: Information, current_user_read_at: object | None, has_reads: bool) -> dict:
    linked_contexts = [
        link.context
        for link in sorted(row.context_links or [], key=lambda link: link.pos)
        if link.context is not None
    ]
    linked_context_ids = [context.id for context in linked_contexts]
    if not linked_contexts and row.context is not None:
        linked_contexts = [row.context]
        linked_context_ids = [row.context.id]
    return {
        "id": row.id,
        "context_id": row.context_id,
        "context_ids": linked_context_ids,
        "text": row.text,
        "author_id": row.author_id,
        "date": row.date,
        "valid_from": row.valid_from,
        "withdrawn": bool(row.withdrawn),
        "has_reads": has_reads,
        "context": row.context,
        "contexts": linked_contexts,
        "author": row.author,
        "current_user_read_at": current_user_read_at,
    }


def list_information(*, db: Session, current_user_id: int) -> list[dict]:
    rows = _information_query(db).order_by(Information.date.desc(), Information.id.desc()).all()
    read_map = _read_map_for_user(db=db, current_user_id=current_user_id)
    read_information_ids = _read_information_ids(db=db)
    now_utc = dt.datetime.now(dt.timezone.utc)
    response: list[dict] = []
    for row in rows:
        read_at = resolve_current_user_read_at(
            explicit_read_at=read_map.get(row.id),
            current_user_id=current_user_id,
            author_id=row.author_id,
            withdrawn=bool(row.withdrawn),
            now_utc=now_utc,
        )
        has_reads = row.id in read_information_ids or not row.withdrawn
        response.append(_to_response_row(row=row, current_user_read_at=read_at, has_reads=has_reads))
    return response


def create_information(*, payload: InformationCreate, db: Session, current_user_id: int) -> dict:
    context_ids = _normalize_context_ids(context_id=payload.context_id, context_ids=payload.context_ids)
    _ensure_contexts_valid(db=db, context_ids=context_ids)
    context_ids = _enforce_area_context_rules(db=db, context_ids=context_ids)
    _ensure_author_exists(db=db, author_id=current_user_id)
    _validate_valid_from(valid_from=payload.valid_from)
    data = payload.model_dump(exclude={"context_ids"})
    data["author_id"] = current_user_id
    data["context_id"] = context_ids[0] if context_ids else None
    item = Information(**data)
    _sync_information_context_links(item=item, context_ids=context_ids)
    db.add(item)
    db.commit()
    author_read_marker = _ensure_read_marker(db=db, information_id=item.id, user_id=current_user_id)
    row = _information_query(db).filter(Information.id == item.id).first()
    return _to_response_row(row=row, current_user_read_at=author_read_marker.seen_at, has_reads=True)


def update_information(
    *,
    information_id: int,
    payload: InformationUpdate,
    db: Session,
    current_user_id: int,
    current_user_is_admin: bool,
) -> dict:
    item = db.query(Information).filter(Information.id == information_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Information not found")
    if not can_manage_information(
        current_user_id=current_user_id,
        author_id=item.author_id,
        current_user_is_admin=current_user_is_admin,
    ):
        raise HTTPException(status_code=403, detail="Only the author or an admin user can edit this information")
    data = payload.model_dump(exclude_unset=True)
    if "context_ids" in data or "context_id" in data:
        merged_context_ids = _normalize_context_ids(
            context_id=data.get("context_id", item.context_id),
            context_ids=data.get("context_ids"),
        )
        _ensure_contexts_valid(db=db, context_ids=merged_context_ids)
        merged_context_ids = _enforce_area_context_rules(db=db, context_ids=merged_context_ids)
        _sync_information_context_links(item=item, context_ids=merged_context_ids)
        data["context_id"] = merged_context_ids[0] if merged_context_ids else None
    if "context_ids" in data:
        data.pop("context_ids", None)
    if "author_id" in data and data.get("author_id") is not None:
        _ensure_author_exists(db=db, author_id=data["author_id"])
    if "valid_from" in data and data.get("valid_from") is not None:
        _validate_valid_from(valid_from=data["valid_from"])
    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    row = _information_query(db).filter(Information.id == information_id).first()
    read_map = _read_map_for_user(db=db, current_user_id=current_user_id)
    return _to_response_row(
        row=row,
        current_user_read_at=read_map.get(row.id),
        has_reads=(
            db.query(InformationUser).filter(InformationUser.information_id == row.id).first() is not None
            or not row.withdrawn
        ),
    )


def mark_information_read(*, information_id: int, current_user_id: int, db: Session) -> dict:
    item = _information_query(db).filter(Information.id == information_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Information not found")
    marker = (
        db.query(InformationUser)
        .filter(
            InformationUser.information_id == information_id,
            InformationUser.user_id == current_user_id,
        )
        .first()
    )
    if not marker:
        marker = InformationUser(information_id=information_id, user_id=current_user_id)
        db.add(marker)
        db.commit()
        db.refresh(marker)
    return _to_response_row(row=item, current_user_read_at=marker.seen_at, has_reads=True)


def delete_information(*, information_id: int, db: Session, current_user_id: int, current_user_is_admin: bool) -> None:
    item = db.query(Information).filter(Information.id == information_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Information not found")
    if item.withdrawn:
        raise HTTPException(status_code=409, detail="Withdrawn information cannot be deleted")
    if not can_manage_information(
        current_user_id=current_user_id,
        author_id=item.author_id,
        current_user_is_admin=current_user_is_admin,
    ):
        raise HTTPException(status_code=403, detail="Only the author or an admin user can delete this information")
    had_persisted_reads = (
        db.query(InformationUser)
        .filter(InformationUser.information_id == information_id)
        .first()
        is not None
    )
    had_reads = had_persisted_reads or not item.withdrawn
    if had_reads:
        item.withdrawn = True
        (
            db.query(InformationUser)
            .filter(InformationUser.information_id == information_id)
            .delete(synchronize_session=False)
        )
        db.add(item)
        db.commit()
        return
    db.delete(item)
    db.commit()
