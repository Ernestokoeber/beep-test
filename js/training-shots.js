window.BT = window.BT || {};

// Planned volumes stay separate from measured attempts and makes.
BT.trainingShots = (() => {
  const key = value => String(value || '').trim().toLocaleLowerCase('de-DE');

  function fromDrills(drills) {
    const shots = new Map();
    let attempted = 0;
    for (const drill of drills) for (const target of drill.shotTargets || []) {
      if (target.kind === 'freethrow') attempted += Number(target.attempted) || 0;
      else if (target.kind === 'field' && key(target.category)) {
        const previous = shots.get(key(target.category));
        shots.set(key(target.category), {
          category: previous?.category || String(target.category).trim(),
          attempted: (previous?.attempted || 0) + (Number(target.attempted) || 0)
        });
      }
    }
    return { freethrows: { attempted }, shots: [...shots.values()] };
  }

  function sync(training) {
    if (!training?.plan || training.endedAt || training.status === 'completed') return training;
    const drills = training.plan.drills || [];
    if (drills.length && drills.every(drill => Array.isArray(drill.shotTargets))) {
      Object.assign(training.plan, fromDrills(drills));
    }
    const targets = new Map();
    for (const target of training.plan.shots || []) {
      const category = String(target.category || '').trim();
      if (category && Number(target.attempted) > 0) targets.set(key(category), category);
    }
    training.shots = (training.shots || []).filter(category =>
      !category.planned || targets.has(key(category.category)) ||
      (category.entries || []).some(entry => Number(entry.attempted) > 0 || Number(entry.made) > 0));
    for (const [id, name] of targets) {
      const existing = training.shots.find(category => key(category.category) === id);
      if (!existing) training.shots.push({ category: name, entries: [], planned: true });
    }
    training.freethrows ||= [];
    return training;
  }

  function targetFor(training, kind, category) {
    if (kind === 'ft') return Number(training.plan?.freethrows?.attempted) || 0;
    return Number(training.plan?.shots?.find(target => key(target.category) === key(category))?.attempted) || 0;
  }

  return { sync, targetFor, fromDrills };
})();
