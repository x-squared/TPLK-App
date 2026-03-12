from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from .reference import CodeResponse, UserResponse


class MedicalValueTemplateBase(BaseModel):
    lab_key: str
    kis_key: str
    loinc_code: str | None = None
    loinc_display_name: str | None = None
    datatype_id: int
    name_default: str = ""
    pos: int
    is_main: bool = False
    medical_value_group_id: int | None = None


class MedicalValueTemplateCreate(MedicalValueTemplateBase):
    pass


class MedicalValueTemplateResponse(MedicalValueTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    datatype: CodeResponse | None = None
    datatype_def_id: int | None = None
    datatype_definition: "DatatypeDefinitionResponse | None" = None
    medical_value_group_template: "MedicalValueGroupTemplateResponse | None" = None
    context_templates: list["MedicalValueTemplateContextTemplateResponse"] = []


class DatatypeDefinitionBase(BaseModel):
    code_id: int
    primitive_kind: str = "text"
    unit: str | None = None
    canonical_unit_ucum: str | None = None
    allowed_units_ucum_json: str | None = None
    conversion_group: str | None = None
    format_pattern: str | None = None
    validation_regex: str | None = None
    min_value: str | None = None
    max_value: str | None = None
    precision: int | None = None


class DatatypeDefinitionResponse(DatatypeDefinitionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: CodeResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class MedicalValueGroupTemplateBase(BaseModel):
    key: str
    name_default: str = ""
    pos: int = 0
    renew_date: date | None = None


class MedicalValueGroupTemplateUpdate(BaseModel):
    name_default: str | None = None
    pos: int | None = None
    renew_date: date | None = None


class MedicalValueGroupContextTemplateBase(BaseModel):
    medical_value_group_id: int
    context_kind: str
    organ_id: int | None = None


class MedicalValueGroupContextTemplateResponse(MedicalValueGroupContextTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organ: CodeResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class MedicalValueTemplateContextTemplateBase(BaseModel):
    medical_value_template_id: int
    context_kind: str
    organ_id: int | None = None


class MedicalValueTemplateContextTemplateResponse(MedicalValueTemplateContextTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organ: CodeResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class MedicalValueGroupTemplateResponse(MedicalValueGroupTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    context_templates: list[MedicalValueGroupContextTemplateResponse] = []
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class MedicalValueGroupBase(BaseModel):
    patient_id: int
    medical_value_group_id: int
    context_key: str
    organ_id: int | None = None
    is_donor_context: bool = False
    renew_date: date | None = None


class MedicalValueGroupResponse(MedicalValueGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medical_value_group_template: MedicalValueGroupTemplateResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None


class MedicalValueBase(BaseModel):
    patient_id: int
    medical_value_template_id: int | None = None
    datatype_id: int | None = None
    name: str = ""
    pos: int = 0
    value: str = ""
    value_input: str = ""
    unit_input_ucum: str | None = None
    value_canonical: str = ""
    unit_canonical_ucum: str | None = None
    normalization_status: str = "UNSPECIFIED"
    normalization_error: str = ""
    renew_date: date | None = None
    medical_value_group_id: int | None = None
    medical_value_group_instance_id: int | None = None
    organ_id: int | None = None
    is_donor_context: bool = False
    context_key: str | None = None


class MedicalValueCreate(BaseModel):
    medical_value_template_id: int | None = None
    datatype_id: int | None = None
    name: str = ""
    pos: int = 0
    value: str = ""
    value_input: str = ""
    unit_input_ucum: str | None = None
    value_canonical: str = ""
    unit_canonical_ucum: str | None = None
    normalization_status: str = "UNSPECIFIED"
    normalization_error: str = ""
    renew_date: date | None = None
    medical_value_group_id: int | None = None
    medical_value_group_instance_id: int | None = None
    organ_id: int | None = None
    is_donor_context: bool = False
    context_key: str | None = None


class MedicalValueUpdate(BaseModel):
    medical_value_template_id: int | None = None
    datatype_id: int | None = None
    name: str | None = None
    pos: int | None = None
    value: str | None = None
    value_input: str | None = None
    unit_input_ucum: str | None = None
    value_canonical: str | None = None
    unit_canonical_ucum: str | None = None
    normalization_status: str | None = None
    normalization_error: str | None = None
    renew_date: date | None = None
    medical_value_group_id: int | None = None
    medical_value_group_instance_id: int | None = None
    organ_id: int | None = None
    is_donor_context: bool | None = None
    context_key: str | None = None


class MedicalValueResponse(MedicalValueBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medical_value_template: MedicalValueTemplateResponse | None = None
    medical_value_group_template: MedicalValueGroupTemplateResponse | None = None
    medical_value_group: MedicalValueGroupResponse | None = None
    datatype: CodeResponse | None = None
    changed_by_id: int | None = None
    changed_by_user: UserResponse | None = None
    created_by_id: int | None = None
    created_by_user: UserResponse | None = None
    created_at: datetime
    changed_at: datetime | None = None
    updated_at: datetime | None = None
