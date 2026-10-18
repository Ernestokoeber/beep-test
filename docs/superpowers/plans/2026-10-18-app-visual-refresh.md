# CourtHub – vollständige visuelle Überarbeitung

> Ausführung mit superpowers:executing-plans, schrittweise in diesem Worktree.

**Ziel:** Die vom Nutzer bestätigte ruhige, sportliche Gestaltung auf alle App-Bereiche anwenden und nach mobiler Prüfung veröffentlichen.
**Architektur:** Bestehende Vanilla-JS-App und eigene Seiten beibehalten. Eine abschließend geladene, themenfähige Gestaltungsdatei definiert gemeinsame Farben, Typografie, Oberflächen, Navigation, Formulare und bereichsspezifische Anpassungen. Individuelle Übersichten werden gezielt in ihrer Hierarchie überarbeitet.
**Technik:** HTML, CSS, bestehendes JavaScript, lokale Inter-Schrift, vorhandene Playwright-/JSDOM-Prüfungen.
**Grundlage:** Gestaltungsprüfung und Vorschlag im Chat, vom Nutzer mit „Mache es bis du alles überarbeitet hast“ am 18.10.2026 zur vollständigen Umsetzung freigegeben.

## Verbindliche Entscheidungen
- Helle Basis #f3f5f6, weiße Flächen, Text #182522; dunkle Basis #161a1d, Flächen #20262a und Text #f3f6f5. Vereinsgrün #006344, Basketballorange #f3a24b als Hauptaktion mit dunkler Schrift.
- Bestehende lokale Inter verwenden, normale Satzschreibung, klare Größen und abgestufte Abstände. Keine neuen Abhängigkeiten oder Kosten.
- Alle vorhandenen Seiten, Daten, Rollen, Einladungen und Freigaben erhalten. Fachliche Spielfeldfarben, Messwerte und Trainingsregeln nicht umdeuten.
- Öffnen startet keine Durchführung. Browser-/App-Rückwege, Offlinezustand, Tastaturfokus, Safe-Area und reduzierte Bewegung berücksichtigen.
- Keine echten KI-Aufrufe oder Änderungen an realen Spielerdaten für die Abnahme.

## Prüfschwerpunkte
1. Helle und dunkle Ansichten, kurze und lange Namen: lesbarer Kontrast und kein horizontaler Seitenüberlauf bei 320/390 Pixeln.
2. Trainer und Spieler: Navigation erreichbar, keine fremden Daten oder Traineraktionen für Spieler; mobile doppelte Spielernavigation reduzieren.
3. Formular, Tabelle, Dialog und Vollbilddurchführung: Eingaben und Schließen erreichbar, kein überdeckter Inhalt.
4. Zu-/Absage und Tagesform: automatische Aktualisierung auch nach der Umgestaltung auf denselben DOM-Zielen.
5. Taktikboard/Live-Spiel: Bedienelemente lesbar, Zeichenfläche und deren fachliche Farben unverändert.

## Schritte und Dateien
- [x] Gemeinsames Design in `app-design.css`, Einbindung in `index.html` und PWA-Cache `sw.js`. Bestehende Domänen-CSS gezielt einbeziehen; allgemeine Formulare, Karten, Tabellen, Kontoseite und Organisation vereinheitlichen.
- [x] Individualtraining in `js/individual-training.js` und `js/individual-player-view.js`: kompakte Spielerübersicht, Hauptlink im Namen, relevante Rückmeldungen zuerst, zweitrangige Details einklappbar; nur eine mobile Spielernavigation, ein kompakter Vorschauhinweis. Bestehende Testziele für Live-Aktualisierung erhalten.
- [x] Alle Bereiche im Browser prüfen: Heute, Training, Spielerprofil, Taktik, Spiel, Kalender, Statistik, Briefing, Gegner, Bibliothek, Konto/Verwaltung und Individualtraining. Visuelle Screenshot-Abnahme in Hell/Dunkel plus sinnvolle Layout-/Navigationsprüfungen in `scripts/app-design-browser.mjs`.
- [x] Bestehende mobile Ablaufprüfungen sowie passende Fach-/Rollen-/Offline-Prüfungen ausführen. Unabhängiger Review, Befunde beheben, veröffentlichen, tatsächliche öffentliche Trainer- und Spielervorschau kontrollieren.

## Ausführungsprotokoll
- Ausgangsstand a872d75 / PWA256, Worktree codex/mobile-opponents sauber; Main enthält nur fremde unversionierte Artefakte.
- Reversible CSS-Anpassungen werden visuell geprüft. Neue gezielte Verhaltensprüfungen nur für geänderte Links/Details/Navigation; keine Tests, die CSS-Werte lediglich nachbauen.

- Umsetzung: neue gemeinsame Gestaltungsdatei, kompakte Spielerübersicht, kombinierter Vorschauhinweis, eigene mobile Navigation, vereinheitlichte Formulare/Verwaltung und korrigierter Kampfgericht-Umbruch. PWA v257 mit 170 Assets.
- Abnahme: npm test vollständig erfolgreich;28 Ansichten × 3 Breiten × 2 echte Themeneinstellungen (=168Kombinationen) ohne horizontalen Überlauf. Browserabläufe für Navigation, Heute, Training, Taktik, Spiele, Briefing, Kalender, Statistik, Scouting, Bibliothek und Individualtraining bestanden (320/390/768/1440; Spieler320/390).
- Review: Theme-Scope und falsch benannte Test-Routen korrigiert; unabhängiger Abschlussreview ohne offene Befunde. Der veraltete Sync-Test erwartet jetzt die bereits vorhandene Formulierung „Datenstand geprüft“.
- Keine Datenmigration, keine neuen Anbieter oder Abhängigkeiten, keine echten Spielerregistrierungen für Tests. Veröffentlichung und öffentliche Sichtprüfung werden im lokalen Abnahmestatus dokumentiert.
