import { promises as fs } from 'node:fs';
import path from 'node:path';

const PERF_DIR = 'artifacts/readonly-report';
const PERF_NDJSON = path.join(PERF_DIR, 'perf-metrics.ndjson');
const PERF_JSON = path.join(PERF_DIR, 'perf-metrics.json');
const PERF_MD = path.join(PERF_DIR, 'perf-summary.md');

const sortSlow = (metrics, key) => metrics.filter((m) => m[key] != null).sort((a, b) => b[key] - a[key]).slice(0, 10);

function buildSummary(metrics) {
  const slowTtfb = sortSlow(metrics, 'ttfbMs');
  const slowRender = sortSlow(metrics, 'overallRenderMs');
  const lines = [
    '# Readonly Performance Summary',
    '',
    '## Slowest First Response (TTFB)',
    '',
    '| URL | Test | TTFB(ms) |',
    '|---|---|---:|',
    ...slowTtfb.map((m) => `| ${m.url} | ${m.testTitle} | ${m.ttfbMs} |`),
    '',
    '## Slowest Overall Render (domComplete)',
    '',
    '| URL | Test | Render(ms) | DOMContentLoaded(ms) | Load(ms) |',
    '|---|---|---:|---:|---:|',
    ...slowRender.map((m) => `| ${m.url} | ${m.testTitle} | ${m.overallRenderMs} | ${m.domContentLoadedMs} | ${m.loadMs} |`),
    '',
    `Total samples: ${metrics.length}`,
  ];
  return lines.join('\n');
}

await fs.mkdir(PERF_DIR, { recursive: true });
let metrics = [];
try {
  const raw = await fs.readFile(PERF_NDJSON, 'utf8');
  metrics = raw.split('\n').filter(Boolean).map((line) => JSON.parse(line));
} catch {
  metrics = [];
}
await fs.writeFile(PERF_JSON, JSON.stringify(metrics, null, 2));
await fs.writeFile(PERF_MD, buildSummary(metrics));
console.log('[readonly-report] performance summary generated');
