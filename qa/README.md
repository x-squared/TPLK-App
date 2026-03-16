# Specification QA Workflow

This folder defines the workflow:

1. Write human-readable specs as Markdown in `spec/`
2. Generate executable tests from those specs
3. Run tests and create a report with suggestion actions
4. Execute suggestion actions and rerun

## Folder Layout

- `spec/testing/server/` - server-only specification documents (`.md`)
- `spec/testing/client-server/` - client-server-wide specification documents (`.md`)
- `spec/requirements/` - business requirement specifications (`.md`)
- `qa/spec_tools/` - parser, generator, runner, suggestion executor
- `qa/tests/generated/` - generated executable test code
- `qa/reports/` - run reports with suggestion list
- `frontend/test/` - executable Playwright scenario tests

## Specification Block Format

Use fenced blocks with `spec-case` and JSON content.

```md
```spec-case
{
  "id": "server-health-ok",
  "scope": "server",
  "name": "Health endpoint returns OK status",
  "request": { "method": "GET", "path": "/api/health" },
  "expect": { "status": 200, "json_subset": { "status": "ok" } }
}
```
```

Supported scopes:

- `server`
- `client_server`

Expect fields:

- `status` (number)
- `json_subset` (object, optional)
- `body_contains` (list of strings, optional)

Optional scenario extensions for browser + DB flows in `client_server` specs:

- `ui_flow` (object, optional), currently supports:
  - `login_ext_id` (string)
  - `open_recipients_view` (boolean)
  - `create_patient` object with `pid_prefix`, `first_name`, `name`, `date_of_birth`
- `verify` (object, optional), currently supports:
  - `ui_contains_created_pid` (boolean)
  - `database_contains_created_patient` (boolean)

## Commands

From repository root:

```bash
python -m qa.spec_tools.generate_tests
python -m qa.spec_tools.run_specs
python -m qa.spec_tools.run_suggestions --report qa/reports/latest-spec-report.md
python -m qa.spec_tools.run_partner_specs
python -m qa.spec_tools.run_suggestions --report qa/reports/latest-partner-report.md
```

## Notes

- This workflow is intentionally text-first: specs are source of truth, tests are generated.
- When you ask the assistant to create a new test specification file, it should be added under `spec/testing/server/` or `spec/testing/client-server/` following this format.
- Partner flow (`run_partner_specs`) runs Playwright UI actions plus direct DB verification for scenario-style tests.
