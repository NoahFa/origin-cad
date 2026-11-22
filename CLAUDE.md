# Origin CAD – Hinweise für Claude

Zeichenprogramm (Browser-CAD) für Noah, Schreiner, mit Ausgabe für die Shaper Origin. Kein Build-Schritt, alles liegt im Wurzelordner.
Live über GitHub Pages: https://noahfa.github.io/origin-cad/ (Push auf `main` veröffentlicht in ca. 1 Minute).

## Vor jeder Änderung lesen
- `PROJEKT.md` – Stand, Dateien, Datenmodell, Shaper-SVG-Format, offene Punkte. Nach jeder Etappe aktualisieren.

## Regeln
- Bestehendes Programm weiterentwickeln, nicht neu bauen. Gestaltung und Befehlskürzel erhalten.
- Bei Änderungen an Dateien die Versionsnummer `?v=` in `index.html`, `manifest.webmanifest` und `sw.js` (CACHE und ASSETS) gemeinsam hochzählen, sonst sehen iPad und PC den alten Stand.
- Vor dem Hochladen `node tests/check.cjs` laufen lassen (braucht Playwright); neue Funktionen dort ergänzen.
- Gespeicherte Zeichnungen (.json) müssen weiter lesbar bleiben; neue Felder nur freiwillig ergänzen.
- Das Repository ist öffentlich: keine Passwörter, E-Mail-Adressen oder Kundendaten einchecken.
- Fertige, geprüfte Änderungen darf Claude direkt auf `main` live stellen.
- Noah ist kein Programmierer: Antworten auf Deutsch, kurz, ohne Fachchinesisch, Ergebnis vor Erklärung.
