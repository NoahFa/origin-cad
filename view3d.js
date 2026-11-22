/* Origin CAD – 3D-Ansicht der Platte (eigener kleiner WebGL-Betrachter, keine weitere Bibliothek außer earcut fürs Zerlegen in Dreiecke).
   Modell: Schichten von oben nach unten, jede Schicht = Flächen mit Löchern zwischen zwei Tiefen. */
window.CAD3D=(()=>{
const $=id=>document.getElementById(id);
let bound=false,gl,prog,loc,bufs=null,model=null,cam={az:-0.6,el:0.75,dist:1000,tx:0,ty:0,tz:0},raf=0,onThick=null;
const COL={top:[0.86,0.72,0.52],floor:[0.72,0.58,0.40],wall:[0.63,0.49,0.32],bottom:[0.78,0.65,0.47],edge:[0.16,0.11,0.06]};
function mesh(m){const P=[],Nn=[],C=[],L=[];
 const tri=(a,b,c,n,col)=>{P.push(...a,...b,...c);for(let i=0;i<3;i++){Nn.push(...n);C.push(...col)}};
 const zTop=m.T;
 let prev=new Set();
 for(const s of m.sections){const za=zTop-s.z0,zb=zTop-s.z1,last=s===m.sections[m.sections.length-1],cur=new Set();
  for(const pg of s.polys){const rings=[pg.outer,...pg.holes],flat=[],holes=[];let n=0;
   for(let r=0;r<rings.length;r++){if(r)holes.push(n);for(const p of rings[r]){flat.push(p[0],p[1]);n++}}
   const idx=window.earcut(flat,holes,2),v=i=>[flat[2*i],flat[2*i+1]];
   const colTop=s.z0<1e-9?COL.top:COL.floor;
   for(let i=0;i<idx.length;i+=3){const a=v(idx[i]),b=v(idx[i+1]),c=v(idx[i+2]);tri([a[0],a[1],za],[b[0],b[1],za],[c[0],c[1],za],[0,0,1],colTop);
    if(last)tri([a[0],a[1],zb],[c[0],c[1],zb],[b[0],b[1],zb],[0,0,-1],COL.bottom)}
   for(const ring of rings){const k=ring.length;for(let i=0;i<k;i++){const a=ring[i],b=ring[(i+1)%k],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nn=[dy/l,-dx/l,0];
     tri([a[0],a[1],za],[a[0],a[1],zb],[b[0],b[1],zb],nn,COL.wall);tri([a[0],a[1],za],[b[0],b[1],zb],[b[0],b[1],za],nn,COL.wall);
     const key=a[0].toFixed(3)+','+a[1].toFixed(3)+','+b[0].toFixed(3)+','+b[1].toFixed(3);cur.add(key);
     if(!prev.has(key))L.push(a[0],a[1],za,b[0],b[1],za);if(last)L.push(a[0],a[1],zb,b[0],b[1],zb)}}}prev=cur}
 return{P:new Float32Array(P),N:new Float32Array(Nn),C:new Float32Array(C),L:new Float32Array(L)}}
/* Matrizen (spaltenweise) */
const mul4=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o};
function persp(fov,asp,n,f){const t=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o}
function look(e,c,up){const z=norm(sub(e,c)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1])}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return[a[0]/l,a[1]/l,a[2]/l]};
const VS=`attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 m;varying vec3 vn;varying vec3 vc;void main(){vn=n;vc=c;gl_Position=m*vec4(p,1.);}`;
const FS=`precision mediump float;varying vec3 vn;varying vec3 vc;uniform vec3 l;uniform vec3 l2;uniform float uf;uniform vec3 fc;void main(){if(uf>.5){gl_FragColor=vec4(fc,1.);return;}vec3 nn=normalize(vn);float d=max(dot(nn,l),0.)*.62+max(dot(nn,l2),0.)*.2+.36;gl_FragColor=vec4(vc*d,1.);}`;
function init(cv){gl=cv.getContext('webgl',{antialias:true})||cv.getContext('experimental-webgl');if(!gl)return false;
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))return false;gl.useProgram(prog);
 loc={p:gl.getAttribLocation(prog,'p'),n:gl.getAttribLocation(prog,'n'),c:gl.getAttribLocation(prog,'c'),m:gl.getUniformLocation(prog,'m'),l:gl.getUniformLocation(prog,'l'),l2:gl.getUniformLocation(prog,'l2'),flat:gl.getUniformLocation(prog,'uf'),fc:gl.getUniformLocation(prog,'fc')};return true}
function upload(g){const mk=d=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);return b};
 if(bufs)for(const k of['P','N','C','L'])gl.deleteBuffer(bufs[k]);bufs={P:mk(g.P),N:mk(g.N),C:mk(g.C),L:mk(g.L),nt:g.P.length/3,nl:g.L.length/3}}
function eye(){const ce=Math.cos(cam.el),t=[cam.tx,cam.ty,cam.tz];return[t[0]+cam.dist*ce*Math.sin(cam.az),t[1]-cam.dist*ce*Math.cos(cam.az),t[2]+cam.dist*Math.sin(cam.el)]}
function draw(){raf=0;if(!gl||!bufs)return;const cv=gl.canvas,dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);if(!w||!h)return;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
 gl.viewport(0,0,w,h);gl.clearColor(0.09,0.10,0.115,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
 const e=eye(),up=Math.abs(Math.cos(cam.el))<1e-3?[Math.sin(cam.az)*-Math.sign(cam.el),Math.cos(cam.az)*Math.sign(cam.el),0]:[0,0,1];
 const m=mul4(persp(0.6,w/h,Math.max(cam.dist/200,0.5),cam.dist*20+model.size*4),look(e,[cam.tx,cam.ty,cam.tz],up));gl.uniformMatrix4fv(loc.m,false,m);
 const ld=norm(sub(e,[cam.tx,cam.ty,cam.tz]));gl.uniform3fv(loc.l,norm([ld[0]*0.5+0.3,ld[1]*0.5-0.35,ld[2]*0.5+0.75]));gl.uniform3fv(loc.l2,norm([-0.5,0.6,-0.6]));
 const at=(l,b,n)=>{if(l<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,0,0)};
 gl.uniform1f(loc.flat,0);at(loc.p,bufs.P,3);at(loc.n,bufs.N,3);at(loc.c,bufs.C,3);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawArrays(gl.TRIANGLES,0,bufs.nt);gl.disable(gl.POLYGON_OFFSET_FILL);
 if(loc.n>=0)gl.disableVertexAttribArray(loc.n);if(loc.c>=0)gl.disableVertexAttribArray(loc.c);gl.uniform1f(loc.flat,1);gl.uniform3fv(loc.fc,COL.edge);at(loc.p,bufs.L,3);gl.drawArrays(gl.LINES,0,bufs.nl)}
const redraw=()=>{if(gl&&!raf)raf=requestAnimationFrame(draw)};
function fit(){const b=model.bbox;cam.tx=(b[0]+b[2])/2;cam.ty=(b[1]+b[3])/2;cam.tz=model.T/2;cam.dist=model.size*2.1+model.T}
function view(k){if(k==='top'){cam.az=0;cam.el=Math.PI/2-1e-4}else if(k==='bottom'){cam.az=0;cam.el=-Math.PI/2+1e-4}else if(k==='front'){cam.az=0;cam.el=0.12}else{cam.az=-0.6;cam.el=0.75}fit();redraw()}
function setModel(m){model=m;upload(mesh(m));$('v3info').textContent=m.info;$('v3warn').innerHTML=m.notes.map(t=>t.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join('<br>');$('v3warn').style.display=m.notes.length?'':'none'}
function open(m,cb){onThick=cb;const box=$('d3d');box.classList.add('open');const cv=$('v3cv');
 if(!bound){bound=true;bind(cv)}
 if(!gl&&!init(cv)){gl=null;$('v3info').textContent='Dieser Browser kann leider kein 3D anzeigen (WebGL fehlt).';return false}
 $('v3thick').value=String(m.T).replace('.',',');setModel(m);view('iso');return true}
function close(){$('d3d').classList.remove('open')}
function bind(cv){const pts=new Map();let last=null,pd=0;
 cv.addEventListener('contextmenu',e=>e.preventDefault());
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY,e.button,e.shiftKey]);last=null;pd=0});
 const end=e=>{pts.delete(e.pointerId);last=null;pd=0};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
 const pan=(dx,dy)=>{const k=cam.dist*0.0011,sa=Math.sin(cam.az),ca=Math.cos(cam.az),se=Math.sin(cam.el),ce=Math.cos(cam.el);/* rechts = (ca,sa,0), oben = (-sa*se, ca*se, ce) */
  cam.tx+=(-dx*ca+dy*(-sa*se))*k;cam.ty+=(-dx*sa+dy*(ca*se))*k;cam.tz+=dy*ce*k};
 cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const o=pts.get(e.pointerId);const dx=e.clientX-o[0],dy=e.clientY-o[1];o[0]=e.clientX;o[1]=e.clientY;
  if(pts.size>=2){const[a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)cam.dist=Math.max(model.T,cam.dist*pd/Math.max(d,1));pd=d;pan(dx/2,dy/2);redraw();return}
  if(o[2]===2||o[2]===1||o[3])pan(dx,dy);else{cam.az-=dx*0.008;cam.el=Math.max(-Math.PI/2+1e-4,Math.min(Math.PI/2-1e-4,cam.el+dy*0.008))}redraw()});
 cv.addEventListener('wheel',e=>{e.preventDefault();cam.dist=Math.max(model.T,cam.dist*Math.exp(e.deltaY*(e.deltaMode?0.05:0.0015)));redraw()},{passive:false});
 new ResizeObserver(redraw).observe(cv);
 $('d3d').addEventListener('click',e=>{const b=e.target.closest('[data-v3]');if(!b)return;const k=b.dataset.v3;if(k==='close')close();else if(gl&&model)view(k)});
 const th=$('v3thick');th.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')th.blur()});th.addEventListener('change',()=>{const v=parseFloat(th.value.replace(',','.'));if(v>0&&onThick&&gl){const m=onThick(v);if(m){const keep={...cam};setModel(m);Object.assign(cam,keep);cam.tz=m.T/2;redraw()}}else th.value=String(model.T).replace('.',',')})}
return{open,close,isOpen:()=>$('d3d').classList.contains('open'),get stats(){return bufs?{tris:bufs.nt/3,lines:bufs.nl/2}:null},cam,redraw}})();
