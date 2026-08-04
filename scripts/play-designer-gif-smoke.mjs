import { encodeAnimatedGif, quantizeRgba332 } from '../js/play-designer/gif-encoder.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseGif(data) {
  let offset = 6;
  const packed = data[offset + 4];
  offset += 7;
  if (packed & 0x80) offset += 3 * (1 << ((packed & 7) + 1));
  const images = [];

  const readBlocks = () => {
    const parts = [];
    let length = 0;
    while (offset < data.length) {
      const size = data[offset++];
      if (!size) break;
      const part = data.slice(offset, offset + size);
      parts.push(part);
      length += part.length;
      offset += size;
    }
    const output = new Uint8Array(length);
    let target = 0;
    parts.forEach(part => {
      output.set(part, target);
      target += part.length;
    });
    return output;
  };

  while (offset < data.length) {
    const marker = data[offset++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      offset += 1;
      readBlocks();
      continue;
    }
    if (marker === 0x2c) {
      const imagePacked = data[offset + 8];
      offset += 9;
      if (imagePacked & 0x80) offset += 3 * (1 << ((imagePacked & 7) + 1));
      const minimumCodeSize = data[offset++];
      images.push({ minimumCodeSize, compressed: readBlocks() });
      continue;
    }
    throw new Error(`Unbekannter GIF-Block 0x${marker.toString(16)}`);
  }
  return images;
}

function decodeLzw(data, minimumCodeSize) {
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minimumCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = [];
  let bitOffset = 0;
  const output = [];

  const reset = () => {
    dictionary = Array.from({ length: clearCode }, (_, value) => [value]);
    dictionary.length = 4096;
    codeSize = minimumCodeSize + 1;
    nextCode = endCode + 1;
  };

  const readCode = () => {
    let code = 0;
    for (let bit = 0; bit < codeSize; bit += 1) {
      const position = bitOffset + bit;
      const byte = data[position >> 3];
      code |= ((byte >> (position & 7)) & 1) << bit;
    }
    bitOffset += codeSize;
    return code;
  };

  reset();
  let previous = null;
  while (bitOffset + codeSize <= data.length * 8) {
    const code = readCode();
    if (code === clearCode) {
      reset();
      previous = null;
      continue;
    }
    if (code === endCode) break;

    let entry = dictionary[code];
    if (!entry && code === nextCode && previous) entry = [...previous, previous[0]];
    if (!entry) throw new Error(`Ungültiger LZW-Code ${code}`);
    output.push(...entry);

    if (previous && nextCode < 4096) {
      dictionary[nextCode++] = [...previous, entry[0]];
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    previous = entry;
  }
  return Uint8Array.from(output);
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

const width = 64;
const height = 64;
const first = Uint8Array.from(
  { length: width * height },
  (_, index) => (index * 73 + Math.floor(index / 4) * 19) & 0xff
);
const second = Uint8Array.from(first, value => 255 - value);
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
const images = parseGif(gif);
assert(images.length === 2, 'GIF enthält nicht beide Bilder');
const decoded = decodeLzw(images[0].compressed, images[0].minimumCodeSize);
assert(decoded.length === first.length, 'Das erste GIF-Bild hat nach dem Dekodieren die falsche Größe');
assert(decoded.every((value, index) => value === first[index]), 'GIF-LZW-Daten verändern Bildpunkte');
assert(gif.length > 1000, 'GIF-Daten sind unerwartet klein');

let rejected = false;
try {
  encodeAnimatedGif({ width: 0, height: 10, frames: [{ indexedPixels: new Uint8Array(1) }] });
} catch (_) {
  rejected = true;
}
assert(rejected, 'Ungültige GIF-Abmessungen werden nicht abgelehnt');

console.log('CourtHub Play Designer: lokaler GIF-Encoder erfolgreich geprüft.');
