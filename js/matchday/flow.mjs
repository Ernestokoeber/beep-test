import {createSession,clone,ensure} from '../live-game/core.mjs';
import {validateStaff,isCoachOnly} from '../coaching-staff.mjs';
export function buildSetup(draft){
  validateStaff(draft?.staff);
  ensure(draft&&['home','away'].includes(draft.ownSide),'selection','Eigene Mannschaft als Heim oder Gast bestätigen.');
  const {roster,startingFive,config}=draft;
  ensure(roster.every(player=>player.gameStatus===undefined||(player.gameStatus==='starter')===startingFive.includes(player.id)),'selection','Starting Five und Spielerstatus stimmen nicht überein.');
  const nominatedRoster=roster.filter(player=>player.gameStatus!=='dnp');
  ensure(nominatedRoster.every(player=>!isCoachOnly(draft,player.id)),'selection','Trainer ohne Spielerrolle dürfen keinen Spielerplatz belegen.');
  ensure(nominatedRoster.length>=5,'selection','Mindestens fünf Spieler für den Spieltagskader auswählen.');
  const gameplan={ownSide:draft.ownSide,kind:draft.kind,goals:draft.goals,warmup:draft.warmup,tactics:draft.tactics,coachingNote:draft.coachingNote,opponentPlan:draft.opponentPlan||null,...(draft.staff?{staff:clone(draft.staff)}:{})};
  createSession({schemaVersion:3,id:'validation',deviceId:'validation',actorId:'validation',roster:nominatedRoster,startingFive,config,gameplan});
  return clone({roster:nominatedRoster,startingFive,config,gameplan});
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

