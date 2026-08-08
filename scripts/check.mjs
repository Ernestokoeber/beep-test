import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = [
  'js/util.js', 'js/storage.js', 'js/api.js', 'js/sync.js', 'js/aiimport.js',
  'js/schedule.js', 'js/seasonplanner.js', 'js/training.js', 'js/tactics.js',
  'js/play-designer/main.js', 'js/play-designer/styles.js', 'js/play-designer/rendering.js',
  'js/play-designer/court-enhancements.js', 'js/play-designer/layout-fix.js',
  'js/play-designer/timing-core.js', 'js/play-designer/timing-fix.js',
  'js/play-designer/editor-stability.js', 'js/play-designer/complete-delete.js',
  'js/play-designer/quick-core.js', 'js/play-designer/quick-styles.js',
  'js/play-designer/quick-pointer-fix.js', 'js/play-designer/quick-editor.js',
  'js/play-designer/editor-shell.js', 'js/play-designer/editor-toolbar.js',
  'js/play-designer/phase-rail.js', 'js/play-designer/court-stage.js',
  'js/play-designer/action-timeline.js', 'js/play-designer/phase-instructions.js',
  'js/play-designer/play-preview.js', 'js/play-designer/animation-player.js',
  'js/play-designer/export-dialog.js', 'js/play-designer/play-library.js',
  'js/play-designer/quick-workflow.js', 'js/play-designer/quick-details.js',
  'js/play-designer/quick-reorder.js', 'js/play-designer/tactic-trash.js',
  'js/play-designer/gif-encoder.js', 'js/play-designer/pdf-writer.js',
  'js/play-designer/history.js', 'js/play-designer/editor.js',
  'js/play-designer/viewer.js', 'js/play-designer/exports.js',
  'js/video-import/core.js', 'js/video-import/styles.js', 'js/video-import/alignment.js',
  'js/video-import/compatibility.js', 'js/video-import/tracker-v2.js',
  'js/video-import/tracker-install.js', 'js/video-import/screen-recognition.js',
  'js/video-import/main.js', 'js/tablecrew.js', 'js/account.js', 'js/app.js',
  'js/checkin.js', 'js/games.js',
  'api/_lib/db.js', 'api/_lib/http.js', 'api/_lib/auth.js', 'api/_lib/workspace-data.js',
  'api/auth/register.js', 'api/auth/login.js', 'api/auth/me.js',
  'api/workspace.js', 'api/members.js', 'api/ai/gemini.js',
  'api/_lib/checkin.js', 'api/checkin/manage.js', 'api/checkin/public.js', 'api/checkin/qr.js',
  'api/games/sync.js', 'api/games/atlas.js', 'api/games/atlas-webhook.js'
];

for (const file of scripts) execFileSync(process.execPath, ['--check', resolve(root, file)], { stdio: 'inherit' });
for (const file of ['package.json', 'manifest.webmanifest', 'vercel.json']) JSON.parse(readFileSync(resolve(root, file), 'utf8'));

const serviceWorker = readFileSync(resolve(root, 'sw.js'), 'utf8');
const assets = [...serviceWorker.matchAll(/'\.\/(.+?)'/g)].map((match) => match[1]);
for (const asset of assets) {
  const localAsset = asset.split('?')[0];
  if (!existsSync(resolve(root, localAsset))) throw new Error('Service-Worker-Asset fehlt: ' + asset);
}

const frontend = ['index.html', ...scripts.filter((file) => file.startsWith('js/'))]
  .map((file) => readFileSync(resolve(root, file), 'utf8'))
  .join('\n');
if (frontend.includes('generativelanguage.googleapis.com')) {
  throw new Error('Gemini darf nicht direkt aus dem Browser aufgerufen werden.');
}

const exportsSource = readFileSync(resolve(root, 'js/play-designer/exports.js'), 'utf8');
if (exportsSource.includes('gif.worker.js') || exportsSource.includes('gif.js@')) {
  throw new Error('GIF-Export darf keinen externen Worker mehr verwenden.');
}
if (exportsSource.includes('jspdf@') || exportsSource.includes('cdn.jsdelivr.net/npm/jspdf')) {
  throw new Error('Play-PDFs müssen vollständig lokal erzeugt werden.');
}

console.log('CourtHub: statische Prüfungen erfolgreich.');
