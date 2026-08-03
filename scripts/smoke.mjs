import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const protectedSlot = seasonSlots[0];
window.BT.storage.upsertTraining({
  date: protectedSlot.date, startTime: '20:15', note: 'Manuell geschützt',
  attendance: [], freethrows: [], shots: [], plan: { summary: 'Manuell', drills: [] }
});
const aiSeasonResponse = {
  trainings: seasonSlots.map(slot => ({
    date: slot.date,
    summary: slot.weekday === 'tue' ? 'Haupttraining' : 'Freitagsfestigung',
    freethrows: { attempted: 20 },
    shots: [{ category: 'Catch-and-Shoot', attempted: 20 }],
    drills: [
      { name: 'KI Warm-up', minutes: 15, intensity: 'low', description: 'Mobilisieren und Ballgefühl' },
      { name: 'KI Hauptblock', minutes: 65, intensity: slot.load, description: 'Spielnaher Schwerpunkt' },
      { name: 'KI 5-gegen-5', minutes: 25, intensity: slot.load, description: 'Strukturiertes Abschlussspiel' }
    ],
    fridayVariants: slot.weekday === 'fri' ? {
      over8: [{ name: 'KI Teamtaktik', minutes: 105, intensity: slot.load, description: '4-gegen-4 und 5-gegen-5' }],
      eightOrLess: [{ name: 'KI Small-Sided', minutes: 105, intensity: slot.load, description: '1-gegen-1 bis 3-gegen-3' }]
    } : null
  }))
};
const appliedSeason = window.BT.seasonplanner.applyAIPlan(aiSeasonResponse, seasonSlots);
assert(appliedSeason.protected === 1, 'Manuell erstelltes Training wurde nicht geschützt');
assert(appliedSeason.created === seasonSlots.length - 1, 'KI-Saisontrainings wurden nicht vollständig angelegt');
assert(window.BT.storage.getDrills().some(drill => drill.source === 'ai-season'), 'KI-Trainingsblöcke fehlen in der Drill-Bibliothek');
assert(window.BT.storage.getTemplates().some(template => template.source === 'ai-season'), 'KI-Trainings fehlen in der Vorlagenbibliothek');
const fridayTraining = window.BT.storage.getTrainings().find(entry => entry.planning?.source === 'ai-season' && entry.plan?.variants);
assert(fridayTraining && fridayTraining.plan.variants.over8.length && fridayTraining.plan.variants.eightOrLess.length, 'Freitagsvarianten für die Spielerzahl fehlen');
route('#/schedule');
assert(window.document.querySelector('[data-action="generate-season"]'), 'KI-Saisonplanung fehlt im Trainingsplan');
assert(window.document.querySelector('[data-role="season-plan-summary"]'), 'Saisonübersicht fehlt');

const importBackup = {
  schemaVersion: 2,
  players: [], sessions: [], trainings: [], notes: [], freethrows: [], drills: [], templates: [],
  games: [{ id: 'import-game', home: 'TSV Lindau', away: 'Import Team' }],
  tableDuties: [{ id: 'import-duty', date: '2026-10-11', assignments: {} }],
  phases: [{ id: 'import-phase', name: 'Importphase', start: '2026-10-01', end: '2026-10-31' }],
  settings: { importMarker: 'replace' }
};
window.BT.storage.save({ schemaVersion: 2, players: [], sessions: [], trainings: [], games: [{ id: 'old-game' }], tableDuties: [{ id: 'old-duty' }], notes: [], freethrows: [], drills: [], templates: [], phases: [{ id: 'old-phase' }], settings: {} }, { fromSync: true });
assert(window.BT.history.hasImportableData(window.BT.storage.load()), 'Spiel-, Kampfgerichts- oder Phasendaten werden nicht als vorhandene Importdaten erkannt');
window.BT.history.applyBackup(importBackup, 'r');
let imported = window.BT.storage.load();
assert(imported.games.map(entry => entry.id).join(',') === 'import-game', 'Ersetzen übernimmt Spiele nicht vollständig');
assert(imported.tableDuties.map(entry => entry.id).join(',') === 'import-duty', 'Ersetzen übernimmt Kampfgerichte nicht vollständig');
assert(imported.phases.map(entry => entry.id).join(',') === 'import-phase', 'Ersetzen übernimmt Saisonphasen nicht vollständig');

window.BT.storage.save({ schemaVersion: 2, players: [], sessions: [], trainings: [], games: [{ id: 'import-game', home: 'Bestehend' }], tableDuties: [{ id: 'import-duty', date: '2026-09-01', assignments: {} }], notes: [], freethrows: [], drills: [], templates: [], phases: [{ id: 'import-phase', name: 'Bestehend' }], settings: {} }, { fromSync: true });
window.BT.history.applyBackup({ ...importBackup, games: [...importBackup.games, { id: 'new-game' }], tableDuties: [...importBackup.tableDuties, { id: 'new-duty', assignments: {} }], phases: [...importBackup.phases, { id: 'new-phase' }] }, 'm');
imported = window.BT.storage.load();
assert(imported.games.length === 2 && imported.games.find(entry => entry.id === 'import-game').home === 'Bestehend', 'Merge überschreibt vorhandene Spiele oder ergänzt neue nicht');
assert(imported.tableDuties.length === 2 && imported.tableDuties.some(entry => entry.id === 'new-duty'), 'Merge ergänzt Kampfgerichte nicht');
assert(imported.phases.length === 2 && imported.phases.some(entry => entry.id === 'new-phase'), 'Merge ergänzt Saisonphasen nicht');

console.log('UI-Smoke-Test erfolgreich: Dashboard, Auswertung, Theme, Entwicklung, Spiele/Atlas, Training, Kampfgericht und KI-Saisonplanung.');
dom.window.close();
