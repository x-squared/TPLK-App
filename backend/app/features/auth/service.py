from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ...auth import create_token, get_user_permission_keys
from ...models import User
from ...schemas import UserResponse


def serialize_user(*, db: Session, user: User) -> UserResponse:
    payload = UserResponse.model_validate(user).model_dump()
    if user.person:
        payload["name"] = f"{user.person.first_name} {user.person.surname}".strip()
    payload["permissions"] = get_user_permission_keys(db, user)
    return UserResponse.model_validate(payload)


def login_by_ext_id(*, ext_id: str, db: Session) -> tuple[str, UserResponse]:
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.roles), joinedload(User.person))
        .filter(User.ext_id == ext_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    token = create_token(user.ext_id)
    return token, serialize_user(db=db, user=user)
