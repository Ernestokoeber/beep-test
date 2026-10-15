import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

function browser(role, overview) {
  const dom = new JSDOM(`<!doctype html><body>
    <nav><a data-nav="dashboard"></a><a data-nav="individual"></a><a data-nav="account"></a></nav>
    <nav class="mobile-dock"><a data-mobile-nav="dashboard"></a><a data-mobile-nav="individual"></a><button data-role="mobile-more"></button></nav>
    <main id="app"></main></body>`, { url: 'https://coach.tsv-lindau.de/#/individual', runScripts: 'outside-only' });
  const window = dom.window;
  window.BT = {
    util: { escapeHTML: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;') },
    sync: { getState: () => ({ user: { id: role === 'player' ? 'u-player' : 'u-coach', role, displayName: role === 'player' ? 'Thomas' : 'Ernesto' } }) },
    api: {
      getIndividualOverview: async () => overview,
      syncIndividualMutations: async mutations => ({ results: mutations.map(item => ({ mutation_id: item.mutationId, applied: true })) }),
      individualAction: async () => ({})
    },
    storage: { getPlayers: () => [
      { id: 'player-1', name: 'Thomas Albrecht' },
      { id: 'player-2', name: 'Adnan Demir' }
    ] }
  };
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
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

const coachData = { ...playerData, role: 'coach', coachNotes: [{ individual_profile_id: profile.id, note: 'Privat' }], aiDrafts: [] };
const coachWindow = browser('coach', coachData);
coachWindow.BT.individualTraining.renderHub(coachWindow.document.querySelector('#app'));
const hubText = coachWindow.document.querySelector('#app').textContent;
assert(hubText.includes('Mannschaft'));
assert(hubText.includes('Individual Training'));
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
coachWindow.document.querySelector('[data-action="open-profile"]').click();
assert(coachWindow.document.querySelector('[data-action="start-live-training"]'), 'Geführter Trainingsstart fehlt');
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

console.log('Individual Training UI: Rollenansichten, Privattrennung, Offline-Queue und Logout erfolgreich.');
