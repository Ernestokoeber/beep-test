import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, {url: 'https://coach.test/', runScripts: 'outside-only'});
const w = dom.window;
for (const file of ['util', 'storage', 'coaching-staff', 'team-strategy', 'station-training', 'dashboard']) {
  w.eval(readFileSync(new URL('../js/' + file + '.js', import.meta.url), 'utf8'));
}
const BT = w.BT;
const today = BT.util.todayISO;
const addDays = days => { const date = new Date(today() + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const coach = BT.storage.upsertPlayer({name: 'Spielertrainer'});
const limited = BT.storage.upsertPlayer({name: '<img src=x onerror=alert(1)>', availability: 'limited', availabilityNote: 'Keine Zusatzbelastung'});
const expired = BT.storage.upsertPlayer({name: 'Wieder verfügbar', availability: 'injured', availabilityUntil: addDays(1)});
const absent = BT.storage.upsertPlayer({name: 'Abgemeldet'});
const open = BT.storage.upsertPlayer({name: 'Offener Status', goals: [{title: 'Screenwinkel verbessern', status: 'active', targetDate: addDays(5)}]});
const archived = BT.storage.upsertPlayer({name: 'Archiviert'});
BT.storage.setArchived(archived.id, true);
BT.storage.upsertTraining({date: today(), endedAt: new Date().toISOString(), plan: {drills: []}});
BT.storage.upsertTraining({date: today(), status: 'cancelled', plan: {drills: []}});
const training = BT.storage.upsertTraining({date: addDays(2), startTime: '20:15', location: 'Halle',
  staff: [{role: 'coach', name: coach.name, playerId: coach.id, alsoPlayer: false, status: 'present'}],
  attendance: [{playerId: coach.id, status: 'present'}, {playerId: limited.id, status: 'present'}, {playerId: expired.id, status: 'present'}, {playerId: absent.id, status: 'absent'}],
  stationTraining: {gameDate: addDays(3), players: {[limited.id]: {readiness: 3, pain: 2, gameMinutes: 0, baseTrainingLoad: 0}}},
  plan: {summary: 'PnR und Umschalten', durationMinutes: 45, loadTarget: 'low', loadReason: 'Vorbereitung auf das Spiel',
    evidenceBasis: {planningDecision: 'Ballverlustquote senken', observedTrends: ['Zu späte Entscheidungen']},
    drills: [{name: 'Pick-and-Roll', minutes: 20, intensity: 'medium', description: 'Roller lesen; Pass nach außen', coachingPoints: ['Screen eng nutzen']},
      {name: 'Umschalten', minutes: 15, intensity: 'low', description: 'Ball stoppen'}],
    opponentPlan: {opponent: 'Illertal', defenseRecommendation: {startLabel: 'Mannverteidigung', triggers: ['Offene Würfe verhindern']}, dataQuality: {confidence: 'low'}}}});
const build = () => BT.storage.withReadCache(() => BT.dashboard.__test.buildCoachBriefing());
const before = w.localStorage.getItem('beepTest_v1');
let briefing = build();
assert.equal(briefing.next.id, training.id, 'Completed and cancelled trainings must be skipped.');
assert.equal(briefing.players, 4, 'Coach-only and archived profiles must not count as players.');
assert.equal(briefing.present, 2);
assert.equal(briefing.open, 1, 'Profiles without an attendance row remain pending.');
assert.equal(briefing.plannedMinutes, 35);
assert.match(briefing.blocks[1].meta, /20:35/);
assert.match(briefing.shareText, /Screen eng nutzen/);
assert.match(briefing.shareText, /Aufgabenvorschlag für Spielertrainer/);
assert.match(briefing.shareText, /Co-Trainer: noch nicht zugeordnet/);
assert.match(briefing.shareText, /Ampel Gelb/);
assert.match(briefing.shareText, /Vorbereitung auf Illertal/);
assert.match(briefing.shareText, /Screenwinkel verbessern/);
assert.doesNotMatch(briefing.shareText, /Wieder verfügbar: verletzt/);
assert.equal(w.localStorage.getItem('beepTest_v1'), before, 'Reading a briefing must not change stored data.');

// Mount the actual dashboard and exercise its sharing fallback.
BT.history = {shareBackup() {}, importBackup() {}};
BT.stats = {teamAttendance: () => ({pct: 0, present: 0, slots: 0}), teamFreethrows: () => ({pct: 0, attempted: 0}),
  topAttenders: () => [], topFreethrowShooters: () => [], teamShotsByCategory: () => [], endedTrainings: () => []};
const host = w.document.createElement('main'); w.document.body.append(host);
BT.dashboard.renderBriefing(host);
assert.equal(host.querySelector('[data-role="coach-briefing-content"] img'), null, 'Profile text must be escaped.');
assert.equal(host.querySelectorAll('.briefing-block').length, 2);
const changed = BT.storage.getTraining(training.id);
changed.plan.summary = 'Aktualisierter Schwerpunkt';
BT.storage.upsertTraining(changed);
let copied = '';
Object.defineProperty(w.navigator, 'clipboard', {value: {writeText: async value => {copied = value;}}});
host.querySelector('[data-action="share-briefing"]').click();
await new Promise(resolve => setTimeout(resolve, 0));
assert.match(copied, /Aktualisierter Schwerpunkt/, 'Share must reread the latest stored plan.');
assert.match(copied, /Ball stoppen/);
changed.plan.drills.push({name: 'Horns', minutes: 10});
changed.startTime = '';
BT.storage.upsertTraining(changed);
briefing = build();
assert.match(briefing.shareText, /ausgeschlossene Konzepte: Horns/);
assert.match(briefing.blocks[1].meta, /ab Minute 20/);
assert.match(briefing.blocks[2].lines[0], /fehlen/);
const data = JSON.parse(w.localStorage.getItem('beepTest_v1'));
data.trainings = [];
w.localStorage.setItem('beepTest_v1', JSON.stringify(data));
briefing = build();
assert.equal(briefing.next, undefined);
assert.match(briefing.shareText, /Noch kein nächstes Training geplant/);
dom.window.close();
console.log('CourtHub: Trainerbriefing, Teilnahme, Planbezug, Aufgaben, Belastung und Teilen erfolgreich.');
