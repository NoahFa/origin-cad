/* Origin CAD – 3D-Ansicht (eigener kleiner WebGL-Betrachter, keine weitere Bibliothek außer earcut fürs Zerlegen in Dreiecke).
   Modell: Teile (Platten). Jedes Teil hat Schichten von der Bohrseite nach unten (Flächen mit Löchern zwischen zwei Tiefen)
   und eine Lage im Raum: o = Ursprung, u/v = Richtung der Zeichnungs-X/Y-Achse, Dicke läuft in Richtung u×v. */
window.CAD3D=(()=>{
const $=id=>document.getElementById(id);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return[a[0]/l,a[1]/l,a[2]/l]};
const BASE={top:[0.86,0.72,0.52],floor:[0.72,0.58,0.40],wall:[0.63,0.49,0.32],bottom:[0.78,0.65,0.47]},EDGE=[0.16,0.11,0.06];
function mesh(m){const P=[],Nn=[],C=[],L=[];
 const parts=m.parts||[{T:m.T,sections:m.sections,o:[0,0,0],u:[1,0,0],v:[0,1,0]}];
 for(const pt of parts){if(pt.hide)continue;const o=pt.o,u=pt.u,v=pt.v,w=cross(u,v),tint=pt.tint||[1,1,1],pc=pt.color,F={top:1,floor:0.84,wall:0.73,bottom:0.9};
  const X=(x,y,z)=>[o[0]+u[0]*x+v[0]*y+w[0]*z,o[1]+u[1]*x+v[1]*y+w[1]*z,o[2]+u[2]*x+v[2]*y+w[2]*z],col=k=>pc?[Math.min(1,pc[0]*F[k]*tint[0]),Math.min(1,pc[1]*F[k]*tint[1]),Math.min(1,pc[2]*F[k]*tint[2])]:[BASE[k][0]*tint[0],BASE[k][1]*tint[1],BASE[k][2]*tint[2]];
  const tri=(a,b,c,n,cl)=>{P.push(...a,...b,...c);for(let i=0;i<3;i++){Nn.push(...n);C.push(...cl)}};
  const nUp=w,nDn=[-w[0],-w[1],-w[2]],cT=col('top'),cF=col('floor'),cW=col('wall'),cB=col('bottom');let prev=new Set();
  for(const s of pt.sections){const za=pt.T-s.z0,zb=pt.T-s.z1,last=s===pt.sections[pt.sections.length-1],cur=new Set();
   for(const pg of s.polys){const rings=[pg.outer,...pg.holes],flat=[],holes=[];let n=0;
    for(let r=0;r<rings.length;r++){if(r)holes.push(n);for(const p of rings[r]){flat.push(p[0],p[1]);n++}}
    const idx=window.earcut(flat,holes,2),ct=s.z0<1e-9?cT:cF;
    for(let i=0;i<idx.length;i+=3){const a=idx[i]*2,b=idx[i+1]*2,c=idx[i+2]*2;tri(X(flat[a],flat[a+1],za),X(flat[b],flat[b+1],za),X(flat[c],flat[c+1],za),nUp,ct);
     if(last)tri(X(flat[a],flat[a+1],zb),X(flat[c],flat[c+1],zb),X(flat[b],flat[b+1],zb),nDn,cB)}
    for(const ring of rings){const k=ring.length;for(let i=0;i<k;i++){const a=ring[i],b=ring[(i+1)%k],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=dy/l,ny=-dx/l,nn=[u[0]*nx+v[0]*ny,u[1]*nx+v[1]*ny,u[2]*nx+v[2]*ny];
      const A1=X(a[0],a[1],za),A2=X(a[0],a[1],zb),B1=X(b[0],b[1],za),B2=X(b[0],b[1],zb);tri(A1,A2,B2,nn,cW);tri(A1,B2,B1,nn,cW);
      const key=a[0].toFixed(3)+','+a[1].toFixed(3)+','+b[0].toFixed(3)+','+b[1].toFixed(3);cur.add(key);
      if(!prev.has(key))L.push(...A1,...B1);if(last)L.push(...A2,...B2)}}}prev=cur}}
 return{P:new Float32Array(P),N:new Float32Array(Nn),C:new Float32Array(C),L:new Float32Array(L)}}
/* Matrizen (spaltenweise) */
const mul4=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o};
function persp(fov,asp,n,f){const t=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o}
function look(e,c,up){const z=norm(sub(e,c)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1])}
const VS=`attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 m;varying vec3 vn;varying vec3 vc;void main(){vn=n;vc=c;gl_Position=m*vec4(p,1.);}`;
const FS=`precision mediump float;varying vec3 vn;varying vec3 vc;uniform vec3 l;uniform vec3 l2;uniform float uf;uniform vec3 fc;void main(){if(uf>.5){gl_FragColor=vec4(fc,1.);return;}vec3 nn=normalize(vn);float d=max(dot(nn,l),0.)*.62+max(dot(nn,l2),0.)*.2+.36;gl_FragColor=vec4(vc*d,1.);}`;
/* Ein Betrachter je Zeichenfläche */
function create(cv){let gl=null,prog,loc,bufs=null,model=null,raf=0;const cam={az:-0.6,el:0.75,dist:1000,tx:0,ty:0,tz:0};
 function init(){gl=cv.getContext('webgl',{antialias:true})||cv.getContext('experimental-webgl');if(!gl)return false;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){gl=null;return false}gl.useProgram(prog);
  loc={p:gl.getAttribLocation(prog,'p'),n:gl.getAttribLocation(prog,'n'),c:gl.getAttribLocation(prog,'c'),m:gl.getUniformLocation(prog,'m'),l:gl.getUniformLocation(prog,'l'),l2:gl.getUniformLocation(prog,'l2'),uf:gl.getUniformLocation(prog,'uf'),fc:gl.getUniformLocation(prog,'fc')};return true}
 function upload(g){const mk=d=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);return b};
  if(bufs)for(const k of['P','N','C','L'])gl.deleteBuffer(bufs[k]);bufs={P:mk(g.P),N:mk(g.N),C:mk(g.C),L:mk(g.L),nt:g.P.length/3,nl:g.L.length/3}}
 function eye(){const ce=Math.cos(cam.el);return[cam.tx+cam.dist*ce*Math.sin(cam.az),cam.ty-cam.dist*ce*Math.cos(cam.az),cam.tz+cam.dist*Math.sin(cam.el)]}
 function draw(){raf=0;if(!gl||!bufs||!model)return;const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);if(!w||!h)return;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
  gl.viewport(0,0,w,h);gl.clearColor(0.09,0.10,0.115,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
  const e=eye(),t=[cam.tx,cam.ty,cam.tz],up=Math.abs(Math.cos(cam.el))<1e-3?[Math.sin(cam.az)*-Math.sign(cam.el),Math.cos(cam.az)*Math.sign(cam.el),0]:[0,0,1];
  gl.uniformMatrix4fv(loc.m,false,mul4(persp(0.6,w/h,Math.max(cam.dist/200,0.5),cam.dist*20+model.size*4),look(e,t,up)));
  const ld=norm(sub(e,t));gl.uniform3fv(loc.l,norm([ld[0]*0.5+0.3,ld[1]*0.5-0.35,ld[2]*0.5+0.75]));gl.uniform3fv(loc.l2,norm([-0.5,0.6,-0.6]));
  const at=(l,b,n)=>{if(l<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,0,0)};
  gl.uniform1f(loc.uf,0);at(loc.p,bufs.P,3);at(loc.n,bufs.N,3);at(loc.c,bufs.C,3);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawArrays(gl.TRIANGLES,0,bufs.nt);gl.disable(gl.POLYGON_OFFSET_FILL);
  if(loc.n>=0)gl.disableVertexAttribArray(loc.n);if(loc.c>=0)gl.disableVertexAttribArray(loc.c);gl.uniform1f(loc.uf,1);gl.uniform3fv(loc.fc,model.edge||EDGE);at(loc.p,bufs.L,3);gl.drawArrays(gl.LINES,0,bufs.nl)}
 const redraw=()=>{if(gl&&!raf)raf=requestAnimationFrame(draw)};
 function fit(){const b=model.box||[model.bbox[0],model.bbox[1],0,model.bbox[2],model.bbox[3],model.T];cam.tx=(b[0]+b[3])/2;cam.ty=(b[1]+b[4])/2;cam.tz=(b[2]+b[5])/2;
  const r=Math.hypot(b[3]-b[0],b[4]-b[1],b[5]-b[2])/2,asp=cv.clientWidth&&cv.clientHeight?cv.clientWidth/cv.clientHeight:1.5;cam.dist=r/Math.sin(0.3)*(asp<1?1/asp:1)*1.08}
 function view(k){if(!gl||!model)return;if(k==='top'){cam.az=0;cam.el=Math.PI/2-1e-4}else if(k==='bottom'){cam.az=0;cam.el=-Math.PI/2+1e-4}else if(k==='front'){cam.az=0;cam.el=0.12}else{cam.az=-0.6;cam.el=0.5+(model.parts?-0.15:0.25)}fit();redraw()}
 function setModel(m,keep){if(!gl&&!init())return false;const first=!model,old=model&&model.size;model=m;upload(mesh(m));if(first||!keep)view('iso');else{if(old&&Math.abs(m.size-old)>old*0.08)fit();redraw()}return true}
 const pts=new Map();let pd=0;
 cv.addEventListener('contextmenu',e=>e.preventDefault());
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY,e.button,e.shiftKey]);pd=0});
 const end=e=>{pts.delete(e.pointerId);pd=0};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
 const pan=(dx,dy)=>{const k=cam.dist*0.0011,sa=Math.sin(cam.az),ca=Math.cos(cam.az),se=Math.sin(cam.el),ce=Math.cos(cam.el);cam.tx+=(-dx*ca+dy*(-sa*se))*k;cam.ty+=(-dx*sa+dy*(ca*se))*k;cam.tz+=dy*ce*k};
 cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!model)return;const o=pts.get(e.pointerId),dx=e.clientX-o[0],dy=e.clientY-o[1];o[0]=e.clientX;o[1]=e.clientY;
  if(pts.size>=2){const[a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)cam.dist=Math.max(model.size*0.05,cam.dist*pd/Math.max(d,1));pd=d;pan(dx/2,dy/2);redraw();return}
  if(o[2]===2||o[2]===1||o[3])pan(dx,dy);else{cam.az-=dx*0.008;cam.el=Math.max(-Math.PI/2+1e-4,Math.min(Math.PI/2-1e-4,cam.el+dy*0.008))}redraw()});
 cv.addEventListener('wheel',e=>{if(!model)return;e.preventDefault();cam.dist=Math.max(model.size*0.05,cam.dist*Math.exp(e.deltaY*(e.deltaMode?0.05:0.0015)));redraw()},{passive:false});
 new ResizeObserver(redraw).observe(cv);
 return{setModel,view,redraw,cam,get ok(){return!!gl},get stats(){return bufs?{tris:bufs.nt/3,lines:bufs.nl/2}:null}}}

/* Fenster „3D-Ansicht“ für die einzelne Platte aus dem Zeichenprogramm */
let V=null,cur=null,onThick=null,bound=false;
const escH=t=>t.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function show(m,keep){cur=m;const ok=V.setModel(m,keep);$('v3info').textContent=ok?m.info:'Dieser Browser kann leider kein 3D anzeigen (WebGL fehlt).';$('v3warn').innerHTML=m.notes.map(escH).join('<br>');$('v3warn').style.display=m.notes.length?'':'none';return ok}
function open(m,cb){onThick=cb;$('d3d').classList.add('open');if(!V)V=create($('v3cv'));
 if(!bound){bound=true;$('d3d').addEventListener('click',e=>{const b=e.target.closest('[data-v3]');if(!b)return;if(b.dataset.v3==='close')close();else V.view(b.dataset.v3)});
  const th=$('v3thick');th.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')th.blur()});
  th.addEventListener('change',()=>{const v=parseFloat(th.value.replace(',','.'));if(v>0&&onThick&&V.ok){const m2=onThick(v);if(m2)show(m2,true)}else if(cur)th.value=String(cur.T).replace('.',',')})}
 $('v3thick').value=String(m.T).replace('.',',');return show(m,false)}
function close(){$('d3d').classList.remove('open')}
return{open,close,create,isOpen:()=>$('d3d').classList.contains('open'),get stats(){return V?V.stats:null},redraw:()=>V&&V.redraw()}})();
