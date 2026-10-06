window.BT = window.BT || {};

BT.dashboard = (function() {
  const { $, renderTemplate, escapeHTML, downloadCSV, downloadJSON, todayISO, formatDate } = BT.util;

  function nextTraining(trainings, today) {
    return trainings.filter(training => (training.date || '') >= today && !training.endedAt &&
      !['completed', 'cancelled', 'abgesagt'].includes(training.status))
      .sort((a, b) => ((a.date || '') + (a.startTime || '')).localeCompare((b.date || '') + (b.startTime || '')))[0];
  }

  function render(target) {
    if (BT.storage.withReadCache) {
      return BT.storage.withReadCache(() => renderDashboard(target));
    }
    return renderDashboard(target);
  }

  function renderDashboard(target) {
    const root = renderTemplate('tpl-dashboard');
    const briefing = buildCoachBriefing();
    const next = briefing.next;
    $('[data-role="next-training-time"]', root).textContent = next ? formatDate(next.date) + (next.startTime ? ' · ' + next.startTime + ' Uhr' : '') : 'Noch nicht geplant';
    $('[data-role="next-training-place"]', root).textContent = next?.location || next?.place || '';
    $('[data-role="home-training-focus"]', root).textContent = next?.plan?.summary || (next ? 'Schwerpunkt noch offen' : 'Lege deinen nächsten Trainingstermin an.');
    $('[data-role="home-training-attendance"]', root).textContent = next ? briefing.present + ' anwesend eingetragen · ' + briefing.open + ' Status offen' : '';
    const link = $('[data-role="next-training-card"]', root);
    link.href = next ? '#/training/' + encodeURIComponent(next.id) : '#/schedule';
    link.textContent = next ? 'Training öffnen' : 'Training planen';
    $('[data-role="dashboard-date"]', root).textContent = formatDate(todayISO());
    const notices = briefing.notes.filter(note => note.cls === 'warn');
    const restricted = briefing.sections.find(section => section.title === 'Teilnahme und Einschränkungen')?.lines.slice(2) || [];
    if (restricted.length) notices.unshift({text: restricted.length + ' Spieler mit Abmeldung oder Einschränkung. Im Briefing prüfen.'});
    if (notices.length) {
      $('[data-role="home-notices"]', root).hidden = false;
      $('[data-role="home-notices-list"]', root).innerHTML = notices.slice(0, 3).map(note => '<li>' + escapeHTML(note.text) + '</li>').join('') +
        (notices.length > 3 ? '<li><a href="#/briefing">' + (notices.length - 3) + ' weitere Hinweise im Briefing</a></li>' : '');
    }
    renderNextGame(root);
    renderAlerts(root);
    target.append(root);
  }

  function cachedRender(target, renderView) {
    return BT.storage.withReadCache ? BT.storage.withReadCache(() => renderView(target)) : renderView(target);
  }

  function renderBriefing(target) {
    return cachedRender(target, host => {
      const root = renderTemplate('tpl-coach-briefing');
      renderCoachBriefing(root);
      renderCurrentPhase(root);
      host.append(root);
    });
  }

  function renderStatistics(target) {
    return cachedRender(target, host => {
      const root = renderTemplate('tpl-statistics');
      renderSeasonSelect(root, renderStatistics);
      const attendance = BT.stats.teamAttendance();
      $('[data-role="team-att-pct"]', root).textContent = attendance.pct;
      $('[data-role="team-att-sub"]', root).textContent = attendance.present + ' von ' + attendance.slots + ' erfassten Terminen';
      const ft = BT.stats.teamFreethrows();
      $('[data-role="team-ft-pct"]', root).textContent = ft.pct;
      $('[data-role="team-ft-sub"]', root).textContent = ft.attempted ? ft.made + '/' + ft.attempted + ' aus ' + ft.sessions + ' Trainings' : 'Noch keine Daten';
      renderFormOfWeek(root);
      renderTopAttenders(root);
      renderTopFT(root);
      renderShotCategories(root);
      renderPositionStats(root);
      renderTeamHeatmap(root);
      host.append(root);
    });
  }

  function renderData(target) {
    const root = renderTemplate('tpl-dashboard-data');
    renderSeasonSelect(root, renderData);
    $('[data-action="share-backup"]', root).addEventListener('click', () => BT.history.shareBackup());
    $('[data-action="import-backup"]', root).addEventListener('click', () => BT.history.importBackup());
    $('[data-action="export-season-csv"]', root).addEventListener('click', exportSeasonCSV);
    $('[data-action="export-season-json"]', root).addEventListener('click', exportSeasonJSON);
    target.append(root);
  }

  function addMinutes(time, minutes) {
    const parts = time.split(':').map(Number);
    const total = ((parts[0] * 60 + parts[1] + minutes) % 1440 + 1440) % 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function renderNextGame(root) {
    const today = todayISO();
    const game = BT.storage.getGames().filter(item => (item.date || '') >= today && !item.score && !['cancelled', 'abgesagt', 'played', 'completed'].includes(item.status))
      .sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')))[0];
    if (!game) return;
    $('.next-game-strip', root).href = '#/games/' + encodeURIComponent(game.id) + '/matchday';
    const opponent = /lindau/i.test(game.home || '') ? game.away : game.home;
    $('[data-role="next-game-opponent"]', root).textContent = opponent || 'Gegner offen';
    $('[data-role="next-game-meta"]', root).textContent = formatDate(game.date) + (game.time ? ' · ' + game.time : '') + ' · ' + (game.team === 'u18' ? 'U18' : 'Herren') + ' →';
  }

  function buildCoachBriefing() {
    const today = todayISO();
    const next = nextTraining(BT.storage.getTrainings(), today);
    const targetDate = next?.date || today;
    const players = BT.storage.getPlayers().filter(player => !player.archived && !BT.staff?.isCoachOnly(next, player.id));
    const availability = player => player.availabilityUntil && player.availabilityUntil < targetDate ? 'ready' : player.availability || 'ready';
    const attendance = BT.staff?.playerAttendance(next) || next?.attendance || [];
    const byPlayer = new Map(attendance.map(entry => [entry.playerId, entry]));
    const present = players.filter(player => byPlayer.get(player.id)?.status === 'present').length;
    const open = next ? players.filter(player => !byPlayer.get(player.id)?.status || byPlayer.get(player.id)?.status === 'pending').length : 0;
    const unavailable = players.filter(player => ['injured', 'away'].includes(availability(player)));
    const plan = next?.plan || {};
    const drills = Array.isArray(plan.drills) ? plan.drills : [];
    const plannedMinutes = drills.reduce((sum, drill) => sum + Math.max(0, Number(drill.minutes) || 0), 0);
    const goals = players.flatMap(player => (player.goals || []).filter(goal => goal.status !== 'done').map(goal => ({player, goal})));
    const sections = [];
    const notes = [];
    const text = value => String(value || '').trim();
    const unique = values => [...new Set(values.map(text).filter(Boolean))];
    const add = (title, lines, href, linkLabel) => sections.push({title, lines: unique(lines), href, linkLabel});
    const trainingLink = next ? '#/training/' + encodeURIComponent(next.id) : '#/schedule';
    const strategy = BT.teamStrategy?.current?.();

    add('Ziel und Schwerpunkt', next ? [plan.summary || 'Noch kein Trainingsschwerpunkt hinterlegt.', next.note,
      plan.evidenceBasis?.planningDecision,
      ...(plan.evidenceBasis?.observedTrends || []).map(value => 'Planungsgrundlage: ' + value)]
      : ['Noch kein nächstes Training geplant.'], trainingLink, next ? 'Trainingsplan bearbeiten' : 'Training planen');
    if (strategy) add('Aktuelles Teamkonzept', [strategy.name, 'Offense: ' + strategy.offensePrinciples,
      'Defense: ' + strategy.defensePrinciples, 'Umschalten: ' + strategy.transitionPrinciples], '#/schedule/team-concept', 'Teamkonzept öffnen');

    const blocks = [];
    let elapsed = 0;
    const tactics = BT.teamStrategy?.activeTactics?.() || [];
    for (const [index, drill] of drills.entries()) {
      const minutes = Math.max(0, Number(drill.minutes) || 0);
      const start = /^\d{2}:\d{2}$/.test(next?.startTime || '') ? addMinutes(next.startTime, elapsed) + ' Uhr' : 'ab Minute ' + elapsed;
      const tactic = tactics.find(item => drill.tacticId ? item.id === drill.tacticId : item.title === drill.name);
      const points = unique([...(Array.isArray(drill.coachingPoints) ? drill.coachingPoints : []), drill.description,
        ...(tactic?.coachingPoints || [])]);
      blocks.push({title: `${index + 1}. ${drill.name || 'Trainingsblock'}`, meta: `${start} · ${minutes} min · Intensität: ${({low: 'niedrig', medium: 'mittel', high: 'hoch'})[drill.intensity] || 'nicht angegeben'}`,
        lines: points.length ? points : ['Coaching-Punkte und Übungsregeln fehlen noch.']});
      elapsed += minutes;
    }
    if (next && !drills.length) notes.push({cls: 'warn', text: 'Trainingsablauf und Coaching-Punkte sind noch nicht hinterlegt.'});
    if (plan.durationMinutes && plannedMinutes !== Number(plan.durationMinutes)) notes.push({cls: 'warn', text:
      plannedMinutes > Number(plan.durationMinutes) ? `${plannedMinutes - Number(plan.durationMinutes)} Minuten über der vorgesehenen Trainingsdauer.` : `${Number(plan.durationMinutes) - plannedMinutes} Minuten noch nicht verplant.`});
    const planText = [plan.summary, ...drills.flatMap(drill => [drill.name, drill.description, ...(drill.coachingPoints || [])])].join(' ').toLocaleLowerCase('de');
    const oldConcepts = (strategy?.excludedConcepts || []).filter(concept => planText.includes(concept.toLocaleLowerCase('de')));
    if (oldConcepts.length) notes.push({cls: 'warn', text: 'Plan enthält ausgeschlossene Konzepte: ' + oldConcepts.join(', ') + '. Vor dem Training mit dem aktuellen Teamkonzept abgleichen.'});

    const rosterLines = next ? [`${present} Teilnahme als anwesend eingetragen · ${open} Status offen.`,
      `${players.length - unavailable.length} von ${players.length} Spielern grundsätzlich verfügbar; das ist keine Teilnahmezusage.`]
      : ['Die Teilnahme kann erst für einen konkreten Trainingstermin angezeigt werden.'];
    for (const player of players) {
      const status = availability(player);
      const entry = byPlayer.get(player.id);
      if (status !== 'ready' || ['injured', 'absent', 'excused'].includes(entry?.status)) {
        const labels = {limited: 'eingeschränkt', injured: 'verletzt', away: 'abwesend', absent: 'abgemeldet', excused: 'entschuldigt'};
        const details = unique([status !== 'ready' ? labels[status] || status : '', labels[entry?.status], status !== 'ready' ? player.availabilityNote : '', entry?.note]);
        rosterLines.push(player.name + ': ' + details.join(' · '));
      }
    }
    add('Teilnahme und Einschränkungen', rosterLines, trainingLink, 'Teilnahme und Trainerteam bearbeiten');

    const loadLines = [plan.loadTarget ? 'Geplante Belastung: ' + (({low: 'niedrig', medium: 'mittel', high: 'hoch', individual: 'individuell'})[plan.loadTarget] || plan.loadTarget) : 'Belastungsziel noch nicht hinterlegt.',
      plan.loadReason, ...(plan.evidenceBasis?.loadConsiderations || [])];
    for (const player of players) {
      if (['absent', 'excused'].includes(byPlayer.get(player.id)?.status) || availability(player) === 'away') continue;
      const entry = next?.stationTraining?.players?.[player.id];
      if (entry && BT.stationTraining?.recommendation) {
        const recommendation = BT.stationTraining.recommendation({...entry, injured: entry.injured || availability(player) === 'injured' || byPlayer.get(player.id)?.status === 'injured'}, next.stationTraining.gameDate, next.date);
        if (recommendation.light !== 'green') loadLines.push(`${player.name}: Ampel ${({yellow: 'Gelb', red: 'Rot'})[recommendation.light]} · Ziel-RPE ${recommendation.targetRpe}. ${recommendation.message}`);
      }
      if (availability(player) === 'limited') loadLines.push(player.name + ': Belastung vor Beginn individuell abstimmen; Einschränkung beachten.');
    }
    if (!next?.stationTraining) loadLines.push('Individuelle Tagesform und Schmerzen für dieses Training noch nicht erfasst.');
    add('Belastung und Anpassungen', loadLines, trainingLink, 'Belastung im Training prüfen');

    const staff = next?.staff || [];
    const staffLines = BT.staff?.lines(staff) || [];
    for (const role of ['coach', 'assistant']) {
      const member = staff.find(item => item.role === role);
      if (!member) staffLines.push((role === 'coach' ? 'Trainer' : 'Co-Trainer') + ': noch nicht zugeordnet.');
      else if (member.status === 'present') staffLines.push('Aufgabenvorschlag für ' + member.name + ': ' + (role === 'coach'
        ? 'Ziel erklären, Ablauf und Zeit steuern, Spieltransfer und Abschlussfeedback führen.'
        : 'Ausführung beobachten, individuelle Korrekturen geben und wiederkehrende Fehler für das Feedback notieren.'));
    }
    add('Trainerteam und Aufgaben', staffLines, trainingLink, 'Trainerteam zuordnen');
    add('Individuelle Spielerziele', goals.length ? goals.map(({player, goal}) => player.name + ': ' + goal.title +
      (goal.targetDate ? ' · ' + (goal.targetDate <= today ? 'fällig: ' : 'Termin: ') + formatDate(goal.targetDate) : '')) : ['Keine aktiven Spielerziele hinterlegt.'], '#/players', 'Spielerziele öffnen');

    const opponent = plan.opponentPlan;
    const defense = opponent?.defenseRecommendation;
    if (opponent) add('Vorbereitung auf ' + (opponent.opponent || 'den nächsten Gegner'), [
      defense?.startLabel ? 'Startverteidigung: ' + defense.startLabel : 'Startverteidigung noch offen.',
      defense?.alternativeLabel ? 'Alternative: ' + defense.alternativeLabel : '',
      ...(defense?.reasons || []).map(reason => 'Begründung: ' + reason),
      ...(defense?.triggers || []).map(trigger => 'Wechsel-Auslöser: ' + trigger),
      'Datenlage: ' + (({high: 'hoch', medium: 'mittel', low: 'gering'})[opponent.dataQuality?.confidence] || 'nicht angegeben')], trainingLink, 'Gegnerplan im Training öffnen');

    if (next && open) notes.push({cls: 'info', text: `${open} Teilnahmestatus noch offen; tatsächliche Gruppengröße vor Beginn prüfen.`});
    if (next && !staff.some(member => member.role === 'coach' && member.status === 'present')) notes.push({cls: 'warn', text: 'Noch kein anwesender Trainer für dieses Training eingetragen.'});
    const shareText = ['TSV Lindau Basketball · Trainerbriefing', next ? 'Training: ' + formatDate(next.date) + (next.startTime ? ' · ' + next.startTime + ' Uhr' : '') + (next.location || next.place ? ' · ' + (next.location || next.place) : '') : 'Training: noch nicht geplant',
      ...sections.flatMap(section => ['', section.title, ...section.lines.map(line => '• ' + line)]),
      '', 'Ablauf und Coaching-Punkte', ...blocks.flatMap(block => [block.title + ' · ' + block.meta, ...block.lines.map(line => '• ' + line)]),
      '', 'Vor Beginn klären', ...notes.map(note => '• ' + note.text)].join('\n');
    return {next, present, open, players: players.length, goals: goals.length, plannedMinutes, sections, blocks, notes, shareText};
  }

  function renderCoachBriefing(root) {
    const briefing = buildCoachBriefing();
    const {next, present, open, plannedMinutes} = briefing;
    $('[data-role="coach-briefing-grid"]', root).innerHTML = `
      <div><span>Nächstes Training</span><strong>${next ? formatDate(next.date) + (next.startTime ? ' · ' + escapeHTML(next.startTime) : '') : 'Noch nicht geplant'}</strong></div>
      <div><span>Teilnahme eingetragen</span><strong>${next ? present + ' / ' + briefing.players : 'Noch offen'}</strong><small>${next ? open + ' Status offen' : 'Training zuerst planen'}</small></div>
      <div><span>Planumfang</span><strong>${plannedMinutes ? plannedMinutes + ' min' : 'Noch offen'}</strong></div>
      <div><span>Aktive Ziele</span><strong>${briefing.goals}</strong></div>`;
    const listMarkup = lines => '<ul>' + lines.map(line => '<li>' + escapeHTML(line) + '</li>').join('') + '</ul>';
    $('[data-role="coach-briefing-content"]', root).innerHTML = briefing.sections.map((section, index) =>
      '<details class="briefing-section"' + (index === 0 ? ' open' : '') + '><summary>' + escapeHTML(section.title) + '</summary>' + listMarkup(section.lines) +
      '<a class="btn small" href="' + section.href + '">' + escapeHTML(section.linkLabel) + '</a></details>').join('') +
      '<details class="briefing-section" data-role="briefing-blocks"><summary>Ablauf und Coaching-Punkte · ' + briefing.blocks.length + ' Blöcke</summary>' +
      (briefing.blocks.length ? briefing.blocks.map(block => '<article class="briefing-block"><h4>' + escapeHTML(block.title) + '</h4><p class="muted">' + escapeHTML(block.meta) + '</p>' + listMarkup(block.lines) + '</article>').join('') : '<p>Noch keine Übungen geplant.</p>') + '</details>';
    $('[data-role="coach-briefing-list"]', root).innerHTML = briefing.notes.map(item => '<li class="briefing-' + item.cls + '">' + escapeHTML(item.text) + '</li>').join('');
    $('[data-action="share-briefing"]', root).addEventListener('click', async () => {
      // Read again when sharing: another view or sync may have updated the plan.
      const briefingText = BT.storage.withReadCache ? BT.storage.withReadCache(() => buildCoachBriefing().shareText) : buildCoachBriefing().shareText;
      if (navigator.share) {
        try { await navigator.share({ title: 'Trainerbriefing', text: briefingText }); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(briefingText); BT.util.toast('Trainerbriefing kopiert.'); }
      catch { BT.util.downloadBlob('trainerbriefing-' + todayISO() + '.txt', new Blob([briefingText], { type: 'text/plain;charset=utf-8' })); }
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

  function renderSeasonSelect(root, renderView) {
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
      renderView(main);
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
    const ranking = BT.stats.attendanceRanking();
    const row = (entry, index) => '<li class="attendance-rank-row">' + (index === null ? '<span class="rank-pending">–</span>' : '<span class="rank-pos">' + (index + 1) + '</span>') +
      '<a class="rank-name" href="#/player/' + encodeURIComponent(entry.player.id) + '">' + escapeHTML(entry.player.name) + '</a>' +
      '<span class="attendance-rank-value"><strong>' + entry.stats.present + ' Teilnahmen</strong><small>' + entry.stats.present + '/' + entry.stats.total + ' · ' + entry.stats.pct + ' %</small></span></li>';
    list.innerHTML = ranking.ranked.length ? ranking.ranked.map((entry, index) => row(entry, index)).join('') :
      '<li class="rank-empty">Noch keine belastbare Rangliste: mindestens ' + ranking.minSessions + ' erfasste Termine pro Spieler.</li>';
    $('[data-role="attendance-provisional-count"]', root).textContent = '(' + ranking.provisional.length + ')';
    $('[data-role="attendance-provisional"]', root).innerHTML = ranking.provisional.length ? ranking.provisional.map(entry => row(entry, null)).join('') : '<li class="rank-empty">Keine Spieler mit weniger als ' + ranking.minSessions + ' erfassten Terminen.</li>';
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
        const a = (BT.staff?.playerAttendance(t) || t.attendance || []).find(x => x.playerId === p.id);
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
      const presentIds = new Set((BT.staff?.playerAttendance(t) || t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
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
        const presentIds = new Set((BT.staff?.playerAttendance(t) || t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
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
        const presentIds = new Set((BT.staff?.playerAttendance(t) || t.attendance || []).filter(a => a.status === 'present').map(a => a.playerId));
        return {
          id: t.id, date: t.date, startTime: t.startTime || null, note: t.note || null,
          attendance: (BT.staff?.playerAttendance(t) || t.attendance || []).map(a => {
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

  return { render, renderBriefing, renderStatistics, renderData, __test: { buildCoachBriefing, nextTraining } };
})();
