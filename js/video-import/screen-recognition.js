import { addScreenCandidates } from './tracker-v2.js';

const DRAFT_KEY = 'tacticsBoardDraft';

export function installVideoScreenRecognition(view) {
  if (!view || view.dataset.screenRecognitionInstalled === 'true') return view;
  view.dataset.screenRecognitionInstalled = 'true';

  view.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-action="create-play"]');
    if (!trigger || !view.contains(trigger)) return;

    queueMicrotask(() => {
      const storage = window.BT?.storage;
      const core = window.BT?.tactics?.__core;
      const draft = storage?.getSetting?.(DRAFT_KEY, null);
      if (!draft || !core) return;
      const result = addScreenCandidates(draft, core);
      if (!result.added) return;
      storage.setSetting(DRAFT_KEY, result.board);
      window.BT.util?.toast?.(`${result.added} mögliche Screens wurden automatisch ergänzt.`);
    });
  }, true);

  return view;
}
