import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {protectWorkspace} from '../js/live-game/merge.mjs';
import {createSession} from '../js/live-game/core.mjs';
import {emptyDraft,reviseMatchday} from '../js/matchday/model.mjs';
import {filterWorkspaceForRole,hasValidTacticsShape} from '../api/_lib/workspace-data.js';
import {method,noStore,safeError} from '../api/_lib/http.js';
// Execute the endpoint body with controlled auth and DB boundaries, never a network DB.
const source=readFileSync(new URL('../api/workspace.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace('export default async function handler','return async function handler');
let role='coach',updates=[],race=false;
const s=createSession({id:'s',deviceId:'d',actorId:'u',roster:Array.from({length:5},(_,i)=>({id:'p'+i,name:'P'+i})),startingFive:['p0','p1','p2','p3','p4'],config:{periods:4,periodMs:600000,overtimeMs:300000}});
const current={data:{games:[{id:'g',liveStats:{schemaVersion:1,sessions:[s],selectedSessionId:'s',resolutionRevision:0}}]},version:3};
// The server already has a v2 session; an older client must not downgrade it.
s.schemaVersion=2;
const md=reviseMatchday(undefined,{id:'md',parents:[],actorId:'u',deviceId:'d',recordedAt:'2026-09-29',value:emptyDraft()});
current.data.games[0].matchday=md;
const query=async(sql,args)=>{assert.ok(args.includes('org'),'Organization boundary missing');if(sql.includes('UPDATE')){updates.push(args);return {rows:race?[]:[{version:4}]};}return {rows:[current]};};
const handler=new Function('query','canWrite','requireMembership','method','noStore','safeError','filterWorkspaceForRole','hasValidTacticsShape','protectWorkspace',source)(query,r=>['admin','coach','assistant'].includes(r),async()=>({role,sub:'u',organization_id:'org'}),method,noStore,safeError,filterWorkspaceForRole,hasValidTacticsShape,protectWorkspace);
async function request(body){let code,result;const res={setHeader(){},status(n){code=n;return this;},json(data){result=data;return this;},end(){}};await handler({method:'PUT',body},res);return {code,result};}
role='viewer';assert.equal((await request({data:{},expectedVersion:3})).code,403);assert.equal(updates.length,0);
role='coach';assert.equal((await request({data:{games:[]},expectedVersion:3})).code,409);
assert.equal((await request({data:{games:[{id:'g'}]},expectedVersion:2})).code,409);
assert.equal((await request({data:{games:[{id:'g',liveStats:{schemaVersion:8}}]},expectedVersion:3})).code,400);
assert.equal((await request({data:{games:[{id:'g'}],huge:'x'.repeat(4*1024*1024)},expectedVersion:3})).code,413);
assert.equal((await request({data:{games:[{id:'g',score:'20:15'}]},expectedVersion:3})).code,200);
assert.equal(JSON.parse(updates.at(-1)[0]).games[0].liveStats.sessions[0].id,'s');
assert.equal(JSON.parse(updates.at(-1)[0]).games[0].matchday.revisions[0].id,'md');
assert.equal((await request({data:{games:[{id:'g',matchday:{schemaVersion:9}}]},expectedVersion:3})).code,400);
const conflict=structuredClone(current.data);conflict.games[0].matchday.revisions[0].value.goals='changed';
assert.equal((await request({data:conflict,expectedVersion:3})).code,409);
const parallel=structuredClone(current.data);parallel.games[0].matchday=reviseMatchday(undefined,{...md.revisions[0],id:'parallel'});
assert.equal((await request({data:parallel,expectedVersion:3})).code,200);
assert.equal(JSON.parse(updates.at(-1)[0]).games[0].matchday.revisions.length,2);
assert.equal(JSON.parse(updates.at(-1)[0]).games[0].liveStats.sessions[0].schemaVersion,2);
const downgrade=structuredClone(current.data);downgrade.games[0].liveStats.sessions[0].schemaVersion=1;
assert.equal((await request({data:downgrade,expectedVersion:3})).code,409);
race=true;assert.equal((await request({data:{games:[{id:'g'}]},expectedVersion:3})).code,409);race=false;
assert.equal((await request({data:{games:[]},expectedVersion:3,confirmedGameDeletions:['g']})).code,200);
console.log('Live API: auth, organization, schema, size, CAS race, legacy preservation and explicit deletion passed.');
