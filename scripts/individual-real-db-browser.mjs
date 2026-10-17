// Called only by the explicit real-database validation runner, with synthetic
// accounts in its disposable PostgreSQL schema. No request interception/fixtures.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

export async function validateRealDatabaseBrowser({root,handlers={},invitation,password,coachEmail,playerEmail,profileId,baseUrl,proofPrefix='real'}) {
  if(baseUrl)assert.equal(new URL(baseUrl).origin,'https://coach.tsv-lindau.de');
  const {default:workspace}=await import('../api/workspace.js');
  const {default:members}=await import('../api/members.js');
  const routes=new Map([
    ...Object.entries(handlers).map(([key,handler])=>[`/api/${['register','login','me'].includes(key)?'auth':'individual'}/${key}`,handler]),
    ['/api/workspace',workspace],['/api/members',members]
  ]);
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname.startsWith('/api/')){
        const handler=routes.get(url.pathname);
        if(!handler){res.writeHead(404).end();return;}
        let body='';for await(const part of req){body+=part;if(body.length>4194304){res.writeHead(413).end();return;}}
        req.body=body?JSON.parse(body):undefined;req.query=Object.fromEntries(url.searchParams);
        res.status=n=>{res.statusCode=n;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};
        await handler(req,res);return;
      }
      const segments=decodeURIComponent(url.pathname).split('/');
      if(segments.some(p=>p.startsWith('.')||['api','scripts','node_modules','artifacts','tmp','docs'].includes(p))){res.writeHead(403).end();return;}
      let path=resolve(root,'.'+decodeURIComponent(url.pathname));
      if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
      if((await stat(path)).isDirectory())path=join(path,'index.html');
      res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));
    }catch{if(!res.headersSent)res.writeHead(500);res.end();}
  });
  if(!baseUrl)await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=baseUrl||'http://127.0.0.1:'+server.address().port;
  const directory=resolve(root,'.superpowers/db-migration/proof');await mkdir(directory,{recursive:true});
  let browser;
  try{
    const qrPath=join(directory,`${proofPrefix}-test-invitation.png`);await writeFile(qrPath,Buffer.from(invitation.qrDataUrl.split(',')[1],'base64'));
    const python=process.env.COURTHUB_QR_PYTHON||join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
    const decoded=execFileSync(python,['-c','import cv2,zxingcpp,sys; codes=zxingcpp.read_barcodes(cv2.imread(sys.argv[1])); print(codes[0].text if len(codes)==1 else "")',qrPath],{encoding:'utf8'}).trim();
    assert.equal(decoded,invitation.inviteUrl);
    browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(existsSync(chromium.executablePath())?undefined:'msedge')});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'de-DE',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/'+new URL(decoded).hash);
    const registration=page.locator('[data-player-registration]');await registration.waitFor();
    await registration.locator('[name="displayName"]').fill('Mobiler Testspieler');
    await registration.locator('[name="email"]').fill(playerEmail);await registration.locator('[name="password"]').fill(password);
    await registration.getByRole('button',{name:'Spielerkonto erstellen',exact:true}).click();
    await page.locator('.individual-player-dashboard').waitFor();
    await page.getByRole('button',{name:'Ich bin dabei',exact:true}).click();await page.getByText('Du hast zugesagt',{exact:true}).waitFor();
    await page.locator('[name="score"]').fill('8');await page.getByRole('button',{name:'Tagesform speichern',exact:true}).click();
    await page.getByText('Tagesform gespeichert.',{exact:true}).waitFor();
    await page.locator('a[href="#/individual/training"]').first().click();await page.locator('.individual-player-exercises > li').first().waitFor();
    assert.equal(await page.locator('.individual-player-exercises > li .individual-exercise-heading > strong').evaluateAll(es=>es.reduce((n,e)=>n+parseInt(e.textContent),0)),105);
    await page.screenshot({path:join(directory,`${proofPrefix}-mobile-plan.png`),fullPage:true});
    // The feedback form correctly appears only in its released week. Simulate
    // that Friday without changing any API responses or PostgreSQL data.
    await page.clock.install({time:new Date('2026-10-23T18:00:00+02:00')});
    await page.getByRole('link',{name:'← Mein Training',exact:true}).click();
    await page.locator('[name="trainingDate"]').fill('2026-10-23');await page.locator('[name="note"]').fill('Echte mobile Rückmeldung angekommen.');
    await page.getByRole('button',{name:'Rückmeldung speichern',exact:true}).click();await page.getByText('Rückmeldung gespeichert.',{exact:true}).waitFor();
    await page.reload();await page.locator('.individual-player-dashboard').waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:join(directory,`${proofPrefix}-mobile-player.png`),fullPage:true});
    const otherContext=await browser.newContext({viewport:{width:390,height:844},locale:'de-DE',serviceWorkers:'block'});
    const coachPage=await otherContext.newPage();await coachPage.goto(base+'/#/account');
    const login=coachPage.locator('[data-role="login-form"]');await login.locator('[name="email"]').fill(coachEmail);await login.locator('[name="password"]').fill(password);await login.locator('button[type="submit"]').click();
    await coachPage.waitForURL(base+'/#/dashboard');
    await coachPage.goto(base+`/#/individual/player/${profileId}/feedback`);
    await coachPage.getByText('Echte mobile Rückmeldung angekommen.',{exact:true}).waitFor();
    await coachPage.screenshot({path:join(directory,`${proofPrefix}-mobile-coach-feedback.png`),fullPage:true});
    assert.equal(errors.length,0,errors.join('\n'));
  }finally{
    await browser?.close();if(server.listening)await new Promise(r=>server.close(r));
  }
}
