import { chromium, devices } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const cdpSessions = new WeakMap();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForApp(page) {
  await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BT?.tactics?.__core && window.BT?.storage && window.BT?.sync);
  await page.evaluate(() => {
    const original = window.BT.sync.getState.bind(window.BT.sync);
    window.BT.sync.getState = () => ({
      ...original(),
      user: { id: 'e2e-coach', displayName: 'E2E Coach', role: 'admin', teamId: 'e2e' },
      status: 'synced'
    });
    navigator.serviceWorker?.getRegistrations?.().then(items => items.forEach(item => item.unregister()));
  });
}

async function openQuickEditor(page, boardFactory = 'default') {
  await page.evaluate(factory => {
    const core = window.BT.tactics.__core;
    let board = core.defaultBoard();

    if (factory === 'flows') {
      const first = board.steps[0];
      const second = core.cloneStep(first);
      const third = core.cloneStep(second);
      const final = core.cloneStep(third);
      board.steps = [first, second, third, final];

      const addMove = (step, next, id, dx, dy, actionId) => {
        const actor = core.elementById(step, id);
        const target = core.elementById(next, id);
        target.x = actor.x + dx;
        target.y = actor.y + dy;
        step.duration = 1.1;
        step.transition.motions.push({
          id: actionId, type: 'move', elementId: id, start: 0, duration: .9,
          path: [{ x: actor.x, y: actor.y }, { x: target.x, y: target.y }]
        });
      };

      addMove(first, second, 'o1', 46, -34, 'e2e-first');
      Object.assign(core.elementById(third, 'o1'), core.point(core.elementById(second, 'o1')));
      Object.assign(core.elementById(final, 'o1'), core.point(core.elementById(third, 'o1')));
      addMove(second, third, 'o2', -38, -42, 'e2e-second');
      Object.assign(core.elementById(final, 'o2'), core.point(core.elementById(third, 'o2')));
      addMove(third, final, 'd1', 32, 28, 'e2e-third');
    }

    window.BT.storage.setSetting('tacticsEditorMode', 'quick');
    window.BT.storage.setSetting('tacticsBoardDraft', board);
    location.hash = '#/tactics';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, boardFactory);
  await page.waitForSelector('[data-role="tactics-quick"]');
  await page.waitForSelector('.chq-token-hit');
  await page.waitForTimeout(120);
}

function tokenHit(page, id) {
  return page.locator(`[data-element-id="${id}"] .chq-token-hit`).first();
}

async function chromiumTouchDrag(page, start, end, id = 1) {
  let session = cdpSessions.get(page);
  if (!session) {
    session = await page.context().newCDPSession(page);
    cdpSessions.set(page, session);
  }
  const point = (value) => ({
    x: value.x,
    y: value.y,
    id,
    radiusX: 2,
    radiusY: 2,
    force: 1
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(start)] });
  for (let index = 1; index <= 5; index += 1) {
    const ratio = index / 5;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      })]
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function dragTokenWithMouse(page, id, dx, dy) {
  const hit = tokenHit(page, id);
  const box = await hit.boundingBox();
  assert(box, `Spieler ${id} besitzt keine sichtbare Trefferfläche`);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 6 });
  await page.mouse.up();
}

async function dragTokenWithTouch(page, id, dx, dy, pointerId) {
  const hit = tokenHit(page, id);
  const box = await hit.boundingBox();
  assert(box, `Touch-Spieler ${id} besitzt keine sichtbare Trefferfläche`);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await chromiumTouchDrag(page, start, { x: start.x + dx, y: start.y + dy }, pointerId);
}

async function verifyAllPlayersDrag(page, touch = false) {
  const ids = ['o1', 'o2', 'o3', 'o4', 'o5', 'd1', 'd2', 'd3', 'd4', 'd5'];
  const before = await page.evaluate(list => {
    const board = window.BT.storage.getSetting('tacticsBoardDraft', null);
    const core = window.BT.tactics.__core;
    return Object.fromEntries(list.map(id => {
      const player = core.elementById(board.steps[0], id);
      return [id, { x: player.x, y: player.y }];
    }));
  }, ids);

  for (let index = 0; index < ids.length; index += 1) {
    const dx = index % 2 ? -24 : 24;
    const dy = index < 5 ? -18 : 18;
    if (touch) await dragTokenWithTouch(page, ids[index], dx, dy, 100 + index);
    else await dragTokenWithMouse(page, ids[index], dx, dy);
    await page.waitForTimeout(35);
  }

  const after = await page.evaluate(list => {
    const board = window.BT.storage.getSetting('tacticsBoardDraft', null);
    const core = window.BT.tactics.__core;
    return Object.fromEntries(list.map(id => {
      const player = core.elementById(board.steps[0], id);
      return [id, { x: player.x, y: player.y }];
    }));
  }, ids);

  ids.forEach(id => {
    const moved = Math.hypot(after[id].x - before[id].x, after[id].y - before[id].y);
    assert(moved > 5, `${touch ? 'Touch' : 'Desktop'}: Spieler ${id} wurde nicht verschoben`);
  });
}

async function reorderWithPointer(page, from, to, touch = false) {
  const handles = page.locator('.chqr-handle');
  const source = handles.nth(from);
  const target = handles.nth(to);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, 'Drag-and-drop-Griffe sind nicht sichtbar');
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  if (touch) {
    await chromiumTouchDrag(page, start, end, 501);
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  }
  await page.waitForSelector('[data-role="tactics-quick"]');
  await page.waitForTimeout(180);
}

async function testDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await waitForApp(page);
  await openQuickEditor(page, 'default');
  assert(await page.locator('.offense-token').count() === 5, 'Desktop zeigt nicht alle fünf Angreifer');
  assert(await page.locator('.defense-token').count() === 5, 'Desktop zeigt nicht alle fünf Verteidiger');
  await verifyAllPlayersDrag(page, false);

  await openQuickEditor(page, 'flows');
  assert(await page.locator('.chqr-handle').count() === 3, 'Desktop zeigt nicht für jeden Ablauf einen Sortiergriff');
  await reorderWithPointer(page, 0, 2, false);
  const desktopOrder = await page.evaluate(() =>
    window.BT.storage.getSetting('tacticsBoardDraft', null).steps.slice(0, -1)
      .map(step => step.transition.motions[0]?.id || '').join(',')
  );
  assert(desktopOrder === 'e2e-second,e2e-third,e2e-first', `Desktop-Reihenfolge ist falsch: ${desktopOrder}`);

  await page.getByRole('button', { name: 'Video → Play' }).click();
  await page.waitForSelector('[data-role="video-import"]');
  assert(await page.locator('.vi-tracker-v2').count() === 1, 'Tracking V2 fehlt im echten Desktop-Browser');
  await page.goBack();
  await page.waitForSelector('[data-role="tactics-quick"]');

  await page.goto(baseUrl + '/#/tactics/import', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-role="video-import"]');
  assert(page.url().includes('#/tactics/import'), 'Direkte Videoimport-Route wurde umgeleitet');
  await context.close();
}

async function testIPhone(browser) {
  const context = await browser.newContext({
    ...devices['iPhone 15'],
    locale: 'de-DE'
  });
  const page = await context.newPage();
  await waitForApp(page);
  await openQuickEditor(page, 'default');
  assert(await page.locator('.offense-token').count() === 5, 'iPhone zeigt nicht alle fünf Angreifer');
  assert(await page.locator('.defense-token').count() === 5, 'iPhone zeigt nicht alle fünf Verteidiger');
  await verifyAllPlayersDrag(page, true);

  await openQuickEditor(page, 'flows');
  assert(await page.locator('.chqr-handle').count() === 3, 'Touch-Sortiergriffe fehlen');
  await reorderWithPointer(page, 2, 0, true);
  const touchOrder = await page.evaluate(() =>
    window.BT.storage.getSetting('tacticsBoardDraft', null).steps.slice(0, -1)
      .map(step => step.transition.motions[0]?.id || '').join(',')
  );
  assert(touchOrder === 'e2e-third,e2e-first,e2e-second', `Touch-Reihenfolge ist falsch: ${touchOrder}`);

  await page.getByRole('button', { name: 'Video → Play' }).tap();
  await page.waitForSelector('[data-role="video-import"]');
  assert(await page.locator('.vi-tracker-v2').isVisible(), 'Tracking V2 ist auf dem iPhone nicht sichtbar');
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await testDesktop(browser);
  await testIPhone(browser);
  console.log('CourtHub Browser-E2E erfolgreich: Desktop, iPhone, zehn Spieler, Drag-and-drop und Videoimport.');
} finally {
  await browser.close();
}
