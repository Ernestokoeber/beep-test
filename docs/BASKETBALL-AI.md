# CourtHub Basketball-KI

CourtHub verwendet für alle KI-Funktionen einen gemeinsamen Basketball-Fachstandard. Das zugrunde liegende Sprachmodell bleibt ein allgemeines Modell, erhält aber bei jeder Anfrage verbindlich dieselbe spezialisierte Rolle, Fachsystematik und Qualitätsregeln.

## Fachbereiche

- Technik: Ballhandling, Passspiel, Fußarbeit, Wurf, Finishing, Closeouts und Rebounding
- Offense: Spacing, Advantage Creation, Cuts, Screens, Hand-offs, Pick-and-roll, Transition und klare Anschlussentscheidungen
- Defense: Ball-Druck, Position zwischen Gegenspieler und Korb, Helpside, Rückrotation, Screen-Coverages, Transition Defense und Box-out
- Trainingslehre: Ziel, Organisation, Belastung, Coaching-Punkte, Progression und Spieltransfer
- Belastungssteuerung: Spielabstand, Session-RPE, Tagesform, Schmerzen, Spielminuten und Wochenbelastung
- Analyse: belegte Beobachtung, fachliche Einordnung und Empfehlung werden klar getrennt

## Datenbasierte Trainingsplanung

Vor jedem KI-Planungslauf erstellt CourtHub ein kompaktes Leistungsbild aus den letzten sechs Wochen. Darin enthalten sind – soweit tatsächlich erfasst – Ergebnisse, Trainerbeobachtungen, Team- und Spieler-Boxscores, geprüfte Atlas-Werte, Wurfquoten, Rebounds, Assists, Turnover, Spielminuten, abgeschlossene Trainings, Anwesenheit, Trainingswürfe und Session-RPE. Zusätzlich werden der Belastungsverlauf der vergangenen vier Wochen und die aktuelle Sieben-Tage-Belastung pro Spieler übergeben.

Die Saisonplanung verarbeitet jeden Trainingstermin einzeln. Der Analysekontext wird unmittelbar vor der jeweiligen Anfrage auf diesen Termin zugeschnitten und in begrenzter Form übertragen. Dadurch bleiben Spiel- und Belastungsdaten erhalten, ohne dass ein kompletter Wochenblock an der Laufzeitgrenze abbricht. Bereits bestätigte Einzeltermine werden lokal fortsetzbar gespeichert.

Die KI muss wiederkehrende Muster stärker gewichten als einzelne Ausreißer und fehlende Werte neutral behandeln. Zu jedem erzeugten Training speichert sie deshalb eine `evidenceBasis` mit den verwendeten Trends, Belastungsaspekten und der abgeleiteten Planungsentscheidung. Diese Begründung ist im Trainingsplan unter „Warum die Basketball-KI dieses Training plant“ sichtbar.

## Verbindliches Teamkonzept

Das im Trainingsplan bearbeitbare `teamStrategy` ist die einzige aktuelle Quelle für Mannschaftsprinzipien und freigegebene Teamtaktiken. Seit dem Strategiewechsel vom 4. Oktober 2026 bildet Pick-and-Roll die Offense-Basis: Screen eng nutzen, Roller oder Popper lesen, Reject nur gegen echtes Überplay, Re-Screen und Kick-out als Anschluss. In der Defense sind zunächst ausschließlich Mannverteidigungs-Grundlagen aktiv.

`replacesPrevious=true` gibt diesem Konzept Vorrang vor historischen Trainingsnamen, Spielberichten und früheren KI-Entwürfen. Horns, Horns 2, Five-Out, Spain-Pick-and-Roll und die bisherigen Zonen bleiben im Phase-3-Archiv nachvollziehbar, werden aber weder an die Saisonplanung noch an den Spieltags-Gameplan übergeben. Neu erstellte Taktiken können im Teamkonzept aktiviert werden und stehen danach automatisch beiden KI-Abläufen zur Verfügung. Jede Änderung erhöht die Strategierevision und verwirft einen noch nicht abgeschlossenen lokalen KI-Saisonentwurf.

## Gegner-Scouting und Defense-Auswahl

Saison-Gegner werden aus dem vollständigen TeamSL-Ligaspielplan angelegt. Ergänzend kann das Trainerteam mehrere DBB.Scores-Screenshots gemeinsam auswerten lassen. Die KI extrahiert ausschließlich sichtbare Spiele und Einzelspielwerte; CourtHub zeigt vor jeder Übernahme eine Kontrollvorschau und speichert die Bilder selbst nicht.

Der geprüfte `opponentContext` enthält Ergebnisform, Punkteschnitte, verfügbare Teamfouls, Wurfwerte, Topscorer, Trainerbeobachtungen, Quellen und Datenqualität. Die zulässige Defense-Auswahl kommt dynamisch aus `teamStrategy.allowedDefenseIds`; aktuell ist nur Mannverteidigung mit einfachen Grundregeln freigegeben. Gegnerbezogene Inhalte dürfen höchstens 25 Prozent einer normalen Einheit und höchstens eine von fünf individuellen Freitagsstationen bestimmen. Das strukturierte `tacticalPlaybook` enthält ausschließlich die im Teamkonzept aktivierten Taktiken; im Spieltags-Gameplan werden davon nur die für das konkrete Spiel ausgewählten Inhalte als `selectedTactics` berücksichtigt.

Im Spieltag erstellt die Aktion `planGame` aus dem eingefrorenen Gegner-Snapshot genau drei Kabinensätze, Spielziele, Offense-Schlüssel, Defense-Schlüssel, Aufwärmpunkte und Halbzeitfragen. Fehlende Wurfversuche werden nicht zu Quoten ergänzt, einzelne Trefferprofile nicht als sichere Schwäche formuliert und andere Defense-Systeme nicht vorgeschlagen. Der Coach kann die Inhalte vor dem Live-Start ändern; im Live Game bleiben sie unverändert nachvollziehbar.

Die vollständige Bedien- und Datenbeschreibung steht in `docs/OPPONENT-SCOUTING.md`.

## Verbindliche Grenzen

Die Basketball-KI erfindet keine Spieler-, Spiel-, Leistungs-, Verletzungs- oder Ergebnisdaten. PDF-Importe werden nur strukturiert und nicht fachlich ergänzt. Trainingszusammenfassungen bleiben wortgetreu an verifizierte Fakten gebunden. Bei Schmerzen oder Verletzungsverdacht gibt die KI keine Diagnose, sondern reduziert die Belastung und empfiehlt bei anhaltenden Beschwerden eine medizinische Abklärung.

Der Fachstandard ist zentral in `api/_lib/basketball-knowledge.js` versioniert. Änderungen wirken dadurch gleichzeitig auf Saisonplanung, Freitagstraining, Trainingsauswertung, PDF-Import und Taktikerklärung.
