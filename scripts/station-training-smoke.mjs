import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../js/station-training.js', import.meta.url), 'utf8');
const dom = new JSDOM('<!doctype html><html><body><main id="host"></main></body></html>', {
  url: 'https://coach.tsv-lindau.de/#/training', runScripts: 'outside-only', pretendToBeVisual: true
});
const { window } = dom;
const escapeHTML = value => String(value == null ? '' : value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
const players = Array.from({ length: 9 }, (_, index) => ({ id: `p${index + 1}`, name: index === 0 ? '<img src=x onerror=alert(1)> Guard' : `Spieler ${index + 1}`, archived: false, ...(index===2?{availability:'injured',availabilityNote:'Knie'}:{}) }));
const games = [
  { id: 'previous', team: 'herren', date: '2026-10-04', home: 'TSV Lindau', away: 'Alt', playerStats: [{ playerId: 'p1', minutes: 20 }] },
  { id: 'weekend', team: 'herren', date: '2026-10-10', time: '18:00', home: 'TSV Lindau', away: 'Testgegner', playerStats: [] },
  { id: 'u18', team: 'u18', date: '2026-10-11', home: 'U18 Lindau', away: 'U18 Gast' }
];
const trainings = [{
  id: 'tuesday', date: '2026-10-06', status: 'completed', endedAt: '2026-10-06T20:00:00Z',
  attendance: [{ playerId: 'p1', status: 'present' }], plan: { durationMinutes: 105, loadTarget: 'high' }
}];
window.BT = {
  util: { todayISO: () => '2026-10-03', escapeHTML },
  storage: {
    getPlayers: () => players,
    getPlayer: id => players.find(player=>player.id===id),
    getGames: () => games,
    getTrainings: () => trainings,
    getSetting: (_key, fallback) => fallback,
    attendanceForActivePlayers: () => players.map(player => ({ playerId: player.id, status: null, late: false, note: '' })),
    upsertTraining: training => { training.id ||= 'friday'; trainings.push(training); return training; }
  }
};
window.eval(source);
const stations = window.BT.stationTraining;

const suggestion = stations.nextSuggestion('2026-10-03', games, trainings);
assert.equal(suggestion.friday, '2026-10-09');
assert.equal(suggestion.game.id, 'weekend', 'Nur das Herrenspiel am folgenden Wochenende darf auslösen');
assert.equal(stations.weekendGameForFriday('2026-10-08', games), null, 'Ein Donnerstag darf kein Freitagstraining auslösen');
assert.notDeepEqual(stations.stationsForDate('2026-10-09').map(item => item.title), stations.stationsForDate('2026-10-16').map(item => item.title), 'Stationen wechseln nicht von Woche zu Woche');

const friday = stations.createOrUpdate(suggestion.friday, suggestion.game, null);
assert.equal(friday.plan.durationMinutes, 105);
assert.equal(friday.plan.drills.reduce((sum, drill) => sum + drill.minutes, 0), 105, 'Der Freitagsplan dauert nicht genau 105 Minuten');
assert.equal(friday.stationTraining.stations.length, 5);
assert.equal(friday.stationTraining.players.p1.gameMinutes, 20);
assert.equal(friday.stationTraining.players.p1.baseTrainingLoad, 735, 'Dienstagsbelastung wird nicht als Session-RPE berechnet');
assert.equal(friday.stationTraining.players.p1.weeklyLoad, 935);
assert.equal(friday.stationTraining.players.p1.light, 'red', 'Hohe Wochenlast führt nicht zu Rot');
assert.equal(friday.stationTraining.players.p2.light, 'green');
assert.equal(friday.stationTraining.players.p3.light, 'red','Verletztenstatus muss die Belastungsampel übersteuern.');
assert.equal(friday.stationTraining.players.p3.targetRpe,1,'Verletzte Spieler dürfen keine normale Zielbelastung erhalten.');
assert.match(friday.stationTraining.players.p3.message,/keine normale Stationsbelastung/i);

const aiEntry = {
  summary: 'KI erstellt jede Spielwoche einen neuen individuellen Schwerpunkt.',
  freethrows: { attempted: 12 },
  shots: [{ category: 'Form Shooting', attempted: 25 }],
  drills: [10, 10, 15, 15, 15, 15, 15, 10].map((minutes, index) => ({
    name: `KI-Block ${index + 1}`, minutes, intensity: 'low', description: `KI-Beschreibung ${index + 1}`
  })),
  stationTraining: {
    rationale: 'Spielnah frisch geplant, ohne die Kombination der Vorwoche zu wiederholen.',
    stations: Array.from({ length: 5 }, (_, index) => ({
      title: `Neue KI-Station ${index + 1}`, category: `KI-Kategorie ${index + 1}`, description: `Individuelle KI-Aufgabe ${index + 1}`
    }))
  }
};
assert(stations.applyAI(friday, suggestion.game, aiEntry), 'Gültiger KI-Freitagsplan wird abgelehnt');
assert.equal(friday.stationTraining.source, 'gemini');
assert.equal(friday.stationTraining.stations[0].title, 'Neue KI-Station 1', 'Feste Rotation ersetzt weiterhin die KI-Stationen');
assert.equal(friday.plan.drills[2].name, 'KI-Block 3', 'KI-Trainingsblöcke werden nicht für den Live-Modus übernommen');
assert.equal(friday.plan.drills.reduce((sum, drill) => sum + drill.minutes, 0), 105);
assert.equal(friday.stationTraining.players.p1.light, 'red', 'Belastungsampel geht beim KI-Plan verloren');

let saves = 0;
const host = window.document.querySelector('#host');
stations.render(host, friday, () => { saves += 1; });
assert.equal(host.querySelectorAll('.station-card').length, 5);
assert.equal(host.querySelectorAll('.station-player-card').length, 9);
assert.match(host.querySelector('[data-station-player="p3"]').textContent,/Verletzt · Schonung/);
assert.equal(host.querySelector('img'), null, 'Spielername wird in der Belastungsansicht als HTML ausgeführt');
const second = host.querySelector('[data-station-player="p2"]');
const pain = second.querySelector('[data-station-field="pain"]');
pain.value = '6';
pain.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(friday.stationTraining.players.p2.light, 'red');
assert.equal(friday.stationTraining.players.p2.targetRpe, 2);
assert.equal(saves, 1);
assert.match(host.querySelector('[data-station-player="p2"] .station-recommendation').textContent, /Sprünge/);

const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
assert(serviceWorker.includes("'./js/station-training.js'"));
assert(serviceWorker.includes("'./station-training.css'"));

dom.window.close();
console.log('Freitags-Stationstraining: KI-Neuplanung, Spielwochen-Automatik, 105 Minuten, Lastampel, RPE, XSS und Offline-Cache erfolgreich.');
