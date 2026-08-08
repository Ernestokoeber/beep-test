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

async function drawSnapshot(context, snapshot, width, height, sourceStep, options = {}) {
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
    context.save();
    context.filter = options.grayscale ? 'grayscale(1)' : 'none';
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    context.restore();
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

function exportSteps(board) {
  return board.steps.slice(0, Math.max(1, board.steps.length - 1));
}

export async function exportPdf(boardInput, options = {}) {
  const board = core.normalizeBoard(boardInput);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1520;
    canvas.height = 1100;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas wird von diesem Browser nicht unterstützt.');

    toast('PDF wird vollständig lokal erstellt …');
    const pages = [];
    const steps = exportSteps(board);
    if (options.pdfLayout === 'grid') {
      const cellWidth = canvas.width / 2;
      const cellHeight = canvas.height / 2;
      const diagramWidth = cellWidth - 20;
      const diagramHeight = cellHeight - 78;
      for (let batch = 0; batch < steps.length; batch += 4) {
        context.fillStyle = '#f7f8f5';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const batchSteps = steps.slice(batch, batch + 4);
        for (let offset = 0; offset < batchSteps.length; offset += 1) {
          const index = batch + offset;
          const step = batchSteps[offset];
          const column = offset % 2;
          const row = Math.floor(offset / 2);
          const x = column * cellWidth + 10;
          const y = row * cellHeight + 10;
          const temporary = document.createElement('canvas');
          temporary.width = diagramWidth;
          temporary.height = diagramHeight;
          const temporaryContext = temporary.getContext('2d');
          if (!temporaryContext) throw new Error('Temporäres Court-Canvas konnte nicht erstellt werden.');
          await drawSnapshot(temporaryContext, step, diagramWidth, diagramHeight, step, options);
          context.drawImage(temporary, x, y);
          context.fillStyle = '#14231c';
          context.font = '700 22px Inter, system-ui, sans-serif';
          context.textBaseline = 'top';
          context.fillText(`Phase ${index + 1} · ${step.duration.toFixed(1)} s`, x, y + diagramHeight + 10, diagramWidth);
          context.fillStyle = '#52665c';
          context.font = '400 17px Inter, system-ui, sans-serif';
          context.fillText(String(step.instruction || '').slice(0, 92), x, y + diagramHeight + 40, diagramWidth);
        }
        pages.push({
          title: board.title || 'CourtHub Play',
          subtitle: (board.description || board.category || '').slice(0, 140),
          footer: `Phasen ${batch + 1}–${batch + batchSteps.length} / ${steps.length} · 2×2-Raster · 2D-Halbfeld${options.grayscale ? ' · Schwarz-Weiß' : ''}`,
          imageBytes: await canvasJpegBytes(canvas),
          imageWidth: canvas.width,
          imageHeight: canvas.height
        });
        await yieldToBrowser();
      }
    } else {
      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];
        await drawSnapshot(context, step, canvas.width, canvas.height, step, options);
        pages.push({
          title: board.title || 'CourtHub Play',
          subtitle: options.pdfLayout === 'diagrams'
            ? ''
            : (step.instruction || board.description || board.category || '').slice(0, 140),
          footer: `Phase ${index + 1} / ${steps.length} · ${step.duration.toFixed(1)} s · 2D-Halbfeld${options.grayscale ? ' · Schwarz-Weiß' : ''}`,
          imageBytes: await canvasJpegBytes(canvas),
          imageWidth: canvas.width,
          imageHeight: canvas.height
        });
        if (index % 2 === 1) await yieldToBrowser();
      }
    }

    const blob = createPdfBlob(pages);
    if (!blob.size) throw new Error('Der erzeugte PDF-Download ist leer.');
    downloadBlob(blob, safeFilename(board.title, 'pdf'));
    toast(`Play-PDF offline erstellt${options.pdfLayout === 'grid' ? ' · 2×2-Raster' : ''}.`);
  } catch (error) {
    console.error('CourtHub PDF export failed', error);
    toast('PDF-Export fehlgeschlagen: ' + error.message);
  }
}

function canvasPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      try {
        const data = canvas.toDataURL('image/png');
        const bytes = decodeBase64(data.split(',')[1] || '');
        resolve(new Blob([bytes], { type: 'image/png' }));
      } catch (error) {
        reject(error);
      }
      return;
    }
    canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('Das PNG konnte nicht erzeugt werden.')), 'image/png');
  });
}

export async function exportImage(boardInput, options = {}) {
  const board = core.normalizeBoard(boardInput);
  const allSteps = exportSteps(board);
  const steps = options.imageScope === 'phase'
    ? [allSteps[Math.min(allSteps.length - 1, Math.max(0, Number(options.activePhase) || 0))]]
    : allSteps;
  try {
    const margin = Math.max(0, Math.min(160, Number(options.margin) || 0));
    const diagramWidth = 760;
    const diagramHeight = 550;
    const columns = options.imageLayout === 'row' ? steps.length : Math.min(2, steps.length);
    const rows = Math.max(1, Math.ceil(steps.length / Math.max(1, columns)));
    const textHeight = options.includeText === false || options.imageLayout === 'diagrams' ? 0 : 94;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, margin * 2 + columns * diagramWidth + Math.max(0, columns - 1) * margin);
    canvas.height = Math.max(1, margin * 2 + rows * (diagramHeight + textHeight) + Math.max(0, rows - 1) * margin);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas wird von diesem Browser nicht unterstützt.');
    context.fillStyle = '#f7f8f5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#14231c';
    context.font = '700 24px Inter, system-ui, sans-serif';
    context.textBaseline = 'top';
    for (let index = 0; index < steps.length; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (diagramWidth + margin);
      const y = margin + row * (diagramHeight + textHeight + margin);
      const temporary = document.createElement('canvas');
      temporary.width = diagramWidth;
      temporary.height = diagramHeight;
      const tempContext = temporary.getContext('2d');
      if (!tempContext) throw new Error('Temporäres Court-Canvas konnte nicht erstellt werden.');
      await drawSnapshot(tempContext, steps[index], diagramWidth, diagramHeight, steps[index]);
      context.drawImage(temporary, x, y);
      if (textHeight) {
        context.fillText(`Phase ${index + 1} · ${board.title}`, x, y + diagramHeight + 14, diagramWidth);
        context.font = '400 18px Inter, system-ui, sans-serif';
        context.fillStyle = '#52665c';
        context.fillText(String(steps[index].instruction || board.description || '').slice(0, 110), x, y + diagramHeight + 48, diagramWidth);
        context.font = '700 24px Inter, system-ui, sans-serif';
        context.fillStyle = '#14231c';
      }
      if (index % 2 === 1) await yieldToBrowser();
    }
    const blob = await canvasPngBlob(canvas);
    downloadBlob(blob, safeFilename(board.title, 'png'));
    toast('Play-Bild lokal als PNG erstellt.');
  } catch (error) {
    console.error('CourtHub image export failed', error);
    toast('Bildexport fehlgeschlagen: ' + error.message);
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
