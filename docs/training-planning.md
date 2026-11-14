# Trainingsplanung: Umsetzung und Abnahme

Stand: 14.11.2026. `npm test` sowie die abschließenden Planungs-, Katalog- und statischen Prüfungen sind lokal erfolgreich. Dieser Branch erweitert den bereits vorhandenen Planeditor und Variantenkatalog. Er ist keine Bestätigung eines Produktionsdeployments.

## Umgesetzt

- Coach-Übersicht mit individuellen Plänen, Spieler-/Wochen-/Statusfiltern und direktem Öffnen der passenden Einheit. Zugriff bleibt auf die serverseitig zugeordneten Profile beschränkt; Administratoren behalten ihre bestehende Berechtigung.
- Weitere Montagseinheiten können geplant werden, während frühere noch offen sind. Nummerierung berücksichtigt bereits geplante Einheiten. Doppelte Termine werden auch beim Verschieben abgewiesen. Der bestehende Pilot bleibt auf acht Einheiten, Montag 20:15 Uhr, 105 Minuten und zwei Teilnehmer begrenzt.
- Geplante Abläufe werden zunächst als private Coach-Entwürfe gespeichert. Erst „Geprüften Plan veröffentlichen“ aktualisiert den Spielerplan. Durchgeführte Einheiten behalten den bisherigen Dokumentationsablauf.
- Zielprioritäten, konkrete Ziele, Ausschlüsse, Dreierfreigabe und Ressourcen werden getrennt pro Spieler gespeichert. Guard-/Post-Vorlagen müssen bewusst ausgewählt werden; es erfolgt keine automatische Namenszuordnung zu Thomas oder Adnan.
- KI-Regeneration für eine Übung, eine Auswahl, eine Einheit oder die geplanten Einheiten einer Berliner Kalenderwoche. Im aktuellen Montagspilot betrifft eine Woche regulär eine Einheit. Testeinheiten 1, 4 und 8 werden durch diesen KI-Einstieg nicht verändert.
- Vorschau, unveränderte Nachbarübungen, Beibehalten-Markierung, Schutz ungespeicherter manueller Änderungen und bereits gemessener Übungen. KI-Übungen können vor Veröffentlichung übernommen und weiterbearbeitet werden.
- Versionierte Ziele und Pläne verhindern veraltete Veröffentlichungen. Wochenveröffentlichung erfolgt in einer Transaktion. Wiederholte Veröffentlichung desselben Auftrags bleibt ohne zusätzliche Versionserhöhung. Persistierte Auftragskennungen verhindern doppelte KI-Aufrufe bei identischen API-Wiederholungen.
- Geprüft werden feste Dauer, Auswahlvollständigkeit, Personen-/Helfer-/Korbgrenzen, Material und fehlende Dreierfreigabe. Fachliche Qualität erfordert weiterhin die Coach-Prüfung. Ein 30-Aufträge/Stunde-Limit und ein aktiver Auftrag je Profil begrenzen parallele Aufrufe.
- Lokale Bearbeitung im aktuellen Browser-Tab kann nach Navigation wiederhergestellt werden, solange die Planversion gleich ist. Gespeicherte Serverentwürfe bleiben in der Historie sichtbar. Offline-KI ist nicht verfügbar.
- 400 zusätzliche Übungskonzepte mit fachlichem Prüfstatus; siehe `exercise-library.md`.

## Bewusst noch offen

- Sportfachliche Abnahme der 400 Konzepte, insbesondere Organisation, Helfer-/Spielerbedarf, Progression und echte Unterscheidbarkeit. Kein Eintrag wird automatisch als fachlich freigegeben bezeichnet.
- Automatische KI-Zusammenstellung ausschließlich aus freigegebenen Bibliotheksversionen, vollständige Herkunftsverfolgung und vollständige Rücksetzoberfläche für Bibliotheksversionen.
- Mehrere separat editierbare Einheiten innerhalb eines Wochenentwurfs: derzeit gemeinsam veröffentlichen oder die gewünschte Einheit separat generieren und bearbeiten.
- Fachliche Erfolgsschwellen für die Dreierfreigabe und Freigabe durch den Coach. Die Implementierung nutzt ein bewusstes Freigabefeld, keine ausgedachten Leistungswerte.
- Echter Gemini-Aufruf und Abnahme mit den produktiven Profilen. Lokale Tests verwenden einen kontrollierten Generator; keine echten Spielerpläne werden damit verändert.

## Daten und Rollout

`migrations/20261114_0001_training_proposals.sql` ergänzt Zielpräferenzen, deren Version und eine eigene Entwurfstabelle. Entwürfe sind nicht Teil der Spielerübersicht. Zugriffsrechte werden bei jedem Auftrag und jeder Veröffentlichung erneut geprüft. Private Beobachtungen werden nicht an den KI-Generator übergeben.

Vor dem Rollout eine geprüfte Sicherung gemäß `DEPLOY.md` anlegen und die Migration zuerst auf einer isolierten Datenbankkopie ausführen. Danach API und Frontend gemeinsam ausliefern. Die Migration ist additiv; beim Zurückrollen des App-Codes bleiben neue Entwürfe erhalten. Keine destruktive Down-Migration auf Produktion ausführen. Der Service Worker erhält Cache-Version 279 und alle neuen Skripte.

## Prüfungen

- `npm run test:planning`: echte PostgreSQL-Engine (PGlite), alle Migrationen, API-Autorisierung, Entwurf/Veröffentlichung, Versionskonflikte, Schutzregeln, Fehlererhalt, leere Pläne, Wochenatomarität und Editor mit realem Datenbankhandler; dazu Katalogstruktur.
- `node scripts/individual-flexible-weeks-smoke.mjs`: weitere Wochen trotz offener Einheit und Terminkollisionen sowie bestehende Fokus-/Erinnerungsabläufe.
- `npm test`: gesamte bestehende Regression einschließlich statischer Prüfung und Service-Worker-Assets.
- `npm run test:planning:browser`: echte App-Skripte und API-Handler mit isolierter Datenbank bei 320, 390 und 1280 Pixeln; Vorschau, Bearbeitung, Veröffentlichung und Screenshots.
- GitHub Actions führt zusätzlich die bestehenden Bibliotheks-, Offline-, PWA- und App-Browsertests aus. Lokaler Chromium-Start ist in der Arbeitsumgebung durch eine Betriebssystembeschränkung blockiert; der CI-Browserlauf kann erst nach Veröffentlichung des Branches starten.
