import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { AIError, buildAIRequest } from '../api/_lib/ai-contracts.js';

function expectAIError(run, code, message) {
  try {
    run();
  } catch (error) {
    assert(error instanceof AIError, `${message}: kein AIError`);
    assert.equal(error.code, code, `${message}: falscher Fehlercode`);
    return error;
  }
  throw new Error(`${message}: Anfrage blieb erfolgreich`);
}

const payload = {
  fileBase64: 'JVBERi0xLjQK',
  mimeType: 'application/pdf',
  game: { date: '2026-10-10', opponent: 'BG Illertal 3' },
  knownPlayerNames: ['Dhruva', 'Dennis']
};
const request = buildAIRequest('parsePlayerDevelopmentPdf', payload);
const prompt = request.parts.map(part => part.text || '').join('\n');
assert.equal(request.timeoutMs, 48_000);
assert.equal(request.generationConfig.responseMimeType, 'application/json');
assert.equal(request.generationConfig.thinkingConfig.thinkingLevel, 'low');
assert(/medizinische\w* Diagnos/i.test(prompt) && prompt.includes('keine Spieler-ID'), 'Prompt verbietet Diagnosen oder erfundene IDs nicht ausdrücklich');
assert(prompt.includes('BG Illertal 3') && prompt.includes('Dhruva'), 'Spiel- oder Kaderkontext fehlt im Prompt');

const candidate = {
  playerName: 'Dhruva',
  category: 'decision',
  skillKey: 'turnover-control',
  kind: 'development',
  observation: 'Unter Druck wird der Pass zu früh erzwungen.',
  evidenceExcerpt: 'Dritter Ballverlust gegen Druck.',
  sourcePage: 2,
  suggestedPriority: 4,
  drillTags: ['passing', 'pressure'],
  roleRelevant: true
};
const validResponse = { sourceLabel: 'Spielerbewertung BG Illertal 3', candidates: [candidate], warnings: [] };
const parsed = request.parse(JSON.stringify(validResponse));
assert.equal(parsed.contractVersion, 'player-development-import.v1');
assert.deepEqual(Object.keys(parsed.candidates[0]), Object.keys(candidate), 'Der Vertrag ergänzt oder behält unerlaubte Kandidatenfelder');
assert.equal(parsed.candidates[0].skillKey, 'turnover-control');

for (const [label, mutate] of [
  ['unbekannte Taxonomie', value => { value.candidates[0].skillKey = 'frei-erfunden'; }],
  ['Priorität außerhalb des Bereichs', value => { value.candidates[0].suggestedPriority = 6; }],
  ['überlanger Beleg', value => { value.candidates[0].evidenceExcerpt = 'x'.repeat(401); }],
  ['leerer Spielername', value => { value.candidates[0].playerName = ' '; }],
  ['erfundene Spieler-ID', value => { value.candidates[0].playerId = 'p_erfunden'; }],
  ['medizinische Diagnose', value => { value.candidates[0].observation = 'Meniskusriss bestätigt'; }]
]) {
  const invalid = structuredClone(validResponse);
  mutate(invalid);
  expectAIError(() => request.parse(JSON.stringify(invalid)), 'AI_INVALID_RESPONSE', label);
}

expectAIError(
  () => buildAIRequest('parsePlayerDevelopmentPdf', { ...payload, mimeType: 'text/plain' }),
  'AI_INPUT_INVALID',
  'Falscher MIME-Typ'
);
expectAIError(
  () => buildAIRequest('parsePlayerDevelopmentPdf', { ...payload, fileBase64: 'A'.repeat(4_300_000) }),
  'AI_INPUT_INVALID',
  'Zu große PDF'
);

const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
let browserTimeout = null;
dom.window.setTimeout = (_fn, delay) => { browserTimeout = delay; return 1; };
dom.window.clearTimeout = () => {};
dom.window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
dom.window.eval(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'));
await dom.window.BT.api.ai('parsePlayerDevelopmentPdf', payload);
assert.equal(browserTimeout, 55_000, 'Der Browser beendet den PDF-Import vor dem Serverzeitbudget');

const app = new JSDOM(`<!doctype html><dialog id="development-import-dialog"></dialog>`, {
  url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only'
});
Object.defineProperty(app.window, 'crypto', { configurable: true, value: webcrypto });
app.window.BT = {
  util: {
    uuid: (() => { let id = 0; return prefix => `${prefix}${++id}`; })(),
    seasonForDate: () => '26/27',
    todayISO: () => '2026-10-12',
    escapeHTML: value => String(value)
  }
};
app.window.eval(readFileSync(new URL('../js/development-core.js', import.meta.url), 'utf8'));
const protectedTraining = { id: 'tr_u9ki7ul9pxyo', date: '2026-10-13', title: 'Dienstag Mannschaftstraining', plan: { durationMinutes: 105 } };
app.window.localStorage.setItem('beepTest_v1', JSON.stringify({
  schemaVersion: 5, meta: {},
  players: [{ id: 'p_dhruva', name: 'Dhruva' }, { id: 'p_dennis', name: 'Dennis' }],
  sessions: [], trainings: [protectedTraining], games: [{ id: 'g_illertal', date: '2026-10-10', home: 'BG Illertal 3', away: 'TSV Lindau' }],
  opponents: [], tableDuties: [], jerseyDuties: [], notes: [], freethrows: [], drills: [], templates: [], phases: [], tactics: [],
  developmentFindings: [], developmentImportReceipts: [], settings: {}
}));
app.window.eval(readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8'));
let aiCalls = 0;
app.window.BT.api = {
  getToken: () => 'coach-token',
  ai: async () => {
    aiCalls += 1;
    return { data: { ...validResponse, contractVersion: 'player-development-import.v1' }, model: 'gemini-3.8-flash', requestId: `ai_${aiCalls}` };
  }
};
let saveCalls = 0;
const saveDevelopmentImport = app.window.BT.storage.saveDevelopmentImport;
app.window.BT.storage.saveDevelopmentImport = value => {
  saveCalls += 1;
  return saveDevelopmentImport(value);
};
app.window.eval(readFileSync(new URL('../js/development-import.js', import.meta.url), 'utf8'));

function pdfFile(name, suffix) {
  const bytes = new TextEncoder().encode(`%PDF-1.4\n${suffix}`);
  const file = new app.window.File([bytes], name, { type: 'application/pdf' });
  file.arrayBuffer = async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return file;
}

const game = app.window.BT.storage.getGame('g_illertal');
const file = pdfFile('dhruva-bewertung.pdf', 'erste Bewertung');
const beforeParse = app.window.localStorage.getItem('beepTest_v1');
const draft = await app.window.BT.developmentImport.parseFile(file, game);
assert.match(draft.sourceHash, /^sha256:[0-9a-f]{64}$/);
assert.equal(app.window.localStorage.getItem('beepTest_v1'), beforeParse, 'Temporäre PDF-Analyse verändert den Workspace');
assert(!JSON.stringify(draft).includes('JVBER'), 'PDF-Bytes oder Base64 verbleiben im Importentwurf');
const preview = app.window.BT.developmentImport.buildPreview(draft, app.window.BT.storage.getPlayers(), game);
assert.equal(preview.rows[0].suggestedPlayerId, 'p_dhruva');
const trainingBeforeConfirm = JSON.stringify(app.window.BT.storage.getTraining('tr_u9ki7ul9pxyo'));
const saved = app.window.BT.developmentImport.confirm(preview, [{
  candidateIndex: 0, playerId: 'p_dhruva', accepted: true,
  coachPriority: 5, roleRelevant: true
}]);
assert.equal(saved.findings.length, 1);
assert.equal(saveCalls, 1, 'Bestätigung speichert Importbeleg und Befunde nicht atomar in einem Aufruf');
assert.equal(app.window.BT.storage.getDevelopmentFindings({ playerId: 'p_dhruva' }).length, 1);
assert.equal(JSON.stringify(app.window.BT.storage.getTraining('tr_u9ki7ul9pxyo')), trainingBeforeConfirm, 'Das geschützte Dienstagstraining wurde durch den PDF-Import verändert');

const secondDraft = await app.window.BT.developmentImport.parseFile(pdfFile('dhruva-neu.pdf', 'zweite Bewertung'), game);
const secondPreview = app.window.BT.developmentImport.buildPreview(secondDraft, app.window.BT.storage.getPlayers(), game);
app.window.BT.storage.deletePlayer('p_dhruva');
const beforeDeletedPlayerConfirm = app.window.localStorage.getItem('beepTest_v1');
assert.throws(
  () => app.window.BT.developmentImport.confirm(secondPreview, [{ candidateIndex: 0, playerId: 'p_dhruva', accepted: true, coachPriority: 4, roleRelevant: true }]),
  /existiert nicht mehr/,
  'Gelöschte Spieler müssen die atomare Bestätigung abbrechen'
);
assert.equal(app.window.localStorage.getItem('beepTest_v1'), beforeDeletedPlayerConfirm, 'Fehlgeschlagene Bestätigung verändert den Workspace');
assert.equal(saveCalls, 1, 'Fehlgeschlagene Zuordnung erreicht die Speicherfunktion');

await assert.rejects(
  () => app.window.BT.developmentImport.parseFile(file, game),
  /bereits importiert/,
  'Gleiche PDF unter erneutem Dateizugriff wird nicht am Hash erkannt'
);
assert.equal(aiCalls, 2, 'Doppelimport wird erst nach einem unnötigen KI-Aufruf erkannt');

console.log('CourtHub Spielerbewertungs-PDF: Vertrag, Vorschau, atomare Bestätigung und Bestandsschutz erfolgreich.');
