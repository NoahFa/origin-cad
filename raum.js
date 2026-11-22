/* Origin CAD – 3D-Modus: Körper frei im Raum zusammensetzen.
   Ein Körper ist ein Quader oder eine hochgezogene Kontur aus der Zeichnung. Er hat eine Grundfläche (lokal X/Y, 0…L / 0…B),
   eine Höhe H (lokal Z) und eine Lage im Raum: o = Ursprung, u/v = Richtung der lokalen X/Y-Achse (nur 90°-Schritte), Höhe läuft in u×v.
   Raum: X = Breite, Y = Tiefe (vorn = 0), Z = Höhe. Daten liegen in der Zeichnung unter S.raum. */
window.RAUM=(()=>{
const A=window.__cad.kp,$=id=>document.getElementById(id),S=()=>window.__cad.S;
const R=()=>{const s=S();if(!s.raum)s.raum={bodies:[],nid:1};return s.raum};
const num=v=>Math.round(v*100)/100,de=v=>String(num(v)).replace('.',',');
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
let V=null,selId=null,showDims=true,drag=null,bound=false,pull=null,handles=[],srcOpen=false,listOpen=true;const meshCache=new Map();
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
/* ----- Maße und Auswahlrahmen über dem 3D-Bild ----- */
function drawOver(){const c=$('rmov'),cv=$('rm3d');if(!c||!V)return;const dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
 const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);const r=R();if(!r.bodies.length)return;
 const seg=(a,b)=>{const p=V.project(a),q=V.project(b);if(!p||!q)return null;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();return[(p[0]+q[0])/2,(p[1]+q[1])/2]};
 const label=(m,t,col)=>{if(!m)return;g.font='600 12.5px "IBM Plex Sans",system-ui,sans-serif';const tw=g.measureText(t).width;g.fillStyle='rgba(22,25,29,.82)';g.fillRect(m[0]-tw/2-4,m[1]-9,tw+8,18);g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(t,m[0],m[1])};
 const dimBox=(m,col,off)=>{g.strokeStyle=col;g.lineWidth=1.2;const[x0,y0,z0,x1,y1,z1]=m;
  label(seg([x0,y0-off,z0],[x1,y0-off,z0]),de(x1-x0),col);seg([x0,y0,z0],[x0,y0-off-8,z0]);seg([x1,y0,z0],[x1,y0-off-8,z0]);
  label(seg([x1+off,y0,z0],[x1+off,y1,z0]),de(y1-y0),col);seg([x1,y0,z0],[x1+off+8,y0,z0]);seg([x1,y1,z0],[x1+off+8,y1,z0]);
  label(seg([x0-off,y0,z0],[x0-off,y0,z1]),de(z1-z0),col);seg([x0,y0,z0],[x0-off-8,y0,z0]);seg([x0,y0,z1],[x0-off-8,y0,z1])};
 const all=boxAll(r.bodies),sz=Math.max(all[3]-all[0],all[4]-all[1],all[5]-all[2],100);
 const b=body(selId);
 if(b){const m=box(b),P=(i,j,k)=>[m[i?3:0],m[j?4:1],m[k?5:2]];g.strokeStyle='#e5482d';g.lineWidth=1.6;g.setLineDash([5,4]);
  for(const[a,c2]of[[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]],[[0,0,1],[1,0,1]],[[0,1,1],[1,1,1]],[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]],[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]],[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]],[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]])seg(P(...a),P(...c2));g.setLineDash([])}
 if(pull&&body(pull.id)){const m=box(body(pull.id)),i=pull.i,c=pull.sign>0?m[i+3]:m[i],a1=(i+1)%3,a2=(i+2)%3,P=(s,t)=>{const q=[0,0,0];q[i]=c;q[a1]=s?m[a1+3]:m[a1];q[a2]=t?m[a2+3]:m[a2];return V.project(q)},qs=[P(0,0),P(1,0),P(1,1),P(0,1)];
  if(qs.every(Boolean)){g.beginPath();qs.forEach((q,k)=>k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fillStyle='rgba(229,72,45,.32)';g.fill();g.strokeStyle='#e5482d';g.lineWidth=2;g.stroke()}}
 if(showDims){dimBox(all,'#5ad1e8',sz*0.07);if(b&&r.bodies.length>1)dimBox(box(b),'#ffb020',sz*0.025)}
 /* Ziehpfeile an den Flächen des gewählten Körpers */
 handles=[];if(b){const m=box(b),f=V.ray(w/2,h/2).f;
  for(let i=0;i<3;i++)for(const sg of[1,-1]){if(i===2&&sg<0&&(b.kind==='plane'||m[2]<=0.5))continue;/* Unterseite auf dem Boden: kein Pfeil nach unten */if(b.kind==='ext'&&i!==2)continue;const n=[0,0,0];n[i]=sg;if(dot(n,f)>0.35)continue;
   const c=[(m[0]+m[3])/2,(m[1]+m[4])/2,(m[2]+m[5])/2];c[i]=sg>0?m[i+3]:m[i];const p0=V.project(c),p1=V.project(add(c,mul(n,sz*0.05)));if(!p0||!p1)continue;
   let dx=p1[0]-p0[0],dy=p1[1]-p0[1];const l=Math.hypot(dx,dy);if(l<1)continue;dx/=l;dy/=l;const tip=[p0[0]+dx*38,p0[1]+dy*38],act=pull&&pull.i===i&&pull.sign===sg;
   g.strokeStyle=act?'#ff8a70':'#e5482d';g.lineWidth=2.4;g.beginPath();g.moveTo(p0[0],p0[1]);g.lineTo(tip[0],tip[1]);g.stroke();
   g.beginPath();g.arc(tip[0],tip[1],9,0,Math.PI*2);g.fillStyle=act?'#e5482d':'#fff';g.fill();g.lineWidth=2;g.strokeStyle='#e5482d';g.stroke();
   g.beginPath();g.moveTo(tip[0]+dx*4.5,tip[1]+dy*4.5);g.lineTo(tip[0]-dx*2.5-dy*4,tip[1]-dy*2.5+dx*4);g.lineTo(tip[0]-dx*2.5+dy*4,tip[1]-dy*2.5-dx*4);g.closePath();g.fillStyle=act?'#fff':'#e5482d';g.fill();
   handles.push({i,sign:sg,c,tip})}}
 /* Maßfeld an der gezogenen Fläche */
 const fl=$('rmfloat');if(fl){const hd=pull&&handles.find(q=>q.i===pull.i&&q.sign===pull.sign);if(hd){fl.hidden=false;const W=fl.offsetWidth,H=fl.offsetHeight;fl.style.left=Math.max(4,Math.min(w-W-4,hd.tip[0]+16))+'px';fl.style.top=Math.max(4,Math.min(h-H-4,hd.tip[1]-H/2))+'px'}else fl.hidden=true}}
/* ----- Auswählen und Ziehen ----- */
function hitBody(px,py){const ry=V.ray(px,py);let best=null,bt=Infinity,bf=null;for(const b of R().bodies){const m=box(b);let t0=-Infinity,t1=Infinity,ok=true,face=null;
  for(let i=0;i<3;i++){const lo=m[i]-(m[i+3]-m[i]<0.5?0.5:0),hi=m[i+3]+(m[i+3]-m[i]<0.5?0.5:0);if(Math.abs(ry.d[i])<1e-9){if(ry.o[i]<lo||ry.o[i]>hi){ok=false;break}}else{let a=(lo-ry.o[i])/ry.d[i],c=(hi-ry.o[i])/ry.d[i],sg=-1;if(a>c){[a,c]=[c,a];sg=1}if(a>t0){t0=a;face={i,sign:sg}}t1=Math.min(t1,c)}}
  if(ok&&t0<=t1&&t1>0&&t0<bt){bt=t0;best=b;bf=face}}return best?{b:best,face:bf,p:add(ry.o,mul(ry.d,Math.max(bt,0))),ry}:null}
/* Fläche ziehen: Körper in Richtung einer Raumachse größer/kleiner machen. face = {i: Achse, sign: +1 obere/rechte/hintere, −1 untere/linke/vordere Fläche}, d = nach außen (mm) */
function axisOf(b,i){const w=wOf(b);for(const[k,a]of[['L',b.u],['B',b.v],['H',w]])if(Math.abs(a[i])>0.5)return{k,a,s:Math.sign(a[i])}}
function resize(b,face,d){const ax=axisOf(b,face.i),grow=(k,a,dd,minEnd)=>{const nv=Math.max(k==='H'&&b.kind==='plane'?0:1,num(b[k]+dd)),real=nv-b[k];b[k]=nv;if(minEnd)b.o=sub(b.o,mul(a,real)).map(num);return real};
 const minEnd=(ax.s>0&&face.sign<0)||(ax.s<0&&face.sign>0);
 if(b.kind==='box'||b.kind==='plane'){if(b.kind==='plane'&&ax.k==='H'){if(d<=0)return'Eine Ebene lässt sich nur nach außen zu einem Quader ziehen.';b.kind='box';if(b.name==='Ebene')b.name='Quader'}grow(ax.k,ax.a,d,minEnd);return}
 if(ax.k==='H'&&(b.kind==='ext'||b.kind==='cyl'||b.kind==='cone')){grow('H',ax.a,d,minEnd);return}
 if(b.kind==='ext')return'Bei einem Formteil lässt sich nur die Höhe ziehen – die Form änderst du in der Zeichnung.';
 /* runde Körper: Durchmesser ändern, Mitte bleibt */
 const w=wOf(b);if(b.kind==='tor'&&ax.k==='H'){const r=grow('H',w,2*d,false);b.o=sub(b.o,mul(w,r/2)).map(num);if(b.H>b.L/2)b.H=num(b.L/2);return}
 const nd=Math.max(2,num(b.L+2*d)),real=nd-b.L;b.L=b.B=nd;b.o=sub(sub(b.o,mul(b.u,real/2)),mul(b.v,real/2)).map(num);if(b.kind==='sph'){b.H=nd;b.o=sub(b.o,mul(w,real/2)).map(num)}if(b.kind==='tor')b.H=Math.min(b.H,num(nd/2));if(b.kind==='cone')b.D2=Math.min(b.D2||0,nd)}
/* Maß des Körpers in Zugrichtung */
const sizeAlong=(b,i)=>{const m=box(b);return num(m[i+3]-m[i])};
const isRound=(b,i)=>b.kind==='sph'||(['cyl','cone'].includes(b.kind)&&axisOf(b,i).k!=='H')||b.kind==='tor';
function setPull(b,face){pull={id:b.id,i:face.i,sign:face.sign};$('rmflab').textContent=isRound(b,face.i)?(b.kind==='tor'&&axisOf(b,face.i).k==='H'?'Rohr-Ø':'Ø'):['Breite','Tiefe','Höhe'][face.i];$('rmfv').value=de(sizeAlong(b,face.i));drawOver()}
function focusPull(){const el=$('rmfv');if(pull&&matchMedia('(pointer:fine)').matches){el.focus();el.select()}}
function clearPull(){pull=null;const f=$('rmfloat');if(f)f.hidden=true}
function applyPull(txt){const b=pull&&body(pull.id);if(!b)return;const t=txt.trim().replace(',','.'),rel=/^[+-]/.test(t),v=parseFloat(t);if(!isFinite(v)){msg('Bitte eine Zahl eingeben, z. B. 120 (neues Maß) oder +50 (um 50 weiter).');return}
 const cur=sizeAlong(b,pull.i),half=isRound(b,pull.i),d=rel?v:(v-cur)/(half?2:1);let err;A.commit(()=>{err=resize(b,pull,d)});if(err)msg(err);refresh(true);$('rmfv').value=de(sizeAlong(b,pull.i));focusPull()}
const planeHit=(ry,p0,n)=>{const dn=dot(ry.d,n);if(Math.abs(dn)<1e-6)return null;const t=dot(sub(p0,ry.o),n)/dn;return t>0?add(ry.o,mul(ry.d,t)):null};
/* Einrasten: Flächen an Flächen anderer Körper (bündig oder anstoßend) und an den Boden */
/* Einrast-Abstand: etwa 10 Bildpunkte, egal wie weit gezoomt ist */
const tolPx=px=>px*2*V.cam.dist*Math.tan(0.3)/Math.max(200,$('rm3d').clientHeight);
/* nur Körper in der Nähe zählen: in den beiden anderen Richtungen überlappend oder höchstens gap entfernt */
const near=(m,q,i,gap)=>[0,1,2].every(j=>j===i||(q[j]<=m[j+3]+gap&&q[j+3]>=m[j]-gap));
function snap(b,axes){const m=box(b),tol=tolPx(10),d=[0,0,0];for(const i of axes){let best=null;const cand=[];for(const o of R().bodies){if(o===b)continue;const q=box(o);if(near(m,q,i,tolPx(40)))cand.push(q[i],q[i+3])}if(i===2)cand.push(0);
  for(const c of cand)for(const mine of[m[i],m[i+3]]){const dd=c-mine;if(Math.abs(dd)<tol&&(best===null||Math.abs(dd)<Math.abs(best)))best=dd}if(best!==null)d[i]=best}return d}
function pos(e){const r=$('rm3d').getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
function hitHandle(x,y){const r=matchMedia('(pointer:coarse)').matches?22:14;return handles.find(q=>Math.hypot(q.tip[0]-x,q.tip[1]-y)<=r)||null}
const hooks={
 down(e){const[x,y]=pos(e),hd=hitHandle(x,y);
  if(hd){const b=body(selId);setPull(b,hd);const n=[0,0,0];n[hd.i]=hd.sign;drag={pull:true,b,n,p0:hd.c,t0:lineT(V.ray(x,y),hd.c,n),orig:JSON.stringify(b),moved:false,sx:x,sy:y};return true}
  const h=hitBody(x,y);if(!h){if(selId!=null||pull){selId=null;clearPull();refresh(true)}return false}
  if(selId!==h.b.id){selId=h.b.id;clearPull();refresh(true)}else if(pull){clearPull();drawOver()}
  drag={b:h.b,p0:h.p,o0:[...h.b.o],orig:JSON.stringify(h.b),moved:false,sx:x,sy:y};return true},
 move(e){if(!drag)return;const[x,y]=pos(e);if(!drag.moved&&Math.hypot(x-drag.sx,y-drag.sy)<4)return;drag.moved=true;const ry=V.ray(x,y),b=drag.b;
  if(drag.pull){const t=lineT(ry,drag.p0,drag.n);if(t==null)return;let d=Math.round(t-drag.t0);Object.assign(b,JSON.parse(drag.orig));
   const m=box(b),i=pull.i,c0=pull.sign>0?m[i+3]:m[i],tol=tolPx(10);let best=null;for(const o of R().bodies){if(o.id===b.id)continue;const q=box(o);if(!near(m,q,i,tolPx(40)))continue;for(const c of[q[i],q[i+3]]){const dd=(c-c0)*pull.sign-d;if(Math.abs(dd)<tol&&(best===null||Math.abs(dd)<Math.abs(best)))best=dd}}if(best!==null)d+=best;
   const err=resize(b,pull,d);if(err){msg(err);return}show();fillSel();$('rmfv').value=de(sizeAlong(b,i));return}
  $('rm3d').style.cursor='grabbing';let d;
  if(e.shiftKey){const n=[ry.f[0],ry.f[1],0],p=planeHit(ry,drag.p0,Math.hypot(n[0],n[1])<1e-6?[0,1,0]:n);if(!p)return;d=[0,0,p[2]-drag.p0[2]]}
  else{const p=planeHit(ry,drag.p0,[0,0,1]);if(!p)return;d=[p[0]-drag.p0[0],p[1]-drag.p0[1],0]}
  b.o=add(drag.o0,d).map(v=>Math.round(v));moveBy(b,snap(b,e.shiftKey?[2]:[0,1]));show();fillSel()},
 up(){if(!drag)return;const d=drag;drag=null;$('rm3d').style.cursor='';if(d.moved){const neu=JSON.stringify(d.b);for(const k of Object.keys(d.b))delete d.b[k];Object.assign(d.b,JSON.parse(d.orig));A.commit(()=>{for(const k of Object.keys(d.b))delete d.b[k];Object.assign(d.b,JSON.parse(neu))})}
  refresh(true);if(d.pull&&pull){$('rmfv').value=de(sizeAlong(d.b,pull.i));focusPull()}},
 draw(){drawOver()}};
/* nächster Punkt einer Geraden (p0 + n·t) zum Sehstrahl */
function lineT(ry,p0,n){const b=dot(ry.d,n),den=1-b*b;if(den<1e-6)return null;const w0=sub(p0,ry.o);return(b*dot(ry.d,w0)-dot(n,w0))/den}
function hint(){const b=body(selId);$('rmhint').textContent=!R().bodies.length?'':b?'Körper ziehen = verschieben (rastet ein) · Shift + ziehen = anheben · Pfeil ziehen oder anklicken = Größe ändern und Maß eintippen · Entf = löschen · Esc = abwählen':'Körper anklicken = wählen · leere Fläche ziehen = Ansicht drehen · rechte Maustaste ziehen = Ansicht schieben · Mausrad = Zoom';
 const ctx=$('rmctx');ctx.hidden=!b;if(b)$('rmctxn').textContent=b.name;$('rmempty').hidden=R().bodies.length>0}
/* ----- Körper anlegen ----- */
function place(b){/* neben das Vorhandene stellen */const others=R().bodies.filter(x=>x!==b);if(others.length){const m=boxAll(others),q=box(b);moveBy(b,[m[3]+50-q[0],m[1]-q[1],-q[2]])}}
const PRIM={box:{name:'Quader',L:600,B:400,H:19},sph:{name:'Kugel',L:200,B:200,H:200},cyl:{name:'Zylinder',L:200,B:200,H:300},cone:{name:'Kegel',L:200,B:200,H:300,D2:0},tor:{name:'Torus',L:300,B:300,H:60},plane:{name:'Ebene',L:1000,B:1000,H:0}};
function addPrim(kind){if(!PRIM[kind])return;let b;A.commit(()=>{b=newBody({kind,...PRIM[kind]});place(b);selId=b.id});clearPull();refresh();ensureVisible(b)}
function ensureVisible(b){if(!V||!b)return;const m=box(b),cv=$('rm3d'),ok=[[m[0],m[1],m[2]],[m[3],m[4],m[5]]].every(q=>{const p=V.project(q);return p&&p[0]>20&&p[1]>60&&p[0]<cv.clientWidth-20&&p[1]<cv.clientHeight-40});if(R().bodies.length===1||!ok){V.fit();drawOver()}}
const addBox=()=>addPrim('box');
function addFromDrawing(){const c=A.contours(),H=val('rn_X')||19;if(!c.list.length){msg('In der Zeichnung ist keine geschlossene Kontur. Erst im Zeichenprogramm eine zeichnen (z. B. Rechteck oder Kreis).');return}
 A.commit(()=>{let last=null;for(const q of c.list){last=newBody({name:'Formteil',kind:'ext',L:q.w,B:q.h,H,poly:{outer:q.outer,holes:q.holes},o:[num(q.at[0]),num(q.at[1]),0]})}
  /* gemeinsam neben das Vorhandene schieben, Lage zueinander bleibt */const neu=R().bodies.slice(-c.list.length),alt=R().bodies.slice(0,-c.list.length);if(alt.length){const m=boxAll(alt),q=boxAll(neu);for(const b of neu)moveBy(b,[m[3]+50-q[0],m[1]-q[1],0])}selId=last.id});
 msg(`${c.list.length} Kontur${c.list.length>1?'en':''} ${c.bySel?'(die gewählten) ':''}hochgezogen.`);refresh()}
function addFromKorpus(){const K=window.KORPUS,ps=K.parts();if(!ps.length)return;A.commit(()=>{const alt=[...R().bodies],neu=[];for(const p of ps)neu.push(newBody({name:p.name,L:p.W,B:p.H,H:p.T,o:[...p.o],u:[...p.u],v:[...p.v],mat:p.matId||'',...(p.rod?{tint:[0.8,0.83,0.87],rod:1}:{})}));
  if(alt.length){const m=boxAll(alt),q=boxAll(neu);for(const b of neu)moveBy(b,[m[3]+50-q[0],m[1]-q[1],0])}selId=null});msg(`Schrank übernommen: ${ps.length} Körper. Er ist jetzt vom Korpusplaner gelöst – Bohrungen bleiben im Planer.`);refresh();V&&V.fit()}
/* ----- Seitenleiste ----- */
const val=id=>{const el=$(id);if(!el)return null;const v=parseFloat(el.value.replace(',','.'));return isFinite(v)&&v>0?v:null};
function msg(t){$('rmmsg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('rmmsg').textContent='',7000)}
function side(){const r=R(),inp=(id,lab,v)=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${de(v)}"></div>`;
 const keep={};for(const id of['rn_X']){const el=$(id);if(el)keep[id]=el.value}
 const ICO={box:'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',sph:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12c0 2 4 3.5 9 3.5s9-1.5 9-3.5',cyl:'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6',cone:'M12 3L5 18c0 1.7 3.1 3 7 3s7-1.3 7-3z',tor:'M12 6c5 0 9 2.7 9 6s-4 6-9 6-9-2.7-9-6 4-6 9-6zM12 10.5c1.9 0 3.5.7 3.5 1.5s-1.6 1.5-3.5 1.5-3.5-.7-3.5-1.5 1.6-1.5 3.5-1.5',plane:'M3 16l6-8h12l-6 8z'};
 $('rmside').innerHTML=`<h2 class="kpall" style="margin-top:2px">Körper hinzufügen</h2>
  <div class="rmprim">${Object.keys(PRIM).map(k=>`<button data-prim="${k}" title="${PRIM[k].name} anlegen"><svg viewBox="0 0 24 24"><path d="${ICO[k]}"/></svg>${PRIM[k].name}</button>`).join('')}</div>
  <details class="kpsec" id="rmsrc" style="margin-top:8px" ${srcOpen?'open':''}><summary><b>Aus Zeichnung oder Korpusplaner</b><span>Kontur hochziehen · Schrank holen</span></summary><div class="kpsecb">
  ${inp('rn_X','Höhe beim Hochziehen',19)}<button class="btn" id="rn_ext" style="width:100%">Kontur aus der Zeichnung hochziehen</button><p class="muted kpnote">Nimmt die im Zeichenprogramm gewählten geschlossenen Konturen, sonst alle. Löcher bleiben erhalten.</p>
  <button class="btn" id="rn_kp" style="width:100%">Schrank aus dem Korpusplaner holen</button></div></details>
 <div id="rmsel"></div>
 ${r.bodies.length?`<details class="kpsec" id="rmlst" ${listOpen?'open':''}><summary><b>Alle Körper (${r.bodies.length})</b><span>anklicken = wählen</span></summary><div class="kpsecb rmlist">${r.bodies.map(b=>`<button class="rmit ${b.id===selId?'on':''}" data-rmid="${b.id}"><b>${A.esc(b.name)}</b><span>${dimTxt(b)}</span></button>`).join('')}</div></details>`:''}`;
 $('rmsrc').addEventListener('toggle',e=>{srcOpen=e.target.open});if($('rmlst'))$('rmlst').addEventListener('toggle',e=>{listOpen=e.target.open});
 for(const id in keep)if($(id))$(id).value=keep[id];
 $('rmside').querySelectorAll('[data-prim]').forEach(bt=>bt.onclick=()=>addPrim(bt.dataset.prim));$('rn_ext').onclick=addFromDrawing;$('rn_kp').onclick=addFromKorpus;
 $('rmside').querySelectorAll('[data-rmid]').forEach(bt=>bt.onclick=()=>{selId=+bt.dataset.rmid;refresh(true)});fillSel()}
const dims3=b=>[b.L,b.B,b.H].slice().sort((x,y)=>y-x),dimTxt=b=>b.kind==='sph'?'Ø '+de(b.L):b.kind==='cyl'||b.kind==='cone'?'Ø '+de(b.L)+' × '+de(b.H):b.kind==='tor'?'Ø '+de(b.L)+' · Rohr Ø '+de(b.H):b.kind==='plane'?de(b.L)+' × '+de(b.B):dims3(b).map(de).join(' × ');
function fillSel(){const el=$('rmsel'),b=body(selId);if(!el)return;if(!b){el.innerHTML='';return}if(el.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&drag)return;
 const m=box(b),inp=(id,lab,v,ro)=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${typeof v==='number'?de(v):A.esc(v)}" ${ro?'readonly':''}></div>`,MATS=window.KORPUS.MATS;
 el.innerHTML=`<div class="kpsel"><b>Gewählter Körper</b>
  <div class="pr"><label for="rs_name">Name</label><input id="rs_name" type="text" value="${A.esc(b.name)}" style="text-align:left"></div>
  ${{box:()=>inp('rs_L','Länge',b.L)+inp('rs_B','Breite',b.B)+inp('rs_H','Höhe / Stärke',b.H),plane:()=>inp('rs_L','Länge',b.L)+inp('rs_B','Breite',b.B),sph:()=>inp('rs_D','Durchmesser',b.L),cyl:()=>inp('rs_D','Durchmesser',b.L)+inp('rs_H','Höhe',b.H),cone:()=>inp('rs_D','Durchmesser unten',b.L)+inp('rs_D2','Durchmesser oben',b.D2||0)+inp('rs_H','Höhe',b.H),tor:()=>inp('rs_D','Außendurchmesser',b.L)+inp('rs_H','Rohrdurchmesser',b.H),ext:()=>inp('rs_LB','Grundfläche',de(b.L)+' × '+de(b.B),true)+inp('rs_H','Höhe',b.H)}[b.kind]()}
  <div class="rm3"><label>Lage (linke vordere untere Ecke)</label><input id="rs_x" type="text" inputmode="decimal" value="${de(m[0])}" aria-label="X"><input id="rs_y" type="text" inputmode="decimal" value="${de(m[1])}" aria-label="Y"><input id="rs_z" type="text" inputmode="decimal" value="${de(m[2])}" aria-label="Z"><span>X</span><span>Y nach hinten</span><span>Z Höhe</span></div>
  <div class="pr"><label for="rs_mat">Material</label><select id="rs_mat">${MATS.map(q=>`<option value="${q[0]}" ${(b.mat||'')===q[0]?'selected':''}>${q[0]?q[0]+' '+q[1]:q[1]}</option>`).join('')}</select></div></div>`;
 const on=(id,fn)=>{const x=$(id);if(!x)return;x.addEventListener('keydown',e=>{if(e.key==='Enter')x.blur()});x.addEventListener('change',()=>{fn(x);refresh(true)})},nv=x=>{const v=parseFloat(x.value.replace(',','.'));return isFinite(v)?v:null};
 on('rs_name',x=>{const t=x.value.trim();if(t)A.commit(()=>{b.name=t.slice(0,60)})});
 for(const[id,f]of[['rs_L','L'],['rs_B','B'],['rs_H','H']])on(id,x=>{const v=nv(x);if(v>0)A.commit(()=>{const c0=box(b);b[f]=num(Math.min(v,10000));const n=box(b);moveBy(b,[c0[0]-n[0],c0[1]-n[1],c0[2]-n[2]])})});
 ['rs_x','rs_y','rs_z'].forEach((id,i)=>on(id,x=>{const v=nv(x);if(v!=null)A.commit(()=>{const d=[0,0,0];d[i]=v-box(b)[i];moveBy(b,d)})}));
 on('rs_D',x=>{const v=nv(x);if(v>0)A.commit(()=>{const c0=box(b);b.L=b.B=num(Math.min(v,10000));if(b.kind==='sph')b.H=b.L;if(b.kind==='tor')b.H=Math.min(b.H,num(b.L/2));if(b.kind==='cone')b.D2=Math.min(b.D2||0,b.L);const n=box(b);moveBy(b,[c0[0]-n[0],c0[1]-n[1],c0[2]-n[2]])})});
 on('rs_D2',x=>{const v=nv(x);if(v!=null&&v>=0)A.commit(()=>{b.D2=num(Math.min(v,b.L))})});
 on('rs_mat',x=>A.commit(()=>{b.mat=x.value}));
}
/* Aktionen am gewählten Körper (Leiste im 3D-Bild) */
function ctxAct(a){const b=body(selId);if(!b)return;if(a==='del'){removeSel();return}
 if(a==='copy'){let n;A.commit(()=>{n=newBody(JSON.parse(JSON.stringify({...b,id:undefined})));n.id=R().nid-1;const m2=box(b);moveBy(n,[m2[3]-m2[0]+50,0,0]);selId=n.id});clearPull();refresh();ensureVisible(n);return}
 if(a==='floor'){A.commit(()=>moveBy(b,[0,0,-box(b)[2]]));refresh(true);return}
 const ax={rot2:2,rot0:0,rot1:1}[a];if(ax!=null){clearPull();A.commit(()=>rotate(b,ax));refresh(true)}}
function removeSel(){const b=body(selId);if(!b)return;clearPull();A.commit(()=>{const r=R();r.bodies=r.bodies.filter(x=>x!==b)});selId=null;refresh()}
function refresh(light){const r=R();if(selId!=null&&!body(selId))selId=null;if(pull&&(!body(pull.id)||pull.id!==selId))clearPull();if(light){document.querySelectorAll('#rmside [data-rmid]').forEach(bt=>bt.classList.toggle('on',+bt.dataset.rmid===selId));fillSel()}else side();show();hint();
 const m=boxAll(r.bodies);$('rminfo').textContent=r.bodies.length?`${r.bodies.length} Körper · gesamt ${de(m[3]-m[0])} × ${de(m[4]-m[1])} × ${de(m[5]-m[2])} mm`:'leer'}
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
function open(){A.cancel();R();if(window.KORPUS&&window.KORPUS.isOpen())window.KORPUS.close();$('rm').classList.add('open');
 if(!bound){bound=true;V=window.CAD3D.create($('rm3d'),hooks);
  $('rm').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=b.dataset.rm;if(a==='close')close();else if(a==='list')openList();else if(a==='pic')savePic();else if(a==='print')printAll();else if(a==='undo'){A.undo();refresh()}else if(a==='fit')V.fit();else V.view(a)});
  $('rmctx').addEventListener('click',e=>{const b=e.target.closest('[data-ctx]');if(b)ctxAct(b.dataset.ctx)});
  $('rmfv').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();applyPull($('rmfv').value)}else if(e.key==='Escape'){clearPull();drawOver();$('rmfv').blur()}});
  $('rmfok').onclick=()=>applyPull($('rmfv').value);
  $('rmempty').addEventListener('click',e=>{const b=e.target.closest('[data-prim]');if(b)addPrim(b.dataset.prim)});
  $('rm3d').addEventListener('pointermove',e=>{if(drag||e.buttons)return;const[x,y]=pos(e);$('rm3d').style.cursor=hitHandle(x,y)?'pointer':(()=>{const h=hitBody(x,y);return h?(h.b.id===selId?'move':'pointer'):'grab'})()});
  $('rmdims').addEventListener('change',e=>{showDims=e.target.checked;drawOver()});
  $('dRml').addEventListener('click',e=>{if(e.target.closest('[data-rml="print"]'))printAll()});
  new ResizeObserver(()=>drawOver()).observe($('rm3d'))}
 selId=null;clearPull();side();V.setModel(model(),false);refresh(true);if(!V.ok)msg('Dieser Browser kann leider kein 3D anzeigen.')}
function close(){$('rm').classList.remove('open');$('dRml').classList.remove('open')}
function key(e){const t=e.target,inField=t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA');
 if(e.key==='Escape'){e.preventDefault();if($('dRml').classList.contains('open'))$('dRml').classList.remove('open');else if(pull){clearPull();drawOver()}else if(selId!=null){selId=null;refresh(true)}else close();return}
 if(inField)return;
 if(e.ctrlKey||e.metaKey){const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();e.shiftKey?A.redo():A.undo();refresh()}else if(k==='y'){e.preventDefault();A.redo();refresh()}else if(k==='d'&&selId!=null){e.preventDefault();ctxAct('copy')}return}
 const b=body(selId);if(!b)return;
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSel();return}
 const st=e.shiftKey?10:1,mv={ArrowLeft:[-st,0,0],ArrowRight:[st,0,0],ArrowUp:[0,st,0],ArrowDown:[0,-st,0],PageUp:[0,0,st],PageDown:[0,0,-st]}[e.key];if(mv){e.preventDefault();A.commit(()=>moveBy(b,mv));refresh(true)}}
return{addPrim,applyPull,resize,ctxAct,get handles(){return handles},get pull(){return pull},open,close,isOpen,key,refresh,list,nest,box,get state(){return R()},get sel(){return selId},select:id=>{selId=id;refresh(true)},addBox,addFromDrawing,addFromKorpus,rotate:(id,ax)=>{A.commit(()=>rotate(body(id),ax));refresh(true)},get viewer(){return V},hooks}})();
