import assert from 'node:assert/strict';
import { createIndividualAIDraftHandler } from '../api/_handlers/individual/ai-drafts.js';
import { individualPlayerData } from '../api/_lib/individual-player-data.js';
import { createIndividualManageHandler } from '../api/_handlers/individual/manage.js';
import { buildAIRequest } from '../api/_lib/ai-contracts.js';

const profileId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const draftId = '33333333-3333-4333-8333-333333333333';
const secret = 'PRIVATE_ONLY: Ballvortrag laut Spielbeobachtung unsicher';
const privateMeasurement = 'PRIVATE_MEASUREMENT_ONLY';
function fixture({ status = 'completed', failPublic = false, changeNotes = false, role = 'coach' } = {}) {
  const calls = [], writes = [];
  let content, noteReads = 0, sourceRevision;
  const published = [];
  const auth = { sub: draftId, organization_id: sessionId, role };
  const query = async (sql, params = []) => {
    if (sql.includes('FROM individual_profiles ip')) return { rows: [{ id: profileId, player_profile_id: draftId }] };
    if (sql.includes('SELECT s.* FROM individual_sessions')) return { rows: [{ id: sessionId, status, unit_number: 1, scheduled_for: '2026-10-19T18:15:00Z', duration_minutes: 105 }] };
    if (sql.includes('count(*)')) return { rows: [{ count: 0 }] };
    if (sql.includes('FROM individual_coach_notes')) {
      assert.equal(params[0], profileId, 'Notizen müssen zum autorisierten Profil gehören');
      noteReads++;
      return { rows: [{ id: draftId, session_id: null, note: secret + (changeNotes && noteReads > 1 ? ' geändert' : ''), created_at: '2026-10-18T10:00:00Z' }] };
    }
    if (sql.includes('FROM individual_measurements')) return { rows: [
      { metric_key: 'layups', numeric_value: 8, attempt: 1 },
      { metric_key: 'trainernotiz', text_value: privateMeasurement }
    ] };
    if (sql.includes('INSERT INTO individual_ai_drafts')) { sourceRevision = params[2]; return { rows: [{ id: draftId, individual_profile_id: profileId, session_id: sessionId }] }; }
    const draft = () => ({ id: draftId, individual_profile_id: profileId, session_id: sessionId, source_revision: sourceRevision, status: 'current', content });
    if (sql.includes('SELECT d.* FROM individual_ai_drafts')) return { rows: [draft()] };
    if (sql.includes("SET status = 'approved'")) return { rows: [draft()] };
    if (sql.includes('INSERT INTO individual_released_feedback') || sql.includes('INSERT INTO individual_weekly_focus') || sql.includes('INSERT INTO individual_notifications')) {
      published.push(params);
      return { rows: [{ id: draftId, valid_from: '2026-10-20', valid_until: '2026-10-25' }] };
    }
    if (sql.includes('UPDATE individual_ai_drafts')) {
      writes.push(sql);
      if (sql.includes("SET status = 'current'")) { content = JSON.parse(params[0]); return { rows: [{ id: draftId, content }] }; }
    }
    return { rows: [] };
  };
  const generate = async input => {
    calls.push(input);
    const isPrivate = Boolean(input.payload.data.privatePriorKnowledge);
    if (!isPrivate && failPublic) throw new Error('Synthetic public generation failure');
    return { value: {
      analysis: isPrivate ? secret : 'Messwerte analysiert',
      nextSession: { title: isPrivate ? secret : 'Öffentlicher Vorschlag', objective: secret, blocks: [15,30,30,30].map(minutes => ({
        title: secret, playerExerciseType: 'ballhandling', minutes, repetitions: secret, measurementMethod: secret, coachingCues: [secret]
      })) },
      // Deliberately disobey the prompt: these values must never reach a player.
      playerFeedback: isPrivate ? secret : 'Deine gemessenen Abschlüsse sind der Ausgangspunkt.',
      weeklyFocus: { title: isPrivate ? secret : 'Kontrollierte Abschlüsse', coachingCues: ['Balance halten'], successIndicator: 'Stabil landen' }
    } };
  };
  const handler = createIndividualAIDraftHandler({ requireMembership: async () => auth, transaction: async fn => fn({ query }), generate });
  const res = { statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  return { async run(action = 'generate') { await handler({ method: 'POST', headers: {}, body: { action, draftId, profileId, sessionId } }, res); return res; }, calls, writes, published, get content() { return content; } };
}

const main = fixture();
assert.equal((await main.run()).statusCode, 200);
assert.equal(main.calls.length, 2, 'Private und veröffentlichbare KI-Inhalte brauchen getrennte Eingaben');
const privateCall = main.calls.find(c => c.payload.data.privatePriorKnowledge);
const publicCall = main.calls.find(c => !c.payload.data.privatePriorKnowledge);
assert(JSON.stringify(privateCall).includes(secret));
assert(JSON.stringify(privateCall).includes(privateMeasurement));
assert(!JSON.stringify(publicCall).includes(secret));
assert(!JSON.stringify(publicCall).includes(privateMeasurement));
assert(!privateCall.payload.data.measurements.some(m => m.metric_key === 'trainernotiz'));
assert.equal(main.content.analysis, secret);
assert.equal(main.content.nextSession.title, secret);
assert(!JSON.stringify({ playerFeedback: main.content.playerFeedback, weeklyFocus: main.content.weeklyFocus }).includes(secret));
assert(!JSON.stringify(individualPlayerData({ profiles: [{ id: profileId }], coachNotes: [{ note: secret }], aiDrafts: [main.content] })).includes(secret));
assert.equal((await main.run('approve')).statusCode, 200);
assert.equal(main.published.length, 3);
assert(!JSON.stringify(main.published).includes(secret), 'Freigabe darf keine private Modellantwort veröffentlichen');

const stored = { plans: [], exercises: [] };
const manage = createIndividualManageHandler({
  requireMembership: async () => ({ sub: draftId, organization_id: sessionId, role: 'coach' }),
  transaction: async fn => fn({ query: async (sql, params = []) => {
    if (sql.includes('FROM individual_profiles ip')) return { rows: [{ id: profileId }] };
    if (sql.includes('SELECT content FROM individual_ai_drafts')) return { rows: [{ content: main.content }] };
    if (sql.includes('count(*)')) return { rows: [{ count: 1 }] };
    if (sql.includes('SELECT max(')) return { rows: [{ date: '2026-10-19' }] };
    if (sql.includes('INSERT INTO individual_sessions')) return { rows: [{ id: sessionId, unit_number: 2, scheduled_for: params[2] }] };
    if (sql.includes('INSERT INTO individual_session_plans')) { const row = { id: draftId, title: params[2], objective: params[3] }; stored.plans.push(row); return { rows: [row] }; }
    if (sql.includes('INSERT INTO individual_exercises')) stored.exercises.push({ title: params[2], duration_minutes: params[3], repetitions: params[4], coaching_cues: params[6] });
    return { rows: [] };
  } })
});
const planResponse = { statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
await manage({ method: 'POST', headers: {}, body: { action: 'createSession', profileIds: [profileId], scheduledDate: '2026-10-26', scheduledTime: '20:15' } }, planResponse);
assert.equal(planResponse.statusCode, 201);
assert.equal(stored.exercises.length, 4);
assert.equal(stored.exercises[0].title, 'Ballkontrolle');
assert(stored.plans[0].objective.includes(secret), 'Trainer erhält weiterhin den privaten Plan');
assert(!JSON.stringify(individualPlayerData(stored)).includes(secret), 'Folgeplan darf private KI-Titel und Details nicht an Spieler geben');
const contract = buildAIRequest('individualTrainingDraft', { data: { privatePriorKnowledge: { notes: [secret] } } });
assert(JSON.stringify(contract.parts).includes('keine Messwerte der Bestandsaufnahme'));
const incomplete = fixture({ status: 'planned' });
assert.equal((await incomplete.run()).statusCode, 409);
assert.equal(incomplete.calls.length, 0, 'Bestandsaufnahme darf nicht vorzeitig ausgewertet werden');
const player = fixture({ role: 'player' });
assert.equal((await player.run()).statusCode, 403);
assert.equal(player.calls.length, 0);
const failure = fixture({ failPublic: true });
assert.equal((await failure.run()).statusCode, 500);
assert.equal(failure.content, undefined, 'Kein Rückfall auf private Spielertexte bei Fehler');
const changed = fixture({ changeNotes: true });
assert.equal((await changed.run()).statusCode, 409);
assert.equal(changed.content, undefined, 'Geändertes Vorwissen darf keinen aktuellen Entwurf ergeben');
console.log('Privates KI-Vorwissen: Quellen getrennt, absichtliche KI-Leaks verworfen, Rollen/Abschluss/Fehler/Änderungen geprüft.');
