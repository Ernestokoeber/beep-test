import assert from 'node:assert/strict';
import {appendEvent,createSession} from '../js/live-game/core.mjs';
import {activeGamePlan,buildOpponentFeedback,createOpponentPlan,mergeAIPlan,projectOpponentLive} from '../js/matchday/opponent-plan.mjs';

const game={id:'cup',date:'2026-10-04',home:'TSV Lindau',away:'TSV Ottobeuren',leagueName:'Bezirkspokal'};
const context={
  opponentId:'otto',opponent:'TSV Ottobeuren',results:{games:3,wins:1,losses:2,pointsForPerGame:68,pointsAgainstPerGame:70},
  teamStatistics:{gamesWithMadeProfile:3,twoMadeShare:86.5,threeMadeShare:13.5,freeThrowsMadePerGame:15.3,madeShotTendency:'inside-pressure'},
  topScorers:[{id:'luca',name:'Luca Tillinger',games:3,pointsPerGame:14.7}],bestShooters:[],scouting:{insideThreat:'high',perimeterThreat:'medium'},
  defenseRecommendation:{start:'man',startLabel:'Mannverteidigung · No-Middle',alternative:'zone212',alternativeLabel:'Zone 2-1-2',reasons:['Zweierlastiges Trefferprofil'],triggers:['Zwei Paint-Touches: 2-1-2 prüfen.'],risk:'Direkte Drives',confidence:'medium'},
  dataQuality:{confidence:'medium',sources:['DBB.Scores-Screenshot'],lastUpdated:'2026-10-03T10:00:00Z'}
};
let plan=createOpponentPlan({game,context,now:Date.parse('2026-10-03T12:00:00Z')});
assert.equal(plan.opponent,'TSV Ottobeuren');assert.equal(plan.defense.start,'man');assert.equal(plan.teamStatistics.twoMadeShare,86.5);
assert.equal(activeGamePlan(plan).lockerRoom.length,3);assert.match(activeGamePlan(plan).defenseKeys[0],/86.5/);
plan=mergeAIPlan(plan,{lockerRoom:['A','B','C'],gameGoals:['1','2','3'],offenseKeys:['1','2','3'],defenseKeys:['1','2','3'],warmupFocus:['1','2','3'],halftimeChecks:['1','2','3']});
assert.deepEqual(activeGamePlan(plan).lockerRoom,['A','B','C']);

const roster=Array.from({length:5},(_,index)=>({id:'p'+index,name:'Spieler '+index,gameStatus:'starter'}));
let session=createSession({schemaVersion:3,id:'session',deviceId:'phone',actorId:'coach',roster,startingFive:roster.map(player=>player.id),config:{periods:4,periodMs:600000,overtimeMs:300000},gameplan:{ownSide:'home',kind:'match',goals:'',warmup:'',coachingNote:'',tactics:[],opponentPlan:plan}});
const add=(kind,payload,seq=session.events.length+1)=>{session=appendEvent(session,{id:'event-'+seq,sessionId:'session',seq,kind,period:1,remainingMs:600000,recordedAt:'2026-10-04T15:00:00Z',payload});};
add('opponent-observation',{type:'paint'});add('opponent-observation',{type:'paint'});add('opponent-score',{points:2});
let live=projectOpponentLive(session,plan);assert.equal(live.counts.paint,2);assert.equal(live.made.two,1);assert.equal(live.suggestions[0].recommendedDefense,'zone212');
add('defense-change',{defense:'zone212'});live=projectOpponentLive(session,plan);assert.equal(live.currentDefense,'zone212');assert.equal(live.counts.paint,0,'Beobachtungszähler muss nach einem Defense-Wechsel neu beginnen');
add('opponent-observation',{type:'open-three'});add('opponent-observation',{type:'open-three'});assert.equal(projectOpponentLive(session,plan).suggestions[0].recommendedDefense,'zone32');
add('finish',{});const feedback=buildOpponentFeedback({game,plan,session});
assert.deepEqual(feedback.observations,{paint:2,'open-three':2,oreb:0,'free-throw-pressure':0});assert.equal(feedback.finalDefense,'zone212');assert.equal(feedback.recordedAt,'2026-10-04T15:00:00Z');
assert.throws(()=>appendEvent(session,{id:'bad',sessionId:'session',seq:session.events.length+1,kind:'opponent-observation',period:1,remainingMs:0,recordedAt:'2026-10-04T15:00:00Z',payload:{type:'erfunden'}}));
console.log('Matchday Gegnerplan: Snapshot, KI-Plan, Live-Auslöser, Defense-Wechsel und Rückführung erfolgreich.');
