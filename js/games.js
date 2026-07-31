window.BT = window.BT || {};

BT.games = (function() {
  const { $, renderTemplate, escapeHTML, formatDate, todayISO } = BT.util;
  let root = null;
  let selectedGameId = null;

  function render(target) {
    root = renderTemplate('tpl-games');
    target.appendChild(root);
    const form = $('[data-role="game-form"]', root);
    const status = $('[data-role="games-status"]', root);
    const teamFilter = $('[data-role="games-team"]', root);
    const search = $('[data-role="games-search"]', root);

    $('[data-action="new-game"]', root).addEventListener('click', () => openForm());
    $('[data-action="cancel-game"]', root).addEventListener('click', closeForm);
    teamFilter.addEventListener('change', drawList);
    search.addEventListener('input', drawList);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = form.elements;
      const game = BT.storage.upsertGame({
        id: fields.id.value || undefined, team: fields.team.value,
        date: fields.date.value, time: fields.time.value,
        home: fields.home.value.trim(), away: fields.away.value.trim(),
        score: fields.score.value.trim(), source: 'manual',
        status: fields.score.value.trim() ? 'played' : 'upcoming'
      });
      selectedGameId = game.id;
      closeForm(); drawList(); drawDetail();
    });

    $('[data-action="sync-games"]', root).addEventListener('click', async event => {
      const button = event.currentTarget;
      if (!BT.api.getToken()) { location.hash = '#/account'; return; }
      button.disabled = true; status.textContent = 'TSV-Spielplan wird geladen …';
      try {
        const result = await BT.api.syncWebsiteGames();
        result.games.forEach(game => BT.storage.upsertGame(game));
        status.textContent = result.games.length + ' Spiele von der TSV-Webseite synchronisiert.';
        drawList(); if (selectedGameId) drawDetail();
      } catch (error) { status.textContent = error.message; }
      finally { button.disabled = false; }
    });

    $('[data-action="import-atlas"]', root).addEventListener('click', importAtlasFile);
    drawList();
  }

  function openForm(game) {
    const form = $('[data-role="game-form"]', root);
    form.classList.remove('hidden');
    form.elements.id.value = game && game.id || '';
    form.elements.team.value = game && game.team || 'herren';
    form.elements.date.value = game && game.date || todayISO();
    form.elements.time.value = game && game.time || '';
    form.elements.home.value = game && game.home || 'TSV Lindau';
    form.elements.away.value = game && game.away || '';
    form.elements.score.value = game && game.score || '';
    form.elements.away.focus();
  }

  function closeForm() {
    const form = $('[data-role="game-form"]', root);
    form.reset(); form.classList.add('hidden');
  }

  function drawList() {
    const list = $('[data-role="game-list"]', root);
    const empty = $('[data-role="games-empty"]', root);
    const team = $('[data-role="games-team"]', root).value;
    const query = $('[data-role="games-search"]', root).value.trim().toLowerCase();
    const games = BT.storage.getGames().filter(game => {
      if (team !== 'all' && game.team !== team) return false;
      return !query || (game.home + ' ' + game.away).toLowerCase().includes(query);
    });
    empty.classList.toggle('hidden', games.length > 0);
    list.innerHTML = games.map(game => {
      const isHome = /lindau/i.test(game.home || '');
      const opponent = isHome ? game.away : game.home;
      const selected = game.id === selectedGameId;
      return `<li><button class="game-list-card ${selected ? 'active' : ''}" type="button" data-game-id="${game.id}">
        <span class="game-team">${game.team === 'u18' ? 'U18' : 'Herren'} · ${formatDate(game.date)}</span>
        <strong>${isHome ? 'vs.' : '@'} ${escapeHTML(opponent || 'Gegner offen')}</strong>
        <span class="game-list-meta">${escapeHTML(game.time || '')}${game.score ? ' · ' + escapeHTML(game.score) : ' · geplant'}${game.atlas ? ' · Atlas ✓' : ''}</span>
      </button></li>`;
    }).join('');
    list.querySelectorAll('[data-game-id]').forEach(button => button.addEventListener('click', () => {
      selectedGameId = button.dataset.gameId; drawList(); drawDetail();
    }));
  }

  function saveGame(game) { BT.storage.upsertGame(game); }

  function drawDetail() {
    const wrap = $('[data-role="game-detail"]', root);
    const game = BT.storage.getGame(selectedGameId);
    if (!game) { wrap.innerHTML = '<div class="empty empty--field"><p class="empty-body">Spiel auswählen.</p></div>'; return; }
    game.playerStats = Array.isArray(game.playerStats) ? game.playerStats : [];
    const analysis = normalizedAtlas(game.atlas && game.atlas.package);
    const scoreParts = String(game.score || '').match(/(\d+)\s*:\s*(\d+)/);
    const lindauHome = /lindau/i.test(game.home || '');
    const result = scoreParts ? ((lindauHome ? Number(scoreParts[1]) > Number(scoreParts[2]) : Number(scoreParts[2]) > Number(scoreParts[1])) ? 'Sieg' : 'Niederlage') : 'Anstehend';
    const players = BT.storage.getPlayers().filter(player => !player.archived).sort((a, b) => a.name.localeCompare(b.name, 'de'));

    wrap.innerHTML = `<div class="game-detail-head">
      <div><span class="section-kicker">${escapeHTML(game.team === 'u18' ? 'U18' : 'Herren')} · ${escapeHTML(result)}</span><h3>${escapeHTML(game.home)} <span>${escapeHTML(game.score || '–:–')}</span> ${escapeHTML(game.away)}</h3><p class="muted">${formatDate(game.date)}${game.time ? ' · ' + escapeHTML(game.time) + ' Uhr' : ''} · Quelle: ${game.source === 'tsv-website' ? 'TSV-Webseite' : 'manuell'}</p></div>
      <div class="head-actions"><button class="btn small" data-action="edit-selected">Bearbeiten</button><button class="btn small" data-action="share-game">Bericht teilen</button></div>
    </div>

    <div class="game-observation-grid">
      <label>Was hat funktioniert?<textarea data-game-field="strengths" rows="4" placeholder="Stärken, erfolgreiche Lineups, gute Entscheidungen …">${escapeHTML(game.strengths || '')}</textarea></label>
      <label>Was müssen wir verbessern?<textarea data-game-field="improvements" rows="4" placeholder="Konkrete Spielsituationen und Trainingsbedarf …">${escapeHTML(game.improvements || '')}</textarea></label>
      <label>Trainerfazit<textarea data-game-field="coachSummary" rows="4" placeholder="Kurzes internes Fazit …">${escapeHTML(game.coachSummary || '')}</textarea></label>
    </div>

    <section class="atlas-panel ${analysis ? 'has-analysis' : ''}">
      <div class="atlas-head"><div><span class="section-kicker">Project Atlas</span><h3>Geprüfte Spielanalyse</h3></div>${analysis ? '<span class="att-chip ok">Analyse verbunden</span>' : '<span class="att-chip muted-chip">Noch nicht verbunden</span>'}</div>
      <div class="atlas-connect"><label class="grow">Atlas-Spiel-ID<input data-role="atlas-game-id" value="${escapeHTML(game.atlasGameId || '')}" placeholder="Game-ID aus Project Atlas"></label><button class="btn small primary" type="button" data-action="load-atlas">Analyse laden</button></div>
      <p class="auth-status" data-role="atlas-status"></p>
      ${analysis ? renderAtlas(analysis) : '<p class="muted">Nach dem Review in Project Atlas wird der echte Vertrag <code>game-analysis-overview.v1</code> übernommen. Nur validierte Events fließen in die Statistiken ein.</p>'}
    </section>

    <section class="boxscore-panel"><div class="section-head"><div><span class="section-kicker">Spieldaten</span><h3>Spieler-Boxscore &amp; Coaching-Notizen</h3></div></div>
      <div class="table-scroll"><table class="results game-boxscore"><thead><tr><th>Spieler</th><th>Min</th><th>PTS</th><th>FG</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>+/−</th><th>Notiz</th></tr></thead><tbody>
      ${players.map(player => {
        const stat = game.playerStats.find(item => item.playerId === player.id) || {};
        const numberInput = key => '<input type="number" inputmode="numeric" data-stat="' + key + '" value="' + (stat[key] == null ? '' : Number(stat[key])) + '">';
        const pairInput = (madeKey, attemptKey) => '<span class="stat-pair">' + numberInput(madeKey) + '<i>/</i>' + numberInput(attemptKey) + '</span>';
        return `<tr data-player-id="${player.id}"><td><a href="#/player/${player.id}">${escapeHTML(player.name)}</a>${stat.atlasEntityId ? '<span class="atlas-linked" title="Atlas-ID: ' + escapeHTML(stat.atlasEntityId) + '">Atlas</span>' : ''}</td><td>${numberInput('minutes')}</td><td>${numberInput('points')}</td><td>${pairInput('fieldGoalsMade','fieldGoalsAttempted')}</td><td>${pairInput('freeThrowsMade','freeThrowsAttempted')}</td><td>${numberInput('rebounds')}</td><td>${numberInput('assists')}</td><td>${numberInput('steals')}</td><td>${numberInput('blocks')}</td><td>${numberInput('turnovers')}</td><td>${numberInput('fouls')}</td><td>${numberInput('plusMinus')}</td><td><input type="text" maxlength="160" data-stat="note" value="${escapeHTML(stat.note || '')}" placeholder="Beobachtung"></td></tr>`;
      }).join('')}</tbody></table></div>
    </section>

    <div class="game-next-actions"><button class="btn primary" type="button" data-action="create-training">Aus Spielanalyse Training erstellen</button><button class="btn danger" type="button" data-action="delete-game">Spiel löschen</button></div>`;

    let saveTimer = null;
    wrap.querySelectorAll('[data-game-field]').forEach(input => input.addEventListener('input', () => {
      game[input.dataset.gameField] = input.value;
      clearTimeout(saveTimer); saveTimer = setTimeout(() => saveGame(game), 350);
    }));
    wrap.querySelectorAll('[data-player-id]').forEach(row => row.querySelectorAll('[data-stat]').forEach(input => input.addEventListener('change', () => {
      let stat = game.playerStats.find(item => item.playerId === row.dataset.playerId);
      if (!stat) { stat = { playerId: row.dataset.playerId }; game.playerStats.push(stat); }
      stat[input.dataset.stat] = input.dataset.stat === 'note' ? input.value : (input.value === '' ? null : Number(input.value));
      saveGame(game);
    })));
    $('[data-action="edit-selected"]', wrap).addEventListener('click', () => openForm(game));
    $('[data-action="load-atlas"]', wrap).addEventListener('click', () => loadAtlas(game));
    $('[data-action="create-training"]', wrap).addEventListener('click', () => createTrainingFromGame(game, analysis));
    $('[data-action="share-game"]', wrap).addEventListener('click', () => shareGame(game, analysis));
    $('[data-action="delete-game"]', wrap).addEventListener('click', () => {
      if (!confirm('Spiel und interne Spielnotizen löschen?')) return;
      BT.storage.deleteGame(game.id); selectedGameId = null; drawList(); drawDetail();
    });
  }

  function normalizedAtlas(pkg) {
    if (!pkg || typeof pkg !== 'object') return null;
    if (pkg.schema_version === 'game-analysis-overview.v1') return normalizeGameAnalysisOverview(pkg);
    const analysis = pkg.analysis || pkg.websiteSummary || pkg.summary || pkg;
    const asList = value => Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    return {
      schemaVersion: pkg.schemaVersion || 'atlas.website-package.v1',
      revision: pkg.analysisRevision || pkg.revision || null,
      reviewStatus: pkg.reviewStatus || analysis.reviewStatus || 'freigegeben',
      confidence: analysis.confidence == null ? pkg.confidence : analysis.confidence,
      summary: analysis.text || analysis.summary || analysis.narrative || '',
      strengths: asList(analysis.strengths || analysis.positives),
      improvements: asList(analysis.improvements || analysis.weaknesses),
      trainingFocus: asList(analysis.trainingFocus || analysis.trainingRecommendations || analysis.recommendations),
      evidence: asList(analysis.evidence || pkg.publicClips).slice(0, 8),
      checksum: pkg.checksum || null
    };
  }

  function normalizeGameAnalysisOverview(pkg) {
    const totals = pkg.totals || {};
    const verification = pkg.verification || {};
    const events = Array.isArray(pkg.events) ? pkg.events : [];
    const validated = events.filter(event => event.verification_status === 'validated');
    const confidence = validated.length
      ? validated.reduce((sum, event) => sum + (Number(event.confidence) || 0), 0) / validated.length
      : null;
    const pct = (made, attempted) => attempted ? Math.round((Number(made || 0) / Number(attempted)) * 100) : null;
    const fgPct = pct(totals.field_goals_made, totals.field_goals_attempted);
    const ftPct = pct(totals.free_throws_made, totals.free_throws_attempted);
    const strengths = [];
    const improvements = [];
    const trainingFocus = [];

    if (Number(totals.assists) > Number(totals.turnovers)) strengths.push('Positive Assist-Turnover-Bilanz: ' + totals.assists + ':' + totals.turnovers);
    if (Number(totals.steals) > 0) strengths.push(totals.steals + ' verifizierte Ballgewinne');
    if (fgPct != null && fgPct >= 45) strengths.push('Feldwurfquote ' + fgPct + ' %');
    if (Number(totals.turnovers) > Number(totals.assists)) {
      improvements.push('Turnover reduzieren und Entscheidungen vereinfachen (' + totals.turnovers + ' TO / ' + totals.assists + ' AST)');
      trainingFocus.push('Ballkontrolle, Spacing und Entscheidungen gegen Druck');
    }
    if (fgPct != null && fgPct < 45) {
      improvements.push('Wurfqualität verbessern: ' + fgPct + ' % aus dem Feld');
      trainingFocus.push('Shot Selection, Paint Touches und Abschluss unter Kontakt');
    }
    if (ftPct != null && ftPct < 70) {
      improvements.push('Freiwurfquote stabilisieren: ' + ftPct + ' %');
      trainingFocus.push('Freiwurfroutine unter Belastung');
    }
    if (!trainingFocus.length) trainingFocus.push('Verifizierte Spielsituationen in Entscheidungstraining übertragen');

    const totalEvents = Number(verification.total_events || events.length);
    const verifiedEvents = Number(verification.verified_events || validated.length);
    const openReviews = Number(verification.open_reviews || 0);
    const summary = verifiedEvents + ' von ' + totalEvents + ' Events verifiziert' +
      (openReviews ? '; ' + openReviews + ' Review-Aufgaben sind noch offen.' : '. Alle reviewpflichtigen Ereignisse sind bearbeitet.');
    const roster = BT.storage.getPlayers();
    const atlasPlayers = Array.isArray(pkg.players) ? pkg.players : [];
    const unmappedPlayers = atlasPlayers.filter(line => !roster.some(player => atlasEntityMatchesPlayer(line.entity_id, player)));

    return {
      schemaVersion: pkg.schema_version,
      revision: pkg.latest_job_id || null,
      reviewStatus: openReviews ? openReviews + ' offen' : 'geprüft',
      confidence, summary, strengths, improvements, trainingFocus,
      evidence: validated.slice(0, 8).map(event => event.event_type + ' @ ' + formatEventTime(event.timestamp_seconds)),
      checksum: null,
      totals, verification, events, players: atlasPlayers,
      scoreboard: pkg.scoreboard || null,
      qualityReport: pkg.quality_report || {},
      unmappedPlayers
    };
  }

  function formatEventTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(Math.floor(value % 60)).padStart(2, '0');
  }

  function atlasEntityMatchesPlayer(entityId, player) {
    const entity = String(entityId || '').trim().toLowerCase();
    if (!entity) return false;
    if (String(player.atlasPlayerId || '').trim().toLowerCase() === entity) return true;
    if (String(player.id || '').toLowerCase() === entity) return true;
    const jersey = String(player.jerseyNumber || '').replace(/^#/, '').trim().toLowerCase();
    return !!jersey && (entity === jersey || entity === '#' + jersey || entity === 'player-' + jersey);
  }

  function applyAtlasPlayerStats(game, pkg) {
    if (!pkg || pkg.schema_version !== 'game-analysis-overview.v1' || !Array.isArray(pkg.players)) return;
    game.playerStats = Array.isArray(game.playerStats) ? game.playerStats : [];
    const roster = BT.storage.getPlayers();
    for (const line of pkg.players) {
      const player = roster.find(item => atlasEntityMatchesPlayer(line.entity_id, item));
      if (!player) continue;
      let stat = game.playerStats.find(item => item.playerId === player.id);
      if (!stat) { stat = { playerId: player.id }; game.playerStats.push(stat); }
      Object.assign(stat, {
        atlasEntityId: line.entity_id,
        points: Number(line.points || 0),
        fieldGoalsMade: Number(line.field_goals_made || 0),
        fieldGoalsAttempted: Number(line.field_goals_attempted || 0),
        freeThrowsMade: Number(line.free_throws_made || 0),
        freeThrowsAttempted: Number(line.free_throws_attempted || 0),
        assists: Number(line.assists || 0),
        rebounds: Number(line.rebounds || 0),
        steals: Number(line.steals || 0),
        blocks: Number(line.blocks || 0),
        turnovers: Number(line.turnovers || 0),
        fouls: Number(line.fouls || 0)
      });
    }
    if (!game.score && pkg.scoreboard) game.score = pkg.scoreboard.home_score + ':' + pkg.scoreboard.away_score;
  }

  function renderAtlas(analysis) {
    return `<div class="atlas-analysis">
      ${analysis.summary ? '<p class="atlas-summary">' + escapeHTML(analysis.summary) + '</p>' : ''}
      <div class="atlas-analysis-grid"><div><strong>Stärken</strong><ul>${analysis.strengths.map(item => '<li>' + escapeHTML(item) + '</li>').join('') || '<li>–</li>'}</ul></div><div><strong>Verbesserungen</strong><ul>${analysis.improvements.map(item => '<li>' + escapeHTML(item) + '</li>').join('') || '<li>–</li>'}</ul></div><div><strong>Trainingsfokus</strong><ul>${analysis.trainingFocus.map(item => '<li>' + escapeHTML(item) + '</li>').join('') || '<li>–</li>'}</ul></div></div>
      ${analysis.totals ? '<div class="atlas-stat-strip"><span><strong>' + Number(analysis.totals.points || 0) + '</strong> PTS</span><span><strong>' + Number(analysis.totals.assists || 0) + '</strong> AST</span><span><strong>' + Number(analysis.totals.rebounds || 0) + '</strong> REB</span><span><strong>' + Number(analysis.totals.steals || 0) + '</strong> STL</span><span><strong>' + Number(analysis.totals.turnovers || 0) + '</strong> TO</span></div>' : ''}
      ${analysis.unmappedPlayers && analysis.unmappedPlayers.length ? '<p class="atlas-mapping-warning">⚠ ' + analysis.unmappedPlayers.length + ' Atlas-Spieler noch nicht zugeordnet: ' + analysis.unmappedPlayers.map(line => escapeHTML(line.entity_id)).join(', ') + '. Trikotnummer oder Atlas-ID im Spielerprofil ergänzen.</p>' : ''}
      <div class="atlas-provenance"><span>Schema ${escapeHTML(analysis.schemaVersion)}</span>${analysis.revision ? '<span>Revision ' + escapeHTML(analysis.revision) + '</span>' : ''}<span>Review: ${escapeHTML(analysis.reviewStatus)}</span>${analysis.confidence != null ? '<span>Confidence: ' + escapeHTML(Math.round(Number(analysis.confidence) * (Number(analysis.confidence) <= 1 ? 100 : 1))) + '%</span>' : ''}${analysis.checksum ? '<span>Checksum ✓</span>' : ''}</div>
    </div>`;
  }

  async function loadAtlas(game) {
    const input = $('[data-role="atlas-game-id"]', root);
    const status = $('[data-role="atlas-status"]', root);
    const id = input.value.trim();
    if (!id) { status.textContent = 'Bitte Atlas-Spiel-ID eintragen.'; return; }
    game.atlasGameId = id; saveGame(game); status.textContent = 'Freigegebenes Atlas-Paket wird geladen …';
    try {
      const result = await BT.api.getAtlasAnalysis(id);
      game.atlasGameId = result.package.game_id || id;
      game.atlas = { package: result.package, importedAt: result.importedAt };
      applyAtlasPlayerStats(game, result.package);
      saveGame(game); drawDetail(); drawList();
    } catch (error) { status.textContent = error.message; }
  }

  async function importAtlasFile() {
    const file = await BT.util.pickFile('application/json,.json');
    if (!file) return;
    try {
      const pkg = JSON.parse(await BT.util.readFileAsText(file));
      const gameId = pkg.game_id || pkg.gameId || pkg.analysis && (pkg.analysis.game_id || pkg.analysis.gameId);
      let game = gameId && BT.storage.getGames().find(item => item.atlasGameId === gameId || item.externalId === gameId);
      if (!game && selectedGameId) game = BT.storage.getGame(selectedGameId);
      if (!game) throw new Error('Bitte zuerst das passende Spiel auswählen.');
      game.atlasGameId = gameId || game.atlasGameId || null;
      game.atlas = { package: pkg, importedAt: new Date().toISOString(), source: 'file' };
      applyAtlasPlayerStats(game, pkg);
      saveGame(game); selectedGameId = game.id; drawList(); drawDetail();
      $('[data-role="games-status"]', root).textContent = 'Atlas-Paket importiert und dem Spiel zugeordnet.';
    } catch (error) { $('[data-role="games-status"]', root).textContent = 'Atlas-Import fehlgeschlagen: ' + error.message; }
  }

  function createTrainingFromGame(game, analysis) {
    const focuses = analysis && analysis.trainingFocus.length ? analysis.trainingFocus : String(game.improvements || '').split(/\n|;/).map(item => item.trim()).filter(Boolean);
    const date = todayISO();
    const drills = [{ name: 'Aktivierung & Ballhandling', minutes: 10, intensity: 'medium', description: 'Ankommen, Kommunikation und saubere Grundlagen.' }];
    focuses.slice(0, 3).forEach(focus => drills.push({ name: focus.slice(0, 80), minutes: 20, intensity: 'high', description: 'Aus der Spielanalyse abgeleiteter Schwerpunkt.' }));
    drills.push({ name: 'Entscheidungstraining unter Druck', minutes: 20, intensity: 'high', description: 'Spielform mit Score, Zeitdruck und klaren Constraints.' });
    drills.push({ name: 'Transfer-Scrimmage & Review', minutes: 20, intensity: 'medium', description: 'Schwerpunkte im freien Spiel prüfen und kurz reflektieren.' });
    const training = BT.storage.upsertTraining({
      date, startTime: BT.storage.getSetting('trainingStartTime', '20:15'),
      note: 'Folgetraining aus Spiel ' + formatDate(game.date) + ' gegen ' + (/lindau/i.test(game.home) ? game.away : game.home),
      attendance: BT.storage.attendanceForActivePlayers(date),
      freethrows: [], shots: [], sourceGameId: game.id,
      plan: { durationMinutes: drills.reduce((sum, drill) => sum + drill.minutes, 0), summary: focuses.join(' · ') || 'Spielanalyse in Trainingsaktionen übertragen', drills }
    });
    location.hash = '#/training/' + training.id;
  }

  async function shareGame(game, analysis) {
    const lines = ['TSV Lindau Basketball · Spielauswertung', formatDate(game.date) + ' · ' + game.home + ' ' + (game.score || '–:–') + ' ' + game.away];
    if (game.coachSummary) lines.push('', 'Trainerfazit:', game.coachSummary);
    if (game.strengths) lines.push('', 'Stärken:', game.strengths);
    if (game.improvements) lines.push('', 'Verbessern:', game.improvements);
    if (analysis && analysis.trainingFocus.length) lines.push('', 'Atlas-Trainingsfokus:', ...analysis.trainingFocus.map(item => '• ' + item));
    const text = lines.join('\n');
    if (navigator.share) { try { await navigator.share({ title: 'Spielauswertung', text }); return; } catch (error) { if (error.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); BT.util.toast('Spielauswertung kopiert.'); }
    catch { BT.util.downloadBlob('spielauswertung-' + game.date + '.txt', new Blob([text], { type: 'text/plain;charset=utf-8' })); }
  }

  return { render };
})();
