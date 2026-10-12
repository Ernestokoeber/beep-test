import { detailedDescription } from './fixtures/training-description.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildAIRequest, AIError } from '../api/_lib/ai-contracts.js';
import { generateWithGemini } from '../api/_lib/gemini-client.js';

const payload = { data: { durationMinutes: 105, slots: [{
  date: '2026-10-09', weekday: 'fri', durationMinutes: 105, fridayStationMode: true,
  weekendGame: { date: '2026-10-10', home: 'TSV Lindau', away: 'BG Illertal 3' }
}], playerDevelopment: [{
  playerId: 'p-contract', playerName: 'Vertragsspieler', priorities: [{
    category: 'decision', skillKey: 'turnover-control', observation: 'Ballverluste unter Druck reduzieren.',
    drillTags: ['Passwinkel'], roleRelevant: true, priority: 5
  }]
}], developmentTaxonomy: { decision: ['turnover-control'], technique: ['ball-control', 'shooting'] } } };
const compact = { trainings: [{
  date: '2026-10-09', summary: 'Individuelle Qualität vor Illertal',
  evidenceBasis: { observedTrends: ['Abschlüsse stabilisieren'], loadConsiderations: ['Spiel am Wochenende'], planningDecision: 'Kontrollierte Wurfqualität und Ballkontrolle.' },
  stationTraining: {
    rationale: 'Fünf individuelle Stationen vor dem Spiel.',
    stations: Array.from({ length: 5 }, (_, index) => ({
      title: `Station ${index + 1}`, category: index === 0 ? 'Wurf' : 'Technik', description: detailedDescription('Qualität vor Tempo. '.repeat(40)),
      focusAreas: index === 0
        ? [{ category: 'decision', skillKey: 'turnover-control' }]
        : [{ category: 'technique', skillKey: index === 1 ? 'ball-control' : 'shooting' }],
      shotTargets: index === 0 ? [
        { kind: 'field', category: 'Pop-Wurf', attempted: 20 },
        { kind: 'freethrow', category: 'Freiwürfe', attempted: 12 }
      ] : []
    }))
  }
}] };
const request = buildAIRequest('planSeason', payload);
const schema = request.generationConfig.responseSchema;
const replanPayload = structuredClone(payload);
replanPayload.data.slots[0].previousStationPlan = { stations: structuredClone(compact.trainings[0].stationTraining.stations) };
replanPayload.data.slots[0].replanAttempt = 2;
const replanRequest = buildAIRequest('planSeason', replanPayload);
assert.match(replanRequest.parts[0].text, /verbindliche Ausschlussreferenz/i, 'Der KI-Auftrag erklärt den bisherigen Freitag nicht als Ausschlussreferenz');
assert.match(replanRequest.parts[0].text, /mindestens drei der fünf primären focusAreas/i, 'Der KI-Auftrag verlangt keine fachlich neue Stationskombination');
const properties = schema.properties.trainings.items.properties;
assert.deepEqual(Object.keys(properties).sort(), ['date', 'summary', 'evidenceBasis', 'stationTraining'].sort(), 'Friday must not send duplicate drills, totals or alternative modes');
assert(properties.stationTraining.properties.stations.items.required.includes('shotTargets'));
assert(properties.stationTraining.properties.stations.items.required.includes('focusAreas'));
assert(!JSON.stringify(schema).includes('maxItems'), 'Array constraints should be enforced in the application, not multiply Gemini decoding states');
const value = request.parse(JSON.stringify(compact)).trainings[0];
assert.equal(value.drills.reduce((sum, drill) => sum + drill.minutes, 0), 105);
assert.equal(value.drills.length, 8);
assert.match(value.drills[0].description, /offener Stationswahl/i, 'Der Readiness-Block muss die offene Freitagsorganisation erklären');
assert.doesNotMatch(value.drills[0].description, /wechseln 1 → 2/, 'Der Freitag darf keine Pflichtrotation anordnen');
assert.deepEqual(value.shots, [{ category: 'Pop-Wurf', attempted: 20 }]);
assert.equal(value.freethrows.attempted, 12);
assert.equal(value.drills[2].shotTargets.length, 2);
assert.equal(value.drills[2].description, compact.trainings[0].stationTraining.stations[0].description);
assert.deepEqual(value.stationTraining.stations[0].focusAreas, [{ category: 'decision', skillKey: 'turnover-control' }]);
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
for (const name of ['util', 'development-core', 'training-shots', 'storage', 'station-training', 'seasonplanner']) {
  runInNewContext(readFileSync(new URL(`../js/${name}.js`, import.meta.url), 'utf8'), context);
}
const player = context.BT.storage.upsertPlayer({ name: 'Spieler 1' });
const archivedPlayer = context.BT.storage.upsertPlayer({ name: 'Archivierter Spieler' });
context.BT.storage.setArchived(archivedPlayer.id, true);
const game = context.BT.storage.upsertGame({ id: 'g1', date: '2026-10-10', home: 'TSV Lindau', away: 'BG Illertal 3' });
context.BT.storage.getDevelopmentFindings = () => [{
  id: 'finding-development', scope: 'player', playerId: player.id, sourceGameId: game.id,
  category: 'decision', skillKey: 'turnover-control', kind: 'development', status: 'new',
  observation: 'Ballverluste unter Druck reduzieren.', evidenceExcerpt: 'Dieser PDF-Beleg darf nicht in den KI-Auftrag.',
  suggestedPriority: 5, coachPriority: 5, pinned: true, roleRelevant: true,
  drillTags: ['Passwinkel', 'Ball sichern'], linkedDrillIds: [], evidenceRefs: [],
  confirmedAt: '2026-10-05T18:00:00.000Z', updatedAt: '2026-10-05T18:00:00.000Z'
}, {
  id: 'finding-strength', scope: 'player', playerId: player.id, sourceGameId: game.id,
  category: 'decision', skillKey: 'turnover-control', kind: 'strength', status: 'stable',
  observation: 'Gute Ruhe im Aufbau.', suggestedPriority: 4, coachPriority: null, pinned: false, roleRelevant: true,
  drillTags: [], linkedDrillIds: [], evidenceRefs: [], confirmedAt: '2026-10-05T18:00:00.000Z', updatedAt: '2026-10-05T18:00:00.000Z'
}, {
  id: 'finding-archived', scope: 'player', playerId: archivedPlayer.id, sourceGameId: game.id,
  category: 'technique', skillKey: 'shooting', kind: 'development', status: 'new',
  observation: 'Nicht mehr im aktiven Kader.', suggestedPriority: 5, coachPriority: null, pinned: false, roleRelevant: false,
  drillTags: [], linkedDrillIds: [], evidenceRefs: [], confirmedAt: '2026-10-05T18:00:00.000Z', updatedAt: '2026-10-05T18:00:00.000Z'
}];
const existing = context.BT.storage.upsertTraining({
  date: '2026-10-09', attendance: [{ playerId: player.id, status: 'yes' }],
  freethrows: [{ playerId: player.id, made: 2, attempted: 3 }],
  shots: [{ category: 'Alter Wurf', planned: true, entries: [{ playerId: player.id, made: 4, attempted: 7 }] }],
  stationTraining: { stations: structuredClone(value.stationTraining.stations) }
});
const changedFriday = structuredClone(recovered.value);
changedFriday.trainings[0].stationTraining.stations.forEach((station, index) => {
  station.title = `Neue Alternative ${index + 1}`;
});
changedFriday.trainings[0].stationTraining.stations.slice(1, 4).forEach((station, index) => {
  station.focusAreas = [[
    { category: 'technique', skillKey: 'finishing' }
  ], [
    { category: 'defense', skillKey: 'closeout' }
  ], [
    { category: 'rebounding', skillKey: 'box-out' }
  ]][index];
});
let fridayPlanningCalls = 0;
context.BT.api = { ai: async (action, body) => {
  fridayPlanningCalls += 1;
  assert.equal(action, 'planSeason');
  assert.equal(body.data.slots[0].fridayStationMode, true);
  assert.equal(body.data.slots[0].date, '2026-10-09');
  assert(body.data.slots[0].previousStationPlan, 'Die Neuplanung erhält den bisherigen Freitagsplan nicht als Ausschlussreferenz');
  assert.equal(body.data.slots[0].previousStationPlan.stations.length, 5, 'Die Neuplanung erhält den bisherigen Freitagsplan nicht als Ausschlussreferenz');
  assert.match(body.data.slots[0].replanRequirement, /mindestens drei/i, 'Die Neuplanung fordert keine fachlich erkennbare Änderung');
  assert.equal(body.data.slots[0].replanAttempt, fridayPlanningCalls, 'Der Wiederholungsversuch ist für die KI nicht erkennbar');
  assert.equal(body.data.playerDevelopment.length, 1, 'Nur aktive Spieler mit bestätigten Entwicklungsfeldern gehören in den Freitagspayload');
  assert.equal(body.data.playerDevelopment[0].playerId, player.id);
  assert.equal(body.data.playerDevelopment[0].priorities.length, 1, 'Stärken dürfen nicht als Entwicklungsfelder übertragen werden');
  assert.equal(body.data.playerDevelopment[0].priorities[0].observation, 'Ballverluste unter Druck reduzieren.');
  assert(body.data.developmentTaxonomy.decision.includes('turnover-control'), 'Der Freitagspayload benötigt die erlaubte Entwicklungstaxonomie');
  assert.match(body.data.instructions, /ohne Pflichtrotation/i, 'Der Freitagspayload muss die offene Stationswahl anordnen');
  assert.match(body.data.instructions, /Ausschlussreferenz/i, 'Der Freitagspayload erklärt den Umgang mit dem bisherigen Plan nicht');
  assert.doesNotMatch(body.data.instructions, /Gruppenrotation innerhalb jeder Einheit ist notwendig/i, 'Der Freitagspayload darf keine widersprüchliche Pflichtrotation enthalten');
  assert.equal(JSON.stringify(body.data.playerDevelopment).includes('PDF-Beleg'), false, 'PDF-Auszüge dürfen nicht an den Trainingsgenerator gehen');
  assert.equal(
    JSON.stringify(body.data.slots[0].requiredPrimaryFocuses),
    JSON.stringify([{ category: 'decision', skillKey: 'turnover-control' }]),
    'Die zwingend abzudeckenden Hauptprioritäten fehlen im Neuplanungsauftrag'
  );
  if (fridayPlanningCalls === 1) {
    const error = new Error('Das Stationstraining deckt nicht alle höchsten Spielerprioritäten ab.');
    error.code = 'AI_INVALID_RESPONSE';
    throw error;
  }
  assert.match(body.data.slots[0].replanFeedback, /Spielerprioritäten/i, 'Der zweite Versuch erhält den Validierungsgrund nicht');
  return { data: changedFriday };
} };
await context.BT.seasonplanner.generateFridayTraining('2026-10-09', game, existing);
const saved = context.BT.storage.getTraining(existing.id);
assert.equal(fridayPlanningCalls, 2, 'Eine fachlich ungültige KI-Antwort muss genau einen neuen Versuch auslösen');
assert.equal(context.BT.storage.getTrainings().length, 1, 'Replanning must update the existing training');
assert.equal(saved.stationTraining.stations.length, 5);
assert.equal(saved.stationTraining.stations[1].title, 'Neue Alternative 2', 'Nach der abgelehnten Erstantwort wurde nicht die fachlich gültige Stationskombination gespeichert');
assert.equal(saved.stationTraining.stations[0].description, value.stationTraining.stations[0].description);
assert.equal(saved.plan.drills[2].description, value.drills[2].description);
assert(saved.plan.drills[2].description.endsWith('ENDE DER ANLEITUNG'));
assert(saved.stationTraining.players[player.id], 'Readiness and load inputs must be prepared for the player');
assert.equal(saved.stationTraining.players[player.id].developmentFocuses[0].observation, 'Ballverluste unter Druck reduzieren.');
assert.deepEqual(Array.from(saved.stationTraining.players[player.id].recommendedStationIds), ['station_1']);
assert.equal(saved.plan.drills.reduce((sum, drill) => sum + drill.minutes, 0), 105);
assert.equal(saved.freethrows[0].made, 2, 'Replanning must preserve recorded free throws');
assert.equal(saved.shots.find(item => item.category === 'Alter Wurf').entries[0].made, 4);
assert.equal(saved.shots.find(item => item.category === 'Pop-Wurf').entries.length, 0, 'New goals must not be recorded as actual attempts');
assert.equal(context.BT.trainingShots.targetFor(saved, 'shot', 'Pop-Wurf'), 20);
assert.equal(context.BT.trainingShots.targetFor(saved, 'ft'), 12);
const titlesBeforeDuplicate = saved.stationTraining.stations.map(station => station.title);
let duplicateFridayCalls = 0;
context.BT.api = { ai: async (action, body) => {
  duplicateFridayCalls += 1;
  assert.equal(action, 'planSeason');
  assert.equal(body.data.slots[0].previousStationPlan.stations[1].title, 'Neue Alternative 2');
  return { data: changedFriday };
} };
await assert.rejects(
  () => context.BT.seasonplanner.generateFridayTraining('2026-10-09', game, saved),
  /zweimal denselben oder einen zu ähnlichen Stationsplan/i,
  'Nach zwei zu ähnlichen Entwürfen muss CourtHub abbrechen'
);
assert.equal(duplicateFridayCalls, 2, 'CourtHub darf höchstens einen Wiederholungsversuch senden');
assert.deepEqual(saved.stationTraining.stations.map(station => station.title), titlesBeforeDuplicate, 'Ein abgelehnter KI-Entwurf darf den bestehenden Freitag nicht überschreiben');
const incomplete = structuredClone(compact);
incomplete.trainings[0].stationTraining.stations.pop();
await assert.rejects(() => withSchemaRejection(incomplete), error => error instanceof AIError && error.code === 'AI_INVALID_RESPONSE');
const noTargets = structuredClone(compact);
delete noTargets.trainings[0].stationTraining.stations[0].shotTargets;
await assert.rejects(() => withSchemaRejection(noTargets), error => error instanceof AIError && error.code === 'AI_INVALID_RESPONSE');
const invalidFocus = structuredClone(compact);
invalidFocus.trainings[0].stationTraining.stations[0].focusAreas = [{ category: 'decision', skillKey: 'erfunden' }];
await assert.rejects(() => withSchemaRejection(invalidFocus), error => error instanceof AIError && error.code === 'AI_INVALID_RESPONSE');
const uncoveredPriority = structuredClone(compact);
uncoveredPriority.trainings[0].stationTraining.stations.forEach(station => {
  station.focusAreas = [{ category: 'technique', skillKey: 'shooting' }];
});
await assert.rejects(() => withSchemaRejection(uncoveredPriority), error => error instanceof AIError && error.code === 'AI_INVALID_RESPONSE');
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
