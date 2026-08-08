import { createCourt, drawCourt, formatTime } from './rendering.js';
import { normalizeRecordedBoard } from './phase-recorder-core.js';
import { visiblePhases } from './phase-rail.js';

function injectStyles() {
  if (document.getElementById('courthub-animation-player-2')) return;
  const style = document.createElement('style');
  style.id = 'courthub-animation-player-2';
  style.textContent = `
    .cha-overlay{position:fixed;z-index:1300;inset:0;overflow:auto;padding:0;background:#fff}
    .cha-player{position:relative;width:100%;min-height:100dvh;overflow:hidden;background:#fff;color:#282321}.cha-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;height:3.5rem;padding:0 1.4rem;border-bottom:1px solid #eceeef}.cha-head>div{display:flex;align-items:center;gap:.5rem}.cha-head .chq-kicker{display:none}.cha-head h2{margin:0;font-size:.9rem;font-weight:550}.cha-head .chq-btn{display:grid;place-items:center;width:2.5rem;height:2.5rem;border:0;border-radius:.3rem;background:transparent;font-size:1.2rem;cursor:pointer}.cha-head .chq-btn:hover{background:#f4f5f5}
    .cha-court{display:grid;place-items:center;min-height:calc(100dvh - 3.5rem);padding:1rem 1rem 6.5rem}.cha-court svg{display:block;width:min(54rem,calc((100dvh - 8rem) * 1.1515),100%);height:auto;border-radius:.35rem;box-shadow:0 .5rem 1.8rem rgba(74,52,37,.12)}
    .cha-controls{position:fixed;z-index:5;left:50%;bottom:1rem;display:grid;grid-template-columns:auto minmax(12rem,1fr) auto;gap:.75rem;align-items:center;width:min(45rem,calc(100% - 1.5rem));padding:.55rem .75rem;border:1px solid #eceeef;border-radius:.75rem;background:rgba(255,255,255,.96);box-shadow:0 .6rem 1.8rem rgba(28,35,39,.14);backdrop-filter:blur(.6rem)}.cha-buttons,.cha-speeds{display:flex;align-items:center;gap:.3rem}.cha-buttons .chq-btn,.cha-speeds .chq-btn{min-height:2.35rem;padding:.35rem .55rem;border:1px solid transparent;border-radius:.35rem;background:transparent;color:#505a60;font-size:.68rem;cursor:pointer}.cha-buttons .primary{display:grid;place-items:center;width:2.7rem;height:2.7rem;padding:0;border-radius:50%;background:#111;color:#fff;font-size:1rem}.cha-progress-wrap{display:grid;gap:.2rem}.cha-time{display:flex;justify-content:space-between;color:#989da0;font-size:.58rem}.cha-track{position:relative}.cha-track input{width:100%;accent-color:#25323a}.cha-markers{position:absolute;inset:50% .5rem auto;pointer-events:none}.cha-marker{position:absolute;width:2px;height:.55rem;transform:translate(-1px,-50%);background:#9aa0a4;border-radius:2px;opacity:.65}.cha-speeds button.active{border-color:#dfe2e3;background:#f5f6f6;color:#222}.cha-player[data-reduced-motion="true"] .cha-marker{transition:none}
    @media(max-width:680px){.cha-head{padding:0 .55rem}.cha-court{min-height:0;padding:.5rem .4rem 7rem}.cha-court svg{width:100%}.cha-controls{grid-template-columns:auto minmax(8rem,1fr);bottom:calc(.6rem + env(safe-area-inset-bottom));padding:.5rem}.cha-speeds{grid-column:1/-1;justify-content:center}.cha-controls button{min-height:44px}}
  `;
  document.head.append(style);
}

function playableDuration(board) {
  return visiblePhases(board).reduce((sum, step) => sum + Math.max(.3, Number(step.duration) || .3), 0);
}

export function createAnimationPlayer(boardInput, suppliedCore) {
  injectStyles();
  const core = suppliedCore || window.BT.tactics.__core;
  const board = normalizeRecordedBoard(boardInput, core);
  const phases = visiblePhases(board);
  const total = playableDuration(board);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const element = document.createElement('section');
  element.className = 'cha-player';
  element.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  element.innerHTML = `
    <header class="cha-head"><div><span class="chq-kicker">2D-Animation</span><h2></h2></div><button class="chq-btn icon" type="button" data-action="animation-close" aria-label="Animationsplayer schließen">×</button></header>
    <div class="cha-court" data-role="animation-court"></div>
    <div class="cha-controls">
      <div class="cha-buttons"><button class="chq-btn icon primary" type="button" data-action="animation-toggle" aria-label="Animation abspielen">▶</button><button class="chq-btn icon" type="button" data-action="animation-reset" aria-label="Animation zurücksetzen">↺</button></div>
      <div class="cha-progress-wrap"><div class="cha-time"><span data-role="animation-time">0.0 s</span><span>${formatTime(total)}</span></div><div class="cha-track"><input type="range" min="0" max="${Math.round(total * 1000)}" value="0" data-role="animation-progress" aria-label="Animationsposition"><div class="cha-markers" data-role="phase-markers"></div></div></div>
      <div class="cha-speeds" aria-label="Wiedergabegeschwindigkeit"><button class="chq-btn" type="button" data-speed="0.5">0,5x</button><button class="chq-btn active" type="button" data-speed="1">1x</button><button class="chq-btn" type="button" data-speed="1.5">1,5x</button></div>
    </div>`;
  element.querySelector('h2').textContent = board.title || 'CourtHub Play';
  const svg = createCourt('chpd-court cha-animation-court');
  element.querySelector('[data-role="animation-court"]').append(svg);
  const markers = element.querySelector('[data-role="phase-markers"]');
  let elapsed = 0;
  phases.forEach((phase, index) => {
    const marker = document.createElement('span');
    marker.className = 'cha-marker';
    marker.dataset.phaseMarker = String(index);
    marker.style.left = `${total ? elapsed / total * 100 : 0}%`;
    marker.title = `Phase ${index + 1}`;
    markers.append(marker);
    elapsed += Math.max(.3, Number(phase.duration) || .3);
  });

  let time = 0;
  let speed = 1;
  let playing = false;
  let frame = 0;
  let last = 0;
  const toggle = element.querySelector('[data-action="animation-toggle"]');
  const progress = element.querySelector('[data-role="animation-progress"]');
  const timeLabel = element.querySelector('[data-role="animation-time"]');

  const render = () => {
    const snapshot = window.BT.tactics.snapshotAt(board, Math.min(time, total));
    drawCourt(svg, snapshot, { sourceStep: snapshot._sourceStep, showGuides: false });
    progress.value = String(Math.round(time * 1000));
    timeLabel.textContent = formatTime(time);
    toggle.textContent = playing ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', playing ? 'Animation pausieren' : 'Animation abspielen');
  };

  const stop = () => {
    playing = false;
    last = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const tick = timestamp => {
    if (!playing || !element.isConnected) return stop();
    if (!last) last = timestamp;
    time += Math.min(.08, (timestamp - last) / 1000) * speed;
    last = timestamp;
    if (time >= total) {
      time = total;
      stop();
    }
    render();
    if (playing) frame = requestAnimationFrame(tick);
  };

  toggle.onclick = () => {
    if (playing) {
      stop();
      render();
      return;
    }
    if (time >= total - .01) time = 0;
    if (reducedMotion) {
      let elapsed = 0;
      let nextBoundary = total;
      for (const phase of phases) {
        elapsed += Math.max(.3, Number(phase.duration) || .3);
        if (elapsed > time + .01) {
          nextBoundary = elapsed;
          break;
        }
      }
      time = Math.min(total, nextBoundary);
      render();
      return;
    }
    playing = true;
    frame = requestAnimationFrame(tick);
    render();
  };
  element.querySelector('[data-action="animation-reset"]').onclick = () => { stop(); time = 0; render(); };
  progress.oninput = () => { stop(); time = Math.min(total, Math.max(0, Number(progress.value) / 1000)); render(); };
  element.querySelectorAll('[data-speed]').forEach(button => {
    button.onclick = () => {
      speed = Number(button.dataset.speed) || 1;
      element.querySelectorAll('[data-speed]').forEach(candidate => candidate.classList.toggle('active', candidate === button));
    };
  });
  render();
  return { element, stop, destroy() { stop(); element.remove(); } };
}

export function openAnimationPlayer(board, options = {}) {
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'cha-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Play-Animation');
  const player = createAnimationPlayer(board, options.core);
  overlay.append(player.element);
  const close = () => {
    player.destroy();
    overlay.remove();
    previousFocus?.focus?.();
  };
  player.element.querySelector('[data-action="animation-close"]').onclick = close;
  overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.body.append(overlay);
  player.element.querySelector('[data-action="animation-close"]').focus();
  return { overlay, player, close };
}
