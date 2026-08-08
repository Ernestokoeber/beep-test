import { query } from './_lib/db.js';
import { canWrite, requireMembership } from './_lib/auth.js';
import { method, noStore, safeError } from './_lib/http.js';
import { filterWorkspaceForRole, hasValidTacticsShape } from './_lib/workspace-data.js';

const MAX_WORKSPACE_BYTES = 4 * 1024 * 1024;

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET', 'PUT'])) return;

  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;

    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT data, version, updated_at
           FROM workspaces
          WHERE organization_id = $1`,
        [auth.organization_id]
      );
      const workspace = rows[0] || { data: {}, version: 0, updated_at: null };
      return res.status(200).json({
        data: filterWorkspaceForRole(workspace.data, auth.role),
        version: Number(workspace.version || 0),
        updatedAt: workspace.updated_at,
        role: auth.role
      });
    }

    if (!canWrite(auth.role)) return res.status(403).json({ error: 'Nur Trainer dürfen Teamdaten verändern.' });

    const { data, expectedVersion } = req.body || {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Ungültiger Workspace.' });
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return res.status(400).json({ error: 'Ungültige Workspace-Version.' });
    }
    if (!hasValidTacticsShape(data)) {
      return res.status(400).json({ error: 'Ungültige Taktikdaten.' });
    }
    const serialized = JSON.stringify(data);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_WORKSPACE_BYTES) {
      return res.status(413).json({ error: 'Der Teamdatenbestand ist zu groß für die Synchronisierung.' });
    }

    const { rows } = await query(
      `UPDATE workspaces
          SET data = $1::jsonb,
              version = version + 1,
              updated_by = $2,
              updated_at = now()
        WHERE organization_id = $3
          AND version = $4
      RETURNING version, updated_at`,
      [serialized, auth.sub, auth.organization_id, expectedVersion]
    );

    if (rows.length === 0) {
      const current = await query(
        'SELECT data, version, updated_at FROM workspaces WHERE organization_id = $1',
        [auth.organization_id]
      );
      const conflict = current.rows[0] || { data: {}, version: 0, updated_at: null };
      return res.status(409).json({
        error: 'Teamdaten wurden zwischenzeitlich verändert.',
        conflict: {
          data: conflict.data || {},
          version: Number(conflict.version || 0),
          updatedAt: conflict.updated_at
        }
      });
    }

    return res.status(200).json({
      ok: true,
      version: Number(rows[0].version),
      updatedAt: rows[0].updated_at
    });
  } catch (error) {
    return safeError('workspace', error, res, 'Synchronisierung fehlgeschlagen.');
  }
}
