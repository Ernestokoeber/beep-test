import { createHash } from 'node:crypto';
import { transaction } from '../_lib/db.js';
import { isIndividualPlayer, requireMembership } from '../_lib/auth.js';
import { findIndividualProfile } from '../_lib/individual-access.js';
import { method, noStore, safeError } from '../_lib/http.js';

function endpointHash(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function createIndividualPushHandler(deps = {}) {
  const membership = deps.requireMembership || requireMembership;
  const runTransaction = deps.transaction || transaction;
  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['GET', 'POST', 'DELETE'])) return;
    try {
      const auth = await membership(req, res);
      if (!auth) return;
      if (!isIndividualPlayer(auth.role)) return res.status(403).json({ error: 'Push-Erinnerungen sind dem persönlichen Spielerprofil zugeordnet.' });
      if (req.method === 'GET') return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
      const result = await runTransaction(async client => {
        const profile = await findIndividualProfile(auth, null, client.query.bind(client));
        if (!profile) throw new TypeError('Individualprofil nicht gefunden.');
        const endpoint = String(req.body?.endpoint || '');
        if (!endpoint.startsWith('https://') || endpoint.length > 2048) throw new TypeError('Push-Endpunkt ist ungültig.');
        const hash = endpointHash(endpoint);
        if (req.method === 'DELETE') {
          await client.query(
            `UPDATE individual_push_subscriptions SET active = FALSE, revoked_at = clock_timestamp()
              WHERE endpoint_hash = $1 AND individual_profile_id = $2`, [hash, profile.id]
          );
          return { active: false };
        }
        const p256dh = String(req.body?.keys?.p256dh || '');
        const authSecret = String(req.body?.keys?.auth || '');
        if (!p256dh || !authSecret || p256dh.length > 512 || authSecret.length > 512) throw new TypeError('Push-Schlüssel sind ungültig.');
        await client.query(
          `INSERT INTO individual_push_subscriptions
            (individual_profile_id, endpoint_hash, endpoint, p256dh, auth_secret)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (endpoint_hash) DO UPDATE
             SET individual_profile_id = EXCLUDED.individual_profile_id,
                 endpoint = EXCLUDED.endpoint, p256dh = EXCLUDED.p256dh,
                 auth_secret = EXCLUDED.auth_secret, active = TRUE, revoked_at = NULL`,
          [profile.id, hash, endpoint, p256dh, authSecret]
        );
        return { active: true };
      });
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof TypeError) return res.status(400).json({ error: error.message });
      return safeError('individual-push', error, res, 'Push-Einstellung konnte nicht gespeichert werden.');
    }
  };
}

export default createIndividualPushHandler();
