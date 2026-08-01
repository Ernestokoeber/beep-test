window.BT = window.BT || {};

BT.dashboard = (function() {
  const { $, renderTemplate, escapeHTML, downloadCSV, downloadJSON, todayISO, formatDate } = BT.util;

  function render(target) {
    if (BT.storage.withReadCache) {
      return BT.storage.withReadCache(() => renderDashboard(target));
    }
    return renderDashboard(target);
  }

  function renderDashboard(target) {
    const root = renderTemplate('tpl-dashboard');
    target.appendChild(root);

    $('[data-action="share-backup"]', root).addEventListener('click', () => BT.history.shareBackup());
    $('[data-action="import-backup"]', root).addEventListener('click', () => BT.history.importBackup());
    $('[data-action="export-season-csv"]', root).addEventListener('click', exportSeasonCSV);
    $('[data-action="export-season-json"]', root).addEventListener('click', exportSeasonJSON);

    renderSeasonSelect(root);

    const active = BT.storage.getActiveSeason();
    const allTrainings = BT.storage.getTrainings();
    const trainings = active === 'all' ? allTrainings : allTrainings.filter(t => t.seasonId === active);
    $('[data-role="trainings-count"]', root).textContent = trainings.length;

    const today = todayISO();
    const nextTraining = allTrainings
      .filter(training => (training.date || '') >= today)
      .sort((a, b) => ((a.date || '') + (a.startTime || '')).localeCompare((b.date || '') + (b.startTime || '')))[0];
    const nextTime = $('[data-role="next-training-time"]', root);
    const nextPlace = $('[data-role="next-training-place"]', root);
    const nextLegacy = $('[data-role="next-training"]', root);
    const nextCard = $('[data-role="next-training-card"]', root);
    if (nextTraining) {
      nextTime.textContent = formatDate(nextTraining.date) + (nextTraining.startTime ? ', ' + nextTraining.startTime : '');
      nextPlace.textContent = nextTraining.location || nextTraining.place || 'TSV Lindau';
      nextLegacy.textContent = nextTime.textContent;
      nextCard.href = '#/training/' + encodeURIComponent(nextTraining.id);
    } else {
      nextTime.textContent = 'Noch offen';
      nextPlace.textContent = 'Training planen';
      nextLegacy.textContent = 'Noch nicht geplant';
      nextCard.href = '#/schedule';
    }

    const activePlayers = BT.storage.getPlayers().filter(player => !player.archived);
    $('[data-role="player-count"]', root).textContent = activePlayers.length;
    renderNextTrainingAgenda(root, nextTraining);

    const ta = BT.stats.teamAttendance();
    $('[data-role="team-att-pct"]', root).textContent = ta.pct;
    $('[data-role="team-att-sub"]', root).textContent = ta.present + ' von ' + ta.slots + ' Slots';

    const tf = BT.stats.teamFreethrows();
    $('[data-role="team-ft-pct"]', root).textContent = tf.pct;
    $('[data-role="team-ft-sub"]', root).textContent = tf.attempted > 0
      ? tf.made + '/' + tf.attempted + ' aus ' + tf.sessions + ' Sessions'
      : 'Noch keine Daten';

    renderNextGame(root);

    renderCurrentPhase(root);
    renderAlerts(root);
    renderCoachBriefing(root);
    renderFormOfWeek(root);
    renderTopAttenders(root);
    renderTopFT(root);
    renderShotCategories(root);
    renderPositionStats(root);
    renderTeamHeatmap(root);
  }

  function renderNextTrainingAgenda(root, training) {
    const container = $('[data-role="next-training-agenda"]', root);
    if (!container) return;
    const drills = training && training.plan && Array.isArray(training.plan.drills) ? training.plan.drills : [];
    if (!training) {
      container.innerHTML = '<div class="agenda-empty"><strong>Noch kein Training geplant</strong><span>Lege den nächsten Termin und den Ablauf im Trainingsplan an.</span><a class="btn primary small" href="#/schedule">Training planen</a></div>';
      return;
    }
    if (!drills.length) {
      container.innerHTML = '<div class="agenda-empty"><strong>' + formatDate(training.date) + (training.startTime ? ' · ' + escapeHTML(training.startTime) : '') + '</strong><span>Für dieses Training ist noch kein Ablauf hinterlegt.</span><a class="btn primary small" href="#/training/' + encodeURIComponent(training.id) + '">Ablauf ergänzen</a></div>';
      return;
    }

    const start = /^\d{2}:\d{2}$/.test(training.startTime || '') ? training.startTime : '20:15';
    let elapsed = 0;
    container.innerHTML = drills.slice(0, 8).map((drill, index) => {
      const minutes = Math.max(0, Number(drill.minutes) || 0);
      const time = addMinutes(start, elapsed);
      elapsed += minutes;
      const icon = agendaIcon(drill.name, index);
      return '<a class="agenda-row" href="#/training/' + encodeURIComponent(training.id) + '">' +
        '<span class="agenda-row-icon agenda-icon-' + (index % 4) + '" aria-hidden="true">' + icon + '</span>' +
        '<span class="agenda-row-copy"><strong>' + escapeHTML(drill.name || 'Trainingsblock') + '</strong>' +
        (drill.description ? '<small>' + escapeHTML(drill.description) + '</small>' : '') + '</span>' +
        '<time>' + time + '</time><span class="agenda-arrow" aria-hidden="true">›</span></a>';
    }).join('');
  }

  function addMinutes(time, minutes) {
    const parts = time.split(':').map(Number);
    const total = ((parts[0] * 60 + parts[1] + minutes) % 1440 + 1440) % 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function agendaIcon(name, index) {
    const value = String(name || '').toLowerCase();
    if (/warm|aktiv|mobil/.test(value)) return '●';
    if (/ball|drib|handling/.test(value)) return '▲';
    if (/team|takt|horns|5-out|defen/.test(value)) return '●●';
    if (/wurf|freiwurf|abschluss|shoot/.test(value)) return '▣';
    if (/cool|feedback|stretch/.test(value)) return '▤';
    return ['●', '▲', '●●', '▣'][index % 4];
  }

  function renderNextGame(root) {
    const today = todayISO();
    const game = BT.storage.getGames().filter(item => (item.date || '') >= today && !item.score && item.status !== 'cancelled' && item.status !== 'abgesagt')
      .sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')))[0];
    if (!game) return;
    const opponent = /lindau/i.test(game.home || '') ? game.away : game.home;
    $('[data-role="next-game-opponent"]', root).textContent = opponent || 'Gegner offen';
    $('[data-role="next-game-meta"]', root).textContent = formatDate(game.date) + (game.time ? ' · ' + game.time : '') + ' · ' + (game.team === 'u18' ? 'U18' : 'Herren') + ' →';
  }

  function renderCoachBriefing(root) {
    const grid = $('[data-role="coach-briefing-grid"]', root);
    const list = $('[data-role="coach-briefing-list"]', root);
    const players = BT.storage.getPlayers().filter(player => !player.archived);
    const today = todayISO();
    const next = BT.storage.getTrainings()
      .filter(training => (training.date || '') >= today)
      .sort((a, b) => ((a.date || '') + (a.startTime || '')).localeCompare((b.date || '') + (b.startTime || '')))[0];
    const unavailable = players.filter(player => {
      if (player.availabilityUntil && player.availabilityUntil < today) return false;
      return player.availability && player.availability !== 'ready';
    });
    const activeGoals = players.flatMap(player => (player.goals || [])
      .filter(goal => goal.status !== 'done')
      .map(goal => ({ player, goal })));
    const dueGoals = activeGoals.filter(item => item.goal.targetDate && item.goal.targetDate <= today);
    const openAttendance = next ? (next.attendance || []).filter(entry => !entry.status).length : 0;
    const plannedMinutes = next && next.plan ? (next.plan.drills || []).reduce((sum, drill) => sum + (Number(drill.minutes) || 0), 0) : 0;

    grid.innerHTML = `
      <div><span>Nächstes Training</span><strong>${next ? formatDate(next.date) + (next.startTime ? ' · ' + escapeHTML(next.startTime) : '') : 'Noch nicht geplant'}</strong></div>
      <div><span>Kader bereit</span><strong>${players.length - unavailable.length} / ${players.length}</strong></div>
      <div><span>Planumfang</span><strong>${plannedMinutes ? plannedMinutes + ' min' : 'Noch offen'}</strong></div>
      <div><span>Aktive Ziele</span><strong>${activeGoals.length}</strong></div>
    `;

    const notes = [];
    unavailable.forEach(player => notes.push({ cls: 'warn', text: player.name + ': ' + ({ limited: 'eingeschränkt', injured: 'verletzt', away: 'abwesend' }[player.availability] || player.availability) + (player.availabilityNote ? ' – ' + player.availabilityNote : '') }));
    dueGoals.forEach(item => notes.push({ cls: 'warn', text: 'Ziel fällig: ' + item.player.name + ' – ' + item.goal.title }));
    if (next && openAttendance) notes.push({ cls: 'info', text: openAttendance + ' Anwesenheitsstatus für das nächste Training noch offen' });
    if (!next) notes.push({ cls: 'info', text: 'Nächstes Training im Trainingsplan anlegen' });
    if (!notes.length) notes.push({ cls: 'ok', text: 'Kader, Ziele und nächstes Training sind aktuell ohne offene Hinweise.' });
    list.innerHTML = notes.slice(0, 8).map(item => '<li class="briefing-' + item.cls + '">' + escapeHTML(item.text) + '</li>').join('');

    const briefingText = [
      'TSV Lindau Basketball · Trainerbriefing',
      next ? 'Training: ' + formatDate(next.date) + (next.startTime ? ' · ' + next.startTime + ' Uhr' : '') : 'Training: noch nicht geplant',
      'Kader bereit: ' + (players.length - unavailable.length) + '/' + players.length,
      plannedMinutes ? 'Planumfang: ' + plannedMinutes + ' Minuten' : 'Planumfang: noch offen',
      ...notes.map(item => '• ' + item.text)
    ].join('\n');
    $('[data-action="share-briefing"]', root).addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: 'Trainerbriefing', text: briefingText }); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(briefingText); BT.util.toast('Trainerbriefing kopiert.'); }
      catch { BT.util.downloadBlob('trainerbriefing-' + today + '.txt', new Blob([briefingText], { type: 'text/plain;charset=utf-8' })); }
    });
  }

  function renderCurrentPhase(root) {
    const banner = $('[data-role="phase-banner"]', root);
    if (!banner || !BT.storage.getPhaseForDate) return;
    const today = BT.util.todayISO();
    const phase = BT.storage.getPhaseForDate(today);
    if (!phase) { banner.classList.add('hidden'); return; }

    banner.classList.remove('hidden');
    $('[data-role="phase-banner-badge"]', banner).textContent = phase.name;
    $('[data-role="phase-banner-focus"]', banner).textContent = phase.focus || '';

    const start = new Date(phase.start);
    const end = new Date(phase.end);
    const now = new Date(today);
    const total = Math.max(1, Math.round((end - start) / 86400000));
    const elapsed = Math.max(0, Math.round((now - start) / 86400000));
    const remaining = Math.max(0, total - elapsed);
    const pct = Math.min(100, Math.round((elapsed / total) * 100));

    $('[data-role="phase-banner-days"]', banner).textContent = remaining === 0 ? 'Letzter Tag' : 'noch ' + remaining + ' Tage';
    $('[data-role="phase-banner-bar"]', banner).style.width = pct + '%';

    const goalsList = $('[data-role="phase-banner-goals"]', banner);
    if (Array.isArray(phase.goals) && phase.goals.length > 0) {
      goalsList.innerHTML = phase.goals.map(g => '<li>' + escapeHTML(g) + '</li>').join('');
      const btn = $('[data-action="toggle-phase-goals"]', banner);
      btn.addEventListener('click', () => {
        const hidden = goalsList.classList.toggle('hidden');
        btn.textContent = hidden ? 'Ziele anzeigen' : 'Ziele ausblenden';
      });
    } else {
      $('[data-action="toggle-phase-goals"]', banner).classList.add('hidden');
    }
  }

  function renderAlerts(root) {
    const section = $('[data-role="alerts"]', root);
    const list = $('[data-role="alerts-list"]', root);
    if (!section || !list || !BT.stats || !BT.stats.teamAlerts) return;
    const alerts = BT.stats.teamAlerts();
    if (!alerts || alerts.length === 0) {
      section.classList.add('hidden');
      list.innerHTML = '';
      return;
    }
    section.classList.remove('hidden');
    list.innerHTML = alerts.slice(0, 6).map(a => {
      const cls = a.severity === 'warn' ? 'alert-warn' : 'alert-info';
      const icon = a.severity === 'warn' ? '⚠️' : 'ℹ️';
      const link = a.playerId ? '<a href="#/player/' + a.playerId + '">' + escapeHTML(a.message) + '</a>' : escapeHTML(a.message);
      return '<li class="alert-row ' + cls + '"><span class="alert-icon">' + icon + '</span>' + link + '</li>';
    }).join('');
  }

  function renderFormOfWeek(root) {
    const section = $('[data-role="form-of-week"]', root);
    const grid = $('[data-role="form-of-week-grid"]', root);
    if (!section || !grid || !BT.stats || !BT.stats.improvingPlayers) return;
    const rows = BT.stats.improvingPlayers(3, 5, 3);
    if (!rows || rows.length === 0) {
      section.classList.add('hidden');
      grid.innerHTML = '';
      return;
    }
    section.classList.remove('hidden');
    grid.innerHTML = rows.map(r => {
      const posChip = r.player.position
        ? `<span class="form-pos-chip">${escapeHTML(r.player.position)}</span>`
        : '';
      const delta = r.delta >= 0 ? '+' + r.delta : String(r.delta);
      return `
        <a class="form-card" href="#/player/${r.player.id}">
          <div class="form-card-top">
            <span class="form-card-name">${escapeHTML(r.player.name)}</span>
            ${posChip}
          </div>
          <div class="form-card-delta">${delta} %</div>
          <div class="form-card-sub">vs. Saisonschnitt (letzte 3 vs. vorherige 5 Trainings)</div>
        </a>
      `;
    }).join('');
  }

  const POSITION_ORDER = [
    { rank: 0, patterns: [/point\s*guard/i, /\bpg\b/i, /^\s*1\s*$/, /aufbau/i] },
    { rank: 1, patterns: [/shooting\s*guard/i, /\bsg\b/i, /^\s*2\s*$/] },
    { rank: 2, patterns: [/small\s*forward/i, /\bsf\b/i, /^\s*3\s*$/] },
    { rank: 3, patterns: [/power\s*forward/i, /\bpf\b/i, /^\s*4\s*$/] },
    { rank: 4, patterns: [/\bcenter\b/i, /zentrum/i, /^\s*c\s*$/i, /^\s*5\s*$/] },
  ];

  function positionRank(pos) {
    if (!pos) return 900;
    for (const p of POSITION_ORDER) {
      if (p.patterns.some(re => re.test(pos))) return p.rank;
    }
    return 800;
  }

  function renderPositionStats(root) {
    const grid = $('[data-role="position-grid"]', root);
    const empty = $('[data-role="position-empty"]', root);
    const sortSel = $('[data-role="position-sort"]', root);
    if (!grid || !BT.stats || !BT.stats.statsByPosition) return;
    const buckets = BT.stats.statsByPosition();
    const keys = Object.keys(buckets);
    if (keys.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    const storedSort = localStorage.getItem('beeptest_pos_sort') || 'position';
    if (sortSel && !sortSel.dataset.bound) {
      sortSel.value = storedSort;
      sortSel.addEventListener('change', () => {
        localStorage.setItem('beeptest_pos_sort', sortSel.value);
        renderPositionStats(root);
      });
      sortSel.dataset.bound = '1';
    }
    const sortMode = sortSel ? sortSel.value : storedSort;

    keys.sort((a, b) => {
      if (a === 'Ohne Position') return 1;
      if (b === 'Ohne Position') return -1;
      if (sortMode === 'players') {
        const d = (buckets[b].players || 0) - (buckets[a].players || 0);
        if (d !== 0) return d;
      } else if (sortMode === 'ft') {
        const d = (buckets[b].ftPct || 0) - (buckets[a].ftPct || 0);
        if (d !== 0) return d;
      } else if (sortMode === 'fg') {
        const d = (buckets[b].fgPct || 0) - (buckets[a].fgPct || 0);
        if (d !== 0) return d;
      } else if (sortMode === 'attendance') {
        const d = (buckets[b].attendancePct || 0) - (buckets[a].attendancePct || 0);
        if (d !== 0) return d;
      }
      const ra = positionRank(a);
      const rb = positionRank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b, 'de');
    });

    function bar(valPct) {
      const w = Math.max(0, Math.min(100, valPct || 0));
      return `<span class="pos-bar"><span class="pos-bar-fill" style="width:${w}%"></span></span>`;
    }

    grid.innerHTML = keys.map(k => {
      const b = buckets[k];
      const ftCell = b.ftAttempted > 0
        ? `<span class="pos-metric-val">${b.ftPct} %</span><span class="pos-metric-sub muted-chip">${b.ftMade}/${b.ftAttempted}</span>`
        : `<span class="pos-metric-val muted">–</span>`;
      const fgCell = b.fgAttempted > 0
        ? `<span class="pos-metric-val">${b.fgPct} %</span><span class="pos-metric-sub muted-chip">${b.fgMade}/${b.fgAttempted}</span>`
        : `<span class="pos-metric-val muted">–</span>`;
      const attCell = `<span class="pos-metric-val">${b.attendancePct} %</span>`;
      return `
        <article class="pos-card">
          <header class="pos-card-head">
            <h4 class="pos-card-title">${escapeHTML(k)}</h4>
            <span class="pos-card-count">${b.players} Spieler</span>
          </header>
          <dl class="pos-card-metrics">
            <div class="pos-metric">
              <dt>Freiwürfe</dt>
              <dd>${ftCell}${bar(b.ftPct)}</dd>
            </div>
            <div class="pos-metric">
              <dt>Feldwürfe</dt>
              <dd>${fgCell}${bar(b.fgPct)}</dd>
            </div>
            <div class="pos-metric">
              <dt>Anwesenheit</dt>
              <dd>${attCell}${bar(b.attendancePct)}</dd>
            </div>
          </dl>
        </article>
      `;
    }).join('');
  }

  function renderSeasonSelect(root) {
    const sel = $('[data-role="season-select"]', root);
    if (!sel) return;
    const seasons = BT.storage.getSeasons();
    const active = BT.storage.getActiveSeason();
    sel.innerHTML = '<option value="all">Alle Saisons</option>' +
      seasons.map(s => '<option value="' + s + '">' + 'Saison ' + s + '</option>').join('');
    sel.value = active;
    sel.addEventListener('change', () => {
      BT.storage.setActiveSeason(sel.value);
      const main = document.getElementById('app');
      main.innerHTML = '';
      render(main);
    });
  }

  function renderTeamHeatmap(root) {
    const wrap = $('[data-role="team-heat-wrap"]', root);
    const meta = $('[data-role="team-heat-meta"]', root);
    const empty = $('[data-role="team-heat-empty"]', root);
    const cells = $('[data-role="team-heat-cells"]', root);
    if (!wrap || !cells) return;

    const trainings = BT.stats.endedTrainings();
    const shots = [];
    for (const t of trainings) {
      for (const s of (t.shotMap || [])) shots.push(s);
    }
    if (shots.length === 0) {
      if (empty) empty.classList.remove('hidden');
      if (wrap) wrap.style.display = 'none';
      if (meta) meta.textContent = '';
      cells.innerHTML = '';
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (wrap) wrap.style.display = '';

    const hits = shots.filter(s => s.made).length;
    const totalPct = Math.round((hits / shots.length) * 100);
    if (meta) meta.textContent = shots.length + ' Würfe · ' + hits + ' Treffer · ' + (shots.length - hits) + ' Fehlwürfe · ' + totalPct + '% · ' + trainings.length + ' Trainings';

    BT.heatmap.renderZones(cells, shots);
  }

  function renderTopAttenders(root) {
    const list = $('[data-role="top-att"]', root);
    list.innerHTML = '';
    const top = BT.stats.topAttenders(10);
    if (top.length === 0) {
      const li = document.createElement('li');
      li.className = 'rank-empty';
      li.textContent = 'Noch keine Anwesenheits-Daten.';
      list.appendChild(li);
      return;
    }
    top.forEach((row, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <a class="rank-name" href="#/player/${row.player.id}">${escapeHTML(row.player.name)}</a>
        <span class="rank-bar"><span class="rank-fill" style="width:${row.stats.pct}%"></span></span>
        <span class="rank-val">${row.stats.pct}% <span class="muted-chip">(${row.stats.present}/${row.stats.total})</span></span>
      `;
      list.appendChild(li);
    });
  }

  function renderTopFT(root) {
    const list = $('[data-role="top-ft"]', root);
    const empty = $('[data-role="top-ft-empty"]', root);
    list.innerHTML = '';
    const top = BT.stats.topFreethrowShooters(10, 10);
    if (top.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    top.forEach((row, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <a class="rank-name" href="#/player/${row.player.id}">${escapeHTML(row.player.name)}</a>
        <span class="rank-bar"><span class="rank-fill" style="width:${row.stats.pct}%"></span></span>
        <span class="rank-val">${row.stats.pct}% <span class="muted-chip">(${row.stats.made}/${row.stats.attempted})</span></span>
      `;
      list.appendChild(li);
    });
  }

  function renderShotCategories(root) {
    const wrap = $('[data-role="shot-cats"]', root);
    const empty = $('[data-role="shot-cats-empty"]', root);
    wrap.innerHTML = '';
    const cats = BT.stats.teamShotsByCategory().filter(c => c.attempted > 0);
    if (cats.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    for (const cat of cats) {
      const block = document.createElement('div');
      block.className = 'cat-block';
      const top = BT.stats.topShootersByCategory(cat.category, 3, 5);
      block.innerHTML = `
        <div class="cat-block-head">
          <span class="cat-name">${escapeHTML(cat.category)}</span>
          <span class="att-chip ok">${cat.pct}%</span>
          <span class="muted-chip">${cat.made}/${cat.attempted}</span>
        </div>
        <ol class="ranking compact">
          ${top.length === 0 ? '<li class="rank-empty">Noch zu wenig Daten (min. 5 Versuche)</li>' : top.map((r, i) => `
            <li>
              <span class="rank-pos">${i + 1}</span>
              <a class="rank-name" href="#/player/${r.player.id}">${escapeHTML(r.player.name)}</a>
              <span class="rank-val">${r.stats.pct}% <span class="muted-chip">(${r.stats.made}/${r.stats.attempted})</span></span>
            </li>
          `).join('')}
        </ol>
      `;
      wrap.appendChild(block);
    }
  }

  function seasonScopedTrainings() {
    const active = BT.storage.getActiveSeason();
    const all = BT.storage.getTrainings();
    const filtered = active === 'all' ? all : all.filter(t => t.seasonId === active);
    return filtered.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  function activeSeasonSuffix() {
    const active = BT.storage.getActiveSeason();
    if (active === 'all') return 'gesamt';
    return active.replace('/', '-');
  }

  function exportSeasonCSV() {
    const trainings = seasonScopedTrainings();
    const players = BT.storage.getPlayers();
    const playerById = id => players.find(p => p.id === id);

    const STATUS_SYMBOL = { present: '✓', absent: '✗', excused: 'E', injured: 'V' };
    const rows = [];
    rows.push(['# Saison-Export', 'Erstellt: ' + new Date().toISOString()]);
    rows.push([]);

    rows.push(['# Anwesenheits-Matrix']);
    const header = ['Spieler', 'Position'].concat(trainings.map(t => t.date)).concat(['Anwesend', 'Möglich', 'Quote %']);
    rows.push(header);
    const sortedPlayers = players.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
    for (const p of sortedPlayers) {
      const row = [p.name, p.position || ''];
      let present = 0, total = 0;
      for (const t of trainings) {
        const a = (t.attendance || []).find(x => x.playerId === p.id);
        if (!a) { row.push(''); continue; }
        total++;
        if (a.status === 'present') present++;
        const sym = STATUS_SYMBOL[a.status] || '?';
        row.push(sym + (a.late ? '+' : ''));
      }
      row.push(present, total, total ? Math.round((present / total) * 100) : 0);
      rows.push(row);
    }
    rows.push([]);
    rows.push(['Legende:', '✓ anwesend', '✗ abwesend', 'E entschuldigt', 'V verletzt', '+ zu spät']);
    rows.push([]);

    rows.push(['# Freiwürfe (alle Trainings)']);
    rows.push(['Datum', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %']);
    for (const t of trainings) {
      const presentIds = new Set((t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
      const fts = (t.freethrows || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
      const sorted = fts.slice().sort((a, b) => {
        const pa = playerById(a.playerId), pb = playerById(b.playerId);
        return (pa ? pa.name : '').localeCompare(pb ? pb.name : '', 'de');
      });
      for (const e of sorted) {
        const p = playerById(e.playerId);
        rows.push([t.date, p ? p.name : '?', p && p.position ? p.position : '', e.made, e.attempted, BT.stats.pct(e.made, e.attempted)]);
      }
    }
    rows.push([]);

    const allCats = new Set();
    for (const t of trainings) for (const c of (t.shots || [])) allCats.add(c.category);
    for (const cat of Array.from(allCats).sort()) {
      rows.push(['# Würfe – ' + cat]);
      rows.push(['Datum', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %']);
      for (const t of trainings) {
        const presentIds = new Set((t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
        const c = (t.shots || []).find(s => s.category === cat);
        if (!c) continue;
        const entries = (c.entries || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
        const sorted = entries.slice().sort((a, b) => {
          const pa = playerById(a.playerId), pb = playerById(b.playerId);
          return (pa ? pa.name : '').localeCompare(pb ? pb.name : '', 'de');
        });
        for (const e of sorted) {
          const p = playerById(e.playerId);
          rows.push([t.date, p ? p.name : '?', p && p.position ? p.position : '', e.made, e.attempted, BT.stats.pct(e.made, e.attempted)]);
        }
      }
      rows.push([]);
    }

    rows.push(['# Saison-Aggregat pro Spieler']);
    rows.push(['Spieler', 'Position', 'Anwesend', 'Möglich', 'Quote %', 'FT Treffer', 'FT Versuche', 'FT %']);
    for (const p of sortedPlayers) {
      const att = BT.stats.playerAttendance(p.id);
      const ft = BT.stats.playerFreethrows(p.id);
      rows.push([p.name, p.position || '', att.present, att.total, att.pct, ft.made, ft.attempted, ft.pct]);
    }

    downloadCSV('saison_' + activeSeasonSuffix() + '_' + todayISO() + '.csv', rows);
  }

  function exportSeasonJSON() {
    const trainings = seasonScopedTrainings();
    const players = BT.storage.getPlayers();
    const playerById = id => players.find(p => p.id === id);
    const enrich = (e) => {
      const p = playerById(e.playerId);
      return {
        playerId: e.playerId,
        name: p ? p.name : null,
        position: p && p.position ? p.position : null,
        made: e.made, attempted: e.attempted,
        pct: BT.stats.pct(e.made, e.attempted)
      };
    };

    const payload = {
      type: 'season-export',
      exportedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, position: p.position || null,
        birthDate: p.birthDate || null, archived: !!p.archived,
        seasonStats: {
          attendance: BT.stats.playerAttendance(p.id),
          freethrows: BT.stats.playerFreethrows(p.id),
          shotsByCategory: BT.stats.playerShotsByCategory(p.id)
        }
      })),
      teamStats: {
        attendance: BT.stats.teamAttendance(),
        freethrows: BT.stats.teamFreethrows(),
        shotsByCategory: BT.stats.teamShotsByCategory()
      },
      trainings: trainings.map(t => {
        const presentIds = new Set((t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
        return {
          id: t.id, date: t.date, startTime: t.startTime || null, note: t.note || null,
          attendance: (t.attendance || []).map(a => {
            const p = playerById(a.playerId);
            return {
              playerId: a.playerId,
              name: p ? p.name : null,
              status: a.status, late: !!a.late, note: a.note || null
            };
          }),
          freethrows: (t.freethrows || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0).map(enrich),
          shots: (t.shots || []).map(c => ({
            category: c.category,
            entries: (c.entries || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0).map(enrich)
          })).filter(c => c.entries.length > 0)
        };
      })
    };

    downloadJSON('saison_' + activeSeasonSuffix() + '_' + todayISO() + '.json', payload);
  }

  return { render };
})();
