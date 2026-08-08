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
    .che-overlay{position:fixed;z-index:1400;inset:0;display:grid;place-items:center;padding:max(1rem,var(--courthub-safe-top,env(safe-area-inset-top,0px))) max(1rem,var(--courthub-safe-right,env(safe-area-inset-right,0px))) max(1rem,var(--courthub-safe-bottom,env(safe-area-inset-bottom,0px))) max(1rem,var(--courthub-safe-left,env(safe-area-inset-left,0px)));background:rgba(24,29,32,.28);backdrop-filter:blur(.25rem)}.che-dialog{width:min(43rem,100%);max-height:100%;overflow:auto;border:1px solid #e4e6e7;border-radius:.55rem;background:#fff;color:#283138;box-shadow:0 1.5rem 4rem rgba(25,32,36,.22)}.che-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem .9rem;border-bottom:1px solid #eceeef}.che-head .chq-kicker{color:#ef6b52}.che-head h2{margin:0;font-size:1rem}.che-head .chq-btn{border:0;background:transparent;font-size:1.2rem;cursor:pointer}.che-formats{display:grid;grid-template-columns:repeat(4,1fr);gap:.45rem;padding:.8rem}.che-format{display:grid;place-items:center;gap:.15rem;min-height:3.6rem;border:1px solid #e4e6e7;border-radius:.4rem;background:#fff;color:#4e585e;font-weight:750;cursor:pointer}.che-format small{font-size:.58rem;font-weight:500;color:#959b9e}.che-format.active{border-color:#ef9c8c;background:#fff0ed;color:#b5412d}.che-format:disabled{opacity:.4;cursor:not-allowed}.che-panel{display:grid;gap:.75rem;padding:.8rem;border-top:1px solid #eceeef}.che-panel[hidden]{display:none}.che-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}.che-field{display:grid;gap:.3rem}.che-field>span{font-size:.67rem;color:#7d8589;font-weight:650}.che-field select,.che-field input[type="number"]{width:100%;border:1px solid #dfe2e3;border-radius:.35rem;background:#fff;color:#343e44;padding:.58rem}.che-check{display:flex;align-items:center;gap:.45rem;min-height:2.65rem;color:#596268;font-size:.72rem}.che-actions{display:flex;justify-content:flex-end;gap:.45rem;padding:.8rem;border-top:1px solid #eceeef}.che-actions .chq-btn{min-height:2.5rem;padding:.45rem .75rem;border:1px solid #dfe2e3;border-radius:.35rem;background:#fff;cursor:pointer}.che-actions .primary{border-color:#111;background:#111;color:#fff}
    @media(max-width:600px){.che-overlay{padding:max(.4rem,var(--courthub-safe-top,env(safe-area-inset-top,0px))) max(.4rem,var(--courthub-safe-right,env(safe-area-inset-right,0px))) max(.4rem,var(--courthub-safe-bottom,env(safe-area-inset-bottom,0px))) max(.4rem,var(--courthub-safe-left,env(safe-area-inset-left,0px)))}.che-formats{grid-template-columns:1fr 1fr}.che-grid{grid-template-columns:1fr}.che-actions button{min-height:44px;flex:1}}
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
