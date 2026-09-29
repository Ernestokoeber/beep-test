import {canonical,clone,ensure} from '../live-game/core.mjs';
import {openLiveGame} from '../live-game/controller.mjs';
import {emptyDraft,mergeMatchday,selectDraft,reviseMatchday,resolveMatchday} from './model.mjs';
import {buildSetup,deriveStage} from './flow.mjs';
import {getMatchdayJournal} from './bridge.mjs';
function browserDependencies(gameId,scope){
  const BT=window.BT;
  let deviceId=localStorage.getItem('courthub_live_device');if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem('courthub_live_device',deviceId);}
  return {deviceId,uuid:()=>crypto.randomUUID(),now:()=>Date.now(),load:()=>BT.storage.load(),save:d=>BT.storage.save(d),
    getIdentity:()=>{const s=BT.sync.getState();return {...s,organizationId:s.user?.organization?.id,actorId:s.user?.id,role:s.user?.role};},
    subscribeIdentity:fn=>{window.addEventListener('bt-sync-change',fn);return()=>window.removeEventListener('bt-sync-change',fn);},
    openLive:()=>openLiveGame({gameId,scope})};
}
export async function openMatchday({gameId,scope,deps=browserDependencies(gameId,scope)}){
  const journal=deps.journal||await getMatchdayJournal(scope);
  const game=()=>deps.load().games?.find(g=>g.id===gameId);
  let envelope=mergeMatchday(game()?.matchday,await journal.read(gameId)).value;
  const live=await deps.openLive();
  let closed=false,chain=Promise.resolve(),busy=false,error=null,localStatus='empty';const listeners=new Set();
  const identityOK=()=>{const i=deps.getIdentity();return !closed&&i.actorId===scope.actorId&&i.organizationId===scope.organizationId&&i.sessionEpoch===scope.sessionEpoch;};
  const writable=()=>identityOK()&&['admin','coach','assistant'].includes(deps.getIdentity().role);
  function draftFallback(){const s=live.getState().session;return s?{...emptyDraft(),roster:clone(s.roster),startingFive:clone(s.startingFive),config:clone(s.config)}:emptyDraft();}
  function getState(){const selection=selectDraft(envelope),liveState=live.getState();return {...selection,draft:selection.draft||draftFallback(),choices:clone(envelope?.revisions.filter(r=>selection.heads.includes(r.id))||[]),stage:deriveStage({draft:selection.draft,liveState,draftConflict:selection.conflict}),liveState,localStatus,error,busy,readOnly:!writable()};}
  function notify(){if(!closed)for(const fn of listeners)fn(getState());}
  async function refresh(){
    if(!identityOK())return;
    const stored=await journal.read(gameId);if(!identityOK())return;
    envelope=mergeMatchday(envelope,mergeMatchday(game()?.matchday,stored).value).value;
    const pending=await journal.pending();if(!identityOK())return;
    localStatus=pending.some(r=>r.gameId===gameId)?'pending':envelope?'synced':'empty';notify();
  }
  function guarded(){ensure(writable(),'permission','Kein Schreibrecht oder Konto/Team wurde gewechselt.');ensure(game(),'deletion','Spiel wurde entfernt. Lokale Vorbereitung bleibt gesichert.');}
  function enqueue(fn){chain=chain.then(async()=>{busy=true;error=null;notify();try{guarded();await fn();return {ok:true};}catch(e){error=e.message;return {ok:false,error};}finally{busy=false;notify();}});return chain;}
  async function write(next){guarded();const saved=await journal.append(gameId,next);ensure(identityOK(),'identity','Lokal gesichert. Konto gewechselt; Ansicht neu öffnen.');envelope=saved;localStatus='pending';
    const data=deps.load(),target=data.games?.find(g=>g.id===gameId);ensure(target,'deletion','Spiel entfernt; Vorbereitung bleibt im Journal.');
    target.matchday=mergeMatchday(target.matchday,saved).value;
    try{deps.save(data);}catch(e){error='Lokal gesichert; Teamdaten konnten nicht gespeichert werden: '+e.message;}
  }
  const metadata=()=>({id:deps.uuid(),actorId:scope.actorId,deviceId:deps.deviceId,recordedAt:new Date(deps.now()).toISOString()});
  function saveDraft(value,{parents=selectDraft(envelope).heads}={}){
    const snapshot=clone(value),baseParents=[...parents].sort();
    return enqueue(async()=>{
      const selection=selectDraft(envelope);ensure(!selection.conflict,'collision','Vorbereitungskonflikt zuerst auflösen.');
      if(live.getState().hasLiveData){const previous=selection.draft||draftFallback();for(const k of ['roster','startingFive','config','ownSide','kind','step'])ensure(canonical(snapshot[k])===canonical(previous[k]),'session','Spiel läuft oder ist beendet. Kader/Uhr nur über Live-Korrektur ändern.');}
      if(selection.draft&&canonical(selection.draft)===canonical(snapshot))return;
      await write(reviseMatchday(envelope,{...metadata(),parents:baseParents,value:snapshot}));
    });
  }
  function resolve(chosenId){return enqueue(async()=>{await refresh();guarded();await write(resolveMatchday(envelope,chosenId,metadata()));});}
  function start(){return enqueue(async()=>{
    const state=live.getState();if(state.session)return;
    ensure(!state.hasLiveData,'selection','Erfassung zuerst auswählen.');
    await refresh();guarded();const selection=selectDraft(envelope);ensure(!selection.conflict,'collision','Vorbereitungskonflikt zuerst auflösen.');
    const result=await live.dispatch({kind:'setup',id:deps.uuid(),payload:buildSetup(selection.draft)});ensure(result.ok,'setup',result.error||'Erfassung konnte nicht gestartet werden.');
  });}
  const unlive=live.subscribe(notify);
  const unidentity=deps.subscribeIdentity(()=>{if(!identityOK()){notify();return;}refresh().catch(e=>{error=e.message;notify();});});
  await refresh();
  return {live,getState,saveDraft,resolve,start,refresh,idle:async()=>{await chain;await live.idle();},subscribe(fn){listeners.add(fn);fn(getState());return()=>listeners.delete(fn);},
    async close(){closed=true;unidentity();unlive();listeners.clear();await chain;await live.close();}};
}
