import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, ...(process.env.E2E_BROWSER_PATH ? { executablePath: process.env.E2E_BROWSER_PATH } : {}) });
try {
  for (const [name, options] of [['iPhone', devices['iPhone 15']], ['320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } }]]) {
    const context = await browser.newContext({ ...options, timezoneId: 'Europe/Berlin', locale: 'de-DE', serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const check = async label => {
      const sizes = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth, document.body.scrollWidth]);
      assert(Math.max(sizes[1], sizes[2]) <= sizes[0] + 1, `${name}: ${label} overflow ${sizes}`);
      assert.deepEqual(errors, [], `${name}: Browserfehler`);
    };
    try {
      await page.goto(baseUrl + '/#/jerseys');
      await page.locator('.jerseys-view').waitFor();
      const ids = await page.evaluate(() => ['Adam Testspieler', 'Boris Testspieler', 'Carlo Testspieler'].map(name => window.BT.storage.upsertPlayer({ name }).id));
      await page.reload();
      // The route must also be discoverable from the mobile menu.
      await page.locator('[data-role="hamburger"]').tap();
      await page.locator('[data-nav="jerseys"]').tap();
      await page.locator('[data-kit="home"] [data-action="new"]').tap();
      await page.getByLabel('Spieler', { exact: true }).selectOption(ids[0]);
      await page.getByLabel('Notiz (optional)', { exact: true }).fill('Beim nächsten Training mitbringen');
      await check('Mitnahmeformular');
      await page.getByRole('button', { name: 'Speichern', exact: true }).tap();
      await page.locator('[data-kit="home"]').filter({ hasText: 'Bei Adam Testspieler' }).waitFor();
      await page.locator('[data-kit="away"] [data-action="new"]').tap();
      await page.getByLabel('Spieler', { exact: true }).selectOption(ids[1]);
      await page.getByRole('button', { name: 'Speichern', exact: true }).tap();
      await page.locator('[data-kit="away"]').filter({ hasText: 'Bei Boris Testspieler' }).waitFor();
      await check('Beide Sätze unterwegs');
      await page.locator('[data-role="jersey-never"]').check();
      assert.equal(await page.locator('.jersey-player-row').count(), 1);
      assert.equal(await page.locator('.jersey-player-row').getAttribute('data-player-id'), ids[2]);
      await page.reload();
      await page.locator('[data-kit="home"]').filter({ hasText: 'Bei Adam Testspieler' }).waitFor();
      await page.locator('[data-kit="home"] [data-action="return"]').tap();
      await page.locator('[data-kit="home"]').filter({ hasText: 'Sauber zurückgegeben' }).waitFor();
      await page.locator('[data-kit="home"] [data-action="new"]').tap();
      await page.getByLabel('Spieler', { exact: true }).selectOption(ids[2]);
      await page.getByRole('button', { name: 'Speichern', exact: true }).tap();
      await page.locator('details.jersey-panel > summary').tap();
      assert.equal(await page.locator('.jersey-history-row').count(), 3);
      const returned = page.locator('.jersey-history-row').filter({ hasText: 'Adam Testspieler' });
      await returned.locator('[data-action="edit"]').tap();
      await page.getByLabel('Notiz (optional)', { exact: true }).fill('Sauber zurückgebracht');
      await check('Verlauf bearbeiten');
      await page.getByRole('button', { name: 'Speichern', exact: true }).tap();
      await page.reload();
      await page.locator('[data-kit="home"]').filter({ hasText: 'Bei Carlo Testspieler' }).waitFor();
      assert.equal(await page.evaluate(id => window.BT.storage.getJerseyDuties().filter(duty => duty.playerId === id).length, ids[0]), 1, 'Eine Rückgabe zählt nicht doppelt.');
      await page.locator('details.jersey-panel > summary').tap();
      await page.locator('.jersey-history-row').filter({ hasText: 'Sauber zurückgebracht' }).waitFor();
      await check('Reload und Verlauf');
      if (name === '320 px' && process.env.E2E_JERSEY_SCREENSHOT) await page.screenshot({ path: process.env.E2E_JERSEY_SCREENSHOT, fullPage: true });
      console.log(`CourtHub Trikot-Browserabnahme erfolgreich: ${name}, Heim/Auswärts, Mitnahme, Rückgabe, Verteilung, Verlauf und Reload.`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
