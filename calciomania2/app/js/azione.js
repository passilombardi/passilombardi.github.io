// ============ AZIONE: nella carriera da giocatore controlli tu il tuo giocatore ============
// Campo in metri: x 0..105 (si attacca verso destra), y 0..68. Il disegno usa lo stesso campo della partita.
const AZ_L = 105, AZ_A = 68, AZ_P = 3.66; // lunghezza, larghezza, mezza porta

class Azione {
  constructor(o){
    this.o = o; this.portiere = o.tipo === 'portiere';
    this.info = { casa: o.colNoi, ospiti: o.colLoro };
    this.vista = 'tv'; this.zoom = 1.45; this.flash = 0; this.script = null; this.tempo = 0; this.fineT = 0; this.esito = null;
    this.limite = this.portiere ? 14 : 18;
    this.folla = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), c: Math.random() < 0.6 ? o.colNoi.c1 : o.colLoro.c1, f: Math.random() * 6 }));
    this.joy = { x: 0, y: 0 }; this.scatto = false; this.tasti = {};
    this.palla = { x: 0.5, y: 0.5 };
    this.b = { mx: 50, my: 34, vx: 0, vy: 0, h: 0, vh: 0, owner: null, tipo: null, kicker: null, kickT: 9, passTo: null };
    this.creaScena();
    this.creaDom();
    this.t = performance.now(); this._f = (t) => this.loop(t); requestAnimationFrame(this._f);
  }
  // ---------- i giocatori in campo ----------
  gioc(d, lato, extra){
    const h = hashStr((d.nome || '') + lato + (d.num || 0));
    return Object.assign({ mx: 50, my: 34, vx: 0, vy: 0, x: 0.5, y: 0.5, num: d.num || '', nome: d.nome || '', pelle: PELLI[h % PELLI.length], capelli: CAPELLI[(h >> 4) % CAPELLI.length], taglio: (h >> 8) % 4, dir: lato ? -1 : 1, v: 0, fase: h % 7, lato, sk: d.sk == null ? 0.5 : d.sk, p: d.p }, extra || {});
  }
  creaScena(){
    const o = this.o, R = Math.random;
    if (!this.portiere){
      const x0 = { A: 68, C: 60, D: 52 }[o.io.r] || 60, y0 = 16 + R() * 36;
      this.me = this.gioc(o.io, 0, { mx: x0, my: y0, io: true });
      const posC = [[x0 + 12, y0 < 34 ? 52 : 16], [x0 + 16, 34 + (y0 < 34 ? 6 : -6)], [x0 - 2, y0 < 34 ? 30 : 38]];
      this.compagni = o.compagni.slice(0, 3).map((c, i) => this.gioc(c, 0, { mx: clamp(posC[i][0], 30, 96), my: posC[i][1], k: i, dec: 0 }));
      const gk = this.gioc(o.avv.gk, 1, { mx: 104, my: 34, gk: true });
      const ys = [12, 27, 41, 56];
      const dif = o.avv.dif.slice(0, 4).map((d, i) => this.gioc(d, 1, { mx: Math.max(x0 + 14, 86) + R() * 3, my: ys[i] + (R() - 0.5) * 4, hx: 90, hy: ys[i], tk: 0 }));
      const cen = o.avv.cen.slice(0, 2).map((d, i) => this.gioc(d, 1, { mx: x0 - 9 - i * 4, my: y0 + (i ? 9 : -9), tk: 0, insegue: true }));
      this.difensori = dif.concat(cen); this.gk = gk;
      this.sq = [[this.gioc({ num: 1 }, 0, { via: true })].concat([this.me], this.compagni), [gk].concat(this.difensori)];
      this.dai(this.me);
    } else {
      this.me = this.gioc(o.io, 0, { mx: 1.5, my: 34, io: true, tuffo: 0, rec: 0 });
      const sx = 30 + R() * 8, sy = 18 + R() * 32;
      this.att = this.gioc(o.avv.att[0], 1, { mx: sx, my: sy, dec: 1.2 + R() * 1.6 });
      this.att2 = this.gioc(o.avv.att[1] || o.avv.att[0], 1, { mx: sx - 3, my: sy < 34 ? sy + 18 : sy - 18 });
      this.miei = o.compagni.slice(0, 2).map((c, i) => this.gioc(c, 0, { mx: sx - 6 - i * 3, my: sy + (i ? 9 : -9), tk: 0 }));
      this.sq = [[this.me].concat(this.miei), [this.gioc({ num: 1 }, 1, { via: true }), this.att, this.att2]];
      this.dai(this.att);
    }
    this.tutti = this.sq[0].concat(this.sq[1]).filter((p) => !p.via);
    this.cam = clamp(this.b.mx / AZ_L, 0.24, 0.8);
  }
  // ---------- schermo e comandi ----------
  creaDom(){
    const v = document.createElement('div'); v.className = 'azione'; v.id = 'azione';
    const bott = this.portiere
      ? `<button class="az-b tiro" data-az="tuffo">TUFFO</button><button class="az-b scatto" data-az="scatto">SCATTO</button>`
      : `<button class="az-b filt" data-az="filtrante">FILTRANTE</button><button class="az-b tiro" data-az="tiro">TIRO</button><button class="az-b pass" data-az="passaggio">PASSAGGIO</button><button class="az-b scatto" data-az="scatto">SCATTO</button>`;
    v.innerHTML = `<div class="az-top"><div class="az-tit"><b>${this.portiere ? 'Tocca a te, portiere!' : 'Palla a te!'}</b><small>${esc(this.o.punteggio || '')} · ${Math.floor(this.o.min || 0)}’</small></div><button class="az-salta" data-az="salta">Salta</button></div>
      <div class="az-wrap"><canvas></canvas><div class="az-msg"></div><div class="az-tempo"><i></i></div>
      <p class="az-aiuto">${this.portiere ? 'Muoviti con la levetta. Quando tira premi TUFFO verso il lato del tiro!' : 'Muoviti con la levetta. Tieni premuto SCATTO per correre. Passa, fai un filtrante o tira!'}</p></div>
      <div class="az-ctrl ${this.portiere ? 'por' : ''}"><div class="az-joy"><div class="az-pom"></div></div><div class="az-btns">${bott}</div></div>`;
    document.body.appendChild(v); this.v = v;
    this.cv = v.querySelector('canvas'); this.x = this.cv.getContext('2d'); this.msg = v.querySelector('.az-msg'); this.bar = v.querySelector('.az-tempo i');
    this.resize(); this._r = () => this.resize(); addEventListener('resize', this._r);
    // levetta
    const joy = v.querySelector('.az-joy'), pom = v.querySelector('.az-pom'); let pid = null;
    const muovi = (e) => { const r = joy.getBoundingClientRect(), R = r.width / 2; let dx = (e.clientX - r.left - R) / (R * 0.7), dy = (e.clientY - r.top - R) / (R * 0.7); const l = Math.hypot(dx, dy); if (l > 1){ dx /= l; dy /= l; } this.joy = { x: dx, y: dy }; pom.style.transform = `translate(${dx * R * 0.55}px,${dy * R * 0.55}px)`; };
    joy.addEventListener('pointerdown', (e) => { pid = e.pointerId; try { joy.setPointerCapture(pid); } catch (x) {} muovi(e); e.preventDefault(); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === pid) muovi(e); });
    const lascia = (e) => { if (e.pointerId !== pid) return; pid = null; this.joy = { x: 0, y: 0 }; pom.style.transform = ''; };
    joy.addEventListener('pointerup', lascia); joy.addEventListener('pointercancel', lascia);
    v.querySelectorAll('[data-az]').forEach((b) => {
      const a = b.dataset.az;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('giu'); if (a === 'scatto') this.scatto = true; else this.comando(a); });
      const su = () => { b.classList.remove('giu'); if (a === 'scatto') this.scatto = false; };
      b.addEventListener('pointerup', su); b.addEventListener('pointerleave', su); b.addEventListener('pointercancel', su);
    });
    // tastiera (computer): frecce o WASD, spazio tiro, J passaggio, L filtrante, Shift scatto
    this._kd = (e) => { const k = e.key.toLowerCase(); this.tasti[k] = true; if (k === 'shift') this.scatto = true;
      if (k === ' ' || k === 'k') { e.preventDefault(); this.comando(this.portiere ? 'tuffo' : 'tiro'); } if (k === 'j') this.comando('passaggio'); if (k === 'l') this.comando('filtrante'); };
    this._ku = (e) => { const k = e.key.toLowerCase(); this.tasti[k] = false; if (k === 'shift') this.scatto = false; };
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku);
  }
  resize(){ const r = this.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = r.width * d; this.cv.height = r.height * d; this.x.setTransform(d, 0, 0, d, 0, 0); }
  proietta(x, y){
    const W = this.W, H = this.H, top = H * 0.22, bot = H * 0.95;
    const w = W * (0.66 + 0.3 * y) / 0.56 * this.zoom;
    return { x: W / 2 + (x - this.cam) * w, y: top + (bot - top) * y, k: (0.62 + 0.42 * y) * 1.55 * Math.sqrt(this.zoom) * 0.7 };
  }
  input(){
    let x = this.joy.x, y = this.joy.y; const T = this.tasti;
    if (T.arrowleft || T.a) x = -1; if (T.arrowright || T.d) x = 1; if (T.arrowup || T.w) y = -1; if (T.arrowdown || T.s) y = 1;
    const l = Math.hypot(x, y); return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
  // ---------- comandi ----------
  comando(a){
    if (a === 'salta') return this.salta();
    if (this.esito) return;
    const b = this.b, me = this.me;
    if (this.portiere){
      if (a === 'tuffo' && me.rec <= 0 && me.tuffo <= 0){
        const j = this.input(); let dy = j.y;
        if (Math.abs(dy) < 0.25){ const pred = b.tipo === 'tiro' ? b.my + b.vy * Math.max(0, (b.mx - me.mx) / Math.max(1, -b.vx)) : b.my; dy = Math.sign(pred - me.my) || 0; }
        me.tuffo = 0.5; me.tdy = Math.sign(dy); me.tdx = j.x > 0.4 ? 1 : 0;
        // uscita sui piedi dell'attaccante
        const ch = b.owner; if (ch && ch.lato === 1 && this.dist(me, ch) < 2.2){ if (Math.random() < 0.6 + this.o.mia * 0.25) return this.finisci({ tipo: 'presa' }, 'Presa!'); }
      }
      return;
    }
    if (b.owner === me){
      if (a === 'tiro') return this.tira(me);
      if (a === 'passaggio' || a === 'filtrante'){ const c = this.scegliCompagno(); if (c) this.passa(me, c, a === 'filtrante'); }
    } else if (b.owner && b.owner.lato === 0 && (a === 'passaggio' || a === 'filtrante' || a === 'tiro')){
      // chiedi la palla al compagno
      b.owner.chiesta = true; b.owner.dec = Math.min(b.owner.dec, 0.05);
    }
  }
  dist(a, b){ return Math.hypot(a.mx - b.mx, a.my - b.my); }
  dai(p){ const b = this.b; b.owner = p; b.vx = b.vy = 0; b.h = 0; b.vh = 0; b.tipo = null; b.passTo = null; }
  scegliCompagno(){
    const me = this.me, j = this.input(); let dx = j.x, dy = j.y;
    if (Math.hypot(dx, dy) < 0.3){ dx = 1; dy = 0; }
    let best = null, bv = -9;
    this.compagni.forEach((c) => { const vx = c.mx - me.mx, vy = c.my - me.my, d = Math.hypot(vx, vy) || 1; const cos = (vx * dx + vy * dy) / d / Math.hypot(dx, dy);
      const marcato = Math.min(...this.difensori.map((x) => this.dist(x, c))); const val = cos * 1.4 - d / 45 + Math.min(marcato, 6) / 12 + (c.mx > me.mx ? 0.1 : 0); if (val > bv){ bv = val; best = c; } });
    return best;
  }
  passa(da, a, filtrante){
    const b = this.b, d = this.dist(da, a), vel = clamp(d * 0.9 + 9, 11, 24);
    const t = d / vel; let tx = a.mx + a.vx * t * 1.1, ty = a.my + a.vy * t * 1.1;
    if (filtrante){ tx += 8; ty += (34 - ty) * 0.15; a.corsa = { x: tx, y: ty, t: 1.6 }; }
    const err = (1.25 - da.sk) * (filtrante ? 2.2 : 1.2); tx += gauss() * err; ty += gauss() * err;
    const dd = Math.hypot(tx - b.mx, ty - b.my) || 1, v2 = filtrante ? vel * 1.08 : vel;
    b.owner = null; b.vx = (tx - b.mx) / dd * v2; b.vy = (ty - b.my) / dd * v2; b.h = 0; b.vh = filtrante ? 1.6 : 0; b.tipo = 'pass'; b.kicker = da; b.kickT = 0; b.passTo = a;
    this.ultimoPass = { da, t: this.tempo }; this.intercett = new Set();
  }
  tira(chi){
    const b = this.b, gk = this.gk, j = chi === this.me ? this.input() : { x: 0, y: 0 };
    const dist = Math.hypot(AZ_L - chi.mx, 34 - chi.my);
    let ty = Math.abs(j.y) > 0.3 ? 34 + clamp(j.y, -1, 1) * 2.9 : 34 + (gk.my > 34 ? -2.6 : 2.6) + (Math.random() - 0.5);
    const angolo = Math.abs(chi.my - 34) / Math.max(4, AZ_L - chi.mx);
    const sd = (0.35 + dist / 15) * (1.55 - chi.sk) * (chi === this.me && this.scatto ? 1.25 : 1) * (1 + Math.min(1.2, angolo) * 0.5);
    ty += gauss() * sd;
    const vel = clamp(30 - dist * 0.12, 20, 29), T = Math.max(0.15, (AZ_L - chi.mx) / vel);
    const hg = clamp(0.3 + Math.abs(gauss()) * sd * 0.45 + (dist > 25 ? 0.6 : 0), 0, 5);
    const dx = AZ_L + 0.5 - b.mx, dy = ty - b.my, dd = Math.hypot(dx, dy);
    b.owner = null; b.vx = dx / dd * vel; b.vy = dy / dd * vel; b.h = 0.15; b.vh = (hg - 0.15 + 4.9 * T * T) / T; b.tipo = 'tiro'; b.kicker = chi; b.kickT = 0; b.tiratore = chi; b.pass = null;
    gk.reaz = 0.16 + (1 - this.o.gk) * 0.18; this.blocchi = new Set();
  }
  // ---------- ciclo ----------
  loop(t){
    if (this.chiuso) return;
    const dt = Math.min(0.04, (t - this.t) / 1000); this.t = t;
    this.passo(dt);
    for (const p of this.tutti){ p.x = p.mx / AZ_L; p.y = p.my / AZ_A; const v = Math.hypot(p.vx / AZ_L, p.vy / AZ_A); p.v = p.v * 0.8 + v * 0.2; p.fase += dt * (4 + p.v * 60); if (Math.abs(p.vx) > 0.3) p.dir = p.vx > 0 ? 1 : -1; }
    this.palla.x = this.b.mx / AZ_L; this.palla.y = this.b.my / AZ_A;
    this.script = this.b.h > 0.05 ? { t: Math.asin(Math.min(1, this.b.h * 0.3 / 0.6)) / Math.PI * 0.7 } : null;
    const camT = this.portiere ? clamp(this.b.mx / AZ_L - 0.04, 0.22, 0.5) : clamp(this.b.mx / AZ_L + 0.07, 0.25, 0.8);
    this.cam += (camT - this.cam) * Math.min(1, dt * 2.2);
    if (this.flash > 0) this.flash -= dt * 0.8;
    this.disegna();
    this.bar.style.width = clamp(100 - this.tempo / this.limite * 100, 0, 100) + '%';
    if (this.esito && (this.fineT -= dt) <= 0) return this.chiudi(this.esito);
    requestAnimationFrame(this._f);
  }
  muovi(p, tx, ty, vmax, dt, acc = 7){
    let dx = tx - p.mx, dy = ty - p.my; const d = Math.hypot(dx, dy);
    const v = d < 0.4 ? 0 : Math.min(vmax, d * 2.5);
    const wx = d ? dx / d * v : 0, wy = d ? dy / d * v : 0;
    p.vx += (wx - p.vx) * Math.min(1, dt * acc); p.vy += (wy - p.vy) * Math.min(1, dt * acc);
    p.mx = clamp(p.mx + p.vx * dt, 0.5, AZ_L - 0.3); p.my = clamp(p.my + p.vy * dt, 0.5, AZ_A - 0.5);
  }
  passo(dt){
    this.tempo += dt; const b = this.b, R = Math.random;
    if (!this.esito && this.tempo > this.limite) this.finisci({ tipo: 'sfumata' }, this.portiere ? 'Pericolo passato' : 'Azione sfumata');
    // tu
    const me = this.me, j = this.input();
    if (this.portiere) this.passoPortiere(dt, j);
    else {
      const conPalla = b.owner === me, vmax = (this.scatto ? 8.6 : 6.2) * (conPalla ? 0.93 : 1);
      me.vx += (j.x * vmax - me.vx) * Math.min(1, dt * 8); me.vy += (j.y * vmax * 0.85 - me.vy) * Math.min(1, dt * 8);
      me.mx = clamp(me.mx + me.vx * dt, 0.5, AZ_L - 0.5); me.my = clamp(me.my + me.vy * dt, 0.5, AZ_A - 0.5);
      this.passoCampo(dt);
    }
    // la palla
    if (b.owner){
      const o = b.owner, sp = Math.hypot(o.vx, o.vy), fx = sp > 0.5 ? o.vx / sp : (o.lato ? -1 : 1), fy = sp > 0.5 ? o.vy / sp : 0;
      const tx = o.mx + fx * 0.75, ty = o.my + fy * 0.75; b.mx += (tx - b.mx) * Math.min(1, dt * 14); b.my += (ty - b.my) * Math.min(1, dt * 14); b.h = 0;
    } else {
      b.kickT += dt;
      const ox = b.mx;
      b.mx += b.vx * dt; b.my += b.vy * dt;
      if (b.h > 0 || b.vh > 0){ b.h += b.vh * dt; b.vh -= 9.8 * dt; if (b.h <= 0){ b.h = 0; b.vh = b.tipo === 'tiro' ? 0 : -b.vh * 0.3; if (b.vh < 1) b.vh = 0; } }
      const attr = b.h > 0.1 ? 0.15 : (b.tipo === 'tiro' ? 0.25 : 1.0);
      b.vx *= Math.exp(-attr * dt); b.vy *= Math.exp(-attr * dt);
      if (b.tipo === 'tiro' && !this.esito) this.controllaTiro(ox);
      if (!this.esito && b.tipo !== 'tiro' && (b.mx > AZ_L || b.mx < 0 || b.my < 0 || b.my > AZ_A)) this.finisci({ tipo: 'sfumata' }, 'Fuori dal campo');
      if (this.esito && (b.mx >= AZ_L + 1.2 || b.mx <= -1.2)){ b.vx = 0; b.vy = 0; b.mx = clamp(b.mx, -1.3, AZ_L + 1.3); }
      if (!this.esito) this.prendePalla();
    }
  }
  prendePalla(){
    const b = this.b; if (b.h > 1.7) return;
    for (const p of this.tutti){
      if (p.via || (p === b.kicker && b.kickT < 0.35)) continue;
      const d = Math.hypot(p.mx - b.mx, p.my - b.my);
      const r = p.io ? 1.4 : p.lato === 0 ? 1.2 : p.gk ? 1.6 : 1.0;
      if (d > r) continue;
      if (this.portiere){
        if (p.io) continue; // il tiro lo controlla la parata
        if (p.lato === 0){ this.dai(p); return this.finisci({ tipo: 'presa' }, 'Difesa salva!'); }
        this.dai(p); p.dec = 0.4 + Math.random() * 0.5; return;
      }
      if (p.lato === 0){
        if (b.tipo === 'pass' && b.kicker === this.me && p !== this.me){ p.dec = 0.55 + Math.random() * 0.7; p.assistDa = this.me; }
        if (b.tipo === 'pass' && p === this.me && b.kicker && b.kicker !== this.me) this.assistMio = b.kicker;
        this.dai(p); return;
      }
      // avversario
      if (b.tipo === 'pass' && this.intercett && !this.intercett.has(p)){ this.intercett.add(p); const sp = Math.hypot(b.vx, b.vy); if (Math.random() > (sp > 17 ? 0.45 : 0.75)) continue; }
      this.dai(p); return this.finisci({ tipo: 'persa' }, p.gk ? 'Il portiere blocca' : 'Palla persa');
    }
  }
  passoCampo(dt){
    const b = this.b, me = this.me, R = Math.random, gk = this.gk, dspd = this.o.dspd;
    const pos = b.owner ? b.owner : { mx: b.mx, my: b.my };
    const libera = !b.owner;
    // difensori: il più vicino pressa, il secondo copre, gli altri marcano
    const ord = this.difensori.slice().sort((a, c) => this.dist(a, pos) - this.dist(c, pos));
    const marcati = new Set();
    ord.forEach((d, i) => {
      let tx, ty, v = 5.6 * dspd;
      if (this.esito && b.owner === d){ tx = d.mx - 10; ty = d.my; v = 6; }
      else if (i === 0 || (d.insegue && i < 3) || (libera && i < 2)){ const k = libera ? 0 : 0.8; tx = pos.mx + k; ty = pos.my + (34 - pos.my) * 0.05; v = (d.insegue ? 6.6 : 6.3) * dspd; }
      else if (i === 1){ const gx = AZ_L - pos.mx, gy = 34 - pos.my, l = Math.hypot(gx, gy) || 1; tx = pos.mx + gx / l * 6; ty = pos.my + gy / l * 6; }
      else {
        const c = [me].concat(this.compagni).filter((x) => x !== b.owner && !marcati.has(x)).sort((a, c2) => this.dist(a, d) - this.dist(c2, d))[0];
        if (c){ marcati.add(c); tx = c.mx + 1.6; ty = c.my + (34 - c.my) * 0.08; } else { tx = d.hx || 90; ty = d.hy || 34; }
        tx = Math.max(tx, Math.min(88, pos.mx - 4));
      }
      this.muovi(d, tx, ty, v, dt, 5);
      // contrasto su chi ha la palla
      if (!this.esito && b.owner && b.owner.lato === 0 && this.tempo > 1.1){
        const dd = this.dist(d, b.owner);
        if (dd < 1.25){ d.tk -= dt; if (d.tk <= 0){ d.tk = 0.6; const ch = b.owner, sp = Math.hypot(ch.vx, ch.vy);
          const p = clamp(0.3 + (dspd - 1) * 0.8 - (ch.sk - 0.55) * 0.5 + (ch === me && this.scatto ? 0.06 : 0) - (sp > 5 && ch === me ? 0.06 : 0), 0.08, 0.65);
          if (R() < p){ this.dai(d); this.finisci({ tipo: 'persa' }, 'Palla persa'); } } }
        else d.tk = Math.max(d.tk, 0.25);
      }
    });
    // portiere
    if (!(this.esito && b.owner === gk)){
      if (b.tipo === 'tiro' && !b.owner && !this.esito){
        gk.reaz -= dt;
        if (gk.reaz <= 0){ const tt = Math.max(0, (gk.mx - b.mx) / Math.max(1, b.vx)), py = b.my + b.vy * tt; this.muovi(gk, 104, clamp(py, 29, 39), 7.2 + this.o.gk * 1.6, dt, 14); }
      } else {
        const vicino = pos.mx > 92 && Math.abs(pos.my - 34) < 11;
        this.muovi(gk, vicino ? Math.min(103.5, Math.max(99.5, pos.mx + 2)) : 103.8, clamp(34 + (pos.my - 34) * (vicino ? 0.8 : 0.35), 30.5, 37.5), vicino ? 5.5 : 4, dt, 6);
        if (!this.esito && vicino && b.owner && b.owner.lato === 0 && this.dist(gk, b.owner) < 1.5 && this.tempo > 1){ if (R() < dt * 2.2){ this.dai(gk); this.finisci({ tipo: 'persa' }, 'Il portiere esce e prende palla'); } }
      }
    }
    // compagni
    this.compagni.forEach((c, i) => {
      if (b.owner === c){
        if (this.esito){ c.vx *= 0.9; c.vy *= 0.9; return; }
        const pressato = this.difensori.some((d) => this.dist(d, c) < 2.4);
        this.muovi(c, Math.min(AZ_L - 6, c.mx + 6), c.my + (34 - c.my) * 0.25, 5.4, dt);
        c.dec -= dt * (pressato ? 2 : 1);
        if (c.dec <= 0){
          const vicinoPorta = c.mx > 85 && Math.abs(c.my - 34) < 14;
          if (!c.chiesta && vicinoPorta && Math.random() < 0.55) this.tira(c);
          else { const meLibero = Math.min(...this.difensori.map((d) => this.dist(d, me))) > 1.8;
            const altro = this.compagni.filter((x) => x !== c).sort((a, z) => z.mx - a.mx)[0];
            this.passa(c, c.chiesta || meLibero || !altro ? me : altro, false); }
          c.chiesta = false;
        }
        return;
      }
      if (c.corsa && c.corsa.t > 0){ c.corsa.t -= dt; this.muovi(c, c.corsa.x, c.corsa.y, 7.8, dt); return; }
      if (!b.owner && b.tipo === 'pass' && b.passTo === c){ const t = 0.35; this.muovi(c, b.mx + b.vx * t, b.my + b.vy * t, 7.5, dt); return; }
      const base = pos.mx, sway = Math.sin(this.tempo * 0.9 + i * 2) * 3;
      const tgt = [[base + 10, pos.my < 34 ? 52 : 16], [base + 15, 34 + (pos.my < 34 ? 5 : -5)], [base - 3, pos.my < 34 ? 26 : 42]][i] || [base, 34];
      this.muovi(c, clamp(tgt[0], 30, 97), clamp(tgt[1] + sway, 4, 64), 6.4, dt, 4);
    });
  }
  controllaTiro(ox){
    const b = this.b, gk = this.gk;
    if (this.portiere) return this.tiroSuDiMe(ox);
    // un difensore può respingere
    for (const d of this.difensori){ if (this.blocchi.has(d) || b.h > 1.2) continue; if (Math.hypot(d.mx - b.mx, d.my - b.my) < 0.9){ this.blocchi.add(d); if (Math.random() < 0.45){ b.vx *= -0.35; b.vy = (Math.random() - 0.5) * 8; b.tipo = null; return this.finisci({ tipo: 'parata', respinta: true, chi: b.tiratore }, 'Respinto!'); } } }
    if (ox < gk.mx - 0.2 && b.mx >= gk.mx - 0.2){
      const reach = 1.15 + this.o.gk * 0.55;
      if (Math.abs(gk.my - b.my) < reach && b.h < 2.5){ const presa = Math.random() < 0.5; b.vx = presa ? 0 : -b.vx * 0.3; b.vy = presa ? 0 : (Math.random() - 0.5) * 10; b.vh = presa ? 0 : 3; if (presa) b.owner = gk; return this.finisci({ tipo: 'parata', chi: b.tiratore }, 'Parata!'); }
    }
    if (b.mx >= AZ_L){
      const dy = Math.abs(b.my - 34);
      if (b.h > 2.44 && dy < AZ_P + 0.3) return this.finisci({ tipo: 'fuori', chi: b.tiratore }, b.h < 2.7 ? 'Traversa!' : 'Alto!');
      if (dy < AZ_P - 0.12){ this.flash = 1; return this.finisci({ tipo: 'gol', chi: b.tiratore }, 'GOL!'); }
      if (dy < AZ_P + 0.25){ b.vx *= -0.4; return this.finisci({ tipo: 'palo', chi: b.tiratore }, 'Palo!'); }
      return this.finisci({ tipo: 'fuori', chi: b.tiratore }, 'Fuori!');
    }
  }
  // ---------- da portiere ----------
  passoPortiere(dt, j){
    const me = this.me, b = this.b, att = this.att, R = Math.random;
    if (me.tuffo > 0){ me.tuffo -= dt; me.vx = me.tdx * 3; me.vy = me.tdy * 7.6; me.mx = clamp(me.mx + me.vx * dt, 0.3, 16); me.my = clamp(me.my + me.vy * dt, 22, 46); if (me.tuffo <= 0) me.rec = 0.55; }
    else if (me.rec > 0){ me.rec -= dt; me.vx *= 0.8; me.vy *= 0.8; }
    else { const v = this.scatto ? 6.2 : 4.8; me.vx += (j.x * v - me.vx) * Math.min(1, dt * 9); me.vy += (j.y * v - me.vy) * Math.min(1, dt * 9); me.mx = clamp(me.mx + me.vx * dt, 0.3, 16); me.my = clamp(me.my + me.vy * dt, 22, 46); }
    // attaccanti
    [this.att, this.att2].forEach((a) => {
      if (b.owner === a){
        if (this.esito) return;
        const ty = 34 + (a.my - 34) * 0.55; this.muovi(a, 5, ty, 6.2 * this.o.dspd, dt);
        a.dec -= dt;
        if ((a.dec <= 0 && a.mx < 24) || a.mx < 9 || this.dist(a, me) < 3.2 && R() < dt * 3){
          const altro = a === this.att ? this.att2 : this.att;
          if (a.mx > 14 && R() < 0.22 && altro.mx < a.mx + 4) this.passa(a, altro, false);
          else this.tiraVersoMe(a);
        }
      } else if (!this.esito){ const o = b.owner || { mx: b.mx, my: b.my }; this.muovi(a, Math.max(7, o.mx - 2), a === this.att ? 34 + (o.my - 34) * 0.4 : (o.my < 34 ? o.my + 14 : o.my - 14), 6, dt, 4); }
    });
    // i tuoi difensori rincorrono
    this.miei.forEach((d, i) => {
      const o = b.owner || { mx: b.mx, my: b.my };
      this.muovi(d, o.mx - 0.6, o.my + (i ? 0.6 : -0.6), 6.1, dt, 5);
      if (!this.esito && b.owner && b.owner.lato === 1 && this.dist(d, b.owner) < 1.2){ d.tk -= dt; if (d.tk <= 0){ d.tk = 0.7; if (R() < 0.16){ this.dai(d); this.finisci({ tipo: 'presa', difesa: true }, 'Difesa salva!'); } } }
    });
  }
  tiraVersoMe(a){
    const b = this.b, me = this.me, R = Math.random;
    const lato = me.my > 34 ? -1 : me.my < 34 ? 1 : (R() < 0.5 ? -1 : 1);
    let ty = 34 + (R() < 0.75 ? lato : -lato) * (1.2 + R() * 2.2) + gauss() * 0.6;
    const dist = Math.hypot(a.mx, 34 - a.my), vel = clamp(27 - dist * 0.1, 19, 27), T = Math.max(0.2, a.mx / vel);
    const hg = clamp(0.25 + R() * 1.8, 0, 2.8);
    const dx = -0.6 - b.mx, dy = ty - b.my, dd = Math.hypot(dx, dy);
    b.owner = null; b.vx = dx / dd * vel; b.vy = dy / dd * vel; b.h = 0.15; b.vh = (hg - 0.15 + 4.9 * T * T) / T; b.tipo = 'tiro'; b.kicker = a; b.kickT = 0; b.tiratore = a;
    this.msg.textContent = '';
  }
  tiroSuDiMe(ox){
    const b = this.b, me = this.me;
    if (ox > me.mx + 0.2 && b.mx <= me.mx + 0.2){
      const reach = (me.tuffo > 0 ? 1.75 : 0.9) + this.o.mia * 0.3;
      if (Math.abs(me.my - b.my) < reach && b.h < 2.5){ const presa = me.tuffo <= 0 || Math.random() < 0.35; b.vx = presa ? 0 : -b.vx * 0.35; b.vy = presa ? 0 : (Math.random() - 0.5) * 10; b.vh = presa ? 0 : 2.5; if (presa) b.owner = me; return this.finisci({ tipo: 'parata' }, presa ? 'Bloccata!' : 'Che parata!'); }
    }
    if (b.mx <= 0){
      const dy = Math.abs(b.my - 34);
      if (b.h > 2.44 || dy > AZ_P + 0.25) return this.finisci({ tipo: 'fuori' }, 'Fuori!');
      if (dy > AZ_P - 0.12){ b.vx *= -0.4; return this.finisci({ tipo: 'fuori', palo: true }, 'Palo!'); }
      return this.finisci({ tipo: 'golSubito', chi: b.tiratore }, 'Gol subito');
    }
  }
  // ---------- disegno ----------
  omino(...a){ return Partita.prototype.omino.apply(this, a); }
  disegna(){
    Partita.prototype.disegna.call(this);
    const c = this.x, base = this.H / 300;
    // il cerchio sotto il compagno a cui passeresti
    if (!this.portiere && this.b.owner === this.me && !this.esito){ const t = this.scegliCompagno(); if (t){ const q = this.proietta(t.x, t.y), s = q.k * base; c.strokeStyle = 'rgba(56,189,248,.95)'; c.lineWidth = 2; c.beginPath(); c.ellipse(q.x, q.y, 10 * s, 3.6 * s, 0, 0, 7); c.stroke(); } }
    // la freccia sopra di te
    const q = this.proietta(this.me.x, this.me.y), s = q.k * base * 1.02, y = q.y - 47 * s, pul = Math.sin(performance.now() / 160) * 2;
    c.fillStyle = '#22d3ee'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(q.x - 6, y - 8 + pul); c.lineTo(q.x + 6, y - 8 + pul); c.lineTo(q.x, y + pul); c.closePath(); c.fill(); c.stroke();
  }
  // ---------- fine ----------
  finisci(es, testo){
    if (this.esito) return;
    es.passatoDaMe = !!(this.ultimoPass && this.ultimoPass.da === this.me && es.chi && es.chi !== this.me);
    if (es.chi === this.me){ es.io = true; if (this.assistMio) es.assist = this.assistMio; }
    if (es.chi && es.chi.p) es.p = es.chi.p;
    this.esito = es; this.fineT = es.tipo === 'gol' || es.tipo === 'golSubito' ? 1.9 : 1.4;
    const buono = es.tipo === 'gol' || (this.portiere && (es.tipo === 'parata' || es.tipo === 'presa' || es.tipo === 'fuori'));
    this.msg.textContent = testo; this.msg.className = 'az-msg via ' + (buono ? 'buono' : 'male');
    if (es.tipo === 'gol'){ try { Suono.boato(1.2); coriandoli([this.o.colNoi.c1, this.o.colNoi.c2, '#d4af37', '#fff'], 90); } catch (e) {} }
    else if (es.tipo === 'parata' || es.tipo === 'palo' || es.tipo === 'fuori'){ try { Suono.ooh(); } catch (e) {} }
  }
  salta(){
    if (this.esito) return this.chiudi(this.esito);
    const R = Math.random(), k = this.o.mia;
    let es;
    if (this.portiere) es = R < 0.38 + k * 0.25 ? { tipo: 'parata' } : R < 0.8 ? { tipo: 'golSubito', chi: this.att } : { tipo: 'fuori' };
    else es = R < 0.14 + k * 0.18 ? { tipo: 'gol', chi: this.me } : R < 0.5 ? { tipo: 'parata', chi: this.me } : R < 0.68 ? { tipo: 'fuori', chi: this.me } : { tipo: 'persa' };
    if (es.chi === this.me) es.io = true; if (es.chi && es.chi.p) es.p = es.chi.p; es.saltata = true;
    this.chiudi(es);
  }
  chiudi(es){
    if (this.chiuso) return; this.chiuso = true;
    removeEventListener('resize', this._r); removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku);
    this.v.remove(); this.o.fine && this.o.fine(es);
  }
}

// quante azioni ti toccano in una partita e quando
function azioniPartita(ruolo, durata){
  const n = { A: 5, C: 4, D: 3, P: 3 }[ruolo] || 4, L = [];
  let m = 4 + Math.random() * 8;
  for (let i = 0; i < n && m < durata - 3; i++){ L.push(m); m += (durata - 10) / n * (0.7 + Math.random() * 0.6); }
  return L;
}
