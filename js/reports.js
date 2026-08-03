window.BT = window.BT || {};

BT.reports = (function() {
  const { $, renderTemplate, escapeHTML, downloadCSV, todayISO, formatDate } = BT.util;
  let root = null;
  let currentReport = null;
  let jsPDFPromise = null;

  function pct(made, attempted) {
    return attempted ? Math.round((Number(made || 0) / Number(attempted)) * 100) : 0;
  }

  function oneDecimal(value) {
    return Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function itemSeason(item) {
    return item.seasonId || (item.date ? BT.util.seasonForDate(item.date) : null);
  }

  function inSeason(item, seasonId) {
    return seasonId === 'all' || itemSeason(item) === seasonId;
  }

  function emptyTrainingStats() {
    return {
      attendance: { total: 0, present: 0, absent: 0, excused: 0, injured: 0, late: 0, pct: 0 },
      fg: { made: 0, attempted: 0, pct: 0 },
      ft: { made: 0, attempted: 0, pct: 0 },
      categories: new Map()
    };
  }

  function emptyGameStats() {
    return {
      games: 0, minutes: 0, points: 0,
      fieldGoalsMade: 0, fieldGoalsAttempted: 0,
      freeThrowsMade: 0, freeThrowsAttempted: 0,
      rebounds: 0, assists: 0, steals: 0, blocks: 0,
      turnovers: 0, fouls: 0, plusMinus: 0,
      fgPct: 0, ftPct: 0, ppg: 0
    };
  }

  function buildReport(seasonId, playerId) {
    const allPlayers = BT.storage.getPlayers().slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    const trainings = BT.storage.getTrainings().filter(BT.stats.isEnded).filter(item => inSeason(item, seasonId));
    const games = BT.storage.getGames().filter(game => inSeason(game, seasonId) && (game.status === 'played' || !!game.score));
    const sessions = BT.storage.getSessions().filter(session => inSeason(session, seasonId));
    const playerRows = allPlayers.map(player => ({
      player,
      training: emptyTrainingStats(),
      game: emptyGameStats(),
      beep: null,
      openGoals: (player.goals || []).filter(goal => goal.status !== 'done').length
    }));
    const byPlayer = new Map(playerRows.map(row => [row.player.id, row]));
    const teamCategories = new Map();
    const team = {
      attendance: { total: 0, present: 0, pct: 0 },
      trainingFG: { made: 0, attempted: 0, pct: 0 },
      trainingFT: { made: 0, attempted: 0, pct: 0 },
      game: emptyGameStats(),
      wins: 0, losses: 0, draws: 0
    };

    trainings.forEach(training => {
      (training.attendance || []).forEach(entry => {
        if (!entry.status) return;
        const row = byPlayer.get(entry.playerId);
        team.attendance.total++;
        if (entry.status === 'present') team.attendance.present++;
        if (!row) return;
        row.training.attendance.total++;
        if (row.training.attendance[entry.status] !== undefined) row.training.attendance[entry.status]++;
        if (entry.status === 'present' && entry.late) row.training.attendance.late++;
      });

      (training.freethrows || []).forEach(entry => {
        if (!(Number(entry.attempted) > 0)) return;
        const made = Number(entry.made || 0);
        const attempted = Number(entry.attempted || 0);
        team.trainingFT.made += made;
        team.trainingFT.attempted += attempted;
        const row = byPlayer.get(entry.playerId);
        if (row) {
          row.training.ft.made += made;
          row.training.ft.attempted += attempted;
        }
      });

      (training.shots || []).forEach(category => {
        (category.entries || []).forEach(entry => {
          if (!(Number(entry.attempted) > 0)) return;
          const made = Number(entry.made || 0);
          const attempted = Number(entry.attempted || 0);
          team.trainingFG.made += made;
          team.trainingFG.attempted += attempted;
          const teamCategory = teamCategories.get(category.category) || { category: category.category, made: 0, attempted: 0, pct: 0 };
          teamCategory.made += made;
          teamCategory.attempted += attempted;
          teamCategories.set(category.category, teamCategory);
          const row = byPlayer.get(entry.playerId);
          if (!row) return;
          row.training.fg.made += made;
          row.training.fg.attempted += attempted;
          const playerCategory = row.training.categories.get(category.category) || { category: category.category, made: 0, attempted: 0, pct: 0 };
          playerCategory.made += made;
          playerCategory.attempted += attempted;
          row.training.categories.set(category.category, playerCategory);
        });
      });
    });

    games.forEach(game => {
      const score = String(game.score || '').match(/(\d+)\s*:\s*(\d+)/);
      if (score) {
        const home = /lindau/i.test(game.home || '');
        const own = Number(home ? score[1] : score[2]);
        const other = Number(home ? score[2] : score[1]);
        if (own > other) team.wins++;
        else if (own < other) team.losses++;
        else team.draws++;
      }

      (game.playerStats || []).forEach(stat => {
        const row = byPlayer.get(stat.playerId);
        if (!row) return;
        const target = row.game;
        target.games++;
        addGameLine(target, stat);
        addGameLine(team.game, stat);
      });
    });

    sessions.forEach(session => {
      (session.results || []).forEach(result => {
        const row = byPlayer.get(result.playerId);
        if (!row || (row.beep && Number(row.beep.result.totalShuttles || 0) >= Number(result.totalShuttles || 0))) return;
        const rating = BT.ratings.rateResult(session, result);
        row.beep = { session, result, vo2max: rating.vo2max, rating: rating.label };
      });
    });

    playerRows.forEach(row => {
      const training = row.training;
      training.attendance.pct = pct(training.attendance.present, training.attendance.total);
      training.fg.pct = pct(training.fg.made, training.fg.attempted);
      training.ft.pct = pct(training.ft.made, training.ft.attempted);
      training.categories.forEach(category => { category.pct = pct(category.made, category.attempted); });
      finalizeGameStats(row.game);
    });
    team.attendance.pct = pct(team.attendance.present, team.attendance.total);
    team.trainingFG.pct = pct(team.trainingFG.made, team.trainingFG.attempted);
    team.trainingFT.pct = pct(team.trainingFT.made, team.trainingFT.attempted);
    teamCategories.forEach(category => { category.pct = pct(category.made, category.attempted); });
    team.game.games = games.length;
    finalizeGameStats(team.game);

    const visibleRows = playerRows.filter(row => playerId === 'all' || row.player.id === playerId);
    const dates = [
      ...trainings.map(item => item.date),
      ...games.map(item => item.date),
      ...sessions.map(item => item.date || (item.startedAt || '').slice(0, 10))
    ].filter(Boolean).sort();

    return {
      seasonId,
      seasonLabel: seasonId === 'all' ? 'Alle Saisons' : BT.util.seasonLabel(seasonId),
      generatedAt: new Date(),
      throughDate: dates.length ? dates[dates.length - 1] : null,
      trainings, games, sessions,
      players: visibleRows,
      allPlayers: playerRows,
      team,
      teamCategories: Array.from(teamCategories.values()).sort((a, b) => a.category.localeCompare(b.category, 'de'))
    };
  }

  function addGameLine(target, stat) {
    const keys = ['minutes', 'points', 'fieldGoalsMade', 'fieldGoalsAttempted', 'freeThrowsMade', 'freeThrowsAttempted', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'fouls', 'plusMinus'];
    keys.forEach(key => { target[key] += Number(stat[key] || 0); });
  }

  function finalizeGameStats(stats) {
    stats.fgPct = pct(stats.fieldGoalsMade, stats.fieldGoalsAttempted);
    stats.ftPct = pct(stats.freeThrowsMade, stats.freeThrowsAttempted);
    stats.ppg = stats.games ? stats.points / stats.games : 0;
  }

  function render(target) {
    root = renderTemplate('tpl-reports');
    target.appendChild(root);
    const seasonSelect = $('[data-role="report-season"]', root);
    const playerSelect = $('[data-role="report-player"]', root);
    const seasons = BT.storage.getSeasons();
    const active = BT.storage.getActiveSeason();
    seasonSelect.innerHTML = '<option value="all">Alle Saisons</option>' + seasons.map(season => '<option value="' + escapeHTML(season) + '">' + escapeHTML(BT.util.seasonLabel(season)) + '</option>').join('');
    seasonSelect.value = seasons.includes(active) || active === 'all' ? active : (seasons[0] || 'all');
    const players = BT.storage.getPlayers().slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    playerSelect.innerHTML = '<option value="all">Alle Spieler</option>' + players.map(player => '<option value="' + escapeHTML(player.id) + '">' + escapeHTML(player.name) + (player.archived ? ' (Archiv)' : '') + '</option>').join('');

    const draw = () => {
      currentReport = buildReport(seasonSelect.value, playerSelect.value);
      drawReport(currentReport);
    };
    seasonSelect.addEventListener('change', draw);
    playerSelect.addEventListener('change', draw);
    $('[data-action="report-csv"]', root).addEventListener('click', exportCSV);
    $('[data-action="report-pdf"]', root).addEventListener('click', exportPDF);
    draw();
  }

  function drawReport(report) {
    $('[data-role="report-as-of"]', root).textContent = report.throughDate
      ? 'Datenstand: ' + formatDate(report.throughDate)
      : 'Noch kein abgeschlossener Datensatz';
    const team = report.team;
    const summary = [
      ['Trainings', report.trainings.length, 'abgeschlossen'],
      ['Spiele', report.games.length, team.wins + ' S · ' + team.losses + ' N' + (team.draws ? ' · ' + team.draws + ' U' : '')],
      ['Spieler', report.allPlayers.filter(row => !row.player.archived).length, 'aktiver Kader'],
      ['Anwesenheit', team.attendance.total ? team.attendance.pct + ' %' : '–', team.attendance.present + '/' + team.attendance.total + ' Slots'],
      ['Daten bis', report.throughDate ? formatDate(report.throughDate) : '–', report.seasonLabel]
    ];
    $('[data-role="report-summary"]', root).innerHTML = summary.map(item => '<article class="report-summary-card"><span>' + escapeHTML(item[0]) + '</span><strong>' + escapeHTML(item[1]) + '</strong><small>' + escapeHTML(item[2]) + '</small></article>').join('');

    const playersWithTrainingShots = report.allPlayers.filter(row => row.training.fg.attempted || row.training.ft.attempted).length;
    const playersWithGames = report.allPlayers.filter(row => row.game.games).length;
    const playersWithBeep = report.allPlayers.filter(row => row.beep).length;
    $('[data-role="report-coverage"]', root).innerHTML = '<strong>Datenabdeckung</strong><span>' + playersWithTrainingShots + ' Spieler mit Trainingswurfwerten</span><span>' + playersWithGames + ' mit Spiel-Boxscore</span><span>' + playersWithBeep + ' mit Beep-Test</span>';

    const game = team.game;
    const teamTiles = [
      ['Training FG', ratio(team.trainingFG), quote(team.trainingFG)],
      ['Training FT', ratio(team.trainingFT), quote(team.trainingFT)],
      ['Spiel FG', ratio({ made: game.fieldGoalsMade, attempted: game.fieldGoalsAttempted }), quote({ made: game.fieldGoalsMade, attempted: game.fieldGoalsAttempted, pct: game.fgPct })],
      ['Spiel FT', ratio({ made: game.freeThrowsMade, attempted: game.freeThrowsAttempted }), quote({ made: game.freeThrowsMade, attempted: game.freeThrowsAttempted, pct: game.ftPct })],
      ['Bilanz', team.wins + '-' + team.losses + (team.draws ? '-' + team.draws : ''), report.games.length + ' Spiele'],
      ['Punkte', report.games.length ? oneDecimal(game.ppg) : '–', game.points + ' gesamt']
    ];
    $('[data-role="report-team"]', root).innerHTML = teamTiles.map(item => '<article class="report-team-tile"><span>' + escapeHTML(item[0]) + '</span><strong>' + escapeHTML(item[1]) + '</strong><small>' + escapeHTML(item[2]) + '</small></article>').join('');
    $('[data-role="report-categories"]', root).innerHTML = report.teamCategories.length
      ? report.teamCategories.map(category => '<article><span>' + escapeHTML(category.category) + '</span><strong>' + category.pct + ' %</strong><small>' + category.made + '/' + category.attempted + '</small></article>').join('')
      : '<p class="muted">Noch keine Trainingswurfkategorien in dieser Auswahl.</p>';

    const tbody = $('[data-role="report-player-rows"]', root);
    const empty = $('[data-role="report-empty"]', root);
    empty.classList.toggle('hidden', report.players.length > 0);
    $('[data-role="report-player-count"]', root).textContent = report.players.length + ' Spieler';
    tbody.innerHTML = report.players.map(row => {
      const training = row.training;
      const stats = row.game;
      const beep = row.beep;
      return '<tr>' +
        '<td><a href="#/player/' + encodeURIComponent(row.player.id) + '"><strong>' + escapeHTML(row.player.name) + '</strong></a><small>' + escapeHTML(row.player.position || 'Ohne Position') + (row.player.archived ? ' · Archiv' : '') + '</small></td>' +
        '<td>' + statCell(training.attendance.total ? training.attendance.pct + ' %' : '–', training.attendance.present + '/' + training.attendance.total) + '</td>' +
        '<td>' + statCell(quote(training.fg), ratio(training.fg)) + '</td>' +
        '<td>' + statCell(quote(training.ft), ratio(training.ft)) + '</td>' +
        '<td>' + stats.games + '</td><td>' + (stats.games ? oneDecimal(stats.ppg) : '–') + '</td>' +
        '<td>' + statCell(stats.fieldGoalsAttempted ? stats.fgPct + ' %' : '–', stats.fieldGoalsMade + '/' + stats.fieldGoalsAttempted) + '</td>' +
        '<td>' + statCell(stats.freeThrowsAttempted ? stats.ftPct + ' %' : '–', stats.freeThrowsMade + '/' + stats.freeThrowsAttempted) + '</td>' +
        '<td>' + average(stats.rebounds, stats.games) + '</td><td>' + average(stats.assists, stats.games) + '</td><td>' + average(stats.turnovers, stats.games) + '</td>' +
        '<td>' + (beep ? statCell('L ' + beep.result.level + '.' + beep.result.shuttle, beep.result.totalShuttles + ' Shuttles') : '–') + '</td></tr>';
    }).join('');

    $('[data-role="report-player-cards"]', root).innerHTML = report.players.map(renderPlayerCard).join('');
  }

  function statCell(main, sub) {
    return '<strong class="report-cell-main">' + escapeHTML(main) + '</strong><small>' + escapeHTML(sub) + '</small>';
  }

  function ratio(stats) {
    return stats.attempted ? stats.made + '/' + stats.attempted : '0/0';
  }

  function quote(stats) {
    return stats.attempted ? stats.pct + ' %' : '–';
  }

  function average(total, games) {
    return games ? oneDecimal(total / games) : '–';
  }

  function renderPlayerCard(row) {
    const categories = Array.from(row.training.categories.values()).sort((a, b) => a.category.localeCompare(b.category, 'de'));
    const chips = categories.length
      ? categories.map(category => '<span><b>' + escapeHTML(category.category) + '</b><strong>' + category.pct + ' %</strong><small>' + category.made + '/' + category.attempted + '</small></span>').join('')
      : '<p class="muted">Noch keine Feldwurfwerte erfasst.</p>';
    return '<article class="report-player-card"><header><div><a href="#/player/' + encodeURIComponent(row.player.id) + '">' + escapeHTML(row.player.name) + '</a><small>' + escapeHTML(row.player.position || 'Ohne Position') + '</small></div><span class="report-attendance-badge">' + (row.training.attendance.total ? row.training.attendance.pct + ' % Anwesenheit' : 'Keine Anwesenheitsdaten') + '</span></header>' +
      '<div class="report-player-quick"><span><small>Training FG</small><strong>' + quote(row.training.fg) + '</strong></span><span><small>Training FT</small><strong>' + quote(row.training.ft) + '</strong></span><span><small>Spiel PPG</small><strong>' + (row.game.games ? oneDecimal(row.game.ppg) : '–') + '</strong></span><span><small>Aktive Ziele</small><strong>' + row.openGoals + '</strong></span></div>' +
      '<div class="report-shot-chips">' + chips + '</div></article>';
  }

  function exportCSV() {
    if (!currentReport) return;
    const report = currentReport;
    const categories = Array.from(new Set(report.allPlayers.flatMap(row => Array.from(row.training.categories.keys()))).values()).sort((a, b) => a.localeCompare(b, 'de'));
    const rows = [
      ['CourtHub Gesamtauswertung'],
      ['Saison', report.seasonLabel],
      ['Erstellt', new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(report.generatedAt)],
      ['Datenstand', report.throughDate || ''],
      [],
      ['Team', 'Trainings', 'Spiele', 'Siege', 'Niederlagen', 'Anwesenheit %', 'Training FG Treffer', 'Training FG Versuche', 'Training FG %', 'Training FT Treffer', 'Training FT Versuche', 'Training FT %', 'Spielpunkte', 'Spiel FG %', 'Spiel FT %'],
      ['TSV Lindau', report.trainings.length, report.games.length, report.team.wins, report.team.losses, report.team.attendance.pct, report.team.trainingFG.made, report.team.trainingFG.attempted, report.team.trainingFG.pct, report.team.trainingFT.made, report.team.trainingFT.attempted, report.team.trainingFT.pct, report.team.game.points, report.team.game.fgPct, report.team.game.ftPct],
      [],
      ['Spieler', 'Position', 'Archiviert', 'Anwesend', 'Anwesenheit möglich', 'Anwesenheit %', 'Training FG Treffer', 'Training FG Versuche', 'Training FG %', 'Training FT Treffer', 'Training FT Versuche', 'Training FT %', 'Spiele', 'Minuten', 'Punkte', 'PPG', 'Spiel FG Treffer', 'Spiel FG Versuche', 'Spiel FG %', 'Spiel FT Treffer', 'Spiel FT Versuche', 'Spiel FT %', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', '+/-', 'Beep Level', 'Beep Shuttle', 'Beep Gesamt', 'VO2max', 'Aktive Ziele', ...categories.flatMap(category => [category + ' Treffer', category + ' Versuche', category + ' %'])]
    ];
    report.players.forEach(row => {
      const beep = row.beep;
      const base = [row.player.name, row.player.position || '', row.player.archived ? 'ja' : 'nein', row.training.attendance.present, row.training.attendance.total, row.training.attendance.pct, row.training.fg.made, row.training.fg.attempted, row.training.fg.pct, row.training.ft.made, row.training.ft.attempted, row.training.ft.pct, row.game.games, row.game.minutes, row.game.points, oneDecimal(row.game.ppg), row.game.fieldGoalsMade, row.game.fieldGoalsAttempted, row.game.fgPct, row.game.freeThrowsMade, row.game.freeThrowsAttempted, row.game.ftPct, row.game.rebounds, row.game.assists, row.game.steals, row.game.blocks, row.game.turnovers, row.game.fouls, row.game.plusMinus, beep ? beep.result.level : '', beep ? beep.result.shuttle : '', beep ? beep.result.totalShuttles : '', beep ? oneDecimal(beep.vo2max) : '', row.openGoals];
      categories.forEach(category => {
        const stat = row.training.categories.get(category);
        base.push(stat ? stat.made : 0, stat ? stat.attempted : 0, stat ? stat.pct : 0);
      });
      rows.push(base);
    });
    downloadCSV('courthub-auswertung_' + safeSeason(report.seasonId) + '_' + todayISO() + '.csv', rows);
    BT.util.toast('Gesamtauswertung als CSV exportiert.');
  }

  function loadJsPDF() {
    if (jsPDFPromise) return jsPDFPromise;
    jsPDFPromise = new Promise((resolve, reject) => {
      if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
      script.onload = () => window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('PDF-Modul konnte nicht gestartet werden.'));
      script.onerror = () => { jsPDFPromise = null; reject(new Error('PDF-Modul konnte nicht geladen werden. Bitte Internetverbindung prüfen.')); };
      document.head.appendChild(script);
    });
    return jsPDFPromise;
  }

  async function exportPDF(event) {
    if (!currentReport) return;
    const button = event.currentTarget;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'PDF wird erstellt …';
    try {
      const JsPDF = await loadJsPDF();
      const doc = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
      buildPDF(doc, currentReport);
      const filename = 'courthub-auswertung_' + safeSeason(currentReport.seasonId) + '_' + todayISO() + '.pdf';
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'CourtHub Gesamtauswertung' }); }
        catch (error) { if (error.name !== 'AbortError') doc.save(filename); }
      } else {
        doc.save(filename);
      }
      BT.util.toast('PDF-Auswertung erstellt.');
    } catch (error) {
      alert('PDF-Export fehlgeschlagen: ' + error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function buildPDF(doc, report) {
    const margin = 32;
    const green = [0, 75, 43];
    const orange = [232, 161, 77];
    const ink = [16, 32, 25];
    const muted = [98, 113, 105];
    let y = margin;

    function pageBox() {
      return { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight() };
    }

    function header(title) {
      const { width } = pageBox();
      doc.setCharSpace(0);
      doc.setFillColor(...green);
      doc.rect(0, 0, width, 58, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('CourtHub', margin, 28);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('TSV Lindau Basketball - ' + title, margin, 44);
      doc.setTextColor(...ink);
      y = 78;
    }

    function ensureSpace(height, title, orientation) {
      if (y + height <= pageBox().height - 34) return;
      doc.addPage('a4', orientation || 'landscape');
      header(title || 'Gesamtauswertung');
    }

    function sectionTitle(text) {
      ensureSpace(28);
      doc.setTextColor(...green);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(text, margin, y);
      y += 18;
    }

    header('Gesamtauswertung');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.text('Gesamtstand ' + report.seasonLabel, margin, y);
    y += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text('Erstellt: ' + new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(report.generatedAt) + ' | Datenstand: ' + (report.throughDate ? formatDate(report.throughDate) : 'keine abgeschlossenen Daten'), margin, y);
    y += 20;

    const cards = [
      ['Trainings', String(report.trainings.length)],
      ['Spiele', String(report.games.length)],
      ['Bilanz', report.team.wins + '-' + report.team.losses + (report.team.draws ? '-' + report.team.draws : '')],
      ['Anwesenheit', report.team.attendance.total ? report.team.attendance.pct + ' %' : '-'],
      ['Training FG', quote(report.team.trainingFG)],
      ['Training FT', quote(report.team.trainingFT)]
    ];
    const cardGap = 8;
    const cardWidth = (pageBox().width - margin * 2 - cardGap * (cards.length - 1)) / cards.length;
    cards.forEach((card, index) => {
      const x = margin + index * (cardWidth + cardGap);
      doc.setFillColor(247, 245, 240);
      doc.setDrawColor(222, 226, 223);
      doc.roundedRect(x, y, cardWidth, 48, 5, 5, 'FD');
      doc.setTextColor(...muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(card[0].toUpperCase(), x + 8, y + 14);
      doc.setTextColor(...green);
      doc.setFontSize(16);
      doc.text(card[1], x + 8, y + 35);
    });
    y += 66;

    sectionTitle('Team-Wurfquoten');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ink);
    const categoryText = report.teamCategories.length
      ? report.teamCategories.map(category => category.category + ': ' + category.made + '/' + category.attempted + ' (' + category.pct + ' %)').join('   |   ')
      : 'Noch keine Trainingswurfkategorien vorhanden.';
    const categoryLines = doc.splitTextToSize(categoryText, pageBox().width - margin * 2);
    doc.text(categoryLines, margin, y);
    y += categoryLines.length * 12 + 14;

    sectionTitle('Leistungsübersicht');
    const performanceColumns = [
      ['Spieler', 260, 'left'], ['Anw.', 85, 'right'], ['Training FG', 105, 'right'],
      ['Training FT', 105, 'right'], ['Spiele', 70, 'right'], ['PPG', 75, 'right']
    ];
    const performanceRows = report.players.map(row => [
      row.player.name,
      row.training.attendance.total ? row.training.attendance.pct + '%' : '-',
      quote(row.training.fg).replace(' ', ''),
      quote(row.training.ft).replace(' ', ''),
      String(row.game.games),
      row.game.games ? oneDecimal(row.game.ppg) : '-'
    ]);
    drawPDFTable(doc, performanceColumns, performanceRows, margin, () => y, value => { y = value; }, ensureSpace, green, ink, 'Leistungsübersicht');

    sectionTitle('Spielwerte');
    const gameColumns = [
      ['Spieler', 260, 'left'], ['Spiel FG', 105, 'right'], ['Spiel FT', 105, 'right'],
      ['REB', 70, 'right'], ['AST', 70, 'right'], ['TO', 70, 'right'], ['Beep-Test', 100, 'right']
    ];
    const gameRows = report.players.map(row => [
      row.player.name,
      row.game.fieldGoalsAttempted ? row.game.fgPct + '%' : '-',
      row.game.freeThrowsAttempted ? row.game.ftPct + '%' : '-',
      average(row.game.rebounds, row.game.games),
      average(row.game.assists, row.game.games),
      average(row.game.turnovers, row.game.games),
      row.beep ? 'L ' + row.beep.result.level + '.' + row.beep.result.shuttle : '-'
    ]);
    drawPDFTable(doc, gameColumns, gameRows, margin, () => y, value => { y = value; }, ensureSpace, green, ink, 'Spielwerte');

    if (report.players.length) {
      doc.addPage('a4', 'portrait');
      header('Wurfprofile je Spieler');
      sectionTitle('Wurfprofile je Spieler');
    }
    report.players.forEach(row => {
      const categories = Array.from(row.training.categories.values()).sort((a, b) => a.category.localeCompare(b.category, 'de'));
      const text = categories.length
        ? categories.map(category => category.category + ' ' + category.made + '/' + category.attempted + ' (' + category.pct + ' %)').join(' | ')
        : 'Keine Feldwurfwerte';
      const details = text + ' | FT ' + ratio(row.training.ft) + (row.training.ft.attempted ? ' (' + row.training.ft.pct + ' %)' : '');
      const lines = doc.splitTextToSize(details, pageBox().width - margin * 2 - 150);
      const boxHeight = Math.max(32, lines.length * 10 + 12);
      ensureSpace(boxHeight + 6, 'Wurfprofile je Spieler', 'portrait');
      doc.setFillColor(247, 245, 240);
      doc.setDrawColor(222, 226, 223);
      doc.roundedRect(margin, y - 11, pageBox().width - margin * 2, boxHeight, 4, 4, 'FD');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...green);
      doc.text(row.player.name, margin + 8, y + 1);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ink);
      doc.text(lines, margin + 145, y + 1);
      y += boxHeight + 6;
    });

    const pages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      const { width, height } = pageBox();
      doc.setDrawColor(...orange);
      doc.line(margin, height - 23, width - margin, height - 23);
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text('CourtHub - vertrauliche Trainerteam-Auswertung', margin, height - 10);
      doc.text('Seite ' + page + ' / ' + pages, width - margin, height - 10, { align: 'right' });
    }
  }

  function drawPDFTable(doc, columns, rows, x, getY, setY, ensureSpace, green, ink, title) {
    doc.setCharSpace(0);
    const totalWidth = columns.reduce((sum, column) => sum + column[1], 0);
    function header() {
      let y = getY();
      doc.setFillColor(...green);
      doc.rect(x, y, totalWidth, 19, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let cx = x;
      columns.forEach(column => { doc.text(column[0], column[2] === 'right' ? cx + column[1] - 4 : cx + 4, y + 13, { align: column[2] }); cx += column[1]; });
      setY(y + 19);
    }
    ensureSpace(38, title);
    header();
    rows.forEach((row, rowIndex) => {
      const lines = row.map((cell, index) => doc.splitTextToSize(String(cell == null ? '' : cell), columns[index][1] - 8));
      const rowHeight = Math.max(19, Math.max(...lines.map(value => value.length)) * 10 + 9);
      ensureSpace(rowHeight + 2, title);
      if (getY() < 90) header();
      const y = getY();
      if (rowIndex % 2) {
        doc.setFillColor(247, 245, 240);
        doc.rect(x, y, totalWidth, rowHeight, 'F');
      }
      doc.setTextColor(...ink);
      doc.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal');
      doc.setFontSize(8);
      let cx = x;
      lines.forEach((value, index) => {
        const column = columns[index];
        doc.text(value, column[2] === 'right' ? cx + column[1] - 4 : cx + 4, y + 12, { align: column[2] });
        cx += columns[index][1];
      });
      setY(y + rowHeight);
    });
    setY(getY() + 12);
  }

  function safeSeason(value) {
    return String(value || 'alle').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  }

  return { render, buildReport, buildPDF };
})();
