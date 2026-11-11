import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {IDBFactory,IDBDatabase} from 'fake-indexeddb';

const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://coach.test/#/drills',runScripts:'outside-only'}),w=dom.window;
w.indexedDB=new IDBFactory();const states=new Map();let user={id:'catalog-coach',role:'coach',organization:{id:'a'}};
w.BT={sync:{getState:()=>({user})},navigation:{getState:()=>states.get(w.location.hash)||{},setState:p=>states.set(w.location.hash,{...states.get(w.location.hash),...p}),replace:hash=>w.location.hash=hash,back:hash=>w.location.hash=hash}};
for(const f of ['util','storage','exercise-catalog-data','exercise-catalog','drills','library-pages','training-pages','individual-plan-editor'])w.eval(readFileSync('js/'+f+'.js','utf8'));
const B=w.BT,C=B.exerciseCatalog,host=w.document.querySelector('#app'),tick=()=>new Promise(r=>setTimeout(r,20));
const render=path=>{w.location.hash='#/drills'+(path?'/'+path:'');host.replaceChildren();B.libraryPages.render(host,'drills',path||'');};
const change=(name,value,type='input')=>{const el=host.querySelector('[name="'+name+'"]');el.value=value;el.dispatchEvent(new w.Event(type,{bubbles:true}));};
const transaction=IDBDatabase.prototype.transaction;
try {
 await B.storage.ready();
 assert.equal(C.all().length,400);assert.equal(B.storage.getDrills().length,0,'Bundled content must not pollute or overwrite user workspaces');
 const rows=C.all();assert.equal(new Set(rows.map(r=>r.id)).size,400);assert.equal(new Set(rows.map(r=>r.name)).size,400);
 assert.equal(new Set(rows.map(r=>r.familyId)).size,100);assert.equal(new Set(rows.map(r=>r.category)).size,20);
 for(const row of rows) {
  assert(row.goal.length>15 && row.setup.length>20 && row.steps.length>=3,row.id);
  assert(row.steps.every(x=>x.length>=10) && C.describe(row).length>300,row.id);assert(row.coachingPoints.length>=2,row.id);
  assert(row.successIndicator.length>20 && row.repetitions.length>10 && row.easier && row.harder,row.id);
  assert(row.playersMin>=1 && row.playersMax>=row.playersMin && row.playersMax<=20,row.id);
  assert(C.levels.includes(row.level) && row.equipment.length,row.id);
  const e=C.individualExercise(row);assert(e.title.length<=200 && e.repetitions.instruction.length<=2000 && e.measurement_method.instruction.length<=2000 && e.coaching_cues.join('\n').length<=1000,'Catalog must fit the real individual-plan API limits: '+row.id);
 }
 assert.equal(C.filter(rows,{players:'1'}).length,115);assert.equal(C.filter(rows,{players:'2'}).length,254);
 assert(C.filter(rows,{search:'fuhrhand'}).length>0,'Search tolerates umlaut input');
 assert(C.filter(rows,{search:'Ballverlust Koerbe'}).length===0,'All search terms must match');
 assert(C.filter(rows,{equipment:'no-basket'}).every(r=>!r.equipment.includes('Korb')));
 assert(C.filter(rows,{players:'2',level:'Grundlagen',minutes:'8'}).every(r=>r.playersMin<=2&&r.playersMax>=2&&r.level==='Grundlagen'&&r.minutes<=8));
 const source=rows.find(r=>r.familyId==='form-shot'),before=JSON.stringify(C.get(source.id));
 const independent=C.planDrill(source);independent.name='Planänderung';assert.equal(JSON.stringify(C.get(source.id)),before);
 render();assert.equal(host.querySelectorAll('[data-library-item]').length,40);host.querySelector('[data-library-more]').click();assert.equal(host.querySelectorAll('[data-library-item]').length,80);
 change('search','Nahwurf-Technik');assert.equal(host.querySelectorAll('[data-library-item]').length,4);
 host.querySelector('[data-favorite]').click();await B.storage.flush();await tick();assert.equal(B.storage.getSetting('exerciseFavorites').length,1);
 change('source','favorites','change');assert.equal(host.querySelectorAll('[data-library-item]').length,1);
 render(source.id);assert(host.querySelector('[data-catalog-copy]'));assert.equal(host.querySelectorAll('a[href^="#/drills/catalog-"]').length,3);
 render(source.id+'/edit');assert(!host.querySelector('form'),'Bundled originals are immutable');
 host.querySelector('[data-catalog-copy]').click();await B.storage.flush();await tick();assert.equal(B.storage.getDrills().length,1);
 const copy=B.storage.getDrills()[0];assert.notEqual(copy.id,source.id);render(copy.id+'/edit');
 change('name','Meine Nahwurf-Variante');change('description','Eigener Ablauf ohne fremde Notizen');change('playersMin','1');change('playersMax','2');change('coachingPoints','Meine Führhand bleibt ruhig');
 host.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await B.storage.flush();await tick();
 assert.equal(B.storage.getDrill(copy.id).name,'Meine Nahwurf-Variante');assert(C.describe(B.storage.getDrill(copy.id)).includes('Meine Führhand bleibt ruhig'));assert.equal(JSON.stringify(C.get(source.id)),before);
 render();assert.equal(host.querySelector('[name=search]').value,'Nahwurf-Technik','Search survives detail/editor navigation');
 host.querySelector('[data-clear-filters]').click();change('source','own','change');assert.equal(host.querySelectorAll('[data-library-item]').length,1);
 const unsafe=B.storage.upsertDrill({name:'<img src=x onerror=alert(1)>',description:'<script>bad()</script>',minutes:5});await B.storage.flush();render(unsafe.id);assert.equal(host.querySelectorAll('img,script').length,0,'Custom drill text must be escaped');
 user={...user,role:'viewer'};render(source.id);assert(!host.querySelector('[data-catalog-copy]'));render();assert(!host.querySelector('[data-favorite]'));user={...user,role:'coach'};
 // Real plan editor: selection -> independent editable row -> existing API payload.
 w.location.hash='#/individual/player/p/training';host.replaceChildren();let savedPayload;
 B.api={individualAction:async(action,body)=>{assert.equal(action,'saveSessionPlan');savedPayload=body;}};
 B.individualPlanEditor.mount(host,{profile:{id:'p'},session:{id:'s',status:'planned'},plan:{id:'plan',title:'Plan',objective:'Sauber werfen',version:1},exercises:[],measurements:[],refresh:async()=>{}});
 host.querySelector('[data-open-exercise-catalog]').click();change('search',source.name);
 const search=host.querySelector('[data-catalog-browser] [name=search]'),enter=new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});search.dispatchEvent(enter);assert(enter.defaultPrevented,'Search Enter must not save the whole training plan');
 host.querySelector('[data-catalog-pick]').click();await tick();
 assert.equal(host.querySelectorAll('[data-review-exercises] fieldset').length,1);const row=host.querySelector('[data-review-exercises] fieldset');
 assert.equal(row.querySelector('[name=exerciseTitle]').value,source.name);assert(row.querySelector('[name=repetitions]').value.includes(source.setup));
 row.querySelector('[name=minutes]').value='12';row.querySelector('[name=observation]').value='PRIVATE-SHOULD-NEVER-ENTER-LIBRARY';
 row.querySelector('[data-save-review-library]').click();await B.storage.flush();await tick();
 assert(!JSON.stringify(B.storage.getDrills()).includes('PRIVATE-SHOULD-NEVER-ENTER-LIBRARY'));
 host.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(savedPayload.exercises[0].durationMinutes,'12');assert.equal(savedPayload.exercises[0].repetitions,C.individualExercise(source).repetitions.instruction);assert.equal(JSON.stringify(C.get(source.id)),before);
 // The same catalog produces team plans without copying library record IDs.
 const t=B.storage.upsertTraining({date:'2026-12-01',plan:{drills:[]}});await B.storage.flush();
 w.location.hash='#/training/'+t.id+'/plan/library';host.replaceChildren();B.trainingPages.render(host,t.id,'plan','library');change('search',source.name);host.querySelector('[data-catalog-pick]').click();await B.storage.flush();await tick();
 const drill=B.storage.getTraining(t.id).plan.drills[0];assert.notEqual(drill.id,source.id);assert.equal(drill.librarySourceId,source.id);assert(drill.description.includes(source.successIndicator));
 // A stale picker cannot write favorites into another user's workspace.
 render();const favoritesBefore=JSON.stringify(B.storage.getSetting('exerciseFavorites'));user={...user,id:'other'};host.querySelector('[data-favorite]').click();await tick();assert.equal(JSON.stringify(B.storage.getSetting('exerciseFavorites')),favoritesBefore);user={...user,id:'catalog-coach'};
 // A real IndexedDB failure must not create a false successful saved copy.
 render(source.id);const count=B.storage.getDrills().length;w.console.error=()=>{};
 const setItem=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(k,v){if(k==='beepTest_v1')throw new w.DOMException('quota','QuotaExceededError');return setItem.call(this,k,v);};
 IDBDatabase.prototype.transaction=function(...args){const tx=transaction.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};
 host.querySelector('[data-catalog-copy]').click();await B.storage.flush().catch(()=>{});await tick();
 assert.equal(B.storage.getDrills().length,count);assert(host.querySelector('[data-library-status]').textContent.includes('fehlgeschlagen'));
 IDBDatabase.prototype.transaction=transaction;w.Storage.prototype.setItem=setItem;
 console.log('400 catalog variants: content/API bounds, filters, pagination, favorites, immutable templates, own copies, private-note exclusion, both plan integrations, roles, context changes and real storage failure verified.');
}finally{IDBDatabase.prototype.transaction=transaction;await B.storage.flush().catch(()=>{});w.close();}
