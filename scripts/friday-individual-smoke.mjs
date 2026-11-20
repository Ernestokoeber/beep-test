import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<main></main>',{url:'https://coach.test/#/friday-individual',runScripts:'outside-only'}),w=dom.window;
const states=new Map();
w.BT={util:{escapeHTML:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},
  navigation:{getState:()=>states.get(w.location.hash)||{},setState:patch=>states.set(w.location.hash,{...states.get(w.location.hash),...patch})},
  storage:new Proxy({},{get:()=>()=>{throw Error('Friday browsing must not access or mutate plans or workspace data');}})};
for(const file of ['friday-position-exercises','friday-individual'])w.eval(readFileSync('js/'+file+'.js','utf8'));
const rows=w.BT.fridayPositionExercises,F=w.BT.fridayIndividual,host=w.document.querySelector('main');
try {
  assert.equal(rows.length,500);assert.equal(new Set(rows.map(r=>r.id)).size,500);assert.equal(new Set(rows.map(r=>r.name)).size,500);
  for(const [position] of F.positions) {
    const group=F.filter({position});assert.equal(group.length,100);
    assert.equal(new Set(group.map(r=>r.familyId)).size,20);
    for(const task of F.tasks)assert.equal(F.filter({position,task}).length,20);
    for(const family of new Set(group.map(r=>r.familyId))) {
      const tasks=group.filter(r=>r.familyId===family);
      assert.equal(tasks.length,5);assert.equal(new Set(tasks.map(r=>r.learningTask)).size,5);
      assert.equal(new Set(tasks.map(r=>r.task)).size,5);
    }
  }
  for(const row of rows) {
    assert(row.goal.length>30 && row.setup.length>50 && row.learningTask.length>80,row.id);
    assert.equal(row.technicalSteps.length,4,row.id);assert(row.technicalSteps.every(step=>step.length>40),row.id);
    assert(row.steps.length>=4 && row.coachingPoints.length>=3 && row.commonMistakes.length>=3,row.id);
    assert(row.easier && row.harder && row.repetitions.includes('Pause') && row.successIndicator,row.id);
    assert(row.playersMin>=1 && row.playersMax===row.playersMin && row.playersMax<=5,row.id);
    assert.equal(row.helpersMin,0);assert.equal(row.reviewStatus,'review');
    if(['Anschluss verbinden','Spielanwendung'].includes(row.task))assert(row.setup.includes('Zusätzlich spielt'),row.id);
  }
  assert.equal(F.filter({position:'pg',task:'Konter finden'}).length,20);
  assert(F.filter({search:'fuhrung'}).length>0);assert.equal(F.filter({search:'nichtvorhandenerSuchbegriff'}).length,0);
  assert(F.filter({players:'1'}).every(r=>r.solo));assert(F.filter({position:'c',search:'Drop-Step'}).length>0);
  F.render(host,'#/friday-individual/exercises');assert.equal(host.querySelector('h2').textContent,'Freitag individual');
  assert.equal(host.querySelectorAll('[data-friday-item]').length,20);
  assert.equal(host.querySelectorAll('[aria-label="Position auswählen"] a').length,6);
  host.querySelector('[data-friday-more]').click();assert.equal(host.querySelectorAll('[data-friday-item]').length,40);
  const change=(name,value)=>{const el=host.querySelector('[name='+name+']');el.value=value;el.dispatchEvent(new w.Event(name==='search'?'input':'change'));};
  change('search','unauffindbar');assert.equal(host.querySelectorAll('[data-friday-item]').length,0);
  host.querySelector('[data-friday-reset]').click();assert.equal(host.querySelectorAll('[data-friday-item]').length,20);
  w.location.hash='#/friday-individual?position=c';F.render(host);
  assert(host.querySelector('[data-friday-count]').textContent.includes('100 Übungen für Center'));
  change('task','Konter finden');assert.equal(host.querySelectorAll('[data-friday-item]').length,20);
  const row=F.filter({position:'c',task:'Konter finden'})[0];
  F.render(host,'#/friday-individual/move/'+row.id);
  for(const heading of ['So funktioniert der Grundmove','So läuft diese Übung','Verteidigung lesen','Häufige Fehler','Umfang & Pausen','Daran erkennst du Fortschritt'])assert([...host.querySelectorAll('h3')].some(h=>h.textContent===heading),heading);
  assert.equal(host.querySelectorAll('.friday-task-links a').length,4);
  assert(host.querySelector('a[href="#/friday-individual?position=c"]'));
  F.render(host,'#/friday-individual/move/%E0%A4%A');assert(host.textContent.includes('Übung nicht gefunden'));
  const first=rows[0],original=first.familyName;first.familyName='<img src=x onerror=alert(1)>';
  F.render(host,'#/friday-individual/move/'+first.id);assert.equal(host.querySelectorAll('img,script').length,0);first.familyName=original;
  const index=readFileSync('index.html','utf8'),sw=readFileSync('sw.js','utf8'),app=readFileSync('js/app.js','utf8');
  for(const asset of ['js/friday-position-exercises.js','js/friday-individual.js','friday-individual.css']){assert(index.includes(asset));assert(sw.includes(asset));}
  assert(app.includes('BT.fridayIndividual.render(app, hash)'));assert(readFileSync('js/individual-training.js','utf8').includes('data-workspace="friday-individual"'));
  assert.equal(w.BT.exerciseLibraryCore,undefined);assert.equal(w.BT.exerciseCatalogSeed,undefined);
  console.log('Freitag individual: 500 cards, 100 per role, 20 families × 5 distinct tasks, complete instructions, staffing, filters, navigation, escaping, independent data and offline manifest passed.');
} finally {w.close();}
