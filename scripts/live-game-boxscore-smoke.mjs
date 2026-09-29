import assert from 'node:assert/strict';
import {createSession,appendEvent,sessionRoster,validateSession} from '../js/live-game/core.mjs';
const fresh=(schemaVersion=2)=>createSession({schemaVersion,id:'s',deviceId:'d',actorId:'u',
  roster:Array.from({length:7},(_,i)=>({id:'p'+(i+1),name:'P'+(i+1),jerseyNumber:String(i)})),
  startingFive:['p1','p2','p3','p4','p5'],config:{periods:4,periodMs:600000,overtimeMs:300000}});
const event=(s,kind,payload={},remainingMs=600000,period=1)=>({id:'e'+(s.events.length+1),sessionId:s.id,seq:s.events.length+1,kind,payload,remainingMs,period,recordedAt:'2026-09-29T18:00:00Z'});
let s=fresh();
assert.equal(s.schemaVersion,2,'New explicit format must be retained');
s=appendEvent(s,event(s,'roster',{players:[{id:'p1',name:'Neuer Name'}]}));
assert.equal(sessionRoster(s)[0].jerseyNumber,'0','Name-only correction preserves jersey');
assert.throws(()=>appendEvent(s,event(s,'roster',{players:[{id:'p2',name:'P2',jerseyNumber:'0'}]})));
s=appendEvent(s,event(s,'roster',{players:[{id:'p2',name:'P2',jerseyNumber:'00'}]}));
assert.equal(sessionRoster(s)[1].jerseyNumber,'00');
for(const jerseyNumber of ['',123,'123','-1',0])assert.throws(()=>appendEvent(s,event(s,'roster',{players:[{id:'p2',name:'P2',jerseyNumber}]})));
s=appendEvent(s,event(s,'roster',{players:[{id:'p1',name:'P1',jerseyNumber:'00'},{id:'p2',name:'P2',jerseyNumber:'0'}]}));
assert.equal(sessionRoster(s)[0].jerseyNumber,'00');
s=appendEvent(s,event(s,'roster',{players:[{id:'p1',name:'P1',jerseyNumber:null}]}));
assert.equal(sessionRoster(s)[0].jerseyNumber,null);
assert.throws(()=>createSession({...fresh(),schemaVersion:3}));
assert.throws(()=>validateSession({...fresh(),schemaVersion:undefined}));
assert.throws(()=>createSession({...fresh(),roster:fresh().roster.map(p=>({...p,jerseyNumber:'4'}))}));
assert.throws(()=>appendEvent(fresh(1),event(fresh(1),'opponent-score',{points:2})));
for(const payload of [{points:0},{points:4},{points:1.5},{points:'2'},{points:2,playerId:'p1'}])assert.throws(()=>appendEvent(s,event(s,'opponent-score',payload)));
for(const payload of [{complete:1},{complete:'true'},{complete:true,playerId:'p1'}])assert.throws(()=>appendEvent(s,event(s,'score-coverage',payload)));
console.log('Live boxscore: format and jersey validation passed.');
