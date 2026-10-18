import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {ids,user,overview} from './fixtures/individual-player.mjs';
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://coach.test/#/individual',runScripts:'outside-only'}),w=dom.window;
let current={...user},unavailable=false;
w.BT={util:{escapeHTML:s=>String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},sync:{getState:()=>({user:current})},storage:{getPlayers:()=>[]},api:{getIndividualOverview:async()=>{if(unavailable)throw Error('Offline-Test');return structuredClone(overview);}}};
for(const file of ['individual-copy','individual-player-view','individual-training'])w.eval(readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'));
const target=w.document.querySelector('#app'),nav=w.document.querySelector('[data-role="individual-navigation"]');
function check(base){
 assert(!/Trainerübersicht|Bereich wechseln|Training durchführen|Messwerte|KI & Verlauf|Fremder Spieler/.test(nav.textContent),'Spielermenü enthält Trainerziele');
 assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')),[base,base+'/training',base+'/progress',base==='#/individual'?'#/individual/account':base+'/account']);
 assert.match(nav.textContent,/Mein Training/);assert.match(nav.textContent,/Entwicklung/);
 assert(w.document.body.classList.contains('individual-player-mode'),'Auch die Vorschau braucht die Spielerleiste statt Trainermenü');
 assert.deepEqual([...w.document.querySelectorAll('[data-player-nav]')].map(a=>a.getAttribute('href')),[base,base+'/training',base+'/progress',base==='#/individual'?'#/individual/account':base+'/account']);
}
current={...user,role:'coach'};const base=`#/individual/player/${ids.profile}/preview`;
w.location.hash=base;w.BT.individualTraining.applyNavigationForRole();await w.BT.individualTraining.render(target,ids.profile,'preview');check(base);
for(const pane of ['training','progress','account']){
 w.location.hash=base+'/'+pane;w.BT.individualTraining.applyNavigationForRole();await w.BT.individualTraining.render(target,ids.profile,'preview',pane);check(base);
 assert(nav.querySelector(`[href="${base}/${pane}"][aria-current="page"]`));
 if(pane==='account'){assert.match(target.textContent,/Kontovorschau/);assert(!target.querySelector('form'));}
}
w.BT.individualTraining.clearLocalData();unavailable=true;w.location.hash=base;await w.BT.individualTraining.render(target,ids.profile,'preview');check(base);
unavailable=false;w.location.hash='#/individual';w.BT.individualTraining.applyNavigationForRole();await w.BT.individualTraining.render(target);
assert(!w.document.body.classList.contains('individual-player-mode'));assert.match(nav.textContent,/Trainerübersicht/);assert.match(nav.textContent,/Bereich wechseln/);
current={...user};w.BT.individualTraining.applyNavigationForRole();await w.BT.individualTraining.render(target);check('#/individual');
w.location.hash='#/individual/account';w.BT.individualTraining.applyNavigationForRole();await w.BT.individualTraining.renderAccountNavigation();
assert.equal(nav.querySelector('[aria-current="page"]')?.textContent,'Konto','Die aktive Kontomarkierung darf beim Laden nicht auf Mein Training zurückspringen');
current={...user,role:'coach'};
w.fetch=async()=>({ok:true,json:async()=>structuredClone(overview)});w.location.hash='#/individual/preview';w.BT.individualTraining.applyNavigationForRole();await w.BT.individualTraining.renderDemo(target);check('#/individual/preview');
dom.window.close();console.log('Spielernavigation: eigene Individualziele, persönliche und Beispielvorschau ohne Trainerziele, Kontovorschau, Offline-Zustand und Rückkehr zum Coach geprüft.');
