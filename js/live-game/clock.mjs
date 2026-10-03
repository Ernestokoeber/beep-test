import {effectiveEvents,duration,ensure,sessionRoster} from './core.mjs';
export function position(s,period,remainingMs) {
  let offset=0;for(let p=1;p<period;p++)offset+=duration(s,p);
  return offset+duration(s,period)-remainingMs;
}
export function lineupAtEvent(boundaries,s,e) {
  const at=position(s,e.period,e.remainingMs);
  return [...(boundaries.filter(b=>b.at<at || b.at===at&&b.seq<e.seq).at(-1)||boundaries[0]).onCourt];
}
function replay(s) {
  const events=effectiveEvents(s);
  let c={period:1,remainingMs:duration(s,1),running:false,ended:false,startedAtMs:null};
  let onCourt=[...s.startingFive];
  const boundaries=[{at:0,onCourt:[...onCourt],seq:0,eventId:null}];
  const stats=[];
  const known=new Set(s.roster.map(p=>p.id));
  for(const e of events) {
    const at=position(s,e.period,e.remainingMs);
    if(e.kind==='roster'){for(const p of e.payload.players)known.add(p.id);ensure(known.size<=40,'roster','Höchstens 40 Spieler.');continue;}
    if(e.kind==='stat'){ensure(known.has(e.payload.playerId),'roster','Spieler fehlt im Kader.',[e.id]);stats.push(e);continue;}
    if(['opponent-score','score-coverage','opponent-observation','defense-change'].includes(e.kind)){stats.push(e);continue;}
    ensure(!c.ended,'finished','Das Spiel wurde bereits beendet.',[e.id]);
    if(e.kind==='period-start') {
      ensure(e.period===c.period+1 && c.remainingMs===0 && !c.running && e.remainingMs===duration(s,e.period),'period','Vorherigen Abschnitt zuerst bei 0:00 anhalten.',[e.id]);
      c={period:e.period,remainingMs:e.remainingMs,running:false,ended:false,startedAtMs:null};continue;
    }
    ensure(e.period===c.period,'period','Aktion gehört nicht zum aktuellen Abschnitt.',[e.id]);
    if(e.kind==='substitution') {
      const out=e.payload.out, incoming=e.payload.in;
      ensure(incoming.every(id=>known.has(id)),'roster','Spieler fehlt im Kader.',[e.id]);
      ensure(!c.running && e.remainingMs===c.remainingMs,'running','Zum Wechsel die Spieluhr anhalten.',[e.id]);
      ensure(new Set(out).size===out.length && new Set(incoming).size===incoming.length && out.every(id=>onCourt.includes(id)) && incoming.every(id=>!onCourt.includes(id)),'lineup','Wechsel passt nicht zur Aufstellung.',[e.id]);
      const next=onCourt.filter(id=>!out.includes(id)).concat(incoming);
      ensure(next.length>0 && next.length<=5 && (next.length===5 || e.payload.allowShortHanded===true),'lineup','Unterzahl ausdrücklich bestätigen; höchstens fünf Spieler.',[e.id]);
      ensure(at>=boundaries.at(-1).at,'timeline','Wechselzeit liegt vor einem vorherigen Wechsel.',[e.id]);
      onCourt=next;boundaries.push({at,onCourt:[...onCourt],seq:e.seq,eventId:e.id});continue;
    }
    if(e.kind==='clock-correction') {
      ensure(!c.running && e.remainingMs===c.remainingMs,'running','Uhrkorrektur nur bei angehaltener Uhr.',[e.id]);
      const target=position(s,e.period,e.payload.toRemainingMs);
      ensure(target>=boundaries.at(-1).at,'correction','Uhrkorrektur betrifft einen Wechsel. Wechselzeit gemeinsam korrigieren.',[boundaries.at(-1).eventId,e.id]);
      c.remainingMs=e.payload.toRemainingMs;c.needsCorrection=false;continue;
    }
    if(e.kind==='clock-start') {
      ensure(!c.needsCorrection,'clock-skew','Gerätezeit geändert. Restzeit vor dem Start ausdrücklich korrigieren.',[e.id]);
      ensure(!c.running && e.remainingMs===c.remainingMs && e.remainingMs>0,'running','Spieluhr kann hier nicht gestartet werden.',[e.id]);
      c.running=true;c.startedAtMs=e.payload.startedAtMs;continue;
    }
    if(e.kind==='clock-pause' || e.kind==='finish') {
      ensure(e.remainingMs<=c.remainingMs && (c.running || e.remainingMs===c.remainingMs),'time','Ungültiger Zeitpunkt zum Anhalten.',[e.id]);
      ensure(at>=boundaries.at(-1).at,'time','Zeit liegt vor einem Wechsel.',[e.id]);
      c.remainingMs=e.remainingMs;c.running=false;c.startedAtMs=null;c.ended=e.kind==='finish';if(e.payload.clockSkew)c.needsCorrection=true;continue;
    }
    ensure(false,'event','Diese Aktion wird nicht unterstützt.',[e.id]);
  }
  const end=position(s,c.period,c.remainingMs);
  for(const e of stats) {
    const at=position(s,e.period,e.remainingMs);
    ensure(e.period<=c.period && (c.running || at<=end),'time','Statistik liegt nach der erfassten Spielzeit.',[e.id]);
    if(e.kind==='stat')ensure(lineupAtEvent(boundaries,s,e).includes(e.payload.playerId),'lineup','Spieler war zu diesem Zeitpunkt nicht auf dem Feld.',[e.id]);
  }
  return {clock:c,boundaries,onCourt};
}
export function validateTimeline(s) {
  try {replay(s);return {valid:true,issues:[]};}
  catch(e){return {valid:false,issues:[{code:e.code||'timeline',message:e.message,eventIds:e.eventIds||[]}]};}
}
export function clockAt(s,nowMs) {
  const c={...replay(s).clock};
  if(c.running) {
    if(nowMs<c.startedAtMs){c.running=false;c.clockSkew=true;return c;}
    c.remainingMs=Math.max(0,c.remainingMs-(nowMs-c.startedAtMs));
    if(c.remainingMs===0)c.running=false;
  }
  return c;
}
export function projectLineups(s,nowMs) {
  const {boundaries,onCourt}=replay(s), c=clockAt(s,nowMs);
  const end=position(s,c.period,c.remainingMs);
  const minutesMs=Object.fromEntries(sessionRoster(s).map(p=>[p.id,0]));
  const stints=[];
  for(let i=0;i<boundaries.length;i++) {
    const from=boundaries[i].at, to=i+1<boundaries.length?boundaries[i+1].at:end;
    if(to>from){const stint={fromMs:from,toMs:to,onCourt:[...boundaries[i].onCourt]};stints.push(stint);for(const id of stint.onCourt)minutesMs[id]+=to-from;}
  }
  return {onCourt,stints,minutesMs,boundaries,playedIds:[...new Set(boundaries.flatMap(b=>b.onCourt))],issues:[]};
}
