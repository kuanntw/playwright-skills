import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import checkImports from './check-readonly-imports.mjs';

const original = process.cwd();
const dir = await mkdtemp(path.join(os.tmpdir(), 'readonly-imports-'));
try {
  process.chdir(dir);
  await mkdir('tests/readonly', { recursive: true });
  const fixture = "import { test, expect } from '../../skills/readonly-core/fixtures/readOnlyFixture';";
  await writeFile('tests/readonly/good.spec.ts', fixture);
  await checkImports();
  await writeFile('tests/readonly/bad.test.tsx', "import { test } from '@playwright/test';");
  await assert.rejects(checkImports(), /must import the shared readOnlyFixture/);
  await writeFile('tests/readonly/bad.test.tsx', fixture + "\nconst raw = require('playwright/test');");
  await assert.rejects(checkImports(), /must import the shared readOnlyFixture/);
  console.log('Fixture import gate: valid import accepted, raw imports rejected for spec/test files.');
} finally {
  process.chdir(original);
  await rm(dir, { recursive: true, force: true });
}
