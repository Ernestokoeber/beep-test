import {createSession,clone,ensure} from '../live-game/core.mjs';
export function buildSetup(draft){
  ensure(draft&&['home','away'].includes(draft.ownSide),'selection','Eigene Mannschaft als Heim oder Gast bestätigen.');
  const {roster,startingFive,config}=draft;
  createSession({schemaVersion:2,id:'validation',deviceId:'validation',actorId:'validation',roster,startingFive,config});
  return clone({roster,startingFive,config});
}
export function deriveStage({draft,liveState,draftConflict=false}={}){
  if(liveState?.session){if(liveState.clock.ended)return 'finished';return liveState.clock.remainingMs===0?'pause':'live';}
  if(liveState?.hasLiveData||draftConflict)return 'conflict';
  if(!draft||!draft.ownSide)return 'game';
  if(['preparation','review'].includes(draft.step)){
    try{buildSetup(draft);}catch{return 'roster';}
  }
  return draft.step||'game';
}
