window.BT = window.BT || {};

// Browser history owns the route order; session storage only retains view state.
BT.navigation?.dispose?.();
BT.navigation = (function() {
  const key = 'courtHubPage';
  const listeners = new AbortController();
  let scope = '', entries = {}, drafts = {}, current = null, frame = 0, lastY = 0, replacement = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  const hashNow = () => location.hash || '#/dashboard';
  function identity() {
    const user = BT.sync?.getState?.().user;
    return JSON.stringify([user?.id || 'guest', user?.organization?.id || user?.organizationId || user?.teamId || '', user?.role || '']);
  }
  function persist() {
    const ids = Object.keys(entries);
    for (const id of ids.slice(0, Math.max(0, ids.length - 80))) delete entries[id];
    try { sessionStorage.setItem('courthub_pages:' + scope, JSON.stringify(entries)); } catch { /* Back still works in memory. */ }
    try { sessionStorage.setItem('courthub_drafts:' + scope, JSON.stringify(drafts)); } catch { /* Keep the draft in memory. */ }
  }
  function capture() {
    if (!current) return;
    if (hashNow() === current.hash) lastY = window.scrollY || 0;
    current.scroll = lastY;
    const active = document.activeElement;
    const link = active?.closest?.('a[href]');
    current.focusHref = link?.getAttribute('href') || '';
    persist();
  }
  function begin(hash = hashNow()) {
    const nextScope = identity();
    if (nextScope !== scope) {
      scope = nextScope; current = null; lastY = 0;
      try { entries = JSON.parse(sessionStorage.getItem('courthub_pages:' + scope) || '{}'); }
      catch { entries = {}; }
      try { drafts = JSON.parse(sessionStorage.getItem('courthub_drafts:' + scope) || '{}'); }
      catch { drafts = {}; }
    }
    if (current) capture();
    const saved = history.state?.[key];
    const previous = current;
    const existing = saved?.scope === scope && saved.hash === hash && entries[saved.id];
    if (existing) current = existing;
    else {
      const id = globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random();
      current = entries[id] = { id, hash, state: {}, scroll: 0,
        parent: replacement?.hash === hash ? replacement.parent : previous ? { id: previous.id, hash: previous.hash, title: previous.title } : null };
      history.replaceState({ ...history.state, [key]: { id, hash, scope } }, '', hash);
    }
    lastY = current.scroll || 0;
    replacement = null;
    history.scrollRestoration = 'manual';
    persist();
    return { id: current.id, scope, restore: !!existing, scroll: current.scroll || 0 };
  }
  function parentRoute(hash = hashNow()) {
    if (/^#\/player\/[^/]+\/[^/]+$/.test(hash)) return hash.slice(0, hash.lastIndexOf('/'));
    if (hash.startsWith('#/player/') || hash === '#/players/new') return '#/players';
    if (hash.startsWith('#/individual/player/')) {
      const parts = hash.split('/');
      return parts.length > 4 ? parts.slice(0, 4).join('/') : '#/individual';
    }
    if (hash.startsWith('#/individual')) return '#/individual';
    if (hash.startsWith('#/training/')) {
      const parts = hash.split('?')[0].split('/');
      if (parts[3] === 'drill' || (parts[3] === 'plan' && parts[4])) return parts.slice(0,3).join('/') + '/plan';
      return parts.length > 3 ? parts.slice(0,3).join('/') : '#/training';
    }
    if (hash.startsWith('#/schedule') || hash.startsWith('#/drills')) return '#/training';
    if (hash.startsWith('#/games/') || hash === '#/opponents') return '#/games';
    if (hash.startsWith('#/tactics/')) {
      const parts = hash.split('?')[0].split('/');
      return parts.length > 3 ? parts.slice(0, 3).join('/') : '#/tactics';
    }
    if (hash.startsWith('#/history/')) return '#/history';
    if (['#/statistics', '#/reports', '#/test/setup'].includes(hash)) return '#/players';
    return '#/team';
  }
  function back(fallback) {
    if (current?.parent && entries[current.parent.id] && history.state?.[key]?.scope === identity()) history.back();
    else {
      capture();
      current = null; // The replacement has no browser-history predecessor inside the app.
      location.replace(fallback || parentRoute());
    }
  }
  function replace(hash) {
    if (hash === hashNow()) return;
    capture();
    replacement = { hash, parent: current?.parent || null };
    location.replace(hash);
  }
  function finish(token) {
    if (!current || token?.id !== current.id || token.scope !== identity() || hashNow() !== current.hash) return;
    const heading = document.querySelector('#app h2, #app h1, #app h3');
    current.title = heading?.textContent.trim() || 'CourtHub';
    document.title = current.title + ' · CourtHub';
    const button = document.querySelector('[data-page-back]');
    if (button) {
      const rootPage = ['#/team', '#/players', '#/training', '#/games', '#/tactics', '#/dashboard', '#/', '#/individual'].includes(current.hash);
      button.hidden = rootPage;
      const parent = current.parent?.title;
      button.setAttribute('aria-label', parent ? 'Zurück zu ' + parent : 'Zurück zur Übersicht');
      button.title = button.getAttribute('aria-label');
    }
    persist();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (current?.id !== token.id || hashNow() !== current.hash) return;
      const focusLink = token.restore && current.focusHref
        ? [...document.querySelectorAll('#app a[href]')].find(link => link.getAttribute('href') === current.focusHref)
        : null;
      const focusTarget = focusLink || heading;
      if (focusTarget) {
        if (!focusLink) focusTarget.tabIndex = -1;
        focusTarget.focus({ preventScroll: true });
      }
      window.scrollTo({ top: token.restore ? token.scroll : 0, left: 0, behavior: 'instant' });
      lastY = window.scrollY || 0;
    });
  }
  function getState() { return clone({ ...current?.state, ...drafts[current?.hash] }); }
  function setState(patch) {
    if (!current) return;
    Object.assign(current.state, clone(patch));
    for (const name of ['draft', 'goalDraft', 'feedbackDrafts']) {
      if (Object.hasOwn(patch, name)) {
        drafts[current.hash] ||= {};
        drafts[current.hash][name] = clone(patch[name]);
      }
    }
    persist();
  }
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-page-back]')) { event.preventDefault(); back(); return; }
    capture();
  }, { capture: true, signal: listeners.signal });
  window.addEventListener('scroll', () => {
    if (current && hashNow() === current.hash) { lastY = window.scrollY || 0; current.scroll = lastY; }
  }, { passive: true, signal: listeners.signal });
  window.addEventListener('pagehide', capture, { signal: listeners.signal });
  return { begin, finish, back, replace, getState, setState, capture, parentRoute,
    dispose() { listeners.abort(); cancelAnimationFrame(frame); } };
})();
