import assert from 'node:assert/strict';
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

console.log('CourtHub Spielerbewertungs-PDF: Vertrag, Schutzregeln und Browser-Timeout erfolgreich.');
