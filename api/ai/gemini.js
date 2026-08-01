import { query } from '../_lib/db.js';
import { requireMembership } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

const PLAN_PROMPT = `Du bekommst einen Basketball-Trainingsplan als PDF. Trainings finden Dienstag und Freitag jeweils 20:15-22:00 Uhr statt.
Gib ausschließlich valides JSON zurück:
{
  "phase": { "name": "Phase X", "focus": "Fokus", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "goals": ["Ziel"] },
  "trainings": [{
    "weekday": "tuesday oder friday",
    "date": "YYYY-MM-DD oder null",
    "summary": "maximal 200 Zeichen",
    "freethrows": { "attempted": 20 },
    "shots": [{ "category": "Kategorie", "attempted": 20 }],
    "drills": [{ "name": "Drill", "minutes": 10, "description": "kurz" }]
  }]
}
Das phase-Objekt ist Pflicht. Unklare Werte werden null. Behalte deutsche Begriffe bei.`;

const SUMMARY_PROMPT = `Du bist Basketball-Co-Trainer. Schreibe aus den gelieferten Trainingsdaten eine kurze, spieler- und elterntaugliche Zusammenfassung auf Deutsch.
Verwende 3 bis 4 konkrete Sätze in der Wir-/Ihr-Form. Nenne höchstens zwei herausragende Spieler. Erwähne einen Vergleichstrend, wenn Vortrainingsdaten vorhanden sind. Gib nur den fertigen Text zurück.`;

const TACTIC_PROMPT = `Du bist Basketball-Co-Trainer. Erkläre den gelieferten Spielzug für U14- bis Herren-Spieler in 5 bis 8 kurzen deutschen Sätzen.
Nenne Ziel, Rollen der Spieler 1 bis 5, Coaching-Punkte und die wahrscheinlichste Defense-Reaktion mit passender Antwort. Gib nur den fertigen Erklärungstext zurück.`;

const SEASON_PLAN_PROMPT = `Du bist Assistenztrainer einer Herren-Basketballmannschaft und erstellst veränderbare Trainingsentwürfe für eine vollständige Saison.
Die Termine, Spielabstände und Belastungsstufen wurden bereits regelbasiert festgelegt. Ändere keine Termine und beachte die Belastungsstufe jedes Slots.
Nutze die Coach-Eingaben, die Probleme aus den letzten Spielen und abgeschlossenen Trainings sowie die vorgegebenen Spielprinzipien.

Regeln:
- Erzeuge für jeden gelieferten Slot genau einen Eintrag mit demselben Datum.
- Die Summe der Drill-Minuten soll der angegebenen Trainingsdauer entsprechen.
- Jede Einheit enthält Warm-up, einen klaren Hauptschwerpunkt, spielnahe Anwendung und strukturiertes 5-gegen-5 am Ende.
- Dienstag ist der Haupttrainingstag. Neue Systeme, die wichtigsten Lerninhalte und die höchste Wochenbelastung gehören grundsätzlich in die Dienstagseinheit.
- Freitag dient der Festigung und Spielvorbereitung. Erzeuge für jeden Freitag zusätzlich zwei vollständige Drillvarianten: bei mehr als 8 Spielern mit Teamtaktik, Transition, 4-gegen-4/5-gegen-5 und Situation Play; bei 8 oder weniger Spielern mit Individualtechnik, Würfen, Entscheidungen sowie 1-gegen-1/2-gegen-2/3-gegen-3. Beide Varianten müssen zur Belastungsvorgabe und Trainingsdauer passen.
- low: Regeneration, Technik, Aktivierung, keine unnötige Ermüdung.
- medium: kontrollierte Belastung, taktische Qualität und spielnahe Wiederholungen.
- high: Hauptbelastung, intensive Entscheidungen, Defense, Rebounding oder Transition.
- Coaching-Punkte müssen konkret sein. Keine medizinischen Diagnosen.

Gib ausschließlich valides JSON zurück:
{
  "trainings": [{
    "date": "YYYY-MM-DD",
    "summary": "kurzer konkreter Schwerpunkt",
    "freethrows": { "attempted": 20 },
    "shots": [{ "category": "Wurfkategorie", "attempted": 20 }],
    "drills": [{ "name": "Drill", "minutes": 10, "intensity": "low|medium|high", "description": "Ablauf und Coaching-Punkte" }],
    "fridayVariants": {
      "over8": [{ "name": "Teamdrill", "minutes": 10, "intensity": "medium", "description": "Ablauf" }],
      "eightOrLess": [{ "name": "Small-Sided Drill", "minutes": 10, "intensity": "medium", "description": "Ablauf" }]
    }
  }]
}`;

async function rateLimit(userId, action) {
  const configured = Number.parseInt(process.env.AI_RATE_LIMIT || '30', 10);
  const limit = Number.isFinite(configured) && configured > 0 ? configured : 30;
  const { rows } = await query(
    `INSERT INTO ai_rate_limit (user_id, action, window_start, count)
     VALUES ($1, $2, now(), 1)
     ON CONFLICT (user_id, action)
     DO UPDATE SET
       count = CASE
         WHEN ai_rate_limit.window_start < now() - interval '1 hour' THEN 1
         ELSE ai_rate_limit.count + 1
       END,
       window_start = CASE
         WHEN ai_rate_limit.window_start < now() - interval '1 hour' THEN now()
         ELSE ai_rate_limit.window_start
       END
     RETURNING count, window_start`,
    [userId, action]
  );
  return { allowed: rows[0].count <= limit, limit };
}

function buildRequest(action, payload) {
  if (action === 'parsePlan') {
    const fileBase64 = String(payload.fileBase64 || '');
    if (!fileBase64 || fileBase64.length > 4_000_000) throw Object.assign(new Error('PDF fehlt oder ist größer als 3 MB.'), { status: 413 });
    return {
      parts: [
        { inline_data: { mime_type: payload.mimeType || 'application/pdf', data: fileBase64 } },
        { text: PLAN_PROMPT }
      ],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
      json: true
    };
  }
  if (action === 'summarizeTraining') {
    return {
      parts: [{ text: SUMMARY_PROMPT + '\n\nTrainingsdaten:\n' + JSON.stringify(payload.data || {}) }],
      generationConfig: { temperature: 0.55 },
      json: false
    };
  }
  if (action === 'explainTactic') {
    const description = String(payload.description || '').slice(0, 20_000);
    if (!description) throw Object.assign(new Error('Spielzugdaten fehlen.'), { status: 400 });
    return {
      parts: [{ text: TACTIC_PROMPT + '\n\nSpielzug:\n' + description }],
      generationConfig: { temperature: 0.45 },
      json: false
    };
  }
  if (action === 'planSeason') {
    const data = payload.data || {};
    if (!Array.isArray(data.slots) || !data.slots.length || data.slots.length > 120) {
      throw Object.assign(new Error('Für die Saisonplanung fehlen gültige Trainingstermine.'), { status: 400 });
    }
    const serialized = JSON.stringify(data);
    if (serialized.length > 250_000) throw Object.assign(new Error('Die Saisonplanungsdaten sind zu umfangreich.'), { status: 413 });
    return {
      parts: [{ text: SEASON_PLAN_PROMPT + '\n\nPlanungsdaten:\n' + serialized }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.25, maxOutputTokens: 32768 },
      json: true
    };
  }
  throw Object.assign(new Error('Unbekannte KI-Aktion.'), { status: 400 });
}

async function callModel(apiKey, model, request) {
  const response = await fetch(ENDPOINT + model + ':generateContent?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: request.parts }],
      generationConfig: request.generationConfig
    })
  });
  if (!response.ok) {
    const error = new Error('Gemini ist derzeit nicht verfügbar.');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini hat leer geantwortet.');
  return text.trim();
}

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['POST'])) return;

  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Serverseitige KI ist noch nicht konfiguriert.' });

    const action = String(req.body?.action || '');
    const request = buildRequest(action, req.body?.payload || {});
    const usage = await rateLimit(auth.sub, action);
    if (!usage.allowed) return res.status(429).json({ error: 'KI-Limit erreicht. Bitte später erneut versuchen.', limit: usage.limit });

    let lastError = null;
    for (const model of MODELS) {
      try {
        const text = await callModel(process.env.GEMINI_API_KEY, model, request);
        if (!request.json) return res.status(200).json({ text, model });
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.trainings)) return res.status(502).json({ error: 'KI-Antwort enthält keine Trainingsliste.' });
        return res.status(200).json({ data: parsed, model });
      } catch (error) {
        lastError = error;
        if (![404, 429, 500, 503].includes(error.status)) break;
      }
    }
    throw lastError || new Error('Alle KI-Modelle sind fehlgeschlagen.');
  } catch (error) {
    if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message });
    return safeError('gemini', error, res, 'KI-Anfrage fehlgeschlagen.');
  }
}
