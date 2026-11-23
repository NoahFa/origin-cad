/* Origin CAD – Boolesche Operationen für 3D-Körper (Vereinigen, Abziehen, Schnittmenge).
   Eigene Umsetzung des bekannten BSP-Baum-Verfahrens (wie in csg.js von Evan Wallace, MIT-Lizenz).
   Eingabe: Listen von Dreiecken [[x,y,z],[x,y,z],[x,y,z]] mit Umlaufsinn nach außen (rechte Hand).
   Ausgabe: Liste von Dreiecken. Wirft einen Fehler, wenn die Rechnung zu groß wird. */
window.CSG=(()=>{
const EPS=1e-4;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
 dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
let work=0,LIMIT=0;
function plane(a,b,c){const n=cross(sub(b,a),sub(c,a)),l=Math.hypot(...n);if(!(l>1e-12))return null;const m=mul(n,1/l);return{n:m,w:dot(m,a)}}
const flipP=p=>({vs:[...p.vs].reverse(),pl:{n:mul(p.pl.n,-1),w:-p.pl.w}});
/* Polygon an einer Ebene teilen: gleichliegend vorn/hinten, ganz vorn, ganz hinten oder zerschnitten */
function split(pl,p,cf,cb,f,b){if(++work>LIMIT)throw new Error('zu groß');let t=0;const ty=p.vs.map(v=>{const d=dot(pl.n,v)-pl.w,k=d<-EPS?2:d>EPS?1:0;t|=k;return k});
 if(t===0)(dot(pl.n,p.pl.n)>0?cf:cb).push(p);else if(t===1)f.push(p);else if(t===2)b.push(p);
 else{const F=[],B=[],n=p.vs.length;for(let i=0;i<n;i++){const j=(i+1)%n,ti=ty[i],tj=ty[j],vi=p.vs[i],vj=p.vs[j];if(ti!==2)F.push(vi);if(ti!==1)B.push(vi);
   if((ti|tj)===3){const tt=(pl.w-dot(pl.n,vi))/dot(pl.n,sub(vj,vi)),v=add(vi,mul(sub(vj,vi),tt));F.push(v);B.push([...v])}}
  if(F.length>=3)f.push({vs:F,pl:p.pl});if(B.length>=3)b.push({vs:B,pl:p.pl})}}
/* BSP-Knoten – ohne Rekursion aufgebaut, damit auch tiefe Bäume nicht den Stapel sprengen */
function node(){return{pl:null,f:null,b:null,ps:[]}}
function build(root,ps){const st=[[root,ps]];while(st.length){const[nd,list]=st.pop();if(!list.length)continue;if(!nd.pl)nd.pl=list[0].pl;const f=[],b=[];
  for(const p of list)split(nd.pl,p,nd.ps,nd.ps,f,b);if(f.length){if(!nd.f)nd.f=node();st.push([nd.f,f])}if(b.length){if(!nd.b)nd.b=node();st.push([nd.b,b])}}}
function all(root){const o=[],st=[root];while(st.length){const n=st.pop();o.push(...n.ps);if(n.f)st.push(n.f);if(n.b)st.push(n.b)}return o}
function invert(root){const st=[root];while(st.length){const n=st.pop();n.ps=n.ps.map(flipP);if(n.pl)n.pl={n:mul(n.pl.n,-1),w:-n.pl.w};const t=n.f;n.f=n.b;n.b=t;if(n.f)st.push(n.f);if(n.b)st.push(n.b)}}
/* Polygone entfernen, die im Körper des Baums liegen */
function clipPolys(root,ps){let out=[];const st=[[root,ps]];while(st.length){const[n,list]=st.pop();if(!n.pl){out.push(...list);continue}const f=[],b=[];for(const p of list)split(n.pl,p,f,b,f,b);
  if(n.f)st.push([n.f,f]);else out.push(...f);if(n.b)st.push([n.b,b])}return out}
function clipTo(a,b){const st=[a];while(st.length){const n=st.pop();n.ps=clipPolys(b,n.ps);if(n.f)st.push(n.f);if(n.b)st.push(n.b)}}
function toPolys(tris){const o=[];for(const t of tris){const pl=plane(t[0],t[1],t[2]);if(pl)o.push({vs:t.map(v=>[...v]),pl})}return o}
function run(A,B,mode,limit){work=0;LIMIT=limit||4e6;const a=node(),b=node();build(a,toPolys(A));build(b,toPolys(B));
 if(mode==='union'){clipTo(a,b);clipTo(b,a);invert(b);clipTo(b,a);invert(b);build(a,all(b))}
 else if(mode==='subtract'){invert(a);clipTo(a,b);clipTo(b,a);invert(b);clipTo(b,a);invert(b);build(a,all(b));invert(a)}
 else{invert(a);clipTo(b,a);invert(b);clipTo(a,b);clipTo(b,a);build(a,all(b));invert(a)}
 const out=[];for(const p of all(a))for(let i=1;i+1<p.vs.length;i++)out.push([p.vs[0],p.vs[i],p.vs[i+1]]);return out}
return{run}})();
