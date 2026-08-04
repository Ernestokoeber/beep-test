import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let sequence = 0;
globalThis.window = globalThis;
globalThis.BT = { util: { uuid: (prefix = 'id_') => prefix + (++sequence) } };
vm.runInThisContext(readFileSync(resolve(root, 'js/tactics.js'), 'utf8'), {
  filename: 'js/tactics.js'
});
await import(pathToFileURL(resolve(root, 'js/play-designer/timing-fix.js')).href + '?smoke=1');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(left, right, tolerance = 0.01) {
  return Math.abs(left - right) <= tolerance;
}

const core = globalThis.BT.tactics.__core;
const board = core.defaultBoard();
const first = board.steps[0];
first.duration = 2;
const second = core.cloneStep(first);
board.steps.push(second);

const firstO1 = core.elementById(first, 'o1');
const secondO1 = core.elementById(second, 'o1');
Object.assign(secondO1, { x: 360, y: 210 });
first.transition.motions.push({
  id: 'motion_timing',
  type: 'move',
  elementId: 'o1',
  start: 0.8,
  duration: 0.6,
  path: [
    { x: firstO1.x, y: firstO1.y },
    { x: 300, y: 300 },
    { x: secondO1.x, y: secondO1.y }
  ]
});

const firstO2 = core.elementById(first, 'o2');
const secondO2 = core.elementById(second, 'o2');
Object.assign(secondO2, { x: 420, y: 180 });

const beforeMove = globalThis.BT.tactics.snapshotAt(board, 0.5);
const duringMove = globalThis.BT.tactics.snapshotAt(board, 1.1);
const afterMove = globalThis.BT.tactics.snapshotAt(board, 1.6);
assert(near(core.elementById(beforeMove, 'o1').x, firstO1.x), 'Spieler bewegt sich vor seiner Startzeit');
assert(!near(core.elementById(duringMove, 'o1').x, firstO1.x), 'Spieler bewegt sich während des Aktionsfensters nicht');
assert(near(core.elementById(afterMove, 'o1').x, secondO1.x), 'Spieler erreicht nach der Aktion nicht das Ziel');
assert(near(core.elementById(duringMove, 'o2').x, firstO2.x), 'Spieler ohne Laufweg wird unerwartet interpoliert');

const sourceBall = core.elementById(first, 'ball');
const receiver = core.elementById(second, 'o3');
Object.assign(core.elementById(second, 'ball'), { x: receiver.x + 16, y: receiver.y });
first.transition.passes.push({
  id: 'pass_timing',
  type: 'pass',
  fromId: 'o1',
  toId: 'o3',
  start: 1,
  duration: 0.4,
  curve: -30
});

const beforePass = globalThis.BT.tactics.snapshotAt(board, 0.7);
const duringPass = globalThis.BT.tactics.snapshotAt(board, 1.2);
const afterPass = globalThis.BT.tactics.snapshotAt(board, 1.6);
assert(near(core.elementById(beforePass, 'ball').x, sourceBall.x), 'Ball bewegt sich bereits vor Passbeginn');
assert(!near(core.elementById(duringPass, 'ball').x, sourceBall.x), 'Ball wird während des Passes nicht animiert');
assert(near(core.elementById(afterPass, 'ball').x, receiver.x + 16), 'Ball bleibt nach dem Pass nicht beim Empfänger');

first.transition.screens.push({
  id: 'invalid_screen',
  type: 'screen',
  elementId: 'o5',
  start: 9,
  duration: 5,
  x: 250,
  y: 250,
  angle: 0
});
const normalized = globalThis.BT.tactics.normalizeBoard(board);
const fittedScreen = normalized.steps[0].transition.screens.find(action => action.id === 'invalid_screen');
assert(fittedScreen.start >= 0, 'Startzeit wurde negativ normalisiert');
assert(fittedScreen.start + fittedScreen.duration <= normalized.steps[0].duration + 1e-9, 'Aktion liegt außerhalb der Schrittdauer');

const boundary = core.locateTime(normalized, normalized.steps[0].duration);
assert(boundary.index === 1 && near(boundary.elapsed, 0), 'Exakte Schrittgrenze öffnet nicht den nächsten Schritt');

console.log('CourtHub Play Designer: Timing-, Startzeit- und Ballprüfungen erfolgreich.');
