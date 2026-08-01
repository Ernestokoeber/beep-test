window.BT = window.BT || {};

BT.tablecrew = (function() {
  const { $, renderTemplate, escapeHTML, formatDate, todayISO, seasonForDate, downloadBlob } = BT.util;
  const MEETING_MINUTES = 45;
  const ROLE_KEYS = ['laptop', 'shotClock', 'scoreboard'];
  const ROLE_LABELS = {
    laptop: 'Laptop / Spielbericht',
    shotClock: '24-Sekunden-Uhr',
    scoreboard: 'Punktetafel & Spielzeit'
  };
  const U14_PRESET = [
    { gameNo: '32004', team: 'u14', date: '2026-10-11', time: '14:30', home: 'TSV 1850 Lindau', away: 'BG Illertal', venue: 'Dreifachhalle' },
    { gameNo: '32012', team: 'u14', date: '2026-10-25', time: '14:30', home: 'TSV 1850 Lindau', away: 'TV Memmingen', venue: 'Dreifachhalle' },
    { gameNo: '32028', team: 'u14', date: '2026-12-06', time: '14:30', home: 'TSV 1850 Lindau', away: 'TSV Ottobeuren', venue: 'Dreifachhalle' },
    { gameNo: '32034', team: 'u14', date: '2027-01-17', time: '14:30', home: 'TSV 1850 Lindau', away: 'TSV Sonthofen', venue: 'Dreifachhalle' },
    { gameNo: '32044', team: 'u14', date: '2027-01-31', time: '14:30', home: 'TSV 1850 Lindau', away: 'VfL Buchloe', venue: 'Dreifachhalle' },
    { gameNo: '', team: 'u14', date: '2027-02-27', time: '14:30', home: 'TSV 1850 Lindau', away: 'DJK Kaufbeuren', venue: 'Dreifachhalle' }
  ];

  let root = null;

  function activePlayers() {
    return BT.storage.getPlayers()
      .filter(player => !player.archived)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  }

  function includedPlayers() {
    return activePlayers().filter(player => player.tableDutyEnabled !== false);
  }

  function licensedPlayers() {
    return includedPlayers().filter(player => player.tableDutyLicense === true);
  }

  function render(target) {
    root = renderTemplate('tpl-tablecrew');
    target.appendChild(root);

    $('[data-action="tablecrew-new-game"]', root).addEventListener('click', () => openGameForm());
    $('[data-action="tablecrew-cancel-game"]', root).addEventListener('click', closeGameForm);
    $('[data-action="tablecrew-preset"]', root).addEventListener('click', importPreset);
    $('[data-action="tablecrew-auto"]', root).addEventListener('click', autoAssign);
    $('[data-action="tablecrew-clear"]', root).addEventListener('click', clearAssignments);
    $('[data-action="tablecrew-excel"]', root).addEventListener('click', exportExcel);
    $('[data-action="tablecrew-pdf"]', root).addEventListener('click', exportPDF);
    $('[data-role="tablecrew-game-form"]', root).addEventListener('submit', saveGameForm);

    drawAll();
  }

  function drawAll() {
    drawRoster();
    drawGames();
    drawWorkload();
    drawKpis();
  }

  function setStatus(message, type) {
    const status = $('[data-role="tablecrew-status"]', root);
    status.textContent = message || '';
    status.dataset.status = type || '';
  }

  function drawRoster() {
    const list = $('[data-role="tablecrew-roster"]', root);
    const players = activePlayers();
    if (!players.length) {
      list.innerHTML = '<div class="empty empty--field"><p class="empty-body">Lege zuerst Spieler im Herren-Kader an.</p><a class="btn small primary" href="#/players">Spielerliste öffnen</a></div>';
      return;
    }

    list.innerHTML = players.map(player => {
      const included = player.tableDutyEnabled !== false;
      const licensed = player.tableDutyLicense === true;
      return `<article class="tablecrew-roster-row" data-player-id="${escapeHTML(player.id)}">
        <div class="tablecrew-player"><strong>${escapeHTML(player.name)}</strong><span>${escapeHTML(player.position || 'Herren-Kader')}${player.jerseyNumber ? ' · #' + escapeHTML(player.jerseyNumber) : ''}</span></div>
        <label class="tablecrew-toggle"><input type="checkbox" data-field="enabled" ${included ? 'checked' : ''}><span>Einplanen</span></label>
        <label class="tablecrew-toggle tablecrew-license"><input type="checkbox" data-field="license" ${licensed ? 'checked' : ''}><span>NBN-/Laptop-Lizenz</span></label>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-player-id]').forEach(row => {
      row.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
        const player = BT.storage.getPlayer(row.dataset.playerId);
        if (!player) return;
        if (input.dataset.field === 'enabled') player.tableDutyEnabled = input.checked;
        if (input.dataset.field === 'license') {
          player.tableDutyLicense = input.checked;
          if (input.checked) player.tableDutyEnabled = true;
        }
        BT.storage.upsertPlayer(player);
        drawAll();
      }));
    });
  }

  function openGameForm(game) {
    const form = $('[data-role="tablecrew-game-form"]', root);
    form.classList.remove('hidden');
    form.elements.id.value = game && game.id || '';
    form.elements.team.value = game && game.team || 'u14';
    form.elements.gameNo.value = game && game.gameNo || '';
    form.elements.date.value = game && game.date || todayISO();
    form.elements.time.value = game && game.time || '14:30';
    form.elements.home.value = game && game.home || 'TSV 1850 Lindau';
    form.elements.away.value = game && game.away || '';
    form.elements.venue.value = game && game.venue || 'Dreifachhalle';
    form.elements.away.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeGameForm() {
    const form = $('[data-role="tablecrew-game-form"]', root);
    form.reset();
    form.elements.id.value = '';
    form.classList.add('hidden');
  }

  function saveGameForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const existing = form.elements.id.value ? BT.storage.getTableDuty(form.elements.id.value) : null;
    const savedTime = form.elements.time.value;
    BT.storage.upsertTableDuty({
      id: form.elements.id.value || undefined,
      team: form.elements.team.value,
      gameNo: form.elements.gameNo.value.trim(),
      date: form.elements.date.value,
      time: form.elements.time.value,
      home: form.elements.home.value.trim(),
      away: form.elements.away.value.trim(),
      venue: form.elements.venue.value.trim(),
      meetingMinutesBefore: MEETING_MINUTES,
      assignments: existing && existing.assignments || {},
      source: existing && existing.source || 'manual',
      seasonId: seasonForDate(form.elements.date.value)
    });
    closeGameForm();
    drawAll();
    setStatus('Heimspiel gespeichert. Treffpunkt: ' + meetingTime(savedTime) + ' Uhr.', 'ok');
  }

  function importPreset() {
    const existing = BT.storage.getTableDuties();
    const missing = U14_PRESET.filter(preset => !existing.some(item =>
      (item.gameNo && item.gameNo === preset.gameNo) ||
      (item.date === preset.date && String(item.away || '').toLowerCase() === preset.away.toLowerCase())
    ));
    if (!missing.length) {
      setStatus('Die sechs U14-Heimspiele sind bereits vorhanden.', 'ok');
      return;
    }
    if (!confirm(missing.length + ' bekannte U14-Heimspiele aus dem Screenshot übernehmen?')) return;
    missing.forEach(game => BT.storage.upsertTableDuty(Object.assign({}, game, {
      source: 'screenshot-2026-27',
      meetingMinutesBefore: MEETING_MINUTES,
      assignments: {},
      seasonId: '26/27'
    })));
    drawAll();
    setStatus(missing.length + ' U14-Heimspiele der Saison 26/27 übernommen.', 'ok');
  }

  function meetingTime(startTime) {
    const match = String(startTime || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return '';
    const total = (Number(match[1]) * 60 + Number(match[2]) - MEETING_MINUTES + 1440) % 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function teamLabel(team) {
    return ({ u14: 'U14', u16: 'U16', u18: 'U18' })[team] || String(team || 'Jugend').toUpperCase();
  }

  function playerOptions(role, selectedId, players) {
    let candidates = players.filter(player => player.tableDutyEnabled !== false);
    if (role === 'laptop') candidates = candidates.filter(player => player.tableDutyLicense === true);
    const selectedPlayer = players.find(player => player.id === selectedId);
    if (selectedPlayer && !candidates.some(player => player.id === selectedId)) candidates = [selectedPlayer].concat(candidates);
    const options = ['<option value="">Noch offen</option>'];
    candidates.forEach(player => {
      const invalid = role === 'laptop' && player.tableDutyLicense !== true;
      options.push('<option value="' + escapeHTML(player.id) + '" ' + (player.id === selectedId ? 'selected' : '') + '>' + escapeHTML(player.name) + (invalid ? ' - Lizenz fehlt' : '') + '</option>');
    });
    return options.join('');
  }

  function gameIssues(game, players) {
    const assignments = game.assignments || {};
    const ids = ROLE_KEYS.map(role => assignments[role]).filter(Boolean);
    const issues = [];
    if (ids.length < 3) issues.push((3 - ids.length) + ' Rolle(n) offen');
    if (new Set(ids).size !== ids.length) issues.push('Person doppelt eingeteilt');
    const laptop = players.find(player => player.id === assignments.laptop);
    if (assignments.laptop && (!laptop || laptop.tableDutyLicense !== true)) issues.push('Laptop-Lizenz fehlt');
    ids.forEach(id => {
      const player = players.find(entry => entry.id === id);
      if (!player || player.archived || player.tableDutyEnabled === false) issues.push('Nicht verfügbarer Spieler eingeteilt');
    });
    return Array.from(new Set(issues));
  }

  function drawGames() {
    const wrap = $('[data-role="tablecrew-games"]', root);
    const empty = $('[data-role="tablecrew-empty"]', root);
    const games = BT.storage.getTableDuties();
    const players = activePlayers();
    empty.classList.toggle('hidden', games.length > 0);
    wrap.innerHTML = games.map(game => {
      const assignments = game.assignments || {};
      const issues = gameIssues(game, players);
      const state = issues.length ? '<span class="att-chip warn">' + escapeHTML(issues.join(' · ')) + '</span>' : '<span class="att-chip ok">Vollständig</span>';
      return `<article class="tablecrew-game-card" data-game-id="${escapeHTML(game.id)}">
        <header class="tablecrew-game-head">
          <div><span class="section-kicker">${escapeHTML(teamLabel(game.team))}${game.gameNo ? ' · Spiel ' + escapeHTML(game.gameNo) : ''}</span><h4>${escapeHTML(game.home || 'TSV 1850 Lindau')} <span>vs.</span> ${escapeHTML(game.away || 'Gegner offen')}</h4><p>${escapeHTML(formatDate(game.date))} · ${escapeHTML(game.time || '--:--')} Uhr · Treffpunkt <strong>${escapeHTML(meetingTime(game.time))} Uhr</strong>${game.venue ? ' · ' + escapeHTML(game.venue) : ''}</p></div>
          <div class="tablecrew-game-actions">${state}<button class="btn small" type="button" data-action="edit">Bearbeiten</button><button class="btn small danger" type="button" data-action="delete">Löschen</button></div>
        </header>
        <div class="tablecrew-role-grid">
          <label class="tablecrew-role tablecrew-role--laptop"><span>Laptop / Spielbericht <b>Lizenz</b></span><select data-role-key="laptop">${playerOptions('laptop', assignments.laptop, players)}</select></label>
          <label class="tablecrew-role tablecrew-role--shot"><span>24-Sekunden-Uhr</span><select data-role-key="shotClock">${playerOptions('shotClock', assignments.shotClock, players)}</select></label>
          <label class="tablecrew-role tablecrew-role--score"><span>Punktetafel &amp; Spielzeit</span><select data-role-key="scoreboard">${playerOptions('scoreboard', assignments.scoreboard, players)}</select></label>
        </div>
      </article>`;
    }).join('');

    wrap.querySelectorAll('[data-game-id]').forEach(card => {
      const game = BT.storage.getTableDuty(card.dataset.gameId);
      card.querySelector('[data-action="edit"]').addEventListener('click', () => openGameForm(game));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (!confirm('Dieses Jugend-Heimspiel samt Kampfgericht-Besetzung löschen?')) return;
        BT.storage.deleteTableDuty(game.id);
        drawAll();
      });
      card.querySelectorAll('[data-role-key]').forEach(select => select.addEventListener('change', () => {
        const role = select.dataset.roleKey;
        const next = Object.assign({}, game.assignments || {}, { [role]: select.value || null });
        const chosen = ROLE_KEYS.map(key => next[key]).filter(Boolean);
        if (new Set(chosen).size !== chosen.length) {
          BT.util.toast('Eine Person kann pro Spiel nur eine Rolle übernehmen.');
          drawGames();
          return;
        }
        const selected = players.find(player => player.id === select.value);
        if (role === 'laptop' && selected && selected.tableDutyLicense !== true) {
          BT.util.toast('Für Laptop und Spielbericht ist die Lizenz erforderlich.');
          drawGames();
          return;
        }
        game.assignments = next;
        BT.storage.upsertTableDuty(game);
        drawGames();
        drawWorkload();
        drawKpis();
      }));
    });
  }

  function createStats(players) {
    const stats = new Map(players.map(player => [player.id, { total: 0, laptop: 0, shotClock: 0, scoreboard: 0, lastGame: -10 }]));
    return stats;
  }

  function pickCandidate(candidates, role, used, stats, gameIndex) {
    const available = candidates.filter(player => !used.has(player.id));
    available.sort((a, b) => {
      const sa = stats.get(a.id);
      const sb = stats.get(b.id);
      const scoreA = sa.total * 100 + sa[role] * 15 + (sa.lastGame === gameIndex - 1 ? 35 : 0) + (role !== 'laptop' && a.tableDutyLicense ? 12 : 0);
      const scoreB = sb.total * 100 + sb[role] * 15 + (sb.lastGame === gameIndex - 1 ? 35 : 0) + (role !== 'laptop' && b.tableDutyLicense ? 12 : 0);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'de');
    });
    return available[0] || null;
  }

  function autoAssign() {
    const games = BT.storage.getTableDuties();
    const players = includedPlayers();
    const licensed = players.filter(player => player.tableDutyLicense === true);
    if (!games.length) { setStatus('Lege zuerst mindestens ein Jugend-Heimspiel an.', 'error'); return; }
    if (players.length < 3) { setStatus('Für die Planung müssen mindestens drei Herren-Spieler aktiviert sein.', 'error'); return; }
    if (!licensed.length) { setStatus('Markiere zuerst mindestens einen Spieler mit Laptop-Lizenz.', 'error'); return; }
    const alreadyAssigned = games.some(game => ROLE_KEYS.some(role => game.assignments && game.assignments[role]));
    if (alreadyAssigned && !confirm('Die bestehende Besetzung wird durch eine neue faire Vorauswahl ersetzt. Fortfahren?')) return;

    const stats = createStats(players);
    games.forEach((game, gameIndex) => {
      const used = new Set();
      const assignments = {};
      const laptop = pickCandidate(licensed, 'laptop', used, stats, gameIndex);
      if (laptop) { assignments.laptop = laptop.id; used.add(laptop.id); registerPick(stats, laptop.id, 'laptop', gameIndex); }

      const nonLicensed = players.filter(player => player.tableDutyLicense !== true);
      let shot = pickCandidate(nonLicensed, 'shotClock', used, stats, gameIndex) || pickCandidate(players, 'shotClock', used, stats, gameIndex);
      if (shot) { assignments.shotClock = shot.id; used.add(shot.id); registerPick(stats, shot.id, 'shotClock', gameIndex); }

      let score = pickCandidate(nonLicensed, 'scoreboard', used, stats, gameIndex) || pickCandidate(players, 'scoreboard', used, stats, gameIndex);
      if (score) { assignments.scoreboard = score.id; used.add(score.id); registerPick(stats, score.id, 'scoreboard', gameIndex); }

      game.assignments = assignments;
      game.assignmentGeneratedAt = new Date().toISOString();
      BT.storage.upsertTableDuty(game);
    });
    drawAll();
    setStatus('Faire Vorauswahl erstellt. Lizenzinhaber wurden für Laptop/Spielbericht priorisiert; jede Rolle kann weiterhin geändert werden.', 'ok');
  }

  function registerPick(stats, playerId, role, gameIndex) {
    const row = stats.get(playerId);
    row.total++;
    row[role]++;
    row.lastGame = gameIndex;
  }

  function clearAssignments() {
    const games = BT.storage.getTableDuties();
    if (!games.some(game => ROLE_KEYS.some(role => game.assignments && game.assignments[role]))) {
      setStatus('Es gibt aktuell keine Besetzung zum Leeren.', '');
      return;
    }
    if (!confirm('Alle Kampfgericht-Zuordnungen leeren? Die Heimspiele bleiben erhalten.')) return;
    games.forEach(game => {
      game.assignments = {};
      delete game.assignmentGeneratedAt;
      BT.storage.upsertTableDuty(game);
    });
    drawAll();
    setStatus('Alle Zuordnungen wurden geleert.', 'ok');
  }

  function workloadRows() {
    const players = activePlayers();
    const byId = new Map(players.map(player => [player.id, { player, total: 0, laptop: 0, shotClock: 0, scoreboard: 0 }]));
    BT.storage.getTableDuties().forEach(game => ROLE_KEYS.forEach(role => {
      const id = game.assignments && game.assignments[role];
      if (!id || !byId.has(id)) return;
      const row = byId.get(id);
      row.total++;
      row[role]++;
    }));
    return Array.from(byId.values()).sort((a, b) => b.total - a.total || String(a.player.name).localeCompare(String(b.player.name), 'de'));
  }

  function drawWorkload() {
    const body = $('[data-role="tablecrew-workload"]', root);
    body.innerHTML = workloadRows().map(row => `<tr class="${row.player.tableDutyEnabled === false ? 'is-disabled' : ''}"><td>${escapeHTML(row.player.name)}</td><td>${row.player.tableDutyLicense ? '<span class="att-chip ok">Laptop</span>' : '–'}</td><td><strong>${row.total}</strong></td><td>${row.laptop}</td><td>${row.shotClock}</td><td>${row.scoreboard}</td></tr>`).join('');
  }

  function drawKpis() {
    const games = BT.storage.getTableDuties();
    const players = activePlayers();
    const assigned = games.reduce((sum, game) => sum + ROLE_KEYS.filter(role => game.assignments && game.assignments[role]).length, 0);
    const issues = games.reduce((sum, game) => sum + gameIssues(game, players).length, 0);
    $('[data-role="tablecrew-kpis"]', root).innerHTML = `
      <div><span>Heimspiele</span><strong>${games.length}</strong></div>
      <div><span>Dienste besetzt</span><strong>${assigned} / ${games.length * 3}</strong></div>
      <div><span>Laptop-Lizenzen</span><strong>${licensedPlayers().length}</strong></div>
      <div class="${issues ? 'has-warning' : ''}"><span>Offene Hinweise</span><strong>${issues}</strong></div>`;
  }

  function playerName(id, players) {
    const player = players.find(entry => entry.id === id);
    return player ? player.name : '';
  }

  function exportRows() {
    const players = activePlayers();
    return BT.storage.getTableDuties().map(game => ({
      date: game.date,
      start: game.time,
      meeting: meetingTime(game.time),
      gameNo: game.gameNo || '',
      team: teamLabel(game.team),
      home: game.home || 'TSV 1850 Lindau',
      away: game.away || '',
      venue: game.venue || '',
      laptop: playerName(game.assignments && game.assignments.laptop, players),
      shotClock: playerName(game.assignments && game.assignments.shotClock, players),
      scoreboard: playerName(game.assignments && game.assignments.scoreboard, players)
    }));
  }

  function exportBaseName() {
    const games = BT.storage.getTableDuties();
    const seasons = Array.from(new Set(games.map(game => game.seasonId || seasonForDate(game.date)).filter(Boolean)));
    return 'kampfgericht-' + (seasons.length === 1 ? seasons[0].replace('/', '-') : 'spielplan');
  }

  async function loadExternal(src, ready, label) {
    if (ready()) return;
    const existing = document.querySelector('script[data-courthub-lib="' + label + '"]');
    if (existing) {
      await new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
      if (ready()) return;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.courthubLib = label;
      script.onload = resolve;
      script.onerror = () => reject(new Error(label + ' konnte nicht geladen werden. Bitte Internetverbindung prüfen.'));
      document.head.appendChild(script);
    });
    if (!ready()) throw new Error(label + ' wurde nicht korrekt initialisiert.');
  }

  async function shareOrDownload(filename, blob, title) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    downloadBlob(filename, blob);
  }

  async function exportExcel() {
    const rows = exportRows();
    if (!rows.length) { setStatus('Für den Excel-Export fehlen Heimspiele.', 'error'); return; }
    const button = $('[data-action="tablecrew-excel"]', root);
    button.disabled = true;
    setStatus('Excel-Datei wird erstellt …', '');
    try {
      await loadExternal('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js', () => !!window.ExcelJS, 'exceljs');
      const workbook = new window.ExcelJS.Workbook();
      workbook.creator = 'CourtHub · TSV Lindau Basketball';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Kampfgericht', { views: [{ state: 'frozen', ySplit: 4 }] });
      sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } };
      sheet.mergeCells('A1:K1');
      sheet.getCell('A1').value = 'Kampfgericht Jugend-Heimspiele · TSV Lindau Basketball';
      sheet.getCell('A1').style = { font: { bold: true, size: 17, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00633E' } }, alignment: { vertical: 'middle', horizontal: 'left' } };
      sheet.getRow(1).height = 30;
      sheet.mergeCells('A2:K2');
      sheet.getCell('A2').value = 'Treffpunkt jeweils 45 Minuten vor Spielbeginn · Stand ' + new Date().toLocaleDateString('de-DE');
      sheet.getCell('A2').style = { font: { italic: true, color: { argb: 'FF4B5563' } }, alignment: { vertical: 'middle' } };
      const headers = ['Datum', 'Beginn', 'Treffpunkt', 'Spiel-Nr.', 'Team', 'Heim', 'Gast', 'Halle', 'Laptop / Spielbericht', '24-Sek.-Uhr', 'Punktetafel & Spielzeit'];
      sheet.getRow(4).values = headers;
      rows.forEach(row => sheet.addRow([
        new Date(row.date + 'T00:00:00'), row.start, row.meeting, row.gameNo, row.team, row.home, row.away, row.venue, row.laptop, row.shotClock, row.scoreboard
      ]));
      const widths = [15, 10, 12, 12, 9, 23, 24, 22, 25, 20, 25];
      widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
      sheet.getColumn(1).numFmt = 'ddd, dd.mm.yyyy';
      const header = sheet.getRow(4);
      header.height = 30;
      header.eachCell(cell => { cell.style = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF58220' } }, alignment: { vertical: 'middle', horizontal: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { argb: 'FF00633E' } } } }; });
      header.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF666666' } };
      header.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0BAFC7' } };
      header.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF63A91F' } };
      for (let rowIndex = 5; rowIndex <= 4 + rows.length; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        row.height = 26;
        row.eachCell(cell => {
          cell.alignment = { vertical: 'middle', horizontal: cell.col <= 8 ? 'left' : 'center', wrapText: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 ? 'FFE5E7EB' : 'FFFFC266' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
        });
      }
      sheet.autoFilter = { from: 'A4', to: 'K' + (4 + rows.length) };

      const workload = workbook.addWorksheet('Einsatzübersicht', { views: [{ state: 'frozen', ySplit: 3 }] });
      workload.mergeCells('A1:F1');
      workload.getCell('A1').value = 'Faire Verteilung der Kampfgericht-Dienste';
      workload.getCell('A1').style = { font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00633E' } } };
      workload.getRow(3).values = ['Spieler', 'Laptop-Lizenz', 'Gesamt', 'Laptop', '24-Sek.-Uhr', 'Punktetafel'];
      workloadRows().forEach(row => workload.addRow([row.player.name, row.player.tableDutyLicense ? 'Ja' : 'Nein', row.total, row.laptop, row.shotClock, row.scoreboard]));
      workload.columns.forEach((column, index) => { column.width = [25, 18, 12, 12, 16, 18][index]; });
      workload.getRow(3).eachCell(cell => { cell.style = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF58220' } }, alignment: { horizontal: 'center' } }; });
      for (let i = 4; i <= workload.rowCount; i++) workload.getRow(i).eachCell(cell => { cell.alignment = { vertical: 'middle', horizontal: cell.col === 1 ? 'left' : 'center' }; });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await shareOrDownload(exportBaseName() + '.xlsx', blob, 'Kampfgericht TSV Lindau');
      setStatus('Excel-Datei wurde erstellt.', 'ok');
    } catch (error) {
      console.error(error);
      setStatus('Excel-Export fehlgeschlagen: ' + error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function exportPDF() {
    const rows = exportRows();
    if (!rows.length) { setStatus('Für den PDF-Export fehlen Heimspiele.', 'error'); return; }
    const button = $('[data-action="tablecrew-pdf"]', root);
    button.disabled = true;
    setStatus('PDF wird erstellt …', '');
    try {
      await loadExternal('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', () => !!(window.jspdf && window.jspdf.jsPDF), 'jspdf');
      await loadExternal('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js', () => !!(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable), 'jspdf-autotable');
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const width = doc.internal.pageSize.getWidth();
      doc.setFillColor(0, 99, 62);
      doc.rect(0, 0, width, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Kampfgericht Jugend-Heimspiele', 12, 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('TSV Lindau Basketball · Treffpunkt jeweils 45 Minuten vor Spielbeginn', 12, 18);
      doc.setTextColor(31, 41, 55);
      doc.autoTable({
        startY: 30,
        head: [['Datum', 'Beginn / Treffpunkt', 'Nr. / Team', 'Begegnung', 'Halle', 'Laptop / Spielbericht', '24-Sek.-Uhr', 'Punktetafel & Spielzeit']],
        body: rows.map(row => [formatDate(row.date), row.start + ' / ' + row.meeting, (row.gameNo || '–') + ' / ' + row.team, row.home + ' vs. ' + row.away, row.venue, row.laptop || 'OFFEN', row.shotClock || 'OFFEN', row.scoreboard || 'OFFEN']),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 2.2, valign: 'middle', lineColor: [209, 213, 219], lineWidth: 0.2 },
        headStyles: { fillColor: [245, 130, 32], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [255, 241, 221] },
        columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 32 }, 2: { cellWidth: 25 }, 3: { cellWidth: 55 }, 4: { cellWidth: 36 }, 5: { cellWidth: 36 }, 6: { cellWidth: 31 }, 7: { cellWidth: 39 } },
        didParseCell(data) {
          if (data.section === 'head' && data.column.index === 5) data.cell.styles.fillColor = [102, 102, 102];
          if (data.section === 'head' && data.column.index === 6) data.cell.styles.fillColor = [11, 175, 199];
          if (data.section === 'head' && data.column.index === 7) data.cell.styles.fillColor = [99, 169, 31];
        },
        didDrawPage() {
          const page = doc.internal.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(107, 114, 128);
          doc.text('CourtHub · Stand ' + new Date().toLocaleDateString('de-DE'), 12, doc.internal.pageSize.getHeight() - 6);
          doc.text('Seite ' + page, width - 12, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
        }
      });
      const blob = doc.output('blob');
      await shareOrDownload(exportBaseName() + '.pdf', blob, 'Kampfgericht TSV Lindau');
      setStatus('PDF wurde erstellt.', 'ok');
    } catch (error) {
      console.error(error);
      setStatus('PDF-Export fehlgeschlagen: ' + error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  return { render, meetingTime, autoAssign };
})();
