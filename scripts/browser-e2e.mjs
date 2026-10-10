import { chromium, devices } from 'playwright';
import { verifyMobileCoaching } from './mobile-coaching-browser.mjs';
import { verifyGameArchive } from './game-archive-browser.mjs';

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

async function verifyPhase3Animations(page) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await page.evaluate(() => window.BT?.tactics?.__timingFixApplied === true)) break;
    await page.waitForTimeout(50);
  }
  assert(await page.evaluate(() => window.BT?.tactics?.__timingFixApplied === true), 'Das korrigierte Taktik-Timing wurde nicht geladen.');
  const result = await page.evaluate(() => {
    const tactics = window.BT.tactics;
    const core = tactics.__core;
    const templates = tactics.phase3Templates();
    const fiveOut = templates.find(item => item.id === 'phase3-five-out')?.board;
    const allTransitionsAnimated = templates.every(item => item.board.steps.slice(0, -1).every(step =>
      step.transition.motions.length + step.transition.passes.length + step.transition.screens.length > 0
    ));
    if (!fiveOut) return { allTransitionsAnimated, hasFiveOut: false };

    const dribbleStep = 2;
    const dribbleTime = core.stepStartTime(fiveOut, dribbleStep) + 1.1;
    const dribbleSnapshot = tactics.snapshotAt(fiveOut, dribbleTime);
    const player = core.elementById(dribbleSnapshot, 'o3');
    const ball = core.elementById(dribbleSnapshot, 'ball');
    const expectedBall = core.ballPointForPlayer(player);
    const ballTracksDribbler = core.distance(ball, expectedBall) < 1;

    const passStep = fiveOut.steps[0];
    const pass = passStep.transition.passes[0];
    const passSnapshot = tactics.snapshotAt(fiveOut, pass.start + pass.duration / 2);
    const passBall = core.elementById(passSnapshot, 'ball');
    const sourceBall = core.elementById(passStep, 'ball');
    const passMovesBall = core.distance(passBall, sourceBall) > 10;

    return { allTransitionsAnimated, hasFiveOut: true, ballTracksDribbler, passMovesBall };
  });
  assert(result.hasFiveOut, 'Phase-3-Five-Out fehlt im echten Browser.');
  assert(result.allTransitionsAnimated, 'Mindestens ein Phase-3-Übergang ist im echten Browser ohne Basketballaktion.');
  assert(result.ballTracksDribbler, 'Der Ball bleibt im Phase-3-Dribbling nicht beim Ballhandler.');
  assert(result.passMovesBall, 'Der Phase-3-Pass bewegt den Ball im echten Browser nicht.');
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
  await verifyPhase3Animations(page);
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

async function testScreenAcademy(browser, name, options) {
  const context = await browser.newContext({ ...options, locale: 'de-DE', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await waitForApp(page);
    await openQuickEditor(page, 'default');
    await page.getByRole('button', { name: 'Zurück zur Taktikbibliothek' }).click();
    await page.waitForSelector('.chqw-overlay .chl-library');
    await page.getByRole('button', { name: /Screen-Akademie/ }).click();
    await page.waitForSelector('.screen-academy');
    assert(await page.locator('.chqw-overlay').count() === 0, `${name}: Taktikbibliothek bleibt über der Screen-Akademie geöffnet.`);
    assert(await page.locator('.screen-card-core').count() >= 12, `${name}: Kernaktionen für Dienstag fehlen.`);
    assert(await page.locator('.screen-reference-grid .screen-card').count() >= 40, `${name}: Screen-Nachschlagewerk ist unvollständig.`);
    assert((await page.locator('.screen-lesson').innerText()).includes('35-Minuten-Lehrpfad'), `${name}: Lehrpfad für Dienstag fehlt.`);
    await page.locator('[data-role="screen-search"]').fill('Floppy');
    assert(await page.locator('.screen-reference-grid .screen-card').count() === 1, `${name}: Screen-Suche filtert Floppy nicht eindeutig.`);
    await page.locator('[data-role="screen-search"]').fill('');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    assert(Math.max(dimensions.document, dimensions.body) <= dimensions.viewport + 1, `${name}: Screen-Akademie erzeugt horizontalen Überlauf ${JSON.stringify(dimensions)}`);
    const pickAndRoll = page.locator('.screen-card-core').filter({ hasText: 'Pick & Roll' }).first();
    await pickAndRoll.getByRole('button', { name: /Im Taktikboard zeigen/ }).click();
    await page.waitForSelector('[data-role="tactics-quick"]');
    assert((await page.locator('[data-role="title"]').inputValue()).includes('Pick & Roll'), `${name}: Pick-&-Roll-Demo wird nicht ins Taktikboard übernommen.`);
    assert(await page.locator('.chq-timeline-action').count() > 0, `${name}: Pick-&-Roll-Demo enthält keine sichtbaren Aktionen.`);
    assert(errors.length === 0, `${name}: Browserfehler ${errors.join(' | ')}`);
    console.log(`Screen-Akademie Browser-E2E erfolgreich: ${name}, Katalog, Suche, mobile Breite und Taktikboard-Demo.`);
  } finally {
    await context.close();
  }
}

async function testTrainingLive(browser, name, options) {
  const context = await browser.newContext({ ...options, locale: 'de-DE', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const metaCspWarning = "The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.";
    if (message.type() === 'error' && message.text() !== metaCspWarning) errors.push(message.text());
  });
  await context.addInitScript(() => {
    window.BT = {};
    let sync;
    Object.defineProperty(window.BT, 'sync', {
      configurable: true,
      get: () => sync,
      set(value) {
        sync = value;
        const original = value.getState.bind(value);
        value.getState = () => ({
          ...original(), user: { id: 'training-live-coach', role: 'coach', organization: { id: 'training-live-e2e' } }
        });
      }
    });
  });

  async function noOverflow(stage) {
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      overlay: document.querySelector('.training-live')?.scrollWidth || 0,
      overlayClient: document.querySelector('.training-live')?.clientWidth || 0,
      main: document.querySelector('.training-live-main')?.scrollWidth || 0,
      mainClient: document.querySelector('.training-live-main')?.clientWidth || 0
    }));
    assert(dimensions.overlay <= dimensions.overlayClient + 1 && dimensions.main <= dimensions.mainClient + 1,
      `${name} · Training Live · ${stage}: horizontaler Überlauf ${JSON.stringify(dimensions)}`);
    assert(errors.length === 0, `${name} · Training Live · ${stage}: Browserfehler ${errors.join(' | ')}`);
  }

  try {
    await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'domcontentloaded' });
    await page.locator('#app > *').first().waitFor();
    const stationSetup = await page.evaluate(() => {
      const start = new Date(`${window.BT.util.todayISO()}T12:00:00`);
      while (start.getDay() !== 5) start.setDate(start.getDate() + 1);
      const friday = start.toISOString().slice(0, 10);
      start.setDate(start.getDate() + 1);
      const gameDate = start.toISOString().slice(0, 10);
      const players = Array.from({ length: 9 }, (_, index) =>
        window.BT.storage.upsertPlayer({ name: `Stationsspieler ${index + 1}`, jerseyNumber: String(index + 1) }));
      const game = window.BT.storage.upsertGame({ team: 'herren', date: gameDate, time: '18:00', home: 'TSV Lindau', away: 'Stations-Gegner', source: 'manual', playerStats: [] });
      window.BT.api.ai = async (_action, payload) => ({
        data: {
          trainings: payload.data.slots.map(slot => ({
            date: slot.date,
            summary: 'KI-generiertes individuelles Freitagstraining',
            evidenceBasis: {
              observedTrends: ['Die vorherigen Spiel- und Trainingsdaten wurden ausgewertet.'],
              loadConsiderations: ['Das Wochenendspiel folgt unmittelbar.'],
              planningDecision: 'Niedrige Belastung und fünf unterschiedliche individuelle Entwicklungsfelder.'
            },
            freethrows: { attempted: 20 },
            shots: [],
            drills: [
              { name: 'Readiness-Check & Tagesziel', minutes: 10, intensity: 'low', description: 'Tagesform und Belastung erfassen.' },
              { name: 'Individuelle Aktivierung', minutes: 10, intensity: 'low', description: 'Schonend aktivieren.' },
              ...Array.from({ length: 5 }, (_, index) => ({ name: `KI-Station ${index + 1}`, minutes: 15, intensity: 'low', description: `Neue individuelle Aufgabe ${index + 1}.` })),
              { name: 'Cooldown & Session-RPE', minutes: 10, intensity: 'low', description: 'Belastung dokumentieren.' }
            ],
            stationTraining: {
              rationale: 'Passend zur aktuellen Spielwoche neu erzeugt.',
              stations: Array.from({ length: 5 }, (_, index) => ({ title: `KI-Station ${index + 1}`, category: `Kategorie ${index + 1}`, description: `Neue individuelle Aufgabe ${index + 1}.` }))
            }
          }))
        },
        model: 'gemini-3.8-flash', requestId: 'ai_browser_station'
      });
      return { friday, gameId: game.id, playerId: players[0].id };
    });
    await page.goto(baseUrl + '/#/training', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Mit KI planen', exact: true }).tap();
    await page.getByRole('button', { name: 'Belastung', exact: true }).tap();
    assert(await page.getByText('Warum die Basketball-KI dieses Training plant', { exact: true }).count() === 1, `${name}: KI-Planungsgrundlage wird nicht angezeigt`);
    assert(await page.locator('.station-card').count() === 5, `${name}: fünf Freitagstationen fehlen`);
    assert(await page.locator('.station-player-card').count() === 9, `${name}: Belastungssteuerung enthält nicht alle Spieler`);
    const firstLoadCard = page.locator('.station-player-card').first();
    await firstLoadCard.locator('[data-station-field="pain"]').fill('6');
    await firstLoadCard.locator('[data-station-field="pain"]').press('Tab');
    await firstLoadCard.locator('.station-light-red').waitFor();
    const stationTraining = await page.evaluate(date => window.BT.storage.getTrainings().find(training => training.date === date), stationSetup.friday);
    assert(stationTraining.plan.durationMinutes === 105, `${name}: Freitagsplan hat nicht 105 Minuten`);
    assert(stationTraining.stationTraining.players[stationSetup.playerId].targetRpe === 2, `${name}: Schmerz erzeugt keine rote Laststeuerung`);
    const stationDimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    assert(Math.max(stationDimensions.document, stationDimensions.body) <= stationDimensions.viewport + 1, `${name}: Belastungsansicht erzeugt horizontalen Überlauf ${JSON.stringify(stationDimensions)}`);
    await page.getByRole('button', { name: /Training durchführen/ }).tap();
    await page.getByRole('heading', { name: 'Training Live', exact: true }).waitFor();
    assert(await page.locator('[data-live="block-name"]').innerText() === 'Readiness-Check & Tagesziel', `${name}: Stationstraining startet im falschen Block`);
    await page.getByRole('button', { name: /Nächster Block/ }).tap();
    assert(await page.locator('[data-live="block-name"]').innerText() === 'Individuelle Aktivierung', `${name}: Blockwechsel ohne gestartete Uhr ist nicht möglich`);
    await noOverflow('Freitagsstationen im Live-Modus');
    await page.getByRole('button', { name: 'Training Live schließen', exact: true }).tap();

    const trainingId = await page.evaluate(() => {
      const players = window.BT.storage.getPlayers().filter(player => !player.archived).slice(0, 9);
      return window.BT.storage.upsertTraining({
        date: '2026-10-02',
        startTime: '20:20',
        attendance: players.map(player => ({ playerId: player.id, status: 'present', late: false, note: '' })),
        freethrows: [],
        shots: [],
        plan: {
          durationMinutes: 100,
          drills: [
            { name: 'Dual-Ball Warm-up', minutes: 10, intensity: 'medium', description: 'Kopf oben und beide Hände aktiv.' },
            { name: 'Flex live 5v5', minutes: 20, intensity: 'high', description: 'Nur eingreifen, wenn der freie Spielfluss stockt.' },
            { name: 'Horns / 5-Out Decision Game', minutes: 20, intensity: 'high', description: 'Reads gegen No Middle.' },
            { name: 'Continuous Decision Game', minutes: 20, intensity: 'high', description: 'Rebound und sofortiger Umschaltmoment.' },
            { name: '5v5 – 2 × 10 Minuten', minutes: 30, intensity: 'high', description: 'Spielnaher Abschluss.' }
          ]
        }
      }).id;
    });

    await page.goto(baseUrl + `/#/training/${trainingId}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Training durchführen/ }).tap();
    await page.getByRole('heading', { name: 'Training Live', exact: true }).waitFor();
    assert(await page.locator('[data-live="block-name"]').innerText() === 'Dual-Ball Warm-up', `${name}: erster Trainingsblock fehlt`);
    assert((await page.locator('[data-live="presence"]').innerText()).includes('9 Spieler'), `${name}: Anwesenheit fehlt`);
    await noOverflow('Start');

    await page.getByRole('button', { name: '▶ Start', exact: true }).tap();
    await page.waitForTimeout(1100);
    await page.getByRole('button', { name: '+1 min', exact: true }).tap();
    await page.getByRole('button', { name: /Funktioniert/ }).tap();
    await page.locator('[data-live="note"]').fill('Ballkontrolle stabil, Blick früher heben.');
    await page.getByRole('button', { name: /Nächster Block/ }).tap();
    assert(await page.locator('[data-live="block-name"]').innerText() === 'Flex live 5v5', `${name}: nächster Trainingsblock fehlt`);
    const firstSaved = await page.evaluate(id => window.BT.storage.getTraining(id).liveSession.blocks[0], trainingId);
    assert(firstSaved.status === 'completed' && firstSaved.rating === 'worked', `${name}: Blockbewertung wurde nicht gespeichert`);
    assert(firstSaved.note.includes('Blick früher'), `${name}: Trainernotiz wurde nicht gespeichert`);

    await page.getByRole('button', { name: '▶ Start', exact: true }).tap();
    await page.waitForTimeout(1100);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Training fortsetzen/ }).tap();
    await page.getByRole('heading', { name: 'Training Live', exact: true }).waitFor();
    assert(await page.locator('[data-live="block-name"]').innerText() === 'Flex live 5v5', `${name}: Reload verliert den aktuellen Block`);
    assert((await page.locator('[data-live="clock-state"]').innerText()) === 'Läuft', `${name}: Reload verliert die laufende Uhr`);
    await noOverflow('Wiederaufnahme');

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Training beenden & speichern/ }).tap();
    await page.getByRole('heading', { name: 'Trainingsauswertung', exact: true }).waitFor();
    const finished = await page.evaluate(id => window.BT.storage.getTraining(id), trainingId);
    assert(finished.status === 'completed' && finished.endedAt, `${name}: Training wurde nicht abgeschlossen`);
    assert(finished.liveSession.report.completedBlocks === 2, `${name}: Abschlussbericht zählt die Blöcke falsch`);
    assert(finished.liveSession.report.skippedBlocks === 3, `${name}: offene Blöcke werden nicht als übersprungen dokumentiert`);
    assert(await page.locator('.training-live-report-item').count() === 5, `${name}: Trainingsauswertung ist unvollständig`);
    await noOverflow('Auswertung');
    console.log(`Training-Live Browser-E2E erfolgreich: ${name}, Timer, Bewertung, Notiz, Reload und Auswertung.`);
  } catch (error) {
    console.error(`${name} Training-Live-Diagnose:`, page.url(), await page.locator('body').innerText(), errors);
    throw error;
  } finally {
    await context.close();
  }
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
    const opponentAnalysis = await page.locator('.matchday-opponent-analysis').innerText();
    assert(opponentAnalysis.includes('Gegner & Defense') && opponentAnalysis.includes('E2E Guard: 3 Punkte'), `${name}: Gegner- oder Defense-Auswertung fehlt`);
    const player = page.locator('.live-report-player').filter({ hasText: 'E2E Spieler 1' });
    const metrics = await player.locator('.live-report-player-quick dt').evaluateAll(labels =>
      Object.fromEntries(labels.map(label => [label.textContent, label.nextElementSibling.textContent])));
    assert(metrics.PTS === '2' && metrics['+/−'] === '-1', `${name}: Spielerwerte falsch ${JSON.stringify(metrics)}`);
    await player.getByText('Würfe und weitere Werte', { exact: true }).tap();
    assert((await player.innerText()).includes('1/1'), `${name}: Wurfstatistik fehlt`);
    const dnp=page.locator('.live-report-dnp');
    if(await dnp.count())await dnp.locator('> summary').tap();
    assert((await page.locator('[data-role="report"]').innerText()).includes('E2E Spieler 8') === false, `${name}: verletzter Spieler erscheint in der Auswertung`);
    const exportPanel=page.locator('[data-role="game-stats-export"]');
    await exportPanel.waitFor();
    await exportPanel.locator('[data-field="export-source"]').selectOption('live');
    const downloadPromise=page.waitForEvent('download');
    await exportPanel.getByRole('button',{name:'Statistik exportieren',exact:true}).tap();
    const download=await downloadPromise;
    const {readFile}=await import('node:fs/promises');
    const packet=JSON.parse(await readFile(await download.path(),'utf8'));
    assert(packet.format==='courthub.game-stats'&&packet.game.ourScore===null&&packet.game.opponentScore===null,`${name}: Export-Ergebnis falsch`);
    assert(packet.game.teamId==='herren1'&&packet.game.isHome===true&&packet.sourceId==='matchday-e2e',`${name}: Export-Zuordnung falsch`);
    assert(packet.players.find(p=>p.name==='E2E Spieler 1').points===null&&packet.players.find(p=>p.name==='E2E Spieler 1').minutesSeconds===null,`${name}: Export-Spielerwerte fehlen`);
    assert(!packet.players.some(p=>p.name==='E2E Spieler 8'),`${name}: nicht nominierter Spieler exportiert`);
    await page.evaluate(({gameId,playerId})=>{const game=window.BT.storage.getGame(gameId),values=[{playerId,points:999,minutes:999,rebounds:5,assists:3,steals:0,turnovers:2}];if(JSON.stringify(game.playerStats)!==JSON.stringify(values)){game.playerStats=values;window.BT.storage.upsertGame(game);}},{gameId:packet.game.id,playerId:packet.players.find(p=>p.name==='E2E Spieler 1').id});
    await exportPanel.locator('[data-field="export-source"]').selectOption('video');
    const videoDownloadPromise=page.waitForEvent('download');
    await exportPanel.getByRole('button',{name:'Statistik exportieren',exact:true}).tap();
    const videoDownload=await videoDownloadPromise;
    const videoPacket=JSON.parse(await readFile(await videoDownload.path(),'utf8'));
    assert(videoPacket.players[0].reboundsTotal===5&&videoPacket.players[0].assists===3&&videoPacket.players[0].steals===0&&videoPacket.players[0].turnovers===2,`${name}: Video-Werte fehlen`);
    assert(videoPacket.players[0].points===null&&videoPacket.players[0].minutesSeconds===null,`${name}: DBB-Werte im Video-Export`);

    await noOverflow('Auswertung mit aufgeklappten Details');
  }
  try {
    await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'domcontentloaded' });
    await page.locator('#app > *').first().waitFor();
    const gameId = await page.evaluate(() => {
      for (let i = 1; i <= 8; i++) window.BT.storage.upsertPlayer({ name: `E2E Spieler ${i}`, jerseyNumber: String(i) });
      const game = window.BT.storage.upsertGame({ date: window.BT.util.todayISO(), home: 'TSV Lindau', away: 'E2E Gast', source: 'manual' });
      window.BT.storage.upsertOpponent({
        key: 'e2e-gast', name: 'E2E Gast', source: 'manual', games: [game],
        scouting: { insideThreat: 'high', perimeterThreat: 'medium', highPostPassing: 'low', offensiveRebounding: 'medium', primaryScorerArea: 'inside', notes: 'E2E: früher Ringdruck.' },
        manualTotals: {}, playerStats: [{ id: 'e2e-guard', name: 'E2E Guard', games: 3, points: 45, fouls: 6, threeMade: 5, threeAttempted: 14 }]
      });
      return game.id;
    });
    await page.goto(baseUrl + '/#/games', { waitUntil: 'domcontentloaded' });
    await page.locator(`[data-game-id="${gameId}"]`).tap();
    await page.getByRole('button', { name: 'Kader & Starting Five festlegen', exact: true }).tap();
    await page.locator('[data-player-roster][data-status="bench"]').first().waitFor();
    const rosterButtons = page.locator('[data-player-roster][data-status="bench"]');
    assert(await rosterButtons.count() === 8, `${name}: synthetischer Kader fehlt`);
    await page.getByRole('button', { name: 'Weiter zum Gameplan', exact: true }).tap();
    const preparationError=page.locator('[data-role="preparation-error"]');
    await preparationError.waitFor({state:'visible'});
    assert((await preparationError.innerText()).includes('Noch 5 Spieler'), `${name}: fehlender Kader wird nicht erklärt`);
    assert(await preparationError.evaluate(node=>{const rect=node.getBoundingClientRect();return document.activeElement===node&&rect.top>=0&&rect.bottom<=window.innerHeight;}), `${name}: Kaderhinweis bleibt außerhalb des Handy-Ausschnitts`);
    await page.waitForTimeout(700);
    assert(await preparationError.isVisible(), `${name}: Kaderhinweis verschwindet bei der nächsten Controller-Aktualisierung`);
    for (let i = 0; i < 7; i++) await rosterButtons.nth(i).tap();
    await page.locator('[data-player-roster][data-status="injured"]').nth(7).tap();
    assert(await page.evaluate(() => window.BT.storage.getPlayers().find(player => player.name === 'E2E Spieler 8')?.availability) === 'injured', `${name}: Verletzung wird nicht ins Spielerprofil übernommen`);
    await page.getByRole('button', { name: 'Weiter zum Gameplan', exact: true }).tap();
    await preparationError.waitFor({state:'visible'});
    assert((await preparationError.innerText()).includes('Noch 5 Starter'), `${name}: fehlende Starting Five wird nicht erklärt`);
    assert(await page.locator('[data-role="lineup-panel"]').isVisible(), `${name}: Weiter führt nicht direkt zur Starting Five`);
    assert(await preparationError.evaluate(node=>{const rect=node.getBoundingClientRect();return document.activeElement===node&&rect.top>=0&&rect.bottom<=window.innerHeight;}), `${name}: Starterhinweis bleibt außerhalb des Handy-Ausschnitts`);
    const starterButtons = page.locator('[data-player-lineup][data-status="starter"]:visible');
    for (let i = 0; i < 5; i++) await starterButtons.nth(i).tap();
    await page.getByRole('button', { name: 'Kader', exact: true }).tap();
    await page.locator('.matchday-player-details > summary').first().tap();
    await page.locator('[data-player-role]').first().fill('Ballhandler');
    await noOverflow('Kader');
    await page.getByRole('button', { name: 'Gameplan', exact: true }).tap();
    const step=page.locator('[data-role="matchday-step"]');
    await page.locator('[data-field="goals"]').waitFor();
    assert(await step.evaluate(node=>{const rect=node.getBoundingClientRect();return document.activeElement===node&&rect.top>=0&&rect.bottom<=window.innerHeight;}), `${name}: der geöffnete Gameplan bleibt außerhalb des Handy-Ausschnitts`);
    const opponentPlan = await page.locator('.matchday-opponent-plan').innerText();
    assert(opponentPlan.includes('E2E Gast') && opponentPlan.includes('Mannverteidigung · Grundlagen') && !opponentPlan.includes('Start: Zone'), `${name}: aktives Teamkonzept fehlt im Gegnerplan`);
    await page.locator('[data-field="goals"]').fill('Rebounds sichern');
    await noOverflow('Vorbereitung');
    await page.getByRole('button', { name: 'Optionale Angaben überspringen' }).tap();
    await page.getByRole('button', { name: 'Kader freigeben & Live öffnen' }).waitFor();
    assert((await page.locator('.matchday').innerText()).includes('Rebounds sichern'), `${name}: Überspringen verwirft Ziele`);
    await noOverflow('Übersicht');
    await page.getByRole('button', { name: 'Kader freigeben & Live öffnen' }).tap();
    await page.getByRole('button', { name: 'Uhr starten', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Kader ändern', exact: true }).tap();
    const liveRosterPlayer = page.locator('.matchday-pregame-player').filter({ hasText: 'E2E Spieler 6' });
    await liveRosterPlayer.locator('[data-live-roster-jersey]').fill('66');
    await liveRosterPlayer.locator('summary').tap();
    await liveRosterPlayer.locator('select').last().selectOption('pg');
    await liveRosterPlayer.locator('input[type="text"]').last().fill('Backup Ballhandler');
    const removedPlayer = page.locator('.matchday-pregame-player').filter({ hasText: 'E2E Spieler 7' });
    await removedPlayer.locator('[data-live-roster-status]').selectOption('out');
    await page.getByRole('button', { name: 'Kader übernehmen', exact: true }).tap();
    await page.getByRole('button', { name: 'Kader ändern', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Starting Five ändern', exact: true }).tap();
    await page.locator('.live-panel label').filter({hasText:'E2E Spieler 5'}).locator('[data-starting-five-player]').uncheck();
    await page.locator('.live-panel label').filter({hasText:'E2E Spieler 6'}).locator('[data-starting-five-player]').check();
    const saveStartingFive = page.getByRole('button', { name: 'Starting Five übernehmen', exact: true });
    await saveStartingFive.tap();
    await saveStartingFive.waitFor({ state: 'hidden' });
    await noOverflow('Starting Five vor Spielstart geändert');
    await page.goto(baseUrl + '/#/games', { waitUntil: 'domcontentloaded' });
    await page.locator(`[data-game-id="${gameId}"]`).tap();
    const preparationSummary = await page.locator('[data-role="game-preparation-summary"]').innerText();
    assert(/Kader\s+6\b/.test(preparationSummary), `${name}: Spielübersicht übernimmt den geänderten Live-Kader nicht: ${preparationSummary}`);
    assert(/Starting Five\s+5\/5/.test(preparationSummary), `${name}: Spielübersicht übernimmt die geänderte Starting Five nicht: ${preparationSummary}`);
    assert(await page.locator('.game-boxscore [data-player-id]').filter({ hasText: 'E2E Spieler 7' }).count() === 0, `${name}: abgewählter Spieler bleibt in der Spielstatistik`);
    assert(await page.locator('.game-boxscore [data-player-id]').filter({ hasText: 'E2E Spieler 8' }).count() === 0, `${name}: verletzter Spieler bleibt in der Spielstatistik`);
    await page.getByRole('button', { name: 'Spieltag fortsetzen', exact: true }).tap();
    await page.getByRole('button', { name: 'Uhr starten', exact: true }).waitFor();
    assert(await page.getByRole('button', { name: 'Kader ändern', exact: true }).count() === 1, `${name}: dynamischer Kader ist nach Rückkehr vor Spielstart nicht mehr bearbeitbar`);
    await page.getByRole('button', { name: 'Uhr starten', exact: true }).tap();
    await page.getByText('Spiel wirklich starten?', { exact: true }).waitFor();
    assert((await page.locator('.live-panel').innerText()).includes('Kader und Starting Five können danach nicht mehr verändert werden'), `${name}: Warnung vor dem verbindlichen Start fehlt`);
    await page.getByRole('button', { name: 'Spiel verbindlich starten', exact: true }).tap();
    await page.locator('[data-player]').filter({ hasText: 'E2E Spieler 6' }).waitFor();
    assert((await page.locator('.live-players [data-player]').first().innerText()).includes('Point Guard · #66 · E2E Spieler 6'),`${name}: Point Guard steht in der Live-Auswahl nicht zuerst`);
    assert(await page.locator('[data-player]').filter({ hasText: 'E2E Spieler 5' }).count() === 0, `${name}: alter Starter bleibt nach dem bestätigten Start auf dem Feld`);
    await page.getByRole('button', { name: 'Live-Spiel zurücksetzen', exact: true }).tap();
    await page.getByRole('button', { name: 'Ja, Live-Spiel zurücksetzen', exact: true }).tap();
    await page.getByRole('button', { name: 'Kader ändern', exact: true }).waitFor();
    assert(await page.evaluate(id => {
      const live=window.BT.storage.getGame(id).liveStats,session=live.sessions.find(item=>item.id===live.selectedSessionId);
      return live.sessions.length===2&&session.events.length===0&&session.roster.some(player=>player.name==='E2E Spieler 6'&&player.jerseyNumber==='66');
    },gameId), `${name}: sicherer Live-Reset erhält Kader und Trikotnummern nicht`);
    await page.getByRole('button', { name: 'Uhr starten', exact: true }).tap();
    await page.getByRole('button', { name: 'Spiel verbindlich starten', exact: true }).tap();
    await page.locator('[data-player]').filter({ hasText: 'E2E Spieler 6' }).waitFor();
    assert(await page.evaluate(()=>document.body.classList.contains('live-game-active')),`${name}: Live-Modus aktiviert die feste Spieluhr nicht`);
    assert(await page.locator('.mobile-dock').evaluate(element=>getComputedStyle(element).display)==='none',`${name}: untere App-Navigation bleibt im Live-Modus sichtbar`);
    assert(await page.locator('.live-clock').evaluate(element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return style.position==='fixed'&&Math.abs(innerHeight-box.bottom)<2;}),`${name}: Spieluhr sitzt nicht fest am unteren Bildschirmrand`);
    assert(await page.getByRole('button', { name: 'Kader ändern', exact: true }).count() === 0, `${name}: Kader bleibt nach Spielstart veränderbar`);
    assert(await page.getByRole('button', { name: 'Starting Five ändern', exact: true }).count() === 0, `${name}: Starting Five bleibt nach Spielstart veränderbar`);
    await page.getByText(/Gegnerplan ·/).waitFor();
    await page.getByRole('button', { name: 'Paint / Drive +1', exact: true }).tap();
    await page.getByRole('button', { name: 'Paint / Drive +1', exact: true }).tap();
    await page.getByText(/Ball früher stoppen, Hilfe verkürzen/).waitFor();
    assert(await page.getByRole('button', { name: 'Zone 2-3', exact: true }).count() === 0, `${name}: archivierte Zonenverteidigung ist im Live-Spiel weiterhin auswählbar`);
    await page.getByText('Aktuell: Mannverteidigung · Grundlagen', { exact: true }).waitFor();
    await noOverflow('Live-Gegnerscouting');
    await page.getByText('Gameplan & Abschluss', { exact: true }).tap();
    const frozenGameplan = await page.locator('.matchday-frozen-plan').innerText();
    assert(frozenGameplan.includes('Rebounds sichern') && frozenGameplan.includes('Ballhandler'), `${name}: eingefrorener Gameplan fehlt`);
    assert(await page.locator('[data-field="goals"]').count() === 0, `${name}: Gameplan bleibt nach Spielstart bearbeitbar`);
    await page.getByText('Gameplan & Abschluss', { exact: true }).tap();
    await page.getByRole('button', { name: 'Uhr anhalten und wechseln', exact: true }).tap();
    await page.locator('[data-sub-out]').first().waitFor();
    assert(await page.locator('[data-sub-out]').count()===5,`${name}: Wechselmenü zeigt nicht die fünf Feldspieler`);
    await page.locator('[data-sub-out]').filter({hasText:'E2E Spieler 6'}).tap();
    await page.getByRole('button',{name:'Weiter',exact:true}).tap();
    assert(await page.locator('[data-sub-in]').count()===1,`${name}: Wechselmenü zeigt nicht die verfügbaren Bankspieler`);
    await page.locator('[data-sub-in]').filter({hasText:'E2E Spieler 5'}).tap();
    await page.getByRole('button',{name:'Fertig',exact:true}).tap();
    await page.locator('.live-action-sheet').waitFor({state:'hidden'});
    await page.locator('[data-player]').filter({hasText:'E2E Spieler 5'}).waitFor();
    assert(await page.locator('[data-player]').filter({hasText:'E2E Spieler 6'}).count()===0,`${name}: Mehrschritt-Wechsel wurde nicht übernommen`);
    await noOverflow('Wechsel-Untermenüs');
    await page.locator('[data-player]').first().tap();
    await page.locator('.live-action-sheet').waitFor();
    const actionMenu=(await page.locator('.live-action-sheet').innerText()).toLocaleLowerCase('de-DE');
    assert(actionMenu.includes('treffer & fehlwürfe')&&actionMenu.includes('rebound & zusammenspiel')&&actionMenu.includes('defense')&&actionMenu.includes('ballverlust & foul'),`${name}: vollständiges Spieler-Aktionsmenü fehlt`);
    await noOverflow('Spieler-Aktionsmenü');
    await page.getByRole('button', { name: 'Zweier getroffen', exact: true }).tap();
    await page.locator('.live-action-sheet').waitFor({state:'hidden'});
    await page.locator('.live-clock').filter({ hasText: 'Eigene 2' }).waitFor();
    await page.getByRole('button', { name: 'E2E Guard', exact: true }).tap();
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
    assert(await page.evaluate(()=>!document.body.classList.contains('live-game-active')),`${name}: Live-Modus bleibt nach Spielende aktiv`);
    await page.getByText('Gameplan & Abschluss', { exact: true }).tap();
    assert((await page.locator('.matchday-frozen-plan').innerText()).includes('Rebounds sichern'), `${name}: gespeicherte Ziele fehlen`);
    assert(await page.locator('[data-field="closingNote"]').isDisabled(), `${name}: abgeschlossenes Spiel ist nicht gesperrt`);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Bearbeitung freigeben', exact: true }).tap();
    await page.locator('[data-field="closingNote"]').fill('Ausboxen weiter trainieren');
    await page.getByRole('button', { name: 'Abschlussnotiz speichern', exact: true }).tap();
    await page.locator('.matchday details > [role="status"]').filter({ hasText: 'Lokal gesichert' }).waitFor();
    const finished = await page.evaluate(id => window.BT.storage.getGame(id), gameId);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await report();
    await page.getByText('Gameplan & Abschluss', { exact: true }).tap();
    assert(await page.locator('[data-field="closingNote"]').inputValue() === 'Ausboxen weiter trainieren', `${name}: Abschlussnotiz fehlt nach Reload`);
    assert(await page.locator('[data-field="closingNote"]').isDisabled(), `${name}: Reload hebt die Archivsperre auf`);
    assert(JSON.stringify(await page.evaluate(id => window.BT.storage.getGame(id), gameId)) === JSON.stringify(finished), `${name}: Abschluss/Entwurf nach Reload verändert`);
    await noOverflow('Abgeschlossener Spieltag nach Reload');
    // An aggregate published report must supersede a partial manual capture,
    // without rewriting any scoring events, substitutions or frozen gameplan.
    const publishedPacket=await page.evaluate(id=>{
      const game=window.BT.storage.getGame(id),players=window.BT.storage.getPlayers().slice(0,5);
      return {schemaVersion:'courthub.published-game.v1',ownSide:'home',target:{date:game.date,home:game.home,away:game.away},score:'30:93',periodScores:[{period:1,home:7,away:36},{period:2,home:9,away:12},{period:3,home:4,away:18},{period:4,home:10,away:27}],staff:[{role:'coach',name:'Bericht Trainer',playerId:null,alsoPlayer:false,status:'present'}],players:players.map((p,i)=>({playerId:p.id,name:p.name,jerseyNumber:String(i+30),gameStatus:'starter',minutesMs:2400000,points:i===0?30:0,twoMade:i===0?15:0,threeMade:0,freeThrowsMade:0,freeThrowsAttempted:0,fouls:i,plusMinus:-63})),sources:[{url:'https://www.tsv-lindau.de/spielplan/'}]};
    },gameId);
    await page.goto(baseUrl+`/#/games/${gameId}`,{waitUntil:'domcontentloaded'});
    page.once('dialog',dialog=>dialog.dismiss());
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="import-published-report"]').tap();
    assert(await page.locator('[data-role="published-import"]').count()===0,`${name}: Spielbericht umgeht abgelehnte Archivfreigabe`);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="import-published-report"]').tap();
    await page.getByLabel('Spielbericht (JSON)',{exact:true}).fill(JSON.stringify(publishedPacket));
    await page.getByRole('button',{name:'Bericht prüfen',exact:true}).tap();
    await page.locator('[data-role="published-import-status"]').filter({hasText:'Geprüft: 30:93'}).waitFor();
    await noOverflow('Spielbericht-Vorschau');
    await page.getByRole('button',{name:'Spielbericht speichern',exact:true}).tap();
    await page.locator('[data-role="games-status"]').filter({hasText:'Spielbericht mit Endergebnis'}).waitFor();
    assert(await page.evaluate(({id,before})=>JSON.stringify(window.BT.storage.getGame(id).liveStats)===JSON.stringify(before.liveStats)&&JSON.stringify(window.BT.storage.getGame(id).matchday)===JSON.stringify(before.matchday),{id:gameId,before:finished}),`${name}: Import verändert Live-Journal oder Vorbereitung`);
    await page.getByRole('button',{name:'Live-Auswertung',exact:true}).tap();
    await page.locator('[data-role="published-report"] [data-team="own"] strong').filter({hasText:'30'}).waitFor();
    await page.goto(baseUrl+`/#/games/${gameId}/matchday`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-role="published-report"] [data-team="opponent"] strong').filter({hasText:'93'}).waitFor();
    await page.getByText('Quellen und Erfassung',{exact:true}).tap();
    assert((await page.locator('[data-role="published-report"]').innerText()).includes('Manuelle Live-Erfassung: 2:3'),`${name}: Herkunft des ursprünglichen Teilstands fehlt`);
    assert(await page.locator('.matchday-scout-alerts:visible').count()===0,`${name}: abgeschlossene Teil-Erfassung erzeugt aktuelle Gegnerwarnungen`);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-role="published-report"] [data-team="own"] strong').filter({hasText:'30'}).waitFor();
    await noOverflow('Veröffentlichte Auswertung nach Reload');
    console.log(`Matchday Browser-E2E erfolgreich: ${name}, Vorbereitung, Live, Abschluss, Auswertung und zwei Reloads.`);
  } catch (error) {
    console.error(`${name} Matchday-Diagnose:`, page.url(), await page.locator('#app').innerText(), errors);
    throw error;
  } finally {
    await context.close();
  }
}

async function testCoachingStaff(browser, name, options) {
  const context = await browser.newContext({...options, locale:'de-DE', serviceWorkers:'block'});
  const page = await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{
    window.BT={};let sync;
    Object.defineProperty(window.BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState.bind(value);value.getState=()=>({...original(),user:{id:'staff-coach',role:'coach',organization:{id:'staff-e2e'}}});}});
  });
  const noOverflow=async()=>{const sizes=await page.evaluate(()=>[document.documentElement.scrollWidth,document.body.scrollWidth,document.documentElement.clientWidth]);assert(Math.max(sizes[0],sizes[1])<=sizes[2]+1,`${name}: Trainerteam läuft horizontal über`);assert(errors.length===0,`${name}: ${errors.join(' | ')}`);};
  try {
    await page.goto(baseUrl+'/#/dashboard');await page.waitForFunction(()=>window.BT?.staff&&window.BT?.storage);
    const data=await page.evaluate(()=>{
      const players=Array.from({length:6},(_,i)=>window.BT.storage.upsertPlayer({name:i===0?'Ernesto Testtrainer':`Staff-Test Spieler ${i}`,jerseyNumber:String(i)}));
      const training=window.BT.storage.upsertTraining({date:'2026-10-06',attendance:players.map(p=>({playerId:p.id,status:'present'})),plan:{drills:[]}});
      const game=window.BT.storage.upsertGame({date:window.BT.util.todayISO(),home:'TSV Lindau',away:'Staff-Test Gast',source:'manual'});
      return {players:players.map(p=>p.id),training:training.id,game:game.id};
    });
    await page.goto(baseUrl+'/#/training/'+data.training);
    await page.locator('[data-role="staff-editor"] > summary').tap();
    await page.getByLabel('Trainer: Person',{exact:true}).selectOption(data.players[0]);
    await page.getByLabel('Co-Trainer: Person',{exact:true}).selectOption('external');
    await page.getByLabel('Co-Trainer: Name',{exact:true}).fill('Externer Test Co-Trainer');
    await page.getByLabel('Co-Trainer: Anwesenheit',{exact:true}).selectOption('present');
    await page.locator('[data-role="summary"]').filter({hasText:'Gesamt 5'}).waitFor();await noOverflow();
    await page.reload();await page.locator('[data-role="staff-editor"] > summary').tap();await page.getByLabel('Trainer: Person',{exact:true}).waitFor();
    assert(await page.getByLabel('Trainer: Person',{exact:true}).inputValue()===data.players[0],`${name}: Trainer fehlt nach Reload`);
    assert(await page.getByLabel('Co-Trainer: Name',{exact:true}).inputValue()==='Externer Test Co-Trainer',`${name}: Co-Trainer fehlt nach Reload`);
    await page.getByLabel('Trainer: Auch als Spieler',{exact:true}).check();
    await page.locator('[data-role="summary"]').filter({hasText:'Gesamt 6'}).waitFor();
    await page.getByLabel('Trainer: Auch als Spieler',{exact:true}).uncheck();await noOverflow();
    if(name==='320 px' && process.env.E2E_STAFF_SCREENSHOT)await page.screenshot({path:process.env.E2E_STAFF_SCREENSHOT,fullPage:true});
    await page.goto(baseUrl+'/#/games');await page.locator(`[data-game-id="${data.game}"]`).tap();
    await page.getByRole('button',{name:'Kader & Starting Five festlegen',exact:true}).tap();
    const roster=page.locator('[data-player-roster][data-status="bench"]');await roster.first().waitFor();
    for(let i=0;i<6;i++)await roster.nth(i).tap();
    await page.getByRole('button',{name:'Starting Five',exact:true}).tap();
    for(const id of data.players.slice(0,5))await page.locator(`[data-player-lineup="${id}"][data-status="starter"]`).tap();
    await page.locator('[data-role="staff-editor"] > summary').tap();
    await page.getByLabel('Trainer: Person',{exact:true}).selectOption(data.players[0]);
    await page.getByLabel('Co-Trainer: Person',{exact:true}).selectOption('external');
    await page.getByLabel('Co-Trainer: Name',{exact:true}).fill('Spiel Co-Trainer');
    await page.getByLabel('Co-Trainer: Anwesenheit',{exact:true}).selectOption('present');
    assert((await page.locator('[data-role="selection-summary"]').innerText()).includes('4/5'),`${name}: Trainer zählt weiter als Starter`);
    await page.locator(`[data-player-lineup="${data.players[5]}"][data-status="starter"]`).tap();
    await noOverflow();
    await page.getByRole('button',{name:'Vorbereitung speichern',exact:true}).tap();
    await page.locator('.matchday > [role="status"]').filter({hasText:'Lokal gesichert'}).waitFor();
    await page.reload();await page.locator('[data-role="staff-editor"] > summary').tap();await page.getByLabel('Trainer: Person',{exact:true}).waitFor();
    assert(await page.getByLabel('Co-Trainer: Name',{exact:true}).inputValue()==='Spiel Co-Trainer',`${name}: Spiel-Co-Trainer fehlt nach Reload`);
    await page.getByRole('button',{name:'Weiter zum Gameplan',exact:true}).tap();
    await page.getByRole('button',{name:'Optionale Angaben überspringen',exact:true}).tap();
    await page.getByRole('button',{name:'Kader freigeben & Live öffnen',exact:true}).tap();
    await page.locator('[data-role="live-staff"]').filter({hasText:'Spiel Co-Trainer'}).waitFor();
    assert(await page.evaluate(({game,coach})=>{const live=window.BT.storage.getGame(game).liveStats;const session=live.sessions.find(s=>s.id===live.selectedSessionId);return session.roster.length===5&&!session.roster.some(p=>p.id===coach)&&session.gameplan.staff.length===2;},{game:data.game,coach:data.players[0]}),`${name}: Trainer belegt einen Live-Spielerplatz`);
    await noOverflow();console.log(`Trainerteam Browser-E2E erfolgreich: ${name}, Training, Spielertrainer, Spielkader und Reload.`);
  } finally {await context.close();}
}

const browser = await chromium.launch({ headless: true, ...(process.env.E2E_BROWSER_PATH ? { executablePath: process.env.E2E_BROWSER_PATH } : {}) });
try {
  if (!process.env.E2E_SCREEN_ONLY && !process.env.E2E_STAFF_ONLY && !process.env.E2E_MATCHDAY_ONLY) {
    await verifyGameArchive(browser, devices['iPhone 13'], 'iPhone', baseUrl);
    await verifyGameArchive(browser, {...devices['iPhone SE'], viewport: {width: 320, height: 568}}, '320 px', baseUrl);
    await verifyMobileCoaching(browser, devices['iPhone 13'], 'iPhone', baseUrl);
    await verifyMobileCoaching(browser, {...devices['iPhone SE'], viewport: {width: 320, height: 568}}, '320 px', baseUrl);
  }
  if (!process.env.E2E_SCREEN_ONLY) {
    await testCoachingStaff(browser, 'iPhone 15', devices['iPhone 15']);
    await testCoachingStaff(browser, '320 px', {...devices['iPhone 15'], viewport:{width:320,height:720}});
  }
  if (process.env.E2E_STAFF_ONLY) {
    console.log('CourtHub Trainerteam-Browserabnahme erfolgreich.');
  } else if (process.env.E2E_SCREEN_ONLY) {
    await testScreenAcademy(browser, 'iPhone 15', devices['iPhone 15']);
    await testScreenAcademy(browser, '320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } });
  } else if (!process.env.E2E_MATCHDAY_ONLY) {
    await testDesktop(browser);
    await testTablet(browser);
    await testIPhone(browser);
    await testScreenAcademy(browser, 'iPhone 15', devices['iPhone 15']);
    await testScreenAcademy(browser, '320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } });
    await testTrainingLive(browser, 'iPhone 15', devices['iPhone 15']);
    await testTrainingLive(browser, '320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } });
  }
  if (!process.env.E2E_SCREEN_ONLY && !process.env.E2E_STAFF_ONLY) {
    await testMatchday(browser, 'iPhone 15', devices['iPhone 15']);
    await testMatchday(browser, '320 px', { ...devices['iPhone 15'], viewport: { width: 320, height: 720 } });
  }
  console.log(process.env.E2E_STAFF_ONLY
    ? 'CourtHub Trainerteam Browser-E2E erfolgreich: iPhone und 320 px.'
    : process.env.E2E_SCREEN_ONLY
    ? 'CourtHub Screen-Akademie Browser-E2E erfolgreich: iPhone und 320 px.'
    : process.env.E2E_MATCHDAY_ONLY
    ? 'CourtHub Matchday Browser-E2E erfolgreich: iPhone und 320 px.'
    : 'CourtHub Browser-E2E erfolgreich: Play Editor 2.0, Desktop, Tablet, iPhone, Freitagstationen und Training Live (iPhone/320 px), zehn Spieler, Drag-and-drop, Videoimport und Matchday (iPhone/320 px).');
} finally {
  await browser.close();
}
