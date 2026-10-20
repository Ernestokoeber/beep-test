import assert from 'node:assert/strict';
import { buildAIRequest } from '../api/_lib/ai-contracts.js';
import { createIndividualAIDraftHandler } from '../api/_handlers/individual/ai-drafts.js';

const valid = {
  analysis: 'Der Blick blieb bei den gemessenen Läufen häufiger oben.',
  playerFeedback: 'Behalten Sie den frühen Blick zum Ziel als Schwerpunkt bei.',
  planningBasis: {
    primaryPriority: { title: 'Passpräzision als Point Guard', reason: 'Die Bodenpässe waren ungenau.', evidenceRefs: ['measurement:pass'] },
    secondaryPriority: { title: 'Entscheidungen im Pick-and-Roll', reason: 'Der Blick kam zu spät nach oben.', evidenceRefs: ['coach-note:pnr'] },
    deferredTopics: ['Reboundarbeit', 'Post-Fußarbeit']
  },
  nextSession: {
    title: 'Technik und Entscheidung', objective: 'Ballkontrolle in Entscheidungen übertragen.',
    blocks: [
      { title: 'Check-in', playerExerciseType: 'checkin', priorityRole: 'support', minutes: 5, repetitions: 'Readiness 1–10', measurementMethod: 'Skala speichern', coachingCues: ['Neutral nachfragen'] },
      { title: 'Aktivierung', playerExerciseType: 'warmup', priorityRole: 'support', minutes: 10, repetitions: '2 Serien', measurementMethod: 'keine Messung', coachingCues: ['Blick oben'] },
      { title: 'Passpräzision', playerExerciseType: 'passing', priorityRole: 'primary', minutes: 25, repetitions: '3 × 6 je Seite', measurementMethod: 'Zielkorridor und Fehler getrennt zählen', coachingCues: ['Tief bleiben'] },
      { title: 'Pass unter Entscheidung', playerExerciseType: 'passing', priorityRole: 'primary', minutes: 20, repetitions: '3 × 6 Aktionen', measurementMethod: 'Passfenster und Genauigkeit trennen', coachingCues: ['Signal spät geben'] },
      { title: 'Pick-and-Roll lesen', playerExerciseType: 'pickandroll', priorityRole: 'secondary', minutes: 25, repetitions: '10 Ballbesitze', measurementMethod: 'Entscheidung dokumentieren', coachingCues: ['Blick früh anheben'] },
      { title: 'Transfer', playerExerciseType: 'decision', priorityRole: 'secondary', minutes: 15, repetitions: '8 Aktionen', measurementMethod: 'richtige Entscheidung zählen', coachingCues: ['Vorteil nutzen'] },
      { title: 'Reflexion', playerExerciseType: 'reflection', priorityRole: 'support', minutes: 5, repetitions: '3 Fragen', measurementMethod: 'Kurzantworten', coachingCues: ['Einen Fokus wählen'] }
    ]
  },
  weeklyFocus: { title: 'Blick vor dem ersten Dribbling', coachingCues: ['Korb und Hilfe vor Ballannahme sehen'], successIndicator: 'Vor dem ersten Dribbling ist der Kopf sichtbar oben.' }
};

const request = buildAIRequest('individualTrainingDraft', { data: {
  profile: { id: 'own' }, playerRole: { key: 'point_guard', label: 'Point Guard', responsibilities: ['Passpräzision'] },
  planningEvidence: [{ id: 'measurement:pass', kind: 'measurement' }], privatePlanningEvidence: [{ id: 'coach-note:pnr', kind: 'coach_observation' }]
} });
assert.equal(request.generationConfig.responseSchema.required.includes('weeklyFocus'), true);
const parsed = request.parse(JSON.stringify(valid));
assert.equal(parsed.nextSession.blocks.reduce((sum, block) => sum + block.minutes, 0), 105);
assert.deepEqual(parsed.planningBasis.allocationMinutes, { primary: 45, secondary: 40, support: 20 });
assert.match(request.parts[0].text, /Point Guard.*Ballhandler/s);
const invalid = structuredClone(valid);
invalid.nextSession.blocks[0].minutes = 4;
assert.throws(() => request.parse(JSON.stringify(invalid)), /105 Minuten/);
const generic = structuredClone(valid);
generic.nextSession.blocks.forEach(block => { block.priorityRole = 'support'; });
assert.throws(() => request.parse(JSON.stringify(generic)), /Hauptpriorität/);
const inventedEvidence = structuredClone(valid);
inventedEvidence.planningBasis.primaryPriority.evidenceRefs = ['measurement:invented'];
assert.throws(() => request.parse(JSON.stringify(inventedEvidence)), /vorhandene Belege/);
const centerRequest = buildAIRequest('individualTrainingDraft', { data: {
  profile: { id: 'center' }, playerRole: { key: 'center', label: 'Center', responsibilities: ['Screenwinkel und Kontakt'] },
  planningEvidence: [{ id: 'measurement:roll', kind: 'measurement' }, { id: 'measurement:boxout', kind: 'measurement' }]
} });
assert.match(centerRequest.parts[0].text, /"key":"center"/);

function response() {
  return { statusCode: 200, body: null, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const handler = createIndividualAIDraftHandler({
  requireMembership: async () => ({ sub: '66666666-6666-4666-8666-666666666666', organization_id: '44444444-4444-4444-8444-444444444444', role: 'coach' }),
  transaction: async callback => callback({
    query: async sql => sql.includes('SELECT d.* FROM individual_ai_drafts')
      ? { rows: [{ id: '77777777-7777-4777-8777-777777777777', status: 'stale', content: valid }] }
      : { rows: [] }
  })
});
const staleResponse = response();
await handler({ method: 'POST', headers: {}, body: { action: 'approve', draftId: '77777777-7777-4777-8777-777777777777' } }, staleResponse);
assert.equal(staleResponse.statusCode, 409, 'Veralteter KI-Entwurf durfte freigegeben werden');
assert.match(staleResponse.body.error, /Veraltete Entwürfe/);

console.log('Individual Training KI: 105-Minuten-Vertrag und Freigabesperre erfolgreich.');
