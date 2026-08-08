import {
  applyPhaseTiming,
  normalizeRecordedBoard,
  recordedActions
} from './phase-recorder-core.js';

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function pathLength(points = []) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(
      numeric(points[index].x) - numeric(points[index - 1].x),
      numeric(points[index].y) - numeric(points[index - 1].y)
    );
  }
  return total;
}

export function autoMoveDuration(points = []) {
  return Math.max(0.65, Math.min(3.2, 0.45 + pathLength(points) / 145));
}

export function autoPassDuration(from, to) {
  const distance = Math.hypot(
    numeric(to?.x) - numeric(from?.x),
    numeric(to?.y) - numeric(from?.y)
  );
  return Math.max(0.28, Math.min(0.72, 0.24 + distance / 780));
}

export function stepActions(step, core) {
  return recordedActions(step, core);
}

export function hasStepActions(step, core) {
  return stepActions(step, core).length > 0;
}

function ensureNextStep(board, index, core) {
  if (!board.steps[index + 1]) board.steps.push(core.cloneStep(board.steps[index]));
  return board.steps[index + 1];
}

export function prepareQuickAction(boardInput, indexInput, relation, core) {
  const board = normalizeRecordedBoard(boardInput, core);
  let index = core.clamp(
    Math.floor(core.number(indexInput, board.currentStep || 0)),
    0,
    Math.max(0, board.steps.length - 1)
  );

  if (relation === 'after' && hasStepActions(board.steps[index], core)) {
    ensureNextStep(board, index, core);
    index += 1;
  }

  ensureNextStep(board, index, core);
  board.currentStep = index;
  return {
    board,
    index,
    step: board.steps[index],
    next: board.steps[index + 1]
  };
}

function fitStepDuration(step, actionEnd, hadActions, core) {
  applyPhaseTiming(step, core);
  return step.duration;
}

function cleanPath(source, points, core) {
  const output = [core.point(source)];
  (Array.isArray(points) ? points : []).forEach(point => {
    const normalized = core.point(point);
    if (core.distance(output.at(-1), normalized) >= 7) output.push(normalized);
  });
  return output.slice(0, 80);
}

function transitionFor(step) {
  const source = step?.transition || {};
  return {
    motions: Array.isArray(source.motions) ? source.motions : [],
    passes: Array.isArray(source.passes) ? source.passes : [],
    screens: Array.isArray(source.screens) ? source.screens : []
  };
}

export function addQuickMove(boardInput, options, core) {
  const prepared = prepareQuickAction(
    boardInput,
    options?.stepIndex,
    options?.relation || 'after',
    core
  );
  const { board, step, next, index } = prepared;
  const actor = core.elementById(step, options?.actorId);
  const target = core.elementById(next, options?.actorId);
  if (!actor || !target || !['offense', 'defense'].includes(actor.type)) {
    throw new Error('Für den Laufweg wurde kein gültiger Spieler gewählt.');
  }

  const hadActions = hasStepActions(step, core);
  const path = cleanPath(actor, options?.path, core);
  if (path.length < 2) throw new Error('Der Laufweg ist zu kurz.');
  const duration = autoMoveDuration(path);
  const ball = core.elementById(step, 'ball');
  const kind = actor.type === 'offense' && ball && core.distance(actor, ball) <= 34
    ? 'dribble'
    : 'run';
  Object.assign(target, path.at(-1));

  step.transition = transitionFor(step);
  step.transition.motions = step.transition.motions.filter(
    action => action.elementId !== actor.id
  );
  step.transition.motions.push({
    id: core.uid('motion_'),
    type: 'move',
    elementId: actor.id,
    relation: options?.relation === 'same' ? 'simultaneous' : 'after',
    kind,
    start: 0,
    duration,
    path
  });
  fitStepDuration(step, duration, hadActions, core);
  board.currentStep = index;
  return normalizeRecordedBoard(board, core);
}

export function addQuickPass(boardInput, options, core) {
  const prepared = prepareQuickAction(
    boardInput,
    options?.stepIndex,
    options?.relation || 'after',
    core
  );
  const { board, step, next, index } = prepared;
  const from = core.elementById(step, options?.fromId);
  const to = core.elementById(step, options?.toId);
  const nextReceiver = core.elementById(next, options?.toId);
  const nextBall = core.elementById(next, 'ball');
  if (!from || !to || from.id === to.id || from.type !== 'offense' || to.type !== 'offense') {
    throw new Error('Bitte Passgeber und einen anderen Angreifer als Empfänger wählen.');
  }

  const hadActions = hasStepActions(step, core);
  const duration = autoPassDuration(from, to);
  const start = options?.relation === 'same' ? 0 : 0.08;
  step.transition = transitionFor(step);
  step.transition.passes.push({
    id: core.uid('pass_'),
    type: 'pass',
    fromId: from.id,
    toId: to.id,
    relation: options?.relation === 'same' ? 'simultaneous' : 'after',
    start,
    duration,
    curve: numeric(options?.curve, -36)
  });
  if (nextReceiver && nextBall) {
    Object.assign(nextBall, core.ballPointForPlayer(nextReceiver));
  }
  fitStepDuration(step, start + duration, hadActions, core);
  board.currentStep = index;
  return normalizeRecordedBoard(board, core);
}

export function addQuickScreen(boardInput, options, core) {
  const prepared = prepareQuickAction(
    boardInput,
    options?.stepIndex,
    options?.relation || 'after',
    core
  );
  const { board, step, next, index } = prepared;
  const actor = core.elementById(step, options?.actorId);
  const nextActor = core.elementById(next, options?.actorId);
  if (!actor || !nextActor || actor.type !== 'offense') {
    throw new Error('Bitte einen Angreifer als Screensteller wählen.');
  }

  const point = core.point(options?.point);
  const hadActions = hasStepActions(step, core);
  const distance = core.distance(actor, point);
  let screenStart = 0;
  step.transition = transitionFor(step);

  if (distance > 18 && !step.transition.motions.some(action => action.elementId === actor.id)) {
    const path = [core.point(actor), point];
    const moveDuration = autoMoveDuration(path);
    Object.assign(nextActor, point);
    step.transition.motions.push({
      id: core.uid('motion_'),
      type: 'move',
      elementId: actor.id,
      relation: options?.relation === 'same' ? 'simultaneous' : 'after',
      kind: 'run',
      start: 0,
      duration: moveDuration,
      path
    });
    screenStart = Math.max(0, moveDuration - 0.18);
  }

  const duration = 0.9;
  step.transition.screens.push({
    id: core.uid('screen_'),
    type: 'screen',
    elementId: actor.id,
    relation: options?.relation === 'same' ? 'simultaneous' : 'after',
    ...(options?.beneficiaryId ? { beneficiaryId: String(options.beneficiaryId) } : {}),
    ...(options?.targetDefenderId ? { targetDefenderId: String(options.targetDefenderId) } : {}),
    start: screenStart,
    duration,
    x: point.x,
    y: point.y,
    angle: numeric(options?.angle, 0)
  });
  fitStepDuration(step, screenStart + duration, hadActions, core);
  board.currentStep = index;
  return normalizeRecordedBoard(board, core);
}

export function addQuickPickAndRoll(boardInput, options, core) {
  const prepared = prepareQuickAction(
    boardInput,
    options?.stepIndex,
    options?.relation || 'after',
    core
  );
  const { board, step, next, index } = prepared;
  const handler = core.elementById(step, options?.handlerId);
  const screener = core.elementById(step, options?.screenerId);
  const nextHandler = core.elementById(next, options?.handlerId);
  const nextScreener = core.elementById(next, options?.screenerId);
  if (!handler || !screener || handler.id === screener.id
    || handler.type !== 'offense' || screener.type !== 'offense') {
    throw new Error('Bitte Ballführer und einen anderen Angreifer als Screensteller wählen.');
  }

  const handlerPath = cleanPath(handler, options?.handlerPath, core);
  const screenPoint = core.point(options?.screenPoint);
  const rollPath = cleanPath(screenPoint, options?.rollPath, core);
  if (handlerPath.length < 2) throw new Error('Der Weg des Ballführers ist zu kurz.');
  if (rollPath.length < 2) throw new Error('Der Rollweg des Screenstellers ist zu kurz.');

  const groupId = core.uid('pnr_');
  const relation = options?.relation === 'same' ? 'simultaneous' : 'after';
  const handlerDuration = autoMoveDuration(handlerPath);
  const screenerPath = cleanPath(screener, [screenPoint, ...rollPath.slice(1)], core);
  const rollDuration = autoMoveDuration(screenerPath);
  const screenStart = Math.min(0.65, Math.max(0.18, rollDuration * 0.28));
  const screenDuration = Math.min(0.8, Math.max(0.45, rollDuration * 0.38));
  const targetDefenderId = options?.targetDefenderId
    ? String(options.targetDefenderId)
    : undefined;

  step.transition = transitionFor(step);
  step.transition.motions = step.transition.motions.filter(action =>
    action.elementId !== handler.id && action.elementId !== screener.id
  );
  step.transition.motions.push({
    id: core.uid('motion_'), type: 'move', elementId: handler.id,
    relation, kind: 'dribble', groupId, groupType: 'pick-and-roll', groupRole: 'handler',
    start: 0, duration: handlerDuration, path: handlerPath
  });
  step.transition.motions.push({
    id: core.uid('motion_'), type: 'move', elementId: screener.id,
    relation, kind: 'run', groupId, groupType: 'pick-and-roll', groupRole: 'roll',
    start: 0, duration: rollDuration, path: screenerPath
  });
  step.transition.screens.push({
    id: core.uid('screen_'), type: 'screen', elementId: screener.id,
    beneficiaryId: handler.id,
    ...(targetDefenderId ? { targetDefenderId } : {}),
    relation, groupId, groupType: 'pick-and-roll',
    start: screenStart, duration: screenDuration,
    x: screenPoint.x, y: screenPoint.y,
    angle: numeric(options?.angle, 0)
  });
  Object.assign(nextHandler, handlerPath.at(-1));
  Object.assign(nextScreener, screenerPath.at(-1));
  applyPhaseTiming(step, core);
  board.currentStep = index;
  return normalizeRecordedBoard(board, core);
}

export function addQuickPause(boardInput, options, core) {
  const board = normalizeRecordedBoard(boardInput, core);
  let index = core.clamp(
    Math.floor(core.number(options?.stepIndex, board.currentStep || 0)),
    0,
    Math.max(0, board.steps.length - 1)
  );
  if (hasStepActions(board.steps[index], core)) {
    ensureNextStep(board, index, core);
    index += 1;
  }
  const step = board.steps[index];
  ensureNextStep(board, index, core);
  step.transition = core.emptyTransition();
  step.duration = core.clamp(core.number(options?.duration, 0.8), 0.3, 5);
  board.currentStep = index;
  return normalizeRecordedBoard(board, core);
}

export function quickStepLabel(step, core) {
  const actions = stepActions(step, core);
  if (!actions.length) return 'Pause';
  return actions.map(action => {
    if (action.type === 'move') {
      const player = core.elementById(step, action.elementId);
      const ball = core.elementById(step, 'ball');
      const isCarrier = player?.type === 'offense' && ball && core.distance(player, ball) <= 34;
      return `${isCarrier ? 'Dribbling' : 'Lauf'} ${player?.role || 'Spieler'}`;
    }
    if (action.type === 'pass') {
      return `Pass ${core.elementById(step, action.fromId)?.role || '?'} → ${core.elementById(step, action.toId)?.role || '?'}`;
    }
    return `Screen ${core.elementById(step, action.elementId)?.role || 'Spieler'}`;
  }).join(' + ');
}
