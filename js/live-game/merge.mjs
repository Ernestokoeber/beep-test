import {canonical,clone,ensure,validateSession} from './core.mjs';
import {mergeMatchday,validateMatchday} from '../matchday/model.mjs';
export function validateLive(value) {
  ensure(value && value.schemaVersion===1 && Array.isArray(value.sessions) && value.sessions.length>=1 && value.sessions.length<=20,'schema','Ungültige Live-Daten.');
  ensure(new Set(value.sessions.map(s=>s.id)).size===value.sessions.length,'collision','Konflikt: doppelte Sitzungen.');
  value.sessions.forEach(validateSession);
  ensure(Number.isSafeInteger(value.resolutionRevision) && value.resolutionRevision>=0,'schema','Ungültige Auswahlversion.');
  ensure(value.selectedSessionId===null || value.sessions.some(s=>s.id===value.selectedSessionId),'selection','Unbekannte ausgewählte Sitzung.');
  return value;
}
export function mergeLiveStats(local,remote) {
  if(!local && !remote)return {value:undefined,conflicts:[]};
  if(!local)return {value:clone(validateLive(remote)),conflicts:[]};
  if(!remote)return {value:clone(validateLive(local)),conflicts:[]};
  validateLive(local);validateLive(remote);
  const map=new Map(remote.sessions.map(s=>[s.id,clone(s)]));
  for(const s of local.sessions){
    const other=map.get(s.id);
    if(!other){map.set(s.id,clone(s));continue;}
    const {events:a,...metaA}=s,{events:b,...metaB}=other;
    ensure(canonical(metaA)===canonical(metaB),'collision','Konflikt: Sitzungskader oder Konfiguration weichen ab.');
    const events=new Map(b.map(e=>[e.id,e]));
    for(const e of a){ensure(!events.has(e.id)||canonical(events.get(e.id))===canonical(e),'collision','Konflikt: Aktion wurde auf zwei Geräten geändert.',[e.id]);events.set(e.id,clone(e));}
    other.events=[...events.values()].sort((x,y)=>x.seq-y.seq);validateSession(other);
  }
  const sessions=[...map.values()];
  const revision=Math.max(local.resolutionRevision,remote.resolutionRevision);
  let selected=local.resolutionRevision>remote.resolutionRevision?local.selectedSessionId:remote.selectedSessionId;
  if(local.resolutionRevision===remote.resolutionRevision && local.selectedSessionId!==remote.selectedSessionId)selected=null;
  if(sessions.length>1 && revision===0)selected=null;
  // An explicit choice covers only the events actually reviewed in that decision.
  // Late actions in a discarded session require another visible choice.
  if(selected){
    const decisions=[local,remote].filter(v=>v.resolutionRevision===revision&&v.selectedSessionId===selected);
    for(const s of sessions.filter(s=>s.id!==selected)){
      if(decisions.some(v=>s.events.length>(v.sessions.find(x=>x.id===s.id)?.events.length??-1))){selected=null;break;}
    }
  }
  return {value:{schemaVersion:1,sessions,selectedSessionId:selected,resolutionRevision:revision},conflicts:selected?[]:['Mehrere Erfassungen: gültige Sitzung auswählen.']};
}
export function protectWorkspace(incoming,current,confirmedGameDeletions=[]) {
  const result=clone(incoming);
  ensure(result.games===undefined || Array.isArray(result.games),'schema','Ungültige Spiele.');
  ensure(Array.isArray(confirmedGameDeletions)&&confirmedGameDeletions.every(id=>typeof id==='string'),'schema','Ungültiger Löschauftrag.');
  result.games=result.games||[];
  for(const old of current?.games||[]){
    if(!old.liveStats&&!old.matchday)continue;
    const next=result.games.find(g=>g.id===old.id);
    if(!next){ensure(confirmedGameDeletions.includes(old.id),'deletion','Live-Spiel fehlt. Expliziten Löschauftrag bestätigen.');continue;}
    if(old.liveStats)next.liveStats=mergeLiveStats(next.liveStats,old.liveStats).value;
    if(old.matchday)next.matchday=mergeMatchday(next.matchday,old.matchday).value;
  }
  for(const g of result.games)if(g.liveStats)validateLive(g.liveStats);
  for(const g of result.games)if(g.matchday!==undefined)validateMatchday(g.matchday);
  return result;
}
