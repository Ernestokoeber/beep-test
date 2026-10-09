# Trikots und Waschdienst

Unter **Menü → Trikots & Waschdienst** werden Heim- und Auswärtssatz getrennt verwaltet.

1. **Mitnahme eintragen**: Spieler, Datum und Trikotsatz wählen. Spiel, Rückgabefrist und Notiz sind optional.
2. Der Satz zeigt den aktuellen Besitzer. Eine weitere offene Mitnahme desselben Satzes wird verhindert.
3. **Sauber zurück** bestätigt, dass die Trikots gewaschen und wieder zurückgebracht wurden. Der Dienst zählt weiterhin genau einmal.
4. Die Verteilung zeigt aktive Spieler mit den wenigsten Mitnahmen zuerst, getrennte Heim-/Auswärtszahlen, saubere Rückgaben und offene Rückgaben. Ein Filter zeigt Spieler ohne dokumentierten Dienst im ausgewählten Zeitraum.
5. Im Verlauf können frühere Dienste nachgetragen und Einträge korrigiert oder nach Bestätigung gelöscht werden.

Die Verteilung verwendet standardmäßig die aktive Saison; alternativ lassen sich alle Saisons ansehen. Die beiden Besitzeranzeigen berücksichtigen immer sämtliche offenen Dienste, auch aus einer vorherigen Saison. Ein leerer Verlauf bedeutet, dass noch keine Dienste dokumentiert wurden; früher erledigte Dienste müssen nachgetragen werden.

Die Einträge werden lokal gespeichert, in den gemeinsamen Team-Workspace synchronisiert und im vollständigen Backup exportiert/importiert. Archivierte oder gelöschte Spieler bleiben als frühere Besitzer erkennbar. Lesender Zugriff kann die Übersicht ansehen, aber keine Dienste ändern.

## Abnahme

- `node scripts/jersey-duty-smoke.mjs`: Mitnahme, Satzsperre, Datumsprüfung, Rückgabe ohne doppelte Zählung, Saisonverteilung, Kaderhistorie, Speicherung und Sync.
- `node scripts/jersey-duty-browser.mjs`: tatsächlicher Browserlauf auf iPhone und bei 320 px, mit Menü, Heim-/Auswärtsmitnahme, Rückgabe, Verlaufskorrektur, Reload und Overflow-/Browserfehlerkontrolle. Wird in GitHub Actions ausgeführt.
