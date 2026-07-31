window.BT = window.BT || {};

BT.account = (function() {
  const ROLE_LABELS = {
    admin: 'Administrator',
    coach: 'Trainer',
    assistant: 'Assistenztrainer',
    viewer: 'Lesender Zugriff'
  };

  function initials(name) {
    return String(name || 'TS').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  function formatSync(value) {
    if (!value) return 'Noch nicht synchronisiert';
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }

  function statusCopy(state) {
    const labels = {
      guest: 'Gastmodus · nur dieses Gerät',
      syncing: 'Synchronisierung läuft …',
      pending: 'Änderungen werden übertragen …',
      synced: 'Teamdaten synchronisiert',
      offline: 'Offline · Synchronisierung wartet',
      error: state.lastError || 'Synchronisierung gestört'
    };
    return labels[state.status] || state.status;
  }

  function update(root) {
    const state = BT.sync.getState();
    const guest = root.querySelector('[data-role="account-guest"]');
    const session = root.querySelector('[data-role="account-session"]');
    const indicator = root.querySelector('[data-role="sync-indicator"]');
    root.querySelector('[data-role="sync-label"]').textContent = statusCopy(state);
    indicator.dataset.status = state.status;

    guest.classList.toggle('hidden', !!state.user);
    session.classList.toggle('hidden', !state.user);
    if (!state.user) return;

    root.querySelector('[data-role="account-avatar"]').textContent = initials(state.user.displayName);
    root.querySelector('[data-role="account-role"]').textContent = ROLE_LABELS[state.user.role] || state.user.role;
    root.querySelector('[data-role="account-name"]').textContent = state.user.displayName;
    root.querySelector('[data-role="account-email"]').textContent = state.user.email;
    root.querySelector('[data-role="account-team"]').textContent = state.user.organization?.name || 'TSV Lindau Basketball';
    root.querySelector('[data-role="last-sync"]').textContent = formatSync(state.lastSyncAt);
    root.querySelector('[data-role="workspace-version"]').textContent = String(state.version);
  }

  async function loadMembers(root) {
    const state = BT.sync.getState();
    if (!state.user) return;
    const list = root.querySelector('[data-role="team-members"]');
    const status = root.querySelector('[data-role="members-status"]');
    status.textContent = 'Trainerteam wird geladen …';
    try {
      const result = await BT.api.getMembers();
      list.innerHTML = '';
      result.members.forEach((member) => {
        const row = document.createElement('div');
        row.className = 'team-member-row';
        const identity = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = member.displayName;
        const email = document.createElement('span');
        email.textContent = member.email;
        identity.append(name, email);
        row.appendChild(identity);

        if (state.user.role === 'admin') {
          const select = document.createElement('select');
          select.setAttribute('aria-label', 'Rolle für ' + member.displayName);
          Object.entries(ROLE_LABELS).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = value === member.role;
            select.appendChild(option);
          });
          select.addEventListener('change', async () => {
            select.disabled = true;
            try {
              await BT.api.updateMemberRole(member.id, select.value);
              status.textContent = 'Rolle gespeichert.';
              await loadMembers(root);
            } catch (error) {
              select.value = member.role;
              status.textContent = 'Fehler: ' + error.message;
            } finally {
              select.disabled = false;
            }
          });
          row.appendChild(select);
        } else {
          const badge = document.createElement('span');
          badge.className = 'member-role-badge';
          badge.textContent = ROLE_LABELS[member.role] || member.role;
          row.appendChild(badge);
        }
        list.appendChild(row);
      });
      status.textContent = '';
    } catch (error) {
      status.textContent = 'Fehler: ' + error.message;
    }
  }

  function render(target) {
    const root = BT.util.renderTemplate('tpl-account');
    target.appendChild(root);
    const authStatus = root.querySelector('[data-role="auth-status"]');
    const sessionStatus = root.querySelector('[data-role="session-status"]');

    const drawThemeChoice = () => {
      const preference = BT.app && BT.app.getThemePreference ? BT.app.getThemePreference() : (localStorage.getItem('beeptest_theme') || 'system');
      root.querySelectorAll('[data-theme-choice]').forEach((button) => {
        const active = button.dataset.themeChoice === preference;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };
    root.querySelectorAll('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => {
      if (BT.app && BT.app.setThemePreference) BT.app.setThemePreference(button.dataset.themeChoice);
      drawThemeChoice();
      BT.util.toast('Darstellung geändert.');
    }));
    window.addEventListener('bt-theme-change', drawThemeChoice, { once: false });
    drawThemeChoice();

    root.querySelector('[data-role="login-form"]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      authStatus.textContent = 'Anmeldung läuft …';
      try {
        await BT.sync.login(form.get('email'), form.get('password'));
        authStatus.textContent = '';
        update(root);
        loadMembers(root);
        BT.util.toast('Anmeldung erfolgreich. Teamdaten sind synchronisiert.');
      } catch (error) {
        authStatus.textContent = 'Fehler: ' + error.message;
      }
    });

    root.querySelector('[data-role="register-form"]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      authStatus.textContent = 'Konto wird erstellt …';
      try {
        await BT.sync.register(form.get('displayName'), form.get('email'), form.get('password'), form.get('inviteCode'));
        authStatus.textContent = '';
        update(root);
        loadMembers(root);
        BT.util.toast('Trainerkonto erstellt. Lokale Daten wurden übernommen.');
      } catch (error) {
        authStatus.textContent = 'Fehler: ' + error.message;
      }
    });

    root.querySelector('[data-action="sync-now"]').addEventListener('click', async () => {
      sessionStatus.textContent = 'Synchronisierung läuft …';
      try {
        await BT.sync.syncNow();
        sessionStatus.textContent = 'Teamdaten sind aktuell.';
        update(root);
      } catch (error) {
        sessionStatus.textContent = 'Fehler: ' + error.message;
      }
    });

    root.querySelector('[data-action="logout"]').addEventListener('click', () => {
      BT.sync.logout();
      sessionStatus.textContent = '';
      update(root);
    });

    const onChange = () => {
      if (!root.isConnected) {
        window.removeEventListener('bt-sync-change', onChange);
        window.removeEventListener('bt-theme-change', drawThemeChoice);
        return;
      }
      update(root);
    };
    window.addEventListener('bt-sync-change', onChange, { once: false });
    update(root);
    if (BT.sync.getState().user) loadMembers(root);
  }

  return { render };
})();
