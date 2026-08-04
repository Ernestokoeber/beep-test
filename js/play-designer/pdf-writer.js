const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

function latin1Bytes(value) {
  const text = String(value || '');
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff;
  return bytes;
}

function concatBytes(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  parts.forEach(part => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\u0000-\u00ff]/g, '?');
}

function pdfString(value) {
  let output = '';
  for (const character of normalizeText(value)) {
    const code = character.charCodeAt(0);
    if (character === '\\' || character === '(' || character === ')') {
      output += '\\' + character;
    } else if (code >= 32 && code <= 126) {
      output += character;
    } else {
      output += '\\' + code.toString(8).padStart(3, '0');
    }
  }
  return output;
}

function streamObject(dictionary, bytes) {
  return [
    latin1Bytes(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`),
    bytes,
    latin1Bytes('\nendstream')
  ];
}

function pageContent(page, index, count) {
  const title = pdfString(page.title || 'CourtHub Play');
  const subtitle = pdfString(page.subtitle || '');
  const footer = pdfString(page.footer || `Schritt ${index + 1} / ${count}`);
  return latin1Bytes([
    'BT',
    '/F1 20 Tf',
    `36 557 Td (${title}) Tj`,
    '/F1 10 Tf',
    `0 -18 Td (${subtitle}) Tj`,
    'ET',
    'q',
    '606 0 0 438 118 68 cm',
    '/Im0 Do',
    'Q',
    'BT',
    '/F1 10 Tf',
    `118 52 Td (${footer}) Tj`,
    'ET'
  ].join('\n'));
}

export function buildPdfBytes(pagesInput) {
  const pages = Array.isArray(pagesInput) ? pagesInput : [];
  if (!pages.length) throw new Error('Mindestens eine PDF-Seite wird benötigt.');

  pages.forEach(page => {
    if (!(page.imageBytes instanceof Uint8Array) || !page.imageBytes.length) {
      throw new Error('Eine PDF-Seite enthält kein gültiges JPEG-Bild.');
    }
  });

  const fontId = 3 + pages.length * 3;
  const objects = new Array(fontId + 1);
  const pageIds = pages.map((_, index) => 3 + index * 3);

  objects[1] = [latin1Bytes('<< /Type /Catalog /Pages 2 0 R >>')];
  objects[2] = [latin1Bytes(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)];

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const imageWidth = Math.max(1, Math.round(Number(page.imageWidth) || 1520));
    const imageHeight = Math.max(1, Math.round(Number(page.imageHeight) || 1100));
    const content = pageContent(page, index, pages.length);

    objects[pageId] = [latin1Bytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> /XObject << /Im0 ${imageId} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`
    )];
    objects[contentId] = streamObject('', content);
    objects[imageId] = streamObject(
      `/Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} ` +
      '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',
      page.imageBytes
    );
  });

  objects[fontId] = [latin1Bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')];

  const chunks = [latin1Bytes('%PDF-1.4\n%\342\343\317\323\n')];
  const offsets = new Array(objects.length).fill(0);
  let offset = chunks[0].length;

  for (let id = 1; id < objects.length; id += 1) {
    const prefix = latin1Bytes(`${id} 0 obj\n`);
    const suffix = latin1Bytes('\nendobj\n');
    offsets[id] = offset;
    chunks.push(prefix, ...objects[id], suffix);
    offset += prefix.length + objects[id].reduce((sum, part) => sum + part.length, 0) + suffix.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer =
    `${xref}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;
  chunks.push(latin1Bytes(trailer));
  return concatBytes(chunks);
}

export function createPdfBlob(pages) {
  return new Blob([buildPdfBytes(pages)], { type: 'application/pdf' });
}
