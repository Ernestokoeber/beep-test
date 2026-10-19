import assert from 'node:assert/strict';
import { createIndividualManageHandler } from '../api/_handlers/individual/manage.js';

const id = n => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const [coach, organization, p1, p2, sessionId, e1, e2, stranger] = [1,2,3,4,5,6,7,8].map(id);
function fixture() {
  const state = { status: 'planned', role: 'coach', attendance: ['attended','attended'], writes: [], drafts: [] };
  const handler = createIndividualManageHandler({
    requireMembership: async () => ({ sub: coach, organization_id: organization, role: state.role }),
    transaction: async fn => {
      const before = structuredClone(state);
      try { return await fn({ query: async (sql, params=[]) => {
        if (sql.includes('FROM individual_profiles')) return { rows: [p1,p2].includes(params[0]) ? [{id:params[0],organization_id:organization,coach_user_id:coach}] : [] };
        if (sql.includes('FROM individual_sessions')) return {rows:[{id:sessionId,organization_id:organization,coach_user_id:coach,status:state.status}]};
        if (sql.includes('FROM individual_exercises')) return {rows:[{id:e1,individual_profile_id:p1},{id:e2,individual_profile_id:p2}]};
        if (sql.includes('SELECT count(*)') && sql.includes('individual_session_participants')) return {rows:[{count:state.attendance.filter(x=>x==='attended').length}]};
        if (sql.includes('SELECT') && sql.includes('individual_session_participants')) return {rows:[{individual_profile_id:p1,attendance_status:state.attendance[0]},{individual_profile_id:p2,attendance_status:state.attendance[1]}].filter(x=>!sql.includes("sp.attendance_status = 'attended'") || x.attendance_status==='attended')};
        if (sql.includes('INSERT INTO individual_measurements')) { state.writes.push(params); return {rows:[{id:id(9)}]}; }
        if (sql.includes('UPDATE individual_sessions')) { state.status=sql.includes("SET status = 'in_progress'")?'in_progress':'completed'; return {rows:[{id:sessionId,status:state.status}]}; }
        if (sql.includes('individual_sync_mutations')) return {rows:[{count:0}]};
        if (sql.includes('INSERT INTO individual_ai_drafts')) { const row={id:`draft-${params[0]}`,individual_profile_id:params[0],session_id:sessionId};state.drafts.push(row);return {rows:[row]}; }
        if (sql.includes('FROM individual_ai_drafts')) return {rows:state.drafts};
        return {rows:[]};
      }}); } catch (error) { Object.assign(state,before); throw error; }
    }
  });
  const call = async (action, extra={}) => {
    const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
    await handler({method:'POST',headers:{},body:{action,profileId:p1,sessionId,...extra}},res); return res;
  };
  return {state,call};
}
const documents = [
  {profileId:p1,exercises:[{exerciseId:e1,seconds:60,rating:'Funktioniert',note:'Thomas privat'}]},
  {profileId:p2,exercises:[{exerciseId:e2,seconds:60,rating:'Wiederholen',note:'Adnan privat'}]}
];
const f=fixture();
assert.equal((await f.call('startSession')).statusCode,200,'Gemeinsamer Start fehlt');
assert.equal(f.state.status,'in_progress');
assert.equal((await f.call('startSession')).statusCode,200,'Startwiederholung muss dieselbe Einheit verwenden');
const finished=await f.call('completeLiveSession',{documents});
assert.equal(finished.statusCode,200,JSON.stringify(finished.body));
assert.equal(f.state.status,'completed');
assert.equal(f.state.writes.length,6,'Dauer, Bewertung und private Notiz pro Spieler fehlen');
assert.deepEqual(f.state.writes.filter(p=>p[4]==='trainernotiz').map(p=>[p[1],p[6]]),[[p1,'Thomas privat'],[p2,'Adnan privat']]);
assert.equal(finished.body.queuedDrafts.length,2,'Abschluss muss beide persönlichen KI-Aufträge erzeugen');
assert.equal((await f.call('completeLiveSession',{documents})).statusCode,200);
assert.equal(f.state.writes.length,6,'Wiederholter Abschluss dupliziert Messwerte');
assert.equal(f.state.drafts.length,2,'Wiederholter Abschluss dupliziert KI-Aufträge');
assert.equal((await f.call('startSession')).statusCode,409,'Abgeschlossene Einheit darf nicht neu gestartet werden');

for (const [label,invalid] of [
  ['fehlender anwesender Spieler',documents.slice(0,1)],
  ['falsche Übungszuordnung',[documents[0],{...documents[1],exercises:[{exerciseId:e1,seconds:30}]}]],
  ['fremder Spieler',[documents[0],{...documents[1],profileId:stranger}]],
  ['doppelte Spielerdokumentation',[documents[0],documents[0]]],
  ['negative Dauer',[{...documents[0],exercises:[{exerciseId:e1,seconds:-1}]},documents[1]]]
]) {
  const bad=fixture(); const res=await bad.call('completeLiveSession',{documents:invalid});
  assert(res.statusCode>=400,label); assert.equal(bad.state.writes.length,0,`${label}: keine Teilpersistenz`); assert.equal(bad.state.status,'planned');
}
const solo=fixture();solo.state.attendance[1]='declined';
assert.equal((await solo.call('completeLiveSession',{documents:documents.slice(0,1)})).statusCode,200);
assert.equal(solo.state.writes.length,3,'Abgesagter Spieler erhält keine fiktiven Werte');
const absent=fixture();absent.state.attendance=['pending','declined'];
assert.equal((await absent.call('completeLiveSession',{documents:[]})).statusCode,409);
const undecided=fixture();undecided.state.attendance[1]='pending';
assert.equal((await undecided.call('completeLiveSession',{documents:documents.slice(0,1)})).statusCode,409,'Unbestätigter zweiter Spieler darf beim Abschluss nicht stillschweigend entfallen');
const player=fixture();player.state.role='player';
assert.equal((await player.call('startSession')).statusCode,403);
assert.equal((await player.call('completeLiveSession',{documents})).statusCode,403);
assert.equal(player.state.writes.length,0);
console.log('Gemeinsame Live-API: Start, atomarer Zweierabschluss, Isolation, Fehlzeiten und Wiederholbarkeit geprüft.');
