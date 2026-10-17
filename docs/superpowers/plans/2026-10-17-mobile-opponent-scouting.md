# Mobiles Gegner-Scouting mit belegter Webrecherche

Auftrag: Mobile Übersicht mit nächstem Gegner, eigenen Gegnerseiten und echtem Zurückweg. Bestehende Gemini-Anbindung um umfassende öffentliche Basketballrecherche erweitern: Teamidentität, Jugend-/U20-Bezüge, Spielerhistorie und Aufstellungsvergleiche. Bestehender bestätigter mobiler Aufbau bleibt Grundlage; Umsetzung lokal, Veröffentlichung separat.

## Daten und Grenzen

- Google-Search-Grounding des vorhandenen Gemini-Modells; keine neue Schlüssel- oder Anbieteranbindung. Nur sportbezogene öffentliche Informationen, keine privaten Kontaktdaten, Wohnorte oder abgeleitete Geburtsdaten.
- Gesuchte Quellen: DBB/TeamSL, Landesverband, Vereinsseiten, offizielle Kader, Spielberichte sowie Vorjahressaisons. Gleichnamige Teams über Verein, Liga, Saison und Team-ID unterscheiden; U20 ausdrücklich prüfen statt voraussetzen.
- Jede Tatsachenbehauptung braucht eine vom Provider tatsächlich gelieferte Webquelle. Nicht belegte Aussagen werden als Datenlücke ausgegeben. Herkunft/Vereinswechsel nur bei ausdrücklichem Beleg, „erstmals gefunden“ ist kein bestätigter Zugang. Keine globale Vollständigkeitsgarantie.
- Aufstellungen nur bei ausdrücklichem Starterbeleg als bestätigt führen, sonst als Projektion/Unbekannt. Unterschiede zwischen Spielen deterministisch vergleichen. Eigene Starting Five nur aus ausgewählter Live-Session oder konfliktfreier aktueller Spieltagsvorbereitung; keine TNA-/Gesundheitsdaten an die Recherche senden.
- Forschung wird separat im Gegnerprofil gespeichert und überschreibt keine geprüften Statistikwerte oder Trainerbeobachtungen. Kontext für bestehende KI-Gameplans erhält eine gekürzte, als externe Recherche gekennzeichnete Zusammenfassung.

## Umsetzung

1. Rechercheschema, Eingabe-/Ausgabeprüfung und echte Grounding-Quellen in eigenem Backendmodul; Aktion researchOpponent in bestehendem Gateway. 50-s-Transportlimit, reduziertes Stundenlimit, Trainerrollen serverseitig. Auth/Teamwechsel und verspätete Antworten dürfen keine fremden lokalen Daten verändern.
2. Gegnerseiten: /opponents Übersicht mit nächstem Gegner und Suche; /opponents/:id kompakter Bericht; /research, /roster, /lineups, /data, /edit, /import und /settings als getrennte Unterseiten. Legacy-Screenshotimport und manuelle Fachfunktionen erhalten.
3. Kontext, Formulardrafts, Quellenlinks, Datumsanzeige, Datenlücken, Sync und globale Zurück-Navigation. Keine Workspace-Mutation beim bloßen Lesen. Viewer/Player lesend.
4. Tests rot/grün: Quellenfälschung, falsches Team/Saison, fehlende Suchergebnisse, U20/Herren nicht gleichsetzen, Spieleridentität, bestätigte Starter versus Projektion, alte Antworten, Rollen, Entwürfe. Browser 320/390/768/1440 px, beide Rückwege und Offline-Lesen. Ein unabhängiger Gesamtreviewer.

## Quellen zur technischen Machbarkeit

- https://ai.google.dev/gemini-api/docs/generate-content/structured-output (Gemini 3 unterstützt strukturierte Ausgabe zusammen mit Search-Grounding).
- https://ai.google.dev/gemini-api/docs/google-search (Websuche und Quellenattribution).
- Die Vereinsseite https://tsv-wasserburg-basketball.de/ führt U20m im Suchindex; das allein belegt ausdrücklich noch nicht, dass ein konkretes Herren-Ligateam mit der U20 identisch ist. Diese Zuordnung muss die Recherche saisonbezogen belegen.

## Nachweise

- Basis 41c6c01, Branch codex/mobile-opponents im vorhandenen isolierten Worktree.
- Umsetzung inline nach executing-plans abgeschlossen. Neue Seiten /opponents, /opponents/:id sowie research, roster, lineups, data, edit, import und settings.
- Recherchevertrag v14: Search-Tool, eigene Quellenzuordnung auch für Zusammenfassung und Coaching-Einschätzungen, Redirect-Belege über konkrete Grounding-Supports; ohne Zuordnung werden Angaben verworfen. Browser zeigt zugehörige Quellen und Suchumfang; Suchvorschläge bleiben im restriktiven iframe-Sandbox.
- Unabhängiger Review mit Nachprüfung abgeschlossen, keine offenen Blocker. Regressionen korrigiert: gleichnamige Teams mit verschiedenen IDs strikt trennen (auch Gameplan/Speicherung), leere Spielplanwerte überschreiben keine vorhandenen Resultate, Saisontrennung einschließlich Ligasync und Archivierung manueller Vorjahresdaten, exakt fünf eindeutige Starter statt gekürzter Kaderliste, kein unbelegtes Narrativ über beliebige Suchtreffer.
- Nachweise: `npm test`, `npm run test:scouting`, `npm run test:scouting:browser`, `npm run test:navigation:browser`, statische Prüfungen und `git diff --check` erfolgreich. Browsermatrix 320/390/768/1440 px mit Spiel-Direktlink, echten Rückwegen/Scroll, Suche, Entwürfen/Reload, Importseite, Kader, Aufstellungen, Rollen und API-Testantworten. Separate Tests für Identitätswechsel und Ausschluss von TNA-/Gesundheitsdaten.
- Echte Offline-PWA v232 mit 160 Dateien geprüft: Liste, gespeicherter Bericht, Kaderhistorie, Reload und Zurück funktionieren ohne Netzwerk.
- Keine echte Gemini-Anfrage ausgeführt: im lokalen Prozess kein Schlüssel, ausschließlich .env.example vorhanden. Die bestehende serverseitige GEMINI_API_KEY-Konfiguration bleibt zuständig; der reale KI-Lauf muss nach separater Veröffentlichung geprüft werden. Keine neue Schlüsselprovisionierung und keine externe Veröffentlichung in diesem Auftrag.

## Korrektur nach echtem Coaching-Beispiel: Herren/U20

Die Websuche allein hat erreichbare DBB-Spielberichte übersehen. Die Recherche lädt nun vor der KI-Suche die Ziel-Liga direkt aus dem bekannten öffentlichen TeamSL-Endpunkt, ermittelt den Verein über clubId und entdeckt U20-/U18-Ligen über die öffentliche regionale Ligenübersicht. Maximal sechs Vergleichsligen und drei vergangene Spielberichte je Team, begrenztes Abrufbudget und feste DBB-Origin.

Namentliche Überschneidungen werden deterministisch berechnet. Reine Jugend-Kaderbelege werden nicht in den Zielkader verschoben. Maskierte Namen bleiben unbekannt. Spielberichtskader und ausschließlich mit Nullwerten gefüllte Statistiken belegen weder Starter noch individuelle Leistungen. Der Spielplanstatus einschließlich Absagen wird separat dargestellt. Die KI erhält diese Primärdaten und sucht anschließend nach den belegten Spielern und ihrer sportlichen Historie. Mobile Übersicht zeigt die wichtigsten Verknüpfungen; Recherche-, Kader- und Vergleichsseiten enthalten die vollständigen direkten Belege.

Echter öffentlicher Abruf am 17.10.2026: TSV Wasserburg/Günzburg Herren (165627), U20 (210403) und U18 (163568) teilen Vereins-ID 764. Verfügbare vergangene Berichte ergeben sieben Herren/U20-Namensüberschneidungen und zwei Herren/U18-Überschneidungen. Das für 18.10., 10:00 Uhr geführte U20-Spiel in Schrobenhausen ist im API-Status abgesagt. Daraus folgt keine gesicherte künftige Kaderidentität.

Unabhängiger Review: zwei Funde zu Jugend-only-Spielern und unzulässigen Starterbelegen mit roten Tests reproduziert, korrigiert und vom Reviewer nachgeprüft.
