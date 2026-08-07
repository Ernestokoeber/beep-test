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
await import(pathToFileURL(resolve(root, 'js/play-designer/timing-fix.js')).href + '?quick-smoke=1');
const quick = await import(pathToFileURL(resolve(root, 'js/play-designer/quick-core.js')).href + '?quick-smoke=1');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const core = globalThis.BT.tactics.__core;
let board = core.defaultBoard();
const first = board.steps[0];
const ball = core.elementById(first, 'ball');
const carrier = core.elementById(first, 'o1');
Object.assign(ball, { x: carrier.x + 16, y: carrier.y });

board = quick.addQuickMove(board, {
  stepIndex: 0,
  relation: 'after',
  actorId: 'o1',
  path: [{ x: 250, y: 388 }, { x: 290, y: 320 }, { x: 342, y: 238 }]
}, core);
assert(board.steps.length === 2, 'Schnellmodus hat keinen Zielschritt für den Laufweg erzeugt');
assert(board.steps[0].transition.motions.length === 1, 'Laufweg wurde nicht angelegt');
assert(quick.quickStepLabel(board.steps[0], core).startsWith('Dribbling'), 'Ballführender Laufweg wird nicht als Dribbling bezeichnet');
assert(board.steps[0].transition.motions[0].kind === 'dribble', 'Ballführender Laufweg speichert keinen Dribbling-Typ');

board = quick.addQuickScreen(board, {
  stepIndex: 0,
  relation: 'same',
  actorId: 'o5',
  beneficiaryId: 'o1',
  targetDefenderId: 'd1',
  point: { x: 300, y: 290 }
}, core);
assert(board.steps[0].transition.screens.length === 1, 'Gleichzeitiger Screen wurde nicht angelegt');
assert(board.steps[0].transition.motions.some(action => action.elementId === 'o5'), 'Screensteller bewegt sich nicht automatisch zur Screenposition');
assert(board.steps[0].transition.screens[0].beneficiaryId === 'o1', 'Screen ist nicht an den begünstigten Spieler gebunden');
assert(board.steps[0].transition.screens[0].targetDefenderId === 'd1', 'Screen verliert den Zielverteidiger');

board = quick.addQuickPass(board, {
  stepIndex: 0,
  relation: 'after',
  fromId: 'o1',
  toId: 'o3'
}, core);
assert(board.steps.length >= 3, 'Sequenzieller Pass wurde nicht in einen neuen Ablauf verschoben');
assert(board.steps[1].transition.passes.length === 1, 'Pass wurde nicht im folgenden Ablauf angelegt');

board = quick.addQuickPickAndRoll(board, {
  stepIndex: 1,
  relation: 'after',
  handlerId: 'o1',
  screenerId: 'o5',
  screenPoint: { x: 286, y: 286 },
  handlerPath: [{ x: 342, y: 238 }, { x: 330, y: 205 }],
  rollPath: [{ x: 286, y: 286 }, { x: 250, y: 108 }]
}, core);
const pickAndRollStep = board.steps[2];
const grouped = quick.stepActions(pickAndRollStep, core)
  .filter(action => action.groupType === 'pick-and-roll');
assert(grouped.length === 3, 'Pick-and-Roll erzeugt nicht genau drei verbundene Aktionen');
assert(new Set(grouped.map(action => action.groupId)).size === 1, 'Pick-and-Roll-Aktionen teilen keine Gruppen-ID');
assert(grouped.some(action => action.groupRole === 'handler'), 'Pick-and-Roll enthält keinen Ballhandlerweg');
assert(grouped.some(action => action.groupRole === 'roll'), 'Pick-and-Roll enthält keinen Rollweg');

board = quick.addQuickPause(board, {
  stepIndex: 2,
  duration: 0.8
}, core);
assert(board.steps[3].transition.motions.length === 0, 'Pause enthält unerwartete Laufwege');
assert(Math.abs(board.steps[3].duration - 0.8) < 0.001, 'Pause besitzt nicht die gewünschte Dauer');

const total = globalThis.BT.tactics.boardDuration(board);
assert(total > 0, 'Schnellmodus erzeugt keine gültige Gesamtdauer');
assert(board.steps.every(step => quick.stepActions(step, core).every(action => action.start + action.duration <= step.duration + 1e-9)), 'Automatisches Timing liegt außerhalb der Schrittdauer');

console.log('CourtHub Schnellmodus: Ablauf- und Timing-Prüfungen erfolgreich.');
