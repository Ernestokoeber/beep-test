# Getrennte persönliche Wurfquoten

> Umsetzung inline mit superpowers:executing-plans; abschließend unabhängiger Review.

**Ziel:** „Deine Entwicklung“ zeigt eigene Individual- und Mannschaftstrainingsquoten getrennt. Keine Zusammenrechnung und kein zusätzlicher Mannschaftszugriff.

**Architektur:** Servermodul `api/_lib/individual-shooting.js` berechnet gewichtete Quoten aus tatsächlich erfassten Treffern/Versuchen abgeschlossener Einheiten. Die Individual-Übersicht liest aus dem Team-Workspace per SQL ausschließlich Wurfzeilen der zuvor autorisierten Individualprofile. Die Spielerantwort enthält nur persönliche Aggregate. Gemeinsamer Spieler-/Vorschau-Renderer zeigt getrennte Quellen, Wurfarten, Mengen und Zeiträume.

**Vorgaben:** Keine neue Datenbank, Migration, Kosten oder Provideraufrufe. Nur gespeicherte Treffer/Versuche; keine geplanten Wiederholungen als Nenner. Fehlende Werte sind kein 0 %. „von 5“ am erfassten Messwert bezeichnet dessen dokumentierte Versuchsserie; unvollständige oder ungültige Daten werden ausgelassen. Pro Messschlüssel und Durchgang zählt die jüngste Erfassung. Unterschiedliche Übungen erhalten keine gemeinsame Bewertung.

- [x] Aggregation und Regression: getrennte Quellen, gewichtete Quote, Nulltreffer, fehlende Nenner, Korrekturen, abgesagte/laufende/fremde Daten. Modul und gezielte SQL-Projektion implementieren.
- [x] API und Oberfläche: eigene Profilbindung, explizite DTO-Felder, abgeschlossene Individualeinheiten, getrennte mobile Karten mit Mengen und Leerzuständen. Trainer-Vorschau nutzt denselben Vergleich.
- [ ] Integration und Veröffentlichung: echte PostgreSQL-Projektion und fremde Profile prüfen; mobile Live-Registrierung/Anmeldung mit synthetischen Konten, Änderung einer Quelle darf andere Quote nicht verändern. Unabhängiger Review, passende Regressionen und PWA-Aktualisierung; reale Teamdaten unverändert erhalten.
