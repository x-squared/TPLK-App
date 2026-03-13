# Interface Endpoint Template

Use this structure for each new interface endpoint family.

## File layout

- `dto.py`
  - Pydantic DTO contracts for internal typed representation.
- `mapper.py`
  - `from_api_*` mappers that validate and transform API JSON into DTOs.
- `provider.py`
  - `ProviderClient` abstraction.
  - `HttpProviderClient` for real upstream calls.
  - `MockFormProviderClient` for delayed/manual mock completion.
- `results.py`
  - `ReadyResult[T]` and `PendingResult`.
- `service.py`
  - orchestrates provider + mapper + result envelope.

## Runtime boundary

- Shared technical concerns (timeout/retry/circuit/telemetry) live in AppModules.
- Business DTOs and mapping stay in TPLK.

## Router mapping convention

- `ReadyResult` -> `200` with typed DTO payload.
- `PendingResult` -> `202` with operation metadata (`operation_id`, `operation_type`, `retry_after_seconds`).

## Mock lifecycle convention

1. First call can return `PendingResult`.
2. External/manual mock form fills payload for `operation_id`.
3. Follow-up call returns `ReadyResult` once payload is completed.
