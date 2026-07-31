window.BT = window.BT || {};

BT.checkin = (function() {
  const { $, renderTemplate, escapeHTML, formatDate } = BT.util;

  async function render(target, token) {
    const root = renderTemplate('tpl-checkin');
    target.appendChild(root);
    document.body.classList.add('public-checkin-mode');

    const loading = $('[data-role="checkin-loading"]', root);
    const formWrap = $('[data-role="checkin-form-wrap"]', root);
    const error = $('[data-role="checkin-error"]', root);
    const success = $('[data-role="checkin-success"]', root);
    const form = $('[data-role="checkin-form"]', root);
    const select = $('[data-role="checkin-player"]', root);

    try {
      const data = await BT.api.getPublicCheckin(token);
      loading.classList.add('hidden');
      formWrap.classList.remove('hidden');
      $('[data-role="checkin-training-title"]', root).textContent = data.training.title || 'Teamtraining';
      $('[data-role="checkin-training-meta"]', root).textContent = formatDate(data.training.date) + (data.training.startTime ? ' · ' + data.training.startTime + ' Uhr' : '');
      select.innerHTML = '<option value="">Bitte auswählen …</option>' + data.players
        .map(player => '<option value="' + escapeHTML(player.id) + '">' + escapeHTML(player.name) + '</option>')
        .join('');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const playerId = select.value;
        if (!playerId) return;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Wird gemeldet …';
        try {
          const result = await BT.api.submitPublicCheckin(token, playerId);
          formWrap.classList.add('hidden');
          success.classList.remove('hidden');
          $('[data-role="checkin-success-text"]', root).textContent = result.playerName + ' wurde dem Trainerteam gemeldet.';
        } catch (submitError) {
          button.disabled = false;
          button.textContent = 'Ich bin da';
          BT.util.toast(submitError.message);
        }
      });
    } catch (loadError) {
      loading.classList.add('hidden');
      error.classList.remove('hidden');
      error.querySelector('p').textContent = loadError.message || 'Der Code ist abgelaufen oder wurde gesperrt.';
    }
  }

  function cleanup() {
    document.body.classList.remove('public-checkin-mode');
  }

  return { render, cleanup };
})();
