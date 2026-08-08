import { createCourt, drawCourt } from './rendering.js';
import { normalizeRecordedBoard } from './phase-recorder-core.js';
import { visiblePhases } from './phase-rail.js';

function injectStyles() {
  if (document.getElementById('courthub-play-preview-2')) return;
  const style = document.createElement('style');
  style.id = 'courthub-play-preview-2';
  style.textContent = `
    .chp-overlay{position:fixed;z-index:1200;inset:0;overflow:auto;padding:1rem;background:rgba(2,12,8,.78);backdrop-filter:blur(.7rem)}
    .chp-preview{width:min(74rem,100%);margin:auto;border:1px solid rgba(255,255,255,.13);border-radius:1.1rem;background:#f5f7f5;color:#14231c;box-shadow:0 2rem 6rem rgba(0,0,0,.45);overflow:hidden}
    [data-theme="dark"] .chp-preview{background:#07140f;color:#f5f8f6}
    .chp-head{position:sticky;z-index:3;top:0;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;border-bottom:1px solid rgba(18,58,39,.13);background:inherit}.chp-head h1{margin:0;font-size:1.45rem}.chp-head p{margin:.28rem 0 0;color:#64756d;line-height:1.5}.chp-actions{display:flex;gap:.4rem;flex-wrap:wrap}
    .chp-phases{display:grid;gap:1rem;padding:1rem}.chp-phase{display:grid;grid-template-columns:minmax(18rem,1fr) minmax(16rem,.8fr);gap:1rem;align-items:start;padding:1rem;border:1px solid rgba(18,58,39,.12);border-radius:.9rem;background:rgba(255,255,255,.58)}[data-theme="dark"] .chp-phase{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.1)}
    .chp-phase-diagram{overflow:hidden;border-radius:.72rem;background:#07151b}.chp-phase-diagram svg{display:block;width:100%;height:auto}.chp-phase-copy{display:grid;gap:.55rem}.chp-phase-number{color:#d76812;font-size:.66rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.chp-phase-copy h2{margin:0;font-size:1rem}.chp-instruction{white-space:pre-wrap;line-height:1.62;color:inherit}.chp-instruction.is-empty{color:#718078;font-style:italic}
    @media(max-width:720px){.chp-overlay{padding:.45rem}.chp-head{position:relative;flex-direction:column}.chp-phase{grid-template-columns:1fr;padding:.65rem}.chp-actions{width:100%}.chp-actions button{flex:1;min-height:44px}}
  `;
  document.head.append(style);
}

export function createPlayPreview(boardInput, suppliedCore) {
  injectStyles();
  const core = suppliedCore || window.BT.tactics.__core;
  const board = normalizeRecordedBoard(boardInput, core);
  const root = document.createElement('article');
  root.className = 'chp-preview';
  root.dataset.readonly = 'true';
  root.innerHTML = `
    <header class="chp-head"><div><span class="chq-kicker">Playbook-Vorschau</span><h1></h1><p></p></div><div class="chp-actions"><button class="chq-btn primary" type="button" data-action="preview-animation">Animation abspielen</button><button class="chq-btn" type="button" data-action="preview-export">Export</button><button class="chq-btn icon" type="button" data-action="preview-close" aria-label="Vorschau schließen">×</button></div></header>
    <div class="chp-phases"></div>`;
  root.querySelector('h1').textContent = board.title || 'CourtHub Play';
  root.querySelector('.chp-head p').textContent = board.description || board.category || '';
  const phases = root.querySelector('.chp-phases');
  visiblePhases(board).forEach((step, index) => {
    const section = document.createElement('section');
    section.className = 'chp-phase';
    const diagram = document.createElement('div');
    diagram.className = 'chp-phase-diagram';
    const svg = createCourt('chpd-court chp-preview-court');
    drawCourt(svg, step, { sourceStep: step, showGuides: true });
    diagram.append(svg);
    const copy = document.createElement('div');
    copy.className = 'chp-phase-copy';
    copy.innerHTML = `<span class="chp-phase-number">Phase ${String(index + 1).padStart(2, '0')}</span><h2></h2><div class="chp-instruction"></div>`;
    copy.querySelector('h2').textContent = `${board.title} · Phase ${index + 1}`;
    const instruction = copy.querySelector('.chp-instruction');
    instruction.textContent = step.instruction || 'Für diese Phase ist noch keine Traineranweisung hinterlegt.';
    instruction.classList.toggle('is-empty', !step.instruction);
    section.append(diagram, copy);
    phases.append(section);
  });
  return root;
}

export function openPlayPreview(board, options = {}) {
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'chp-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Playbook-Vorschau');
  const preview = createPlayPreview(board, options.core);
  overlay.append(preview);
  const close = () => {
    overlay.remove();
    previousFocus?.focus?.();
  };
  preview.querySelector('[data-action="preview-close"]').onclick = close;
  preview.querySelector('[data-action="preview-animation"]').onclick = () => options.onPlay?.();
  preview.querySelector('[data-action="preview-export"]').onclick = () => options.onExport?.();
  overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.body.append(overlay);
  preview.querySelector('[data-action="preview-close"]').focus();
  return { overlay, preview, close };
}
