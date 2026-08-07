import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let sequence = 0;
globalThis.window = globalThis;
globalThis.BT = { util: { uuid: (prefix = 'id_') => `${prefix}${++sequence}` } };
vm.runInThisContext(readFileSync(resolve(root, 'js/tactics.js'), 'utf8'), {
  filename: 'js/tactics.js'
});

const recorder = await import(
  pathToFileURL(resolve(root, 'js/play-designer/phase-recorder-core.js')).href
    + '?phase-recorder-core-smoke=1'
);
const core = globalThis.BT.tactics.__core;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const legacy = core.defaultBoard();
delete legacy.steps[0].phaseId;
legacy.steps[0].transition.motions.push({
  id: 'legacy-move', type: 'move', elementId: 'o1', start: 0, duration: 1.5,
  path: [{ x: 250, y: 388 }, { x: 300, y: 300 }]
});
legacy.steps[0].transition.passes.push({
  id: 'legacy-pass', type: 'pass', fromId: 'o1', toId: 'o2', start: .2, duration: .4
});
legacy.steps[0].transition.screens.push({
  id: 'legacy-screen', type: 'screen', elementId: 'o5', beneficiaryId: 'o1',
  start: .3, duration: .8, x: 280, y: 280, angle: 20
});

const original = JSON.stringify(legacy);
const normalized = recorder.normalizeRecordedBoard(legacy, core);
assert(JSON.stringify(legacy) === original, 'Normalisierung verändert das gespeicherte Original');
assert(normalized.steps[0].phaseId, 'Alter Schritt erhält keine stabile Phase-ID');
assert(normalized.steps[0].transition.motions[0].kind === 'run', 'Alter Lauf erhält keinen eindeutigen Typ');

const step = normalized.steps[0];
const pass = step.transition.passes[0];
const screen = step.transition.screens[0];
assert(
  recorder.describeRecordedAction(step, pass, core) === '1 passt zu 2',
  'Pass wird nicht in Trainersprache beschrieben'
);
assert(
  recorder.describeRecordedAction(step, screen, core) === '5 stellt einen Screen für 1',
  'Gebundener Screen wird nicht verständlich beschrieben'
);

recorder.applyPhaseTiming(step, core);
assert(Math.abs(step.duration - 1.65) < .001, 'Phasendauer folgt nicht der längsten parallelen Aktion');
assert(recorder.recordedActions(step, core).length === 3, 'Phasenaktionen werden nicht vollständig gesammelt');

const grouped = recorder.normalizeRecordedBoard(core.defaultBoard(), core);
grouped.steps[0].transition.motions.push(
  {
    id: 'pnr-handler', type: 'move', elementId: 'o1', start: 0, duration: .8,
    path: [{ x: 250, y: 388 }, { x: 280, y: 300 }],
    groupId: 'pnr-1', groupType: 'pick-and-roll', groupRole: 'handler'
  },
  {
    id: 'pnr-roll', type: 'move', elementId: 'o5', start: 0, duration: .8,
    path: [{ x: 250, y: 250 }, { x: 250, y: 170 }],
    groupId: 'pnr-1', groupType: 'pick-and-roll', groupRole: 'roll'
  }
);
grouped.steps[0].transition.screens.push({
  id: 'pnr-screen', type: 'screen', elementId: 'o5', beneficiaryId: 'o1',
  start: 0, duration: .6, x: 260, y: 310, angle: 20,
  groupId: 'pnr-1', groupType: 'pick-and-roll'
});
const withoutGroup = recorder.removeRecordedAction(grouped, 0, 'pnr-screen', 'group', core);
assert(
  recorder.recordedActions(withoutGroup.steps[0], core).every(action => action.groupId !== 'pnr-1'),
  'Pick & Roll wird beim gruppierten Löschen nicht vollständig entfernt'
);

console.log('CourtHub Phasenrekorder: Metadaten und Timing erfolgreich geprüft.');
