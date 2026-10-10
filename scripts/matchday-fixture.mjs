import {IDBFactory} from 'fake-indexeddb';
import {openJournal} from '../js/live-game/journal.mjs';
import {openLiveGame} from '../js/live-game/controller.mjs';
import {openMatchdayJournal} from '../js/matchday/journal.mjs';
import {openMatchday} from '../js/matchday/controller.mjs';
export async function fixture(){
  const scope={organizationId:'club',actorId:'coach',sessionEpoch:1},idb=new IDBFactory();
  const roster=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Spieler '+i,jerseyNumber:String(i),tnaNumber:i<5?String(100000001+i):null}));
  let workspace={schemaVersion:3,games:[{id:'g',home:'Lindau',away:'Gast'}]},now=100000,fail=false,failWorkspace=false,identity={...scope,role:'coach',status:'offline'};
  const listeners=new Set(),journal=await openMatchdayJournal(scope,idb),liveJournal=await openJournal(scope,idb);
  const deps={journal:{...journal,append:async(...args)=>{if(fail)throw Error('Speicher voll');return journal.append(...args);}},deviceId:'phone',uuid:()=>crypto.randomUUID(),now:()=>now,load:()=>structuredClone(workspace),save:v=>{if(failWorkspace)throw Error('Workspace voll');workspace=structuredClone(v);},getIdentity:()=>identity,subscribeIdentity:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
  deps.openLive=()=>openLiveGame({gameId:'g',scope,deps:{...deps,journal:liveJournal,players:()=>roster,wake:{}}});
  return {scope,deps,journal,roster,open:()=>openMatchday({gameId:'g',scope,deps}),workspace:()=>workspace,advance:n=>{now+=n;},fail:v=>{fail=v;},failWorkspace:v=>{failWorkspace=v;},identity:v=>{identity={...identity,...v};for(const fn of listeners)fn();},emit:()=>{for(const fn of listeners)fn();}};
}
