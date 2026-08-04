import { encodeAnimatedGif, quantizeRgba332 } from '../js/play-designer/gif-encoder.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countFrames(data) {
  let offset = 6;
  const packed = data[offset + 4];
  offset += 7;
  if (packed & 0x80) offset += 3 * (1 << ((packed & 7) + 1));
  let frames = 0;

  const skipBlocks = () => {
    while (offset < data.length) {
      const size = data[offset++];
      if (!size) break;
      offset += size;
    }
  };

  while (offset < data.length) {
    const marker = data[offset++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      offset += 1;
      skipBlocks();
      continue;
    }
    if (marker === 0x2c) {
      frames += 1;
      const imagePacked = data[offset + 8];
      offset += 9;
      if (imagePacked & 0x80) offset += 3 * (1 << ((imagePacked & 7) + 1));
      offset += 1;
      skipBlocks();
      continue;
    }
    throw new Error(`Unbekannter GIF-Block 0x${marker.toString(16)}`);
  }
  return frames;
}

const quantized = quantizeRgba332(Uint8Array.from([
  255, 0, 0, 255,
  0, 255, 0, 255,
  0, 0, 255, 255,
  255, 255, 255, 0
]));
assert(quantized[0] === 0xe0, 'Rot wird nicht korrekt quantisiert');
assert(quantized[1] === 0x1c, 'Grün wird nicht korrekt quantisiert');
assert(quantized[2] === 0x03, 'Blau wird nicht korrekt quantisiert');
assert(quantized[3] === 0x00, 'Transparente Pixel werden nicht neutralisiert');

const width = 12;
const height = 8;
const first = new Uint8Array(width * height).fill(0x00);
const second = new Uint8Array(width * height).fill(0xff);
const gif = encodeAnimatedGif({
  width,
  height,
  repeat: 0,
  frames: [
    { indexedPixels: first, delay: 100 },
    { indexedPixels: second, delay: 120 }
  ]
});

assert(new TextDecoder().decode(gif.slice(0, 6)) === 'GIF89a', 'GIF-Header fehlt');
assert(gif.at(-1) === 0x3b, 'GIF-Trailer fehlt');
assert(countFrames(gif) === 2, 'GIF enthält nicht beide Bilder');
assert(gif.length > 800, 'GIF-Daten sind unerwartet klein');

let rejected = false;
try {
  encodeAnimatedGif({ width: 0, height: 10, frames: [{ indexedPixels: new Uint8Array(1) }] });
} catch (_) {
  rejected = true;
}
assert(rejected, 'Ungültige GIF-Abmessungen werden nicht abgelehnt');

console.log('CourtHub Play Designer: lokaler GIF-Encoder erfolgreich geprüft.');
