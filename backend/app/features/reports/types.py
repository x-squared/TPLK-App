from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Literal

OperatorKey = Literal["eq", "contains", "gte", "lte"]
ValueType = Literal["string", "number", "date", "datetime", "boolean"]


@dataclass(frozen=True)
class FieldDef:
    key: str
    label: str
    value_type: ValueType
    operators: tuple[OperatorKey, ...]
    getter: Callable[[Any], Any]


@dataclass(frozen=True)
class JoinDef:
    key: str
    label: str
    fields: tuple[FieldDef, ...]


@dataclass(frozen=True)
class SourceDef:
    key: str
    label: str
    fields: tuple[FieldDef, ...]
    joins: tuple[JoinDef, ...]
    query: Callable[[Any], list[Any]]
