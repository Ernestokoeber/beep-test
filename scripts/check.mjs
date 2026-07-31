import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = [
  'js/util.js', 'js/storage.js', 'js/api.js', 'js/sync.js', 'js/aiimport.js',
  'js/schedule.js', 'js/training.js', 'js/tactics.js', 'js/account.js', 'js/app.js',
  'js/checkin.js', 'js/games.js',
  'api/_lib/db.js', 'api/_lib/http.js', 'api/_lib/auth.js',
  'api/auth/register.js', 'api/auth/login.js', 'api/auth/me.js',
  'api/workspace.js', 'api/members.js', 'api/ai/gemini.js'
  , 'api/_lib/checkin.js', 'api/checkin/manage.js', 'api/checkin/public.js', 'api/checkin/qr.js',
  'api/games/sync.js', 'api/games/atlas.js'
  , 'api/games/atlas-webhook.js'
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

console.log('CourtHub: statische Prüfungen erfolgreich.');
