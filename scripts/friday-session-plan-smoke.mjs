import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<main></main>',{runScripts:'outside-only',url:'https://coach.test/'}),w=dom.window;
for(const file of ['util','friday-position-exercises','friday-individual','friday-personal-sets','friday-session-plan','friday-training'])w.eval(readFileSync('js/'+file+'.js','utf8'));
const B=w.BT,P=B.fridaySessionPlan,F=B.fridayTraining,copy=value=>JSON.parse(JSON.stringify(value));
const players=Array.from({length:10},(_,i)=>({id:'p'+i,name:'Player '+i,position:['PG','C','SF','PG','PF','SG','C','SF','PG','SG'][i]}));
const training=(count,session={})=>({id:'friday',date:'2026-11-20',startTime:'20:15',attendance:players.map((p,i)=>({playerId:p.id,status:i<count?'present':'absent'})),fridayIndividual:{session},plan:{summary:'Untouched manual plan',drills:[{name:'Keep me'}]}});
function coverage(plan){
  let phaseEnd=0;const expected=copy(plan.members.map(m=>m.id).sort());
  for(const phase of plan.phases){
    assert.equal(phase.start,phaseEnd);assert(phase.duration>0);phaseEnd+=phase.duration;
    if(phase.solo){assert.deepEqual(copy(phase.solo.map(s=>s.owner).sort()),expected);assert(phase.solo.every(s=>s.row.playersMin===1&&!s.blocked));}
    if(!phase.rounds.length)continue;
    let roundEnd=phase.start;
    for(const round of phase.rounds){
      assert.equal(round.start,roundEnd);roundEnd+=round.duration;assert(round.courts.length<=plan.config.courts);
      const boundaries=new Set([round.start]);
      for(const court of round.courts){let turnEnd=round.start;for(const turn of court.turns){assert.equal(turn.start,turnEnd);assert(turn.duration>0);turnEnd+=turn.duration;boundaries.add(turn.start);}assert.equal(turnEnd,round.start+round.duration);}
      for(const time of boundaries){
        const assigned=[...round.side];for(const court of round.courts){const t=court.turns.find(t=>t.start<=time&&time<t.start+t.duration);assert(t);assigned.push(...(t.roles?t.roles.map(r=>r.playerId):[t.owner,...t.helpers,...t.side]));}
        assert.deepEqual(assigned.sort(),expected,'Every attendee has exactly one task at each time; no borrowed helpers or double-booked players');
      }
    }assert.equal(roundEnd,phase.start+phase.duration);
  }assert.equal(phaseEnd,plan.config.durationMinutes*60);
}
try{
  for(const n of [1,2,3,4,5,6,7,8,9])for(const courts of [1,2])for(const durationMinutes of [45,90,105,120,180]){
    const t=training(n,{courts,durationMinutes}),before=JSON.stringify(t),report=F.assess(t,players),plan=P.build(t,report);coverage(plan);assert.equal(JSON.stringify(t),before,'Reading a session cannot overwrite its manual plan or configuration');
    for(const phase of plan.phases.filter(p=>p.solo))assert(phase.solo.every(s=>s.helpers.length===0),'Solo sets must be genuine individual tasks');
  }
  const t=training(7),plan=P.build(t,F.assess(t,players));assert.equal(P.clock(plan,0),'20:15');assert.equal(P.clock(plan,6300),'22:00');
  assert.equal(plan.mixed.length,1,'One basket keeps seven players together for a real 3v3 offense plus rotation');
  assert.equal(plan.phases.find(p=>p.id==='transfer').rounds[0].courts[0].turns[0].format,'3 gegen 3 · 1 in Rotation');
  assert.deepEqual(copy(plan.phases.filter(p=>p.solo).map(p=>p.id)),['solo-a','solo-b','solo-c','solo-return']);
  assert(plan.phases.find(p=>p.id==='solo-c').start<plan.phases.find(p=>p.id==='combination').start);
  assert(plan.phases.find(p=>p.id==='solo-return').start>plan.phases.find(p=>p.id==='transfer').start);
  assert(plan.technique.some(g=>g.members.filter(m=>m.position==='pg').length===2),'Two PGs train in the same technique group by default');
  for(const g of plan.mixed)assert(g.members.some(m=>m.position==='pg')&&g.members.some(m=>['pf','c'].includes(m.position))&&g.members.some(m=>['sf','sg'].includes(m.position)),'Each default mixed group combines a guard, big and wing where the roster allows it');
  for(const mix of ['balanced','offense','wing','defense']){const v=training(7,{playerMix:{p0:mix}}),p=P.build(v,F.assess(v,players));coverage(p);assert(p.phases.find(phase=>phase.id==='combination').rounds.length);}
  const manual=training(7,{techniqueGroups:Object.fromEntries(players.slice(0,7).map(p=>[p.id,1])),combinationGroups:{p0:9,p1:9,p2:9},returnSets:{p0:2}}),manualPlan=P.build(manual,F.assess(manual,players));coverage(manualPlan);assert.equal(manualPlan.technique.length,1);assert.equal(manualPlan.mixed.find(g=>g.id===9).members.length,3);assert.equal(manualPlan.phases.find(p=>p.id==='solo-return').solo.find(s=>s.owner==='p0').setIndex,2);
  for(const n of [0,10])assert.equal(P.build(training(n),F.assess(training(n),players)).phases.length,0);
  const data={profiles:[{id:'own',player_profile_id:'p0'},{id:'absent',player_profile_id:'p9'}],sessions:[{id:'s',individual_profile_id:'own',scheduled_for:'2026-11-20T18:00:00Z',status:'planned'}],plans:[{id:'plan',session_id:'s',individual_profile_id:'own',title:'Personal solo plan'}],exercises:[{id:'e',plan_id:'plan',individual_profile_id:'own',title:'Personal ball protection',repetitions:{instruction:'Protect the ball; pause after three attempts.'},coaching_cues:['Eyes up'],observation:'PRIVATE OBSERVATION',measurement_method:{instruction:'Six controlled stops'}},{id:'wrong-profile',plan_id:'plan',individual_profile_id:'absent',title:'Must never appear'}]};
  const choices=P.individualChoices(data,F.assess(t,players));assert.equal(choices.length,1);assert.equal(choices[0].playerId,'p0');assert.equal(choices[0].playersMin,null);assert(!JSON.stringify(choices).includes('PRIVATE'));
  const imported=training(3,{soloSets:{p0:['individual:e']},importedExercises:{'individual:e':choices[0]}}),pending=P.build(imported,F.assess(imported,players));assert(pending.warnings.length);assert(pending.phases.find(p=>p.id==='solo-a').solo.find(s=>s.owner==='p0').blocked);
  Object.assign(imported.fridayIndividual.session.importedExercises['individual:e'],{playersMin:1,action:'drive',counter:'Bei geschlossener erster Linie zur anderen Hand wechseln.',exit:'Mit lebendem Dribbling Abstand schaffen und nach außen passen.'});const accepted=P.build(imported,F.assess(imported,players));coverage(accepted);assert.equal(accepted.warnings.length,0);assert.equal(accepted.phases[1].solo.find(s=>s.owner==='p0').row.familyName,'Personal ball protection');
  const x=copy(players);x[0].name='<img src=x onerror=alert(1)>';const unsafe=training(3,{focusNotes:{p0:'<script>alert(1)</script>'}});w.document.querySelector('main').innerHTML=P.html(P.build(unsafe,F.assess(unsafe,x)),{editable:true});assert.equal(w.document.querySelectorAll('img,script').length,0);assert.equal(w.document.querySelectorAll('[data-friday-solo-set]').length,9);assert.equal(w.document.querySelectorAll('[data-friday-phase]').length,11);
  for(const file of ['index.html','sw.js'])for(const asset of ['js/friday-personal-sets.js','js/friday-session-plan.js'])assert(readFileSync(file,'utf8').includes(asset));
  console.log('Friday full session: exact 20:15–22:00 timeline; 1–9 players, 1/2 baskets, 45–180 minutes; true solo A/B/C and return; complete conflict-free assignments; same-role and mixed groups; linked offensive chains; existing-plan selection with solo confirmation; private-field exclusion; unchanged plans and safe HTML passed.');
}finally{w.close();}
