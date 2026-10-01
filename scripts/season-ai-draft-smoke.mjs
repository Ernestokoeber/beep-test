import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
const window = dom.window;
window.BT = {
  util: { todayISO: () => '2026-10-01', formatDate: (value) => value },
  storage: {
    getSetting: (_key, fallback) => fallback,
    setSetting: () => {},
    getTrainings: () => [],
    getDrills: () => [],
    getTemplates: () => []
  }
};

window.eval(readFileSync(new URL('../js/season-ai-draft.js', import.meta.url), 'utf8'));
window.eval(readFileSync(new URL('../js/seasonplanner.js', import.meta.url), 'utf8'));

const payload = {
  team: 'TSV Lindau',
  durationMinutes: 90,
  coachInput: { focus: 'Defense' },
  slots: [
    { date: '2026-10-06', weekday: 'tue' },
    { date: '2026-10-09', weekday: 'fri' },
    { date: '2026-10-13', weekday: 'tue' },
    { date: '2026-10-16', weekday: 'fri' },
    { date: '2026-10-20', weekday: 'tue' }
  ]
};
const batches = window.BT.seasonplanner.splitAIPayload(payload);
assert(batches.every((batch) => batch.slots.length <= 2), 'Wochenblock ist zu groß');
assert(batches[0].slots.map((slot) => slot.date).join(',') === '2026-10-06,2026-10-09', 'Erste Woche wurde getrennt');
assert(batches[1].slots.map((slot) => slot.date).join(',') === '2026-10-13,2026-10-16', 'Zweite Woche wurde getrennt');

const fingerprint = window.BT.seasonDraft.fingerprint(payload);
window.BT.seasonDraft.save('team-a', {
  fingerprint,
  completed: [{ index: 0, dates: ['2026-10-06', '2026-10-09'], trainings: [{ date: '2026-10-06' }, { date: '2026-10-09' }] }]
});
assert(window.BT.seasonDraft.load('team-a', fingerprint).completed.length === 1, 'Passender Entwurf wird nicht geladen');
const changedPayload = { ...payload, coachInput: { focus: 'Rebounding' } };
assert(window.BT.seasonDraft.load('team-a', window.BT.seasonDraft.fingerprint(changedPayload)) === null, 'Veralteter Entwurf wird fortgesetzt');
assert(window.localStorage.getItem('courthub_ai_season_draft_v1:team-a') === null, 'Veralteter Entwurf wurde nicht entfernt');

const scope = 'team-resume';
const calls = [];
let secondBlockFails = true;
async function requestBatch(batch) {
  calls.push(batch.slots.map((slot) => slot.date).join(','));
  if (batch.slots[0].date === '2026-10-13' && secondBlockFails) {
    const error = new Error('Vorübergehend nicht verfügbar');
    error.requestId = 'ai_failed_block';
    throw error;
  }
  return {
    data: { trainings: batch.slots.map((slot) => ({ date: slot.date, summary: `Plan ${slot.date}`, drills: [] })) },
    model: 'gemini-3.8-flash',
    requestId: `ai_${batch.slots[0].date}`
  };
}

try {
  await window.BT.seasonplanner.planInBatches(payload, requestBatch, () => {}, { scope, store: window.BT.seasonDraft });
  throw new Error('Fehlgeschlagener Block wurde verschluckt');
} catch (error) {
  assert(error.message.includes('Block 2'), 'Fehler nennt den betroffenen Block nicht');
  assert(error.requestId === 'ai_failed_block', 'Request-ID des Blocks ging verloren');
}
const draftAfterFailure = window.BT.seasonDraft.load(scope, fingerprint);
assert(draftAfterFailure.completed.length === 1 && draftAfterFailure.nextIndex === 1, 'Erfolgreicher Block wurde vor dem Abbruch nicht gespeichert');
assert(calls.filter((entry) => entry.startsWith('2026-10-06')).length === 1, 'Erster Block wurde im ersten Lauf mehrfach angefragt');
assert(calls.filter((entry) => entry.startsWith('2026-10-13')).length === 2, 'Fehlgeschlagener Block wurde nicht genau einmal wiederholt');

secondBlockFails = false;
const progress = [];
const resumed = await window.BT.seasonplanner.planInBatches(payload, requestBatch, (entry) => progress.push(entry), { scope, store: window.BT.seasonDraft });
assert(calls.filter((entry) => entry.startsWith('2026-10-06')).length === 1, 'Bereits bestätigter Block wurde erneut angefragt');
assert(resumed.trainings.length === 5, 'Fortgesetzte Planung enthält nicht alle Trainings');
assert(resumed.resumedBlocks === 1, 'Fortgesetzter Block wird nicht ausgewiesen');
assert(resumed.models.join(',') === 'gemini-3.8-flash', 'Modellliste ist nicht dedupliziert');
assert(resumed.requestIds.length === 2, 'Request-IDs der neuen Blöcke fehlen');
assert(progress.some((entry) => entry.resumed === true && entry.block === 1), 'Fortsetzungsfortschritt fehlt');

console.log('CourtHub KI-Saisonentwurf: Wochenblöcke und Wiederaufnahme erfolgreich.');
