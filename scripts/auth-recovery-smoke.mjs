import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const source=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const user={id:'coach-a',displayName:'Coach',email:'coach@example.invalid',role:'coach',organization:{id:'team-a',name:'Team A'}};
const quota=()=>Object.assign(Error('Das Datenbank-Kontingent ist erschöpft.'),{status:503,code:'DATABASE_QUOTA_EXCEEDED',retryable:true});
function setup({token='saved-token',savedToken=token,owner='team-a',error=quota()}={}){
 const dom=new JSDOM('',{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.TextEncoder=TextEncoder;w.setInterval=()=>1;
 let activeToken=token,meError=error,workspaceError=quota(),gets=0,meCalls=0,puts=0;
 w.localStorage.setItem('courthub_workspace_team',owner);
 w.localStorage.setItem('courthub_live_identity',JSON.stringify({user,fingerprint:createHash('sha256').update(savedToken).digest('hex')}));
 w.BT={api:{getToken:()=>activeToken,setToken:t=>activeToken=t,login:async()=>({token:'new-token',user}),me:async()=>{meCalls++;if(meError)throw meError;return {user};},getWorkspace:async()=>{gets++;if(workspaceError)throw workspaceError;return {role:'coach',version:1,data:{games:[]}};},saveWorkspace:async()=>{puts++;return {version:2};}},storage:{load:()=>({games:[]}),save:async()=>{},flush:async()=>{}},util:{toast(){}}};
 w.eval(source('js/sync.js'));
 return {w,dom,get gets(){return gets;},get meCalls(){return meCalls;},get puts(){return puts;},set meError(e){meError=e;},set workspaceError(e){workspaceError=e;}};
}
const a=setup();await a.w.BT.sync.init();assert.equal(a.w.BT.sync.getState().user?.role,'coach','Bekannte Trainersitzung beim Kontingentfehler lokal wiederherstellen.');assert.equal(a.w.BT.sync.getState().identitySource,'cache');assert.equal(a.w.BT.sync.getState().status,'error');assert.equal(a.gets,0);
a.w.BT.sync.queueSave({games:[]});await new Promise(r=>setTimeout(r,950));assert.equal(a.puts,0,'Vor erneuter Teamprüfung keine lokalen Daten mit gespeicherter Rolle hochladen.');
a.meError=null;a.workspaceError=null;await a.w.BT.sync.syncNow();assert.equal(a.meCalls,2,'Gespeicherte Sitzung vor neuem Workspace-Abruf serverseitig prüfen.');assert.equal(a.w.BT.sync.getState().identitySource,'server');
a.w.BT.api.setToken(null);await a.w.BT.sync.init();assert.equal(a.w.BT.sync.getState().user,null,'Ohne Sitzungstoken keine Traineridentität behalten.');a.dom.window.close();
for(const config of [{savedToken:'different'},{owner:'other-team'},{error:Object.assign(Error('invalid'),{status:401})},{error:Object.assign(Error('denied'),{status:403})},{error:Object.assign(Error('unknown failure'),{status:500})}]){
 const b=setup(config);await b.w.BT.sync.init();assert.equal(b.w.BT.sync.getState().user,null);b.dom.window.close();
}
const c=setup({token:null,savedToken:'previous'});assert.equal((await c.w.BT.sync.login('coach@example.invalid','not-a-real-password')).id,user.id,'Erfolgreiche Anmeldung nicht als fehlgeschlagen behandeln, wenn erst der Workspace nicht erreichbar ist.');assert.equal(c.w.BT.sync.getState().status,'error');assert.equal(c.w.BT.sync.getState().identitySource,'server');c.dom.window.close();
const html=source('index.html'),dom=new JSDOM(html,{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window;
w.BT={util:{renderTemplate:id=>w.document.getElementById(id).content.firstElementChild.cloneNode(true),toast(){}},sync:{getState:()=>({user:null,status:'guest'}),login:async()=>{throw quota();}}};w.eval(source('js/account.js'));const host=w.document.createElement('main');w.document.body.append(host);w.BT.account.render(host);
const form=host.querySelector('[data-role="login-form"]'),message=host.querySelector('[data-role="auth-status"]');assert(form.contains(message),'Login-Fehler direkt im Loginformular anzeigen.');
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(form.querySelector('button[type="submit"]').disabled,'Doppelte Anmeldeanfragen verhindern.');await new Promise(r=>setTimeout(r,0));assert.match(message.textContent,/Kontingent/);assert.equal(form.querySelector('button[type="submit"]').disabled,false);dom.window.close();
console.log('Anmeldung: Kontingentfehler, gebundener Sitzungscache, erneute Serverprüfung, Login/Sync-Trennung und direkte Formularfehler geprüft.');
