import './court-enhancements.js';
import { injectStyles } from './styles.js';
import { mountEditor as editor } from './editor.js';
import { mountPlayer as player } from './viewer.js';

export function mountEditor(target) {
  injectStyles();
  const root = editor(target);
  const actions = root?.querySelector('.chpd-actions');
  if (actions && !actions.querySelector('[data-action="video-import"]')) {
    const link = document.createElement('a');
    link.className = 'chpd-btn ghost';
    link.href = '#/tactics/import';
    link.dataset.action = 'video-import';
    link.textContent = 'Video → Play';
    link.title = 'Play aus einem Videoclip erstellen';
    actions.prepend(link);
  }
  return root;
}

export function mountPlayer(target) {
  injectStyles();
  return player(target);
}
