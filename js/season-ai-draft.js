window.BT = window.BT || {};

BT.seasonDraft = (function() {
  const PREFIX = 'courthub_ai_season_draft_v1:';
  const VERSION = 5;
  const MODEL = 'gemini-3.8-flash';

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined) result[key] = stableValue(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  function fingerprint(payload) {
    return fnv1a(JSON.stringify(stableValue({ version: VERSION, model: MODEL, payload })));
  }

  function key(scope) {
    return PREFIX + String(scope || 'default').trim();
  }

  function clear(scope) {
    try { localStorage.removeItem(key(scope)); } catch { /* Lokaler Speicher kann blockiert sein. */ }
  }

  function load(scope, expectedFingerprint) {
    let draft;
    try {
      const raw = localStorage.getItem(key(scope));
      if (!raw) return null;
      draft = JSON.parse(raw);
    } catch {
      clear(scope);
      return null;
    }
    const valid = draft?.version === VERSION &&
      draft?.model === MODEL &&
      draft?.fingerprint === expectedFingerprint &&
      Array.isArray(draft.completed);
    if (!valid) {
      clear(scope);
      return null;
    }
    return draft;
  }

  function save(scope, input) {
    const now = new Date().toISOString();
    const completed = Array.isArray(input?.completed) ? input.completed.map((block) => ({
      index: Number(block.index),
      dates: Array.isArray(block.dates) ? block.dates.map(String) : [],
      trainings: Array.isArray(block.trainings) ? block.trainings : []
    })) : [];
    const draft = {
      version: VERSION,
      model: MODEL,
      fingerprint: String(input?.fingerprint || ''),
      completed,
      nextIndex: Number.isInteger(input?.nextIndex) ? input.nextIndex : completed.length,
      createdAt: input?.createdAt || now,
      updatedAt: now
    };
    try { localStorage.setItem(key(scope), JSON.stringify(draft)); } catch { /* Fortsetzung bleibt optional. */ }
    return draft;
  }

  return { VERSION, MODEL, fingerprint, load, save, clear };
})();

