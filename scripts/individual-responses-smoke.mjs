import assert from 'node:assert/strict';
import {createIndividualOverviewHandler} from '../api/_handlers/individual/overview.js';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const response=()=>({statusCode:200,setHeader(){},status(c){this.statusCode=c;return this;},json(v){this.body=v;return this;}});
let queries=[];
for(const role of ['coach','admin','player']){
 const handler=createIndividualOverviewHandler({requireMembership:async()=>({sub:'own-coach',organization_id:'own-org',role}),query:async(sql,params)=>{queries.push({sql,params});return {rows:[{profile_id:'own-profile',session_id:'own-session',scheduled_for:'2026-10-19T18:15:00Z',unit_number:1,attendance_status:'confirmed',score:8,private_note:'PRIVATE'}]};}});
 const before=queries.length,res=response();await handler({method:'GET',query:{view:'responses',profileId:'22222222-2222-4222-8222-222222222222'}},res);
 assert.equal(res.statusCode,role==='player'?403:200);
 if(role==='player'){assert.equal(queries.length,before);continue;}
 assert.equal(queries.length-before,1,'Leichte Statusabfrage darf keine Pläne, Messungen oder Teamdaten laden');
 assert.deepEqual(queries.at(-1).params,['own-org',role,'own-coach']);
 assert.match(queries.at(-1).sql,/ip\.coach_user_id/);assert.match(queries.at(-1).sql,/ip\.organization_id/);assert.match(queries.at(-1).sql,/LATERAL/);
 assert.deepEqual(res.body.responses,[{profile_id:'own-profile',session_id:'own-session',scheduled_for:'2026-10-19T18:15:00Z',unit_number:1,attendance_status:'confirmed',score:8}]);
 assert(!JSON.stringify(res.body).includes('PRIVATE'));
}
for(const stage of ['fetch','body']){
 const dom=new JSDOM('',{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window;
 let timeout,delay,cleared=false;
 w.setTimeout=(fn,ms)=>{timeout=fn;delay=ms;return 7;};w.clearTimeout=()=>{cleared=true;};
 w.fetch=async(_url,options)=>{
  const hang=()=>new Promise((_resolve,reject)=>{const abort=()=>reject(new w.DOMException('Abgebrochen','AbortError'));if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort);});
  return stage==='fetch'?hang():{ok:true,status:200,json:hang};
 };
 w.eval(readFileSync(new URL('../js/api.js',import.meta.url),'utf8'));
 const pending=w.BT.api.getIndividualResponses();await Promise.resolve();
 assert.equal(typeof timeout,'function','Statusabfragen benötigen einen Zeitablauf, damit die Automatik weiterläuft');assert.equal(delay,10000);
 timeout();await assert.rejects(pending,e=>e.code==='CLIENT_TIMEOUT'&&e.status===0);assert(cleared);dom.window.close();
}
console.log('Cockpit-Status: begrenzte eigene SQL-Projektion, Spieler gesperrt, hängender Fetch und Body nach 10 Sekunden beendet.');
