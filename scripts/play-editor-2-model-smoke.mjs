import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = {
  console,
  Date,
  Math,
  JSON,
  setTimeout,
  clearTimeout,
  window: {
    BT: {
      util: { uuid: prefix => `${prefix || 'id_'}test` },
      sync: { getState: () => ({ user: { role: 'coach' } }) }
    }
  }
};
context.window.window = context.window;
context.BT = context.window.BT;
vm.createContext(context);
vm.runInContext(readFileSync(resolve(root, 'js/tactics.js'), 'utf8'), context, {
  filename: 'js/tactics.js'
});

globalThis.window = context.window;
const recorder = await import(
  pathToFileURL(resolve(root, 'js/play-designer/phase-recorder-core.js')).href
    + '?play-editor-2-model=1'
);
const core = context.window.BT.tactics.__core;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const oldBoard = {
  schemaVersion: 2,
  title: 'Altes Horns Play',
  description: 'Bestehender Datensatz',
  category: 'Horns',
  tags: ['Horns', 'Mann-Offense', 'Horns'],
  archived: true,
  steps: [{
    id: 'legacy-step',
    duration: 1.8,
    elements: [
      { id: 'o1', type: 'offense', role: '1', x: 250, y: 388 },
      { id: 'd1', type: 'defense', role: 'X1', x: 250, y: 338 },
      { id: 'ball', type: 'ball', x: 266, y: 388 }
    ],
    transition: { motions: [], passes: [], screens: [] }
  }]
};

const migrated = recorder.normalizeRecordedBoard(oldBoard, core);
assert(migrated.schemaVersion >= 3, 'Das erweiterte Schema wurde nicht gesetzt.');
assert(migrated.steps[0].instruction === '', 'Alte Phasen erhalten keine leere Traineranweisung.');
assert(core.elementById(migrated.steps[0], 'd1').defenseMode === 'man', 'Alte Verteidiger werden nicht als Mannverteidigung migriert.');
assert(core.elementById(migrated.steps[0], 'd1').x === 250, 'Die Migration verändert gespeicherte Geometrie.');
assert(JSON.stringify(migrated.tags) === JSON.stringify(['Horns', 'Mann-Offense']), 'Tags werden nicht stabil normalisiert.');
assert(migrated.archived === true, 'Archivstatus geht bei der Migration verloren.');

const mixed = core.copy(migrated);
core.elementById(mixed.steps[0], 'd1').defenseMode = 'zone';
mixed.steps[0].instruction = 'X1 bleibt in der Zone.';
mixed.steps.push(core.cloneStep(mixed.steps[0]));
const normalizedMixed = recorder.normalizeRecordedBoard(mixed, core);
assert(core.elementById(normalizedMixed.steps[0], 'd1').defenseMode === 'zone', 'Zonenverteidigung geht bei der Normalisierung verloren.');
assert(core.elementById(normalizedMixed.steps[1], 'd1').defenseMode === 'zone', 'Verteidigungsart wird nicht in die Folgephase übernommen.');
assert(normalizedMixed.steps[0].instruction === 'X1 bleibt in der Zone.', 'Traineranweisung geht beim Laden verloren.');
assert(normalizedMixed.steps[1].instruction === '', 'Eine duplizierte Folgephase übernimmt ungewollt die vorherige Traineranweisung.');

const inbound = core.defaultBoard();
Object.assign(core.elementById(inbound.steps[0], 'o1'), { x: -10, y: 120 });
Object.assign(core.elementById(inbound.steps[0], 'ball'), { x: 6, y: 120 });
inbound.steps[0].transition.motions.push({
  id: 'inbound-cut', type: 'move', elementId: 'o1', start: 0, duration: 1,
  path: [{ x: -10, y: 120 }, { x: 80, y: 120 }]
});
const normalizedInbound = recorder.normalizeRecordedBoard(inbound, core);
assert(core.elementById(normalizedInbound.steps[0], 'o1').x === -10, 'Einwerfer wird beim Speichern zurück auf das Spielfeld gesetzt.');
assert(normalizedInbound.steps[0].transition.motions[0].path[0].x === -10, 'Ein Laufweg darf nicht außerhalb des Spielfelds beginnen.');
assert(core.point({ x: -100, y: 800 }).x === core.positionBounds.minX, 'Linker Außenbereich wird nicht sicher begrenzt.');
assert(core.point({ x: -100, y: 800 }).y === core.positionBounds.maxY, 'Unterer Außenbereich wird nicht sicher begrenzt.');
assert(core.ballPointForPlayer({ x: 510, y: 120 }).x < 510, 'Ball wird beim rechten Seiteneinwurf außerhalb des sichtbaren Bereichs platziert.');

console.log('CourtHub Play Editor 2.0: Datenmodell und Migration erfolgreich geprüft.');
