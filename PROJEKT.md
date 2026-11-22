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
- `raum.js` – 3D-Modus
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
- **Annahmen von Claude (noch nicht von Noah bestätigt):** Einlegeboden 2 mm schmaler und 10 mm kürzer · Rückwand 1 mm Luft in der Nut · Sockel: 2 Längsblenden + Querstücke.
- **Bodenträger = Häfele „Jimmy“ 282.25.716** (Noah, 22.11.2026): Bohr-Ø 4. Bohrtiefe 10 und Lochmitte 2 mm unter der Boden-Unterkante sind Claudes Annahmen (Datenblatt war nicht abrufbar), im Planer einstellbar (`btD`, `btT`, `btA`). Montageplatten der Topfbänder bleiben Ø5.
- **Systemverbinder = Würth SV 20 E** (Noah, 22.11.2026), zusätzlich zu den Dübeln: Gehäuse Ø20, 14 tief, Mitte 9,5 von der Stirnkante (Werte für 19 mm aus dem Würth-Shop; 16 mm: 12,5/8) in Boden (oben), Deckel (unten) und festen Böden (unten – deren Zeichnung zeigt die Unterseite); Systembolzen in Ø5 der Seite/Mittelwand. Claudes Annahmen: Bolzenloch 13 tief, in Plattenmitte (`svO` = 0), 37 von vorn und hinten, 2 Verbinder je Stoß; Dübel rücken dann auf 101 von vorn/hinten (+ Mitte ab 300). Mittelwand ↔ Boden/Deckel bleibt nur gedübelt. Felder `sv, svT, svX, svO, svB`.
- **Kleiderstange** (`cabs[].ks:[{x,y}]`, y = Stangenmitte; Ø `ksD` = 25): je Fach, Länge = Fachbreite − 4, sitzt in der Mitte der Tiefe. Lagermitte an Seite/Mittelwand nur als Hilfskreuz angezeichnet (Lager-Typ unbekannt). In der Stückliste als „Stange“, ohne SVG.
- **Material:** je Zeile wählbar für Korpus (`matK`), Fronten (`matF`), Rückwand (`matR`) aus der Liste `MATS` in korpus.js (beispielhafte EGGER-Dekore mit ungefähren Bildschirmfarben, '' = neutral). Wirkt auf 3D, Vorderansicht und Stückliste/CSV.
- **Maßketten in der Vorderansicht** (`dims()`), immer sichtbar: Korpusbreiten + Gesamtbreite, Sockel/Korpus/Gesamthöhe, je Fach lichte Breite und lichte Höhen, Stangenhöhe, Frontmaße der Schubkästen, Tiefe im Korpus-Titel.
- **Zuschnittplan** (`nest()`): je Material/Stärke Teile in Streifen auf Rohplatten (`plL` 2800 × `plB` 2070, `kerf` 4, `rand` 10); Länge der Teile läuft in Plattenlänge, gedreht wird nur bei Uni-Dekoren und nur wenn es sonst nicht passt. Kein optimierender Algorithmus (First-Fit nach Höhe sortiert). Fenster mit Platten als Bild, druckbar.
- **Fronten** über `fronts(c,k)`: `n` offen, `l`/`r`/`2` Türen, `s` nur Schubkästen, `ml`/`mr`/`m2` = ein Schubkasten oben (`sfh` Fronthöhe, Standard 140) + Tür(en). Bei `m*` keine Mittelwände, Böden bleiben unter dem Schubkasten.
- **Griffe** (`griff:'n'|'b'`, `grA` Lochabstand 128, `grR` 50 von der Türkante, `grO` 80 von oben bzw. beim Hängeschrank von unten): Bügelgriff, zwei durchgehende Löcher Ø5; Tür senkrecht an der Öffnungsseite, Schubkasten quer mittig.
- **Kantenband** (`kb` mm, 0 = ohne): Fronten rundum, Seiten/Mittelwände/Böden vorn, Schubkastenteile oben. Zuschnittmaß `cW/cH` = Fertigmaß − Kante; Stückliste, CSV und Zuschnittplan rechnen mit dem Zuschnittmaß, Zeichnungen/SVG bleiben Fertigmaß.
- **Höhe über Boden** je Korpus (`zo`, 0 = steht auf Boden/Sockel) für Hängeschränke; Sockel nur unter stehenden Korpussen (`sockelRuns`). **Schranktypen** (`TYPEN`) belegen Maße vor.
- **Schubkästen = Holzschubkasten auf Blum TANDEM 560H** (Noah, 22.11.2026; Maße aus Blum-Unterlagen): Innenbreite = lichte Weite − 42 (Seiten 16 mm → außen LW − 10), Länge = Nennlänge − 10, Einbautiefe ≥ Nennlänge + 3, Boden eingenutet und 13 zurückgesetzt, unten 14 / oben 7 Luft. Claudes Annahmen dabei: Nut 6 tief, Hinterstück steht auf dem Boden (keine Ausklinkung nötig), 9 mm zusätzliche Luft in der Höhe, Hakenbohrung Ø6×10 nur angezeichnet (Lage 7/7 nicht bestätigt), Bohrungen für die Korpusschienen fehlen.
- **Daten:** `{t,rw,nt,na,fuge,sockel,sh,sr,lr,dub,topf,nut,cabs:[{b,h,d,mw:[x],fb:[{x,y}],eb:[{x,y}],front:'n|l|r|2|s',sn,nm,nf,ne}]}` – x/y ab linker unterer Außenecke des Korpus, y = Unterkante des Bodens.
- **Teile:** `parts()` liefert je Platte Maße, Lage im Raum (o,u,v) und Bohrungen/Nuten in Zeichnungs-Koordinaten der Bohrseite (Innenseite). Bohrungen von der anderen Seite (Mittelwand) haben `back:true` und landen auf der Ebene „Rückseite“ (wird nicht gefräst). Stirnkanten-Dübel sind nur als Hilfsstriche angezeichnet.
- **Ausgabe:** Stückliste (Drucken, CSV, CSV für CutList Optimizer – Spalten noch nicht am echten Programm geprüft), SVG je Teil, alle Teile ins Zeichenprogramm.
- **Offen:** Fronten mischen (Tür + Schubkasten in einem Korpus), Griffe, Schubkasten-Bohrbilder für Auszüge, Kantenband-Zugabe, 3D in eigenem Browserfenster (zweiter Bildschirm).

- **Bemaßung erweitert:** `BK` Kettenmaß, `BR` Radius/Durchmesser (`dim {c,r,p,m:'rad'|'dia'}`), **Drucken/PDF** (`PR`, Datei-Menü): `buildPrintSVG()` schwarz auf weiß, A4 eingepasst.

## Oberfläche aufgeräumt (22.11.2026)
- Werkzeugleiste zweispaltig; seltene Befehle (`less:1` in `CMDS`: Polygon, Reihe, Zerlegen, Fasen, Bemaßung ausgerichtet, Messen, Schnittmenge, Export, 3D) nur noch im Menü und per Kürzel.
- Oben rechts die drei Ergebnis-Knöpfe: Fräsvorschau, 3D, SVG für Origin (unter 1180 px Breite stattdessen in der Statusleiste, Klasse `mob`).
- Statusleiste nur Zeichenhilfen, ausgeschrieben (Objektfang, Winkelfang, Nur gerade, Hilfslinien zeichnen, Raster, Rasterfang).
- Rechts: Spickzettel entfernt (steht in F1), Farblegende nur bei eingeschalteter Fräsvorschau. Bedienhinweis auf der Zeichenfläche verschwindet nach der ersten Benutzung.
- Korpusplaner: Korpus-Reiter (1, 2, … + Korpus), aufklappbare Abschnitte (`openSec`); offen sind nur „Korpus“ und „Innenaufteilung“, eingeklappt mit Kurzinfo: Platte und Material, Verbindungen, Beschläge, Sockel.

## 3D-Modus (22.11.2026)
Eigener Bereich (Knopf „3D-Modus“), Datei `raum.js`, Daten in `S.raum = {bodies:[…], nid}`.
- **Körper:** `{id,name,kind:'box'|'ext',L,B,H,poly?,o,u,v,mat}` – Grundfläche lokal X/Y (bei `ext` als `poly {outer,holes}` aus der Zeichnung), Höhe H in Richtung u×v; nur 90°-Lagen. `box(b)` = umschließender Quader im Raum.
- **Anlegen:** Quader über Maße · Kontur aus der Zeichnung hochziehen (`contours()` in cad.js: gewählte oder alle geschlossenen Konturen, Innenkonturen werden Löcher) · Schrank aus dem Korpusplaner holen (als einfache Quader, Bohrungen bleiben im Planer).
- **Bedienung:** anklicken = wählen, gewählten Körper ziehen = in der Ebene verschieben, Shift = Höhe; Einrasten an Flächen anderer Körper und am Boden (`snap`); Pfeiltasten 1 mm (Shift 10), Bild↑/↓ Höhe; drehen in 90°-Schritten; Lage/Maße/Material über Felder.
- **Maße im Bild** (`drawOver`, eigene Zeichenfläche über dem 3D-Bild): Gesamtmaße und Maße des gewählten Körpers.
- **Ausgabe:** Stückliste (größtes Maß = Länge, kleinstes = Stärke; Formteile mit umschließendem Rechteck), Zuschnittplan über `KORPUS.nestOf`, Bild speichern (PNG), Drucken mit Bild.
- **Grundkörper** (`PRIM`, `kind`): `box` Quader, `sph` Kugel, `cyl` Zylinder, `cone` Kegel (`D2` = Ø oben), `tor` Torus (L = Außen-Ø, H = Rohr-Ø), `plane` Ebene (H = 0). Runde Körper als Dreiecksnetz (`trisOf`, im Betrachter `part.tris`).
- **Bedienung (überarbeitet):** kein Moduswechsel mehr. Körper anklicken = wählen, sofort ziehen = verschieben. Am gewählten Körper Ziehpfeile je Fläche (`handles`, nur zur Kamera gewandte Flächen, kein Pfeil nach unten bei Körpern auf dem Boden); Pfeil ziehen oder anklicken → Maßfeld direkt an der Fläche (`#rmfloat`): Zahl = neues Maß, `+/-Zahl` = um so viel weiter → `resize(b,face,d)`. Aktionsleiste unten im Bild (`#rmctx`): Drehen, Kippen, Seitlich, Auf den Boden, Kopieren (Strg+D), Löschen. Bodenraster (`model.grid`). Leerer Raum zeigt Startknöpfe (`#rmempty`). Einrasten nur an Körpern in der Nähe, Abstand ~10 Bildpunkte (`tolPx`). Quader/Ebene in jede Richtung (Ebene wird beim Hochziehen zum Quader), Zylinder/Kegel/Formteil in der Höhe, runde Körper ändern den Durchmesser um die Mitte. Rastet an Flächen anderer Körper ein.
- **Bewusst nicht:** Körper verschneiden, schräge Drehungen, automatische Verbinder.
- Der 3D-Betrachter (`view3d.js`) hat dafür Haken (`down/move/up/draw`), `project()`, `ray()`, `shot()`.

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
