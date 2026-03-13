# Interface Features

This package contains thin adapters for external interfaces.

- Technical sync-call scaffolding is sourced from `AppModules` runtime modules.
- Domain mapping and contract-specific handling remain in `TPLK-App`.
- `patients_client/` follows the internal pattern:
  - `dto.py` (typed contracts)
  - `mapper.py` (API JSON -> DTO mapping)
  - `provider.py` (real HTTP and delayed mock providers)
  - `service.py` (`ReadyResult` / `PendingResult` orchestration)
