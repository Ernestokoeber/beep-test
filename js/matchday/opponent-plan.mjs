import {effectiveEvents} from '../live-game/core.mjs';
import {clockAt,position} from '../live-game/clock.mjs';

export const DEFENSES=Object.freeze({
  man:'Mannverteidigung · No-Middle',
  zone212:'Zone 2-1-2',
  zone32:'Zone 3-2'
});

export const OBSERVATIONS=Object.freeze({
  paint:'Paint / Drive',
  'open-three':'Offener Dreier',
  oreb:'Offensiv-Rebound',
  'free-throw-pressure':'Freiwurfdruck'
});

const clean=(value,max=400)=>String(value||'').trim().slice(0,max);
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const compact=list=>(Array.isArray(list)?list:[]).map(item=>clean(item)).filter(Boolean);

export function createOpponentPlan({game,context,now=Date.now()}={}){
  if(!context)return null;
  const defense=context.defenseRecommendation||{};
  const start=Object.hasOwn(DEFENSES,defense.start)?defense.start:'man';
  const alternative=Object.hasOwn(DEFENSES,defense.alternative)?defense.alternative:(start==='man'?'zone212':'man');
  const player=entry=>({
    id:clean(entry?.id,120),name:clean(entry?.name,100),games:finite(entry?.games),
    pointsPerGame:finite(entry?.pointsPerGame),foulsPerGame:finite(entry?.foulsPerGame),
    threePointPct:finite(entry?.threePointPct),threeAttemptsPerGame:finite(entry?.threeAttemptsPerGame)
  });
  return {
    schemaVersion:1,
    opponentId:clean(context.opponentId,120),
    opponent:clean(context.opponent||game?.away||game?.home||'Gegner',100),
    gameId:clean(game?.id,120),
    capturedAt:new Date(now).toISOString(),
    sourceUpdatedAt:context.dataQuality?.lastUpdated||null,
    dataQuality:{
      confidence:['low','medium','high'].includes(context.dataQuality?.confidence)?context.dataQuality.confidence:'low',
      sources:compact(context.dataQuality?.sources).slice(0,8),
      warning:clean(context.dataQuality?.warning,300)||null
    },
    results:{
      games:finite(context.results?.games),wins:finite(context.results?.wins),losses:finite(context.results?.losses),
      pointsForPerGame:finite(context.results?.pointsForPerGame),pointsAgainstPerGame:finite(context.results?.pointsAgainstPerGame)
    },
    teamStatistics:{
      gamesWithMadeProfile:finite(context.teamStatistics?.gamesWithMadeProfile),
      twoMadeShare:finite(context.teamStatistics?.twoMadeShare),threeMadeShare:finite(context.teamStatistics?.threeMadeShare),
      threePointPct:finite(context.teamStatistics?.threePointPct),threeAttemptsPerGame:finite(context.teamStatistics?.threeAttemptsPerGame),
      freeThrowsMadePerGame:finite(context.teamStatistics?.freeThrowsMadePerGame),teamFoulsPerGame:finite(context.teamStatistics?.teamFoulsPerGame),
      madeShotTendency:clean(context.teamStatistics?.madeShotTendency,40)||'unknown'
    },
    topScorers:(context.topScorers||[]).slice(0,5).map(player),
    bestShooters:(context.bestShooters||[]).slice(0,5).map(player),
    scouting:{
      insideThreat:clean(context.scouting?.insideThreat,20)||'unknown',perimeterThreat:clean(context.scouting?.perimeterThreat,20)||'unknown',
      highPostPassing:clean(context.scouting?.highPostPassing,20)||'unknown',offensiveRebounding:clean(context.scouting?.offensiveRebounding,20)||'unknown',
      primaryScorerArea:clean(context.scouting?.primaryScorerArea,20)||'unknown',notes:clean(context.scouting?.notes,800)
    },
    defense:{
      start,startLabel:DEFENSES[start],alternative,alternativeLabel:DEFENSES[alternative],
      reasons:compact(defense.reasons).slice(0,5),triggers:compact(defense.triggers).slice(0,5),
      risk:clean(defense.risk,400),confidence:['low','medium','high'].includes(defense.confidence)?defense.confidence:'low'
    },
    aiPlan:null
  };
}

export function fallbackGamePlan(plan){
  if(!plan)return null;
  const scorer=plan.topScorers?.find(item=>item.name);
  const stats=plan.teamStatistics||{};
  const scoringEvidence=scorer&&scorer.pointsPerGame!==null
    ? `${scorer.name} früh identifizieren und bei seinen ersten Aktionen die bevorzugte Richtung lesen.`
    : 'In den ersten drei Angriffen Ballhandler, bevorzugte Seite und Abschlusszonen eindeutig identifizieren.';
  const shotEvidence=stats.gamesWithMadeProfile>=2&&stats.twoMadeShare!==null
    ? `${stats.twoMadeShare} % der sichtbaren Feldtreffer sind Zweier; Paint schützen, ohne Mitteldistanz automatisch als Ringabschluss zu werten.`
    : 'Wurfprofil ist nicht vollständig belegt; keine Quote oder Schwäche unterstellen.';
  return {
    lockerRoom:[
      `Wir starten in ${plan.defense.startLabel} und kommunizieren jede Hilfe früh.`,
      scoringEvidence,
      'Wir entscheiden nach beobachtbaren Auslösern und wechseln die Defense nicht aus Gefühl.'
    ],
    gameGoals:['No-Middle und frühe Helpside konsequent umsetzen.','Jeden Defensiv-Rebound mit Kontakt und klarer Zuständigkeit sichern.','Nach Ballgewinn oder Rebound schnell, aber kontrolliert in die Transition kommen.'],
    offenseKeys:['In den ersten Angriffen Matchups und Help-Positionen lesen.','Mit Spacing und Paint-Touches Vorteile erzeugen.','Gute Würfe wiederholen und Ballverluste durch klare Passwinkel vermeiden.'],
    defenseKeys:[shotEvidence,...(plan.defense.reasons||[]).slice(0,2)],
    warmupFocus:['Closeouts mit No-Middle-Fußarbeit.','Box-out, Ball sichern und erster Outlet-Pass.','Spielnahe Abschlüsse aus den vorgesehenen Offense-Spots.'],
    halftimeChecks:['Welche Abschlüsse erzielt der Gegner tatsächlich?','Welche Defense verhindert Paint-Touches und offene Würfe besser?','Rebound, Fouls und Ballverluste mit dem Gameplan abgleichen.']
  };
}

export function mergeAIPlan(plan,aiPlan){
  if(!plan||!aiPlan)return plan;
  const list=(key,max=3)=>compact(aiPlan[key]).slice(0,max);
  return {...plan,aiPlan:{
    lockerRoom:list('lockerRoom'),gameGoals:list('gameGoals'),offenseKeys:list('offenseKeys'),
    defenseKeys:list('defenseKeys'),warmupFocus:list('warmupFocus'),halftimeChecks:list('halftimeChecks'),
    generatedAt:new Date().toISOString()
  }};
}

export function activeGamePlan(plan){return plan?.aiPlan||fallbackGamePlan(plan);}

export function projectOpponentLive(session,plan,now=Date.now()){
  const events=session?effectiveEvents(session):[];
  const counts=Object.fromEntries(Object.keys(OBSERVATIONS).map(key=>[key,0]));
  const totalCounts={...counts};
  let currentDefense=plan?.defense?.start||'man',lastChangeSeq=0;
  const changes=[];
  const byDefense=Object.fromEntries(Object.keys(DEFENSES).map(defense=>[defense,{defense,label:DEFENSES[defense],minutesMs:0,points:0,one:0,two:0,three:0,observations:Object.fromEntries(Object.keys(OBSERVATIONS).map(key=>[key,0]))}]));
  const playerMap=new Map();
  for(const event of events){
    if(event.kind==='defense-change'){
      currentDefense=event.payload.defense;lastChangeSeq=event.seq;
      changes.push({defense:currentDefense,period:event.period,remainingMs:event.remainingMs,seq:event.seq});
    }
    if(event.kind==='opponent-observation'&&Object.hasOwn(totalCounts,event.payload.type)){
      totalCounts[event.payload.type]++;byDefense[currentDefense].observations[event.payload.type]++;
    }
    if(event.kind==='opponent-score'){
      const bucket=event.payload.points===1?'one':event.payload.points===2?'two':'three';
      byDefense[currentDefense].points+=event.payload.points;byDefense[currentDefense][bucket]++;
      if(event.payload.opponentPlayerName){
        const key=event.payload.opponentPlayerId||event.payload.opponentPlayerName.toLocaleLowerCase('de-DE');
        const player=playerMap.get(key)||{id:event.payload.opponentPlayerId||'',name:event.payload.opponentPlayerName,points:0,one:0,two:0,three:0};
        player.points+=event.payload.points;player[bucket]++;playerMap.set(key,player);
      }
    }
  }
  for(const event of events){if(event.seq>lastChangeSeq&&event.kind==='opponent-observation'&&Object.hasOwn(counts,event.payload.type))counts[event.payload.type]++;}
  const opponentScores=events.filter(event=>event.kind==='opponent-score');
  const made={one:opponentScores.filter(event=>event.payload.points===1).length,two:opponentScores.filter(event=>event.payload.points===2).length,three:opponentScores.filter(event=>event.payload.points===3).length};
  if(session){
    const currentClock=clockAt(session,now),end=position(session,currentClock.period,currentClock.remainingMs);
    let defense=plan?.defense?.start||'man',start=0;
    for(const event of events.filter(item=>item.kind==='defense-change')){
      const at=Math.max(start,Math.min(end,position(session,event.period,event.remainingMs)));
      byDefense[defense].minutesMs+=Math.max(0,at-start);defense=event.payload.defense;start=at;
    }
    byDefense[defense].minutesMs+=Math.max(0,end-start);
  }
  for(const item of Object.values(byDefense))item.pointsPer10=item.minutesMs?Math.round(item.points*6000000/item.minutesMs)/10:null;
  const playerScoring=[...playerMap.values()].sort((left,right)=>right.points-left.points||left.name.localeCompare(right.name,'de'));
  const comparable=Object.values(byDefense).filter(item=>item.minutesMs>=120000).sort((left,right)=>left.pointsPer10-right.pointsPer10);
  const comparison=comparable.length>=2?{
    bestDefense:comparable[0].defense,
    message:`${comparable[0].label} hat bisher mit ${comparable[0].pointsPer10.toLocaleString('de-DE')} Gegnerpunkten pro 10 Spielminuten den niedrigsten Wert. Kleine Stichprobe beachten.`
  }:null;
  let unanswered=0,maxUnanswered=0;
  for(const event of events){
    if(event.kind==='opponent-score'){unanswered+=event.payload.points;maxUnanswered=Math.max(maxUnanswered,unanswered);}
    else if(event.kind==='stat'&&/(ft|two|three)-made/.test(event.payload.action))unanswered=0;
  }
  const suggestions=[];
  const add=(code,message,recommendedDefense)=>{if(!suggestions.some(item=>item.code===code))suggestions.push({code,message,recommendedDefense});};
  if(counts.paint>=2&&currentDefense!=='zone212')add('paint','Mehrere Paint-/Drive-Aktionen seit dem letzten Wechsel: 2-1-2 prüfen.','zone212');
  if(counts['open-three']>=2&&currentDefense!=='zone32')add('open-three','Mehrere offene Dreier seit dem letzten Wechsel: 3-2 prüfen.','zone32');
  if(counts.oreb>=2&&currentDefense!=='man')add('oreb','Zwei Offensiv-Rebounds seit dem letzten Wechsel: Mannverteidigung und klare Box-outs prüfen.','man');
  if(counts['free-throw-pressure']>=2)add('free-throw-pressure','Wiederholter Freiwurfdruck: No-Middle, vertikale Hilfe und Hände zurück betonen.','man');
  if(made.three>=3&&currentDefense!=='zone32')add('three-made','Mindestens drei gegnerische Dreier erfasst: Perimeter-Abdeckung und 3-2 prüfen.','zone32');
  if(unanswered>=6)add('run',`${unanswered} unbeantwortete Gegnerpunkte: stoppen, Matchups klären und Defense bewusst bestätigen.`,currentDefense);
  return {currentDefense,currentDefenseLabel:DEFENSES[currentDefense],counts,totalCounts,made,unanswered,maxUnanswered,changes,suggestions,byDefense,playerScoring,comparison};
}

export function buildOpponentFeedback({game,plan,session,now=Date.now()}={}){
  if(!game?.id||!plan?.opponentId||!session)return null;
  const live=projectOpponentLive(session,plan);
  const finished=effectiveEvents(session).findLast(event=>event.kind==='finish');
  return {
    gameId:String(game.id),date:String(game.date||''),recordedAt:finished?.recordedAt||new Date(now).toISOString(),
    opponentId:plan.opponentId,opponent:plan.opponent,
    observations:{...live.totalCounts},opponentMakes:{...live.made},
    defenseChanges:live.changes.map(item=>({defense:item.defense,period:item.period,remainingMs:item.remainingMs})),
    defenseSummary:Object.values(live.byDefense).map(item=>({...item,observations:{...item.observations}})),
    playerScoring:live.playerScoring.map(item=>({...item})),
    finalDefense:live.currentDefense
  };
}
