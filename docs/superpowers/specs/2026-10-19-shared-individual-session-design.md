# Gemeinsame Durchführung im Individualtraining

Freigegeben im Chat am 19. Oktober 2026: Ein Training starten und beide Spieler individuell dokumentieren. Ergänzt die bestehende [Pilotspezifikation](../../individual-training-pilot-2026.md).

Die vorhandene Datenbank besitzt bereits gemeinsame `individual_sessions` mit maximal zwei Teilnehmern sowie persönliche Pläne und Messwerte. Die Änderung nutzt diese Struktur. Mannschaftsbereich, Anmeldung und bestehende Spielersicht bleiben kompatibel.

## Verhalten

Der Einstieg aus jedem der beiden Profile öffnet dieselbe laufende Einheit. Die Liveansicht zeigt beide zugeordneten Spieler. Eine gemeinsame Uhr, Pause und Blocksteuerung führen durch den Ablauf. Persönliche Übungen werden nach ihrer Position zu gemeinsamen Zeitblöcken zusammengeführt; bei unterschiedlichen Übungen werden beide Aufgaben nebeneinander angezeigt. Der gemeinsame Block dauert planmäßig so lange wie die längere persönliche Aufgabe. Die endgültige Übungsdauer wird je Spieler dokumentiert.

Jeder Spieler hat eigene Wiederholungen, Messmethoden, Trainerhinweise, Schnellbewertung, Messwerte und private Notizen. Eine Eingabe darf niemals auf den anderen Spieler übergehen. Absagen und Fehlzeiten bleiben sichtbar; diese Spieler erhalten keine durchgeführte Trainingsdauer oder Ergebnisformulare. Eine fehlende Teilnahmeantwort ist kein Startverbot; der Coach bestätigt die tatsächliche Anwesenheit vor dem Abschluss.

Der gemeinsame Livezustand ist lokal nach Coachkonto und Einheiten-ID gespeichert und wird beim Profilwechsel wiederaufgenommen. Bestehende Einzelzustände werden soweit zuordenbar übernommen. Verlassen der Ansicht, Routenwechsel und Abmeldung räumen laufende Timer auf. Ausstehende Ergebnisformulare bleiben beim Blockwechsel erhalten.

Start setzt die gemeinsame Einheit serverseitig auf `in_progress`. Der Abschluss validiert Anwesenheit und Übungszuordnung, speichert Dauer, Bewertung und private Notizen aller anwesenden Spieler und schließt die Einheit in einer Transaktion ab. Wiederholte Abschlussanfragen erzeugen keine doppelten Messwerte. Bei Fehler bleibt der lokale Entwurf erhalten. Der bestehende private KI-Prozess wird anschließend pro anwesendem Spieler ausgelöst.

## Abnahme

Zweiersession, Einzeltraining nach Absage, unterschiedliche persönliche Übungen, Profilwechsel, Pause/Fortsetzen, Eingabeerhalt, fehlgeschlagener Abschluss und Wiederholungsanfrage werden geprüft. Spieler erhalten weiterhin nur ihre persönlichen freigegebenen Daten. Direkte unberechtigte Start-/Abschlussanfragen und fremde Übungs-IDs werden abgewiesen.
