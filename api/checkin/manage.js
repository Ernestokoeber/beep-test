import { query, transaction } from '../_lib/db.js';
import { canWrite, requireMembership } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';
import { newCheckinToken, safeTrainingId, tokenHash } from '../_lib/checkin.js';

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET', 'POST', 'DELETE'])) return;
  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;
    if (!canWrite(auth.role)) return res.status(403).json({ error: 'Nur Trainer dürfen Check-ins verwalten.' });

    const trainingId = safeTrainingId(req.method === 'POST' ? req.body && req.body.trainingId : req.query && req.query.trainingId);
    if (!trainingId) return res.status(400).json({ error: 'Ungültiges Training.' });

    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT l.id, l.expires_at,
                COALESCE(json_agg(json_build_object(
                  'playerId', s.player_id,
                  'playerName', s.player_name,
                  'submittedAt', s.submitted_at
                ) ORDER BY s.submitted_at) FILTER (WHERE s.id IS NOT NULL), '[]'::json) AS submissions
           FROM checkin_links l
           LEFT JOIN checkin_submissions s ON s.link_id = l.id
          WHERE l.organization_id = $1 AND l.training_id = $2
            AND l.revoked_at IS NULL AND l.expires_at > now()
          GROUP BY l.id
          ORDER BY l.created_at DESC
          LIMIT 1`,
        [auth.organization_id, trainingId]
      );
      const link = rows[0];
      return res.status(200).json({ active: !!link, expiresAt: link && link.expires_at, submissions: link ? link.submissions : [] });
    }

    if (req.method === 'DELETE') {
      await query(
        `UPDATE checkin_links SET revoked_at = now()
          WHERE organization_id = $1 AND training_id = $2 AND revoked_at IS NULL`,
        [auth.organization_id, trainingId]
      );
      return res.status(200).json({ ok: true });
    }

    const minutes = Math.max(15, Math.min(720, Number(req.body && req.body.expiresInMinutes) || 180));
    const workspace = await query('SELECT data FROM workspaces WHERE organization_id = $1', [auth.organization_id]);
    const data = workspace.rows[0] && workspace.rows[0].data;
    const training = data && Array.isArray(data.trainings) && data.trainings.find(item => item.id === trainingId);
    if (!training) return res.status(404).json({ error: 'Training wurde im Team-Workspace nicht gefunden. Bitte zuerst synchronisieren.' });

    const token = newCheckinToken();
    const created = await transaction(async client => {
      await client.query(
        `UPDATE checkin_links SET revoked_at = now()
          WHERE organization_id = $1 AND training_id = $2 AND revoked_at IS NULL`,
        [auth.organization_id, trainingId]
      );
      const { rows } = await client.query(
        `INSERT INTO checkin_links (organization_id, training_id, token_hash, expires_at, created_by)
         VALUES ($1, $2, $3, now() + ($4::text || ' minutes')::interval, $5)
         RETURNING expires_at`,
        [auth.organization_id, trainingId, tokenHash(token), String(minutes), auth.sub]
      );
      return rows[0];
    });
    return res.status(201).json({ token, expiresAt: created.expires_at });
  } catch (error) {
    return safeError('checkin-manage', error, res, 'QR-Check-in konnte nicht verwaltet werden.');
  }
}
