---
description: Startet die vier Prüf-Agenten (Fehler, Oberfläche, Sicherheit, Bedienbarkeit) für Origin CAD und fasst ihre Berichte für Noah zusammen.
---

Starte die vier Prüf-Agenten aus `.claude/agents/` **gleichzeitig** im Hintergrund:
`cad-pruefer-fehler`, `cad-pruefer-oberflaeche`, `cad-pruefer-sicherheit`, `cad-pruefer-bedienbarkeit`.
Falls nur bestimmte Bereiche genannt wurden ($ARGUMENTS), nur diese.

Gib jedem Agenten mit: heutiges Datum, aktuelle Version (`CACHE` in `sw.js`), was seit der letzten Prüfung neu ist (Git-Verlauf / `PROJEKT.md`), einen eigenen Scratchpad-Unterordner.

Wenn alle fertig sind: Funde gegenprüfen (selbst nachstellen), doppelte zusammenführen und für Noah kurz auf Deutsch zusammenfassen – Gesamturteil zuerst, dann nach Dringlichkeit. Eindeutige Fehler direkt beheben, testen (`node tests/check.cjs`) und live stellen; Änderungen an Bedienung oder Aussehen, die Geschmackssache sind, vorher mit Noah absprechen. Offene Punkte in `PROJEKT.md` unter „Ideen / offen“ eintragen.
