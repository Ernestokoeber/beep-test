window.BT = window.BT || {};

BT.levels = (function() {
  const TABLE_LEGER = [
    { level: 1,  speedKmh: 8.0,  shuttles: 7 },
    { level: 2,  speedKmh: 9.0,  shuttles: 8 },
    { level: 3,  speedKmh: 9.5,  shuttles: 8 },
    { level: 4,  speedKmh: 10.0, shuttles: 9 },
    { level: 5,  speedKmh: 10.5, shuttles: 9 },
    { level: 6,  speedKmh: 11.0, shuttles: 10 },
    { level: 7,  speedKmh: 11.5, shuttles: 10 },
    { level: 8,  speedKmh: 12.0, shuttles: 11 },
    { level: 9,  speedKmh: 12.5, shuttles: 11 },
    { level: 10, speedKmh: 13.0, shuttles: 11 },
    { level: 11, speedKmh: 13.5, shuttles: 12 },
    { level: 12, speedKmh: 14.0, shuttles: 12 },
    { level: 13, speedKmh: 14.5, shuttles: 13 },
    { level: 14, speedKmh: 15.0, shuttles: 13 },
    { level: 15, speedKmh: 15.5, shuttles: 13 },
    { level: 16, speedKmh: 16.0, shuttles: 14 },
    { level: 17, speedKmh: 16.5, shuttles: 14 },
    { level: 18, speedKmh: 17.0, shuttles: 15 },
    { level: 19, speedKmh: 17.5, shuttles: 15 },
    { level: 20, speedKmh: 18.0, shuttles: 16 },
    { level: 21, speedKmh: 18.5, shuttles: 16 }
  ];

  // Yo-Yo IR1 (Bangsbo): 1 Shuttle = 20 m one-way.
  // Nach jeweils 2 Shuttles (= 1 Round 40 m) folgen 10 s Pause in der Gehzone.
  const TABLE_YOYO_IR1 = [
    { level: 1,  speedKmh: 10.0, shuttles: 2 },
    { level: 2,  speedKmh: 12.0, shuttles: 2 },
    { level: 3,  speedKmh: 13.0, shuttles: 4 },
    { level: 4,  speedKmh: 13.5, shuttles: 6 },
    { level: 5,  speedKmh: 14.0, shuttles: 8 },
    { level: 6,  speedKmh: 14.5, shuttles: 16 },
    { level: 7,  speedKmh: 15.0, shuttles: 16 },
    { level: 8,  speedKmh: 15.5, shuttles: 16 },
    { level: 9,  speedKmh: 16.0, shuttles: 16 },
    { level: 10, speedKmh: 16.5, shuttles: 16 },
    { level: 11, speedKmh: 17.0, shuttles: 16 },
    { level: 12, speedKmh: 17.5, shuttles: 16 },
    { level: 13, speedKmh: 18.0, shuttles: 16 },
    { level: 14, speedKmh: 18.5, shuttles: 16 },
    { level: 15, speedKmh: 19.0, shuttles: 16 }
  ];

  const DEFAULT_DISTANCE_M = 20;
  const YOYO_REST_SEC = 10;
  const YOYO_ROUND_SIZE = 2;

  function getTable(testType) {
    return testType === 'yoyoIR1' ? TABLE_YOYO_IR1 : TABLE_LEGER;
  }

  function shuttleDuration(level, distanceM, testType, totalShuttlesDone) {
    const d = distanceM || DEFAULT_DISTANCE_M;
    const base = d / (level.speedKmh * 1000 / 3600);
    if (testType === 'yoyoIR1' && totalShuttlesDone > 0 && totalShuttlesDone % YOYO_ROUND_SIZE === 0) {
      return base + YOYO_REST_SEC;
    }
    return base;
  }

  function get(levelNum, testType) {
    return getTable(testType).find(l => l.level === levelNum);
  }

  function totalShuttlesBefore(levelNum, testType) {
    let total = 0;
    for (const l of getTable(testType)) {
      if (l.level >= levelNum) break;
      total += l.shuttles;
    }
    return total;
  }

  function maxLevel(testType) {
    const t = getTable(testType);
    return t[t.length - 1].level;
  }

  return {
    TABLE: TABLE_LEGER,
    TABLE_LEGER,
    TABLE_YOYO_IR1,
    getTable, get, totalShuttlesBefore, maxLevel, shuttleDuration,
    DEFAULT_DISTANCE_M, YOYO_REST_SEC, YOYO_ROUND_SIZE
  };
})();
