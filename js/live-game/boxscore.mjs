import {effectiveEvents,projectStats,validateSession} from './core.mjs';
import {clockAt,projectLineups,lineupAtEvent} from './clock.mjs';

const madePoints=Object.freeze({'ft-made':1,'two-made':2,'three-made':3});
// A later correction cannot certify itself through editing an old confirmation.
function coverageCurrent(s,events) {
  const confirmation=events.filter(e=>e.kind==='score-coverage').at(-1);
  if(!confirmation?.payload.complete)return false;
  const relevant=e=>e && !['roster','score-coverage','amend','void'].includes(e.kind);
  for(const e of s.events){
    if(e.seq<=confirmation.seq)continue;
    if(relevant(e))return false;
    const targets=e.kind==='void'?[e.payload.targetId]:e.kind==='amend'?e.payload.changes.map(c=>c.targetId):[];
    if(targets.some(id=>relevant(s.events.find(x=>x.id===id))))return false;
  }
  return true;
}

export function projectBoxscore(s,nowMs) {
  validateSession(s);
  const stats=projectStats(s),lineups=projectLineups(s,nowMs),events=effectiveEvents(s);
  const supportsScoring=s.schemaVersion===2,complete=clockAt(s,nowMs).ended;
  const players=Object.values(stats.players).map(p=>{
    const played=lineups.playedIds.includes(p.id),minutesMs=lineups.minutesMs[p.id]||0;
    return {...p,played,minutesMs,minutesSeconds:Math.floor(minutesMs/1000),plusMinus:supportsScoring&&played?0:null};
  });
  const byId=new Map(players.map(p=>[p.id,p]));
  let opponentPoints=supportsScoring?0:null;
  if(supportsScoring)for(const e of events){
    let delta=0;
    if(e.kind==='opponent-score'){opponentPoints+=e.payload.points;delta=-e.payload.points;}
    else if(e.kind==='stat')delta=madePoints[e.payload.action]||0;
    if(delta)for(const id of lineupAtEvent(lineups.boundaries,s,e))byId.get(id).plusMinus+=delta;
  }
  return {players,teamPoints:stats.points,opponentPoints,stints:lineups.stints,complete,
    plusMinusComplete:supportsScoring&&complete&&coverageCurrent(s,events),issues:[]};
}
