window.BT = window.BT || {};

BT.sync = (function() {
  const VERSION_KEY = 'beeptest_workspace_version';
  let user = null;
  let version = (() => {
    try { return Number.parseInt(localStorage.getItem(VERSION_KEY) || '0', 10) || 0; }
    catch { return 0; }
  })();
  let timer = null;
  let applying = false;
  let status = 'guest';
  let lastSyncAt = null;
  let lastError = null;

  function emit() {
    window.dispatchEvent(new CustomEvent('bt-sync-change', { detail: getState() }));
  }

  function setStatus(next, error) {
    status = next;
    lastError = error || null;
    emit();
  }

  function getState() {
    return { user, version, status, lastSyncAt, lastError };
  }

  function isApplying() { return applying; }

  function hasTeamData(data) {
    if (!data || typeof data !== 'object') return false;
    return ['players', 'sessions', 'trainings', 'games', 'tableDuties', 'notes', 'freethrows', 'drills', 'templates', 'phases', 'tactics']
      .some((key) => Array.isArray(data[key]) && data[key].length > 0);
  }

  function cleanForSync(data) {
    const copy = JSON.parse(JSON.stringify(data || {}));
    copy.settings = copy.settings || {};
    delete copy.settings.geminiApiKey;
    return copy;
  }

  function timestamp(data) {
    const value = data && data.meta && data.meta.updatedAt;
    const parsed = value ? Date.parse(value) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function storeVersion(next) {
    version = Number(next || 0);
    try { localStorage.setItem(VERSION_KEY, String(version)); } catch { /* Offline-Speicher blockiert. */ }
  }

  function applyRemote(data, nextVersion) {
    applying = true;
    try {
      BT.storage.save(data, { fromSync: true, preserveTimestamp: true });
      storeVersion(nextVersion);
    } finally {
      applying = false;
    }
    window.dispatchEvent(new Event('hashchange'));
  }

  async function push(data, expectedVersion) {
    if (!user) return;
    setStatus('syncing');
    const cleaned = cleanForSync(data);
    try {
      const result = await BT.api.saveWorkspace(cleaned, expectedVersion);
      storeVersion(result.version);
      lastSyncAt = result.updatedAt || new Date().toISOString();
      setStatus('synced');
    } catch (error) {
      if (error.status === 409 && error.data && error.data.conflict) {
        const remote = error.data.conflict;
        if (timestamp(cleaned) >= timestamp(remote.data)) {
          storeVersion(remote.version);
          return push(cleaned, remote.version);
        }
        applyRemote(remote.data, remote.version);
        lastSyncAt = remote.updatedAt || new Date().toISOString();
        setStatus('synced');
        BT.util.toast('Neuere Teamdaten wurden von einem anderen Gerät geladen.');
        return;
      }
      setStatus(error.status === 0 ? 'offline' : 'error', error.message);
    }
  }

  function queueSave(data) {
    if (!user || user.role === 'viewer' || applying) return;
    clearTimeout(timer);
    timer = setTimeout(() => push(data, version), 900);
    setStatus(navigator.onLine ? 'pending' : 'offline');
  }

  async function reconcile() {
    setStatus('syncing');
    const remote = await BT.api.getWorkspace();
    const local = BT.storage.load();
    storeVersion(remote.version);

    if (user?.role === 'viewer') {
      applyRemote(remote.data, remote.version);
      lastSyncAt = remote.updatedAt || new Date().toISOString();
      setStatus('synced');
      return;
    }

    if (!hasTeamData(remote.data) && hasTeamData(local)) {
      await push(local, remote.version);
      return;
    }
    if (hasTeamData(remote.data) && (!hasTeamData(local) || timestamp(remote.data) > timestamp(local))) {
      applyRemote(remote.data, remote.version);
    } else if (hasTeamData(local) && timestamp(local) > timestamp(remote.data)) {
      await push(local, remote.version);
      return;
    }
    lastSyncAt = remote.updatedAt || new Date().toISOString();
    setStatus('synced');
  }

  async function setSession(result) {
    BT.api.setToken(result.token);
    user = result.user;
    emit();
    await reconcile();
  }

  async function login(email, password) {
    const result = await BT.api.login(email, password);
    await setSession(result);
    return result.user;
  }

  async function register(displayName, email, password, inviteCode) {
    const result = await BT.api.register(displayName, email, password, inviteCode);
    await setSession(result);
    return result.user;
  }

  function logout() {
    clearTimeout(timer);
    BT.api.setToken(null);
    try { localStorage.removeItem(VERSION_KEY); } catch { /* Offline-Speicher blockiert. */ }
    user = null;
    version = 0;
    lastSyncAt = null;
    setStatus('guest');
  }

  async function syncNow() {
    if (!user) throw new Error('Bitte zuerst anmelden.');
    if (user.role === 'viewer') {
      await reconcile();
      return;
    }
    await push(BT.storage.load(), version);
  }

  async function init() {
    if (!BT.api.getToken()) {
      setStatus('guest');
      return;
    }
    try {
      const result = await BT.api.me();
      user = result.user;
      emit();
      await reconcile();
    } catch (error) {
      if (error.status === 401 || error.status === 403) logout();
      else setStatus(error.status === 0 ? 'offline' : 'error', error.message);
    }
  }

  window.addEventListener('online', () => {
    if (user) reconcile().catch((error) => setStatus('error', error.message));
  });
  window.addEventListener('offline', () => {
    if (user) setStatus('offline');
  });

  return { init, login, register, logout, syncNow, queueSave, isApplying, getState };
})();
