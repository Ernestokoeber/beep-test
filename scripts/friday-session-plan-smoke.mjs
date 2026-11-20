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
      for(const court of round.courts){let turnEnd=round.start;for(const turn of court.turns){assert.equal(turn.start,turnEnd);assert(turn.duration>0);turnEnd+=turn.duration;boundaries.add(turn.start);
        if(court.sharedSolo){
          assert.equal(turn.roles.filter(r=>r.space==='shared-interior').length,1,'Only one complete movement/ball may occupy the shared interior');
          assert.equal(new Set(turn.roles.map(r=>r.space)).size,turn.roles.length,'Preparation spaces never overlap');
          assert(turn.roles.every(r=>r.row.id===phase.solo.find(s=>s.owner===r.playerId).row.id),'Everyone keeps their own actual set at the shared basket');
          assert(court.sharedSolo.stations.length<=plan.config.soloCapacity);
          if(court.sharedSolo.stations.length>1)assert(turn.duration<=25,'No player reserves the shared basket for minutes');
        }
      }assert.equal(turnEnd,round.start+round.duration);}
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
  const shared=training(7,{courts:2,techniqueGroups:{p0:1,p1:2,p2:3,p3:4,p4:5,p5:6,p6:7}}),sharedBefore=JSON.stringify(shared),sharedPlan=P.build(shared,F.assess(shared,players));
  for(const phase of sharedPlan.phases.filter(p=>p.solo)){
    assert.equal(phase.rounds.length,1,'Seven players stay at their shared baskets for the whole solo block');
    const round=phase.rounds[0];assert.equal(round.side.length,0,'No four-player off-basket queue while one PG has a basket');
    assert.deepEqual(copy(round.courts.map(c=>c.group.members.length).sort()),[3,4]);
    assert(round.courts.find(c=>c.group.members.some(m=>m.id==='p0')).group.members.length>=3,'The PG shares the basket despite his own technique group');
  }
  assert.equal(JSON.stringify(shared),sharedBefore,'Existing group settings and chosen sets are not rewritten');coverage(sharedPlan);
  for(const [n,format] of [[4,'3 gegen 1'],[5,'3 gegen 2'],[6,'3 gegen 3'],[7,'3 gegen 3 · 1 in Rotation'],[8,'4 gegen 4'],[9,'4 gegen 4 · 1 in Rotation']]){
    const session=training(n,{courts:2,combinationGroups:{p0:9,p1:9,p2:9}}),p=P.build(session,F.assess(session,players));
    for(const phase of p.phases.filter(p=>['combination','transfer'].includes(p.id))){
      assert.equal(phase.rounds.length,1);assert.equal(phase.rounds[0].courts.length,1,'Two baskets do not split the opposition');assert.equal(phase.rounds[0].side.length,0);
      const turns=phase.rounds[0].courts[0].turns;assert(turns.every(t=>t.format===format),n+' attendees must produce '+format);
      if(n>=6)for(let i=0;i<turns.length;i+=2){
        const attack=t=>copy(t.roles.filter(r=>!['Verteidigung','Rebound / Beobachtung'].includes(r.role)).map(r=>r.playerId).sort()),defense=t=>copy(t.roles.filter(r=>r.role==='Verteidigung').map(r=>r.playerId).sort());
        assert.deepEqual(attack(turns[i]),defense(turns[i+1]));assert.deepEqual(defense(turns[i]),attack(turns[i+1]));
      }
    }
  }
  const six=training(6,{courts:2}),sixPlan=P.build(six,F.assess(six,players));
  for(const t of sixPlan.phases.find(p=>p.id==='transfer').rounds[0].courts[0].turns){
    for(const defense of [false,true]){const positions=t.roles.filter(r=>(r.role==='Verteidigung')===defense).map(r=>players.find(p=>p.id===r.playerId).position);
      assert(positions.includes('PG'));assert(positions.some(p=>['C','PF'].includes(p)));assert(positions.some(p=>['SG','SF'].includes(p)));
    }
    assert(t.steps.some(s=>s.includes('verteidigen frei')));assert(!t.steps.some(s=>s.includes('geführte Partnerrolle')));
    for(const r of t.roles){if(r.row)assert.equal(r.row.id,sixPlan.config.resolvedSets[r.playerId][r.setIndex].id);if(r.role.startsWith('Blocksteller'))assert(['C','PF'].includes(players.find(p=>p.id===r.playerId).position));}
  }
  const separate=training(6,{courts:2,combinationMode:'groups',combinationGroups:{p0:9,p1:9,p2:9}}),separatePlan=P.build(separate,F.assess(separate,players));coverage(separatePlan);assert.equal(separatePlan.phases.find(p=>p.id==='transfer').rounds[0].courts.length,2,'Only explicitly selected minigroup mode splits the game');
  const lockedCourt=training(7,{courts:2,soloCourts:{p0:2,p1:2}}),lockedPlan=P.build(lockedCourt,F.assess(lockedCourt,players));
  for(const phase of lockedPlan.phases.filter(p=>p.solo))for(const id of ['p0','p1'])assert(phase.rounds[0].courts.find(c=>c.number===2).group.members.some(m=>m.id===id));
  for(const soloCapacity of [2,3,4]){
    const crowded=training(9,{courts:1,soloCapacity}),p=P.build(crowded,F.assess(crowded,players));coverage(p);
    for(const phase of p.phases.filter(p=>p.solo)){
      assert(phase.rounds.every(r=>r.duration<=60),'Overflow rotates within a minute, not half a solo block');
      const opportunities=Object.fromEntries(players.slice(0,9).map(p=>[p.id,0]));
      for(const r of phase.rounds)for(const c of r.courts)for(const s of c.sharedSolo.stations)opportunities[s.owner]++;
      assert(Math.min(...Object.values(opportunities))>0);assert(Math.max(...Object.values(opportunities))-Math.min(...Object.values(opportunities))<=1,'Short basket rotations are balanced');
    }
  }
  const missingBasket=training(3,{courts:1,soloCourts:{p0:2}}),missingPlan=P.build(missingBasket,F.assess(missingBasket,players));coverage(missingPlan);assert(missingPlan.warnings.some(w=>w.includes('Solo-Korb ist nicht verfügbar')));assert.equal(missingBasket.fridayIndividual.session.soloCourts.p0,2);
  const onePinned=training(1,{courts:2,soloCourts:{p0:2}}),onePinnedPlan=P.build(onePinned,F.assess(onePinned,players));coverage(onePinnedPlan);assert.equal(onePinnedPlan.phases[1].rounds[0].courts[0].number,2);
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
