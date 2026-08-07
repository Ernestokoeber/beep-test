import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
const { window } = dom;
window.BT = { util: { uuid: prefix => `${prefix}test_${Math.random().toString(36).slice(2, 8)}` } };
window.eval(readFileSync(resolve(root, 'js/tactics.js'), 'utf8'));
globalThis.window = window;
globalThis.document = window.document;

const { reorderQuickFlows } = await import('../js/play-designer/quick-reorder.js');
const core = window.BT.tactics.__core;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function move(step, next, id, dx, dy, name) {
  const actor = core.elementById(step, id);
  const target = core.elementById(next, id);
  target.x = actor.x + dx;
  target.y = actor.y + dy;
  step.duration = 1.2;
  step.transition.motions.push({
    id: name,
    type: 'move',
    elementId: id,
    start: 0,
    duration: 1,
    path: [{ x: actor.x, y: actor.y }, { x: target.x, y: target.y }]
  });
}

const board = core.defaultBoard();
const step0 = board.steps[0];
const step1 = core.cloneStep(step0);
const step2 = core.cloneStep(step1);
const final = core.cloneStep(step2);
board.steps = [step0, step1, step2, final];
step0.phaseId = 'phase-one';
step1.phaseId = 'phase-two';
step2.phaseId = 'phase-three';
final.phaseId = 'phase-final';

move(step0, step1, 'o1', 52, -30, 'move-o1');
Object.assign(core.elementById(step2, 'o1'), core.point(core.elementById(step1, 'o1')));
Object.assign(core.elementById(final, 'o1'), core.point(core.elementById(step2, 'o1')));

move(step1, step2, 'o2', 38, -46, 'move-o2');
step1.transition.motions[0].groupId = 'pnr-two';
step1.transition.motions[0].groupType = 'pick-and-roll';
step1.transition.motions[0].groupRole = 'handler';
Object.assign(core.elementById(final, 'o2'), core.point(core.elementById(step2, 'o2')));

const screener = core.elementById(step2, 'o5');
step2.transition.screens.push({
  id: 'screen-o5', type: 'screen', elementId: 'o5', start: .2, duration: .7,
  x: screener.x + 14, y: screener.y - 8, angle: 35,
  beneficiaryId: 'o2', groupId: 'pnr-three', groupType: 'pick-and-roll'
});
step2.duration = 1.1;
board.currentStep = 1;

const reordered = reorderQuickFlows(board, 1, 0, core);
assert(reordered.steps.length === 4, 'Beim Sortieren ging ein Ablauf verloren');
assert(reordered.steps[0].transition.motions[0]?.id === 'move-o2', 'Gezogener Ablauf steht nicht an der neuen Position');
assert(reordered.steps[1].transition.motions[0]?.id === 'move-o1', 'Verdrängter Ablauf wurde nicht nach hinten gesetzt');
assert(reordered.steps[2].transition.screens[0]?.id === 'screen-o5', 'Späterer Screen ging beim Sortieren verloren');
assert(reordered.currentStep === 0, 'Aktiver Ablauf folgt seiner neuen Position nicht');
assert(reordered.steps[0].phaseId === 'phase-two', 'Phase-ID folgt dem verschobenen Ablauf nicht');
assert(reordered.steps[1].phaseId === 'phase-one', 'Phase-ID des verdrängten Ablaufs geht verloren');
assert(reordered.steps[3].phaseId === 'phase-final', 'Abschlusszustand verliert seine Phase-ID');
assert(reordered.steps[0].transition.motions[0].groupId === 'pnr-two', 'Pick-&-Roll-Gruppe geht beim Sortieren verloren');
assert(reordered.steps[2].transition.screens[0].beneficiaryId === 'o2', 'Screen-Zuordnung geht beim Sortieren verloren');

const startO2 = core.elementById(reordered.steps[0], 'o2');
const pathO2 = reordered.steps[0].transition.motions[0].path;
assert(core.distance(startO2, pathO2[0]) < .01, 'Neu sortierter Laufweg beginnt nicht am Spieler');
assert(Math.round(pathO2.at(-1).x - pathO2[0].x) === 38, 'Laufweg-Vektor wurde beim Sortieren verändert');
assert(Math.round(pathO2.at(-1).y - pathO2[0].y) === -46, 'Laufweg-Richtung wurde beim Sortieren verändert');

const startO1 = core.elementById(reordered.steps[1], 'o1');
const pathO1 = reordered.steps[1].transition.motions[0].path;
assert(core.distance(startO1, pathO1[0]) < .01, 'Zweiter Laufweg erzeugt nach dem Sortieren einen Positionssprung');
assert(Math.round(pathO1.at(-1).x - pathO1[0].x) === 52, 'Zweiter Laufweg verliert seine horizontale Bewegung');

const screenStep = reordered.steps[2];
const translatedScreen = screenStep.transition.screens[0];
const translatedScreener = core.elementById(screenStep, 'o5');
assert(Math.round(translatedScreen.x - translatedScreener.x) === 14, 'Screenposition wurde nicht relativ zum Spieler übertragen');
assert(Math.round(translatedScreen.y - translatedScreener.y) === -8, 'Screenposition wurde vertikal verfälscht');

console.log('CourtHub Schnellmodus: Drag-and-drop-Reihenfolge erfolgreich geprüft.');
dom.window.close();
