import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {fixture} from './matchday-fixture.mjs';
import {emptyDraft,reviseMatchday} from '../js/matchday/model.mjs';
import {mountMatchdayView} from '../js/matchday/view.mjs';
import {mountMatchdayLive} from '../js/matchday/live-shell.mjs';
const cases={};
const setup=f=>({...emptyDraft(),ownSide:'home',step:'review',roster:f.roster,startingFive:f.roster.slice(0,5).map(p=>p.id)});
const revision=(id,value,parents=[])=>({id,parents,actorId:'coach',deviceId:'other',recordedAt:'2026-09-29',value});
const dom=()=>{const d=new JSDOM('<main id="app"></main>',{url:'https://test.local/#/games/g/matchday',runScripts:'outside-only',pretendToBeVisual:true});globalThis.document=d.window.document;globalThis.window=d.window;return d;};
cases.offline=async()=>{
  const d=dom(),w=d.window;let done,ready=false,opened=[];
  w.BT={sync:{init:()=>new Promise(r=>{done=()=>{ready=true;r();};})},games:{renderMatchday:()=>opened.push(ready)}};
  try{w.eval(readFileSync(new URL('../js/app.js',import.meta.url),'utf8'));w.dispatchEvent(new w.Event('DOMContentLoaded'));assert.equal(typeof done,'function');done();await new Promise(r=>setTimeout(r,20));assert.deepEqual(opened,[true],'Deep link must open only after offline identity restoration');}finally{d.window.close();}
};
cases.focus=async()=>{
  const d=dom(),f=await fixture(),c=await f.open();let cleanup;
  try{await c.saveDraft({...setup(f),closingNote:'Alter Text'});await c.start();cleanup=mountMatchdayLive(document.querySelector('main'),c);
    const field=document.querySelector('[data-field="closingNote"]');field.focus();
    await f.journal.append('g',reviseMatchday(await f.journal.read('g'),revision('remote',{...c.getState().draft,closingNote:'Andere neue Abschlussnotiz'},c.getState().heads)));
    await c.refresh();assert.equal(field.value,'Alter Text');field.value='Alter Text lokal ergänzt';field.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.equal(await cleanup.flush(),true);assert.equal(c.getState().conflict,true,'Focused stale closing note must branch, not overwrite unseen remote text');
  }finally{cleanup?.();await c.close();d.window.close();}
};
cases.noteConflict=async()=>{
  const d=dom(),f=await fixture(),c=await f.open();let cleanup;
  try{await c.saveDraft(setup(f));await c.start();cleanup=mountMatchdayLive(document.querySelector('main'),c);
    const field=document.querySelector('[data-field="closingNote"]');field.value='Noch nicht gespeicherte Eingabe';field.dispatchEvent(new window.Event('input',{bubbles:true}));
    const base=c.getState().heads,draft=c.getState().draft;let envelope=await f.journal.read('g');
    envelope=reviseMatchday(envelope,revision('note-a',{...draft,closingNote:'Notiz vom Handy'},base));
    envelope=reviseMatchday(envelope,revision('note-b',{...draft,closingNote:'Notiz vom Tablet'},base));
    await f.journal.append('g',envelope);await c.refresh();
    assert.equal(field.value,'Noch nicht gespeicherte Eingabe');const discard=document.querySelector('[data-action="discard-unsaved"]');assert.equal(discard.hidden,false,'Eine offene Eingabe muss vor der Konfliktauflösung ausdrücklich verwerfbar sein.');discard.click();
    const choices=[...document.querySelectorAll('[data-action="resolve-closing-note"]')];assert.equal(choices.length,2,'Beide Abschlussnotizen müssen im laufenden Spiel auswählbar sein.');
    assert.match(choices[0].textContent,/übernehmen/i);choices[1].click();await c.idle();await new Promise(r=>setTimeout(r,0));
    assert.equal(c.getState().conflict,false);assert.equal(document.querySelector('[data-field="closingNote"]').disabled,false);assert.equal(c.getState().draft.closingNote,'Notiz vom Tablet');
  }finally{cleanup?.();await c.close();d.window.close();}
};
cases.dirty=async()=>{
  const d=dom(),f=await fixture(),c=await f.open();let cleanup;
  try{await c.saveDraft({...setup(f),step:'preparation'});cleanup=mountMatchdayView(document.querySelector('main'),c);
    const field=document.querySelector('[data-field="goals"]');field.focus();field.value='Ungespeicherte lokale Ziele';field.dispatchEvent(new window.Event('input',{bubbles:true}));
    let envelope=await f.journal.read('g');const parents=c.getState().heads;
    envelope=reviseMatchday(envelope,revision('a',{...c.getState().draft,goals:'A'},parents));envelope=reviseMatchday(envelope,revision('b',{...c.getState().draft,goals:'B'},parents));await f.journal.append('g',envelope);await c.refresh();
    const choices=[...document.querySelectorAll('[data-action="resolve"]')];assert.equal(choices.length,2,'Dirty form must expose conflict resolution');assert.equal(field.value,'Ungespeicherte lokale Ziele');assert.equal(document.activeElement,field);
    assert.match(choices[0].textContent,/verwerfen/i);choices[0].click();await c.idle();await new Promise(r=>setTimeout(r,0));assert.equal(c.getState().conflict,false);assert.equal(await cleanup.flush(),true);
  }finally{cleanup?.();await c.close();d.window.close();}
};
cases.unseen=async()=>{
  const f=await fixture(),c=await f.open();
  try{const draft=setup(f);let envelope=reviseMatchday(undefined,revision('a',draft));envelope=reviseMatchday(envelope,revision('b',{...draft,goals:'B'}));await f.journal.append('g',envelope);await c.refresh();assert.deepEqual(c.getState().heads,['a','b']);
    envelope=reviseMatchday(envelope,revision('c',{...draft,goals:'Nicht angezeigt'}));await f.journal.append('g',envelope);
    assert.equal((await c.resolve('a')).ok,false,'Resolution must reject newly discovered unseen head');assert.equal(c.getState().conflict,true);assert.deepEqual(c.getState().heads,['a','b','c']);
  }finally{await c.close();}
};
cases.readonly=async()=>{
  for(const live of [false,true]){const d=dom(),f=await fixture(),c=await f.open();let cleanup;
    try{await c.saveDraft({...setup(f),step:live?'review':'preparation'});if(live)await c.start();cleanup=live?mountMatchdayLive(document.querySelector('main'),c):mountMatchdayView(document.querySelector('main'),c);
      const field=document.querySelector(`[data-field="${live?'closingNote':'goals'}"]`);field.value='Offene Eingabe';field.dispatchEvent(new window.Event('input',{bubbles:true}));f.identity({role:'viewer'});
      assert.equal(await cleanup.flush(),false);const discard=document.querySelector('[data-action="discard-unsaved"]');assert.ok(discard,'Read-only transition must offer explicit discard to unblock navigation');assert.equal(field.value,'Offene Eingabe');discard.click();assert.equal(await cleanup.flush(),true);
    }finally{cleanup?.();await c.close();d.window.close();}
  }
};
const selected=process.argv[2];for(const name of selected?[selected]:Object.keys(cases)){await cases[name]();console.log('Matchday review regression passed: '+name);}
