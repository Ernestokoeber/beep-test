const MIN_DURATION = Object.freeze({
  move: 0.15,
  pass: 0.12,
  screen: 0.15
});

export function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampNumber(value, min, max) {
  const lower = finiteNumber(min, 0);
  const upper = Math.max(lower, finiteNumber(max, lower));
  return Math.max(lower, Math.min(upper, finiteNumber(value, lower)));
}

export function minimumActionDuration(action) {
  return MIN_DURATION[action?.type] || 0.15;
}

export function actionEnd(action) {
  return finiteNumber(action?.start, 0) + finiteNumber(action?.duration, 0);
}

export function fitActionTiming(actionInput, stepDurationInput, preferredKey = 'both') {
  const action = { ...(actionInput || {}) };
  const stepDuration = Math.max(0.3, finiteNumber(stepDurationInput, 1.8));
  const minimum = Math.min(stepDuration, minimumActionDuration(action));
  let start = clampNumber(action.start, 0, Math.max(0, stepDuration - minimum));
  let duration = clampNumber(action.duration, minimum, stepDuration);

  if (preferredKey === 'duration') {
    duration = clampNumber(duration, minimum, Math.max(minimum, stepDuration - start));
  } else if (preferredKey === 'start') {
    start = clampNumber(start, 0, Math.max(0, stepDuration - minimum));
    duration = clampNumber(duration, minimum, Math.max(minimum, stepDuration - start));
  } else if (start + duration > stepDuration) {
    duration = Math.max(minimum, stepDuration - start);
    if (start + duration > stepDuration) start = Math.max(0, stepDuration - duration);
  }

  action.start = Math.round(start * 1000) / 1000;
  action.duration = Math.round(duration * 1000) / 1000;
  return action;
}

export function fitTransitionTiming(transitionInput, stepDuration) {
  const transition = transitionInput && typeof transitionInput === 'object'
    ? transitionInput
    : {};
  return {
    motions: (Array.isArray(transition.motions) ? transition.motions : [])
      .map(action => fitActionTiming(action, stepDuration)),
    passes: (Array.isArray(transition.passes) ? transition.passes : [])
      .map(action => fitActionTiming(action, stepDuration)),
    screens: (Array.isArray(transition.screens) ? transition.screens : [])
      .map(action => fitActionTiming(action, stepDuration))
  };
}

export function actionState(action, elapsedInput) {
  const elapsed = Math.max(0, finiteNumber(elapsedInput, 0));
  const start = Math.max(0, finiteNumber(action?.start, 0));
  const end = actionEnd(action);
  if (elapsed < start - 1e-9) return 'future';
  if (elapsed >= end - 1e-9) return 'complete';
  return 'active';
}

export function locateBoardTime(stepsInput, timeInput) {
  const steps = Array.isArray(stepsInput) && stepsInput.length
    ? stepsInput
    : [{ duration: 1 }];
  const durations = steps.map(step => Math.max(0.001, finiteNumber(step?.duration, 1)));
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let remaining = clampNumber(timeInput, 0, total);

  for (let index = 0; index < durations.length; index += 1) {
    const duration = durations[index];
    const last = index === durations.length - 1;
    if (last || remaining < duration - 1e-9) {
      const elapsed = Math.min(remaining, duration);
      return {
        index,
        elapsed,
        duration,
        ratio: duration ? Math.min(1, elapsed / duration) : 1,
        total
      };
    }
    remaining -= duration;
  }

  const index = durations.length - 1;
  return { index, elapsed: durations[index], duration: durations[index], ratio: 1, total };
}
