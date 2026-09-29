import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {mergeLiveStats,protectWorkspace} from '../js/live-game/merge.mjs';
import {createSession,appendEvent} from '../js/live-game/core.mjs';
const failures=[];
async function test(name,fn){try{await fn();console.log('PASS',name);}catch(e){failures.push(name);console.error('FAIL',name,e.message);}}
const fresh=()=>createSession({id:'s',deviceId:'d',actorId:'u',roster:Array.from({length:5},(_,i)=>({id:'p'+i,name:'P'+i})),startingFive:['p0','p1','p2','p3','p4'],config:{periods:4,periodMs:600000,overtimeMs:300000}});
const event=(s,id)=>({id,sessionId:s.id,seq:s.events.length+1,period:1,remainingMs:600000,recordedAt:'2026-09-29',kind:'stat',payload:{playerId:'p0',action:'three-made'}});
const wrap=s=>({schemaVersion:1,sessions:[s],selectedSessionId:s.id,resolutionRevision:0});
function harness(local,remote,bridge){
  const dom=new JSDOM('',{url:'https://local.test',runScripts:'outside-only'}),w=dom.window;let token=null,puts=[];
  Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.TextEncoder=TextEncoder;
  const user={id:'u',role:'coach',organization:{id:'org'}};
  w.BT={loadLive:async()=>({bridge}),util:{toast(){}},storage:{load:()=>structuredClone(local),save:d=>{local=structuredClone(d);}},api:{getToken:()=>token,setToken:t=>{token=t;},login:async()=>({token:'TOKEN_A',user}),getWorkspace:async()=>({data:structuredClone(remote),version:1}),saveWorkspace:async(data)=>{puts.push({token,data:structuredClone(data)});remote=protectWorkspace(data,remote);return {version:2,data:structuredClone(remote)};}}};
  w.eval(readFileSync(new URL('../js/sync.js',import.meta.url),'utf8'));
  return {w,puts,local:()=>local,remote:()=>remote,setToken:t=>{token=t;},close:()=>dom.window.close()};
}
const noJournal={beforeSend:async data=>({data,receipt:[]}),beforeApply:async d=>d,ack:async()=>{},hasPending:async()=>false,mergeAccepted:async(local,remote)=>protectWorkspace(local,remote)};
for(const notify of [true,false])await test('cross-tab token switch during journal await; storage event='+notify,async()=>{
  let release,entered;const gate=new Promise(r=>{entered=r;});let blocked=false;
  const bridge={...noJournal,beforeSend:async data=>{if(blocked){entered();await new Promise(r=>{release=r;});}return {data,receipt:[]};}};
  const data={games:[{id:'private-a',notes:'PRIVATE TEAM A'}],meta:{updatedAt:'2026-09-29'}};
  const h=harness(data,data,bridge);try{await h.w.BT.sync.login();blocked=true;const pending=h.w.BT.sync.syncNow();await gate;
    h.setToken('TOKEN_B');if(notify)h.w.dispatchEvent(new h.w.StorageEvent('storage',{key:'beeptest_auth_token',newValue:'TOKEN_B'}));release();await pending;
    assert.equal(h.puts.length,0,'Prepared Team-A data must not be sent with Team-B token');assert.equal(h.w.BT.sync.getState().user,null);
  }finally{h.close();}
});
await test('accepted server events return to a newer local workspace',async()=>{
  let s=appendEvent(fresh(),event(fresh(),'one'));const remoteS=appendEvent(s,event(s,'two'));
  const local={games:[{id:'g',liveStats:wrap(s)}],meta:{updatedAt:'2026-09-29T20:00:00Z'}},remote={games:[{id:'g',liveStats:wrap(remoteS)}],meta:{updatedAt:'2026-09-29T19:00:00Z'}};
  const h=harness(local,remote,noJournal);try{await h.w.BT.sync.login();assert.equal(h.local().games[0].liveStats.sessions[0].events.length,2);assert.equal(h.w.BT.sync.getState().status,'synced');}finally{h.close();}
});
await test('late old-device events reopen resolved selection',()=>{
  const s=fresh(),copy={...structuredClone(s),id:'new',deviceId:'new-device'};
  const selected={schemaVersion:1,sessions:[s,copy],selectedSessionId:'new',resolutionRevision:1};
  const changed=appendEvent(s,event(s,'late'));
  const merged=mergeLiveStats(selected,wrap(changed));assert.equal(merged.value.selectedSessionId,null);assert.equal(merged.conflicts.length,1);
});
await test('correction UI includes resumed clock anchor',async()=>{
  const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;
  const {mountLiveView}=await import('../js/live-game/view.mjs');const {clockAt,projectLineups}=await import('../js/live-game/clock.mjs');const {projectStats}=await import('../js/live-game/core.mjs');
  let s=fresh();const add=(kind,time,payload={})=>{s=appendEvent(s,{id:'e'+(s.events.length+1),sessionId:s.id,seq:s.events.length+1,kind,period:1,remainingMs:time,recordedAt:'2026-09-29',payload});};
  add('clock-start',600000,{startedAtMs:1000});add('clock-pause',480000);add('substitution',480000,{out:['p0'],in:[],allowShortHanded:true});add('clock-start',480000,{startedAtMs:200000});add('clock-pause',420000);
  const state={session:s,live:wrap(s),roster:s.roster,clock:clockAt(s,300000),stats:projectStats(s),lineups:projectLineups(s,300000)};
  let captured;const cleanup=mountLiveView(document.querySelector('main'),{subscribe(fn){fn(state);return()=>{};},async dispatch(c){captured=c;return {ok:true};}});
  [...document.querySelectorAll('button')].find(b=>b.textContent==='Protokoll korrigieren').click();
  const rows=[...document.querySelectorAll('fieldset')];assert.ok(rows.some(r=>r.id==='live-event-e4'),'Following start anchor must be editable');
  for(const id of ['e2','e3','e4'])document.getElementById('live-event-'+id).querySelector('input[type=text]').value='08:10';
  document.querySelector('.live-panel form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await Promise.resolve();
  s=appendEvent(s,{id:'fix',sessionId:s.id,seq:6,kind:captured.kind,period:1,remainingMs:420000,recordedAt:'2026-09-29',payload:captured.payload});
  assert.equal(projectLineups(s,300000).minutesMs.p0,110000);cleanup();dom.window.close();
});
assert.deepEqual(failures,[],'Review regressions must pass');
