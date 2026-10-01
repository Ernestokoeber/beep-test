import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
const window = dom.window;
window.eval(readFileSync(new URL('../js/ai-core.js', import.meta.url), 'utf8'));

const players = [
  { id: 'p1', name: 'Max Muster' },
  { id: 'p2', name: 'Alex Beispiel' }
];
const current = {
  id: 'current',
  date: '2026-10-01',
  attendance: [{ playerId: 'p1', status: 'present' }, { playerId: 'p2', status: 'excused' }],
  freethrows: [{ playerId: 'p1', made: 5, attempted: 7 }],
  shots: [{ category: 'Abschluss am Ring', entries: [{ playerId: 'p1', made: 8, attempted: 10 }] }],
  plan: { drills: [{ name: 'Shell Drill' }] }
};
const previous = {
  id: 'previous',
  date: '2026-09-29',
  attendance: [{ playerId: 'p1', status: 'present' }],
  freethrows: [{ playerId: 'p1', made: 6, attempted: 10 }],
  shots: []
};

const facts = window.BT.aicore.buildSummaryFacts(current, previous, players).facts;
assert(facts.every((fact) => fact.id && fact.text && Array.isArray(fact.names) && Array.isArray(fact.numbers)), 'Zusammenfassungsfakten sind nicht referenzierbar');
assert(facts.some((fact) => fact.text.includes('71 %')), 'Freiwurf-Fakt fehlt');
assert(facts.some((fact) => fact.names.includes('Max Muster')), 'Spielerleistung ist nicht namentlich belegt');
assert(facts.some((fact) => fact.text.includes('60 %') && fact.text.includes('71 %')), 'Vergleichsfakt fehlt');

const parsed = {
  phase: { name: 'Phase 1', focus: 'Defense', start: '2026-10-01', end: '2026-10-31', goals: ['Kommunikation'] },
  trainings: [
    { date: '2026-10-06', summary: 'Manual darf nicht überschrieben werden', freethrows: { attempted: 20 }, shots: [], drills: [{ name: 'A', minutes: 90, description: 'A' }] },
    { date: '2026-10-09', summary: 'Done darf nicht überschrieben werden', freethrows: { attempted: 20 }, shots: [], drills: [{ name: 'B', minutes: 90, description: 'B' }] },
    { date: '2026-10-13', summary: 'Leerer Termin', freethrows: { attempted: 20 }, shots: [{ category: 'Catch-and-Shoot', attempted: 30 }], drills: [{ name: 'C', minutes: 90, description: 'C' }] },
    { date: '2026-10-16', summary: 'Neuer Termin', freethrows: { attempted: 20 }, shots: [], drills: [{ name: 'D', minutes: 90, description: 'D' }] }
  ]
};
const existing = [
  { id: 'manual', date: '2026-10-06', note: 'Coach-Plan', plan: { drills: [] } },
  { id: 'done', date: '2026-10-09', status: 'completed', endedAt: '2026-10-09T22:00:00Z' },
  { id: 'empty', date: '2026-10-13', note: '', attendance: [], freethrows: [], shots: [] }
];
const preview = window.BT.aicore.classifyPdfImport(parsed, existing);
assert(preview.items.find((item) => item.date === '2026-10-06').action === 'protected', 'Manueller Plan ist nicht geschützt');
assert(preview.items.find((item) => item.date === '2026-10-09').action === 'protected', 'Abgeschlossenes Training ist nicht geschützt');
assert(preview.items.find((item) => item.date === '2026-10-13').action === 'fillable', 'Leerer Termin wird nicht erkannt');
assert(preview.items.find((item) => item.date === '2026-10-16').action === 'new', 'Neuer Termin wird nicht erkannt');
assert(preview.counts.protected === 2 && preview.counts.fillable === 1 && preview.counts.new === 1, 'Vorschau-Zähler sind falsch');

const stored = structuredClone(existing);
let aiPayload = null;
window.BT.api = {
  getToken: () => 'token',
  ai: async (action, payload) => {
    assert(action === 'summarizeTraining', 'Falsche KI-Aktion für Zusammenfassung');
    aiPayload = payload;
    return { text: 'Verifizierte Zusammenfassung.', model: 'gemini-3.8-flash', requestId: 'ai_summary' };
  }
};
window.BT.storage = {
  getPlayers: () => players,
  getTrainings: () => stored,
  getPhases: () => [],
  upsertPhase: (phase) => phase,
  getSetting: (_key, fallback) => fallback,
  getShotCategories: () => [],
  setShotCategories: () => {},
  attendanceForActivePlayers: () => [],
  upsertTraining: (training) => {
    const index = stored.findIndex((item) => item.id === training.id);
    const saved = { ...training, id: training.id || `new-${stored.length}` };
    if (index >= 0) stored[index] = saved;
    else stored.push(saved);
    return saved;
  }
};
window.eval(readFileSync(new URL('../js/aiimport.js', import.meta.url), 'utf8'));

const manualBefore = JSON.stringify(stored.find((item) => item.id === 'manual'));
const results = window.BT.aiimport.applyPlanToTrainings(parsed, preview);
assert(JSON.stringify(stored.find((item) => item.id === 'manual')) === manualBefore, 'Geschütztes Training wurde verändert');
const filled = stored.find((item) => item.id === 'empty');
assert(filled.planning?.source === 'ai-pdf' && filled.status === 'draft' && filled.coachEdited === false, 'Leerer Termin wurde nicht als KI-Entwurf befüllt');
assert(stored.some((item) => item.date === '2026-10-16' && item.planning?.source === 'ai-pdf'), 'Neuer KI-Termin wurde nicht angelegt');
assert(results.filter((item) => item.action === 'protected').length === 2, 'Übersprungene Trainings fehlen im Ergebnis');

const summaryResult = await window.BT.aiimport.summarizeTraining(current, previous, () => {});
assert(summaryResult.text === 'Verifizierte Zusammenfassung.', 'Zusammenfassungstext ging verloren');
assert(summaryResult.model === 'gemini-3.8-flash' && summaryResult.requestId === 'ai_summary', 'Modell oder Request-ID ging verloren');
assert(Array.isArray(aiPayload?.facts) && aiPayload.facts.length === facts.length, 'Deterministische Fakten wurden nicht gesendet');

console.log('CourtHub KI-Abläufe: Fakten und PDF-Schutzregeln erfolgreich.');
