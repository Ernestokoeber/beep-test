window.BT = window.BT || {};

BT.training = (function() {
  const { $, $$, renderTemplate, formatDate, todayISO, escapeHTML, downloadCSV, downloadJSON } = BT.util;

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

    $('[data-action="new-training"]', root).addEventListener('click', () => {
      const t = BT.storage.upsertTraining({
        date: todayISO(),
        startTime: BT.storage.getSetting('trainingStartTime', '20:15'),
        note: '',
        attendance: initialAttendance(),
        freethrows: [],
        shots: []
      });
      location.hash = '#/training/' + t.id;
    });

    const list = $('[data-role="list"]', root);
    const empty = $('[data-role="empty"]', root);
    const trainings = BT.storage.getTrainings();

    if (trainings.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    for (const t of trainings) {
      const summary = summarize(t);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#/training/' + t.id;
      a.innerHTML = `
        <div class="info">
          <div class="name">${formatDate(t.date)}${t.startTime ? ' · ' + escapeHTML(t.startTime) : ''}${t.note ? ' – ' + escapeHTML(t.note) : ''}</div>
          <div class="meta">
            <span class="att-chip ok">✓ ${summary.present}</span>
            <span class="att-chip bad">✗ ${summary.absent}</span>
            <span class="att-chip warn">E ${summary.excused}</span>
            <span class="att-chip warn">V ${summary.injured}</span>
            ${summary.late > 0 ? '<span class="att-chip">Spät: ' + summary.late + '</span>' : ''}
          </div>
        </div>
      `;
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  function initialAttendance() {
    return BT.storage.getPlayers()
      .filter(p => !p.archived)
      .map(p => ({ playerId: p.id, status: 'present', late: false, note: '' }));
  }

  function presentPlayerIds(training) {
    return (training.attendance || [])
      .filter(a => a.status === 'present')
      .map(a => a.playerId);
  }

  function pct(made, att) { return att ? Math.round((made / att) * 100) : 0; }

  function summarize(training) {
    const s = { present: 0, absent: 0, excused: 0, injured: 0, late: 0 };
    for (const a of training.attendance || []) {
      if (s[a.status] !== undefined) s[a.status]++;
      if (a.late) s.late++;
    }
    return s;
  }

  let currentTraining = null;
  let detailRoot = null;
  let currentShotCategory = null;

  function renderDetail(target, id) {
    const training = BT.storage.getTraining(id);
    if (!training) { location.hash = '#/training'; return; }
    currentTraining = training;
    currentTraining.freethrows = currentTraining.freethrows || [];
    currentTraining.shots = currentTraining.shots || [];

    const cats = BT.storage.getShotCategories();
    currentShotCategory = cats[0] || null;

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

    $('[data-action="export-csv"]', detailRoot).addEventListener('click', () => exportCSV(currentTraining));
    $('[data-action="export-json"]', detailRoot).addEventListener('click', () => exportJSON(currentTraining));
    $('[data-action="delete"]', detailRoot).addEventListener('click', () => {
      if (!confirm('Dieses Training wirklich löschen?')) return;
      BT.storage.deleteTraining(currentTraining.id);
      location.hash = '#/training';
    });

    renderAttendance();
    renderSummary();
    renderFreethrows();
    renderShotTabs();
    renderShots();
  }

  function syncAttendanceWithPlayers() {
    const active = BT.storage.getPlayers().filter(p => !p.archived);
    const existingIds = new Set((currentTraining.attendance || []).map(a => a.playerId));
    for (const p of active) {
      if (!existingIds.has(p.id)) {
        currentTraining.attendance.push({ playerId: p.id, status: 'present', late: false, note: '' });
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
      card.className = 'att-card status-' + att.status;
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
              ${STATUS_SYMBOL[s]} ${STATUS_LABELS[s]}
            </button>
          `).join('')}
        </div>
        <input type="text" class="att-note" data-role="note" value="${escapeHTML(att.note || '')}" placeholder="Notiz (optional)" maxlength="120">
      `;

      $$('.status-btn', card).forEach(btn => {
        btn.addEventListener('click', () => {
          att.status = btn.dataset.status;
          if (att.status !== 'present') att.late = false;
          save();
          card.className = 'att-card status-' + att.status;
          $$('.status-btn', card).forEach(b => b.classList.toggle('active', b.dataset.status === att.status));
          const lateCb = $('[data-role="late"]', card);
          lateCb.checked = att.late;
          lateCb.disabled = att.status !== 'present';
          $('.late-box', card).classList.toggle('disabled', att.status !== 'present');
          renderSummary();
          renderFreethrows();
          renderShots();
        });
      });

      $('[data-role="late"]', card).addEventListener('change', e => {
        att.late = e.target.checked;
        save();
        renderSummary();
      });

      $('[data-role="note"]', card).addEventListener('input', e => {
        att.note = e.target.value;
        save();
      });

      list.appendChild(card);
    }
  }

  function renderSummary() {
    const s = summarize(currentTraining);
    const el = $('[data-role="summary"]', detailRoot);
    const total = s.present + s.absent + s.excused + s.injured;
    el.innerHTML = `
      <span class="att-chip ok">✓ Anwesend ${s.present}</span>
      <span class="att-chip bad">✗ Abwesend ${s.absent}</span>
      <span class="att-chip warn">E Entschuldigt ${s.excused}</span>
      <span class="att-chip warn">V Verletzt ${s.injured}</span>
      ${s.late > 0 ? '<span class="att-chip">Zu spät: ' + s.late + '</span>' : ''}
      <span class="att-chip muted-chip">Gesamt ${total}</span>
    `;
  }

  function getOrCreateFT(playerId) {
    let e = currentTraining.freethrows.find(x => x.playerId === playerId);
    if (!e) {
      e = { playerId, made: 0, attempted: 0 };
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
    if (att === 0 && entries.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="att-chip ok">Team ${made}/${att}</span><span class="att-chip">${pct(made, att)}%</span>`;
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
      e = { playerId, made: 0, attempted: 0 };
      cat.entries.push(e);
    }
    return e;
  }

  function renderShotTabs() {
    const cats = BT.storage.getShotCategories();
    if (!currentShotCategory || !cats.includes(currentShotCategory)) {
      currentShotCategory = cats[0] || null;
    }
    const tabs = $('[data-role="shot-tabs"]', detailRoot);
    tabs.innerHTML = '';

    for (const cat of cats) {
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
      del.title = 'Kategorie löschen';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Kategorie „' + cat + '" entfernen? (Die bereits erfassten Daten bleiben in Backups erhalten, aber diese Kategorie wird nirgends mehr angezeigt.)')) return;
        const updated = BT.storage.getShotCategories().filter(c => c !== cat);
        BT.storage.setShotCategories(updated);
        if (currentShotCategory === cat) currentShotCategory = updated[0] || null;
        renderShotTabs();
        renderShots();
      });
      tab.appendChild(del);
      tabs.appendChild(tab);
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'shot-tab add';
    addBtn.textContent = '+ Kategorie';
    addBtn.addEventListener('click', () => {
      const name = (prompt('Name der neuen Kategorie (z.B. „Korbleger", „3er links"):', '') || '').trim();
      if (!name) return;
      const existing = BT.storage.getShotCategories();
      if (existing.includes(name)) { alert('Diese Kategorie gibt es schon.'); return; }
      BT.storage.setShotCategories(existing.concat([name]));
      currentShotCategory = name;
      renderShotTabs();
      renderShots();
    });
    tabs.appendChild(addBtn);
  }

  function renderShots() {
    const list = $('[data-role="shots"]', detailRoot);
    const empty = $('[data-role="shot-empty"]', detailRoot);
    const sumEl = $('[data-role="shot-summary"]', detailRoot);
    list.innerHTML = '';
    sumEl.innerHTML = '';

    if (!currentShotCategory) {
      empty.classList.remove('hidden');
      empty.textContent = 'Bitte zuerst eine Wurf-Kategorie anlegen.';
      return;
    }

    const allPlayers = BT.storage.getPlayers();
    const presentIds = presentPlayerIds(currentTraining);
    if (presentIds.length === 0) {
      empty.classList.remove('hidden');
      empty.textContent = 'Keine anwesenden Spieler.';
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

    sumEl.innerHTML = `<span class="att-chip ok">${currentShotCategory}: ${totalMade}/${totalAtt}</span><span class="att-chip">${pct(totalMade, totalAtt)}%</span>`;
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

    function normalize() {
      entry.made = Math.max(0, Math.floor(entry.made || 0));
      entry.attempted = Math.max(0, Math.floor(entry.attempted || 0));
      if (entry.made > entry.attempted) entry.attempted = entry.made;
      madeInput.value = entry.made;
      attInput.value = entry.attempted;
    }
    function update() {
      normalize();
      pctLabel.textContent = pct(entry.made, entry.attempted) + '% (' + entry.made + '/' + entry.attempted + ')';
      save();
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
        sumEl.innerHTML = `<span class="att-chip ok">${currentShotCategory}: ${m}/${a}</span><span class="att-chip">${pct(m, a)}%</span>`;
      }
    }

    madeInput.addEventListener('input', () => { entry.made = parseInt(madeInput.value, 10) || 0; update(); });
    attInput.addEventListener('input', () => { entry.attempted = parseInt(attInput.value, 10) || 0; update(); });

    $$('[data-act]', card).forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'm+') { entry.made++; if (entry.made > entry.attempted) entry.attempted = entry.made; }
        else if (act === 'm-') { entry.made = Math.max(0, entry.made - 1); }
        else if (act === 'a+') { entry.attempted++; }
        else if (act === 'a-') { entry.attempted = Math.max(entry.made, entry.attempted - 1); }
        update();
      });
    });

    return card;
  }

  function save() {
    BT.storage.upsertTraining(currentTraining);
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
