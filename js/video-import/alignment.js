const mountedViews = new WeakMap();

export function fitVideoFrame(containerWidth, maxHeight, videoWidth, videoHeight) {
  const availableWidth = Math.max(1, Number(containerWidth) || 1);
  const availableHeight = Math.max(1, Number(maxHeight) || 1);
  const sourceWidth = Math.max(1, Number(videoWidth) || 1);
  const sourceHeight = Math.max(1, Number(videoHeight) || 1);
  const aspect = sourceWidth / sourceHeight;

  let width = availableWidth;
  let height = width / aspect;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * aspect;
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
    aspect
  };
}

function injectStyles() {
  if (document.getElementById('courthub-video-assignment-fix')) return;
  const style = document.createElement('style');
  style.id = 'courthub-video-assignment-fix';
  style.textContent = `
    .vi-video-shell[data-video-aligned="true"]{min-height:0;margin-inline:auto;display:block}
    .vi-video-shell[data-video-aligned="true"] video{position:absolute;inset:0;width:100%;height:100%;max-height:none;object-fit:contain}
    .vi-video-shell[data-video-aligned="true"] .vi-overlay{inset:0;width:100%;height:100%}
    .vi-assignment-current{display:flex;align-items:center;gap:.45rem;margin:.1rem 0 .55rem;padding:.48rem .58rem;border-radius:.62rem;background:rgba(22,128,196,.08);border:1px solid rgba(22,128,196,.18);font-size:.72rem;color:var(--muted,#64756d)}
    .vi-assignment-current strong{color:inherit}
    .vi-assignment-current i{display:inline-block;width:.68rem;height:.68rem;border-radius:50%;background:#1680c4;box-shadow:0 0 0 .18rem rgba(22,128,196,.13)}
    .vi-assignment-current.defense i{background:#242b35;box-shadow:0 0 0 .18rem rgba(36,43,53,.13)}
    .vi-assignment-current.ball i{background:#f97316;box-shadow:0 0 0 .18rem rgba(249,115,22,.13)}
  `;
  document.head.appendChild(style);
}

function markerDescription(button) {
  if (!button) return { text: 'Kein Marker gewählt', type: 'offense' };
  const text = button.title || button.textContent?.trim() || 'Marker';
  const type = button.classList.contains('defense')
    ? 'defense'
    : button.classList.contains('ball') ? 'ball' : 'offense';
  return { text, type };
}

function install(view) {
  if (!view || mountedViews.has(view)) return;
  const shell = view.querySelector('[data-role="video-shell"]');
  const video = view.querySelector('[data-role="video"]');
  const palette = view.querySelector('[data-role="marker-palette"]');
  if (!shell || !video || !palette) return;

  const current = document.createElement('div');
  current.className = 'vi-assignment-current';
  current.innerHTML = '<i aria-hidden="true"></i><span>Aktive Zuordnung: <strong></strong></span>';
  palette.before(current);

  const updateAssignment = () => {
    const active = palette.querySelector('.vi-token.active');
    const description = markerDescription(active);
    current.className = `vi-assignment-current ${description.type}`;
    current.querySelector('strong').textContent = description.text;
    [...palette.querySelectorAll('.vi-token')].forEach((button, index) => {
      button.dataset.markerIndex = String(index + 1);
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
    });
  };

  const align = () => {
    if (!video.videoWidth || !video.videoHeight || video.hidden) {
      shell.removeAttribute('data-video-aligned');
      shell.style.removeProperty('width');
      shell.style.removeProperty('height');
      return;
    }
    const parentWidth = Math.max(1, shell.parentElement?.clientWidth || shell.clientWidth || 1);
    const viewportHeight = window.visualViewport?.height || window.innerHeight || 800;
    const frame = fitVideoFrame(parentWidth, viewportHeight * .72, video.videoWidth, video.videoHeight);
    shell.dataset.videoAligned = 'true';
    shell.style.width = `${Math.round(frame.width * 100) / 100}px`;
    shell.style.height = `${Math.round(frame.height * 100) / 100}px`;
  };

  const resizeObserver = new ResizeObserver(() => requestAnimationFrame(align));
  resizeObserver.observe(shell.parentElement || shell);
  resizeObserver.observe(video);
  const paletteObserver = new MutationObserver(updateAssignment);
  paletteObserver.observe(palette, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  video.addEventListener('loadedmetadata', align);
  video.addEventListener('loadeddata', align);
  window.addEventListener('resize', align, { passive: true });
  window.visualViewport?.addEventListener('resize', align, { passive: true });

  updateAssignment();
  align();

  const cleanup = () => {
    resizeObserver.disconnect();
    paletteObserver.disconnect();
    video.removeEventListener('loadedmetadata', align);
    video.removeEventListener('loadeddata', align);
    window.removeEventListener('resize', align);
    window.visualViewport?.removeEventListener('resize', align);
    current.remove();
  };
  mountedViews.set(view, cleanup);
}

function scan() {
  document.querySelectorAll('[data-role="video-import"]').forEach(install);
}

injectStyles();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
else scan();

const documentObserver = new MutationObserver(scan);
documentObserver.observe(document.documentElement, { childList: true, subtree: true });
