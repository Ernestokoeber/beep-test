# CourtHub: Phasenbasierter Aktionsrekorder

## Ziel

Der Taktikeditor soll sich wie das Erklären eines Spielzugs auf dem Feld anfühlen. Trainer führen Aktionen nacheinander aus und CourtHub protokolliert automatisch, welcher Spieler was macht. Gleichzeitig stattfindende Aktionen werden in einer gemeinsamen Phase gruppiert. Manuelle Start- und Dauerwerte sind für den normalen Arbeitsablauf nicht erforderlich.

Das Board bleibt ein Halbfeld und unterstützt Angriff, Verteidigung, Pässe, Laufwege, Dribblings, Screens und Pick-and-Roll-Abläufe.

## Bedienmodell

### Aufstellung

In der Aufstellung dürfen Angreifer, Verteidiger und Ball frei verschoben werden. Diese Änderungen erzeugen keine Aktion. Der Modus wird deutlich als „Aufstellung“ gekennzeichnet.

### Aufnahme eines Ablaufs

Nach Beginn des Ablaufs wählt der Trainer eine Aktion und führt sie direkt auf dem Feld aus:

- **Lauf/Dribbling:** Einen Spieler greifen und den gewünschten Weg zeichnen. Besitzt er den Ball, wird die Aktion als Dribbling dargestellt; andernfalls als Laufweg.
- **Pass:** Zuerst den Ballführer, danach den Empfänger wählen.
- **Screen:** Screensteller und begünstigten Mitspieler wählen. CourtHub schlägt anhand des zugehörigen Verteidigers eine lesbare Screenposition vor. Position und Winkel bleiben nachträglich veränderbar.
- **Pick & Roll:** Ballführer und Screensteller wählen, die Screenposition setzen, den Weg des Ballführers am Screen vorbei und anschließend den Rollweg zeichnen. CourtHub speichert Screen, Nutzung des Screens und Rollweg als zusammengehörige Aktionsgruppe.

Neue Aktionen werden standardmäßig in einer neuen Phase „danach“ angelegt. Mit „gleichzeitig“ wird die nächste Aktion der aktuellen Phase hinzugefügt. Die Umschaltung bleibt sichtbar, bis die Aktion abgeschlossen oder abgebrochen wurde.

## Phasen und Aktionsliste

Unter dem Spielfeld wird der Ablauf als geordnete Liste dargestellt. Jede Phase besitzt eine klare Überschrift und enthält ihre gleichzeitig ablaufenden Aktionen in verständlicher Sprache, zum Beispiel:

```text
Phase 2
├─ 2 nutzt den Screen von 5
├─ 5 rollt zum Korb
└─ 4 stellt einen Screen für 3
```

Phasen können per Drag-and-drop umsortiert, dupliziert und gelöscht werden. Einzelne Aktionen können ausgewählt, bearbeitet, in eine andere Phase verschoben oder gelöscht werden. Undo und Redo erfassen sowohl einzelne Aktionen als auch Änderungen an ganzen Phasen.

Beim Auswählen einer Phase zeigt das Feld deren Ausgangsposition. Beim Auswählen einer Aktion wird diese hervorgehoben und kann unmittelbar korrigiert werden. Die Wiedergabe durchläuft die Phasen in ihrer sichtbaren Reihenfolge.

## Automatisches Timing

CourtHub berechnet die Dauer jeder Aktion aus Aktionstyp und Weglänge. Die Dauer einer Phase entspricht der längsten enthaltenen Aktion. Kürzere parallele Aktionen enden früher, ohne die nächste Phase vorzeitig zu starten. Pausen werden als eigene Phase gespeichert.

Die Zeitwerte bleiben für bestehende Plays im Datenmodell erhalten. CourtHub berechnet sie im einheitlichen Editor automatisch und bietet keinen separaten Profi-Modus mehr an.

## Screen- und Pick-and-Roll-Logik

Ein Screen ist immer an den Screensteller gebunden und enthält zusätzlich den begünstigten Mitspieler. Falls ein passender Verteidiger vorhanden ist, wird er als Screen-Ziel referenziert. Dadurch kann CourtHub Position und Winkel nachvollziehbar berechnen und bei späteren Korrekturen aktualisieren.

Ein Pick-and-Roll ist eine Aktionsgruppe mit stabiler ID. Sie verbindet:

1. den Screen des Bigs,
2. den Lauf- oder Dribbelweg des Ballhandlers am Screen vorbei,
3. den anschließenden Rollweg des Screenstellers.

Die Teilaktionen dürfen gemeinsam verschoben oder einzeln korrigiert werden. Das Löschen der Gruppe fragt, ob die gesamte Aktion oder nur die gewählte Teilaktion entfernt werden soll.

## Lesbarkeit und Überlappungen

Beim Ziehen zeigt CourtHub eine Vorschau der tatsächlichen Endposition. Spieler und Ball erhalten Mindestabstände. Screen-Symbole rasten mit einem kleinen Abstand neben dem Zielverteidiger ein, statt dessen Marker zu überdecken.

Absichtlich enge Basketballsituationen bleiben möglich. Unterschreitet eine Position den empfohlenen Abstand, markiert CourtHub die betroffenen Elemente und bietet „Lesbar einrasten“ an, verhindert das Speichern aber nicht.

Laufwege und Pässe werden nahe ihrer Start- und Endpunkte leicht versetzt, damit Marker, Pfeilspitzen und Screen-Symbole erkennbar bleiben. Nur die ausgewählte Phase zeigt alle Bearbeitungshilfen; andere Phasen bleiben visuell ruhig.

## Datenmodell und Kompatibilität

Die bestehenden Schritte bleiben die persistierte Grundlage und werden in der Oberfläche als Phasen bezeichnet. Jede Phase enthält weiterhin `duration`, `elements` und `transition`. Aktionen erhalten ergänzende Metadaten:

- `phaseId` für die stabile Phasenzuordnung,
- `relation` mit `after` oder `simultaneous`,
- `beneficiaryId` und optional `targetDefenderId` bei Screens,
- `groupId` und `groupType: "pick-and-roll"` bei verbundenen Aktionen,
- `kind: "run"` oder `kind: "dribble"` bei Spielerbewegungen.

Bestehende Plays ohne diese Felder werden beim Laden normalisiert. Jeder vorhandene Schritt wird zu einer Phase; die bisherigen Startzeiten innerhalb eines Schrittes bleiben erhalten. Die Konvertierung überschreibt das gespeicherte Original erst bei der nächsten bewussten Speicherung.

Die Endposition einer Phase ist automatisch die Ausgangsposition der folgenden Phase. Änderungen an früheren Phasen werden nur weitergereicht, wenn ein Spieler in der Folgephase nicht ausdrücklich neu positioniert oder bewegt wurde.

## Fehlerbehandlung

Unvollständige Aktionen verändern das Board nicht. CourtHub benennt die noch fehlende Auswahl konkret, etwa „Wähle jetzt den Empfänger“ oder „Zeichne den Rollweg von Spieler 5“. Escape beziehungsweise „Abbrechen“ verwirft nur die angefangene Aktion.

Wenn Screenpartner, Verteidiger oder Ballbesitz nicht eindeutig bestimmbar sind, verlangt CourtHub eine Auswahl. Automatische Annahmen dürfen keine vorhandenen Aktionen überschreiben.

## Responsive Bedienung und Barrierefreiheit

Desktop, Tablet und Smartphone verwenden dasselbe Bedienmodell. Auf kleinen Bildschirmen bleibt das Spielfeld oben sichtbar, während die Phasenliste darunter horizontal oder als kompakte Karten navigiert wird. Touch-Ziele sind mindestens 44 Pixel groß. Aktiver Modus, ausgewählte Phase und parallele Aufnahme werden nicht nur farblich, sondern zusätzlich durch Text und Symbole angezeigt.

Die wichtigsten Aktionen sind per Tastatur erreichbar. Fokus, Abbrechen, Undo und Redo bleiben jederzeit verfügbar. Reduzierte Bewegungseinstellungen werden bei Wiedergabe und Übergängen berücksichtigt.

## Tests und Abnahmekriterien

Automatisierte Tests decken mindestens folgende Fälle ab:

- Freies Aufstellen erzeugt keine Aktion.
- Aufeinanderfolgende Aktionen erzeugen getrennte Phasen.
- Gleichzeitig aufgenommene Aktionen landen in derselben Phase.
- Lauf und Dribbling werden anhand des Ballbesitzes korrekt unterschieden.
- Ein Pass aktualisiert den Ballbesitz erst zum richtigen Zeitpunkt.
- Screens bleiben an Screensteller und begünstigten Spieler gebunden.
- Pick-and-Roll erzeugt eine konsistente, gemeinsam bearbeitbare Aktionsgruppe.
- Phasendauer entspricht der längsten parallelen Aktion.
- Phasen lassen sich ohne Verlust von Spieler- und Ballpositionen umsortieren.
- Überlappungswarnung und „Lesbar einrasten“ funktionieren, ohne absichtlich enge Positionen zu verbieten.
- Alte gespeicherte Plays lassen sich öffnen, abspielen und erneut speichern.
- Undo und Redo funktionieren für Aktion, Gruppe und Phase.
- Der vollständige Ablauf funktioniert mit Maus und Touch auf Desktop- und iPhone-Größe.

Die Umsetzung ist abgeschlossen, wenn ein Trainer das beschriebene Beispiel ohne manuelle Sekundenwerte erstellen, korrigieren, abspielen, speichern und erneut öffnen kann.
