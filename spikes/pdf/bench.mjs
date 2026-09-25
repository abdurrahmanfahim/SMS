// spikes/pdf bench — reproduces the numbers cited in docs/research/pdf-spike.md.
// Run: pnpm --dir spikes/pdf run bench
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

console.log('=== Approach A (wkhtmltopdf substitute for Chromium) ===');
if (!sh('which wkhtmltopdf || true').trim()) {
  console.log('wkhtmltopdf not found on this machine — skipping.');
} else {
  try {
    const timeOut = execSync(
      '/usr/bin/time -v wkhtmltopdf --enable-local-file-access layouts/layout1-batch100.html /tmp/bench-batch100.pdf 2>&1',
      { cwd: new URL('.', import.meta.url) }
    ).toString();
    console.log(timeOut.split('\n').filter((l) => /Elapsed|Maximum resident|Percent of CPU/.test(l)).join('\n'));
  } catch (e) {
    console.log((e.stdout || e.stderr || '').toString());
  }
  if (existsSync('/tmp/bench-batch100.pdf')) {
    const kb = (statSync('/tmp/bench-batch100.pdf').size / 1024).toFixed(0);
    console.log(`Output file size: ${kb} KB for 100 pages (${(kb / 100).toFixed(1)} KB/page)`);
  }
}

console.log('\n=== Approach C (pdfkit) ===');
const start = Date.now();
execSync('node approach-c/render.mjs', { cwd: new URL('.', import.meta.url) });
console.log(`pdfkit stress-test render: ${Date.now() - start} ms`);

console.log('\n=== Approach B (Playwright/Chromium) ===');
console.log('SKIPPED: Chromium is not reachable in this environment (see docs/research/pdf-spike.md).');
