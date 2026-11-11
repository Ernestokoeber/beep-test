// CourtHub original coaching collection: 100 families, four actionable variants each.
// Stable variant IDs keep favorites and references intact across updates.
window.BT = window.BT || {};
BT.exerciseCatalogSeed = (() => {
  const families = [
  {
    "familyId": "pound",
    "familyName": "Kontrolldribbling",
    "category": "Ballhandling im Stand",
    "minutes": 6,
    "goal": "Ballhöhe und Druck bewusst steuern.",
    "setup": "Freie Fläche, ein Ball pro Spieler.",
    "coachingPoints": [
      "Finger spreizen, Ball nicht schlagen.",
      "Kopf möglichst oben halten."
    ],
    "repetitions": "3 Runden à 30 Sekunden, dazwischen 20 Sekunden Pause.",
    "successIndicator": "Ballverluste und sauber erfüllte Signale je Runde notieren.",
    "steps": [
      "Stabil stehen und den Ball seitlich vor dem Körper dribbeln.",
      "Hand und Ballhöhe regelmäßig wechseln."
    ],
    "variants": [
      {
        "id": "catalog-pound-1",
        "name": "Kontrolldribbling · Höhenleiter",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Höhenleiter“: Je fünf Dribblings auf Knöchel-, Knie- und Hüfthöhe verbinden."
      },
      {
        "id": "catalog-pound-2",
        "name": "Kontrolldribbling · Zahlen lesen",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Zahlen lesen“: Trainer zeigt Zahlen; laut nennen und die Dribbelhöhe beibehalten."
      },
      {
        "id": "catalog-pound-3",
        "name": "Kontrolldribbling · Spiegelpartner",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Spiegelpartner“: Partner gibt mit seinem Dribbling die Höhe vor; nach jeder Runde Führung tauschen."
      },
      {
        "id": "catalog-pound-4",
        "name": "Kontrolldribbling · Unabhängige Hände",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Zweiter Basketball"
        ],
        "task": "Variante „Unabhängige Hände“: Mit zwei Bällen gleichzeitig arbeiten: eine Hand tief, die andere höher; auf Signal tauschen."
      }
    ]
  },
  {
    "familyId": "crossover",
    "familyName": "Crossover",
    "category": "Ballhandling im Stand",
    "minutes": 6,
    "goal": "Handwechsel vor dem Körper kontrollieren.",
    "setup": "Freie Fläche mit genug Abstand zu Nachbarn.",
    "coachingPoints": [
      "Tief aus den Beinen arbeiten.",
      "Ball unterhalb der Knie kreuzen."
    ],
    "repetitions": "3 Serien à 12 Wechsel, 20 Sekunden Pause.",
    "successIndicator": "Saubere Wechsel ohne Blick auf den Ball zählen.",
    "steps": [
      "Ball vor dem Körper zur anderen Hand führen.",
      "Nach dem Wechsel den Ball wieder seitlich kontrollieren."
    ],
    "variants": [
      {
        "id": "catalog-crossover-1",
        "name": "Crossover · Breit und tief",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Breit und tief“: Nach jeweils zwei Kontrolldribblings einen breiten Handwechsel ausführen."
      },
      {
        "id": "catalog-crossover-2",
        "name": "Crossover · Doppelwechsel",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Doppelwechsel“: Zwei schnelle Wechsel verbinden, danach eine Sekunde kontrolliert dribbeln."
      },
      {
        "id": "catalog-crossover-3",
        "name": "Crossover · Fußsignal",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Fußsignal“: Trainer zeigt eine Seite; zu dieser Seite wechseln und einen Ausfallschritt setzen."
      },
      {
        "id": "catalog-crossover-4",
        "name": "Crossover · Spiegelfenster",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Spiegelfenster“: Partner verschiebt seitlich seine Hände als passive Begrenzung; den freien Raum für den Wechsel nutzen."
      }
    ]
  },
  {
    "familyId": "v-dribble",
    "familyName": "V-Dribbling",
    "category": "Ballhandling im Stand",
    "minutes": 6,
    "goal": "Den Ball mit einer Hand in zwei Richtungen führen.",
    "setup": "Je Spieler ein Ball, freier Radius von etwa zwei Metern.",
    "coachingPoints": [
      "Hand seitlich an den Ball bringen.",
      "Ballkontakt oben und seitlich halten, nicht untergreifen."
    ],
    "repetitions": "2 Runden je Hand und Richtung à 25 Sekunden.",
    "successIndicator": "Gleichmäßige Richtungswechsel ohne Ballaufnahme erreichen.",
    "steps": [
      "Ball mit derselben Hand seitlich vor und zurück bewegen.",
      "Danach vor dem Körper seitlich pendeln lassen."
    ],
    "variants": [
      {
        "id": "catalog-v-dribble-1",
        "name": "V-Dribbling · Seitliches Pendel",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Seitliches Pendel“: Nur seitlich pendeln; der freie Arm bleibt als Schutz vor dem Körper."
      },
      {
        "id": "catalog-v-dribble-2",
        "name": "V-Dribbling · Vor-zurück",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Vor-zurück“: Ball neben dem Fuß nach vorne und hinten führen; Oberkörper bleibt ruhig."
      },
      {
        "id": "catalog-v-dribble-3",
        "name": "V-Dribbling · V zum Crossover",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „V zum Crossover“: Zwei V-Bewegungen und einen Crossover verbinden, dann andere Hand."
      },
      {
        "id": "catalog-v-dribble-4",
        "name": "V-Dribbling · V mit Schrittfolge",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „V mit Schrittfolge“: Vorwärtsschritt und Rückzugsschritt mit der Ballrichtung koordinieren, ohne den Ball aufzunehmen."
      }
    ]
  },
  {
    "familyId": "in-out",
    "familyName": "In-and-out",
    "category": "Ballhandling im Stand",
    "minutes": 6,
    "goal": "Eine Richtung andeuten und mit derselben Hand fortsetzen.",
    "setup": "Ein Ball pro Spieler, ausreichend Seitenraum.",
    "coachingPoints": [
      "Täuschung mit Schulter und Blick zeigen.",
      "Hand nicht unter den Ball drehen."
    ],
    "repetitions": "3 Serien à 6 Wiederholungen je Hand.",
    "successIndicator": "Täuschung und anschließende Ballkontrolle getrennt bewerten.",
    "steps": [
      "Ball leicht nach innen führen.",
      "Mit derselben Hand nach außen zurückbringen und die Schulter mitnehmen."
    ],
    "variants": [
      {
        "id": "catalog-in-out-1",
        "name": "In-and-out · Langsame Täuschung",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Langsame Täuschung“: Zwischen zwei Täuschungen drei ruhige Dribblings setzen."
      },
      {
        "id": "catalog-in-out-2",
        "name": "In-and-out · Täuschung plus Antritt",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Täuschung plus Antritt“: Nach der Täuschung zwei schnelle Schritte in derselben Richtung gehen."
      },
      {
        "id": "catalog-in-out-3",
        "name": "In-and-out · Partner liest",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Partner liest“: Partner nennt nach jeder Aktion die angetäuschte Richtung; anschließend Rollen tauschen."
      },
      {
        "id": "catalog-in-out-4",
        "name": "In-and-out · In-out oder Wechsel",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „In-out oder Wechsel“: Auf Trainersignal entweder außen fortsetzen oder unmittelbar einen Crossover anschließen."
      }
    ]
  },
  {
    "familyId": "two-ball",
    "familyName": "Zweiballkontrolle",
    "category": "Ballhandling im Stand",
    "minutes": 6,
    "goal": "Beide Hände unabhängig voneinander einsetzen.",
    "setup": "Zwei Bälle pro Spieler, freie Fläche.",
    "coachingPoints": [
      "Schultern locker lassen.",
      "Bei Ballverlust neu ordnen, nicht hinterherjagen."
    ],
    "repetitions": "4 Runden à 20 Sekunden, jeweils 25 Sekunden Pause.",
    "successIndicator": "Längste kontrollierte Serie je Muster festhalten.",
    "steps": [
      "Beide Bälle kontrolliert dribbeln.",
      "Erst nach stabiler Kontrolle das Muster wechseln."
    ],
    "variants": [
      {
        "id": "catalog-two-ball-1",
        "name": "Zweiballkontrolle · Gleichzeitig",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Zweiter Basketball"
        ],
        "task": "Variante „Gleichzeitig“: Beide Bälle gleichzeitig auf gleicher Höhe aufsetzen."
      },
      {
        "id": "catalog-two-ball-2",
        "name": "Zweiballkontrolle · Wechselrhythmus",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Zweiter Basketball"
        ],
        "task": "Variante „Wechselrhythmus“: Die Bälle abwechselnd aufsetzen und den Rhythmus laut zählen."
      },
      {
        "id": "catalog-two-ball-3",
        "name": "Zweiballkontrolle · Hoch und tief",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Zweiter Basketball"
        ],
        "task": "Variante „Hoch und tief“: Ein Ball bleibt auf Hüfthöhe, der andere auf Kniehöhe; nach zehn Sekunden tauschen."
      },
      {
        "id": "catalog-two-ball-4",
        "name": "Zweiballkontrolle · Vorwärts-rückwärts",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Zweiter Basketball"
        ],
        "task": "Variante „Vorwärts-rückwärts“: Im Wechselrhythmus vier Schritte vor und zurück gehen, ohne die Bälle zu kreuzen."
      }
    ]
  },
  {
    "familyId": "slalom",
    "familyName": "Richtungswechsel im Slalom",
    "category": "Dribbling in Bewegung",
    "minutes": 8,
    "goal": "Den Körper zwischen Ball und gedachten Gegner bringen.",
    "setup": "Fünf Hütchen mit drei Metern Abstand, Rückweg außerhalb der Strecke.",
    "coachingPoints": [
      "Wechsel vor dem Hindernis beginnen.",
      "Nach jedem Wechsel sichtbar beschleunigen."
    ],
    "repetitions": "4 Durchgänge, auf dem Rückweg gehen.",
    "successIndicator": "Ballverluste und kontrollierte Beschleunigungen je Durchgang zählen.",
    "steps": [
      "Auf jedes Hütchen zulaufen.",
      "Vor dem Hütchen die Richtung ändern und mit Abstand vorbeiziehen."
    ],
    "variants": [
      {
        "id": "catalog-slalom-1",
        "name": "Richtungswechsel im Slalom · Crossover-Strecke",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Crossover-Strecke“: An jedem Hütchen mit einem Crossover die Hand wechseln."
      },
      {
        "id": "catalog-slalom-2",
        "name": "Richtungswechsel im Slalom · Beinwechsel-Strecke",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Beinwechsel-Strecke“: Den Wechsel durch die Beine ausführen; Hütchenabstand bei Bedarf vergrößern."
      },
      {
        "id": "catalog-slalom-3",
        "name": "Richtungswechsel im Slalom · Rückenschutz",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Rückenschutz“: An jedem zweiten Hütchen hinter dem Rücken wechseln und mit der Außenhand weiterdribbeln."
      },
      {
        "id": "catalog-slalom-4",
        "name": "Richtungswechsel im Slalom · Freie Wahl",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Freie Wahl“: Trainer zeigt am nächsten Hütchen die offene Seite; erst dann Wechsel und Laufweg wählen."
      }
    ]
  },
  {
    "familyId": "pace",
    "familyName": "Tempowechsel",
    "category": "Dribbling in Bewegung",
    "minutes": 8,
    "goal": "Langsames Antäuschen und schnellen Antritt unterscheiden.",
    "setup": "Start-, Entscheidungs- und Ziellinie mit Hütchen markieren.",
    "coachingPoints": [
      "Beim langsamen Teil aufrecht lesen.",
      "Erster schneller Schritt schiebt den Ball nach vorne."
    ],
    "repetitions": "6 Läufe über 10–15 Meter mit Rückwegpause.",
    "successIndicator": "Deutlichen Tempounterschied und sichere Ballkontrolle beobachten.",
    "steps": [
      "Kontrolliert bis zur mittleren Markierung dribbeln.",
      "Dort Tempo ändern und bis zur Ziellinie beschleunigen."
    ],
    "variants": [
      {
        "id": "catalog-pace-1",
        "name": "Tempowechsel · Langsam-schnell",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Langsam-schnell“: Bis zur Mitte langsam, danach zügig dribbeln."
      },
      {
        "id": "catalog-pace-2",
        "name": "Tempowechsel · Hesitation",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Hesitation“: An der Mitte kurz aufrichten und dann mit derselben Hand antreten."
      },
      {
        "id": "catalog-pace-3",
        "name": "Tempowechsel · Stop-and-go",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Stop-and-go“: Vor der Mitte kontrolliert abbremsen, weiterdribbeln und erneut beschleunigen."
      },
      {
        "id": "catalog-pace-4",
        "name": "Tempowechsel · Verfolger",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Verfolger“: Ein Partner startet einen Schritt versetzt als Verfolger; nur seitlichen Druck geben, nicht von hinten greifen."
      }
    ]
  },
  {
    "familyId": "retreat",
    "familyName": "Rückzugsdribbling",
    "category": "Dribbling in Bewegung",
    "minutes": 8,
    "goal": "Druck lösen und einen neuen Angriffsweg finden.",
    "setup": "Ein Hütchen als Druckpunkt und zwei seitliche Ausgänge.",
    "coachingPoints": [
      "Ball mit dem Körper schützen.",
      "Im Rückzug den freien Raum hinter sich prüfen."
    ],
    "repetitions": "3 Serien à 4 Aktionen pro Seite.",
    "successIndicator": "Rückzug ohne Ballaufnahme und klaren zweiten Antritt schaffen.",
    "steps": [
      "Zum Druckpunkt dribbeln.",
      "Zwei kontrollierte Schritte rückwärts gehen und erneut vorwärts angreifen."
    ],
    "variants": [
      {
        "id": "catalog-retreat-1",
        "name": "Rückzugsdribbling · Festgelegter Ausgang",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Festgelegter Ausgang“: Nach jedem Rückzug zum vorher vereinbarten seitlichen Hütchen angreifen."
      },
      {
        "id": "catalog-retreat-2",
        "name": "Rückzugsdribbling · Handwechsel im Rückzug",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Handwechsel im Rückzug“: Beim zweiten Rückzugsschritt die Hand wechseln und diagonal neu starten."
      },
      {
        "id": "catalog-retreat-3",
        "name": "Rückzugsdribbling · Lenkender Verteidiger",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Lenkender Verteidiger“: Partner schließt passiv einen Ausgang; durch den freien Ausgang dribbeln."
      },
      {
        "id": "catalog-retreat-4",
        "name": "Rückzugsdribbling · Lebender Druck",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Lebender Druck“: Verteidiger darf den Weg aktiv schließen; Angreifer hat sechs Sekunden, eines der beiden Tore zu erreichen."
      }
    ]
  },
  {
    "familyId": "turn",
    "familyName": "Dribbelwende",
    "category": "Dribbling in Bewegung",
    "minutes": 8,
    "goal": "Bei engem Raum mit dem Rücken abschirmen.",
    "setup": "Markierung am Flügel, Startpunkt fünf Meter davor.",
    "coachingPoints": [
      "Vor der Drehung Geschwindigkeit reduzieren.",
      "Nach der Drehung Blick sofort ins Feld."
    ],
    "repetitions": "Je 5 Wiederholungen in beide Drehrichtungen.",
    "successIndicator": "Ballkontrolle und Orientierung nach der Drehung bewerten.",
    "steps": [
      "Auf die Markierung zudribbeln.",
      "Kontrolliert wenden und den Ball mit dem Körper abschirmen."
    ],
    "variants": [
      {
        "id": "catalog-turn-1",
        "name": "Dribbelwende · Geplante Wende",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Geplante Wende“: Vor dem Hütchen die freie Hand als Schutz halten und eine langsame Rückwärtsdrehung dribbeln."
      },
      {
        "id": "catalog-turn-2",
        "name": "Dribbelwende · Wende zum Tor",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Wende zum Tor“: Nach der Drehung eines von zwei seitlichen Hütchentoren ansteuern."
      },
      {
        "id": "catalog-turn-3",
        "name": "Dribbelwende · Wende oder Rückzug",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Wende oder Rückzug“: Trainer ruft erst kurz vor dem Hütchen „Drehen“ oder „Zurück“."
      },
      {
        "id": "catalog-turn-4",
        "name": "Dribbelwende · Wende gegen Lenken",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Wende gegen Lenken“: Partner versperrt einen Weg ohne zu greifen; die Wende nur bei geschlossenem Vorwärtsweg einsetzen."
      }
    ]
  },
  {
    "familyId": "protect",
    "familyName": "Dribbling unter Druck",
    "category": "Dribbling in Bewegung",
    "minutes": 8,
    "goal": "Ball schützen und trotzdem Raum gewinnen.",
    "setup": "Schmaler Korridor aus Hütchen; genügend Platz am Ende.",
    "coachingPoints": [
      "Schutzarm angewinkelt halten, nicht stoßen.",
      "Seitlich versetzt zum Gegner bewegen."
    ],
    "repetitions": "4 Durchgänge à 15 Sekunden, danach Rollenwechsel.",
    "successIndicator": "Erreichte Strecke und Ballverluste zählen.",
    "steps": [
      "Durch den Korridor dribbeln.",
      "Ball vom Druck weg auf der Außenhand halten."
    ],
    "variants": [
      {
        "id": "catalog-protect-1",
        "name": "Dribbling unter Druck · Außenhand-Korridor",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Außenhand-Korridor“: An den Markierungen die Hand wechseln, sodass der Ball jeweils außen bleibt."
      },
      {
        "id": "catalog-protect-2",
        "name": "Dribbling unter Druck · Schattenpartner",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Schattenpartner“: Partner läuft ohne Ballkontakt daneben und verändert die Druckseite."
      },
      {
        "id": "catalog-protect-3",
        "name": "Dribbling unter Druck · Seitlicher Ballgewinn",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Seitlicher Ballgewinn“: Verteidiger darf aus seitlicher Position nach dem Ball greifen; Körperkontakt vermeiden."
      },
      {
        "id": "catalog-protect-4",
        "name": "Dribbling unter Druck · Zwei Ausgänge",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Zwei Ausgänge“: Korridor endet in zwei Toren; Angreifer muss das freie Tor erkennen und erreichen."
      }
    ]
  },
  {
    "familyId": "layup",
    "familyName": "Korbleger-Rhythmus",
    "category": "Abschluss am Korb",
    "minutes": 8,
    "goal": "Schrittfolge, Absprung und Ballabgabe verbinden.",
    "setup": "Start nahe dem Flügel; Rückweg neben dem Korb freihalten.",
    "coachingPoints": [
      "Blick vor der Aufnahme zum Ziel.",
      "Knie und Wurfarm führen gemeinsam nach oben."
    ],
    "repetitions": "Je 6 Abschlüsse von beiden Seiten, kurze Pause nach jeder Serie.",
    "successIndicator": "Treffer und saubere Schrittfolgen getrennt zählen.",
    "steps": [
      "Zum Korb anlaufen und den Ball kontrolliert aufnehmen.",
      "Mit passender Schrittfolge abspringen und am Brett abschließen."
    ],
    "variants": [
      {
        "id": "catalog-layup-1",
        "name": "Korbleger-Rhythmus · Ein-Schritt-Abschluss",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ein-Schritt-Abschluss“: Nah am Korb aus einem Schritt abschließen; Ball bereits in beiden Händen halten."
      },
      {
        "id": "catalog-layup-2",
        "name": "Korbleger-Rhythmus · Ein Dribbling",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ein Dribbling“: Aus kurzem Abstand ein Dribbling und die vollständige Korblegerschrittfolge verbinden."
      },
      {
        "id": "catalog-layup-3",
        "name": "Korbleger-Rhythmus · Pass in den Lauf",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass in den Lauf“: Partner passt von der Mitte in den Lauf; ohne zusätzliches Dribbling abschließen."
      },
      {
        "id": "catalog-layup-4",
        "name": "Korbleger-Rhythmus · Seitlicher Verfolger",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Seitlicher Verfolger“: Verteidiger startet seitlich einen Schritt zurück; Abschluss schützen, kein Kontakt in der Luft."
      }
    ]
  },
  {
    "familyId": "reverse",
    "familyName": "Reverse-Abschluss",
    "category": "Abschluss am Korb",
    "minutes": 8,
    "goal": "Das Brett als Schutz vor einer Verteidigung nutzen.",
    "setup": "Start an der Grundlinie außerhalb der Zone, ein Korb.",
    "coachingPoints": [
      "Früh das Ziel auf der anderen Brettseite suchen.",
      "Landefläche unter dem Korb freihalten."
    ],
    "repetitions": "Je 5 Versuche von beiden Grundlinienseiten.",
    "successIndicator": "Treffer sowie sichere Landungen ohne Durchlaufen unter anderen Spielern zählen.",
    "steps": [
      "Unter kontrolliertem Tempo unter dem Korb vorbeilaufen.",
      "Auf der gegenüberliegenden Seite mit Blick zum Brett abschließen."
    ],
    "variants": [
      {
        "id": "catalog-reverse-1",
        "name": "Reverse-Abschluss · Ohne Dribbling",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ohne Dribbling“: Aus der Nahposition mit Ball in beiden Händen die Bewegung zur anderen Brettseite üben."
      },
      {
        "id": "catalog-reverse-2",
        "name": "Reverse-Abschluss · Grundlinien-Drive",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Grundlinien-Drive“: Von der Grundlinie mit einem Dribbling unter den Korb ziehen."
      },
      {
        "id": "catalog-reverse-3",
        "name": "Reverse-Abschluss · Pass hinter das Brett",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass hinter das Brett“: Partner passt kurz vor dem Unterlaufen; erst sichern, dann auf der Gegenseite abschließen."
      },
      {
        "id": "catalog-reverse-4",
        "name": "Reverse-Abschluss · Leseabschluss",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Leseabschluss“: Partner zeigt passiv eine Brettseite zu; Angreifer wählt normalen oder Reverse-Abschluss."
      }
    ]
  },
  {
    "familyId": "power-finish",
    "familyName": "Beidbeiniger Abschluss",
    "category": "Abschluss am Korb",
    "minutes": 8,
    "goal": "Nach der Ballaufnahme stabil stoppen und abschließen.",
    "setup": "Start am Zonenrand, genügend Platz zur Korbseite.",
    "coachingPoints": [
      "Ball oberhalb der Hüfte sichern.",
      "Knie über den Füßen stabilisieren."
    ],
    "repetitions": "3 Serien à 4 Abschlüsse je Seite.",
    "successIndicator": "Stabile Stopps, sichere Landungen und Treffer erfassen.",
    "steps": [
      "Mit einem Dribbling in die Zone gehen.",
      "Beidbeinig kontrolliert stoppen und senkrecht zum Abschluss hochgehen."
    ],
    "variants": [
      {
        "id": "catalog-power-finish-1",
        "name": "Beidbeiniger Abschluss · Naher Sprungstopp",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Naher Sprungstopp“: Ohne Verteidiger aus kurzem Anlauf stoppen und ans Brett abschließen."
      },
      {
        "id": "catalog-power-finish-2",
        "name": "Beidbeiniger Abschluss · Pumpfake",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pumpfake“: Nach dem Stopp eine Wurftäuschung zeigen, unten bleiben und erst danach abschließen."
      },
      {
        "id": "catalog-power-finish-3",
        "name": "Beidbeiniger Abschluss · Pass durch die Zone",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass durch die Zone“: Partner passt von der gegenüberliegenden Zonenseite; nach Fang stabil stoppen."
      },
      {
        "id": "catalog-power-finish-4",
        "name": "Beidbeiniger Abschluss · Vertikale Defense",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Vertikale Defense“: Verteidiger hält die Arme hoch und bleibt am Boden; Angreifer entscheidet zwischen direktem Abschluss und Täuschung."
      }
    ]
  },
  {
    "familyId": "floater",
    "familyName": "Floater aus der Bewegung",
    "category": "Abschluss am Korb",
    "minutes": 8,
    "goal": "Vor einem tieferen Verteidiger früh und weich abschließen.",
    "setup": "Start am Flügel, Wurfbereich zwei bis vier Meter vor dem Korb.",
    "coachingPoints": [
      "Abgabe nicht nach vorne schieben.",
      "Balance und freie Landung priorisieren."
    ],
    "repetitions": "Je 6 Versuche pro Seite, Distanz passend wählen.",
    "successIndicator": "Trefferquote aus derselben Distanz vergleichen.",
    "steps": [
      "Mit kontrolliertem Tempo in den Wurfbereich dribbeln.",
      "Den Ball hoch und weich abgeben, bevor der Korbbereich erreicht ist."
    ],
    "variants": [
      {
        "id": "catalog-floater-1",
        "name": "Floater aus der Bewegung · Kurzer Einbein-Floater",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Kurzer Einbein-Floater“: Mit einem Dribbling und einbeinigem Absprung aus kurzer Distanz abschließen."
      },
      {
        "id": "catalog-floater-2",
        "name": "Floater aus der Bewegung · Beidbein-Floater",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Beidbein-Floater“: Nach kurzem Sprungstopp beidbeinig abspringen und ohne Ausholbewegung werfen."
      },
      {
        "id": "catalog-floater-3",
        "name": "Floater aus der Bewegung · Abstand lesen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Abstand lesen“: Partner steht passiv tief oder höher in der Zone; nur bei freiem Abgaberaum den Floater nehmen."
      },
      {
        "id": "catalog-floater-4",
        "name": "Floater aus der Bewegung · Pass oder Floater",
        "playersMin": 3,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass oder Floater“: Ein Mitspieler wartet am kurzen Eck, ein Verteidiger wählt Ball oder Passweg; passend entscheiden."
      }
    ]
  },
  {
    "familyId": "euro",
    "familyName": "Seitlicher Ausweichabschluss",
    "category": "Abschluss am Korb",
    "minutes": 8,
    "goal": "Mit regelgerechter Schrittfolge seitlich ausweichen.",
    "setup": "Zwei flache Markierungen neben der direkten Korblinie.",
    "coachingPoints": [
      "Keinen zusätzlichen Schritt nach der Aufnahme setzen.",
      "Seitlich ausweichen, nicht in den Gegner springen."
    ],
    "repetitions": "Je 5 langsame und 5 flüssige Wiederholungen pro Seite.",
    "successIndicator": "Regelgerechte Schrittfolge und kontrollierten Abschluss getrennt beurteilen.",
    "steps": [
      "Ball vor dem ersten Ausweichschritt aufnehmen.",
      "Zwei kontrollierte Schritte mit Richtungswechsel und einen Abschluss verbinden."
    ],
    "variants": [
      {
        "id": "catalog-euro-1",
        "name": "Seitlicher Ausweichabschluss · Trockenfolge mit Ball",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Trockenfolge mit Ball“: Die beiden Schritte langsam an den Markierungen ausführen, dann nah abschließen."
      },
      {
        "id": "catalog-euro-2",
        "name": "Seitlicher Ausweichabschluss · Aus dem Dribbling",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Aus dem Dribbling“: Mit zwei Dribblings anlaufen und vor den Markierungen aufnehmen."
      },
      {
        "id": "catalog-euro-3",
        "name": "Seitlicher Ausweichabschluss · Passannahme",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Passannahme“: Partner passt im Anlauf; Fangzeitpunkt und beide Schritte sauber verbinden."
      },
      {
        "id": "catalog-euro-4",
        "name": "Seitlicher Ausweichabschluss · Richtung lesen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Richtung lesen“: Partner stellt sich vor der Ballaufnahme passiv auf eine Seite; auf die freie Seite ausweichen."
      }
    ]
  },
  {
    "familyId": "form-shot",
    "familyName": "Nahwurf-Technik",
    "category": "Wurftechnik",
    "minutes": 8,
    "goal": "Einen kontrollierten, wiederholbaren Wurfablauf finden.",
    "setup": "Ein bis zwei Meter vor dem Korb; freie Reboundbahn.",
    "coachingPoints": [
      "Handgelenk entspannt ausschwingen lassen.",
      "Nur so weit weg stehen, dass die Bewegung kontrolliert bleibt."
    ],
    "repetitions": "3 Serien à 8 Würfe mit kurzer Rückmeldung.",
    "successIndicator": "Treffer und konstante Flugbahn aus gleicher Entfernung erfassen.",
    "steps": [
      "Ball in Wurfposition bringen.",
      "Beine und Arm flüssig strecken und den Wurf beobachten."
    ],
    "variants": [
      {
        "id": "catalog-form-shot-1",
        "name": "Nahwurf-Technik · Nur Wurfhand",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Nur Wurfhand“: Ball mit der Wurfhand balancieren, die andere Hand berührt beim Wurf nicht."
      },
      {
        "id": "catalog-form-shot-2",
        "name": "Nahwurf-Technik · Führhand lösen",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Führhand lösen“: Mit beiden Händen vorbereiten; Führhand bleibt ruhig und schiebt nicht mit."
      },
      {
        "id": "catalog-form-shot-3",
        "name": "Nahwurf-Technik · Selbstpass",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Selbstpass“: Ball vor sich aufprellen, fangen und ohne Nachgreifen in die Wurfbewegung kommen."
      },
      {
        "id": "catalog-form-shot-4",
        "name": "Nahwurf-Technik · Partner-Feedback",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Partner-Feedback“: Partner beobachtet nur die Führhand; nach fünf Würfen Rollen wechseln und einen Hinweis geben."
      }
    ]
  },
  {
    "familyId": "shot-stop",
    "familyName": "Stoppen und werfen",
    "category": "Wurftechnik",
    "minutes": 8,
    "goal": "Nach Bewegung ausbalanciert in den Wurf kommen.",
    "setup": "Markierung drei Meter vor dem Korb; kurzer Anlauf.",
    "coachingPoints": [
      "Füße vor dem Wurf stabil platzieren.",
      "Nicht seitlich wegkippen."
    ],
    "repetitions": "4 Serien à 5 Würfe, Stoppart je Serie wechseln.",
    "successIndicator": "Treffer und Gleichgewichtsverluste dokumentieren.",
    "steps": [
      "Zur Wurfposition gehen.",
      "Stoppen, zum Korb ausrichten und flüssig werfen."
    ],
    "variants": [
      {
        "id": "catalog-shot-stop-1",
        "name": "Stoppen und werfen · Sprungstopp",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Sprungstopp“: Mit eigenem Aufprellpass beidbeinig stoppen und werfen."
      },
      {
        "id": "catalog-shot-stop-2",
        "name": "Stoppen und werfen · Schrittstopp",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Schrittstopp“: Nach eigenem Aufprellpass die Füße nacheinander setzen und direkt werfen."
      },
      {
        "id": "catalog-shot-stop-3",
        "name": "Stoppen und werfen · Seitlicher Anlauf",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Seitlicher Anlauf“: Von einer seitlichen Markierung zum Ball kommen; Körper vor dem Wurf ausrichten."
      },
      {
        "id": "catalog-shot-stop-4",
        "name": "Stoppen und werfen · Zuspiel im Wechsel",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zuspiel im Wechsel“: Partner passt abwechselnd von links und rechts; passende Stopps selbst wählen."
      }
    ]
  },
  {
    "familyId": "set-point",
    "familyName": "Wurfvorbereitung",
    "category": "Wurftechnik",
    "minutes": 8,
    "goal": "Ball ohne unnötige Umwege in die Abgabe bringen.",
    "setup": "Eine feste, sichere Nahdistanz pro Spieler wählen.",
    "coachingPoints": [
      "Hände vor dem Fang zeigen.",
      "Gleichen Bewegungsweg wiederholen."
    ],
    "repetitions": "3 Serien à 6 Würfe.",
    "successIndicator": "Zusätzliche Ballkorrekturen vor dem Wurf zählen.",
    "steps": [
      "Ball anspielbereit halten.",
      "Nach Fang oder Selbstpass direkt in die Wurfbewegung wechseln."
    ],
    "variants": [
      {
        "id": "catalog-set-point-1",
        "name": "Wurfvorbereitung · Bereite Hände",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Bereite Hände“: Mit einem Selbstpass starten und den Ball in vorbereitete Hände nehmen."
      },
      {
        "id": "catalog-set-point-2",
        "name": "Wurfvorbereitung · Partnerpass zentral",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Partnerpass zentral“: Partner passt auf Brusthöhe; ohne Absetzen nach unten werfen."
      },
      {
        "id": "catalog-set-point-3",
        "name": "Wurfvorbereitung · Variable Fanghöhe",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Variable Fanghöhe“: Partner variiert leicht die Passhöhe; Ball kontrolliert in den gewohnten Ablauf führen."
      },
      {
        "id": "catalog-set-point-4",
        "name": "Wurfvorbereitung · Entscheidung Wurf-Pass",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Entscheidung Wurf-Pass“: Partner ruft kurz nach dem Pass „Wurf“ oder „Zurück“; erst wahrnehmen, dann handeln."
      }
    ]
  },
  {
    "familyId": "bank-shot",
    "familyName": "Brettwurf-Winkel",
    "category": "Wurftechnik",
    "minutes": 8,
    "goal": "Passende Zielpunkte für Würfe über das Brett finden.",
    "setup": "Zwei schräge Nahpositionen am Korb markieren.",
    "coachingPoints": [
      "Brettziel vor dem Wurf bestimmen.",
      "Kraft an den Winkel anpassen."
    ],
    "repetitions": "Je 8 Würfe pro Position.",
    "successIndicator": "Treffer je Winkel getrennt notieren.",
    "steps": [
      "Von der markierten Position werfen.",
      "Rebound holen und denselben Winkel erneut anlaufen."
    ],
    "variants": [
      {
        "id": "catalog-bank-shot-1",
        "name": "Brettwurf-Winkel · Fester Winkel",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fester Winkel“: Alle Würfe zunächst von einer festen schrägen Position ausführen."
      },
      {
        "id": "catalog-bank-shot-2",
        "name": "Brettwurf-Winkel · Winkelleiter",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Winkelleiter“: Nach je zwei Würfen eine halbe Schrittlänge seitlich versetzen."
      },
      {
        "id": "catalog-bank-shot-3",
        "name": "Brettwurf-Winkel · Dribbling zum Brettwurf",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Dribbling zum Brettwurf“: Mit einem Dribbling in den markierten Winkel gehen, stoppen und werfen."
      },
      {
        "id": "catalog-bank-shot-4",
        "name": "Brettwurf-Winkel · Zielwahl",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zielwahl“: Partner gibt Pass und Position vor; vor dem Wurf „Brett“ oder „Direkt“ ansagen und die Wahl begründen."
      }
    ]
  },
  {
    "familyId": "range",
    "familyName": "Wurfdistanz entwickeln",
    "category": "Wurftechnik",
    "minutes": 8,
    "goal": "Die eigene kontrollierte Wurfweite erkennen.",
    "setup": "Drei Abstände in kleinen Schritten vor dem Korb markieren.",
    "coachingPoints": [
      "Reichweite nicht mit einem Stoßen ausgleichen.",
      "Bewegung wichtiger als Entfernung."
    ],
    "repetitions": "Je 5 Versuche pro Abstand, höchstens 3 Abstände.",
    "successIndicator": "Treffer und erkennbare Technikänderungen je Abstand festhalten.",
    "steps": [
      "Von der nahen Position beginnen.",
      "Nur bei stabiler Bewegung zur nächsten Position wechseln."
    ],
    "variants": [
      {
        "id": "catalog-range-1",
        "name": "Wurfdistanz entwickeln · Nah-Mittel-Nah",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Nah-Mittel-Nah“: Zwischen den zwei näheren Positionen wechseln und die Bewegung vergleichen."
      },
      {
        "id": "catalog-range-2",
        "name": "Wurfdistanz entwickeln · Trefferfreigabe",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Trefferfreigabe“: Erst nach drei kontrollierten Treffern eine Position weitergehen; bei instabiler Bewegung zurück."
      },
      {
        "id": "catalog-range-3",
        "name": "Wurfdistanz entwickeln · Partnerbeobachtung",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Partnerbeobachtung“: Partner beobachtet Balance und Ballweg; Entfernung nur gemeinsam freigeben."
      },
      {
        "id": "catalog-range-4",
        "name": "Wurfdistanz entwickeln · Distanzentscheidung",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Distanzentscheidung“: Partner passt an eine von drei Positionen; bei zu großer Distanz kontrolliert näher dribbeln statt erzwingen."
      }
    ]
  },
  {
    "familyId": "catch-shoot",
    "familyName": "Catch-and-shoot",
    "category": "Wurf aus Bewegung",
    "minutes": 10,
    "goal": "Nach dem Zuspiel schnell und kontrolliert werfen.",
    "setup": "Wurfposition am Flügel, Rebound- und Passweg außerhalb der Laufbahn.",
    "coachingPoints": [
      "Füße vor oder mit dem Fang vorbereiten.",
      "Nach dem Pass nicht auf den Ball warten."
    ],
    "repetitions": "3 Serien à 6 Würfe, Rollen nach jeder Serie wechseln.",
    "successIndicator": "Treffer und fangfertige Ankünfte zählen.",
    "steps": [
      "Zur Wurfposition kommen und die Hände zeigen.",
      "Ball fangen, ausrichten und werfen."
    ],
    "variants": [
      {
        "id": "catalog-catch-shoot-1",
        "name": "Catch-and-shoot · Selbstpass am Spot",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Selbstpass am Spot“: Ball selbst zur Markierung aufprellen und in den Wurf hineinlaufen."
      },
      {
        "id": "catalog-catch-shoot-2",
        "name": "Catch-and-shoot · Partnerpass",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Partnerpass“: Partner passt vom Zonenrand auf die vorbereiteten Hände."
      },
      {
        "id": "catalog-catch-shoot-3",
        "name": "Catch-and-shoot · Zwei Spots",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Zwei Spots“: Zwischen Flügel und kurzer Ecke wechseln; erst am neuen Spot den Pass erhalten."
      },
      {
        "id": "catalog-catch-shoot-4",
        "name": "Catch-and-shoot · Passiver Closeout",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Passiver Closeout“: Ein dritter Spieler läuft kontrolliert an; Wurf nur bei freiem Raum, sonst Ball halten und neu starten."
      }
    ]
  },
  {
    "familyId": "pull-up",
    "familyName": "Pull-up-Wurf",
    "category": "Wurf aus Bewegung",
    "minutes": 10,
    "goal": "Dribbling kontrolliert in einen Sprungwurf überführen.",
    "setup": "Start am Flügel, Abschlussmarkierung in sicherer Wurfdistanz.",
    "coachingPoints": [
      "Letztes Dribbling bereitet den Stopp vor.",
      "Nicht nach vorne in die Landung kippen."
    ],
    "repetitions": "Je 6 Abschlüsse in beide Richtungen.",
    "successIndicator": "Treffer und stabile Stopps je Richtung erfassen.",
    "steps": [
      "Mit dem Dribbling Richtung Markierung angreifen.",
      "Ball aufnehmen, abbremsen und werfen."
    ],
    "variants": [
      {
        "id": "catalog-pull-up-1",
        "name": "Pull-up-Wurf · Ein Dribbling",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Ein Dribbling“: Aus ruhigem Stand mit einem Dribbling zur Markierung und in den Wurf gehen."
      },
      {
        "id": "catalog-pull-up-2",
        "name": "Pull-up-Wurf · Crossover-Pull-up",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Crossover-Pull-up“: Vor der Markierung einen Handwechsel setzen und danach stoppen."
      },
      {
        "id": "catalog-pull-up-3",
        "name": "Pull-up-Wurf · Tempo-Pull-up",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Tempo-Pull-up“: Erst langsam, dann schnell angreifen und kontrolliert zum Wurf abbremsen."
      },
      {
        "id": "catalog-pull-up-4",
        "name": "Pull-up-Wurf · Lücke lesen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Lücke lesen“: Verteidiger gibt Abstand oder schließt passiv; bei Abstand Pull-up, sonst Rückzug und Neustart."
      }
    ]
  },
  {
    "familyId": "relocation",
    "familyName": "Wurf nach Standortwechsel",
    "category": "Wurf aus Bewegung",
    "minutes": 10,
    "goal": "Nach einem Pass erneut eine freie Passlinie herstellen.",
    "setup": "Flügel und Ecke markieren; Partner oder Trainer am Zonenrand.",
    "coachingPoints": [
      "Blick beim Laufen beim Ball halten.",
      "Nicht direkt hinter dem Verteidiger stehen bleiben."
    ],
    "repetitions": "3 Serien à 5 Abschlüsse pro Richtung.",
    "successIndicator": "Freie Passfenster und Treffer zählen.",
    "steps": [
      "Ball abgeben und sofort den Standort wechseln.",
      "Erneut anspielbereit werden und nach Rückpass werfen."
    ],
    "variants": [
      {
        "id": "catalog-relocation-1",
        "name": "Wurf nach Standortwechsel · Flügel zur Ecke",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Flügel zur Ecke“: Nach dem Pass in die Ecke gleiten und dort den Rückpass erhalten."
      },
      {
        "id": "catalog-relocation-2",
        "name": "Wurf nach Standortwechsel · Ecke zum Flügel",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Ecke zum Flügel“: Nach dem Pass nach oben zum Flügel steigen; Hände früh zeigen."
      },
      {
        "id": "catalog-relocation-3",
        "name": "Wurf nach Standortwechsel · Drive begleiten",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Drive begleiten“: Partner dribbelt zur Grundlinie oder Mitte; sich in die passende freie Passlinie versetzen."
      },
      {
        "id": "catalog-relocation-4",
        "name": "Wurf nach Standortwechsel · Verteidiger im Passweg",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Verteidiger im Passweg“: Ein Verteidiger hält einen der beiden Wege zu; freien Standort wählen und nach Pass abschließen."
      }
    ]
  },
  {
    "familyId": "curl-shot",
    "familyName": "Wurf nach Curl",
    "category": "Wurf aus Bewegung",
    "minutes": 10,
    "goal": "Eine gebogene Laufbewegung in einen Abschluss überführen.",
    "setup": "Hütchen als Blockersymbol am Ellbogen, Start an der Grundlinie.",
    "coachingPoints": [
      "Den Bogen nicht unnötig breit machen.",
      "Nach dem Fang zuerst Balance sichern."
    ],
    "repetitions": "3 Serien à 5 Würfe je Seite.",
    "successIndicator": "Passfang in Bewegung und kontrollierte Abschlüsse zählen.",
    "steps": [
      "Eng um die Markierung laufen.",
      "Zum Ball drehen, fangen und kontrolliert abschließen."
    ],
    "variants": [
      {
        "id": "catalog-curl-shot-1",
        "name": "Wurf nach Curl · Hütchenbogen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Hütchenbogen“: Partner passt nach dem Umlaufen des Hütchens auf Brusthöhe."
      },
      {
        "id": "catalog-curl-shot-2",
        "name": "Wurf nach Curl · Curl zum Floater",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Curl zum Floater“: Nach dem Fang einen Schritt Richtung Zone gehen und weich abschließen."
      },
      {
        "id": "catalog-curl-shot-3",
        "name": "Wurf nach Curl · Fade statt Curl",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Fade statt Curl“: Trainer zeigt vor dem Hütchen „außen“; vom Hütchen weg zum freien Wurfraum lösen."
      },
      {
        "id": "catalog-curl-shot-4",
        "name": "Wurf nach Curl · Verfolger lesen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Verfolger lesen“: Ein passiver Verfolger läuft innen oder außen; Curl oder Absetzen passend wählen."
      }
    ]
  },
  {
    "familyId": "separation-shot",
    "familyName": "Raum für den Wurf",
    "category": "Wurf aus Bewegung",
    "minutes": 10,
    "goal": "Durch kontrolliertes Abbremsen eigenen Wurfraum schaffen.",
    "setup": "Flügelposition und ausreichend freier Raum hinter der Wurfposition.",
    "coachingPoints": [
      "Ballaufnahme und Fußfolge bewusst verbinden.",
      "Nur so weit zurück, wie stabil gelandet werden kann."
    ],
    "repetitions": "Je 5 Aktionen in beide Richtungen, kurze Rückmeldung.",
    "successIndicator": "Schrittfehler, Balance und Treffer getrennt notieren.",
    "steps": [
      "Mit Ball eine kurze Angriffsbewegung zeigen.",
      "Kontrolliert Abstand herstellen, regelgerecht stoppen und werfen."
    ],
    "variants": [
      {
        "id": "catalog-separation-shot-1",
        "name": "Raum für den Wurf · Seitlicher Ausstieg",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Seitlicher Ausstieg“: Ein Dribbling seitlich, dann außerhalb der Angriffsgeraden stoppen und werfen."
      },
      {
        "id": "catalog-separation-shot-2",
        "name": "Raum für den Wurf · Rückzugsdribbling",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Rückzugsdribbling“: Mit weiterhin lebendem Dribbling einen Schritt zurückgehen, danach aufnehmen und werfen."
      },
      {
        "id": "catalog-separation-shot-3",
        "name": "Raum für den Wurf · Stepback-Folge",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Stepback-Folge“: Vorgegebene legale Fußfolge langsam üben, dann mit einem Angriffsdribbling und Rückwärtsschritt verbinden."
      },
      {
        "id": "catalog-separation-shot-4",
        "name": "Raum für den Wurf · Abstand entscheiden",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Abstand entscheiden“: Verteidiger schließt passiv die direkte Linie; nur bei kontrolliert geschaffenem Abstand werfen."
      }
    ]
  },
  {
    "familyId": "ft-routine",
    "familyName": "Freiwurf-Routine",
    "category": "Freiwürfe",
    "minutes": 8,
    "goal": "Eine kurze, verlässliche Vorbereitung wiederholen.",
    "setup": "Ein Korb und eine passende Freiwurflinie; bei Bedarf näher beginnen.",
    "coachingPoints": [
      "Routine kurz und reproduzierbar halten.",
      "Nach Fehlwürfen den Ablauf beibehalten."
    ],
    "repetitions": "4 Serien à 5 Freiwürfe.",
    "successIndicator": "Trefferquote und eingehaltene Routinen separat zählen.",
    "steps": [
      "Vor jedem Wurf denselben Ablauf aus Atmung, Blick und Dribblings nutzen.",
      "Nach dem Wurf bewusst neu aufstellen."
    ],
    "variants": [
      {
        "id": "catalog-ft-routine-1",
        "name": "Freiwurf-Routine · Eigener Rhythmus",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Eigener Rhythmus“: Eine feste Anzahl Dribblings wählen und jeden Wurf damit beginnen."
      },
      {
        "id": "catalog-ft-routine-2",
        "name": "Freiwurf-Routine · Routine ansagen",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Routine ansagen“: Partner hört vor jedem Wurf die drei persönlichen Vorbereitungsschritte und beobachtet ihre Umsetzung."
      },
      {
        "id": "catalog-ft-routine-3",
        "name": "Freiwurf-Routine · Unterbrechung",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Unterbrechung“: Partner gibt den Ball mit wechselnder Wartezeit zurück; erst nach Empfang die eigene Routine starten."
      },
      {
        "id": "catalog-ft-routine-4",
        "name": "Freiwurf-Routine · Spielpause",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Spielpause“: Nach jedem Wurf eine kurze Spielsituation besprechen, dann ohne Zusatzritual wieder in die Routine finden."
      }
    ]
  },
  {
    "familyId": "ft-series",
    "familyName": "Freiwurf-Serien",
    "category": "Freiwürfe",
    "minutes": 8,
    "goal": "Konstanz über mehrere kurze Serien vergleichen.",
    "setup": "Freiwurflinie und eine einfache Ergebnistabelle.",
    "coachingPoints": [
      "Nicht nach jedem Fehlwurf die Technik wechseln.",
      "Gleiche Startbedingungen beibehalten."
    ],
    "repetitions": "5 Serien à 4 Würfe mit 30 Sekunden Pause.",
    "successIndicator": "Treffer pro Serie und Gesamtquote erfassen.",
    "steps": [
      "Mit der eigenen Routine werfen.",
      "Ergebnisse nach jeder kurzen Serie notieren."
    ],
    "variants": [
      {
        "id": "catalog-ft-series-1",
        "name": "Freiwurf-Serien · Viererblöcke",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Viererblöcke“: Jeden Viererblock vollständig beenden und anschließend die Quote eintragen."
      },
      {
        "id": "catalog-ft-series-2",
        "name": "Freiwurf-Serien · Zweierpaare",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zweierpaare“: Die Würfe in Spielpaare aufteilen; ersten und zweiten Wurf getrennt zählen."
      },
      {
        "id": "catalog-ft-series-3",
        "name": "Freiwurf-Serien · Wechselnde Schützen",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Wechselnde Schützen“: Nach je zwei Würfen wechseln, sodass zwischen den Paaren eine natürliche Pause entsteht."
      },
      {
        "id": "catalog-ft-series-4",
        "name": "Freiwurf-Serien · Individuelles Serienziel",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Individuelles Serienziel“: Vor jeder Serie ein realistisches Trefferziel festlegen und danach Ziel und Ergebnis vergleichen."
      }
    ]
  },
  {
    "familyId": "ft-partner",
    "familyName": "Freiwurf mit Partnerauftrag",
    "category": "Freiwürfe",
    "minutes": 8,
    "goal": "Eine konkrete Beobachtung in die Wurfroutine einbauen.",
    "setup": "Zwei Spieler pro Korb, einer wirft, einer reboundet.",
    "coachingPoints": [
      "Nur einen Hinweis je Serie geben.",
      "Beobachtung beschreiben, nicht mehrere Technikänderungen verlangen."
    ],
    "repetitions": "Je Spieler 3 Serien à 6 Würfe.",
    "successIndicator": "Treffer und Erfüllung des Beobachtungspunkts notieren.",
    "steps": [
      "Schütze führt seine Routine aus.",
      "Partner beobachtet nur den vorher vereinbarten Punkt."
    ],
    "variants": [
      {
        "id": "catalog-ft-partner-1",
        "name": "Freiwurf mit Partnerauftrag · Balance beobachten",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Balance beobachten“: Partner kontrolliert, ob der Schütze nach der Landung ruhig stehen bleibt."
      },
      {
        "id": "catalog-ft-partner-2",
        "name": "Freiwurf mit Partnerauftrag · Führhand beobachten",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Führhand beobachten“: Partner schaut nur auf die Führhand und meldet seitliches Mitdrücken zurück."
      },
      {
        "id": "catalog-ft-partner-3",
        "name": "Freiwurf mit Partnerauftrag · Routine prüfen",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Routine prüfen“: Partner zählt, wie oft die vereinbarte Vorbereitung unverändert bleibt."
      },
      {
        "id": "catalog-ft-partner-4",
        "name": "Freiwurf mit Partnerauftrag · Selbst- und Fremdbild",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Selbst- und Fremdbild“: Schütze bewertet nach der Serie zuerst selbst den gewählten Punkt, dann ergänzt der Partner seine Beobachtung."
      }
    ]
  },
  {
    "familyId": "ft-game",
    "familyName": "Freiwürfe im Spielkontext",
    "category": "Freiwürfe",
    "minutes": 8,
    "goal": "Nach einer vorherigen Aktion ruhig zum Freiwurf kommen.",
    "setup": "Ein Korb; die Laufstrecke neben der Zone freihalten.",
    "coachingPoints": [
      "Vor dem Wurf ausreichend Zeit zum Ordnen nehmen.",
      "Belastung nicht als Strafe einsetzen."
    ],
    "repetitions": "4 Durchgänge mit je zwei Freiwürfen und mindestens 30 Sekunden Pause.",
    "successIndicator": "Quote nach der Aktion mit einer ruhigen Ausgangsserie vergleichen.",
    "steps": [
      "Eine kurze Basketballaktion abschließen.",
      "Danach zur Linie gehen und zwei Freiwürfe mit Routine werfen."
    ],
    "variants": [
      {
        "id": "catalog-ft-game-1",
        "name": "Freiwürfe im Spielkontext · Nach dem Korbleger",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Nach dem Korbleger“: Einen kontrollierten Korbleger ausführen, Rebound holen und anschließend zwei Freiwürfe nehmen."
      },
      {
        "id": "catalog-ft-game-2",
        "name": "Freiwürfe im Spielkontext · Nach dem Closeout",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Nach dem Closeout“: Einen kurzen Closeout ohne Sprung ausführen; Partner gibt danach den Ball an der Linie."
      },
      {
        "id": "catalog-ft-game-3",
        "name": "Freiwürfe im Spielkontext · Nach einem 1-gegen-1",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Nach einem 1-gegen-1“: Eine kurze 1-gegen-1-Aktion beenden; Angreifer geht anschließend zur Freiwurflinie."
      },
      {
        "id": "catalog-ft-game-4",
        "name": "Freiwürfe im Spielkontext · Letzte Spielminute",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Letzte Spielminute“: Vor jedem Paar einen engen Spielstand nennen; danach bewerten, ob die Routine trotz des Szenarios gleich blieb."
      }
    ]
  },
  {
    "familyId": "ft-ladder",
    "familyName": "Freiwurf-Zielleiter",
    "category": "Freiwürfe",
    "minutes": 8,
    "goal": "Ein passendes Trainingsziel ohne endlose Wiederholungen setzen.",
    "setup": "Ein Korb und feste Obergrenze für Versuche.",
    "coachingPoints": [
      "Ziel an bisherige Quote anpassen.",
      "Die vereinbarte Versuchszahl nicht unbegrenzt verlängern."
    ],
    "repetitions": "4 Serien à 5 Versuche; maximal 20 Würfe.",
    "successIndicator": "Erreichte Zielstufen und Trefferquote erfassen.",
    "steps": [
      "Treffer nach jeder Serie eintragen.",
      "Schwierigkeit nur zwischen den Serien verändern."
    ],
    "variants": [
      {
        "id": "catalog-ft-ladder-1",
        "name": "Freiwurf-Zielleiter · Persönliche Ausgangsstufe",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Persönliche Ausgangsstufe“: Mit einem erreichbaren Ziel starten, beispielsweise zwei Treffer aus fünf; danach selbst passend anpassen."
      },
      {
        "id": "catalog-ft-ladder-2",
        "name": "Freiwurf-Zielleiter · Plus-eins-Stufe",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Plus-eins-Stufe“: Nach erreichtem Ziel die nächste Serie um einen erforderlichen Treffer erhöhen."
      },
      {
        "id": "catalog-ft-ladder-3",
        "name": "Freiwurf-Zielleiter · Partnerziel",
        "playersMin": 2,
        "playersMax": 8,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Partnerziel“: Beide Spieler wählen unterschiedliche persönliche Ziele; gemeinsam erfüllte Serien zählen."
      },
      {
        "id": "catalog-ft-ladder-4",
        "name": "Freiwurf-Zielleiter · Erster Wurf zählt",
        "playersMin": 1,
        "playersMax": 8,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Erster Wurf zählt“: In jeder Serie den ersten Freiwurf besonders kennzeichnen und dessen Quote separat verfolgen."
      }
    ]
  },
  {
    "familyId": "target-pass",
    "familyName": "Zielgenau passen",
    "category": "Passen und Fangen",
    "minutes": 8,
    "goal": "Einen klaren Fangpunkt sicher treffen.",
    "setup": "Zielmarkierung an einer geeigneten freien Wand oder Partner mit Fanghänden.",
    "coachingPoints": [
      "Mit beiden Händen zum Ball fangen.",
      "Pässe nicht auf den Kopf zielen."
    ],
    "repetitions": "3 Serien à 12 Pässe.",
    "successIndicator": "Treffer im Fangfenster und sichere Fänge zählen.",
    "steps": [
      "Zum Ziel ausrichten.",
      "Pass ausführen, Rückball kontrollieren und neu vorbereiten."
    ],
    "variants": [
      {
        "id": "catalog-target-pass-1",
        "name": "Zielgenau passen · Wandfenster",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Wand"
        ],
        "task": "Variante „Wandfenster“: Aus zwei bis drei Metern ein markiertes Brusthöhenfenster anspielen."
      },
      {
        "id": "catalog-target-pass-2",
        "name": "Zielgenau passen · Partnerfenster",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Partnerfenster“: Partner zeigt vor jedem Pass die Fanghände an einer leicht anderen Position."
      },
      {
        "id": "catalog-target-pass-3",
        "name": "Zielgenau passen · Schritt zum Pass",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Schritt zum Pass“: Mit einem Schritt seitlich aus der gedachten Verteidigungslinie passen."
      },
      {
        "id": "catalog-target-pass-4",
        "name": "Zielgenau passen · Freies Fenster",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Freies Fenster“: Ein passiver Verteidiger hält ein Fangfenster zu; den anderen sichtbaren Fangpunkt wählen."
      }
    ]
  },
  {
    "familyId": "chest-bounce",
    "familyName": "Brust- und Bodenpass",
    "category": "Passen und Fangen",
    "minutes": 8,
    "goal": "Die Passart zur freien Linie wählen.",
    "setup": "Partner stehen sich mit genügend Bodenfläche gegenüber.",
    "coachingPoints": [
      "Bodenpass so aufsetzen, dass der Ball am Partner aufsteigt.",
      "Pass nicht unnötig hoch oder hart spielen."
    ],
    "repetitions": "3 Runden à 10 Passpaare.",
    "successIndicator": "Pässe zählen, die ohne Nachlaufen gefangen werden.",
    "steps": [
      "Fanghände zeigen.",
      "Kontrolliert passen und nach dem Fang die nächste Passart vorbereiten."
    ],
    "variants": [
      {
        "id": "catalog-chest-bounce-1",
        "name": "Brust- und Bodenpass · Fester Brustpass",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Fester Brustpass“: Nur direkte Pässe auf Brusthöhe spielen und nach jedem Fang kurz stabil stehen."
      },
      {
        "id": "catalog-chest-bounce-2",
        "name": "Brust- und Bodenpass · Fester Bodenpass",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Fester Bodenpass“: Nur Bodenpässe spielen und den Aufsetzpunkt gemeinsam korrigieren."
      },
      {
        "id": "catalog-chest-bounce-3",
        "name": "Brust- und Bodenpass · Signalwechsel",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Signalwechsel“: Empfänger zeigt oben oder unten; dazu passend Brust- oder Bodenpass wählen."
      },
      {
        "id": "catalog-chest-bounce-4",
        "name": "Brust- und Bodenpass · Passweg lesen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Passweg lesen“: Dritter Spieler sperrt passiv die hohe oder tiefe Linie; offene Passart erkennen."
      }
    ]
  },
  {
    "familyId": "one-hand-pass",
    "familyName": "Einhändiger Pass",
    "category": "Passen und Fangen",
    "minutes": 8,
    "goal": "Aus dem Dribbling seitlich oder direkt passen.",
    "setup": "Zwei gegenüberliegende Positionen, etwa vier Meter Abstand.",
    "coachingPoints": [
      "Körper zum Ziel ausrichten.",
      "Handgelenk beendet den Pass, nicht nur die Schulter."
    ],
    "repetitions": "Je 10 Pässe mit jeder Hand, danach Rollenwechsel.",
    "successIndicator": "Zielgenaue Pässe ohne zusätzliche Ballkorrektur zählen.",
    "steps": [
      "Mit einer Hand kontrolliert dribbeln.",
      "Ohne unnötiges Nachgreifen zur Zielhand des Partners passen."
    ],
    "variants": [
      {
        "id": "catalog-one-hand-pass-1",
        "name": "Einhändiger Pass · Druckpass aus Stand",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Druckpass aus Stand“: Ball seitlich halten und mit einem kleinen Schritt zur Fanghand passen."
      },
      {
        "id": "catalog-one-hand-pass-2",
        "name": "Einhändiger Pass · Pass nach Dribbling",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Pass nach Dribbling“: Nach drei Dribblings mit derselben Hand zum Partner passen."
      },
      {
        "id": "catalog-one-hand-pass-3",
        "name": "Einhändiger Pass · Hook-Pass seitlich",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Hook-Pass seitlich“: Seitlich an einer gedachten Verteidigerposition vorbeipassen; Wurfbewegung kompakt halten."
      },
      {
        "id": "catalog-one-hand-pass-4",
        "name": "Einhändiger Pass · Richtungsentscheidung",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Richtungsentscheidung“: Zwei Empfänger zeigen abwechselnd die Hände; direkt aus dem Dribbling zum bereiten Empfänger passen."
      }
    ]
  },
  {
    "familyId": "overhead",
    "familyName": "Überkopfpass",
    "category": "Passen und Fangen",
    "minutes": 8,
    "goal": "Über eine geschlossene untere Passlinie spielen.",
    "setup": "Zwei Positionen mit ausreichend Abstand, Ball oberhalb der Stirn.",
    "coachingPoints": [
      "Ball nicht weit hinter den Kopf nehmen.",
      "Empfänger früh mit Blickkontakt ankündigen."
    ],
    "repetitions": "3 Serien à 10 Pässe.",
    "successIndicator": "Fangbare Pässe ohne überhöhte Flugbahn zählen.",
    "steps": [
      "Ziel sehen und Ball sicher über dem Kopf halten.",
      "Mit Schritt und Armstreckung in das Fangfenster passen."
    ],
    "variants": [
      {
        "id": "catalog-overhead-1",
        "name": "Überkopfpass · Fester Partner",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Fester Partner“: Aus dem Stand über Kopf passen, Partner fängt mit zwei Händen."
      },
      {
        "id": "catalog-overhead-2",
        "name": "Überkopfpass · Pass nach Pivot",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Pass nach Pivot“: Nach dem Fang einen Pivot ausführen und erst dann die freie Passlinie nutzen."
      },
      {
        "id": "catalog-overhead-3",
        "name": "Überkopfpass · Über passive Arme",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Über passive Arme“: Ein Verteidiger hält die Arme mittig; seitlich versetzen und kontrolliert über die freie Schulterlinie passen."
      },
      {
        "id": "catalog-overhead-4",
        "name": "Überkopfpass · Outlet-Ziel",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Outlet-Ziel“: Zwei Empfänger bewegen sich seitlich; vor dem Pass den freien Spieler erkennen und anspielen."
      }
    ]
  },
  {
    "familyId": "passing-run",
    "familyName": "Passen im Lauf",
    "category": "Passen und Fangen",
    "minutes": 8,
    "goal": "Ball und Laufgeschwindigkeit aufeinander abstimmen.",
    "setup": "Freie Längsbahn; Rückweg außerhalb der Laufbahn.",
    "coachingPoints": [
      "Pass in den Lauf und nicht hinter den Körper.",
      "Nach dem Pass weiterlaufen."
    ],
    "repetitions": "6 Bahnen mit Rückwegpause.",
    "successIndicator": "Pässe ohne Laufunterbrechung und Ballverluste erfassen.",
    "steps": [
      "Parallel oder versetzt nach vorne laufen.",
      "Vor den Mitspieler passen, sodass er den Ball ohne Stopp erreicht."
    ],
    "variants": [
      {
        "id": "catalog-passing-run-1",
        "name": "Passen im Lauf · Zweierbahn",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Zweierbahn“: Zwei Spieler laufen nebeneinander und passen ohne Dribbling hin und her."
      },
      {
        "id": "catalog-passing-run-2",
        "name": "Passen im Lauf · Dreierbahn",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Dreierbahn“: Mittlerer Spieler verteilt abwechselnd nach außen und erhält den Rückpass."
      },
      {
        "id": "catalog-passing-run-3",
        "name": "Passen im Lauf · Pass und Spurwechsel",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Pass und Spurwechsel“: Nach jedem Pass hinter dem Empfänger die Laufspur wechseln; Wege vorher langsam zeigen."
      },
      {
        "id": "catalog-passing-run-4",
        "name": "Passen im Lauf · Verteidigtes Passfenster",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Verteidigtes Passfenster“: Ein Verteidiger bewegt sich zwischen zwei Angreifern; Angreifer verändern Abstand und Passwinkel."
      }
    ]
  },
  {
    "familyId": "pivot",
    "familyName": "Pivot und Ballschutz",
    "category": "Fußarbeit und Ballaufnahme",
    "minutes": 7,
    "goal": "Das Standbein behalten und freie Passrichtungen finden.",
    "setup": "Markierter Standpunkt, ein Ball pro Spieler.",
    "coachingPoints": [
      "Standfuß nicht versetzen.",
      "Ball außerhalb der Reichweite eines gedachten Gegners halten."
    ],
    "repetitions": "Je 8 Vorwärts- und Rückwärtspivots pro Standbein.",
    "successIndicator": "Schrittfehler und stabile Endpositionen zählen.",
    "steps": [
      "Ball sicher fangen und das Standbein festlegen.",
      "Um dieses Bein drehen und danach kontrolliert passen oder neu starten."
    ],
    "variants": [
      {
        "id": "catalog-pivot-1",
        "name": "Pivot und Ballschutz · Vierteldrehung",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Vierteldrehung“: Um jeweils eine Vierteldrehung zu vier gedachten Passrichtungen schwenken."
      },
      {
        "id": "catalog-pivot-2",
        "name": "Pivot und Ballschutz · Rückwärtspivot",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Rückwärtspivot“: Den Rücken als Schutz nutzen und kontrolliert um das Standbein nach hinten öffnen."
      },
      {
        "id": "catalog-pivot-3",
        "name": "Pivot und Ballschutz · Partnerziel",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Partnerziel“: Partner verändert seitlich das Passziel; passende Pivotrichtung wählen und passen."
      },
      {
        "id": "catalog-pivot-4",
        "name": "Pivot und Ballschutz · Druck und Ausweg",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Druck und Ausweg“: Ein Verteidiger übt dosierten Druck aus, ein Empfänger bietet sich an; ohne Standfußfehler passen."
      }
    ]
  },
  {
    "familyId": "jab",
    "familyName": "Jabstep und Antritt",
    "category": "Fußarbeit und Ballaufnahme",
    "minutes": 7,
    "goal": "Eine Richtung glaubhaft andeuten und die andere angreifen.",
    "setup": "Start in Ballbesitz vor einer Markierung.",
    "coachingPoints": [
      "Standbein bis zur Ballfreigabe beachten.",
      "Täuschung kurz halten, nicht nach vorne fallen."
    ],
    "repetitions": "Je 6 Aktionen pro Täuschrichtung.",
    "successIndicator": "Schrittfehlerfreie Starts und glaubhafte Körperbewegungen beobachten.",
    "steps": [
      "Aus einer stabilen Position einen kurzen Täuschschritt setzen.",
      "Den Ball regelgerecht zum ersten Dribbling freigeben und antreten."
    ],
    "variants": [
      {
        "id": "catalog-jab-1",
        "name": "Jabstep und Antritt · Täuschung zurücksetzen",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Täuschung zurücksetzen“: Jabstep zeigen, kontrolliert in die Ausgangsposition zurückkehren und erst dann starten."
      },
      {
        "id": "catalog-jab-2",
        "name": "Jabstep und Antritt · Gegenseite angreifen",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Gegenseite angreifen“: Nach dem Jabstep mit dem ersten Dribbling zur anderen Seite antreten."
      },
      {
        "id": "catalog-jab-3",
        "name": "Jabstep und Antritt · Gleiche Seite angreifen",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Gleiche Seite angreifen“: Die Verteidigung mit dem Jabstep zurückdrängen und anschließend auf derselben Seite starten."
      },
      {
        "id": "catalog-jab-4",
        "name": "Jabstep und Antritt · Verteidigerreaktion",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Verteidigerreaktion“: Partner reagiert passiv mit einem Fuß; die tatsächlich offene Seite angreifen."
      }
    ]
  },
  {
    "familyId": "jump-stop",
    "familyName": "Sprungstopp",
    "category": "Fußarbeit und Ballaufnahme",
    "minutes": 7,
    "goal": "Aus Bewegung beidbeinig stabil zum Stehen kommen.",
    "setup": "Freie Bahn mit Start- und Stoppmarkierung.",
    "coachingPoints": [
      "Leise und weich landen.",
      "Nach dem Stopp den Blick nach vorne richten."
    ],
    "repetitions": "3 Serien à 6 Stopps.",
    "successIndicator": "Ruhige Endpositionen ohne Nachhüpfen zählen.",
    "steps": [
      "Kontrolliert anlaufen.",
      "An der Markierung beidbeinig landen, Balance halten und Ball sichern."
    ],
    "variants": [
      {
        "id": "catalog-jump-stop-1",
        "name": "Sprungstopp · Ohne Ball",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ohne Ball“: Mit kurzem Anlauf stoppen und die Endposition zwei Sekunden halten."
      },
      {
        "id": "catalog-jump-stop-2",
        "name": "Sprungstopp · Mit Dribbling",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Mit Dribbling“: Ball beim letzten Dribbling aufnehmen und mit beiden Füßen gleichzeitig stoppen."
      },
      {
        "id": "catalog-jump-stop-3",
        "name": "Sprungstopp · Fang im Stopp",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Fang im Stopp“: Partner passt kurz vor der Markierung; Fang und Landung koordinieren."
      },
      {
        "id": "catalog-jump-stop-4",
        "name": "Sprungstopp · Stopp mit Entscheidung",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Stopp mit Entscheidung“: Partner zeigt nach dem Fang links oder rechts; erst stabil stoppen, dann zu dieser Seite pivotieren."
      }
    ]
  },
  {
    "familyId": "stride-stop",
    "familyName": "Schrittstopp",
    "category": "Fußarbeit und Ballaufnahme",
    "minutes": 7,
    "goal": "Nacheinander gesetzte Füße für eine stabile Ballaufnahme nutzen.",
    "setup": "Eine Stoppmarkierung, genügend Auslauf.",
    "coachingPoints": [
      "Erster Bodenkontakt bestimmt die weitere Fußarbeit.",
      "Schrittlänge zum Tempo passend verkürzen."
    ],
    "repetitions": "Je 6 Wiederholungen mit links und rechts als erstem Fuß.",
    "successIndicator": "Stabile Reihenfolge und anschließende regelgerechte Aktionen zählen.",
    "steps": [
      "Anlaufen und die Füße kontrolliert nacheinander aufsetzen.",
      "Ball sichern und ausbalanciert in der Endposition bleiben."
    ],
    "variants": [
      {
        "id": "catalog-stride-stop-1",
        "name": "Schrittstopp · Gehender Rhythmus",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Gehender Rhythmus“: Ohne Ball langsam in den Schrittstopp gehen und den ersten Fuß laut benennen."
      },
      {
        "id": "catalog-stride-stop-2",
        "name": "Schrittstopp · Aus dem Dribbling",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Aus dem Dribbling“: Ball aufnehmen und mit der vorher vereinbarten Fußfolge stoppen."
      },
      {
        "id": "catalog-stride-stop-3",
        "name": "Schrittstopp · Pass in den Stopp",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Pass in den Stopp“: Partner passt aus seitlicher Position; Fangzeitpunkt mit den Füßen abstimmen."
      },
      {
        "id": "catalog-stride-stop-4",
        "name": "Schrittstopp · Pivot nach Fang",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Pivot nach Fang“: Nach dem Pass den ersten Landefuß als Standbein nutzen und zum Partner zurückpassen."
      }
    ]
  },
  {
    "familyId": "rip-through",
    "familyName": "Ball durch die freie Seite",
    "category": "Fußarbeit und Ballaufnahme",
    "minutes": 7,
    "goal": "Den Ball nach Fang aus einer Druckzone herausführen.",
    "setup": "Flügelmarkierung und zwei seitliche Ausgangstore.",
    "coachingPoints": [
      "Ellbogen nicht gegen einen Gegner schwingen.",
      "Ball und Fußarbeit zusammen vorbereiten."
    ],
    "repetitions": "Je 6 Aktionen pro Ausgang.",
    "successIndicator": "Ballverluste und regelgerechte erste Schritte erfassen.",
    "steps": [
      "Ball mit zwei Händen fangen.",
      "Ball eng durch die freie Seite führen und einen legalen ersten Schritt setzen."
    ],
    "variants": [
      {
        "id": "catalog-rip-through-1",
        "name": "Ball durch die freie Seite · Tiefer Ballweg",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Tiefer Ballweg“: Ball unter Hüfthöhe von einer Körperseite zur anderen führen, dann starten."
      },
      {
        "id": "catalog-rip-through-2",
        "name": "Ball durch die freie Seite · Hoher Ballweg",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Hoher Ballweg“: Ball über Stirnhöhe auf die freie Seite bringen; Ellbogen kontrolliert halten."
      },
      {
        "id": "catalog-rip-through-3",
        "name": "Ball durch die freie Seite · Fang und Drive",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Fang und Drive“: Partner passt zum Flügel; unmittelbar den freien Ausgang angreifen."
      },
      {
        "id": "catalog-rip-through-4",
        "name": "Ball durch die freie Seite · Druckhand lesen",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Druckhand lesen“: Partner zeigt mit einer Hand einen geschlossenen Ballweg; anderen Ballweg wählen, ohne Kontakt zu suchen."
      }
    ]
  },
  {
    "familyId": "v-cut",
    "familyName": "V-Cut zum Ball",
    "category": "Freilaufen ohne Ball",
    "minutes": 9,
    "goal": "Durch Richtungswechsel einen sicheren Anspielwinkel schaffen.",
    "setup": "Flügelposition und tiefere Markierung, Passgeber oben.",
    "coachingPoints": [
      "Vor dem Richtungswechsel Tempo senken.",
      "Den neuen Weg mit einem klaren Antritt öffnen."
    ],
    "repetitions": "Je 6 Ballannahmen pro Seite.",
    "successIndicator": "Fänge in freier Passlinie ohne Stehenbleiben zählen.",
    "steps": [
      "Zuerst vom Ball weg bewegen.",
      "Deutlich die Richtung ändern und mit sichtbaren Fanghänden zum Ball kommen."
    ],
    "variants": [
      {
        "id": "catalog-v-cut-1",
        "name": "V-Cut zum Ball · V ohne Gegner",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „V ohne Gegner“: An der tiefen Markierung abstoppen und schräg zum Passgeber herauslaufen."
      },
      {
        "id": "catalog-v-cut-2",
        "name": "V-Cut zum Ball · Fang mit Ausrichtung",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Fang mit Ausrichtung“: Nach dem Fang sofort zum Korb ausrichten und eine Angriffsposition einnehmen."
      },
      {
        "id": "catalog-v-cut-3",
        "name": "V-Cut zum Ball · Passive Denial",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Passive Denial“: Verteidiger steht in der direkten Passlinie; Abstand verändern und dann mit V-Cut öffnen."
      },
      {
        "id": "catalog-v-cut-4",
        "name": "V-Cut zum Ball · V oder Hintertür",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „V oder Hintertür“: Verteidiger entscheidet zwischen Abstand und enger Passverweigerung; entsprechend heraus- oder zum Korb schneiden."
      }
    ]
  },
  {
    "familyId": "backdoor",
    "familyName": "Backdoor-Cut",
    "category": "Freilaufen ohne Ball",
    "minutes": 9,
    "goal": "Eine übertriebene Passverweigerung hinterlaufen.",
    "setup": "Passgeber oben, Läufer am Flügel; Korbraum frei.",
    "coachingPoints": [
      "Blickkontakt vor dem Cut herstellen.",
      "Pass früh in den freien Laufweg spielen."
    ],
    "repetitions": "Je 6 Aktionen pro Seite.",
    "successIndicator": "Richtig erkannte Passverweigerungen und sichere Abschlüsse zählen.",
    "steps": [
      "Kurz zum Ball anbieten.",
      "Bei geschlossener Passlinie scharf hinter dem Verteidiger zum Korb schneiden."
    ],
    "variants": [
      {
        "id": "catalog-backdoor-1",
        "name": "Backdoor-Cut · Signal-Cut",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Signal-Cut“: Passgeber zeigt die Hand; Läufer startet daraufhin zum Korb."
      },
      {
        "id": "catalog-backdoor-2",
        "name": "Backdoor-Cut · Bodenpass in den Lauf",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Bodenpass in den Lauf“: Den Rückpass als Bodenpass in den freien Raum vor dem Läufer spielen."
      },
      {
        "id": "catalog-backdoor-3",
        "name": "Backdoor-Cut · Denial-Verteidiger",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Denial-Verteidiger“: Verteidiger nimmt sichtbar die obere Passlinie weg; Läufer startet hinter seinem Rücken."
      },
      {
        "id": "catalog-backdoor-4",
        "name": "Backdoor-Cut · Offene Entscheidung",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Offene Entscheidung“: Verteidiger darf Ballseite oder Korbseite schützen; Läufer entscheidet zwischen Anbieten und Backdoor."
      }
    ]
  },
  {
    "familyId": "give-go",
    "familyName": "Give-and-go",
    "category": "Freilaufen ohne Ball",
    "minutes": 9,
    "goal": "Nach dem Pass sofort selbst zum Ziel laufen.",
    "setup": "Zwei Außenpositionen, freier Weg zum Korb.",
    "coachingPoints": [
      "Nach dem Pass nicht stehen bleiben.",
      "Rückpass vor den Laufweg spielen."
    ],
    "repetitions": "3 Serien à 4 Aktionen pro Spieler.",
    "successIndicator": "Pässe und Cuts ohne Unterbrechung verbinden.",
    "steps": [
      "Passen und den eigenen Gegenspieler gedanklich hinter sich lassen.",
      "Zum Korb schneiden und den Rückpass kontrolliert abschließen."
    ],
    "variants": [
      {
        "id": "catalog-give-go-1",
        "name": "Give-and-go · Direkter Rückpass",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Direkter Rückpass“: Pass, direkter Cut und Rückpass ohne Verteidigung."
      },
      {
        "id": "catalog-give-go-2",
        "name": "Give-and-go · Gegenschritt",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Gegenschritt“: Nach dem Pass zuerst kurz wegtreten, dann am gedachten Verteidiger vorbei schneiden."
      },
      {
        "id": "catalog-give-go-3",
        "name": "Give-and-go · Passverteidiger",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Passverteidiger“: Ein Verteidiger schützt zunächst den Ball; Cutter nutzt den Moment des Blickwechsels."
      },
      {
        "id": "catalog-give-go-4",
        "name": "Give-and-go · Zwei-gegen-zwei",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Zwei-gegen-zwei“: Nach jedem Pass ist ein Cut Pflicht; den Rückpass nur bei tatsächlich freier Linie spielen."
      }
    ]
  },
  {
    "familyId": "l-cut",
    "familyName": "L-Cut und Auffüllen",
    "category": "Freilaufen ohne Ball",
    "minutes": 9,
    "goal": "Einen freien Außenplatz mit klarer Laufroute besetzen.",
    "setup": "Tiefe und hohe Außenposition mit Hütchen markieren.",
    "coachingPoints": [
      "Beim Abknicken den Körper tief halten.",
      "Neue Position mit Abstand zu Mitspielern wählen."
    ],
    "repetitions": "Je 6 Cuts pro Seite.",
    "successIndicator": "Freie Fänge und passende Abstände beobachten.",
    "steps": [
      "Entlang der ersten Linie laufen.",
      "Im rechten Winkel beschleunigen und am freien Platz anspielbereit werden."
    ],
    "variants": [
      {
        "id": "catalog-l-cut-1",
        "name": "L-Cut und Auffüllen · L zur Flügelposition",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „L zur Flügelposition“: Von der tiefen Position gerade hoch und dann seitlich in den Pass laufen."
      },
      {
        "id": "catalog-l-cut-2",
        "name": "L-Cut und Auffüllen · L nach Pass",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „L nach Pass“: Zuerst passen, den Platz verlassen und über einen L-Lauf neu anbieten."
      },
      {
        "id": "catalog-l-cut-3",
        "name": "L-Cut und Auffüllen · Auffüllen zu dritt",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Auffüllen zu dritt“: Ein Spieler cuttet zum Korb, der nächste füllt über den L-Lauf den freien Außenplatz."
      },
      {
        "id": "catalog-l-cut-4",
        "name": "L-Cut und Auffüllen · Verfolgter L-Cut",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Verfolgter L-Cut“: Verteidiger folgt kontrolliert; den Richtungswechsel nutzen, um ein kurzes Passfenster zu öffnen."
      }
    ]
  },
  {
    "familyId": "offball-screen",
    "familyName": "Indirekten Block lesen",
    "category": "Freilaufen ohne Ball",
    "minutes": 9,
    "goal": "Laufweg um einen stationären Block an die Defense anpassen.",
    "setup": "Passgeber, Blocker und Läufer an drei markierten Positionen.",
    "coachingPoints": [
      "Blocker nicht in den Verteidiger hineinschieben.",
      "Blick vor dem Block auf Ball und Verfolger richten."
    ],
    "repetitions": "Je 5 Aktionen pro Rolle, danach wechseln.",
    "successIndicator": "Passende Entscheidung und regelgerechte Blocks zählen.",
    "steps": [
      "Blocker steht rechtzeitig stabil und regelgerecht.",
      "Läufer kommt eng am Block vorbei und öffnet sich zum Ball."
    ],
    "variants": [
      {
        "id": "catalog-offball-screen-1",
        "name": "Indirekten Block lesen · Gerader Ausgang",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Gerader Ausgang“: Ohne Verteidigung gerade am Block vorbeilaufen und den Pass am Flügel erhalten."
      },
      {
        "id": "catalog-offball-screen-2",
        "name": "Indirekten Block lesen · Curl bei Verfolgung",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Curl bei Verfolgung“: Verteidiger folgt außen hinterher; Läufer biegt zum Korb ein."
      },
      {
        "id": "catalog-offball-screen-3",
        "name": "Indirekten Block lesen · Fade bei Abkürzung",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Fade bei Abkürzung“: Verteidiger kürzt innen ab; Läufer setzt sich vom Block weg in freien Wurfraum ab."
      },
      {
        "id": "catalog-offball-screen-4",
        "name": "Indirekten Block lesen · Offenes Lesen",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Offenes Lesen“: Verteidiger wählt Verfolgen oder Abkürzen; Läufer entscheidet und Passgeber wartet auf die freie Linie."
      }
    ]
  },
  {
    "familyId": "pnr-handler",
    "familyName": "Ballhandler am Block",
    "category": "Pick-and-roll",
    "minutes": 12,
    "goal": "Den Winkel des Blocks nutzen und den nächsten Vorteil erkennen.",
    "setup": "Ballhandler oben, stationärer Blocker am Flügel oder Hütchen als Blocksymbol.",
    "coachingPoints": [
      "Block erst nutzen, wenn er steht.",
      "Kopf beim Dribbling oben halten."
    ],
    "repetitions": "Je 6 Aktionen über beide Seiten.",
    "successIndicator": "Eng genutzte Blocks und begründete Anschlussentscheidungen zählen.",
    "steps": [
      "Verteidiger gedanklich zum Block führen.",
      "Eng am Block vorbeidribbeln und danach die freie Anschlussaktion wählen."
    ],
    "variants": [
      {
        "id": "catalog-pnr-handler-1",
        "name": "Ballhandler am Block · Hütchenwinkel",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Hütchenwinkel“: Mit einem Hütchen den Block simulieren; eng vorbeigehen und aus sicherer Distanz abschließen."
      },
      {
        "id": "catalog-pnr-handler-2",
        "name": "Ballhandler am Block · Block und Pocket-Pass",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Block und Pocket-Pass“: Ein Mitspieler stellt den Block und rollt; Bodenpass in sein freies Fangfenster spielen."
      },
      {
        "id": "catalog-pnr-handler-3",
        "name": "Ballhandler am Block · Drop-Verteidiger",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drop-Verteidiger“: Ein Verteidiger steht tiefer; zwischen freiem Pull-up und Pass zum Roller entscheiden."
      },
      {
        "id": "catalog-pnr-handler-4",
        "name": "Ballhandler am Block · Zwei Verteidiger",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei Verteidiger“: Live zwei gegen zwei spielen; Ballhandler darf stoppen, passen oder weiterziehen, abhängig vom freien Raum."
      }
    ]
  },
  {
    "familyId": "pnr-roll",
    "familyName": "Abrollen nach dem Block",
    "category": "Pick-and-roll",
    "minutes": 12,
    "goal": "Blockkontakt nicht erzwingen und rechtzeitig zum Korb öffnen.",
    "setup": "Ballhandler und Blocker oben; Passweg zum Korb freihalten.",
    "coachingPoints": [
      "Vor dem Abrollen kurz den Ball sehen.",
      "Nicht zu früh aus dem Block lösen."
    ],
    "repetitions": "Je 6 Aktionen pro Rolle.",
    "successIndicator": "Fänge vor dem Körper und klare Rollwege zählen.",
    "steps": [
      "Einen stabilen Block setzen.",
      "Nach Nutzung zum Ball aufdrehen und mit sichtbaren Händen zum Korb gehen."
    ],
    "variants": [
      {
        "id": "catalog-pnr-roll-1",
        "name": "Abrollen nach dem Block · Roll ohne Gegner",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Roll ohne Gegner“: Ballhandler nutzt den Block und spielt den Pass in den Lauf des Rollers."
      },
      {
        "id": "catalog-pnr-roll-2",
        "name": "Abrollen nach dem Block · Verzögerter Roll",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Verzögerter Roll“: Blocker hält die Position einen Moment länger und rollt erst nach dem zweiten Dribbling."
      },
      {
        "id": "catalog-pnr-roll-3",
        "name": "Abrollen nach dem Block · Seal nach Wechsel",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Seal nach Wechsel“: Ein passiver Verteidiger wechselt auf den Roller; Roller sichert vor dem Pass eine Innenposition."
      },
      {
        "id": "catalog-pnr-roll-4",
        "name": "Abrollen nach dem Block · Roll oder Pop",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Roll oder Pop“: Verteidiger schützt die Zone oder bleibt außen; Blocker entscheidet zwischen Abrollen und freiem Außenplatz."
      }
    ]
  },
  {
    "familyId": "short-roll",
    "familyName": "Short Roll",
    "category": "Pick-and-roll",
    "minutes": 12,
    "goal": "Nach kurzem Abrollen aus der Mitte weiterspielen.",
    "setup": "Ballhandler oben, Blocker und Empfänger in der Ecke.",
    "coachingPoints": [
      "Vor dem Fang die Ecke wahrnehmen.",
      "Mit Balance stoppen und nicht blind weiterpassen."
    ],
    "repetitions": "8 Aktionen, Rollen anschließend wechseln.",
    "successIndicator": "Korrekte Pass- oder Abschlussentscheidungen zählen.",
    "steps": [
      "Nach dem Block kurz zur Mitte rollen.",
      "Pass fangen, zum Korb ausrichten und die freie Anschlussoption erkennen."
    ],
    "variants": [
      {
        "id": "catalog-short-roll-1",
        "name": "Short Roll · Fang und Eckpass",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fang und Eckpass“: Ohne Verteidigung kurz rollen und den Ball direkt zum Eckspieler weitergeben."
      },
      {
        "id": "catalog-short-roll-2",
        "name": "Short Roll · Fang und Abschluss",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fang und Abschluss“: Nach dem kurzen Roll aus sicherer Distanz selbst abschließen."
      },
      {
        "id": "catalog-short-roll-3",
        "name": "Short Roll · Helfer lesen",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Helfer lesen“: Ein Verteidiger schützt Korb oder Ecke; Roller wählt Abschluss oder Pass."
      },
      {
        "id": "catalog-short-roll-4",
        "name": "Short Roll · Zwei-Pass-Folge",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei-Pass-Folge“: Zwei Außenempfänger und ein Helfer: Nach dem Roll den ersten freien Spieler finden, dieser sucht den nächsten freien Pass."
      }
    ]
  },
  {
    "familyId": "pnr-spacing",
    "familyName": "Abstände beim Pick-and-roll",
    "category": "Pick-and-roll",
    "minutes": 12,
    "goal": "Den Ballblock mit freien Passlinien unterstützen.",
    "setup": "Ballhandler, Blocker und ein Spieler auf der ballfernen Seite.",
    "coachingPoints": [
      "Nicht in die Rollbahn laufen.",
      "Standortänderung mit dem Ballweg abstimmen."
    ],
    "repetitions": "3 Serien à 5 Aktionen.",
    "successIndicator": "Freie Passfenster und unbesetzte Rollbahn beobachten.",
    "steps": [
      "Ballblock ausführen.",
      "Spieler ohne Ball hält Abstand und verändert bei einem Drive seinen Passwinkel."
    ],
    "variants": [
      {
        "id": "catalog-pnr-spacing-1",
        "name": "Abstände beim Pick-and-roll · Ecke halten",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ecke halten“: Außenspieler bleibt breit in der Ecke, bis Ballhandler oder Roller den Ball zu ihm passt."
      },
      {
        "id": "catalog-pnr-spacing-2",
        "name": "Abstände beim Pick-and-roll · Ecke anheben",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ecke anheben“: Bei einem tiefen Grundlinien-Drive steigt der Außenspieler zum Flügel auf."
      },
      {
        "id": "catalog-pnr-spacing-3",
        "name": "Abstände beim Pick-and-roll · Tag bestrafen",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Tag bestrafen“: Ein Helfer übernimmt kurz den Roller; Ballhandler passt rechtzeitig zum frei werdenden Außenspieler."
      },
      {
        "id": "catalog-pnr-spacing-4",
        "name": "Abstände beim Pick-and-roll · Vier-gegen-drei",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Vier-gegen-drei“: Zwei Außenempfänger, Blocker und Ballhandler gegen drei Verteidiger; den freien Spieler mit höchstens zwei Zusatzpässen finden."
      }
    ]
  },
  {
    "familyId": "rescreen",
    "familyName": "Blockwinkel ändern",
    "category": "Pick-and-roll",
    "minutes": 12,
    "goal": "Auf einen nicht genutzten ersten Block sinnvoll reagieren.",
    "setup": "Ballhandler und Blocker oben; ausreichend Raum auf beiden Seiten.",
    "coachingPoints": [
      "Vor jedem neuen Block wieder stationär sein.",
      "Ballhandler hält das Dribbling am Leben."
    ],
    "repetitions": "Je 6 Wiederholungen in beide Richtungen.",
    "successIndicator": "Saubere Neuaufstellung und genutzte zweite Winkel zählen.",
    "steps": [
      "Ersten Block kontrolliert anbieten.",
      "Wenn der Weg geschlossen bleibt, neu aufstellen und einen zweiten Winkel schaffen."
    ],
    "variants": [
      {
        "id": "catalog-rescreen-1",
        "name": "Blockwinkel ändern · Festes Re-Screen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Festes Re-Screen“: Nach zwei Dribblings den ersten Weg abbrechen und den Block auf der anderen Seite erneut nutzen."
      },
      {
        "id": "catalog-rescreen-2",
        "name": "Blockwinkel ändern · Reject und Rückkehr",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Reject und Rückkehr“: Erst vom Block wegdribbeln, dann zum neu aufgestellten Block zurückkehren."
      },
      {
        "id": "catalog-rescreen-3",
        "name": "Blockwinkel ändern · Unterlaufen lesen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Unterlaufen lesen“: Verteidiger läuft unter dem ersten Block durch; Blocker verändert Winkel und Tiefe für den zweiten Versuch."
      },
      {
        "id": "catalog-rescreen-4",
        "name": "Blockwinkel ändern · Live zweite Chance",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live zweite Chance“: Zwei gegen zwei: Nach misslungenem ersten Vorteil ist genau ein erneuter Block erlaubt, danach frei abschließen."
      }
    ]
  },
  {
    "familyId": "post-seal",
    "familyName": "Position im Low Post",
    "category": "Postspiel",
    "minutes": 10,
    "goal": "Eine sichere Innenposition vor dem Pass herstellen.",
    "setup": "Passgeber am Flügel, Zielposition seitlich der Zone.",
    "coachingPoints": [
      "Nicht mit Armen schieben oder halten.",
      "Erst Position sichern, dann den Ball fordern."
    ],
    "repetitions": "Je 6 Fänge pro Seite, danach Rollenwechsel.",
    "successIndicator": "Fänge ohne Ballverlust und stabile Innenpositionen zählen.",
    "steps": [
      "Mit legaler Körperposition den Weg zum Ball öffnen.",
      "Hände zeigen, Pass sichern und zum Korb orientieren."
    ],
    "variants": [
      {
        "id": "catalog-post-seal-1",
        "name": "Position im Low Post · Fang ohne Defense",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fang ohne Defense“: Postspieler bewegt sich von der Zonenseite zur Zielposition und zeigt beide Hände."
      },
      {
        "id": "catalog-post-seal-2",
        "name": "Position im Low Post · Cross-Seal",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Cross-Seal“: Postspieler kreuzt von der Gegenseite durch die Zone und öffnet sich im richtigen Moment zum Passgeber."
      },
      {
        "id": "catalog-post-seal-3",
        "name": "Position im Low Post · Passive Dreiviertel-Defense",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Passive Dreiviertel-Defense“: Verteidiger steht leicht vor einer Schulter; Postspieler bietet das andere Fangfenster an."
      },
      {
        "id": "catalog-post-seal-4",
        "name": "Position im Low Post · Fronting lösen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fronting lösen“: Verteidiger steht vor dem Postspieler; Passgeber verändert den Winkel, Postspieler erhält legal den Raum hinter sich."
      }
    ]
  },
  {
    "familyId": "drop-step",
    "familyName": "Dropstep",
    "category": "Postspiel",
    "minutes": 10,
    "goal": "Nach dem Fang einen freien Weg neben dem Korb nutzen.",
    "setup": "Ballannahme im Low Post, Rückweg außerhalb der Zone.",
    "coachingPoints": [
      "Erstes Dribbling vor dem Lösen des Standfußes.",
      "Schulter am Gegner vorbeiführen, nicht durch ihn."
    ],
    "repetitions": "Je 5 Abschlüsse Richtung Mitte und Grundlinie.",
    "successIndicator": "Regelgerechte Fußfolge und sichere Nahabschlüsse zählen.",
    "steps": [
      "Ball stabil sichern und Standbein bestimmen.",
      "Einen kontrollierten Schritt zur freien Seite setzen und nah abschließen."
    ],
    "variants": [
      {
        "id": "catalog-drop-step-1",
        "name": "Dropstep · Trockenfolge",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Trockenfolge“: Aus dem Stand mit Ball den Fußweg langsam üben und nah am Brett abschließen."
      },
      {
        "id": "catalog-drop-step-2",
        "name": "Dropstep · Fang zum Dropstep",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fang zum Dropstep“: Partner passt in den Post; nach dem Fang ohne zusätzliche Drehung angreifen."
      },
      {
        "id": "catalog-drop-step-3",
        "name": "Dropstep · Druckseite lesen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Druckseite lesen“: Partner gibt mit einer Hand eine passive Druckseite vor; zur anderen Seite öffnen."
      },
      {
        "id": "catalog-drop-step-4",
        "name": "Dropstep · Live Low Post",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live Low Post“: Angreifer erhält den Ball durch Selbstpass; mit höchstens zwei Dribblings gegen kontrollierte Defense abschließen."
      }
    ]
  },
  {
    "familyId": "hook",
    "familyName": "Hook-Abschluss",
    "category": "Postspiel",
    "minutes": 10,
    "goal": "Mit dem Körper zwischen Ball und Gegner werfen.",
    "setup": "Naher Postbereich; Abstand so wählen, dass der Wurf kontrolliert bleibt.",
    "coachingPoints": [
      "Wurfarm über die Schulterlinie strecken.",
      "Freien Arm nur zum Schutz, nicht zum Wegdrücken verwenden."
    ],
    "repetitions": "Je 8 Würfe mit beiden Händen.",
    "successIndicator": "Treffer aus gleicher Distanz und geschützte Ballführung erfassen.",
    "steps": [
      "Seitlich zum Korb stabilisieren.",
      "Ball auf der vom Gegner abgewandten Seite hochführen und weich abgeben."
    ],
    "variants": [
      {
        "id": "catalog-hook-1",
        "name": "Hook-Abschluss · Mini-Hook im Stand",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Mini-Hook im Stand“: Aus kurzer Distanz ohne Dribbling seitlich abschließen."
      },
      {
        "id": "catalog-hook-2",
        "name": "Hook-Abschluss · Hook nach einem Dribbling",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Hook nach einem Dribbling“: Ein kräftiges Kontrolldribbling, dann seitlich zum Hook aufrichten."
      },
      {
        "id": "catalog-hook-3",
        "name": "Hook-Abschluss · Wechselhaken",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Wechselhaken“: Nach jedem Rebound die Korbseite wechseln und mit der anderen Hand werfen."
      },
      {
        "id": "catalog-hook-4",
        "name": "Hook-Abschluss · Verteidigerschulter lesen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Verteidigerschulter lesen“: Partner schützt passiv eine Schulter; den Wurf über die freie Schulter vorbereiten."
      }
    ]
  },
  {
    "familyId": "post-faceup",
    "familyName": "Face-up im Post",
    "category": "Postspiel",
    "minutes": 10,
    "goal": "Nach dem Fang Korb, Abstand und Angriffsweg sehen.",
    "setup": "Postposition etwa drei Meter vom Korb entfernt.",
    "coachingPoints": [
      "Standbein beim Öffnen beachten.",
      "Entscheidung nach Blick zum Korb treffen."
    ],
    "repetitions": "Je 6 Aktionen pro Seite.",
    "successIndicator": "Richtige Entscheidungen und regelgerechte Starts zählen.",
    "steps": [
      "Ball sichern und mit Pivot zum Korb öffnen.",
      "Aus stabiler Position Wurf, Drive oder Pass wählen."
    ],
    "variants": [
      {
        "id": "catalog-post-faceup-1",
        "name": "Face-up im Post · Pivot und Nahwurf",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pivot und Nahwurf“: Mit Selbstpass beginnen, öffnen und aus sicherer Distanz werfen."
      },
      {
        "id": "catalog-post-faceup-2",
        "name": "Face-up im Post · Jab und Drive",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Jab und Drive“: Nach dem Öffnen einen kurzen Jabstep und einen kontrollierten Drive anschließen."
      },
      {
        "id": "catalog-post-faceup-3",
        "name": "Face-up im Post · Abstand lesen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Abstand lesen“: Verteidiger gibt Abstand oder schließt; Wurf oder Drive passend wählen."
      },
      {
        "id": "catalog-post-faceup-4",
        "name": "Face-up im Post · Hilfe aus der Ecke",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Hilfe aus der Ecke“: Zwei Angreifer gegen zwei Verteidiger; bei Hilfe rechtzeitig zum freien Außenspieler passen."
      }
    ]
  },
  {
    "familyId": "high-low",
    "familyName": "High-low-Verbindung",
    "category": "Postspiel",
    "minutes": 10,
    "goal": "Aus hoher Position den tiefen Mitspieler finden.",
    "setup": "Ein Spieler am Ellbogen, einer am tiefen Zonenrand; optional Passgeber außen.",
    "coachingPoints": [
      "Passwinkel vor dem Ballkontakt vorbereiten.",
      "Tiefer Spieler bleibt aus der direkten Fahrspur."
    ],
    "repetitions": "3 Serien à 5 Pässe und Abschlüsse.",
    "successIndicator": "Sichere tiefe Fänge und richtige Passwahl zählen.",
    "steps": [
      "Hoher Spieler fängt und dreht zum Korb.",
      "Tiefer Spieler bietet gleichzeitig ein klares Fangfenster an."
    ],
    "variants": [
      {
        "id": "catalog-high-low-1",
        "name": "High-low-Verbindung · Direkte Verbindung",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Direkte Verbindung“: Hoher Spieler startet mit Ball und passt zum sich anbietenden tiefen Spieler."
      },
      {
        "id": "catalog-high-low-2",
        "name": "High-low-Verbindung · Flügel-High-low",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Flügel-High-low“: Ball vom Flügel zum Ellbogen und erst danach tief weiterspielen."
      },
      {
        "id": "catalog-high-low-3",
        "name": "High-low-Verbindung · Tiefe Defense",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Tiefe Defense“: Ein Verteidiger schützt eine Seite des tiefen Spielers; Fangfenster und Passwinkel gemeinsam anpassen."
      },
      {
        "id": "catalog-high-low-4",
        "name": "High-low-Verbindung · Zwei-gegen-zwei innen",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei-gegen-zwei innen“: Hoher und tiefer Angreifer gegen zwei Verteidiger; nur bei freier Linie tief passen, sonst selbst angreifen."
      }
    ]
  },
  {
    "familyId": "def-stance",
    "familyName": "Defensive Grundbewegung",
    "category": "Verteidigung am Ball",
    "minutes": 8,
    "goal": "Mit Balance vor dem Angreifer bleiben.",
    "setup": "Freie Fläche zwischen zwei seitlichen Markierungen.",
    "coachingPoints": [
      "Füße nicht eng zusammenziehen.",
      "Hände aktiv halten, ohne die Balance zu verlieren."
    ],
    "repetitions": "4 Runden à 20 Sekunden mit 30 Sekunden Pause.",
    "successIndicator": "Kontrollierte Richtungswechsel ohne Kreuzschritt zählen.",
    "steps": [
      "Stabile Grundposition einnehmen.",
      "Kurze seitliche Schritte ausführen und die Füße wieder unter den Körper bringen."
    ],
    "variants": [
      {
        "id": "catalog-def-stance-1",
        "name": "Defensive Grundbewegung · Linie entlang",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Linie entlang“: Zwischen zwei Markierungen seitlich gleiten und an den Enden kontrolliert stoppen."
      },
      {
        "id": "catalog-def-stance-2",
        "name": "Defensive Grundbewegung · Spiegel ohne Ball",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Spiegel ohne Ball“: Partner bewegt sich langsam seitlich; Verteidiger hält den Abstand."
      },
      {
        "id": "catalog-def-stance-3",
        "name": "Defensive Grundbewegung · Vor-zurück-Signal",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Vor-zurück-Signal“: Trainer zeigt seitlich, vor oder zurück; passende kurze Schritte wählen."
      },
      {
        "id": "catalog-def-stance-4",
        "name": "Defensive Grundbewegung · Angreifer täuscht",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Angreifer täuscht“: Angreifer wechselt frei zwischen Seitbewegung und kurzem Antritt; Verteidiger reagiert auf den Rumpf."
      }
    ]
  },
  {
    "familyId": "closeout",
    "familyName": "Closeout kontrollieren",
    "category": "Verteidigung am Ball",
    "minutes": 8,
    "goal": "Den Wurfraum schließen und den Drive weiter verteidigen.",
    "setup": "Start in der Zone, Angriffsposition am Flügel markieren.",
    "coachingPoints": [
      "Früh genug abbremsen.",
      "Nicht in den Schützen oder seine Landefläche springen."
    ],
    "repetitions": "Je 6 Closeouts pro Seite.",
    "successIndicator": "Kontrollierte Stopps und verhinderte direkte Durchbrüche erfassen.",
    "steps": [
      "Zügig zur Außenposition laufen.",
      "Vor dem Angreifer abbremsen, Hand zum Wurf heben und seitlich reagieren."
    ],
    "variants": [
      {
        "id": "catalog-closeout-1",
        "name": "Closeout kontrollieren · Hütchen-Closeout",
        "playersMin": 1,
        "playersMax": 16,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Hütchen-Closeout“: Am Hütchen abbremsen und zwei kurze Seitwärtsschritte anschließen."
      },
      {
        "id": "catalog-closeout-2",
        "name": "Closeout kontrollieren · Ballhalter",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ballhalter“: Partner hält den Ball in Wurfposition; mit Abstand und hoher Hand schließen."
      },
      {
        "id": "catalog-closeout-3",
        "name": "Closeout kontrollieren · Wurf oder Dribbling",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Wurf oder Dribbling“: Angreifer täuscht Wurf oder setzt ein Dribbling; Verteidiger bleibt am Boden und reagiert."
      },
      {
        "id": "catalog-closeout-4",
        "name": "Closeout kontrollieren · Live bis drei Dribblings",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Live bis drei Dribblings“: Nach dem Closeout beginnt ein kurzes 1-gegen-1; Angreifer hat maximal drei Dribblings."
      }
    ]
  },
  {
    "familyId": "contain",
    "familyName": "Drive vor sich halten",
    "category": "Verteidigung am Ball",
    "minutes": 8,
    "goal": "Einen Dribbler mit Winkel und Füßen lenken.",
    "setup": "Korridor von etwa vier Metern Breite markieren.",
    "coachingPoints": [
      "Auf Hüfte und Rumpf achten.",
      "Mit Füßen lenken, nicht mit Händen halten."
    ],
    "repetitions": "4 Läufe à 10–15 Sekunden, Rollen abwechseln.",
    "successIndicator": "Direkte Durchbrüche und erzwungene Richtungswechsel zählen.",
    "steps": [
      "Verteidiger nimmt mit Abstand die Balllinie auf.",
      "Angreifer versucht durch den Korridor zu kommen."
    ],
    "variants": [
      {
        "id": "catalog-contain-1",
        "name": "Drive vor sich halten · Gehendes Dribbling",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Gehendes Dribbling“: Angreifer dribbelt zunächst im Gehtempo ohne Täuschungen."
      },
      {
        "id": "catalog-contain-2",
        "name": "Drive vor sich halten · Zickzack mit Stopp",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Zickzack mit Stopp“: Nach jedem Richtungswechsel stoppen beide kurz und prüfen ihre Position."
      },
      {
        "id": "catalog-contain-3",
        "name": "Drive vor sich halten · Freier Korridor",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Freier Korridor“: Angreifer darf Richtung und Tempo frei verändern; Defense verhindert die direkte Linie."
      },
      {
        "id": "catalog-contain-4",
        "name": "Drive vor sich halten · Zwei Tore",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Zwei Tore“: Am Ende liegen zwei Ausgänge; Verteidiger lenkt vom näheren Tor weg, ohne zu schieben."
      }
    ]
  },
  {
    "familyId": "def-recover",
    "familyName": "Nach Durchbruch aufholen",
    "category": "Verteidigung am Ball",
    "minutes": 8,
    "goal": "Nach verlorener Position wieder sinnvoll verteidigen.",
    "setup": "Kurze Laufbahn mit Startvorsprung für den Angreifer.",
    "coachingPoints": [
      "Nicht von hinten in den Körper greifen.",
      "Erst Laufweg gewinnen, dann Ball verteidigen."
    ],
    "repetitions": "Je 6 Läufe, nach jedem Lauf Rollenwechsel.",
    "successIndicator": "Wiedergewonnene seitliche Positionen und kontrollierte Stopps zählen.",
    "steps": [
      "Angreifer startet mit kleinem Vorsprung.",
      "Verteidiger läuft zurück auf eine seitliche Position und nimmt den Ballweg erneut auf."
    ],
    "variants": [
      {
        "id": "catalog-def-recover-1",
        "name": "Nach Durchbruch aufholen · Ohne Ball zurücklaufen",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ohne Ball zurücklaufen“: Angreifer läuft geradeaus; Verteidiger holt seitlich auf und stoppt auf gleicher Höhe."
      },
      {
        "id": "catalog-def-recover-2",
        "name": "Nach Durchbruch aufholen · Dribbler begleiten",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Dribbler begleiten“: Angreifer dribbelt kontrolliert, Verteidiger findet seitlichen Anschluss ohne Ballkontakt."
      },
      {
        "id": "catalog-def-recover-3",
        "name": "Nach Durchbruch aufholen · Winkel schließen",
        "playersMin": 2,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Winkel schließen“: Angreifer darf zu einem von zwei Toren laufen; Verteidiger gewinnt einen günstigen Rücklaufwinkel."
      },
      {
        "id": "catalog-def-recover-4",
        "name": "Nach Durchbruch aufholen · Helfer übernimmt",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Helfer übernimmt“: Ein Helfer stoppt den Ball; geschlagener Verteidiger übernimmt danach den freien Raum statt blind weiterzuverfolgen."
      }
    ]
  },
  {
    "familyId": "screen-defense",
    "familyName": "Verteidigung am Block",
    "category": "Verteidigung am Ball",
    "minutes": 8,
    "goal": "Früh kommunizieren und einen vereinbarten Weg um den Block nehmen.",
    "setup": "Ballhandler, stationärer Blocker und Verteidiger außen.",
    "coachingPoints": [
      "Blockkontakt nicht durch Stoßen lösen.",
      "Nach dem Block Blick sofort zum Ball."
    ],
    "repetitions": "Je 6 Aktionen pro Rolle.",
    "successIndicator": "Frühe Ansagen und wiederhergestellte Ballposition zählen.",
    "steps": [
      "Block früh erkennen und ansagen.",
      "Vereinbarte Route gehen und wieder vor oder neben den Ball kommen."
    ],
    "variants": [
      {
        "id": "catalog-screen-defense-1",
        "name": "Verteidigung am Block · Über den Block",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Über den Block“: Bei kontrolliertem Tempo eng über den Block folgen und seitlich anschließen."
      },
      {
        "id": "catalog-screen-defense-2",
        "name": "Verteidigung am Block · Unter dem Block",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Unter dem Block“: Vorher vereinbart unter dem Block durchgehen und rechtzeitig vor dem Ball ankommen."
      },
      {
        "id": "catalog-screen-defense-3",
        "name": "Verteidigung am Block · Wechsel kommunizieren",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Wechsel kommunizieren“: Zwei Verteidiger wechseln die Zuordnung erst nach klarer gegenseitiger Ansage."
      },
      {
        "id": "catalog-screen-defense-4",
        "name": "Verteidigung am Block · Show und Rückkehr",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Show und Rückkehr“: Blockverteidiger hält den Ball kurz auf; ursprünglicher Ballverteidiger kehrt zurück, Blockverteidiger findet den Roller."
      }
    ]
  },
  {
    "familyId": "shell-help",
    "familyName": "Helfen und Zurückkehren",
    "category": "Teamverteidigung",
    "minutes": 12,
    "goal": "Ball, eigenen Spieler und Korb gleichzeitig berücksichtigen.",
    "setup": "Drei Außenangreifer und drei Verteidiger im Halbfeld.",
    "coachingPoints": [
      "Ball und Gegenspieler im Blick behalten.",
      "Mit dem Pass bewegen, nicht erst danach."
    ],
    "repetitions": "4 Runden à 60 Sekunden, jeweils kurze Rückmeldung.",
    "successIndicator": "Frühe Hilfspositionen und kontrollierte Rückkehr beobachten.",
    "steps": [
      "Ball außen bewegen.",
      "Verteidiger passen ihre Position mit jedem Pass an und kommunizieren."
    ],
    "variants": [
      {
        "id": "catalog-shell-help-1",
        "name": "Helfen und Zurückkehren · Nur Passbewegung",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Nur Passbewegung“: Angriff passt ohne Dribbling; Defense stellt die Positionen nach jedem Pass her."
      },
      {
        "id": "catalog-shell-help-2",
        "name": "Helfen und Zurückkehren · Drive anzeigen",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drive anzeigen“: Angreifer macht ein Dribbling Richtung Zone, stoppt dann; Helfer tritt kurz ein und kehrt zurück."
      },
      {
        "id": "catalog-shell-help-3",
        "name": "Helfen und Zurückkehren · Drive und Kick",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drive und Kick“: Angriff darf bis zur Zone dribbeln und herauspassen; Defense hilft und rotiert."
      },
      {
        "id": "catalog-shell-help-4",
        "name": "Helfen und Zurückkehren · Live nach Signal",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live nach Signal“: Zuerst drei Pässe ohne Angriff, danach auf Trainersignal frei drei gegen drei spielen."
      }
    ]
  },
  {
    "familyId": "tag-roll",
    "familyName": "Roller kurz übernehmen",
    "category": "Teamverteidigung",
    "minutes": 12,
    "goal": "Einen abrollenden Spieler sichern, ohne den eigenen Mann zu verlieren.",
    "setup": "Drei Angreifer mit Ballblock und Außenspieler, drei Verteidiger.",
    "coachingPoints": [
      "Übernahme früh ansagen.",
      "Mit Körperposition helfen, nicht am Roller festhalten."
    ],
    "repetitions": "8 Aktionen, danach Rollen wechseln.",
    "successIndicator": "Verhinderte freie Rollfänge und rechtzeitige Closeouts zählen.",
    "steps": [
      "Ballblock durchführen.",
      "Ballferner Verteidiger tritt kurz in die Rollbahn und kehrt bei Pass nach außen zurück."
    ],
    "variants": [
      {
        "id": "catalog-tag-roll-1",
        "name": "Roller kurz übernehmen · Geplanter Tag",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Geplanter Tag“: Angriff läuft festen Rollweg; Helfer zeigt die Übernahme ohne Ballgewinnversuch."
      },
      {
        "id": "catalog-tag-roll-2",
        "name": "Roller kurz übernehmen · Pass zum Roller",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass zum Roller“: Ballhandler passt kontrolliert zum Roller; Helfer verhindert den direkten Korbweg."
      },
      {
        "id": "catalog-tag-roll-3",
        "name": "Roller kurz übernehmen · Kickout zum Flügel",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Kickout zum Flügel“: Ballhandler spielt nach dem Tag nach außen; Helfer kehrt kontrolliert zurück."
      },
      {
        "id": "catalog-tag-roll-4",
        "name": "Roller kurz übernehmen · Freie Passwahl",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Freie Passwahl“: Ballhandler entscheidet zwischen Roller und Außenspieler; Defense muss mit Ansagen reagieren."
      }
    ]
  },
  {
    "familyId": "x-out",
    "familyName": "X-out-Rotation",
    "category": "Teamverteidigung",
    "minutes": 12,
    "goal": "Nach Hilfe zwei Außenspieler gemeinsam übernehmen.",
    "setup": "Ballhandler auf einer Seite, zwei Empfänger gegenüber, zwei rotierende Verteidiger.",
    "coachingPoints": [
      "Nicht beide zum selben Empfänger laufen.",
      "Erst die gefährlichere freie Position schließen."
    ],
    "repetitions": "3 Serien à 6 Rotationen.",
    "successIndicator": "Doppelte Zuordnungen und offene Würfe nach der Rotation zählen.",
    "steps": [
      "Ein Verteidiger hilft zum Ball.",
      "Beim Pass nach außen teilen beide die freien Empfänger mit klarer Ansage auf."
    ],
    "variants": [
      {
        "id": "catalog-x-out-1",
        "name": "X-out-Rotation · Passfolge vorher bekannt",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Passfolge vorher bekannt“: Ball geht fest zuerst in die Ecke; Verteidiger üben die gekreuzten Laufwege langsam."
      },
      {
        "id": "catalog-x-out-2",
        "name": "X-out-Rotation · Erster Pass frei",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Erster Pass frei“: Ballhandler wählt Ecke oder Flügel; Verteidiger sprechen die erste Übernahme ab."
      },
      {
        "id": "catalog-x-out-3",
        "name": "X-out-Rotation · Zusatzpass",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zusatzpass“: Nach dem ersten Fang sofort zum zweiten Empfänger passen; Defense muss erneut zuordnen."
      },
      {
        "id": "catalog-x-out-4",
        "name": "X-out-Rotation · Live aus Unterzahl",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live aus Unterzahl“: Drei Angreifer gegen zwei Verteidiger für eine kurze Aktion; freie Würfe durch Rotation erschweren."
      }
    ]
  },
  {
    "familyId": "zone-shift",
    "familyName": "Verschieben in der Zone",
    "category": "Teamverteidigung",
    "minutes": 12,
    "goal": "Passwege und Korbraum im Raumverteidigen gemeinsam sichern.",
    "setup": "Drei Außenangreifer, drei Verteidiger in vorher erklärten Zonenbereichen.",
    "coachingPoints": [
      "Bereiche übergeben und ansagen.",
      "Nicht dem Ball hinterherlaufen und den Korb freigeben."
    ],
    "repetitions": "4 Runden à 60 Sekunden.",
    "successIndicator": "Offene Pässe durch die Mitte und klare Übergaben zählen.",
    "steps": [
      "Ball von Seite zu Seite passen.",
      "Verteidiger verschieben gemeinsam zur Ballseite und halten Verbindung."
    ],
    "variants": [
      {
        "id": "catalog-zone-shift-1",
        "name": "Verschieben in der Zone · Ohne Dribbling",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ohne Dribbling“: Angriff bewegt nur den Ball; Defense friert nach jedem Pass kurz zur Positionsprüfung ein."
      },
      {
        "id": "catalog-zone-shift-2",
        "name": "Verschieben in der Zone · High-Post-Fang",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „High-Post-Fang“: Ein zusätzlicher Angreifer bietet sich am Ellbogen an; Defense verhindert oder übernimmt den Fang."
      },
      {
        "id": "catalog-zone-shift-3",
        "name": "Verschieben in der Zone · Grundlinienläufer",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Grundlinienläufer“: Zusätzlicher Angreifer läuft zwischen kurzen Ecken; Defense übergibt ihn hörbar."
      },
      {
        "id": "catalog-zone-shift-4",
        "name": "Verschieben in der Zone · Live begrenzter Raum",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live begrenzter Raum“: Drei gegen drei mit klar zugeteilten Zonenbereichen; nach Ballverlust sofort neue Zuordnung ansagen."
      }
    ]
  },
  {
    "familyId": "press-defense",
    "familyName": "Druck und Absicherung",
    "category": "Teamverteidigung",
    "minutes": 12,
    "goal": "Ball unter Druck setzen, ohne den Raum dahinter freizugeben.",
    "setup": "Drei Angreifer und drei Verteidiger in einem Halbfeldkorridor.",
    "coachingPoints": [
      "Druck nicht mit unkontrolliertem Greifen verwechseln.",
      "Tiefe Absicherung vor Balljagd."
    ],
    "repetitions": "6 Aktionen bis zur Mittellinie, danach Rollenwechsel.",
    "successIndicator": "Verzögerungen, Ballgewinne und zugelassene tiefe Pässe erfassen.",
    "steps": [
      "Ball am Rand kontrolliert unter Druck setzen.",
      "Mitspieler sichern die nächsten Passlinien und den tiefen Raum."
    ],
    "variants": [
      {
        "id": "catalog-press-defense-1",
        "name": "Druck und Absicherung · Ball lenken",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ball lenken“: Nur ein Verteidiger setzt Druck; die anderen halten ihre Sicherungsräume."
      },
      {
        "id": "catalog-press-defense-2",
        "name": "Druck und Absicherung · Geplante Falle",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Geplante Falle“: An einer vorher festgelegten Seitenmarkierung zu zweit stellen; dritter Verteidiger sichert tief."
      },
      {
        "id": "catalog-press-defense-3",
        "name": "Druck und Absicherung · Rückpass-Auslöser",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Rückpass-Auslöser“: Erst nach einem Rückpass gemeinsam Druck erhöhen und neue Passlinien schließen."
      },
      {
        "id": "catalog-press-defense-4",
        "name": "Druck und Absicherung · Falle auflösen",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Falle auflösen“: Nach entkommenem Pass sofort zur Absicherung zurückkehren und erneut geordnet verteidigen."
      }
    ]
  },
  {
    "familyId": "box-out",
    "familyName": "Ausboxen und Sichern",
    "category": "Rebound",
    "minutes": 9,
    "goal": "Vor dem Ballflug eine legale Reboundposition herstellen.",
    "setup": "Zwei Spieler seitlich der Zone; Trainer oder Selbstwurf startet die Aktion.",
    "coachingPoints": [
      "Nicht halten oder rückwärts unterlaufen.",
      "Ball erst nach gesicherter Position verfolgen."
    ],
    "repetitions": "Je 6 Rebounds pro Rolle.",
    "successIndicator": "Gesicherte Position und kontrollierten Ballbesitz getrennt zählen.",
    "steps": [
      "Gegner lokalisieren und mit legaler Position vom Korb weg halten.",
      "Danach zum Ball gehen und mit zwei Händen sichern."
    ],
    "variants": [
      {
        "id": "catalog-box-out-1",
        "name": "Ausboxen und Sichern · Position ohne Sprung",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Position ohne Sprung“: Partner versucht im Gehtempo zur Korbseite zu gelangen; Verteidiger hält legal die Position."
      },
      {
        "id": "catalog-box-out-2",
        "name": "Ausboxen und Sichern · Wurf und Sicherung",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Wurf und Sicherung“: Angreifer wirft kontrolliert ans Brett; Verteidiger boxt aus und reboundet."
      },
      {
        "id": "catalog-box-out-3",
        "name": "Ausboxen und Sichern · Seitlicher Start",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Seitlicher Start“: Beide starten neben statt hintereinander; Verteidiger muss den Gegner erst finden."
      },
      {
        "id": "catalog-box-out-4",
        "name": "Ausboxen und Sichern · Zwei-gegen-zwei",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei-gegen-zwei“: Nach Trainerwurf beide Gegenspieler zuordnen, ausboxen und den Ball sichern."
      }
    ]
  },
  {
    "familyId": "read-rebound",
    "familyName": "Flugbahn lesen",
    "category": "Rebound",
    "minutes": 9,
    "goal": "Den wahrscheinlichen Landebereich des Balls früh erkennen.",
    "setup": "Schütze oder Trainer an wechselnden Wurfpositionen.",
    "coachingPoints": [
      "Nicht nur auf den Korb starren.",
      "Beim Landen Raum und Mitspieler beachten."
    ],
    "repetitions": "3 Serien à 6 Würfe aus unterschiedlichen Winkeln.",
    "successIndicator": "Erster Bewegungsschritt zur richtigen Ballseite und sichere Fänge zählen.",
    "steps": [
      "Wurf beobachten und erst nach Abgabe in Position gehen.",
      "Flugbahn verfolgen und Ball am höchsten sicheren Punkt fangen."
    ],
    "variants": [
      {
        "id": "catalog-read-rebound-1",
        "name": "Flugbahn lesen · Eigener Brettwurf",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Eigener Brettwurf“: Ball kontrolliert gegen das Brett werfen und den Rückprall mit zwei Händen fangen."
      },
      {
        "id": "catalog-read-rebound-2",
        "name": "Flugbahn lesen · Winkelwechsel",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Winkelwechsel“: Partner wirft abwechselnd von zwei Positionen; Rebounder liest die neue Flugbahn."
      },
      {
        "id": "catalog-read-rebound-3",
        "name": "Flugbahn lesen · Lange Rebounds",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Lange Rebounds“: Partner nimmt etwas weitere Würfe; Rebounder hält erst Abstand und reagiert auf den Rückprall."
      },
      {
        "id": "catalog-read-rebound-4",
        "name": "Flugbahn lesen · Wettbewerb um den Raum",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Wettbewerb um den Raum“: Zwei Rebounder starten gleich weit entfernt und kämpfen mit legaler Position um den Ball."
      }
    ]
  },
  {
    "familyId": "off-rebound",
    "familyName": "Offensivrebound anlaufen",
    "category": "Rebound",
    "minutes": 9,
    "goal": "Vor dem Wurf einen freien Weg zum Rebound suchen.",
    "setup": "Schütze außen, Rebounder am Zonenrand, optional Verteidiger.",
    "coachingPoints": [
      "Nicht über den Rücken springen.",
      "Den Laufweg vor dem Absprung gewinnen."
    ],
    "repetitions": "Je 6 Aktionen pro Startseite.",
    "successIndicator": "Legale Zugänge zum Ball und zweite Ballbesitze zählen.",
    "steps": [
      "Bei Wurfabgabe den eigenen Gegner lokalisieren.",
      "Freien Weg wählen und kontrolliert zum Ball gehen."
    ],
    "variants": [
      {
        "id": "catalog-off-rebound-1",
        "name": "Offensivrebound anlaufen · Freier Laufweg",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Freier Laufweg“: Ohne Verteidigung aus wechselnden Außenpositionen zum Rebound starten."
      },
      {
        "id": "catalog-off-rebound-2",
        "name": "Offensivrebound anlaufen · Täuschung am Ausboxer",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Täuschung am Ausboxer“: Verteidiger boxt passiv aus; mit kurzem Richtungswechsel eine freie Seite suchen."
      },
      {
        "id": "catalog-off-rebound-3",
        "name": "Offensivrebound anlaufen · Außen und innen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Außen und innen“: Vor jedem Wurf den Laufweg außen herum oder innen durch eine offene Lücke wählen."
      },
      {
        "id": "catalog-off-rebound-4",
        "name": "Offensivrebound anlaufen · Live zweiter Ball",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live zweiter Ball“: Nach Wurf kämpfen Angreifer und Verteidiger um den Rebound; nur der gesicherte Ball zählt."
      }
    ]
  },
  {
    "familyId": "tip-out",
    "familyName": "Rebound weiterleiten",
    "category": "Rebound",
    "minutes": 9,
    "goal": "Einen nicht sicher fangbaren Ball kontrolliert zu einem Mitspieler lenken.",
    "setup": "Ein Spieler nahe am Korb, einer außerhalb der Zone.",
    "coachingPoints": [
      "Fangen hat Vorrang vor Tippen.",
      "Nicht blind in die Mitte schlagen."
    ],
    "repetitions": "3 Serien à 6 Aktionen mit Rollenwechsel.",
    "successIndicator": "Gezielte Zuspiele und anschließenden Team-Ballbesitz zählen.",
    "steps": [
      "Ball vom Brett lösen oder einen Wurf abwarten.",
      "Nur wenn sicheres Fangen nicht möglich ist, gezielt zum freien Mitspieler tippen."
    ],
    "variants": [
      {
        "id": "catalog-tip-out-1",
        "name": "Rebound weiterleiten · Brett-Tipp zum Partner",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Brett-Tipp zum Partner“: Ball selbst ans Brett werfen und mit dosiertem Tipp zum wartenden Partner leiten."
      },
      {
        "id": "catalog-tip-out-2",
        "name": "Rebound weiterleiten · Zwei Zielpositionen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei Zielpositionen“: Zwei Partner außen zeigen abwechselnd Fanghände; zum bereiten Spieler tippen."
      },
      {
        "id": "catalog-tip-out-3",
        "name": "Rebound weiterleiten · Fangen oder Tippen",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fangen oder Tippen“: Partner variiert den Brettwurf; erreichbare Bälle fangen, sonst kontrolliert weiterleiten."
      },
      {
        "id": "catalog-tip-out-4",
        "name": "Rebound weiterleiten · Umkämpfter Rebound",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Umkämpfter Rebound“: Zwei Spieler am Korb, zwei außen; einen sicheren Team-Ballbesitz herstellen, ohne riskant über andere zu springen."
      }
    ]
  },
  {
    "familyId": "outlet",
    "familyName": "Rebound zum ersten Pass",
    "category": "Rebound",
    "minutes": 9,
    "goal": "Nach dem Rebound schnell eine sichere Passoption finden.",
    "setup": "Rebounder in der Zone, Outlet-Spieler seitlich außerhalb.",
    "coachingPoints": [
      "Vor dem Pass landen und Balance herstellen.",
      "Ball nicht in die gefüllte Mitte zwingen."
    ],
    "repetitions": "Je 8 Rebounds und erste Pässe pro Rolle.",
    "successIndicator": "Sichere Rebound-Pass-Verbindungen ohne Ballverlust zählen.",
    "steps": [
      "Rebound mit zwei Händen sichern.",
      "Zum freien Seitenausgang öffnen und den ersten Pass spielen."
    ],
    "variants": [
      {
        "id": "catalog-outlet-1",
        "name": "Rebound zum ersten Pass · Fester Seitenausgang",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fester Seitenausgang“: Nach eigenem Brettwurf zum feststehenden Outlet-Spieler passen."
      },
      {
        "id": "catalog-outlet-2",
        "name": "Rebound zum ersten Pass · Outlet bewegt sich",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Outlet bewegt sich“: Empfänger bietet sich erst nach dem Wurf sichtbar seitlich an."
      },
      {
        "id": "catalog-outlet-3",
        "name": "Rebound zum ersten Pass · Zwei Ausgänge lesen",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei Ausgänge lesen“: Zwei Empfänger stehen außen; Trainer zeigt, welche Seite als frei gilt."
      },
      {
        "id": "catalog-outlet-4",
        "name": "Rebound zum ersten Pass · Pass unter Druck",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass unter Druck“: Ein Verteidiger stört nach dem Rebound kontrolliert; Rebounder nutzt Pivot und freie Passlinie."
      }
    ]
  },
  {
    "familyId": "fastbreak-lanes",
    "familyName": "Laufspuren im Fastbreak",
    "category": "Umschalten und Fastbreak",
    "minutes": 12,
    "goal": "Breite Laufwege und frühe Passoptionen herstellen.",
    "setup": "Drei Startpositionen an der Grundlinie, drei Laufspuren markieren.",
    "coachingPoints": [
      "Außenläufer früh zum Ball schauen.",
      "Nicht alle in die Mittelspur drängen."
    ],
    "repetitions": "6 Durchgänge, Rückweg außerhalb der Spielfläche.",
    "successIndicator": "Eingehaltene Breite und Pässe ohne Laufstopp zählen.",
    "steps": [
      "Nach dem Start die äußeren Spuren breit besetzen.",
      "Ball kontrolliert nach vorne bewegen und gemeinsam abschließen."
    ],
    "variants": [
      {
        "id": "catalog-fastbreak-lanes-1",
        "name": "Laufspuren im Fastbreak · Drei Spuren ohne Gegner",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Drei Spuren ohne Gegner“: Ball läuft durch die Mitte, Außenläufer erhalten abwechselnd den Abschluss."
      },
      {
        "id": "catalog-fastbreak-lanes-2",
        "name": "Laufspuren im Fastbreak · Vorauspass",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Vorauspass“: Mittlerer Spieler passt früh nach außen und läuft anschließend als Rückpassoption weiter."
      },
      {
        "id": "catalog-fastbreak-lanes-3",
        "name": "Laufspuren im Fastbreak · Spurwechsel nach Pass",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Spurwechsel nach Pass“: Nach dem Vorauspass füllt ein anderer Spieler die freie Mittelspur."
      },
      {
        "id": "catalog-fastbreak-lanes-4",
        "name": "Laufspuren im Fastbreak · Ein Rückzugsverteidiger",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Ein Rückzugsverteidiger“: Ein Verteidiger schützt den Korb; Ballführer bindet ihn und findet den freien Außenläufer."
      }
    ]
  },
  {
    "familyId": "two-on-one",
    "familyName": "Zwei gegen einen",
    "category": "Umschalten und Fastbreak",
    "minutes": 12,
    "goal": "Den einzigen Verteidiger zu einer Entscheidung zwingen.",
    "setup": "Zwei Angreifer breit vor dem Korb, ein Verteidiger zwischen Ball und Korb.",
    "coachingPoints": [
      "Abstand zwischen Angreifern halten.",
      "Pass nicht erst in der Luft erzwingen."
    ],
    "repetitions": "Je 6 Angriffe, Rollen rotieren.",
    "successIndicator": "Richtige Pass- oder Abschlusswahl und Ballverluste zählen.",
    "steps": [
      "Ballführer greift mit Blick zum Mitspieler an.",
      "Wenn der Verteidiger den Ball übernimmt, in die freie Linie passen."
    ],
    "variants": [
      {
        "id": "catalog-two-on-one-1",
        "name": "Zwei gegen einen · Halbfeld mit Vorgabe",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Halbfeld mit Vorgabe“: Verteidiger entscheidet vorher sichtbar, welchen Angreifer er aufnimmt."
      },
      {
        "id": "catalog-two-on-one-2",
        "name": "Zwei gegen einen · Freie Verteidigung",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Freie Verteidigung“: Verteidiger entscheidet erst während des Angriffs, Ball oder Passweg zu schließen."
      },
      {
        "id": "catalog-two-on-one-3",
        "name": "Zwei gegen einen · Start von der Seite",
        "playersMin": 3,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Start von der Seite“: Angriff startet aus seitlichem Winkel; freie Breite vor dem Korb herstellen."
      },
      {
        "id": "catalog-two-on-one-4",
        "name": "Zwei gegen einen · Verfolger im Rücken",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Verfolger im Rücken“: Ein zweiter Verteidiger startet verzögert; Angreifer nutzen die kurze Überzahl ohne hektischen Pass."
      }
    ]
  },
  {
    "familyId": "three-on-two",
    "familyName": "Drei gegen zwei",
    "category": "Umschalten und Fastbreak",
    "minutes": 12,
    "goal": "In Überzahl den nächsten freien Angreifer finden.",
    "setup": "Drei Angreifer in breiten Spuren, zwei Verteidiger gestaffelt.",
    "coachingPoints": [
      "Nicht quer durch beide Verteidiger passen.",
      "Nach jedem Pass die Abstände neu halten."
    ],
    "repetitions": "6 Angriffe mit Rollenwechsel.",
    "successIndicator": "Freie Abschlüsse und benötigte Pässe bis zum Vorteil erfassen.",
    "steps": [
      "Ersten Verteidiger durch den Ballführer binden.",
      "Pass zum freien Spieler und bei zweiter Hilfe den nächsten Pass suchen."
    ],
    "variants": [
      {
        "id": "catalog-three-on-two-1",
        "name": "Drei gegen zwei · Gestaffelte Startposition",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Gestaffelte Startposition“: Verteidiger starten einer höher, einer tiefer; Angriff erkennt die erste freie Seite."
      },
      {
        "id": "catalog-three-on-two-2",
        "name": "Drei gegen zwei · Nebeneinander starten",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Nebeneinander starten“: Verteidiger starten nebeneinander; Ballführer greift eine Lücke zwischen ihnen an."
      },
      {
        "id": "catalog-three-on-two-3",
        "name": "Drei gegen zwei · Maximal drei Pässe",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Maximal drei Pässe“: Überzahl mit höchstens drei Pässen ausspielen; ein schlechter Wurf ist kein Pflichtabschluss."
      },
      {
        "id": "catalog-three-on-two-4",
        "name": "Drei gegen zwei · Rückzugswechsel",
        "playersMin": 6,
        "playersMax": 18,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Rückzugswechsel“: Dritter Verteidiger kommt verzögert hinzu; vor seinem Eintreffen eine sichere Entscheidung treffen."
      }
    ]
  },
  {
    "familyId": "transition-defense",
    "familyName": "Rückzug und Zuordnung",
    "category": "Umschalten und Fastbreak",
    "minutes": 12,
    "goal": "Korb schützen, Ball aufnehmen und Mitspieler zuordnen.",
    "setup": "Drei Angreifer starten mit Ball, drei Verteidiger leicht versetzt.",
    "coachingPoints": [
      "Korb vor persönlicher Zuordnung sichern.",
      "Beim Rücklauf den Ball sehen."
    ],
    "repetitions": "6 kurze Umschaltaktionen, anschließend Rollen wechseln.",
    "successIndicator": "Verhinderte direkte Korbwege und klare Ansagen zählen.",
    "steps": [
      "Nächster Verteidiger schützt zunächst den Korb.",
      "Weitere Verteidiger nehmen Ball und freie Angreifer mit Ansagen auf."
    ],
    "variants": [
      {
        "id": "catalog-transition-defense-1",
        "name": "Rückzug und Zuordnung · Geordneter Rückzug",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Geordneter Rückzug“: Im moderaten Tempo die Reihenfolge Korb, Ball und Restzuordnung üben."
      },
      {
        "id": "catalog-transition-defense-2",
        "name": "Rückzug und Zuordnung · Start nach Fehlpass",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Start nach Fehlpass“: Trainer gibt den Ball unerwartet einem Angreifer; Defense organisiert sich sofort."
      },
      {
        "id": "catalog-transition-defense-3",
        "name": "Rückzug und Zuordnung · Ein Verteidiger verzögert",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Ein Verteidiger verzögert“: Ein Verteidiger startet später; die ersten beiden sichern kurzzeitig in Unterzahl."
      },
      {
        "id": "catalog-transition-defense-4",
        "name": "Rückzug und Zuordnung · Live Hin und Zurück",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Live Hin und Zurück“: Nach Abschluss oder Ballgewinn sofort Richtung wechseln und die Aufgaben neu verteilen."
      }
    ]
  },
  {
    "familyId": "secondary-break",
    "familyName": "Zweite Angriffswelle",
    "category": "Umschalten und Fastbreak",
    "minutes": 12,
    "goal": "Nach dem ersten Fastbreak strukturiert weiterspielen.",
    "setup": "Vier Angreifer, einer startet als nachlaufender Spieler.",
    "coachingPoints": [
      "Nachläufer nicht in die Korblaufspur drängen.",
      "Erst den freien Raum vor der nächsten Aktion lesen."
    ],
    "repetitions": "6 Durchgänge mit wechselndem Nachläufer.",
    "successIndicator": "Geordnete Anschlussaktionen ohne Ballstopp zählen.",
    "steps": [
      "Erste drei Spieler besetzen breite Abschluss- und Passpositionen.",
      "Nachläufer kommt kontrolliert dazu und schafft eine Anschlussoption."
    ],
    "variants": [
      {
        "id": "catalog-secondary-break-1",
        "name": "Zweite Angriffswelle · Nachläufer-Pass",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Nachläufer-Pass“: Ball nach dem ersten Vorstoß zum nachlaufenden Spieler zurückspielen und neu verteilen."
      },
      {
        "id": "catalog-secondary-break-2",
        "name": "Zweite Angriffswelle · Früher Ballblock",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Früher Ballblock“: Nachläufer stellt erst nach eigener Stabilisierung einen Ballblock."
      },
      {
        "id": "catalog-secondary-break-3",
        "name": "Zweite Angriffswelle · Gegenseite nutzen",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Gegenseite nutzen“: Nachläufer dreht den Ball zur ballfernen Seite, Außenläufer füllen ihre Positionen auf."
      },
      {
        "id": "catalog-secondary-break-4",
        "name": "Zweite Angriffswelle · Vier gegen drei",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb",
          "Hütchen"
        ],
        "task": "Variante „Vier gegen drei“: Drei Verteidiger stoppen den ersten Fastbreak; Nachläufer nutzt die verbleibende Überzahl."
      }
    ]
  },
  {
    "familyId": "one-v-one",
    "familyName": "Eins gegen eins",
    "category": "Kleine Spielformen",
    "minutes": 12,
    "goal": "Einen direkten Vorteil erkennen und kontrolliert nutzen.",
    "setup": "Angreifer und Verteidiger an einer klaren Startposition.",
    "coachingPoints": [
      "Vorteil mit Körper und Tempo schaffen.",
      "Nach einem Fehlversuch eine konkrete Entscheidung besprechen."
    ],
    "repetitions": "Je 6 Angriffe pro Spieler.",
    "successIndicator": "Erreichte Vorteile, Ballverluste und kontrollierte Abschlüsse zählen.",
    "steps": [
      "Ball kontrolliert ins Spiel bringen.",
      "Eine kurze Aktion bis zu Abschluss oder Ballgewinn spielen, danach wechseln."
    ],
    "variants": [
      {
        "id": "catalog-one-v-one-1",
        "name": "Eins gegen eins · Zwei-Dribbling-Spiel",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei-Dribbling-Spiel“: Vom Flügel mit höchstens zwei Dribblings angreifen; freie erste Linie suchen."
      },
      {
        "id": "catalog-one-v-one-2",
        "name": "Eins gegen eins · Start aus dem Closeout",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Start aus dem Closeout“: Verteidiger passt aus der Zone zum Angreifer und schließt kontrolliert."
      },
      {
        "id": "catalog-one-v-one-3",
        "name": "Eins gegen eins · Fang mit Rücken zum Korb",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fang mit Rücken zum Korb“: Mit Selbstpass in mittlerer Distanz starten; nach dem Fang erst öffnen und lesen."
      },
      {
        "id": "catalog-one-v-one-4",
        "name": "Eins gegen eins · Positionswechsel",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Positionswechsel“: Nach jeder Aktion neue Startposition an Flügel, Ecke oder oben wählen; eigenes Mittel anpassen."
      }
    ]
  },
  {
    "familyId": "two-v-two",
    "familyName": "Zwei gegen zwei",
    "category": "Kleine Spielformen",
    "minutes": 12,
    "goal": "Mit einem Mitspieler einen Vorteil erzeugen.",
    "setup": "Zwei Angreifer außen, zwei Verteidiger; halbes Feld.",
    "coachingPoints": [
      "Abstand halten, bevor die Aktion beginnt.",
      "Nach dem Pass weiter am Spiel teilnehmen."
    ],
    "repetitions": "6 Angriffe je Team, danach kurze Auswertung.",
    "successIndicator": "Freie Abschlüsse und Aktionen beider Angreifer erfassen.",
    "steps": [
      "Mit einem Pass oder einem kontrollierten Dribbling beginnen.",
      "Gemeinsam eine freie Abschlussmöglichkeit schaffen."
    ],
    "variants": [
      {
        "id": "catalog-two-v-two-1",
        "name": "Zwei gegen zwei · Pass und Cut",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass und Cut“: Nach jedem Pass zum Korb schneiden und danach wieder Abstand herstellen."
      },
      {
        "id": "catalog-two-v-two-2",
        "name": "Zwei gegen zwei · Hand-off",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Hand-off“: Angriff beginnt mit einer kontrollierten Ballübergabe; Verteidigung reagiert frei."
      },
      {
        "id": "catalog-two-v-two-3",
        "name": "Zwei gegen zwei · Ein Ballblock",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ein Ballblock“: Pro Angriff genau einen stationären Ballblock nutzen und dessen Vorteil ausspielen."
      },
      {
        "id": "catalog-two-v-two-4",
        "name": "Zwei gegen zwei · Ohne Dribbling",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ohne Dribbling“: Nur über Freilaufen und Passen zum Abschluss kommen; enge Räume durch neue Winkel öffnen."
      }
    ]
  },
  {
    "familyId": "three-v-three",
    "familyName": "Drei gegen drei",
    "category": "Kleine Spielformen",
    "minutes": 12,
    "goal": "Abstände, Entscheidungen und Anschlussaktionen verbinden.",
    "setup": "Drei Außenangreifer und drei Verteidiger im Halbfeld.",
    "coachingPoints": [
      "Ballferner Spieler bleibt anspielbar.",
      "Nicht nur die erste Aktion beobachten."
    ],
    "repetitions": "4 Spiele à 2 Minuten mit jeweils 1 Minute Rückmeldung.",
    "successIndicator": "Qualität der Würfe und Beteiligung aller drei Spieler notieren.",
    "steps": [
      "Mit breiten Positionen starten.",
      "Nach Pass, Cut oder Drive freie Räume auffüllen und weiterentscheiden."
    ],
    "variants": [
      {
        "id": "catalog-three-v-three-1",
        "name": "Drei gegen drei · Pflicht-Cut",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pflicht-Cut“: Nach jedem Pass schneidet der Passgeber zum Korb und füllt danach einen freien Platz."
      },
      {
        "id": "catalog-three-v-three-2",
        "name": "Drei gegen drei · Drive-and-kick",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drive-and-kick“: Ein Punkt extra, wenn ein Drive einen freien Pass und anschließenden offenen Abschluss erzeugt."
      },
      {
        "id": "catalog-three-v-three-3",
        "name": "Drei gegen drei · Schnelle Anschlussaktion",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Schnelle Anschlussaktion“: Nach Fang innerhalb etwa einer Sekunde werfen, passen oder dribbeln; bei Unsicherheit neu ordnen."
      },
      {
        "id": "catalog-three-v-three-4",
        "name": "Drei gegen drei · Weniger Dribblings",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Weniger Dribblings“: Pro Spieler höchstens zwei Dribblings je Ballbesitz; Vorteil vor allem über Pass und Bewegung schaffen."
      }
    ]
  },
  {
    "familyId": "four-v-four",
    "familyName": "Vier gegen vier",
    "category": "Kleine Spielformen",
    "minutes": 12,
    "goal": "Mehrere Räume besetzen und gemeinsam lesen.",
    "setup": "Vier Angreifer und vier Verteidiger im Halbfeld.",
    "coachingPoints": [
      "Zwei Spieler nicht denselben Raum besetzen lassen.",
      "Hilfsverteidigung mit dem nächsten Pass angreifen."
    ],
    "repetitions": "4 Runden à 2 Minuten.",
    "successIndicator": "Freie zweite Optionen und erfolgreiche defensive Rotationen zählen.",
    "steps": [
      "Breit und mit einem freien Korbraum starten.",
      "Nach jedem Angriffsvorteil die Anschlussoption auf der Gegenseite suchen."
    ],
    "variants": [
      {
        "id": "catalog-four-v-four-1",
        "name": "Vier gegen vier · Vier Außenpositionen",
        "playersMin": 8,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Vier Außenpositionen“: Alle vier Angreifer beginnen außen; nach Cuts einen freien Außenplatz auffüllen."
      },
      {
        "id": "catalog-four-v-four-2",
        "name": "Vier gegen vier · Drei außen, einer innen",
        "playersMin": 8,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drei außen, einer innen“: Innenposition mit Passfenstern nutzen, ohne die Drive-Spur dauerhaft zu blockieren."
      },
      {
        "id": "catalog-four-v-four-3",
        "name": "Vier gegen vier · Gegenseitenbonus",
        "playersMin": 8,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Gegenseitenbonus“: Ein zusätzlicher Punkt, wenn nach Hilfe zur Ballseite auf der Gegenseite frei abgeschlossen wird."
      },
      {
        "id": "catalog-four-v-four-4",
        "name": "Vier gegen vier · Stop und Transition",
        "playersMin": 8,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Stop und Transition“: Nach Ballgewinn zum gegenüberliegenden Korb umschalten; sofort neue Breite herstellen."
      }
    ]
  },
  {
    "familyId": "advantage-game",
    "familyName": "Vorteilspiel",
    "category": "Kleine Spielformen",
    "minutes": 12,
    "goal": "Einen bereits entstandenen Vorteil erhalten.",
    "setup": "Angreifer und Verteidiger mit bewusst versetzter Startposition.",
    "coachingPoints": [
      "Den Vorteil nicht durch unnötige Zusatzdribblings verlieren.",
      "Freien Spieler vor dem schweren Abschluss sehen."
    ],
    "repetitions": "8 kurze Aktionen, danach Startrollen tauschen.",
    "successIndicator": "Genutzte Überzahl, offene Würfe und verlorene Vorteile zählen.",
    "steps": [
      "Auf Signal starten.",
      "Den ersten freien Raum nutzen und vor der Rückkehr der Defense entscheiden."
    ],
    "variants": [
      {
        "id": "catalog-advantage-game-1",
        "name": "Vorteilspiel · Schultervorsprung",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Schultervorsprung“: Angreifer beginnt einen halben Schritt vor dem Verteidiger und greift zum Korb an."
      },
      {
        "id": "catalog-advantage-game-2",
        "name": "Vorteilspiel · Zwei gegen einen plus eins",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei gegen einen plus eins“: Zwei Angreifer gegen einen Verteidiger; zweiter Verteidiger startet nach dem ersten Pass."
      },
      {
        "id": "catalog-advantage-game-3",
        "name": "Vorteilspiel · Drei gegen zwei plus eins",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drei gegen zwei plus eins“: Dritter Verteidiger startet an der Grundlinie, sobald die Angreifer die erste Passentscheidung treffen."
      },
      {
        "id": "catalog-advantage-game-4",
        "name": "Vorteilspiel · Closeout-Kette",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Closeout-Kette“: Drei gegen drei beginnt mit einem späten Closeout; Angriff versucht den Vorteil durch Pässe weiterzugeben."
      }
    ]
  },
  {
    "familyId": "five-out",
    "familyName": "Five-out-Abstände",
    "category": "Teamangriff",
    "minutes": 14,
    "goal": "Fünf Außenpositionen mit Bewegung und freiem Korbraum verbinden.",
    "setup": "Fünf Außenplätze gleichmäßig um die Zone verteilen.",
    "coachingPoints": [
      "Nicht gleichzeitig in dieselbe Korblinie schneiden.",
      "Nach dem Cut wieder eine freie Außenposition suchen."
    ],
    "repetitions": "4 Runden à 90 Sekunden mit kurzer Besprechung.",
    "successIndicator": "Freie Korbräume, klare Cuts und passende Abstände beurteilen.",
    "steps": [
      "Ball bewegen und nach dem Pass eine klare Bewegung ausführen.",
      "Freie Außenplätze mit ausreichendem Abstand neu besetzen."
    ],
    "variants": [
      {
        "id": "catalog-five-out-1",
        "name": "Five-out-Abstände · Fünf gegen null",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Fünf gegen null“: Ohne Defense nach jedem Pass schneiden und geordnet auffüllen."
      },
      {
        "id": "catalog-five-out-2",
        "name": "Five-out-Abstände · Drive-Fenster",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drive-Fenster“: Ein Spieler greift per Dribbling an; die anderen verschieben in freie Passfenster."
      },
      {
        "id": "catalog-five-out-3",
        "name": "Five-out-Abstände · Geführte Defense",
        "playersMin": 10,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Geführte Defense“: Defense spielt mit kontrolliertem Tempo; Angriff hält die Abstände und reagiert auf Hilfe."
      },
      {
        "id": "catalog-five-out-4",
        "name": "Five-out-Abstände · Live mit Cut-Bonus",
        "playersMin": 10,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live mit Cut-Bonus“: Frei fünf gegen fünf; einen Zusatzpunkt für einen freien Korbabschluss nach Pass und Cut vergeben."
      }
    ]
  },
  {
    "familyId": "four-out-one-in",
    "familyName": "Vier außen, einer innen",
    "category": "Teamangriff",
    "minutes": 14,
    "goal": "Innen- und Außenspiel ohne verstopfte Drive-Wege verbinden.",
    "setup": "Vier Außenplätze und eine wechselnde Innenposition.",
    "coachingPoints": [
      "Innenposition nicht starr unter dem Korb halten.",
      "Außenabstände trotz Postpass erhalten."
    ],
    "repetitions": "4 Runden à 90 Sekunden.",
    "successIndicator": "Freie Post-Fänge und offene Drive-Spuren zählen.",
    "steps": [
      "Ball außen bewegen.",
      "Innenspieler bietet sich passend zum Ball an und räumt bei einem Drive die direkte Spur."
    ],
    "variants": [
      {
        "id": "catalog-four-out-one-in-1",
        "name": "Vier außen, einer innen · Postpass und Cut",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Postpass und Cut“: Ohne Defense in den Post passen; Passgeber schneidet, andere halten freie Passfenster."
      },
      {
        "id": "catalog-four-out-one-in-2",
        "name": "Vier außen, einer innen · Innenspieler wechselt Seite",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Innenspieler wechselt Seite“: Bei Ballumkehr wechselt der Innenspieler kontrolliert auf die neue Ballseite."
      },
      {
        "id": "catalog-four-out-one-in-3",
        "name": "Vier außen, einer innen · Drive und Innenpass",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drive und Innenpass“: Außenspieler greift an, Innenspieler löst aus der Fahrspur in eine kurze Passoption."
      },
      {
        "id": "catalog-four-out-one-in-4",
        "name": "Vier außen, einer innen · Live mit Raumauftrag",
        "playersMin": 10,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live mit Raumauftrag“: Fünf gegen fünf; nach jeder Aktion prüfen, ob Innenposition und Drive-Weg gleichzeitig nutzbar waren."
      }
    ]
  },
  {
    "familyId": "zone-offense",
    "familyName": "Gegen Raumverteidigung",
    "category": "Teamangriff",
    "minutes": 14,
    "goal": "Lücken zwischen Verteidigungsbereichen finden.",
    "setup": "Außenangreifer, High-Post- und Grundlinienpositionen festlegen.",
    "coachingPoints": [
      "Zwischen Verteidigern anspielbar werden.",
      "Nicht nur außen im Kreis passen."
    ],
    "repetitions": "4 Runden à 90 Sekunden.",
    "successIndicator": "Fänge in Lücken und freie Würfe nach Ballumkehr erfassen.",
    "steps": [
      "Ball zügig bewegen und eine Lücke angreifen.",
      "Nach Verschieben der Defense die nächste freie Position nutzen."
    ],
    "variants": [
      {
        "id": "catalog-zone-offense-1",
        "name": "Gegen Raumverteidigung · Lücken ohne Defense",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Lücken ohne Defense“: Fünf gegen null: nach jedem Außenpass High Post und kurze Ecke als Ziele zeigen."
      },
      {
        "id": "catalog-zone-offense-2",
        "name": "Gegen Raumverteidigung · High-Post-Anschluss",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „High-Post-Anschluss“: Fünf Angreifer gegen zwei passive Innenverteidiger; Fang am High Post und nächste freie Option üben."
      },
      {
        "id": "catalog-zone-offense-3",
        "name": "Gegen Raumverteidigung · Grundlinienwechsel",
        "playersMin": 8,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Grundlinienwechsel“: Fünf Angreifer gegen drei Zonenverteidiger; Grundlinienläufer findet nach Ballumkehr die freie kurze Ecke."
      },
      {
        "id": "catalog-zone-offense-4",
        "name": "Gegen Raumverteidigung · Live gegen Zone",
        "playersMin": 10,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live gegen Zone“: Fünf gegen fünf gegen eine vorher festgelegte Raumverteidigung; Entscheidungen an den tatsächlichen Lücken ausrichten."
      }
    ]
  },
  {
    "familyId": "press-break",
    "familyName": "Druck beim Ballvortrag lösen",
    "category": "Teamangriff",
    "minutes": 14,
    "goal": "Breite, Rückpass und diagonale Passlinien bereitstellen.",
    "setup": "Fünf Angreifer starten nach einem gedachten Einwurf.",
    "coachingPoints": [
      "Nicht alle zum Ball kommen.",
      "Ball nicht blind in eine Falle dribbeln."
    ],
    "repetitions": "6 Vorträge bis ins Vorfeld, anschließend Rollenbesprechung.",
    "successIndicator": "Sichere erste Pässe und vermiedene Ballverluste zählen.",
    "steps": [
      "Zuerst einen sicheren ersten Pass ermöglichen.",
      "Ballfänger erhält seitliche, diagonale und rückwärtige Unterstützung."
    ],
    "variants": [
      {
        "id": "catalog-press-break-1",
        "name": "Druck beim Ballvortrag lösen · Aufstellung ohne Defense",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Aufstellung ohne Defense“: Ersten Pass, Rückpassoption und diagonalen Empfänger langsam durchgehen."
      },
      {
        "id": "catalog-press-break-2",
        "name": "Druck beim Ballvortrag lösen · Ersten Pass verteidigen",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ersten Pass verteidigen“: Zwei Verteidiger stören die ersten Empfänger; über Freilaufen und Rückpass lösen."
      },
      {
        "id": "catalog-press-break-3",
        "name": "Druck beim Ballvortrag lösen · Falle an der Seite",
        "playersMin": 8,
        "playersMax": 16,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Falle an der Seite“: Drei Verteidiger stellen kontrolliert eine Seitenfalle; Angreifer schaffen früh eine Rückpasslinie."
      },
      {
        "id": "catalog-press-break-4",
        "name": "Druck beim Ballvortrag lösen · Live Ganzfelddruck",
        "playersMin": 10,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live Ganzfelddruck“: Fünf gegen fünf über das Feld; nach jedem Vortrag die entscheidende freie Passoption besprechen."
      }
    ]
  },
  {
    "familyId": "inbound",
    "familyName": "Einwurf gemeinsam lösen",
    "category": "Teamangriff",
    "minutes": 14,
    "goal": "Mit Timing einen sicheren ersten Pass schaffen.",
    "setup": "Einwerfer außerhalb, vier Mitspieler im Feld; Startpunkte markieren.",
    "coachingPoints": [
      "Einwerfer braucht eine sichere Rückfalloption.",
      "Laufwege nicht gleichzeitig kreuzen lassen."
    ],
    "repetitions": "Je 6 Einwürfe von Grund- und Seitenlinie.",
    "successIndicator": "Sichere erste Pässe innerhalb der Spielregeln zählen.",
    "steps": [
      "Einwerfer und Mitspieler stellen Blickkontakt her.",
      "Mit klaren Cuts oder regelgerechten Blocks einen freien Empfänger schaffen."
    ],
    "variants": [
      {
        "id": "catalog-inbound-1",
        "name": "Einwurf gemeinsam lösen · Grundlinie ohne Defense",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Grundlinie ohne Defense“: Zwei klare Laufwege und eine sichere äußere Anspielstation festlegen."
      },
      {
        "id": "catalog-inbound-2",
        "name": "Einwurf gemeinsam lösen · Seitenlinie ohne Defense",
        "playersMin": 5,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Seitenlinie ohne Defense“: Empfänger lösen sich mit entgegengesetzten Bewegungen; Einwerfer liest den ersten freien Weg."
      },
      {
        "id": "catalog-inbound-3",
        "name": "Einwurf gemeinsam lösen · Ersten Weg schließen",
        "playersMin": 7,
        "playersMax": 14,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Ersten Weg schließen“: Zwei Verteidiger nehmen die erste Option weg; zweite und sichere äußere Option nutzen."
      },
      {
        "id": "catalog-inbound-4",
        "name": "Einwurf gemeinsam lösen · Live fünf gegen fünf",
        "playersMin": 10,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Live fünf gegen fünf“: Einwurf mit voller Defense; nach dem Fang ohne Unterbrechung im Angriff weiterspielen."
      }
    ]
  },
  {
    "familyId": "warm-balance",
    "familyName": "Balance mit Ball",
    "category": "Aufwärmen",
    "minutes": 7,
    "goal": "Vor dem Training kontrollierte Körperpositionen aktivieren.",
    "setup": "Freie Fläche, ein Ball pro Spieler.",
    "coachingPoints": [
      "Nur im schmerzfreien, gut kontrollierten Bereich bewegen.",
      "Qualität vor Bewegungsweite."
    ],
    "repetitions": "2 Runden à 4 Aufgaben mit je 20 Sekunden.",
    "successIndicator": "Ruhige Standpositionen ohne Ausgleichsschritte beobachten.",
    "steps": [
      "In ruhigem Tempo zwischen stabilen Positionen wechseln.",
      "Ballbewegung mit Balance verbinden und sauber zurückstellen."
    ],
    "variants": [
      {
        "id": "catalog-warm-balance-1",
        "name": "Balance mit Ball · Ball um den Körper",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ball um den Körper“: Ball um Hüfte und Oberkörper führen, Füße stehen stabil."
      },
      {
        "id": "catalog-warm-balance-2",
        "name": "Balance mit Ball · Einbein-Ballführung",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Einbein-Ballführung“: Kurz auf einem Bein stehen und den Ball langsam um die Hüfte führen, dann wechseln."
      },
      {
        "id": "catalog-warm-balance-3",
        "name": "Balance mit Ball · Ausfallschritt und Ball",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ausfallschritt und Ball“: Kleinen Ausfallschritt setzen, Ball kontrolliert zur vorderen Seite führen und zurückstellen."
      },
      {
        "id": "catalog-warm-balance-4",
        "name": "Balance mit Ball · Partner-Fangbalance",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Partner-Fangbalance“: Partner spielt weiche kurze Pässe; Fänger stabilisiert sich nach jedem Fang auf beiden Füßen."
      }
    ]
  },
  {
    "familyId": "warm-route",
    "familyName": "Bewegungsparcours mit Ball",
    "category": "Aufwärmen",
    "minutes": 7,
    "goal": "Laufen, Stoppen und Richtungswechsel vorbereiten.",
    "setup": "Vier Stationen in einer freien Hallenhälfte markieren.",
    "coachingPoints": [
      "Tempo langsam steigern.",
      "Ausreichend Abstand zwischen Spielern lassen."
    ],
    "repetitions": "3 lockere Durchgänge, kurze Pause zwischen den Runden.",
    "successIndicator": "Kontrollierte Stopps und freie Laufwege beobachten.",
    "steps": [
      "Stationen in gleichmäßiger Reihenfolge anlaufen.",
      "An jeder Station eine klar benannte Bewegung ausführen."
    ],
    "variants": [
      {
        "id": "catalog-warm-route-1",
        "name": "Bewegungsparcours mit Ball · Laufen und Stoppen",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Laufen und Stoppen“: An jeder Station beidbeinig stoppen, Ball sichern und ruhig weiterlaufen."
      },
      {
        "id": "catalog-warm-route-2",
        "name": "Bewegungsparcours mit Ball · Seitwärts und vorwärts",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Seitwärts und vorwärts“: Zwischen den Stationen seitliches Dribbling und Vorwärtsdribbling abwechseln."
      },
      {
        "id": "catalog-warm-route-3",
        "name": "Bewegungsparcours mit Ball · Pivotstation",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Pivotstation“: An zwei Stationen einen legalen Pivot nach Ballaufnahme, danach mit neuem Start weiter."
      },
      {
        "id": "catalog-warm-route-4",
        "name": "Bewegungsparcours mit Ball · Farbauftrag",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Farbauftrag“: Trainer nennt die nächste freie Station; Spieler ändern den Weg mit Blick auf die anderen."
      }
    ]
  },
  {
    "familyId": "warm-partner",
    "familyName": "Partnerreaktion",
    "category": "Aufwärmen",
    "minutes": 7,
    "goal": "Blickkontakt und kurze Reaktionen vor dem Hauptteil aktivieren.",
    "setup": "Paare mit etwa zwei Metern Abstand.",
    "coachingPoints": [
      "Kleine Bewegungen nutzen.",
      "Keine unvorhergesehenen Berührungen oder Kollisionen."
    ],
    "repetitions": "4 Runden à 25 Sekunden.",
    "successIndicator": "Richtige Reaktionen und stabile Endpositionen zählen.",
    "steps": [
      "Partner gibt eine einfache Bewegung vor.",
      "Zweiter Spieler reagiert kontrolliert, dann Rollen tauschen."
    ],
    "variants": [
      {
        "id": "catalog-warm-partner-1",
        "name": "Partnerreaktion · Spiegelbewegung",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Spiegelbewegung“: Ohne Ball kurze Seitwärtsschritte und Stopps spiegeln."
      },
      {
        "id": "catalog-warm-partner-2",
        "name": "Partnerreaktion · Passsignal",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Passsignal“: Ball nur dann passen, wenn der Partner beide Fanghände zeigt."
      },
      {
        "id": "catalog-warm-partner-3",
        "name": "Partnerreaktion · Ball und Richtungszeichen",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ball und Richtungszeichen“: Ein Spieler dribbelt, der andere zeigt die Richtung für einen kurzen Seitwärtsschritt."
      },
      {
        "id": "catalog-warm-partner-4",
        "name": "Partnerreaktion · Signalwechsel",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Signalwechsel“: Zwischen Fangsignal und Richtungssignal wechseln; erst erkennen, dann handeln."
      }
    ]
  },
  {
    "familyId": "deceleration",
    "familyName": "Abbremsen und Landen",
    "category": "Aufwärmen",
    "minutes": 7,
    "goal": "Kurze Bewegungen kontrolliert beenden.",
    "setup": "Kurze freie Laufstrecke und sichere Stoppfläche.",
    "coachingPoints": [
      "Landung leise und kontrolliert.",
      "Keine maximalen Sprünge im kalten Zustand."
    ],
    "repetitions": "3 Serien à 5 kontrollierte Aktionen.",
    "successIndicator": "Nachschritte und Balanceverluste beobachten.",
    "steps": [
      "Mit moderatem Tempo anlaufen.",
      "Über mehrere kleine Schritte abbremsen und stabil stehen bleiben."
    ],
    "variants": [
      {
        "id": "catalog-deceleration-1",
        "name": "Abbremsen und Landen · Dreischritt-Bremse",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Dreischritt-Bremse“: Mit drei kürzer werdenden Schritten zum Stillstand kommen."
      },
      {
        "id": "catalog-deceleration-2",
        "name": "Abbremsen und Landen · Kleiner Sprungstopp",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Kleiner Sprungstopp“: Aus sehr kurzem Anlauf einen kleinen beidbeinigen Stopp setzen und halten."
      },
      {
        "id": "catalog-deceleration-3",
        "name": "Abbremsen und Landen · Seitlicher Stopp",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Seitlicher Stopp“: Zwei Seitwärtsschritte, dann in stabiler Grundposition stoppen."
      },
      {
        "id": "catalog-deceleration-4",
        "name": "Abbremsen und Landen · Stopp nach Signal",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Stopp nach Signal“: Trainer gibt innerhalb einer kurzen Strecke ein Stoppsignal; weich abbremsen statt abrupt einzufrieren."
      }
    ]
  },
  {
    "familyId": "warm-pass-flow",
    "familyName": "Passfluss zum Einstieg",
    "category": "Aufwärmen",
    "minutes": 7,
    "goal": "Passen und Weiterlaufen mit geringer Intensität verbinden.",
    "setup": "Dreieck oder Viereck mit großen freien Passwegen.",
    "coachingPoints": [
      "Fanghände früh zeigen.",
      "Laufweg nicht durch die aktuelle Passlinie führen."
    ],
    "repetitions": "3 Runden à 90 Sekunden mit kurzen Pausen.",
    "successIndicator": "Fangbare Pässe und durchgehenden Bewegungsfluss zählen.",
    "steps": [
      "Ball zur nächsten Station passen.",
      "Nach dem Pass eine freie Position anlaufen."
    ],
    "variants": [
      {
        "id": "catalog-warm-pass-flow-1",
        "name": "Passfluss zum Einstieg · Dreieck nachlaufen",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Dreieck nachlaufen“: Dem eigenen Pass zur nächsten Station folgen."
      },
      {
        "id": "catalog-warm-pass-flow-2",
        "name": "Passfluss zum Einstieg · Viereck quer laufen",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Viereck quer laufen“: Nach dem Pass zur freien gegenüberliegenden Station laufen."
      },
      {
        "id": "catalog-warm-pass-flow-3",
        "name": "Passfluss zum Einstieg · Zwei Bälle",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen",
          "Zweiter Basketball"
        ],
        "task": "Variante „Zwei Bälle“: Zweiten Ball mit ausreichend Abstand starten; vor jedem Pass Blickkontakt suchen."
      },
      {
        "id": "catalog-warm-pass-flow-4",
        "name": "Passfluss zum Einstieg · Freie Station rufen",
        "playersMin": 4,
        "playersMax": 16,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Freie Station rufen“: Empfänger benennt vor dem Fang die nächste freie Station, dann dorthin weiterpassen."
      }
    ]
  },
  {
    "familyId": "head-up",
    "familyName": "Blick vom Ball lösen",
    "category": "Koordination und Wahrnehmung",
    "minutes": 7,
    "goal": "Während der Ballkontrolle Informationen im Feld wahrnehmen.",
    "setup": "Freie Fläche; Trainer steht vor den Spielern.",
    "coachingPoints": [
      "Aufgabe nur steigern, wenn Ballkontrolle erhalten bleibt.",
      "Kopf nicht dauerhaft nach unten nehmen."
    ],
    "repetitions": "4 Runden à 25 Sekunden mit kurzer Pause.",
    "successIndicator": "Richtig erkannte Signale und Ballverluste getrennt zählen.",
    "steps": [
      "Ruhig dribbeln oder den Ball kontrolliert führen.",
      "Gleichzeitig ein einfaches sichtbares Signal erkennen."
    ],
    "variants": [
      {
        "id": "catalog-head-up-1",
        "name": "Blick vom Ball lösen · Fingerzahlen",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Fingerzahlen“: Trainer zeigt Fingerzahlen, Spieler nennen sie laut beim Dribbeln."
      },
      {
        "id": "catalog-head-up-2",
        "name": "Blick vom Ball lösen · Zwei Signalgeber",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Zwei Signalgeber“: Partner zeigt Signale abwechselnd links und rechts außerhalb der direkten Blickmitte."
      },
      {
        "id": "catalog-head-up-3",
        "name": "Blick vom Ball lösen · Farbrichtung",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Farbrichtung“: Trainer zeigt farbige Markierungen für kurze Schritte in verschiedene Richtungen."
      },
      {
        "id": "catalog-head-up-4",
        "name": "Blick vom Ball lösen · Signal im Lauf",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Signal im Lauf“: Langsam vorwärtsdribbeln und erst nach dem sichtbaren Signal das seitliche Ziel wählen."
      }
    ]
  },
  {
    "familyId": "catch-reaction",
    "familyName": "Fangreaktion",
    "category": "Koordination und Wahrnehmung",
    "minutes": 7,
    "goal": "Auf eine unaufgeregte, wechselnde Ballflugbahn reagieren.",
    "setup": "Zwei Partner mit ausreichend Abstand; weiche, fangbare Zuspiele.",
    "coachingPoints": [
      "Hände zum Ball führen.",
      "Zuspiele bleiben im erreichbaren Bereich."
    ],
    "repetitions": "3 Serien à 12 Zuspiele je Spieler.",
    "successIndicator": "Saubere Fänge ohne Nachgreifen zählen.",
    "steps": [
      "Partner zeigt Bereitschaft.",
      "Ball aus wechselnder Richtung fangen und stabil zum Pass zurückstellen."
    ],
    "variants": [
      {
        "id": "catalog-catch-reaction-1",
        "name": "Fangreaktion · Verschiedene Fanghöhen",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Verschiedene Fanghöhen“: Partner passt abwechselnd auf Brust-, Hüft- und Schulterhöhe."
      },
      {
        "id": "catalog-catch-reaction-2",
        "name": "Fangreaktion · Drehung vor dem Fang",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Drehung vor dem Fang“: Fänger steht leicht seitlich und öffnet erst auf Zuruf zum Pass."
      },
      {
        "id": "catalog-catch-reaction-3",
        "name": "Fangreaktion · Boden oder direkt",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Boden oder direkt“: Passgeber wechselt zwischen direktem Pass und Bodenpass, ohne die Wahl vorher anzusagen."
      },
      {
        "id": "catalog-catch-reaction-4",
        "name": "Fangreaktion · Zwei Passoptionen",
        "playersMin": 3,
        "playersMax": 18,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Zwei Passoptionen“: Zwei Passgeber wechseln sich sichtbar ab; Fänger orientiert sich zum tatsächlich ballführenden Spieler."
      }
    ]
  },
  {
    "familyId": "dual-task",
    "familyName": "Ball und Fußrhythmus",
    "category": "Koordination und Wahrnehmung",
    "minutes": 7,
    "goal": "Zwei einfache Bewegungsmuster unabhängig verbinden.",
    "setup": "Freie Bodenlinien oder zwei Markierungen, ein Ball pro Spieler.",
    "coachingPoints": [
      "Zuerst langsam, dann flüssig.",
      "Ballkontrolle nicht durch hektische Füße verlieren."
    ],
    "repetitions": "4 Runden à 20 Sekunden.",
    "successIndicator": "Fehlerfreie Folgen und Ballverluste je Muster notieren.",
    "steps": [
      "Ein gleichmäßiges Dribbling starten.",
      "Dazu eine kurze, kontrollierte Fußfolge ausführen."
    ],
    "variants": [
      {
        "id": "catalog-dual-task-1",
        "name": "Ball und Fußrhythmus · Über die Linie",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Über die Linie“: Im Dribbling abwechselnd einen Fuß über die Linie und zurück setzen."
      },
      {
        "id": "catalog-dual-task-2",
        "name": "Ball und Fußrhythmus · Vor-seit-zurück",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Vor-seit-zurück“: Drei kleine Schritte nach vorne, zur Seite und zurück mit gleichmäßigem Dribbling verbinden."
      },
      {
        "id": "catalog-dual-task-3",
        "name": "Ball und Fußrhythmus · Hand-Fuß-Wechsel",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Hand-Fuß-Wechsel“: Nach jeder vollständigen Fußfolge die Dribbelhand wechseln."
      },
      {
        "id": "catalog-dual-task-4",
        "name": "Ball und Fußrhythmus · Zwei Bälle und Linie",
        "playersMin": 1,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Zweiter Basketball"
        ],
        "task": "Variante „Zwei Bälle und Linie“: Zwei Bälle abwechselnd dribbeln und langsam über die Linie vor- und zurückgehen."
      }
    ]
  },
  {
    "familyId": "mirror-ball",
    "familyName": "Dribbelspiegel",
    "category": "Koordination und Wahrnehmung",
    "minutes": 7,
    "goal": "Bewegungen eines Gegenübers lesen und nachbilden.",
    "setup": "Zwei Spieler gegenüber in einem freien kleinen Feld.",
    "coachingPoints": [
      "Rumpf statt nur Ball beobachten.",
      "Keine abrupten Wege in den Partner hinein."
    ],
    "repetitions": "4 Runden à 30 Sekunden, Führung nach jeder Runde tauschen.",
    "successIndicator": "Richtungsfehler und gehaltenen Abstand beobachten.",
    "steps": [
      "Führender Spieler bewegt sich kontrolliert mit Ball.",
      "Partner hält Abstand und spiegelt die Richtung."
    ],
    "variants": [
      {
        "id": "catalog-mirror-ball-1",
        "name": "Dribbelspiegel · Seitlicher Spiegel",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Grundlagen",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Seitlicher Spiegel“: Nur seitlich bewegen und die Dribbelhand frei wählen."
      },
      {
        "id": "catalog-mirror-ball-2",
        "name": "Dribbelspiegel · Vor und zurück",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Vor und zurück“: Zusätzlich kurze Vorwärts- und Rückwärtsbewegungen erlauben."
      },
      {
        "id": "catalog-mirror-ball-3",
        "name": "Dribbelspiegel · Höhenwechsel",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Aufbau",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Höhenwechsel“: Führender Spieler verändert auch die Ballhöhe; Partner übernimmt Richtung und Höhe."
      },
      {
        "id": "catalog-mirror-ball-4",
        "name": "Dribbelspiegel · Führung auf Signal",
        "playersMin": 2,
        "playersMax": 20,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball"
        ],
        "task": "Variante „Führung auf Signal“: Trainer wechselt mitten in der Runde die führende Person; beide setzen ohne Stopp fort."
      }
    ]
  },
  {
    "familyId": "choice-gates",
    "familyName": "Reaktion auf freie Wege",
    "category": "Koordination und Wahrnehmung",
    "minutes": 7,
    "goal": "Eine Bewegung erst nach Wahrnehmung eines Signals wählen.",
    "setup": "Drei Hütchentore in einem Halbkreis, Startpunkt davor.",
    "coachingPoints": [
      "Vor dem Antritt das Ziel sehen.",
      "Rückweg von anlaufenden Spielern freihalten."
    ],
    "repetitions": "Je 8 Entscheidungen pro Spieler.",
    "successIndicator": "Richtige Tore und kontrollierte Antritte zählen.",
    "steps": [
      "Am Start kontrolliert dribbeln.",
      "Auf Signal das passende freie Tor ansteuern und zurückkehren."
    ],
    "variants": [
      {
        "id": "catalog-choice-gates-1",
        "name": "Reaktion auf freie Wege · Farbe nennt Tor",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Farbe nennt Tor“: Trainer nennt die Farbe des anzulaufenden Tors."
      },
      {
        "id": "catalog-choice-gates-2",
        "name": "Reaktion auf freie Wege · Zeigen statt Rufen",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Zeigen statt Rufen“: Trainer zeigt nur auf ein Tor; Blick beim Dribbling oben halten."
      },
      {
        "id": "catalog-choice-gates-3",
        "name": "Reaktion auf freie Wege · Ein Tor gesperrt",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Ein Tor gesperrt“: Partner stellt sich passiv vor eines der Tore; ein anderes freies Tor auswählen."
      },
      {
        "id": "catalog-choice-gates-4",
        "name": "Reaktion auf freie Wege · Spätes Umsignal",
        "playersMin": 1,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Hütchen"
        ],
        "task": "Variante „Spätes Umsignal“: Nach dem ersten Dribbling zeigt Trainer ein anderes freies Tor; kontrolliert umsteuern statt blind weiterlaufen."
      }
    ]
  },
  {
    "familyId": "spot-challenge",
    "familyName": "Spot-Wurfwettbewerb",
    "category": "Wettbewerbe und Entscheidungsaufgaben",
    "minutes": 10,
    "goal": "Treffsicherheit mit einer klaren, begrenzten Aufgabe messen.",
    "setup": "Drei bis fünf Wurfpositionen in individuell sicherer Distanz markieren.",
    "coachingPoints": [
      "Gleiche Bedingungen für Vergleiche nutzen.",
      "Distanz an das Niveau anpassen."
    ],
    "repetitions": "Je 5 Versuche von 4 Positionen, danach Auswertung.",
    "successIndicator": "Treffer je Position und Gesamtquote dokumentieren.",
    "steps": [
      "Von einer Position eine kurze Serie werfen.",
      "Ergebnis notieren und erst danach zur nächsten Position wechseln."
    ],
    "variants": [
      {
        "id": "catalog-spot-challenge-1",
        "name": "Spot-Wurfwettbewerb · Eigene Bestmarke",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Eigene Bestmarke“: Den eigenen bisherigen Wert unter denselben Bedingungen vergleichen, ohne andere Distanzen zu mischen."
      },
      {
        "id": "catalog-spot-challenge-2",
        "name": "Spot-Wurfwettbewerb · Partner abwechselnd",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Partner abwechselnd“: Nach jedem Wurf wechseln; jeder führt seine eigene Trefferzahl."
      },
      {
        "id": "catalog-spot-challenge-3",
        "name": "Spot-Wurfwettbewerb · Trefferleiter",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Trefferleiter“: Für zwei Treffer in einer Positionsserie einen Punkt vergeben; nach maximal fünf Versuchen weitergehen."
      },
      {
        "id": "catalog-spot-challenge-4",
        "name": "Spot-Wurfwettbewerb · Spot nach Passsignal",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Spot nach Passsignal“: Partner benennt den nächsten Spot erst nach dem Rebound; dort anspielbereit werden und werfen."
      }
    ]
  },
  {
    "familyId": "finish-challenge",
    "familyName": "Abschluss-Challenge",
    "category": "Wettbewerbe und Entscheidungsaufgaben",
    "minutes": 10,
    "goal": "Verschiedene Korbabschlüsse bewusst auswählen.",
    "setup": "Zwei Startseiten und eine freie Reboundbahn am Korb.",
    "coachingPoints": [
      "Schrittfolge und Balance mitwerten.",
      "Schwierige Bewegung nicht auf Kosten der Kontrolle erzwingen."
    ],
    "repetitions": "12 Versuche pro Spieler mit Wechsel der Startseite.",
    "successIndicator": "Treffer und korrekt erfüllte Abschlussaufträge zählen.",
    "steps": [
      "Mit kontrolliertem Anlauf zum Korb gehen.",
      "Einen zur Aufgabe passenden Abschluss ausführen und Ergebnis notieren."
    ],
    "variants": [
      {
        "id": "catalog-finish-challenge-1",
        "name": "Abschluss-Challenge · Abschlusskarten",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Abschlusskarten“: Vor jedem Versuch eine bekannte Abschlussart nennen, beispielsweise Korbleger oder beidbeiniger Abschluss."
      },
      {
        "id": "catalog-finish-challenge-2",
        "name": "Abschluss-Challenge · Beide Hände",
        "playersMin": 1,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Beide Hände“: Je sechs kontrollierte Abschlüsse mit jeder Hand aus passender Nahposition durchführen."
      },
      {
        "id": "catalog-finish-challenge-3",
        "name": "Abschluss-Challenge · Pass vor Abschluss",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Pass vor Abschluss“: Partner spielt aus wechselndem Winkel; Fang und verlangten Abschluss verbinden."
      },
      {
        "id": "catalog-finish-challenge-4",
        "name": "Abschluss-Challenge · Defense entscheidet",
        "playersMin": 2,
        "playersMax": 10,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Defense entscheidet“: Partner schützt passiv eine Korbseite; frei werdende Seite und passende Abschlussart auswählen."
      }
    ]
  },
  {
    "familyId": "passing-challenge",
    "familyName": "Passfenster-Wettbewerb",
    "category": "Wettbewerbe und Entscheidungsaufgaben",
    "minutes": 10,
    "goal": "Passgenauigkeit über unterschiedliche Aufgaben vergleichen.",
    "setup": "Zwei Partner oder drei Spieler im Dreieck mit freien Passlinien.",
    "coachingPoints": [
      "Nur fangbare Pässe zählen.",
      "Fehler als Hinweis auf Abstand oder Technik nutzen."
    ],
    "repetitions": "3 Runden à 60 Sekunden mit 30 Sekunden Pause.",
    "successIndicator": "Fangbare Pässe und Fehler je Runde getrennt zählen.",
    "steps": [
      "Ein klares Fangfenster vereinbaren.",
      "Die vorgegebene Passaufgabe mit kontrolliertem Tempo absolvieren."
    ],
    "variants": [
      {
        "id": "catalog-passing-challenge-1",
        "name": "Passfenster-Wettbewerb · Zwölf sichere Pässe",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Grundlagen",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwölf sichere Pässe“: In einer Runde höchstens zwölf Pässe spielen und die Zahl sauberer Fänge notieren."
      },
      {
        "id": "catalog-passing-challenge-2",
        "name": "Passfenster-Wettbewerb · Beide Passhände",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Beide Passhände“: Einhändige Pässe mit links und rechts abwechseln, Empfänger zeigt den Zielpunkt."
      },
      {
        "id": "catalog-passing-challenge-3",
        "name": "Passfenster-Wettbewerb · Dreieck mit Richtungsruf",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Dreieck mit Richtungsruf“: Empfänger ruft vor dem Fang den nächsten Passpartner; Passrichtung wechselt entsprechend."
      },
      {
        "id": "catalog-passing-challenge-4",
        "name": "Passfenster-Wettbewerb · Zwei gegen einen Passdruck",
        "playersMin": 3,
        "playersMax": 15,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei gegen einen Passdruck“: Ein Verteidiger stört die Passlinie; Angreifer zählen sichere Pässe nach verändertem Winkel."
      }
    ]
  },
  {
    "familyId": "stop-challenge",
    "familyName": "Defensive Stopps sammeln",
    "category": "Wettbewerbe und Entscheidungsaufgaben",
    "minutes": 10,
    "goal": "Erfolgreiche Verteidigungsaktionen sichtbar machen.",
    "setup": "Paare oder kleine Teams im Halbfeld, klare Startposition.",
    "coachingPoints": [
      "Ein Stopp benötigt kontrollierten Ballbesitz oder ein klares Aktionsende.",
      "Nicht nur Fehlwürfe, sondern auch Position bewerten."
    ],
    "repetitions": "6 Angriffe je Rolle oder Team.",
    "successIndicator": "Stopps, Fouls und zugelassene freie Abschlüsse getrennt erfassen.",
    "steps": [
      "Eine kurze Angriffsaktion spielen.",
      "Nach Abschluss, Ballgewinn oder Ausball neu zuordnen."
    ],
    "variants": [
      {
        "id": "catalog-stop-challenge-1",
        "name": "Defensive Stopps sammeln · Drive verhindern",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drive verhindern“: Angreifer hat zwei Dribblings; Defense erhält einen Punkt für verhinderten direkten Korbweg."
      },
      {
        "id": "catalog-stop-challenge-2",
        "name": "Defensive Stopps sammeln · Closeout und Rebound",
        "playersMin": 2,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Closeout und Rebound“: Aktion startet mit Closeout; Stopp zählt erst nach gesichertem Rebound."
      },
      {
        "id": "catalog-stop-challenge-3",
        "name": "Defensive Stopps sammeln · Zwei-gegen-zwei-Stopp",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Zwei-gegen-zwei-Stopp“: Defense muss Ball, Cut und Rebound gemeinsam sichern; nach jedem Angriff Rollen tauschen."
      },
      {
        "id": "catalog-stop-challenge-4",
        "name": "Defensive Stopps sammeln · Drei Stopps als Teamziel",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Drei Stopps als Teamziel“: Drei gegen drei mit Ziel von drei Stopps innerhalb sechs Aktionen; danach unabhängig vom Ergebnis auswerten."
      }
    ]
  },
  {
    "familyId": "decision-score",
    "familyName": "Gute Entscheidungen belohnen",
    "category": "Wettbewerbe und Entscheidungsaufgaben",
    "minutes": 10,
    "goal": "Den passenden Spielzug zusätzlich zum Treffer bewerten.",
    "setup": "Zwei oder drei Angreifer mit gleicher Zahl Verteidiger.",
    "coachingPoints": [
      "Bewertung vorher klar erklären.",
      "Gute Entscheidung und Wurfergebnis getrennt betrachten."
    ],
    "repetitions": "8 Angriffe je Team, kurze Besprechung nach vier Aktionen.",
    "successIndicator": "Entscheidungspunkte, Treffer und Ballverluste getrennt aufschreiben.",
    "steps": [
      "Eine kurze freie Aktion starten.",
      "Nach der Aktion die konkrete Entscheidung mit dem vereinbarten Ziel vergleichen."
    ],
    "variants": [
      {
        "id": "catalog-decision-score-1",
        "name": "Gute Entscheidungen belohnen · Freier Mitspieler",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Freier Mitspieler“: Zusatzpunkt für einen sicheren Pass zu einem deutlich freieren Mitspieler, auch wenn dessen Wurf nicht trifft."
      },
      {
        "id": "catalog-decision-score-2",
        "name": "Gute Entscheidungen belohnen · Vorteil weitergeben",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Aufbau",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Vorteil weitergeben“: Zusatzpunkt, wenn nach einem Drive und Hilfsverteidigung der nächste freie Pass gespielt wird."
      },
      {
        "id": "catalog-decision-score-3",
        "name": "Gute Entscheidungen belohnen · Schweren Wurf ablehnen",
        "playersMin": 4,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Schweren Wurf ablehnen“: Zusatzpunkt für einen kontrollierten Rückpass aus geschlossenem Raum statt eines erzwungenen Abschlusses."
      },
      {
        "id": "catalog-decision-score-4",
        "name": "Gute Entscheidungen belohnen · Eigener Wochenfokus",
        "playersMin": 6,
        "playersMax": 12,
        "level": "Fortgeschritten",
        "equipment": [
          "Basketball",
          "Korb"
        ],
        "task": "Variante „Eigener Wochenfokus“: Vor dem Spiel einen beobachtbaren Fokus festlegen, etwa Cut nach Pass; gelungene Anwendungen neben dem Ergebnis zählen."
      }
    ]
  }
];
  return families.flatMap(({variants,...family}) => variants.map(({task,...variant}) => ({
    ...family,...variant,steps:[...family.steps,task],builtIn:true,
    easier:'Tempo reduzieren, die Entscheidung vorgeben und den Ablauf zunächst ohne Zeitdruck üben.',
    harder:'Nach stabiler Ausführung die nächste Variante dieser Übungsfamilie wählen; erst dann Tempo oder Gegnerdruck erhöhen.'
  })));
})();
