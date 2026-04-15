window.BT = window.BT || {};

BT.settings = (function() {
  const { $, $$, renderTemplate, escapeHTML } = BT.util;
  let root = null;
  let activeCat = null;

  function collectCategories() {
    const set = new Set();
    const globalCats = BT.storage.getSetting('shotCategories', []);
    for (const c of globalCats) set.add(c);
    for (const t of BT.storage.getTrainings()) {
      for (const s of (t.shots || [])) set.add(s.category);
    }
    const spots = BT.storage.getSetting('shotSpots', {});
    for (const k of Object.keys(spots)) set.add(k);
    set.add('Freiwürfe');
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }

  function getSpots() {
    return BT.storage.getSetting('shotSpots', {}) || {};
  }

  function saveSpots(spots) {
    BT.storage.setSetting('shotSpots', spots);
  }

  function render(target) {
    root = renderTemplate('tpl-settings');
    target.appendChild(root);

    const cats = collectCategories();
    if (cats.length > 0 && !activeCat) activeCat = cats[0];

    renderCatList();
    drawMarkers();
    setupCourt();
    setupControls();
  }

  function renderCatList() {
    const list = $('[data-role="spot-cat-list"]', root);
    if (!list) return;
    list.innerHTML = '';
    const cats = collectCategories();
    const spots = getSpots();
    for (const c of cats) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spot-cat-tab' + (c === activeCat ? ' active' : '') + (spots[c] ? ' has-spot' : '');
      const hasSpot = !!spots[c];
      btn.innerHTML = `${hasSpot ? '📍' : '◯'} ${escapeHTML(c)}`;
      btn.addEventListener('click', () => {
        activeCat = c;
        renderCatList();
        drawMarkers();
        const slider = $('[data-role="settings-spot-radius"]', root);
        const sval = $('[data-role="settings-spot-radius-val"]', root);
        const cur = (getSpots()[c]);
        if (slider && cur) { slider.value = cur.r || 22; if (sval) sval.textContent = cur.r || 22; }
      });
      list.appendChild(btn);
    }
  }

  function drawMarkers() {
    const layer = $('[data-role="settings-spot-markers"]', root);
    if (!layer) return;
    layer.innerHTML = '';
    const spots = getSpots();
    for (const [name, spot] of Object.entries(spots)) {
      if (!spot || typeof spot.x !== 'number') continue;
      const isActive = name === activeCat;
      const fillOpacity = isActive ? 0.35 : 0.18;
      const strokeColor = isActive ? '#e8a14d' : 'rgba(0,75,43,0.6)';
      const strokeW = isActive ? 2.5 : 1.5;
      layer.insertAdjacentHTML('beforeend',
        `<circle cx="${spot.x}" cy="${spot.y}" r="${spot.r || 22}" fill="rgba(232,161,77,${fillOpacity})" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-dasharray="${isActive ? '4 3' : ''}"/>` +
        `<circle cx="${spot.x}" cy="${spot.y}" r="4" fill="${isActive ? '#e8a14d' : '#004b2b'}" stroke="#fff" stroke-width="1"/>` +
        `<text x="${spot.x}" y="${spot.y - (spot.r || 22) - 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#1a1a1a" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${escapeHTML(name)}</text>`
      );
    }
  }

  function setupCourt() {
    const svg = $('[data-role="settings-spot-svg"]', root);
    const hit = $('[data-role="settings-spot-hit"]', root);
    if (!svg || !hit) return;
    hit.addEventListener('click', (e) => {
      if (!activeCat) { alert('Bitte zuerst eine Kategorie wählen.'); return; }
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      const spots = getSpots();
      const radiusInput = $('[data-role="settings-spot-radius"]', root);
      const r = parseInt((radiusInput && radiusInput.value) || 22, 10);
      spots[activeCat] = {
        x: Math.round(local.x * 10) / 10,
        y: Math.round(local.y * 10) / 10,
        r
      };
      saveSpots(spots);
      drawMarkers();
      renderCatList();
    });
  }

  function setupControls() {
    const slider = $('[data-role="settings-spot-radius"]', root);
    const sval = $('[data-role="settings-spot-radius-val"]', root);
    const clearBtn = $('[data-action="settings-clear-spot"]', root);
    const addBtn = $('[data-action="settings-add-cat"]', root);

    if (slider) {
      slider.addEventListener('input', () => {
        if (sval) sval.textContent = slider.value;
        if (!activeCat) return;
        const spots = getSpots();
        if (!spots[activeCat]) return;
        spots[activeCat].r = parseInt(slider.value, 10);
        saveSpots(spots);
        drawMarkers();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!activeCat) return;
        const spots = getSpots();
        delete spots[activeCat];
        saveSpots(spots);
        drawMarkers();
        renderCatList();
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const name = (prompt('Name der neuen Wurf-Kategorie:') || '').trim();
        if (!name) return;
        const globalCats = BT.storage.getSetting('shotCategories', []);
        if (!globalCats.includes(name)) {
          globalCats.push(name);
          BT.storage.setSetting('shotCategories', globalCats);
        }
        activeCat = name;
        renderCatList();
        drawMarkers();
      });
    }
  }

  return { render };
})();
