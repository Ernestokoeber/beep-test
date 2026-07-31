import { query } from '../_lib/db.js';
import { findActiveLink, validCheckinToken } from '../_lib/checkin.js';
import { method, noStore, safeError } from '../_lib/http.js';

function publicName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Spieler';
  return parts[0] + ' ' + parts[parts.length - 1].slice(0, 1).toUpperCase() + '.';
}

async function workspaceFor(link) {
  const { rows } = await query('SELECT data FROM workspaces WHERE organization_id = $1', [link.organization_id]);
  return rows[0] && rows[0].data;
}

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET', 'POST'])) return;
  try {
    const token = req.method === 'GET' ? req.query && req.query.token : req.body && req.body.token;
    if (!validCheckinToken(token)) return res.status(400).json({ error: 'Ungültiger Check-in-Code.' });
    const link = await findActiveLink(token);
    if (!link) return res.status(410).json({ error: 'Dieser Check-in ist abgelaufen oder wurde gesperrt.' });
    const data = await workspaceFor(link);
    const training = data && Array.isArray(data.trainings) && data.trainings.find(item => item.id === link.training_id);
    if (!training) return res.status(404).json({ error: 'Training nicht gefunden.' });
    const players = (data.players || []).filter(player => !player.archived);

    if (req.method === 'GET') {
      return res.status(200).json({
        training: { title: training.plan && training.plan.summary || training.note || 'Teamtraining', date: training.date, startTime: training.startTime || '' },
        players: players.map(player => ({ id: player.id, name: publicName(player.name) })).sort((a, b) => a.name.localeCompare(b.name, 'de')),
        expiresAt: link.expires_at
      });
    }

    const playerId = typeof req.body.playerId === 'string' ? req.body.playerId : '';
    const player = players.find(item => item.id === playerId);
    if (!player) return res.status(400).json({ error: 'Spieler nicht gefunden.' });
    const { rows } = await query(
      `INSERT INTO checkin_submissions (link_id, player_id, player_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (link_id, player_id)
       DO UPDATE SET submitted_at = now(), player_name = EXCLUDED.player_name
       RETURNING submitted_at`,
      [link.id, player.id, publicName(player.name)]
    );
    return res.status(200).json({ ok: true, playerName: publicName(player.name), submittedAt: rows[0].submitted_at });
  } catch (error) {
    return safeError('checkin-public', error, res, 'Check-in konnte nicht gespeichert werden.');
  }
}
