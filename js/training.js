window.BT = window.BT || {};

BT.training = (function() {
  const { $, $$, renderTemplate, formatDate, todayISO, escapeHTML, downloadCSV, downloadJSON, downloadBlob } = BT.util;

  const STATUS_LABELS = {
    present: 'Anwesend',
    absent: 'Abwesend',
    excused: 'Entschuldigt',
    injured: 'Verletzt'
  };

  const STATUS_SYMBOL = {
    present: '✓',
    absent: '✗',
    excused: 'E',
    injured: 'V'
  };

  function renderList(target) {
    const root = renderTemplate('tpl-training-list');
    target.appendChild(root);

    root.addEventListener('click', e => {
      if (e.target.closest('[data-action="new-training"]')) {
        const t = BT.storage.upsertTraining({
          date: todayISO(),
          startTime: BT.storage.getSetting('trainingStartTime', '20:15'),
          note: '',
          attendance: initialAttendance(),
          freethrows: [],
          shots: []
        });
        location.hash = '#/training/' + t.id;
      }
    });

    const list = $('[data-role="list"]', root);
    const empty = $('[data-role="empty"]', root);
    const trainings = BT.storage.getTrainings();

    if (trainings.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    const today = todayISO();
    const upcoming = trainings.filter(t => (t.date || '') >= today)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const past = trainings.filter(t => (t.date || '') < today)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (upcoming.length > 0) {
      const head = document.createElement('li');
      head.className = 'list-section-head';
      head.textContent = 'Anstehend (' + upcoming.length + ')';
      list.appendChild(head);
      for (const t of upcoming) list.appendChild(buildTrainingItem(t, false));
    }

    if (past.length > 0) {
      const head = document.createElement('li');
      head.className = 'list-section-head past';
      head.textContent = 'Absolviert (' + past.length + ')';
      list.appendChild(head);
      for (const t of past) list.appendChild(buildTrainingItem(t, true));
    }
  }

  function buildTrainingItem(t, isPast) {
    const summary = summarize(t);
    const li = document.createElement('li');
    if (isPast) li.classList.add('past');
    const a = document.createElement('a');
    a.href = '#/training/' + t.id;
    const endedBadge = t.endedAt ? '<span class="att-chip ok">🏁 Beendet</span> ' : '';
    const badge = isPast && !t.endedAt ? '<span class="att-chip muted-chip">Absolviert</span> ' : '';
    const trendBadge = isPast ? renderTrendBadge(t) : '';
    a.innerHTML = `
      <div class="info">
        <div class="name">${formatDate(t.date)}${t.startTime ? ' · ' + escapeHTML(t.startTime) : ''}${t.note ? ' – ' + escapeHTML(t.note) : ''}</div>
        <div class="meta">
          ${endedBadge}${badge}
          ${summary.pending === summary.total && summary.total > 0
            ? '<span class="att-chip muted-chip">○ Anwesenheit offen</span>'
            : `<span class="att-chip ok">✓ ${summary.present}</span>
               <span class="att-chip bad">✗ ${summary.absent}</span>
               <span class="att-chip warn">E ${summary.excused}</span>
               <span class="att-chip warn">V ${summary.injured}</span>
               ${summary.late > 0 ? '<span class="att-chip">Spät: ' + summary.late + '</span>' : ''}
               ${summary.pending > 0 ? '<span class="att-chip muted-chip">○ Offen ' + summary.pending + '</span>' : ''}`}
          ${trendBadge}
        </div>
      </div>
    `;
    li.appendChild(a);
    return li;
  }

  function renderTrendBadge(training) {
    if (!BT.stats || !BT.stats.trainingDelta) return '';
    const d = BT.stats.trainingDelta(training.id);
    if (!d || !d.trend) return '';
    const parts = [];
    if (d.ftDelta !== null && d.ftDelta !== undefined) parts.push('FT ' + (d.ftDelta >= 0 ? '+' : '') + d.ftDelta + '%');
    if (d.fgDelta !== null && d.fgDelta !== undefined) parts.push('Wurf ' + (d.fgDelta >= 0 ? '+' : '') + d.fgDelta + '%');
    const tip = parts.length ? parts.join(' · ') + ' vs. letztes Training' : 'Trend vs. letztes Training';
    const icon = d.trend === 'up' ? '↑' : d.trend === 'down' ? '↓' : '→';
    const label = d.trend === 'up' ? 'besser' : d.trend === 'down' ? 'schlechter' : 'gleich';
    return `<span class="trend-badge trend-${d.trend}" title="${escapeHTML(tip)}" aria-label="${label} als letztes Training: ${escapeHTML(tip)}">${icon}</span>`;
  }

  function initialAttendance() {
    return BT.storage.getPlayers()
      .filter(p => !p.archived)
      .map(p => ({ playerId: p.id, status: null, late: false, note: '' }));
  }

  function presentPlayerIds(training) {
    return (training.attendance || [])
      .filter(a => a.status === 'present')
      .map(a => a.playerId);
  }

  function pct(made, att) { return att ? Math.round((made / att) * 100) : 0; }

  function summarize(training) {
    const s = { present: 0, absent: 0, excused: 0, injured: 0, late: 0, pending: 0, total: 0 };
    for (const a of training.attendance || []) {
      s.total++;
      if (s[a.status] !== undefined) s[a.status]++;
      else s.pending++;
      if (a.late && a.status === 'present') s.late++;
    }
    return s;
  }

  let currentTraining = null;
  let detailRoot = null;
  let detailAbort = null;
  let currentShotCategory = null;

  function renderDetail(target, id) {
    const training = BT.storage.getTraining(id);
    if (!training) { location.hash = '#/training'; return; }
    currentTraining = training;
    currentTraining.freethrows = currentTraining.freethrows || [];
    currentTraining.shots = currentTraining.shots || [];

    const cats = BT.storage.getShotCategories();
    currentShotCategory = cats[0] || null;

    if (detailAbort) detailAbort.abort();
    detailAbort = new AbortController();

    detailRoot = renderTemplate('tpl-training-detail');
    target.appendChild(detailRoot);

    syncAttendanceWithPlayers();

    $('[data-role="title"]', detailRoot).textContent = 'Training vom ' + formatDate(training.date);
    $('[data-role="date"]', detailRoot).value = training.date;
    $('[data-role="time"]', detailRoot).value = training.startTime || '20:15';
    $('[data-role="note"]', detailRoot).value = training.note || '';

    $('[data-role="date"]', detailRoot).addEventListener('change', e => {
      currentTraining.date = e.target.value;
      save();
      $('[data-role="title"]', detailRoot).textContent = 'Training vom ' + formatDate(currentTraining.date);
    });
    $('[data-role="time"]', detailRoot).addEventListener('change', e => {
      currentTraining.startTime = e.target.value;
      BT.storage.setSetting('trainingStartTime', e.target.value);
      save();
    });
    $('[data-role="note"]', detailRoot).addEventListener('input', e => {
      currentTraining.note = e.target.value;
      save();
    });

    $('[data-action="share-summary"]', detailRoot).addEventListener('click', () => shareSummary(currentTraining));
    $('[data-action="ai-summary"]', detailRoot).addEventListener('click', () => openAISummary(currentTraining));
    $('[data-action="end-training"]', detailRoot).addEventListener('click', () => endTrainingAndShare(currentTraining));
    $('[data-action="export-csv"]', detailRoot).addEventListener('click', () => exportCSV(currentTraining));
    $('[data-action="export-json"]', detailRoot).addEventListener('click', () => exportJSON(currentTraining));
    $('[data-action="delete"]', detailRoot).addEventListener('click', () => {
      const snapshot = BT.storage.getTraining(currentTraining.id);
      if (!snapshot) { location.hash = '#/training'; return; }
      BT.storage.deleteTraining(currentTraining.id);
      location.hash = '#/training';
      BT.util.toastUndo('Training vom ' + BT.util.formatDate(snapshot.date) + ' gelöscht', () => {
        BT.storage.restoreTraining(snapshot);
        location.hash = '#/training/' + snapshot.id;
      });
    });

    const headMenu = $('.head-menu', detailRoot);
    if (headMenu) {
      headMenu.querySelectorAll('.head-menu-panel .btn').forEach(b => {
        b.addEventListener('click', () => headMenu.removeAttribute('open'));
      });
      document.addEventListener('click', (e) => {
        if (headMenu.hasAttribute('open') && !headMenu.contains(e.target)) {
          headMenu.removeAttribute('open');
        }
      }, { signal: detailAbort.signal });
    }

    setupTimer();
    renderPlanBox();
    setupSubnav();
    setupShotMap();

    const resetBtn = $('[data-action="reset-attendance"]', detailRoot);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const backup = (currentTraining.attendance || []).map(a => ({ status: a.status, late: a.late }));
        for (const a of (currentTraining.attendance || [])) {
          a.status = null;
          a.late = false;
        }
        save();
        renderAttendance();
        renderSummary();
        renderFreethrows();
        renderShots();
        renderFitness();
        BT.util.toast('Anwesenheit zurückgesetzt', {
          actionLabel: 'Rückgängig',
          action: () => {
            (currentTraining.attendance || []).forEach((a, i) => {
              if (backup[i]) { a.status = backup[i].status; a.late = backup[i].late; }
            });
            save();
            renderAttendance();
            renderSummary();
            renderFreethrows();
            renderShots();
            renderFitness();
          }
        });
      });
    }

    renderAttendance();
    renderSummary();
    renderFreethrows();
    renderShotTabs();
    renderShots();
    renderFitness();
    renderTeamQuoteCard();
    renderTrainingHeatmap();

    const gotoMapLink = $('[data-action="goto-map"]', detailRoot);
    if (gotoMapLink) {
      gotoMapLink.addEventListener('click', (e) => {
        e.preventDefault();
        const btn = $('.subnav-btn[data-pane="map"]', detailRoot);
        if (btn) btn.click();
      });
    }
  }

  function syncAttendanceWithPlayers() {
    const active = BT.storage.getPlayers().filter(p => !p.archived);
    const existingIds = new Set((currentTraining.attendance || []).map(a => a.playerId));
    for (const p of active) {
      if (!existingIds.has(p.id)) {
        currentTraining.attendance.push({ playerId: p.id, status: null, late: false, note: '' });
      }
    }
    save();
  }

  function renderAttendance() {
    const list = $('[data-role="attendance"]', detailRoot);
    list.innerHTML = '';
    const allPlayers = BT.storage.getPlayers();

    const entries = (currentTraining.attendance || []).slice()
      .map(a => ({ att: a, player: allPlayers.find(p => p.id === a.playerId) }))
      .filter(e => e.player)
      .sort((a, b) => a.player.name.localeCompare(b.player.name, 'de'));

    for (const { att, player } of entries) {
      const card = document.createElement('li');
      card.className = 'att-card status-' + (att.status || 'pending');
      card.innerHTML = `
        <div class="att-head">
          <span class="name">${escapeHTML(player.name)}</span>
          <label class="late-box ${att.status !== 'present' ? 'disabled' : ''}">
            <input type="checkbox" data-role="late" ${att.late ? 'checked' : ''} ${att.status !== 'present' ? 'disabled' : ''}>
            Zu spät
          </label>
        </div>
        <div class="status-row" role="group">
          ${['present', 'absent', 'excused', 'injured'].map(s => `
            <button type="button" class="status-btn ${att.status === s ? 'active' : ''}" data-status="${s}">
              <span class="status-dot">${STATUS_SYMBOL[s]}</span> ${STATUS_LABELS[s]}
            </button>
          `).join('')}
        </div>
      `;

      $$('.status-btn', card).forEach(btn => {
        btn.addEventListener('click', () => {
          att.status = btn.dataset.status;
          if (att.status !== 'present') att.late = false;
          save();
          card.className = 'att-card status-' + (att.status || 'pending');
          $$('.status-btn', card).forEach(b => b.classList.toggle('active', b.dataset.status === att.status));
          const lateCb = $('[data-role="late"]', card);
          lateCb.checked = att.late;
          lateCb.disabled = att.status !== 'present';
          $('.late-box', card).classList.toggle('disabled', att.status !== 'present');
          renderSummary();
          renderFreethrows();
          renderShots();
          renderFitness();
        });
      });

      $('[data-role="late"]', card).addEventListener('change', e => {
        att.late = e.target.checked;
        save();
        renderSummary();
      });

      list.appendChild(card);
    }
  }

  function renderSummary() {
    const s = summarize(currentTraining);
    const el = $('[data-role="summary"]', detailRoot);
    const ended = !!currentTraining.endedAt;
    const statusChip = ended
      ? '<span class="att-chip ok">🏁 Beendet</span>'
      : '<span class="att-chip muted-chip">⏺ Läuft / Offen</span>';
    el.innerHTML = `
      ${statusChip}
      <span class="att-chip ok">✓ Anwesend ${s.present}</span>
      <span class="att-chip bad">✗ Abwesend ${s.absent}</span>
      <span class="att-chip warn">E Entschuldigt ${s.excused}</span>
      <span class="att-chip warn">V Verletzt ${s.injured}</span>
      ${s.late > 0 ? '<span class="att-chip">Zu spät: ' + s.late + '</span>' : ''}
      ${s.pending > 0 ? '<span class="att-chip muted-chip">○ Offen ' + s.pending + '</span>' : ''}
      <span class="att-chip muted-chip">Gesamt ${s.total}</span>
      <button type="button" class="btn small" data-action="toggle-ended">${ended ? 'Wieder öffnen' : 'Als beendet markieren'}</button>
    `;
    const toggleBtn = $('[data-action="toggle-ended"]', el);
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
      if (currentTraining.endedAt) {
        if (!confirm('Training wieder öffnen? Es fällt dann aus der Spielerstatistik heraus, bis es erneut beendet wird.')) return;
        delete currentTraining.endedAt;
      } else {
        currentTraining.endedAt = new Date().toISOString();
      }
      save();
      renderSummary();
    });
  }

  function getOrCreateFT(playerId) {
    let e = currentTraining.freethrows.find(x => x.playerId === playerId);
    if (!e) {
      const planAtt = (currentTraining.plan && currentTraining.plan.freethrows && currentTraining.plan.freethrows.attempted) || 0;
      e = { playerId, made: 0, attempted: planAtt };
      currentTraining.freethrows.push(e);
    }
    return e;
  }

  function renderFreethrows() {
    const list = $('[data-role="freethrows"]', detailRoot);
    const empty = $('[data-role="ft-empty"]', detailRoot);
    list.innerHTML = '';

    const allPlayers = BT.storage.getPlayers();
    const presentIds = presentPlayerIds(currentTraining);
    if (presentIds.length === 0) {
      empty.classList.remove('hidden');
      renderFreethrowSummary([]);
      return;
    }
    empty.classList.add('hidden');

    const presentPlayers = presentIds
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    for (const p of presentPlayers) {
      const e = getOrCreateFT(p.id);
      list.appendChild(buildShotCard(p, e, 'ft'));
    }
    save();
    renderFreethrowSummary(presentPlayers.map(p => getOrCreateFT(p.id)));
  }

  function renderFreethrowSummary(entries) {
    let made = 0, att = 0;
    for (const e of entries) { made += e.made || 0; att += e.attempted || 0; }
    const el = $('[data-role="ft-summary"]', detailRoot);
    if (el) {
      if (att === 0 && entries.length === 0) el.innerHTML = '';
      else el.innerHTML = `<span class="att-chip ok">Team ${made}/${att}</span><span class="att-chip">${pct(made, att)}%</span>`;
    }
    renderTeamQuoteCard();
  }

  function getOrCreateShotCategory(name) {
    let cat = currentTraining.shots.find(s => s.category === name);
    if (!cat) {
      cat = { category: name, entries: [] };
      currentTraining.shots.push(cat);
    }
    return cat;
  }

  function getOrCreateShotEntry(catName, playerId) {
    const cat = getOrCreateShotCategory(catName);
    let e = cat.entries.find(x => x.playerId === playerId);
    if (!e) {
      const planCat = currentTraining.plan && Array.isArray(currentTraining.plan.shots)
        ? currentTraining.plan.shots.find(s => s.category === catName) : null;
      const planAtt = planCat && planCat.attempted ? planCat.attempted : 0;
      e = { playerId, made: 0, attempted: planAtt };
      cat.entries.push(e);
    }
    return e;
  }

  function renderShotTabs() {
    const trainingCats = (currentTraining.shots || []).map(s => s.category);
    if (!currentShotCategory || !trainingCats.includes(currentShotCategory)) {
      currentShotCategory = trainingCats[0] || null;
    }
    const tabs = $('[data-role="shot-tabs"]', detailRoot);
    tabs.innerHTML = '';

    for (const cat of trainingCats) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'shot-tab' + (cat === currentShotCategory ? ' active' : '');
      tab.textContent = cat;
      tab.addEventListener('click', () => {
        currentShotCategory = cat;
        renderShotTabs();
        renderShots();
      });
      const del = document.createElement('span');
      del.className = 'shot-tab-del';
      del.textContent = '×';
      del.title = 'Aus diesem Training entfernen';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCategoryFromTraining(cat);
      });
      tab.appendChild(del);
      tabs.appendChild(tab);
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'shot-tab add';
    addBtn.textContent = '+ Kategorie';
    addBtn.addEventListener('click', toggleAddPanel);
    tabs.appendChild(addBtn);

    renderAddPanel();
  }

  function renderAddPanel() {
    let panel = detailRoot.querySelector('.shot-add-panel');
    const tabsContainer = $('[data-role="shot-tabs"]', detailRoot);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'shot-add-panel hidden';
      tabsContainer.parentNode.insertBefore(panel, tabsContainer.nextSibling);
    }

    const trainingCatNames = new Set((currentTraining.shots || []).map(s => s.category));
    const globalCats = BT.storage.getShotCategories();
    const available = globalCats.filter(c => !trainingCatNames.has(c));

    let html = '';
    if (available.length > 0) {
      html += '<div class="shot-add-suggestions"><span class="muted-label">Schnellauswahl:</span>';
      for (const c of available) {
        html += `<button type="button" class="shot-suggestion" data-suggest="${escapeHTML(c)}">+ ${escapeHTML(c)}</button>`;
      }
      html += '</div>';
    }
    html += `
      <div class="shot-add-input">
        <input type="text" placeholder="Neue Kategorie eingeben …" data-role="shot-new-name" maxlength="40">
        <button type="button" class="btn small primary" data-action="add-new-cat">Hinzufügen</button>
        <button type="button" class="btn small" data-action="cancel-add">Abbrechen</button>
      </div>
    `;
    panel.innerHTML = html;

    $$('.shot-suggestion', panel).forEach(btn => {
      btn.addEventListener('click', () => {
        addCategoryToTraining(btn.dataset.suggest, false);
        panel.classList.add('hidden');
      });
    });

    $('[data-action="add-new-cat"]', panel).addEventListener('click', () => {
      const inp = $('[data-role="shot-new-name"]', panel);
      const name = (inp.value || '').trim();
      if (!name) return;
      addCategoryToTraining(name, true);
      panel.classList.add('hidden');
      inp.value = '';
    });

    $('[data-action="cancel-add"]', panel).addEventListener('click', () => {
      panel.classList.add('hidden');
    });

    const inp = $('[data-role="shot-new-name"]', panel);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('[data-action="add-new-cat"]', panel).click();
      }
    });
  }

  function toggleAddPanel() {
    const panel = detailRoot.querySelector('.shot-add-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      const inp = $('[data-role="shot-new-name"]', panel);
      if (inp) setTimeout(() => inp.focus(), 50);
    }
  }

  function addCategoryToTraining(name, addToGlobal) {
    if (!currentTraining.shots) currentTraining.shots = [];
    if (currentTraining.shots.find(s => s.category === name)) return;
    currentTraining.shots.push({ category: name, entries: [] });
    if (addToGlobal) {
      const globals = BT.storage.getShotCategories();
      if (!globals.includes(name)) {
        globals.push(name);
        BT.storage.setShotCategories(globals);
      }
    }
    save();
    currentShotCategory = name;
    renderShotTabs();
    renderShots();
  }

  function removeCategoryFromTraining(name) {
    const cat = (currentTraining.shots || []).find(s => s.category === name);
    const hasData = cat && (cat.entries || []).some(en => (en.attempted || 0) > 0);
    const msg = hasData
      ? 'Kategorie „' + name + '" aus diesem Training entfernen? Die bereits erfassten Daten gehen verloren!'
      : 'Kategorie „' + name + '" aus diesem Training entfernen?';
    if (!confirm(msg)) return;
    currentTraining.shots = (currentTraining.shots || []).filter(s => s.category !== name);
    save();
    if (currentShotCategory === name) {
      currentShotCategory = ((currentTraining.shots[0] || {}).category) || null;
    }
    renderShotTabs();
    renderShots();
  }

  function renderShots() {
    const list = $('[data-role="shots"]', detailRoot);
    const empty = $('[data-role="shot-empty"]', detailRoot);
    const sumEl = $('[data-role="shot-summary"]', detailRoot);
    list.innerHTML = '';
    sumEl.innerHTML = '';

    if (!currentShotCategory) {
      empty.classList.remove('hidden');
      empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 17 4-8 4 4 6-8"/></svg><p class="empty-body">Keine Wurf-Kategorie für dieses Training. Tippe oben auf „+ Kategorie", um eine hinzuzufügen.</p>';
      return;
    }

    const allPlayers = BT.storage.getPlayers();
    const presentIds = presentPlayerIds(currentTraining);
    if (presentIds.length === 0) {
      empty.classList.remove('hidden');
      empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg><p class="empty-body">Keine anwesenden Spieler.</p>';
      return;
    }
    empty.classList.add('hidden');

    const presentPlayers = presentIds
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    let totalMade = 0, totalAtt = 0;
    for (const p of presentPlayers) {
      const e = getOrCreateShotEntry(currentShotCategory, p.id);
      list.appendChild(buildShotCard(p, e, 'shot'));
      totalMade += e.made || 0;
      totalAtt += e.attempted || 0;
    }
    save();

    sumEl.innerHTML = `<span class="att-chip ok">${escapeHTML(currentShotCategory)}: ${totalMade}/${totalAtt}</span><span class="att-chip">${pct(totalMade, totalAtt)}%</span>`;
    renderSpotBar();
    renderTeamQuoteCard();
  }

  function renderSpotBar() {
    const bar = $('[data-role="spot-bar"]', detailRoot);
    if (!bar) return;
    if (!currentShotCategory) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    const status = $('[data-role="spot-status"]', detailRoot);
    const globalSpots = BT.storage.getSetting('shotSpots', {}) || {};
    const hasSpot = globalSpots[currentShotCategory] && typeof globalSpots[currentShotCategory].x === 'number';
    if (status) status.textContent = hasSpot
      ? `📍 Globaler Spot gesetzt (Streuung ${globalSpots[currentShotCategory].r || 22})`
      : 'Kein Spot gesetzt — wird aus Kategorie-Namen geraten';
  }

  function buildShotCard(player, entry, kind) {
    const card = document.createElement('li');
    card.className = 'ft-card';
    card.innerHTML = `
      <div class="ft-head">
        <span class="name">${escapeHTML(player.name)}</span>
        <span class="ft-pct" data-role="pct">${pct(entry.made, entry.attempted)}% (${entry.made}/${entry.attempted})</span>
      </div>
      <div class="ft-row">
        <span class="ft-label">Treffer</span>
        <button type="button" class="ft-btn" data-act="m-">−</button>
        <input type="number" class="ft-input" data-role="made" min="0" step="1" value="${entry.made}">
        <button type="button" class="ft-btn plus" data-act="m+">+</button>
      </div>
      <div class="ft-row">
        <span class="ft-label">Versuche</span>
        <button type="button" class="ft-btn" data-act="a-">−</button>
        <input type="number" class="ft-input" data-role="att" min="0" step="1" value="${entry.attempted}">
        <button type="button" class="ft-btn plus" data-act="a+">+</button>
      </div>
    `;

    const madeInput = $('[data-role="made"]', card);
    const attInput = $('[data-role="att"]', card);
    const pctLabel = $('[data-role="pct"]', card);

    function refreshSummary() {
      if (kind === 'ft') {
        const ids = presentPlayerIds(currentTraining);
        const entries = ids.map(id => getOrCreateFT(id));
        renderFreethrowSummary(entries);
      } else {
        const sumEl = $('[data-role="shot-summary"]', detailRoot);
        const cat = getOrCreateShotCategory(currentShotCategory);
        const ids = new Set(presentPlayerIds(currentTraining));
        let m = 0, a = 0;
        for (const e of cat.entries) {
          if (!ids.has(e.playerId)) continue;
          m += e.made || 0; a += e.attempted || 0;
        }
        sumEl.innerHTML = `<span class="att-chip ok">${escapeHTML(currentShotCategory)}: ${m}/${a}</span><span class="att-chip">${pct(m, a)}%</span>`;
      }
      renderTeamQuoteCard();
    }
    function refreshPct() {
      pctLabel.textContent = pct(entry.made, entry.attempted) + '% (' + entry.made + '/' + entry.attempted + ')';
    }
    function commit() {
      entry.made = Math.max(0, Math.floor(entry.made || 0));
      entry.attempted = Math.max(0, Math.floor(entry.attempted || 0));
      if (entry.attempted === 0) {
        entry.made = 0;
      } else if (entry.made > entry.attempted) {
        entry.attempted = entry.made;
      }
      madeInput.value = entry.made;
      attInput.value = entry.attempted;
      refreshPct();
      save();
      refreshSummary();
    }

    madeInput.addEventListener('input', () => {
      entry.made = parseInt(madeInput.value, 10) || 0;
      refreshPct();
      save();
      refreshSummary();
    });
    attInput.addEventListener('input', () => {
      entry.attempted = parseInt(attInput.value, 10) || 0;
      refreshPct();
      save();
      refreshSummary();
    });
    madeInput.addEventListener('blur', commit);
    attInput.addEventListener('blur', commit);
    madeInput.addEventListener('focus', () => madeInput.select());
    attInput.addEventListener('focus', () => attInput.select());

    $$('[data-act]', card).forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'm+') { entry.made++; if (entry.made > entry.attempted) entry.attempted = entry.made; }
        else if (act === 'm-') { entry.made = Math.max(0, entry.made - 1); }
        else if (act === 'a+') { entry.attempted++; }
        else if (act === 'a-') { entry.attempted = Math.max(entry.made, entry.attempted - 1); }
        commit();
      });
    });

    return card;
  }

  function save() {
    BT.storage.upsertTraining(currentTraining);
  }

  const FITNESS_FIELDS = [
    { key: 'sprint', label: 'Sprint (s)', step: '0.01', mode: 'decimal' },
    { key: 'rimTouches', label: 'Rim Touches', step: '1', mode: 'numeric' },
    { key: 'laneAgility', label: 'Lane Agility (s)', step: '0.01', mode: 'decimal' },
    { key: 'pushUps', label: 'Liegestütze (60s)', step: '1', mode: 'numeric' }
  ];

  function getOrCreateFitness(playerId) {
    if (!currentTraining.fitness) currentTraining.fitness = [];
    let e = currentTraining.fitness.find(x => x.playerId === playerId);
    if (!e) {
      e = { playerId, sprint: null, rimTouches: null, laneAgility: null, pushUps: null };
      currentTraining.fitness.push(e);
    }
    return e;
  }

  function renderFitness() {
    const list = $('[data-role="fitness"]', detailRoot);
    const empty = $('[data-role="fitness-empty"]', detailRoot);
    if (!list) return;
    list.innerHTML = '';

    const allPlayers = BT.storage.getPlayers();
    const presentIds = presentPlayerIds(currentTraining);
    if (presentIds.length === 0) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    const presentPlayers = presentIds
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    for (const p of presentPlayers) {
      const e = getOrCreateFitness(p.id);
      list.appendChild(buildFitnessCard(p, e));
    }
    save();
  }

  function buildFitnessCard(player, entry) {
    const card = document.createElement('li');
    card.className = 'ft-card';
    const fieldsHtml = FITNESS_FIELDS.map(f => {
      const val = entry[f.key];
      const v = (val === null || val === undefined) ? '' : val;
      return `<label>${f.label}<input type="number" step="${f.step}" min="0" inputmode="${f.mode}" data-field="${f.key}" value="${v}"></label>`;
    }).join('');
    card.innerHTML = `
      <div class="ft-head"><span class="name">${escapeHTML(player.name)}</span></div>
      <div class="fit-grid">${fieldsHtml}</div>
    `;
    $$('[data-field]', card).forEach(input => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        const raw = input.value.trim();
        if (raw === '') entry[field] = null;
        else {
          const num = parseFloat(raw);
          entry[field] = isNaN(num) ? null : num;
        }
        save();
      });
      input.addEventListener('focus', () => input.select());
    });
    return card;
  }

  function setupSubnav() {
    const subnav = $('.subnav', detailRoot);
    const updateEdgeMask = () => {
      if (!subnav) return;
      const atEnd = subnav.scrollLeft + subnav.clientWidth >= subnav.scrollWidth - 2;
      subnav.setAttribute('data-scroll-end', atEnd ? 'true' : 'false');
    };
    if (subnav) {
      subnav.addEventListener('scroll', updateEdgeMask, { passive: true });
      requestAnimationFrame(updateEdgeMask);
    }
    $$('.subnav-btn', detailRoot).forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.pane;
        $$('.subnav-btn', detailRoot).forEach(b => b.classList.toggle('active', b === btn));
        $$('.pane', detailRoot).forEach(p => p.classList.toggle('hidden', p.dataset.pane !== target));
        if (target === 'notes') renderPlayerNotes();
        if (target === 'map') renderShotMap();
        if (target === 'fitness') renderFitness();
        if (btn.scrollIntoView) btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        if (detailRoot && detailRoot.scrollIntoView) detailRoot.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });
  }

  let mapMode = 'hit';

  function setupShotMap() {
    currentTraining.shotMap = currentTraining.shotMap || [];

    const playerSelect = $('[data-role="map-player"]', detailRoot);
    if (!playerSelect) return;

    $$('[data-map-mode]', detailRoot).forEach(btn => {
      btn.addEventListener('click', () => {
        mapMode = btn.dataset.mapMode;
        $$('[data-map-mode]', detailRoot).forEach(b => {
          b.classList.toggle('primary', b === btn);
          b.classList.toggle('danger', b !== btn && b.dataset.mapMode === 'miss');
        });
      });
    });

    const hit = $('[data-role="court-hit"]', detailRoot);
    hit.addEventListener('click', (e) => {
      const svg = $('[data-role="court-svg"]', detailRoot);
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      const playerId = playerSelect.value;
      if (!playerId) { alert('Bitte zuerst einen Spieler wählen.'); return; }
      currentTraining.shotMap.push({
        playerId,
        x: Math.round(local.x * 10) / 10,
        y: Math.round(local.y * 10) / 10,
        made: mapMode === 'hit',
        ts: Date.now()
      });
      save();
      renderShotMap();
    });

    $('[data-action="map-undo"]', detailRoot).addEventListener('click', () => {
      const playerId = playerSelect.value;
      const filtered = currentTraining.shotMap.filter(s => s.playerId === playerId);
      if (filtered.length === 0) return;
      const last = filtered[filtered.length - 1];
      currentTraining.shotMap = currentTraining.shotMap.filter(s => s !== last);
      save();
      renderShotMap();
    });

    $('[data-action="map-clear"]', detailRoot).addEventListener('click', () => {
      const playerId = playerSelect.value;
      const playerName = (BT.storage.getPlayer(playerId) || {}).name || 'Spieler';
      const backup = currentTraining.shotMap.filter(s => s.playerId === playerId);
      if (backup.length === 0) return;
      currentTraining.shotMap = currentTraining.shotMap.filter(s => s.playerId !== playerId);
      save();
      renderShotMap();
      BT.util.toast('Würfe von ' + playerName + ' gelöscht', {
        actionLabel: 'Rückgängig',
        action: () => {
          currentTraining.shotMap = currentTraining.shotMap.concat(backup);
          save();
          renderShotMap();
        }
      });
    });

    const genBtn = $('[data-action="map-generate"]', detailRoot);
    if (genBtn) genBtn.addEventListener('click', generateShotMapFromCounts);

    playerSelect.addEventListener('change', renderShotMap);
  }

  function spotForCategory(name, cat) {
    const globalSpots = BT.storage.getSetting('shotSpots', {}) || {};
    if (globalSpots[name] && typeof globalSpots[name].x === 'number') {
      const g = globalSpots[name];
      return { x: g.x, y: g.y, r: g.r || 22 };
    }
    if (cat && typeof cat.spotX === 'number' && typeof cat.spotY === 'number') {
      return { x: cat.spotX, y: cat.spotY, r: cat.spotR || 22 };
    }
    const n = (name || '').toLowerCase();
    if (/(corner|ecke).*(l\b|links)|linke.*(corner|ecke)/.test(n)) return { x: 30, y: 75, r: 18 };
    if (/(corner|ecke).*(r\b|rechts)|rechte.*(corner|ecke)/.test(n)) return { x: 470, y: 75, r: 18 };
    if (/(wing|flügel|fluegel).*(l\b|links)|linke.*(wing|flügel|fluegel)/.test(n)) return { x: 100, y: 275, r: 22 };
    if (/(wing|flügel|fluegel).*(r\b|rechts)|rechte.*(wing|flügel|fluegel)/.test(n)) return { x: 400, y: 275, r: 22 };
    if (/top.*3|zentr.*3|3.*top|3.*zentr|head of key/.test(n)) return { x: 250, y: 355, r: 20 };
    if (/3er|3pt|dreier|3-punkt|3\s*pkt|three/.test(n)) return { x: 250, y: 355, r: 35 };
    if (/(elbow|ellenbogen).*(l\b|links)/.test(n)) return { x: 170, y: 175, r: 18 };
    if (/(elbow|ellenbogen).*(r\b|rechts)/.test(n)) return { x: 330, y: 175, r: 18 };
    if (/elbow|ellenbogen/.test(n)) return { x: 250, y: 175, r: 25 };
    if (/mitteldistanz|midrange|mid\b/.test(n)) return { x: 250, y: 230, r: 45 };
    if (/layup|korbleger/.test(n)) return { x: 250, y: 75, r: 18 };
    if (/post.*(l\b|links)/.test(n)) return { x: 195, y: 130, r: 16 };
    if (/post.*(r\b|rechts)/.test(n)) return { x: 305, y: 130, r: 16 };
    if (/post|block/.test(n)) return { x: 250, y: 130, r: 22 };
    if (/zone|paint|unterm.*korb|short/.test(n)) return { x: 250, y: 105, r: 30 };
    if (/frei|freethrow|ft\b/.test(n)) return { x: 250, y: 200, r: 14 };
    return { x: 250, y: 230, r: 40 };
  }

  function addSyntheticShots(playerId, cx, cy, attempted, made, radius, ts) {
    const att = Math.max(0, Math.floor(attempted || 0));
    const hits = Math.max(0, Math.min(Math.floor(made || 0), att));
    for (let i = 0; i < att; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const x = Math.round((cx + Math.cos(angle) * dist) * 10) / 10;
      const y = Math.round((cy + Math.sin(angle) * dist) * 10) / 10;
      currentTraining.shotMap.push({
        playerId,
        x, y,
        made: i < hits,
        ts: ts + i,
        synthetic: true
      });
    }
  }

  function generateShotMapFromCounts() {
    const presentIds = presentPlayerIds(currentTraining);
    if (presentIds.length === 0) { BT.util.toast('Keine anwesenden Spieler.'); return; }
    const hasFT = (currentTraining.freethrows || []).some(e => presentIds.includes(e.playerId) && (e.attempted || 0) > 0);
    const hasShots = (currentTraining.shots || []).some(cat => (cat.entries || []).some(e => presentIds.includes(e.playerId) && (e.attempted || 0) > 0));
    if (!hasFT && !hasShots) { BT.util.toast('Keine Freiwurf- oder Wurfzahlen vorhanden.'); return; }
    if (!confirm('Karte für alle anwesenden Spieler aus Zahlen neu generieren? Bestehende Punkte dieser Spieler werden ersetzt.')) return;

    currentTraining.shotMap = (currentTraining.shotMap || []).filter(s => !presentIds.includes(s.playerId));
    const ts = Date.now();
    const ftSpot = spotForCategory('Freiwürfe');
    const categories = [];

    if (hasFT) categories.push('Freiwürfe');
    for (const e of (currentTraining.freethrows || [])) {
      if (!presentIds.includes(e.playerId)) continue;
      addSyntheticShots(e.playerId, ftSpot.x, ftSpot.y, e.attempted, e.made, ftSpot.r, ts);
    }
    for (const cat of (currentTraining.shots || [])) {
      const spot = spotForCategory(cat.category, cat);
      let catUsed = false;
      for (const e of (cat.entries || [])) {
        if (!presentIds.includes(e.playerId)) continue;
        if ((e.attempted || 0) > 0) catUsed = true;
        addSyntheticShots(e.playerId, spot.x, spot.y, e.attempted, e.made, spot.r, ts);
      }
      if (catUsed) categories.push(cat.category);
    }
    save();
    renderShotMap();
    const count = (currentTraining.shotMap || []).filter(s => presentIds.includes(s.playerId) && s.synthetic).length;
    BT.util.toast(count + ' Würfe aus ' + categories.join(', ') + ' eingezeichnet');
  }

  function renderShotMap() {
    const playerSelect = $('[data-role="map-player"]', detailRoot);
    if (!playerSelect) return;

    const presentIds = presentPlayerIds(currentTraining);
    const allPlayers = BT.storage.getPlayers();
    const presentPlayers = presentIds
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    const prev = playerSelect.value;
    playerSelect.innerHTML = presentPlayers.length === 0
      ? '<option value="">— Keine anwesenden Spieler —</option>'
      : presentPlayers.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
    if (prev && presentPlayers.find(p => p.id === prev)) playerSelect.value = prev;

    const playerId = playerSelect.value;
    const shotsLayer = $('[data-role="court-shots"]', detailRoot);
    shotsLayer.innerHTML = '';

    const playerShots = (currentTraining.shotMap || []).filter(s => s.playerId === playerId);
    let hits = 0, misses = 0;
    for (const s of playerShots) {
      if (s.made) {
        shotsLayer.insertAdjacentHTML('beforeend', `<circle cx="${s.x}" cy="${s.y}" r="7" fill="rgba(0,128,0,0.7)" stroke="#004b2b" stroke-width="2"/>`);
        hits++;
      } else {
        const x = s.x, y = s.y, r = 6;
        shotsLayer.insertAdjacentHTML('beforeend',
          `<line x1="${x-r}" y1="${y-r}" x2="${x+r}" y2="${y+r}" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>` +
          `<line x1="${x-r}" y1="${y+r}" x2="${x+r}" y2="${y-r}" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>`
        );
        misses++;
      }
    }
    const total = hits + misses;
    const pctVal = total ? Math.round((hits / total) * 100) : 0;
    const stats = $('[data-role="map-stats"]', detailRoot);
    stats.innerHTML = total === 0
      ? '<span class="muted">Tippe auf die Karte, um einen Wurf zu setzen. Modus oben umschalten (Treffer/Fehlwurf).</span>'
      : `<span class="att-chip ok">✓ Treffer ${hits}</span><span class="att-chip bad">✗ Fehlwurf ${misses}</span><span class="att-chip">${pctVal}% (${hits}/${total})</span>`;
    renderTrainingHeatmap();
  }

  function renderTeamQuoteCard() {
    const wrap = $('[data-role="team-quote"]', detailRoot);
    if (!wrap || !BT.stats || !BT.stats.trainingTeamShotQuote) return;
    const q = BT.stats.trainingTeamShotQuote(currentTraining.id);

    if (q.total.attempted === 0 && q.freethrows.attempted === 0) {
      wrap.innerHTML = `
        <div class="team-quote-label">Team-Wurfquote</div>
        <p class="muted team-quote-empty">Noch keine Würfe in diesem Training erfasst.</p>
      `;
      return;
    }

    const fg = q.total;
    const ft = q.freethrows;

    function deltaBadge(pctDelta, prefix) {
      if (pctDelta === null || pctDelta === undefined) return '';
      const rounded = Math.round(pctDelta);
      if (rounded === 0) return `<span class="delta-badge delta-flat" title="${prefix} gleichauf mit Saison">→ 0 %</span>`;
      const isUp = rounded > 0;
      const cls = isUp ? 'delta-up' : 'delta-down';
      const arrow = isUp ? '↑' : '↓';
      const sign = isUp ? '+' : '';
      return `<span class="delta-badge ${cls}" title="${prefix} ${sign}${rounded} % im Vergleich zum bisherigen Saisonschnitt">${arrow} ${sign}${rounded} % vs. Saison</span>`;
    }

    // Kategorie-Chips: Best/Worst farblich hervorheben (nur wenn mind. 2 Kategorien mit Daten)
    const catsWithData = q.byCategory.filter(c => c.attempted > 0);
    let bestPct = -Infinity, worstPct = Infinity;
    if (catsWithData.length >= 2) {
      for (const c of catsWithData) {
        if (c.pct > bestPct) bestPct = c.pct;
        if (c.pct < worstPct) worstPct = c.pct;
      }
    }
    const catChips = catsWithData.map(c => {
      let tone = '';
      if (catsWithData.length >= 2) {
        if (c.pct === bestPct) tone = ' quote-chip-best';
        else if (c.pct === worstPct) tone = ' quote-chip-worst';
      }
      return `<span class="quote-chip${tone}"><span class="quote-chip-name">${escapeHTML(c.category)}</span><span class="quote-chip-frac">${c.made}/${c.attempted}</span><span class="quote-chip-pct">${c.pct} %</span></span>`;
    }).join('');

    const fgBlock = fg.attempted > 0
      ? `
        <div class="team-quote-head">
          <div>
            <div class="team-quote-label">Team-Wurfquote (Feldwürfe)</div>
            <div class="team-quote-main">
              <span class="team-quote-big">${fg.made}/${fg.attempted}</span>
              <span class="team-quote-sub">· ${fg.pct} %</span>
              ${deltaBadge(q.deltaVsSeason.totalPct, 'Feldwürfe')}
            </div>
          </div>
        </div>
        ${catChips ? `<div class="quote-chips">${catChips}</div>` : ''}
      `
      : '';

    const ftBlock = ft.attempted > 0
      ? `
        <div class="team-quote-ft">
          <span class="team-quote-ft-label">Freiwürfe</span>
          <span class="team-quote-ft-frac">${ft.made}/${ft.attempted}</span>
          <span class="team-quote-ft-pct">${ft.pct} %</span>
          ${deltaBadge(q.deltaVsSeason.ftPct, 'Freiwürfe')}
        </div>
      `
      : '';

    wrap.innerHTML = fgBlock + ftBlock;
  }

  function renderTrainingHeatmap() {
    const wrap = $('[data-role="training-heatmap-wrap"]', detailRoot);
    if (!wrap) return;
    const courtWrap = $('[data-role="training-heat-court-wrap"]', detailRoot);
    const empty = $('[data-role="training-heat-empty"]', detailRoot);
    const cells = $('[data-role="training-heat-cells"]', detailRoot);
    if (!cells) return;

    const shots = (currentTraining.shotMap || []).slice();
    cells.innerHTML = '';
    if (shots.length === 0) {
      if (empty) empty.classList.remove('hidden');
      if (courtWrap) courtWrap.style.display = 'none';
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (courtWrap) courtWrap.style.display = '';
    BT.heatmap.renderZones(cells, shots);
  }

  function renderPlayerNotes() {
    const list = $('[data-role="player-notes"]', detailRoot);
    list.innerHTML = '';
    const allPlayers = BT.storage.getPlayers().filter(p => !p.archived);
    const sorted = allPlayers.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));

    for (const p of sorted) {
      let att = (currentTraining.attendance || []).find(a => a.playerId === p.id);
      if (!att) {
        att = { playerId: p.id, status: null, late: false, note: '' };
        currentTraining.attendance.push(att);
      }
      const card = document.createElement('li');
      card.className = 'pn-card status-' + (att.status || 'pending');
      const statusLabel = att.status ? (STATUS_LABELS[att.status] || att.status) : 'Offen';
      const statusSym = att.status ? (STATUS_SYMBOL[att.status] || '') : '○';
      card.innerHTML = `
        <div class="pn-head">
          <span class="name">${escapeHTML(p.name)}</span>
          <span class="att-chip ${chipClassFor(att.status)}">${statusSym} ${statusLabel}${att.late ? ' · zu spät' : ''}</span>
        </div>
        <textarea class="pn-text" data-role="pn-note" rows="3" maxlength="500" placeholder="Notiz für dieses Training …">${escapeHTML(att.note || '')}</textarea>
      `;
      const ta = $('[data-role="pn-note"]', card);
      let saveTimer = null;
      ta.addEventListener('input', () => {
        att.note = ta.value;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 300);
      });
      list.appendChild(card);
    }
  }

  function chipClassFor(status) {
    if (status === 'present') return 'ok';
    if (status === 'absent') return 'bad';
    if (status === 'excused' || status === 'injured') return 'warn';
    return 'muted-chip';
  }

  function renderPlanBox() {
    const box = $('[data-role="plan-box"]', detailRoot);
    const plan = currentTraining.plan || (currentTraining.plan = { drills: [] });
    plan.drills = plan.drills || [];
    box.classList.remove('hidden');
    const sumEl = $('[data-role="plan-summary"]', detailRoot);
    const parts = [];
    if (plan.summary) parts.push('<p>' + escapeHTML(plan.summary) + '</p>');
    const targets = [];
    if (plan.freethrows && plan.freethrows.attempted) targets.push('Freiwürfe ' + plan.freethrows.attempted);
    for (const s of (plan.shots || [])) targets.push(escapeHTML(s.category || '') + ' ' + (parseInt(s.attempted, 10) || 0));
    if (targets.length) parts.push('<p class="muted">Vorgaben pro Spieler: ' + targets.join(' · ') + '</p>');
    sumEl.innerHTML = parts.join('');

    const drillsEl = $('[data-role="plan-drills"]', detailRoot);
    drillsEl.innerHTML = '';
    plan.drills.forEach((d, idx) => {
      const li = document.createElement('li');
      li.className = 'plan-drill';
      const minLabel = d.minutes ? ' (' + d.minutes + ' min)' : '';
      li.innerHTML = `
        <div class="plan-drill-head">
          <span class="drill-name">${escapeHTML(d.name)}${minLabel}</span>
          <div class="plan-drill-actions">
            ${d.minutes ? '<button class="btn small primary" data-drill-min="' + d.minutes + '">▶ Timer</button>' : ''}
            <button class="btn small" data-drill-remove="${idx}" aria-label="Entfernen">✕</button>
          </div>
        </div>
        ${d.description ? '<div class="muted">' + escapeHTML(d.description) + '</div>' : ''}
      `;
      const startBtn = li.querySelector('[data-drill-min]');
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          const sec = parseInt(startBtn.dataset.drillMin, 10) * 60;
          startTimerWithSec(sec);
        });
      }
      const removeBtn = li.querySelector('[data-drill-remove]');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          const removed = plan.drills.splice(idx, 1)[0];
          save();
          renderPlanBox();
          BT.util.toastUndo('Drill „' + (removed.name || '') + '" entfernt', () => {
            plan.drills.splice(idx, 0, removed);
            save();
            renderPlanBox();
          });
        });
      }
      drillsEl.appendChild(li);
    });

    // Picker-Button + leerer Hinweis
    const controls = document.createElement('li');
    controls.className = 'plan-drill-controls';
    controls.innerHTML = `
      <button type="button" class="btn small" data-action="add-drill-from-lib">+ Aus Bibliothek</button>
      <a class="btn small" href="#/drills">Bibliothek öffnen</a>
    `;
    controls.querySelector('[data-action="add-drill-from-lib"]').addEventListener('click', () => {
      BT.drills.openPicker(picked => {
        plan.drills.push(picked);
        save();
        renderPlanBox();
      });
    });
    drillsEl.appendChild(controls);

    if (plan.drills.length === 0 && !plan.summary && targets.length === 0) {
      const hint = document.createElement('li');
      hint.className = 'plan-drill-hint muted';
      hint.textContent = 'Noch keine Drills im Plan. Füge welche aus der Bibliothek hinzu oder importiere einen Plan-PDF im „Plan"-Reiter.';
      drillsEl.insertBefore(hint, controls);
    }
  }

  let timerEndTs = 0, timerRaf = 0, timerSelectedSec = 0;

  function startTimerWithSec(sec) {
    timerSelectedSec = sec;
    BT.audio.ensureContext();
    timerEndTs = performance.now() + sec * 1000;
    const display = $('[data-role="timer-display"]', detailRoot);
    if (display) display.textContent = formatTime(sec);
    tickTimer();
  }

  function setupTimer() {
    const display = $('[data-role="timer-display"]', detailRoot);
    const customInput = $('[data-role="timer-custom"]', detailRoot);

    $$('[data-timer]', detailRoot).forEach(btn => {
      btn.addEventListener('click', () => {
        timerSelectedSec = parseInt(btn.dataset.timer, 10) || 0;
        customInput.value = '';
        display.textContent = formatTime(timerSelectedSec);
      });
    });

    customInput.addEventListener('input', () => {
      const min = parseInt(customInput.value, 10) || 0;
      timerSelectedSec = Math.max(0, min) * 60;
      display.textContent = formatTime(timerSelectedSec);
    });

    $('[data-timer-action="start"]', detailRoot).addEventListener('click', () => {
      if (timerSelectedSec <= 0) return;
      BT.audio.ensureContext();
      timerEndTs = performance.now() + timerSelectedSec * 1000;
      setTimerState('running');
      tickTimer();
    });
    $('[data-timer-action="stop"]', detailRoot).addEventListener('click', () => {
      stopTimer();
      setTimerState('ready');
    });
  }

  function setTimerState(state) {
    const el = $('[data-role="timer-state"]', detailRoot);
    if (!el) return;
    el.className = 'timer-state';
    if (state === 'running') { el.textContent = 'Läuft'; el.classList.add('running'); }
    else if (state === 'finished') { el.textContent = 'Beendet'; el.classList.add('finished'); }
    else { el.textContent = 'Bereit'; }
  }

  function tickTimer() {
    const display = $('[data-role="timer-display"]', detailRoot);
    if (!display) { stopTimer(); return; }
    const remainMs = timerEndTs - performance.now();
    if (remainMs <= 0) {
      display.textContent = '00:00';
      display.classList.add('done');
      BT.audio.startBeep();
      setTimeout(() => BT.audio.startBeep(), 250);
      setTimeout(() => BT.audio.startBeep(), 500);
      stopTimer();
      setTimerState('finished');
      setTimeout(() => display.classList.remove('done'), 2500);
      return;
    }
    display.textContent = formatTime(Math.ceil(remainMs / 1000));
    timerRaf = requestAnimationFrame(tickTimer);
  }

  function stopTimer() {
    if (timerRaf) cancelAnimationFrame(timerRaf);
    timerRaf = 0;
  }

  function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function buildSummaryText(training) {
    const allPlayers = BT.storage.getPlayers();
    const nameOf = id => (allPlayers.find(p => p.id === id) || {}).name || '?';
    const att = (training.attendance || []);
    const present = att.filter(a => a.status === 'present');
    const absent = att.filter(a => a.status === 'absent');
    const excused = att.filter(a => a.status === 'excused');
    const injured = att.filter(a => a.status === 'injured');
    const late = att.filter(a => a.late && a.status === 'present');

    const lines = [];
    lines.push('🏀 Training ' + formatDate(training.date) + (training.startTime ? ' · ' + training.startTime : ''));
    lines.push('');
    lines.push('Anwesend: ' + present.length + '/' + att.length);
    if (excused.length) lines.push('Entschuldigt: ' + excused.map(a => nameOf(a.playerId)).join(', '));
    if (injured.length) lines.push('Verletzt: ' + injured.map(a => nameOf(a.playerId)).join(', '));
    if (absent.length) lines.push('Abwesend: ' + absent.map(a => nameOf(a.playerId)).join(', '));
    if (late.length) lines.push('Zu spät: ' + late.map(a => nameOf(a.playerId)).join(', '));

    const presentIds = new Set(present.map(a => a.playerId));
    const fts = (training.freethrows || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
    if (fts.length > 0) {
      let m = 0, a = 0;
      for (const e of fts) { m += e.made; a += e.attempted; }
      lines.push('');
      lines.push('Freiwürfe: ' + m + '/' + a + ' (' + pct(m, a) + '%)');
      const top = fts.slice().sort((x, y) => pct(y.made, y.attempted) - pct(x.made, x.attempted)).slice(0, 3);
      const topStr = top.map(e => nameOf(e.playerId) + ' ' + e.made + '/' + e.attempted).join(', ');
      if (topStr) lines.push('Top: ' + topStr);
    }

    const shotLines = [];
    for (const cat of (training.shots || [])) {
      const entries = (cat.entries || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
      if (entries.length === 0) continue;
      let m = 0, a = 0;
      for (const e of entries) { m += e.made; a += e.attempted; }
      shotLines.push('· ' + cat.category + ': ' + m + '/' + a + ' (' + pct(m, a) + '%)');
    }
    if (shotLines.length > 0) {
      lines.push('');
      lines.push('Würfe:');
      lines.push.apply(lines, shotLines);
    }

    if (training.note) {
      lines.push('');
      lines.push('📝 ' + training.note);
    }

    return lines.join('\n');
  }

  let jsPDFPromise = null;
  function loadJsPDF() {
    if (jsPDFPromise) return jsPDFPromise;
    jsPDFPromise = new Promise((resolve, reject) => {
      if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
      s.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else { jsPDFPromise = null; reject(new Error('jsPDF konnte nicht initialisiert werden')); }
      };
      s.onerror = () => { jsPDFPromise = null; reject(new Error('PDF-Bibliothek konnte nicht geladen werden (Internet nötig)')); };
      document.head.appendChild(s);
    });
    return jsPDFPromise;
  }

  function drawCourt(doc, x, y, w) {
    const h = w * 470 / 500;
    const sx = v => x + v * w / 500;
    const sy = v => y + v * h / 470;
    const sL = v => v * w / 500;

    doc.setLineWidth(0.8);
    doc.setDrawColor(122, 74, 26);
    doc.setFillColor(245, 230, 200);
    doc.rect(sx(10), sy(10), sL(480), sL(450), 'FD');

    doc.setFillColor(250, 220, 180);
    doc.rect(sx(160), sy(10), sL(180), sL(190), 'FD');

    doc.setLineWidth(0.6);
    doc.circle(sx(250), sy(200), sL(60), 'S');
    doc.line(sx(160), sy(200), sx(340), sy(200));

    doc.setDrawColor(204, 51, 0);
    doc.setLineWidth(1);
    doc.circle(sx(250), sy(50), sL(8), 'S');
    doc.setLineWidth(1.5);
    doc.line(sx(220), sy(40), sx(280), sy(40));

    doc.setDrawColor(122, 74, 26);
    doc.setLineWidth(0.8);
    doc.line(sx(50), sy(10), sx(50), sy(135));
    doc.line(sx(450), sy(10), sx(450), sy(135));

    const cx = 250, cy = 135, r = 200;
    let prev = null;
    for (let i = 0; i <= 24; i++) {
      const theta = Math.PI - (Math.PI * i / 24);
      const ax = cx + r * Math.cos(theta);
      const ay = cy + r * Math.sin(theta);
      if (prev) doc.line(sx(prev.x), sy(prev.y), sx(ax), sy(ay));
      prev = { x: ax, y: ay };
    }
    return h;
  }

  function drawTable(doc, x, startY, widths, headers, rows, colors) {
    const margin = 40;
    const rowH = 18;
    const pageH = doc.internal.pageSize.getHeight();
    const totalW = widths.reduce((a, b) => a + b, 0);
    let y = startY;

    function drawHeader() {
      doc.setFillColor(colors.header[0], colors.header[1], colors.header[2]);
      doc.rect(x, y, totalW, rowH, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      let cx = x;
      for (let i = 0; i < headers.length; i++) {
        doc.text(String(headers[i]), cx + 5, y + 12);
        cx += widths[i];
      }
      y += rowH;
      doc.setTextColor(20);
      doc.setFont('helvetica', 'normal');
    }

    drawHeader();
    for (let r = 0; r < rows.length; r++) {
      if (y + rowH > pageH - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      if (r % 2 === 1) {
        doc.setFillColor(245, 240, 232);
        doc.rect(x, y, totalW, rowH, 'F');
      }
      let cx = x;
      for (let i = 0; i < rows[r].length; i++) {
        doc.text(String(rows[r][i]), cx + 5, y + 12);
        cx += widths[i];
      }
      y += rowH;
    }
    return y;
  }

  function buildTrainingPDF(doc, training) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    const allPlayers = BT.storage.getPlayers();
    const nameOf = id => (allPlayers.find(p => p.id === id) || {}).name || '?';
    const att = training.attendance || [];
    const presentList = att.filter(a => a.status === 'present');
    const absentList = att.filter(a => a.status === 'absent');
    const excusedList = att.filter(a => a.status === 'excused');
    const injuredList = att.filter(a => a.status === 'injured');
    const lateList = att.filter(a => a.late && a.status === 'present');
    const presentIds = new Set(presentList.map(a => a.playerId));

    const orange = [232, 161, 77];
    const green = [0, 75, 43];

    doc.setFillColor(orange[0], orange[1], orange[2]);
    doc.rect(0, 0, pageW, 70, 'F');
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TSV Lindau Basketball', margin, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Trainingsbericht', margin, 48);
    doc.setFontSize(11);
    let sub = formatDate(training.date);
    if (training.startTime) sub += ' · ' + training.startTime + ' Uhr';
    doc.text(sub, pageW - margin, 30, { align: 'right' });
    y = 90;
    doc.setTextColor(20);

    function ensureSpace(n) {
      if (y + n > pageH - margin) { doc.addPage(); y = margin; }
    }
    function heading(text) {
      ensureSpace(30);
      doc.setFillColor(green[0], green[1], green[2]);
      doc.rect(margin, y, pageW - 2 * margin, 20, 'F');
      doc.setTextColor(255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(text, margin + 8, y + 14);
      doc.setTextColor(20);
      doc.setFont('helvetica', 'normal');
      y += 28;
    }

    if (training.note) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const lines = doc.splitTextToSize(training.note, pageW - 2 * margin);
      ensureSpace(lines.length * 12 + 10);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 10;
      doc.setFont('helvetica', 'normal');
    }

    heading('Team-Übersicht');
    doc.setFontSize(10);
    const overview = [
      ['Anwesend', presentList.length + ' / ' + att.length],
      ['Abwesend', String(absentList.length)],
      ['Entschuldigt', String(excusedList.length)],
      ['Verletzt', String(injuredList.length)],
      ['Zu spät', String(lateList.length)]
    ];
    const labelW = 110;
    for (const [k, v] of overview) {
      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.text(k + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(v, margin + labelW, y);
      y += 14;
    }
    y += 10;

    heading('Team-Statistik');
    const teamRows = [];
    const fts = (training.freethrows || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
    if (fts.length > 0) {
      let m = 0, a = 0;
      for (const e of fts) { m += e.made; a += e.attempted; }
      teamRows.push(['Freiwürfe', m + '/' + a, pct(m, a) + '%']);
    }
    const activeCats = [];
    for (const cat of (training.shots || [])) {
      const entries = (cat.entries || []).filter(e => presentIds.has(e.playerId) && (e.attempted || 0) > 0);
      if (entries.length === 0) continue;
      activeCats.push(cat);
      let m = 0, a = 0;
      for (const e of entries) { m += e.made; a += e.attempted; }
      teamRows.push([cat.category, m + '/' + a, pct(m, a) + '%']);
    }
    if (teamRows.length === 0) {
      ensureSpace(14);
      doc.setFont('helvetica', 'italic');
      doc.text('Keine Wurf-Daten erfasst.', margin, y);
      doc.setFont('helvetica', 'normal');
      y += 14;
    } else {
      ensureSpace((teamRows.length + 1) * 18 + 4);
      y = drawTable(doc, margin, y,
        [pageW - 2 * margin - 160, 80, 80],
        ['Kategorie', 'Treffer/Versuche', 'Quote'],
        teamRows, { header: orange });
      y += 14;
    }

    const allShots = (training.shotMap || []).filter(s => presentIds.has(s.playerId));
    if (allShots.length > 0) {
      heading('Team-Wurfkarte');
      const courtW = Math.min(360, pageW - 2 * margin);
      const courtH = courtW * 470 / 500;
      ensureSpace(courtH + 30);
      const courtX = margin + ((pageW - 2 * margin) - courtW) / 2;
      drawCourt(doc, courtX, y, courtW);
      for (const s of allShots) {
        const sx = courtX + (s.x / 500) * courtW;
        const sy = y + (s.y / 470) * courtH;
        if (s.made) {
          doc.setFillColor(0, 140, 60);
          doc.setDrawColor(0, 75, 43);
          doc.setLineWidth(0.5);
          doc.circle(sx, sy, 3, 'FD');
        } else {
          doc.setDrawColor(220, 38, 38);
          doc.setLineWidth(1);
          doc.line(sx - 2.5, sy - 2.5, sx + 2.5, sy + 2.5);
          doc.line(sx - 2.5, sy + 2.5, sx + 2.5, sy - 2.5);
        }
      }
      y += courtH + 8;
      const hits = allShots.filter(s => s.made).length;
      const misses = allShots.length - hits;
      doc.setFontSize(9);
      doc.setTextColor(20);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(0, 140, 60);
      doc.circle(courtX, y + 4, 3, 'F');
      doc.text('Treffer: ' + hits, courtX + 10, y + 7);
      const missLabelX = courtX + 80;
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(missLabelX - 2.5, y + 1.5, missLabelX + 2.5, y + 6.5);
      doc.line(missLabelX - 2.5, y + 6.5, missLabelX + 2.5, y + 1.5);
      doc.text('Fehlwurf: ' + misses, missLabelX + 10, y + 7);
      doc.text('Quote: ' + pct(hits, allShots.length) + '%', courtX + 180, y + 7);
      y += 20;
    }

    if (presentList.length > 0) {
      heading('Spieler-Statistik');
      const hasFT = fts.length > 0;
      const cols = ['Spieler'];
      if (hasFT) cols.push('FT');
      for (const c of activeCats) cols.push(c.category);

      const nameW = 120;
      const statCount = cols.length - 1;
      const statW = statCount > 0 ? (pageW - 2 * margin - nameW) / statCount : 0;
      const widths = [nameW];
      for (let i = 0; i < statCount; i++) widths.push(statW);

      const sorted = presentList.slice()
        .map(a => ({ a, p: allPlayers.find(p => p.id === a.playerId) }))
        .filter(x => x.p)
        .sort((x, y) => x.p.name.localeCompare(y.p.name, 'de'));

      const rows = sorted.map(({ p }) => {
        const isLate = lateList.some(l => l.playerId === p.id);
        const row = [p.name + (isLate ? ' (spät)' : '')];
        if (hasFT) {
          const e = fts.find(f => f.playerId === p.id);
          row.push(e ? e.made + '/' + e.attempted + ' (' + pct(e.made, e.attempted) + '%)' : '–');
        }
        for (const cat of activeCats) {
          const e = (cat.entries || []).find(x => x.playerId === p.id && (x.attempted || 0) > 0);
          row.push(e ? e.made + '/' + e.attempted + ' (' + pct(e.made, e.attempted) + '%)' : '–');
        }
        return row;
      });

      ensureSpace(36);
      y = drawTable(doc, margin, y, widths, cols, rows, { header: green });
      y += 8;
    }

    const fitnessEntries = (training.fitness || []).filter(e =>
      presentIds.has(e.playerId) &&
      (e.sprint != null || e.rimTouches != null || e.laneAgility != null || e.pushUps != null)
    );
    if (fitnessEntries.length > 0) {
      heading('Fitness-Test');
      const fmt = (v, digits) => (v == null || isNaN(v)) ? '–' : Number(v).toFixed(digits);
      const fitRows = fitnessEntries.slice()
        .map(e => ({ e, p: allPlayers.find(p => p.id === e.playerId) }))
        .filter(x => x.p)
        .sort((x, y) => x.p.name.localeCompare(y.p.name, 'de'))
        .map(({ e, p }) => [
          p.name,
          e.sprint != null ? fmt(e.sprint, 2) + ' s' : '–',
          e.rimTouches != null ? String(e.rimTouches) : '–',
          e.laneAgility != null ? fmt(e.laneAgility, 2) + ' s' : '–',
          e.pushUps != null ? String(e.pushUps) : '–'
        ]);

      const nameW2 = 140;
      const colW2 = (pageW - 2 * margin - nameW2) / 4;
      ensureSpace((fitRows.length + 1) * 18 + 8);
      y = drawTable(doc, margin, y,
        [nameW2, colW2, colW2, colW2, colW2],
        ['Spieler', 'Sprint', 'Rim Touches', 'Lane Agility', 'Liegestütze'],
        fitRows, { header: orange });
      y += 8;
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('TSV Lindau Basketball · Erstellt ' + formatDate(new Date().toISOString().slice(0, 10)),
        margin, pageH - 20);
      doc.text('Seite ' + i + ' / ' + totalPages, pageW - margin, pageH - 20, { align: 'right' });
    }
  }

  async function endTrainingAndShare(training) {
    if (!confirm('Training beenden und Bericht als PDF teilen?\n\nDas Training wird als abgeschlossen markiert und fliesst ab sofort in die Spielerstatistik ein.')) return;
    const btn = $('[data-action="end-training"]', detailRoot);
    const orig = btn ? btn.textContent : '';
    try {
      if (btn) { btn.disabled = true; btn.textContent = '⏳ PDF wird erstellt…'; }
      if (!training.endedAt) {
        training.endedAt = new Date().toISOString();
        BT.storage.upsertTraining(training);
        renderSummary();
      }
      const JsPDFCtor = await loadJsPDF();
      const doc = new JsPDFCtor({ unit: 'pt', format: 'a4' });
      buildTrainingPDF(doc, training);
      const blob = doc.output('blob');
      const filename = 'Trainingsbericht_' + training.date + '.pdf';
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Trainingsbericht ' + formatDate(training.date) });
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return;
        }
      }
      downloadBlob(filename, blob);
      alert('Teilen wird vom Browser nicht unterstützt — PDF wurde heruntergeladen.');
    } catch (e) {
      alert('Fehler beim PDF-Erstellen: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    }
  }

  function previousEndedTraining(training) {
    const all = BT.storage.getTrainings();
    const candidates = all
      .filter(t => t.id !== training.id)
      .filter(t => BT.stats.isEnded(t))
      .filter(t => (t.date || '') < (training.date || ''))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return candidates[0] || null;
  }

  async function openAISummary(training) {
    const apiKey = (BT.storage.getSetting('geminiApiKey', '') || '').trim();
    const hasApiKey = !!apiKey;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-label="KI-Zusammenfassung">
        <div class="modal-head">
          <h3>🤖 KI-Zusammenfassung</h3>
          <button type="button" class="btn small" data-action="close" aria-label="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <p class="muted" data-role="status">⏳ Gemini arbeitet …</p>
          <div class="ai-summary-fallback hidden" data-role="fallback">
            <button type="button" class="btn" data-action="use-manual">📋 Manuelle Zusammenfassung benutzen</button>
          </div>
          <textarea class="ai-summary-text" data-role="out" rows="8" readonly placeholder="Text erscheint hier …"></textarea>
          <div class="form-actions">
            <button type="button" class="btn" data-action="copy" disabled>📋 Kopieren</button>
            <button type="button" class="btn primary" data-action="share" disabled>📤 Teilen</button>
            <button type="button" class="btn" data-action="regenerate" disabled>↻ Neu generieren</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const statusEl = backdrop.querySelector('[data-role="status"]');
    const outEl = backdrop.querySelector('[data-role="out"]');
    const copyBtn = backdrop.querySelector('[data-action="copy"]');
    const shareBtn = backdrop.querySelector('[data-action="share"]');
    const regenBtn = backdrop.querySelector('[data-action="regenerate"]');
    const fallbackBox = backdrop.querySelector('[data-role="fallback"]');
    const manualBtn = backdrop.querySelector('[data-action="use-manual"]');

    function close() {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close();
      if (e.target.closest('[data-action="close"]')) close();
    });

    function applyManualSummary(prefixNote) {
      const text = buildSummaryText(training);
      outEl.value = text;
      statusEl.textContent = (prefixNote ? prefixNote + ' · ' : '') + '✓ Manuelle Zusammenfassung';
      copyBtn.disabled = false;
      shareBtn.disabled = false;
      regenBtn.disabled = !hasApiKey;
      fallbackBox.classList.add('hidden');
    }

    manualBtn.addEventListener('click', () => applyManualSummary());

    async function run() {
      if (!hasApiKey) {
        // Empty state: kein API-Key → direkt manuelle Zusammenfassung statt alert()
        regenBtn.disabled = true;
        applyManualSummary('Gemini nicht konfiguriert');
        return;
      }
      statusEl.textContent = '⏳ Gemini arbeitet …';
      outEl.value = '';
      copyBtn.disabled = true;
      shareBtn.disabled = true;
      regenBtn.disabled = true;
      fallbackBox.classList.add('hidden');
      try {
        const prev = previousEndedTraining(training);
        const t0 = Date.now();
        const ticker = setInterval(() => {
          const sec = Math.floor((Date.now() - t0) / 1000);
          statusEl.textContent = '⏳ Gemini arbeitet … ' + sec + 's';
        }, 500);
        let text;
        try {
          text = await BT.aiimport.summarizeTraining(training, prev, apiKey, msg => {
            statusEl.textContent = '⏳ ' + msg;
          });
        } finally {
          clearInterval(ticker);
        }
        outEl.value = text;
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        statusEl.textContent = '✓ Fertig (' + sec + 's)' + (prev ? ' · Vergleich mit ' + formatDate(prev.date) : ' · ohne Vergleichstraining');
        copyBtn.disabled = false;
        shareBtn.disabled = false;
        regenBtn.disabled = false;
      } catch (e) {
        console.error(e);
        statusEl.textContent = '✗ Fehler: ' + e.message;
        regenBtn.disabled = false;
        fallbackBox.classList.remove('hidden');
      }
    }

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(outEl.value);
        copyBtn.textContent = '✓ Kopiert';
        setTimeout(() => { copyBtn.textContent = '📋 Kopieren'; }, 1800);
      } catch (e) {
        outEl.select();
        document.execCommand('copy');
      }
    });

    shareBtn.addEventListener('click', async () => {
      const text = outEl.value;
      if (navigator.share) {
        try { await navigator.share({ title: 'Training ' + formatDate(training.date), text }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(text);
        BT.util.toast('In Zwischenablage kopiert');
      } catch (e) {}
    });

    regenBtn.addEventListener('click', run);
    run();
  }

  async function shareSummary(training) {
    const text = buildSummaryText(training);
    const title = 'Training ' + formatDate(training.date);

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        alert('In Zwischenablage kopiert — kannst du jetzt in WhatsApp einfügen.');
        return;
      } catch (e) {}
    }
    prompt('Kopiere den Text:', text);
  }

  function exportCSV(training) {
    const allPlayers = BT.storage.getPlayers();
    const presentIds = new Set(presentPlayerIds(training));
    const nameOf = id => (allPlayers.find(p => p.id === id) || {}).name || '?';
    const posOf = id => (allPlayers.find(p => p.id === id) || {}).position || '';

    const rows = [];
    rows.push(['# Anwesenheit']);
    rows.push(['Datum', 'Startzeit', 'Spieler', 'Position', 'Status', 'Symbol', 'Zu spät', 'Notiz', 'Training-Notiz']);
    const attSorted = (training.attendance || []).slice()
      .map(a => ({ a, p: allPlayers.find(p => p.id === a.playerId) }))
      .filter(x => x.p)
      .sort((x, y) => x.p.name.localeCompare(y.p.name, 'de'));
    for (const { a, p } of attSorted) {
      rows.push([
        training.date, training.startTime || '', p.name, p.position || '',
        STATUS_LABELS[a.status] || a.status, STATUS_SYMBOL[a.status] || '',
        a.late ? 'ja' : 'nein', a.note || '', training.note || ''
      ]);
    }

    const fts = (training.freethrows || []).filter(e => presentIds.has(e.playerId));
    if (fts.length > 0) {
      rows.push([]);
      rows.push(['# Freiwürfe']);
      rows.push(['Datum', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %']);
      const sorted = fts.slice().sort((a, b) => nameOf(a.playerId).localeCompare(nameOf(b.playerId), 'de'));
      let m = 0, a = 0;
      for (const e of sorted) {
        rows.push([training.date, nameOf(e.playerId), posOf(e.playerId), e.made, e.attempted, pct(e.made, e.attempted)]);
        m += e.made; a += e.attempted;
      }
      rows.push(['', 'TEAM', '', m, a, pct(m, a)]);
    }

    for (const cat of (training.shots || [])) {
      const entries = (cat.entries || []).filter(e => presentIds.has(e.playerId));
      if (entries.length === 0) continue;
      rows.push([]);
      rows.push(['# Würfe – ' + cat.category]);
      rows.push(['Datum', 'Kategorie', 'Spieler', 'Position', 'Treffer', 'Versuche', 'Quote %']);
      const sorted = entries.slice().sort((a, b) => nameOf(a.playerId).localeCompare(nameOf(b.playerId), 'de'));
      let m = 0, a = 0;
      for (const e of sorted) {
        rows.push([training.date, cat.category, nameOf(e.playerId), posOf(e.playerId), e.made, e.attempted, pct(e.made, e.attempted)]);
        m += e.made; a += e.attempted;
      }
      rows.push(['', cat.category, 'TEAM', '', m, a, pct(m, a)]);
    }

    downloadCSV('training_' + training.date + '.csv', rows);
  }

  function exportJSON(training) {
    const allPlayers = BT.storage.getPlayers();
    const presentIds = new Set(presentPlayerIds(training));
    const enrich = (e) => {
      const p = allPlayers.find(x => x.id === e.playerId);
      return {
        playerId: e.playerId,
        name: p ? p.name : null,
        position: p && p.position ? p.position : null,
        made: e.made, attempted: e.attempted,
        pct: pct(e.made, e.attempted)
      };
    };
    const payload = {
      type: 'training',
      date: training.date,
      startTime: training.startTime || null,
      note: training.note || null,
      attendance: (training.attendance || []).map(a => {
        const p = allPlayers.find(x => x.id === a.playerId);
        return {
          playerId: a.playerId,
          name: p ? p.name : null,
          position: p && p.position ? p.position : null,
          status: a.status,
          statusLabel: STATUS_LABELS[a.status] || a.status,
          late: !!a.late,
          note: a.note || null
        };
      }),
      freethrows: (training.freethrows || []).filter(e => presentIds.has(e.playerId)).map(enrich),
      shots: (training.shots || []).map(cat => ({
        category: cat.category,
        entries: (cat.entries || []).filter(e => presentIds.has(e.playerId)).map(enrich)
      })).filter(c => c.entries.length > 0)
    };
    downloadJSON('training_' + training.date + '.json', payload);
  }

  return { renderList, renderDetail };
})();
