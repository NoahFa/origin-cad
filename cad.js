{
/* ---------- Mathe ---------- */
const TAU=Math.PI*2,D2R=Math.PI/180;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,k)=>[a[0]*k,a[1]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1],crs=(a,b)=>a[0]*b[1]-a[1]*b[0],len=a=>Math.hypot(a[0],a[1]);
const dist=(a,b)=>len(sub(a,b)),nrm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l]},ang=a=>Math.atan2(a[1],a[0]);
const pol=(c,r,t)=>[c[0]+r*Math.cos(t),c[1]+r*Math.sin(t)],na=t=>((t%TAU)+TAU)%TAU;
const rotP=(p,c,t)=>{const d=sub(p,c),co=Math.cos(t),si=Math.sin(t);return[c[0]+d[0]*co-d[1]*si,c[1]+d[0]*si+d[1]*co]};
const inArc=(t,a0,a1)=>na(t-a0)<=na(a1-a0)+1e-9;
const mid=(a,b)=>mul(add(a,b),.5),deg=t=>t/D2R;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function dSeg(p,a,b){const d=sub(b,a),L=dot(d,d);if(L<1e-18)return dist(p,a);const t=clamp(dot(sub(p,a),d)/L,0,1);return dist(p,add(a,mul(d,t)))}
function lineInt(a,b,c,d){const r=sub(b,a),s=sub(d,c),den=crs(r,s);if(Math.abs(den)<1e-12)return null;return add(a,mul(r,crs(sub(c,a),s)/den))}
const fmt=(v,d=2)=>{const r=Math.round(v*10**d)/10**d;return(Object.is(r,-0)?0:r).toString()};
const fmtDE=v=>fmt(v,1).replace('.',',');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Rechner ohne eval: + - * / ( ) */
function ev(s){s=s.replace(/\s+/g,'');let i=0;
 const num=()=>{if(s[i]==='('){i++;const v=ex();if(s[i]!==')')throw 0;i++;return v}
  if(s[i]==='-'){i++;return -num()}if(s[i]==='+'){i++;return num()}
  const m=/^\d*\.?\d+(e[-+]?\d+)?|^\d+\./i.exec(s.slice(i));if(!m)throw 0;i+=m[0].length;return parseFloat(m[0])};
 const term=()=>{let v=num();while(s[i]==='*'||s[i]==='/'){const o=s[i++],w=num();v=o==='*'?v*w:v/w}return v};
 const ex=()=>{let v=term();while(s[i]==='+'||s[i]==='-'){const o=s[i++],w=term();v=o==='+'?v+w:v-w}return v};
 try{if(!s)return null;const v=ex();return i===s.length&&isFinite(v)?v:null}catch(e){return null}}

/* ---------- Zustand ---------- */
const DEF_LAYERS=()=>[{n:'0',c:'#c9ced6',v:true},{n:'Kontur',c:'#f4f6f8',v:true},{n:'Hilfslinien',c:'#6f9cff',v:true},{n:'Bemaßung',c:'#5ad1e8',v:true}];
const DEF_CUT=()=>({tool:6,depth:6,thick:19});
let S={ents:[],layers:DEF_LAYERS(),cur:'Kontur',nid:1,def:DEF_CUT()};
let sel=new Set(),undoS=[],redoS=[];
const view={s:1,ox:0,oy:0};
const tg={osnap:true,polar:true,ortho:false,grid:true,gsnap:false,cam:false};let gstep=10,pstep=45,polarHit=null;
let mouse={sp:[0,0],in:false},cursorW=[0,0],curP=[0,0],snapHit=null,hoverE=null,drag=null,pan=null,spaceDown=false,spaceUsed=false;
let lastPt=null,mem={pg:6,off:10,rad:5,cha:5,cols:3,rows:1,dx:100,dy:100,dia:35,sk:2,cupP:'O',cupK:'L',th:20,td:1,bb:'L',
 rowD:5,rowN:5,rowS:32,rowT:13,dwD:8,dwN:2,dwS:32,dwT:12,cupD:35,cupT:13,lkN:6,lkD:5,lkT:10};
const lyr=n=>S.layers.find(l=>l.n===n);
const byId=id=>S.ents.find(e=>e.id===id);
const vis=e=>{const l=lyr(e.ly);return!l||l.v};
const geomEnts=()=>S.ents.filter(e=>e.t!=='dim'&&vis(e));
const dimLayer=()=>lyr('Bemaßung')?'Bemaßung':S.cur;
function mk(t,p,ly){return Object.assign({id:S.nid++,t,ly:ly||S.cur},p)}
function tmp(t,p){return Object.assign({t,ly:S.cur},p)}
function realize(o,ly){o.id=S.nid++;o.ly=ly||o.ly||S.cur;return o}
function replace(e,list){const i=S.ents.indexOf(e);if(i>=0)S.ents.splice(i,1,...list)}
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- Geometrie je Objekt ---------- */
function slotPrims(e){const d=nrm(sub(e.b,e.a)),n=[-d[1],d[0]],r=e.r,th=ang(d);
 return[{a:add(e.a,mul(n,-r)),b:add(e.b,mul(n,-r))},{c:e.b,r,a0:th-Math.PI/2,a1:th+Math.PI/2},{a:add(e.b,mul(n,r)),b:add(e.a,mul(n,r))},{c:e.a,r,a0:th+Math.PI/2,a1:th+Math.PI*1.5}]}
/* Polylinien-Bögen: Wölbung (bulge) je Segment = tan(Winkel/4), positiv = gegen den Uhrzeigersinn */
function bulgeArc(a,b,bu){const th=4*Math.atan(bu),c=dist(a,b),u=nrm(sub(b,a)),n=[-u[1],u[0]],C=add(mid(a,b),mul(n,c/2/Math.tan(th/2))),r=Math.abs(c/2/Math.sin(th/2));
 return th>0?{c:C,r,a0:ang(sub(a,C)),a1:ang(sub(b,C))}:{c:C,r,a0:ang(sub(b,C)),a1:ang(sub(a,C))}}
const hasB=bu=>bu&&Math.abs(bu)>1e-9;
const segPrim=(a,b,bu)=>hasB(bu)?bulgeArc(a,b,bu):{a,b};
const primLen=q=>q.a?dist(q.a,q.b):q.r*(isFull(q)?TAU:na(q.a1-q.a0));
const plineHasArcs=e=>!!(e.bl&&e.bl.some(hasB));
/* Text in Einstrich-Schrift */
const FONT=window.CAD_FONT||{cap:662,g:{}};
function glyph(ch){return FONT.g[ch]||FONT.g['?']||[378,[]]}
function textWidth(e){const sc=e.h/FONT.cap;let w=0;for(const ch of e.s)w+=glyph(ch)[0]*sc;return w}
function textStrokes(e){const sc=e.h/FONT.cap,o=[],co=Math.cos(e.a||0),si=Math.sin(e.a||0);let x=0;
 for(const ch of e.s){const[adv,st]=glyph(ch);for(const k of st){const pl=[];for(let i=0;i<k.length;i+=2){const lx=x+k[i]*sc,ly=k[i+1]*sc;pl.push([e.p[0]+lx*co-ly*si,e.p[1]+lx*si+ly*co])}if(pl.length>1)o.push(pl)}x+=adv*sc}
 return o}
function dimGeom(e){if(e.m==='rad'||e.m==='dia'){/* Radius-/Durchmessermaß: c Mitte, r Radius, p Lage des Textes */
  let u=sub(e.p,e.c);u=len(u)<1e-9?[1,0]:nrm(u);const ed=add(e.c,mul(u,e.r)),far=dist(e.p,e.c)>e.r?e.p:ed,st=e.m==='dia'?add(e.c,mul(u,-e.r)):e.c;
  let th=ang(u);const flip=Math.cos(th)<-1e-9;return{lines:[[st,far]],d1:e.m==='dia'?st:ed,d2:ed,val:e.m==='dia'?2*e.r:e.r,m:dist(e.p,e.c)>e.r?mid(ed,far):mid(st,ed),th:flip?th+Math.PI:th,pre:e.m==='dia'?'Ø':'R'}}
 const a=e.a,b=e.b,p=e.p;let d1,d2,val;
 if(e.m==='h'){d1=[a[0],p[1]];d2=[b[0],p[1]];val=Math.abs(b[0]-a[0])}
 else if(e.m==='v'){d1=[p[0],a[1]];d2=[p[0],b[1]];val=Math.abs(b[1]-a[1])}
 else{const u=nrm(sub(b,a)),n=[-u[1],u[0]],o=dot(sub(p,a),n);d1=add(a,mul(n,o));d2=add(b,mul(n,o));val=dist(a,b)}
 return{lines:[[a,d1],[b,d2],[d1,d2]],d1,d2,val,m:mid(d1,d2),th:ang(sub(d2,d1))}}
function prims(e){switch(e.t){
 case'line':return[{a:e.a,b:e.b}];
 case'xline':return[{a:add(e.p,mul(e.d,-XL)),b:add(e.p,mul(e.d,XL))}];
 case'pline':{const o=[],p=e.pts,bl=e.bl||[];for(let i=0;i<p.length-1;i++)o.push(segPrim(p[i],p[i+1],bl[i]));if(e.closed&&p.length>2)o.push(segPrim(p[p.length-1],p[0],bl[p.length-1]));return o}
 case'text':{const o=[];for(const pl of textStrokes(e))for(let i=0;i<pl.length-1;i++)o.push({a:pl[i],b:pl[i+1]});return o}
 case'circle':return[{c:e.c,r:e.r}];
 case'arc':return[{c:e.c,r:e.r,a0:e.a0,a1:e.a1}];
 case'slot':return slotPrims(e);
 case'dim':return dimGeom(e).lines.map(([a,b])=>({a,b}));}
 return[]}
const isFull=q=>q.a0===undefined;
function sample(q){if(q.a)return[q.a,q.b];const a0=isFull(q)?0:q.a0,sp=isFull(q)?TAU:na(q.a1-q.a0)||TAU,n=Math.max(8,Math.ceil(sp/TAU*64)),o=[];for(let i=0;i<=n;i++)o.push(pol(q.c,q.r,a0+sp*i/n));return o}
function dPrim(p,q){if(q.a)return dSeg(p,q.a,q.b);const d=dist(p,q.c);if(isFull(q)||inArc(ang(sub(p,q.c)),q.a0,q.a1))return Math.abs(d-q.r);return Math.min(dist(p,pol(q.c,q.r,q.a0)),dist(p,pol(q.c,q.r,q.a1)))}
function dEnt(p,e){let m=Infinity;for(const q of prims(e))m=Math.min(m,dPrim(p,q));return m}
const XL=1e6;/* unendliche Hilfslinie: rechnerisch ±1 km */
function snapPts(e){const o=[];if(e.t==='text')return[{p:e.p,k:'end'}];if(e.t==='xline')return[];const many=e.t==='pline'&&e.pts.length>40;for(const q of prims(e)){
 if(q.a){o.push({p:q.a,k:'end'},{p:q.b,k:'end'});if(!many||dist(q.a,q.b)>3)o.push({p:mid(q.a,q.b),k:'mid'})}
 else{o.push({p:q.c,k:'cen'});for(let i=0;i<4;i++){const t=i*Math.PI/2;if(isFull(q)||inArc(t,q.a0,q.a1))o.push({p:pol(q.c,q.r,t),k:'quad'})}
  if(!isFull(q)){o.push({p:pol(q.c,q.r,q.a0),k:'end'},{p:pol(q.c,q.r,q.a1),k:'end'},{p:pol(q.c,q.r,q.a0+na(q.a1-q.a0)/2),k:'mid'})}}}
 return o}
/* Schnittpunkte */
const onC=(q,pt)=>isFull(q)||inArc(ang(sub(pt,q.c)),q.a0,q.a1);
function iSS(p,q){const r=sub(p.b,p.a),s=sub(q.b,q.a),den=crs(r,s);if(Math.abs(den)<1e-12)return[];const w=sub(q.a,p.a),t=crs(w,s)/den,u=crs(w,r)/den;return(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9)?[add(p.a,mul(r,t))]:[]}
function iSC(p,q){const d=sub(p.b,p.a),f=sub(p.a,q.c),A=dot(d,d),B=2*dot(f,d),C=dot(f,f)-q.r*q.r;let D=B*B-4*A*C;if(D<0||A<1e-18)return[];D=Math.sqrt(D);const o=[];for(const t of D<1e-12?[-B/(2*A)]:[(-B-D)/(2*A),(-B+D)/(2*A)]){if(t>=-1e-9&&t<=1+1e-9){const pt=add(p.a,mul(d,t));if(onC(q,pt))o.push(pt)}}return o}
function iCC(p,q){const d=dist(p.c,q.c);if(d<1e-12||d>p.r+q.r+1e-9||d<Math.abs(p.r-q.r)-1e-9)return[];const a=(p.r*p.r-q.r*q.r+d*d)/(2*d),h=Math.sqrt(Math.max(0,p.r*p.r-a*a)),u=nrm(sub(q.c,p.c)),m=add(p.c,mul(u,a)),n=[-u[1],u[0]];const pts=h<1e-9?[m]:[add(m,mul(n,h)),add(m,mul(n,-h))];return pts.filter(pt=>onC(p,pt)&&onC(q,pt))}
function iPP(p,q){if(p.a&&q.a)return iSS(p,q);if(p.a)return iSC(p,q);if(q.a)return iSC(q,p);return iCC(p,q)}
function iEE(e,f){const o=[];for(const p of prims(e))for(const q of prims(f))o.push(...iPP(p,q));return o}
function bbox(es){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const e of es)if(e.t!=='xline')for(const q of prims(e))for(const p of sample(q)){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])}return x0<=x1?[x0,y0,x1,y1]:null}

/* ---------- Konturen als Punktfolgen (für Fräsvorschau und Formen kombinieren) ---------- */
const TOL=0.01; /* größte Abweichung beim Annähern von Bögen, mm */
function arcPts(c,r,t0,sw){const st=2*Math.acos(clamp(1-TOL/Math.max(r,TOL),-1,1)),n=Math.max(2,Math.ceil(Math.abs(sw)/st)),o=[];for(let i=1;i<=n;i++)o.push(pol(c,r,t0+sw*i/n));return o}
function segPts(a,b,bu){if(!hasB(bu))return[b];const q=bulgeArc(a,b,bu),o=arcPts(q.c,q.r,ang(sub(a,q.c)),4*Math.atan(bu));o[o.length-1]=b;return o}
const isClosed=e=>e.t==='circle'||e.t==='slot'||(e.t==='pline'&&!!e.closed&&e.pts.length>2);
/* liefert [{pts,closed}] */
function toPaths(e){switch(e.t){
 case'line':return[{pts:[e.a,e.b],closed:false}];
 case'xline':return[];
 case'arc':{const sw=na(e.a1-e.a0)||TAU;return[{pts:[pol(e.c,e.r,e.a0),...arcPts(e.c,e.r,e.a0,sw)],closed:false}]}
 case'circle':{const o=arcPts(e.c,e.r,0,TAU);o.pop();return[{pts:[pol(e.c,e.r,0),...o],closed:true}]}
 case'slot':{const o=[];for(const q of slotPrims(e)){if(q.a){if(!o.length)o.push(q.a);o.push(q.b)}else o.push(...arcPts(q.c,q.r,q.a0,na(q.a1-q.a0)))}o.pop();return[{pts:o,closed:true}]}
 case'pline':{const p=e.pts,cl=isClosed(e),m=cl?p.length:p.length-1,o=[p[0]];for(let i=0;i<m;i++)o.push(...segPts(p[i],p[(i+1)%p.length],e.bl&&e.bl[i]));if(cl)o.pop();return[{pts:o,closed:cl}]}
 case'text':return textStrokes(e).map(pts=>({pts,closed:false}));}
 return[]}
const area=pts=>{let a=0;for(let i=0,n=pts.length;i<n;i++){const p=pts[i],q=pts[(i+1)%n];a+=p[0]*q[1]-q[0]*p[1]}return a/2};
const ccw=pts=>area(pts)<0?[...pts].reverse():pts;
function inPoly(p,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
const CL=window.ClipperLib,SC=1000;
const toCl=pts=>pts.map(p=>({X:Math.round(p[0]*SC),Y:Math.round(p[1]*SC)})),fromCl=P=>P.map(q=>[q.X/SC,q.Y/SC]);
function clOffset(paths,d,open){if(!paths.length)return[];const co=new CL.ClipperOffset(2,TOL*SC/2);co.AddPaths(paths.map(toCl),CL.JoinType.jtRound,open?CL.EndType.etOpenRound:CL.EndType.etClosedPolygon);const o=new CL.Paths();co.Execute(o,d*SC);return o.map(fromCl)}
function clBool(type,subj,clip){const c=new CL.Clipper();c.AddPaths(subj.map(toCl),CL.PolyType.ptSubject,true);if(clip&&clip.length)c.AddPaths(clip.map(toCl),CL.PolyType.ptClip,true);const o=new CL.Paths();
 c.Execute(CL.ClipType[type],o,CL.PolyFillType.pftNonZero,CL.PolyFillType.pftNonZero);return CL.Clipper.CleanPolygons(o,SC*0.0004).filter(q=>q.length>2).map(fromCl)}
/* kleine Splitter (Rechenrauschen) entfernen */
const noSliver=ps=>clOffset(clOffset(ps,-0.03),0.03).filter(q=>Math.abs(area(q))>0.01);

/* ---------- Fräsen ---------- */
const CUTS={outside:'Außen',inside:'Innen',online:'Auf Linie',pocket:'Tasche',guide:'Hilfslinie'};
const CUTCOL={outside:'#f4f6f8',inside:'#f4f6f8',online:'#ffd166',pocket:'#a9b1bb',guide:'#6f9cff'};
const needsClosed=t=>t==='outside'||t==='inside'||t==='pocket';
let geoVer=0,CC={ver:-1};
function cache(){if(CC.ver===geoVer)return CC;CC={ver:geoVer,paths:new Map(),auto:new Map(),cam:new Map()};
 const closed=[];for(const e of S.ents){if(e.t==='dim')continue;const ps=toPaths(e);CC.paths.set(e.id,ps);if(isClosed(e)&&ps[0])closed.push([e,ps[0].pts,bbox([e])])}
 for(const[e,pts,b]of closed){let inside=false;for(const[f,q,fb]of closed){if(f===e||!vis(f)||f.ly==='Hilfslinien'||f.ct==='guide'||f.ct==='online')continue;
   if(b[0]>=fb[0]-1e-6&&b[1]>=fb[1]-1e-6&&b[2]<=fb[2]+1e-6&&b[3]<=fb[3]+1e-6&&(b[2]-b[0])*(b[3]-b[1])<(fb[2]-fb[0])*(fb[3]-fb[1])&&inPoly(pts[0],q)){inside=true;break}}
  CC.auto.set(e.id,inside?'inside':'outside')}
 return CC}
const pathsOf=e=>cache().paths.get(e.id)||toPaths(e);
function autoCut(e){if(e.t==='xline')return'guide';if(e.t==='text')return'online';if(e.ly==='Hilfslinien')return'guide';if(!isClosed(e))return'online';return cache().auto.get(e.id)||'outside'}
function cutOf(e){const t=e.ct||autoCut(e);return{t,eff:needsClosed(t)&&!isClosed(e)?'online':t,d:e.cd!=null?e.cd:S.def.depth,tool:e.tool!=null?e.tool:S.def.tool,auto:!e.ct}}
/* Fräserbahn und stehenbleibendes Material */
function camOf(e){const C=cache();if(C.cam.has(e.id))return C.cam.get(e.id);const c=cutOf(e),r=c.tool/2,ps=pathsOf(e);let res={center:[],band:[],left:[],fail:false};
 try{if(c.eff==='guide'||r<=0){}
  else if(c.eff==='online'){res.center=ps.map(p=>p.closed?[...p.pts,p.pts[0]]:p.pts);res.band=ps.flatMap(p=>p.closed?clBool('ctDifference',clOffset([ccw(p.pts)],r),clOffset([ccw(p.pts)],-r)):clOffset([p.pts],r,true))}
  else{const P=[ccw(ps[0].pts)];
   if(c.eff==='outside'){res.center=clOffset(P,r);const close=clOffset(res.center,-r);res.left=noSliver(clBool('ctDifference',close,P))}
   else{res.center=clOffset(P,-r);if(!res.center.length){res.fail=true;res.left=P}else{const open=clOffset(res.center,r);res.left=noSliver(clBool('ctDifference',P,open))}}
   res.center=res.center.map(q=>[...q,q[0]])}}catch(err){console.error(err)}
 C.cam.set(e.id,res);return res}

/* Transformation: k = 'mv' | 'rot' | 'mir' */
function xf(e,f,k='mv'){const n=clone(e);
 switch(e.t){case'line':case'slot':n.a=f(e.a);n.b=f(e.b);break;
 case'xline':{n.p=f(e.p);const q=sub(f(add(e.p,e.d)),n.p);n.d=nrm(q);break}
 case'pline':n.pts=e.pts.map(f);if(k==='mir'&&n.bl)n.bl=n.bl.map(v=>-v);if(k!=='mv'&&n.rect){const xs=n.pts.map(p=>p[0]),ys=n.pts.map(p=>p[1]);const ax=new Set(xs.map(v=>v.toFixed(6))).size,ay=new Set(ys.map(v=>v.toFixed(6))).size;if(ax!==2||ay!==2)delete n.rect}break;
 case'circle':n.c=f(e.c);break;
 case'arc':{let p0=f(pol(e.c,e.r,e.a0)),p1=f(pol(e.c,e.r,e.a1));n.c=f(e.c);if(k==='mir')[p0,p1]=[p1,p0];n.a0=ang(sub(p0,n.c));n.a1=ang(sub(p1,n.c));break}
 case'dim':if(e.c){n.c=f(e.c);n.p=f(e.p);break}n.a=f(e.a);n.b=f(e.b);n.p=f(e.p);if(k!=='mv')n.m='al';break
 case'text':{const d=pol([0,0],1,e.a||0),w=textWidth(e);if(k==='mir'){const m=f(add(e.p,mul(d,w/2)));n.p=sub(m,mul(d,w/2))}else{n.p=f(e.p);if(k==='rot')n.a=ang(sub(f(add(e.p,d)),n.p))}break}}
 return n}
const mvF=d=>p=>add(p,d),rotF=(c,t)=>p=>rotP(p,c,t);
const mirF=(a,b)=>p=>{const d=nrm(sub(b,a)),q=add(a,mul(d,dot(sub(p,a),d)));return sub(mul(q,2),p)};
function explode(e){if(e.t==='pline'||e.t==='slot')return prims(e).map(q=>q.a?mk('line',{a:q.a,b:q.b},e.ly):mk('arc',{c:q.c,r:q.r,a0:na(q.a0),a1:na(q.a1)},e.ly));return null}
const nearest=(es,p)=>es.reduce((b,e)=>(!b||dEnt(p,e)<dEnt(p,b))?e:b,null);
function rectE(a,b,real){const o={pts:[a,[b[0],a[1]],b,[a[0],b[1]]],closed:true,rect:true};return real?mk('pline',o):tmp('pline',o)}
function polyE(c,p,n,real){const r=dist(c,p),t0=ang(sub(p,c)),pts=[];for(let i=0;i<n;i++)pts.push(pol(c,r,t0+i*TAU/n));return real?mk('pline',{pts,closed:true}):tmp('pline',{pts,closed:true})}
function circ3(a,b,c){const d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(Math.abs(d)<1e-9)return null;const A=dot(a,a),B=dot(b,b),C=dot(c,c);return[(A*(b[1]-c[1])+B*(c[1]-a[1])+C*(a[1]-b[1]))/d,(A*(c[0]-b[0])+B*(a[0]-c[0])+C*(b[0]-a[0]))/d]}
function arc3(a,m,b,real){const c=circ3(a,m,b);if(!c)return null;const r=dist(c,a);let s=ang(sub(a,c)),e=ang(sub(b,c));if(!inArc(ang(sub(m,c)),s,e))[s,e]=[e,s];const o={c,r,a0:s,a1:e};return real?mk('arc',o):tmp('arc',o)}
function dimAuto(a,b,p){const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);
 const gx=p[0]<x0?x0-p[0]:p[0]>x1?p[0]-x1:0,gy=p[1]<y0?y0-p[1]:p[1]>y1?p[1]-y1:0;
 let m;if(gx===0&&gy===0)m=(x1-x0)>=(y1-y0)?'h':'v';else m=gy>=gx?'h':'v';return tmp('dim',{a,b,p,m,ly:dimLayer()})}

/* Stutzen */
function trimEnt(e,p){const pts=[];for(const f of geomEnts())if(f!==e&&f.t!=='text')pts.push(...iEE(e,f));
 const pieces=(ts,span)=>{ts=[...new Set(ts.map(t=>+t.toFixed(9)))].filter(t=>t>1e-6&&t<span-1e-6).sort((a,b)=>a-b);if(!ts.length)return null;return ts};
 if(e.t==='line'){const d=sub(e.b,e.a),L2=dot(d,d),ts=pieces(pts.map(q=>dot(sub(q,e.a),d)/L2),1);if(!ts)return null;const tp=dot(sub(p,e.a),d)/L2;let lo=0,hi=1;for(const t of ts){if(t<tp)lo=t;else{hi=t;break}}
  const o=[];if(lo>1e-6)o.push(mk('line',{a:e.a,b:add(e.a,mul(d,lo))},e.ly));if(hi<1-1e-6)o.push(mk('line',{a:add(e.a,mul(d,hi)),b:e.b},e.ly));return o}
 if(e.t==='circle'){const as=pieces(pts.map(q=>na(ang(sub(q,e.c)))),TAU+1);if(!as||as.length<2)return null;const ap=na(ang(sub(p,e.c)));let lo=as[as.length-1],hi=as[0];for(const a of as){if(a<ap)lo=a;else{hi=a;break}}
  return[mk('arc',{c:e.c,r:e.r,a0:hi,a1:lo},e.ly)]}
 if(e.t==='arc'){const sp=na(e.a1-e.a0),ts=pieces(pts.map(q=>na(ang(sub(q,e.c))-e.a0)),sp);if(!ts)return null;const tp=na(ang(sub(p,e.c))-e.a0);let lo=0,hi=sp;for(const t of ts){if(t<tp)lo=t;else{hi=t;break}}
  const o=[];if(lo>1e-6)o.push(mk('arc',{c:e.c,r:e.r,a0:e.a0,a1:e.a0+lo},e.ly));if(hi<sp-1e-6)o.push(mk('arc',{c:e.c,r:e.r,a0:e.a0+hi,a1:e.a1},e.ly));return o}
 return null}

/* Abrunden / Fasen zweier Linien */
function fillet(L1,p1,L2,p2,r,cham){const I=lineInt(L1.a,L1.b,L2.a,L2.b);if(!I)return'Die Linien sind parallel.';
 const side=(L,p)=>{const d=nrm(sub(L.b,L.a));return dot(sub(p,I),d)>=0?d:mul(d,-1)};
 const u1=side(L1,p1),u2=side(L2,p2),far=(L,u)=>dot(sub(L.a,I),u)>dot(sub(L.b,I),u)?L.a:L.b,f1=far(L1,u1),f2=far(L2,u2);
 if(r<=0)return{l1:[I,f1],l2:[I,f2]};
 if(cham){const T1=add(I,mul(u1,r)),T2=add(I,mul(u2,r));if(r>dist(I,f1)||r>dist(I,f2))return'Fase zu groß.';return{l1:[T1,f1],l2:[T2,f2],x:tmp('line',{a:T1,b:T2})}}
 const th=Math.acos(clamp(dot(u1,u2),-1,1))/2;if(th<1e-6)return'Kein Eckwinkel gefunden.';const d=r/Math.tan(th);
 if(d>dist(I,f1)+1e-9||d>dist(I,f2)+1e-9)return'Radius zu groß für diese Linien.';
 const T1=add(I,mul(u1,d)),T2=add(I,mul(u2,d)),C=add(I,mul(nrm(add(u1,u2)),r/Math.sin(th)));
 let a0=ang(sub(T1,C)),a1=ang(sub(T2,C));if(na(a1-a0)>Math.PI)[a0,a1]=[a1,a0];
 return{l1:[T1,f1],l2:[T2,f2],x:tmp('arc',{c:C,r,a0,a1})}}

/* Versatz */
function offsetEnt(e,d,p){const n=clone(e);delete n.id;
 if(e.t==='xline'){const nn=[-e.d[1],e.d[0]],s=Math.sign(dot(sub(p,e.p),nn))||1;n.p=add(e.p,mul(nn,d*s));return n}
 if(e.t==='line'){const v=sub(e.b,e.a),s=Math.sign(crs(v,sub(p,e.a)))||1,o=mul(nrm([-v[1],v[0]]),d*s);n.a=add(e.a,o);n.b=add(e.b,o);return n}
 if(e.t==='circle'||e.t==='arc'){const r=dist(p,e.c)>e.r?e.r+d:e.r-d;if(r<=1e-9)return null;n.r=r;return n}
 if(e.t==='slot'){const r=dSeg(p,e.a,e.b)>e.r?e.r+d:e.r-d;if(r<=1e-9)return null;n.r=r;return n}
 if(e.t==='pline'&&plineHasArcs(e)){if(!isClosed(e))return null;const P=ccw(toPaths(e)[0].pts),r=clOffset([P],inPoly(p,P)?-d:d);if(!r.length)return null;
  const best=r.reduce((a,b)=>Math.abs(area(b))>Math.abs(area(a))?b:a),ft=fitArcs(best,true);delete n.bl;delete n.rect;if(ft.circle){for(const k of['pts','closed'])delete n[k];n.t='circle';n.c=ft.circle.c;n.r=ft.circle.r;return n}n.pts=ft.pts;if(ft.bl)n.bl=ft.bl;n.closed=true;return n}
 if(e.t==='pline'){const ps=prims(e);let bi=0,bd=Infinity;ps.forEach((q,i)=>{const dd=dSeg(p,q.a,q.b);if(dd<bd){bd=dd;bi=i}});
  const s=Math.sign(crs(sub(ps[bi].b,ps[bi].a),sub(p,ps[bi].a)))||1;
  const off=ps.map(q=>{const v=sub(q.b,q.a),o=mul(nrm([-v[1],v[0]]),d*s);return{a:add(q.a,o),b:add(q.b,o)}});
  const m=off.length,pts=[];
  if(e.closed){for(let i=0;i<m;i++){const A=off[(i-1+m)%m],B=off[i];pts.push(lineInt(A.a,A.b,B.a,B.b)||B.a)}}
  else{pts.push(off[0].a);for(let i=1;i<m;i++){const A=off[i-1],B=off[i];pts.push(lineInt(A.a,A.b,B.a,B.b)||B.a)}pts.push(off[m-1].b)}
  n.pts=pts;return n}
 return null}

/* ---------- Undo ---------- */
const snapS=()=>JSON.stringify(S);
function updUndo(){const u=document.getElementById('bUndo'),r=document.getElementById('bRedo');if(u)u.disabled=!undoS.length;if(r)r.disabled=!redoS.length}
function pushUndo(){undoS.push(snapS());if(undoS.length>200)undoS.shift();redoS=[];updUndo()}
function dropUndo(){S=JSON.parse(undoS.pop());updUndo()}
function doCommit(fn){pushUndo();fn();afterChange()}
function undo(){if(G)cancel(true);if(!undoS.length){log('Nichts rückgängig zu machen.');return}redoS.push(snapS());S=JSON.parse(undoS.pop());sel.clear();log('Rückgängig.');afterChange()}
function redo(){if(!redoS.length){log('Nichts zu wiederholen.');return}undoS.push(snapS());S=JSON.parse(redoS.pop());sel.clear();afterChange()}

/* ---------- Befehle ---------- */
const STR=prompt=>({k:'str',prompt}),P=(prompt,o={})=>({k:'pt',prompt,...o}),N=(prompt,def)=>({k:'num',prompt:prompt+(def!=null?` <${fmt(def)}>`:''),def}),PK=prompt=>({k:'pick',prompt}),OP=(prompt,opts,def)=>({k:'opt',prompt,opts,def});
function* needSel(){let es=[...sel].map(byId).filter(Boolean);if(!es.length)es=yield{k:'sel',prompt:'Objekte wählen (Klick oder Rahmen), dann Enter'};sel.clear();return es||[]}
const CMDS={
 L:{n:'Linie',g:'Z',i:'M4 20L20 4',*run(){const r0=yield P('Startpunkt');if(!r0.p)return;let p0=r0.p;const first=p0;let c=0;
  for(;;){const r=yield P(c>1?'Nächster Punkt  [S]chließen · Enter = fertig':'Nächster Punkt · Enter = fertig',{base:p0,opts:c>1?['S']:[],prev:p=>[tmp('line',{a:p0,b:p})]});
   if(!r.p&&r.opt!=='S')return;const q=r.opt==='S'?first:r.p;const a=p0;doCommit(()=>S.ents.push(mk('line',{a,b:q})));if(r.opt==='S')return;p0=q;c++}}},
 PL:{n:'Polylinie',g:'Z',i:'M3 18L9 8l6 6 6-10',*run(){const r0=yield P('Startpunkt');if(!r0.p)return;const pts=[r0.p];
  for(;;){const last=pts[pts.length-1];const r=yield P('Nächster Punkt  [S]chließen  [Z]urück · Enter = fertig',{base:last,opts:['S','Z'],prev:p=>[tmp('pline',{pts:[...pts,p],closed:false})]});
   if(r.opt==='Z'){if(pts.length>1)pts.pop();continue}
   if(!r.p){if(pts.length>1)doCommit(()=>S.ents.push(mk('pline',{pts,closed:r.opt==='S'&&pts.length>2})));return}
   pts.push(r.p)}}},
 R:{n:'Rechteck',g:'Z',i:'M4 6h16v12H4z',*run(){const r0=yield P('Erste Ecke');if(!r0.p)return;const a=r0.p;const r=yield P('Gegenecke oder @Breite,Höhe',{base:a,prev:p=>[rectE(a,p)]});if(!r.p||r.p[0]===a[0]||r.p[1]===a[1])return;doCommit(()=>S.ents.push(rectE(a,r.p,true)))}},
 K:{n:'Kreis',g:'Z',i:'M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0',*run(){const r0=yield P('Mittelpunkt');if(!r0.p)return;const c=r0.p;
  const r=yield P('Radius (Zahl oder Punkt)  [D]urchmesser',{base:c,num:true,opts:['D'],prev:p=>[tmp('circle',{c,r:Math.max(dist(c,p),1e-6)})]});
  let rad=null;if(r.opt==='D'){const d=yield N('Durchmesser',mem.dia);if(d==null)return;mem.dia=d;rad=d/2}else if(r.n!=null)rad=r.n;else if(r.p)rad=dist(c,r.p);
  if(rad>0)doCommit(()=>S.ents.push(mk('circle',{c,r:rad})))}},
 B:{n:'Bogen (3 Punkte)',g:'Z',i:'M4 18A9 9 0 0 1 20 18',*run(){const a=(yield P('Startpunkt')).p;if(!a)return;const m=(yield P('Punkt auf dem Bogen',{base:a,prev:p=>[tmp('line',{a,b:p})]})).p;if(!m)return;
  const r=yield P('Endpunkt',{base:m,prev:p=>{const e=arc3(a,m,p);return e?[e]:[]}});if(!r.p)return;const e=arc3(a,m,r.p,true);if(e)doCommit(()=>S.ents.push(e))}},
 PG:{less:1,n:'Polygon',g:'Z',i:'M12 3l8 5v8l-8 5-8-5V8z',*run(){const n=yield N('Anzahl Ecken',mem.pg);if(!n||n<3)return;const k=mem.pg=Math.round(n);const c=(yield P('Mittelpunkt')).p;if(!c)return;
  const r=yield P('Eckpunkt oder Radius (Zahl)',{base:c,num:true,prev:p=>[polyE(c,p,k)]});const p=r.n!=null?add(c,[r.n,0]):r.p;if(!p||dist(p,c)<1e-9)return;doCommit(()=>S.ents.push(polyE(c,p,k,true)))}},
 LL:{n:'Langloch',g:'Z',i:'M8 8h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z',*run(){const a=(yield P('Erster Mittelpunkt')).p;if(!a)return;const b=(yield P('Zweiter Mittelpunkt',{base:a,prev:p=>[tmp('line',{a,b:p})]})).p;if(!b||dist(a,b)<1e-9)return;
  const r=yield P('Breite (Zahl) oder Punkt auf dem Rand',{base:b,num:true,prev:p=>[tmp('slot',{a,b,r:Math.max(dSeg(p,a,b),.01)})]});const rad=r.n!=null?r.n/2:(r.p?dSeg(r.p,a,b):0);if(rad>0)doCommit(()=>S.ents.push(mk('slot',{a,b,r:rad})))}},
 BB:{n:'Bohrbild',g:'Z',i:'M3 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M3 18h18',*run(){
  const k=yield OP(`Art: [L]ochreihe 32 · [T]opfband 35 · [D]übelbild · [K] Lochkreis <${mem.bb}>`,['L','T','D','K'],mem.bb);if(!k)return;mem.bb=k;
  const hole=(c,d,t)=>mk('circle',{c,r:d/2,ct:'pocket',cd:t,...holeTool(d)});
  if(k==='K'){const n=yield N('Anzahl Löcher',mem.lkN);if(!n||n<2)return;mem.lkN=Math.round(n);const d=yield N('Loch-Ø',mem.lkD);if(!d||d<=0)return;mem.lkD=d;const t=yield N('Tiefe',mem.lkT);if(t==null||t<=0)return;mem.lkT=t;
   const c=(yield P('Mittelpunkt des Lochkreises')).p;if(!c)return;
   const pts=(p,R)=>{const r0=R!=null?R:dist(c,p),t0=R!=null?Math.PI/2:ang(sub(p,c)),o=[];for(let i=0;i<mem.lkN;i++)o.push(pol(c,r0,t0+i*TAU/mem.lkN));return o};
   const r=yield P('Lochkreis-Radius (Zahl) oder Punkt fürs erste Loch',{base:c,num:true,prev:p=>pts(p).map(q=>tmp('circle',{c:q,r:d/2}))});const L=r.n!=null?pts(null,r.n):r.p?pts(r.p):null;if(!L||dist(L[0],c)<1e-9)return;
   doCommit(()=>L.forEach(q=>S.ents.push(hole(q,d,t))));log(`${L.length} Löcher Ø${fmtDE(d)} auf Lochkreis Ø${fmtDE(dist(L[0],c)*2)}.`,'ok');return}
  if(k==='T'){const d=yield N('Topf-Ø',mem.cupD);if(!d||d<=0)return;mem.cupD=d;const t=yield N('Bohrtiefe',mem.cupT);if(t==null||t<=0)return;mem.cupT=t;
   const pat=yield OP(`Dübellöcher des Beschlags: [O]hne · [B]lum 45/9,5 · [H]ettich/Salice 48/6 · [G]rass 42/11 <${mem.cupP}>`,['O','B','H','G'],mem.cupP);if(!pat)return;mem.cupP=pat;
   let dir=null;if(pat!=='O'){const k=yield OP(`Türkante liegt vom Topf aus: [L]inks · [R]echts · [O]ben · [U]nten <${mem.cupK}>`,['L','R','O','U'],mem.cupK);if(!k)return;mem.cupK=k;dir={L:[1,0],R:[-1,0],O:[0,-1],U:[0,1]}[k]}
   const PAT={B:[45,9.5],H:[48,6],G:[42,11]}[pat];
   const set=p=>{const o=[{c:p,r:d/2}];if(PAT){const n=[-dir[1],dir[0]];for(const s of[1,-1])o.push({c:add(add(p,mul(dir,PAT[1])),mul(n,s*PAT[0]/2)),r:4,dw:true})}return o};
   const ref=(yield P('Bezugspunkt anklicken (z. B. Ecke der Tür) · Enter = ohne')).p;
   if(ref)log('Tipp: Topfmitte relativ eingeben, z. B. @21.5,100 (21,5 mm von der Kante, 100 mm hoch).');
   for(;;){const r=yield P('Topfmitte · Enter = fertig',{base:ref||undefined,prev:p=>set(p).map(h=>tmp('circle',h))});if(!r.p)return;const q=r.p;doCommit(()=>set(q).forEach(h=>S.ents.push(h.dw?hole(h.c,8,Math.min(t,11)):hole(h.c,d,t))))}}
  const D=k==='L'?{d:'rowD',n:'rowN',s:'rowS',t:'rowT',name:'Lochreihe'}:{d:'dwD',n:'dwN',s:'dwS',t:'dwT',name:'Dübelbild'};
  const d=yield N('Loch-Ø',mem[D.d]);if(!d||d<=0)return;mem[D.d]=d;const n=yield N('Anzahl Löcher',mem[D.n]);if(!n||n<1)return;mem[D.n]=Math.round(n);
  let sp=0;if(mem[D.n]>1){sp=yield N('Lochabstand',mem[D.s]);if(!sp||sp<=0)return;mem[D.s]=sp}const t=yield N('Tiefe',mem[D.t]);if(t==null||t<=0)return;mem[D.t]=t;
  const ref=(yield P('Bezugspunkt anklicken (z. B. Ecke) · Enter = ohne')).p;
  const a=(yield P('Erstes Loch'+(ref?' (z. B. @37,9.5 vom Bezugspunkt)':''),{base:ref||undefined,prev:p=>[tmp('circle',{c:p,r:d/2})]})).p;if(!a)return;
  const row=dir=>{const u=nrm(dir),o=[];for(let i=0;i<mem[D.n];i++)o.push(add(a,mul(u,i*sp)));return o};
  let L;if(mem[D.n]>1){const r=yield P('Richtung: Punkt anklicken oder Winkel (0 = rechts, 90 = oben)',{base:a,num:true,prev:p=>dist(p,a)<1e-9?[]:row(sub(p,a)).map(q=>tmp('circle',{c:q,r:d/2}))});
   if(r.n!=null)L=row(pol([0,0],1,r.n*D2R));else if(r.p&&dist(r.p,a)>1e-9)L=row(sub(r.p,a));else return}else L=[a];
  doCommit(()=>L.forEach(q=>S.ents.push(hole(q,d,t))));log(`${D.name}: ${L.length} × Ø${fmtDE(d)}${L.length>1?', Abstand '+fmtDE(sp):''}, Tiefe ${fmtDE(t)}.`,'ok')}},
 TX:{n:'Text / Gravur',g:'Z',i:'M5 7V4h14v3M12 4v16M9 20h6',*run(){const s=yield STR('Text eingeben');if(!s)return;const h=yield N('Schrifthöhe (Großbuchstaben)',mem.th);if(!h||h<=0)return;mem.th=h;
  const r=yield P('Einfügepunkt (unten links)',{prev:p=>[tmp('text',{p,s,h,a:0})]});if(!r.p)return;const q=r.p;
  doCommit(()=>S.ents.push(mk('text',{p:q,s,h,a:0,ct:'online',cd:mem.td})));log('Text als Gravur (auf Linie, '+fmtDE(mem.td)+' mm tief). Ändern rechts unter „Fräsen“.')}},
 HL:{n:'Hilfslinie (unendlich)',g:'Z',i:'M2 19L22 5M9 14.1a1.5 1.5 0 1 0 .01 0',*run(){const ly=lyr('Hilfslinien')?'Hilfslinien':S.cur;
  const r0=yield P('Punkt, durch den die Hilfslinie geht  [W]aagrecht · [S]enkrecht',{opts:['W','S']});
  if(r0.opt){const d=r0.opt==='W'?[1,0]:[0,1];for(;;){const r=yield P((r0.opt==='W'?'Waagrechte':'Senkrechte')+' Hilfslinie durch Punkt · Enter = fertig',{prev:p=>[tmp('xline',{p,d,ly})]});if(!r.p)return;const q=r.p;doCommit(()=>S.ents.push(mk('xline',{p:q,d},ly)))}}
  if(!r0.p)return;const a=r0.p;
  for(;;){const r=yield P('Richtung: zweiter Punkt oder Winkel (0 = waagrecht, 90 = senkrecht) · Enter = fertig',{base:a,num:true,prev:p=>dist(p,a)<1e-9?[]:[tmp('xline',{p:a,d:nrm(sub(p,a)),ly})]});
   let d=null;if(r.n!=null)d=pol([0,0],1,r.n*D2R);else if(r.p&&dist(r.p,a)>1e-9)d=nrm(sub(r.p,a));else return;doCommit(()=>S.ents.push(mk('xline',{p:a,d},ly)))}}},
 V:{n:'Verschieben',g:'A',i:'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',*run(){const es=yield* needSel();if(!es.length)return;const b=(yield P('Basispunkt')).p;if(!b)return;
  const r=yield P('Zielpunkt',{base:b,prev:p=>es.map(e=>xf(e,mvF(sub(p,b))))});if(!r.p)return;const d=sub(r.p,b);doCommit(()=>es.forEach(e=>Object.assign(e,xf(e,mvF(d)))))}},
 KO:{n:'Kopieren',g:'A',i:'M4 4h11v11H4zM9 9h11v11H9z',*run(){const es=yield* needSel();if(!es.length)return;const b=(yield P('Basispunkt')).p;if(!b)return;
  for(;;){const r=yield P('Zielpunkt · Enter = fertig',{base:b,prev:p=>es.map(e=>xf(e,mvF(sub(p,b))))});if(!r.p)return;const d=sub(r.p,b);doCommit(()=>es.forEach(e=>S.ents.push(realize(xf(e,mvF(d)),e.ly))))}}},
 D:{n:'Drehen',g:'A',i:'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',*run(){const es=yield* needSel();if(!es.length)return;const b=(yield P('Drehpunkt')).p;if(!b)return;
  const r=yield P('Winkel in Grad (Zahl) oder Punkt',{base:b,num:true,prev:p=>es.map(e=>xf(e,rotF(b,ang(sub(p,b))),'rot'))});const t=r.n!=null?r.n*D2R:(r.p?ang(sub(r.p,b)):null);if(t==null)return;
  doCommit(()=>es.forEach(e=>Object.assign(e,xf(e,rotF(b,t),'rot'))))}},
 SK:{n:'Skalieren',g:'A',i:'M4 20h7v-7H4zM4 20L20 4M13 4h7v7',*run(){const es=yield* needSel();if(!es.length)return;const b=(yield P('Basispunkt (bleibt stehen)')).p;if(!b)return;
  const k=yield N('Faktor (2 = doppelt, 0.5 = halb, 25.4 = Zoll → mm)',mem.sk);if(!k||k<=0)return;mem.sk=k;doCommit(()=>es.forEach(e=>{Object.assign(e,scaleEnt(e,b,k))}));es.forEach(e=>sel.add(e.id));updProps();render()}},
 SP:{n:'Spiegeln',g:'A',i:'M12 3v18M9 7L4 17h5zM15 7l5 10h-5z',*run(){const es=yield* needSel();if(!es.length)return;const a=(yield P('Erster Punkt der Spiegelachse')).p;if(!a)return;
  const r=yield P('Zweiter Punkt der Spiegelachse',{base:a,prev:p=>dist(p,a)<1e-9?[]:[tmp('line',{a,b:p}),...es.map(e=>xf(e,mirF(a,p),'mir'))]});if(!r.p||dist(r.p,a)<1e-9)return;const b=r.p;
  const o=yield OP('Original löschen?  [J]a / [N]ein <N>',['J','N'],'N');if(!o)return;
  doCommit(()=>es.forEach(e=>{if(o==='J')Object.assign(e,xf(e,mirF(a,b),'mir'));else S.ents.push(realize(xf(e,mirF(a,b),'mir'),e.ly))}))}},
 VS:{n:'Versatz (Parallele)',g:'A',i:'M4 17L17 4M8 20L20 8',*run(){const d=yield N('Abstand',mem.off);if(!d||d<=0)return;mem.off=d;
  for(;;){const r=yield PK('Objekt wählen · Enter = fertig');if(!r.e)return;const e=r.e;if(e.t==='dim'){log('Bemaßung geht nicht.','e');continue}
   const s=yield P('Seite anklicken',{prev:p=>{const o=offsetEnt(e,d,p);return o?[o]:[]}});if(!s.p)return;const o=offsetEnt(e,d,s.p);if(o)doCommit(()=>S.ents.push(realize(o,e.ly)));else log('Versatz geht hier nicht (Radius zu klein).','e')}}},
 AR:{n:'Abrunden',g:'A',i:'M4 20v-8a8 8 0 0 1 8-8h8',*run(){const r=yield N('Radius',mem.rad);if(r==null||r<0)return;mem.rad=r;const a=yield PK('Erste Linie');if(!a.e)return;hlE=a.e;const b=yield PK('Zweite Linie');hlE=null;if(!b.e)return;doFillet(a,b,r,false)}},
 FA:{less:1,n:'Fasen',g:'A',i:'M4 20v-9l7-7h9',*run(){const r=yield N('Fasenlänge',mem.cha);if(r==null||r<0)return;mem.cha=r;const a=yield PK('Erste Linie');if(!a.e)return;hlE=a.e;const b=yield PK('Zweite Linie');hlE=null;if(!b.e)return;doFillet(a,b,r,true)}},
 ST:{n:'Stutzen',g:'A',i:'M3 12h7M14 12h7M12 3v4M12 17v4M8 8l8 8',*run(){for(;;){const r=yield PK('Teilstück zum Wegschneiden anklicken · Enter = fertig');if(!r.e)return;const e=r.e;if(e.t==='dim')continue;
  pushUndo();let t=e;const ex=explode(e);if(ex){replace(e,ex);t=nearest(ex,r.p)}const res=trimEnt(t,r.p);if(!res){dropUndo();log('Keine Schnittkante gefunden.','e');render();continue}replace(t,res);afterChange()}}},
 RK:{less:1,n:'Reihe kopieren',g:'A',i:'M3 9h5v6H3zM10 9h5v6h-5zM17 9h4v6h-4z',*run(){const es=yield* needSel();if(!es.length)return;const c=yield N('Anzahl Spalten (X)',mem.cols);if(!c||c<1)return;const rw=yield N('Anzahl Zeilen (Y)',mem.rows);if(!rw||rw<1)return;
  mem.cols=Math.round(c);mem.rows=Math.round(rw);let dx=0,dy=0;if(mem.cols>1){dx=yield N('Abstand Spalten (X)',mem.dx);if(dx==null)return;mem.dx=dx}if(mem.rows>1){dy=yield N('Abstand Zeilen (Y)',mem.dy);if(dy==null)return;mem.dy=dy}
  doCommit(()=>{for(let i=0;i<mem.cols;i++)for(let j=0;j<mem.rows;j++){if(!i&&!j)continue;es.forEach(e=>S.ents.push(realize(xf(e,mvF([i*dx,j*dy])),e.ly)))}})}},
 ZL:{less:1,n:'Zerlegen',g:'A',i:'M4 4h6v6H4zM14 14h6v6h-6zM14 4l6 6M4 14l6 6',*run(){const es=yield* needSel();let k=0;doCommit(()=>es.forEach(e=>{const x=explode(e);if(x){replace(e,x);k++}}));log(k+' Objekt(e) zerlegt.')}},
 E:{n:'Löschen',g:'A',i:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',*run(){const es=yield* needSel();if(!es.length)return;doCommit(()=>{S.ents=S.ents.filter(e=>!es.includes(e))});log(es.length+' gelöscht.')}},
 BM:{n:'Bemaßung',g:'M',i:'M4 8v10M20 8v10M4 13h16M7 10l-3 3 3 3M17 10l3 3-3 3',*run(){const a=(yield P('Erster Punkt')).p;if(!a)return;const b=(yield P('Zweiter Punkt',{base:a,prev:p=>[tmp('line',{a,b:p})]})).p;if(!b)return;
  const r=yield P('Lage der Maßlinie',{prev:p=>[dimAuto(a,b,p)]});if(!r.p)return;doCommit(()=>S.ents.push(realize(dimAuto(a,b,r.p),dimLayer())))}},
 BA:{less:1,n:'Bemaßung ausgerichtet',g:'M',i:'M6 18L18 6M3 15l6 6M15 3l6 6',*run(){const a=(yield P('Erster Punkt')).p;if(!a)return;const b=(yield P('Zweiter Punkt',{base:a,prev:p=>[tmp('line',{a,b:p})]})).p;if(!b||dist(a,b)<1e-9)return;
  const r=yield P('Lage der Maßlinie',{prev:p=>[tmp('dim',{a,b,p,m:'al',ly:dimLayer()})]});if(!r.p)return;doCommit(()=>S.ents.push(mk('dim',{a,b,p:r.p,m:'al'},dimLayer())))}},
 BK:{n:'Kettenmaß',g:'M',i:'M3 8v9M10 8v9M21 8v9M3 13h18M6 11l-3 2 3 2M18 11l3 2-3 2',*run(){const a=(yield P('Erster Punkt')).p;if(!a)return;const b=(yield P('Zweiter Punkt',{base:a,prev:p=>[tmp('line',{a,b:p})]})).p;if(!b)return;
  const r=yield P('Lage der Maßlinie',{prev:p=>[dimAuto(a,b,p)]});if(!r.p)return;const d0=dimAuto(a,b,r.p),m=d0.m,pl=r.p;doCommit(()=>S.ents.push(realize(d0,dimLayer())));let last=b;
  for(;;){const q=yield P('Nächster Punkt der Kette · Enter = fertig',{base:last,prev:p=>[tmp('dim',{a:last,b:p,p:pl,m,ly:dimLayer()})]});if(!q.p)return;const l0=last,n=q.p;doCommit(()=>S.ents.push(mk('dim',{a:l0,b:n,p:pl,m},dimLayer())));last=n}}},
 BR:{n:'Radius / Durchmesser bemaßen',g:'M',i:'M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0M12 12l6-5M15 6l3 1-1 3',*run(){const r=yield PK('Kreis oder Bogen anklicken');if(!r.e)return;
  const q=prims(r.e).filter(x=>x.c).reduce((b,x)=>(!b||dPrim(r.p,x)<dPrim(r.p,b))?x:b,null);if(!q){log('Das ist kein Kreis oder Bogen.','e');return}
  let m=isFull(q)?'dia':'rad';for(;;){const s=yield P(`Lage des Maßes  ${m==='dia'?'[R]adius statt Durchmesser':'[D]urchmesser statt Radius'}`,{opts:['R','D'],prev:p=>[tmp('dim',{c:q.c,r:q.r,p,m,ly:dimLayer()})]});
   if(s.opt){m=s.opt==='D'?'dia':'rad';continue}if(!s.p)return;const p=s.p;doCommit(()=>S.ents.push(mk('dim',{c:[...q.c],r:q.r,p,m},dimLayer())));return}}},
 MS:{less:1,n:'Abstand messen',g:'M',i:'M3 8h18v8H3zM7 8v3M11 8v4M15 8v3',*run(){const a=(yield P('Erster Punkt')).p;if(!a)return;const r=yield P('Zweiter Punkt',{base:a,prev:p=>[tmp('line',{a,b:p})]});if(!r.p)return;const d=sub(r.p,a);
  log(`Abstand ${fmtDE(len(d))} mm · ΔX ${fmtDE(d[0])} · ΔY ${fmtDE(d[1])} · Winkel ${fmtDE(deg(ang(d)))}°`,'ok')}},
 VB:{n:'Verbinden (zur Kontur)',g:'F',i:'M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1M14 10a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1',*run(){const es=yield* needSel();if(!es.length)return;
  const r=joinEnts(es);if(!r.made.length){log('Nichts zu verbinden – die Enden treffen sich nicht (Abstand > 0,05 mm).','e');return}
  doCommit(()=>{S.ents=S.ents.filter(e=>!r.used.has(e));S.ents.push(...r.made)});r.made.forEach(e=>sel.add(e.id));updProps();
  const c=r.made.filter(e=>e.closed).length;log(`${r.made.length} Kontur(en) aus ${r.used.size} Teilen${c?`, davon ${c} geschlossen`:''}.`+(r.made.length>c?' Offen bleibt, wo Enden nicht aufeinandertreffen.':''),'ok')}},
 VE:{n:'Vereinigen',g:'F',i:'M4 4h10v6h6v10H10v-6H4z',*run(){yield* boolRun('ctUnion')}},
 AB:{n:'Abziehen',g:'F',i:'M4 4h16v8h-8v8H4zM15 15h5v5h-5z',*run(){yield* boolRun('ctDifference')}},
 SM:{less:1,n:'Schnittmenge',g:'F',i:'M9 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14M15 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14',*run(){yield* boolRun('ctIntersection')}},
 VO:{n:'Vorlage einfügen',g:'F',i:'M5 4h10l4 4v12H5zM15 4v4h4M9 13h6M12 10v6',now:()=>openTpls()},
 EX:{less:1,n:'SVG für Origin ausgeben',g:'F',i:'M12 4v11M8 11l4 4 4-4M5 19h14',now:()=>openExport()},
 DD:{less:1,n:'3D-Ansicht',g:'F',i:'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9',now:()=>open3D()},
 PR:{n:'Drucken / PDF',now:()=>printDrawing()},
 ZA:{n:'Zoom alles',now:()=>zoomAll()},
};
const ALIAS={KETTENMASS:'BK',KETTE:'BK',RADIUS:'BR',DURCHMESSER:'BR',DRUCKEN:'PR','3D':'DD',ANSICHT3D:'DD',HILFSLINIE:'HL',XL:'HL',XLINE:'HL',SKALIEREN:'SK',SC:'SK',VORLAGE:'VO',EXPORT:'EX',SVG:'EX',VERBINDEN:'VB',VEREINIGEN:'VE',ABZIEHEN:'AB',SCHNITTMENGE:'SM',BOHRBILD:'BB',BOHREN:'BB',TEXT:'TX',GRAVUR:'TX',JOIN:'VB',UNION:'VE',SUBTRACT:'AB',
 LINIE:'L',POLYLINIE:'PL',RECHTECK:'R',KREIS:'K',BOGEN:'B',POLYGON:'PG',LANGLOCH:'LL',VERSCHIEBEN:'V',KOPIEREN:'KO',DREHEN:'D',SPIEGELN:'SP',VERSATZ:'VS',ABRUNDEN:'AR',FASEN:'FA',STUTZEN:'ST',REIHE:'RK',ZERLEGEN:'ZL',LÖSCHEN:'E',ENTF:'E',BEMASSUNG:'BM',BEMAßUNG:'BM',MESSEN:'MS',ZOOM:'ZA',
 C:'K',A:'B',M:'V',CO:'KO',RO:'D',MI:'SP',O:'VS',F:'AR',CHA:'FA',TR:'ST',X:'ZL',DI:'MS'};
/* Strg + Buchstabe (auf dem Mac/iPad: ⌘). Strg+T, N, W, Q gehören dem Browser und gehen nicht. */
const CTRL={L:'L',P:'PL',R:'R',K:'K',B:'B',G:'TX',H:'BB',V:'V',C:'KO',D:'D',I:'SP',U:'AR',F:'FA',X:'ST',M:'BM',J:'VB',E:'EX'};
const CTRL_OF=Object.fromEntries(Object.entries(CTRL).map(([k,v])=>[v,k]));
const keyLabel=k=>CTRL_OF[k]?'Strg+'+CTRL_OF[k]:k;
const alias=t=>{const u=t.toUpperCase();return CMDS[u]?u:ALIAS[u]||null};
let hlE=null;
const holeTool=d=>S.def.tool<d-1e-9?{}:{tool:Math.min(3,+(d*0.6).toFixed(1))};
/* lose Linien/Bögen/offene Polylinien zu Polylinien verketten */
function joinEnts(es,tol=0.05){const pc=[];
 for(const e of es){if(e.t==='line')pc.push({e,pts:[e.a,e.b],bl:[0]});
  else if(e.t==='arc'){const sw=na(e.a1-e.a0)||TAU;if(sw>=TAU-1e-9)continue;pc.push({e,pts:[pol(e.c,e.r,e.a0),pol(e.c,e.r,e.a1)],bl:[Math.tan(sw/4)]})}
  else if(e.t==='pline'&&!isClosed(e)){const n=e.pts.length-1;pc.push({e,pts:e.pts.map(p=>[...p]),bl:Array.from({length:n},(_,i)=>(e.bl&&e.bl[i])||0)})}}
 const rev=c=>({e:c.e,pts:[...c.pts].reverse(),bl:[...c.bl].reverse().map(v=>-v)});
 const used=new Set(),made=[],left=[...pc];
 while(left.length){let ch=left.shift(),parts=[ch.e],grew=true;ch={pts:[...ch.pts],bl:[...ch.bl]};
  while(grew){grew=false;const s0=ch.pts[0],s1=ch.pts[ch.pts.length-1];if(ch.pts.length>2&&dist(s0,s1)<tol)break;
   for(let i=0;i<left.length;i++){const c=left[i],c0=c.pts[0],c1=c.pts[c.pts.length-1];let add=null,front=false;
    if(dist(s1,c0)<tol)add=c;else if(dist(s1,c1)<tol)add=rev(c);else if(dist(s0,c1)<tol){add=c;front=true}else if(dist(s0,c0)<tol){add=rev(c);front=true}
    if(!add)continue;left.splice(i,1);parts.push(c.e);
    if(front){ch.pts=[...add.pts.slice(0,-1),...ch.pts];ch.bl=[...add.bl,...ch.bl]}else{ch.pts=[...ch.pts,...add.pts.slice(1)];ch.bl=[...ch.bl,...add.bl]}grew=true;break}}
  let closed=false;if(ch.pts.length>2&&dist(ch.pts[0],ch.pts[ch.pts.length-1])<tol){ch.pts.pop();closed=true}
  if(parts.length<2&&!closed)continue;
  const o={pts:ch.pts,closed};if(ch.bl.some(hasB))o.bl=ch.bl;const f=parts[0];const n=mk('pline',o,f.ly);for(const k of['ct','cd','tool'])if(f[k]!=null)n[k]=f[k];
  made.push(n);parts.forEach(x=>used.add(x))}
 return{used,made}}
/* Formen kombinieren */
function* boolRun(type){const ok=e=>isClosed(e);const name={ctUnion:'Vereinigen',ctDifference:'Abziehen',ctIntersection:'Schnittmenge'}[type];
 let A=yield* needSel();const skipped=A.filter(e=>!ok(e)).length;A=A.filter(ok);if(skipped)log(skipped+' offene Objekt(e) übersprungen – erst Verbinden (VB).','e');
 let B=[];if(type==='ctDifference'){if(!A.length){log('Erst die Grundform wählen (geschlossene Kontur).','e');return}A.forEach(e=>hlSet.add(e.id));
  B=((yield{k:'sel',prompt:'Formen zum Abziehen wählen, dann Enter'})||[]).filter(e=>ok(e)&&!A.includes(e));hlSet.clear();sel.clear();if(!B.length){log('Nichts zum Abziehen gewählt.','e');return}}
 else if(A.length<2){log(name+' braucht mindestens 2 geschlossene Konturen.','e');return}
 const poly=e=>ccw(toPaths(e)[0].pts);let res;
 if(type==='ctDifference')res=clBool(type,A.map(poly),B.map(poly));else if(type==='ctUnion')res=clBool(type,A.map(poly),[]);
 else{res=[poly(A[0])];for(const e of A.slice(1))res=clBool(type,res,[poly(e)])}
 res=res.filter(q=>Math.abs(area(q))>1e-4);
 const f=A[0],made=res.map(q=>{const n=polyEnt(area(q)<0?[...q].reverse():q,f.ly);if(f.ct&&area(q)>0)n.ct=f.ct;for(const k of['cd','tool'])if(f[k]!=null)n[k]=f[k];return n});
 doCommit(()=>{S.ents=S.ents.filter(e=>!A.includes(e)&&!B.includes(e));S.ents.push(...made)});made.forEach(e=>sel.add(e.id));updProps();
 log(made.length?`${name}: ${made.length} Kontur(en) entstanden.`:`${name}: Ergebnis ist leer – die Formen überlappen nicht.`,made.length?'ok':'e')}
const hlSet=new Set();
function doFillet(A,B,r,ch){const ok=e=>e.t==='line'||e.t==='pline';if(!ok(A.e)||!ok(B.e)){log('Geht nur mit Linien, Polylinien und Rechtecken.','e');return}
 pushUndo();let L1=A.e,L2=B.e;const pieces=[],src=[];
 const ex=(e,p,not)=>{const ls=explode(e);replace(e,ls);pieces.push(...ls);src.push(e);const cand=ls.filter(l=>l.t==='line'&&l!==not);return cand.length?nearest(cand,p):null};
 if(L1.t==='pline'){const same=B.e===A.e;L1=ex(L1,A.p);if(same)L2=L1?nearest(pieces.filter(l=>l.t==='line'&&l!==L1),B.p):null}
 if(L2&&L2.t==='pline')L2=ex(L2,B.p,L1);
 if(!L1||!L2||L1===L2){dropUndo();log('Zwei verschiedene gerade Stücke wählen.','e');return}
 const res=fillet(L1,A.p,L2,B.p,r,ch);if(typeof res==='string'){dropUndo();log(res,'e');return}
 L1.a=res.l1[0];L1.b=res.l1[1];L2.a=res.l2[0];L2.b=res.l2[1];let x=null;if(res.x){x=realize(res.x,L1.ly);S.ents.push(x)}
 if(src.length){/* zerlegte Polylinie wieder zusammensetzen, Fräs-Angaben behalten */
  const all=[...new Set([...pieces,L1,L2,...(x?[x]:[])])].filter(e=>S.ents.includes(e)&&!(e.t==='line'&&dist(e.a,e.b)<1e-9));S.ents=S.ents.filter(e=>!(pieces.includes(e)&&e.t==='line'&&dist(e.a,e.b)<1e-9));
  const j=joinEnts(all,1e-6);if(j.made.length){S.ents=S.ents.filter(e=>!j.used.has(e));for(const n of j.made){for(const k of['ct','cd','tool'])if(src[0][k]!=null)n[k]=src[0][k];n.ly=src[0].ly;S.ents.push(n)}}}
 afterChange()}

/* ---------- Ablauf ---------- */
let G=null,REQ=null,lastCmd=null,curCmd=null;
/* Zeichenbefehle bleiben aktiv: nach dem Fertigstellen geht es gleich mit dem nächsten Objekt weiter, bis Esc */
const REPEAT=new Set(['L','PL','R','K','B','PG','LL','BM','BA','BR','MS']);let gotPt=false,again=false;
function run(key,rep){const c=CMDS[key];if(!c)return;if(c.now){c.now();return}if(!rep)cancel(true);lastCmd=curCmd=key;again=!!rep;gotPt=false;if(!rep)log('» '+c.n,'ok');G=c.run();adv(undefined)}
function adv(v){if(!G)return;if(v&&(v.p||v.e))gotPt=true;let r;try{r=G.next(v)}catch(err){console.error(err);log('Fehler: '+err.message,'e');r={done:true}}
 if(r.done){const k=curCmd;G=null;REQ=null;curCmd=null;hlE=null;hlSet.clear();if(k&&REPEAT.has(k)&&gotPt){run(k,true);return}}else{REQ=r.value;if(['num','opt','str'].includes(REQ.k))inp.focus()}updPrompt();updTools();computeSnap();render()}
function cancel(silent){hlSet.clear();if(G){try{G.return()}catch(e){}G=null;REQ=null;curCmd=null;hlE=null;if(!silent)log('*Abbruch*')}else if(!silent){sel.clear();updProps()}updPrompt();updTools();render()}

/* ---------- UI-Elemente ---------- */
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d'),inp=$('inp'),hist=$('hist');
function log(t,c=''){const d=document.createElement('div');d.textContent=t;if(c)d.className=c;hist.appendChild(d);while(hist.children.length>80)hist.firstChild.remove();hist.scrollTop=hist.scrollHeight}
function updPrompt(){$('prompt').textContent=REQ?REQ.prompt+(again&&!gotPt?' · Esc = Befehl beenden':'')+':':'Befehl:'}
const ICON=d=>`<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
function buildTools(){const grp={Z:'Zeichnen',A:'Ändern',M:'Maße',F:'Fräsen'};let h='',last='';const mZ=[],mA=[],mF=[];
 for(const[k,c]of Object.entries(CMDS)){if(!c.g)continue;if(c.g!==last){h+=`<div class="grp">${grp[c.g]}</div>`;last=c.g}
  if(!c.less)h+=`<button class="tb" data-r="${k}" data-tip="${esc(c.n)}  (${CTRL_OF[k]?'Strg+'+CTRL_OF[k]+' · ':''}${k})" aria-label="${esc(c.n)}">${ICON(c.i)}</button>`;
  (c.g==='Z'?mZ:c.g==='F'?mF:mA).push(`<li><button data-r="${k}">${esc(c.n)}<kbd>${keyLabel(k)}</kbd></button></li>`)}
 $('tools').innerHTML=`<button class="tb" data-a="select" id="bSel" data-tip="Auswählen  (Shift+A · Esc)" aria-label="Auswählen"><svg viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L16 20l-2.5 1-3.5-7.5L5 18z"/></svg></button>`+h;$('mZ').innerHTML=mZ.join('');$('mA').innerHTML=mA.join('');$('mF').innerHTML=mF.join('')+'<hr><li><button data-a="cam">Fräsvorschau<kbd>F6</kbd></button></li>';
 $('helpT').innerHTML='<tr><th>Tasten</th><th>Befehl</th><th>Tasten</th><th>Befehl</th></tr>'+(()=>{const l=Object.entries(CMDS).map(([k,c])=>`<td>${CTRL_OF[k]?`<code>Strg+${CTRL_OF[k]}</code> `:''}<code>${k}</code></td><td>${esc(c.n)}</td>`);let o='';for(let i=0;i<l.length;i+=2)o+=`<tr>${l[i]}${l[i+1]||'<td></td><td></td>'}</tr>`;return o})()}
function updTools(){document.querySelectorAll('.tb').forEach(b=>b.classList.toggle('on',b.id==='bSel'?!curCmd:b.dataset.r===curCmd));for(const k in tg)$('t_'+k).classList.toggle('on',tg[k]);$('a_cam').classList.toggle('on',tg.cam);$('legend').hidden=!tg.cam}

/* Eigenschaften */
const TN={dimr:'Radius-/Durchmessermaß',xline:'Hilfslinie (unendlich)',line:'Linie',pline:'Polylinie',rect:'Rechteck',circle:'Kreis',arc:'Bogen',slot:'Langloch',dim:'Bemaßung',text:'Text'};
const rectXYWH=e=>{const xs=e.pts.map(p=>p[0]),ys=e.pts.map(p=>p[1]);return[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]};
const setRect=(e,i,v)=>{const r=rectXYWH(e);r[i]=v;if(r[2]<=0||r[3]<=0)return;const[x,y,w,h]=r;e.pts=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]};
const PF={
 line:[['X1',e=>e.a[0],(e,v)=>e.a[0]=v],['Y1',e=>e.a[1],(e,v)=>e.a[1]=v],['X2',e=>e.b[0],(e,v)=>e.b[0]=v],['Y2',e=>e.b[1],(e,v)=>e.b[1]=v],
  ['Länge',e=>dist(e.a,e.b),(e,v)=>{if(v>0)e.b=add(e.a,mul(nrm(sub(e.b,e.a)),v))}],['Winkel °',e=>deg(ang(sub(e.b,e.a))),(e,v)=>{e.b=pol(e.a,dist(e.a,e.b),v*D2R)}]],
 circle:[['Mitte X',e=>e.c[0],(e,v)=>e.c[0]=v],['Mitte Y',e=>e.c[1],(e,v)=>e.c[1]=v],['Radius',e=>e.r,(e,v)=>{if(v>0)e.r=v}],['Ø',e=>e.r*2,(e,v)=>{if(v>0)e.r=v/2}]],
 arc:[['Mitte X',e=>e.c[0],(e,v)=>e.c[0]=v],['Mitte Y',e=>e.c[1],(e,v)=>e.c[1]=v],['Radius',e=>e.r,(e,v)=>{if(v>0)e.r=v}],['Start °',e=>deg(na(e.a0)),(e,v)=>e.a0=v*D2R],['Ende °',e=>deg(na(e.a1)),(e,v)=>e.a1=v*D2R]],
 rect:[['X',e=>rectXYWH(e)[0],(e,v)=>setRect(e,0,v)],['Y',e=>rectXYWH(e)[1],(e,v)=>setRect(e,1,v)],['Breite',e=>rectXYWH(e)[2],(e,v)=>setRect(e,2,v)],['Höhe',e=>rectXYWH(e)[3],(e,v)=>setRect(e,3,v)]],
 slot:[['X1',e=>e.a[0],(e,v)=>e.a[0]=v],['Y1',e=>e.a[1],(e,v)=>e.a[1]=v],['X2',e=>e.b[0],(e,v)=>e.b[0]=v],['Y2',e=>e.b[1],(e,v)=>e.b[1]=v],['Breite',e=>e.r*2,(e,v)=>{if(v>0)e.r=v/2}],['Gesamtlänge',e=>dist(e.a,e.b)+2*e.r,null]],
 pline:[['Punkte',e=>e.pts.length,null],['Länge',e=>prims(e).reduce((s,q)=>s+primLen(q),0),null]],
 text:[['Text',e=>e.s,(e,v)=>{if(v)e.s=v},'str'],['Höhe',e=>e.h,(e,v)=>{if(v>0)e.h=v}],['X',e=>e.p[0],(e,v)=>e.p[0]=v],['Y',e=>e.p[1],(e,v)=>e.p[1]=v],['Winkel °',e=>deg(e.a||0),(e,v)=>e.a=v*D2R],['Breite',e=>textWidth(e),null]],
 dim:[['Maß',e=>dimGeom(e).val,null]],
 dimr:[['Maß',e=>dimGeom(e).val,null],['Mitte X',e=>e.c[0],null],['Mitte Y',e=>e.c[1],null]],
 xline:[['Punkt X',e=>e.p[0],(e,v)=>e.p[0]=v],['Punkt Y',e=>e.p[1],(e,v)=>e.p[1]=v],['Winkel °',e=>deg(na(ang(e.d))),(e,v)=>e.d=pol([0,0],1,v*D2R)]]};
const kind=e=>e.t==='pline'&&e.rect?'rect':e.t==='dim'&&e.c?'dimr':e.t;
function updProps(){const es=[...sel].map(byId).filter(Boolean);$('selc').textContent=es.length?es.length+' gewählt':'';let h='';
 if(!es.length)h='<p class="muted">Nichts gewählt. Objekt anklicken oder Rahmen aufziehen.</p>';
 else{const lys=new Set(es.map(e=>e.ly));
  h+=`<div class="pr"><label>Typ</label><input readonly value="${es.length===1?TN[kind(es[0])]:'Verschiedene'}" style="text-align:left"></div>`;
  h+=`<div class="pr"><label for="p_ly">Ebene</label><select id="p_ly">${lys.size>1?'<option value="">– gemischt –</option>':''}${S.layers.map(l=>`<option ${lys.size===1&&lys.has(l.n)?'selected':''}>${esc(l.n)}</option>`).join('')}</select></div>`;
  if(es.length===1){const e=es[0];(PF[kind(e)]||[]).forEach((f,i)=>{const str=f[3]==='str';h+=`<div class="pr"><label for="pf${i}">${f[0]}</label><input id="pf${i}" data-i="${i}" ${!f[2]?'readonly':str?'type="text" style="text-align:left"':'type="text" inputmode="decimal"'} value="${str?esc(f[1](e)):fmt(f[1](e),3)}"></div>`});
   if(e.t==='pline'&&!e.rect)h+=`<div class="pr"><label for="p_cl">Geschlossen</label><input type="checkbox" id="p_cl" ${e.closed?'checked':''}></div>`}
  h+=camProps(es);
  h+=`<div class="row" style="justify-content:flex-start"><button class="btn" data-r="E">Löschen</button><button class="btn" data-r="KO">Kopieren</button><button class="btn" data-r="V">Verschieben</button></div>`}
 $('props').innerHTML=h;
 const ly=$('p_ly');if(ly)ly.onchange=()=>{if(ly.value)doCommit(()=>es.forEach(e=>e.ly=ly.value))};
 const cl=$('p_cl');if(cl)cl.onchange=()=>doCommit(()=>es[0].closed=cl.checked);
 bindCamProps(es);
 $('props').querySelectorAll('input[data-i]').forEach(el=>{const f=PF[kind(es[0])][+el.dataset.i];if(!f[2])return;
  el.addEventListener('change',()=>{if(f[3]==='str'){const v=el.value.trim();if(!v){el.value=f[1](es[0]);return}doCommit(()=>f[2](es[0],v));return}const v=ev(el.value.replace(',','.'));if(v==null){el.value=fmt(f[1](es[0]),3);return}doCommit(()=>f[2](es[0],v))});
  el.addEventListener('keydown',k=>{if(k.key==='Enter')el.blur()})})}
/* Fräs-Eigenschaften */
function camProps(es){es=es.filter(e=>e.t!=='dim'&&e.t!=='xline');if(!es.length)return'';const cs=es.map(cutOf),same=k=>cs.every(c=>c[k]===cs[0][k]),allAuto=es.every(e=>!e.ct),anyClosed=es.some(isClosed);
 const tv=allAuto?'':same('t')?cs[0].t:'*';
 let h=`<h2 style="margin:14px 0 8px">Fräsen</h2><div class="pr"><label for="c_t">Frästyp</label><select id="c_t">${tv==='*'?'<option value="*" selected>– gemischt –</option>':''}<option value="" ${allAuto?'selected':''}>Automatisch${allAuto&&same('t')?' ('+CUTS[cs[0].t]+')':''}</option>${Object.entries(CUTS).map(([k,n])=>`<option value="${k}" ${tv===k?'selected':''} ${needsClosed(k)&&!anyClosed?'disabled':''}>${n}</option>`).join('')}</select></div>`;
 const num=(id,lab,k,dk)=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${same(k)?fmt(cs[0][k],2):''}" placeholder="${same(k)?'':'gemischt'}" title="Leer lassen = Standard (${fmt(S.def[dk])} mm)"></div>`;
 h+=num('c_d','Tiefe mm','d','depth')+num('c_tool','Fräser Ø mm','tool','tool');
 const warn=[];if(es.some(e=>e.ct&&needsClosed(e.ct)&&!isClosed(e)))warn.push('Außen, Innen und Tasche gehen nur mit geschlossener Kontur – offene Teile erst mit „Verbinden“ (VB) schließen.');
 if(es.length<=40){let bad=0,fail=0;for(const e of es){const m=camOf(e);if(m.fail)fail++;else if(m.left.length)bad++}
  if(fail)warn.push(`Fräser zu dick: passt bei ${fail===1&&es.length===1?'dieser Kontur':fail+' Kontur(en)'} gar nicht hinein.`);
  if(bad)warn.push(`In ${bad===1&&es.length===1?'dieser Kontur':bad+' Kontur(en)'} bleibt in Ecken Material stehen (Fräser zu dick) – rot in der Fräsvorschau (F6).`)}
 if(warn.length)h+=`<div class="warn">${warn.map(esc).join('<br>')}</div>`;
 return h}
function bindCamProps(es){es=es.filter(e=>e.t!=='dim'&&e.t!=='xline');const t=$('c_t');if(!t)return;
 t.onchange=()=>{if(t.value==='*')return;doCommit(()=>es.forEach(e=>{if(!t.value)delete e.ct;else if(!needsClosed(t.value)||isClosed(e))e.ct=t.value}))};
 for(const[id,k]of[['c_d','cd'],['c_tool','tool']]){const el=$(id);el.addEventListener('keydown',x=>{if(x.key==='Enter')el.blur()});
  el.addEventListener('change',()=>{const raw=el.value.trim();if(!raw){doCommit(()=>es.forEach(e=>delete e[k]));return}const v=ev(raw.replace(',','.'));if(v==null||v<=0){updProps();return}doCommit(()=>es.forEach(e=>e[k]=v))})}}
function updDefs(){$('d_tool').value=fmt(S.def.tool,2);$('d_depth').value=fmt(S.def.depth,2)}
for(const[id,k]of[['d_tool','tool'],['d_depth','depth']]){const el=$(id);el.addEventListener('keydown',x=>{if(x.key==='Enter')el.blur()});
 el.addEventListener('change',()=>{const v=ev(el.value.replace(',','.'));if(v==null||v<=0){updDefs();return}doCommit(()=>S.def[k]=v)})}
/* Ebenen */
const EYE='<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',EYEX='<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM4 4l16 16"/></svg>';
const DEL='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function updLayers(){$('layers').innerHTML=S.layers.map((l,i)=>{const c=S.ents.filter(e=>e.ly===l.n).length;return`<div class="ly ${l.n===S.cur?'cur':''}"><input type="radio" name="curly" data-i="${i}" data-a="cur" ${l.n===S.cur?'checked':''} aria-label="Aktuelle Ebene ${esc(l.n)}">
 <input type="color" value="${l.c}" data-i="${i}" data-a="col" aria-label="Farbe"><span class="lyn" title="${esc(l.n)}">${esc(l.n)} <span class="cnt">${c}</span></span>
 <button data-i="${i}" data-a="vis" aria-label="Sichtbar">${l.v?EYE:EYEX}</button><button data-i="${i}" data-a="del" aria-label="Ebene löschen" ${c||l.n==='0'?'disabled style="opacity:.25"':''}>${DEL}</button></div>`}).join('');
 $('cnt').textContent=S.ents.length+' Objekte';const g=$('t_guide');if(g)g.classList.toggle('on',S.cur==='Hilfslinien')}
$('layers').addEventListener('input',e=>{const t=e.target,l=S.layers[+t.dataset.i];if(!l)return;geoVer++;if(t.dataset.a==='col'){l.c=t.value;save();render()}if(t.dataset.a==='cur'){S.cur=l.n;save();updLayers()}});
$('layers').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const l=S.layers[+t.dataset.i];if(!l)return;geoVer++;
 if(t.dataset.a==='vis'){l.v=!l.v;[...sel].forEach(id=>{const x=byId(id);if(x&&x.ly===l.n)sel.delete(id)});save();updLayers();updProps();render()}
 if(t.dataset.a==='del'){S.layers.splice(+t.dataset.i,1);if(S.cur===l.n)S.cur='0';save();updLayers();updProps()}});
$('addly').addEventListener('submit',e=>{e.preventDefault();const n=$('lyname').value.trim();if(!n)return;if(lyr(n)){log('Ebene gibt es schon.','e');return}
 const cols=['#ff9f43','#ff6b9a','#b388ff','#7bd88f','#ffd166'];S.layers.push({n,c:cols[S.layers.length%cols.length],v:true});S.cur=n;$('lyname').value='';save();updLayers();updProps()});

/* ---------- Ansicht ---------- */
const w2s=p=>[p[0]*view.s+view.ox,-p[1]*view.s+view.oy],s2w=s=>[(s[0]-view.ox)/view.s,(view.oy-s[1])/view.s];
function zoomAll(){const W=cv.clientWidth,H=cv.clientHeight,b=bbox(S.ents.filter(vis));if(!b){view.s=1.2;view.ox=W*.2;view.oy=H*.8;render();return}
 const w=Math.max(b[2]-b[0],10),h=Math.max(b[3]-b[1],10);view.s=Math.min(W/(w*1.25),H/(h*1.25));view.ox=W/2-(b[0]+w/2)*view.s;view.oy=H/2+(b[1]+h/2)*view.s;render()}
function hit(p){const tol=7/view.s;let best=null,bd=tol;for(const e of S.ents){if(!vis(e))continue;const d=dEnt(p,e);if(d<bd){bd=d;best=e}}return best}
function orthoP(p){const b=REQ&&REQ.base;if(!tg.ortho||!b)return p;const d=sub(p,b);return Math.abs(d[0])>=Math.abs(d[1])?[p[0],b[1]]:[b[0],p[1]]}
/* Winkelfang: zieht die Richtung auf 0°, 45°, 90° … sobald man nah dran ist */
function polarP(p){const b=REQ&&REQ.base;if(!tg.polar||tg.ortho||!b)return null;const d=sub(p,b),L=len(d);if(L*view.s<6)return null;
 const st=pstep*D2R,a=Math.round(ang(d)/st)*st,u=[Math.cos(a),Math.sin(a)],off=Math.abs(crs(u,d)),along=dot(d,u);
 if(along<=0||(off*view.s>10&&Math.abs(Math.atan2(off,along))>3*D2R))return null;
 let l=along;if(tg.gsnap)l=Math.max(gstep,Math.round(l/gstep)*gstep);return{p:add(b,mul(u,l)),a:na(a),u}}
function computeSnap(){cursorW=s2w(mouse.sp);snapHit=null;hoverE=null;polarHit=null;
 if(!REQ||REQ.k!=='pt'){curP=cursorW;if(!drag&&!pan)hoverE=hit(cursorW);return}
 if(tg.osnap){const tol=11/view.s,raw=cursorW;let best=null,bd=tol;const near=[];
  for(const e of geomEnts()){for(const s of snapPts(e)){const d=dist(s.p,raw);if(d<bd){bd=d;best=s}}if(e.t!=='text'&&dEnt(raw,e)<tol*1.5)near.push(e)}
  for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++)for(const p of iEE(near[i],near[j])){const d=dist(p,raw);if(d<bd){bd=d;best={p,k:'int'}}}
  if(REQ.base){const d=dist(REQ.base,raw);if(d<bd)best={p:REQ.base,k:'end'}}
  snapHit=best}
 if(snapHit){curP=snapHit.p;return}
 polarHit=polarP(cursorW);if(polarHit){curP=polarHit.p;return}
 let p=cursorW;if(tg.gsnap)p=[Math.round(p[0]/gstep)*gstep,Math.round(p[1]/gstep)*gstep];curP=orthoP(p)}

/* ---------- Zeichnen ---------- */
let W=0,H=0,dpr=1;
function resize(){dpr=window.devicePixelRatio||1;W=cv.clientWidth;H=cv.clientHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);render()}
function strokePrims(ps){ctx.beginPath();for(const q of ps){if(q.a){ctx.moveTo(q.a[0],q.a[1]);ctx.lineTo(q.b[0],q.b[1])}else{const a0=isFull(q)?0:q.a0,sp=isFull(q)?TAU:(na(q.a1-q.a0)||TAU);const s=pol(q.c,q.r,a0);ctx.moveTo(s[0],s[1]);ctx.arc(q.c[0],q.c[1],q.r,a0,a0+sp,false)}}ctx.stroke()}
const px=v=>v/view.s;
function drawEnt(e,col,w=1.3,dash=null){ctx.strokeStyle=col;ctx.lineWidth=px(w);ctx.setLineDash(dash?dash.map(px):[]);
 if(e.t==='xline'){const c=s2w([W/2,H/2]),R=Math.hypot(W,H)/view.s,t=dot(sub(c,e.p),e.d);ctx.setLineDash((dash||[10,4,2,4]).map(px));strokePrims([{a:add(e.p,mul(e.d,t-R)),b:add(e.p,mul(e.d,t+R))}]);ctx.setLineDash([]);return}
 if(e.t==='dim'){const g=dimGeom(e);strokePrims(g.lines.map(([a,b])=>({a,b})));const u=pol([0,0],1,g.th),t=mul(rotP(u,[0,0],Math.PI/4),px(5));ctx.setLineDash([]);ctx.lineWidth=px(w+.6);
  ctx.beginPath();for(const d of[g.d1,g.d2]){ctx.moveTo(d[0]-t[0],d[1]-t[1]);ctx.lineTo(d[0]+t[0],d[1]+t[1])}ctx.stroke();dimTexts.push([e,col]);return}
 strokePrims(prims(e))}
let dimTexts=[];
function drawDimText(e,col){const g=dimGeom(e);let th=-g.th;if(th>Math.PI/2+1e-6)th-=Math.PI;if(th<-Math.PI/2-1e-6)th+=Math.PI;if(th>Math.PI/2+1e-6)th-=Math.PI;
 const s=w2s(g.m);ctx.save();ctx.translate(s[0],s[1]);ctx.rotate(th);ctx.font='500 12.5px "IBM Plex Sans",sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
 const t=(g.pre||'')+fmtDE(g.val),w=ctx.measureText(t).width;ctx.fillStyle='#16191dcc';ctx.fillRect(-w/2-3,-17,w+6,15);ctx.fillStyle=col;ctx.fillText(t,0,-3);ctx.restore()}
function drawGrid(){if(!tg.grid)return;let g=gstep;let k=0;while(g*view.s<9&&k++<12)g*=(String(g/gstep).startsWith('1')||String(g/gstep).startsWith('5'))?2:2.5;const maj=g*5;
 const [x0,y1]=s2w([0,0]),[x1,y0]=s2w([W,H]);
 for(const[step,a]of[[g,.05],[maj,.11]]){ctx.strokeStyle=`rgba(200,215,230,${a})`;ctx.lineWidth=1;ctx.beginPath();
  for(let x=Math.ceil(x0/step)*step;x<=x1;x+=step){const s=Math.round(w2s([x,0])[0])+.5;ctx.moveTo(s,0);ctx.lineTo(s,H)}
  for(let y=Math.ceil(y0/step)*step;y<=y1;y+=step){const s=Math.round(w2s([0,y])[1])+.5;ctx.moveTo(0,s);ctx.lineTo(W,s)}ctx.stroke()}}
function drawSnap(h){const s=w2s(h.p),r=6;ctx.strokeStyle='#ffb020';ctx.lineWidth=2;ctx.setLineDash([]);ctx.beginPath();
 if(h.k==='end')ctx.rect(s[0]-r,s[1]-r,2*r,2*r);else if(h.k==='mid'){ctx.moveTo(s[0],s[1]-r-1);ctx.lineTo(s[0]+r+1,s[1]+r);ctx.lineTo(s[0]-r-1,s[1]+r);ctx.closePath()}
 else if(h.k==='cen')ctx.arc(s[0],s[1],r,0,TAU);else if(h.k==='quad'){ctx.moveTo(s[0],s[1]-r-1);ctx.lineTo(s[0]+r+1,s[1]);ctx.lineTo(s[0],s[1]+r+1);ctx.lineTo(s[0]-r-1,s[1]);ctx.closePath()}
 else{ctx.moveTo(s[0]-r,s[1]-r);ctx.lineTo(s[0]+r,s[1]+r);ctx.moveTo(s[0]+r,s[1]-r);ctx.lineTo(s[0]-r,s[1]+r)}ctx.stroke();
 const lab={end:'Endpunkt',mid:'Mitte',cen:'Zentrum',quad:'Quadrant',int:'Schnittpunkt'}[h.k];ctx.font='12px "IBM Plex Sans",sans-serif';ctx.fillStyle='#ffb020';ctx.fillText(lab,s[0]+12,s[1]+20)}
function fillPolys(ps,col){if(!ps.length)return;ctx.beginPath();for(const q of ps){ctx.moveTo(q[0][0],q[0][1]);for(let i=1;i<q.length;i++)ctx.lineTo(q[i][0],q[i][1]);ctx.closePath()}ctx.fillStyle=col;ctx.fill('nonzero')}
function strokePolys(ps,col,w,dash){if(!ps.length)return;ctx.strokeStyle=col;ctx.lineWidth=px(w);ctx.setLineDash(dash?dash.map(px):[]);ctx.beginPath();for(const q of ps){ctx.moveTo(q[0][0],q[0][1]);for(let i=1;i<q.length;i++)ctx.lineTo(q[i][0],q[i][1])}ctx.stroke();ctx.setLineDash([])}
function drawCam(){const es=S.ents.filter(e=>e.t!=='dim'&&vis(e)),by={};for(const e of es){const c=cutOf(e);(by[c.eff]=by[c.eff]||[]).push(e)}
 const P=e=>pathsOf(e).filter(p=>p.closed).map(p=>p.pts);
 fillPolys((by.outside||[]).flatMap(P),'rgba(236,240,245,.16)');
 fillPolys((by.inside||[]).flatMap(P),'#16191d');
 fillPolys((by.pocket||[]).flatMap(P),'rgba(150,158,168,.42)');
 for(const e of[...(by.online||[])])fillPolys(camOf(e).band,'rgba(255,209,102,.16)');
 for(const t of['outside','inside','pocket','online'])for(const e of by[t]||[]){const m=camOf(e);if(t!=='online')strokePolys(m.center,'rgba(255,210,122,.75)',1,[4,3]);fillPolys(m.left,'rgba(229,72,45,.75)')}}
function render(){if(!W)return;dimTexts=[];ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#16191d';ctx.fillRect(0,0,W,H);drawGrid();
 const o=w2s([0,0]);ctx.lineWidth=1.5;ctx.strokeStyle='#e5482d';ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(o[0]+28,o[1]);ctx.stroke();ctx.strokeStyle='#4cc38a';ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(o[0],o[1]-28);ctx.stroke();
 ctx.setTransform(dpr*view.s,0,0,-dpr*view.s,dpr*view.ox,dpr*view.oy);ctx.lineCap='round';ctx.lineJoin='round';
 if(tg.cam)drawCam();
 for(const e of S.ents){if(!vis(e))continue;const l=lyr(e.ly);drawEnt(e,tg.cam&&e.t!=='dim'?CUTCOL[cutOf(e).eff]:l?l.c:'#ddd',sel.has(e.id)?1.6:1.3,sel.has(e.id)?[7,5]:null);if(sel.has(e.id))drawEnt(e,'rgba(229,72,45,.85)',1.6,[7,5])}
 if(hoverE&&!sel.has(hoverE.id))drawEnt(hoverE,'rgba(255,176,32,.9)',2.6);
 if(hlE)drawEnt(hlE,'rgba(255,176,32,.95)',2.6,[6,4]);
 for(const id of hlSet){const e=byId(id);if(e)drawEnt(e,'rgba(255,176,32,.95)',2.6,[6,4])}
 if(REQ&&REQ.prev&&mouse.in){try{for(const e of REQ.prev(curP))drawEnt(e,'#ffd27a',1.3,[6,4])}catch(err){}}
 if(REQ&&REQ.base&&mouse.in){const b=REQ.base;drawEnt(tmp('line',{a:b,b:curP}),'rgba(255,255,255,.18)',1,[2,4])}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 for(const[e,c]of dimTexts)drawDimText(e,c);
 for(const id of sel){const e=byId(id);if(!e||!vis(e))continue;for(const s of snapPts(e)){if(s.k==='quad')continue;const p=w2s(s.p);ctx.fillStyle='#e5482d';ctx.fillRect(p[0]-3,p[1]-3,6,6)}}
 if(snapHit&&mouse.in)drawSnap(snapHit);
 if(polarHit&&mouse.in&&REQ&&REQ.base){const a=w2s(REQ.base),e=w2s(add(REQ.base,mul(polarHit.u,(W+H)*2/view.s))),s=w2s(curP);ctx.strokeStyle='rgba(76,195,138,.8)';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(e[0],e[1]);ctx.stroke();ctx.setLineDash([]);
  ctx.font='12px "IBM Plex Sans",sans-serif';ctx.fillStyle='#4cc38a';ctx.fillText(fmtDE(deg(polarHit.a))+'°',s[0]+12,s[1]+20)}
 if(drag&&dist(drag.s,drag.c)>4){const cr=drag.c[0]<drag.s[0];ctx.setLineDash(cr?[5,4]:[]);ctx.strokeStyle=cr?'#4cc38a':'#6f9cff';ctx.fillStyle=cr?'rgba(76,195,138,.1)':'rgba(111,156,255,.1)';ctx.lineWidth=1;
  const x=Math.min(drag.s[0],drag.c[0]),y=Math.min(drag.s[1],drag.c[1]),w=Math.abs(drag.c[0]-drag.s[0]),h=Math.abs(drag.c[1]-drag.s[1]);ctx.fillRect(x,y,w,h);ctx.strokeRect(x+.5,y+.5,w,h);ctx.setLineDash([])}
 if(mouse.in&&!pan){const s=REQ&&REQ.k==='pt'?w2s(curP):mouse.sp,x=Math.round(s[0])+.5,y=Math.round(s[1])+.5;ctx.strokeStyle='rgba(235,240,245,.55)';ctx.lineWidth=1;ctx.beginPath();
  const g=REQ&&REQ.k==='pt'?0:6;ctx.moveTo(0,y);ctx.lineTo(x-g,y);ctx.moveTo(x+g,y);ctx.lineTo(W,y);ctx.moveTo(x,0);ctx.lineTo(x,y-g);ctx.moveTo(x,y+g);ctx.lineTo(x,H);ctx.stroke();
  if(g){ctx.strokeStyle='#ebf0f5';ctx.strokeRect(x-g,y-g,2*g,2*g)}}
 const c=REQ&&REQ.k==='pt'?curP:cursorW;let t=`X ${fmtDE(c[0])} · Y ${fmtDE(c[1])}`;if(REQ&&REQ.base){const d=sub(curP,REQ.base);t+=` · L ${fmtDE(len(d))} · ${fmtDE(deg(ang(d)))}°`}$('xy').textContent=t}

/* Rahmenauswahl */
function boxSel(a,b,cross,shift){const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);
 const inside=p=>p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1;const edges=[[[x0,y0],[x1,y0]],[[x1,y0],[x1,y1]],[[x1,y1],[x0,y1]],[[x0,y1],[x0,y0]]].map(([a,b])=>({a,b}));
 for(const e of S.ents){if(!vis(e))continue;const pts=prims(e).flatMap(sample);let ok;
  if(!cross)ok=pts.every(inside);else{ok=pts.some(inside);if(!ok)for(const q of prims(e)){const s=sample(q);for(let i=0;i<s.length-1&&!ok;i++)for(const ed of edges)if(iSS({a:s[i],b:s[i+1]},ed).length){ok=true;break}if(ok)break}}
  if(ok){shift?sel.delete(e.id):sel.add(e.id)}}}

/* ---------- Maus ---------- */
/* Hinweis zur Bedienung verschwindet nach der ersten Benutzung */
try{if(localStorage.getItem('origincad.hint'))$('hint').style.display='none'}catch(e){}
const hideHint=()=>{if($('hint').style.display==='none')return;$('hint').style.display='none';try{localStorage.setItem('origincad.hint','1')}catch(e){}};
cv.addEventListener('wheel',hideHint,{passive:true});cv.addEventListener('pointerdown',hideHint);
cv.addEventListener('contextmenu',e=>e.preventDefault());
/* Finger: zwei Finger = Zoom/Verschieben; Punkt wird erst beim Loslassen gesetzt (Finger ziehen = Fang suchen) */
let lastPT='mouse',pinch=null,tap=false;const TP=new Map();
document.addEventListener('pointerdown',e=>{lastPT=e.pointerType||'mouse'},true);
const focusInp=()=>{if(lastPT!=='touch')inp.focus()};
function clickAt(){computeSnap();
 if(REQ&&REQ.k==='pt'){lastPt=curP;adv({p:curP});return true}
 if(REQ&&REQ.k==='pick'){const h=hit(cursorW);if(h)adv({e:h,p:cursorW});else log('Kein Objekt getroffen.','e');return true}
 return false}
function pinchState(){const[a,b]=[...TP.values()];return{d:Math.max(dist(a,b),1),m:mid(a,b)}}
function endTouch(e){if(!TP.has(e.pointerId))return false;TP.delete(e.pointerId);if(pinch){if(!TP.size)pinch=null;return true}return false}
cv.addEventListener('pointercancel',e=>{endTouch(e);tap=false;drag=null;pan=null;render()});
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);closeMenus();const sp=[e.offsetX,e.offsetY];
 if(e.pointerType==='touch'){TP.set(e.pointerId,sp);if(TP.size>=2){if(TP.size===2){const p=pinchState();pinch={d:p.d,m:p.m,s:view.s,ox:view.ox,oy:view.oy}}drag=null;tap=false;mouse.in=false;render();return}}
 mouse.sp=sp;
 if(e.button===1||(e.button===0&&spaceDown)){e.preventDefault();pan={s:sp,ox:view.ox,oy:view.oy};spaceUsed=true;return}
 if(e.button===2){onEnter();return}if(e.button!==0)return;
 if(e.pointerType==='touch'&&REQ&&(REQ.k==='pt'||REQ.k==='pick')){tap=true;mouse.in=true;computeSnap();render();return}
 if(clickAt())return;
 if(REQ&&(REQ.k==='num'||REQ.k==='opt'||REQ.k==='str')){inp.focus();return}
 drag={s:sp,c:sp,shift:e.shiftKey}});
cv.addEventListener('pointermove',e=>{if(TP.has(e.pointerId)){TP.set(e.pointerId,[e.offsetX,e.offsetY]);
  if(pinch){if(TP.size>=2){const p=pinchState(),w=[(pinch.m[0]-pinch.ox)/pinch.s,(pinch.oy-pinch.m[1])/pinch.s];view.s=clamp(pinch.s*p.d/pinch.d,1e-3,1e3);view.ox=p.m[0]-w[0]*view.s;view.oy=p.m[1]+w[1]*view.s;render()}return}}
 mouse.sp=[e.offsetX,e.offsetY];mouse.in=true;
 if(pan){view.ox=pan.ox+mouse.sp[0]-pan.s[0];view.oy=pan.oy+mouse.sp[1]-pan.s[1]}
 if(drag)drag.c=mouse.sp;computeSnap();render()});
cv.addEventListener('pointerup',e=>{if(endTouch(e))return;if(tap){tap=false;mouse.sp=[e.offsetX,e.offsetY];clickAt();mouse.in=false;render();return}
 if(pan){pan=null;render();return}if(!drag)return;const d=drag;drag=null;
 if(dist(d.s,d.c)<4){const h=hit(s2w(d.s));if(h){if(d.shift)sel.delete(h.id);else sel.has(h.id)&&!REQ?sel.delete(h.id):sel.add(h.id)}else if(!d.shift&&!REQ)sel.clear()}
 else boxSel(s2w(d.s),s2w(d.c),d.c[0]<d.s[0],d.shift);updProps();computeSnap();render();focusInp()});
cv.addEventListener('pointerleave',()=>{mouse.in=false;render()});
cv.addEventListener('wheel',e=>{e.preventDefault();const f=Math.exp(-e.deltaY*(e.deltaMode?.05:.0015)),sp=[e.offsetX,e.offsetY],w=s2w(sp);view.s=clamp(view.s*f,1e-3,1e3);view.ox=sp[0]-w[0]*view.s;view.oy=sp[1]+w[1]*view.s;computeSnap();render()},{passive:false});

/* ---------- Tastatur ---------- */
function parsePt(t){const base=(REQ&&REQ.base)||lastPt;let rel=false;if(t[0]==='@'){rel=true;t=t.slice(1)}
 if(t.includes('<')){const[a,b]=t.split('<'),d=ev(a),w=ev(b);if(d==null||w==null)return null;const o=base||[0,0];return{p:pol(rel||base?o:[0,0],d,w*D2R)}}
 if(/[,;]/.test(t)){const[a,b]=t.split(/[,;]/),x=ev(a),y=ev(b);if(x==null||y==null)return null;if(rel){if(!base)return null;return{p:add(base,[x,y])}}return{p:[x,y]}}
 const n=ev(t);if(n!=null&&!rel)return{n};return null}
function onEnter(){inp.dataset.raw=inp.value.trim();const t=inp.value.trim();inp.value='';
 if(!REQ){if(!t){if(lastCmd)run(lastCmd);return}const k=alias(t);if(k)run(k);else log('Unbekannter Befehl: '+t+'  (F1 = Hilfe)','e');return}
 if(REQ.k==='str'){adv(inp.dataset.raw||null);return}
 if(t&&REQ.k!=='num'&&!(REQ.opts||[]).includes(t.toUpperCase())&&alias(t)&&!/^[\d@.\-(]/.test(t)){run(alias(t));return}
 if(REQ.k==='sel'){const es=[...sel].map(byId).filter(Boolean);if(!es.length){log('Noch nichts gewählt.','e');return}adv(es);return}
 if(REQ.k==='num'){if(!t){adv(REQ.def!=null?REQ.def:null);return}const n=ev(t.replace(/,/g,'.'));if(n==null){log('Bitte eine Zahl eingeben.','e');return}adv(n);return}
 if(REQ.k==='opt'){const o=t?t.toUpperCase():REQ.def;if(REQ.opts.includes(o))adv(o);else log('Bitte '+REQ.opts.join(' oder ')+'.','e');return}
 if(REQ.k==='pick'){adv({});return}
 if(!t){adv({enter:true});return}
 const up=t.toUpperCase();if((REQ.opts||[]).includes(up)){adv({opt:up});return}
 const p=parsePt(t);if(p){if(p.n!=null){if(REQ.num){adv({n:p.n});return}if(!REQ.base){log('Erst einen Punkt setzen – oder X,Y eingeben.','e');return}
   let dir=polarHit?polarHit.u:sub(orthoP(cursorW),REQ.base);if(len(dir)<1e-9)dir=[1,0];const q=add(REQ.base,mul(nrm(dir),p.n));lastPt=q;adv({p:q});return}
  lastPt=p.p;adv({p:p.p});return}
 log('Eingabe nicht verstanden: '+t,'e')}
let prevLy='Kontur';
function toggleGuide(){if(S.cur==='Hilfslinien'){S.cur=lyr(prevLy)&&prevLy!=='Hilfslinien'?prevLy:lyr('Kontur')?'Kontur':S.layers[0].n}else{prevLy=S.cur;if(!lyr('Hilfslinien'))S.layers.push({n:'Hilfslinien',c:'#6f9cff',v:true});S.cur='Hilfslinien'}
 geoVer++;save();updLayers();log(S.cur==='Hilfslinien'?'Ab jetzt wird auf „Hilfslinien“ gezeichnet (blau, wird nicht gefräst). Shift+H schaltet zurück.':'Ab jetzt wird wieder auf „'+S.cur+'“ gezeichnet.','ok')}
function selectMode(){inp.value='';const was=!!G;cancel(true);mouse.in&&computeSnap();log(was?'Auswahlmodus: Befehl beendet – jetzt Objekte anklicken oder Rahmen aufziehen.':'Auswahlmodus: Objekte anklicken oder Rahmen aufziehen. Shift+Klick nimmt wieder heraus.');updTools();render()}
function act(a){const T={osnap:1,polar:1,ortho:1,grid:1,gsnap:1,cam:1};if(T[a]){tg[a]=!tg[a];log(({osnap:'Objektfang',polar:'Winkelfang',ortho:'Ortho',grid:'Raster',gsnap:'Rasterfang',cam:'Fräsvorschau'})[a]+(tg[a]?' an':' aus')+(a==='cam'&&tg[a]?' – gestrichelt: Weg der Fräsermitte · rot: hier bleibt Material stehen':''));updTools();computeSnap();render();saveUI();return}
 ({raum:()=>window.RAUM&&window.RAUM.open(),drucken:printDrawing,korpus:()=>window.KORPUS&&window.KORPUS.open(),view3d:open3D,guide:toggleGuide,select:selectMode,enter:onEnter,esc:()=>{inp.value='';cancel(false)},neu:()=>$('dNew').classList.add('open'),oeffnen:()=>{fileMode='open';$('file').click()},importieren:()=>{fileMode='import';$('file').click()},
  exportSvg:openExport,exportDxf:exportDXF,tpl:openTpls,tplSave:openSaveTpl,speichern:saveFile,undo,redo,zoomAll,help:()=>$('dHelp').classList.add('open'),
  alle:()=>{S.ents.filter(vis).forEach(e=>sel.add(e.id));updProps();render()}})[a]?.()}
window.addEventListener('keydown',e=>{if(window.RAUM&&window.RAUM.isOpen()){window.RAUM.key(e);return}if(window.KORPUS&&window.KORPUS.isOpen()){window.KORPUS.key(e);return}
 const t=e.target,inProp=t!==inp&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA');
 if(document.querySelector('.dlg.open')){if(e.key==='Escape')document.querySelectorAll('.dlg.open').forEach(d=>d.classList.remove('open'));return}
 const F={F4:'view3d',F2:'guide',F1:'help',F3:'osnap',F6:'cam',F7:'grid',F8:'ortho',F9:'gsnap',F10:'polar'};if(F[e.key]){e.preventDefault();act(F[e.key]);return}
 if(inProp)return;
 if(e.ctrlKey||e.metaKey){const k=e.key.toLowerCase(),K=(e.code||'').startsWith('Key')?e.code.slice(3):k.toUpperCase();
  if(!e.altKey&&!e.shiftKey){
   if(K==='O'){e.preventDefault();act('oeffnen');return}
   if(e.key==='0'){e.preventDefault();zoomAll();return}
   if(CTRL[K]&&!(inp.value&&'CVX'.includes(K))){e.preventDefault();inp.value='';run(CTRL[K]);return}}
  if(k==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(k==='y'){e.preventDefault();redo()}else if(k==='s'){e.preventDefault();saveFile()}else if(k==='a'&&!inp.value){e.preventDefault();act('alle')}return}
 if(e.key==='Escape'){e.preventDefault();inp.value='';cancel(false);return}
 if(e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.code==='KeyA'||e.key==='A')&&!inp.value&&!(REQ&&REQ.k==='str')){e.preventDefault();selectMode();return}
 if(e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.code==='KeyH'||e.key==='H')&&!inp.value&&!(REQ&&REQ.k==='str')){e.preventDefault();toggleGuide();return}
 if(e.key==='Enter'){e.preventDefault();onEnter();return}
 if(e.key===' '&&!inp.value){e.preventDefault();if(!e.repeat){spaceDown=true;spaceUsed=false}return}
 if((e.key==='Delete')&&!inp.value&&!REQ&&sel.size){e.preventDefault();run('E');return}
 if(e.key.length===1&&t!==inp)inp.focus()});
window.addEventListener('keyup',e=>{if(e.key===' '&&spaceDown){spaceDown=false;if(!spaceUsed&&!inp.value)onEnter()}});

/* Menüs & Knöpfe */
function closeMenus(){document.querySelectorAll('.dd.open').forEach(d=>d.classList.remove('open'))}
document.addEventListener('click',e=>{const dd=e.target.closest('.dd>button');if(dd){const p=dd.parentElement,o=p.classList.contains('open');closeMenus();if(!o)p.classList.add('open');return}
 const b=e.target.closest('[data-r],[data-a]');if(b&&!b.closest('#layers')){closeMenus();if(b.dataset.r)run(b.dataset.r);else act(b.dataset.a);if(!b.closest('.dlg')&&!(REQ&&['num','opt','str'].includes(REQ.k)))focusInp();return}
 if(e.target.closest('[data-close]')||e.target.classList.contains('dlg')){document.querySelectorAll('.dlg.open').forEach(d=>d.classList.remove('open'));return}
 if(!e.target.closest('.dd'))closeMenus()});
document.querySelectorAll('.menu .dd').forEach(d=>d.addEventListener('mouseenter',()=>{if(document.querySelector('.dd.open')&&!d.classList.contains('open')){closeMenus();d.classList.add('open')}}));
const tip=$('tip');document.addEventListener('mouseover',e=>{const b=e.target.closest('[data-tip]');if(!b){tip.style.display='none';return}const r=b.getBoundingClientRect();tip.textContent=b.dataset.tip;tip.style.display='block';tip.style.left=(r.right+8)+'px';tip.style.top=(r.top+r.height/2-13)+'px'});
$('pstep').addEventListener('change',e=>{pstep=+e.target.value||45;saveUI();computeSnap();render()});
$('gstep').addEventListener('change',e=>{const v=ev(e.target.value.replace(',','.'));if(v>0){gstep=v;saveUI();render()}else e.target.value=gstep});

/* ---------- Dateien ---------- */
let fileName='Zeichnung.json';
function save(){try{localStorage.setItem('origincad.v1',snapS())}catch(e){}}
function saveUI(){try{localStorage.setItem('origincad.ui',JSON.stringify({tg,gstep,pstep}))}catch(e){}}
function afterChange(){updUndo();geoVer++;save();updDefs();updProps();updLayers();computeSnap();render()}
$('copyB').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('saveT').value);$('copyB').textContent='Kopiert ✓'}catch(e){$('saveT').select();$('copyB').textContent='Mit Strg+C kopieren'}setTimeout(()=>$('copyB').textContent='Kopieren',2000)});
$('newB').addEventListener('click',()=>{pushUndo();S={ents:[],layers:DEF_LAYERS(),cur:'Kontur',nid:1,def:{...S.def}};fileName='Zeichnung.json';sel.clear();$('dNew').classList.remove('open');afterChange();zoomAll();log('Neue Zeichnung.','ok')});

/* ---------- Bögen wiedererkennen (nach Formen kombinieren, Versatz, Import) ---------- */
/* pts: Punktfolge; liefert {circle:{c,r}} oder {pts,bl}. Erkannt wird nur, was wirklich fein angenähert ist (Pfeilhöhe ≤ sag). */
function fitArcs(pts,closed,o={}){const tol=o.tol||0.004,sag=o.sag||0.011,n=pts.length;
 const onC=(c,r,p)=>Math.abs(dist(p,c)-r)<=Math.max(tol,(o.rel||0)*r);
 if(closed&&n>=8){const c=circ3(pts[0],pts[Math.floor(n/3)],pts[Math.floor(2*n/3)]);if(c){const r=dist(c,pts[0]);let ok=r<1e5;
   for(let i=0;i<n&&ok;i++){const q=pts[(i+1)%n];if(!onC(c,r,pts[i])||r-Math.sqrt(Math.max(0,r*r-dist(pts[i],q)**2/4))>sag)ok=false}
   if(ok)return{circle:{c,r}}}}
 let P=pts;if(closed){let bi=0,bl=-1;for(let i=0;i<n;i++){const l=dist(pts[i],pts[(i+1)%n]);if(l>bl+1e-9){bl=l;bi=(i+1)%n}}P=[...pts.slice(bi),...pts.slice(0,bi)]}
 const Q=closed?[...P,P[0]]:P,m=Q.length,out=[],bls=[];let i=0,any=false;
 while(i<m-1){let j=i,c=null,r=0,dir=0;
  if(i+4<m){const dirOf=k=>Math.sign(crs(sub(Q[k],Q[k-1]),sub(Q[k+1],Q[k])));c=circ3(Q[i+1],Q[i+2],Q[i+3]);dir=dirOf(i+1);
   if(c&&dir){r=dist(c,Q[i+1]);const L0=Math.max(dist(Q[i+1],Q[i+2]),dist(Q[i+2],Q[i+3])),endOk=(c,r,p)=>Math.abs(dist(p,c)-r)<=sag+0.003+(o.rel||0)*r;
    const edgeOk=(a,b)=>{const l=dist(a,b);return l<=L0*1.7&&r-Math.sqrt(Math.max(0,r*r-l*l/4))<=sag};
    if(r<1e5&&dirOf(i+2)===dir&&edgeOk(Q[i],Q[i+1])&&edgeOk(Q[i+1],Q[i+2])&&edgeOk(Q[i+2],Q[i+3])&&endOk(c,r,Q[i])){j=i+3;
     /* innere Punkte müssen genau auf dem Kreis liegen, die beiden Enden dürfen angeschnittene Sehnen sein */
     while(j+1<m&&edgeOk(Q[j],Q[j+1])&&dirOf(j)===dir){const c3=circ3(Q[i+1],Q[Math.floor((i+1+j)/2)],Q[j]);if(!c3)break;const r3=dist(c3,Q[j]);if(r3>=1e5)break;
      let good=endOk(c3,r3,Q[i])&&endOk(c3,r3,Q[j+1]);for(let k=i+1;k<=j&&good;k++)if(!onC(c3,r3,Q[k]))good=false;if(!good)break;c=c3;r=r3;j++}}}}
  if(j-i>=4){const c2=c,r2=r;let sw=0;for(let k=i;k<j;k++){let d=ang(sub(Q[k+1],c2))-ang(sub(Q[k],c2));while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;sw+=d}
   const parts=Math.max(1,Math.ceil(Math.abs(sw)/(TAU/3)-1e-9)),t0=ang(sub(Q[i],c2));
   const cut=[Q[i]];for(let k=1;k<parts;k++)cut.push(pol(c2,r2,t0+sw*k/parts));cut.push(Q[j]);
   for(let k=0;k<parts;k++){out.push(cut[k]);const q=k===0||k===parts-1?(()=>{let d=ang(sub(cut[k+1],c2))-ang(sub(cut[k],c2));while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;if(Math.sign(d)!==Math.sign(sw))d+=Math.sign(sw)*TAU;return d})():sw/parts;bls.push(Math.tan(q/4))}any=true;i=j}
  else{out.push(Q[i]);bls.push(0);i++}}
 if(!closed){out.push(Q[m-1])}
 return any?{pts:out,bl:bls}:{pts:closed?P:pts}}
function polyEnt(q,ly,opt){const f=fitArcs(q,true,opt);if(f.circle)return mk('circle',f.circle,ly);const o={pts:f.pts,closed:true};if(f.bl)o.bl=f.bl;return mk('pline',o,ly)}

/* ---------- Skalieren ---------- */
function scaleEnt(e,c,k){const f=p=>add(c,mul(sub(p,c),k)),n=xf(e,f,'mv');if(n.r!=null)n.r=e.r*k;if(e.t==='text')n.h=e.h*k;return n}

/* ---------- Dateien speichern ---------- */
async function saveBlob(name,data,mime,desc){const ext='.'+name.split('.').pop();
 try{if(window.showSaveFilePicker){const h=await showSaveFilePicker({suggestedName:name,types:[{description:desc,accept:{[mime]:[ext]}}]});const w=await h.createWritable();await w.write(data);await w.close();return h.name}}
 catch(err){if(err&&err.name==='AbortError')return null}
 const url=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);return name}
const baseName=()=>fileName.replace(/\.(json|svg|dxf)$/i,'')||'Zeichnung';
async function saveFile(){const data=JSON.stringify({app:'OriginCAD',v:3,...S});
 try{const n=await saveBlob(baseName()+'.json',data,'application/json','Origin-CAD-Zeichnung');if(!n){log('Speichern abgebrochen.');return}fileName=n;$('fname').textContent=n+' · Maße in mm';log('Gespeichert: '+n,'ok')}
 catch(err){$('saveT').value=data;$('dSave').classList.add('open')}}

/* ---------- SVG für die Shaper Origin ---------- */
/* Teilstrecken eines Objekts: [{s:Start, segs:[{p, r?, big?, ccw?}], closed}] */
function segsOf(e){const A=(p,r,sw)=>({p,r,big:Math.abs(sw)>Math.PI+1e-9,ccw:sw>0});
 switch(e.t){
 case'line':return[{s:e.a,segs:[{p:e.b}],closed:false}];
 case'circle':return[{s:pol(e.c,e.r,0),segs:[A(pol(e.c,e.r,Math.PI),e.r,Math.PI),A(pol(e.c,e.r,0),e.r,Math.PI)],closed:true}];
 case'arc':{const sw=na(e.a1-e.a0)||TAU;if(sw>=TAU-1e-9)return segsOf({t:'circle',c:e.c,r:e.r});return[{s:pol(e.c,e.r,e.a0),segs:[A(pol(e.c,e.r,e.a1),e.r,sw)],closed:false}]}
 case'slot':{const q=slotPrims(e);return[{s:q[0].a,segs:[{p:q[0].b},A(q[2].a,e.r,Math.PI),{p:q[2].b},A(q[0].a,e.r,Math.PI)],closed:true}]}
 case'pline':{const p=e.pts,cl=isClosed(e),m=cl?p.length:p.length-1,segs=[];for(let i=0;i<m;i++){const b=p[(i+1)%p.length],bu=e.bl&&e.bl[i];if(hasB(bu)){const q=bulgeArc(p[i],b,bu);segs.push(A(b,q.r,4*Math.atan(bu)))}else segs.push({p:b})}return[{s:p[0],segs,closed:cl}]}
 case'text':return textStrokes(e).map(pl=>({s:pl[0],segs:pl.slice(1).map(p=>({p})),closed:false}));}
 return[]}
const SVGSTYLE={outside:'fill="#000000" stroke="#000000"',inside:'fill="#FFFFFF" stroke="#000000"',online:'fill="none" stroke="#7F7F7F"',pocket:'fill="#7F7F7F" stroke="none"',guide:'fill="none" stroke="#0068FF"'};
function exportList(onlySel){return S.ents.filter(e=>e.t!=='dim'&&e.t!=='xline'&&vis(e)&&(!onlySel||sel.has(e.id)))}
function buildSVG(es){const b=bbox(es);if(!b)return null;const M=0,x0=b[0]-M,y1=b[3]+M,W=b[2]-b[0]+2*M,H=b[3]-b[1]+2*M,n=v=>fmt(v,3);
 const pt=p=>n(p[0]-x0)+' '+n(y1-p[1]);
 const d=e=>segsOf(e).map(sp=>'M'+pt(sp.s)+sp.segs.map((s,i)=>sp.closed&&i===sp.segs.length-1&&!s.r?'':s.r?`A${n(s.r)} ${n(s.r)} 0 ${s.big?1:0} ${s.ccw?0:1} ${pt(s.p)}`:'L'+pt(s.p)).join('')+(sp.closed?'Z':'')).join('');
 const order=['outside','pocket','inside','online','guide'];let body='';
 for(const t of order)for(const e of es){const c=cutOf(e);if(c.eff!==t)continue;
  body+=`<path d="${d(e)}" ${SVGSTYLE[t]} stroke-width="0.1" stroke-linejoin="round" shaper:cutType="${t}"${t==='guide'?'':` shaper:cutDepth="${n(c.d)}mm" shaper:toolDia="${n(c.tool)}mm" shaper:cutOffset="0mm"`}/>\n`}
 return`<?xml version="1.0" encoding="UTF-8"?>\n<!-- Origin CAD: Maße in mm, 1 Einheit = 1 mm -->\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:shaper="http://www.shapertools.com/namespaces/shaper" version="1.1" width="${n(W)}mm" height="${n(H)}mm" viewBox="0 0 ${n(W)} ${n(H)}">\n${body}</svg>\n`}
function exportInfo(es){const cnt={},warn=[];let open=0,fail=0,left=0,deep=0;
 for(const e of es){const c=cutOf(e);cnt[c.eff]=(cnt[c.eff]||0)+1;if(needsClosed(c.t)&&!isClosed(e))open++;if(c.eff!=='guide'&&es.length<=400){const m=camOf(e);if(m.fail)fail++;else if(m.left.length)left++}if(c.eff!=='guide'&&c.d>43)deep++}
 if(open)warn.push(`${open} offene Kontur(en) mit Frästyp Außen/Innen/Tasche – sie werden als „Auf Linie“ ausgegeben. Vorher mit „Verbinden“ (VB) schließen.`);
 if(fail)warn.push(`Bei ${fail} Kontur(en) passt der Fräser gar nicht hinein.`);
 if(left)warn.push(`Bei ${left} Kontur(en) bleibt in Ecken Material stehen (rot in der Fräsvorschau).`);
 if(deep)warn.push(`${deep} Objekt(e) tiefer als 43 mm – so tief kommt die Origin nicht.`);
 const loose=es.filter(e=>(e.t==='line'||e.t==='arc')&&cutOf(e).eff==='online').length;if(loose>=3)warn.push(`${loose} einzelne Linien/Bögen – gehören sie zu einer Kontur, vorher „Verbinden“ (VB).`);
 return{cnt,warn}}
function openExport(){const hasSel=[...sel].some(id=>{const e=byId(id);return e&&e.t!=='dim'});$('expSelRow').style.display=hasSel?'':'none';$('expSel').checked=hasSel;updExport();$('dExp').classList.add('open')}
function updExport(){const es=exportList($('expSel').checked&&$('expSelRow').style.display!=='none'),b=bbox(es),{cnt,warn}=exportInfo(es);
 $('expT').innerHTML=es.length?'<tr><th>Frästyp</th><th>Anzahl</th></tr>'+Object.keys(CUTS).filter(k=>cnt[k]).map(k=>`<tr><td>${CUTS[k]}</td><td>${cnt[k]}</td></tr>`).join('')+`<tr><td>Größe</td><td>${fmtDE(b[2]-b[0])} × ${fmtDE(b[3]-b[1])} mm</td></tr>`:'<tr><td>Nichts zum Ausgeben – die Zeichnung ist leer.</td></tr>';
 $('expW').innerHTML=warn.map(esc).join('<br>');$('expW').style.display=warn.length?'':'none';$('expB').disabled=!es.length}
$('expSel').addEventListener('change',updExport);
$('expB').addEventListener('click',async()=>{const es=exportList($('expSel').checked&&$('expSelRow').style.display!=='none'),svg=buildSVG(es);if(!svg)return;
 const n=await saveBlob(baseName()+'.svg',svg,'image/svg+xml','SVG für Shaper Origin');$('dExp').classList.remove('open');if(n)log(`SVG für die Origin gespeichert: ${n} (${es.length} Objekte). Auf den USB-Stick kopieren oder bei hub.shapertools.com hochladen.`,'ok');else log('Export abgebrochen.')});

/* ---------- DXF schreiben (für andere CAD-Programme) ---------- */
function buildDXF(es){const L=[],w=(...a)=>{for(let i=0;i<a.length;i+=2)L.push(a[i],a[i+1])},n=v=>fmt(v,5);
 const ly=e=>(e.ly||'0').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/Ä/g,'AE').replace(/Ö/g,'OE').replace(/Ü/g,'UE').replace(/ß/g,'ss').replace(/[^A-Za-z0-9_-]/g,'_')||'0';
 const line=(a,b,l)=>w(0,'LINE',8,l,10,n(a[0]),20,n(a[1]),11,n(b[0]),21,n(b[1]));
 const pl=(pts,bl,closed,l)=>{w(0,'POLYLINE',8,l,66,1,70,closed?1:0);pts.forEach((p,i)=>{w(0,'VERTEX',8,l,10,n(p[0]),20,n(p[1]));if(bl&&hasB(bl[i]))w(42,n(bl[i]))});w(0,'SEQEND',8,l)};
 w(0,'SECTION',2,'ENTITIES');
 for(const e of es){const l=ly(e);switch(e.t){
  case'line':line(e.a,e.b,l);break;
  case'circle':w(0,'CIRCLE',8,l,10,n(e.c[0]),20,n(e.c[1]),40,n(e.r));break;
  case'arc':w(0,'ARC',8,l,10,n(e.c[0]),20,n(e.c[1]),40,n(e.r),50,n(deg(na(e.a0))),51,n(deg(na(e.a1))));break;
  case'slot':{const q=slotPrims(e);pl([q[0].a,q[0].b,q[2].a,q[2].b],[0,1,0,1],true,l);break}
  case'pline':pl(e.pts,e.bl,isClosed(e),l);break;
  case'text':for(const s of textStrokes(e))pl(s,null,false,l);break;
  case'xline':w(0,'XLINE',8,l,10,n(e.p[0]),20,n(e.p[1]),11,n(e.d[0]),21,n(e.d[1]));break;
  case'dim':{const g=dimGeom(e);for(const[a,b]of g.lines)line(a,b,l);w(0,'TEXT',8,l,10,n(g.m[0]),20,n(g.m[1]+2),40,'8',1,(g.pre==='R'?'R':g.pre?'%%c':'')+fmtDE(g.val),50,n(deg(g.th)));break}}}
 w(0,'ENDSEC',0,'EOF');return L.join('\n')+'\n'}
async function exportDXF(){const es=S.ents.filter(vis);if(!es.length){log('Die Zeichnung ist leer.','e');return}const n=await saveBlob(baseName()+'.dxf',buildDXF(es),'application/dxf','DXF-Zeichnung');if(n)log('DXF gespeichert: '+n,'ok')}

/* ---------- SVG lesen ---------- */
const mmul=(A,B)=>[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]];
const mapp=(M,p)=>[M[0]*p[0]+M[2]*p[1]+M[4],M[1]*p[0]+M[3]*p[1]+M[5]];
function parseTransform(s){let M=[1,0,0,1,0,0];for(const m of(s||'').matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)){const a=m[2].split(/[\s,]+/).filter(Boolean).map(Number);let T;
  switch(m[1]){case'matrix':T=a;break;case'translate':T=[1,0,0,1,a[0]||0,a[1]||0];break;case'scale':T=[a[0],0,0,a.length>1?a[1]:a[0],0,0];break;
   case'rotate':{const t=a[0]*D2R,c=Math.cos(t),si=Math.sin(t);T=[c,si,-si,c,0,0];if(a.length>2)T=mmul(mmul([1,0,0,1,a[1],a[2]],T),[1,0,0,1,-a[1],-a[2]]);break}
   case'skewX':T=[1,0,Math.tan(a[0]*D2R),1,0,0];break;case'skewY':T=[1,Math.tan(a[0]*D2R),0,1,0,0];break}
  if(T&&T.length===6&&T.every(isFinite))M=mmul(M,T)}return M}
const svgLen=(v,def)=>{if(v==null||v==='')return def;const m=/^\s*([-+]?[\d.]+(?:e[-+]?\d+)?)\s*([a-z%]*)/i.exec(v);if(!m)return def;const f={mm:1,cm:10,in:25.4,pt:25.4/72,pc:25.4/6,px:25.4/96,'':25.4/96}[m[2].toLowerCase()];return f?{mm:parseFloat(m[1])*f,unit:m[2]||'px',raw:parseFloat(m[1])}:def};
/* Pfad → Unterpfade in Benutzerkoordinaten: [{pts,bl,closed}]; Kurven werden fein zerlegt, Kreisbögen bleiben Bögen */
function parsePathD(d,scale){const subs=[];let i=0,cur=null,p=[0,0],st=[0,0],cmd='',pc=null,pq=null;const N=d.length;
 const ws=()=>{while(i<N&&/[\s,]/.test(d[i]))i++};
 const num=()=>{ws();const m=/^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(i,i+40));if(!m)throw new Error('Zahl erwartet');i+=m[0].length;return parseFloat(m[0])};
 const flag=()=>{ws();const c=d[i++];if(c!=='0'&&c!=='1')throw new Error('Schalter erwartet');return c==='1'};
 const more=()=>{ws();return i<N&&/[-+.\d]/.test(d[i])};
 const lineTo=q=>{if(!cur)moveTo(p);if(dist(q,p)>1e-9){cur.pts.push(q);cur.bl.push(0)}p=q};
 const moveTo=q=>{cur={pts:[q],bl:[],closed:false};subs.push(cur);p=st=q};
 const flat=(f,L)=>{const n=clamp(Math.ceil(Math.sqrt(L*scale/0.02)),6,400);for(let k=1;k<=n;k++)lineTo(f(k/n))};
 const arcTo=(rx,ry,phi,big,sw,q)=>{if(dist(p,q)<1e-12)return;rx=Math.abs(rx);ry=Math.abs(ry);if(rx<1e-12||ry<1e-12){lineTo(q);return}
  if(Math.abs(rx-ry)<1e-9*Math.max(1,rx)){let r=rx;const dd=dist(p,q);if(dd>2*r)r=dd/2;let th=2*Math.asin(clamp(dd/(2*r),-1,1));if(big)th=TAU-th;if(th>TAU-1e-6){const m=mid(p,q);/* fast voller Kreis */}
   if(!cur)moveTo(p);cur.pts.push(q);cur.bl.push((sw?1:-1)*Math.tan(th/4));p=q;return}
  const co=Math.cos(phi),si=Math.sin(phi),dx=(p[0]-q[0])/2,dy=(p[1]-q[1])/2,x1=co*dx+si*dy,y1=-si*dx+co*dy;let l=x1*x1/(rx*rx)+y1*y1/(ry*ry);if(l>1){rx*=Math.sqrt(l);ry*=Math.sqrt(l)}
  const sg=(big!==sw?1:-1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*y1*y1-ry*ry*x1*x1)/(rx*rx*y1*y1+ry*ry*x1*x1))),cx1=sg*rx*y1/ry,cy1=-sg*ry*x1/rx,cx=co*cx1-si*cy1+(p[0]+q[0])/2,cy=si*cx1+co*cy1+(p[1]+q[1])/2;
  const t1=Math.atan2((y1-cy1)/ry,(x1-cx1)/rx);let dt=Math.atan2((-y1-cy1)/ry,(-x1-cx1)/rx)-t1;if(sw&&dt<0)dt+=TAU;if(!sw&&dt>0)dt-=TAU;const p0=p;
  flat(t=>t===1?q:[cx+rx*Math.cos(t1+dt*t)*co-ry*Math.sin(t1+dt*t)*si,cy+rx*Math.cos(t1+dt*t)*si+ry*Math.sin(t1+dt*t)*co],Math.abs(dt)*Math.max(rx,ry))};
 while(true){ws();if(i>=N)break;if(/[a-zA-Z]/.test(d[i]))cmd=d[i++];else if(!cmd)throw new Error('Befehl erwartet');
  const rel=cmd===cmd.toLowerCase(),C=cmd.toUpperCase(),P=()=>{const x=num(),y=num();return rel?[p[0]+x,p[1]+y]:[x,y]};
  if(C==='Z'){if(cur&&cur.pts.length>1){if(dist(cur.pts[cur.pts.length-1],cur.pts[0])<1e-7){cur.pts.pop();if(cur.bl.length>cur.pts.length)cur.bl.length=cur.pts.length}else cur.bl.push(0);cur.closed=true}p=st;cur=null;pc=pq=null;cmd='';continue}
  do{switch(C){
   case'M':moveTo(P());cmd=rel?'l':'L';pc=pq=null;break;
   case'L':lineTo(P());pc=pq=null;break;
   case'H':{const x=num();lineTo([rel?p[0]+x:x,p[1]]);pc=pq=null;break}
   case'V':{const y=num();lineTo([p[0],rel?p[1]+y:y]);pc=pq=null;break}
   case'C':case'S':{const a=p,b=C==='C'?P():(pc?sub(mul(p,2),pc):p),c=P(),e=P();flat(t=>{const u=1-t;return t===1?e:[u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*e[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*e[1]]},dist(a,b)+dist(b,c)+dist(c,e));pc=c;pq=null;break}
   case'Q':case'T':{const a=p,b=C==='Q'?P():(pq?sub(mul(p,2),pq):p),e=P();flat(t=>{const u=1-t;return t===1?e:[u*u*a[0]+2*u*t*b[0]+t*t*e[0],u*u*a[1]+2*u*t*b[1]+t*t*e[1]]},dist(a,b)+dist(b,e));pq=b;pc=null;break}
   case'A':{const rx=num(),ry=num(),phi=num()*D2R,big=flag(),sw=flag(),e=P();arcTo(rx,ry,phi,big,sw,e);pc=pq=null;break}
   default:throw new Error('Unbekannter Pfadbefehl '+cmd)}
   if(C==='M')break}while(more())}
 return subs.filter(s=>s.pts.length>1)}
function importSVG(text){const doc=new DOMParser().parseFromString(text,'image/svg+xml'),root=doc.documentElement;if(!root||root.nodeName.toLowerCase()!=='svg'||doc.querySelector('parsererror'))throw new Error('Das ist keine lesbare SVG-Datei.');
 const vb=(root.getAttribute('viewBox')||'').split(/[\s,]+/).filter(Boolean).map(Number),w=svgLen(root.getAttribute('width')),h=svgLen(root.getAttribute('height'));
 let M0,note='',docH=null;
 if(vb.length===4&&vb[2]>0&&vb[3]>0){const sx=w?w.mm/vb[2]:h?h.mm/vb[3]:25.4/96,sy=h?h.mm/vb[3]:sx;M0=[sx,0,0,sy,-vb[0]*sx,-vb[1]*sy];docH=vb[3]*sy;if(!w&&!h)note='Keine Größenangabe in der Datei – 96 Punkte je Zoll angenommen.'}
 else{M0=[25.4/96,0,0,25.4/96,0,0];note='Keine Maßangabe in der Datei – 96 Punkte je Zoll angenommen.'}
 const SH='http://www.shapertools.com/namespaces/shaper',out=[],skip=new Set(['defs','clippath','mask','symbol','pattern','marker','metadata','title','desc','style','script','text','image','use','lineargradient','radialgradient','filter','foreignobject']);let skipped=0;
 const A=(el,k)=>parseFloat(el.getAttribute(k))||0;
 const walk=(el,M)=>{const tag=el.localName.toLowerCase();if(skip.has(tag)){if(tag==='text'||tag==='use'||tag==='image')skipped++;return}
  if(el.getAttribute('display')==='none'||/display\s*:\s*none/.test(el.getAttribute('style')||''))return;
  if(el.hasAttribute('transform'))M=mmul(M,parseTransform(el.getAttribute('transform')));
  if(tag==='g'||tag==='svg'||tag==='a'||tag==='switch'){for(const c of el.children)walk(c,M);return}
  let d=null;
  if(tag==='path')d=el.getAttribute('d');
  else if(tag==='rect'){const x=A(el,'x'),y=A(el,'y'),W=A(el,'width'),H=A(el,'height');let rx=el.hasAttribute('rx')?A(el,'rx'):A(el,'ry'),ry=el.hasAttribute('ry')?A(el,'ry'):rx;rx=Math.min(rx,W/2);ry=Math.min(ry,H/2);if(W>0&&H>0)d=rx>0&&ry>0?`M${x+rx},${y}H${x+W-rx}A${rx},${ry} 0 0 1 ${x+W},${y+ry}V${y+H-ry}A${rx},${ry} 0 0 1 ${x+W-rx},${y+H}H${x+rx}A${rx},${ry} 0 0 1 ${x},${y+H-ry}V${y+ry}A${rx},${ry} 0 0 1 ${x+rx},${y}Z`:`M${x},${y}H${x+W}V${y+H}H${x}Z`}
  else if(tag==='circle'||tag==='ellipse'){const cx=A(el,'cx'),cy=A(el,'cy'),rx=tag==='circle'?A(el,'r'):A(el,'rx'),ry=tag==='circle'?rx:A(el,'ry');if(rx>0&&ry>0)d=`M${cx-rx},${cy}A${rx},${ry} 0 1 0 ${cx+rx},${cy}A${rx},${ry} 0 1 0 ${cx-rx},${cy}Z`}
  else if(tag==='line')d=`M${A(el,'x1')},${A(el,'y1')}L${A(el,'x2')},${A(el,'y2')}`;
  else if(tag==='polyline'||tag==='polygon'){const v=(el.getAttribute('points')||'').trim().split(/[\s,]+/).map(Number);if(v.length>=4&&v.every(isFinite))d='M'+v.slice(0,v.length-v.length%2).join(' ')+(tag==='polygon'?'Z':'')}
  else return;
  if(!d)return;const det=M[0]*M[3]-M[1]*M[2],sc=Math.sqrt(Math.abs(det)),sim=Math.abs(M[0]*M[2]+M[1]*M[3])<1e-9*Math.max(1e-9,sc*sc)&&Math.abs(Math.hypot(M[0],M[1])-Math.hypot(M[2],M[3]))<1e-9*Math.max(1e-9,sc);
  let subs;try{subs=parsePathD(d,sc)}catch(err){skipped++;return}
  const ct=el.getAttributeNS(SH,'cutType')||el.getAttribute('shaper:cutType'),cd=parseFloat(el.getAttributeNS(SH,'cutDepth')||el.getAttribute('shaper:cutDepth')),tool=parseFloat(el.getAttributeNS(SH,'toolDia')||el.getAttribute('shaper:toolDia'));
  for(const s of subs){let pts=s.pts,bl=s.bl;
   if(!sim&&bl.some(hasB)){const o=[pts[0]],m=s.closed?pts.length:pts.length-1;for(let k=0;k<m;k++)o.push(...segPtsTol(pts[k],pts[(k+1)%pts.length],bl[k],0.01/Math.max(sc,1e-9)));if(s.closed)o.pop();pts=o;bl=[]}
   pts=pts.map(p=>mapp(M,p));if(det>0)bl=bl.map(v=>-v);/* M enthält noch nicht das Umdrehen der Y-Achse */
   const e={pts,closed:s.closed};if(bl.some(hasB))e.bl=bl;if(ct&&CUTS[ct])e.ct=ct;if(cd>0)e.cd=cd;if(tool>0)e.tool=tool;out.push(e)}};
 walk(root,M0);
 /* Y umdrehen, links unten auf 0,0 */
 let y1=-Infinity;if(docH!=null)y1=docH;else for(const e of out)for(const p of e.pts)y1=Math.max(y1,p[1]);
 const ents=[];for(const e of out){e.pts=e.pts.map(p=>[p[0],y1-p[1]]);ents.push(tidyImported(e))}
 return{ents,note:[note,skipped?skipped+' Element(e) übersprungen (Schrift, Bilder, Verweise – in Pfade umwandeln, dann klappt es).':''].filter(Boolean).join(' ')}}
function segPtsTol(a,b,bu,tol){if(!hasB(bu))return[b];const q=bulgeArc(a,b,bu),sw=4*Math.atan(bu),st=2*Math.acos(clamp(1-tol/Math.max(q.r,tol),-1,1)),n=Math.max(2,Math.ceil(Math.abs(sw)/st)),t0=ang(sub(a,q.c)),o=[];for(let i=1;i<n;i++)o.push(pol(q.c,q.r,t0+sw*i/n));o.push(b);return o}
/* importierte Punktfolge in das passende Objekt umwandeln (ohne id/Ebene) */
function tidyImported(e){const keep=o=>{for(const k of['ct','cd','tool'])if(e[k]!=null)o[k]=e[k];return o};let{pts,bl,closed}=e;
 if(closed&&pts.length===2&&bl&&Math.abs(Math.abs(bl[0])-1)<1e-6&&Math.abs(bl[0]-bl[1])<1e-6)return keep({t:'circle',c:mid(pts[0],pts[1]),r:dist(pts[0],pts[1])/2});
 if(!bl&&pts.length>6){const f=fitArcs(pts,closed,{tol:0.006,rel:0.0006,sag:0.06});if(f.circle)return keep({t:'circle',...f.circle});pts=f.pts;bl=f.bl}
 if(!closed&&pts.length===2){if(bl&&hasB(bl[0])){const q=bulgeArc(pts[0],pts[1],bl[0]);return keep({t:'arc',c:q.c,r:q.r,a0:q.a0,a1:q.a1})}return keep({t:'line',a:pts[0],b:pts[1]})}
 const o={t:'pline',pts,closed:!!closed&&pts.length>2};if(bl&&bl.some(hasB))o.bl=bl;return keep(o)}

/* ---------- DXF lesen ---------- */
function importDXF(text){const ln=text.split(/\r\n|\r|\n/),pairs=[];for(let i=0;i+1<ln.length;i+=2){const c=parseInt(ln[i],10);if(isNaN(c))throw new Error('Das ist keine lesbare DXF-Datei (Textformat).');pairs.push([c,ln[i+1].trim()])}
 if(!pairs.some(p=>p[0]===0&&p[1]==='EOF')&&!pairs.some(p=>p[0]===2&&p[1]==='ENTITIES'))throw new Error('Das ist keine lesbare DXF-Datei (Textformat).');
 let unit=1,sec='',i=0;const blocks={},top=[];let curBlock=null,skipped={};
 const U={1:25.4,2:304.8,4:1,5:10,6:1000};
 const rec=()=>{const o={type:pairs[i][1],v:{},list:[]};i++;while(i<pairs.length&&pairs[i][0]!==0){const[c,v]=pairs[i];o.list.push([c,v]);if(!(c in o.v))o.v[c]=v;i++}return o};
 const f=(o,c,d=0)=>{const v=parseFloat(o.v[c]);return isFinite(v)?v:d};
 const raw=[];/* {ly, ent} */
 const conv=o=>{const ly=o.v[8]||'0',flip=f(o,230,1)<0,X=x=>flip?-x:x,res=[];
  switch(o.type){
  case'LINE':res.push({t:'line',a:[f(o,10),f(o,20)],b:[f(o,11),f(o,21)]});break;
  case'CIRCLE':res.push({t:'circle',c:[X(f(o,10)),f(o,20)],r:f(o,40)});break;
  case'ARC':{let a0=f(o,50)*D2R,a1=f(o,51)*D2R;if(flip)[a0,a1]=[Math.PI-a1,Math.PI-a0];res.push({t:'arc',c:[X(f(o,10)),f(o,20)],r:f(o,40),a0:na(a0),a1:na(a1)});break}
  case'LWPOLYLINE':{const pts=[],bl=[];for(const[c,v]of o.list){if(c===10){pts.push([X(parseFloat(v)),0]);bl.push(0)}else if(c===20&&pts.length)pts[pts.length-1][1]=parseFloat(v);else if(c===42&&pts.length)bl[bl.length-1]=(flip?-1:1)*parseFloat(v)}
   if(pts.length>1)res.push(tidyImported({pts,bl:bl.some(hasB)?bl:null,closed:(f(o,70)&1)===1}));break}
  case'ELLIPSE':{const c=[f(o,10),f(o,20)],mj=[f(o,11),f(o,21)],ra=f(o,40,1),a=len(mj),b=a*ra,th=ang(mj);let t0=f(o,41,0),t1=f(o,42,TAU);if(t1<=t0)t1+=TAU;const full=t1-t0>=TAU-1e-6;
   if(Math.abs(ra-1)<1e-6){res.push(full?{t:'circle',c,r:a}:{t:'arc',c,r:a,a0:na(th+t0),a1:na(th+t1)});break}
   const n=clamp(Math.ceil((t1-t0)/TAU*Math.sqrt(a/0.01)*8),16,720),pts=[];for(let k=0;k<=n-(full?1:0);k++){const t=t0+(t1-t0)*k/n;pts.push(add(c,rotP([a*Math.cos(t),b*Math.sin(t)],[0,0],th)))}
   res.push({t:'pline',pts,closed:full});break}
  case'SPLINE':{const deg_=Math.round(f(o,71,3)),kn=[],cp=[],fp=[];for(const[c,v]of o.list){if(c===40)kn.push(parseFloat(v));else if(c===10)cp.push([parseFloat(v),0]);else if(c===20&&cp.length)cp[cp.length-1][1]=parseFloat(v);else if(c===11)fp.push([parseFloat(v),0]);else if(c===21&&fp.length)fp[fp.length-1][1]=parseFloat(v)}
   let pts=null;if(cp.length>deg_&&kn.length===cp.length+deg_+1){const lo=kn[deg_],hi=kn[cp.length];let L=0;for(let k=1;k<cp.length;k++)L+=dist(cp[k-1],cp[k]);const n=clamp(Math.ceil(Math.sqrt(L/0.02))*2,16,2000);pts=[];
     for(let k=0;k<=n;k++){let t=lo+(hi-lo)*k/n;if(k===n)t=hi-1e-9*(hi-lo);let s=deg_;while(s<cp.length-1&&kn[s+1]<=t)s++;const d=[];for(let j=0;j<=deg_;j++)d.push([...cp[s-deg_+j]]);
      for(let r=1;r<=deg_;r++)for(let j=deg_;j>=r;j--){const den=kn[j+1+s-r]-kn[j+s-deg_],al=den?(t-kn[j+s-deg_])/den:0;d[j]=[(1-al)*d[j-1][0]+al*d[j][0],(1-al)*d[j-1][1]+al*d[j][1]]}pts.push(d[deg_])}
     pts[pts.length-1]=cp[cp.length-1]}else if(fp.length>1)pts=fp;else if(cp.length>1)pts=cp;
   if(pts){const cl=dist(pts[0],pts[pts.length-1])<1e-6;if(cl)pts.pop();res.push(tidyImported({pts,bl:null,closed:cl}))}break}
  case'TEXT':case'MTEXT':{let s=o.list.filter(p=>p[0]===3).map(p=>p[1]).join('')+(o.v[1]||'');s=s.replace(/\\P/g,' ').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'').replace(/%%c/gi,'Ø').replace(/%%d/gi,'°').replace(/%%p/gi,'±').trim();
   if(s)res.push({t:'text',p:[f(o,10),f(o,20)],s,h:f(o,40,10)||10,a:f(o,50)*D2R,ct:'guide'});break}
  case'XLINE':{const d=[f(o,11),f(o,21)];if(len(d)>1e-12)res.push({t:'xline',p:[f(o,10),f(o,20)],d:nrm(d)});break}
  default:skipped[o.type]=(skipped[o.type]||0)+1}
  return res.map(e=>({ly,e}))};
 while(i<pairs.length){const[c,v]=pairs[i];if(c!==0){i++;continue}
  if(v==='SECTION'){sec=(pairs[i+1]||[])[1]||'';i+=2;continue}
  if(v==='ENDSEC'){sec='';i++;continue}if(v==='EOF')break;
  if(sec==='HEADER'){i++;continue}
  if(sec==='BLOCKS'){if(v==='BLOCK'){const o=rec();curBlock={name:o.v[2]||'',base:[f(o,10),f(o,20)],items:[]};continue}if(v==='ENDBLK'){if(curBlock)blocks[curBlock.name]=curBlock;curBlock=null;rec();continue}}
  if(sec==='ENTITIES'||sec==='BLOCKS'||sec===''){const tgt=sec==='BLOCKS'?(curBlock?curBlock.items:[]):top;
   if(v==='POLYLINE'){const o=rec(),pts=[],bl=[];while(i<pairs.length&&pairs[i][1]==='VERTEX'){const q=rec();pts.push([f(q,10),f(q,20)]);bl.push(f(q,42))}if(i<pairs.length&&pairs[i][1]==='SEQEND')rec();
    if(pts.length>1)tgt.push({ly:o.v[8]||'0',e:tidyImported({pts,bl:bl.some(hasB)?bl:null,closed:(f(o,70)&1)===1})});continue}
   if(v==='INSERT'){const o=rec();tgt.push({ly:o.v[8]||'0',ins:{name:o.v[2],p:[f(o,10),f(o,20)],sx:f(o,41,1),sy:f(o,42,1),rot:f(o,50)*D2R}});continue}
   const o=rec();tgt.push(...conv(o));continue}
  i++}
 for(let k=0;k<pairs.length-1;k++)if(pairs[k][0]===9&&pairs[k][1]==='$INSUNITS'){unit=U[parseInt(pairs[k+1][1],10)]||1;break}
 const flat=[],expand=(items,depth,tf)=>{for(const it of items){if(it.ins){const b=blocks[it.ins.name];if(!b||depth>6){skipped.INSERT=(skipped.INSERT||0)+1;continue}
    if(Math.abs(Math.abs(it.ins.sx)-Math.abs(it.ins.sy))>1e-9||it.ins.sx<0||it.ins.sy<0){skipped['INSERT (verzerrt)']=(skipped['INSERT (verzerrt)']||0)+1;continue}
    const ins=it.ins;expand(b.items,depth+1,e=>tf(xf(scaleEnt(xf(e,mvF(mul(b.base,-1))),[0,0],ins.sx),p=>add(rotP(p,[0,0],ins.rot),ins.p),'rot')))}
   else flat.push({ly:it.ly,e:tf(it.e)})}};
 expand(top,0,e=>e);
 const ents=flat.map(({ly,e})=>{const n=unit===1?e:scaleEnt(e,[0,0],unit);n.ly=ly;return n}).filter(e=>!(e.t==='circle'&&!(e.r>0))&&!(e.t==='line'&&dist(e.a,e.b)<1e-9));
 const sk=Object.entries(skipped).filter(([k])=>!['POINT','VIEWPORT','ATTDEF','ATTRIB','SEQEND','VERTEX'].includes(k)).map(([k,n])=>n+' × '+k).join(', ');
 return{ents,note:(unit!==1?`Einheit der Datei umgerechnet (× ${unit}). `:'')+(sk?'Übersprungen: '+sk+'.':'')}}

/* ---------- Öffnen / Importieren ---------- */
const LYCOLS=['#ff9f43','#ff6b9a','#b388ff','#7bd88f','#ffd166','#5ad1e8'];
function ensureLayer(n){if(!lyr(n))S.layers.push({n,c:LYCOLS[S.layers.length%LYCOLS.length],v:true})}
function addEnts(list,defLy){const made=[];for(const e of list){const n=clone(e);n.ly=n.ly||defLy||S.cur;ensureLayer(n.ly);n.id=S.nid++;S.ents.push(n);made.push(n)}return made}
let fileMode='open';
async function loadFile(f,mode){const name=f.name||'Datei',ext=(name.split('.').pop()||'').toLowerCase();let text;try{text=await f.text()}catch(err){log('Datei konnte nicht gelesen werden.','e');return}
 try{
  if(ext==='json'||(/^\s*\{/.test(text)&&ext!=='svg'&&ext!=='dxf')){const o=JSON.parse(text);if(!Array.isArray(o.ents))throw new Error('Das ist keine Origin-CAD-Zeichnung.');
   if(mode==='import'){pushUndo();(o.layers||[]).forEach(l=>{if(!lyr(l.n))S.layers.push({...l})});sel.clear();addEnts(o.ents.map(({id,...r})=>r)).forEach(e=>sel.add(e.id));afterChange();zoomAll();log(`Dazugeladen: ${name} (${o.ents.length} Objekte, sind gewählt – mit V verschieben).`,'ok');return}
   pushUndo();S={ents:o.ents,layers:o.layers&&o.layers.length?o.layers:DEF_LAYERS(),cur:o.cur||'0',nid:Math.max(o.nid||1,...o.ents.map(x=>x.id+1),1),def:Object.assign(DEF_CUT(),o.def||{})};if(o.korpus&&Array.isArray(o.korpus.cabs)&&o.korpus.cabs.length)S.korpus=o.korpus;if(o.raum&&Array.isArray(o.raum.bodies))S.raum=o.raum;if(!lyr(S.cur))S.cur=S.layers[0].n;
   sel.clear();afterChange();updDefs();zoomAll();fileName=name;$('fname').textContent=name+' · Maße in mm';log('Geöffnet: '+name,'ok');return}
  const isSvg=ext==='svg'||/<svg[\s>]/i.test(text.slice(0,2000)),r=isSvg?importSVG(text):importDXF(text);
  if(!r.ents.length){log(`In ${name} wurde nichts Zeichenbares gefunden. ${r.note}`,'e');return}
  pushUndo();if(mode!=='import'){S={ents:[],layers:DEF_LAYERS(),cur:'Kontur',nid:1,def:{...S.def}};fileName=name.replace(/\.[^.]+$/,'')+'.json';$('fname').textContent=name+' · Maße in mm'}
  sel.clear();const made=addEnts(r.ents,isSvg?'Kontur':'0');if(mode==='import')made.forEach(e=>sel.add(e.id));afterChange();zoomAll();const b=bbox(made);
  log(`${mode==='import'?'Dazugeladen':'Geöffnet'}: ${name} – ${made.length} Objekte, ${fmtDE(b[2]-b[0])} × ${fmtDE(b[3]-b[1])} mm.${mode==='import'?' Sie sind gewählt – mit V verschieben.':''} ${r.note}`,'ok');
  log('Stimmt die Größe nicht? Alles wählen (Strg+A) und mit SK skalieren.')}
 catch(err){log(`${name}: ${err&&err.message?err.message:'Datei konnte nicht gelesen werden.'}`,'e')}}
$('file').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)loadFile(f,fileMode)});
/* Datei aufs Fenster ziehen = öffnen */
window.addEventListener('dragover',e=>{e.preventDefault()});window.addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer&&e.dataTransfer.files[0];if(f)loadFile(f,S.ents.length?'import':'open')});

/* ---------- Vorlagen ---------- */
const TPLKEY='origincad.tpl';
function userTpls(){try{const a=JSON.parse(localStorage.getItem(TPLKEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function setUserTpls(a){try{localStorage.setItem(TPLKEY,JSON.stringify(a));return true}catch(e){log('Vorlage konnte nicht gespeichert werden (Speicher voll?).','e');return false}}
const HOLE=(c,d,t,x={})=>({t:'circle',ly:'Kontur',c,r:d/2,ct:'pocket',cd:t,...x});
function builtinTpls(){const K='Kontur',row=(x,y0,n)=>Array.from({length:n},(_,i)=>HOLE([x,y0+i*32],5,13,{tool:3}));
 return[
 {n:'Topfband Ø35 mit Dübellöchern (Blum 45/9,5)',d:'Einfügepunkt = Topfmitte, Türkante links',base:[0,0],ents:[HOLE([0,0],35,13),HOLE([9.5,22.5],8,11),HOLE([9.5,-22.5],8,11)]},
 {n:'Topfband Ø35 mit Dübellöchern (Hettich 48/6)',d:'Einfügepunkt = Topfmitte, Türkante links',base:[0,0],ents:[HOLE([0,0],35,13),HOLE([6,24],8,11),HOLE([6,-24],8,11)]},
 {n:'Schrankseite 720 × 560 mit Lochreihen (System 32)',d:'Lochreihen 37 mm von vorn und hinten',base:[0,0],ents:[{t:'pline',ly:K,pts:[[0,0],[560,0],[560,720],[0,720]],closed:true,rect:true},...row(37,48,20),...row(523,48,20)]},
 {n:'Griffmulde 120 × 30',d:'Langloch als Tasche, 12 mm tief',base:[0,0],ents:[{t:'slot',ly:K,a:[-45,0],b:[45,0],r:15,ct:'pocket',cd:12}]},
 {n:'Kabeldurchlass Ø60',d:'Innenausschnitt',base:[0,0],ents:[{t:'circle',ly:K,c:[0,0],r:30,ct:'inside'}]},
 {n:'Eckverbinder-Bohrbild 3 × Ø8 (Abstand 32)',d:'Dübelreihe, 12 mm tief',base:[0,0],ents:[HOLE([0,0],8,12),HOLE([32,0],8,12),HOLE([64,0],8,12)]}]}
function* placeTpl(t){const base=t.base||(()=>{const b=bbox(t.ents.filter(e=>e.t!=='dim'))||bbox(t.ents)||[0,0];return[b[0],b[1]]})();
 const at=(p,a)=>t.ents.map(e=>{let n=xf(e,mvF(sub(p,base)));if(a)n=xf(n,rotF(p,a),'rot');return n});let a=0;
 for(;;){const r=yield P(`„${t.n}“ – Einfügepunkt  [D]rehen um 90° · Enter = fertig`,{opts:['D'],prev:p=>at(p,a).map(e=>Object.assign(tmp(e.t,e),{ly:e.ly}))});
  if(r.opt==='D'){a=na(a+Math.PI/2);continue}if(!r.p)return;const q=r.p;doCommit(()=>addEnts(at(q,a).map(({id,...x})=>x)))}}
function runWith(gen,label){cancel(true);curCmd=null;log('» '+label,'ok');G=gen;adv(undefined)}
function openTpls(){const u=userTpls(),b=builtinTpls();
 const li=(t,i,own)=>`<tr><td><b>${esc(t.n)}</b><br><span class="muted">${esc(t.d||t.ents.length+' Objekte')}</span></td><td style="white-space:nowrap;text-align:right"><button class="btn" data-tpl="${own?'u':'b'}${i}">Einfügen</button>${own?` <button class="btn" data-tpldel="${i}" aria-label="Vorlage löschen">Löschen</button>`:''}</td></tr>`;
 $('tplT').innerHTML=(u.length?'<tr><th colspan="2">Eigene Vorlagen</th></tr>'+u.map((t,i)=>li(t,i,true)).join(''):'')+'<tr><th colspan="2">Mitgelieferte Vorlagen</th></tr>'+b.map((t,i)=>li(t,i,false)).join('');
 $('dTpl').classList.add('open')}
$('tplT').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tpldel!=null){const u=userTpls();const[x]=u.splice(+b.dataset.tpldel,1);if(setUserTpls(u)){log('Vorlage gelöscht: '+x.n);openTpls()}return}
 const k=b.dataset.tpl;if(!k)return;const t=(k[0]==='u'?userTpls():builtinTpls())[+k.slice(1)];if(!t)return;$('dTpl').classList.remove('open');runWith(placeTpl(t),'Vorlage einfügen')});
function openSaveTpl(){const es=[...sel].map(byId).filter(Boolean);$('tplInfo').textContent=es.length?`${es.length} gewählte Objekte werden als Vorlage gespeichert.`:`Nichts gewählt – die ganze Zeichnung (${S.ents.length} Objekte) wird als Vorlage gespeichert.`;
 if(!es.length&&!S.ents.length){log('Die Zeichnung ist leer.','e');return}$('tplName').value='';$('dTplSave').classList.add('open');setTimeout(()=>$('tplName').focus(),50)}
$('tplSaveF').addEventListener('submit',e=>{e.preventDefault();const n=$('tplName').value.trim();if(!n)return;let es=[...sel].map(byId).filter(Boolean);if(!es.length)es=S.ents;
 const u=userTpls().filter(t=>t.n!==n);u.unshift({n,d:`${es.length} Objekte`,ents:es.map(({id,...r})=>clone(r))});if(setUserTpls(u)){$('dTplSave').classList.remove('open');log(`Vorlage „${n}“ gespeichert. Einfügen mit VO.`,'ok')}});

/* ---------- Drucken / PDF ---------- */
function buildPrintSVG(){const es=S.ents.filter(e=>vis(e)&&e.t!=='xline'),b=bbox(es);if(!b)return null;const w0=b[2]-b[0],h0=b[3]-b[1],mg=Math.max(w0,h0)*0.06+5,x0=b[0]-mg,y1=b[3]+mg,W=w0+2*mg,H=h0+2*mg,fs=Math.max(W,H)/75,n=v=>fmt(v,3);
 const pt=p=>n(p[0]-x0)+' '+n(y1-p[1]);let body='';
 const d=e=>segsOf(e).map(sp=>'M'+pt(sp.s)+sp.segs.map(s=>s.r?`A${n(s.r)} ${n(s.r)} 0 ${s.big?1:0} ${s.ccw?0:1} ${pt(s.p)}`:'L'+pt(s.p)).join('')+(sp.closed?'Z':'')).join('');
 for(const e of es){if(e.t==='dim'){const g=dimGeom(e),u=pol([0,0],1,g.th),t=mul(rotP(u,[0,0],Math.PI/4),fs*0.45);
   body+=`<path class="dm" d="${g.lines.map(([a,c])=>'M'+pt(a)+'L'+pt(c)).join('')}${[g.d1,g.d2].map(q=>'M'+pt(sub(q,t))+'L'+pt(add(q,t))).join('')}"/>`;
   let th=-g.th;if(th>Math.PI/2+1e-6)th-=Math.PI;if(th<-Math.PI/2-1e-6)th+=Math.PI;
   body+=`<text font-size="${n(fs)}" text-anchor="middle" transform="translate(${n(g.m[0]-x0)} ${n(y1-g.m[1])}) rotate(${n(deg(th))})" y="${n(-fs*0.3)}">${esc((g.pre||'')+fmtDE(g.val))}</text>`;continue}
  const c=cutOf(e);body+=`<path class="${c.eff==='guide'?'gd':'ob'}" d="${d(e)}"/>`}
 return{svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(W)} ${n(H)}" style="width:100%;height:auto;max-height:100%"><style>path{fill:none;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.ob{stroke:#000;stroke-width:1.3px}.gd{stroke:#2a5bd7;stroke-width:.8px;stroke-dasharray:6 3 1 3}.dm{stroke:#444;stroke-width:.7px}text{font-family:Arial,Helvetica,sans-serif;fill:#222}</style>${body}</svg>`,W,H,w0,h0}}
function printDrawing(){const r=buildPrintSVG();if(!r){log('Die Zeichnung ist leer.','e');return}const w=window.open('','_blank');if(!w){log('Das Druckfenster wurde vom Browser blockiert – Pop-ups für diese Seite erlauben.','e');return}
 const land=r.W>=r.H,heute=new Date().toLocaleDateString('de-DE');
 w.document.write(`<!doctype html><html lang="de"><meta charset="utf-8"><title>${esc(baseName())}</title><style>@page{size:A4 ${land?'landscape':'portrait'};margin:10mm}html,body{height:100%;margin:0}body{font:11pt Arial,Helvetica,sans-serif;display:flex;flex-direction:column}.z{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}.z svg{max-height:${land?'165mm':'250mm'}}.k{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #000;padding-top:4px;font-size:9.5pt}</style><div class="z">${r.svg}</div><div class="k"><b>${esc(baseName())}</b><span>Größe ${fmtDE(r.w0)} × ${fmtDE(r.h0)} mm · Maße in mm · an die Seite angepasst, nicht maßstäblich</span><span>${heute} · Origin CAD</span></div></html>`);
 w.document.close();w.focus();setTimeout(()=>w.print(),350);log('Druckansicht geöffnet – im Druckfenster „Als PDF speichern“ wählen, wenn du eine PDF willst.','ok')}

/* Geschlossene Konturen als Flächen mit Löchern (für „hochziehen“ im 3D-Modus): gewählte oder alle sichtbaren */
function contours(){const pick=e=>e.t!=='dim'&&e.t!=='xline'&&vis(e)&&isClosed(e)&&cutOf(e).eff!=='guide';let es=[...sel].map(byId).filter(e=>e&&pick(e));const bySel=es.length>0;if(!bySel)es=S.ents.filter(pick);
 const P=es.map(e=>({e,pts:ccw(pathsOf(e)[0].pts)})),inside=(a,b)=>a!==b&&Math.abs(area(a.pts))<Math.abs(area(b.pts))&&inPoly(a.pts[0],b.pts);
 const outer=P.filter(a=>P.filter(b=>inside(a,b)).length%2===0),out=[];
 for(const o of outer){const holes=P.filter(h=>inside(h,o)&&P.filter(b=>inside(h,b)).length%2===1&&P.filter(b=>inside(h,b)&&inside(b,o)).length===0&&['inside','outside'].includes(cutOf(h.e).eff));
  for(const pg of clEx('ctDifference',[o.pts],holes.map(h=>h.pts))){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const q of pg.outer){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1])}
   const mv=r=>r.map(q=>[+(q[0]-x0).toFixed(3),+(q[1]-y0).toFixed(3)]);out.push({outer:mv(pg.outer),holes:pg.holes.map(mv),at:[x0,y0],w:+(x1-x0).toFixed(3),h:+(y1-y0).toFixed(3),depth:cutOf(o.e).d})}}
 return{list:out,bySel}}

/* ---------- 3D-Ansicht: Platte in Schichten zerlegen ---------- */
function clEx(type,subj,clip){const c=new CL.Clipper();c.AddPaths(subj.map(toCl),CL.PolyType.ptSubject,true);if(clip&&clip.length)c.AddPaths(clip.map(toCl),CL.PolyType.ptClip,true);const t=new CL.PolyTree();
 c.Execute(CL.ClipType[type],t,CL.PolyFillType.pftNonZero,CL.PolyFillType.pftNonZero);const cl=q=>fromCl(CL.Clipper.CleanPolygon(q,SC*0.004));
 return CL.JS.PolyTreeToExPolygons(t).map(x=>({outer:cl(x.outer),holes:x.holes.map(cl).filter(h=>h.length>2)})).filter(x=>x.outer.length>2)}
/* Platte in Schichten: base = Umriss(e), cuts = [{d: Tiefe, polys}] */
function sectionsOf(base,cuts,T){const lv=[...new Set(cuts.map(c=>+Math.min(c.d,T).toFixed(4)))].filter(d=>d<T-1e-6&&d>1e-6).sort((a,b)=>a-b),zs=[0,...lv,T],sections=[];let vol=0;
 const baseU=clBool('ctUnion',base,[]);
 for(let i=0;i<zs.length-1;i++){const z0=zs[i],z1=zs[i+1],rem=cuts.filter(c=>c.d>=z1-1e-6).flatMap(c=>c.polys),polys=clEx('ctDifference',baseU,rem);
  if(polys.length){sections.push({z0,z1,polys});for(const pg of polys)vol+=(Math.abs(area(pg.outer))-pg.holes.reduce((s,h)=>s+Math.abs(area(h)),0))*(z1-z0)}}
 return{sections,vol,baseU}}
function build3D(T){T=T||S.def.thick||19;const es=exportList(false),notes=[];if(!es.length)return null;
 const P=e=>ccw(pathsOf(e)[0].pts);let base=[];const cuts=[];let deeper=0,partOut=0,partIn=0;
 for(const e of es){const c=cutOf(e);if(c.eff==='guide')continue;
  if(c.eff==='outside'){base.push(P(e));if(c.d<T-1e-6)partOut++;continue}
  let d=c.d;if(d>T+1e-6){deeper++}d=Math.min(d,T);if(d<=1e-6)continue;
  if(c.eff==='pocket')cuts.push({d,polys:[P(e)]});
  else if(c.eff==='inside'){if(d>=T-1e-6)cuts.push({d:T,polys:[P(e)]});else{partIn++;const p=P(e),inner=clOffset([p],-c.tool);cuts.push({d,polys:clBool('ctDifference',[p],inner)})}}
  else if(c.eff==='online'){const b=camOf(e).band;if(b.length)cuts.push({d,polys:b})}}
 const bb=bbox(es);
 if(!base.length){const m=10;base=[[[bb[0]-m,bb[1]-m],[bb[2]+m,bb[1]-m],[bb[2]+m,bb[3]+m],[bb[0]-m,bb[3]+m]]];notes.push('Keine Außenkontur gefunden – es wird eine Rohplatte mit 10 mm Rand angenommen.')}
 if(partOut)notes.push(`${partOut} Außenkontur(en) sind nicht ganz durchgefräst (Tiefe kleiner als die Plattenstärke) – in 3D trotzdem als fertiges Teil gezeigt.`);
 if(partIn)notes.push(`${partIn} Innen-Ausschnitt(e) sind nicht ganz durchgefräst – zu sehen ist nur die Nut in Fräserbreite. Für ein Loch die Tiefe auf die Plattenstärke stellen.`);
 if(deeper)notes.push(`${deeper} Fräsung(en) sind tiefer als die Platte – sie gehen in 3D ganz durch.`);
 const{sections,vol,baseU}=sectionsOf(base,cuts,T);
 if(!sections.length)return null;
 const ob=[Infinity,Infinity,-Infinity,-Infinity];for(const q of baseU)for(const p of q){ob[0]=Math.min(ob[0],p[0]);ob[1]=Math.min(ob[1],p[1]);ob[2]=Math.max(ob[2],p[0]);ob[3]=Math.max(ob[3],p[1])}
 const w=ob[2]-ob[0],h=ob[3]-ob[1];
 return{T,sections,notes,bbox:ob,size:Math.max(w,h,T),vol,info:`${fmtDE(w)} × ${fmtDE(h)} × ${fmtDE(T)} mm · ${cuts.length} Fräsung(en)`}}
function open3D(){const m=build3D();if(!m){log('Für die 3D-Ansicht fehlt noch etwas zum Fräsen – erst eine Kontur zeichnen.','e');return}cancel(true);
 if(window.CAD3D)window.CAD3D.open(m,v=>{pushUndo();S.def.thick=v;save();updUndo();return build3D(v)})}

/* ---------- Start ---------- */
function sample0(){const K='Kontur',B='Bemaßung';S.nid=1;S.ents=[
 mk('pline',{pts:[[0,0],[400,0],[400,600],[0,600]],closed:true,rect:true},K),
 mk('circle',{c:[21.5,100],r:17.5},K),mk('circle',{c:[21.5,500],r:17.5},K),
 mk('slot',{a:[360,250],b:[360,350],r:10},K),
 mk('dim',{a:[0,0],b:[400,0],p:[200,-45],m:'h'},B),mk('dim',{a:[0,0],b:[0,600],p:[-45,300],m:'v'},B),
 mk('dim',{a:[400,0],b:[360,250],p:[440,125],m:'v'},B)]}
let restored=false;try{const o=JSON.parse(localStorage.getItem('origincad.v1')||'null');if(o&&Array.isArray(o.ents)){S=o;S.def=Object.assign(DEF_CUT(),o.def||{});restored=true}const u=JSON.parse(localStorage.getItem('origincad.ui')||'null');if(u){Object.assign(tg,u.tg||{});gstep=u.gstep||10;$('gstep').value=gstep;if([90,45,30,15].includes(u.pstep))pstep=u.pstep;$('pstep').value=pstep}}catch(e){}
if(!restored){sample0();log('Beispiel: Front 400 × 600 mit zwei Topfbändern Ø35 und Griffloch. Datei › Neu leert die Zeichnung.')}
else log('Letzte Zeichnung wiederhergestellt.');
log('Tipp: L + Enter für Linie, R für Rechteck, K für Kreis. F1 zeigt alle Befehle.');
buildTools();updTools();updUndo();updDefs();updProps();updLayers();updPrompt();
new ResizeObserver(()=>{const first=!W;resize();if(first)zoomAll()}).observe($('cvw'));
if(matchMedia('(pointer:fine)').matches)inp.focus();
window.__cad={buildPrintSVG,kp:{contours,sectionsOf,commit:doCommit,undo,redo,addEnts,saveBlob,baseName,log,fmtDE,bbox,esc,cancel:()=>cancel(true),after:()=>{sel.clear();afterChange();zoomAll()},select:es=>{sel.clear();es.forEach(e=>sel.add(e.id));updProps();render()}},build3D,open3D,get curP(){return curP},setMouse:sp=>{mouse.sp=sp;mouse.in=true;computeSnap();render()},buildSVG,buildDXF,importSVG,importDXF,loadFile,exportList,fitArcs,userTpls,w2s,get S(){return S},run,onEnter,inp,adv,get REQ(){return REQ},sel,zoomAll,cutOf,camOf,act,tg,updProps,bbox,
 areaOf:(id,off)=>{const P=[ccw(toPaths(byId(id))[0].pts)];return(off?clOffset(P,off):P).reduce((s,q)=>s+area(q),0)}};
}
