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
  }

  function updateContextNavigation() {
    const container = document.querySelector('[data-role="context-navigation"]');
    if (!container) return;
    container.replaceChildren();
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
  let initialSync = Promise.resolve();
  async function route() {
    const hash = location.hash || '#/dashboard';
    if (/^#\/games\/[^/]+\/matchday(?:\?training)?$/.test(hash)) {
      await initialSync;
      if ((location.hash || '#/dashboard') !== hash) return;
    }
    const leaving=BT.games?.beforeLeave?.();
    if(leaving){const ok=await leaving;if((location.hash||'#/dashboard')!==hash)return;if(!ok){history.replaceState(null,'',renderedHash);return;}}
    renderedHash=hash;
    const isDashboard = hash === '#/dashboard' || hash === '#/' || hash === '';
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
    } else if (isDashboard) {
      // Das bisherige Menue bleibt sichtbar, bis das Dashboard vollstaendig in
      // einem losgeloesten Fragment aufgebaut wurde. So entsteht beim Wechsel
      // kein leerer Bildschirm.
      const dashboardView = document.createDocumentFragment();
      BT.dashboard.render(dashboardView);
      app.replaceChildren(dashboardView);
    } else if (hash === '#/players') {
      BT.players.render(app);
    } else if (hash.startsWith('#/player/')) {
      const id = hash.slice('#/player/'.length);
      BT.players.renderDetail(app, id);
    } else if (hash === '#/test/setup') {
      BT.test.renderSetup(app);
    } else if (hash.startsWith('#/test/run/')) {
      const id = hash.slice('#/test/run/'.length);
      BT.test.renderRun(app, id);
    } else if (hash === '#/training') {
      BT.training.renderList(app);
    } else if (hash.startsWith('#/training/')) {
      const id = hash.slice('#/training/'.length);
      BT.training.renderDetail(app, id);
    } else if (/^#\/games\/[^/]+\/matchday(?:\?training)?$/.test(hash)) {
      BT.games.renderMatchday(app,decodeURIComponent(hash.split('/')[2]),hash.endsWith('?training'));
    } else if (hash === '#/games') {
      BT.games.render(app);
    } else if (hash === '#/opponents') {
      BT.opponents.render(app);
    } else if (hash === '#/tablecrew') {
      BT.tablecrew.render(app);
    } else if (hash === '#/reports') {
      BT.reports.render(app);
    } else if (hash === '#/briefing') {
      BT.dashboard.renderBriefing(app);
    } else if (hash === '#/statistics') {
      BT.dashboard.renderStatistics(app);
    } else if (hash === '#/data') {
      BT.dashboard.renderData(app);
    } else if (hash === '#/schedule' || hash === '#/schedule/team-concept') {
      BT.schedule.render(app);
      if (hash === '#/schedule/team-concept') app.querySelector('[data-menu-label="Saisonplanung und Teamkonzept"]')?.classList.add('mobile-extra-open');
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
    } else if (hash === '#/tactics/player') {
      BT.tactics.renderPlayer(app);
    } else if (hash === '#/tactics') {
      BT.tactics.render(app);
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
  }

  function setActiveNav(hash) {
    const links = document.querySelectorAll('.topbar nav a');
    links.forEach(a => a.classList.remove('active'));
    const mobileLinks = document.querySelectorAll('[data-mobile-nav]');
    mobileLinks.forEach(a => a.classList.remove('active'));
    let active = 'dashboard';
    if (hash.startsWith('#/dashboard') || hash === '#/' || hash === '') {
      active = 'dashboard';
    } else if (hash.startsWith('#/players') || hash.startsWith('#/player/')) {
      active = 'players';
    } else if (hash.startsWith('#/training')) {
      active = 'training';
    } else if (hash.startsWith('#/games')) {
      active = 'games';
    } else if (hash.startsWith('#/opponents')) {
      active = 'opponents';
    } else if (hash.startsWith('#/tablecrew')) {
      active = 'tablecrew';
    } else if (hash.startsWith('#/reports')) {
      active = 'reports';
    } else if (hash.startsWith('#/briefing')) {
      active = 'briefing';
    } else if (hash.startsWith('#/statistics')) {
      active = 'statistics';
    } else if (hash.startsWith('#/data')) {
      active = 'data';
    } else if (hash.startsWith('#/settings')) {
      active = 'settings';
    } else if (hash.startsWith('#/test')) {
      active = 'setup';
    } else if (hash.startsWith('#/schedule')) {
      active = 'schedule';
    } else if (hash.startsWith('#/notes')) {
      active = 'notes';
    } else if (hash.startsWith('#/drills')) {
      active = 'drills';
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
  }

  window.addEventListener('hashchange', route);
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    setupTheme(); setupHamburger(); setupViewportMetrics(); setupTopbarHeight();
    // Selected games and edited plans can rebuild inside the current route.
    if (window.MutationObserver) {
      let menuFrame = 0;
      new MutationObserver(() => {
        if (menuFrame) return;
        menuFrame = requestAnimationFrame(() => { menuFrame = 0; updateContextNavigation(); });
      }).observe(app, {childList: true, subtree: true});
    }
    if (BT.sync && BT.sync.init) initialSync = Promise.resolve(BT.sync.init()).catch(() => {});
    route();
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let reloadingForUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch((err) => {
          console.warn('Service Worker Registrierung fehlgeschlagen:', err.message);
        });
    });
  }

  window.BT = window.BT || {};
  BT.app = { applyTheme, setThemePreference, getThemePreference, resolvedTheme };
})();
