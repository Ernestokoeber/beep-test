import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../js/training.js', import.meta.url), 'utf8');
const dom = new JSDOM('<!doctype html><html><body><button id="replan">◇ Stationen aktualisieren</button></body></html>', {
  url: 'https://coach.tsv-lindau.de/#/training/tr_friday',
  runScripts: 'outside-only'
});
const { window } = dom;

let resolvePlanning;
const planningFinished = new Promise(resolve => { resolvePlanning = resolve; });
const calls = [];
const updatedTraining = {
  id: 'tr_friday',
  date: '2026-10-16',
  planning: { source: 'ai-friday-stations' },
  stationTraining: { source: 'gemini', players: { p1: { developmentFocuses: [{ observation: 'Ball sichern' }] } } }
};

window.BT = {
  util: {
    $: (selector, root = window.document) => root.querySelector(selector),
    $$: (selector, root = window.document) => [...root.querySelectorAll(selector)],
    renderTemplate: () => window.document.createElement('section'),
    formatDate: value => value,
    todayISO: () => '2026-10-12',
    escapeHTML: value => String(value ?? ''),
    downloadCSV() {}, downloadJSON() {}, downloadBlob() {},
    toast() {}
  },
  seasonplanner: {
    async generateFridayTraining(friday, game, existing) {
      calls.push({ friday, game, existing });
      await planningFinished;
      return updatedTraining;
    }
  }
};

window.eval(source);

const button = window.document.querySelector('#replan');
const existing = { id: 'tr_friday', date: '2026-10-16', stationTraining: { source: 'gemini' } };
const game = { id: 'game_weekend', date: '2026-10-17' };
const pending = window.BT.training.replanFridayTraining(button, existing.date, game, existing);

assert.equal(button.disabled, true, 'Der Knopf bleibt während der KI-Neuplanung bedienbar');
assert.equal(button.textContent, 'KI plant …', 'Der Knopf zeigt die laufende Neuplanung nicht an');
assert.deepEqual(calls, [{ friday: '2026-10-16', game, existing }], 'Die KI-Neuplanung erhält nicht das bestehende Freitagstraining');

resolvePlanning();
assert.equal(await pending, updatedTraining, 'Das neu berechnete Freitagstraining wird nicht zurückgegeben');
assert.equal(button.disabled, false, 'Der Knopf bleibt nach erfolgreicher Neuplanung gesperrt');
assert.equal(button.textContent, '◇ Stationen aktualisieren', 'Der Knopf erhält nach der Neuplanung nicht seine Beschriftung zurück');

dom.window.close();
console.log('Freitagstraining: bestehender Plan wird über die KI-Neuplanung aktualisiert.');
