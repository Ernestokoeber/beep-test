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

    let response;
    try {
      response = await fetch('/api' + path, {
        method: config.method || 'GET',
        headers,
        body: config.body === undefined ? undefined : JSON.stringify(config.body)
      });
    } catch {
      const error = new Error('Server nicht erreichbar. Offline-Daten bleiben erhalten.');
      error.status = 0;
      throw error;
    }

    let data = {};
    try { data = await response.json(); }
    catch {
      const error = new Error('Die Serverfunktion ist auf dieser Adresse nicht verfügbar.');
      error.status = response.status;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(data.error || 'Serverfehler ' + response.status);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
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
    saveWorkspace: (data, expectedVersion) => request('/workspace', {
      method: 'PUT', body: { data, expectedVersion }
    }),
    ai: (action, payload) => request('/ai/gemini', {
      method: 'POST', body: { action, payload }
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
    syncWebsiteGames: () => request('/games/sync'),
    getAtlasAnalysis: (atlasGameId) => request('/games/atlas?gameId=' + encodeURIComponent(atlasGameId))
  };
})();
