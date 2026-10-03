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

Die KI muss wiederkehrende Muster stärker gewichten als einzelne Ausreißer und fehlende Werte neutral behandeln. Zu jedem erzeugten Training speichert sie deshalb eine `evidenceBasis` mit den verwendeten Trends, Belastungsaspekten und der abgeleiteten Planungsentscheidung. Diese Begründung ist im Trainingsplan unter „Warum die Basketball-KI dieses Training plant“ sichtbar.

## Verbindliche Grenzen

Die Basketball-KI erfindet keine Spieler-, Spiel-, Leistungs-, Verletzungs- oder Ergebnisdaten. PDF-Importe werden nur strukturiert und nicht fachlich ergänzt. Trainingszusammenfassungen bleiben wortgetreu an verifizierte Fakten gebunden. Bei Schmerzen oder Verletzungsverdacht gibt die KI keine Diagnose, sondern reduziert die Belastung und empfiehlt bei anhaltenden Beschwerden eine medizinische Abklärung.

Der Fachstandard ist zentral in `api/_lib/basketball-knowledge.js` versioniert. Änderungen wirken dadurch gleichzeitig auf Saisonplanung, Freitagstraining, Trainingsauswertung, PDF-Import und Taktikerklärung.
