import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {ids,user,overview} from './fixtures/individual-player.mjs';
function setup(){
 const dom=new JSDOM('<main></main>',{url:'https://coach.test/#/individual',runScripts:'outside-only'}),w=dom.window;
 let current=structuredClone(user),data=structuredClone(overview),sent=[],rejectEnsure;
 data.profiles[0].user_id=user.id;
 data.notifications=[{id:'notice-own',individual_profile_id:ids.profile,kind:'feedback_request',due_at:'2026-10-17T10:00:00Z'},{id:'notice-foreign',individual_profile_id:ids.other,kind:'attendance',due_at:'2026-10-17T10:00:00Z'}];
 w.BT={util:{escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},sync:{getState:()=>({user:current,identitySource:'server'})},storage:{getPlayers:()=>[]},api:{getIndividualOverview:async()=>structuredClone(data),syncIndividualMutations:async items=>{sent.push(...items);return {results:items.map(i=>({mutation_id:i.mutationId,applied:true}))};},individualAction:()=>new Promise((_r,j)=>rejectEnsure=j)}};
 for(const f of ['individual-copy','individual-player-view','individual-training'])w.eval(readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
 return {w,dom,target:w.document.querySelector('main'),get sent(){return sent;},setUser:u=>current=u,setData:d=>data=d,rejectEnsure:e=>rejectEnsure(e)};
}
const kind=process.argv[2];
if(!kind||kind==='legacy'){
 const s=setup(),oldKey='courthub_individual_queue:'+user.id;
 const own={mutationId:'legacy-readiness-id',kind:'readiness',payload:{entityId:ids.session,score:6},deviceRecordedAt:'2026-10-18T10:00:00Z'};
 const unassigned={mutationId:'legacy-other-team-id',kind:'readiness',payload:{entityId:'unknown-old-session',score:9},deviceRecordedAt:'2026-10-18T10:00:00Z'};
 s.w.localStorage.setItem(oldKey,JSON.stringify([own,unassigned]));await s.w.BT.individualTraining.render(s.target);await s.w.BT.individualTraining.syncPending();
 assert(s.sent.some(m=>m.mutationId===own.mutationId),'Sicher zugeordnete Eingabe im v241-Speicher muss übernommen und übertragen werden');assert(!s.sent.some(m=>m.mutationId===unassigned.mutationId),'Altbestand ohne bestätigte Zuordnung darf nicht in ein anderes Profil übertragen werden');assert.equal(JSON.parse(s.w.localStorage.getItem(oldKey)).length,1);s.dom.window.close();
}
if(!kind||kind==='notifications'){
 const s=setup();await s.w.BT.individualTraining.render(s.target);assert(s.target.textContent.includes('Rückmeldung fällig'),'Dashboard-Erinnerung muss ohne Push sichtbar bleiben');assert.equal(s.target.querySelectorAll('.individual-notifications li').length,1,'Nur eigene offene Erinnerungen anzeigen');s.dom.window.close();
}
if(!kind||kind==='stale'){
 const s=setup();s.setUser({...user,role:'coach'});s.setData({...structuredClone(overview),role:'coach',plans:[],sessions:[]});const pending=s.w.BT.individualTraining.render(s.target);await new Promise(r=>setTimeout(r,0));s.w.BT.individualTraining.cleanup();s.setUser(null);s.target.innerHTML='<p>Andere Seite</p>';s.rejectEnsure(Error('offline'));await pending;assert.equal(s.target.textContent,'Andere Seite','Fehlgeschlagener Pilotstart darf nach Logout keine Traineransicht nachrendern');s.dom.window.close();
}
console.log('Review-Regressionen: Altwarteschlange, Dashboard-Erinnerungen und verspäteter Pilotstart geprüft.');
