// Prüft das Zeichenprogramm im echten Browser: Start, Fräsen, Verbinden, Formen kombinieren, Bohrbilder, Text, SVG/DXF, Vorlagen.
// Aufruf: node tests/check.cjs   (optional: Ordner für Fotos als 1. Angabe)
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const ROOT=path.join(__dirname,'..'),SHOTS=process.argv[2]||null;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const p=path.join(ROOT,f);if(!p.startsWith(ROOT)||!fs.existsSync(p)){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))});
let fails=0;const ok=(c,t,extra='')=>{console.log((c?'  ok   ':'  FEHLER ')+t+(c?'':' '+extra));if(!c)fails++};
const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;
(async()=>{await new Promise(r=>srv.listen(0,r));const url=`http://localhost:${srv.address().port}/`;
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const errs=[];
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

 console.log('Rückgängig-Knopf');
 await fresh();await C('R','0,0','100,50','K','50,25','10');await p.click('#bUndo');E=await ents();ok(E.length===1,'Knopf „Rückgängig“ nimmt den Kreis zurück');
 await p.click('#bRedo');E=await ents();ok(E.length===2&&(await p.evaluate(()=>document.getElementById('bRedo').disabled)),'Knopf „Wiederholen“ holt ihn wieder, danach grau');

 console.log('Strg-Tasten');
 await fresh();await p.locator('#cv').click({position:{x:400,y:300}});await p.keyboard.press('Control+r');ok((await p.evaluate(()=>__cad.REQ&&__cad.REQ.prompt))==='Erste Ecke','Strg+R startet Rechteck');
 await C('0,0','100,50');await p.keyboard.press('Control+k');await C('50,25','10');E=await ents();ok(E.length===2&&E[1].t==='circle','Strg+K startet Kreis');
 await p.keyboard.press('Control+l');ok((await p.evaluate(()=>__cad.REQ.prompt))==='Startpunkt','Strg+L startet Linie (auch mitten in einem Befehl)');await p.keyboard.press('Escape');
 await p.evaluate(()=>__cad.inp.focus());await p.keyboard.type('12,5');await p.keyboard.press('Control+c');ok((await p.evaluate(()=>!__cad.REQ&&__cad.inp.value==='12,5')),'Strg+C mit Text in der Befehlszeile kopiert normal');await p.evaluate(()=>__cad.inp.value='');
 r=await p.evaluate(()=>document.querySelector('#mZ').textContent);ok(/LinieStrg\+L/.test(r)&&/RechteckStrg\+R/.test(r),'Menü zeigt die Strg-Tasten');

 console.log('Befehl bleibt aktiv');
 await fresh();await C('L','0,0','100,0','');r=await p.evaluate(()=>__cad.REQ&&__cad.REQ.prompt);ok(r==='Startpunkt','Nach Linie + Enter: gleich neuer Startpunkt',r);
 await C('0,50','100,50','');E=await ents();ok(E.length===2,'Zweite Linie ohne neuen Befehl gezeichnet');
 await C('');ok(!(await p.evaluate(()=>__cad.REQ)),'Enter ohne Punkt beendet den Befehl');
 await C('R','0,0','10,10','20,20','30,30');E=await ents();ok(E.length===4&&E[3].t==='pline','Rechteck: zweites Rechteck direkt hinterher');
 await p.keyboard.press('Escape');ok(!(await p.evaluate(()=>__cad.REQ)),'Esc beendet den Befehl');

 console.log('Auswahlmodus');
 await fresh();await C('L','0,0','100,0','');await p.evaluate(()=>__cad.zoomAll());await p.keyboard.press('Shift+A');
 ok(!(await p.evaluate(()=>__cad.REQ))&&(await p.evaluate(()=>__cad.inp.value))==='','Shift+A beendet den Befehl, nichts landet in der Befehlszeile');
 ok(await p.evaluate(()=>document.getElementById('bSel').classList.contains('on')),'Pfeil links ist hervorgehoben');
 const pt=await p.evaluate(()=>__cad.w2s([50,0]));const box=await p.locator('#cv').boundingBox();await p.mouse.click(box.x+pt[0],box.y+pt[1]);
 ok((await p.evaluate(()=>__cad.sel.size))===1,'Danach Linie anklicken wählt sie aus');
 await C('TX');await p.keyboard.press('Shift+A');ok((await p.evaluate(()=>__cad.inp.value))==='A','Beim Text-Tippen bleibt Shift+A ein großes A');await p.keyboard.press('Escape');

 console.log('Hilfslinien');
 await fresh();await p.locator('#cv').click({position:{x:5,y:5}});await p.keyboard.press('Shift+H');ok((await p.evaluate(()=>__cad.S.cur))==='Hilfslinien'&&(await p.evaluate(()=>document.getElementById('t_guide').classList.contains('on'))),'Shift+H: zeichnen auf Hilfslinien, Knopf leuchtet');
 await C('L','0,0','100,0','');await p.keyboard.press('Escape');await p.keyboard.press('Shift+H');E=await ents();
 ok(E[0].ly==='Hilfslinien'&&(await p.evaluate(()=>__cad.cutOf(__cad.S.ents[0]).t))==='guide'&&(await p.evaluate(()=>__cad.S.cur))==='Kontur','Linie ist Hilfslinie, nochmal Shift+H = zurück zur Kontur');
 await fresh();await C('HL','W','0,50','','HL','S','30,0','','HL','0,0','45','');E=await ents();
 ok(E.length===3&&E.every(e=>e.t==='xline'&&e.ly==='Hilfslinien')&&near(E[2].d[0],Math.SQRT1_2),'Drei unendliche Hilfslinien: waagrecht, senkrecht, 45°');
 await C('L');const sp2=await p.evaluate(()=>__cad.w2s([30.3,50.4]));await p.evaluate(s=>__cad.setMouse(s),sp2);r=await p.evaluate(()=>__cad.curP);ok(near(r[0],30,1e-6)&&near(r[1],50,1e-6),'Fang auf dem Schnittpunkt zweier Hilfslinien',JSON.stringify(r));
 await p.keyboard.press('Escape');await C('R','0,0','100,100');await p.keyboard.press('Escape');
 svg=await p.evaluate(()=>__cad.buildSVG(__cad.exportList(false)));ok(!/guide/.test(svg)&&/width="100mm"/.test(svg),'Unendliche Hilfslinien nicht in der SVG, Größe stimmt');
 r=await p.evaluate(()=>__cad.importDXF(__cad.buildDXF(__cad.S.ents)).ents.map(e=>e.t).join());ok(r==='xline,xline,xline,pline','DXF behält die Hilfslinien',r);
 await C('VS','10');await p.evaluate(()=>{const e=__cad.S.ents[0];__cad.adv({e,p:[0,50]});__cad.adv({p:[0,80]})});await C('');E=await ents();ok(E.length===5&&near(E[4].p[1],60),'Versatz geht auch mit Hilfslinien');

 console.log('3D-Ansicht');
 await fresh();await C('R','0,0','400,600','K','21.5,100','17.5','R','150,200','@100,150','L','50,500','350,500','');await p.keyboard.press('Escape');
 await p.evaluate(()=>{const S=__cad.S;S.ents[0].cd=19;S.ents[1].ct='pocket';S.ents[1].cd=13;S.ents[2].cd=19;S.ents[3].cd=2;__cad.act('alle');__cad.sel.clear()});
 r=await p.evaluate(()=>{const m=__cad.build3D(19);return{n:m.sections.length,z:m.sections.map(s=>s.z1),vol:m.vol,notes:m.notes.length,info:m.info}});
 const volSoll=400*600*19-Math.PI*17.5*17.5*13-100*150*19-(300*6+Math.PI*9)*2;
 ok(r.n===3&&r.z.join()==='2,13,19'&&Math.abs(r.vol-volSoll)<30&&r.notes===0,'Platte 19 mm: Tasche 13 tief, Ausschnitt durch, Nut 2 tief – Volumen stimmt',JSON.stringify(r)+' soll '+volSoll);
 await p.keyboard.press('F4');r=await p.evaluate(()=>({open:CAD3D.isOpen(),st:CAD3D.stats,info:document.getElementById('v3info').textContent}));
 ok(r.open&&r.st&&r.st.tris>200&&/400 × 600 × 19 mm/.test(r.info),'F4 öffnet die 3D-Ansicht ('+(r.st&&r.st.tris)+' Dreiecke)',JSON.stringify(r));
 await p.waitForTimeout(300);if(SHOTS)await p.screenshot({path:path.join(SHOTS,'07-3d.png')});
 r=await p.evaluate(()=>{const c=document.getElementById('v3cv'),g=c.getContext('webgl'),px=new Uint8Array(4);g.readPixels(c.width>>1,c.height>>1,1,1,g.RGBA,g.UNSIGNED_BYTE,px);return[...px]});
 await p.fill('#v3thick','10');await p.keyboard.press('Enter');r=await p.evaluate(()=>({t:__cad.S.def.thick,info:document.getElementById('v3info').textContent,w:document.getElementById('v3warn').textContent}));
 ok(r.t===10&&/× 10 mm/.test(r.info)&&/tiefer als die Platte/.test(r.w),'Plattenstärke 10 eingetragen: Ansicht neu, Hinweis auf zu tiefe Fräsungen',JSON.stringify(r));
 await p.click('[data-v3="bottom"]');await p.click('[data-v3="close"]');ok(!(await p.evaluate(()=>CAD3D.isOpen())),'Schließen geht');

 console.log('Korpusplaner');
 await fresh();await p.click('.mbtn[data-a="korpus"]');await p.waitForTimeout(250);
 r=await p.evaluate(()=>[...document.querySelectorAll('#kpform details')].map(d=>d.dataset.sec+(d.open?'+':'-')).join(' '));ok(r==='cab+ in+ mat- verb- besch- sock-','Planer: Korpus und Innenaufteilung offen, Technik-Abschnitte eingeklappt',r);
 await p.click('#kpform details[data-sec="sock"] summary');ok(await p.isVisible('#kr_sockel'),'Abschnitt „Sockel“ klappt auf');await p.evaluate(()=>KORPUS.openAll());
 r=await p.evaluate(()=>KORPUS.list().map(x=>({n:x.n,name:x.p.name,W:x.p.W,H:x.p.H,T:x.p.T,holes:x.p.holes.length,gr:x.p.grooves.length})));
 const part=n=>r.find(x=>x.name===n);
 ok(r.length===8&&part('Seite links').W===560&&part('Seite links').H===720&&part('Boden').W===562&&part('Rückwand').W===580&&part('Rückwand').H===700&&part('Einlegeboden').W===560&&part('Einlegeboden').H===522,'Standard-Korpus 600×720×560: 8 Teile mit richtigen Maßen',JSON.stringify(r));
 ok(part('Tür links').W===295.5&&part('Tür links').H===714,'Türen mit 3 mm Fuge rundum: 295,5 × 714');
 ok(part('Seite links').holes===20&&part('Seite links').gr===1&&part('Tür links').holes===6&&part('Boden').gr===1&&part('Boden').holes===4,'Seite: 6 Dübel + 4 Verbinder-Bolzen + 6 Bodenträger + 4 Montageplatte + Nut · Tür: 2 Töpfe mit Dübellöchern');
 r=await p.evaluate(()=>{const s=KORPUS.parts().find(x=>x.name==='Seite links'),t=KORPUS.parts().find(x=>x.name==='Tür links');return{dub:s.holes.filter(h=>h.d===8).map(h=>h.x+'/'+h.y),topf:t.holes.filter(h=>h.d===35).map(h=>h.x+'/'+h.y),mp:s.holes.filter(h=>h.d===5&&h.x===37&&h.y>80&&h.y<125).length,gx:s.grooves[0].x,bt:s.holes.filter(h=>h.d===4).map(h=>h.x+'/'+h.y+'/'+h.depth)}});
 ok(r.bt.length===6&&r.bt.includes('37/348/10')&&r.bt.includes('495/380/10')&&r.bt.includes('37/316/10'),'Bodenträger Häfele Jimmy: Ø4, 10 tief, 37 von vorn/hinten, Lochmitte 2 unter dem Boden, ±32',JSON.stringify(r.bt));
 ok(r.dub.includes('101/9.5')&&r.dub.includes('431/710.5')&&r.dub.includes('261/9.5')&&r.topf.join()==='274/100,274/614'&&r.mp===2&&r.gx===532,'Dübel zwischen den Verbindern, Topf 21,5 von der Kante und 100 von oben/unten, Nut 20 von hinten',JSON.stringify(r));
 r=await p.evaluate(()=>{const ps=KORPUS.parts(),g=n=>ps.find(x=>x.name===n);return{bolz:g('Seite links').holes.filter(h=>h.d===5&&(h.y===9.5||h.y===710.5)).map(h=>h.x+'/'+h.y+'/'+h.depth).join(' '),bo:g('Boden').holes.map(h=>h.d+':'+h.x+'/'+h.y+'/'+h.depth).join(' '),de:g('Deckel').holes.map(h=>h.x+'/'+h.y).join(' ')}});
 ok(r.bolz==='37/9.5/13 37/710.5/13 495/9.5/13 495/710.5/13'&&r.bo==='20:9.5/37/14 20:552.5/37/14 20:9.5/495/14 20:552.5/495/14'&&r.de==='9.5/523 552.5/523 9.5/65 552.5/65','Würth SV 20 E: Gehäuse Ø20, 14 tief, 9,5 von der Kante in Boden und Deckel · Bolzen Ø5 in der Seite, 37 von vorn und hinten',JSON.stringify(r));
 await p.uncheck('#kr_sv');r=await p.evaluate(()=>{const s=KORPUS.parts().find(x=>x.name==='Seite links');return s.holes.filter(h=>h.d===8).map(h=>h.x).slice(0,3).join()+' '+s.holes.length});ok(r==='32,256,480 16','Ohne Systemverbinder: Dübel wieder 32 vom Rand',r);await p.check('#kr_sv');
 await p.fill('#kc_nm','1');await p.keyboard.press('Enter');await p.fill('#kc_nf','1');await p.keyboard.press('Enter');
 r=await p.evaluate(()=>{const ps=KORPUS.parts(),mw=ps.find(x=>x.name==='Mittelwand');return{n:ps.length,mw:[mw.W,mw.H],back:mw.holes.filter(h=>h.back).length,main:mw.holes.filter(h=>!h.back).length,fb:ps.filter(x=>x.name==='Fester Boden').map(x=>x.W),bo:ps.find(x=>x.name==='Boden').holes.length}});
 ok(r.mw.join()==='532,682'&&r.fb.join()==='271.5,271.5'&&r.back>0&&r.back===r.main&&r.bo===7,'1 Mittelwand + je 1 fester Boden: Maße, Bohrungen beidseitig, Dübel im Boden',JSON.stringify(r));
 // Boden mit der Maus ziehen
 r=await p.evaluate(()=>{const k=KORPUS.state,v=KORPUS.view,s=k.cabs[0].fb[0],f=19;return{x:v.ox+(f+100)*v.s,y:v.oy-(s.y+9)*v.s,y0:s.y,sc:v.s}});
 const cb=await p.locator('#kpcv').boundingBox();await p.mouse.move(cb.x+r.x,cb.y+r.y);await p.mouse.down();await p.mouse.move(cb.x+r.x,cb.y+r.y-50*r.sc,{steps:4});await p.mouse.up();
 let y1=await p.evaluate(()=>KORPUS.state.cabs[0].fb[0].y);ok(Math.abs(y1-(r.y0+50))<=2,'Festen Boden mit der Maus 50 mm nach oben gezogen',r.y0+' → '+y1);
 await p.keyboard.press('Control+z');ok((await p.evaluate(()=>KORPUS.state.cabs[0].fb[0].y))===r.y0,'Strg+Z im Planer nimmt das Verschieben zurück');
 await p.click('[data-kpm="eb"]');await p.mouse.click(cb.x+r.x,cb.y+r.y+120*r.sc);r=await p.evaluate(()=>KORPUS.state.cabs[0].eb.length);ok(r===3,'„+ Einlegeboden“ und Klick ins Fach setzt einen Boden');
 await p.keyboard.press('Delete');ok((await p.evaluate(()=>KORPUS.state.cabs[0].eb.length))===2,'Entf löscht den gewählten Boden');
 r=await p.evaluate(()=>{const v=KORPUS.view;return{x:v.ox+150*v.s,y:v.oy-640*v.s}});await p.click('[data-kpm="ks"]');await p.mouse.click(cb.x+r.x,cb.y+r.y);
 r=await p.evaluate(()=>{const ps=KORPUS.parts(),st=ps.find(x=>x.rod),sl=ps.find(x=>x.name==='Seite links'),mw=ps.find(x=>x.name==='Mittelwand');return{ks:KORPUS.state.cabs[0].ks.map(s=>s.y),st:st&&[st.name,st.W,st.T],mark:sl.holes.filter(h=>h.mark).map(h=>h.x+'/'+h.y),mwm:mw.holes.filter(h=>h.mark).length,ents:KORPUS.partEnts(sl,1).filter(e=>e.ly==='Kontur'&&e.t==='circle'&&e.r===12.5).length,sec:KORPUS.model3().parts.length}});
 ok(r.ks.length===1&&Math.abs(r.ks[0]-640)<=2&&r.st.join()==='Kleiderstange Ø25,267.5,25'&&r.mark.length===1&&r.mark[0].startsWith('266/')&&r.mwm===1&&r.ents===0,'„+ Kleiderstange“: Stange im Fach, Lagermitte an Seite und Mittelwand nur angezeichnet',JSON.stringify(r));
 await p.fill('#kp_pos','600');await p.keyboard.press('Enter');ok((await p.evaluate(()=>KORPUS.state.cabs[0].ks[0].y))===600,'Höhe der Stange eintippen');
 await p.click('#kc_add');await p.selectOption('#kc_front','s');await p.fill('#kc_b','450');await p.keyboard.press('Enter');await p.check('#kr_sockel');
 r=await p.evaluate(()=>{const ps=KORPUS.parts();return{cabs:KORPUS.state.cabs.length,fr:ps.filter(x=>x.name==='Schubkastenfront').map(x=>x.W+'x'+x.H),box:ps.filter(x=>x.box).length,so:ps.filter(x=>x.name.startsWith('Sockel')).map(x=>x.W),z:ps.find(x=>x.name==='Seite links').o[2]}});
 ok(r.cabs===2&&r.fr.length===3&&r.fr[0]==='444x236'&&r.box===15&&r.so[0]===1050&&r.z===100,'Zweiter Korpus mit 3 Schubkästen, Sockel 100 unter der ganzen Zeile',JSON.stringify(r));
 r=await p.evaluate(()=>{const ps=KORPUS.parts(),g=n=>ps.filter(x=>x.name===n)[0];const s=g('Schubkasten Seite'),v=g('Schubkasten Vorderstück'),h=g('Schubkasten Hinterstück'),b=g('Schubkasten Boden');return{s:[s.W,s.H,s.T,s.grooves[0].y,s.o[2]],v:[v.W,v.H],h:[h.W,h.H,h.holes.length],b:[b.W,b.H,b.o[2]]}});
 ok(r.s.join()==='490,191,16,13,133'&&r.v.join()==='370,191'&&r.h.join()==='370,170,2'&&r.b.join()==='381,479.5,146','Blum TANDEM: lichte Weite 412 → innen 370, Nennlänge 500 → 490 lang, Boden 13 zurück, 14 Luft unten',JSON.stringify(r));
 await p.selectOption('#kr_matK','W1000');await p.selectOption('#kr_matF','H1180');
 r=await p.evaluate(()=>{const m=KORPUS.model3(),ps=KORPUS.parts(),i=n=>ps.findIndex(x=>x.name===n);return{k:m.parts[i('Seite links')].color.join(),f:m.parts[i('Tür links')].color.join(),rw:m.parts[i('Rückwand')].color,csv:KORPUS.csv(';').split('\n')[1],cut:KORPUS.csv(',',true).split('\n')[1]}});
 ok(r.k==='0.95,0.95,0.94'&&r.f==='0.71,0.55,0.37'&&r.rw===null&&/EGGER W1000 Premiumweiß/.test(r.csv)&&/,W1000 19mm,Seite links,/.test(r.cut),'Material: Korpus EGGER W1000, Fronten H1180 – in 3D und in der Stückliste',JSON.stringify(r));
 await p.waitForTimeout(400);r=await p.evaluate(()=>{const m=KORPUS.model3();return{parts:m.parts.length,size:m.size,sec:m.parts[0].sections.length}});ok(r.parts>30&&r.sec>=2,'3D-Modell: '+r.parts+' Platten, Seite mit Bohrungen in Schichten');
 if(SHOTS)await p.screenshot({path:path.join(SHOTS,'08-korpusplaner.png')});
 r=await p.evaluate(()=>{const n=KORPUS.nest(),g=n.groups.find(x=>x.kind==='Platte'),all=n.groups.flatMap(x=>x.sheets.flatMap(s=>s.parts)),tot=KORPUS.list().filter(x=>!x.p.rod).reduce((s,x)=>s+x.n,0);
  let overlap=0,outside=0;for(const x of n.groups)for(const s of x.sheets){for(const a of s.parts){if(a.x+a.w>n.plL-2*n.rand+1e-6||a.y+a.h>n.plB-2*n.rand+1e-6)outside++;for(const b of s.parts)if(a!==b&&a.x<b.x+b.w-1e-6&&b.x<a.x+a.w-1e-6&&a.y<b.y+b.h-1e-6&&b.y<a.y+a.h-1e-6)overlap++}}
  return{groups:n.groups.map(x=>x.kind+' '+x.T+':'+x.sheets.length).join(' | '),placed:all.length,tot,overlap,outside,mis:n.misfit.length,waste:g.waste}});
 ok(r.placed===r.tot&&r.overlap===0&&r.outside===0&&r.mis===0&&r.waste>0&&r.waste<1,'Zuschnittplan: alle '+r.tot+' Teile auf Platten, nichts überlappt ('+r.groups+')',JSON.stringify(r));
 await p.click('[data-kp="nest"]');ok((await p.evaluate(()=>document.querySelectorAll('#kpnBody svg').length))>=3&&(await p.evaluate(()=>document.getElementById('kn_plL').value))==='2800','Fenster Zuschnittplan zeigt die Platten');
 await p.fill('#kn_plB','1000');await p.keyboard.press('Enter');await p.fill('#kn_plL','1000');await p.keyboard.press('Enter');r=await p.evaluate(()=>({pl:KORPUS.state.plL,w:document.querySelector('#kpnBody .warn')?document.querySelector('#kpnBody .warn').textContent:''}));ok(r.pl===1000&&/Sockelblende/.test(r.w),'Platte nur 1000 × 1000: Sockelblende passt nicht – wird gemeldet',JSON.stringify(r));
 await p.fill('#kn_plL','2800');await p.keyboard.press('Enter');await p.fill('#kn_plB','2070');await p.keyboard.press('Enter');await p.keyboard.press('Escape');
 // gemischte Front, Griffe, Kantenband, Hängeschrank
 await p.evaluate(()=>{const k=KORPUS.state;k.cabs[0].mw=[];k.cabs[0].nm=0;KORPUS.select(0)});await p.selectOption('#kc_front','m2');await p.selectOption('#kr_griff','b');
 r=await p.evaluate(()=>{const ps=KORPUS.parts().filter(x=>x.ci===0),g=n=>ps.filter(x=>x.name===n);const d=g('Tür links')[0],f=g('Schubkastenfront')[0],s=g('Schubkasten Seite')[0];return{d:[d.W,d.H],f:[f.W,f.H,f.o[2]],sH:s.H,gr:ps.filter(x=>x.name.startsWith('Griff')).length,dh:d.holes.filter(h=>h.d===5).map(h=>h.x+'/'+h.y+'/'+h.depth),fh:f.holes.map(h=>h.x+'/'+h.y),cur:KORPUS.state.cabs[0].front}});
 ok(r.cur==='m2'&&r.d.join()==='295.5,571'&&r.f.join()==='594,140,677'&&r.gr===3&&r.dh.join()==='50/363/19,50/491/19'&&r.fh.join()==='233/70,361/70','Schubkasten oben + 2 Türen: Tür 571 hoch, Front 140, Bügelgriffe mit Lochabstand 128',JSON.stringify(r));
 await p.fill('#kr_kb','2');await p.keyboard.press('Enter');
 r=await p.evaluate(()=>{const ps=KORPUS.parts(),g=n=>ps.find(x=>x.name===n);return{s:[g('Seite links').cW,g('Seite links').cH,g('Seite links').kbTxt],b:[g('Boden').cW,g('Boden').cH],t:[g('Tür links').cW,g('Tür links').cH,g('Tür links').kbTxt],rw:[g('Rückwand').cW,g('Rückwand').W],cut:KORPUS.csv(',',true).split('\n')[1]}});
 ok(r.s.join()==='558,720,vorn'&&r.b.join()==='562,558'&&r.t.join()==='291.5,567,rundum'&&r.rw[0]===r.rw[1]&&/^720,558,1,/.test(r.cut),'Kantenband 2 mm: Seite 558 breit zuschneiden, Tür rundum 4 kleiner, Rückwand unverändert',JSON.stringify(r));
 await p.fill('#kr_kb','0');await p.keyboard.press('Enter');await p.selectOption('#kr_griff','n');await p.selectOption('#kc_front','2');
 await p.selectOption('#kc_typ','2');r=await p.evaluate(()=>{const k=KORPUS.state,ps=KORPUS.parts();return{c:[k.cabs[0].h,k.cabs[0].d,k.cabs[0].zo],z:ps.find(x=>x.ci===0&&x.name==='Seite links').o[2],so:ps.filter(x=>x.name==='Sockelblende vorn').map(x=>x.W+'@'+x.o[0])}});
 ok(r.c.join()==='720,320,1400'&&r.z===1400&&r.so.join()==='450@600','Schranktyp Hängeschrank: 1400 über Boden, Sockel nur noch unter dem anderen Korpus',JSON.stringify(r));
 await p.selectOption('#kc_typ','0');
 await p.click('[data-kp="list"]');r=await p.evaluate(()=>({rows:document.querySelectorAll('#kplT tr').length,sum:document.getElementById('kplsum').textContent}));ok(r.rows>10&&/m²/.test(r.sum),'Stückliste mit '+(r.rows-1)+' Zeilen und Flächen');
 const dl2=p.waitForEvent('download');await p.click('[data-kpsvg="0"]');const D2=await dl2,svgK=fs.readFileSync(await D2.path(),'utf8');
 ok(/Seite-links-560x720\.svg/.test(D2.suggestedFilename())&&/shaper:cutType="outside" shaper:cutDepth="19mm"/.test(svgK)&&(svgK.match(/cutType="pocket"/g)||[]).length>10&&/shaper:cutDepth="12mm"/.test(svgK)&&/shaper:cutDepth="10mm"/.test(svgK),'SVG je Teil: Seite mit Außenkontur 19, Dübeln 12 tief, Nut 10 tief',D2.suggestedFilename());
 r=await p.evaluate(()=>KORPUS.csv(',',true).split('\n').slice(0,2));ok(r[0]==='Length,Width,Qty,Material,Label,Enabled'&&/^720,560,1,W1000 19mm,Seite links,true$/.test(r[1]),'Liste für CutList Optimizer',r.join(' | '));
 await p.click('[data-kpl="draw"]');r=await p.evaluate(()=>({open:KORPUS.isOpen(),n:__cad.S.ents.length,sel:__cad.sel.size,ly:__cad.S.layers.map(l=>l.n).join(),kp:!!__cad.S.korpus}));
 ok(!r.open&&r.n>80&&r.sel===r.n&&/Rückseite/.test(r.ly),'„Alle Teile ins Zeichenprogramm“: '+r.n+' Objekte gezeichnet und gewählt',JSON.stringify(r));
 const jsK=await p.evaluate(()=>JSON.stringify({app:'OriginCAD',v:3,...__cad.S}));await fresh();await p.setInputFiles('#file',{name:'Schrank.json',mimeType:'application/json',buffer:Buffer.from(jsK)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Schrank.json'));
 ok((await p.evaluate(()=>__cad.S.korpus&&__cad.S.korpus.cabs.length))===2,'Planung wird mit der Zeichnung gespeichert und wieder geladen');

 console.log('Bemaßung und Drucken');
 await fresh();await C('R','0,0','300,200','K','150,100','40','BK','0,0','100,0','50,-40','200,0','300,0','');await p.keyboard.press('Escape');E=await ents();
 let Dm=E.filter(e=>e.t==='dim');ok(Dm.length===3&&Dm.every(d=>d.m==='h'&&d.p[1]===-40)&&Dm[1].a[0]===100&&Dm[1].b[0]===200&&Dm[2].b[0]===300,'Kettenmaß: drei Maße auf einer Linie (100 · 100 · 100)',JSON.stringify(Dm).slice(0,200));
 await C('BR');await p.evaluate(()=>{const e=__cad.S.ents[1];__cad.adv({e,p:[190,100]});__cad.adv({p:[230,140]})});await p.keyboard.press('Escape');E=await ents();Dm=E[E.length-1];
 ok(Dm.t==='dim'&&Dm.m==='dia'&&Dm.r===40&&Dm.c.join()==='150,100','Durchmessermaß am Kreis');
 await C('BR');await p.evaluate(()=>{const e=__cad.S.ents[1];__cad.adv({e,p:[190,100]})});await C('R');await p.evaluate(()=>__cad.adv({p:[150,170]}));await p.keyboard.press('Escape');E=await ents();ok(E[E.length-1].m==='rad','Mit R wird daraus ein Radiusmaß');
 await p.evaluate(()=>{__cad.act('alle')});await C('V','0,0','1000,0');E=await ents();ok(E[E.length-2].c.join()==='1150,100'&&E[2].a[0]===1000,'Maße wandern beim Verschieben mit');await p.evaluate(()=>__cad.sel.clear());
 r=await p.evaluate(()=>{const x=__cad.buildPrintSVG();return{t:(x.svg.match(/<text/g)||[]).length,o:(x.svg.match(/class="ob"/g)||[]).length,dia:/>Ø80</.test(x.svg),rad:/>R40</.test(x.svg),m:/>100</.test(x.svg),w:x.w0}});
 ok(r.t===5&&r.o===2&&r.dia&&r.rad&&r.m,'Druckansicht: 2 Konturen, 5 Maßzahlen (100, Ø80, R40)',JSON.stringify(r));
 r=await p.evaluate(()=>__cad.importDXF(__cad.buildDXF(__cad.S.ents)).ents.filter(e=>e.t==='text').map(e=>e.s).join());ok(/Ø80/.test(r)&&/R40/.test(r),'DXF enthält Ø80 und R40',r);
 const jsD=await p.evaluate(()=>JSON.stringify({app:'OriginCAD',v:3,...__cad.S}));await p.setInputFiles('#file',{name:'Masse.json',mimeType:'application/json',buffer:Buffer.from(jsD)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Masse.json'));
 ok((await ents()).filter(e=>e.t==='dim'&&e.c).length===2,'Radius-/Durchmessermaße werden gespeichert und geladen');

 console.log('Aufgeräumte Oberfläche');
 await fresh();await p.evaluate(()=>{if(__cad.tg.cam)__cad.act('cam')});r=await p.evaluate(()=>({keys:!!document.querySelector('.keys'),leg:document.getElementById('legend').hidden,acts:getComputedStyle(document.querySelector('.acts')).display,mob:getComputedStyle(document.getElementById('t_cam')).display,cols:getComputedStyle(document.getElementById('tools')).gridTemplateColumns.split(' ').length,scroll:document.getElementById('tools').scrollHeight-document.getElementById('tools').clientHeight}));
 ok(!r.keys&&r.leg&&r.acts==='flex'&&r.mob==='none'&&r.cols===2&&r.scroll<=0,'Zeichenprogramm: Werkzeuge zweispaltig, Spickzettel weg, Legende aus, Vorschau/3D/Export oben rechts',JSON.stringify(r));
 await p.click('#a_cam');ok(!(await p.evaluate(()=>document.getElementById('legend').hidden))&&(await p.evaluate(()=>document.getElementById('a_cam').classList.contains('on'))),'Fräsvorschau oben einschalten: Knopf leuchtet, Farblegende erscheint');await p.click('#a_cam');
 await p.click('.acts [data-a="exportSvg"]');ok(await p.evaluate(()=>document.getElementById('dExp').classList.contains('open')),'„SVG für Origin“ oben öffnet den Export');await p.keyboard.press('Escape');

 console.log('3D-Modus');
 await fresh();await C('R','0,0','400,300','K','200,150','50');await p.keyboard.press('Escape');await p.click('.mbtn[data-a="raum"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>RAUM.isOpen()&&RAUM.state.bodies.length===0&&!document.getElementById('rmempty').hidden&&RAUM.tool==='sel'),'3D-Modus öffnet leer, Werkzeug „Auswählen“, Hinweis zum Anfangen');
 const rb=await p.locator('#rm3d').boundingBox(),P=w=>p.evaluate(w=>RAUM.viewer.project(w),w),clickW=async w=>{const s=await P(w);await p.mouse.move(rb.x+s[0],rb.y+s[1]);await p.mouse.click(rb.x+s[0],rb.y+s[1])};
 // Werkzeugleiste und Tasten wie SketchUp
 r=await p.evaluate(()=>[...document.querySelectorAll('#rmtools [data-tool]')].map(b=>b.dataset.tool).join());ok(r==='sel,erase,paint,rect,circ,push,move,rot,tape,orbit,pan,zall','Werkzeugleiste: Auswählen, Radiergummi, Farbeimer, Rechteck, Kreis, Drücken/Ziehen, Verschieben, Drehen, Maßband, Ansicht',r);
 for(const[k,t]of[['r','rect'],['c','circ'],['p','push'],['m','move'],['q','rot'],['t','tape'],['e','erase'],['b','paint'],[' ','sel']]){await p.keyboard.press(k===' '?'Space':k);if((await p.evaluate(()=>RAUM.tool))!==t){ok(false,'Taste '+k+' → '+t);break}}
 ok(await p.evaluate(()=>document.querySelector('#rmtools [data-tool="sel"]').classList.contains('on')),'Tasten R C P M Q T E B Leertaste wechseln das Werkzeug');
 // Rechteck auf den Boden, Maße eintippen
 await p.keyboard.press('r');await clickW([0,0,0]);ok(await p.evaluate(()=>RAUM.op&&RAUM.op.t==='rect'&&/Gegenüberliegende/.test(document.getElementById('rmstat').textContent)),'Rechteck: erste Ecke gesetzt, unten steht der nächste Schritt');
 const s0=await P([0,0,0]);await p.mouse.move(rb.x+s0[0]+60,rb.y+s0[1]-30,{steps:3});r=await p.evaluate(()=>document.getElementById('rmvcb').value);ok(/^\d+;\d+$/.test(r),'Beim Aufziehen zeigt das Feld „Maße“ Länge;Breite',r);
 await p.keyboard.type('800;300');ok((await p.evaluate(()=>[document.activeElement.id,document.getElementById('rmvcb').value].join()))==='rmvcb,800;300','Lostippen landet im Feld „Maße“ (überschreibt den angezeigten Wert)');
 await p.keyboard.press('Enter');r=await p.evaluate(()=>{const b=RAUM.state.bodies[0];return{n:RAUM.state.bodies.length,k:b.kind,d:[b.L,b.B,b.H],o:b.o,foc:document.activeElement.id}});
 ok(r.n===1&&r.k==='plane'&&r.d.join()==='800,300,0'&&r.o.join()==='0,0,0'&&r.foc!=='rmvcb','Rechteck 800 × 300 auf dem Boden gezeichnet',JSON.stringify(r));
 await p.evaluate(()=>RAUM.viewer.fit());
 // Drücken/Ziehen mit Maß
 await p.keyboard.press('p');await clickW([400,150,0]);await p.keyboard.type('19');await p.keyboard.press('Enter');
 r=await p.evaluate(()=>{const b=RAUM.state.bodies[0];return{k:b.kind,H:b.H,box:RAUM.box(b)}});ok(r.k==='box'&&r.H===19&&r.box.join()==='0,0,0,800,300,19','Drücken/Ziehen: Fläche angeklickt, 19 eingetippt → Platte 800 × 300 × 19',JSON.stringify(r));
 await p.keyboard.type('25');await p.keyboard.press('Enter');ok((await p.evaluate(()=>RAUM.state.bodies[0].H))===25,'Gleich danach 25 eintippen ändert den letzten Zug (wie SketchUp)');
 await p.keyboard.press('Control+z');ok((await p.evaluate(()=>RAUM.state.bodies[0].H))===19,'Strg+Z nimmt das zurück');
 // Ziehen mit der Maus: Seitenfläche
 await p.evaluate(()=>RAUM.viewer.view('iso'));await p.evaluate(()=>RAUM.viewer.fit());
 r=await p.evaluate(()=>{const V=RAUM.viewer,c=[0,150,10],a=V.project(c),b=V.project([-120,150,10]);return{a,b}});
 await p.mouse.move(rb.x+r.a[0],rb.y+r.a[1]);await p.mouse.down();await p.mouse.move(rb.x+(r.a[0]+r.b[0])/2,rb.y+(r.a[1]+r.b[1])/2,{steps:3});await p.mouse.move(rb.x+r.b[0],rb.y+r.b[1],{steps:3});await p.mouse.up();
 r=await p.evaluate(()=>RAUM.box(RAUM.state.bodies[0]));ok(Math.abs(r[0]+120)<=8&&r[3]===800,'Linke Fläche mit gedrückter Maus 120 nach außen gezogen, rechte Seite bleibt',r.join());await p.keyboard.press('Control+z');
 // Kreis auf die Platte und hochziehen
 await p.keyboard.press('c');await clickW([400,150,19]);await p.keyboard.type('40');await p.keyboard.press('Enter');
 r=await p.evaluate(()=>{const b=RAUM.state.bodies[1];return b&&{k:b.kind,L:b.L,H:b.H,o:b.o}});ok(r&&r.k==='cyl'&&r.L===80&&r.H===0&&r.o.join()==='360,110,19','Kreis Radius 40 auf die Platte gezeichnet (liegt auf der Oberseite)',JSON.stringify(r));
 await p.keyboard.press('p');await clickW([400,150,19]);await p.keyboard.type('100');await p.keyboard.press('Enter');
 r=await p.evaluate(()=>{const b=RAUM.state.bodies[1];return{n:b.name,H:b.H,box:RAUM.box(b)}});ok(r.n==='Zylinder'&&r.H===100&&r.box[2]===19&&r.box[5]===119,'Kreisfläche 100 hochgezogen → Zylinder steht auf der Platte',JSON.stringify(r));
 // Verschieben mit Pfeiltaste (Richtung sperren) und Abstand
 await p.keyboard.press('m');await clickW([400,150,119]);await p.keyboard.press('ArrowRight');const sm=await P([400,150,119]);await p.mouse.move(rb.x+sm[0]+60,rb.y+sm[1]+5,{steps:4});
 await p.keyboard.type('150');await p.keyboard.press('Enter');r=await p.evaluate(()=>RAUM.box(RAUM.state.bodies[1]));ok(r[0]===510&&r[1]===110&&r[2]===19,'Verschieben: Pfeil → sperrt auf die rote Achse, 150 eingetippt → genau 150 nach rechts',r.join());
 // Drehen
 await p.keyboard.press('q');await p.keyboard.press('ArrowRight');await clickW([400,150,10]);r=await p.evaluate(()=>RAUM.box(RAUM.state.bodies[0]));ok(r.join()==='0,0,0,800,19,300','Drehen 90° um die rote Achse: Platte steht hochkant, Ecke bleibt',r.join());
 await p.keyboard.press('Control+z');
 // Maßband
 await p.keyboard.press('t');await clickW([0,0,0]);await clickW([800,0,0]);r=await p.evaluate(()=>({v:document.getElementById('rmvcb').value,t:RAUM.tapeRes}));ok(r.v==='800'&&r.t,'Maßband: von Ecke zu Ecke gemessen = 800',JSON.stringify(r));
 // Farbeimer und Radiergummi
 await p.keyboard.press('Escape');await p.click('#rmside details[data-sec="mat"] summary');await p.click('[data-mat="H3303"]');await p.keyboard.press('b');await clickW([400,150,10]);
 ok((await p.evaluate(()=>RAUM.state.bodies[0].mat))==='H3303','Farbeimer: Material rechts gewählt, Körper angeklickt → H3303');
 await p.keyboard.press('e');await clickW([550,150,60]);ok((await p.evaluate(()=>RAUM.state.bodies.length))===1,'Radiergummi löscht den angeklickten Körper');await p.keyboard.press('Control+z');
 await p.keyboard.press('Escape');ok((await p.evaluate(()=>RAUM.tool))==='sel','Esc zurück zum Auswählen');
 // Auswählen + ziehen, Objektinfo
 await p.click('#rmside [data-prim="box"]');await p.fill('#rs_L','400');await p.keyboard.press('Enter');await p.fill('#rs_H','25');await p.keyboard.press('Enter');
 r=await p.evaluate(()=>{const b=RAUM.state.bodies[2];return{d:[b.L,b.B,b.H],x:RAUM.box(b)[0]}});ok(r.d.join()==='400,400,25'&&r.x===850,'Einfügen › Quader, Maße in der Objektinfo geändert, steht neben dem Vorhandenen',JSON.stringify(r));
 r=await p.evaluate(()=>{const b=RAUM.state.bodies[2],m=RAUM.box(b),V=RAUM.viewer;return{a:V.project([(m[0]+m[3])/2,(m[1]+m[4])/2,m[5]]),b:V.project([(m[0]+m[3])/2-45,(m[1]+m[4])/2,m[5]])}});
 await p.mouse.move(rb.x+r.a[0],rb.y+r.a[1]);await p.mouse.down();await p.mouse.move(rb.x+(r.a[0]+r.b[0])/2,rb.y+(r.a[1]+r.b[1])/2,{steps:3});await p.mouse.move(rb.x+r.b[0],rb.y+r.b[1],{steps:3});await p.mouse.up();
 r=await p.evaluate(()=>RAUM.box(RAUM.state.bodies[2]));ok(r[0]===800,'Auswählen: Körper 45 nach links gezogen, rastet bündig an der Platte ein (X = 800)',r.join());
 await p.keyboard.press('Control+d');r=await p.evaluate(()=>({n:RAUM.state.bodies.length,l:RAUM.list().map(x=>x.n+'x'+x.d.join('/')).join(' ')}));ok(r.n===4&&/2x400\/400\/25/.test(r.l),'Strg+D kopiert, Stückliste fasst gleiche Körper zusammen',JSON.stringify(r));
 await p.keyboard.press('Delete');ok((await p.evaluate(()=>RAUM.state.bodies.length))===3,'Entf löscht den gewählten Körper');
 // Kontur hochziehen und Schrank holen
 await p.fill('#rn_X','25');await p.click('#rn_ext');r=await p.evaluate(()=>{const b=RAUM.state.bodies[3];return{k:b.kind,d:[b.L,b.B,b.H],holes:b.poly.holes.length}});ok(r.k==='ext'&&r.d.join()==='400,300,25'&&r.holes===1,'Kontur aus der Zeichnung hochgezogen (Rechteck mit Loch)',JSON.stringify(r));
 await p.click('#rn_kp');ok((await p.evaluate(()=>RAUM.state.bodies.length))===4+8,'Schrank aus dem Korpusplaner geholt (8 Körper)');
 await p.click('[data-rm="list"]');ok((await p.evaluate(()=>document.querySelectorAll('#rmlBody tr').length))>8,'Fenster Stückliste und Zuschnitt');await p.keyboard.press('Escape');
 const dl3=p.waitForEvent('download');await p.click('[data-rm="pic"]');const D3=await dl3;ok(/-3D\.png$/.test(D3.suggestedFilename())&&fs.statSync(await D3.path()).size>5000,'Bild speichern: '+D3.suggestedFilename());
 if(SHOTS)await p.screenshot({path:path.join(SHOTS,'09-3d-modus.png')});
 // Grundkörper
 const n0=await p.evaluate(()=>RAUM.state.bodies.length);for(const k of['sph','cyl','cone','tor','plane'])await p.click(`#rmside [data-prim="${k}"]`);
 r=await p.evaluate(n0=>RAUM.state.bodies.slice(n0).map(b=>b.kind+':'+RAUM.box(b).slice(3).map((v,i)=>v-RAUM.box(b)[i]).join('/')).join(' '),n0);
 ok(r==='sph:200/200/200 cyl:200/200/300 cone:200/200/300 tor:300/300/60 plane:1000/1000/0','Grundkörper: Kugel, Zylinder, Kegel, Torus, Ebene',r);
 r=await p.evaluate(()=>{const s={kind:'sph',L:200,B:200,H:200,o:[0,0,0],u:[1,0,0],v:[0,1,0]};RAUM.resize(s,{i:0,sign:1},50);const c={kind:'cyl',L:200,B:200,H:300,o:[0,0,0],u:[1,0,0],v:[0,1,0]};RAUM.resize(c,{i:2,sign:1},100);const e={kind:'ext',L:100,B:100,H:19,o:[0,0,0],u:[1,0,0],v:[0,1,0]};
  const f={kind:'plane',name:'Fläche',L:100,B:100,H:0,o:[0,0,0],u:[1,0,0],v:[0,1,0]};RAUM.resize(f,{i:2,sign:1},-30);return{s:[s.L,s.H,RAUM.box(s)[0]],c:[c.L,c.H],e:RAUM.resize(e,{i:0,sign:1},10),f:[f.kind,f.H,f.o[2]]}});
 ok(r.s.join()==='300,300,-50'&&r.c.join()==='200,400'&&/Formteil/.test(r.e)&&r.f.join()==='box,30,-30','Ziehen: Kugel um die Mitte · Zylinder Höhe · Formteil nur Höhe · flache Fläche auch nach unten',JSON.stringify(r));
 const jsR=await p.evaluate(()=>JSON.stringify({app:'OriginCAD',v:3,...__cad.S}));const nR=await p.evaluate(()=>RAUM.state.bodies.length);await p.click('[data-rm="close"]');await fresh();await p.setInputFiles('#file',{name:'Raum.json',mimeType:'application/json',buffer:Buffer.from(jsR)});await p.waitForFunction(()=>document.getElementById('fname').textContent.startsWith('Raum.json'));
 ok((await p.evaluate(()=>__cad.S.raum&&__cad.S.raum.bodies.length))===nR,'3D-Modell wird mit der Zeichnung gespeichert und geladen');

 console.log('Darstellung');
 for(const[n,vp]of[['tablet',{width:1024,height:768}],['handy',{width:390,height:844}]]){const q=await open(vp);await q.evaluate(()=>__cad.act('cam'));
  const o=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth,cv:document.getElementById('cv').clientHeight}));ok(o.sw<=o.w&&o.cv>150,`${n}: nichts läuft seitlich über, Zeichenfläche sichtbar`,JSON.stringify(o));
  if(SHOTS)await q.screenshot({path:path.join(SHOTS,'06-'+n+'.png')});await q.close()}
 ok(errs.length===0,'keine Skriptfehler',errs.join(' | '));
 await b.close();srv.close();console.log(fails?`\n${fails} FEHLER`:'\nAlles in Ordnung.');process.exit(fails?1:0)})();
