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
globalThis.CustomEvent = window.CustomEvent;
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

const core = window.BT.tactics.__core;
const board = core.defaultBoard();
board.title = 'Horns 2.0';
board.steps[0].instruction = 'Spacing halten.';
board.steps.push(core.cloneStep(board.steps[0]));
settings.set('tacticsBoardDraft', board);
window.BT.storage = {
  getSetting: (key, fallback) => settings.has(key) ? settings.get(key) : fallback,
  setSetting: (key, value) => { settings.set(key, value); return value; },
  upsertTactic: value => value,
  getTactics: () => [],
  getTemplates: () => []
};

const editor = await import(
  pathToFileURL(resolve(rootPath, 'js/play-designer/quick-editor.js')).href
    + '?play-editor-2-shell=1'
);
const view = editor.mountQuickEditor(window.document.getElementById('app'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(view.classList.contains('chq-focus-shell'), 'Der Editor besitzt keine fokussierte Vollbildhülle.');
assert(view.querySelector('[data-action="back-library"]'), 'Zurück zur Taktikbibliothek fehlt.');
assert(view.querySelector('[data-role="save-state"]'), 'Speicherzustand fehlt.');
assert(view.querySelector('[data-action="preview"]'), 'Vorschau fehlt in der Kopfzeile.');
assert(view.querySelector('[data-action="export"]'), 'Gemeinsamer Exportzugang fehlt in der Kopfzeile.');
assert(view.querySelector('[data-role="phase-rail"]'), 'Linke Phasenleiste fehlt.');
assert(view.querySelector('.chq-phase-thumbnail svg'), 'Phasenleiste zeigt kein echtes Spielfeld-Vorschaubild.');
assert(view.querySelector('[data-phase-menu] [data-phase-action="duplicate"]'), 'Phasen-Kontextmenü kann nicht duplizieren.');
assert(view.querySelector('[data-phase-menu] [data-phase-action="delete"]'), 'Phasen-Kontextmenü kann nicht löschen.');
assert(view.querySelector('[data-action="insert-phase"]'), 'Phase kann nicht direkt eingefügt werden.');
assert(view.querySelector('[data-role="right-panel"] [data-tab="timeline"]'), 'Timeline-Reiter fehlt.');
assert(view.querySelector('[data-role="right-panel"] [data-tab="instructions"]'), 'Anweisungs-Reiter fehlt.');
assert(view.querySelector('[data-action="toggle-inspector"]'), 'Einklappbarer Tablet-/Smartphone-Inspector fehlt.');
assert(view.querySelector('[data-role="timeline"]'), 'Aktions-Timeline fehlt.');
const instruction = view.querySelector('[data-role="phase-instruction"]');
assert(instruction && instruction.value === 'Spacing halten.', 'Phasenanweisung wird nicht geladen.');
assert(view.querySelector('[data-defense-mode="man"]'), 'Werkzeug für Mannverteidigung fehlt.');
assert(view.querySelector('[data-defense-mode="zone"]'), 'Werkzeug für Zonenverteidigung fehlt.');

console.log('CourtHub Play Editor 2.0: Fokus-Editor erfolgreich geprüft.');
dom.window.close();
