import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {individualPlayerData} from '../api/_lib/individual-player-data.js';

const profileId='own-profile',sessionId='own-session';
const data={role:'coach',profiles:[{id:profileId,account_name:'Testspieler'}],
 sessions:[{id:sessionId,individual_profile_id:profileId,scheduled_for:'2026-10-19T18:15:00Z',duration_minutes:105,unit_number:1,status:'planned'}],
 plans:[{id:'own-plan',individual_profile_id:profileId,session_id:sessionId,title:'Deine Einheit',objective:'INTERNES_TRAININGSZIEL'}],
 exercises:[{id:'own-exercise',individual_profile_id:profileId,session_id:sessionId,position:1,title:'Ballkontrolle',duration_minutes:8,repetitions:{protocol:'INTERNES_TESTPROTOKOLL'},measurement_method:{setup:'INTERNE_MESSVORGABE'},coaching_cues:['INTERNER_COACHINGHINWEIS']}],
 pilotRoadmap:[{unitNumber:1,scheduledDate:'2026-10-19',durationMinutes:105,title:'Erste Einheit',objective:'INTERNES_TRAININGSZIEL',template:{exercises:[{coachingCues:['INTERNER_COACHINGHINWEIS']}]}}]
};

for(const options of [{},{preview:true},{preview:true,demo:true}]){
 const dom=new JSDOM('<main></main>',{url:'https://coach.test/#/individual/training',runScripts:'outside-only'}),w=dom.window;
 w.BT={util:{escapeHTML:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')}};
 w.eval(readFileSync(new URL('../js/individual-player-view.js',import.meta.url),'utf8'));
 const target=w.document.querySelector('main');
 w.BT.individualPlayerView.render(target,data,{...options,profileId,pane:'training'});
 assert.match(target.textContent,/Ballkontrolle/);assert.match(target.textContent,/8 Min\./);
 assert.match(target.textContent,/19\.10\.2026, 20:15.*105 Minuten/);
 assert.equal(target.querySelectorAll('.individual-player-exercises > li').length,1);
 assert.equal(target.querySelectorAll('.individual-player-exercises details').length,0,'Spieler benötigen keine technischen Übungsdetails.');
 assert(!/INTERN/.test(target.textContent),'Trainerdetails gehören auch in der Vorschau nicht in den Spielerplan.');
 dom.window.close();
}

const released=individualPlayerData(data);
assert(!/INTERN/.test(JSON.stringify(released)),'Die Spieler-API darf technische Plan- und Vorlagendetails nicht übertragen.');
assert.equal(released.exercises[0].title,'Ballkontrolle');assert.equal(released.exercises[0].duration_minutes,8);
assert.equal(data.plans[0].objective,'INTERNES_TRAININGSZIEL','Der vollständige Trainerplan bleibt erhalten.');
console.log('Spielerplan: Termin, Gesamtdauer und Übungsnamen mit Dauer; keine technischen Trainerdetails in Spieleransicht, Vorschau oder API.');
