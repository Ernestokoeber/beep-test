import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {pilotSessionTemplate} from '../api/_lib/individual-pilot.js';
const dom=new JSDOM('<main></main>',{url:'https://coach.test',runScripts:'outside-only'}),w=dom.window;
w.BT={util:{escapeHTML:s=>String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;')}};
const path=new URL('../js/individual-copy.js',import.meta.url);if(existsSync(path))w.eval(readFileSync(path,'utf8'));
const copy=w.BT.individualCopy;assert(copy,'Gemeinsame verständliche Begriffe und Vorgaben fehlen');
assert.equal(copy.attendance('unexcused_no_show'),'Unentschuldigt gefehlt');assert.equal(copy.session('planned'),'Geplant');assert.equal(copy.draft('current'),'Bereit zur Prüfung');assert.equal(copy.session('foreign'),'Status unbekannt');
assert.equal(copy.metric('treffer_baseline_links'),'Treffer Grundlinie links');assert.equal(copy.metric('follow_through'),'Wurfbewegung ausschwingen');
assert.equal(copy.title('Check-in, Readiness und standardisierte Aktivierung'),'Ankommen, Tagesform und standardisierte Aktivierung');
assert.equal(copy.title('Piloteinheit 4 – Zwischenmessung'),'Einheit 4 – Zwischenmessung');
assert.equal(copy.cue('Private Coach-Notiz, Spielerfeedback und Wochenfokus getrennt speichern.'),'Private Trainernotiz, Rückmeldung für den Spieler und Wochenfokus getrennt speichern.');
assert.equal(copy.cue('Mein eigener Coaching-Hinweis bleibt erhalten.'),'Mein eigener Coaching-Hinweis bleibt erhalten.');
const details=copy.details({rightLayups:0,leftLayups:10,switchAfterEachPosition:true,metrics:['Treffer','Technik'],rules:'Eigene Vorgabe <b>erhalten</b>'});
assert.match(details,/Korbleger rechts: 0/);assert.match(details,/Korbleger links: 10/);assert.match(details,/Spielerwechsel nach jeder Position: Ja/);assert.match(details,/Eigene Vorgabe <b>erhalten<\/b>/);assert(!/[{}"]|rightLayups/.test(details));
assert.equal(copy.details('{"sets":3,"actionsPerSet":6}'),'Serien: 3 · Aktionen je Serie: 6');assert.equal(copy.details('Eigene Übung unverändert'),'Eigene Übung unverändert');assert.equal(copy.details({}),'Keine Vorgaben');
for(const n of [1,4,8])for(const e of pilotSessionTemplate(n).exercises){assert(!/[{}"]/.test(copy.details(e.repetitions)));assert(!/readinessScale|regularMeasuredRuns|switchAfterEachSet|totalAttempts/.test(copy.details(e.repetitions)));}
w.document.querySelector('main').innerHTML='<p>'+w.BT.util.escapeHTML(details)+'</p>';assert.equal(w.document.querySelector('main b'),null);assert(w.document.querySelector('main').textContent.includes('<b>erhalten</b>'));
dom.window.close();
for(const role of [null,'player','coach']){
  const accountDom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://coach.test',runScripts:'outside-only'}),aw=accountDom.window;
  let memberCalls=0;
  aw.BT={util:{renderTemplate:id=>aw.document.getElementById(id).content.firstElementChild.cloneNode(true),toast(){}},sync:{getState:()=>({user:role?{id:'test',role,displayName:'Test',email:'test@example.invalid'}:null,status:role?'synced':'guest',identitySource:'server',version:1})},api:{getMembers:async()=>{memberCalls++;return {members:[]};}}};
  aw.eval(readFileSync(new URL('../js/account.js',import.meta.url),'utf8'));
  const host=aw.document.createElement('main');aw.document.body.append(host);aw.BT.account.render(host);
  const intro=host.querySelector('.account-hero').textContent;
  assert(intro.includes(role==='player'?'Dein Spielerkonto':role==='coach'?'Dein Trainerkonto':'Dein Zugang zu CourtHub'));
  if(role==='player'){assert(!/Trainerteam|Team-Workspace/.test(intro));assert(host.querySelector('.team-members-card').hidden);assert.equal(memberCalls,0);}
  aw.BT.account.cleanup();accountDom.window.close();
}
console.log('Individualtexte: Statuswerte, Messwertnamen, lesbare Vorgaben, eigene Texte, HTML-Maskierung und Kontotexte je Rolle geprüft.');
