import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(index, { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
const window = dom.window;
const opponents = [];
window.BT = {
  util: {
    uuid: prefix => `${prefix}${opponents.length + 1}`,
    seasonForDate: () => '26/27',
    escapeHTML: value => String(value),
    renderTemplate: id => window.document.getElementById(id).content.firstElementChild.cloneNode(true),
    toast: () => {}
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
  seasonplanner: { scheduleConfig: () => ({ teamName: 'TSV Lindau', teamId: 258298 }) },
  api: {
    getToken: () => 'test-token',
    syncWebsiteGames: async () => ({ games: [], leagueGames: [], team: { id: 258298, name: 'TSV Lindau' } }),
    ai: async () => ({ data: { opponentName: 'TSV Ottobeuren', games: [], players: [], warnings: [] } })
  }
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

const target = window.document.createElement('main');
window.document.body.appendChild(target);
window.BT.opponents.render(target);
const fileInput = target.querySelector('[data-role="opponent-screenshots"]');
const analyzeButton = target.querySelector('[data-action="analyze-screenshots"]');
const fileLabel = target.querySelector('[data-role="opponent-file-label"]');
const fileCount = target.querySelector('[data-role="opponent-file-count"]');
assert(fileInput?.accept.includes('image/*'), 'Der Foto-Dialog ist nicht für die iPhone-Fotomediathek geöffnet');
assert(analyzeButton?.disabled, 'Die Auswertung ist ohne ausgewählte Bilder aktiv');
const selectedFiles = Array.from({ length: 12 }, (_, index) => new window.File(['score'], `dbb-score-${index + 1}.png`, { type: 'image/png' }));
Object.defineProperty(fileInput, 'files', {
  configurable: true,
  value: selectedFiles
});
fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
assert(!analyzeButton.disabled, 'Die Auswertung wird nach der Fotoauswahl nicht freigeschaltet');
assert(fileLabel.textContent === 'Auswahl ändern', 'Der Foto-Button bestätigt die Auswahl nicht');
assert(fileCount.textContent === '12 Fotos ausgewählt.', 'Die Anzahl ausgewählter Fotos wird nicht angezeigt');
assert(index.includes('href="#/opponents"') && index.includes('Gegner analysieren'), 'Auf dem Dashboard fehlt der direkte Einstieg zur Gegneranalyse');

const batches = window.BT.opponents.buildScreenshotBatches(Array.from({ length: 14 }, (_, index) => ({
  name: `bild-${index + 1}.jpg`, mimeType: 'image/jpeg', data: 'x'.repeat(100)
})));
assert(batches.length === 4 && batches[0].images.length === 4 && batches[1].images.length === 6 && batches[3].images.length === 4, 'Mehrfachimport wird nicht in überlappende KI-Pakete aufgeteilt');
assert(batches[1].startIndex === 2 && batches[1].contextCount === 2 && batches[1].images.at(-1).sourceIndex === 7, 'Spielkontext wird an Paketgrenzen nicht mitgeführt');
const merged = window.BT.opponents.mergeScreenshotResults([
  {
    batch: { startIndex: 0 },
    data: {
      opponentName: 'TSV Ottobeuren',
      games: [{ date: '2026-10-10', home: 'TSV Ottobeuren', away: 'Team A', homeScore: 70, awayScore: 60, sourceIndex: 0 }],
      players: [{ gameDate: '2026-10-10', name: 'Guard A', points: 18, sourceIndex: 1 }],
      warnings: ['Wurfversuche fehlen.']
    }
  },
  {
    batch: { startIndex: 6 },
    data: {
      opponentName: 'TSV Ottobeuren',
      games: [
        { date: '2026-10-10', home: 'TSV Ottobeuren', away: 'Team A', homeScore: 70, awayScore: 60, sourceIndex: 0 },
        { date: '2026-10-17', home: 'Team B', away: 'TSV Ottobeuren', homeScore: 62, awayScore: 74, sourceIndex: 2 }
      ],
      players: [
        { gameDate: '2026-10-10', name: 'Guard A', fouls: 2, sourceIndex: 1 },
        { gameDate: '2026-10-17', name: 'Center B', points: 14, sourceIndex: 2 }
      ],
      warnings: []
    }
  }
], 'TSV Ottobeuren');
assert(merged.games.length === 2, 'Doppelte Spiele aus mehreren KI-Paketen werden nicht zusammengeführt');
assert(merged.players.length === 2 && merged.players.find(player => player.name === 'Guard A')?.fouls === 2, 'Spielerwerte aus mehreren KI-Paketen werden nicht zusammengeführt');
assert(merged.games.find(game => game.date === '2026-10-17')?.sourceIndex === 8, 'Screenshot-Indizes werden paketübergreifend nicht korrigiert');

const madeProfileOpponent = {
  id: 'made-profile', name: 'TSV Ottobeuren',
  games: [
    { date: '2025-10-19', home: 'Team A', away: 'TSV Ottobeuren', score: '66:58', opponentTeamStats: { twoMade: 17, threeMade: 4, freeThrowsMade: 12 } },
    { date: '2025-10-25', home: 'TSV Ottobeuren', away: 'Team B', score: '82:54', opponentTeamStats: { twoMade: 24, threeMade: 5, freeThrowsMade: 19 } },
    { date: '2025-11-15', home: 'Team C', away: 'TSV Ottobeuren', score: '70:64', opponentTeamStats: { twoMade: 23, threeMade: 1, freeThrowsMade: 15 } }
  ]
};
const madeProfile = window.BT.opponents.shootingSummary(madeProfileOpponent);
assert(madeProfile.gamesWithMadeProfile === 3 && madeProfile.twoMade === 64 && madeProfile.threeMade === 10 && madeProfile.freeThrowsMade === 46, 'Sichtbare Zweier-, Dreier- und Freiwurftreffer werden nicht zusammengefasst');
assert(madeProfile.twoMadeShare === 86.5 && madeProfile.madeShotTendency === 'inside-pressure', 'Zweierlastiges Trefferprofil mit Freiwurfdruck wird nicht erkannt');
assert(madeProfile.threePointPct === null && madeProfile.fieldGoalPct === null, 'Aus Trefferzahlen ohne Versuche wird fälschlich eine Wurfquote berechnet');
assert(window.BT.opponents.recommendDefense(madeProfileOpponent).reasons.some(reason => reason.includes('keine Aussage zur Wurfquote')), 'Trefferprofil fließt nicht vorsichtig in die Defense-Empfehlung ein');
const noFreeThrowProfile = window.BT.opponents.shootingSummary({ games: [
  { opponentTeamStats: { twoMade: 20, threeMade: 3 } },
  { opponentTeamStats: { twoMade: 18, threeMade: 4 } }
] });
assert(noFreeThrowProfile.freeThrowsMade === null && noFreeThrowProfile.madeShotTendency === 'two-heavy', 'Fehlende Freiwürfe werden fälschlich als Nullwerte oder Ringdruck behandelt');

console.log('CourtHub Gegner-Scouting: Profile, Kennzahlen und Defense-Auswahl erfolgreich.');
