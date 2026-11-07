// HOME 3D DESIGN - applicazione principale
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ITEMS, IT, CATS, makeKit } from './catalog.js';
import * as M from './materials.js';
import { PRESETS } from './presets.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const euro = (n) => '€ ' + Math.round(n).toLocaleString('it-IT');
const DEG = Math.PI / 180;
function toast(msg, ms = 2400){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms); }

/* =========================================================
   SALVATAGGIO (localStorage per i progetti, IndexedDB per i modelli importati)
   ========================================================= */
const KEY = 'home3d-design-v1';
let DB;
try { DB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { DB = null; }
if (!DB || !Array.isArray(DB.houses)) DB = { houses: [], favs: [], settings: { quality: 'alta', theme: 'auto' }, imported: [] };
DB.settings = Object.assign({ quality: 'alta', theme: 'auto' }, DB.settings || {});
DB.favs = DB.favs || []; DB.imported = DB.imported || [];
let saveT = 0;
function saveNow(){
  try { localStorage.setItem(KEY, JSON.stringify(DB)); return true; }
  catch (e){ toast('Memoria piena: elimina qualche progetto'); return false; }
}
function saveSoon(){ clearTimeout(saveT); saveT = setTimeout(saveNow, 350); }
if (DB.settings.theme !== 'auto') document.documentElement.dataset.theme = DB.settings.theme;

const idb = {
  db: null,
  open(){ return new Promise((res) => { if (!('indexedDB' in window)) return res(null); try { const r = indexedDB.open('home3d', 1); r.onupgradeneeded = () => r.result.createObjectStore('models'); r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => res(null); } catch (e) { res(null); } }); },
  put(k, v){ return new Promise((res) => { if (!this.db) return res(false); const tx = this.db.transaction('models', 'readwrite'); tx.objectStore('models').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); },
  get(k){ return new Promise((res) => { if (!this.db) return res(null); const rq = this.db.transaction('models').objectStore('models').get(k); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }); },
  del(k){ return new Promise((res) => { if (!this.db) return res(false); const tx = this.db.transaction('models', 'readwrite'); tx.objectStore('models').delete(k); tx.oncomplete = () => res(true); }); },
};

/* =========================================================
   MODELLI IMPORTATI (GLB / glTF)
   ========================================================= */
const GLTF = new Map(); // id -> scena caricata
const gltfLoader = new GLTFLoader();
function parseGLB(buf){ return new Promise((res, rej) => gltfLoader.parse(buf, '', (g) => res(g.scene), rej)); }
async function loadImported(){
  for (const imp of DB.imported){
    if (imp.kind === 'foto'){ const url = await idb.get(imp.id); if (!url) continue; try { buildPhotoModel(imp, await loadImg(url)); registerImported(imp); } catch (e) { console.warn('foto non valida', imp.n); } continue; }
    const buf = await idb.get(imp.id);
    if (!buf) continue;
    try { const sc = await parseGLB(buf); normalizeImported(sc, imp); GLTF.set(imp.id, sc); registerImported(imp); } catch (e) { console.warn('modello non valido', imp.n); }
  }
}
function normalizeImported(sc, imp){
  const box = new THREE.Box3().setFromObject(sc), size = box.getSize(new THREE.Vector3());
  const maxd = Math.max(size.x, size.y, size.z) || 1;
  let s = 1; if (maxd > 6 || maxd < .05) s = (imp.target || 1) / maxd;
  sc.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(sc), c = b2.getCenter(new THREE.Vector3());
  sc.position.set(-c.x, -b2.min.y, -c.z);
  sc.traverse((o) => { if (o.isMesh){ o.castShadow = o.receiveShadow = true; o.userData.slot = 'imported'; } });
}
function registerImported(imp){
  if (IT[imp.id]) return;
  const foto = imp.kind === 'foto';
  const d = { id: imp.id, n: imp.n, cat: 'importati', price: 0, mount: foto && imp.type === 'quadro' ? 'wall' : 'floor', flat: foto && imp.type === 'tappeto', imported: true, main: ['originale'], b: null };
  ITEMS.push(d); IT[imp.id] = d;
}

/* =========================================================
   CASE, STANZE E OGGETTI
   ========================================================= */
const WALL_RY = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; // 0 fondo (-z), 1 destra (+x), 2 davanti (+z), 3 sinistra (-x)
function newRoom(name, kind = 'interno', w = 5, d = 4, h = 2.8){
  const out = kind !== 'interno';
  const r = { id: uid(), name, kind, w, d, h, floor: { k: kind === 'esterno' ? 'erba' : kind === 'terrazza' ? 'deck' : 'rovere' },
    walls: [0, 1, 2, 3].map(() => ({ k: kind === 'terrazza' ? 'vetro' : 'pittura', c: '#f1eee8' })), ceil: { k: 'pittura', c: '#ffffff' },
    light: { mode: 'giorno', sun: 1, warm: .5, lamps: true, exposure: 1 }, items: [], before: null };
  if (out) r.light.sun = 1.1;
  return r;
}
function newItem(t, x = 0, y = 0, z = 0, ry = 0){
  const d = IT[t];
  return { u: uid(), t, x, y, z, ry, sx: 1, sy: 1, sz: 1, m: d.main ? { f: d.main[0], c: d.main[1] || null } : null, s2: d.sec || null, wall: null };
}
function roomFromPreset(p){
  const r = newRoom(p.n, p.kind, p.w, p.d, p.h);
  r.floor = { k: p.floor[0], c: p.floor[1] || null };
  r.walls = [0, 1, 2, 3].map(() => ({ k: p.wall[0], c: p.wall[1] || null }));
  if (p.accent) r.walls[p.accent[0]] = { k: p.accent[1], c: p.accent[2] || null };
  r.ceil = { k: p.ceil[0], c: p.ceil[1] || null };
  r.preset = p.id;
  r.items = [];
  const settle = [];
  for (const a of p.items){
    const [t] = a; if (!IT[t]) continue;
    let it;
    if (a[1] === 'C'){ it = newItem(t, a[2], r.h, a[3]); }
    else if (typeof a[1] === 'string'){
      const wi = 'BRFL'.indexOf(a[1]); const along = a[2], y = a[3];
      it = newItem(t); it.wall = wi; it.y = IT[t].door ? 0 : y; placeOnWall(it, r, along);
    } else { it = newItem(t, a[1], 0, a[2], (a[3] || 0) * DEG); }
    const o = a.find((v) => v && typeof v === 'object' && !Array.isArray(v));
    if (o){ if (o.m) it.m = { f: o.m[0], c: o.m[1] || null }; if (o.s2) it.s2 = o.s2; if (o.on) settle.push(it); }
    r.items.push(it);
  }
  r._settle = settle.map((i) => i.u);
  return r;
}
function placeOnWall(it, r, along){
  const w = it.wall;
  it.ry = WALL_RY[w];
  if (w === 0){ it.x = along; it.z = -r.d / 2; }
  else if (w === 2){ it.x = -along; it.z = r.d / 2; }
  else if (w === 1){ it.x = r.w / 2; it.z = along; }
  else { it.x = -r.w / 2; it.z = along; }
}
function newHouse(name){ return { id: uid(), name, upd: Date.now(), rooms: [] }; }
if (!DB.houses.length){
  // al primo avvio: una casa di esempio con due stanze arredate
  const h = newHouse('Casa di esempio');
  h.rooms.push(roomFromPreset(PRESETS[0]), roomFromPreset(PRESETS[2]));
  h.rooms.forEach((r) => (r.before = { items: [], floor: r.floor, walls: r.walls, ceil: r.ceil }));
  DB.houses.push(h);
}

/* =========================================================
   MOTORE 3D
   ========================================================= */
const LIGHT = DB.settings.quality === 'leggera';
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: !LIGHT, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LIGHT ? 1 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = !LIGHT;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
M.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
stage.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-label', 'Stanza in 3D');

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environment = envTex;
const camera = new THREE.PerspectiveCamera(50, 1, .05, 200);
camera.position.set(4.5, 4.2, 6);

const hemi = new THREE.HemisphereLight('#ffffff', '#c9b9a5', .9);
const sun = new THREE.DirectionalLight('#fff3e0', 2.6);
sun.castShadow = !LIGHT;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
const ambient = new THREE.AmbientLight('#ffffff', .15);
scene.add(hemi, sun, sun.target, ambient);

const roomG = new THREE.Group(), itemsG = new THREE.Group(), houseG = new THREE.Group();
scene.add(roomG, itemsG, houseG);
const grid = new THREE.GridHelper(40, 80, 0x7a8599, 0xb8c0cf); grid.position.y = .002; grid.visible = false; scene.add(grid);
const selBox = new THREE.Box3Helper(new THREE.Box3(), 0x2f6df6); selBox.visible = false; scene.add(selBox);
const wallHi = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x2f6df6, transparent: true, opacity: .18, depthWrite: false })); wallHi.visible = false; scene.add(wallHi);

/* stato editor */
let house = null, room = null, sel = null, selSurface = null, mode = 'realistico', camMode = 'libera', showBefore = false;
let undoStack = [], redoStack = [], clipboard = null;
const objs = new Map(); // u -> Object3D
let walls = [], floorMesh = null, ceilMesh = null, groundMesh = null;

/* ---------- controlli ---------- */
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', onDown); // prima dei controlli: così se tocchi un mobile la telecamera resta ferma
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.maxPolarAngle = Math.PI / 2 - .03; controls.minDistance = .8; controls.maxDistance = 40;
controls.target.set(0, 1, 0);

function resize(){
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

/* ---------- costruzione stanza ---------- */
function disposeGroup(g){ g.traverse((o) => { if (o.isMesh && o.userData.own){ o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); g.clear(); }
function surf(kind, s, w, h){
  if (s.k === 'vetro') return M.material('vetro');
  const m = M.surfaceMaterial(kind, s.k, s.c, w, h);
  // il soffitto riceve poca luce diretta: un leggero bagliore lo tiene chiaro e pulito come in foto
  if (kind === 'ceil' && m.emissive){ m.emissive.copy(m.color).multiplyScalar(.32); if (m.map){ m.emissiveMap = m.map; } }
  return m;
}
function buildRoom(r, target = roomG, offset = null, forOverview = false, opts = {}){
  const lift = opts.lift || 0, skip = opts.skip || [];
  if (!forOverview){ disposeGroup(roomG); walls = []; }
  const T = .14, g = forOverview ? new THREE.Group() : target;
  const out = r.kind !== 'interno';
  const mk = (geom, mat, x, y, z) => { const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; m.userData.own = true; g.add(m); return m; };
  // pavimento
  const fl = mk(new THREE.BoxGeometry(r.w, .1, r.d), surf('floor', r.floor, r.w, r.d), 0, -.05 + lift, 0);
  fl.castShadow = false; fl.userData.surface = 'floor';
  if (!forOverview) floorMesh = fl;
  if (out && !(forOverview && planOn)){
    const gm = mk(new THREE.PlaneGeometry(80, 80), r.kind === 'esterno' ? M.surfaceMaterial('floor', 'erba', null, 80, 80) : new THREE.MeshStandardMaterial({ color: '#9fb39a', roughness: 1 }), 0, r.kind === 'esterno' ? -.012 : -2.6, 0);
    gm.rotation.x = -Math.PI / 2; gm.castShadow = false; gm.userData.ground = true;
    if (!forOverview) groundMesh = gm;
  }
  if (out){
    if (r.kind === 'terrazza'){ const slab = mk(new THREE.BoxGeometry(r.w + .3, 2.5, r.d + .3), new THREE.MeshStandardMaterial({ color: '#d8d4cc', roughness: .9 }), 0, -1.35, 0); slab.userData.surface = null; }
  }
  // pareti (all'esterno nessuna parete; in terrazza parapetto in vetro)
  if (r.kind !== 'esterno'){
    const H = r.kind === 'terrazza' ? 1.05 : r.h;
    const defs = [
      [r.w + 2 * T, H, T, 0, H / 2, -r.d / 2 - T / 2, r.w],
      [T, H, r.d, r.w / 2 + T / 2, H / 2, 0, r.d],
      [r.w + 2 * T, H, T, 0, H / 2, r.d / 2 + T / 2, r.w],
      [T, H, r.d, -r.w / 2 - T / 2, H / 2, 0, r.d],
    ];
    defs.forEach((d, i) => {
      if (skip.includes(i)) return;
      const m = mk(new THREE.BoxGeometry(d[0], d[1], d[2]), surf('wall', r.walls[i], d[6], H), d[3], d[4], d[5]);
      m.userData.surface = 'wall'; m.userData.idx = i;
      if (r.walls[i].k === 'vetro'){ m.castShadow = false; }
      if (!forOverview) walls[i] = m;
      if (r.kind === 'interno'){ // battiscopa
        const bb = mk(new THREE.BoxGeometry(i % 2 ? .015 : r.w, .08, i % 2 ? r.d : .015), M.material('bianco'), [0, r.w / 2 - .007, 0, -r.w / 2 + .007][i], .04, [-r.d / 2 + .007, 0, r.d / 2 - .007, 0][i]);
        bb.userData.own = false; bb.userData.baseboard = i; if (!forOverview) m.userData.base = bb;
      }
    });
    if (r.kind === 'interno'){
      const c = mk(new THREE.BoxGeometry(r.w + 2 * T, .1, r.d + 2 * T), surf('ceil', r.ceil, r.w, r.d), 0, r.h + .05 - lift, 0);
      c.userData.surface = 'ceil'; c.castShadow = true;
      if (!forOverview) ceilMesh = c;
    }
  }
  if (forOverview){ g.position.copy(offset); target.add(g); }
  return g;
}

/* ---------- oggetti ---------- */
function buildObject(it){
  const d = IT[it.t]; if (!d) return null;
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.add(inner);
  if (d.imported){ const src = GLTF.get(d.id); if (src) inner.add(src.clone(true)); }
  else d.b(makeKit(inner));
  outer.userData.u = it.u;
  applyMaterials(outer, it);
  applyTransform(outer, it);
  if (d.light){
    const L = new THREE.PointLight(d.light.color, 0, d.light.d, 2);
    L.position.set(0, d.light.y, d.light.z || 0); L.userData.base = d.light.i; L.userData.lamp = true; L.castShadow = false;
    inner.add(L);
  }
  inner.traverse((o) => { if (o.isMesh){ o.userData.item = it.u; if (LIGHT) o.castShadow = false; } });
  return outer;
}
const tintCache = new Map();
function applyMaterials(outer, it){
  const d = IT[it.t];
  outer.traverse((o) => {
    if (!o.isMesh) return;
    const slot = o.userData.slot;
    if (slot === 'imported'){
      if (!o.userData.orig) o.userData.orig = o.material;
      if (it.m && it.m.f !== 'originale'){ o.material = M.material(it.m.f, it.m.c); }
      else o.material = o.userData.orig;
      return;
    }
    if (slot === 'main') o.material = it.m ? M.material(it.m.f, it.m.c) : M.material('bianco');
    else if (slot === 'sec') o.material = M.material(it.s2 || d.sec || 'legno:rovere');
    else o.material = M.material(slot);
  });
}
function applyTransform(o, it){
  o.position.set(it.x, it.y, it.z);
  o.rotation.set(0, it.ry, 0);
  o.scale.set(it.sx, it.sy, it.sz);
  o.updateMatrixWorld(true);
}
function rebuildItems(){
  for (const o of objs.values()) itemsG.remove(o);
  objs.clear();
  const list = showBefore && room.before ? room.before.items : room.items;
  for (const it of list){ const o = buildObject(it); if (o){ tuneEnv(o); itemsG.add(o); objs.set(it.u, o); } }
  updateLamps();
}
function addObject(it){ const o = buildObject(it); if (o){ tuneEnv(o); itemsG.add(o); objs.set(it.u, o); } updateLamps(); return o; }
function removeObject(u){ const o = objs.get(u); if (o){ itemsG.remove(o); objs.delete(u); } }

/* ---------- luci, giorno e notte ---------- */
function updateLamps(){
  if (!room) return;
  const night = room.light.mode === 'notte';
  let n = 0;
  itemsG.traverse((o) => {
    if (!o.userData.lamp) return;
    const on = room.light.lamps && (night || mode === 'realistico' && room.kind === 'interno' && false);
    o.intensity = on && n < 10 ? o.userData.base * (night ? 6 : 2) : 0; if (on) n++;
  });
  // lampadine e fuoco più luminosi di notte
  for (const k of ['lampadina', 'paralume', 'fuoco']){ const m = M.material(k); m.emissiveIntensity = (k === 'paralume' ? (night ? .9 : .2) : k === 'fuoco' ? 2.2 : (night ? 3 : 1.4)); }
}
let envK = .7;
// sfondo sfumato (più elegante del colore piatto)
const skyCache = {};
function skyTex(out){
  const k = out ? 'o' : 'i'; if (skyCache[k]) return skyCache[k];
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (out){ gr.addColorStop(0, '#8ec5f2'); gr.addColorStop(.6, '#cfe7fb'); gr.addColorStop(1, '#eef5fb'); }
  else { gr.addColorStop(0, '#d9e0ea'); gr.addColorStop(.55, '#eef1f5'); gr.addColorStop(1, '#f7f5f1'); }
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (skyCache[k] = t);
}
// luce riflessa dall'ambiente: piena di giorno, quasi spenta di notte
function fullEnv(root, fn){ const k = envK; envK = .7; tuneEnv(root); fn(); envK = k; tuneEnv(root); }
function tuneEnv(root){ root.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms){ if (m.envMapIntensity === undefined) continue; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * envK; } }); }
function applyLighting(){
  const R = room || (planOn ? PLAN_DEF : null); if (!R) return;
  const L = R.light, night = L.mode === 'notte', out = R.kind !== 'interno' && !planOn;
  const warm = new THREE.Color().setHSL(.09 - L.warm * .05, .25 + L.warm * .5, .92);
  const span = Math.max(R.w, R.d);
  if (night){
    scene.background = new THREE.Color(out ? '#0b1430' : '#141a29');
    hemi.color.set('#8aa0d8'); hemi.groundColor.set('#1a1a22'); hemi.intensity = .12;
    sun.color.set('#9fb4ff'); sun.intensity = out ? .35 : .08; ambient.intensity = .04;
    renderer.toneMappingExposure = L.exposure * 1.1;
  } else {
    scene.background = mode === 'progettazione' ? new THREE.Color('#e8ecf3') : skyTex(out);
    hemi.color.set('#ffffff'); hemi.groundColor.set('#c9b9a5'); hemi.intensity = out ? .9 : .75 * L.sun;
    sun.color.copy(warm); sun.intensity = (out ? 3.2 : 2.6) * L.sun; ambient.intensity = .15;
    renderer.toneMappingExposure = L.exposure;
  }
  sun.position.set(span * .9, Math.max(R.h, 3) * 2.2, span * .7);
  sun.target.position.set(0, 0, 0);
  const sc = sun.shadow.camera; const e = span * .9 + 1; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = .5; sc.far = span * 6 + 10; sc.updateProjectionMatrix();
  const design = mode === 'progettazione';
  renderer.shadowMap.enabled = !LIGHT && !design; sun.castShadow = !LIGHT && !design;
  scene.environment = design ? null : envTex;
  if (design){ hemi.intensity = 1.6; sun.intensity = 1.2; }
  grid.visible = design;
  scene.fog = out && !night ? new THREE.Fog('#bfe0fb', 30, 70) : null;
  updateLamps();
  // materiali già creati: aggiorna le ombre
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  envK = design ? 1 : night ? .05 : .7; tuneEnv(scene);
  if (planOn){ planShadowFit(); planLamps(); perspBg = scene.background; perspFog = scene.fog; }
  $('bDay').innerHTML = night ? '<svg class="i" aria-hidden="true"><use href="#i-moon"/></svg> Notte' : '<svg class="i" aria-hidden="true"><use href="#i-sun"/></svg> Giorno';
  $('bMode').innerHTML = design ? '<svg class="i" aria-hidden="true"><use href="#i-ruler"/></svg> Progettazione' : '<svg class="i" aria-hidden="true"><use href="#i-sparkle"/></svg> Realistico';
}

/* =========================================================
   POSIZIONAMENTO, APPOGGIO E COLLISIONI
   ========================================================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const tmpBox = new THREE.Box3(), tmpV = new THREE.Vector3();
function setRay(cx, cy){ const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); }
function itemMeshes(exclude){ const a = []; for (const [u, o] of objs){ if (u === exclude || !o.visible) continue; o.traverse((m) => { if (m.isMesh && m.visible && m.material && !m.material.transparent) a.push(m); }); } return a; }
function meshBoxes(o){ const a = []; o.updateMatrixWorld(true); o.traverse((m) => { if (m.isMesh && m.visible){ if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); a.push(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } }); return a; }
function objBox(o){ o.updateMatrixWorld(true); const b = new THREE.Box3(); o.traverse((m) => { if (m.isMesh){ if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b.union(tmpBox.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld)); } }); return b; }
function collides(it, o){
  const d = IT[it.t]; if (d.flat || d.mount !== 'floor') return false;
  const mine = meshBoxes(o);
  for (const [u, other] of objs){
    if (u === it.u) continue;
    const od = IT[(room.items.find((x) => x.u === u) || {}).t]; if (!od || od.flat || od.mount === 'ceiling') continue;
    const ob = objBox(other);
    const all = objBox(o);
    if (!ob.intersectsBox(all)) continue;
    const theirs = meshBoxes(other);
    for (const a of mine) for (const b of theirs){
      const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
      const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
      const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
      if (ox > .008 && oz > .008 && oy > .012) return true;
    }
  }
  return false;
}
function clampInside(it, o){
  if (IT[it.t].mount === 'wall') return;
  const b = objBox(o), hw = room.w / 2, hd = room.d / 2;
  let dx = 0, dz = 0;
  if (b.min.x < -hw) dx = -hw - b.min.x; else if (b.max.x > hw) dx = hw - b.max.x;
  if (b.min.z < -hd) dz = -hd - b.min.z; else if (b.max.z > hd) dz = hd - b.max.z;
  if (dx || dz){ it.x += dx; it.z += dz; applyTransform(o, it); }
}
function surfaceBelow(it, o, x, z, maxY = 50){
  // trova la superficie su cui appoggiare: pavimento o piano di un altro mobile
  const own = o; let best = 0;
  ray.set(new THREE.Vector3(x, maxY, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(itemMeshes(it.u), false);
  for (const h of hits){
    if (h.object === own) continue;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (n.y > .7){ best = h.point.y; break; }
  }
  return best;
}
// prova a mettere l'oggetto in (x,y,z): se tocca altri mobili scivola lungo un asse, altrimenti resta dov'era
function tryMove(it, o, x, y, z){
  const px = it.x, py = it.y, pz = it.z;
  const attempt = (ax, az) => { it.x = ax; it.z = az; it.y = y; applyTransform(o, it); clampInside(it, o); return !collides(it, o); };
  if (attempt(x, z)) return true;
  if (attempt(x, pz)) return true;
  if (attempt(px, z)) return true;
  it.x = px; it.y = py; it.z = pz; applyTransform(o, it); return false;
}
function freeSpot(it, o){
  const hw = room.w / 2 - .3, hd = room.d / 2 - .3;
  for (let r = 0; r < 14; r++){
    for (let a = 0; a < Math.max(1, r * 6); a++){
      const ang = a / Math.max(1, r * 6) * Math.PI * 2, x = Math.cos(ang) * r * .35, z = Math.sin(ang) * r * .35 + .3;
      if (Math.abs(x) > hw || Math.abs(z) > hd) continue;
      it.x = x; it.z = z; it.y = 0; applyTransform(o, it); clampInside(it, o);
      if (!collides(it, o)) return true;
    }
  }
  it.x = 0; it.z = 0; applyTransform(o, it); return false;
}
function visibleWallFacingCamera(){
  let best = 0, bd = -Infinity;
  walls.forEach((w, i) => { if (!w || !w.visible) return; const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), WALL_RY[i]); const dir = camera.getWorldDirection(new THREE.Vector3()); const s = -n.dot(dir); if (s > bd){ bd = s; best = i; } });
  return best;
}
function wallItemHeight(it){ const o = objs.get(it.u); if (!o) return .5; const b = objBox(o); return b.max.y - b.min.y; }
function clampWall(it){
  const r = room, o = objs.get(it.u); const b = o ? objBox(o) : null;
  const halfW = b ? Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2 : .3;
  const len = it.wall % 2 ? r.d : r.w;
  const along = it.wall === 0 ? it.x : it.wall === 2 ? -it.x : it.z;
  const a = Math.max(-len / 2 + halfW, Math.min(len / 2 - halfW, along));
  const hh = wallItemHeight(it);
  if (IT[it.t].door) it.y = 0; else it.y = Math.max(0, Math.min(r.h - hh, it.y));
  placeOnWall(it, r, a);
}

/* ---------- puntatore: selezione e trascinamento ---------- */
let drag = null, down0 = null, fpLook = null;
function pickItem(cx, cy){
  setRay(cx, cy);
  const ms = []; for (const o of objs.values()) if (o.visible) o.traverse((m) => { if (m.isMesh) ms.push(m); });
  const h = ray.intersectObjects(ms, false)[0];
  return h ? h.object.userData.item : null;
}
function onDown(e){
  if (showBefore || camMode === 'casa') return;
  down0 = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (camMode === 'persona'){ fpLook = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); return; }
  const u = pickItem(e.clientX, e.clientY);
  if (u){
    controls.enabled = false;
    canvas.setPointerCapture(e.pointerId);
    select(u, true); // il pannello si apre quando alzi il dito, così la scena non si sposta
    startDrag(u, e.clientX, e.clientY);
  }
}
function startDrag(u, cx, cy){
  const it = room.items.find((i) => i.u === u), o = objs.get(u); if (!it || !o) return;
  const d = IT[it.t];
  setRay(cx, cy);
  let anchor = null;
  if (d.mount === 'wall' && room.kind !== 'esterno'){
    const h = ray.intersectObjects(walls.filter((w) => w && w.visible), false)[0];
    anchor = h ? h.point.clone() : new THREE.Vector3(it.x, it.y, it.z);
  } else {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), d.mount === 'ceiling' ? 0 : -it.y);
    anchor = ray.ray.intersectPlane(plane, new THREE.Vector3()) || new THREE.Vector3(it.x, it.y, it.z);
  }
  drag = { u, it, o, before: JSON.stringify(room.items), off: new THREE.Vector3(it.x - anchor.x, it.y - anchor.y, it.z - anchor.z), moved: false };
}
function dragTo(cx, cy){
  const { it, o } = drag, d = IT[it.t];
  setRay(cx, cy);
  if (d.mount === 'wall' && room.kind !== 'esterno'){
    const h = ray.intersectObjects(walls.filter((w) => w && w.visible), false)[0];
    if (!h) return;
    it.wall = h.object.userData.idx;
    const p = h.point;
    const along = it.wall === 0 ? p.x + (it.wall === drag.lastWall ? drag.off.x : 0) : it.wall === 2 ? -p.x : p.z;
    it.y = p.y + drag.off.y;
    placeOnWall(it, room, it.wall === 0 ? p.x : along);
    clampWall(it); applyTransform(o, it); drag.lastWall = it.wall;
  } else if (d.mount === 'ceiling'){
    const p = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3()); if (!p) return;
    it.x = Math.max(-room.w / 2 + .2, Math.min(room.w / 2 - .2, p.x + drag.off.x)); it.z = Math.max(-room.d / 2 + .2, Math.min(room.d / 2 - .2, p.z + drag.off.z)); it.y = room.kind === 'interno' ? room.h : 3; applyTransform(o, it);
  } else {
    // pavimento o superfici di altri mobili sotto il dito
    const targets = itemMeshes(it.u); if (floorMesh) targets.push(floorMesh); if (groundMesh) targets.push(groundMesh);
    const hits = ray.intersectObjects(targets, false);
    let hit = null;
    for (const h of hits){ const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.y > .7){ hit = h; break; } }
    let p, y = 0;
    if (hit){ p = hit.point; y = hit.object === floorMesh || hit.object === groundMesh ? 0 : hit.point.y; }
    else { p = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3()); if (!p) return; }
    const nx = hit && y > 0 ? p.x : p.x + drag.off.x, nz = hit && y > 0 ? p.z : p.z + drag.off.z;
    if (hit && y > 0){ // controllo che stia sul piano del mobile sotto
      y = surfaceBelow(it, o, nx, nz, y + .05);
    }
    tryMove(it, o, nx, y, nz);
  }
  drag.moved = true;
  updateSelBox();
}
window.addEventListener('pointermove', (e) => {
  if (fpLook && e.pointerId === fpLook.id){ const dx = e.clientX - fpLook.x, dy = e.clientY - fpLook.y; fpLook.x = e.clientX; fpLook.y = e.clientY; fp.yaw -= dx * .005; fp.pitch = Math.max(-1.2, Math.min(1.2, fp.pitch - dy * .005)); return; }
  if (drag) dragTo(e.clientX, e.clientY);
  else if (catDrag) catDragMove(e);
});
window.addEventListener('pointerup', (e) => {
  if (fpLook){ fpLook = null; }
  if (catDrag){ catDragEnd(e); }
  if (drag){
    if (drag.moved){ pushUndo(drag.before); commit(); }
    drag = null; controls.enabled = camMode !== 'persona' && camMode !== 'casa'; renderProps();
  } else if (down0 && Math.hypot(e.clientX - down0.x, e.clientY - down0.y) < 6 && e.target === canvas && camMode !== 'persona'){
    // tocco breve sul vuoto: deseleziona oppure seleziona parete/pavimento per cambiare materiale
    const u = pickItem(e.clientX, e.clientY);
    if (!u){
      setRay(e.clientX, e.clientY);
      const ss = [floorMesh, ...walls].filter((m) => m && m.visible);
      if (ceilMesh && ceilMesh.visible) ss.push(ceilMesh);
      const h = ray.intersectObjects(ss, false)[0];
      if (h && sel === null && selSurface === null) selectSurface(h.object.userData.surface, h.object.userData.idx);
      else { select(null); selectSurface(null); }
    }
  }
  down0 = null;
});

/* ---------- trascinare dal catalogo nella stanza ---------- */
let catDrag = null;
function catDragStart(e, t){ catDrag = { t, x: e.clientX, y: e.clientY, started: false, id: e.pointerId }; }
function catDragMove(e){
  if (planOn){ catDrag = null; return; }
  if (!catDrag || e.pointerId !== catDrag.id) return;
  const dy = catDrag.y - e.clientY, dx = Math.abs(e.clientX - catDrag.x);
  if (!catDrag.started){
    const rc = canvas.getBoundingClientRect();
    const overStage = e.clientX > rc.left && e.clientX < rc.right && e.clientY > rc.top && e.clientY < rc.bottom;
    if ((dy > 30 && dy > dx) || (overStage && window.innerWidth >= 1000 && dx + dy > 20)){
      catDrag.started = true; controls.enabled = false;
      const u = insertItem(catDrag.t, true); if (!u){ catDrag = null; return; }
      catDrag.u = u; startDrag(u, e.clientX, e.clientY); drag.off.set(0, 0, 0); drag.before = catDrag.before;
    }
    return;
  }
  if (drag) dragTo(e.clientX, e.clientY);
}
let catDragDone = -1e9;
function catDragEnd(){ if (catDrag && catDrag.started){ catDragDone = performance.now(); if (!drag) controls.enabled = true; } catDrag = null; }

/* ---------- selezione ---------- */
function select(u, quiet){
  sel = u; if (u) selectSurface(null, null, true);
  updateSelBox(); if (!quiet) renderProps();
}
function updateSelBox(){
  const o = sel && objs.get(sel);
  if (o){ selBox.box.copy(objBox(o)).expandByScalar(.02); selBox.visible = true; } else selBox.visible = false;
}
function selectSurface(kind, idx, quiet){
  selSurface = kind ? { kind, idx } : null;
  if (kind === 'wall' && walls[idx]){ const w = walls[idx]; const g = w.geometry.parameters; wallHi.scale.set(g.width + .01, g.height + .01, g.depth + .01); wallHi.position.copy(w.position); wallHi.visible = true; }
  else if (kind === 'floor' && floorMesh){ wallHi.scale.set(room.w, .02, room.d); wallHi.position.set(0, .01, 0); wallHi.visible = true; }
  else wallHi.visible = false;
  if (kind){ sel = null; selBox.visible = false; }
  if (!quiet) renderProps();
}

/* =========================================================
   MODIFICHE, ANNULLA E RIPETI
   ========================================================= */
function snapshot(){ return JSON.stringify({ items: room.items, floor: room.floor, walls: room.walls, ceil: room.ceil, w: room.w, d: room.d, h: room.h, light: room.light }); }
function pushUndo(prevItemsJSON){
  const cur = JSON.parse(snapshot());
  if (prevItemsJSON) cur.items = JSON.parse(prevItemsJSON);
  undoStack.push(JSON.stringify(cur)); if (undoStack.length > 60) undoStack.shift(); redoStack = []; updUR();
}
function mark(){ undoStack.push(snapshot()); if (undoStack.length > 60) undoStack.shift(); redoStack = []; updUR(); }
function restore(s){ const o = JSON.parse(s); Object.assign(room, o); }
function undo(){ if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); afterStructural(); }
function redo(){ if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); afterStructural(); }
function afterStructural(){ sel = null; selSurface = null; buildRoom(room); rebuildItems(); applyLighting(); updateSelBox(); wallHi.visible = false; renderProps(); commit(); updUR(); }
function updUR(){ $('eUndo').disabled = !(planOn ? planUndo : undoStack).length; $('eRedo').disabled = !(planOn ? planRedo : redoStack).length; }
function commit(){ house.upd = Date.now(); updateCost(); saveSoon(); $('eSave').innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-save"/></svg>'; }
function updateCost(){ const list = planOn && house ? house.rooms.flatMap((r) => r.items) : room ? room.items : []; const tot = list.reduce((a, i) => a + (IT[i.t] ? IT[i.t].price : 0), 0); $('eCost').textContent = euro(tot); }

function insertItem(t, viaDrag = false){
  const d = IT[t]; if (!d) return null;
  if (showBefore) toggleBefore(false);
  if (!viaDrag) mark(); else catDrag.before = JSON.stringify(room.items);
  const it = newItem(t);
  if (d.mount === 'wall' && room.kind !== 'esterno'){
    it.wall = visibleWallFacingCamera();
    it.y = d.door ? 0 : t === 'finestra' ? .95 : t === 'tenda' ? 0 : (d.cat === 'cucina' ? 1.5 : 1.35);
    placeOnWall(it, room, 0);
  } else if (d.mount === 'ceiling'){ it.y = room.kind === 'interno' ? room.h : 3; }
  room.items.push(it);
  const o = addObject(it);
  if (d.mount === 'wall' && room.kind !== 'esterno') { clampWall(it); applyTransform(o, it); }
  else if (d.mount === 'floor' && !viaDrag){ if (!freeSpot(it, o)) toast('Stanza piena: spostalo tu dove c\'è posto'); }
  select(it.u); commit();
  return it.u;
}
function deleteSel(){ if (!sel) return; mark(); room.items = room.items.filter((i) => i.u !== sel); removeObject(sel); select(null); commit(); updateLamps(); }
function duplicateSel(){
  const it = selItem(); if (!it) return; mark();
  const c = clone(it); c.u = uid(); room.items.push(c);
  const o = addObject(c);
  if (IT[c.t].mount === 'wall' && c.wall !== null){ const along = c.wall === 0 ? c.x + .4 : c.wall === 2 ? -c.x + .4 : c.z + .4; placeOnWall(c, room, along); clampWall(c); applyTransform(o, c); }
  else if (IT[c.t].mount === 'floor'){ if (!tryMove(c, o, c.x + .5, c.y, c.z + .3) && !tryMove(c, o, c.x - .5, c.y, c.z - .3)) freeSpot(c, o); }
  else { c.x += .4; applyTransform(o, c); }
  select(c.u); commit();
}
function pasteItem(){
  if (!clipboard){ toast('Prima copia un mobile'); return; }
  mark(); const c = clone(clipboard); c.u = uid(); room.items.push(c); const o = addObject(c);
  if (IT[c.t].mount === 'wall' && room.kind !== 'esterno'){ c.wall = visibleWallFacingCamera(); placeOnWall(c, room, 0); clampWall(c); applyTransform(o, c); }
  else if (IT[c.t].mount === 'floor'){ c.y = 0; freeSpot(c, o); }
  select(c.u); commit(); toast('Mobile incollato');
}
const selItem = () => room && room.items.find((i) => i.u === sel);
function edit(fn, rebuild = false){
  const it = selItem(); if (!it) return; const o = objs.get(it.u);
  const prev = clone(it); mark();
  fn(it);
  if (rebuild){ applyMaterials(o, it); }
  applyTransform(o, it);
  const d = IT[it.t];
  if (d.mount === 'floor'){ clampInside(it, o); if (collides(it, o)){ Object.assign(it, prev); applyTransform(o, it); undoStack.pop(); updUR(); toast('Non c\'è spazio: tocca un altro mobile'); return; } }
  if (d.mount === 'wall' && it.wall !== null && room.kind !== 'esterno'){ clampWall(it); applyTransform(o, it); }
  updateSelBox(); commit(); renderProps(true);
}
function snapToWall(){
  const it = selItem(); if (!it) return; const d = IT[it.t]; if (d.mount !== 'floor') return;
  const o = objs.get(it.u);
  // parete più vicina
  const dists = [it.z + room.d / 2, room.w / 2 - it.x, room.d / 2 - it.z, it.x + room.w / 2];
  const w = dists.indexOf(Math.min(...dists));
  mark(); const prev = clone(it);
  it.ry = WALL_RY[w]; applyTransform(o, it);
  const b = objBox(o);
  if (w === 0) it.z += (-room.d / 2) - b.min.z; if (w === 2) it.z += (room.d / 2) - b.max.z;
  if (w === 1) it.x += (room.w / 2) - b.max.x; if (w === 3) it.x += (-room.w / 2) - b.min.x;
  applyTransform(o, it);
  if (collides(it, o)){ Object.assign(it, prev); applyTransform(o, it); undoStack.pop(); updUR(); toast('Contro la parete c\'è già un altro mobile'); return; }
  updateSelBox(); commit(); renderProps(true); toast('Appoggiato alla parete');
}
function dropDown(){ edit((it) => { const o = objs.get(it.u); it.y = surfaceBelow(it, o, it.x, it.z, Math.max(it.y, .01) + .001 > 0 ? it.y + .001 : 50); }); }

/* =========================================================
   TELECAMERA
   ========================================================= */
const fp = { yaw: 0, pitch: 0, pos: new THREE.Vector3(), keys: new Set() };
let camAnim = null;
function animateCam(pos, target, ms = 650){
  camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), ms };
}
function setCam(m){
  if (m === 'pianta'){ openPlan(house); return; }
  if (m === 'casa'){ showHouse(); return; }
  if (camMode === 'casa') hideHouse();
  const prev = camMode; camMode = m;
  document.querySelectorAll('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cam === m)));
  $('fpPad').hidden = m !== 'persona';
  const s = Math.max(room.w, room.d), cy = room.kind === 'interno' ? room.h * .45 : 1;
  if (m === 'persona'){
    controls.enabled = false; const px = room.kind === 'interno' ? room.w / 2 - .45 : room.w / 2 - .3, pz = room.kind === 'interno' ? room.d / 2 - .45 : room.d / 2 - .3; fp.pos.set(px, 1.6, pz); fp.yaw = Math.atan2(px, pz); fp.pitch = -.15;
    select(null); setHelp('Trascina per guardarti intorno. Usa le frecce per camminare.');
    return;
  }
  controls.enabled = true;
  if (prev === 'persona'){ camera.up.set(0, 1, 0); }
  const T = new THREE.Vector3(0, cy, 0);
  if (m === 'libera') animateCam(new THREE.Vector3(s * .85, s * .8 + 1, s * 1.05), T);
  if (m === 'alto') animateCam(new THREE.Vector3(0, s * 1.55 + 2, .01), new THREE.Vector3(0, 0, 0));
  if (m === 'fronte') animateCam(new THREE.Vector3(0, room.kind === 'interno' ? room.h * .62 : 1.8, room.d / 2 + s * .95 + .5), T);
  if (m === 'lato') animateCam(new THREE.Vector3(room.w / 2 + s * .95 + .5, room.kind === 'interno' ? room.h * .62 : 1.8, 0), T);
  setHelp(defaultHelp());
}
function zoom(f){
  if (camMode === 'persona'){ const dir = new THREE.Vector3(Math.sin(fp.yaw) * -1, 0, -Math.cos(fp.yaw)); fp.pos.addScaledVector(dir, f < 1 ? .4 : -.4); clampFP(); return; }
  const off = camera.position.clone().sub(controls.target);
  const len = Math.max(controls.minDistance, Math.min(controls.maxDistance, off.length() * f));
  animateCam(controls.target.clone().add(off.setLength(len)), controls.target.clone(), 250);
}
function clampFP(){ const m = room.kind === 'interno' ? .25 : -5; fp.pos.x = Math.max(-room.w / 2 + m, Math.min(room.w / 2 - m, fp.pos.x)); fp.pos.z = Math.max(-room.d / 2 + m, Math.min(room.d / 2 - m, fp.pos.z)); }
const mvHeld = new Set();
document.querySelectorAll('[data-mv]').forEach((b) => {
  const on = (e) => { e.preventDefault(); mvHeld.add(b.dataset.mv); }, off = () => mvHeld.delete(b.dataset.mv);
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});

/* ---------- vista di tutta la casa ---------- */
function showHouse(){
  camMode = 'casa'; select(null); selectSurface(null);
  document.querySelectorAll('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cam === 'casa')));
  $('fpPad').hidden = true;
  roomG.visible = false; itemsG.visible = false; grid.visible = false;
  disposeGroup(houseG);
  let x = 0; const gap = .6; const total = house.rooms.reduce((a, r) => a + r.w + gap, -gap);
  x = -total / 2;
  let maxD = 0;
  for (const r of house.rooms){
    const off = new THREE.Vector3(x + r.w / 2, 0, 0);
    const g = buildRoom(r, houseG, off, true);
    for (const it of r.items){ const o = buildObject(it); if (o) g.add(o); }
    g.traverse((o) => { if (o.isMesh && o.userData.surface === 'ceil') o.visible = false; });
    x += r.w + gap; maxD = Math.max(maxD, r.d);
  }
  houseG.visible = true; controls.enabled = true;
  const s = Math.max(total, maxD);
  animateCam(new THREE.Vector3(0, s * 1.2 + 3, s * .45 + 1), new THREE.Vector3(0, 0, 0));
  $('badge').textContent = `${house.name.toUpperCase()} · ${house.rooms.length} ${house.rooms.length === 1 ? 'STANZA' : 'STANZE'}`; $('badge').hidden = false;
  setHelp('Vista di tutta la casa. Scegli un\'altra vista per tornare a modificare la stanza.');
}
function hideHouse(){ disposeGroup(houseG); houseG.visible = false; roomG.visible = true; itemsG.visible = true; grid.visible = mode === 'progettazione'; $('badge').hidden = !showBefore; }

/* ---------- ciclo di disegno ---------- */
const clock = new THREE.Clock();
const camN = new THREE.Vector3();
function loop(){
  requestAnimationFrame(loop);
  if ($('editor').hidden){ if (viewer.on) viewer.render(); return; }
  const dt = Math.min(.05, clock.getDelta());
  if (planOn){ planFrame(dt); return; }
  if (camAnim){
    const k = Math.min(1, (performance.now() - camAnim.s) / camAnim.ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(camAnim.p0, camAnim.p1, e); controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
    if (k >= 1) camAnim = null;
  }
  if (camMode === 'persona'){
    const sp = 1.6 * dt, f = new THREE.Vector3(-Math.sin(fp.yaw), 0, -Math.cos(fp.yaw)), r = new THREE.Vector3(Math.cos(fp.yaw), 0, -Math.sin(fp.yaw));
    if (mvHeld.has('av') || fp.keys.has('w') || fp.keys.has('arrowup')) fp.pos.addScaledVector(f, sp);
    if (mvHeld.has('in') || fp.keys.has('s') || fp.keys.has('arrowdown')) fp.pos.addScaledVector(f, -sp);
    if (mvHeld.has('dx') || fp.keys.has('d') || fp.keys.has('arrowright')) fp.pos.addScaledVector(r, sp);
    if (mvHeld.has('sx') || fp.keys.has('a') || fp.keys.has('arrowleft')) fp.pos.addScaledVector(r, -sp);
    clampFP();
    camera.position.copy(fp.pos);
    camera.rotation.set(fp.pitch, fp.yaw, 0, 'YXZ');
  } else controls.update();
  // pareti: nascondi quelle tra te e la stanza (vista "casa delle bambole")
  if (camMode !== 'casa' && room){
    const inside = camMode === 'persona';
    walls.forEach((w, i) => {
      if (!w) return;
      camN.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), WALL_RY[i]);
      const inner = new THREE.Vector3(i === 1 ? room.w / 2 : i === 3 ? -room.w / 2 : 0, 0, i === 0 ? -room.d / 2 : i === 2 ? room.d / 2 : 0);
      const vis = inside || camera.position.clone().sub(inner).dot(camN) > 0 || room.kind === 'terrazza';
      w.visible = vis; if (w.userData.base) w.userData.base.visible = vis;
    });
    if (ceilMesh) ceilMesh.visible = inside || camera.position.y < room.h;
    const list = showBefore && room.before ? room.before.items : room.items;
    for (const it of list){ const o = objs.get(it.u); if (!o) continue; if (IT[it.t] && IT[it.t].mount === 'wall' && it.wall !== null && walls[it.wall]) o.visible = walls[it.wall].visible; if (IT[it.t] && IT[it.t].mount === 'ceiling') o.visible = inside || camera.position.y > 0; }
    if (selBox.visible && drag) updateSelBox();
  }
  renderer.render(scene, camera);
}

/* =========================================================
   INTERFACCIA: CATALOGO
   ========================================================= */
let cat = 'salotto', query = '';
const thumbs = new Map();
const mini = { r: null, scene: null, cam: null };
function initMini(){
  if (mini.r) return;
  mini.r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  mini.r.setPixelRatio(1); mini.r.setSize(200, 200, false);
  mini.r.outputColorSpace = THREE.SRGBColorSpace; mini.r.toneMapping = THREE.ACESFilmicToneMapping;
  mini.scene = new THREE.Scene(); mini.scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const dl = new THREE.DirectionalLight('#ffffff', 2.2); dl.position.set(2, 4, 3); mini.scene.add(dl, new THREE.HemisphereLight('#fff', '#999', 1));
  mini.cam = new THREE.PerspectiveCamera(30, 1, .01, 100);
}
function frameObject(o, cam, yaw = -.6, tilt = .38){
  const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const R = Math.max(s.x, s.y, s.z) * .5 + .02, dist = R / Math.sin(cam.fov * DEG / 2) * 1.05;
  cam.position.set(c.x + Math.sin(yaw) * Math.cos(tilt) * dist, c.y + Math.sin(tilt) * dist, c.z + Math.cos(yaw) * Math.cos(tilt) * dist);
  cam.lookAt(c); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix();
}
function thumbFor(t){
  if (thumbs.has(t)) return thumbs.get(t);
  initMini();
  const it = newItem(t); const o = buildObject(it); if (!o) return '';
  o.traverse((m) => { if (m.isLight) m.intensity = 0; });
  mini.scene.add(o); mini.r.setSize(200, 200, false); mini.cam.aspect = 1;
  frameObject(o, mini.cam, IT[t].mount === 'wall' ? 0 : -.6, IT[t].mount === 'wall' ? .05 : IT[t].mount === 'ceiling' ? -.1 : .38);
  fullEnv(o, () => mini.r.render(mini.scene, mini.cam));
  const url = mini.r.domElement.toDataURL('image/png');
  mini.scene.remove(o);
  thumbs.set(t, url); return url;
}
let thumbQ = [];
function queueThumbs(){
  if (thumbQ.running) return; thumbQ.running = true;
  const step = () => {
    const el = thumbQ.shift();
    if (!el){ thumbQ.running = false; return; }
    if (el.isConnected){ const url = thumbFor(el.dataset.t); const img = document.createElement('img'); img.alt = ''; img.src = url; el.replaceWith(img); }
    if (window.requestIdleCallback) requestIdleCallback(step, { timeout: 200 }); else setTimeout(step, 1);
  };
  step();
}
function catList(){
  const q = query.trim().toLowerCase();
  if (q) return ITEMS.filter((d) => d.n.toLowerCase().includes(q) || d.cat.includes(q));
  if (cat === 'preferiti') return ITEMS.filter((d) => DB.favs.includes(d.id));
  return ITEMS.filter((d) => d.cat === cat);
}
function itemCard(d){
  const fav = DB.favs.includes(d.id), url = thumbs.get(d.id);
  return `<div class="it" role="button" tabindex="0" data-add="${d.id}" aria-label="Aggiungi ${esc(d.n)}">${url ? `<img src="${url}" alt="">` : `<div class="ph" data-t="${d.id}">…</div>`}<b>${esc(d.n)}</b><span>${d.price ? euro(d.price) : 'Importato'}</span>
    <button class="fav" type="button" data-fav="${d.id}" aria-label="${fav ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}">${fav ? '♥' : '♡'}</button><button class="info" type="button" data-info="${d.id}" aria-label="Prova ${esc(d.n)}">i</button></div>`;
}
function renderCatalog(){
  const chips = [['preferiti', 'Preferiti', '♥'], ...CATS, ...(DB.imported.length ? [['importati', 'Importati', '<svg class="i" aria-hidden="true"><use href="#i-box"/></svg>']] : [])];
  $('cChips').innerHTML = chips.map(([id, n, e]) => `<button class="chip" type="button" data-cat="${id}" aria-pressed="${!query && id === cat}">${n}</button>`).join('');
  const list = catList();
  $('cItems').innerHTML = list.length ? list.map(itemCard).join('') : `<p class="note" style="padding:10px">${cat === 'preferiti' && !query ? 'Tocca ♡ su un mobile per aggiungerlo ai preferiti.' : 'Nessun oggetto trovato.'}</p>`;
  thumbQ.push(...$('cItems').querySelectorAll('.ph')); queueThumbs();
}
$('cChips').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; query = ''; $('cSearch').value = ''; renderCatalog(); });
$('cSearch').addEventListener('input', (e) => { query = e.target.value; renderCatalog(); });
$('cItems').addEventListener('click', (e) => {
  const f = e.target.closest('[data-fav]'); if (f){ toggleFav(f.dataset.fav); renderCatalog(); return; }
  const i = e.target.closest('[data-info]'); if (i){ openViewer(i.dataset.info); return; }
  const a = e.target.closest('[data-add]'); if (a && performance.now() - catDragDone > 500){ addFromCatalog(a.dataset.add); }
});
$('cItems').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.add) addFromCatalog(e.target.dataset.add); });
$('cItems').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; const a = e.target.closest('[data-add]'); if (a) catDragStart(e, a.dataset.add); });
function toggleFav(id){ const i = DB.favs.indexOf(id); if (i >= 0) DB.favs.splice(i, 1); else DB.favs.push(id); saveSoon(); toast(i >= 0 ? 'Tolto dai preferiti' : 'Aggiunto ai preferiti ♥'); }

/* ---------- prova un oggetto (anteprima 3D che gira) ---------- */
const viewer = { on: false, o: null, yaw: 0, t: null, drag: null, render(){} };
function openViewer(t, fromHome = false){
  const d = IT[t]; initMini();
  const it = newItem(t);
  openDlg(d.n, `<canvas id="viewer" width="480" height="360" aria-label="Anteprima 3D di ${esc(d.n)}"></canvas>
    <p class="note">${CATS.find((c) => c[0] === d.cat)?.[1] || 'Importato'} · ${d.price ? euro(d.price) : 'gratis'} · trascina per ruotare</p>
    ${d.main && d.main[0] !== 'originale' ? `<div class="grp"><span class="lab">Prova i colori</span><div class="sws" id="vCols">${M.PALETTE.slice(0, 18).map((c) => `<button class="sw" type="button" style="background:${c}" data-c="${c}" aria-label="Colore ${c}"></button>`).join('')}</div></div>` : ''}`,
    [[DB.favs.includes(t) ? '♥ Nei preferiti' : '♡ Preferito', '', () => { toggleFav(t); if (!fromHome) renderCatalog(); return false; }],
     [fromHome ? 'Usa in un progetto' : 'Inserisci nella stanza', 'main', () => { viewer.on = false; if (fromHome){ chooseRoomFor(t, it); } else { addFromCatalog(t); const s = selItem(); if (s && it.m){ s.m = clone(it.m); applyMaterials(objs.get(s.u), s); commit(); if (planOn) buildPlanRoom(room); renderProps(); } } }]]);
  const cv = $('viewer'), ctx = cv.getContext('2d');
  viewer.o = buildObject(it); viewer.o.traverse((m) => { if (m.isLight) m.intensity = 0; }); mini.scene.add(viewer.o);
  viewer.yaw = -.6; viewer.on = true;
  viewer.render = () => {
    if (!cv.isConnected || !$('dlg').open){ viewer.on = false; mini.scene.remove(viewer.o); return; }
    if (!viewer.drag) viewer.yaw += .006;
    mini.r.setSize(480, 360, false); mini.cam.aspect = 480 / 360;
    frameObject(viewer.o, mini.cam, viewer.yaw, d.mount === 'wall' ? .05 : .3);
    fullEnv(viewer.o, () => mini.r.render(mini.scene, mini.cam));
    ctx.clearRect(0, 0, 480, 360); ctx.drawImage(mini.r.domElement, 0, 0);
  };
  cv.addEventListener('pointerdown', (e) => { viewer.drag = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (viewer.drag !== null && viewer.drag !== undefined && viewer.drag !== false){ viewer.yaw -= (e.clientX - viewer.drag) * .01; viewer.drag = e.clientX; } });
  cv.addEventListener('pointerup', () => (viewer.drag = null));
  const vc = $('vCols'); if (vc) vc.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; const fin = M.FINISHES.find((f) => f.k === it.m.f && f.color) ? it.m.f : 'laccato'; it.m = { f: fin, c: b.dataset.c }; applyMaterials(viewer.o, it); vc.querySelectorAll('.sw').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  const tick = () => { if (!viewer.on) return; viewer.render(); requestAnimationFrame(tick); };
  if (!$('editor').hidden) requestAnimationFrame(tick); else requestAnimationFrame(tick);
}

/* =========================================================
   INTERFACCIA: PANNELLO PROPRIETÀ
   ========================================================= */
let ptab = 'muovi';
function renderProps(keepScroll){
  if (planOn) return renderPlanProps($('props'));
  const p = $('props'), wide = window.innerWidth >= 1000;
  const st = p.scrollTop;
  p.classList.remove('mini'); p.style.bottom = ''; p.style.borderRadius = '';
  if (sel){ renderItemProps(p); }
  else if (selSurface){ renderSurfaceProps(p); }
  else if (wide){ renderRoomSummary(p); }
  else { p.hidden = true; return; }
  p.hidden = false;
  if (keepScroll) p.scrollTop = st;
}
function finGrid(list, current, attr){
  return `<div class="fins">${list.map((f) => `<button class="fin" type="button" ${attr}="${esc(f.k)}" aria-pressed="${f.k === current}"><img src="${M.finishSwatchURL(f.k, f.color ? '#b9b2a8' : null)}" alt=""><span>${esc(f.n)}</span></button>`).join('')}</div>`;
}
function renderItemProps(p){
  const it = selItem(); if (!it){ sel = null; renderProps(); return; }
  const d = IT[it.t], o = objs.get(it.u), b = objBox(o), sz = b.getSize(new THREE.Vector3());
  const fin = it.m ? M.FINISHES.find((f) => f.k === it.m.f) : null;
  const tabs = [['muovi', 'Sposta'], ['misure', 'Misure'], ['colore', 'Colore'], ['azioni', 'Azioni']];
  let body = '';
  if (ptab === 'muovi'){
    body = `<div class="grp"><label>Rotazione · ${Math.round(((it.ry / DEG) % 360 + 360) % 360)}°</label>
      <div class="row"><button class="btn" data-a="r-90">↺ 90°</button><button class="btn" data-a="r-15">↺ 15°</button><button class="btn" data-a="r15">↻ 15°</button><button class="btn" data-a="r90">↻ 90°</button></div>
      ${d.mount === 'floor' ? `<input type="range" min="0" max="355" step="5" value="${Math.round(((it.ry / DEG) % 360 + 360) % 360)}" data-r="rot" aria-label="Rotazione">` : `<p class="note">${d.mount === 'wall' ? 'Gli oggetti a parete si girano da soli verso la stanza.' : ''}</p>`}</div>
      <div class="grp"><label>Altezza da terra · ${Math.round(it.y * 100)} cm</label>
      <div class="row"><button class="btn" data-a="up"><svg class="i" aria-hidden="true"><use href="#i-up"/></svg> Alza</button><button class="btn" data-a="down"><svg class="i" aria-hidden="true"><use href="#i-dn"/></svg> Abbassa</button>${d.mount === 'floor' ? '<button class="btn" data-a="drop">⤓ Appoggia</button>' : ''}</div></div>
      ${d.mount === 'floor' ? `<div class="grp"><label>Posizione</label><div class="row"><button class="btn" data-a="wall"><svg class="i" aria-hidden="true"><use href="#i-brick"/></svg> Alla parete</button><button class="btn" data-a="center">⊕ Al centro</button></div>
      <div class="row"><button class="btn" data-a="mx-">←</button><button class="btn" data-a="mz-">↑</button><button class="btn" data-a="mz+">↓</button><button class="btn" data-a="mx+">→</button></div>
      <p class="note">Puoi anche trascinarlo col dito. Sopra tavoli, comodini e mensole si appoggia da solo.</p></div>` : `<p class="note">Trascinalo col dito lungo le pareti${d.mount === 'ceiling' ? ' (resta attaccato al soffitto)' : ''}.</p>`}`;
  } else if (ptab === 'misure'){
    const base = { x: sz.x / (it.sx || 1), y: sz.y / (it.sy || 1), z: sz.z / (it.sz || 1) };
    const sl = (k, n, val, cm) => `<div class="slider"><span>${n}</span><input type="range" min="40" max="250" step="1" value="${Math.round(val * 100)}" data-r="${k}" aria-label="${n}"><output>${cm} cm</output></div>`;
    body = `<div class="grp"><label>Dimensioni reali</label>
      ${sl('sx', 'Larghezza', it.sx, Math.round(sz.x * 100))}${sl('sz', 'Profondità', it.sz, Math.round(sz.z * 100))}${sl('sy', 'Altezza', it.sy, Math.round(sz.y * 100))}
      ${sl('all', 'Tutto', (it.sx + it.sy + it.sz) / 3, Math.round(Math.max(sz.x, sz.z) * 100))}
      <div class="row"><button class="btn" data-a="reset">↺ Misure originali</button></div>
      <p class="note">Misure originali: ${Math.round(base.x * 100)} × ${Math.round(base.z * 100)} × ${Math.round(base.y * 100)} cm (L × P × A).</p></div>`;
  } else if (ptab === 'colore'){
    if (d.imported){
      body = `<div class="grp"><label>Materiale</label>${finGrid([{ k: 'originale', n: 'Originale' }, ...M.FINISHES], it.m ? it.m.f : 'originale', 'data-f')}</div>`;
    } else if (it.m){
      body = `<div class="grp"><label>Finitura principale</label>${finGrid(M.FINISHES.filter((f) => !['ceramica'].includes(f.k)), it.m.f, 'data-f')}</div>`;
    }
    if (it.m && fin && fin.color) body += `<div class="grp"><label>Colore</label><div class="sws">${M.PALETTE.map((c) => `<button class="sw" type="button" style="background:${c}" data-c="${c}" aria-pressed="${it.m.c === c}" aria-label="Colore ${c}"></button>`).join('')}<label class="sw" style="display:grid;place-items:center;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer" title="Altro colore"><input type="color" value="${it.m.c || '#888888'}" data-cc style="opacity:0;width:1px;height:1px;position:absolute"></label></div></div>`;
    if (hasSlot(o, 'sec')) body += `<div class="grp"><label>Struttura e gambe</label>${finGrid(M.SEC_FINISHES, it.s2 || d.sec, 'data-s2')}</div>`;
    if (!body) body = '<p class="note">Questo oggetto ha colori fissi.</p>';
  } else {
    body = `<div class="grp"><div class="row"><button class="btn" data-a="dup">⧉ Duplica</button><button class="btn" data-a="copy"><svg class="i" aria-hidden="true"><use href="#i-clipboard"/></svg> Copia</button><button class="btn" data-a="paste"><svg class="i" aria-hidden="true"><use href="#i-download"/></svg> Incolla</button></div>
      <div class="row"><button class="btn" data-a="fav">${DB.favs.includes(d.id) ? '♥ Nei preferiti' : '♡ Preferito'}</button><button class="btn danger" data-a="del"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg> Elimina</button></div>
      <p class="note">${esc(d.n)} · ${d.price ? euro(d.price) : 'modello importato'}</p></div>`;
  }
  p.innerHTML = `<div class="ph1"><h3>${esc(d.n)}</h3><small>${Math.round(sz.x * 100)}×${Math.round(sz.z * 100)}×${Math.round(sz.y * 100)} cm</small><button class="btn icon ghost" data-a="close" aria-label="Chiudi">✕</button></div>
    <div class="ptabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" data-pt="${k}" aria-selected="${k === ptab}">${n}</button>`).join('')}</div>${body}`;
}
function hasSlot(o, s){ let f = false; o.traverse((m) => { if (m.userData.slot === s) f = true; }); return f; }
function renderSurfaceProps(p){
  const { kind, idx } = selSurface;
  const s = kind === 'floor' ? room.floor : kind === 'ceil' ? room.ceil : room.walls[idx];
  const list = kind === 'floor' ? M.FLOORS : kind === 'ceil' ? M.CEILS : (room.kind === 'terrazza' ? [{ k: 'vetro', n: 'Vetro' }, ...M.WALLS] : M.WALLS);
  const def = list.find((x) => x.k === s.k) || {};
  const names = { floor: 'Pavimento', ceil: 'Soffitto', wall: ['Parete di fondo', 'Parete destra', 'Parete davanti', 'Parete sinistra'][idx] };
  p.innerHTML = `<div class="ph1"><h3>${kind === 'wall' ? names.wall : names[kind]}</h3><button class="btn icon ghost" data-a="close" aria-label="Chiudi">✕</button></div>
    <div class="grp"><label>Materiale</label><div class="fins">${list.map((f) => `<button class="fin" type="button" data-sf="${esc(f.k)}" aria-pressed="${f.k === s.k}"><img src="${f.k === 'vetro' ? M.finishSwatchURL('vetro') : M.swatchURL(kind === 'ceil' ? 'ceil' : kind, f.k, f.color ? (s.c || '#d9d4cc') : null)}" alt=""><span>${esc(f.n)}</span></button>`).join('')}</div></div>
    ${def.color ? `<div class="grp"><label>Colore</label><div class="sws">${M.PALETTE.map((c) => `<button class="sw" type="button" style="background:${c}" data-sc="${c}" aria-pressed="${s.c === c}" aria-label="Colore ${c}"></button>`).join('')}</div></div>` : ''}
    ${kind === 'wall' ? `<div class="row"><button class="btn" data-a="allwalls">Applica a tutte le pareti</button></div>` : ''}
    <p class="note">Tocca un'altra parete o il pavimento per cambiarli. Le misure della stanza sono nel menu ⋯.</p>`;
}
function renderRoomSummary(p){
  const n = room.items.length;
  p.innerHTML = `<div class="ph1"><h3>${esc(room.name)}</h3></div>
    <div class="grp"><label>Stanza</label><p class="note">${room.w.toFixed(1).replace('.', ',')} × ${room.d.toFixed(1).replace('.', ',')} m${room.kind === 'interno' ? `, alta ${room.h.toFixed(1).replace('.', ',')} m` : ''} · ${n} oggetti · ${$('eCost').textContent}</p>
    <div class="row"><button class="btn" data-a="room"><svg class="i" aria-hidden="true"><use href="#i-ruler"/></svg> Misure e superfici</button><button class="btn" data-a="light"><svg class="i" aria-hidden="true"><use href="#i-bulb"/></svg> Luci</button></div></div>
    <div class="grp"><label>Come si usa</label><p class="note">Tocca un mobile del catalogo per metterlo nella stanza, oppure trascinalo dentro. Tocca un mobile nella stanza per spostarlo, ruotarlo, cambiare misure e colori. Tocca una parete o il pavimento per cambiarne il materiale. Trascina lo sfondo per ruotare la vista, usa due dita o la rotellina per lo zoom.</p></div>`;
}
$('props').addEventListener('click', (e) => {
  const t = e.target.closest('[data-pt]'); if (t){ ptab = t.dataset.pt; renderProps(); return; }
  const f = e.target.closest('[data-f]'); if (f){ const fin = f.dataset.f; edit((it) => { const keepC = it.m && it.m.c; it.m = { f: fin, c: (M.FINISHES.find((x) => x.k === fin) || {}).color ? (keepC || '#9aa0a6') : null }; }, true); return; }
  const c = e.target.closest('[data-c]'); if (c){ edit((it) => { it.m.c = c.dataset.c; }, true); return; }
  const s2 = e.target.closest('[data-s2]'); if (s2){ edit((it) => { it.s2 = s2.dataset.s2; }, true); return; }
  const sf = e.target.closest('[data-sf]'); if (sf){ setSurface({ k: sf.dataset.sf }); return; }
  const sc = e.target.closest('[data-sc]'); if (sc){ setSurface({ c: sc.dataset.sc }); return; }
  const a = e.target.closest('[data-a]'); if (!a) return;
  const k = a.dataset.a, step = .05;
  if (k === 'close'){ select(null); selectSurface(null); return; }
  if (k === 'room'){ roomDialog(); return; }
  if (k === 'light'){ lightDialog(); return; }
  if (k === 'allwalls'){ mark(); const s = room.walls[selSurface.idx]; room.walls = room.walls.map(() => clone(s)); buildRoom(room); applyLighting(); commit(); selectSurface(selSurface.kind, selSurface.idx); toast('Applicato a tutte le pareti'); return; }
  if (/^r-?\d+$/.test(k)){ if (IT[selItem().t].mount !== 'floor'){ toast('Gli oggetti a parete seguono la parete'); return; } return edit((it) => { it.ry += parseInt(k.slice(1), 10) * DEG; }); }
  if (k === 'up') return edit((it) => { it.y = +(it.y + step).toFixed(3); });
  if (k === 'down') return edit((it) => { const d = IT[it.t]; const o = objs.get(it.u); const min = d.mount === 'floor' ? surfaceBelow(it, o, it.x, it.z, it.y + .001) : 0; it.y = Math.max(min, +(it.y - step).toFixed(3)); });
  if (k === 'drop') return dropDown();
  if (k === 'wall') return snapToWall();
  if (k === 'center') return edit((it) => { it.x = 0; it.z = 0; it.y = 0; });
  if (k === 'mx-') return edit((it) => { it.x -= .1; }); if (k === 'mx+') return edit((it) => { it.x += .1; });
  if (k === 'mz-') return edit((it) => { it.z -= .1; }); if (k === 'mz+') return edit((it) => { it.z += .1; });
  if (k === 'reset') return edit((it) => { it.sx = it.sy = it.sz = 1; });
  if (k === 'dup') return duplicateSel();
  if (k === 'copy'){ clipboard = clone(selItem()); toast('Copiato: ora puoi incollarlo anche in un\'altra stanza'); return; }
  if (k === 'paste') return pasteItem();
  if (k === 'fav'){ toggleFav(selItem().t); renderProps(); renderCatalog(); return; }
  if (k === 'del') return deleteSel();
});
let sliderPrev = null;
$('props').addEventListener('input', (e) => {
  const r = e.target.dataset.r; const cc = e.target.dataset.cc !== undefined;
  const it = selItem(); if (!it) return; const o = objs.get(it.u);
  if (cc){ it.m.c = e.target.value; applyMaterials(o, it); return; }
  if (!r) return;
  if (!sliderPrev){ sliderPrev = clone(it); mark(); }
  const v = +e.target.value;
  if (r === 'rot') it.ry = v * DEG;
  else if (r === 'all'){ const f = v / 100; it.sx = it.sy = it.sz = f; }
  else it[r] = v / 100;
  applyTransform(o, it);
  if (IT[it.t].mount === 'wall' && it.wall !== null && room.kind !== 'esterno'){ clampWall(it); applyTransform(o, it); }
  updateSelBox();
  const out = e.target.parentElement.querySelector('output'); if (out){ const s = objBox(o).getSize(new THREE.Vector3()); out.textContent = Math.round((r === 'sx' ? s.x : r === 'sz' ? s.z : r === 'sy' ? s.y : Math.max(s.x, s.z)) * 100) + ' cm'; }
});
$('props').addEventListener('change', (e) => {
  const it = selItem(); if (!it) return; const o = objs.get(it.u);
  if (e.target.dataset.cc !== undefined){ mark(); commit(); renderProps(true); return; }
  if (!sliderPrev) return;
  if (IT[it.t].mount === 'floor'){ clampInside(it, o); if (collides(it, o)){ Object.assign(it, sliderPrev); applyTransform(o, it); undoStack.pop(); updUR(); toast('Non c\'è spazio: tocca un altro mobile'); } }
  sliderPrev = null; updateSelBox(); commit(); renderProps(true);
});
function setSurface(patch){
  const { kind, idx } = selSurface; mark();
  const s = kind === 'floor' ? room.floor : kind === 'ceil' ? room.ceil : room.walls[idx];
  Object.assign(s, patch);
  if (patch.k){ const list = kind === 'floor' ? M.FLOORS : kind === 'ceil' ? M.CEILS : M.WALLS; const def = list.find((x) => x.k === patch.k); if (def && def.color && !s.c) s.c = '#e9e4dc'; }
  buildRoom(room); applyLighting(); commit(); selectSurface(kind, idx);
}

/* =========================================================
   FINESTRE DI DIALOGO
   ========================================================= */
const dlg = $('dlg');
function openDlg(title, body, buttons = [], onClose){
  $('dlgT').textContent = title; $('dlgB').innerHTML = body;
  const f = $('dlgF'); f.innerHTML = ''; f.hidden = !buttons.length;
  for (const [t, cls, fn] of buttons){ const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.textContent = t; b.onclick = () => { const r = fn ? fn() : undefined; if (r !== false) dlg.close(); else if (fn && /Preferit/.test(t)) b.textContent = b.textContent.startsWith('♥') ? '♡ Preferito' : '♥ Nei preferiti'; }; f.appendChild(b); }
  dlg.onclose = () => { viewer.on = false; if (onClose) onClose(); };
  if (!dlg.open) dlg.showModal();
}
$('dlgX').onclick = () => dlg.close();
function roomDialog(){
  const r = room;
  const sl = (k, n, min, max, st, v) => `<div class="slider"><span>${n}</span><input type="range" min="${min}" max="${max}" step="${st}" value="${v}" data-rd="${k}" aria-label="${n}"><output>${(+v).toFixed(1).replace('.', ',')} m</output></div>`;
  openDlg('Stanza: misure e superfici', `<div class="field"><label class="lab" for="rn">Nome della stanza</label><input type="text" id="rn" value="${esc(r.name)}" maxlength="40"></div>
    <div class="grp"><span class="lab">Misure</span>${sl('w', 'Larghezza', 2, 14, .1, r.w)}${sl('d', 'Profondità', 2, 14, .1, r.d)}${r.kind === 'interno' ? sl('h', 'Altezza', 2.3, 4.5, .05, r.h) : ''}</div>
    <div class="grp"><span class="lab">Tipo</span><div class="pick">${[['interno', 'Stanza', '<svg class="i" aria-hidden="true"><use href="#i-home"/></svg>'], ['terrazza', 'Terrazza', '<svg class="i" aria-hidden="true"><use href="#i-terrace"/></svg>'], ['esterno', 'Giardino', '<svg class="i" aria-hidden="true"><use href="#i-tree"/></svg>']].map(([k, n, e]) => `<button type="button" data-kind="${k}" aria-pressed="${r.kind === k}"><span>${e}</span>${n}</button>`).join('')}</div></div>
    <div class="grp"><span class="lab">Superfici</span><div class="row"><button class="btn" type="button" data-sfx="floor">Pavimento</button>${r.kind === 'interno' ? '<button class="btn" type="button" data-sfx="ceil">Soffitto</button>' : ''}${r.kind !== 'esterno' ? '<button class="btn" type="button" data-sfx="wall">Pareti</button>' : ''}</div></div>`,
    [['Fatto', 'main', () => { const v = $('rn').value.trim(); if (v && v !== r.name){ r.name = v; commit(); updTitle(); } }]]);
  let snapDone = false;
  const B = $('dlgB');
  B.addEventListener('input', (e) => {
    const k = e.target.dataset.rd; if (!k) return;
    if (!snapDone){ mark(); snapDone = true; }
    r[k] = +e.target.value; e.target.parentElement.querySelector('output').textContent = r[k].toFixed(1).replace('.', ',') + ' m';
    resizeRoom();
  });
  B.addEventListener('click', (e) => {
    const kb = e.target.closest('[data-kind]'); if (kb){ mark(); r.kind = kb.dataset.kind; if (r.kind === 'esterno' && r.floor.k !== 'erba') r.floor = { k: 'erba' }; if (r.kind === 'terrazza') r.walls = r.walls.map(() => ({ k: 'vetro' })); if (r.kind === 'interno' && r.walls[0].k === 'vetro') r.walls = r.walls.map(() => ({ k: 'pittura', c: '#f1eee8' })); resizeRoom(); applyLighting(); roomDialog(); return; }
    const sfx = e.target.closest('[data-sfx]'); if (sfx){ dlg.close(); selectSurface(sfx.dataset.sfx, sfx.dataset.sfx === 'wall' ? visibleWallFacingCamera() : undefined); }
  });
}
function resizeRoom(){
  buildRoom(room);
  for (const it of room.items){
    const o = objs.get(it.u); if (!o) continue; const d = IT[it.t];
    if (d.mount === 'wall' && it.wall !== null && room.kind !== 'esterno'){ const along = it.wall === 0 ? it.x : it.wall === 2 ? -it.x : it.z; placeOnWall(it, room, along); clampWall(it); }
    if (d.mount === 'ceiling') it.y = room.kind === 'interno' ? room.h : 3;
    applyTransform(o, it); if (d.mount === 'floor') clampInside(it, o);
  }
  applyLighting(); updateSelBox(); commit();
}
function lightDialog(){
  const L = room.light;
  const sl = (k, n, min, max, st) => `<div class="slider"><span>${n}</span><input type="range" min="${min}" max="${max}" step="${st}" value="${L[k]}" data-ld="${k}" aria-label="${n}"><output>${Math.round(L[k] * 100)}%</output></div>`;
  openDlg('Illuminazione', `<div class="pick">${[['giorno', 'Giorno', '<svg class="i" aria-hidden="true"><use href="#i-sun"/></svg>'], ['notte', 'Notte', '<svg class="i" aria-hidden="true"><use href="#i-moon"/></svg>']].map(([k, n, e]) => `<button type="button" data-lm="${k}" aria-pressed="${L.mode === k}"><span>${e}</span>${n}</button>`).join('')}</div>
    ${sl('sun', 'Sole', .2, 2, .05)}${sl('warm', 'Luce calda', 0, 1, .05)}${sl('exposure', 'Esposizione', .4, 1.8, .05)}
    <label class="setrow"><div><b>Lampade accese di notte</b><span>Lampadari, abat-jour, camino e lampioni fanno luce</span></div><input type="checkbox" id="lamps" ${L.lamps ? 'checked' : ''}></label>`, [['Fatto', 'main']]);
  let snapDone = false;
  $('dlgB').addEventListener('input', (e) => {
    const k = e.target.dataset.ld; if (!snapDone){ mark(); snapDone = true; }
    if (k){ L[k] = +e.target.value; e.target.parentElement.querySelector('output').textContent = Math.round(L[k] * 100) + '%'; }
    if (e.target.id === 'lamps') L.lamps = e.target.checked;
    applyLighting(); commit();
  });
  $('dlgB').addEventListener('click', (e) => { const b = e.target.closest('[data-lm]'); if (!b) return; mark(); L.mode = b.dataset.lm; applyLighting(); commit(); $('dlgB').querySelectorAll('[data-lm]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
}
function roomSwitcher(){
  openDlg('Stanze di ' + house.name, `<div class="pick">${house.rooms.map((r) => `<button type="button" data-room="${r.id}" aria-pressed="${r === room}"><span>${r.kind === 'esterno' ? '<svg class="i" aria-hidden="true"><use href="#i-tree"/></svg>' : r.kind === 'terrazza' ? '<svg class="i" aria-hidden="true"><use href="#i-terrace"/></svg>' : '<svg class="i" aria-hidden="true"><use href="#i-door"/></svg>'}</span>${esc(r.name)}</button>`).join('')}<button type="button" data-room="__new"><span><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></span>Nuova stanza</button></div>
    <div class="field"><label class="lab" for="hn">Nome della casa</label><input type="text" id="hn" value="${esc(house.name)}" maxlength="40"></div>`,
    [['Fatto', 'main', () => { const v = $('hn').value.trim(); if (v && v !== house.name){ house.name = v; commit(); updTitle(); } }]]);
  $('dlgB').addEventListener('click', (e) => { const b = e.target.closest('[data-room]'); if (!b) return; dlg.close(); if (b.dataset.room === '__new') newRoomDialog(house); else openRoom(house, house.rooms.find((r) => r.id === b.dataset.room)); });
}
function newRoomDialog(h, after){
  let choice = 'vuota';
  openDlg('Nuova stanza', `<div class="pick" id="nrp"><button type="button" data-p="vuota" aria-pressed="true"><span><svg class="i" aria-hidden="true"><use href="#i-square"/></svg></span>Stanza vuota</button><button type="button" data-p="terrazza-vuota"><span><svg class="i" aria-hidden="true"><use href="#i-terrace"/></svg></span>Terrazza vuota</button><button type="button" data-p="giardino-vuoto"><span><svg class="i" aria-hidden="true"><use href="#i-tree"/></svg></span>Giardino vuoto</button>${PRESETS.map((p) => `<button type="button" data-p="${p.id}"><span>${p.img}</span>${esc(p.n)}</button>`).join('')}</div>
    <div class="grp" id="nrsize"><span class="lab">Misure (stanza vuota)</span>
      <div class="slider"><span>Larghezza</span><input type="range" min="2" max="14" step=".1" value="4.5" id="nw"><output>4,5 m</output></div>
      <div class="slider"><span>Profondità</span><input type="range" min="2" max="14" step=".1" value="4" id="nd"><output>4,0 m</output></div>
      <div class="slider"><span>Altezza</span><input type="range" min="2.3" max="4.5" step=".05" value="2.8" id="nh"><output>2,8 m</output></div></div>
    <div class="field"><label class="lab" for="nn">Nome</label><input type="text" id="nn" value="Nuova stanza" maxlength="40"></div>`,
    [['Annulla', ''], ['Crea', 'main', () => {
      let r;
      const nm = $('nn').value.trim() || 'Nuova stanza';
      if (choice === 'vuota') r = newRoom(nm, 'interno', +$('nw').value, +$('nd').value, +$('nh').value);
      else if (choice === 'terrazza-vuota') r = newRoom(nm, 'terrazza', +$('nw').value, +$('nd').value, 1.05);
      else if (choice === 'giardino-vuoto') r = newRoom(nm, 'esterno', Math.max(6, +$('nw').value), Math.max(6, +$('nd').value), 3);
      else { r = roomFromPreset(PRESETS.find((p) => p.id === choice)); r.name = nm; }
      r.before = { items: [], floor: clone(r.floor), walls: clone(r.walls), ceil: clone(r.ceil) };
      if (planOn){ const before = planSnapshot(); placeNewRoom(h, r); h.rooms.push(r); loadQuiet(r); buildPlanRoom(r); planSel = { type: 'room', r }; pushBefore(before); planCommit(); renderProps(); return; }
      h.rooms.push(r); h.upd = Date.now(); saveNow(); openRoom(h, r); if (after) after();
    }]]);
  const B = $('dlgB');
  B.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; choice = b.dataset.p; B.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const p = PRESETS.find((x) => x.id === choice); $('nn').value = p ? p.n : choice === 'vuota' ? 'Nuova stanza' : choice === 'terrazza-vuota' ? 'Terrazza' : 'Giardino'; $('nrsize').hidden = !!p; });
  B.addEventListener('input', (e) => { const o = e.target.parentElement.querySelector('output'); if (o && e.target.type === 'range') o.textContent = (+e.target.value).toFixed(1).replace('.', ',') + ' m'; });
}

/* ---------- prima e dopo ---------- */
function toggleBefore(force){
  const on = force === undefined ? !showBefore : force;
  if (on && !room.before){ toast('Non c\'è ancora una versione "prima" per questa stanza'); return; }
  showBefore = on; select(null); selectSurface(null);
  const save = { floor: room.floor, walls: room.walls, ceil: room.ceil };
  if (on){ buildRoom(Object.assign({}, room, { floor: room.before.floor || room.floor, walls: room.before.walls || room.walls, ceil: room.before.ceil || room.ceil })); }
  else buildRoom(room);
  Object.assign(room, save);
  rebuildItems(); applyLighting();
  $('badge').textContent = 'PRIMA · tocca "Prima e dopo" per tornare'; $('badge').hidden = !on;
  if (on) toast('Questa è la stanza PRIMA delle modifiche');
}

/* ---------- foto ---------- */
async function takePhoto(){
  selBox.visible = false; wallHi.visible = false;
  if (planOn){ const rc = canvas.getBoundingClientRect(); renderer.setScissorTest(false); renderer.setViewport(0, 0, rc.width, rc.height); pcam.aspect = rc.width / rc.height; pcam.updateProjectionMatrix(); renderer.shadowMap.needsUpdate = true; planSetTop(false); renderer.render(scene, pcam); }
  else renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/jpeg', .92);
  updateSelBox(); if (selSurface) selectSurface(selSurface.kind, selSurface.idx, true);
  const rn = planOn ? 'vista' : room.name;
  const name = `${house.name} - ${rn}`.replace(/[^\w\- àèéìòù]+/gi, '').trim() || 'stanza';
  openDlg('Foto della stanza', `<img src="${url}" alt="Foto di ${esc(rn)}" style="width:100%;border-radius:12px;display:block"><p class="note">Puoi condividerla o salvarla sul telefono.</p>`,
    [['Condividi', '', () => { sharePhoto(url, name); return false; }], ['Salva', 'main', () => { downloadURL(url, name + '.jpg'); }]]);
}
async function sharePhoto(url, name){
  try { const blob = await (await fetch(url)).blob(); const file = new File([blob], name + '.jpg', { type: 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  downloadURL(url, name + '.jpg');
}
function downloadURL(url, fn){ const a = document.createElement('a'); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); toast('Foto salvata'); }

/* ---------- import GLB ---------- */
$('cImport').onclick = () => $('fileGlb').click();
$('fileGlb').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (f.size > 25 * 1024 * 1024){ toast('Il file è troppo grande (massimo 25 MB)'); return; }
  try {
    const buf = await f.arrayBuffer();
    const imp = { id: 'imp_' + uid(), n: f.name.replace(/\.(glb|gltf)$/i, '').slice(0, 30) || 'Modello', target: 1 };
    const sc = await parseGLB(buf); normalizeImported(sc, imp);
    if (!(await idb.put(imp.id, buf))) toast('Attenzione: il modello resterà solo fino alla chiusura');
    GLTF.set(imp.id, sc); DB.imported.push(imp); registerImported(imp); saveNow();
    cat = 'importati'; renderCatalog(); toast('Modello importato: ' + imp.n);
    if (!$('editor').hidden) insertItem(imp.id);
  } catch (err){ console.error(err); toast('Non riesco a leggere questo file. Usa un modello .glb'); }
});

/* =========================================================
   APRIRE CASE E STANZE
   ========================================================= */
function openRoom(h, r){
  if (planOn) planOff();
  loadedRid = r.id;
  house = h; room = r; sel = null; selSurface = null; showBefore = false; undoStack = []; redoStack = [];
  if (!room.light) room.light = { mode: 'giorno', sun: 1, warm: .5, lamps: true, exposure: 1 };
  $('home').hidden = true; $('editor').hidden = false;
  if (camMode === 'casa') hideHouse();
  camMode = 'libera';
  resize();
  buildRoom(room); rebuildItems();
  if (room._settle){ // appoggia gli oggetti delle stanze pronte sui mobili sotto
    for (const u of room._settle){ const it = room.items.find((i) => i.u === u), o = objs.get(u); if (it && o){ it.y = surfaceBelow(it, o, it.x, it.z); applyTransform(o, it); } }
    delete room._settle;
  }
  applyLighting(); updTitle(); updateCost(); updUR(); renderCatalog(); renderProps();
  buildContext();
  $('badge').hidden = true;
  setCam('libera');
  const s = Math.max(room.w, room.d); camera.position.set(s * .85, s * .8 + 1, s * 1.05); controls.target.set(0, room.kind === 'interno' ? room.h * .45 : 1, 0); camAnim = null;
  saveSoon();
}
function updTitle(){ $('eRoom').textContent = room.name + ' ▾'; $('eHouse').textContent = house.name + ' · ' + house.rooms.length + (house.rooms.length === 1 ? ' stanza' : ' stanze'); }
function defaultHelp(){ return window.matchMedia('(pointer:coarse)').matches ? 'Un dito: ruota · Due dita: zoom e sposta · Tocca un mobile per modificarlo' : 'Trascina: ruota · Rotellina: zoom · Tasto destro: sposta · Tocca un mobile per modificarlo'; }
function setHelp(t){ const h = $('help'); h.textContent = t; h.hidden = false; clearTimeout(setHelp.t); setHelp.t = setTimeout(() => (h.hidden = true), 6000); }
function goHome(){
  if (planOn) planOff();
  disposeGroup(ctxG);
  saveNow(); select(null); selectSurface(null);
  if (camMode === 'casa') hideHouse();
  $('editor').hidden = true; $('home').hidden = false; $('eMenu').hidden = true;
  renderHome(hview);
}

/* ---------- barra in alto e menu ---------- */
$('eBack').onclick = goHome;
$('eTitle').onclick = roomSwitcher;
$('eUndo').onclick = () => (planOn ? planUndoFn() : undo()); $('eRedo').onclick = () => (planOn ? planRedoFn() : redo());
$('eSave').onclick = () => { if (saveNow()){ $('eSave').innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>'; toast('Progetto salvato'); setTimeout(() => ($('eSave').innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-save"/></svg>'), 1500); } };
$('eMenuBtn').onclick = (e) => { e.stopPropagation(); $('eMenu').hidden = !$('eMenu').hidden; };
document.addEventListener('click', (e) => { if (!e.target.closest('#eMenu') && e.target.id !== 'eMenuBtn') $('eMenu').hidden = true; });
$('eMenu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]'); if (!b) return; $('eMenu').hidden = true;
  const m = b.dataset.m;
  if (m === 'stanza') roomDialog();
  if (m === 'luce') lightDialog();
  if (m === 'nuovastanza') newRoomDialog(house);
  if (m === 'foto') takePhoto();
  if (m === 'primadopo') toggleBefore();
  if (m === 'salvaprima'){ room.before = clone({ items: room.items, floor: room.floor, walls: room.walls, ceil: room.ceil }); commit(); toast('Fatto: questa versione ora è il "prima"'); }
  if (m === 'incolla') pasteItem();
  if (m === 'eliminastanza'){
    openDlg('Eliminare la stanza?', `<p>La stanza <b>${esc(room.name)}</b> e tutti i suoi mobili verranno cancellati.</p>`, [['Annulla', ''], ['Elimina', 'danger', () => {
      house.rooms = house.rooms.filter((r) => r !== room); if (!house.rooms.length){ DB.houses = DB.houses.filter((h) => h !== house); saveNow(); goHome(); return; }
      saveNow(); openRoom(house, house.rooms[0]); }]]);
  }
});
$('bDay').onclick = () => {
  const R = room || PLAN_DEF, m = R.light.mode === 'notte' ? 'giorno' : 'notte';
  if (planOn){ house.rooms.forEach((r) => r.light && (r.light.mode = m)); PLAN_DEF.light.mode = m; applyLighting(); planCommit(); return; }
  mark(); room.light.mode = m; applyLighting(); commit();
};
$('bMode').onclick = () => { mode = mode === 'realistico' ? 'progettazione' : 'realistico'; applyLighting(); toast(mode === 'progettazione' ? 'Modalità progettazione: luce piatta e griglia' : 'Modalità realistica: ombre, riflessi e luci'); };
document.querySelectorAll('[data-cam]').forEach((b) => (b.onclick = () => setCam(b.dataset.cam)));
$('zIn').onclick = () => zoom(.8); $('zOut').onclick = () => zoom(1.25);
document.addEventListener('keydown', (e) => {
  if ($('editor').hidden || e.target.closest('input,select,textarea,dialog')) return;
  if (planOn){
    const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (c && k === 'z'){ e.preventDefault(); e.shiftKey ? planRedoFn() : planUndoFn(); return; }
    if (c && k === 'y'){ e.preventDefault(); planRedoFn(); return; }
    if (c && k === 's'){ e.preventDefault(); $('eSave').click(); return; }
    if (planSwap){ fp.keys.add(k); return; }
    if (k === 'escape'){ planSel = null; setTool('sel'); renderProps(); }
    if ((k === 'delete' || k === 'backspace') && planSel){ e.preventDefault(); planDelete(); }
    return;
  }
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y'){ e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'c' && sel){ clipboard = clone(selItem()); toast('Copiato'); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'v'){ pasteItem(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd' && sel){ e.preventDefault(); duplicateSel(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 's'){ e.preventDefault(); $('eSave').click(); return; }
  if (camMode === 'persona'){ fp.keys.add(k); return; }
  if (!sel) return;
  if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); }
  if (k === 'r') edit((it) => { if (IT[it.t].mount === 'floor') it.ry += (e.shiftKey ? -15 : 15) * DEG; });
  if (k === 'escape') select(null);
  const mv = { arrowleft: [-.05, 0], arrowright: [.05, 0], arrowup: [0, -.05], arrowdown: [0, .05] }[k];
  if (mv && IT[selItem().t].mount === 'floor'){ e.preventDefault(); edit((it) => { it.x += mv[0]; it.z += mv[1]; }); }
});
document.addEventListener('keyup', (e) => fp.keys.delete(e.key.toLowerCase()));
window.addEventListener('resize', () => { if (room && !$('editor').hidden) renderProps(true); });

/* =========================================================
   HOME
   ========================================================= */
let hview = 'case';
async function roomThumb(r){
  // piccola anteprima 3D della stanza
  initMini();
  const g = new THREE.Group();
  const tmp = new THREE.Group(); buildRoom(r, tmp, new THREE.Vector3(), true);
  g.add(tmp);
  for (const it of r.items){ const o = buildObject(it); if (o){ o.traverse((m) => { if (m.isLight) m.intensity = 0; }); g.add(o); } }
  tmp.traverse((o) => { if (o.isMesh && (o.userData.surface === 'ceil' || (o.userData.surface === 'wall' && (o.userData.idx === 2 || o.userData.idx === 1)) || (o.userData.baseboard === 2 || o.userData.baseboard === 1) || o.userData.ground)) o.visible = false; });
  g.traverse((o) => { if (o.userData.u){ const it = r.items.find((i) => i.u === o.userData.u); if (it && (it.wall === 1 || it.wall === 2)) o.visible = false; } });
  mini.scene.add(g); mini.scene.background = new THREE.Color(r.kind === 'interno' ? '#e6ebf2' : '#bfe0fb');
  mini.r.setSize(400, 250, false); mini.cam.aspect = 400 / 250; mini.cam.fov = 40;
  const s = Math.max(r.w, r.d);
  mini.cam.position.set(s * .75, s * .78 + 1, s * .95); mini.cam.lookAt(0, r.kind === 'interno' ? r.h * .3 : .5, 0); mini.cam.near = .1; mini.cam.far = 100; mini.cam.updateProjectionMatrix();
  fullEnv(g, () => mini.r.render(mini.scene, mini.cam));
  const url = mini.r.domElement.toDataURL('image/jpeg', .85);
  mini.scene.remove(g); mini.scene.background = null; mini.cam.fov = 30;
  g.traverse((o) => { if (o.isMesh && o.userData.own){ o.geometry.dispose(); } });
  return url;
}
const roomThumbCache = new Map();
function fillRoomThumbs(root){
  const els = [...root.querySelectorAll('[data-rt]')];
  let i = 0;
  const step = async () => {
    const el = els[i++]; if (!el) return;
    const [hid, rid] = el.dataset.rt.split('|'); const h = DB.houses.find((x) => x.id === hid); const r = h && h.rooms.find((x) => x.id === rid);
    const pr = !r && PRESETS.find((p) => p.id === rid);
    const key = (r ? r.id + (h.upd || 0) : 'preset-' + rid);
    let url = roomThumbCache.get(key);
    if (!url){ url = await roomThumb(r || roomFromPresetForThumb(pr)); roomThumbCache.set(key, url); }
    if (el.isConnected){ el.innerHTML = `<img src="${url}" alt="">`; if (el.id === 'heroImg') el.src = url; }
    setTimeout(step, 10);
  };
  step();
}
function roomFromPresetForThumb(p){
  const r = roomFromPreset(p);
  // appoggia i soprammobili (simulazione rapida)
  const tg = new THREE.Group(); const map = new Map();
  for (const it of r.items){ const o = buildObject(it); if (o){ tg.add(o); map.set(it.u, o); } }
  for (const u of r._settle || []){
    const it = r.items.find((i) => i.u === u); const o = map.get(u);
    const others = []; for (const [k, ob] of map) if (k !== u) ob.traverse((m) => m.isMesh && !m.material.transparent && others.push(m));
    ray.set(new THREE.Vector3(it.x, 20, it.z), new THREE.Vector3(0, -1, 0));
    const h = ray.intersectObjects(others, false).find((x) => x.face.normal.clone().transformDirection(x.object.matrixWorld).y > .7);
    if (h) it.y = h.point.y; if (o) o.position.y = it.y;
  }
  return r;
}
function houseCard(h){
  const r0 = h.rooms[0];
  return `<article class="card"><button class="th" type="button" data-open="${h.id}" aria-label="Apri ${esc(h.name)}" ${r0 ? `data-rt="${h.id}|${r0.id}"` : ''}><svg class="i" aria-hidden="true"><use href="#i-home"/></svg></button>
    <div class="bd"><div class="t"><h4>${esc(h.name)}</h4><p>${h.rooms.length} ${h.rooms.length === 1 ? 'stanza' : 'stanze'} · ${new Date(h.upd).toLocaleDateString('it-IT')}</p></div>
    <button class="btn icon" type="button" data-hren="${h.id}" aria-label="Rinomina"><svg class="i" aria-hidden="true"><use href="#i-pencil"/></svg></button><button class="btn icon" type="button" data-hdup="${h.id}" aria-label="Duplica">⧉</button><button class="btn icon" type="button" data-hdel="${h.id}" aria-label="Elimina"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg></button></div></article>`;
}
function renderHome(v){
  hview = v || hview;
  document.querySelectorAll('.tile').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.go === hview)));
  const el = $('hview');
  const houses = DB.houses.slice().sort((a, b) => b.upd - a.upd);
  if (hview === 'case' || hview === 'nuovo'){
    el.innerHTML = `<h3>Le mie case <span class="sp"></span><button class="btn main" type="button" data-act="newhouse">＋ Nuova casa</button></h3>
      ${houses.length ? `<div class="cards">${houses.map(houseCard).join('')}</div>` : '<div class="empty">Non hai ancora nessuna casa. Creane una nuova!</div>'}`;
  } else if (hview === 'stanze'){
    const all = []; houses.forEach((h) => h.rooms.forEach((r) => all.push([h, r])));
    el.innerHTML = `<h3>Le mie stanze</h3>${all.length ? `<div class="cards">${all.map(([h, r]) => `<article class="card"><button class="th" type="button" data-oroom="${h.id}|${r.id}" data-rt="${h.id}|${r.id}" aria-label="Apri ${esc(r.name)}"><svg class="i" aria-hidden="true"><use href="#i-door"/></svg></button><div class="bd"><div class="t"><h4>${esc(r.name)}</h4><p>${esc(h.name)} · ${r.items.length} oggetti</p></div></div></article>`).join('')}</div>` : '<div class="empty">Nessuna stanza ancora.</div>'}`;
  } else if (hview === 'ispirazioni'){
    el.innerHTML = `<h3>Ispirazioni</h3><p class="note" style="margin:-6px 0 12px">Stanze già arredate da cui partire. Si apriranno in una nuova casa e potrai cambiare tutto.</p>
      <div class="cards">${PRESETS.map((p) => `<article class="card"><button class="th" type="button" data-pre="${p.id}" data-rt="preset|${p.id}" aria-label="Usa ${esc(p.n)}">${p.img}</button><div class="bd"><div class="t"><h4>${esc(p.n)}</h4><p>${p.w} × ${p.d} m · ${p.items.length} oggetti</p></div><button class="btn main" type="button" data-pre="${p.id}">Usa</button></div></article>`).join('')}</div>`;
  } else if (hview === 'catalogo'){
    el.innerHTML = `<h3>Catalogo · ${ITEMS.length} modelli 3D <span class="sp"></span><button class="btn" type="button" data-act="import"><svg class="i" aria-hidden="true"><use href="#i-up"/></svg> Importa GLB</button></h3>
      <input class="search" id="hSearch" type="search" placeholder="Cerca un mobile…" aria-label="Cerca nel catalogo" style="max-width:420px;margin-bottom:12px">
      <div id="hCat">${[['preferiti', 'Preferiti', '♥'], ...CATS, ...(DB.imported.length ? [['importati', 'Importati', '<svg class="i" aria-hidden="true"><use href="#i-box"/></svg>']] : [])].map(([id, n, e]) => {
        const list = id === 'preferiti' ? ITEMS.filter((d) => DB.favs.includes(d.id)) : ITEMS.filter((d) => d.cat === id);
        if (!list.length) return '';
        return `<div class="sec" style="margin-bottom:18px" data-catsec="${id}"><h3 style="font-size:17px">${e} ${n} <span class="note">${list.length}</span></h3><div class="cgrid">${list.map((d) => `<div class="it" style="width:auto" role="button" tabindex="0" data-hinfo="${d.id}" data-name="${esc(d.n.toLowerCase())}">${thumbs.get(d.id) ? `<img src="${thumbs.get(d.id)}" alt="">` : `<div class="ph" data-t="${d.id}">…</div>`}<b>${esc(d.n)}</b><span>${d.price ? euro(d.price) : 'Importato'}</span></div>`).join('')}</div></div>`;
      }).join('')}</div>`;
    thumbQ.push(...el.querySelectorAll('.ph')); queueThumbs();
    $('hSearch').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); el.querySelectorAll('[data-hinfo]').forEach((c) => (c.hidden = q && !c.dataset.name.includes(q))); el.querySelectorAll('[data-catsec]').forEach((s) => (s.hidden = ![...s.querySelectorAll('[data-hinfo]')].some((c) => !c.hidden))); });
  } else if (hview === 'impostazioni'){
    const used = (JSON.stringify(DB).length / 1024).toFixed(0);
    el.innerHTML = `<h3>Impostazioni</h3><div class="card" style="padding:4px 16px">
      <label class="setrow"><div><b>Grafica</b><span>"Leggera" per telefoni meno potenti: niente ombre e meno dettagli</span></div><select id="sQ" class="btn"><option value="alta" ${DB.settings.quality === 'alta' ? 'selected' : ''}>Alta qualità</option><option value="leggera" ${DB.settings.quality === 'leggera' ? 'selected' : ''}>Leggera</option></select></label>
      <label class="setrow"><div><b>Tema</b><span>Chiaro, scuro o come il telefono</span></div><select id="sT" class="btn"><option value="auto">Automatico</option><option value="light" ${DB.settings.theme === 'light' ? 'selected' : ''}>Chiaro</option><option value="dark" ${DB.settings.theme === 'dark' ? 'selected' : ''}>Scuro</option></select></label>
      <div class="setrow"><div><b>Salvataggio</b><span>Tutto viene salvato da solo su questo dispositivo (${used} KB usati)</span></div><button class="btn" type="button" data-act="export"><svg class="i" aria-hidden="true"><use href="#i-dn"/></svg> Esporta backup</button></div>
      <div class="setrow"><div><b>Ripristina backup</b><span>Carica un file di backup esportato prima</span></div><button class="btn" type="button" data-act="importjson"><svg class="i" aria-hidden="true"><use href="#i-up"/></svg> Carica</button></div>
      <div class="setrow"><div><b>Modelli importati</b><span>${DB.imported.length} modelli GLB</span></div><button class="btn" type="button" data-act="import"><svg class="i" aria-hidden="true"><use href="#i-up"/></svg> Importa GLB</button></div>
      <div class="setrow"><div><b>Cancella tutto</b><span>Elimina case, stanze e preferiti da questo dispositivo</span></div><button class="btn danger" type="button" data-act="reset">Cancella</button></div>
      <div class="setrow" style="border:0"><div><b>HOME 3D DESIGN PM</b><span>Versione 1.0 · ${ITEMS.length} modelli 3D · realizzata con Three.js</span></div></div></div>`;
    $('sQ').onchange = (e) => { DB.settings.quality = e.target.value; saveNow(); toast('Riavvio per applicare la grafica…'); setTimeout(() => location.reload(), 800); };
    $('sT').onchange = (e) => { DB.settings.theme = e.target.value; saveNow(); if (e.target.value === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = e.target.value; };
  }
  fillRoomThumbs(el);
}
function chooseRoomFor(t, tmpl){
  const houses = DB.houses.slice().sort((a, b) => b.upd - a.upd);
  if (!houses.length){ toast('Crea prima una casa'); return; }
  const opts = []; houses.forEach((h) => h.rooms.forEach((r) => opts.push([h, r])));
  openDlg('In quale stanza?', `<div class="pick">${opts.map(([h, r], i) => `<button type="button" data-ci="${i}"><span><svg class="i" aria-hidden="true"><use href="#i-door"/></svg></span>${esc(r.name)}<small class="note">${esc(h.name)}</small></button>`).join('')}</div>`);
  $('dlgB').addEventListener('click', (e) => { const b = e.target.closest('[data-ci]'); if (!b) return; const [h, r] = opts[+b.dataset.ci]; dlg.close(); openRoom(h, r); insertItem(t); const s = selItem(); if (s && tmpl.m){ s.m = clone(tmpl.m); applyMaterials(objs.get(s.u), s); commit(); } });
}
document.querySelector('.hwrap').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go){ if (go.dataset.go === 'nuovo'){ newHouseDialog(); renderHome('case'); } else { renderHome(go.dataset.go); if (go.classList.contains('tile')) $('hview').scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  const op = e.target.closest('[data-open]'); if (op){ const h = DB.houses.find((x) => x.id === op.dataset.open); openPlan(h); return; }
  const or = e.target.closest('[data-oroom]'); if (or){ const [hid, rid] = or.dataset.oroom.split('|'); const h = DB.houses.find((x) => x.id === hid); openRoom(h, h.rooms.find((r) => r.id === rid)); return; }
  const pre = e.target.closest('[data-pre]'); if (pre){ const p = PRESETS.find((x) => x.id === pre.dataset.pre); const h = newHouse(p.n); const r = roomFromPreset(p); r.before = { items: [], floor: clone(r.floor), walls: clone(r.walls), ceil: clone(r.ceil) }; h.rooms.push(r); DB.houses.push(h); saveNow(); openRoom(h, r); return; }
  const hi = e.target.closest('[data-hinfo]'); if (hi){ openViewer(hi.dataset.hinfo, true); return; }
  const hr = e.target.closest('[data-hren]'); if (hr){ const h = DB.houses.find((x) => x.id === hr.dataset.hren); openDlg('Rinomina la casa', `<div class="field"><input type="text" id="hn2" value="${esc(h.name)}" maxlength="40" aria-label="Nome"></div>`, [['Annulla', ''], ['Salva', 'main', () => { const v = $('hn2').value.trim(); if (v){ h.name = v; h.upd = Date.now(); saveNow(); renderHome(); } }]]); return; }
  const hd = e.target.closest('[data-hdup]'); if (hd){ const h = clone(DB.houses.find((x) => x.id === hd.dataset.hdup)); h.id = uid(); h.name += ' (copia)'; h.upd = Date.now(); h.rooms.forEach((r) => { r.id = uid(); r.items.forEach((i) => (i.u = uid())); }); DB.houses.push(h); saveNow(); renderHome(); toast('Casa duplicata'); return; }
  const hx = e.target.closest('[data-hdel]'); if (hx){ const h = DB.houses.find((x) => x.id === hx.dataset.hdel); openDlg('Eliminare la casa?', `<p><b>${esc(h.name)}</b> e tutte le sue ${h.rooms.length} stanze verranno cancellate.</p>`, [['Annulla', ''], ['Elimina', 'danger', () => { DB.houses = DB.houses.filter((x) => x !== h); saveNow(); renderHome(); }]]); return; }
  const act = e.target.closest('[data-act]'); if (!act) return;
  const a = act.dataset.act;
  if (a === 'newhouse') newHouseDialog();
  if (a === 'import') $('fileGlb').click();
  if (a === 'export'){ const blob = new Blob([JSON.stringify(DB)], { type: 'application/json' }); const url = URL.createObjectURL(blob); downloadURL(url, 'home3d-backup.json'); setTimeout(() => URL.revokeObjectURL(url), 3000); }
  if (a === 'importjson'){ const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json'; inp.onchange = async () => { try { const d = JSON.parse(await inp.files[0].text()); if (!Array.isArray(d.houses)) throw 0; DB.houses = d.houses; DB.favs = d.favs || []; saveNow(); toast('Backup caricato'); renderHome('case'); } catch (e) { toast('File di backup non valido'); } }; inp.click(); }
  if (a === 'reset') openDlg('Cancellare tutto?', '<p>Tutte le case, le stanze e i preferiti salvati su questo dispositivo verranno eliminati. Non si può annullare.</p>', [['Annulla', ''], ['Cancella tutto', 'danger', async () => { for (const imp of DB.imported) await idb.del(imp.id); localStorage.removeItem(KEY); location.reload(); }]]);
});
function newHouseDialog(){
  let choice = 'disegna';
  openDlg('Nuovo progetto', `<div class="field"><label class="lab" for="nh2">Nome della casa</label><input type="text" id="nh2" value="La mia casa" maxlength="40"></div>
    <div class="grp"><span class="lab">Da dove parti?</span><div class="pick" id="nhp"><button type="button" data-p="disegna" aria-pressed="true"><span><svg class="i" aria-hidden="true"><use href="#i-pencil"/></svg></span>Disegno la pianta</button><button type="button" data-p="piantina"><span><svg class="i" aria-hidden="true"><use href="#i-ruler"/></svg></span>Carico la piantina</button><button type="button" data-p="vuota"><span><svg class="i" aria-hidden="true"><use href="#i-square"/></svg></span>Stanza vuota</button>${PRESETS.map((p) => `<button type="button" data-p="${p.id}"><span>${p.img}</span>${esc(p.n)}</button>`).join('')}</div></div>
    <div class="grp" id="nhs" hidden><span class="lab">Misure della prima stanza</span>
      <div class="slider"><span>Larghezza</span><input type="range" min="2" max="14" step=".1" value="5" id="w2"><output>5,0 m</output></div>
      <div class="slider"><span>Profondità</span><input type="range" min="2" max="14" step=".1" value="4" id="d2"><output>4,0 m</output></div>
      <div class="slider"><span>Altezza</span><input type="range" min="2.3" max="4.5" step=".05" value="2.8" id="h2"><output>2,8 m</output></div></div>`,
    [['Annulla', ''], ['Crea', 'main', () => {
      const h = newHouse($('nh2').value.trim() || 'La mia casa');
      if (choice === 'disegna' || choice === 'piantina'){ DB.houses.push(h); saveNow(); openPlan(h); if (choice === 'piantina') setTimeout(underPick, 300); return; }
      const p = PRESETS.find((x) => x.id === choice);
      const r = p ? roomFromPreset(p) : newRoom('Soggiorno', 'interno', +$('w2').value, +$('d2').value, +$('h2').value);
      r.before = { items: [], floor: clone(r.floor), walls: clone(r.walls), ceil: clone(r.ceil) };
      r.px = 0; r.pz = 0; h.rooms.push(r); DB.houses.push(h); saveNow(); openPlan(h); planSel = { type: 'room', r }; renderProps();
    }]]);
  const B = $('dlgB');
  B.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; choice = b.dataset.p; B.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('nhs').hidden = choice !== 'vuota'; });
  B.addEventListener('input', (e) => { const o = e.target.parentElement.querySelector('output'); if (o && e.target.type === 'range') o.textContent = (+e.target.value).toFixed(1).replace('.', ',') + ' m'; });
}

/* =========================================================
   PIANTA 2D DELLA CASA + TELECAMERA CON VISTA 3D IN TEMPO REALE
   ========================================================= */
const WT = .14, SN = .05;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtM = (v) => v.toFixed(2).replace('.', ',') + ' m';
const fmtA = (v) => v.toFixed(2).replace('.', ',') + ' m²';
const ACC = '#2f6df6';
let planOn = false, planSwap = false, planTool = 'sel', buildTab = 'build', planSel = null, loadedRid = null;
const pv = { cx: 0, cz: 0, s: 60 };
const planGroups = new Map(), planObjs = new Map(), planDirty = new Set();
let planTopHide = [], planUndo = [], planRedo = [], perspBg = null, perspFog = null;
const ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300), omini = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300);
ocam.up.set(0, 0, -1); omini.up.set(0, 0, -1);
const pcam = new THREE.PerspectiveCamera(62, 4 / 3, .05, 300);
const ov = $('planOv'), octx = ov.getContext('2d');
const PLAN_DEF = { kind: 'interno', w: 10, d: 10, h: 2.8, light: { mode: 'giorno', sun: 1, warm: .5, lamps: true, exposure: 1 } };
const PLAN_BG = new THREE.Color('#eef1f5');
const planGrid = new THREE.GridHelper(120, 240, 0xc3cad6, 0xdde2ea); planGrid.position.y = -.105; planGrid.visible = false; scene.add(planGrid);
const UNDER = { img: null, hid: null };

/* ---------- geometria della casa ---------- */
const rectOf = (r) => ({ x0: r.px - r.w / 2, x1: r.px + r.w / 2, z0: r.pz - r.d / 2, z1: r.pz + r.d / 2 });
const roomById = (id) => house.rooms.find((r) => r.id === id);
const insideRoom = (r, x, z) => { const q = rectOf(r); return x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1; };
const roomAt = (x, z) => house.rooms.filter((r) => typeof r.px === 'number' && insideRoom(r, x, z)).sort((a, b) => a.w * a.d - b.w * b.d)[0];
const rectIn = (p, q) => p.x0 >= q.x0 - .002 && p.x1 <= q.x1 + .002 && p.z0 >= q.z0 - .002 && p.z1 <= q.z1 + .002;
// la stanza b sta dentro la stanza a (per esempio una camera dentro la casa)
const contains = (a, b) => a !== b && typeof a.px === 'number' && typeof b.px === 'number' && a.w * a.d > b.w * b.d + 1e-6 && rectIn(rectOf(b), rectOf(a));
const kidsOf = (r) => house.rooms.filter((o) => contains(r, o));
function roomOpts(r){
  const parents = house.rooms.filter((p) => contains(p, r)), q = rectOf(r), skip = [];
  for (const p of parents){ const b = rectOf(p); if (Math.abs(q.z0 - b.z0) < .01) skip.push(0); if (Math.abs(q.x1 - b.x1) < .01) skip.push(1); if (Math.abs(q.z1 - b.z1) < .01) skip.push(2); if (Math.abs(q.x0 - b.x0) < .01) skip.push(3); }
  return { lift: parents.length * .004, skip };
}
const snapVal = (v) => Math.round(v / SN) * SN;
function houseBounds(h = house){
  const rs = h.rooms.filter((r) => typeof r.px === 'number');
  if (!rs.length) return { x0: -4, x1: 4, z0: -3, z1: 3 };
  const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const r of rs){ const q = rectOf(r); b.x0 = Math.min(b.x0, q.x0 - WT); b.x1 = Math.max(b.x1, q.x1 + WT); b.z0 = Math.min(b.z0, q.z0 - WT); b.z1 = Math.max(b.z1, q.z1 + WT); }
  return b;
}
function placeNewRoom(h, r){
  const others = h.rooms.filter((o) => o !== r && typeof o.px === 'number');
  if (!others.length){ r.px = 0; r.pz = 0; return; }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity;
  for (const o of others){ const q = rectOf(o); x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); z0 = Math.min(z0, q.z0); }
  r.px = x1 + WT + r.w / 2; r.pz = z0 + r.d / 2;
}
function ensureLayout(h){ for (const r of h.rooms) if (typeof r.px !== 'number' || typeof r.pz !== 'number'){ delete r.px; placeNewRoom(h, r); } }
function overlaps(r, nx, nz, nw, nd, ignore){
  const a = { x0: nx - nw / 2, x1: nx + nw / 2, z0: nz - nd / 2, z1: nz + nd / 2 };
  for (const o of house.rooms){
    if (o === r || typeof o.px !== 'number' || (ignore && ignore.includes(o))) continue;
    const b = rectOf(o);
    if (rectIn(a, b) || rectIn(b, a)) continue; // una dentro l'altra: va bene
    if (a.x1 + WT > b.x0 + .005 && b.x1 + WT > a.x0 + .005 && a.z1 + WT > b.z0 + .005 && b.z1 + WT > a.z0 + .005) return true;
  }
  return false;
}
// bordi delle altre stanze a cui agganciarsi (muro in comune oppure allineato)
let snapIgnore = [];
function edgeCands(r, axis, side){
  const c = [];
  for (const o of house.rooms){
    if (o === r || typeof o.px !== 'number' || snapIgnore.includes(o)) continue;
    const b = rectOf(o);
    if (axis === 'x') side === 'min' ? c.push(b.x1 + WT, b.x0) : c.push(b.x0 - WT, b.x1);
    else side === 'min' ? c.push(b.z1 + WT, b.z0) : c.push(b.z0 - WT, b.z1);
  }
  return c;
}
function bestSnapC(pairs, thr){ let best = null, bd = thr; for (const [v, cs] of pairs) for (const c of cs){ const d = Math.abs(c - v); if (d < bd){ bd = d; best = { d: c - v, c }; } } return best; }
function bestSnap(pairs, thr){ const b = bestSnapC(pairs, thr); return b ? b.d : null; }
let planGuides = [], lenTag = null;
const snapThr = () => Math.max(.1, 14 / pv.s);
function snapEdge(v, r, axis, side){ const s = bestSnapC([[v, edgeCands(r, axis, side)]], snapThr()); if (s){ planGuides.push({ a: axis, v: s.c }); return s.c; } return snapVal(v); }
function snapRoomPos(r, nx, nz){
  const thr = snapThr();
  const sx = bestSnapC([[nx - r.w / 2, edgeCands(r, 'x', 'min')], [nx + r.w / 2, edgeCands(r, 'x', 'max')]], thr);
  const sz = bestSnapC([[nz - r.d / 2, edgeCands(r, 'z', 'min')], [nz + r.d / 2, edgeCands(r, 'z', 'max')]], thr);
  if (sx) planGuides.push({ a: 'x', v: sx.c }); if (sz) planGuides.push({ a: 'z', v: sz.c });
  nx = sx ? nx + sx.d : nx + (snapVal(nx - r.w / 2) - (nx - r.w / 2));
  nz = sz ? nz + sz.d : nz + (snapVal(nz - r.d / 2) - (nz - r.d / 2));
  return [nx, nz];
}
// dopo aver cambiato le misure: i mobili restano dove sono nella casa, quelli a parete seguono il loro muro
function refitItems(r, items0, opx, opz){
  const dx = r.px - opx, dz = r.pz - opz;
  r.items = items0.map((i0) => {
    const it = clone(i0), d = IT[it.t];
    if (d && d.mount === 'wall' && it.wall !== null && r.kind !== 'esterno'){
      const lx = it.x - dx, lz = it.z - dz, len = it.wall % 2 ? r.d : r.w;
      const along = clampN(it.wall === 0 ? lx : it.wall === 2 ? -lx : lz, -len / 2 + .3, len / 2 - .3);
      placeOnWall(it, r, along);
    } else { it.x = clampN(it.x - dx, -r.w / 2 + .1, r.w / 2 - .1); it.z = clampN(it.z - dz, -r.d / 2 + .1, r.d / 2 - .1); }
    return it;
  });
}
function camForRoom(t){ return { x: t.px + t.w / 2 - .45, z: t.pz + t.d / 2 - .45, tx: t.px - t.w * .12, tz: t.pz - t.d * .12, h: 1.6, th: 1.25, fov: (house.cam && house.cam.fov) || 62 }; }
function defaultCam(h){ const r = h.rooms[0]; return r ? camForRoom(r) : { x: 0, z: 3, tx: 0, tz: 0, h: 1.6, th: 1.25, fov: 62 }; }

/* ---------- stanza "attiva" (serve per collisioni e appoggi, resta nascosta) ---------- */
function loadQuiet(r, force){
  if (!r) return;
  if (room === r && loadedRid === r.id && !force) return;
  room = r; loadedRid = r.id; sel = null; selSurface = null; undoStack = []; redoStack = []; showBefore = false;
  if (!room.light) room.light = { mode: 'giorno', sun: 1, warm: .5, lamps: true, exposure: 1 };
  buildRoom(room); rebuildItems();
  if (room._settle){ for (const u of room._settle){ const it = room.items.find((i) => i.u === u), o = objs.get(u); if (it && o){ it.y = surfaceBelow(it, o, it.x, it.z); applyTransform(o, it); } } delete room._settle; }
  roomG.visible = itemsG.visible = !planOn;
}
function unloadRoom(){
  room = null; loadedRid = null; sel = null; disposeGroup(roomG); walls = [];
  for (const o of objs.values()) itemsG.remove(o); objs.clear(); floorMesh = ceilMesh = groundMesh = null;
}

/* ---------- copie 3D di tutte le stanze, nella loro posizione ---------- */
function dropPlanRoom(id){
  const g = planGroups.get(id); if (g){ disposeGroup(g); houseG.remove(g); planGroups.delete(id); }
  for (const [u, o] of planObjs) if (o.userData.rid === id) planObjs.delete(u);
}
function buildPlanRoom(r){
  dropPlanRoom(r.id);
  if (!house.rooms.includes(r)) return;
  const g = buildRoom(r, houseG, new THREE.Vector3(r.px, 0, r.pz), true, roomOpts(r));
  g.userData.rid = r.id;
  for (const it of r.items){
    const o = buildObject(it); if (!o) continue;
    tuneEnv(o); o.userData.rid = r.id; if (IT[it.t].mount === 'ceiling') o.userData.top = true;
    g.add(o); planObjs.set(it.u, o);
  }
  planGroups.set(r.id, g); collectTopHide(); planLamps();
}
function planRebuildAll(){ for (const id of [...planGroups.keys()]) dropPlanRoom(id); for (const r of house.rooms) buildPlanRoom(r); collectTopHide(); }
function rebuildFamily(r){ const fam = new Set([r, ...kidsOf(r), ...house.rooms.filter((p) => contains(p, r))]); for (const x of fam) buildPlanRoom(x); }
function collectTopHide(){ planTopHide = []; houseG.traverse((o) => { if (o.userData.surface === 'ceil' || o.userData.top) planTopHide.push(o); }); }
function planLamps(){
  const night = (room || house.rooms[0] || PLAN_DEF).light.mode === 'notte'; let n = 0;
  houseG.traverse((o) => { if (!o.userData.lamp) return; const on = night && n < 8; o.intensity = on ? o.userData.base * 6 : 0; o.visible = on; if (on) n++; });
}
function planShadowFit(){
  const b = houseBounds(), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, span = Math.max(b.x1 - b.x0, b.z1 - b.z0, 4);
  sun.position.set(cx + span * .6, 6 + span * .7, cz + span * .5); sun.target.position.set(cx, 0, cz); sun.target.updateMatrixWorld();
  const sc = sun.shadow.camera, e = span * .8 + 1; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = .5; sc.far = span * 4 + 30; sc.updateProjectionMatrix();
}

/* ---------- annulla / ripeti della pianta ---------- */
const planSnapshot = () => JSON.stringify({ rooms: house.rooms, cam: house.cam, under: house.under || null });
function pushBefore(s){ if (s === planSnapshot()) return; planUndo.push(s); if (planUndo.length > 40) planUndo.shift(); planRedo = []; updUR(); }
function planRestore(s){
  const o = JSON.parse(s); const rid = room && room.id;
  house.rooms = o.rooms; house.cam = o.cam; if (o.under) house.under = o.under; else delete house.under;
  room = null; loadedRid = null;
  const nr = house.rooms.find((r) => r.id === rid) || house.rooms[0];
  if (nr) loadQuiet(nr, true); else unloadRoom();
  planSel = null; planRebuildAll(); planCommit(); renderProps(); updUR();
}
function planUndoFn(){ if (!planUndo.length) return; planRedo.push(planSnapshot()); planRestore(planUndo.pop()); }
function planRedoFn(){ if (!planRedo.length) return; planUndo.push(planSnapshot()); planRestore(planRedo.pop()); }
function planCommit(){ house.upd = Date.now(); updateCost(); saveSoon(); updPlanTitle(); $('eSave').innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-save"/></svg>'; }
function updPlanTitle(){
  const area = house.rooms.reduce((a, r) => a + (r.kind === 'interno' ? r.w * r.d : 0), 0);
  $('eRoom').textContent = 'Pianta della casa ▾';
  $('eHouse').textContent = `${house.name} · ${house.rooms.length} ${house.rooms.length === 1 ? 'stanza' : 'stanze'} · ${fmtA(area)}`;
}

/* ---------- entrare e uscire dalla pianta ---------- */
function openPlan(h){
  house = h; ensureLayout(h);
  if (!h.cam) h.cam = defaultCam(h);
  if (planOn) planOff();
  planOn = true; planSwap = false; planSel = null; planUndo = []; planRedo = []; buildTab = 'build';
  planTool = h.rooms.length ? 'sel' : 'stanza';
  $('home').hidden = true; $('editor').hidden = false; $('editor').classList.add('plan'); $('editor').classList.remove('swap');
  if (camMode === 'casa') hideHouse(); camMode = 'libera';
  if (room && !h.rooms.includes(room)){ room = null; loadedRid = null; }
  if (!room && h.rooms.length) loadQuiet(h.rooms[0]); else if (!h.rooms.length) unloadRoom();
  roomG.visible = itemsG.visible = false; selBox.visible = false; wallHi.visible = false; controls.enabled = false; grid.visible = false;
  ov.hidden = false; $('pv').hidden = false; $('planBar').hidden = false; $('fpPad').hidden = true; $('badge').hidden = true;
  $('pvT').innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-camera"/></svg> Telecamera';
  houseG.visible = true; renderer.shadowMap.autoUpdate = false; disposeGroup(ctxG);
  if (h.under && UNDER.hid !== h.id){
    UNDER.img = null; UNDER.hid = h.id;
    idb.get('under-' + h.id).then((url) => { if (url && UNDER.hid === h.id){ const im = new Image(); im.onload = () => { UNDER.img = im; }; im.src = url; } });
  }
  resize(); planRebuildAll(); applyLighting(); planFit();
  renderBuildTabs(); renderCatalog(); renderProps(); updUR(); updPlanTitle(); updateCost();
  setHelp(h.rooms.length ? 'Pianta della casa: tocca una stanza e trascina i pallini blu per allargarla. In alto a destra vedi cosa vede la telecamera.' : 'Trascina sulla griglia per disegnare la prima stanza.');
  saveSoon();
}
function planOff(){
  if (!planOn) return;
  planOn = false; planSwap = false; planSel = null;
  for (const id of [...planGroups.keys()]) dropPlanRoom(id);
  houseG.clear(); houseG.visible = false; planGrid.visible = false;
  roomG.visible = itemsG.visible = true; grid.visible = mode === 'progettazione';
  ov.hidden = true; $('pv').hidden = true; $('planBar').hidden = true; $('fpPad').hidden = true;
  $('editor').classList.remove('plan', 'swap');
  renderer.shadowMap.autoUpdate = true; renderer.setScissorTest(false); controls.enabled = true;
  renderBuildTabs();
}
function planFit(){
  const rc = canvas.getBoundingClientRect(), W = rc.width || 400, H = rc.height || 400;
  const b = houseBounds(), C = house.cam;
  const x0 = Math.min(b.x0, C.x), x1 = Math.max(b.x1, C.x), z0 = Math.min(b.z0, C.z), z1 = Math.max(b.z1, C.z);
  pv.s = clampN(Math.min((W - 90) / (x1 - x0 + .6), (H - 90) / (z1 - z0 + .6)), 8, 220);
  pv.cx = (x0 + x1) / 2; pv.cz = (z0 + z1) / 2;
  if (W < 700) pv.cz -= 30 / pv.s; // lascia spazio alla vista 3D in alto
}
function setSwap(v){
  planSwap = v; $('editor').classList.toggle('swap', v);
  $('pvT').innerHTML = v ? '<svg class="i" aria-hidden="true"><use href="#i-map"/></svg> Pianta' : '<svg class="i" aria-hidden="true"><use href="#i-camera"/></svg> Telecamera';
  $('pvSwap').setAttribute('aria-label', v ? 'Torna alla pianta' : 'Guarda a schermo intero');
  $('fpPad').hidden = !v;
  setHelp(v ? 'Trascina per guardarti intorno, usa le frecce per camminare. Tocca la piantina in alto per tornare.' : 'Trascina la telecamera blu per spostarla e il pallino per decidere dove guarda.');
}
function setTool(t){
  planTool = t; renderBuildTabs();
  const H = { sel: 'Tocca una stanza, un mobile o la telecamera. Trascina per spostare.', stanza: 'Trascina sulla griglia per disegnare una stanza rettangolare.', muro: 'Trascina dentro una stanza per tirare un muro divisorio.', murovetro: 'Trascina dentro una stanza per mettere una parete in vetro.', scala: 'Trascina lungo un muro della piantina di cui conosci la lunghezza.', piantina: 'Trascina la piantina caricata per allinearla.' };
  setHelp(H[t] || ''); ov.style.cursor = t === 'sel' ? 'default' : 'crosshair';
}

/* ---------- disegno: telecamere e fotogramma ---------- */
function updateOcam(W, H){
  const hw = W / 2 / pv.s, hh = H / 2 / pv.s;
  ocam.left = -hw; ocam.right = hw; ocam.top = hh; ocam.bottom = -hh;
  ocam.position.set(pv.cx, 80, pv.cz); ocam.lookAt(pv.cx, 0, pv.cz); ocam.updateProjectionMatrix();
}
function fitOrtho(cam, bw, bh){
  const b = houseBounds(), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const s = Math.min(bw / (b.x1 - b.x0 + 1), bh / (b.z1 - b.z0 + 1));
  cam.left = -bw / 2 / s; cam.right = bw / 2 / s; cam.top = bh / 2 / s; cam.bottom = -bh / 2 / s;
  cam.position.set(cx, 80, cz); cam.lookAt(cx, 0, cz); cam.updateProjectionMatrix();
}
function planSetTop(top){
  for (const o of planTopHide) o.visible = !top;
  planGrid.visible = top; grid.visible = false;
  if (top){ scene.background = PLAN_BG; scene.fog = null; } else { scene.background = perspBg; scene.fog = perspFog; }
}
function walkCam(fw, rt){
  const C = house.cam, dx = C.tx - C.x, dz = C.tz - C.z, L = Math.hypot(dx, dz) || 1, fx = dx / L, fz = dz / L;
  const mx = fx * fw - fz * rt, mz = fz * fw + fx * rt;
  C.x += mx; C.z += mz; C.tx += mx; C.tz += mz; saveSoon();
}
function lookBy(dx, dy){
  const C = house.cam, vx = C.tx - C.x, vy = C.th - C.h, vz = C.tz - C.z;
  let yaw = Math.atan2(vx, vz), pitch = Math.atan2(vy, Math.hypot(vx, vz));
  yaw += dx * .006; pitch = clampN(pitch + dy * .005, -1.2, 1.2);
  const L = 2.5;
  C.tx = C.x + Math.sin(yaw) * Math.cos(pitch) * L; C.tz = C.z + Math.cos(yaw) * Math.cos(pitch) * L; C.th = C.h + Math.sin(pitch) * L;
}
function planFrame(dt){
  const C = house.cam, rc = canvas.getBoundingClientRect(), W = rc.width, H = rc.height; if (!W || !H) return;
  if (planSwap){
    let f = 0, s = 0;
    if (mvHeld.has('av') || fp.keys.has('w') || fp.keys.has('arrowup')) f += 1;
    if (mvHeld.has('in') || fp.keys.has('s') || fp.keys.has('arrowdown')) f -= 1;
    if (mvHeld.has('dx') || fp.keys.has('d') || fp.keys.has('arrowright')) s += 1;
    if (mvHeld.has('sx') || fp.keys.has('a') || fp.keys.has('arrowleft')) s -= 1;
    if (f || s) walkCam(f * 1.6 * dt, s * 1.6 * dt);
  }
  for (const r of planDirty) buildPlanRoom(r); planDirty.clear();
  selBox.visible = false; wallHi.visible = false;
  updateOcam(W, H);
  pcam.fov = C.fov || 62; pcam.position.set(C.x, C.h, C.z); pcam.lookAt(C.tx, C.th, C.tz);
  const pb = $('pv').getBoundingClientRect(), bx = pb.left - rc.left, by = pb.top - rc.top, bw = pb.width, bh = pb.height;
  renderer.shadowMap.needsUpdate = true;
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  if (planSwap){ pcam.aspect = W / H; pcam.updateProjectionMatrix(); planSetTop(false); renderer.render(scene, pcam); }
  else { planSetTop(true); renderer.render(scene, ocam); }
  if (bw > 10 && bh > 10){
    const y = H - by - bh;
    renderer.setScissorTest(true); renderer.setScissor(bx, y, bw, bh); renderer.setViewport(bx, y, bw, bh);
    if (planSwap){ fitOrtho(omini, bw, bh); planSetTop(true); renderer.render(scene, omini); }
    else { pcam.aspect = bw / bh; pcam.updateProjectionMatrix(); planSetTop(false); renderer.render(scene, pcam); }
    renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  }
  drawPlanOverlay(W, H);
}

/* ---------- disegno 2D sopra la pianta: muri, misure, nomi, telecamera ---------- */
function tag(g, x, y, t){ g.font = '700 11px Inter, system-ui, sans-serif'; const w = g.measureText(t).width + 10; g.fillStyle = 'rgba(238,241,245,.95)'; g.fillRect(x - w / 2, y - 8, w, 16); g.fillStyle = '#2b3140'; g.fillText(t, x, y + .5); }
function dimH(g, xa, xb, y, len){ if (xb - xa < 34) return; g.strokeStyle = '#6b7385'; g.lineWidth = 1; g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.moveTo(xa, y - 5); g.lineTo(xa, y + 5); g.moveTo(xb, y - 5); g.lineTo(xb, y + 5); g.stroke(); tag(g, (xa + xb) / 2, y, fmtM(len)); }
function dimV(g, ya, yb, x, len){ if (yb - ya < 34) return; g.strokeStyle = '#6b7385'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.moveTo(x - 5, ya); g.lineTo(x + 5, ya); g.moveTo(x - 5, yb); g.lineTo(x + 5, yb); g.stroke(); g.save(); g.translate(x, (ya + yb) / 2); g.rotate(-Math.PI / 2); tag(g, 0, 0, fmtM(len)); g.restore(); }
function rrect(g, x, y, w, h, r){ g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function pill(g, x, y, a, b){
  g.font = '800 13px Inter, system-ui, sans-serif'; const w1 = g.measureText(a).width; g.font = '600 11px Inter, system-ui, sans-serif'; const w2 = g.measureText(b).width;
  const w = Math.max(w1, w2) + 18;
  rrect(g, x - w / 2, y - 19, w, 38, 10); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill(); g.strokeStyle = 'rgba(40,50,70,.15)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#171a24'; g.font = '800 13px Inter, system-ui, sans-serif'; g.fillText(a, x, y - 6);
  g.fillStyle = '#5d6475'; g.font = '600 11px Inter, system-ui, sans-serif'; g.fillText(b, x, y + 9);
}
function handle(g, x, y, vertical){
  g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = ACC; g.stroke();
  g.beginPath(); if (vertical){ g.moveTo(x, y - 5); g.lineTo(x, y + 5); } else { g.moveTo(x - 5, y); g.lineTo(x + 5, y); } g.lineWidth = 2; g.stroke();
}
function drawRect(d){
  const a = d.w0, b = d.w1 || d.w0;
  let x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
  x0 = snapEdge(x0, null, 'x', 'min'); x1 = snapEdge(x1, null, 'x', 'max'); z0 = snapEdge(z0, null, 'z', 'min'); z1 = snapEdge(z1, null, 'z', 'max');
  return { x0, x1, z0, z1 };
}
function wallSeg(d){
  planGuides = []; lenTag = null;
  const r = d.r, a = snapPt(d.w0, null), b = endPt(a, d.w1 || d.w0, null, r);
  return { a, b, len: Math.hypot(b.x - a.x, b.z - a.z) };
}
function drawPlanOverlay(W, H){
  const dpr = Math.min(2, window.devicePixelRatio || 1), g = octx;
  if (ov.width !== Math.round(W * dpr) || ov.height !== Math.round(H * dpr)){ ov.width = Math.round(W * dpr); ov.height = Math.round(H * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  if (planSwap) return;
  const s = pv.s, X = (x) => (x - pv.cx) * s + W / 2, Z = (z) => (z - pv.cz) * s + H / 2;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const U = house.under;
  if (U && U.show !== false && UNDER.img){
    const ih = U.w * UNDER.img.height / UNDER.img.width;
    g.globalAlpha = U.op ?? .55; g.drawImage(UNDER.img, X(U.x - U.w / 2), Z(U.z - ih / 2), U.w * s, ih * s); g.globalAlpha = 1;
    if (planSel && planSel.type === 'under'){ g.setLineDash([6, 5]); g.strokeStyle = ACC; g.lineWidth = 2; g.strokeRect(X(U.x - U.w / 2), Z(U.z - ih / 2), U.w * s, ih * s); g.setLineDash([]); }
  }
  for (const r of house.rooms){
    if (r.kind === 'esterno') continue;
    const q = rectOf(r);
    g.beginPath(); g.rect(X(q.x0 - WT), Z(q.z0 - WT), (r.w + 2 * WT) * s, (r.d + 2 * WT) * s); g.rect(X(q.x0), Z(q.z0), r.w * s, r.d * s);
    g.fillStyle = r.kind === 'terrazza' ? 'rgba(110,160,205,.85)' : '#3a404c'; g.fill('evenodd');
  }
  for (const r of house.rooms) for (const it of r.items){
    if (!isWallT(it.t)) continue;
    const [a, b] = wallEnds(it), th = it.t === 'parete' ? .12 * (it.sz || 1) : .06;
    g.strokeStyle = it.t === 'parete' ? '#3a404c' : 'rgba(110,160,205,.9)'; g.lineWidth = Math.max(2, th * s); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(X(r.px + a.x), Z(r.pz + a.z)); g.lineTo(X(r.px + b.x), Z(r.pz + b.z)); g.stroke();
  }
  for (const r of house.rooms){
    const q = rectOf(r), on = planSel && planSel.type === 'room' && planSel.r === r;
    dimH(g, X(q.x0), X(q.x1), Z(q.z0 - WT) - 13, r.w);
    dimV(g, Z(q.z0), Z(q.z1), X(q.x0 - WT) - 13, r.d);
    if (on){ dimH(g, X(q.x0), X(q.x1), Z(q.z1 + WT) + 13, r.w); dimV(g, Z(q.z0), Z(q.z1), X(q.x1 + WT) + 13, r.d); }
    if (r.w * s > 74 && r.d * s > 44){ const [lx, lz] = labelPos(r); pill(g, X(lx), Z(lz), r.name, fmtA(r.w * r.d)); }
  }
  if (planSel && planSel.type === 'room' && house.rooms.includes(planSel.r)){
    const r = planSel.r, q = rectOf(r);
    g.strokeStyle = ACC; g.lineWidth = 2.5; g.strokeRect(X(q.x0 - WT), Z(q.z0 - WT), (r.w + 2 * WT) * s, (r.d + 2 * WT) * s);
    handle(g, X(r.px), Z(q.z0 - WT / 2), true); handle(g, X(q.x1 + WT / 2), Z(r.pz), false);
    handle(g, X(r.px), Z(q.z1 + WT / 2), true); handle(g, X(q.x0 - WT / 2), Z(r.pz), false);
  }
  const sw = selWall();
  if (sw){
    const [a, b] = wallEnds(sw.it), ax = X(sw.r.px + a.x), az = Z(sw.r.pz + a.z), bx = X(sw.r.px + b.x), bz = Z(sw.r.pz + b.z);
    g.strokeStyle = ACC; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(ax, az); g.lineTo(bx, bz); g.stroke(); g.setLineDash([]);
    for (const [x, z] of [[ax, az], [bx, bz]]){ g.beginPath(); g.arc(x, z, 10, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = ACC; g.stroke(); g.beginPath(); g.arc(x, z, 3.5, 0, Math.PI * 2); g.fillStyle = ACC; g.fill(); }
    const nx = -(bz - az), nz = bx - ax, nl = Math.hypot(nx, nz) || 1;
    tag(g, (ax + bx) / 2 + nx / nl * 18, (az + bz) / 2 + nz / nl * 18, fmtM(Math.hypot(b.x - a.x, b.z - a.z)));
  } else if (planSel && planSel.type === 'item'){
    const o = planObjs.get(planSel.u);
    if (o){ const b = new THREE.Box3().setFromObject(o); g.setLineDash([5, 4]); g.strokeStyle = ACC; g.lineWidth = 2; g.strokeRect(X(b.min.x) - 3, Z(b.min.z) - 3, (b.max.x - b.min.x) * s + 6, (b.max.z - b.min.z) * s + 6); g.setLineDash([]); }
  }
  if (pd && pd.moved && pd.kind === 'draw'){
    const keepG = planGuides; const q = drawRect(pd); planGuides = keepG;
    g.fillStyle = 'rgba(47,109,246,.14)'; g.fillRect(X(q.x0), Z(q.z0), (q.x1 - q.x0) * s, (q.z1 - q.z0) * s);
    g.strokeStyle = ACC; g.lineWidth = 2; g.setLineDash([7, 5]); g.strokeRect(X(q.x0), Z(q.z0), (q.x1 - q.x0) * s, (q.z1 - q.z0) * s); g.setLineDash([]);
    dimH(g, X(q.x0), X(q.x1), Z(q.z0) - 14, q.x1 - q.x0); dimV(g, Z(q.z0), Z(q.z1), X(q.x0) - 14, q.z1 - q.z0);
  }
  if (pd && pd.moved && (pd.kind === 'wall' || pd.kind === 'scale')){
    const sg = pd.kind === 'wall' ? pd.seg || wallSeg(pd) : { a: pd.w0, b: pd.w1 || pd.w0, len: Math.hypot((pd.w1 || pd.w0).x - pd.w0.x, (pd.w1 || pd.w0).z - pd.w0.z) };
    g.strokeStyle = pd.kind === 'wall' ? ACC : '#e8590c'; g.lineWidth = pd.kind === 'wall' ? Math.max(3, .12 * s) : 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(X(sg.a.x), Z(sg.a.z)); g.lineTo(X(sg.b.x), Z(sg.b.z)); g.stroke(); g.lineCap = 'butt';
    tag(g, (X(sg.a.x) + X(sg.b.x)) / 2, (Z(sg.a.z) + Z(sg.b.z)) / 2 - 16, fmtM(sg.len));
  }
  // linee guida: allineato a un muro o a una stanza che c'è già
  if (planGuides.length){
    g.save(); g.strokeStyle = '#e8590c'; g.lineWidth = 1.2; g.setLineDash([8, 6]);
    for (const gd of planGuides){ g.beginPath(); if (gd.a === 'x'){ g.moveTo(X(gd.v), 0); g.lineTo(X(gd.v), H); } else { g.moveTo(0, Z(gd.v)); g.lineTo(W, Z(gd.v)); } g.stroke(); }
    g.restore();
  }
  if (lenTag && pd){ const P2 = lenTag; g.font = '800 11px Inter, system-ui, sans-serif'; const tw = g.measureText(P2.t).width + 14; rrect(g, X(P2.x) - tw / 2, Z(P2.z) - 30, tw, 18, 9); g.fillStyle = '#e8590c'; g.fill(); g.fillStyle = '#fff'; g.fillText(P2.t, X(P2.x), Z(P2.z) - 21); }
  // telecamera: campo visivo, linea verso il punto guardato
  const C = house.cam, cx = X(C.x), cz = Z(C.z), tx = X(C.tx), tz = Z(C.tz);
  const yaw = Math.atan2(C.tx - C.x, C.tz - C.z);
  const pb = $('pv').getBoundingClientRect(), asp = pb.width && pb.height ? pb.width / pb.height : 4 / 3;
  const hf = 2 * Math.atan(Math.tan((C.fov || 62) * DEG / 2) * asp), L = clampN(Math.hypot(tx - cx, tz - cz) + 30, 70, 170);
  g.beginPath(); g.moveTo(cx, cz);
  for (let i = 0; i <= 10; i++){ const a = yaw - hf / 2 + hf * i / 10; g.lineTo(cx + Math.sin(a) * L, cz + Math.cos(a) * L); }
  g.closePath(); g.fillStyle = 'rgba(47,109,246,.15)'; g.fill(); g.strokeStyle = 'rgba(47,109,246,.45)'; g.lineWidth = 1; g.stroke();
  g.setLineDash([6, 5]); g.strokeStyle = ACC; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cz); g.lineTo(tx, tz); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(tx, tz, 7, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = ACC; g.stroke();
  if (planSel && planSel.type === 'cam'){ g.beginPath(); g.arc(cx, cz, 21, 0, Math.PI * 2); g.strokeStyle = 'rgba(47,109,246,.5)'; g.lineWidth = 4; g.stroke(); }
  g.beginPath(); g.arc(cx, cz, 16, 0, Math.PI * 2); g.fillStyle = ACC; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
  g.save(); g.translate(cx, cz); g.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)));
  g.fillStyle = '#fff'; rrect(g, -8, -5, 11, 10, 2); g.fill(); g.beginPath(); g.moveTo(3, -2.5); g.lineTo(9, -6); g.lineTo(9, 6); g.lineTo(3, 2.5); g.closePath(); g.fill();
  g.restore();
}

/* ---------- muri divisori: estremità, agganci, linee guida ---------- */
const isWallT = (t) => t === 'parete' || t === 'paretevetro';
function wallEnds(it){ const L = (it.sx || 1) * 2, dx = Math.cos(it.ry), dz = -Math.sin(it.ry); return [{ x: it.x - dx * L / 2, z: it.z - dz * L / 2 }, { x: it.x + dx * L / 2, z: it.z + dz * L / 2 }]; }
function selWall(){
  if (!planSel || planSel.type !== 'item' || !planSel.r || !house.rooms.includes(planSel.r)) return null;
  const it = planSel.r.items.find((i) => i.u === planSel.u);
  return it && isWallT(it.t) ? { r: planSel.r, it } : null;
}
function segDist(px, pz, a, b){ const vx = b.x - a.x, vz = b.z - a.z, L2 = vx * vx + vz * vz || 1; const t = clampN(((px - a.x) * vx + (pz - a.z) * vz) / L2, 0, 1); return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t)); }
// valori a cui agganciarsi: facce interne delle stanze ed estremità degli altri muri (coordinate della casa)
function axisCands(axis, exceptU){
  const c = [];
  for (const r of house.rooms){
    if (typeof r.px !== 'number') continue;
    const q = rectOf(r); axis === 'x' ? c.push(q.x0, q.x1) : c.push(q.z0, q.z1);
    for (const it of r.items){ if (!isWallT(it.t) || it.u === exceptU) continue; for (const e of wallEnds(it)) c.push(axis === 'x' ? r.px + e.x : r.pz + e.z); }
  }
  return c;
}
function snapAxisV(v, axis, exceptU){ const s = bestSnapC([[v, axisCands(axis, exceptU)]], snapThr()); if (s){ planGuides.push({ a: axis, v: s.c }); return s.c; } return null; }
function snapPt(p, exceptU){ const x = snapAxisV(p.x, 'x', exceptU), z = snapAxisV(p.z, 'z', exceptU); return { x: x ?? snapVal(p.x), z: z ?? snapVal(p.z) }; }
// estremità mobile di un muro: dritto se quasi dritto, agganci, stessa lunghezza di un altro muro, dentro la stanza
function endPt(a, raw, exceptU, r){
  let b = { x: raw.x, z: raw.z };
  const dx = b.x - a.x, dz = b.z - a.z;
  const straightX = Math.abs(dz) < Math.abs(dx) * .27, straightZ = Math.abs(dx) < Math.abs(dz) * .27;
  b = snapPt(b, exceptU);
  if (straightX){ b.z = a.z; planGuides = planGuides.filter((g) => g.a !== 'z'); }
  if (straightZ){ b.x = a.x; planGuides = planGuides.filter((g) => g.a !== 'x'); }
  if (straightX || straightZ){
    const L = Math.hypot(b.x - a.x, b.z - a.z), lens = [];
    for (const rr of house.rooms){ lens.push(rr.w, rr.d); for (const it of rr.items) if (isWallT(it.t) && it.u !== exceptU) lens.push((it.sx || 1) * 2); }
    const hit = planGuides.length ? null : bestSnapC([[L, lens]], snapThr());
    if (hit && L > .2){ const k = hit.c / L; b = { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }; lenTag = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, t: 'Stessa misura: ' + fmtM(hit.c) }; }
  }
  if (r){ const q = rectOf(r); b.x = clampN(b.x, q.x0, q.x1); b.z = clampN(b.z, q.z0, q.z1); }
  return b;
}
function setWall(r, it, a, b){
  const L = Math.max(.1, Math.hypot(b.x - a.x, b.z - a.z));
  it.x = (a.x + b.x) / 2; it.z = (a.z + b.z) / 2; it.ry = Math.atan2(-(b.z - a.z), b.x - a.x); it.sx = L / 2;
  const o = objs.get(it.u); if (o && room === r) applyTransform(o, it);
  const po = planObjs.get(it.u); if (po) applyTransform(po, it);
}
function moveWall(d, w){
  const r = d.r, [a0, b0] = d.ends0, dx = w.x - d.w0.x, dz = w.z - d.w0.z;
  const wa = { x: r.px + a0.x + dx, z: r.pz + a0.z + dz }, wb = { x: r.px + b0.x + dx, z: r.pz + b0.z + dz };
  const thr = snapThr();
  const sx = bestSnapC([[wa.x, axisCands('x', d.u)], [wb.x, axisCands('x', d.u)]], thr), sz = bestSnapC([[wa.z, axisCands('z', d.u)], [wb.z, axisCands('z', d.u)]], thr);
  let ox = sx ? sx.d : snapVal(wa.x) - wa.x, oz = sz ? sz.d : snapVal(wa.z) - wa.z;
  if (sx) planGuides.push({ a: 'x', v: sx.c }); if (sz) planGuides.push({ a: 'z', v: sz.c });
  const q = rectOf(r); let A = { x: wa.x + ox, z: wa.z + oz }, B = { x: wb.x + ox, z: wb.z + oz };
  const fx = Math.max(0, q.x0 - Math.min(A.x, B.x)) - Math.max(0, Math.max(A.x, B.x) - q.x1), fz = Math.max(0, q.z0 - Math.min(A.z, B.z)) - Math.max(0, Math.max(A.z, B.z) - q.z1);
  A = { x: A.x + fx - r.px, z: A.z + fz - r.pz }; B = { x: B.x + fx - r.px, z: B.z + fz - r.pz };
  setWall(r, d.it, A, B);
}
function stretchWall(d, w){
  const r = d.r, fixed = d.ends0[1 - d.end], fw = { x: r.px + fixed.x, z: r.pz + fixed.z };
  const b = endPt(fw, w, d.u, r), loc = { x: b.x - r.px, z: b.z - r.pz };
  if (Math.hypot(loc.x - fixed.x, loc.z - fixed.z) < .2) return;
  if (d.end === 1) setWall(r, d.it, fixed, loc); else setWall(r, d.it, loc, fixed);
}
function planNudge(dx, dz){
  const S = planSel; if (!S) return;
  const before = planSnapshot();
  if (S.type === 'room'){
    const r = S.r, kids = kidsOf(r);
    if (overlaps(r, r.px + dx, r.pz + dz, r.w, r.d, kids) || kids.some((k) => overlaps(k, k.px + dx, k.pz + dz, k.w, k.d, [r, ...kids]))){ toast('Lì tocca un\'altra stanza'); return; }
    for (const x of [r, ...kids]){ x.px += dx; x.pz += dz; }
    rebuildFamily(r); house.rooms.forEach((x) => { if (contains(x, r)) buildPlanRoom(x); });
  } else if (S.type === 'item'){
    const ws = selWall();
    if (ws){ const [a, b] = wallEnds(ws.it), q = rectOf(ws.r); const ok = [a, b].every((e) => { const x = ws.r.px + e.x + dx, z = ws.r.pz + e.z + dz; return x >= q.x0 - 1e-6 && x <= q.x1 + 1e-6 && z >= q.z0 - 1e-6 && z <= q.z1 + 1e-6; }); if (!ok){ toast('Il muro è già contro la parete'); return; } loadQuiet(ws.r); setWall(ws.r, ws.it, { x: a.x + dx, z: a.z + dz }, { x: b.x + dx, z: b.z + dz }); }
    else { const r = S.r; loadQuiet(r); sel = S.u; const it = selItem(), o = objs.get(S.u); if (!it || !o) return; if (!tryMove(it, o, it.x + dx, it.y, it.z + dz)){ toast('Lì c\'è già qualcosa'); return; } const po = planObjs.get(it.u); if (po) applyTransform(po, it); }
  }
  pushBefore(before); planCommit();
}
function nudgeRow(label){ return `<div class="grp"><label>${label}</label><div class="nudge"><button class="btn" type="button" data-pa="nx-" aria-label="A sinistra">←</button><button class="btn" type="button" data-pa="nz-" aria-label="In alto">↑</button><button class="btn" type="button" data-pa="nz+" aria-label="In basso">↓</button><button class="btn" type="button" data-pa="nx+" aria-label="A destra">→</button></div></div>`; }
function labelPos(r){
  const kids = kidsOf(r); if (!kids.some((k) => insideRoom(k, r.px, r.pz))) return [r.px, r.pz];
  const q = rectOf(r), ox = 66 / pv.s, oz = 30 / pv.s;
  for (const c of [[q.x0 + ox, q.z0 + oz], [q.x1 - ox, q.z0 + oz], [q.x0 + ox, q.z1 - oz], [q.x1 - ox, q.z1 - oz]]) if (!kids.some((k) => { const b = rectOf(k); return c[0] > b.x0 - WT - ox && c[0] < b.x1 + WT + ox && c[1] > b.z0 - WT - oz && c[1] < b.z1 + WT + oz; })) return c;
  return [q.x0 + ox, q.z0 + oz];
}
// nella vista 3D di una stanza si vedono anche le stanze disegnate dentro (per esempio dentro la casa)
const ctxG = new THREE.Group(); scene.add(ctxG);
function buildContext(){
  disposeGroup(ctxG);
  if (!house || !room || typeof room.px !== 'number') return;
  for (const o of house.rooms){
    if (!contains(room, o)) continue;
    const g = buildRoom(o, ctxG, new THREE.Vector3(o.px - room.px, 0, o.pz - room.pz), true, roomOpts(o));
    for (const it of o.items){ const ob = buildObject(it); if (ob){ tuneEnv(ob); g.add(ob); } }
    g.traverse((m) => { if (m.userData.surface === 'ceil') m.visible = false; });
  }
}

/* ---------- tocchi e trascinamenti sulla pianta ---------- */
const ptrs = new Map(); let pd = null, pinch = null, pvLook = null;
function evP(e){ const r = ov.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top, W: r.width, H: r.height }; }
const s2w = (P) => ({ x: pv.cx + (P.sx - P.W / 2) / pv.s, z: pv.cz + (P.sy - P.H / 2) / pv.s });
function edgeHit(r, w){
  const q = rectOf(r), tol = WT / 2 + 11 / pv.s;
  const inX = w.x > q.x0 - WT && w.x < q.x1 + WT, inZ = w.z > q.z0 - WT && w.z < q.z1 + WT;
  if (inX && Math.abs(w.z - (q.z0 - WT / 2)) < tol) return 0;
  if (inZ && Math.abs(w.x - (q.x1 + WT / 2)) < tol) return 1;
  if (inX && Math.abs(w.z - (q.z1 + WT / 2)) < tol) return 2;
  if (inZ && Math.abs(w.x - (q.x0 - WT / 2)) < tol) return 3;
  return -1;
}
function planHit(P, w){
  const C = house.cam, dpx = (x, z) => Math.hypot((x - w.x) * pv.s, (z - w.z) * pv.s);
  if (dpx(C.tx, C.tz) < 16) return { kind: 'tgt' };
  if (dpx(C.x, C.z) < 22) return { kind: 'cam' };
  if (planTool === 'piantina' && house.under) return { kind: 'under' };
  if (planTool === 'scala') return { kind: 'scale' };
  if (planTool === 'stanza') return { kind: 'draw' };
  if (planTool === 'muro' || planTool === 'murovetro') return { kind: 'wall', r: roomAt(w.x, w.z) };
  // maniglie alle estremità del muro selezionato: allunga / accorcia
  const ws = selWall(), wl = [];
  if (ws) wl.push(ws);
  for (const rr of house.rooms) for (const it of rr.items) if (isWallT(it.t) && (!ws || it.u !== ws.it.u)) wl.push({ r: rr, it });
  for (const x of wl){ const [a, b] = wallEnds(x.it), Lp = (x.it.sx || 1) * 2 * pv.s, thr = Math.min(x === ws ? 18 : 14, Lp * .22); for (const [k, e] of [[0, a], [1, b]]) if (dpx(x.r.px + e.x, x.r.pz + e.z) < thr) return { kind: 'wend', r: x.r, u: x.it.u, end: k }; }
  // i muri si trascinano sempre per allargare (prima quelli della stanza selezionata, poi le più piccole)
  const sr = planSel && planSel.type === 'room' && house.rooms.includes(planSel.r) ? planSel.r : null;
  const bySize = house.rooms.slice().sort((x, y) => x.w * x.d - y.w * y.d);
  for (const r2 of sr ? [sr, ...bySize] : bySize){ if (r2.kind === 'esterno' && r2 !== sr) continue; const e = edgeHit(r2, w); if (e >= 0) return { kind: 'edge', r: r2, e }; }
  // i muri divisori si prendono anche toccando la loro fascia scura
  for (const rr of house.rooms) for (const it of rr.items){ if (!isWallT(it.t)) continue; const [a, b] = wallEnds(it); if (segDist(w.x - rr.px, w.z - rr.pz, a, b) < WT / 2 + 8 / pv.s) return { kind: 'wmove', r: rr, u: it.u }; }
  // l'etichetta con il nome seleziona la stanza (anche se sotto c'è un mobile)
  for (const r2 of house.rooms){ if (r2.w * pv.s > 74 && r2.d * pv.s > 44){ const [lx, lz] = labelPos(r2); if (Math.abs((w.x - lx) * pv.s) < 58 && Math.abs((w.z - lz) * pv.s) < 20) return { kind: 'room', r: r2 }; } }
  updateOcam(P.W, P.H); ndc.set(P.sx / P.W * 2 - 1, -(P.sy / P.H) * 2 + 1); ray.setFromCamera(ndc, ocam);
  const ms = []; for (const o of planObjs.values()){ if (o.userData.top) continue; o.traverse((m) => { if (m.isMesh) ms.push(m); }); }
  const h = ray.intersectObjects(ms, false)[0];
  if (h){ const u = h.object.userData.item, po = planObjs.get(u), rr = po && roomById(po.userData.rid); if (rr){ const it = rr.items.find((i) => i.u === u); return { kind: it && isWallT(it.t) ? 'wmove' : 'item', r: rr, u }; } }
  const r = roomAt(w.x, w.z); if (r) return { kind: 'room', r };
  return { kind: 'pan' };
}
ov.addEventListener('pointerdown', (e) => {
  if (!planOn) return;
  e.preventDefault(); try { ov.setPointerCapture(e.pointerId); } catch (_) { /* niente */ }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2){
    if (pd && pd.moved) endPlanDrag(pd); pd = null;
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dp: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: pv.s, cx: pv.cx, cz: pv.cz };
    return;
  }
  if (ptrs.size > 2) return;
  const P = evP(e), w = s2w(P);
  if (planSwap){ pd = { kind: 'look', lx: e.clientX, ly: e.clientY, sx: P.sx, sy: P.sy, moved: false }; return; }
  const hit = planHit(P, w);
  pd = Object.assign(hit, { sx: P.sx, sy: P.sy, w0: w, moved: false, before: planSnapshot(), cx: pv.cx, cz: pv.cz });
});
ov.addEventListener('pointermove', (e) => {
  if (!planOn || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size >= 2){
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (planSwap){ walkCam((d - pinch.dp) * .01, 0); pinch.dp = d; return; }
    const rc = ov.getBoundingClientRect(), W = rc.width, H = rc.height;
    const wx = pinch.cx + (pinch.mx - rc.left - W / 2) / pinch.s, wz = pinch.cz + (pinch.my - rc.top - H / 2) / pinch.s;
    pv.s = clampN(pinch.s * d / pinch.d, 6, 400);
    pv.cx = wx - ((a.x + b.x) / 2 - rc.left - W / 2) / pv.s; pv.cz = wz - ((a.y + b.y) / 2 - rc.top - H / 2) / pv.s;
    return;
  }
  if (!pd) return;
  const P = evP(e), w = s2w(P);
  if (!pd.moved && Math.hypot(P.sx - pd.sx, P.sy - pd.sy) < 5) return;
  if (!pd.moved){ pd.moved = true; startPlanDrag(pd); }
  movePlanDrag(pd, P, w, e);
});
function planPtrUp(e){
  ptrs.delete(e.pointerId);
  if (pinch){ if (ptrs.size < 2){ pinch = null; saveSoon(); } return; }
  if (!pd) return;
  const d = pd; pd = null;
  if (d.moved) endPlanDrag(d); else planTap(d);
}
ov.addEventListener('pointerup', planPtrUp); ov.addEventListener('pointercancel', planPtrUp);
ov.addEventListener('wheel', (e) => {
  if (!planOn) return; e.preventDefault();
  if (planSwap){ walkCam(-e.deltaY * .004, 0); return; }
  const P = evP(e), w = s2w(P);
  pv.s = clampN(pv.s * Math.exp(-e.deltaY * .0015), 6, 400);
  pv.cx = w.x - (P.sx - P.W / 2) / pv.s; pv.cz = w.z - (P.sy - P.H / 2) / pv.s;
}, { passive: false });
function startPlanDrag(d){
  if (d.kind === 'item'){
    const r = d.r; loadQuiet(r); sel = d.u;
    d.it = r.items.find((i) => i.u === d.u); d.o = objs.get(d.u); d.def = d.it && IT[d.it.t];
    if (!d.it || !d.o){ d.kind = 'pan'; return; }
    d.off = { x: d.it.x - (d.w0.x - r.px), z: d.it.z - (d.w0.z - r.pz) };
    const b = objBox(d.o); d.small = b.max.y - b.min.y < .6;
    planSel = { type: 'item', r, u: d.u };
  } else if (d.kind === 'wmove' || d.kind === 'wend'){
    loadQuiet(d.r); sel = d.u; d.it = d.r.items.find((i) => i.u === d.u); d.o = objs.get(d.u);
    if (!d.it){ d.kind = 'pan'; return; }
    d.ends0 = wallEnds(d.it); planSel = { type: 'item', r: d.r, u: d.u };
  } else if (d.kind === 'room'){ d.px0 = d.r.px; d.pz0 = d.r.pz; d.kids = kidsOf(d.r).map((k) => [k, k.px, k.pz]); planSel = { type: 'room', r: d.r }; }
  else if (d.kind === 'edge'){ planSel = { type: 'room', r: d.r }; d.q0 = rectOf(d.r); d.items0 = clone(d.r.items); d.opx = d.r.px; d.opz = d.r.pz; }
  else if (d.kind === 'cam' || d.kind === 'tgt') planSel = { type: 'cam' };
  else if (d.kind === 'under'){ d.ux = house.under.x; d.uz = house.under.z; planSel = { type: 'under' }; }
}
function movePlanDrag(d, P, w, e){
  const C = house.cam; planGuides = []; lenTag = null;
  if (d.kind === 'pan'){ pv.cx = d.cx - (P.sx - d.sx) / pv.s; pv.cz = d.cz - (P.sy - d.sy) / pv.s; }
  else if (d.kind === 'look'){ lookBy(e.clientX - d.lx, e.clientY - d.ly); d.lx = e.clientX; d.ly = e.clientY; }
  else if (d.kind === 'cam'){ C.x = w.x; C.z = w.z; }
  else if (d.kind === 'tgt'){ C.tx = w.x; C.tz = w.z; }
  else if (d.kind === 'under'){ house.under.x = d.ux + (w.x - d.w0.x); house.under.z = d.uz + (w.z - d.w0.z); }
  else if (d.kind === 'draw' || d.kind === 'scale'){ d.w1 = w; if (d.kind === 'draw') drawRect(d); }
  else if (d.kind === 'wall'){ d.w1 = w; d.seg = wallSeg(d); }
  else if (d.kind === 'room'){
    const r = d.r, kids = d.kids.map((k) => k[0]); snapIgnore = kids;
    let [nx, nz] = snapRoomPos(r, d.px0 + (w.x - d.w0.x), d.pz0 + (w.z - d.w0.z)); snapIgnore = [];
    const dx = nx - d.px0, dz = nz - d.pz0;
    const ok = !overlaps(r, nx, nz, r.w, r.d, kids) && d.kids.every(([k, x, z]) => !overlaps(k, x + dx, z + dz, k.w, k.d, [r, ...kids]));
    if (ok){ r.px = nx; r.pz = nz; const g = planGroups.get(r.id); if (g) g.position.set(nx, 0, nz);
      for (const [k, x, z] of d.kids){ k.px = x + dx; k.pz = z + dz; const gk = planGroups.get(k.id); if (gk) gk.position.set(k.px, 0, k.pz); } }
  } else if (d.kind === 'edge') resizeEdge(d, w);
  else if (d.kind === 'wmove') moveWall(d, w);
  else if (d.kind === 'wend') stretchWall(d, w);
  else if (d.kind === 'item') dragPlanItem(d, w);
}
function resizeEdge(d, w){
  const r = d.r, q = { ...d.q0 }, MIN = 1;
  if (d.e === 1) q.x1 = Math.max(q.x0 + MIN, snapEdge(w.x - WT / 2, r, 'x', 'max'));
  if (d.e === 3) q.x0 = Math.min(q.x1 - MIN, snapEdge(w.x + WT / 2, r, 'x', 'min'));
  if (d.e === 0) q.z0 = Math.min(q.z1 - MIN, snapEdge(w.z + WT / 2, r, 'z', 'min'));
  if (d.e === 2) q.z1 = Math.max(q.z0 + MIN, snapEdge(w.z - WT / 2, r, 'z', 'max'));
  const nw = +(q.x1 - q.x0).toFixed(3), nd = +(q.z1 - q.z0).toFixed(3), nx = (q.x0 + q.x1) / 2, nz = (q.z0 + q.z1) / 2;
  if (overlaps(r, nx, nz, nw, nd)) return;
  if (Math.abs(nw - r.w) < 1e-4 && Math.abs(nd - r.d) < 1e-4 && Math.abs(nx - r.px) < 1e-4 && Math.abs(nz - r.pz) < 1e-4) return;
  r.w = nw; r.d = nd; r.px = nx; r.pz = nz;
  refitItems(r, d.items0, d.opx, d.opz);
  planDirty.add(r); for (const k of kidsOf(r)) planDirty.add(k); for (const p2 of house.rooms) if (contains(p2, r)) planDirty.add(p2);
}
function dragPlanItem(d, w){
  const r = d.r, it = d.it, o = d.o, def = d.def;
  let lx = w.x - r.px, lz = w.z - r.pz;
  if (def.mount === 'wall' && r.kind !== 'esterno'){
    const ds = [lz + r.d / 2, r.w / 2 - lx, r.d / 2 - lz, lx + r.w / 2], wi = ds.indexOf(Math.min(...ds));
    it.wall = wi; placeOnWall(it, r, wi === 0 ? lx : wi === 2 ? -lx : lz); clampWall(it); applyTransform(o, it);
  } else if (def.mount === 'ceiling'){
    it.x = clampN(lx + d.off.x, -r.w / 2 + .2, r.w / 2 - .2); it.z = clampN(lz + d.off.z, -r.d / 2 + .2, r.d / 2 - .2); applyTransform(o, it);
  } else {
    lx += d.off.x; lz += d.off.z;
    const y = d.small ? surfaceBelow(it, o, lx, lz, 1.6) : 0;
    tryMove(it, o, lx, y, lz);
  }
  const po = planObjs.get(it.u); if (po) applyTransform(po, it);
}
function endPlanDrag(d){
  planGuides = []; lenTag = null;
  if (d.kind === 'room'){ rebuildFamily(d.r); house.rooms.forEach((x) => { if (contains(x, d.r) || contains(d.r, x)) buildPlanRoom(x); }); }
  if (d.kind === 'edge'){
    const r = d.r; loadQuiet(r, true);
    for (const it of r.items){ if (IT[it.t] && IT[it.t].mount === 'floor'){ const o = objs.get(it.u); if (o) clampInside(it, o); } }
    buildPlanRoom(r); pushBefore(d.before); planCommit();
  } else if (d.kind === 'draw') finishDrawRoom(d);
  else if (d.kind === 'wall') finishDrawWall(d);
  else if (d.kind === 'scale') finishScale(d);
  else if (d.kind === 'look') saveSoon();
  else if (d.kind !== 'pan'){ pushBefore(d.before); planCommit(); }
  renderProps();
}
function planTap(d){
  if (['look', 'draw', 'wall', 'scale', 'under'].includes(d.kind)) return;
  if (d.kind === 'wmove' || d.kind === 'wend'){ loadQuiet(d.r); sel = d.u; planSel = { type: 'item', r: d.r, u: d.u }; renderProps(); return; }
  if (d.kind === 'cam' || d.kind === 'tgt') planSel = { type: 'cam' };
  else if (d.kind === 'item'){ loadQuiet(d.r); sel = d.u; planSel = { type: 'item', r: d.r, u: d.u }; }
  else if (d.kind === 'room' || d.kind === 'edge'){ loadQuiet(d.r); planSel = { type: 'room', r: d.r }; }
  else planSel = null;
  renderProps();
}
function finishDrawRoom(d){
  if (!d.w1) return;
  const q = drawRect(d), w = +(q.x1 - q.x0).toFixed(2), dd = +(q.z1 - q.z0).toFixed(2);
  if (w < 1 || dd < 1){ toast('Stanza troppo piccola: almeno 1 × 1 m'); return; }
  const nr = newRoom('Stanza ' + (house.rooms.length + 1), 'interno', w, dd, 2.8);
  nr.px = (q.x0 + q.x1) / 2; nr.pz = (q.z0 + q.z1) / 2;
  if (overlaps(nr, nr.px, nr.pz, w, dd)){ toast('Si sovrappone a un\'altra stanza: disegnala accanto'); return; }
  nr.before = { items: [], floor: clone(nr.floor), walls: clone(nr.walls), ceil: clone(nr.ceil) };
  nr.light.mode = (room || PLAN_DEF).light.mode;
  house.rooms.push(nr);
  if (house.rooms.length === 1) house.cam = camForRoom(nr);
  loadQuiet(nr); rebuildFamily(nr); planSel = { type: 'room', r: nr };
  pushBefore(d.before); planCommit(); setTool('sel');
  toast('Stanza creata: trascina i pallini blu per cambiarne le misure');
}
function finishDrawWall(d){
  const r = d.r;
  if (!r){ toast('Inizia il muro dentro una stanza'); return; }
  const sg = wallSeg(d); if (sg.len < .3){ toast('Muro troppo corto'); return; }
  loadQuiet(r);
  const t = planTool === 'murovetro' ? 'paretevetro' : 'parete', it = newItem(t);
  it.x = (sg.a.x + sg.b.x) / 2 - r.px; it.z = (sg.a.z + sg.b.z) / 2 - r.pz;
  it.ry = Math.atan2(-(sg.b.z - sg.a.z), sg.b.x - sg.a.x); it.sx = sg.len / 2;
  it.sy = r.kind === 'interno' ? r.h / (t === 'parete' ? 2.7 : 2.6) : 1;
  if (t === 'parete') it.sz = WT / .12; // stesso spessore dei muri della stanza
  r.items.push(it); addObject(it); buildPlanRoom(r);
  planSel = { type: 'item', r, u: it.u }; sel = it.u;
  pushBefore(d.before); planCommit();
}
function finishScale(d){
  if (!d.w1 || !house.under) return;
  const L = Math.hypot(d.w1.x - d.w0.x, d.w1.z - d.w0.z); if (L < .1) return;
  openDlg('Metti in scala la piantina', `<p class="note">Quanto è lungo nella realtà il tratto che hai segnato?</p><div class="field"><label class="lab" for="scl">Lunghezza in metri</label><input type="text" inputmode="decimal" id="scl" value="${L.toFixed(2).replace('.', ',')}"></div>`,
    [['Annulla', ''], ['Applica', 'main', () => {
      const real = parseFloat(String($('scl').value).replace(',', '.'));
      if (!(real > 0)){ toast('Scrivi una misura valida, per esempio 4,20'); return false; }
      const before = planSnapshot(), f = real / L, U = house.under;
      U.x = d.w0.x + (U.x - d.w0.x) * f; U.z = d.w0.z + (U.z - d.w0.z) * f; U.w *= f;
      pushBefore(before); planCommit(); setTool('stanza'); planFitUnder();
      toast('Piantina in scala. Ora ricalca le stanze trascinando sopra.');
    }]]);
  setTimeout(() => { const i = $('scl'); if (i){ i.focus(); i.select(); } }, 60);
}
function planFitUnder(){
  const U = house.under; if (!U || !UNDER.img) return;
  const rc = canvas.getBoundingClientRect(), ih = U.w * UNDER.img.height / UNDER.img.width;
  pv.s = clampN(Math.min((rc.width - 60) / U.w, (rc.height - 60) / ih), 6, 300); pv.cx = U.x; pv.cz = U.z;
}

/* ---------- vista telecamera in alto a destra ---------- */
$('pvSwap').addEventListener('click', (e) => { e.stopPropagation(); setSwap(!planSwap); });
$('pv').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault(); e.stopPropagation();
  if (planSwap){ setSwap(false); return; }
  try { $('pv').setPointerCapture(e.pointerId); } catch (_) { /* niente */ }
  pvLook = { x: e.clientX, y: e.clientY, moved: false };
});
$('pv').addEventListener('pointermove', (e) => {
  if (!pvLook) return;
  const dx = e.clientX - pvLook.x, dy = e.clientY - pvLook.y;
  if (!pvLook.moved && Math.hypot(dx, dy) < 4) return;
  pvLook.moved = true; lookBy(dx, dy); pvLook.x = e.clientX; pvLook.y = e.clientY;
});
const pvUp = () => { if (!pvLook) return; const tap = !pvLook.moved; pvLook = null; if (tap) setSwap(true); else saveSoon(); };
$('pv').addEventListener('pointerup', pvUp); $('pv').addEventListener('pointercancel', pvUp);
$('planBar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pb]'); if (!b) return;
  const k = b.dataset.pb;
  if (k === '3d') planAction('open3d');
  if (k === 'in') pv.s = clampN(pv.s * 1.25, 6, 400);
  if (k === 'out') pv.s = clampN(pv.s / 1.25, 6, 400);
  if (k === 'fit') planFit();
});

/* ---------- pannello delle proprietà nella pianta ---------- */
function targetRoom(){
  if (planSel && planSel.r && house.rooms.includes(planSel.r)) return planSel.r;
  const C = house.cam;
  return roomAt(C.tx, C.tz) || roomAt(C.x, C.z) || room || house.rooms[0] || null;
}
// sul telefono il pannello parte piccolo (solo il titolo) per non coprire la pianta e gli strumenti
let propsMini = true, propsKey = '';
function renderPlanProps(p){
  renderPlanPropsFull(p);
  const key = planSel ? planSel.type + ':' + (planSel.u || (planSel.r && planSel.r.id) || '') : '';
  if (key !== propsKey){ propsKey = key; propsMini = true; }
  const small = window.innerWidth < 1000 && !p.hidden && !!planSel;
  p.classList.toggle('mini', small && propsMini);
  const cp = $('catPanel'); p.style.bottom = small && propsMini && cp && !cp.hidden ? cp.offsetHeight + 'px' : '';
  p.style.borderRadius = small && propsMini ? '16px 16px 0 0' : '';
  const h = p.querySelector('.ph1');
  if (small && h && !h.querySelector('[data-mini]')){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn icon ghost minib'; b.dataset.mini = '1';
    b.textContent = propsMini ? '▴' : '▾'; b.setAttribute('aria-label', propsMini ? 'Apri le opzioni' : 'Riduci');
    b.addEventListener('click', (e) => { e.stopPropagation(); propsMini = !propsMini; renderPlanProps(p); });
    h.insertBefore(b, h.lastElementChild);
    h.addEventListener('click', (e) => { if (propsMini && !e.target.closest('button')){ propsMini = false; renderPlanProps(p); } });
  }
}
function renderPlanPropsFull(p){
  const wide = window.innerWidth >= 1000, S = planSel;
  if (S && S.r && !house.rooms.includes(S.r)) planSel = null;
  if (!planSel){
    if (!wide){ p.hidden = true; return; }
    const area = house.rooms.reduce((a, r) => a + (r.kind === 'interno' ? r.w * r.d : 0), 0);
    p.hidden = false;
    p.innerHTML = `<div class="ph1"><h3>${esc(house.name)}</h3><small>${house.rooms.length} ${house.rooms.length === 1 ? 'stanza' : 'stanze'} · ${fmtA(area)}</small></div>
      <div class="grp"><label>Come si usa la pianta</label><ul class="howto">
        <li><b>Disegna una stanza</b>: a sinistra scegli "Stanza" e trascina sulla griglia.</li>
        <li><b>Allarga i muri</b>: tocca una stanza e trascina i pallini blu.</li>
        <li><b>Sposta</b>: trascina il pavimento di una stanza o un mobile.</li>
        <li><b>Telecamera</b>: trascina l'icona blu per spostarla e il pallino bianco per decidere dove guarda. In alto a destra vedi la casa in 3D, in tempo reale.</li>
        <li><b>Libreria</b>: tocca un mobile per metterlo nella stanza selezionata.</li></ul></div>
      <div class="row"><button class="btn main" type="button" data-pa="swap"><svg class="i" aria-hidden="true"><use href="#i-camera"/></svg> Guarda con la telecamera</button></div>`;
    return;
  }
  p.hidden = false;
  if (planSel.type === 'room'){
    const r = planSel.r, def = M.FLOORS.find((f) => f.k === r.floor.k) || {};
    p.innerHTML = `<div class="ph1"><h3>${esc(r.name)}</h3><small>${fmtA(r.w * r.d)}</small><button class="btn icon ghost" type="button" data-pa="close" aria-label="Chiudi">✕</button></div>
      <div class="field"><label class="lab" for="prn">Nome della stanza</label><input type="text" id="prn" data-pn value="${esc(r.name)}" maxlength="40"></div>
      <div class="grp"><label>Misure interne</label><div class="nums">
        <label for="prw">Larghezza (cm)<input type="number" id="prw" data-pd="w" min="100" max="3000" step="5" value="${Math.round(r.w * 100)}"></label>
        <label for="prd">Profondità (cm)<input type="number" id="prd" data-pd="d" min="100" max="3000" step="5" value="${Math.round(r.d * 100)}"></label>
        ${r.kind === 'interno' ? `<label for="prh">Altezza (cm)<input type="number" id="prh" data-pd="h" min="220" max="500" step="5" value="${Math.round(r.h * 100)}"></label>` : ''}</div>
        <p class="note">Oppure trascina i pallini blu sui muri. Le stanze si agganciano da sole ai muri vicini.</p></div>
      <div class="grp"><label>Pavimento</label><div class="fins">${M.FLOORS.map((f) => `<button class="fin" type="button" data-pf="${esc(f.k)}" aria-pressed="${f.k === r.floor.k}"><img src="${M.swatchURL('floor', f.k, f.color ? (r.floor.c || '#d9d4cc') : null)}" alt=""><span>${esc(f.n)}</span></button>`).join('')}</div></div>
      ${nudgeRow('Sposta la stanza')}
      <div class="grp"><div class="row"><button class="btn main" type="button" data-pa="open3d"><svg class="i" aria-hidden="true"><use href="#i-sofa"/></svg> Arreda in 3D</button><button class="btn" type="button" data-pa="camhere"><svg class="i" aria-hidden="true"><use href="#i-camera"/></svg> Telecamera qui</button></div>
      <div class="row"><button class="btn" type="button" data-pa="duproom">⧉ Duplica</button><button class="btn danger" type="button" data-pa="delroom"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg> Elimina</button></div></div>`;
  } else if (planSel.type === 'item' && selWall()){
    const { it } = selWall(), L = (it.sx || 1) * 2;
    p.innerHTML = `<div class="ph1"><h3>${esc(IT[it.t].n)}</h3><small>${fmtM(L)}</small><button class="btn icon ghost" type="button" data-pa="close" aria-label="Chiudi">✕</button></div>
      <div class="grp"><div class="nums"><label for="pwl">Lunghezza (cm)<input type="number" id="pwl" data-pw="len" min="20" max="3000" step="1" value="${Math.round(L * 100)}"></label></div>
      <p class="note">Oppure trascina i pallini bianchi alle estremità per allungarlo o accorciarlo. Trascina il muro per spostarlo: le linee arancioni ti dicono quando è allineato.</p></div>
      ${nudgeRow('Sposta il muro')}
      <div class="grp"><div class="row"><button class="btn" type="button" data-pa="wrot">↻ Gira di 90°</button><button class="btn" type="button" data-pa="dupitem">⧉ Duplica</button><button class="btn danger" type="button" data-pa="delitem"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg> Elimina</button></div></div>`;
  } else if (planSel.type === 'item'){
    const it = planSel.r.items.find((i) => i.u === planSel.u); if (!it){ planSel = null; return renderPlanProps(p); }
    const d = IT[it.t], o = planObjs.get(it.u), sz = o ? new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()) : new THREE.Vector3();
    p.innerHTML = `<div class="ph1"><h3>${esc(d.n)}</h3><small>${Math.round(sz.x * 100)}×${Math.round(sz.z * 100)}×${Math.round(sz.y * 100)} cm</small><button class="btn icon ghost" type="button" data-pa="close" aria-label="Chiudi">✕</button></div>
      <p class="note">In: ${esc(planSel.r.name)} · ${d.price ? euro(d.price) : 'creato da te'}</p>
      <div class="grp"><div class="row">${d.mount === 'floor' ? '<button class="btn" type="button" data-pa="rot-90">↺ 90°</button><button class="btn" type="button" data-pa="rot90">↻ 90°</button>' : ''}<button class="btn" type="button" data-pa="dupitem">⧉ Duplica</button><button class="btn danger" type="button" data-pa="delitem"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg> Elimina</button></div>
      <div class="row"><button class="btn main" type="button" data-pa="edititem"><svg class="i" aria-hidden="true"><use href="#i-palette"/></svg> Colori e misure in 3D</button></div></div>
      ${d.mount === 'floor' ? nudgeRow('Sposta di 5 cm') : ''}
      <p class="note">${d.mount === 'wall' ? 'Trascinalo lungo i muri della stanza.' : 'Trascinalo sulla pianta per spostarlo. I soprammobili si appoggiano da soli su tavoli e mensole.'}</p>`;
  } else if (planSel.type === 'cam'){
    const C = house.cam;
    p.innerHTML = `<div class="ph1"><h3><svg class="i" aria-hidden="true"><use href="#i-camera"/></svg> Telecamera</h3><button class="btn icon ghost" type="button" data-pa="close" aria-label="Chiudi">✕</button></div>
      <div class="grp"><div class="slider"><span>Altezza occhi</span><input type="range" min="40" max="260" step="5" value="${Math.round(C.h * 100)}" data-pc="h" aria-label="Altezza occhi"><output>${Math.round(C.h * 100)} cm</output></div>
      <div class="slider"><span>Obiettivo</span><input type="range" min="35" max="100" step="1" value="${Math.round(C.fov || 62)}" data-pc="fov" aria-label="Ampiezza della vista"><output>${Math.round(C.fov || 62)}°</output></div></div>
      <div class="row"><button class="btn main" type="button" data-pa="swap">⤢ Guarda a schermo intero</button><button class="btn" type="button" data-pa="camhere">Rimetti nella stanza</button></div>
      <p class="note">Trascina l'icona blu per spostarla, il pallino bianco per decidere dove guarda. Puoi anche trascinare dentro la vista 3D per girarti.</p>`;
  } else if (planSel.type === 'under'){
    const U = house.under; if (!U){ planSel = null; return renderPlanProps(p); }
    p.innerHTML = `<div class="ph1"><h3><svg class="i" aria-hidden="true"><use href="#i-ruler"/></svg> Piantina caricata</h3><button class="btn icon ghost" type="button" data-pa="close" aria-label="Chiudi">✕</button></div>
      <div class="grp"><div class="slider"><span>Visibilità</span><input type="range" min="10" max="100" step="5" value="${Math.round((U.op ?? .55) * 100)}" data-pu="op" aria-label="Visibilità della piantina"><output>${Math.round((U.op ?? .55) * 100)}%</output></div></div>
      <div class="grp"><div class="row"><button class="btn main" type="button" data-pa="underscale"><svg class="i" aria-hidden="true"><use href="#i-ruler"/></svg> Metti in scala</button><button class="btn" type="button" data-pa="undermove"><svg class="i" aria-hidden="true"><use href="#i-move"/></svg> Sposta</button></div>
      <div class="row"><button class="btn" type="button" data-pa="undertrace"><svg class="i" aria-hidden="true"><use href="#i-pencil"/></svg> Ricalca le stanze</button><button class="btn" type="button" data-pa="undershow">${U.show === false ? '<svg class="i" aria-hidden="true"><use href="#i-eye"/></svg> Mostra' : '<svg class="i" aria-hidden="true"><use href="#i-eyeoff"/></svg> Nascondi'}</button><button class="btn danger" type="button" data-pa="underdel"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg> Togli</button></div></div>
      <p class="note">1. Metti in scala: trascina lungo un muro di cui sai la misura. 2. Ricalca: disegna le stanze sopra la piantina.</p>`;
  }
}
function setRoomSize(r, k, v){
  if (!(v > 0)){ renderProps(); return; }
  const before = planSnapshot();
  if (k === 'h'){ r.h = clampN(v, 2.2, 5); r.items.forEach((it) => { if (IT[it.t] && IT[it.t].mount === 'ceiling') it.y = r.h; }); }
  else {
    v = clampN(v, 1, 30);
    const q = rectOf(r), items0 = clone(r.items), opx = r.px, opz = r.pz;
    const nw = k === 'w' ? v : r.w, nd = k === 'd' ? v : r.d, nx = q.x0 + nw / 2, nz = q.z0 + nd / 2;
    if (overlaps(r, nx, nz, nw, nd)){ toast('Così tocca un\'altra stanza: spostala prima'); renderProps(); return; }
    r.w = nw; r.d = nd; r.px = nx; r.pz = nz; refitItems(r, items0, opx, opz);
  }
  loadQuiet(r, true);
  for (const it of r.items){ if (IT[it.t] && IT[it.t].mount === 'floor'){ const o = objs.get(it.u); if (o) clampInside(it, o); } }
  buildPlanRoom(r); pushBefore(before); planCommit(); renderProps();
}
function removeRoom(r){
  const before = planSnapshot();
  house.rooms = house.rooms.filter((x) => x !== r); dropPlanRoom(r.id); collectTopHide();
  if (room === r){ unloadRoom(); if (house.rooms[0]) loadQuiet(house.rooms[0]); }
  planSel = null; pushBefore(before); planCommit(); renderProps();
}
function planAction(a){
  const S = planSel, r = S && S.r;
  const nd = { 'nx-': [-.05, 0], 'nx+': [.05, 0], 'nz-': [0, -.05], 'nz+': [0, .05] }[a];
  if (nd){ planNudge(nd[0], nd[1]); return; }
  if (a === 'wrot' && selWall()){ const ws = selWall(), before = planSnapshot(); const [e0, e1] = wallEnds(ws.it), cx = (e0.x + e1.x) / 2, cz = (e0.z + e1.z) / 2, h = (ws.it.sx || 1); const ang = ws.it.ry - Math.PI / 2; setWall(ws.r, ws.it, { x: cx - Math.cos(ang) * h, z: cz + Math.sin(ang) * h }, { x: cx + Math.cos(ang) * h, z: cz - Math.sin(ang) * h }); pushBefore(before); planCommit(); renderProps(); return; }
  if (a === 'close'){ planSel = null; renderProps(); return; }
  if (a === 'swap'){ setSwap(!planSwap); return; }
  if (a === 'open3d'){ const t = r || targetRoom(); if (!t){ toast('Disegna prima una stanza'); return; } planOff(); openRoom(house, t); return; }
  if (a === 'camhere'){ const t = r || targetRoom(); if (!t) return; const before = planSnapshot(); house.cam = camForRoom(t); pushBefore(before); planCommit(); planSel = { type: 'cam' }; renderProps(); return; }
  if (a === 'duproom' && r){
    const before = planSnapshot(), c = clone(r); c.id = uid(); c.name += ' (copia)'; c.items.forEach((i) => (i.u = uid())); delete c.px; delete c.pz;
    placeNewRoom(house, c); house.rooms.push(c); buildPlanRoom(c); planSel = { type: 'room', r: c }; pushBefore(before); planCommit(); renderProps(); return;
  }
  if (a === 'delroom' && r){ openDlg('Eliminare la stanza?', `<p><b>${esc(r.name)}</b> e tutti i suoi mobili verranno tolti dalla casa. Puoi annullare con ↶.</p>`, [['Annulla', ''], ['Elimina', 'danger', () => removeRoom(r)]]); return; }
  if (S && S.type === 'item'){
    loadQuiet(r); sel = S.u; const it = selItem(); if (!it){ planSel = null; renderProps(); return; }
    if (a === 'edititem'){ const u = S.u; planOff(); openRoom(house, r); select(u); return; }
    const before = planSnapshot();
    if (a === 'rot90' || a === 'rot-90') edit((x) => { x.ry += (a === 'rot90' ? -90 : 90) * DEG; });
    if (a === 'dupitem'){ duplicateSel(); planSel = { type: 'item', r, u: sel }; }
    if (a === 'delitem'){ deleteSel(); planSel = null; }
    buildPlanRoom(r); pushBefore(before); planCommit(); renderProps(); return;
  }
  if (a === 'underscale'){ setTool('scala'); return; }
  if (a === 'undermove'){ setTool('piantina'); return; }
  if (a === 'undertrace'){ setTool('stanza'); return; }
  if (a === 'undershow' && house.under){ house.under.show = house.under.show === false; planCommit(); renderProps(); return; }
  if (a === 'underdel' && house.under){ const before = planSnapshot(); idb.del('under-' + house.id); delete house.under; UNDER.img = null; planSel = null; pushBefore(before); planCommit(); setTool('sel'); renderProps(); }
}
function planDelete(){
  if (!planSel) return;
  if (planSel.type === 'item') planAction('delitem');
  else if (planSel.type === 'room') planAction('delroom');
}
$('props').addEventListener('click', (e) => {
  if (!planOn) return;
  const pf = e.target.closest('[data-pf]');
  if (pf && planSel && planSel.type === 'room'){
    const r = planSel.r, before = planSnapshot(), def = M.FLOORS.find((f) => f.k === pf.dataset.pf) || {};
    r.floor = { k: pf.dataset.pf, c: def.color ? (r.floor.c || '#d9d4cc') : null };
    buildPlanRoom(r); if (room === r) loadQuiet(r, true); pushBefore(before); planCommit(); renderProps(); return;
  }
  const b = e.target.closest('[data-pa]'); if (b) planAction(b.dataset.pa);
});
$('props').addEventListener('input', (e) => {
  if (!planOn) return; const t = e.target, out = t.parentElement && t.parentElement.querySelector('output');
  if (t.dataset.pc){ const C = house.cam; if (t.dataset.pc === 'h'){ const nh = +t.value / 100; C.th += nh - C.h; C.h = nh; if (out) out.textContent = t.value + ' cm'; } else { C.fov = +t.value; if (out) out.textContent = t.value + '°'; } }
  if (t.dataset.pu && house.under){ house.under.op = +t.value / 100; if (out) out.textContent = t.value + '%'; }
  if (t.dataset.pn !== undefined && planSel && planSel.type === 'room'){ planSel.r.name = t.value; }
});
$('props').addEventListener('change', (e) => {
  if (!planOn || !planSel) return; const t = e.target;
  if (t.dataset.pd && planSel.type === 'room') setRoomSize(planSel.r, t.dataset.pd, +t.value / 100);
  if (t.dataset.pw && selWall()){ const ws = selWall(), v = +t.value / 100; if (v >= .2){ const before = planSnapshot(), [a, b] = wallEnds(ws.it), L = Math.hypot(b.x - a.x, b.z - a.z) || 1; setWall(ws.r, ws.it, a, { x: a.x + (b.x - a.x) / L * v, z: a.z + (b.z - a.z) / L * v }); pushBefore(before); planCommit(); } renderProps(); }
  if (t.dataset.pn !== undefined && planSel.type === 'room'){ planSel.r.name = t.value.trim() || 'Stanza'; planCommit(); }
  if (t.dataset.pc || t.dataset.pu) planCommit();
});

/* ---------- pannello a sinistra: Costruisci / Libreria ---------- */
const ICO = {
  sel: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 8 L36 26 L26 27 L32 39 L27 41 L21 29 L14 35 Z" fill="currentColor"/></svg>',
  stanza: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="10" width="32" height="28" fill="none" stroke="currentColor" stroke-width="5"/><text x="24" y="28" font-size="10" text-anchor="middle" fill="currentColor" font-weight="800">m²</text></svg>',
  muro: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="20" width="36" height="8" fill="currentColor"/><circle cx="6" cy="24" r="4" fill="#fff" stroke="currentColor" stroke-width="2"/><circle cx="42" cy="24" r="4" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>',
  murovetro: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="20" width="36" height="8" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 22 L20 26 M26 22 L32 26" stroke="currentColor" stroke-width="2"/></svg>',
  piantina: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 10 H42 V38 H6 Z M6 24 H22 V38 M22 10 V18 M30 24 H42" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 6 V16 M25 11 L30 6 L35 11" stroke="currentColor" stroke-width="3" fill="none"/></svg>',
  foto: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="14" width="36" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="3"/><rect x="16" y="9" width="12" height="6" rx="2" fill="currentColor"/></svg>',
  pronta: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="9" width="34" height="30" fill="none" stroke="currentColor" stroke-width="3"/><rect x="12" y="26" width="16" height="8" rx="2" fill="currentColor"/><rect x="31" y="14" width="6" height="10" fill="currentColor"/></svg>',
  cam: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="currentColor"/><rect x="15" y="19" width="13" height="11" rx="2" fill="#fff"/><path d="M28 22 L34 19 V30 L28 27 Z" fill="#fff"/></svg>',
};
function renderBuild(){
  const tool = (id, n) => `<button class="tool" type="button" data-tool="${id}" aria-pressed="${planTool === id}">${ICO[id]}<b>${n}</b></button>`;
  const itm = (id) => IT[id] ? `<button class="tool" type="button" data-bitem="${id}"><img src="${thumbFor(id)}" alt=""><b>${esc(IT[id].n)}</b></button>` : '';
  const act = (id, ico, n) => `<button class="tool" type="button" data-bact="${id}">${ICO[ico]}<b>${n}</b></button>`;
  $('cBuild').innerHTML = `<h4 class="bsec">Disegna</h4>${tool('sel', 'Seleziona e sposta')}${tool('stanza', 'Stanza')}${tool('muro', 'Muro divisorio')}${tool('murovetro', 'Parete in vetro')}
    <h4 class="bsec">Porte e finestre</h4>${['porta', 'portalegno', 'finestra', 'portafinestra'].map(itm).join('')}
    <h4 class="bsec">Struttura</h4>${['colonna', 'radiatore'].map(itm).join('')}${act('pronta', 'pronta', 'Stanza già arredata')}${act('cam', 'cam', 'Telecamera nella stanza')}
    <h4 class="bsec">Dalle tue foto</h4>${act('under', 'piantina', house && house.under ? 'Piantina caricata' : 'Carica piantina')}${act('photo', 'foto', 'Mobile da foto')}`;
}
function renderBuildTabs(){
  const showBuild = planOn && buildTab === 'build';
  $('cTabs').hidden = !planOn; $('cBuild').hidden = !showBuild;
  document.querySelector('#catPanel .crow').hidden = showBuild; $('cChips').hidden = showBuild; $('cItems').hidden = showBuild;
  $('cTabs').querySelectorAll('[data-ct]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ct === buildTab)));
  if (showBuild) renderBuild();
}
$('cTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-ct]'); if (!b) return; buildTab = b.dataset.ct; renderBuildTabs(); });
$('cBuild').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tool]'); if (t){ setTool(t.dataset.tool); return; }
  const it = e.target.closest('[data-bitem]'); if (it){ addFromCatalog(it.dataset.bitem); return; }
  const a = e.target.closest('[data-bact]'); if (!a) return;
  const k = a.dataset.bact;
  if (k === 'pronta') newRoomDialog(house);
  if (k === 'cam') planAction('camhere');
  if (k === 'photo') photoPick();
  if (k === 'under'){ if (house.under){ planSel = { type: 'under' }; renderProps(); } else underPick(); }
});
function addFromCatalog(t){
  if (!planOn) return insertItem(t);
  const r = targetRoom(); if (!r){ toast('Disegna prima una stanza'); return null; }
  const before = planSnapshot(); loadQuiet(r);
  const u = insertItem(t); if (!u) return null;
  buildPlanRoom(r); planSel = { type: 'item', r, u }; pushBefore(before); planCommit(); renderProps();
  toast('Messo in ' + r.name + ': trascinalo dove vuoi');
  return u;
}

/* ---------- immagini: piantina da ricalcare e mobili da foto ---------- */
function loadImg(src){ return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function pickImage(cb){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; try { const url = URL.createObjectURL(f); const im = await loadImg(url); URL.revokeObjectURL(url); cb(im); } catch (e) { toast('Non riesco ad aprire questa immagine'); } };
  inp.click();
}
function fitCanvas(im, max){ const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c; }
function underPick(){
  pickImage(async (im) => {
    const url = fitCanvas(im, 2048).toDataURL('image/jpeg', .85);
    const ok = await idb.put('under-' + house.id, url);
    if (!ok) toast('Questo browser non può salvare la piantina: resterà finché non chiudi l\'app');
    UNDER.img = await loadImg(url); UNDER.hid = house.id;
    const before = planSnapshot();
    house.under = { x: pv.cx, z: pv.cz, w: 12, op: .55, show: true };
    pushBefore(before); planSel = { type: 'under' }; planCommit(); planFitUnder(); setTool('scala'); renderProps();
    toast('Piantina caricata. Ora trascina lungo un muro di cui conosci la misura.', 4200);
  });
}
const PHOTO_TYPES = [['blocco', '<svg class="i" aria-hidden="true"><use href="#i-cabinet"/></svg>', 'Mobile'], ['quadro', '<svg class="i" aria-hidden="true"><use href="#i-frame"/></svg>', 'Quadro o poster'], ['tappeto', '<svg class="i" aria-hidden="true"><use href="#i-rug"/></svg>', 'Tappeto'], ['sagoma', '<svg class="i" aria-hidden="true"><use href="#i-scissors"/></svg>', 'Sagoma ritagliata']];
function avgColor(im){ const c = document.createElement('canvas'); c.width = c.height = 6; const x = c.getContext('2d'); x.drawImage(im, im.width * .3, im.height * .3, im.width * .4, im.height * .4, 0, 0, 6, 6); const d = x.getImageData(0, 0, 6, 6).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4){ r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4, h = (v) => Math.round(v / n * .8).toString(16).padStart(2, '0'); return '#' + h(r) + h(g) + h(b); }
// toglie lo sfondo partendo dai bordi della foto (colori simili a quelli del bordo)
function cutout(c){
  const x = c.getContext('2d'), W = c.width, H = c.height, D = x.getImageData(0, 0, W, H), p = D.data;
  let r = 0, g = 0, b = 0, n = 0;
  const acc = (i) => { r += p[i * 4]; g += p[i * 4 + 1]; b += p[i * 4 + 2]; n++; };
  for (let i = 0; i < W; i += 3){ acc(i); acc((H - 1) * W + i); } for (let j = 0; j < H; j += 3){ acc(j * W); acc(j * W + W - 1); }
  r /= n; g /= n; b /= n;
  const TOL = 3 * 46 * 46, seen = new Uint8Array(W * H), st = new Int32Array(W * H); let sp = 0;
  const push = (i) => { if (seen[i]) return; seen[i] = 1; const k = i * 4, dr = p[k] - r, dg = p[k + 1] - g, db = p[k + 2] - b; if (dr * dr + dg * dg + db * db < TOL) st[sp++] = i; };
  for (let i = 0; i < W; i++){ push(i); push((H - 1) * W + i); } for (let j = 0; j < H; j++){ push(j * W); push(j * W + W - 1); }
  while (sp){ const i = st[--sp]; p[i * 4 + 3] = 0; const xx = i % W, yy = (i / W) | 0; if (xx > 0) push(i - 1); if (xx < W - 1) push(i + 1); if (yy > 0) push(i - W); if (yy < H - 1) push(i + W); }
  x.putImageData(D, 0, 0); return c;
}
function buildPhotoModel(imp, img){
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
  const g = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: .7 }), side = new THREE.MeshStandardMaterial({ color: imp.color || '#8f857b', roughness: .75 });
  const add = (geo, mat, y, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(0, y, z); m.castShadow = m.receiveShadow = true; m.userData.slot = 'imported'; g.add(m); return m; };
  const { w, d, h } = imp;
  if (imp.type === 'blocco') add(new THREE.BoxGeometry(w, h, d), [side, side, side, side, face, side], h / 2);
  else if (imp.type === 'quadro') add(new THREE.BoxGeometry(w, h, .03), [side, side, side, side, face, side], h / 2, .015);
  else if (imp.type === 'tappeto'){ const m = add(new THREE.BoxGeometry(w, .012, d), [side, side, face, side, side, side], .006); m.castShadow = false; }
  else {
    face.alphaTest = .5; face.side = THREE.DoubleSide;
    const m = add(new THREE.PlaneGeometry(w, h), face, h / 2);
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
  }
  GLTF.set(imp.id, g);
}
function photoPick(){ pickImage((im) => photoDialog(im)); }
function photoDialog(im){
  const asp = im.width / im.height;
  const defs = { blocco: [Math.round(100 * asp), 50, 100], quadro: [80, 3, Math.round(80 / asp)], tappeto: [200, Math.round(200 / asp), 1], sagoma: [Math.round(150 * asp), 2, 150] };
  let type = 'blocco';
  const prev = fitCanvas(im, 480).toDataURL('image/jpeg', .8);
  openDlg('Mobile da foto', `<img src="${prev}" alt="La tua foto" style="width:100%;max-height:220px;object-fit:contain;border-radius:12px;background:var(--panel-2)">
    <div class="grp"><span class="lab">Che cos'è?</span><div class="pick" id="phT">${PHOTO_TYPES.map(([k, e, n]) => `<button type="button" data-ty="${k}" aria-pressed="${k === type}"><span>${e}</span>${n}</button>`).join('')}</div></div>
    <div class="field"><label class="lab" for="phN">Nome</label><input type="text" id="phN" value="Il mio mobile" maxlength="40"></div>
    <div class="grp"><span class="lab">Misure vere</span><div class="nums">
      <label for="phW">Larghezza (cm)<input type="number" id="phW" min="5" max="800" value="${defs.blocco[0]}"></label>
      <label for="phD" id="phDl">Profondità (cm)<input type="number" id="phD" min="1" max="800" value="${defs.blocco[1]}"></label>
      <label for="phH" id="phHl">Altezza (cm)<input type="number" id="phH" min="1" max="400" value="${defs.blocco[2]}"></label></div></div>
    <label class="setrow" id="phBgRow" hidden style="border:0;padding:0"><div><b>Togli lo sfondo</b><span>Funziona meglio con uno sfondo chiaro e uniforme</span></div><input type="checkbox" id="phBg" checked></label>
    <p class="note" id="phHint">La foto va sul davanti del mobile. Fotografalo di fronte, dritto.</p>`,
    [['Annulla', ''], ['Crea in 3D', 'main', () => {
      const w = +$('phW').value / 100, d = +$('phD').value / 100, h = +$('phH').value / 100;
      if (!(w > 0) || !(h > 0) || !(d > 0)){ toast('Controlla le misure'); return false; }
      createPhotoItem(im, type, $('phN').value.trim() || 'Il mio mobile', w, d, h, type === 'sagoma' && $('phBg').checked);
    }]]);
  const hints = { blocco: 'La foto va sul davanti del mobile. Fotografalo di fronte, dritto.', quadro: 'Si appende al muro, come un quadro vero.', tappeto: 'La foto diventa il disegno del tappeto, visto dall\'alto.', sagoma: 'Il mobile resta in piedi ritagliato: ottimo per sedie, piante e lampade fotografate di fronte.' };
  const apply = () => { const v = defs[type]; $('phW').value = v[0]; $('phD').value = v[1]; $('phH').value = v[2]; $('phDl').hidden = type === 'quadro' || type === 'sagoma'; $('phHl').hidden = type === 'tappeto'; $('phBgRow').hidden = type !== 'sagoma'; $('phHint').textContent = hints[type]; };
  $('phT').addEventListener('click', (e) => { const b = e.target.closest('[data-ty]'); if (!b) return; type = b.dataset.ty; $('phT').querySelectorAll('[data-ty]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); });
}
async function createPhotoItem(im, type, n, w, d, h, removeBg){
  let c = fitCanvas(im, 1024);
  const color = avgColor(c);
  if (removeBg) c = cutout(c);
  const url = c.toDataURL(type === 'sagoma' ? 'image/png' : 'image/jpeg', .88);
  const imp = { id: 'foto-' + uid(), n, kind: 'foto', type, w, d: type === 'quadro' ? .03 : type === 'sagoma' ? .01 : d, h: type === 'tappeto' ? .012 : h, color };
  const ok = await idb.put(imp.id, url);
  if (!ok) toast('Questo browser non può salvare la foto: il mobile resterà finché non chiudi l\'app');
  buildPhotoModel(imp, await loadImg(url));
  DB.imported.push(imp); registerImported(imp); saveNow();
  thumbs.delete(imp.id); renderCatalog(); if (planOn) renderBuildTabs();
  const u = room || planOn ? addFromCatalog(imp.id) : null;
  toast(u ? 'Fatto! "' + n + '" è nella stanza e nella Libreria' : '"' + n + '" è nella Libreria, tra gli Importati');
}
$('cPhoto').onclick = photoPick;

/* =========================================================
   AVVIO
   ========================================================= */
(async function start(){
  await idb.open(); await loadImported();
  $('loading').remove(); $('home').hidden = false;
  renderHome('case');
  // immagine grande della home: anteprima di una stanza pronta
  const heroUrl = await roomThumb(roomFromPresetForThumb(PRESETS[0]));
  $('heroImg').src = heroUrl;
  loop();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/claude\.ai$|claudeusercontent\.com$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
window.__h3d = { THREE, DB, openPlan, get planSel(){ return planSel; }, pv, get house(){ return house; }, planTool: () => planTool, IT, ITEMS, get room(){ return room; }, insertItem, objs, select, camera, controls };
