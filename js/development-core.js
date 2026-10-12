(function () {
  window.BT = window.BT || {};

  BT.developmentCore = (function () {
    const TAXONOMY = Object.freeze({
      technique: Object.freeze(['ball-control', 'passing', 'footwork', 'shooting', 'finishing']),
      decision: Object.freeze(['scanning', 'advantage-read', 'pass-read', 'shot-selection', 'turnover-control']),
      offense: Object.freeze(['spacing', 'cutting', 'screening', 'pnr-handler', 'pnr-screener', 'off-ball']),
      defense: Object.freeze(['on-ball', 'closeout', 'help', 'rotation', 'screen-coverage', 'transition-defense']),
      rebounding: Object.freeze(['box-out', 'pursuit', 'outlet']),
      transition: Object.freeze(['sprint-lanes', 'early-advance', 'transition-decision']),
      role: Object.freeze(['point-guard-organization', 'off-ball-guard', 'wing-role', 'big-role']),
      load: Object.freeze(['conditioning', 'recovery', 'availability'])
    });
    const STATUSES = Object.freeze(['new', 'developing', 'stable', 'achieved']);
    const SOURCE_TYPES = Object.freeze(['player-evaluation-pdf', 'atlas', 'live-game', 'video-analysis', 'coach-note']);
    const KINDS = Object.freeze(['strength', 'development']);
    const SCOPES = Object.freeze(['player', 'team']);
    const SHA256 = /^sha256:[0-9a-f]{64}$/;

    function fail(message) {
      throw new TypeError(message);
    }

    function text(value, name, maximum, required = false) {
      if (value === undefined || value === null) {
        if (required) fail(name + ' fehlt.');
        return '';
      }
      if (typeof value !== 'string') fail(name + ' muss Text sein.');
      const normalized = value.trim();
      if (required && !normalized) fail(name + ' darf nicht leer sein.');
      if (normalized.length > maximum) fail(name + ' ist zu lang.');
      return normalized;
    }

    function stringList(value, name, maximumItems, maximumLength) {
      if (value === undefined || value === null) return [];
      if (!Array.isArray(value) || value.length > maximumItems) fail(name + ' ist ungültig.');
      const result = value.map(item => text(item, name, maximumLength, true));
      return [...new Set(result)];
    }

    function dateText(value, name) {
      const normalized = text(value, name, 40, true);
      if (!Number.isFinite(Date.parse(normalized))) fail(name + ' ist kein gültiges Datum.');
      return normalized;
    }

    function priority(value, name, nullable) {
      if (nullable && (value === null || value === undefined)) return null;
      if (!Number.isInteger(value) || value < 1 || value > 5) fail(name + ' muss zwischen 1 und 5 liegen.');
      return value;
    }

    function validateFinding(finding, context = {}) {
      if (!finding || typeof finding !== 'object' || Array.isArray(finding)) fail('Ungültiger Entwicklungsbefund.');
      const scope = text(finding.scope, 'scope', 20, true);
      if (!SCOPES.includes(scope)) fail('Unbekannter Geltungsbereich.');
      const playerId = scope === 'player' ? text(finding.playerId, 'playerId', 120, true) : null;
      if (scope === 'team' && finding.playerId !== null && finding.playerId !== undefined && finding.playerId !== '') {
        fail('Teambefunde dürfen keinen Spieler referenzieren.');
      }
      const sourceGameId = text(finding.sourceGameId, 'sourceGameId', 120, true);
      const sourceType = text(finding.sourceType, 'sourceType', 60, true);
      if (!SOURCE_TYPES.includes(sourceType)) fail('Unbekannter Quellentyp.');
      const sourceHash = finding.sourceHash === null || finding.sourceHash === undefined
        ? null
        : text(finding.sourceHash, 'sourceHash', 80, true).toLowerCase();
      if (sourceType === 'player-evaluation-pdf' && !SHA256.test(sourceHash || '')) fail('PDF-Befunde benötigen einen gültigen SHA-256-Hash.');
      if (sourceType !== 'player-evaluation-pdf' && sourceHash !== null) fail('Nur PDF-Befunde dürfen einen Datei-Hash tragen.');
      const category = text(finding.category, 'category', 40, true);
      const skillKey = text(finding.skillKey, 'skillKey', 80, true);
      if (!Object.prototype.hasOwnProperty.call(TAXONOMY, category) || !TAXONOMY[category].includes(skillKey)) {
        fail('Unbekannte Kategorie oder Fähigkeit.');
      }
      const kind = text(finding.kind, 'kind', 30, true);
      if (!KINDS.includes(kind)) fail('Unbekannte Befundart.');
      const status = text(finding.status, 'status', 30, true);
      if (!STATUSES.includes(status)) fail('Unbekannter Entwicklungsstatus.');
      if (typeof finding.pinned !== 'boolean' || typeof finding.roleRelevant !== 'boolean') fail('Befundschalter müssen boolesch sein.');
      if (context.playerIds && scope === 'player' && !context.playerIds.has(playerId)) fail('Unbekannter Spieler.');
      if (context.gameIds && !context.gameIds.has(sourceGameId)) fail('Unbekanntes Ursprungsspiel.');
      const sourcePage = finding.sourcePage === null || finding.sourcePage === undefined ? null : finding.sourcePage;
      if (sourcePage !== null && (!Number.isInteger(sourcePage) || sourcePage < 1)) fail('Ungültige Quellseite.');

      return {
        ...finding,
        id: text(finding.id, 'id', 120, true),
        scope,
        playerId,
        sourceGameId,
        sourceType,
        sourceHash,
        sourceLabel: text(finding.sourceLabel, 'sourceLabel', 120),
        sourcePage,
        category,
        skillKey,
        kind,
        observation: text(finding.observation, 'observation', 500, true),
        evidenceExcerpt: text(finding.evidenceExcerpt, 'evidenceExcerpt', 400),
        evidenceRefs: stringList(finding.evidenceRefs, 'evidenceRefs', 50, 120),
        suggestedPriority: priority(finding.suggestedPriority, 'suggestedPriority', false),
        coachPriority: priority(finding.coachPriority, 'coachPriority', true),
        pinned: finding.pinned,
        roleRelevant: finding.roleRelevant,
        status,
        drillTags: stringList(finding.drillTags, 'drillTags', 10, 80),
        linkedDrillIds: stringList(finding.linkedDrillIds, 'linkedDrillIds', 30, 120),
        coachNote: text(finding.coachNote, 'coachNote', 1000),
        createdAt: dateText(finding.createdAt, 'createdAt'),
        confirmedAt: dateText(finding.confirmedAt, 'confirmedAt'),
        updatedAt: dateText(finding.updatedAt, 'updatedAt')
      };
    }

    function confirmedTime(item) {
      return Date.parse(item.confirmedAt) || 0;
    }

    function summarizeGroup(items, playerId, nowMs) {
      const newest = [...items].sort((a, b) => confirmedTime(b) - confirmedTime(a) || String(a.id).localeCompare(String(b.id)))[0];
      const distinctGames = new Set(items.map(item => item.sourceGameId));
      const effectivePriority = Math.max(...items.map(item => item.coachPriority ?? item.suggestedPriority));
      const ageDays = Math.max(0, (nowMs - confirmedTime(newest)) / 86400000);
      const roleRelevant = items.some(item => item.roleRelevant);
      const pinned = items.some(item => item.pinned);
      const recency = ageDays <= 14 ? 10 : ageDays <= 42 ? 5 : 0;
      const statusAdjustment = { new: 0, developing: -5, stable: -20 }[newest.status] || 0;
      const groupId = playerId + ':' + newest.category + ':' + newest.skillKey;
      return {
        groupId,
        playerId,
        category: newest.category,
        skillKey: newest.skillKey,
        status: newest.status,
        effectivePriority,
        distinctGameCount: distinctGames.size,
        sourceGameIds: [...distinctGames].sort(),
        roleRelevant,
        pinned,
        latestConfirmedAt: newest.confirmedAt,
        latestObservation: newest.observation,
        drillTags: [...new Set(items.flatMap(item => item.drillTags || []))].sort(),
        findingIds: items.map(item => item.id).sort(),
        score: effectivePriority * 10
          + Math.min(distinctGames.size, 3) * 5
          + recency
          + (roleRelevant ? 5 : 0)
          + (pinned ? 100 : 0)
          + statusAdjustment
      };
    }

    function profileForPlayer(findings, playerId, nowIso) {
      if (!Array.isArray(findings)) fail('Befunde müssen als Liste vorliegen.');
      const normalizedPlayerId = text(playerId, 'playerId', 120, true);
      const nowMs = Date.parse(nowIso);
      if (!Number.isFinite(nowMs)) fail('Ungültiger Profilzeitpunkt.');
      const history = findings
        .filter(item => item?.scope === 'player' && item.playerId === normalizedPlayerId && item.confirmedAt)
        .map(item => ({ ...item, evidenceRefs: [...(item.evidenceRefs || [])], drillTags: [...(item.drillTags || [])], linkedDrillIds: [...(item.linkedDrillIds || [])] }))
        .sort((a, b) => confirmedTime(b) - confirmedTime(a) || String(a.id).localeCompare(String(b.id)));
      const groups = new Map();
      for (const item of history.filter(item => item.status !== 'achieved')) {
        const key = item.category + ':' + item.skillKey;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }
      const development = [];
      const strengths = [];
      for (const items of groups.values()) {
        const summary = summarizeGroup(items, normalizedPlayerId, nowMs);
        if (items.some(item => item.kind === 'development')) development.push(summary);
        else strengths.push(summary);
      }
      const order = (a, b) => b.score - a.score
        || Date.parse(b.latestConfirmedAt) - Date.parse(a.latestConfirmedAt)
        || a.groupId.localeCompare(b.groupId);
      return {
        priorities: development.sort(order).slice(0, 3),
        strengths: strengths.sort(order),
        history
      };
    }

    function clonePlain(value) {
      return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function versionTime(item) {
      return Date.parse(item?.updatedAt || item?.confirmedAt || item?.importedAt || '') || 0;
    }

    function chooseVersion(left, right) {
      const leftTime = versionTime(left);
      const rightTime = versionTime(right);
      if (leftTime !== rightTime) return leftTime > rightTime ? left : right;
      const leftJson = JSON.stringify(left);
      const rightJson = JSON.stringify(right);
      return leftJson >= rightJson ? left : right;
    }

    function mergeVersionedById(local, remote) {
      const merged = new Map();
      for (const item of [...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])]) {
        if (!item || typeof item !== 'object' || !item.id) continue;
        const existing = merged.get(item.id);
        merged.set(item.id, existing ? chooseVersion(existing, item) : item);
      }
      return [...merged.entries()]
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
        .map(([, item]) => clonePlain(item));
    }

    function mergeDevelopmentWorkspace(local = {}, remote = {}) {
      return {
        ...clonePlain(local || {}),
        developmentFindings: mergeVersionedById(local?.developmentFindings, remote?.developmentFindings),
        developmentImportReceipts: mergeVersionedById(local?.developmentImportReceipts, remote?.developmentImportReceipts)
      };
    }

    return {
      TAXONOMY,
      STATUSES,
      validateFinding,
      profileForPlayer,
      mergeVersionedById,
      mergeDevelopmentWorkspace
    };
  })();
})();
