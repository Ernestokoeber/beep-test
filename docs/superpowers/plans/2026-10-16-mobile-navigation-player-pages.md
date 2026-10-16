# Mobile Navigation und Spielerprofile – Umsetzungsplan

> Ausführung mit superpowers:executing-plans im aktuellen Chat. Der Nutzer hat am 16.10.2026 die Umsetzung ausdrücklich freigegeben.

**Ziel:** Fünf feste mobile Hauptziele, eigenständige Spieleransichten und ein verlässlicher Rückweg.
**Architektur:** Bestehende Hash-Routen bleiben kompatibel. Ein eigenes Navigationsmodul verwaltet Verlauf, Seitenzustand und Rückwege. Die vorhandenen Spielerberechnungen werden für gezielt gerenderte Unterseiten wiederverwendet.
**Technik:** JavaScript, HTML, CSS, JSDOM, Playwright; keine neuen Produktabhängigkeiten.
**Spezifikation:** ../specs/2026-10-16-mobile-app-navigation-design.md

## Umfang dieses Schritts

Mannschaftsnavigation und Mannschaftsspielerprofile einschließlich Anlegen und Bearbeiten. Individualtraining bleibt erreichbar und behält seine getrennte Navigation; dessen vollständiger Umbau, Trainingsunterseiten und zusätzliche KI-Funktionen folgen separat.

## Leitplanken

- Hauptziele: Heute, Training, Team, Taktik, Spiele.
- Ein Eintrag öffnet eine eigene App-Seite, keinen Browser-Tab.
- Rückwege erhalten Suche, Filter, Scrollposition und noch nicht gespeicherte Spielereingaben.
- Direkte Links und Reload bieten einen sicheren Elternpfad.
- Bestehende Rollen, Daten, Uhren, Offline-Funktionen und Fachlogik bleiben erhalten.
- Deutscher Oberflächentext mit Umlauten.

## Gestaltung

Grün #005438 für Navigation und Hauptaktionen, Weiß #ffffff für Inhalte, helles Grau #f3f6f5 für Flächen, dunkles Grün #163b2e für Text und Orange #e89a35 als sparsamer Akzent. Vorhandene lokale Inter-Schrift; linksbündige Spielerzeilen, klare Namen, konsistente Symbole und mindestens 44 Pixel große Bedienelemente. Spieleridentität ist der Blickfang. Keine dekorativen Kennzahlen oder wechselnden Menüs.

## Prüfschwerpunkte

1. Browser-Zurück/Vorwärts und App-Zurück nach Reload sowie direkt geöffnete Detailseiten.
2. Einstieg ins Profil aus einem Training statt aus der Spielerliste.
3. Suche, Archivfilter, lange Namen, kleine Bildschirme und Tastaturfokus.
4. Ungespeicherte Profil- und Zieleingaben sowie Wechsel des angemeldeten Nutzers.
5. Alte Links, Individualnavigation und bestehende Fachprüfungen.

## Aufgabe 1: Zentraler Verlauf

Dateien: js/navigation.js, js/app.js, scripts/navigation-smoke.mjs.

Schnittstelle: BT.navigation.begin(hash), finish(token), back(fallback), getState(), setState(patch), capture().

- [x] JSDOM-Test für fehlenden Verlauf schreiben und fehlschlagen sehen.
- [x] Browser-History-Einträge nach Nutzer/Organisation abgrenzen; Seitenzustand im sessionStorage sichern.
- [x] Rückweg, Vorwärtsnavigation, direkte Links, Scroll- und Fokuswiederherstellung prüfen.

```js
const token = BT.navigation.begin(location.hash);
// Router rendert die adressierte Seite.
BT.navigation.finish(token);
```

## Aufgabe 2: Spieler als eigenständige Seiten

Dateien: js/players.js, index.html, scripts/player-pages-smoke.mjs.

Schnittstelle: render(target), renderDetail(target, playerId, page = 'overview'), renderEditor(target, playerId).

- [x] Tests für kompakte Profilübersicht, getrennte Unterseiten und Formularentwürfe schreiben und fehlschlagen sehen.
- [x] Suchbare Spielerzeilen und getrennte Routen overview/development/shots/fitness/history/edit sowie players/new implementieren.
- [x] Bestehende Statistik- und Zielberechnungen erhalten; nur die gewählte Ansicht in den sichtbaren DOM übernehmen.
- [x] Formularvalidierung, Entwürfe und Archivierung prüfen.

```js
BT.players.renderDetail(app, playerId, 'shots');
// Ausschließlich Wurfansicht; Entwicklung und Fitness bleiben eigene Routen.
```

## Aufgabe 3: Seitenrahmen und mobile Hauptnavigation

Dateien: index.html, js/app.js, js/navigation.js, app-navigation.css, sw.js, scripts/check.mjs.

- [x] Browsertest für fünf Hauptziele, Rückwege und mobile Breiten schreiben und fehlschlagen sehen.
- [x] Hauptnavigation, sichtbaren Zurück-Button und kompakte Bereichs-/Verwaltungszugänge umsetzen.
- [x] Bestehende Nebenfunktionen durch gegliederte Verwaltung und fachliche Direktlinks erreichbar halten.
- [x] Neue Dateien offline verfügbar machen, Cache-Version erhöhen, Druckansicht erhalten.

## Aufgabe 4: Prüfung und Abschluss

- [x] Gezielte JSDOM- und Browsertests erfolgreich ausführen.
- [x] npm test vollständig ausführen; veraltete UI-Erwartungen fachgerecht auf neue Navigation anpassen.
- [x] Screenshots bei 320, 390, 768 und 1440 Pixeln ansehen.
- [x] Unabhängige Prüfung des Gesamtdiffs; relevante Befunde beheben und prüfen.
- [x] Änderungen lokal auf dem Feature-Branch bereitstellen; keine Veröffentlichung ohne Auftrag.

## Fortschritt und Entscheidungen

- Ausgangsstand b661372: gesamte Testsuite bereits in dieser Sitzung erfolgreich geprüft.
- Arbeitsverzeichnis: verwalteter Worktree mobile-navigation; Branch codex/mobile-navigation-player-pages.
- Entscheidung: Direkte Umsetzungsfreigabe des Nutzers ersetzt weitere Planbestätigungen.
- Entscheidung: Bestehende Detailberechnungen zunächst wiederverwenden, um Daten- und Berechnungsregressionen zu vermeiden.
- Umsetzung: Fünf Hauptziele, Verwaltung, durchsuchbare Spielerliste und eigene Seiten für Profil, Entwicklung, Würfe, Fitness, Verlauf, Bericht sowie Anlegen/Bearbeiten.
- Unabhängige Prüfung abgeschlossen: Identität beim Reload, wiederholte Rückwege nach Direktlink, Wurfkartenumschaltung, Feedbackentwürfe sowie laufende Countdown-/Sprintuhren korrigiert und gezielt geprüft.
- Verifikation am 16.10.2026: `npm test` vollständig erfolgreich; `node scripts/navigation-browser.mjs` bei 320, 390, 768 und 1440 Pixeln einschließlich authentifiziertem und Offline-Reload erfolgreich; bestehende mobile Coachingwege sowie Trikotverwaltung im Browser erfolgreich.
- Screenshots der Team- und Profilseiten bei den vier Breiten geprüft. Die persönliche Abnahme auf einem echten Handy steht noch aus.
- Bereitstellung: lokaler Feature-Branch; keine Veröffentlichung, keine Änderung am produktiven Datenbestand.
