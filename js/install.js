window.BT = window.BT || {};

BT.install = (function() {
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function installButtons() {
    return Array.from(document.querySelectorAll('[data-role="pwa-install"]'));
  }

  function setInstallVisibility(visible) {
    installButtons().forEach((button) => button.classList.toggle('hidden', !visible));
  }

  function openInstallHelp() {
    const existing = document.querySelector('[data-role="install-dialog"]');
    if (existing) {
      if (typeof existing.showModal === 'function') existing.showModal();
      return;
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'install-dialog';
    dialog.dataset.role = 'install-dialog';
    const iosCopy = isIOS()
      ? '<ol><li>Unten in Safari auf <strong>Teilen</strong> tippen.</li><li><strong>Zum Home-Bildschirm</strong> auswählen.</li><li>Mit <strong>Hinzufügen</strong> bestätigen.</li></ol>'
      : '<p>Öffne das Browser-Menü und wähle <strong>App installieren</strong> oder <strong>Zum Startbildschirm hinzufügen</strong>.</p>';
    dialog.innerHTML = '<div class="install-dialog-card"><span class="dialog-kicker">TSV Coaching Center</span><h2>App auf dem Gerät installieren</h2>' + iosCopy + '<p class="muted">Danach startet die Trainings-App im Vollbild und bleibt auch in der Halle offline verfügbar.</p><button class="btn primary" type="button" data-action="close-install-help">Verstanden</button></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-action="close-install-help"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  async function install() {
    if (!deferredPrompt) {
      openInstallHelp();
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setInstallVisibility(false);
  }

  function updateConnectionStatus() {
    const online = navigator.onLine;
    document.querySelectorAll('[data-role="connection-status"]').forEach((chip) => {
      chip.classList.toggle('offline', !online);
      const label = chip.querySelector('span');
      if (label) label.textContent = online ? (isStandalone() ? 'Installiert · Online' : 'Online') : 'Offline verfügbar';
    });
  }

  function updateDashboardDate() {
    document.querySelectorAll('[data-role="dashboard-date"]').forEach((element) => {
      element.textContent = new Intl.DateTimeFormat('de-DE', {
        weekday: 'long', day: '2-digit', month: 'long'
      }).format(new Date());
    });
  }

  function bindButtons() {
    installButtons().forEach((button) => {
      if (button.dataset.installBound === 'true') return;
      button.dataset.installBound = 'true';
      button.addEventListener('click', install);
    });
  }

  function refresh() {
    bindButtons();
    updateConnectionStatus();
    updateDashboardDate();
    if (!isStandalone() && (deferredPrompt || isIOS())) setInstallVisibility(true);
  }

  function init() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      refresh();
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      setInstallVisibility(false);
      updateConnectionStatus();
    });
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    window.addEventListener('hashchange', () => requestAnimationFrame(refresh));
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { refresh };
})();
