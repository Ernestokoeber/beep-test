import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), {url:'https://coach.test/#/team',runScripts:'outside-only'});
const w = dom.window;
for (const file of ['util','storage','coaching-staff','team-strategy','station-training','games','dashboard']) {
  w.eval(readFileSync(new URL('../js/'+file+'.js', import.meta.url),'utf8'));
}
try {
  const BT=w.BT, today=BT.util.todayISO(), future='2099-12-20';
  const trainings=[
    {id:'evening',date:today,startTime:'20:00',plan:{summary:'Defense'}},
    {id:'morning',date:today,startTime:'09:00'},
    {id:'done',date:today,startTime:'08:00',endedAt:'2026-01-01T08:00:00Z'},
    {id:'cancelled',date:today,startTime:'10:00',status:'cancelled'},
    {id:'past',date:'2020-01-01'},
    {id:'later',date:future,startTime:'18:00'},
    {id:'undated'}
  ];
  const games=[{id:'game',date:today,time:'18:00',home:'TSV Lindau',away:'Illertal',team:'u18'},
    {id:'preliminary',date:future,time:'17:00',score:'0:0',status:'played'},
    {id:'cancel-game',date:today,time:'11:00',cancelled:true},
    {id:'finished-game',date:today,time:'07:00',score:'70:60'}];
  const agenda=()=>BT.dashboard.__test.homeAgenda(trainings,games,today);
  let model=agenda();
  assert.equal(model.next.id,'morning');
  assert.deepEqual(Array.from(model.today,e=>e.id),['finished-game','done','morning','cancelled','cancel-game','game','evening']);
  assert.equal(model.upcoming[0].id,'preliminary','Future fixture with imported score must remain upcoming.');
  assert.equal(model.today.find(e=>e.id==='cancel-game').status,'cancelled');
  assert.equal(model.today.find(e=>e.id==='done').status,'completed');
  assert.equal(BT.dashboard.__test.nextTraining([{id:'flag-cancelled',date:today,cancelled:true},{id:'session-done',date:today,liveSession:{status:'completed'}},trainings[0]],today).id,'evening');
  trainings[0].liveSession={status:'active',totalRunningSince:Date.now()};
  model=agenda(); assert.equal(model.next.id,'evening','Active session has priority over an earlier unstarted appointment.');
  assert.equal(model.next.status,'active');
  assert.equal(model.next.href,'#/training/evening');
  assert.equal(model.today.find(e=>e.id==='game').href,'#/games/game');
  games[0].liveStats={selectedSessionId:'live',sessions:[{id:'live',events:[{id:'start',seq:1,kind:'clock-start'}]}]};
  trainings[0].liveSession.status='completed';
  assert.equal(agenda().next.id,'game','A started game becomes the current appointment.');
  assert.equal(agenda().next.status,'active');
  games[0].liveStats.sessions[0].events.push({id:'end',seq:2,kind:'finish'});
  assert.equal(agenda().today.find(e=>e.id==='game').status,'completed');
  const noDates=BT.dashboard.__test.homeAgenda([{id:'no-date'}],[{id:'no-game-date'}],today);
  assert.equal(noDates.next,undefined); assert.equal(noDates.today.length,0);

  const host=w.document.createElement('main');w.document.body.append(host);
  BT.dashboard.render(host);
  assert.match(host.textContent,/Heute ist kein Training oder Spiel geplant/);
  assert.equal(host.querySelector('[data-role="home-next"]'),null);
  BT.dashboard.cleanup();host.replaceChildren();
  const t=BT.storage.upsertTraining({date:today,startTime:'20:00',plan:{summary:'<img src=x onerror=alert(1)>',drills:[]}});
  const g=BT.storage.upsertGame({date:future,time:'17:00',home:'TSV Lindau',away:'Ein Gegner',team:'u18'});
  const before=w.localStorage.getItem('beepTest_v1');
  BT.dashboard.render(host);
  assert.equal(host.querySelector('[data-role="home-next"]').getAttribute('href'),'#/training/'+t.id);
  assert(host.querySelector('a[href="#/games/'+g.id+'"]'));
  assert.equal(host.querySelector('.mobile-home img'),null,'User text must be escaped.');
  assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Home must not start or modify a session.');
  const focused=host.querySelector('[data-role="home-next"]');focused.focus();
  BT.storage.upsertTraining({...t,plan:{summary:'Aktueller Plan',drills:[]}});
  BT.dashboard.refresh();
  assert.match(host.textContent,/Aktueller Plan/);
  assert.equal(w.document.activeElement.getAttribute('href'),'#/training/'+t.id,'Refresh keeps keyboard focus.');
  const heading=host.querySelector('h2');heading.tabIndex=-1;heading.focus();
  BT.storage.upsertTraining({...t,plan:{summary:'Noch aktueller',drills:[]}});BT.dashboard.refresh();
  assert.equal(w.document.activeElement.tagName,'H2','Refresh keeps the route heading focus.');
  host.querySelector('[data-role="home-next"]').focus();
  BT.storage.upsertTraining({...t,endedAt:new Date().toISOString()});BT.dashboard.refresh();
  assert.equal(w.document.activeElement.getAttribute('href'),'#/training/'+t.id);
  assert.equal(host.querySelector('.home-day-history').open,true,'A focused card must stay visible after completion.');
  BT.dashboard.cleanup();
  BT.storage.upsertTraining({...t,plan:{summary:'Nach Verlassen geändert',drills:[]}});
  BT.dashboard.refresh();assert.doesNotMatch(host.textContent,/Nach Verlassen geändert/);
  console.log('CourtHub: Heute-Agenda, Status, Reihenfolge, Direktlinks, Leerzustand und Aktualisierung geprüft.');
} finally {w.BT.dashboard.cleanup?.();dom.window.close();}
