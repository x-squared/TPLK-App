from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TranslationOverridesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locale: str
    entries: dict[str, str] = Field(default_factory=dict)


class TranslationOverridesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: dict[str, str] = Field(default_factory=dict)
