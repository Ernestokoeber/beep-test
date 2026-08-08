const PLAYER_TYPES = new Set(['offense', 'defense']);

function players(step, core) {
  return core.elements(step)
    .filter(element => PLAYER_TYPES.has(element.type))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function unitVector(from, to, fallbackKey = '') {
  const dx = Number(to?.x || 0) - Number(from?.x || 0);
  const dy = Number(to?.y || 0) - Number(from?.y || 0);
  const length = Math.hypot(dx, dy);
  if (length > 0.001) return { x: dx / length, y: dy / length };
  const direction = [...String(fallbackKey)].reduce((sum, character) =>
    sum + character.charCodeAt(0), 0
  ) % 2 ? 1 : -1;
  return { x: direction, y: 0 };
}

export function findOverlaps(step, core, minimum = 34) {
  const list = players(step, core);
  const output = [];
  for (let left = 0; left < list.length; left += 1) {
    for (let right = left + 1; right < list.length; right += 1) {
      const distance = core.distance(list[left], list[right]);
      if (distance >= minimum) continue;
      output.push({
        ids: [list[left].id, list[right].id],
        distance,
        minimum
      });
    }
  }
  return output;
}

export function suggestScreenPlacement(step, beneficiaryId, pointInput, core) {
  const point = core.point(pointInput);
  const beneficiary = core.elementById(step, beneficiaryId);
  const defender = players(step, core)
    .filter(element => element.type === 'defense')
    .map(element => ({ element, distance: core.distance(element, point) }))
    .sort((left, right) => left.distance - right.distance)[0]?.element || null;

  if (!defender) {
    return { point, angle: 0, targetDefenderId: null, adjusted: false };
  }

  const minimum = 32;
  const distance = core.distance(point, defender);
  const direction = unitVector(beneficiary || point, defender, `${beneficiaryId}:${defender.id}`);
  const adjusted = distance < minimum;
  const output = adjusted
    ? {
        x: core.clampX(defender.x + direction.x * minimum),
        y: core.clampY(defender.y + direction.y * minimum)
      }
    : point;
  return {
    point: output,
    angle: Math.atan2(direction.y, direction.x) * 180 / Math.PI + 90,
    targetDefenderId: defender.id,
    adjusted
  };
}

export function snapPhaseReadable(boardInput, stepIndex, core, minimum = 34) {
  const board = core.copy(boardInput?.steps ? boardInput : core.defaultBoard());
  const index = core.clamp(
    Math.floor(core.number(stepIndex, board.currentStep || 0)),
    0,
    Math.max(0, board.steps.length - 1)
  );
  const step = board.steps[index];
  const list = players(step, core);

  for (let pass = 0; pass < list.length; pass += 1) {
    let changed = false;
    for (let left = 0; left < list.length; left += 1) {
      for (let right = left + 1; right < list.length; right += 1) {
        const first = list[left];
        const second = list[right];
        const distance = core.distance(first, second);
        if (distance >= minimum - 0.001) continue;
        const direction = unitVector(first, second, `${first.id}:${second.id}`);
        const missing = minimum - distance;
        second.x = core.clampX(second.x + direction.x * missing);
        second.y = core.clampY(second.y + direction.y * missing);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return board;
}
