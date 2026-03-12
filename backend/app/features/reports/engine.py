from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import HTTPException

from ...schemas import (
    ReportColumnResponse,
    ReportExecuteRequest,
    ReportExecuteResponse,
    ReportFieldOption,
    ReportFilterInput,
    ReportJoinOption,
    ReportMetadataResponse,
    ReportSourceOption,
    ReportSortInput,
)
from .types import FieldDef, SourceDef, ValueType


def norm_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def parse_for_compare(value_type: ValueType, raw: str) -> Any:
    if value_type == "number":
        try:
            return float(raw)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Invalid numeric value '{raw}'") from exc
    if value_type == "boolean":
        lowered = raw.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
        raise HTTPException(status_code=422, detail=f"Invalid boolean value '{raw}'")
    if value_type == "date":
        try:
            return date.fromisoformat(raw)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Invalid date value '{raw}' (expected YYYY-MM-DD)") from exc
    if value_type == "datetime":
        try:
            return datetime.fromisoformat(raw)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Invalid datetime value '{raw}' (ISO 8601)") from exc
    return raw


def serialize_value(value: Any) -> str:
    if value is None:
        return "–"
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return str(value)


def join_unique_text(values: list[Any]) -> str:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = norm_text(value)
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return " | ".join(out)


def active_field_map(source: SourceDef, joins: list[str]) -> dict[str, FieldDef]:
    field_map = {field.key: field for field in source.fields}
    available_joins = {join.key: join for join in source.joins}
    for join_key in joins:
        join = available_joins.get(join_key)
        if not join:
            raise HTTPException(status_code=422, detail=f"Unknown join '{join_key}' for source '{source.key}'")
        for field in join.fields:
            field_map[field.key] = field
    return field_map


def _match_filter(field: FieldDef, row_value: Any, cond: ReportFilterInput) -> bool:
    op = cond.operator
    if op not in field.operators:
        raise HTTPException(status_code=422, detail=f"Operator '{op}' not allowed for field '{field.key}'")

    expected = parse_for_compare(field.value_type, cond.value)
    if row_value is None:
        return False

    if field.value_type == "string":
        left = norm_text(row_value).lower()
        right = norm_text(expected).lower()
        if op == "eq":
            return left == right
        if op == "contains":
            return right in left
        raise HTTPException(status_code=422, detail=f"Operator '{op}' not supported for string")

    if field.value_type == "boolean":
        if op != "eq":
            raise HTTPException(status_code=422, detail=f"Operator '{op}' not supported for boolean")
        return bool(row_value) is bool(expected)

    if field.value_type in {"number", "date", "datetime"}:
        left = float(row_value) if field.value_type == "number" else row_value
        if op == "eq":
            return left == expected
        if op == "gte":
            return left >= expected
        if op == "lte":
            return left <= expected
        raise HTTPException(status_code=422, detail=f"Operator '{op}' not supported for '{field.value_type}'")

    return False


def filter_rows(items: list[Any], field_map: dict[str, FieldDef], filters: list[ReportFilterInput]) -> list[Any]:
    if not filters:
        return items
    out: list[Any] = []
    for item in items:
        keep = True
        for cond in filters:
            field = field_map.get(cond.field)
            if not field:
                raise HTTPException(status_code=422, detail=f"Unknown filter field '{cond.field}'")
            if not _match_filter(field, field.getter(item), cond):
                keep = False
                break
        if keep:
            out.append(item)
    return out


def apply_sort(items: list[Any], field_map: dict[str, FieldDef], sort: list[ReportSortInput]) -> list[Any]:
    if not sort:
        return items
    sorted_items = list(items)
    for sort_key in reversed(sort):
        field = field_map.get(sort_key.field)
        if not field:
            raise HTTPException(status_code=422, detail=f"Unknown sort field '{sort_key.field}'")
        reverse = sort_key.direction == "desc"
        sorted_items.sort(key=lambda row: (field.getter(row) is None, field.getter(row)), reverse=reverse)
    return sorted_items


def build_metadata_response(sources: dict[str, SourceDef]) -> ReportMetadataResponse:
    return ReportMetadataResponse(
        sources=[
            ReportSourceOption(
                key=source.key,  # type: ignore[arg-type]
                label=source.label,
                fields=[
                    ReportFieldOption(
                        key=field.key,
                        label=field.label,
                        value_type=field.value_type,  # type: ignore[arg-type]
                        operators=list(field.operators),  # type: ignore[arg-type]
                    )
                    for field in source.fields
                ],
                joins=[
                    ReportJoinOption(
                        key=join.key,
                        label=join.label,
                        fields=[
                            ReportFieldOption(
                                key=field.key,
                                label=field.label,
                                value_type=field.value_type,  # type: ignore[arg-type]
                                operators=list(field.operators),  # type: ignore[arg-type]
                            )
                            for field in join.fields
                        ],
                    )
                    for join in source.joins
                ],
            )
            for source in sources.values()
        ]
    )


def execute_report_request(payload: ReportExecuteRequest, source: SourceDef, field_map: dict[str, FieldDef], db: Any) -> ReportExecuteResponse:
    if not payload.select:
        raise HTTPException(status_code=422, detail="select must contain at least one field")

    selected_fields: list[FieldDef] = []
    for key in payload.select:
        field = field_map.get(key)
        if not field:
            raise HTTPException(status_code=422, detail=f"Unknown selected field '{key}'")
        selected_fields.append(field)

    limit = min(max(payload.limit, 1), 1000)

    rows = source.query(db)
    rows = filter_rows(rows, field_map, payload.filters)
    rows = apply_sort(rows, field_map, payload.sort)
    rows = rows[:limit]

    rendered_rows = [
        {field.key: serialize_value(field.getter(row)) for field in selected_fields}
        for row in rows
    ]

    return ReportExecuteResponse(
        source=payload.source,
        columns=[ReportColumnResponse(key=field.key, label=field.label) for field in selected_fields],
        rows=rendered_rows,
        row_count=len(rendered_rows),
    )
