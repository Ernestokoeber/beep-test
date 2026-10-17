import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://coach.test/#/schedule?month=2026-10',runScripts:'outside-only'}),w=dom.window;
let saved={};w.BT={navigation:{getState:()=>saved,setState:patch=>Object.assign(saved,patch)},sync:{getState:()=>({user:{role:'coach'}})}};
for(const file of ['util','storage','coaching-staff','stats','games','team-strategy','season-ai-draft','seasonplanner','opponents','schedule','calendar'])w.eval(readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'));
w.BT.api={getToken:()=>null};
try{
 const BT=w.BT,host=w.document.createElement('main');host.id='app';w.document.body.append(host);
 BT.storage.upsertTraining({date:'2026-10-17',startTime:'18:00',attendance:[],note:'<img src=x>'});BT.storage.upsertGame({date:'2026-10-17',time:'20:00',home:'Lindau',away:'Gast'});
 const before=w.localStorage.getItem('beepTest_v1');BT.calendar.render(host);assert.equal(host.querySelectorAll('[data-calendar-event]').length,2);assert.equal(host.querySelector('img'),null);
 const search=host.querySelector('[data-calendar-search]');search.value='Gast';search.dispatchEvent(new w.Event('input'));assert.equal(host.querySelectorAll('[data-calendar-event]').length,1);search.focus();BT.calendar.refresh();assert.equal(w.document.activeElement.hasAttribute('data-calendar-search'),true);
 BT.calendar.cleanup();host.replaceChildren();saved={};w.location.hash='#/schedule/regular';BT.calendar.render(host);
 const monday=host.querySelector('.wd-btn[data-key="mon"]');monday.click();host.querySelector('[data-role="time"]').value='19:00';host.querySelector('[data-role="time"]').dispatchEvent(new w.Event('input',{bubbles:true}));
 BT.calendar.cleanup();host.replaceChildren();BT.calendar.render(host);assert.equal(host.querySelector('[data-role="time"]').value,'19:00');assert(host.querySelector('.wd-btn[data-key="mon"]').classList.contains('active'));
 assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Reading/drafting planning does not write schedule or team concept.');
 BT.calendar.cleanup();host.replaceChildren();saved={};w.location.hash='#/schedule/upcoming';BT.calendar.render(host);assert(host.querySelector('[data-role="regular-preview"]'));assert(host.querySelector('[data-create]'),'Regelmäßige Vorschläge bleiben anlegbar.');assert.equal(w.localStorage.getItem('beepTest_v1'),before);
 for(const pane of ['season','team-concept','import']){BT.calendar.cleanup();host.replaceChildren();saved={};w.location.hash='#/schedule/'+pane;BT.calendar.render(host);assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Opening '+pane+' is read-only.');}
 BT.calendar.cleanup();host.replaceChildren();saved={};w.BT.sync.getState=()=>({user:{role:'viewer'}});w.location.hash='#/schedule/regular';BT.calendar.render(host);assert([...host.querySelectorAll('[data-role="weekdays"] button')].every(b=>b.disabled));host.querySelector('[data-action="save-schedule"]').dispatchEvent(new w.Event('click'));assert.equal(w.localStorage.getItem('beepTest_v1'),before);
 BT.calendar.cleanup();host.replaceChildren();saved={};w.location.hash='#/schedule/upcoming';BT.calendar.render(host);const create=host.querySelector('[data-create]');assert(create.disabled);create.dispatchEvent(new w.Event('click'));assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Lesezugriff darf keine Terminvorschläge anlegen.');
 BT.calendar.cleanup();host.replaceChildren();saved={};BT.sync.getState=()=>({user:{role:'coach'}});w.location.hash='#/schedule/season';BT.calendar.render(host);
 const goal=host.querySelector('[data-role="season-goal"]');goal.value='Neues Saisonziel';goal.dispatchEvent(new w.Event('input',{bubbles:true}));assert(!Object.keys(saved.draft.fields).some(key=>/strategy|defense:|tactic:/.test(key)),'Saisonentwürfe dürfen kein unsichtbares Teamkonzept enthalten.');
 const strategy=BT.teamStrategy.save({...BT.teamStrategy.current(),offensePrinciples:'Neues verbindliches Konzept'});
 BT.wake={acquire(){},release(){}};BT.api={getToken:()=>true,syncWebsiteGames:async()=>{throw new Error('Test-Sync abgebrochen');}};w.console.error=()=>{};
 host.querySelector('[data-action="generate-season"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(BT.teamStrategy.current().offensePrinciples,strategy.offensePrinciples,'Saisonplanung darf ein zwischenzeitlich aktualisiertes Teamkonzept nicht aus unsichtbaren Feldern überschreiben.');
 saved.draft.fields['strategy-offense']='Alter unsichtbarer Entwurf';BT.calendar.cleanup();host.replaceChildren();BT.calendar.render(host);assert.equal(host.querySelector('[data-role="strategy-offense"]').value,strategy.offensePrinciples,'Alte Entwürfe dürfen versteckte Konzeptfelder nicht wiederherstellen.');
 console.log('Kalender-UI: Agenda, sichere Texte, Filter, Fokus, Planungsseiten, Entwürfe, Datenerhalt und Lesezugriff geprüft.');
}finally{w.BT.calendar?.cleanup();dom.window.close();}
