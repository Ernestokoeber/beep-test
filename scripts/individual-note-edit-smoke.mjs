import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createIndividualManageHandler } from '../api/_handlers/individual/manage.js';
import { individualPlayerData } from '../api/_lib/individual-player-data.js';
import { ids, user, overview } from './fixtures/individual-player.mjs';

const noteId = '44444444-4444-4444-8444-444444444444';
let role = 'coach', accessible = true, stored = 'Bisherige Beobachtung', writes = [];
const handler = createIndividualManageHandler({
  requireMembership: async () => ({ sub: ids.other, organization_id: ids.session, role }),
  transaction: async fn => fn({ query: async (sql, params = []) => {
    if (sql.includes('FROM individual_profiles')) return { rows: accessible ? [{ id: ids.profile }] : [] };
    if (sql.includes('SELECT') && sql.includes('FROM individual_coach_notes')) {
      assert.deepEqual(params, [noteId, ids.profile]);
      return { rows: [{ id: noteId, note: stored }] };
    }
    writes.push({ sql, params });
    if (sql.includes('UPDATE individual_coach_notes')) { stored = params[0]; return { rows: [{ id: noteId, note: stored }] }; }
    return { rows: [] };
  } })
});
async function call(extra = {}) {
  writes = [];
  const res = { statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'POST', headers: {}, body: { action: 'editCoachNote', profileId: ids.profile, noteId, note: 'Korrigierte Beobachtung', expectedNote: 'Bisherige Beobachtung', ...extra } }, res);
  return res;
}
assert.equal((await call()).statusCode, 200);
assert.equal(stored, 'Korrigierte Beobachtung');
assert(writes.some(w => w.sql.includes("SET status = 'stale'")));
assert(writes.some(w => w.sql.includes('individual_audit_log')));
assert(!writes.some(w => w.sql.includes('individual_released_feedback')));
assert.equal((await call()).statusCode, 409, 'Alte Browserfassung darf neuere Notiz nicht überschreiben');
assert.equal(writes.length, 0);
assert.equal((await call({ note: '' })).statusCode, 400);
role = 'player'; assert.equal((await call()).statusCode, 403); assert.equal(writes.length, 0);
role = 'coach'; accessible = false; assert.equal((await call()).statusCode, 404); assert.equal(writes.length, 0);

const dom = new JSDOM('<main></main>', { url: 'https://coach.test/#/individual/player/' + ids.profile + '/feedback', runScripts: 'outside-only' });
const w = dom.window, data = structuredClone(overview), sent = [];
data.role = 'coach'; data.coachNotes = [{ id: noteId, individual_profile_id: ids.profile, note: 'Privat <b>bleibt Text</b>', created_at: '2026-10-18T10:00:00Z', updated_at: '2026-10-18T10:00:00Z' }];
w.BT = { util: { escapeHTML: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;') }, sync: { getState: () => ({ user: { ...user, role: 'coach' }, identitySource: 'server' }) }, storage: { getPlayers: () => [] }, api: {
  getIndividualOverview: async () => structuredClone(data),
  individualAction: async (action, payload) => { if (action === 'ensurePilotStart') return {}; sent.push({ action, payload }); throw new Error('Speichern fehlgeschlagen'); }
} };
for (const f of ['individual-copy', 'individual-player-view', 'individual-training']) w.eval(readFileSync(new URL('../js/' + f + '.js', import.meta.url), 'utf8'));
await w.BT.individualTraining.render(w.document.querySelector('main'), ids.profile, 'feedback');
const form = w.document.querySelector('[data-edit-coach-note]');
assert(form, 'Private Notiz benötigt Bearbeiten-Formular');
const textarea = form.querySelector('textarea');
assert.equal(textarea.value, data.coachNotes[0].note);
assert.equal(form.querySelectorAll('b').length, 0, 'Notiztext muss maskiert bleiben');
form.closest('details').open = true;
textarea.value = 'Verwerfen'; form.querySelector('[data-cancel-note-edit]').click();
assert.equal(textarea.value, data.coachNotes[0].note); assert.equal(form.closest('details').open, false); assert.equal(sent.length, 0);
form.closest('details').open = true; textarea.value = 'Korrektur behalten';
form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(sent[0].action, 'editCoachNote'); assert.equal(sent[0].payload.expectedNote, data.coachNotes[0].note);
assert.equal(textarea.value, 'Korrektur behalten', 'Fehler darf Bearbeitung nicht verlieren');
assert.equal(form.querySelector('button[type="submit"]').disabled, false);
assert(!JSON.stringify(individualPlayerData(data)).includes('bleibt Text'));
dom.window.close();
console.log('Private Notizbearbeitung: Berechtigungen, Konflikte, Audit, KI-Invalidierung, Abbrechen, Fehlererhalt und Spielerschutz geprüft.');
