import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixture} from './matchday-fixture.mjs';
import * as matchdayView from '../js/matchday/view.mjs';
const {mountMatchdayView,prepareMatchdayEntry}=matchdayView;
const dom=new JSDOM('<main></main>',{url:'https://ui.test'});globalThis.document=dom.window.document;globalThis.window=dom.window;
const f=await fixture(),c=await f.open(),root=document.querySelector('main');
let rosterPdfPayload=null;
let releasePdfEngine;const pdfEngineReady=new Promise(resolve=>{releasePdfEngine=resolve;});
assert.equal(typeof prepareMatchdayEntry,'function','Der Direkteinstieg braucht eine abwartbare Vorbereitung vor dem View-Mount.');
const availableTactics=[
  {id:'horns',title:'Horns',category:'Offense'},
  {id:'zone-attack',title:'Zone Overload',category:'Zone Offense'},
  {id:'zone',title:'2–3 Zone',category:'Defense'},
  {id:'baseline',title:'Baseline Box',category:'Einwurf'},
  {id:'pressbreak',title:'1–4 Pressbreak',category:'Pressbreak'}
];
const cleanup=mountMatchdayView(root,c,{players:()=>f.roster,tactics:()=>availableTactics,game:{id:'g',home:'Lindau',away:'Gast',date:'2026-10-04',time:'17:00'},prepareRosterPdf:()=>pdfEngineReady,onRosterPdf:async payload=>{rosterPdfPayload=payload;return {delivery:'cancelled'};}});
const input=(key,value)=>{const n=root.querySelector('[data-field="'+key+'"]');n.value=value;n.dispatchEvent(new window.Event('input',{bubbles:true}));return n;};
const click=async key=>{root.querySelector('[data-action="'+key+'"]').click();await new Promise(r=>setTimeout(r,20));await c.idle();};
input('ownSide','home');await click('next');assert.equal(c.getState().stage,'roster');
const pdfButton=root.querySelector('[data-action="export-roster-pdf"]');
assert.equal(pdfButton.disabled,true,'Der PDF-Button muss bis zum geladenen lokalen PDF-Modul gesperrt bleiben.');
releasePdfEngine();await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(pdfButton.disabled,false,'Der PDF-Button muss nach dem Vorladen verfügbar sein.');
assert.match(root.querySelector('[data-role="selection-summary"]')?.textContent||'',/Kader\s+0.*Starting Five\s+0\/5/,'Kader und Starting Five müssen sofort sichtbar zusammengefasst werden.');
assert.ok(root.querySelector('[data-action="show-roster"]'),'Der Kader braucht einen direkt sichtbaren Reiter.');
assert.ok(root.querySelector('[data-action="show-lineup"]'),'Die Starting Five braucht einen direkt sichtbaren Reiter.');
// A blur save must not swallow the next player's tap by disabling the form.
let release;const append=f.deps.journal.append;
f.deps.journal.append=async(...args)=>{await new Promise(r=>{release=r;});return append(...args);};
const first=root.querySelector('[data-player-roster="p0"][data-status="bench"]');assert.ok(first,'Jeder Spieler braucht eine große Kaderauswahl.');first.click();
assert.match(first.getAttribute('aria-label')||'',/Spieler 0.*Dabei/,'Die Kaderaktion braucht Spielername und Status im zugänglichen Namen.');
root.querySelector('form').dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));
await new Promise(r=>setTimeout(r,10));
assert.equal(root.querySelector('fieldset').disabled,false,'Autosave must not disable the next tap');
release();await c.idle();f.deps.journal.append=append;
assert.ok(root.querySelector('[data-action="export-roster-pdf"]'),'Im Kader-Reiter fehlt der Button „Kader als PDF“.');
await click('export-roster-pdf');
assert.equal(rosterPdfPayload?.game?.away,'Gast','Der Kader-PDF-Export braucht die Spieldaten.');
assert.equal(rosterPdfPayload?.draft?.roster?.find(player=>player.id==='p0')?.gameStatus,'bench','Der Export muss die aktuelle, noch nicht gespeicherte Kaderauswahl verwenden.');
assert.match(root.querySelector('[role="status"]').textContent,/abgebrochen/i,'Ein abgebrochenes Teilen darf nicht als erfolgreicher Export gemeldet werden.');
for(const id of ['p1','p2','p3','p4'])root.querySelector(`[data-player-roster="${id}"][data-status="bench"]`).click();
root.querySelector('[data-action="show-lineup"]').click();
for(const id of ['p0','p1','p2','p3','p4'])root.querySelector(`[data-player-lineup="${id}"][data-status="starter"]`).click();
assert.match(root.querySelector('[data-role="selection-summary"]').textContent,/Kader\s+5.*Starting Five\s+5\/5/);
const role=root.querySelector('[data-player-role="p0"]');role.value='Ballhandler';role.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(root.querySelector('[data-player-role="p5"]').disabled,true);
await click('show-gameplan');assert.equal(c.getState().stage,'preparation');
assert.ok(root.querySelector('[data-action="show-roster"]'),'Der Kader-Reiter muss auch im Gameplan erreichbar bleiben.');
assert.ok(root.querySelector('[data-action="show-lineup"]'),'Die Starting Five muss auch im Gameplan erreichbar bleiben.');
await click('show-lineup');assert.equal(c.getState().stage,'roster');assert.equal(root.querySelector('[data-role="lineup-panel"]').hidden,false,'Der Starting-Five-Reiter öffnet nicht direkt die Aufstellung.');
await click('show-gameplan');assert.equal(c.getState().stage,'preparation');
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
const directDom=new JSDOM('<main></main>',{url:'https://direct.test'});globalThis.document=directDom.window.document;globalThis.window=directDom.window;
const directFixture=await fixture(),directController=await directFixture.open(),directRoot=document.querySelector('main');
let releaseDirect;const directAppend=directFixture.deps.journal.append;
directFixture.deps.journal.append=async(...args)=>{await new Promise(r=>{releaseDirect=r;});return directAppend(...args);};
const preparing=prepareMatchdayEntry(directController,'home');
await new Promise(r=>setTimeout(r,10));
assert.equal(directController.getState().stage,'game','Während des blockierten Speicherns darf noch kein bedienbarer Kader-Draft entstehen.');
assert.equal(directRoot.children.length,0,'Vor dem abgeschlossenen Direkteinstieg darf keine alte Spielansicht gemountet werden.');
releaseDirect();await preparing;
const directCleanup=mountMatchdayView(directRoot,directController,{players:()=>directFixture.roster,prepareRosterPdf:async()=>{}});
assert.equal(directController.getState().stage,'roster','Ein bekanntes Heimspiel muss direkt Kader und Starting Five öffnen.');
assert.ok(directRoot.querySelector('[data-role="selection-summary"]'));
directCleanup();await directController.close();directDom.window.close();
console.log('Matchday UI: player status, roles, tactic groups, optional notes, focus, retry and start passed.');
