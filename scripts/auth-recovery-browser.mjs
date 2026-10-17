import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
let server,base=process.env.REPORT_BASE_URL;
if(!base){const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});base='http://127.0.0.1:'+port;}
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(existsSync(chromium.executablePath())?undefined:'msedge')});
const shots=join(tmpdir(),'courthub-auth-recovery');mkdirSync(shots,{recursive:true});
const user={id:'test-coach',role:'coach',displayName:'Testtrainer',email:'coach@example.invalid',organization:{id:'test-team',name:'Testteam'}};
const quota={error:'Das Datenbank-Kontingent ist erschöpft. Lokale Daten bleiben erhalten.',code:'DATABASE_QUOTA_EXCEEDED',retryable:true};
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  let logins=0,release;
  await context.route('**/api/**',async r=>{
   if(r.request().url().endsWith('/auth/login')){logins++;await new Promise(resolve=>release=resolve);}
   await r.fulfill({status:503,contentType:'application/json',body:JSON.stringify(quota)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/#/account');
  const form=page.locator('[data-role="login-form"]'),button=form.getByRole('button',{name:'Anmelden',exact:true});
  await button.click();assert.match(await form.locator('[data-role="auth-status"]').innerText(),/E-Mail-Adresse/);assert.equal(logins,0);
  await form.locator('[name="email"]').fill('coach@example.invalid');await form.locator('[name="password"]').fill('short');await button.click();
  assert(await button.isDisabled());await page.waitForFunction(()=>document.querySelector('[data-role="login-form"]').getAttribute('aria-busy')==='true');assert.equal(logins,1);
  release();await form.getByText(/Fehler: Das Datenbank-Kontingent/).waitFor();assert.equal(await button.isDisabled(),false);
  const bounds=await form.locator('[data-role="auth-status"]').boundingBox();assert(bounds&&bounds.y>=0&&bounds.y<844,'Fehler muss am Handy im Blickfeld stehen.');
  await page.screenshot({path:join(shots,'anmeldefehler-'+width+'.png'),fullPage:false});assert.deepEqual(errors,[]);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 let healthy=false,puts=0;const calls=[];
 await context.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;calls.push(path);if(r.request().method()==='PUT')puts++;
  const body=healthy?(path.endsWith('/me')?{user}:path.endsWith('/members')?{members:[]}:{data:{meta:{updatedAt:'2026-10-01'},games:[]},role:'coach',version:1}):quota;
  return r.fulfill({status:healthy?200:503,contentType:'application/json',body:JSON.stringify(body)});
 });
 const token='cached-test-token',fingerprint=createHash('sha256').update(token).digest('hex');
 await context.addInitScript(({token,fingerprint,user})=>{
  if(localStorage.getItem('beeptest_auth_token'))return;
  localStorage.setItem('beeptest_auth_token',token);localStorage.setItem('courthub_workspace_team',user.organization.id);localStorage.setItem('courthub_live_identity',JSON.stringify({fingerprint,user}));
 },{token,fingerprint,user});
 const page=await context.newPage();await page.goto(base+'/#/account');await page.locator('[data-role="cached-session-note"]').waitFor();assert.equal(await page.locator('[data-role="account-role"]').textContent(),'Trainer');assert.equal(await page.locator('[data-role="login-form"]').isVisible(),false);
 await page.screenshot({path:join(shots,'gespeicherte-sitzung-390.png'),fullPage:false});assert.equal(puts,0);
 healthy=true;const before=calls.length;await page.locator('[data-action="sync-now"]').click();await page.getByText('Serverstand wurde geprüft.',{exact:true}).waitFor();assert.equal(await page.locator('[data-role="cached-session-note"]').isVisible(),false);assert(calls.slice(before).indexOf('/api/auth/me')<calls.slice(before).indexOf('/api/workspace'));assert.equal(puts,0);await context.close();
 console.log('Anmeldung mobil: Validierung, kurze Bestandspasswörter, Busy-/503-Rückmeldung, gebundene Sitzung und erneute Serverprüfung erfolgreich. Screenshots: '+shots);
}finally{await browser.close();server?.kill();}
