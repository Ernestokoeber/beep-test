import { createCourt, drawCourt } from './rendering.js';
import { normalizeRecordedBoard } from './phase-recorder-core.js';
import { visiblePhases } from './phase-rail.js';

function injectStyles() {
  if (document.getElementById('courthub-play-preview-2')) return;
  const style = document.createElement('style');
  style.id = 'courthub-play-preview-2';
  style.textContent = `
    .chp-overlay{position:fixed;z-index:1200;inset:0;overflow:auto;padding:0;background:#fff}
    .chp-preview{width:100%;min-height:100dvh;margin:0;background:#fff;color:#282321}
    .chp-head{position:sticky;z-index:3;top:0;display:flex;align-items:center;justify-content:space-between;gap:1rem;height:3.5rem;padding:0 1.4rem;border-bottom:1px solid #eceeef;background:rgba(255,255,255,.96);backdrop-filter:blur(.6rem)}
    .chp-head>div{display:flex;align-items:center;gap:.55rem}.chp-head .chq-kicker,.chp-head p{display:none}.chp-head h1{margin:0;font-size:.88rem;font-weight:550}.chp-actions{display:flex;align-items:center;gap:.25rem}.chp-actions .chq-btn{min-height:2.5rem;padding:.45rem .65rem;border:0;border-radius:.3rem;background:transparent;color:#354048;font-size:.78rem;cursor:pointer}.chp-actions .chq-btn:hover{background:#f4f5f5}.chp-actions .primary{position:fixed;right:1rem;bottom:1rem;z-index:5;background:#111;color:#fff;box-shadow:0 .6rem 1.5rem rgba(0,0,0,.16)}
    .chp-intro{width:min(54rem,calc(100% - 2rem));margin:0 auto;padding:3rem 0 1.6rem;border-bottom:1px solid #eceeef}.chp-intro h2{margin:0;font-size:1.6rem}.chp-intro p{margin:.55rem 0 1.4rem;color:#5f5b58;font-size:.82rem;line-height:1.55}.chp-meta{display:flex;align-items:center;gap:.6rem;color:#8a8987;font-size:.7rem}.chp-avatar{display:grid;place-items:center;width:2.35rem;height:2.35rem;border-radius:50%;background:#ef6b52;color:#fff;font-weight:750}
    .chp-phases{display:grid;gap:2rem;width:min(54rem,calc(100% - 2rem));margin:0 auto;padding:2rem 0 5rem}
    .chp-phase{display:grid;grid-template-columns:16.2rem minmax(0,1fr);gap:1.5rem;align-items:start;padding-top:1.5rem;border-top:1px solid #eceeef;background:#fff}
    .chp-phase:first-child{border-top:0;padding-top:0}.chp-phase-diagram{position:relative;overflow:hidden;border-radius:.3rem;background:#f8d9b2}.chp-phase-diagram svg{display:block;width:100%;height:auto}.chp-phase-copy{display:grid;gap:.65rem;padding:.25rem 0}.chp-phase-number{display:inline-grid;place-items:center;width:1.65rem;height:1.35rem;border-radius:.2rem;background:#666;color:#fff;font-size:.62rem;font-weight:750}.chp-phase-copy h2{display:none}.chp-instruction{white-space:pre-wrap;color:#4d4a48;font-size:.78rem;line-height:1.65}.chp-instruction.is-empty{color:#a0a0a0}
    @media(max-width:720px){.chp-head{padding:0 .55rem}.chp-head h1{max-width:10rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chp-actions .chq-btn:not(.primary){padding:.35rem}.chp-phases{gap:1.2rem;padding-top:1.5rem}.chp-phase{grid-template-columns:1fr;gap:.75rem}.chp-phase-diagram{width:100%}.chp-actions .primary{right:.65rem;bottom:calc(.65rem + env(safe-area-inset-bottom));min-height:44px}}
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
    <header class="chp-head"><div><span class="chq-kicker">Playbook-Vorschau</span><button class="chq-btn" type="button" data-action="preview-close" aria-label="Vorschau schließen">‹</button><h1></h1><p></p></div><div class="chp-actions"><button class="chq-btn primary" type="button" data-action="preview-animation">▶&nbsp; Animation abspielen</button><button class="chq-btn" type="button" data-action="preview-export">⇧&nbsp; Export</button></div></header>
    <section class="chp-intro"><h2></h2><p></p><div class="chp-meta"><span class="chp-avatar">CH</span><span>CourtHub Team · aktuell</span></div></section>
    <div class="chp-phases"></div>`;
  root.querySelector('h1').textContent = board.title || 'CourtHub Play';
  root.querySelector('.chp-head p').textContent = board.description || board.category || '';
  root.querySelector('.chp-intro h2').textContent = board.title || 'CourtHub Play';
  root.querySelector('.chp-intro p').textContent = board.description || board.category || '';
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
