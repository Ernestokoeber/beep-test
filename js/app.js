(function() {
  const app = document.getElementById('app');

  function setupHamburger() {
    const btn = document.querySelector('[data-role="hamburger"]');
    const nav = document.querySelector('[data-role="nav"]');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function route() {
    const hash = location.hash || '#/players';
    app.innerHTML = '';
    if (BT.test && BT.test.cleanup) BT.test.cleanup();

    setActiveNav(hash);

    if (hash === '#/dashboard' || hash === '#/' || hash === '') {
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
    } else if (hash === '#/notes') {
      BT.notes.renderList(app);
    } else if (hash.startsWith('#/notes/')) {
      const id = hash.slice('#/notes/'.length);
      BT.notes.renderDetail(app, id);
    } else if (hash === '#/history') {
      BT.history.renderList(app);
    } else if (hash.startsWith('#/history/')) {
      const id = hash.slice('#/history/'.length);
      BT.history.renderDetail(app, id);
    } else {
      location.hash = '#/dashboard';
    }
  }

  function setActiveNav(hash) {
    const links = document.querySelectorAll('.topbar nav a');
    links.forEach(a => a.classList.remove('active'));
    if (hash.startsWith('#/dashboard') || hash === '#/' || hash === '') {
      document.querySelector('[data-nav="dashboard"]').classList.add('active');
    } else if (hash.startsWith('#/players') || hash.startsWith('#/player/')) {
      document.querySelector('[data-nav="players"]').classList.add('active');
    } else if (hash.startsWith('#/training')) {
      document.querySelector('[data-nav="training"]').classList.add('active');
    } else if (hash.startsWith('#/test')) {
      document.querySelector('[data-nav="setup"]').classList.add('active');
    } else if (hash.startsWith('#/notes')) {
      document.querySelector('[data-nav="notes"]').classList.add('active');
    } else if (hash.startsWith('#/history')) {
      document.querySelector('[data-nav="history"]').classList.add('active');
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', () => { setupHamburger(); route(); });
  if (document.readyState !== 'loading') { setupHamburger(); route(); }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('Service Worker Registrierung fehlgeschlagen:', err.message);
      });
    });
  }
})();
