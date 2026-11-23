/* Origin CAD – Korpusplaner: Schränke über Maße planen, Böden/Mittelwände mit der Maus setzen,
   daraus Einzelteile mit Bohrungen (für die Origin), Stückliste und 3D-Ansicht.
   Daten liegen in der Zeichnung unter S.korpus und werden mitgespeichert.
   Koordinaten im Raum: X = Breite (links→rechts), Y = Tiefe (vorn = 0), Z = Höhe. */
window.KORPUS=(()=>{
const A=window.__cad.kp,$=id=>document.getElementById(id),S=()=>window.__cad.S;
const newCab=(o={})=>Object.assign({zo:0,sfh:140,b:600,h:720,d:560,ks:[],mw:[],fb:[],eb:[{x:300,y:350}],front:'2',sn:3,nm:0,nf:0,ne:1},o);
const DEF=()=>({...BT,t:19,rw:8,nt:10,na:20,fuge:3,sockel:false,sh:100,sr:50,lr:'boden',dub:true,topf:true,nut:true,cabs:[newCab()]});
const DUB_D=8,DUB_T=12,LR_D=5,LR_T=13,TOPF_D=35,TOPF_T=13,SK=16,TANDEM_NL=[250,270,300,350,400,450,500,550,600];
const openSec=new Set(['cab','in']);let cur=0,pick=null,mode='sel',showFront=true,V3=null,drag=null,view={s:1,ox:0,oy:0},cache3=new Map(),timer=0;
/* Bodenträger: Häfele „Jimmy“ (282.25.716) zum Einstecken, Bohr-Ø 4 mm – btD Bohr-Ø, btT Bohrtiefe, btA Lochmitte unter der Boden-Unterkante */
/* Beispielhafte Dekore aus dem EGGER-Programm (Farben am Bildschirm nur ungefähr) */
const MATS=[['','Holz neutral (ohne Dekor)',[0.86,0.72,0.52]],['W1000','Premiumweiß',[0.95,0.95,0.94]],['W980','Platinweiß',[0.92,0.92,0.89]],['U708','Hellgrau',[0.79,0.80,0.79]],['U702','Kaschmirgrau',[0.77,0.73,0.67]],['U732','Staubgrau',[0.55,0.55,0.53]],['U961','Graphitgrau',[0.27,0.28,0.29]],['U999','Schwarz',[0.11,0.11,0.12]],
 ['H1145','Bardolino Eiche natur',[0.80,0.68,0.52]],['H3303','Hamilton Eiche natur',[0.76,0.60,0.42]],['H1180','Halifax Eiche natur',[0.71,0.55,0.37]],['H3331','Nebraska Eiche natur',[0.69,0.51,0.33]],['H1344','Sherman Eiche cognacbraun',[0.55,0.36,0.22]],['H3700','Nussbaum Pacific natur',[0.45,0.30,0.20]]];
const mat=id=>MATS.find(m=>m[0]===id)||MATS[0],matName=id=>id?`EGGER ${id} ${mat(id)[1]}`:'–',css=(c,f=1)=>`rgb(${c.map(v=>Math.round(Math.min(1,v*f)*255)).join(',')})`;
const BT={kb:0,griff:'n',grA:128,grR:50,grO:80,plL:2800,plB:2070,kerf:4,rand:10,matK:'',matF:'',matR:'',ksD:25,btD:4,btT:10,btA:2,sv:true,svT:14,svX:9.5,svO:0,svB:13};
/* Würth Systemverbinder SV 20 E: Gehäuse Ø20 in der Fläche des waagrechten Teils (svT tief, Mitte svX von der Stirnkante),
   Systembolzen in Ø5-Bohrung der Seite (svB tief), 37 mm von vorn und hinten; svO = Bolzen über (+) / unter (−) der Plattenmitte */
const SV_D=20,SV_BD=5;
/* Geladene Planung prüfen (Datei oder Browserspeicher sind nicht vertrauenswürdig) */
const FRONTS=['n','l','r','2','s','ml','mr','m2'];
/* erlaubte Bereiche wie im Formular (geladene Werte werden darauf begrenzt) */
const RNG={t:[5,60],rw:[3,25],fuge:[0,20],sh:[30,300],sr:[0,200],btD:[2,12],btT:[3,16],btA:[0,20],svT:[5,25],svX:[5,20],svO:[-10,10],svB:[5,25],plL:[500,6000],plB:[300,3000],kerf:[0,10],rand:[0,50],grA:[32,800],grR:[15,300],grO:[15,600],kb:[0,5],nt:[3,20],na:[5,100],ksD:[15,40]};
function clean(o){if(!o||typeof o!=='object'||!Array.isArray(o.cabs))return null;const d=DEF(),k={},fin=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e5;
 for(const f of Object.keys(d)){if(f==='cabs')continue;const dv=d[f],v=o[f];if(typeof dv==='number')k[f]=fin(v)?v:dv;else if(typeof dv==='boolean')k[f]=typeof v==='boolean'?v:dv;else k[f]=dv}
 for(const f in RNG)k[f]=clampN(k[f],RNG[f][0],RNG[f][1]);
 k.lr=['boden','voll','aus'].includes(o.lr)?o.lr:d.lr;k.griff=['n','b'].includes(o.griff)?o.griff:d.griff;for(const f of['matK','matF','matR'])k[f]=MATS.some(m=>m[0]===o[f])?o[f]:'';
 const pts=a=>(Array.isArray(a)?a:[]).slice(0,60).filter(q=>q&&fin(q.x)&&fin(q.y)).map(q=>({x:q.x,y:q.y}));
 k.cabs=o.cabs.slice(0,50).map(c=>{const n=newCab();if(!c||typeof c!=='object')return n;for(const f of['b','h','d','zo','sfh','sn','nm','nf','ne'])if(fin(c[f]))n[f]=c[f];n.front=FRONTS.includes(c.front)?c.front:'2';n.nm=clampN(Math.round(n.nm),0,6);n.nf=clampN(Math.round(n.nf),0,12);n.ne=clampN(Math.round(n.ne),0,12);
  n.mw=(Array.isArray(c.mw)?c.mw:[]).slice(0,20).filter(fin);n.fb=pts(c.fb);n.eb=pts(c.eb);n.ks=pts(c.ks);return n});if(!k.cabs.length)k.cabs=[newCab()];tidy(k);return k}
const K=()=>{const s=S();if(!s.korpus)s.korpus=DEF();for(const f in BT)if(s.korpus[f]==null)s.korpus[f]=BT[f];for(const c of s.korpus.cabs){if(!c.ks)c.ks=[];if(c.zo==null)c.zo=0;if(c.sfh==null)c.sfh=140}return s.korpus};
const num=v=>Math.round(v*100)/100,de=v=>String(num(v)).replace('.',',');
/* Zahl aus einem Feld – wie in der Befehlszeile darf gerechnet werden (720-2*19) */
const pnum=s=>{s=String(s).trim().replace(/,/g,'.');if(!s)return null;const v=A.ev?A.ev(s):parseFloat(s);return typeof v==='number'&&isFinite(v)?v:null};
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));

/* Unterkante des Korpus über dem Boden: eigener Wert (Hängeschrank) oder Sockelhöhe */
const cz=(k,c)=>c.zo>0?c.zo:(k.sockel?k.sh:0);
/* Sockel nur unter zusammenhängenden Korpussen, die auf dem Boden stehen */
function sockelRuns(k){const o=[];if(!k.sockel)return o;let x=0,run=null;for(const c of k.cabs){if(!(c.zo>0)){if(!run){run={xa:x,xb:x,dm:c.d,n:[]};o.push(run)}run.xb=x+c.b;run.dm=Math.min(run.dm,c.d);run.n.push(x+c.b)}else run=null;x+=c.b}return o}
/* Fronten eines Korpus in Korpus-Koordinaten: [{typ:'t'|'s', side, x, z, w, h}] */
function fronts(c,k){const fg=k.fuge,o=[],doors=(ty,z,h)=>{if(ty==='l'||ty==='r')o.push({typ:'t',side:ty,x:fg,z,w:c.b-2*fg,h});else if(ty==='2'){const w=(c.b-3*fg)/2;o.push({typ:'t',side:'l',x:fg,z,w,h},{typ:'t',side:'r',x:2*fg+w,z,w,h})}};
 if(c.front==='s'){const n=c.sn,h=(c.h-(n+1)*fg)/n;for(let i=0;i<n;i++)o.push({typ:'s',x:fg,z:fg+i*(h+fg),w:c.b-2*fg,h})}
 else if(c.front[0]==='m'){const hs=clampN(c.sfh||140,80,c.h-300),hd=c.h-3*fg-hs;doors(c.front[1],fg,hd);o.push({typ:'s',x:fg,z:2*fg+hd,w:c.b-2*fg,h:hs})}
 else doors(c.front,fg,c.h-2*fg);return o}
/* ----- Fächer ----- */
function comps(c,k){const xs=[...c.mw].sort((a,b)=>a-b),o=[];let x=k.t;for(const w of xs){o.push({x0:x,x1:w});x=w+k.t}o.push({x0:x,x1:c.b-k.t});return o}
const compAt=(c,k,x)=>{const cs=comps(c,k);return cs.find(f=>x>=f.x0&&x<=f.x1)||cs.reduce((a,f)=>Math.abs((f.x0+f.x1)/2-x)<Math.abs((a.x0+a.x1)/2-x)?f:a)};
function spread(c,k){const iw=c.b-2*k.t,ih=(c.front[0]==='m'?c.h-(c.sfh||140)-2*k.fuge-40:c.h-k.t)-k.t;/* bei Schubkasten oben nur bis darunter verteilen */c.mw=[];for(let i=0;i<c.nm;i++)c.mw.push(num(k.t+(iw-c.nm*k.t)/(c.nm+1)*(i+1)+i*k.t));
 c.fb=[];c.eb=[];const all=c.nf+c.ne;
 for(const f of comps(c,k)){const x=num((f.x0+f.x1)/2);for(let i=0;i<all;i++){const y=num(k.t+(ih-all*k.t)/(all+1)*(i+1)+i*k.t);/* feste Böden möglichst in die Mitte */
   const fixed=c.nf>0&&isFixedSlot(i,all,c.nf);(fixed?c.fb:c.eb).push({x,y})}}}
function isFixedSlot(i,all,nf){const pos=[];for(let j=0;j<nf;j++)pos.push(Math.round((all-1)*(j+1)/(nf+1)));return pos.includes(i)}
function tidy(k){for(const c of k.cabs){c.b=clampN(c.b,150,3000);c.h=clampN(c.h,150,3000);c.d=clampN(c.d,120,1200);
  c.mw=c.mw.map(x=>num(clampN(x,k.t+40,c.b-2*k.t-40))).sort((a,b)=>a-b);for(let i=1;i<c.mw.length;i++)c.mw[i]=Math.max(c.mw[i],num(c.mw[i-1]+k.t+40));c.mw=c.mw.filter(x=>x<=c.b-2*k.t-40);/* Mittelwände nie übereinander */
  if(!c.ks)c.ks=[];for(const l of[c.fb,c.eb])for(const s of l){s.y=num(clampN(s.y,k.t+20,c.h-2*k.t-20));s.x=clampN(s.x,k.t+1,c.b-k.t-1)}
  for(const s of c.ks){s.y=num(clampN(s.y,k.t+30,c.h-k.t-25));s.x=clampN(s.x,k.t+1,c.b-k.t-1)}
  {const lim=Math.max(0,k.t/2-3);k.svO=clampN(k.svO,-lim,lim)}
  if(c.front==='s'){c.mw=[];c.nm=0;c.fb=[];c.eb=[];c.ks=[]}
  if(c.front[0]==='m'){c.mw=[];c.nm=0;c.sfh=clampN(c.sfh||140,80,Math.max(80,c.h-300));const top=c.h-c.sfh-2*k.fuge-40;for(const l of[c.fb,c.eb])for(const q of l)q.y=Math.min(q.y,num(top-k.t));for(const q of c.ks)q.y=Math.min(q.y,num(top));
   /* unter dem Schubkasten (und ohne Mittelwand) können Böden aufeinander liegen: doppelte entfernen */const dd=l=>l.filter((q,i)=>!l.slice(0,i).some(o=>Math.abs(o.y-q.y)<k.t));c.fb=dd(c.fb);c.eb=dd(c.eb).filter(q=>!c.fb.some(o=>Math.abs(o.y-q.y)<k.t));c.ks=dd(c.ks)}
  if(c.front[0]!=='m'&&c.front!=='s')c.nm=c.mw.length;c.zo=clampN(c.zo||0,0,2600);c.sn=clampN(Math.round(c.sn)||1,1,8)}}

/* ----- Teile erzeugen ----- */
function dubPos(len){const steps=Math.floor((len-64)/32);if(steps<1)return[num(len/2)];const n=Math.max(2,Math.round(steps*32/192)+1),o=[];for(let i=0;i<n;i++)o.push(32+32*Math.round(i*steps/(n-1)));return[...new Set(o)]}
function dubSv(len){/* Dübel zwischen den Verbindern: 64 hinter dem vorderen und vor dem hinteren, ab 300 mm Abstand einer in der Mitte */const a=101,b=len-101;if(b-a<32)return[num(len/2)];const o=[a];if(b-a>300)o.push(a+32*Math.round((b-a)/64));o.push(num(b));return o}
function hingeYs(H){const n=H>1600?4:H>900?3:H>=150?2:1;if(n===1)return[num(H/2)];/* bei niedrigen Türen näher an die Kanten, aber mind. 40 mm */const m=Math.min(100,Math.max(40,(H-80)/2)),o=[];for(let i=0;i<n;i++)o.push(num(m+(H-2*m)*i/(n-1)));return o}
function parts(k){k=k||K();const out=[],t=k.t;let x0=0;out.warn=[];
 const mk=(ci,name,W,H,T,o,u,v,x={})=>{const p=Object.assign({ci,name,W:num(W),H:num(H),T,o,u,v,holes:[],grooves:[],ticks:[],tint:[1,1,1]},x);p.matId=p.rod?'':p.isFront?k.matF:p.mat==='Rückwand'?k.matR:k.matK;if(p.matId)p.tint=p.name.startsWith('Sockel')?[0.8,0.8,0.8]:[1,1,1];out.push(p);return p};
 k.cabs.forEach((c,ci)=>{const z0=cz(k,c),dE=k.nut?c.d-k.na-k.rw:c.d,svs=k.sv&&dE>=140?[37,dE-37]:[],xs=!k.dub?[]:svs.length?dubSv(dE):dubPos(dE),xs0=xs,svs0=svs;
  const SL=mk(ci,'Seite links',c.d,c.h,t,[x0,0,z0],[0,1,0],[0,0,1],{front:'x0'}),SR=mk(ci,'Seite rechts',c.d,c.h,t,[x0+c.b,c.d,z0],[0,-1,0],[0,0,1],{front:'xW'});
  const BO=mk(ci,'Boden',c.b-2*t,c.d,t,[x0+t,0,z0],[1,0,0],[0,1,0],{front:'y0'}),DE=mk(ci,'Deckel',c.b-2*t,c.d,t,[x0+t,c.d,z0+c.h],[1,0,0],[0,-1,0],{front:'yH'});
  const hole=(p,x,y,d,depth,back,mark,pin)=>p.holes.push({x:num(x),y:num(y),d,depth,back:!!back,...(mark?{mark:1}:{}),...(pin?{pin:1}:{})});
  /* Flächen, in die von links/rechts gebohrt wird: face(xKante, 'l'|'r') liefert Funktion (Tiefe, Höhe, Ø, Bohrtiefe) */
  const walls=[...c.mw].sort((a,b)=>a-b).map(x=>({x,p:mk(ci,'Mittelwand',dE,c.h-2*t,t,[x0+x,0,z0+t],[0,1,0],[0,0,1],{front:'x0'})}));
  const faceL=xEdge=>{if(Math.abs(xEdge-t)<1e-6)return(dp,z,d,dt,m,pin)=>hole(SL,dp,z,d,dt,false,m,pin);const w=walls.find(w=>Math.abs(w.x+t-xEdge)<1e-6);return w?(dp,z,d,dt,m,pin)=>hole(w.p,dp,z-t,d,dt,false,m,pin):()=>{}};
  const faceR=xEdge=>{if(Math.abs(xEdge-(c.b-t))<1e-6)return(dp,z,d,dt,m,pin)=>hole(SR,c.d-dp,z,d,dt,false,m,pin);const w=walls.find(w=>Math.abs(w.x-xEdge)<1e-6);return w?(dp,z,d,dt,m,pin)=>hole(w.p,dp,z-t,d,dt,true,m,pin):()=>{}};
  /* Dübel Boden/Deckel ↔ Seiten */
  for(const zc of[t/2,c.h-t/2])for(const dx of xs){hole(SL,dx,zc,DUB_D,DUB_T);hole(SR,c.d-dx,zc,DUB_D,DUB_T)}
  for(const dx of xs){BO.ticks.push({x:0,y:dx,e:'l'},{x:BO.W,y:dx,e:'r'});DE.ticks.push({x:0,y:c.d-dx,e:'l'},{x:DE.W,y:c.d-dx,e:'r'})}
  /* Systemverbinder Boden/Deckel ↔ Seiten: Gehäuse innen im Boden (oben) und im Deckel (unten) */
  for(const dx of svs){for(const[zc,sg]of[[t/2,1],[c.h-t/2,-1]]){hole(SL,dx,zc+sg*k.svO,SV_BD,k.svB);hole(SR,c.d-dx,zc+sg*k.svO,SV_BD,k.svB)}
   for(const x of[k.svX,BO.W-k.svX]){hole(BO,x,dx,SV_D,k.svT);hole(DE,x,c.d-dx,SV_D,k.svT)}}
  /* Rückwand */
  if(k.nut){SL.grooves.push({x:dE,y:-4,w:k.rw,h:c.h+8,depth:k.nt});SR.grooves.push({x:k.na,y:-4,w:k.rw,h:c.h+8,depth:k.nt});
   BO.grooves.push({x:-4,y:dE,w:BO.W+8,h:k.rw,depth:k.nt});DE.grooves.push({x:-4,y:k.na,w:DE.W+8,h:k.rw,depth:k.nt});
   mk(ci,'Rückwand',c.b-2*t+2*(k.nt-1),c.h-2*t+2*(k.nt-1),k.rw,[x0+t-(k.nt-1),dE+k.rw,z0+t-(k.nt-1)],[1,0,0],[0,0,1],{mat:'Rückwand',tint:[1.08,1.1,1.12]})}
  else mk(ci,'Rückwand (aufgeschraubt)',c.b,c.h,k.rw,[x0,c.d+k.rw,z0],[1,0,0],[0,0,1],{mat:'Rückwand',tint:[1.08,1.1,1.12]});
  /* Mittelwände ↔ Boden/Deckel */
  for(const w of walls)for(const dx of xs){hole(BO,w.x-t/2,dx,DUB_D,DUB_T);hole(DE,w.x-t/2,c.d-dx,DUB_D,DUB_T);w.p.ticks.push({x:dx,y:0,e:'b'},{x:dx,y:w.p.H,e:'t'})}
  /* feste Böden */
  for(const s of c.fb){const f=compAt(c,k,s.x),p=mk(ci,'Fester Boden',f.x1-f.x0,dE,t,[x0+f.x0,dE,z0+s.y+t],[1,0,0],[0,-1,0],{front:'yH'}),L=faceL(f.x0),R=faceR(f.x1);/* Zeichnung zeigt die Unterseite */
   /* liegt im Nachbarfach (hinter einer Mittelwand) ein fester Boden auf fast gleicher Höhe, wird in jedem zweiten Fach das Bohrbild um 16 mm versetzt –
      so treffen sich die Bohrungen von beiden Seiten der Wand nie, auch bei mehreren Mittelwänden */
   const cs=comps(c,k),fi=cs.findIndex(q=>Math.abs(q.x0-f.x0)<1e-6),nb=[cs[fi-1],cs[fi+1]].filter(Boolean),clash=fi%2===1&&c.fb.some(o=>o!==s&&Math.abs(o.y-s.y)<40&&nb.some(q=>Math.abs(compAt(c,k,o.x).x0-q.x0)<1e-6)),SH=v=>clash?(v+16<=dE-20?v+16:v-16):v,xs=xs0.map(SH),svs=svs0.map(SH);
   for(const dx of xs){L(dx,s.y+t/2,DUB_D,DUB_T);R(dx,s.y+t/2,DUB_D,DUB_T);p.ticks.push({x:0,y:dE-dx,e:'l'},{x:p.W,y:dE-dx,e:'r'})}
   for(const dx of svs){L(dx,s.y+t/2-k.svO,SV_BD,k.svB);R(dx,s.y+t/2-k.svO,SV_BD,k.svB);hole(p,k.svX,dE-dx,SV_D,k.svT);hole(p,p.W-k.svX,dE-dx,SV_D,k.svT)}}
  /* Einlegeböden + Lochreihen */
  const cols=[37,dE-37];
  for(const s of c.eb){const f=compAt(c,k,s.x);mk(ci,'Einlegeboden',f.x1-f.x0-2,dE-10,t,[x0+f.x0+1,10,z0+s.y],[1,0,0],[0,1,0],{front:'y0',tint:[1.04,1.04,1.04]});
   if(k.lr==='boden'){const L=faceL(f.x0),R=faceR(f.x1);for(const dz of[-32,0,32]){const z=s.y-k.btA+dz;if(z<t+15||z>c.h-t-15)continue;for(const dp of cols){L(dp,z,k.btD,k.btT,0,1);R(dp,z,k.btD,k.btT,0,1)}}}}
  if(k.lr==='voll')for(const f of comps(c,k)){const L=faceL(f.x0),R=faceR(f.x1),fix=c.fb.filter(s=>Math.abs(compAt(c,k,s.x).x0-f.x0)<1e-6);
   for(let z=t+64;z<=c.h-t-64+1e-6;z+=32){if(fix.some(s=>z>s.y-12&&z<s.y+t+12))continue;for(const dp of cols){L(dp,z,k.btD,k.btT,0,1);R(dp,z,k.btD,k.btT,0,1)}}}
  /* Kleiderstangen: Stange in der Mitte der Tiefe, Lagermitte an den Seiten nur angezeichnet */
  for(const s of c.ks||[]){const f=compAt(c,k,s.x),D=k.ksD;mk(ci,'Kleiderstange Ø'+de(D),f.x1-f.x0-4,D,D,[x0+f.x0+2,dE/2+D/2,z0+s.y-D/2],[1,0,0],[0,0,1],{rod:true,mat:'Stange',tint:[0.9,0.95,1.05]});
   faceL(f.x0)(dE/2,s.y,D,0,1);faceR(f.x1)(dE/2,s.y,D,0,1)}
  /* Fronten */
  const fg=k.fuge,FT=[1.1,1.07,1.02];
  /* Bügelgriff: zwei durchgehende Löcher Ø5 im Lochabstand, in 3D als Stab */
  const grip=(p,quer,cx,cy,wx,wz)=>{if(k.griff!=='b')return;const a=k.grA/2,L=k.grA+20;if(quer?(cx-a<8||cx+a>p.W-8||cy<8||cy>p.H-8):(cy-a<8||cy+a>p.H-8||cx<8||cx>p.W-8))return;/* Griff passt nicht auf die Front */for(const s of[-1,1])hole(p,quer?cx+s*a:cx,quer?cy:cy+s*a,5,p.T);
   if(quer)mk(ci,'Griff '+de(k.grA),L,10,10,[wx-L/2,-t-22,wz-5],[1,0,0],[0,0,1],{rod:true,mat:'Griff',isFront:true,tint:[0.7,0.72,0.75]});
   else mk(ci,'Griff '+de(k.grA),L,10,10,[wx+5,-t-22,wz-L/2],[0,0,1],[-1,0,0],{rod:true,mat:'Griff',isFront:true,tint:[0.7,0.72,0.75]})};
  const door=f=>{const Wd=f.w,Hd=f.h,side=f.side,xR=f.x+f.w,p=mk(ci,'Tür '+(side==='l'?'links':'rechts'),Wd,Hd,t,[x0+xR,-t-2,z0+f.z],[-1,0,0],[0,0,1],{front:1,isFront:true,tint:FT});
   if(k.topf){const hx=side==='l'?Wd-21.5:21.5,sg=side==='l'?-1:1;
    const bz=c.fb.filter(s=>{const q=compAt(c,k,s.x);return side==='l'?Math.abs(q.x0-t)<1e-6:Math.abs(q.x1-(c.b-t))<1e-6}).map(s=>s.y+t/2-f.z);
    /* ausweichen nach oben oder unten, aber nie auf ein anderes Band (mind. 60 mm Abstand) */
    const y0=hingeYs(Hd),ys=[];for(let i=0;i<y0.length;i++){let y=y0[i];if(bz.some(b=>Math.abs(y-b)<45)){const oth=[...ys,...y0.slice(i+1)],ok=v=>v>=40&&v<=Hd-40&&!bz.some(o=>Math.abs(v-o)<45)&&!oth.some(o=>Math.abs(v-o)<60),cand=[];for(const b of bz)for(const s of[45,60,75,90,110])cand.push(b+s,b-s);const best=cand.filter(ok).sort((a,b)=>Math.abs(a-y)-Math.abs(b-y))[0];if(best!=null)y=best}ys.push(num(y))}
    for(const y of ys){hole(p,hx,y,TOPF_D,TOPF_T);hole(p,hx+sg*9.5,y+22.5,8,11);hole(p,hx+sg*9.5,y-22.5,8,11);
     for(const dz of[-16,16])side==='l'?hole(SL,37,f.z+y+dz,LR_D,LR_T):hole(SR,c.d-37,f.z+y+dz,LR_D,LR_T)}}
   /* Griff senkrecht an der Öffnungsseite; beim Hängeschrank unten, sonst oben */
   const gx=side==='l'?k.grR:Wd-k.grR,gy=c.zo>0?k.grO+k.grA/2:Hd-k.grO-k.grA/2;if(Hd>k.grA+2*k.grO)grip(p,false,gx,gy,x0+xR-gx,z0+f.z+gy)};
  /* Holzschubkasten auf Blum TANDEM (Vollauszug 560H): Innenbreite = lichte Weite − 42, Länge = Nennlänge − 10,
     Einbautiefe mind. Nennlänge + 3, Boden 13 zurückgesetzt, unten 14 und oben 7 Luft, Seitenstärke 16 */
  const drawer=(f,lo,hi)=>{if(Math.floor(hi-lo-14-7-9)<40)out.warn.push(`Korpus ${ci+1}: Schubkastenfach zu niedrig (${de(hi-lo)} mm) – die Zarge passt nicht hinein.`);const Hf=f.h,LW=c.b-2*t,bw=LW-10,NL=[...TANDEM_NL].reverse().find(l=>l+3<=dE)||TANDEM_NL[0],bl=NL-10,GR=6,hS=Math.max(40,Math.floor(hi-lo-14-7-9)),bx=x0+t+5,bz=z0+lo+14;
    const fp=mk(ci,'Schubkastenfront',f.w,Hf,t,[x0+f.x+f.w,-t-2,z0+f.z],[-1,0,0],[0,0,1],{isFront:true,tint:FT});grip(fp,true,f.w/2,Hf/2,x0+f.x+f.w/2,z0+f.z+Hf/2);
    const gS={x:-4,y:13,w:bl+8,h:k.rw,depth:GR};
    mk(ci,'Schubkasten Seite',bl,hS,SK,[bx,0,bz],[0,1,0],[0,0,1],{box:true,nl:NL}).grooves.push(gS);mk(ci,'Schubkasten Seite',bl,hS,SK,[bx+bw,bl,bz],[0,-1,0],[0,0,1],{box:true,nl:NL}).grooves.push({...gS});
    mk(ci,'Schubkasten Vorderstück',bw-2*SK,hS,SK,[bx+bw-SK,0,bz],[-1,0,0],[0,0,1],{box:true}).grooves.push({x:-4,y:13,w:bw-2*SK+8,h:k.rw,depth:GR});
    const hk=mk(ci,'Schubkasten Hinterstück',bw-2*SK,hS-13-k.rw,SK,[bx+SK,bl,bz+13+k.rw],[1,0,0],[0,0,1],{box:true});hole(hk,7,7,6,10,true);hole(hk,hk.W-7,7,6,10,true);
    mk(ci,'Schubkasten Boden',bw-2*SK+2*GR-1,bl-SK+GR-0.5,k.rw,[bx+SK-GR+0.5,SK-GR+0.5,bz+13],[1,0,0],[0,1,0],{box:true,mat:'Rückwand'})};
  const FR=fronts(c,k),zMin=Math.min(...FR.map(f=>f.z)),zMax=Math.max(...FR.map(f=>f.z+f.h));
  for(const f of FR){if(f.typ==='t')door(f);else drawer(f,f.z<=zMin+1e-6?t:f.z-fg/2,f.z+f.h>=zMax-1e-6?c.h-t:f.z+f.h+fg/2)}
 /* Bodenträger aufräumen: nicht in andere Löcher derselben Seite; von der Rückseite einer Mittelwand versetzt, wenn sie auf ein Loch der Vorderseite treffen */
  const isPin=h=>!!h.pin;
  for(const p of out){if(p.ci!==ci||!p.holes.length)continue;p.holes=p.holes.filter(h=>!isPin(h)||!p.holes.some(o=>o!==h&&!o.mark&&!isPin(o)&&o.back===h.back&&Math.hypot(o.x-h.x,o.y-h.y)<(o.d+h.d)/2+1));
   /* trifft ein Bodenträgerloch ein Loch von der anderen Seite (oder ein anderes Loch derselben Seite), wird es um 16 bzw. 32 mm verschoben, sonst weggelassen */
   {const seen=new Set();p.holes=p.holes.filter(h=>{if(!isPin(h))return true;const key=h.back+':'+Math.round(h.x*2)+':'+Math.round(h.y*2);if(seen.has(key))return false;seen.add(key);return true})}
   const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<(a.d+b.d)/2+1,drop=new Set();
   const bad=h=>p.holes.some(o=>o!==h&&!o.mark&&!drop.has(o)&&near(o,h)&&(o.back===h.back||o.depth+h.depth>=p.T-1));
   for(const h of p.holes.filter(isPin).sort((a,b)=>(b.back?1:0)-(a.back?1:0))){if(!bad(h))continue;const x1=h.x;let ok=false;for(const dx of[16,-16,32,-32]){const x=num(x1+dx);if(x<20||x>p.W-20)continue;h.x=x;if(!bad(h)){ok=true;break}}if(!ok){h.x=x1;drop.add(h)}}
   if(drop.size)p.holes=p.holes.filter(h=>!drop.has(h))}
  x0+=c.b});
 for(const r of sockelRuns(k)){const W=r.xb-r.xa,yb=r.dm-50,len=yb-t-(k.sr+t),G={tint:[0.8,0.8,0.8]};
  mk(-1,'Sockelblende vorn',W,k.sh,t,[r.xa,k.sr+t,0],[1,0,0],[0,0,1],{...G});mk(-1,'Sockelblende hinten',W,k.sh,t,[r.xa,yb,0],[1,0,0],[0,0,1],{...G});
  const xq=[r.xa,...r.n.map((x,i)=>i===r.n.length-1?x-t:x-t/2)];if(len>20)for(const q of xq)mk(-1,'Sockel Querstück',len,k.sh,t,[q,k.sr+t,0],[0,1,0],[0,0,1],{...G})}
 /* Kantenband: welche Kanten, und um wie viel der Zuschnitt kleiner ist als das Fertigmaß */
 for(const p of out){let nW=0,nH=0,txt='';const n=p.name;if(p.rod){}else if(p.isFront){nW=2;nH=2;txt='rundum'}else if(/^Seite|^Mittelwand/.test(n)){nH=1;txt='vorn'}else if(/^Boden|^Deckel|^Fester|^Einlege/.test(n)){nW=1;txt='vorn'}else if(/^Schubkasten (Seite|Vorder|Hinter)/.test(n)){nW=1;txt='oben'}
  const kb=k.kb>0?k.kb:0;p.kbTxt=kb&&txt?txt:'';p.kbLen=kb?nW*p.W+nH*p.H:0;p.cW=num(p.W-kb*nH);p.cH=num(p.H-kb*nW)}
 return out}

/* ----- Einzelteil als Zeichnung (für die Origin) ----- */
function partEnts(p,qty){const es=[],tool=S().def.tool;
 es.push({t:'pline',ly:'Kontur',pts:[[0,0],[p.W,0],[p.W,p.H],[0,p.H]],closed:true,rect:true,ct:'outside',cd:p.T,th:p.T});
 for(const g of p.grooves)es.push({t:'pline',ly:'Kontur',pts:[[g.x,g.y],[g.x+g.w,g.y],[g.x+g.w,g.y+g.h],[g.x,g.y+g.h]],closed:true,rect:true,ct:'pocket',cd:g.depth,...(tool>Math.min(g.w,g.h)?{tool:Math.min(6,Math.min(g.w,g.h))}:{})});
 for(const h of p.holes){if(h.mark){es.push({t:'circle',ly:'Hilfslinien',c:[h.x,h.y],r:h.d/2,ct:'guide'},{t:'line',ly:'Hilfslinien',a:[h.x-h.d,h.y],b:[h.x+h.d,h.y],ct:'guide'},{t:'line',ly:'Hilfslinien',a:[h.x,h.y-h.d],b:[h.x,h.y+h.d],ct:'guide'});continue}
  if(h.back)es.push({t:'circle',ly:'Rückseite',c:[h.x,h.y],r:h.d/2,ct:'guide'});else es.push({t:'circle',ly:'Kontur',c:[h.x,h.y],r:h.d/2,ct:'pocket',cd:h.depth,...(tool<h.d-1e-9?{}:{tool:3})})}
 for(const k of p.ticks){const d={l:[14,0],r:[-14,0],b:[0,14],t:[0,-14]}[k.e];es.push({t:'line',ly:'Hilfslinien',a:[k.x,k.y],b:[k.x+d[0],k.y+d[1]],ct:'guide'})}
 const th=clampN(Math.min(p.W,p.H)/12,6,16);es.push({t:'text',ly:'Hilfslinien',p:[Math.min(60,p.W*0.15),Math.min(70,p.H*0.3)],s:`${p.name} ${de(p.W)} x ${de(p.H)} x ${de(p.T)}${qty>1?'  ('+qty+' Stück)':''}`,h:th,a:0,ct:'guide'});
 if(typeof p.front==='string'){const m=p.front,hv=clampN(th*0.8,5,12),pos={x0:[4,p.H/2],xW:[p.W-4-hv,p.H/2],y0:[p.W/2,4],yH:[p.W/2,p.H-4-hv]}[m];es.push({t:'text',ly:'Hilfslinien',p:pos,s:'VORN',h:hv,a:m[0]==='x'?Math.PI/2:0,ct:'guide'});if(m[0]==='x')es[es.length-1].p=[pos[0]+hv,pos[1]]}
 if(p.holes.some(h=>h.back))es.push({t:'text',ly:'Hilfslinien',p:[Math.min(60,p.W*0.15),Math.min(70,p.H*0.3)+th*1.8],s:'Blaue Kreise: von der Rueckseite bohren',h:th*0.7,a:0,ct:'guide'});
 return es}
const pKey=p=>[p.name,p.matId,p.cW,p.cH,p.W,p.H,p.T,JSON.stringify(p.holes),JSON.stringify(p.grooves),JSON.stringify(p.ticks)].join('|');
function list(k){const m=new Map();for(const p of parts(k)){const key=pKey(p);if(!m.has(key))m.set(key,{p,n:0,cabs:new Set()});const r=m.get(key);r.n++;if(p.ci>=0)r.cabs.add(p.ci+1)}return[...m.values()]}

/* ----- 3D ----- */
function circlePoly(x,y,r){const n=r>10?40:20,o=[];for(let i=0;i<n;i++)o.push([x+r*Math.cos(i*2*Math.PI/n),y+r*Math.sin(i*2*Math.PI/n)]);return o}
function model3(k){const ps=parts(k),out=[];let b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];if(cache3.size>600)cache3.clear();
 for(const p of ps){const key=[p.W,p.H,p.T,JSON.stringify(p.holes),JSON.stringify(p.grooves)].join('|');let sec=cache3.get(key);
  if(!sec){const cuts=[...p.holes.filter(h=>!h.back&&!h.mark).map(h=>({d:h.depth,polys:[circlePoly(h.x,h.y,h.d/2)]})),...p.grooves.map(g=>({d:g.depth,polys:[[[g.x,g.y],[g.x+g.w,g.y],[g.x+g.w,g.y+g.h],[g.x,g.y+g.h]]]}))];
   sec=A.sectionsOf([[[0,0],[p.W,0],[p.W,p.H],[0,p.H]]],cuts,p.T).sections;cache3.set(key,sec)}
  const w=[p.u[1]*p.v[2]-p.u[2]*p.v[1],p.u[2]*p.v[0]-p.u[0]*p.v[2],p.u[0]*p.v[1]-p.u[1]*p.v[0]];
  for(const[x,y,z]of[[0,0,0],[p.W,p.H,p.T]])for(let i=0;i<3;i++){const val=p.o[i]+p.u[i]*x+p.v[i]*y+w[i]*z;b[i]=Math.min(b[i],val);b[i+3]=Math.max(b[i+3],val)}
  out.push({T:p.T,sections:sec,o:p.o,u:p.u,v:p.v,tint:p.tint,color:p.rod?[0.75,0.78,0.82]:p.matId?mat(p.matId)[2]:null,hide:p.isFront&&!showFront})}
 const lum=out.filter(q=>!q.hide&&q.color).map(q=>(q.color[0]+q.color[1]+q.color[2])/3),dark=lum.length>out.length/2&&lum.reduce((a,b)=>a+b,0)/lum.length<0.33;
 return{edge:dark?[0.62,0.62,0.6]:null,parts:out,box:b,size:Math.max(b[3]-b[0],b[4]-b[1],b[5]-b[2]),T:0}}
function upd3(){clearTimeout(timer);timer=setTimeout(()=>{if(!isOpen())return;if(!V3)V3=window.CAD3D.create($('kp3d'));const first=!V3.stats;if(!V3.setModel(model3(K()),!first))$('kp3dmsg').textContent='Dieser Browser kann leider kein 3D anzeigen.'},drag?120:30)}

/* ----- Vorderansicht ----- */
const cv=()=>$('kpcv');
function rowW(k){return k.cabs.reduce((s,c)=>s+c.b,0)}
function cabX(k,i){let x=0;for(let j=0;j<i;j++)x+=k.cabs[j].b;return x}
function fitView(){const c=cv(),k=K(),W=rowW(k),H=Math.max(...k.cabs.map(c=>c.h+cz(k,c))),w=c.clientWidth,h=c.clientHeight,kh=(()=>{const q=document.querySelector('.kphint');return q&&q.offsetParent&&getComputedStyle(q).display!=='none'?q.offsetHeight:0})(),ml=Math.min(110,Math.max(w<420?44:72,w*0.16)),mb=Math.min(105,Math.max(h<330?44:72,h*0.16))+kh,mt=Math.max(Math.min(95,h*0.14),(document.querySelector('.kptools')?document.querySelector('.kptools').offsetHeight:0)+42);view.s=Math.max(0.005,Math.min((w-2*ml)/W,(h-mb-mt)/H));view.ox=(w-W*view.s)/2;view.oy=h-mb-((h-mb-mt)-H*view.s)/2}
const sx=x=>view.ox+x*view.s,sy=z=>view.oy-z*view.s;
function items(k){/* anklickbare Dinge: {type:'fb'|'eb'|'mw', ci, i, rect:[x,z,w,h] in mm (Zeile)} */const o=[];
 k.cabs.forEach((c,ci)=>{const X=cabX(k,ci),z0=cz(k,c);c.mw.forEach((x,i)=>o.push({type:'mw',ci,i,rect:[X+x,z0+k.t,k.t,c.h-2*k.t]}));
  for(const ty of['fb','eb'])c[ty].forEach((s,i)=>{const f=compAt(c,k,s.x);o.push({type:ty,ci,i,rect:[X+f.x0,z0+s.y,f.x1-f.x0,k.t]})});
  (c.ks||[]).forEach((s,i)=>{const f=compAt(c,k,s.x);o.push({type:'ks',ci,i,rect:[X+f.x0,z0+s.y-k.ksD/2,f.x1-f.x0,k.ksD]})})});return o}
let tForm=0;
function draw(){const c=cv(),k=K();if(!c.clientWidth)return;const dpr=window.devicePixelRatio||1;if(c.width!==Math.round(c.clientWidth*dpr)||c.height!==Math.round(c.clientHeight*dpr)){c.width=Math.round(c.clientWidth*dpr);c.height=Math.round(c.clientHeight*dpr)}
 if(!drag)fitView();const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#16191d';g.fillRect(0,0,c.clientWidth,c.clientHeight);
 const R=(x,z,w,h,fill,stroke,lw=1,dash)=>{g.beginPath();g.rect(sx(x),sy(z+h),w*view.s,h*view.s);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.setLineDash(dash||[]);g.stroke();g.setLineDash([])}};
 const T=(s,x,y,col='#9aa3ad',al='center',rot=0)=>{g.save();g.translate(x,y);g.rotate(rot);g.font='12.5px "IBM Plex Sans",system-ui,sans-serif';g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(s,0,0);g.restore()};
 const mc=mat(k.matK)[2],wood=css(mc),woodD=css(mc,0.78),t=k.t;
 for(const r of sockelRuns(k))R(r.xa,0,r.xb-r.xa,k.sh,'#3a3f46','#5a616b');
 k.cabs.forEach((c,ci)=>{const X=cabX(k,ci),act=ci===cur,z0=cz(k,c);
  R(X,z0,c.b,c.h,'#20242a',null);
  R(X,z0,t,c.h,wood,woodD);R(X+c.b-t,z0,t,c.h,wood,woodD);R(X+t,z0,c.b-2*t,t,wood,woodD);R(X+t,z0+c.h-t,c.b-2*t,t,wood,woodD);
  for(const f of fronts(c,k)){if(f.typ==='s'){R(X+f.x,z0+f.z,f.w,f.h,'rgba(201,168,119,.28)','#e8d5b0',1.2);const zc=z0+f.z+f.h/2;g.strokeStyle='#e8d5b0';g.lineWidth=2;g.beginPath();g.moveTo(sx(X+c.b/2-40),sy(zc));g.lineTo(sx(X+c.b/2+40),sy(zc));g.stroke()}
   else if(showFront){R(X+f.x,z0+f.z,f.w,f.h,null,'#e8d5b0',1.2,[7,5]);g.strokeStyle='rgba(232,213,176,.5)';g.lineWidth=1;g.setLineDash([3,5]);g.beginPath();const xh=X+(f.side==='l'?f.x:f.x+f.w),xo=X+(f.side==='l'?f.x+f.w:f.x);g.moveTo(sx(xh),sy(z0+f.z));g.lineTo(sx(xo),sy(z0+f.z+f.h/2));g.lineTo(sx(xh),sy(z0+f.z+f.h));g.stroke();g.setLineDash([])}}
  if(act){g.strokeStyle='#e5482d';g.lineWidth=2;g.strokeRect(sx(X)-3,sy(z0+c.h)-3,c.b*view.s+6,c.h*view.s+6)}
  {/* für alle Korpusse dieselbe Form, so kurz wie der schmalste es braucht */g.font='12.5px "IBM Plex Sans",system-ui,sans-serif';const F=[(i,d)=>'Korpus '+i+' · Tiefe '+d,(i,d)=>i+' · T '+d,i=>String(i)];if(ci===0)tForm=F.findIndex(fn=>k.cabs.every((q,i)=>g.measureText(fn(i+1,de(q.d))).width<=q.b*view.s-6));const tt=F[tForm<0?2:tForm](ci+1,de(c.d));T(tt,sx(X+c.b/2),sy(z0+c.h)-16,act?'#ff8a70':'#9aa3ad')}});
 for(const it of items(k)){const sel=pick&&pick.type===it.type&&pick.ci===it.ci&&pick.i===it.i,[x,z,w,h]=it.rect;
  if(it.type==='ks'){R(x,z,w,h,'#b9c2cc',sel?'#e5482d':'#7d8792',sel?2:1);R(x,z-6,8,h+12,'#7d8792',null);R(x+w-8,z-6,8,h+12,'#7d8792',null)}
  else R(x,z,w,h,it.type==='eb'?'rgba(201,168,119,.55)':wood,sel?'#e5482d':woodD,sel?2:1,it.type==='eb'?[5,3]:null);
  if(sel){const c=k.cabs[it.ci];if(it.type==='mw')T(de(c.mw[it.i])+' von links',sx(x+w/2),sy(z+h)-34,'#ffb020');else T(de(c[it.type][it.i].y)+(it.type==='ks'?' Stangenmitte':' ab Unterkante'),sx(x+w/2),sy(z+h)-12,'#ffb020')}}
 dims(g,k,T);
 $('kphint').textContent={sel:matchMedia('(pointer:coarse)').matches?'Korpus antippen = bearbeiten · Boden oder Mittelwand ziehen = verschieben · antippen, dann „Löschen“':'Korpus anklicken = bearbeiten · Boden oder Mittelwand ziehen = verschieben · anklicken + Entf = löschen',fb:'In ein Fach klicken: fester Boden auf dieser Höhe',eb:'In ein Fach klicken: Einlegeboden auf dieser Höhe',ks:'In ein Fach klicken: Kleiderstange auf dieser Höhe',mw:'In einen Korpus klicken: Mittelwand an dieser Stelle'}[mode]}
/* Maßketten: immer sichtbar. Unten Korpusbreiten + Gesamtbreite, links Höhen, in jedem Fach lichte Breite und lichte Höhen */
function dims(g,k,T){const de=v=>String(Math.round(v*10)/10).replace('.',',');const W=rowW(k),top=c=>cz(k,c)+c.h,Hm=Math.max(...k.cabs.map(top)),col='#5ad1e8',t=k.t;
 const line=(x1,y1,x2,y2)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()},tick=(x,y)=>{line(x-4,y+4,x+4,y-4)};
 g.strokeStyle=col;g.lineWidth=1;g.setLineDash([]);
 /* Innenmaße werden weggelassen, wenn ihr Text auf einem anderen Maß landen würde (schmale Fächer) */
 const used=[],free=r=>!used.some(u=>r[0]<u[0]+u[2]&&u[0]<r[0]+r[2]&&r[1]<u[1]+u[3]&&u[1]<r[1]+r[3]),tw=s=>s.length*7.4+8;
 const dH=(xa,xb,py,txt,ext,inner)=>{const a=sx(xa),b=sx(xb),r=[(a+b)/2-tw(txt)/2,py-17,tw(txt),16],show=b-a>=tw(txt)-4&&free(r);if(inner&&!show)return;line(a,py,b,py);tick(a,py);tick(b,py);if(ext){line(a,ext,a,py+5);line(b,ext,b,py+5)}if(show){used.push(r);if(inner)bg(r);T(txt,(a+b)/2,py-9,col)}};
 const bg=r=>{g.fillStyle='#16191dd9';g.fillRect(r[0]+2,r[1]+1,r[2]-4,r[3]-2)};
 const dV=(za,zb,px,txt,ext,side=-1,inner)=>{const a=sy(za),b=sy(zb),r=[px+side*9-8,(a+b)/2-tw(txt)/2,16,tw(txt)],show=a-b>=Math.max(30,tw(txt)-4)&&free(r);if(inner&&(!show||!free([px-3,b,6,a-b])))return;line(px,a,px,b);tick(px,a);tick(px,b);if(ext!=null){line(ext,a,px+side*5,a);line(ext,b,px+side*5,b)}if(show){used.push(r);if(inner)bg(r);T(txt,px+side*9,(a+b)/2,col,'center',-Math.PI/2)}};
 /* unten: Korpusbreiten, darunter Gesamtbreite */
 const y1=sy(0)+26,y2=sy(0)+54;let X=0;k.cabs.forEach(c=>{dH(X,X+c.b,y1,de(c.b),sy(0)+4);X+=c.b});if(k.cabs.length>1)dH(0,W,y2,de(W),y1+4);
 /* links: Abstand zum Boden (Sockel oder Hängehöhe) + Korpus, außen Gesamthöhe */
 const side=(c,xe,sg)=>{const z=cz(k,c),xa=xe+sg*26,xb=xe+sg*54;if(z>0)dV(0,z,xa,de(z),xe+sg*4,sg);dV(z,z+c.h,xa,de(c.h),xe+sg*4,sg);if(z>0||Hm>z+c.h+1e-6)dV(0,sg<0?Hm:z+c.h,xb,de(sg<0?Hm:z+c.h),xa+sg*4,sg)};
 const c0=k.cabs[0],cl=k.cabs[k.cabs.length-1];side(c0,sx(0),-1);if(k.cabs.length>1&&(Math.abs(cl.h-c0.h)>1e-6||Math.abs(cz(k,cl)-cz(k,c0))>1e-6))side(cl,sx(W),1);
 X=0;k.cabs.forEach((c,ci)=>{if(ci>0&&ci<k.cabs.length-1&&(Math.abs(c.h-c0.h)>1e-6||Math.abs(cz(k,c)-cz(k,c0))>1e-6))T('Höhe '+de(c.h)+(c.zo>0?' · '+de(c.zo)+' über Boden':''),sx(X+c.b/2),sy(top(c))-32,col);X+=c.b});
 /* innen: lichte Breite und lichte Höhen je Fach, Stangenhöhe, Frontmaße der Schubkästen */
 g.strokeStyle='rgba(90,209,232,.75)';X=0;
 k.cabs.forEach(c=>{const z0=cz(k,c);if(c.front!=='s')for(const f of comps(c,k)){const xm=(f.x0+f.x1)/2,inF=l=>l.filter(s=>Math.abs(compAt(c,k,s.x).x0-f.x0)<1e-6);
    const lv=[{a:t,b:t},...inF(c.fb).map(s=>({a:s.y,b:s.y+t})),...inF(c.eb).map(s=>({a:s.y,b:s.y+t})),{a:c.h-t,b:c.h-t}].sort((p,q)=>p.a-q.a);
    dH(X+f.x0,X+f.x1,sy(z0+c.h-t)+16,de(f.x1-f.x0),0,1);
    const px=sx(X+f.x0)+13;if((f.x1-f.x0)*view.s>=44)for(let i=0;i<lv.length-1;i++){const lo=lv[i].b,hi=lv[i+1].a;if(hi-lo>1)dV(z0+lo,z0+hi,px,de(hi-lo),null,1,1)}
    for(const s of inF(c.ks||[]))T('Stange '+de(s.y),sx(X+xm),sy(z0+s.y)+k.ksD/2*view.s+11,col)}
  for(const f of fronts(c,k))if(f.typ==='s'&&f.h*view.s>40){const tx=de(f.w)+' × '+de(f.h),px=sx(X+c.b/2),py=sy(z0+f.z+f.h/2)+15;g.font='12.5px "IBM Plex Sans",system-ui,sans-serif';const tw=g.measureText(tx).width;if(tw>c.b*view.s-8)continue;g.fillStyle='#16191dcc';g.fillRect(px-tw/2-3,py-8,tw+6,16);T(tx,px,py,'#e8d5b0')}
  X+=c.b})}
function hitAt(px,py){const k=K(),x=(px-view.ox)/view.s,z=(view.oy-py)/view.s,tol=6/view.s;
 const it=items(k).find(i=>x>=i.rect[0]-tol&&x<=i.rect[0]+i.rect[2]+tol&&z>=i.rect[1]-tol&&z<=i.rect[1]+i.rect[3]+tol);let ci=-1;k.cabs.forEach((c,i)=>{const X=cabX(k,i);if(x>=X&&x<=X+c.b&&z>=cz(k,c)&&z<=cz(k,c)+c.h)ci=i});
 return{it,ci,x,z,lx:ci>=0?x-cabX(k,ci):0,lz:ci>=0?z-cz(k,k.cabs[ci]):z}}
function bindCanvas(){const c=cv();
 c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);const h=hitAt(e.offsetX,e.offsetY),k=K();
  if(mode!=='sel'){if(h.ci<0)return;const cb=k.cabs[h.ci];if(cb.front==='s'){msg('Ein Schubkasten-Korpus hat keine Böden, Mittelwände oder Kleiderstangen.');return}cur=h.ci;
   A.commit(()=>{if(mode==='mw'){cb.mw.push(num(Math.round(h.lx-k.t/2)));pick={type:'mw',ci:cur,i:cb.mw.length-1}}else{if(!cb[mode])cb[mode]=[];cb[mode].push({x:num(h.lx),y:num(Math.round(mode==='ks'?h.lz:h.lz-k.t/2))});pick={type:mode,ci:cur,i:cb[mode].length-1}}tidy(k)});
   setMode('sel');refresh();return}
  if(h.it){cur=h.it.ci;pick={type:h.it.type,ci:h.it.ci,i:h.it.i};const cb=k.cabs[cur];drag={it:h.it,sx:e.offsetX,sy:e.offsetY,orig:JSON.stringify(cb),moved:false,start:h.it.type==='mw'?cb.mw[h.it.i]:cb[h.it.type][h.it.i].y}}
  else{pick=null;if(h.ci>=0)cur=h.ci}refresh(true)});
 c.addEventListener('pointermove',e=>{if(!drag){const h=hitAt(e.offsetX,e.offsetY);c.style.cursor=mode!=='sel'?'crosshair':h.it?(h.it.type==='mw'?'ew-resize':'ns-resize'):'default';return}
  const k=K(),cb=k.cabs[drag.it.ci],dx=(e.offsetX-drag.sx)/view.s,dz=-(e.offsetY-drag.sy)/view.s;if(Math.abs(dx)+Math.abs(dz)>2/view.s)drag.moved=true;if(!drag.moved)return;
  if(drag.it.type==='mw')cb.mw[drag.it.i]=Math.round(drag.start+dx);else cb[drag.it.type][drag.it.i].y=Math.round(drag.start+dz);tidy(k);draw();fillPick();upd3()});
 const up=()=>{if(!drag)return;const d=drag,k=K();drag=null;if(d.moved){const neu=JSON.stringify(k.cabs[d.it.ci]);k.cabs[d.it.ci]=JSON.parse(d.orig);A.commit(()=>{k.cabs[d.it.ci]=JSON.parse(neu)})}refresh()};
 c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);new ResizeObserver(()=>draw()).observe(c)}

/* ----- Formular ----- */
/* Vorbelegungen für gängige Schränke: [Name, Maße, optional Innenausstattung] */
const TYPEN=[['Unterschrank 720 hoch, 560 tief',{h:720,d:560,zo:0}],['Hochschrank 2000 hoch, 560 tief',{h:2000,d:560,zo:0}],['Hängeschrank 720 hoch, 320 tief, 1400 über Boden',{h:720,d:320,zo:1400,front:'2'}],
 ['Kleiderschrank 2200 hoch, 600 tief, mit Stange',{h:2200,d:600,zo:0,b:1000,front:'2'},(c,k)=>{c.mw=[];c.nm=0;c.fb=[{x:c.b/2,y:1850}];c.eb=[];c.ks=[{x:c.b/2,y:1780}]}]];
const F_ROW=[['t','Plattenstärke',5,60],['rw','Rückwandstärke',3,25],['fuge','Fuge der Fronten',0,20]];
const F_CAB=[['b','Breite'],['h','Höhe'],['d','Tiefe']];
function form(){const k=K(),c=k.cabs[cur],inp=(id,lab,val,x='')=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${de(val)}" ${x}></div>`,
 chk=(id,lab,on)=>`<label class="kpchk"><input type="checkbox" id="${id}" ${on?'checked':''}> ${lab}</label>`;
 const sel=(id,lab,val,opts)=>`<div class="pr"><label for="${id}">${lab}</label><select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${val===v?'selected':''}>${l}</option>`).join('')}</select></div>`,
 note=t=>`<p class="muted kpnote">${t}</p>`,
 sec=(id,title,sub,body)=>`<details class="kpsec" data-sec="${id}" ${openSec.has(id)?'open':''}><summary><b>${title}</b><span>${sub}</span></summary><div class="kpsecb">${body}</div></details>`,
 mats=MATS.map(m=>[m[0],m[0]?m[0]+' '+m[1]:m[1]]),frontTxt={n:'offen',l:'1 Tür',r:'1 Tür',2:'2 Türen',s:c.sn+' Schubkästen',ml:'Schubkasten + Tür',mr:'Schubkasten + Tür',m2:'Schubkasten + 2 Türen'}[c.front];
 $('kpform').innerHTML=`<div class="kpcabs">${k.cabs.map((q,i)=>`<button class="kptab ${i===cur?'on':''}" data-kpcab="${i}" title="Korpus ${i+1} bearbeiten">${i+1}</button>`).join('')}<button class="kptab add" id="kc_add" title="Weiteren Korpus rechts daneben anlegen">+ Korpus</button></div>
 ${sec('cab','Korpus '+(cur+1),`${de(c.b)} × ${de(c.h)} × ${de(c.d)} · ${frontTxt}`,`
  <div class="pr"><label for="kc_typ">Schranktyp</label><select id="kc_typ">${(()=>{/* gewählten Typ weiter anzeigen, solange die Maße noch dazu passen */const ti=TYPEN.findIndex(t=>Object.entries(t[1]).every(([f,v])=>c[f]===v));return`<option value="">${ti<0?'– eigene Maße –':'– wählen –'}</option>`+TYPEN.map((t,i)=>`<option value="${i}"${i===ti?' selected':''}>${t[0]}</option>`).join('')})()}</select></div>
  ${F_CAB.map(([f,l])=>inp('kc_'+f,l+' mm',c[f])).join('')}
  ${sel('kc_front','Front',c.front,[['n','Offen (keine Front)'],['l','1 Tür, Band links'],['r','1 Tür, Band rechts'],['2','2 Türen'],['s','Schubkästen (Blum TANDEM)'],['ml','Schubkasten oben + Tür links'],['mr','Schubkasten oben + Tür rechts'],['m2','Schubkasten oben + 2 Türen']])}
  ${c.front[0]==='m'?inp('kc_sfh','Höhe Schubkastenfront',c.sfh):''}${c.front==='s'?inp('kc_sn','Schubkästen',c.sn)+tandemInfo(c,k):''}
  ${inp('kc_zo','Unterkante über Boden',c.zo)}${note('0 = steht auf dem Boden bzw. Sockel. Für Hängeschränke die Höhe eintragen.')}
  <button class="btn kpdel" id="kc_del" ${k.cabs.length<2?'disabled':''}>Diesen Korpus löschen</button>`)}
 ${c.front==='s'?'':sec('in','Innenaufteilung',`${c.mw.length} Wände · ${c.fb.length+c.eb.length} Böden${c.ks.length?' · Stange':''}`,`
  ${inp('kc_nm','Mittelwände',c.nm)}${inp('kc_nf','Feste Böden je Fach',c.nf)}${inp('kc_ne','Einlegeböden je Fach',c.ne)}
  <button class="btn" id="kc_spread" style="width:100%">Gleichmäßig verteilen</button>${note('Einzelne Böden, Wände und Stangen setzt und verschiebst du direkt in der Zeichnung.')}`)}
 <div id="kppick"></div>
 <h2 class="kpall">Für alle Korpusse</h2>
 ${sec('mat','Platte und Material',`${de(k.t)} mm${k.matK?' · '+k.matK:''}`,`
  ${F_ROW.map(([f,l])=>inp('kr_'+f,l+' mm',k[f])).join('')}${inp('kr_kb','Kantenband mm (0 = ohne)',k.kb)}
  ${sel('kr_matK','Dekor Korpus',k.matK,mats)}${sel('kr_matF','Dekor Fronten',k.matF,mats)}${sel('kr_matR','Dekor Rückwand',k.matR,mats)}${note('Beispiel-Dekore von EGGER. Farben am Bildschirm sind nur ungefähr.')}`)}
 ${sec('verb','Verbindungen',[k.dub?'Dübel':'',k.sv?'SV 20 E':'',k.nut?'Nut':''].filter(Boolean).join(' · ')||'keine',`
  ${chk('kr_nut','Rückwand in Nut (10 tief, 20 von hinten)',k.nut)}${chk('kr_dub','Dübel Ø8 an allen Stößen',k.dub)}${chk('kr_sv','Würth Systemverbinder SV 20 E',k.sv)}
  ${k.sv?inp('kr_svT','Gehäuse Ø20: Bohrtiefe',k.svT)+inp('kr_svX','Gehäusemitte von der Kante',k.svX)+inp('kr_svO','Bolzen zur Gehäuseseite versetzt',k.svO)+note('Für 19 mm: 14 tief, 9,5 von der Kante (16 mm: 12,5 und 8). Bolzenloch Ø5 in der Seite, 37 von vorn und hinten.'):''}`)}
 ${sec('besch','Beschläge',[k.topf?'Topfband':'',k.lr!=='aus'?'Bodenträger':'',k.griff==='b'?'Griffe':''].filter(Boolean).join(' · ')||'keine',`
  ${chk('kr_topf','Topfbänder Ø35 (Blum) mit Montageplatten',k.topf)}
  ${sel('kr_lr','Bodenträger',k.lr,[['boden','3 Löcher je Einlegeboden'],['voll','Lochreihe durchgehend'],['aus','keine Löcher']])}
  ${k.lr!=='aus'?inp('kr_btD','Bohr-Ø mm',k.btD)+inp('kr_btT','Bohrtiefe mm',k.btT)+inp('kr_btA','Lochmitte unter Boden mm',k.btA)+note('Voreingestellt für Häfele „Jimmy“ (Bohr-Ø 4). Löcher 37 mm von vorn und hinten.'):''}
  ${sel('kr_griff','Griffe',k.griff,[['n','keine'],['b','Bügelgriff']])}
  ${k.griff==='b'?inp('kr_grA','Lochabstand',k.grA)+inp('kr_grR','Abstand zur Türkante',k.grR)+inp('kr_grO','Abstand oben/unten',k.grO):''}`)}
 ${sec('sock','Sockel',k.sockel?de(k.sh)+' mm hoch':'ohne',`${chk('kr_sockel','Sockel unter den stehenden Korpussen',k.sockel)}${k.sockel?inp('kr_sh','Sockelhöhe mm',k.sh)+inp('kr_sr','Rücksprung mm',k.sr):''}`)}`;
 $('kpform').querySelectorAll('details.kpsec').forEach(d=>d.addEventListener('toggle',()=>{d.open?openSec.add(d.dataset.sec):openSec.delete(d.dataset.sec)}));
 $('kpform').querySelectorAll('[data-kpcab]').forEach(bt=>bt.onclick=()=>{cur=+bt.dataset.kpcab;pick=null;refresh()});
 const val=el=>{const v=pnum(el.value);if(v==null&&el.value.trim())msg(`„${el.value}“ ist keine Zahl – der alte Wert bleibt.`);return v},on=(id,fn)=>{const el=$(id);if(!el)return;el.addEventListener('change',()=>{$('kpmsg').textContent='';fn(el);refresh()});if(el.tagName==='INPUT'&&el.type==='text')el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur()})};
 const set=(obj,f,min,max,after)=>el=>{const v=val(el);if(v==null)return;if(v<min||v>max)msg(`Erlaubt sind ${de(min)} bis ${de(max)} – auf ${de(clampN(v,min,max))} gesetzt.`);A.commit(()=>{obj[f]=clampN(v,min,max);after&&after();tidy(k)})};
 on('kc_b',set(c,'b',150,3000,()=>scaleX(c,k)));on('kc_h',set(c,'h',150,3000));on('kc_d',set(c,'d',120,1200));
 on('kc_front',el=>{const had=c.mw.length;A.commit(()=>{c.front=el.value;tidy(k)});if(had&&!c.mw.length)msg('Bei Schubkasten-Fronten gibt es keine Mittelwände – sie wurden entfernt.')});on('kc_zo',set(c,'zo',0,2600));on('kc_sfh',set(c,'sfh',80,600));
 on('kc_typ',el=>{const t=TYPEN[+el.value];if(!t)return;A.commit(()=>{Object.assign(c,t[1]);if(t[2])t[2](c,k);else spreadWalls(c,k);tidy(k)});pick=null});on('kc_sn',set(c,'sn',1,8));
 for(const f of['nm','nf','ne'])on('kc_'+f,el=>{const v=val(el);if(v==null)return;if(v!==Math.round(v))msg(`Nur ganze Zahlen – auf ${Math.round(v)} gerundet.`);if(f==='nm'&&v>6)msg('Höchstens 6 Mittelwände je Korpus.');else if(f!=='nm'&&v>12)msg('Höchstens 12 je Fach.');A.commit(()=>{c[f]=clampN(Math.round(v),0,f==='nm'?6:12);spread(c,k);tidy(k)});if(f==='nm'&&v>0&&v<=6&&c.mw.length<Math.round(v))msg(c.front[0]==='m'||c.front==='s'?'Bei Schubkasten-Fronten sind keine Mittelwände möglich.':`Nur ${c.mw.length} Mittelwände passen in diese Breite.`);pick=null});
 const sp=$('kc_spread');if(sp)sp.onclick=()=>{A.commit(()=>{spread(c,k);tidy(k)});pick=null;refresh()};
 $('kc_add').onclick=()=>{A.commit(()=>{k.cabs.splice(cur+1,0,JSON.parse(JSON.stringify(c)))});cur++;pick=null;refresh()};
 $('kc_del').onclick=()=>{if(k.cabs.length<2)return;A.commit(()=>{k.cabs.splice(cur,1)});cur=Math.max(0,cur-1);pick=null;refresh()};
 for(const[f,,min,max]of F_ROW)on('kr_'+f,set(k,f,min,max));on('kr_kb',set(k,'kb',0,5));on('kr_griff',el=>A.commit(()=>{k.griff=el.value}));on('kr_grA',set(k,'grA',32,800));on('kr_grR',set(k,'grR',15,300));on('kr_grO',set(k,'grO',15,600));for(const f of['matK','matF','matR'])on('kr_'+f,el=>A.commit(()=>{k[f]=el.value}));on('kr_svT',set(k,'svT',5,25));on('kr_svX',set(k,'svX',5,20));on('kr_svO',set(k,'svO',-10,10));for(const f of['nut','dub','sv','topf','sockel'])on('kr_'+f,el=>A.commit(()=>{k[f]=el.checked}));
 on('kr_lr',el=>A.commit(()=>{k.lr=el.value}));on('kr_btD',set(k,'btD',2,12));on('kr_btT',set(k,'btT',3,16));on('kr_btA',set(k,'btA',0,20));on('kr_sh',set(k,'sh',30,300));on('kr_sr',set(k,'sr',0,200));fillPick()}
function scaleX(c,k){/* bei neuer Breite: Mittelwände neu verteilen, Böden bleiben in ihrem Fach */spreadWalls(c,k)}
function spreadWalls(c,k){const n=c.mw.length,iw=c.b-2*k.t;c.mw=c.mw.map(x=>Math.min(x,c.b-2*k.t-1));const fx=[c.fb,c.eb].map(l=>l.map(s=>{const cs=comps(c,k);return Math.max(0,cs.findIndex(f=>s.x>=f.x0&&s.x<=f.x1))}));
 c.mw=[];for(let i=0;i<n;i++)c.mw.push(num(k.t+(iw-n*k.t)/(n+1)*(i+1)+i*k.t));const cs=comps(c,k);[c.fb,c.eb].forEach((l,li)=>l.forEach((s,i)=>{const f=cs[Math.min(fx[li][i],cs.length-1)];s.x=num((f.x0+f.x1)/2)}))}
function tandemInfo(c,k){const dE=k.nut?c.d-k.na-k.rw:c.d,NL=[...TANDEM_NL].reverse().find(l=>l+3<=dE),LW=c.b-2*k.t;
 return`<div class="kpsel"><b>Blum TANDEM (Holzschubkasten)</b><span class="muted">${NL?`Nennlänge ${NL} · Schubkasten ${de(LW-10)} breit (innen ${de(LW-42)}), ${NL-10} lang · Seiten 16 mm · Boden 13 zurückgesetzt`:`Korpus zu flach: mindestens ${TANDEM_NL[0]+3+(k.nut?k.na+k.rw:0)} mm Tiefe nötig`}</span></div>`}
function fillPick(){const el=$('kppick');if(!el)return;const k=K();if(!pick||!k.cabs[pick.ci]||(pick.type==='mw'?k.cabs[pick.ci].mw[pick.i]==null:!k.cabs[pick.ci][pick.type][pick.i])){el.innerHTML='';return}
 const c=k.cabs[pick.ci],isW=pick.type==='mw',v=isW?c.mw[pick.i]:c[pick.type][pick.i].y,nm={mw:'Mittelwand',fb:'Fester Boden',eb:'Einlegeboden',ks:'Kleiderstange'}[pick.type];
 if(document.activeElement&&document.activeElement.id==='kp_pos')return;
 el.innerHTML=`<div class="kpsel"><b>${nm} gewählt</b><div class="pr"><label for="kp_pos">${isW?'Abstand von links':pick.type==='ks'?'Höhe Stangenmitte':'Höhe ab Unterkante'}</label><input id="kp_pos" type="text" inputmode="decimal" value="${de(v)}"></div><button class="btn" id="kp_rm">Löschen (Entf)</button></div>`;
 const p=$('kp_pos');{const box=el.querySelector('.kpsel');if(box&&box.scrollIntoView)box.scrollIntoView({block:'nearest'})}p.addEventListener('keydown',e=>{if(e.key==='Enter')p.blur()});p.addEventListener('change',()=>{const n=pnum(p.value);if(n==null){msg(`„${p.value}“ ist keine Zahl.`);return}A.commit(()=>{if(isW)c.mw[pick.i]=n;else c[pick.type][pick.i].y=n;tidy(k)});{const got=isW?c.mw[pick.i]:(c[pick.type][pick.i]||{}).y;if(got!=null&&Math.abs(got-n)>0.01)msg(`Dort geht es nicht – auf ${de(got)} gesetzt.`)}refresh()});$('kp_rm').onclick=removePick}
function removePick(){if(!pick)return;const k=K(),c=k.cabs[pick.ci];A.commit(()=>{if(pick.type==='mw')c.mw.splice(pick.i,1);else c[pick.type].splice(pick.i,1);tidy(k)});pick=null;refresh()}
function setMode(m){mode=m;document.querySelectorAll('[data-kpm]').forEach(b=>b.classList.toggle('on',b.dataset.kpm===m));draw()}
function msg(t){$('kpmsg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('kpmsg').textContent='',5000)}
let lastWarn='';
function refresh(light){const k=K();cur=clampN(cur,0,k.cabs.length-1);if(!light)form();else fillPick();draw();upd3();{const w=(parts(k).warn||[]).join(' ');if(w&&w!==lastWarn)msg(w);lastWarn=w}
 const ps=parts(k),W=rowW(k);$('kpinfo').textContent=`${k.cabs.length} Korpus${k.cabs.length>1?'se':''} · ${de(W)} mm breit · ${ps.length} Teile`}

/* ----- Stückliste ----- */
const matTxt=p=>p.rod?(p.mat||'Stange'):matName(p.matId);
function openList(){const k=K(),rows=list(k),kb=k.kb>0;
 $('kplT').innerHTML=`<tr><th>Nr.</th><th>Teil</th><th>Länge</th><th>Breite</th><th>Stärke</th>${kb?'<th>Zuschnitt</th><th>Kante</th>':''}<th>Material</th><th>Stück</th><th>Korpus</th><th>Bohrungen</th><th></th></tr>`+rows.map((r,i)=>{const p=r.p,L=Math.max(p.W,p.H),B=Math.min(p.W,p.H),nb=p.holes.filter(h=>!h.mark).length,ng=p.grooves.length;
  return`<tr><td>${i+1}</td><td>${A.esc(p.name)}</td><td>${de(L)}</td><td>${de(B)}</td><td>${de(p.T)}</td>${kb?`<td>${p.rod?'–':de(Math.max(p.cW,p.cH))+' × '+de(Math.min(p.cW,p.cH))}</td><td>${p.kbTxt||'–'}</td>`:''}<td>${A.esc(matTxt(p))}</td><td>${r.n}</td><td>${[...r.cabs].join(', ')||'–'}</td><td>${nb?nb+' Löcher':''}${nb&&ng?', ':''}${ng?'Nut':''}${p.holes.some(h=>h.back)?' (auch Rückseite)':''}${!nb&&!ng?'–':''}</td><td>${p.rod?'':`<button class="btn" data-kpsvg="${i}">SVG</button>`}</td></tr>`}).join('');
 const area=rows.reduce((s,r)=>s+(r.p.mat?0:r.p.cW*r.p.cH*r.n),0)/1e6,areaR=rows.reduce((s,r)=>s+(r.p.mat==='Rückwand'?r.p.W*r.p.H*r.n:0),0)/1e6,kbm=rows.reduce((s,r)=>s+r.p.kbLen*r.n,0)/1000;
 $('kplsum').textContent=`${rows.reduce((s,r)=>s+r.n,0)} Teile · Platte ${de(k.t)} mm (Schubkasten-Zargen 16 mm mitgezählt): ${de(area)} m² · Rückwand/Böden ${de(k.rw)} mm: ${de(areaR)} m² (ohne Verschnitt)${kb?` · Kantenband ${de(k.kb)} mm: ${de(kbm)} m`:''}`;
 $('dKpl').classList.add('open')}
function csv(sep,cut){let rows=list(K());if(cut)rows=rows.filter(r=>!r.p.rod);if(cut)return'Length,Width,Qty,Material,Label,Enabled\n'+rows.map(r=>[Math.max(r.p.cW,r.p.cH),Math.min(r.p.cW,r.p.cH),r.n,(r.p.matId?r.p.matId+' ':'')+r.p.T+'mm',r.p.name,'true'].join(',')).join('\n')+'\n';
 return'﻿Nr;Teil;Länge;Breite;Stärke;Zuschnitt Länge;Zuschnitt Breite;Kante;Material;Stück;Korpus\n'+rows.map((r,i)=>[i+1,r.p.name,de(Math.max(r.p.W,r.p.H)),de(Math.min(r.p.W,r.p.H)),de(r.p.T),de(Math.max(r.p.cW,r.p.cH)),de(Math.min(r.p.cW,r.p.cH)),r.p.kbTxt,matTxt(r.p),r.n,[...r.cabs].join(' ')].join(sep)).join('\n')+'\n'}
function printList(){const w=window.open('','_blank');if(!w){msg('Das Druckfenster wurde vom Browser blockiert.');return}
 w.document.write(`<!doctype html><meta charset="utf-8"><title>Stückliste</title><style>body{font:14px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px 8px;text-align:left}td:last-child,th:last-child{display:none}</style><h2>Stückliste ${A.esc(A.baseName())}</h2>${$('kplT').outerHTML}<p>${A.esc($('kplsum').textContent)}</p>`);w.document.close();w.focus();setTimeout(()=>w.print(),300)}
/* Fingerabdruck der Planer-Teile in der Zeichnung (erkennt Verschieben, Ändern, Kopieren) */
const kpSig=es=>{const s=JSON.stringify(es.map(({id,...r})=>r));let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return(h>>>0)+':'+es.length};
function toDrawing(how){const rows=list(K()).filter(r=>!r.p.rod),all=[];let x=0,y=0,rowH=0;const b=A.pristine?null:A.bbox(S().ents.filter(e=>e.src!=='kp'||how==='add')),bx=b?b[2]+150:0,by=b?b[1]:0;
 for(const r of rows){if(r.p.rod)continue;if(x>0&&x+r.p.W>3200){x=0;y+=rowH+80;rowH=0}for(const e of partEnts(r.p,r.n)){const mv=p=>[p[0]+bx+x,p[1]+by+y],n=JSON.parse(JSON.stringify(e));
   if(n.pts)n.pts=n.pts.map(mv);if(n.c)n.c=mv(n.c);if(n.a&&n.b){n.a=mv(n.a);n.b=mv(n.b)}if(n.p)n.p=mv(n.p);all.push(n)}x+=r.p.W+80;rowH=Math.max(rowH,r.p.H)}
 const oldE=S().ents.filter(e=>e.src==='kp'),old=oldE.length;
 if(old&&!how&&kpSig(oldE)!==S().kpSig){$('dKpRep').classList.add('open');return}
 const pr=A.pristine;A.commit(()=>{if(pr)S().ents=[];/* unverändertes Beispiel wird ersetzt */if(old){if(how==='add')oldE.forEach(e=>{delete e.src});else S().ents=S().ents.filter(e=>e.src!=='kp')}A.addEnts(all.map(e=>({...e,src:'kp'})),null,true);S().kpSig=kpSig(S().ents.filter(e=>e.src==='kp'))});close();A.after();
 A.log(`Korpusplaner: ${rows.length} verschiedene Teile ${old&&how!=='add'?'neu gelegt – die Teile vom letzten Mal wurden ersetzt':'in die Zeichnung gelegt'}. Für die Origin: ein Teil antippen, „SVG für Origin“, „Nur die gewählten Objekte ausgeben“ anhaken und „Bohrungen … mitnehmen“ – einfacher: im Planer in der Stückliste „SVG“ je Teil.`,'ok')}

/* ----- Zuschnittplan: Teile in Streifen auf Platten verteilen (einfache, sägegerechte Aufteilung) ----- */
function nest(k){k=k||K();const pieces=[];list(k).filter(r=>!r.p.rod).forEach((r,i)=>{const p=r.p;/* Länge (größeres Maß) läuft in Plattenlänge = Maserung längs */
  for(let n=0;n<r.n;n++)pieces.push({nr:i+1,name:p.name,w:Math.max(p.cW,p.cH),h:Math.min(p.cW,p.cH),matId:p.matId,T:p.T,kind:p.mat||(p.box?'Schubkasten':'Platte')})});return nestOf(pieces,k)}
/* pieces: [{nr,name,w,h,matId,T,kind}] */
function nestOf(pieces,k){k=k||K();const groups=new Map(),uw=k.plL-2*k.rand,uh=k.plB-2*k.rand,misfit=[];
 for(const q of pieces){const key=(q.matId||'')+'|'+q.T+'|'+q.kind;if(!groups.has(key))groups.set(key,{matId:q.matId,T:q.T,kind:q.kind,pcs:[]});groups.get(key).pcs.push({nr:q.nr,name:q.name,w:q.w,h:q.h})}
 const out=[];
 for(const g of groups.values()){const sheets=[],grain=/^H/.test(g.matId||'');
  const pcs=g.pcs.filter(q=>{let ok=q.w<=uw+1e-6&&q.h<=uh+1e-6;if(!ok&&!grain&&q.h<=uw&&q.w<=uh){[q.w,q.h]=[q.h,q.w];ok=true}if(!ok)misfit.push(q);return ok}).sort((a,b)=>b.h-a.h||b.w-a.w);
  for(const q of pcs){let done=false;
   for(const sh of sheets){for(const st of sh.strips){if(q.h<=st.h+1e-6&&st.x+q.w<=uw+1e-6){q.x=st.x;q.y=st.y;st.x+=q.w+k.kerf;sh.parts.push(q);done=true;break}}
    if(done)break;if(sh.y+q.h<=uh+1e-6){const st={y:sh.y,h:q.h,x:q.w+k.kerf};sh.strips.push(st);q.x=0;q.y=sh.y;sh.y+=q.h+k.kerf;sh.parts.push(q);done=true;break}}
   if(!done){const sh={strips:[{y:0,h:q.h,x:q.w+k.kerf}],y:q.h+k.kerf,parts:[q]};q.x=0;q.y=0;sheets.push(sh)}}
  const used=pcs.reduce((s,q)=>s+q.w*q.h,0);if(sheets.length)out.push({matId:g.matId,T:g.T,kind:g.kind,sheets,used,waste:1-used/(sheets.length*k.plL*k.plB)})}
 return{groups:out,misfit,plL:k.plL,plB:k.plB,rand:k.rand}}
function nestSVG(n,sh){const s=v=>Math.round(v*100)/100;let b=`<rect x="0" y="0" width="${n.plL}" height="${n.plB}" fill="#f4efe6" stroke="#333" stroke-width="3"/>`;
 for(const q of sh.parts){const x=n.rand+q.x,y=n.rand+q.y,fs=Math.max(n.plL/70,Math.min(46,q.h*0.32,q.w*0.11)),full=q.w*0.11>=n.plL/70&&q.h*0.32>=n.plL/70;b+=`<rect x="${s(x)}" y="${s(y)}" width="${s(q.w)}" height="${s(q.h)}" fill="#d9c29a" stroke="#222" stroke-width="2.5"/>`+
   (full&&q.w>150&&q.h>44?`<text x="${s(x+q.w/2)}" y="${s(y+q.h/2+fs*0.35)}" font-size="${s(fs)}" text-anchor="middle" font-family="Arial,sans-serif" fill="#111">${q.nr} · ${de(q.w)} × ${de(q.h)}</text>`:`<text x="${s(x+q.w/2)}" y="${s(y+q.h/2+Math.min(fs,q.h*0.8)*0.35)}" font-size="${s(Math.min(fs,q.h*0.8))}" text-anchor="middle" font-family="Arial,sans-serif" fill="#111">${q.nr}</text>`)}
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${n.plL+8} ${n.plB+8}" style="width:100%;height:auto;display:block">${b}</svg>`}
function nestHTML(){return nestHTMLOf(nest(K()))}
function nestHTMLOf(n){let h='';
 for(const g of n.groups){h+=`<h4>${A.esc(g.kind)} ${de(g.T)} mm${g.matId?' · '+A.esc(matName(g.matId)):''} – ${g.sheets.length} Platte${g.sheets.length>1?'n':''}, Verschnitt ${Math.round(g.waste*100)} %</h4>`;g.sheets.forEach((sh,i)=>{h+=`<div class="kpsheet"><div class="muted">Platte ${i+1} von ${g.sheets.length} · ${sh.parts.length} Teil${sh.parts.length===1?'':'e'}</div>${nestSVG(n,sh)}</div>`})}
 if(n.misfit.length)h+=`<div class="warn">Passt auf keine Platte: ${[...new Set(n.misfit.map(q=>`${A.esc(q.name)} ${de(q.w)} × ${de(q.h)}`))].join(', ')}</div>`;
 return h||'<p class="muted">Keine Teile.</p>'}
function openNest(){const k=K();for(const f of['plL','plB','kerf','rand'])$('kn_'+f).value=de(k[f]);$('kpnBody').innerHTML=nestHTML();$('dKpn').classList.add('open')}
function printNest(){const w=window.open('','_blank');if(!w){msg('Das Druckfenster wurde vom Browser blockiert.');return}const k=K();
 w.document.write(`<!doctype html><meta charset="utf-8"><title>Zuschnittplan</title><style>@page{size:A4 landscape;margin:10mm}body{font:11pt Arial,sans-serif;margin:0}h4{margin:14px 0 4px}.kpsheet{page-break-inside:avoid;margin-bottom:10px}.muted{color:#555;font-size:9.5pt}svg{max-height:150mm}.warn{border:1px solid #c00;padding:6px}</style><h2 style="margin:0">Zuschnittplan ${A.esc(A.baseName())}</h2><p class="muted">Rohplatte ${de(k.plL)} × ${de(k.plB)} mm · Sägeblatt ${de(k.kerf)} mm · Besäumrand ${de(k.rand)} mm · Nummern = Nr. in der Stückliste · Länge der Teile läuft in Plattenlänge</p>${nestHTML()}`);w.document.close();w.focus();setTimeout(()=>w.print(),350)}

/* ----- Fenster ----- */
const isOpen=()=>$('kp').classList.contains('open');
let bound=false;
function open(){A.cancel();K();$('kp').classList.add('open');if(!bound){bound=true;bindCanvas();
  $('kp').addEventListener('click',e=>{const b=e.target.closest('[data-kp]');if(b){const a=b.dataset.kp;if(a==='close')close();else if(a==='list')openList();else if(a==='nest')openNest();else if(a==='draw')toDrawing();else if(a==='undo'){A.undo();refresh()}else if(a==='redo'){A.redo();refresh()}else if(V3)V3.view(a);return}
   const m=e.target.closest('[data-kpm]');if(m)setMode(m.dataset.kpm)});
  $('kpRepOk').onclick=()=>{$('dKpRep').classList.remove('open');toDrawing('replace')};$('kpRepAdd').onclick=()=>{$('dKpRep').classList.remove('open');toDrawing('add')};
  if(matchMedia('(pointer:coarse)').matches)$('kp3dmsg').textContent='3D · ziehen = drehen · zwei Finger = Zoom';
  $('dKpn').addEventListener('click',e=>{const b=e.target.closest('[data-kpn]');if(b&&b.dataset.kpn==='print')printNest()});
  for(const[f,min,max]of[['plL',500,6000],['plB',300,3000],['kerf',0,10],['rand',0,50]]){const el=$('kn_'+f);el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur()});el.addEventListener('change',()=>{const v=pnum(el.value);if(v!=null)A.commit(()=>{K()[f]=clampN(v,min,max)});openNest();$('kpnNote').textContent=v==null?`„${el.value}“ ist keine Zahl.`:v<min||v>max?`Erlaubt sind ${de(min)} bis ${de(max)} – auf ${de(clampN(v,min,max))} gesetzt.`:''})}
  $('kpfront').addEventListener('change',e=>{showFront=e.target.checked;refresh(true)});
  $('dKpl').addEventListener('click',async e=>{const b=e.target.closest('[data-kpsvg],[data-kpl]');if(!b)return;
   if(b.dataset.kpsvg!=null){const r=list(K())[+b.dataset.kpsvg],svg=window.__cad.buildSVG(partEnts(r.p,r.n));const n=await A.saveBlob(`${r.p.name.replace(/[^A-Za-z0-9äöüÄÖÜß]+/g,'-')}-${de(r.p.W)}x${de(r.p.H)}.svg`,svg,'image/svg+xml','SVG für Shaper Origin');if(n)msg('Gespeichert: '+n);return}
   const a=b.dataset.kpl;if(a==='print')printList();else if(a==='csv')await A.saveBlob(A.baseName()+'-Stueckliste.csv',csv(';'),'text/csv','Stückliste');else if(a==='cut')await A.saveBlob(A.baseName()+'-CutList.csv',csv(',',true),'text/csv','CutList Optimizer');else if(a==='draw'){$('dKpl').classList.remove('open');toDrawing()}})}
 pick=null;setMode('sel');refresh()}
function close(){$('kp').classList.remove('open');$('dKpl').classList.remove('open');$('dKpn').classList.remove('open')}
function key(e){const t=e.target,inField=t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA');
 if(document.querySelector('#dHelp.open')){if(e.key==='Escape')$('dHelp').classList.remove('open');return}
 if(e.key==='F1'){e.preventDefault();A.help('k');return}
 if(e.key==='Escape'){e.preventDefault();if($('dKpn').classList.contains('open'))$('dKpn').classList.remove('open');else if($('dKpl').classList.contains('open'))$('dKpl').classList.remove('open');else if(mode!=='sel')setMode('sel');else if(pick){pick=null;refresh(true)}return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();A.save();return}
 if((e.ctrlKey||e.metaKey)&&!inField){const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();e.shiftKey?A.redo():A.undo();refresh()}else if(k==='y'){e.preventDefault();A.redo();refresh()}
  /* andere Strg-Buchstaben nicht an den Browser geben (Strg+R lädt sonst die Seite neu) */else if(/^[a-z]$/.test(k)&&!e.altKey){e.preventDefault();msg(k==='p'?'Drucken: Stückliste oder Zuschnittplan öffnen und dort „Drucken“.':'Dieses Strg-Kürzel gibt es im Korpusplaner nicht – F1 zeigt die Bedienung.')}return}
 if((e.key==='Delete'||e.key==='Backspace')&&!inField&&pick){e.preventDefault();removePick()}}
return{nestOf,nestHTMLOf,matName,mat,openAll:()=>{['cab','in','mat','verb','besch','sock'].forEach(x=>openSec.add(x));refresh()},clean,select:i=>{cur=i;pick=null;refresh()},fronts,nest,MATS,open,close,isOpen,key,parts,list,partEnts,model3,get state(){return K()},refresh,get view(){return view},hitAt,csv,DEF}})();
/* wiederhergestellte Planung aus dem Browserspeicher prüfen */
{const s=window.__cad.S;if(s.korpus)s.korpus=window.KORPUS.clean(s.korpus)||undefined}
