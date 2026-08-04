import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BT?.tactics?.__core && window.BT?.storage && window.BT?.sync);
  await page.evaluate(() => {
    const originalState = window.BT.sync.getState.bind(window.BT.sync);
    window.BT.sync.getState = () => ({
      ...originalState(),
      user: { id: 'probe', displayName: 'Probe', role: 'admin', teamId: 'probe' }
    });
    window.BT.storage.setSetting('tacticsEditorMode', 'quick');
    window.BT.storage.setSetting('tacticsBoardDraft', window.BT.tactics.__core.defaultBoard());
    location.hash = '#/tactics';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await page.waitForSelector('[data-role="tactics-quick"]');
  await page.waitForSelector('[data-element-id="o1"] .chq-token-hit');

  await page.evaluate(() => {
    const svg = document.querySelector('.chq-court-wrap svg');
    window.__dragProbe = [];
    window.__draftWrites = [];

    const storage = window.BT.storage;
    const originalSetSetting = storage.setSetting.bind(storage);
    storage.setSetting = (key, value) => {
      if (key === 'tacticsBoardDraft') {
        const player = window.BT.tactics.__core.elementById(value?.steps?.[0], 'o1');
        window.__draftWrites.push(player ? { x: player.x, y: player.y } : null);
      }
      return originalSetSetting(key, value);
    };

    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      const original = svg[`on${type}`];
      svg[`on${type}`] = function(event) {
        window.__dragProbe.push({
          type,
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
          target: event.target?.closest?.('[data-element-id]')?.getAttribute('data-element-id') || event.target?.tagName || null
        });
        return original?.call(this, event);
      };
    }
  });

  const hit = page.locator('[data-element-id="o1"] .chq-token-hit').first();
  await hit.scrollIntoViewIfNeeded();
  const beforeBox = await page.locator('[data-element-id="o1"]').first().boundingBox();
  const hitBox = await hit.boundingBox();
  const start = { x: hitBox.x + hitBox.width / 2, y: hitBox.y + hitBox.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 50, start.y - 35, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);

  const result = await page.evaluate(() => {
    const board = window.BT.storage.getSetting('tacticsBoardDraft', null);
    const raw = JSON.parse(localStorage.getItem('beepTest_v1'));
    const rawBoard = raw?.settings?.tacticsBoardDraft || null;
    const player = window.BT.tactics.__core.elementById(board.steps[0], 'o1');
    const rawPlayer = rawBoard ? window.BT.tactics.__core.elementById(rawBoard.steps[0], 'o1') : null;
    const token = document.querySelector('[data-element-id="o1"]');
    return {
      events: window.__dragProbe,
      writes: window.__draftWrites,
      stored: { x: player.x, y: player.y },
      rawStored: rawPlayer ? { x: rawPlayer.x, y: rawPlayer.y } : null,
      transform: token?.getAttribute('transform'),
      quickFix: document.querySelector('.chq-court-wrap svg')?.dataset.quickPointerFix || null,
      status: document.querySelector('[data-role="status"]')?.textContent || null
    };
  });
  const afterBox = await page.locator('[data-element-id="o1"]').first().boundingBox();
  console.log(JSON.stringify({ start, beforeBox, afterBox, errors, ...result }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
