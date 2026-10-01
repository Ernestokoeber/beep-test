import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixture} from './matchday-fixture.mjs';
import {mountMatchdayView} from '../js/matchday/view.mjs';
const dom=new JSDOM('<main></main>',{url:'https://ui.test'});globalThis.document=dom.window.document;globalThis.window=dom.window;
const f=await fixture(),c=await f.open(),root=document.querySelector('main');
const availableTactics=[
  {id:'horns',title:'Horns',category:'Offense'},
  {id:'zone-attack',title:'Zone Overload',category:'Zone Offense'},
  {id:'zone',title:'2–3 Zone',category:'Defense'},
  {id:'baseline',title:'Baseline Box',category:'Einwurf'},
  {id:'pressbreak',title:'1–4 Pressbreak',category:'Pressbreak'}
];
const cleanup=mountMatchdayView(root,c,{players:()=>f.roster,tactics:()=>availableTactics});
const input=(key,value)=>{const n=root.querySelector('[data-field="'+key+'"]');n.value=value;n.dispatchEvent(new window.Event('input',{bubbles:true}));return n;};
const click=async key=>{root.querySelector('[data-action="'+key+'"]').click();await new Promise(r=>setTimeout(r,20));await c.idle();};
input('ownSide','home');await click('next');assert.equal(c.getState().stage,'roster');
// A blur save must not swallow the next player's tap by disabling the form.
let release;const append=f.deps.journal.append;
f.deps.journal.append=async(...args)=>{await new Promise(r=>{release=r;});return append(...args);};
const first=root.querySelector('[data-player-status="p0"]');assert.ok(first,'Jeder Spieler braucht einen Gameplan-Status.');first.value='starter';first.dispatchEvent(new window.Event('input',{bubbles:true}));
root.querySelector('form').dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));
await new Promise(r=>setTimeout(r,10));
assert.equal(root.querySelector('fieldset').disabled,false,'Autosave must not disable the next tap');
release();await c.idle();f.deps.journal.append=append;
for(const [index,select] of [...root.querySelectorAll('[data-player-status]')].entries()){select.value=index<5?'starter':index===5?'dnp':'bench';select.dispatchEvent(new window.Event('change',{bubbles:true}));}
const role=root.querySelector('[data-player-role="p0"]');role.value='Ballhandler';role.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(root.querySelector('[data-player-role="p5"]').disabled,true);
await click('next');assert.equal(c.getState().stage,'preparation');
assert.equal(c.getState().draft.roster[0].gameStatus,'starter');assert.equal(c.getState().draft.roster[0].role,'Ballhandler');
assert.equal(c.getState().draft.roster[5].gameStatus,'dnp');
const goals=input('goals','<img src=x> Rebounds');goals.focus();f.emit();await new Promise(r=>setTimeout(r,10));assert.equal(document.activeElement,goals);assert.equal(goals.value,'<img src=x> Rebounds');
assert.match(root.textContent,/Offense/);assert.match(root.textContent,/Defense/);assert.match(root.textContent,/Einwurf/);assert.match(root.textContent,/Pressbreak/);
assert.match(root.querySelector('[data-tactic-group="offense"]').textContent,/Zone Overload/,'Zone-Offense muss als Offense gruppiert werden.');
const horns=root.querySelector('[data-tactic-id="horns"]');horns.checked=true;horns.dispatchEvent(new window.Event('change',{bubbles:true}));
f.fail(true);await click('skip-preparation');assert.equal(c.getState().stage,'preparation');f.fail(false);
await click('skip-preparation');assert.equal(c.getState().stage,'review');assert.equal(c.getState().draft.goals,'<img src=x> Rebounds');assert.deepEqual(c.getState().draft.tactics,[{id:'horns',title:'Horns',usage:'offense'}]);assert.equal(root.querySelectorAll('img').length,0);
assert.match(root.textContent,/Starting Five/);assert.match(root.textContent,/Bank/);assert.match(root.textContent,/DNP/);assert.match(root.textContent,/Ballhandler/);
await click('start');assert.equal(c.getState().stage,'live');assert.equal(c.live.getState().clock.running,false);
await cleanup.flush();cleanup();await c.close();dom.window.close();
console.log('Matchday UI: player status, roles, tactic groups, optional notes, focus, retry and start passed.');
