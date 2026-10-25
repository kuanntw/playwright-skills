import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { startMockServer } from '../tests/support/mockServer.mjs';

const { server, hits, baseURL } = await startMockServer();
try {
  await rm('artifacts/readonly-report/perf-summary.md', { force: true });
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/readonly-runner.mjs', 'playwright.guard.config.ts'], {
      stdio: 'inherit', env: { ...process.env, READONLY_GUARD_BASE_URL: baseURL },
    });
    child.once('error', reject); child.once('exit', resolve);
  });
  assert.equal(code, 1, 'negative fixture cases must fail the Playwright run');
  assert((await readFile('artifacts/readonly-report/perf-summary.md', 'utf8')).startsWith('# Readonly Performance Summary'), 'failed runs must still finalize their summary');
  const raw = await readFile('artifacts/guard-results.json', 'utf8');
  const report = JSON.parse(raw);
  assert.deepEqual(report.errors, [], 'no global runner errors');
  const specs = [];
  function walk(suite) {
    specs.push(...(suite.specs || []));
    for (const child of suite.suites || []) walk(child);
  }
  for (const suite of report.suites) walk(suite);
  assert.equal(specs.length, 38, 'all positive and negative regression cases ran');
  let blocked = 0;
  for (const spec of specs) {
    const results = spec.tests.flatMap((test) => test.results);
    assert.equal(results.length, 1, `${spec.title}: no retries or skipped cases`);
    const result = results[0];
    assert(result.attachments.some((a) => a.name === 'body-completed'), `${spec.title}: test body must complete`);
    if (spec.title.startsWith('allowed:') || (spec.title.startsWith('conditional:') && result.status === 'passed')) {
      assert.equal(result.status, 'passed', spec.title);
    }
    else {
      assert.equal(result.status, 'failed', spec.title);
      assert(result.errors.length > 0 && result.errors.every((e) => e.message.includes('Read-only policy violation(s) detected:')), `${spec.title}: must fail only the automatic guard teardown`);
      const attachment = result.attachments.find((a) => a.name === 'readonly-violations');
      assert(attachment, `${spec.title}: violation evidence must be attached`);
      const data = attachment.body ? Buffer.from(attachment.body, 'base64').toString() : await readFile(attachment.path, 'utf8');
      assert(JSON.parse(data).length > 0);
      assert(!data.includes('do-not-report'), 'query values must be redacted');
      blocked++;
    }
  }
  assert(hits.some((hit) => hit.method === 'GET'), 'GET must reach the backend');
  assert(hits.some((hit) => hit.method === 'HEAD'), 'HEAD must reach the backend');
  assert.deepEqual(hits.filter((hit) => !['GET', 'HEAD'].includes(hit.method)), [], 'no blocked request or WebSocket handshake may reach the backend');
  assert(!hits.some((hit) => hit.url.startsWith('/sw.js')), 'Service Worker script must not reach the backend');
  console.log(`Guard verified: ${specs.length} cases, ${blocked} automatic teardown failures, zero backend writes/WS handshakes.`);
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
