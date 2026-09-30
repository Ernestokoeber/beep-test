import { chromium, devices } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';

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

    window.BT.storage.setSetting('tacticsEditorMode', 'pro');
    window.BT.storage.setSetting('tacticsBoardDraft', board);
    location.hash = '#/tactics';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, boardFactory);
  await page.waitForSelector('[data-role="tactics-quick"]');
  assert(await page.getByRole('button', { name: /Profi-Modus/ }).count() === 0, 'Ein alter gespeicherter Profi-Modus öffnet noch den Legacy-Editor.');
  await page.waitForSelector('.chq-token-hit');
  await page.waitForTimeout(120);
}

function tokenHit(page, id) {
  return page.locator(`.chq-court-wrap [data-element-id="${id}"] .chq-token-hit`).first();
}

async function makeTargetVisible(locator) {
  await locator.scrollIntoViewIfNeeded();
  await new Promise(resolve => setTimeout(resolve, 30));
}

function pointerInit(pointerId, point, buttons = 1) {
  return {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons,
    clientX: point.x,
    clientY: point.y,
    pressure: buttons ? .8 : 0,
    bubbles: true,
    cancelable: true
  };
}

async function dispatchTouchDrag(source, moveTarget, start, end, pointerId) {
  await source.dispatchEvent('pointerdown', pointerInit(pointerId, start));
  for (let index = 1; index <= 5; index += 1) {
    const ratio = index / 5;
    await moveTarget.dispatchEvent('pointermove', pointerInit(pointerId, {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    }));
  }
  await moveTarget.dispatchEvent('pointerup', pointerInit(pointerId, end, 0));
}

async function tokenCenter(page, id) {
  const hit = tokenHit(page, id);
  await makeTargetVisible(hit);
  const box = await hit.boundingBox();
  assert(box, `Spieler ${id} besitzt keine sichtbare Trefferfläche`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function tapCourt(page, point, pointerId) {
  const svg = page.locator('.chq-court-wrap svg').first();
  await svg.dispatchEvent('pointerdown', pointerInit(pointerId, point));
  await svg.dispatchEvent('pointerup', pointerInit(pointerId, point, 0));
  await page.waitForTimeout(45);
}

async function clientPointForBoard(page, point) {
  return page.locator('.chq-court-wrap svg').first().evaluate((svg, value) => {
    const source = svg.createSVGPoint();
    source.x = value.x;
    source.y = value.y;
    const target = source.matrixTransform(svg.getScreenCTM());
    return { x: target.x, y: target.y };
  }, point);
}

async function testPhaseRecorder(page) {
  await page.getByRole('button', { name: /^Pass/ }).click();
  await tapCourt(page, await tokenCenter(page, 'o1'), 601);
  await tapCourt(page, await tokenCenter(page, 'o2'), 602);
  assert(
    (await page.locator('[data-role="timeline"]').innerText()).includes('1 passt zu 2'),
    'Pass erscheint nicht als verständlicher Satz in Phase 1'
  );

  await page.getByRole('button', { name: 'Gleichzeitig' }).click();
  await page.getByRole('button', { name: /^Screen/ }).click();
  await tapCourt(page, await tokenCenter(page, 'o5'), 603);
  await tapCourt(page, await tokenCenter(page, 'o2'), 604);
  const screenPoint = await clientPointForBoard(page, { x: 335, y: 305 });
  await tapCourt(page, screenPoint, 605);
  const firstPhaseText = await page.locator('[data-role="timeline"]').innerText();
  assert(firstPhaseText.includes('5 stellt einen Screen für 2'), 'Gleichzeitiger Screen fehlt in Phase 1');

  await page.getByRole('button', { name: 'Pick & Roll' }).click();
  await tapCourt(page, await tokenCenter(page, 'o1'), 606);
  await tapCourt(page, await tokenCenter(page, 'o5'), 607);
  const pickPoint = await clientPointForBoard(page, { x: 285, y: 285 });
  await tapCourt(page, pickPoint, 608);
  const handlerStart = await tokenCenter(page, 'o1');
  const svg = page.locator('.chq-court-wrap svg').first();
  await dispatchTouchDrag(svg, svg, handlerStart, { x: handlerStart.x + 72, y: handlerStart.y - 88 }, 609);
  await page.waitForTimeout(70);
  await dispatchTouchDrag(svg, svg, pickPoint, { x: pickPoint.x - 12, y: pickPoint.y - 105 }, 610);
  await page.waitForTimeout(150);

  const grouped = await page.evaluate(() => {
    const board = window.BT.storage.getSetting('tacticsBoardDraft', null);
    const actions = board.steps[1]
      ? [...board.steps[1].transition.motions, ...board.steps[1].transition.screens]
      : [];
    return {
      count: actions.filter(action => action.groupType === 'pick-and-roll').length,
      groupIds: [...new Set(actions.filter(action => action.groupType === 'pick-and-roll').map(action => action.groupId))]
    };
  });
  assert(grouped.count === 3 && grouped.groupIds.length === 1, 'Pick & Roll wurde nicht als eine verbundene Aktion gespeichert');
  assert(await page.locator('.chq-phase-card').count() >= 2, 'Für das Pick & Roll wurde keine neue Phase angelegt');

  await page.locator('[data-phase-menu="1"] > summary').click();
  await page.locator('[data-phase-menu="1"] [data-phase-action="edit"]').click();
  await page.waitForSelector('.chqw-modal');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.chqw-action-item [data-delete]').first().click();
  const remainingGroupActions = await page.evaluate(() => {
    const board = window.BT.storage.getSetting('tacticsBoardDraft', null);
    const step = board.steps[1];
    return step
      ? [...step.transition.motions, ...step.transition.passes, ...step.transition.screens]
        .filter(action => action.groupType === 'pick-and-roll').length
      : 0;
  });
  assert(remainingGroupActions === 0, 'Pick & Roll wurde im Bearbeitungsdialog nicht als Gruppe gelöscht');
  await page.locator('.chqw-modal [data-close]').click();
}

async function testPlayEditor2Desktop(page) {
  const focusShells = await page.locator('.chq-focus-shell').count();
  if (focusShells !== 1) {
    console.error('Play-Editor-Diagnose:', await page.evaluate(() => ({
      hash: location.hash,
      quickEditors: document.querySelectorAll('[data-role="tactics-quick"]').length,
      focusShells: document.querySelectorAll('.chq-focus-shell').length,
      appText: document.querySelector('#app')?.textContent?.slice(0, 300) || ''
    })));
  }
  assert(focusShells === 1, 'Der Fokus-Editor wurde nicht geöffnet.');
  assert(await page.locator('body > .topbar').evaluate(element => getComputedStyle(element).display) === 'none', 'Die normale CourtHub-Navigation tritt im Fokus-Editor nicht zurück.');
  const projectedCourts = await page.locator('.chq-court-wrap svg[data-projection="top-down"]').count();
  if (projectedCourts !== 1) {
    console.error('Play-Editor-Court-Diagnose:', await page.evaluate(() => ({
      user: window.BT.sync.getState().user,
      focusShells: document.querySelectorAll('.chq-focus-shell').length,
      projectedCourts: document.querySelectorAll('.chq-court-wrap svg[data-projection="top-down"]').length,
      appText: document.querySelector('#app')?.textContent?.slice(0, 300) || ''
    })));
  }
  assert(projectedCourts === 1, 'Das Hauptfeld nutzt nicht die feste 2D-Draufsicht.');
  const layout = await page.evaluate(() => {
    const workspace = document.querySelector('.chq-workspace');
    const phase = document.querySelector('.chq-phase-rail')?.getBoundingClientRect();
    const stage = document.querySelector('.chq-stage-panel')?.getBoundingClientRect();
    const inspector = document.querySelector('.chq-inspector')?.getBoundingClientRect();
    return phase && stage && inspector
      ? {
          workspace: workspace ? { ...workspace.getBoundingClientRect().toJSON(), columns: getComputedStyle(workspace).gridTemplateColumns } : null,
          phaseRight: phase.right,
          stageLeft: stage.left,
          stageRight: stage.right,
          inspectorLeft: inspector.left,
          stagePosition: getComputedStyle(document.querySelector('.chq-stage-panel')).position,
          inspectorPosition: getComputedStyle(document.querySelector('.chq-inspector')).position
        }
      : null;
  });
  assert(layout && layout.phaseRight <= layout.stageLeft && layout.stageRight <= layout.inspectorLeft, `Desktop ordnet Phasen, Spielfeld und Inspector nicht in drei Spalten an: ${JSON.stringify(layout)}`);
  assert(await page.locator('.chq-phase-thumbnail svg').count() >= 1, 'Der Phasenleiste fehlen echte Court-Thumbnails.');

  await tapCourt(page, await tokenCenter(page, 'd1'), 650);
  await page.getByRole('button', { name: '◇ · Zone' }).click();
  assert(await page.locator('.chq-court-wrap [data-element-id="d1"].defense-zone').count() === 1, 'Zonenverteidigung wird nicht als Raute dargestellt.');
  assert(await page.evaluate(() => window.BT.storage.getSetting('tacticsBoardDraft', null).steps.every(step =>
    window.BT.tactics.__core.elementById(step, 'd1')?.defenseMode === 'zone'
  )), 'Der Verteidigungstyp bleibt nicht über alle Phasen erhalten.');

  await page.getByRole('tab', { name: 'Anweisungen' }).click();
  await page.locator('[data-role="phase-instruction"]').fill('Spacing halten und den Help-Verteidiger lesen.');
  assert(await page.evaluate(() => window.BT.storage.getSetting('tacticsBoardDraft', null).steps[0].instruction.includes('Help-Verteidiger')), 'Traineranweisung wurde nicht gespeichert.');

  await page.getByRole('button', { name: 'Vorschau' }).click();
  await page.waitForSelector('.chp-overlay');
  assert(await page.locator('.chp-preview[data-readonly="true"] input, .chp-preview[data-readonly="true"] textarea').count() === 0, 'Die Playbook-Vorschau ist bearbeitbar.');
  assert((await page.locator('.chp-instruction').first().innerText()).includes('Help-Verteidiger'), 'Traineranweisung fehlt in der Vorschau.');
  await page.getByRole('button', { name: 'Vorschau schließen' }).click();

  await page.getByRole('button', { name: 'Export' }).click();
  await page.waitForSelector('.che-overlay');
  assert(await page.getByRole('button', { name: /^PDF/ }).count() === 1, 'Der gemeinsame Exportdialog enthält kein PDF-Format.');
  await page.locator('[name="pdfLayout"]').selectOption('grid');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export erstellen' }).click();
  const download = await downloadPromise;
  assert(download.suggestedFilename().endsWith('.pdf'), 'Der PDF-Rasterexport erzeugt keinen PDF-Download.');
  await page.getByRole('button', { name: 'Exportdialog schließen' }).click();

  await page.getByRole('button', { name: 'Play' }).click();
  assert(await page.getByRole('button', { name: 'Pause' }).getAttribute('aria-pressed') === 'true', 'Play startet die Animation nicht direkt auf dem Canvas.');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Vorschau' }).click();
  await page.getByRole('button', { name: /Animation abspielen/ }).click();
  await page.waitForSelector('.cha-overlay');
  assert(await page.locator('.cha-player [data-speed]').count() === 3, 'Dem Animationsplayer fehlen die drei Geschwindigkeiten.');
  await page.getByRole('button', { name: 'Animationsplayer schließen' }).click();
  await page.getByRole('button', { name: 'Vorschau schließen' }).click();

  await page.locator('[data-role="title"]').fill('Alter Entwurf');
  await page.locator('.chq-header-more > summary').click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Neues Play', exact: true }).click();
  const freshFromMenu = await page.evaluate(() => {
    const board = window.BT.storage.getSetting('tacticsBoardDraft', null);
    return {
      title: board?.title,
      id: board?.id || null,
      menuOpen: document.querySelector('.chq-header-more')?.open === true,
      titleField: document.querySelector('[data-role="title"]')?.value
    };
  });
  assert(freshFromMenu.title === 'Neues Play' && freshFromMenu.titleField === 'Neues Play' && !freshFromMenu.id, 'Der Menüpunkt erstellt keinen leeren neuen Entwurf.');
  assert(freshFromMenu.menuOpen === false, 'Das Aktionsmenü bleibt nach „Neues Play“ geöffnet.');

  await page.getByRole('button', { name: 'Zurück zur Taktikbibliothek' }).click();
  await page.waitForSelector('.chl-library');
  assert(await page.locator('.chl-new-play').isVisible(), 'Der Taktikbibliothek fehlt der sichtbare „Neues Play“-Button.');
  await page.locator('.chl-new-play').click();
  await page.waitForSelector('.chqw-overlay', { state: 'detached' });
  const freshFromLibrary = await page.evaluate(() => window.BT.storage.getSetting('tacticsBoardDraft', null));
  assert(freshFromLibrary?.title === 'Neues Play' && !freshFromLibrary?.id, 'Aus der Taktikbibliothek wird kein neues Play geöffnet.');
}

async function testPlayEditor2Mobile(page) {
  assert(await page.locator('body > .mobile-dock').evaluate(element => getComputedStyle(element).display) === 'none', 'Die mobile App-Navigation bleibt im Fokus-Editor sichtbar.');
  await page.locator('.chq-focus-shell').evaluate(() => {
    document.documentElement.style.setProperty('--courthub-safe-top', '47px');
    document.documentElement.style.setProperty('--courthub-safe-right', '21px');
    document.documentElement.style.setProperty('--courthub-safe-bottom', '34px');
    document.documentElement.style.setProperty('--courthub-safe-left', '21px');
  });
  const layout = await page.evaluate(() => {
    const toolbar = document.querySelector('.chq-editor-toolbar')?.getBoundingClientRect();
    const leading = document.querySelector('.chq-toolbar-leading')?.getBoundingClientRect();
    const actions = document.querySelector('.chq-actions')?.getBoundingClientRect();
    const workspace = document.querySelector('.chq-workspace');
    const stage = document.querySelector('.chq-stage-panel')?.getBoundingClientRect();
    const phase = document.querySelector('.chq-phase-rail')?.getBoundingClientRect();
    const inspector = document.querySelector('.chq-inspector')?.getBoundingClientRect();
    const flow = document.querySelector('.chq-phase-rail .chq-flow');
    return stage && phase && inspector && flow
      ? {
          stageTop: stage.top,
          phaseTop: phase.top,
          inspectorTop: inspector.top,
          flowDisplay: getComputedStyle(flow).display,
          firstToolHeight: document.querySelector('.chq-toolbar-tools .chq-tool')?.getBoundingClientRect().height || 0,
          toolbarHeight: toolbar?.height || 0,
          leadingTop: leading?.top || 0,
          leadingLeft: leading?.left || 0,
          actionsRight: actions?.right || 0,
          workspacePaddingBottom: Number.parseFloat(getComputedStyle(workspace).paddingBottom) || 0,
          viewportWidth: document.documentElement.clientWidth
        }
      : null;
  });
  assert(layout && layout.stageTop < layout.phaseTop && layout.phaseTop < layout.inspectorTop, 'Mobile ordnet Spielfeld, Phasenleiste und Inspector nicht untereinander an.');
  assert(layout.flowDisplay === 'flex', 'Mobile zeigt die Phasenleiste nicht horizontal.');
  assert(layout.firstToolHeight >= 43.5, 'Mobile Werkzeugziele sind kleiner als 44 Pixel.');
  assert(layout.leadingTop >= 46.5 && layout.toolbarHeight >= 150, 'Die mobile Kopfzeile liegt unter der simulierten iPhone-Notch.');
  assert(layout.leadingLeft >= 20.5 && layout.actionsRight <= layout.viewportWidth - 20.5, 'Die mobile Kopfzeile missachtet die seitlichen iPhone-Safe-Areas.');
  assert(layout.workspacePaddingBottom >= 33.5, 'Der Editor lässt keinen Platz für den iPhone-Home-Indikator.');
  const mobileToolLabels = await page.locator('.chq-toolbar-tools .chq-tool > span').evaluateAll(labels => labels.map(label => ({
    text: label.textContent.trim(),
    opacity: getComputedStyle(label).opacity,
    position: getComputedStyle(label).position
  })));
  assert(['Auswahl', 'Laufweg', 'Pass', 'Screen', 'Pick & Roll', 'Ball'].every(label => mobileToolLabels.some(item => item.text === label)), 'Die Werkzeugbeschriftungen sind unvollständig.');
  assert(mobileToolLabels.every(item => item.opacity === '1' && item.position === 'static'), 'Die Werkzeugbeschriftungen sind auf Touch-Geräten nicht dauerhaft sichtbar.');
  const inspectorToggle = page.locator('[data-action="toggle-inspector"]');
  assert(await inspectorToggle.getAttribute('aria-expanded') === 'false', 'Mobile startet den ausziehbaren Inspector nicht kompakt.');
  await page.getByRole('tab', { name: 'Timeline' }).tap();
  assert(await inspectorToggle.getAttribute('aria-expanded') === 'true', 'Mobile kann Timeline und Anweisungen nicht ausklappen.');
  assert(await page.locator('.chq-line-legend').isVisible(), 'Die Linienlegende ist im mobilen Inspector nicht sichtbar.');

  await page.getByRole('button', { name: 'Vorschau' }).tap();
  await page.waitForSelector('.chp-overlay');
  const previewSafeArea = await page.evaluate(() => {
    const head = document.querySelector('.chp-head')?.getBoundingClientRect();
    const close = document.querySelector('[data-action="preview-close"]')?.getBoundingClientRect();
    return { headHeight: head?.height || 0, closeTop: close?.top || 0 };
  });
  assert(previewSafeArea.headHeight >= 102.5 && previewSafeArea.closeTop >= 46.5, 'Die mobile Vorschau liegt unter der iPhone-Notch.');
  await page.getByRole('button', { name: /Animation abspielen/ }).tap();
  await page.waitForSelector('.cha-overlay');
  const animationSafeArea = await page.evaluate(() => {
    const close = document.querySelector('[data-action="animation-close"]')?.getBoundingClientRect();
    const controls = document.querySelector('.cha-controls')?.getBoundingClientRect();
    return {
      closeTop: close?.top || 0,
      controlsLeft: controls?.left || 0,
      controlsRight: controls?.right || 0,
      controlsBottomGap: window.innerHeight - (controls?.bottom || window.innerHeight),
      viewportWidth: document.documentElement.clientWidth
    };
  });
  assert(animationSafeArea.closeTop >= 46.5, 'Der Animationsplayer liegt unter der iPhone-Notch.');
  assert(animationSafeArea.controlsLeft >= 20.5 && animationSafeArea.controlsRight <= animationSafeArea.viewportWidth - 20.5, 'Die Animationssteuerung liegt in einer seitlichen iPhone-Safe-Area.');
  assert(animationSafeArea.controlsBottomGap >= 33.5, 'Die Animationssteuerung überlappt den iPhone-Home-Indikator.');
  await page.getByRole('button', { name: 'Animationsplayer schließen' }).tap();
  await page.getByRole('button', { name: 'Vorschau schließen' }).tap();

  await page.getByRole('button', { name: 'Export' }).tap();
  await page.waitForSelector('.che-overlay');
  const exportSafeArea = await page.evaluate(() => {
    const dialog = document.querySelector('.che-dialog')?.getBoundingClientRect();
    return {
      top: dialog?.top || 0,
      right: dialog?.right || 0,
      bottomGap: window.innerHeight - (dialog?.bottom || window.innerHeight),
      left: dialog?.left || 0,
      viewportWidth: document.documentElement.clientWidth
    };
  });
  assert(exportSafeArea.top >= 46.5 && exportSafeArea.bottomGap >= 33.5, 'Der Exportdialog missachtet die vertikalen iPhone-Safe-Areas.');
  assert(exportSafeArea.left >= 20.5 && exportSafeArea.right <= exportSafeArea.viewportWidth - 20.5, 'Der Exportdialog missachtet die seitlichen iPhone-Safe-Areas.');
  await page.getByRole('button', { name: 'Exportdialog schließen' }).tap();
}

async function dragTokenWithMouse(page, id, dx, dy) {
  const hit = tokenHit(page, id);
  await makeTargetVisible(hit);
  const box = await hit.boundingBox();
  assert(box, `Spieler ${id} besitzt keine sichtbare Trefferfläche`);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hitTarget = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return { tag: element?.tagName || null };
  }, start);
  assert(hitTarget.tag, `Spieler ${id} besitzt an seiner sichtbaren Position keine Trefferfläche.`);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 6 });
  await page.mouse.up();
}

async function dragTokenWithTouch(page, id, dx, dy, pointerId) {
  const hit = tokenHit(page, id);
  const svg = page.locator('.chq-court-wrap svg').first();
  await makeTargetVisible(hit);
  const box = await hit.boundingBox();
  assert(box, `Touch-Spieler ${id} besitzt keine sichtbare Trefferfläche`);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await dispatchTouchDrag(hit, svg, start, { x: start.x + dx, y: start.y + dy }, pointerId);
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
    await page.waitForTimeout(55);
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
  await makeTargetVisible(source);
  await makeTargetVisible(target);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, 'Drag-and-drop-Griffe sind nicht sichtbar');
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  if (touch) {
    await dispatchTouchDrag(source, source, start, end, 501);
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await waitForApp(page);
  await openQuickEditor(page, 'default');
  await testPlayEditor2Desktop(page);
  await openQuickEditor(page, 'default');
  assert(await page.locator('.chq-court-wrap .offense-token').count() === 5, 'Desktop zeigt nicht alle fünf Angreifer');
  assert(await page.locator('.chq-court-wrap .defense-token').count() === 5, 'Desktop zeigt nicht alle fünf Verteidiger');
  await verifyAllPlayersDrag(page, false);
  await openQuickEditor(page, 'default');
  await testPhaseRecorder(page);

  await openQuickEditor(page, 'flows');
  assert(await page.locator('.chqr-handle').count() === 3, 'Desktop zeigt nicht für jeden Ablauf einen Sortiergriff');
  await reorderWithPointer(page, 0, 2, false);
  const desktopOrder = await page.evaluate(() =>
    window.BT.storage.getSetting('tacticsBoardDraft', null).steps.slice(0, -1)
      .map(step => step.transition.motions[0]?.id || '').join(',')
  );
  assert(desktopOrder === 'e2e-second,e2e-third,e2e-first', `Desktop-Reihenfolge ist falsch: ${desktopOrder}`);

  await page.locator('.chq-header-more > summary').click();
  await page.getByRole('button', { name: 'Video → Play' }).click();
  await page.waitForSelector('[data-role="video-import"]');
  assert(await page.locator('.vi-tracker-v2').count() === 1, 'Tracking V2 fehlt im echten Desktop-Browser');
  await page.goBack();
  await page.waitForSelector('[data-role="tactics-quick"]');

  await page.goto(baseUrl + '/#/tactics/import', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-role="video-import"]');
  assert(page.url().includes('#/tactics/import'), 'Direkte Videoimport-Route wurde umgeleitet');
  assert(pageErrors.length === 0, `Desktop meldet Browserfehler: ${pageErrors.join(' | ')}`);
  await context.close();
}

async function testIPhone(browser) {
  const context = await browser.newContext({ ...devices['iPhone 15'], locale: 'de-DE', serviceWorkers: 'block' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await waitForApp(page);
  await openQuickEditor(page, 'default');
  await testPlayEditor2Mobile(page);
  assert(await page.locator('.chq-court-wrap .offense-token').count() === 5, 'iPhone zeigt nicht alle fünf Angreifer');
  assert(await page.locator('.chq-court-wrap .defense-token').count() === 5, 'iPhone zeigt nicht alle fünf Verteidiger');
  await verifyAllPlayersDrag(page, true);

  await openQuickEditor(page, 'flows');
  assert(await page.locator('.chqr-handle').count() === 3, 'Touch-Sortiergriffe fehlen');
  await reorderWithPointer(page, 2, 0, true);
  const touchOrder = await page.evaluate(() =>
    window.BT.storage.getSetting('tacticsBoardDraft', null).steps.slice(0, -1)
      .map(step => step.transition.motions[0]?.id || '').join(',')
  );
  assert(touchOrder === 'e2e-third,e2e-first,e2e-second', `Touch-Reihenfolge ist falsch: ${touchOrder}`);

  await page.locator('.chq-header-more > summary').tap();
  await page.getByRole('button', { name: 'Video → Play' }).tap();
  await page.waitForSelector('[data-role="video-import"]');
  assert(await page.locator('.vi-tracker-v2').isVisible(), 'Tracking V2 ist auf dem iPhone nicht sichtbar');
  assert(pageErrors.length === 0, `iPhone meldet Browserfehler: ${pageErrors.join(' | ')}`);
  await context.close();
}

async function testTablet(browser) {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, locale: 'de-DE', hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await waitForApp(page);
  await openQuickEditor(page, 'flows');
  await testPlayEditor2Mobile(page);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Tablet erzeugt einen horizontalen Seitenüberlauf.');
  assert(pageErrors.length === 0, `Tablet meldet Browserfehler: ${pageErrors.join(' | ')}`);
  await context.close();
}

async function testMatchday(browser, name, options) {
  // Fresh storage per viewport; only identity is synthetic. Routes, UI,
  // controllers, localStorage and IndexedDB use the production app.
  const context = await browser.newContext({ ...options, locale: 'de-DE', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    // Existing static-host diagnostic, unrelated to JavaScript/runtime failures.
    const metaCspWarning = "The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.";
    if (message.type() === 'error' && message.text() !== metaCspWarning) errors.push(message.text());
  });
  await context.addInitScript(() => {
    // Install identity before app.js initializes a deep link, including reloads.
    window.BT = {};
    let sync;
    Object.defineProperty(window.BT, 'sync', {
      configurable: true,
      get: () => sync,
      set(value) {
        sync = value;
        const original = value.getState.bind(value);
        value.getState = () => ({
          ...original(), user: { id: 'matchday-coach', role: 'coach', organization: { id: 'matchday-e2e' } }
        });
      }
    });
  });
  async function noOverflow(stage) {
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    assert(Math.max(dimensions.document, dimensions.body) <= dimensions.viewport + 1,
      `${name} · ${stage}: horizontaler Überlauf ${JSON.stringify(dimensions)}`);
    assert(errors.length === 0, `${name} · ${stage}: Browserfehler ${errors.join(' | ')}`);
  }
  async function report() {
    await page.getByRole('heading', { name: 'Spielauswertung', exact: true }).waitFor();
    assert(await page.locator('.live-report-score [data-team="own"] strong').innerText() === '2', `${name}: eigene Punkte fehlen`);
    assert(await page.locator('.live-report-score [data-team="opponent"] strong').innerText() === '3', `${name}: Gegnerpunkte fehlen`);
    assert(await page.locator('.live-report-status').getAttribute('data-state') === 'confirmed', `${name}: Abschlussbestätigung fehlt`);
    const player = page.locator('.live-report-player').filter({ hasText: 'E2E Spieler 1' });
    const metrics = await player.locator('.live-report-player-quick dt').evaluateAll(labels =>
      Object.fromEntries(labels.map(label => [label.textContent, label.nextElementSibling.textContent])));
    assert(metrics.PTS === '2' && metrics['+/−'] === '-1', `${name}: Spielerwerte falsch ${JSON.stringify(metrics)}`);
    await player.getByText('Würfe und weitere Werte', { exact: true }).tap();
    assert((await player.innerText()).includes('1/1'), `${name}: Wurfstatistik fehlt`);
    await page.locator('.live-report-dnp > summary').tap();
    assert((await page.locator('.live-report-dnp').innerText()).includes('E2E Spieler 6 · DNP'), `${name}: Bankspieler fehlt`);
    await noOverflow('Auswertung mit aufgeklappten Details');
  }
  try {
    await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'domcontentloaded' });
    await page.locator('#app > *').first().waitFor();
    const gameId = await page.evaluate(() => {
      for (let i = 1; i <= 6; i++) window.BT.storage.upsertPlayer({ name: `E2E Spieler ${i}`, jerseyNumber: String(i) });
      return window.BT.storage.upsertGame({ date: '2026-09-30', home: 'E2E Heim', away: 'E2E Gast', source: 'manual' }).id;
    });
    await page.goto(baseUrl + '/#/games', { waitUntil: 'domcontentloaded' });
    await page.locator(`[data-game-id="${gameId}"]`).tap();
    await page.getByRole('button', { name: 'Spieltag starten', exact: true }).tap();
    await page.locator('[data-field="ownSide"]').selectOption('home');
    await noOverflow('Spiel prüfen');
    await page.getByRole('button', { name: 'Weiter zur Mannschaft' }).tap();
    await page.locator('[data-starter]').first().waitFor();
    const starters = page.locator('[data-starter]');
    assert(await starters.count() === 6, `${name}: synthetischer Kader fehlt`);
    for (let i = 0; i < 5; i++) await starters.nth(i).check();
    await noOverflow('Kader');
    await page.getByRole('button', { name: 'Weiter zur Vorbereitung' }).tap();
    await page.locator('[data-field="goals"]').fill('Rebounds sichern');
    await noOverflow('Vorbereitung');
    await page.getByRole('button', { name: 'Vorbereitung überspringen' }).tap();
    await page.getByRole('button', { name: 'Zur Live-Ansicht' }).waitFor();
    assert((await page.locator('.matchday').innerText()).includes('Rebounds sichern'), `${name}: Überspringen verwirft Ziele`);
    await noOverflow('Übersicht');
    await page.getByRole('button', { name: 'Zur Live-Ansicht' }).tap();
    await page.getByRole('button', { name: 'Uhr starten', exact: true }).waitFor();
    await page.locator('[data-player]').first().tap();
    await page.getByRole('button', { name: 'Zweier getroffen', exact: true }).tap();
    await page.locator('.live-clock').filter({ hasText: 'Eigene 2' }).waitFor();
    await page.getByRole('button', { name: 'Gegner +3', exact: true }).tap();
    await page.locator('.live-clock').filter({ hasText: 'Gegner 3' }).waitFor();
    await noOverflow('Live-Erfassung');
    const liveBeforeReload = await page.evaluate(id => window.BT.storage.getGame(id).liveStats, gameId);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Spiel abschließen', exact: true }).waitFor();
    assert(JSON.stringify(await page.evaluate(id => window.BT.storage.getGame(id).liveStats, gameId)) === JSON.stringify(liveBeforeReload), `${name}: Reload verändert oder dupliziert die Live-Sitzung`);
    await noOverflow('Live-Wiederaufnahme');
    // Abrupt reload does not await the old tab's asynchronous lease release.
    // Respect the production journal's 15-second lease instead of clearing it.
    await page.waitForTimeout(16000);
    await page.getByRole('button', { name: 'Spiel abschließen', exact: true }).tap();
    await page.getByLabel('Gesamten Punkteverlauf beider Teams erfasst').check();
    await noOverflow('Abschlussformular');
    await page.getByRole('button', { name: 'Abschluss speichern', exact: true }).tap();
    await report();
    await page.getByText('Vorbereitung & Spieltagsnotizen', { exact: true }).tap();
    assert(await page.locator('[data-field="goals"]').inputValue() === 'Rebounds sichern', `${name}: gespeicherte Ziele fehlen`);
    await page.locator('[data-field="closingNote"]').fill('Ausboxen weiter trainieren');
    await page.getByRole('button', { name: 'Notizen speichern', exact: true }).tap();
    await page.locator('.matchday details > [role="status"]').filter({ hasText: 'Lokal gesichert' }).waitFor();
    const finished = await page.evaluate(id => window.BT.storage.getGame(id), gameId);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await report();
    await page.getByText('Vorbereitung & Spieltagsnotizen', { exact: true }).tap();
    assert(await page.locator('[data-field="closingNote"]').inputValue() === 'Ausboxen weiter trainieren', `${name}: Abschlussnotiz fehlt nach Reload`);
    assert(JSON.stringify(await page.evaluate(id => window.BT.storage.getGame(id), gameId)) === JSON.stringify(finished), `${name}: Abschluss/Entwurf nach Reload verändert`);
    await noOverflow('Abgeschlossener Spieltag nach Reload');
    console.log(`Matchday Browser-E2E erfolgreich: ${name}, Vorbereitung, Live, Abschluss, Auswertung und zwei Reloads.`);
  } catch (error) {
    console.error(`${name} Matchday-Diagnose:`, page.url(), await page.locator('#app').innerText(), errors);
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  if (!process.env.E2E_MATCHDAY_ONLY) {
    await testDesktop(browser);
    await testTablet(browser);
    await testIPhone(browser);
  }
  await testMatchday(browser, 'iPhone 15', devices['iPhone 15']);
  await testMatchday(browser, '320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } });
  console.log(process.env.E2E_MATCHDAY_ONLY
    ? 'CourtHub Matchday Browser-E2E erfolgreich: iPhone und 320 px.'
    : 'CourtHub Browser-E2E erfolgreich: Play Editor 2.0, Desktop, Tablet, iPhone, zehn Spieler, Drag-and-drop, Videoimport und Matchday (iPhone/320 px).');
} finally {
  await browser.close();
}
