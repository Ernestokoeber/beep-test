(function() {
  const app = document.getElementById('app');

  function route() {
    const hash = location.hash || '#/players';
    app.innerHTML = '';
    if (BT.test && BT.test.cleanup) BT.test.cleanup();

    setActiveNav(hash);

    if (hash === '#/players' || hash === '#/') {
      BT.players.render(app);
    } else if (hash.startsWith('#/player/')) {
      const id = hash.slice('#/player/'.length);
      BT.players.renderDetail(app, id);
    } else if (hash === '#/test/setup') {
      BT.test.renderSetup(app);
    } else if (hash.startsWith('#/test/run/')) {
      const id = hash.slice('#/test/run/'.length);
      BT.test.renderRun(app, id);
    } else if (hash === '#/history') {
      BT.history.renderList(app);
    } else if (hash.startsWith('#/history/')) {
      const id = hash.slice('#/history/'.length);
      BT.history.renderDetail(app, id);
    } else {
      location.hash = '#/players';
    }
  }

  function setActiveNav(hash) {
    const links = document.querySelectorAll('.topbar nav a');
    links.forEach(a => a.classList.remove('active'));
    if (hash.startsWith('#/players') || hash.startsWith('#/player/') || hash === '#/') {
      document.querySelector('[data-nav="players"]').classList.add('active');
    } else if (hash.startsWith('#/test')) {
      document.querySelector('[data-nav="setup"]').classList.add('active');
    } else if (hash.startsWith('#/history')) {
      document.querySelector('[data-nav="history"]').classList.add('active');
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', route);
  if (document.readyState !== 'loading') route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('Service Worker Registrierung fehlgeschlagen:', err.message);
      });
    });
  }
})();
