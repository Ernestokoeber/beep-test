# Vollständiges Taktikboard – Design

Stand: 03.08.2026

## Ziel

CourtHub erhält ein vollständiges 5-gegen-5-Halbfeld-Taktikboard für Training und Spielerkommunikation. Trainer können Spielzüge mit allen relevanten Elementen erstellen, als Teamressource speichern, als Vorlage beginnen, schrittweise wiedergeben, als GIF oder PDF exportieren und innerhalb ihres Teams veröffentlichen. Angemeldete Spieler sehen ausschließlich veröffentlichte Taktiken ihres Teams.

## Umfang und Reihenfolge

Die Umsetzung erfolgt als drei aufeinander aufbauende, eigenständig testbare Lieferungen:

1. **Datenmodell und Tokens:** Allgemeine Board-Elemente, Angriffs-/Verteidigungs-Tokens, Rollen, Migration bestehender Taktiknotizen und gemeinsame Teamspeicherung.
2. **Trainerwerkzeuge und Vorlagen:** Horizontale Werkzeugleiste, Hütchen, Zonen, Screens, Beschriftungen, sechs Pfeiltypen und vier bearbeitbare Vorlagen.
3. **Kommunikation und Export:** Vollständige Animation, GIF/PDF, Veröffentlichung und schreibgeschützte Spieleransicht.

## Datenmodell

Ein Board speichert `id`, `title`, `description`, `steps`, `published`, `publishedAt`, `updatedAt`, `createdBy` und `createdAt`. Es wird als Eintrag in den gemeinsamen Workspace-Daten des Teams persistiert und dadurch mit der bestehenden Team-Synchronisierung übertragen.

Jeder Schritt enthält `id`, `duration` und `elements`. Ein Element hat eine stabile `id`, einen `type`, Koordinaten und typbezogene Eigenschaften:

- `offense`: Rollenbezeichnung (`PG`, `Wing`, `Big` oder freie Bezeichnung), optionale Nummer und Position.
- `defense`: Rollenbezeichnung, optionale Nummer und Position; visuell klar von Angriff getrennt.
- `ball`: Position.
- `cone`: Position und optionale Beschriftung.
- `zone`: Rechteck oder Kreis mit Farbe, Transparenz und optionalem Namen.
- `screen`: Start- und Endpunkt sowie optionale Beschriftung.
- `label`: Position und Text.
- `arrow`: Start- und Endpunkt mit `kind` aus `run`, `pass`, `dribble`, `screen`, `closeout` oder `rotation`.

Das Laden unterstützt weiterhin das bisherige Taktikformat mit `players`, `ball`, `arrows` und `texts`. Alte Spieler werden dabei zu Angriffs-Tokens; vorhandene Lauf- und Passpfeile erhalten ihre bisherigen Bedeutungen. Nicht lesbare oder unvollständige Einträge fallen auf ein neues, leeres Board zurück und überschreiben keine gespeicherten Teamtaktiken.

## Trainer-Board

Das Spielfeld bleibt im Zentrum. Die Werkzeugleiste liegt horizontal oberhalb des Boards und wird auf schmalen Bildschirmen in aufklappbare Gruppen für Tokens, Zeichenobjekte und Bearbeitung zusammengefasst. Damit bleibt die volle Spielfeldbreite erhalten.

Ein gewähltes Element erhält eine kurze Kontextleiste unmittelbar am Spielfeld. Dort ändern Trainer nur die zum Typ passenden Eigenschaften, etwa Rolle, Pfeilart, Zonenfarbe oder Text. Elemente lassen sich per Touch und Maus platzieren, verschieben oder löschen. Das Board begrenzt Koordinaten auf das Halbfeld und akzeptiert pro Schritt höchstens fünf Spieler-Tokens je Team, einen Ball und höchstens 30 Zeichenobjekte.

Vier integrierte, vollständig bearbeitbare Vorlagen liefern eine sinnvolle Ausgangsformation:

- 2–3-Zone knacken
- 5-Out
- Horns
- No-Middle Defense

## Speicherung, Rechte und Spieleransicht

`admin`, `coach` und `assistant` dürfen Teamtaktiken erstellen, ändern, löschen und veröffentlichen. `viewer` darf die Traineransicht nicht bearbeiten.

Die Spieleransicht setzt eine reguläre Anmeldung voraus und liest nur Teamtaktiken mit `published: true`. Der Workspace-Endpunkt filtert bei Rolle `viewer` alle nicht veröffentlichten Taktiken serverseitig vor der Antwort. Entwürfe erreichen damit weder den lokalen Speicher noch den Browser eines Spielers. Die bestehende Synchronisierung behandelt `tactics` als Teamdaten, damit auch ein ausschließlich mit Taktiken gefüllter Workspace an Spieler übertragen wird. Die Ansicht enthält Titel, Beschreibung, Legende, Schritt-Navigation und Wiedergabe, jedoch keine Werkzeugleiste, Bearbeitungsfunktionen oder private Trainerinformationen. Ein späteres Aktualisieren einer Veröffentlichung ersetzt die sichtbare Version derselben Taktik.

## Wiedergabe und Export

Die bestehende schrittweise Animation interpoliert Angriffs-, Verteidigungs- und Ballpositionen. Sie rendert Hütchen, Zonen, Screens, Labels und die sechs Pfeiltypen in jeder Ansicht konsistent. GIF nutzt denselben Renderer wie das Board.

Der PDF-Export erzeugt eine lesbare A4-Übersicht mit Titel, Legende und einem Spielfeld pro Schritt. Er verwendet ausschließlich die gespeicherte Board-Repräsentation; Export und Spieleransicht können damit nicht von der Traineransicht abweichen.

## Fehlerbehandlung und Tests

Ungültige Elementdaten werden beim Laden normalisiert oder verworfen, ohne übrige Schritte zu verlieren. Nicht berechtigte Schreibversuche werden sowohl in der Benutzeroberfläche als auch am Workspace-Endpunkt abgewiesen. Der Server filtert nicht veröffentlichte Taktiken für Viewer vor der Synchronisierung; der Spielerbereich kann sie deshalb weder anzeigen noch über Browserdaten rekonstruieren.

Automatisierte Tests prüfen Migration bestehender Taktiken, Normalisierung aller Elementtypen, Vorlagen, Zugriffsregeln, veröffentlichte Sichtbarkeit sowie Rendering- und Exportdaten. Die bestehenden Funktionen Notizspeicherung, KI-Erklärung und GIF-Export bleiben durch Regressionstests abgesichert.

## Abgrenzung

Nicht Bestandteil sind öffentliche Links, externe Spielerportale ohne Login, Echtzeit-Kollaboration mehrerer Trainer im selben Board oder Videoanalyse. Die Speicherung nutzt den vorhandenen gemeinsamen Workspace statt einer neuen Datenbanktabelle.
