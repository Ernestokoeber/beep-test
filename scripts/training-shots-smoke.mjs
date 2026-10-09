import { detailedDescription } from './fixtures/training-description.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildAIRequest, AIError } from '../api/_lib/ai-contracts.js';

const field = (category, attempted) => ({ kind: 'field', category, attempted });
const ft = attempted => ({ kind: 'freethrow', category: 'Freiwürfe', attempted });
const drill = (name, shotTargets = []) => ({ name, minutes: 15, intensity: 'low', description: detailedDescription(), shotTargets });
const entry = {
  date: '2026-10-06', summary: 'Wurfentscheidungen und Ballkontrolle',
  evidenceBasis: { observedTrends: ['Wurfqualität verbessern'], loadConsiderations: ['Mittlere Wochenlast'], planningDecision: 'Technik mit Entscheidungen verbinden.' },
  // Aggregates from the model deliberately disagree with its actual exercises.
  freethrows: { attempted: 999 }, shots: [{ category: 'Alter Plan', attempted: 999 }],
  drills: [drill('PnR-Abschlüsse', [field('Roll-Abschluss', 10), field('Pop-Wurf', 15)]), drill('Mehr Pop-Würfe', [field('pop-wurf', 5), ft(12)]), drill('Ballhandling')]
};
const request = buildAIRequest('planSeason', { data: { durationMinutes: 90, slots: [{ date: entry.date, weekday: 'tue' }] } });
assert(request.generationConfig.responseSchema.properties.trainings.items.properties.drills.items.required.includes('shotTargets'));
const parsed = request.parse(JSON.stringify({ trainings: [entry] })).trainings[0];
assert.deepEqual(parsed.shots, [{ category: 'Roll-Abschluss', attempted: 10 }, { category: 'Pop-Wurf', attempted: 20 }]);
assert.equal(parsed.freethrows.attempted, 12);
assert.equal(parsed.drills[2].shotTargets.length, 0, 'Ballhandling must not create fictional shots');
const invalid = structuredClone(entry);
delete invalid.drills[0].shotTargets;
assert.throws(() => request.parse(JSON.stringify({ trainings: [invalid] })), AIError);
invalid.drills[0].shotTargets = [field('Wurf', 0)];
assert.throws(() => request.parse(JSON.stringify({ trainings: [invalid] })), AIError);

const friday = { ...structuredClone(entry), date: '2026-10-09', stationTraining: {
  rationale: 'Neue Spielwoche', stations: [
    { title: 'Form Shooting', category: 'Wurf', description: detailedDescription(), shotTargets: [field('Form Shooting', 25)] },
    { title: 'Freiwürfe', category: 'Wurf', description: detailedDescription(), shotTargets: [ft(12)] },
    ...Array.from({ length: 3 }, (_, index) => ({ title: `Ballhandling ${index}`, category: 'Technik', description: detailedDescription(), shotTargets: [] }))
  ]
} };
const fridayRequest = buildAIRequest('planSeason', { data: { durationMinutes: 105, slots: [{ date: friday.date, weekday: 'fri', durationMinutes: 105, fridayStationMode: true }] } });
const stationPlan = fridayRequest.parse(JSON.stringify({ trainings: [friday] })).trainings[0];
assert.deepEqual(stationPlan.shots, [{ category: 'Form Shooting', attempted: 25 }]);
assert.equal(stationPlan.freethrows.attempted, 12, 'Station targets must not be counted twice');
assert.equal(stationPlan.drills.reduce((sum, item) => sum + item.minutes, 0), 105);
assert.deepEqual(stationPlan.drills[2].shotTargets, friday.stationTraining.stations[0].shotTargets);

const values = new Map();
const context = { console, Date, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) } };
context.window = context;
runInNewContext(readFileSync(new URL('../js/util.js', import.meta.url), 'utf8'), context);
runInNewContext(readFileSync(new URL('../js/training-shots.js', import.meta.url), 'utf8'), context);
runInNewContext(readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8'), context);
const training = context.BT.storage.upsertTraining({ date: entry.date, plan: parsed, freethrows: [], shots: [] });
assert.equal(training.shots.length, 2, 'Storage must prepare every planned category automatically');
assert(training.shots.every(category => category.entries.length === 0), 'Planning must not create measured results');
context.BT.storage.upsertTraining(training);
assert.equal(training.shots.length, 2, 'Saving a second time must not duplicate categories');
training.shots[0].entries.push({ playerId: 'p1', made: 7, attempted: 10 });
training.shots.push({ category: 'Manuell', entries: [] });
training.plan = stationPlan;
context.BT.storage.upsertTraining(training);
assert.equal(training.shots.length, 3, 'Unused planned categories must be replaced; actual results and manual categories retained');
assert.equal(training.shots[0].entries[0].made, 7);
assert(training.shots.some(category => category.category === 'Form Shooting'));
assert(!training.shots.some(category => category.category === 'Pop-Wurf'));
assert.equal(context.BT.trainingShots.targetFor(training, 'ft'), 12);
assert.equal(context.BT.trainingShots.targetFor(training, 'shot', 'form shooting'), 25);
assert.equal(context.BT.storage.getTraining(training.id).shots[0].entries[0].attempted, 10, 'Reload must retain actual attempts');
const completed = { ...training, status: 'completed', plan: parsed };
const before = JSON.stringify(completed);
context.BT.trainingShots.sync(completed);
assert.equal(JSON.stringify(completed), before, 'Completed training must stay unchanged');
const variant = { date: entry.date, plan: { drills: [drill('Freitagsvariante', [field('Catch-and-Shoot', 8), ft(4)])] }, shots: [] };
context.BT.trainingShots.sync(variant);
assert.equal(variant.plan.freethrows.attempted, 4);
assert.equal(variant.plan.shots[0].attempted, 8, 'Switching drills must update shooting goals');

console.log('CourtHub Wurfplanung: KI-Zuordnung, Stationen, Zielzahlen, Erfassung, Persistenz und Bestandsschutz erfolgreich.');
