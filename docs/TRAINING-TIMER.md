# Timer & Punkte

## Bedienung

Ein Training öffnen und **Timer & Punkte** wählen. Die Ansicht ist für die
Bedienung am Handy vorgesehen, nicht zur Fernsteuerung einer Hallenanzeige.

- **Stoppuhr:** Start, Pause, Fortsetzen und Zurücksetzen.
- **Countdown:** Dauer in Sekunden einstellen, dann starten.
- **Intervalle:** Belastung, Pause und Rundenzahl einstellen. Nach der letzten
  Belastung endet die Uhr ohne zusätzliche Pausenrunde.
- **Punkte:** Zwei frei benennbare Teams, +1/+2/+3 und −1. „Letzte Punkte zurück“
  nimmt die letzte Änderung zurück. „Punkte auf null“ benötigt eine Bestätigung.
- **Shotclock:** Optional zuschalten, separat starten/pausieren und auf 24 oder
  14 Sekunden zurücksetzen. Ein Reset während des Laufens läuft sofort weiter;
  ein Reset einer pausierten/abgelaufenen Shotclock bleibt pausiert.

Beim Wechsel zum Training laufen gestartete Uhren weiter. Zum Beenden vorher
pausieren. Der Moduswechsel und Änderungen an den Zeitvorgaben setzen die
Hauptuhr nach Bestätigung zurück. Punkte bleiben davon unberührt.

## Speicherung und Grenzen

Stand und Einstellungen liegen pro Training im lokalen Browserspeicher unter
`courthub-training-timer-v1:<trainingId>`. Sie werden nicht in Teamdaten oder
Spielstatistiken übernommen und nicht zwischen Geräten synchronisiert.
Das Löschen von Browserdaten löscht auch diese Stände.

Laufzeiten werden aus Zeitstempeln ermittelt, nicht durch herunterzählende
Browser-Intervalle. Nach Hintergrundbetrieb oder Neuladen wird die verstrichene
Zeit berücksichtigt. Eine Änderung der Geräteuhr kann die Laufzeit beeinflussen.

Die geöffnete Ansicht fordert eine Bildschirmsperre-Verhinderung an, sofern der
Browser dies unterstützt. Signalton bei Phasenwechsel und Ablauf gibt es nur bei
aktiver Ansicht; im Hintergrund oder bei Bildschirmsperre ist er nicht garantiert.
Beim Wiederöffnen werden verpasste Signale nicht nachträglich abgespielt.
Lautstärke/Stummschaltung des Geräts beachten. Dieselbe Trainingsuhr möglichst
nur in einem Tab bedienen.

## Umsetzung und Prüfung

- `js/training-timer.js`: lokaler Zustand, Zeitberechnung, Dialog und Bedienung.
- `training-timer.css`: mobile Darstellung, große Touchflächen, Fokusmarkierung.
- Einstieg im Trainingsdetail; Offline-Assets im Service Worker enthalten.
- `node scripts/training-timer-smoke.mjs`: Pause/Fortsetzen, Hintergrundzeit,
  Speichern/Wiederöffnen, Intervalle, Shotclock, Punkte und beschädigte Daten.
- Der Test ist über `npm run smoke` auch Bestandteil von `npm test`.
