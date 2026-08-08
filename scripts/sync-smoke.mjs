import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dom = new JSDOM('', { url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only' });
const { window } = dom;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function workspace(x, updatedAt) {
  return {
    schemaVersion: 3,
    meta: { updatedAt },
    players: [{ id: 'p1', name: 'Spieler 1' }],
    sessions: [], trainings: [], games: [], tableDuties: [], notes: [],
    freethrows: [], drills: [], templates: [], phases: [], tactics: [],
    settings: { tacticsBoardDraft: { steps: [{ offense: [{ id: 'o1', x, y: 100 }] }] } }
  };
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

let local = workspace(10, '2026-08-08T10:00:00.000Z');
let remote = structuredClone(local);
let activeRequests = 0;
let maximumActiveRequests = 0;
const requests = [];
const controls = [];
const toasts = [];
let remoteApplications = 0;

window.BT = {
  api: {
    setToken() {},
    getToken() { return null; },
    async login() {
      return { token: 'test-token', user: { id: 'u1', role: 'coach' } };
    },
    async getWorkspace() {
      return { data: structuredClone(remote), version: 1, updatedAt: remote.meta.updatedAt };
    },
    saveWorkspace(data, expectedVersion) {
      const control = deferred();
      controls.push(control);
      requests.push({ data: structuredClone(data), expectedVersion });
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      return control.promise.finally(() => { activeRequests -= 1; });
    }
  },
  storage: {
    load() { return structuredClone(local); },
    save(data, options) {
      if (options?.fromSync) remoteApplications += 1;
      local = structuredClone(data);
    }
  },
  util: {
    toast(message) { toasts.push(message); }
  }
};
window.eval(readFileSync(resolve(root, 'js/sync.js'), 'utf8'));

await window.BT.sync.login('coach@example.test', 'secret');

local = workspace(20, '2026-08-08T10:00:01.000Z');
const firstSync = window.BT.sync.syncNow();
await new Promise(resolveWait => window.setTimeout(resolveWait, 0));

local = workspace(30, '2026-08-08T10:00:03.000Z');
const secondSync = window.BT.sync.syncNow();
await new Promise(resolveWait => window.setTimeout(resolveWait, 0));

assert(requests.length === 1, 'Board-Synchronisierungen laufen parallel');
assert(maximumActiveRequests === 1, 'Mehr als eine Workspace-Anfrage ist gleichzeitig aktiv');

const conflict = new Error('Konflikt');
conflict.status = 409;
conflict.data = {
  conflict: {
    data: workspace(25, '2026-08-08T10:00:02.000Z'),
    version: 2,
    updatedAt: '2026-08-08T10:00:02.000Z'
  }
};
controls[0].reject(conflict);
await new Promise(resolveWait => window.setTimeout(resolveWait, 0));

assert(requests.length === 2, 'Der neuere lokale Board-Stand wurde nach dem Konflikt nicht übertragen');
assert(requests[1].expectedVersion === 2, 'Die Konfliktversion wurde nicht übernommen');
assert(requests[1].data.settings.tacticsBoardDraft.steps[0].offense[0].x === 30, 'Ein veralteter Board-Snapshot wurde erneut übertragen');
assert(maximumActiveRequests === 1, 'Konfliktbehandlung startet eine parallele Workspace-Anfrage');

controls[1].resolve({ version: 3, updatedAt: '2026-08-08T10:00:03.000Z' });
await Promise.all([firstSync, secondSync]);

assert(local.settings.tacticsBoardDraft.steps[0].offense[0].x === 30, 'Der Spieler wurde auf eine ältere Position zurückgesetzt');
assert(remoteApplications === 0, 'Ein älterer Serverstand hat lokale Board-Daten überschrieben');
assert(toasts.length === 0, 'Ein interner Sync-Konflikt wird fälschlich als fremde Änderung gemeldet');

console.log('Sync-Smoke-Test erfolgreich.');
