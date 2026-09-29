# Spieltag-Modus

Für einen Coach am Handy: Vorbereitung in Schritten, danach freie Live-Erfassung.
Noch nicht veröffentlicht; Umsetzung auf `feat/guided-matchday`.

## Einstieg

1. Einmal online anmelden und synchronisieren. Unter **Spiele** ein Spiel wählen
   und **Spieltag starten** öffnen. **+ Trainingsspiel** legt ein manuelles Spiel
   an; die eigene Seite wird anschließend ausdrücklich als Heim oder Gast gewählt.
2. Kader und Spieltagsnummern kontrollieren. Genau fünf Starter markieren.
   `0` und `00` sind verschieden. Nummern dürfen leer bleiben, aber nicht doppelt sein.
3. Abschnittsanzahl und Dauer prüfen. Spielziele, Aufwärmen und Taktikauswahl sind
   optional. **Vorbereitung überspringen** behält bereits eingetragene Texte.
4. Übersicht prüfen und **Zur Live-Ansicht** öffnen. Das legt eine Erfassung an,
   startet aber noch nicht die Spieluhr.

## Während des Spiels

Die vorhandenen Aktionen für eigene Spieler, Gegnerpunkte, Wechsel, Uhr und
Korrekturen bleiben frei bedienbar. Es gibt keinen Pflicht-Assistenten zwischen
Statistikaktionen. **Vorbereitung & Spieltagsnotizen** lässt sich aufklappen.

Bei 0:00 erscheint eine Abschnitts- bzw. Halbzeitübersicht. Der nächste Abschnitt
wird bewusst vorbereitet und gestartet. Ein Pausieren mitten im Viertel ist
keine Viertelpause. Die Hallenuhr wird nicht ferngesteuert. Auch beim Verlassen
oder Schließen läuft die gestartete App-Uhr rechnerisch bis 0:00 weiter.

## Speichern und Fortsetzen

Eingaben werden beim Weitergehen, expliziten Speichern und Verlassen des Formulars
lokal gesichert. **Ungespeichert** heißt: Eingabe noch nicht bestätigt im Speicher.
Vor dem Schließen auf **Entwurf speichern** bzw. **Notizen speichern** achten.
Browser können Warnungen beim Schließen unterdrücken; ungesicherte Texte sind
nicht garantiert wiederherstellbar.

**Lokal gesichert** ist kein Server-Backup. **Synchronisation ausstehend** bleibt
sichtbar, solange noch Übertragungen fehlen. Vorbereitung und Live-Erfassung
haben getrennte Sicherungsstände. Bei Speicherfehlern bleibt die Eingabe offen.

**Spieltag fortsetzen** oder die gespeicherte Spieltagsadresse öffnet denselben
Stand. Vor Offline-Nutzung App und Module einmal online laden. Derselbe Browser,
dasselbe Gerät und dasselbe Konto sind für lokale Wiederaufnahme erforderlich.
Browserdaten nicht löschen. Für Gerätewechsel erst synchronisieren und die
bestehende Erfassung am neuen Gerät bewusst übernehmen.

Änderungen auf mehreren Geräten können einen Vorbereitungskonflikt erzeugen.
Versionen werden nicht still überschrieben; eine Version bewusst auswählen.
Eine laufende Live-Erfassung bleibt dabei verfügbar. Bei erneut eintreffenden
unbekannten Offline-Änderungen muss gegebenenfalls nochmals entschieden werden.

## Abschluss

**Spiel abschließen** hält die Uhr an und öffnet den vorhandenen Bericht mit
Punkten, Wurfversuchen, Rebounds, weiteren Aktionen, Einsatzzeit, DNP und Plus/Minus.
„Gesamten Punkteverlauf beider Teams erfasst“ nur bei vollständiger Erfassung
ankreuzen; ohne Bestätigung bleiben Werte vorläufig. Nachträgliche Notizen
verändern weder Statistik noch Uhr.

Offizielles Ergebnis, manueller Boxscore und Live-Erfassung bleiben getrennt.
Alte Sitzungen im Format 1 erhalten keine erfundenen Gegnerpunkte oder Plus/Minus.
Eine gelöschte Taktik wird als nicht mehr verfügbar angezeigt.

## Tests

`npm run test:matchday` prüft Modell, Journal, Synchronisierung, Ablauf, UI,
Live-Einbindung und Offline-Installation. `npm test` führt zusätzlich die
bestehende Suite aus. `node scripts/matchday-browser.mjs` startet die lokale
synthetische Browserprüfung auf Port4180. Keine Verbindung zu Neon oder zum
produktiven Team. Browserprüfungen ersetzen keinen Test auf echten iOS-/Android-
Geräten; die abschließende Abnahme dokumentiert den tatsächlich geprüften Umfang.

### Abnahmestand

Die automatisierten Tests decken insbesondere Wiederaufnahme ohne zweite Sitzung,
parallele Entwürfe, verspätete Synchronisationsbestätigung, Speicherfehler,
Kontowechsel während des Speicherns und Notizen während Abschluss/Pausen ab.
Die Vorbereitungsansicht wurde im Browser bei 320 Pixeln visuell geprüft.
Dabei wurde ein verschluckter Folgetipp während automatischer Speicherung behoben.
Die Browsersteuerung fiel beim Serviceworker-Test aus. Deshalb sind ein tatsächlicher
Offline-Neuladedurchlauf, der komplette manuelle Ablauf bei 320/390 Pixeln und
die Prüfung auf einem echten Handy vor der Veröffentlichung noch offen.
