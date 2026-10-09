import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
const checks = JSON.parse(await readFile('/work/behavior-checks.json', 'utf8'));
const root = '/work/dist';
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!path.startsWith(root + '/')) throw new Error();
    const file = path === root + '/' ? root + '/index.html' : path;
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'");
    response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: '/usr/lib/chromium/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'], timeout: 10000 });
  const results = [];
  for (const check of checks) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(1500);
    await page.route('**/*', (route) => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    try {
      await page.goto(origin + '/index.html', { timeout: 5000 });
      for (const step of check.steps) {
        if (step.action === 'click') await page.getByRole('button', { name: step.text, exact: true }).click();
        else if (step.action === 'fill') await page.getByRole('textbox', { name: step.text, exact: true }).fill(step.value);
        else if (step.action === 'expectText') await page.getByText(step.text, { exact: true }).waitFor({ state: 'visible' });
        else throw new Error('Unsupported action');
      }
      results.push({ name: check.name, passed: true });
    } catch (error) {
      results.push({ name: check.name, passed: false, error: String(error.message).slice(0, 1500) });
    } finally { await context.close(); }
  }
  process.stdout.write('NEXYRAL_RESULT:' + JSON.stringify({ results }) + '\n');
  process.exitCode = results.every((result) => result.passed) ? 0 : 1;
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
