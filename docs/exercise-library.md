# CourtHub-Übungsbibliothek

Der Katalog enthält **400 eigenständige Übungskonzepte** aus der CourtHub-Planungsseite sowie **400 bisherige Varianten** aus 100 Familien. Die Gruppen sind separat filterbar; Varianten werden nicht als zusätzliche Grundübungen gezählt.

Die 400 Konzepte verteilen sich auf Dribbling, Zug zum Korb, Entscheidungen, Footwork und Post (je 60), Passen und Wurf (je 40) sowie Verteidigung (20). Alle neuen Konzepte haben stabile IDs, Ziel, Aufbau, Ablauf, Umfang, Coaching, Erfolgskriterium und Anpassungen. **Die fachliche Prüfung ist offen.** Organisation, Helferbedarf und Startwerte sind redaktionelle Vorschläge; Vollständigkeitsprüfungen ersetzen keine sportfachliche Abnahme.

## Benutzung

- Unter **Training → Übungsbibliothek** nach Name, Trainingsziel oder Ablauf suchen. Kategorie, Spielerzahl, zusätzliche Helfer, Niveau, Material, Zeit, Sammlung, Eintragsart, Freigabe und Kompetenzen eingrenzen. Kompetenzen unterstützen ODER/UND-Verknüpfung. Gemerkte Übungen lassen sich separat anzeigen.
- Eine Katalogübung öffnet zunächst lesend. **Als eigene Übung speichern** legt eine bearbeitbare Kopie im bestehenden Arbeitsbereich an.
- Im Mannschaftstraining führt **Übung hinzufügen** zur gemeinsamen Auswahl. Im Individualplan heißt der Einstieg **Aus Bibliothek**. Übernommene Übungen sind eigenständige Kopien im Plan; die Vorlage bleibt erhalten.
- Im Individualplan speichert **Als eigene Übung speichern** Namen, Ablauf, Dauer, Trainerhinweise und Erfolgskriterium. Private Beobachtungen und aufgezeichnete Ergebnisse werden nicht in die Bibliothek übertragen.
- Vorhandene eigene Übungen und der Import aus Mannschaftsplänen bleiben verfügbar. Eigene Übungen ohne Filterangaben erscheinen bei „Alle“, nicht bei eingeschränkten Filtern mit unbekannten Angaben.
- Nach dem ersten vollständigen Laden ist der Grundkatalog über den PWA-Cache offline verfügbar. Eigene Vorlagen und Favoriten verwenden die bestehende Arbeitsbereichssynchronisierung.

## Technischer Aufbau

`js/exercise-library-core.js` enthält die 400 neuen Konzepte. `js/exercise-catalog-data.js` hält weiterhin 100 Familien mit stabilen Varianten-IDs. Gemeinsame Beschreibungen werden einmal gespeichert und beim Laden zu 400 Einträgen zusammengesetzt. `js/exercise-catalog.js` vereinigt den unveränderlichen Katalog mit eigenen Übungen, filtert, rendert die Auswahl und erstellt unabhängige Plan-Kopien.

Der Grundkatalog wird nicht in bestehende Nutzerdaten hineinkopiert. Die Bibliotheksdateien benötigen keine Datenbankmigration. Die zusammen ausgelieferte Trainingsplanung benötigt dagegen `20261114_0001_training_proposals.sql`. Bestehende Trainingspläne bleiben unverändert. Die Auswahl steht Trainern direkt zur Verfügung. Die neue gezielte KI-Regeneration berücksichtigt Spielerziele und Rahmenbedingungen; eine automatische Auswahl ausschließlich aus freigegebenen Bibliothekseinträgen ist noch nicht implementiert.

Die Texte sind eine eigene CourtHub-Sammlung. Die verlinkten [FIBA/WABC-Coachingmaterialien](https://about.fiba.basketball/en/wabc-documents) dienen als weiterführende Literatur; der Katalog beansprucht keine offizielle Prüfung oder Herausgeberschaft durch FIBA.

## Prüfung

`node scripts/exercise-catalog-smoke.mjs` prüft Umfang und Struktur, API-Feldgrenzen, Suche/Filter, Favoriten, Pagination, unveränderte Vorlagen, eigene Kopien, beide Planintegrationen, Ausschluss privater Notizen, Rollenwechsel und tatsächliche IndexedDB-Schreibfehler.

`node scripts/exercise-catalog-browser.mjs` prüft den Ablauf bei 320, 390 und 1280 Pixeln, außerdem Offline- und Dunkeldarstellung. Bestehende Bibliotheks-, Speicher- und Trainingsregressionen bleiben erhalten.

## Freigabe und Bearbeitung

Eigene Kopien starten als Entwurf. Der Coach kann nach vollständiger Prüfung freigeben oder archivieren. Die Oberfläche verlangt dafür Ziel, Ablauf, Erfolgskriterium, Vereinfachung, Steigerung und Organisationsangaben. Bis zu 20 Metadatenversionen werden mitgeführt; dies ist noch keine vollständige Wiederherstellungsoberfläche. Bereits übernommene Plankopien bleiben unabhängig. `scripts/exercise-library-core-smoke.mjs` prüft alle 400 Konzepte zusätzlich auf IDs, Pflichtfelder, Feldlängen und Filter.
