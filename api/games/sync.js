import { requireMembership } from '../_lib/auth.js';
import { method, noStore, safeError } from '../_lib/http.js';

const DBB_BASE = 'https://www.basketball-bund.net';
const DEFAULT_LEAGUE_ID = 54509;
const DEFAULT_TEAM_ID = 258298;

function isoDate(value) {
  const match = String(value || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) return match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').slice(0, 10)) ? String(value).slice(0, 10) : null;
}

function teamMatches(team, teamId, teamName) {
  if (!team) return false;
  const ids = [team.teamPermanentId, team.seasonTeamId, team.teamCompetitionId, team.clubId].map(Number);
  if (teamId && ids.includes(Number(teamId))) return true;
  return teamName && String(team.teamname || '').trim().toLowerCase() === String(teamName).trim().toLowerCase();
}

function scoreOf(match) {
  const result = match.result || match.matchResult;
  if (!result) return '';
  if (typeof result === 'string') return result;
  const home = result.homeScore ?? result.home ?? result.heimpunkte ?? result.pointsHome;
  const guest = result.guestScore ?? result.away ?? result.gastpunkte ?? result.pointsGuest;
  return Number.isFinite(Number(home)) && Number.isFinite(Number(guest)) ? Number(home) + ':' + Number(guest) : '';
}

function seasonKey(value, date) {
  const match = String(value || '').match(/(\d{4})\s*\/\s*(\d{4})/);
  if (match) return match[1].slice(-2) + '/' + match[2].slice(-2);
  const year = Number(String(date || '').slice(0, 4));
  if (!year) return '';
  const start = Number(String(date).slice(5, 7)) >= 7 ? year : year - 1;
  return String(start).slice(-2) + '/' + String(start + 1).slice(-2);
}

function normalize(match, league) {
  const home = match.homeTeam && match.homeTeam.teamname;
  const away = match.guestTeam && match.guestTeam.teamname;
  const date = isoDate(match.kickoffDate);
  if (!date || !home || !away || !match.matchId) return null;
  const score = scoreOf(match);
  return {
    externalId: 'dbb_' + String(match.matchId),
    officialMatchId: String(match.matchId),
    source: 'basketball-bund', provider: 'TeamSL', team: 'herren',
    leagueId: Number(league.ligaId), leagueName: String(league.liganame || '').slice(0, 120),
    seasonId: seasonKey(league.seasonName, date), officialSeason: String(league.seasonName || ''),
    matchNo: match.matchNo == null ? '' : String(match.matchNo),
    matchDay: match.matchDay == null ? null : Number(match.matchDay),
    date, time: String(match.kickoffTime || '').slice(0, 5),
    home: String(home).slice(0, 100), away: String(away).slice(0, 100),
    score, cancelled: Boolean(match.abgesagt || match.verzicht),
    status: match.abgesagt ? 'cancelled' : (score ? 'played' : 'upcoming')
  };
}

async function loadLeague(leagueId) {
  const url = DBB_BASE + '/rest/competition/spielplan/id/' + encodeURIComponent(leagueId);
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'CourtHub/3.0 (+https://www.tsv-lindau.de)' },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error('Offizieller Spielplan antwortet mit ' + response.status);
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > 2_000_000) throw new Error('TSV-Spielplan ist unerwartet groß');
  const payload = JSON.parse(text);
  if (String(payload.status) !== '0' || !payload.data?.ligaData || !Array.isArray(payload.data?.matches)) {
    throw new Error(payload.message || 'Offizieller Spielplan hat ein unbekanntes Format.');
  }
  return payload.data;
}

export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, ['GET'])) return;
  try {
    const auth = await requireMembership(req, res);
    if (!auth) return;
    const leagueId = Number.parseInt(String(req.query?.leagueId || DEFAULT_LEAGUE_ID), 10);
    const teamId = Number.parseInt(String(req.query?.teamId ?? DEFAULT_TEAM_ID), 10);
    const teamName = String(req.query?.teamName || 'TSV Lindau').slice(0, 100);
    if (!Number.isInteger(leagueId) || leagueId < 1 || leagueId > 9999999) return res.status(400).json({ error: 'Ungültige Liga-ID.' });
    if (!Number.isInteger(teamId) || teamId < 0 || teamId > 999999999) return res.status(400).json({ error: 'Ungültige Team-ID.' });

    const data = await loadLeague(leagueId);
    const league = data.ligaData;
    const matches = data.matches.filter(match =>
      teamMatches(match.homeTeam, teamId, teamName) || teamMatches(match.guestTeam, teamId, teamName)
    );
    const games = matches.map(match => normalize(match, league)).filter(Boolean);
    if (!games.length) return res.status(404).json({ error: 'Für diese Liga- und Team-ID wurden keine Spiele gefunden.' });
    const matchedTeam = matches.flatMap(match => [match.homeTeam, match.guestTeam]).find(team => teamMatches(team, teamId, teamName));
    return res.status(200).json({
      games, syncedAt: new Date().toISOString(), source: DBB_BASE,
      league: { id: Number(league.ligaId), name: league.liganame, season: league.seasonName },
      team: { id: matchedTeam?.teamPermanentId || teamId, name: matchedTeam?.teamname || teamName }
    });
  } catch (error) {
    if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message });
    return safeError('games-sync', error, res, 'Offizieller Spielplan konnte nicht synchronisiert werden.');
  }
}
