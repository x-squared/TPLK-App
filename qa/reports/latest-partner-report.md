# Partner Spec Report

- Generated at: `2026-03-04 08:19:24`
- Playwright exit code: `1`
- Created PID: `n/a`
- DB verification: `failed`

## Suggestion List

- `FIX_UI_AUTOMATION`: **Review Playwright failure and selectors** - Inspect failing step in `frontend/test/create-patient-from-recipients.spec.ts` and adapt selectors/flow.

## Test Output Excerpt

```text

> frontend@0.0.0 test:spec-e2e
> playwright test -c playwright.spec.config.ts


Running 1 test using 1 worker





[1A[2K[1/1] test/create-patient-from-recipients.spec.ts:9:1 › create patient from recipients view
[1A[2K  1) test/create-patient-from-recipients.spec.ts:9:1 › create patient from recipients view ─────────

    Error: browserType.launch: Executable doesn't exist at /var/folders/_7/l4zkd_ys6gn_693h7v7frtrc0000gn/T/cursor-sandbox-cache/a2fe6dad3e52e63196cf6a673e241473/playwright/firefox-1509/firefox/Nightly.app/Contents/MacOS/firefox
    ╔═════════════════════════════════════════════════════════════════════════╗
    ║ Looks like Playwright Test or Playwright was just installed or updated. ║
    ║ Please run the following command to download new browsers:              ║
    ║                                                                         ║
    ║     npx playwright install                                              ║
    ║                                                                         ║
    ║ <3 Playwright Team                                                      ║
    ╚═════════════════════════════════════════════════════════════════════════╝


[1A[2K  1 failed
    test/create-patient-from-recipients.spec.ts:9:1 › create patient from recipients view ──────────

npm warn Unknown env config "devdir". This will stop working in the next major version of npm.
[1A[2K(node:36717) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
[1A[2K(node:36717) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
```

## Execute Suggestions

```bash
cd /path/to/TPL-App
python -m qa.spec_tools.run_suggestions --report qa/reports/latest-partner-report.md
```