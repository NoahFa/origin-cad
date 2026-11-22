/* Origin CAD – Korpusplaner: Schränke über Maße planen, Böden/Mittelwände mit der Maus setzen,
   daraus Einzelteile mit Bohrungen (für die Origin), Stückliste und 3D-Ansicht.
   Daten liegen in der Zeichnung unter S.korpus und werden mitgespeichert.
   Koordinaten im Raum: X = Breite (links→rechts), Y = Tiefe (vorn = 0), Z = Höhe. */
window.KORPUS=(()=>{
const A=window.__cad.kp,$=id=>document.getElementById(id),S=()=>window.__cad.S;
const newCab=(o={})=>Object.assign({b:600,h:720,d:560,ks:[],mw:[],fb:[],eb:[{x:300,y:350}],front:'2',sn:3,nm:0,nf:0,ne:1},o);
const DEF=()=>({...BT,t:19,rw:8,nt:10,na:20,fuge:3,sockel:false,sh:100,sr:50,lr:'boden',dub:true,topf:true,nut:true,cabs:[newCab()]});
const DUB_D=8,DUB_T=12,LR_D=5,LR_T=13,TOPF_D=35,TOPF_T=13,SK=16,TANDEM_NL=[250,270,300,350,400,450,500,550,600];
let cur=0,pick=null,mode='sel',showFront=true,V3=null,drag=null,view={s:1,ox:0,oy:0},cache3=new Map(),timer=0;
/* Bodenträger: Häfele „Jimmy“ (282.25.716) zum Einstecken, Bohr-Ø 4 mm – btD Bohr-Ø, btT Bohrtiefe, btA Lochmitte unter der Boden-Unterkante */
/* Beispielhafte Dekore aus dem EGGER-Programm (Farben am Bildschirm nur ungefähr) */
const MATS=[['','Holz neutral (ohne Dekor)',[0.86,0.72,0.52]],['W1000','Premiumweiß',[0.95,0.95,0.94]],['W980','Platinweiß',[0.92,0.92,0.89]],['U708','Hellgrau',[0.79,0.80,0.79]],['U702','Kaschmirgrau',[0.77,0.73,0.67]],['U732','Staubgrau',[0.55,0.55,0.53]],['U961','Graphitgrau',[0.27,0.28,0.29]],['U999','Schwarz',[0.11,0.11,0.12]],
 ['H1145','Bardolino Eiche natur',[0.80,0.68,0.52]],['H3303','Hamilton Eiche natur',[0.76,0.60,0.42]],['H1180','Halifax Eiche natur',[0.71,0.55,0.37]],['H3331','Nebraska Eiche natur',[0.69,0.51,0.33]],['H1344','Sherman Eiche cognacbraun',[0.55,0.36,0.22]],['H3700','Nussbaum Pacific natur',[0.45,0.30,0.20]]];
const mat=id=>MATS.find(m=>m[0]===id)||MATS[0],matName=id=>id?`EGGER ${id} ${mat(id)[1]}`:'–',css=(c,f=1)=>`rgb(${c.map(v=>Math.round(Math.min(1,v*f)*255)).join(',')})`;
const BT={matK:'',matF:'',matR:'',ksD:25,btD:4,btT:10,btA:2,sv:true,svT:14,svX:9.5,svO:0,svB:13};
/* Würth Systemverbinder SV 20 E: Gehäuse Ø20 in der Fläche des waagrechten Teils (svT tief, Mitte svX von der Stirnkante),
   Systembolzen in Ø5-Bohrung der Seite (svB tief), 37 mm von vorn und hinten; svO = Bolzen über (+) / unter (−) der Plattenmitte */
const SV_D=20,SV_BD=5;
const K=()=>{const s=S();if(!s.korpus)s.korpus=DEF();for(const f in BT)if(s.korpus[f]==null)s.korpus[f]=BT[f];for(const c of s.korpus.cabs)if(!c.ks)c.ks=[];return s.korpus};
const num=v=>Math.round(v*100)/100,de=v=>String(num(v)).replace('.',',');
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ----- Fächer ----- */
function comps(c,k){const xs=[...c.mw].sort((a,b)=>a-b),o=[];let x=k.t;for(const w of xs){o.push({x0:x,x1:w});x=w+k.t}o.push({x0:x,x1:c.b-k.t});return o}
const compAt=(c,k,x)=>{const cs=comps(c,k);return cs.find(f=>x>=f.x0&&x<=f.x1)||cs.reduce((a,f)=>Math.abs((f.x0+f.x1)/2-x)<Math.abs((a.x0+a.x1)/2-x)?f:a)};
function spread(c,k){const iw=c.b-2*k.t,ih=c.h-2*k.t;c.mw=[];for(let i=0;i<c.nm;i++)c.mw.push(num(k.t+(iw-c.nm*k.t)/(c.nm+1)*(i+1)+i*k.t));
 c.fb=[];c.eb=[];const all=c.nf+c.ne;
 for(const f of comps(c,k)){const x=num((f.x0+f.x1)/2);for(let i=0;i<all;i++){const y=num(k.t+(ih-all*k.t)/(all+1)*(i+1)+i*k.t);/* feste Böden möglichst in die Mitte */
   const fixed=c.nf>0&&isFixedSlot(i,all,c.nf);(fixed?c.fb:c.eb).push({x,y})}}}
function isFixedSlot(i,all,nf){const pos=[];for(let j=0;j<nf;j++)pos.push(Math.round((all-1)*(j+1)/(nf+1)));return pos.includes(i)}
function tidy(k){for(const c of k.cabs){c.b=clampN(c.b,150,3000);c.h=clampN(c.h,150,3000);c.d=clampN(c.d,120,1200);
  c.mw=c.mw.map(x=>num(clampN(x,k.t+40,c.b-2*k.t-40))).filter((x,i,a)=>a.indexOf(x)===i);
  if(!c.ks)c.ks=[];for(const l of[c.fb,c.eb])for(const s of l){s.y=num(clampN(s.y,k.t+20,c.h-2*k.t-20));s.x=clampN(s.x,k.t+1,c.b-k.t-1)}
  for(const s of c.ks){s.y=num(clampN(s.y,k.t+30,c.h-k.t-25));s.x=clampN(s.x,k.t+1,c.b-k.t-1)}
  if(c.front==='s'){c.mw=[];c.fb=[];c.eb=[];c.ks=[]}c.sn=clampN(Math.round(c.sn)||1,1,8)}}

/* ----- Teile erzeugen ----- */
function dubPos(len){const steps=Math.floor((len-64)/32);if(steps<1)return[num(len/2)];const n=Math.max(2,Math.round(steps*32/192)+1),o=[];for(let i=0;i<n;i++)o.push(32+32*Math.round(i*steps/(n-1)));return[...new Set(o)]}
function dubSv(len){/* Dübel zwischen den Verbindern: 64 hinter dem vorderen und vor dem hinteren, ab 300 mm Abstand einer in der Mitte */const a=101,b=len-101;if(b-a<32)return[num(len/2)];const o=[a];if(b-a>300)o.push(a+32*Math.round((b-a)/64));o.push(num(b));return o}
function hingeYs(H){const n=H>1600?4:H>900?3:2,o=[];for(let i=0;i<n;i++)o.push(num(100+(H-200)*i/(n-1)));return o}
function parts(k){k=k||K();const out=[],t=k.t;let x0=0;const z0=k.sockel?k.sh:0;
 const mk=(ci,name,W,H,T,o,u,v,x={})=>{const p=Object.assign({ci,name,W:num(W),H:num(H),T,o,u,v,holes:[],grooves:[],ticks:[],tint:[1,1,1]},x);p.matId=p.rod?'':p.isFront?k.matF:p.mat==='Rückwand'?k.matR:k.matK;if(p.matId)p.tint=p.name.startsWith('Sockel')?[0.8,0.8,0.8]:[1,1,1];out.push(p);return p};
 k.cabs.forEach((c,ci)=>{const dE=k.nut?c.d-k.na-k.rw:c.d,svs=k.sv&&dE>=140?[37,dE-37]:[],xs=!k.dub?[]:svs.length?dubSv(dE):dubPos(dE);
  const SL=mk(ci,'Seite links',c.d,c.h,t,[x0,0,z0],[0,1,0],[0,0,1],{front:'x0'}),SR=mk(ci,'Seite rechts',c.d,c.h,t,[x0+c.b,c.d,z0],[0,-1,0],[0,0,1],{front:'xW'});
  const BO=mk(ci,'Boden',c.b-2*t,c.d,t,[x0+t,0,z0],[1,0,0],[0,1,0],{front:'y0'}),DE=mk(ci,'Deckel',c.b-2*t,c.d,t,[x0+t,c.d,z0+c.h],[1,0,0],[0,-1,0],{front:'yH'});
  const hole=(p,x,y,d,depth,back,mark)=>p.holes.push({x:num(x),y:num(y),d,depth,back:!!back,...(mark?{mark:1}:{})});
  /* Flächen, in die von links/rechts gebohrt wird: face(xKante, 'l'|'r') liefert Funktion (Tiefe, Höhe, Ø, Bohrtiefe) */
  const walls=[...c.mw].sort((a,b)=>a-b).map(x=>({x,p:mk(ci,'Mittelwand',dE,c.h-2*t,t,[x0+x,0,z0+t],[0,1,0],[0,0,1],{front:'x0'})}));
  const faceL=xEdge=>{if(Math.abs(xEdge-t)<1e-6)return(dp,z,d,dt,m)=>hole(SL,dp,z,d,dt,false,m);const w=walls.find(w=>Math.abs(w.x+t-xEdge)<1e-6);return w?(dp,z,d,dt,m)=>hole(w.p,dp,z-t,d,dt,false,m):()=>{}};
  const faceR=xEdge=>{if(Math.abs(xEdge-(c.b-t))<1e-6)return(dp,z,d,dt,m)=>hole(SR,c.d-dp,z,d,dt,false,m);const w=walls.find(w=>Math.abs(w.x-xEdge)<1e-6);return w?(dp,z,d,dt,m)=>hole(w.p,dp,z-t,d,dt,true,m):()=>{}};
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
   for(const dx of xs){L(dx,s.y+t/2,DUB_D,DUB_T);R(dx,s.y+t/2,DUB_D,DUB_T);p.ticks.push({x:0,y:dE-dx,e:'l'},{x:p.W,y:dE-dx,e:'r'})}
   for(const dx of svs){L(dx,s.y+t/2-k.svO,SV_BD,k.svB);R(dx,s.y+t/2-k.svO,SV_BD,k.svB);hole(p,k.svX,dE-dx,SV_D,k.svT);hole(p,p.W-k.svX,dE-dx,SV_D,k.svT)}}
  /* Einlegeböden + Lochreihen */
  const cols=[37,dE-37];
  for(const s of c.eb){const f=compAt(c,k,s.x);mk(ci,'Einlegeboden',f.x1-f.x0-2,dE-10,t,[x0+f.x0+1,10,z0+s.y],[1,0,0],[0,1,0],{front:'y0',tint:[1.04,1.04,1.04]});
   if(k.lr==='boden'){const L=faceL(f.x0),R=faceR(f.x1);for(const dz of[-32,0,32]){const z=s.y-k.btA+dz;if(z<t+15||z>c.h-t-15)continue;for(const dp of cols){L(dp,z,k.btD,k.btT);R(dp,z,k.btD,k.btT)}}}}
  if(k.lr==='voll')for(const f of comps(c,k)){const L=faceL(f.x0),R=faceR(f.x1),fix=c.fb.filter(s=>Math.abs(compAt(c,k,s.x).x0-f.x0)<1e-6);
   for(let z=t+64;z<=c.h-t-64+1e-6;z+=32){if(fix.some(s=>z>s.y-12&&z<s.y+t+12))continue;for(const dp of cols){L(dp,z,k.btD,k.btT);R(dp,z,k.btD,k.btT)}}}
  /* Kleiderstangen: Stange in der Mitte der Tiefe, Lagermitte an den Seiten nur angezeichnet */
  for(const s of c.ks||[]){const f=compAt(c,k,s.x),D=k.ksD;mk(ci,'Kleiderstange Ø'+de(D),f.x1-f.x0-4,D,D,[x0+f.x0+2,dE/2+D/2,z0+s.y-D/2],[1,0,0],[0,0,1],{rod:true,mat:'Stange',tint:[0.9,0.95,1.05]});
   faceL(f.x0)(dE/2,s.y,D,0,1);faceR(f.x1)(dE/2,s.y,D,0,1)}
  /* Fronten */
  const fg=k.fuge,door=(xRight,Wd,side)=>{const Hd=c.h-2*fg,p=mk(ci,'Tür '+(side==='l'?'links':'rechts'),Wd,Hd,t,[x0+xRight,-t-2,z0+fg],[-1,0,0],[0,0,1],{front:1,isFront:true,tint:[1.1,1.07,1.02]});
   if(!k.topf)return;const hx=side==='l'?Wd-21.5:21.5,sg=side==='l'?-1:1;
   for(const y of hingeYs(Hd)){hole(p,hx,y,TOPF_D,TOPF_T);hole(p,hx+sg*9.5,y+22.5,8,11);hole(p,hx+sg*9.5,y-22.5,8,11);
    for(const dz of[-16,16])side==='l'?hole(SL,37,fg+y+dz,LR_D,LR_T):hole(SR,c.d-37,fg+y+dz,LR_D,LR_T)}};
  if(c.front==='l')door(c.b-fg,c.b-2*fg,'l');else if(c.front==='r')door(c.b-fg,c.b-2*fg,'r');
  else if(c.front==='2'){const Wd=(c.b-3*fg)/2;door(fg+Wd,Wd,'l');door(c.b-fg,Wd,'r')}
  else if(c.front==='s'){/* Holzschubkasten auf Blum TANDEM (Vollauszug 560H): Innenbreite = lichte Weite − 42, Länge = Nennlänge − 10,
     Einbautiefe mind. Nennlänge + 3, Boden 13 zurückgesetzt, unten 14 und oben 7 Luft, Seitenstärke 16 */
   const n=c.sn,Hf=(c.h-(n+1)*fg)/n,LW=c.b-2*t,bw=LW-10,NL=[...TANDEM_NL].reverse().find(l=>l+3<=dE)||TANDEM_NL[0],bl=NL-10,GR=6;
   for(let i=0;i<n;i++){const zf=fg+i*(Hf+fg),lo=i===0?t:zf-fg/2,hi=i===n-1?c.h-t:zf+Hf+fg/2,hS=Math.max(60,Math.floor(hi-lo-14-7-9)),bx=x0+t+5,bz=z0+lo+14;
    mk(ci,'Schubkastenfront',c.b-2*fg,Hf,t,[x0+c.b-fg,-t-2,z0+zf],[-1,0,0],[0,0,1],{isFront:true,tint:[1.1,1.07,1.02]});
    const gS={x:-4,y:13,w:bl+8,h:k.rw,depth:GR};
    mk(ci,'Schubkasten Seite',bl,hS,SK,[bx,0,bz],[0,1,0],[0,0,1],{box:true,nl:NL}).grooves.push(gS);mk(ci,'Schubkasten Seite',bl,hS,SK,[bx+bw,bl,bz],[0,-1,0],[0,0,1],{box:true,nl:NL}).grooves.push({...gS});
    mk(ci,'Schubkasten Vorderstück',bw-2*SK,hS,SK,[bx+bw-SK,0,bz],[-1,0,0],[0,0,1],{box:true}).grooves.push({x:-4,y:13,w:bw-2*SK+8,h:k.rw,depth:GR});
    const hk=mk(ci,'Schubkasten Hinterstück',bw-2*SK,hS-13-k.rw,SK,[bx+SK,bl,bz+13+k.rw],[1,0,0],[0,0,1],{box:true});hole(hk,7,7,6,10,true);hole(hk,hk.W-7,7,6,10,true);
    mk(ci,'Schubkasten Boden',bw-2*SK+2*GR-1,bl-SK+GR-0.5,k.rw,[bx+SK-GR+0.5,SK-GR+0.5,bz+13],[1,0,0],[0,1,0],{box:true,mat:'Rückwand'})}}
  x0+=c.b});
 if(k.sockel&&k.cabs.length){const W=x0,dm=Math.min(...k.cabs.map(c=>c.d)),yb=dm-50,len=yb-t-(k.sr+t);
  mk(-1,'Sockelblende vorn',W,k.sh,t,[0,k.sr+t,0],[1,0,0],[0,0,1],{tint:[0.8,0.8,0.8]});mk(-1,'Sockelblende hinten',W,k.sh,t,[0,yb,0],[1,0,0],[0,0,1],{tint:[0.8,0.8,0.8]});
  const xq=[0];let x=0;k.cabs.forEach((c,i)=>{x+=c.b;xq.push(i===k.cabs.length-1?x-t:x-t/2)});
  if(len>20)for(const q of xq)mk(-1,'Sockel Querstück',len,k.sh,t,[q,k.sr+t,0],[0,1,0],[0,0,1],{tint:[0.8,0.8,0.8]})}
 return out}

/* ----- Einzelteil als Zeichnung (für die Origin) ----- */
function partEnts(p,qty){const es=[],tool=S().def.tool;
 es.push({t:'pline',ly:'Kontur',pts:[[0,0],[p.W,0],[p.W,p.H],[0,p.H]],closed:true,rect:true,ct:'outside',cd:p.T});
 for(const g of p.grooves)es.push({t:'pline',ly:'Kontur',pts:[[g.x,g.y],[g.x+g.w,g.y],[g.x+g.w,g.y+g.h],[g.x,g.y+g.h]],closed:true,rect:true,ct:'pocket',cd:g.depth,...(tool>Math.min(g.w,g.h)?{tool:Math.min(6,Math.min(g.w,g.h))}:{})});
 for(const h of p.holes){if(h.mark){es.push({t:'circle',ly:'Hilfslinien',c:[h.x,h.y],r:h.d/2,ct:'guide'},{t:'line',ly:'Hilfslinien',a:[h.x-h.d,h.y],b:[h.x+h.d,h.y]},{t:'line',ly:'Hilfslinien',a:[h.x,h.y-h.d],b:[h.x,h.y+h.d]});continue}
  if(h.back)es.push({t:'circle',ly:'Rückseite',c:[h.x,h.y],r:h.d/2,ct:'guide'});else es.push({t:'circle',ly:'Kontur',c:[h.x,h.y],r:h.d/2,ct:'pocket',cd:h.depth,...(tool<h.d-1e-9?{}:{tool:3})})}
 for(const k of p.ticks){const d={l:[14,0],r:[-14,0],b:[0,14],t:[0,-14]}[k.e];es.push({t:'line',ly:'Hilfslinien',a:[k.x,k.y],b:[k.x+d[0],k.y+d[1]]})}
 const th=clampN(Math.min(p.W,p.H)/12,6,16);es.push({t:'text',ly:'Hilfslinien',p:[Math.min(60,p.W*0.15),Math.min(70,p.H*0.3)],s:`${p.name} ${de(p.W)} x ${de(p.H)} x ${de(p.T)}${qty>1?'  ('+qty+' Stück)':''}`,h:th,a:0,ct:'guide'});
 if(typeof p.front==='string'){const m=p.front,hv=clampN(th*0.8,5,12),pos={x0:[4,p.H/2],xW:[p.W-4-hv,p.H/2],y0:[p.W/2,4],yH:[p.W/2,p.H-4-hv]}[m];es.push({t:'text',ly:'Hilfslinien',p:pos,s:'VORN',h:hv,a:m[0]==='x'?Math.PI/2:0,ct:'guide'});if(m[0]==='x')es[es.length-1].p=[pos[0]+hv,pos[1]]}
 if(p.holes.some(h=>h.back))es.push({t:'text',ly:'Hilfslinien',p:[Math.min(60,p.W*0.15),Math.min(70,p.H*0.3)+th*1.8],s:'Blaue Kreise: von der Rueckseite bohren',h:th*0.7,a:0,ct:'guide'});
 return es}
const pKey=p=>[p.name,p.matId,p.W,p.H,p.T,JSON.stringify(p.holes),JSON.stringify(p.grooves),JSON.stringify(p.ticks)].join('|');
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
function fitView(){const c=cv(),k=K(),W=rowW(k),H=Math.max(...k.cabs.map(c=>c.h))+(k.sockel?k.sh:0),w=c.clientWidth,h=c.clientHeight,ml=Math.min(110,w*0.16),mb=Math.min(105,h*0.16),mt=Math.min(95,h*0.14);view.s=Math.min((w-2*ml)/W,(h-mb-mt)/H);view.ox=(w-W*view.s)/2;view.oy=h-mb-((h-mb-mt)-H*view.s)/2}
const sx=x=>view.ox+x*view.s,sy=z=>view.oy-z*view.s;
function items(k){/* anklickbare Dinge: {type:'fb'|'eb'|'mw', ci, i, rect:[x,z,w,h] in mm (Zeile)} */const o=[],z0=k.sockel?k.sh:0;
 k.cabs.forEach((c,ci)=>{const X=cabX(k,ci);c.mw.forEach((x,i)=>o.push({type:'mw',ci,i,rect:[X+x,z0+k.t,k.t,c.h-2*k.t]}));
  for(const ty of['fb','eb'])c[ty].forEach((s,i)=>{const f=compAt(c,k,s.x);o.push({type:ty,ci,i,rect:[X+f.x0,z0+s.y,f.x1-f.x0,k.t]})});
  (c.ks||[]).forEach((s,i)=>{const f=compAt(c,k,s.x);o.push({type:'ks',ci,i,rect:[X+f.x0,z0+s.y-k.ksD/2,f.x1-f.x0,k.ksD]})})});return o}
function draw(){const c=cv(),k=K();if(!c.clientWidth)return;const dpr=window.devicePixelRatio||1;if(c.width!==Math.round(c.clientWidth*dpr)||c.height!==Math.round(c.clientHeight*dpr)){c.width=Math.round(c.clientWidth*dpr);c.height=Math.round(c.clientHeight*dpr)}
 if(!drag)fitView();const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#16191d';g.fillRect(0,0,c.clientWidth,c.clientHeight);
 const R=(x,z,w,h,fill,stroke,lw=1,dash)=>{g.beginPath();g.rect(sx(x),sy(z+h),w*view.s,h*view.s);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.setLineDash(dash||[]);g.stroke();g.setLineDash([])}};
 const T=(s,x,y,col='#9aa3ad',al='center',rot=0)=>{g.save();g.translate(x,y);g.rotate(rot);g.font='12.5px "IBM Plex Sans",system-ui,sans-serif';g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(s,0,0);g.restore()};
 const z0=k.sockel?k.sh:0,mc=mat(k.matK)[2],wood=css(mc),woodD=css(mc,0.78),t=k.t;
 if(k.sockel)R(0,0,rowW(k),k.sh,'#3a3f46','#5a616b');
 k.cabs.forEach((c,ci)=>{const X=cabX(k,ci),act=ci===cur;
  R(X,z0,c.b,c.h,'#20242a',null);
  R(X,z0,t,c.h,wood,woodD);R(X+c.b-t,z0,t,c.h,wood,woodD);R(X+t,z0,c.b-2*t,t,wood,woodD);R(X+t,z0+c.h-t,c.b-2*t,t,wood,woodD);
  if(c.front==='s'){const n=c.sn,Hf=(c.h-(n+1)*k.fuge)/n;for(let i=0;i<n;i++){R(X+k.fuge,z0+k.fuge+i*(Hf+k.fuge),c.b-2*k.fuge,Hf,'rgba(201,168,119,.28)','#e8d5b0',1.2);const zc=z0+k.fuge+i*(Hf+k.fuge)+Hf/2;g.strokeStyle='#e8d5b0';g.lineWidth=2;g.beginPath();g.moveTo(sx(X+c.b/2-40),sy(zc));g.lineTo(sx(X+c.b/2+40),sy(zc));g.stroke()}}
  else{const Hd=c.h-2*k.fuge,dr=(xl,Wd,side)=>{R(xl,z0+k.fuge,Wd,Hd,null,'#e8d5b0',1.2,[7,5]);g.strokeStyle='rgba(232,213,176,.5)';g.lineWidth=1;g.setLineDash([3,5]);g.beginPath();const xh=side==='l'?xl:xl+Wd,xo=side==='l'?xl+Wd:xl;g.moveTo(sx(xh),sy(z0+k.fuge));g.lineTo(sx(xo),sy(z0+k.fuge+Hd/2));g.lineTo(sx(xh),sy(z0+k.fuge+Hd));g.stroke();g.setLineDash([])};
   if(showFront){if(c.front==='l'||c.front==='r')dr(X+k.fuge,c.b-2*k.fuge,c.front);else if(c.front==='2'){const Wd=(c.b-3*k.fuge)/2;dr(X+k.fuge,Wd,'l');dr(X+2*k.fuge+Wd,Wd,'r')}}}
  if(act){g.strokeStyle='#e5482d';g.lineWidth=2;g.strokeRect(sx(X)-3,sy(z0+c.h)-3,c.b*view.s+6,c.h*view.s+6)}
  T('Korpus '+(ci+1)+' · Tiefe '+de(c.d),sx(X+c.b/2),sy(z0+c.h)-16,act?'#ff8a70':'#9aa3ad')});
 for(const it of items(k)){const sel=pick&&pick.type===it.type&&pick.ci===it.ci&&pick.i===it.i,[x,z,w,h]=it.rect;
  if(it.type==='ks'){R(x,z,w,h,'#b9c2cc',sel?'#e5482d':'#7d8792',sel?2:1);R(x,z-6,8,h+12,'#7d8792',null);R(x+w-8,z-6,8,h+12,'#7d8792',null)}
  else R(x,z,w,h,it.type==='eb'?'rgba(201,168,119,.55)':wood,sel?'#e5482d':woodD,sel?2:1,it.type==='eb'?[5,3]:null);
  if(sel){const c=k.cabs[it.ci];if(it.type==='mw')T(de(c.mw[it.i])+' von links',sx(x+w/2),sy(z+h)-34,'#ffb020');else T(de(c[it.type][it.i].y)+(it.type==='ks'?' Stangenmitte':' ab Unterkante'),sx(x+w/2),sy(z+h)-12,'#ffb020')}}
 dims(g,k,T);
 $('kphint').textContent={sel:'Korpus anklicken = bearbeiten · Boden oder Mittelwand ziehen = verschieben · anklicken + Entf = löschen',fb:'In ein Fach klicken: fester Boden auf dieser Höhe',eb:'In ein Fach klicken: Einlegeboden auf dieser Höhe',ks:'In ein Fach klicken: Kleiderstange auf dieser Höhe',mw:'In einen Korpus klicken: Mittelwand an dieser Stelle'}[mode]}
/* Maßketten: immer sichtbar. Unten Korpusbreiten + Gesamtbreite, links Höhen, in jedem Fach lichte Breite und lichte Höhen */
function dims(g,k,T){const de=v=>String(Math.round(v*10)/10).replace('.',',');const z0=k.sockel?k.sh:0,W=rowW(k),Hm=Math.max(...k.cabs.map(c=>c.h)),col='#5ad1e8',t=k.t;
 const line=(x1,y1,x2,y2)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()},tick=(x,y)=>{line(x-4,y+4,x+4,y-4)};
 g.strokeStyle=col;g.lineWidth=1;g.setLineDash([]);
 const dH=(xa,xb,py,txt,ext)=>{const a=sx(xa),b=sx(xb);line(a,py,b,py);tick(a,py);tick(b,py);if(ext){line(a,ext,a,py+5);line(b,ext,b,py+5)}if(b-a>=30||(txt.length<4&&b-a>=18))T(txt,(a+b)/2,py-9,col)};
 const dV=(za,zb,px,txt,ext,side=-1)=>{const a=sy(za),b=sy(zb);line(px,a,px,b);tick(px,a);tick(px,b);if(ext!=null){line(ext,a,px+side*5,a);line(ext,b,px+side*5,b)}if(a-b>=30)T(txt,px+side*9,(a+b)/2,col,'center',-Math.PI/2)};
 /* unten */
 const y1=sy(0)+26,y2=sy(0)+54;let X=0;k.cabs.forEach(c=>{dH(X,X+c.b,y1,de(c.b),sy(0)+4);X+=c.b});if(k.cabs.length>1)dH(0,W,y2,de(W),y1+4);
 /* links: Sockel + Korpus, außen gesamt */
 const c0=k.cabs[0],x1=sx(0)-26,x2=sx(0)-54;
 if(k.sockel){dV(0,k.sh,x1,de(k.sh),sx(0)-4);dV(z0,z0+c0.h,x1,de(c0.h),sx(0)-4);dV(0,z0+Hm,x2,de(z0+Hm),x1-4)}else dV(0,c0.h,x1,de(c0.h),sx(0)-4);
 /* rechts: Höhe, falls der letzte Korpus anders hoch ist */
 const cl=k.cabs[k.cabs.length-1];if(k.cabs.length>1&&Math.abs(cl.h-c0.h)>1e-6)dV(z0,z0+cl.h,sx(W)+26,de(cl.h),sx(W)+4,1);
 X=0;k.cabs.forEach((c,ci)=>{if(ci>0&&ci<k.cabs.length-1&&Math.abs(c.h-c0.h)>1e-6)T('Höhe '+de(c.h),sx(X+c.b/2),sy(z0+c.h)-32,col);X+=c.b});
 /* innen */
 g.strokeStyle='rgba(90,209,232,.75)';X=0;
 k.cabs.forEach(c=>{if(c.front!=='s')for(const f of comps(c,k)){const xm=(f.x0+f.x1)/2,inF=l=>l.filter(s=>Math.abs(compAt(c,k,s.x).x0-f.x0)<1e-6);
    const lv=[{a:t,b:t},...inF(c.fb).map(s=>({a:s.y,b:s.y+t})),...inF(c.eb).map(s=>({a:s.y,b:s.y+t})),{a:c.h-t,b:c.h-t}].sort((p,q)=>p.a-q.a);
    const px=sx(X+f.x0)+13;for(let i=0;i<lv.length-1;i++){const lo=lv[i].b,hi=lv[i+1].a;if(hi-lo>1)dV(z0+lo,z0+hi,px,de(hi-lo),null,1)}
    dH(X+f.x0,X+f.x1,sy(z0+c.h-t)+16,de(f.x1-f.x0));
    for(const s of inF(c.ks||[]))T('Stange '+de(s.y),sx(X+xm),sy(z0+s.y)+k.ksD/2*view.s+11,col)}
  else{const n=c.sn,Hf=(c.h-(n+1)*k.fuge)/n;for(let i=0;i<n;i++)T(de(c.b-2*k.fuge)+' × '+de(Hf),sx(X+c.b/2),sy(z0+k.fuge+i*(Hf+k.fuge)+Hf/2)+16,'#e8d5b0')}
  X+=c.b})}
function hitAt(px,py){const k=K(),x=(px-view.ox)/view.s,z=(view.oy-py)/view.s,tol=6/view.s,z0=k.sockel?k.sh:0;
 const it=items(k).find(i=>x>=i.rect[0]-tol&&x<=i.rect[0]+i.rect[2]+tol&&z>=i.rect[1]-tol&&z<=i.rect[1]+i.rect[3]+tol);let ci=-1;k.cabs.forEach((c,i)=>{const X=cabX(k,i);if(x>=X&&x<=X+c.b&&z>=z0&&z<=z0+c.h)ci=i});
 return{it,ci,x,z,lx:ci>=0?x-cabX(k,ci):0,lz:z-z0}}
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
const F_ROW=[['t','Plattenstärke',5,60],['rw','Rückwandstärke',3,25],['fuge','Fuge der Fronten',0,20]];
const F_CAB=[['b','Breite'],['h','Höhe'],['d','Tiefe']];
function form(){const k=K(),c=k.cabs[cur],inp=(id,lab,val,x='')=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${de(val)}" ${x}></div>`,
 chk=(id,lab,on)=>`<label class="kpchk"><input type="checkbox" id="${id}" ${on?'checked':''}> ${lab}</label>`;
 $('kpform').innerHTML=`<h2>Korpus ${cur+1} <span>von ${k.cabs.length}</span></h2>
 ${F_CAB.map(([f,l])=>inp('kc_'+f,l+' mm',c[f])).join('')}
 <div class="pr"><label for="kc_front">Front</label><select id="kc_front">${[['n','Offen (keine Front)'],['l','1 Tür, Band links'],['r','1 Tür, Band rechts'],['2','2 Türen'],['s','Schubkästen (Blum TANDEM)']].map(([v,l])=>`<option value="${v}" ${c.front===v?'selected':''}>${l}</option>`).join('')}</select></div>
 ${c.front==='s'?inp('kc_sn','Schubkästen',c.sn)+tandemInfo(c,k):`<h2 style="margin-top:14px">Innenaufteilung</h2>${inp('kc_nm','Mittelwände',c.nm)}${inp('kc_nf','Feste Böden je Fach',c.nf)}${inp('kc_ne','Einlegeböden je Fach',c.ne)}
 <button class="btn" id="kc_spread" style="width:100%">Gleichmäßig verteilen</button><p class="muted" style="margin-top:6px">Danach einzelne Böden und Wände in der Zeichnung mit der Maus verschieben.</p>`}
 <div id="kppick"></div>
 <div class="row" style="justify-content:flex-start;margin-top:14px"><button class="btn" id="kc_add">+ Korpus daneben</button><button class="btn" id="kc_del" ${k.cabs.length<2?'disabled style="opacity:.4"':''}>Korpus löschen</button></div>
 <h2 style="margin-top:20px">Für die ganze Zeile</h2>
 ${F_ROW.map(([f,l])=>inp('kr_'+f,l+' mm',k[f])).join('')}
 ${[['matK','Korpus'],['matF','Fronten'],['matR','Rückwand']].map(([f,l])=>`<div class="pr"><label for="kr_${f}">${l}</label><select id="kr_${f}">${MATS.map(m=>`<option value="${m[0]}" ${k[f]===m[0]?'selected':''}>${m[0]?m[0]+' '+m[1]:m[1]}</option>`).join('')}</select></div>`).join('')}<p class="muted" style="margin:2px 0 10px">Beispiel-Dekore von EGGER. Farben am Bildschirm sind nur ungefähr.</p>
 ${chk('kr_nut','Rückwand in Nut (10 tief, 20 von hinten)',k.nut)}${chk('kr_dub','Dübel Ø8 an allen Stößen',k.dub)}${chk('kr_sv','Würth Systemverbinder SV 20 E',k.sv)}${k.sv?inp('kr_svT','Gehäuse Ø20: Bohrtiefe',k.svT)+inp('kr_svX','Gehäusemitte von der Kante',k.svX)+inp('kr_svO','Bolzen über Plattenmitte',k.svO)+'<p class="muted" style="margin:2px 0 8px">Für 19 mm: 14 tief, 9,5 von der Kante (16 mm: 12,5 und 8). Bolzenloch Ø5 in der Seite, 37 von vorn und hinten.</p>':''}${chk('kr_topf','Topfbänder Ø35 (Blum) mit Montageplatten',k.topf)}
 <div class="pr" style="margin-top:6px"><label for="kr_lr">Bodenträger</label><select id="kr_lr">${[['boden','3 Löcher je Einlegeboden'],['voll','Lochreihe durchgehend'],['aus','keine Löcher']].map(([v,l])=>`<option value="${v}" ${k.lr===v?'selected':''}>${l}</option>`).join('')}</select></div>
 ${k.lr!=='aus'?inp('kr_btD','Bohr-Ø mm',k.btD)+inp('kr_btT','Bohrtiefe mm',k.btT)+inp('kr_btA','Lochmitte unter Boden mm',k.btA)+'<p class="muted" style="margin:2px 0 8px">Voreingestellt für Häfele „Jimmy“ (Bohr-Ø 4). Löcher 37 mm von vorn und hinten, im 32er-Abstand.</p>':''}
 ${chk('kr_sockel','Sockel',k.sockel)}${k.sockel?inp('kr_sh','Sockelhöhe mm',k.sh)+inp('kr_sr','Rücksprung mm',k.sr):''}`;
 const val=el=>{const v=parseFloat(el.value.replace(',','.'));return isFinite(v)?v:null},on=(id,fn)=>{const el=$(id);if(!el)return;el.addEventListener('change',()=>{fn(el);refresh()});if(el.tagName==='INPUT'&&el.type==='text')el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur()})};
 const set=(obj,f,min,max,after)=>el=>{const v=val(el);if(v==null)return;A.commit(()=>{obj[f]=clampN(v,min,max);after&&after();tidy(k)})};
 on('kc_b',set(c,'b',150,3000,()=>scaleX(c,k)));on('kc_h',set(c,'h',150,3000));on('kc_d',set(c,'d',120,1200));
 on('kc_front',el=>A.commit(()=>{c.front=el.value;tidy(k)}));on('kc_sn',set(c,'sn',1,8));
 for(const f of['nm','nf','ne'])on('kc_'+f,el=>{const v=val(el);if(v==null)return;A.commit(()=>{c[f]=clampN(Math.round(v),0,f==='nm'?6:12);spread(c,k);tidy(k)});pick=null});
 const sp=$('kc_spread');if(sp)sp.onclick=()=>{A.commit(()=>{spread(c,k);tidy(k)});pick=null;refresh()};
 $('kc_add').onclick=()=>{A.commit(()=>{k.cabs.splice(cur+1,0,JSON.parse(JSON.stringify(c)))});cur++;pick=null;refresh()};
 $('kc_del').onclick=()=>{if(k.cabs.length<2)return;A.commit(()=>{k.cabs.splice(cur,1)});cur=Math.max(0,cur-1);pick=null;refresh()};
 for(const[f,,min,max]of F_ROW)on('kr_'+f,set(k,f,min,max));for(const f of['matK','matF','matR'])on('kr_'+f,el=>A.commit(()=>{k[f]=el.value}));on('kr_svT',set(k,'svT',5,25));on('kr_svX',set(k,'svX',5,20));on('kr_svO',set(k,'svO',-10,10));for(const f of['nut','dub','sv','topf','sockel'])on('kr_'+f,el=>A.commit(()=>{k[f]=el.checked}));
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
 const p=$('kp_pos');p.addEventListener('keydown',e=>{if(e.key==='Enter')p.blur()});p.addEventListener('change',()=>{const n=parseFloat(p.value.replace(',','.'));if(!isFinite(n))return;A.commit(()=>{if(isW)c.mw[pick.i]=n;else c[pick.type][pick.i].y=n;tidy(k)});refresh()});$('kp_rm').onclick=removePick}
function removePick(){if(!pick)return;const k=K(),c=k.cabs[pick.ci];A.commit(()=>{if(pick.type==='mw')c.mw.splice(pick.i,1);else c[pick.type].splice(pick.i,1);tidy(k)});pick=null;refresh()}
function setMode(m){mode=m;document.querySelectorAll('[data-kpm]').forEach(b=>b.classList.toggle('on',b.dataset.kpm===m));draw()}
function msg(t){$('kpmsg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('kpmsg').textContent='',5000)}
function refresh(light){const k=K();cur=clampN(cur,0,k.cabs.length-1);if(!light)form();else fillPick();draw();upd3();
 const ps=parts(k),W=rowW(k);$('kpinfo').textContent=`${k.cabs.length} Korpus${k.cabs.length>1?'se':''} · ${de(W)} mm breit · ${ps.length} Teile`}

/* ----- Stückliste ----- */
function openList(){const k=K(),rows=list(k);
 $('kplT').innerHTML='<tr><th>Nr.</th><th>Teil</th><th>Länge</th><th>Breite</th><th>Stärke</th><th>Material</th><th>Stück</th><th>Korpus</th><th>Bohrungen</th><th></th></tr>'+rows.map((r,i)=>{const p=r.p,L=Math.max(p.W,p.H),B=Math.min(p.W,p.H),nb=p.holes.filter(h=>!h.mark).length,ng=p.grooves.length;
  return`<tr><td>${i+1}</td><td>${A.esc(p.name)}</td><td>${de(L)}</td><td>${de(B)}</td><td>${de(p.T)}</td><td>${p.rod?'Stange':A.esc(matName(p.matId))}</td><td>${r.n}</td><td>${[...r.cabs].join(', ')||'–'}</td><td>${nb?nb+' Löcher':''}${nb&&ng?', ':''}${ng?'Nut':''}${p.holes.some(h=>h.back)?' (auch Rückseite)':''}${!nb&&!ng?'–':''}</td><td>${p.rod?'':`<button class="btn" data-kpsvg="${i}">SVG</button>`}</td></tr>`}).join('');
 const area=rows.reduce((s,r)=>s+(r.p.mat?0:r.p.W*r.p.H*r.n),0)/1e6,areaR=rows.reduce((s,r)=>s+(r.p.mat==='Rückwand'?r.p.W*r.p.H*r.n:0),0)/1e6;
 $('kplsum').textContent=`${rows.reduce((s,r)=>s+r.n,0)} Teile · Platte ${de(k.t)} mm (Schubkasten-Zargen 16 mm mitgezählt): ${de(area)} m² · Rückwand/Böden ${de(k.rw)} mm: ${de(areaR)} m² (ohne Verschnitt)`;
 $('dKpl').classList.add('open')}
function csv(sep,cut){let rows=list(K());if(cut)rows=rows.filter(r=>!r.p.rod);if(cut)return'Length,Width,Qty,Material,Label,Enabled\n'+rows.map(r=>[Math.max(r.p.W,r.p.H),Math.min(r.p.W,r.p.H),r.n,(r.p.matId?r.p.matId+' ':'')+r.p.T+'mm',r.p.name,'true'].join(',')).join('\n')+'\n';
 return'﻿Nr;Teil;Länge;Breite;Stärke;Material;Stück;Korpus\n'+rows.map((r,i)=>[i+1,r.p.name,de(Math.max(r.p.W,r.p.H)),de(Math.min(r.p.W,r.p.H)),de(r.p.T),r.p.rod?'Stange':matName(r.p.matId),r.n,[...r.cabs].join(' ')].join(sep)).join('\n')+'\n'}
function printList(){const w=window.open('','_blank');if(!w){msg('Das Druckfenster wurde vom Browser blockiert.');return}
 w.document.write(`<!doctype html><meta charset="utf-8"><title>Stückliste</title><style>body{font:14px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px 8px;text-align:left}td:last-child,th:last-child{display:none}</style><h2>Stückliste ${A.esc(A.baseName())}</h2>${$('kplT').outerHTML}<p>${A.esc($('kplsum').textContent)}</p>`);w.document.close();w.focus();setTimeout(()=>w.print(),300)}
function toDrawing(){const rows=list(K()).filter(r=>!r.p.rod),all=[];let x=0,y=0,rowH=0;const b=A.bbox(S().ents),bx=b?b[2]+150:0,by=b?b[1]:0;
 for(const r of rows){if(r.p.rod)continue;if(x>0&&x+r.p.W>3200){x=0;y+=rowH+80;rowH=0}for(const e of partEnts(r.p,r.n)){const mv=p=>[p[0]+bx+x,p[1]+by+y],n=JSON.parse(JSON.stringify(e));
   if(n.pts)n.pts=n.pts.map(mv);if(n.c)n.c=mv(n.c);if(n.a&&n.b){n.a=mv(n.a);n.b=mv(n.b)}if(n.p)n.p=mv(n.p);all.push(n)}x+=r.p.W+80;rowH=Math.max(rowH,r.p.H)}
 let made;A.commit(()=>{made=A.addEnts(all)});close();A.after();A.select(made);A.log(`Korpusplaner: ${rows.length} verschiedene Teile in die Zeichnung gelegt (sind gewählt). Jedes Teil einzeln wählen und mit EX als SVG ausgeben – oder im Planer in der Stückliste „SVG“ je Teil.`,'ok')}

/* ----- Fenster ----- */
const isOpen=()=>$('kp').classList.contains('open');
let bound=false;
function open(){A.cancel();K();$('kp').classList.add('open');if(!bound){bound=true;bindCanvas();
  $('kp').addEventListener('click',e=>{const b=e.target.closest('[data-kp]');if(b){const a=b.dataset.kp;if(a==='close')close();else if(a==='list')openList();else if(a==='draw')toDrawing();else if(a==='undo'){A.undo();refresh()}else if(a==='redo'){A.redo();refresh()}else if(V3)V3.view(a);return}
   const m=e.target.closest('[data-kpm]');if(m)setMode(m.dataset.kpm)});
  $('kpfront').addEventListener('change',e=>{showFront=e.target.checked;refresh(true)});
  $('dKpl').addEventListener('click',async e=>{const b=e.target.closest('[data-kpsvg],[data-kpl]');if(!b)return;
   if(b.dataset.kpsvg!=null){const r=list(K())[+b.dataset.kpsvg],svg=window.__cad.buildSVG(partEnts(r.p,r.n));const n=await A.saveBlob(`${r.p.name.replace(/[^A-Za-z0-9äöüÄÖÜß]+/g,'-')}-${de(r.p.W)}x${de(r.p.H)}.svg`,svg,'image/svg+xml','SVG für Shaper Origin');if(n)msg('Gespeichert: '+n);return}
   const a=b.dataset.kpl;if(a==='print')printList();else if(a==='csv')await A.saveBlob(A.baseName()+'-Stueckliste.csv',csv(';'),'text/csv','Stückliste');else if(a==='cut')await A.saveBlob(A.baseName()+'-CutList.csv',csv(',',true),'text/csv','CutList Optimizer');else if(a==='draw'){$('dKpl').classList.remove('open');toDrawing()}})}
 pick=null;setMode('sel');refresh()}
function close(){$('kp').classList.remove('open');$('dKpl').classList.remove('open')}
function key(e){const t=e.target,inField=t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA');
 if(e.key==='Escape'){e.preventDefault();if($('dKpl').classList.contains('open'))$('dKpl').classList.remove('open');else if(mode!=='sel')setMode('sel');else if(pick){pick=null;refresh(true)}else close();return}
 if((e.ctrlKey||e.metaKey)&&!inField){const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();e.shiftKey?A.redo():A.undo();refresh()}else if(k==='y'){e.preventDefault();A.redo();refresh()}return}
 if((e.key==='Delete'||e.key==='Backspace')&&!inField&&pick){e.preventDefault();removePick()}}
return{MATS,open,close,isOpen,key,parts,list,partEnts,model3,get state(){return K()},refresh,get view(){return view},hitAt,csv,DEF}})();
