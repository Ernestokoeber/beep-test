const DEFAULT_COURT = [
  { x: 16, y: 16 },
  { x: 484, y: 16 },
  { x: 484, y: 454 },
  { x: 16, y: 454 }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function gaussianSolve(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) {
      throw new Error('Die gewählten Spielfeldpunkte ergeben keine stabile Kalibrierung.');
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let index = column; index <= size; index += 1) augmented[column][index] /= divisor;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }

  return augmented.map(row => row[size]);
}

export function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += point.x * next.y - next.x * point.y;
  });
  return Math.abs(sum) / 2;
}

export function validateCalibration(points) {
  if (!Array.isArray(points) || points.length !== 4) return false;
  const normalized = points.every(point =>
    Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y))
    && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
  );
  return normalized && polygonArea(points) >= .025;
}

export function createHomography(sourcePoints, destinationPoints = DEFAULT_COURT) {
  if (!validateCalibration(sourcePoints)) {
    throw new Error('Bitte vier ausreichend weit auseinanderliegende Spielfeldpunkte markieren.');
  }
  if (!Array.isArray(destinationPoints) || destinationPoints.length !== 4) {
    throw new Error('Zielkoordinaten der Spielfeldkalibrierung sind ungültig.');
  }

  const matrix = [];
  const vector = [];
  sourcePoints.forEach((source, index) => {
    const target = destinationPoints[index];
    const x = Number(source.x);
    const y = Number(source.y);
    const u = Number(target.x);
    const v = Number(target.y);
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    vector.push(v);
  });

  const values = gaussianSolve(matrix, vector);
  return [...values, 1];
}

export function mapPoint(matrix, point) {
  if (!Array.isArray(matrix) || matrix.length !== 9) throw new Error('Kalibrierungsmatrix fehlt.');
  const x = Number(point?.x);
  const y = Number(point?.y);
  const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-10) {
    throw new Error('Punkt kann mit dieser Kalibrierung nicht übertragen werden.');
  }
  return {
    x: clamp((matrix[0] * x + matrix[1] * y + matrix[2]) / denominator, 16, 484),
    y: clamp((matrix[3] * x + matrix[4] * y + matrix[5]) / denominator, 16, 454)
  };
}

function normalizeMarkers(markers) {
  const counts = { offense: 0, defense: 0, ball: 0 };
  return (Array.isArray(markers) ? markers : []).map((marker, index) => {
    const type = marker?.type;
    if (!['offense', 'defense', 'ball'].includes(type)) return null;
    counts[type] += 1;
    if (type === 'offense' && counts[type] > 5) return null;
    if (type === 'defense' && counts[type] > 5) return null;
    if (type === 'ball' && counts[type] > 1) return null;
    return {
      id: String(marker.id || (type === 'ball' ? 'ball' : `${type}_${index + 1}`)),
      type,
      role: type === 'ball' ? undefined : String(marker.role || (type === 'offense' ? counts[type] : `X${counts[type]}`)).slice(0, 18)
    };
  }).filter(Boolean);
}

function normalizeFrames(frames) {
  return (Array.isArray(frames) ? frames : [])
    .map(frame => ({
      id: String(frame?.id || `frame_${Math.random().toString(36).slice(2, 8)}`),
      time: Math.max(0, Number(frame?.time) || 0),
      positions: clone(frame?.positions || {})
    }))
    .sort((left, right) => left.time - right.time)
    .filter((frame, index, list) => index === 0 || Math.abs(frame.time - list[index - 1].time) >= .05);
}

function closestOffense(elements, ball) {
  if (!ball) return null;
  let best = null;
  elements.filter(element => element.type === 'offense').forEach(element => {
    const distance = Math.hypot(element.x - ball.x, element.y - ball.y);
    if (!best || distance < best.distance) best = { id: element.id, distance };
  });
  return best && best.distance <= 70 ? best.id : null;
}

export function createBoardFromVideoDraft(input = {}) {
  const calibration = input.calibration;
  const matrix = createHomography(calibration);
  const markers = normalizeMarkers(input.markers);
  const frames = normalizeFrames(input.frames);
  if (frames.length < 2) throw new Error('Mindestens zwei Keyframes sind für ein bewegtes Play nötig.');
  if (!markers.some(marker => marker.type === 'offense')) throw new Error('Mindestens ein Angriffsspieler muss markiert sein.');

  const previousPositions = {};
  const mappedFrames = frames.map(frame => {
    const elements = [];
    markers.forEach(marker => {
      const raw = frame.positions[marker.id] || previousPositions[marker.id];
      if (!raw || !Number.isFinite(Number(raw.x)) || !Number.isFinite(Number(raw.y))) return;
      previousPositions[marker.id] = { x: Number(raw.x), y: Number(raw.y) };
      const court = mapPoint(matrix, previousPositions[marker.id]);
      elements.push(marker.type === 'ball'
        ? { id: marker.id, type: 'ball', ...court }
        : { id: marker.id, type: marker.type, role: marker.role, ...court });
    });
    return { ...frame, elements };
  }).filter(frame => frame.elements.length > 0);

  if (mappedFrames.length < 2) throw new Error('Die Keyframes enthalten nicht genügend markierte Positionen.');

  const steps = mappedFrames.map((frame, index) => {
    const next = mappedFrames[index + 1];
    const duration = next ? clamp(next.time - frame.time, .3, 10) : 1.2;
    const transition = { motions: [], passes: [], screens: [] };

    if (next) {
      const targetById = new Map(next.elements.map(element => [element.id, element]));
      frame.elements.filter(element => element.type === 'offense' || element.type === 'defense').forEach(element => {
        const target = targetById.get(element.id);
        if (!target || Math.hypot(target.x - element.x, target.y - element.y) < 3) return;
        transition.motions.push({
          id: `video_motion_${index}_${element.id}`,
          type: 'move',
          elementId: element.id,
          start: 0,
          duration,
          path: [{ x: element.x, y: element.y }, { x: target.x, y: target.y }]
        });
      });

      const sourceBall = frame.elements.find(element => element.type === 'ball');
      const targetBall = next.elements.find(element => element.type === 'ball');
      const fromId = closestOffense(frame.elements, sourceBall);
      const toId = closestOffense(next.elements, targetBall);
      if (fromId && toId && fromId !== toId) {
        transition.passes.push({
          id: `video_pass_${index}`,
          type: 'pass',
          fromId,
          toId,
          start: Math.max(0, duration * .58),
          duration: Math.min(.55, Math.max(.22, duration * .25)),
          curve: -28
        });
      }
    }

    return {
      id: `video_step_${index + 1}`,
      duration,
      elements: frame.elements,
      transition
    };
  });

  const clipStart = Number(input.clipStart) || mappedFrames[0].time;
  const clipEnd = Number(input.clipEnd) || mappedFrames.at(-1).time;
  return {
    schemaVersion: 2,
    title: String(input.title || 'Play aus Video').slice(0, 100),
    description: String(input.description || `Halbautomatisch aus einem Videoabschnitt von ${clipStart.toFixed(1)} s bis ${clipEnd.toFixed(1)} s erstellt.`).slice(0, 400),
    category: String(input.category || 'Offense').slice(0, 32),
    courtType: 'half',
    steps,
    currentStep: 0,
    published: false,
    publishedAt: null,
    createdAt: null,
    updatedAt: null,
    createdBy: null
  };
}

export function formatSeconds(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, '0')}`;
}
