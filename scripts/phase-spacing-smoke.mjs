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

const spacing = await import(
  pathToFileURL(resolve(root, 'js/play-designer/phase-spacing.js')).href
    + '?phase-spacing-smoke=1'
);
const core = globalThis.BT.tactics.__core;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cleanBoard = core.defaultBoard();
const cleanBefore = JSON.stringify(cleanBoard.steps[0].elements);
const cleanSnapped = spacing.snapPhaseReadable(cleanBoard, 0, core);
assert(
  JSON.stringify(cleanSnapped.steps[0].elements) === cleanBefore,
  'Lesbare Aufstellung wird unnötig verschoben'
);

const crowded = core.defaultBoard();
const crowdedStep = crowded.steps[0];
const beneficiary = core.elementById(crowdedStep, 'o1');
const defender = core.elementById(crowdedStep, 'd1');
Object.assign(beneficiary, { x: 250, y: 300 });
Object.assign(defender, { x: 250, y: 300 });

const overlaps = spacing.findOverlaps(crowdedStep, core);
assert(
  overlaps.some(pair => pair.ids.includes('o1') && pair.ids.includes('d1')),
  'Überlappende Spieler werden nicht erkannt'
);

const suggested = spacing.suggestScreenPlacement(
  crowdedStep,
  'o1',
  { x: defender.x, y: defender.y },
  core
);
assert(suggested.targetDefenderId === 'd1', 'Screenvorschlag bindet keinen Verteidiger');
assert(
  core.distance(suggested.point, defender) >= 31,
  'Screenvorschlag liegt weiterhin auf dem Verteidiger'
);

const snapped = spacing.snapPhaseReadable(crowded, 0, core);
const snappedOffense = core.elementById(snapped.steps[0], 'o1');
const snappedDefense = core.elementById(snapped.steps[0], 'd1');
assert(
  core.distance(snappedOffense, snappedDefense) >= 33.9,
  'Lesbar einrasten trennt überlappende Spieler nicht'
);

console.log('CourtHub Phasenrekorder: Abstände und Screen-Platzierung erfolgreich geprüft.');
