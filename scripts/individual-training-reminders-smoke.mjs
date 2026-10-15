import assert from 'node:assert/strict';
import { createIndividualReminderHandler } from '../api/_handlers/individual/reminders.js';

const previousSecret = process.env.CRON_SECRET;
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;
process.env.CRON_SECRET = 'test-secret';
const sqlSeen = [];
const handler = createIndividualReminderHandler({
  processQueuedDrafts: async () => 0,
  transaction: async callback => callback({
    query: async sql => {
      sqlSeen.push(sql);
      if (sql.includes('FROM individual_notifications n')) return { rows: [{
        id: '11111111-1111-4111-8111-111111111111', individual_profile_id: '22222222-2222-4222-8222-222222222222',
        kind: 'feedback_request', notification_key: 'only-once', payload: { trainingDate: '2026-10-23' }
      }] };
      return { rows: [] };
    }
  })
});
const res = { statusCode: 200, body: null, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
await handler({ method: 'GET', headers: { authorization: 'Bearer test-secret' } }, res);
assert.equal(res.statusCode, 200);
assert.deepEqual(res.body, { due: 1, pushed: 0, pushConfigured: false, draftsGenerated: 0 }, 'Dashboard-Erinnerung muss ohne Push-Konfiguration funktionieren');
assert(sqlSeen.some(sql => sql.includes('dashboard_visible_at = clock_timestamp()')), 'Scheduler aktiviert Dashboard-Erinnerung nicht');
assert(sqlSeen.some(sql => sql.includes('NOT EXISTS')), 'Vorhandene Rückmeldung unterdrückt Folgeerinnerung nicht');
if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;

console.log('Individual Training Erinnerungen: Dashboard-Fallback, Deduplizierung und Unterdrückung erfolgreich.');
