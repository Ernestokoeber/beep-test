import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><body><div class="chpd-court-wrap"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'https://coach.tsv-lindau.de/#/tactics'
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Element = dom.window.Element;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.XMLSerializer = dom.window.XMLSerializer;
window.BT = {
  tactics: {
    __core: {
      clamp: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0)),
      normalizeTransition: value => value || { motions: [], passes: [], screens: [] },
      elements: (step, type) => (step?.elements || []).filter(item => !type || item.type === type),
      elementById: (step, id) => (step?.elements || []).find(item => item.id === id)
    },
    arrowStyle: () => ({ color: '#b20e19', dash: [] })
  }
};

const rendering = await import(
  pathToFileURL(resolve(root, 'js/play-designer/rendering.js')).href + '?court-enhancement-render=1'
);
const enhancements = await import(
  pathToFileURL(resolve(root, 'js/play-designer/court-enhancements.js')).href + '?court-enhancement-test=1'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const farLeft = enhancements.parallelProject({ x: 10, y: 20 });
const farRight = enhancements.parallelProject({ x: 490, y: 20 });
const nearLeft = enhancements.parallelProject({ x: 10, y: 450 });
const nearRight = enhancements.parallelProject({ x: 490, y: 450 });
assert(
  Math.abs((farRight.x - farLeft.x) - (nearRight.x - nearLeft.x)) < .01,
  'Das Court verjüngt sich weiterhin nach hinten'
);

for (const point of [{ x: 40, y: 45 }, { x: 250, y: 235 }, { x: 465, y: 425 }]) {
  const roundTrip = enhancements.parallelUnproject(enhancements.parallelProject(point));
  assert(Math.abs(roundTrip.x - point.x) < .01, 'Parallele X-Projektion ist ungenau');
  assert(Math.abs(roundTrip.y - point.y) < .01, 'Parallele Y-Projektion ist ungenau');
}

const wrapper = document.querySelector('.chpd-court-wrap');
const court = rendering.createCourt();
wrapper.appendChild(court);
const snapshot = {
  elements: [
    { id: 'o1', type: 'offense', role: '1', x: 100, y: 80 },
    { id: 'd1', type: 'defense', role: 'X1', x: 380, y: 300 },
    { id: 'ball', type: 'ball', x: 116, y: 80 }
  ],
  transition: { motions: [], passes: [], screens: [] }
};
rendering.drawCourt(court, snapshot, { sourceStep: snapshot, showGuides: true });
const controller = enhancements.enhanceCourt(court);

assert(court.dataset.projection === 'top-down', 'Feste 2D-Projektionsart fehlt');
assert(court.querySelector('[data-layer="base"]').style.display !== 'none', '2D-Grundfläche wurde ausgeblendet');
assert(court.querySelectorAll('[data-parquet-plank]').length > 80, 'Das Hallenparkett besteht nicht aus Holzplanken');
assert(wrapper.querySelector('[data-role="court-zoom-controls"]'), 'Zoom-Schaltflächen fehlen');
assert(controller && controller.getZoom() === 1, 'Zoom-Controller fehlt');
controller.zoomIn();
assert(controller.getZoom() > 1, 'Zoom-In funktioniert nicht');
assert(court.style.transform.includes('scale('), 'Der Court wird beim Zoom nicht skaliert');
controller.reset();
assert(controller.getZoom() === 1, 'Zoom-Reset funktioniert nicht');
assert(court.querySelector('.offense-token'), 'Angreifer-Token fehlt');
assert(court.querySelector('.defense-token'), 'Verteidiger-Token fehlt');
assert(court.querySelector('.ball-token'), 'Ball-Token fehlt');

console.log('CourtHub: paralleles Hallenparkett und Board-Zoom erfolgreich geprüft.');
