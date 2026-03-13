from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

from .dto import PendingOperationDto

T = TypeVar("T")


@dataclass(frozen=True)
class ReadyResult(Generic[T]):
    data: T


@dataclass(frozen=True)
class PendingResult:
    operation: PendingOperationDto
