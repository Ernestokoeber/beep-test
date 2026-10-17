# Persönliche Einladungen und Spielerzugriff

> Umsetzung mit superpowers:executing-plans; vorhandenen Worktree weiterverwenden.

**Ziel:** Persönlicher QR-Code je Individualprofil, 72 Stunden Standardgültigkeit, genau eine Kontoregistrierung und ausschließlich eigener Individualbereich. Mannschaftstrainings bleiben gesperrt.

**Vorgabe:** Aktueller Nutzerauftrag; bestehende Einladungs- und Individualverträge bleiben erhalten. Keine E-Mail-Identitätsprüfung oder neue kostenpflichtige Dienste einführen. Der Code ist ein persönlicher Einladungsschlüssel; wer ihn zuerst erfolgreich einlöst, bindet das eine Konto.

## Umsetzung

- [x] Einladungen: bestehenden Ablauf, Widerruf, unterschiedliche Profile, parallele Erzeugung und parallele Einlösung mit echtem PostgreSQL prüfen; Erzeugung mit Registrierung serialisieren. Ablaufdatum und 72 Stunden im Trainerdialog sichtbar machen.
- [x] Zugriff: Spieler an Mitglieder-, Mannschaftsspiel- und Mannschafts-KI-Endpunkten vor Daten-/Providerzugriff abweisen. Spielerübersicht über explizite Feldfreigaben begrenzen; keine internen Coach-Metadaten übertragen. Bestehende Workspace-/Routen-Sperren prüfen.
- [x] Gerätespeicher: bei Spieleranmeldung keinen vorhandenen Trainer-Workspace laden; persönlichen leeren Workspace mit getrenntem Besitzer verwenden, Trainerstand separat erhalten. Öffentliche Mannschaftsspielbericht-Zustellung für Spieler nicht starten.
- [ ] Nachweis: zuerst fehlschlagende Regressionen, anschließend vollständige Suite, echte PostgreSQL-/Browserprüfung und öffentliche Live-Prüfung mit getrennten synthetischen Konten. Persönliche Thomas-/Adnan-Einladungen bleiben unverbraucht. Unabhängiger Review, Veröffentlichung und klare Beschreibung der freigegebenen Spielerdaten.
