import { detailedDescription } from './fixtures/training-description.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildAIRequest, AIError } from '../api/_lib/ai-contracts.js';
import { generateWithGemini } from '../api/_lib/gemini-client.js';

const payload = { data: { durationMinutes: 105, slots: [{
  date: '2026-10-09', weekday: 'fri', durationMinutes: 105, fridayStationMode: true,
  weekendGame: { date: '2026-10-10', home: 'TSV Lindau', away: 'BG Illertal 3' }
}] } };
const compact = { trainings: [{
  date: '2026-10-09', summary: 'Individuelle Qualität vor Illertal',
  evidenceBasis: { observedTrends: ['Abschlüsse stabilisieren'], loadConsiderations: ['Spiel am Wochenende'], planningDecision: 'Kontrollierte Wurfqualität und Ballkontrolle.' },
  stationTraining: {
    rationale: 'Fünf individuelle Stationen vor dem Spiel.',
    stations: Array.from({ length: 5 }, (_, index) => ({
      title: `Station ${index + 1}`, category: index === 0 ? 'Wurf' : 'Technik', description: detailedDescription('Qualität vor Tempo. '.repeat(40)),
      shotTargets: index === 0 ? [
        { kind: 'field', category: 'Pop-Wurf', attempted: 20 },
        { kind: 'freethrow', category: 'Freiwürfe', attempted: 12 }
      ] : []
    }))
  }
}] };
const request = buildAIRequest('planSeason', payload);
const schema = request.generationConfig.responseSchema;
const properties = schema.properties.trainings.items.properties;
assert.deepEqual(Object.keys(properties).sort(), ['date', 'summary', 'evidenceBasis', 'stationTraining'].sort(), 'Friday must not send duplicate drills, totals or alternative modes');
assert(properties.stationTraining.properties.stations.items.required.includes('shotTargets'));
assert(!JSON.stringify(schema).includes('maxItems'), 'Array constraints should be enforced in the application, not multiply Gemini decoding states');
const value = request.parse(JSON.stringify(compact)).trainings[0];
assert.equal(value.drills.reduce((sum, drill) => sum + drill.minutes, 0), 105);
assert.equal(value.drills.length, 8);
assert.deepEqual(value.shots, [{ category: 'Pop-Wurf', attempted: 20 }]);
assert.equal(value.freethrows.attempted, 12);
assert.equal(value.drills[2].shotTargets.length, 2);
assert.equal(value.drills[2].description, compact.trainings[0].stationTraining.stations[0].description);
assert(value.drills[2].description.length > 800);
const normal = buildAIRequest('planSeason', { data: { slots: [{ date: '2026-10-13', weekday: 'tue' }] } });
assert(!normal.generationConfig.responseSchema.properties.trainings.items.properties.stationTraining);
assert(!normal.generationConfig.responseSchema.properties.trainings.items.properties.fridayVariants);
const regularFriday = buildAIRequest('planSeason', { data: { slots: [{ date: '2026-10-16', weekday: 'fri' }] } });
assert(regularFriday.generationConfig.responseSchema.properties.trainings.items.required.includes('fridayVariants'));
assert(!regularFriday.generationConfig.responseSchema.properties.trainings.items.properties.stationTraining);

const reply = (status, body) => ({ ok: status === 200, status, json: async () => body });
const candidate = data => reply(200, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(data) }] } }] });
async function withSchemaRejection(data) {
  const sent = [];
  const signals = [];
  const result = await generateWithGemini({
    action: 'planSeason', payload, apiKey: 'test-key', requestId: 'ai_friday_regression', now: () => 0,
    fetchImpl: async (_url, options) => {
      sent.push(JSON.parse(options.body)); signals.push(options.signal);
      return sent.length === 1 ? reply(400, { error: { message: 'Schema has too many states.' } }) : candidate(data);
    }
  });
  assert.equal(sent.length, 2, 'Schema rejection must get exactly one compatibility retry');
  assert(sent[0].generationConfig.responseSchema);
  assert.equal(sent[1].generationConfig.responseSchema, undefined);
  assert.equal(sent[1].generationConfig.responseMimeType, 'application/json');
  assert.equal(signals[0], signals[1], 'Fallback must share the original timeout');
  assert(sent[1].contents[0].parts.at(-1).text.includes('shotTargets'), 'Fallback must retain the complete shooting contract');
  return result;
}
const recovered = await withSchemaRejection(compact);
assert.equal(recovered.value.trainings[0].freethrows.attempted, 12);
assert.equal(recovered.value.trainings[0].shots[0].attempted, 20);
// Exercise the actual replan/save path with the normalized provider response.
const values = new Map();
const context = { console, Date, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) } };
context.window = context;
for (const name of ['util', 'training-shots', 'storage', 'station-training', 'seasonplanner']) {
  runInNewContext(readFileSync(new URL(`../js/${name}.js`, import.meta.url), 'utf8'), context);
}
const player = context.BT.storage.upsertPlayer({ name: 'Spieler 1' });
const game = context.BT.storage.upsertGame({ id: 'g1', date: '2026-10-10', home: 'TSV Lindau', away: 'BG Illertal 3' });
const existing = context.BT.storage.upsertTraining({
  date: '2026-10-09', attendance: [{ playerId: player.id, status: 'yes' }],
  freethrows: [{ playerId: player.id, made: 2, attempted: 3 }],
  shots: [{ category: 'Alter Wurf', planned: true, entries: [{ playerId: player.id, made: 4, attempted: 7 }] }]
});
context.BT.api = { ai: async (action, body) => {
  assert.equal(action, 'planSeason');
  assert.equal(body.data.slots[0].fridayStationMode, true);
  assert.equal(body.data.slots[0].date, '2026-10-09');
  return { data: recovered.value };
} };
await context.BT.seasonplanner.generateFridayTraining('2026-10-09', game, existing);
const saved = context.BT.storage.getTraining(existing.id);
assert.equal(context.BT.storage.getTrainings().length, 1, 'Replanning must update the existing training');
assert.equal(saved.stationTraining.stations.length, 5);
assert.equal(saved.stationTraining.stations[0].description, value.stationTraining.stations[0].description);
assert.equal(saved.plan.drills[2].description, value.drills[2].description);
assert(saved.plan.drills[2].description.endsWith('ENDE DER ANLEITUNG'));
assert(saved.stationTraining.players[player.id], 'Readiness and load inputs must be prepared for the player');
assert.equal(saved.plan.drills.reduce((sum, drill) => sum + drill.minutes, 0), 105);
assert.equal(saved.freethrows[0].made, 2, 'Replanning must preserve recorded free throws');
assert.equal(saved.shots.find(item => item.category === 'Alter Wurf').entries[0].made, 4);
assert.equal(saved.shots.find(item => item.category === 'Pop-Wurf').entries.length, 0, 'New goals must not be recorded as actual attempts');
assert.equal(context.BT.trainingShots.targetFor(saved, 'shot', 'Pop-Wurf'), 20);
assert.equal(context.BT.trainingShots.targetFor(saved, 'ft'), 12);
const incomplete = structuredClone(compact);
incomplete.trainings[0].stationTraining.stations.pop();
await assert.rejects(() => withSchemaRejection(incomplete), error => error instanceof AIError && error.code === 'AI_INVALID_RESPONSE');
const noTargets = structuredClone(compact);
delete noTargets.trainings[0].stationTraining.stations[0].shotTargets;
await assert.rejects(() => withSchemaRejection(noTargets), error => error instanceof AIError && error.code === 'AI_INVALID_RESPONSE');
let failedAttempts = 0;
await assert.rejects(() => generateWithGemini({
  action: 'planSeason', payload, apiKey: 'test-key', now: () => 0,
  fetchImpl: async () => { failedAttempts++; return reply(400, {}); }
}), error => error.code === 'AI_PROVIDER_REQUEST');
assert.equal(failedAttempts, 2, 'Provider rejection must not cause an endless retry');
let lateAttempts = 0;
const clock = [0, 44_000];
await assert.rejects(() => generateWithGemini({
  action: 'planSeason', payload, apiKey: 'test-key', now: () => clock.shift() ?? 44_000,
  fetchImpl: async () => { lateAttempts++; return reply(400, {}); }
}), error => error.code === 'AI_PROVIDER_REQUEST');
assert.equal(lateAttempts, 1, 'Fallback must respect the remaining time budget');

console.log('KI-Freitag 9.10.: kompaktes Format, Schema-Ablehnung, JSON-Wiederholung, 105 Minuten und vollständige Wurfvorgaben erfolgreich.');
