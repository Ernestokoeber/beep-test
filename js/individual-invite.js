window.BT = window.BT || {};
BT.individualInvite = (function() {
  let generation = 0;
  const esc = value => BT.util.escapeHTML(value);
  function cleanup() { generation++; }
  function legacyRoute() {
    const url = new URL(location.href), token = url.searchParams.get('individualInvite');
    if (!token) return;
    url.searchParams.delete('individualInvite');
    url.hash = '/join/' + encodeURIComponent(token);
    history.replaceState(null, '', url.href);
  }
  async function render(target, token) {
    const request = ++generation;
    const active = () => request === generation && target.isConnected;
    target.innerHTML = '<section class="view individual-view individual-join"><h2>Dein Individualtraining</h2><p role="status">Einladung wird geprüft …</p></section>';
    const current = BT.sync.getState().user;
    if (current) {
      target.innerHTML = '<section class="view individual-view individual-join"><h2>Du bist bereits angemeldet</h2><p>Die Einladung ist für ein neues Spielerkonto bestimmt. Melde dich zuerst über die Kontoseite ab, wenn du sie mit einem anderen Konto verwenden möchtest.</p><a class="btn primary" href="#/individual/account">Zum Konto</a></section>';
      return;
    }
    try {
      if (!/^[A-Za-z0-9_-]{24,512}$/.test(token)) throw new Error('Der Einladungslink ist unvollständig oder ungültig.');
      const invitation = await BT.api.getIndividualInvite(token);
      if (!active()) return;
      if (invitation.valid !== true) throw new Error('Diese Einladung ist nicht mehr gültig.');
      target.innerHTML = `<section class="view individual-view individual-join"><a class="btn small" href="#/account">← Zur Anmeldung</a><div class="individual-hero"><div><h2>Dein Individualtraining</h2><p>Dein Plan. Dein Fortschritt. Dein Kontakt zum Coach.</p></div></div><form class="card individual-feedback-form" data-player-registration><h3>Spielerkonto erstellen</h3><p>Dein Coach hat dich eingeladen. Du erhältst ausschließlich Zugriff auf deinen persönlichen Trainingsbereich.</p><label>Dein Name<input name="displayName" autocomplete="name" minlength="2" maxlength="80" required></label><label>E-Mail<input name="email" type="email" autocomplete="email" required></label><label>Passwort<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required><small>Mindestens 10 Zeichen</small></label><button class="btn primary" type="submit">Spielerkonto erstellen</button><p role="status" aria-live="polite" tabindex="-1" data-registration-status></p><small>Einmal verwendbar. Gültig bis ${esc(new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(invitation.expiresAt)))}.</small></form><p>Schon registriert? <a href="#/account">Mit deinem Spielerkonto anmelden</a>.</p></section>`;
      const form = target.querySelector('form'), status = form.querySelector('[data-registration-status]'), button = form.querySelector('button[type="submit"]');
      form.addEventListener('invalid', () => { status.textContent = 'Bitte Name, gültige E-Mail und ein Passwort mit mindestens 10 Zeichen eintragen.'; }, true);
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (button.disabled) return;
        button.disabled = true; form.setAttribute('aria-busy','true'); status.textContent = 'Dein Konto wird erstellt …';
        let unusable = false;
        const values = new FormData(form);
        try {
          const registered = await BT.sync.register(values.get('displayName'), values.get('email'), values.get('password'), undefined, token);
          if (!active()) return;
          if (registered.role !== 'player') throw new Error('Das Konto konnte nicht als Spielerkonto bestätigt werden. Bitte deinen Coach kontaktieren.');
          history.replaceState(null, '', location.pathname + '#/individual');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (error) {
          if (!active()) return;
          status.textContent = error.message; status.focus();
          unusable = [403,410].includes(error.status);
        } finally {
          form.removeAttribute('aria-busy');
          if (active()) button.disabled = unusable;
        }
      });
    } catch (error) {
      if (!active()) return;
      target.innerHTML = `<section class="view individual-view individual-join"><h2>Einladung nicht verfügbar</h2><p role="alert">${esc(error.message)}</p><button class="btn primary" data-retry-invite>Erneut prüfen</button><a class="btn" href="#/account">Zur Anmeldung</a></section>`;
      target.querySelector('[data-retry-invite]').addEventListener('click',()=>render(target,token));
    }
  }
  return {render, cleanup, legacyRoute};
})();
