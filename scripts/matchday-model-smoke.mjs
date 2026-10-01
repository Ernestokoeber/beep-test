import assert from 'node:assert/strict';
import {emptyDraft,reviseMatchday,mergeMatchday,selectDraft,resolveMatchday,validateMatchday} from '../js/matchday/model.mjs';
import {deriveStage,buildSetup} from '../js/matchday/flow.mjs';
const make=(id,parents,goals='')=>({id,parents,actorId:'coach',deviceId:'phone',recordedAt:'2026-09-29T10:00:00Z',value:{...emptyDraft(),goals}});
const base=reviseMatchday(undefined,make('base',[]));
const left=reviseMatchday(base,make('left',['base'],'Rebound'));
const right=reviseMatchday(base,make('right',['base'],'Transition'));
const merged=mergeMatchday(left,right).value;
assert.deepEqual(mergeMatchday(right,left).value,merged);
assert.equal(selectDraft(merged).conflict,true);
const resolved=resolveMatchday(merged,'left',{id:'decision',actorId:'coach',deviceId:'phone',recordedAt:'2026-09-29T10:01:00Z'});
assert.equal(selectDraft(resolved).draft.goals,'Rebound');
const late=reviseMatchday(right,make('late',['right'],'Late'));
assert.equal(selectDraft(mergeMatchday(resolved,late).value).conflict,true);
assert.deepEqual(mergeMatchday(left,left).value,left);
assert.throws(()=>mergeMatchday(base,reviseMatchday(undefined,make('base',[],'different'))),e=>e.code==='collision');
for(const invalid of [
 {schemaVersion:2,revisions:[]},{schemaVersion:1,revisions:[make('a',['missing'])]},
 {schemaVersion:1,revisions:[make('a',['b']),make('b',['a'])]},
 {schemaVersion:1,revisions:[make('a',[]),make('a',[])]},
 {schemaVersion:1,revisions:[make('a',[],'x'.repeat(4001))]},
 {schemaVersion:1,revisions:Array.from({length:1001},(_,i)=>make('r'+i,[]))},
 {schemaVersion:1,revisions:[{...make('a',[]),value:{...emptyDraft(),roster:'bad'}}]}
])assert.throws(()=>validateMatchday(invalid));
const roster=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Player '+i,jerseyNumber:['0','00','2','3','4',null][i]}));
const plannedRoster=roster.map((player,index)=>({...player,gameStatus:index<5?'starter':'dnp',gamePosition:['pg','sg','sf','pf','c',null][index],role:index===0?'Ballhandler':''}));
const good={...emptyDraft(),ownSide:'home',roster:plannedRoster,startingFive:plannedRoster.slice(0,5).map(p=>p.id),tactics:[{id:'horns',title:'Horns',usage:'offense'}]};
assert.equal(buildSetup(good).roster[1].jerseyNumber,'00');
assert.equal(buildSetup(good).roster[5].gameStatus,'dnp');
assert.equal(buildSetup(good).roster[0].gamePosition,'pg');
assert.equal(buildSetup(good).gameplan.ownSide,'home');
assert.deepEqual(buildSetup(good).gameplan.tactics,good.tactics);
assert.equal(Object.hasOwn(buildSetup(good).gameplan,'closingNote'),false,'Die veränderliche Abschlussnotiz darf nicht Teil des eingefrorenen Gameplans sein.');
for(const value of [
  {...good,roster:plannedRoster.map((p,index)=>index? p:{...p,gameStatus:'reserve'})},
  {...good,roster:plannedRoster.map((p,index)=>index? p:{...p,role:'x'.repeat(121)})},
  {...good,roster:plannedRoster.map((p,index)=>index? p:{...p,gamePosition:'coach'})},
  {...good,tactics:[{id:'horns',title:'Horns',usage:'special'}]}
])assert.throws(()=>reviseMatchday(undefined,{...make(crypto.randomUUID(),[]),value}));
assert.throws(()=>buildSetup(emptyDraft()));
assert.throws(()=>buildSetup({...good,startingFive:['p0','p0','p2','p3','p4']}));
const bad={...good,roster:roster.map((p,i)=>i? p:{...p,jerseyNumber:'123'})};
assert.doesNotThrow(()=>reviseMatchday(undefined,{...make('bad',[]),value:bad}));
assert.throws(()=>buildSetup(bad));
assert.throws(()=>buildSetup({...good,roster:roster.map(p=>({...p,jerseyNumber:'1'}))}));
assert.equal(buildSetup({...good,roster:roster.map(p=>({...p,archived:true}))}).roster.length,6);
for(const [input,want] of [
 [{},'game'],[{draft:{...good,step:'review'}},'review'],[{draftConflict:true},'conflict'],
 [{liveState:{hasLiveData:true,session:null}},'conflict'],
 [{liveState:{session:{},clock:{ended:true,remainingMs:0}}},'finished'],
 [{liveState:{session:{},clock:{ended:false,remainingMs:0}}},'pause'],
 [{draftConflict:true,liveState:{session:{},clock:{ended:false,remainingMs:1}}},'live']
])assert.equal(deriveStage(input),want);
console.log('Matchday model: graph conflicts, late branches, validation, lineup and recovery passed.');
