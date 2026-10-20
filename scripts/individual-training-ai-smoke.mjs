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
      { title: 'Check-in', playerExerciseType: 'checkin', priorityRole: 'support', coordinationMode: 'individual', roleAssignment: 'Eigene Tagesform einordnen', minutes: 5, repetitions: 'Readiness 1–10', measurementMethod: 'Skala speichern', coachingCues: ['Neutral nachfragen'] },
      { title: 'Aktivierung', playerExerciseType: 'warmup', priorityRole: 'support', coordinationMode: 'individual', roleAssignment: 'Ball als Point Guard kontrollieren', minutes: 10, repetitions: '2 Serien', measurementMethod: 'keine Messung', coachingCues: ['Blick oben'] },
      { title: 'Passpräzision', playerExerciseType: 'passing', priorityRole: 'primary', coordinationMode: 'individual', roleAssignment: 'Passfenster als Ballhandler treffen', minutes: 25, repetitions: '3 × 6 je Seite', measurementMethod: 'Zielkorridor und Fehler getrennt zählen', coachingCues: ['Tief bleiben'] },
      { title: 'Pass unter Entscheidung', playerExerciseType: 'passing', priorityRole: 'primary', coordinationMode: 'individual', roleAssignment: 'Hilfe lesen und Pass auswählen', minutes: 20, repetitions: '3 × 6 Aktionen', measurementMethod: 'Passfenster und Genauigkeit trennen', coachingCues: ['Signal spät geben'] },
      { title: 'Pick-and-Roll lesen', playerExerciseType: 'pickandroll', priorityRole: 'secondary', coordinationMode: 'shared', roleAssignment: 'Als Ballhandler den Roller lesen', minutes: 25, repetitions: '10 Ballbesitze', measurementMethod: 'Entscheidung dokumentieren', coachingCues: ['Blick früh anheben'] },
      { title: 'Transfer', playerExerciseType: 'decision', priorityRole: 'secondary', coordinationMode: 'individual', roleAssignment: 'Vorteil als Point Guard organisieren', minutes: 15, repetitions: '8 Aktionen', measurementMethod: 'richtige Entscheidung zählen', coachingCues: ['Vorteil nutzen'] },
      { title: 'Reflexion', playerExerciseType: 'reflection', priorityRole: 'support', coordinationMode: 'individual', roleAssignment: 'Eigenen Fokus benennen', minutes: 5, repetitions: '3 Fragen', measurementMethod: 'Kurzantworten', coachingCues: ['Einen Fokus wählen'] }
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
assert.equal(parsed.nextSession.blocks.filter(block => block.coordinationMode === 'shared').length, 1);
const invalid = structuredClone(valid);
invalid.nextSession.blocks[0].minutes = 4;
assert.throws(() => request.parse(JSON.stringify(invalid)), /105 Minuten/);
const generic = structuredClone(valid);
generic.nextSession.blocks.forEach(block => { block.priorityRole = 'support'; });
assert.throws(() => request.parse(JSON.stringify(generic)), /Hauptpriorität/);
const inventedEvidence = structuredClone(valid);
inventedEvidence.planningBasis.primaryPriority.evidenceRefs = ['measurement:invented'];
assert.throws(() => request.parse(JSON.stringify(inventedEvidence)), /vorhandene Belege/);
const excessiveShared = structuredClone(valid);
excessiveShared.nextSession.blocks[0].coordinationMode = 'shared';
assert.throws(() => request.parse(JSON.stringify(excessiveShared)), /ausschließlich für Korbabschlüsse oder Pick-and-Roll/);
const centerRequest = buildAIRequest('individualTrainingDraft', { data: {
  profile: { id: 'center' }, playerRole: { key: 'center', label: 'Center', responsibilities: ['Screenwinkel und Kontakt'] },
  planningEvidence: [{ id: 'measurement:roll', kind: 'measurement' }, { id: 'measurement:boxout', kind: 'measurement' }]
} });
assert.match(centerRequest.parts[0].text, /"key":"center"/);
const centerPlan = structuredClone(valid);
centerPlan.planningBasis.primaryPriority = { title: 'Abschluss am Ring', reason: 'Der Abschluss braucht Stabilität.', evidenceRefs: ['measurement:roll'] };
centerPlan.planningBasis.secondaryPriority = { title: 'Rebound und Box-out', reason: 'Die Position muss gefestigt werden.', evidenceRefs: ['measurement:boxout'] };
centerPlan.nextSession.blocks = [
  { title: 'Check-in', playerExerciseType: 'checkin', priorityRole: 'support', coordinationMode: 'individual', roleAssignment: 'Eigene Tagesform einordnen', minutes: 5, repetitions: 'Readiness 1–10', measurementMethod: 'Skala speichern', coachingCues: ['Neutral nachfragen'] },
  { title: 'Aktivierung', playerExerciseType: 'warmup', priorityRole: 'support', coordinationMode: 'individual', roleAssignment: 'Hüfte und Füße aktivieren', minutes: 10, repetitions: '2 Serien', measurementMethod: 'Bewegungsqualität prüfen', coachingCues: ['Tief starten'] },
  { title: 'Abschluss', playerExerciseType: 'finishing', priorityRole: 'primary', coordinationMode: 'individual', roleAssignment: 'Als Center mit Zielhand am Ring abschließen', minutes: 25, repetitions: '3 × 6', measurementMethod: 'Treffer und Balance zählen', coachingCues: ['Breit landen'] },
  { title: 'Fußarbeit', playerExerciseType: 'footwork', priorityRole: 'primary', coordinationMode: 'individual', roleAssignment: 'Als Center den Innenfuß setzen', minutes: 25, repetitions: '3 × 5 je Seite', measurementMethod: 'Saubere Pivot-Folgen zählen', coachingCues: ['Basis halten'] },
  { title: 'Rebound', playerExerciseType: 'rebounding', priorityRole: 'secondary', coordinationMode: 'individual', roleAssignment: 'Kontakt aufnehmen und Ball sichern', minutes: 20, repetitions: '12 Wiederholungen', measurementMethod: 'Gesicherte Rebounds zählen', coachingCues: ['Zuerst Körperkontakt'] },
  { title: 'Pick-and-Roll', playerExerciseType: 'pickandroll', priorityRole: 'secondary', coordinationMode: 'shared', roleAssignment: 'Als Screener Kontakt herstellen und hart rollen', minutes: 15, repetitions: '10 Aktionen', measurementMethod: 'Screenwinkel und Zielhand getrennt werten', coachingCues: ['Hüfte zum Korb öffnen'] },
  { title: 'Reflexion', playerExerciseType: 'reflection', priorityRole: 'support', coordinationMode: 'individual', roleAssignment: 'Eigenen Fokus benennen', minutes: 5, repetitions: '3 Fragen', measurementMethod: 'Kurzantworten', coachingCues: ['Einen Fokus wählen'] }
];
assert.equal(centerRequest.parse(JSON.stringify(centerPlan)).nextSession.blocks[3].playerExerciseType, 'footwork');

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
