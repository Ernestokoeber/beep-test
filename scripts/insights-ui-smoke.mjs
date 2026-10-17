import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://coach.test/#/statistics?season=25%2F26',runScripts:'outside-only'}),w=dom.window;
for(const file of ['util','storage','coaching-staff','stats','games','reports','dashboard','insight-model','insights'])w.eval(readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'));
try{
 const BT=w.BT,p=BT.storage.upsertPlayer({name:'Saisonspieler'}),host=w.document.createElement('main');host.id='app';w.document.body.append(host);
 BT.storage.upsertTraining({date:'2025-08-01',endedAt:'2025-08-02T00:00:00Z',freethrows:[{playerId:p.id,made:1,attempted:10}]});
 BT.storage.upsertTraining({date:'2026-08-01',endedAt:'2026-08-02T00:00:00Z',freethrows:[{playerId:p.id,made:9,attempted:10}]});
 BT.storage.upsertGame({date:'2024-08-01',home:'Lindau',away:'Nur Spiel',score:'80:70'});BT.storage.setActiveSeason('26/27');
 const before=w.localStorage.getItem('beepTest_v1');BT.insights.render(host);
 const ranks=[...host.querySelectorAll('a')].find(a=>a.textContent.includes('Ranglisten und Wurfkarte'));
 assert.match(ranks.getAttribute('href'),/season=25%2F26/,'Rankings link must carry the selected season.');
 BT.insights.cleanup();host.replaceChildren();w.location.hash=ranks.getAttribute('href');BT.insights.render(host);
 assert.equal(host.querySelector('[data-role="season-select"]').value,'25/26');assert.equal(host.querySelector('[data-role="team-ft-pct"]').textContent,'10');
 assert.equal(BT.storage.getActiveSeason(),'26/27','Rendering a shared season URL must not rewrite the global season.');
 BT.insights.cleanup();host.replaceChildren();w.location.hash='#/reports/full?season=24%2F25';BT.insights.render(host);
 assert.equal(host.querySelector('[data-role="report-season"]').value,'24/25');assert.match(host.querySelector('[data-role="report-summary"]').textContent,/1/);
 assert(BT.storage.getSeasons().includes('24/25'),'A game-only season must be available.');
 assert.equal(w.localStorage.getItem('beepTest_v1'),before,'Opening analytics does not modify data.');
 console.log('Statistik-UI: Saisonkontext in Ranglisten, reine Spiel-Saison, vollständiger Bericht und lesende Aufrufe geprüft.');
}finally{w.BT.insights?.cleanup();dom.window.close();}
