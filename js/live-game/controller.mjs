import {createSession,appendEvent,projectStats,sessionRoster,effectiveEvents,clone,ensure,duration} from './core.mjs';
import {clockAt,projectLineups} from './clock.mjs';
import {mergeLiveStats} from './merge.mjs';
import {getJournal} from './bridge.mjs';

function browserDependencies() {
  const BT=window.BT;
  let deviceId=localStorage.getItem('courthub_live_device');
  if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem('courthub_live_device',deviceId);}
  return {deviceId,now:()=>Date.now(),load:()=>BT.storage.load(),save:data=>BT.storage.save(data),
    players:()=>BT.storage.getPlayers().filter(p=>!p.archived),wake:BT.wake||{},
    getIdentity:()=>{const s=BT.sync.getState();return {organizationId:s.user?.organization?.id,actorId:s.user?.id,sessionEpoch:s.sessionEpoch,role:s.user?.role,status:s.status,lastError:s.lastError};},
    subscribeIdentity:fn=>{window.addEventListener('bt-sync-change',fn);return()=>window.removeEventListener('bt-sync-change',fn);}};
}
export async function openLiveGame({gameId,scope,deps=browserDependencies()}) {
  const journal=deps.journal||await getJournal(scope),owner=crypto.randomUUID();
  let live=mergeLiveStats(deps.load().games?.find(g=>g.id===gameId)?.liveStats,await journal.read(gameId)).value;
  let closed=false,error=null,busy=false,chain=Promise.resolve(),leaseError=null;
  const listeners=new Set();
  const identityOK=()=>{const i=deps.getIdentity();return i.actorId===scope.actorId&&i.organizationId===scope.organizationId&&i.sessionEpoch===scope.sessionEpoch;};
  function session(){return live?.sessions.find(s=>s.id===live.selectedSessionId);}
  function getState(){const s=session(),identity=deps.getIdentity();return {live:clone(live),session:clone(s),roster:s?sessionRoster(s):deps.players(),
    clock:s?clockAt(s,deps.now()):null,stats:s?projectStats(s):null,lineups:s?projectLineups(s,deps.now()):null,
    readOnly:closed||identity.role==='viewer'||!identityOK(),needsTakeover:!!s&&s.deviceId!==deps.deviceId,
    error:error||leaseError,busy,status:identity.status||'offline',syncError:identity.lastError};}
  function notify(){for(const fn of listeners)fn(getState());}
  const unsubscribe=deps.subscribeIdentity(()=>{
    if(!identityOK()){closed=true;deps.wake.release?.('live-game');}
    else {try {live=mergeLiveStats(live,deps.load().games?.find(g=>g.id===gameId)?.liveStats).value;}catch(e){error=e.message;}}
    notify();
  });
  async function write(value){
    ensure(identityOK()&&!closed,'identity','Konto oder Team wurde gewechselt. Ansicht neu öffnen.');
    await journal.acquire(gameId,owner);
    ensure(identityOK()&&!closed,'identity','Konto oder Team wurde gewechselt.');
    const saved=await journal.append(gameId,value);
    ensure(identityOK()&&!closed,'identity','Lokal gesichert. Konto wurde gewechselt; nicht in anderes Team übertragen.');
    live=saved;
    const data=deps.load(),game=data.games?.find(g=>g.id===gameId);
    ensure(game,'deletion','Spiel fehlt. Aktionen bleiben im lokalen Journal erhalten.');
    game.liveStats=mergeLiveStats(live,game.liveStats).value;
    try{deps.save(data);}catch(e){error='Im Live-Journal gesichert; Teamdaten konnten nicht gespeichert werden: '+e.message;}
  }
  async function execute(command){
    ensure(identityOK()&&!closed,'identity','Konto gewechselt. Live-Ansicht neu öffnen.');
    ensure(deps.getIdentity().role!=='viewer','permission','Nur lesender Zugriff.');
    ensure(['admin','coach','assistant'].includes(deps.getIdentity().role),'permission','Kein Schreibrecht.');
    live=mergeLiveStats(live,deps.load().games?.find(g=>g.id===gameId)?.liveStats).value;
    let s=session();
    if(command.kind==='setup'){
      ensure(!live,'session','Eine Erfassung ist bereits vorhanden.');
      s=createSession({id:command.id,deviceId:deps.deviceId,actorId:scope.actorId,...command.payload});
      await write({schemaVersion:1,sessions:[s],selectedSessionId:s.id,resolutionRevision:0});return;
    }
    if(command.kind==='select-session'){
      ensure(live?.sessions.some(s=>s.id===command.payload.id),'selection','Sitzung nicht gefunden.');
      await write({...live,selectedSessionId:command.payload.id,resolutionRevision:live.resolutionRevision+1});return;
    }
    ensure(s,'selection','Zuerst eine Erfassung auswählen.');
    if(command.kind==='takeover'){
      const copy={...clone(s),id:command.id,deviceId:deps.deviceId,actorId:scope.actorId};
      copy.events=copy.events.map(e=>({...e,sessionId:copy.id}));
      await write({...live,sessions:[...live.sessions,copy],selectedSessionId:copy.id,resolutionRevision:live.resolutionRevision+1});return;
    }
    ensure(s.deviceId===deps.deviceId,'device','Dieses Gerät muss die Erfassung zuerst ausdrücklich übernehmen.');
    if(s.events.some(e=>e.id===command.id))return;
    let c=clockAt(s,deps.now());
    ensure(!c.ended||['amend','void','roster'].includes(command.kind),'finished','Spiel beendet. Nur explizite Korrekturen sind möglich.');
    if(command.kind==='undo-last'){
      const target=effectiveEvents(s).filter(e=>['stat','substitution','roster'].includes(e.kind)).at(-1);
      ensure(target,'undo','Keine rückgängig machbare Aktion.');
      command={...command,kind:'void',payload:{targetId:target.id}};
    }
    // Persist a clamped stop after a suspended tab or a backwards device clock.
    if(c.startedAtMs!==null&&!c.running&&!c.ended){
      s=appendEvent(s,{id:crypto.randomUUID(),sessionId:s.id,seq:s.events.length+1,period:c.period,remainingMs:c.remainingMs,recordedAt:new Date(deps.now()).toISOString(),kind:'clock-pause',payload:c.clockSkew?{clockSkew:true}:{}});
    }
    if(c.clockSkew&&command.kind!=='clock-correction'&&command.kind!=='clock-pause'){
      await write({...live,sessions:live.sessions.map(x=>x.id===s.id?s:x)});
      throw Error('Gerätezeit wurde zurückgestellt. Uhr ist pausiert; Restzeit über „Uhr korrigieren“ abgleichen.');
    }
    const period=command.kind==='period-start'?c.period+1:c.period;
    const e={id:command.id,sessionId:s.id,seq:s.events.length+1,kind:command.kind,period,
      remainingMs:command.kind==='period-start'?duration(s,period):c.remainingMs,
      recordedAt:new Date(deps.now()).toISOString(),payload:command.kind==='clock-start'?{startedAtMs:deps.now()}:command.payload||{}};
    s=appendEvent(s,e);
    await write({...live,sessions:live.sessions.map(x=>x.id===s.id?s:x)});
    if(clockAt(s,deps.now()).running)deps.wake.acquire?.('live-game');else deps.wake.release?.('live-game');
  }
  function dispatch(command){
    const cmd=clone({...command,id:command.id||crypto.randomUUID()});
    chain=chain.then(async()=>{busy=true;error=null;notify();try{await execute(cmd);return {ok:true,state:getState()};}
      catch(e){error=e.message+(e.eventIds?.filter(Boolean).length?' (Aktion: '+e.eventIds.filter(Boolean).join(', ')+')':'');return {ok:false,error,state:getState()};}
      finally{busy=false;notify();}});
    return chain;
  }
  const timer=setInterval(()=>{
    if(closed)return;
    const s=session(),c=s&&clockAt(s,deps.now());
    if(c?.clockSkew&&!busy&&s.deviceId===deps.deviceId&&deps.getIdentity().role!=='viewer')dispatch({kind:'clock-pause',payload:{clockSkew:true}});
    notify();
  },500);
  const heartbeat=setInterval(()=>{if(!closed&&session()?.deviceId===deps.deviceId&&deps.getIdentity().role!=='viewer')journal.acquire(gameId,owner).then(()=>{leaseError=null;},e=>{leaseError=e.message;notify();});},5000);
  async function close(){closed=true;clearInterval(timer);clearInterval(heartbeat);unsubscribe();deps.wake.release?.('live-game');listeners.clear();await chain;await journal.release(gameId,owner);}
  return {getState,dispatch,idle:()=>chain,subscribe(fn){listeners.add(fn);fn(getState());return()=>listeners.delete(fn);},close};
}
