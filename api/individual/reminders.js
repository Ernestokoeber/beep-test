import webpush from 'web-push';
import { transaction } from '../_lib/db.js';
import { method, noStore, safeError } from '../_lib/http.js';
import { createIndividualAIDraftHandler } from './ai-drafts.js';

function authorized(req) {
  const expected = process.env.CRON_SECRET;
  return Boolean(expected) && req.headers?.authorization === `Bearer ${expected}`;
}

function pushPayload(notification) {
  const payload = notification.payload || {};
  if (notification.kind === 'focus') {
    return {
      title: 'Dein Wochenfokus',
      body: [payload.title, payload.cueOne, payload.cueTwo].filter(Boolean).join(' · '),
      tag: notification.notification_key,
      url: '/#/individual'
    };
  }
  return {
    title: notification.kind === 'feedback_followup' ? 'Letzte Erinnerung zur Rückmeldung' : 'Kurze Trainingsrückmeldung',
    body: 'Bitte tragen Sie Ihre kurze Rückmeldung zum Mannschaftstraining ein.',
    tag: notification.notification_key,
    url: '/#/individual'
  };
}

async function processQueuedDrafts() {
  const queued = await transaction(client => client.query(
    `SELECT d.individual_profile_id, d.session_id, p.organization_id, d.requested_by,
            m.role AS requester_role
       FROM individual_ai_drafts d
       JOIN individual_profiles p ON p.id = d.individual_profile_id
       JOIN memberships m ON m.organization_id = p.organization_id AND m.user_id = d.requested_by
      WHERE d.status = 'queued' AND m.role IN ('admin', 'coach')
      ORDER BY d.created_at ASC
      LIMIT 2`
  ));
  let generated = 0;
  for (const draft of queued.rows) {
    const handler = createIndividualAIDraftHandler({
      requireMembership: async () => ({
        sub: draft.requested_by, organization_id: draft.organization_id,
        role: draft.requester_role
      })
    });
    const response = {
      statusCode: 200, body: null, setHeader() {},
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; }
    };
    await handler({
      method: 'POST', headers: {},
      body: { action: 'generate', profileId: draft.individual_profile_id, sessionId: draft.session_id }
    }, response);
    if (response.statusCode === 200) generated += 1;
  }
  return generated;
}

export function createIndividualReminderHandler(deps = {}) {
  const runTransaction = deps.transaction || transaction;
  const sender = deps.webpush || webpush;
  const processDrafts = deps.processQueuedDrafts || processQueuedDrafts;
  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['GET'])) return;
    if (!authorized(req)) return res.status(401).json({ error: 'Scheduler nicht autorisiert.' });
    try {
      const due = await runTransaction(async client => {
        const selected = await client.query(
          `SELECT n.*
             FROM individual_notifications n
            WHERE n.due_at <= clock_timestamp()
              AND n.stopped_at IS NULL
              AND n.dashboard_visible_at IS NULL
              AND (
                n.kind = 'focus'
                OR NOT EXISTS (
                  SELECT 1 FROM individual_weekly_feedback f
                   WHERE f.individual_profile_id = n.individual_profile_id
                     AND f.training_date = (n.payload->>'trainingDate')::date
                )
              )
            ORDER BY n.due_at ASC
            LIMIT 100
            FOR UPDATE SKIP LOCKED`
        );
        if (selected.rows.length) {
          await client.query(
            `UPDATE individual_notifications SET dashboard_visible_at = clock_timestamp()
              WHERE id = ANY($1::uuid[])`, [selected.rows.map(item => item.id)]
          );
        }
        return selected.rows;
      });

      const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
      if (!configured || due.length === 0) {
        const draftsGenerated = await processDrafts();
        return res.status(200).json({ due: due.length, pushed: 0, pushConfigured: configured, draftsGenerated });
      }
      sender.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      let pushed = 0;
      for (const notification of due) {
        const subscriptions = await runTransaction(client => client.query(
          `SELECT * FROM individual_push_subscriptions
            WHERE individual_profile_id = $1 AND active = TRUE`, [notification.individual_profile_id]
        ));
        let delivered = false;
        for (const subscription of subscriptions.rows) {
          try {
            await sender.sendNotification({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret }
            }, JSON.stringify(pushPayload(notification)), { TTL: 21_600, urgency: 'normal' });
            delivered = true;
          } catch (error) {
            if ([404, 410].includes(error?.statusCode)) {
              await runTransaction(client => client.query(
                `UPDATE individual_push_subscriptions SET active = FALSE, revoked_at = clock_timestamp()
                  WHERE id = $1`, [subscription.id]
              ));
            }
          }
        }
        if (delivered) {
          pushed += 1;
          await runTransaction(client => client.query(
            'UPDATE individual_notifications SET push_sent_at = clock_timestamp() WHERE id = $1', [notification.id]
          ));
        }
      }
      const draftsGenerated = await processDrafts();
      return res.status(200).json({ due: due.length, pushed, pushConfigured: true, draftsGenerated });
    } catch (error) {
      return safeError('individual-reminders', error, res, 'Erinnerungen konnten nicht ausgeliefert werden.');
    }
  };
}

export default createIndividualReminderHandler();
