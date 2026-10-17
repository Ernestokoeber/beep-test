# Mobiler Kalender und Saisonplanung

Auftrag: Termine am Handy übersichtlich sehen; Training und Spiel mit einem Tipp auf eigener Seite öffnen, mit echtem Zurückweg zur Kalenderposition. Grundlage ist der bestätigte mobile App-Aufbau.

1. Lesendes Kalendermodell aus gespeicherten Trainings und Spielen: gültige lokale Kalendertage, Datum/Uhrzeit sortieren, Status kennzeichnen, keine Termine beim Öffnen erzeugen. Monat, Suche und Terminart erhalten.
2. Mobile Monatsagenda mit Tagesgruppen, Monatswechsel und Heute-Zugang. Ganze Terminkarten verlinken die bestehenden eigenen Detailseiten. Keine neue externe Kalenderbibliothek.
3. Eigene Saisonplanungszentrale und Seiten für reguläre Trainingszeiten, regelmäßige Terminvorschläge, Saisonplanung, Teamkonzept und PDF-Import; vorhandene Fachfunktionen und Schutz manueller/abgeschlossener Einheiten erhalten. Spielplanquelle bleibt über die bestehende eigene Einstellungsseite erreichbar.
4. Kontext und Verlauf: Monat/Filter/Scroll nach Zurück, direkte Eltern-Fallbacks, Formularentwürfe bei Seitenwechsel/Reload; keine Schreibaktionen beim Lesen. Viewer erhalten Lesezugriff. Sync-Aktualisierung für die Agenda, Bereinigung der Listener.
5. Rot/grün-Modell-/UI-Tests; Browser 320/390/768/1440 px, beide Terminarten, direkte Links, Rollen, Entwürfe, Dunkelmodus und bestehende Coachingwege. Ein unabhängiger Gesamt-Review am Ende.

## Entscheidungen und Nachweise

- Wiederverwendeter Worktree, neuer Branch ab `a7adc48`.
- Gespeicherte Termine bilden den Kalender. Wiederkehrende Trainingszeiten sind Planungsvorgaben und werden nicht als bereits angelegte Trainingseinheiten ausgegeben.
- Bestehende KI-Planung wird nur neu angeordnet; keine neuen KI-Fähigkeiten oder externen Dienste.
- Umsetzung lokal; Veröffentlichung separat auf Auftrag.
- Umsetzung: Monatsagenda mit Suche und Terminartfilter; getrennte Planungsseiten einschließlich regelmäßiger Terminvorschläge. Zurück stellt Monat, Filter und Scrollposition wieder her; Formulardaten bleiben bei Wechsel und Reload erhalten.
- Nachweise: Modell-/DOM-Tests rot/grün, Browsermatrix 320/390/768/1440 px einschließlich Speichern, Vorschläge anlegen, beider Terminarten, Zurück, Fokus, Dunkelmodus und Viewer. Bestehende mobile Coachingwege grün.
- Review: Unabhängiger Gesamt-Review und Fix-Nachprüfung abgeschlossen. Konzept-Rollback durch versteckte Saisonentwurfsfelder behoben; Regressionstests sichern auch alte Entwürfe. Vorschlagsliste bleibt auf eigener Seite erreichbar.
- Weitere Korrekturen: Reine Saisonansicht erzeugt keine Gegner-/Konzeptdaten; volle Stunden wie 19:00 bleiben in Vorschlägen korrekt.
- Offline: Echte Browser-PWA v231 mit 157 Dateien geprüft; Offline-Reload des Kalenders, Training/Spiel, Zurück und Trainingszeiten erfolgreich. Keine echte KI-Anfrage ausgelöst.
- Gesamttest: `npm test`, `npm run test:navigation:browser`, `npm run test:calendar:browser` und `git diff --check` erfolgreich. Veröffentlichung bleibt separat.
