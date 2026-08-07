import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><head></head><body><main id="app"></main></body></html>', {
  url: 'https://courthub.test/#/tactics',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
globalThis.SVGElement = window.SVGElement;
globalThis.MutationObserver = window.MutationObserver;
globalThis.requestAnimationFrame = callback => window.setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = id => window.clearTimeout(id);

let sequence = 0;
const settings = new Map();
window.BT = {
  util: { uuid: (prefix = 'id_') => `${prefix}${++sequence}`, toast() {} },
  sync: { getState: () => ({ user: { id: 'coach', role: 'admin' } }) }
};
vm.runInContext(readFileSync(resolve(rootPath, 'js/tactics.js'), 'utf8'), dom.getInternalVMContext(), {
  filename: 'js/tactics.js'
});
window.BT.storage = {
  getSetting: (key, fallback) => settings.has(key) ? settings.get(key) : fallback,
  setSetting: (key, value) => { settings.set(key, value); return value; },
  upsertTactic: value => value,
  getTactics: () => [],
  getTemplates: () => []
};

const core = window.BT.tactics.__core;
const crowded = core.defaultBoard();
Object.assign(core.elementById(crowded.steps[0], 'o1'), { x: 250, y: 300 });
Object.assign(core.elementById(crowded.steps[0], 'd1'), { x: 250, y: 300 });
settings.set('tacticsBoardDraft', crowded);

const editor = await import(
  pathToFileURL(resolve(rootPath, 'js/play-designer/quick-editor.js')).href
    + '?phase-recorder-ui-smoke=1'
);
const target = window.document.getElementById('app');
const view = editor.mountQuickEditor(target);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(view.querySelector('[data-role="tactics-quick"]') || view.dataset.role === 'tactics-quick', 'Phasenrekorder wird nicht gemountet');
assert(view.querySelector('[data-tool="pick-and-roll"]'), 'Pick-and-Roll-Werkzeug fehlt');
assert(view.querySelector('[data-relation="after"]')?.textContent.includes('Danach'), 'Danach-Modus fehlt');
assert(view.querySelector('[data-relation="same"]')?.textContent.includes('Gleichzeitig'), 'Gleichzeitig-Modus fehlt');
assert(view.querySelector('[data-action="cancel-recording"]'), 'Angefangene Aktion kann nicht abgebrochen werden');
assert(view.querySelector('.chq-phase-card'), 'Ablauf wird nicht als Phase dargestellt');
assert(view.querySelector('[data-action="snap-readable"]'), 'Überlappung bietet kein lesbares Einrasten an');

console.log('CourtHub Phasenrekorder: Bedienoberfläche erfolgreich geprüft.');
dom.window.close();
