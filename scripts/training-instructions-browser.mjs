import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { detailedDescription } from './fixtures/training-description.mjs';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, options] of [['iPhone', devices['iPhone 15']], ['320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } }]]) {
    const context = await browser.newContext({ ...options, serviceWorkers: 'allow' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.BT?.trainingInstructions && navigator.serviceWorker.controller);
    const ids = await page.evaluate(long => {
      const titles = ['PnR Ballhandling & Reject-Fußarbeit', 'Closeout-Balance & Defensiv-Slides', 'Paint-Finishing & Floater-Touch', 'Spacing Catch-and-Shoot', 'Freiwurf-Präzision & Fokusroutine'];
      const drills = [{ name: 'Readiness-Check & Belastungsampel', minutes: 10 }, { name: 'Individuelle Aktivierung', minutes: 10 }, ...titles.map((title, index) => ({ name: `Station ${index + 1}: ${title}`, minutes: 15, description: 'Vorhandene Trainerhinweise', shotTargets: index === 2 ? [{ kind: 'field', category: 'Floater', attempted: 18 }] : index === 4 ? [{ kind: 'freethrow', category: 'Freiwürfe', attempted: 12 }] : [] })), { name: 'Cooldown & Session-RPE', minutes: 10 }];
      const today = BT.storage.upsertTraining({ date: '2026-10-09', attendance: [], shots: [], freethrows: [], plan: { drills }, stationTraining: { stations: titles.map((title, index) => ({ title, description: drills[index + 2].description, minutes: 15, shotTargets: drills[index + 2].shotTargets })), players: {} } });
      const future = BT.storage.upsertTraining({ date: '2026-10-13', attendance: [], plan: { drills: [{ name: 'Ausführliche Übung', minutes: 15, description: long }] } });
      return { today: today.id, future: future.id };
    }, detailedDescription('Technik prüfen. '.repeat(130)));
    await page.evaluate(id => { location.hash = '#/training/' + id; }, ids.today);
    const preview = page.locator('[data-role="training-plan-preview"]');
    await preview.waitFor();
    await preview.locator('details').first().locator('summary').click();
    assert.match(await preview.innerText(), /Korb A/);
    assert.match(await preview.innerText(), /Korb B/);
    await page.locator('[data-action="training-live"]').click();
    await page.locator('.training-live-progress-step').nth(2).click();
    assert.equal(await page.locator('[data-live="block-name"]').innerText(), 'Stationsrunde 1 von 5');
    const stations = page.locator('[data-live="station-instructions"] details');
    assert.equal(await stations.count(), 5);
    await stations.nth(2).locator('summary').click();
    assert.match(await stations.nth(2).innerText(), /Floater: 18 Versuche/);
    assert.match(await stations.nth(2).innerText(), /Minute 1–8/);
    assert.match(await stations.nth(2).innerText(), /Minute 8–15/);
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.training-live-main')].every(node => node.scrollWidth <= node.clientWidth + 1)), name + ': instructions overflow horizontally');
    await noOverflow();
    await page.getByRole('button', { name: 'Training Live schließen', exact: true }).click();
    await page.evaluate(id => { location.hash = '#/training/' + id; }, ids.future);
    await page.waitForFunction(() => document.querySelector('[data-role="training-plan-preview"]')?.textContent.includes('Ausführliche Übung'));
    await page.locator('[data-role="training-plan-preview"] details summary').click();
    assert.match(await page.locator('[data-role="training-plan-preview"]').innerText(), /ENDE DER ANLEITUNG/);
    await context.setOffline(true);
    await page.reload();
    await page.locator('[data-action="training-live"]').click();
    await page.locator('[data-live="instructions-card"] summary').click();
    assert.match(await page.locator('[data-live="instructions"]').innerText(), /ENDE DER ANLEITUNG/);
    await noOverflow();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Trainingsanleitungen Browser: ${name}, heutige Korbteilung, fünf Stationsrunden, vollständiger Zukunftsplan, Offline-Reload und mobile Breite geprüft`);
  }
} finally { await browser.close(); }
