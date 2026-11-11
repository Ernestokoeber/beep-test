import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<main id="app"></main>',{url:'https://coach.test/#/individual',runScripts:'outside-only'});
const w=dom.window;
const data={role:'coach',profiles:[{id:'p',account_name:'Thomas'}],
  sessions:[{id:'old',individual_profile_id:'p',unit_number:1,status:'completed',scheduled_for:'2026-10-19T18:15:00Z'},{id:'next',individual_profile_id:'p',unit_number:2,status:'planned',scheduled_for:'2099-11-16T19:15:00Z'}],
  plans:[{id:'old-plan',session_id:'old',individual_profile_id:'p',version:1,title:'Bisheriger Ablauf'},{id:'next-plan',session_id:'next',individual_profile_id:'p',version:1,title:'Dribbling und Entscheidungen',objective:'Hilfe lesen'}],
  exercises:[{id:'e1',plan_id:'old-plan',session_id:'old',individual_profile_id:'p',position:1,title:'Alte Übung',duration_minutes:15},{id:'e2',plan_id:'next-plan',session_id:'next',individual_profile_id:'p',position:1,title:'Zug und Passentscheidung',duration_minutes:20}],
  focuses:[{individual_profile_id:'p',title:'Abgelaufener Fokus',valid_from:'2020-01-01',valid_until:'2020-01-07'}],
  pilotRoadmap:[{unitNumber:1,title:'Standardtest',scheduledDate:'2026-10-19',durationMinutes:105,template:{exercises:[{title:'Falsche Ersatzübung',durationMinutes:105}]}},{unitNumber:2,title:'Allgemeiner Platzhalter',scheduledDate:'2099-11-16',durationMinutes:105}],
  coachNotes:[],aiDrafts:[],measurements:[],readiness:[],feedback:[],notifications:[]};
const mounted=[];
w.BT={util:{escapeHTML:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')},storage:{getPlayers:()=>[]},sync:{getState:()=>({user:{id:'coach',role:'coach'}})},api:{getIndividualOverview:async()=>data,individualAction:async()=>{throw Error('Read-only navigation must not mutate');}},individualPlanEditor:{mount:(host,args)=>mounted.push(args.session.id)}};
for(const file of ['individual-copy','individual-training'])w.eval(readFileSync(`js/${file}.js`,'utf8'));
const root=w.document.querySelector('main');
try {
  await w.BT.individualTraining.render(root);
  assert(root.querySelector('.individual-next-plan').textContent.includes('Zug und Passentscheidung'));
  assert(!root.textContent.includes('Abgelaufener Fokus'));
  await w.BT.individualTraining.render(root,'p','overview');
  assert(root.querySelector('[data-pilot-unit="2"]').textContent.includes('Zug und Passentscheidung'),'Version 1 must be visible');
  assert(!root.textContent.includes('Falsche Ersatzübung'),'Saved plans take precedence over templates');
  root.querySelector('[data-open-session="old"]').click();
  await w.BT.individualTraining.render(root,'p','training');
  assert.equal(root.querySelector('[data-measurement-session]').value,'old');
  assert(root.querySelector('.individual-session-run-card').textContent.includes('Alte Übung'));
  assert.equal(mounted.at(-1),'old');
  const select=root.querySelector('[data-measurement-session]');select.value='next';select.dispatchEvent(new w.Event('change'));
  await new Promise(r=>setTimeout(r,0));
  assert.equal(mounted.at(-1),'next');
  assert(root.querySelector('.individual-session-run-card').textContent.includes('Zug und Passentscheidung'));
  data.exercises=data.exercises.filter(e=>e.session_id!=='old');
  await w.BT.individualTraining.render(root,'p','overview');
  assert(!root.querySelector('[data-pilot-unit="1"]').textContent.includes('Falsche Ersatzübung'),'Empty saved plan must stay empty');
  console.log('Coach plans: version 1, direct overview, historical selection, editor binding, empty plans and expired focus verified.');
} finally {w.BT.individualTraining.cleanup();w.close();}
