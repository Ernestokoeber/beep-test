import { requireMembership } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET'])) return;
  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;
    const gameId = String(req.query && req.query.gameId || '');
    if (!/^[A-Za-z0-9_-]{4,120}$/.test(gameId)) return res.status(400).json({ error: 'Ungültige Atlas-Spiel-ID.' });
    const base = String(process.env.ATLAS_API_URL || '').replace(/\/$/, '');
    if (!base) return res.status(503).json({ error: 'Project Atlas ist noch nicht verbunden. ATLAS_API_URL fehlt.' });
    const headers = { Accept: 'application/json', 'X-Atlas-Role': 'trainer' };
    if (process.env.ATLAS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.ATLAS_API_TOKEN;
    if (process.env.ATLAS_ACCESS_CLIENT_ID && process.env.ATLAS_ACCESS_CLIENT_SECRET) {
      headers['CF-Access-Client-Id'] = process.env.ATLAS_ACCESS_CLIENT_ID;
      headers['CF-Access-Client-Secret'] = process.env.ATLAS_ACCESS_CLIENT_SECRET;
    }
    if (process.env.ATLAS_IDENTITY_EMAIL) {
      headers['Cf-Access-Authenticated-User-Email'] = process.env.ATLAS_IDENTITY_EMAIL;
    }
    const response = await fetch(base + '/api/v1/games/' + encodeURIComponent(gameId) + '/analysis', {
      headers, signal: AbortSignal.timeout(20_000)
    });
    if (response.status === 404) return res.status(404).json({ error: 'Für dieses Spiel liegt noch keine freigegebene Atlas-Analyse vor.' });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).detail || ''; } catch { /* Atlas lieferte keine JSON-Fehlermeldung. */ }
      throw new Error('Atlas antwortet mit ' + response.status + (detail ? ': ' + detail : ''));
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > 2_000_000) return res.status(413).json({ error: 'Atlas-Paket ist zu groß.' });
    const data = JSON.parse(text);
    if (data.schema_version !== 'game-analysis-overview.v1' || data.game_id !== gameId) {
      return res.status(502).json({ error: 'Atlas lieferte einen unerwarteten Analysevertrag.' });
    }
    return res.status(200).json({ package: data, importedAt: new Date().toISOString() });
  } catch (error) {
    return safeError('games-atlas', error, res, 'Project-Atlas-Analyse konnte nicht geladen werden.');
  }
}
