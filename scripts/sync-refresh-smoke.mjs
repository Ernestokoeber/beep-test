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

function workspace(version, title) {
  return {
    schemaVersion: 5,
    meta: { updatedAt: `2026-10-15T12:${String(version % 60).padStart(2, '0')}:00.000Z` },
    players: [], sessions: [], games: [], opponents: [], tableDuties: [], jerseyDuties: [],
    notes: [], freethrows: [], drills: [], templates: [], phases: [], tactics: [],
    developmentFindings: [], developmentImportReceipts: [], settings: {},
    trainings: [{ id: 'tr_sync', date: '2026-10-20', title }]
  };
}

const waitForAsyncEvents = () => new Promise(resolveWait => window.setTimeout(resolveWait, 0));

let token = null;
let local = workspace(15, 'Stand vom Handy');
let remote = workspace(15, 'Stand vom Handy');
let remoteVersion = 2015;
let getRequests = 0;
let putRequests = 0;
let pollCallback = null;
let getWorkspaceImpl = async () => ({
  data: structuredClone(remote),
  version: remoteVersion,
  updatedAt: remote.meta.updatedAt,
  role: 'coach'
});

Object.defineProperty(window.document, 'visibilityState', { configurable: true, value: 'visible' });
window.setInterval = (callback) => {
  pollCallback = callback;
  return 1;
};

window.BT = {
  api: {
    getToken() { return token; },
    setToken(value) { token = value; },
    async login() {
      return {
        token: 'test-token',
        user: {
          id: 'coach-1', displayName: 'Coach', email: 'coach@example.test', role: 'coach',
          organization: { id: 'team-1', name: 'TSV Lindau' }
        }
      };
    },
    async getWorkspace() {
      getRequests++;
      return getWorkspaceImpl();
    },
    async saveWorkspace(data) {
      putRequests++;
      return {
        ok: true,
        data: structuredClone(data),
        version: remoteVersion,
        updatedAt: remote.meta.updatedAt
      };
    }
  },
  storage: {
    ready: async () => {},
    flush: async () => {},
    load() { return structuredClone(local); },
    async save(data) { local = structuredClone(data); },
    async cacheWorkspace() {},
    async getCachedWorkspace() { return { games: [] }; }
  },
  util: { toast() {} }
};

window.eval(readFileSync(resolve(root, 'js/sync.js'), 'utf8'));
await window.BT.sync.login('coach@example.test', 'secret');

assert(window.BT.sync.getState().version === 2015, 'Der Ausgangsstand wurde nicht geladen');

remote = workspace(25, 'Neues Training vom PC');
remoteVersion = 2025;
const getsBeforeManualRefresh = getRequests;
await window.BT.sync.syncNow();

assert(getRequests === getsBeforeManualRefresh + 1, '„Jetzt abgleichen“ fragt den globalen Serverstand nicht ab');
assert(putRequests === 0, 'Ein unverändertes, veraltetes Gerät lädt seinen Stand unnötig zum Server hoch');
assert(local.trainings[0].title === 'Neues Training vom PC', '„Jetzt abgleichen“ übernimmt das geänderte Training nicht');
assert(window.BT.sync.getState().version === 2025, 'Die neue Workspace-Version wird nicht angezeigt');
assert(Number.isFinite(Date.parse(window.BT.sync.getState().lastCheckedAt)), 'Der Zeitpunkt der letzten Serverprüfung fehlt');

remote = workspace(26, 'Bearbeitetes Training vom PC');
remoteVersion = 2026;
const getsBeforeFocus = getRequests;
window.dispatchEvent(new window.Event('focus'));
await waitForAsyncEvents();
await waitForAsyncEvents();

assert(getRequests === getsBeforeFocus + 1, 'Beim Zurückkehren in die App wird der Serverstand nicht geprüft');
assert(local.trainings[0].title === 'Bearbeitetes Training vom PC', 'Der neue PC-Stand erscheint nach dem Zurückkehren nicht');

assert(typeof pollCallback === 'function', 'Die geöffnete App plant keine regelmäßige Versionsprüfung');
remote = workspace(27, 'Regelmäßig aktualisiertes Training');
remoteVersion = 2027;
await pollCallback();
await waitForAsyncEvents();

assert(local.trainings[0].title === 'Regelmäßig aktualisiertes Training', 'Die regelmäßige Versionsprüfung übernimmt den Serverstand nicht');
assert(window.BT.sync.getState().version === 2027, 'Die regelmäßige Prüfung aktualisiert die Workspace-Version nicht');

let releaseRequest;
let activeGetRequests = 0;
let maximumActiveGetRequests = 0;
getWorkspaceImpl = async () => {
  activeGetRequests++;
  maximumActiveGetRequests = Math.max(maximumActiveGetRequests, activeGetRequests);
  await new Promise(resolveRequest => { releaseRequest = resolveRequest; });
  activeGetRequests--;
  return {
    data: structuredClone(remote), version: remoteVersion,
    updatedAt: remote.meta.updatedAt, role: 'coach'
  };
};
window.dispatchEvent(new window.Event('focus'));
pollCallback();
await waitForAsyncEvents();
assert(maximumActiveGetRequests === 1, 'Fokus und Intervall starten parallele Workspace-Abfragen');
releaseRequest();
await waitForAsyncEvents();
await waitForAsyncEvents();

dom.window.close();

const uiDom = new JSDOM(readFileSync(resolve(root, 'index.html'), 'utf8'), {
  url: 'https://coach.tsv-lindau.de/', runScripts: 'outside-only'
});
const uiWindow = uiDom.window;
const uiState = {
  user: {
    id: 'coach-1', displayName: 'Coach', email: 'coach@example.test', role: 'coach',
    organization: { id: 'team-1', name: 'TSV Lindau' }
  },
  version: 2027,
  status: 'synced',
  lastCheckedAt: '2026-10-15T12:30:00.000Z',
  lastSyncAt: '2026-10-15T12:27:00.000Z'
};
uiWindow.BT = {
  sync: {
    getState: () => uiState,
    login: async () => {}, register: async () => {}, syncNow: async () => {}, logout() {}
  },
  api: { getMembers: async () => ({ members: [] }) },
  app: { getThemePreference: () => 'system', setThemePreference() {} },
  util: {
    renderTemplate(id) { return uiWindow.document.getElementById(id).content.firstElementChild.cloneNode(true); },
    toast() {}
  }
};
uiWindow.eval(readFileSync(resolve(root, 'js/account.js'), 'utf8'));
const target = uiWindow.document.createElement('main');
uiWindow.document.body.appendChild(target);
uiWindow.BT.account.render(target);

assert(target.querySelector('[data-action="sync-now"]').textContent.trim() === 'Jetzt abgleichen', 'Der manuelle Abgleich ist weiterhin missverständlich beschriftet');
assert(target.querySelector('[data-role="sync-label"]').textContent === 'Datenstand geprüft', 'Der Status behauptet weiterhin pauschal eine vollständige Synchronisierung');
assert(target.querySelector('[data-role="last-sync"]').textContent.includes('15.10.26'), 'Die Oberfläche zeigt nicht den Zeitpunkt der letzten Serverprüfung');

uiDom.window.close();
console.log('Sync-Aktualisierung: manueller Abgleich, Vordergrund und regelmäßige Prüfung erfolgreich.');
