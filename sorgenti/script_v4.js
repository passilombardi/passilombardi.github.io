<script>
/*LUOGHI*/
/*ESERCIZI*/
/*GIOCHI*/
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LAT0=45.6,KX=111320*Math.cos(LAT0*Math.PI/180),KY=110540;
const xy=(la,lo)=>[(lo-9.6)*KX,-(la-LAT0)*KY];
const dist=(a,b)=>{const p=xy(a[0],a[1]),q=xy(b[0],b[1]);return Math.hypot(p[0]-q[0],p[1]-q[1])};
const brg=(a,b)=>{const p=xy(a[0],a[1]),q=xy(b[0],b[1]);return (Math.atan2(q[0]-p[0],-(q[1]-p[1]))*180/Math.PI+360)%360};
const VEL={piedi:1.4,corsa:2.9,bici:5,auto:22},MODI={piedi:'🚶 A piedi',corsa:'🏃 Di corsa',bici:'🚲 In bici',auto:'🚗 In auto'};
const ICO={c:'🏙️',p:'🏡',m:'🏛️',n:'🌿',x:'⭐'},TIPO={c:'Città',p:'Paese',m:'Da vedere',n:'Natura',x:'Un posto tuo'};
const km=m=>m<1000?Math.round(m/10)*10+' m':(m/1000).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+' km';
const durata=(m,modo)=>{const min=Math.max(1,Math.round(m/VEL[modo]/60));return min<60?min+' min':Math.floor(min/60)+' h '+String(min%60).padStart(2,'0')};
const orologio=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const LI=new Map(LUOGHI.map((L,i)=>[L,i]));const LP=n=>LUOGHI.find(x=>x[0]===n);
const storia=L=>L[5]+(GIOCHI[L[0]]?' '+GIOCHI[L[0]]:'');
// Sul sito vero ci sono GPS, mappa delle strade, ricerca delle vie e percorsi lungo le strade. Nell'anteprima no.
const SITO=/github\.io$|^localhost$/.test(location.hostname)&&!window.ANTEPRIMA;
// ---------- posti tuoi (salvati su questo telefono) ----------
let MIEI=[];try{MIEI=JSON.parse(localStorage.getItem('passi_miei')||'[]')}catch(e){}
function salvaMiei(){try{localStorage.setItem('passi_miei',JSON.stringify(MIEI))}catch(e){}}
const tutti=()=>LUOGHI.concat(MIEI.map(m=>[m.n,m.la,m.lo,80,'x',m.s]));
// ---------- stato ----------
const S={tour:null,rotta:null,cum:[],tot:0,fatto:0,va:false,pos:[45.6636,9.6289],dir:45,detti:new Set(),coda:[],parla:false,segui:true,modo:'piedi',vel:40,disegna:false,punti:[],racconti:true,esercizi:true,tempo:0,attesa:null,campi:null,gps:false,via:'',auto:true};
const V={cx:0,cy:0,z:0.002};
function livello(T){if(T.m==='auto')return null;const e=T.m==='bici'?T.tot/3:T.tot;return e<3000?'verde':e<8000?'blu':'rosso'}
const LIVN={verde:'Verde · facile',blu:'Blu · medio',rosso:'Rosso · lungo'};
const pallino=l=>l?`<i class="liv ${l}"></i>`:'';
// ---------- percorsi ----------
function lungo(p){const cum=[0];for(let i=1;i<p.length;i++)cum.push(cum[i-1]+dist(p[i-1],p[i]));return cum}
function proietta(p,cum,q){let best=[1e12,0];for(let i=1;i<p.length;i++){const a=xy(p[i-1][0],p[i-1][1]),b=xy(p[i][0],p[i][1]),c=xy(q[0],q[1]);const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1;let t=((c[0]-a[0])*dx+(c[1]-a[1])*dy)/L;t=Math.max(0,Math.min(1,t));const d=Math.hypot(a[0]+dx*t-c[0],a[1]+dy*t-c[1]);if(d<best[0])best=[d,cum[i-1]+t*(cum[i]-cum[i-1])]}return best}
function tappeDi(T){const p=T.p,cum=lungo(p),tot=cum.at(-1);
 if(T.cap)return T.cap.map(([f,n,txt],i)=>({n,txt,at:f*tot,ico:'📖',clip:'C'+i}));
 const out=[];tutti().forEach(L=>{const [d,at]=proietta(p,cum,[L[1],L[2]]);const lim=L[4]==='m'||L[4]==='x'?Math.min(Math.max(L[3],120),350):Math.min(L[3],T.m==='auto'?4000:2500);if(d<=lim)out.push({n:L[0],txt:L[4]==='x'?L[5]:storia(L),at,ico:ICO[L[4]],L,clip:L[4]==='x'?null:'L'+LI.get(L)})});
 (T.vie||[]).forEach(v=>out.push({n:v.n,txt:v.txt,at:v.at,ico:v.ico||'🛣️',via:1,svolta:v.svolta}));
 return out.sort((a,b)=>a.at-b.at)}
function eserciziDi(T){if(T.m==='auto'||T.m==='bici')return [];const passo=T.m==='corsa'?1000:700,out=[];let k=0;
 for(let at=passo;at<T.tot-200&&out.length<6;at+=passo){if(T.tappe.some(t=>Math.abs(t.at-at)<120))at+=150;out.push({es:k%ESERCIZI.length,at});k++}return out}
const TOURS=[{...LALLIO,id:'lallio-storia',area:'Lallio'},...PERCORSI.map(P=>({...P,area:P.d.split(' · ')[0]}))];
const PROV=['Bergamo','Brescia','Como','Cremona','Lecco','Lodi','Mantova','Milano','Monza','Pavia','Sondrio','Varese'];
function giroDi(L){const c=[L[1],L[2]],R=L[4]==='c'?3500:3000;let resto=LUOGHI.filter(x=>x!==L&&dist(c,[x[1],x[2]])<=R&&(x[4]==='m'||x[4]==='n'||x[4]==='p'));if(resto.length<2)return null;
 resto=resto.slice(0,7);const p=[c];let q=c;while(resto.length){resto.sort((a,b)=>dist(q,[a[1],a[2]])-dist(q,[b[1],b[2]]));const x=resto.shift();q=[x[1],x[2]];p.push(q)}p.push(c);
 const T={n:'Il giro di '+L[0],d:L[0]+' · a piedi',area:L[0],m:'piedi',p,auto:1};T.tot=lungo(p).at(-1);if(T.tot>9000){T.m='bici';T.d=L[0]+' · in bici'}T.tappe=tappeDi(T);return T}
PROV.forEach(n=>{const L=LP(n);if(!L)return;const T=giroDi(L);if(T)TOURS.push(T)});
TOURS.forEach(T=>{T.tot=lungo(T.p).at(-1);T.tappe=tappeDi(T)});
const passaVicino=(T,c,R)=>T.p.some((q,i)=>i&&proietta([T.p[i-1],q],[0,dist(T.p[i-1],q)],c)[0]<R);
// ---------- servizi del sito vero: vie, strade, posti intorno ----------
async function cercaVia(testo,paese){if(!SITO)throw new Error('anteprima');const q=encodeURIComponent(testo+', '+paese+', Lombardia');
 const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=it&accept-language=it`);const j=await r.json();if(!j.length)throw new Error('non trovata');return [+j[0].lat,+j[0].lon]}
async function suggerisciVie(testo,paese){if(!SITO)return [];const q=encodeURIComponent(testo+', '+paese+', Lombardia');
 try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=it&accept-language=it&addressdetails=1`);const j=await r.json();const vist=new Set();
  return j.map(x=>{const a=x.address||{};const n=a.road||a.square||a.pedestrian||a.footway||x.name||x.display_name.split(',')[0];return {n,dove:a.village||a.town||a.city||'',pt:[+x.lat,+x.lon]}}).filter(x=>{const k=x.n+x.dove;if(vist.has(k))return false;vist.add(k);return true})}catch(e){return []}}
let ultVia=0,ultViaPos=null;
async function nomeVia(p){if(!SITO)return '';if(Date.now()-ultVia<4000||ultViaPos&&dist(p,ultViaPos)<40)return S.via;ultVia=Date.now();ultViaPos=p;
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p[0]}&lon=${p[1]}&format=json&zoom=17&accept-language=it`);const j=await r.json();const a=j.address||{};S.paese=a.village||a.town||a.city||a.hamlet||S.paese||'';return a.square||a.road||a.pedestrian||a.footway||S.via}catch(e){return S.via}}
// percorso lungo le strade vere, con le svolte: «gira a destra in via Roma»
async function stradaTra(pts,modo,svolte){if(!SITO)return null;const prof=modo==='auto'?'routed-car':modo==='bici'?'routed-bike':'routed-foot';
 try{const r=await fetch(`https://routing.openstreetmap.de/${prof}/route/v1/driving/${pts.map(p=>p[1].toFixed(6)+','+p[0].toFixed(6)).join(';')}?overview=full&geometries=geojson${svolte?'&steps=true':''}`);const j=await r.json();if(!j.routes||!j.routes[0])return null;
  const p=j.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);if(!svolte)return p;
  const st=[];j.routes[0].legs.forEach(l=>l.steps.forEach(x=>{const m=x.maneuver;if(m.type==='arrive'||m.type==='depart'||!x.name)return;const prima=st.at(-1);if(prima&&prima.nome===x.name)return;st.push({nome:x.name,mod:m.modifier||'',tipo:m.type,pt:[m.location[1],m.location[0]]})}));
  return {p,st}}catch(e){return null}}
const SVOLTA={left:'gira a sinistra',right:'gira a destra','slight left':'tieni la sinistra','slight right':'tieni la destra','sharp left':'gira tutto a sinistra','sharp right':'gira tutto a destra',straight:'vai dritto',uturn:'torna indietro'};
const frase=v=>{const n=v.nome.replace(/^(via|viale|piazza|piazzale|corso|largo|vicolo|strada)\b/i,w=>w.toLowerCase());const pre=/^(via|viale|corso|vicolo|largo)\b/i.test(n)?'in ':/^(piazza|piazzale)\b/i.test(n)?'in ':'su ';
 if(v.tipo==='roundabout'||v.tipo==='rotary')return `Alla rotonda prendi ${n}`;const a=SVOLTA[v.mod]||'continua';return (a.charAt(0).toUpperCase()+a.slice(1))+' '+pre+n};
const ICOSV={left:'⬅️',right:'➡️','slight left':'↖️','slight right':'↗️','sharp left':'⬅️','sharp right':'➡️',straight:'⬆️',uturn:'↩️'};
const POI=new Map();let poiZone=new Set();
async function postiIntorno(p){if(!SITO)return;const k=p[0].toFixed(2)+','+p[1].toFixed(2);if(poiZone.has(k))return;poiZone.add(k);
 const q=`[out:json][timeout:20];(nwr(around:900,${p[0]},${p[1]})[name][~"^(amenity|historic|tourism|leisure)$"~"^(place_of_worship|school|library|townhall|theatre|monument|memorial|castle|church|ruins|museum|attraction|artwork|viewpoint|park|sports_centre|stadium|playground)$"];);out center tags 80;`;
 try{const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q)});const j=await r.json();
  j.elements.forEach(e=>{const la=e.lat||e.center&&e.center.lat,lo=e.lon||e.center&&e.center.lon;if(!la||POI.has(e.type+e.id))return;POI.set(e.type+e.id,{n:e.tags.name,la,lo,t:e.tags,wiki:e.tags.wikipedia})})}catch(e){}}
const TIPI_POI={place_of_worship:'una chiesa',school:'una scuola',library:'una biblioteca',townhall:'il municipio',theatre:'un teatro',monument:'un monumento',memorial:'un monumento',castle:'un castello',church:'una chiesa',ruins:'delle rovine antiche',museum:'un museo',attraction:'un posto da vedere',artwork:'un\'opera d\'arte',viewpoint:'un punto panoramico',park:'un parco',sports_centre:'un centro sportivo',stadium:'uno stadio',playground:'un parco giochi'};
function tipoPoi(t){return TIPI_POI[t.amenity]||TIPI_POI[t.historic]||TIPI_POI[t.tourism]||TIPI_POI[t.leisure]||'un posto'}
async function raccontoPoi(P){// prima le storie scritte da noi, poi Wikipedia, poi una frase semplice
 const n=P.n.toLowerCase();if(/bernardino/.test(n)&&dist([P.la,P.lo],[45.6636,9.6289])<2500)return {txt:LALLIO.cap[2][2],clip:'C2'};
 if(/bartolomeo/.test(n)&&dist([P.la,P.lo],[45.6636,9.6289])<2500)return {txt:LALLIO.cap[3][2],clip:'C3'};
 const L=LUOGHI.find(x=>x[0].toLowerCase()===n);if(L)return {txt:storia(L),clip:'L'+LI.get(L)};
 if(P.wiki&&/^it:/.test(P.wiki)){try{const r=await fetch('https://it.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(P.wiki.slice(3)));const j=await r.json();if(j.extract){const f=j.extract.split(/(?<=\.)\s/).slice(0,3).join(' ');return {txt:f}}}catch(e){}}
 return {txt:`Qui c'è ${tipoPoi(P.t)}: ${P.n}. Guardati intorno e prova a trovarlo!`}}
// ---------- mappa ----------
const cv=$('cv'),g=cv.getContext('2d');let W=0,H=0,DPR=1;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function size(){const r=cv.getBoundingClientRect();DPR=devicePixelRatio||1;W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;draw()}
const toS=(la,lo)=>{const p=xy(la,lo);return [W/2+(p[0]-V.cx)*V.z,H/2+(p[1]-V.cy)*V.z]};
const fromS=(sx,sy)=>{const x=(sx-W/2)/V.z+V.cx,y=(sy-H/2)/V.z+V.cy;return [LAT0-y/KY,9.6+x/KX]};
function center(la,lo){const p=xy(la,lo);V.cx=p[0];V.cy=p[1]}
function fit(p,pad){let a=1e9,b=-1e9,c=1e9,d=-1e9;p.forEach(q=>{const s=xy(q[0],q[1]);a=Math.min(a,s[0]);b=Math.max(b,s[0]);c=Math.min(c,s[1]);d=Math.max(d,s[1])});V.cx=(a+b)/2;V.cy=(c+d)/2;V.z=Math.min((W-(pad||70))/Math.max(300,b-a),(H-(pad||90))/Math.max(300,d-c))}
function poly(pts,close){g.beginPath();pts.forEach((p,i)=>{const s=toS(p[0],p[1]);i?g.lineTo(s[0],s[1]):g.moveTo(s[0],s[1])});if(close)g.closePath()}
function puntoA(at){let i=1;while(i<S.cum.length-1&&S.cum[i]<at)i++;const a=S.rotta[i-1],b=S.rotta[i],k=(at-S.cum[i-1])/Math.max(1,S.cum[i]-S.cum[i-1]);return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]}
// mappa delle strade (solo sul sito vero, quando sei vicino)
const TILE=new Map();
function tiles(){if(!SITO||V.z<0.012)return false;const Z=Math.max(10,Math.min(19,Math.round(Math.log2(156543*Math.cos(LAT0*Math.PI/180)*V.z*1.4))));const n=2**Z;
 const tx=lo=>(lo+180)/360*n,ty=la=>{const r=la*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n};const lon=x=>x/n*360-180,lat=y=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;
 const a=fromS(0,0),b=fromS(W,H);let ok=true;
 for(let x=Math.floor(tx(a[1]));x<=Math.floor(tx(b[1]));x++)for(let y=Math.floor(ty(a[0]));y<=Math.floor(ty(b[0]));y++){const k=Z+'/'+x+'/'+y;let im=TILE.get(k);
  if(!im){im=new Image();im.crossOrigin='anonymous';im.onload=()=>draw();im.src=`https://tile.openstreetmap.org/${k}.png`;TILE.set(k,im);if(TILE.size>400)TILE.delete(TILE.keys().next().value)}
  if(im.complete&&im.naturalWidth){const p=toS(lat(y),lon(x)),q=toS(lat(y+1),lon(x+1));g.drawImage(im,p[0],p[1],q[0]-p[0]+.5,q[1]-p[1]+.5)}else ok=false}
 return true}
function draw(){if(!W)return;g.setTransform(DPR,0,0,DPR,0,0);const C={carta:css('--carta'),terra:css('--terra'),ink:css('--inchiostro'),tenue:css('--tenue'),lago:css('--lago'),rot:css('--percorso'),tu:css('--tu'),pan:css('--pannello')};
 g.fillStyle=C.carta;g.fillRect(0,0,W,H);poly(CONFINE,1);g.fillStyle=C.terra;g.fill();g.setLineDash([6,5]);g.strokeStyle=C.tenue;g.lineWidth=1.2;g.stroke();g.setLineDash([]);
 LAGHI.forEach(l=>{poly(l,1);g.fillStyle=C.lago;g.fill()});
 const strade=tiles();$('attrib').classList.toggle('on',strade);
 const R=S.rotta||(S.disegna?S.punti:null);
 if(R&&R.length>1){g.lineCap='round';g.lineJoin='round';poly(R);g.strokeStyle=C.rot;g.lineWidth=6;g.globalAlpha=.45;g.stroke();g.globalAlpha=1;
  if(S.rotta&&S.fatto>0){const fp=[S.rotta[0]];for(let i=1;i<S.rotta.length;i++){if(S.cum[i]<=S.fatto)fp.push(S.rotta[i]);else{fp.push(S.pos);break}}poly(fp);g.stroke()}}
 if(R)R.forEach((p,i)=>{if(i&&i<R.length-1&&!S.disegna)return;const s=toS(p[0],p[1]);g.fillStyle=i?C.rot:C.pan;g.strokeStyle=C.rot;g.lineWidth=3;g.beginPath();g.arc(s[0],s[1],6,0,7);g.fill();g.stroke()});
 g.font='700 12px Atkinson Hyperlegible, system-ui';g.textBaseline='middle';
 if(schermo==='crea'&&S.campi)S.campi.forEach((c,i)=>{const p=puntoDi(c);if(!p)return;const s=toS(p[0],p[1]);g.fillStyle=C.rot;g.beginPath();g.arc(s[0],s[1],11,0,7);g.fill();g.fillStyle='#fff';g.textAlign='center';g.fillText(i===0?'A':i===S.campi.length-1?'B':i,s[0],s[1]+.5);g.textAlign='left';const t=nomeDi(c);g.lineWidth=3;g.strokeStyle=C.carta;g.strokeText(t,s[0]+14,s[1]);g.fillStyle=C.ink;g.fillText(t,s[0]+14,s[1])});
 if(S.tour&&S.esercizi&&S.rotta)S.tour.eser.forEach(e=>{const q=puntoA(e.at),s=toS(q[0],q[1]);g.font='16px system-ui';g.textAlign='center';g.fillText(S.detti.has('e'+e.at)?'✅':'💪',s[0],s[1]);g.textAlign='left'});
 const nums=new Map();if(S.tour)S.tour.tappe.forEach((t,i)=>{if(t.L)nums.set(t.L[0],i+1)});
 g.font='700 12px Atkinson Hyperlegible, system-ui';const placed=[];
 tutti().forEach(L=>{const s=toS(L[1],L[2]);if(s[0]<-60||s[1]<-20||s[0]>W+60||s[1]>H+20)return;const n=nums.get(L[0]),big=L[4]==='c'||(L[4]==='n'&&L[3]>5000);
  if(!n&&!(big||V.z>0.004&&L[4]!=='m'||V.z>0.05||L[4]==='x'&&V.z>0.01))return;const det=S.detti.has(L[0]);
  if(n){g.fillStyle=det?C.tenue:C.rot;g.beginPath();g.arc(s[0],s[1],10,0,7);g.fill();g.fillStyle='#fff';g.textAlign='center';g.fillText(n,s[0],s[1]+.5);g.textAlign='left'}
  else if(L[4]==='x'){g.font='15px system-ui';g.textAlign='center';g.fillText('⭐',s[0],s[1]);g.textAlign='left';g.font='700 12px Atkinson Hyperlegible, system-ui'}
  else{g.fillStyle=L[4]==='n'?C.lago:C.ink;g.beginPath();g.arc(s[0],s[1],L[4]==='c'?5:3.5,0,7);g.fill()}
  const ox=n?14:8,w=g.measureText(L[0]).width,bx=[s[0]+ox,s[1]-8,w,16];if(placed.some(b=>bx[0]<b[0]+b[2]&&bx[0]+bx[2]>b[0]&&bx[1]<b[1]+b[3]&&bx[1]+bx[3]>b[1]))return;placed.push(bx);
  g.lineWidth=3;g.strokeStyle=C.carta;g.strokeText(L[0],s[0]+ox,s[1]);g.fillStyle=C.ink;g.fillText(L[0],s[0]+ox,s[1])});
 if(schermo==='luogo'&&luogoSel){const s=toS(luogoSel[1],luogoSel[2]);g.strokeStyle=C.rot;g.lineWidth=3;g.beginPath();g.arc(s[0],s[1],13,0,7);g.stroke()}
 if(S.rotta||S.va||schermo==='dove'||schermo==='mio'){const s=toS(S.pos[0],S.pos[1]);g.save();g.translate(s[0],s[1]);g.rotate(S.dir*Math.PI/180);g.fillStyle=C.tu;g.globalAlpha=.18;g.beginPath();g.arc(0,0,22,0,7);g.fill();g.globalAlpha=1;
  g.beginPath();g.moveTo(0,-13);g.lineTo(9,9);g.lineTo(0,4);g.lineTo(-9,9);g.closePath();g.fill();g.strokeStyle=C.pan;g.lineWidth=2;g.stroke();g.restore()}
 const m=[50,100,200,500,1000,2000,5000,10000,20000,50000].find(v=>v*V.z>60)||50000;$('scala').textContent=m>=1000?(m/1000)+' km':m+' m'}
// ---------- voce: prima la voce registrata, se no la voce del telefono ----------
let voceIt=null;function voci(){try{const v=speechSynthesis.getVoices();voceIt=v.find(x=>/it(-|_)IT/i.test(x.lang))||v.find(x=>/^it/i.test(x.lang))||null}catch(e){}}
try{voci();speechSynthesis.onvoiceschanged=voci}catch(e){}
const audio=new Audio();audio.preload='auto';let ora=null;
function barra(f){document.querySelectorAll('.barra i').forEach(b=>b.style.width=Math.min(100,f*100)+'%')}
audio.ontimeupdate=()=>{if(audio.duration)barra(audio.currentTime/audio.duration)};
function zitto(){S.coda=[];try{audio.pause();audio.onended=audio.onerror=null}catch(e){}try{speechSynthesis.cancel()}catch(e){}S.parla=false;ora=null;ui()}
function dici(tit,dove,txt,clip,extra){S.coda.push({tit,dove,txt,clip,...(extra||{})});prossimo()}
function prossimo(){if(S.parla||!S.coda.length)return;ora=S.coda.shift();S.parla=true;ui();barra(0);
 let finito=false;const fine=()=>{if(finito)return;finito=true;S.parla=false;barra(1);ui();setTimeout(prossimo,600)};
 const muto=()=>{const t0=Date.now(),D=Math.min(14000,2000+ora.txt.length*40);const k=setInterval(()=>{barra((Date.now()-t0)/D);if(Date.now()-t0>=D||finito){clearInterval(k);fine()}},200)};
 const sintesi=()=>{try{if(!('speechSynthesis' in window))throw 0;const tot=(ora.tit+'. '+ora.txt).length;const u=new SpeechSynthesisUtterance(ora.tit+'. '+ora.txt);u.lang='it-IT';if(voceIt)u.voice=voceIt;u.onboundary=e=>barra(e.charIndex/tot);u.onend=u.onerror=fine;speechSynthesis.speak(u);setTimeout(()=>{try{if(!speechSynthesis.speaking&&!finito)muto()}catch(e){muto()}},1500)}catch(e){muto()}};
 if(ora.clip){audio.onended=fine;audio.onerror=()=>{if(!finito)sintesi()};audio.src='a/'+ora.clip+'.mp3';const p=audio.play();if(p&&p.catch)p.catch(()=>{if(!finito){audio.onerror=null;sintesi()}})}
 else sintesi()}
function ascolta(tit,txt,clip){zitto();dici(tit,'Ascolta',txt,clip)}
// ---------- uscite salvate ----------
function uscite(){try{return JSON.parse(localStorage.getItem('passi_uscite')||'[]')}catch(e){return []}}
function salvaUscita(){if(S.fatto<100||S.salvata)return;S.salvata=1;const u=uscite();u.unshift({n:S.tour.n,m:S.modo,km:S.fatto,s:S.tempo,d:Date.now(),t:S.detti.size});try{localStorage.setItem('passi_uscite',JSON.stringify(u.slice(0,50)))}catch(e){}}
// ---------- schermate ----------
let schermo='home',luogoSel=null,filtro='',filtroT='tutti';
async function sullaStrada(T){if(!SITO||T.suStrada||T.lineaVera!==undefined)return;T.suStrada=1;const r=await stradaTra(T.p,T.m==='corsa'?'piedi':T.m);if(!r||r.length<2)return;
 T.p=r;T.tot=lungo(r).at(-1);T.tappe=tappeDi(T);T.eser=eserciziDi(T);if(S.tour===T&&!S.va&&S.fatto===0){prepara(T);if(schermo==='percorso'){fit(T.p);render()}}}
function prepara(T){sullaStrada(T);S.tour=T;T.eser=eserciziDi(T);S.rotta=T.p;S.cum=lungo(T.p);S.tot=S.cum.at(-1);S.fatto=0;S.tempo=0;S.salvata=0;S.pos=T.p[0];S.dir=brg(T.p[0],T.p[1]);S.detti.clear();S.modo=T.m;S.vel=T.m==='auto'?80:40;S.esercizi=T.m==='piedi'||T.m==='corsa'}
function vai(s,arg){if(s==='percorso'&&schermo!=='cammino'&&schermo!=='percorso')S.da=schermo==='luogo'?{s:'luogo',L:luogoSel}:{s:schermo};
 if(schermo==='dove'&&s!=='dove'&&s!=='mio')fermaGps();
 schermo=s;if(s==='percorso'&&arg&&arg!==S.tour){prepara(arg);fit(arg.p)}else if(s==='percorso'){fit(S.tour.p)}
 if(['home','percorsi','risultati'].includes(s)){S.va=false;S.tour=null;S.rotta=null;S.disegna=false;zitto();fit(CONFINE,20)}
 if(s==='dove'){S.tour=null;S.rotta=null;S.disegna=false;S.va=false;center(...S.pos);V.z=Math.max(V.z,0.03);avviaGps()}
 if(s==='luogo'){luogoSel=arg;S.rotta=null;S.tour=null;S.disegna=false;zitto();center(arg[1],arg[2]);V.z=arg[0]==='Lallio'?0.03:arg[4]==='c'?0.004:arg[4]==='n'?0.0015:arg[4]==='p'?0.012:0.03}
 if(s==='crea'){zitto();S.tour=null;S.rotta=null;S.disegna=true;S.punti=[];S.attesa=null;if(!S.campi)nuovoCrea('Lallio','Lallio');const p=puntoDi(S.campi[0]);if(p){center(...p);V.z=Math.max(V.z,0.01)}}
 $('app').classList.toggle('cammino',s==='cammino');setTimeout(size,0);render();$('scroll').scrollTop=0}
function card(ico,tit,sub,on,liv){return `<button class="card" data-on="${on}"><span class="ico">${ico}${liv?pallino(liv):''}</span><span><b>${esc(tit)}</b><small>${sub}</small></span><span class="fr">›</span></button>`}
function cardT(T){const l=livello(T);return card(T.cap?'📖':MODI[T.m].split(' ')[0],T.n,`${esc(T.area)} · ${km(T.tot)} · ${durata(T.tot,T.m)} · ${T.tappe.length} tappe${l==='verde'&&T.m==='piedi'?' · ♿ adatto a tutti':''}`,'t'+TOURS.indexOf(T),l)}
const chipsModo=()=>`<div class="chips" role="group" aria-label="Come vai">${Object.keys(MODI).map(k=>`<button data-modo="${k}" aria-pressed="${k===S.modo}">${MODI[k]}</button>`).join('')}</div>`;
const notaAnteprima=t=>SITO?'':`<p class="avviso">${t}</p>`;
function render(){const P=$('scroll');let h='';
 document.querySelectorAll('nav.tab button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===({luogo:'home',percorso:S.da&&S.da.s==='crea'?'crea':'percorsi',mio:'dove'}[schermo]||schermo)?'page':'false'));
 if(schermo==='home'){const TL=TOURS[0];h=`<div class="sch"><div class="ciao"><h1>Ciao! Cosa facciamo oggi?</h1><p class="sotto">Metti le cuffie e cammina: Passi Lombardi ti racconta a voce le strade e i posti che incontri.</p></div>
  <button class="grande-dove" data-on="tab-dove"><span class="e">📍</span><b>Dove sono?</b><small>Ti dico in che via sei e cosa c'è di bello intorno a te</small></button>
  <div class="sezione"><h2>Cammina con la guida</h2><div class="tiles">
   <button class="tile" data-on="tab-crea"><span class="e">🛣️</span><b>Da via a via</b><small>Scegli tu dove partire e dove arrivare</small></button>
   <button class="tile" data-on="tab-percorsi"><span class="e">🗺️</span><b>Percorsi pronti</b><small>${TOURS.length} giri: verdi, blu e rossi</small></button></div></div>
  <div class="sezione"><h2>🏡 Lallio</h2><div class="lista">${cardT(TL)}${card('🏡','Cosa c\'è a Lallio','I posti, i racconti e i giri del paese','l'+LI.get(LP('Lallio')))}</div></div>
  <div class="sezione"><h2>Scopri una città</h2><div class="chips" role="group" aria-label="Scegli una città">${PROV.map(n=>`<button data-on="l${LI.get(LP(n))}">${esc(n)}</button>`).join('')}</div>
  <input class="cerca" id="cerca" placeholder="🔎 Cerca una città, un paese o un posto…" value="${esc(filtro)}" aria-label="Cerca un posto"><div class="lista" id="tutti"></div></div>
  ${instEv?'<button class="btn primo lungo" data-on="installa">📲 Installa l\'app sul telefono</button>':''}
  ${SITO?'<p class="nota">La tua posizione resta sul telefono e non viene salvata da nessuna parte. Per la mappa, le vie e i posti intorno la guida usa OpenStreetMap e Wikipedia. <a href="privacy.html">Privacy</a></p>':'<p class="nota">Con il GPS e la mappa delle strade: passilombardi.github.io</p>'}</div>`}
 else if(schermo==='dove'){const vic=vicini(S.pos,6);h=`<div class="sch"><div><h1>📍 Dove sono</h1><p class="sotto">Tieni il telefono in tasca: quando passi vicino a qualcosa di bello, la guida te lo racconta.</p></div>
  <div class="qui"><small>${S.gps?'Sei qui':'Posizione'}</small><b>${esc(S.via||(vic[0]&&vic[0].d<1500?'Vicino a '+vic[0].n:'…'))}</b>${S.paese?`<span class="dirvia">a ${esc(S.paese)}</span>`:''}${vic[0]&&vic[0].d<300?`<span class="dirvia">${vic[0].ico} ${esc(vic[0].n)}: ${lato(brg(S.pos,vic[0].p))}, ${quanto(vic[0].d)}</span>`:''}<span class="sotto">${S.gps?'Il GPS è acceso ✓':SITO?'Sto cercando il GPS… Se non risponde, tocca la mappa dove sei.':'Anteprima: tocca la mappa dove sei.'}</span></div>
  <button class="btn primo lungo" data-on="dimmi">🔊 Dimmi dove sono</button>
  <div class="player"><div class="top"><div class="tit"><small>${ora?esc(ora.dove):'In ascolto'}</small><b>${ora?esc(ora.tit):'Cammina!'}</b></div></div><div class="barra"><i></i></div><p>${ora?esc(ora.txt):'Appena arrivi vicino a un posto, parte il racconto.'}</p>${ora?'<button class="btn" data-on="zitto">■ Ferma</button>':''}</div>
  <div class="interr"><label>🎧 Racconta da solo quando passo vicino<input type="checkbox" data-sw="auto" ${S.auto?'checked':''}></label></div>
  <h2>Cosa c'è intorno</h2><div class="lista">${vic.map(v=>card(v.ico,v.n,km(v.d)+' · '+v.tipo,v.on)).join('')||'<p class="nota">Niente di famoso qui vicino. Prova a spostarti!</p>'}</div>
  ${card('⭐','Aggiungi un posto tuo','Per esempio la tua chiesa, il parco o la scuola, con la sua storia','tab-mio')}
  </div>`}
 else if(schermo==='mio'){h=`<div class="sch"><button class="indietro" data-on="tab-dove">‹ Indietro</button><div><h1>⭐ Aggiungi un posto tuo</h1><p class="sotto">Quando ci passi vicino, la guida racconta la storia che scrivi tu.</p></div>
  <label class="campo">Come si chiama?<input class="testo" id="mN" placeholder="Per esempio: Chiesa di San Bernardino"></label>
  <label class="campo">La sua storia<textarea id="mS" rows="4" placeholder="Scrivi cosa c'è di bello o di curioso"></textarea></label>
  <div class="avviso">📍 Il posto viene salvato ${S.gps?'dove sei adesso (GPS)':'nel punto rosso della mappa: tocca la mappa per spostarlo'}.</div>
  <button class="btn primo lungo" data-on="salvamio">Salva il posto</button>
  ${MIEI.length?`<h2>I tuoi posti</h2><div class="lista">${MIEI.map((m,i)=>`<div class="card" style="cursor:default"><span class="ico">⭐</span><span><b>${esc(m.n)}</b><small>${esc(m.s.slice(0,60))}</small></span><button class="play" data-delmio="${i}" aria-label="Cancella ${esc(m.n)}">✕</button></div>`).join('')}</div>`:''}</div>`}
 else if(schermo==='percorsi'){const L=TOURS.filter(T=>filtroT==='tutti'||livello(T)===filtroT||T.m===filtroT);
  h=`<div class="sch"><div><h1>🗺️ Percorsi pronti</h1><p class="sotto">Scegli un giro. Il colore ti dice quanto è lungo.</p></div>
  <div class="legenda"><span>${pallino('verde')}facile, meno di 3 km</span><span>${pallino('blu')}medio, fino a 8 km</span><span>${pallino('rosso')}lungo</span></div>
  <div class="chips" role="group" aria-label="Filtra">${[['tutti','Tutti'],['verde',pallino('verde')+'Verdi'],['blu',pallino('blu')+'Blu'],['rosso',pallino('rosso')+'Rossi'],['corsa','🏃 Di corsa'],['auto','🚗 In auto']].map(([k,t])=>`<button data-fil="${k}" aria-pressed="${k===filtroT}">${t}</button>`).join('')}</div>
  <div class="lista">${L.map(cardT).join('')||'<p class="nota">Nessun percorso con questo filtro.</p>'}</div></div>`}
 else if(schermo==='luogo'){const L=luogoSel,c=[L[1],L[2]],isL=L[0]==='Lallio',zona=L[4]==='c'||L[4]==='p';
  const Rv=L[4]==='c'?10000:L[4]==='n'?15000:6000;const vic=LUOGHI.filter(x=>x!==L&&dist(c,[x[1],x[2]])<Rv).sort((a,b)=>dist(c,[a[1],a[2]])-dist(c,[b[1],b[2]])).slice(0,10);
  const tl=TOURS.filter(T=>T.area===L[0]||passaVicino(T,c,L[4]==='c'?2500:1500));const g2=zona&&!tl.some(T=>T.auto&&T.area===L[0])?giroDi(L):null;luogoSel.giro=g2;const clip='L'+LI.get(L);
  h=`<div class="sch"><button class="indietro" data-on="home">‹ Indietro</button><div><h1>${zona?'Cosa c\'è a ':''}${esc(L[0])}</h1><p class="sotto">${isL?'In dialetto Lai · 4.228 abitanti · 5 km da Bergamo':TIPO[L[4]]+' · '+km(dist(c,[45.6636,9.6289]))+' da Lallio'}</p></div>
  <div class="player"><p>${esc(L[5])}</p>${GIOCHI[L[0]]?`<div class="gioco">🎲 ${esc(GIOCHI[L[0]].replace(/^Gioco: /,''))}</div>`:''}<div class="barra"><i></i></div><button class="btn primo" data-asc="${LI.get(L)}">${ora&&ora.clip===clip?'■ Ferma':'▶ Ascolta'}</button></div>
  ${isL?`<h2>📖 I racconti di Lallio</h2><ol class="tappe">${LALLIO.cap.map((c,i)=>`<li><span class="n">${i+1}</span><span><b>${esc(c[1])}</b><small>${esc(c[2].slice(0,70))}…</small></span><button class="play" data-cap="${i}" aria-label="Ascolta ${esc(c[1])}">${ora&&ora.clip==='C'+i?'■':'▶'}</button></li>`).join('')}</ol>`:''}
  <h2>🚶 Percorsi ${zona?'a '+esc(L[0]):'che passano di qui'}</h2><div class="lista">${tl.map(cardT).join('')}${g2?card(MODI[g2.m].split(' ')[0],g2.n,`${km(g2.tot)} · ${durata(g2.tot,g2.m)} · ${g2.tappe.length} tappe`,'giro',livello(g2)):''}${card('🛣️',zona?'Da via a via a '+L[0]:'Fai un percorso fino a qui','Scegli tu le vie','crea-qui')}</div>
  ${vic.length?`<h2>👀 Cosa c'è vicino</h2><div class="lista">${vic.map(x=>card(ICO[x[4]],x[0],km(dist(c,[x[1],x[2]]))+' · '+TIPO[x[4]],'l'+LI.get(x))).join('')}</div>`:''}</div>`}
 else if(schermo==='percorso'){const T=S.tour,l=livello(T);h=`<div class="sch"><button class="indietro" data-on="${S.da&&S.da.s==='luogo'?'l'+LI.get(S.da.L):'tab-'+(S.da&&S.da.s||'percorsi')}">‹ Indietro</button><div><h1>${esc(T.n)}</h1><p class="sotto">${esc(T.area||'Il tuo percorso')}</p></div>
  <div class="dati">${l?`<span>${pallino(l)}${LIVN[l]}</span>`:''}<span>📏 ${km(T.tot)}</span><span>⏱️ ${durata(T.tot,S.modo)}</span><span>📍 ${T.tappe.length} tappe</span>${S.esercizi&&T.eser.length?`<span>💪 ${T.eser.length} esercizi</span>`:''}</div>
  ${T.lineaVera===false?'<p class="avviso">La linea è indicativa: va dritta da un punto all\'altro.</p>':''}
  <button class="btn primo lungo" data-on="inizia">▶ Inizia il percorso</button>
  <h2>Come vai?</h2>${chipsModo()}
  <div class="interr"><label>🎧 Racconti dei posti<input type="checkbox" data-sw="racconti" ${S.racconti?'checked':''}></label>${T.eser.length?`<label>💪 Esercizi lungo la strada<input type="checkbox" data-sw="esercizi" ${S.esercizi?'checked':''}></label>`:''}</div>
  <h2>${T.vie&&T.vie.some(v=>v.svolta)?'Le vie e le cose che incontri':'Cosa incontri'}</h2><ol class="tappe">${T.tappe.map((t,i)=>`<li><span class="n">${i+1}</span><span><b>${t.ico||''} ${esc(t.n)}</b><small>dopo ${km(t.at)}</small></span><button class="play" data-tp="${i}" aria-label="Ascolta ${esc(t.n)}">${ora&&ora.tit===t.n?'■':'▶'}</button></li>`).join('')||'<li><span></span><span>Nessun posto famoso lungo questa strada, ma puoi chiedere «Cosa c\'è intorno?» mentre cammini.</span></li>'}</ol>
  ${SITO?'<p class="nota">Lungo la strada la guida trova anche chiese, parchi e scuole dalla mappa.</p>':''}</div>`}
 else if(schermo==='cammino'){const T=S.tour,nx=T.tappe.find(t=>!S.detti.has(t.n)),es=ora&&ora.es!=null?ESERCIZI[ora.es]:null;h=`<div class="sch">
  <div class="player"><div class="top"><button class="gplay" data-on="pausa" aria-label="${S.va?'Pausa':'Continua'}">${S.va?'❚❚':'▶'}</button><div class="tit"><small>${ora?esc(ora.dove):S.via?'🛣️ '+esc(S.via):'In cammino'}</small><b>${ora?esc(ora.tit):esc(T.n)}</b></div></div>
   <div class="barra"><i></i></div>${es?`<div class="eser"><span class="big">${es[1]}</span><p>${esc(es[2])}</p></div>`:`<p>${ora?esc(ora.txt):'La guida parla quando arrivi vicino a una tappa. Intanto guarda intorno!'}</p>`}</div>
  ${nx?`<div class="prossima"><span>${nx.svolta?nx.ico+' Prossima svolta':'Prossima tappa'}<br><b>${esc(nx.n)}</b></span><span><b id="sNx">${km(Math.max(0,nx.at-S.fatto))}</b></span></div>`:''}
  <div class="stato"><div><small>Fatti</small><b id="sKm">${km(S.fatto)}</b></div><div><small>Mancano</small><b id="sRes">${km(Math.max(0,S.tot-S.fatto))}</b></div><div><small>Tempo</small><b id="sT">${orologio(S.tempo)}</b></div><div><small>${S.modo==='corsa'?'Passo':'Tappe'}</small><b id="sP">${S.modo==='corsa'?passo():S.detti.size+'/'+T.tappe.length}</b></div></div>
  <div class="riga"><button class="btn" data-on="intorno">👀 Cosa c'è intorno?</button><button class="btn" data-on="gpscam">${S.gps?'📍 GPS acceso':'📍 Usa il GPS'}</button><button class="btn" data-on="fine">■ Fine</button></div>
  ${S.gps?'':`<div class="riga"><label for="vel">Velocità della prova</label><input type="range" id="vel" min="1" max="120" value="${S.vel}"><span>×${S.vel}</span></div>`}</div>`}
 else if(schermo==='crea'){const n=S.campi.length;
  const paesi=['Lallio',...PROV,...LUOGHI.filter(L=>L[4]==='p'&&L[0]!=='Lallio').map(L=>L[0]).sort()];
  const campo=(c,i)=>{const tit=i===0?'Da dove parti?':i===n-1?'Dove vuoi arrivare?':'Passi anche da…';const num=i===0?'A':i===n-1?'B':'+';
   const scelte=(i===0?[['qui','📍 Da qui']]:[]).concat([['via','🛣️ Una via'],['luogo','🏛️ Un posto']]);
   let corpo='';
   if(c.tipo==='qui')corpo=`<div class="qui"><small>Partenza</small><b>${S.gps?esc(S.via||'Dove sei adesso'):'Dove sei adesso'}</b><span class="sotto">${S.gps?'Il GPS ti ha trovato ✓':SITO?'Accendo il GPS quando prepari il percorso.':'Nell\'anteprima tocca la mappa per dire dove sei.'}</span></div>`;
   else if(c.tipo==='via')corpo=`<label class="campo">Paese o città<select data-paese="${i}">${paesi.map(p=>`<option ${p===c.paese?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
    <label class="campo">Nome della via<input class="testo" data-cv="${i}" placeholder="Per esempio: via Roma" value="${esc(c.via)}" autocomplete="off"></label>
    <div class="sugg" id="sug${i}"></div>
    ${c.pt?`<span class="ok">✓ ${esc(c.via)} è sulla mappa</span>`:''}${c.err?`<span class="nota">${esc(c.err)}</span>`:''}
    <button class="link${S.attesa===i?' attesa':''}" data-pt="${i}">${S.attesa===i?'👆 Adesso tocca la mappa…':c.pt?'Non è il punto giusto? Toccalo sulla mappa':'Oppure toccala sulla mappa'}</button>`;
   else corpo=`<select data-c="${i}" aria-label="Scegli il posto">${LUOGHI.slice().sort((a,b)=>a[0].localeCompare(b[0],'it')).map(L=>`<option ${L[0]===c.luogo?'selected':''}>${esc(L[0])}</option>`).join('')}</select>`;
   return `<div class="passo-n"><span class="num">${num}</span><div><h3>${tit}</h3>
   <div class="seg" style="grid-template-columns:repeat(${scelte.length},1fr)" role="group">${scelte.map(([k,t])=>`<button data-tipo="${i}:${k}" aria-pressed="${c.tipo===k}">${t}</button>`).join('')}</div>
   ${corpo}${i>0&&i<n-1?`<button class="link" data-togli="${i}">✕ Togli questa tappa</button>`:''}</div></div>`};
  h=`<div class="sch"><div><h1>🛣️ Da via a via</h1><p class="sotto">Dimmi da dove parti e dove vuoi arrivare. Io ti dico dove girare e ti racconto le cose belle che trovi per strada.</p></div>
  ${S.campi.map(campo).join('')}
  <button class="link" data-on="addvia">＋ Voglio passare anche da un'altra via</button>
  <div class="passo-n"><span class="num">🚶</span><div><h3>Come ci vai?</h3>${chipsModo()}</div></div>
  <button class="btn primo lungo" data-on="creaok">✓ Prepara il percorso</button>
  <p class="nota" id="creaMsg">${SITO?'Il percorso segue le strade vere.':'Anteprima: la linea va dritta da un punto all\'altro. Sul sito vero la guida trova le vie da sola, segue le strade e ti dice dove girare.'}</p></div>`}
 else if(schermo==='risultati'){const u=uscite(),tk=u.reduce((a,x)=>a+x.km,0),ts=u.reduce((a,x)=>a+x.s,0);
  h=`<div class="sch"><div><h1>🏅 I miei risultati</h1><p class="sotto">Tutte le tue uscite, salvate su questo telefono.</p></div>
  <div class="res"><div><b>${u.length}</b><small>uscite</small></div><div><b>${km(tk)}</b><small>in tutto</small></div><div><b>${orologio(ts)}</b><small>di tempo</small></div></div>
  <div class="lista">${u.map(x=>`<div class="card" style="cursor:default"><span class="ico">${MODI[x.m].split(' ')[0]}</span><span><b>${esc(x.n)}</b><small>${new Date(x.d).toLocaleDateString('it-IT')} · ${km(x.km)} · ${orologio(x.s)} · ${x.t} tappe ascoltate</small></span><span></span></div>`).join('')||'<p class="nota">Ancora nessuna uscita. Scegli un percorso e premi «Inizia»!</p>'}</div>
  ${u.length?'<button class="indietro" data-on="svuota">Cancella i risultati</button>':''}</div>`}
 P.innerHTML=h;bind();if(schermo==='home')cerca();draw()}
function passo(){if(S.fatto<50)return '–';const sk=S.tempo/(S.fatto/1000);return Math.floor(sk/60)+'′'+String(Math.round(sk%60)).padStart(2,'0')+'″'}
function cerca(){const q=filtro.toLowerCase(),el=$('tutti');if(!q){el.innerHTML='';return}const L=LUOGHI.filter(L=>L[0].toLowerCase().includes(q)).slice(0,30);el.innerHTML=L.map(L=>card(ICO[L[4]],L[0],TIPO[L[4]],'l'+LI.get(L))).join('')||'<p class="nota">Nessun posto con questo nome.</p>';bindIn(el)}
function vicini(p,n){const a=tutti().map(L=>({n:L[0],p:[L[1],L[2]],d:dist(p,[L[1],L[2]]),ico:ICO[L[4]],tipo:TIPO[L[4]],on:L[4]==='x'?'mio':'l'+LI.get(L)}));
 POI.forEach((P,k)=>a.push({n:P.n,p:[P.la,P.lo],d:dist(p,[P.la,P.lo]),ico:'📌',tipo:tipoPoi(P.t),on:'poi:'+k,P,k}));return a.sort((x,y)=>x.d-y.d).slice(0,n)}
// ---------- da via a via ----------
function nuovoCrea(da,a){S.campi=[{tipo:SITO?'qui':'via',luogo:da,via:'',paese:LP(da)&&(LP(da)[4]==='c'||LP(da)[4]==='p')?da:'Lallio',pt:null},{tipo:'via',luogo:a,via:'',paese:LP(a)&&(LP(a)[4]==='c'||LP(a)[4]==='p')?a:'Lallio',pt:null}]}
function puntoDi(c){if(c.tipo==='qui')return S.pos;if(c.tipo==='via')return c.pt;const L=LP(c.luogo);return L?[L[1],L[2]]:null}
function nomeDi(c){return c.tipo==='qui'?(S.via||'dove sei'):c.tipo==='via'?(c.via.trim()||'la via'):c.luogo}
async function mostraVie(i){const c=S.campi[i],el=$('sug'+i);if(!el)return;el.innerHTML='<span class="nota">Cerco…</span>';const L=await suggerisciVie(c.via.trim(),c.paese);
 el.innerHTML=L.length?L.map((x,k)=>`<button data-sv="${k}">📍 <b>${esc(x.n)}</b> <small>${esc(x.dove)}</small></button>`).join(''):'<span class="nota">Non la trovo. Controlla il nome, oppure toccala sulla mappa.</span>';
 el.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{const x=L[+b.dataset.sv];c.via=x.n;c.pt=x.pt;c.err='';center(...x.pt);V.z=Math.max(V.z,0.05);render()})}
async function trova(i){const c=S.campi[i];c.err='';if(!c.via.trim()){c.err='Scrivi prima il nome della via.';return render()}
 try{c.pt=await cercaVia(c.via.trim(),c.paese);center(...c.pt);V.z=Math.max(V.z,0.05)}catch(e){c.err='Non la trovo. Controlla il nome, oppure tocca la mappa dove si trova.';S.attesa=i}render()}
function bind(){const P=$('scroll');bindIn(P);const c=$('cerca');if(c)c.oninput=()=>{filtro=c.value;cerca()};
 const v=$('vel');if(v)v.oninput=()=>{S.vel=+v.value;v.nextElementSibling.textContent='×'+S.vel};
 P.querySelectorAll('[data-modo]').forEach(b=>b.onclick=()=>{S.modo=b.dataset.modo;S.vel=S.modo==='auto'?80:40;if(S.tour&&schermo==='percorso'){S.tour.eser=eserciziDi({...S.tour,m:S.modo});S.esercizi=S.tour.eser.length>0}render()});
 P.querySelectorAll('[data-fil]').forEach(b=>b.onclick=()=>{filtroT=b.dataset.fil;render()});
 P.querySelectorAll('[data-sw]').forEach(b=>b.onchange=()=>{S[b.dataset.sw]=b.checked;draw()});
 P.querySelectorAll('[data-asc]').forEach(b=>b.onclick=()=>{const L=LUOGHI[+b.dataset.asc],k='L'+b.dataset.asc;if(ora&&ora.clip===k){zitto();return render()}ascolta(L[0],storia(L),k);render()});
 P.querySelectorAll('[data-cap]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cap,c=LALLIO.cap[i];if(ora&&ora.clip==='C'+i){zitto();return render()}ascolta(c[1],c[2],'C'+i);render()});
 P.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>{const t=S.tour.tappe[+b.dataset.tp];if(ora&&ora.tit===t.n){zitto();return render()}if(t.poi)raccontoPoi(t.poi).then(x=>{ascolta(t.n,x.txt,x.clip);render()});else{ascolta(t.n,t.txt,t.clip);render()}});
 P.querySelectorAll('[data-tipo]').forEach(b=>b.onclick=()=>{const [i,t]=b.dataset.tipo.split(':');S.campi[+i].tipo=t;S.attesa=null;if(t==='qui'&&SITO&&!S.gps)avviaGps();render()});
 P.querySelectorAll('[data-c]').forEach(s=>s.onchange=()=>{const c=S.campi[+s.dataset.c];c.luogo=s.value;const p=puntoDi(c);if(p)center(...p);render()});
 P.querySelectorAll('[data-paese]').forEach(s=>s.onchange=()=>{const c=S.campi[+s.dataset.paese];c.paese=s.value;c.pt=null;const L=LP(s.value);if(L){center(L[1],L[2]);V.z=Math.max(V.z,0.03)}render()});
 P.querySelectorAll('[data-cv]').forEach(s=>{s.oninput=()=>{const i=+s.dataset.cv,c=S.campi[i];c.via=s.value;c.pt=null;draw();clearTimeout(c.tm);if(SITO&&c.via.trim().length>=3)c.tm=setTimeout(()=>mostraVie(i),500)};s.onkeydown=e=>{if(e.key==='Enter'&&SITO)mostraVie(+s.dataset.cv)}});
 P.querySelectorAll('[data-trova]').forEach(b=>b.onclick=()=>{b.textContent='🔎 Cerco…';trova(+b.dataset.trova)});
 P.querySelectorAll('[data-pt]').forEach(b=>b.onclick=()=>{const i=+b.dataset.pt;S.attesa=S.attesa===i?null:i;const c=S.campi[i];const L=LP(c.paese);if(S.attesa===i&&L&&!c.pt){center(L[1],L[2]);V.z=Math.max(V.z,0.03)}render()});
 P.querySelectorAll('[data-togli]').forEach(b=>b.onclick=()=>{S.campi.splice(+b.dataset.togli,1);render()});
 P.querySelectorAll('[data-delmio]').forEach(b=>b.onclick=()=>{MIEI.splice(+b.dataset.delmio,1);salvaMiei();render()})}
function bindIn(root){root.querySelectorAll('[data-on]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();azione(b.dataset.on)})}
document.querySelectorAll('nav.tab button').forEach(b=>b.onclick=()=>azione('tab-'+b.dataset.tab));
function azione(k){
 if(k==='home')return vai('home');if(k.startsWith('tab-'))return vai(k.slice(4));if(k==='giro')return vai('percorso',luogoSel.giro);
 if(k.startsWith('poi:')){const P=POI.get(k.slice(4));raccontoPoi(P).then(r=>ascolta(P.n,r.txt,r.clip));return}
 if(k==='mio'){const m=vicini(S.pos,20).find(v=>v.on==='mio');const M=m&&MIEI.find(x=>x.n===m.n);if(M)ascolta(M.n,M.s);return}
 if(k[0]==='t'&&!isNaN(+k.slice(1)))return vai('percorso',TOURS[+k.slice(1)]);if(k[0]==='l'&&!isNaN(+k.slice(1)))return vai('luogo',LUOGHI[+k.slice(1)]);
 if(k==='crea-qui'){const z=luogoSel[4]==='c'||luogoSel[4]==='p';nuovoCrea(z?luogoSel[0]:'Lallio',z?luogoSel[0]:luogoSel[0]);if(!z){S.campi[1].tipo='luogo'}return vai('crea')}
 if(k==='addvia'){const ult=S.campi.at(-1);S.campi.splice(S.campi.length-1,0,{tipo:'via',luogo:'Bergamo',via:'',paese:ult.paese||'Lallio',pt:null});return render()}
 if(k==='svuota'){try{localStorage.removeItem('passi_uscite')}catch(e){}return render()}
 if(k==='salvamio'){const n=$('mN').value.trim(),s=$('mS').value.trim();if(!n)return $('mN').focus();MIEI.push({n,s:s||'Questo è un posto speciale: '+n+'.',la:S.pos[0],lo:S.pos[1]});salvaMiei();return vai('dove')}
 if(k==='zitto'){zitto();return render()}if(k==='dimmi'){diciDove();return render()}if(k==='installa'){if(instEv){instEv.prompt();instEv.userChoice.finally(()=>{instEv=null;render()})}return}
 if(k==='creaok')return creaOk();
 if(k==='inizia'){vai('cammino');parti();return}
 if(k==='pausa'){if(S.va){S.va=false;try{audio.pause()}catch(e){}try{speechSynthesis.pause()}catch(e){}}else{try{if(ora&&ora.clip)audio.play().catch(()=>{})}catch(e){}try{speechSynthesis.resume()}catch(e){}parti()}return render()}
 if(k==='intorno')return intorno();if(k==='gpscam'){if(S.gps)fermaGps();else avviaGps();return render()}
 if(k==='fine'){S.va=false;fermaGps();salvaUscita();zitto();return vai('percorso')}}
async function creaOk(){const msg=$('creaMsg');
 if(S.campi[0].tipo==='qui'&&SITO&&!S.gps){if(wid==null)avviaGps();msg.textContent='Cerco dove sei con il GPS…';for(let k=0;k<20&&!S.gps;k++)await new Promise(r=>setTimeout(r,500));
  if(!S.gps){msg.textContent='Non trovo il GPS. Controlla che sia acceso e che il sito possa usare la posizione, oppure scegli «Una via» come partenza.';msg.classList.add('avviso');return}}
 const manca=S.campi.find(c=>c.tipo==='via'&&(!c.via.trim()||!c.pt));
 if(manca){msg.textContent=!manca.via.trim()?'Scrivi il nome di ogni via.':SITO?'Scegli «'+manca.via+'» dall\'elenco sotto il nome, oppure toccala sulla mappa.':'Tocca la mappa dove si trova «'+manca.via+'».';msg.classList.add('avviso');return}
 const pts=S.campi.map(puntoDi);msg.textContent='Preparo il percorso…';
 const r=await stradaTra(pts,S.modo,true);const vera=!!r;const p=r?r.p:pts;const cum=lungo(p);
 const vie=[];S.campi.forEach((c,i)=>{if(c.tipo!=='via'&&c.tipo!=='qui')return;const pt=puntoDi(c);const at=vera?proietta(p,cum,pt)[1]:cum[i];const nome=nomeDi(c);
  vie.push({n:i===0?'Partenza: '+nome:i===S.campi.length-1?'Arrivo: '+nome:'Passi da '+nome,at:i===S.campi.length-1?cum.at(-1)-1:at,txt:i===0?(c.tipo==='qui'?'Si parte da qui! Ti dico io dove girare, e ti racconto le cose belle che incontri.':`Si parte da ${nome}! Ti dico io dove girare, e ti racconto le cose belle che incontri.`):i===S.campi.length-1?`Sei arrivato in ${nome}. Questa era la tua meta: bravissimo!`:`Adesso passi da ${nome}.`,ico:i===0?'🟢':i===S.campi.length-1?'🏁':'🛣️'})});
 if(r)r.st.forEach(v=>{const at=proietta(p,cum,v.pt)[1];if(at<20||at>cum.at(-1)-20)return;vie.push({n:frase(v),at,txt:frase(v)+'.',ico:ICOSV[v.mod]||'🛣️',svolta:1})});
 const T={n:`Da ${nomeDi(S.campi[0])} a ${nomeDi(S.campi.at(-1))}`,area:'Percorso fatto da te'+(vera?'':' · linea indicativa'),m:S.modo,p,vie,lineaVera:vera};T.tot=cum.at(-1);T.tappe=tappeDi(T);
 if(SITO){await postiIntorno(p[0]);await postiIntorno(p.at(-1));aggiungiPoi(T)}
 S.disegna=false;S.attesa=null;const m=S.modo;vai('percorso',T);S.modo=m;S.vel=m==='auto'?80:40;render()}
function aggiungiPoi(T){const cum=lungo(T.p);POI.forEach(P=>{const [d,at]=proietta(T.p,cum,[P.la,P.lo]);if(d<60&&!T.tappe.some(t=>t.n===P.n))T.tappe.push({n:P.n,txt:'',at,ico:'📌',poi:P})});T.tappe.sort((a,b)=>a.at-b.at)}
// ---------- GPS ----------
let wid=null;
function avviaGps(){if(!navigator.geolocation){S.gps=false;return}try{wid=navigator.geolocation.watchPosition(p=>{const q=[p.coords.latitude,p.coords.longitude];if(S.gps&&dist(q,S.pos)>3)S.dir=brg(S.pos,q);S.pos=q;S.gps=true;nuovaPos()},()=>{S.gps=false;ui()},{enableHighAccuracy:true,maximumAge:3000,timeout:15000})}catch(e){}}
function fermaGps(){try{if(wid!=null)navigator.geolocation.clearWatch(wid)}catch(e){}wid=null;S.gps=false}
let rendT=0;
async function nuovaPos(){if(S.segui)center(...S.pos);
 if(schermo==='cammino'&&S.gps){const [d,at]=proietta(S.rotta,S.cum,S.pos);if(d<150&&at>S.fatto){S.tempo+=(at-S.fatto)/VEL[S.modo];S.fatto=at}controlla()}
 postiIntorno(S.pos);const v=await nomeVia(S.pos);if(v&&v!==S.via){S.via=v;if(schermo==='dove'&&S.auto){dici(v,'🛣️ Sei in','Adesso sei in '+v+(S.paese?', a '+S.paese:'')+'.');legame(v)}}
 if(schermo==='dove'&&S.auto)vicinoA(S.pos);
 draw();if(Date.now()-rendT>3000){rendT=Date.now();ui()}}
// «Sei in piazza San Bernardino»: se c'è un posto con lo stesso nome lì vicino (la chiesa), lo racconto
function chiave(v){return v.toLowerCase().replace(/^(via|viale|piazza|piazzale|piazzetta|corso|largo|vicolo|strada|sagrato)\s+(della |dello |delle |dei |degli |del |di |d')?/,'').trim()}
function legame(v){const k=chiave(v);if(k.length<4)return;const c=vicini(S.pos,40).filter(x=>x.d<400&&x.n.toLowerCase().includes(k)&&!S.detti.has(x.n)&&!(x.k&&S.detti.has(x.k)));if(!c.length)return;const x=c[0];S.detti.add(x.n);if(x.k)S.detti.add(x.k);
 const dove=lato(brg(S.pos,x.p))+', '+quanto(x.d);const testo=r=>`Qui in ${v} c'è ${x.n}: è ${dove}. ${r}`;
 if(x.P)raccontoPoi(x.P).then(r=>dici(x.n,'📌 '+dove,testo(r.txt)));else{const L=tutti().find(L=>L[0]===x.n);if(L)dici(x.n,'📌 '+dove,testo(L[4]==='x'?L[5]:storia(L)))}}
async function diciDove(){zitto();if(SITO&&!S.via){S.via=await nomeVia(S.pos)}const v=vicini(S.pos,6).filter(x=>x.d<500).slice(0,3);
 let t=S.via?`Sei in ${S.via}${S.paese?', a '+S.paese:''}.`:S.paese?`Sei a ${S.paese}.`:'';
 if(v.length)t+=' Intorno a te: '+v.map(x=>`${x.n}, ${lato(brg(S.pos,x.p))}, ${quanto(x.d)}`).join('; ')+'.';else t+=' Qui vicino non conosco posti famosi: prova a camminare un po\', e appena trovo qualcosa te lo racconto.';
 dici('Dove sono','📍 Sei qui',t.trim());if(S.via)legame(S.via);const x=v[0];if(x&&x.d<150&&!S.detti.has(x.n)){S.detti.add(x.n);if(x.k)S.detti.add(x.k);if(x.P)raccontoPoi(x.P).then(r=>dici(x.n,'📌 '+lato(brg(S.pos,x.p)),r.txt,r.clip));else{const L=tutti().find(L=>L[0]===x.n);if(L)dici(L[0],'Sei vicino a '+ICO[L[4]],L[4]==='x'?L[5]:storia(L),L[4]==='x'?null:'L'+LI.get(L))}}}
// racconta da solo quello che c'è proprio qui
function vicinoA(p){tutti().forEach(L=>{const R=L[4]==='m'||L[4]==='x'?Math.max(80,Math.min(L[3],200)):L[4]==='n'?Math.min(L[3],1500):Math.min(L[3],800);if(S.detti.has(L[0])||dist(p,[L[1],L[2]])>R)return;S.detti.add(L[0]);dici(L[0],'Sei vicino a '+ICO[L[4]],L[4]==='x'?L[5]:storia(L),L[4]==='x'?null:'L'+LI.get(L))});
 POI.forEach((P,k)=>{if(S.detti.has(k)||dist(p,[P.la,P.lo])>60)return;S.detti.add(k);raccontoPoi(P).then(r=>dici(P.n,'📌 '+lato(brg(p,[P.la,P.lo])),r.txt,r.clip))})}
// ---------- il cammino ----------
function lato(b){const r=((b-S.dir)+540)%360-180;return Math.abs(r)<35?'davanti a te':Math.abs(r)>145?'dietro di te':r>0?'alla tua destra':'alla tua sinistra'}
const quanto=m=>m<120?'proprio qui':m<1000?`a ${Math.round(m/10)*10} metri`:`a ${km(m)}`;
function controlla(){S.tour.tappe.forEach((t,i)=>{if(S.detti.has(t.n))return;const vicino=t.L?dist(S.pos,[t.L[1],t.L[2]])<=Math.max(150,Math.min(t.L[3],S.modo==='auto'?4000:1500)):false;
 if(S.fatto>=t.at-(t.svolta?40:30)||vicino){S.detti.add(t.n);if(!S.racconti&&!t.via)return;if(t.svolta){S.coda.unshift({tit:t.n,dove:'🧭 Tra poco',txt:t.txt});prossimo();return}const d=t.L?dist(S.pos,[t.L[1],t.L[2]]):0;const dove=`Tappa ${i+1} · `+(t.L&&d>120?lato(brg(S.pos,[t.L[1],t.L[2]]))+', '+quanto(d):'sei qui');
  if(t.poi)raccontoPoi(t.poi).then(r=>dici(t.n,dove,r.txt,r.clip));else dici(t.n,dove,t.txt,t.clip)}});
 if(S.esercizi)S.tour.eser.forEach(e=>{const k='e'+e.at;if(S.detti.has(k)||S.fatto<e.at)return;S.detti.add(k);const E=ESERCIZI[e.es];dici(E[0],'💪 Esercizio',E[2],'E'+e.es,{es:e.es})})}
function intorno(){const v=vicini(S.pos,3);const L0=tutti().find(L=>L[0]===v[0].n);
 const lista=v.map(x=>`${x.n} ${quanto(x.d)}`).join(' · ');if(L0)dici(L0[0],'Intorno a te · '+lista,L0[4]==='x'?L0[5]:storia(L0),L0[4]==='x'?null:'L'+LI.get(L0));else dici('Intorno a te','Guarda bene',lista+'.')}
let t0=0;
function parti(){if(S.fatto>=S.tot){S.fatto=0;S.tempo=0;S.salvata=0;S.detti.clear()}S.va=true;S.segui=true;if(S.modo!=='auto'&&V.z<0.02)V.z=0.06;
 try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
 if(SITO)postiIntorno(S.rotta[0]);
 if(S.fatto===0)dici('Si parte!',MODI[S.modo],`${S.tour.n}. Il percorso è lungo ${km(S.tot)} e ha ${S.tour.tappe.length} tappe. Quando arrivi vicino a una tappa te la racconto io. Buon divertimento!`,'Fparti');t0=0;requestAnimationFrame(passoAnim);render()}
let ultimo=0;
function passoAnim(t){if(!S.va||schermo!=='cammino'){t0=0;return}const dt=t0?Math.min(.1,(t-t0)/1000):0;t0=t;
 const es=ora&&ora.es!=null;if(S.gps){S.tempo+=dt}else if(!es){const d=VEL[S.modo]*S.vel*dt;S.fatto=Math.min(S.tot,S.fatto+d);S.tempo+=d/VEL[S.modo];
  S.pos=puntoA(S.fatto);let i=1;while(i<S.cum.length-1&&S.cum[i]<S.fatto)i++;S.dir=brg(S.rotta[i-1],S.rotta[i]);if(S.segui)center(...S.pos);controlla();if(SITO&&t-ultimo>400){postiIntorno(S.pos);vicinoPoi()}}
 draw();
 if(t-ultimo>400){ultimo=t;const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};set('sKm',km(S.fatto));set('sRes',km(Math.max(0,S.tot-S.fatto)));set('sT',orologio(S.tempo));set('sP',S.modo==='corsa'?passo():S.detti.size+'/'+S.tour.tappe.length);const nx=S.tour.tappe.find(x=>!S.detti.has(x.n));if(nx)set('sNx',km(Math.max(0,nx.at-S.fatto)))}
 if(S.fatto>=S.tot-5){S.va=false;fermaGps();salvaUscita();dici('Arrivato!','Fine del percorso',`Sei arrivato! Bravissimo, hai fatto ${km(S.tot)} in ${orologio(S.tempo)} e hai ascoltato ${S.tour.tappe.filter(x=>S.detti.has(x.n)).length} tappe.`,'Ffine');render();return}requestAnimationFrame(passoAnim)}
function vicinoPoi(){if(!S.racconti)return;POI.forEach((P,k)=>{if(S.detti.has(k)||S.detti.has(P.n)||dist(S.pos,[P.la,P.lo])>50)return;S.detti.add(k);raccontoPoi(P).then(r=>dici(P.n,'📌 '+lato(brg(S.pos,[P.la,P.lo])),r.txt,r.clip))})}
function ui(){if(['cammino','luogo','percorso','dove'].includes(schermo)){const y=$('scroll').scrollTop;render();$('scroll').scrollTop=y}}
// ---------- mappa: trascina, zoom, tocca ----------
let drag=null,pin=null;const ptr=new Map();
cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.offsetX,e.offsetY]);drag={x:e.offsetX,y:e.offsetY,cx:V.cx,cy:V.cy,mv:0};if(ptr.size===2){const [a,b]=[...ptr.values()];pin={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:V.z}}};
cv.onpointermove=e=>{if(!ptr.has(e.pointerId))return;ptr.set(e.pointerId,[e.offsetX,e.offsetY]);if(ptr.size===2&&pin){const [a,b]=[...ptr.values()];V.z=Math.max(.0003,Math.min(1.5,pin.z*Math.hypot(a[0]-b[0],a[1]-b[1])/pin.d));draw();return}
 if(!drag)return;const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;drag.mv=Math.max(drag.mv,Math.abs(dx)+Math.abs(dy));if(drag.mv>6){S.segui=false;V.cx=drag.cx-dx/V.z;V.cy=drag.cy-dy/V.z;draw()}};
cv.onpointerup=e=>{ptr.delete(e.pointerId);if(ptr.size<2)pin=null;if(drag&&drag.mv<=6){const q=fromS(e.offsetX,e.offsetY);
  if(schermo==='crea'&&S.attesa!=null&&S.campi[S.attesa]){S.campi[S.attesa].pt=q;S.campi[S.attesa].err='';S.attesa=null;render()}
  else if((schermo==='dove'||schermo==='mio')&&!S.gps){S.dir=brg(S.pos,q);S.pos=q;nuovaPos();render()}}
 if(!ptr.size)drag=null};
cv.onwheel=e=>{e.preventDefault();const f=e.deltaY<0?1.2:1/1.2,p=fromS(e.offsetX,e.offsetY),q=xy(p[0],p[1]);V.z=Math.max(.0003,Math.min(1.5,V.z*f));V.cx=q[0]-(e.offsetX-W/2)/V.z;V.cy=q[1]-(e.offsetY-H/2)/V.z;draw()};
$('zin').onclick=()=>{V.z=Math.min(1.5,V.z*1.6);draw()};$('zout').onclick=()=>{V.z=Math.max(.0003,V.z/1.6);draw()};$('segui').onclick=()=>{S.segui=true;center(...S.pos);draw()};
addEventListener('resize',size);try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',draw)}catch(e){}
let instEv=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();instEv=e;if(schermo==='home')render()});
if(SITO&&'serviceWorker' in navigator)try{navigator.serviceWorker.register('sw.js')}catch(e){}
size();vai('home');
</script>
