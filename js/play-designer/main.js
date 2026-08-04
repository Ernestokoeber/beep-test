import './court-enhancements.js';
import '../video-import/alignment.js';
import { injectStyles } from './styles.js';
import { injectPlayDesignerLayoutFix } from './layout-fix.js';
import { mountEditor as editor } from './editor.js';
import { mountPlayer as player } from './viewer.js';

async function openVideoImport() {
  const app = document.getElementById('app');
  const module = await import('../video-import/main.js');
  window.BT.videoImport = module;
  app.replaceChildren();
  module.mount(app);
  history.pushState({ courtHubVideoImport: true }, '', '#/tactics/import');
}

export function mountEditor(target) {
  injectStyles();
  injectPlayDesignerLayoutFix();
  const root = editor(target);
  const actions = root?.querySelector('.chpd-actions');
  if (actions && !actions.querySelector('[data-action="video-import"]')) {
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

export function mountPlayer(target) {
  injectStyles();
  injectPlayDesignerLayoutFix();
  return player(target);
}
