# Spieltag-Modus

Für einen Coach am Handy: Vorbereitung in Schritten, danach freie Live-Erfassung.
Auf `main` integriert; Ausgangsstand der Browserabnahme ist `9ae5dc4`
(29.09.2026, vereinfachte mobile Spielauswertung). Eine produktive Bereitstellung
wird durch die lokale Browserabnahme nicht bestätigt.

## Einstieg

1. Einmal online anmelden und synchronisieren. Unter **Spiele** ein Spiel wählen
   und **Spieltag starten** öffnen. **+ Trainingsspiel** legt ein manuelles Spiel
   an; die eigene Seite wird anschließend ausdrücklich als Heim oder Gast gewählt.
2. Für jeden Spieler **Starting Five**, **Bank** oder **DNP – nicht eingesetzt**
   festlegen. Genau fünf Spieler müssen starten. Spieltagsnummern kontrollieren;
   `0` und `00` sind verschieden. Eine optionale Rolle beschreibt beispielsweise
   Ballhandler, Shooter oder Big.
   **Weiter zum Gameplan** und der Reiter **Gameplan** führen bei fehlenden
   Spielern oder Startern direkt zur passenden Auswahl und zeigen die fehlende
   Anzahl. Bei ungültigen oder doppelten Trikotnummern öffnen sich die betroffenen
   Spielerdetails. Hinweise bleiben bis zur Korrektur sichtbar; Speicherfehler
   stehen bei den Aktionen. Nach erfolgreichem Weitergehen wird der neue Schritt
   in den sichtbaren Bildschirmbereich gescrollt.
3. Abschnittsanzahl und Dauer prüfen. Spielziele, Aufwärmen und Coaching-Notiz
   sind optional. Der aktuelle, geprüfte Gegnerstand wird als Snapshot angehängt.
   **Mit Basketball-KI vorbereiten** erzeugt daraus Kabinensätze, Spielziele,
   Offense-/Defense-Schlüssel, Aufwärmfokus und Halbzeitfragen; alles bleibt vor
   dem Start bearbeitbar. Vorhandene Taktiken werden nach Offense, Defense,
   Einwurf und Pressbreak aus dem Taktikboard übernommen. **Optionale Angaben
   überspringen** behält bereits eingetragene Texte.
4. Den vollständigen Gameplan prüfen und **Zur Live-Ansicht** öffnen. Das legt
   eine Erfassung an, friert den Gameplan ein und startet noch nicht die Spieluhr.
   Die Starting Five kann in der Live-Ansicht bis zum ersten Start der Spieluhr
   noch geändert werden. Danach ist sie für Einsatzzeit und Plus/Minus gesperrt.
   Änderungen am Live-Kader werden als aktueller Spielzustand fortgeschrieben.
   Kaderzahl, Starting Five, Trikotnummern, Spielerliste und Live-Erfassung lesen
   denselben Stand statt weiterhin die ursprüngliche Freigabe anzuzeigen.

## Während des Spiels

Ein vorhandener veröffentlichter Spielbericht lässt sich nach dem Spiel unter
**Spiele → Spielbericht übernehmen** prüfen und speichern. Bei geschlossenen
Spielen gilt die ausdrückliche Archivfreigabe. Der Import prüft Spielerzuordnung,
Punkte, Wurfwerte, fünf Starter und Viertelsummen. Endergebnis, Spieltagsnummern,
Trainer und veröffentlichte Spielerwerte stehen anschließend auch im Spieltag
als primäre Auswertung. Fehlende Werte bleiben offen; die ursprüngliche
Live-Erfassung und der eingefrorene Gameplan bleiben separat erhalten.

Die vorhandenen Aktionen für eigene Spieler, Gegnerpunkte, Wechsel, Uhr und
Korrekturen bleiben frei bedienbar. Es gibt keinen Pflicht-Assistenten zwischen
Statistikaktionen. Bekannte gegnerische Topscorer und Schützen können vor **Gegner
+1/+2/+3** optional ausgewählt werden. Ohne Auswahl bleibt die schnelle
Teamerfassung unverändert; nach einem Treffer wird die Auswahl zurückgesetzt,
damit der nächste Punkt nicht versehentlich demselben Spieler zugeordnet wird.
Eine falsche Zuordnung kann im Protokoll korrigiert oder entfernt werden.
Der aufgeklappte **Gegnerplan** zeigt die aktuelle Defense und
vier schnelle Beobachtungen: Paint/Drive, offener Dreier, Offensiv-Rebound und
Freiwurfdruck. Die Buttons für Mannverteidigung, 2-1-2, 2-3 und 3-2 protokollieren die
bewusste Trainerentscheidung. CourtHub zeigt bei wiederholten Beobachtungen einen
Wechselhinweis, wechselt die Defense aber nie automatisch.

**Gameplan & Abschluss** lässt sich aufklappen. Starting Five,
Bank, DNP, Rollen, Schwerpunkte und Taktiken bleiben dort lesbar, können während
des Spiels aber nicht mehr verändert werden. DNP-Spieler werden nicht zur
Einwechslung angeboten. Nur die Abschlussnotiz bleibt bearbeitbar.

Bei 0:00 erscheint eine Abschnitts- bzw. Halbzeitübersicht. Der nächste Abschnitt
wird bewusst vorbereitet und gestartet. Zur Halbzeit stehen dort zusätzlich
aktueller Gegnerstand, Defense, Beobachtungszähler, KI-Prüffragen und erreichte
Wechsel-Auslöser. Außerdem werden die manuell erfassten Gegnerpunkte je gespielter
Defense, Trefferart, Spielzeit und Punkte pro zehn Spielminuten verglichen.
Zugeordnete gegnerische Werfer stehen separat darunter. Ein Pausieren mitten im Viertel ist
keine Viertelpause. Die Hallenuhr wird nicht ferngesteuert. Auch beim Verlassen
oder Schließen läuft die gestartete App-Uhr rechnerisch bis 0:00 weiter.

## Speichern und Fortsetzen

Eingaben werden beim Weitergehen, expliziten Speichern und Verlassen des Formulars
lokal gesichert. **Ungespeichert** heißt: Eingabe noch nicht bestätigt im Speicher.
Vor dem Schließen auf **Entwurf speichern** bzw. **Abschlussnotiz speichern** achten.
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

Änderungen auf mehreren Geräten können vor Spielbeginn einen Vorbereitungskonflikt
erzeugen. Versionen werden nicht still überschrieben; eine Version bewusst
auswählen. Nach Beginn der Live-Erfassung kann keine andere Vorbereitung mehr
übernommen werden; der beim Start bestätigte Gameplan ist Teil der Live-Sitzung.
Eine spätere Änderung im Gegnerprofil verändert diesen eingefrorenen Plan nicht.
Parallele Abschlussnotizen können getrennt davon bewusst zusammengeführt und
anschließend weiterbearbeitet werden. Bei erneut eintreffenden unbekannten
Offline-Änderungen muss gegebenenfalls vor dem Start nochmals entschieden werden.
Trifft ein Konflikt während einer offenen Eingabe ein, bleibt der Text sichtbar.
Die Versionsauswahl erklärt ausdrücklich, wenn sie ungespeicherte Eingaben verwirft.
Bei verlorenem Schreibrecht kann man offene Eingaben ausdrücklich verwerfen, um
die Ansicht zu verlassen. Neu eingetroffene, noch nicht angezeigte Versionen
erfordern eine erneute Auswahl.

## Abschluss

Spiele vor dem heutigen Datum werden als **Absolviert** angezeigt, auch wenn
das Ergebnis fehlt (**Ergebnis offen**). Ein eingetragenes Endergebnis oder ein
ausdrücklicher Live-Abschluss schließt das Spiel ebenfalls. Abgesagte Spiele
bleiben als **Abgesagt** gekennzeichnet. Ein bloßer Datumswechsel erzeugt weder
ein Ergebnis noch neue Live-Aktionen.

Geschlossene Spiele sind zunächst nur lesbar. **Bearbeitung freigeben** zeigt
einen Sicherheitshinweis und entsperrt das ausgewählte Spiel für die aktuelle
Ansicht. Spielnotizen, Ergebnis, manueller Boxscore, Atlas-Übernahme, Vorbereitung
und Live-Korrekturen sind bis dahin gesperrt. Beim Spielwechsel, Verlassen,
Konto-/Teamwechsel oder Neuladen wird die Freigabe aufgehoben. Ein beendetes
Live-Spiel startet durch die Freigabe nicht erneut. Änderungen des offiziellen
Spielplanimports an geschlossenen Spielen benötigen ebenfalls eine Bestätigung.

**Spiel abschließen** hält die Uhr an und öffnet den vorhandenen Bericht mit
Punkten, Wurfversuchen, Rebounds, weiteren Aktionen, Einsatzzeit, DNP und Plus/Minus.
„Gesamten Punkteverlauf beider Teams erfasst“ nur bei vollständiger Erfassung
ankreuzen; ohne Bestätigung bleiben Werte vorläufig. Nachträgliche Notizen
verändern weder Statistik noch Uhr.

Nach dem Abschluss übernimmt CourtHub die protokollierten Beobachtungen,
gegnerischen Trefferarten, optional zugeordneten Werfer, Defense-Spielzeiten und
Defense-Wechsel in das passende Gegnerprofil. Der Abschlussbericht enthält dazu
den Abschnitt **Gegner & Defense**. „Punkte pro 10 Minuten“ ist keine
possession-bereinigte Effizienz und wird bei kleinen Stichproben entsprechend
vorsichtig bezeichnet. Ein
erneutes Öffnen desselben Spiels erzeugt keinen doppelten Bericht. Diese eigenen
Live-Beobachtungen fließen damit vorsichtig in spätere Defense-Empfehlungen ein.

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
Die vier wichtigen Befunde des unabhängigen Reviews sind durch zusätzliche
Regressionstests für Offline-Routeninitialisierung, fokussierte veraltete Notizen,
offene Konfliktformulare und neu eintreffende Konfliktversionen abgesichert.
Am 30.09.2026 wurde die bestehende CI-Browserprüfung (`scripts/browser-e2e.mjs`,
Playwright 1.54.2 / Chromium) um vollständige Matchday-Läufe mit iPhone-15-Profil
(393 CSS-Pixel) und einer schmalen Touch-Ansicht mit 320 CSS-Pixeln ergänzt:

- Unter **Spiele** Vorbereitung starten, Heimseite wählen, fünf Starter und
  einen DNP festlegen, eine Rolle und Ziele eintragen sowie optionale Angaben
  überspringen.
- Live-Ansicht öffnen, eigene und gegnerische Punkte über die Oberfläche erfassen,
  neu laden und dieselbe Sitzung samt Protokoll wiederaufnehmen.
- Spiel mit bestätigtem Punkteverlauf abschließen; Bericht auf 2:3, Spielerpunkte,
  Plus/Minus −1, Wurfstatistik und DNP prüfen, auch mit aufgeklappten Details.
- Abschlussnotiz speichern, erneut laden und unveränderte Spiel-/Entwurfsdaten
  einschließlich Abschluss und Notiz prüfen.
- In jedem Schritt Dokument- und Body-Breite auf horizontalen Overflow prüfen;
  JavaScript-Ausnahmen und Console-Fehler lassen den Lauf scheitern. Einzig die
  bereits vorhandene Chromium-Meldung zum ignorierten `frame-ancestors` im
  CSP-Metaelement ist ausdrücklich ausgenommen.

Die Tests verwenden isolierte Browserkontexte, synthetische Traineridentität und
Spieldaten, aber echte App-Routen, Controller, localStorage und IndexedDB. Sie
laufen über den bestehenden Browser-Job in `.github/workflows/test.yml`.
Serviceworker sind wie in den bisherigen E2E-Läufen blockiert: Reload/Persistenz
ist damit abgedeckt, tatsächlicher Offline-Neustart und Server-Synchronisierung
werden hier nicht abgenommen. Mobile Chromium-Emulation ist kein Safari- oder
Hardwaretest. Die unten aufgeführten zusätzlichen manuellen Prüfungen bleiben offen.
Nach abruptem Live-Reload wartet der Test vor weiteren Schreibaktionen 16 Sekunden,
damit die bestehende 15-Sekunden-Tabsperre ablaufen kann; die Sperre wird nicht
gelöscht oder umgangen. Ein isolierter Wiederholungslauf ist mit
`E2E_MATCHDAY_ONLY=1 node scripts/browser-e2e.mjs` möglich; CI führt weiterhin
die komplette Browser-Suite aus.

Prüfergebnis am 30.09.2026: `npm test`, die vollständige Browser-Suite
(`node scripts/browser-e2e.mjs`) und `git diff --check` bestanden.
Der allgemeine UI-Smoke-Test isoliert jetzt seine Saisonplanungsdaten von den
datumsabhängigen Trainingsfixtures, damit diese Prüfung reproduzierbar bleibt.

### Noch ausstehende manuelle Geräte-/Offline-Abnahme

Mit einem Testspiel, nicht während eines echten Spiels, prüfen:

- Auf dem echten Trainingshandy den automatisiert geprüften Vorbereitungs-,
  Live- und Abschlussablauf wiederholen; Safari-/PWA-Bedienung und Layout prüfen.
- Eigene und gegnerische Punkte erfassen, Uhr anhalten, einen Spieler wechseln.
  Nach Abschnittsende startet nichts automatisch; den nächsten Abschnitt bewusst
  vorbereiten und starten. Anschließend abschließen und Abschlussnotiz speichern.
- Vorbereiteten Stand online sichern, Netzwerk abschalten, neu laden, Notiz ändern
  und sichern, erneut laden. Auch eine Live-Aktion muss nach Neuladen erhalten sein.
  Wieder online gehen und auf tatsächliche Synchronisationsbestätigung warten.
- Zwei Tabs desselben Testspiels mit abweichenden Vorbereitungen bearbeiten.
  Der Konflikt muss sichtbar werden; keine Version darf still verschwinden.
- Auf dem tatsächlichen Trainingshandy Sperrbildschirm und App-Wechsel testen.
  Die App-Uhr ist eine eigene Erfassung und kein Ersatz für die offizielle Hallenuhr.


## Trainerteam

Trainer und Co-Trainer werden pro Termin separat zugeordnet. Die Teilnahme als Spieler ist optional; Details und Prüfläufe: [Trainerteam](COACHING-STAFF.md).

Für Lindau – Ottobeuren vom 04.10.2026 steht der geprüfte Bericht als offline verfügbare Importvorlage bereit. Der Importzugang im Hamburger-Menü lädt die Vorschau automatisch. Gespeichert wird erst mit „Spielbericht speichern“ nach der bestehenden Archivfreigabe.
