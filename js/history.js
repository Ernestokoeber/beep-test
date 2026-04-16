window.BT = window.BT || {};

BT.history = (function() {
  const { $, renderTemplate, formatDate, escapeHTML, downloadCSV, downloadJSON, shareOrDownloadJSON, pickFile, readFileAsText, todayISO } = BT.util;

  function renderList(target) {
    const root = renderTemplate('tpl-history');
    target.appendChild(root);

    $('[data-action="share-backup"]', root).addEventListener('click', shareBackup);
    $('[data-action="export-backup"]', root).addEventListener('click', exportBackup);
    $('[data-action="import-backup"]', root).addEventListener('click', importBackup);

    const list = $('[data-role="session-list"]', root);
    const empty = $('[data-role="empty"]', root);
    const sessions = BT.storage.getSessions();

    if (sessions.length === 0) {
      empty.classList.remove('hidden');
    }

    const allPlayers = BT.storage.getPlayers();

    for (const s of sessions) {
      const best = s.results.reduce((max, r) => r.totalShuttles > (max ? max.totalShuttles : -1) ? r : max, null);
      const bestPlayer = best ? allPlayers.find(p => p.id === best.playerId) : null;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#/history/' + s.id;
      const typeLabel = s.testType === 'yoyoIR1' ? 'Yo-Yo IR1' : 'Léger';
      a.innerHTML = `
        <div class="info">
          <div class="name">${formatDate(s.date)}${s.note ? ' – ' + escapeHTML(s.note) : ''}</div>
          <div class="meta">
            <span class="att-chip">${typeLabel}</span>
            ${s.participants.length} Teilnehmer
            ${best ? ' · Beste: ' + escapeHTML(bestPlayer ? bestPlayer.name : '?') + ' (Level ' + best.level + ')' : ''}
          </div>
        </div>
      `;
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  function renderDetail(target, sessionId) {
    const root = renderTemplate('tpl-session');
    target.appendChild(root);

    const session = BT.storage.getSession(sessionId);
    if (!session) { location.hash = '#/history'; return; }

    const allPlayers = BT.storage.getPlayers();
    $('[data-role="title"]', root).textContent = 'Test vom ' + formatDate(session.date);
    const metaParts = [];
    metaParts.push(session.testType === 'yoyoIR1' ? 'Yo-Yo IR1' : 'Léger Beep-Test');
    metaParts.push(session.participants.length + ' Teilnehmer');
    metaParts.push('Runde: ' + (session.distanceM || 20) + ' m');
    if (session.note) metaParts.push(escapeHTML(session.note));
    $('[data-role="meta"]', root).innerHTML = metaParts.join(' · ');

    const rows = $('[data-role="rows"]', root);
    const distanceM = session.distanceM || 20;
    const ranked = session.results.slice().sort((a, b) => b.totalShuttles - a.totalShuttles);
    ranked.forEach((r, i) => {
      const p = allPlayers.find(x => x.id === r.playerId);
      const rating = BT.ratings.rateResult(session, r);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHTML(p ? p.name : '?')}</td>
        <td>${r.level}</td>
        <td>${r.shuttle}</td>
        <td>${r.totalShuttles}</td>
        <td>${r.totalShuttles * distanceM} m</td>
        <td>${rating.vo2max.toFixed(1)}</td>
        <td><span class="rating-chip tier-${rating.tier}">${rating.label}</span></td>
      `;
      rows.appendChild(tr);
    });

    $('[data-action="export-csv"]', root).addEventListener('click', () => {
      const csvRows = [['Rang', 'Spieler', 'Position', 'Level', 'Shuttle', 'Gesamt-Shuttles', 'Rundenlänge (m)', 'Meter', 'VO2max (ml/min/kg)', 'Bewertung', 'Grund']];
      ranked.forEach((r, i) => {
        const p = allPlayers.find(x => x.id === r.playerId);
        const rating = BT.ratings.rateResult(session, r);
        csvRows.push([
          i + 1,
          p ? p.name : '?',
          p && p.position ? p.position : '',
          r.level,
          r.shuttle,
          r.totalShuttles,
          session.distanceM || 20,
          r.totalShuttles * (session.distanceM || 20),
          rating.vo2max.toFixed(1),
          rating.label,
          r.reason
        ]);
      });
      const fname = 'beeptest_' + session.date + '.csv';
      downloadCSV(fname, csvRows);
    });

    $('[data-action="delete"]', root).addEventListener('click', function() {
      BT.util.confirmBtn(this, () => {
        BT.storage.deleteSession(sessionId);
        location.hash = '#/history';
      });
    });
  }

  function exportBackup() {
    const data = BT.storage.load();
    data.exportedAt = new Date().toISOString();
    downloadJSON('beeptest_backup_' + todayISO() + '.json', data);
  }

  async function shareBackup() {
    const data = BT.storage.load();
    data.exportedAt = new Date().toISOString();
    const filename = 'beeptest_backup_' + todayISO() + '.json';
    const result = await shareOrDownloadJSON(filename, data, 'TSVLindau Train-APP Backup');
    if (result === 'downloaded') {
      alert('Teilen wird vom Browser nicht unterstützt — Datei wurde stattdessen heruntergeladen.');
    }
  }

  async function importBackup() {
    const file = await pickFile('application/json,.json');
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      if (!data || data.schemaVersion !== 1 || !Array.isArray(data.players) || !Array.isArray(data.sessions)) {
        alert('Ungültige Backup-Datei.');
        return;
      }
      const current = BT.storage.load();
      const hasData = current.players.length > 0 || current.sessions.length > 0 || (current.trainings || []).length > 0;
      const choice = hasData
        ? prompt('Backup importieren:\n  "m" = Mergen (bestehende Daten behalten, neue ergänzen)\n  "r" = Ersetzen (alle aktuellen Daten löschen)\n  Abbrechen = leer lassen', 'm')
        : 'r';
      if (!choice) return;
      if (choice === 'r') {
        BT.storage.save({
          schemaVersion: 1,
          players: data.players,
          sessions: data.sessions,
          trainings: Array.isArray(data.trainings) ? data.trainings : [],
          notes: Array.isArray(data.notes) ? data.notes : [],
          freethrows: Array.isArray(data.freethrows) ? data.freethrows : [],
          settings: data.settings || {}
        });
      } else if (choice === 'm') {
        BT.storage.save({
          schemaVersion: 1,
          players: mergeById(current.players, data.players),
          sessions: mergeById(current.sessions, data.sessions),
          trainings: mergeById(current.trainings || [], data.trainings || []),
          notes: mergeById(current.notes || [], data.notes || []),
          freethrows: mergeById(current.freethrows || [], data.freethrows || []),
          settings: Object.assign({}, current.settings || {}, data.settings || {})
        });
      } else {
        alert('Ungültige Auswahl.');
        return;
      }
      alert('Import erfolgreich.');
      location.reload();
    } catch (e) {
      alert('Fehler beim Import: ' + e.message);
    }
  }

  function mergeById(existing, incoming) {
    const map = new Map();
    existing.forEach(x => map.set(x.id, x));
    incoming.forEach(x => { if (!map.has(x.id)) map.set(x.id, x); });
    return Array.from(map.values());
  }

  return { renderList, renderDetail, shareBackup, exportBackup, importBackup };
})();
