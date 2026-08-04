import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { grayscaleFrame, trackGrayPoint, addScreenCandidates } from '../js/video-import/tracker-v2.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
const { window } = dom;
window.BT = { util: { uuid: prefix => `${prefix}tracker_${Math.random().toString(36).slice(2, 8)}` } };
window.eval(readFileSync(resolve(root, 'js/tactics.js'), 'utf8'));
const core = window.BT.tactics.__core;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function image(width, height, centerX, centerY) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const distance = Math.hypot(x - centerX, y - centerY);
      const texture = (x * 17 + y * 29) % 23;
      const value = distance < 6 ? 210 - texture : 35 + texture;
      rgba[index] = value;
      rgba[index + 1] = distance < 6 ? 80 + texture : value;
      rgba[index + 2] = distance < 6 ? 45 : value;
      rgba[index + 3] = 255;
    }
  }
  return grayscaleFrame(rgba, width, height);
}

const width = 80;
const height = 64;
const previous = image(width, height, 28, 31);
const next = image(width, height, 35, 27);
const tracked = trackGrayPoint(previous, next, { x: 28 / (width - 1), y: 31 / (height - 1) }, {
  patchRadius: 6,
  searchRadius: 14,
  searchStep: 1
});
const trackedX = tracked.point.x * (width - 1);
const trackedY = tracked.point.y * (height - 1);
assert(Math.abs(trackedX - 35) <= 1.5, 'Automatisches Tracking findet die horizontale Verschiebung nicht');
assert(Math.abs(trackedY - 27) <= 1.5, 'Automatisches Tracking findet die vertikale Verschiebung nicht');
assert(tracked.confidence > .25, 'Tracking-Sicherheit ist für ein eindeutiges Muster zu niedrig');

const board = core.defaultBoard();
const first = board.steps[0];
const second = core.cloneStep(first);
board.steps.push(second);
first.duration = 1.8;

const screener = core.elementById(first, 'o5');
const nextScreener = core.elementById(second, 'o5');
const defender = core.elementById(first, 'd5');
const nextDefender = core.elementById(second, 'd5');
Object.assign(screener, { x: 300, y: 225 });
Object.assign(nextScreener, { x: 304, y: 224 });
Object.assign(defender, { x: 329, y: 230 });
Object.assign(nextDefender, { x: 329, y: 230 });

const cutter = core.elementById(first, 'o1');
const nextCutter = core.elementById(second, 'o1');
Object.assign(cutter, { x: 250, y: 285 });
Object.assign(nextCutter, { x: 350, y: 185 });
first.transition.motions.push({
  id: 'cut-o1', type: 'move', elementId: 'o1', start: 0, duration: 1.4,
  path: [{ x: 250, y: 285 }, { x: 350, y: 185 }]
});

const recognized = addScreenCandidates(board, core);
assert(recognized.added === 1, 'Ein klarer Screen-Kandidat wurde nicht erkannt');
assert(recognized.board.steps[0].transition.screens.length === 1, 'Erkannter Screen wurde nicht in das Play übernommen');
assert(recognized.board.steps[0].transition.screens[0].elementId === 'o5', 'Falscher Screensteller wurde erkannt');
assert(recognized.board.description.includes('automatisch erkannt'), 'Prüfhinweis für automatisch erkannte Screens fehlt');

console.log('CourtHub Video-Import V2: Tracking und Screen-Erkennung erfolgreich geprüft.');
dom.window.close();
