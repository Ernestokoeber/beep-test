window.BT = window.BT || {};

BT.aiimport = (function() {
  const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-pro'];
  const BASE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  const PROMPT = `Du bekommst einen Basketball-Trainingsplan als PDF.
Trainings finden Dienstag und Freitag jeweils 20:15-22:00 Uhr statt.

Extrahiere alle einzelnen Trainings aus dem Plan und gib NUR valides JSON zurück (keine Markdown-Codeblöcke), mit dieser Struktur:

{
  "trainings": [
    {
      "weekday": "tuesday" oder "friday",
      "date": "YYYY-MM-DD" wenn ein konkretes Datum erkennbar ist, sonst null,
      "summary": "Kurze Zusammenfassung des Trainings, max. 200 Zeichen",
      "freethrows": { "attempted": Anzahl Würfe pro Spieler } oder null,
      "shots": [
        { "category": "Kategorie-Name (z.B. Layup, Mitteldistanz, 3er)", "attempted": Anzahl pro Spieler }
      ],
      "drills": [
        { "name": "Drill-Name", "minutes": Dauer in Minuten oder null, "description": "Kurze Beschreibung" }
      ]
    }
  ]
}

Hinweise:
- Wenn der Plan z.B. "Freiwürfe 20 Stk" sagt, setze freethrows.attempted = 20.
- Wenn Übungen Zeitangaben haben (z.B. "10 min Aufwärmen"), trag das in drills.minutes ein.
- Lass leere oder unklare Felder weg oder setze sie auf null.
- Übersetze nichts, behalte deutsche Begriffe bei.`;

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

  async function callOnce(model, apiKey, base64, mimeType, onProgress) {
    const body = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType || 'application/pdf', data: base64 } },
          { text: PROMPT }
        ]
      }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1
      }
    };
    const url = BASE_ENDPOINT + model + ':generateContent?key=' + encodeURIComponent(apiKey);
    console.log('[Gemini] POST', model, '— PDF', Math.round(base64.length * 0.75 / 1024), 'KB');
    const t0 = Date.now();

    const ticker = startTicker((sec) => {
      if (onProgress) onProgress(model + ' wartet auf Antwort … ' + sec + 's');
    });

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } finally {
      stopTicker(ticker);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('[Gemini] Antwort nach', elapsed + 's', 'Status:', res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Gemini] Fehler-Body:', errText);
      const err = new Error('HTTP ' + res.status + ': ' + errText.slice(0, 300));
      err.status = res.status;
      throw err;
    }
    if (onProgress) onProgress(model + ' antwortet (' + elapsed + 's), wird geparst …');
    const data = await res.json();
    console.log('[Gemini] Roh-Antwort:', data);
    const text = data && data.candidates && data.candidates[0]
      && data.candidates[0].content && data.candidates[0].content.parts
      && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!text) throw new Error('Leere Antwort.');
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { throw new Error('Antwort war kein gültiges JSON: ' + text.slice(0, 200)); }
    if (!parsed.trainings || !Array.isArray(parsed.trainings)) {
      throw new Error('Antwort enthält keine "trainings"-Liste.');
    }
    parsed._meta = { model, elapsedSec: parseFloat(elapsed), trainingsFound: parsed.trainings.length };
    return parsed;
  }

  function startTicker(callback) {
    const startTs = Date.now();
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - startTs) / 1000);
      callback(sec);
    }, 500);
    callback(0);
    return id;
  }

  function stopTicker(id) { clearInterval(id); }

  async function parseWithGemini(file, apiKey, onProgress) {
    if (!apiKey) throw new Error('Bitte zuerst den Gemini API Key eintragen.');
    if (onProgress) onProgress('PDF wird gelesen …');
    const base64 = await fileToBase64(file);
    const mime = file.type || 'application/pdf';
    const sizeKB = Math.round(base64.length * 0.75 / 1024);
    console.log('[Gemini] PDF geladen:', file.name, sizeKB + ' KB, MIME:', mime);
    if (onProgress) onProgress('PDF (' + sizeKB + ' KB) wird gesendet …');

    let lastErr = null;
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (onProgress) onProgress(model + ' — Versuch ' + attempt + '/' + maxAttempts + ' …');
          const result = await callOnce(model, apiKey, base64, mime, onProgress);
          console.log('[Gemini] Erfolg mit', model, '— ' + result._meta.trainingsFound + ' Trainings, ' + result._meta.elapsedSec + 's');
          return result;
        } catch (e) {
          lastErr = e;
          console.warn('[Gemini]', model, 'Versuch', attempt, 'fehlgeschlagen:', e.message);
          const transient = e.status === 503 || e.status === 429 || e.status === 500;
          const notFound = e.status === 404;
          if (notFound) {
            if (onProgress) onProgress(model + ' nicht verfügbar, wechsle …');
            break;
          }
          if (!transient || attempt === maxAttempts) {
            if (i < MODELS.length - 1) {
              if (onProgress) onProgress(model + ' nicht erreichbar, wechsle zum nächsten …');
              break;
            }
            throw e;
          }
          const wait = 1500 * Math.pow(2, attempt - 1);
          if (onProgress) onProgress(model + ' überlastet (Status ' + (e.status || '?') + '), warte ' + Math.round(wait / 1000) + 's …');
          await sleep(wait);
        }
      }
    }
    throw lastErr || new Error('Alle Modelle fehlgeschlagen.');
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

  function applyPlanToTrainings(parsed) {
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
          attendance: BT.storage.getPlayers().filter(p => !p.archived).map(p => ({ playerId: p.id, status: null, late: false, note: '' })),
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

  async function callGeminiText(apiKey, payloadText, onProgress) {
    const body = {
      contents: [{ parts: [{ text: SUMMARY_PROMPT + '\n\n' + payloadText }] }],
      generationConfig: { temperature: 0.6 }
    };
    let lastErr = null;
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      const url = BASE_ENDPOINT + model + ':generateContent?key=' + encodeURIComponent(apiKey);
      if (onProgress) onProgress(model + ' fragt Gemini …');
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const errText = await res.text();
          const err = new Error('HTTP ' + res.status + ': ' + errText.slice(0, 200));
          err.status = res.status;
          if (res.status === 404 || res.status === 503 || res.status === 429) {
            lastErr = err;
            continue;
          }
          throw err;
        }
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0]
          && data.candidates[0].content && data.candidates[0].content.parts
          && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!text) throw new Error('Leere Antwort.');
        return text.trim();
      } catch (e) {
        lastErr = e;
        if (i === MODELS.length - 1) throw e;
      }
    }
    throw lastErr || new Error('Alle Modelle fehlgeschlagen.');
  }

  async function summarizeTraining(training, previous, apiKey, onProgress) {
    if (!apiKey) throw new Error('Bitte zuerst den Gemini API Key im „Plan"-Reiter eintragen.');
    const players = BT.storage.getPlayers();
    const lookup = (id) => players.find(p => p.id === id);
    const data = buildSummaryData(training, previous, lookup);
    const payloadText = 'Trainingsdaten:\n' + JSON.stringify(data, null, 2);
    return callGeminiText(apiKey, payloadText, onProgress);
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

  async function explainTactic(board, apiKey, onProgress) {
    if (!apiKey) throw new Error('Bitte zuerst den Gemini API Key im „Plan"-Reiter eintragen.');
    const description = describeTactic(board);
    const body = {
      contents: [{ parts: [{ text: TACTIC_PROMPT + '\n\nSpielzug:\n' + description }] }],
      generationConfig: { temperature: 0.5 }
    };
    let lastErr = null;
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      const url = BASE_ENDPOINT + model + ':generateContent?key=' + encodeURIComponent(apiKey);
      if (onProgress) onProgress(model + ' analysiert Spielzug …');
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const errText = await res.text();
          const err = new Error('HTTP ' + res.status + ': ' + errText.slice(0, 200));
          err.status = res.status;
          if (res.status === 404 || res.status === 503 || res.status === 429) {
            lastErr = err;
            continue;
          }
          throw err;
        }
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0]
          && data.candidates[0].content && data.candidates[0].content.parts
          && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!text) throw new Error('Leere Antwort.');
        return text.trim();
      } catch (e) {
        lastErr = e;
        if (i === MODELS.length - 1) throw e;
      }
    }
    throw lastErr || new Error('Alle Modelle fehlgeschlagen.');
  }

  return { parseWithGemini, applyPlanToTrainings, summarizeTraining, explainTactic };
})();
