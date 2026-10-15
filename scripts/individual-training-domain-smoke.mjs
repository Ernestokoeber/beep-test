import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INDIVIDUAL_TIMEZONE,
  assertCoachCapacity,
  assertParticipantCapacity,
  buildWeeklyReminderPlan,
  canApproveDraft,
  chooseServerLastWrite,
  completedUnitCount,
  nextUnitNumber,
  nextOpenPilotMonday,
  staleDraft,
  zonedDateTimeToInstant,
  validateChangeReason,
  validateReadiness,
  validateWeeklyFeedback
} from '../api/_lib/individual-training.js';
import { assertTemplateDuration, pilotRoadmap, pilotSessionTemplate } from '../api/_lib/individual-pilot.js';

assert.equal(INDIVIDUAL_TIMEZONE, 'Europe/Berlin');
assert.deepEqual(assertParticipantCapacity(['thomas', 'adnan']), ['thomas', 'adnan']);
assert.throws(() => assertParticipantCapacity(['a', 'b', 'c']), /höchstens zwei/);
assert.deepEqual(assertCoachCapacity(['a', 'b', 'c']), ['a', 'b', 'c']);
assert.throws(() => assertCoachCapacity(['a', 'b', 'c', 'd']), /höchstens drei/);

assert.equal(validateReadiness(1), 1);
assert.equal(validateReadiness(10), 10);
assert.throws(() => validateReadiness(0), /zwischen 1 und 10/);
assert.equal(validateChangeReason('Messfehler korrigiert'), 'Messfehler korrigiert');
assert.throws(() => validateChangeReason(' '), /Änderungsgrund/);

assert.deepEqual(validateWeeklyFeedback({ occurrence: 'often', implementationScore: 4, note: 'Blick oben' }), {
  occurrence: 'often', implementationScore: 4, note: 'Blick oben'
});
assert.deepEqual(validateWeeklyFeedback({ occurrence: 'training_cancelled' }), {
  occurrence: 'training_cancelled', implementationScore: null, note: null
});
assert.throws(() => validateWeeklyFeedback({ occurrence: 'training_cancelled', implementationScore: 3 }), /keine Umsetzung/);

const sessions = [{ status: 'completed' }, { status: 'cancelled' }, { status: 'completed' }];
assert.equal(completedUnitCount(sessions), 2);
assert.equal(nextUnitNumber(sessions), 3, 'Ausfälle dürfen die Einheitsnummer nicht erhöhen');
assert.equal(nextOpenPilotMonday(), '2026-10-19');
assert.equal(nextOpenPilotMonday('2026-10-26'), '2026-11-09', 'Ferienmontag muss übersprungen werden');
assert.equal(nextOpenPilotMonday('2026-12-07'), '2026-12-14');

const earlier = { mutationId: 'mut_a', serverReceivedAt: '2026-10-15T16:00:00.000Z', value: 1 };
const later = { mutationId: 'mut_b', serverReceivedAt: '2026-10-15T16:00:01.000Z', value: 2 };
assert.equal(chooseServerLastWrite(earlier, later).value, 2, 'Gerätezeit darf Last Write Wins nicht steuern');

assert.equal(canApproveDraft({ status: 'stale', content: {} }), false);
assert.equal(canApproveDraft({ status: 'current', content: { focus: 'Wurf' } }), true);
assert.equal(staleDraft({ status: 'current', content: {} }).status, 'stale');
assert.throws(() => staleDraft({ status: 'approved', content: {} }), /freigegebener Entwurf/);

const reminderPlan = buildWeeklyReminderPlan({
  profileId: 'thomas', sessionAt: '2026-10-19T18:15:00.000Z', fridayDate: '2026-10-23'
});
assert.equal(reminderPlan.length, 3);
assert.deepEqual(reminderPlan.map(item => item.kind), [
  'attendance', 'focus', 'feedback_request'
]);
assert.deepEqual(buildWeeklyReminderPlan({
  profileId: 'thomas', sessionAt: '2026-11-09T19:15:00.000Z', fridayDate: '2026-11-13', suspended: true
}), []);
assert.equal(new Set(reminderPlan.map(item => item.notificationKey)).size, 3, 'Erinnerungen müssen idempotent sein');
assert.equal(reminderPlan[0].dueAt, '2026-10-19T16:15:00.000Z', 'Montagserinnerung muss am Anfang des freigegebenen Zeitfensters liegen');
assert.equal(reminderPlan[1].dueAt, '2026-10-23T16:15:00.000Z', 'Freitagsfokus muss die Sommerzeit Europe/Berlin berücksichtigen');
assert.equal(reminderPlan[2].dueAt, '2026-10-24T10:00:00.000Z', 'Samstagsabfrage muss ungefähr um 12:00 Uhr liegen');
assert.equal(zonedDateTimeToInstant('2026-11-06', '18:15:00'), '2026-11-06T17:15:00.000Z', 'Winterzeit Europe/Berlin ist falsch');

const cronConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
assert.equal(cronConfig.crons.length, 6, 'Sommer- und Winterzeitfenster für Montag, Freitag und Samstag fehlen');
assert(cronConfig.crons.every(job => !job.schedule.includes('*/')), 'Vercel-Hobby darf keinen hochfrequenten Cron enthalten');
assert.equal(new Set(cronConfig.crons.map(job => job.path)).size, cronConfig.crons.length, 'Jedes Vercel-Zeitfenster benötigt einen eindeutigen Cron-Pfad');

for (const unit of [1, 4, 8]) assert.equal(assertTemplateDuration(pilotSessionTemplate(unit)), 105, `Einheit ${unit} dauert nicht 105 Minuten`);
const roadmap = pilotRoadmap();
assert.equal(roadmap.length, 8, 'Der sichtbare Pilotplan muss alle acht Einheiten enthalten');
assert.deepEqual(roadmap.filter(item => item.kind === 'assessment').map(item => item.unitNumber), [1, 4, 8]);
assert.equal(roadmap[0].scheduledDate, '2026-10-19');
assert.equal(roadmap[3].scheduledDate, '2026-11-16');
assert.equal(roadmap[7].scheduledDate, '2026-12-14');
const unitOne = pilotSessionTemplate(1);
assert.equal(unitOne.exercises.find(item => item.title === 'Ausgangsmessung Korbabschluss').repetitions.totalFinishes, 20);
assert.equal(unitOne.exercises.find(item => item.title === 'Ausgangsmessung Wurf').repetitions.totalAttempts, 25);
assert.equal(unitOne.exercises.find(item => item.title === 'Wahrnehmung und Entscheidung').repetitions.totalActions, 18);

const migration = readFileSync(new URL('../migrations/20261015_0001_individual_training.sql', import.meta.url), 'utf8');
for (const table of [
  'individual_profiles', 'individual_sessions', 'individual_session_participants',
  'individual_measurements', 'individual_weekly_feedback', 'individual_coach_notes',
  'individual_released_feedback', 'individual_notifications', 'individual_sync_mutations',
  'individual_ai_drafts', 'individual_audit_log'
]) assert(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Migration ohne ${table}`);
assert(migration.includes('individual_profiles_capacity_trigger'), 'Datenbank erzwingt das Coach-Limit nicht');
assert(migration.includes('individual_session_capacity_trigger'), 'Datenbank erzwingt das Teilnehmerlimit nicht');
assert(migration.includes('individual_audit_immutable_update'), 'Auditverlauf ist nicht unveränderbar');
assert(migration.includes('server_received_at'), 'Server-Eingangszeit fehlt');

console.log('Individual Training: Datenmodell und Domänenregeln erfolgreich.');
