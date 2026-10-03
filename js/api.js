window.BT = window.BT || {};

BT.api = (function() {
  const TOKEN_KEY = 'beeptest_auth_token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* Speicher kann im Privatmodus blockiert sein. */ }
  }

  async function request(path, options) {
    const config = options || {};
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (config.auth !== false && token) headers.Authorization = 'Bearer ' + token;

    const timeoutMs = Number(config.timeoutMs);
    const controller = Number.isFinite(timeoutMs) && timeoutMs > 0 ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      let response;
      try {
        response = await fetch('/api' + path, {
          method: config.method || 'GET',
          headers,
          body: config.body === undefined ? undefined : JSON.stringify(config.body),
          signal: controller ? controller.signal : undefined
        });
      } catch (cause) {
        if (controller?.signal.aborted || cause?.name === 'AbortError') throw timeoutError();
        const error = new Error('Server nicht erreichbar. Offline-Daten bleiben erhalten.');
        error.status = 0;
        throw error;
      }

      let data = {};
      try { data = await response.json(); }
      catch (cause) {
        if (controller?.signal.aborted || cause?.name === 'AbortError') throw timeoutError();
        const serverTimedOut = path === '/ai/gemini' && response.status === 504;
        const error = new Error(serverTimedOut
          ? 'KI-Server hat die Anfrage vorzeitig beendet.'
          : 'Die Serverfunktion ist auf dieser Adresse nicht verfügbar.');
        error.status = response.status;
        error.code = serverTimedOut ? 'AI_SERVER_TIMEOUT' : null;
        error.retryable = serverTimedOut;
        error.requestId = null;
        throw error;
      }
      if (!response.ok) {
        const error = new Error(data.error || 'Serverfehler ' + response.status);
        error.status = response.status;
        error.code = data.code || null;
        error.retryable = data.retryable === true;
        error.requestId = data.requestId || null;
        error.providerStatus = Number.isInteger(data.providerStatus) ? data.providerStatus : null;
        error.data = data;
        throw error;
      }
      return data;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  }

  function timeoutError() {
    const error = new Error('KI-Anfrage hat zu lange gedauert.');
    error.status = 0;
    error.code = 'CLIENT_TIMEOUT';
    error.retryable = true;
    error.requestId = null;
    return error;
  }

  return {
    getToken,
    setToken,
    register: (displayName, email, password, inviteCode) => request('/auth/register', {
      method: 'POST', auth: false, body: { displayName, email, password, inviteCode }
    }),
    login: (email, password) => request('/auth/login', {
      method: 'POST', auth: false, body: { email, password }
    }),
    me: () => request('/auth/me'),
    getWorkspace: () => request('/workspace'),
    getMembers: () => request('/members'),
    updateMemberRole: (userId, role) => request('/members', {
      method: 'PATCH', body: { userId, role }
    }),
    saveWorkspace: (data, expectedVersion, confirmedGameDeletions = []) => request('/workspace', {
      method: 'PUT', body: { data, expectedVersion, confirmedGameDeletions }
    }),
    ai: (action, payload) => request('/ai/gemini', {
      method: 'POST',
      body: { action, payload },
      timeoutMs: action === 'parsePlan' || action === 'planSeason' || action === 'parseOpponentScreenshots' ? 55_000 : 38_000
    }),
    createCheckin: (trainingId, expiresInMinutes) => request('/checkin/manage', {
      method: 'POST', body: { trainingId, expiresInMinutes }
    }),
    getCheckin: (trainingId) => request('/checkin/manage?trainingId=' + encodeURIComponent(trainingId)),
    revokeCheckin: (trainingId) => request('/checkin/manage?trainingId=' + encodeURIComponent(trainingId), { method: 'DELETE' }),
    getPublicCheckin: (token) => request('/checkin/public?token=' + encodeURIComponent(token), { auth: false }),
    submitPublicCheckin: (token, playerId) => request('/checkin/public', {
      method: 'POST', auth: false, body: { token, playerId }
    }),
    syncWebsiteGames: (config) => {
      const value = config || {};
      const query = new URLSearchParams({
        leagueId: String(value.leagueId || 54509),
        teamId: String(value.teamId ?? 258298),
        teamName: String(value.teamName || 'TSV Lindau')
      });
      return request('/games/sync?' + query.toString());
    },
    getAtlasAnalysis: (atlasGameId) => request('/games/atlas?gameId=' + encodeURIComponent(atlasGameId))
  };
})();
