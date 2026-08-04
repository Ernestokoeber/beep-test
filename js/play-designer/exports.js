import { createCourt, drawCourt, COURT_VIEW } from './rendering.js';
import { enhanceCourt } from './court-enhancements.js';
import { gifBlob, quantizeRgba332 } from './gif-encoder.js';
import { createPdfBlob } from './pdf-writer.js';

const core = window.BT.tactics.__core;

function toast(message) {
  if (window.BT.util?.toast) window.BT.util.toast(message);
}

function yieldToBrowser() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function safeFilename(title, extension) {
  const base = String(title || 'courthub-play')
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'courthub-play';
  return `${base}.${extension}`;
}

async function drawSnapshot(context, snapshot, width, height, sourceStep) {
  const svg = createCourt('chpd-export-court');
  drawCourt(svg, snapshot, {
    sourceStep: sourceStep || snapshot._sourceStep,
    showGuides: true
  });
  enhanceCourt(svg, { interactive: false });
  svg.setAttribute('width', String(COURT_VIEW.width));
  svg.setAttribute('height', String(COURT_VIEW.height));
  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const value = new Image();
      value.onload = () => resolve(value);
      value.onerror = () => reject(new Error('Play-Ansicht konnte nicht gerendert werden.'));
      value.src = url;
    });
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function canvasJpegBytes(canvas) {
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
    if (blob?.size) return new Uint8Array(await blob.arrayBuffer());
  }
  const dataUrl = canvas.toDataURL('image/jpeg', .92);
  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('Das Court-Bild konnte nicht in JPEG umgewandelt werden.');
  return decodeBase64(encoded);
}

export async function exportPdf(boardInput) {
  const board = core.normalizeBoard(boardInput);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1520;
    canvas.height = 1100;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas wird von diesem Browser nicht unterstützt.');

    toast('PDF wird vollständig lokal erstellt …');
    const pages = [];
    for (let index = 0; index < board.steps.length; index += 1) {
      const step = board.steps[index];
      await drawSnapshot(context, step, canvas.width, canvas.height, step);
      pages.push({
        title: board.title || 'CourtHub Play',
        subtitle: (board.description || board.category || '').slice(0, 140),
        footer: `Schritt ${index + 1} / ${board.steps.length} · ${step.duration.toFixed(1)} s · Hallenparkett`,
        imageBytes: await canvasJpegBytes(canvas),
        imageWidth: canvas.width,
        imageHeight: canvas.height
      });
      if (index % 2 === 1) await yieldToBrowser();
    }

    const blob = createPdfBlob(pages);
    if (!blob.size) throw new Error('Der erzeugte PDF-Download ist leer.');
    downloadBlob(blob, safeFilename(board.title, 'pdf'));
    toast('Play-PDF offline mit Hallenparkett erstellt.');
  } catch (error) {
    console.error('CourtHub PDF export failed', error);
    toast('PDF-Export fehlgeschlagen: ' + error.message);
  }
}

export async function exportGif(boardInput) {
  const board = core.normalizeBoard(boardInput);
  try {
    const total = window.BT.tactics.boardDuration(board);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Das Play besitzt keine gültige Dauer.');

    const width = 480;
    const height = Math.round(width * COURT_VIEW.height / COURT_VIEW.width);
    const maximumFrames = 96;
    const frameCount = Math.min(maximumFrames, Math.max(2, Math.ceil(total * 10)));
    const delay = Math.max(20, Math.round(total * 1000 / Math.max(1, frameCount - 1)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas wird von diesem Browser nicht unterstützt.');

    toast('GIF wird lokal erstellt …');
    const frames = [];
    let lastProgress = -1;

    for (let index = 0; index < frameCount; index += 1) {
      const time = frameCount === 1 ? 0 : total * index / (frameCount - 1);
      const snapshot = window.BT.tactics.snapshotAt(board, time);
      await drawSnapshot(context, snapshot, width, height, snapshot._sourceStep);
      const rgba = context.getImageData(0, 0, width, height).data;
      frames.push({ indexedPixels: quantizeRgba332(rgba), delay });

      const progress = Math.floor((index + 1) / frameCount * 4) * 25;
      if (progress > 0 && progress < 100 && progress !== lastProgress) {
        lastProgress = progress;
        toast(`GIF wird erstellt … ${progress} %`);
      }
      if (index % 3 === 2) await yieldToBrowser();
    }

    await yieldToBrowser();
    const blob = gifBlob({ width, height, frames, repeat: 0 });
    if (!blob.size) throw new Error('Der erzeugte GIF-Download ist leer.');
    downloadBlob(blob, safeFilename(board.title, 'gif'));
    toast(`Animiertes GIF erstellt · ${frameCount} Bilder.`);
  } catch (error) {
    console.error('CourtHub GIF export failed', error);
    toast('GIF-Export fehlgeschlagen: ' + error.message);
  }
}
