import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
const window = dom.window;
const opponents = [];
window.BT = {
  util: {
    uuid: prefix => `${prefix}${opponents.length + 1}`,
    seasonForDate: () => '26/27',
    escapeHTML: value => String(value),
    renderTemplate: () => window.document.createElement('section')
  },
  storage: {
    getOpponents: () => opponents,
    getOpponent: id => opponents.find(item => item.id === id || item.key === id),
    upsertOpponent: opponent => {
      const index = opponents.findIndex(item => item.id === opponent.id || item.key === opponent.key);
      if (index >= 0) opponents[index] = { ...opponents[index], ...opponent, id: opponents[index].id, updatedAt: '2026-10-03T10:00:00Z' };
      else opponents.push({ ...opponent, id: `opp_${opponents.length + 1}`, updatedAt: '2026-10-03T10:00:00Z' });
      return index >= 0 ? opponents[index] : opponents.at(-1);
    },
    getGames: () => []
  },
  seasonplanner: { scheduleConfig: () => ({ teamName: 'TSV Lindau', teamId: 258298 }) }
};

window.eval(readFileSync(new URL('../js/opponents.js', import.meta.url), 'utf8'));

const leagueGames = [
  { date: '2026-10-04', home: 'TSV Lindau', homeTeamId: 258298, away: 'TSV Ottobeuren', awayTeamId: 165633, score: '', seasonId: '26/27', leagueId: 54509 },
  { date: '2026-09-20', home: 'TSV Ottobeuren', homeTeamId: 165633, away: 'Team A', awayTeamId: 1001, score: '78:62', seasonId: '26/27', leagueId: 54509 },
  { date: '2026-09-27', home: 'Team B', homeTeamId: 1002, away: 'TSV Ottobeuren', awayTeamId: 165633, score: '65:71', seasonId: '26/27', leagueId: 54509 }
];
window.BT.opponents.syncLeague(leagueGames, { teamName: 'TSV Lindau', teamId: 258298 });
const otto = opponents.find(item => item.teamId === 165633);
assert(otto, 'Saison-Gegner wurde nicht aus dem Ligaspielplan angelegt');
const metrics = window.BT.opponents.metricsFor(otto);
assert(metrics.games === 2 && metrics.wins === 2 && metrics.pointsForPerGame === 74.5, 'Gegnerform oder Punkteschnitt ist falsch');

const unknownRecommendation = window.BT.opponents.recommendDefense(otto);
assert(unknownRecommendation.start === 'man', 'Bei dünner Datenlage bleibt Mannverteidigung nicht die Basis');
assert(unknownRecommendation.allowedDefenses.length === 3, 'Defense-Auswahl ist nicht auf drei Systeme begrenzt');

Object.assign(otto, {
  scouting: { perimeterThreat: 'high', insideThreat: 'low', primaryScorerArea: 'perimeter', highPostPassing: 'medium', offensiveRebounding: 'medium' },
  manualTotals: { gamesWithShots: 4, threeMade: 30, threeAttempted: 82, fieldGoalsMade: 100, fieldGoalsAttempted: 210, freeThrowsMade: 35, freeThrowsAttempted: 48, gamesWithFouls: 4, teamFouls: 72 },
  playerStats: [
    { id: 'a', name: 'Guard A', games: 4, points: 72, fouls: 10, threeMade: 12, threeAttempted: 30 },
    { id: 'b', name: 'Wing B', games: 4, points: 52, fouls: 8, threeMade: 8, threeAttempted: 20 }
  ]
});
const perimeterRecommendation = window.BT.opponents.recommendDefense(otto);
assert(perimeterRecommendation.start === 'zone32', 'Belegtes Perimeterprofil führt nicht zur 3-2-Zone');
assert(perimeterRecommendation.alternative && perimeterRecommendation.triggers.length === 2, 'Alternative oder Wechsel-Auslöser fehlen');
const context = window.BT.opponents.contextForProfile(otto);
assert(context.topScorers[0].name === 'Guard A' && context.teamStatistics.teamFoulsPerGame === 18, 'Topscorer oder Fouldurchschnitt ist falsch');
otto.games[0].opponentTeamStats = { fouls: 17, completeFouls: true };
window.BT.opponents.syncLeague(leagueGames, { teamName: 'TSV Lindau', teamId: 258298 });
assert(opponents.find(item => item.teamId === 165633).games.some(game => game.opponentTeamStats?.fouls === 17), 'Bestätigte Screenshot-Daten gehen bei erneutem TeamSL-Sync verloren');

const inside = {
  id: 'inside', key: 'inside-team', name: 'Inside Team', games: leagueGames.slice(1),
  scouting: { insideThreat: 'high', perimeterThreat: 'low', primaryScorerArea: 'inside', highPostPassing: 'low', offensiveRebounding: 'medium' },
  manualTotals: { gamesWithShots: 3 },
  playerStats: [{ id: 'c', name: 'Center C', games: 3, points: 45 }, { id: 'd', name: 'Forward D', games: 3, points: 30 }]
};
assert(window.BT.opponents.recommendDefense(inside).start === 'zone212', 'Belegtes Inside-Profil führt nicht zur 2-1-2-Zone');

console.log('CourtHub Gegner-Scouting: Profile, Kennzahlen und Defense-Auswahl erfolgreich.');
