import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
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
assert(window.document.querySelector('[data-role="plan-duration"]').value === '90', 'Trainingsdauer wurde nicht geladen');
assert(window.document.querySelector('.intensity-high'), 'Belastungsstufe fehlt');
assert(window.document.querySelector('[data-role="checkin-card"]'), 'QR-Check-in fehlt');
assert(!window.document.querySelector('[data-action="export-pdf"]'), 'Einzelner Trainings-PDF-Export darf nicht mehr angeboten werden');
window.document.querySelector('[data-action="end-training"]').click();
await new Promise(resolveWait => window.setTimeout(resolveWait, 20));
const endedTraining = window.BT.storage.getTraining(training.id);
assert(endedTraining.endedAt && endedTraining.status === 'completed', 'Training wurde durch Beenden nicht abgeschlossen gespeichert');
route('#/training');
assert(window.document.querySelectorAll('[data-role="upcoming-list"] > li').length === 1, 'Anstehende Trainings sind nicht sauber getrennt');
assert(window.document.querySelectorAll('[data-role="completed-list"] > li').length === 1, 'Absolvierte Trainings sind nicht sauber getrennt');

route('#/reports');
assert(window.document.querySelector('.reports-view'), 'Auswertungs-Reiter fehlt');
assert(window.document.querySelector('[data-role="report-player-rows"] tr'), 'Spieler-Gesamtauswertung wurde nicht gerendert');
assert(window.document.querySelector('[data-action="report-csv"]'), 'CSV-Export der Gesamtauswertung fehlt');
assert(window.document.querySelector('[data-action="report-pdf"]'), 'PDF-Export der Gesamtauswertung fehlt');

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

console.log('UI-Smoke-Test erfolgreich: Dashboard, Auswertung, Theme, Entwicklung, Spiele/Atlas, Training und Kampfgericht.');
dom.window.close();
