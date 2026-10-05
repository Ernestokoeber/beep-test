# Trainerteam pro Termin

Trainings und Spieltage haben jeweils einen Trainer- und einen Co-Trainer-Slot.
Die Zuordnung ist unabhängig von den Kontoberechtigungen des Trainerteams.

- Im Training steht der Bereich **Trainerteam** oberhalb der Reiter.
- Im Spieltag wird das Trainerteam unter **Kader & Starting Five** zugeordnet.
- Eine Person kann aus den Spielerprofilen ausgewählt oder als externer Name eingetragen werden.
- Jeder belegte Slot hat einen eigenen Anwesenheitsstatus: anwesend, offen, abwesend oder entschuldigt.
- **Auch als Spieler** erlaubt eine Doppelrolle. Ohne diese Auswahl wird das verknüpfte Spielerprofil bei diesem Termin nicht als Spieler geführt.

## Daten und Teilnahme

Das optionale Feld `staff` enthält höchstens zwei Einträge mit `role`, `name`,
`playerId`, `alsoPlayer` und `status`. Externe Personen haben `playerId: null`.
Rollen und verknüpfte Personen dürfen nicht doppelt vorkommen. Spielertrainer
müssen mit einem Spielerprofil verknüpft sein.

Im Training bleiben vorhandene Anwesenheitsdaten erhalten. Lesende Ansichten
filtern Trainer ohne Spielerrolle aus den Spieler-Anwesenheiten, Quoten,
Trainingsgruppen und Belastungsdaten. Eine spätere Änderung zur Doppelrolle
macht die vorhandene Spieler-Anwesenheit wieder sichtbar. Trainer-Anwesenheit
wird separat angezeigt; Trainings-CSV und JSON enthalten das Trainerteam.

Im Spieltag werden Trainer ohne Spielerrolle aus dem Kader und der Starting Five
entfernt. Danach müssen gegebenenfalls neue Starter ausgewählt werden. Trainer
und Co-Trainer erscheinen in der Bestätigung, Spielübersicht, Live-Ansicht und
dem Kader-PDF. Mit der Kaderfreigabe gehört das Trainerteam zum eingefrorenen
Gameplan. Reine Trainer dürfen auch bei der Live-Kaderkorrektur keinen
Spielerplatz erhalten.

Alte Trainings und Spieltage ohne `staff` bleiben unverändert lesbar. Die
Zuordnung wird über die bestehende Workspace-Synchronisierung gespeichert;
Spieltage verwenden zusätzlich die vorhandene Entwurfshistorie und das Journal.
Beide neuen Module sind im Offline-Cache enthalten (v178).

## Prüfung

`scripts/coaching-staff-smoke.mjs` prüft Trainer-Anwesenheit, Spielerzahlen,
Doppelrolle, Statistik, Entwurfsjournal, Freigabe und Wiederaufnahme.
`scripts/browser-e2e.mjs` enthält zusätzlich den vollständigen Trainerteam-Lauf
auf iPhone und bei 320 px. Dieser Teil kann mit `E2E_STAFF_ONLY=1` gestartet werden.
