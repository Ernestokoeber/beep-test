import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const upstream = createServer();
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
const staticPort = upstream.address().port;
await new Promise(resolve => upstream.close(resolve));
const child = spawn(process.execPath, ['scripts/static-server.mjs'], { env: { ...process.env, PORT: String(staticPort) }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); });
let release = 'old';
const server = createServer((req, res) => {
  const source = request({ hostname: '127.0.0.1', port: staticPort, path: req.url }, response => {
    if (req.url === '/sw.js' || req.url === '/js/app.js') {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        let body = Buffer.concat(chunks).toString();
        if (req.url === '/sw.js') body = body.replace(/courthub-v\d+/, `courthub-test-${release}`);
        else body += `\nwindow.__pwaRelease = ${JSON.stringify(release)};`;
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); res.end(body);
      });
    } else { res.writeHead(response.statusCode, response.headers); response.pipe(res); }
  });
  source.on('error', () => res.writeHead(502).end()); source.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [390, 320]) {
    release = 'old';
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
    await context.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/#/dashboard`);
    await page.waitForFunction(() => window.__pwaRelease === 'old' && !!navigator.serviceWorker.controller);
    await page.evaluate(() => localStorage.setItem('pwa-update-draft', 'unsent local entry'));
    release = 'new';
    // A resumed installed app has no new load event. pageshow must find the release.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForFunction(() => window.__pwaRelease === 'new', null, { timeout: 60000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('pwa-update-draft')), 'unsent local entry');
    assert.match(page.url(), /#\/dashboard$/);
    await context.setOffline(true); await page.reload();
    await page.waitForFunction(() => window.__pwaRelease === 'new');
    assert.equal(await page.evaluate(() => localStorage.getItem('pwa-update-draft')), 'unsent local entry');
    console.log(`${width}px: foreground update activated, route and local entry retained, new release available offline`);
    await context.close();
  }
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); child.kill(); }
