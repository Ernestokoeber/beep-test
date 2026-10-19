import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(status='attended') {
  const dom=new JSDOM('<main id="app"></main>',{url:'https://coach.test/#/individual',runScripts:'outside-only'});
  const w=dom.window, sent=[]; let time=Date.parse('2026-10-19T18:15:00Z'), fail=false, hold=false, release, reject;
  w.Date.now=()=>time;
  const data={role:'coach',profiles:[{id:'p1',player_profile_id:'thomas'},{id:'p2',player_profile_id:'adnan'},{id:'p3',player_profile_id:'other'}],
    sessions:[{id:'shared',individual_profile_id:'p1',scheduled_for:'2026-10-19T18:15:00Z',unit_number:1,status:'planned',attendance_status:'attended'},
      {id:'shared',individual_profile_id:'p2',scheduled_for:'2026-10-19T18:15:00Z',unit_number:1,status:'planned',attendance_status:status},
      {id:'different',individual_profile_id:'p3',scheduled_for:'2026-10-19T18:15:00Z',unit_number:1,status:'planned',attendance_status:'attended'}],
    plans:[{id:'plan1',session_id:'shared',individual_profile_id:'p1',title:'Thomas Plan',objective:'Ballkontrolle'},
      {id:'plan2',session_id:'shared',individual_profile_id:'p2',title:'Adnan Plan',objective:'Positionierung'}],
    exercises:[{id:'t1',session_id:'shared',individual_profile_id:'p1',position:1,title:'Thomas Ballkontrolle',duration_minutes:10,repetitions:{sets:3},measurement_method:{},coaching_cues:['Kopf oben']},
      {id:'a1',session_id:'shared',individual_profile_id:'p2',position:1,title:'Adnan Positionierung',duration_minutes:12,repetitions:{sets:2},measurement_method:{},coaching_cues:['Position halten']},
      {id:'t2',session_id:'shared',individual_profile_id:'p1',position:2,title:'Wurf',duration_minutes:10,coaching_cues:[]},
      {id:'a2',session_id:'shared',individual_profile_id:'p2',position:2,title:'Wurf',duration_minutes:10,coaching_cues:[]}],
    readiness:[],focuses:[],feedback:[],releasedFeedback:[],coachNotes:[],aiDrafts:[],measurements:[],pilotRoadmap:[]};
  w.BT={util:{escapeHTML:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},
    sync:{getState:()=>({user:{id:'coach',role:'coach',displayName:'Ernesto'}})},
    storage:{getPlayers:()=>[{id:'thomas',name:'Thomas'},{id:'adnan',name:'Adnan'},{id:'other',name:'Nicht in dieser Einheit'}]},
    api:{getIndividualOverview:async()=>data,individualAction:async(action,payload)=>{
      sent.push({action,payload:structuredClone(payload)});
      if(hold && action==='saveMeasurement')await new Promise((resolve,fail)=>{release=resolve;reject=fail;});
      if(fail && action==='completeLiveSession')throw new Error('Netzwerk unterbrochen');
      return {};
    }}
  };
  for(const name of ['individual-copy','individual-player-view','individual-live','individual-training']){
    const path=new URL(`../js/${name}.js`,import.meta.url);if(existsSync(path))w.eval(readFileSync(path,'utf8'));
  }
  const app=w.document.querySelector('main');
  const open=async(id='p1')=>{await w.BT.individualTraining.render(app,id,'training');app.querySelector('[data-action="start-live-training"]').click();await turn();};
  return {w,dom,data,sent,app,open,advance:ms=>{time+=ms;},fail:value=>{fail=value;},hold:()=>{hold=true;},release:()=>release(),reject:()=>reject(new Error('Messung nicht gespeichert'))};
}
const f=setup();await f.open();
assert.equal(f.app.querySelectorAll('[data-live-player]').length,2,'Live-Einheit muss beide Spieler zeigen');
assert(!f.app.textContent.includes('Nicht in dieser Einheit'));
assert(f.app.textContent.includes('Thomas Ballkontrolle') && f.app.textContent.includes('Adnan Positionierung'));
const panel=id=>f.app.querySelector(`[data-live-player="${id}"]`);
assert.equal(f.app.querySelectorAll('[data-live-toggle]').length,1,'Nur eine gemeinsame Uhr');
f.app.querySelector('[data-live-toggle]').click();await turn();f.advance(65000);
panel('p1').querySelector('[data-live-note]').value='Thomas privat';panel('p1').querySelector('[data-live-note]').dispatchEvent(new f.w.Event('input'));
panel('p2').querySelector('[data-live-note]').value='Adnan privat';panel('p2').querySelector('[data-live-note]').dispatchEvent(new f.w.Event('input'));
panel('p1').querySelector('[data-live-rating="Funktioniert"]').click();
assert.equal(panel('p2').querySelector('[data-live-note]').value,'Adnan privat','Neuzeichnen verliert fremde Spielereingabe');
const form=panel('p2').querySelector('[data-live-measurement]');
form.elements.value.value='7';form.elements.value.dispatchEvent(new f.w.Event('input',{bubbles:true}));
f.app.querySelector('[data-live-next]').click();f.app.querySelector('[data-live-prev]').click();
assert.equal(panel('p2').querySelector('[data-live-measurement]').elements.value.value,'7','Blockwechsel muss ungesendete Messungen behalten');
await f.open('p2');
assert.equal(panel('p1').querySelector('[data-live-note]').value,'Thomas privat','Einstieg über anderen Spieler verliert gemeinsamen Zustand');
assert.equal(panel('p2').querySelector('[data-live-note]').value,'Adnan privat');
assert.equal(f.app.querySelector('[data-live-total-clock]').textContent,'01:05','Uhr muss über Profilwechsel erhalten bleiben');
f.app.querySelector('[data-live-toggle]').click();await turn();f.advance(5000);f.app.querySelector('[data-live-toggle]').click();
assert.equal(f.app.querySelector('[data-live-total-clock]').textContent,'01:10');
const unsaved=panel('p2').querySelector('[data-live-measurement]');unsaved.elements.value.value='';unsaved.elements.value.dispatchEvent(new f.w.Event('input',{bubbles:true}));
f.fail(true);f.app.querySelector('[data-live-finish]').click();await turn();
assert(f.app.textContent.includes('Netzwerk unterbrochen'));
assert.equal(panel('p1').querySelector('[data-live-note]').value,'Thomas privat');
assert.equal(f.app.querySelector('[data-live-finish]').disabled,false,'Fehlgeschlagener Abschluss muss wiederholbar bleiben');
f.fail(false);f.app.querySelector('[data-live-finish]').click();f.app.querySelector('[data-live-finish]').click();await turn();await turn();
const finishes=f.sent.filter(x=>x.action==='completeLiveSession');
assert.equal(finishes.length,2,'Ein fehlgeschlagener und genau ein erfolgreicher Abschluss');
assert.equal(f.sent.filter(x=>x.action==='completeSession').length,0,'Kein separater Abschluss je Spieler');
assert.deepEqual(finishes[1].payload.documents.map(d=>[d.profileId,d.exercises[0].exerciseId,d.exercises[0].seconds,d.exercises[0].note]),[['p1','t1',70,'Thomas privat'],['p2','a1',70,'Adnan privat']]);
assert(!Array.from({length:f.w.localStorage.length},(_,i)=>f.w.localStorage.key(i)).some(k=>k.startsWith('courthub_individual_live:')),'Erfolgreicher Abschluss räumt Liveentwurf auf');
f.w.BT.individualTraining.cleanup();f.dom.window.close();

const solo=setup('declined');await solo.open();
assert.equal(solo.app.querySelector('[data-live-player="p2"] [data-live-measurement]'),null,'Abgesagter Spieler bekommt kein Ergebnisformular');
assert.equal(solo.app.querySelector('[data-live-player="p2"] [data-live-note]'),null);
solo.app.querySelector('[data-live-finish]').click();await turn();await turn();
assert.deepEqual(solo.sent.find(x=>x.action==='completeLiveSession').payload.documents.map(d=>d.profileId),['p1']);
solo.w.BT.individualTraining.cleanup();solo.dom.window.close();

const saving=setup();await saving.open();saving.hold();
let savingForm=saving.app.querySelector('[data-live-player="p1"] [data-live-measurement]');
savingForm.elements.value.value='5';savingForm.dispatchEvent(new saving.w.Event('submit',{bubbles:true,cancelable:true}));await turn();
assert.equal(savingForm.elements.value.disabled,true,'Laufendes Speichern muss das gesendete Feld gegen weitere Änderungen schützen');
saving.app.querySelector('[data-live-player="p2"] [data-live-rating="Problem"]').click();
savingForm=saving.app.querySelector('[data-live-player="p1"] [data-live-measurement]');
assert.equal(savingForm.elements.value.disabled,true,'Neuzeichnen darf laufendes Speichern nicht entsperren');
await saving.open('p2');
saving.app.querySelector('[data-live-player="p2"] [data-live-note]').value='Neue Notiz';
saving.app.querySelector('[data-live-player="p2"] [data-live-note]').dispatchEvent(new saving.w.Event('input'));
assert.equal(saving.app.querySelector('[data-live-player="p1"] [data-live-measurement]').elements.value.disabled,true,'Profilwechsel muss laufenden Speicherstatus erhalten');
saving.release();await turn();
assert.equal(saving.app.querySelector('[data-live-player="p1"] [data-live-measurement]').elements.value.value,'','Erfolgsantwort muss das aktuelle Formular aktualisieren');
assert.equal(saving.app.querySelector('[data-live-player="p2"] [data-live-note]').value,'Neue Notiz','Späte Antwort darf neuere Notizen nicht überschreiben');
assert(saving.app.querySelector('[data-live-player="p1"] .individual-live-results').textContent.includes('5'),'Gespeicherter Wert muss nach Leeren des Formulars sichtbar bleiben');
await saving.open('p1');
assert(saving.app.querySelector('[data-live-player="p1"] .individual-live-results').textContent.includes('5'),'Profilwechsel darf das gespeicherte Ergebnis nicht verstecken');
saving.app.querySelector('[data-live-next]').click();saving.app.querySelector('[data-live-toggle]').click();await turn();saving.advance(10000);
saving.app.querySelector('[data-live-next]').click();saving.advance(10000);
assert.equal(saving.app.querySelector('[data-live-block-clock]').textContent,'00:10','Abschließen des letzten Blocks muss dessen Uhr stoppen');
saving.w.BT.individualTraining.cleanup();saving.dom.window.close();

const retry=setup();await retry.open();retry.hold();
let retryForm=retry.app.querySelector('[data-live-player="p1"] [data-live-measurement]');retryForm.elements.value.value='6';
retryForm.dispatchEvent(new retry.w.Event('submit',{bubbles:true,cancelable:true}));await turn();retry.reject();await turn();
assert(retry.app.textContent.includes('Messung nicht gespeichert'),'Fehler muss nach Neuzeichnen sichtbar bleiben');
assert.equal(retry.app.querySelector('[data-live-player="p1"] [data-live-measurement]').elements.value.value,'6');
retry.w.BT.individualTraining.cleanup();retry.dom.window.close();

const caughtUp=setup();await caughtUp.open();
caughtUp.app.querySelector('[data-live-adjust="300"]').click();
assert(caughtUp.app.querySelector('.individual-live-kicker').textContent.includes('17 Min.'),'Zeitkorrektur wirkt auf gemeinsamen Block');
caughtUp.app.querySelector('[data-live-skip]').click();caughtUp.app.querySelector('[data-live-prev]').click();
caughtUp.app.querySelector('[data-live-toggle]').click();await turn();caughtUp.advance(61000);
caughtUp.app.querySelector('[data-live-player="p1"] [data-live-note]').value='Nachgeholt';caughtUp.app.querySelector('[data-live-player="p1"] [data-live-note]').dispatchEvent(new caughtUp.w.Event('input'));
caughtUp.app.querySelector('[data-live-next]').click();caughtUp.app.querySelector('[data-live-finish]').click();await turn();await turn();
const completedBlock=caughtUp.sent.find(x=>x.action==='completeLiveSession').payload.documents[0].exercises.find(e=>e.exerciseId==='t1');
assert.equal(completedBlock.seconds,61);assert.equal(completedBlock.note,'Nachgeholt','Nachgeholte übersprungene Übung darf nicht verschwinden');
caughtUp.w.BT.individualTraining.cleanup();caughtUp.dom.window.close();

const partiallyDone=setup();await partiallyDone.open();
const partialNote=partiallyDone.app.querySelector('[data-live-player="p1"] [data-live-note]');partialNote.value='Abgebrochen, erneut prüfen';partialNote.dispatchEvent(new partiallyDone.w.Event('input'));
partiallyDone.app.querySelector('[data-live-skip]').click();partiallyDone.app.querySelector('[data-live-finish]').click();await turn();await turn();
assert.equal(partiallyDone.sent.find(x=>x.action==='completeLiveSession').payload.documents[0].exercises.find(e=>e.exerciseId==='t1')?.note,'Abgebrochen, erneut prüfen','Überspringen darf bereits dokumentierte Beobachtungen nicht verwerfen');
partiallyDone.w.BT.individualTraining.cleanup();partiallyDone.dom.window.close();

const loggingOut=setup();await loggingOut.open();loggingOut.hold();
const logoutForm=loggingOut.app.querySelector('[data-live-player="p1"] [data-live-measurement]');logoutForm.elements.value.value='5';logoutForm.dispatchEvent(new loggingOut.w.Event('submit',{bubbles:true,cancelable:true}));await turn();
loggingOut.w.BT.individualTraining.clearLocalData();loggingOut.release();await turn();
assert.equal(loggingOut.w.localStorage.length,0,'Späte Antwort darf nach Abmeldung keinen persönlichen Cache wiederherstellen');
loggingOut.dom.window.close();
console.log('Gemeinsame Liveansicht: zwei Spieler, eine Uhr, persönliche Dokumentation, Wiederaufnahme und Fehlererhalt geprüft.');
