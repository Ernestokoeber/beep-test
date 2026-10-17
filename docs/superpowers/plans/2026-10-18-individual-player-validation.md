# Individualtraining: Spieleransicht und Einladungsprüfung

> **For agentic workers:** superpowers:executing-plans; unabhängiger Gesamt-Review vor Veröffentlichung.

**Goal:** Für Montag, 19. Oktober 2026, den Spielerweg konkret vorzeigen und Einladung, QR-Code, Registrierung, persönliche Trainingsseiten und Rückmeldungen prüfen.

**Architecture:** Die vorhandenen rollengetrennten Individual-APIs bleiben maßgeblich. Ein gemeinsamer Renderer zeigt die echte Spieleransicht sowie eine schreibgeschützte Vorschau für Coaches. Einladungstoken werden bei neuen Links im Fragment übertragen; ein öffentlicher Prüfendpunkt validiert Ablauf, Widerruf und Verwendung. Alte Einladungslinks bleiben unterstützt.

**Tech Stack:** Bestehendes Vanilla-JS, PostgreSQL, Vercel, qrcode, JSDOM und Playwright; keine neue produktive Abhängigkeit oder kostenpflichtige API.

**Spec:** Nutzerauftrag im Chat und `docs/individual-training-pilot-2026.md`. UI-Reparaturen und Fertigstellung wurden bereits beauftragt; keine weitere Design-Freigaberunde. Implementierung in bestehendem, sauberem Worktree auf Basis 96d14fb.

## Grenzen und Review Focus

- Produktion liefert beim Individual-Überblick DATABASE_QUOTA_EXCEEDED. Ein isolierter Test ersetzt keine erfolgreiche Registrierung und Rückmeldung gegen die Produktionsdatenbank. Bis zur Aufhebung ist der Montagseinsatz nicht freigegeben.
- Vorschau verändert weder Rolle noch Zuordnung und erlaubt keine Spielereingaben; private Coach-Notizen und andere Spieler dürfen nicht erscheinen.
- Persönliche Seiten haben eigene Routen und Rückwege; fehlende Pläne oder Messungen ergeben verständliche Leerzustände.
- Abgelaufene, verwendete, widerrufene und fehlerhafte Einladungen geben keine Registrierung frei; Doppelanfragen werden verhindert.
- Einladungen bleiben bei abgelehntem Teilen/Kopieren sichtbar; neue Links übertragen den Token nicht an Server oder Referrer.
- Offline-Rückmeldungen bleiben bei Fehlern und parallelen Änderungen in der richtigen Benutzer-Warteschlange; gespeicherte Daten sind an Konto, Team und Rolle gebunden.

## Task 1: Einladung vom QR-Code bis zur Registrierung

**Files:** `api/_handlers/individual/invite.js`, `api/individual/[route].js`, `api/_handlers/individual/manage.js`, `api/_handlers/auth/register.js`, `js/individual-invite.js`, `js/app.js`, `js/account.js`, `js/api.js`, `index.html`.

**Interfaces:** GET `/api/individual/invite?token=...` liefert ausschließlich `valid` und `expiresAt`; `/auth/register` behält seinen bestehenden Vertrag. Neuer Link `/#/join/TOKEN`; alte Query-Links werden in dieselbe Route überführt.

- [x] Regressionen für URL/QR-Gleichheit, Token-Gültigkeit, Rollenbindung, Busy-Zustand, direkte Fehler und Link-Erhalt nach Teilen-Abbruch schreiben und rot ausführen.
- [x] Minimale Korrekturen umsetzen; Registrierung mit unverändertem sicherem Server-Claim, bereits zugeordnete Profile nicht erneut einladen.
- [x] Gezielte API-/UI-Tests grün ausführen.

## Task 2: Spieleroberfläche und Coach-Vorschau

**Files:** `js/individual-player-view.js`, `js/individual-training.js`, `js/app.js`, `individual-training.css`, `data/individual-player-preview.json`, `index.html`.

**Interfaces:** Gemeinsamer Renderer mit `{profileId, pane, preview, demo, onAction, onPush}`. Spieler-Routen `#/individual`, `#/individual/training`, `#/individual/progress`; Coach-Vorschau `#/individual/player/ID/preview/PANE`. Eine getrennt beschriftete Beispielvorschau bleibt während der Datenbanksperre zugänglich.

- [x] Regressionen für eigene Übungen/Messwerte, kein fremdes Feedback, schreibgeschützte Vorschau, eigene Seiten und Leerzustände rot ausführen.
- [x] Vorhandene Farben/Schrift übernehmen; nächster Termin und Teilnahme zuerst, Trainingsablauf und Entwicklung als direkte Ziele; lesbare Details statt JSON-Rohdaten.
- [x] Gezielte UI-Tests und mobile Browserprüfungen bei 320/390 Pixeln grün ausführen.

## Task 3: Rückmeldungen, Auslieferung und Abnahme

**Files:** `js/individual-training.js`, `scripts/individual-player-validation-smoke.mjs`, `scripts/individual-player-browser.mjs`, `scripts/individual-invite-smoke.mjs`, `package.json`, `sw.js`, `docs/individual-training-pilot-2026.md`.

- [x] Regressionen für 503-/Offline-Warteschlange, Parallelität, Konto-/Rollenwechsel und veraltete Renderantworten rot ausführen.
- [x] Rückmeldungen erhalten und Sync-Zustand korrekt anzeigen; PWA-Version 242 mit neuen Assets.
- [x] `npm test`, QR-Decodierung und Browserablauf durchführen; unabhängiger Gesamt-Review, erst danach Veröffentlichung im bestehenden autorisierten Umfang.
- [x] Live-UI und isolierte Browserfälle prüfen, Screenshots liefern und den echten Produktionsblocker ausdrücklich dokumentieren.

## Nachweise vor Veröffentlichung

- Vollständiges `npm test`: Exit 0 nach den Review-Korrekturen.
- Mobile Browserprüfung 320/390 Pixel: Exit 0, tatsächliches QR-Bild decodiert, frische Browserkontexte, eigene Seiten, Rückmeldung und 503-Wiederaufnahme.
- Unabhängiges Review: drei wesentliche Befunde; alle einzeln durch neue Regressionen rot reproduziert und grün korrigiert (Altwarteschlange, Dashboard-Erinnerungen, verspäteter Pilotstart). Keine offenen Codebefunde.
- Die Produktionsfreigabe bleibt wegen der realen Neon-Sperre ausdrücklich offen. Kein Austausch der Datenbank und keine zusätzlichen Kosten.

## Live-Prüfung

- Vercel-Deployment für c61c43a erfolgreich, PWA 242 öffentlich bestätigt.
- Browserablauf mit Live-Dateien bei 320/390 Pixeln sowie Coach-Vorschau, Teilen-Abbruch und 105-Minuten-Beispielplan: Exit 0. Alle API-Schreibzugriffe im Browsertest isoliert.
- Tatsächlicher öffentlicher Einladungsendpunkt: fehlerhafter Token 400, syntaktisch zulässiger Testtoken 503 DATABASE_QUOTA_EXCEEDED, jeweils no-store.
- Vorhandenes reales Administratorkonto öffnet die Live-Beispielvorschau erfolgreich. Screenshots und Abnahmestatus liegen lokal unter artifacts/individual-training-2026-10-19 (nicht veröffentlicht).
- QR-Abnahmetest: Ein gültiges zufälliges Symbol wurde von OpenCV nicht erkannt; unabhängiges ZXing-C++ decodiert exakt denselben Link. Test auf ZXing-C++ umgestellt, keine Änderung an produktiven QR-Bildern. Voraussetzung in scripts/requirements-qr-validation.txt gepinnt.
- Eine Freigabe für reale neue Spieler am Montag wird ausdrücklich nicht erteilt, solange die Produktionsdatenbank gesperrt ist.
