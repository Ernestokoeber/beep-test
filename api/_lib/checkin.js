import crypto from 'node:crypto';
import { query } from './db.js';

export function validCheckinToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32,96}$/.test(token);
}

export function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function newCheckinToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function findActiveLink(token) {
  if (!validCheckinToken(token)) return null;
  const { rows } = await query(
    `SELECT id, organization_id, training_id, expires_at
       FROM checkin_links
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1`,
    [tokenHash(token)]
  );
  return rows[0] || null;
}

export function safeTrainingId(value) {
  return typeof value === 'string' && /^tr_[A-Za-z0-9_-]{4,80}$/.test(value) ? value : null;
}
