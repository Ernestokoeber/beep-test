(function() {
  const app = document.getElementById('app');
  const themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getThemePreference() {
    return localStorage.getItem('beeptest_theme') || 'system';
  }

  function resolvedTheme(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return themeMedia && themeMedia.matches ? 'dark' : 'light';
  }

  function setupTheme() {
    applyTheme(resolvedTheme(getThemePreference()));

    const btn = document.querySelector('[data-role="theme-toggle"]');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        setThemePreference(next);
      });
    }

    if (themeMedia && themeMedia.addEventListener) {
      themeMedia.addEventListener('change', () => {
        if (getThemePreference() === 'system') applyTheme(resolvedTheme('system'));
      });
    }
  }

  function setThemePreference(preference) {
    const value = ['light', 'dark', 'system'].includes(preference) ? preference : 'system';
    if (value === 'system') localStorage.removeItem('beeptest_theme');
    else localStorage.setItem('beeptest_theme', value);
    applyTheme(resolvedTheme(value));
    window.dispatchEvent(new CustomEvent('bt-theme-change', { detail: { preference: value, resolved: resolvedTheme(value) } }));
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = '#002f1b';
    } else {
      document.documentElement.removeAttribute('data-theme');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = '#004b2b';
    }
    const btn = document.querySelector('[data-role="theme-toggle"]');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function setupTopbarHeight() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const apply = () => {
      document.documentElement.style.setProperty('--topbar-height', topbar.offsetHeight + 'px');
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', apply);
    if (window.ResizeObserver) new ResizeObserver(apply).observe(topbar);
  }

  function setupViewportMetrics() {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;

    const apply = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const scale = viewport && viewport.scale ? viewport.scale : 1;

        // Beim Pinch-Zoom bleibt das Layout unverändert. Nur bei normaler
        // Skalierung folgen Vollbildbereiche der tatsächlich sichtbaren Höhe.
        if (scale <= 1.01) {
          const height = viewport && viewport.height ? viewport.height : window.innerHeight;
          if (height) root.style.setProperty('--app-viewport-height', Math.round(height * 100) / 100 + 'px');
        }

        root.dataset.viewportZoomed = scale > 1.01 ? 'true' : 'false';
      });
    };

    apply();
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true });
    if (viewport) {
      viewport.addEventListener('resize', apply, { passive: true });
      viewport.addEventListener('scroll', apply, { passive: true });
    }
  }

  function setupHamburger() {
    const btn = document.querySelector('[data-role="hamburger"]');
    const moreBtn = document.querySelector('[data-role="mobile-more"]');
    const nav = document.querySelector('[data-role="nav"]');
    if (!btn || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (moreBtn) moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      app.inert = open;
      if (open) (nav.querySelector('a.active') || nav.querySelector('a'))?.focus();
    };

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      setOpen(open);
    });
    if (moreBtn) {
      moreBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    }
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a, [data-context-action]')) {
        setOpen(false);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); }
      if (e.key === 'Tab' && nav.classList.contains('open')) {
        const controls = [btn, ...nav.querySelectorAll('a, button:not(:disabled)')].filter(node => node.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) setOpen(false); });
    window.addEventListener('hashchange', () => setOpen(false));
  }

  function updateContextNavigation() {
    const container = document.querySelector('[data-role="context-navigation"]');
    if (!container) return;
    container.replaceChildren();
    if (app.querySelector('[data-training-page], [data-tactics-page], [data-game-page], [data-calendar-page], [data-scouting-page]')) { container.hidden = true; return; }
    const training = app.querySelector('.training-detail-view');
    const sections = [...app.querySelectorAll('.mobile-extra-section[data-menu-label]')];
    const controls = [...app.querySelectorAll('.mobile-extra-action')];
    if (training) {
      controls.push(...[...training.querySelectorAll('.subnav-btn')].filter(button => !['overview', 'attendance', 'load'].includes(button.dataset.pane) && !button.hidden));
      controls.push(...training.querySelectorAll('[data-action="training-timer"], [data-action="end-training"], .head-menu-panel button'));
    }
    container.hidden = !controls.length && !sections.length;
    if (container.hidden) return;
    const title = document.createElement('span'); title.className = 'nav-section-label'; title.textContent = training ? 'Dieses Training · Details' : 'Dieser Bereich · Details'; container.append(title);
    for (const original of controls) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.contextAction = original.dataset.pane || original.dataset.action;
      button.textContent = original.dataset.menuLabel || original.textContent; button.disabled = original.disabled;
      if (original.classList.contains('active')) button.classList.add('active');
      button.addEventListener('click', () => { original.click(); updateContextNavigation(); });
      container.append(button);
    }
    for (const section of sections) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.contextAction = section.dataset.menuLabel;
      button.textContent = section.dataset.menuLabel;
      button.addEventListener('click', () => {
        for (const other of sections) other.classList.toggle('mobile-extra-open', other === section);
        if (section.tagName === 'DETAILS') section.open = true;
        requestAnimationFrame(() => section.scrollIntoView({block: 'start', behavior: 'instant'}));
      });
      container.append(button);
    }
  }

  let renderedHash = location.hash || '#/dashboard';
  let storageReady = null;
  let initialSync = Promise.resolve();
  let initialSyncPending = false;
  let routeRequest = 0;
  async function route() {
    const request = ++routeRequest;
    if (storageReady) {
      try { await storageReady; }
      catch { return; }
    }
    // Restore navigation drafts only after online or cached offline identity is known.
    if (initialSyncPending) await initialSync;
    if (request !== routeRequest) return;
    const hash = location.hash || '#/dashboard';
    if (BT.sync?.getState?.().user?.role === 'player' && !hash.startsWith('#/individual') && hash !== '#/account') {
      location.replace('#/individual');
      return;
    }
    const individualWorkspace = hash.startsWith('#/individual');
    document.body.classList.toggle('individual-workspace-mode', individualWorkspace);
    const brandLink = document.querySelector('.brand');
    const brandTitle = document.querySelector('.brand-text');
    const individualDockLabel = document.querySelector('.individual-mobile-link small');
    if (brandLink) brandLink.href = individualWorkspace ? '#/individual' : '#/dashboard';
    if (brandTitle) brandTitle.textContent = individualWorkspace ? 'Individual Training' : 'CourtHub';
    const manageLink = document.querySelector('.manage-link');
    if (manageLink) {
      manageLink.href = individualWorkspace ? '#/individual/account' : '#/management';
      manageLink.setAttribute('aria-label', individualWorkspace ? 'Konto und Synchronisierung' : 'Verwaltung öffnen');
    }
    if (individualDockLabel) individualDockLabel.textContent = individualWorkspace ? 'Cockpit' : 'Individual';
    const leaving=BT.games?.beforeLeave?.();
    if(leaving){const ok=await leaving;if((location.hash||'#/dashboard')!==hash)return;if(!ok){history.replaceState(null,'',renderedHash);return;}}
    BT.tactics?.cleanup?.();
    const navigationToken = BT.navigation?.begin(hash);
    renderedHash=hash;
    const isDashboard = hash === '#/dashboard' || hash === '#/' || hash === '';
    BT.dashboard?.cleanup?.();
    BT.insights?.cleanup();
    BT.calendar?.cleanup();
    BT.scoutingPages?.cleanup();
    if (!isDashboard) app.innerHTML = '';
    if (BT.test && BT.test.cleanup) BT.test.cleanup();
    if (BT.checkin && BT.checkin.cleanup) BT.checkin.cleanup();
    if (BT.training && BT.training.cleanup) BT.training.cleanup();
    if (BT.account && BT.account.cleanup) BT.account.cleanup();
    if (BT.games && BT.games.cleanup) BT.games.cleanup();

    setActiveNav(hash);

    if (hash.startsWith('#/checkin/')) {
      const token = decodeURIComponent(hash.slice('#/checkin/'.length));
      BT.checkin.render(app, token);
    } else if (hash === '#/individual') {
      await BT.individualTraining.render(app);
    } else if (hash === '#/individual/account') {
      BT.account.render(app);
      await BT.individualTraining.renderAccountNavigation();
    } else if (hash.startsWith('#/individual/player/')) {
      const [profileId, pane = 'overview'] = hash.slice('#/individual/player/'.length).split('/');
      await BT.individualTraining.render(app, decodeURIComponent(profileId), pane);
    } else if (isDashboard) {
      const currentUser = BT.sync?.getState?.().user;
      if (currentUser && ['admin', 'coach'].includes(currentUser.role)) {
        BT.individualTraining.renderHub(app);
      } else {
        // Das bisherige Menue bleibt sichtbar, bis das Dashboard vollstaendig in
        // einem losgeloesten Fragment aufgebaut wurde. So entsteht beim Wechsel
        // kein leerer Bildschirm.
        const dashboardView = document.createDocumentFragment();
        BT.dashboard.render(dashboardView);
        app.replaceChildren(dashboardView);
      }
    } else if (hash === '#/team') {
      const dashboardView = document.createDocumentFragment();
      BT.dashboard.render(dashboardView);
      app.replaceChildren(dashboardView);
    } else if (hash === '#/management') {
      app.append(BT.util.renderTemplate('tpl-management'));
    } else if (hash === '#/players/new') {
      BT.players.renderEditor(app);
    } else if (hash === '#/players') {
      BT.players.render(app);
    } else if (hash.startsWith('#/player/')) {
      const [encodedId, page = 'overview'] = hash.slice('#/player/'.length).split('/');
      let id;
      try { id = decodeURIComponent(encodedId); } catch { id = ''; }
      BT.players.renderDetail(app, id, page);
    } else if (hash === '#/test/setup') {
      BT.test.renderSetup(app);
    } else if (hash.startsWith('#/test/run/')) {
      const id = hash.slice('#/test/run/'.length);
      BT.test.renderRun(app, id);
    } else if (hash === '#/training') {
      BT.trainingPages.renderList(app);
    } else if (hash === '#/training/new') {
      BT.trainingPages.renderNew(app);
    } else if (hash.startsWith('#/training/')) {
      const [path, query = ''] = hash.slice('#/training/'.length).split('?');
      let parts;
      try { parts = path.split('/').map(decodeURIComponent); } catch { parts = ['']; }
      BT.trainingPages.render(app, parts[0], parts[1] || 'overview', parts[2], new URLSearchParams(query));
    } else if (hash === '#/games' || hash.startsWith('#/games/')) {
      await BT.gamePages.render(app,hash);
    } else if (hash === '#/opponents' || hash.startsWith('#/opponents/')) {
      BT.scoutingPages.render(app);
    } else if (hash === '#/jerseys') {
      BT.jerseys.render(app);
    } else if (hash === '#/tablecrew') {
      BT.tablecrew.render(app);
    } else if (hash === '#/reports' || hash.startsWith('#/reports/') || hash.startsWith('#/reports?')) {
      BT.insights.render(app);
    } else if (hash === '#/briefing' || hash.startsWith('#/briefing?')) {
      BT.dashboard.renderBriefing(app);
    } else if (hash === '#/statistics' || hash.startsWith('#/statistics/') || hash.startsWith('#/statistics?')) {
      BT.insights.render(app);
    } else if (hash === '#/data') {
      BT.dashboard.renderData(app);
    } else if (hash === '#/schedule' || hash.startsWith('#/schedule/') || hash.startsWith('#/schedule?')) {
      BT.calendar.render(app);
    } else if (hash === '#/notes') {
      BT.notes.renderList(app);
    } else if (hash.startsWith('#/notes/')) {
      const id = hash.slice('#/notes/'.length);
      BT.notes.renderDetail(app, id);
    } else if (hash === '#/drills') {
      BT.drills.renderList(app);
    } else if (hash.startsWith('#/drills/')) {
      const id = hash.slice('#/drills/'.length);
      BT.drills.renderDetail(app, id);
    } else if (hash === '#/tactics/screens') {
      BT.screenAcademy.render(app);
    } else if (hash === '#/tactics' || hash.startsWith('#/tactics/')) {
      await BT.tactics.renderPage(app, hash);
    } else if (hash === '#/settings') {
      BT.settings.render(app);
    } else if (hash === '#/account') {
      BT.account.render(app);
    } else if (hash === '#/history') {
      BT.history.renderList(app);
    } else if (hash.startsWith('#/history/')) {
      const id = hash.slice('#/history/'.length);
      BT.history.renderDetail(app, id);
    } else {
      location.hash = '#/dashboard';
    }
    if (BT.install && BT.install.refresh) requestAnimationFrame(BT.install.refresh);
    updateContextNavigation();
    BT.navigation?.finish(navigationToken);
  }

  function setActiveNav(hash) {
    const links = document.querySelectorAll('.topbar nav a');
    links.forEach(a => a.classList.remove('active'));
    const mobileLinks = document.querySelectorAll('[data-mobile-nav]');
    mobileLinks.forEach(a => a.classList.remove('active'));
    let active = 'dashboard';
    if (hash.startsWith('#/dashboard') || hash === '#/team' || hash === '#/' || hash === '') {
      active = 'dashboard';
    } else if (hash.startsWith('#/individual')) {
      active = 'individual';
    } else if (hash.startsWith('#/players') || hash.startsWith('#/player/')) {
      active = 'players';
    } else if (hash.startsWith('#/training')) {
      active = 'training';
    } else if (hash.startsWith('#/games')) {
      active = 'games';
    } else if (hash.startsWith('#/opponents')) {
      active = 'opponents';
    } else if (hash.startsWith('#/jerseys')) {
      active = 'jerseys';
    } else if (hash.startsWith('#/tablecrew')) {
      active = 'tablecrew';
    } else if (hash.startsWith('#/reports')) {
      active = 'players';
    } else if (hash.startsWith('#/briefing')) {
      active = 'briefing';
    } else if (hash.startsWith('#/statistics')) {
      active = 'players';
    } else if (hash.startsWith('#/data')) {
      active = 'data';
    } else if (hash.startsWith('#/settings')) {
      active = 'settings';
    } else if (hash.startsWith('#/test')) {
      active = 'players';
    } else if (hash.startsWith('#/schedule')) {
      active = 'training';
    } else if (hash.startsWith('#/notes')) {
      active = 'notes';
    } else if (hash.startsWith('#/drills')) {
      active = 'training';
    } else if (hash.startsWith('#/tactics')) {
      active = 'tactics';
    } else if (hash.startsWith('#/history')) {
      active = 'history';
    } else if (hash.startsWith('#/account')) {
      active = 'account';
    }
    const desktopActive = document.querySelector('[data-nav="' + active + '"]');
    const mobileActive = document.querySelector('[data-mobile-nav="' + active + '"]');
    if (desktopActive) desktopActive.classList.add('active');
    if (mobileActive) mobileActive.classList.add('active');
    for (const link of [...links, ...mobileLinks]) {
      if (link.classList.contains('active')) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('bt-sync-change', () => {
    const hash = location.hash || '#/dashboard';
    if (hash === '#/team') BT.dashboard?.refresh?.();
    if (hash === '#/dashboard' || hash === '#/' || hash === '') route();
  });
  let initialized = false;
  async function init() {
    if (initialized) return;
    initialized = true;
    try {
      if (BT.storage?.ready) {
        storageReady = BT.storage.ready();
        await storageReady;
        storageReady = null;
      }
    } catch (error) {
      app.textContent = 'Die gespeicherten CourtHub-Daten konnten nicht geladen werden. Bitte die App erneut öffnen. Keine Website-Daten löschen.';
      console.error('Workspace initialization failed', error);
      return;
    }
    setupTheme(); setupHamburger(); setupViewportMetrics(); setupTopbarHeight();
    // Selected games and edited plans can rebuild inside the current route.
    if (window.MutationObserver) {
      let menuFrame = 0;
      new MutationObserver(() => {
        if (menuFrame) return;
        menuFrame = requestAnimationFrame(() => { menuFrame = 0; updateContextNavigation(); });
      }).observe(app, {childList: true, subtree: true});
    }
    if (BT.sync && BT.sync.init) {
      initialSyncPending = true;
      initialSync = Promise.resolve(BT.sync.init()).catch(() => {}).finally(() => { initialSyncPending = false; });
    }
    route();
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let reloadingForUpdate = false;
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
      const isUpdate = hadController;
      hadController = !!navigator.serviceWorker.controller;
      // First installation can claim this page without downloading it again.
      // Existing clients reload once to pick up the newly installed release.
      if (!isUpdate || !hadController || reloadingForUpdate) return;
      reloadingForUpdate = true;
      try { if (BT.storage?.flush) await BT.storage.flush(); }
      catch { reloadingForUpdate = false; return; }
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .catch((err) => {
          console.warn('Service Worker Registrierung fehlgeschlagen:', err.message);
        });
    });
  }

  window.BT = window.BT || {};
  BT.app = { applyTheme, setThemePreference, getThemePreference, resolvedTheme };
})();
