import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });

globalThis.window = dom.window;
globalThis.document = dom.window.document;
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

const moduleUrl = pathToFileURL(resolve(root, 'js/play-designer/rendering.js')).href + '?perspective-test=1';
const renderer = await import(moduleUrl);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const farLeft = renderer.projectPoint({ x: 10, y: 20 });
const farRight = renderer.projectPoint({ x: 490, y: 20 });
const nearLeft = renderer.projectPoint({ x: 10, y: 450 });
const nearRight = renderer.projectPoint({ x: 490, y: 450 });
assert(nearRight.x - nearLeft.x > farRight.x - farLeft.x, 'Court wird nach vorne nicht breiter');
assert(nearLeft.y > farLeft.y, 'Tiefenachse des Perspective Courts ist ungültig');

for (const point of [{ x: 35, y: 40 }, { x: 250, y: 235 }, { x: 470, y: 430 }]) {
  const roundTrip = renderer.unprojectPoint(renderer.projectPoint(point));
  assert(Math.abs(roundTrip.x - point.x) < .01, 'Inverse X-Projektion ist ungenau');
  assert(Math.abs(roundTrip.y - point.y) < .01, 'Inverse Y-Projektion ist ungenau');
}

const court = renderer.createCourt();
assert(court.getAttribute('viewBox') === '0 0 760 550', 'Perspective-ViewBox fehlt');
assert(court.dataset.perspective === 'true', 'Perspective-Modus ist nicht markiert');
assert(court.querySelector('[data-layer="base"] path'), '3D-Court-Grundfläche fehlt');

const snapshot = {
  elements: [
    { id: 'o1', type: 'offense', role: '1', x: 250, y: 390 },
    { id: 'd1', type: 'defense', role: 'X1', x: 220, y: 300 },
    { id: 'ball', type: 'ball', x: 265, y: 390 }
  ],
  transition: { motions: [], passes: [], screens: [] }
};
renderer.drawCourt(court, snapshot, { sourceStep: snapshot, showGuides: true });
assert(court.querySelector('.offense-token'), '3D-Angreifer-Token fehlt');
assert(court.querySelector('.defense-token'), '3D-Verteidiger-Token fehlt');
assert(court.querySelector('.ball-token'), '3D-Ball fehlt');

console.log('CourtHub Perspective Renderer: Prüfungen erfolgreich.');
