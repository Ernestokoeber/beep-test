import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('index.html','utf8');
const cases={
 async sync(w,B,host){
  for(const variant of ['account','organization','role','token','navigation','success']){
   let user={id:'coach-a',role:'coach',organization:{id:'org-a'}},token='test-token',resolve;
   B.sync={getState:()=>({user,sessionEpoch:user.id})};
   B.api.getToken=()=>token; B.api.syncWebsiteGames=()=>new Promise(r=>resolve=r);
   const before=JSON.stringify(B.seasonplanner.scheduleConfig());
   host.replaceChildren();B.games.render(host);host.querySelector('[data-action="sync-games"]').click();
   if(variant==='account')user={...user,id:'coach-b'};
   if(variant==='organization')user={...user,organization:{id:'org-b'}};
   if(variant==='role')user={...user,role:'viewer'};
   if(variant==='token')token='another-session';
   if(variant==='navigation')B.games.cleanup();
   resolve({games:[{id:variant,date:'2099-10-20',home:'Altes Team',away:'Gast'}],team:{id:42,name:'Altes Team'},league:{name:'Testliga'}});
   await new Promise(r=>setTimeout(r,0));
   if(variant==='success'){assert(B.storage.getGame(variant),'Gültiger Spielplan muss weiter übernommen werden.');continue;}
   assert.equal(B.storage.getGame(variant),undefined,'Verspätete Spielplanantwort: '+variant);
   assert.equal(JSON.stringify(B.seasonplanner.scheduleConfig()),before,'Teamkonfiguration schützen: '+variant);
  }
 },
 async viewer(w,B,host){
  let role='viewer';B.sync={getState:()=>({user:{id:'reader',role,organization:{id:'org'}}})};
  const p=B.storage.upsertPlayer({name:'Lesender Test'});
  const t=B.storage.upsertTraining({date:'2099-10-20',attendance:[{playerId:p.id,status:'present'}],plan:{summary:'Original',drills:[{name:'Closeouts',minutes:10}]}});
  const before=JSON.stringify(B.storage.getTraining(t.id));
  B.trainingPages.render(host,t.id,'plan');
  const field=host.querySelector('[data-plan-summary]');assert(field.disabled || field.readOnly,'Viewer-Schwerpunkt muss schreibgeschützt sein.');
  field.disabled=false;field.value='Unerlaubt';field.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(JSON.stringify(B.storage.getTraining(t.id)),before,'Lesendes Öffnen und synthetische Eingaben dürfen nicht speichern.');
  for(const page of ['attendance','ft','shots','fitness','sprints','notes','analysis','event','plan-options','live','clock']){
   B.training.cleanup();host.replaceChildren();B.trainingPages.render(host,t.id,page);
   for(const input of host.querySelectorAll('input,textarea,select')){input.disabled=false;input.dispatchEvent(new w.Event('change',{bubbles:true}));}
   assert.equal(JSON.stringify(B.storage.getTraining(t.id)),before,'Lesezugriff verändert Unterseite '+page);
  }
  host.replaceChildren();B.trainingPages.renderNew(host);assert.equal(host.querySelector('button[type="submit"]'),null);
  host.replaceChildren();B.trainingPages.renderList(host);assert.equal(host.querySelector('a[href="#/training/new"]'),null);
  role='coach';host.replaceChildren();B.trainingPages.render(host,t.id,'plan');const coachField=host.querySelector('[data-plan-summary]');
  role='viewer';coachField.value='Rolle geändert';coachField.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(B.storage.getTraining(t.id).plan.summary,'Original');
 },
 async live(w,B,host){
  let user={id:'coach-a',role:'coach',organization:{id:'org-a'}};B.sync={getState:()=>({user})};w.confirm=()=>true;
  const t=B.storage.upsertTraining({date:'2099-10-20',plan:{drills:[{name:'Closeouts',minutes:10}]}});
  B.trainingPages.render(host,t.id,'live');const before=JSON.stringify(B.storage.getTraining(t.id));
  user={...user,role:'viewer'};host.querySelector('[data-live-action="finish"]').click();
  w.dispatchEvent(new w.Event('pagehide'));B.trainingLive.close();
  assert.equal(JSON.stringify(B.storage.getTraining(t.id)),before,'Rollenwechsel muss auch eine bereits geöffnete Live-Durchführung sperren.');
  user={id:'coach-a',role:'coach',organization:{id:'org-a'}};host.replaceChildren();B.trainingPages.render(host,t.id,'live');
  const snapshot=JSON.stringify(B.storage.getTraining(t.id));user={id:'coach-b',role:'coach',organization:{id:'org-b'}};
  B.trainingLive.close();assert.equal(JSON.stringify(B.storage.getTraining(t.id)),snapshot,'Alte Live-Ansicht darf beim Schließen nicht in den neuen Kontext schreiben.');
 },
 async opponent(w,B){
  const fixture={id:'future',date:'2099-10-20',score:'0:0',status:'played',home:'TSV Lindau',away:'Testgegner'};
  const rows=B.opponents.orderOpponentProfiles([{id:'opp',name:'Testgegner'}],[fixture],{teamName:'TSV Lindau'},'2026-10-17');
  assert.equal(rows[0].nextGame?.id,fixture.id,'Vorläufiges 0:0 darf einen zukünftigen Gegner nicht ausblenden.');
  assert.equal(B.opponents.orderOpponentProfiles([{name:'Testgegner'}],[{...fixture,cancelled:true}],{teamName:'TSV Lindau'},'2026-10-17')[0].nextGame,null);
 },
 async home(w,B,host){
  B.storage.upsertTraining({date:'2099-10-21',plan:{drills:[]}});
  const g=B.storage.upsertGame({date:'2099-10-20',home:'TSV Lindau',away:'Testgegner'});
  B.dashboard.render(host);
  const notices=host.querySelector('[data-role="home-notices-list"]');
  assert.equal(host.querySelector('[data-role="home-notices"] summary').textContent,'Vor dem nächsten Spiel klären','Die Überschrift muss zum nächsten Termin passen.');
  assert.match(notices.textContent,/Spielkader|Starting Five|Spielziele/,'Heute muss die offenen Punkte des nächsten Spiels zeigen.');
  assert.doesNotMatch(notices.textContent,/Trainingsablauf|nicht verplant|dieses Trainings/);
  assert.equal(notices.querySelector('a')?.getAttribute('href'),'#/briefing?game='+g.id,'Weitere Hinweise müssen beim selben Termin bleiben.');
 }
};
for(const [name,test] of Object.entries(cases)){
 if(process.argv[2] && process.argv[2]!==name)continue;
 const dom=new JSDOM(html,{url:'https://coach.test/#/training',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
 for(const match of html.matchAll(/<script defer src="(js\/[^"]+)"/g)){if(!['js/app.js','js/install.js'].includes(match[1]))w.eval(readFileSync(match[1],'utf8'));}
 const B=w.BT,host=w.document.querySelector('#app');
 try{await test(w,B,host);console.log('Konsistenzprüfung bestanden: '+name);}
 finally{B.dashboard.cleanup();B.games.cleanup();B.training.cleanup();w.close();}
}
