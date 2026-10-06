import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('', {url: 'https://coach.test/', runScripts: 'outside-only'});
const w = dom.window;
for (const file of ['util', 'storage', 'coaching-staff', 'stats']) w.eval(readFileSync(new URL('../js/' + file + '.js', import.meta.url), 'utf8'));
const BT = w.BT;
const regular = BT.storage.upsertPlayer({name: 'Regelmäßig'});
const perfect = BT.storage.upsertPlayer({name: 'Perfekte Quote'});
const newcomer = BT.storage.upsertPlayer({name: 'Erstes Training'});
const coach = BT.storage.upsertPlayer({name: 'Trainer'});
for (let i = 0; i < 10; i++) BT.storage.upsertTraining({date: '2026-08-' + String(i + 1).padStart(2, '0'), endedAt: '2026-08-11T00:00:00Z',
  staff: [{role: 'coach', name: coach.name, playerId: coach.id, alsoPlayer: false, status: 'present'}],
  attendance: [{playerId: regular.id, status: i < 8 ? 'present' : 'absent'}, {playerId: coach.id, status: 'present'},
    ...(i < 5 ? [{playerId: perfect.id, status: 'present'}] : []), ...(i === 9 ? [{playerId: newcomer.id, status: 'present'}] : [])]});
BT.storage.upsertTraining({date: '2026-08-12', status: 'cancelled', attendance: [{playerId: newcomer.id, status: 'present'}]});
BT.storage.upsertTraining({date: '2026-08-13', endedAt: '2026-08-13T00:00:00Z', attendance: [{playerId: newcomer.id, status: 'pending'}]});
BT.storage.setActiveSeason('all');
let ranking = BT.stats.attendanceRanking();
assert.equal(ranking.ranked[0].player.id, regular.id, '8/10 must lead 5/5 by actual attendance.');
assert.equal(ranking.ranked[1].player.id, perfect.id);
assert.equal(ranking.provisional[0].player.id, newcomer.id, '1/1 belongs in the unranked provisional list.');
assert.equal(ranking.provisional[0].stats.total, 1, 'Cancelled sessions and pending entries cannot count.');
assert.equal(BT.stats.topAttenders(1)[0].player.id, regular.id);
assert.equal(BT.stats.playerAttendance(coach.id).total, 0);
assert.equal(BT.stats.playerAttendance(perfect.id).total, 5, 'Missing records must not become absences.');
BT.storage.setArchived(regular.id, true);
assert.equal(BT.stats.attendanceRanking().ranked.length, 1);
BT.storage.setActiveSeason('2025/26');
assert.equal(BT.stats.attendanceRanking().ranked.length, 0, 'Ranking must respect the selected season.');
BT.storage.setActiveSeason('all');
assert.equal(BT.stats.attendanceRanking().provisional.length, 1);
dom.window.close();
console.log('CourtHub: Anwesenheitsrangliste, Mindestdatenmenge, Teilnahmen, Trainer und Saisonfilter erfolgreich.');
