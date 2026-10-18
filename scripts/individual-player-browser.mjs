import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {createIndividualManageHandler} from '../api/_handlers/individual/manage.js';
import {ids,user,overview} from './fixtures/individual-player.mjs';
let server,base=process.env.REPORT_BASE_URL;
if(!base){const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});base='http://127.0.0.1:'+port;}
const shots=join(tmpdir(),'courthub-individual-validation');mkdirSync(shots,{recursive:true});
delete process.env.PUBLIC_APP_URL;
const profile={id:ids.profile,organization_id:'44444444-4444-4444-8444-444444444444',coach_user_id:'55555555-5555-4555-8555-555555555555',user_id:null};
const inviteHandler=createIndividualManageHandler({requireMembership:async()=>({sub:profile.coach_user_id,organization_id:profile.organization_id,role:'coach'}),transaction:async fn=>fn({query:async sql=>sql.includes('SELECT ip.')?{rows:[profile]}:sql.includes('INSERT INTO individual_invites')?{rows:[{id:'test-invite',expires_at:'2026-10-21T12:00:00Z'}]}:{rows:[]}})});
const response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await inviteHandler({method:'POST',body:{action:'createInvite',profileId:ids.profile}},response);assert.equal(response.code,201);
const invitation=response.body,qrPath=join(shots,'einladung-test-qr.png');writeFileSync(qrPath,Buffer.from(invitation.qrDataUrl.split(',')[1],'base64'));
const bundledPython=join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
const decoded=spawnSync(process.env.COURTHUB_QR_PYTHON||(existsSync(bundledPython)?bundledPython:'python'),['-c','import cv2,zxingcpp,sys; image=cv2.imread(sys.argv[1]); codes=zxingcpp.read_barcodes(image); print(codes[0].text if len(codes)==1 else "")',qrPath],{encoding:'utf8'});
assert.equal(decoded.status,0,decoded.stderr);assert.equal(decoded.stdout.trim(),invitation.inviteUrl,'Das tatsächlich erzeugte QR-Bild muss exakt den Einladungslink enthalten.');
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(existsSync(chromium.executablePath())?undefined:'msedge')});
const quota={error:'Das Datenbank-Kontingent ist erschöpft.',code:'DATABASE_QUOTA_EXCEEDED'};
async function checkPlayerMenu(page,routeBase,proof){
 await page.locator('[data-role="hamburger"]').click();
 const nav=page.locator('[data-role="individual-navigation"]');await nav.getByRole('link',{name:'Entwicklung',exact:true}).waitFor();
 assert(!/Coach-Cockpit|Trainerübersicht|Bereich wechseln|Training durchführen|Messwerte|KI & Verlauf/.test(await nav.innerText()));
 assert.deepEqual(await nav.locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),[routeBase,routeBase+'/training',routeBase+'/progress',routeBase==='#/individual'?'#/individual/account':routeBase+'/account']);
 assert.equal(await page.locator('.mobile-dock').isVisible(),false);assert(await page.locator('.individual-player-dock').isVisible());
 await page.screenshot({path:join(shots,proof),fullPage:false});await page.keyboard.press('Escape');
}
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'de-DE',serviceWorkers:'block'});
  let signed=false,available=true,quotaMode=false,registrations=0,syncCalls=0;const data=structuredClone(overview),requests=[];
  await context.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname;requests.push(path);
   const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(path==='/api/individual/invite')return send(available?{valid:true,expiresAt:'2026-10-21T12:00:00Z'}:{error:'Einladung bereits verwendet.'},available?200:410);
   if(path==='/api/auth/register'){registrations++;signed=true;available=false;return send({token:'isolated-test-token',user},201);}
   if(path==='/api/auth/me')return send(signed?{user}:{error:'Bitte anmelden.'},signed?200:401);
   if(path==='/api/individual/overview')return quotaMode?send(quota,503):send(data);
   if(path==='/api/individual/sync'){
    syncCalls++;if(quotaMode)return send(quota,503);
    const mutations=route.request().postDataJSON().mutations;
    for(const {kind,payload} of mutations){if(kind==='attendance')data.sessions[0].attendance_status=payload.status;if(kind==='readiness'){data.readiness=[{individual_profile_id:ids.profile,session_id:ids.session,score:payload.score}];}if(kind==='weekly_feedback')data.feedback.push({individual_profile_id:ids.profile,...payload});}
    return send({results:mutations.map(m=>({mutation_id:m.mutationId,applied:true}))});
   }
   return send(quota,503);
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Open the decoded QR destination on a fresh device, mapping only the host to the test deployment.
  await page.goto(base+'/'+new URL(decoded.stdout.trim()).hash);
  const form=page.locator('[data-player-registration]');await form.waitFor();assert.equal(await form.locator('[name="inviteCode"]').count(),0);
  await form.locator('[name="displayName"]').fill('Testspieler');await form.locator('[name="email"]').fill('player@example.invalid');await form.locator('[name="password"]').fill('Testpasswort123');
  await page.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await page.screenshot({path:join(shots,`einladung-${width}.png`),fullPage:true});await form.getByRole('button',{name:'Spielerkonto erstellen',exact:true}).click();
  await page.locator('.individual-player-dashboard').waitFor();assert.equal(registrations,1);assert(!requests.includes('/api/workspace'),'Spieler dürfen den Team-Workspace nicht laden');
  assert(!/FREMD|PRIVATE/.test(await page.locator('#app').innerText()));
  await checkPlayerMenu(page,'#/individual',`spieler-menue-${width}.png`);
  await page.getByRole('button',{name:'Ich bin dabei',exact:true}).click();await page.getByText('Du hast zugesagt',{exact:true}).waitFor();assert.equal(data.sessions[0].attendance_status,'confirmed');
  await page.locator('#app a[href="#/individual/training"]').first().click();await page.getByText('1. Korbleger links',{exact:true}).waitFor();assert(!/FREMDE ÜBUNG|"attempts"/.test(await page.locator('#app').innerText()));await page.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await page.screenshot({path:join(shots,`trainingsplan-${width}.png`),fullPage:true});
  await page.getByRole('link',{name:'← Mein Training',exact:true}).click();await page.locator('[data-readiness]').waitFor();
  quotaMode=true;await page.locator('[name="score"]').fill('8');await page.getByRole('button',{name:'Tagesform speichern',exact:true}).click();await page.locator('[data-individual-sync]').waitFor();assert.equal(await page.locator('[data-readiness-value]').textContent(),'8');
  await page.reload();await page.locator('[data-individual-sync]').waitFor();assert.equal(await page.locator('[data-readiness-value]').textContent(),'8');
  quotaMode=false;await page.evaluate(()=>BT.individualTraining.syncPending());await page.reload();await page.locator('.individual-player-dashboard').waitFor();assert.equal(data.readiness[0].score,8);
  await page.locator('[name="trainingDate"]').fill('2026-10-16');await page.locator('[name="note"]').fill('Mit links sicherer.');await page.getByRole('button',{name:'Rückmeldung speichern',exact:true}).click();await page.getByText('Rückmeldung gespeichert.',{exact:true}).waitFor();assert.equal(data.feedback[0].note,'Mit links sicherer.');
  await page.locator('#app a[href="#/individual/progress"]').first().click();await page.getByText('Treffer links',{exact:true}).waitFor();assert(!/FREMD|PRIVATE|999/.test(await page.locator('#app').innerText()));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontaler Überlauf');await page.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await page.screenshot({path:join(shots,`entwicklung-${width}.png`),fullPage:true});
  await page.goto(base+'/#/games');await page.locator('.individual-player-dashboard').waitFor();assert.equal(new URL(page.url()).hash,'#/individual');assert.equal(errors.length,0,errors.join('\n'));assert(syncCalls>=3);
  // Repeat use on a second fresh device must not show a registration form.
  const again=await context.newPage();await again.goto(base+'/#/join/'+invitation.token); // signed-in account is redirected safely to its own training.
  await context.close();
  const invalidContext=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});await invalidContext.route('**/api/**',r=>r.fulfill({status:410,contentType:'application/json',body:JSON.stringify({error:'Einladung bereits verwendet.'})}));const invalidPage=await invalidContext.newPage();await invalidPage.goto(base+'/#/join/'+invitation.token);await invalidPage.getByRole('heading',{name:'Einladung nicht verfügbar'}).waitFor();assert.equal(await invalidPage.locator('form').count(),0);await invalidContext.close();
  console.log(`${width}px: QR decodiert → frische Spielerregistrierung → eigener Trainingsplan → Zu-/Absage und Tagesform → 503/Neuladen → Synchronisierung → Rückmeldung → Entwicklung; fremde Daten und Teamzugriff gesperrt.`);
 }
 const coachContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:'dark'});
 await coachContext.addInitScript(()=>{localStorage.setItem('beeptest_auth_token','isolated-coach-token');Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('Abgebrochen','AbortError');}});});
 let coachUnavailable=false,inviteCalls=0;const coachUser={...user,role:'coach'};
 await coachContext.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;
  const send=(body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/auth/me')return send({user:coachUser});
  if(path==='/api/individual/overview')return coachUnavailable?send(quota,503):send({...overview,role:'coach'});
  if(path==='/api/individual/manage'){if(r.request().postDataJSON().action==='createInvite'){inviteCalls++;return send(invitation,201);}return send({});}
  return send(quota,503);
 });
 const coachPage=await coachContext.newPage();await coachPage.goto(base+'/#/individual');await coachPage.locator('.individual-profile-card').first().waitFor();
 await coachPage.locator('[data-action="invite-player"]').first().click();const inviteBox=coachPage.locator('[data-role="individual-invite"]');await inviteBox.getByRole('button',{name:'Link teilen',exact:true}).waitFor();await inviteBox.getByRole('button',{name:'Link teilen',exact:true}).click();await inviteBox.getByText('Teilen abgebrochen. Deine Einladung bleibt gültig.',{exact:true}).waitFor();assert.equal(inviteCalls,1);assert.equal(await inviteBox.getByRole('link',{name:'Einladung öffnen'}).getAttribute('href'),invitation.inviteUrl);assert(await inviteBox.locator('img').isVisible());
 await coachPage.goto(base+`/#/individual/player/${ids.profile}/preview`);await coachPage.getByText('Spieleransicht · Vorschau',{exact:true}).waitFor();assert.equal(await coachPage.locator('#app form :enabled').count(),0);assert.equal(await coachPage.locator('#app button:enabled').count(),0);assert(!/FREMD|PRIVATE/.test(await coachPage.locator('#app').innerText()));await coachPage.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await coachPage.screenshot({path:join(shots,'coach-vorschau-390.png'),fullPage:true});
 const previewBase=`#/individual/player/${ids.profile}/preview`;
 await checkPlayerMenu(coachPage,previewBase,'vorschau-menue-390.png');
 for(const [label,pane] of [['Ablauf','training'],['Entwicklung','progress'],['Konto','account']]){
  await coachPage.locator('.individual-player-dock').getByRole('link',{name:label,exact:true}).click();await coachPage.waitForURL(base+'/'+previewBase+'/'+pane);await coachPage.getByText('Spieleransicht · Vorschau',{exact:true}).waitFor();
  await coachPage.locator('.individual-player-dock [aria-current="page"]').filter({hasText:label}).waitFor();
 }
 await coachPage.getByRole('heading',{name:'Kontovorschau',exact:true}).waitFor();assert.equal(await coachPage.locator('#app form').count(),0);
 await coachPage.getByRole('link',{name:'← Zur Coach-Ansicht',exact:true}).click();await coachPage.locator('.individual-coach-detail-page').waitFor();assert.equal(await coachPage.locator('.individual-player-dock').isVisible(),false);
 coachUnavailable=true;await coachPage.goto(base+'/#/individual/preview');await coachPage.getByText('Beispielvorschau',{exact:true}).waitFor();await checkPlayerMenu(coachPage,'#/individual/preview','beispiel-menue-390.png');await coachPage.getByRole('link',{name:'Trainingsplan öffnen',exact:true}).click();await coachPage.getByText('Piloteinheit 1 – Ausgangsniveau',{exact:true}).waitFor();assert.equal(await coachPage.locator('.individual-player-exercises > li').count(),10);assert.equal(await coachPage.locator('.individual-player-exercises > li .individual-exercise-heading > strong').evaluateAll(es=>es.reduce((sum,e)=>sum+parseInt(e.textContent),0)),105);await coachPage.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await coachPage.screenshot({path:join(shots,'beispiel-vorschau-390.png'),fullPage:true});assert(await coachPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await coachContext.close();
 console.log('Coach: echte Spieleransicht schreibgeschützt und ohne private Daten, Teilen-Abbruch ohne Linkverlust, klar markierte Beispielvorschau mit 105 Minuten geprüft.');
 console.log('Browserprüfungen verwenden isolierte API-Testdaten; keine Produktionsregistrierung oder Produktionsschreibzugriffe. Screenshots: '+shots);
}finally{await browser.close();server?.kill();}
