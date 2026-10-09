# Ausführliche Trainingsanleitungen

In der Trainingsübersicht kann jeder Block über **Aufbau & Ablauf** geöffnet werden. Im Plan heißt die aufklappbare Anleitung **Übungsanleitung**; im Live-Modus **Vollständige Übungsanleitung**. Die Uhr und die wichtigsten Steuerungen bleiben vor der ausführlichen Beschreibung. Stationsrunden zeigen alle fünf Stationsanleitungen, weil die Gruppen parallel arbeiten.

Neue KI-Trainings müssen sechs vollständige Abschnitte liefern: Ziel, Aufbau, Ablauf, Umfang & Pausen, Coaching und Anpassung. Der Ablauf enthält mindestens zwei nummerierte Schritte. Die Anwendung validiert das Format; zu kurze oder überlange Antworten werden nicht als fertiger Plan angenommen. Bis zu 6000 Zeichen bleiben vollständig in Planung, Stationsdaten und Live-Durchführung erhalten. Der kompakte Freitag-Vertrag mit ausschließlich fünf KI-Stationen bleibt erhalten; Readiness, Aktivierung und Cooldown werden mit ausführlichen festen Anleitungen ergänzt.

Die Planung erhält `trainingResources.availableBaskets` (aktuell standardmäßig zwei). Der Prompt verlangt eine konkrete Korbbelegung, sichere Laufwege, Gruppengrößen, Partnerwechsel, Serien und Pausen innerhalb der Blockdauer. Bei gemeinsamem Korb müssen getrennte Zeitfenster und eine korbfreie Aufgabe beschrieben werden. Vorgaben bleiben Versuche pro Spieler; tatsächliche Treffer werden erst während des Trainings erfasst.

## Ergänzung für den 9. Oktober 2026

Das vorhandene Pre-Game-Stationstraining erhält beim Anzeigen gezielte ergänzende Anleitungen für die bekannten acht Blöcke. Die Ergänzung wird nur auf das Datum, den Stationsmodus und die passenden Übungsnamen angewendet. Bestehende Hinweise werden zusätzlich angezeigt; vollständige Beschreibungen werden bevorzugt. Wurfvorgaben werden aus den vorhandenen `shotTargets` gelesen. Fehlende Vorgaben werden als fehlend benannt, nicht erfunden oder als Ergebnis gespeichert. Diese Ergänzung verändert weder Trainingsdaten noch Anwesenheit, Messwerte oder laufende Timer.

Fünf Gruppen starten an fünf Stationen und rotieren nach jeder 15-Minuten-Runde. Station 1 (PnR-Fußarbeit) und Station 2 (Closeouts/Slides) benötigen keinen Korb. Station 4 (Catch-and-Shoot) nutzt Korb B. Station 3 (Paint-Abschlüsse) und Station 5 (Freiwürfe) teilen Korb A: eine Minute Wechsel, sieben Minuten Paint-Abschlüsse, sieben Minuten Freiwürfe. Die nicht werfende Gruppe übt korbfrei außerhalb der Lauf- und Wurfwege. Die gesamte Einheit bleibt bei 105 Minuten.

## Prüfung

`training-instructions-smoke.mjs` prüft die heutigen Ergänzungen, unveränderte Daten, gespeicherte Versuchsvorgaben, vollständige zukünftige Anleitungen, die Live-Ansicht und sicheres HTML. Die KI-Vertragstests prüfen vollständige Abschnitte, den nummerierten Ablauf, Textgrenzen und die Übernahme langer Texte bis in den gespeicherten Plan. `training-instructions-browser.mjs` prüft iPhone und 320 Pixel, die geteilte Korbbelegung, Stationsrunden, lange Texte und Offline-Reload ohne horizontalen Overflow oder Browserfehler.
