import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://courthub.test/#/tactics',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
globalThis.SVGElement = window.SVGElement;
globalThis.XMLSerializer = window.XMLSerializer;
globalThis.requestAnimationFrame = callback => window.setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = id => window.clearTimeout(id);
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

let sequence = 0;
window.BT = {
  util: { uuid: (prefix = 'id_') => `${prefix}${++sequence}`, toast() {} },
  sync: { getState: () => ({ user: { role: 'coach' } }) }
};
vm.runInContext(readFileSync(resolve(rootPath, 'js/tactics.js'), 'utf8'), dom.getInternalVMContext(), {
  filename: 'js/tactics.js'
});
const core = window.BT.tactics.__core;
const board = core.defaultBoard();
board.title = 'Horns gegen Mann';
board.description = 'Elbow Entry mit klaren Reads.';
board.steps[0].instruction = 'Abstand halten und den Verteidiger lesen.';
board.steps[0].transition.passes.push({ id: 'p1', type: 'pass', fromId: 'o1', toId: 'o5', start: 0, duration: .4, curve: 0 });
board.steps.push(core.cloneStep(board.steps[0]));
board.steps[1].instruction = 'Nach dem Pass sofort schneiden.';
board.steps[1].transition.motions.push({ id: 'm1', type: 'move', elementId: 'o1', kind: 'run', start: 0, duration: 1, path: [{ x: 250, y: 388 }, { x: 320, y: 260 }] });
board.steps.push(core.cloneStep(board.steps[1]));

const previewModule = await import(
  pathToFileURL(resolve(rootPath, 'js/play-designer/play-preview.js')).href
    + '?play-editor-2-preview=1'
);
const animationModule = await import(
  pathToFileURL(resolve(rootPath, 'js/play-designer/animation-player.js')).href
    + '?play-editor-2-animation=1'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const preview = previewModule.createPlayPreview(board, core);
assert(preview.dataset.readonly === 'true', 'Vorschau ist nicht als schreibgeschützt markiert.');
assert(preview.querySelector('h1')?.textContent === 'Horns gegen Mann', 'Playtitel fehlt in der Vorschau.');
assert(preview.querySelectorAll('.chp-phase').length === 2, 'Vorschau zeigt nicht alle fachlichen Phasen.');
assert(preview.querySelectorAll('.chp-phase svg').length === 2, 'Vorschau enthält keine Phasendiagramme.');
assert(preview.textContent.includes('Abstand halten'), 'Traineranweisung fehlt in der Vorschau.');
assert(!preview.querySelector('input, textarea, [contenteditable="true"]'), 'Vorschau enthält bearbeitbare Felder.');

const player = animationModule.createAnimationPlayer(board, core);
assert(player.element.querySelector('[data-action="animation-toggle"]'), 'Play/Pause fehlt im Animationsplayer.');
assert(player.element.querySelector('[data-action="animation-reset"]'), 'Zurücksetzen fehlt im Animationsplayer.');
assert(player.element.querySelector('[data-role="animation-progress"]'), 'Fortschrittsregler fehlt im Animationsplayer.');
assert(player.element.querySelectorAll('[data-phase-marker]').length === 2, 'Phasengrenzen fehlen im Animationsplayer.');
assert([...player.element.querySelectorAll('[data-speed]')].map(button => button.dataset.speed).join(',') === '0.5,1,1.5', 'Vorgesehene Geschwindigkeiten fehlen.');
player.destroy();

console.log('CourtHub Play Editor 2.0: Vorschau und Animation erfolgreich geprüft.');
dom.window.close();
