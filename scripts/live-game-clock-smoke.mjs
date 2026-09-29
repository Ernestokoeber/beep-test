import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
assert.ok(existsSync(new URL('../js/live-game/clock.mjs',import.meta.url)),'Spielzeitmodell fehlt');
const {clockAt,projectLineups}=await import('../js/live-game/clock.mjs');
const {createSession,appendEvent}=await import('../js/live-game/core.mjs');
const fresh=()=>createSession({id:'s',deviceId:'d',actorId:'u',roster:Array.from({length:7},(_,i)=>({id:'p'+(i+1),name:'P'+i})),startingFive:['p1','p2','p3','p4','p5'],config:{periods:4,periodMs:600000,overtimeMs:300000}});
let s=fresh();
function add(kind,remainingMs,payload={},period=1){s=appendEvent(s,{id:'e'+(s.events.length+1),sessionId:'s',seq:s.events.length+1,period,remainingMs,recordedAt:'2026-09-29T18:00:00Z',kind,payload});}
add('clock-start',600000,{startedAtMs:100000});
assert.equal(clockAt(s,220000).remainingMs,480000);
assert.equal(clockAt(JSON.parse(JSON.stringify(s)),220000).remainingMs,480000);
add('clock-pause',480000);
add('substitution',480000,{out:['p1'],in:['p6']});
add('clock-start',480000,{startedAtMs:250000});
add('clock-pause',420000);
const p=projectLineups(s,340000);
assert.equal(p.minutesMs.p1,120000);assert.equal(p.minutesMs.p6,60000);
assert.equal(p.minutesMs.p2,180000);assert.equal(Object.values(p.minutesMs).reduce((a,b)=>a+b,0),900000);
assert.throws(()=>add('substitution',420000,{out:['p1'],in:['p7']}));
assert.throws(()=>add('clock-correction',420000,{toRemainingMs:500000}));
add('clock-correction',420000,{toRemainingMs:430000});
assert.equal(projectLineups(s,999999).minutesMs.p6,50000);
add('substitution',430000,{out:['p6','p2'],in:['p1','p7']});
assert.deepEqual(projectLineups(s,999999).onCourt.sort(),['p1','p3','p4','p5','p7']);
add('substitution',430000,{out:['p7'],in:[],allowShortHanded:true});
assert.equal(projectLineups(s,999999).onCourt.length,4);
add('clock-start',430000,{startedAtMs:1000000});
assert.equal(clockAt(s,2000000).remainingMs,0);assert.equal(clockAt(s,2000000).running,false);
add('clock-pause',0);add('period-start',600000,{},2);
assert.equal(clockAt(s,3000000).period,2);
assert.throws(()=>add('period-start',300000,{},5));
s=fresh();add('clock-start',600000,{startedAtMs:100000});add('clock-pause',500000);
add('clock-correction',500000,{toRemainingMs:510000});
assert.equal(projectLineups(s,999999).minutesMs.p1,90000);
// Replacing an early switch must reject a later event for the now benched player.
s=fresh();add('clock-start',600000,{startedAtMs:100000});add('clock-pause',500000);
add('substitution',500000,{out:['p1'],in:['p6']});add('stat',500000,{playerId:'p6',action:'two-made'});
assert.throws(()=>add('void',500000,{targetId:'e3'}));
s=fresh();add('clock-start',600000,{startedAtMs:100000});
assert.equal(clockAt(s,90000).running,false);assert.ok(clockAt(s,90000).clockSkew);
console.log('Live clock: pauses, substitutions, corrections, understrength and recovery passed.');
// Full regulation and two overtimes; every section is explicitly started and stopped.
s=fresh();let anchor=100000;
for(let period=1;period<=6;period++){
  const ms=period<=4?600000:300000;
  if(period>1)add('period-start',ms,{},period);
  add('clock-start',ms,{startedAtMs:anchor},period);add('clock-pause',0,{},period);anchor+=ms+60000;
}
assert.equal(projectLineups(s,anchor).minutesMs.p1,3000000);
assert.equal(Object.values(projectLineups(s,anchor).minutesMs).reduce((a,b)=>a+b,0),15000000);
add('finish',0,{},6);assert.equal(clockAt(s,anchor).ended,true);
// Five fouls are counted, not an implicit lineup mutation.
s=fresh();for(let i=0;i<5;i++)add('stat',600000,{playerId:'p1',action:'foul'});
assert.ok(projectLineups(s,0).onCourt.includes('p1'));
// Atomic correction of paused clock and substitution, with dependent start.
s=fresh();add('clock-start',600000,{startedAtMs:100000});add('clock-pause',500000);
add('substitution',500000,{out:['p1'],in:['p6']});
add('amend',500000,{changes:[{targetId:'e2',patch:{remainingMs:510000}},{targetId:'e3',patch:{remainingMs:510000}}]});
assert.equal(projectLineups(s,999999).minutesMs.p1,90000);
console.log('Live clock: full regulation, two overtimes, foul limit and atomic correction passed.');
s=fresh();add('clock-start',600000,{startedAtMs:100000});add('clock-pause',600000,{clockSkew:true});
assert.equal(clockAt(s,90000).needsCorrection,true);
assert.throws(()=>add('clock-start',600000,{startedAtMs:90000}));
add('clock-correction',600000,{toRemainingMs:590000});
add('clock-start',590000,{startedAtMs:90000});assert.equal(clockAt(s,90000).needsCorrection,false);
