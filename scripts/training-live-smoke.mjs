import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../js/training-live.js', import.meta.url), 'utf8');
const dom = new JSDOM('<!doctype html><html><body><button data-action="training-live"></button></body></html>', {
  url: 'https://coach.tsv-lindau.de/#/training/test',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
let currentTime = new Date('2026-10-06T18:20:00.000Z').getTime();
window.Date.now = () => currentTime;
window.confirm = () => true;
const saved = new Map();
const training = {
  id: 'test',
  date: '2026-10-06',
  startTime: '20:20',
  attendance: [
    { playerId: 'p1', status: 'present' },
    { playerId: 'p2', status: 'present' },
    { playerId: 'p3', status: null }
  ],
  plan: {
    durationMinutes: 100,
    summary: 'No Middle, Helpside, Horns und 5-Out',
    drills: [
      { name: '<img src=x onerror=alert(1)> Dual-Ball Warm-up', minutes: 10, intensity: 'medium', description: 'Kommunikation; Spacing' },
      { name: 'Flex live 5-gegen-5', minutes: 20, intensity: 'high', description: 'Lesen und frei weiterspielen' },
      { name: 'No-Middle Helpside', minutes: 25, intensity: 'high', description: '' },
      { name: 'Horns / 5-Out Decision Game', minutes: 25, intensity: 'high', description: 'Pass & Cut' },
      { name: '2 × 10 Minuten 5-gegen-5', minutes: 20, intensity: 'high', description: 'Transition nach jedem Wurf' }
    ]
  }
};
saved.set(training.id, training);
window.BT = {
  storage: {
    getTraining: id => saved.get(id),
    upsertTraining: value => { saved.set(value.id, JSON.parse(JSON.stringify(value))); return value; },
    getTactics: () => []
  },
  util: { toast() {} },
  wake: { acquire() {}, release() {} },
  audio: { levelBeep() {} },
  tactics: {
    templates: () => [],
    normalizeBoard: value => value,
    __core: {}
  }
};
window.eval(source);

const core = window.BT.trainingLive.__test;
const session = core.createSession(training, currentTime);
assert.equal(session.blocks.length, 5, 'Alle Planblöcke müssen in Training Live übernommen werden');
assert.equal(session.plannedSeconds, 6000, 'Die geplanten 100 Minuten wurden nicht übernommen');
assert.equal(session.presentCount, 2, 'Anwesenheit wird beim Start nicht eingefroren');
assert.equal(session.blocks[0].status, 'active');
assert.equal(session.blocks[1].status, 'pending');

core.toggle(session, currentTime);
currentTime += 31_000;
assert.equal(core.blockElapsed(session.blocks[0], currentTime), 31_000, 'Laufende Blockzeit holt Hintergrundzeit nicht nach');
core.adjust(session, 60, currentTime);
assert.equal(session.blocks[0].durationSeconds, 660, 'Block lässt sich nicht um eine Minute verlängern');
core.moveTo(session, 1, { finishCurrent: true }, currentTime);
assert.equal(session.blocks[0].status, 'completed');
assert.equal(session.blocks[0].elapsedMs, 31_000);
assert.equal(session.blocks[1].status, 'active');
assert.equal(session.blocks[1].runningSince, null, 'Nächster Block darf nicht unbeabsichtigt automatisch starten');

core.moveTo(session, 2, {}, currentTime);
assert.equal(session.blocks[1].status, 'pending', 'Beim direkten Blockwechsel dürfen nicht mehrere Blöcke aktiv bleiben');
assert.equal(session.blocks[2].status, 'active');
core.moveTo(session, 1, {}, currentTime);
assert.equal(session.blocks[2].status, 'pending');
assert.equal(session.blocks[1].status, 'active');

currentTime += 1_000;
core.toggle(session, currentTime);
currentTime += 12_000;
const resumed = core.normalizeSession(training, JSON.parse(JSON.stringify(session)), currentTime);
assert.equal(core.blockElapsed(resumed.blocks[1], currentTime), 12_000, 'Reload verliert die laufende Blockzeit');
const defensePoints = core.coachingPoints(resumed.blocks[2], training).join(' ');
assert.match(defensePoints, /Mitte schließen/);
assert.match(defensePoints, /Helpside/);
core.finishSession(resumed, currentTime);
assert.equal(resumed.status, 'completed');
assert.equal(resumed.blocks[2].status, 'skipped');
assert.equal(resumed.report.completedBlocks, 2);
assert.equal(resumed.report.skippedBlocks, 3);

// DOM-Abnahme: große Live-Ansicht, Bewertung, Notiz, Blockwechsel und Abschluss.
currentTime += 60_000;
assert.equal(window.BT.trainingLive.open(training.id), true);
assert(window.document.querySelector('.training-live'), 'Training-Live-Vollbild fehlt');
assert.equal(window.document.querySelector('.training-live img'), null, 'Drillname wird als HTML ausgeführt');
assert.match(window.document.querySelector('[data-live="block-name"]').textContent, /Dual-Ball/);
window.document.querySelector('[data-live-action="toggle"]').click();
currentTime += 8_000;
window.document.querySelector('[data-live-rating="worked"]').click();
const note = window.document.querySelector('[data-live="note"]');
note.value = 'Kommunikation war laut und klar';
note.dispatchEvent(new window.Event('input', { bubbles: true }));
window.document.querySelector('[data-live-action="next"]').click();
assert.equal(window.document.querySelector('[data-live="block-name"]').textContent, 'Flex live 5-gegen-5');
assert.equal(saved.get(training.id).liveSession.blocks[0].rating, 'worked');
assert.equal(saved.get(training.id).liveSession.blocks[0].note, 'Kommunikation war laut und klar');
window.document.querySelector('[data-live-action="finish"]').click();
assert.equal(saved.get(training.id).status, 'completed', 'Live-Abschluss markiert das Training nicht als absolviert');
assert.equal(saved.get(training.id).liveSession.status, 'completed');
assert.equal(window.document.querySelector('[data-live="summary-view"]').hidden, false, 'Abschlussauswertung bleibt verborgen');
assert(window.document.querySelectorAll('.training-live-report-item').length === 5, 'Abschlussbericht enthält nicht alle Blöcke');
window.BT.trainingLive.close();
assert.equal(window.document.querySelector('.training-live'), null);
assert.equal(window.document.documentElement.classList.contains('training-live-open'), false);

const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
assert(serviceWorker.includes("'./js/training-live.js'"), 'Training Live fehlt im Offline-Cache');
assert(serviceWorker.includes("'./training-live.css'"), 'Training-Live-CSS fehlt im Offline-Cache');

dom.window.close();
console.log('Training Live: Ablauf, Reload, Zeiten, Bewertung, Abschluss, XSS und Offline-Cache erfolgreich.');
