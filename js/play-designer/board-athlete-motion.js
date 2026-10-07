const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const angleBetween = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const boardPoint = p => ({ x: (p.x - 250) * .03, z: (p.y - 235) * .03 });
const footprint = (a, side) => ({ x: a.x + Math.cos(a.yaw) * (side === 'l' ? .135 : -.135), z: a.z - Math.sin(a.yaw) * (side === 'l' ? .135 : -.135), yaw: a.yaw, height: 0 });

// Sample the saved board once. Seeking uses these tracks, never playback history.
// Root positions and the ball always come from the current authoritative snapshot.
export function createBoardAthleteMotion(board, snapshotAt, duration) {
  const tracks = new Map(), times = new Set([0, duration]);
  const interval = Math.max(.05, duration / 2400);
  for (let t = 0; t < duration; t += interval) times.add(Math.min(duration, t));
  let offset = 0;
  for (const step of board.steps || []) {
    for (const screen of step.transition?.screens || []) {
      times.add(Math.min(duration, offset + screen.start));
      times.add(Math.min(duration, offset + screen.start + screen.duration));
    }
    offset += Number(step.duration) || 0;
    times.add(Math.min(duration, offset));
  }
  const ordered = [...times].sort((a, b) => a - b);
  for (const t of ordered) {
    const snapshot = snapshotAt(board, t), ball = snapshot.elements?.find(e => e.type === 'ball');
    for (const element of snapshot.elements || []) {
      if (!['offense', 'defense'].includes(element.type)) continue;
      if (!tracks.has(element.id)) tracks.set(element.id, []);
      const frames = tracks.get(element.id), previous = frames.at(-1), p = boardPoint(element);
      const dx = previous ? p.x - previous.x : 0, dz = previous ? p.z - previous.z : 0;
      const speed = previous ? Math.hypot(dx, dz) / Math.max(.0001, t - previous.t) : 0;
      const screen = (snapshot._activeScreens || []).find(s => s.elementId === element.id && Math.hypot(element.x - s.x, element.y - s.y) < 18 && speed < .12);
      const target = element.type === 'defense' && ball ? boardPoint(ball) : { x: 0, z: -5.4 };
      const yaw = screen ? -(screen.angle || 0) * Math.PI / 180 : speed > .12 ? Math.atan2(dx, dz) : previous?.yaw ?? Math.atan2(target.x - p.x, target.z - p.z);
      frames.push({ ...p, yaw, speed, screen: !!screen, t });
    }
  }
  function sample(frames, t) {
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid].t <= t) lo = mid; else hi = mid - 1; }
    const a = frames[lo], b = frames[Math.min(lo + 1, frames.length - 1)];
    const u = clamp((t - a.t) / Math.max(.0001, b.t - a.t));
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, yaw: a.yaw + angleBetween(a.yaw, b.yaw) * smooth(u), speed: a.speed + (b.speed - a.speed) * u, screen: a.screen };
  }
  const plans = new Map();
  for (const [id, frames] of tracks) {
    const feet = { l: footprint(frames[0], 'l'), r: footprint(frames[0], 'r') }, steps = { l: [], r: [] };
    let next = frames[0].t, side = 'l', moving = false;
    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i], previous = frames[i - 1];
      const active = frame.speed > .12 && !frame.screen;
      if (active && !moving) next = previous.t;
      if (active && frame.t >= next) {
        const start = next, end = Math.min(duration, start + Math.max(.18, Math.min(.32, .5 / Math.max(.8, frame.speed))));
        const target = footprint(sample(frames, Math.min(duration, end + .06)), side);
        steps[side].push({ start, end, from: feet[side], to: target, lift: .06 });
        feet[side] = target; next = end; side = side === 'l' ? 'r' : 'l';
      }
      if ((!active && moving) || (frame.screen && !previous.screen)) {
        const end = frame.t;
        for (const s of ['l', 'r']) {
          // Finish the current swing before contact; both support feet then hold.
          const last = steps[s].at(-1);
          if (last && last.end > end) { last.end = end; last.to = footprint(frame, s); feet[s] = last.to; }
          const start = Math.max(steps[s].at(-1)?.end || 0, end - .15);
          const target = footprint(frame, s);
          if (end > start) steps[s].push({ start, end, from: feet[s], to: target, lift: .025 });
          feet[s] = target;
        }
      }
      moving = active;
    }
    plans.set(id, { steps, frames });
  }
  return {
    ids: [...tracks.keys()],
    state(id, seconds) {
      const plan = plans.get(id); if (!plan) return null;
      const t = Math.max(0, Math.min(duration, seconds)), actor = sample(plan.frames, t), feet = {};
      for (const side of ['l', 'r']) {
        let value = footprint(plan.frames[0], side);
        for (const step of plan.steps[side]) {
          if (t < step.start) break;
          if (t >= step.end) { value = step.to; continue; }
          const phase = clamp((t - step.start) / Math.max(.0001, step.end - step.start)), u = smooth(phase);
          value = { x: step.from.x + (step.to.x - step.from.x) * u, z: step.from.z + (step.to.z - step.from.z) * u, yaw: step.from.yaw + angleBetween(step.from.yaw, step.to.yaw) * u, height: Math.sin(phase * Math.PI) * step.lift }; break;
        }
        feet[side] = { ...value, height: value.height || 0 };
      }
      return { ...actor, feet };
    }
  };
}
