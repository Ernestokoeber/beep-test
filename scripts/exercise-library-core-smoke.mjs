import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<main id="app"></main>',{url:'https://training.test',runScripts:'outside-only'}),w=dom.window;
w.BT={util:{escapeHTML:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;')},storage:{getDrills:()=>[],getSetting:()=>[]}};
for(const file of ['exercise-catalog-data','exercise-library-core','exercise-catalog'])w.eval(readFileSync('js/'+file+'.js','utf8'));
try{
  const C=w.BT.exerciseCatalog,core=w.BT.exerciseLibraryCore;
  assert.equal(core.length,400);assert.equal(new Set(core.map(r=>r.id)).size,400);assert.equal(new Set(core.map(r=>r.name)).size,400);
  assert.equal(C.all().length,800,'Legacy variants remain accessible without changing their IDs');
  assert.equal(C.filter(C.all(),{entryKind:'exercise'}).length,400);
  assert.equal(C.filter(C.all(),{entryKind:'variant'}).length,400);
  assert.equal(C.filter(C.all(),{reviewStatus:'approved'}).length,0,'Unreviewed catalog entries must not claim coach approval');
  for(const row of core){
    assert(row.goal&&row.setup&&row.steps.length>=3&&row.successIndicator&&row.easier&&row.harder,row.id);
    assert(row.playersMin===row.playersMax&&Number.isInteger(row.helpersMin)&&row.helpersMin>=0,row.id);
    const e=C.individualExercise(row);assert(e.repetitions.instruction.length<=2000,row.id+' exceeds the plan field limit');
  }
  const solo=C.filter(core,{tags:['dribbling'],players:'1',helpers:'0',equipment:'no-basket',minutes:'10'});
  assert(solo.length);assert(solo.every(r=>r.playersMin===1&&r.helpersMin===0&&!r.equipment.includes('Korb')));
  assert(C.filter(core,{tags:['post','footwork'],tagMode:'all'}).every(r=>r.tags.includes('post')&&r.tags.includes('footwork')));
  const archived={...core[0],reviewStatus:'archived'};assert.equal(C.filter([archived]).length,0);assert.equal(C.filter([archived],{reviewStatus:'archived'}).length,1);
  C.mountBrowser(w.document.querySelector('main'));const select=w.document.querySelector('[name=reviewStatus]');assert.deepEqual([...select.options].map(x=>x.value),['','draft','review','approved','archived']);
  C.mountBrowser(w.document.querySelector('main'),{initial:{tags:[],tagMode:'any'}});assert.equal(w.document.querySelector('.exercise-filter-options').open,false,'Empty saved tags must not expand filters after reload');
  C.mountBrowser(w.document.querySelector('main'),{initial:{tags:['post'],tagMode:'all'}});assert.equal(w.document.querySelector('.exercise-filter-options').open,true,'Selected competency filters remain visible');
  console.log('400 core concepts and 400 legacy variants: counts, distinct IDs/titles, complete cards, plan limits, helpers, compound tags and explicit editorial status passed.');
}finally{w.close();}
