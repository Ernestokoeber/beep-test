# Geführter Spieltag-Modus

Datum: 29.09.2026
Status: Vom Nutzer freigegeben und lokal implementiert auf `feat/guided-matchday`. Automatisierte Tests bestanden, vier wichtige Befunde des unabhängigen Reviews behoben. Verbleibende manuelle Offline-/Handyabnahme siehe `docs/MATCHDAY-MODE.md`. Nicht veröffentlicht.
Basis: lokaler `main`, Commit `0501923`.

## Ziel und abgestimmter Ansatz

Ein Coach bedient CourtHub während des Spiels allein auf dem Handy. Der Modus
führt vor dem Spiel durch die Vorbereitung und bietet danach eine freie
Live-Ansicht. Statistikaktionen und Wechsel benötigen keinen Assistentenschritt.
Die Hallenanzeige wird nicht gesteuert. Erfasst werden individuelle Statistiken
der eigenen Spieler sowie gegnerische Teampunkte für Plus/Minus.

Der Nutzer hat den Ansatz „geführter Einstieg mit freier Live-Ansicht“ gewählt.
Aufwärmen, Spielziele und Taktiken sind optional und überspringbar. Ein
durchgehender Assistent während des Spiels wurde wegen zusätzlicher Bedienwege
verworfen. Die bestehende Live-Erfassung wird eingebunden, nicht neu gebaut.

Die folgenden Detailentscheidungen sind Vorschläge dieser Spezifikation und
werden mit deren Freigabe verbindlich.

## Bedienablauf

### 1. Spiel auswählen

Unter „Spiele“ erhält das ausgewählte Spiel den Einstieg „Spieltag starten“.
Bei gespeichertem Entwurf oder einer Erfassung heißt er „Spieltag fortsetzen“;
bei abgeschlossener Erfassung „Spieltag ansehen“.

Vorhandene Spiele werden anhand ihrer festen ID geöffnet. Datum, Uhrzeit,
eigene Mannschaft, Gegner und Heim-/Auswärtszuordnung sind sichtbar. Die eigene
Seite wird ausdrücklich bestätigt; bei neuen manuellen Spielen ist sie eine
Pflichtangabe und wird nicht allein aus einem Vereinsnamen abgeleitet.

Ein Trainingsspiel wird über ein vereinfachtes manuelles Spielformular angelegt
und als solches gekennzeichnet. Es verwendet dieselbe Erfassung für die eigene
Mannschaft; keine zweite individuelle Mannschaftsstatistik. Es wird nicht als
offizieller Spielplanimport ausgegeben.

### 2. Mannschaft vorbereiten

Der Coach wählt den Spieltagskader, prüft Namen und Trikotnummern und bestimmt
genau fünf Starter. Es gelten die vorhandenen Grenzen und Validierungen der
Live-Erfassung. `0` und `00` bleiben unterschiedliche Nummern; fehlende Nummern
sind erlaubt, doppelte vergebene Nummern nicht.

Nur ausgewählte Spieler werden beim Start validiert. Eine ungültige alte
Profilnummer eines abgewählten Spielers darf den Start nicht blockieren.
Der Entwurf verändert keine Spielerprofile. Die endgültige Erfassung übernimmt
die festen Spieler-IDs und einen Snapshot von Namen und Spieltagsnummern.

### 3. Spiel vorbereiten

Anzahl und Dauer der regulären Abschnitte sowie Verlängerungsdauer werden mit
den bereits unterstützten Uhr-Einstellungen festgelegt. Vorschlag für ein
neues Spiel: vier Viertel à zehn Minuten, Verlängerung fünf Minuten; vor dem
Start sichtbar und änderbar, keine Behauptung allgemeingültiger Verbandsregeln.

Optional sind ein Textfeld für Spielziele, ein Textfeld für das Aufwärmen und
die Auswahl vorhandener Taktiken mit einer kurzen Coaching-Notiz. Der gesamte
optionale Teil lässt sich überspringen, ohne bereits eingegebene Inhalte zu
löschen. Keine automatische KI-Erstellung und kein zusätzlicher Aufwärmtimer.

Eine kompakte Zusammenfassung zeigt Kader, Starter und Uhr-Konfiguration.
„Zur Live-Ansicht“ legt über den bestehenden Setup-Befehl genau eine Erfassung
an. Die Spieluhr bleibt angehalten, bis der Coach „Uhr starten“ betätigt.
Doppeltippen oder Wiederaufnahme nach einem Absturz darf keine zweite Sitzung
anlegen. Nach Sitzungsanlage werden Kader und Uhr nicht aus einem alten Entwurf
überschrieben; Änderungen laufen über die vorhandenen Korrekturfunktionen.

### 4. Freie Live-Ansicht

Die zentrale Ansicht zeigt Abschnitt und Restzeit, erfassten Spielstand,
fünf aktive Spieler bzw. bestätigte Unterzahl, eigene Statistikaktionen,
Gegnerpunkte und Wechsel. Alle vorhandenen Erfassungsfunktionen bleiben erhalten.

Es gibt keine „Weiter“-Pflicht während des Spiels. Vorbereitung und Notizen
sind als einklappbarer Bereich erreichbar. Eine kompakte Schrittanzeige dient
der Orientierung, nicht als zweite Steuerung von Uhr oder Spielstatus.
Korrekturen und Protokoll sind sekundäre Aktionen, weiterhin bewusst zugänglich.

### 5. Viertel- und Halbzeitpause

Bei 0:00 wird eine Pausenübersicht innerhalb der Ansicht angeboten, kein
blockierender Dialog. Sie zeigt erfassten Zwischenstand, Aufstellung, Fouls
und Spielziele. Bei gerader Abschnittszahl wird die Pause nach der Hälfte
der regulären Abschnitte als Halbzeit bezeichnet.

Ein manuelles Anhalten mitten im Viertel erzeugt keine Viertelpause. Wechsel
sind weiterhin bei angehaltener Uhr möglich. Der nächste Abschnitt wird
ausdrücklich vorbereitet und danach ausdrücklich gestartet; weder das Öffnen
der Übersicht noch der Ablauf einer Pause startet die Uhr.
Nach dem letzten regulären Abschnitt sind Abschluss und Verlängerung erreichbar.
Ein möglicherweise unvollständiger erfasster Spielstand erzwingt keine Auswahl.

### 6. Abschluss und Auswertung

„Spiel abschließen“ verwendet den vorhandenen Abschlussbefehl einschließlich
der freiwilligen Bestätigung des vollständigen Punkteverlaufs. Die Bestätigung
ist nicht vorangekreuzt und keine Voraussetzung zum Abschließen.

Die Abschlussansicht enthält den bestehenden Spielerbericht: Spieltagsnummer,
Gespielt/DNP, Einsatzzeit, Treffer und Versuche für Zweier/Dreier/Freiwürfe,
Offensiv-/Defensivrebounds, Assists, Steals, Blocks, Turnovers, Fouls und
Plus/Minus. Hinzu kommen eine kurze Spieltagsnotiz und der Speicherstatus.
Fehlende Vollständigkeitsbestätigung bleibt sichtbar; nach relevanten
Korrekturen gelten die vorhandenen Regeln zur erneuten Bestätigung.

Offizielles Ergebnis, manueller Boxscore und Live-Erfassung bleiben getrennt.
Der Assistent überschreibt keinen offiziellen Spielstand. Nachträgliche Notizen
dürfen gespeichert werden, ohne das beendete Spiel wieder zu starten.

## Wiederaufnahme und Zuständigkeit für den Zustand

Der Ablaufzustand wird aus vorhandenem Entwurf und ausgewählter Live-Sitzung
abgeleitet, nicht durch einen unabhängig gespeicherten „Spiel läuft“-Schalter:

- Keine Sitzung: letzter gültiger Vorbereitungsschritt des Entwurfs.
- Sitzung vorhanden und nicht beendet: Live-Ansicht bzw. Abschnittspause.
- Sitzung beendet: Abschlussbericht.
- Mehrere nicht eindeutig ausgewählte Sitzungen: bestehende Konfliktauswahl,
  keine automatische Auswahl oder Addition.

Der bestehende Live-Controller bleibt die einzige Instanz für Statistik,
Aufstellungen, Uhr und Abschluss. Wiederaufnahme erzeugt kein Setup-Ereignis.
Bereits bestehende Sitzungen ohne Spieltagsentwurf sind direkt weiter nutzbar.
Alte Sitzungen im Format 1 behalten ihre Einschränkungen und werden nicht
stillschweigend migriert.

App-Schließen oder Navigation pausiert eine laufende Uhr nicht. Beim Verlassen
wird dieser Umstand klar angezeigt; nach Rückkehr gilt der vorhandene Zeitanker.
Die Uhr zählt höchstens bis 0:00. Für Fortsetzung auf demselben Gerät muss der
lokal gesicherte Stand genügen; Gerätewechsel erfordert wie bisher Synchronisation
und bewusste Übernahme. Browserdaten zu löschen ist keine Wiederherstellung.

## Daten und Speicherung

Ein optionaler, versionierter Spieltagsbereich am Spiel speichert Vorbereitung
und Notizen getrennt von `liveStats`. Er enthält eigene Seitenzuordnung,
Trainingsspiel-Kennzeichnung, Kaderentwurf, Starterentwurf, Uhrentwurf,
Vorbereitungstexte, Taktikreferenzen und Abschlussnotiz. Der Entwurfsschritt ist
nur eine Navigationshilfe und darf den abgeleiteten Live-Zustand nicht überstimmen.

Taktikreferenzen bestehen aus fester ID und einem Titel-Snapshot. Wird die Taktik
gelöscht, erscheint „Nicht mehr verfügbar“; Spieltag und Statistik bleiben lesbar.
Vorhandene Inhalte werden nur angezeigt, nicht kopiert oder verändert.

Vorbereitung und Notizen brauchen dieselbe verlässliche lokale Sicherung wie
der restliche Spieltag: gesonderter, nach Organisation, Benutzer und Spiel
abgegrenzter IndexedDB-Entwurfsspeicher. Erst nach bestätigtem lokalem Schreiben
erscheint „Lokal gesichert“. Beim Weitergehen werden ausstehende Eingaben
gesichert; Schreibfehler halten den Schritt offen und bieten Wiederholen an.

Synchronisation erfolgt über den vorhandenen Workspace, mit expliziter
serverseitiger Erhaltung und Validierung des neuen Spieltagsbereichs. Bloßes
Einfügen in den allgemeinen Workspace ohne Konfliktschutz reicht nicht aus.
Versionierte Änderungen tragen eindeutige IDs und ihre Vorgängerversion;
Wiederholungen sind idempotent. Gleichzeitige Änderungen desselben Entwurfs
werden als Konflikt erkannt und beide Varianten erhalten. Der Coach wählt
bewusst eine Variante; kein stilles Zusammenmischen widersprüchlicher Kader.
Ein älterer Client ohne Spieltagsfeld darf einen vorhandenen Spieltag nicht löschen.

Die Speicheranzeige unterscheidet lokal gesichert, Synchronisation ausstehend,
synchronisiert und Fehler. „Synchronisiert“ gilt nur für den bestätigten aktuellen
Stand, nicht für während der Übertragung neu hinzugekommene Eingaben.
Statistik und Entwurf werden getrennt bestätigt; bei gemischtem Stand bleibt
sichtbar, dass noch Änderungen ausstehen.

## Komponenten und Integrationsgrenzen

- Ein eigener Spieltags-Ablaufbaustein bestimmt Schritt und zulässige Übergänge.
- Ein eigener Speicher-/Sync-Baustein verwaltet Entwurf, Notizen und Konflikte.
- Eine mobile Spieltagsansicht zeigt Vorbereitung, Live-Bereich und Abschluss.
- `js/games.js` bleibt Einstieg und Spielauswahl; keine zweite Spielverwaltung.
- `js/live-game/controller.mjs`, `view.mjs` und `report.mjs` werden eingebunden;
  erforderliche Schnittstellen bleiben klein und erhalten bisherige Aufrufer.
- Workspace-Validierung und Zusammenführung schützen das neue Feld auf Client
  und Server. Der Service Worker nimmt neue Module in den Offlinebestand auf.

Es gibt keine neue externe Plattform und keine zusätzliche KI-Abhängigkeit.
Lesende Rollen können vorhandene Spieltage ansehen, aber keine Entwürfe,
Notizen oder Erfassungen verändern. Kontowechsel, Teamwechsel, Gerätesperren
und gelöschte Spiele bleiben geschützt. Bei Fehlern werden keine neuen
Sitzungen als Ausweichlösung erzeugt.

## Mobile Bedienung

Hochformat ab 320 CSS-Pixeln ohne horizontales Scrollen. Zentrale Aktionen haben
mindestens 48 Pixel große Berührungsflächen, klare Beschriftungen und sichtbaren
Fokus. Fehlermeldungen stehen am betroffenen Schritt. Laufende Eingaben verlieren
durch Uhraktualisierung oder Synchronisation weder Fokus noch Inhalt.
Die Spieltagsansicht nutzt die vorhandene CourtHub-Gestaltung.

## Abnahmekriterien

1. Ein bestehendes oder manuell angelegtes Trainingsspiel lässt sich durch alle
   Vorbereitungsschritte bis in die freie Live-Ansicht führen.
2. Überspringen der optionalen Vorbereitung verliert keine vorhandenen Texte.
3. Ungültiger ausgewählter Kader blockiert den Start; abgewählte Spieler nicht.
4. Start legt genau eine Sitzung an und startet die Uhr nicht automatisch.
5. Wiederaufnahme funktioniert vor dem Start, bei laufender Uhr, in der Pause
   und nach Abschluss; Live-Aktionen bleiben unverändert erhalten.
6. Wechsel, Punkte, DNP und Plus/Minus entsprechen den bestehenden Projektionen.
7. Halbzeit, nächster Abschnitt und Verlängerung starten nie ohne Coach-Aktion.
8. Offline-Neuladen erhält Entwurf und Erfassung nach vorherigem Online-Laden.
9. Speicherfehler, Doppeltippen, mehrere Tabs, Geräteübernahme, Kontowechsel,
   Sync-Konflikte und alte Clients führen nicht zu stillen Datenverlusten.
10. Nachträgliche Notizen verändern weder Uhr noch Vollständigkeitsbestätigung;
    Statistikänderungen beachten weiterhin deren Invalidierungsregeln.
11. Modell-, Speicher-, API-, UI- und Integrationstests laufen mit `npm test`.
    Browserprüfungen decken 320/390 Pixel, Neuladen und Offlinebetrieb ab;
    Tests auf echten iOS-/Android-Geräten werden separat ausgewiesen.

## Nicht enthalten

Keine Hallenfernsteuerung, automatische Erkennung von Pfiffen oder Wechseln,
offizielle Ergebnis-API, individuellen Gegnerstatistiken, neue Shotclock-Logik,
KI-Spielvorbereitung, neue Taktikbearbeitung oder neuer PDF-/Videoexport.
Die vorhandene Trainingsuhr bleibt unabhängig.

## Nächster Freigabeschritt

Diese schriftliche Spezifikation prüfen und freigeben. Danach wird ein konkreter
Implementierungsplan erstellt und zur Prüfung vorgelegt. Erst nach dessen
Freigabe und Auswahl der Ausführung beginnt die Umsetzung. Dieser lokale
Dokumentationscommit beinhaltet keinen GitHub-Push und kein Deployment.
