window.BT = window.BT || {};

// Basketball-spezifische Auswertung fuer Yo-Yo IR1 und Léger
// Quellen: Bangsbo (Yo-Yo IR1 VO2max), Castagna et al. (Basketball Yo-Yo Norms),
// Léger-Lambert (Léger VO2max via Endgeschwindigkeit).
BT.ratings = (function() {

  const YOYO_TIERS = [
    { min: 0,    max: 400,  tier: 1, label: 'Einsteiger' },
    { min: 400,  max: 1000, tier: 2, label: 'Freizeit' },
    { min: 1000, max: 1440, tier: 3, label: 'Amateur' },
    { min: 1440, max: 1880, tier: 4, label: 'Fortgeschritten' },
    { min: 1880, max: 2240, tier: 5, label: 'Profi' },
    { min: 2240, max: Infinity, tier: 6, label: 'Elite' }
  ];

  const LEGER_TIERS = [
    { min: 0,    max: 4,  tier: 1, label: 'Einsteiger' },
    { min: 4,   max: 6,  tier: 2, label: 'Freizeit' },
    { min: 6,   max: 9,  tier: 3, label: 'Amateur' },
    { min: 9,   max: 11, tier: 4, label: 'Fortgeschritten' },
    { min: 11,  max: 13, tier: 5, label: 'Profi' },
    { min: 13,  max: 99, tier: 6, label: 'Elite' }
  ];

  function findTier(tiers, value) {
    return tiers.find(t => value >= t.min && value < t.max) || tiers[tiers.length - 1];
  }

  function yoyoRating(meters) {
    const t = findTier(YOYO_TIERS, meters || 0);
    return { tier: t.tier, label: t.label };
  }

  function yoyoVO2max(meters) {
    return (meters || 0) * 0.0084 + 36.4;
  }

  function legerRating(level) {
    const t = findTier(LEGER_TIERS, level || 0);
    return { tier: t.tier, label: t.label };
  }

  function legerVO2max(level) {
    const l = BT.levels.get(level, 'leger');
    if (!l) return 0;
    return -27.4 + 6.0 * l.speedKmh;
  }

  function rateResult(session, result) {
    const testType = session.testType || 'leger';
    const distanceM = session.distanceM || 20;
    if (testType === 'yoyoIR1') {
      const meters = (result.totalShuttles || 0) * distanceM;
      const r = yoyoRating(meters);
      return {
        tier: r.tier,
        label: r.label,
        vo2max: yoyoVO2max(meters),
        meters
      };
    }
    const r = legerRating(result.level);
    return {
      tier: r.tier,
      label: r.label,
      vo2max: legerVO2max(result.level),
      meters: (result.totalShuttles || 0) * distanceM
    };
  }

  return { yoyoRating, yoyoVO2max, legerRating, legerVO2max, rateResult, YOYO_TIERS, LEGER_TIERS };
})();
