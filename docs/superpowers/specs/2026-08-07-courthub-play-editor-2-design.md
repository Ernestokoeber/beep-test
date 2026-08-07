# CourtHub Play Editor 2.0

## Zweck dieses Dokuments

Dieses Dokument hält den abgestimmten Zielzustand für den zukünftigen CourtHub-Taktikeditor fest. Es dient als Übergabe für die Weiterentwicklung auf einem anderen Gerät oder in einer neuen Codex-Sitzung.

Der neue Editor orientiert sich am ruhigen und fokussierten Arbeitsablauf moderner Playbook-Editoren wie CoachCanvas. Gestaltung, Quellcode und Bedienlogik werden nicht kopiert. CourtHub erhält eine eigenständige Oberfläche in der bestehenden grünen und orangefarbenen Vereinsgestaltung und behält seine bereits implementierte basketballspezifische Aktionslogik.

## Ausgangslage

Der aktuelle Stand auf `main` enthält mit Commit `ae458c3` bereits:

- einen phasenbasierten Aktionsrekorder,
- aufeinanderfolgende und gleichzeitige Aktionen,
- Laufwege und automatische Dribbling-Erkennung,
- Pässe,
- gebundene Screens,
- Pick-and-Roll-Aktionsgruppen,
- automatische Zeitberechnung,
- Abstands- und Überlappungsprüfung,
- Drag-and-drop-Sortierung von Phasen,
- gruppiertes Löschen von Pick-and-Roll-Aktionen,
- Kompatibilität mit bestehenden gespeicherten Plays,
- PDF- und GIF-Export sowie Wiedergabe.

Die neue Arbeit ist deshalb kein technischer Neubau der Taktik-Engine. Sie ist hauptsächlich eine neue Informationsarchitektur und Bedienoberfläche auf Grundlage des vorhandenen Datenmodells.

## Verbindliche Produktentscheidungen

### Spielfeld

- CourtHub verwendet ein festes zweidimensionales Halbfeld aus der Vogelperspektive.
- Eine drehbare Kamera, 3D-Spielermodelle und perspektivische Spielfeldverzerrungen gehören nicht zum Zielbild.
- Leichte Holzstruktur, Schatten und Ebenen dürfen visuelle Tiefe erzeugen, verändern aber nicht die zweidimensionale Geometrie.
- Das Spielfeld muss auf Desktop, Tablet, Smartphone, PDF, Bild und Video identisch lesbar bleiben.

### Spielersymbole

Die folgenden Bedeutungen sind verbindlich und müssen in Editor, Animation, Vorschau und Export gleich dargestellt werden:

| Symbol | Bedeutung |
| --- | --- |
| Kreis mit `1` bis `5` | Angriffsspieler |
| `X1` bis `X5` als X-Symbol | Mannverteidigung |
| Raute mit `X1` bis `X5` | Zonenverteidigung |
| Basketball | Aktueller Ballbesitz beziehungsweise Ballposition |

Die Verteidigungsart wird pro Verteidiger gespeichert. Dadurch sind Mischformen wie Box-and-One möglich. Vorlagen können alle Verteidiger gemeinsam setzen, beispielsweise Mannverteidigung, 2-3-Zone, 3-2-Zone oder 1-3-1-Zone.

### Visuelle Sprache der Aktionen

- Laufweg: durchgezogener Pfeil.
- Dribbling: gewellter oder eindeutig anders strukturierter Pfeil.
- Pass: gestrichelter Pfeil.
- Screen: klares T-Symbol an der Screenposition.
- Ballbesitz: Basketball direkt am aktuellen Ballführer.
- Gleichzeitig ausgeführte Aktionen: gemeinsame Gruppe in derselben Phase.
- Farben und Stricharten dürfen nicht die einzige Unterscheidung sein.

## Zielaufbau des Editors

Der Editor wird während der Bearbeitung zu einem fokussierten Vollbild-Arbeitsbereich. Die normale CourtHub-Seitennavigation tritt zurück, bleibt aber über „Zurück“ erreichbar.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Zurück  Playname   Werkzeuge        Undo  Play  Export  Vorschau │
├──────────┬───────────────────────────────┬───────────────────────┤
│ Phasen   │                               │ Timeline              │
│          │                               │ oder                  │
│  01      │                               │ Anweisungen           │
│  Vorschau│        großes 2D-Halbfeld     │                       │
│          │                               │ Gleichzeitig          │
│  02      │                               │  2 läuft …            │
│  Vorschau│                               │  5 stellt Screen …    │
│          │                               │  1 passt zu 3 …       │
│   +      │                               │                       │
└──────────┴───────────────────────────────┴───────────────────────┘
```

### Kopfzeile

Die Kopfzeile enthält nur häufig benötigte Funktionen:

- Zurück zur Taktikbibliothek,
- Playname und optional Kategorie,
- Auswahlwerkzeug,
- Lauf beziehungsweise Dribbling,
- Pass,
- Screen,
- Pick & Roll,
- Spieler beziehungsweise Verteidiger ergänzen,
- Rückgängig und Wiederholen,
- Wiedergabe,
- Export,
- Vorschau.

Selten benötigte Einstellungen werden unter „Mehr“ oder in einem Eigenschaftsbereich angeboten. Manuelle Start- und Dauerwerte bleiben dem Profi-Modus vorbehalten.

### Phasenleiste links

- Jede Phase wird als kleines echtes Spielfeld-Vorschaubild dargestellt.
- Die aktive Phase ist klar umrandet und zusätzlich nummeriert.
- Zwischen zwei Phasen kann unmittelbar eine neue Phase eingefügt werden.
- Phasen lassen sich per Drag-and-drop umsortieren.
- Ein Kontextmenü erlaubt Duplizieren, Löschen und das Einfügen davor oder danach.
- Die Ausgangsposition einer Phase folgt weiterhin automatisch aus der Endposition der vorherigen Phase.

### Spielfeld in der Mitte

- Das Spielfeld erhält den größtmöglichen verfügbaren Raum.
- In der Grundaufstellung können Spieler, Verteidiger und Ball frei positioniert werden.
- Nach Beginn der Aktionsaufnahme entstehen Positionsänderungen ausschließlich über Aktionen.
- Ausgewählte Spieler und Aktionen werden deutlich hervorgehoben.
- Unvollständige Aktionen zeigen eine Vorschau, verändern aber noch nicht das gespeicherte Board.
- Überlappungen werden markiert und können mit „Lesbar einrasten“ korrigiert werden.

### Seitenbereich rechts

Der rechte Bereich besitzt zwei Hauptreiter:

#### Timeline

- Listet alle Aktionen der aktiven Phase in verständlicher Trainersprache.
- Gleichzeitige Aktionen werden sichtbar gruppiert.
- Aktionsbeispiele: „1 passt zu 2“, „5 stellt einen Screen für 1“, „1 nutzt den Screen“, „5 rollt zum Korb“.
- Aktionen lassen sich innerhalb einer Phase sortieren, auswählen, korrigieren und löschen.
- Pick-and-Roll-Teilaktionen bleiben über ihre gemeinsame `groupId` verbunden.
- Beim Löschen einer verbundenen Aktion wird zwischen gesamter Gruppe und einzelner Teilaktion unterschieden.

#### Anweisungen

- Jede Phase erhält eine eigene Traineranweisung.
- Der Text darf Absätze, Hervorhebungen und einfache Aufzählungen enthalten.
- Die automatisch erzeugten Aktionssätze dienen als Ausgangspunkt, ersetzen aber keine frei formulierten Coaching Points.
- Beispiel: „Zone breit machen. X2 binden und den unteren Verteidiger lesen. Bei Hilfe sofort in die Ecke passen.“

## Bedienablauf

### Neues Play

1. Playname und Kategorie wählen.
2. Angreifer als Kreise positionieren.
3. Verteidigung auswählen: X für Mannverteidigung, Raute für Zonenverteidigung.
4. Ballführer festlegen.
5. Erste Aktion auswählen und auf dem Feld ausführen.
6. CourtHub erstellt automatisch Phase, Beschreibung und Dauer.
7. Weitere Aktion standardmäßig „danach“ oder ausdrücklich „gleichzeitig“ hinzufügen.
8. Pro Phase optional Traineranweisung ergänzen.
9. Play abspielen, in der Vorschau kontrollieren und speichern oder veröffentlichen.

### Pick & Roll

1. Ballführer auswählen.
2. Screensteller auswählen.
3. Screenposition bestimmen.
4. Weg des Ballführers zeichnen.
5. Rollweg des Screenstellers zeichnen.
6. CourtHub speichert Screen, Nutzung und Rollweg als verbundene Gruppe.

### Zone Offense

- Zonenverteidiger werden als Rauten dargestellt.
- Das offensive System kann in mehreren Phasen mit Verschiebungen der gesamten Zone dargestellt werden.
- Anweisungen dokumentieren Reads und Alternativen, beispielsweise High-Post-Anspiel, Short Corner, Skip-Pass oder Baseline-Drift.
- Mischformen aus Zonen- und Mannverteidigung bleiben möglich.

## Taktikbibliothek

Die Bibliothek wird langfristig zum Einstiegspunkt für Plays und Playbooks.

- Suche über Titel, Kategorie und Beschreibung.
- Filterchips, beispielsweise Mann-Offense, Zone-Offense, Pick & Roll, Horns, Einwurf und Press Break.
- Kompakte Karten für einzelne Plays.
- Eigene Darstellung für Playbooks beziehungsweise Sammlungen.
- Sortierung nach zuletzt geändert, Titel oder Kategorie.
- Aktionen für Erstellen, Duplizieren, Archivieren und Veröffentlichen.

## Vorschau und Spieleransicht

Die Vorschau ist eine nicht bearbeitbare, ruhige Playbook-Seite:

- Titel und Beschreibung des Plays,
- fortlaufend nummerierte Phasen,
- pro Phase ein Diagramm,
- daneben die Traineranweisung,
- Schaltfläche „Animation abspielen“,
- Exportzugang,
- mobil als einspaltige Abfolge aus Diagramm und Text.

Spieler benötigen für eine veröffentlichte Ansicht keinen Editorzugriff. Berechtigungen aus CourtHub bleiben maßgeblich.

## Animation

- Die Animation läuft vollständig zweidimensional.
- Ein fokussiertes Fenster zeigt Spielfeld, Play/Pause, Zurücksetzen, Fortschrittsregler, aktuelle Zeit und Geschwindigkeit.
- Phasengrenzen werden auf dem Fortschrittsregler markiert.
- Geschwindigkeiten von mindestens 0,5x, 1x und 1,5x werden unterstützt.
- Gleichzeitige Aktionen starten zusammen; die nächste Phase beginnt erst nach der längsten Aktion der aktuellen Phase.
- Reduzierte Bewegungseinstellungen des Betriebssystems werden respektiert.

## Export

Ein gemeinsamer Exportdialog bündelt alle Ausgabeformen.

### PDF

- Diagramm und Beschreibung nebeneinander,
- Rasteransicht,
- nur Diagramme,
- kleine oder große Diagramme,
- druckerfreundliche Schwarz-Weiß-Variante.

### Bild

- einzelne Phase oder vollständige Phasenübersicht,
- Reihe, Raster oder nur Diagramme,
- Titel und Beschreibung optional,
- wählbarer Außenabstand.

### Video

- Animation als Video,
- Originalformat, Quadrat, Hochformat und Querformat,
- mehrere Qualitätsstufen,
- wählbare Wiedergabegeschwindigkeit.

Der vorhandene PDF- und GIF-Export bleibt während des Umbaus funktionsfähig. Videoexport ist eine nachgelagerte Ausbaustufe und darf den ersten Editor-Umbau nicht blockieren.

## Datenmodell und Migration

Das vorhandene Board-Modell bleibt Grundlage. Vorhandene Plays dürfen nicht unbrauchbar werden.

Bereits vorhandene relevante Felder:

- `steps` als persistierte Phasen,
- `phaseId`,
- `duration`,
- `elements`,
- `transition`,
- `relation`,
- `kind`,
- `beneficiaryId`,
- `targetDefenderId`,
- `groupId`,
- `groupType`.

Ergänzungen für den neuen Editor:

- `instruction` pro Phase,
- `defenseMode` pro Verteidiger mit `man` oder `zone`,
- optionaler `thumbnailVersion`-Marker für neu generierte Vorschaubilder,
- optionale Bibliothekslabels beziehungsweise Tags.

Die Normalisierung setzt für alte Verteidiger einen kompatiblen Standard, ohne gespeicherte Geometrie zu verändern. Bestehende Schritte werden weiter als Phasen geladen. Eine Migration wird erst beim bewussten Speichern persistiert.

## Technische Aufteilung

Die neue Oberfläche soll nicht wieder in einer großen Datei entstehen. Empfohlene Module:

- `editor-shell.js`: Vollbildlayout und gemeinsame Zustände,
- `editor-toolbar.js`: Werkzeuge und Hauptaktionen,
- `phase-rail.js`: Vorschaubilder, Auswahl und Sortierung,
- `court-stage.js`: Spielfeld und Pointer-Interaktionen,
- `action-timeline.js`: Aktionsgruppen und Bearbeitung,
- `phase-instructions.js`: Traineranweisungen,
- `play-preview.js`: nicht bearbeitbare Playbook-Darstellung,
- `animation-player.js`: fokussierte 2D-Wiedergabe,
- `export-dialog.js`: PDF-, Bild- und spätere Videooptionen,
- `play-library.js`: Suche, Filter und Playbook-Karten.

Die vorhandenen Kernmodule für Normalisierung, Timing, Abstände und Aktionsaufnahme werden weiterverwendet und nur über klar definierte Schnittstellen angesprochen.

## Responsive Verhalten

### Desktop

- Phasen links,
- großes Spielfeld in der Mitte,
- Timeline beziehungsweise Anweisungen rechts.

### Tablet

- schmalere Phasenleiste,
- einklappbarer rechter Bereich,
- Spielfeld bleibt zentral.

### Smartphone

- kompakte Kopfzeile,
- Spielfeld oben,
- Phasen horizontal darunter,
- Timeline und Anweisungen als ausziehbarer Bereich,
- Touch-Ziele mindestens 44 Pixel groß.

## Barrierefreiheit

- Jede Werkzeugschaltfläche benötigt einen sichtbaren Tooltip und einen zugänglichen Namen.
- Aktive Werkzeuge, Phasen und Verteidigungsarten werden nicht nur farblich unterschieden.
- Alle wesentlichen Funktionen sind per Tastatur erreichbar.
- Fokuszustände bleiben sichtbar.
- X und Raute werden zusätzlich durch Text als Mann- beziehungsweise Zonenverteidigung benannt.
- SVG- und DOM-basierte Darstellung wird gegenüber einer rein gerasterten Canvas-Oberfläche bevorzugt.

## Fehlerbehandlung

- Unvollständige Aktionen verändern das gespeicherte Board nicht.
- Abbrechen und Escape verwerfen nur die laufende Eingabe.
- Ungültige Screenpartner oder identische Passgeber und Empfänger werden verständlich erklärt.
- Ein fehlgeschlagener Export verändert das Play nicht.
- Autosave und manuelles Speichern zeigen ihren Zustand eindeutig.
- Alte Plays, die nicht vollständig normalisiert werden können, werden lesbar geöffnet und nicht automatisch überschrieben.

## Umsetzung in Etappen

### Etappe 1: Fokus-Editor

- neue Vollbildhülle,
- kompakte Werkzeugleiste,
- linke Phasenleiste mit Vorschaubildern,
- großes 2D-Halbfeld,
- rechte Timeline und Anweisungen,
- verbindliche Verteidigungssymbole.

### Etappe 2: Vorschau und Animation

- Playbook-Vorschau,
- Anweisungen pro Phase,
- fokussierter Animationsplayer mit Fortschrittsregler.

### Etappe 3: Exportdialog

- gemeinsamer PDF- und Bildexport,
- druckerfreundliche Varianten,
- später Videoexport.

### Etappe 4: Bibliothek und Playbooks

- Suche und Filter,
- Play-Karten,
- Playbook-Sammlungen,
- veröffentlichte Spieleransichten.

## Abnahmekriterien

Der erste Umbau ist abgeschlossen, wenn:

- ein bestehendes Play ohne Datenverlust geöffnet werden kann,
- ein neues Play vollständig im fokussierten Editor erstellt werden kann,
- X eindeutig Mannverteidigung und Raute eindeutig Zonenverteidigung darstellt,
- gemischte Verteidigungsformen möglich sind,
- Pass, Lauf, Dribbling, Screen und Pick & Roll weiterhin funktionieren,
- Aktionen nacheinander oder gleichzeitig aufgenommen werden können,
- Phasen als Vorschaubilder navigiert und sortiert werden können,
- jede Phase eine eigene Traineranweisung speichern kann,
- Vorschau und Animation alle Phasen korrekt wiedergeben,
- PDF- und bestehender GIF-Export weiterhin funktionieren,
- der Ablauf mit Maus und Touch geprüft ist,
- Desktop-, Tablet- und Smartphone-Layouts keine wesentlichen Überlappungen besitzen,
- der vollständige vorhandene Testlauf weiterhin grün ist.

## Tests

Mindestens folgende automatisierte Prüfungen sind erforderlich:

- Migration alter Boards ohne `defenseMode` und `instruction`,
- X-/Rauten-Darstellung in Editor, Vorschau und Export,
- Mischverteidigung innerhalb einer Phase,
- Erhalt der Verteidigungsart über alle Folgephasen,
- Phasen-Vorschaubilder nach Positions- und Aktionsänderungen,
- Speichern und Laden von Phasenanweisungen,
- Drag-and-drop-Sortierung ohne Verlust von Aktionen oder Anweisungen,
- korrekte Gruppenanzeige gleichzeitiger Aktionen,
- Pick-and-Roll-Gruppenbearbeitung,
- Animation mit Phasenmarkierungen,
- PDF-Regressionstest,
- Browser-Abnahme auf Desktop und Smartphone.

## Nicht Bestandteil der ersten Umsetzung

- echte 3D-Grafik,
- drehbare Kamera,
- 3D-Spielermodelle,
- vollständige Kopie einer fremden Oberfläche,
- kollaboratives gleichzeitiges Bearbeiten,
- Videoexport als Voraussetzung für den ersten Release,
- automatische KI-Generierung kompletter Plays.

## Weiterarbeit auf einem anderen Gerät

```bash
git clone https://github.com/Ernestokoeber/beep-test.git
cd beep-test
npm ci
npm test
```

Danach diese Spezifikation und den bestehenden Phasenrekorder-Entwurf lesen:

- `docs/superpowers/specs/2026-08-07-courthub-play-editor-2-design.md`
- `docs/superpowers/specs/2026-08-07-phase-action-recorder-design.md`
- `docs/superpowers/plans/2026-08-07-phase-action-recorder.md`

Vor der Implementierung soll aus dieser Spezifikation ein detaillierter, testgetriebener Umsetzungsplan erstellt werden. Produktiver Code wird erst nach Freigabe dieses Dokuments verändert.
