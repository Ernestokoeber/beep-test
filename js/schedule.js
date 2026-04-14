window.BT = window.BT || {};

BT.schedule = (function() {
  const { $, $$, renderTemplate, todayISO } = BT.util;

  const DAYS = [
    { key: 'mon', label: 'Mo', num: 1 },
    { key: 'tue', label: 'Di', num: 2 },
    { key: 'wed', label: 'Mi', num: 3 },
    { key: 'thu', label: 'Do', num: 4 },
    { key: 'fri', label: 'Fr', num: 5 },
    { key: 'sat', label: 'Sa', num: 6 },
    { key: 'sun', label: 'So', num: 0 }
  ];

  function render(target) {
    const root = renderTemplate('tpl-schedule');
    target.appendChild(root);

    const selectedDays = new Set(BT.storage.getSetting('regularDays', []));
    const time = BT.storage.getSetting('regularTime', '20:15');
    const lookahead = BT.storage.getSetting('regularLookahead', 6);

    const wdRow = $('[data-role="weekdays"]', root);
    wdRow.innerHTML = '';
    for (const d of DAYS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wd-btn' + (selectedDays.has(d.key) ? ' active' : '');
      btn.textContent = d.label;
      btn.dataset.key = d.key;
      btn.addEventListener('click', () => {
        if (selectedDays.has(d.key)) selectedDays.delete(d.key);
        else selectedDays.add(d.key);
        btn.classList.toggle('active');
      });
      wdRow.appendChild(btn);
    }

    $('[data-role="time"]', root).value = time;
    $('[data-role="lookahead"]', root).value = lookahead;

    $('[data-action="save-schedule"]', root).addEventListener('click', () => {
      BT.storage.setSetting('regularDays', Array.from(selectedDays));
      BT.storage.setSetting('regularTime', $('[data-role="time"]', root).value || '20:15');
      BT.storage.setSetting('regularLookahead', parseInt($('[data-role="lookahead"]', root).value, 10) || 6);
      renderUpcoming(root);
    });

    renderUpcoming(root);
    setupAIImport(root);
  }

  function setupAIImport(root) {
    const keyInput = $('[data-role="api-key"]', root);
    const status = $('[data-role="ai-status"]', root);
    keyInput.value = BT.storage.getSetting('geminiApiKey', '');

    $('[data-action="save-key"]', root).addEventListener('click', () => {
      BT.storage.setSetting('geminiApiKey', keyInput.value.trim());
      status.textContent = '✓ API Key gespeichert.';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });

    $('[data-action="upload-pdf"]', root).addEventListener('click', async () => {
      const apiKey = (keyInput.value || BT.storage.getSetting('geminiApiKey', '')).trim();
      if (!apiKey) {
        alert('Bitte zuerst den Gemini API Key oben eintragen und speichern.');
        return;
      }
      const file = await BT.util.pickFile('application/pdf,.pdf');
      if (!file) return;

      status.textContent = '⏳ Plan wird analysiert (kann 10-60 Sekunden dauern) ...';
      try {
        const parsed = await BT.aiimport.parseWithGemini(file, apiKey, (msg) => {
          status.textContent = '⏳ ' + msg;
        });
        const summary = parsed.trainings.map((t, i) => {
          const parts = [(i + 1) + '. ' + (t.weekday || '?') + (t.date ? ' (' + t.date + ')' : '')];
          if (t.summary) parts.push('   → ' + t.summary);
          if (t.freethrows && t.freethrows.attempted) parts.push('   FT: ' + t.freethrows.attempted + ' pro Spieler');
          if (t.shots && t.shots.length) parts.push('   Würfe: ' + t.shots.map(s => s.category + ' ' + s.attempted).join(', '));
          if (t.drills && t.drills.length) parts.push('   Drills: ' + t.drills.length);
          return parts.join('\n');
        }).join('\n\n');

        if (!confirm('Gemini hat ' + parsed.trainings.length + ' Training(s) erkannt:\n\n' + summary + '\n\nAuf die nächsten Termine anwenden?')) {
          status.textContent = 'Abgebrochen.';
          return;
        }

        const results = BT.aiimport.applyPlanToTrainings(parsed);
        const created = results.filter(r => r.action === 'created').length;
        const updated = results.filter(r => r.action === 'updated').length;
        const meta = parsed._meta || {};
        status.innerHTML = '✓ Fertig (' + (meta.model || '?') + ', ' + (meta.elapsedSec || '?') + 's): ' + created + ' angelegt, ' + updated + ' aktualisiert.';
        renderUpcoming(root);
      } catch (e) {
        console.error(e);
        status.textContent = '✗ Fehler: ' + e.message;
      }
    });
  }

  function renderUpcoming(root) {
    const list = $('[data-role="upcoming"]', root);
    const empty = $('[data-role="upcoming-empty"]', root);
    list.innerHTML = '';

    const days = BT.storage.getSetting('regularDays', []);
    const time = BT.storage.getSetting('regularTime', '20:15');
    const lookahead = BT.storage.getSetting('regularLookahead', 6);

    if (!Array.isArray(days) || days.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    const dayNums = days.map(k => (DAYS.find(d => d.key === k) || {}).num).filter(n => n !== undefined);
    const [hh, mm] = time.split(':').map(x => parseInt(x, 10));
    const now = new Date();

    const upcoming = [];
    for (let i = 0; i < 60 && upcoming.length < lookahead; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(hh || 20, mm || 15, 0, 0);
      if (dayNums.includes(d.getDay()) && d > now) upcoming.push(d);
    }

    const trainings = BT.storage.getTrainings();

    for (const d of upcoming) {
      const iso = d.toISOString().slice(0, 10);
      const existing = trainings.find(t => t.date === iso);
      const dStr = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      const tStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const diffMs = d - now;
      const diffDays = Math.floor(diffMs / 86400000);
      const diffHours = Math.floor((diffMs % 86400000) / 3600000);
      const inStr = diffDays > 0 ? 'in ' + diffDays + (diffDays === 1 ? ' Tag' : ' Tagen') : 'in ' + diffHours + ' h';

      const li = document.createElement('li');
      li.innerHTML = `
        <div class="info">
          <div class="name">${dStr} · ${tStr}</div>
          <div class="meta">${inStr}${existing ? ' · <span class="att-chip ok">Training existiert</span>' : ''}</div>
        </div>
        <div class="actions">
          ${existing
            ? `<a class="btn small" href="#/training/${existing.id}">Öffnen</a>
               <button class="btn small danger" data-delete="${existing.id}" data-date="${iso}">Löschen</button>`
            : `<button class="btn small primary" data-create="${iso}" data-time="${time}">+ Anlegen</button>`}
        </div>
      `;
      const createBtn = li.querySelector('[data-create]');
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          const t = BT.storage.upsertTraining({
            date: iso,
            startTime: time,
            note: '',
            attendance: BT.storage.getPlayers().filter(p => !p.archived).map(p => ({ playerId: p.id, status: null, late: false, note: '' })),
            freethrows: [],
            shots: []
          });
          location.hash = '#/training/' + t.id;
        });
      }
      const deleteBtn = li.querySelector('[data-delete]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          const id = deleteBtn.dataset.delete;
          const dateStr = deleteBtn.dataset.date;
          if (!confirm('Training vom ' + BT.util.formatDate(dateStr) + ' wirklich löschen? Anwesenheit, Würfe, Notizen — alles weg.')) return;
          BT.storage.deleteTraining(id);
          renderUpcoming(root);
        });
      }
      list.appendChild(li);
    }
  }

  return { render };
})();
