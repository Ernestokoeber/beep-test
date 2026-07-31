import crypto from 'node:crypto';
import { requireMembership } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

const DEFAULT_API = 'https://tsv-lindau-basketball-api.ekoeber.workers.dev';

function isoDate(value) {
  const match = String(value || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) return match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').slice(0, 10)) ? String(value).slice(0, 10) : null;
}

function normalize(game, team) {
  const date = isoDate(game.date);
  if (!date || !game.home || !game.away) return null;
  const key = [team, date, game.time || '', game.home, game.away].join('|').toLowerCase();
  return {
    externalId: 'tsv_' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 20),
    source: 'tsv-website', team, date, time: String(game.time || '').slice(0, 5),
    home: String(game.home).slice(0, 100), away: String(game.away).slice(0, 100),
    score: game.score ? String(game.score).slice(0, 30) : '',
    status: String(game.status || (game.score ? 'played' : 'upcoming')).slice(0, 30)
  };
}

async function load(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error('TSV-Spielplan antwortet mit ' + response.status);
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > 2_000_000) throw new Error('TSV-Spielplan ist unerwartet groß');
  return JSON.parse(text);
}

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET'])) return;
  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;
    const base = String(process.env.TSV_WEBSITE_API_URL || DEFAULT_API).replace(/\/$/, '');
    const [herren, u18] = await Promise.all([load(base + '/spielplan'), load(base + '/u18/spielplan')]);
    const games = [
      ...(herren.games || []).map(game => normalize(game, 'herren')),
      ...(u18.games || []).map(game => normalize(game, 'u18'))
    ].filter(Boolean);
    return res.status(200).json({ games, syncedAt: new Date().toISOString(), source: base });
  } catch (error) {
    return safeError('games-sync', error, res, 'TSV-Spielplan konnte nicht synchronisiert werden.');
  }
}
