import {
  actionEnd,
  actionState,
  fitActionTiming,
  fitTransitionTiming,
  locateBoardTime
} from './timing-core.js';

const tactics = window.BT?.tactics;
const core = tactics?.__core;

if (tactics && core && !tactics.__timingFixApplied) {
  const original = {
    normalizeBoard: core.normalizeBoard,
    normalizeStep: core.normalizeStep,
    normalizeTransition: core.normalizeTransition
  };

  function fitStep(stepInput) {
    const step = stepInput && typeof stepInput === 'object' ? core.copy(stepInput) : {};
    step.duration = core.clamp(core.number(step.duration, 1.8), 0.3, 10);
    step.transition = fitTransitionTiming(
      original.normalizeTransition(step.transition),
      step.duration
    );
    return step;
  }

  function normalizeStep(raw, index) {
    return fitStep(original.normalizeStep(raw, index));
  }

  function normalizeBoard(input) {
    const board = original.normalizeBoard(input);
    board.steps = board.steps.map(fitStep);
    board.currentStep = core.clamp(
      Math.floor(core.number(board.currentStep, 0)),
      0,
      Math.max(0, board.steps.length - 1)
    );
    return board;
  }

  function boardDuration(boardInput) {
    return normalizeBoard(boardInput).steps.reduce((sum, step) => sum + step.duration, 0);
  }

  function stepStartTime(boardInput, indexInput) {
    const board = normalizeBoard(boardInput);
    const index = core.clamp(Math.floor(core.number(indexInput, 0)), 0, board.steps.length);
    let total = 0;
    for (let current = 0; current < index; current += 1) total += board.steps[current].duration;
    return total;
  }

  function locateTime(boardInput, timeInput) {
    const board = normalizeBoard(boardInput);
    return locateBoardTime(board.steps, timeInput);
  }

  function transitionFor(step) {
    return fitTransitionTiming(
      original.normalizeTransition(step?.transition),
      core.number(step?.duration, 1.8)
    );
  }

  function positionDuring(from, to, elementId, elapsedInput) {
    const source = core.elementById(from, elementId);
    const target = to && core.elementById(to, elementId);
    const transition = transitionFor(from);
    const motion = transition.motions.find(action => action.elementId === elementId);
    const sourcePoint = source ? core.point(source) : null;
    const targetPoint = target ? core.point(target) : null;

    if (!motion) return sourcePoint || targetPoint;

    const path = motion.path.length >= 2
      ? motion.path.map(core.point)
      : [sourcePoint, targetPoint].filter(Boolean);
    if (!path.length) return sourcePoint || targetPoint;
    if (path.length === 1) return path[0];

    const elapsed = Math.max(0, core.number(elapsedInput, 0));
    if (elapsed < motion.start) return sourcePoint || path[0];
    const ratio = core.clamp((elapsed - motion.start) / motion.duration, 0, 1);
    return core.pointOnPath(path, ratio);
  }

  function interpolateStep(from, to, ratio, elapsedOverride) {
    const elapsed = elapsedOverride == null
      ? core.clamp(core.number(ratio, 0), 0, 1) * core.number(from?.duration, 1)
      : Math.max(0, core.number(elapsedOverride, 0));
    const output = core.copy(from);
    const transition = transitionFor(from);
    const movedIds = new Set(transition.motions.map(action => action.elementId));

    output.elements = core.elements(from).map(element => {
      const animatedToken = element.type === 'offense'
        || element.type === 'defense'
        || (element.type === 'ball' && movedIds.has(element.id));
      if (!animatedToken) return core.copy(element);
      const position = positionDuring(from, to, element.id, elapsed);
      return position ? { ...core.copy(element), ...position } : core.copy(element);
    });
    return output;
  }

  function playerBallPoint(stepFrom, stepTo, playerId, elapsed) {
    const fallbackElement = core.elementById(stepFrom, playerId)
      || core.elementById(stepTo, playerId);
    const fallback = fallbackElement ? core.point(fallbackElement) : null;
    const player = positionDuring(stepFrom, stepTo, playerId, elapsed) || fallback;
    return player ? { x: player.x + 16, y: player.y } : null;
  }

  function snapshotAt(boardInput, timeInput) {
    const board = normalizeBoard(boardInput);
    const location = locateBoardTime(board.steps, timeInput);
    const from = board.steps[location.index];
    const to = board.steps[location.index + 1] || null;
    const snapshot = interpolateStep(from, to, location.ratio, location.elapsed);
    snapshot._timeline = location;
    snapshot._sourceStep = from;
    snapshot._targetStep = to;

    const transition = transitionFor(from);
    const passes = [...transition.passes].sort((left, right) =>
      left.start - right.start || left.duration - right.duration
    );
    const activePass = passes
      .filter(pass => actionState(pass, location.elapsed) === 'active')
      .sort((left, right) => right.start - left.start)[0] || null;
    const completedPass = passes
      .filter(pass => actionState(pass, location.elapsed) === 'complete')
      .sort((left, right) => actionEnd(right) - actionEnd(left))[0] || null;
    const ball = core.elementById(snapshot, 'ball') || core.elements(snapshot, 'ball')[0];
    const sourceBall = core.elementById(from, 'ball') || core.elements(from, 'ball')[0];
    const explicitBallMotion = transition.motions.some(action => action.elementId === ball?.id);

    if (ball && activePass) {
      const start = playerBallPoint(from, to || from, activePass.fromId, activePass.start)
        || (sourceBall ? core.point(sourceBall) : null);
      const end = playerBallPoint(
        from,
        to || from,
        activePass.toId,
        Math.min(from.duration, actionEnd(activePass))
      );
      if (start && end) {
        Object.assign(
          ball,
          core.quadraticPoint(
            start,
            end,
            activePass.curve,
            core.clamp((location.elapsed - activePass.start) / activePass.duration, 0, 1)
          )
        );
      }
    } else if (ball && completedPass) {
      const receiver = playerBallPoint(from, to || from, completedPass.toId, location.elapsed);
      if (receiver) Object.assign(ball, receiver);
    } else if (ball && !explicitBallMotion && sourceBall) {
      Object.assign(ball, core.point(sourceBall));
    }

    snapshot._activeScreens = transition.screens.filter(
      screen => actionState(screen, location.elapsed) === 'active'
    );
    snapshot._actionStates = Object.fromEntries(
      [
        ...transition.motions,
        ...transition.passes,
        ...transition.screens
      ].map(action => [action.id, actionState(action, location.elapsed)])
    );
    return snapshot;
  }

  core.normalizeStep = normalizeStep;
  core.normalizeBoard = normalizeBoard;
  core.boardDuration = boardDuration;
  core.stepStartTime = stepStartTime;
  core.locateTime = locateTime;
  core.positionDuring = positionDuring;
  core.interpolateStep = interpolateStep;
  core.snapshotAt = snapshotAt;
  core.fitActionTiming = fitActionTiming;
  core.fitStepTiming = fitStep;
  core.actionEnd = actionEnd;
  core.actionState = actionState;

  tactics.normalizeBoard = normalizeBoard;
  tactics.boardDuration = boardDuration;
  tactics.interpolateStep = interpolateStep;
  tactics.snapshotAt = snapshotAt;
  tactics.__timingFixApplied = true;
}
