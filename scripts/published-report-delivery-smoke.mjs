import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const moduleUrl=new URL('../js/published-report-delivery.mjs',import.meta.url);
assert(existsSync(moduleUrl),'Die automatische Berichtsübernahme fehlt.');
const {createPublishedReportDelivery}=await import(moduleUrl);
const packet=JSON.parse(readFileSync(new URL('../data/published-game-reports/2026-10-17-wasserburg-lindau.json',import.meta.url)));
const catalog={schemaVersion:'courthub.published-report-index.v1',reports:[{target:packet.target,file:'2026-10-17-wasserburg-lindau.json'}]};
const fixture=()=>({meta:{updatedAt:'2026-10-01T12:00:00Z'},players:packet.players.map((p,i)=>({id:'phone-'+i,name:p.name,jerseyNumber:String(i+30)})),games:[{id:'game-phone',...packet.target,score:'',coachSummary:'Manuelle Notiz',playerStats:[{playerId:'phone-0',points:2,rebounds:7,assists:3,note:'Videobeobachtung'}],liveStats:{sessions:[]},matchday:{revisions:[]}}]});
function setup(initial=fixture()){
 let data=structuredClone(initial),context='team-a',downloads=0,writes=0,failSave=false,blocked=false,clock=0,index=structuredClone(catalog),indexReads=0,fetchImpl=async()=>structuredClone(packet);const options=[];
 const storage={load:()=>structuredClone(data),flush:async()=>{},save:async(next,config)=>{if(failSave)throw Error('Speicher voll');writes++;options.push(config);data=structuredClone(next);}};
 const delivery=createPublishedReportDelivery({storage,getContext:()=>context,canApply:()=>!blocked,now:()=>clock,fetchIndex:async()=>{indexReads++;return structuredClone(index);},fetchReport:async url=>{downloads++;return fetchImpl(url);}});
 return {delivery,options,get data(){return data;},get downloads(){return downloads;},get writes(){return writes;},get indexReads(){return indexReads;},set data(v){data=v;},set context(v){context=v;},set fetch(v){fetchImpl=v;},set failSave(v){failSave=v;},set blocked(v){blocked=v;},set index(v){index=v;},set clock(v){clock=v;}};
}
const a=setup(),before=structuredClone(a.data);const first=await a.delivery.run();
assert.equal(first.imported,1);assert.equal(a.data.games[0].score,'64:55');assert.equal(a.data.games[0].publishedReport.players.length,6);
assert.equal(a.data.games[0].playerStats.reduce((s,p)=>s+p.points,0),55);assert.equal(a.data.games[0].playerStats.reduce((s,p)=>s+p.freeThrowsAttempted,0),15);
assert.equal(a.data.games[0].publishedReport.staff[0].playerId,'phone-5');assert.deepEqual(a.data.players,before.players);
assert.equal(a.data.games[0].playerStats[0].rebounds,7);assert.equal(a.data.games[0].playerStats[0].assists,3);assert.equal(a.data.games[0].playerStats[0].note,'Videobeobachtung');
assert.deepEqual(a.data.games[0].publishedReportBackup.playerStats,before.games[0].playerStats);assert.equal(a.data.games[0].coachSummary,'Manuelle Notiz');assert.deepEqual(a.data.games[0].liveStats,before.games[0].liveStats);
assert.deepEqual(a.data.meta,before.meta);assert.deepEqual(a.options,[{fromSync:true,preserveTimestamp:true}]);
const imported=structuredClone(a.data);await a.delivery.run();assert.equal(a.downloads,1);assert.equal(a.writes,1);assert.deepEqual(a.data,imported);
// A later cloud snapshot can lack this public supplement. Reuse the loaded packet.
a.data=before;await a.delivery.run();assert.equal(a.data.games[0].publishedReport.players.length,6);assert.equal(a.downloads,1);
for(const mutate of [d=>d.players.pop(),d=>d.players.push({...d.players[0],id:'duplicate'}),d=>d.games.push({...d.games[0],id:'other'}),d=>d.games[0].away='Anderer Verein',d=>d.games[0].cancelled=true]){
 const data=fixture();mutate(data);const b=setup(data);await b.delivery.run();assert.equal(b.writes,0);assert.deepEqual(b.data,data);
}
const existing=fixture();existing.games[0].publishedReport={score:'Korrigierter Bericht'};const b=setup(existing);await b.delivery.run();assert.equal(b.downloads,0);assert.deepEqual(b.data,existing);
const invalid=setup();invalid.fetch=async()=>({...packet,score:'65:55'});assert.equal((await invalid.delivery.run()).imported,0);assert.equal(invalid.writes,0);
const offline=setup();offline.fetch=async()=>{throw Error('offline');};assert.equal((await offline.delivery.run()).imported,0);assert.equal(offline.writes,0);offline.fetch=async()=>packet;assert.equal((await offline.delivery.run()).imported,1);
const disk=setup();disk.failSave=true;assert.equal((await disk.delivery.run()).imported,0);assert.equal(disk.data.games[0].publishedReport,undefined);disk.failSave=false;assert.equal((await disk.delivery.run()).imported,1);
const racing=setup();let release;racing.fetch=()=>new Promise(r=>release=()=>r(packet));const pending=racing.delivery.run();await new Promise(r=>setTimeout(r,0));racing.data.games[0].coachSummary='Neue Notiz während Download';release();await pending;assert.equal(racing.data.games[0].coachSummary,'Neue Notiz während Download');
const switched=setup();switched.fetch=()=>new Promise(r=>release=()=>r(packet));const old=switched.delivery.run();await new Promise(r=>setTimeout(r,0));switched.context='team-b';release();assert.equal((await old).imported,0);assert.equal(switched.writes,0);
const editing=setup();editing.blocked=true;await editing.delivery.run();assert.equal(editing.downloads,0,'Bei offenem Editor nicht automatisch eingreifen.');
editing.blocked=false;editing.fetch=()=>new Promise(r=>release=()=>r(packet));const entering=editing.delivery.run();await new Promise(r=>setTimeout(r,0));editing.blocked=true;release();await entering;assert.equal(editing.writes,0,'Während der Anfrage geöffnete Editoren schützen.');
editing.blocked=false;assert.equal((await editing.delivery.run()).imported,1);assert.equal(editing.downloads,1);
const future=setup();await future.delivery.run();const next=structuredClone(packet);next.target.date='2026-10-10';
future.data.games.push({id:'next-game',...next.target});future.index={...catalog,reports:[...catalog.reports,{target:next.target,file:'2026-10-10-lindau-gast.json'}]};future.fetch=async()=>next;
await future.delivery.run();assert.equal(future.data.games[1].publishedReport,undefined,'Verzeichnis innerhalb von fünf Minuten wiederverwenden.');
future.clock=300001;assert.equal((await future.delivery.run()).imported,1,'Neue veröffentlichte Berichte nachladen, ohne App-Code zu ändern.');assert.equal(future.data.games[1].publishedReport.players.length,6);assert.equal(future.indexReads,2);
for(const reports of [[{target:packet.target,file:'https://other.invalid/leak.json'}],[catalog.reports[0],{target:packet.target,file:'2026-10-17-other.json'}]]){
 const hostile=setup();hostile.index={...catalog,reports};assert.equal((await hostile.delivery.run()).imported,0);assert.equal(hostile.downloads,0,'Ungültige oder mehrdeutige Dateiquellen nicht abrufen.');
}
console.log('Automatische Berichtsauslieferung: sechs Spieler, Bestandsschutz, Idempotenz, Offline-/Schreibfehler und Teamwechsel geprüft.');
