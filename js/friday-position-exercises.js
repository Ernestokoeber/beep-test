// Original CourtHub coaching cards: 20 move families × 5 tasks per role. Coaches adapt the
// suggested volume and review the card before use. No player plans are changed.
window.BT = window.BT || {};
BT.fridayPositionExercises = (() => {
  const roles = {pg:'Point Guard',sg:'Shooting Guard',sf:'Small Forward',pf:'Power Forward',c:'Center'};
  const skills = {dribbling:'Ballführung Dribbling',drive:'Zug zum Korb',decision:'Entscheidungen',footwork:'Fußarbeit Footwork',post:'Post-Moves',passing:'Passen',shooting:'Wurf Abschluss',defense:'Verteidigung'};
  const cards = [];
  function add(position, card) {
    const number = cards.filter(row => row.primaryPosition === position).length + 1;
    const code = 'FR-' + position.toUpperCase() + String(number).padStart(2, '0');
    const {players=2, minutes=8, level='Aufbau', read, cues, errors, measure, ...content} = card;
    cards.push({
      ...content, id:'friday-'+position+'-'+String(number).padStart(2,'0'), code,
      primaryPosition:position, positions:[position], collection:'friday-moves',
      aliases:[roles[position],position.toUpperCase(),'Freitag','Positionsmoves',...(card.tags||[]).map(tag=>skills[tag]||tag)],
      entryKind:'exercise', reviewStatus:'review', builtIn:true, version:1,
      source:'CourtHub Positionsmoves · 20.11.2026', minutes, level,
      playersMin:players, playersMax:players, helpersMin:0, solo:players===1,
      equipment:card.equipment || ['Basketball','Korb','Hütchen'],
      decisionCue:read, coachingPoints:cues, commonMistakes:errors,
      successIndicator:measure,
      repetitions:card.repetitions || 'Je Spieler 2 Serien à 3 Aktionen pro Seite. Nach jeder Aktion Rollen wechseln; 30 Sekunden Serienpause. Nach 8 Minuten beenden, bei langsamen Wechseln weniger Versuche.',
      fridayLoad:'Technik vor Tempo: kurze Aktionen, Rückweg gehen und vor dem nächsten Versuch erholen. Vor einem Wochenendspiel passive Verteidigung und weniger Versuche wählen; keine Zusatzläufe oder harten Kontakte.',
    });
  }

  // Point Guard: Ballführung, Tempowechsel und Entscheidungen mit Ball.
  add('pg', {
    name:'Hesitation: aufrichten und an der Hüfte vorbeiziehen', category:'Dribbling', tags:['dribbling','drive','decision'],
    goal:'Mit einem erkennbaren Tempowechsel den ersten Verteidigungsschritt auslösen.',
    setup:'2 Spieler am rechten Flügel: Angreifer mit Ball, Verteidiger eine Armlänge davor. Ein Hütchen markiert den Start; die Zone bleibt frei.',
    steps:['Mit der Außenhand langsam auf den Verteidiger zudribbeln und vor dessen Reichweite abbremsen.','Schultern und Blick kurz zum Korb anheben, während der Ball weiter seitlich gedribbelt wird.','Sobald der Verteidiger sich aufrichtet, Knie beugen und mit einem tiefen Dribbling an seiner äußeren Hüfte vorbeigehen.','Mit der korbfernen Hand abschließen; danach Rollen und Startseite wechseln.'],
    read:'Richtet sich der Verteidiger nicht auf und bleibt der Weg zu, Abstand halten statt den Drive zu erzwingen.',
    cues:['Der Ball bleibt beim Zögern im Dribbling.','Der erste Schritt gewinnt Raum, der zweite bringt Tempo.'],
    errors:['Den Ball beim Aufrichten tragen oder festhalten.','Nur schneller dribbeln, ohne den Körperrhythmus zu ändern.'],
    easier:'Verteidiger richtet sich nach jedem Zögern bewusst auf.', harder:'Verteidiger entscheidet frei, ob er reagiert oder den Weg schließt.',
    measure:'Je Seite 6 Versuche: gewonnene Hüftposition, Ballverluste und Treffer getrennt zählen.'
  });
  add('pg', {
    name:'In-and-Out: Richtungswechsel ohne Handwechsel', category:'Dribbling', tags:['dribbling','drive'],
    goal:'Die Verteidigung zur Mitte täuschen und mit derselben Hand außen vorbeiziehen.',
    setup:'2 Spieler am Flügel, 1 Ball. Ein Hütchen liegt außerhalb der Zone als Orientierung für den Täuschungspunkt.',
    steps:['Mit der rechten Hand und mäßigem Tempo das Hütchen ansteuern.','Den Ball mit der Hand oberhalb seiner Mitte nach innen führen; Blick und Schulter zeigen kurz zur Mitte.','Vor dem nächsten Bodenkontakt den Ball nach außen lenken und rechts am Verteidiger vorbeiziehen.','Den Ball am äußeren Körperrand schützen und kontrolliert abschließen; links spiegeln.'],
    read:'Nur außen beschleunigen, wenn der Verteidiger die Täuschung nach innen mitgeht.',
    cues:['Die Hand kommt nicht unter den Ball.','Schultertäuschung und Außenabdruck gehören zusammen.'],
    errors:['Den Ball seitlich festhalten und tragen.','Die Bewegung nur mit dem Handgelenk zeigen.'],
    easier:'Partner steht passiv und zeigt die Angriffsseite an.',harder:'Partner darf die Außenseite schließen; dann aus dem Drive heraus neu aufbauen.',
    measure:'6 Aktionen je Hand: legale Ballführung und freie Außenbahn vor dem Abschluss dokumentieren.'
  });
  add('pg', {
    name:'Crossover nach gebremstem Angriffsschritt', category:'Dribbling', tags:['dribbling','drive','footwork'],
    goal:'Einen seitlich mitgehenden Verteidiger durch Bremsen und tiefen Handwechsel schlagen.',
    setup:'2 Spieler oben an der Dreierlinie, 1 Ball. Zwei Hütchen markieren einen etwa 4 Meter breiten Angriffskorridor.',
    steps:['Mit zwei schnellen Dribblings eine Seite angreifen und den Verteidiger seitlich bewegen.','Auf dem äußeren Bein kontrolliert abbremsen und den Körperschwerpunkt absenken.','Den Ball tief vor den Knien zur anderen Hand wechseln und mit dem nächsten Schritt die neue Linie angreifen.','Nach höchstens zwei weiteren Dribblings abschließen; bei geschlossenem Weg sicher zurückziehen.'],
    read:'Die Richtung wechseln, wenn die Hüfte des Verteidigers bereits zur ersten Angriffsseite geöffnet ist.',
    cues:['Zuerst bremsen, dann den Ball umlenken.','Die Schulter bleibt beim Wechsel unter der Schulter des Verteidigers.'],
    errors:['Aufrecht über dem Ball stehen.','Den Crossover weit vor den Verteidiger legen.'],
    easier:'Verteidiger folgt der ersten Richtung ohne Ballgewinnversuch.',harder:'Verteidiger darf den Wechsel lesen und den Ball kontrolliert attackieren.',
    measure:'Pro Seite zählen: kontrollierter Stopp, geschützte Ballübergabe und gewonnene neue Angriffslinie.'
  });
  add('pg', {
    name:'Retreat und erneuter Angriff gegen engen Druck', category:'Dribbling', tags:['dribbling','decision'],
    goal:'Unter Druck Abstand schaffen und die offene Seite für den zweiten Angriff erkennen.',
    setup:'2 Spieler in einem 5 × 5 Meter großen Feld ohne Korb, 1 Ball. Eine Seite des Feldes dient als Ziellinie.',
    equipment:['Basketball','Hütchen'],
    steps:['Mit tiefem Schutzdribbling auf den Verteidiger zugehen und seitlichen Körperabstand halten.','Bei engem Druck zwei kurze Rückwärtsdribblings machen, ohne sich vom Spielfeld wegzudrehen.','Während des Rückzugs Blick nach vorn halten und die nachrückende Verteidigerposition prüfen.','Die offenere Seite mit einem Handwechsel angreifen und über die Ziellinie dribbeln; danach Rollen wechseln.'],
    read:'Folgt der Verteidiger nur auf einer Seite, die gegenüberliegende Lücke angreifen; bleibt er zurück, Raum sichern.',
    cues:['Rückzug bleibt tief und kontrolliert.','Die zweite Beschleunigung beginnt aus stabilem Stand.'],
    errors:['Blind rückwärts aus dem Feld laufen.','Beim Rückzug den Ball aufnehmen.'],
    easier:'Feld verbreitern und Druck erst nach dem ersten Vorwärtsdribbling erlauben.',harder:'Feld auf 4 × 4 Meter verkleinern; Verteidiger darf die Ziellinie aktiv schützen.',
    measure:'6 Durchgänge je Angriffsseite: erfolgreiche Ausgänge und Ballaufnahmen unter Druck zählen.'
  });
  add('pg', {
    name:'Behind-the-Back als Schutzwechsel im Lauf', category:'Dribbling', tags:['dribbling','footwork'],
    goal:'Den Ball vor einem seitlich erreichenden Verteidiger auf die geschützte Hand bringen.',
    setup:'2 Spieler im 4 Meter breiten Korridor von der Mittellinie zur Dreierlinie, 1 Ball. Verteidiger startet seitlich versetzt.',
    equipment:['Basketball','Hütchen'],
    steps:['Mit der zum Verteidiger gewandten Hand in lockerem Tempo anlaufen.','Sobald der Verteidiger neben die Dribbelhand kommt, den Körper zwischen Gegner und Ball bringen.','Den Ball hinter der Hüfte mit einem Bodenkontakt zur freien Hand führen und in derselben Laufrichtung bleiben.','Mit der neuen Außenhand bis zur Ziellinie weiterdribbeln; beim Rückweg Positionen tauschen.'],
    read:'Der Schutzwechsel reagiert auf seitlichen Druck; bei freier Bahn einfach weiterdribbeln.',
    cues:['Blick bleibt auf dem Weg nach vorn.','Der Ball landet seitlich der neuen Hand, nicht unter den Füßen.'],
    errors:['Für den Wechsel komplett stehen bleiben.','Den Ball hoch hinter dem Rücken werfen.'],
    easier:'Zuerst im Gehen gegen einen passiven Begleiter üben.',harder:'Verteidiger wechselt während des Laufs einmal die Druckseite.',
    measure:'Je Richtung 6 Läufe: Ball bleibt im Korridor und der Blick überwiegend oben; Verluste notieren.'
  });
  add('pg', {
    name:'Reject: den angebotenen Ballblock ablehnen', category:'Entscheidungen', tags:['dribbling','drive','decision'],players:3,
    goal:'Eine übertriebene Ausrichtung zum Block mit dem Drive auf der Gegenseite bestrafen.',
    setup:'3 Spieler: Ballhandler oben, Blocksteller am rechten Slot und Ballverteidiger. Ein Korb; der Block wird kontaktarm und rechtzeitig gestellt.',
    steps:['Mit Blick zum Block langsam nach rechts andribbeln und dessen Nutzung glaubhaft vorbereiten.','Prüfen, ob der Verteidiger seinen oberen Fuß zur Blockseite versetzt.','Bei offener linker Bahn tief zur freien Hand wechseln und ohne Block nach links ziehen.','Am Korb mit geschütztem Ball abschließen; danach alle drei Rollen wechseln.'],
    read:'Übernimmt der Verteidiger die Gegenseite, den Reject nicht erzwingen, sondern den stehenden Block nutzen.',
    cues:['Erst den Block verkaufen, dann die Gegenrichtung nehmen.','Nicht in einen bereits stehenden Verteidiger hineinlaufen.'],
    errors:['Den Reject schon vor der Verteidigerreaktion festlegen.','Zu weit vom Block entfernt starten.'],
    easier:'Verteidiger stellt den oberen Fuß sichtbar zur Blockseite.',harder:'Verteidiger entscheidet zwischen Blockseite und Reject-Seite.',
    measure:'In 12 Aktionen die passende Seitenentscheidung und Ballverluste erfassen; Treffer separat zählen.'
  });
  add('pg', {
    name:'Snake-Dribbling hinter dem Ballblock', category:'Entscheidungen', tags:['dribbling','decision','footwork'],players:4,
    goal:'Nach dem Block die Spur wechseln und den nachlaufenden Verteidiger hinter sich halten.',
    setup:'4 Spieler: Ballhandler, Blocksteller, nachlaufender Guard-Verteidiger und zurückweichender Korbverteidiger. Start am rechten Slot.',
    steps:['Den rechtzeitig stehenden Block eng nutzen und den Ball vor der Reichweite des Verfolgers schützen.','Sobald der Verfolger hinter dem Körper bleibt, mit einem flachen Bogen zur Mitte kreuzen.','Den Korbverteidiger ansehen und das Dribbling bis zum freien Abschlussfenster am Leben halten.','Bei zurückweichendem Big einen kurzen kontrollierten Wurf nehmen; bei dessen Schritt nach vorn zum Rollspieler passen.'],
    read:'Nur die Spur kreuzen, solange zwischen den Verteidigern Platz ist; keine geschlossene Lücke erzwingen.',
    cues:['Der Bogen bleibt flach und der Blick am zweiten Verteidiger.','Ohne Halten oder Zurückdrücken Abstand zum Verfolger steuern.'],
    errors:['Den Rollweg des eigenen Mitspielers blockieren.','Vor dem Lesen des Bigs den Ball aufnehmen.'],
    easier:'Beide Verteidiger bewegen sich nur geführt und ohne Steal.',harder:'Korbverteidiger variiert zwischen Rückzug und kurzem Heraustreten.',
    measure:'12 Aktionen: freie Wurf- oder Passentscheidung, verlorene Dribblings und gelungene Anschlüsse getrennt zählen.'
  });
  add('pg', {
    name:'Split gegen eine offene Hedge-Lücke', category:'Entscheidungen', tags:['dribbling','decision','drive'],players:4,level:'Fortgeschritten',
    goal:'Eine tatsächlich offene Lücke zwischen zwei herauskommenden Verteidigern nutzen.',
    setup:'4 Spieler im hohen Pick-and-Roll. Beide Verteidiger beginnen passiv; zwei Hütchen markieren eine breite, ohne Kontakt passierbare Lücke.',
    steps:['Den stehenden Block eng anlaufen und den zweiten Verteidiger früh ansehen.','Nur bei klar freiem Durchgang den Ball mit einem tiefen Dribbling vor dem Körper durch die Lücke führen.','Mit schmalem, kontrolliertem Schritt durchgehen und den Ball erst hinter den Verteidigern aufnehmen.','Zum Korb weiterziehen oder bei geschlossener Lücke mit aktivem Dribbling zurückweichen; Rollen wechseln.'],
    read:'Schließen sich die Verteidiger, ist Rückzug die richtige Lösung; kein Durchzwängen zwischen Körpern.',
    cues:['Lücke zuerst sehen, dann handeln.','Ball tief halten und nach dem Durchbruch wieder aufrichten.'],
    errors:['Den Split gegen jede Verteidigerstellung probieren.','Mit dem Oberkörper voraus in Kontakt springen.'],
    easier:'Durchgang mit Hütchen ohne Verteidigerdruck üben.',harder:'Verteidiger öffnen oder schließen den Durchgang vor dem letzten Annäherungsdribbling.',
    measure:'Von 12 Entscheidungen offene Lücken genutzt und geschlossene Lücken korrekt abgebrochen zählen.'
  });
  add('pg', {
    name:'Pocket-Pass nach dem ersten Dribbling am Block', category:'Passen', tags:['passing','decision'],players:4,
    goal:'Den abrollenden Mitspieler durch das kurze Passfenster zwischen den Verteidigern bedienen.',
    setup:'4 Spieler im hohen Pick-and-Roll: zwei Angreifer, zwei geführte Verteidiger; 1 Korb und 1 Ball.',
    steps:['Den stehenden Block nutzen und den zweiten Verteidiger mit dem Dribbling kurz binden.','Die Hände des Rollspielers und den Zwischenraum unter den Verteidigerarmen sehen.','Aus der Außenhand einen kurzen Bodenpass vor den Lauf des Rollspielers spielen, ohne auszuholen.','Rollspieler fängt und schließt ab; bei geschlossenem Fenster bleibt der Guard im Dribbling.'],
    read:'Der Pass folgt dem freien Fenster; ein Verteidigerfuß in der Linie bedeutet weiterspielen statt durchpassen.',
    cues:['Passpunkt liegt vor dem Lauf, nicht hinter dem Rollspieler.','Schultern bleiben zum Korb orientiert.'],
    errors:['Zu früh vor dem Abrollen passen.','Den Ball unter den Füßen des Empfängers aufspringen lassen.'],
    easier:'Nur der Big-Verteidiger zeigt eine passive Hand.',harder:'Beide Verteidiger dürfen Passfenster schließen; Abschluss oder Rückzug als Alternative erlauben.',
    measure:'12 Angriffe: fangbare Pässe im Lauf, richtige Abbrüche und abgefangene Bälle erfassen.'
  });
  add('pg', {
    name:'Skip-Pass aus dem Drive zur ballfernen Seite', category:'Passen', tags:['passing','decision','drive'],players:3,
    goal:'Die einrückende Hilfe mit einem präzisen Pass zur schwachen Seite überspielen.',
    setup:'3 Spieler: Guard oben mit Ball, Empfänger am gegenüberliegenden Flügel, Helfer am Zonenrand. Ein Korb.',
    steps:['Die freie Außenbahn mit zwei kontrollierten Dribblings angreifen.','Im Dribbling beobachten, ob die Hilfe den Empfänger verlässt und zur Zone rückt.','Vor dem dichten Verkehr stoppen und einen direkten Überkopf- oder Schulterpass zum freien Flügel spielen.','Empfänger fängt in Wurfbereitschaft; bleibt die Hilfe draußen, beendet der Guard den Drive selbst.'],
    read:'Erst zur ballfernen Seite passen, wenn deren Verteidiger tatsächlich hilft.',
    cues:['Den Pass vor der Absprungentscheidung planen.','Ball zügig und ohne langen Bogen zum Ziel bringen.'],
    errors:['Blind im Sprung quer über das Feld passen.','Den Empfänger hinter dessen Körper anspielen.'],
    easier:'Hilfe zeigt ihre Entscheidung früh und spielt keinen Steal.',harder:'Hilfe entscheidet spät; Empfänger darf seine Position für ein besseres Fenster verschieben.',
    measure:'12 Aktionen: passende Entscheidung und fangbare Pässe getrennt von Wurftreffern zählen.'
  });
  add('pg', {
    name:'Nash-Dribbling unter dem Korb mit Rückpass', category:'Entscheidungen', tags:['dribbling','passing','decision'],players:3,
    goal:'Unter dem Korb die Übersicht behalten, wenn der direkte Abschluss geschlossen wird.',
    setup:'3 Spieler: Guard am Flügel, Empfänger am gegenüberliegenden Slot und Helfer vor dem Korb. Laufweg unter dem Brett bleibt frei.',
    steps:['Zur Grundlinie ziehen und das Dribbling mit der Außenhand bis unter das Brett halten.','Wenn die Hilfe den Abschluss schließt, unter dem Korb weiterlaufen statt den Ball festzuhalten.','Auf der Gegenseite wieder zum Feld aufdrehen und das Rückpassfenster zum Slot suchen.','Den freien Mitspieler anspielen oder bei zurückweichender Hilfe selbst aus kurzer Distanz abschließen.'],
    read:'Der Ball bleibt lebendig, solange weder ein sicherer Abschluss noch ein freier Pass vorhanden ist.',
    cues:['Unter dem Brett nicht blind abspringen.','Kopf zur Spielfeldmitte drehen, bevor der Rückpass kommt.'],
    errors:['Hinter der Grundlinie weiterdribbeln.','Vor dem Pass den Rücken zum Empfänger behalten.'],
    easier:'Helfer steht fest und der Empfänger bleibt am Slot.',harder:'Empfänger verschiebt zwischen Slot und Flügel; Helfer darf Passwege zeigen.',
    measure:'Je Seite 6 Aktionen: Ball im Feld gehalten, freie Anschlusslösung und Ballverluste dokumentieren.'
  });
  add('pg', {
    name:'Floater gegen den zurückweichenden Big', category:'Abschluss', tags:['drive','shooting','decision'],
    goal:'Vor dem Korbverteidiger mit kontrolliertem Bogen und dosierter Hand abschließen.',
    setup:'2 Spieler: Guard oben mit Ball, passiver Big an der vorderen Zone. Hütchen markieren einen Abschlussraum etwa 2 bis 3 Meter vor dem Korb.',
    steps:['Mit zwei zügigen Dribblings in die Zone angreifen und den Abstand zum Big prüfen.','Vor dessen Körper ausbalanciert bremsen und den letzten Dribbelkontakt dicht neben dem Fuß setzen.','Den Ball nach oben lösen, bevor der Verteidiger den Wurfarm erreichen kann; weich aus Fingern und Handgelenk werfen.','Kontrolliert landen und eigenen Rebound holen; danach Rollen wechseln und beide Hände erproben.'],
    read:'Bleibt der Big tief, Floater nutzen; kommt er früh hoch, abbremsen und den Versuch zurücksetzen.',
    cues:['Wurfkraft kommt aus dem ruhigen Bewegungsfluss.','Bogen erhöhen, ohne den Ball nach vorn zu stoßen.'],
    errors:['Mit voller Laufgeschwindigkeit in den Big springen.','Den Floater wie einen harten einhändigen Pass werfen.'],
    easier:'Ohne Verteidiger aus kurzer Distanz starten.',harder:'Big wechselt zwischen tiefem Rückzug und frühem Heraustreten.',
    measure:'6 Versuche pro Seite: Treffquote, stabile Landung und Würfe mit deutlich zu viel Kraft notieren.'
  });
  add('pg', {
    name:'Früher Abschluss vom gleichseitigen Bein', category:'Abschluss', tags:['drive','footwork','decision'],level:'Fortgeschritten',
    goal:'Den Blockrhythmus des Verfolgers mit einem früheren einbeinigen Abschluss verändern.',
    setup:'2 Spieler am Flügel, Verteidiger einen halben Schritt hinter dem Angreifer. Ein Korb; kein Blockversuch in den Körper.',
    steps:['Mit einem geschützten Dribbling einen kleinen Vorsprung herstellen.','Den Ball nach dem letzten Dribbling bewusst früh sichern und die Fußfolge langsam vorbereiten.','Rechts aus kurzer Distanz vom rechten Bein mit rechts abschließen; links entsprechend vom linken Bein.','Den Ball früh und weich lösen und ohne zusätzlichen Bodenkontakt vor dem Abwurf landen lassen.'],
    read:'Die frühe Variante nutzen, wenn der Verfolger den gewohnten späten Absprung erwartet.',
    cues:['Erst den Ablauf im Gehen beherrschen.','Ballaufnahme, Schritte und Abwurf müssen zusammenpassen.'],
    errors:['Nach der Ballaufnahme zusätzliche kleine Schritte machen.','Nur höher springen statt früher abwerfen.'],
    easier:'Ohne Gegner aus einem langsamen Dribbling arbeiten.',harder:'Verfolger darf mit Abstand die Wurfhand zeigen; Angreifer wählt normalen oder frühen Rhythmus.',
    measure:'12 Aktionen: regelkonforme Schrittfolge, früher Abwurf und Treffer getrennt bewerten.'
  });
  add('pg', {
    name:'Tempo-Stopp mit Verteidiger im Rücken', category:'Entscheidungen', tags:['dribbling','decision','shooting'],
    goal:'Nach gewonnenem Vorsprung kontrollieren, ob ein kurzer Wurf oder erneuter Antritt frei wird.',
    setup:'2 Spieler am Slot, Verteidiger startet seitlich einen halben Schritt zurück. Ein Korb und ein Stoppbereich am Ellenbogen.',
    steps:['Den Vorsprung mit zwei Dribblings nutzen und die Schulter vor die Hüfte des Verfolgers bringen.','Vor dem Stoppbereich das Tempo reduzieren, dabei das Dribbling seitlich aktiv halten.','Kommt der Verfolger auf die Seite, erneut zum Korb beschleunigen; bleibt er mit Abstand dahinter, ausbalanciert hochgehen.','Einen kurzen Pull-up oder Korbleger spielen; beim nächsten Versuch die andere Seite nutzen.'],
    read:'Die Position des Verfolgers bestimmt, ob der zweite Antritt oder der kurze Wurf passt.',
    cues:['Mit dem eigenen Tempo arbeiten, nicht den Gegner festhalten.','Bremsen über Knie und Hüfte statt über einen steifen Oberkörper.'],
    errors:['Rückwärts in den Verteidiger springen.','Den Ball vor dem Tempowechsel aufnehmen.'],
    easier:'Verfolger hält eine Armlänge Abstand.',harder:'Verfolger entscheidet frei zwischen seitlichem Aufschließen und Zurückbleiben.',
    measure:'Je Seite 6 Aktionen: Vorsprung gehalten, passende Fortsetzung und kontrollierte Landung zählen.'
  });
  add('pg', {
    name:'Drag-Screen im frühen Ballvortrag', category:'Entscheidungen', tags:['dribbling','passing','decision'],players:4,
    goal:'Einen nachrückenden Block nutzen, bevor die Verteidigung geordnet steht.',
    setup:'4 Spieler auf einer Feldhälfte: Guard mit Ball an der Mittellinie, nachrückender Blocksteller und zwei Verteidiger. Ein Korb.',
    steps:['Mit Blick nach vorn seitlich zur Mitte vordribbeln und den nachrückenden Mitspieler lokalisieren.','Das Tempo kurz drosseln, bis der Blocksteller rechtzeitig stabil steht.','Den Block eng nutzen und den Big-Verteidiger mit einem weiteren Dribbling binden.','Bei offener Korblinie selbst abschließen, andernfalls zum freien Rollspieler passen; gemeinsam zurückgehen.'],
    read:'Ein noch laufender Block ist kein Startsignal; ohne stehenden Block den Ball sichern und neu ansetzen.',
    cues:['Tempo koordinieren, damit der Block vor der Nutzung steht.','Den freien Raum früh sehen und den Ball nicht überdribbeln.'],
    errors:['Vollgas in den noch laufenden Mitspieler dribbeln.','Automatisch passen, obwohl die eigene Korblinie frei ist.'],
    easier:'Verteidiger spielen nur die vorgegebene Rückzugsbewegung.',harder:'Big-Verteidiger entscheidet zwischen Absinken und Ballübernahme.',
    measure:'12 Angriffe: Blocktiming und passende Abschluss- oder Passentscheidung festhalten.'
  });
  add('pg', {
    name:'Hand-off ablehnen und zurück zum Ball schneiden', category:'Footwork', tags:['footwork','drive','decision'],players:3,
    goal:'Übertriebene Verteidigung der Ballübergabe durch einen Richtungswechsel bestrafen.',
    setup:'3 Spieler: Guard am Flügel ohne Ball, Übergabespieler am Ellenbogen mit Ball und Guard-Verteidiger. Ein Korb.',
    steps:['Mit offenem Blick auf den Ball zur angekündigten Übergabe anlaufen.','Wenn der Verteidiger die Übergabeseite vorwegnimmt, mit kurzem Bodenkontakt abbremsen.','Hinter dem Verteidiger zum Korb schneiden und beide Hände als Passziel zeigen.','Pass im Lauf sichern und weich abschließen; bleibt der Verteidiger zurück, die normale Übergabe nehmen.'],
    read:'Der Schnitt entsteht aus der Verteidigerposition und wird mit dem Ballhalter per Blickkontakt abgestimmt.',
    cues:['Richtungswechsel aus tiefer Hüfte.','Erst das freie Fenster sehen, dann den Pass fordern.'],
    errors:['Schneiden, bevor der Ballhalter hinsieht.','Den Verteidiger mit dem Arm wegziehen.'],
    easier:'Verteidiger kündigt das Überlaufen vorher an.',harder:'Verteidiger wählt Übergabeverfolgung oder frühes Abschneiden.',
    measure:'12 Anläufe: passend gewählte Übergabe oder Schnitt und fangbare Pässe zählen.'
  });
  add('pg', {
    name:'Trap-Ausgang mit Rückzug und Passwinkel', category:'Passen', tags:['passing','dribbling','decision'],players:4,
    goal:'Gegen zwei Druckverteidiger einen sicheren Passwinkel schaffen.',
    setup:'4 Spieler nahe einer Seitenlinie: Guard mit Ball, zwei passive Trap-Verteidiger und Ausstiegspartner zur Feldmitte. Kein Korb nötig.',
    equipment:['Basketball','Hütchen'],
    steps:['Die Trap langsam anlaufen und den Raum zur Seitenlinie bewusst wahrnehmen.','Vor dem Schließen ein tiefes Rückwärtsdribbling setzen und die Schultern zur Feldmitte öffnen.','Den Ausstiegspartner ansehen, gegebenenfalls mit einer kurzen Passtäuschung eine Verteidigerhand verschieben.','Den Ball mit sicherem Boden- oder Schulterpass aus dem Druck spielen; bei verdecktem Ziel weiter Abstand schaffen.'],
    read:'Der sichere Pass in die Mitte hat Vorrang vor einem Sprungpass über vier Hände.',
    cues:['Dribbling nicht unnötig früh beenden.','Zwischen Ball und Außenlinie einen kontrollierbaren Raum lassen.'],
    errors:['In die Ecke weiterdribbeln.','Blind aus dem Sprung über den Trap werfen.'],
    easier:'Trap lässt eine deutlich sichtbare Passgasse frei.',harder:'Ausstiegspartner bewegt sich und beide Verteidiger schließen wechselnde Linien.',
    measure:'12 Trap-Situationen: sichere Ausstiegspässe, Ballverluste und vorzeitig beendete Dribblings zählen.'
  });
  add('pg', {
    name:'Re-Screen lesen und die zweite Richtung angreifen', category:'Entscheidungen', tags:['dribbling','decision','passing'],players:4,
    goal:'Nach verteidigtem ersten Block den neu gesetzten Winkel mit passendem Timing nutzen.',
    setup:'4 Spieler im hohen Pick-and-Roll. Der Blocksteller darf nach dem ersten Abbruch ohne Kontakt den Winkel neu setzen.',
    steps:['Den ersten stehenden Block nutzen und bei geschlossenem Weg mit aktivem Dribbling seitlich zurückziehen.','Dem Blocksteller Raum geben, damit er für die Gegenrichtung neu und stabil stehen kann.','Erst dann die Richtung wechseln und eng am neuen Block vorbeigehen.','Zwischen eigenem Abschluss und Pass zum abrollenden Mitspieler wählen; danach Rollen tauschen.'],
    read:'Die zweite Richtung ist frei, wenn der Ballverteidiger noch zur ersten Seite orientiert ist.',
    cues:['Neu stellen lassen statt am bewegten Block vorbeiziehen.','Den zweiten Angriff mit verändertem Tempo beginnen.'],
    errors:['Zu früh umdrehen und einen bewegten Block erzeugen.','Beim Rückzug den Korb aus dem Blick verlieren.'],
    easier:'Verteidigung schließt den ersten und öffnet den zweiten Weg vorgegeben.',harder:'Verteidigung darf auch beim zweiten Block zwischen Absinken und Übernahme wählen.',
    measure:'12 Abläufe: stabiler zweiter Block, richtiger Startzeitpunkt und freie Anschlussaktion dokumentieren.'
  });
  add('pg', {
    name:'Einhändiger Push-Pass aus dem Vorwärtsdribbling', category:'Passen', tags:['passing','decision','dribbling'],players:3,
    goal:'Den freien Läufer früh bedienen, ohne den Ballvortrag durch einen Stopp zu verzögern.',
    setup:'3 Spieler von der Mittellinie: Guard mit Ball in der Mitte, Flügelläufer und Verteidiger in der Passlinie. Ein Korb.',
    steps:['Mit zwei kontrollierten Dribblings vorlaufen und den Flügelläufer im Augenwinkel behalten.','Beobachten, ob der Verteidiger den Ball angreift oder beim Läufer bleibt.','Bei freiem Fenster aus dem nächsten Dribbelkontakt einen einhändigen Druckpass vor den Läufer schieben.','Läufer fängt ohne Rückwärtsschritt und schließt ab; bei geschlossener Linie dribbelt der Guard weiter.'],
    read:'Der Pass kommt früh bei freier Linie, nicht automatisch nach einer festen Zahl von Dribblings.',
    cues:['Hand hinter dem Ball, Finger zeigen zum Ziel.','Passgeschwindigkeit an den Laufweg anpassen.'],
    errors:['Den Ball hinter den Läufer werfen.','Einen weiten Seitenpass durch den Verteidiger spielen.'],
    easier:'Verteidiger bleibt passiv auf einer vorgegebenen Spur.',harder:'Läufer verändert das Tempo und der Verteidiger entscheidet frei.',
    measure:'12 Ballvorträge: Pässe ohne Tempoverlust des Läufers und korrekte Nicht-Pässe zählen.'
  });
  add('pg', {
    name:'Pull-up nach seitlichem Bremsdribbling', category:'Wurf', tags:['shooting','dribbling','footwork'],
    goal:'Seitlich gewonnenen Abstand in einen balancierten kurzen Sprungwurf umsetzen.',
    setup:'2 Spieler am Slot: Guard mit Ball, Verteidiger folgt zunächst passiv. Ein Korb; Wurfbereich zunächst an der Freiwurflinie.',
    steps:['Mit einem schnellen Dribbling schräg zum Ellenbogen ziehen.','Vor dem Wurf die Hüfte absenken und mit einem letzten seitlichen Dribbling Abstand gewinnen.','Den Ball aufnehmen, mit klarer Eins-zwei-Fußfolge stoppen und den Körper zum Korb ausrichten.','Senkrecht hochgehen, weich landen und den Rebound holen; danach andere Seite und Rollenwechsel.'],
    read:'Bei bereits seitlich geschlossenem Wurffenster das Dribbling weiterführen statt in einen Contest zu springen.',
    cues:['Bremsen vor dem Hochgehen abschließen.','Landung möglichst nahe am Absprungpunkt halten.'],
    errors:['Im Wurf weiter seitlich kippen.','Nach der Ballaufnahme einen zusätzlichen Ausgleichsschritt setzen.'],
    easier:'Ohne Verteidiger aus kürzerer Distanz arbeiten.',harder:'Verteidiger variiert zwischen Verfolgen und seitlichem Schließen; Wurf oder Weiterdribbeln wählen.',
    measure:'Je Seite 6 Aktionen: stabile Stopps, passende Wurfauswahl und Trefferquote getrennt festhalten.'
  });

  // Shooting Guard: Freilaufen, Wurfvorbereitung und Anschlussaktionen.
  add('sg', {
    name:'V-Cut in den fangbereiten Wurf',category:'Wurf',tags:['shooting','footwork'],players:3,
    goal:'Mit einem deutlichen Laufwinkel ein freies Fangfenster am Flügel schaffen.',
    setup:'3 Spieler: Schütze am Flügel, Passgeber oben und passiver Verteidiger am Schützen. Ein Korb; Startdistanz im sicheren Wurfbereich.',
    steps:['Zwei ruhige Schritte zur Zone gehen, damit der Verteidiger die innere Richtung mitnimmt.','Mit tiefem Körperschwerpunkt auf dem inneren Bein abbremsen und diagonal zum Flügel herauslösen.','Hände rechtzeitig zeigen, im freien Fenster fangen und die Füße zum Korb stellen.','Ohne Zusatzdribbling werfen, Rebound sichern und die drei Rollen wechseln.'],
    read:'Bleibt der Verteidiger im Fangfenster, den Pass nicht erzwingen; erneut Abstand schaffen.',
    cues:['Richtungswechsel zeigt ein klares V.','Die Wurfvorbereitung beginnt vor dem Fangen.'],errors:['Nur seitlich neben dem Verteidiger herlaufen.','Den Ball mit geraden Beinen erwarten.'],
    easier:'Ohne Verteidiger erst Laufweg und Passzeitpunkt verbinden.',harder:'Verteidiger darf das Fangfenster schließen; Schütze muss neu lösen.',
    measure:'12 Anläufe: freie Fänge, Würfe ohne Nachsortieren der Füße und Treffer zählen.'
  });
  add('sg', {
    name:'L-Cut aus der Grundlinie zum Flügel',category:'Footwork',tags:['footwork','shooting'],players:3,
    goal:'Durch einen rechtwinkligen Richtungswechsel aus enger Begleitung freikommen.',
    setup:'3 Spieler: Schütze an der Grundlinie, Begleitverteidiger und Passgeber oben. Ein Hütchen am Zonenrand markiert den Knick.',
    steps:['Von der Grundlinie mit ruhigem Tempo zum Hütchen laufen und den Verteidiger mitnehmen.','Vor dem Knick Hüfte absenken und mit zwei kurzen Bodenkontakten in Richtung Flügel umlenken.','Zum Passgeber aufdrehen, die Hände zeigen und den Ball außerhalb der Verteidigerreichweite fangen.','Aus sicherer Distanz werfen oder bei dichtem Nachlaufen mit einem Dribbling nach innen abschließen.'],
    read:'Abstand nach dem Fang entscheidet zwischen direktem Wurf und Anschlussdribbling.',
    cues:['Den Knick eng und ohne weiten Bogen laufen.','Ball und Korb möglichst früh gleichzeitig sehen.'],errors:['Zu früh nach außen drehen.','Nach dem Knick auf den Pass warten statt weiterzulaufen.'],
    easier:'Verteidiger begleitet nur bis zum Knick.',harder:'Verteidiger folgt bis zum Fang und verändert den Abstand.',
    measure:'Je Seite 6 Läufe: Abstand am Fang, passende Fortsetzung und Ballverluste dokumentieren.'
  });
  add('sg', {
    name:'Curl um den Pin-down mit kurzem Abschluss',category:'Abschluss',tags:['footwork','drive','decision'],players:4,
    goal:'Einen eng folgenden Verteidiger mit einem Bogen zum Korb abschütteln.',
    setup:'4 Spieler: Schütze an der Grundlinie, stehender Blocksteller am Zonenrand, Verfolger und Passgeber oben. Ein Korb.',
    steps:['Auf den rechtzeitig stehenden Block zulaufen und den Verfolger hinter der Schulter lokalisieren.','Bei engem Nachlaufen mit der inneren Schulter dicht am Block vorbeischneiden und zur Zone eindrehen.','Den Pass vor dem Körper im Lauf sichern und mit kurzem legalem Abschlussrhythmus zum Korb gehen.','Weich vom Brett abschließen; danach alle Rollen wechseln und andere Seite nutzen.'],
    read:'Der Curl passt gegen einen Verfolger; läuft der Verteidiger vor dem Block durch, außen frei werden.',
    cues:['Eng am Block, ohne den Mitspieler zu berühren.','Fang und erster Korbschritt bleiben im Fluss.'],errors:['Einen weiten Bogen um den Block laufen.','Den Pass hinter dem Körper fangen.'],
    easier:'Verfolger läuft den vorgegebenen Weg ohne Steal.',harder:'Verteidiger wählt Nachlaufen oder Abkürzen; Schütze entscheidet Curl oder Außenlösung.',
    measure:'12 Anläufe: richtige Laufentscheidung, freie Fänge und kontrollierte Abschlüsse zählen.'
  });
  add('sg', {
    name:'Fade hinter dem Block gegen die Abkürzung',category:'Wurf',tags:['shooting','footwork','decision'],players:4,
    goal:'Einen unter dem Block abkürzenden Verteidiger durch seitliches Absetzen bestrafen.',
    setup:'4 Spieler mit Pin-down am linken Flügel: Schütze, stehender Blocksteller, Verteidiger und Passgeber oben. Ein Korb.',
    steps:['Den Block anlaufen und prüfen, ob der Verteidiger innen am Block vorbeigeht.','Vor dem Block seitlich nach außen lösen und das neue Passfenster mit den Händen zeigen.','Den Pass mit balanciertem Einsprung oder Eins-zwei-Stopp fangen und zum Korb ausrichten.','Aus beherrschter Distanz werfen; bei engem Closeout den Versuch abbrechen und neu aufbauen.'],
    read:'Nur nach außen absetzen, wenn der Verteidiger innen abkürzt und der Passweg frei bleibt.',
    cues:['Abstand zum Verteidiger gewinnen, ohne rückwärts blind zu springen.','Füße vor dem Abwurf zum Ziel ordnen.'],errors:['Sich zu weit außerhalb der eigenen Wurfreichweite lösen.','Mit dem Rücken zur Passseite weggehen.'],
    easier:'Verteidiger nimmt immer den inneren Weg.',harder:'Verteidiger variiert; Schütze wählt Fade oder Curl.',
    measure:'12 Läufe: passende Reaktion auf den Verteidigerweg, freie Fangfenster und Wurfbalance erfassen.'
  });
  add('sg', {
    name:'Pin-down verwerfen und hinter dem Top-Lock schneiden',category:'Footwork',tags:['footwork','decision','drive'],players:4,
    goal:'Gegen einen oberhalb stehenden Verteidiger den freien Weg zum Korb finden.',
    setup:'4 Spieler: Schütze an der Grundlinie, Blocksteller am Zonenrand, oben abschirmender Verteidiger und Passgeber am Slot.',
    steps:['Mit Blickkontakt zum Passgeber die normale Route zum Block antäuschen.','Sperrt der Verteidiger den oberen Weg, auf dem äußeren Bein abbremsen.','Hinter dessen Rücken direkt zum Korb schneiden und eine Hand als Passziel zeigen.','Den Pass erst im freien Fenster fordern und mit der korbfernen Hand abschließen.'],
    read:'Steht der Verteidiger nicht im oberen Weg, den normalen Blocklauf nutzen statt blind backdoor zu schneiden.',
    cues:['Passgeber muss den Richtungswechsel sehen.','Der Schnitt läuft am Gegner vorbei und nicht durch ihn hindurch.'],errors:['Ohne Sichtkontakt losschneiden.','In die Position des Blockstellers laufen.'],
    easier:'Verteidiger hält den Top-Lock sichtbar und passiv.',harder:'Verteidiger entscheidet vor dem Knick zwischen Verfolgen und Top-Lock.',
    measure:'12 Läufe: korrekt gewählter Weg und Zuspiele ohne nachträglichen Richtungswechsel zählen.'
  });
  add('sg', {
    name:'Lift aus der Ecke bei Drive zur Mitte',category:'Wurf',tags:['shooting','footwork','decision'],players:3,
    goal:'Durch Aufrücken aus der Ecke ein freies Rückpassfenster zum Dribbler schaffen.',
    setup:'3 Spieler: Schütze in der Ecke, Dribbler am Flügel und Helfer am Zonenrand. Ein Korb.',
    steps:['In der Ecke wurfbereit bleiben, bis der Mitspieler den Drive zur Mitte beginnt.','Wenn der Helfer zum Ball sinkt, entlang der Seitenlinie zum freien Flügel aufrücken.','Im Blickfeld des Dribblers stoppen, Hände zeigen und den Rückpass fangen.','Mit vorbereiteten Füßen werfen; bleibt der Helfer am Schützen, hält dieser den Abstand zum Drive.'],
    read:'Das Aufrücken folgt dem freien Passwinkel und darf nicht den Laufweg des Dribblers schließen.',
    cues:['Mit dem Drive zeitlich mitgehen.','Nach dem Fang bleibt der Ball vor der Wurfschulter.'],errors:['Schon vor dem Drive loslaufen.','Zu nah zum Ball aufrücken und die Räume verkleinern.'],
    easier:'Helfer rückt bei jedem Drive deutlich ein.',harder:'Helfer bleibt wechselweise am Schützen; bei dichtem Closeout ein Anschlussdribbling erlauben.',
    measure:'12 Angriffe: sichtbare freie Passlinie, Fänge in Balance und passende Wurfentscheidung erfassen.'
  });
  add('sg', {
    name:'Drift zur freien Ecke bei Grundliniendrive',category:'Wurf',tags:['shooting','footwork','decision'],players:3,
    goal:'Den Schützen hinter der helfenden Verteidigung als Grundlinienziel verfügbar halten.',
    setup:'3 Spieler: Schütze am ballfernen Flügel, Dribbler gegenüber und Helfer vor dem Korb. Ein Korb.',
    steps:['Beim ersten Grundliniendribbling des Mitspielers den Helfer und die freie Ecke prüfen.','Mit zwei bis drei kontrollierten Schritten zur ballfernen Ecke absenken.','Außerhalb der Zone stoppen und das diagonale Passfenster mit beiden Händen anbieten.','Den Pass fangen und aus eigener Reichweite werfen; wenn keine Linie frei wird, die Breite halten.'],
    read:'Nur so weit absenken, dass der Dribbler den Pass ohne Wurf durch den Helfer spielen kann.',
    cues:['Zum Ball aufgedreht bewegen.','Abstand zum Korb und zur Außenlinie kontrollieren.'],errors:['Hinter dem Brett verschwinden.','Im Passmoment noch mit gekreuzten Füßen laufen.'],
    easier:'Ohne Helfer zuerst Laufweg und Pass synchronisieren.',harder:'Helfer darf Grundlinienpass oder Korbweg schließen; beide Angreifer lesen gemeinsam.',
    measure:'Je Seite 6 Angriffe: nutzbare Passfenster und Fangbereitschaft getrennt von Treffern zählen.'
  });
  add('sg', {
    name:'Hand-off eng nehmen und die Ecke gewinnen',category:'Abschluss',tags:['drive','footwork','decision'],players:3,
    goal:'Nach einer Ballübergabe den seitlichen Vorsprung direkt zum Korb nutzen.',
    setup:'3 Spieler: Ballhalter am Ellenbogen, Schütze am Flügel und Verfolger. Ein Korb; Ballhalter bleibt bei möglichem Kontakt stabil stehen.',
    steps:['Die Übergabe mit einem kurzen Tempoantritt anlaufen.','Den Ball mit beiden Händen an der geschützten Körperseite übernehmen und eng am stehenden Mitspieler vorbeigehen.','Mit dem ersten Dribbling die äußere Hüfte des Verfolgers hinter sich bringen.','Bei freier Spur abschließen; schließt der Verfolger die Linie, mit aktivem Dribbling zurück zur Mitte lösen.'],
    read:'Ein eng folgender Verteidiger lädt zum direkten Drive ein; bei vorweggenommener Korblinie Raum sichern.',
    cues:['Keine Lücke zwischen eigener Schulter und Übergabespieler lassen.','Den Ball vor dem ersten Dribbling sicher übernehmen.'],errors:['Die Übergabe im weiten Bogen nehmen.','Den Ball seitlich offen zum Gegner halten.'],
    easier:'Verfolger startet einen Schritt später.',harder:'Verfolger darf vor oder hinter der Übergabe verteidigen.',
    measure:'12 Übergaben: sichere Ballübernahme, gewonnene Hüfte und Ballverluste notieren.'
  });
  add('sg', {
    name:'Backdoor aus enger Passverweigerung',category:'Footwork',tags:['footwork','drive','decision'],players:3,
    goal:'Überdruck in der Passlinie mit einem klar getimten Schnitt ausnutzen.',
    setup:'3 Spieler: Schütze am Flügel, Passgeber oben und Denial-Verteidiger zwischen Ball und Schütze. Ein Korb.',
    steps:['Einen Schritt zum Ball anbieten und den Verteidiger mit in die Passlinie ziehen.','Blickkontakt zum Passgeber halten und außen kurz abbremsen.','Hinter der vorgerückten Hüfte des Verteidigers zum Korb schneiden und die korbnahe Hand zeigen.','Bodenpass im Lauf sichern, legal abschließen und die Rollen wechseln.'],
    read:'Der Schnitt passt, wenn der Verteidiger die Ballseite überzieht; bei Abstand erst normal anbieten.',
    cues:['Erster Schritt nach dem Knick geht zum Korb.','Pass vor den Lauf fordern, nicht im Rücken.'],errors:['Richtung wechseln, während der Pass bereits unterwegs ist.','Vor dem Knick ohne Tempowechsel anlaufen.'],
    easier:'Verteidiger steht passiv in deutlicher Denial-Position.',harder:'Verteidiger variiert Nähe und Passverweigerung; normaler Fang bleibt möglich.',
    measure:'12 Angebote: korrekte Schnittentscheidungen, sichere Fänge und Schrittfehler getrennt zählen.'
  });
  add('sg', {
    name:'Rip-through unter der ausgestreckten Closeout-Hand',category:'Abschluss',tags:['drive','footwork','decision'],
    goal:'Nach dem Fang die offene Hüfte des Closeout-Verteidigers direkt angreifen.',
    setup:'2 Spieler: Schütze mit Eigenzuspiel am Flügel, Verteidiger startet am Zonenrand. Ein Korb.',
    steps:['Den Eigenpass balanciert fangen und den Korb ansehen.','Den Ball dicht unter den Händen des anlaufenden Verteidigers zur freien Hüftseite führen.','Vor dem Anheben des Standbeins den Ball zum Dribbelstart lösen und mit langem erstem Schritt vorbeiziehen.','Nach höchstens zwei Dribblings mit geschütztem Abschluss beenden.'],
    read:'Die Seite angreifen, auf der der Verteidiger zu weit vortritt; bei zurückhaltendem Closeout den freien Wurf erkennen.',
    cues:['Der Ball bleibt nahe am Körper.','Der erste Schritt gewinnt Raum neben der Hüfte.'],errors:['Den Ball in einem weiten Kreis vor dem Gegner schwenken.','Das Standbein vor dem Dribbelstart anheben.'],
    easier:'Verteidiger läuft langsam mit fest vorgegebenem Fuß an.',harder:'Verteidiger variiert Tempo und vorstehenden Fuß.',
    measure:'12 Fänge: legale Starts, gewonnene Hüftposition und kontrollierte Abschlüsse zählen.'
  });
  add('sg', {
    name:'Wurftäuschung und ein Dribbling zum Pull-up',category:'Wurf',tags:['shooting','footwork','decision'],
    goal:'Einen zu aggressiven Closeout mit kontrolliertem Seitenaustritt bestrafen.',
    setup:'2 Spieler am Flügel, 1 Ball und 1 Korb. Angreifer spielt sich den Ball selbst zu; Verteidiger läuft vom Zonenrand an.',
    steps:['Den Ball mit gebeugten Knien fangen und eine kurze glaubwürdige Wurftäuschung bis zum eigenen Wurfansatz zeigen.','Bleibt der Verteidiger in Vorwärtsbewegung, Ball vor dem Standbein-Abheben zum seitlichen Dribbling lösen.','Nach einem Dribbling mit klarer Fußfolge stoppen und die Brust wieder zum Korb richten.','Senkrecht werfen und in Balance landen; bei ausbleibender Reaktion den freien Ausgangswurf nehmen.'],
    read:'Die Täuschung dient einer Reaktion; ohne Reaktion und mit Platz ist der direkte Wurf möglich.',
    cues:['Bei der Täuschung auf dem Boden bleiben.','Nach dem Seitenaustritt erst bremsen, dann hochgehen.'],errors:['Mit der Wurftäuschung bereits abspringen.','Seitlich weiterdriften, während der Ball abgeworfen wird.'],
    easier:'Verteidiger reagiert immer mit hohem Arm und einem Schritt nach vorn.',harder:'Verteidiger kann zu Hause bleiben oder aggressiv anlaufen.',
    measure:'12 Aktionen: richtige Wahl, Schrittfolge und balancierte Landung getrennt von Treffern zählen.'
  });
  add('sg', {
    name:'Side-step aus dem seitlich vorbeilaufenden Closeout',category:'Wurf',tags:['shooting','footwork','decision'],
    goal:'Ein seitlich versetztes freies Wurffenster mit einem einzelnen Dribbling herstellen.',
    setup:'2 Spieler am Slot; Angreifer mit Eigenzuspiel, Verteidiger läuft schräg an. Wurfentfernung zunächst 4 Meter.',
    steps:['Eigenpass mit stabilen Füßen fangen und den Laufwinkel des Verteidigers erkennen.','Bei überspielter Wurflinie den Ball zum kurzen Seitwärtsdribbling lösen.','Mit einem seitlichen Eins-zwei-Stopp hinter dem neuen Ballkontakt zum Stillstand kommen.','Zum Korb ausrichten und werfen; bleibt der Verteidiger frontal, die Aktion sicher zurücksetzen.'],
    read:'Das Seitfenster ist nur frei, wenn der Verteidiger daran vorbeiläuft und kein zweiter Gegner dort steht.',
    cues:['Seitlich Raum gewinnen, nicht rückwärts unkontrolliert springen.','Der Ball bleibt beim Dribbling unter Kontrolle.'],errors:['Ohne Dribbling mit dem gehaltenen Ball zur Seite hüpfen.','Nach der Landung zusätzliche Füße setzen.'],
    easier:'Verteidiger läuft den gleichen schrägen Winkel vorgegeben.',harder:'Verteidiger darf rechtzeitig abbremsen; Schütze wählt direkten Wurf oder Side-step.',
    measure:'Je Seite 6 Aktionen: regelkonforme Seitenwechsel, freie Wurffenster und Treffer erfassen.'
  });
  add('sg', {
    name:'Eins-zwei-Pull-up aus dem Flügelangriff',category:'Wurf',tags:['shooting','footwork','dribbling'],players:1,
    goal:'Dribbling, Bremsen und Ballaufnahme zu einer reproduzierbaren Wurfbewegung verbinden.',
    setup:'1 Spieler mit Ball am Flügel, 1 Korb. Ein Hütchen markiert den Stoppraum am Ellenbogen, ein zweites den Start.',
    steps:['Mit zwei kontrollierten Dribblings vom Flügel schräg zum Hütchen ziehen.','Beim letzten Dribbling die Hüfte absenken und den Ball im vereinbarten Eins-zwei-Rhythmus aufnehmen.','Auf beiden Füßen stabil zum Korb ausgerichtet ankommen, ohne einen weiteren Korrekturschritt.','Den Wurf aus der Beinstreckung lösen, die Landung kurz halten und erst dann den Rebound holen.'],
    read:'Ist der Stopp zu lang oder seitlich instabil, Tempo reduzieren, bevor die Entfernung wächst.',
    cues:['Die Bremsarbeit beginnt vor der Ballaufnahme.','Links und rechts denselben kontrollierten Abschluss suchen.'],errors:['Den Ball aufnehmen und erst danach einen Stopp suchen.','Mit steifen Knien nach vorn fallen.'],
    easier:'Mit nur einem langsamen Dribbling und kurzer Wurfdistanz beginnen.',harder:'Startwinkel verändern und nach jedem Rebound die Seite wechseln.',
    measure:'12 Würfe: Stopps ohne Korrekturschritt, stabile Landungen und Treffer pro Seite zählen.'
  });
  add('sg', {
    name:'Hop-Catch bei seitlich versetztem Zuspiel',category:'Wurf',tags:['shooting','footwork'],
    goal:'Einen ungenauen Pass in eine stabile Fang- und Wurfposition überführen.',
    setup:'2 Spieler: Schütze am Flügel und Passgeber 4 Meter davor. Ein Korb; Pässe bleiben sicher erreichbar.',
    steps:['Vor dem Pass tief bereitstehen und beide Hände zeigen.','Dem seitlich versetzten Pass mit einem kurzen Schritt entgegengehen.','Mit kleinem Einsprung den Ball fangen und möglichst gleichzeitig auf beiden Füßen zum Korb landen.','Nur bei Balance direkt werfen; andernfalls den Ball sichern und den Durchgang ohne Eilwurf zurücksetzen.'],
    read:'Ein fangbarer Pass ist nicht automatisch ein guter Wurf; Balance entscheidet über den Abschluss.',
    cues:['Kleiner Hop statt hoher Sprung.','Ball dicht vor dem Körper in die Wurflinie bringen.'],errors:['Im Fang seitlich wegkippen.','Die Füße nach der Landung mehrfach neu setzen.'],
    easier:'Passgeber spielt zunächst genau vor die Brust.',harder:'Passgeber variiert innerhalb einer Armlänge Fangseite und Höhe.',
    measure:'12 Zuspiele: sichere Fänge, direkte Würfe aus Balance und bewusst verworfene schlechte Wurfpositionen zählen.'
  });
  add('sg', {
    name:'Inside-hand-Abschluss vor dem nachlaufenden Blocker',category:'Abschluss',tags:['drive','footwork','decision'],
    goal:'Den Ball auf der inneren Körperseite früh zum Brett bringen, wenn außen Druck kommt.',
    setup:'2 Spieler am Flügel: Angreifer mit Ball und passiver Verfolger an der äußeren Schulter. Ein Korb.',
    steps:['Mit einem Dribbling einen kleinen Vorsprung auf der Außenbahn herstellen.','Die äußere Schulter zwischen Verfolger und Ball halten und den Ball nah vor der Hüfte aufnehmen.','Von rechts mit der linken Innenhand früh zum Brett abschließen, von links mit rechts; die Schrittfolge vorher langsam festlegen.','Kontrolliert landen und den Rebound holen; bei innerem Druck wieder die korbferne Außenhand wählen.'],
    read:'Die Innenhand passt gegen äußeren Verfolgerdruck; sie wird nicht blind bei jedem Drive benutzt.',
    cues:['Den Ball nicht erst außen zeigen und dann quer bewegen.','Kurzer weicher Abwurf statt hartem Schieben.'],errors:['Den Arm unter dem Gegner hindurchzwängen.','Zusätzliche Schritte für den Handwechsel einbauen.'],
    easier:'Ohne Verfolger den Ablauf aus kurzer Distanz üben.',harder:'Verfolger zeigt wechselweise außen oder innen eine passive Hand; Abschlussseite lesen.',
    measure:'Je Seite 6 Aktionen: geschützte Ballseite, saubere Fußfolge und Treffer dokumentieren.'
  });
  add('sg', {
    name:'Stride-stop und kontrollierter kurzer Bankshot',category:'Abschluss',tags:['footwork','shooting','drive'],
    goal:'Nach dem Drive vor der Hilfe stoppen und den Brettwinkel gezielt nutzen.',
    setup:'2 Spieler: Angreifer am Flügel, passiver Helfer seitlich vor dem Korb. Ein Hütchen markiert einen freien Stoppraum außerhalb des Helferkörpers.',
    steps:['Mit zwei Dribblings diagonal zur Zone angreifen.','Vor dem Helfer den Ball aufnehmen und mit einem klaren Eins-zwei-Stopp im freien Raum bremsen.','Beide Füße stabilisieren, das Brettziel ansehen und aus kurzer Distanz kontrolliert hochgehen.','Den Ball weich an die obere passende Brettzone geben und im eigenen Raum landen.'],
    read:'Steht der Helfer bereits im Stoppraum, früher stoppen oder den Versuch zurücksetzen.',
    cues:['Bremsen vor dem Kontakt.','Die Hand dosiert den Brettwurf statt ihn hart gegen das Brett zu drücken.'],errors:['Mit steifem Körper in den Helfer hineinlaufen.','Nach dem Stopp einen dritten Schritt machen.'],
    easier:'Helfer durch ein Hütchen ersetzen.',harder:'Helfer variiert zwischen tiefer und früher Position; Stoppdistanz anpassen.',
    measure:'12 Versuche: kontaktfreie stabile Stopps, passende Brettwinkel und Treffer zählen.'
  });
  add('sg', {
    name:'Pass-Fake, Give-and-Go und Rückpassabschluss',category:'Passen',tags:['passing','footwork','decision'],players:3,
    goal:'Mit einer kurzen Täuschung den Pass vorbereiten und anschließend ohne Ball weiterarbeiten.',
    setup:'3 Spieler: Guard am Flügel mit Ball, Partner oben und Verteidiger am Guard. Ein Korb.',
    steps:['Einen kurzen Pass zur Grundlinie antäuschen, ohne den Ball weit vom Körper zu lösen.','Nach der Handreaktion des Verteidigers sicher zum oberen Partner passen.','Sofort den Verteidiger auf der offenen Seite umgehen und zum Korb schneiden.','Den Rückpass vor dem Lauf fangen und mit kontrolliertem Korbleger abschließen.'],
    read:'Schließt der Verteidiger den direkten Schnitt, kurz auf der freien Gegenseite anbieten statt durch ihn zu laufen.',
    cues:['Nach dem eigenen Pass sofort neu bewegen.','Täuschung kurz halten, damit der echte Pass rechtzeitig kommt.'],errors:['Den eigenen Pass bewundern und stehen bleiben.','Ohne Blickkontakt den Rückpass erwarten.'],
    easier:'Verteidiger reagiert deutlich auf die Pass-Fake und begleitet nur.',harder:'Verteidiger darf den Schnitt wählen; Angreifer muss den offenen Weg erkennen.',
    measure:'12 Abläufe: Pass ohne Ballverlust, unmittelbarer Anschlusslauf und freier Rückpassfang zählen.'
  });
  add('sg', {
    name:'Flare-Schnitt hinter dem ballfernen Block',category:'Wurf',tags:['shooting','footwork','decision'],players:4,
    goal:'Hinter einem Helfer seitlich in ein freies Wurffenster ausweichen.',
    setup:'4 Spieler: Schütze am Slot, Blocksteller daneben, Verteidiger innen und Passgeber am gegenüberliegenden Slot. Ein Korb.',
    steps:['Einen Schritt in Richtung Ball machen und den Verteidiger nach innen orientieren.','Am stabil stehenden Block seitlich nach außen lösen und zum Passgeber aufdrehen.','Mit kurzen Schritten das freie Fangfenster suchen und beim Pass die Füße beruhigen.','In Balance fangen und aus sicherer Reichweite werfen; bei geschlossenem Fenster erneut anbieten.'],
    read:'Der Flare passt, wenn der Verteidiger zur Ballseite absinkt; folgt er außen, nicht blind gegen ihn herauslaufen.',
    cues:['Der Block steht vor dem Laufwegwechsel.','Den Ball beim seitlichen Lösen durchgehend sehen.'],errors:['Rückwärts mit dem Rücken zum Ball wegspringen.','Zu weit aus der eigenen Reichweite abdriften.'],
    easier:'Verteidiger bleibt passiv innen.',harder:'Verteidiger variiert innen und außen; Schütze wählt Flare oder freies Wiederanbieten.',
    measure:'12 Läufe: freie Fangfenster, Wurfvorbereitung und Treffer getrennt dokumentieren.'
  });
  add('sg', {
    name:'Trail-Catch mit Bremsen hinter dem Schnellangriff',category:'Wurf',tags:['shooting','footwork','decision'],players:3,
    goal:'Als nachrückender Guard im Rückpassfenster fang- und wurfbereit ankommen.',
    setup:'3 Spieler: Ballhandler am Flügel, nachrückender Guard an der Mittellinie und Helfer in der Zone. Ein Korb.',
    steps:['Mit mäßigem Tempo hinter dem Ball in den freien Slot nachrücken.','Vor dem Pass die Schrittlänge verkürzen und den Körper zum Korb ausrichten.','Wenn der Helfer den Drive aufnimmt, den Rückpass mit ruhigem Eins-zwei-Stopp fangen.','Frei werfen oder bei hochkommender Hilfe mit einem geschützten Dribbling zum Korb ziehen.'],
    read:'Das Nachrücken endet im freien Rückpassraum und nicht direkt hinter dem Ballhandler.',
    cues:['Vor dem Fang bremsbereit sein.','Abstand zum Drive erhalten.'],errors:['Ungebremst in den Fang sprinten.','Die gleiche Angriffsspur wie der Ballhandler besetzen.'],
    easier:'Ballhandler passt immer zum fest markierten Slot.',harder:'Hilfe variiert den Rückweg; nach dem Fang Wurf oder Drive entscheiden.',
    measure:'12 Rückpässe: Fänge in Balance, passende Anschlussaktion und Ballverluste zählen.'
  });
  add('sg', {
    name:'Blind-Pig-Schnitt hinter der überzogenen Passlinie',category:'Footwork',tags:['footwork','passing','decision'],players:3,
    goal:'Einen hohen Postpass als Signal für einen versteckten Schnitt zum Korb nutzen.',
    setup:'3 Spieler: Guard am Flügel ohne Ball, Ballhalter am hohen Post und Denial-Verteidiger. Ein Korb; Ballhalter steht frontal zum Feld.',
    steps:['Vom Flügel kurz nach oben anbieten und den Verteidiger in die Passlinie locken.','Sobald der hohe Post den Guard ansieht, hinter der vorderen Verteidigerschulter zur Grundlinie schneiden.','Eine Hand früh als Ziel zeigen und erst im freien Fenster den kurzen Bodenpass entgegennehmen.','Auf der ballfernen Brettseite geschützt abschließen und die Rollen wechseln.'],
    read:'Nicht schneiden, wenn der hohe Post noch mit dem Rücken zum Feld steht oder der Korbweg besetzt ist.',
    cues:['Blickkontakt ist das Startsignal.','Schnitt klar und ohne zusätzlichen Umweg ausführen.'],errors:['Dem Ballhalter den Schnitt zu spät anzeigen.','In derselben Linie wie die ausgestreckte Verteidigerhand laufen.'],
    easier:'Verteidiger bleibt in einer klaren Denial-Position stehen.',harder:'Verteidiger darf sich umstellen; Guard muss Schnitt oder sicheres Außenangebot wählen.',
    measure:'12 Angebote: klare gemeinsame Startsignale, freie Schnittfenster und sichere Fänge erfassen.'
  });

  // Small Forward: Flügelangriff, Cuts, Abschlüsse und beidseitige Spielfähigkeit.
  add('sf', {
    name:'Closeout lesen: werfen oder die offene Hüfte angreifen',category:'Entscheidungen',tags:['drive','shooting','decision'],
    goal:'Die erste Aktion nach dem Fang aus Abstand und Fußstellung des Gegners ableiten.',
    setup:'2 Spieler am Flügel, 1 Korb. Angreifer mit Eigenzuspiel; Verteidiger startet an der Zone und läuft kontrolliert an.',
    steps:['Eigenpass mit gebeugten Knien fangen und sofort den Korb sehen.','Bei kurzem, bremsendem Closeout in Balance werfen.','Bei weitem Vortritt den Ball zum Dribbelstart lösen und die offene Hüfte mit einem ersten Schritt angreifen.','Nach höchstens zwei Dribblings abschließen und anschließend die Rollen wechseln.'],
    read:'Die Reaktion folgt Abstand und Bewegung des Closeouts, nicht einem vorher festgelegten Move.',
    cues:['Vor dem Fang das Umfeld ansehen.','Den Ball vor dem Abheben des Standbeins zum Dribbeln lösen.'],errors:['Bei jedem Fang automatisch dribbeln.','Gegen einen nahen hohen Arm unbalanciert werfen.'],
    easier:'Verteidiger kündigt kurzes oder langes Closeout an.',harder:'Verteidiger verändert den Abstand erst kurz vor dem Fang.',
    measure:'12 Fänge: passende Erstentscheidungen, Ballverluste und Treffer getrennt zählen.'
  });
  add('sf', {
    name:'Jab-Step und Cross-Step am Flügel',category:'Footwork',tags:['footwork','drive','decision'],
    goal:'Den Gegner mit einem kurzen Ausfallschritt verschieben und die andere Seite öffnen.',
    setup:'2 Spieler am rechten Flügel, 1 Korb. Angreifer hält den Ball nach Eigenzuspiel in Triple-Threat-Position.',
    steps:['Standbein bewusst festlegen und mit dem freien Fuß kurz zur Außenseite antäuschen.','Ball, Blick und Schulter folgen der Täuschung, während das Standbein am Ort bleibt.','Rückt der Verteidiger nach außen, den Ball zum Dribbeln lösen und mit dem freien Fuß vor der Körpermitte zur Gegenseite treten.','Mit der neuen Außenhand geschützt zum Korb ziehen; links spiegeln.'],
    read:'Nur zur Gegenseite angreifen, wenn der Verteidiger den Jab übernimmt; bleibt er tief, freien Wurf prüfen.',
    cues:['Jab kurz und rückholbar halten.','Standbein bis zum gelösten Dribbelstart am Boden lassen.'],errors:['Den Jab so lang setzen, dass keine Balance bleibt.','Standbein bei der Täuschung verschieben.'],
    easier:'Verteidiger folgt dem Jab vorgegeben.',harder:'Verteidiger entscheidet, ob er den Jab übernimmt oder Abstand hält.',
    measure:'12 Aktionen: festes Standbein, passende Angriffsseite und sichere Ballführung zählen.'
  });
  add('sf', {
    name:'Rocker-Step gegen zurückweichende Verteidigung',category:'Footwork',tags:['footwork','shooting','decision'],
    goal:'Eine zurückweichende Reaktion durch Gewichtsverlagerung für einen Wurf nutzen.',
    setup:'2 Spieler am Flügel in sicherer Wurfdistanz, 1 Korb. Ball nach Eigenzuspiel halten; Standbein benennen.',
    steps:['Mit einem kurzen Jab einen möglichen Drive zeigen, ohne das Standbein zu bewegen.','Das Gewicht wieder zur Mitte nehmen und den Ball in die Wurflinie anheben.','Weicht der Gegner zurück, die Füße stabil halten und aus der Beinbewegung werfen.','Bleibt er nahe, vor dem Standbein-Abheben zum Dribbeln lösen und an seiner offenen Seite starten.'],
    read:'Abstand nach der Gewichtsverlagerung entscheidet zwischen Wurf und Drive.',
    cues:['Der Oberkörper bleibt über dem eigenen Stand.','Täuschungen ähneln dem echten ersten Schritt.'],errors:['Den Körper weit nach vorn und zurück werfen.','Für den Wurf die Füße nach der Täuschung neu setzen.'],
    easier:'Verteidiger weicht nach jedem Jab einen Schritt zurück.',harder:'Verteidiger wählt Rückzug oder Druck; höchstens eine Täuschung pro Aktion.',
    measure:'12 Versuche: Abstand korrekt gelesen, kein Schrittfehler und Wurfbalance erfassen.'
  });
  add('sf', {
    name:'Grundlinien-Drive mit Brettschutz auf der Gegenseite',category:'Abschluss',tags:['drive','footwork','decision'],
    goal:'Das Brett gegen den seitlich nachlaufenden Verteidiger als Schutz nutzen.',
    setup:'2 Spieler am Flügel, Verteidiger leicht zur Mitte versetzt. Ein Korb; der Weg unter dem Brett bleibt frei.',
    steps:['Den Ball eng zur Grundlinienseite bringen und vor dem ersten Schritt zum Dribbeln lösen.','Mit der Außenhand am Verteidiger vorbei unter den Korb ziehen.','Den Ball in einer klaren Fußfolge aufnehmen und zur gegenüberliegenden Brettseite bringen.','Den Reverse weich mit geschützter Hand lösen, bevor die Füße erneut aufsetzen.'],
    read:'Den Reverse nur wählen, wenn die Gegenseite frei ist; bei früher Korbhilfe rechtzeitig stoppen.',
    cues:['Ball eng und unter Kontrolle um das Brett führen.','Nicht hinter die Grundlinie abdriften.'],errors:['Zu spät unter dem Korb hochspringen.','Den Ball offen über den Kopf des Verfolgers schwenken.'],
    easier:'Ohne Verteidiger aus dem Gehen an der Grundlinie starten.',harder:'Verteidiger darf frühe oder späte Begleitung zeigen; normalen oder Reverse-Abschluss wählen.',
    measure:'Je Seite 6 Abschlüsse: freie gewählte Brettseite, kontrollierte Fußfolge und Treffer zählen.'
  });
  add('sf', {
    name:'Spin-Dribbling gegen den abgeschnittenen Drive',category:'Dribbling',tags:['dribbling','footwork','decision'],
    goal:'Nach geschlossener erster Bahn die Gegenrichtung mit geschütztem Ball öffnen.',
    setup:'2 Spieler am Flügel mit freier Zone, 1 Korb. Verteidiger schließt zunächst passiv den ersten Drive.',
    steps:['Mit zwei Dribblings eine Seite angreifen und den Verteidiger vor dem Körper erkennen.','Vor dessen Position abbremsen und den Ball eng an der äußeren Hüfte im Dribbling halten.','Über den freien Raum wegdrehen und den Ball beim Richtungswechsel zur anderen Hand bringen; keine gehaltene Drehung mit Zusatzschritten.','Nach der Drehung den Korb wieder sehen und erst bei freiem Weg abschließen.'],
    read:'Nur drehen, wenn der freie Raum hinter der eigenen Gegenhüfte vorher gesehen wurde.',
    cues:['Erst bremsen, dann drehen.','Ball nicht hinter dem Rücken weit vom Körper verlieren.'],errors:['Blind in eine zweite Hilfe drehen.','Das Dribbling vor der Drehung beenden und danach erneut beginnen.'],
    easier:'Mit Hütchen statt Verteidiger den geschützten Wechsel üben.',harder:'Verteidiger entscheidet zwischen Begleiten und frühem Abschneiden.',
    measure:'12 Drives: korrekt erkannte Abbrüche, Ballkontrolle in der Drehung und Schrittfehler zählen.'
  });
  add('sf', {
    name:'Stride-stop mit Vorwärtspivot aus der Zone',category:'Footwork',tags:['footwork','passing','decision'],players:3,
    goal:'Nach einem geschlossenen Drive ohne Schrittfehler ein neues Passfenster finden.',
    setup:'3 Spieler: Flügelangreifer, Helfer vor dem Korb und Rückpasspartner am Slot. Ein Korb.',
    steps:['Mit zwei Dribblings in die Zone gehen und vor dem Helfer mit Eins-zwei-Stopp bremsen.','Das nach der Ballaufnahme festgelegte Standbein am Ort halten.','Mit dem freien Bein vorwärts zur offenen Feldseite drehen und den Ball eng schützen.','Den Rückpasspartner anspielen; falls die Hilfe weggeht, aus stabilem Stand kurz werfen.'],
    read:'Die Drehung öffnet Sicht und Passwinkel; sie ist kein Mittel, durch den stehenden Helfer zu laufen.',
    cues:['Standbein bewusst wahrnehmen.','Vor dem Pass erst das Ziel sehen.'],errors:['Beide Füße beim Pivot versetzen.','Den Ball im Blindflug über die Schulter werfen.'],
    easier:'Hilfe steht fest und der Rückpasspartner bleibt am Slot.',harder:'Rückpasspartner wechselt die Seite, Hilfe schließt einen Drehwinkel.',
    measure:'12 Stopps: korrektes Standbein, freies Passziel und sichere Pässe erfassen.'
  });
  add('sf', {
    name:'Veer-Finish mit kontrolliertem Laufwinkel',category:'Abschluss',tags:['drive','footwork','decision'],level:'Fortgeschritten',
    goal:'Den Abschlusswinkel vor einem seitlich nachlaufenden Verteidiger kontrollieren.',
    setup:'2 Spieler: Angreifer am Slot, passiver Verfolger leicht seitlich dahinter. Ein Korb; kein harter Körperkontakt.',
    steps:['Mit zwei Dribblings einen kleinen Vorsprung zur Zone gewinnen.','Vor der Ballaufnahme die Laufspur leicht vor die seitlich folgende Verteidigerlinie legen, ohne in ihn hineinzulaufen.','Den Ball auf der geschützten Seite aufnehmen und den Absprung in freiem Raum setzen.','Mit der korbfernen Hand weich abschließen und senkrecht in der eigenen Spur landen.'],
    read:'Kommt der Verteidiger rechtzeitig vor den Körper, abbremsen; eine besetzte Position nicht mit Kontakt erzwingen.',
    cues:['Winkel früh im Lauf ändern.','Schulter schützt den Ball, der freie Arm drückt nicht.'],errors:['Seitlich in den Gegner springen.','Die Laufspur erst nach der Ballaufnahme mit Zusatzschritten wechseln.'],
    easier:'Verfolger bleibt eine Armlänge zurück.',harder:'Verfolger wählt innen oder außen; Abschlussseite entsprechend anpassen.',
    measure:'12 Abschlüsse: kontrollierter Winkel, kontaktfreie Balance und geschützte Ballseite dokumentieren.'
  });
  add('sf', {
    name:'45-Grad-Cut hinter der Ballhilfe',category:'Footwork',tags:['footwork','decision','drive'],players:3,
    goal:'Die ballnahe Hilfe mit einem diagonalen Schnitt vom Flügel bestrafen.',
    setup:'3 Spieler: Flügel ohne Ball, Ballhandler am gegenüberliegenden Slot und Helfer am Flügelspieler. Ein Korb.',
    steps:['Am Flügel breit stehen und den Blick des Helfers beobachten.','Sobald der Helfer zum eindringenden Ballhandler dreht, diagonal hinter dessen Rücken zur Zone schneiden.','Im freien Passfenster beide Hände zeigen und den Ball vor dem Körper fangen.','Direkt kontrolliert abschließen; wenn der Helfer beim Flügel bleibt, außen als Passziel verfügbar bleiben.'],
    read:'Erst schneiden, wenn die Hilfe den Blick und die Hüfte zum Ball dreht.',
    cues:['Den Schnitt nicht quer vor den Ballhandler legen.','Passgeber und Schneidender sehen sich vor dem Zuspiel.'],errors:['Ohne Hilfereaktion in eine volle Zone schneiden.','Nach dem Start in der Mitte stehen bleiben.'],
    easier:'Helfer dreht sich bei jedem Drive deutlich weg.',harder:'Helfer darf beim Flügel bleiben oder helfen; beide Angreifer lesen die Wahl.',
    measure:'12 Angriffe: passende Schnittzeitpunkte, freie Fangfenster und Ballverluste zählen.'
  });
  add('sf', {
    name:'Grundlinien-Cut hinter dem tiefen Helfer',category:'Footwork',tags:['footwork','decision','drive'],players:3,
    goal:'Hinter einem zur Mitte orientierten Helfer einen kurzen Korbweg öffnen.',
    setup:'3 Spieler: Forward in der ballfernen Ecke, Ballhandler am anderen Flügel und Helfer am tiefen Zonenrand. Ein Korb.',
    steps:['In der Ecke bereitstehen und dem Ballhandler eine klare Sicht auf die eigene Position geben.','Wenn der Helfer zum Drive in die Mitte tritt, hinter ihm entlang der Grundlinie schneiden.','Unterhalb seiner Sichtlinie ein kurzes Passfenster öffnen und die Hände vor dem Körper zeigen.','Den Ball auf der freien Brettseite fangen und ohne weiteren Umweg abschließen.'],
    read:'Kein Schnitt, wenn bereits ein Mitspieler den Grundlinienraum besetzt.',
    cues:['Den freien Brettwinkel vor dem Fang erkennen.','Den Schnitt klar durchlaufen statt unter dem Brett zu warten.'],errors:['Hinter der Grundlinie laufen.','Mit dem Ballhandler gleichzeitig zum gleichen Punkt ziehen.'],
    easier:'Helfer bleibt nach seinem Schritt zur Mitte stehen.',harder:'Helfer darf zurückdrehen; Forward muss rechtzeitig im freien Fenster anbieten oder außen bleiben.',
    measure:'12 Situationen: unbesetzte Schnittwege, sichere Fänge und freie Brettseiten zählen.'
  });
  add('sf', {
    name:'Transition-Drive gegen den zurücklaufenden Verteidiger',category:'Abschluss',tags:['drive','decision','dribbling'],
    goal:'Im offenen Feld den Rückwärtslauf des Gegners durch einen diagonalen Antritt nutzen.',
    setup:'2 Spieler an der Mittellinie, Verteidiger 3 Meter näher am Korb. Ein Korb; beide starten in kontrolliertem Tempo.',
    steps:['Mit Blick nach vorn auf den rückwärts laufenden Verteidiger zudribbeln.','Vor dessen Reichweite das Tempo kurz senken und dessen Fußstellung ansehen.','Bei seitlich geöffneten Füßen diagonal an der äußeren Hüfte vorbeibeschleunigen.','Früh den freien Abschlussraum wählen; bei geschlossenem Weg vor dem Gegner stoppen.'],
    read:'Die geöffnete Hüfte angreifen; nicht mit vollem Tempo frontal in die stabile Verteidigung laufen.',
    cues:['Tempoänderung vor dem ersten Angriffsschritt.','Ball auf der vom Gegner abgewandten Seite führen.'],errors:['Nur geradeaus schneller laufen.','Zu spät vor dem bereits stehenden Verteidiger bremsen.'],
    easier:'Verteidiger läuft nur auf einer vorgegebenen Spur zurück.',harder:'Verteidiger darf in der Zone seitlich abschneiden und den Abschlussweg wählen.',
    measure:'12 Ballvorträge: gewonnene Außenlinie, kontrollierte Stopps und Ballverluste erfassen.'
  });
  add('sf', {
    name:'Eurostep um die rechtzeitig sichtbare Hilfe',category:'Abschluss',tags:['drive','footwork','decision'],
    goal:'Mit zwei klaren Schritten nach der Ballaufnahme die freie Seite der Hilfe nutzen.',
    setup:'2 Spieler: Angreifer am Flügel mit Ball, passiver Helfer vor dem Korb. Ein Korb; Verteidiger bleibt während der Abschlussfolge stehen.',
    steps:['Mit zwei Dribblings den Helfer ansehen und die freie Seite vor der Ballaufnahme erkennen.','Den Ball sichern und den ersten Schritt seitlich zur einen Seite setzen.','Mit dem zweiten Schritt in den vorher gesehenen freien Raum auf der anderen Seite wechseln.','Vor erneutem Aufsetzen abschließen und im eigenen Raum landen; anschließend die andere Richtung üben.'],
    read:'Der Eurostep ist nur sinnvoll, wenn der zweite Schritt in freien Raum führt.',
    cues:['Ballaufnahme und zwei Schritte langsam abstimmen.','Seitliche Distanz entsteht durch Fußarbeit, nicht durch Wegdrücken.'],errors:['Vor den zwei Schritten bereits einen zusätzlichen Bodenkontakt machen.','Blind auf den Körper des Helfers zulaufen.'],
    easier:'Helfer durch ein breites Hütchentor ersetzen.',harder:'Helfer zeigt vor der Ballaufnahme links oder rechts; Angreifer wählt Eurostep oder frühen Stopp.',
    measure:'12 Aktionen: korrekte Schrittzahl, freier zweiter Schritt und Treffer zählen.'
  });
  add('sf', {
    name:'Pro-Hop in ein freies Abschlussfenster',category:'Footwork',tags:['drive','footwork','decision'],level:'Fortgeschritten',
    goal:'Aus dem Dribbling mit klarer Ballaufnahme in einen freien Raum springen und dort stabil abschließen.',
    setup:'2 Spieler: Angreifer am Flügel, passiver Helfer am Zonenrand. Ein freies Landefeld wird mit zwei Hütchen markiert.',
    steps:['Die freie Landefläche vor dem Helfer ansehen und kontrolliert andribbeln.','Ballaufnahme und kurzen Sprung so abstimmen, dass die Schrittfolge klar und überprüfbar bleibt.','Auf beiden Füßen stabil im freien Feld landen; in dieser Variante danach kein Pivot und keinen weiteren Schritt setzen.','Direkt aus beiden Beinen kurz abschließen und im eigenen Raum landen.'],
    read:'Bei besetztem Landefeld vorher abbremsen und die Aktion zurücksetzen.',
    cues:['Landefläche muss vor dem Absprung frei sein.','Ball eng schützen und klein springen.'],errors:['In einen stehenden Gegner hineinlanden.','Nach dem Hop noch einmal umsteigen.'],
    easier:'Ohne Gegner Ballaufnahme und beidbeinige Landung langsam kontrollieren.',harder:'Helfer schließt vor der Ballaufnahme wechselweise eines von zwei Landefeldern.',
    measure:'12 Aktionen: freie Landefläche gewählt, stabile beidbeinige Landung und keine Zusatzschritte zählen.'
  });
  add('sf', {
    name:'Mismatch-Seal mit schnellem Außenhand-Abschluss',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Gegen einen kleineren Flügelverteidiger früh Position gewinnen und ohne langes Dribbeln abschließen.',
    setup:'3 Spieler: Forward am mittleren Post, Verteidiger und Passgeber am Flügel. Ein Korb; Größenunterschied wird durch passive Ausgangsposition simuliert.',
    steps:['Seitlich zum Feld eine stabile Fangposition oberhalb des tiefen Blocks herstellen.','Den Verteidiger mit dem eigenen Stand hinter der Hüfte halten, ohne Arme zum Halten auszustrecken.','Pass sicher fangen, die freie Korbseite lesen und mit höchstens einem Dribbling dorthin aufdrehen.','Mit der vom Verteidiger abgewandten Hand kurz abschließen; danach Rollen tauschen.'],
    read:'Die offene Schulter entscheidet über die Drehrichtung; keine vorgeplante Kraftaktion.',
    cues:['Erst Position, dann Pass fordern.','Ball nach dem Fang auf Schulterhöhe sichern.'],errors:['Verteidiger mit dem Unterarm wegdrücken.','Nach dem Fang lange ohne Raumgewinn dribbeln.'],
    easier:'Verteidiger hält eine klar vorgegebene Seite geschlossen.',harder:'Verteidiger darf vor dem Pass die geschlossene Seite wechseln.',
    measure:'12 Fänge: klare Position, richtige Drehrichtung und Abschluss innerhalb eines Dribblings zählen.'
  });
  add('sf', {
    name:'Mid-Post-Face-up mit kurzem Jab-Drive',category:'Post',tags:['post','footwork','drive'],players:3,
    goal:'Aus dem mittleren Post frontal lesen und mit einem kurzen ersten Schritt angreifen.',
    setup:'3 Spieler: Forward 3 bis 4 Meter seitlich vom Korb, Verteidiger und Passgeber am Slot. Ein Korb.',
    steps:['Den Pass mit stabilem Stand fangen und das Standbein klar festlegen.','Über die feldseitige Schulter zum Korb aufdrehen, ohne den Ball offen zum Gegner zu halten.','Mit dem freien Fuß einen kurzen Jab zeigen und auf dessen Reaktion warten.','Den Ball rechtzeitig zum Dribbeln lösen und die freie Hüfte angreifen; bei Abstand kurz werfen.'],
    read:'Der Face-up eröffnet Wurf und Drive; Druck oder Abstand geben die Antwort.',
    cues:['Mit der Drehung das Feld öffnen.','Nur ein klarer Jab statt einer langen Täuschungsserie.'],errors:['Beim Aufdrehen das Standbein verschieben.','Nach dem Jab den Ball zu spät zum Dribbeln lösen.'],
    easier:'Verteidiger wählt vorher sichtbar Druck oder Abstand.',harder:'Verteidiger verändert den Abstand während des Aufdrehens.',
    measure:'12 Fänge: saubere Drehung, richtige Wurf-Drive-Wahl und Ballverluste erfassen.'
  });
  add('sf', {
    name:'Drive-and-Kick zur nahen Ecke',category:'Passen',tags:['drive','passing','decision'],players:3,
    goal:'Den Helfer binden und dem freien Eckenspieler einen direkt verwertbaren Pass geben.',
    setup:'3 Spieler: Forward am Flügel mit Ball, Empfänger in derselben Ecke und dessen Helfer am Zonenrand. Ein Korb.',
    steps:['Zur Mitte angreifen und den Helfer mit zwei kontrollierten Dribblings binden.','Den Eckenspieler im Blick halten, während die Hilfe einen Schritt zum Ball macht.','Vor dem dichten Verkehr aus stabilem Körperstand einen schnellen Pass außen am Helfer vorbei spielen.','Empfänger fängt in Balance; bleibt die Hilfe an ihm, beendet der Forward den freien Drive.'],
    read:'Nicht allein wegen des Übungsnamens passen: die Hilfe muss den Empfänger wirklich verlassen.',
    cues:['Ziel vor dem letzten Dribbling sehen.','Pass zur Wurfschulter statt tief an die Füße.'],errors:['Zu tief hinter die Hilfe dribbeln und das Fenster verlieren.','Blind aus einem Notabsprung passen.'],
    easier:'Helfer tritt immer früh und deutlich ein.',harder:'Helfer variiert Zeitpunkt und darf beim Eckenspieler bleiben.',
    measure:'12 Angriffe: passende Entscheidung und fangbare Kick-out-Pässe zählen; Treffer separat.'
  });
  add('sf', {
    name:'Ein-Dribbling-Drive mit Pass auf den Lift',category:'Passen',tags:['passing','drive','decision'],players:3,
    goal:'Nach kurzem Antritt einen bewegten statt einen statischen Empfänger bedienen.',
    setup:'3 Spieler: Forward am Slot mit Ball, Empfänger in der Ecke und Helfer dazwischen. Ein Korb.',
    steps:['Mit genau einem kontrollierten Dribbling Richtung Zone gehen und den Helfer ansehen.','Empfänger rückt auf den freien Flügel auf, sobald die Hilfe zum Ball sinkt.','Auf dem letzten Dribbelkontakt zum neuen Fangpunkt statt zur alten Ecke passen.','Empfänger stoppt zum Wurf; bleibt die Hilfe außen, behält der Forward den Ball und setzt zurück.'],
    read:'Das Ziel ist die künftige Position des Empfängers, nicht dessen Startpunkt.',
    cues:['Passgeschwindigkeit dem kurzen Lauf anpassen.','Den Helfer erst binden, dann die Linie nutzen.'],errors:['In die bereits leere Ecke passen.','Vor dem Dribbling ohne Hilfereaktion abspielen.'],
    easier:'Empfänger läuft immer zum markierten Flügelpunkt.',harder:'Empfänger stoppt abhängig vom Helfer früher oder später.',
    measure:'12 Antritte: Pässe in den Lauf, freie Fangpositionen und korrekte Rücksetzungen zählen.'
  });
  add('sf', {
    name:'Offensivrebound mit kurzer Wurftäuschung',category:'Rebound',tags:['footwork','shooting','decision'],
    goal:'Nach dem Offensivrebound erst Balance gewinnen und dann den hochspringenden Gegner umgehen.',
    setup:'2 Spieler unter einem Korb. Angreifer wirft den Ball leicht ans Brett; Verteidiger wartet seitlich und greift nicht in die Landung.',
    steps:['Den eigenen Brettabpraller mit beiden Händen sichern und auf beiden Füßen stabil landen.','Den Ball auf Schulterhöhe schützen und das nach der Landung geltende Standbein beachten.','Mit kurzer Wurftäuschung die Hände des Verteidigers anheben und die freie Abschlussseite ansehen.','Ohne Zusatzschritte direkt hochgehen oder legal über das Standbein zum freien Winkel drehen.'],
    read:'Ein freies Fenster direkt nutzen; nur gegen eine nahe Hand täuschen.',
    cues:['Erst landen und stabil werden.','Ball nicht unter die Brust absenken.'],errors:['Hektisch noch in instabiler Landung werfen.','Mit der Täuschung abspringen und mit gehaltenem Ball wieder landen.'],
    easier:'Verteidiger zeigt eine feste passive Hand.',harder:'Verteidiger entscheidet zwischen hoher Hand und Abstand.',
    measure:'12 Rebounds: sichere Landung, Ball oben gehalten und passende Abschlusswahl erfassen.'
  });
  add('sf', {
    name:'Defensiver Drop-Step zum Wiederaufnehmen des Drives',category:'Verteidigung',tags:['defense','footwork','decision'],
    goal:'Nach einem verlorenen halben Schritt wieder zwischen Angreifer und Korb kommen.',
    setup:'2 Spieler am Flügel: Ballhandler und Verteidiger leicht seitlich versetzt. Ein Korb; kontaktarme Verteidigung ohne Schlagen zum Ball.',
    steps:['Ballhandler greift mit mäßigem Tempo die vordere Verteidigerhüfte an.','Verteidiger öffnet mit einem kurzen Drop-Step die Hüfte in Laufrichtung.','Mit schnellen Laufkontakten zur neuen Linie kommen und erst vor dem Angreifer wieder in seitliche Schritte wechseln.','Den Korbweg schließen, ohne seitlich zu greifen; nach dem Stopp Rollen tauschen.'],
    read:'Wenn die Hüfte geschlagen ist, erst laufen und Position gewinnen; nicht rückwärts am Gegner hängen.',
    cues:['Brust nach dem Wiederaufnehmen zum Ball.','Füße gewinnen die Position, die Hände bleiben kontrolliert.'],errors:['Geschlagene Position mit langen Seitwärtsschritten verfolgen.','Den Angreifer am Arm zurückhalten.'],
    easier:'Angreifer läuft auf einer vorgegebenen geraden Spur.',harder:'Angreifer darf einmal den Winkel wechseln; maximal drei Dribblings.',
    measure:'12 Verteidigungen: legal wiedergewonnene Korblinien und Reich- oder Haltefehler zählen.'
  });
  add('sf', {
    name:'Closeout, seitliches Contain und zweiter Stopp',category:'Verteidigung',tags:['defense','footwork','decision'],
    goal:'Einen Schützen anlaufen und dessen ersten Drive ohne Überschießen aufnehmen.',
    setup:'2 Spieler: Angreifer mit Ball am Flügel, Verteidiger am Zonenrand. Ein Korb und eine markierte Bremszone vor dem Angreifer.',
    steps:['Kontrolliert zum Ball anlaufen und vor der Bremszone die Schritte verkürzen.','Mit hoher Hand in stabilem Abstand ankommen, ohne in den Schützen zu springen.','Den ersten Dribbelantritt mit seitlichen Schritten aufnehmen und die Brust vor dem Ballweg halten.','Nach höchstens zwei Dribblings den zweiten Stopp herstellen; dann Rollen wechseln.'],
    read:'Wurfdistanz und Anlaufwinkel bestimmen das Bremsen; keine feste Vollgasdistanz ablaufen.',
    cues:['Hüfte tief, Hand hoch, Füße unter Kontrolle.','Die erste Seitbewegung beginnt aus einem stabilen Closeout.'],errors:['Mit gekreuzten Füßen direkt vor dem Schützen stehen.','Den ersten Drive mit einer ausfallenden Hand stoppen wollen.'],
    easier:'Angreifer zeigt vorab seine Drive-Seite.',harder:'Angreifer wählt Wurfvorbereitung oder eine von zwei Drive-Seiten.',
    measure:'12 Closeouts: kontrollierte Ankunft, gestoppter erster Drive und Fouls getrennt zählen.'
  });
  add('sf', {
    name:'Rebound, Aufdrehen und eigener Ballvortrag',category:'Rebound',tags:['defense','dribbling','decision'],
    goal:'Nach gesichertem Rebound das freie Feld erkennen und mit geschütztem ersten Dribbling starten.',
    setup:'2 Spieler an einem Korb: Rebounder und Begleitverteidiger. Zwei Hütchentore am Flügel markieren mögliche Ausgänge.',
    steps:['Eigenen leichten Brettwurf beidhändig sichern und stabil landen.','Ball auf Schulterhöhe schützen und über die feldseitige Schulter beide Ausgangstore ansehen.','Den Ball vor dem Anheben des Standbeins zum Dribbeln lösen und durch das freie Tor starten.','Bis zur Dreierlinie kontrolliert vortragen, dann zurückgehen und die Rollen wechseln.'],
    read:'Besetzt der Begleiter einen Ausgang, den anderen wählen; bei doppelt geschlossenem Raum Ball sichern statt blind loslaufen.',
    cues:['Erst Ball sichern, dann das Feld öffnen.','Erstes Dribbling seitlich geschützt und nicht vor die Gegnerhand setzen.'],errors:['Den Ball nach dem Rebound tief vor den Gegner halten.','Mit angehobenem Standbein erst danach das Dribbling starten.'],
    easier:'Begleiter bleibt an einem Tor stehen.',harder:'Begleiter schließt den Ausgang erst während der Landung.',
    measure:'12 Rebounds: sicherer Fang, korrekter erster Dribbelstart und freies Ausgangstor zählen.'
  });

  // Power Forward: Face-up, kurze Rollwege und Verbindungen zwischen innen und außen.
  add('pf', {
    name:'Face-up-Jab vom Ellenbogen',category:'Footwork',tags:['footwork','drive','shooting'],players:3,
    goal:'Am Ellenbogen aus dem Fang Wurf oder ersten Drive vorbereiten.',
    setup:'3 Spieler: Forward am Ellenbogen, Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Pass sicher fangen und mit einem klaren Pivot zum Korb aufdrehen.','Mit dem freien Fuß kurz zur Mitte antäuschen; das Standbein bleibt am Ort.','Bei rückweichendem Gegner aus Balance werfen; bei seitlicher Reaktion den Ball zum freien Drive lösen.','Mit höchstens zwei Dribblings kontrolliert abschließen und die Rollen tauschen.'],
    read:'Abstand ermöglicht Wurf, seitlicher Vortritt öffnet die Gegenhüfte.',
    cues:['Mit der Drehung den Korb sehen.','Ball vor dem Standbein-Abheben zum Dribbeln lösen.'],errors:['Mit beiden Füßen nach dem Fang nachsortieren.','Jab so lang setzen, dass kein schneller Folgeschritt möglich ist.'],
    easier:'Verteidiger zeigt die Reaktion früh.',harder:'Verteidiger verändert Abstand erst nach dem Pivot.',
    measure:'12 Fänge: saubere Pivots, passende Wahl und Ballverluste zählen.'
  });
  add('pf', {
    name:'Sweep-and-Go gegen die hohe Verteidigerhand',category:'Abschluss',tags:['drive','footwork','decision'],players:3,
    goal:'Den Ball aus dem hohen Fang geschützt zur freien Angriffsseite bringen.',
    setup:'3 Spieler: Forward am kurzen Flügel, Passgeber oben und naher Verteidiger mit passiver hoher Hand. Ein Korb.',
    steps:['Pass beidhändig fangen und das Standbein stabil festlegen.','Den Ball eng von der Schulter vor der Hüfte zur freien Seite führen.','Vor dem Anheben des Standbeins den ersten Dribbelkontakt neben den Verteidiger setzen.','Mit dem Körper den Ball schützen und nach einem weiteren Dribbling weich abschließen.'],
    read:'Unter der hohen Hand hindurch angreifen; bei tiefem Arm den Ball oben sichern und neu lesen.',
    cues:['Kleiner enger Ballweg statt weiter Armschleife.','Erster Schritt gewinnt die Position neben der Hüfte.'],errors:['Mit dem Ball gegen den Gegnerarm schlagen.','Standbein vor dem Ball lösen.'],
    easier:'Verteidiger hält die Hand dauerhaft oben.',harder:'Verteidiger variiert hohe und tiefe Hand sowie die offene Seite.',
    measure:'12 Aktionen: geschützter Ballweg, legale Starts und kontrollierte Abschlüsse erfassen.'
  });
  add('pf', {
    name:'Short-Roll-Fang und weicher Zwischenwurf',category:'Abschluss',tags:['shooting','footwork','decision'],players:3,
    goal:'Nach kurzem Abrollen in der Zone fangen und vor dem tiefen Big dosiert abschließen.',
    setup:'3 Spieler: Passgeber am Slot, Forward als Blocksteller und tiefer Helfer vor dem Korb. Ein Korb; kein Ballverteidiger.',
    steps:['Einen rechtzeitig stehenden Block zeigen und anschließend nur bis zur Freiwurflinie abrollen.','Zum Passgeber aufdrehen, im freien Fenster mit beiden Händen fangen und kontrolliert stoppen.','Den tiefen Helfer ansehen; bleibt er am Korb, aus kurzer Distanz einen weichen einhändigen Zwischenwurf lösen.','Stabil landen, Rebound holen und danach die Rollen wechseln.'],
    read:'Kommt der Helfer früh hoch, den Wurf nicht erzwingen; Ball sichern und zum Passgeber zurückspielen.',
    cues:['Mit offenen Händen zum Ball rollen.','Beim Fang nicht weiter in den Helfer stolpern.'],errors:['Zu tief unter den Korb abrollen.','Den Ball ohne Stopp hart aus dem Lauf werfen.'],
    easier:'Helfer bleibt fest unter dem Korb.',harder:'Helfer entscheidet zwischen tiefem Bleiben und frühem Heraustreten.',
    measure:'12 Fänge: stabile Stopps, passende Wurfauswahl und dosierte Abschlüsse zählen.'
  });
  add('pf', {
    name:'Short-Roll-Kick-out auf die freie Ecke',category:'Passen',tags:['passing','decision','footwork'],players:4,
    goal:'Als kurzer Rollspieler den helfenden Eckverteidiger durch einen Außenpass bestrafen.',
    setup:'4 Spieler: Guard am Slot mit Ball, Forward am Ellenbogen, Eckenspieler und Helfer dazwischen. Ein Korb.',
    steps:['Aus dem kurzen Rollweg zum Guard aufdrehen und dessen Pass sicher fangen.','Mit dem Fang den Korb sehen und den Helfer durch einen kurzen Korbschritt binden.','Rückt der Helfer ein, aus stabilem Stand zum freien Eckenspieler passen.','Bleibt die Hilfe außen, selbst aus kurzer Distanz abschließen; danach alle Rollen wechseln.'],
    read:'Nicht automatisch außen passen: die Bewegung des Helfers entscheidet.',
    cues:['Beim Fang bereits die ballferne Seite überblicken.','Pass schnell an die Wurfschulter des Empfängers.'],errors:['Mit dem Rücken zur freien Ecke bleiben.','Erst dribbeln und damit das frühe Fenster verlieren.'],
    easier:'Helfer zeigt seine Wahl deutlich vor dem Fang.',harder:'Helfer entscheidet erst beim Fang; höchstens ein Dribbling erlauben.',
    measure:'12 Fänge: richtige Pass-oder-Abschluss-Wahl und fangbare Pässe erfassen.'
  });
  add('pf', {
    name:'Pick-and-Pop mit seitlichem Fangfenster',category:'Wurf',tags:['shooting','footwork','decision'],players:3,
    goal:'Nach einem Block in ein sichtbares freies Wurffenster öffnen.',
    setup:'3 Spieler: Guard oben mit Ball, Forward als Blocksteller und dessen Verteidiger. Ein Korb; Pop zunächst in beherrschte Mitteldistanz.',
    steps:['Den Block rechtzeitig stabil stellen und den Lauf des Guards abwarten.','Wenn der Verteidiger zum Ball hilft, mit offenem Körper seitlich vom Ball weg öffnen.','Hände zeigen und den Rückpass mit bereits ausgerichteten Füßen fangen.','Frei werfen; bei engem Closeout den Ball schützen und mit einem Dribbling die offene Seite angreifen.'],
    read:'Der Pop schafft Breite, ohne den Guard-Lauf zu kreuzen.',
    cues:['Erst stehen, dann öffnen.','Fangposition innerhalb der eigenen sicheren Wurfreichweite wählen.'],errors:['Schon vor der Blocknutzung weglaufen.','Beim Öffnen den Rücken zum Passgeber drehen.'],
    easier:'Verteidiger hilft bei jeder Aktion zum Guard.',harder:'Verteidiger wählt Hilfe oder Rückkehr; Wurf-Drive-Wahl nach dem Fang.',
    measure:'12 Blocks: stabiles Timing, sichtbare Fangfenster und passende Fortsetzung zählen.'
  });
  add('pf', {
    name:'Slip vor der angekündigten Blockübernahme',category:'Footwork',tags:['footwork','drive','decision'],players:4,
    goal:'Eine zu frühe Verteidigerübernahme durch einen kontaktlosen Schnitt bestrafen.',
    setup:'4 Spieler im hohen Pick-and-Roll: Guard, Forward und zwei Verteidiger. Ein Korb; der Slip erfolgt ohne Blockkontakt.',
    steps:['Mit klarer Blickverbindung zum Guard den Blocklauf beginnen.','Wenn beide Verteidiger früh zum Ball beziehungsweise zur Übernahme treten, vor dem Kontakt abbrechen.','Mit offenen Händen direkt durch die freie Mitte zum Korb schneiden.','Pass vor dem Lauf fangen und mit kontrolliertem Abschluss beenden; ohne freie Mitte stehen bleiben und normal blocken.'],
    read:'Nicht jeden Block vorzeitig verlassen; der Slip reagiert auf eine erkennbare frühe Übernahme.',
    cues:['Den Passgeber vor dem Schnitt ansehen.','Nicht zwischen bereits geschlossenen Körpern durchzwängen.'],errors:['Ohne Verteidigerreaktion den Guard allein lassen.','Den Schnitt mit einem Schubser einleiten.'],
    easier:'Verteidiger kündigen die Übernahme sichtbar an.',harder:'Verteidiger wählen frühe Übernahme oder normales Verteidigen.',
    measure:'12 Blockanläufe: richtige Slip-Entscheidung, freie Laufbahn und sichere Fänge zählen.'
  });
  add('pf', {
    name:'Blockwinkel ändern und anschließend kurz öffnen',category:'Footwork',tags:['footwork','decision','passing'],players:4,
    goal:'Nach einem verteidigten Block einen neuen Winkel herstellen und den Rückpass empfangen.',
    setup:'4 Spieler im hohen Pick-and-Roll. Guard zieht nach dem ersten geschlossenen Weg kurz zurück; Forward setzt neu.',
    steps:['Ersten Block stabil stellen und nach dessen Nutzung prüfen, ob der Guard zurückzieht.','Ohne Kontakt aus dem Gegner lösen und den Blockwinkel für die Gegenseite neu setzen.','Erst nach stabilem Stand den Guard vorbeilassen und anschließend zur Freiwurflinie öffnen.','Rückpass fangen und aus Balance werfen oder sofort sicher zum Guard zurückpassen.'],
    read:'Neu stellen nur bei echtem Rückzug des Guards; bei freiem ersten Drive den Raum nicht schließen.',
    cues:['Zwischen den beiden Blockstellungen klar lösen.','Füße vor möglichem Kontakt stabil setzen.'],errors:['Mit dem Verteidiger am Körper mitwandern.','Den zweiten Block mitten in den Guard-Lauf stellen.'],
    easier:'Verteidiger geben den ersten Abbruch fest vor.',harder:'Guard entscheidet selbst, ob er den ersten Weg nutzt oder zurückzieht.',
    measure:'12 Abläufe: richtige Neuorientierung, stabile zweite Stellung und kontrollierter Fang zählen.'
  });
  add('pf', {
    name:'Duck-in aus dem Dunker-Spot bei Hilfeschritt',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Vom Grundlinienraum früh eine tiefe Fangposition hinter der Hilfe gewinnen.',
    setup:'3 Spieler: Forward seitlich neben dem Korb, Guard am Flügel mit Ball und Helfer zwischen beiden. Ein Korb.',
    steps:['Mit Abstand zum Brett im Dunker-Spot bereitstehen und die Bewegung des Helfers lesen.','Beim Hilfeschritt zum Guard hinter dem Helfer in die freie Zone eintreten.','Seitlich zum Ball stabil anbieten, die Hände zeigen und ohne Halten Position sichern.','Den Pass oberhalb der Hüfte fangen und möglichst ohne Dribbling weich abschließen.'],
    read:'Nur in die Lücke treten, wenn der Guard einen freien Passwinkel hat.',
    cues:['Ball und Verteidiger beim Eintreten sehen.','Position mit Füßen und Hüfte gewinnen, nicht mit gestrecktem Arm.'],errors:['Schon vor dem Drive den Korbraum zustellen.','Den Fang direkt hinter dem Brett anbieten.'],
    easier:'Helfer hilft bei jedem Drive klar nach außen.',harder:'Helfer darf bleiben oder zurückkehren; Forward passt den Eintritt an.',
    measure:'12 Situationen: freie tiefe Fänge und Abschlüsse ohne unnötiges Dribbling erfassen.'
  });
  add('pf', {
    name:'High-Low-Pass über die frontende Verteidigung',category:'Passen',tags:['passing','post','decision'],players:3,
    goal:'Vom hohen Post einen tiefen Empfänger mit einem gut dosierten Pass bedienen.',
    setup:'3 Spieler: Forward am hohen Post mit Ball, tiefer Empfänger und frontender Verteidiger. Ein Korb; kein umkämpfter Sprungfang.',
    steps:['Am hohen Post frontal zum Korb mit Ball auf Schulterhöhe stehen.','Warten, bis der tiefe Mitspieler eine klare Zielhand hinter dem Verteidiger zeigt.','Den Pass mit ausreichend Bogen über die Front und in einen sicheren freien Fangraum geben.','Empfänger fängt und schließt kontrolliert ab; ohne klares Fenster den Ball oben halten und neu anbieten lassen.'],
    read:'Die Zielhand allein genügt nicht: hinter ihr muss freier Fang- und Landeraum liegen.',
    cues:['Passhöhe und Länge getrennt dosieren.','Keine langen blinden Lobpässe erzwingen.'],errors:['Zu flach auf den ausgestreckten Verteidigerarm passen.','Den Empfänger hinter die Grundlinie schicken.'],
    easier:'Verteidiger bleibt passiv vor dem Empfänger.',harder:'Verteidiger wechselt Front und seitliche Deckung; Passform entsprechend wählen.',
    measure:'12 Passfenster: sicher fangbare Bälle und korrekt ausgelassene schlechte Fenster zählen.'
  });
  add('pf', {
    name:'Elbow-Hand-off-Fake mit eigenem Korbangriff',category:'Abschluss',tags:['drive','footwork','decision'],players:3,
    goal:'Eine vorweggenommene Ballübergabe mit dem eigenen Drive bestrafen.',
    setup:'3 Spieler: Forward mit Ball am Ellenbogen, vorbeilaufender Guard und Forward-Verteidiger. Ein Korb.',
    steps:['Ball geschützt zur angedeuteten Übergabeseite halten und den Guard heranlaufen lassen.','Wenn der eigene Verteidiger zum Guard tritt, den Ball wieder eng an die Hüfte nehmen.','Vor dem Standbein-Abheben zum Dribbeln lösen und auf der freien Gegenseite zum Korb ziehen.','Kontrolliert abschließen; bleibt der Verteidiger beim Forward, die echte Übergabe ausführen.'],
    read:'Die Täuschung folgt dem Verteidigerwechsel, nicht dem bloßen Vorbeilauf des Guards.',
    cues:['Täuschung zeigen, ohne den Ball ungeschützt auszustrecken.','Guard und Forward brauchen klare Blickverbindung.'],errors:['Den Ball nach einer bereits vollzogenen Übergabe zurückreißen.','Beim Dribbelstart zuerst das Standbein lösen.'],
    easier:'Verteidiger wechselt früh sichtbar zum Guard.',harder:'Verteidiger darf beim Forward bleiben; Übergabe oder eigener Drive entscheiden.',
    measure:'12 Übergabesituationen: richtige Ballbehaltung, legale Starts und freie Abschlüsse zählen.'
  });
  add('pf', {
    name:'Elbow-Pass auf den Backdoor-Cut',category:'Passen',tags:['passing','decision'],players:3,
    goal:'Vom hohen Post den Schnitt eines überverteidigten Flügels präzise bedienen.',
    setup:'3 Spieler: Forward mit Ball am Ellenbogen, Flügelspieler und dessen Denial-Verteidiger. Ein Korb.',
    steps:['Frontal zum Feld stehen und den Ball auf Schulterhöhe schützen.','Den Flügel ansehen und dessen ersten Schritt zum Ball als Vorbereitung erkennen.','Beim anschließenden Backdoor-Cut einen kurzen Bodenpass außen am Verteidiger vor den Lauf spielen.','Nach dem Pass zum Rebound bereit werden; bei geschlossenem Schnitt den Ball halten und neu aufbauen.'],
    read:'Erst passen, wenn der Flügel hinter der Verteidigerhüfte tatsächlich frei wird.',
    cues:['Täuschung des Schneidenden abwarten.','Bodenpasspunkt so setzen, dass der Ball vor dem Lauf hochkommt.'],errors:['Zu früh in den noch besetzten Raum passen.','Den Pass hinter den Schneidenden setzen.'],
    easier:'Verteidiger bleibt nach dem ersten Schritt stehen.',harder:'Verteidiger darf den Schnitt abfangen; Außenangebot bleibt Alternative.',
    measure:'12 Schnittangebote: Pässe ohne Tempobruch und richtige Passabbrüche zählen.'
  });
  add('pf', {
    name:'Baseline-Spin aus dem kurzen Post-Dribbling',category:'Post',tags:['post','dribbling','footwork'],players:3,
    goal:'Eine überdeckte Mitte durch eine geschützte Drehung zur Grundlinie öffnen.',
    setup:'3 Spieler: Forward oberhalb des tiefen Blocks, Verteidiger zur Mitte und Passgeber am Flügel. Ein Korb.',
    steps:['Seitlich zum Feld fangen und den Verteidiger mit der feldseitigen Schulter wahrnehmen.','Ein kurzes geschütztes Dribbling zur Mitte zeigen, ohne den Gegner wegzuschieben.','Bleibt die Grundlinie frei, mit aktivem Dribbling zur Grundlinie drehen und den Ball am Körper führen.','Erst im freien Abschlusswinkel aufnehmen und mit der korbfernen Hand abschließen.'],
    read:'Der Spin passt gegen mittig überdeckten Raum; bei tiefer Grundlinienhilfe rechtzeitig stoppen.',
    cues:['Drehraum vor der Bewegung prüfen.','Ball erst nach dem kontrollierten Richtungswechsel aufnehmen.'],errors:['Mit gehaltenem Ball um mehrere Schritte drehen.','Blind unter das Brett laufen.'],
    easier:'Verteidiger hält die Mitte passiv geschlossen.',harder:'Verteidiger darf vor dem Dribbling die offene Seite wechseln.',
    measure:'12 Fänge: richtige Drehrichtung, geschütztes Dribbling und freie Abschlusswinkel zählen.'
  });
  add('pf', {
    name:'Reverse-Pivot vom Short-Corner zum Face-up',category:'Footwork',tags:['footwork','post','decision'],players:3,
    goal:'Aus dem kurzen Grundlinienraum ohne Schrittfehler zum ganzen Feld öffnen.',
    setup:'3 Spieler: Forward am Short-Corner, Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Mit gebeugten Knien fangen und das Standbein klar bestimmen.','Ball auf der geschützten Seite halten und das freie Bein rückwärts um den Körper drehen.','Im Face-up den Abstand und die offene Hüfte des Verteidigers prüfen.','Bei Platz kurz werfen, bei seitlichem Überdruck rechtzeitig zum Dribbeln lösen und außen vorbeiziehen.'],
    read:'Die Drehung soll Übersicht schaffen; Wurf oder Drive folgt erst dem neuen Bild.',
    cues:['Standbein bleibt auf seinem Kontaktpunkt.','Nach der Drehung Balance vor Tempo.'],errors:['Beide Füße um den Körper versetzen.','Den Ball beim Aufdrehen offen vor den Gegner halten.'],
    easier:'Verteidiger bleibt in festem Abstand stehen.',harder:'Verteidiger variiert Abstand während der Rückwärtsdrehung.',
    measure:'12 Fänge: korrektes Standbein, Sicht zum Feld und passende Folgeentscheidung zählen.'
  });
  add('pf', {
    name:'Running-Hook nach diagonaler Ballaufnahme',category:'Abschluss',tags:['post','shooting','footwork'],players:1,
    goal:'Im kurzen diagonalen Lauf einen dosierten Hakenwurf lösen.',
    setup:'1 Spieler mit Ball seitlich 3 Meter vom Korb, 1 Korb. Hütchen markiert den Aufnahmebereich.',
    steps:['Mit einem kontrollierten Dribbling diagonal Richtung Mitte gehen.','Ball eng am Körper in einer klaren Schrittfolge aufnehmen und den inneren Arm als Wurfarm vorbereiten.','Seitlich zum Korb leicht abspringen und den Ball über die Wurfschulter weich lösen.','Im eigenen Raum landen, Rebound holen und die andere Seite mit der anderen Hand üben.'],
    read:'Bei unkontrollierter Landung das Tempo senken; Distanz erst nach stabiler Dosierung erweitern.',
    cues:['Der Wurf steigt über die Schulter.','Kurzer weicher Handgelenkabschluss statt seitlichem Schleudern.'],errors:['Den Ball quer über den Körper werfen.','Zusatzschritte nach der Aufnahme machen.'],
    easier:'Im Stand aus kurzer Entfernung mit einer Hand beginnen.',harder:'Den Aufnahmebereich von leicht unterschiedlichen Startwinkeln anlaufen.',
    measure:'Je Seite 6 Versuche: klare Aufnahme, stabile Landung und Treffer zählen.'
  });
  add('pf', {
    name:'Inside-Pivot mit Step-through am mittleren Post',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Nach einer kurzen Wurftäuschung unter der angehobenen Hand durchsteigen.',
    setup:'3 Spieler: Forward im mittleren Post, passiver Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Pass fangen, mit einem klaren Pivot zur Mitte aufdrehen und das Standbein am Ort halten.','Den kurzen Wurf glaubhaft zeigen, dabei mit beiden Füßen am Boden bleiben.','Hebt der Verteidiger die Hand, mit dem freien Bein in den seitlich freien Raum durchsteigen.','Zum Abschluss abspringen und den Ball lösen, bevor ein angehobener Fuß erneut aufsetzt.'],
    read:'Bleibt die Hand tief und das Wurffenster frei, direkt werfen statt unnötig durchsteigen.',
    cues:['Standbein bei der Täuschung kontrollieren.','Durch freien Raum steigen, nicht durch die Beine des Gegners.'],errors:['Mit der Täuschung abspringen und den Ball behalten.','Vor dem Abwurf mit gehobenem Standbein wieder landen.'],
    easier:'Verteidiger hebt die Hand vorgegeben an.',harder:'Verteidiger entscheidet hohe Hand oder Abstand.',
    measure:'12 Aktionen: passende Wahl, saubere Fußfolge und kontrollierte Abschlüsse zählen.'
  });
  add('pf', {
    name:'Offensivrebound mit Power-Gather und sicherem Putback',category:'Rebound',tags:['footwork','shooting','decision'],
    goal:'Den Rebound in eine stabile beidbeinige Abschlussbasis überführen.',
    setup:'2 Spieler unter einem Korb: Forward mit eigenem Brettwurf und passiver Verteidiger seitlich. Sichere Landefläche freihalten.',
    steps:['Den Brettabpraller mit beiden Händen am höchsten kontrollierbaren Punkt sichern.','Mit gebeugten Knien auf beiden Füßen landen und den Ball oben halten.','Bei freiem Fenster ohne weiteren Schritt aus beiden Beinen hochgehen.','Steht die hohe Hand im Weg, erst auf dem Boden eine kurze Täuschung zeigen und dann aus Balance abschließen.'],
    read:'Ein sofortiger Putback braucht Balance und freien Raum; bei Druck den Ball zuerst sichern.',
    cues:['Landung aktiv abfedern.','Ball über Brusthöhe behalten.'],errors:['Den Ball vor dem zweiten Sprung nach unten holen.','In einen besetzten Landeraum springen.'],
    easier:'Ohne Verteidiger den sicheren Fang-Lande-Wurf-Ablauf üben.',harder:'Verteidiger zeigt nach der Landung wechselnd hohe Hand oder Abstand.',
    measure:'12 Rebounds: sichere Landungen, Ball oben gehalten und Putbacks aus Balance zählen.'
  });
  add('pf', {
    name:'Langes Closeout mit einem Dribbling bestrafen',category:'Abschluss',tags:['drive','footwork','decision'],
    goal:'Als äußerer Forward den langen Anlauf eines Bigs für einen direkten Drive nutzen.',
    setup:'2 Spieler: Forward mit Eigenzuspiel am Flügel, Verteidiger startet tief in der Zone. Ein Korb.',
    steps:['Eigenpass in Wurfbereitschaft fangen und den Anlauf des Verteidigers ansehen.','Den Ball kurz im Wurfansatz zeigen, ohne abzuspringen.','Bei überlangem Closeout vor dem Standbein-Abheben zum Dribbeln lösen und an der offenen Hüfte vorbeigehen.','Mit genau einem kräftigen kontrollierten Dribbling Raum gewinnen und dann legal abschließen.'],
    read:'Bei früh gebremstem Closeout nicht den Ein-Dribbling-Drive erzwingen, sondern das freie Wurffenster prüfen.',
    cues:['Länge des ersten Schritts statt Zahl der Dribblings nutzen.','Ball am äußeren Körperrand führen.'],errors:['Den Ball erst nach dem Antritt auf den Boden bringen.','Direkt in die Brust des anlaufenden Bigs ziehen.'],
    easier:'Verteidiger läuft immer einen festen Winkel an.',harder:'Verteidiger variiert Anlauf und Abbremsen.',
    measure:'12 Aktionen: richtige Wahl, legale Starts und gewonnenes Abschlussfenster zählen.'
  });
  add('pf', {
    name:'Screen-away und anschließender Dive',category:'Footwork',tags:['footwork','decision','drive'],players:4,
    goal:'Nach einem Block abseits des Balls den freien eigenen Korbweg erkennen.',
    setup:'4 Spieler: Forward oben, Flügelspieler, dessen Verteidiger und Passgeber am gegenüberliegenden Slot. Ein Korb.',
    steps:['Zum Flügel laufen und mit ausreichendem Abstand einen stabilen kontaktarmen Block stellen.','Den Flügelspieler am Block vorbeiziehen lassen und die Orientierung des Verteidigers prüfen.','Folgt der Verteidiger dem Flügel nach außen, mit offenen Händen in die freie Zone abrollen.','Pass im freien Fenster fangen und kurz abschließen; ohne Fenster erneut außen anbieten.'],
    read:'Nicht gleichzeitig mit dem Flügel in denselben Raum schneiden.',
    cues:['Block vor dem Lauf des Mitspielers stabil stellen.','Nach dem Lösen sofort Ball und Korb sehen.'],errors:['Mit dem Verteidiger am Körper zum Korb wandern.','Den eigenen Schnitt zu früh vor dem Flügel starten.'],
    easier:'Verteidiger folgt dem Flügel immer nach außen.',harder:'Verteidiger bleibt wechselweise beim Blocksteller; Forward entscheidet Dive oder Außenangebot.',
    measure:'12 Blockaktionen: stabiles Timing, getrennte Laufwege und freie Dive-Fänge zählen.'
  });
  add('pf', {
    name:'Seal bei Ballumkehr auf die neue Passseite',category:'Post',tags:['post','footwork','decision'],players:4,
    goal:'Mit der Ballverlagerung die eigene Fangseite im Post rechtzeitig wechseln.',
    setup:'4 Spieler: Forward am tiefen Post, Verteidiger und zwei Passgeber an den Flügeln. Ein Korb.',
    steps:['Zur ersten Ballseite seitlich stabil anbieten und den Verteidiger lokalisieren.','Während des Flügelpasses die eigene Stellung zum neuen Ballwinkel drehen.','Mit Füßen und Hüfte eine freie Zielhand auf der neuen Seite herstellen, ohne den Gegner zu halten.','Den neuen Postpass fangen und an der offenen Schulter kurz abschließen.'],
    read:'Die freie Seite ändert sich mit dem Ballwinkel; nicht starr an der alten Zielhand festhalten.',
    cues:['Ballumkehr sehen, bevor der Pass im neuen Flügel ankommt.','Die Position aus den Füßen heraus verändern.'],errors:['Nach der Ballumkehr mit dem Rücken zum neuen Passgeber stehen.','Den Verteidiger beim Umstellen wegziehen.'],
    easier:'Verteidiger bewegt sich nur langsam mit dem Ball.',harder:'Verteidiger wechselt zwischen Front und seitlicher Deckung.',
    measure:'12 Ballumkehren: rechtzeitig neue Zielhand, sichere Fänge und passende Abschlussseite zählen.'
  });
  add('pf', {
    name:'Rim-run in den tiefen frühen Fang',category:'Abschluss',tags:['footwork','post','decision'],players:3,
    goal:'Als nachrückender Forward früh eine freie tiefe Position vor der geordneten Defense gewinnen.',
    setup:'3 Spieler ab der Mittellinie: Guard mit Ball, laufender Forward und begleitender Verteidiger. Ein Korb; kontrolliertes Lauftempo.',
    steps:['Auf einer vom Guard getrennten Spur in Richtung Korb laufen.','Vor der Zone den Ball ansehen und den Verteidiger mit einer stabilen seitlichen Position hinter die Hüfte bringen.','Im freien Passwinkel Hände zeigen und den Ball sicher fangen.','Möglichst ohne Dribbling weich abschließen; bei fehlendem Pass danach aus der Zone lösen.'],
    read:'Ein tiefer Lauf ist nur hilfreich, wenn der Passgeber den Winkel hat; nicht unter dem Brett stehen bleiben.',
    cues:['Spur zum Ballvortrag offen halten.','Vor dem Fang abbremsen und stabil werden.'],errors:['Ungebremst in den tiefen Fang laufen.','Den Verteidiger unter dem Brett wegschieben.'],
    easier:'Verteidiger folgt passiv einen halben Schritt zurück.',harder:'Verteidiger darf die Passseite schließen; Forward muss früher einen anderen Winkel anbieten.',
    measure:'12 Läufe: freie tiefe Fänge, stabile Fangposition und Abschlüsse ohne Dribbling erfassen.'
  });

  // Center: Fangposition, Touch, Post-Kontermoves und Entscheidungen am Korb.
  add('c', {
    name:'Seitliche Post-Position mit Blick zum Feld',category:'Post',tags:['post','footwork','passing'],players:3,
    goal:'Einen sicheren Postfang herstellen, ohne die Sicht auf Mitspieler und Hilfe zu verlieren.',
    setup:'3 Spieler: Center oberhalb des tiefen Blocks, Verteidiger in seitlicher Deckung und Passgeber am Flügel. Ein Korb.',
    steps:['Seitlich zum Feld stehen und den Verteidiger mit Schulter und Hüfte lokalisieren.','Mit stabilem Stand zwischen Gegner und Fanghand Position gewinnen; weder halten noch wegdrücken.','Äußere Zielhand zeigen, Pass sicher beidhändig fangen und den Ball auf Schulterhöhe schützen.','Zum Feld sehen und den Ball zum Passgeber zurückspielen; danach Verteidigerseite wechseln.'],
    read:'Ist die Fanghand nicht frei, zuerst den eigenen Winkel verbessern statt den Pass durch den Gegner zu fordern.',
    cues:['Spielfeld und Ball möglichst gleichzeitig sehen.','Fangposition mit Füßen und Hüfte herstellen.'],errors:['Ganz mit dem Rücken zum Feld stehen.','Den Verteidiger mit gestrecktem Arm festhalten.'],
    easier:'Verteidiger steht passiv auf einer festgelegten Seite.',harder:'Verteidiger wechselt vor dem Pass zwischen seitlicher Deckung und Front.',
    measure:'12 Fangangebote: sichtbare Zielhand, sichere Fänge und Feldblick nach dem Fang zählen.'
  });
  add('c', {
    name:'Jump-Hook zur Mitte aus stabilem Postfang',category:'Post',tags:['post','shooting','footwork'],players:3,
    goal:'Mit einem kontrollierten Raumgewinn einen weichen Hakenwurf zur Mitte vorbereiten.',
    setup:'3 Spieler: Center oberhalb des tiefen Blocks, grundlinienseitiger Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Seitlich zum Feld fangen und die grundlinienseitige Verteidigerposition prüfen.','Mit höchstens einem geschützten Dribbling in die freie Mitte gehen, ohne die gegnerische Brust wegzustoßen.','Ball aufnehmen, stabil zum Hakenwurf ausrichten und über die vom Gegner abgewandte Schulter lösen.','Finger und Handgelenk weich ausstrecken, kontrolliert landen und beide Hände trainieren.'],
    read:'Der Weg zur Mitte muss frei sein; gegen eine dort stehende Brust keine Kraftaktion erzwingen.',
    cues:['Ball bleibt vom Verteidiger abgeschirmt.','Wurf über die Schulter statt seitlich wegschleudern.'],errors:['Den Ball vor dem Wurf tief absenken.','Mit dem freien Arm den Gegner wegdrücken.'],
    easier:'Verteidiger steht passiv, Distanz auf 1 bis 2 Meter verkürzen.',harder:'Verteidiger darf die Mitte früher schließen; Center muss abbrechen oder zur Grundlinie lösen.',
    measure:'Je Hand 6 Aktionen: sichere Ballaufnahme, stabile Landung und Treffer zählen.'
  });
  add('c', {
    name:'Drop-Step zur freien Grundlinie',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Eine zur Mitte überdeckte Verteidigung mit einem klaren Grundlinienschritt bestrafen.',
    setup:'3 Spieler: Center oberhalb des tiefen Blocks, zur Mitte versetzter Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Pass stabil fangen und das Standbein sowie den freien Grundlinienraum wahrnehmen.','Falls nötig ein kurzes geschütztes Dribbling zur Mitte zeigen und dabei keine besetzte Position wegschieben.','Ball in klarer Fußfolge aufnehmen und mit dem freien Bein zur Grundlinie hinter die offene Hüftlinie treten.','Den Körper zwischen Gegner und Ball bringen und mit der Außenhand weich abschließen.'],
    read:'Der Drop-Step passt gegen hoch zur Mitte stehenden Gegner; bei tiefer Grundlinienposition zur Mitte lesen.',
    cues:['Nicht zu tief unter dem Brett fangen.','Freier Fuß gewinnt Winkel, nicht bloß seitliche Distanz.'],errors:['Standbein beim gehaltenen Ball verschieben.','Mit dem freien Arm den Weg freischieben.'],
    easier:'Verteidiger hält die Mitte fest geschlossen.',harder:'Verteidiger wechselt vor dem Fang zwischen hoher und tiefer Position.',
    measure:'12 Fänge: richtig gelesene Seite, saubere Fußfolge und freie Abschlusswinkel zählen.'
  });
  add('c', {
    name:'Up-and-Under nach angedeutetem Hakenwurf',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Einen hoch reagierenden Verteidiger mit einer Wurftäuschung und Durchstieg überwinden.',
    setup:'3 Spieler: Center am tiefen Post, passiver Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Fangen und mit stabilem Stand zur freien Mitte aufdrehen.','Den Hakenwurf bis zum Wurfansatz zeigen, dabei die Füße am Boden lassen.','Hebt der Gegner die Hand oder springt kontrolliert nach oben, mit dem freien Bein in den freien Raum durchsteigen.','Ball eng schützen und vor erneutem Aufsetzen eines angehobenen Fußes weich zum Korb lösen.'],
    read:'Bleibt der Gegner tief, den freien Hakenwurf nutzen; der Durchstieg ist eine Antwort auf seine hohe Reaktion.',
    cues:['Täuschung aus derselben Bewegung wie der echte Hakenwurf.','Den Ball auf dem Durchstieg nah am Körper führen.'],errors:['Mit der Täuschung abspringen und den Ball behalten.','Vor dem Abwurf das angehobene Standbein wieder aufsetzen.'],
    easier:'Verteidiger hebt nach der Täuschung immer die Hand.',harder:'Verteidiger wählt hohe Hand oder Abstand; Hakenwurf oder Durchstieg entscheiden.',
    measure:'12 Aktionen: passende Wahl, regelkonforme Fußfolge und weiche Abschlüsse zählen.'
  });
  add('c', {
    name:'Drop-Step-Konter mit Rückdrehung zur Mitte',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Nach geschlossener Grundlinie über das bestehende Standbein zum freien Gegenwinkel finden.',
    setup:'3 Spieler: Center oberhalb des Blocks, Verteidiger und Passgeber am Flügel. Ein Korb; erster Drop-Step zunächst ohne Tempo.',
    steps:['Fangen und mit klar festgelegtem Standbein einen kontrollierten Drop-Step zur Grundlinie zeigen.','Schließt der Gegner diesen Winkel, auf beiden Füßen tief bleiben und eine kurze Wurftäuschung zeigen.','Über dasselbe Standbein zur freien Mitte zurückdrehen; kein zusätzlicher Wechsel des Standbeins.','Aus dem gewonnenen Fenster einen kurzen Haken oder Brettwurf lösen und stabil landen.'],
    read:'Die Rückdrehung braucht freien Raum zur Mitte; bleibt auch der zu, sicher nach außen passen lassen.',
    cues:['Standbein während beider Drehungen bewusst halten.','Ball eng am Körper und oberhalb der Hüfte schützen.'],errors:['Beim Rückdrehen beide Füße versetzen.','Durch den Verteidiger statt in freien Raum drehen.'],
    easier:'Verteidiger schließt die Grundlinie früh und passiv.',harder:'Verteidiger entscheidet, ob er die erste Bewegung schließt oder frei lässt.',
    measure:'12 Abläufe: korrekte Erst-oder-Konter-Wahl, festes Standbein und Abschlussbalance zählen.'
  });
  add('c', {
    name:'Half-Spin mit Schulter- und Blicktäuschung',category:'Post',tags:['post','footwork','decision'],players:3,level:'Fortgeschritten',
    goal:'Eine kurze Drehantäuschung nutzen, um den Gegner vor dem echten Abschluss zu verschieben.',
    setup:'3 Spieler: Center am mittleren Post, Verteidiger und Passgeber am Flügel. Ein Korb; Standbein nach dem Fang benennen.',
    steps:['Fangen, Ball sichern und mit Blick über eine Schulter die Drehrichtung antäuschen.','Mit dem freien Fuß nur eine kleine halbe Drehung zeigen, ohne das Standbein zu verändern.','Verlagert der Gegner das Gewicht, über dasselbe Standbein in die freie Gegenrichtung drehen.','Aus Balance mit kurzem Hakenwurf abschließen; ohne Gewichtsreaktion den ersten freien Winkel nutzen.'],
    read:'Die Schultertäuschung wirkt auf das Gewicht des Gegners, nicht nur auf dessen Hände.',
    cues:['Kleine glaubwürdige Täuschung statt großer Pirouette.','Ball nicht vor den Körper des Gegners führen.'],errors:['Mehrfach das Standbein wechseln.','Mit Schwung drehen und die Balance verlieren.'],
    easier:'Verteidiger folgt der Schultertäuschung bewusst.',harder:'Verteidiger bleibt teilweise zu Hause; Erstbewegung oder Gegenrichtung frei wählen.',
    measure:'12 Fänge: erkennbare Gewichtsreaktion, saubere Pivots und freie Abschlussfenster zählen.'
  });
  add('c', {
    name:'Tiefer Seal und direkter Catch-Finish',category:'Post',tags:['post','footwork','shooting'],players:3,
    goal:'Eine bereits gewonnene tiefe Fangposition ohne unnötiges Dribbling nutzen.',
    setup:'3 Spieler: Center nahe dem Korb mit sicherem Abstand zum Brett, Verteidiger hinter der Hüfte und Passgeber am Flügel.',
    steps:['Seitlich zum Passgeber stabil stehen und eine freie Zielhand zeigen.','Den Pass beidhändig oberhalb der Hüfte sichern und den Gegner mit dem eigenen Körper abschirmen.','Bei freier Korbseite ohne Ballabsenken aus stabilen Füßen aufrichten.','Mit der korbfernen Hand direkt abschließen, dann Rollen wechseln.'],
    read:'Bei engem Contest den Ball sichern und erst das Fenster öffnen; tiefer Fang erzwingt keinen sofortigen Wurf.',
    cues:['Kein Dribbling, wenn die Position schon gut ist.','Weiche Hand statt zu viel Kraft auf Nahdistanz.'],errors:['Den tief gefangenen Ball erst auf den Boden bringen.','Unter dem Brett mit zu flachem Winkel abschließen.'],
    easier:'Verteidiger bleibt passiv hinter dem Center.',harder:'Verteidiger zeigt seitlich eine Hand; Center wählt direkten Abschluss oder kurze Täuschung.',
    measure:'12 Fänge: Ball oben gehalten, direkte kontrollierte Abschlüsse und Treffer zählen.'
  });
  add('c', {
    name:'Roll-Catch mit kurzen Füßen und sicherem Touch',category:'Abschluss',tags:['footwork','shooting','decision'],players:3,
    goal:'Einen Pass im Abrollen kontrollieren und aus gebremstem Lauf weich abschließen.',
    setup:'3 Spieler: Center als hoher Blocksteller, Guard mit Ball am Slot und tiefer Helfer. Ein Korb.',
    steps:['Nach dem stabilen Block mit offenen Händen diagonal zum Korb rollen.','Vor dem Fang die Schritte verkürzen und den Ball nah vor dem Körper sichern.','Mit klarer Aufnahme- und Schrittfolge vor dem Helfer oder seitlich neben ihm zum Stillstand kommen.','Den freien Brettwinkel weich nutzen; bei geschlossener Position den Ball sicher zum Guard zurückpassen.'],
    read:'Der Helfer bestimmt das Fangtempo und den Abschlusswinkel; nicht ungebremst durchlaufen.',
    cues:['Hände früh zum Guard öffnen.','Kurze Füße vor dem Fang schaffen Balance.'],errors:['Mit voller Geschwindigkeit in den tiefen Helfer laufen.','Nach der Ballaufnahme mehrere kleine Zwischenschritte machen.'],
    easier:'Ohne Helfer die Fang-Schrittfolge in Gehgeschwindigkeit üben.',harder:'Helfer verändert die seitliche Position vor dem Pass.',
    measure:'12 Rollfänge: sichere Ballkontrolle, legale Fußfolge und passende Abschlusswahl zählen.'
  });
  add('c', {
    name:'Mikan-Touch mit der schwächeren Hand',category:'Abschluss',tags:['shooting','footwork'],players:1,
    goal:'Aus kurzer Distanz die schwächere Hand mit weicher Balllösung entwickeln.',
    setup:'1 Spieler unter einem Korb mit Ball. Zwei Bodenpunkte jeweils seitlich vor dem Brett markieren sichere Absprungstellen.',
    steps:['An einer Markierung beginnen und den Ball ohne Anlauf weich mit der schwächeren Hand ans Brett geben.','Ball sicher beidhändig fangen und kontrolliert zur zweiten Markierung versetzen.','Von dort denselben dosierten Abschluss mit der schwächeren Hand aus einem anderen Brettwinkel üben.','Nach drei Versuchen pro Brettseite kurz pausieren und die Fehlrichtung des Balls benennen.'],
    read:'Zu harte oder flache Würfe zeigen, dass Distanz und Tempo noch reduziert werden sollten.',
    cues:['Ball über Finger und Handgelenk weich lösen.','Beine tragen die Bewegung; die Hand dosiert.'],errors:['Den Ball mit steifem Arm gegen das Brett drücken.','Unter dem Brett ohne klaren Winkel stehen.'],
    easier:'Jeden Versuch im Stand aus einem sicheren Nahwinkel beginnen.',harder:'Nach sicherem Rebound einen kleinen kontrollierten Schritt vor dem Abschluss ergänzen.',
    measure:'12 Abschlüsse: Treffer und zu harte, zu lange oder zu kurze Versuche getrennt notieren.'
  });
  add('c', {
    name:'Reverse-Mikan mit Blick auf den freien Brettwinkel',category:'Abschluss',tags:['shooting','footwork'],players:1,
    goal:'Die gegenüberliegende Brettseite aus kurzer Distanz sicher und gefühlvoll treffen.',
    setup:'1 Spieler mit Ball seitlich unter einem Korb. Laufraum unter dem Brett freihalten.',
    steps:['Von einer Brettseite mit kontrollierter Ballaufnahme unter den Korb gehen.','Den Kopf vor dem Absprung zur gegenüberliegenden Brettseite drehen.','Den Ball dort mit der passenden Außenhand weich gegen das Brett lösen, ohne ihn weit hinter den Kopf zu ziehen.','Sicher landen und den Ball fangen; anschließend von der anderen Seite starten.'],
    read:'Ist der gegenüberliegende Brettwinkel nicht sichtbar, früher bremsen und den Laufpunkt korrigieren.',
    cues:['Erst das Brettziel sehen, dann den Ball lösen.','Absprung nicht zu tief hinter dem Brett setzen.'],errors:['Blind rückwärts werfen.','Den Ball hart und flach unter den Ring schleudern.'],
    easier:'Ohne Lauf aus einem seitlichen Stand den Reverse-Winkel finden.',harder:'Einen kontrollierten letzten Dribbelkontakt vor dem Unterlaufen ergänzen.',
    measure:'Je Seite 6 Versuche: sichtbares Ziel, kontrollierte Landung und Dosierungsfehler zählen.'
  });
  add('c', {
    name:'Short-Roll-Fang mit Pass zum Cutter',category:'Passen',tags:['passing','decision','footwork'],players:4,
    goal:'Aus der kurzen Rolle einen durchlaufenden Mitspieler früh erkennen.',
    setup:'4 Spieler: Guard am Slot, Center an der Freiwurflinie, Cutter am Flügel und Helfer am Zonenrand. Ein Korb.',
    steps:['Vom kurzen Rollweg frontal zum Guard aufdrehen und stabil fangen.','Den Korb mit Blick und Körper zeigen, um den Helfer zu binden.','Wenn der Helfer vortritt, den hinter ihm startenden Cutter ansehen und kurz in dessen Lauf passen.','Bleibt der Helfer tief beim Cutter, selbst den freien kurzen Wurf nehmen oder zum Guard zurückpassen.'],
    read:'Der Cutter muss hinter der Hilfe frei werden, bevor der Pass gespielt wird.',
    cues:['Mit dem Fang schon die zweite Seite sehen.','Pass kurz und ohne langes Ausholen spielen.'],errors:['Mit dem Rücken zum Cutter stehen bleiben.','In den noch nicht geöffneten Schnittweg passen.'],
    easier:'Helfer tritt früh und deutlich vor.',harder:'Helfer variiert; Cutter reagiert erst auf den Fang des Centers.',
    measure:'12 Fänge: richtige Wahl und Pässe ohne Tempoverlust des Cutters zählen.'
  });
  add('c', {
    name:'DHO-Keeper mit geschütztem ersten Dribbling',category:'Abschluss',tags:['drive','footwork','decision'],players:3,
    goal:'Als Center die überverteidigte Übergabe mit einem freien eigenen Korbweg beantworten.',
    setup:'3 Spieler: Center am hohen Post mit Ball, Guard auf Übergabekurs und Center-Verteidiger. Ein Korb.',
    steps:['Dem Guard den Ball in geschützter Übergabeposition zeigen.','Wenn der Verteidiger über die Übergabeseite schiebt, Ball eng am Körper behalten.','Den Ball vor dem Standbein-Abheben auf die freie Hand zum Dribbeln lösen.','Mit höchstens zwei Dribblings den freien Korbweg nutzen; bleibt der Verteidiger innen, die echte Übergabe spielen.'],
    read:'Den Keeper nur wählen, wenn die Verteidigung den eigenen Weg tatsächlich freigibt.',
    cues:['Klare Ballkontrolle vor der Entscheidung.','Guard darf nicht in den eigenen Drive laufen.'],errors:['Dem Guard den Ball entreißen, nachdem er ihn schon übernommen hat.','Den Dribbelstart mit einem Schrittfehler beginnen.'],
    easier:'Verteidiger nimmt die Übergabeseite vorgegeben weg.',harder:'Verteidiger wechselt zwischen Innenbleiben und Übernahme der Übergabe.',
    measure:'12 Übergaben: passende Keeper-Wahl, sicherer Ballbesitz und legale Starts zählen.'
  });
  add('c', {
    name:'Winkel-Screen mit kurzem Seal nach der Übernahme',category:'Post',tags:['post','footwork','decision'],players:4,
    goal:'Nach einem Switch den kleineren Ballverteidiger in einer freien Fangposition halten.',
    setup:'4 Spieler im hohen Pick-and-Roll. Zwei Verteidiger übernehmen kontrolliert; der Größenunterschied wird nur durch Position simuliert.',
    steps:['Den Block mit ausreichendem Abstand und stabilem Stand stellen.','Nach der Übernahme zum Korb öffnen und den nun zugeordneten Guard-Verteidiger lokalisieren.','Mit eigener Hüfte und Füßen seitlich zum Ball eine freie Zielhand herstellen, ohne zu halten.','Den frühen Pass fangen und mit höchstens einem Dribbling kurz abschließen.'],
    read:'Erst die wirkliche Übernahme erkennen; ohne Switch normal abrollen statt einen falschen Gegner zu versiegeln.',
    cues:['Ball und neuen Gegner gleichzeitig sehen.','Position vor dem Pass herstellen.'],errors:['Beim Seal den Gegner am Arm festhalten.','Nach dem Switch lange ohne freien Passwinkel stehen bleiben.'],
    easier:'Verteidiger übernehmen bei jeder Aktion fest.',harder:'Verteidiger wählen Switch oder Begleitung; Center passt Rollweg und Fangposition an.',
    measure:'12 Blocks: Übernahme korrekt gelesen, freie Zielhand und sichere frühe Fänge zählen.'
  });
  add('c', {
    name:'Re-Post nach Rückpass für einen besseren Fangwinkel',category:'Post',tags:['post','passing','footwork'],players:3,
    goal:'Eine schlechte erste Position durch Rückpass und erneutes Anbieten verbessern.',
    setup:'3 Spieler: Center etwas weit vom Korb, Verteidiger und Passgeber am Flügel. Ein Korb.',
    steps:['Ersten Pass sicher fangen und prüfen, ob der Abschlusswinkel durch Abstand oder Verteidigung schlecht ist.','Den Ball sicher zum Flügel zurückspielen, ohne vorher unnötig zu dribbeln.','Während des Rückpasses mit kurzen Schritten in eine bessere seitliche Fangposition lösen und die neue Zielhand zeigen.','Erneut fangen und die jetzt offene Schulter für einen kurzen Abschluss nutzen.'],
    read:'Das Wiederanbieten verbessert Winkel und Abstand; nicht mit dem Gegner gemeinsam unter das Brett schieben.',
    cues:['Nach dem Rückpass sofort Füße bewegen.','Neue Position muss für den Flügel sichtbar sein.'],errors:['Nach dem Rückpass unverändert stehen bleiben.','Den Verteidiger mit beiden Armen rückwärts schieben.'],
    easier:'Verteidiger lässt den neuen Winkel passiv zu.',harder:'Verteidiger versucht den zweiten Pass seitlich zu schließen.',
    measure:'12 Rückpassfolgen: erkennbare Verbesserung der Fangposition und sichere zweite Fänge zählen.'
  });
  add('c', {
    name:'Front-Counter mit Öffnen zum sicheren Lobfenster',category:'Post',tags:['post','footwork','decision'],players:3,
    goal:'Gegen eine Frontdeckung einen sicheren freien Fangraum hinter dem Verteidiger anbieten.',
    setup:'3 Spieler: Center am tiefen Post, frontender Verteidiger und Passgeber am hohen Flügel. Ein Korb; keine umkämpften Sprungduelle.',
    steps:['Die Frontdeckung wahrnehmen und mit kurzem Pivot den eigenen Körper zum Passgeber öffnen.','Den Verteidiger mit stabiler Hüftposition vor sich halten, ohne ihn zu greifen.','Eine klare hohe Zielhand in freien Fangraum zeigen und den Ball nur bei sicherem Landeraum fordern.','Dosierten Lob beidhändig sichern, stabil landen und erst dann kontrolliert abschließen.'],
    read:'Fehlt freier Raum hinter der Front, Ballumkehr verlangen statt einen riskanten Lob zu erzwingen.',
    cues:['Zielhand zeigt echten freien Raum.','Fang und sichere Landung vor dem Abschluss priorisieren.'],errors:['Den Gegner festhalten, um den Lob freizumachen.','Im Sprung in einen besetzten Bereich greifen.'],
    easier:'Frontverteidiger bleibt fest und der Passweg ist offen.',harder:'Verteidiger wechselt Front und seitliche Deckung; normales Anspiel oder Lob wählen.',
    measure:'12 Angebote: freie sichere Lobfenster, stabile Fänge und richtig verworfene unsichere Fenster zählen.'
  });
  add('c', {
    name:'Cross-Lane-Duck-in nach Ballverlagerung',category:'Post',tags:['post','footwork','decision'],players:4,
    goal:'Beim Flügelwechsel von der Gegenseite rechtzeitig eine tiefe Position anbieten.',
    setup:'4 Spieler: Center am ballfernen tiefen Block, Verteidiger und zwei Flügelpassgeber. Ein Korb.',
    steps:['Den Pass zwischen den Flügeln sehen und den freien Weg quer durch die Zone prüfen.','Mit kurzen schnellen Schritten vor der Hüftlinie des mitgehenden Verteidigers zur neuen Ballseite eintreten.','Vor dem Postpass stabil seitlich stehen und die ballnahe Zielhand zeigen.','Sicher fangen und ohne langes Dribbeln auf der freien Seite abschließen.'],
    read:'Die neue Position muss vor dem Postpass stehen; bei voller Zone am Ausgangsort Breite halten.',
    cues:['Auf den fliegenden Flügelpass reagieren.','Nicht erst nach dem Ballfang des Passgebers loslaufen.'],errors:['Mit dem Verteidiger seitlich um Position ringen.','Im Fang noch quer durch die Zone laufen.'],
    easier:'Verteidiger folgt langsam auf festem Weg.',harder:'Verteidiger versucht die neue Zielhand zu schließen; Center muss den Eintrittswinkel ändern.',
    measure:'12 Verlagerungen: rechtzeitige stabile Position, freie Zielhand und sichere Fänge zählen.'
  });
  add('c', {
    name:'Rebound sichern, Chin-Pivot und Outlet',category:'Rebound',tags:['defense','passing','footwork'],players:3,
    goal:'Nach dem Defensivrebound den Ball schützen und den ersten sicheren Pass öffnen.',
    setup:'3 Spieler: Center unter dem Korb, passiver Druckspieler seitlich und Outletpartner am Flügel. Center beginnt mit leichtem Eigenwurf ans Brett.',
    steps:['Abpraller beidhändig sichern und mit gebeugten Knien stabil landen.','Ball seitlich auf Kinnhöhe schützen; Ellenbogen bleiben im eigenen Raum.','Über ein bewusst gehaltenes Standbein zum Outletpartner aufdrehen und die gegnerischen Hände ansehen.','Mit kurzem Brust- oder Schulterpass sicher nach außen spielen; bei verdecktem Ziel Ball halten und neu öffnen.'],
    read:'Der erste sichere Pass geht vor einem hektischen weiten Outlet durch Hände.',
    cues:['Ball nicht unter die Brust senken.','Vor dem Pass den Empfänger sehen.'],errors:['Mit weit ausgeschlagenen Ellenbogen Raum schaffen.','Blind über die Schulter passen.'],
    easier:'Druckspieler bleibt seitlich stehen.',harder:'Outletpartner wechselt Flügelseite und der Druckspieler schließt einen Passwinkel.',
    measure:'12 Rebounds: sichere Landung, geschützter Pivot und fangbare Outlets zählen.'
  });
  add('c', {
    name:'Post-Doppel erkennen und aus dem Druck passen',category:'Passen',tags:['post','passing','decision'],players:4,
    goal:'Vor dem zweiten Verteidiger den Ball sichern und den freien Rückpass finden.',
    setup:'4 Spieler: Center am tiefen Post, direkter Verteidiger, von oben kommender Helfer und Passpartner am Flügel. Ein Korb.',
    steps:['Seitlich zum Feld fangen und vor dem ersten Dribbling die obere Hilfe ansehen.','Wenn der zweite Verteidiger kommt, den Ball auf Schulterhöhe sichern und stabil bleiben.','Mit kleinem Pivot das freie Außenfenster öffnen, ohne den Ball zwischen die beiden Gegner zu senken.','Zum freien Flügelpartner passen; bleibt die Hilfe weg, die freie Schulter für einen kurzen Abschluss nutzen.'],
    read:'Die Hilfe früh sehen und nicht erst nach mehreren Dribblings auf zwei geschlossene Hände reagieren.',
    cues:['Feldblick direkt nach dem Fang.','Ball oben und Pass kurz halten.'],errors:['Mit dem Kopf unten in die doppelte Deckung dribbeln.','Aus dem Notabsprung quer über die Zone passen.'],
    easier:'Helfer kündigt den Anlauf früh an.',harder:'Helfer täuscht den Anlauf an oder kommt wirklich; Rückpass oder eigener Abschluss wählen.',
    measure:'12 Postfänge: Hilfe korrekt erkannt, sichere Ausstiegspässe und Ballverluste zählen.'
  });
  add('c', {
    name:'High-Low-Empfang mit Zielhand und geschützter Landung',category:'Post',tags:['post','footwork','shooting'],players:3,
    goal:'Einen Pass vom hohen Post ohne Ballabsenken in einen sicheren Nahabschluss überführen.',
    setup:'3 Spieler: Center tief seitlich am Korb, seitlicher Verteidiger und Passgeber am hohen Post. Ein Korb.',
    steps:['Zum hohen Passgeber seitlich öffnen und den Verteidiger mit eigener Körperposition abschirmen.','Die freie Zielhand oberhalb der Schulter zeigen und den Pass mit beiden Händen entgegennehmen.','Stabil im freien Raum landen oder im Stand fangen; den Ball oben behalten.','Die freie Brettseite nutzen und ohne unnötiges Dribbling weich abschließen.'],
    read:'Die Zielhand nur in einen Raum zeigen, in dem Fang und Landung sicher sind.',
    cues:['Erst Position, dann Hände anbieten.','Kurz und weich abschließen statt das Brett mit Kraft zu treffen.'],errors:['Den Ball nach dem Fang tief an die Hüfte ziehen.','Den Pass hinter dem Brett erwarten.'],
    easier:'Verteidiger hält eine feste Seite geschlossen.',harder:'Verteidiger wechselt die Seite während des hohen Postfangs.',
    measure:'12 Anspiele: sichere hohe Fänge, Ball oben gehalten und richtige Brettseite zählen.'
  });
  add('c', {
    name:'Post-Read: offene Schulter und maximal zwei Dribblings',category:'Entscheidungen',tags:['post','decision','footwork'],players:3,
    goal:'Den passenden ersten Post-Move aus der Verteidigerposition wählen.',
    setup:'3 Spieler: Center oberhalb des Blocks, frei positionierender Verteidiger und Flügelpassgeber. Ein Korb.',
    steps:['Seitlich zum Feld fangen und den Verteidiger vor dem ersten Dribbling lokalisieren.','Steht der Gegner grundlinienseitig, die freie Mitte mit kurzem Hakenwurf angreifen.','Steht der Gegner hoch zur Mitte, den freien Grundlinienwinkel mit Drop-Step nutzen.','Nach höchstens zwei Dribblings abschließen oder bei geschlossenen Winkeln sicher zum Passgeber zurückspielen.'],
    read:'Kein vorgeplanter Lieblingsmove: die offene Schulter und der freie Raum bestimmen die Aktion.',
    cues:['Erster Blick vor dem ersten Dribbling.','Jedes Dribbling braucht einen erkennbaren Raumgewinn.'],errors:['Trotz geschlossener Seite den Lieblingsmove durchziehen.','Mit Kopf unten ohne Fortschritt mehrfach dribbeln.'],
    easier:'Verteidiger zeigt vor dem Pass die geschlossene Seite deutlich.',harder:'Verteidiger verändert die Stellung erst beim Fang und darf den ersten Weg schließen.',
    measure:'12 Fänge: passende Erstentscheidung, erfolgreiche sichere Rückpässe und unnötige Dribblings zählen.'
  });

  // Each family has a specifically authored counter, continuation and transfer
  // constraint. These are distinct learning tasks, not left/right duplicates.
  const tasks = {
    pg:[
      ['Bleibt die äußere Hüfte geschlossen, tief abbremsen und mit einem Crossover die freie Gegenseite angreifen.','Nach dem Drive den neuen Partner am ballfernen Flügel mit einem Rückpass bedienen, sobald er sich aus dem Deckungsschatten löst.','Der zusätzliche Helfer darf entweder den Korb oder den Rückpass schließen; Dribbling bis zur sichtbaren freien Lösung halten.'],
      ['Folgt der Verteidiger nicht nach innen, dieselbe Täuschung kurz abbrechen und mit einem tiefen Crossover in den freigewordenen Innenraum wechseln.','Nach dem In-and-Out den zusätzlichen Partner am Slot ansehen und bei seiner freien Zielhand einen einhändigen Push-Pass spielen.','Der zusätzliche Helfer steht am inneren Zonenrand; Außenantritt nur bei freier Spur, sonst sicher zum Slot aussteigen.'],
      ['Fängt der Gegner den Crossover ab, mit aktivem Dribbling einen Retreat setzen und erst nach neuer Hüftöffnung wieder angreifen.','Nach dem Richtungswechsel den zusätzlichen Partner in der freien Ecke mit einem Pass vor dessen kleinen Lift bedienen.','Ein zweiter Verteidiger schließt wechselweise die neue Drive-Seite; Crossover nur mit zuvor gesehenem Ausstieg spielen.'],
      ['Folgt der Gegner dem Rückzug geradeaus, mit einem tiefen Handwechsel seitlich an seiner geöffneten Hüfte vorbeigehen.','Nach dem Rückzug den zusätzlichen Außenpartner als Ausstieg anspielen und sofort für einen Rückpass an der anderen Feldkante anbieten.','Der zweite Verteidiger sperrt ein Ausgangstor; der Guard muss nach dem Retreat das andere Tor erreichen oder sicher aussteigen.'],
      ['Nimmt der Begleiter nach dem Schutzwechsel die neue Seite, mit einem frontalen Retreat den Ball sichern statt blind zurückzudrehen.','Nach dem Schutzwechsel zum zusätzlichen Partner am Feldende passen und ohne Ball am Begleiter vorbei den Rückpass fordern.','Der zusätzliche Verteidiger bewacht den Korridorausgang; nach dem Schutzwechsel eine freie Torseite erkennen statt zur Linie durchzudrücken.'],
      ['Bleibt der Verteidiger auf der Reject-Seite, in Ruhe zum stabil stehenden Block zurückkehren und dessen freie Seite nutzen.','Nach dem Reject den zusätzlichen Eckpartner ansehen; zieht dessen Helfer zum Ball, den kurzen Kick-out vorbereiten.','Der zweite Ballverteidiger darf den Reject-Weg schließen; Guard und Blocksteller lösen die Aktion durch echten Block oder sicheren Rückzug.'],
      ['Schließt der Big den Bogen zur Mitte, Dribbling tief halten und mit kurzem Retreat wieder vor beide Verteidiger gelangen.','Nach dem Snake den zusätzlichen Partner am ballfernen Slot mit einem Pass hinter die rotierende Hilfe bedienen.','Der zusätzliche Helfer nimmt entweder den Rollspieler oder den Slot; der Guard muss vor dem nächsten Dribbling beide sehen.'],
      ['Ist die Hedge-Lücke geschlossen, zwei kontrollierte Rückwärtsdribblings setzen und seitlich zur freien Blockseite neu aufbauen.','Nach dem offenen Split den zusätzlichen Partner in der Ecke als Notausstieg sehen, bevor der Ball zum Abschluss aufgenommen wird.','Der zusätzliche Helfer schließt die Mitte hinter dem Split; bei fehlender Ausstiegslinie schon vor der Lücke zurückziehen.'],
      ['Schließt der Big das Pocket-Fenster, mit dem Dribbling außen vorbei binden und den Rollspieler erst hinter seiner Schulter direkt anspielen.','Nach dem Pocket-Pass zum zusätzlichen Partner am Slot versetzen; dieser bietet die nächste Passstation für eine Ballumkehr.','Der zusätzliche Helfer darf den Rollfang wegnehmen; Guard wählt eigenes offenes Fenster oder Rückzug statt erzwungenem Pocket-Pass.'],
      ['Bleibt die Hilfe beim ballfernen Flügel, den freien eigenen Korbweg nutzen statt den Skip-Pass durch Hände zu erzwingen.','Nach dem Skip-Pass zum zusätzlichen Partner am nahen Slot versetzen und dort den Rückpass in Wurfbereitschaft annehmen.','Der zusätzliche Verteidiger rotiert von der Mitte zum Skip-Ziel; der Guard muss die Passentscheidung vor einem Notabsprung treffen.'],
      ['Nimmt die Hilfe nach dem Unterlaufen den Rückpass weg, mit aktivem Dribbling aus der Zone herausziehen und frontal neu lesen.','Nach dem Unterlaufen zum zusätzlichen Partner am nahen Flügel passen und selbst in die jetzt freie Ecke versetzen.','Der zweite Helfer sperrt entweder den Unterkorbweg oder den Rückpass; Guard muss vor dem Brett entscheiden und darf nicht blind abspringen.'],
      ['Kommt der Big vor dem Wurf hoch, vor seinem Körper stoppen und zum Ausgangspunkt zurückdribbeln statt einen Floater durch die Hand zu werfen.','Nach dem gebremsten Drive den zusätzlichen Eckpartner per Bodenpass bedienen, wenn die hohe Hilfe dessen Linie freigibt.','Der zweite Helfer steht seitlich am Brett; Floater nur vor dem ersten Big werfen, solange das Wurffenster ohne Körperkontakt frei ist.'],
      ['Passt der Verfolger seinen Blockrhythmus früh an, den normalen späteren Korblegerrhythmus wählen und den Ball außen schützen.','Nach dem Drive vor dem Verfolger den zusätzlichen Partner am kurzen Flügel anspielen und den Rückpass ohne weitere Dribblings abschließen.','Der zusätzliche Helfer zeigt früh eine Brettseite zu; vor der Ballaufnahme frühe oder normale Fußfolge zur freien Seite wählen.'],
      ['Kommt der Verfolger seitlich vorbei, aus dem lebendigen Dribbling wieder beschleunigen statt den Pull-up gegen seine Hand zu nehmen.','Beim Tempo-Stopp den zusätzlichen Rollpartner am Zonenrand sehen und nach dessen freiem Zielhandsignal kurz passen.','Ein zusätzlicher tiefer Helfer darf den zweiten Antritt schließen; Guard hält den Ball bis zur Wahl von freiem Wurf oder Rückzug lebendig.'],
      ['Unterläuft der Ballverteidiger den Drag-Screen, hinter dem stabilen Block kontrolliert stoppen und das freie kurze Wurffenster prüfen.','Nach der Blocknutzung den zusätzlichen Flügelpartner als Rückpassziel ansehen und bei abgesunkener Hilfe schnell zu ihm verlagern.','Ein zusätzlicher Helfer bewacht den frühen Rollweg; der Guard muss vor dem zweiten Dribbling Ballverteidiger und tiefen Helfer erfassen.'],
      ['Verweigert der Gegner den Backdoor-Weg, vor dem Ballhalter abbremsen und die echte geschützte Übergabe nutzen.','Nach dem Schnitt zum neuen zusätzlichen Partner am kurzen Flügel passen und am Brett vorbei in ein freies Rückpassfenster laufen.','Der zusätzliche Helfer schließt den tiefen Schnitt; Guard wählt Übergabe oder Außenangebot, ohne den besetzten Korbraum zu kreuzen.'],
      ['Schließen beide Hände den ersten Ausstieg, im tiefen Dribbling zurückziehen und mit dem Partner einen neuen seitlichen Winkel herstellen.','Nach dem Ausstieg den zusätzlichen Partner an der freien Mittellinie als zweite Passstation nutzen und selbst aus dem Trap versetzen.','Ein dritter Druckspieler nimmt das erste Ziel weg; nur einen sichtbaren zweiten Winkel nutzen oder kontrolliert Abstand gewinnen.'],
      ['Verteidigt der Gegner auch den zweiten Block eng, den freien Rollwinkel ansehen und bei fehlender Linie per Retreat die Aktion sichern.','Nach dem zweiten Winkel den zusätzlichen Partner am ballfernen Slot per kurzem Rückpass bedienen und die Ballumkehr einleiten.','Ein zusätzlicher Helfer rotiert erst beim zweiten Block; Guard muss die neue Hilfe erkennen statt den ersten Plan blind fortzusetzen.'],
      ['Bleibt der Verteidiger in der Läuferlinie, den Ballvortrag fortsetzen und den einhändigen Pass erst aus einem neuen Winkel versuchen.','Nach dem ersten Push-Pass zum zusätzlichen Partner auf der Gegenbahn laufen und eine zweite Vorwärtspasslinie anbieten.','Der zusätzliche Verteidiger deckt den Empfänger von vorn; Guard wählt einen offenen eigenen Weg oder ein späteres sicheres Fenster.'],
      ['Schließt der Verfolger das seitliche Wurffenster, Dribbling vor der Aufnahme fortsetzen und mit einem Gegenantritt zum Korb gehen.','Vor dem Pull-up den zusätzlichen Partner in der Ecke ansehen und bei einrückender Hilfe einen Pass aus dem gebremsten Stand spielen.','Ein zusätzlicher Helfer steht am Ellenbogen; Guard muss Pull-up, Weiterdribbeln oder sicheren Ausstieg vor der Aufnahme erkennen.']
    ],
    sg:[
      ['Sperrt der Verteidiger das äußere Fangfenster, aus dem V-Cut hinter dessen Hüfte zum Korb schneiden und den Pass erst im freien Raum fordern.','Nach dem ersten Pass den zusätzlichen Partner am Slot anspielen und mit erneutem V-Cut einen zweiten Catch-and-Shoot-Fang herstellen.','Ein zusätzlicher Helfer schließt den Backdoor-Raum; Schütze muss das äußere Fenster neu öffnen statt beide Wege zu erzwingen.'],
      ['Nimmt der Verteidiger den rechtwinkligen Knick vorweg, vor dem Knick stoppen und direkt entlang der freien Grundlinie schneiden.','Nach dem ersten Fang zum zusätzlichen Partner an der Ecke passen, seitlich versetzen und den Rückpass im neuen Wurfwinkel fangen.','Ein zusätzlicher Helfer besetzt den Knickraum; Schütze muss durch Blickkontakt einen zweiten freien Fangpunkt mit dem Passgeber abstimmen.'],
      ['Kürzt der Verfolger vor dem Block nach innen ab, den Curl nicht in ihn hineinlaufen, sondern außen zum Fang lösen.','Nach dem Curl-Fang den zusätzlichen Eckpartner bedienen, wenn dessen Hilfe den kurzen Abschluss schließt.','Der zusätzliche Helfer wartet in der Curl-Linie; Schütze entscheidet zwischen kurzem Stoppwurf und sicherem Rückpass.'],
      ['Bleibt der Verteidiger außen am Fade, eng hinter ihm zum Korb curlen statt weiter aus der Wurfzone wegzulaufen.','Nach dem Fade-Fang zum zusätzlichen Slotpartner passen und mit kleinem Seitwechsel einen zweiten freien Wurfwinkel herstellen.','Ein zusätzlicher Helfer rotiert auf das Fade-Fenster; Schütze muss den Fangwinkel verkürzen oder sicher neu anbieten.'],
      ['Verteidigt der Gegner den Korbschnitt von unten, den stehenden Block zur freien Außenseite nutzen und dort fangbereit werden.','Nach dem Rückpass aus dem abgebrochenen Schnitt den zusätzlichen Slotpartner anspielen und um den Block zum zweiten Fang herauskommen.','Ein zusätzlicher tiefer Helfer sperrt Backdoor; die freie äußere Fanglinie wird zur bewusst gesuchten Lösung.'],
      ['Folgt der Helfer dem Lift sofort nach außen, vor dessen Hüfte abbremsen und die frei gewordene Ecke als Rückpassziel erneut anbieten.','Nach dem Lift-Fang den zusätzlichen Partner am Slot anspielen und in einen zweiten freien Winkel für den Rückpass versetzen.','Der zusätzliche Verteidiger deckt den Lift-Raum; Schütze und Dribbler müssen die ursprüngliche Ecke oder eine sichere Rückgabe offenhalten.'],
      ['Rückt der Helfer früh in die Ecke zurück, den Drift abbremsen und oberhalb seiner Schulter ein höheres Fangfenster anbieten.','Nach dem Drift-Fang den zusätzlichen Slotpartner anspielen und sich für dessen Rückpass wieder mit Abstand an der Grundlinie lösen.','Der zusätzliche Helfer sperrt den direkten Grundlinienpass; Schütze muss im Sichtfeld bleiben und einen höheren Winkel anbieten.'],
      ['Nimmt der Verfolger die Korblinie vorweg, mit kurzem Retreat hinter dem Übergabespieler neu öffnen statt durch den Gegner zu laufen.','Nach der Übergabe den zusätzlichen Partner in der Ecke per Kick-out bedienen, sobald die Hilfe den direkten Drive übernimmt.','Ein zusätzlicher Helfer schließt die Zone; Schütze muss aus dem lebendigen Dribbling den freien Rückpass oder kurzen Wurf erkennen.'],
      ['Sinkt der Denial-Verteidiger rechtzeitig zum Korb, den Schnitt abbremsen und außen wieder einen klaren Passwinkel herstellen.','Nach dem abgebrochenen Backdoor den zusätzlichen Partner am Slot anspielen und per Give-and-Go auf einer anderen Spur schneiden.','Ein zusätzlicher tiefer Helfer schützt Backdoor; außen freikommen und den sicheren Fang suchen statt in die volle Zone schneiden.'],
      ['Schließt der Gegner die erste Rip-Seite, den Ball eng zurück zur Wurfschulter nehmen und die freie Gegenseite erst nach neuem Blick angreifen.','Nach dem Rip-Drive zum zusätzlichen Eckpartner passen, sobald dessen Hilfe vor den Körper tritt.','Ein zusätzlicher Helfer steht am freien Drive-Ausgang; Angreifer muss vor dem Dribbelstart Wurf, Drive oder sichere Rückgabe auswählen.'],
      ['Reagiert der Gegner nicht auf die Wurftäuschung, aus derselben stabilen Basis direkt werfen statt das Seitdribbling zu erzwingen.','Nach der Täuschung mit einem Dribbling zur Mitte zum zusätzlichen Slotpartner passen und sofort für den Rückpass versetzen.','Ein zusätzlicher Helfer nimmt die Pull-up-Zone weg; Schütze entscheidet vor der Aufnahme, ob der kurze Wurf tatsächlich frei ist.'],
      ['Bremst der Gegner den schrägen Closeout rechtzeitig, den Side-step verwerfen und aus der vorhandenen Balance direkt werfen.','Nach dem Seitdribbling den zusätzlichen Flügelpartner anspielen und im neuen Winkel dessen Rückpass ohne weiteres Dribbling werfen.','Ein zusätzlicher Helfer schließt den seitlichen Landeraum; Angreifer wählt freies Fenster oder sichere Rückgabe ohne Sprung in besetzten Raum.'],
      ['Ein neuer passiver Verteidiger stellt die geplante Stoppzone zu; vor der Ballaufnahme kurz bremsen und die freie Gegenseite wählen.','Nach dem Eins-zwei-Stopp den zusätzlichen Partner am Slot anspielen und seinen Rückpass aus ruhigen Füßen direkt werfen.','Der zusätzliche Verteidiger variiert vor der Ballaufnahme seine Stellung am Ellenbogen; nur bei freiem Stoppraum den Pull-up wählen.'],
      ['Ein neuer passiver Verteidiger zeigt nach dem Fang eine nahe hohe Hand; vor dem Standbein-Abheben ein seitliches Dribbling zum freien Raum lösen.','Nach dem Hop-Catch den zusätzlichen Partner am nahen Slot anspielen und dessen Rückpass mit erneut vorbereiteten Füßen fangen.','Ein zusätzlicher Closeout-Verteidiger reagiert auf den versetzten Pass; Schütze muss Fangbalance und tatsächlichen Wurfabstand gemeinsam lesen.'],
      ['Kommt die Verteidigerhand auf die Innenseite, den Ball außen schützen und den normalen Außenhand-Abschluss nehmen.','Vor der Ballaufnahme den zusätzlichen Partner am kurzen Flügel bedienen und dessen Rückpass im freien Brettwinkel abschließen.','Der zusätzliche Helfer schließt eine Brettseite; vor der Aufnahme Innenhand, Außenhand oder sicheren Ausstieg wählen.'],
      ['Nimmt der Helfer den geplanten Stoppraum ein, vor der Ballaufnahme früher stoppen und den kurzen Wurf aus größerem Abstand vorbereiten.','Nach dem Stopp zum zusätzlichen Eckpartner passen, wenn der Helfer den Brettwinkel schließt; selbst in ein Rückpassfenster öffnen.','Der zusätzliche Helfer sperrt den Bankshot-Winkel; Schütze muss vor der Aufnahme den freien Stoppraum sehen oder zurückziehen.'],
      ['Schließt der Verteidiger den Give-and-Go-Schnitt, außen am freien Fuß vorbeilösen und erneut einen sichtbaren Rückpasswinkel anbieten.','Nach dem ersten Pass den zusätzlichen Partner an der freien Ecke als dritte Station nutzen und hinter der Ballumkehr zum Korb schneiden.','Der zusätzliche Helfer wartet im Rückpassweg; Schütze muss sich auf einer anderen Spur lösen, statt den Pass durch den Helfer zu fordern.'],
      ['Folgt der Verteidiger dem Flare außen, hinter seiner geöffneten Hüfte kurz zum Korb schneiden und vor dem Fang mit dem Passgeber Blickkontakt halten.','Nach dem Flare-Fang zum zusätzlichen Slotpartner verlagern und über einen kurzen Lift erneut den Rückpass fordern.','Ein zusätzlicher Helfer sperrt den Außenfang; Schütze erkennt einen kürzeren freien Winkel oder setzt die Bewegung neu an.'],
      ['Kommt die Hilfe früh zum Trail-Fang, den direkten Wurf verwerfen und mit einem rechtzeitigen Dribbelstart die offene Seite angreifen.','Nach dem Trail-Fang zum zusätzlichen Eckpartner passen und durch ein kurzes Versetzen einen zweiten Rückpasswinkel öffnen.','Ein zusätzlicher Verteidiger schließt den Trail-Slot; Schütze muss seinen Lauf früh verkürzen und ein anderes sichtbares Fangfenster anbieten.'],
      ['Sinkt der Denial-Verteidiger in den Blind-Pig-Schnitt, vor der Zone abbremsen und den normalen Außenpass vom hohen Post anfordern.','Nach dem Außenfang den zusätzlichen Eckpartner anspielen und hinter dessen Passwinkel erneut zum Korb schneiden.','Ein zusätzlicher tiefer Helfer deckt den Blind-Pig-Raum; Außenfang und erneutes Lösen werden zur sicheren Alternative.']
    ],
    sf:[
      ['Schließt der Verteidiger die erste Hüfte, mit kurzem Jab die Gegenseite zeigen und erst nach freiem Dribbelstart dort angreifen.','Nach dem ersten Drive den zusätzlichen Partner in der Ecke per Kick-out bedienen und im Rückpassraum verfügbar bleiben.','Der zusätzliche Helfer nimmt den direkten Korbweg; Forward muss beim Fang Wurf, kurzen Drive oder sichere Rückgabe abwägen.'],
      ['Folgt der Gegner dem Jab nicht, mit dem freien Fuß in die Ausgangsbasis zurückkehren und bei Abstand den direkten Wurf nehmen.','Nach dem Cross-Step zum zusätzlichen Partner am Slot passen, wenn dessen Hilfe den neuen Drive aufnimmt.','Ein zusätzlicher Helfer steht auf der Cross-Step-Seite; der Forward darf die Gegenseite erst nach gesehenem freien Raum wählen.'],
      ['Kommt der Verteidiger beim Zurückverlagern nach vorn, Ball vor dem Standbein-Abheben lösen und seitlich an seiner Hüfte vorbeigehen.','Nach dem Rocker den zusätzlichen Eckpartner ansehen und den Pass vor einer späten Ballaufnahme spielen, wenn dessen Hilfe einrückt.','Der zusätzliche Helfer zeigt eine Seite zu; Forward muss den Rocker nicht automatisch mit einem Wurf beenden.'],
      ['Nimmt der Verfolger die Reverse-Seite vorweg, vor dem Brett kontrolliert stoppen und auf der ursprünglichen Seite kurz abschließen.','Vor dem Unterlaufen den zusätzlichen Partner am ballfernen Flügel mit einem sichtbaren Rückpass bedienen, wenn der Weg unter dem Brett zu ist.','Ein zweiter Helfer sperrt die Gegenseite des Bretts; Forward muss vor der Ballaufnahme normalen Abschluss oder sicheren Ausstieg wählen.'],
      ['Schließt der Gegner die Spin-Seite, mit aktivem Dribbling einen Retreat setzen und das Feld wieder frontal öffnen.','Nach der Drehung den zusätzlichen Partner am Slot anspielen und selbst aus dem dichten Zonenraum lösen.','Ein zusätzlicher Helfer besetzt den Raum hinter der Drehung; Spin nur bei vorher gesehenem freien Ziel oder sicherem Abbruch.'],
      ['Schließt die Hilfe den Vorwärtspivot, das Standbein halten und mit dem freien Bein rückwärts zu einem anderen sichtbaren Passwinkel öffnen.','Nach dem ersten Rückpass den zusätzlichen Partner auf dem anderen Flügel als zweite Station nutzen und für dessen Rückgabe öffnen.','Der zusätzliche Verteidiger sperrt den ersten Rückpasswinkel; Forward muss einen zweiten legalen Pivotwinkel finden, ohne blind abzuspringen.'],
      ['Gewinnt der Gegner die Position vor dem Körper zurück, vor der Ballaufnahme stoppen und einen kurzen kontrollierten Wurf wählen.','Nach dem gewonnenen Winkel den zusätzlichen Partner in der Ecke bedienen, sobald dessen Hilfe die eigene Spur schließt.','Ein zweiter Helfer besetzt den geplanten Absprungraum; Forward muss rechtzeitig vor der Aufnahme abbremsen oder aussteigen.'],
      ['Bleibt der Helfer beim Flügel, den 45-Grad-Cut verwerfen und außen als freies Fangziel für den Ballhandler stehen bleiben.','Nach dem diagonalen Fang den zusätzlichen Partner im gegenüberliegenden Short-Corner bedienen, wenn die Korbhilfe vortritt.','Ein zusätzlicher tiefer Helfer schützt das Ende des Cuts; der Forward bietet ein früheres freies Fangfenster statt unter das Brett zu laufen.'],
      ['Dreht der Helfer früh zur Grundlinie zurück, den Cut vor dessen Körper abbremsen und in der Ecke wieder breit anbieten.','Nach dem Grundlinienfang zum zusätzlichen Slotpartner zurückpassen und auf der freien Brettseite ein zweites Fangfenster suchen.','Ein zusätzlicher Helfer sperrt den Grundlinienausgang; der Forward muss außen bleiben oder ein früheres sicheres Passfenster nutzen.'],
      ['Stellt sich der Verteidiger frontal, mit einem tiefen Retreat bremsen und nach neuem Hüftwinkel erneut diagonal angreifen.','Nach dem Binden des Rückwärtsläufers den zusätzlichen Flügelläufer mit einem Push-Pass vor dessen Lauf bedienen.','Ein zweiter Verteidiger schützt die Zone; der Forward muss nach dem ersten Vorsprung früh zwischen eigenem Abschluss und Ausstieg entscheiden.'],
      ['Schließt der Helfer die zweite Schrittseite vor der Ballaufnahme, den Eurostep verwerfen und einen frühen kontrollierten Stopp wählen.','Vor der Ballaufnahme den zusätzlichen Eckpartner anspielen, wenn die Hilfe beide Abschlussseiten verengt.','Der zweite Helfer sperrt eine Brettseite; die Schrittfolge erst wählen, nachdem der endgültige freie Raum sichtbar ist.'],
      ['Ist das Hop-Landefeld geschlossen, vor dem Absprung im Dribbling abbremsen und auf die freie andere Seite lösen.','Vor dem Hop zum zusätzlichen Partner am Short-Corner passen und dessen Rückpass nur bei freiem beidbeinigem Landeraum nehmen.','Ein zusätzlicher Helfer deckt den zweiten Landeraum; kein Hop ohne frei gesehenes Feld, sicherer Rückzug bleibt gültig.'],
      ['Nimmt der Verteidiger die erste Schulter weg, ohne neuen Dribbelstart über dasselbe Standbein zum freien Gegenwinkel aufdrehen.','Nach dem Seal-Fang den zusätzlichen Cutter am gegenüberliegenden Flügel sehen und bei kommender Hilfe in dessen Lauf passen.','Ein zweiter Helfer kommt erst nach dem tiefen Fang; schneller freier Abschluss oder kurzer sicherer Außenpass statt Kraftaktion.'],
      ['Bleibt der Gegner nach dem Jab zentral und tief, den kurzen Wurf nehmen; bei Druck den Ball schützen und neu zum Feld öffnen.','Nach dem Face-up den zusätzlichen Partner in der Ecke bedienen, wenn dessen Hilfe den ersten Drive schließt.','Der zusätzliche Helfer deckt die erste Drive-Seite; Forward muss vor dem Dribbelstart Wurf oder andere freie Hüfte sehen.'],
      ['Bleibt die Ecke gedeckt, im Dribbling den freien Korbweg nutzen und den Kick-out nicht durch den Verteidiger werfen.','Nach dem Kick-out zum zusätzlichen Partner am Slot versetzen und eine sichtbare zweite Passstation für die Ballumkehr schaffen.','Ein zusätzlicher Verteidiger rotiert aus der Mitte zur Ecke; Forward muss vor dem Pass erkennen, ob das frühe Fenster noch offen ist.'],
      ['Bleibt der Helfer außen beim Lift-Ziel, den Ball sichern und den nun freien eigenen kurzen Drive fortsetzen.','Nach dem Lift-Pass zum zusätzlichen Partner auf der Gegenseite laufen und dessen Ballumkehr mit einem freien Fang vorbereiten.','Ein zweiter Verteidiger sperrt den Lift-Endpunkt; Empfänger und Forward müssen einen kürzeren Passwinkel vor dem Stopp finden.'],
      ['Bleibt der Gegner bei der Täuschung auf dem Boden, den freien kurzen Wurf direkt nehmen statt weitere Täuschungen aneinanderzureihen.','Nach dem Rebound den zusätzlichen Außenpartner kurz anspielen und dessen Rückpass in einen erneut stabilen Nahabschluss überführen.','Ein zweiter Helfer schließt den direkten Putback; Ball oben sichern und vor dem Abschluss ein wirklich freies Fenster suchen.'],
      ['Wechselt der Angreifer nach dem ersten Drop-Step die Richtung, mit kontrolliertem Bremskontakt die Hüfte erneut öffnen und vor die neue Linie laufen.','Nach dem erfolgreichen Stopp spielt der Ballhandler zum zusätzlichen Partner am Slot; Verteidiger muss aus der Hilfe neu zu diesem Ball schließen.','Ein zusätzlicher Ballhandler am freien Flügel erhält einen zweiten Pass; Verteidiger muss erst Korb sichern und dann den neuen Ball aufnehmen.'],
      ['Schlägt der Angreifer den ersten Seitwärtsschritt, Hüfte mit Drop-Step öffnen und laufend vor die neue Korblinie zurückkommen.','Nach dem ersten Contain spielt der Angreifer zum zusätzlichen Flügelpartner; Verteidiger muss neu bremsen und dessen ersten Drive aufnehmen.','Der zusätzliche Partner wird nach dem ersten Stopp zum zweiten Angreifer; zwei unterschiedliche Closeout-Winkel ohne Griff zum Ball verteidigen.'],
      ['Schließt der Begleiter das erste Ausgangstor, Ball auf Kinnhöhe sichern und über das Standbein zum anderen Tor aufdrehen.','Nach dem freien Ausgang den zusätzlichen Läufer am gegenüberliegenden Flügel mit einem frühen Vorwärtspass bedienen.','Ein zweiter Verteidiger nimmt das andere Ausgangstor; Rebounder muss zuerst Abstand und einen freien sicheren Winkel herstellen.']
    ],
    pf:[
      ['Bleibt der Gegner nach dem Jab zentral, den freien kurzen Wurf nehmen; rückt er nah heran, auf der anderen Seite legal zum Dribbeln lösen.','Nach dem Face-up den zusätzlichen Cutter vom Flügel bedienen, wenn dessen Hilfe den eigenen Antritt übernimmt.','Ein zusätzlicher Helfer sperrt die Mitte; Forward muss vor dem ersten Dribbling Wurf, Außenantritt oder Rückgabe wählen.'],
      ['Senkt der Gegner die Hand zum Sweep, Ball wieder zur Wurfschulter sichern und erst aus neuem Abstand weiterentscheiden.','Nach dem Sweep-Drive den zusätzlichen Eckpartner per Bodenpass bedienen, wenn dessen Hilfe früh in der Spur steht.','Ein zusätzlicher Helfer besetzt die erste Angriffsseite; Forward muss den Sweep vor dem Start gegen Wurf oder Gegenrichtung abwägen.'],
      ['Kommt der tiefe Big früh nach vorn, stabil fangen und zum Guard zurückpassen statt den Zwischenwurf durch dessen Hand zu werfen.','Nach dem Short-Roll-Fang den zusätzlichen Eckpartner mit einem kurzen Kick-out bedienen, wenn der Helfer vortritt.','Ein zweiter Helfer nimmt den ersten kurzen Abschluss; Forward muss ohne langes Dribbling einen freien Anschluss sehen.'],
      ['Bleibt die Hilfe an der Ecke, aus stabilem Fang den freien kurzen Wurf nehmen oder den eigenen einen Korbschritt nutzen.','Nach dem Kick-out den zusätzlichen Slotpartner als zweite Passstation anbieten lassen und selbst am Ellenbogen wieder frei werden.','Ein zweiter Helfer rotiert spät zur Ecke; Forward muss das neue Bild nach dem Fang lesen statt den ersten Pass fest einzuplanen.'],
      ['Kommt der Verteidiger beim Pop schnell zurück, vor dem Standbein-Abheben ein kurzes Dribbling an der offenen Hüfte vorbeisetzen.','Nach dem Pop-Fang zum zusätzlichen Eckpartner verlagern und eine kleine Anschlussbewegung für den Rückpass machen.','Der zusätzliche Helfer sperrt den ersten Drive nach dem Pop; freier Wurf oder sichere Rückgabe bleibt die richtige Alternative.'],
      ['Übernimmt die Verteidigung nicht früh, den Slip stoppen und einen rechtzeitig stabilen echten Block für den Guard setzen.','Nach dem Slip-Fang den zusätzlichen Partner am Short-Corner bedienen, sobald der tiefe Helfer den eigenen Abschluss übernimmt.','Ein zusätzlicher Helfer schützt den Slip-Weg; der Forward entscheidet vor dem Start zwischen echtem Block und wirklich freiem Schnitt.'],
      ['Bleibt der Guard im ersten freien Drive, den zweiten Block verwerfen und mit Abstand in ein kurzes Rückpassfenster öffnen.','Nach dem zweiten Block zum zusätzlichen Slotpartner öffnen und über ihn eine sichere Ballumkehr vorbereiten.','Der zusätzliche Helfer nimmt die kurze Öffnung nach dem Re-Screen; Forward muss neuen Winkel oder sichere Außenposition wählen.'],
      ['Bleibt der Helfer tief am Forward, im Dunker-Spot Breite halten und nicht den Guard-Drive durch einen erzwungenen Eintritt blockieren.','Nach dem tiefen Fang den zusätzlichen Eckpartner bedienen, wenn die zweite Hilfe den Abschluss nimmt.','Ein zweiter Helfer sperrt die direkte Fangseite; Forward muss ein früheres seitliches Fenster anbieten oder den Raum freihalten.'],
      ['Wechselt der Verteidiger aus der Front seitlich, statt des Lobs einen direkten geschützten Pass an die freie Zielhand spielen.','Nach dem tiefen Pass zum zusätzlichen Slotpartner versetzen und als nächste Ballumkehrstation wieder Fangbereitschaft zeigen.','Ein zusätzlicher tiefer Helfer steht hinter dem Frontverteidiger; Lob nur bei sicher freiem Fangraum, sonst außen halten.'],
      ['Bleibt der Verteidiger beim Forward, die echte geschützte Übergabe aus stabilem Stand ausführen und erst danach öffnen.','Nach dem Keeper-Dribbling zum zusätzlichen Eckpartner passen, wenn dessen Hilfe den eigenen Korbweg übernimmt.','Ein zweiter Helfer schützt die freie Keeper-Seite; Forward muss vor dem Dribbelstart Übergabe oder sichere Rückgabe erkennen.'],
      ['Schließt der Gegner den Backdoor-Schnitt früh, den Ball halten und den Flügel außen im neu geöffneten Winkel bedienen.','Nach dem Schnittpass zum zusätzlichen Slotpartner öffnen und als nächster hoher Passgeber wieder anspielbar werden.','Der zusätzliche Helfer wartet hinter dem Cutter; Forward muss den Pass auslassen und ein freies Außenangebot abwarten.'],
      ['Schließt der Verteidiger die Grundlinie, mit aktivem Dribbling in die Ausgangsposition zurückziehen und die freie Mitte neu prüfen.','Nach der Drehung den zusätzlichen Eckpartner bedienen, wenn die zweite Hilfe aus dessen Raum in den Drive tritt.','Ein zusätzlicher Helfer sperrt die Spin-Landung; Forward muss vor der Drehung Abbruch oder freien zweiten Winkel sehen.'],
      ['Nimmt der Gegner beim Reverse-Pivot den ersten Drive weg, Standbein halten und den freien kurzen Wurf oder Rückpass wählen.','Nach dem Aufdrehen den zusätzlichen Cutter hinter der Hilfe in dessen freien Lauf bedienen.','Ein zusätzlicher Helfer deckt die offene Hüfte; Forward muss nach dem Pivot das ganze Feld sehen statt automatisch loszulaufen.'],
      ['Ein neuer passiver Verteidiger schließt den diagonalen Wurfweg; vor der Ballaufnahme stoppen und die freie Brettseite neu ansteuern.','Nach dem ersten gebremsten Antritt zum zusätzlichen Partner am kurzen Flügel passen und dessen Rückpass mit weichem Haken abschließen.','Der zusätzliche Verteidiger verändert die freie diagonale Spur; Haken nur nach sauberer Aufnahme und freiem Raum lösen.'],
      ['Bleibt die Hand nach der Täuschung tief, aus derselben stabilen Basis den ersten freien kurzen Wurf nehmen.','Nach dem Pivot den zusätzlichen Eckpartner anspielen, wenn dessen Hilfe den Durchstieg verengt.','Ein zweiter Helfer schließt den Step-through-Raum; Forward muss auf dem Boden bleiben und den sicheren Außenpass wählen.'],
      ['Kommt die hohe Hand schon vor dem erneuten Hochgehen, kurz auf dem Boden täuschen und erst nach freiem Fenster abschließen.','Nach dem Rebound zum zusätzlichen Slotpartner auspassen und dessen Rückpass aus einer neuen stabilen Fangposition nehmen.','Ein zweiter Verteidiger deckt den zweiten Sprung; Rebounder muss Ball sichern und zwischen Putback und Ausstieg entscheiden.'],
      ['Bremst der Big seinen Closeout früh, den freien Wurf aus der bestehenden Basis nehmen statt den Drive gegen seine Brust zu erzwingen.','Nach dem Ein-Dribbling-Antritt den zusätzlichen Partner in der Ecke bedienen, sobald die Korbhilfe vortritt.','Der zusätzliche Helfer steht auf der offenen Hüftseite; Forward muss bei Fang Wurf, andere Seite oder sichere Rückgabe sehen.'],
      ['Bleibt der Verteidiger beim Blocksteller, den Dive abbrechen und außen wieder ein sichtbares Passfenster öffnen.','Nach dem Dive-Fang den zusätzlichen Eckpartner bedienen, wenn dessen Hilfe den Korbabschluss nimmt.','Ein zusätzlicher tiefer Helfer schließt die Dive-Zone; Forward muss vor dem Lösen freie Tiefe oder Außenöffnung erkennen.'],
      ['Frontet der Gegner die neue Ballseite, den freien Winkel mit kurzem Pivot öffnen und erst dann die hohe Zielhand zeigen.','Nach dem Postfang den zusätzlichen Partner am hohen Post ansehen und bei Doppelhilfe den kurzen Rückpass nach oben spielen.','Ein zweiter Helfer sperrt das neue tiefe Passfenster; Ballumkehr weitersehen und die Position erneut öffnen statt halten.'],
      ['Schließt der Begleiter den frühen tiefen Fang, vor dem Brett zum kurzen Flügel ausweichen und dort ein sichtbares Passziel anbieten.','Nach dem frühen Fang den zusätzlichen Eckpartner anspielen, sobald die Korbhilfe nach innen rückt.','Ein zusätzlicher tiefer Verteidiger deckt die Rim-run-Zone; Forward muss früh abbremsen und einen sicheren anderen Fangwinkel suchen.']
    ],
    c:[
      ['Frontet der Verteidiger die erste Zielhand, mit kurzem Pivot zum neuen Ballwinkel öffnen und die andere freie Hand anbieten.','Nach dem Postfang den zusätzlichen Cutter vom ballfernen Flügel im Blick behalten und bei dessen freiem Fenster direkt passen.','Ein zweiter Helfer zeigt während des Fangangebots eine Seite zu; Center muss Position und Feldblick gemeinsam erhalten.'],
      ['Schließt der Gegner die Mitte früh, den Hakenwurf nicht erzwingen und über das bestehende Standbein zur freien Grundlinie öffnen.','Nach dem mittigen Fang den zusätzlichen Eckpartner bedienen, sobald dessen Hilfe den Hakenwurf übernimmt.','Der zweite Helfer sperrt die Wurfschulter; Center entscheidet zwischen freiem Haken, anderer Schulter und sicherem Rückpass.'],
      ['Schließt der Gegner nach dem ersten Schritt die Grundlinie, Standbein halten, auf dem Boden täuschen und zur freien Mitte zurückdrehen.','Nach dem Drop-Step den zusätzlichen Partner am kurzen Flügel anspielen, wenn die Hilfe unter dem Brett den eigenen Winkel schließt.','Ein zusätzlicher Helfer deckt die Grundlinie; Center muss vor dem ersten Dribbling den freien Mittelwinkel oder Rückpass sehen.'],
      ['Reagiert die hohe Hand nicht auf den Hakenansatz, den ursprünglichen kurzen Haken aus stabiler Basis direkt werfen.','Nach der Wurftäuschung zum zusätzlichen Eckpartner passen, wenn der Helfer den Durchstieg schließt.','Ein zweiter Helfer sperrt den Raum unter der hohen Hand; Center bleibt am Boden und nutzt den sicheren Außenpass.'],
      ['Bleibt der Grundlinienwinkel beim ersten Drop-Step frei, den direkten Abschluss nehmen und die Rückdrehung weglassen.','Nach der Rückdrehung den zusätzlichen Slotpartner ansehen und bei einrückender Hilfe kurz nach außen passen.','Der zusätzliche Helfer schützt die Rückdrehseite; Center muss vor dem Pivot freie Erstbewegung oder sicheren Ausstieg wählen.'],
      ['Bleibt der Gegner mittig und übernimmt die Half-Spin-Täuschung nicht, ohne Zusatzdrehung den ersten freien kurzen Haken nehmen.','Nach der Schultertäuschung den zusätzlichen Cutter am ballfernen Block bedienen, wenn dessen Hilfe zur Täuschung rückt.','Ein zweiter Helfer sperrt die Gegenrichtung; Center muss die Täuschung klein halten und beide Räume vor dem echten Pivot sehen.'],
      ['Steht die hohe Hand nach dem Fang im Abschlussfenster, kurze Bodentäuschung zeigen und mit demselben Standbein zum freien Winkel öffnen.','Nach dem tiefen Catch den zusätzlichen Außenpartner anspielen und dessen Rückpass aus einer leicht seitlich versetzten Fangposition nehmen.','Ein zweiter Helfer schließt die direkte Wurfseite; Center muss Ball oben sichern und den ersten wirklich freien Winkel nutzen.'],
      ['Rückt der tiefe Helfer in den Rollweg, schon vor dem Fang bremsen und den Ball sicher zum Guard zurückspielen.','Nach dem gebremsten Rollfang den zusätzlichen Eckpartner bedienen, sobald die tiefe Hilfe vor den Körper tritt.','Ein zweiter Helfer nimmt die freie Brettseite; Center muss vor der Aufnahme Abschlussfenster oder sicheren Rückpass sehen.'],
      ['Ein neuer passiver Verteidiger zeigt die schwächere Hand zu; Ball oben sichern und mit demselben Standbein einen freien anderen Brettwinkel suchen.','Nach dem ersten weichen Abschluss den zusätzlichen Partner am kurzen Flügel anspielen und dessen Rückpass mit der schwächeren Hand dosieren.','Der zusätzliche Verteidiger schließt vor jedem Fang einen Brettwinkel; Center muss die freie Seite wählen und dennoch die schwächere Hand kontrollieren.'],
      ['Ein neuer passiver Verteidiger nimmt die Reverse-Seite weg; vor dem Unterlaufen bremsen und auf der Ausgangsseite weich abschließen.','Vor dem Unterlaufen den zusätzlichen Partner am Short-Corner anspielen und dessen Rückpass auf der freien gegenüberliegenden Brettseite nehmen.','Ein zusätzlicher Helfer sperrt abwechselnd eine Brettseite; Center muss vor der Ballaufnahme Reverse oder normalen Abschluss wählen.'],
      ['Bleibt der Helfer beim Cutter, den freien kurzen Wurf aus dem stabilen Short-Roll-Fang nehmen statt den Schnittpass zu erzwingen.','Nach dem Cutter-Pass zum zusätzlichen Slotpartner öffnen und über dessen Rückgabe eine zweite kurze Roll-Fangposition herstellen.','Ein zweiter Helfer deckt den Cutter nach dessen Start; Center muss zwischen kurzem Wurf und sichtbarem sicherem Rückpass wählen.'],
      ['Bleibt der Verteidiger innen beim Center, die echte Übergabe an den Guard ausführen und sich danach zum Feld öffnen.','Nach dem Keeper-Antritt den zusätzlichen Eckpartner per kurzem Pass bedienen, wenn dessen Hilfe den eigenen Weg schließt.','Ein zweiter Helfer sperrt die Keeper-Seite; Center darf den Ball nicht automatisch behalten, sondern muss echte Übergabe und Rückgabe sehen.'],
      ['Bleibt die Defense ohne Switch beim Center, den Seal gegen den Guard verwerfen und normal in ein freies Rollfenster öffnen.','Nach dem Switch-Seal den zusätzlichen Partner am hohen Post anspielen, wenn die tiefe Hilfe den Abschluss doppelt.','Ein zweiter Helfer deckt die tiefe Zielhand; Center muss früh den sicheren hohen Rückpass sehen statt den kleineren Gegner wegzudrücken.'],
      ['Schließt der Gegner den geplanten zweiten Fang, nach dem Rückpass seitlich statt tiefer öffnen und eine andere Zielhand anbieten.','Nach dem zweiten Fang den zusätzlichen Cutter vom ballfernen Flügel bedienen, sobald die Hilfe zur neuen Postposition rückt.','Ein zweiter Helfer sperrt die tiefere Re-Post-Position; Center muss den Winkel verbessern statt nur näher zum Ring zu gehen.'],
      ['Wechselt der Gegner aus der Front zur Seite, den sicheren direkten Pass zur freien Zielhand anfordern statt weiter den Lob zu erwarten.','Nach dem sicheren Lobfang zum zusätzlichen Slotpartner auspassen und für dessen Rückgabe im neuen Winkel stabil anbieten.','Ein zusätzlicher tiefer Helfer schließt den Lobraum; Center muss Ballumkehr oder Außenpass verlangen, ohne riskanten Sprungfang.'],
      ['Nimmt der Gegner den Querweg früh weg, den Eintritt stoppen und auf der Ausgangsseite für eine weitere Ballumkehr offen bleiben.','Nach dem Cross-Lane-Fang den zusätzlichen Eckpartner bedienen, wenn der zweite Helfer den Nahabschluss übernimmt.','Ein zusätzlicher Helfer steht in der Zielzone; Center muss vor dem Schnitt den freien Raum erkennen oder die Tiefe freihalten.'],
      ['Schließt der Druckspieler den ersten Outletwinkel, Standbein halten und auf der anderen Seite ein neues sichtbares Passfenster öffnen.','Nach dem Outlet zum zusätzlichen hohen Partner nachrücken und dessen Rückpass als sichere zweite Aufbauoption fangen.','Ein zweiter Druckspieler nimmt das erste Outletziel; Center muss Ball oben sichern und einen zweiten Winkel ohne Blindpass finden.'],
      ['Täuscht der Helfer die Doppelhilfe nur an und bleibt außen, den ersten freien Postwinkel kurz nutzen statt einen gedeckten Rückpass zu spielen.','Nach dem Ausstieg den zusätzlichen Slotpartner als zweite Ballumkehrstation nutzen und selbst neu im Post anbieten.','Ein weiterer Helfer nimmt den ersten Außenpass; Center muss vor dem Dribbling ein zweites sichtbares Fenster finden oder den Ball sicher halten.'],
      ['Schließt der Verteidiger die erste Brettseite, Ball oben sichern und über das festgelegte Standbein zum anderen freien Winkel drehen.','Nach dem High-Low-Fang den zusätzlichen Eckpartner anspielen, wenn die Hilfe vor den Körper tritt; danach seitlich neu anbieten.','Ein zweiter Helfer deckt die freie Brettseite beim Fang; Center muss vor dem Hochgehen direkten Abschluss oder kurzen Ausstieg sehen.'],
      ['Schließt der Verteidiger den ersten gewählten Weg, nach einem sicheren Stopp über dasselbe Standbein den freien Gegenwinkel prüfen oder zurückpassen.','Nach dem Post-Read den zusätzlichen Cutter hinter der Hilfe im Blick behalten und bei dessen freiem Fenster kurz in den Lauf passen.','Ein zweiter Helfer kommt nach dem ersten Dribbling; maximal zwei Dribblings behalten und freien Abschluss oder sicheren Außenpass wählen.']
    ]
  };
  const modes = ['Technikaufbau','Verteidigung lesen','Konter finden','Anschluss verbinden','Spielanwendung'];
  // Genuine solo technique tasks keep every position trainable with one attendee.
  // Reactive tasks retain their actual defender/passer requirements.
  const soloMoves = {
    'FR-PG01':['Vom Flügel auf ein Hütchen vor der Zone zudribbeln.','Vor dem Hütchen aufrichten und das Dribbling seitlich lebendig halten.','Aus tiefer Hüfte neben dem Hütchen beschleunigen.','Mit der Außenhand weich abschließen und die Startseite wechseln.'],
    'FR-PG02':['Ein Hütchen am Flügel als Richtungsmarke ansteuern.','Ball und Schulter kurz nach innen führen, die Hand bleibt über dem Ball.','Den Ball mit derselben Hand wieder nach außen lenken und seitlich vorbeiziehen.','Geschützt abschließen und beide Hände im Wechsel nutzen.'],
    'FR-PG03':['Mit zwei Dribblings schräg auf ein Hütchen an der Zone zulaufen.','Vor der Marke auf dem äußeren Bein kontrolliert bremsen.','Tief zur anderen Hand wechseln und die Gegenrichtung mit neuem Schritt angreifen.','Mit höchstens zwei weiteren Dribblings kontrolliert abschließen.'],
    'FR-SG11':['Am Flügel einen Eigenpass in Wurfbereitschaft fangen.','Kurze Wurftäuschung zeigen und mit beiden Füßen am Boden bleiben.','Ball vor dem Standbein-Abheben zum seitlichen Dribbling lösen und klar stoppen.','Aus Balance werfen und den eigenen Rebound holen.'],
    'FR-SG12':['In sicherer Mitteldistanz einen Eigenpass fangen.','Eine Bodenmarke neben der Fangposition als seitliches Zielfenster wählen.','Mit einem seitlichen Dribbling und sauberer Eins-zwei-Fußfolge zur Marke kommen.','Zum Korb ausrichten, senkrecht werfen und stabil landen.'],
    'FR-SF02':['Am Flügel einen Eigenpass fangen und das Standbein festlegen.','Mit dem freien Fuß einen kurzen Jab zur Außenmarkierung zeigen.','Den Ball vor dem Standbein-Abheben lösen und mit Cross-Step die Gegenseite angreifen.','Kontrolliert abschließen und die andere Startseite nutzen.'],
    'FR-SF03':['Einen Eigenpass am Flügel mit festem Standbein fangen.','Mit kurzem Jab Gewicht nach vorn verlagern, ohne das Standbein zu verschieben.','Das Gewicht zur Mitte zurücknehmen und den Ball in die Wurflinie bringen.','Aus stabiler Basis werfen und die Landung kurz halten.'],
    'FR-SF04':['Mit einem Dribbling vom kurzen Flügel zur Grundlinie ziehen.','Den Ball in klarer Fußfolge aufnehmen und den freien gegenüberliegenden Brettwinkel ansehen.','Unter dem Brett kontrolliert zur anderen Seite gehen und ohne Zusatzschritte mit der Außenhand lösen.','Weich gegen das Brett abschließen, stabil landen und danach die Startseite wechseln.'],
    'FR-PF01':['Am Ellenbogen einen Eigenpass fangen und das Standbein bewusst wählen.','Über dieses Standbein frontal zum Korb öffnen.','Einen kurzen Jab zeigen und den freien Fuß in die Wurfbasis zurücknehmen.','Den kurzen Wurf aus Balance lösen und danach die Seite wechseln.'],
    'FR-PF02':['Am kurzen Flügel einen Eigenpass mit stabilem Standbein fangen.','Ball eng von der Wurfschulter vor der Hüfte zur freien Seite führen.','Den Ball vor dem Standbein-Abheben zum Dribbeln lösen und einen langen ersten Schritt setzen.','Mit höchstens zwei Dribblings weich abschließen; andere Seite wiederholen.'],
    'FR-C02':['Seitlich oberhalb des tiefen Blocks einen Eigenpass sicher fangen.','Ein Hütchen als Orientierungsmarke für die äußere Verteidigerschulter setzen.','Mit einem geschützten Dribbling zur freien Mitte gehen und stabil zum Haken ausrichten.','Über die vom Hütchen abgewandte Schulter weich werfen, landen und die andere Hand üben.']
  };
  return cards.flatMap(base => {
    const [counter, connection, transfer] = tasks[base.primaryPosition][Number(base.code.slice(-2))-1];
    return modes.map((mode, index) => {
      // All paired/group families contain a defender except the pass-reception
      // family SG14; its second player is the passer, so reactive tasks add one.
      const hasDefender = base.playersMin>1 && base.code!=='FR-SG14';
      const reactivePartner = !hasDefender && (index===1 || index===2);
      const extraPartner = index>=3 || reactivePartner;
      const soloSteps=index===0 && soloMoves[base.code];
      const players = soloSteps ? 1 : base.playersMin + Number(extraPartner);
      const setup = soloSteps ? '1 Spieler mit Basketball an einem Korb. Hütchen und Bodenmarkierungen ersetzen für den Technikaufbau feste Orientierungspositionen. Eigenzuspiel und eigener Rebound; kein Passgeber oder Verteidiger nötig.' : base.setup + (extraPartner ? (index===3
        ? ' Zusätzlich spielt ein Anschlusspartner an der freien Außenposition mit; er ist in der angegebenen Spielerzahl enthalten.'
        : ' Zusätzlich spielt ein Verteidiger im freien Anschlussraum mit; er ist in der angegebenen Spielerzahl enthalten.') : '')
        + (base.playersMin===2 && hasDefender ? ' Zu zweit zwischen Angriffs- und Verteidigungsrolle wechseln.' : '')
        + (index===0 ? (hasDefender ? ' Die Verteidigung zeigt vor jedem Start ihre Stellung und begleitet die Bewegung geführt.' : ' Startwinkel vor dem Versuch festlegen und zunächst ohne Gegenspieler arbeiten.') : ' Die genannten Verteidiger entscheiden innerhalb der Aufgabe selbst; zu Beginn ohne harte Kontakte.');
      const specific = [
        'Den Ablauf zuerst langsam zeigen. Nach jeder Aktion genau einen Technikpunkt korrigieren und denselben Ablauf einmal sauber wiederholen.',
        base.decisionCue + ' Die Verteidigerstellung wird erst nach dem Start sichtbar; die Entscheidung danach kurz begründen.',
        counter,
        connection,
        transfer
      ][index];
      const sourceVideo = base.primaryPosition==='c' && Number(base.code.slice(-2))<=5
        ? {url:'https://www.youtube.com/watch?v=JANMMKsws5E',label:'Post-Moves mit Ryan Razooky · Referenz für den Grundmove',segment:['0:09–1:52','1:52–2:16','2:16–3:01','2:00–2:16','3:08–4:04'][Number(base.code.slice(-2))-1]} : null;
      return {
        ...base, id:base.id+'-'+(index+1), code:base.code+'-'+(index+1), familyId:base.id,
        familyName:base.name, task:mode, name:base.name+' · '+mode,
        goal:base.goal+' Lernaufgabe: '+specific,
        setup, playersMin:players, playersMax:players, solo:players===1,
        technicalSteps:[...(soloSteps || base.steps)], learningTask:specific,
        decisionCue:soloSteps ? 'Ohne Gegenspieler wird die Bewegung technisch geübt. Die Hütchen geben nur Raumorientierung; eine echte Verteidigerentscheidung folgt erst in einer Partneraufgabe.' : base.decisionCue,
        steps:[
          index===0 ? 'Verteidigerstellung beziehungsweise Startwinkel vor dem Versuch festlegen. Den unten erklärten Grundmove zuerst langsam ausführen.'
          : 'Die Startrollen wie im Aufbau besetzen. Der erste Versuch beginnt kontrolliert; Verteidiger dürfen die erlaubten Fenster selbst öffnen oder schließen.',
          specific,
          'Die vier Schritte des Grundmoves erklären die Technik. Den dort genannten Abschluss nur bei freiem Fenster ausführen; die Lernaufgabe bestimmt, wann ein Konter, Pass oder Abbruch richtig ist.',
          index===4 ? 'Ein Versuch endet nach freiem Abschluss, sicherem Ausstieg oder Ballverlust. Einen Punkt für eine passende Entscheidung und einen zweiten für saubere Technik geben. Nach sechs Ballbesitzen auswerten.'
          : 'Nach der Aktion Rollen wechseln und kurz benennen, welches Fenster offen war. Erst dann den nächsten Versuch beginnen.'
        ],
        coachingPoints:[...base.coachingPoints,index===0?'Saubere Bewegung vor zusätzlichem Tempo.':index===1?'Erst sehen und dann handeln; Entscheidung laut benennen.':index===2?'Den Konter nur auf eine tatsächlich geschlossene erste Lösung nutzen.':index===3?'Nach der Erstaktion den zusätzlichen Partner wirklich sehen.':'Entscheidung und technische Ausführung getrennt bewerten.'],
        commonMistakes:[...base.commonMistakes,index===2?'Den Konter unabhängig von der Verteidigerreaktion vorwegnehmen.':index===3?'Nach der ersten Aktion stehen bleiben und den Anschluss vergessen.':'Die Zusatzaufgabe erfüllen wollen, obwohl das nötige Fenster geschlossen ist.'],
        successIndicator:base.successIndicator.replace(/\b12\b/g,'6').replace(/\b6\b(?= (?:Versuche pro Seite|Aktionen je Hand|Durchgänge je Angriffsseite))/g,'3').replace(/((?:Je Seite|Je Hand|Je Richtung|je Seite|pro Seite) )6\b/g,'$13')+' '+(index===4?'Zusätzlich Entscheidungs- und Technikpunkte aus sechs Ballbesitzen getrennt notieren.':'Zusätzlich von sechs Aktionen die passend gelösten Lernaufgaben zählen.'),
        repetitions:'8 Minuten einschließlich Erklärung, Rollenwechsel und Pausen. Zunächst je Spieler 6 Aktionen, dann bei verbleibender Zeit eine zweite Serie. Nach 3 Aktionen 30 Sekunden Pause. Beide Seiten innerhalb der Serien nutzen; bei großen Gruppen weniger Versuche.',
        easier:base.easier+' Die Zusatzaufgabe vor dem Start ankündigen und nur ein offenes Fenster anbieten.',
        harder:base.harder+' Erst bei sicherer Technik die Entscheidung später zeigen; keinen zusätzlichen Ermüdungsblock anhängen.',
        ...(sourceVideo ? {sourceVideo} : {})
      };
    });
  });
})();
