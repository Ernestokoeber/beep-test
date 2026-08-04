const MIME_BY_EXTENSION = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm'
};

export function inferredVideoType(file) {
  if (!file) return '';
  if (String(file.type || '').startsWith('video/')) return file.type;
  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || '';
}

function replaceFile(input, source, type) {
  if (!input || !source || !type || typeof File !== 'function' || typeof DataTransfer !== 'function') return false;
  try {
    const replacement = new File([source], source.name, {
      type,
      lastModified: source.lastModified || Date.now()
    });
    const transfer = new DataTransfer();
    transfer.items.add(replacement);
    input.files = transfer.files;
    return true;
  } catch (_) {
    return false;
  }
}

export function installVideoImportCompatibility(view) {
  const input = view?.querySelector?.('[data-role="video-file"]');
  const video = view?.querySelector?.('[data-role="video"]');
  if (!input || input.dataset.compatibilityBound === 'true') return;
  input.dataset.compatibilityBound = 'true';

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file || String(file.type || '').startsWith('video/')) return;
    const type = inferredVideoType(file);
    if (type) replaceFile(input, file, type);
  }, { capture: true });

  video?.addEventListener('error', () => {
    const error = video.error;
    const message = error?.code === 4
      ? 'Dieses Videoformat kann auf dem Gerät nicht abgespielt werden. Bitte den Clip als MP4 (H.264) sichern.'
      : 'Das Video konnte nicht geladen werden. Bitte den Clip kürzen oder erneut speichern.';
    window.BT.util?.toast?.(message);
  });
}
