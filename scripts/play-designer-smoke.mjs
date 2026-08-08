import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let sequence = 0;
const context = {
  window: null,
  BT: { util: { uuid: (prefix = 'id_') => prefix + (++sequence) } },
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(readFileSync(resolve(root, 'js/tactics.js'), 'utf8'), context, { filename: 'js/tactics.js' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tactics = context.BT.tactics;
const legacy = tactics.normalizeBoard({
  players: [{ id: 'p1', label: '1', x: 120, y: 380 }],
  ball: { x: 250, y: 380 },
  arrows: [{ x1: 1, y1: 2, x2: 3, y2: 4, style: 'pass' }],
  texts: [{ x: 1, y: 2, text: 'Horns' }]
});
assert(legacy.schemaVersion === 3, 'Play-Schema wurde nicht auf Version 3 migriert');
assert(legacy.steps[0].elements.filter(item => item.type === 'offense').length === 1, 'Legacy-Spieler wurde nicht migriert');
assert(legacy.steps[0].elements.some(item => item.type === 'arrow' && item.kind === 'pass'), 'Legacy-Pass wurde nicht migriert');

const horns = tactics.templates().find(item => item.id === 'horns')?.board;
assert(horns && horns.steps.length >= 2, 'Horns-Vorlage benötigt mindestens zwei Keyframes');
assert(horns.steps[0].transition.motions.length > 0, 'Horns-Vorlage enthält keinen animierten Laufweg');
assert(horns.steps[0].transition.passes.length > 0, 'Horns-Vorlage enthält keinen animierten Pass');
assert(horns.steps[0].transition.screens.length > 0, 'Horns-Vorlage enthält keinen Screen');

const before = tactics.snapshotAt(horns, 0);
const during = tactics.snapshotAt(horns, 1.2);
const startGuard = before.elements.find(item => item.id === 'o1');
const movingGuard = during.elements.find(item => item.id === 'o1');
assert(startGuard && movingGuard, 'Point Guard fehlt in der Animation');
assert(startGuard.x !== movingGuard.x || startGuard.y !== movingGuard.y, 'Gebogener Laufweg wird nicht interpoliert');
assert(tactics.boardDuration(horns) > 0, 'Play-Dauer ist ungültig');

console.log('CourtHub Play Designer V2: Kernprüfungen erfolgreich.');
