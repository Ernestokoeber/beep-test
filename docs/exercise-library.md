# CourtHub-Übungsbibliothek

Der Grundkatalog enthält **400 einzeln auswählbare Übungen und Varianten**, gegliedert in **100 Übungsfamilien und 20 Kategorien**. Vier Varianten einer Familie verändern den konkreten Auftrag, etwa Zuspiel, Entscheidung, Verteidigungsdruck oder Auswertung. Sie werden als Varianten ausgewiesen, nicht als 400 völlig verschiedene Grundtechniken.

Jeder Eintrag enthält Ziel, Aufbau, Ablauf, Coachingpunkte, Umfang, Erfolgskriterium, Niveau, Spielerzahl und Material. Spielerzahlen verstehen sich ohne Trainer; größere Bereiche erlauben mehrere Gruppen oder einen Rollenwechsel. Dauer und Umfang sind anpassbare Startwerte. 115 Einträge sind allein und 254 mit zwei Spielern durchführbar.

## Benutzung

- Unter **Training → Übungsbibliothek** nach Name, Trainingsziel oder Ablauf suchen. Kategorie, Spielerzahl, Niveau, Material, Zeit und Sammlung eingrenzen. Gemerkte Übungen lassen sich separat anzeigen.
- Eine Katalogübung öffnet zunächst lesend. **Als eigene Übung speichern** legt eine bearbeitbare Kopie im bestehenden Arbeitsbereich an.
- Im Mannschaftstraining führt **Übung hinzufügen** zur gemeinsamen Auswahl. Im Individualplan heißt der Einstieg **Aus Bibliothek**. Übernommene Übungen sind eigenständige Kopien im Plan; die Vorlage bleibt erhalten.
- Im Individualplan speichert **Als eigene Übung speichern** Namen, Ablauf, Dauer, Trainerhinweise und Erfolgskriterium. Private Beobachtungen und aufgezeichnete Ergebnisse werden nicht in die Bibliothek übertragen.
- Vorhandene eigene Übungen und der Import aus Mannschaftsplänen bleiben verfügbar. Eigene Übungen ohne Filterangaben erscheinen bei „Alle“, nicht bei eingeschränkten Filtern mit unbekannten Angaben.
- Nach dem ersten vollständigen Laden ist der Grundkatalog über den PWA-Cache offline verfügbar. Eigene Vorlagen und Favoriten verwenden die bestehende Arbeitsbereichssynchronisierung.

## Technischer Aufbau

`js/exercise-catalog-data.js` hält 100 Familien mit stabilen Varianten-IDs. Gemeinsame Beschreibungen werden einmal gespeichert und beim Laden zu 400 Einträgen zusammengesetzt. `js/exercise-catalog.js` vereinigt den unveränderlichen Katalog mit eigenen Übungen, filtert, rendert die Auswahl und erstellt unabhängige Plan-Kopien.

Der Grundkatalog wird nicht in bestehende Nutzerdaten hineinkopiert. Es ist keine Datenbankmigration erforderlich. Bestehende Trainingspläne bleiben unverändert. Die KI-Generierung wurde mit dieser Änderung nicht umgestellt; die neue Auswahl steht den Trainern direkt zur Verfügung.

Die Texte sind eine eigene CourtHub-Sammlung. Die verlinkten [FIBA/WABC-Coachingmaterialien](https://about.fiba.basketball/en/wabc-documents) dienen als weiterführende Literatur; der Katalog beansprucht keine offizielle Prüfung oder Herausgeberschaft durch FIBA.

## Prüfung

`node scripts/exercise-catalog-smoke.mjs` prüft Umfang und Struktur, API-Feldgrenzen, Suche/Filter, Favoriten, Pagination, unveränderte Vorlagen, eigene Kopien, beide Planintegrationen, Ausschluss privater Notizen, Rollenwechsel und tatsächliche IndexedDB-Schreibfehler.

`node scripts/exercise-catalog-browser.mjs` prüft den Ablauf bei 320, 390 und 1280 Pixeln, außerdem Offline- und Dunkeldarstellung. Bestehende Bibliotheks-, Speicher- und Trainingsregressionen bleiben erhalten.
