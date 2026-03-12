from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ...models import Catalogue, Code
from ...schemas import CatalogueUpdate


def list_codes(*, code_type: str | None, db: Session) -> list[Code]:
    query = db.query(Code)
    if code_type:
        query = query.filter(Code.type == code_type)
    return query.order_by(Code.type, Code.pos).all()


def list_catalogues(*, catalogue_type: str | None, db: Session) -> list[Catalogue]:
    query = db.query(Catalogue)
    if catalogue_type:
        query = query.filter(Catalogue.type == catalogue_type)
    return query.order_by(Catalogue.type, Catalogue.pos).all()


def list_catalogue_types(*, db: Session) -> list[dict[str, int | str]]:
    rows = (
        db.query(
            Catalogue.type.label("type"),
            func.count(Catalogue.id).label("item_count"),
        )
        .group_by(Catalogue.type)
        .order_by(Catalogue.type.asc())
        .all()
    )
    return [
        {
            "type": str(row.type),
            "item_count": int(row.item_count),
        }
        for row in rows
    ]


def update_catalogue(
    *,
    catalogue_id: int,
    payload: CatalogueUpdate,
    db: Session,
) -> Catalogue:
    item = db.query(Catalogue).filter(Catalogue.id == catalogue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Catalogue entry not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item
