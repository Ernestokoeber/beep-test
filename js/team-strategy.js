window.BT = window.BT || {};

BT.teamStrategy = (function() {
  const SETTING_KEY = 'teamStrategy';
  const SCHEMA_VERSION = 1;
  const LEGACY_FOCUS = 'Horns, 5-Out, No-Middle Defense, Helpside-Kommunikation, Rebounding und Transition';
  const DEFAULT = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    name: 'PnR-Basis 2026/27',
    effectiveFrom: '2026-10-04',
    replacesPrevious: true,
    offensePrinciples: 'Pick-and-Roll als Basis: Screen eng nutzen, Roller oder Popper lesen, Reject nur bei echtem Verteidigervorteil, Re-Screen und Kick-out als Anschluss.',
    defensePrinciples: 'Mannverteidigungs-Grundlagen: Ball stoppen, zwischen Gegenspieler und Korb bleiben, früh helfen, zurückrotieren, ausboxen und Rebound sichern.',
    transitionPrinciples: 'Nach jedem Abschluss sofort reagieren: Ball stoppen, Paint schützen, Gegenspieler aufnehmen und laut kommunizieren.',
    allowedDefenseIds: ['man'],
    activeTacticIds: ['pick-and-roll', 'pick-and-pop', 'pick-and-roll-reject'],
    excludedConcepts: ['Horns', 'Horns 2', '5-Out', 'Five-Out', 'Spain Pick-and-Roll', 'Zone 2-1-2', 'Zone 2-3', 'Zone 3-2'],
    updatedAt: '2026-10-04T00:00:00.000Z'
  });

  function text(value, fallback, max = 2000) {
    const normalized = String(value ?? '').trim();
    return (normalized || fallback).slice(0, max);
  }

  function uniqueStrings(value, fallback = []) {
    const source = Array.isArray(value) ? value : fallback;
    return [...new Set(source.map(item => String(item || '').trim()).filter(Boolean))].slice(0, 80);
  }

  function normalize(input) {
    const source = input && typeof input === 'object' ? input : {};
    const allowedDefenseIds = uniqueStrings(source.allowedDefenseIds, DEFAULT.allowedDefenseIds)
      .filter(id => ['man', 'zone212', 'zone23', 'zone32'].includes(id));
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: Math.max(1, Number(source.revision) || DEFAULT.revision),
      name: text(source.name, DEFAULT.name, 120),
      effectiveFrom: /^\d{4}-\d{2}-\d{2}$/.test(String(source.effectiveFrom || '')) ? String(source.effectiveFrom) : DEFAULT.effectiveFrom,
      replacesPrevious: source.replacesPrevious !== false,
      offensePrinciples: text(source.offensePrinciples, DEFAULT.offensePrinciples),
      defensePrinciples: text(source.defensePrinciples, DEFAULT.defensePrinciples),
      transitionPrinciples: text(source.transitionPrinciples, DEFAULT.transitionPrinciples),
      allowedDefenseIds: allowedDefenseIds.length ? allowedDefenseIds : [...DEFAULT.allowedDefenseIds],
      activeTacticIds: uniqueStrings(source.activeTacticIds, DEFAULT.activeTacticIds),
      excludedConcepts: uniqueStrings(source.excludedConcepts, DEFAULT.excludedConcepts),
      updatedAt: String(source.updatedAt || DEFAULT.updatedAt)
    };
  }

  function current() {
    return normalize(BT.storage.getSetting(SETTING_KEY, DEFAULT));
  }

  function save(input) {
    const previous = current();
    const next = normalize({
      ...previous,
      ...input,
      revision: previous.revision + 1,
      updatedAt: new Date().toISOString()
    });
    BT.storage.setSetting(SETTING_KEY, next);
    return next;
  }

  function ensure() {
    const stored = BT.storage.getSetting(SETTING_KEY, null);
    if (stored?.schemaVersion === SCHEMA_VERSION) return normalize(stored);
    const next = normalize(stored || DEFAULT);
    BT.storage.setSetting(SETTING_KEY, next);
    const coachInput = BT.storage.getSetting('seasonCoachInput', null);
    if (!coachInput || !String(coachInput.focus || '').trim() || String(coachInput.focus).trim() === LEGACY_FOCUS) {
      BT.storage.setSetting('seasonCoachInput', {
        ...(coachInput || {}),
        focus: 'Pick-and-Roll-Basis, Screen-Nutzung, Roller/Popper lesen, Passentscheidungen und Spieltransfer'
      });
    }
    return next;
  }

  function tacticCandidates() {
    const templates = (BT.tactics?.templates?.() || []).map(item => item.board).filter(Boolean);
    const stored = BT.storage?.getTactics?.() || [];
    const merged = new Map();
    [...templates, ...stored].forEach(tactic => {
      const id = String(tactic?.id || '');
      if (id) merged.set(id, tactic);
    });
    return [...merged.values()];
  }

  function activeTactics(strategyInput = current()) {
    const strategy = normalize(strategyInput);
    const active = new Set(strategy.activeTacticIds);
    return tacticCandidates().filter(tactic => active.has(String(tactic.id)) && tactic.archived !== true);
  }

  function tacticSummaries(strategyInput = current()) {
    return activeTactics(strategyInput).map(item => ({
      id: String(item.id),
      title: String(item.title || '').slice(0, 200),
      usage: String(item.usage || item.category || '').toLowerCase().includes('defen') ? 'defense' : 'offense',
      description: String(item.description || '').slice(0, 600),
      playbook: String(item.playbook || 'Aktives Teamkonzept').slice(0, 80),
      coachingPoints: (Array.isArray(item.coachingPoints) ? item.coachingPoints : []).slice(0, 12),
      reads: (Array.isArray(item.reads) ? item.reads : []).slice(0, 12)
    }));
  }

  function forAI(strategyInput = current()) {
    const strategy = normalize(strategyInput);
    return {
      schemaVersion: strategy.schemaVersion,
      revision: strategy.revision,
      name: strategy.name,
      effectiveFrom: strategy.effectiveFrom,
      replacesPrevious: strategy.replacesPrevious,
      offensePrinciples: strategy.offensePrinciples,
      defensePrinciples: strategy.defensePrinciples,
      transitionPrinciples: strategy.transitionPrinciples,
      allowedDefenseIds: strategy.allowedDefenseIds,
      activeTacticIds: strategy.activeTacticIds,
      excludedConcepts: strategy.excludedConcepts,
      precedenceRule: 'Dieses Teamkonzept ist verbindlich und ersetzt bei Widerspruch alle älteren Schwerpunkte, Trainingsdaten, Taktiknamen und Vorschläge.'
    };
  }

  return { DEFAULT, LEGACY_FOCUS, normalize, current, save, ensure, activeTactics, tacticSummaries, forAI, tacticCandidates };
})();
