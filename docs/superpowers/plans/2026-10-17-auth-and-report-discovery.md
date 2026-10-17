# Trainer-Anmeldung und weitere veröffentlichte Berichte

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans; ein unabhängiger Gesamt-Review vor Veröffentlichung.

**Goal:** Funktionsfähige und verständliche Anmeldeoberfläche trotz Kontingentfehler, sichere Fortsetzung vorhandener Sitzungen und automatische Entdeckung weiterer geprüfter Berichte.

**Architecture:** Vorhandenen, an denselben Token gebundenen Identity-Cache bei exakt bestätigtem Datenbank-Kontingentfehler wie im Offlinefall nutzen, ohne Serverrechte zu verändern. Anmeldung und Workspace-Abgleich getrennt melden. Die statische Berichtsverteilung wird von einer einzelnen Datei auf ein kleines öffentliches Verzeichnis umgestellt. Es wird beim Öffnen und bei einem weiteren Prüfanlass nach Ablauf von fünf Minuten erneut geladen; es gibt keinen eigenen Dauerpoll für das Verzeichnis.

**Spec:** Nutzerauftrag in diesem Chat: Trainer-Anmeldebutton reparieren, künftige Berichte ohne manuellen Import und ohne Zusatzkosten. Nutzer will einen öffentlichen Originalspielbericht hochladen; dessen automatischer Quellzugang ist noch ungeklärt.

## Befund / Grenzen

- Echter POST /api/auth/login liefert 503 DATABASE_QUOTA_EXCEEDED. Frische Anmeldung braucht Datenbankzugriff und kann während der Neon-Sperre nicht als erfolgreich dargestellt werden.
- Login-Fehlermeldung stand hinter dem Registrierungsformular. Bei erfolgreichem Login und anschließendem Sync-Fehler war die Erfolgsmeldung irreführend.
- Öffentliche TeamSL-Boxscores 2924663 und 2924661 liefern korrekte Ergebnisse/Viertel, jedoch Null-Platzhalter und anonymisierte Spieler. Keine Übernahme als tatsächliche individuelle Statistik. Anbieter führt Boxscores als Gold-Inhalt: https://www.dbbarea.com/.
- Keine neue Datenbank, keine neuen Kosten, kein Passwortcache, keine manuelle Rollenzuweisung und keine Umgehung von Anbieterzugängen. Originalbericht für weitere Quellenprüfung fehlt noch.

## Review Focus

- Tokenwechsel, Logout, anderer Teamcache, 401/403 und ungültige Cacheeinträge dürfen keine Trainersitzung wiederherstellen.
- Gespeicherte Identität bleibt als unbestätigte lokale Sitzung sichtbar; erneute Prüfung läuft über /auth/me vor Workspace-Abruf.
- Doppelklick, Formularvalidierung und verzögerte Fehler müssen direkt am Login sichtbar sein; kein falscher Synchronisierungserfolg.
- Berichtsverzeichnis erlaubt nur lokale JSON-Dateinamen, eindeutige Ziele und vorhandene Profile; bestehende Berichte/Editoren bleiben geschützt.
- Netzwerkfehler und unbekannte Quellen ergeben keine Null-Statistiken oder Teilübernahmen. Das Verzeichnis muss auch bei installierter PWA aktualisiert werden.

## Aufgaben

- [x] Rote Regressionen für Login+503, wiederhergestellte Identität, Token-/Teamwechsel und erfolgreiche Anmeldung mit gescheitertem Workspace schreiben.
- [x] js/sync.js, js/account.js, index.html: Cache-Identität eng begrenzen und markieren, Serverprüfung bei Wiederverbindung, direkte Formularmeldungen/Busy-Status, tatsächlichen Sync-Zustand ausgeben.
- [x] js/published-report-delivery.mjs und data/published-game-reports/index.json: mehrere geprüfte Berichte aus Verzeichnis, fünf Minuten Cache-Gültigkeit, Dateipfadprüfung und keine Überschreibung.
- [x] sw.js: Verzeichnis network-first mit Offline-Rückfall, PWA 241; Regressionen und Browserprüfungen.
- [x] Unabhängiger Gesamt-Review ohne wesentliche Befunde; vollständiges npm test erfolgreich. Browserprüfungen bei 320/390 Pixeln erfolgreich, einschließlich Cache-Sitzung und erneuter Serverprüfung.
- [ ] Veröffentlichung und Prüfung der Live-Dateien mit isolierten Browser-Testdaten.

## Quellenarbeit bleibt offen

Der Nutzer bietet den öffentlichen Spielbericht zum Hochladen an. Erst nach Prüfung dieses Originals lässt sich der vollständige künftige DBB.Scores-/DSS-Abruf verbindlich planen. Ein erweitertes Verzeichnis verteilt neue geprüfte Berichte automatisch, liest sie jedoch nicht selbst aus einer noch unbekannten Quelle.
