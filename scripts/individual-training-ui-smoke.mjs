import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { pilotSessionTemplate } from '../api/_lib/individual-pilot.js';

function browser(role, overview) {
  const dom = new JSDOM(`<!doctype html><body>
    <nav><div data-role="individual-navigation"></div><a data-nav="dashboard"></a><a data-nav="individual"></a><a data-nav="account"></a></nav>
    <nav class="mobile-dock"><a data-mobile-nav="dashboard"></a><a data-mobile-nav="individual"></a><button data-role="mobile-more"></button></nav>
    <main id="app"></main></body>`, { url: 'https://coach.tsv-lindau.de/#/individual', runScripts: 'outside-only' });
  const window = dom.window;
  window.Date.now = () => Date.parse("2026-10-19T20:00:00Z");
  window.BT = {
    util: { escapeHTML: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;') },
    sync: { getState: () => ({ user: { id: role === 'player' ? 'u-player' : 'u-coach', role, displayName: role === 'player' ? 'Thomas' : 'Ernesto' } }) },
    api: {
      getIndividualOverview: async () => overview,
      syncIndividualMutations: async mutations => ({ results: mutations.map(item => ({ mutation_id: item.mutationId, applied: true })) }),
      individualAction: async action => {
        if (action === 'ensurePilotStart' && overview.role === 'coach' && overview.profiles?.length && !overview.sessions?.length) {
          overview.sessions = overview.profiles.map((item, index) => ({
            id: `session-${index + 1}`, individual_profile_id: item.id,
            scheduled_for: '2026-10-19T18:15:00.000Z', status: 'planned', unit_number: 1, attendance_status: 'pending'
          }));
        }
        return {};
      }
    },
    storage: { getPlayers: () => [
      { id: 'player-1', name: 'Thomas Albrecht' },
      { id: 'player-2', name: 'Adnan Demir' }
    ] }
  };
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  window.eval(readFileSync(new URL('../js/individual-copy.js', import.meta.url), 'utf8'));
  window.eval(readFileSync(new URL('../js/individual-player-view.js', import.meta.url), 'utf8'));
  window.eval(readFileSync(new URL('../js/individual-live.js', import.meta.url), 'utf8'));
  window.eval(readFileSync(new URL('../js/individual-training.js', import.meta.url), 'utf8'));
  return window;
}

const profile = { id: '11111111-1111-4111-8111-111111111111', player_profile_id: 'player-1', user_id: 'u-player' };
const session = {
  id: '33333333-3333-4333-8333-333333333333', individual_profile_id: profile.id,
  scheduled_for: '2026-10-19T16:00:00.000Z', status: 'planned', unit_number: 1, attendance_status: 'pending'
};
const playerData = {
  role: 'player', profiles: [profile], sessions: [session], focuses: [], feedback: [],
  releasedFeedback: [{ individual_profile_id: profile.id, content: 'Ball tief halten.', released_at: '2026-10-19T18:00:00Z' }],
  notifications: [], coachNotes: [{ note: 'DARF NICHT SICHTBAR SEIN' }], aiDrafts: [{ content: { private: true } }]
};
const playerWindow = browser('player', playerData);
await playerWindow.BT.individualTraining.render(playerWindow.document.querySelector('#app'));
const playerText = playerWindow.document.querySelector('#app').textContent;
assert(playerText.includes('Thomas Albrecht'));
assert(playerText.includes('Ball tief halten.'));
assert(!playerText.includes('DARF NICHT SICHTBAR SEIN'), 'Spieleroberfläche zeigt private Coach-Notizen');
playerWindow.BT.individualTraining.applyNavigationForRole();
assert(playerWindow.document.body.classList.contains('individual-player-mode'));

await playerWindow.BT.individualTraining.queueMutation('readiness', { entityId: session.id, score: 7 });
const queueKeys = Array.from({ length: playerWindow.localStorage.length }, (_, index) => playerWindow.localStorage.key(index));
assert(queueKeys.some(key => key.startsWith('courthub_individual_queue:')), 'Offline-Warteschlange fehlt');
playerWindow.BT.individualTraining.clearLocalData();
assert(!Array.from({ length: playerWindow.localStorage.length }, (_, index) => playerWindow.localStorage.key(index)).some(key => key.startsWith('courthub_individual_')), 'Logout löscht persönliche Individualdaten nicht');

const pilotRoadmap = [1, 2, 3, 4, 5, 6, 7, 8].map(unitNumber => ({
  unitNumber,
  scheduledDate: ['2026-10-19', '2026-10-26', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14'][unitNumber - 1],
  durationMinutes: 105,
  kind: [1, 4, 8].includes(unitNumber) ? 'assessment' : 'development',
  title: unitNumber === 1 ? 'Piloteinheit 1 – Ausgangsniveau' : unitNumber === 4 ? 'Piloteinheit 4 – Zwischenmessung' : unitNumber === 8 ? 'Piloteinheit 8 – Abschlusstest' : `Piloteinheit ${unitNumber} – individuelle Entwicklung`,
  objective: 'Verbindliches Ziel',
  template: unitNumber === 1
    ? { title: 'Piloteinheit 1 – Ausgangsniveau', objective: 'Ausgangsniveau erfassen', exercises: [{ title: 'Ausgangsmessung Wurf', durationMinutes: 12, repetitions: { totalAttempts: 25 }, measurementMethod: { metrics: ['Treffer je Position'] }, coachingCues: [] }] }
    : [4, 8].includes(unitNumber) ? { exercises: [{ title: 'Testblock', durationMinutes: 60, repetitions: {}, measurementMethod: {}, coachingCues: [] }] } : null
}));
const coachData = { ...playerData, role: 'coach', pilotRoadmap, coachNotes: [{ individual_profile_id: profile.id, note: 'Privat' }], aiDrafts: [] };
const coachWindow = browser('coach', coachData);
coachWindow.BT.individualTraining.renderHub(coachWindow.document.querySelector('#app'));
const hubText = coachWindow.document.querySelector('#app').textContent;
assert(hubText.includes('Mannschaft'));
assert(hubText.includes('Individualtraining'));
assert(coachWindow.document.querySelector('[data-workspace="team"][href="#/team"]'));
assert(coachWindow.document.querySelector('[data-workspace="individual"][href="#/individual"]'));

coachData.plans = [{ id: 'plan-1', session_id: session.id, individual_profile_id: profile.id, title: 'Beep-Test & Grundlinie' }];
coachData.exercises = [
  { id: 'exercise-1', session_id: session.id, individual_profile_id: profile.id, position: 1, title: 'Beep-Test', duration_minutes: 20, repetitions: { protocol: '20-m shuttle' }, measurement_method: { metric: 'level' }, coaching_cues: ['Rhythmus halten'] },
  { id: 'exercise-2', session_id: session.id, individual_profile_id: profile.id, position: 2, title: 'Ballhandling', duration_minutes: 15, repetitions: { sets: 3 }, measurement_method: { metric: 'errors' }, coaching_cues: ['Tief bleiben'] }
];
coachData.feedback = [{ individual_profile_id: profile.id, training_date: '2026-10-13', implementation_score: 4 }];
coachData.focuses = [{ individual_profile_id: profile.id, title: 'Ball tief und eng führen', valid_from: '2026-10-13', valid_until: '2026-10-19' }];
await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'));
assert(coachWindow.document.querySelector('[data-profile-id]'), 'Coach-Cockpit zeigt kein Profil');
const cardText = coachWindow.document.querySelector('[data-profile-id]').textContent;
assert(cardText.includes('Teilnahme'));
assert(cardText.includes('Wochenfokus'));
assert(cardText.includes('Rückmeldung'));
assert.equal(coachWindow.document.querySelector('[data-coach-readiness]')?.textContent,'Noch nicht gemeldet','Fehlende Tagesform muss im Cockpit ausdrücklich erkennbar sein');
coachData.readiness=[
  {individual_profile_id:profile.id,session_id:'older-session',score:3},
  {individual_profile_id:'other-profile',session_id:session.id,score:10},
  {individual_profile_id:profile.id,session_id:session.id,score:8}
];
for(const [status,label] of [['confirmed','Zugesagt'],['declined','Abgesagt'],['pending','Antwort offen']]){
  coachData.sessions[0].attendance_status=status;
  await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'));
  assert.equal(coachWindow.document.querySelector('[data-coach-attendance]')?.textContent,label);
  assert.equal(coachWindow.document.querySelector('[data-coach-readiness]')?.textContent,'8/10','Nur die persönliche Tagesform der nächsten Einheit gehört auf die Spielerkarte');
}
coachWindow.document.querySelector('[data-action="open-profile"]').click();
assert.equal(coachWindow.document.querySelector('[data-action="open-profile"]').type, 'button');
assert(coachWindow.location.hash.endsWith(`/individual/player/${profile.id}`), 'Spieler öffnen führt nicht auf eine eigene Detailseite');
await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'), profile.id);
assert(coachWindow.document.querySelector('.individual-coach-detail-page'), 'Eigene mobile Spieleransicht fehlt');
assert(coachWindow.document.querySelector('[href="#/individual"]'), 'Rückweg zum Coach-Cockpit fehlt');
assert.equal(coachWindow.document.querySelectorAll('.individual-pane-link').length, 6, 'Spielerfunktionen fehlen im Individual-Menü');
assert(coachWindow.document.querySelector('.individual-pane-link.active')?.textContent.includes('Übersicht'), 'Übersicht ist im Menü nicht aktiv');
assert.equal(coachWindow.document.querySelectorAll('[data-pilot-unit]').length, 8, 'Coach-Ansicht zeigt nicht alle acht Piloteinheiten');
const assessmentUnits = [...coachWindow.document.querySelectorAll('.individual-roadmap-unit.assessment')].map(item => Number(item.dataset.pilotUnit));
assert.deepEqual(assessmentUnits, [1, 4, 8], 'Einheit 1, 4 und 8 sind nicht als Testeinheiten sichtbar');
const roadmapText = coachWindow.document.querySelector('.individual-roadmap').textContent;
assert(roadmapText.includes('19.10.2026'));
assert(roadmapText.includes('16.11.2026'));
assert(roadmapText.includes('14.12.2026'));
assert(roadmapText.includes('Freigegebenen Ablauf anzeigen'));
assert(!coachWindow.document.querySelector('[data-guided-measurement]'), 'Messwertformular steht fälschlich offen in der Übersicht');
assert(!coachWindow.document.querySelector('[data-weekly-focus]'), 'Wochenfokus steht fälschlich offen in der Übersicht');
assert(!coachWindow.document.querySelector('[data-coach-note]'), 'Notizformular steht fälschlich offen in der Übersicht');

await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'), profile.id, 'training');
assert(coachWindow.document.querySelector('[data-action="start-live-training"]'), 'Geführter Trainingsstart fehlt');
assert(!coachWindow.document.querySelector('[data-guided-measurement]'), 'Messwerte sind nicht vom Trainingsbereich getrennt');
coachWindow.document.querySelector('[data-action="start-live-training"]').click();
assert(coachWindow.document.querySelector('.individual-live-shell'), 'Geführter Vollbildmodus fehlt');
const liveText = coachWindow.document.querySelector('.individual-live-shell').textContent;
assert(liveText.includes('Beep-Test'));
assert(liveText.includes('Als Nächstes'));
assert(liveText.includes('Ballhandling'));
assert(liveText.includes('Funktioniert'));
assert(liveText.includes('+1 Min.'));
assert(liveText.includes('Überspringen'));
assert(liveText.includes('Taktik öffnen'));
assert(!coachWindow.document.body.classList.contains('individual-player-mode'));

await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'), profile.id, 'measurements');
assert(coachWindow.document.querySelector('[data-guided-measurement]'), 'Eigener Messwertbereich fehlt');
const measurementText = coachWindow.document.querySelector('#app').textContent;
assert(measurementText.includes('Wähle die Übung'));
assert(measurementText.includes('Beobachtung'));
assert(!measurementText.includes('Messwertschlüssel'), 'Technischer Datenbankschlüssel ist für Trainer sichtbar');
assert(!measurementText.includes('Numerischer Wert'), 'Technischer Datentyp ist für Trainer sichtbar');
assert(!coachWindow.document.querySelector('[data-weekly-focus]'), 'Wochenfokus steht im Messwertbereich offen');
await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'), profile.id, 'focus');
assert(coachWindow.document.querySelector('[data-weekly-focus]'), 'Eigener Wochenfokusbereich fehlt');
await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'), profile.id, 'feedback');
assert(coachWindow.document.querySelector('[data-coach-note]'), 'Eigener Notizbereich fehlt');
assert(coachWindow.document.querySelector('[data-release-feedback]'), 'Eigener Feedbackbereich fehlt');
let releaseForm=coachWindow.document.querySelector('[data-release-feedback]');
const releaseMarker=releaseForm.querySelector('[name="shareWithPlayer"]');
assert(releaseMarker,'Freigabemarkierung für Spielernotizen fehlt');
assert(releaseMarker.required && !releaseMarker.checked,'Freigabe muss bewusst und ohne Vorauswahl erfolgen');
const noteActions=[],originalIndividualAction=coachWindow.BT.api.individualAction;
coachWindow.BT.api.individualAction=async(action,body)=>{noteActions.push({action,body});return {};};
releaseForm.querySelector('[name="content"]').value='Bewusst weitergegebene Notiz';
releaseForm.dispatchEvent(new coachWindow.Event('submit',{bubbles:true,cancelable:true}));
await new Promise(resolve=>setTimeout(resolve,0));assert.equal(noteActions.length,0,'Unmarkierte Notiz darf nicht veröffentlicht werden');
releaseMarker.checked=true;
releaseForm.dispatchEvent(new coachWindow.Event('submit',{bubbles:true,cancelable:true}));
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(noteActions[0]?.action,'saveReleasedFeedback');assert.equal(noteActions[0]?.body.shareWithPlayer,true);
assert(!coachWindow.document.querySelector('[name="shareWithPlayer"]').checked,'Nach Speichern muss die nächste Notiz wieder ohne Freigabe beginnen');
const privateForm=coachWindow.document.querySelector('[data-coach-note]');privateForm.querySelector('[name="note"]').value='Nur für mich';
privateForm.dispatchEvent(new coachWindow.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(noteActions[1]?.action,'addCoachNote');assert(!noteActions[1]?.body.shareWithPlayer);
coachWindow.BT.api.individualAction=originalIndividualAction;
await coachWindow.BT.individualTraining.render(coachWindow.document.querySelector('#app'), profile.id, 'ai-history');
assert(coachWindow.document.querySelector('.private-coach-card'), 'Eigener KI- und Verlaufsbereich fehlt');

const initiallyUnplanned = {
  ...coachData,
  sessions: [], plans: [], exercises: [], measurements: [], readiness: [], notifications: []
};
const unplannedWindow = browser('coach', initiallyUnplanned);
await unplannedWindow.BT.individualTraining.render(unplannedWindow.document.querySelector('#app'));
const plannedCardText = unplannedWindow.document.querySelector('[data-profile-id]').textContent;
assert(!plannedCardText.includes('Nicht geplant'), 'Bestehende Pilotprofile bleiben ohne verbindliche erste Einheit');
assert(plannedCardText.includes('19.10.2026'), 'Automatisch angelegter Pilotstart wird auf der Spielerkarte nicht angezeigt');
unplannedWindow.document.querySelector('[data-action="open-profile"]').click();
assert(unplannedWindow.location.hash.endsWith(`/individual/player/${profile.id}`), 'Spieler öffnen funktioniert nach der automatischen Planung nicht');
await unplannedWindow.BT.individualTraining.render(unplannedWindow.document.querySelector('#app'), profile.id, 'measurements');
assert(unplannedWindow.document.querySelectorAll('[data-guided-measurement]').length > 0, 'Verbindliche Einheit 1 dient nicht als Rückfallplan bei fehlenden Übungszeilen');
assert(unplannedWindow.document.querySelector('#app').textContent.includes('Treffer frontal'), 'Trainerfreundliche Wurferfassung fehlt im Rückfallplan');

const terminologyData = {...coachData,plans:[],exercises:[],pilotRoadmap:[{...pilotRoadmap[0],template:pilotSessionTemplate(1)}]};
const terminologyWindow = browser('coach',terminologyData);
await terminologyWindow.BT.individualTraining.render(terminologyWindow.document.querySelector('#app'),profile.id,'measurements');
assert(terminologyWindow.document.querySelector('[data-metric-key="readiness"] input[type="number"]'),'Umbenannte Tagesformübung verliert die numerische Erfassung');
assert(terminologyWindow.document.querySelector('[data-metric-key="kontrollbereich"] select'),'Umbenannte Kontrollmessung verliert die Bereichsauswahl');
assert(terminologyWindow.document.querySelector('[data-metric-key="kontrollwert"] textarea'),'Umbenannte Kontrollmessung verliert ihr eigenes Ergebnisfeld');
await terminologyWindow.BT.individualTraining.render(terminologyWindow.document.querySelector('#app'),profile.id,'training');
assert.match(terminologyWindow.document.querySelector('#app').textContent,/Versuche je Position: 5/);
assert(!/readinessScale|totalAttempts|Coach-|Readiness/.test(terminologyWindow.document.querySelector('#app').textContent));
const legacyTemplate=terminologyData.pilotRoadmap[0].template;
legacyTemplate.exercises.find(item=>item.title==='Ankommen und Tagesform').title='Check-in und Readiness';
legacyTemplate.exercises.find(item=>item.title==='Kontrollmessung nach Technikkorrektur').title='Kontrollmessung nach Coaching';
legacyTemplate.exercises.at(-1).coachingCues=['Private Coach-Notiz, Spielerfeedback und Wochenfokus getrennt speichern.'];
await terminologyWindow.BT.individualTraining.render(terminologyWindow.document.querySelector('#app'),profile.id,'measurements');
assert(terminologyWindow.document.querySelector('[data-metric-key="readiness"] input[type="number"]'));
assert(terminologyWindow.document.querySelector('[data-metric-key="kontrollbereich"] select'));
assert(terminologyWindow.document.querySelector('[data-metric-key="kontrollwert"] textarea'));
await terminologyWindow.BT.individualTraining.render(terminologyWindow.document.querySelector('#app'),profile.id,'training');
assert(!/Coach-|Readiness|Spielerfeedback/.test(terminologyWindow.document.querySelector('#app').textContent),'Gespeicherte alte Standardtexte bleiben sichtbar');
terminologyWindow.close();

const invitationWindow = browser('coach', {...coachData,profiles:[{...profile,user_id:null}]});
invitationWindow.BT.api.individualAction = async (action, args) => {
  assert.equal(action,'createInvite');assert.equal(args.profileId,profile.id);assert.equal(args.expiresInHours,72);
  return {inviteUrl:'https://coach.test/#/join/synthetic-test-only',qrDataUrl:'data:image/png;base64,',invite:{expires_at:'2026-10-21T12:00:00Z'}};
};
await invitationWindow.BT.individualTraining.render(invitationWindow.document.querySelector('#app'));
invitationWindow.document.querySelector('[data-action="invite-player"]').click();
await new Promise(resolve=>setTimeout(resolve,0));
const invitationText=invitationWindow.document.querySelector('[data-role="individual-invite"]').textContent;
assert.match(invitationText,/21\.10\.2026.*14:00/,'Ablaufdatum muss in deutscher Ortszeit sichtbar sein');
assert.match(invitationText,/72 Stunden/);assert.match(invitationText,/genau ein Spielerkonto/);
assert.match(invitationText,/Mannschaftstrainings bleiben gesperrt/);
assert.match(invitationText,/neuer Link macht die vorherige Einladung ungültig/);
invitationWindow.close();
console.log('Individual Training UI: Rollenansichten, Privattrennung, persönliche Einladungsregeln, Offline-Queue und Logout erfolgreich.');
