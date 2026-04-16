window.BT = window.BT || {};

// Gemeinsame Heatmap-Logik fuer Dashboard und Spieler-Detail.
// SVG-Coordinates: viewBox 500x470, Korb bei (250, 50), Halbfeld.
BT.heatmap = (function() {

  const ZONES = {
    rim:      { label: 'Korb',       cx: 250, cy: 65 },
    paint:    { label: 'Zone',       cx: 250, cy: 130 },
    ft:       { label: 'FW/Mitte',   cx: 250, cy: 205 },
    mid_l:    { label: 'Mittel L',   cx: 110, cy: 160 },
    mid_r:    { label: 'Mittel R',   cx: 390, cy: 160 },
    corner_l: { label: '3er Ecke L', cx: 30,  cy: 75 },
    corner_r: { label: '3er Ecke R', cx: 470, cy: 75 },
    arc_3:    { label: '3er Bogen',  cx: 250, cy: 395 }
  };

  function zoneOf(x, y) {
    const distRim = Math.hypot(x - 250, y - 50);
    const distFT = Math.hypot(x - 250, y - 200);
    const distArc = Math.hypot(x - 250, y - 135);
    const is3Corner = y <= 135 && (x < 50 || x > 450);
    const is3Arc = y > 135 && distArc > 200;
    if (is3Corner) return x < 50 ? 'corner_l' : 'corner_r';
    if (is3Arc) return 'arc_3';
    if (distRim < 42) return 'rim';
    if (distFT < 55) return 'ft';
    const inPaint = x >= 160 && x <= 340 && y >= 10 && y <= 200;
    if (inPaint) return 'paint';
    return x < 250 ? 'mid_l' : 'mid_r';
  }

  function escapeSvgText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderBadge(cellsEl, cx, cy, data, label) {
    const p = data.total > 0 ? data.hits / data.total : 0;
    const red = Math.round(220 * (1 - p)) + 20;
    const green = Math.round(160 * p + 60);
    const pctTxt = Math.round(p * 100) + '%';
    const radius = 26;
    const shortLabel = label && label.length > 16 ? label.slice(0, 14) + '…' : (label || '');
    cellsEl.insertAdjacentHTML('beforeend',
      `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgb(${red},${green},30)" fill-opacity="0.82" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"><title>${escapeSvgText(label)}: ${data.hits}/${data.total} (${pctTxt})</title></circle>` +
      `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" pointer-events="none" style="paint-order:stroke;stroke:rgba(0,0,0,0.5);stroke-width:2">${pctTxt}</text>` +
      `<text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="9" font-weight="600" fill="#fff" pointer-events="none" style="paint-order:stroke;stroke:rgba(0,0,0,0.5);stroke-width:2">${data.hits}/${data.total}</text>` +
      (shortLabel
        ? `<text x="${cx}" y="${cy - radius - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a1a" pointer-events="none" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${escapeSvgText(shortLabel)}</text>`
        : '')
    );
  }

  function getConfiguredSpots() {
    if (!(window.BT && BT.storage && BT.storage.getSetting)) return {};
    return BT.storage.getSetting('shotSpots', {}) || {};
  }

  function renderZones(cellsEl, shots) {
    if (!cellsEl) return;
    cellsEl.innerHTML = '';

    const spots = getConfiguredSpots();
    const spotKeys = Object.keys(spots).filter(k => spots[k] && typeof spots[k].x === 'number');

    if (spotKeys.length > 0) {
      // Spot-basiert: alle Wuerfe dem nächsten konfigurierten Spot zuordnen,
      // Badge an der konfigurierten Position plazieren.
      const agg = {};
      for (const k of spotKeys) agg[k] = { hits: 0, total: 0 };
      for (const s of shots) {
        let best = null, bestDist = Infinity;
        for (const k of spotKeys) {
          const sp = spots[k];
          const d = Math.hypot(s.x - sp.x, s.y - sp.y);
          if (d < bestDist) { bestDist = d; best = k; }
        }
        if (best) {
          agg[best].total++;
          if (s.made) agg[best].hits++;
        }
      }
      for (const [name, data] of Object.entries(agg)) {
        if (data.total === 0) continue;
        renderBadge(cellsEl, spots[name].x, spots[name].y, data, name);
      }
      return;
    }

    // Fallback ohne konfigurierte Spots: 8 Standard-Basketball-Zonen
    const byZone = {};
    for (const s of shots) {
      const z = zoneOf(s.x, s.y);
      if (!byZone[z]) byZone[z] = { hits: 0, total: 0 };
      byZone[z].total++;
      if (s.made) byZone[z].hits++;
    }
    for (const [zkey, data] of Object.entries(byZone)) {
      const zone = ZONES[zkey];
      if (!zone) continue;
      renderBadge(cellsEl, zone.cx, zone.cy, data, zone.label);
    }
  }

  function renderShots(cellsEl, shots) {
    if (!cellsEl) return;
    cellsEl.innerHTML = '';
    for (const s of shots) {
      if (s.made) {
        cellsEl.insertAdjacentHTML('beforeend',
          `<circle cx="${s.x}" cy="${s.y}" r="5" fill="rgba(0,140,60,0.7)" stroke="#004b2b" stroke-width="1"/>`);
      } else {
        const x = s.x, y = s.y, r = 4;
        cellsEl.insertAdjacentHTML('beforeend',
          `<line x1="${x-r}" y1="${y-r}" x2="${x+r}" y2="${y+r}" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>` +
          `<line x1="${x-r}" y1="${y+r}" x2="${x+r}" y2="${y-r}" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>`
        );
      }
    }
  }

  return { ZONES, zoneOf, renderZones, renderShots };
})();
