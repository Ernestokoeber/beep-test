# CourtHub – Nächste Umsetzungsschritte

Stand: 03.10.2026

## 1. KI-Saisonplanung stabilisiert

Die Saisonplanung arbeitet pro KI-Anfrage mit genau einem Trainingstermin. Der Leistungs- und Belastungskontext wird für den jeweiligen Termin neu gebildet und kompakt übertragen. Gemini verwendet für diesen zeitkritischen Ablauf den niedrigen Thinking-Level.

- Wiederholt werden nur als wiederholbar klassifizierte Fehler.
- Provider-, Konfigurations-, Modell- und Timeoutfehler besitzen unterscheidbare Codes.
- Request-ID, Fehlercode und eine sichtbare Fehlermeldung erscheinen direkt in der Planung.
- Serverlogs enthalten nur sichere Diagnosemetadaten, keine Prompts, Leistungsdaten oder Schlüssel.
- Bestätigte Einzeltermine bleiben nach Abbruch oder Neuladen fortsetzbar.

Die Neon-SSL-Warnung ist nicht Ursache der Abbrüche. Die Datenbank-URL sollte bei Gelegenheit von `sslmode=require` auf `sslmode=verify-full` umgestellt werden.

## 2. Taktikboard zum vollständigen Halbfeld-Board ausbauen

Ziel ist ein 5-gegen-5-Halbfeld-Taktikboard für Training und Spielerkommunikation.

- Angreifer und Verteidiger mit klar unterschiedlichen Tokens.
- Ball, Hütchen, Zonenflächen, Screens und Beschriftungen.
- Lauf-, Pass-, Dribbling-, Screen-, Closeout- und Rotationspfeile.
- Rollen wie PG, Wing und Big statt ausschließlich 1–5.
- Vorlagen: 2–3 Zone knacken, 5-Out, Horns und No-Middle Defense.
- Schrittweise Animation, GIF/PDF-Export und später veröffentlichbare Spieleransicht.

## Reihenfolge

1. Saisonplanung produktiv mit echten Teamdaten abnehmen.
2. Taktikboard und Trainingsplanung anhand des Trainerfeedbacks weiter verfeinern.
