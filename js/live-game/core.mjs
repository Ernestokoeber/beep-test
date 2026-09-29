import { validateTimeline } from './clock.mjs';
export class LiveValidationError extends Error {
  constructor(code, message, eventIds = []) { super(message); this.code = code; this.eventIds = eventIds; }
}
export const clone = value => structuredClone(value);
export function ensure(ok, code, message, ids) { if (!ok) throw new LiveValidationError(code, message, ids); }
export const canonical = value => JSON.stringify(value, function (key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(k => [k, item[k]])) : item;
});
export const actions = Object.freeze({
  'ft-made':'Freiwurf getroffen','ft-missed':'Freiwurf verfehlt',
  'two-made':'Zweier getroffen','two-missed':'Zweier verfehlt',
  'three-made':'Dreier getroffen','three-missed':'Dreier verfehlt',
  oreb:'Offensiv-Rebound',dreb:'Defensiv-Rebound',assist:'Assist',steal:'Steal',
  block:'Block',turnover:'Ballverlust',foul:'Foul'
});
const kinds = ['stat','substitution','clock-start','clock-pause','clock-correction','period-start','finish','amend','void','roster'];
export const duration = (s,p) => p <= s.config.periods ? s.config.periodMs : s.config.overtimeMs;
const idOK = id => typeof id === 'string' && id.length > 0 && id.length <= 120 && !['__proto__','constructor','prototype'].includes(id);
export function createSession({id,deviceId,actorId,roster,startingFive,config}) {
  ensure([id,deviceId,actorId].every(idOK),'identity','Ungültige Sitzungskennung.');
  ensure(Array.isArray(roster) && roster.length >= 5 && roster.length <= 40 && roster.every(p => idOK(p.id) && typeof p.name === 'string' && p.name.length <= 100),'roster','Ungültiger Spieltagskader.');
  ensure(new Set(roster.map(p=>p.id)).size === roster.length,'roster','Spieler dürfen nicht doppelt im Kader stehen.');
  ensure(Array.isArray(startingFive) && startingFive.length === 5 && new Set(startingFive).size === 5 && startingFive.every(id=>roster.some(p=>p.id===id)),'lineup','Genau fünf unterschiedliche Starter auswählen.');
  ensure(config && Number.isInteger(config.periods) && config.periods >= 1 && config.periods <= 12 && ['periodMs','overtimeMs'].every(k => Number.isInteger(config[k]) && config[k] >= 1000 && config[k] <= 3600000),'config','Ungültige Abschnittsdauer.');
  return clone({schemaVersion:1,id,deviceId,actorId,roster,startingFive,config,events:[]});
}
function validateEvent(s,e) {
  ensure(e && idOK(e.id) && e.sessionId === s.id && Number.isInteger(e.seq) && e.seq > 0,'event','Ungültige Aktion.');
  ensure(kinds.includes(e.kind) && e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload),'event','Unbekannte Aktion.');
  ensure(Number.isInteger(e.period) && e.period >= 1 && e.period <= 50 && Number.isInteger(e.remainingMs) && e.remainingMs >= 0 && e.remainingMs <= duration(s,e.period),'time','Ungültige Spielzeit.',[e.id]);
  ensure(typeof e.recordedAt === 'string' && Number.isFinite(Date.parse(e.recordedAt)),'time','Ungültige Erfassungszeit.');
  const known = s.roster.concat(s.events.filter(x=>x.kind==='roster' && x.seq<e.seq).flatMap(x=>x.payload.players||[]));
  if (e.kind === 'roster') ensure(Array.isArray(e.payload.players) && e.payload.players.length>0 && e.payload.players.length<=40 && e.payload.players.every(p=>idOK(p.id)&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=100),'roster','Ungültige Kaderkorrektur.');
  if (e.kind === 'stat') ensure(known.some(p=>p.id===e.payload.playerId) && Object.hasOwn(actions,e.payload.action),'stat','Unbekannter Spieler oder Statistikaktion.',[e.id]);
  if (e.kind === 'clock-start') ensure(Number.isSafeInteger(e.payload.startedAtMs) && e.payload.startedAtMs >= 0,'time','Ungültiger Zeitanker.');
  if (e.kind === 'clock-correction') ensure(Number.isInteger(e.payload.toRemainingMs) && e.payload.toRemainingMs >= 0 && e.payload.toRemainingMs <= duration(s,e.period),'time','Ungültige Uhrkorrektur.');
  if (e.kind === 'substitution') ensure(Array.isArray(e.payload.out) && Array.isArray(e.payload.in) && [...e.payload.out,...e.payload.in].every(id=>known.some(p=>p.id===id)),'lineup','Ungültiger Wechsel.',[e.id]);
}
export function effectiveEvents(s) {
  const originals = new Map();
  for (const event of s.events) {
    if (!['amend','void'].includes(event.kind)) { originals.set(event.id,clone(event)); continue; }
    const changes = event.kind === 'void' ? [{targetId:event.payload.targetId,patch:null}] : event.payload.changes;
    ensure(Array.isArray(changes) && changes.length > 0 && changes.length <= 100,'correction','Ungültige Korrektur.');
    for (const {targetId,patch} of changes) {
      const base = s.events.find(e=>e.id===targetId && e.seq<event.seq && !['amend','void'].includes(e.kind));
      ensure(base,'correction','Ziel der Korrektur fehlt.',[targetId]);
      if (patch === null) { originals.delete(targetId); continue; }
      ensure(patch && typeof patch === 'object' && Object.keys(patch).every(k=>['period','remainingMs','payload'].includes(k)),'correction','Unzulässige Korrekturfelder.');
      const corrected = {...(originals.get(targetId)||clone(base)),...clone(patch)};
      validateEvent(s,corrected); originals.set(targetId,corrected);
    }
  }
  return [...originals.values()].sort((a,b)=>a.seq-b.seq);
}
export function validateSession(s) {
  ensure(s?.schemaVersion===1,'schema','Unbekannte Live-Datenversion.');
  createSession(s);
  ensure(Array.isArray(s.events) && s.events.length <= 10000,'events','Zu viele oder ungültige Aktionen.');
  const ids = new Set(); let seq=0;
  for (const e of s.events) {
    validateEvent(s,e);
    ensure(!ids.has(e.id) && e.seq===seq+1,'sequence','Konflikt in der Aktionsreihenfolge.',[e.id]);
    ids.add(e.id);seq=e.seq;
  }
  effectiveEvents(s);
  {
    const result=validateTimeline(s);
    ensure(result.valid,result.issues[0]?.code,result.issues[0]?.message,result.issues[0]?.eventIds);
  }
  return s;
}
export function appendEvent(s,e) {
  const existing=s.events.find(item=>item.id===e.id);
  if (existing) { ensure(canonical(existing)===canonical(e),'collision','Konflikt: Aktions-ID hat anderen Inhalt.',[e.id]); return clone(s); }
  const next=clone(s);next.events.push(clone(e));validateSession(next);return next;
}
export function projectStats(s) {
  const players=Object.fromEntries(sessionRoster(s).map(p=>[p.id,{...p,points:0,ftMade:0,ftAttempted:0,twoMade:0,twoAttempted:0,threeMade:0,threeAttempted:0,oreb:0,dreb:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0}]));
  const counters={oreb:'oreb',dreb:'dreb',assist:'assists',steal:'steals',block:'blocks',turnover:'turnovers',foul:'fouls'};
  for (const e of effectiveEvents(s)) {
    if(e.kind!=='stat')continue;
    const p=players[e.payload.playerId], action=e.payload.action;
    const shot=/^(ft|two|three)-(made|missed)$/.exec(action);
    if(shot) { p[shot[1]+'Attempted']++;if(shot[2]==='made'){p[shot[1]+'Made']++;p.points+=({ft:1,two:2,three:3})[shot[1]];} }
    else p[counters[action]]++;
  }
  for(const p of Object.values(players)) {
    p.fieldGoalsMade=p.twoMade+p.threeMade;p.fieldGoalsAttempted=p.twoAttempted+p.threeAttempted;p.rebounds=p.oreb+p.dreb;
    p.fieldGoalPct=p.fieldGoalsAttempted ? 100*p.fieldGoalsMade/p.fieldGoalsAttempted : null;
    p.freeThrowPct=p.ftAttempted ? 100*p.ftMade/p.ftAttempted : null;
  }
  return {players,points:Object.values(players).reduce((n,p)=>n+p.points,0),issues:[]};
}
export function sessionRoster(s) {
  const roster=new Map(s.roster.map(p=>[p.id,clone(p)]));
  for(const e of effectiveEvents(s))if(e.kind==='roster')for(const p of e.payload.players)roster.set(p.id,clone(p));
  ensure(roster.size<=40,'roster','Höchstens 40 Spieler pro Spiel.');
  return [...roster.values()];
}
