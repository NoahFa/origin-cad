/* Origin CAD – 3D-Modus: Körper frei im Raum zusammensetzen.
   Ein Körper ist ein Quader oder eine hochgezogene Kontur aus der Zeichnung. Er hat eine Grundfläche (lokal X/Y, 0…L / 0…B),
   eine Höhe H (lokal Z) und eine Lage im Raum: o = Ursprung, u/v = Richtung der lokalen X/Y-Achse (nur 90°-Schritte), Höhe läuft in u×v.
   Raum: X = Breite, Y = Tiefe (vorn = 0), Z = Höhe. Daten liegen in der Zeichnung unter S.raum. */
window.RAUM=(()=>{
const A=window.__cad.kp,$=id=>document.getElementById(id),S=()=>window.__cad.S;
const R=()=>{const s=S();if(!s.raum)s.raum={bodies:[],nid:1};return s.raum};
const num=v=>Math.round(v*100)/100,de=v=>String(num(v)).replace('.',',');
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
let V=null,selId=null,showDims=true,drag=null,bound=false;
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
function model(){const r=R(),parts=r.bodies.map(b=>{const poly=b.kind==='ext'?b.poly:{outer:[[0,0],[b.L,0],[b.L,b.B],[0,b.B]],holes:[]},m=window.KORPUS.mat(b.mat||'');
  return{T:b.H,sections:[{z0:0,z1:b.H,polys:[poly]}],o:b.o,u:b.u,v:b.v,color:b.mat?m[2]:null,tint:b.id===selId?[1.12,0.86,0.8]:b.tint||[1,1,1]}}),bb=boxAll(r.bodies);
 return{parts,box:bb,size:Math.max(bb[3]-bb[0],bb[4]-bb[1],bb[5]-bb[2],100),T:0}}
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
 if(showDims){dimBox(all,'#5ad1e8',sz*0.07);if(b&&r.bodies.length>1)dimBox(box(b),'#ffb020',sz*0.025)}}
/* ----- Auswählen und Ziehen ----- */
function hitBody(px,py){const ry=V.ray(px,py);let best=null,bt=Infinity;for(const b of R().bodies){const m=box(b);let t0=-Infinity,t1=Infinity,ok=true;
  for(let i=0;i<3;i++){if(Math.abs(ry.d[i])<1e-9){if(ry.o[i]<m[i]||ry.o[i]>m[i+3]){ok=false;break}}else{let a=(m[i]-ry.o[i])/ry.d[i],c=(m[i+3]-ry.o[i])/ry.d[i];if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c)}}
  if(ok&&t0<=t1&&t1>0&&t0<bt){bt=t0;best=b}}return best?{b:best,p:add(ry.o,mul(ry.d,Math.max(bt,0))),ry}:null}
const planeHit=(ry,p0,n)=>{const dn=dot(ry.d,n);if(Math.abs(dn)<1e-6)return null;const t=dot(sub(p0,ry.o),n)/dn;return t>0?add(ry.o,mul(ry.d,t)):null};
/* Einrasten: Flächen an Flächen anderer Körper (bündig oder anstoßend) und an den Boden */
function snap(b,axes){const m=box(b),tol=V.cam.dist*0.012,d=[0,0,0];for(const i of axes){let best=null;const cand=[];for(const o of R().bodies){if(o===b)continue;const q=box(o);cand.push(q[i],q[i+3])}if(i===2)cand.push(0);
  for(const c of cand)for(const mine of[m[i],m[i+3]]){const dd=c-mine;if(Math.abs(dd)<tol&&(best===null||Math.abs(dd)<Math.abs(best)))best=dd}if(best!==null)d[i]=best}return d}
function pos(e){const r=$('rm3d').getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
const hooks={
 down(e){const[x,y]=pos(e),h=hitBody(x,y);if(!h){if(selId!=null){selId=null;refresh(true)}return false}
  const was=selId===h.b.id;selId=h.b.id;refresh(true);if(!was)return true;/* erster Klick wählt, zweites Greifen zieht */
  drag={b:h.b,p0:h.p,o0:[...h.b.o],orig:JSON.stringify(h.b),moved:false,sx:x,sy:y};return true},
 move(e){if(!drag)return;const[x,y]=pos(e);if(!drag.moved&&Math.hypot(x-drag.sx,y-drag.sy)<4)return;drag.moved=true;const ry=V.ray(x,y),b=drag.b;let d;
  if(e.shiftKey){const n=[ry.f[0],ry.f[1],0],p=planeHit(ry,drag.p0,Math.hypot(n[0],n[1])<1e-6?[0,1,0]:n);if(!p)return;d=[0,0,p[2]-drag.p0[2]]}
  else{const p=planeHit(ry,drag.p0,[0,0,1]);if(!p)return;d=[p[0]-drag.p0[0],p[1]-drag.p0[1],0]}
  b.o=add(drag.o0,d).map(v=>Math.round(v));moveBy(b,snap(b,e.shiftKey?[2]:[0,1]));show();fillSel()},
 up(){if(!drag)return;const d=drag;drag=null;if(d.moved){const neu=JSON.stringify(d.b);Object.assign(d.b,JSON.parse(d.orig));A.commit(()=>{Object.assign(d.b,JSON.parse(neu))})}refresh(true)},
 draw(){drawOver()}};
/* ----- Körper anlegen ----- */
function place(b){/* neben das Vorhandene stellen */const others=R().bodies.filter(x=>x!==b);if(others.length){const m=boxAll(others),q=box(b);moveBy(b,[m[3]+50-q[0],m[1]-q[1],-q[2]])}}
function addBox(){const L=val('rn_L')||600,B=val('rn_B')||400,H=val('rn_H')||19;A.commit(()=>{const b=newBody({name:'Quader',L,B,H});place(b);selId=b.id});refresh()}
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
 const keep={};for(const id of['rn_L','rn_B','rn_H','rn_X']){const el=$(id);if(el)keep[id]=el.value}
 $('rmside').innerHTML=`<details class="kpsec" open><summary><b>Neuer Körper</b><span></span></summary><div class="kpsecb">
  ${inp('rn_L','Länge mm',600)}${inp('rn_B','Breite mm',400)}${inp('rn_H','Höhe / Stärke mm',19)}<button class="btn" id="rn_add" style="width:100%">+ Quader anlegen</button>
  <div class="rmsep"></div>${inp('rn_X','Höhe beim Hochziehen',19)}<button class="btn" id="rn_ext" style="width:100%">+ Kontur aus der Zeichnung hochziehen</button><p class="muted kpnote">Nimmt die im Zeichenprogramm gewählten geschlossenen Konturen, sonst alle. Löcher bleiben erhalten.</p>
  <button class="btn" id="rn_kp" style="width:100%">+ Schrank aus dem Korpusplaner holen</button></div></details>
 <div id="rmsel"></div>
 <h2 class="kpall">Körper (${r.bodies.length})</h2><div class="rmlist">${r.bodies.map(b=>`<button class="rmit ${b.id===selId?'on':''}" data-rmid="${b.id}"><b>${A.esc(b.name)}</b><span>${dimTxt(b)}</span></button>`).join('')||'<p class="muted">Noch nichts da. Oben einen Quader anlegen oder eine Kontur hochziehen.</p>'}</div>`;
 for(const id in keep)if($(id))$(id).value=keep[id];
 $('rn_add').onclick=addBox;$('rn_ext').onclick=addFromDrawing;$('rn_kp').onclick=addFromKorpus;
 $('rmside').querySelectorAll('[data-rmid]').forEach(bt=>bt.onclick=()=>{selId=+bt.dataset.rmid;refresh(true)});fillSel()}
const dims3=b=>[b.L,b.B,b.H].slice().sort((x,y)=>y-x),dimTxt=b=>dims3(b).map(de).join(' × ');
function fillSel(){const el=$('rmsel'),b=body(selId);if(!el)return;if(!b){el.innerHTML='';return}if(el.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&drag)return;
 const m=box(b),inp=(id,lab,v,ro)=>`<div class="pr"><label for="${id}">${lab}</label><input id="${id}" type="text" inputmode="decimal" value="${typeof v==='number'?de(v):A.esc(v)}" ${ro?'readonly':''}></div>`,MATS=window.KORPUS.MATS;
 el.innerHTML=`<div class="kpsel"><b>Gewählt</b>
  <div class="pr"><label for="rs_name">Name</label><input id="rs_name" type="text" value="${A.esc(b.name)}" style="text-align:left"></div>
  ${b.kind==='box'?inp('rs_L','Länge',b.L)+inp('rs_B','Breite',b.B):inp('rs_LB','Grundfläche',de(b.L)+' × '+de(b.B),true)}${inp('rs_H',b.kind==='box'?'Höhe / Stärke':'Höhe',b.H)}
  <div class="rm3"><label>Lage (linke vordere untere Ecke)</label><input id="rs_x" type="text" inputmode="decimal" value="${de(m[0])}" aria-label="X"><input id="rs_y" type="text" inputmode="decimal" value="${de(m[1])}" aria-label="Y"><input id="rs_z" type="text" inputmode="decimal" value="${de(m[2])}" aria-label="Z"><span>X</span><span>Y nach hinten</span><span>Z Höhe</span></div>
  <div class="rmrow"><span>Drehen 90°</span><button class="btn" data-rot="2" title="um die senkrechte Achse">liegend</button><button class="btn" data-rot="0" title="nach hinten kippen">kippen</button><button class="btn" data-rot="1" title="seitlich kippen">seitlich</button></div>
  <div class="pr"><label for="rs_mat">Material</label><select id="rs_mat">${MATS.map(q=>`<option value="${q[0]}" ${(b.mat||'')===q[0]?'selected':''}>${q[0]?q[0]+' '+q[1]:q[1]}</option>`).join('')}</select></div>
  <div class="rmrow"><button class="btn" id="rs_copy">Kopieren</button><button class="btn" id="rs_floor" title="auf den Boden stellen">Auf den Boden</button><button class="btn" id="rs_del">Löschen</button></div></div>`;
 const on=(id,fn)=>{const x=$(id);if(!x)return;x.addEventListener('keydown',e=>{if(e.key==='Enter')x.blur()});x.addEventListener('change',()=>{fn(x);refresh(true)})},nv=x=>{const v=parseFloat(x.value.replace(',','.'));return isFinite(v)?v:null};
 on('rs_name',x=>{const t=x.value.trim();if(t)A.commit(()=>{b.name=t.slice(0,60)})});
 for(const[id,f]of[['rs_L','L'],['rs_B','B'],['rs_H','H']])on(id,x=>{const v=nv(x);if(v>0)A.commit(()=>{const c0=box(b);b[f]=num(Math.min(v,10000));const n=box(b);moveBy(b,[c0[0]-n[0],c0[1]-n[1],c0[2]-n[2]])})});
 ['rs_x','rs_y','rs_z'].forEach((id,i)=>on(id,x=>{const v=nv(x);if(v!=null)A.commit(()=>{const d=[0,0,0];d[i]=v-box(b)[i];moveBy(b,d)})}));
 on('rs_mat',x=>A.commit(()=>{b.mat=x.value}));
 el.querySelectorAll('[data-rot]').forEach(bt=>bt.onclick=()=>{A.commit(()=>rotate(b,+bt.dataset.rot));refresh(true)});
 $('rs_copy').onclick=()=>{A.commit(()=>{const n=newBody(JSON.parse(JSON.stringify({...b,id:undefined})));n.id=R().nid-1;const m2=box(b);moveBy(n,[m2[3]-m2[0]+50,0,0]);selId=n.id});refresh()};
 $('rs_floor').onclick=()=>{A.commit(()=>moveBy(b,[0,0,-box(b)[2]]));refresh(true)};$('rs_del').onclick=removeSel}
function removeSel(){const b=body(selId);if(!b)return;A.commit(()=>{const r=R();r.bodies=r.bodies.filter(x=>x!==b)});selId=null;refresh()}
function refresh(light){const r=R();if(selId!=null&&!body(selId))selId=null;if(light){document.querySelectorAll('#rmside [data-rmid]').forEach(bt=>bt.classList.toggle('on',+bt.dataset.rmid===selId));fillSel()}else side();show();
 const m=boxAll(r.bodies);$('rminfo').textContent=r.bodies.length?`${r.bodies.length} Körper · gesamt ${de(m[3]-m[0])} × ${de(m[4]-m[1])} × ${de(m[5]-m[2])} mm`:'leer'}
/* ----- Stückliste, Zuschnitt, Bild ----- */
function list(){const m=new Map();for(const b of R().bodies){const d=dims3(b),key=[b.name,b.kind,d.join('x'),b.mat||'',b.rod?1:0].join('|');if(!m.has(key))m.set(key,{b,d,n:0});m.get(key).n++}return[...m.values()]}
function listHTML(print){const rows=list(),K=window.KORPUS;return'<table><tr><th>Nr.</th><th>Körper</th><th>Länge</th><th>Breite</th><th>Stärke</th><th>Material</th><th>Stück</th><th>Hinweis</th></tr>'+rows.map((r,i)=>`<tr><td>${i+1}</td><td>${A.esc(r.b.name)}</td><td>${de(r.d[0])}</td><td>${de(r.d[1])}</td><td>${de(r.d[2])}</td><td>${r.b.rod?'–':A.esc(K.matName(r.b.mat||''))}</td><td>${r.n}</td><td>${r.b.kind==='ext'?'Formteil – Maß ist das umschließende Rechteck':r.b.rod?'Stange/Griff':''}</td></tr>`).join('')+'</table>'}
function nest(){const pieces=[];list().forEach((r,i)=>{if(r.b.rod||r.d[2]>60)return;for(let n=0;n<r.n;n++)pieces.push({nr:i+1,name:r.b.name,w:r.d[0],h:r.d[1],matId:r.b.mat||'',T:r.d[2],kind:'Platte'})});return window.KORPUS.nestOf(pieces)}
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
  $('rmdims').addEventListener('change',e=>{showDims=e.target.checked;drawOver()});
  $('dRml').addEventListener('click',e=>{if(e.target.closest('[data-rml="print"]'))printAll()});
  new ResizeObserver(()=>drawOver()).observe($('rm3d'))}
 selId=null;side();V.setModel(model(),false);refresh(true);if(!V.ok)msg('Dieser Browser kann leider kein 3D anzeigen.')}
function close(){$('rm').classList.remove('open');$('dRml').classList.remove('open')}
function key(e){const t=e.target,inField=t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA');
 if(e.key==='Escape'){e.preventDefault();if($('dRml').classList.contains('open'))$('dRml').classList.remove('open');else if(selId!=null){selId=null;refresh(true)}else close();return}
 if(inField)return;
 if(e.ctrlKey||e.metaKey){const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();e.shiftKey?A.redo():A.undo();refresh()}else if(k==='y'){e.preventDefault();A.redo();refresh()}return}
 const b=body(selId);if(!b)return;
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSel();return}
 const st=e.shiftKey?10:1,mv={ArrowLeft:[-st,0,0],ArrowRight:[st,0,0],ArrowUp:[0,st,0],ArrowDown:[0,-st,0],PageUp:[0,0,st],PageDown:[0,0,-st]}[e.key];if(mv){e.preventDefault();A.commit(()=>moveBy(b,mv));refresh(true)}}
return{open,close,isOpen,key,refresh,list,nest,box,get state(){return R()},get sel(){return selId},select:id=>{selId=id;refresh(true)},addBox,addFromDrawing,addFromKorpus,rotate:(id,ax)=>{A.commit(()=>rotate(body(id),ax));refresh(true)},get viewer(){return V},hooks}})();
