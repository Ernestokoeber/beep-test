import assert from 'node:assert/strict';
import {createIndividualManageHandler} from '../api/_handlers/individual/manage.js';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';

const profile={id:'11111111-1111-4111-8111-111111111111',organization_id:'22222222-2222-4222-8222-222222222222',coach_user_id:'33333333-3333-4333-8333-333333333333',user_id:null};
const auth={sub:profile.coach_user_id,organization_id:profile.organization_id,role:'coach'};
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(v){this.body=v;return this;}});
let storedHash;
const manage=createIndividualManageHandler({requireMembership:async()=>auth,transaction:async fn=>fn({query:async(sql,params)=>{
 if(sql.includes('SELECT ip.'))return {rows:[profile]};
 if(sql.includes('INSERT INTO individual_invites')){storedHash=params[2];return {rows:[{id:'invite-test',expires_at:'2026-10-21T12:00:00Z'}]};}
 return {rows:[],rowCount:1};
}})});
delete process.env.PUBLIC_APP_URL;
const res=response();await manage({method:'POST',body:{action:'createInvite',profileId:profile.id},headers:{}},res);
assert.equal(res.statusCode,201,JSON.stringify(res.body));
assert.match(res.body.inviteUrl,/^https:\/\/coach\.tsv-lindau\.de\/#\/join\/[A-Za-z0-9_-]{43}$/, 'Einladung braucht einen funktionierenden kanonischen Fragment-Link, auch ohne PUBLIC_APP_URL');
assert.match(res.body.qrDataUrl,/^data:image\/png;base64,/);
assert.equal(storedHash,createHash('sha256').update(res.body.token).digest('hex'));
profile.user_id='already-assigned';const assigned=response();await manage({method:'POST',body:{action:'createInvite',profileId:profile.id},headers:{}},assigned);assert.equal(assigned.statusCode,409);profile.user_id=null;

const {createIndividualInviteHandler}=await import('../api/_handlers/individual/invite.js');
let queries=0,available=true;
const check=createIndividualInviteHandler({query:async(_sql,params)=>{queries++;assert.equal(params[0],storedHash);return {rows:available?[{expires_at:'2026-10-21T12:00:00Z'}]:[]};}});
const valid=response();await check({method:'GET',query:{token:res.body.token}},valid);assert.equal(valid.statusCode,200);assert.deepEqual(valid.body,{valid:true,expiresAt:'2026-10-21T12:00:00Z'});assert.match(valid.headers['Cache-Control'],/no-store/);
available=false;const invalid=response();await check({method:'GET',query:{token:res.body.token}},invalid);assert.equal(invalid.statusCode,410);
const malformed=response();await check({method:'GET',query:{token:'short'}},malformed);assert.equal(malformed.statusCode,400);assert.equal(queries,2);
const unavailable=createIndividualInviteHandler({query:async()=>{throw Object.assign(Error('Your account or project has exceeded the quota'),{code:'53000'});}});const quota=response();await unavailable({method:'GET',query:{token:res.body.token}},quota);assert.equal(quota.statusCode,503);assert.equal(quota.body.code,'DATABASE_QUOTA_EXCEEDED');

const dom=new JSDOM('<main id="app"></main>',{url:'https://coach.test/#/join/'+res.body.token,runScripts:'outside-only'}),w=dom.window;
let registrations=0,release,checks=0;
w.BT={util:{escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},api:{getIndividualInvite:async()=>{checks++;return {valid:true,expiresAt:'2026-10-21T12:00:00Z'};}},sync:{getState:()=>({user:null}),register:async(...args)=>{registrations++;assert.equal(args[4],res.body.token);await new Promise(r=>release=r);throw Object.assign(Error('Datenbank nicht verfügbar'),{status:503});}}};
w.eval(readFileSync(new URL('../js/individual-invite.js',import.meta.url),'utf8'));
await w.BT.individualInvite.render(w.document.querySelector('main'),res.body.token);
assert.equal(checks,1);assert(w.document.body.textContent.includes('Spielerkonto'));assert(!w.document.querySelector('[name="inviteCode"]'));
const form=w.document.querySelector('form');form.elements.displayName.value='Spieler Test';form.elements.email.value='player@example.invalid';form.elements.password.value='Testpasswort123';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,0));assert(form.querySelector('button[type="submit"]').disabled);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(registrations,1);release();await new Promise(r=>setTimeout(r,0));assert(!form.querySelector('button[type="submit"]').disabled);assert.match(form.textContent,/Datenbank nicht verfügbar/);
w.BT.api.getIndividualInvite=async()=>{throw Object.assign(Error('Abgelaufen'),{status:410});};await w.BT.individualInvite.render(w.document.querySelector('main'),res.body.token);assert(!w.document.querySelector('form'));assert.match(w.document.body.textContent,/Abgelaufen|abgelaufen/);
dom.window.close();
console.log('Individual-Einladung: kanonischer Link und QR, Hash, belegte Zuordnung, öffentliche Prüfung, 410/503 sowie Spielerregistrierung und Doppelklickschutz geprüft.');
