import { JSDOM } from 'jsdom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const library = await import(
  pathToFileURL(resolve(rootPath, 'js/play-designer/play-library.js')).href
    + '?play-editor-2-library=1'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const plays = [
  { id: 'horns', title: 'Horns Elbow', category: 'Horns', description: 'Gegen Mann', tags: ['Mann-Offense'], updatedAt: '2026-08-08T09:00:00Z', steps: [] },
  { id: 'zone', title: '2-3 Zone Flash', category: 'Offense', description: 'High Post', tags: ['Zone-Offense'], updatedAt: '2026-08-07T09:00:00Z', steps: [] },
  { id: 'pnr', title: 'Spread Pick & Roll', category: 'Pick & Roll', description: '', tags: [], updatedAt: '2026-08-06T09:00:00Z', steps: [] }
];

const filtered = library.filterAndSortPlays(plays, { query: 'elbow', filter: 'horns', sort: 'title' });
assert(filtered.length === 1 && filtered[0].id === 'horns', 'Suche und Filter arbeiten nicht gemeinsam.');
const latest = library.filterAndSortPlays(plays, { sort: 'updated' });
assert(latest[0].id === 'horns', 'Sortierung nach zuletzt geändert ist falsch.');

const root = library.createPlayLibrary({ plays, collections: [{ id: 'book-1', title: 'Herren Playbook', playIds: ['horns'] }] });
assert(root.querySelector('[data-role="library-search"]'), 'Bibliothekssuche fehlt.');
for (const filter of ['man-offense', 'zone-offense', 'pick-and-roll', 'horns', 'inbound', 'press-break']) {
  assert(root.querySelector(`[data-library-filter="${filter}"]`), `Filter ${filter} fehlt.`);
}
assert(root.querySelector('[data-role="library-sort"] option[value="updated"]'), 'Sortierung nach zuletzt geändert fehlt.');
assert(root.querySelector('[data-role="library-sort"] option[value="title"]'), 'Sortierung nach Titel fehlt.');
assert(root.querySelector('[data-role="library-sort"] option[value="category"]'), 'Sortierung nach Kategorie fehlt.');
const card = root.querySelector('.chl-play-card');
for (const action of ['open', 'duplicate', 'archive', 'publish']) {
  assert(card.querySelector(`[data-library-action="${action}"]`), `Kartenaktion ${action} fehlt.`);
}
assert(root.querySelector('.chl-playbook-card')?.textContent.includes('Herren Playbook'), 'Playbook-Sammlung fehlt.');
assert(root.querySelector('[data-action="create-playbook"]'), 'Neue Playbook-Sammlung kann nicht erstellt werden.');

console.log('CourtHub Play Editor 2.0: Taktikbibliothek und Playbooks erfolgreich geprüft.');
dom.window.close();
