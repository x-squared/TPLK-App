from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

ReportSourceKey = Literal["PATIENT", "EPISODE", "MEDICAL_VALUE", "COORDINATION"]
ReportValueType = Literal["string", "number", "date", "datetime", "boolean"]
ReportOperatorKey = Literal["eq", "contains", "gte", "lte"]
ReportSortDirection = Literal["asc", "desc"]


class ReportFieldOption(BaseModel):
    key: str
    label: str
    value_type: ReportValueType
    operators: list[ReportOperatorKey]


class ReportJoinOption(BaseModel):
    key: str
    label: str
    fields: list[ReportFieldOption]


class ReportSourceOption(BaseModel):
    key: ReportSourceKey
    label: str
    fields: list[ReportFieldOption]
    joins: list[ReportJoinOption] = []


class ReportMetadataResponse(BaseModel):
    sources: list[ReportSourceOption]


class ReportFilterInput(BaseModel):
    field: str
    operator: ReportOperatorKey
    value: str


class ReportSortInput(BaseModel):
    field: str
    direction: ReportSortDirection = "asc"


class ReportExecuteRequest(BaseModel):
    source: ReportSourceKey
    select: list[str]
    joins: list[str] = []
    filters: list[ReportFilterInput] = []
    sort: list[ReportSortInput] = []
    limit: int = 200


class ReportColumnResponse(BaseModel):
    key: str
    label: str


class ReportExecuteResponse(BaseModel):
    source: ReportSourceKey
    columns: list[ReportColumnResponse]
    rows: list[dict[str, str]]
    row_count: int
