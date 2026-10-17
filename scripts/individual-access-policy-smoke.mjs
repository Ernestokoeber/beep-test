import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET='isolated-policy-test-secret-'.repeat(3);
process.env.GEMINI_API_KEY='isolated-not-a-provider-key';
process.env.DATABASE_URL='postgres://isolated-fixture.invalid/unused';
const userId='11111111-1111-4111-8111-111111111111',org='22222222-2222-4222-8222-222222222222',profile='33333333-3333-4333-8333-333333333333';
let resourceQueries=0,providerCalls=0;
globalThis.__beepTestPool={query:async sql=>{
 if(sql.includes('FROM memberships'))return {rows:[{role:'player',organization_id:org}]};
 resourceQueries++;return {rows:[]};
}};
const {createIndividualOverviewHandler}=await import('../api/_handlers/individual/overview.js');
globalThis.fetch=async()=>{providerCalls++;throw new Error('Kein externer Anbieterzugriff im Test erlaubt.');};
const token=jwt.sign({sub:userId,email:'player@example.invalid'},process.env.JWT_SECRET);
const response=()=>({statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
const failures=[];
for(const [path,method,body] of [['members','GET'],['workspace','GET'],['games/sync','GET'],['games/atlas','GET'],['ai/gemini','POST',{action:'summarizeTraining',payload:{}}]]){
 const {default:handler}=await import(`../api/${path}.js`);
 const res=response();const before=resourceQueries;
 await handler({method,headers:{authorization:`Bearer ${token}`},query:{gameId:'fixture-game'},body},res);
 if(res.statusCode!==403)failures.push(`${path}: ${res.statusCode} statt 403`);
 if(resourceQueries!==before)failures.push(`${path}: unerlaubte Ressourcendaten abgefragt`);
}
if(providerCalls)failures.push('Externer Anbieter für Spieler aufgerufen');

const overview=createIndividualOverviewHandler({requireMembership:async()=>({sub:userId,organization_id:org,role:'player'}),query:async sql=>{
 if(sql.includes('FROM individual_profiles'))return {rows:[{id:profile,user_id:userId,player_profile_id:'own-roster',coach_user_id:'PRIVATE_COACH',organization_id:org,active:true}]};
 if(sql.includes('FROM individual_sessions s'))return {rows:[{id:'own-session',individual_profile_id:profile,coach_user_id:'PRIVATE_COACH',scheduled_for:'2026-10-19T18:15:00Z',internal_note:'PRIVATE'}]};
 if(sql.includes('FROM individual_notifications'))return {rows:[{id:'own-notice',individual_profile_id:profile,kind:'attendance',payload:{sessionId:'own-session',privateStaffNotes:'PRIVATE'}}]};
 if(sql.includes('FROM individual_measurements'))return {rows:[{id:'coach-note',individual_profile_id:profile,metric_key:'trainernotiz',text_value:'PRIVATE'},{id:'result',individual_profile_id:profile,metric_key:'layups',numeric_value:8}]};
 return {rows:[]};
}});
const own=response();await overview({method:'GET',query:{profileId:'other-player'}},own);
assert.equal(own.statusCode,200);assert.equal(own.body.profiles[0].id,profile);
assert.equal(own.body.measurements.length,1,'Private Trainernotizen sind keine Spieler-Messwerte.');
if(JSON.stringify(own.body).includes('PRIVATE'))failures.push('Interne Metadaten in der Spielerantwort');

const dom=new JSDOM('',{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window;
let local={games:[{id:'team-game'}],trainings:[{id:'PRIVATE_TEAM_TRAINING'}],players:[{id:'other-player'}]},activeToken=null;
const cached=new Map();w.localStorage.setItem('courthub_workspace_team',org);
w.BT={api:{getToken:()=>activeToken,setToken:t=>activeToken=t,login:async()=>({token:'own-player-token',user:{id:userId,role:'player',organization:{id:org}}}),getWorkspace:async()=>{throw Error('Spieler darf Workspace nicht abrufen');}},storage:{load:()=>local,cacheWorkspace:async(k,v)=>cached.set(k,structuredClone(v)),getCachedWorkspace:async k=>cached.get(k)||{games:[]},save:async d=>{local=d;},flush:async()=>{}},individualTraining:{syncPending:async()=>{}},util:{toast(){}}};
w.eval(readFileSync(new URL('../js/sync.js',import.meta.url),'utf8'));
await w.BT.sync.login('player@example.invalid','test-only-password');
if(local.trainings?.length||local.players?.length||local.games?.length)failures.push('Spieler übernimmt zuvor geladenen Trainer-Workspace');
if(!cached.get(org)?.trainings?.length)failures.push('Trainerstand bei Spielerwechsel nicht erhalten');
dom.window.close();
assert.deepEqual(failures,[]);
console.log('Spielerzugriff: Mannschafts-APIs vor Daten-/Providerzugriff gesperrt, persönliche Daten minimiert, Trainer-Workspace getrennt.');
