import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {trainingFixture} from './fixtures/training-proposals.mjs';
const f=await trainingFixture(),dom=new JSDOM('<main id="app"></main>',{url:'https://training.test/#/individual',runScripts:'outside-only'}),w=dom.window;
const tick=()=>new Promise(r=>setTimeout(r,25));
try{
  let refreshed=0;
  w.BT={util:{escapeHTML:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},api:{individualPlanProposal:async(action,payload)=>{
    const r=await f.call({action,...payload});if(r.statusCode>=400)throw Error(r.body.error);return r.body;
  }}};
  for(const file of ['training-proposals','individual-plan-editor'])w.eval(readFileSync('js/'+file+'.js','utf8'));
  const host=w.document.querySelector('main');w.BT.individualPlanEditor.mount(host,{profile:f.profiles[0],session:f.sessions[0],plan:f.plans[0],exercises:f.exercises[0],measurements:[],refresh:async()=>refreshed++});
  const form=host.querySelector('form');form.reportValidity=()=>true;
  form.querySelector('[name=exerciseTitle]').value='Nachträglich bearbeitet';
  await form.onsubmit({preventDefault(){}});
  assert(host.querySelector('[data-proposal-preview]').textContent.includes('Nachträglich bearbeitet'));
  assert.equal((await f.db.query('SELECT title FROM individual_exercises WHERE id=$1',[f.exercises[0][0].id])).rows[0].title,f.exercises[0][0].title,'Draft cannot leak to player plan');
  const publish=host.querySelector('[data-publish-proposal]');publish.click();
  for(let n=0;n<30&&!refreshed;n++)await tick();assert.equal(refreshed,1);
  assert.equal((await f.db.query('SELECT title FROM individual_exercises WHERE id=$1',[f.exercises[0][0].id])).rows[0].title,'Nachträglich bearbeitet');
  host.replaceChildren();
  w.BT.individualPlanEditor.mount(host,{profile:f.profiles[1],session:f.sessions[1],plan:f.plans[1],exercises:f.exercises[1],measurements:[],refresh:async()=>{}});
  host.querySelectorAll('[data-regenerate-choice]')[1].checked=true;
  await host.querySelector('[data-generate-plan]').onclick();
  assert(host.querySelector('[data-proposal-preview]').textContent.includes('Neue Entscheidung 1'));
  assert.equal(f.lastInput().payload.data.slots.length,1);
  host.querySelector('[data-adopt-proposal]').click();assert.equal(host.querySelectorAll('[name=exerciseTitle]')[1].value,'Neue Entscheidung 1');
  assert.equal(host.querySelectorAll('[name=exerciseTitle]')[0].value,f.exercises[1][0].title);
  console.log('Coach editor with real database API: manual draft, explicit publication, selected AI regeneration, preview, preservation and editable adoption passed.');
}finally{w.close();await f.db.close();}
