window.BT = window.BT || {};

BT.screenAcademy = (() => {
  'use strict';

  const CATEGORIES = [
    ['ball', 'Am Ball'],
    ['handoff', 'Handoff'],
    ['offball', 'Abseits des Balls'],
    ['combination', 'Kombinationen'],
    ['reads', 'Reads & Lösungen']
  ];

  const ITEMS = [
    { id: 'pick-roll', category: 'ball', title: 'Pick & Roll', short: 'Screen und harter Roll zum Korb.', description: 'Der Big stellt den Ball-Screen und rollt danach mit Ziel Korb. Der Ballhandler bindet zwei Verteidiger und entscheidet zwischen eigenem Abschluss und Pass.', reads: ['Drive', 'Pocket-Pass', 'Lob', 'Weakside-Kick'], coaching: ['Screenwinkel klar ansagen', 'Schulter an Hüfte nutzen', 'Roller zeigt Hände und sprintet durch'], demo: 'pnr-roll', core: true },
    { id: 'pick-pop', category: 'ball', title: 'Pick & Pop', short: 'Screen und Öffnen zum Wurf.', description: 'Nach dem Screen rollt der Big nicht zum Korb, sondern öffnet sich in freien Raum hinter die Dreierlinie oder zum Elbow.', reads: ['Pull-up', 'Pass zum Popper', 'Closeout attackieren'], coaching: ['Füße früh zum Korb drehen', 'Nicht auf der Screenposition stehen bleiben', 'Spacing zum Ballhandler halten'], demo: 'pnr-pop', core: true },
    { id: 'pick-slip', category: 'ball', title: 'Slip', short: 'Screen antäuschen und früh zum Korb lösen.', description: 'Der Screener löst sich vor dem Kontakt. Das bestraft aggressive Show-, Hedge- oder Switch-Verteidigung.', reads: ['Sofortpass', 'Lob', 'Weakside-Rotation bestrafen'], coaching: ['Verteidiger lesen, nicht automatisch slippen', 'Hände früh zeigen', 'Direkter Weg zum Ring'], demo: 'slip', core: true },
    { id: 'pick-short-roll', category: 'ball', title: 'Short Roll', short: 'Roll bis Freiwurflinie und von dort entscheiden.', description: 'Der Screener stoppt im freien Raum um Nail oder Freiwurflinie und spielt dort eine 4-gegen-3-Entscheidung.', reads: ['Floater', 'Corner-Pass', 'Dunker-Spot', 'Extra-Pass'], coaching: ['Im Sprungstopp fangen', 'Kopf sofort oben', 'Maximal eine kurze Entscheidungspause'] },
    { id: 'pick-long-roll', category: 'ball', title: 'Long Roll', short: 'Voller Roll bis zum Korb.', description: 'Der Screener sprintet vollständig zum Ring und zwingt den Low-Man zu einer klaren Hilfeentscheidung.', reads: ['Pocket', 'Lob', 'Corner gegen Tag'], coaching: ['Bis unter den Ring durchziehen', 'Nicht an der Freiwurflinie abbremsen'] },
    { id: 'pick-fade', category: 'ball', title: 'Pick & Fade', short: 'Seitlich oder Richtung Baseline öffnen.', description: 'Der Screener löst sich nach dem Block seitlich aus der Verteidigung. Besonders wirksam bei Midrange- oder Baseline-Würfen.' },
    { id: 'flat-screen', category: 'ball', title: 'Flat Screen', short: 'Fast parallel zur Grundlinie gestellt.', description: 'Der Ballhandler kann beide Richtungen nutzen. Der Verteidiger kann die Seite schwer vorgeben.', coaching: ['Screener steht stabil und tief', 'Ballhandler täuscht eine Seite an'] },
    { id: 'angle-screen', category: 'ball', title: 'Angle Screen', short: 'Schräger Screen mit klarer Zielrichtung.', description: 'Der Winkel lenkt den Ballhandler bewusst zur Mitte oder Baseline und legt den Rollweg fest.' },
    { id: 'step-up', category: 'ball', title: 'Step-up Screen', short: 'Side-Screen in Richtung Mitte.', description: 'Vom Flügel führt der Screen den Ballhandler zurück in die Mitte. Gut gegen Baseline-orientierte Verteidigung.' },
    { id: 'drag', category: 'ball', title: 'Drag Screen', short: 'Früher Ball-Screen in der Transition.', description: 'Der nachlaufende Big stellt den Screen, bevor die gegnerische Defense organisiert ist.' },
    { id: 'double-drag', category: 'ball', title: 'Double Drag', short: 'Zwei frühe Screens nacheinander.', description: 'Zwei Bigs screenen versetzt. Häufig rollt der erste und der zweite poppt.', reads: ['Ersten oder zweiten Screen nutzen', 'Roll', 'Pop', 'Corner-Kick'], demo: 'double-drag' },
    { id: 'empty-corner', category: 'ball', title: 'Empty-Corner PnR', short: 'Ballseitige Ecke bleibt frei.', description: 'Die leere Ecke nimmt der Defense eine nahe Hilfe und öffnet Drive, Roll und Baseline-Pass.' },
    { id: 'ghost', category: 'ball', title: 'Ghost Screen', short: 'Screen antäuschen und nach außen lösen.', description: 'Ein meist wurfstarker Spieler läuft zum Screen, setzt aber keinen Kontakt und poppt sofort heraus.', reads: ['Switch bestrafen', 'Sofortiger Dreier', 'Closeout-Drive'], demo: 'ghost' },
    { id: 'rescreen', category: 'ball', title: 'Re-Screen / Flip', short: 'Zweiter Screen in Gegenrichtung.', description: 'Nach dem ersten Screen dreht der Screener den Winkel und blockt erneut. Das bestraft ICE und einen früh positionierten Verteidiger.', reads: ['Richtungswechsel', 'Reject', 'Roll nach zweitem Kontakt'], coaching: ['Neuen Winkel vollständig setzen', 'Ballhandler wartet auf den zweiten Kontakt'], demo: 'rescreen', core: true },
    { id: 'reject', category: 'reads', title: 'Reject', short: 'Screen bewusst ablehnen.', description: 'Der Ballhandler täuscht die Nutzung des Screens an und attackiert die freie Gegenseite.', reads: ['Direkter Drive', 'Baseline', 'Pass zum slipenden Big'], coaching: ['Verteidiger zuerst am Screen binden', 'Explosiver erster Schritt'], demo: 'reject', core: true },
    { id: 'split', category: 'reads', title: 'Split', short: 'Zwischen zwei Verteidigern durchbrechen.', description: 'Wenn Hedge oder Trap eine Lücke lässt, dribbelt der Ballhandler tief und eng zwischen beide Verteidiger.', coaching: ['Ball tief schützen', 'Nur bei klarer Lücke', 'Nach dem Split sofort Ring attackieren'] },
    { id: 'snake', category: 'reads', title: 'Snake Dribble', short: 'Nach dem Screen vor den Verteidiger kreuzen.', description: 'Der Ballhandler zieht nach Nutzung des Screens zurück in die Mitte und hält den Verteidiger hinter sich.' },
    { id: 'dho', category: 'handoff', title: 'Dribble Handoff', short: 'Übergabe und Screen in einer Aktion.', description: 'Der Ballgeber dribbelt auf den Empfänger zu, übergibt den Ball eng und wirkt direkt als Screener.', reads: ['Curl/Drive', 'Keep', 'Roll', 'Pop'], coaching: ['Schulter an Hüfte', 'Ball geschützt übergeben', 'Nicht zu früh auseinanderlaufen'], demo: 'dho', core: true },
    { id: 'stationary-handoff', category: 'handoff', title: 'Stationary Handoff', short: 'Übergabe aus dem Stand.', description: 'Der Ballhalter wartet am Elbow oder Post und übergibt an einen eng vorbeilaufenden Guard.' },
    { id: 'get-action', category: 'handoff', title: 'Get Action', short: 'Pass zum Big und direkt zurück ins Handoff.', description: 'Der Guard passt zum Big, folgt seinem Pass und bekommt den Ball über ein sofortiges Handoff zurück.' },
    { id: 'fake-handoff', category: 'handoff', title: 'Fake Handoff / Keep', short: 'Übergabe antäuschen und selbst attackieren.', description: 'Der Big behält den Ball, wenn beide Verteidiger zum Guard springen oder der Weg zum Korb frei wird.' },
    { id: 'pin-down', category: 'offball', title: 'Pin-Down', short: 'Screen nach unten für einen hochkommenden Werfer.', description: 'Der Screener steht zwischen Verteidiger und Grundlinie. Der Empfänger kommt vom Block oder aus der Corner nach oben.', reads: ['Straight Cut', 'Curl', 'Flare', 'Backdoor'], coaching: ['Vorbereiten und dann eng am Screen vorbei', 'Screener trifft Winkel und bleibt legal'], demo: 'pin-down', core: true },
    { id: 'curl', category: 'reads', title: 'Curl Cut', short: 'Eng um den Screen Richtung Korb.', description: 'Der Verteidiger verfolgt über den Screen. Der Angreifer curlt direkt in die Zone.', demo: 'curl', core: true },
    { id: 'straight', category: 'reads', title: 'Straight Cut', short: 'Gerade zum Flügel oder Top herauskommen.', description: 'Der Verteidiger bleibt hinter dem Cutter. Der Empfänger schafft Abstand und fängt wurfbereit.', demo: 'pin-down' },
    { id: 'flare', category: 'offball', title: 'Flare Screen', short: 'Screen vom Ball weg für einen Außenwurf.', description: 'Der Cutter entfernt sich vom Ball und löst sich hinter dem Screen in freien Perimeterraum.', demo: 'flare', core: true },
    { id: 'backscreen', category: 'offball', title: 'Backscreen', short: 'Screen im Rücken für einen Cut zum Ring.', description: 'Der Screener blockt die Sicht- und Laufbahn des Verteidigers. Der Cutter geht hart zum Korb.', reads: ['Lob', 'Bounce-Pass', 'Screener poppt'], coaching: ['Vor dem Cut Blickkontakt herstellen', 'Screener zeigt breite legale Position'], demo: 'backscreen', core: true },
    { id: 'cross-screen', category: 'offball', title: 'Cross Screen', short: 'Horizontaler Screen durch die Zone.', description: 'Meist wird ein Postspieler von einem Block auf die andere Seite gebracht.' },
    { id: 'ucla', category: 'offball', title: 'UCLA Screen', short: 'Backscreen am Elbow für den Passgeber.', description: 'Nach dem Flügelpass schneidet der Passgeber über einen Elbow-Backscreen zum Korb.' },
    { id: 'zipper', category: 'offball', title: 'Zipper Screen', short: 'Vertikaler Screen vom Block zum Top.', description: 'Ein Guard läuft entlang der Zone nach oben und erhält den Ball am Top.' },
    { id: 'flex-screen', category: 'offball', title: 'Flex Screen', short: 'Baseline-Backscreen für den Flex Cut.', description: 'Ein Spieler cuttet über einen horizontalen Backscreen durch die Zone. Danach erhält der Screener meist selbst einen Downscreen.' },
    { id: 'stagger', category: 'offball', title: 'Stagger Screen', short: 'Zwei versetzte Screens nacheinander.', description: 'Der Cutter nutzt zwei getrennte Screens und kann zwischen Curl, Straight und Fade lesen.', demo: 'stagger', core: true },
    { id: 'elevator', category: 'offball', title: 'Elevator / Gate', short: 'Zwei Screener schließen das Tor.', description: 'Der Werfer läuft zwischen zwei Bigs hindurch. Danach schließen diese die Lücke legal.', demo: 'elevator' },
    { id: 'screen-screener', category: 'combination', title: 'Screen-the-Screener', short: 'Erst screenen, dann selbst einen Screen erhalten.', description: 'Die Defense verliert den zweiten Ablauf häufig aus dem Blick, weil sie noch auf den ersten Screen reagiert.' },
    { id: 'floppy', category: 'combination', title: 'Floppy', short: 'Werfer wählt Single- oder Double-Screen.', description: 'Der Werfer startet unter dem Korb und entscheidet zwischen einem einzelnen Screen auf einer Seite und einem Doppel- oder Stagger-Screen auf der anderen.', reads: ['Single-Seite', 'Double-Seite', 'Curl', 'Fade', 'Backdoor'], coaching: ['Erst Verteidiger lesen', 'Tempo vor dem Screen wechseln', 'Fang wurfbereit'], demo: 'floppy', core: true },
    { id: 'spain', category: 'combination', title: 'Spain Pick & Roll', short: 'PnR plus Backscreen auf den Big-Verteidiger.', description: 'Ein dritter Angreifer stellt während des PnR einen Backscreen auf den Verteidiger des Rollers und poppt danach häufig heraus.', reads: ['Roller', 'Popper', 'Ballhandler', 'Weakside'], demo: 'spain', core: true },
    { id: 'ram', category: 'combination', title: 'Ram Screen', short: 'Der spätere Ball-Screener wird vorher freigeblockt.', description: 'Ein Off-Ball-Screen erschwert es dem Verteidiger des Bigs, rechtzeitig die gewünschte PnR-Coverage einzunehmen.' },
    { id: 'veer', category: 'combination', title: 'Veer Screen', short: 'Nach dem Ball-Screen folgt ein Screen für einen Werfer.', description: 'Der Big rollt nicht, sondern dreht sich nach dem Ball-Screen direkt in einen Off-Ball-Screen.' },
    { id: 'chicago', category: 'combination', title: 'Chicago Action', short: 'Pin-Down direkt in ein Handoff.', description: 'Ein Guard kommt über einen Pin-Down zum Ball und erhält unmittelbar danach ein DHO.', reads: ['DHO nutzen', 'Backdoor', 'Big Keep', 'Curl'], demo: 'chicago' },
    { id: 'zoom', category: 'combination', title: 'Zoom Action', short: 'Schneller Screen in ein DHO.', description: 'Ein Cutter wird aus der Corner oder vom Block über einen Screen direkt in ein Handoff geführt.' },
    { id: 'pistol', category: 'combination', title: 'Pistol Action', short: 'Transition-Pass, Handoff und Side-PnR.', description: 'Eine schnelle Dreieraktion auf dem Flügel, bevor die Defense vollständig organisiert ist.' },
    { id: 'hammer', category: 'combination', title: 'Hammer Action', short: 'Baseline-Drive plus Weakside-Backscreen.', description: 'Während der Ballhandler Baseline attackiert, stellt ein Big auf der Weakside einen Backscreen für den Corner-Werfer.', reads: ['Layup', 'Skip in die Corner', 'Safety-Pass'], demo: 'hammer' },
    { id: 'iverson', category: 'combination', title: 'Iverson Cut', short: 'Guard läuft über zwei Elbow-Screens.', description: 'Der Cutter wechselt über beide Elbows die Seite und kann dort Ball, DHO oder Post-Entry erhalten.' }
  ];

  const BASE_OFFENSE = { o1: [250, 385], o2: [75, 285], o3: [425, 285], o4: [90, 135], o5: [300, 285] };
  const BASE_DEFENSE = { d1: [250, 345], d2: [95, 270], d3: [405, 270], d4: [115, 145], d5: [300, 245] };

  function positions(base, overrides = {}) {
    return Object.fromEntries(Object.entries(base).map(([id, point]) => [id, overrides[id] || point]));
  }

  function elements(offense, defense, ownerId) {
    const output = [];
    Object.entries(offense).forEach(([id, [x, y]]) => output.push({ id, type: 'offense', role: id.slice(1), x, y }));
    Object.entries(defense).forEach(([id, [x, y]]) => output.push({ id, type: 'defense', role: `X${id.slice(1)}`, defenseMode: 'man', x, y }));
    const owner = offense[ownerId] || offense.o1;
    output.push({ id: 'ball', type: 'ball', x: owner[0] + 16, y: owner[1] });
    return output;
  }

  function path(from, to, bend = 0) {
    const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy) || 1;
    return [
      { x: from[0], y: from[1] },
      { x: (from[0] + to[0]) / 2 - dy / length * bend, y: (from[1] + to[1]) / 2 + dx / length * bend },
      { x: to[0], y: to[1] }
    ];
  }

  function twoPhase(item, config) {
    const startOffense = positions(BASE_OFFENSE, config.startOffense);
    const endOffense = positions(startOffense, config.endOffense);
    const startDefense = positions(BASE_DEFENSE, config.startDefense);
    const endDefense = positions(startDefense, config.endDefense);
    const startOwner = config.startOwner || 'o1';
    const endOwner = config.endOwner || startOwner;
    const duration = config.duration || 3.2;
    const transition = { motions: [], passes: [], screens: [] };

    for (const id of [...Object.keys(startOffense), ...Object.keys(startDefense)]) {
      const from = startOffense[id] || startDefense[id];
      const to = endOffense[id] || endDefense[id];
      if (!to || Math.hypot(to[0] - from[0], to[1] - from[1]) < 4) continue;
      const custom = config.paths?.[id];
      transition.motions.push({
        id: `${item.id}-${id}-move`, type: 'move', elementId: id,
        kind: id === startOwner && id === endOwner ? 'dribble' : 'run', relation: 'simultaneous',
        start: config.motionStart?.[id] ?? .25, duration: config.motionDuration?.[id] ?? 2.2,
        path: custom ? custom.map(([x, y]) => ({ x, y })) : path(from, to, id.startsWith('o') ? 12 : 0)
      });
    }
    (config.screens || []).forEach((screen, index) => transition.screens.push({
      id: `${item.id}-screen-${index + 1}`, type: 'screen', elementId: screen.by,
      beneficiaryId: screen.for, targetDefenderId: screen.target || '', relation: 'simultaneous',
      groupId: screen.group || `${item.id}-group`, groupType: screen.type || 'screen',
      start: screen.start ?? .35, duration: screen.duration ?? 1.35,
      x: screen.at?.[0] ?? startOffense[screen.by][0], y: screen.at?.[1] ?? startOffense[screen.by][1], angle: screen.angle || 0
    }));
    (config.passes || (startOwner !== endOwner ? [{ from: startOwner, to: endOwner }] : [])).forEach((pass, index) => transition.passes.push({
      id: `${item.id}-pass-${index + 1}`, type: 'pass', fromId: pass.from, toId: pass.to,
      relation: 'simultaneous', start: pass.start ?? 1.45, duration: pass.duration ?? .42, curve: pass.curve ?? -32
    }));

    return {
      schemaVersion: 3,
      title: `Screen-Akademie · ${item.title}`,
      description: `${item.description} Coaching: ${(item.coaching || ['Abstand, Winkel und Timing gemeinsam lesen.']).join(' · ')}`,
      category: item.category === 'handoff' ? 'Handoff' : item.category === 'offball' ? 'Off-Ball Screen' : 'Pick & Roll',
      usage: 'offense', tags: ['Screen-Akademie', item.title], playbook: 'Screen-Akademie',
      coachingPoints: item.coaching || [], reads: item.reads || [], currentStep: 0,
      steps: [
        { id: `${item.id}-start`, phaseId: `${item.id}-start`, instruction: `Start · ${item.short}`, duration, elements: elements(startOffense, startDefense, startOwner), transition },
        { id: `${item.id}-finish`, phaseId: `${item.id}-finish`, instruction: `Lösung · ${item.description}`, duration: 1.5, elements: elements(endOffense, endDefense, endOwner), transition: { motions: [], passes: [], screens: [] } }
      ]
    };
  }

  const DEMOS = {
    'pnr-roll': { startOffense: { o5: [292, 300] }, endOffense: { o1: [345, 225], o5: [250, 105] }, endDefense: { d1: [320, 245], d5: [280, 155] }, screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [285, 310], angle: -24, type: 'pick-and-roll' }] },
    'pnr-pop': { startOffense: { o5: [292, 300] }, endOffense: { o1: [340, 225], o5: [410, 305] }, endDefense: { d1: [320, 245], d5: [345, 250] }, screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [285, 310], angle: -24, type: 'pick-and-roll' }], passes: [{ from: 'o1', to: 'o5', start: 2.1 }] , endOwner: 'o5' },
    slip: { startOffense: { o5: [290, 305] }, endOffense: { o1: [275, 340], o5: [250, 105] }, endDefense: { d5: [310, 260] }, screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [285, 310], duration: .45, type: 'pick-and-roll' }], passes: [{ from: 'o1', to: 'o5', start: .8 }], endOwner: 'o5' },
    reject: { startOffense: { o5: [290, 305] }, endOffense: { o1: [120, 205], o5: [285, 285] }, endDefense: { d1: [150, 225] }, screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [285, 310], angle: -24, type: 'pick-and-roll' }], paths: { o1: [[250, 385], [225, 330], [175, 275], [120, 205]] } },
    rescreen: { startOffense: { o5: [292, 300] }, endOffense: { o1: [155, 215], o5: [250, 115] }, screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [290, 310], angle: -24, start: .2, duration: .75, type: 'pick-and-roll' }, { by: 'o5', for: 'o1', target: 'd1', at: [245, 300], angle: 24, start: 1.05, duration: 1.1, type: 'pick-and-roll' }], paths: { o1: [[250, 385], [310, 330], [270, 315], [215, 275], [155, 215]] } },
    dho: { startOffense: { o1: [165, 290], o5: [250, 245] }, startOwner: 'o5', endOffense: { o1: [330, 190], o5: [235, 145] }, endOwner: 'o1', screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [245, 245], angle: -12, type: 'handoff' }], passes: [{ from: 'o5', to: 'o1', start: .65, duration: .25 }], paths: { o1: [[165, 290], [220, 255], [270, 240], [330, 190]] } },
    'pin-down': { startOffense: { o2: [90, 125], o5: [135, 210] }, endOffense: { o2: [120, 300] }, screens: [{ by: 'o5', for: 'o2', target: 'd2', at: [135, 210], angle: 0 }], passes: [{ from: 'o1', to: 'o2', start: 1.8 }], endOwner: 'o2', paths: { o2: [[90, 125], [115, 190], [120, 245], [120, 300]] } },
    curl: { startOffense: { o2: [90, 125], o5: [145, 210] }, endOffense: { o2: [245, 135] }, screens: [{ by: 'o5', for: 'o2', target: 'd2', at: [145, 210], angle: 0 }], passes: [{ from: 'o1', to: 'o2', start: 1.6 }], endOwner: 'o2', paths: { o2: [[90, 125], [115, 190], [165, 220], [215, 185], [245, 135]] } },
    flare: { startOffense: { o2: [210, 230], o5: [165, 260] }, endOffense: { o2: [70, 300] }, screens: [{ by: 'o5', for: 'o2', target: 'd2', at: [165, 260], angle: 55 }], passes: [{ from: 'o1', to: 'o2', start: 1.7 }], endOwner: 'o2' },
    backscreen: { startOffense: { o2: [90, 285], o5: [170, 235] }, endOffense: { o2: [245, 95], o5: [385, 300] }, screens: [{ by: 'o5', for: 'o2', target: 'd2', at: [170, 235], angle: -35 }], passes: [{ from: 'o1', to: 'o2', start: 1.75, curve: 45 }], endOwner: 'o2' },
    stagger: { startOffense: { o2: [75, 125], o4: [120, 190], o5: [180, 245] }, endOffense: { o2: [250, 315] }, screens: [{ by: 'o4', for: 'o2', target: 'd2', at: [120, 190], angle: 8 }, { by: 'o5', for: 'o2', target: 'd2', at: [180, 245], angle: 18 }], passes: [{ from: 'o1', to: 'o2', start: 2 }], endOwner: 'o2', paths: { o2: [[75, 125], [105, 175], [145, 220], [195, 270], [250, 315]] } },
    elevator: { startOffense: { o2: [250, 105], o4: [195, 220], o5: [305, 220] }, endOffense: { o2: [250, 330], o4: [225, 225], o5: [275, 225] }, screens: [{ by: 'o4', for: 'o2', target: 'd2', at: [210, 220], angle: 0 }, { by: 'o5', for: 'o2', target: 'd2', at: [290, 220], angle: 0 }], passes: [{ from: 'o1', to: 'o2', start: 2 }], endOwner: 'o2' },
    floppy: { startOffense: { o2: [250, 95], o4: [100, 180], o5: [160, 220] }, endOffense: { o2: [75, 305] }, screens: [{ by: 'o4', for: 'o2', target: 'd2', at: [105, 180], angle: 10 }, { by: 'o5', for: 'o2', target: 'd2', at: [160, 220], angle: 20 }], passes: [{ from: 'o1', to: 'o2', start: 2 }], endOwner: 'o2', paths: { o2: [[250, 95], [195, 120], [150, 175], [105, 235], [75, 305]] } },
    spain: { startOffense: { o2: [330, 190], o5: [290, 305] }, endOffense: { o1: [340, 220], o2: [410, 300], o5: [250, 100] }, endDefense: { d5: [300, 170] }, screens: [{ by: 'o5', for: 'o1', target: 'd1', at: [290, 310], angle: -24, type: 'pick-and-roll' }, { by: 'o2', for: 'o5', target: 'd5', at: [300, 225], angle: 35, start: .8 }], paths: { o2: [[330, 190], [300, 225], [340, 265], [410, 300]] } },
    'double-drag': { startOffense: { o4: [215, 315], o5: [285, 315] }, endOffense: { o1: [355, 215], o4: [250, 105], o5: [405, 300] }, screens: [{ by: 'o4', for: 'o1', target: 'd1', at: [215, 315], angle: -20, start: .2, type: 'pick-and-roll' }, { by: 'o5', for: 'o1', target: 'd1', at: [285, 315], angle: -20, start: .75, type: 'pick-and-roll' }] },
    ghost: { startOffense: { o4: [170, 300] }, endOffense: { o1: [335, 220], o4: [70, 305] }, screens: [{ by: 'o4', for: 'o1', target: 'd1', at: [230, 315], duration: .35, type: 'pick-and-roll' }], paths: { o4: [[170, 300], [225, 315], [150, 315], [70, 305]] } },
    chicago: { startOffense: { o2: [90, 125], o4: [145, 210], o5: [255, 250] }, startOwner: 'o5', endOffense: { o2: [340, 190] }, endOwner: 'o2', screens: [{ by: 'o4', for: 'o2', target: 'd2', at: [145, 210], angle: 0 }, { by: 'o5', for: 'o2', target: 'd2', at: [250, 250], angle: -15, start: 1.15, type: 'handoff' }], passes: [{ from: 'o5', to: 'o2', start: 1.35, duration: .25 }], paths: { o2: [[90, 125], [120, 190], [185, 235], [255, 250], [340, 190]] } },
    hammer: { startOffense: { o1: [365, 300], o3: [85, 135], o5: [160, 190] }, endOffense: { o1: [420, 105], o3: [70, 275] }, endOwner: 'o3', screens: [{ by: 'o5', for: 'o3', target: 'd3', at: [150, 210], angle: 45 }], passes: [{ from: 'o1', to: 'o3', start: 1.75, duration: .48, curve: 70 }], paths: { o1: [[365, 300], [400, 235], [425, 165], [420, 105]], o3: [[85, 135], [105, 185], [70, 275]] } }
  };

  function itemById(id) {
    return ITEMS.find(item => item.id === id || item.demo === id) || null;
  }

  function buildDemo(id) {
    const item = itemById(id);
    const demoId = item?.demo || id;
    const config = DEMOS[demoId];
    if (!item || !config) return null;
    return twoPhase(item, config);
  }

  function nextTuesdayLabel(date = new Date()) {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let days = (2 - target.getDay() + 7) % 7;
    if (days === 0) days = 7;
    target.setDate(target.getDate() + days);
    return target.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
  }

  function render(target) {
    const escape = BT.util.escapeHTML;
    const root = document.createElement('section');
    root.className = 'view screen-academy';
    root.innerHTML = `
      <header class="screen-academy-hero">
        <a class="btn small" href="#/tactics">← Taktikboard</a>
        <span class="section-kicker">CourtHub Basketball-Wissen</span>
        <h2>Screen-Akademie</h2>
        <p>Blocksituationen verständlich erklären, direkt animieren und als gemeinsame Sprache im Training verwenden.</p>
      </header>
      <section class="screen-lesson" aria-labelledby="screen-lesson-title">
        <div><span class="section-kicker">Einführung am ${escape(nextTuesdayLabel())}</span><h3 id="screen-lesson-title">35-Minuten-Lehrpfad</h3></div>
        <ol>
          <li><strong>5 Min.</strong><span>Legal stehen: Winkel, Abstand, Füße und Kontakt.</span></li>
          <li><strong>10 Min.</strong><span>Am Ball: Roll, Pop, Slip, Reject und Re-Screen.</span></li>
          <li><strong>10 Min.</strong><span>Off-Ball lesen: Straight, Curl, Flare und Backdoor.</span></li>
          <li><strong>10 Min.</strong><span>Anwenden: DHO, Floppy und Spain PnR im 3-gegen-3.</span></li>
        </ol>
        <p class="screen-lesson-rule"><strong>Gemeinsame Regel:</strong> Erst Verteidiger lesen, dann die Lösung spielen. Der Name der Aktion ist kein Automatismus.</p>
      </section>
      <section class="screen-core" aria-labelledby="screen-core-title">
        <div class="section-head compact"><div><span class="section-kicker">Auf dem Feld zeigen</span><h3 id="screen-core-title">Kernaktionen für Dienstag</h3></div></div>
        <div class="screen-core-grid" data-role="screen-core"></div>
      </section>
      <section class="screen-reference" aria-labelledby="screen-reference-title">
        <div class="section-head compact"><div><span class="section-kicker">Nachschlagewerk</span><h3 id="screen-reference-title">Alle Screen-Varianten</h3></div></div>
        <label class="screen-search"><span class="visually-hidden">Screen suchen</span><input type="search" data-role="screen-search" placeholder="z. B. Floppy, Slip oder Handoff …"></label>
        <div class="screen-filters" data-role="screen-filters"><button type="button" class="active" data-category="">Alle</button></div>
        <p class="muted screen-result" data-role="screen-result"></p>
        <div class="screen-reference-grid" data-role="screen-reference"></div>
      </section>`;
    target.append(root);

    const createCard = (item, compact = false) => {
      const article = document.createElement('article');
      article.className = compact ? 'screen-card screen-card-core' : 'screen-card';
      const category = CATEGORIES.find(([id]) => id === item.category)?.[1] || 'Screen';
      article.innerHTML = `<span class="screen-card-category"></span><h4></h4><p class="screen-card-short"></p><details><summary>Erklärung und Reads</summary><p class="screen-card-description"></p><div class="screen-card-lists"></div></details>${item.demo ? '<button type="button" class="btn small primary" data-demo>▶ Im Taktikboard zeigen</button>' : ''}`;
      article.querySelector('.screen-card-category').textContent = category;
      article.querySelector('h4').textContent = item.title;
      article.querySelector('.screen-card-short').textContent = item.short;
      article.querySelector('.screen-card-description').textContent = item.description;
      const lists = article.querySelector('.screen-card-lists');
      if (item.reads?.length) {
        const group = document.createElement('div');
        group.innerHTML = '<strong>Reads</strong>';
        const list = document.createElement('ul');
        item.reads.forEach(value => { const li = document.createElement('li'); li.textContent = value; list.append(li); });
        group.append(list); lists.append(group);
      }
      if (item.coaching?.length) {
        const group = document.createElement('div');
        group.innerHTML = '<strong>Coaching</strong>';
        const list = document.createElement('ul');
        item.coaching.forEach(value => { const li = document.createElement('li'); li.textContent = value; list.append(li); });
        group.append(list); lists.append(group);
      }
      article.querySelector('[data-demo]')?.addEventListener('click', () => {
        const board = BT.tactics.normalizeBoard(buildDemo(item.id));
        BT.storage.setSetting('tacticsBoardDraft', board);
        location.hash = '#/tactics';
      });
      return article;
    };

    const coreGrid = root.querySelector('[data-role="screen-core"]');
    ITEMS.filter(item => item.core).forEach(item => coreGrid.append(createCard(item, true)));

    const filters = root.querySelector('[data-role="screen-filters"]');
    CATEGORIES.forEach(([id, label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.category = id; button.textContent = label;
      filters.append(button);
    });
    const state = { category: '', query: '' };
    const renderReference = () => {
      const query = state.query.trim().toLowerCase();
      const matches = ITEMS.filter(item => (!state.category || item.category === state.category)
        && (!query || `${item.title} ${item.short} ${item.description} ${(item.reads || []).join(' ')}`.toLowerCase().includes(query)));
      const grid = root.querySelector('[data-role="screen-reference"]');
      grid.replaceChildren();
      matches.forEach(item => grid.append(createCard(item)));
      root.querySelector('[data-role="screen-result"]').textContent = `${matches.length} von ${ITEMS.length} Möglichkeiten`;
      filters.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.category === state.category));
    };
    root.querySelector('[data-role="screen-search"]').addEventListener('input', event => { state.query = event.target.value; renderReference(); });
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.dataset.category;
      renderReference();
    });
    renderReference();
    return root;
  }

  return Object.freeze({ categories: CATEGORIES, catalog: ITEMS, buildDemo, nextTuesdayLabel, render });
})();
