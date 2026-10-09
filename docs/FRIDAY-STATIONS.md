# Freitags-Stationstraining

CourtHub bietet vor einem Herrenspiel am folgenden Samstag oder Sonntag automatisch ein individuelles Freitagstraining an. Der Vorschlag erscheint in der Trainingsliste und kann auf einen vorhandenen Freitagstermin angewendet oder als neuer Termin angelegt werden. Die Einheit wird beim Planen von der KI neu erzeugt; CourtHub setzt keine feste Wochenrotation ein.

## Aufbau: 105 Minuten

- 10 Minuten Readiness-Check und Tagesziel
- 10 Minuten individuelle Aktivierung
- fünf Stationsrunden à 15 Minuten
- 10 Minuten Cooldown und Session-RPE

Die KI wählt fünf unterschiedliche Einzelstationen passend zum folgenden Spiel, zu den Trainer-Vorgaben und zur bisherigen Trainingshistorie. Sie erhält ausdrücklich die bereits absolvierten sowie die im aktuellen Planungslauf zuvor erzeugten Inhalte, damit Schwerpunkte und Kombinationen von Woche zu Woche wechseln. Eine unter „Beobachtung aus Spiel oder Training“ eingetragene Schwäche darf höchstens eine der fünf Stationen bestimmen; die übrigen vier Stationen decken andere Entwicklungsbereiche ab. Teamtaktik, Spielformen und 1-gegen-1 bis 5-gegen-5 sind für diesen Freitag ausgeschlossen.

Der KI-Entwurf wird nur übernommen, wenn er genau fünf beschriebene Stationen und den vollständigen 105-Minuten-Aufbau liefert. Die erzeugten Blöcke werden direkt im Live-Training verwendet. Aufbau, nummerierter Ablauf, Umfang/Pausen, Coaching und Anpassung sind über aufklappbare Anleitungen in Übersicht, Plan und Live-Modus vollständig zugänglich. Die fünf Stationsblöcke sind fünf parallele Rotationsrunden; der Live-Modus zeigt deshalb alle Stationen je Runde. Details: [Trainingsanleitungen](TRAINING-INSTRUCTIONS.md).

## Belastungssteuerung

Im Reiter `Belastung` werden pro Spieler erfasst oder berechnet:

- Tagesform von 1 bis 5,
- Schmerzen von 0 bis 10,
- Spielminuten der letzten sieben Tage,
- Trainingsbelastung der letzten sieben Tage,
- gesamte Wochenlast,
- Ziel-RPE und tatsächliche Session-RPE.

Die Wochenlast verwendet das Session-RPE-Verfahren: Trainingsminuten × RPE. Spielminuten werden mit einer angenommenen Spielintensität von RPE 10 eingerechnet. Manuell gepflegte Boxscore-Minuten werden automatisch übernommen und können vor Ort korrigiert werden.

Die Ampel leitet daraus eine konkrete Vorgabe ab:

- **Grün:** alle Stationen, saubere Qualität, Belastung am Ziel-RPE deckeln.
- **Gelb:** ungefähr 70 Prozent Volumen, längere Pausen, keine Zusatzbelastung.
- **Rot:** nur schmerzfreie Technik, Wurf und Prehab; keine Sprünge oder harten Richtungswechsel.

Alle Werte werden am Training gespeichert, synchronisiert und sind offline verfügbar.

Nach dem Abschluss in `Training Live` führt die Schaltfläche `Belastung & RPE eintragen` direkt zurück zur individuellen Belastungsansicht.
