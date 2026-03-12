from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

StartPageKey = Literal["my-work", "patients", "donors", "colloquiums", "coordinations", "reports", "admin", "e2e-tests", "dev-forum"]
LocaleKey = Literal["en", "de"]


class UserPreferencesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locale: LocaleKey = "en"
    start_page: StartPageKey = "patients"


class UserPreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locale: LocaleKey | None = None
    start_page: StartPageKey | None = None
