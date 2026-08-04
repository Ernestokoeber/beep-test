import './court-enhancements.js';
import './timing-fix.js';
import '../video-import/alignment.js';
import { injectStyles } from './styles.js';
import { injectPlayDesignerLayoutFix } from './layout-fix.js';
import { installEditorStability } from './editor-stability.js';
import { installCompleteDelete } from './complete-delete.js';
import { mountQuickEditor } from './quick-editor.js';
import { mountEditor as editor } from './editor.js';
import { mountPlayer as player } from './viewer.js';

const MODE_KEY = 'tacticsEditorMode';

async function openVideoImport() {
  const app = document.getElementById('app');
  const module = await import('../video-import/main.js');
  window.BT.videoImport = module;
  app.replaceChildren();
  module.mount(app);
  history.pushState({ courtHubVideoImport: true }, '', '#/tactics/import');
}

function switchMode(target, mode) {
  window.BT.storage.setSetting(MODE_KEY, mode === 'pro' ? 'pro' : 'quick');
  target.replaceChildren();
  mountEditor(target);
}

function mountProEditor(target) {
  injectStyles();
  injectPlayDesignerLayoutFix();
  const root = installCompleteDelete(installEditorStability(editor(target)));
  const actions = root?.querySelector('.chpd-actions');
  if (!actions) return root;

  if (!actions.querySelector('[data-action="quick-mode"]')) {
    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = 'chpd-btn';
    quick.dataset.action = 'quick-mode';
    quick.textContent = 'Schnellmodus';
    quick.title = 'Einfacher Play-Aufbau mit automatischem Timing';
    quick.onclick = () => switchMode(target, 'quick');
    actions.prepend(quick);
  }

  if (!actions.querySelector('[data-action="video-import"]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chpd-btn primary';
    button.dataset.action = 'video-import';
    button.textContent = 'Video → Play';
    button.title = 'Play aus einem Videoclip erstellen';
    button.onclick = () => openVideoImport().catch(error => {
      window.BT.util?.toast?.('Video-Import konnte nicht geöffnet werden: ' + error.message);
    });
    actions.prepend(button);
  }
  return root;
}

export function mountEditor(target) {
  const mode = window.BT.storage.getSetting(MODE_KEY, 'quick');
  if (mode === 'pro') return mountProEditor(target);

  return mountQuickEditor(target, {
    onModeChange: nextMode => switchMode(target, nextMode),
    onVideoImport: () => openVideoImport().catch(error => {
      window.BT.util?.toast?.('Video-Import konnte nicht geöffnet werden: ' + error.message);
    })
  });
}

export function mountPlayer(target) {
  injectStyles();
  injectPlayDesignerLayoutFix();
  return player(target);
}
