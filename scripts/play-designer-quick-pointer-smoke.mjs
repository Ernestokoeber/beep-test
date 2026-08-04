import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://courthub.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Element = dom.window.Element;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.BT = { tactics: { __core: {} } };

const enhancements = await import(
  pathToFileURL(resolve(root, 'js/play-designer/court-enhancements.js')).href + '?quick-pointer-smoke=1'
);
const pointer = await import(
  pathToFileURL(resolve(root, 'js/play-designer/quick-pointer-fix.js')).href + '?quick-pointer-smoke=1'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(left, right, tolerance = 0.01) {
  return Math.abs(left - right) <= tolerance;
}

const rect = { left: 120, top: 40, width: 1140, height: 620 };
const metrics = pointer.fittedSvgMetrics(rect);
const courtPoints = [
  { x: 250, y: 388 }, { x: 82, y: 324 }, { x: 418, y: 324 },
  { x: 106, y: 168 }, { x: 394, y: 168 },
  { x: 250, y: 338 }, { x: 108, y: 282 }, { x: 392, y: 282 },
  { x: 145, y: 142 }, { x: 355, y: 142 }
];

for (const court of courtPoints) {
  const visible = enhancements.parallelProject(court);
  const visibleClient = {
    x: metrics.left + metrics.offsetX + visible.x * metrics.scale,
    y: metrics.top + metrics.offsetY + visible.y * metrics.scale
  };
  const corrected = pointer.quickPointerToLegacyClient(
    rect,
    visibleClient.x,
    visibleClient.y
  );
  const expectedLegacy = enhancements.legacyProject(court);
  const expectedClient = {
    x: metrics.left + metrics.offsetX + expectedLegacy.x * metrics.scale,
    y: metrics.top + metrics.offsetY + expectedLegacy.y * metrics.scale
  };
  assert(near(corrected.x, expectedClient.x), `X-Zuordnung für Spieler bei ${court.x}/${court.y} ist verschoben`);
  assert(near(corrected.y, expectedClient.y), `Y-Zuordnung für Spieler bei ${court.x}/${court.y} ist verschoben`);
}

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
group.classList.add('token', 'offense-token');
group.dataset.elementId = 'o4';
group.setAttribute('transform', 'translate(183.25 241.75) scale(0.9)');
const shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
group.append(shape);
svg.append(group);
const center = pointer.tokenParallelCenter(shape);
assert(center && near(center.x, 183.25) && near(center.y, 241.75), 'Angeklickter Spieler wird nicht direkt erkannt');

console.log('CourtHub Schnellmodus: Pointer- und Drag-Zuordnung erfolgreich geprüft.');
