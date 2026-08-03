window.BT = window.BT || {};

BT.schedule = (function() {
  const { $, $$, renderTemplate, todayISO, escapeHTML, formatDate } = BT.util;

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

    const selectedDays = new Set(BT.storage.getSetting('regularDays', ['tue', 'fri']));
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
      renderSeasonSummary(root);
    });
    $('[data-action="export-calendar"]', root).addEventListener('click', exportCalendar);

    renderUpcoming(root);
    setupSeasonPlanner(root);
    setupAIImport(root);
  }

  function seasonCoachInput(root) {
    return {
      goal: $('[data-role="season-goal"]', root).value.trim(),
      focus: $('[data-role="season-focus"]', root).value.trim(),
      problems: $('[data-role="season-problems"]', root).value.trim(),
      roster: $('[data-role="season-roster"]', root).value.trim()
    };
  }

  function seasonGames() {
    const config = BT.seasonplanner.scheduleConfig();
    return BT.storage.getGames().filter(game =>
      game.source === 'basketball-bund' && Number(game.leagueId) === Number(config.leagueId)
    );
  }

  function plannerSlots() {
    return BT.seasonplanner.buildSlots(seasonGames(), {
      days: BT.storage.getSetting('regularDays', ['tue', 'fri']),
      time: BT.storage.getSetting('regularTime', '20:15'),
      startDate: todayISO()
    });
  }

  function renderSeasonSummary(root) {
    const games = seasonGames().filter(game => !game.cancelled).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const slots = plannerSlots();
    const state = $('[data-role="season-plan-state"]', root);
    const summary = $('[data-role="season-plan-summary"]', root);
    if (!games.length) {
      state.textContent = 'Spielplan fehlt';
      state.className = 'att-chip warn';
      summary.innerHTML = '<div class="empty empty--field"><p class="empty-body">Synchronisiere zuerst den offiziellen Herren-Spielplan.</p></div>';
      return;
    }
    const trainings = BT.storage.getTrainings();
    const drafts = slots.filter(slot => trainings.some(training => training.date === slot.date && training.planning?.source === 'ai-season')).length;
    const protectedCount = slots.filter(slot => trainings.some(training => training.date === slot.date && (training.status === 'completed' || training.endedAt || training.planning?.coachEdited || training.planning?.source !== 'ai-season'))).length;
    state.textContent = drafts ? drafts + ' KI-Entwürfe' : slots.length + ' Termine bereit';
    state.className = 'att-chip ' + (drafts ? 'ok' : 'muted-chip');
    summary.innerHTML = `
      <div><span>Offizielle Spiele</span><strong>${games.length}</strong></div>
      <div><span>Letztes Saisonspiel</span><strong>${escapeHTML(formatDate(games.at(-1).date))}</strong></div>
      <div><span>Trainingstermine</span><strong>${slots.length}</strong></div>
      <div><span>Geschützte Einheiten</span><strong>${protectedCount}</strong></div>`;
  }

  function setupSeasonPlanner(root) {
    const saved = BT.storage.getSetting('seasonCoachInput', {
      goal: '',
      focus: 'Horns, 5-Out, No-Middle Defense, Helpside-Kommunikation, Rebounding und Transition',
      problems: '', roster: ''
    });
    $('[data-role="season-goal"]', root).value = saved.goal || '';
    $('[data-role="season-focus"]', root).value = saved.focus || '';
    $('[data-role="season-problems"]', root).value = saved.problems || '';
    $('[data-role="season-roster"]', root).value = saved.roster || '';
    renderSeasonSummary(root);

    $('[data-action="preview-season"]', root).addEventListener('click', async event => {
      const button = event.currentTarget;
      const status = $('[data-role="season-ai-status"]', root);
      button.disabled = true;
      try {
        if (BT.api.getToken()) {
          status.textContent = 'Offizieller Spielplan wird aktualisiert …';
          const result = await BT.api.syncWebsiteGames(BT.seasonplanner.scheduleConfig());
          result.games.forEach(game => BT.storage.upsertGame(game));
          BT.seasonplanner.saveScheduleConfig({ teamId: result.team.id, teamName: result.team.name });
        }
        const slots = plannerSlots();
        if (!slots.length) throw new Error('Es konnten keine Trainingstermine bis zum letzten Saisonspiel berechnet werden.');
        renderSeasonSummary(root);
        status.textContent = slots.length + ' Termine geprüft. Bayerische Schulferien, Feiertage und Spieltage werden ausgelassen.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    $('[data-action="generate-season"]', root).addEventListener('click', async event => {
      const button = event.currentTarget;
      const status = $('[data-role="season-ai-status"]', root);
      if (!BT.api.getToken()) {
        if (confirm('Für die geschützte KI-Saisonplanung ist eine Anmeldung nötig. Jetzt Konto & Sync öffnen?')) location.hash = '#/account';
        return;
      }
      button.disabled = true;
      BT.wake.acquire('season-ai-plan');
      try {
        const preferences = seasonCoachInput(root);
        BT.storage.setSetting('seasonCoachInput', preferences);
        status.textContent = 'Offizieller Herren-Spielplan wird synchronisiert …';
        const synced = await BT.api.syncWebsiteGames(BT.seasonplanner.scheduleConfig());
        synced.games.forEach(game => BT.storage.upsertGame(game));
        BT.seasonplanner.saveScheduleConfig({ teamId: synced.team.id, teamName: synced.team.name });
        const slots = plannerSlots();
        if (!slots.length) throw new Error('Keine regulären Trainingstermine bis zum letzten Saisonspiel gefunden.');
        if (!confirm(slots.length + ' Trainings bis ' + formatDate(slots.at(-1).date) + ' durch die KI planen?\n\nManuelle und absolvierte Einheiten bleiben unverändert.')) {
          status.textContent = 'Saisonplanung abgebrochen.';
          return;
        }
        const payload = BT.seasonplanner.buildAIPayload(slots, preferences);
        const result = await BT.seasonplanner.planInBatches(
          payload,
          data => BT.api.ai('planSeason', { data }),
          (current, total) => { status.textContent = 'KI plant Block ' + current + ' von ' + total + ' …'; }
        );
        const applied = BT.seasonplanner.applyAIPlan(result, slots);
        renderSeasonSummary(root);
        renderUpcoming(root);
        status.textContent = 'Saisonplanung erstellt: ' + applied.created + ' neu, ' + applied.updated + ' aktualisiert, ' + applied.protected + ' geschützt' + (applied.missing ? ', ' + applied.missing + ' KI-Antworten fehlten' : '') + '.';
      } catch (error) {
        console.error(error);
        status.textContent = 'KI-Saisonplanung fehlgeschlagen: ' + error.message;
      } finally {
        BT.wake.release('season-ai-plan');
        button.disabled = false;
      }
    });
  }

  function setupAIImport(root) {
    const status = $('[data-role="ai-status"]', root);
    if (!BT.api.getToken()) status.textContent = 'Für den KI-Import bitte zuerst unter „Konto & Sync“ anmelden.';

    $('[data-action="upload-pdf"]', root).addEventListener('click', async () => {
      if (!BT.api.getToken()) {
        if (confirm('Für den geschützten KI-Import ist eine Anmeldung nötig. Jetzt Konto & Sync öffnen?')) location.hash = '#/account';
        return;
      }
      const file = await BT.util.pickFile('application/pdf,.pdf');
      if (!file) return;

      status.textContent = '⏳ Plan wird analysiert (kann 10-60 Sekunden dauern) ...';
      BT.wake.acquire('schedule-pdf');
      try {
        const parsed = await BT.aiimport.parseWithGemini(file, null, (msg) => {
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
      } finally {
        BT.wake.release('schedule-pdf');
      }
    });
  }

  function renderUpcoming(root) {
    const list = $('[data-role="upcoming"]', root);
    const empty = $('[data-role="upcoming-empty"]', root);
    list.innerHTML = '';

    const days = BT.storage.getSetting('regularDays', ['tue', 'fri']);
    const time = BT.storage.getSetting('regularTime', '20:15');
    const lookahead = BT.storage.getSetting('regularLookahead', 6);

    if (!Array.isArray(days) || days.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    const now = new Date();
    const upcoming = upcomingDates(days, time, lookahead, now);

    const trainings = BT.storage.getTrainings();

    for (const d of upcoming) {
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
            attendance: BT.storage.attendanceForActivePlayers(iso),
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
          const snapshot = BT.storage.getTraining(id);
          if (!snapshot) return;
          BT.storage.deleteTraining(id);
          renderUpcoming(root);
          BT.util.toastUndo('Training vom ' + BT.util.formatDate(dateStr) + ' gelöscht', () => {
            BT.storage.restoreTraining(snapshot);
            renderUpcoming(root);
          });
        });
      }
      list.appendChild(li);
    }
  }

  function upcomingDates(days, time, lookahead, now) {
    const dayNums = days.map(k => (DAYS.find(d => d.key === k) || {}).num).filter(n => n !== undefined);
    const [hh, mm] = String(time || '20:15').split(':').map(x => parseInt(x, 10));
    const start = now || new Date();
    const result = [];
    for (let i = 0; i < 180 && result.length < lookahead; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(hh || 20, mm || 15, 0, 0);
      if (dayNums.includes(d.getDay()) && d > start) result.push(d);
    }
    return result;
  }

  function icsDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function icsEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function exportCalendar() {
    const days = BT.storage.getSetting('regularDays', []);
    if (!Array.isArray(days) || !days.length) {
      BT.util.toast('Bitte zuerst reguläre Trainingstage auswählen.');
      return;
    }
    const time = BT.storage.getSetting('regularTime', '20:15');
    const lookahead = Math.max(6, BT.storage.getSetting('regularLookahead', 6));
    const dates = upcomingDates(days, time, lookahead, new Date());
    const trainings = BT.storage.getTrainings();
    const duration = Math.max(15, BT.storage.getSetting('trainingDurationMinutes', 105));
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CourtHub//TSV Lindau Basketball//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    dates.forEach(start => {
      const iso = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
      const training = trainings.find(item => item.date === iso) || {};
      const end = new Date(start.getTime() + duration * 60000);
      const summary = training.plan && training.plan.summary ? training.plan.summary : training.note || 'Teamtraining';
      lines.push('BEGIN:VEVENT', 'UID:' + icsEscape(training.id || iso + '-' + time) + '@tsv-lindau.de', 'DTSTAMP:' + icsDate(new Date()), 'DTSTART:' + icsDate(start), 'DTEND:' + icsDate(end), 'SUMMARY:' + icsEscape('TSV Lindau Basketball – ' + summary), 'DESCRIPTION:' + icsEscape(training.note || 'Training des TSV Lindau Basketball'), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    BT.util.downloadBlob('tsv-lindau-trainings.ics', new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    BT.util.toast(dates.length + ' Termine als Kalender exportiert.');
  }

  return { render };
})();
