# CourtHub KI-Zuverlässigkeit und Gemini-3.8-Migration

Datum: 01.10.2026
Status: Implementiert, noch nicht veröffentlicht.
Basis: lokaler `main`, Commit `11c16fa`.
Implementierung: `0f29768`, `f21eb7d`, `a09714f`, `9db5476`, `79ce18c` auf `feat/courthub-ai-reliability`.

Lokale Abnahme am 01.10.2026:

- `npm run test:ai`: fünf KI-Vertragssuiten erfolgreich;
- `npm run smoke`: UI- und Trainingstimer-Smoke erfolgreich;
- `node scripts/check.mjs`: Syntax- und Service-Worker-Prüfung erfolgreich;
- `npm test`: vollständige CourtHub-Suite einschließlich Live-Spiel, Spieltag, Offline, Play Designer und Video-Import erfolgreich;
- Veröffentlichung/Produktionsabnahme steht noch aus.

## Ziel und Erfolgskriterien

CourtHub erhält eine gemeinsame, belastbare KI-Schicht auf Basis von
`gemini-3.8-flash`. PDF-Trainingsplanimport, Trainingszusammenfassung,
Taktikerklärung und Saisonplanung verwenden denselben technischen Unterbau,
aber jeweils einen eigenen Eingabe-, Ausgabe- und Validierungsvertrag.

Die Überarbeitung ist erfolgreich, wenn:

- keine KI-Anfrage mehr unkontrolliert am 60-Sekunden-Limit von Vercel endet;
- jeder Fehler als verständliche, aktionsbezogene Meldung im Client ankommt;
- strukturierte Antworten vor jeder Speicherung vollständig validiert werden;
- absolvierte und manuell bearbeitete Trainings niemals von KI-Daten
  überschrieben werden;
- eine unterbrochene Saisonplanung auf demselben Gerät am letzten vollständig
  validierten Wochenblock fortgesetzt werden kann;
- die Taktikerklärung das aktuelle Play-Editor-2-Datenmodell vollständig liest;
- KI-Zusammenfassungen keine Namen oder Zahlen erfinden können;
- alle vier Abläufe automatisierte Erfolgs-, Fehler- und Grenzfalltests besitzen.

## Nicht-Ziele

- Kein KI-Chat und keine freie Assistentenoberfläche.
- Keine automatische Veränderung gespeicherter Daten ohne sichtbare Bestätigung.
- Keine Hintergrundwarteschlange und kein zusätzlicher Cloud-Dienst.
- Kein Mehrmodell-Routing. Alle produktiven Aktionen verwenden
  `gemini-3.8-flash`.
- Keine Google-Suche, kein Grounding und keine medizinischen Empfehlungen.
- Keine neue Datenbankmigration; die vorhandene Tabelle `ai_rate_limit` bleibt
  bestehen.

## Modell- und API-Entscheidung

CourtHub verwendet ausschließlich das stabile Modell `gemini-3.8-flash` über
den bestehenden REST-Endpunkt `v1beta/models/:generateContent`. Der vorhandene
`GEMINI_API_KEY` bleibt die einzige notwendige KI-Umgebungsvariable. Ein neues
SDK oder eine zusätzliche Laufzeitabhängigkeit ist nicht erforderlich.

Die Anfragekonfiguration wird pro Aktion festgelegt:

| Aktion | Thinking-Level | Ausgabe | Zielzeit |
| --- | --- | --- | --- |
| PDF-Import | `low` | JSON-Schema | höchstens 48 Sekunden |
| Trainingszusammenfassung | `low` | JSON-Schema | höchstens 30 Sekunden |
| Taktikerklärung | `low` | JSON-Schema | höchstens 30 Sekunden |
| Saisonplanung | `low` | JSON-Schema | höchstens 48 Sekunden je Trainingstermin |

Das serverseitige Gesamtzeitbudget liegt unter dem Vercel-Limit von 60
Sekunden. Ein `AbortController` beendet den Provider-Aufruf kontrolliert.
Ein zweiter serverseitiger Versuch erfolgt nur bei einem frühen `429`-, `500`-
oder `503`-Fehler und nur, wenn mindestens 20 Sekunden Restbudget vorhanden
sind. Timeout-, Schema- und Inhaltsfehler werden nicht innerhalb derselben
Serverfunktion wiederholt. Der Client darf einen als wiederholbar
klassifizierten Termin einmal als neue Anfrage wiederholen.

## Gemeinsame KI-Architektur

### Gemini-Client

Ein fokussiertes Modul unter `api/_lib/` übernimmt:

- Aufbau und Versand der REST-Anfrage;
- Modell-ID, Thinking-Level und JSON-Schema;
- Gesamtdeadline und kontrollierten Abbruch;
- Auswertung von HTTP-Status, `finishReason` und leerer Ausgabe;
- JSON-Parsing und den Aufruf des aktionsbezogenen Validators;
- normalisierte Fehlerobjekte ohne Prompt-, Schlüssel- oder Personendaten.

Der HTTP-Handler `api/ai/gemini.js` bleibt für Authentifizierung,
Aktionsauswahl, Rate-Limit und HTTP-Antwort verantwortlich. Prompts, Schemas und
Validatoren liegen in einem zweiten fokussierten Modul. So lassen sie sich ohne
Datenbank und ohne Vercel-Laufzeit testen.

### Antwortvertrag

Erfolgreiche Antworten behalten die bestehenden Client-Felder `data`, `text`
und `model`, damit die sichtbaren Abläufe nicht unnötig umgebaut werden.
Zusätzlich werden `requestId` und bei Saisonanfragen die bestätigten Termine
zurückgegeben.

Fehler verwenden durchgehend:

```json
{
  "error": "Verständliche deutsche Meldung",
  "code": "AI_TIMEOUT",
  "retryable": true,
  "requestId": "ai_..."
}
```

Vorgesehene Codes sind `AI_TIMEOUT`, `AI_RATE_LIMIT`, `AI_PROVIDER`,
`AI_PROVIDER_REQUEST`, `AI_PROVIDER_AUTH`, `AI_MODEL_UNAVAILABLE`,
`AI_EMPTY_RESPONSE`, `AI_TRUNCATED_RESPONSE`, `AI_INVALID_RESPONSE`,
`AI_INPUT_INVALID` und `AI_NOT_CONFIGURED`. Der Client erhält keine
Provider-Rohantwort und keine internen Stacktraces.

### Client-Timeout und Darstellung

`BT.api.request()` erhält einen optionalen Timeout. KI-Anfragen verwenden eine
Deadline, die etwas über dem jeweiligen Serverbudget liegt. Ein HTML-Fehler von
Vercel wird für KI-Aktionen nicht mehr pauschal als fehlende Serverfunktion
ausgegeben, sondern als Zeitüberschreitung oder vorübergehender Serverfehler.

Jede Oberfläche zeigt:

- den aktuellen Arbeitsschritt;
- eine konkrete Fehlermeldung;
- ob ein erneuter Versuch sinnvoll ist;
- Fehlercode und `requestId` in einer sichtbaren Fehlermeldung.

## KI-Saisonplanung

### Blockbildung und Umfang

Die Saison wird chronologisch in Einzelanfragen mit genau einem Trainingstermin
aufgeteilt. Der Leistungs- und Belastungskontext wird unmittelbar vor jeder
Anfrage auf diesen Termin zugeschnitten. Wochenzusammenhang, Spielabstand und
bereits erzeugte Schwerpunkte bleiben als kompakter Kontext erhalten, ohne zwei
umfangreiche Einheiten in eine Antwort zu zwingen.

Jede Antwort muss genau einmal den angefragten Trainingstermin und keinen
weiteren Termin liefern. Für normale Freitage sind `over8` und `eightOrLess`
Pflicht; Spielwochen-Freitage liefern stattdessen genau fünf individuelle
Stationen. Für andere Wochentage sind Varianten nicht erforderlich. Drill-Minuten, Intensitäten,
Wurfziele und Textlängen werden server- und clientseitig validiert und danach
normalisiert.

Das Rate-Limit für `planSeason` wird separat auf 60 Blockanfragen pro Nutzer
und Stunde gesetzt. Die übrigen KI-Aktionen behalten standardmäßig 30
Anfragen pro Nutzer und Stunde. Provider-Limits bleiben maßgeblich und werden
verständlich weitergegeben.

### Fortsetzung und atomare Übernahme

Nach jedem erfolgreichen Termin speichert der Browser lokal einen Entwurf mit:

- Hash der Termine, Coach-Eingaben und Planungsregeln;
- Modell-ID und Vertragsversion;
- bereits bestätigten Einzelterminen;
- Index des nächsten Termins;
- Erstellungs- und Aktualisierungszeit.

Der Entwurf enthält keine Zugangsdaten und wird nicht in das Team-Workspace-
Dokument geschrieben. Er ist gerätebezogen. Passt der Hash beim nächsten
Aufruf, bietet CourtHub „Saisonplanung fortsetzen“ an. Bei geänderten Terminen
oder Eingaben wird der alte Entwurf verworfen und eine neue Planung begonnen.

Bis alle Termine validiert sind, werden keine Trainings verändert. Erst der
abschließende Bestätigungsdialog ruft die vorhandene atomare Übernahmelogik
auf. Abgeschlossene, beendete, manuell bearbeitete oder nicht von der
KI-Saisonplanung stammende Einheiten bleiben geschützt.

Ein fehlgeschlagener Termin bleibt im Entwurf offen. Nur ein als wiederholbar
klassifizierter Fehler erhält einen automatischen Client-Wiederholungsversuch;
danach kann der Coach denselben Termin fortsetzen, ohne frühere Termine neu
anzufragen.

## PDF-Trainingsplanimport

Der Import übermittelt zusätzlich zu PDF und MIME-Typ die tatsächlich
konfigurierten Trainingstage, Startzeit und Trainingsdauer. Der Prompt enthält
keine fest codierten Dienstage, Freitage oder Uhrzeiten mehr.

Die strukturierte Antwort enthält Phase und Trainings. Der Validator prüft:

- erlaubtes Datumsformat und plausible Wochentage;
- nichtnegative, begrenzte Wiederholungs- und Versuchszahlen;
- Drill-Namen, Minuten und Beschreibungen;
- eindeutige Trainingstermine;
- die Gesamtgröße der Antwort.

Vor der Übernahme zeigt CourtHub eine Vorschau mit den Gruppen „neu“, „leerer
Termin wird befüllt“ und „geschützt/übersprungen“. Ein vorhandenes Training
wird nur befüllt, wenn es weder abgeschlossen noch beendet ist und noch keine
manuelle Notiz, Planung oder erfassten Trainingswerte besitzt. Alle anderen
Einheiten werden sichtbar übersprungen. Neue bzw. befüllte Einheiten erhalten
`planning.source = "ai-pdf"` und bleiben anschließend manuell geschützt.

## Trainingszusammenfassung

CourtHub berechnet alle verwendbaren Fakten deterministisch vor der
KI-Anfrage. Dazu gehören Anwesenheit, Teamquoten, Wurfkategorien, maximal zwei
nach eindeutigen Regeln ausgewählte Leistungen, Drills und – sofern vorhanden
– der Vergleich zum letzten abgeschlossenen Training.

Gemini erhält eine Liste mit stabilen Fakten-IDs statt unstrukturierten
Rohdaten. Die Antwort besteht aus drei bis vier Sätzen; jeder Satz nennt die
verwendeten Fakten-IDs. Die Validierung verwirft:

- unbekannte Fakten-IDs;
- Namen, die in keinem verwendeten Fakt vorkommen;
- Zahlen oder Prozentwerte, die in keinem verwendeten Fakt vorkommen;
- mehr als zwei namentlich genannte Spieler;
- leere oder überlange Texte.

Nach erfolgreicher Prüfung liefert der Server weiterhin einen fertigen
`text`. Bei Fehlern bleibt die vorhandene manuelle Zusammenfassung verfügbar.
Die Schaltfläche „Neu generieren“ erzeugt eine neue Anfrage, verändert aber
keine Trainingsdaten.

## Taktikerklärung im aktuellen Play Designer

Der alte Serializer für `players`, `arrows` und `texts` wird durch einen reinen
Serializer für Schema-Version 3 ersetzt. Er übermittelt:

- Titel, Kategorie, Beschreibung und Tags;
- je Phase die Anweisung, Dauer und Anfangspositionen;
- Angriffsspieler, Verteidiger samt Mann-/Zonenmodus und Ballposition;
- Lauf- und Dribbelbewegungen mit Start, Dauer, Beziehung und Endpunkt;
- Pässe mit Absender, Empfänger, Timing und Kurve;
- Screens mit Blocksteller, Begünstigtem, Zielverteidiger, Winkel und Timing;
- Gruppeninformationen für gleichzeitige Aktionen und Pick-and-Roll;
- automatisch erzeugte Defense-Reaktionen als solche gekennzeichnet.

Der aktuelle Quick Editor erhält im Kopf-/Mehr-Menü „Mit KI erklären“. Die
Erklärung erscheint in einem Dialog und kann kopiert oder nach Bestätigung als
Coaching Points übernommen werden. Das Übernehmen verändert ausschließlich die
Beschreibung des aktuellen Entwurfs und löst den vorhandenen Speicherablauf
aus. Ohne Bearbeitungsrecht ist die Erklärung lesbar, aber nicht übernehmbar.

Die Ausgabe enthält Ziel, Ablauf in Phasen, Rollen der tatsächlich beteiligten
Spieler, zwei bis vier Coaching-Punkte sowie Defense-Read und passende
Offense-Antwort. Fehlende Rollen werden nicht erfunden.

## Datenschutz und Sicherheit

- Der Gemini-Schlüssel bleibt ausschließlich serverseitig.
- Prompts und Provider-Rohantworten werden nicht vollständig protokolliert.
- Logs enthalten nur `requestId`, Aktion, Modell, Dauer, Status, Fehlercode und
  bei Saisonblöcken die Anzahl der Slots.
- PDF-Inhalte werden nur für den jeweiligen Request an Gemini gesendet und
  nicht zusätzlich in CourtHub gespeichert.
- Für Zusammenfassungen werden nur benötigte Spielernamen und aggregierte
  Trainingswerte übertragen.
- Alle KI-Aktionen verlangen weiterhin eine gültige Teammitgliedschaft.

## Teststrategie

### Gemeinsamer KI-Client

Tests verwenden injizierbares `fetch` und eine kontrollierte Uhr. Sie prüfen:

- Gemini 3.8 Flash und aktionsbezogene Thinking-Level;
- korrekt übermitteltes JSON-Schema;
- erfolgreichen Text- und JSON-Abruf;
- Abort vor dem Vercel-Limit;
- frühe Wiederholung bei `429`, `500` und `503`;
- keine Wiederholung nach Timeout oder spätem Fehler;
- leere, abgeschnittene, syntaktisch ungültige und schemawidrige Antworten;
- sichere normalisierte Fehler ohne Rohdaten.

### Aktionsverträge

- PDF: echte App-Einstellungen, Validierung und Schutzmatrix.
- Zusammenfassung: erlaubte Fakten, unbekannte Namen und erfundene Zahlen.
- Taktik: Schema-3-Elemente, Screens, Pässe, Gleichzeitigkeit, Zone und
  Defense-Reaktionen.
- Saison: Wochenblöcke, exakte Termine, Freitagsvarianten, Retry, lokales
  Fortsetzen, Hash-Wechsel und atomare Übernahme.

### Regression

Die bestehende Vollprüfung `npm test` bleibt der Abschlussvertrag. Der
datumabhängige Rauchtest zur geschützten Saisonplanung wird so angepasst, dass
er mindestens das ausdrücklich angelegte manuelle Training statt eine exakt
gleichbleibende Gesamtzahl geschützter Termine prüft.

## Rollout und Betrieb

Die Implementierung benötigt keine neue Datenbankmigration. Vor dem Deployment
werden lokale Vertragstests, die vollständige Testsuite und ein produktionsnaher
Handler-Test mit simuliertem Gemini-Transport ausgeführt.

Nach Deployment werden die vier Abläufe nacheinander mit kleinen Testdaten
geprüft. Die Produktion wird nicht durch einen vollständigen Saisonlauf als
ersten Test belastet. Reihenfolge: Trainingszusammenfassung, Taktikerklärung,
kleiner PDF-Import, danach Saisonplanung mit zwei Einzelterminen. Erst dann wird
ein vollständiger Saisonlauf empfohlen.

## Abnahmekriterien

1. Alle vier Oberflächen zeigen `gemini-3.8-flash` als verwendetes Modell.
2. Ein absichtlich verzögerter Provider-Aufruf endet kontrolliert mit
   `AI_TIMEOUT` vor dem Vercel-Limit.
3. Ungültiges JSON und falsche Termine verändern keine CourtHub-Daten.
4. Eine abgebrochene Saisonplanung kann nach Neuladen fortgesetzt werden.
5. Ein manueller oder abgeschlossener Trainingsplan bleibt bei Saison- und
   PDF-Import unverändert.
6. Die Taktikerklärung nennt einen erfassten Screen und Pass aus dem aktuellen
   Schema-3-Board korrekt.
7. Eine Zusammenfassung mit erfundenem Namen oder erfundener Zahl wird
   verworfen und bietet die manuelle Zusammenfassung an.
8. `npm test` endet ohne Fehler und ohne datumabhängige Annahme.
