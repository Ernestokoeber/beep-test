import crypto from 'node:crypto';
import { transaction } from '../_lib/db.js';
import { safeEqual } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

const MAX_PACKAGE_BYTES = 2 * 1024 * 1024;

function gameFromPackage(pkg, atlasGameId) {
  const source = pkg.game || pkg.publicGame || {};
  return {
    id: 'game_atlas_' + crypto.randomBytes(8).toString('hex'),
    atlasGameId,
    source: 'project-atlas',
    team: source.team || 'herren',
    date: String(source.date || '').slice(0, 10),
    time: String(source.time || '').slice(0, 5),
    home: String(source.home || source.homeTeam || 'TSV Lindau').slice(0, 100),
    away: String(source.away || source.awayTeam || 'Gegner').slice(0, 100),
    score: String(source.score || '').slice(0, 30),
    status: source.status || 'played',
    playerStats: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['POST'])) return;
  try {
    const secret = process.env.ATLAS_WEBHOOK_SECRET;
    if (!secret || secret.length < 32) return res.status(503).json({ error: 'Atlas-Webhook ist nicht konfiguriert.' });
    const supplied = req.headers['x-atlas-webhook-secret'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!safeEqual(supplied, secret)) return res.status(401).json({ error: 'Ungültige Webhook-Signatur.' });

    const body = req.body || {};
    const pkg = body.package || body;
    const serialized = JSON.stringify(pkg);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PACKAGE_BYTES) return res.status(413).json({ error: 'Atlas-Paket ist zu groß.' });
    const schemaVersion = String(pkg.schema_version || pkg.schemaVersion || '');
    if (schemaVersion !== 'game-analysis-overview.v1' && !/^atlas\.[A-Za-z0-9._-]+\.v\d+$/.test(schemaVersion)) return res.status(400).json({ error: 'Unbekanntes Atlas-Paketschema.' });
    const atlasGameId = String(body.gameId || pkg.game_id || pkg.gameId || '');
    if (!/^[A-Za-z0-9_-]{4,120}$/.test(atlasGameId)) return res.status(400).json({ error: 'Atlas-Spiel-ID fehlt.' });
    const expectedSlug = process.env.TEAM_SLUG || 'tsv-lindau-basketball';
    if (body.organizationSlug && body.organizationSlug !== expectedSlug) return res.status(403).json({ error: 'Paket gehört zu einer anderen Organisation.' });
    const checksum = String(pkg.checksum || crypto.createHash('sha256').update(serialized).digest('hex'));
    if (!/^[A-Za-z0-9:_-]{16,160}$/.test(checksum)) return res.status(400).json({ error: 'Ungültige Paket-Prüfsumme.' });

    const receipt = await transaction(async client => {
      const existing = await client.query('SELECT id, workspace_version, imported_at FROM atlas_import_receipts WHERE checksum = $1', [checksum]);
      if (existing.rows[0]) return { ...existing.rows[0], duplicate: true };
      const org = await client.query('SELECT id FROM organizations WHERE slug = $1 LIMIT 1', [expectedSlug]);
      if (!org.rows[0]) throw new Error('TSV-Organisation fehlt');
      const workspaceResult = await client.query('SELECT data, version FROM workspaces WHERE organization_id = $1 FOR UPDATE', [org.rows[0].id]);
      if (!workspaceResult.rows[0]) throw new Error('TSV-Workspace fehlt');
      const workspace = workspaceResult.rows[0].data || {};
      workspace.games = Array.isArray(workspace.games) ? workspace.games : [];
      let game = workspace.games.find(item => item.atlasGameId === atlasGameId || (body.externalGameId && item.externalId === body.externalGameId));
      if (!game && pkg.game && pkg.game.date) {
        game = workspace.games.find(item => item.date === String(pkg.game.date).slice(0, 10) && item.home === (pkg.game.home || pkg.game.homeTeam) && item.away === (pkg.game.away || pkg.game.awayTeam));
      }
      if (!game) { game = gameFromPackage(pkg, atlasGameId); workspace.games.push(game); }
      game.atlasGameId = atlasGameId;
      game.atlas = { package: pkg, importedAt: new Date().toISOString(), source: 'webhook' };
      game.updatedAt = new Date().toISOString();
      workspace.meta = workspace.meta || {};
      workspace.meta.updatedAt = new Date().toISOString();
      const nextVersion = Number(workspaceResult.rows[0].version) + 1;
      await client.query('UPDATE workspaces SET data = $1::jsonb, version = $2, updated_at = now() WHERE organization_id = $3', [JSON.stringify(workspace), nextVersion, org.rows[0].id]);
      const saved = await client.query(
        `INSERT INTO atlas_import_receipts (organization_id, atlas_game_id, checksum, schema_version, workspace_version)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, workspace_version, imported_at`,
        [org.rows[0].id, atlasGameId, checksum, schemaVersion, nextVersion]
      );
      return { ...saved.rows[0], duplicate: false };
    });

    return res.status(receipt.duplicate ? 200 : 201).json({
      receiptId: receipt.id, status: receipt.duplicate ? 'already-imported' : 'imported',
      packageChecksum: checksum, workspaceVersion: Number(receipt.workspace_version), importedAt: receipt.imported_at
    });
  } catch (error) {
    return safeError('atlas-webhook', error, res, 'Atlas-Paket konnte nicht importiert werden.');
  }
}
