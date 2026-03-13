# Patient Interface Explanation

This directory defines an external **patient-centric read interface** based on the CDP-style OpenAPI contract in `oas/cdp-sys-api.yaml`.

## Purpose

The interface provides a standardized clinical view of a patient and related resources (conditions, procedures, care plans, medications, adverse events), independent of internal application models.

It is a **contract-first boundary**:
- external clients depend on this contract
- internal service/data model can evolve behind adapters

## Main Endpoint Groups

- `GET /patients/{patientId}`
  - returns demographic/admin patient resource
- `GET /patients/{patientId}/chronology`
  - returns mixed timeline resources (`Resource[]`) ordered by relevant timestamps
- `GET /patients/{patientId}/conditions`
- `GET /patients/{patientId}/conditions/{conditionId}`
- `GET /patients/{patientId}/procedures`
- `GET /patients/{patientId}/procedures/{procedureId}`
- `GET /patients/{patientId}/care-plans`
- `GET /patients/{patientId}/care-plans/{carePlanId}`
- `GET /patients/{patientId}/medication-administrations`
- `GET /patients/{patientId}/medication-administrations/{medicationAdministrationId}`
- `GET /patients/{patientId}/adverse-events`

## Identifier Model

The contract uses `GlobalIdentifier` string IDs such as:
- `pat_*` (patient)
- `cnd_*` (condition)
- `pro_*` (procedure)
- `cpln_*` (care plan)
- `med_*` (medication administration)

These IDs are part of the external contract and should not expose internal DB IDs directly.

## Query Semantics

Common date filters:
- `dateFrom` (inclusive lower bound)
- `dateTo` (inclusive upper bound)

These filters are applied per resource context (for example onset/recorded date for conditions, procedure date-time for procedures).

## Error Model

The contract defines standard response codes:
- `400` bad request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `500` server error

Errors should be mapped consistently, even when internal exceptions differ.

## Mapping to Internal API (recommended)

Use an adapter layer between this interface and internal domain services:
- decode/encode `GlobalIdentifier`
- map internal models to contract DTOs
- assemble chronology from multiple resource sources
- normalize error handling to contract responses

Recommended internal service shape:
- `get_patient(patient_ref)`
- `list_conditions(patient_ref, date_from, date_to)`
- `get_condition(patient_ref, condition_ref)`
- `list_procedures(...)`
- `list_care_plans(...)`
- `list_medication_administrations(...)`
- `list_adverse_events(...)`
- `get_chronology(patient_ref, date_from, date_to)`

## Returned Values: Patient and Conditions

This section summarizes what values the current contract returns for the two core services.

### Patient Service

Endpoint:
- `GET /patients/{patientId}`

Internal mapping:
- `get_patient(patient_ref)`

Returned payload:
- single `Patient` resource object
- required contract-level resource fields:
  - `id` (`GlobalIdentifier`, typically `pat_*`)
  - `resourceType` = `Patient`
  - `resourceName`
- required patient field:
  - `ehrId` (internal EHR identifier string)
- common demographic/admin fields:
  - `ahvNumber`
  - `gender` (`male`, `female`, `other`)
  - `name`
  - `surname`
  - `birthdate` (`YYYY-MM-DD`)
  - `deceased` (`boolean`)
- nested patient-contact fields:
  - `addresses[]` with fields such as `country`, `city`, `state`, `postalCode`, `street`, `addressSupplement`
  - `communications[]` with:
    - `communicationType` (`phone`, `email`, `fax`, `pager`, `url`, `sms`, `other`)
    - `use` (`work`, `private`, `home`, `temp`, `old`, `holiday`, `mobile`, `other`)
    - `value`

### Conditions Service

Endpoints:
- `GET /patients/{patientId}/conditions`
- `GET /patients/{patientId}/conditions/{conditionId}`

Internal mapping:
- `list_conditions(patient_ref, date_from, date_to)`
- `get_condition(patient_ref, condition_ref)`

Returned payload:
- list endpoint: `Condition[]`
- by-id endpoint: single `Condition` resource object
- required contract-level resource fields:
  - `id` (`GlobalIdentifier`, typically `cnd_*`)
  - `resourceType` = `Condition`
  - `resourceName`
- required condition field:
  - `patientId`
- condition clinical fields:
  - `clinicalStatus` (`active`, `recurrence`, `relapse`, `inactive`, `remission`, `resolved`)
  - `verificationStatus` (`active`, `deleted`, `partial`, `completed`, `provisional`, `formal-complete`, `content-complete`)
  - `diagnosis`
  - `notes`
  - `classifications[]` (`Coding`: `system`, `code`, `display`, optional `version`)
  - `severity` (`severe`, `moderate`, `mild`)
  - `bodySites[]` (`Coding`)
  - `stagings[]` (`Coding`)
  - `onsetDate`
  - `abatementDate`
  - `recordedDate`
- condition references:
  - `encounterId`
  - `clinicalCaseId`
  - `recordingPractitionerId`
  - `assertingPractitionerId`

Condition list filter parameters:
- `dateFrom` (inclusive lower bound)
- `dateTo` (inclusive upper bound)

## Non-Goals

This interface spec does not prescribe:
- internal table structure
- ORM relationships
- transaction strategy
- storage-level optimization choices

Those remain implementation concerns behind the interface boundary.
