import { query } from './_lib/db.js';
import { requireMembership } from './_lib/auth.js';
import { method, noStore, safeError } from './_lib/http.js';

const ROLES = new Set(['admin', 'coach', 'assistant', 'viewer']);

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET', 'PATCH'])) return;

  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;

    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT u.id, u.email, u.display_name, m.role, m.created_at
           FROM memberships m
           JOIN users u ON u.id = m.user_id
          WHERE m.organization_id = $1
          ORDER BY m.created_at ASC`,
        [auth.organization_id]
      );
      return res.status(200).json({
        members: rows.map((row) => ({
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          role: row.role,
          createdAt: row.created_at
        }))
      });
    }

    if (auth.role !== 'admin') return res.status(403).json({ error: 'Nur Administratoren dürfen Rollen ändern.' });
    const userId = String(req.body?.userId || '');
    const role = String(req.body?.role || '');
    if (!userId || !ROLES.has(role)) return res.status(400).json({ error: 'Ungültige Rollenänderung.' });

    const target = await query(
      'SELECT role FROM memberships WHERE organization_id = $1 AND user_id = $2',
      [auth.organization_id, userId]
    );
    if (!target.rows[0]) return res.status(404).json({ error: 'Teammitglied nicht gefunden.' });
    if (target.rows[0].role === 'admin' && role !== 'admin') {
      const admins = await query(
        "SELECT count(*)::int AS count FROM memberships WHERE organization_id = $1 AND role = 'admin'",
        [auth.organization_id]
      );
      if (admins.rows[0].count <= 1) return res.status(409).json({ error: 'Mindestens ein Administrator muss erhalten bleiben.' });
    }

    await query(
      'UPDATE memberships SET role = $1 WHERE organization_id = $2 AND user_id = $3',
      [role, auth.organization_id, userId]
    );
    return res.status(200).json({ ok: true, userId, role });
  } catch (error) {
    return safeError('members', error, res, 'Trainerteam konnte nicht geladen werden.');
  }
}
