# Shaper Zeichenprogramm (Origin CAD)

Browser-CAD für den Schreiner, angelehnt an Softtech SPIRIT, mit Export für die Shaper Origin.
Eigenes Projekt (umgezogen aus dem Zuhause-Repository am 22.11.2026).
Live: https://noahfa.github.io/origin-cad/ (installierbar auf iPad/PC, läuft danach auch ohne Internet). Maße in mm.

## Dateien
- `index.html` – Oberfläche und Gestaltung
- `cad.js` – das ganze Programm
- `font.js` – Einstrich-Schrift (Hershey Sans 1-stroke, Hinweis zur Herkunft steht in der Datei)
- `view3d.js`, `vendor/earcut.min.js` (ISC) – 3D-Ansicht (mehrere Betrachter möglich: `CAD3D.create(canvas)`)
- `korpus.js` – Korpusplaner
- `vendor/clipper.js` – Clipper 6.4.2 (Boost-Lizenz): Versatz und Formen kombinieren
- `sw.js`, `manifest.webmanifest`, Symbole – App-Installation und Offline-Betrieb
- `tests/check.cjs` – Prüfung im echten Browser: `node tests/check.cjs [Foto-Ordner]`

**Bei jeder Änderung** `?v=` in `index.html` und `sw.js` (CACHE und ASSETS) gemeinsam hochzählen.

## Stand: Etappe 1 fertig
- Oberfläche: Menü oben, Werkzeuge links, Eigenschaften + Ebenen rechts, Befehlszeile + Status unten
- Zeichnen: Linie (L), Polylinie (PL), Rechteck (R), Kreis (K), Bogen 3 Punkte (B), Polygon (PG), Langloch (LL)
- Ändern: Verschieben (V), Kopieren (KO), Drehen (D), Spiegeln (SP), Versatz (VS), Abrunden (AR), Fasen (FA), Stutzen (ST), Reihe kopieren (RK), Zerlegen (ZL), Löschen (E)
- Maße: Bemaßung (BM, waagrecht/senkrecht automatisch), ausgerichtet (BA), Abstand messen (MS)
- Eingabe: `x,y`, `@dx,dy`, `@länge<winkel`, Zahl = Länge in Mausrichtung, Rechnen (`720-2*19`)
- Objektfang F3 (End, Mitte, Zentrum, Quadrant, Schnittpunkt), Raster F7, Ortho F8, Rasterfang F9
- Rückgängig/Wiederholen, Rahmenauswahl (links→rechts: ganz drin, rechts→links: berührt)
- Speichern/Öffnen als .json, Autosave im Browser

## Stand: Etappe 2 fertig (22.11.2026)
- **Fräsen je Objekt** (rechts unter „Fräsen“): Frästyp (Außen, Innen, Auf Linie, Tasche, Hilfslinie), Tiefe, Fräser-Ø frei eintippbar; leer = „Fräser-Standard“ der Zeichnung.
  „Automatisch“: geschlossen = Außen, liegt in einer anderen Kontur = Innen, offen = Auf Linie, Ebene „Hilfslinien“ = Hilfslinie.
- **Fräsvorschau F6**: Flächen nach Frästyp eingefärbt, gestrichelt der Weg der Fräsermitte, rot wo Material stehen bleibt (Fräser kommt nicht in die Ecke / passt nicht ins Loch). Warnung dazu auch in den Eigenschaften.
- **Verbinden (VB)**: lose Linien, Bögen und offene Polylinien werden zu Konturen (Toleranz 0,05 mm), Bögen bleiben echte Bögen.
- **Formen kombinieren**: Vereinigen (VE), Abziehen (AB), Schnittmenge (SM). Ergebnis sind Polylinien; Rundungen werden dabei auf 0,01 mm genau in kurze Stücke zerlegt.
- **Bohrbild (BB)**: Lochreihe 32, Topfband Ø35, Dübelbild, Lochkreis – mit Bezugspunkt (Ecke) und relativer Eingabe. Löcher werden als Tasche mit Tiefe angelegt.
- **Text / Gravur (TX)**: Einstrich-Schrift, Umlaute/ß/Ø, als „Auf Linie“ 1 mm tief.
- **App**: installierbar, offline nutzbar; iPad: zwei Finger = Zoom/Verschieben, Punkt wird beim Loslassen gesetzt, Knöpfe „Enter“ und „Esc“ an der Befehlszeile.

## Datenmodell (JSON)
`{ents:[...], layers:[{n,c,v}], cur, nid, def:{tool,depth}}` – Objekte:
- `line {a:[x,y], b}` · `pline {pts:[[x,y]...], closed, rect?, bl?}` · `circle {c, r}`
- `arc {c, r, a0, a1}` (Bogenmaß, gegen Uhrzeigersinn) · `slot {a, b, r}` · `dim {a, b, p, m:'h'|'v'|'al'}`
- `xline {p:[x,y], d:[dx,dy]}` – unendliche Hilfslinie
- `text {p:[x,y], s:'…', h, a}` – p = unten links, h = Höhe der Großbuchstaben, a = Winkel (Bogenmaß)
- `pline.bl`: Wölbung je Segment (wie DXF-„bulge“ = tan(Winkel/4), positiv = gegen Uhrzeigersinn); fehlt = alles gerade
- Jedes Objekt: `id`, `t` (Typ), `ly` (Ebene). Y zeigt nach oben.
- Fräsen (alle freiwillig): `ct` = `outside|inside|online|pocket|guide` (fehlt = Automatik), `cd` = Tiefe, `tool` = Fräser-Ø (fehlen = `def`)

## Stand: Etappe 3 fertig (22.11.2026)
- **SVG für die Origin** (Datei-Menü oder `EX`): Fenster mit Übersicht je Frästyp und Warnungen (offene Konturen, Fräser passt nicht, Ecken), wahlweise nur die Auswahl. Echte Bögen, mm, Shaper-Angaben und Farben je Pfad. Bemaßung und ausgeblendete Ebenen fehlen in der Datei.
- **Öffnen / Dazuladen** von JSON, SVG und DXF (auch per Ziehen aufs Fenster).
  SVG: Pfade, Grundformen, Gruppen mit Verschiebung/Drehung, Einheiten; Kurven werden fein zerlegt, Kreise und Bögen wiedererkannt; Shaper-Angaben werden übernommen. Schrift, Bilder und Verweise werden gemeldet und übersprungen.
  DXF (Textformat): LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, SPLINE, TEXT/MTEXT, Blöcke (INSERT), Ebenen, Einheit ($INSUNITS). Anderes wird gemeldet.
- **Als DXF speichern** (für SPIRIT und andere CAD-Programme).
- **Vorlagen** (`VO`): mitgelieferte (Topfband mit Dübellöchern, Schrankseite System 32, Griffmulde …) und eigene („Als Vorlage speichern“, liegen im Browser dieses Geräts unter `origincad.tpl`).
- **Skalieren** (`SK`), **Topfband mit Dübellöchern** (Blum 45/9,5 · Hettich/Salice 48/6 · Grass 42/11) im Bohrbild.
- **Abrunden/Fasen** an Rechteck und Polylinie: die Kontur bleibt eine Kontur (wird nicht mehr zerlegt).
- **Bögen wiedererkennen**: nach Vereinigen/Abziehen/Schnittmenge, Versatz und Import werden Rundungen wieder echte Bögen bzw. Kreise.

## Danach ergänzt
- **Winkelfang** (F10, Knopf „WINKEL“ unten, Schritt 90/45/30/15°): Richtung rastet beim Zeichnen ein, grüne Hilfslinie; Länge tippen geht in die gerastete Richtung. Standard an, 45°.

- **Strg + Buchstabe** (Mac/iPad ⌘): L Linie, P Polylinie, R Rechteck, K Kreis, B Bogen, G Text/Gravur, H Bohrbild, V Verschieben, C Kopieren, D Drehen, I Spiegeln, U Abrunden, F Fasen, X Stutzen, M Bemaßung, J Verbinden, E SVG-Export, O Öffnen, S Speichern, 0 Zoom alles. Tabelle `CTRL` in cad.js. Strg+T/N/W/Q sind vom Browser belegt. Getippte Kürzel gehen weiter.
- **Knöpfe Rückgängig/Wiederholen** in der Menüleiste.

- **Zeichenbefehle bleiben aktiv** (L, PL, R, K, B, PG, LL, BM, BA, MS): nach dem Fertigstellen startet derselbe Befehl neu, Esc oder Enter ohne Punkt beendet. Liste `REPEAT` in cad.js.

- **Auswahlmodus** mit Shift+A (oder Pfeil oben in der Werkzeugleiste): beendet den laufenden Befehl, danach Objekte anklicken/Rahmen.

- **Hilfslinien**: Shift+H / F2 / Knopf „HILFSLINIE“ schaltet die aktuelle Ebene zwischen „Hilfslinien“ und der vorigen um. `HL` = unendliche Hilfslinie (Typ `xline {p,d}`, d = Richtung, Länge 1); fangbar, Versatz geht, nicht in SVG, in DXF als XLINE.

- **3D-Ansicht** (F4, Knopf „3D“, `DD`): `build3D()` in cad.js zerlegt die Platte in Schichten je Frästiefe (Außenkonturen minus alle Fräsungen, die mindestens so tief sind), `view3d.js` zeigt sie mit eigenem kleinen WebGL-Betrachter (Dreiecke über `vendor/earcut.min.js`). Plattenstärke `def.thick` (Standard 19). Innen-Ausschnitt mit Tiefe < Stärke = nur Nut in Fräserbreite.

## Korpusplaner (22.11.2026)
Eigener Bereich (Knopf „Korpusplaner“ in der Menüleiste), Datei `korpus.js`. Daten in der Zeichnung unter `S.korpus` (wird mitgespeichert, Rückgängig läuft über das normale Undo).
- **Aufbau:** links Maße, Mitte Vorderansicht (Böden/Mittelwände anklicken, ziehen, löschen, per Knopf dazusetzen), rechts 3D, das mitläuft.
- **Konstruktion (Noahs Vorgaben):** Seiten durchgehend, Boden/Deckel dazwischen · 19 mm · Rückwand 8 mm in Nut 10 tief, 20 von hinten · Türen aufschlagend, 3 mm Fuge rundum · Dübel Ø8, 32 vom Rand, 32er-Raster, 12 tief in der Fläche · Lochreihe Ø5, 37 von vorn/hinten, 13 tief · Topf Ø35 Blum 21,5/100 mit Dübellöchern 45/9,5 und Montageplatten-Löchern · Sockel 100 hoch, 50 zurück.
- **Annahmen von Claude (noch nicht von Noah bestätigt):** Einlegeboden 2 mm schmaler und 10 mm kürzer · Rückwand 1 mm Luft in der Nut · Schubkasten: 16 mm Zarge, 13 mm Luft je Seite, Höhe = Front − 40, Tiefe auf 50er-Maß, Boden untergeschraubt · Sockel: 2 Längsblenden + Querstücke.
- **Daten:** `{t,rw,nt,na,fuge,sockel,sh,sr,lr,dub,topf,nut,cabs:[{b,h,d,mw:[x],fb:[{x,y}],eb:[{x,y}],front:'n|l|r|2|s',sn,nm,nf,ne}]}` – x/y ab linker unterer Außenecke des Korpus, y = Unterkante des Bodens.
- **Teile:** `parts()` liefert je Platte Maße, Lage im Raum (o,u,v) und Bohrungen/Nuten in Zeichnungs-Koordinaten der Bohrseite (Innenseite). Bohrungen von der anderen Seite (Mittelwand) haben `back:true` und landen auf der Ebene „Rückseite“ (wird nicht gefräst). Stirnkanten-Dübel sind nur als Hilfsstriche angezeichnet.
- **Ausgabe:** Stückliste (Drucken, CSV, CSV für CutList Optimizer – Spalten noch nicht am echten Programm geprüft), SVG je Teil, alle Teile ins Zeichenprogramm.
- **Offen:** Fronten mischen (Tür + Schubkasten in einem Korpus), Griffe, Schubkasten-Bohrbilder für Auszüge, Kantenband-Zugabe, 3D in eigenem Browserfenster (zweiter Bildschirm).

## Ideen / offen
- An der echten Origin prüfen: Wird die SVG mit Frästyp, Tiefe und Fräser-Ø richtig erkannt? (Format nach Shaper-Vorgabe gebaut, aber noch nicht an der Maschine getestet.)
- Stutzen zerlegt Polylinien noch in Einzelstücke (danach `VB`)
- Eigene Vorlagen zwischen Geräten austauschen (bisher: Zeichnung als .json speichern und „Dazuladen“)
- Drucken / PDF mit Bemaßung

## Shaper-SVG-Format (so wird ausgegeben)
- Namespace im `<svg>`: `xmlns:shaper="http://www.shapertools.com/namespaces/shaper"`
- Pro Pfad: `shaper:cutType="outside|inside|online|pocket|guide"`, `shaper:cutDepth="6mm"`,
  `shaper:toolDia="6mm"`, `shaper:cutOffset="0mm"`
- Farbcodierung zusätzlich: Außen = schwarz gefüllt, Innen = weiß gefüllt + schwarzer Rand,
  Auf Linie = nur Linie, Tasche = grau, Hilfslinie = blau
- Maßeinheit im SVG in mm angeben (width/height mit "mm", viewBox passend), Y-Achse umdrehen
