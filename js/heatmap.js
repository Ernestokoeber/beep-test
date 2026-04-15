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

  // Pointy-top Axial-Koordinaten (Redblobgames).
  function hexRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  function pixelToHex(x, y, R) {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / R;
    const r = (2 / 3 * y) / R;
    return hexRound(q, r);
  }

  function hexToPixel(q, r, R) {
    return {
      x: R * Math.sqrt(3) * (q + r / 2),
      y: R * 1.5 * r
    };
  }

  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      pts.push((cx + r * Math.cos(angle)).toFixed(1) + ',' + (cy + r * Math.sin(angle)).toFixed(1));
    }
    return pts.join(' ');
  }

  function renderZones(cellsEl, shots) {
    if (!cellsEl) return;
    cellsEl.innerHTML = '';
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
      const p = data.hits / data.total;
      const red = Math.round(220 * (1 - p)) + 20;
      const green = Math.round(160 * p + 60);
      const pctTxt = Math.round(p * 100) + '%';
      cellsEl.insertAdjacentHTML('beforeend',
        `<circle cx="${zone.cx}" cy="${zone.cy}" r="30" fill="rgb(${red},${green},30)" fill-opacity="0.82" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"><title>${zone.label}: ${data.hits}/${data.total} (${pctTxt})</title></circle>` +
        `<text x="${zone.cx}" y="${zone.cy - 3}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" pointer-events="none" style="paint-order:stroke;stroke:rgba(0,0,0,0.5);stroke-width:2">${pctTxt}</text>` +
        `<text x="${zone.cx}" y="${zone.cy + 12}" text-anchor="middle" font-size="10" font-weight="600" fill="#fff" pointer-events="none" style="paint-order:stroke;stroke:rgba(0,0,0,0.5);stroke-width:2">${data.hits}/${data.total}</text>`
      );
    }
  }

  function renderHexbin(cellsEl, shots, opts) {
    if (!cellsEl) return;
    cellsEl.innerHTML = '';
    const R = (opts && opts.radius) || 20;
    const bins = new Map();
    for (const s of shots) {
      const h = pixelToHex(s.x, s.y, R);
      const key = h.q + ',' + h.r;
      let bin = bins.get(key);
      if (!bin) {
        const c = hexToPixel(h.q, h.r, R);
        bin = { hits: 0, total: 0, cx: c.x, cy: c.y };
        bins.set(key, bin);
      }
      bin.total++;
      if (s.made) bin.hits++;
    }
    const values = Array.from(bins.values());
    const maxTotal = Math.max(1, ...values.map(b => b.total));

    for (const bin of values) {
      if (bin.cx < 4 || bin.cx > 496 || bin.cy < 4 || bin.cy > 466) continue;
      const p = bin.hits / bin.total;
      const hue = Math.round(p * 120);
      const sizeFactor = 0.35 + 0.65 * Math.sqrt(bin.total / maxTotal);
      const actualR = R * sizeFactor;
      const points = hexPoints(bin.cx, bin.cy, actualR);
      cellsEl.insertAdjacentHTML('beforeend',
        `<polygon points="${points}" fill="hsl(${hue},72%,48%)" fill-opacity="0.82" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"><title>${bin.hits}/${bin.total} (${Math.round(p * 100)}%)</title></polygon>`
      );
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

  return { ZONES, zoneOf, renderZones, renderHexbin, renderShots };
})();
