import { promises as fs } from 'node:fs';
import path from 'node:path';

const RETENTION_DAYS = Number(process.env.READONLY_RETENTION_DAYS || 7);
const NOW = Date.now();
const MAX_AGE_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const TARGETS = ['artifacts/readonly-output', 'artifacts/readonly-report'];

async function rmOldEntries(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let removed = 0;

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const stats = await fs.stat(fullPath);
      if (NOW - stats.mtimeMs > MAX_AGE_MS) {
        await fs.rm(fullPath, { recursive: true, force: true });
        removed += 1;
      }
    }

    return removed;
  } catch (error) {
    if (error && error.code === 'ENOENT') return 0;
    throw error;
  }
}

(async () => {
  let totalRemoved = 0;

  for (const dir of TARGETS) {
    totalRemoved += await rmOldEntries(dir);
  }

  console.log(`[readonly-housekeeping] retention=${RETENTION_DAYS}d removed=${totalRemoved}`);
})();
