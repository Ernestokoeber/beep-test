import './court-enhancements.js';
import './quick-pointer-fix.js';
import './timing-fix.js';
import '../video-import/alignment.js';
import { injectStyles } from './styles.js';
import { injectPlayDesignerLayoutFix } from './layout-fix.js';
import { installEditorStability } from './editor-stability.js';
import { installCompleteDelete } from './complete-delete.js';
import { mountQuickEditor } from './quick-editor.js';
import { enhanceQuickEditor } from './quick-workflow.js';
import { enhanceQuickDetails } from './quick-details.js';
import { enhanceQuickReorder } from './quick-reorder.js';
import { enhanceTacticTrash } from './tactic-trash.js';
import { installVideoImportCompatibility } from '../video-import/compatibility.js';
import { enhanceVideoTracking } from '../video-import/tracker-v2.js';
import { mountEditor as editor } from './editor.js';
import { mountPlayer as player } from './viewer.js';

const MODE_KEY = 'tacticsEditorMode';

export function cleanupVideoImport() {
  window.BT.videoImport?.cleanup?.();
}

export async function mountVideoImport(target) {
  cleanupVideoImport();
  const module = await import('../video-import/main.js');
  window.BT.videoImport = module;
  target.replaceChildren();
  const view = module.mount(target);
  installVideoImportCompatibility(view);
  enhanceVideoTracking(view);
  return view;
}

async function openVideoImport() {
  if (location.hash === '#/tactics/import') {
    await mountVideoImport(document.getElementById('app'));
    return;
  }
  location.hash = '#/tactics/import';
}

function switchMode(target, mode) {
  window.BT.storage.setSetting(MODE_KEY, mode === 'pro' ? 'pro' : 'quick');
  target.replaceChildren();
  mountEditor(target);
}

function reloadEditor(target, root) {
  if (root && !root.isConnected) return;
  target.replaceChildren();
  mountEditor(target);
}

function mountProEditor(target) {
  injectStyles();
  injectPlayDesignerLayoutFix();
  let root = installCompleteDelete(installEditorStability(editor(target)));
  root = enhanceTacticTrash(root, { reload: () => reloadEditor(target, root) });
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
  cleanupVideoImport();
  const mode = window.BT.storage.getSetting(MODE_KEY, 'quick');
  if (mode === 'pro') return mountProEditor(target);

  let root = mountQuickEditor(target, {
    onModeChange: nextMode => switchMode(target, nextMode),
    onVideoImport: () => openVideoImport().catch(error => {
      window.BT.util?.toast?.('Video-Import konnte nicht geöffnet werden: ' + error.message);
    })
  });
  const reload = () => reloadEditor(target, root);

  root = enhanceQuickEditor(root, target, { reload });
  root = enhanceQuickDetails(root, { reload });
  root = enhanceQuickReorder(root, { reload });
  root = enhanceTacticTrash(root, { reload });
  return root;
}

export function mountPlayer(target) {
  cleanupVideoImport();
  injectStyles();
  injectPlayDesignerLayoutFix();
  return player(target);
}
