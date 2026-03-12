from __future__ import annotations

from typing import Final

DEFAULT_ENV: Final[str] = "DEV"

ENV_CATEGORIES: Final[dict[str, tuple[str, ...]]] = {
    "PROD": ("core", "init"),
    "DEV": ("core", "init", "sample"),
    "TEST": ("core", "init", "test"),
}

PROFILE_CATEGORIES: Final[dict[str, tuple[str, ...]]] = {
    "NONE": (),
    "INIT": ("init",),
    "CORE": ("core", "init"),
    "CORE_SAMPLE": ("core", "init", "sample"),
    "CORE_TEST": ("core", "init", "test"),
}


def _normalize(value: str | None) -> str:
    if not value:
        return ""
    return value.strip().upper().replace("-", "_")


def resolve_seed_categories(app_env: str | None, seed_profile: str | None) -> tuple[str, tuple[str, ...]]:
    """
    Resolve active seed categories from environment and optional explicit profile.

    - app_env supports: DEV, TEST, PROD
    - seed_profile override supports: NONE, CORE, CORE_SAMPLE, CORE_TEST
    """
    normalized_env = _normalize(app_env) or DEFAULT_ENV
    resolved_env = normalized_env if normalized_env in ENV_CATEGORIES else DEFAULT_ENV

    normalized_profile = _normalize(seed_profile)
    if normalized_profile:
        if normalized_profile not in PROFILE_CATEGORIES:
            raise ValueError(
                f"Unknown seed profile '{seed_profile}'. "
                f"Allowed values: {', '.join(PROFILE_CATEGORIES.keys())}"
            )
        return resolved_env, PROFILE_CATEGORIES[normalized_profile]

    return resolved_env, ENV_CATEGORIES[resolved_env]
