// HOME 3D DESIGN - materiali e texture generate (nessun file immagine esterno)
import * as THREE from 'three';

const TEX = new Map();
let maxAniso = 4;
export function setAniso(a){ maxAniso = a; }

function canvas(size = 512){ const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')]; }
function rnd(seed){ let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function shade(hex, amt){ const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return '#' + c.getHexString(); }
function finish(c, key, srgb = true){
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  TEX.set(key, t);
  return t;
}
function noise(ctx, size, amount, r, alpha = .08){
  for (let i = 0; i < amount; i++){
    const v = r() < .5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
}

/* ---------- legno (venature) ---------- */
function woodTex(base, key, planks = false){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(key.length * 977 + 13);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  const rows = planks ? 8 : 1, ph = S / rows;
  for (let p = 0; p < rows; p++){
    const tone = planks ? (r() - .5) * .10 : 0;
    x.fillStyle = shade(base, tone); x.fillRect(0, p * ph, S, ph);
    for (let i = 0; i < 46; i++){
      const y = p * ph + r() * ph, w = .6 + r() * 2.2;
      x.strokeStyle = `rgba(60,30,10,${.05 + r() * .12})`; x.lineWidth = w;
      x.beginPath(); x.moveTo(0, y);
      for (let k = 0; k <= S; k += 32) x.lineTo(k, y + Math.sin(k * .012 + i) * (2 + r() * 3));
      x.stroke();
    }
    if (r() < .5){ const kx = r() * S, ky = p * ph + ph * .5; x.fillStyle = 'rgba(70,35,15,.22)'; x.beginPath(); x.ellipse(kx, ky, 10 + r() * 10, 4 + r() * 3, 0, 0, Math.PI * 2); x.fill(); }
    if (planks){
      x.fillStyle = 'rgba(40,20,5,.45)'; x.fillRect(0, p * ph, S, 2);
      const off = r() * S; x.fillRect(off, p * ph, 2, ph); x.fillRect((off + S / 2) % S, p * ph, 2, ph);
    }
  }
  noise(x, S, 6000, r, .06);
  return finish(c, key);
}
function herringboneTex(base, key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(99);
  x.fillStyle = shade(base, -.15); x.fillRect(0, 0, S, S);
  const L = 128, Wd = 32;
  for (let gy = -2; gy < 12; gy++) for (let gx = -2; gx < 10; gx++){
    for (let k = 0; k < 2; k++){
      x.save();
      const ox = gx * 64 + (k ? 32 : 0), oy = gy * 64 + (k ? -32 : 0) + gx * 0;
      x.translate(ox, oy); x.rotate(k ? -Math.PI / 4 : Math.PI / 4);
      x.fillStyle = shade(base, (r() - .5) * .14); x.fillRect(0, 0, L * .7, Wd * .7);
      x.strokeStyle = 'rgba(50,25,8,.35)'; x.lineWidth = 1.5; x.strokeRect(0, 0, L * .7, Wd * .7);
      x.restore();
    }
  }
  noise(x, S, 5000, r, .06);
  return finish(c, key);
}
/* ---------- piastrelle ---------- */
function tileTex(a, b, grout, n, key, checker = false){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(n * 31 + key.length);
  const t = S / n;
  x.fillStyle = grout; x.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){
    const col = checker ? ((i + j) % 2 ? a : b) : shade(a, (r() - .5) * .04);
    x.fillStyle = col; x.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
    const g = x.createLinearGradient(i * t, j * t, i * t + t, j * t + t);
    g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,.05)');
    x.fillStyle = g; x.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
  }
  noise(x, S, 2500, r, .04);
  return finish(c, key);
}
/* ---------- marmo ---------- */
function marbleTex(base, vein, key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(key.length * 131);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 18; i++){
    let px = r() * S, py = r() * S; const ang = r() * Math.PI;
    x.strokeStyle = vein; x.globalAlpha = .08 + r() * .3; x.lineWidth = .5 + r() * 2.5;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 40; k++){ px += Math.cos(ang + (r() - .5) * 1.4) * 18; py += Math.sin(ang + (r() - .5) * 1.4) * 18; x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1;
  for (let i = 0; i < 30; i++){ x.fillStyle = `rgba(255,255,255,${r() * .06})`; x.beginPath(); x.arc(r() * S, r() * S, 20 + r() * 60, 0, 7); x.fill(); }
  return finish(c, key);
}
/* ---------- tessuti ---------- */
function fabricTex(key, velvet = false){
  if (TEX.has(key)) return TEX.get(key);
  const S = 256, [c, x] = canvas(S), r = rnd(velvet ? 7 : 3);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
  if (!velvet){
    for (let i = 0; i < S; i += 2){ x.fillStyle = `rgba(0,0,0,${.04 + r() * .04})`; x.fillRect(i, 0, 1, S); x.fillRect(0, i, S, 1); }
  } else {
    for (let i = 0; i < 40; i++){ const g = x.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, 60); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); }
  }
  noise(x, S, 9000, r, .10);
  return finish(c, key);
}
function leatherTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 256, [c, x] = canvas(S), r = rnd(11);
  x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++){ x.strokeStyle = `rgba(0,0,0,${.03 + r() * .06})`; x.lineWidth = .8; x.beginPath(); const px = r() * S, py = r() * S; x.moveTo(px, py); x.lineTo(px + (r() - .5) * 12, py + (r() - .5) * 12); x.stroke(); }
  return finish(c, key);
}
/* ---------- muri e superfici ---------- */
function brickTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(5);
  x.fillStyle = '#d8d2c8'; x.fillRect(0, 0, S, S);
  const bh = 32, bw = 96;
  for (let row = 0; row < S / bh; row++){
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col < S / bw + 1; col++){
      const h = 8 + r() * 12, s = 40 + r() * 18, l = 38 + r() * 14;
      x.fillStyle = `hsl(${h},${s}%,${l}%)`;
      x.fillRect(col * bw + off + 3, row * bh + 3, bw - 6, bh - 6);
    }
  }
  noise(x, S, 8000, r, .10);
  return finish(c, key);
}
function stoneTex(key, base = '#a8a296'){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(17);
  x.fillStyle = shade(base, -.2); x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++){
    x.fillStyle = shade(base, (r() - .5) * .18);
    const px = r() * S, py = r() * S, rw = 30 + r() * 50, rh = 20 + r() * 40;
    x.beginPath(); x.ellipse(px, py, rw, rh, r() * 3, 0, 7); x.fill();
  }
  noise(x, S, 9000, r, .12);
  return finish(c, key);
}
function concreteTex(key, base = '#a9a9a6'){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(23);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++){ const g = x.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, 40 + r() * 90); g.addColorStop(0, `rgba(${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},.05)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); }
  noise(x, S, 14000, r, .10);
  return finish(c, key);
}
function grassTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 512, [c, x] = canvas(S), r = rnd(29);
  x.fillStyle = '#5a9a3e'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++){ x.strokeStyle = `hsl(${85 + r() * 30},${40 + r() * 25}%,${25 + r() * 25}%)`; x.lineWidth = 1; const px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 3, py - 3 - r() * 6); x.stroke(); }
  return finish(c, key);
}
function stripesTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 256, [c, x] = canvas(S);
  x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 64){ x.fillStyle = 'rgba(0,0,0,.10)'; x.fillRect(i, 0, 28, S); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(i + 30, 0, 3, S); }
  return finish(c, key);
}
function slatsTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 256, [c, x] = canvas(S);
  x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 32){ x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(i, 0, 3, S); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(i + 3, 0, 2, S); }
  return finish(c, key);
}
function waterTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const S = 256, [c, x] = canvas(S), r = rnd(31);
  x.fillStyle = '#3fb4d8'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++){ x.strokeStyle = `rgba(255,255,255,${.1 + r() * .25})`; x.lineWidth = 1 + r() * 2; x.beginPath(); const px = r() * S, py = r() * S; x.moveTo(px, py); x.quadraticCurveTo(px + 10, py - 6, px + 22, py); x.stroke(); }
  return finish(c, key);
}
function screenTex(key){
  if (TEX.has(key)) return TEX.get(key);
  const [c, x] = canvas(256);
  const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, '#1b2a4a'); g.addColorStop(.6, '#2c4f86'); g.addColorStop(1, '#0f1626');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(140, 0); x.lineTo(40, 256); x.lineTo(0, 256); x.fill();
  return finish(c, key);
}
function artTex(key, seed){
  if (TEX.has(key)) return TEX.get(key);
  const S = 256, [c, x] = canvas(S), r = rnd(seed);
  const pal = [['#f4ede1','#e07a3f','#2f5fb3','#f2c14e','#1f2a44'],['#e8efe9','#3f7d5a','#a3c9a8','#f2e8cf','#bc4b51'],['#1e1e24','#fb8b24','#d90368','#e9ecef','#04a777'],['#f6f1e9','#c6a15b','#2b2b2b','#7a8b99','#e5d4c0']][seed % 4];
  x.fillStyle = pal[0]; x.fillRect(0, 0, S, S);
  if (seed % 4 === 1){ // paesaggio
    x.fillStyle = '#bfe1f5'; x.fillRect(0, 0, S, S * .6);
    x.fillStyle = pal[4]; x.beginPath(); x.arc(190, 70, 26, 0, 7); x.fill();
    x.fillStyle = pal[1]; x.beginPath(); x.moveTo(0, 170); x.lineTo(80, 90); x.lineTo(150, 160); x.lineTo(210, 110); x.lineTo(256, 160); x.lineTo(256, 256); x.lineTo(0, 256); x.fill();
    x.fillStyle = pal[2]; x.fillRect(0, 190, S, 66);
  } else {
    for (let i = 0; i < 7; i++){
      x.fillStyle = pal[1 + Math.floor(r() * 4)];
      if (r() < .5){ x.beginPath(); x.arc(r() * S, r() * S, 20 + r() * 60, 0, 7); x.fill(); }
      else x.fillRect(r() * S, r() * S, 30 + r() * 90, 20 + r() * 90);
    }
  }
  return finish(c, key);
}

/* ---------- catalogo dei materiali ---------- */
export const WOODS = { rovere:'#c79a63', noce:'#6b4228', wenge:'#3a2a20', betulla:'#e2c79a', ciliegio:'#9a5232', bianco:'#ece6dc' };
export const MARBLES = { 'marmo bianco':['#f1eee9','#8d8a85'], 'marmo nero':['#25252a','#d6d2c8'], 'marmo verde':['#2f5a48','#cde3d6'], 'marmo rosa':['#e8cfc6','#9d6e66'] };
export const METALS = { cromo:['#e8eaed',.08], ottone:['#d4a64a',.25], 'nero opaco':['#2a2a2c',.55], acciaio:['#b9bdc2',.3], rame:['#c47a4a',.25] };

export const FINISHES = [
  { k:'tessuto', n:'Tessuto', color:true },
  { k:'velluto', n:'Velluto', color:true },
  { k:'pelle', n:'Pelle', color:true },
  { k:'laccato', n:'Laccato', color:true },
  { k:'plastica', n:'Opaco', color:true },
  ...Object.keys(WOODS).map(w => ({ k:'legno:' + w, n:'Legno ' + w })),
  ...Object.keys(MARBLES).map(m => ({ k:m, n:m[0].toUpperCase() + m.slice(1) })),
  ...Object.keys(METALS).map(m => ({ k:'metallo:' + m, n:m[0].toUpperCase() + m.slice(1) })),
  { k:'vetro', n:'Vetro' },
];
export const SEC_FINISHES = [...Object.keys(WOODS).map(w => ({ k:'legno:' + w, n:'Legno ' + w })), ...Object.keys(METALS).map(m => ({ k:'metallo:' + m, n:m[0].toUpperCase() + m.slice(1) })), { k:'laccato:#ffffff', n:'Laccato bianco' }, { k:'laccato:#1d1d20', n:'Laccato nero' }];
export const PALETTE = ['#f4f1ea','#e9dcc4','#cdb89a','#a68a6d','#7a5a43','#4a3a2f','#f2b6c6','#e06c75','#c0392b','#8e2b3b','#f39c4a','#f4c430','#d9c46a','#9bbf6a','#4caf6a','#2e7d5b','#5b7a4a','#86d6bd','#73bfe9','#3b7dd8','#2f4f9e','#1f2f5c','#8a5cc9','#5a3d7a','#cfd2d6','#9aa0a6','#5f646b','#33363b','#1d1d20','#ffffff'];

const MAT = new Map();
export function material(spec, color){
  const key = spec + '|' + (color || '');
  if (MAT.has(key)) return MAT.get(key);
  let m;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  if (!color && ['tessuto', 'velluto', 'pelle', 'laccato', 'plastica'].includes(spec)) color = '#b9b2a8';
  if (spec === 'tessuto') m = std({ color, map: fabricTex('fab'), roughness: .95 });
  else if (spec === 'velluto') m = new THREE.MeshPhysicalMaterial({ color, map: fabricTex('vel', true), roughness: .8, sheen: 1, sheenRoughness: .45, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .35) });
  else if (spec === 'pelle') m = std({ color, map: leatherTex('lea'), roughness: .45 });
  else if (spec === 'laccato') m = std({ color, roughness: .28, metalness: 0 });
  else if (spec.startsWith('laccato:')) m = std({ color: spec.slice(8), roughness: .28 });
  else if (spec === 'plastica') m = std({ color, roughness: .7 });
  else if (spec.startsWith('legno:')){ const w = spec.slice(6); m = std({ map: woodTex(WOODS[w] || WOODS.rovere, 'w-' + w), roughness: .6 }); }
  else if (MARBLES[spec]){ const [b, v] = MARBLES[spec]; m = std({ map: marbleTex(b, v, 'm-' + spec), roughness: .15 }); }
  else if (spec.startsWith('metallo:')){ const [c, r] = METALS[spec.slice(8)] || METALS.cromo; m = std({ color: c, metalness: 1, roughness: r }); }
  else if (spec === 'vetro') m = new THREE.MeshPhysicalMaterial({ color: '#dfeff5', roughness: .04, metalness: 0, transparent: true, opacity: .32, envMapIntensity: 1.4, depthWrite: false });
  else m = FIXED[spec] ? FIXED[spec]() : std({ color: color || '#cccccc', roughness: .6 });
  MAT.set(key, m);
  return m;
}
const FIXED = {
  ceramica: () => new THREE.MeshStandardMaterial({ color: '#fbfbf9', roughness: .12 }),
  bianco: () => new THREE.MeshStandardMaterial({ color: '#f5f5f2', roughness: .6 }),
  nero: () => new THREE.MeshStandardMaterial({ color: '#1c1c1f', roughness: .5 }),
  schermo: () => new THREE.MeshStandardMaterial({ map: screenTex('scr'), roughness: .15, emissive: '#16233f', emissiveIntensity: .35 }),
  foglia: () => new THREE.MeshStandardMaterial({ color: '#3f8f4f', roughness: .7, side: THREE.DoubleSide }),
  foglia2: () => new THREE.MeshStandardMaterial({ color: '#2d6e3c', roughness: .7, side: THREE.DoubleSide }),
  foglia3: () => new THREE.MeshStandardMaterial({ color: '#67b06a', roughness: .7, side: THREE.DoubleSide }),
  terra: () => new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 1 }),
  acqua: () => new THREE.MeshStandardMaterial({ map: waterTex('wat'), color: '#9fe3f5', roughness: .05, metalness: .1, transparent: true, opacity: .85 }),
  lampadina: () => new THREE.MeshStandardMaterial({ color: '#fff7dd', emissive: '#ffe2a0', emissiveIntensity: 1.6, roughness: .3 }),
  paralume: () => new THREE.MeshStandardMaterial({ color: '#f6efe1', emissive: '#ffcf87', emissiveIntensity: .25, roughness: .9, side: THREE.DoubleSide }),
  materasso: () => new THREE.MeshStandardMaterial({ color: '#f7f6f2', map: fabricTex('fab'), roughness: .95 }),
  cuscino: () => new THREE.MeshStandardMaterial({ color: '#ffffff', map: fabricTex('fab'), roughness: .95 }),
  corteccia: () => new THREE.MeshStandardMaterial({ map: woodTex('#6b4a2f', 'w-bark'), roughness: .95 }),
  cielo: () => new THREE.MeshStandardMaterial({ color: '#cfe9fb', emissive: '#bfe3ff', emissiveIntensity: .55, roughness: .1 }),
  fuoco: () => new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 2.2, roughness: .5 }),
  libri: () => new THREE.MeshStandardMaterial({ map: booksTex(), roughness: .8 }),
  cromo: () => new THREE.MeshStandardMaterial({ color: '#e8eaed', metalness: 1, roughness: .1 }),
  gomma: () => new THREE.MeshStandardMaterial({ color: '#222', roughness: .9 }),
  frutta1: () => new THREE.MeshStandardMaterial({ color: '#d9483b', roughness: .4 }),
  frutta2: () => new THREE.MeshStandardMaterial({ color: '#f4c430', roughness: .4 }),
  frutta3: () => new THREE.MeshStandardMaterial({ color: '#7cb342', roughness: .4 }),
  fiore1: () => new THREE.MeshStandardMaterial({ color: '#f06292', roughness: .6 }),
  fiore2: () => new THREE.MeshStandardMaterial({ color: '#ffd54f', roughness: .6 }),
  fiore3: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6 }),
  arte0: () => new THREE.MeshStandardMaterial({ map: artTex('art0', 0), roughness: .7 }),
  arte1: () => new THREE.MeshStandardMaterial({ map: artTex('art1', 1), roughness: .7 }),
  arte2: () => new THREE.MeshStandardMaterial({ map: artTex('art2', 2), roughness: .7 }),
  arte3: () => new THREE.MeshStandardMaterial({ map: artTex('art3', 3), roughness: .7 }),
  acciaio: () => new THREE.MeshStandardMaterial({ color: '#c3c7cc', metalness: 1, roughness: .3 }),
  cemento: () => new THREE.MeshStandardMaterial({ map: concreteTex('fx-cem', '#b9b6ae'), roughness: .9 }),
  specchio: () => new THREE.MeshStandardMaterial({ color: '#e6eef2', metalness: 1, roughness: .02 }),
};
function booksTex(){
  if (TEX.has('books')) return TEX.get('books');
  const [c, x] = canvas(256), r = rnd(41);
  const cols = ['#c0392b','#2f5fb3','#f4c430','#3f8f4f','#8a5cc9','#e67e22','#ecf0f1','#2c3e50','#86d6bd','#7a5a43'];
  x.fillStyle = '#3a2a20'; x.fillRect(0, 0, 256, 256);
  let px = 0;
  while (px < 256){ const w = 8 + r() * 14, h = 170 + r() * 80; x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(px, 256 - h, w - 1, h); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 2, 256 - h + 20, w - 5, 3); px += w; }
  return finish(c, 'books');
}

/* ---------- superfici della stanza ---------- */
export const FLOORS = [
  { k:'rovere', n:'Parquet rovere' }, { k:'noce', n:'Parquet noce' }, { k:'betulla', n:'Parquet chiaro' }, { k:'spina', n:'Spina di pesce' },
  { k:'piastrelle', n:'Piastrelle bianche' }, { k:'grigie', n:'Gres grigio' }, { k:'scacchiera', n:'Scacchiera' }, { k:'cotto', n:'Cotto' },
  { k:'marmo bianco', n:'Marmo bianco' }, { k:'marmo nero', n:'Marmo nero' }, { k:'cemento', n:'Cemento' }, { k:'resina', n:'Resina', color:true },
  { k:'moquette', n:'Moquette', color:true }, { k:'pietra', n:'Pietra' }, { k:'deck', n:'Deck in legno' }, { k:'erba', n:'Prato' },
];
export const WALLS = [
  { k:'pittura', n:'Pittura', color:true }, { k:'righe', n:'Carta a righe', color:true }, { k:'doghe', n:'Doghe', color:true },
  { k:'mattoni', n:'Mattoni' }, { k:'pietra', n:'Pietra' }, { k:'cemento', n:'Cemento' }, { k:'legno', n:'Legno' },
  { k:'piastrelle', n:'Piastrelle' }, { k:'marmo', n:'Marmo' },
];
export const CEILS = [{ k:'pittura', n:'Pittura', color:true }, { k:'legno', n:'Legno' }, { k:'cemento', n:'Cemento' }];

function cloneTex(t, rx, ry){ const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; }
export function surfaceMaterial(kind, spec, color, w, h){
  // kind: floor|wall|ceil ; w,h dimensioni in metri per ripetere la texture
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const rep = (t, size) => cloneTex(t, Math.max(1, w / size), Math.max(1, h / size));
  if (kind === 'floor'){
    switch (spec){
      case 'rovere': return std({ map: rep(woodTex('#c79a63', 'fl-rov', true), 2), roughness: .45 });
      case 'noce': return std({ map: rep(woodTex('#6e4529', 'fl-noc', true), 2), roughness: .45 });
      case 'betulla': return std({ map: rep(woodTex('#e3cba2', 'fl-bet', true), 2), roughness: .45 });
      case 'spina': return std({ map: rep(herringboneTex('#c69560', 'fl-spi'), 1.6), roughness: .45 });
      case 'piastrelle': return std({ map: rep(tileTex('#f2f2f0', '#f2f2f0', '#cfd2d4', 4, 'fl-pia'), 2.4), roughness: .2 });
      case 'grigie': return std({ map: rep(tileTex('#8f9195', '#8f9195', '#6f7175', 2, 'fl-gri'), 2.4), roughness: .35 });
      case 'scacchiera': return std({ map: rep(tileTex('#f3f3f3', '#26262b', '#888', 4, 'fl-sca', true), 2), roughness: .2 });
      case 'cotto': return std({ map: rep(tileTex('#c46a3f', '#c46a3f', '#a8a39a', 4, 'fl-cot'), 2), roughness: .7 });
      case 'marmo bianco': return std({ map: rep(marbleTex('#f1eee9', '#8d8a85', 'fl-mb'), 2), roughness: .12 });
      case 'marmo nero': return std({ map: rep(marbleTex('#25252a', '#d6d2c8', 'fl-mn'), 2), roughness: .12 });
      case 'cemento': return std({ map: rep(concreteTex('fl-cem'), 3), roughness: .8 });
      case 'resina': return std({ color: color || '#d8d4cc', roughness: .25 });
      case 'moquette': return std({ color: color || '#8aa2bd', map: rep(fabricTex('fab'), .6), roughness: 1 });
      case 'pietra': return std({ map: rep(stoneTex('fl-pie'), 2.5), roughness: .85 });
      case 'deck': { const t = rep(woodTex('#9a6b45', 'fl-deck', true), 1.5); t.rotation = Math.PI / 2; return std({ map: t, roughness: .7 }); }
      case 'erba': return std({ map: rep(grassTex('fl-erba'), 2), roughness: 1 });
    }
    return std({ color: '#ccc' });
  }
  if (kind === 'wall'){
    switch (spec){
      case 'righe': return std({ color: color || '#e9dcc4', map: rep(stripesTex('wl-rig'), 1), roughness: .9 });
      case 'doghe': return std({ color: color || '#ffffff', map: rep(slatsTex('wl-dog'), 1), roughness: .7 });
      case 'mattoni': return std({ map: rep(brickTex('wl-mat'), 1.6), roughness: .95 });
      case 'pietra': return std({ map: rep(stoneTex('wl-pie', '#b9b2a4'), 2), roughness: .95 });
      case 'cemento': return std({ map: rep(concreteTex('wl-cem', '#b5b5b1'), 3), roughness: .85 });
      case 'legno': { const t = rep(woodTex('#b9895a', 'wl-leg', true), 2); t.rotation = Math.PI / 2; return std({ map: t, roughness: .6 }); }
      case 'piastrelle': return std({ map: rep(tileTex('#f4f6f7', '#f4f6f7', '#c9cfd3', 8, 'wl-pia'), 1.6), roughness: .15 });
      case 'marmo': return std({ map: rep(marbleTex('#f1eee9', '#8d8a85', 'wl-mar'), 2), roughness: .15 });
    }
    return std({ color: color || '#f4f1ea', roughness: .92 });
  }
  if (spec === 'legno'){ const t = rep(woodTex('#c79a63', 'ce-leg', true), 2); return std({ map: t, roughness: .7 }); }
  if (spec === 'cemento') return std({ map: rep(concreteTex('ce-cem'), 3), roughness: .9 });
  return std({ color: color || '#ffffff', roughness: .95 });
}
// piccola immagine per i pulsanti delle superfici
export function swatchURL(kind, spec, color){
  const m = surfaceMaterial(kind, spec, color, 2, 2);
  const [c, x] = canvas(96);
  if (m.map && m.map.image){ x.drawImage(m.map.image, 0, 0, 256, 256, 0, 0, 96, 96); if (m.color && color){ x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, 96, 96); } }
  else { x.fillStyle = '#' + m.color.getHexString(); x.fillRect(0, 0, 96, 96); }
  m.map && m.map.dispose(); m.dispose();
  return c.toDataURL('image/jpeg', .8);
}
export function finishSwatchURL(spec, color){
  const [c, x] = canvas(64);
  if (spec.startsWith('legno:')){ const t = woodTex(WOODS[spec.slice(6)] || WOODS.rovere, 'w-' + spec.slice(6)); x.drawImage(t.image, 0, 0, 200, 200, 0, 0, 64, 64); }
  else if (MARBLES[spec]){ const [b, v] = MARBLES[spec]; const t = marbleTex(b, v, 'm-' + spec); x.drawImage(t.image, 0, 0, 200, 200, 0, 0, 64, 64); }
  else if (spec.startsWith('metallo:')){ const [col] = METALS[spec.slice(8)] || METALS.cromo; const g = x.createLinearGradient(0, 0, 64, 64); g.addColorStop(0, '#fff'); g.addColorStop(.45, col); g.addColorStop(1, shade(col, -.3)); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  else if (spec === 'vetro'){ const g = x.createLinearGradient(0, 0, 64, 64); g.addColorStop(0, '#e9f6fb'); g.addColorStop(1, '#a9cfdc'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(10, 0, 8, 64); }
  else if (spec.startsWith('laccato:')){ x.fillStyle = spec.slice(8); x.fillRect(0, 0, 64, 64); }
  else { x.fillStyle = color || '#999'; x.fillRect(0, 0, 64, 64); }
  return c.toDataURL();
}
