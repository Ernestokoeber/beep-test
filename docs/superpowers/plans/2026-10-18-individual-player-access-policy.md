# Persönliche Einladungen und Spielerzugriff

> Umsetzung mit superpowers:executing-plans; vorhandenen Worktree weiterverwenden.

**Ziel:** Persönlicher QR-Code je Individualprofil, 72 Stunden Standardgültigkeit, genau eine Kontoregistrierung und ausschließlich eigener Individualbereich. Mannschaftstrainings bleiben gesperrt.

**Vorgabe:** Aktueller Nutzerauftrag; bestehende Einladungs- und Individualverträge bleiben erhalten. Keine E-Mail-Identitätsprüfung oder neue kostenpflichtige Dienste einführen. Der Code ist ein persönlicher Einladungsschlüssel; wer ihn zuerst erfolgreich einlöst, bindet das eine Konto.

## Umsetzung

- [x] Einladungen: bestehenden Ablauf, Widerruf, unterschiedliche Profile, parallele Erzeugung und parallele Einlösung mit echtem PostgreSQL prüfen; Erzeugung mit Registrierung serialisieren. Ablaufdatum und 72 Stunden im Trainerdialog sichtbar machen.
- [x] Zugriff: Spieler an Mitglieder-, Mannschaftsspiel- und Mannschafts-KI-Endpunkten vor Daten-/Providerzugriff abweisen. Spielerübersicht über explizite Feldfreigaben begrenzen; keine internen Coach-Metadaten übertragen. Bestehende Workspace-/Routen-Sperren prüfen.
- [x] Gerätespeicher: bei Spieleranmeldung keinen vorhandenen Trainer-Workspace laden; persönlichen leeren Workspace mit getrenntem Besitzer verwenden, Trainerstand separat erhalten. Öffentliche Mannschaftsspielbericht-Zustellung für Spieler nicht starten.
- [x] Nachweis: zuerst fehlschlagende Regressionen, anschließend vollständige Suite, echte PostgreSQL-/Browserprüfung und öffentliche Live-Prüfung mit getrennten synthetischen Konten. Persönliche Thomas-/Adnan-Einladungen bleiben unverbraucht. Unabhängiger Review, Veröffentlichung und klare Beschreibung der freigegebenen Spielerdaten.

## Ergebnis

- Vollständige Regression: npm test, Exit 0.
- Echter PostgreSQL-Test mit paralleler Codeerzeugung, paralleler Registrierung und mobilem Browser: Exit 0; Testschema entfernt.
- Unabhängiger Code-Review: Approve, keine offenen Befunde.
- Live-Version v245: produktiver QR-Ablauf und Rückmeldungen erfolgreich; Mannschafts-APIs verweigern Spieler mit 403, fremde Profilparameter liefern ausschließlich das eigene Profil.
- Persönliche Codes beider Pilotspieler weiterhin gültig und nicht eingelöst. Die Live-Testorganisation und ihre synthetischen Konten sind entfernt; 27 Spieler und 13 Spiele des Teams erhalten.
- Einschränkung: mobiler Browser mit 390 Pixeln geprüft, kein physisches iPhone.
