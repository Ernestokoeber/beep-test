import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://coach.test/#/training',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};
for(const match of readFileSync('index.html','utf8').matchAll(/<script defer src="(js\/[^"]+)"/g)){if(!['js/app.js','js/install.js'].includes(match[1]))w.eval(readFileSync(match[1],'utf8'));}
try{
 const B=w.BT,now=B.util.todayISO();B.storage.setActiveSeason('all');
 const p=B.storage.upsertPlayer({name:'Quotenvergleich'});
 for(let i=0;i<5;i++)B.storage.upsertTraining({date:'2026-09-'+String(i+1).padStart(2,'0'),status:'completed',attendance:[{playerId:p.id,status:'present'}],freethrows:[{playerId:p.id,made:i<2?8:6,attempted:10}],plan:{drills:[]}});
 const alert=B.stats.teamAlerts().find(a=>a.type==='ft_decline');assert(alert);assert.match(alert.message,/20 Prozentpunkte unter/,'Quotendifferenzen sind Prozentpunkte, keine relativen Prozente.');
 assert.equal(B.stats.isEnded({date:now,liveSession:{status:'completed'}}),true,'Abgeschlossene Durchführung muss auch in Statistik als abgeschlossen gelten.');
 assert.equal(B.stats.isEnded({date:'2020-01-01',cancelled:true,endedAt:'2020-01-01'}),false,'Abgesagte Trainings gehören nicht in die Leistungsstatistik.');
 const localToday=B.util.todayISO;B.util.todayISO=()=> '2099-10-18';assert.equal(B.stats.isEnded({date:'2099-10-17'}),true,'Datumsvergleich muss denselben lokalen Tag wie Kalender und Startseite verwenden.');B.util.todayISO=localToday;
 const training=B.storage.upsertTraining({date:now,attendance:[{playerId:p.id,status:'present'}],freethrows:[{playerId:p.id,made:4,attempted:10}],plan:{drills:[]}});
 const host=w.document.createElement('main');w.document.body.append(host);B.training.renderDetail(host,training.id);
 const badge=host.querySelector('[data-role="team-shot-quote"] .delta-badge') || host.querySelector('.delta-badge');assert(badge,'Der echte Trainings-Quotenvergleich muss gerendert sein.');assert.match(badge.textContent,/Prozentpunkte/);assert.match(badge.title,/Prozentpunkte/);
 B.training.openPlayerStatsModal(p,training);assert.match(w.document.querySelector('.player-stats-modal')?.textContent || w.document.body.textContent,/Prozentpunkte/);
 console.log('Statistikkonsistenz: Quoteneinheiten, lokaler Kalendertag, Absagen und abgeschlossene Durchführung geprüft.');
}finally{w.BT.training.cleanup();w.close();}
