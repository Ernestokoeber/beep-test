import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let browser;
try {
  await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
  browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?undefined:'msedge'});
  const proof=resolve('.superpowers/shared-live-proof');mkdirSync(proof,{recursive:true});
  for(const [width,height] of [[1440,1000],[1024,900],[390,844]]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100,isMobile:width<600,locale:'de-DE',serviceWorkers:'block'});
    await context.route('**/__shared-live-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/individual-training.css"><link rel="stylesheet" href="/app-design.css"><body><main id="app"></main><script src="/js/individual-copy.js"></script><script src="/js/individual-player-view.js"></script><script src="/js/individual-live.js"></script><script src="/js/individual-training.js"></script></body></html>'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/__shared-live-test#/individual`);
    await page.evaluate(async()=>{
      BT.individualTraining.cleanup();
      BT.util={escapeHTML:value=>String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')};
      BT.sync={};BT.storage={};BT.api={};
      const data={role:'coach',profiles:[{id:'p1',player_profile_id:'t'},{id:'p2',player_profile_id:'a'}],
        sessions:['p1','p2'].map(id=>({id:'shared',individual_profile_id:id,unit_number:1,status:'planned',attendance_status:'attended',scheduled_for:'2026-10-19T18:15:00Z'})),
        plans:['p1','p2'].map(id=>({id:'plan-'+id,individual_profile_id:id,session_id:'shared',title:'Individuelle Bestandsaufnahme',objective:id==='p1'?'Ballkontrolle unter Druck':'Frühe Positionierung und sicherer Abschluss'})),
        exercises:['p1','p2'].flatMap((id,index)=>[{id:id+'-1',individual_profile_id:id,session_id:'shared',position:1,title:index?'Positionierung und Abschluss':'Ballkontrolle unter Druck',duration_minutes:20,repetitions:{sets:3},measurement_method:{metric:'Beobachtung je Serie'},coaching_cues:[index?'Kontakt halten und Passfenster zeigen':'Kopf oben und Abstand zum Verteidiger schaffen']},{id:id+'-2',individual_profile_id:id,session_id:'shared',position:2,title:'Wurf',duration_minutes:15,repetitions:{totalAttempts:25},measurement_method:{metric:'Treffer je Position'},coaching_cues:['Stabil stehen']}]),
        focuses:[],measurements:[],readiness:[],feedback:[],releasedFeedback:[],coachNotes:[],aiDrafts:[],pilotRoadmap:[]};
      BT.sync.getState=()=>({user:{id:'coach',role:'coach',displayName:'Ernesto'}});
      BT.storage.getPlayers=()=>[{id:'t',name:'Thomas Albrecht'},{id:'a',name:'Adnan Gasum'}];
      BT.api.getIndividualOverview=async()=>data;
      window.liveActions=[];BT.api.individualAction=async(action,payload)=>{window.liveActions.push({action,payload});return {};};
      await BT.individualTraining.render(document.querySelector('#app'),'p1','training');
    });
    await page.locator('[data-action="start-live-training"]').click();
    await page.locator('[data-live-player="p2"]').waitFor();
    assert.equal(await page.locator('[data-live-toggle]').count(),1);
    await page.locator('[data-live-toggle]').click();await page.waitForFunction(()=>window.liveActions.some(x=>x.action==='startSession'));
    await page.locator('[data-live-player="p1"] textarea[data-live-note]').fill('Thomas: Ball unter Druck schützen.');
    await page.locator('[data-live-player="p2"] textarea[data-live-note]').fill('Adnan: Position früh sichern.');
    await page.locator('[data-live-player="p2"] [data-live-rating="Wiederholen"]').click();
    assert.equal(await page.locator('[data-live-player="p1"] textarea[data-live-note]').inputValue(),'Thomas: Ball unter Druck schützen.');
    await page.locator('[data-live-next]').click();
    const form=page.locator('[data-live-player="p2"] [data-live-measurement]');
    await form.locator('[name="value"]').fill('4');await form.getByRole('button',{name:'Speichern',exact:true}).click();
    await page.waitForFunction(()=>window.liveActions.some(x=>x.action==='saveMeasurement'));
    const measurement=await page.evaluate(()=>window.liveActions.find(x=>x.action==='saveMeasurement').payload);
    assert.equal(measurement.profileId,'p2');assert.equal(measurement.exerciseId,'p2-2');assert.equal(measurement.numericValue,4);
    await page.locator('[data-live-prev]').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontaler Seitenüberlauf');
    await page.locator('.individual-live-current').evaluate(e=>{e.scrollTop=0;});
    await page.screenshot({path:resolve(proof,`shared-${width}.png`)});
    const panel=page.locator('[data-live-player="p2"]');await panel.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(proof,`adnan-${width}.png`)});
    await page.locator('[data-live-finish]').click();
    await page.waitForFunction(()=>window.liveActions.some(x=>x.action==='completeLiveSession'));
    const finish=await page.evaluate(()=>window.liveActions.find(x=>x.action==='completeLiveSession').payload);
    assert.equal(finish.documents.length,2);assert.equal(finish.documents[0].exercises[0].note,'Thomas: Ball unter Druck schützen.');assert.equal(finish.documents[1].exercises[0].note,'Adnan: Position früh sichern.');
    assert.deepEqual(errors,[]);
    await context.close();console.log(`${width}px: gemeinsame Liveeinheit, Touch-Eingaben, Spielermessung und gemeinsamer Abschluss geprüft.`);
  }
  console.log('Bildnachweise: '+proof);
} finally { await browser?.close();server.kill(); }
