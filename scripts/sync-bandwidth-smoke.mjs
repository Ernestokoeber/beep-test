import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {filterWorkspaceForRole,hasValidDevelopmentShape,hasValidTacticsShape} from '../api/_lib/workspace-data.js';
import {method,noStore,safeError} from '../api/_lib/http.js';
import {protectWorkspace} from '../js/live-game/merge.mjs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
async function api(){
 let role='coach',reads=[];
 const data={drills:[{description:'x'.repeat(1024*1024)}],tactics:[{published:false}],developmentFindings:[{id:'private'}]};
 const query=async(sql,args)=>{assert.equal(args[0],'org-a');const full=/\bSELECT\s+data\b/i.test(sql);reads.push(full?'full':'metadata');return {rows:[full?{data,version:12,updated_at:'2026-10-17T20:00:00Z'}:{version:12,updated_at:'2026-10-17T20:00:00Z'}]};};
 const code=source('api/workspace.js').replace(/^import .*;\r?$/gm,'').replace('export default async function handler','return async function handler');
 const handler=new Function('query','canWrite','requireMembership','method','noStore','safeError','filterWorkspaceForRole','hasValidDevelopmentShape','hasValidTacticsShape','protectWorkspace',code)(query,r=>r==='coach',async()=>({role,sub:'actor',organization_id:'org-a'}),method,noStore,safeError,filterWorkspaceForRole,hasValidDevelopmentShape,hasValidTacticsShape,protectWorkspace);
 const request=async(query={})=>{reads=[];let status,body;await handler({method:'GET',query},{setHeader(){},status(n){status=n;return this;},json(value){body=value;return this;}});return {status,body,reads:[...reads]};};
 let r=await request();assert.equal(r.body.data.drills.length,1,'Alte Clients brauchen weiterhin den vollen Stand.');
 r=await request({knownVersion:'12',knownRole:'coach'});assert.equal(r.body.unchanged,true,'Unveränderte Abgleiche dürfen nicht den gesamten Workspace laden.');assert.equal(r.body.data,undefined);assert.deepEqual(r.reads,['metadata'],'Auch zwischen PostgreSQL und Vercel darf kein voller Stand übertragen werden.');assert(JSON.stringify(r.body).length<300);
 r=await request({knownVersion:'11',knownRole:'coach'});assert.equal(r.body.data.drills[0].description.length,1024*1024);
 role='viewer';r=await request({knownVersion:'12',knownRole:'coach'});assert.equal(r.body.unchanged,undefined);assert.deepEqual(r.body.data.tactics,[]);assert.equal(r.body.data.developmentFindings,undefined);
 r=await request({knownVersion:'12',knownRole:'viewer'});assert.equal(r.body.unchanged,true);
 for(const knownVersion of ['-1','bad',['12','13'],'9007199254740992'])assert.equal((await request({knownVersion,knownRole:'viewer'})).status,400);
 for(const knownRole of ['invalid',['viewer']])assert.equal((await request({knownVersion:'12',knownRole})).status,400);
 role='player';assert.equal((await request({knownVersion:'12',knownRole:'viewer'})).status,403);
 console.log('Workspace-Transfer: Metadaten statt 1-MB-Dokument, Änderungen, Rollenfilter und alte Clients geprüft.');
}
async function quota(){
 let status,body;const res={status(n){status=n;return this;},json(value){body=value;return this;}};
 const original=console.error;console.error=()=>{};
 try{
  safeError('me',Object.assign(Error('Your account or project has exceeded the quota. Upgrade your plan to increase limits.'),{code:'53000'}),res,'Kontodaten konnten nicht geladen werden.');
  assert.equal(status,503);assert.equal(body.code,'DATABASE_QUOTA_EXCEEDED');assert.equal(body.retryable,true);assert.match(body.error,/Datenbank.*Kontingent/);assert.match(body.error,/lokal/);
  safeError('workspace',Object.assign(Error('different'),{code:'53000'}),res,'Serverfehler');assert.equal(status,500,'Andere Ressourcenfehler nicht als Transferlimit ausgeben.');
 }finally{console.error=original;}
 console.log('Kontingentfehler: verständliche 503-Antwort, Wiederholung und übrige Fehler geprüft.');
}
async function client(){
 const dom=new JSDOM('',{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window;
 let token=null,role='coach',organization='org-a',version=12,downloads=0,uploads=0,queued,pauseGet=false,release,livePending=false;
 let remote={meta:{updatedAt:'2026-10-17T20:00:00Z'},players:[{id:'p'}],games:[],developmentFindings:[{id:'private'}],drills:[{description:'x'.repeat(1024*1024)}]},local=structuredClone(remote);
 const requests=[],originalTimeout=w.setTimeout.bind(w);w.setInterval=()=>1;w.setTimeout=(cb,ms,...args)=>ms===900?(queued=cb,99):originalTimeout(cb,ms,...args);
 w.BT={api:{getToken:()=>token,setToken:t=>token=t,login:async()=>({token:'test-'+organization,user:{id:'coach',role,organization:{id:organization}}}),
  async getWorkspace(knownVersion,knownRole){requests.push([knownVersion,knownRole]);const snapshot={version,updatedAt:remote.meta.updatedAt,role};const result=knownVersion===version&&knownRole===role?{...snapshot,unchanged:true}:{...snapshot,data:filterWorkspaceForRole(remote,role)};if(result.data)downloads++;if(pauseGet){pauseGet=false;await new Promise(r=>release=()=>r());}return structuredClone(result);},
  async saveWorkspace(data){uploads++;remote=structuredClone(data);version++;return {data:structuredClone(remote),version,updatedAt:remote.meta.updatedAt};}},
  storage:{load:()=>structuredClone(local),save:async data=>{local=structuredClone(data);},flush:async()=>{},cacheWorkspace:async()=>{},getCachedWorkspace:async()=>({})},util:{toast(){}}};
 w.eval(source('js/sync.js'));
 try{
  await w.BT.sync.login('coach@test.invalid','unused');assert.equal(downloads,1);
  await w.BT.sync.syncNow();await w.BT.sync.syncNow();assert.equal(downloads,1,'Gleicher Datenstand darf beim Abgleich nicht erneut vollständig geladen werden.');assert.equal(requests.at(-1)[0],12);
  local.games.push({id:'report',score:'64:55',publishedReport:{players:[{points:55}],freeThrowsMade:6,freeThrowsAttempted:15}});local.meta.updatedAt='2026-10-17T20:01:00Z';
  await w.BT.sync.syncNow();assert.equal(uploads,1,'Der lokale Spielbericht muss trotz unveränderter Serverversion hochgeladen werden.');assert.equal(remote.games[0].score,'64:55');
  const beforePolls=uploads;for(let i=0;i<30;i++)await w.BT.sync.syncNow();assert.equal(downloads,1);assert.equal(uploads,beforePolls,'Unveränderte Prüfungen dürfen keine Schreibvorgänge auslösen.');
  pauseGet=true;const pending=w.BT.sync.syncNow();await new Promise(r=>setTimeout(r,0));local.meta.updatedAt='2026-10-17T20:02:00Z';w.BT.sync.queueSave(local);queued();await new Promise(r=>setTimeout(r,0));const acceptedVersion=version;release();await pending;assert.equal(w.BT.sync.getState().version,acceptedVersion,'Eine verspätete Metadatenantwort darf eine akzeptierte Version nicht zurücksetzen.');
  role='viewer';await w.BT.sync.syncNow();assert.equal(w.BT.sync.getState().user.role,'viewer');assert.equal(local.developmentFindings,undefined,'Rollenwechsel muss den vollständigen gefilterten Stand anwenden.');
  remote.developmentFindings=[{id:'restored-private'}];role='coach';await w.BT.sync.syncNow();assert.equal(local.developmentFindings?.[0]?.id,'restored-private','Bei wiederhergestelltem Schreibrecht den ungefilterten Stand auch bei gleichem Zeitstempel übernehmen.');
  role='coach';organization='org-b';const count=downloads;await w.BT.sync.login('coach@test.invalid','unused');assert(downloads>count,'Ein neues Team braucht einen vollständigen Erstabgleich.');assert.equal(requests.at(-1)[0],undefined);
  w.BT.loadLive=async()=>({bridge:{hasPending:async()=>livePending,beforeSend:async data=>({data,receipt:['event']}),ack:async()=>{livePending=false;},mergeAccepted:async local=>local}});
  livePending=true;const beforeLive=uploads;await w.BT.sync.syncNow();assert.equal(uploads,beforeLive+1,'Live-Journal auch bei unverändertem Versionsstand übertragen.');assert.equal(livePending,false);
  console.log('Sync-Client: unveränderte Prüfungen, Import-Upload, verspätete Antworten, Rollen- und Teamwechsel geprüft.');
 }finally{w.close();}
}
async function apiClient(){
 const dom=new JSDOM('',{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window,urls=[];
 w.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>({})};};w.eval(source('js/api.js'));
 try{await w.BT.api.getWorkspace();await w.BT.api.getWorkspace(0,'coach');await w.BT.api.getWorkspace(12,'viewer');assert.deepEqual(urls,['/api/workspace','/api/workspace?knownVersion=0&knownRole=coach','/api/workspace?knownVersion=12&knownRole=viewer']);}finally{w.close();}
 console.log('API-Client: optionaler Versionsvergleich und vollständiger Erstabruf geprüft.');
}
for(const [name,test] of Object.entries({api,quota,client,apiClient}))if(!process.argv[2]||process.argv[2]===name)await test();
