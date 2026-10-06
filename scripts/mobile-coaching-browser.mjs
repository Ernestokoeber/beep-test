import assert from 'node:assert/strict';

export async function verifyMobileCoaching(browser, contextOptions, name, baseUrl) {
  const context = await browser.newContext({...contextOptions, serviceWorkers: 'block'});
  const page = await context.newPage();
  await page.emulateMedia({reducedMotion: 'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = async label => {
    const sizes = await page.evaluate(() => ({width: document.documentElement.clientWidth,
      doc: document.documentElement.scrollWidth, body: document.body.scrollWidth}));
    assert(Math.max(sizes.doc, sizes.body) <= sizes.width + 1, `${name}: ${label} overflow ${JSON.stringify(sizes)}`);
    assert.equal(errors.length, 0, `${name}: ${label} browser errors ${errors.join(' | ')}`);
  };
  try {
    await page.goto(baseUrl + '/#/dashboard');
    await page.locator('.mobile-home').waitFor();
    const data = await page.evaluate(() => {
      const BT = window.BT;
      const regular = BT.storage.upsertPlayer({name: 'Regelmäßiger Spieler'});
      const newcomer = BT.storage.upsertPlayer({name: 'Erstes Training'});
      const today = BT.util.todayISO();
      const past = new Date(today + 'T12:00:00'); past.setDate(past.getDate() - 10);
      for (let i = 0; i < 8; i++) { past.setDate(past.getDate() + 1);
        BT.storage.upsertTraining({date: past.toISOString().slice(0, 10), endedAt: new Date().toISOString(),
          attendance: [{playerId: regular.id, status: i < 6 ? 'present' : 'absent'}, ...(i === 7 ? [{playerId: newcomer.id, status: 'present'}] : [])]});
      }
      const training = BT.storage.upsertTraining({date: today, startTime: '20:15', location: 'Trainingshalle',
        attendance: [{playerId: regular.id, status: 'present'}, {playerId: newcomer.id, status: null}],
        plan: {summary: 'PnR und frühe Rückrotation', durationMinutes: 30, drills: [{name: 'Pick-and-Roll', minutes: 15, description: 'Screen eng nutzen; Roller lesen'}, {name: 'Umschalten', minutes: 15, description: 'Ball stoppen'}]}});
      const game = BT.storage.upsertGame({date: today, home: 'TSV Lindau', away: 'Illertal', source: 'manual', team: 'herren',
        coachSummary: 'GAMEPLAN – Historische Hinweise\n' + 'PnR Reads & Rückrotation. '.repeat(90)});
      BT.storage.setActiveSeason('all');
      return {training: training.id, regular: regular.id, game: game.id, gameplan: game.coachSummary};
    });
    await page.reload(); await page.locator('.mobile-home').waitFor();
    const header = await page.locator('.topbar').boundingBox();
    assert(header.y <= 1 && header.height < 100, `${name}: header must stay compact at the top ${JSON.stringify(header)}`);
    assert.equal(await page.locator('#app [data-role="top-att"], #app [data-role="team-heat-wrap"], #app [data-action="share-backup"]').count(), 0);
    await page.locator('[data-role="next-training-card"]').filter({hasText: 'Training öffnen'}).waitFor();
    assert.equal(await page.locator('.mobile-dock a').count(), 3);
    await check('Start');
    if (process.env.E2E_MOBILE_HOME_SCREENSHOT && name === '320 px') await page.screenshot({path: process.env.E2E_MOBILE_HOME_SCREENSHOT, fullPage: true});

    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-role="nav"] a[href="#/statistics"]').tap();
    await page.locator('.statistics-view').waitFor();
    await page.locator('[data-role="top-att"]').filter({hasText: 'Regelmäßiger Spieler'}).waitFor();
    assert(!(await page.locator('[data-role="top-att"]').innerText()).includes('Erstes Training'));
    await page.locator('.provisional-attendance > summary').tap();
    await page.locator('[data-role="attendance-provisional"]').filter({hasText: 'Erstes Training'}).waitFor();
    assert.equal(await page.locator('[data-role="attendance-provisional"] .rank-pos').count(), 0);
    await check('Statistik');
    await page.reload(); await page.locator('.statistics-view').waitFor();
    await check('Statistik nach Reload');

    await page.locator('[data-role="mobile-more"]').tap();
    await page.locator('[data-role="nav"] a[href="#/briefing"]').tap();
    await page.locator('.briefing-view').waitFor();
    await page.locator('[data-role="briefing-blocks"] > summary').tap();
    await page.locator('.briefing-block').filter({hasText: 'Screen eng nutzen'}).waitFor();
    await check('Trainerbriefing');
    await page.locator('.briefing-section > summary').filter({hasText: 'Aktuelles Teamkonzept'}).tap();
    await page.locator('.briefing-section a[href="#/schedule/team-concept"]').tap();
    await page.locator('.season-ai-panel').waitFor();
    await check('Teamkonzept direkt aus dem Briefing');

    await page.locator('[data-role="mobile-more"]').tap();
    await page.locator('[data-role="nav"] a[href="#/data"]').tap();
    await page.locator('.data-view').waitFor();
    assert(await page.locator('[data-action="share-backup"]').isVisible());
    await check('Daten und Export');

    await page.goto(baseUrl + '/#/training/' + data.training);
    await page.locator('.training-plan-preview').waitFor();
    assert(await page.locator('[data-action="training-live"]').isVisible());
    assert(!(await page.locator('.subnav-btn[data-pane="ft"]').isVisible()));
    assert(!(await page.locator('[data-role="team-quote"]').isVisible()));
    await check('Training');
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="ft"]').tap();
    await page.locator('.pane[data-pane="ft"]:not(.hidden)').waitFor();
    assert(!(await page.locator('[data-role="nav"]').isVisible()));
    await check('Wurferfassung im Menü');
    await page.locator('.subnav-btn[data-pane="overview"]').tap();
    await page.locator('[data-action="open-plan"]').tap();
    await page.locator('.pane[data-pane="plan"]:not(.hidden)').waitFor();
    await check('Plan bearbeiten');
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="analysis"]').tap();
    await page.locator('.pane[data-pane="analysis"]:not(.hidden)').waitFor();
    await check('Trainingsauswertung im Menü');
    await page.locator('[data-role="mobile-more"]').tap();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-role="hamburger"]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#app').evaluate(node => node.inert), false);
    await page.goto(baseUrl + '/#/schedule');
    await page.locator('[data-role="upcoming"]').waitFor();
    assert(!(await page.locator('.season-ai-panel').isVisible()));
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="Saisonplanung und Teamkonzept"]').tap();
    await page.locator('.season-ai-panel').waitFor();
    await check('Saisonplanung im Menü');
    await page.goto(baseUrl + '/#/player/' + data.regular);
    await page.locator('[data-role="goal-list"]').waitFor();
    assert(!(await page.locator('[data-role="player-stats"]').isVisible()));
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="Spielerstatistik und Verlauf"]').tap();
    await page.locator('[data-role="player-stats"]').waitFor();
    await check('Spielerstatistik im Menü');
    await page.goto(baseUrl + '/#/games');
    await page.locator('[data-role="game-list"] [data-game-id]').first().tap();
    await page.locator('[data-action="open-matchday"]').waitFor();
    assert(!(await page.locator('.atlas-panel').isVisible()));
    await page.locator('[data-role="hamburger"]').tap();
    await page.locator('[data-context-action="Geprüfte Videoanalyse"]').tap();
    await page.locator('.atlas-panel').waitFor();
    await check('Videoanalyse im Menü');
    await page.goto(baseUrl + '/#/opponents');
    await page.locator('.opponent-game-note-text').waitFor();
    assert.equal(await page.locator('.opponent-game-note-text').textContent(), data.gameplan.trim());
    await check('Vollständiger verknüpfter Gameplan');
    await page.locator('.opponent-game-notes a').tap();
    await page.locator('[data-game-field="coachSummary"]').waitFor();
    assert.equal(await page.locator('[data-game-field="coachSummary"]').inputValue(), data.gameplan);
    assert.equal(await page.locator('.game-list-card.active').getAttribute('data-game-id'), data.game);
    await check('Gameplan öffnet richtiges Spiel');
    await page.locator('[data-game-field="coachSummary"]').fill('GAMEPLAN – Aktualisiert');
    await page.waitForTimeout(500); // The existing game editor saves after its 350 ms debounce.
    assert.equal(await page.evaluate(id => window.BT.storage.getGame(id)?.coachSummary, data.game), 'GAMEPLAN – Aktualisiert');
    await page.goto(baseUrl + '/#/opponents');
    assert.equal(await page.locator('.opponent-game-note-text').textContent(), 'GAMEPLAN – Aktualisiert');
    await page.reload();
    await page.locator('.opponent-game-note-text').waitFor();
    assert.equal(await page.locator('.opponent-game-note-text').textContent(), 'GAMEPLAN – Aktualisiert');
    console.log(`CourtHub: ${name} · mobile Startseite, Menüs, Statistik, Briefing, Trainingsdetails und Reload erfolgreich.`);
  } finally { await context.close(); }
}
