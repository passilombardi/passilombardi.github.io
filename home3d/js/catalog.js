// HOME 3D DESIGN - catalogo dei modelli 3D (costruiti con geometrie reali, in metri)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const GEO = new Map();
function geo(key, make){ if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); }
const f = (n) => Math.round(n * 1000) / 1000;

// costruttore: ogni pezzo ha uno "slot" di materiale: main (colore/finitura principale), sec (struttura/gambe) oppure un materiale fisso
export function makeKit(g){
  const add = (geom, slot, x, y, z, rot) => {
    const m = new THREE.Mesh(geom); m.userData.slot = slot; m.position.set(x, y, z);
    if (rot){ m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); }
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  return {
    box(w, h, d, slot, x = 0, y = 0, z = 0, r = .012, rot){
      const rr = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
      const gm = geo(`b${f(w)},${f(h)},${f(d)},${f(rr)}`, () => rr > .002 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d));
      return add(gm, slot, x, y + h / 2, z, rot);
    },
    cyl(rt, rb, h, slot, x = 0, y = 0, z = 0, seg = 28, rot){
      const gm = geo(`c${f(rt)},${f(rb)},${f(h)},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
      return add(gm, slot, x, y + h / 2, z, rot);
    },
    sph(r, slot, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1){
      const gm = geo(`s${f(r)}`, () => new THREE.SphereGeometry(r, 24, 16));
      const m = add(gm, slot, x, y, z); m.scale.set(sx, sy, sz); return m;
    },
    lathe(pts, slot, x = 0, y = 0, z = 0, key){
      const gm = geo('l' + key, () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 32));
      return add(gm, slot, x, y, z);
    },
    torus(R, r, slot, x = 0, y = 0, z = 0, rot = [Math.PI / 2, 0, 0], arc = Math.PI * 2){
      const gm = geo(`t${f(R)},${f(r)},${f(arc)}`, () => new THREE.TorusGeometry(R, r, 12, 40, arc));
      return add(gm, slot, x, y, z, rot);
    },
    cone(r, h, slot, x = 0, y = 0, z = 0, seg = 24, open = false){
      const gm = geo(`k${f(r)},${f(h)},${seg},${open}`, () => new THREE.ConeGeometry(r, h, seg, 1, open));
      return add(gm, slot, x, y + h / 2, z);
    },
    tube(points, r, slot, key){
      const gm = geo('u' + key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 40, r, 10));
      return add(gm, slot, 0, 0, 0);
    },
    plane(w, h, slot, x, y, z, rot){
      const gm = geo(`p${f(w)},${f(h)}`, () => new THREE.PlaneGeometry(w, h));
      const m = add(gm, slot, x, y, z, rot); m.castShadow = false; return m;
    },
    leaf(slot, x, y, z, rx, ry, rz, s = 1){
      const gm = geo('leaf', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.09, .12, 0, .32); sh.quadraticCurveTo(-.09, .12, 0, 0); return new THREE.ShapeGeometry(sh, 6); });
      const m = add(gm, slot, x, y, z, [rx, ry, rz]); m.scale.setScalar(s); return m;
    },
  };
}

/* ---------- pezzi ricorrenti ---------- */
function legs4(k, w, d, h, slot = 'sec', r = .022, inset = .06){
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(r, r * .8, h, slot, sx * (w / 2 - inset), 0, sz * (d / 2 - inset));
}
function sofa(k, w, seats, d = .92){
  k.box(w, .3, d, 'main', 0, .1, 0, .04);
  k.box(w - .04, .5, .2, 'main', 0, .36, -d / 2 + .12, .06);
  for (const s of [-1, 1]) k.box(.18, .58, d, 'main', s * (w / 2 - .09), .1, 0, .06);
  const cw = (w - .4) / seats;
  for (let i = 0; i < seats; i++){
    const x = -w / 2 + .2 + cw * (i + .5);
    k.box(cw - .02, .16, d - .3, 'main', x, .4, .07, .06);
    k.box(cw - .04, .4, .17, 'main', x, .5, -d / 2 + .3, .07);
  }
  legs4(k, w, d, .1, 'sec', .022, .1);
}
function cabinet(k, w, h, d, doors, slot = 'main', handle = 'cromo', y = 0){
  k.box(w, h, d, slot, 0, y, 0, .008);
  const dw = w / doors;
  for (let i = 0; i < doors; i++){
    const x = -w / 2 + dw * (i + .5);
    k.box(dw - .012, h - .02, .018, slot, x, y + .01, d / 2, .004);
    if (handle) k.box(.012, Math.min(.18, h * .4), .02, handle, x + (i % 2 ? -1 : 1) * (dw / 2 - .05), y + h / 2 - Math.min(.09, h * .2), d / 2 + .02, .004);
  }
}
function drawers(k, w, h, d, n, slot = 'main', y = 0){
  k.box(w, h, d, slot, 0, y, 0, .008);
  const dh = h / n;
  for (let i = 0; i < n; i++){
    k.box(w - .02, dh - .014, .018, slot, 0, y + dh * i + .007, d / 2, .004);
    k.box(Math.min(.2, w * .35), .014, .02, 'cromo', 0, y + dh * i + dh * .55, d / 2 + .02, .004);
  }
}
function pot(k, r, h, slot = 'main', y = 0){ k.lathe([[0, 0], [r * .75, 0], [r, h], [r * .92, h], [r * .9, h - .02], [0, h - .02]], slot, 0, y, 0, `pot${f(r)}${f(h)}`); k.cyl(r * .88, r * .88, .015, 'terra', 0, y + h - .04, 0); }
function bush(k, x, y, z, s){
  k.sph(.3 * s, 'foglia2', x, y, z, 1, .85, 1); k.sph(.22 * s, 'foglia', x - .18 * s, y + .05 * s, z + .08 * s); k.sph(.2 * s, 'foglia3', x + .16 * s, y + .1 * s, z - .05 * s); k.sph(.18 * s, 'foglia', x + .05 * s, y + .22 * s, z + .1 * s);
}
function plantLeaves(k, y, n, s, slots = ['foglia', 'foglia2', 'foglia3']){
  for (let i = 0; i < n; i++){
    const a = i / n * Math.PI * 2 + i * .3, tilt = .5 + (i % 3) * .25;
    k.leaf(slots[i % 3], Math.cos(a) * .02, y + (i % 4) * .05 * s, Math.sin(a) * .02, -tilt, -a + Math.PI / 2, 0, s * (1 + (i % 2) * .3));
  }
}
function frame(k, w, h, art, depth = .03){
  k.box(w, h, depth, 'sec', 0, 0, depth / 2, .004);
  k.plane(w - .06, h - .06, art, 0, h / 2, depth + .001);
}
function chair(k, seatH = .46){
  legs4(k, .44, .44, seatH, 'sec', .016, .03);
  k.box(.46, .05, .46, 'main', 0, seatH, 0, .02);
  k.box(.44, .42, .04, 'main', 0, seatH + .05, -.21, .02);
}

/* ---------- catalogo ---------- */
// mount: floor | wall | ceiling ; main: [finitura, colore] ; sec: finitura struttura ; light: luce che si accende di sera
export const CATS = [
  ['salotto', 'Salotto', '🛋️'], ['camera', 'Camera', '🛏️'], ['cucina', 'Cucina', '🍳'], ['pranzo', 'Pranzo', '🍽️'], ['bagno', 'Bagno', '🛁'],
  ['studio', 'Studio', '💻'], ['luci', 'Luci', '💡'], ['deco', 'Decorazioni', '🖼️'], ['piante', 'Piante', '🪴'], ['giardino', 'Giardino', '🌳'], ['struttura', 'Porte e pareti', '🚪'],
];
export const ITEMS = [
  // SALOTTO
  { id:'divano3', n:'Divano 3 posti', cat:'salotto', price:899, main:['tessuto', '#5f646b'], sec:'legno:noce', b:k => sofa(k, 2.2, 3) },
  { id:'divano2', n:'Divano 2 posti', cat:'salotto', price:649, main:['velluto', '#2e7d5b'], sec:'metallo:ottone', b:k => sofa(k, 1.65, 2) },
  { id:'divanoangolo', n:'Divano angolare', cat:'salotto', price:1490, main:['tessuto', '#cdb89a'], sec:'metallo:nero opaco', b:k => {
      sofa(k, 2.5, 3); k.box(.9, .3, .8, 'main', .8, .1, .85, .04); k.box(.86, .16, .76, 'main', .8, .4, .85, .06); k.box(.18, .58, .8, 'main', 1.16, .1, .85, .06); legs4(k, .9, .8, .1, 'sec', .022, .1); } },
  { id:'chesterfield', n:'Divano Chesterfield', cat:'salotto', price:1290, main:['pelle', '#7a3b22'], sec:'legno:noce', b:k => {
      k.box(2.1, .32, .9, 'main', 0, .12, 0, .05); k.box(2.1, .42, .2, 'main', 0, .42, -.35, .08);
      for (const s of [-1, 1]){ k.box(.2, .5, .9, 'main', s * .95, .12, 0, .08); k.cyl(.12, .12, .9, 'main', s * .95, .62, -.45, 20, [Math.PI / 2, 0, 0]); }
      for (let i = 0; i < 3; i++) k.box(.56, .14, .62, 'main', -.56 + i * .56, .44, .08, .05);
      for (let i = 0; i < 7; i++) k.sph(.012, 'nero', -.84 + i * .28, .66, -.25);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.sph(.04, 'sec', sx * .95, .06, sz * .38); } },
  { id:'poltrona', n:'Poltrona', cat:'salotto', price:399, main:['tessuto', '#f39c4a'], sec:'legno:rovere', b:k => sofa(k, .9, 1, .86) },
  { id:'poltronaguscio', n:'Poltrona design', cat:'salotto', price:549, main:['velluto', '#e06c75'], sec:'metallo:ottone', b:k => {
      k.lathe([[0, 0], [.36, .02], [.4, .2], [.36, .42], [.33, .44], [.33, .06], [0, .06]], 'main', 0, .34, 0, 'shell');
      k.cyl(.33, .33, .1, 'main', 0, .38, 0);
      for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + Math.PI / 4; k.cyl(.012, .012, .36, 'sec', Math.cos(a) * .24, 0, Math.sin(a) * .24); } } },
  { id:'pouf', n:'Pouf', cat:'salotto', price:89, main:['velluto', '#f2b6c6'], sec:'metallo:ottone', b:k => { k.cyl(.26, .26, .38, 'main', 0, .04, 0, 32); k.cyl(.24, .24, .04, 'sec', 0, 0, 0); } },
  { id:'tavolino', n:'Tavolino', cat:'salotto', price:199, main:['legno:rovere'], sec:'metallo:nero opaco', b:k => { k.box(1.1, .04, .6, 'main', 0, .38, 0, .01); k.box(1.02, .02, .52, 'main', 0, .12, 0, .005); legs4(k, 1.1, .6, .38, 'sec', .014, .04); } },
  { id:'tavolinotondo', n:'Tavolino in marmo', cat:'salotto', price:349, main:['marmo bianco'], sec:'metallo:ottone', b:k => { k.cyl(.42, .42, .03, 'main', 0, .4, 0, 40); k.cyl(.04, .04, .38, 'sec', 0, .02, 0); k.cyl(.22, .24, .02, 'sec', 0, 0, 0, 32); } },
  { id:'mobiletv', n:'Mobile TV', cat:'salotto', price:459, main:['laccato', '#f4f1ea'], sec:'legno:rovere', b:k => { cabinet(k, 1.8, .42, .42, 3, 'main', null, .12); k.box(1.8, .03, .44, 'sec', 0, .54, 0, .006); legs4(k, 1.7, .36, .12, 'sec', .015, .05); } },
  { id:'tv', n:'Televisore 55"', cat:'salotto', price:699, main:['plastica', '#1d1d20'], sec:'metallo:nero opaco', b:k => { k.box(1.23, .72, .04, 'main', 0, .1, 0, .01); k.plane(1.19, .68, 'schermo', 0, .46, .0205); k.box(.36, .02, .2, 'sec', 0, 0, 0, .005); k.box(.06, .1, .04, 'sec', 0, .02, -.01); } },
  { id:'tvparete', n:'TV a parete 65"', cat:'salotto', mount:'wall', price:999, main:['plastica', '#1d1d20'], sec:'metallo:nero opaco', b:k => { k.box(1.45, .84, .04, 'main', 0, 0, .05, .01); k.plane(1.41, .8, 'schermo', 0, .42, .0705); k.box(.3, .2, .03, 'sec', 0, .3, .015); } },
  { id:'libreria', n:'Libreria', cat:'salotto', price:329, main:['legno:noce'], sec:'legno:noce', b:k => {
      k.box(1, .02, .35, 'main', 0, 0, 0, .004); for (let i = 0; i < 5; i++) k.box(.96, .025, .33, 'main', 0, .02 + i * .44, 0, .004);
      for (const s of [-1, 1]) k.box(.025, 2, .35, 'main', s * .4875, 0, 0, .004); k.box(1, 2, .015, 'main', 0, 0, -.1675, .003);
      for (let i = 0; i < 4; i++) k.box(.9 - (i % 2) * .25, .3, .24, 'libri', -(i % 2) * .12, .045 + i * .44, .02, .004); } },
  { id:'madia', n:'Madia', cat:'salotto', price:579, main:['legno:rovere'], sec:'metallo:nero opaco', b:k => { cabinet(k, 1.8, .7, .45, 3, 'main', 'sec', .18); legs4(k, 1.7, .38, .18, 'sec', .014, .05); } },
  { id:'camino', n:'Camino', cat:'salotto', price:1190, main:['marmo bianco'], sec:'nero', light:{ y:.35, z:.25, color:'#ff9a3c', i:3, d:4 }, b:k => {
      k.box(1.4, 1.1, .4, 'main', 0, 0, 0, .01); k.box(1.6, .06, .48, 'main', 0, 1.1, .02, .01);
      k.box(.8, .62, .1, 'sec', 0, .14, .16, .005);
      k.cone(.12, .3, 'fuoco', -.1, .16, .17); k.cone(.09, .24, 'fuoco', .12, .16, .17); k.cyl(.03, .03, .5, 'corteccia', 0, .16, .18, 10, [0, 0, Math.PI / 2]); } },
  { id:'tappeto', n:'Tappeto', cat:'salotto', price:249, flat:true, main:['tessuto', '#c9b79c'], sec:'tessuto', b:k => { k.box(2.4, .012, 1.7, 'main', 0, 0, 0, .004); k.box(2.2, .013, 1.5, 'sec', 0, 0, 0, .004); } },
  { id:'tappetotondo', n:'Tappeto tondo', cat:'salotto', price:189, flat:true, main:['tessuto', '#86d6bd'], b:k => { k.cyl(1, 1, .012, 'main', 0, 0, 0, 48); } },
  { id:'passatoia', n:'Tappeto berbero', cat:'salotto', price:219, flat:true, main:['tessuto', '#f4f1ea'], b:k => { k.box(2, .012, 1.4, 'main', 0, 0, 0, .004); for (let i = 0; i < 5; i++) k.box(1.8, .013, .03, 'nero', 0, 0, -.5 + i * .25, .002); } },

  // CAMERA
  { id:'lettomatrimoniale', n:'Letto matrimoniale', cat:'camera', price:1190, main:['tessuto', '#cfd2d6'], sec:'legno:noce', b:k => {
      k.box(1.76, .3, 2.1, 'main', 0, .08, 0, .03); k.box(1.76, 1.05, .1, 'main', 0, .08, -1.0, .04);
      k.box(1.66, .2, 1.98, 'materasso', 0, .38, .03, .05); k.box(1.7, .06, 1.4, 'main', 0, .56, .3, .03);
      for (const s of [-1, 1]) k.box(.6, .14, .38, 'cuscino', s * .4, .58, -.72, .06); legs4(k, 1.7, 2, .08, 'sec', .025, .08); } },
  { id:'lettosingolo', n:'Letto singolo', cat:'camera', price:490, main:['tessuto', '#3b7dd8'], sec:'legno:betulla', b:k => {
      k.box(.96, .28, 2.05, 'sec', 0, .1, 0, .02); k.box(.96, .8, .05, 'sec', 0, .1, -1.0, .02);
      k.box(.9, .18, 1.95, 'materasso', 0, .38, .03, .05); k.box(.94, .05, 1.3, 'main', 0, .54, .33, .02); k.box(.55, .12, .34, 'cuscino', 0, .56, -.75, .05); legs4(k, .9, 2, .1, 'sec', .022, .06); } },
  { id:'lettocastello', n:'Letto a castello', cat:'camera', price:790, main:['tessuto', '#e06c75'], sec:'legno:bianco', b:k => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(.06, 1.7, .06, 'sec', sx * .48, 0, sz * 1.0, .01);
      for (const y of [.25, 1.15]){ k.box(1, .08, 2.06, 'sec', 0, y, 0, .01); k.box(.9, .15, 1.95, 'materasso', 0, y + .08, 0, .04); k.box(.94, .04, 1.3, 'main', 0, y + .23, .3, .02); k.box(.5, .1, .3, 'cuscino', 0, y + .23, -.75, .04); }
      for (const sz of [-1, 1]) k.box(1, .05, .04, 'sec', 0, 1.5, sz * 1.0); for (let i = 0; i < 4; i++) k.box(.04, .04, .4, 'sec', .52, .35 + i * .3, .6); } },
  { id:'armadio2', n:'Armadio 2 ante', cat:'camera', price:599, main:['laccato', '#f4f1ea'], sec:'legno:rovere', b:k => { cabinet(k, 1.0, 2.1, .6, 2, 'main', 'cromo', .06); k.box(1, .06, .58, 'sec', 0, 0, 0, .004); } },
  { id:'armadio3', n:'Armadio 3 ante', cat:'camera', price:899, main:['legno:rovere'], sec:'legno:rovere', b:k => { cabinet(k, 1.5, 2.2, .6, 3, 'main', 'metallo:nero opaco', .06); k.box(1.5, .06, .58, 'sec', 0, 0, 0, .004); } },
  { id:'comodino', n:'Comodino', cat:'camera', price:129, main:['legno:noce'], sec:'metallo:ottone', b:k => { drawers(k, .48, .4, .38, 2, 'main', .14); legs4(k, .44, .34, .14, 'sec', .012, .03); } },
  { id:'cassettiera', n:'Cassettiera', cat:'camera', price:299, main:['laccato', '#86d6bd'], sec:'legno:rovere', b:k => { drawers(k, 1.0, .8, .45, 4, 'main', .1); legs4(k, .94, .4, .1, 'sec', .016, .04); } },
  { id:'specchioterra', n:'Specchio da terra', cat:'camera', price:179, main:['legno:betulla'], b:k => { k.box(.6, 1.7, .03, 'main', 0, 0, 0, .01, [-.12, 0, 0]); const m = k.box(.52, 1.6, .005, 'specchio', 0, .05, .02, .002, [-.12, 0, 0]); m.castShadow = false; } },
  { id:'specchiotondo', n:'Specchio tondo', cat:'camera', mount:'wall', price:119, main:['metallo:ottone'], b:k => { k.cyl(.4, .4, .025, 'main', 0, .4, .0125, 48, [Math.PI / 2, 0, 0]); k.cyl(.37, .37, .005, 'specchio', 0, .4, .03, 48, [Math.PI / 2, 0, 0]); } },
  { id:'panca', n:'Panca fondoletto', cat:'camera', price:199, main:['velluto', '#cdb89a'], sec:'metallo:ottone', b:k => { k.box(1.3, .12, .4, 'main', 0, .34, 0, .04); legs4(k, 1.24, .34, .34, 'sec', .012, .04); } },
  { id:'toeletta', n:'Toeletta', cat:'camera', price:349, main:['laccato', '#f2b6c6'], sec:'metallo:ottone', b:k => { drawers(k, 1.0, .18, .45, 1, 'main', .58); legs4(k, .96, .42, .58, 'sec', .014, .04); } },

  // CUCINA
  { id:'cucinacompleta', n:'Cucina completa', cat:'cucina', price:4990, main:['laccato', '#f4f1ea'], sec:'marmo bianco', b:k => {
      const W = 2.8; cabinet(k, W, .78, .6, 7, 'main', 'cromo', .1); k.box(W, .1, .55, 'nero', 0, 0, -.02, .003);
      k.box(W + .02, .04, .64, 'sec', 0, .88, 0, .006);
      k.box(.56, .02, .44, 'cromo', -.6, .905, 0, .01); k.box(.5, .03, .38, 'nero', -.6, .9, 0, .01); k.tube([[-.6, .92, -.24], [-.6, 1.18, -.24], [-.6, 1.2, -.12]], .015, 'cromo', 'faucet');
      k.box(.6, .015, .5, 'nero', .65, .92, 0, .01); for (const p of [[.5, -.1], [.8, -.1], [.5, .12], [.8, .12]]) k.cyl(.07, .07, .004, 'acciaio', p[0], .935, p[1], 24);
      k.box(W, .65, .35, 'main', 0, 1.5, -.125, .006); for (let i = 0; i < 7; i++) k.box(W / 7 - .012, .63, .018, 'main', -W / 2 + W / 7 * (i + .5), 1.51, .055, .004);
      k.box(.6, .05, .4, 'cromo', .65, 1.45, -.1, .004); } },
  { id:'basecucina', n:'Modulo base', cat:'cucina', price:390, main:['laccato', '#3b4a5a'], sec:'marmo bianco', b:k => { cabinet(k, .8, .78, .6, 2, 'main', 'cromo', .1); k.box(.8, .1, .55, 'nero', 0, 0, -.02, .003); k.box(.82, .04, .64, 'sec', 0, .88, 0, .006); } },
  { id:'isola', n:'Isola cucina', cat:'cucina', price:1890, main:['legno:noce'], sec:'marmo bianco', b:k => { cabinet(k, 1.8, .82, .8, 4, 'main', 'metallo:nero opaco', .06); k.box(2.1, .05, .95, 'sec', .12, .88, 0, .01); } },
  { id:'frigorifero', n:'Frigorifero', cat:'cucina', price:899, main:['metallo:acciaio'], sec:'nero', b:k => { k.box(.7, 1.85, .68, 'main', 0, .02, 0, .02); k.box(.7, .01, .02, 'sec', 0, 1.2, .345); for (const y of [.75, 1.35]) k.box(.025, .35, .03, 'cromo', -.3, y, .36, .01); k.box(.66, .02, .6, 'nero', 0, 0, 0); } },
  { id:'forno', n:'Forno a colonna', cat:'cucina', price:790, main:['laccato', '#f4f1ea'], sec:'nero', b:k => { k.box(.6, 2.1, .6, 'main', 0, 0, 0, .008); k.box(.56, .56, .02, 'sec', 0, .82, .3, .01); k.box(.44, .3, .005, 'vetro', 0, .9, .312, .004); k.box(.4, .02, .03, 'cromo', 0, 1.33, .33); k.box(.56, .38, .02, 'sec', 0, 1.42, .3, .01); } },
  { id:'lavastoviglie', n:'Lavastoviglie', cat:'cucina', price:549, main:['metallo:acciaio'], sec:'nero', b:k => { k.box(.6, .82, .6, 'main', 0, .04, 0, .008); k.box(.6, .04, .58, 'sec', 0, 0, 0); k.box(.56, .08, .02, 'sec', 0, .74, .3, .005); k.box(.4, .02, .03, 'cromo', 0, .66, .32); } },
  { id:'pianocottura', n:'Cucina a gas', cat:'cucina', price:690, main:['metallo:acciaio'], sec:'nero', b:k => { k.box(.9, .85, .6, 'main', 0, 0, 0, .01); k.box(.86, .48, .02, 'sec', 0, .1, .3, .01); k.box(.7, .02, .03, 'cromo', 0, .64, .32); k.box(.9, .02, .6, 'nero', 0, .85, 0); for (const p of [[-.2, -.12], [.2, -.12], [-.2, .14], [.2, .14]]) k.cyl(.07, .08, .03, 'nero', p[0], .87, p[1]); for (let i = 0; i < 5; i++) k.cyl(.02, .02, .02, 'cromo', -.3 + i * .15, .76, .31, 16, [Math.PI / 2, 0, 0]); } },
  { id:'lavello', n:'Lavello', cat:'cucina', price:450, main:['laccato', '#cfd2d6'], sec:'cromo', b:k => { cabinet(k, .9, .78, .6, 2, 'main', 'cromo', .1); k.box(.92, .04, .64, 'ceramica', 0, .88, 0, .006); k.box(.5, .02, .38, 'acciaio', 0, .905, .02, .02); k.tube([[0, .92, -.22], [0, 1.2, -.22], [0, 1.22, -.08]], .014, 'sec', 'faucet2'); } },
  { id:'pensile', n:'Pensile', cat:'cucina', mount:'wall', price:220, main:['laccato', '#f4f1ea'], b:k => { cabinet(k, .8, .7, .35, 2, 'main', 'cromo', 0); } },
  { id:'cappa', n:'Cappa', cat:'cucina', mount:'wall', price:390, main:['metallo:acciaio'], b:k => { k.box(.26, .5, .26, 'main', 0, .3, .13, .006); k.lathe([[.0, .3], [.15, .3], [.45, .02], [.45, 0], [0, 0]], 'main', 0, 0, .3, 'hood'); } },
  { id:'microonde', n:'Microonde', cat:'cucina', price:149, main:['plastica', '#1d1d20'], b:k => { k.box(.5, .3, .38, 'main', 0, 0, 0, .02); k.box(.34, .22, .005, 'vetro', -.06, .04, .19, .004); k.box(.08, .22, .005, 'acciaio', .18, .04, .19, .004); } },
  { id:'macchinacaffe', n:'Macchina del caffè', cat:'cucina', price:299, main:['metallo:cromo'], b:k => { k.box(.3, .36, .3, 'main', 0, 0, 0, .03); k.box(.18, .03, .14, 'nero', 0, .05, .14, .01); k.cyl(.035, .03, .07, 'ceramica', 0, .08, .16); } },
  { id:'fruttiera', n:'Fruttiera', cat:'cucina', price:39, main:['ceramica'], b:k => { k.lathe([[0, 0], [.07, 0], [.16, .08], [.15, .085], [0, .02]], 'main', 0, 0, 0, 'bowl'); k.sph(.045, 'frutta1', -.04, .07, .02); k.sph(.045, 'frutta2', .05, .07, -.01); k.sph(.04, 'frutta3', 0, .1, .04); k.sph(.04, 'frutta1', .01, .07, -.06); } },

  // PRANZO
  { id:'tavolopranzo', n:'Tavolo da pranzo', cat:'pranzo', price:690, main:['legno:rovere'], sec:'metallo:nero opaco', b:k => { k.box(1.8, .05, .9, 'main', 0, .72, 0, .01); legs4(k, 1.8, .9, .72, 'sec', .025, .08); } },
  { id:'tavolotondo', n:'Tavolo tondo', cat:'pranzo', price:590, main:['marmo bianco'], sec:'laccato:#ffffff', b:k => { k.cyl(.6, .6, .04, 'main', 0, .73, 0, 48); k.lathe([[0, 0], [.28, 0], [.28, .02], [.06, .1], [.05, .73], [0, .73]], 'sec', 0, 0, 0, 'tulip'); } },
  { id:'tavoloallungabile', n:'Tavolo vetro', cat:'pranzo', price:790, main:['vetro'], sec:'metallo:cromo', b:k => { k.box(1.6, .015, .9, 'main', 0, .74, 0, .004); for (const s of [-1, 1]){ k.box(.04, .7, .04, 'sec', s * .7, .02, -.35); k.box(.04, .7, .04, 'sec', s * .7, .02, .35); k.box(.04, .04, .74, 'sec', s * .7, .7, 0); k.box(.04, .02, .8, 'sec', s * .7, 0, 0); } } },
  { id:'sedia', n:'Sedia in legno', cat:'pranzo', price:89, main:['legno:rovere'], sec:'legno:rovere', b:k => chair(k) },
  { id:'sediaimbottita', n:'Sedia imbottita', cat:'pranzo', price:149, main:['velluto', '#2f4f9e'], sec:'metallo:ottone', b:k => { legs4(k, .46, .46, .46, 'sec', .012, .04); k.box(.48, .08, .48, 'main', 0, .44, 0, .03); k.box(.46, .46, .07, 'main', 0, .5, -.21, .03); } },
  { id:'sgabello', n:'Sgabello alto', cat:'pranzo', price:99, main:['pelle', '#7a5a43'], sec:'metallo:nero opaco', b:k => { k.cyl(.19, .19, .06, 'main', 0, .7, 0); k.cyl(.025, .025, .7, 'sec', 0, 0, 0); k.cyl(.2, .22, .015, 'sec', 0, 0, 0); k.torus(.16, .01, 'sec', 0, .28, 0); } },
  { id:'credenza', n:'Credenza vetrina', cat:'pranzo', price:790, main:['legno:noce'], sec:'vetro', b:k => { cabinet(k, 1.2, .85, .45, 2, 'main', 'metallo:ottone', .1); k.box(1.2, .9, .4, 'main', 0, .95, -.025, .006); for (const s of [-1, 1]) k.box(.56, .84, .01, 'sec', s * .29, .98, .18, .002); k.box(1.1, .02, .36, 'main', 0, 1.38, -.03); legs4(k, 1.14, .4, .1, 'main', .02, .04); } },

  // BAGNO
  { id:'vasca', n:'Vasca da bagno', cat:'bagno', price:990, main:['ceramica'], sec:'metallo:cromo', b:k => {
      k.box(1.7, .55, .78, 'main', 0, 0, 0, .1); k.box(1.56, .1, .64, 'acqua', 0, .44, 0, .08);
      k.tube([[-.75, .55, -.3], [-.75, .75, -.3], [-.75, .76, -.2], [-.7, .72, -.18]], .016, 'sec', 'tubf'); } },
  { id:'vascafreestanding', n:'Vasca freestanding', cat:'bagno', price:1690, main:['ceramica'], sec:'metallo:ottone', b:k => {
      k.lathe([[0, .04], [.3, .04], [.38, .3], [.4, .58], [.37, .58], [.34, .3], [.27, .1], [0, .1]], 'main', 0, 0, 0, 'tub').scale.set(2.1, 1, 1);
      k.cyl(.3, .3, .01, 'acqua', 0, .46, 0, 32).scale.set(2.2, 1, 1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.sph(.035, 'sec', sx * .55, .03, sz * .2); } },
  { id:'doccia', n:'Box doccia', cat:'bagno', price:890, main:['vetro'], sec:'metallo:cromo', b:k => {
      k.box(.9, .05, .9, 'ceramica', 0, 0, 0, .01); for (const s of [-1, 1]) k.box(.01, 1.95, .88, 'main', s * .445, .05, 0, .002); k.box(.88, 1.95, .01, 'main', 0, .05, .445, .002);
      k.box(.9, .03, .03, 'sec', 0, 2.0, .445); k.tube([[0, .9, -.43], [0, 2.0, -.43], [0, 2.05, -.3]], .012, 'sec', 'shw'); k.cyl(.11, .11, .015, 'sec', 0, 2.02, -.28); } },
  { id:'lavandino', n:'Lavandino con mobile', cat:'bagno', price:590, main:['legno:rovere'], sec:'metallo:cromo', mount:'floor', b:k => {
      drawers(k, .8, .5, .46, 2, 'main', .32); k.box(.82, .12, .48, 'ceramica', 0, .82, 0, .03); k.box(.6, .06, .34, 'acqua', 0, .89, .02, .04);
      k.tube([[0, .94, -.18], [0, 1.08, -.18], [0, 1.1, -.08]], .012, 'sec', 'taps'); } },
  { id:'lavabocolonna', n:'Lavabo a colonna', cat:'bagno', price:290, main:['ceramica'], sec:'metallo:cromo', b:k => { k.cyl(.1, .14, .7, 'main', 0, 0, -.05); k.box(.6, .16, .45, 'main', 0, .7, 0, .06); k.tube([[0, .86, -.16], [0, .98, -.16], [0, 1.0, -.08]], .012, 'sec', 'taps2'); } },
  { id:'wc', n:'WC sospeso', cat:'bagno', price:390, main:['ceramica'], sec:'metallo:cromo', b:k => { k.lathe([[0, 0], [.18, 0], [.2, .1], [.18, .2], [0, .2]], 'main', 0, .22, .05, 'wc').scale.set(1, 1, 1.45); k.box(.36, .05, .52, 'main', 0, .42, .04, .03); k.box(.38, .4, .16, 'main', 0, .3, -.24, .03); k.box(.16, .1, .01, 'sec', 0, .9, -.17); k.box(.38, .3, .14, 'main', 0, .7, -.24, .02); } },
  { id:'bidet', n:'Bidet', cat:'bagno', price:290, main:['ceramica'], sec:'metallo:cromo', b:k => { k.lathe([[0, 0], [.17, 0], [.19, .1], [.18, .2], [0, .2]], 'main', 0, .2, .05, 'bid').scale.set(1, 1, 1.4); k.box(.36, .4, .16, 'main', 0, 0, -.22, .03); k.tube([[0, .4, -.18], [0, .48, -.18], [0, .48, -.1]], .01, 'sec', 'bidt'); } },
  { id:'specchiobagno', n:'Specchio bagno', cat:'bagno', mount:'wall', price:159, main:['metallo:nero opaco'], light:{ y:.4, z:.15, color:'#fff2d6', i:.6, d:2.5 }, b:k => { k.box(.8, .7, .025, 'main', 0, 0, .0125, .01); k.box(.76, .66, .006, 'specchio', 0, .02, .028, .003); k.box(.5, .025, .04, 'lampadina', 0, .72, .03, .01); } },
  { id:'pensilebagno', n:'Mobile bagno pensile', cat:'bagno', mount:'wall', price:219, main:['laccato', '#ffffff'], b:k => cabinet(k, .6, .7, .2, 2, 'main', 'cromo', 0) },
  { id:'portasciugamani', n:'Porta asciugamani', cat:'bagno', mount:'wall', price:59, main:['tessuto', '#86d6bd'], sec:'metallo:cromo', b:k => { k.cyl(.012, .012, .6, 'sec', 0, .55, .06, 12, [0, 0, Math.PI / 2]); k.box(.3, .5, .03, 'main', -.12, .06, .07, .01); k.box(.25, .4, .03, 'main', .16, .16, .07, .01); } },
  { id:'lavatrice', n:'Lavatrice', cat:'bagno', price:490, main:['plastica', '#ffffff'], sec:'metallo:cromo', b:k => { k.box(.6, .85, .58, 'main', 0, 0, 0, .02); k.torus(.17, .025, 'sec', 0, .4, .3, [0, 0, 0]); k.cyl(.16, .16, .01, 'vetro', 0, .4, .3, 32, [Math.PI / 2, 0, 0]); k.box(.56, .1, .01, 'nero', 0, .72, .29); } },

  // STUDIO
  { id:'scrivania', n:'Scrivania', cat:'studio', price:299, main:['legno:betulla'], sec:'laccato:#ffffff', b:k => { k.box(1.4, .04, .7, 'main', 0, .72, 0, .008); drawers(k, .4, .68, .6, 3, 'sec', .04); for (const p of [[-.64, -.3], [-.64, .3]]) k.box(.04, .72, .04, 'sec', p[0], 0, p[1]); } },
  { id:'sediaufficio', n:'Sedia da ufficio', cat:'studio', price:249, main:['tessuto', '#1d1d20'], sec:'metallo:cromo', b:k => {
      for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; k.box(.3, .03, .04, 'sec', Math.cos(a) * .15, .05, Math.sin(a) * .15, .01, [0, -a, 0]); k.sph(.028, 'gomma', Math.cos(a) * .29, .028, Math.sin(a) * .29); }
      k.cyl(.025, .03, .38, 'sec', 0, .06, 0); k.box(.5, .08, .48, 'main', 0, .44, 0, .03); k.box(.46, .6, .06, 'main', 0, .58, -.23, .04, [-.1, 0, 0]);
      for (const s of [-1, 1]){ k.box(.04, .2, .04, 'sec', s * .26, .46, 0); k.box(.06, .03, .24, 'gomma', s * .26, .66, 0, .01); } } },
  { id:'monitor', n:'Computer', cat:'studio', price:899, main:['plastica', '#1d1d20'], sec:'metallo:acciaio', b:k => { k.box(.62, .38, .03, 'main', 0, .14, 0, .01); k.plane(.59, .35, 'schermo', 0, .33, .0155); k.box(.06, .16, .04, 'sec', 0, .02, -.03); k.box(.24, .015, .18, 'sec', 0, 0, -.02, .005); k.box(.44, .02, .14, 'main', 0, 0, .24, .005); } },
  { id:'portatile', n:'Portatile', cat:'studio', price:999, main:['metallo:acciaio'], b:k => { k.box(.34, .015, .24, 'main', 0, 0, 0, .006); const s = k.box(.34, .23, .008, 'main', 0, 0, -.115, .004, [-.25, 0, 0]); s.position.y = .12; k.plane(.31, .19, 'schermo', 0, .12, -.105, [-.25, 0, 0]); } },
  { id:'scaffale', n:'Scaffale a giorno', cat:'studio', price:199, main:['legno:rovere'], sec:'metallo:nero opaco', b:k => { for (let i = 0; i < 5; i++) k.box(.8, .025, .3, 'main', 0, .05 + i * .42, 0, .004); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(.02, 1.8, .02, 'sec', sx * .39, 0, sz * .14); k.box(.5, .26, .22, 'libri', -.1, .075, 0, .004); k.box(.6, .3, .22, 'libri', .05, .915, 0, .004); } },
  { id:'lavagna', n:'Bacheca', cat:'studio', mount:'wall', price:49, main:['legno:betulla'], b:k => { frame(k, 1.0, .7, 'arte3', .025); } },

  // LUCI
  { id:'lampadaterra', n:'Lampada da terra', cat:'luci', price:149, main:['metallo:ottone'], light:{ y:1.5, color:'#ffd9a0', i:2.5, d:5 }, b:k => { k.cyl(.16, .16, .03, 'main', 0, 0, 0); k.cyl(.012, .012, 1.4, 'main', 0, .03, 0); k.cone(.22, .28, 'paralume', 0, 1.36, 0, 32, true).rotation.x = Math.PI; k.sph(.04, 'lampadina', 0, 1.42, 0); } },
  { id:'lampadaarco', n:'Lampada ad arco', cat:'luci', price:299, main:['metallo:cromo'], sec:'marmo bianco', light:{ y:1.7, z:1.1, color:'#fff1d6', i:3, d:5 }, b:k => {
      k.box(.3, .2, .3, 'sec', 0, 0, 0, .02); k.tube([[0, .2, 0], [0, 1.4, 0], [.05, 1.95, .35], [0, 2.0, .8], [0, 1.85, 1.1]], .014, 'main', 'arc');
      k.sph(.22, 'main', 0, 1.78, 1.1, 1, .55, 1); k.sph(.06, 'lampadina', 0, 1.7, 1.1); } },
  { id:'lampadatavolo', n:'Lampada da comodino', cat:'luci', price:69, main:['ceramica'], light:{ y:.4, color:'#ffd9a0', i:1.2, d:3 }, b:k => { k.lathe([[0, 0], [.08, 0], [.1, .12], [.06, .24], [.015, .26], [0, .26]], 'main', 0, 0, 0, 'tlamp'); k.cone(.15, .2, 'paralume', 0, .28, 0, 28, true).rotation.x = Math.PI; } },
  { id:'lampadario', n:'Lampadario', cat:'luci', mount:'ceiling', price:399, main:['metallo:ottone'], light:{ y:-.6, color:'#ffe2b0', i:3, d:7 }, b:k => {
      k.cyl(.012, .012, .5, 'main', 0, -.5, 0); k.cyl(.08, .08, .03, 'main', 0, -.03, 0);
      for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; k.tube([[0, -.5, 0], [Math.cos(a) * .25, -.55, Math.sin(a) * .25], [Math.cos(a) * .4, -.45, Math.sin(a) * .4]], .008, 'main', 'arm' + i); k.sph(.045, 'lampadina', Math.cos(a) * .4, -.4, Math.sin(a) * .4); } } },
  { id:'sospensione', n:'Lampada a sospensione', cat:'luci', mount:'ceiling', price:179, main:['laccato', '#1d1d20'], light:{ y:-.85, color:'#ffe2b0', i:2.5, d:6 }, b:k => { k.cyl(.005, .005, .7, 'nero', 0, -.7, 0); k.lathe([[0, 0], [.04, 0], [.06, -.04], [.25, -.25], [.25, -.26], [0, -.1]], 'main', 0, -.68, 0, 'pend'); k.sph(.05, 'lampadina', 0, -.88, 0); } },
  { id:'applique', n:'Applique', cat:'luci', mount:'wall', price:89, main:['metallo:ottone'], light:{ y:.1, z:.2, color:'#ffd9a0', i:1, d:3 }, b:k => { k.cyl(.06, .06, .02, 'main', 0, 0, .01, 24, [Math.PI / 2, 0, 0]); k.cyl(.01, .01, .14, 'main', 0, -.0, .08, 10, [Math.PI / 2, 0, 0]); k.sph(.08, 'paralume', 0, 0, .18); } },
  { id:'candele', n:'Candele', cat:'luci', price:19, main:['plastica', '#f4f1ea'], light:{ y:.25, color:'#ffb35c', i:.6, d:2 }, b:k => { for (const [x, z, h] of [[-.04, 0, .12], [.04, .02, .18], [0, -.05, .09]]){ k.cyl(.025, .025, h, 'main', x, 0, z); k.cone(.01, .03, 'fuoco', x, h + .005, z); } } },

  // DECORAZIONI
  { id:'quadropaesaggio', n:'Quadro paesaggio', cat:'deco', mount:'wall', price:89, main:['legno:noce'], sec:'legno:noce', b:k => frame(k, 1.0, .7, 'arte1') },
  { id:'quadroastratto', n:'Quadro astratto', cat:'deco', mount:'wall', price:129, main:['laccato', '#1d1d20'], sec:'laccato:#1d1d20', b:k => frame(k, .7, .9, 'arte0') },
  { id:'quadromoderno', n:'Quadro moderno', cat:'deco', mount:'wall', price:149, sec:'laccato:#ffffff', b:k => frame(k, 1.2, .8, 'arte2') },
  { id:'trittico', n:'Trittico', cat:'deco', mount:'wall', price:169, sec:'metallo:ottone', b:k => { for (const x of [-.45, 0, .45]){ k.box(.38, .5, .025, 'sec', x, 0, .0125, .003); k.plane(.34, .46, 'arte3', x, .25, .026); } } },
  { id:'orologio', n:'Orologio da parete', cat:'deco', mount:'wall', price:49, main:['laccato', '#1d1d20'], b:k => { k.cyl(.2, .2, .03, 'main', 0, .2, .015, 40, [Math.PI / 2, 0, 0]); k.cyl(.18, .18, .005, 'bianco', 0, .2, .032, 40, [Math.PI / 2, 0, 0]); k.box(.012, .13, .005, 'nero', 0, .22, .036, .002); k.box(.1, .012, .005, 'nero', .04, .2, .036, .002, [0, 0, .3]); } },
  { id:'mensola', n:'Mensola', cat:'deco', mount:'wall', price:39, main:['legno:rovere'], b:k => { k.box(.9, .03, .22, 'main', 0, 0, .11, .004); k.box(.4, .22, .16, 'libri', -.2, .03, .1, .004); k.lathe([[0, 0], [.05, 0], [.07, .1], [.04, .2], [0, .2]], 'ceramica', .25, .03, .1, 'vaseS'); } },
  { id:'tenda', n:'Tende', cat:'deco', mount:'wall', price:119, main:['tessuto', '#e9dcc4'], sec:'metallo:nero opaco', b:k => {
      k.cyl(.012, .012, 2.0, 'sec', 0, 2.35, .1, 12, [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) k.cyl(.05, .05, 2.3, 'main', s * (.95 - i * .08), 0, .08 + (i % 2) * .03, 12); } },
  { id:'vaso', n:'Vaso in ceramica', cat:'deco', price:59, main:['laccato', '#2f4f9e'], b:k => k.lathe([[0, 0], [.09, 0], [.13, .12], [.12, .26], [.06, .36], [.07, .42], [0, .42]], 'main', 0, 0, 0, 'vaseL') },
  { id:'cuscino', n:'Cuscino decorativo', cat:'deco', price:29, main:['velluto', '#f4c430'], b:k => { k.box(.45, .45, .14, 'main', 0, 0, 0, .06, [-.15, 0, 0]); } },
  { id:'libri', n:'Pila di libri', cat:'deco', price:35, b:k => { const c = ['frutta1', 'arte0', 'frutta2']; for (let i = 0; i < 4; i++) k.box(.24 - i * .02, .04, .17, 'libri', 0, i * .04, 0, .004, [0, i * .2, 0]); } },
  { id:'scultura', n:'Scultura', cat:'deco', price:119, main:['metallo:ottone'], b:k => { k.box(.14, .05, .14, 'marmo nero', 0, 0, 0, .004); k.torus(.12, .025, 'main', 0, .18, 0, [0, 0, 0]); } },
  { id:'specchioparete', n:'Specchio rettangolare', cat:'deco', mount:'wall', price:139, main:['legno:noce'], b:k => { k.box(.7, 1.0, .03, 'main', 0, 0, .015, .006); k.box(.62, .92, .006, 'specchio', 0, .04, .031, .003); } },

  // PIANTE
  { id:'monstera', n:'Pianta grande', cat:'piante', price:79, main:['laccato', '#f4f1ea'], b:k => { pot(k, .2, .34); for (let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2; k.cyl(.006, .006, .5 + (i % 3) * .2, 'foglia2', Math.cos(a) * .03, .3, Math.sin(a) * .03, 6); } plantLeaves(k, .7, 14, 1.25); } },
  { id:'ficus', n:'Ficus', cat:'piante', price:99, main:['plastica', '#7a5a43'], b:k => { pot(k, .18, .3); k.cyl(.02, .025, .9, 'corteccia', 0, .28, 0, 8); bush(k, 0, 1.3, 0, 1.0); } },
  { id:'cactus', n:'Cactus', cat:'piante', price:29, main:['plastica', '#c46a3f'], b:k => { pot(k, .1, .14); k.cyl(.05, .055, .32, 'foglia', 0, .12, 0, 12); k.sph(.05, 'foglia', 0, .44, 0); k.cyl(.025, .025, .12, 'foglia', .07, .26, 0, 10); k.sph(.025, 'foglia', .07, .38, 0); } },
  { id:'fiori', n:'Vaso di fiori', cat:'piante', price:35, main:['vetro'], b:k => { k.cyl(.07, .06, .22, 'main', 0, 0, 0, 20); for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2, r = .06; k.cyl(.004, .004, .2, 'foglia2', Math.cos(a) * r * .4, .2, Math.sin(a) * r * .4, 5); k.sph(.035, ['fiore1', 'fiore2', 'fiore3'][i % 3], Math.cos(a) * r, .42 + (i % 2) * .04, Math.sin(a) * r); } } },
  { id:'piantina', n:'Piantina', cat:'piante', price:19, main:['ceramica'], b:k => { pot(k, .08, .12); bush(k, 0, .2, 0, .3); } },
  { id:'olivo', n:'Olivo in vaso', cat:'piante', price:149, main:['plastica', '#c46a3f'], b:k => { pot(k, .28, .45); k.tube([[0, .4, 0], [.05, .9, .03], [-.03, 1.3, 0]], .035, 'corteccia', 'olive'); bush(k, 0, 1.55, 0, 1.1); } },

  // GIARDINO
  { id:'piscina', n:'Piscina', cat:'giardino', price:9900, flat:true, main:['laccato', '#f4f1ea'], b:k => { k.box(4.4, .12, 2.6, 'bianco', 0, 0, 0, .02); k.box(4, .02, 2.2, 'acqua', 0, .11, 0, .01); for (const s of [-1, 1]) k.tube([[s * 1.9, .1, -1.0], [s * 1.9, .55, -1.0], [s * 1.8, .6, -1.0]], .015, 'cromo', 'lad' + s); } },
  { id:'tavoloesterno', n:'Tavolo da esterno', cat:'giardino', price:390, main:['legno:ciliegio'], sec:'metallo:nero opaco', b:k => { for (let i = 0; i < 7; i++) k.box(.12, .03, .9, 'main', -.42 + i * .14, .72, 0, .005); legs4(k, 1.0, .9, .72, 'sec', .02, .06); } },
  { id:'sediaesterno', n:'Sedia da esterno', cat:'giardino', price:79, main:['legno:ciliegio'], sec:'metallo:nero opaco', b:k => { legs4(k, .46, .46, .44, 'sec', .012, .03); for (let i = 0; i < 4; i++) k.box(.46, .025, .1, 'main', 0, .44, -.17 + i * .115, .004); for (let i = 0; i < 3; i++) k.box(.44, .08, .02, 'main', 0, .6 + i * .12, -.22, .004, [-.1, 0, 0]); } },
  { id:'divanetto', n:'Divanetto da esterno', cat:'giardino', price:690, main:['tessuto', '#f4f1ea'], sec:'legno:wenge', b:k => { k.box(1.6, .3, .8, 'sec', 0, .05, 0, .03); k.box(1.6, .45, .12, 'sec', 0, .35, -.34, .03); for (const s of [-1, 1]) k.box(.1, .35, .8, 'sec', s * .75, .35, 0, .03); k.box(1.4, .14, .62, 'main', 0, .35, .06, .05); for (const s of [-1, 1]) k.box(.66, .4, .14, 'main', s * .34, .45, -.24, .06); } },
  { id:'lettino', n:'Lettino prendisole', cat:'giardino', price:290, main:['tessuto', '#73bfe9'], sec:'legno:ciliegio', b:k => { k.box(.7, .08, 1.5, 'sec', 0, .25, .15, .01); legs4(k, .66, 1.5, .25, 'sec', .02, .05); k.box(.64, .06, 1.3, 'main', 0, .33, .25, .03); k.box(.64, .06, .6, 'main', 0, .5, -.75, .03, [-.9, 0, 0]); } },
  { id:'ombrellone', n:'Ombrellone', cat:'giardino', price:199, main:['tessuto', '#f4f1ea'], sec:'legno:ciliegio', b:k => { k.box(.5, .08, .5, 'nero', 0, 0, 0, .01); k.cyl(.025, .025, 2.4, 'sec', 0, .08, 0, 12); k.cone(1.4, .45, 'main', 0, 2.05, 0, 8, true); k.cone(1.36, .43, 'main', 0, 2.04, 0, 8, true).rotation.x = Math.PI; } },
  { id:'barbecue', n:'Barbecue', cat:'giardino', price:349, main:['laccato', '#1d1d20'], sec:'metallo:acciaio', b:k => { for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI * 2; k.cyl(.015, .015, .7, 'sec', Math.cos(a) * .2, 0, Math.sin(a) * .2, 8); } k.sph(.3, 'main', 0, .75, 0, 1, .6, 1); k.box(.5, .02, .02, 'sec', 0, .95, .3); } },
  { id:'albero', n:'Albero', cat:'giardino', price:249, b:k => { k.cyl(.07, .12, 1.6, 'corteccia', 0, 0, 0, 10); bush(k, 0, 2.2, 0, 2.2); } },
  { id:'abete', n:'Abete', cat:'giardino', price:199, b:k => { k.cyl(.06, .09, .5, 'corteccia', 0, 0, 0, 10); for (let i = 0; i < 4; i++) k.cone(.9 - i * .18, .9, i % 2 ? 'foglia2' : 'foglia', 0, .4 + i * .5, 0, 14); } },
  { id:'siepe', n:'Siepe', cat:'giardino', price:89, b:k => { k.box(1.5, .9, .5, 'foglia2', 0, 0, 0, .15); k.box(1.4, .1, .44, 'foglia', 0, .88, 0, .05); } },
  { id:'aiuola', n:'Aiuola fiorita', cat:'giardino', price:69, main:['legno:ciliegio'], b:k => { k.box(1.2, .25, .5, 'main', 0, 0, 0, .01); k.box(1.14, .02, .44, 'terra', 0, .22, 0); for (let i = 0; i < 12; i++){ const x = -.5 + (i % 6) * .2, z = i < 6 ? -.1 : .1; k.cyl(.004, .004, .2, 'foglia2', x, .24, z, 5); k.sph(.04, ['fiore1', 'fiore2', 'fiore3'][i % 3], x, .46, z); } } },
  { id:'lampione', n:'Lampione da giardino', cat:'giardino', price:159, main:['metallo:nero opaco'], light:{ y:1.75, color:'#ffe2b0', i:3, d:7 }, b:k => { k.cyl(.12, .14, .08, 'main', 0, 0, 0); k.cyl(.03, .03, 1.6, 'main', 0, .08, 0, 12); k.box(.24, .26, .24, 'vetro', 0, 1.62, 0, .01); k.sph(.06, 'lampadina', 0, 1.74, 0); k.cone(.2, .12, 'main', 0, 1.88, 0, 4); } },
  { id:'fontana', n:'Fontana', cat:'giardino', price:690, b:k => { k.cyl(.8, .85, .45, 'cemento', 0, 0, 0, 32); k.cyl(.72, .72, .02, 'acqua', 0, .4, 0, 32); k.cyl(.1, .14, .8, 'cemento', 0, .4, 0, 16); k.cyl(.35, .3, .1, 'cemento', 0, 1.15, 0, 24); k.cyl(.3, .3, .02, 'acqua', 0, 1.22, 0, 24); } },

  // PORTE, FINESTRE, PARETI
  { id:'porta', n:'Porta', cat:'struttura', mount:'wall', door:true, price:390, main:['laccato', '#ffffff'], sec:'metallo:cromo', b:k => { k.box(.98, 2.16, .06, 'main', 0, 0, .03, .004); k.box(.86, 2.08, .05, 'main', 0, 0, .06, .004); k.box(.12, .02, .03, 'sec', .34, 1.0, .1, .006); k.cyl(.02, .02, .04, 'sec', .34, 1.0, .08, 12, [Math.PI / 2, 0, 0]); } },
  { id:'portalegno', n:'Porta in legno', cat:'struttura', mount:'wall', door:true, price:590, main:['legno:noce'], sec:'metallo:ottone', b:k => { k.box(.98, 2.16, .06, 'main', 0, 0, .03, .004); k.box(.86, 2.08, .05, 'main', 0, 0, .06, .004); for (const y of [.15, 1.15]) k.box(.66, .8, .01, 'main', 0, y, .09, .004); k.box(.12, .02, .03, 'sec', .34, 1.0, .11, .006); } },
  { id:'finestra', n:'Finestra', cat:'struttura', mount:'wall', price:490, main:['laccato', '#ffffff'], b:k => {
      k.plane(1.1, 1.3, 'cielo', 0, .65, .005); k.box(1.2, .06, .08, 'main', 0, 0, .04, .004); k.box(1.2, .06, .08, 'main', 0, 1.34, .04, .004);
      for (const x of [-.57, 0, .57]) k.box(.06, 1.4, .08, 'main', x, 0, .04, .004); k.box(1.1, 1.3, .01, 'vetro', 0, .05, .05, .002); k.box(1.3, .04, .2, 'main', 0, -.04, .1, .004); } },
  { id:'portafinestra', n:'Portafinestra', cat:'struttura', mount:'wall', door:true, price:890, main:['laccato', '#ffffff'], b:k => {
      k.plane(1.3, 2.2, 'cielo', 0, 1.1, .005); for (const x of [-.67, 0, .67]) k.box(.06, 2.3, .08, 'main', x, 0, .04, .004); k.box(1.4, .06, .08, 'main', 0, 2.24, .04, .004); k.box(1.4, .04, .08, 'main', 0, 0, .04, .004); k.box(1.3, 2.2, .01, 'vetro', 0, .04, .05, .002); } },
  { id:'parete', n:'Parete divisoria', cat:'struttura', price:290, wall:true, main:['plastica', '#f4f1ea'], b:k => k.box(2, 2.7, .12, 'main', 0, 0, 0, .004) },
  { id:'paretevetro', n:'Parete in vetro', cat:'struttura', price:690, wall:true, main:['vetro'], sec:'metallo:nero opaco', b:k => { k.box(2, 2.6, .02, 'main', 0, .05, 0, .002); k.box(2, .05, .05, 'sec', 0, 0, 0); k.box(2, .05, .05, 'sec', 0, 2.65, 0); for (const x of [-1, -.33, .33, 1]) k.box(.03, 2.7, .03, 'sec', x * .985, 0, 0); } },
  { id:'radiatore', n:'Termosifone', cat:'struttura', mount:'wall', price:149, main:['laccato', '#ffffff'], b:k => { for (let i = 0; i < 10; i++) k.box(.06, .6, .08, 'main', -.3 + i * .066, 0, .05, .02); } },
  { id:'colonna', n:'Colonna', cat:'struttura', price:390, wall:true, main:['marmo bianco'], b:k => { k.box(.4, .1, .4, 'main', 0, 0, 0, .01); k.cyl(.15, .15, 2.5, 'main', 0, .1, 0, 24); k.box(.4, .1, .4, 'main', 0, 2.6, 0, .01); } },
];
ITEMS.forEach(d => { d.mount = d.mount || 'floor'; });
export const IT = Object.fromEntries(ITEMS.map(d => [d.id, d]));
