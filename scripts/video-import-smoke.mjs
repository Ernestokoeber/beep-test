import {
  createHomography,
  mapPoint,
  validateCalibration,
  createBoardFromVideoDraft,
  formatSeconds
} from '../js/video-import/core.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const calibration = [
  { x: .18, y: .12 },
  { x: .82, y: .12 },
  { x: .94, y: .9 },
  { x: .06, y: .9 }
];
assert(validateCalibration(calibration), 'Gültige Vier-Punkt-Kalibrierung wird abgelehnt');
assert(!validateCalibration([{ x: 0, y: 0 }]), 'Unvollständige Kalibrierung wird akzeptiert');

const matrix = createHomography(calibration);
const topLeft = mapPoint(matrix, calibration[0]);
const bottomRight = mapPoint(matrix, calibration[2]);
assert(Math.abs(topLeft.x - 16) < .01 && Math.abs(topLeft.y - 16) < .01, 'Hintere linke Ecke wird falsch übertragen');
assert(Math.abs(bottomRight.x - 484) < .01 && Math.abs(bottomRight.y - 454) < .01, 'Vordere rechte Ecke wird falsch übertragen');

const board = createBoardFromVideoDraft({
  title: 'Video Horns',
  category: 'Horns',
  calibration,
  markers: [
    { id: 'o1', type: 'offense', role: '1' },
    { id: 'o2', type: 'offense', role: '2' },
    { id: 'd1', type: 'defense', role: 'X1' },
    { id: 'ball', type: 'ball' }
  ],
  frames: [
    {
      id: 'f1', time: 2,
      positions: {
        o1: { x: .48, y: .78 }, o2: { x: .72, y: .55 },
        d1: { x: .5, y: .57 }, ball: { x: .49, y: .77 }
      }
    },
    {
      id: 'f2', time: 4,
      positions: {
        o1: { x: .58, y: .52 }, o2: { x: .72, y: .55 },
        d1: { x: .56, y: .5 }, ball: { x: .71, y: .55 }
      }
    }
  ],
  clipStart: 2,
  clipEnd: 4
});

assert(board.schemaVersion === 2, 'Import erzeugt nicht das aktuelle Play-Schema');
assert(board.steps.length === 2, 'Keyframes werden nicht in Schritte umgewandelt');
assert(board.steps[0].transition.motions.some(item => item.elementId === 'o1'), 'Spielerbewegung wird nicht erzeugt');
assert(board.steps[0].transition.passes.length === 1, 'Ballbesitzwechsel wird nicht als Pass erkannt');
assert(board.published === false, 'Video-Import darf nicht automatisch veröffentlicht werden');
assert(formatSeconds(62.4) === '1:02.4', 'Zeitformatierung ist falsch');

console.log('CourtHub Video Import V1: Kernprüfungen erfolgreich.');
