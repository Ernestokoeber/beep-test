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
        attendance: initialAttendance()
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

  function renderDetail(target, id) {
    const training = BT.storage.getTraining(id);
    if (!training) { location.hash = '#/training'; return; }
    currentTraining = training;

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

  function save() {
    BT.storage.upsertTraining(currentTraining);
  }

  function exportCSV(training) {
    const allPlayers = BT.storage.getPlayers();
    const rows = [['Datum', 'Startzeit', 'Spieler', 'Position', 'Status', 'Symbol', 'Zu spät', 'Notiz', 'Training-Notiz']];
    const sorted = (training.attendance || []).slice()
      .map(a => ({ a, p: allPlayers.find(p => p.id === a.playerId) }))
      .filter(x => x.p)
      .sort((x, y) => x.p.name.localeCompare(y.p.name, 'de'));

    for (const { a, p } of sorted) {
      rows.push([
        training.date,
        training.startTime || '',
        p.name,
        p.position || '',
        STATUS_LABELS[a.status] || a.status,
        STATUS_SYMBOL[a.status] || '',
        a.late ? 'ja' : 'nein',
        a.note || '',
        training.note || ''
      ]);
    }
    downloadCSV('training_' + training.date + '.csv', rows);
  }

  function exportJSON(training) {
    const allPlayers = BT.storage.getPlayers();
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
      })
    };
    downloadJSON('training_' + training.date + '.json', payload);
  }

  return { renderList, renderDetail };
})();
