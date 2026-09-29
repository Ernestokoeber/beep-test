import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
import {openJournal} from '../js/live-game/journal.mjs';
import {createBridge} from '../js/live-game/bridge.mjs';
import {createSession,appendEvent} from '../js/live-game/core.mjs';
const dom=new JSDOM('',{url:'https://local.test',runScripts:'outside-only'}),w=dom.window;
const scope={organizationId:'integration-org',actorId:'u',sessionEpoch:1};
const journal=await openJournal(scope,indexedDB),bridge=createBridge(s=>openJournal(s,indexedDB));
let user={id:'u',role:'coach',organization:{id:scope.organizationId}},local={games:[{id:'g'}],meta:{updatedAt:'2026-09-29'}},remote=structuredClone(local),calls=[],saveImpl=async()=>({version:2}),getImpl=async()=>({data:structuredClone(remote),version:1});
w.BT={loadLive:async()=>({bridge}),util:{toast(){}},storage:{load:()=>structuredClone(local),save:data=>{local=structuredClone(data);}},api:{setToken(){},getToken(){return null;},login:async()=>({token:'token',user}),getWorkspace:()=>getImpl(),saveWorkspace:async(data,v)=>{calls.push(structuredClone(data));return saveImpl(data,v);}}};
w.eval(readFileSync(new URL('../js/sync.js',import.meta.url),'utf8'));
await w.BT.sync.login();
let s=createSession({id:'s',actorId:'u',deviceId:'d',roster:Array.from({length:5},(_,i)=>({id:'p'+i,name:'P'+i})),startingFive:['p0','p1','p2','p3','p4'],config:{periods:4,periodMs:600000,overtimeMs:300000}});
const live=()=>({schemaVersion:1,sessions:[s],selectedSessionId:s.id,resolutionRevision:0});
const append=id=>{s=appendEvent(s,{id,sessionId:'s',seq:s.events.length+1,kind:'stat',period:1,remainingMs:600000,recordedAt:'2026-09-29',payload:{playerId:'p0',action:'two-made'}});};
append('one');await journal.append('g',live());
let attempts=0;saveImpl=async()=>{if(!attempts++)throw Object.assign(Error('conflict'),{status:409,data:{conflict:{data:{...remote,meta:{updatedAt:'2027-01-01'}},version:2}}});return {version:3};};
await w.BT.sync.syncNow();assert.equal(calls.at(-1).games[0].liveStats.sessions[0].events.length,1);assert.equal((await journal.pending()).length,0);
append('two');await journal.append('g',live());saveImpl=async()=>{throw Object.assign(Error('too large'),{status:413});};
await w.BT.sync.syncNow();assert.equal((await journal.pending()).length,1);assert.equal(w.BT.sync.getState().status,'error');
// HTTP outcome lost: same events can be sent again without changing IDs.
saveImpl=async data=>{remote=data;throw Object.assign(Error('offline'),{status:0});};await w.BT.sync.syncNow();assert.equal((await journal.pending()).length,1);
saveImpl=async()=>({version:4});await w.BT.sync.syncNow();assert.equal(calls.at(-1).games[0].liveStats.sessions[0].events.length,2);assert.equal((await journal.pending()).length,0);
// A response from the old account cannot change version or acknowledge its journal.
append('three');await journal.append('g',live());let respond;
saveImpl=()=>new Promise(resolve=>{respond=resolve;});const sending=w.BT.sync.syncNow();
while(!respond)await new Promise(r=>setTimeout(r,1));w.BT.sync.logout();respond({version:99});await sending;
assert.equal(w.BT.sync.getState().version,0);assert.equal((await journal.pending()).length,1);
// Another team must never receive the previous team's cached workspace.
user={id:'other',role:'coach',organization:{id:'other-org'}};remote={games:[]};saveImpl=async()=>({version:1});calls=[];
await w.BT.sync.login();assert.ok(!local.games?.some(g=>g.id==='g'),'Fremde Teamdaten müssen getrennt werden');assert.equal(calls.length,0,'Fremde Live-Daten dürfen nicht hochgeladen werden');
dom.window.close();console.log('Live integration: 409, 413, lost response, logout epoch and team isolation passed.');
