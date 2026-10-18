import crypto from 'node:crypto';
import { query } from './db.js';
import { isIndividualCoach, isIndividualPlayer, requireMembership } from './auth.js';
import { uuid } from './individual-training.js';

export function hashIndividualInviteToken(token) {
  const value = String(token || '');
  if (value.length < 24 || value.length > 512) throw new TypeError('Einladung ist ungültig.');
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function newIndividualInviteToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function individualInviteUrl(token) {
  const url = new URL(process.env.PUBLIC_APP_URL || 'https://coach.tsv-lindau.de');
  if (url.protocol !== 'https:') throw new Error('Für Einladungen muss eine HTTPS-App-Adresse konfiguriert sein.');
  url.search = '';
  url.pathname = url.pathname.replace(/\/$/, '') + '/';
  url.hash = '/join/' + encodeURIComponent(token);
  return url.href;
}

export async function findIndividualProfile(auth, requestedProfileId, execute = query) {
  let sql;
  let params;
  if (isIndividualPlayer(auth.role)) {
    sql = `SELECT ip.*
             FROM individual_profiles ip
            WHERE ip.organization_id = $1
              AND ip.user_id = $2
              AND ip.active = TRUE
            LIMIT 1`;
    params = [auth.organization_id, auth.sub];
  } else {
    const profileId = uuid(requestedProfileId, 'Individualprofil-ID');
    sql = `SELECT ip.*
             FROM individual_profiles ip
            WHERE ip.id = $1
              AND ip.organization_id = $2
              AND ip.active = TRUE
              AND ($3 = 'admin' OR ip.coach_user_id = $4)
            LIMIT 1`;
    params = [profileId, auth.organization_id, auth.role, auth.sub];
  }
  const { rows } = await execute(sql, params);
  return rows[0] || null;
}

export async function requireIndividualAccess(req, res, options = {}) {
  const auth = await (options.requireMembership || requireMembership)(req, res);
  if (!auth) return null;
  if (!isIndividualCoach(auth.role) && !isIndividualPlayer(auth.role)) {
    res.status(403).json({ error: 'Kein Zugriff auf Individualtraining.' });
    return null;
  }
  if (options.coachOnly && !isIndividualCoach(auth.role)) {
    res.status(403).json({ error: 'Diese Funktion ist nur für den zugeordneten Trainer verfügbar.' });
    return null;
  }
  const requestedProfileId = options.profileId ?? req.query?.profileId ?? req.body?.profileId;
  const profile = await findIndividualProfile(auth, requestedProfileId, options.query || query);
  if (!profile) {
    res.status(404).json({ error: 'Individualprofil nicht gefunden.' });
    return null;
  }
  return { auth, profile };
}

export async function claimIndividualInvite(client, rawToken, userId) {
  const tokenHash = hashIndividualInviteToken(rawToken);
  const inviteResult = await client.query(
    `SELECT ii.id, ii.organization_id, ii.individual_profile_id
       FROM individual_invites ii
      WHERE ii.token_hash = $1
        AND ii.used_at IS NULL
        AND ii.revoked_at IS NULL
        AND ii.expires_at > clock_timestamp()
      FOR UPDATE`,
    [tokenHash]
  );
  const invite = inviteResult.rows[0];
  if (!invite) return null;
  const assigned = await client.query(
    `UPDATE individual_profiles
        SET user_id = $1, updated_at = clock_timestamp()
      WHERE id = $2
        AND organization_id = $3
        AND user_id IS NULL
        AND active = TRUE
    RETURNING id, player_profile_id`,
    [userId, invite.individual_profile_id, invite.organization_id]
  );
  if (assigned.rowCount !== 1) return null;
  await client.query(
    `UPDATE individual_invites
        SET used_by = $1, used_at = clock_timestamp()
      WHERE id = $2`,
    [userId, invite.id]
  );
  return { ...invite, profile: assigned.rows[0] };
}
