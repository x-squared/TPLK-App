"""Compatibility facade for Pydantic schemas.

Domain schema definitions live under `backend/app/schema/`.
This module re-exports them to keep existing imports stable.
"""

from .schema import *  # noqa: F401,F403


