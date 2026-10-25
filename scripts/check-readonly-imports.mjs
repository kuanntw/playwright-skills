import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// A regression gate, not a JavaScript sandbox. Keep all readonly specs on the
// shared fixture; code review must reject independent networking/route overrides.
export default async function checkReadOnlyImports() {
  async function check(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await check(file);
      else if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(entry.name)) {
        const source = await readFile(file, 'utf8');
        if (!/from\s+['"][^'"]*readonly-core\/fixtures\/readOnlyFixture['"]/.test(source)
          || /from\s+['"](?:@playwright\/test|playwright(?:-core)?(?:\/test)?)['"]/.test(source)
          || /(?:require|import)\s*\(\s*['"](?:@playwright\/test|playwright(?:-core)?(?:\/test)?)['"]/.test(source)) {
          throw new Error(`${file}: readonly specs must import the shared readOnlyFixture, not a raw Playwright test`);
        }
      }
    }
  }
  await check(path.resolve('tests/readonly'));
}
