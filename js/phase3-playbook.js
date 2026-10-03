window.BT = window.BT || {};

BT.phase3Playbook = (() => {
  'use strict';

  const offense = (positions) => positions.map(([x, y], index) => ({ id: `o${index + 1}`, type: 'offense', role: String(index + 1), x, y }));
  const defense = (positions, mode = 'zone') => positions.map(([x, y], index) => ({ id: `d${index + 1}`, type: 'defense', role: `X${index + 1}`, defenseMode: mode, x, y }));
  const ball = (positions, owner = 0, offset = 16) => ({ id: 'ball', type: 'ball', x: positions[owner][0] + offset, y: positions[owner][1] });
  const step = (id, instruction, offensePositions, defensePositions = [], owner = 0, mode = 'zone', duration = 2.4) => ({
    id, phaseId: id, instruction, duration, ownerId: `o${owner + 1}`,
    elements: [...offense(offensePositions), ...defense(defensePositions, mode), ball(offensePositions, owner)],
    transition: { motions: [], passes: [], screens: [] }
  });
  const element = (phase, id) => phase.elements.find(item => item.id === id);
  const moved = (from, to) => Math.hypot(to.x - from.x, to.y - from.y) > 3;
  const pathBetween = (from, to, bend = 0) => {
    const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
    return [
      { x: from.x, y: from.y },
      { x: (from.x + to.x) / 2 - dy / length * bend, y: (from.y + to.y) / 2 + dx / length * bend },
      { x: to.x, y: to.y }
    ];
  };
  const pass = (id, fromId, toId, start = .28, duration = .42, curve = -34) => ({
    id, type: 'pass', fromId, toId, relation: 'simultaneous', start, duration, curve
  });
  const screen = (id, phase, elementId, beneficiaryId, start = .75, duration = 1.1, angle = 0, groupType = 'screen') => {
    const screener = element(phase, elementId);
    return {
      id, type: 'screen', elementId, beneficiaryId, relation: 'simultaneous', groupType,
      start, duration, x: screener?.x || 250, y: screener?.y || 220, angle
    };
  };
  function animateSequence(phases, options = {}) {
    for (let index = 0; index < phases.length - 1; index += 1) {
      const from = phases[index], to = phases[index + 1];
      const ownershipChanges = from.ownerId !== to.ownerId;
      for (const source of from.elements.filter(item => item.type === 'offense' || item.type === 'defense')) {
        const target = element(to, source.id);
        if (!target || !moved(source, target)) continue;
        const isDribbler = source.id === from.ownerId && source.id === to.ownerId;
        const bend = source.type === 'offense' ? (Number(source.id.slice(1)) % 2 ? 12 : -12) : 0;
        from.transition.motions.push({
          id: `${from.id}-${source.id}-move`, type: 'move', elementId: source.id,
          kind: isDribbler ? 'dribble' : 'run', relation: 'simultaneous',
          start: ownershipChanges ? .18 : .08, duration: Math.max(.8, from.duration - .35),
          path: pathBetween(source, target, bend)
        });
      }
      if (ownershipChanges) from.transition.passes.push(pass(`${from.id}-pass`, from.ownerId, to.ownerId));
      for (const action of options.screens?.[index] || []) {
        from.transition.screens.push(screen(`${from.id}-${action.elementId}-screen`, from, action.elementId, action.beneficiaryId, action.start, action.duration, action.angle, action.groupType));
      }
      if (options.passes?.[index]) from.transition.passes = options.passes[index].map((action, passIndex) => pass(
        `${from.id}-pass-${passIndex + 1}`, action.fromId, action.toId, action.start, action.duration, action.curve
      ));
    }
    return phases;
  }
  const entry = (id, title, category, description, reference, coachingPoints, reads, steps) => ({
    schemaVersion: 3,
    id: `phase3-${id}`,
    playbook: 'TSV Phase 3',
    builtIn: true,
    sourceVersion: 2,
    title,
    description,
    category,
    usage: category === 'Defense' ? 'defense' : 'offense',
    tags: ['TSV Phase 3', category, id.replaceAll('-', ' ')],
    coachingPoints,
    reads,
    reference: { label: 'Original-PDF', url: `assets/playbooks/phase3/${reference}` },
    archived: false,
    published: true,
    steps,
    currentStep: 0
  });

  const fiveOut = [
    step('five-out-a', 'A · Start: 1 passt zu 2. 2 liest zuerst den Closeout und attackiert bei Vorteil.', [[250, 390], [420, 300], [80, 300], [410, 145], [90, 145]], [], 0),
    step('five-out-b1', 'B1 · Auffüllen: 2 kommt zum Top, 1 füllt die rechte Corner, 4 hebt auf den rechten Wing.', [[410, 145], [250, 385], [80, 300], [420, 285], [90, 145]], [], 1),
    step('five-out-b2', 'B2 · 2 passt zu 3. 3 liest den Drive: lascher Closeout bedeutet sofort attackieren.', [[410, 145], [250, 385], [80, 300], [420, 285], [90, 145]], [], 2),
    step('five-out-c1', 'C1 · Zweites Auffüllen: 3 zum Top, 2 in die linke Corner, 5 auf den linken Wing.', [[410, 145], [90, 145], [250, 385], [420, 285], [80, 285]], [], 2),
    step('five-out-c2', 'C2 · Five-Out: 4 und 5 setzen den Doppelscreen am Top. 1 und 2 halten die Corners.', [[420, 145], [80, 145], [250, 385], [300, 305], [200, 305]], [], 2),
    step('five-out-d1', 'D1 · PnR rechts: 3 nutzt 4, 4 rollt voll. 1 bleibt als Kick-out, 5 und 2 sichern hoch.', [[420, 145], [175, 325], [340, 250], [265, 155], [250, 350]], [], 2),
    step('five-out-d2', 'D2 · PnR links: 3 nutzt 5, 5 rollt voll. 2 bleibt als Kick-out, 4 und 1 sichern hoch.', [[325, 325], [80, 145], [160, 250], [250, 350], [235, 155]], [], 2)
  ];

  const hornsStart = [[250, 390], [70, 255], [430, 255], [180, 225], [320, 225]];
  const horns1 = [
    step('horns1-a', 'A · Horns-Grundaufstellung. 1 entscheidet mit dem Pass auf einen Elbow über die Seite.', hornsStart, [], 0),
    step('horns1-b', 'B · Elbow-Entry zu 4. 1 cuttet in die ballseitige Corner, 5 poppt weakside.', [[420, 140], [70, 255], [430, 255], [180, 225], [340, 315]], [], 3),
    step('horns1-c', 'C · 1 setzt den Downscreen für 2. 2 kommt eng über den Screen zum Ball.', [[165, 255], [245, 330], [430, 255], [180, 225], [340, 315]], [], 3),
    step('horns1-d', 'D · 4 spielt das DHO mit 2. 2 attackiert Schulter an Hüfte, 4 rollt.', [[165, 255], [245, 265], [430, 255], [205, 170], [340, 315]], [], 1),
    step('horns1-e', 'E · Erste Reads: eigener Drive, Pass zum Roller oder Kick-out gegen die Hilfe.', [[165, 255], [285, 190], [430, 255], [245, 110], [340, 315]], [], 1),
    step('horns1-f', 'F · Weakside bleibt breit; zwei Spieler sichern früh gegen den Fastbreak.', [[180, 330], [285, 190], [430, 180], [245, 110], [330, 340]], [], 1)
  ];

  const horns2 = [
    step('horns2-a', 'A · Horns-Grundaufstellung. 1 eröffnet mit DHO und hält die Mitte frei.', hornsStart, [], 0),
    step('horns2-b', 'B · Entry-DHO: Ball zum Big, Guard nimmt den Hand-off eng und mit Tempo.', [[295, 285], [70, 255], [430, 255], [205, 225], [320, 225]], [], 0),
    step('horns2-c', 'C · Post-Isolation: Ball in den Post, die Rückseite liest den Curl.', [[360, 250], [70, 255], [395, 150], [215, 225], [285, 125]], [], 4),
    step('horns2-d', 'D · 1 setzt den Downscreen für 3; 3 kommt zum DHO über 4.', [[185, 245], [70, 255], [245, 330], [220, 220], [285, 125]], [], 2),
    step('horns2-e', 'E · Ballbewegung 3 zu 2 zu 5. Die Defense muss zwei Seiten verteidigen.', [[185, 245], [110, 300], [300, 330], [220, 220], [385, 240]], [], 4),
    step('horns2-f', 'F · 4 und 3 setzen den Doppelscreen in der Corner. 1 curlt zur Freiwurflinie.', [[250, 220], [110, 300], [365, 155], [405, 155], [385, 240]], [], 4)
  ];

  const attackers = [[250, 390], [70, 280], [430, 280], [90, 125], [410, 125]];
  const noMiddle = [
    step('no-middle-a', '1 · Grundregel: Ballhandler mit Außenfuß und Brust zur Seitenlinie lenken. Mitte bleibt geschlossen.', attackers, [[250, 335], [90, 265], [410, 265], [130, 145], [370, 145]], 0, 'man'),
    step('no-middle-b', '2 · Ein Pass entfernt: deny. Zwei Pässe entfernt: Help-Line sehen, Ball und Mann kontrollieren.', attackers, [[220, 335], [105, 260], [375, 250], [170, 170], [320, 165]], 1, 'man'),
    step('no-middle-c', '3 · Baseline-Drive: Low-Man stoppt den Ball, nächste Hilfe übernimmt den Roller, Weakside rotiert per X-out.', [[130, 180], [70, 280], [430, 280], [90, 125], [410, 125]], [[145, 205], [90, 265], [350, 230], [165, 145], [285, 155]], 0, 'man'),
    step('no-middle-d', '4 · Closeout: kontrolliert, Hände hoch, High-Foot zur Mitte. Kein direkter Middle-Drive.', attackers, [[235, 340], [90, 265], [400, 260], [130, 145], [370, 145]], 2, 'man'),
    step('no-middle-e', '5 · Post: ¾-Front. Weakside hilft früh und digt nur mit sichtbarem Rückweg.', attackers, [[250, 335], [90, 265], [410, 265], [205, 125], [330, 150]], 4, 'man')
  ];

  const zone32Shape = [[250, 330], [120, 265], [380, 265], [165, 135], [335, 135]];
  const zone32 = [
    step('zone32-a', '1 · Grundaufstellung 3-2: drei oben, zwei unten. Ball, Mitte und Korb bleiben in einer Linie.', attackers, zone32Shape),
    step('zone32-b', '2 · Ball am Flügel: äußerer Top-Verteidiger schließt. Spitze sinkt zur Nail, ballseitiger Bottom schützt Corner.', attackers, [[225, 320], [95, 270], [350, 275], [120, 145], [320, 135]], 1),
    step('zone32-c', '3 · Ball in der Corner: Bottom sprintet raus, Flügel sinkt. Weakside bleibt lang und schützt den Skip.', attackers, [[230, 310], [120, 225], [350, 265], [95, 140], [310, 135]], 3),
    step('zone32-d', '4 · High-Post: Spitze arbeitet von oben, beide Bottoms pinchen. Keine freie Drehung zur Mitte.', attackers, [[250, 300], [145, 260], [355, 260], [205, 145], [295, 145]], 0),
    step('zone32-e', '5 · Skip-Pass: auf den Pass rotieren. Closeout kontrollieren und den nächsten Extra-Pass ansagen.', attackers, [[250, 315], [145, 260], [405, 255], [200, 145], [345, 150]], 4),
    step('zone32-f', '6 · Rebound: beide Bottoms boxen aus, die Top-Reihe schließt zur langen Rebound-Zone.', attackers, [[250, 280], [145, 230], [355, 230], [205, 120], [295, 120]], 2)
  ];

  const pnr = [
    step('pnr-a', '1 · PnR-Grundregel: Big ruft Screen und Seite früh. Kein Mittel; Roller und Low-Man sind immer benannt.', [[250, 375], [90, 250], [410, 250], [90, 125], [285, 290]], [[245, 335], [105, 235], [395, 235], [115, 145], [300, 245]], 0, 'man'),
    step('pnr-b', '2 · Drop: Big sinkt und hält Ball plus Roller. Guard kämpft bei Werfern über den Screen.', [[285, 270], [90, 250], [410, 250], [90, 125], [250, 190]], [[280, 300], [105, 235], [395, 235], [125, 145], [255, 155]], 0, 'man'),
    step('pnr-c', '3 · Hedge/Show: Big zeigt kurz hoch am Ball, Guard geht über und Big recoverte sofort.', [[285, 270], [90, 250], [410, 250], [90, 125], [250, 190]], [[275, 290], [105, 235], [395, 235], [125, 145], [300, 275]], 0, 'man'),
    step('pnr-d', '4 · Switch: Guard und Big tauschen. Nur nutzen, wenn Größen und Matchups es zulassen.', [[285, 270], [90, 250], [410, 250], [90, 125], [250, 190]], [[255, 185], [105, 235], [395, 235], [125, 145], [290, 285]], 0, 'man'),
    step('pnr-e', '5 · Blitz/Trap: zwei am Ball. Low-Man übernimmt den Roller, Weakside rotiert als X-out.', [[285, 270], [90, 250], [410, 250], [90, 125], [250, 190]], [[270, 280], [105, 235], [350, 210], [160, 155], [300, 275]], 0, 'man'),
    step('pnr-f', '6 · Ice/Blue am Side-PnR: Screen verweigern, Ball zur Baseline zwingen. Low-Man taggt den Roller.', [[120, 275], [90, 250], [410, 250], [90, 125], [155, 205]], [[145, 275], [105, 235], [395, 235], [135, 150], [170, 185]], 0, 'man')
  ];

  const zone23Shape = [[190, 285], [310, 285], [105, 145], [250, 125], [395, 145]];
  const zone23 = [
    step('zone23-a', '1 · Grundaufstellung 2-3: zwei Guards oben, drei große Positionen unten. Gemeinsam shiften und reden.', attackers, zone23Shape),
    step('zone23-b', '2 · Ball am Flügel: ballseitiger Top-Guard raus, Center schiebt ballseitig und hält den Block.', attackers, [[170, 275], [330, 285], [105, 145], [225, 130], [370, 145]], 1),
    step('zone23-c', '3 · Ball in der Corner: Forward schließt, Center deckt den Block. Top-Guard sinkt in die Passlinie.', attackers, [[160, 245], [320, 280], [85, 135], [205, 125], [350, 145]], 3),
    step('zone23-d', '4 · Skip: auf den Pass rotieren, nicht erst auf den Catch. Closeout-Distanz kontrollieren.', attackers, [[190, 285], [350, 270], [125, 150], [265, 130], [410, 145]], 4),
    step('zone23-e', '5 · High-Post und Short-Corner: Center bumpt von hinten, Guard digt. Center raus, Forward übernimmt Corner.', [[250, 390], [70, 280], [430, 280], [145, 150], [250, 220]], [[185, 275], [315, 275], [115, 145], [245, 165], [360, 150]], 4),
    step('zone23-f', '6 · Rebound: die drei unteren Verteidiger finden Körper und boxen aus; Guards sichern lange Bälle.', attackers, [[190, 250], [310, 250], [130, 120], [250, 105], [370, 120]], 2)
  ];

  const zone212Shape = [[190, 285], [310, 285], [115, 135], [385, 135], [250, 215]];
  const zone212 = [
    step('zone212-a', '1 · Grundaufstellung 2-1-2: Mittelmann kontrolliert High-Post und Mitte.', attackers, zone212Shape),
    step('zone212-b', '2 · Ball am Flügel: ballseitiger Guard raus, Mittelmann schiebt zur Ballseite.', attackers, [[170, 275], [330, 285], [115, 135], [385, 135], [225, 210]], 1),
    step('zone212-c', '3 · Ball in der Corner: Bottom sprintet raus, Center deckt den Block.', attackers, [[160, 250], [320, 280], [85, 135], [360, 140], [215, 195]], 3),
    step('zone212-d', '4 · Skip-Pass: Guards rotieren schnell und nehmen das Reversal früh weg.', attackers, [[190, 285], [360, 270], [130, 140], [405, 135], [270, 210]], 4),
    step('zone212-e', '5 · High-Post: Mittelmann steht direkt davor. Das ist die Stärke dieser Zone.', [[250, 390], [70, 280], [430, 280], [250, 220], [410, 125]], [[180, 285], [320, 285], [115, 135], [385, 135], [250, 195]], 3),
    step('zone212-f', '6 · Corner/Baseline und Rebound: weite Wege sprinten; Center plus Bottom boxen aus, Guards sichern lang.', attackers, [[190, 250], [310, 250], [130, 120], [370, 120], [250, 180]], 2)
  ];

  animateSequence(fiveOut, {
    screens: {
      4: [
        { elementId: 'o4', beneficiaryId: 'o3', start: .7, duration: 1.3, angle: -28, groupType: 'pick-and-roll' },
        { elementId: 'o5', beneficiaryId: 'o3', start: .7, duration: 1.3, angle: 28, groupType: 'pick-and-roll' }
      ],
      5: [{ elementId: 'o5', beneficiaryId: 'o3', start: .2, duration: 1.15, angle: 24, groupType: 'pick-and-roll' }]
    }
  });
  animateSequence(horns1, {
    screens: {
      1: [{ elementId: 'o1', beneficiaryId: 'o2', start: .5, duration: 1.15, angle: 12 }],
      2: [{ elementId: 'o4', beneficiaryId: 'o2', start: .35, duration: 1.2, angle: -18, groupType: 'handoff' }]
    }
  });
  animateSequence(horns2, {
    screens: {
      0: [{ elementId: 'o4', beneficiaryId: 'o1', start: .35, duration: 1.15, angle: -18, groupType: 'handoff' }],
      2: [
        { elementId: 'o1', beneficiaryId: 'o3', start: .35, duration: 1.15, angle: 12 },
        { elementId: 'o4', beneficiaryId: 'o3', start: 1.05, duration: 1.05, angle: -18, groupType: 'handoff' }
      ],
      4: [
        { elementId: 'o4', beneficiaryId: 'o1', start: .7, duration: 1.25, angle: -24 },
        { elementId: 'o3', beneficiaryId: 'o1', start: .7, duration: 1.25, angle: 24 }
      ]
    },
    passes: {
      3: [
        { fromId: 'o3', toId: 'o2', start: .22, duration: .38, curve: -28 },
        { fromId: 'o2', toId: 'o5', start: .9, duration: .42, curve: 34 }
      ]
    }
  });
  animateSequence(noMiddle);
  animateSequence(zone32);
  animateSequence(pnr, {
    screens: Object.fromEntries(Array.from({ length: pnr.length - 1 }, (_, index) => [index, [
      { elementId: 'o5', beneficiaryId: 'o1', start: .25, duration: 1.25, angle: index % 2 ? 18 : -18, groupType: 'pick-and-roll' }
    ]]))
  });
  animateSequence(zone23);
  animateSequence(zone212);

  const entries = [
    entry('five-out', 'Five-Out · Read & PnR', '5-Out', 'Pass-Sequenz mit Read & Auffüllen, Doppelscreen am Top und PnR auf beiden Seiten.', 'five-out.pdf', ['Drive-Read ernst nehmen', 'V-Winkel im Doppelscreen schließen', 'Roller zieht bis zum Korb durch', 'Safety früh hochschieben'], ['Drive vor nächstem Pass', 'Roller oder Corner-Kick', 'Off-Ball-Big und Guard sichern'], fiveOut),
    entry('horns-1', 'Horns 1 · Elbow Entry', 'Horns', 'Elbow-Entry, Downscreen und DHO mit Drive-, Roll- und Kick-out-Reads.', 'horns-1.pdf', ['Elbow-Pass bestimmt die Seite', 'Downscreen mit Kontakt und Winkel', 'DHO Schulter an Hüfte', 'Zwei Spieler sichern'], ['Drive', 'Roll-Pass', 'Kick-out gegen Hilfe'], horns1),
    entry('horns-2', 'Horns 2 · DHO & Doppelscreen', 'Horns', 'Entry-DHO, Post-Isolation mit Backside-Curl und Doppelscreen in der Corner.', 'horns-2.pdf', ['DHO mit Tempo', 'Postseite räumen', 'Curl eng lesen', 'Ball schnell über 3–2–5 verlagern'], ['Post-Isolation', 'Backside-Curl', 'Curl zur Freiwurflinie'], horns2),
    entry('no-middle', 'No-Middle · Mannverteidigung', 'Defense', 'Mitte schließen, Baseline-Hilfe, X-out, kontrollierter Closeout und ¾-Front im Post.', 'no-middle-defense.pdf', ['Außenfuß sperrt die Mitte', 'Früh und laut helfen', 'Low-Man stoppt Baseline', 'Nach Hilfe im X-out schließen'], ['Deny ein Pass entfernt', 'Help-Line zwei Pässe entfernt', 'Post ¾-front und sichtbarer Dig'], noMiddle),
    entry('zone-3-2', 'Zone 3-2 · Perimeterdruck', 'Defense', 'Drei oben rotieren hart; Bottoms schützen Baseline, Corner und Rebound.', 'zone-3-2-defense.pdf', ['Auf den Pass rotieren', 'Spitze schützt die Nail', 'Corner vom Bottom schließen', 'Rebound-Zuordnung früh finden'], ['Gegen Guards und Distanzwurf', 'Risiko: Corner, Baseline, High-Post und Skip'], zone32),
    entry('pnr-defense', 'PnR-Defense · Coverages', 'Defense', 'Drop, Hedge/Show, Switch, Blitz/Trap, Ice/Blue und Tag-the-Roller als gemeinsames System.', 'pnr-defense.pdf', ['Big ruft Screen und Seite', 'Kein Mittel', 'Low-Man taggt den Roller', 'Nach Hedge oder Trap wieder Matchups herstellen'], ['Werfer: über plus Hedge oder hoher Drop', 'Nicht-Werfer: unter plus Drop', 'Elite-PG: Blitz oder Switch', 'Pop-Big: hoch zeigen, nicht automatisch switchen'], pnr),
    entry('zone-2-3', 'Zone 2-3 · Korbschutz', 'Defense', 'Aktive 2-3-Zone für Paint- und Postschutz sowie Tempo- und Foulkontrolle.', 'zone-2-3-defense.pdf', ['Auf den Pass shiften', 'Reihen geschlossen halten', 'High-Post und Short-Corner aktiv zustellen', 'Drei unten boxen aus'], ['Gegen wurfschwache Teams', 'Stärke: Korbschutz, Drive und Post', 'Risiko: High-Post, Short-Corner, gute Werfer und Skip'], zone23),
    entry('zone-2-1-2', 'Zone 2-1-2 · High-Post-Kontrolle', 'Defense', 'Mittelmann kontrolliert High-Post und Mitte; Guards und Bottoms sprinten außen.', 'zone-2-1-2-defense.pdf', ['Mittelmann bleibt zentral', 'Bottoms sprinten Corner zu Corner', 'Guards nehmen einfache Reversals', 'Center und Bottom boxen aus'], ['Gegen starke High-Post- und Drive-Teams', 'Stärke: Mitte und High-Post', 'Risiko: Corner, Baseline und schnelle Reversals'], zone212)
  ];

  return Object.freeze({ id: 'tsv-phase-3', title: 'TSV Phase 3', season: '2026/27', version: 2, entries });
})();
