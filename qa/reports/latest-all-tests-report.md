# All Tests Report

- Started: `2026-03-16T15:58:56.128602+00:00`
- Finished: `2026-03-16T15:58:57.351924+00:00`
- Duration seconds: `1.223`
- Success: `True`

## Pipelines

- `specification` (`qa.spec_tools.run_conceptual_specs`): success=`True` exit_code=`0`
- `client_server` (`qa.spec_tools.run_client_server_specs`): success=`True` exit_code=`0`
- `server` (`qa.spec_tools.run_server_specs`): success=`True` exit_code=`0`

## Output Tails

### specification

```text
Architecture dependency check PASSED
- Rules applied: 7; file-rule checks: 209
Domain spec sync check PASSED
- Conceptual classes: 39
- Conceptual relations checked: 43
- Model classes discovered: 56
- Model relations discovered: 144
Report written: /Users/stephan/Workspace/AppSpace/TPLK-App/qa/reports/latest-conceptual-report.md
```

### client_server

```text
Report written: /Users/stephan/Workspace/AppSpace/TPLK-App/qa/reports/latest-client-server-spec-report.md

test_cases (qa.tests.generated.test_client_server_specs.GeneratedSpecTests.test_cases) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.015s

OK
```

### server

```text
Report written: /Users/stephan/Workspace/AppSpace/TPLK-App/qa/reports/latest-server-spec-report.md

test_cases (qa.tests.generated.test_server_specs.GeneratedSpecTests.test_cases) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.015s

OK
```
