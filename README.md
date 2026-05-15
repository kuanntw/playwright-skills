# Playwright Read-Only Skill Template

A reusable, **read-only first** Playwright testing template for cross-project regression safety.

## Goals
- Verify critical user journeys without mutating system state.
- Catch regressions early when changing unrelated modules ("fix A, break B").
- Standardize a shared test shape across projects via adapters.

## Structure
- `skills/readonly-core/`: shared safety guards, fixtures, assertions, and reporting.
- `skills/readonly-adapters/template/`: per-project override points (baseURL, routes, selectors).
- `tests/readonly/`: smoke/read-model/contract test layers.
- `playwright.readonly.config.ts`: shared runtime defaults (`workers=3`, trace/video/report output).
- `scripts/readonly-housekeeping.mjs`: retention cleanup (default: 7 days).

## Quick start
1. Copy `skills/readonly-adapters/template` to `skills/readonly-adapters/<project-name>`.
2. Update adapter config (baseURL, login, routes, selector map).
3. Install dependencies and browsers:

```bash
npm ci
npx playwright install --with-deps
```

4. One-command run (includes housekeeping first):

```bash
npm run readonly:run
```

`readonly:run` uses a Node-based runner so command chaining works consistently on both Windows and Linux shells.

## Fast scripts
- `npm run readonly:test` - run all readonly tests.
- `npm run readonly:test:smoke` - smoke layer only.
- `npm run readonly:test:read-model` - read-model layer only.
- `npm run readonly:test:contract` - contract layer only.
- `npm run readonly:report` - open HTML report.
- `npm run readonly:housekeeping` - remove old artifacts.
- `npm run readonly:finalize-report` - aggregate page performance metrics into markdown/json summary.

## Runtime defaults
- Concurrent workers: **3**.
- Trace: **on** for all tests.
- Video: **on** for all tests.
- Reporters: list + HTML + JSON.

> Trace Viewer includes a full event timeline (network/actions/DOM snapshots), and videos are stored in Playwright output artifacts.

## Performance breakdown in report
- `artifacts/readonly-report/perf-summary.md` lists the slowest pages in two distinct categories:
  1) **Slowest First Response (TTFB)**: backend/network first-byte latency.
  2) **Slowest Overall Render (domComplete)**: end-to-end client render completion latency.
- Raw per-page samples are stored in `perf-metrics.json` (and `perf-metrics.ndjson` as collection source).

## Housekeeping policy
- Default retention: **7 days** for `artifacts/readonly-output` and `artifacts/readonly-report`.
- Override with `READONLY_RETENTION_DAYS=<n>` when needed.

## Read-only policy
- Allowed HTTP methods: `GET`, `HEAD`.
- Blocked by default: `POST`, `PUT`, `PATCH`, `DELETE`.
- Any blocked write attempt fails the test and is included in metrics output.
