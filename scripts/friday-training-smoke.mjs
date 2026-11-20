import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
const dom=new JSDOM('<main></main>',{url:'https://coach.test/#/friday-individual',runScripts:'outside-only'}),w=dom.window;
w.indexedDB=new IDBFactory();let user={id:'coach',role:'coach',organization:{id:'club'}};
w.BT={sync:{getState:()=>({user})},navigation:{getState:()=>({}),setState(){}}};
for(const file of ['util','storage','coaching-staff','friday-position-exercises','friday-individual','friday-training'])w.eval(readFileSync('js/'+file+'.js','utf8'));
const B=w.BT,F=B.fridayTraining,host=w.document.querySelector('main'),clone=x=>JSON.parse(JSON.stringify(x));
const fixturePlayers=Array.from({length:11},(_,i)=>({id:'p'+i,name:'Spieler '+i,position:['PG','Shooting Guard','SF','Power Forward','Center'][i%5]}));
const fixture=count=>({id:'friday',date:'2026-11-20',attendance:fixturePlayers.map((p,i)=>({playerId:p.id,status:i<count?'present':'absent'}))});
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
try {
  for(const [count,mode]of [[0,'pending'],[1,'individual'],[9,'individual'],[10,'team'],[11,'team']])assert.equal(F.assess(fixture(count),fixturePlayers).mode,mode);
  assert.equal(F.assess({...fixture(9),date:'2026-11-19'},fixturePlayers).mode,'other-day');
  assert(!F.isFriday('invalid'));assert(F.isFriday('2026-11-20'));
  for(const position of ['PG','SG','SF','PF','C']){
    const t={date:'2026-11-20',attendance:[{playerId:'solo',status:'present'}]};
    const report=F.assess(t,[{id:'solo',position}]);assert.equal(report.members[0].exercises.length,3,position+' must have three genuinely solo tasks');
    assert(report.members[0].exercises.every(r=>r.playersMin===1&&r.primaryPosition===position.toLowerCase()));
  }
  const small=F.assess(fixture(9),fixturePlayers);assert.equal(small.count,9);
  for(const member of small.members){assert.equal(member.exercises.length,3);assert.equal(new Set(member.exercises.map(r=>r.familyId)).size,3);assert(member.exercises.every(r=>r.primaryPosition===member.position&&r.playersMin<=9));}
  assert.deepEqual(clone(F.assess(fixture(9),fixturePlayers)),clone(small),'Repeated reads must not reshuffle the instructions');
  const coach=fixture(9);coach.staff=[{playerId:'p0',alsoPlayer:false}];assert.equal(F.assess(coach,fixturePlayers).count,8);coach.staff[0].alsoPlayer=true;assert.equal(F.assess(coach,fixturePlayers).count,9);
  coach.attendance.push({playerId:'p1',status:'present'});assert.equal(F.assess(coach,fixturePlayers).count,9,'Duplicate attendance must not inflate the threshold');
  const multi=[{id:'p0',position:'PG/SG'}];assert.equal(F.assess(fixture(1),multi).members[0].position,null);
  assert.equal(F.assess(fixture(1),[{id:'p0',position:'Guard'}]).members[0].position,null,'An ambiguous Guard role must not be guessed');
  assert.equal(F.assess(fixture(1),[{id:'p0',position:'Power Forward'}]).members[0].position,'pf');
  const late=fixture(1);late.attendance[0].late=true;assert.equal(F.assess(late,fixturePlayers).count,1);
  await B.storage.ready();
  const people=fixturePlayers.slice(0,10).map(p=>B.storage.upsertPlayer({name:p.name,position:p.position}));
  const training=B.storage.upsertTraining({date:'2026-11-20',attendance:people.map((p,i)=>({playerId:p.id,status:i<9?'present':'absent',late:false,note:'Keep note'})),plan:{summary:'Manual plan',drills:[{id:'manual',name:'Keep this',minutes:20}]},freethrows:[{playerId:people[0].id,made:3,attempts:5}]});
  await B.storage.flush();const originalPlan=JSON.stringify(training.plan),originalStats=JSON.stringify(training.freethrows);
  w.location.hash=F.url(training.id);F.render(host,training.id);assert.equal(host.querySelectorAll('[data-friday-player]').length,9);
  const change=async(selector,value)=>{const control=host.querySelector(selector);control.value=value;control.dispatchEvent(new w.Event('change',{bubbles:true}));await B.storage.flush();await tick();};
  await change('[data-friday-attendance="'+people[9].id+'"]','present');
  assert.equal(host.querySelector('[data-friday-mode]').dataset.fridayMode,'team');assert.equal(host.querySelectorAll('[data-friday-player]').length,0);
  assert.equal(JSON.stringify(B.storage.getTraining(training.id).plan),originalPlan);assert.equal(JSON.stringify(B.storage.getTraining(training.id).freethrows),originalStats);
  await change('[data-friday-attendance="'+people[9].id+'"]','absent');assert.equal(host.querySelectorAll('[data-friday-player]').length,9);
  B.storage.upsertPlayer({...people[0],position:'PG/SG'});await B.storage.flush();F.render(host,training.id);
  assert(host.querySelector('[data-friday-player="'+people[0].id+'"] .friday-issue'));
  await change('[data-friday-position="'+people[0].id+'"]','sg');
  assert.equal(B.storage.getTraining(training.id).fridayIndividual.positions[people[0].id],'sg');assert.equal(B.storage.getPlayer(people[0].id).position,'PG/SG');
  assert(host.querySelector('[data-friday-player="'+people[0].id+'"]').textContent.includes('Shooting Guard'));
  const snapshot=JSON.stringify(B.storage.getTraining(training.id));user={...user,role:'viewer'};F.render(host,training.id);
  assert([...host.querySelectorAll('[data-friday-attendance]')].every(c=>c.disabled));assert(!host.querySelector('[data-friday-position]'));
  await change('[data-friday-attendance="'+people[9].id+'"]','present');assert.equal(JSON.stringify(B.storage.getTraining(training.id)),snapshot);
  user={...user,role:'coach'};F.render(host,training.id);user={...user,id:'another-coach'};
  await change('[data-friday-attendance="'+people[9].id+'"]','present');assert.equal(JSON.stringify(B.storage.getTraining(training.id)),snapshot,'A stale workspace view must not write');
  console.log('Friday training: 0/1/9/10/11 threshold, actual attendance, coach exclusion, late/duplicate records, five role mappings, missing/multiple positions, solo/resources, stable recommendations, shared attendance persistence, retained plans/stats and role/workspace guards passed.');
}finally{w.close();}
