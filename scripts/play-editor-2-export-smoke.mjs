import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://courthub.test/#/tactics',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
globalThis.MutationObserver = window.MutationObserver;
let sequence = 0;
window.BT = {
  util: { uuid: (prefix = 'id_') => `${prefix}${++sequence}`, toast() {} },
  sync: { getState: () => ({ user: { role: 'coach' } }) }
};
vm.runInContext(readFileSync(resolve(rootPath, 'js/tactics.js'), 'utf8'), dom.getInternalVMContext(), {
  filename: 'js/tactics.js'
});

const module = await import(
  pathToFileURL(resolve(rootPath, 'js/play-designer/export-dialog.js')).href
    + '?play-editor-2-export=1'
);
const board = window.BT.tactics.__core.defaultBoard();
const dialog = module.createExportDialog(board);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(dialog.querySelector('[data-export-format="pdf"]'), 'PDF fehlt im gemeinsamen Exportdialog.');
assert(dialog.querySelector('[data-export-format="image"]'), 'Bildexport fehlt im gemeinsamen Exportdialog.');
assert(dialog.querySelector('[data-export-format="gif"]'), 'GIF fehlt im gemeinsamen Exportdialog.');
const video = dialog.querySelector('[data-export-format="video"]');
assert(video && video.disabled, 'Videoexport ist nicht klar als spätere Ausbaustufe markiert.');
assert(dialog.querySelector('[name="pdfLayout"] option[value="phase-text"]'), 'PDF-Layout Diagramm und Text fehlt.');
assert(dialog.querySelector('[name="pdfLayout"] option[value="grid"]'), 'PDF-Rasterlayout fehlt.');
assert(dialog.querySelector('[name="pdfLayout"] option[value="diagrams"]'), 'PDF nur mit Diagrammen fehlt.');
assert(dialog.querySelector('[name="grayscale"]'), 'Druckerfreundliche Schwarz-Weiß-Variante fehlt.');
assert(dialog.querySelector('[name="imageScope"] option[value="phase"]'), 'Einzelne Phase fehlt im Bildexport.');
assert(dialog.querySelector('[name="imageScope"] option[value="all"]'), 'Phasenübersicht fehlt im Bildexport.');
assert(dialog.querySelector('[name="margin"]'), 'Wählbarer Außenabstand fehlt im Bildexport.');

const options = module.normalizeExportOptions({
  format: 'image', imageScope: 'all', imageLayout: 'grid', includeText: false, margin: 72
});
assert(options.format === 'image' && options.imageScope === 'all' && options.imageLayout === 'grid', 'Bildoptionen werden nicht normalisiert.');
assert(options.margin === 72 && options.includeText === false, 'Außenabstand oder Textoption geht verloren.');

console.log('CourtHub Play Editor 2.0: gemeinsamer Exportdialog erfolgreich geprüft.');
dom.window.close();
