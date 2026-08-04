const DEFAULT_DELAY = 100;
const MAX_DIMENSION = 2048;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

class ChunkWriter {
  constructor(chunkSize = 65536) {
    this.chunkSize = chunkSize;
    this.chunks = [];
    this.chunk = new Uint8Array(chunkSize);
    this.offset = 0;
    this.length = 0;
  }

  flush() {
    if (!this.offset) return;
    this.chunks.push(this.chunk.slice(0, this.offset));
    this.chunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
  }

  byte(value) {
    if (this.offset >= this.chunk.length) this.flush();
    this.chunk[this.offset++] = value & 0xff;
    this.length += 1;
  }

  short(value) {
    this.byte(value);
    this.byte(value >> 8);
  }

  bytes(values) {
    for (let index = 0; index < values.length; index += 1) this.byte(values[index]);
  }

  ascii(value) {
    for (let index = 0; index < value.length; index += 1) this.byte(value.charCodeAt(index));
  }

  result() {
    this.flush();
    const output = new Uint8Array(this.length);
    let offset = 0;
    this.chunks.forEach(chunk => {
      output.set(chunk, offset);
      offset += chunk.length;
    });
    return output;
  }
}

function globalPalette332() {
  const palette = new Uint8Array(256 * 3);
  for (let index = 0; index < 256; index += 1) {
    const red = (index >> 5) & 7;
    const green = (index >> 2) & 7;
    const blue = index & 3;
    palette[index * 3] = Math.round(red * 255 / 7);
    palette[index * 3 + 1] = Math.round(green * 255 / 7);
    palette[index * 3 + 2] = Math.round(blue * 255 / 3);
  }
  return palette;
}

const PALETTE_332 = globalPalette332();

export function quantizeRgba332(rgba) {
  if (!rgba || rgba.length % 4 !== 0) throw new TypeError('RGBA-Bilddaten sind ungültig.');
  const indexed = new Uint8Array(rgba.length / 4);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 1) {
    if (rgba[source + 3] < 16) {
      indexed[target] = 0;
      continue;
    }
    indexed[target] = ((rgba[source] >> 5) << 5)
      | ((rgba[source + 1] >> 5) << 2)
      | (rgba[source + 2] >> 6);
  }
  return indexed;
}

function lzwCompress(indexedPixels, minimumCodeSize = 8) {
  if (!indexedPixels?.length) return new Uint8Array([0]);

  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minimumCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = new Map();
  const output = [];
  let bits = 0;
  let bitCount = 0;

  const writeCode = code => {
    bits |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bits & 0xff);
      bits >>>= 8;
      bitCount -= 8;
    }
  };

  const reset = () => {
    dictionary = new Map();
    codeSize = minimumCodeSize + 1;
    nextCode = endCode + 1;
  };

  writeCode(clearCode);
  let prefix = indexedPixels[0];

  for (let index = 1; index < indexedPixels.length; index += 1) {
    const suffix = indexedPixels[index];
    const key = prefix * 256 + suffix;
    const existing = dictionary.get(key);
    if (existing !== undefined) {
      prefix = existing;
      continue;
    }

    writeCode(prefix);
    if (nextCode < 4096) {
      dictionary.set(key, nextCode);
      nextCode += 1;
      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize += 1;
    } else {
      writeCode(clearCode);
      reset();
    }
    prefix = suffix;
  }

  writeCode(prefix);
  writeCode(endCode);
  if (bitCount > 0) output.push(bits & 0xff);
  return Uint8Array.from(output);
}

function writeDataBlocks(writer, data) {
  for (let offset = 0; offset < data.length; offset += 255) {
    const size = Math.min(255, data.length - offset);
    writer.byte(size);
    writer.bytes(data.subarray(offset, offset + size));
  }
  writer.byte(0);
}

function writeLoopExtension(writer, repeat) {
  writer.byte(0x21);
  writer.byte(0xff);
  writer.byte(11);
  writer.ascii('NETSCAPE2.0');
  writer.byte(3);
  writer.byte(1);
  writer.short(clamp(repeat, 0, 65535));
  writer.byte(0);
}

function validateDimensions(width, height) {
  const normalizedWidth = Math.floor(Number(width));
  const normalizedHeight = Math.floor(Number(height));
  if (!Number.isFinite(normalizedWidth) || !Number.isFinite(normalizedHeight)
      || normalizedWidth < 1 || normalizedHeight < 1
      || normalizedWidth > MAX_DIMENSION || normalizedHeight > MAX_DIMENSION) {
    throw new RangeError('GIF-Abmessungen sind ungültig.');
  }
  return { width: normalizedWidth, height: normalizedHeight };
}

export function encodeAnimatedGif(options = {}) {
  const dimensions = validateDimensions(options.width, options.height);
  const frames = Array.isArray(options.frames) ? options.frames : [];
  if (!frames.length) throw new Error('Für das GIF wurden keine Bilder erzeugt.');

  const pixelCount = dimensions.width * dimensions.height;
  const writer = new ChunkWriter();
  writer.ascii('GIF89a');
  writer.short(dimensions.width);
  writer.short(dimensions.height);
  writer.byte(0xf7);
  writer.byte(0);
  writer.byte(0);
  writer.bytes(PALETTE_332);
  writeLoopExtension(writer, options.repeat ?? 0);

  frames.forEach((frame, index) => {
    const indexed = frame.indexedPixels instanceof Uint8Array
      ? frame.indexedPixels
      : quantizeRgba332(frame.rgba);
    if (indexed.length !== pixelCount) {
      throw new RangeError(`GIF-Bild ${index + 1} besitzt eine falsche Größe.`);
    }

    const delay = Math.max(2, Math.round((Number(frame.delay) || DEFAULT_DELAY) / 10));
    writer.byte(0x21);
    writer.byte(0xf9);
    writer.byte(4);
    writer.byte(0x04);
    writer.short(delay);
    writer.byte(0);
    writer.byte(0);

    writer.byte(0x2c);
    writer.short(0);
    writer.short(0);
    writer.short(dimensions.width);
    writer.short(dimensions.height);
    writer.byte(0);
    writer.byte(8);
    writeDataBlocks(writer, lzwCompress(indexed, 8));
  });

  writer.byte(0x3b);
  return writer.result();
}

export function gifBlob(options) {
  return new Blob([encodeAnimatedGif(options)], { type: 'image/gif' });
}
