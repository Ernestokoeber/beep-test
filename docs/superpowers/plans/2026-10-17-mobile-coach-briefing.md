# Mobiles Trainerbriefing

Auftrag: Auf dem Handy sofort erkennen, worauf beim nächsten Training oder Spiel zu achten ist; Termin mit einem Tipp öffnen. Grundlage: bestätigtes mobiles App-Navigationsdesign.

1. Bestehende Trainingsanalyse wiederverwenden, für ausgewählte Termine lesbar machen. Ein gemeinsames Modell wählt wie Heute den nächsten offenen Einsatz; Training/Spiel lassen sich direkt auswählen. Explizit fehlende Termine bekommen einen eigenen Leerzustand.
2. Eigenes Briefing-Modul: Termin und Direktlink, sichtbarer Coaching-Fokus, offene Punkte vor Beginn, darunter vollständige einklappbare Details. Spielbriefing aus gespeichertem Gameplan/Kader/Gegnerplan; Konflikte ausdrücklich anzeigen, keine beliebige Erfassung auswählen.
3. Briefing vom jeweiligen Training/Spiel erreichbar; globale Zurück-Navigation und Direktlink-Fallback auf den zugehörigen Termin. Teilen liest aktuelle Daten des gewählten Termins, ohne Daten zu ändern. Aktualisierung bei Sync und Rückkehr; Fokus und geöffnete Details erhalten, Listener aufräumen.
4. Modelltests zuerst rot/grün, vorhandene Briefing-/Coachingtests erhalten. Browser: 320/390/768/1440 px, Training/Spiel/Leerzustände, Kontext, Zurück, Teilen, Sync, Dunkelmodus und unveränderte Daten. Ein unabhängiger Gesamt-Review am Ende.

## Entscheidungen / Nachweise

- Vorhandener Worktree, neuer Branch ab `6512243`.
- Keine neue KI-Anfrage: Das Briefing verdichtet die gespeicherten Coaching-Angaben und benennt fehlende Informationen.
- Umsetzung lokal. Veröffentlichung erfolgt auf separaten Auftrag.
- Status: Lokal umgesetzt, noch nicht veröffentlicht.
- Regressionstests zuerst rot: neues Briefingmodell fehlte, Spielereinschränkungen fehlten; anschließend grün. Neuere Gameplan-Versionen werden als Revisionen gelesen, Konflikte nicht beliebig aufgelöst. Live-Gameplan hat Vorrang; Legacy-Sitzung ohne Gameplan darf keine widersprüchliche Entwurfsversion übernehmen.
- `npm test` vollständig grün, einschließlich bestehender Trainingsbriefing- und neuer Briefingseiten-Prüfungen. Bestehende mobile Coachingwege über `npm run test:navigation:browser` ebenfalls grün.
- `node scripts/briefing-pages-browser.mjs`: 320/390/768/1440 px, beide Terminarten, Termindirektlinks, direkter Briefing-Link mit Elternfallback, App-/Browser-Zurück, Synchronisierung mit erhaltenen Details/Fokus, Teilen, Konflikt-/Leerzustände, Lesezugriff und Dunkelmodus grün.
- PWA v229: neue Briefing-Datei enthalten, 154 Offline-Dateien, Ladeprüfung erfolgreich.
- Unabhängiger Gesamt-Review: keine wesentlichen Befunde. Kleine Statusabweichung bei zukünftiger bereits gespeicherter Trainingsdurchführung angeglichen; Regressionstest zunächst rot, nach Korrektur grün.
- Die vorhandene Spielübersicht legt weiterhin Gegnerprofile an. Browserprüfung vergleicht deshalb die Trainings-/Spiel-/Spielerdaten; das reine Briefingmodell wird separat auf unveränderten vollständigen Speicher geprüft.
