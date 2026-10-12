# CourtHub Spielauswertung und individuelle Spielerentwicklung

Datum: 12.10.2026
Status: Fachlich freigegeben am 12.10.2026.
Basis: lokaler `main`, Commit `96df895`.

## Ziel und Erfolgskriterien

CourtHub erhält einen durchgängigen, coachgeführten Kreislauf aus
Spielauswertung, bestätigten Entwicklungsfeldern, passender Übungsauswahl und
späterer Trainingsplanung. Spielerbewertungs-PDFs werden nur vorübergehend
verarbeitet. Erst vom Coach bestätigte, strukturierte Beobachtungen werden im
synchronisierten Team-Workspace gespeichert.

Die Erweiterung ist erfolgreich, wenn:

- individuelle Spielerbewertungen aus PDF-Dateien strukturiert eingelesen,
  eindeutig Spielern und Spielen zugeordnet und einzeln bestätigt oder
  verworfen werden können;
- jeder Spieler eine nachvollziehbare Entwicklungshistorie sowie höchstens
  drei aktuelle Entwicklungsfelder besitzt;
- wiederkehrende Muster aus mehreren Spielen stärker gewichtet werden als
  Einzelbeobachtungen;
- CourtHub zuerst passende Übungen aus der vorhandenen Übungsbibliothek
  anbietet und neue KI-Übungen nur nach ausdrücklicher Freigabe speichert;
- der Coach beim offenen Freitagstraining schnell ein Spielerprofil öffnen,
  geeignete Übungen zeigen und konkrete Rückfragen stellen kann;
- zukünftige Dienstagstrainings ausschließlich als transparenter
  Änderungsvorschlag mit Quellenbezug angepasst werden;
- kein KI-Vorschlag ohne ausdrückliche Bestätigung gespeicherte Trainings,
  Spielerprofile oder die Übungsbibliothek verändert;
- das bestehende Dienstagstraining am 13.10.2026 mit der ID
  `tr_u9ki7ul9pxyo` unverändert bleibt;
- PDF-Dateien und vollständige PDF-Texte nicht dauerhaft gespeichert werden.

## Nicht-Ziele

- Keine Spielerzugänge, Spieler-Selbstbedienung oder getrennten Spieler-Apps.
- Keine dauerhafte Ablage von PDF-Dateien oder vollständigen OCR-Texten.
- Keine automatische Zuordnung von Freitagsstationen und kein automatisch
  erzeugter Freitagsplan.
- Keine rückwirkende Änderung des bestehenden Dienstagstrainings vom
  13.10.2026.
- Keine medizinischen Diagnosen, Therapieempfehlungen oder Belastungsfreigaben.
- Keine neue PostgreSQL-Tabelle in Version 1.
- Kein automatisches Überschreiben von Trainings oder Übungen.

## Ausgangslage und fachliche Lücke

CourtHub kann bereits Atlas-Spieldaten übernehmen und übergibt der
Saisonplanung einen verdichteten Leistungskontext. Die Detailinformationen aus
Spielereignissen, Videoauswertung und einzelnen Spielerbewertungen werden dabei
jedoch auf allgemeine Texte und Summen reduziert. Es fehlt ein einheitliches,
versionierbares Entwicklungsjournal, das eine bestätigte Beobachtung mit dem
Spieler, dem Ursprungsspiel, geeigneten Übungen und späteren Trainings
verbindet.

Die bestehende Funktion zum Erstellen eines Trainings aus einer Spielanalyse
erzeugt außerdem allgemeine Inhalte. Sie besitzt weder eine
bestätigungspflichtige Differenzansicht noch einen belastbaren Nachweis, welche
bestätigten Spielbeobachtungen eine Änderung begründen.

## Leitentscheidungen

1. Das synchronisierte Team-Workspace-JSON bleibt in Version 1 die Quelle der
   Wahrheit. Es wird um ein versioniertes Entwicklungsjournal erweitert.
2. Spielerprofile werden aus dem Journal abgeleitet und nicht als zweite,
   potenziell widersprüchliche Datenkopie gespeichert.
3. KI strukturiert und schlägt vor; der Coach bestätigt, korrigiert oder
   verwirft.
4. Prioritäten werden deterministisch berechnet. KI darf eine Priorität
   vorschlagen, entscheidet aber nicht allein über die Rangfolge.
5. Dienstag und Freitag bleiben fachlich getrennt: Zukünftige Dienstage können
   nach Freigabe teambezogen angepasst werden; freitags entscheidet jeder
   Spieler selbst, woran er arbeiten möchte.

## Datenfluss

```text
Atlas-/Live-Daten, Videoauswertung, Coach-Notiz oder Spielerbewertungs-PDF
        |
        v
temporäre KI-Strukturierung im Browser/Request
        |
        v
Vorschau mit Spieler- und Spielzuordnung
        |
        v
Bestätigung, Korrektur oder Ablehnung durch den Coach
        |
        v
Entwicklungsjournal im synchronisierten Team-Workspace
        |
        +--> abgeleitetes Spielerprofil mit höchstens drei Schwerpunkten
        |
        +--> passende bestehende Übungen
        |
        +--> bestätigungspflichtiger Vorschlag für neue Übung
        |
        +--> zukünftiger Dienstag: begründeter Trainingsänderungsvorschlag
```

Bis zur Bestätigung existiert der Importentwurf nur im Arbeitsspeicher des
Browsers. Abbruch, Neuladen oder Schließen verwirft ihn vollständig und
verändert den Team-Workspace nicht.

## Datenmodell im Team-Workspace

Die Storage-Schema-Version wird von 4 auf 5 erhöht. `empty()`, Laden,
Migration, Backup, Import, Export und Konfliktzusammenführung erhalten zwei
neue Top-Level-Listen:

- `developmentFindings`
- `developmentImportReceipts`

Alte Backups ohne diese Listen bleiben gültig; die Migration ergänzt leere
Listen. Bei der Synchronisierung werden Einträge anhand stabiler IDs
zusammengeführt. Eine neuere `updatedAt`-Version gewinnt nur für denselben
Eintrag. Unabhängige Einträge werden nicht verworfen.

### Entwicklungsbeobachtung

```json
{
  "id": "df_...",
  "scope": "player",
  "playerId": "pl_...",
  "sourceGameId": "game_...",
  "sourceType": "player-evaluation-pdf",
  "sourceHash": "sha256:...",
  "sourceLabel": "Spielerbewertung BG Illertal 3",
  "sourcePage": 2,
  "category": "decision",
  "skillKey": "turnover-control",
  "kind": "development",
  "observation": "Unter Druck wird der erste Pass zu früh erzwungen.",
  "evidenceExcerpt": "...",
  "evidenceRefs": [],
  "suggestedPriority": 4,
  "coachPriority": 5,
  "pinned": false,
  "roleRelevant": true,
  "status": "new",
  "drillTags": ["passing", "pressure", "advantage-read"],
  "linkedDrillIds": [],
  "coachNote": "",
  "createdAt": "2026-10-12T18:00:00.000Z",
  "confirmedAt": "2026-10-12T18:05:00.000Z",
  "updatedAt": "2026-10-12T18:05:00.000Z"
}
```

Pflichtfelder sind `id`, `scope`, `sourceGameId`, `sourceType`, `category`,
`skillKey`, `kind`, `observation`, `suggestedPriority`, `status`,
`createdAt`, `confirmedAt` und `updatedAt`. Bei `scope = "player"` ist eine
gültige `playerId` erforderlich; bei `scope = "team"` ist `playerId = null`.
Team-Beobachtungen erscheinen nicht in individuellen Spielerprofilen, können
aber einen zukünftigen Dienstagsschwerpunkt begründen.

`sourceType` erlaubt `player-evaluation-pdf`, `atlas`, `live-game`,
`video-analysis` und `coach-note`. `sourceHash` ist für PDF-Quellen Pflicht
und sonst `null`. `evidenceRefs` enthält bei strukturierten Spielquellen
ausschließlich bekannte CourtHub-Fakt-, Ereignis- oder Statistik-IDs.
`evidenceExcerpt` ist auf 400 Zeichen begrenzt und darf nur den zur
Beobachtung nötigen Ausschnitt enthalten. `coachPriority` ist entweder `null`
oder eine ganze Zahl von 1 bis 5. `suggestedPriority` liegt ebenfalls zwischen
1 und 5.

Erlaubte Statuswerte sind:

- `new`: bestätigt, aber noch nicht gezielt bearbeitet;
- `developing`: aktuell im Training bearbeitet;
- `stable`: Fortschritt ist wiederholt sichtbar, bleibt aber unter Beobachtung;
- `achieved`: Ziel ist erreicht und wird nicht mehr als aktueller Schwerpunkt
  gewertet.

Die Oberfläche zeigt dafür die deutschen Begriffe „Neu“, „In Entwicklung“,
„Stabil“ und „Erreicht“.

`kind` ist entweder `strength` oder `development`. Stärken erscheinen im
Spielerprofil getrennt und fließen nicht in die Rangfolge der drei
Entwicklungsfelder ein.

### Importbeleg

```json
{
  "id": "dir_...",
  "sourceHash": "sha256:...",
  "sourceLabel": "Spielerbewertung BG Illertal 3",
  "gameId": "game_...",
  "findingIds": ["df_..."],
  "importedAt": "2026-10-12T18:00:00.000Z",
  "confirmedAt": "2026-10-12T18:05:00.000Z"
}
```

Der SHA-256-Hash wird im Browser aus der Originaldatei berechnet. Er verhindert
versehentliche Doppelimporte, ohne die Datei zu speichern. Dateiname und
Quellenbezeichnung werden vor der Speicherung bereinigt. Weder PDF-Bytes noch
vollständiger extrahierter Text gehören zum Importbeleg.

### Kontrollierte Taxonomie

`category` erlaubt ausschließlich:

- `technique`
- `decision`
- `offense`
- `defense`
- `rebounding`
- `transition`
- `role`
- `load`

Version 1 verwendet folgende `skillKey`-Werte:

| Kategorie | Erlaubte Schlüssel |
| --- | --- |
| `technique` | `ball-control`, `passing`, `footwork`, `shooting`, `finishing` |
| `decision` | `scanning`, `advantage-read`, `pass-read`, `shot-selection`, `turnover-control` |
| `offense` | `spacing`, `cutting`, `screening`, `pnr-handler`, `pnr-screener`, `off-ball` |
| `defense` | `on-ball`, `closeout`, `help`, `rotation`, `screen-coverage`, `transition-defense` |
| `rebounding` | `box-out`, `pursuit`, `outlet` |
| `transition` | `sprint-lanes`, `early-advance`, `transition-decision` |
| `role` | `point-guard-organization`, `off-ball-guard`, `wing-role`, `big-role` |
| `load` | `conditioning`, `recovery`, `availability` |

`load` dokumentiert nur beobachtbare Trainings- und Verfügbarkeitsaspekte. Es
darf keine medizinische Interpretation enthalten.

## Zusammenführung der vollständigen Spielauswertung

Die Spieldetailseite erhält zusätzlich die Ansicht „Auswertung bündeln“. Sie
führt vier Arten von Belegen für genau ein Spiel zusammen:

- verifizierte Atlas- und Live-Spiel-Fakten mit stabilen Ereignis- oder
  Statistik-IDs;
- bereits vorhandene Coach-Notizen;
- bestätigte Erkenntnisse aus einer Videoauswertung;
- bestätigte Beobachtungen aus Spielerbewertungs-PDFs.

Deterministische Regeln dürfen aus verifizierten Kennzahlen Kandidaten
erzeugen, beispielsweise Ballverluste unter Druck, zugelassene
Offensivrebounds oder Probleme in der Transition. Freitext und Videoergebnisse
werden nur als Kandidaten übernommen. In beiden Fällen bestätigt, korrigiert
oder verwirft der Coach jede Erkenntnis, bevor sie als `developmentFinding`
gespeichert wird.

Mannschaftsthemen verwenden `scope = "team"`. Individuelle Erkenntnisse
verwenden `scope = "player"`. Eine Beobachtung darf nicht gleichzeitig beide
Bereiche abdecken; bei Bedarf entstehen zwei getrennte, jeweils belegte
Einträge. Damit kann eine Dienstagsplanung die vollständige Spielauswertung
verwenden, ohne unbestätigte Rohdaten oder allgemeine KI-Texte als Tatsachen zu
behandeln.

## Import und Bestätigung von Spielerbewertungen

Die Spieldetailseite erhält die Aktion „Spielerbewertungen importieren“. Der
Coach wählt zuerst das Ursprungsspiel und anschließend eine PDF-Datei. CourtHub
übermittelt die Datei über die bestehende authentifizierte KI-Schnittstelle.

Der Server führt die neue Aktion `parsePlayerDevelopmentPdf` mit dem Vertrag
`player-development-import.v1` aus. Sie verwendet den bestehenden
PDF-Grenzwert von ungefähr 3 MB, `application/pdf`, ein niedriges
Thinking-Level und ein Serverzeitbudget von höchstens 48 Sekunden.

Die Antwort enthält ausschließlich strukturierte Kandidaten mit:

- erkennbarem Spielernamen oder Rückfrage zur Zuordnung;
- Kategorie und `skillKey` aus der erlaubten Taxonomie;
- Stärke oder Entwicklungsfeld;
- sachlicher Beobachtung;
- kurzem Belegausschnitt und PDF-Seite;
- vorgeschlagener Priorität;
- passenden Übungs-Tags;
- optional vorgeschlagener Rollenrelevanz.

Die KI darf keine Spieler-ID, Spiel-ID, Diagnose, Statistik oder Beobachtung
erfinden. Spieler- und Spiel-IDs werden ausschließlich in CourtHub zugeordnet.
Unklare Namen müssen sichtbar als Zuordnungskonflikt erscheinen.

In der Vorschau kann der Coach jeden Kandidaten:

- einem Spieler zuordnen oder die Zuordnung korrigieren;
- als Stärke oder Entwicklungsfeld einordnen;
- Priorität und Rollenrelevanz ändern;
- Text und Kategorie korrigieren;
- bestätigen oder verwerfen.

Nur bestätigte Kandidaten werden gemeinsam mit dem Importbeleg atomar
gespeichert. Ein Validierungsfehler, Abbruch oder Verbindungsfehler erzeugt
keine Teiländerung. Eine teilweise Auswahl innerhalb einer gültigen Vorschau
ist erlaubt; verworfene Kandidaten werden nicht gespeichert.

## Spielerprofil und Priorisierung

Die Spielerseite erhält den Bereich „Entwicklung“ mit:

- höchstens drei aktuellen Entwicklungsfeldern;
- bestätigten Stärken;
- passenden Übungen und kurzen Coaching-Hinweisen;
- chronologischer Historie aller bestätigten Beobachtungen;
- Filtern nach Spiel, Kategorie und Status;
- Aktionen zum Fixieren, Herabstufen und Markieren als „Erreicht“.

Die drei Entwicklungsfelder werden aus offenen Spielerbeobachtungen nach
`playerId + category + skillKey` gruppiert. Ein Muster zählt nur dann als
wiederholt, wenn derselbe Gruppenschlüssel in unterschiedlichen
Ursprungsspielen bestätigt wurde. Mehrere Fundstellen aus derselben PDF oder
demselben Spiel erhöhen die Wiederholungszahl nicht.

Für eine Gruppe ist die Grundpriorität der höchste wirksame Prioritätswert
ihrer nicht erreichten Einträge. Ein wirksamer Wert ist `coachPriority`, falls
gesetzt, sonst `suggestedPriority`. Die Aktualität verwendet das jüngste
`confirmedAt`. Rollenrelevanz und Fixierung gelten, sobald mindestens ein
offener Gruppeneintrag entsprechend bestätigt wurde. Für die Statuskorrektur
gilt der Status des jüngsten offenen Eintrags. Der stabile Gruppenschlüssel
dient als letzte Sortierung bei vollständigem Gleichstand.

Für jede Gruppe gilt:

```text
Grundpriorität = coachPriority, falls gesetzt, sonst suggestedPriority
Punktzahl = Grundpriorität * 10
          + min(Anzahl unterschiedlicher Ursprungsspiele, 3) * 5
          + Aktualität
          + 5 bei bestätigter Rollenrelevanz
          + 100 bei Fixierung durch den Coach
          + Statuskorrektur
```

Die Aktualität beträgt 10 Punkte bis einschließlich 14 Tage, 5 Punkte bis
einschließlich 42 Tage und danach 0 Punkte. Die Statuskorrektur beträgt 0 für
`new`, -5 für `developing` und -20 für `stable`; `achieved` wird vollständig
ausgeschlossen. Bei Gleichstand entscheiden zuerst das jüngste bestätigte
Datum und anschließend der stabile Gruppenschlüssel. Dadurch ist die Rangfolge
reproduzierbar.

Der Coach kann jede automatisch berechnete Rangfolge durch Fixierung,
Prioritätsänderung oder Statusänderung nachvollziehbar korrigieren.

## Übungszuordnung und Übungsbibliothek

Übungen erhalten das optionale Feld `developmentTags`. CourtHub sucht zuerst
in der vorhandenen Übungsbibliothek nach Überschneidungen zwischen
`developmentTags`, `skillKey` und `drillTags`. Danach werden gewünschte
Intensität, verfügbare Spielerzahl und Material als Filter verwendet.

Vorhandene Übungen können manuell verschlagwortet werden. Eine automatische
Erstzuordnung anhand von Name und Kategorie darf als Vorschau angeboten, aber
nicht ungeprüft gespeichert werden.

Nur wenn keine ausreichend passende vorhandene Übung gefunden wird, darf die
KI eine neue Übung vorschlagen. Die Vorschau enthält Ziel, Organisation,
Ablauf, Coaching-Punkte, Belastung, Varianten, Kennzahlen und Constraints. Erst
„In Übungsbibliothek übernehmen“ erzeugt einen neuen Übungseintrag. Eine
Ablehnung verändert weder Bibliothek noch Spielerprofil.

## Offenes Freitagstraining

CourtHub erhält die Coach-Ansicht `#/development` mit dem Navigationsnamen
„Individualentwicklung“. Sie ist für das offene Freitagstraining optimiert:

1. Spieler auswählen oder über eine kompakte Karte öffnen.
2. Höchstens drei aktuelle Entwicklungsfelder und bestätigte Stärken sehen.
3. Passende vorhandene Übungen nach Belastung, Material und Schwierigkeit
   filtern und öffnen.
4. Optional eine konkrete Frage zur Arbeit mit diesem Spieler stellen.

Die neue KI-Aktion `answerPlayerDevelopmentQuestion` erhält nur bestätigte
Beobachtungen, vorhandene passende Übungen und die konkrete Coach-Frage. Ihr
strukturierter Vertrag liefert `answer`, verwendete `findingIds`, verwendete
`drillIds` und optional einen noch ungespeicherten Übungsvorschlag. Jede
inhaltliche Aussage muss auf bestätigte Beobachtungs-IDs verweisen. Unbekannte
IDs oder unbelegte Spielerbehauptungen machen die Antwort ungültig.

Freitag erzeugt CourtHub weder automatisch einen Trainingsplan noch eine
Stationszuordnung. Die Entscheidung, woran ein Spieler arbeitet, bleibt beim
Spieler im Gespräch mit dem Coach. Nach dem Training kann der Coach lediglich
markieren, welche Entwicklungsfelder tatsächlich bearbeitet wurden; dadurch
wechselt ein Feld auf Wunsch von `new` zu `developing`.

## Zukünftige Dienstagstrainings

Auf zukünftigen, nicht geschützten Dienstagstrainings erscheint die explizite
Aktion „Training anhand der Spielauswertung prüfen“. Sie startet die neue
KI-Aktion `proposeTrainingRevision` und speichert zunächst nichts.

Die Aktion erhält:

- genau ein Zieltraining;
- bestätigte, noch relevante Team-Beobachtungen und zusammengefasste
  Spielermuster;
- vorhandene Übungen und verfügbare Rahmenbedingungen;
- die zuletzt bestätigten Trainingsbelastungen;
- die CourtHub-Regeln für Dauer, Aufbau und Schutzstatus.

Der Vertrag liefert einen vollständigen Kandidatenplan mit exakt 105 Minuten,
davon 15 Minuten Mannschaftsbesprechung und 90 Minuten aktive Trainingszeit.
Er darf höchstens drei verständliche Mannschaftsschwerpunkte enthalten. Jeder
Block verweist auf die bestätigten `findingIds`, die ihn begründen.

Vor der Übernahme zeigt CourtHub eine Differenzansicht:

- bisheriger Block;
- vorgeschlagene Änderung;
- bestätigte Spielbeobachtungen als Begründung;
- erwartetes Trainingsziel;
- Auswirkungen auf Dauer und Belastung.

Der Coach kann Änderungen einzeln abwählen und erst danach den gesamten Plan
bestätigen. Die Übernahme erfolgt atomar und nur, wenn weiterhin exakt 105
Minuten erreicht werden. Abgeschlossene, bereits gestartete, manuell
geschützte oder als unveränderbar markierte Trainings werden nicht geändert.

Das Training `tr_u9ki7ul9pxyo` vom 13.10.2026 wird über eine feste Schutzregel
aus ID und Datum erkannt. Dadurch muss sein vorhandener Datensatz nicht einmal
um ein Metadatenfeld ergänzt werden. Die neue Funktion bietet dafür weder einen
Vorschlag noch eine Übernahme an. Für zukünftig manuell geschützte Trainings
kann `planning.protectedFromGameAnalysis = true` verwendet werden.
Freitagstrainings werden von `proposeTrainingRevision` grundsätzlich
ausgeschlossen.

## KI-Verträge und Validierung

Version 1 ergänzt drei fokussierte Aktionen:

| Aktion | Vertrag | Zweck | Zeitbudget |
| --- | --- | --- | --- |
| `parsePlayerDevelopmentPdf` | `player-development-import.v1` | PDF in bestätigbare Kandidaten strukturieren | 48 Sekunden |
| `answerPlayerDevelopmentQuestion` | `player-development-answer.v1` | belegte Coach-Antwort und Übungsauswahl | 30 Sekunden |
| `proposeTrainingRevision` | `training-revision.v1` | vollständiger, begründeter Dienstag-Kandidat | 48 Sekunden |

Alle drei Aktionen verwenden feste JSON-Schemas sowie server- und
clientseitige Validatoren. Textlängen, Arrays, Aufzählungswerte, IDs,
Zeitangaben und Referenzen werden begrenzt. Eine Antwort mit unbekannter
`findingId`, `drillId`, `playerId` oder `gameId` wird verworfen.

Der Dienstag-Vertrag ist bewusst getrennt von `planSeason`: Er benötigt eine
blockgenaue Differenz, Quellen-IDs und einen einzelnen geschützten Zieltermin.
Die allgemeine Saisonplanung bleibt dadurch unverändert.

## Datenschutz und Sicherheit

- Alle Aktionen verlangen die bestehende Teammitgliedschaft und Schreibrechte,
  sobald Daten bestätigt werden.
- PDF-Bytes werden nur für den einzelnen KI-Request verarbeitet und weder im
  Team-Workspace noch in einer Datenbank oder einem Log gespeichert.
- Vollständige extrahierte Texte und KI-Rohantworten werden nicht protokolliert.
- Logs enthalten nur Request-ID, Aktion, Dauer, Status, Fehlercode, Dateigröße
  und Anzahl der Kandidaten.
- Gespeichert werden ausschließlich bestätigte strukturierte Beobachtungen,
  ein kurzer Belegausschnitt, Seitenzahl, bereinigte Quellenbezeichnung und
  Datei-Hash.
- Der serverseitige KI-Schlüssel bleibt unverändert geschützt.
- Prompts untersagen Diagnosen und unbelegte Behauptungen ausdrücklich.

## Fehler- und Konfliktverhalten

- Zu große, beschädigte oder nicht als PDF erkennbare Dateien werden vor dem
  Provider-Aufruf abgelehnt.
- Ein bereits bekannter Datei-Hash zeigt den vorhandenen Importbeleg und
  verhindert standardmäßig einen Doppelimport. Der Coach kann die vorhandenen
  Ergebnisse öffnen, aber nicht dieselbe Datei nochmals als neue Quelle
  speichern.
- Nicht eindeutig zuordenbare Spielernamen blockieren nur die betroffenen
  Kandidaten. Bestätigen ist erst nach manueller Zuordnung oder Verwerfen
  möglich.
- Ein unbekanntes oder gelöschtes Ursprungsspiel verhindert die Speicherung.
- Ein fehlgeschlagener Import, eine ungültige KI-Antwort oder ein
  Synchronisationsfehler verändert keine produktiven Daten.
- Bei Workspace-Konflikten werden unabhängige Beobachtungen per stabiler ID
  erhalten. Gleichzeitige Änderungen desselben Eintrags werden anhand
  `updatedAt` entschieden und dem Coach im bestehenden Konflikthinweis
  angezeigt.
- Der geschützte Dienstag vom 13.10.2026 bleibt auch nach Import,
  Synchronisierung und KI-Anfrage unverändert.

## Teststrategie

### Vertrags- und Validierungstests

- gültige und ungültige Antworten aller drei neuen KI-Aktionen;
- unbekannte IDs, unzulässige Kategorien, zu lange Texte und medizinische
  Behauptungen;
- falscher MIME-Typ, Größenlimit, leere PDF und Provider-Timeout;
- exakte 105 Minuten und höchstens drei Schwerpunkte im Dienstag-Kandidaten;
- belegpflichtige Antworten mit ausschließlich bekannten `findingIds` und
  `drillIds`.

### Import- und Datenmodelltests

- eindeutige und mehrdeutige Spielerzuordnung;
- korrekte Trennung von Team- und Spielerbeobachtungen;
- bekannte und unbekannte Ereignis-, Fakten- und Statistikreferenzen;
- Bestätigung, Korrektur, Ablehnung und teilweise Auswahl;
- Doppelimport anhand des Datei-Hashs;
- keinerlei Mutation bei Validierungs- oder Synchronisationsfehlern;
- Migration alter Backups auf Schema 5;
- Import, Export und Merge der beiden neuen Listen;
- Nachweis, dass PDF-Bytes und vollständiger Text nicht gespeichert werden.

### Priorisierungs- und Profiltests

- reproduzierbare Punktzahl und stabile Reihenfolge;
- Wiederholung zählt nur über unterschiedliche Spiele;
- Aktualitätsstufen bei 14 und 42 Tagen;
- Statusabzüge und Ausschluss erreichter Ziele;
- Fixierung, Coach-Priorität und Rollenrelevanz;
- höchstens drei sichtbare Entwicklungsfelder;
- getrennte Darstellung von Stärken.

### Trainings- und Übungstests

- bestehende passende Übung wird vor KI-Neuvorschlag verwendet;
- neue Übung wird erst nach Bestätigung gespeichert;
- Freitag erzeugt weder Plan noch Stationszuordnung;
- Coach-Fragen verwenden nur bestätigte Befunde;
- ein zukünftiger Dienstag zeigt eine nachvollziehbare Differenzansicht;
- abgewählte Änderungen werden nicht übernommen;
- Schutzmatrix für abgeschlossene, gestartete, manuelle und geschützte
  Trainings;
- `tr_u9ki7ul9pxyo` bleibt bytegleich;
- vollständige CourtHub-Regressionssuite bleibt erfolgreich.

## Rollout

Die Einführung erfolgt in vier kleinen Stufen:

1. Schema-5-Migration, Entwicklungsjournal und Importbelege ohne sichtbare KI.
2. PDF-Import mit Vorschau, Bestätigung und Spielerprofilen.
3. Freitagsansicht, Übungsabgleich und belegte Coach-Fragen.
4. Bestätigungspflichtige Änderungsvorschläge für zukünftige Dienstage.

Nach jeder Stufe werden Workspace-Synchronisierung, Backup-Rückimport und
Offline-Verhalten geprüft. Für den ersten produktiven Test wird eine einzelne
bereits bekannte Spielerbewertung verwendet. Der Coach vergleicht die
Kandidaten mit dem PDF, bevor etwas bestätigt wird.

## Abnahmekriterien

1. Eine Spielerbewertungs-PDF kann ohne dauerhafte Dateispeicherung verarbeitet
   werden.
2. Kein Kandidat erscheint im Spielerprofil, bevor der Coach ihn bestätigt.
3. Ein wiederkehrendes Entwicklungsfeld aus mehreren Spielen erhält
   deterministisch mehr Gewicht als eine gleich priorisierte Einzelbeobachtung.
4. Pro Spieler werden höchstens drei aktuelle Entwicklungsfelder angezeigt.
5. Die Freitagsansicht unterstützt Auswahl und Beratung, erzeugt aber keinen
   festen individuellen Trainingsplan.
6. Eine passende vorhandene Übung wird vor einem KI-Neuvorschlag angeboten.
7. Neue Übungen und Dienstagstrainings werden nur nach ausdrücklicher
   Bestätigung verändert.
8. Jeder Dienstag-Vorschlag nennt die bestätigten Befunde, die eine Änderung
   begründen, und bleibt exakt 105 Minuten lang.
9. Das Training `tr_u9ki7ul9pxyo` vom 13.10.2026 bleibt vollständig
   unverändert.
10. Alte Backups lassen sich weiterhin importieren; neue Entwicklungsdaten
    bleiben bei Export, Import und Synchronisierung erhalten.
