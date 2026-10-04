import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'style.css'), 'utf8');
const dom = new JSDOM(html, { url: 'https://coach.tsv-lindau.de/#/dashboard', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;

window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.ResizeObserver = class { observe() {} disconnect() {} };
window.requestAnimationFrame = callback => window.setTimeout(() => callback(Date.now()), 0);
window.cancelAnimationFrame = id => window.clearTimeout(id);
window.confirm = () => true;
window.alert = () => {};
window.navigator.share = undefined;
window.navigator.clipboard = { writeText: async () => {} };
Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });

const scripts = [...html.matchAll(/<script defer src="(js\/[^"]+)"/g)].map(match => match[1].split('?')[0]);
for (const file of scripts) window.eval(readFileSync(resolve(root, file), 'utf8') + '\n//# sourceURL=' + file);
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolveWait => window.setTimeout(resolveWait, 100));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const serviceWorkerEvents = new Map();
let installedCacheName = '';
let installedAssets = [];
let claimedByServiceWorker = false;
const navigatedClients = [];
runInNewContext(readFileSync(resolve(root, 'sw.js'), 'utf8'), {
  self: {
    addEventListener(type, listener) { serviceWorkerEvents.set(type, listener); },
    skipWaiting() { return Promise.resolve(); },
    clients: {
      claim() { claimedByServiceWorker = true; return Promise.resolve(); },
      matchAll() {
        return Promise.resolve([{
          url: 'https://coach.tsv-lindau.de/#/tactics',
          navigate(url) { navigatedClients.push(url); return Promise.resolve(); }
        }]);
      }
    }
  },
  caches: {
    open(name) {
      installedCacheName = name;
      return Promise.resolve({ addAll(assets) { installedAssets = assets; return Promise.resolve(); } });
    },
    keys() { return Promise.resolve([]); },
    match() { return Promise.resolve(undefined); }
  },
  Promise,
  URL,
  location: { origin: 'https://coach.tsv-lindau.de' }
});
let installWork;
serviceWorkerEvents.get('install')({ waitUntil(work) { installWork = work; } });
await installWork;
assert(/^courthub-v\d+$/.test(installedCacheName), 'Service Worker legt keinen versionsbasierten Cache an');
assert(installedAssets.every(asset => !asset.includes('?v=')), 'Service Worker cachet lokal unterschiedliche Asset-Versionen');
assert(installedAssets.includes('./js/play-designer/phase-recorder-core.js'), 'Phasenrekorder fehlt im Offline-Cache');
assert(installedAssets.includes('./js/play-designer/phase-spacing.js'), 'Abstandsprüfung fehlt im Offline-Cache');
assert(installedAssets.includes('./js/training-live.js'), 'Training Live fehlt im Offline-Cache');
assert(installedAssets.includes('./training-live.css'), 'Training-Live-Layout fehlt im Offline-Cache');
assert(installedAssets.includes('./js/station-training.js'), 'Freitags-Stationstraining fehlt im Offline-Cache');
assert(installedAssets.includes('./station-training.css'), 'Stations- und Belastungslayout fehlt im Offline-Cache');
assert(![...window.document.querySelectorAll('link[href], script[src]')].some(node => new URL(node.getAttribute(node.tagName === 'LINK' ? 'href' : 'src'), 'https://coach.tsv-lindau.de').origin === 'https://coach.tsv-lindau.de' && node.getAttribute(node.tagName === 'LINK' ? 'href' : 'src').includes('?v=')), 'HTML lädt lokal unterschiedliche Asset-Versionen');
let activateWork;
serviceWorkerEvents.get('activate')({ waitUntil(work) { activateWork = work; } });
await activateWork;
assert(claimedByServiceWorker, 'Neuer Service Worker übernimmt offene CourtHub-Fenster nicht');
assert(navigatedClients.length === 1, 'Offene CourtHub-PWA wird nach einem Update nicht neu geladen');

const viewportMeta = window.document.querySelector('meta[name="viewport"]')?.content || '';
assert(viewportMeta.includes('viewport-fit=cover'), 'Safe-Area-Unterstützung im Viewport fehlt');
assert(viewportMeta.includes('interactive-widget=resizes-content'), 'Viewport reagiert nicht auf Bildschirm und Tastatur');
assert(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(viewportMeta), 'Pinch-to-Zoom darf nicht deaktiviert sein');
assert(css.includes('position: fixed !important;') && css.includes('-webkit-backdrop-filter: none;'), 'Mobile Dock ist auf iOS nicht stabil verankert');

function route(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
}

assert(window.document.querySelector('[data-role="coach-briefing"]'), 'Dashboard-Briefing fehlt');
assert(window.document.querySelectorAll('.preview-kpi-card[href]').length === 4, 'Dashboard-Karten sind nicht vollständig verlinkt');

const storagePrototype = Object.getPrototypeOf(window.localStorage);
const originalStorageGetItem = storagePrototype.getItem;
let dashboardDataReads = 0;
storagePrototype.getItem = function(key) {
  if (key === 'beepTest_v1') dashboardDataReads++;
  return originalStorageGetItem.call(this, key);
};
const dashboardProbe = window.document.createElement('div');
window.BT.dashboard.render(dashboardProbe);
storagePrototype.getItem = originalStorageGetItem;
assert(dashboardDataReads === 1, 'Dashboard lädt den vollständigen Datenbestand mehrfach: ' + dashboardDataReads);
assert(dashboardProbe.querySelector('[data-role="coach-briefing"]'), 'Optimiertes Dashboard wurde nicht vollständig gerendert');

const player = window.BT.storage.upsertPlayer({ name: 'Test Spieler', position: 'Guard', jerseyNumber: '11', availability: 'limited', goals: [] });
route('#/player/' + player.id);
assert(window.document.querySelector('[data-role="development-panel"]'), 'Spielerziele fehlen');

const game = window.BT.storage.upsertGame({ team: 'herren', date: '2026-08-01', home: 'TSV Lindau', away: 'Testverein', score: '72:65', playerStats: [] });
route('#/games');
await new Promise(resolveWait => window.setTimeout(resolveWait, 20));
const gameButton = window.document.querySelector('[data-game-id="' + game.id + '"]');
assert(gameButton, 'Spiel wurde nicht gerendert');
gameButton.click();
assert(window.document.querySelector('.atlas-panel'), 'Atlas-Bereich fehlt');
assert(window.document.querySelector('.game-boxscore'), 'Spieler-Boxscore fehlt');
assert(window.document.querySelector('.game-opponent-plan')?.textContent.includes('Mannverteidigung'), 'Gegnerplan fehlt in der Spielvorbereitung');
assert(window.document.querySelector('[data-action="open-matchday"]')?.textContent === 'Kader & Starting Five festlegen', 'Der sichtbare Einstieg zur Mannschaftsplanung fehlt');
assert(/Kader\s+0.*Starting Five\s+0\/5/.test(window.document.querySelector('[data-role="game-preparation-summary"]')?.textContent || ''), 'Der Spielkarte fehlt der sichtbare Stand von Kader und Starting Five');
const livePlayers = [player, ...Array.from({ length: 5 }, (_, index) => window.BT.storage.upsertPlayer({
  name: 'Live Spieler ' + (index + 1), position: 'Guard', jerseyNumber: String(index + 20), availability: 'ready', goals: []
}))];
const liveRoster = livePlayers.map((entry, index) => ({
  id: entry.id, name: entry.name, jerseyNumber: entry.jerseyNumber, gameStatus: index < 5 ? 'starter' : 'bench'
}));
const changedRoster = liveRoster.map((entry, index) => Object.assign({}, entry, {
  gameStatus: index === 4 ? 'dnp' : index === 5 ? 'starter' : entry.gameStatus,
  ...(index === 4 ? { absenceReason: 'not-selected', jerseyNumber: null } : {})
}));
game.liveStats = { schemaVersion: 1, selectedSessionId: 'live-summary', resolutionRevision: 0, sessions: [{
  schemaVersion: 3, id: 'live-summary', deviceId: 'smoke-device', actorId: 'smoke-coach', roster: liveRoster,
  startingFive: liveRoster.slice(0, 5).map(entry => entry.id), config: { periods: 4, periodMs: 600000, overtimeMs: 300000 },
  events: [
    { id: 'roster-change', sessionId: 'live-summary', seq: 1, kind: 'roster', period: 1, remainingMs: 600000, recordedAt: '2026-10-04T08:00:00.000Z', payload: { players: changedRoster } },
    { id: 'lineup-change', sessionId: 'live-summary', seq: 2, kind: 'starting-five', period: 1, remainingMs: 600000, recordedAt: '2026-10-04T08:00:01.000Z', payload: { playerIds: [liveRoster[0].id, liveRoster[1].id, liveRoster[2].id, liveRoster[3].id, liveRoster[5].id] } }
  ]
}] };
window.BT.storage.upsertGame(game);
route('#/dashboard');route('#/games');
await new Promise(resolveWait => window.setTimeout(resolveWait, 20));
window.document.querySelector('[data-game-id="' + game.id + '"]').click();
const dynamicPreparation = window.document.querySelector('[data-role="game-preparation-summary"]')?.textContent || '';
assert(/Kader\s+5.*Starting Five\s+5\/5/.test(dynamicPreparation), 'Die Spielübersicht liest nicht den fortgeschriebenen Live-Kader: ' + dynamicPreparation);
assert(!window.document.querySelector('[data-player-id="' + liveRoster[4].id + '"]'), 'Ein abgewählter Spieler bleibt in der Spielstatistik sichtbar');
assert(window.document.querySelector('[data-player-id="' + liveRoster[5].id + '"]'), 'Ein nachnominierter Spieler fehlt in der Spielstatistik');
window.BT.api.getAtlasAnalysis = async () => ({
  importedAt: new Date().toISOString(),
  package: {
    schema_version: 'game-analysis-overview.v1', game_id: 'atlas-game-1', latest_job_id: 'atlas-job-1', scoreboard: { home_score: 72, away_score: 65 }, quality_report: {},
    totals: { points: 12, field_goals_made: 5, field_goals_attempted: 10, free_throws_made: 2, free_throws_attempted: 4, assists: 4, rebounds: 7, steals: 2, blocks: 1, turnovers: 3, fouls: 2 },
    teams: [], players: [{ entity_id: '#11', points: 12, field_goals_made: 5, field_goals_attempted: 10, free_throws_made: 2, free_throws_attempted: 4, assists: 4, rebounds: 7, steals: 2, blocks: 1, turnovers: 3, fouls: 2 }],
    verification: { total_events: 10, reviewable_events: 10, informational_events: 0, verified_events: 10, open_reviews: 0, completed_reviews: 2, rejected_events: 0 },
    events: [{ candidate_id: 'event-1', event_type: 'steal', timestamp_seconds: 42, player_ids: ['#11'], team_id: 'tsv-lindau', confidence: .96, result: null, verification_status: 'validated', review_task_id: null, review_reason: null }]
  }
});
window.document.querySelector('[data-role="atlas-game-id"]').value = 'atlas-game-1';
window.document.querySelector('[data-action="load-atlas"]').click();
await new Promise(resolveWait => window.setTimeout(resolveWait, 100));
assert(window.document.querySelector('.atlas-stat-strip'), 'Echter Atlas-Vertrag wurde nicht gerendert');
assert(window.document.querySelector('.atlas-linked'), 'Atlas-Spieler wurde nicht über Trikotnummer zugeordnet');
assert(window.document.querySelector('[data-player-id="' + player.id + '"] [data-stat="points"]').value === '12', 'Atlas-Boxscore wurde nicht übernommen');

route('#/opponents');
await new Promise(resolveWait => window.setTimeout(resolveWait, 20));
assert(window.document.querySelector('.opponents-view'), 'Gegner-Scouting ist nicht erreichbar');
assert(window.document.querySelector('[data-opponent-id]'), 'Gegnerprofil wird nicht aus dem eigenen Spielplan angelegt');
assert(window.document.querySelector('.opponent-defense-card')?.textContent.includes('Mannverteidigung'), 'Sichere Defense-Basis bei niedriger Datenlage fehlt');
assert(window.document.querySelector('[data-role="opponent-screenshots"][multiple]'), 'Mehrfachauswahl für DBB.Scores-Screenshots fehlt');

const futureTrainingDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const secondTrainingDate = new Date(Date.now() + 172800000).toISOString().slice(0, 10);
const training = window.BT.storage.upsertTraining({
  date: futureTrainingDate, startTime: '20:15', note: '', attendance: [{ playerId: player.id, status: null, late: false, note: '' }], freethrows: [], shots: [],
  plan: { durationMinutes: 90, drills: [{ name: 'Defense', minutes: 20, intensity: 'high' }] }
});
window.BT.storage.upsertTraining({
  date: secondTrainingDate, startTime: '20:15', note: 'Folgetraining', attendance: [{ playerId: player.id, status: null, late: false, note: '' }], freethrows: [], shots: []
});
route('#/training/' + training.id);
const trainingBeforeTimer = JSON.stringify(window.BT.storage.getTraining(training.id));
window.document.querySelector('[data-action="training-timer"]').click();
assert(window.document.querySelector('dialog.training-timer[open]'), 'Trainingsuhr wird nicht geöffnet');
window.document.querySelector('[data-tt="score-0-2"]').click();
window.document.querySelector('[data-tt="close"]').click();
window.document.querySelector('[data-action="training-timer"]').click();
assert(window.document.querySelector('[data-tt="points-0"]').textContent === '2', 'Punkte gehen beim Rückwechsel verloren');
window.document.querySelector('[data-tt="close"]').click();
assert(JSON.stringify(window.BT.storage.getTraining(training.id)) === trainingBeforeTimer, 'Timer darf Trainingsstatistiken nicht verändern');
assert(window.document.querySelector('[data-role="plan-duration"]').value === '90', 'Trainingsdauer wurde nicht geladen');
assert(window.document.querySelector('.intensity-high'), 'Belastungsstufe fehlt');
assert(window.document.querySelector('[data-role="checkin-card"]'), 'QR-Check-in fehlt');
assert(!window.document.querySelector('[data-action="export-pdf"]'), 'Einzelner Trainings-PDF-Export darf nicht mehr angeboten werden');
assert(window.document.querySelector('[data-action="training-live"]')?.textContent.includes('Training durchführen'), 'Sichtbarer Einstieg in Training Live fehlt');
window.document.querySelector('[data-action="training-live"]').click();
assert(window.document.querySelector('.training-live'), 'Training Live wird nicht geöffnet');
assert(window.document.querySelector('[data-live="block-name"]')?.textContent === 'Defense', 'Training Live übernimmt den geplanten Drill nicht');
window.document.querySelector('[data-live-action="close"]').click();
assert(!window.document.querySelector('.training-live'), 'Training Live wird nicht sauber geschlossen');
window.document.querySelector('[data-action="end-training"]').click();
await new Promise(resolveWait => window.setTimeout(resolveWait, 20));
const endedTraining = window.BT.storage.getTraining(training.id);
assert(endedTraining.endedAt && endedTraining.status === 'completed', 'Training wurde durch Beenden nicht abgeschlossen gespeichert');
route('#/training');
assert(window.document.querySelectorAll('[data-role="upcoming-list"] > li').length === 1, 'Anstehende Trainings sind nicht sauber getrennt');
assert(window.document.querySelectorAll('[data-role="completed-list"] > li').length === 1, 'Absolvierte Trainings sind nicht sauber getrennt');
assert(window.document.querySelector('[data-role="completed-list"] [data-delete-training]'), 'Löschen fehlt bei absolvierten Trainings');

const deletableFromList = window.BT.storage.upsertTraining({
  date: new Date(Date.now() + 259200000).toISOString().slice(0, 10), startTime: '20:15', note: 'Aus Liste löschen',
  attendance: [], freethrows: [], shots: []
});
route('#/training');
const listDeleteButton = window.document.querySelector('[data-delete-training="' + deletableFromList.id + '"]');
assert(listDeleteButton, 'Sichtbarer Löschbutton in der Trainingsliste fehlt');
listDeleteButton.click();
assert(!window.BT.storage.getTraining(deletableFromList.id), 'Training wurde aus der Liste nicht gelöscht');

const deletableFromDetail = window.BT.storage.upsertTraining({
  date: new Date(Date.now() + 345600000).toISOString().slice(0, 10), startTime: '20:15', note: 'Im Detail löschen',
  attendance: [], freethrows: [], shots: []
});
route('#/training/' + deletableFromDetail.id);
window.document.querySelector('[data-action="delete"]').click();
assert(!window.BT.storage.getTraining(deletableFromDetail.id), 'Training wurde im Detail nicht gelöscht');

route('#/reports');
assert(window.document.querySelector('.reports-view'), 'Auswertungs-Reiter fehlt');
assert(window.document.querySelector('[data-role="report-player-rows"] tr'), 'Spieler-Gesamtauswertung wurde nicht gerendert');
assert(window.document.querySelector('[data-action="report-csv"]'), 'CSV-Export der Gesamtauswertung fehlt');
assert(window.document.querySelector('[data-action="report-pdf"]'), 'PDF-Export der Gesamtauswertung fehlt');

function createPdfStub() {
  const events = [];
  const pages = [{ orientation: 'landscape', width: 841.89, height: 595.28 }];
  let pageIndex = 0;
  return {
    events, pages,
    doc: {
      internal: {
        pageSize: { getWidth: () => pages[pageIndex].width, getHeight: () => pages[pageIndex].height },
        getNumberOfPages: () => pages.length
      },
      addPage: (_format, orientation) => {
        const portrait = orientation === 'portrait';
        pages.push({ orientation: portrait ? 'portrait' : 'landscape', width: portrait ? 595.28 : 841.89, height: portrait ? 841.89 : 595.28 });
        pageIndex = pages.length - 1;
      },
      text: value => events.push(Array.isArray(value) ? value.join(' ') : String(value)),
      setPage: page => { pageIndex = page - 1; },
      setCharSpace() {}, setFillColor() {}, rect() {}, setDrawColor() {}, roundedRect() {}, setTextColor() {}, setFont() {}, setFontSize() {}, line() {},
      splitTextToSize: value => [String(value)]
    }
  };
}
const reportPdf = {
  seasonLabel: 'Saison 26/27', generatedAt: new Date('2026-08-03T10:00:00Z'), throughDate: '2026-08-02', trainings: [], games: [],
  team: { wins: 2, losses: 1, draws: 0, attendance: { total: 4, pct: 75 }, trainingFG: { made: 12, attempted: 24, pct: 50 }, trainingFT: { made: 8, attempted: 10, pct: 80 } },
  teamCategories: [{ category: 'Closeout-Würfe', made: 5, attempted: 10, pct: 50 }],
  players: [{
    player: { name: 'Sehr langer Beispielname ohne Kürzung' },
    training: { attendance: { total: 4, pct: 75 }, fg: { made: 6, attempted: 12, pct: 50 }, ft: { made: 4, attempted: 5, pct: 80 }, categories: new Map([['Closeout-Würfe', { category: 'Closeout-Würfe', made: 5, attempted: 10, pct: 50 }]]) },
    game: { games: 3, ppg: 8.5, fieldGoalsAttempted: 12, fgPct: 50, freeThrowsAttempted: 4, ftPct: 75, rebounds: 9, assists: 6, turnovers: 3 }, beep: null
  }]
};
const reportPdfStub = createPdfStub();
window.BT.reports.buildPDF(reportPdfStub.doc, reportPdf);
assert(reportPdfStub.events.includes('Leistungsübersicht'), 'Leistungsübersicht fehlt im PDF');
assert(reportPdfStub.events.includes('Spielwerte'), 'Spielwerte fehlen im PDF');
assert(reportPdfStub.events.some(text => text.includes('Sehr langer Beispielname ohne Kürzung')), 'Spielername wurde im PDF gekürzt');
assert(reportPdfStub.pages.some(page => page.orientation === 'portrait'), 'Wurfprofile werden nicht im Hochformat ausgegeben');
const emptyReportPdfStub = createPdfStub();
window.BT.reports.buildPDF(emptyReportPdfStub.doc, { ...reportPdf, players: [] });
assert(!emptyReportPdfStub.events.includes('Wurfprofile je Spieler'), 'Leere Wurfprofil-Seite wurde erzeugt');

route('#/account');
const darkChoice = window.document.querySelector('[data-theme-choice="dark"]');
assert(darkChoice, 'Darstellungswahl in Konto & Sync fehlt');
darkChoice.click();
assert(window.document.documentElement.getAttribute('data-theme') === 'dark', 'Dunkelmodus wurde nicht aktiviert');
window.document.querySelector('[data-theme-choice="light"]').click();
assert(!window.document.documentElement.hasAttribute('data-theme'), 'Hellmodus wurde nicht aktiviert');

player.tableDutyLicense = true;
window.BT.storage.upsertPlayer(player);
const dutyPlayer2 = window.BT.storage.upsertPlayer({ name: 'Kampfgericht Zwei', position: 'Guard', jerseyNumber: '12', tableDutyEnabled: true, tableDutyLicense: false, goals: [] });
const dutyPlayer3 = window.BT.storage.upsertPlayer({ name: 'Kampfgericht Drei', position: 'Center', jerseyNumber: '13', tableDutyEnabled: true, tableDutyLicense: false, goals: [] });
route('#/tablecrew');
window.document.querySelector('[data-action="tablecrew-preset"]').click();
assert(window.BT.storage.getTableDuties().length === 6, 'Die sechs U14-Heimspiele wurden nicht vollständig übernommen');
window.document.querySelector('[data-action="tablecrew-auto"]').click();
const dutyGames = window.BT.storage.getTableDuties();
dutyGames.forEach(gameEntry => {
  const assigned = Object.values(gameEntry.assignments || {}).filter(Boolean);
  assert(assigned.length === 3 && new Set(assigned).size === 3, 'Kampfgericht ist nicht mit drei verschiedenen Personen besetzt');
  const laptop = window.BT.storage.getPlayer(gameEntry.assignments.laptop);
  assert(laptop && laptop.tableDutyLicense === true, 'Laptop wurde ohne Lizenz besetzt');
});
const kaufbeurenDuty = dutyGames.find(gameEntry => gameEntry.date === '2027-02-27');
assert(kaufbeurenDuty && kaufbeurenDuty.away === 'DJK Kaufbeuren', 'Heimspiel gegen Kaufbeuren fehlt');
assert(window.BT.tablecrew.meetingTime(kaufbeurenDuty.time) === '13:45', 'Treffpunkt wurde nicht 45 Minuten vor Spielbeginn berechnet');
assert(window.document.querySelector('[data-action="tablecrew-excel"]'), 'Excel-Export für das Kampfgericht fehlt');
assert(window.document.querySelector('[data-action="tablecrew-pdf"]'), 'PDF-Export für das Kampfgericht fehlt');

assert(window.BT.seasonplanner.parseLeagueId('https://www.basketball-bund.net/static/#/liga/54509/spielplan') === 54509, 'Liga-ID wird nicht aus dem offiziellen Link gelesen');
window.BT.seasonplanner.saveScheduleConfig({
  url: 'https://www.basketball-bund.net/static/#/liga/54509/spielplan',
  teamId: 258298,
  teamName: 'TSV Lindau'
});
[
  ['2026-10-11', 'TSV Lindau', 'BG Illertal 3'],
  ['2026-10-17', 'TSV Wasserburg/Günzburg', 'TSV Lindau'],
  ['2027-03-06', 'TSV Ottobeuren 2', 'TSV Lindau']
].forEach((entry, index) => window.BT.storage.upsertGame({
  externalId: 'dbb_test_' + index,
  officialMatchId: String(2924661 + index),
  source: 'basketball-bund', provider: 'TeamSL', team: 'herren', leagueId: 54509,
  date: entry[0], time: '17:00', home: entry[1], away: entry[2], status: 'upcoming'
}));
window.BT.storage.setSetting('regularDays', ['tue', 'fri']);
window.BT.storage.setSetting('regularTime', '20:15');
const seasonGames = window.BT.storage.getGames().filter(entry => entry.source === 'basketball-bund');
const seasonSlots = window.BT.seasonplanner.buildSlots(seasonGames, { days: ['tue', 'fri'], time: '20:15', startDate: '2026-08-01' });
assert(seasonSlots.length > 20, 'Saisontermine bis zum letzten Spiel fehlen');
assert(!seasonSlots.some(slot => slot.date >= '2026-08-03' && slot.date <= '2026-09-14'), 'Training wurde in den Sommerferien geplant');
assert(!seasonSlots.some(slot => slot.date >= '2026-12-24' && slot.date <= '2027-01-08'), 'Training wurde in den Weihnachtsferien geplant');
assert(seasonSlots.some(slot => slot.weekday === 'tue' && slot.load === 'high'), 'Dienstag ist nicht als Haupttrainingstag priorisiert');
assert(seasonSlots.some(slot => slot.date === '2026-10-09' && slot.fridayStationMode && slot.weekendGame?.date === '2026-10-11'), 'Freitag vor einem Wochenendspiel wird nicht als Stationstraining markiert');
const protectedSlot = seasonSlots[0];
// Earlier timer fixtures use today + 1/+2 days and can fall on these season
// slots. Isolate this scenario so exactly one manual training is protected.
window.BT.storage.getTrainings().forEach(entry => window.BT.storage.deleteTraining(entry.id));
const manualTraining = window.BT.storage.upsertTraining({
  date: protectedSlot.date, startTime: '20:15', note: 'Manuell geschützt',
  attendance: [], freethrows: [], shots: [], plan: { summary: 'Manuell', drills: [] }
});
const manualBefore = JSON.stringify(window.BT.storage.getTraining(manualTraining.id));
const aiSeasonResponse = {
  trainings: seasonSlots.map(slot => {
    const stationDrills = [10, 10, 15, 15, 15, 15, 15, 10].map((minutes, index) => ({
      name: `KI Freitag Block ${index + 1}`, minutes, intensity: 'low', description: `Individuelle KI-Aufgabe ${index + 1}`
    }));
    return {
      date: slot.date,
      summary: slot.fridayStationMode ? 'KI-Spielwochenstationen' : slot.weekday === 'tue' ? 'Haupttraining' : 'Freitagsfestigung',
      evidenceBasis: {
        observedTrends: ['Wiederkehrendes Muster aus vorherigen Spielen und Trainings'],
        loadConsiderations: ['Belastung passend zum Abstand zum nächsten Spiel'],
        planningDecision: 'Der Trainingsaufbau verbindet den erkannten Trend mit den dauerhaften Teamprinzipien.'
      },
      freethrows: { attempted: 20 },
      shots: [{ category: 'Catch-and-Shoot', attempted: 20 }],
      drills: slot.fridayStationMode ? stationDrills : [
        { name: 'KI Warm-up', minutes: 15, intensity: 'low', description: 'Mobilisieren und Ballgefühl' },
        { name: 'KI Hauptblock', minutes: 65, intensity: slot.load, description: 'Spielnaher Schwerpunkt' },
        { name: 'KI 5-gegen-5', minutes: 25, intensity: slot.load, description: 'Strukturiertes Abschlussspiel' }
      ],
      stationTraining: slot.fridayStationMode ? {
        rationale: 'Von der KI passend zur aktuellen Spielwoche neu geplant.',
        stations: Array.from({ length: 5 }, (_, index) => ({
          title: `KI Wochenstation ${index + 1}`, category: `Kategorie ${index + 1}`, description: `Individuelle Aufgabe ${index + 1}`
        }))
      } : null,
      fridayVariants: slot.weekday === 'fri' && !slot.fridayStationMode ? {
        over8: [{ name: 'KI Teamtaktik', minutes: 105, intensity: slot.load, description: '4-gegen-4 und 5-gegen-5' }],
        eightOrLess: [{ name: 'KI Small-Sided', minutes: 105, intensity: slot.load, description: '1-gegen-1 bis 3-gegen-3' }]
      } : null
    };
  })
};
const appliedSeason = window.BT.seasonplanner.applyAIPlan(aiSeasonResponse, seasonSlots);
assert(appliedSeason.protected >= 1, 'Manuelles Training wurde nicht als geschützt gezählt');
assert(JSON.stringify(window.BT.storage.getTraining(manualTraining.id)) === manualBefore, 'Manuelles Training wurde verändert');
assert(appliedSeason.created + appliedSeason.updated + appliedSeason.protected + appliedSeason.missing === seasonSlots.length, 'KI-Saisontrainings wurden nicht vollständig verarbeitet');
assert(window.BT.storage.getDrills().some(drill => drill.source === 'ai-season'), 'KI-Trainingsblöcke fehlen in der Drill-Bibliothek');
assert(window.BT.storage.getTemplates().some(template => template.source === 'ai-season'), 'KI-Trainings fehlen in der Vorlagenbibliothek');
const stationFriday = window.BT.storage.getTrainings().find(entry => entry.date === '2026-10-09');
assert(stationFriday?.planning?.source === 'ai-friday-stations' && stationFriday.plan.durationMinutes === 105, 'Saisonplanung übernimmt das KI-generierte 105-Minuten-Stationstraining nicht automatisch');
assert(stationFriday.stationTraining.stations[0].title === 'KI Wochenstation 1', 'Saisonplanung ersetzt die KI-Stationen durch die feste Rotation');
const fridayTraining = window.BT.storage.getTrainings().find(entry => entry.planning?.source === 'ai-season' && entry.plan?.variants);
assert(fridayTraining && fridayTraining.plan.variants.over8.length && fridayTraining.plan.variants.eightOrLess.length, 'Freitagsvarianten für die Spielerzahl fehlen');
window.BT.storage.upsertGame({
  id: 'performance-game', team: 'herren', date: '2027-05-30', home: 'TSV Lindau', away: 'Trendgegner', score: '66:61',
  improvements: 'Defensive Rückwärtsbewegung war wiederholt zu langsam.',
  playerStats: [{ playerId: player.id, minutes: 28, points: 12, fieldGoalsMade: 5, fieldGoalsAttempted: 11, rebounds: 7, assists: 3, turnovers: 2 }]
});
window.BT.storage.upsertTraining({
  date: '2027-05-29', status: 'completed', endedAt: '2027-05-29T21:45:00Z',
  attendance: [{ playerId: player.id, status: 'present' }], freethrows: [{ playerId: player.id, made: 7, attempted: 10 }], shots: [],
  plan: { summary: 'Transition Defense', durationMinutes: 90, loadTarget: 'medium', drills: [{ name: 'Sprint-to-gap', minutes: 90, intensity: 'medium' }] }
});
const batchPayload = window.BT.seasonplanner.buildAIPayload(
  Array.from({ length: 17 }, (_, index) => ({
    date: '2027-06-' + String(index + 1).padStart(2, '0'), weekday: 'tue', time: '20:15', load: 'medium', loadReason: 'Test'
  })),
  { focus: 'Defense' }
);
assert(batchPayload.teamStrategy.replacesPrevious === true, 'Der Strategiewechsel ersetzt die alten Teamprinzipien nicht verbindlich');
assert(batchPayload.teamStrategy.allowedDefenseIds.join(',') === 'man', 'Die neue Basis lässt weiterhin alte Zonenverteidigungen zu');
assert(batchPayload.tacticalPlaybook.map(item => item.id).join(',') === 'pick-and-roll,pick-and-pop,pick-and-roll-reject', 'Die KI erhält nicht ausschließlich die aktive PnR-Basis');
assert(!batchPayload.tacticalPlaybook.some(item => /horns|five-out|5-out|zone/i.test(`${item.id} ${item.title}`)), 'Archivierte Systeme gelangen weiterhin in das aktive KI-Playbook');
assert(batchPayload.coachInput.strategyChange.includes('ersetzt'), 'Der vollständige Strategiewechsel fehlt im Trainerkontext');
assert(batchPayload.balancePolicy.maxProblemSharePercent === 25, 'Problemeingaben werden im KI-Payload nicht auf 25 Prozent begrenzt');
assert(batchPayload.balancePolicy.fridayMaxProblemStations === 1, 'Ein Problem darf zu viele Freitagstationen bestimmen');
assert(batchPayload.performanceContext.games.some(game => game.opponent === 'Trendgegner' && game.teamBoxscore.fieldGoalPct === 45), 'Vorherige Spielwerte fehlen in der KI-Auswertung');
assert(batchPayload.performanceContext.completedTrainings.some(training => training.summary === 'Transition Defense' && training.freeThrows.pct === 70), 'Vorherige Trainingswerte fehlen in der KI-Auswertung');
assert(batchPayload.performanceContext.playerLoadBeforeFirstSlot.some(entry => entry.player === player.name && entry.gameMinutesLast7Days === 28), 'Spielminuten fließen nicht in die Belastungsanalyse ein');
assert(batchPayload.performanceContext.playerLoadByWeek.length === 4 && batchPayload.performanceContext.playerLoadByWeek.at(-1).players.some(entry => entry.player === player.name && entry.gameMinutes === 28), 'Mehrwöchiger Belastungsverlauf fehlt in der KI-Auswertung');
const batchSizes = [];
const batchResult = await window.BT.seasonplanner.planInBatches(batchPayload, async data => {
  batchSizes.push(data.slots.length);
  return { data: { trainings: data.slots.map(slot => ({ date: slot.date, drills: [] })) } };
});
assert(batchSizes.length === 17 && batchSizes.every(size => size === 1), 'Saisonplanung teilt Slots nicht in sichere Einzelanfragen');
assert(batchResult.trainings.length === 17, 'Antworten aller Blöcke wurden nicht gesammelt');

function responseForSlots(slots) {
  return { data: { trainings: slots.map(slot => ({ date: slot.date, summary: 'KI ' + slot.date, drills: [] })) } };
}

const firstBatchPayload = { ...batchPayload, slots: batchPayload.slots.slice(0, 2) };
const retryPayload = { ...batchPayload, slots: batchPayload.slots.slice(0, 1) };
let retryCalls = 0;
const retryProgress = [];
const retriedResult = await window.BT.seasonplanner.planInBatches(
  retryPayload,
  async data => {
    retryCalls++;
    return retryCalls === 1
      ? { data: { trainings: [] } }
      : responseForSlots(data.slots);
  },
  progress => retryProgress.push(progress)
);
assert(retryCalls === 2, 'Ungültiger KI-Block wurde nicht einmal erneut angefragt');
assert(retriedResult.trainings.length === 1, 'Erfolgreicher Retry liefert das Training nicht zurück');
assert(retryProgress.some(item => item.attempt === 2), 'Retry-Fortschritt wird nicht gemeldet');
assert(window.BT.schedule.seasonPlanningProgressText({ block: 2, total: 5, attempt: 1 }) === 'KI plant Training 2 von 5 …', 'Erster Trainingsstatus ist falsch');
assert(window.BT.schedule.seasonPlanningProgressText({ block: 2, total: 5, attempt: 2 }) === 'KI versucht Training 2 von 5 erneut …', 'Retry-Trainingsstatus ist falsch');
assert(window.BT.schedule.seasonPlanningProgressText({ block: 1, total: 5, attempt: 0, resumed: true }) === 'Training 1 von 5 aus dem Entwurf übernommen …', 'Fortsetzungsstatus ist falsch');
const visibleAIError = window.BT.schedule.aiErrorText({ message: 'Zeitlimit', code: 'AI_TIMEOUT', requestId: 'ai_test' }, 'KI-Saisonplanung fehlgeschlagen');
assert(visibleAIError.includes('AI_TIMEOUT') && visibleAIError.includes('ai_test'), 'Sichtbare KI-Fehlermeldung enthält Code oder Request-ID nicht');
let finalConfirmationText = '';
assert(window.BT.schedule.confirmSeasonPlanResult(
  { trainings: firstBatchPayload.slots.map(slot => ({ date: slot.date })) },
  firstBatchPayload.slots,
  text => { finalConfirmationText = text; return false; }
) === false, 'Abgelehnter KI-Gesamtplan wird zur Übernahme freigegeben');
assert(finalConfirmationText.includes('2') && finalConfirmationText.includes('noch nicht gespeichert'), 'Abschlussbestätigung zeigt keine prüfbare Ergebnisvorschau');

const invalidResponses = [
  { data: { trainings: [
    { date: firstBatchPayload.slots[0].date, drills: [] },
    { date: firstBatchPayload.slots[0].date, drills: [] }
  ] } },
  { data: { trainings: [{ date: firstBatchPayload.slots[0].date, drills: [] }, { date: '2099-01-01', drills: [] }] } }
];
for (const invalidResponse of invalidResponses) {
  let calls = 0;
  let rejected = false;
  try {
    await window.BT.seasonplanner.planInBatches(
      firstBatchPayload,
      async () => { calls++; return invalidResponse; }
    );
  } catch (error) {
    rejected = /^KI-Training 1 von 2 fehlgeschlagen:/.test(error.message);
  }
  assert(calls === 2, 'Ungültige KI-Antwort wurde nicht exakt zweimal angefragt');
  assert(rejected, 'Endgültig ungültige KI-Antwort benennt den fehlerhaften Trainingstermin nicht');
}

let rejectedBatch = false;
const failingPayload = { ...batchPayload, slots: [
  { date: '2026-10-06', weekday: 'tue' }, { date: '2026-10-09', weekday: 'fri' },
  { date: '2026-10-13', weekday: 'tue' }, { date: '2026-10-16', weekday: 'fri' },
  { date: '2026-10-20', weekday: 'tue' }
] };
try {
  await window.BT.seasonplanner.planInBatches(failingPayload, async data => {
    if (data.slots[0].date === '2026-10-20') throw new Error('Blockfehler');
    return responseForSlots(data.slots);
  });
} catch (error) {
  rejectedBatch = error.message === 'KI-Training 5 von 5 fehlgeschlagen: Blockfehler';
}
assert(rejectedBatch, 'Ein Trainingsfehler bricht die Saisonplanung nicht zuverlässig ab');

route('#/schedule');
assert(window.document.querySelector('[data-action="generate-season"]'), 'KI-Saisonplanung fehlt im Trainingsplan');
assert(window.document.querySelector('[data-role="season-plan-summary"]'), 'Saisonübersicht fehlt');
assert(window.document.querySelector('[data-role="team-strategy-card"]'), 'Das verbindliche Teamkonzept fehlt in der Saisonplanung');
assert(window.document.querySelectorAll('[data-strategy-tactic]:checked').length === 3, 'Die drei PnR-Basistaktiken sind nicht aktiv vorausgewählt');
assert([...window.document.querySelectorAll('[data-strategy-tactic]:checked')].every(input => input.dataset.strategyTactic.startsWith('pick-and-')), 'Eine alte Taktik ist im Teamkonzept weiterhin aktiv');

const migratedTactic = window.BT.tactics.normalizeBoard({
  players: [{ id: 'p1', label: '1', x: 120, y: 380 }],
  ball: { x: 250, y: 380 },
  arrows: [{ x1: 1, y1: 2, x2: 3, y2: 4, style: 'pass' }],
  texts: [{ x: 1, y: 2, text: 'Horns' }]
});
assert(migratedTactic.steps[0].elements.filter(item => item.type === 'offense').length === 1, 'Alte Spieler werden nicht zu Angriff-Tokens migriert');
assert(migratedTactic.steps[0].elements.some(item => item.type === 'arrow' && item.kind === 'pass'), 'Alter Passpfeil wird nicht migriert');

route('#/tactics');
assert(window.document.querySelector('[data-tool="offense"]'), 'Angriffs-Token-Werkzeug fehlt');
assert(window.document.querySelector('[data-tool="defense"]'), 'Verteidigungs-Token-Werkzeug fehlt');
assert(window.document.querySelector('[data-action="save-tactic"]'), 'Speichern in die Team-Taktiken fehlt');
assert(window.document.querySelector('[data-action="export-pdf"]'), 'PDF-Export des Taktikboards fehlt');
assert(window.document.querySelector('[data-role="tactic-template"]'), 'Vorlagenauswahl fehlt');
assert(window.document.querySelectorAll('.tactics-token.offense').length === 5, 'Startboard enthÃ¤lt nicht fÃ¼nf Angreifer');
assert(window.document.querySelectorAll('.tactics-token.defense').length === 5, 'Startboard enthÃ¤lt nicht fÃ¼nf Verteidiger');
assert(window.BT.tactics.templates().map(template => template.id).join(',') === 'pick-and-roll,pick-and-pop,pick-and-roll-reject,zone-2-3,five-out,horns,no-middle', 'PnR-Basis und historische Taktikvorlagen fehlen');
const clonedTacticStep = window.BT.tactics.cloneStep(migratedTactic.steps[0]);
assert(clonedTacticStep.elements.find(item => item.type === 'offense').id === migratedTactic.steps[0].elements.find(item => item.type === 'offense').id, 'Schrittklone verlieren Token-IDs und können nicht animiert werden');
const exportStyles = ['run', 'pass', 'dribble', 'screen', 'closeout', 'rotation'].map(kind => window.BT.tactics.arrowStyle(kind).color);
assert(new Set(exportStyles).size === 6, 'GIF- und PDF-Export unterscheiden die sechs Pfeiltypen nicht');
const pdfLayout = window.BT.tactics.pdfLayout();
assert(pdfLayout.courtY + pdfLayout.courtHeight < pdfLayout.legendY && pdfLayout.legendY < pdfLayout.pageHeight, 'Taktik-PDF überlappt Legende oder Seitenrand');
assert(css.includes('.tactics-preview-court .tactics-arrow.run') && css.includes('.tactics-preview-court .tactics-arrow.pass'), 'Spieleransicht zeichnet Lauf- und Passpfeile nicht');
const storedTactic = window.BT.storage.upsertTactic({ title: 'Smoke Play', steps: migratedTactic.steps, published: true });
assert(window.BT.storage.getTactics().some(item => item.id === storedTactic.id), 'Gespeicherte Taktik fehlt im gemeinsamen Speicher');
const strategyWithCustomPlay = window.BT.teamStrategy.save({
  ...window.BT.teamStrategy.current(),
  activeTacticIds: [...window.BT.teamStrategy.current().activeTacticIds, storedTactic.id]
});
const customTacticPayload = window.BT.seasonplanner.buildAIPayload([{ date: '2027-06-22', weekday: 'tue' }], { focus: 'Test' });
assert(strategyWithCustomPlay.activeTacticIds.includes(storedTactic.id) && customTacticPayload.tacticalPlaybook.some(item => item.id === storedTactic.id), 'Eine neu aktivierte eigene Taktik wird nicht an die KI übergeben');
route('#/tactics/player');
assert(window.document.querySelector('[data-role="player-tactics"]'), 'Spieleransicht fÃ¼r angemeldete Teammitglieder fehlt');
assert(window.document.body.textContent.includes('Bitte zuerst anmelden'), 'Die Spieleransicht ist ohne Anmeldung nicht geschÃ¼tzt');

const importBackup = {
  schemaVersion: 2,
  players: [], sessions: [], trainings: [], notes: [], freethrows: [], drills: [], templates: [],
  games: [{ id: 'import-game', home: 'TSV Lindau', away: 'Import Team' }],
  tactics: [{ id: 'import-tactic', title: 'Importierte Taktik', steps: [], published: true }],
  tableDuties: [{ id: 'import-duty', date: '2026-10-11', assignments: {} }],
  phases: [{ id: 'import-phase', name: 'Importphase', start: '2026-10-01', end: '2026-10-31' }],
  settings: { importMarker: 'replace' }
};
window.BT.storage.save({ schemaVersion: 2, players: [], sessions: [], trainings: [], games: [{ id: 'old-game' }], tactics: [{ id: 'old-tactic' }], tableDuties: [{ id: 'old-duty' }], notes: [], freethrows: [], drills: [], templates: [], phases: [{ id: 'old-phase' }], settings: {} }, { fromSync: true });
assert(window.BT.history.hasImportableData(window.BT.storage.load()), 'Spiel-, Kampfgerichts- oder Phasendaten werden nicht als vorhandene Importdaten erkannt');
window.BT.history.applyBackup(importBackup, 'r');
let imported = window.BT.storage.load();
assert(imported.games.map(entry => entry.id).join(',') === 'import-game', 'Ersetzen übernimmt Spiele nicht vollständig');
assert(imported.tactics.map(entry => entry.id).join(',') === 'import-tactic', 'Ersetzen übernimmt Teamtaktiken nicht vollständig');
assert(imported.tableDuties.map(entry => entry.id).join(',') === 'import-duty', 'Ersetzen übernimmt Kampfgerichte nicht vollständig');
assert(imported.phases.map(entry => entry.id).join(',') === 'import-phase', 'Ersetzen übernimmt Saisonphasen nicht vollständig');

window.BT.storage.save({ schemaVersion: 2, players: [], sessions: [], trainings: [], games: [{ id: 'import-game', home: 'Bestehend' }], tableDuties: [{ id: 'import-duty', date: '2026-09-01', assignments: {} }], notes: [], freethrows: [], drills: [], templates: [], phases: [{ id: 'import-phase', name: 'Bestehend' }], settings: {} }, { fromSync: true });
window.BT.history.applyBackup({ ...importBackup, games: [...importBackup.games, { id: 'new-game' }], tableDuties: [...importBackup.tableDuties, { id: 'new-duty', assignments: {} }], phases: [...importBackup.phases, { id: 'new-phase' }] }, 'm');
imported = window.BT.storage.load();
assert(imported.games.length === 2 && imported.games.find(entry => entry.id === 'import-game').home === 'Bestehend', 'Merge überschreibt vorhandene Spiele oder ergänzt neue nicht');
assert(imported.tableDuties.length === 2 && imported.tableDuties.some(entry => entry.id === 'new-duty'), 'Merge ergänzt Kampfgerichte nicht');
assert(imported.phases.length === 2 && imported.phases.some(entry => entry.id === 'new-phase'), 'Merge ergänzt Saisonphasen nicht');

console.log('UI-Smoke-Test erfolgreich: Dashboard, Gegner-Scouting, Auswertung, Theme, Entwicklung, Spiele/Atlas, Training, Kampfgericht und KI-Saisonplanung.');
dom.window.close();
