import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
    });

    child.on('error', reject);
  });
}

(async () => {
  await run('npm', ['run', 'readonly:housekeeping']);
  try {
    await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '-c', process.argv[2] || 'playwright.readonly.config.ts']);
  } finally {
    // Preserve the failing test status while still producing diagnostic artifacts.
    await run('npm', ['run', 'readonly:finalize-report']);
  }
})();
