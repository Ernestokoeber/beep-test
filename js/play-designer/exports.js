import { createCourt, drawCourt, COURT_VIEW } from './rendering.js';
import { enhanceCourt } from './court-enhancements.js';

const core = window.BT.tactics.__core;

function toast(message) {
  if (window.BT.util?.toast) window.BT.util.toast(message);
}

function loadScript(src, test) {
  if (test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Zusatzmodul konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });
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

export async function exportPdf(boardInput) {
  const board = core.normalizeBoard(boardInput);
  try {
    await loadScript(
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
      () => !!window.jspdf?.jsPDF
    );
    const doc = new window.jspdf.jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1520;
    canvas.height = 1100;
    const context = canvas.getContext('2d');

    for (let index = 0; index < board.steps.length; index += 1) {
      const step = board.steps[index];
      if (index) doc.addPage();
      await drawSnapshot(context, step, canvas.width, canvas.height, step);
      doc.setFontSize(20);
      doc.text(board.title || 'CourtHub Play', 36, 36);
      doc.setFontSize(10);
      doc.text((board.description || board.category || '').slice(0, 140), 36, 54);
      doc.addImage(canvas.toDataURL('image/jpeg', .92), 'JPEG', 118, 68, 606, 438);
      doc.text(
        `Schritt ${index + 1} / ${board.steps.length} · ${step.duration.toFixed(1)} s · Hallenparkett`,
        118,
        522
      );
    }

    doc.save(
      (board.title || 'courthub-play').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.pdf'
    );
    toast('Play-PDF mit Hallenparkett erstellt.');
  } catch (error) {
    toast('PDF-Export fehlgeschlagen: ' + error.message);
  }
}

export async function exportGif(boardInput) {
  const board = core.normalizeBoard(boardInput);
  try {
    await loadScript(
      'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js',
      () => !!window.GIF
    );
    const width = 608;
    const height = 440;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const gif = new window.GIF({
      workers: 2,
      quality: 11,
      width,
      height,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
      background: '#050b12'
    });
    const total = window.BT.tactics.boardDuration(board);
    const fps = 12;
    const frames = Math.max(2, Math.ceil(total * fps));

    for (let index = 0; index <= frames; index += 1) {
      const snapshot = window.BT.tactics.snapshotAt(board, total * index / frames);
      await drawSnapshot(context, snapshot, width, height, snapshot._sourceStep);
      gif.addFrame(context, { delay: Math.round(1000 / fps), copy: true });
    }

    const blob = await new Promise((resolve, reject) => {
      gif.on('finished', resolve);
      gif.on('abort', () => reject(new Error('GIF-Erzeugung abgebrochen.')));
      gif.render();
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      (board.title || 'courthub-play').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.gif';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Animiertes GIF mit Hallenparkett erstellt.');
  } catch (error) {
    toast('GIF-Export fehlgeschlagen: ' + error.message);
  }
}
