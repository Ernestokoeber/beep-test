# Gebundene Screens im Taktikboard – Design

## Ziel

Screens sind taktische Objekte statt freier Pfeile. Sie bleiben beim Verschieben an ihrem Screensteller verankert und lassen sich in Schritten sowie GIF-Export korrekt darstellen.

## Datenmodell

Jeder Schritt erhält ein Array `screens`. Ein Screen enthält `id`, `screenerId`, `x`, `y` und `type`. Die Koordinaten sind relativ zum Screensteller gespeichert; dadurch folgt der Block dessen Bewegung. Bestehende Boards ohne `screens` werden beim Laden mit einem leeren Array ergänzt.

## Bedienung

Das neue Werkzeug „Screen“ arbeitet in zwei Klicks: Zuerst wird ein Angreifer als Screensteller gewählt, dann die gewünschte Blockposition. Ein kurzer, gedrehter Rechteckblock wird dort angezeigt. Beim Löschen kann ein Screen direkt ausgewählt werden.

## Darstellung

Screens erscheinen als kräftige, dunkle Blöcke mit kurzer Kennzeichnung. Sie sind weder Lauf- noch Passpfeile und besitzen keine Pfeilspitze. Renderer und GIF-Zeichnung verwenden dieselben Screen-Daten.

## Abgrenzung

Verteidiger, Zonen und Vorlagen sind folgende Ausbauschritte. Diese Änderung schafft nur die belastbare Screen-Grundlage.
