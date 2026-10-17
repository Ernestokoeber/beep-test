import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('',{url:'https://coach.test/#/statistics',runScripts:'outside-only'}),w=dom.window;
for(const file of ['util','storage','coaching-staff','stats','games','reports','insight-model'])w.eval(readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'));
try{
 const BT=w.BT,p=BT.storage.upsertPlayer({name:'Spieler'}),coach=BT.storage.upsertPlayer({name:'Trainer'}),empty=BT.storage.upsertPlayer({name:'Ohne Daten'});
 for(let i=0;i<6;i++)BT.storage.upsertTraining({date:'2026-08-'+String(i+1).padStart(2,'0'),endedAt:'2026-08-10T10:00:00Z',
  staff:[{role:'coach',name:coach.name,playerId:coach.id,alsoPlayer:false,status:'present'}],
  attendance:[{playerId:p.id,status:i<3?'absent':'present'},{playerId:coach.id,status:'present'},{playerId:empty.id,status:'pending'}],
  freethrows:[{playerId:p.id,made:i<3?1:8,attempted:10},{playerId:coach.id,made:100,attempted:100}],
  shots:[{category:'Nah',entries:[{playerId:p.id,made:i<3?2:4,attempted:10}]}]});
 BT.storage.upsertTraining({date:'2026-08-07',cancelled:true,attendance:[{playerId:p.id,status:'present'}],freethrows:[{playerId:p.id,made:10,attempted:10}]});
 BT.storage.upsertTraining({date:'2099-08-01',endedAt:'2099-08-02T00:00:00Z',freethrows:[{playerId:p.id,made:100,attempted:100}]});
 BT.storage.upsertGame({date:'2099-08-01',status:'played',score:'0:0'});
 BT.storage.upsertGame({date:'2026-08-01',score:'80:70',home:'TSV Lindau',away:'Gast'});
 BT.storage.upsertGame({date:'2026-08-02',score:'80:70',status:'cancelled'});
 const before=w.localStorage.getItem('beepTest_v1'),model=BT.insightModel.build('26/27');
 assert.equal(model.trainings.length,6);assert.equal(model.games.length,1);
 assert.equal(BT.reports.buildReport('all','all').trainings.length,6,'Full report and overview must agree on completed dates.');
 assert.equal(BT.reports.buildReport('all','all').games.length,1,'Future and cancelled results are not completed games.');
 assert.equal(BT.reports.buildReport('all','all').team.trainingFT.made,27,'Detailed report excludes coach-only shooting records like the overview.');
 assert.equal(model.team.ft.total.denominator,60,'Coach-only measurements must not count.');
 assert.equal(model.team.ft.total.numerator,27);assert.equal(model.team.ft.total.pct,45);
 assert.equal(model.team.ft.comparison.delta,70,'Compare weighted rates in percentage points.');
 assert.equal(model.team.attendance.comparison.delta,100);
 const row=model.players.find(r=>r.player.id===p.id);assert.equal(row.metrics.fg.comparison.delta,20);
 assert.equal(model.players.find(r=>r.player.id===empty.id).metrics.attendance.total.pct,null,'Pending is missing data, not an absence.');
 assert.equal(model.players.find(r=>r.player.id===coach.id).metrics.ft.total.pct,null);
 assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Analysis is read-only.');
 const other=BT.insightModel.build('25/26');assert.equal(other.trainings.length,0);assert.equal(other.team.ft.comparison,null);
 const sparse=BT.insightModel.metric([{numerator:1,denominator:2},{numerator:1,denominator:2},{numerator:1,denominator:2},{numerator:2,denominator:2},{numerator:2,denominator:2},{numerator:2,denominator:2}],'ft');
 assert.equal(sparse.comparison,null,'Too few attempts must not claim a trend.');
 const weighted=BT.insightModel.metric([{numerator:1,denominator:1},{numerator:0,denominator:99}],'ft');assert.equal(weighted.total.pct,1,'Never average session percentages.');
 assert.equal(BT.insightModel.metric([{numerator:12,denominator:10}],'ft').total.pct,null,'Impossible shot values are not plotted.');
 BT.storage.setArchived(p.id,true);assert.equal(BT.insightModel.build('26/27').team.ft.total.numerator,27,'Historical team data remains after archiving.');
 console.log('Entwicklung: Saison, Team/Spieler, gewichtete Quoten, Vergleichsfenster, Datenlücken, Trainerrollen, Archiv und Datenerhalt geprüft.');
}finally{dom.window.close();}
