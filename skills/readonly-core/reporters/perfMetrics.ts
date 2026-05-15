import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';

export type PagePerfMetric = {
  testTitle: string;
  url: string;
  ttfbMs: number | null;
  domContentLoadedMs: number | null;
  loadMs: number | null;
  overallRenderMs: number | null;
  capturedAt: string;
};

const PERF_DIR = 'artifacts/readonly-report';
const PERF_NDJSON = path.join(PERF_DIR, 'perf-metrics.ndjson');
const PERF_JSON = path.join(PERF_DIR, 'perf-metrics.json');
const PERF_MD = path.join(PERF_DIR, 'perf-summary.md');

export async function capturePagePerf(page: Page, testInfo: TestInfo, url: string): Promise<PagePerfMetric> {
  const nav = page.mainFrame().navigationResponse();
  let ttfbMs: number | null = null;

  if (nav) {
    const timing = nav.timing();
    if (typeof timing?.responseStart === 'number' && timing.responseStart >= 0) {
      ttfbMs = timing.responseStart;
    }
  }

  const perf = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (!entry) {
      return { domContentLoadedMs: null, loadMs: null, overallRenderMs: null };
    }

    const domContentLoadedMs = entry.domContentLoadedEventEnd > 0 ? entry.domContentLoadedEventEnd : null;
    const loadMs = entry.loadEventEnd > 0 ? entry.loadEventEnd : null;
    const overallRenderMs = entry.domComplete > 0 ? entry.domComplete : null;

    return { domContentLoadedMs, loadMs, overallRenderMs };
  });

  return {
    testTitle: testInfo.title,
    url,
    ttfbMs,
    ...perf,
    capturedAt: new Date().toISOString(),
  };
}

export async function appendPerfMetric(metric: PagePerfMetric): Promise<void> {
  await fs.mkdir(PERF_DIR, { recursive: true });
  await fs.appendFile(PERF_NDJSON, `${JSON.stringify(metric)}\n`);
}

export async function finalizePerfSummary(): Promise<void> {
  await fs.mkdir(PERF_DIR, { recursive: true });
  let metrics: PagePerfMetric[] = [];
  try {
    const raw = await fs.readFile(PERF_NDJSON, 'utf8');
    metrics = raw.split('\n').filter(Boolean).map((line) => JSON.parse(line) as PagePerfMetric);
  } catch {
    metrics = [];
  }
  await fs.writeFile(PERF_JSON, JSON.stringify(metrics, null, 2));
  await fs.writeFile(PERF_MD, buildPerfSummary(metrics));
}

function sortSlow(metrics: PagePerfMetric[], selector: (m: PagePerfMetric) => number | null) {
  return metrics
    .filter((m) => selector(m) !== null)
    .sort((a, b) => (selector(b) as number) - (selector(a) as number))
    .slice(0, 10);
}

function buildPerfSummary(metrics: PagePerfMetric[]): string {
  const slowTtfb = sortSlow(metrics, (m) => m.ttfbMs);
  const slowRender = sortSlow(metrics, (m) => m.overallRenderMs);

  const lines: string[] = [];
  lines.push('# Readonly Performance Summary');
  lines.push('');
  lines.push('## Slowest First Response (TTFB)');
  lines.push('');
  lines.push('| URL | Test | TTFB(ms) |');
  lines.push('|---|---|---:|');
  for (const m of slowTtfb) lines.push(`| ${m.url} | ${m.testTitle} | ${m.ttfbMs} |`);
  lines.push('');
  lines.push('## Slowest Overall Render (domComplete)');
  lines.push('');
  lines.push('| URL | Test | Render(ms) | DOMContentLoaded(ms) | Load(ms) |');
  lines.push('|---|---|---:|---:|---:|');
  for (const m of slowRender) lines.push(`| ${m.url} | ${m.testTitle} | ${m.overallRenderMs} | ${m.domContentLoadedMs} | ${m.loadMs} |`);
  lines.push('');
  lines.push(`Total samples: ${metrics.length}`);
  return lines.join('\n');
}
