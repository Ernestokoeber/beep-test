window.BT = window.BT || {};

BT.aiimport = (function() {
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = String(result).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function parseWithGemini(file, _legacyApiKey, onProgress) {
    if (!BT.api.getToken()) throw new Error('Bitte zuerst unter „Konto & Sync“ anmelden.');
    if (onProgress) onProgress('PDF wird gelesen …');
    const base64 = await fileToBase64(file);
    const mime = file.type || 'application/pdf';
    const sizeKB = Math.round(base64.length * 0.75 / 1024);
    if (onProgress) onProgress('PDF (' + sizeKB + ' KB) wird geschützt analysiert …');
    const startedAt = Date.now();
    const response = await BT.api.ai('parsePlan', { fileBase64: base64, mimeType: mime });
    const parsed = response.data;
    parsed._meta = {
      model: response.model,
      elapsedSec: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      trainingsFound: parsed.trainings.length
    };
    return parsed;
  }

  function dayKeyToNum(key) {
    const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
    return map[String(key || '').toLowerCase()];
  }

  function nextDateForWeekday(weekday, fromDate) {
    const target = dayKeyToNum(weekday);
    if (target === undefined) return null;
    const d = new Date(fromDate);
    for (let i = 0; i < 14; i++) {
      const candidate = new Date(d);
      candidate.setDate(d.getDate() + i);
      if (candidate.getDay() === target) return candidate;
    }
    return null;
  }

  function isoDate(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function applyPhase(parsed) {
    if (!parsed.phase || !parsed.phase.name) return null;
    const p = parsed.phase;
    const existing = BT.storage.getPhases().find(ph =>
      ph.name === p.name || (p.start && ph.start === p.start)
    );
    return BT.storage.upsertPhase({
      id: existing ? existing.id : undefined,
      name: p.name || '',
      focus: p.focus || '',
      start: p.start || null,
      end: p.end || null,
      goals: Array.isArray(p.goals) ? p.goals : []
    });
  }

  function applyPlanToTrainings(parsed) {
    applyPhase(parsed);
    const time = BT.storage.getSetting('regularTime', '20:15');
    const trainings = BT.storage.getTrainings();
    const usedDates = new Set();
    const results = [];
    let cursor = new Date();

    for (const planEntry of parsed.trainings) {
      let targetDate;
      if (planEntry.date) targetDate = planEntry.date;
      else {
        const d = nextDateForWeekday(planEntry.weekday, cursor);
        if (!d) continue;
        targetDate = isoDate(d);
        cursor = new Date(d);
        cursor.setDate(cursor.getDate() + 1);
      }
      while (usedDates.has(targetDate)) {
        const d = new Date(targetDate);
        d.setDate(d.getDate() + 7);
        targetDate = isoDate(d);
      }
      usedDates.add(targetDate);

      const shots = (planEntry.shots || []).filter(s => s.category && (s.attempted || 0) > 0);
      const ftAtt = planEntry.freethrows && planEntry.freethrows.attempted ? planEntry.freethrows.attempted : 0;
      const drills = (planEntry.drills || []).filter(d => d.name);

      const planObj = {
        summary: planEntry.summary || '',
        freethrows: ftAtt > 0 ? { attempted: ftAtt } : null,
        shots: shots.map(s => ({ category: s.category, attempted: s.attempted })),
        drills: drills.map(d => ({ name: d.name, minutes: d.minutes || null, description: d.description || '' }))
      };

      let existing = trainings.find(t => t.date === targetDate);
      if (existing) {
        existing.plan = planObj;
        if (!existing.note && planObj.summary) existing.note = planObj.summary;
        existing.shots = existing.shots || [];
        for (const s of planObj.shots) {
          if (!existing.shots.find(x => x.category === s.category)) {
            existing.shots.push({ category: s.category, entries: [] });
          }
        }
        BT.storage.upsertTraining(existing);
        results.push({ date: targetDate, action: 'updated', id: existing.id });
      } else {
        const created = BT.storage.upsertTraining({
          date: targetDate,
          startTime: time,
          note: planObj.summary || '',
          plan: planObj,
          attendance: BT.storage.attendanceForActivePlayers(targetDate),
          freethrows: [],
          shots: planObj.shots.map(s => ({ category: s.category, entries: [] }))
        });
        results.push({ date: targetDate, action: 'created', id: created.id });
      }

      const globalCats = BT.storage.getShotCategories();
      let changed = false;
      for (const s of planObj.shots) {
        if (!globalCats.includes(s.category)) { globalCats.push(s.category); changed = true; }
      }
      if (changed) BT.storage.setShotCategories(globalCats);
    }

    return results;
  }

  const SUMMARY_PROMPT = `Du bist Basketball-Co-Trainer und schreibst eine kurze, eltern- und spielertaugliche Trainingszusammenfassung.

Stil: 3–4 Sätze, freundlich, konkret, auf Deutsch, in 2. Person Plural („wir" / „ihr"). Keine Floskeln, keine Einleitung („Hier ist …"). Nenne Namen nur bei herausragenden Leistungen (Top 1–2). Wenn Vergleichsdaten vom vorherigen Training vorhanden sind, erwähne 1 Trend (z.B. „Freiwurfquote von 62 % auf 71 %").

Daten (JSON) über das aktuelle und — falls vorhanden — das vorige Training folgen. Gib NUR den fertigen Text zurück, ohne Markdown, ohne Anführungszeichen.`;

  function buildSummaryData(training, previous, playerLookup) {
    function summarizeAttendance(t) {
      const a = { present: 0, absent: 0, excused: 0, injured: 0, late: 0, open: 0 };
      for (const x of (t.attendance || [])) {
        if (!x.status) { a.open++; continue; }
        if (a[x.status] !== undefined) a[x.status]++;
        if (x.late) a.late++;
      }
      return a;
    }
    function teamFT(t) {
      let made = 0, att = 0;
      for (const e of (t.freethrows || [])) { made += e.made || 0; att += e.attempted || 0; }
      return { made, attempted: att, pct: att ? Math.round((made / att) * 100) : null };
    }
    function teamShots(t) {
      const out = [];
      for (const c of (t.shots || [])) {
        let m = 0, a = 0;
        for (const e of (c.entries || [])) { m += e.made || 0; a += e.attempted || 0; }
        if (a > 0) out.push({ category: c.category, made: m, attempted: a, pct: Math.round((m / a) * 100) });
      }
      return out;
    }
    function topFTPlayers(t, n) {
      const rows = (t.freethrows || [])
        .filter(e => (e.attempted || 0) >= 3)
        .map(e => ({
          name: (playerLookup(e.playerId) || {}).name || '?',
          made: e.made || 0, attempted: e.attempted || 0,
          pct: e.attempted ? Math.round((e.made / e.attempted) * 100) : 0
        }))
        .sort((a, b) => b.pct - a.pct || b.attempted - a.attempted);
      return rows.slice(0, n || 2);
    }

    const pack = (t) => {
      if (!t) return null;
      return {
        date: t.date,
        note: t.note || null,
        attendance: summarizeAttendance(t),
        freethrows: teamFT(t),
        topFT: topFTPlayers(t, 2),
        shotsByCategory: teamShots(t),
        drills: (t.plan && t.plan.drills ? t.plan.drills.map(d => d.name) : []).slice(0, 6)
      };
    };

    return {
      current: pack(training),
      previous: pack(previous)
    };
  }

  async function summarizeTraining(training, previous, _legacyApiKey, onProgress) {
    if (!BT.api.getToken()) throw new Error('Bitte zuerst unter „Konto & Sync“ anmelden.');
    const players = BT.storage.getPlayers();
    const lookup = (id) => players.find(p => p.id === id);
    const data = buildSummaryData(training, previous, lookup);
    if (onProgress) onProgress('Trainingsdaten werden geschützt ausgewertet …');
    const response = await BT.api.ai('summarizeTraining', { data });
    return response.text;
  }

  const TACTIC_PROMPT = `Du bist Basketball-Co-Trainer. Erkläre den folgenden Spielzug für U14-U18-Spieler in 5-8 knappen, konkreten Sätzen auf Deutsch.

Nenne:
- Ziel des Plays (Wurf, freier Schütze, Mismatch, o.ä.)
- Rolle jedes beteiligten Spielers (mit seiner Nummer 1-5)
- 1-2 Coaching-Points (Timing, Winkel, Fußarbeit)
- Typische Defense-Reaktion und was man dann tun sollte

Das Halbfeld hat Koordinaten 10-490 (horizontal) × 10-460 (vertikal, niedriger Wert = Korb oben).
Korb bei (250, 50), Freiwurflinie bei y≈200, 3er-Bogen etwa bei y=135 (Ecken bei x=50/450).
Spieler-Label 1-5 entspricht 1=Point Guard, 2=Shooting Guard, 3=Small Forward, 4=Power Forward, 5=Center.

Pfeile mit Stil 'run' = Laufweg, Stil 'pass' = Passweg.

Gib NUR den fertigen Erklärungstext zurück — keine Markdown-Überschriften, keine Codeblöcke, keine Anführungszeichen drumherum.`;

  function describeTactic(board) {
    const lines = [];
    (board.steps || []).forEach((s, i) => {
      lines.push('[Schritt ' + (i + 1) + ' — Dauer ' + (s.duration || 1.5) + 's]');
      (s.players || []).forEach(p => {
        lines.push('  Spieler ' + p.label + ' bei (' + Math.round(p.x) + ', ' + Math.round(p.y) + ')');
      });
      if (s.ball) lines.push('  Ball bei (' + Math.round(s.ball.x) + ', ' + Math.round(s.ball.y) + ')');
      (s.arrows || []).forEach(a => {
        lines.push('  ' + (a.style === 'pass' ? 'Pass' : 'Laufweg') + ': (' + Math.round(a.x1) + ',' + Math.round(a.y1) + ') → (' + Math.round(a.x2) + ',' + Math.round(a.y2) + ')');
      });
      (s.texts || []).forEach(t => {
        lines.push('  Text bei (' + Math.round(t.x) + ',' + Math.round(t.y) + '): "' + t.text + '"');
      });
    });
    return lines.join('\n');
  }

  async function explainTactic(board, _legacyApiKey, onProgress) {
    if (!BT.api.getToken()) throw new Error('Bitte zuerst unter „Konto & Sync“ anmelden.');
    const description = describeTactic(board);
    if (onProgress) onProgress('Spielzug wird geschützt analysiert …');
    const response = await BT.api.ai('explainTactic', { description });
    return response.text;
  }

  return { parseWithGemini, applyPlanToTrainings, summarizeTraining, explainTactic };
})();
