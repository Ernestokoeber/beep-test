import { buildPdfBytes } from '../js/play-designer/pdf-writer.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const bytes = buildPdfBytes([
  {
    title: 'Horns – Überzahl',
    subtitle: 'Pass → Ecke',
    footer: 'Schritt 1 / 2 · 1,8 s',
    imageBytes: jpeg,
    imageWidth: 480,
    imageHeight: 360
  },
  {
    title: '5-Out',
    subtitle: 'Drive & Kick',
    footer: 'Schritt 2 / 2 · 2,2 s',
    imageBytes: jpeg,
    imageWidth: 480,
    imageHeight: 360
  }
]);

const text = Buffer.from(bytes).toString('latin1');
assert(text.startsWith('%PDF-1.4'), 'PDF-Kopf fehlt');
assert(text.includes('/Type /Pages') && text.includes('/Count 2'), 'Mehrseitige PDF-Struktur fehlt');
assert((text.match(/\/Type \/Page\b/g) || []).length === 2, 'PDF enthält nicht genau zwei Seiten');
assert((text.match(/\/Filter \/DCTDecode/g) || []).length === 2, 'JPEG-Bilder werden nicht als PDF-XObjects eingebettet');
const encodedUmlaut = 'Horns - ' + String.fromCharCode(92) + '334berzahl';
assert(text.includes(encodedUmlaut), 'Umlaute werden nicht WinAnsi-kompatibel geschrieben');
assert(text.includes('Pass -> Ecke'), 'Sonderzeichen werden nicht stabil normalisiert');
assert(text.endsWith('%%EOF'), 'PDF-Abschluss fehlt');

const startXrefMatch = text.match(/startxref\n(\d+)\n%%EOF$/);
assert(startXrefMatch, 'startxref fehlt');
const xrefOffset = Number(startXrefMatch[1]);
assert(text.slice(xrefOffset, xrefOffset + 4) === 'xref', 'startxref zeigt nicht auf die XRef-Tabelle');

const xrefSection = text.slice(xrefOffset, text.indexOf('trailer', xrefOffset));
const rows = xrefSection.split('\n').slice(3).filter(Boolean);
rows.forEach((row, index) => {
  const objectId = index + 1;
  const offset = Number(row.slice(0, 10));
  assert(text.slice(offset, offset + String(objectId).length + 6) === `${objectId} 0 obj`, `XRef-Eintrag ${objectId} ist ungültig`);
});

console.log('Offline-PDF-Smoke-Test erfolgreich.');
