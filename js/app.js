(function() {
  const app = document.getElementById('app');

  function setupTheme() {
    const stored = localStorage.getItem('beeptest_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    const btn = document.querySelector('[data-role="theme-toggle"]');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        localStorage.setItem('beeptest_theme', next);
        applyTheme(next);
      });
    }
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
    };

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      setOpen(open);
    });
    if (moreBtn) {
      moreBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    }
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        setOpen(false);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false);
    });
  }

  function route() {
    const hash = location.hash || '#/dashboard';
    app.innerHTML = '';
    if (BT.test && BT.test.cleanup) BT.test.cleanup();
    if (BT.checkin && BT.checkin.cleanup) BT.checkin.cleanup();

    setActiveNav(hash);

    if (hash.startsWith('#/checkin/')) {
      const token = decodeURIComponent(hash.slice('#/checkin/'.length));
      BT.checkin.render(app, token);
    } else if (hash === '#/dashboard' || hash === '#/' || hash === '') {
      BT.dashboard.render(app);
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
    } else if (hash === '#/games') {
      BT.games.render(app);
    } else if (hash === '#/schedule') {
      BT.schedule.render(app);
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
    setupTheme(); setupHamburger(); setupTopbarHeight(); route();
    if (BT.sync && BT.sync.init) BT.sync.init();
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('Service Worker Registrierung fehlgeschlagen:', err.message);
      });
    });
  }
})();
