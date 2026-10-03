# CourtHub Basketball-KI

CourtHub verwendet für alle KI-Funktionen einen gemeinsamen Basketball-Fachstandard. Das zugrunde liegende Sprachmodell bleibt ein allgemeines Modell, erhält aber bei jeder Anfrage verbindlich dieselbe spezialisierte Rolle, Fachsystematik und Qualitätsregeln.

## Fachbereiche

- Technik: Ballhandling, Passspiel, Fußarbeit, Wurf, Finishing, Closeouts und Rebounding
- Offense: Spacing, Advantage Creation, Cuts, Screens, Hand-offs, Pick-and-roll, Transition, 5-Out und Horns
- Defense: Ball-Druck, No-Middle, Gap und Helpside, Rotationen, Screen-Coverages, Transition Defense und Box-out
- Trainingslehre: Ziel, Organisation, Belastung, Coaching-Punkte, Progression und Spieltransfer
- Belastungssteuerung: Spielabstand, Session-RPE, Tagesform, Schmerzen, Spielminuten und Wochenbelastung
- Analyse: belegte Beobachtung, fachliche Einordnung und Empfehlung werden klar getrennt

## Datenbasierte Trainingsplanung

Vor jedem KI-Planungslauf erstellt CourtHub ein kompaktes Leistungsbild aus den letzten sechs Wochen. Darin enthalten sind – soweit tatsächlich erfasst – Ergebnisse, Trainerbeobachtungen, Team- und Spieler-Boxscores, geprüfte Atlas-Werte, Wurfquoten, Rebounds, Assists, Turnover, Spielminuten, abgeschlossene Trainings, Anwesenheit, Trainingswürfe und Session-RPE. Zusätzlich werden der Belastungsverlauf der vergangenen vier Wochen und die aktuelle Sieben-Tage-Belastung pro Spieler übergeben.

Die Saisonplanung verarbeitet jeden Trainingstermin einzeln. Der Analysekontext wird unmittelbar vor der jeweiligen Anfrage auf diesen Termin zugeschnitten und in begrenzter Form übertragen. Dadurch bleiben Spiel- und Belastungsdaten erhalten, ohne dass ein kompletter Wochenblock an der Laufzeitgrenze abbricht. Bereits bestätigte Einzeltermine werden lokal fortsetzbar gespeichert.

Die KI muss wiederkehrende Muster stärker gewichten als einzelne Ausreißer und fehlende Werte neutral behandeln. Zu jedem erzeugten Training speichert sie deshalb eine `evidenceBasis` mit den verwendeten Trends, Belastungsaspekten und der abgeleiteten Planungsentscheidung. Diese Begründung ist im Trainingsplan unter „Warum die Basketball-KI dieses Training plant“ sichtbar.

## Gegner-Scouting und Defense-Auswahl

Saison-Gegner werden aus dem vollständigen TeamSL-Ligaspielplan angelegt. Ergänzend kann das Trainerteam mehrere DBB.Scores-Screenshots gemeinsam auswerten lassen. Die KI extrahiert ausschließlich sichtbare Spiele und Einzelspielwerte; CourtHub zeigt vor jeder Übernahme eine Kontrollvorschau und speichert die Bilder selbst nicht.

Der geprüfte `opponentContext` enthält Ergebnisform, Punkteschnitte, verfügbare Teamfouls, Wurfwerte, Topscorer, Trainerbeobachtungen, Quellen und Datenqualität. Die zulässige Defense-Auswahl ist auf Mannverteidigung mit No-Middle, Zone 2-1-2 und Zone 3-2 begrenzt. Bei niedriger Datenqualität bleibt Mannverteidigung die Basis. Gegnerbezogene Inhalte dürfen höchstens 25 Prozent einer normalen Einheit und höchstens eine von fünf individuellen Freitagsstationen bestimmen.

Im Spieltag erstellt die Aktion `planGame` aus dem eingefrorenen Gegner-Snapshot genau drei Kabinensätze, Spielziele, Offense-Schlüssel, Defense-Schlüssel, Aufwärmpunkte und Halbzeitfragen. Fehlende Wurfversuche werden nicht zu Quoten ergänzt, einzelne Trefferprofile nicht als sichere Schwäche formuliert und andere Defense-Systeme nicht vorgeschlagen. Der Coach kann die Inhalte vor dem Live-Start ändern; im Live Game bleiben sie unverändert nachvollziehbar.

Die vollständige Bedien- und Datenbeschreibung steht in `docs/OPPONENT-SCOUTING.md`.

## Verbindliche Grenzen

Die Basketball-KI erfindet keine Spieler-, Spiel-, Leistungs-, Verletzungs- oder Ergebnisdaten. PDF-Importe werden nur strukturiert und nicht fachlich ergänzt. Trainingszusammenfassungen bleiben wortgetreu an verifizierte Fakten gebunden. Bei Schmerzen oder Verletzungsverdacht gibt die KI keine Diagnose, sondern reduziert die Belastung und empfiehlt bei anhaltenden Beschwerden eine medizinische Abklärung.

Der Fachstandard ist zentral in `api/_lib/basketball-knowledge.js` versioniert. Änderungen wirken dadurch gleichzeitig auf Saisonplanung, Freitagstraining, Trainingsauswertung, PDF-Import und Taktikerklärung.
