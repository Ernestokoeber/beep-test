function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function label(step, id, core) {
  return core.elementById(step, id)?.role || id || '?';
}

export function recordedActions(step, core) {
  const transition = step?.transition || {};
  return [
    ...(Array.isArray(transition.motions) ? transition.motions : []),
    ...(Array.isArray(transition.passes) ? transition.passes : []),
    ...(Array.isArray(transition.screens) ? transition.screens : [])
  ].sort((left, right) =>
    number(left.start) - number(right.start)
      || number(left.duration) - number(right.duration)
  );
}

export function phaseDuration(step, core) {
  return recordedActions(step, core).reduce(
    (longest, action) => Math.max(
      longest,
      Math.max(0, number(action.start)) + Math.max(0, number(action.duration))
    ),
    0
  );
}

export function applyPhaseTiming(step, core) {
  const longest = phaseDuration(step, core);
  if (longest > 0) step.duration = core.clamp(longest + 0.15, 0.3, 10);
  else step.duration = core.clamp(number(step.duration, 0.8), 0.3, 10);
  return step;
}

export function describeRecordedAction(step, action, core) {
  if (action?.type === 'pass') {
    return `${label(step, action.fromId, core)} passt zu ${label(step, action.toId, core)}`;
  }
  if (action?.type === 'screen') {
    const screener = label(step, action.elementId, core);
    return action.beneficiaryId
      ? `${screener} stellt einen Screen für ${label(step, action.beneficiaryId, core)}`
      : `${screener} stellt einen Screen`;
  }
  if (action?.type === 'move') {
    const player = label(step, action.elementId, core);
    if (action.groupType === 'pick-and-roll' && action.groupRole === 'roll') {
      return `${player} rollt zum Korb`;
    }
    if (action.groupType === 'pick-and-roll' && action.groupRole === 'handler') {
      return `${player} nutzt den Screen`;
    }
    return action.kind === 'dribble'
      ? `${player} dribbelt zum Ziel`
      : `${player} läuft zum Ziel`;
  }
  return 'Aktion';
}

export function normalizeRecordedBoard(boardInput, core) {
  const board = core.normalizeBoard(boardInput);
  const sourceSteps = Array.isArray(boardInput?.steps) ? boardInput.steps : [];
  board.steps = board.steps.map((source, phaseIndex) => {
    const step = core.copy(source);
    const rawStep = sourceSteps[phaseIndex] || {};
    step.phaseId = String(rawStep.phaseId || core.uid('phase_'));
    step.instruction = String(rawStep.instruction ?? step.instruction ?? '').slice(0, 2000);
    if (rawStep.thumbnailVersion) {
      step.thumbnailVersion = String(rawStep.thumbnailVersion).slice(0, 64);
    }
    const transition = core.normalizeTransition(step.transition);
    const rawTransition = rawStep.transition || {};
    const relation = phaseIndex === 0 ? 'after' : 'after';
    const rawById = list => new Map((Array.isArray(list) ? list : []).map(item => [String(item.id || ''), item]));
    const rawMotions = rawById(rawTransition.motions);
    const rawPasses = rawById(rawTransition.passes);
    const rawScreens = rawById(rawTransition.screens);
    transition.motions = transition.motions.map(action => {
      const raw = rawMotions.get(action.id) || {};
      return {
        ...action,
        relation: raw.relation || relation,
        kind: raw.kind === 'dribble' ? 'dribble' : 'run',
        ...(raw.groupId ? { groupId: String(raw.groupId) } : {}),
        ...(raw.groupType ? { groupType: String(raw.groupType) } : {}),
        ...(raw.groupRole ? { groupRole: String(raw.groupRole) } : {})
      };
    });
    transition.passes = transition.passes.map(action => {
      const raw = rawPasses.get(action.id) || {};
      return {
        ...action,
        relation: raw.relation || relation,
        ...(raw.groupId ? { groupId: String(raw.groupId) } : {}),
        ...(raw.groupType ? { groupType: String(raw.groupType) } : {})
      };
    });
    transition.screens = transition.screens.map(action => {
      const raw = rawScreens.get(action.id) || {};
      return {
        ...action,
        relation: raw.relation || relation,
        ...(raw.beneficiaryId ? { beneficiaryId: String(raw.beneficiaryId) } : {}),
        ...(raw.targetDefenderId ? { targetDefenderId: String(raw.targetDefenderId) } : {}),
        ...(raw.groupId ? { groupId: String(raw.groupId) } : {}),
        ...(raw.groupType ? { groupType: String(raw.groupType) } : {})
      };
    });
    step.transition = transition;
    return step;
  });
  return board;
}

export function removeRecordedAction(boardInput, stepIndex, actionId, scope = 'single', core) {
  const board = normalizeRecordedBoard(boardInput, core);
  const step = board.steps[Math.max(0, Math.floor(number(stepIndex)))];
  if (!step) return board;

  const target = recordedActions(step, core).find(action => action.id === actionId);
  if (!target) return board;
  const removeGroup = scope === 'group' && target.groupId;
  const shouldRemove = action => removeGroup
    ? action.groupId === target.groupId
    : action.id === target.id;

  const transition = step.transition || core.emptyTransition();
  transition.motions = (transition.motions || []).filter(action => !shouldRemove(action));
  transition.passes = (transition.passes || []).filter(action => !shouldRemove(action));
  transition.screens = (transition.screens || []).filter(action => !shouldRemove(action));
  step.transition = transition;
  applyPhaseTiming(step, core);
  return normalizeRecordedBoard(board, core);
}
