window.BT = window.BT || {};

BT.levels = (function() {
  const TABLE = [
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

  const DEFAULT_DISTANCE_M = 20;

  function shuttleDuration(level, distanceM) {
    const d = distanceM || DEFAULT_DISTANCE_M;
    return d / (level.speedKmh * 1000 / 3600);
  }

  function get(levelNum) {
    return TABLE.find(l => l.level === levelNum);
  }

  function totalShuttlesBefore(levelNum) {
    let total = 0;
    for (const l of TABLE) {
      if (l.level >= levelNum) break;
      total += l.shuttles;
    }
    return total;
  }

  function maxLevel() { return TABLE[TABLE.length - 1].level; }

  return { TABLE, get, totalShuttlesBefore, maxLevel, shuttleDuration, DEFAULT_DISTANCE_M };
})();
