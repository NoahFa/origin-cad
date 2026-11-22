// Prüft das Zeichenprogramm im echten Browser: Start, Fräsen, Verbinden, Formen kombinieren, Bohrbilder, Text, SVG/DXF, Vorlagen.
// Aufruf: node tests/check.cjs   (optional: Ordner für Fotos als 1. Angabe)
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const ROOT=path.join(__dirname,'..'),SHOTS=process.argv[2]||null;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const p=path.join(ROOT,f);if(!p.startsWith(ROOT)||!fs.existsSync(p)){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))});
let fails=0;const ok=(c,t,extra='')=>{console.log((c?'  ok   ':'  FEHLER ')+t+(c?'':' '+extra));if(!c)fails++};
const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;
(async()=>{await new Promise(r=>srv.listen(0,r));const url=`http://localhost:${srv.address().port}/`;
 const b=await chromium.launch();const errs=[];
 const open=async(vp)=>{const ctx=await b.newContext({viewport:vp,serviceWorkers:'block',acceptDownloads:true});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|Failed to load resource/.test(m.text()))errs.push(m.text())});
  await p.addInitScript(()=>{delete window.showSaveFilePicker});await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());await p.goto(url);await p.waitForFunction(()=>window.__cad);return p};
 const p=await open({width:1440,height:900});
 const C=(...a)=>p.evaluate(a=>{for(const t of a){__cad.inp.value=t;__cad.onEnter()}},a);
 const ents=()=>p.evaluate(()=>JSON.parse(JSON.stringify(__cad.S.ents)));
 const fresh=async()=>{await p.evaluate(()=>{document.getElementById('newB').click()})};
 const areaOf=id=>p.evaluate(id=>__cad.areaOf(id),id);
 const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await p.evaluate(()=>__cad.zoomAll());await p.screenshot({path:path.join(SHOTS,n+'.png')})}};

 console.log('Start');
 let E=await ents();ok(E.length===7,'Beispielzeichnung geladen');
 let cuts=await p.evaluate(()=>__cad.S.ents.filter(e=>e.t!=='dim').map(e=>__cad.cutOf(e).t));
 ok(cuts.join()==='outside,inside,inside,inside','Automatik: Front = Außen, Topfbohrungen und Langloch = Innen',cuts.join());
 await p.evaluate(()=>__cad.act('cam'));await shot('01-fraesvorschau-beispiel');

 console.log('Fräserbahn');
 await fresh();await C('R','0,0','200,100','R','50,30','@60,40','K','150,50','2','K','30,80','10');
 let r=await p.evaluate(()=>__cad.S.ents.map(e=>{const m=__cad.camOf(e),c=__cad.cutOf(e);return{t:c.t,left:m.left.length,fail:m.fail,center:m.center.length}}));
 ok(r[0].t==='outside'&&r[0].left===0&&r[0].center===1,'Außenkontur: Bahn außen herum, kein Rest');
 ok(r[1].t==='inside'&&r[1].left===4,'Innenausschnitt eckig mit Fräser Ø6: 4 Ecken bleiben stehen',JSON.stringify(r[1]));
 ok(r[2].fail,'Loch Ø4 mit Fräser Ø6: passt nicht');
 ok(!r[3].fail&&r[3].left===0,'Loch Ø20 mit Fräser Ø6: passt');
 // Fräser-Ø am Objekt ändern
 await p.evaluate(()=>{const e=__cad.S.ents[2];__cad.sel.clear();__cad.sel.add(e.id);__cad.updProps();const el=document.getElementById('c_tool');el.value='3';el.dispatchEvent(new Event('change'))});
 r=await p.evaluate(()=>{const e=__cad.S.ents[2];return{tool:e.tool,fail:__cad.camOf(e).fail}});ok(r.tool===3&&!r.fail,'Fräser Ø3 am Loch eingetragen: passt jetzt');
 await p.evaluate(()=>{const el=document.getElementById('c_t');el.value='pocket';el.dispatchEvent(new Event('change'));const d=document.getElementById('c_d');d.value='12,5';d.dispatchEvent(new Event('change'))});
 r=await p.evaluate(()=>__cad.cutOf(__cad.S.ents[2]));ok(r.t==='pocket'&&r.d===12.5,'Frästyp Tasche und Tiefe 12,5 gespeichert');
 await p.evaluate(()=>{const el=document.getElementById('d_tool');el.value='8';el.dispatchEvent(new Event('change'))});
 r=await p.evaluate(()=>[__cad.cutOf(__cad.S.ents[0]).tool,__cad.cutOf(__cad.S.ents[2]).tool]);ok(r[0]===8&&r[1]===3,'Fräser-Standard 8 gilt für alles ohne eigene Angabe');
 await p.keyboard.press('Control+z');r=await p.evaluate(()=>__cad.S.def.tool);ok(r===6,'Rückgängig stellt den Standard wieder her');
 await shot('02-fraeserbahn-ecken');

 console.log('Verbinden');
 await fresh();await C('L','0,0','100,0','100,60','','B','100,60','50,90','0,60','L','0,60','0,0','');
 await p.evaluate(()=>{__cad.act('alle')});await C('VB');E=await ents();
 ok(E.length===1&&E[0].t==='pline'&&E[0].closed&&E[0].bl&&E[0].bl.filter(v=>Math.abs(v)>1e-6).length===1,'3 Linien + 1 Bogen werden eine geschlossene Kontur mit Bogen',JSON.stringify(E).slice(0,200));
 let A=await areaOf(E[0].id);const seg=(()=>{const R=(50*50+30*30)/(2*30),th=2*Math.asin(50/R);return R*R/2*(th-Math.sin(th))})();
 ok(near(A,6000+seg,1),'Fläche stimmt (Rechteck + Bogenstück)',A+' / '+(6000+seg));
 ok((await p.evaluate(()=>__cad.cutOf(__cad.S.ents[0]).t))==='outside','verbundene Kontur wird automatisch Außen');
 await C('VS','5');await p.evaluate(()=>{const e=__cad.S.ents[0];__cad.adv({e,p:[50,0]});__cad.adv({p:[50,20]})});await C('');
 E=await ents();ok(E.length===2&&near(await areaOf(E[1].id),(await p.evaluate(()=>__cad.areaOf(__cad.S.ents[0].id,-5))),1),'Versatz nach innen bei Kontur mit Bogen');
 await fresh();await C('L','0,0','50,0','','L','80,0','120,0','');await p.evaluate(()=>__cad.act('alle'));await C('VB');E=await ents();ok(E.length===2&&E.every(e=>e.t==='line'),'Linien mit Lücke bleiben getrennt');

 console.log('Formen kombinieren');
 const two=async()=>{await fresh();await C('R','0,0','100,100','K','100,50','30')};
 await two();await p.evaluate(()=>__cad.act('alle'));await C('VE');E=await ents();
 ok(E.length===1&&near(await areaOf(E[0].id),10000+Math.PI*900/2,2),'Vereinigen: Rechteck + halber Kreis');
 await two();await p.evaluate(()=>{__cad.sel.add(__cad.S.ents[0].id)});await C('AB');await p.evaluate(()=>{__cad.sel.add(__cad.S.ents[1].id)});await C('');E=await ents();
 ok(E.length===1&&near(await areaOf(E[0].id),10000-Math.PI*900/2,2),'Abziehen: Rechteck minus halber Kreis');
 await two();await p.evaluate(()=>__cad.act('alle'));await C('SM');E=await ents();
 ok(E.length===1&&near(await areaOf(E[0].id),Math.PI*900/2,2),'Schnittmenge: halber Kreis');
 await fresh();await C('R','0,0','100,100','K','50,50','20');await p.evaluate(()=>{__cad.sel.add(__cad.S.ents[0].id)});await C('AB');await p.evaluate(()=>{__cad.sel.add(__cad.S.ents[1].id)});await C('');E=await ents();
 cuts=await p.evaluate(()=>__cad.S.ents.map(e=>__cad.cutOf(e).t));ok(E.length===2&&cuts.join()==='outside,inside','Abziehen in der Mitte ergibt Außenkontur + Innenausschnitt',cuts.join());
 await p.keyboard.press('Control+z');E=await ents();ok(E.length===2&&E[1].t==='circle','Rückgängig holt den Kreis zurück');
 await shot('03-formen');

 console.log('Bohrbilder');
 await fresh();await C('R','0,0','400,600','BB','L','5','5','32','13');await p.evaluate(()=>{__cad.adv({p:[0,0]})});await C('@37,64','90');E=await ents();
 let H=E.filter(e=>e.t==='circle');ok(H.length===5&&near(H[0].c[0],37)&&near(H[0].c[1],64)&&near(H[4].c[1],64+4*32)&&H.every(h=>h.r===2.5&&h.ct==='pocket'&&h.cd===13),'32er-Lochreihe: 5 × Ø5, 37 von der Kante, nach oben');
 ok(H.every(h=>h.tool===3)&&!(await p.evaluate(()=>__cad.camOf(__cad.S.ents[1]).fail)),'Löcher bekommen einen passenden Fräser (Ø3)');
 await C('BB','T','35','13','O');await p.evaluate(()=>{__cad.adv({p:[400,0]})});await C('@-21.5,100','@-21.5,500','');E=await ents();
 H=E.filter(e=>e.t==='circle'&&e.r===17.5);ok(H.length===2&&near(H[0].c[0],378.5)&&near(H[1].c[1],500)&&H[0].cd===13&&H[0].tool===undefined,'Topfband Ø35: 2 Stück, 21,5 von der Kante');
 await C('BB','D','8','3','32','12','','200,300','0');E=await ents();H=E.filter(e=>e.r===4);ok(H.length===3&&near(H[2].c[0],264)&&H[0].cd===12,'Dübelbild: 3 × Ø8 im Abstand 32');
 await C('BB','K','6','5','10','200,450','40');E=await ents();H=E.slice(-6);ok(H.every(h=>near(Math.hypot(h.c[0]-200,h.c[1]-450),40))&&near(H[0].c[1],490),'Lochkreis: 6 Löcher auf Radius 40');
 await shot('04-bohrbilder');

 console.log('Text');
 await C('TX','Küche Tür 1 – Ø35','20','40,560');E=await ents();const T=E[E.length-1];
 ok(T.t==='text'&&T.s==='Küche Tür 1 – Ø35'&&T.h===20&&T.ct==='online'&&T.cd===1,'Text als Gravur angelegt (Umlaute, Ø)');
 r=await p.evaluate(id=>{const e=__cad.S.ents.find(x=>x.id===id),b=__cad.bbox([e]);return{b,band:__cad.camOf(e).band.length}},T.id);
 ok(near(r.b[3]-560,20*914/662,6)&&r.b[2]-r.b[0]>150&&r.band>5,'Schrifthöhe und Breite stimmen, Fräsbahn vorhanden',JSON.stringify(r));
 await p.evaluate(id=>{__cad.sel.clear();__cad.sel.add(id);__cad.updProps();const el=document.querySelector('#props input[data-i="0"]');el.value='Neu';el.dispatchEvent(new Event('change'))},T.id);
 ok((await ents()).pop().s==='Neu','Text rechts in den Eigenschaften änderbar');
 await p.evaluate(()=>__cad.sel.clear());await shot('05-text');

 console.log('Speichern und Laden');
 const json=await p.evaluate(()=>JSON.stringify({app:'OriginCAD',v:2,...__cad.S}));
 await p.setInputFiles('#file',{name:'Test.json',mimeType:'application/json',buffer:Buffer.from(json)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Test.json'));
 ok(JSON.stringify(await ents())===JSON.stringify(JSON.parse(json).ents),'Datei mit Fräs-Angaben kommt unverändert zurück');
 const old=JSON.stringify({ents:[{id:1,t:'line',ly:'0',a:[0,0],b:[10,0]}],layers:[{n:'0',c:'#c9ced6',v:true}],cur:'0',nid:2});
 await p.setInputFiles('#file',{name:'Alt.json',mimeType:'application/json',buffer:Buffer.from(old)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Alt.json'));
 r=await p.evaluate(()=>__cad.cutOf(__cad.S.ents[0]));ok(r.t==='online'&&r.tool===6&&r.d===6,'Alte Zeichnung aus Etappe 1 lässt sich öffnen');

 console.log('Abrunden, Bögen, Skalieren');
 await fresh();await C('R','0,0','200,100','AR','10');await p.evaluate(()=>{const e=__cad.S.ents[0];__cad.adv({e,p:[100,0]});__cad.adv({e,p:[200,50]})});E=await ents();
 ok(E.length===1&&E[0].t==='pline'&&E[0].closed&&E[0].bl&&near(await areaOf(E[0].id),20000-(100-Math.PI*25),0.5),'Abrunden am Rechteck: bleibt eine geschlossene Kontur',JSON.stringify(E).slice(0,300));
 await two();await p.evaluate(()=>__cad.act('alle'));await C('VE');E=await ents();
 ok(E[0].pts.length<=10&&E[0].bl&&E[0].bl.some(v=>Math.abs(v)>0.1),'Vereinigen: Rundung ist wieder ein echter Bogen ('+E[0].pts.length+' Punkte)');
 await fresh();await C('K','0,0','30','K','200,0','30');await p.evaluate(()=>__cad.act('alle'));await C('VE');E=await ents();ok(E.length===2&&E.every(e=>e.t==='circle'&&near(e.r,30,0.01)),'Getrennte Kreise bleiben Kreise');
 await fresh();await C('R','0,0','100,50','K','50,25','10');await p.evaluate(()=>__cad.act('alle'));await C('SK','0,0','2');E=await ents();
 ok(near(E[0].pts[2][0],200)&&near(E[0].pts[2][1],100)&&near(E[1].r,20)&&near(E[1].c[0],100),'Skalieren × 2');

 console.log('Topfband mit Dübellöchern');
 await fresh();await C('BB','T','35','13','B','L','','21.5,100','');E=await ents();
 ok(E.length===3&&E[1].r===4&&near(E[1].c[0],31)&&near(Math.abs(E[1].c[1]-E[2].c[1]),45)&&E[1].cd===11,'Blum 45/9,5: Topf + 2 Dübellöcher Ø8',JSON.stringify(E.map(e=>e.c)));

 console.log('SVG für die Origin');
 await fresh();await C('R','0,0','400,600','K','21.5,100','17.5','LL','360,250','360,350','20','L','50,50','150,50','','TX','AB','20','50,500','BM','0,0','400,0','200,-40');
 await p.evaluate(()=>{const S=__cad.S;S.ents[1].ct='pocket';S.ents[1].cd=13;S.ents[2].tool=8;S.ents[0].cd=19;__cad.act('alle');__cad.sel.clear()});
 let svg=await p.evaluate(()=>__cad.buildSVG(__cad.exportList(false)));
 ok(/xmlns:shaper="http:\/\/www\.shapertools\.com\/namespaces\/shaper"/.test(svg)&&/width="400mm" height="600mm" viewBox="0 0 400 600"/.test(svg),'Kopf: Shaper-Namensraum, Größe in mm',svg.slice(0,400));
 const paths=[...svg.matchAll(/<path [^>]*>/g)].map(m=>m[0]);const typ=t=>paths.filter(x=>x.includes(`shaper:cutType="${t}"`));
 ok(paths.length===5&&typ('outside').length===1&&typ('pocket').length===1&&typ('inside').length===1&&typ('online').length===2,'5 Pfade (Bemaßung fehlt): 1 Außen, 1 Tasche, 1 Innen, 2 Auf Linie',paths.map(x=>/cutType="(\w+)"/.exec(x)[1]).join());
 ok(typ('outside')[0].includes('shaper:cutDepth="19mm"')&&typ('outside')[0].includes('fill="#000000"')&&typ('pocket')[0].includes('shaper:cutDepth="13mm"')&&typ('pocket')[0].includes('fill="#7F7F7F"')&&typ('inside')[0].includes('shaper:toolDia="8mm"')&&typ('inside')[0].includes('fill="#FFFFFF"'),'Tiefe, Fräser-Ø und Farben je Frästyp');
 ok(typ('outside')[0].includes('d="M0 600L400 600L400 0L0 0Z"'),'Rechteck: Y-Achse gedreht',typ('outside')[0]);
 ok(/A17\.5 17\.5 0 0 0 /.test(typ('pocket')[0])&&/A10 10 0 0 0 /.test(typ('inside')[0]),'Kreis und Langloch als echte Bögen');
 // im Browser nachmessen: stimmt die gezeichnete Form?
 r=await p.evaluate(svg=>{const d=document.createElement('div');d.innerHTML=svg.replace(/<\?xml[^>]*>/,'');document.body.appendChild(d);const ps=[...d.querySelectorAll('path')].map(q=>{const b=q.getBBox();return[b.x,b.y,b.width,b.height,q.getTotalLength()]});d.remove();return ps},svg);
 ok(near(r[1][0],4)&&near(r[1][1],600-117.5)&&near(r[1][2],35)&&near(r[1][4],Math.PI*35,0.2)&&near(r[2][4],200+Math.PI*20,0.2),'Browser misst: Topf Ø35 an der richtigen Stelle, Umfänge stimmen',JSON.stringify(r));
 // wieder einlesen
 r=await p.evaluate(svg=>{const x=__cad.importSVG(svg);return x.ents},svg);
 const back=r.map(e=>e.t+':'+(e.ct||'')).join();
 ok(r.length>=5&&r[0].t==='pline'&&r[0].ct==='outside'&&r[0].cd===19&&r.some(e=>e.t==='circle'&&near(e.r,17.5,0.001)&&near(e.c[0],21.5,0.001)&&near(e.c[1],100,0.001)&&e.ct==='pocket')&&r.some(e=>e.t==='pline'&&e.bl&&e.ct==='inside'&&e.tool===8),'Eigene SVG wieder einlesen: Formen, Lage und Fräs-Angaben stimmen',back);
 // fremde SVG: Kreis aus Kurven (wie aus Illustrator/Inkscape), Verschiebung, Zoll
 const k=0.5522847498,foreign=`<svg xmlns="http://www.w3.org/2000/svg" width="4in" height="2in" viewBox="0 0 400 200"><g transform="translate(100,100)"><path d="M50,0 C50,${50*k} ${50*k},50 0,50 C${-50*k},50 -50,${50*k} -50,0 C-50,${-50*k} ${-50*k},-50 0,-50 C${50*k},-50 50,${-50*k} 50,0 Z"/><rect x="100" y="-50" width="150" height="100" rx="20"/></g><text x="5" y="5">x</text></svg>`;
 r=await p.evaluate(s=>__cad.importSVG(s),foreign);
 ok(r.ents[0].t==='circle'&&near(r.ents[0].r,12.7,0.01)&&near(r.ents[0].c[0],25.4,0.01)&&r.ents[1].t==='pline'&&r.ents[1].closed&&r.ents[1].bl.filter(v=>Math.abs(v)>0.1).length===4&&/übersprungen/.test(r.note),'Fremde SVG in Zoll: Kurven-Kreis wird Kreis Ø25,4, abgerundetes Rechteck mit 4 Bögen',JSON.stringify(r).slice(0,300));
 await p.setInputFiles('#file',{name:'Fremd.svg',mimeType:'image/svg+xml',buffer:Buffer.from(foreign)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Fremd.svg'));
 E=await ents();ok(E.length===2&&E.every(e=>e.id&&e.ly==='Kontur'),'SVG über Datei › Öffnen geladen');

 console.log('DXF');
 await fresh();await C('R','0,0','400,600','K','21.5,100','17.5','LL','360,250','360,350','20','B','0,600','200,650','400,600','L','0,0','50,80','');
 const before=await p.evaluate(()=>__cad.S.ents.map(e=>__cad.bbox([e]).map(v=>+v.toFixed(3)).join()));
 const dxf=await p.evaluate(()=>__cad.buildDXF(__cad.S.ents));
 r=await p.evaluate(s=>{const x=__cad.importDXF(s);return{t:x.ents.map(e=>e.t).join(),bb:x.ents.map(e=>__cad.bbox([e]).map(v=>+v.toFixed(3)).join()),ly:x.ents[0].ly}},dxf);
 ok(r.t==='pline,circle,pline,arc,line'&&JSON.stringify(r.bb)===JSON.stringify(before)&&r.ly==='Kontur','DXF schreiben und wieder lesen: gleiche Formen an gleicher Stelle',r.t+' '+JSON.stringify(r.bb)+' / '+JSON.stringify(before));
 const dxf2=['0','SECTION','2','HEADER','9','$INSUNITS','70','1','0','ENDSEC','0','SECTION','2','BLOCKS','0','BLOCK','2','LOCH','10','0','20','0','0','CIRCLE','8','BOHR','10','0','20','0','40','0.5','0','ENDBLK','0','ENDSEC',
  '0','SECTION','2','ENTITIES','0','LWPOLYLINE','8','TEIL','90','4','70','1','10','0','20','0','42','0','10','10','20','0','42','1','10','10','20','4','10','0','20','4','0','INSERT','2','LOCH','8','BOHR','10','2','20','2','0','INSERT','2','LOCH','10','8','20','2','41','2','42','2',
  '0','SPLINE','8','TEIL','71','3','72','8','73','4','40','0','40','0','40','0','40','0','40','1','40','1','40','1','40','1','10','0','20','0','10','0','20','4','10','4','20','4','10','4','20','0','0','HATCH','8','X','0','ENDSEC','0','EOF'].join('\r\n');
 r=await p.evaluate(s=>__cad.importDXF(s),dxf2);
 ok(r.ents.length===4&&r.ents[0].t==='pline'&&near(r.ents[0].pts[1][0],254)&&r.ents[0].bl&&r.ents[1].t==='circle'&&near(r.ents[1].r,12.7)&&near(r.ents[1].c[0],50.8)&&near(r.ents[2].r,25.4)&&r.ents[1].ly==='BOHR'&&/HATCH/.test(r.note)&&near(r.ents[3].pts[r.ents[3].pts.length-1][0],101.6),'Fremde DXF in Zoll: Polylinie mit Bogen, Blöcke, Kurve; Schraffur wird gemeldet',JSON.stringify(r).slice(0,400));
 await p.setInputFiles('#file',{name:'Fremd.dxf',mimeType:'application/dxf',buffer:Buffer.from(dxf2)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Fremd.dxf'));
 r=await p.evaluate(()=>__cad.S.layers.map(l=>l.n).join());ok(/TEIL/.test(r)&&/BOHR/.test(r),'DXF über Datei › Öffnen: Ebenen angelegt',r);
 await p.setInputFiles('#file',{name:'Quatsch.dxf',mimeType:'application/dxf',buffer:Buffer.from('das ist\nkeine\ndxf')});await p.waitForTimeout(200);
 ok((await p.evaluate(()=>document.getElementById('hist').lastChild.className))==='e'&&(await ents()).length===4,'Kaputte Datei: verständliche Meldung, Zeichnung bleibt');

 console.log('Vorlagen');
 await fresh();await C('R','0,0','400,600','VO');await p.click('[data-tpl="b0"]');await C('21.5,100','21.5,500','');E=await ents();
 ok(E.length===7&&E[1].r===17.5&&E[1].ct==='pocket'&&near(E[5].c[0],31)&&near(E[5].c[1],522.5),'Mitgelieferte Vorlage zweimal eingefügt');
 await p.evaluate(()=>{__cad.sel.clear();for(const e of __cad.S.ents.slice(1,4))__cad.sel.add(e.id);__cad.act('tplSave')});await p.fill('#tplName','Mein Topf');await p.click('#tplSaveF button[type=submit]');
 await fresh();await C('VO');await p.click('[data-tpl="u0"]');await C('100,100','');E=await ents();
 ok(E.length===3&&near(E[0].c[0],100+17.5)&&near(E[0].c[1],100+22.5-4+ -0.5,25)&&E[0].cd===13,'Eigene Vorlage gespeichert und eingefügt (unten links am Einfügepunkt)',JSON.stringify(E.map(e=>e.c)));
 await C('VO');await p.click('[data-tpldel="0"]');ok((await p.evaluate(()=>__cad.userTpls().length))===0,'Eigene Vorlage gelöscht');await p.keyboard.press('Escape');
 // Export-Fenster
 await fresh();await C('R','0,0','100,100','R','20,20','@30,30','L','200,0','250,0','');await p.evaluate(()=>{__cad.S.ents[2].ct='outside'});await C('EX');
 r=await p.evaluate(()=>({t:document.getElementById('expT').textContent,w:document.getElementById('expW').textContent,open:document.getElementById('dExp').classList.contains('open')}));
 ok(r.open&&/Außen1/.test(r.t)&&/Innen1/.test(r.t)&&/250 × 100/.test(r.t)&&/Material stehen/.test(r.w),'Export-Fenster: Übersicht und Warnung (Ecken)',JSON.stringify(r));
 const dl=p.waitForEvent('download');await p.click('#expB');const D=await dl;ok(D.suggestedFilename()==='Zeichnung.svg','SVG wird als Datei gespeichert: '+D.suggestedFilename());

 console.log('Winkelfang');
 await fresh();await p.evaluate(()=>__cad.zoomAll());await C('L','0,0');
 const sp=w=>p.evaluate(w=>__cad.w2s(w),w);
 await p.evaluate(s=>__cad.setMouse(s),await sp([200,4]));r=await p.evaluate(()=>__cad.curP);ok(near(r[1],0,1e-6)&&near(r[0],200,0.01),'fast waagrecht rastet auf 0° ein',JSON.stringify(r));
 await p.evaluate(s=>__cad.setMouse(s),await sp([3,150]));r=await p.evaluate(()=>__cad.curP);ok(near(r[0],0,1e-6),'fast senkrecht rastet auf 90° ein');
 await p.evaluate(s=>__cad.setMouse(s),await sp([150,146]));r=await p.evaluate(()=>__cad.curP);ok(near(r[0],r[1],1e-6),'fast diagonal rastet auf 45° ein');
 await p.evaluate(s=>__cad.setMouse(s),await sp([200,60]));r=await p.evaluate(()=>__cad.curP);ok(near(r[1],60,0.01),'schräg dazwischen bleibt frei');
 await p.evaluate(s=>__cad.setMouse(s),await sp([200,-5]));await C('250','');E=await ents();ok(E.length===1&&near(E[0].b[0],250,1e-6)&&near(E[0].b[1],0,1e-6),'Länge 250 tippen: Linie genau waagrecht');
 await p.evaluate(()=>__cad.act('polar'));await C('L','0,0');await p.evaluate(s=>__cad.setMouse(s),await sp([200,4]));r=await p.evaluate(()=>__cad.curP);ok(near(r[1],4,0.01),'Winkelfang aus: nichts rastet');await p.keyboard.press('Escape');await p.evaluate(()=>__cad.act('polar'));

 console.log('Darstellung');
 for(const[n,vp]of[['tablet',{width:1024,height:768}],['handy',{width:390,height:844}]]){const q=await open(vp);await q.evaluate(()=>__cad.act('cam'));
  const o=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth,cv:document.getElementById('cv').clientHeight}));ok(o.sw<=o.w&&o.cv>150,`${n}: nichts läuft seitlich über, Zeichenfläche sichtbar`,JSON.stringify(o));
  if(SHOTS)await q.screenshot({path:path.join(SHOTS,'06-'+n+'.png')});await q.close()}
 ok(errs.length===0,'keine Skriptfehler',errs.join(' | '));
 await b.close();srv.close();console.log(fails?`\n${fails} FEHLER`:'\nAlles in Ordnung.');process.exit(fails?1:0)})();
