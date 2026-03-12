from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from ..enums import FavoriteTypeKey


class FavoriteBase(BaseModel):
    user_id: int
    favorite_type_key: FavoriteTypeKey
    name: str = ""
    patient_id: int | None = None
    episode_id: int | None = None
    colloqium_id: int | None = None
    coordination_id: int | None = None
    context_json: str | None = None


class FavoriteCreate(BaseModel):
    favorite_type_key: FavoriteTypeKey
    name: str = ""
    patient_id: int | None = None
    episode_id: int | None = None
    colloqium_id: int | None = None
    coordination_id: int | None = None
    context_json: str | None = None

    @model_validator(mode="after")
    def validate_target(self):
        if self.favorite_type_key == FavoriteTypeKey.PATIENT and self.patient_id is None:
            raise ValueError("patient_id is required for PATIENT favorite")
        if self.favorite_type_key == FavoriteTypeKey.EPISODE and self.episode_id is None:
            raise ValueError("episode_id is required for EPISODE favorite")
        if self.favorite_type_key == FavoriteTypeKey.COLLOQUIUM and self.colloqium_id is None:
            raise ValueError("colloqium_id is required for COLLOQUIUM favorite")
        if self.favorite_type_key == FavoriteTypeKey.COORDINATION and self.coordination_id is None:
            raise ValueError("coordination_id is required for COORDINATION favorite")
        return self


class FavoriteResponse(FavoriteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None
    sort_pos: int


class FavoriteReorderRequest(BaseModel):
    favorite_ids: list[int]
