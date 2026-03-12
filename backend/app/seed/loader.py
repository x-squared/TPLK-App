from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

from sqlalchemy.orm import Session

SeedCallable = Callable[[Session], None]


@dataclass(frozen=True)
class SeedJob:
    key: str
    category: str
    description: str
    loader: SeedCallable


class SeedRunner:
    """Execute registered seed jobs filtered by category."""

    def __init__(self, jobs: Iterable[SeedJob]):
        self._jobs = tuple(jobs)

    def run(self, db: Session, include_categories: Iterable[str]) -> list[str]:
        allowed = set(include_categories)
        executed: list[str] = []
        for job in self._jobs:
            if job.category not in allowed:
                continue
            job.loader(db)
            executed.append(job.key)
        return executed
