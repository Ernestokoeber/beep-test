import { createCourt, drawCourt } from './rendering.js';

function styles() {
  if (document.getElementById('courthub-court-view')) return;
  const style = document.createElement('style'); style.id = 'courthub-court-view';
  style.textContent = `
    .chcv{width:100%;min-width:0;max-width:58rem;margin:auto;display:grid;gap:.65rem}
    .chcv-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
    .chcv-toolbar button,.chcv-film-speed button{min-height:44px;padding:.5rem .85rem;border:1px solid #c4d0ca;border-radius:.5rem;background:#fff;color:#173e2d;font-family:inherit;font-weight:600;font-size:.875rem;cursor:pointer}
    .chcv-toolbar button[aria-pressed=true],.chcv-film-speed button[aria-pressed=true]{background:#006b40;border-color:#006b40;color:#fff}
    .chcv-toolbar button:focus-visible,.chcv-scene canvas:focus-visible{outline:3px solid #e99326;outline-offset:3px}
    .chcv-scene{width:100%;height:clamp(19rem,57dvh,38rem);overflow:hidden;border-radius:.6rem;background:#e9efed}
    .chcv-scene canvas{display:block;width:100%;height:100%;touch-action:none}
    .chcv [hidden]{display:none!important}.chcv-hint,.chcv-status{margin:0;font-size:.875rem;line-height:1.5;color:#3d5147}
    .chcv-status:empty{display:none}.chcv-2d{display:grid;place-items:center}.chcv-2d svg{width:100%;max-height:60dvh}
    .chcv-film video{display:block;width:100%;max-height:65dvh;background:#202d30;border-radius:.6rem;aspect-ratio:16/9}.chcv-film p{font-size:.875rem;line-height:1.5;color:#3d5147}
    .chcv-film-speed{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.65rem}
    .cha-controls[hidden],.chpd-transport[hidden]{display:none!important}
    @media(max-width:680px){.chcv-scene{height:clamp(19rem,48dvh,32rem)}.chcv-toolbar button{padding:.5rem .7rem}}
  `; document.head.append(style);
}

// Both viewers consume exactly the same snapshot and transport position.
export function createCourtView(host, board, options = {}) {
  styles();
  const element = document.createElement('div'); element.className = 'chcv';
  element.innerHTML = `<div class="chcv-toolbar" role="group" aria-label="Feldansicht"><button type="button" data-view="2d" aria-pressed="true">2D</button><button type="button" data-view="3d" aria-pressed="false">3D-Taktik</button><button type="button" data-camera="reset" hidden>Kamera zurücksetzen</button><button type="button" data-camera="top" hidden>Von oben</button></div><div class="chcv-2d"></div><div class="chcv-scene" hidden></div><p class="chcv-hint" hidden>Deine aufgezeichnete Taktik mit 3D-Spielern. Ziehen: drehen · Zwei Finger: zoomen · Grün: Angriff · Hell: Defense · Gelb: Screen</p><p class="chcv-status" role="status"></p>`;
  const flat = element.querySelector('.chcv-2d'), sceneHost = element.querySelector('.chcv-scene');
  const status = element.querySelector('.chcv-status');
  const filmIds = ['pick-and-roll', 'pick-and-pop', 'pick-and-roll-reject'];
  const hasFilm = board.builtIn === true && filmIds.includes(board.id);
  const filmHost = document.createElement('div'); filmHost.className = 'chcv-film'; filmHost.hidden = true;
  const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata';
  video.setAttribute('aria-label', '3D-Spielszene mit fiktiven Basketballspielern');
  const explanation = document.createElement('p'); explanation.textContent = '3D-Beispiel zur PnR-Variante mit fiktiven Spielern. Die 2D-Taktik zeigt die aufgezeichneten Phasen.';
  if (hasFilm) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.view = 'film'; button.textContent = '3D-Beispielfilm'; button.setAttribute('aria-pressed', 'false');
    const speeds = document.createElement('div'); speeds.className = 'chcv-film-speed'; speeds.setAttribute('role', 'group'); speeds.setAttribute('aria-label', 'Filmgeschwindigkeit');
    for (const [rate, label] of [[.5, 'Zeitlupe · 0,5×'], [1, '1×'], [1.5, '1,5×']]) {
      const speed = document.createElement('button'); speed.type = 'button'; speed.textContent = label; speed.dataset.filmSpeed = String(rate); speed.setAttribute('aria-pressed', String(rate === 1));
      speed.onclick = () => { video.playbackRate = rate; speeds.querySelectorAll('button').forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === speed))); }; speeds.append(speed);
    }
    element.querySelector('.chcv-toolbar').prepend(button); filmHost.append(video, speeds, explanation); element.insertBefore(filmHost, status);
  }
    const credits = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Modellquellen und Lizenzen';
    const attribution = document.createElement('p');
    attribution.append('Körper, Haut und Haare: MakeHuman (CC0). Sporttop und Shorts: Elvaerwyn (CC-BY). Sneaker: punkduck (CC BY 3.0). Modelle angepasst und animiert für Courthub. ');
    const sources = document.createElement('a'); sources.textContent = 'Quellen, Änderungen und Lizenzangaben';
    sources.href = new URL('../../assets/pnr/players/SOURCES.md', import.meta.url).href; sources.target = '_blank'; sources.rel = 'noopener';
    attribution.append(sources); credits.append(summary, attribution);
    element.append(credits);
  const svg = createCourt('chpd-court cha-animation-court'); flat.append(svg); host.append(element);
  let scene = null, pending = null, loadingScene = null, disposed = false, mode = '2d', snapshot = null, seconds = 0, drawOptions = {};
  let wasConnected = element.isConnected, cameraInitialized = false;
  const lifecycle = new window.MutationObserver(() => {
    if (element.isConnected) wasConnected = true;
    else if (wasConnected) destroy();
  });
  lifecycle.observe(document.body, { childList: true, subtree: true });
  function destroy() {
    if (disposed) return; disposed = true; lifecycle.disconnect();
    scene?.destroy(); scene = null; element.remove();
    if (video.getAttribute('src')) { video.pause(); video.removeAttribute('src'); video.load(); }
  }
  function show(view) {
    mode = view; element.dataset.view = view;
    flat.hidden = view !== '2d'; sceneHost.hidden = view !== '3d'; filmHost.hidden = view !== 'film';
    if (view !== 'film' && video.getAttribute('src')) video.pause();
    element.querySelector('.chcv-hint').hidden = view !== '3d';
    element.querySelectorAll('[data-camera]').forEach(button => button.hidden = view !== '3d');
    element.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    if (view === '3d') { scene?.resize(); if (snapshot) scene?.draw(snapshot, seconds); }
    else if (view === '2d' && snapshot) drawCourt(svg, snapshot, drawOptions);
    options.onModeChange?.(view);
  }
  function fallback() {
    if (disposed) return;
    scene?.destroy(); scene = null; show('2d');
    status.textContent = '3D ist auf diesem Gerät nicht verfügbar. Die Animation läuft in 2D weiter.';
  }
  async function select(view) {
    if (disposed) return;
    status.textContent = ''; show(view);
    if (view === 'film' && hasFilm) {
      if (!video.getAttribute('src')) video.src = new URL(`../../assets/pnr/films/${board.id}.mp4?v=athlete-2`, import.meta.url).href;
      return;
    }
    if (view !== '3d' || scene) return;
    status.textContent = '3D wird geladen …';
    if (!pending) pending = import('./court-3d.js');
    try {
      const module = await pending;
      if (disposed || mode !== '3d') return;
      // A second click during import must not allocate another WebGL context.
      if (!loadingScene) loadingScene = module.createCourt3D(sceneHost, fallback, { board });
      const candidate = await loadingScene;
      if (disposed) { candidate.destroy(); return; }
      scene = candidate;
      if (mode === '3d') {
        status.textContent = ''; scene.resize(); if (snapshot) scene.draw(snapshot, seconds);
        if (!cameraInitialized && options.initialCamera === 'close') scene.setCamera('close');
        cameraInitialized = true;
      }
    } catch { pending = null; loadingScene = null; if (!disposed && mode === '3d') fallback(); }
  }
  element.querySelectorAll('[data-view]').forEach(button => button.onclick = () => select(button.dataset.view));
  const closeCamera = document.createElement('button'); closeCamera.type = 'button'; closeCamera.dataset.camera = 'close'; closeCamera.textContent = 'Nahansicht'; closeCamera.hidden = true;
  element.querySelector('.chcv-toolbar').append(closeCamera);
  element.querySelectorAll('[data-camera]').forEach(button => button.onclick = () => scene?.setCamera(button.dataset.camera === 'close' ? 'close' : button.dataset.camera === 'top'));
  video.addEventListener('error', () => { if (disposed) return; show('2d'); status.textContent = 'Die 3D-Spielszene konnte nicht geladen werden. Die 2D-Taktik bleibt verfügbar.'; });
  const isPnR = /pick.?\s*(?:&|and)?\s*(?:roll|pop)|pnr/i.test(`${board.id || ''} ${board.title || ''} ${board.category || ''}`);
  if (options.initialView === '3d') { show('2d'); queueMicrotask(() => select('3d')); }
  else if (hasFilm && options.auto3D !== false) { show('2d'); queueMicrotask(() => select('film')); }
  else if (isPnR && options.auto3D !== false) select('3d'); else show('2d');
  return {
    element,
    draw(value, time = 0, settings = {}) {
      if (disposed) return;
      snapshot = value; seconds = time; drawOptions = settings;
      if (mode === '3d' && scene) scene.draw(value, time); else drawCourt(svg, value, settings);
    },
    destroy
  };
}
