# CourtHub – Nächste Umsetzungsschritte

Stand: 03.08.2026

## 1. KI-Saisonplanung stabilisieren

Die Saisonplanung wird in Viererblöcken angefragt. Offen sind noch zwei Punkte:

- Service-Worker-Cache versionieren, damit Browser und Server immer dieselbe Blockgröße verwenden.
- Ungültige Gemini-JSON-Antworten je Block einmal kontrolliert erneut anfordern und erst nach vollständigem Erfolg alle Trainings übernehmen.

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

1. Saisonplanung technisch stabil machen und produktiv testen.
2. Taktikdatenmodell und Tokens für Angriff/Verteidigung erstellen.
3. Werkzeugleiste und Vorlagenbibliothek bauen.
4. Animation, Export und Spieleransicht ergänzen.
