import {
  actionEnd,
  actionState,
  fitActionTiming,
  fitTransitionTiming,
  locateBoardTime
} from './timing-core.js';

const tactics = window.BT?.tactics;
const core = tactics?.__core;
const BALL_CONTROL_RADIUS = 38;

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

  function ballElement(step) {
    return core.elementById(step, 'ball') || core.elements(step, 'ball')[0] || null;
  }

  function ensureBall(step) {
    let ball = ballElement(step);
    if (!ball) {
      ball = { id: 'ball', type: 'ball', x: 250, y: 388 };
      step.elements = Array.isArray(step.elements) ? step.elements : [];
      step.elements.push(ball);
    }
    return ball;
  }

  function ballCarrierForStep(step, transitionInput) {
    const ball = ballElement(step);
    if (!ball) return null;
    const transition = transitionInput || fitTransitionTiming(
      original.normalizeTransition(step?.transition),
      core.number(step?.duration, 1.8)
    );

    let best = null;
    transition.motions.forEach(motion => {
      if (motion.elementId === ball.id) return;
      const player = core.elementById(step, motion.elementId);
      if (!player || player.type !== 'offense') return;
      const distance = core.distance(player, ball);
      if (distance > BALL_CONTROL_RADIUS) return;
      if (!best || distance < best.distance) {
        best = {
          elementId: player.id,
          motion,
          distance,
          offset: {
            x: ball.x - player.x,
            y: ball.y - player.y
          }
        };
      }
    });
    return best;
  }

  function motionEndPoint(stepFrom, stepTo, motion) {
    const target = core.elementById(stepTo, motion.elementId);
    if (target) return core.point(target);
    const lastPathPoint = motion.path?.at(-1);
    if (lastPathPoint) return core.point(lastPathPoint);
    const source = core.elementById(stepFrom, motion.elementId);
    return source ? core.point(source) : null;
  }

  function propagateBallState(board) {
    for (let index = 0; index < board.steps.length - 1; index += 1) {
      const from = board.steps[index];
      const to = board.steps[index + 1];
      const transition = from.transition;
      const targetBall = ensureBall(to);

      const lastPass = [...transition.passes]
        .filter(pass => actionEnd(pass) <= from.duration + 1e-9)
        .sort((left, right) => actionEnd(right) - actionEnd(left))[0] || null;
      if (lastPass) {
        const receiver = core.elementById(to, lastPass.toId)
          || core.elementById(from, lastPass.toId);
        if (receiver) Object.assign(targetBall, core.ballPointForPlayer(receiver));
        continue;
      }

      const explicitBallMotion = transition.motions.find(motion => motion.elementId === targetBall.id);
      if (explicitBallMotion) {
        const end = motionEndPoint(from, to, explicitBallMotion);
        if (end) Object.assign(targetBall, end);
        continue;
      }

      const carrier = ballCarrierForStep(from, transition);
      if (!carrier) continue;
      const playerEnd = motionEndPoint(from, to, carrier.motion);
      if (playerEnd) {
        Object.assign(targetBall, {
          x: core.clampX(playerEnd.x + carrier.offset.x),
          y: core.clampY(playerEnd.y + carrier.offset.y)
        });
      }
    }
    return board;
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
    return propagateBallState(board);
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
    return player ? core.ballPointForPlayer(player) : null;
  }

  function carrierBallPoint(stepFrom, stepTo, carrier, elapsed) {
    if (!carrier) return null;
    const player = positionDuring(stepFrom, stepTo, carrier.elementId, elapsed);
    if (!player) return null;
    return {
      x: core.clampX(player.x + carrier.offset.x),
      y: core.clampY(player.y + carrier.offset.y)
    };
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
    const ball = ballElement(snapshot);
    const sourceBall = ballElement(from);
    const explicitBallMotion = transition.motions.some(action => action.elementId === ball?.id);
    const carrier = explicitBallMotion ? null : ballCarrierForStep(from, transition);

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
    } else if (ball && carrier) {
      const carried = carrierBallPoint(from, to || from, carrier, location.elapsed);
      if (carried) Object.assign(ball, carried);
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
    snapshot._ballCarrierId = carrier?.elementId || null;
    return snapshot;
  }

  function publicBallCarrierForStep(stepInput) {
    const step = fitStep(stepInput);
    const carrier = ballCarrierForStep(step, step.transition);
    return carrier ? core.copy(carrier) : null;
  }

  function isBallCarrierAction(stepInput, action) {
    if (!action || action.type !== 'move') return false;
    return publicBallCarrierForStep(stepInput)?.elementId === action.elementId;
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
  core.ballCarrierForStep = publicBallCarrierForStep;
  core.isBallCarrierAction = isBallCarrierAction;

  tactics.normalizeBoard = normalizeBoard;
  tactics.boardDuration = boardDuration;
  tactics.interpolateStep = interpolateStep;
  tactics.snapshotAt = snapshotAt;
  tactics.__timingFixApplied = true;
}
