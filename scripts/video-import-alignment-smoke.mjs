import { fitVideoFrame } from '../js/video-import/alignment.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const landscape = fitVideoFrame(1200, 700, 1920, 1080);
assert(Math.abs(landscape.width - 1200) < .01, 'Landscape-Video nutzt die Desktop-Breite nicht');
assert(Math.abs(landscape.height - 675) < .01, 'Landscape-Höhe ist nicht proportional');

const portrait = fitVideoFrame(1200, 700, 1080, 1920);
assert(Math.abs(portrait.height - 700) < .01, 'Portrait-Video wird nicht an der sichtbaren Höhe begrenzt');
assert(Math.abs(portrait.width - 393.75) < .01, 'Portrait-Video wird auf dem Desktop verzerrt');

const square = fitVideoFrame(600, 800, 1000, 1000);
assert(square.width === 600 && square.height === 600, 'Quadratisches Video wird nicht korrekt eingepasst');

for (const frame of [landscape, portrait, square]) {
  assert(frame.width > 0 && frame.height > 0, 'Video-Rahmen enthält ungültige Maße');
}

console.log('CourtHub Video Import: Desktop-Zuordnung und Videoformat erfolgreich geprüft.');
