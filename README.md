# Playwright Read-Only Skill Template

A reusable, **read-only first** Playwright template for regression checks. The shared fixture blocks supported non-GET/HEAD HTTP requests before they reach the server, records attempted violations, and fails automatic teardown even when a test catches the request error.

**This is an accidental-write guard, not a network sandbox or proof that an application cannot mutate state. GET/HEAD endpoints can still change server state. Use an authorized disposable environment and least-privilege, read-only credentials.**

## Structure
- `skills/readonly-core/`: shared guards, automatic fixture, assertions and performance reporting.
- `skills/readonly-adapters/template/`: project baseURL, routes and selectors.
- `tests/readonly/`: smoke, read-model and HTML-response contract layers.
- `tests/guard-cases/`: deliberately failing negative cases, verified by a separate harness.
- `tests/support/mockServer.mjs`: isolated loopback server and server-side request counters.
- `playwright.readonly.config.ts`: adapter runtime, 3 workers, trace/video/report output.
- `playwright.mock.config.ts`: self-contained template acceptance run, without a live service.

## Quick start
Requires Node.js 20 or newer. Install the committed lockfile and Chromium:

```bash
npm ci
npx playwright install --with-deps chromium
npm test
```

`npm test` type-checks the code, verifies the guard against a loopback mock backend, and runs all four template tests against a local mock app. The guard harness intentionally launches failing Playwright cases, then checks their precise teardown failures, violation attachments and **zero backend writes/WebSocket upgrades**. The harness itself must exit successfully. A caught error alone is not accepted as proof of prevention.

For an authorized project:
1. Edit `skills/readonly-adapters/template/config.ts`. If copying the adapter, update the adapter imports in the config and specs too.
2. Adapt the list contract to the actual status, media type and response shape. The template's `/items` route is HTML, not a JSON API.
3. Use pre-provisioned read-only authentication where required. Do not add login writes or broaden methods to make the tests pass.
4. Start the target application yourself, then run `npm run readonly:run`. The project command does not start a server and is **not** an authorization to contact production.

Every readonly spec must import `test` and `expect` from the shared fixture, not `@playwright/test`:

```ts
import { test, expect } from '../../../skills/readonly-core/fixtures/readOnlyFixture';
```

The config's global setup rejects missing fixture imports and direct raw Playwright imports in `.spec`/`.test` files. This source check catches common mistakes, not obfuscated imports or malicious code. Review helpers and fixtures too.

## Fast scripts
- `npm test`: all local acceptance checks.
- `npm run typecheck`: TypeScript API/type verification.
- `npm run test:guards`: isolated safety regressions and backend counter proof.
- `npm run test:template`: smoke/read-model/contract against the bundled mock app.
- `npm run readonly:run`: housekeeping, project tests, final summary even after a failed test run.
- `npm run readonly:test`: project tests only.
- `npm run readonly:test:smoke`, `readonly:test:read-model`, `readonly:test:contract`: individual layers.
- `npm run readonly:report`: open the HTML report.
- `npm run readonly:housekeeping`: remove artifacts older than 7 days (override with `READONLY_RETENTION_DAYS`).
- `npm run readonly:finalize-report`: aggregate the current performance samples.

## Enforcement and boundaries
- Allow only `GET` and `HEAD`; abort all other HTTP methods, including `OPTIONS`. Apps that require write-based analytics, GraphQL POST queries or CORS preflights fail rather than silently widening the policy.
- Install routing on the **BrowserContext before page creation**, covering ordinary pages, frames and popup initial navigations.
- Block Service Worker registration. An explicit `serviceWorkers: 'allow'` override is rejected.
- Separately guard the standalone `request` fixture and the shared `context.request`/`page.request` APIRequestContext object. Browser routing alone does not cover these.
- Reject page/frame WebSockets without connecting to the upstream server. **Worker-created WebSockets are not reliably intercepted by Playwright** and are unsupported.
- Keep guards installed throughout fixture teardown, stop browser network traffic before shutdown, and drain pending blocked routes before closing. Violation collection/assertion is automatic and runs after the dependent fixtures.
- Manual `context.close()` also uses the offline/drain barrier. Manual `page.close()` is rejected and recorded as a violation because Playwright can stop routing before a page closes; let fixture teardown close popups/pages, or close the entire guarded context. App-driven self-close (`window.close()`) is also outside the supported lifecycle; do not use or test self-closing pages with this fixture.
- Only violation URL credentials, query values and fragments are redacted. Paths/test titles can still contain sensitive data. Traces, video, screenshots, performance URLs and ordinary test logs are **not sanitized**. Do not capture or upload secrets/real account data.

Unsupported bypass surfaces must not be used in readonly specs or their helpers: independent browser/API contexts, raw Node HTTP/fetch, route overrides (`page.route`, later context routes, `route.fetch`, HAR routing or unroute), CDP, worker sockets, WebTransport and WebRTC. The template does not constrain arbitrary test code or host networking. Normal HTTP redirects retain GET/HEAD, but this is not per-hop destination or origin enforcement. A `safeClick` helper is only a heuristic and cannot establish that a click or GET is harmless.

For a stronger guarantee, combine reviewed read-only endpoints and least privilege with an independently enforced test-environment/network policy. Do not infer safety on a live service from these mock tests.

## Reports and CI
- List, HTML and JSON reporters; trace/video on; screenshots on failure.
- `artifacts/readonly-report/perf-summary.md` separates navigation-start-to-first-byte (TTFB) from `domComplete` timing. Measurements use the standard browser Navigation Timing API, not a nonexistent Playwright navigation-response API.
- Raw samples live in `artifacts/readonly-output/perf-metrics.ndjson`, outside the HTML reporter directory so report generation cannot erase them. Final JSON and Markdown summaries live in `artifacts/readonly-report`.
- Template Playwright output is cleared at the start of a new run; retention cleanup is not a run archive. Copy artifacts securely if a prior run must be retained.
- CI runs only local mock services with the committed dependency lockfile and uploads `artifacts/` even on failure, retained for 7 days. CI does not validate any real user application.

## References
- [Playwright context routing and Service Worker caveat](https://playwright.dev/docs/api/class-browsercontext#browser-context-route)
- [Automatic fixtures and execution order](https://playwright.dev/docs/test-fixtures#execution-order)
- [APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)
- [WebSocket routing](https://playwright.dev/docs/api/class-websocketroute)
- [Worker-created WebSocket limitation](https://github.com/microsoft/playwright/issues/37048)

## Revision History

### 2026-10-25
- Replaced request-only observation with context-level aborts, API request guards, blocked Service Workers and page/frame WebSockets, automatic teardown failures and violation attachments.
- Migrated every template layer to the shared fixture; added a fixture-import gate and loopback backend-counter regressions for writes, popups, frames, aliases, beacons and shutdown.
- Added a reproducible lockfile and TypeScript checking. Pinned Playwright 1.55.1, the minimum fixed version for [GHSA-7mvr-c777-76hp](https://github.com/advisories/GHSA-7mvr-c777-76hp), rather than a major upgrade.
- Fixed the unsupported performance API and the contract's false-positive `< 500` status check; preserved performance samples and failed-run CI artifacts.
- Validation on 2026-10-25: `npm ci --ignore-scripts`, TypeScript and fixture-import checks passed. `npm test` passed with pinned Chromium: 38 safety/contract cases verified (28 expected automatic teardown failures, zero backend writes/WebSocket handshakes), all 4 template tests passed, and 3 performance samples survived report generation. The harness also verified failed-run summary generation; `npm audit` reported 0 vulnerabilities. These are local mock results, not live-service or cross-browser validation. Worker sockets, arbitrary Node networking and mutation-capable GET/HEAD endpoints remain outside the guarantee.
