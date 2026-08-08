import { JSDOM } from 'jsdom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const renderer = await import(
  pathToFileURL(resolve(root, 'js/play-designer/rendering.js')).href
    + '?play-editor-2-rendering=1'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const top = renderer.projectPoint({ x: 25, y: 20 });
const bottom = renderer.projectPoint({ x: 25, y: 450 });
const topWidth = renderer.projectPoint({ x: 475, y: 20 }).x - top.x;
const bottomWidth = renderer.projectPoint({ x: 475, y: 450 }).x - bottom.x;
assert(Math.abs(topWidth - bottomWidth) < 0.01, 'Das feste 2D-Halbfeld verjüngt sich weiterhin.');

const court = renderer.createCourt();
assert(court.dataset.projection === 'top-down', 'Das Spielfeld ist nicht als 2D-Vogelperspektive markiert.');
assert(!court.hasAttribute('data-perspective'), 'Der alte Perspektivmodus ist weiterhin aktiv.');
assert(court.getAttribute('aria-label').toLowerCase().includes('zweidimensional'), 'Die zugängliche Court-Beschreibung benennt die 2D-Darstellung nicht.');

const step = {
  elements: [
    { id: 'o1', type: 'offense', role: '1', x: 250, y: 388 },
    { id: 'd1', type: 'defense', role: 'X1', defenseMode: 'man', x: 210, y: 300 },
    { id: 'd2', type: 'defense', role: 'X2', defenseMode: 'zone', x: 290, y: 300 },
    { id: 'ball', type: 'ball', x: 266, y: 388 }
  ],
  transition: {
    motions: [
      { id: 'run', type: 'move', elementId: 'd1', kind: 'run', start: 0, duration: 1, path: [{ x: 210, y: 300 }, { x: 190, y: 250 }] },
      { id: 'dribble', type: 'move', elementId: 'o1', kind: 'dribble', start: 0, duration: 1, path: [{ x: 250, y: 388 }, { x: 280, y: 320 }] }
    ],
    passes: [{ id: 'pass', type: 'pass', fromId: 'o1', toId: 'd1', start: 0, duration: .4, curve: 0 }],
    screens: [{ id: 'screen', type: 'screen', elementId: 'o1', start: 0, duration: .7, x: 260, y: 300, angle: 0 }]
  }
};
renderer.drawCourt(court, step, { sourceStep: step, showGuides: true });

assert(court.querySelector('.offense-token [data-token-shape="circle"]'), 'Angriffsspieler ist kein nummerierter Kreis.');
assert(court.querySelector('.defense-token.defense-man [data-defense-symbol="x"]'), 'Mannverteidiger wird nicht als X dargestellt.');
assert(court.querySelector('.defense-token.defense-zone [data-defense-symbol="diamond"]'), 'Zonenverteidiger wird nicht als Raute dargestellt.');
assert(court.querySelector('[data-action-id="run"]')?.getAttribute('stroke-dasharray') !== court.querySelector('[data-action-id="dribble"]')?.getAttribute('stroke-dasharray'), 'Lauf und Dribbling besitzen keine unterscheidbare Linienstruktur.');
assert(court.querySelector('[data-action-id="pass"]')?.getAttribute('stroke-dasharray'), 'Der Pass ist nicht gestrichelt.');
assert(court.querySelectorAll('[data-action-id="screen"]').length >= 2, 'Der Screen besitzt kein klares T-Symbol.');

console.log('CourtHub Play Editor 2.0: 2D-Spielfeldsprache erfolgreich geprüft.');
dom.window.close();
