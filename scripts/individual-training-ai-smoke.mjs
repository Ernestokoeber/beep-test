import assert from 'node:assert/strict';
import { buildAIRequest } from '../api/_lib/ai-contracts.js';
import { createIndividualAIDraftHandler } from '../api/individual/ai-drafts.js';

const valid = {
  analysis: 'Der Blick blieb bei den gemessenen Läufen häufiger oben.',
  playerFeedback: 'Behalten Sie den frühen Blick zum Ziel als Schwerpunkt bei.',
  nextSession: {
    title: 'Technik und Entscheidung', objective: 'Ballkontrolle in Entscheidungen übertragen.',
    blocks: [
      { title: 'Check-in', minutes: 5, repetitions: 'Readiness 1–10', measurementMethod: 'Skala speichern', coachingCues: ['Neutral nachfragen'] },
      { title: 'Aktivierung', minutes: 10, repetitions: '2 Serien', measurementMethod: 'keine Messung', coachingCues: ['Blick oben'] },
      { title: 'Technik', minutes: 30, repetitions: '3 × 6 je Seite', measurementMethod: 'Fehler getrennt zählen', coachingCues: ['Tief bleiben'] },
      { title: 'Entscheidung', minutes: 30, repetitions: '3 × 6 Aktionen', measurementMethod: 'Entscheidung und Treffer trennen', coachingCues: ['Signal spät geben'] },
      { title: 'Transfer', minutes: 25, repetitions: '10 Ballbesitze', measurementMethod: 'Vorteil dokumentieren', coachingCues: ['Maximal drei Dribblings'] },
      { title: 'Reflexion', minutes: 5, repetitions: '3 Fragen', measurementMethod: 'Kurzantworten', coachingCues: ['Einen Fokus wählen'] }
    ]
  },
  weeklyFocus: { title: 'Blick vor dem ersten Dribbling', coachingCues: ['Korb und Hilfe vor Ballannahme sehen'], successIndicator: 'Vor dem ersten Dribbling ist der Kopf sichtbar oben.' }
};

const request = buildAIRequest('individualTrainingDraft', { data: { profile: { id: 'own' }, measurements: [] } });
assert.equal(request.generationConfig.responseSchema.required.includes('weeklyFocus'), true);
assert.equal(request.parse(JSON.stringify(valid)).nextSession.blocks.reduce((sum, block) => sum + block.minutes, 0), 105);
const invalid = structuredClone(valid);
invalid.nextSession.blocks[0].minutes = 4;
assert.throws(() => request.parse(JSON.stringify(invalid)), /105 Minuten/);

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
