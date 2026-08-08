import { exportGif, exportImage, exportPdf } from './exports.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function normalizeExportOptions(input = {}) {
  const format = ['pdf', 'image', 'gif'].includes(input.format) ? input.format : 'pdf';
  return {
    format,
    pdfLayout: ['phase-text', 'grid', 'diagrams'].includes(input.pdfLayout) ? input.pdfLayout : 'phase-text',
    grayscale: input.grayscale === true,
    imageScope: input.imageScope === 'phase' ? 'phase' : 'all',
    imageLayout: ['row', 'grid', 'diagrams'].includes(input.imageLayout) ? input.imageLayout : 'grid',
    includeText: input.includeText !== false,
    margin: clamp(input.margin ?? 40, 0, 160),
    activePhase: Math.max(0, Math.floor(Number(input.activePhase) || 0))
  };
}

function injectStyles() {
  if (document.getElementById('courthub-export-dialog-2')) return;
  const style = document.createElement('style');
  style.id = 'courthub-export-dialog-2';
  style.textContent = `
    .che-overlay{position:fixed;z-index:1400;inset:0;display:grid;place-items:center;padding:1rem;background:rgba(2,10,7,.82);backdrop-filter:blur(.75rem)}.che-dialog{width:min(46rem,100%);max-height:94vh;overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:1rem;background:#07151b;color:#f7fafc;box-shadow:0 2rem 6rem rgba(0,0,0,.52)}.che-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem .9rem;border-bottom:1px solid rgba(255,255,255,.1)}.che-head h2{margin:0;font-size:1rem}.che-formats{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;padding:.75rem}.che-format{min-height:3.4rem;border:1px solid rgba(255,255,255,.12);border-radius:.72rem;background:#10242b;color:#f7fafc;font-weight:850;cursor:pointer}.che-format.active{border-color:#ff9d2e;background:rgba(255,157,46,.14);color:#ffc47d}.che-format:disabled{opacity:.45;cursor:not-allowed}.che-panel{display:grid;gap:.7rem;padding:.75rem;border-top:1px solid rgba(255,255,255,.09)}.che-panel[hidden]{display:none}.che-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}.che-field{display:grid;gap:.3rem}.che-field>span{font-size:.67rem;color:#9db0a7;font-weight:780}.che-field select,.che-field input[type="number"]{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:.62rem;background:#061218;color:#f7fafc;padding:.58rem}.che-check{display:flex;align-items:center;gap:.45rem;min-height:2.65rem;color:#d9e5df;font-size:.72rem}.che-actions{display:flex;justify-content:flex-end;gap:.45rem;padding:.75rem;border-top:1px solid rgba(255,255,255,.09)}
    @media(max-width:600px){.che-overlay{padding:.4rem}.che-formats{grid-template-columns:1fr 1fr}.che-grid{grid-template-columns:1fr}.che-actions button{min-height:44px;flex:1}}
  `;
  document.head.append(style);
}

export function createExportDialog(boardInput) {
  injectStyles();
  const root = document.createElement('section');
  root.className = 'che-dialog';
  root.innerHTML = `
    <header class="che-head"><div><span class="chq-kicker">Ausgabe</span><h2>Play exportieren</h2></div><button class="chq-btn icon" type="button" data-action="export-close" aria-label="Exportdialog schließen">×</button></header>
    <div class="che-formats" role="tablist" aria-label="Exportformat">
      <button class="che-format active" type="button" data-export-format="pdf">PDF<small>Playbook &amp; Druck</small></button>
      <button class="che-format" type="button" data-export-format="image">Bild<small>PNG</small></button>
      <button class="che-format" type="button" data-export-format="gif">GIF<small>Animation</small></button>
      <button class="che-format" type="button" data-export-format="video" disabled title="Nachgelagerte Ausbaustufe">Video<small>Spätere Ausbaustufe</small></button>
    </div>
    <div class="che-panel" data-export-panel="pdf">
      <label class="che-field"><span>PDF-Aufbau</span><select name="pdfLayout"><option value="phase-text">Diagramm und Beschreibung</option><option value="grid">Rasteransicht</option><option value="diagrams">Nur Diagramme</option></select></label>
      <label class="che-check"><input type="checkbox" name="grayscale"> Druckerfreundliche Schwarz-Weiß-Variante</label>
    </div>
    <div class="che-panel" data-export-panel="image" hidden>
      <div class="che-grid"><label class="che-field"><span>Umfang</span><select name="imageScope"><option value="phase">Einzelne Phase</option><option value="all" selected>Vollständige Phasenübersicht</option></select></label><label class="che-field"><span>Anordnung</span><select name="imageLayout"><option value="row">Reihe</option><option value="grid" selected>Raster</option><option value="diagrams">Nur Diagramme</option></select></label></div>
      <div class="che-grid"><label class="che-check"><input type="checkbox" name="includeText" checked> Titel und Traineranweisungen</label><label class="che-field"><span>Außenabstand in Pixel</span><input type="number" name="margin" min="0" max="160" step="8" value="40"></label></div>
    </div>
    <div class="che-panel" data-export-panel="gif" hidden><p class="chq-help">Erstellt die vorhandene zweidimensionale CourtHub-Animation als lokal berechnetes GIF.</p></div>
    <footer class="che-actions"><button class="chq-btn" type="button" data-action="export-cancel">Abbrechen</button><button class="chq-btn primary" type="button" data-action="export-run">Export erstellen</button></footer>`;

  let format = 'pdf';
  root.querySelectorAll('[data-export-format]:not(:disabled)').forEach(button => {
    button.onclick = () => {
      format = button.dataset.exportFormat;
      root.querySelectorAll('[data-export-format]').forEach(candidate => candidate.classList.toggle('active', candidate === button));
      root.querySelectorAll('[data-export-panel]').forEach(panel => { panel.hidden = panel.dataset.exportPanel !== format; });
    };
  });
  root.getOptions = () => normalizeExportOptions({
    format,
    pdfLayout: root.querySelector('[name="pdfLayout"]').value,
    grayscale: root.querySelector('[name="grayscale"]').checked,
    imageScope: root.querySelector('[name="imageScope"]').value,
    imageLayout: root.querySelector('[name="imageLayout"]').value,
    includeText: root.querySelector('[name="includeText"]').checked,
    margin: root.querySelector('[name="margin"]').value,
    activePhase: boardInput?.currentStep || 0
  });
  return root;
}

export function openExportDialog(board) {
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'che-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Play exportieren');
  const dialog = createExportDialog(board);
  overlay.append(dialog);
  const close = () => {
    overlay.remove();
    previousFocus?.focus?.();
  };
  dialog.querySelector('[data-action="export-close"]').onclick = close;
  dialog.querySelector('[data-action="export-cancel"]').onclick = close;
  dialog.querySelector('[data-action="export-run"]').onclick = async () => {
    const options = dialog.getOptions();
    const before = JSON.stringify(board);
    if (options.format === 'pdf') await exportPdf(board, options);
    if (options.format === 'image') await exportImage(board, options);
    if (options.format === 'gif') await exportGif(board);
    if (JSON.stringify(board) !== before) throw new Error('Ein Export darf das Play nicht verändern.');
  };
  overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.body.append(overlay);
  dialog.querySelector('[data-action="export-close"]').focus();
  return { overlay, dialog, close };
}
