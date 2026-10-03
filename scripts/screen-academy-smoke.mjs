import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: null, BT: {}, console, Date };
context.window = context;
vm.createContext(context);
vm.runInContext(readFileSync(resolve(root, 'js/screen-academy.js'), 'utf8'), context, { filename: 'js/screen-academy.js' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const academy = context.BT.screenAcademy;
assert(academy, 'Screen-Akademie wurde nicht registriert.');
assert(academy.catalog.length >= 40, 'Das Nachschlagewerk enthält nicht alle wesentlichen Screen-Varianten.');
assert(academy.categories.length === 5, 'Die fünf Screen-Gruppen fehlen.');

const coreItems = academy.catalog.filter(item => item.core);
assert(coreItems.length >= 12, 'Der Lehrpfad für Dienstag benötigt mindestens zwölf Kernaktionen.');
assert(coreItems.every(item => item.demo), 'Jede Kernaktion benötigt eine Taktikboard-Demonstration.');

for (const item of academy.catalog.filter(entry => entry.demo)) {
  const board = academy.buildDemo(item.id);
  assert(board?.steps?.length >= 2, `${item.title} besitzt keine vollständige Animation.`);
  const transition = board.steps[0].transition;
  assert(transition.motions.length > 0, `${item.title} besitzt keine Lauf- oder Dribbelbewegung.`);
  assert(transition.screens.length > 0, `${item.title} besitzt keinen sichtbaren Screen.`);
  assert(board.description.includes(item.description), `${item.title} verliert seine fachliche Erklärung im Taktikboard.`);
}

const pnr = academy.buildDemo('pick-roll');
assert(pnr.steps[0].transition.screens.some(screen => screen.groupType === 'pick-and-roll'), 'Pick & Roll ist nicht als verbundene Aktion markiert.');
assert(pnr.steps[0].transition.motions.some(motion => motion.kind === 'dribble'), 'Pick & Roll enthält kein Ballhandler-Dribbling.');

const dho = academy.buildDemo('dho');
assert(dho.steps[0].transition.screens.some(screen => screen.groupType === 'handoff'), 'DHO ist nicht als Übergabe markiert.');
assert(dho.steps[0].transition.passes.some(pass => pass.fromId === 'o5' && pass.toId === 'o1'), 'DHO übergibt den Ball nicht korrekt.');

const date = academy.nextTuesdayLabel(new Date(2026, 9, 3));
assert(date.includes('06.10'), `Der Dienstag-Lehrpfad zeigt das falsche Datum: ${date}`);

console.log('CourtHub Screen-Akademie: Katalog, Lehrpfad und Animationen erfolgreich geprüft.');
