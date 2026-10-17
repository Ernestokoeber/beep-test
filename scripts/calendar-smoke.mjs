import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('',{url:'https://coach.test/#/schedule',runScripts:'outside-only'}),w=dom.window;
for(const file of ['util','storage','games','calendar'])w.eval(readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'));
try{
 const BT=w.BT;
 assert.equal(BT.calendar.validDate('2028-02-29'),true);assert.equal(BT.calendar.validDate('2026-02-29'),false);assert.equal(BT.calendar.validDate('2026-13-01'),false);
 assert.equal(BT.calendar.shiftMonth('2026-12',1),'2027-01');assert.equal(BT.calendar.shiftMonth('2026-01',-1),'2025-12');
 const t=BT.storage.upsertTraining({date:'2026-10-17',startTime:'20:00',note:'Defense',attendance:[]});
 BT.storage.upsertTraining({date:'2026-10-17',startTime:'09:00',status:'cancelled',attendance:[]});
 BT.storage.upsertTraining({date:'2026-10-18',note:'Ohne Uhrzeit',attendance:[]});
 BT.storage.upsertTraining({date:'2026-11-01',startTime:'08:00',attendance:[]});
 BT.storage.upsertTraining({date:'2026-02-31',startTime:'08:00',attendance:[]});
 const g=BT.storage.upsertGame({date:'2026-10-17',time:'18:00',home:'Lindau',away:'Illertal',team:'u18'});
 const before=w.localStorage.getItem('beepTest_v1'),month=BT.calendar.build('2026-10');
 assert.equal(month.events.length,4);assert.equal(month.groups.length,2);
 assert.equal(month.groups[0].events[0].label,'Abgesagt');assert.equal(month.groups[0].events[1].href,'#/games/'+g.id);assert.equal(month.groups[0].events[2].href,'#/training/'+t.id);
 assert.match(month.groups[1].events[0].timeLabel,/Uhrzeit offen/);
 assert.equal(BT.calendar.build('2026-10','game').events.length,1);
 assert.equal(BT.calendar.build('2026-10','all','defense').events.length,1);
 assert.equal(BT.calendar.build('2026-10','all','U18').events.length,1);
 assert.equal(BT.calendar.build('2026-11').events.length,1);
 assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Opening and filtering never create or change appointments.');
 console.log('Kalender: Datum, Monatswechsel, Training/Spiel, Sortierung, Filter, Direktlinks und lesender Zugriff geprüft.');
}finally{w.BT.calendar?.cleanup();dom.window.close();}
