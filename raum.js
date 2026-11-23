/* Origin CAD – 3D-Modus: Körper frei im Raum zusammensetzen.
   Ein Körper ist ein Quader oder eine hochgezogene Kontur aus der Zeichnung. Er hat eine Grundfläche (lokal X/Y, 0…L / 0…B),
   eine Höhe H (lokal Z) und eine Lage im Raum: o = Ursprung, u/v = Richtung der lokalen X/Y-Achse (nur 90°-Schritte), Höhe läuft in u×v.
   Raum: X = Breite, Y = Tiefe (vorn = 0), Z = Höhe. Daten liegen in der Zeichnung unter S.raum. */
window.RAUM=(()=>{
const A=window.__cad.kp,$=id=>document.getElementById(id),S=()=>window.__cad.S;
/* Geladenes 3D-Modell prüfen */
const AXV=v=>Array.isArray(v)&&v.length===3&&v.every(x=>x===0||x===1||x===-1)&&Math.abs(v[0])+Math.abs(v[1])+Math.abs(v[2])===1;
function clean(o){if(!o||typeof o!=='object'||!Array.isArray(o.bodies))return null;const fin=(v,lo=-1e6,hi=1e6)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi,P2=p=>Array.isArray(p)&&p.length===2&&fin(p[0])&&fin(p[1]);
 const KND=['box','sph','cyl','cone','tor','plane','ext'],MATS=window.KORPUS?window.KORPUS.MATS:[['']],out=[];let id=1;
 let gpts=100000;/* Punkte aller Formteile zusammen – mehr macht den 3D-Modus zäh */
 for(const b of o.bodies.slice(0,5000)){if(!b||typeof b!=='object'||!KND.includes(b.kind))continue;if(![b.L,b.B,b.H].every(v=>fin(v,0,1e5)))continue;if(!(Array.isArray(b.o)&&b.o.length===3&&b.o.every(v=>fin(v))))continue;
  const u=AXV(b.u)?[...b.u]:[1,0,0],v=AXV(b.v)&&Math.abs(u[0]*b.v[0]+u[1]*b.v[1]+u[2]*b.v[2])<0.5?[...b.v]:(u[2]?[1,0,0]:[0,0,1]);
  const n={id:id++,name:typeof b.name==='string'&&b.name.trim()?b.name.slice(0,60):'Körper',kind:b.kind,L:b.L,B:b.B,H:b.H,o:[...b.o],u,v,mat:MATS.some(m=>m[0]===b.mat)?b.mat:''};
  if(fin(b.D2,0,1e5))n.D2=b.D2;if(b.rod)n.rod=1;if(Array.isArray(b.tint)&&b.tint.length===3&&b.tint.every(x=>fin(x,0,2)))n.tint=[...b.tint];
  if(b.kind==='ext'){const pl=b.poly;if(!pl||!Array.isArray(pl.outer)||pl.outer.length<3||pl.outer.length>Math.min(50000,gpts)||!pl.outer.every(P2))continue;let bud=Math.min(50000,gpts)-pl.outer.length;n.poly={outer:pl.outer.map(p=>[...p]),holes:(Array.isArray(pl.holes)?pl.holes:[]).slice(0,300).filter(h=>Array.isArray(h)&&h.length>2&&h.length<=bud&&h.every(P2)&&(bud-=h.length)>=0).map(h=>h.map(p=>[...p]))};gpts-=n.poly.outer.length+n.poly.holes.reduce((s,h)=>s+h.length,0)}
  out.push(n)}
 return{bodies:out,nid:id}}
const R=()=>{const s=S();if(!s.raum)s.raum={bodies:[],nid:1};return s.raum};
const num=v=>Math.round(v*100)/100,de=v=>String(num(v)).replace('.',',');
/* Zahl aus einem Feld – rechnen wie in der Befehlszeile (720-2*19), Komma als Dezimalzeichen */
const pnum=s=>{s=String(s).trim().replace(/,/g,'.');if(!s)return null;const v=A.ev?A.ev(s):parseFloat(s);return typeof v==='number'&&isFinite(v)?v:null};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
let V=null,selId=null,showDims=true,bound=false;const meshCache=new Map();
const body=id=>R().bodies.find(b=>b.id===id);
const wOf=b=>cross(b.u,b.v);
/* umschließender Quader im Raum: [x0,y0,z0,x1,y1,z1] */
function box(b){const w=wOf(b),m=[1e12,1e12,1e12,-1e12,-1e12,-1e12];for(const x of[0,b.L])for(const y of[0,b.B])for(const z of[0,b.H])for(let i=0;i<3;i++){const val=b.o[i]+b.u[i]*x+b.v[i]*y+w[i]*z;m[i]=Math.min(m[i],val);m[i+3]=Math.max(m[i+3],val)}return m}
function boxAll(list){const m=[1e12,1e12,1e12,-1e12,-1e12,-1e12];for(const b of list){const q=box(b);for(let i=0;i<3;i++){m[i]=Math.min(m[i],q[i]);m[i+3]=Math.max(m[i+3],q[i+3])}}return list.length?m:[0,0,0,600,400,400]}
const moveBy=(b,d)=>{b.o=add(b.o,d).map(num)};
function newBody(o){const r=R(),b=Object.assign({id:r.nid++,name:'Körper',kind:'box',L:600,B:400,H:19,o:[0,0,0],u:[1,0,0],v:[0,1,0],mat:''},o);r.bodies.push(b);return b}
/* um eine Raumachse 90° drehen, Mitte bleibt stehen */
function rotate(b,ax){const c0=box(b),c=[(c0[0]+c0[3])/2,(c0[1]+c0[4])/2,(c0[2]+c0[5])/2],f=p=>ax===0?[p[0],-p[2],p[1]]:ax===1?[p[2],p[1],-p[0]]:[-p[1],p[0],p[2]];
 b.u=f(b.u);b.v=f(b.v);b.o=add(c,f(sub(b.o,c))).map(num);const n=box(b);/* auf den Boden und an die alte Ecke setzen */moveBy(b,[c0[0]-n[0],c0[1]-n[1],c0[2]-n[2]])}
/* ----- Modell für den Betrachter ----- */
/* Grundkörper: Maße stecken in L/B/H (Kugel L=B=H=Ø · Zylinder/Kegel L=B=Ø, H · Torus L=B=Außen-Ø, H=Rohr-Ø · Ebene H=0) */
const KINDS={box:'Quader',sph:'Kugel',cyl:'Zylinder',cone:'Kegel',tor:'Torus',plane:'Ebene',ext:'Formteil'};
const circle=(cx,cy,r,n=48)=>Array.from({length:n},(_,i)=>[cx+r*Math.cos(i*2*Math.PI/n),cy+r*Math.sin(i*2*Math.PI/n)]);
function trisOf(b){const key=[b.kind,b.L,b.B,b.H,b.D2||0].join('|');if(meshCache.has(key))return meshCache.get(key);if(meshCache.size>300)meshCache.clear();const T=[],v=(p,n)=>T.push(p[0],p[1],p[2],n[0],n[1],n[2]),quad=(a,b2,c,d)=>{v(...a);v(...b2);v(...c);v(...a);v(...c);v(...d)},cx=b.L/2,cy=b.B/2,TAU=Math.PI*2;
 if(b.kind==='sph'){const r=b.L/2,nu=32,nv=16,pt=(i,j)=>{const t=i/nu*TAU,ph=-Math.PI/2+j/nv*Math.PI,n=[Math.cos(ph)*Math.cos(t),Math.cos(ph)*Math.sin(t),Math.sin(ph)];return[[cx+r*n[0],cy+r*n[1],r+r*n[2]],n]};
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)quad(pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1))}
 else if(b.kind==='cone'){const r1=b.L/2,r2=Math.min(b.D2||0,b.L)/2,H=b.H,n=48,sl=Math.atan2(r1-r2,H),nz=Math.sin(sl),nr=Math.cos(sl),pt=(i,top)=>{const t=i/n*TAU,r=top?r2:r1;return[[cx+r*Math.cos(t),cy+r*Math.sin(t),top?H:0],[nr*Math.cos(t),nr*Math.sin(t),nz]]};
  for(let i=0;i<n;i++){quad(pt(i,0),pt(i+1,0),pt(i+1,1),pt(i,1));const a=pt(i,0)[0],c=pt(i+1,0)[0];v([cx,cy,0],[0,0,-1]);v(c,[0,0,-1]);v(a,[0,0,-1]);if(r2>0){const e=pt(i,1)[0],f=pt(i+1,1)[0];v([cx,cy,H],[0,0,1]);v(e,[0,0,1]);v(f,[0,0,1])}}}
 else if(b.kind==='tor'){const r=b.H/2,Rm=Math.max(b.L/2-r,r),nu=40,nv=18,pt=(i,j)=>{const t=i/nu*TAU,ph=j/nv*TAU,n=[Math.cos(ph)*Math.cos(t),Math.cos(ph)*Math.sin(t),Math.sin(ph)];return[[cx+(Rm+r*Math.cos(ph))*Math.cos(t),cy+(Rm+r*Math.cos(ph))*Math.sin(t),r+r*Math.sin(ph)],n]};
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)quad(pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1))}
 const out=new Float32Array(T);meshCache.set(key,out);return out}
function model(){const r=R(),parts=r.bodies.map(b=>{const m=window.KORPUS.mat(b.mat||''),base={o:b.o,u:b.u,v:b.v,color:b.mat?m[2]:null,tint:b.id===selId?[1.08,0.94,0.9]:b.tint||[1,1,1]};
  if(b.kind==='sph'||b.kind==='cone'||b.kind==='tor')return{...base,T:b.H,sections:[],tris:trisOf(b)};
  const poly=b.kind==='ext'?b.poly:b.kind==='cyl'?{outer:circle(b.L/2,b.B/2,b.L/2),holes:[]}:{outer:[[0,0],[b.L,0],[b.L,b.B],[0,b.B]],holes:[]},T=Math.max(b.H,0.3);
  return{...base,T,sections:[{z0:0,z1:T,polys:[poly]}]}}),bb=boxAll(r.bodies);
 const size=Math.max(bb[3]-bb[0],bb[4]-bb[1],bb[5]-bb[2],100),st=[10,50,100,250,500,1000].find(v=>(size*1.6)/v<=40)||1000,g=[],x0=Math.floor((bb[0]-size*0.3)/st)*st,x1=Math.ceil((bb[3]+size*0.3)/st)*st,y0=Math.floor((bb[1]-size*0.3)/st)*st,y1=Math.ceil((bb[4]+size*0.3)/st)*st;
 for(let x=x0;x<=x1;x+=st)g.push(x,y0,-0.4,x,y1,-0.4);for(let y=y0;y<=y1;y+=st)g.push(x0,y,-0.4,x1,y,-0.4);
 return{parts,grid:r.bodies.length?g:null,box:bb,size,T:0}}
function show(keep){if(!V)return;V.setModel(model(),keep!==false);drawOver()}
/* ===== Bedienung nach dem Vorbild von SketchUp: Werkzeuge links, Maße-Feld unten rechts, Fächer rechts ===== */
const TOOLS={
 sel:{n:'Auswählen',k:' ',kl:'Leertaste',i:'M5 3l14 8-6.5 1.5L16 20l-2.5 1-3.5-7.5L5 18z',st:'Körper anklicken = wählen · ziehen = verschieben · leere Fläche ziehen = Ansicht drehen'},
 erase:{n:'Radiergummi',k:'e',kl:'E',i:'M4 16l8-8 6 6-6 6H8zM12 20h8M8 12l6 6',st:'Körper anklicken = löschen'},
 paint:{n:'Farbeimer',k:'b',kl:'B',i:'M5 11l6-6 7 7-6 6zM18 14c1.5 2 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2 2-4zM8 8L4 4',st:'Material rechts wählen, dann Körper anklicken = Material übertragen'},
 rect:{n:'Rechteck',k:'r',kl:'R',i:'M4 6h16v12H4z',st:'Erste Ecke auf den Boden oder eine Fläche setzen',vl:'Abmessungen'},
 circ:{n:'Kreis',k:'c',kl:'C',i:'M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0M12 12h8',st:'Mittelpunkt auf den Boden oder eine Fläche setzen',vl:'Radius'},
 push:{n:'Drücken/Ziehen',k:'p',kl:'P',i:'M5 14h14v6H5zM12 3v9M8 7l4-4 4 4',st:'Fläche anklicken, die gezogen werden soll',vl:'Abstand'},
 move:{n:'Verschieben',k:'m',kl:'M',i:'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',st:'Körper anklicken, der verschoben werden soll',vl:'Abstand'},
 rot:{n:'Drehen 90°',k:'q',kl:'Q',i:'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',st:'Körper anklicken = um 90° drehen'},
 tape:{n:'Maßband',k:'t',kl:'T',i:'M3 9h18v6H3zM7 9v3M11 9v3M15 9v3M19 9v3',st:'Ersten Punkt anklicken',vl:'Länge'},
 orbit:{n:'Ansicht drehen',k:'o',kl:'O',i:'M12 5c5 0 9 3 9 7s-4 7-9 7-9-3-9-7M3 12l-1-3M3 12l3-1M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',st:'Ziehen = Ansicht drehen'},
 pan:{n:'Ansicht verschieben',k:'h',kl:'H',i:'M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6 7-2.5 0-4-1-5.5-3L4 14.5a1.5 1.5 0 0 1 2.3-1.9L8 15',st:'Ziehen = Ansicht verschieben'},
 zall:{n:'Alles zeigen',k:'Z',kl:'Shift+Z',i:'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 9h6v6H9z',now:1}};
const GRP=[['sel','erase','paint'],['rect','circ'],['push','move','rot'],['tape'],['orbit','pan','zall']];
let tool='sel',op=null,hover=null,infer=null,lastPush=null,tapeRes=null,rotAx=2,lock=null,curMat='',traySec={info:true,mat:false,ins:true,out:true};
const AXC=['#e5482d','#3fb950','#4a90ff'],AXN=['rote Achse (X)','grüne Achse (Y)','blaue Achse (Z)'];
/* Achsen ausrichten: Flächennormale → Zeichenrichtungen u/v, so dass u×v = Normale */
const UV={'2,1':[[1,0,0],[0,1,0]],'2,-1':[[1,0,0],[0,-1,0]],'0,1':[[0,1,0],[0,0,1]],'0,-1':[[0,-1,0],[0,0,1]],'1,1':[[-1,0,0],[0,0,1]],'1,-1':[[1,0,0],[0,0,1]]};
const nrm3=a=>{const l=Math.hypot(...a)||1;return[a[0]/l,a[1]/l,a[2]/l]};
/* ----- Punkt finden (Fangen): Ecken, Flächen, Boden ----- */
function corners(){const o=[[0,0,0]];for(const b of R().bodies){const m=box(b);for(const x of[0,3])for(const y of[1,4])for(const z of[2,5])o.push([m[x],m[y],m[z]])}return o}
function pickPoint(x,y,plane){const ry=V.ray(x,y),r=14;let base=null;
 if(plane){const p=planeHit(ry,plane.p,plane.n);if(!p)return null;base={p,n:plane.n,face:plane.face,kind:'plane'}}
 else{const h=hitBody(x,y);if(h){const n=[0,0,0];n[h.face.i]=h.face.sign;base={p:h.p,n,face:{i:h.face.i,sign:h.face.sign},kind:'face',b:h.b}}else{const p=planeHit(ry,[0,0,0],[0,0,1]);if(!p)return null;base={p,n:[0,0,1],face:{i:2,sign:1},kind:'ground'}}}
 /* Ecke in der Nähe? (auf der Ebene liegend, falls eine vorgegeben ist) */
 let best=null,bd=r;for(const c of corners()){if(plane&&Math.abs(dot(sub(c,plane.p),plane.n))>0.6)continue;const s=V.project(c);if(!s)continue;const d=Math.hypot(s[0]-x,s[1]-y);if(d<bd){bd=d;best=c}}
 if(best)return{...base,p:best.map(num),kind:'end'};
 return{...base,p:base.p.map(v=>Math.round(v))}}
/* ----- Zeichnen über dem 3D-Bild ----- */
/* project() kann ein ausstehendes Bild zeichnen und damit drawOver erneut aufrufen – das darf die laufende Zeichnung nicht stören (sonst falsche Achsenfarben) */
let overBusy=false;function drawOver(){if(overBusy)return;overBusy=true;try{drawOver0()}finally{overBusy=false}}
function drawOver0(){const c=$('rmov'),cv=$('rm3d');if(!c||!V)return;const dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
 const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);const r=R();
 const seg=(a,b2)=>{const p=V.project(a),q=V.project(b2);if(!p||!q)return null;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();return[(p[0]+q[0])/2,(p[1]+q[1])/2]};
 const used=[],label=(m,t,col)=>{if(!m)return;g.font='600 12.5px "IBM Plex Sans",system-ui,sans-serif';const tw=g.measureText(t).width,rr=[m[0]-tw/2-4,m[1]-9,tw+8,18];/* Maßzahlen nicht übereinander */if(used.some(u=>rr[0]<u[0]+u[2]&&u[0]<rr[0]+rr[2]&&rr[1]<u[1]+u[3]&&u[1]<rr[1]+rr[3]))return;used.push(rr);g.fillStyle='rgba(22,25,29,.85)';g.fillRect(m[0]-tw/2-4,m[1]-9,tw+8,18);g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(t,m[0],m[1])};
 const poly=(pts,fill,stroke,dash)=>{const q=pts.map(p=>V.project(p));if(!q.every(Boolean))return;g.beginPath();q.forEach((s,k)=>k?g.lineTo(s[0],s[1]):g.moveTo(s[0],s[1]));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.setLineDash(dash||[]);g.stroke();g.setLineDash([])}};
 const faceQuad=(b,f)=>{const m=box(b),i=f.i,cc=f.sign>0?m[i+3]:m[i],a1=(i+1)%3,a2=(i+2)%3,P=(s,t)=>{const q=[0,0,0];q[i]=cc;q[a1]=s?m[a1+3]:m[a1];q[a2]=t?m[a2+3]:m[a2];return q};return[P(0,0),P(1,0),P(1,1),P(0,1)]};
 const all=boxAll(r.bodies),sz=Math.max(all[3]-all[0],all[4]-all[1],all[5]-all[2],600);
 /* Achsen rot/grün/blau durch den Nullpunkt */
 g.lineWidth=1.4;for(let i=0;i<3;i++){const e=[0,0,0];e[i]=sz*1.4;g.strokeStyle=AXC[i];g.setLineDash([]);seg([0,0,0],e);e[i]=-sz*1.4;g.setLineDash([3,5]);seg([0,0,0],e)}g.setLineDash([]);
 /* gewählter Körper: blauer Rahmen */
 const b=body(selId);if(b){const m=box(b),P=(i,j,k)=>[m[i?3:0],m[j?4:1],m[k?5:2]];g.strokeStyle='#4a90ff';g.lineWidth=1.6;g.setLineDash([5,4]);
  for(const[a,c2]of[[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]],[[0,0,1],[1,0,1]],[[0,1,1],[1,1,1]],[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]],[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]],[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]],[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]])seg(P(...a),P(...c2));g.setLineDash([])}
 /* Fläche unter der Maus (Drücken/Ziehen) bzw. Körper unter der Maus */
 if(op&&op.t==='push'&&body(op.id))poly(faceQuad(body(op.id),op.face),'rgba(74,144,255,.30)','#4a90ff');
 else if(hover&&hover.face&&body(hover.id))poly(faceQuad(body(hover.id),hover.face),'rgba(74,144,255,.22)','#4a90ff',[4,3]);
 else if(hover&&body(hover.id)){const m=box(body(hover.id)),P=(i,j,k)=>[m[i?3:0],m[j?4:1],m[k?5:2]];g.strokeStyle=hover.col||'#ffb020';g.lineWidth=2;for(const[a,c2]of[[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]],[[0,0,1],[1,0,1]],[[0,1,1],[1,1,1]],[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]],[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]],[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]],[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]])seg(P(...a),P(...c2))}
 /* Vorschau Rechteck / Kreis */
 if(op&&op.t==='rect'&&op.p1){const q=rectOf(op.p0,op.p1,op.n);if(q.L>0||q.B>0){const C=[[0,0],[q.L,0],[q.L,q.B],[0,q.B]].map(([a,c2])=>add(add(q.o,mul(q.u,a)),mul(q.v,c2)));poly(C,'rgba(229,72,45,.22)','#e5482d');label(seg(C[0],C[1])&&V.project(add(C[0],mul(q.u,q.L/2))),de(q.L),'#ffb020');label(V.project(add(C[1],mul(q.v,q.B/2))),de(q.B),'#ffb020')}}
 if(op&&op.t==='circ'&&op.r>0){const[u,v]=UV[op.face.i+','+op.face.sign],P=[];for(let k=0;k<48;k++){const t=k/48*Math.PI*2;P.push(add(add(op.c,mul(u,op.r*Math.cos(t))),mul(v,op.r*Math.sin(t))))}poly(P,'rgba(229,72,45,.22)','#e5482d');g.strokeStyle='#ffb020';g.lineWidth=1.4;label(seg(op.c,op.p1),'R '+de(op.r),'#ffb020')}
 /* Maßband */
 const tl=op&&op.t==='tape'&&op.p1?[op.p0,op.p1]:tapeRes;if(tl){g.strokeStyle='#ffd27a';g.lineWidth=1.6;g.setLineDash([6,4]);const m=seg(tl[0],tl[1]);g.setLineDash([]);label(m,de(Math.hypot(...sub(tl[1],tl[0]))),'#ffd27a')}
 /* Verschieben: Achsführung */
 if(op&&op.t==='move'&&op.dir){const ai=op.lock!=null?op.lock:op.dir.findIndex(v=>Math.abs(v)>0.999);if(ai>=0){g.strokeStyle=AXC[ai];g.lineWidth=1.2;g.setLineDash([6,4]);const e=[...op.p0];e[ai]+=sz*3;const s0=[...op.p0];s0[ai]-=sz*3;seg(s0,e);g.setLineDash([])}}
 /* Fang-Anzeige */
 if(infer){const s=V.project(infer.p);if(s){g.lineWidth=2;if(infer.kind==='end'){g.fillStyle='#3fb950';g.beginPath();g.arc(s[0],s[1],5.5,0,Math.PI*2);g.fill();g.strokeStyle='#fff';g.stroke()}else{g.strokeStyle=infer.kind==='face'?'#4a90ff':'#9aa3ad';g.strokeRect(s[0]-4.5,s[1]-4.5,9,9)}
  const t={end:'Endpunkt',face:'Auf Fläche',ground:'Auf dem Boden',plane:'',axis:''}[infer.kind]||infer.txt||'';if(t){g.font='12px "IBM Plex Sans",sans-serif';g.fillStyle='rgba(22,25,29,.85)';const tw=g.measureText(t).width;g.fillRect(s[0]+12,s[1]+10,tw+8,17);g.fillStyle='#e4e7eb';g.textAlign='left';g.textBaseline='middle';g.fillText(t,s[0]+16,s[1]+18.5)}}}
 /* Maße */
 if(showDims&&r.bodies.length){const dimBox=(m,col,off)=>{g.strokeStyle=col;g.lineWidth=1.2;const[x0,y0,z0,x1,y1,z1]=m;
   const mx=seg([x0,y0-off,z0],[x1,y0-off,z0]);seg([x0,y0,z0],[x0,y0-off-8,z0]);seg([x1,y0,z0],[x1,y0-off-8,z0]);
   const my=seg([x1+off,y0,z0],[x1+off,y1,z0]);seg([x1,y0,z0],[x1+off+8,y0,z0]);seg([x1,y1,z0],[x1+off+8,y1,z0]);
   const flat=z1-z0<0.01;let mz=null;if(!flat){mz=seg([x0-off,y0,z0],[x0-off,y0,z1]);seg([x0,y0,z0],[x0-off-8,y0,z0]);seg([x0,y0,z1],[x0-off-8,y0,z1])}
   /* Zahlen erst nach allen Linien, damit keine Linie sie durchstreicht */label(mx,de(x1-x0),col);label(my,de(y1-y0),col);if(mz)label(mz,de(z1-z0),col)};
  dimBox(all,'#5ad1e8',sz*0.07);if(b&&r.bodies.length>1)dimBox(box(b),'#ffb020',sz*0.025)}}
/* Rechteck aus zwei Punkten auf einer Ebene */
function rectOf(p0,p1,n){const fi=n.findIndex(v=>Math.abs(v)>0.5),[u,v]=UV[fi+','+Math.sign(n[fi])],d=sub(p1,p0),a=dot(d,u),c=dot(d,v);return{o:add(add(p0,mul(u,Math.min(a,0))),mul(v,Math.min(c,0))).map(num),u,v,L:num(Math.abs(a)),B:num(Math.abs(c)),sa:Math.sign(a)||1,sb:Math.sign(c)||1}}
/* ----- Werkzeuge ----- */
function setTool(t){if(TOOLS[t]&&TOOLS[t].now){if(t==='zall'&&V)V.fit();return}cancelOp();if(t!==tool)lastPush=null;tool=t;tapeRes=null;$('rmvcb').value='';document.querySelectorAll('#rmtools [data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t));
 $('rm3d').style.cursor=t==='orbit'||t==='sel'?'default':t==='pan'?'grab':'crosshair';status();drawOver()}
function cancelOp(){if(op&&op.orig){const b=body(op.id);if(b){for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(op.orig))}show()}op=null;lock=null;infer=null;status();drawOver()}
function status(txt){const T=TOOLS[tool];let s=txt||T.st;if(!txt){if(op&&op.t==='rect')s='Gegenüberliegende Ecke setzen – oder Maße eintippen, z. B. 600;400 und Enter';else if(op&&op.t==='circ')s='Radius ziehen – oder eintippen und Enter';else if(op&&op.t==='push')s='Maus bewegen und klicken – oder Abstand eintippen und Enter';else if(op&&op.t==='move')s='Ziel anklicken · Pfeiltasten sperren die Richtung (→ rot · ← grün · ↑ blau) · Strg = Kopie · Abstand eintippen und Enter';else if(op&&op.t==='tape')s='Zweiten Punkt anklicken';else if(tool==='rot')s=`Körper anklicken = 90° um die ${AXN[rotAx]} drehen · Achse wechseln mit → ← ↑`;else if(tool==='push'&&lastPush)s+=' · oder jetzt einen neuen Abstand eintippen, um den letzten Zug zu ändern'}
 $('rmstat').textContent=s;$('rmvcbl').textContent=(op&&op.t==='move'&&op.copy?'Kopie: ':'')+(T.vl||'Maße');$('rmvcb').disabled=!T.vl&&tool!=='sel'}
function setVcb(t){const el=$('rmvcb');if(document.activeElement!==el)el.value=t}
function hooksDown(e){const[x,y]=pos(e);
 if(tool==='orbit')return false;if(tool==='pan')return'pan';
 if(op&&op.t==='push'){commitPush();return true}
 if(op&&op.t==='move'){commitMove(e);return true}
 if(tool==='sel'){const h=hitBody(x,y);if(!h){if(selId!=null){selId=null;refresh(true)}return false}if(selId!==h.b.id){selId=h.b.id;refresh(true)}
  op={t:'move',drag:true,id:h.b.id,p0:h.p,o0:[...h.b.o],orig:JSON.stringify(h.b),moved:false,sx:x,sy:y};return true}
 if(tool==='erase'){const h=hitBody(x,y);if(h){A.commit(()=>{const r=R();r.bodies=r.bodies.filter(q=>q!==h.b)});hover=null;refresh()}return true}
 if(tool==='paint'){const h=hitBody(x,y);if(h){A.commit(()=>{h.b.mat=curMat});selId=h.b.id;refresh(true)}return true}
 if(tool==='rot'){const h=hitBody(x,y);if(h){A.commit(()=>rotate(h.b,rotAx));selId=h.b.id;refresh(true)}return true}
 if(tool==='push'){const h=hitBody(x,y);if(!h)return true;const b=h.b,n=[0,0,0];n[h.face.i]=h.face.sign;selId=b.id;
  op={t:'push',id:b.id,face:h.face,n,p0:h.p,t0:lineT(V.ray(x,y),h.p,n),orig:JSON.stringify(b),d:0,sx:x,sy:y,down:true};setVcb('0');refresh(true);status();return true}
 if(tool==='move'){const h=hitBody(x,y);if(!h)return true;selId=h.b.id;op={t:'move',id:h.b.id,p0:h.p,o0:[...h.b.o],orig:JSON.stringify(h.b),copy:e.ctrlKey||e.metaKey,sx:x,sy:y,down:true};refresh(true);status();return true}
 if(tool==='rect'||tool==='circ'){const pk=pickPoint(x,y,op&&op.plane);if(!pk)return true;
  if(!op){const plane={p:pk.p,n:pk.n,face:pk.face};op=tool==='rect'?{t:'rect',p0:pk.p,n:pk.n,plane,face:pk.face}:{t:'circ',c:pk.p,n:pk.n,plane,face:pk.face,r:0};status();setVcb('');return true}
  if(op.t==='rect'){op.p1=pk.p;finishRect();return true}
  if(op.t==='circ'){op.r=num(Math.hypot(...sub(pk.p,op.c)));finishCirc();return true}}
 if(tool==='tape'){const pk=pickPoint(x,y);if(!pk)return true;if(!op){op={t:'tape',p0:pk.p};tapeRes=null;status()}else{tapeRes=[op.p0,pk.p];setVcb(de(Math.hypot(...sub(pk.p,op.p0))));op=null;status('Gemessen. Nächsten Punkt anklicken für eine neue Messung.')}drawOver();return true}
 return true}
function hooksMove(e){const[x,y]=pos(e),ry=V.ray(x,y);
 if(op&&op.t==='move'){if(!op.moved&&Math.hypot(x-op.sx,y-op.sy)<4)return;op.moved=true;doMove(ry,e.shiftKey);return}
 if(op&&op.t==='push'){if(op.down&&Math.hypot(x-op.sx,y-op.sy)>=4)op.dragged=true;const t=lineT(ry,op.p0,op.n);if(t==null)return;pushTo(Math.round(t-op.t0));return}
 if(op&&(op.t==='rect'||op.t==='circ'||op.t==='tape')){infer=pickPoint(x,y,op.t==='tape'?null:op.plane);if(!infer)return;
  if(op.t==='rect'){op.p1=infer.p;const q=rectOf(op.p0,op.p1,op.n);setVcb(de(q.L)+';'+de(q.B))}else if(op.t==='circ'){op.p1=infer.p;op.r=num(Math.hypot(...sub(infer.p,op.c)));setVcb(de(op.r))}else{op.p1=infer.p;setVcb(de(Math.hypot(...sub(infer.p,op.p0))))}drawOver();return}
 /* nur schweben */
 if(['rect','circ','tape'].includes(tool)){infer=pickPoint(x,y);drawOver();return}
 if(tool==='push'){const h=hitBody(x,y);hover=h?{id:h.b.id,face:h.face}:null;drawOver();return}
 if(['erase','paint','rot','move','sel'].includes(tool)){const h=hitBody(x,y);hover=h?{id:h.b.id,col:tool==='erase'?'#e5482d':'#ffb020'}:null;$('rm3d').style.cursor=tool==='sel'?(h?'move':'default'):'crosshair';drawOver()}}
function hooksUp(e){if(op&&op.t==='move'&&op.drag){const o=op;if(o.moved)commitMove(e);else{op=null;show()}return}
 if(op&&op.t==='push'&&op.down){op.down=false;if(op.dragged)commitPush();return}
 if(op&&op.t==='move'&&op.down){op.down=false;if(op.moved)commitMove(e)}}
/* Verschieben */
function doMove(ry,vertical){const b=body(op.id);if(!b)return;let d;
 if(op.lock===2||vertical){const n=[ry.f[0],ry.f[1],0],p=planeHit(ry,op.p0,Math.hypot(n[0],n[1])<1e-6?[0,1,0]:n);if(!p)return;d=[0,0,p[2]-op.p0[2]]}
 else{const p=planeHit(ry,op.p0,[0,0,1]);if(!p)return;d=[p[0]-op.p0[0],p[1]-op.p0[1],0];if(op.lock!=null){const k=op.lock;d=d.map((v,i)=>i===k?v:0)}}
 b.o=add(op.o0,d).map(v=>Math.round(v));if(op.lock==null)moveBy(b,snap(b,vertical?[2]:[0,1]));const dd=sub(b.o,op.o0),l=Math.hypot(...dd);op.dir=l>0.5?nrm3(dd):op.dir;setVcb(de(l));show();fillSel()}
function commitMove(e){const o=op;op=null;lock=null;const b=body(o.id);if(!b)return;const neu=JSON.stringify(b);for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(o.orig));
 if(neu!==o.orig){if(o.copy){let n;A.commit(()=>{n=newBody({...JSON.parse(neu),id:undefined});n.id=R().nid-1});selId=n.id}else A.commit(()=>{for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(neu))})}
 refresh(true);status()}
/* Drücken/Ziehen */
function pushTo(d){const b=body(op.id);if(!b)return;for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(op.orig));const err=resize(b,op.face,d);if(err){status(err);return}op.d=d;setVcb(de(d));show();fillSel()}
function commitPush(){const o=op;op=null;const b=body(o.id);if(!b)return;const neu=JSON.stringify(b);for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(o.orig));if(neu!==o.orig){A.commit(()=>{for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(neu))});lastPush={id:o.id,face:o.face,orig:o.orig,neu,chg:A.chg}}hover=null;refresh(true);status()}
/* Rechteck / Kreis fertigstellen */
function finishRect(){const q=rectOf(op.p0,op.p1,op.n);if(q.L<1||q.B<1){status('Das Rechteck ist zu klein – gegenüberliegende Ecke weiter weg setzen.');return}const f=op.face;op=null;infer=null;let b;A.commit(()=>{b=newBody({name:'Fläche',kind:'plane',L:q.L,B:q.B,H:0,o:q.o,u:q.u,v:q.v})});selId=b.id;refresh();status('Rechteck gezeichnet. Mit Drücken/Ziehen (P) hochziehen.')}
function finishCirc(){if(!(op.r>=1)){status('Der Kreis ist zu klein.');return}const[u,v]=UV[op.face.i+','+op.face.sign],r=op.r,o=sub(sub(op.c,mul(u,r)),mul(v,r)).map(num);op=null;infer=null;let b;A.commit(()=>{b=newBody({name:'Kreisfläche',kind:'cyl',L:num(2*r),B:num(2*r),H:0,o,u,v})});selId=b.id;refresh();status('Kreis gezeichnet. Mit Drücken/Ziehen (P) hochziehen.')}
/* Eingabe im Feld „Maße“ */
/* Rechteck braucht zwei Maße: ein einzelnes Komma trennt dann Breite und Tiefe (600,40 = 600 × 40); Kommazahlen mit Strichpunkt: 600,5;400 */
function vcbEnter(){const raw=$('rmvcb').value.trim();if(!raw)return;const list=op&&op.t==='rect'&&!/[;x×\s]/.test(raw)&&(raw.match(/,/g)||[]).length===1?raw.split(','):raw.split(/[;x×\s]+/),nums=list.filter(q=>q.trim()).map(pnum);if(!nums.length||nums.some(v=>v==null)){status(`„${raw}“ nicht verstanden – Zahl oder Rechnung wie 720-2*19, zwei Maße mit Strichpunkt: 600;400`);return}if(nums.some(q=>Math.abs(q)>1e5)){status('Zu groß – höchstens 100 m (100000 mm).');return}const v=nums[0];
 if(op&&op.t==='rect'){const q=op.p1?rectOf(op.p0,op.p1,op.n):{sa:1,sb:1},[u,vv]=UV[op.face.i+','+op.face.sign],L=Math.abs(v),B=Math.abs(nums[1]!=null?nums[1]:v);op.p1=add(add(op.p0,mul(u,L*q.sa)),mul(vv,B*q.sb));finishRect();return}
 if(op&&op.t==='circ'){op.r=Math.abs(v);finishCirc();return}
 if(op&&op.t==='push'){pushTo(v);commitPush();return}
 if(op&&op.t==='move'){const b=body(op.id),dir=op.lock!=null?(()=>{const a=[0,0,0];a[op.lock]=op.dir?Math.sign(op.dir[op.lock])||1:1;return a})():op.dir||[1,0,0];b.o=add(op.o0,mul(dir,v)).map(num);commitMove();return}
 /* letzten Zug korrigieren – nur solange seitdem nichts anderes geändert wurde */
 if(!op&&tool==='push'&&lastPush&&lastPush.chg===A.chg&&body(lastPush.id)&&JSON.stringify(body(lastPush.id))===lastPush.neu){{const tb=JSON.parse(lastPush.orig);resize(tb,lastPush.face,v);if(JSON.stringify(tb)===lastPush.orig){status('So lässt sich der Zug nicht ändern – mindestens 1 mm.');return}}const b=body(lastPush.id);A.commit(()=>{for(const k of Object.keys(b))delete b[k];Object.assign(b,JSON.parse(lastPush.orig));resize(b,lastPush.face,v)});lastPush.neu=JSON.stringify(b);lastPush.chg=A.chg;refresh(true);setVcb(de(v));status(`Letzten Zug auf ${de(v)} mm geändert.`);return}
 if(!op&&tool==='sel'&&selId!=null){status('Zum Ändern der Maße rechts unter „Objektinfo“ eintragen.');return}
 status('Erst einen Punkt setzen bzw. eine Fläche anklicken, dann das Maß eintippen.')}
function hitBody(px,py){const ry=V.ray(px,py);let best=null,bt=Infinity,bf=null;for(const b of R().bodies){const m=box(b);let t0=-Infinity,t1=Infinity,ok=true,face=null;
  for(let i=0;i<3;i++){const lo=m[i]-(m[i+3]-m[i]<0.5?0.5:0),hi=m[i+3]+(m[i+3]-m[i]<0.5?0.5:0);if(Math.abs(ry.d[i])<1e-9){if(ry.o[i]<lo||ry.o[i]>hi){ok=false;break}}else{let a=(lo-ry.o[i])/ry.d[i],c=(hi-ry.o[i])/ry.d[i],sg=-1;if(a>c){[a,c]=[c,a];sg=1}if(a>t0){t0=a;face={i,sign:sg}}t1=Math.min(t1,c)}}
  if(ok&&t0<=t1&&t1>0&&t0<bt){bt=t0;best=b;bf=face}}return best?{b:best,face:bf,p:add(ry.o,mul(ry.d,Math.max(bt,0))),ry}:null}
/* Fläche ziehen: Körper in Richtung einer Raumachse größer/kleiner machen. face = {i: Achse, sign: +1 obere/rechte/hintere, −1 untere/linke/vordere Fläche}, d = nach außen (mm) */
function axisOf(b,i){const w=wOf(b);for(const[k,a]of[['L',b.u],['B',b.v],['H',w]])if(Math.abs(a[i])>0.5)return{k,a,s:Math.sign(a[i])}}
function resize(b,face,d){const ax=axisOf(b,face.i),grow=(k,a,dd,minEnd)=>{const nv=Math.max(k==='H'&&b.kind==='plane'?0:1,num(b[k]+dd)),real=nv-b[k];b[k]=nv;if(minEnd)b.o=sub(b.o,mul(a,real)).map(num);return real};
 const minEnd=(ax.s>0&&face.sign<0)||(ax.s<0&&face.sign>0);
 /* flache Fläche (Rechteck, Kreis, Ebene): in beide Richtungen zu einem Körper ziehen */
 if(ax.k==='H'&&b.H<=1e-9&&['plane','cyl'].includes(b.kind)){if(Math.abs(d)<1)return;const w=wOf(b),out=face.sign*ax.s>0;/* zieht man in Richtung der Normalen? */
  const dd=out?d:-d;if(dd>0){b.H=num(dd)}else{b.H=num(-dd);b.o=add(b.o,mul(w,dd)).map(num)}if(b.kind==='plane'){b.kind='box';if(b.name==='Ebene'||b.name==='Fläche')b.name='Quader'}else if(b.name==='Kreisfläche')b.name='Zylinder';return}
 if(b.kind==='box'||b.kind==='plane'){grow(ax.k,ax.a,d,minEnd);return}
 if(ax.k==='H'&&(b.kind==='ext'||b.kind==='cyl'||b.kind==='cone')){grow('H',ax.a,d,minEnd);return}
 if(b.kind==='ext')return'Bei einem Formteil lässt sich nur die Höhe ziehen – die Form änderst du in der Zeichnung.';
 /* runde Körper: Durchmesser ändern, Mitte bleibt */
 const w=wOf(b);if(b.kind==='tor'&&ax.k==='H'){const r=grow('H',w,2*d,false);b.o=sub(b.o,mul(w,r/2)).map(num);if(b.H>b.L/2)b.H=num(b.L/2);return}
 const nd=Math.max(2,num(b.L+2*d)),real=nd-b.L;b.L=b.B=nd;b.o=sub(sub(b.o,mul(b.u,real/2)),mul(b.v,real/2)).map(num);if(b.kind==='sph'){b.H=nd;b.o=sub(b.o,mul(w,real/2)).map(num)}if(b.kind==='tor')b.H=Math.min(b.H,num(nd/2));if(b.kind==='cone')b.D2=Math.min(b.D2||0,nd)}
const sizeAlong=(b,i)=>{const m=box(b);return num(m[i+3]-m[i])};
const isRound=(b,i)=>b.kind==='sph'||(['cyl','cone'].includes(b.kind)&&axisOf(b,i).k!=='H')||b.kind==='tor';
const planeHit=(ry,p0,n)=>{const dn=dot(ry.d,n);if(Math.abs(dn)<1e-6)return null;const t=dot(sub(p0,ry.o),n)/dn;return t>0?add(ry.o,mul(ry.d,t)):null};
/* Einrasten: Flächen an Flächen anderer Körper (bündig oder anstoßend) und an den Boden */
/* Einrast-Abstand: etwa 10 Bildpunkte, egal wie weit gezoomt ist */
const tolPx=px=>px*2*V.cam.dist*Math.tan(0.3)/Math.max(200,$('rm3d').clientHeight);
/* nur Körper in der Nähe zählen: in den beiden anderen Richtungen überlappend oder höchstens gap entfernt */
const near=(m,q,i,gap)=>[0,1,2].every(j=>j===i||(q[j]<=m[j+3]+gap&&q[j+3]>=m[j]-gap));
function snap(b,axes){const m=box(b),tol=tolPx(10),d=[0,0,0];for(const i of axes){let best=null;const cand=[];for(const o of R().bodies){if(o===b)continue;const q=box(o);if(near(m,q,i,tolPx(40)))cand.push(q[i],q[i+3])}if(i===2)cand.push(0);
  for(const c of cand)for(const mine of[m[i],m[i+3]]){const dd=c-mine;if(Math.abs(dd)<tol&&(best===null||Math.abs(dd)<Math.abs(best)))best=dd}if(best!==null)d[i]=best}return d}
function pos(e){const r=$('rm3d').getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
/* nächster Punkt einer Geraden (p0 + n·t) zum Sehstrahl */
function lineT(ry,p0,n){const b=dot(ry.d,n),den=1-b*b;if(den<1e-6)return null;const w0=sub(p0,ry.o);return(b*dot(ry.d,w0)-dot(n,w0))/den}
/* ----- Körper anlegen ----- */
function place(b){/* neben das Vorhandene stellen */const others=R().bodies.filter(x=>x!==b);if(others.length){const m=boxAll(others),q=box(b);moveBy(b,[m[3]+50-q[0],m[1]-q[1],-q[2]])}}
const PRIM={box:{name:'Quader',L:600,B:400,H:19},sph:{name:'Kugel',L:200,B:200,H:200},cyl:{name:'Zylinder',L:200,B:200,H:300},cone:{name:'Kegel',L:200,B:200,H:300,D2:0},tor:{name:'Torus',L:300,B:300,H:60},plane:{name:'Ebene',L:1000,B:1000,H:0}};
function addFromDrawing(){const c=A.contours(),H=val('rn_X')||19;if(!c.list.length){msg('In der Zeichnung ist keine geschlossene Kontur. Erst im Zeichenprogramm eine zeichnen (z. B. Rechteck oder Kreis).');return}
 A.commit(()=>{let last=null;for(const q of c.list){last=newBody({name:'Formteil',kind:'ext',L:q.w,B:q.h,H,poly:{outer:q.outer,holes:q.holes},o:[num(q.at[0]),num(q.at[1]),0]})}
  /* gemeinsam neben das Vorhandene schieben, Lage zueinander bleibt */const neu=R().bodies.slice(-c.list.length),alt=R().bodies.slice(0,-c.list.length);if(alt.length){const m=boxAll(alt),q=boxAll(neu);for(const b of neu)moveBy(b,[m[3]+50-q[0],m[1]-q[1],0])}selId=last.id});
 msg(`${c.list.length} Kontur${c.list.length>1?'en':''} ${c.bySel?'(die gewählten) ':''}hochgezogen.`);refresh()}
function addFromKorpus(){const K=window.KORPUS,ps=K.parts();if(!ps.length)return;A.commit(()=>{const alt=[...R().bodies],neu=[];for(const p of ps)neu.push(newBody({name:p.name,L:p.W,B:p.H,H:p.T,o:[...p.o],u:[...p.u],v:[...p.v],mat:p.matId||'',...(p.rod?{tint:[0.8,0.83,0.87],rod:1}:{})}));
  if(alt.length){const m=boxAll(alt),q=boxAll(neu);for(const b of neu)moveBy(b,[m[3]+50-q[0],m[1]-q[1],0])}selId=null});msg(`Schrank übernommen: ${ps.length} Körper. Er ist jetzt vom Korpusplaner gelöst – Bohrungen bleiben im Planer.`);refresh();V&&V.fit()}
const val=id=>{const el=$(id);if(!el)return null;const v=pnum(el.value);return v!=null&&v>0?v:null};
function msg(t){$('rmmsg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('rmmsg').textContent='',7000)}
const dims3=b=>[b.L,b.B,b.H].slice().sort((x,y)=>y-x),dimTxt=b=>b.kind==='sph'?'Ø '+de(b.L):b.kind==='cyl'||b.kind==='cone'?'Ø '+de(b.L)+' × '+de(b.H):b.kind==='tor'?'Ø '+de(b.L)+' · Rohr Ø '+de(b.H):b.kind==='plane'?de(b.L)+' × '+de(b.B):dims3(b).map(de).join(' × ');
/* ----- Werkzeugleiste und Fächer (rechts) ----- */
function buildTools(){$('rmtools').innerHTML=GRP.map(gr=>gr.map(k=>{const T=TOOLS[k];return`<button class="rmtb ${k===tool?'on':''}" data-tool="${k}" title="${T.n} (${T.kl})" aria-label="${T.n}"><svg viewBox="0 0 24 24"><path d="${T.i}"/></svg></button>`}).join('')).join('<span class="rmtsep"></span>')}
const ICO={box:'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',sph:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12c0 2 4 3.5 9 3.5s9-1.5 9-3.5',cyl:'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6',cone:'M12 3L5 18c0 1.7 3.1 3 7 3s7-1.3 7-3z',tor:'M12 6c5 0 9 2.7 9 6s-4 6-9 6-9-2.7-9-6 4-6 9-6zM12 10.5c1.9 0 3.5.7 3.5 1.5s-1.6 1.5-3.5 1.5-3.5-.7-3.5-1.5 1.6-1.5 3.5-1.5',plane:'M3 16l6-8h12l-6 8z'};
function side(){const r=R(),inp=(id,lab,v)=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${de(v)}"></div>`,MATS=window.KORPUS.MATS;
 const keep={};for(const id of['rn_X']){const el=$(id);if(el)keep[id]=el.value}
 const sec=(id,title,body)=>`<details class="kpsec rmsec" data-sec="${id}" ${traySec[id]?'open':''}><summary><b>${title}</b><span></span></summary><div class="kpsecb">${body}</div></details>`;
 $('rmside').innerHTML=sec('info','Objektinfo','<div id="rmsel"></div>')
  +sec('mat','Materialien',`<div class="rmsw">${MATS.map(q=>`<button data-mat="${q[0]}" class="${curMat===q[0]?'on':''}" title="${q[0]?q[0]+' '+q[1]:q[1]}" style="background:rgb(${q[2].map(v=>Math.round(v*255)).join(',')})"></button>`).join('')}</div><p class="muted kpnote" id="rmmatn">${A.esc(curMat?curMat+' '+window.KORPUS.mat(curMat)[1]:'Holz neutral')} – anklicken überträgt aufs Gewählte, mit dem Farbeimer (B) auf weitere Körper.</p>`)
  +sec('ins','Einfügen',`<div class="rmprim">${Object.keys(PRIM).map(k=>`<button data-prim="${k}" title="${PRIM[k].name} einfügen"><svg viewBox="0 0 24 24"><path d="${ICO[k]}"/></svg>${PRIM[k].name}</button>`).join('')}</div>
   <div class="rmsep"></div>${inp('rn_X','Höhe beim Hochziehen',19)}<button class="btn" id="rn_ext" style="width:100%">Kontur aus der Zeichnung hochziehen</button><p class="muted kpnote">Nimmt die im Zeichenprogramm gewählten geschlossenen Konturen, sonst alle. Löcher bleiben erhalten.</p>
   <button class="btn" id="rn_kp" style="width:100%">Schrank aus dem Korpusplaner holen</button>`)
  +sec('out',`Gliederung (${r.bodies.length})`,r.bodies.length?`<div class="rmlist">${r.bodies.map(b=>`<button class="rmit ${b.id===selId?'on':''}" data-rmid="${b.id}"><b>${A.esc(b.name)}</b><span>${dimTxt(b)}</span></button>`).join('')}</div>`:'<p class="muted">Noch keine Körper.</p>');
 $('rmside').querySelectorAll('details.rmsec').forEach(d=>d.addEventListener('toggle',()=>{traySec[d.dataset.sec]=d.open}));
 for(const id in keep)if($(id))$(id).value=keep[id];
 $('rmside').querySelectorAll('[data-prim]').forEach(bt=>bt.onclick=()=>addPrim(bt.dataset.prim));$('rn_ext').onclick=addFromDrawing;$('rn_kp').onclick=addFromKorpus;
 $('rmside').querySelectorAll('[data-mat]').forEach(bt=>bt.onclick=()=>{curMat=bt.dataset.mat;const b=body(selId);if(b)A.commit(()=>{b.mat=curMat});refresh()});
 $('rmside').querySelectorAll('[data-rmid]').forEach(bt=>bt.onclick=()=>{selId=+bt.dataset.rmid;refresh(true)});fillSel()}
function addPrim(kind){if(!PRIM[kind])return;let b;A.commit(()=>{b=newBody({kind,...PRIM[kind]});place(b);selId=b.id});refresh();ensureVisible(b)}
function ensureVisible(b){if(!V||!b)return;const m=box(b),cv=$('rm3d'),ok=[[m[0],m[1],m[2]],[m[3],m[4],m[5]]].every(q=>{const p=V.project(q);return p&&p[0]>20&&p[1]>40&&p[0]<cv.clientWidth-20&&p[1]<cv.clientHeight-20});if(R().bodies.length===1||!ok){V.fit();drawOver()}}
const addBox=()=>addPrim('box');
function fillSel(){const el=$('rmsel'),b=body(selId);if(!el)return;if(!b){el.innerHTML='<p class="muted">Nichts gewählt. Körper anklicken (Auswählen, Leertaste).</p>';return}if(el.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&op)return;
 const m=box(b),inp=(id,lab,v,ro)=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${typeof v==='number'?de(v):A.esc(v)}" ${ro?'readonly':''}></div>`,MATS=window.KORPUS.MATS;
 el.innerHTML=`<div class="pr"><label for="rs_name">Name</label><input id="rs_name" type="text" value="${A.esc(b.name)}" style="text-align:left"></div>
  ${{box:()=>inp('rs_L','Länge',b.L)+inp('rs_B','Breite',b.B)+inp('rs_H','Höhe / Stärke',b.H),plane:()=>inp('rs_L','Länge',b.L)+inp('rs_B','Breite',b.B),sph:()=>inp('rs_D','Durchmesser',b.L),cyl:()=>inp('rs_D','Durchmesser',b.L)+inp('rs_H','Höhe',b.H),cone:()=>inp('rs_D','Durchmesser unten',b.L)+inp('rs_D2','Durchmesser oben',b.D2||0)+inp('rs_H','Höhe',b.H),tor:()=>inp('rs_D','Außendurchmesser',b.L)+inp('rs_H','Rohrdurchmesser',b.H),ext:()=>inp('rs_LB','Grundfläche',de(b.L)+' × '+de(b.B),true)+inp('rs_H','Höhe',b.H)}[b.kind]()}
  <div class="rm3"><label>Lage (linke vordere untere Ecke)</label><input id="rs_x" type="text" inputmode="decimal" value="${de(m[0])}" aria-label="X"><input id="rs_y" type="text" inputmode="decimal" value="${de(m[1])}" aria-label="Y"><input id="rs_z" type="text" inputmode="decimal" value="${de(m[2])}" aria-label="Z"><span style="color:light-dark(#c2381f,#ff7a5c)">X</span><span style="color:light-dark(#1a7f37,#3fb950)">Y</span><span style="color:light-dark(#1f5fd1,#6aa6ff)">Z</span></div>
  <div class="pr"><label for="rs_mat">Material</label><select id="rs_mat">${MATS.map(q=>`<option value="${q[0]}" ${(b.mat||'')===q[0]?'selected':''}>${q[0]?q[0]+' '+q[1]:q[1]}</option>`).join('')}</select></div>
  <div class="rmrow"><button class="btn" id="rs_floor">Auf den Boden</button><button class="btn" id="rs_copy" title="Strg+D">Kopieren</button><button class="btn" id="rs_del" title="Entf">Löschen</button></div>`;
 const on=(id,fn)=>{const x=$(id);if(!x)return;x.addEventListener('keydown',e=>{if(e.key==='Enter')x.blur()});x.addEventListener('change',()=>{fn(x);refresh(true)})},nv=x=>pnum(x.value);
 on('rs_name',x=>{const t=x.value.trim();if(t)A.commit(()=>{b.name=t.slice(0,60)})});
 for(const[id,f]of[['rs_L','L'],['rs_B','B'],['rs_H','H']])on(id,x=>{const v=nv(x);if(v>0)A.commit(()=>{const c0=box(b);b[f]=num(Math.min(v,10000));if(b.kind==='plane'&&f==='H')b.kind='box';const n=box(b);moveBy(b,[c0[0]-n[0],c0[1]-n[1],c0[2]-n[2]])})});
 ['rs_x','rs_y','rs_z'].forEach((id,i)=>on(id,x=>{const v=nv(x);if(v!=null)A.commit(()=>{const d=[0,0,0];d[i]=v-box(b)[i];moveBy(b,d)})}));
 on('rs_D',x=>{const v=nv(x);if(v>0)A.commit(()=>{const c0=box(b);b.L=b.B=num(Math.min(v,10000));if(b.kind==='sph')b.H=b.L;if(b.kind==='tor')b.H=Math.min(b.H,num(b.L/2));if(b.kind==='cone')b.D2=Math.min(b.D2||0,b.L);const n=box(b);moveBy(b,[c0[0]-n[0],c0[1]-n[1],c0[2]-n[2]])})});
 on('rs_D2',x=>{const v=nv(x);if(v!=null&&v>=0)A.commit(()=>{b.D2=num(Math.min(v,b.L))})});
 on('rs_mat',x=>A.commit(()=>{b.mat=x.value}));
 $('rs_floor').onclick=()=>{A.commit(()=>moveBy(b,[0,0,-box(b)[2]]));refresh(true)};$('rs_copy').onclick=copySel;$('rs_del').onclick=removeSel}
function copySel(){const b=body(selId);if(!b)return;let n;A.commit(()=>{n=newBody(JSON.parse(JSON.stringify({...b,id:undefined})));n.id=R().nid-1;const m2=box(b);moveBy(n,[m2[3]-m2[0]+50,0,0]);selId=n.id});refresh();ensureVisible(n)}
function removeSel(){const b=body(selId);if(!b)return;cancelOp();A.commit(()=>{const r=R();r.bodies=r.bodies.filter(x=>x!==b)});selId=null;refresh()}
function refresh(light){const r=R();if(selId!=null&&!body(selId))selId=null;if(light){document.querySelectorAll('#rmside [data-rmid]').forEach(bt=>bt.classList.toggle('on',+bt.dataset.rmid===selId));fillSel()}else side();show();
 $('rmempty').hidden=r.bodies.length>0;const m=boxAll(r.bodies);$('rminfo').textContent=r.bodies.length?`${r.bodies.length} Körper · gesamt ${de(m[3]-m[0])} × ${de(m[4]-m[1])} × ${de(m[5]-m[2])} mm`:'leer'}
/* ----- Stückliste, Zuschnitt, Bild ----- */
function list(){const m=new Map();for(const b of R().bodies){const d=dims3(b),key=[b.name,b.kind,d.join('x'),b.D2||0,b.mat||'',b.rod?1:0].join('|');if(!m.has(key))m.set(key,{b,d,n:0});m.get(key).n++}return[...m.values()]}
function listHTML(print){const rows=list(),K=window.KORPUS;return'<table><tr><th>Nr.</th><th>Körper</th><th>Länge</th><th>Breite</th><th>Stärke</th><th>Material</th><th>Stück</th><th>Hinweis</th></tr>'+rows.map((r,i)=>`<tr><td>${i+1}</td><td>${A.esc(r.b.name)}</td><td>${de(r.d[0])}</td><td>${de(r.d[1])}</td><td>${de(r.d[2])}</td><td>${r.b.rod?'–':A.esc(K.matName(r.b.mat||''))}</td><td>${r.n}</td><td>${r.b.kind==='ext'?'Formteil – Maß ist das umschließende Rechteck':r.b.rod?'Stange/Griff':['box'].includes(r.b.kind)?'':KINDS[r.b.kind]+' '+dimTxt(r.b)}</td></tr>`).join('')+'</table>'}
function nest(){const pieces=[];list().forEach((r,i)=>{if(r.b.rod||r.d[2]>60||!['box','ext'].includes(r.b.kind))return;for(let n=0;n<r.n;n++)pieces.push({nr:i+1,name:r.b.name,w:r.d[0],h:r.d[1],matId:r.b.mat||'',T:r.d[2],kind:'Platte'})});return window.KORPUS.nestOf(pieces)}
function openList(){$('rmlBody').innerHTML=listHTML()+`<h4 style="margin:18px 0 4px">Zuschnittplan</h4><p class="muted">Körper bis 60 mm Stärke, verteilt wie im Korpusplaner (Plattenmaß und Sägeblatt stellst du dort unter „Zuschnittplan“ ein). Formteile zählen mit ihrem umschließenden Rechteck.</p>`+window.KORPUS.nestHTMLOf(nest());$('dRml').classList.add('open')}
function picture(){const cv=$('rm3d'),ov=$('rmov'),url=V.shot(),c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;return new Promise(res=>{const im=new Image();im.onload=()=>{const g=c.getContext('2d');g.drawImage(im,0,0);if(ov.width)g.drawImage(ov,0,0,c.width,c.height);res(c)};im.src=url})}
async function savePic(){const c=await picture();c.toBlob(async bl=>{const n=await A.saveBlob(A.baseName()+'-3D.png',bl,'image/png','Bild');if(n)msg('Bild gespeichert: '+n)},'image/png')}
async function printAll(){const c=await picture(),w=window.open('','_blank');if(!w){msg('Das Druckfenster wurde vom Browser blockiert.');return}
 w.document.write(`<!doctype html><meta charset="utf-8"><title>${A.esc(A.baseName())} 3D</title><style>@page{size:A4 landscape;margin:10mm}body{font:11pt Arial,sans-serif;margin:0}img{max-width:100%;max-height:150mm;display:block;margin:0 auto 10px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 7px;text-align:left;font-size:10pt}h4{margin:14px 0 4px}.kpsheet{page-break-inside:avoid;margin-bottom:10px}.muted{color:#555;font-size:9.5pt}.kpsheet svg{max-height:120mm}</style><h2 style="margin:0 0 6px">${A.esc(A.baseName())}</h2><img src="${c.toDataURL('image/png')}">${listHTML()}`);w.document.close();w.focus();setTimeout(()=>w.print(),400)}
/* ----- Fenster ----- */
const isOpen=()=>$('rm').classList.contains('open');
const hooks={down:hooksDown,move:hooksMove,up:hooksUp,draw:()=>drawOver()};
function open(){A.cancel();R();if(window.KORPUS&&window.KORPUS.isOpen())window.KORPUS.close();$('rm').classList.add('open');
 if(!bound){bound=true;V=window.CAD3D.create($('rm3d'),hooks);buildTools();
  $('rm').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=b.dataset.rm;if(a==='close')close();else if(a==='list')openList();else if(a==='pic')savePic();else if(a==='print')printAll();else if(a==='undo'){cancelOp();A.undo();refresh()}else if(a==='fit')V.fit();else V.view(a)});
  $('rmtools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)setTool(b.dataset.tool)});
  $('rm3d').addEventListener('pointermove',e=>{if(e.buttons)return;hooksMove(e)});$('rm3d').addEventListener('pointerleave',()=>{hover=null;if(!op)infer=null;drawOver()});
  /* Antippen des Maßfelds markiert den Inhalt – Tippen ersetzt dann die Zahl, statt sie zu verlängern (iPad) */
  {const el=$('rmvcb');let tap=false;el.addEventListener('pointerdown',()=>{tap=document.activeElement!==el});el.addEventListener('click',()=>{if(tap){tap=false;try{el.setSelectionRange(0,el.value.length)}catch(e){}}})}
  $('rmvcb').addEventListener('keydown',e=>{e.stopPropagation();if((/^[a-wyzA-WYZ]$/.test(e.key)||(e.key===' '&&!$('rmvcb').value.trim()))&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$('rmvcb').blur();key(e);return}if(e.key==='Enter'){e.preventDefault();vcbEnter();$('rmvcb').blur()}else if(e.key==='Escape'){$('rmvcb').blur();key({key:'Escape',preventDefault(){},target:document.body})}});
  $('rmempty').addEventListener('click',e=>{const b=e.target.closest('[data-prim],[data-tool]');if(!b)return;if(b.dataset.prim)addPrim(b.dataset.prim);else setTool(b.dataset.tool)});
  $('rmdims').addEventListener('change',e=>{showDims=e.target.checked;drawOver()});
  $('dRml').addEventListener('click',e=>{if(e.target.closest('[data-rml="print"]'))printAll()});
  new ResizeObserver(()=>drawOver()).observe($('rm3d'))}
 if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();selId=null;op=null;lastPush=null;tapeRes=null;side();setTool('sel');V.setModel(model(),false);refresh(true);if(!V.ok)msg('Dieser Browser kann leider kein 3D anzeigen.')}
function close(){cancelOp();$('rm').classList.remove('open');$('dRml').classList.remove('open')}
function key(e){const t=e.target,inField=t&&t.closest&&t.closest('#rm,#dRml')&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA');
 if(document.querySelector('#dHelp.open')){if(e.key==='Escape')$('dHelp').classList.remove('open');return}
 if(e.key==='F1'){e.preventDefault();A.help('r');return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();A.save();return}
 if(e.key==='Escape'){e.preventDefault();if($('dRml').classList.contains('open'))$('dRml').classList.remove('open');else if(op){cancelOp()}else if(tapeRes){tapeRes=null;status();drawOver()}else if(tool!=='sel')setTool('sel');else if(selId!=null){selId=null;refresh(true)}return}
 if(inField)return;
 if(e.ctrlKey||e.metaKey){const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();cancelOp();e.shiftKey?A.redo():A.undo();refresh()}else if(k==='y'){e.preventDefault();A.redo();refresh()}else if(k==='d'&&selId!=null){e.preventDefault();copySel()}
  else if((e.key==='Control'||e.key==='Meta')&&!e.repeat){if(op&&op.t==='move'){op.copy=!op.copy;status()}}return}
 /* Zahlen gehen direkt ins Feld „Maße“ (wie in SketchUp) */
 if(/^[0-9.,;+\-]$/.test(e.key)&&(op||TOOLS[tool].vl||(tool==='push'&&lastPush))){e.preventDefault();const el=$('rmvcb');el.value=document.activeElement===el?el.value+e.key:e.key;el.focus();el.setSelectionRange(el.value.length,el.value.length);return}
 if(e.key==='Enter'&&$('rmvcb').value){e.preventDefault();vcbEnter();return}
 if(op&&op.t==='move'&&['ArrowRight','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();const k={ArrowRight:0,ArrowLeft:1,ArrowUp:2}[e.key];op.lock=op.lock===k?null:k;status(op.lock!=null?'Richtung gesperrt auf '+AXN[op.lock]+' – nochmal dieselbe Pfeiltaste hebt die Sperre auf':'');drawOver();return}
 if(tool==='rot'&&['ArrowRight','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();rotAx={ArrowRight:0,ArrowLeft:1,ArrowUp:2}[e.key];status();return}
 if(!e.altKey){const k=e.key===' '?' ':e.key;const hit=Object.keys(TOOLS).find(n=>TOOLS[n].k===k||(TOOLS[n].k===k.toLowerCase()&&k.length===1&&!e.shiftKey&&TOOLS[n].k!=='Z'));if(hit&&!(hit==='zall'&&!e.shiftKey)){e.preventDefault();if(hit==='zall')V.fit();else setTool(hit);return}}
 if(!e.altKey&&/^[lafsz]$/.test(e.key)){status({l:'Eine Linie gibt es hier nicht – Rechteck (R) oder Kreis (C) zeichnen, freie Formen im Zeichenprogramm und dann „Kontur hochziehen“.',a:'Bogen gibt es hier nicht – Kreis (C) oder Kontur aus dem Zeichenprogramm hochziehen.',f:'Versatz gibt es hier nicht – Maße unter „Objektinfo“ ändern.',s:'Skalieren gibt es hier nicht – Maße unter „Objektinfo“ oder mit Drücken/Ziehen (P) ändern.',z:'Zoomen mit dem Mausrad, alles zeigen mit Shift+Z.'}[e.key]);return}
 const b=body(selId);if(!b)return;
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSel();return}
 const st=e.shiftKey?10:1,mv={ArrowLeft:[-st,0,0],ArrowRight:[st,0,0],ArrowUp:[0,st,0],ArrowDown:[0,-st,0],PageUp:[0,0,st],PageDown:[0,0,-st]}[e.key];if(mv&&tool==='sel'){e.preventDefault();A.commit(()=>moveBy(b,mv));refresh(true)}}
return{clean,addPrim,setTool,resize,vcbEnter,get tool(){return tool},get op(){return op},get tapeRes(){return tapeRes},pickPoint,open,close,isOpen,key,refresh,list,nest,box,get state(){return R()},get sel(){return selId},select:id=>{selId=id;refresh(true)},addBox,addFromDrawing,addFromKorpus,rotate:(id,ax)=>{A.commit(()=>rotate(body(id),ax));refresh(true)},get viewer(){return V},hooks}})();
/* wiederhergestelltes 3D-Modell aus dem Browserspeicher prüfen */
{const s=window.__cad.S;if(s.raum)s.raum=window.RAUM.clean(s.raum)||undefined}
