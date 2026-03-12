from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ...models import Code, User


def list_users(*, role_key: str | None, db: Session) -> list[User]:
    query = db.query(User).options(joinedload(User.role), joinedload(User.roles), joinedload(User.person))
    if role_key:
        query = query.join(User.roles).filter(Code.type == "ROLE", Code.key == role_key)
    return query.order_by(User.name, User.id).all()
