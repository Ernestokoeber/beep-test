import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const origin = 'https://coach.tsv-lindau.de';
const handlers = new Map(), buckets = new Map();
const absolute = value => new URL(typeof value === 'string' ? value : value.url, origin + '/').href;
let currentCache, networkRequests = 0, navigations = 0, claimed = false, offline = false;
function bucket(name) {
  if (!buckets.has(name)) buckets.set(name, new Map());
  const entries = buckets.get(name);
  return {
    async addAll(assets) { for (const asset of assets) entries.set(absolute(asset), new Response(asset)); },
    async match(request) { return entries.get(absolute(request))?.clone(); },
    async put(request, response) { entries.set(absolute(request), response); }
  };
}
const caches = {
  async open(name) { currentCache = name; return bucket(name); },
  async keys() { return [...buckets.keys()]; },
  async delete(name) { return buckets.delete(name); },
  async match(request) {
    for (const entries of buckets.values()) if (entries.has(absolute(request))) return entries.get(absolute(request)).clone();
  }
};
bucket('courthub-v1'); bucket('another-app');
runInNewContext(readFileSync('sw.js', 'utf8'), {
  self: {
    addEventListener(type, handler) { handlers.set(type, handler); },
    async skipWaiting() {},
    clients: { async claim() { claimed = true; }, async matchAll() { return [{ url: origin, async navigate() { navigations++; } }]; } }
  },
  caches, URL, location: { origin },
  async fetch(request) { networkRequests++; if (offline) throw new Error('offline'); return new Response('network:' + absolute(request)); }
});
async function lifecycle(type) {
  let work;
  handlers.get(type)({ waitUntil(promise) { work = promise; } });
  await work;
}
async function request(path, options = {}) {
  let response;
  const work = [];
  const req = { url: absolute(path), method: 'GET', headers: new Headers(), mode: 'cors', ...options };
  handlers.get('fetch')({ request: req, respondWith(promise) { response = promise; }, waitUntil(promise) { work.push(promise); } });
  const result = await response;
  await Promise.all(work);
  return result;
}
await lifecycle('install');
const installedCache = currentCache;
const assets = [...buckets.get(installedCache).keys()];
assert.ok(assets.includes(absolute('/assets/TSVLogotransparent.png')), 'The visible app logo must be available in the installed offline cache');
for (const asset of assets) assert.ok(await request(asset));
assert.equal(networkRequests, 0, 'Opening a cached app must not download its assets again');
await lifecycle('activate');
assert.ok(claimed);
assert.equal(navigations, 0, 'Only the app should reload on updates; activation must not also navigate clients');
assert.equal(buckets.has('courthub-v1'), false);
assert.ok(buckets.has('another-app'), 'Unrelated caches must survive CourtHub activation');

// A file loaded on demand becomes usable offline, while server data bypasses the cache.
await request('/assets/pnr/players/athlete.glb');
assert.equal(networkRequests, 1);
offline = true;
assert.equal(await (await request('/assets/pnr/players/athlete.glb')).text(), 'network:' + origin + '/assets/pnr/players/athlete.glb');
assert.equal(networkRequests, 1);
assert.equal(await (await request('/uncached-route', { mode: 'navigate' })).text(), './index.html');
await assert.rejects(request('/missing-module.mjs'), /offline/, 'Missing offline scripts must not receive HTML');
assert.equal(await request('/api/workspace'), undefined);
assert.equal(await request('/assets/pnr/films/demo.mp4'), undefined);
assert.equal(await request('/anything', { headers: new Headers({ Range: 'bytes=0-20' }) }), undefined);
assert.equal(await request('https://other.example/app.js'), undefined);

// Cached files from another release must never be used for the active release.
bucket('courthub-v1').put('/old-only.js', new Response('old'));
await assert.rejects(request('/old-only.js'), /offline/);

function appSession(initialController) {
  const events = new Map(), workerEvents = new Map();
  let reloads = 0, registrations = 0, forcedUpdates = 0;
  const serviceWorker = {
    controller: initialController,
    addEventListener(type, listener) { workerEvents.set(type, listener); },
    async register() { registrations++; return { async update() { forcedUpdates++; } }; }
  };
  const BT = {};
  runInNewContext(readFileSync('js/app.js', 'utf8'), {
    document: { readyState: 'loading', getElementById() { return {}; } },
    window: { BT, addEventListener(type, listener) { events.set(type, listener); } }, BT,
    navigator: { serviceWorker }, location: { protocol: 'https:', reload() { reloads++; } }, console
  });
  return {
    async load() { events.get('load')(); await new Promise(resolve => setImmediate(resolve)); return { registrations, forcedUpdates }; },
    change(controller) { serviceWorker.controller = controller; workerEvents.get('controllerchange')(); return reloads; }
  };
}
const firstVisit = appSession(null);
assert.deepEqual(await firstVisit.load(), { registrations: 1, forcedUpdates: 0 });
assert.equal(firstVisit.change({}), 0, 'First installation must not interrupt the initial visit');
assert.equal(firstVisit.change({}), 1, 'A subsequent update must reload the page');
assert.equal(firstVisit.change({}), 1, 'Repeated controller changes must not cause duplicate reloads');
const installedVisit = appSession({});
assert.equal(installedVisit.change({}), 1, 'Existing installed clients must load a new release');
assert.equal(installedVisit.change({}), 1);
console.log(`PWA loading passed: ${assets.length} cached assets, zero repeated asset downloads, single update reload and offline recovery`);
