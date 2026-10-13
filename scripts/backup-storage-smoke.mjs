import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { IDBFactory, IDBDatabase } from 'fake-indexeddb';

const factory = new IDBFactory();
const KEY = 'beepTest_v1';
const source = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
function app(idb = factory) {
  const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
  const w = dom.window;
  if (idb) w.indexedDB = idb;
  let picked = null;
  const alerts = [], uploads = [];
  w.alert = message => alerts.push(message);
  w.prompt = () => 'm';
  w.console.error = () => {};
  w.BT = { util: {
    uuid: prefix => prefix + Math.random(), seasonForDate: () => '2026-2027',
    toast() {}, pickFile: async () => picked, readFileAsText: async () => picked,
  }, sync: { queueSave: data => uploads.push(JSON.stringify(data)) } };
  w.eval(source('js/development-core.js'));
  w.eval(source('js/storage.js'));
  w.eval(source('js/history.js'));
  return { dom, w, storage: w.BT.storage, history: w.BT.history, alerts, uploads,
    pick(data) { picked = JSON.stringify(data); } };
}
const a = app();
await a.storage.ready();
const original = a.storage.load();
original.players.push({ id: 'p1', name: 'Spieler' });
original.games.push({ id: 'g1', score: '80:70' });
a.storage.save(original);
const oldRaw = a.w.localStorage.getItem(KEY);
const backup = { ...original, notes: [{ id: 'large', text: 'x'.repeat(7 * 1024 * 1024) }] };
const importing = a.history.applyBackup(backup, 'r');
assert.equal(a.w.localStorage.getItem(KEY), oldRaw, 'Old workspace stays intact until commit');
await importing;
await a.storage.flush();
assert.equal(a.w.localStorage.getItem(KEY), null, 'Remove only the migrated workspace, after commit');
assert.equal(a.storage.load().notes[0].text.length, 7 * 1024 * 1024);
assert.equal(a.uploads.length, 2, 'Sync queues once after the successful durable import');

const b = app();
await b.storage.ready();
assert.equal(b.storage.load().games[0].score, '80:70', 'Restore IndexedDB on a fresh app start');
assert.equal(b.storage.load().notes[0].text.length, 7 * 1024 * 1024);
await b.history.applyBackup({ ...original, players: [{ id: 'p2', name: 'Neu' }] }, 'm');
assert.deepEqual(Array.from(b.storage.getPlayers(), p => p.id), ['p1', 'p2']);
assert.equal(b.storage.load().notes[0].id, 'large', 'Merging must retain large existing data');

const next = b.storage.load(); next.notes.push({ id: 'n2', text: 'Neu' });
const newest = b.storage.load(); newest.notes.push({ id: 'n3', text: 'Noch neuer' });
const writes = [b.storage.save(next), b.storage.save(newest)];
await Promise.all(writes);
const c = app(); await c.storage.ready();
assert.equal(c.storage.load().notes.at(-1).id, 'n3', 'Queued snapshots cannot persist in reverse order');
assert.equal(c.storage.load().notes.some(n => n.id === 'n2'), false);

await c.storage.cacheWorkspace('team-one', c.storage.load());
await c.storage.save(original, { fromSync: true });
const cached = await c.storage.getCachedWorkspace('team-one');
assert.equal(cached.notes[0].text.length, 7 * 1024 * 1024, 'Large team caches also avoid localStorage');
assert.equal((await c.storage.getCachedWorkspace('new-team')).games.length, 0);

// Simulate IndexedDB refusing a transaction: never report import success or
// remove the previous localStorage workspace, and never queue a failed upload.
const failing = app(new IDBFactory()); await failing.storage.ready();
failing.storage.save(original);
const beforeFailure = failing.w.localStorage.getItem(KEY);
const transaction = IDBDatabase.prototype.transaction;
IDBDatabase.prototype.transaction = function(...args) {
  const tx = transaction.apply(this, args);
  if (args[1] === 'readwrite') queueMicrotask(() => tx.abort());
  return tx;
};
try {
  failing.pick(backup);
  await failing.history.importBackup();
  assert.ok(failing.alerts.some(message => /Fehler beim Import/.test(message)));
  assert.ok(!failing.alerts.some(message => /Import erfolgreich/.test(message)));
  assert.equal(failing.w.localStorage.getItem(KEY), beforeFailure);
  assert.equal(failing.storage.load().notes.length, 0, 'Failed import rolls back the in-memory snapshot');
  assert.equal(failing.uploads.length, 1, 'Failed data must never sync');
} finally { IDBDatabase.prototype.transaction = transaction; }
await failing.history.applyBackup(backup, 'r');
assert.equal(failing.storage.load().notes[0].id, 'large', 'Retry succeeds after an aborted transaction');

const denied = app(null);
denied.storage.save(original);
assert.throws(() => denied.history.applyBackup(backup, 'r'), /quota/i);
assert.equal(denied.storage.load().players[0].id, 'p1');
assert.equal(denied.storage.load().notes.length, 0);

// Migration must remain readable even if localStorage is already full.
const legacy = app(null);
legacy.w.localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 4, players: [{ id: 'old' }], sessions: [] }));
const setItem = legacy.w.Storage.prototype.setItem;
legacy.w.Storage.prototype.setItem = () => { throw new legacy.w.DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
assert.equal(legacy.storage.load().players[0].id, 'old');
legacy.w.Storage.prototype.setItem = setItem;

for (const instance of [a, b, c, failing, denied, legacy]) instance.dom.window.close();
console.log('Backup storage passed: 7 MiB imports, restart, merge, write ordering, team caches, rollback, retry and migration');
