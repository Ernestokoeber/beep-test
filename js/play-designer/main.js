import './court-enhancements.js';
import './quick-pointer-fix.js';
import './timing-fix.js';
import '../video-import/alignment.js';
import { injectStyles } from './styles.js';
import { injectPlayDesignerLayoutFix } from './layout-fix.js';
import { mountQuickEditor } from './quick-editor.js';
import { enhanceQuickEditor } from './quick-workflow.js';
import { enhanceQuickReorder } from './quick-reorder.js';
import { enhanceTacticTrash } from './tactic-trash.js';
import { installVideoImportCompatibility } from '../video-import/compatibility.js';
import { installVideoTracking } from '../video-import/tracker-install.js';
import { installVideoScreenRecognition } from '../video-import/screen-recognition.js';
import { mountPlayer as player } from './viewer.js';

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
  installVideoTracking(view);
  installVideoScreenRecognition(view);
  return view;
}

async function openVideoImport() {
  if (location.hash === '#/tactics/import') {
    await mountVideoImport(document.getElementById('app'));
    return;
  }
  location.hash = '#/tactics/import';
}

function reloadEditor(target, root) {
  if (root && !root.isConnected) return;
  target.replaceChildren();
  mountEditor(target);
}

export function mountEditor(target) {
  cleanupVideoImport();
  let root = mountQuickEditor(target, {
    onVideoImport: () => openVideoImport().catch(error => {
      window.BT.util?.toast?.('Video-Import konnte nicht geöffnet werden: ' + error.message);
    })
  });
  const reload = () => reloadEditor(target, root);

  root = enhanceQuickEditor(root, target, { reload });
  root = enhanceQuickReorder(root, { reload });
  root = enhanceTacticTrash(root, { reload });
  root.addEventListener('courthub:quick-reload', reload);
  return root;
}

export function mountPlayer(target) {
  cleanupVideoImport();
  injectStyles();
  injectPlayDesignerLayoutFix();
  return player(target);
}
