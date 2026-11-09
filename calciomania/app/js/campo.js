// ============ PARTITA GIOCATA: carriera da giocatore, comandi il tuo giocatore per tutta la partita ============
// Campo in metri: x 0..105, y 0..68. La squadra di casa (lato 0) attacca verso destra.
const CL = 105, CA = 68, CPO = 3.66;
const dirL = (l) => l ? -1 : 1;           // verso dove attacca
const portaL = (l) => l ? 0 : CL;         // la porta dove tira
const miaPortaL = (l) => l ? CL : 0;      // la porta che difende

class Campo {
  constructor(o){
    this.o = o; this.D = o.D;
    this.info = { casa: o.colH, ospiti: o.colA };
    this.vista = 'tv'; this.zoom = 1.45; this.flash = 0; this.script = null; this.cam = 0.5;
    this.folla = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), c: Math.random() < 0.5 ? o.colH.c1 : (Math.random() < 0.5 ? o.colH.c2 : o.colA.c1), f: Math.random() * 6 }));
    this.palla = { x: 0.5, y: 0.5 };
    this.b = { mx: 52.5, my: 34, vx: 0, vy: 0, h: 0, vh: 0, owner: null, tipo: null, kicker: null, kickT: 9, passTo: null, ultimo: 0 };
    this.joy = { x: 0, y: 0 }; this.scatto = false; this.tasti = {};
    this.tempo = 0; this.min = 0; this.durata = 90 + (o.D.rec || 0); this.reale = (o.minuti || 3) * 60 * this.durata / 90;
    this.gol = [0, 0]; this.poss = [0.01, 0.01]; this.pausaT = 0; this.dopoPausa = null; this.meta = false; this.finito = false;
    this.creaGiocatori();
    this.creaDom();
    this.calcioInizio(0);
    this.pausaT = 1.2; this.mostra('Si parte!', 'buono');
    try { Suono.avviaFolla(); Suono.fischio(1); } catch (e) {}
    this.t = performance.now(); this._f = (t) => this.loop(t); requestAnimationFrame(this._f);
  }
  creaGiocatori(){
    const o = this.o;
    this.sq = [0, 1].map((lato) => {
      const pts = Partita.prototype.formazione.call(null, lato ? o.modA : o.modH, lato), g = lato ? o.giocA : o.giocH;
      return pts.map((pt, i) => {
        const d = g[i] || { via: true }, h = hashStr((d.nome || '') + lato + i);
        return { lato, i, gk: i === 0, via: !!d.via, p: d.p, io: !!(d.p && d.p.io), num: d.num || (i + 1), nome: d.nome || '', sk: d.sk == null ? 0.5 : d.sk,
          hx: pt.bx * CL, hy: pt.by * CA, mx: pt.bx * CL, my: pt.by * CA, vx: 0, vy: 0, x: pt.bx, y: pt.by, v: 0, fase: h % 7, dir: dirL(lato),
          pelle: PELLI[h % PELLI.length], capelli: CAPELLI[(h >> 4) % CAPELLI.length], taglio: (h >> 8) % 4, dec: 1, tk: 0, ferma: 0 };
      });
    });
    this.tutti = this.sq[0].concat(this.sq[1]).filter((p) => !p.via);
    this.me = this.tutti.find((p) => p.io) || this.sq[0][1];
    this.me.io = true;
  }
  // ---------- schermo ----------
  creaDom(){
    const o = this.o, v = document.createElement('div'); v.className = 'azione campo-g'; v.id = 'campoG';
    const gk = this.me.gk;
    v.innerHTML = `<div class="az-top"><div class="cg-sb"><span class="cg-sq" style="--c:${o.colH.c1}">${esc(o.nomeH)}</span><b class="cg-ris">0 - 0</b><span class="cg-sq" style="--c:${o.colA.c1}">${esc(o.nomeA)}</span><small class="cg-min">0’</small></div><button class="az-salta" data-az="simula">Simula</button></div>
      <div class="az-wrap"><canvas></canvas><div class="az-msg"></div></div>
      <div class="az-ctrl"><div class="az-joy"><div class="az-pom"></div></div><div class="az-btns">
        ${gk ? `<button class="az-b filt" data-az="rinvio">RINVIO</button><button class="az-b tiro" data-az="tuffo">TUFFO</button>` : `<button class="az-b filt" data-az="filtrante">FILTRANTE</button><button class="az-b tiro" data-az="tiro">TIRO</button>`}
        <button class="az-b pass" data-az="passaggio">PASSAGGIO</button><button class="az-b scatto" data-az="scatto">SCATTO</button></div></div>`;
    document.body.appendChild(v); document.body.classList.add('in-partita'); this.v = v;
    this.cv = v.querySelector('canvas'); this.x = this.cv.getContext('2d'); this.msg = v.querySelector('.az-msg');
    this.elRis = v.querySelector('.cg-ris'); this.elMin = v.querySelector('.cg-min');
    this.bTiro = v.querySelector('[data-az=tiro],[data-az=tuffo]'); this.bPass = v.querySelector('[data-az=passaggio]');
    this.resize(); this._r = () => this.resize(); addEventListener('resize', this._r);
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
    this._kd = (e) => { const k = e.key.toLowerCase(); this.tasti[k] = true; if (k === 'shift') this.scatto = true;
      if (k === ' ' || k === 'k'){ e.preventDefault(); this.comando(this.me.gk ? 'tuffo' : 'tiro'); } if (k === 'j') this.comando('passaggio'); if (k === 'l') this.comando(this.me.gk ? 'rinvio' : 'filtrante'); };
    this._ku = (e) => { const k = e.key.toLowerCase(); this.tasti[k] = false; if (k === 'shift') this.scatto = false; };
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku);
  }
  resize(){ const r = this.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = r.width * d; this.cv.height = r.height * d; this.x.setTransform(d, 0, 0, d, 0, 0); }
  proietta(x, y){
    const W = this.W, H = this.H, top = H * 0.22, bot = H * 0.95;
    const w = W * (0.66 + 0.3 * y) / 0.56 * this.zoom;
    return { x: W / 2 + (x - this.cam) * w, y: top + (bot - top) * y, k: (0.62 + 0.42 * y) * 1.55 * Math.sqrt(this.zoom) * 0.7 };
  }
  omino(...a){ return Partita.prototype.omino.apply(this, a); }
  mostra(t, cl){ this.msg.textContent = t; this.msg.className = 'az-msg'; void this.msg.offsetWidth; this.msg.className = 'az-msg via ' + (cl || ''); }
  input(){
    let x = this.joy.x, y = this.joy.y; const T = this.tasti;
    if (T.arrowleft || T.a) x = -1; if (T.arrowright || T.d) x = 1; if (T.arrowup || T.w) y = -1; if (T.arrowdown || T.s) y = 1;
    const l = Math.hypot(x, y); return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
  dist(a, b){ return Math.hypot(a.mx - b.mx, a.my - b.my); }
  // ---------- calcio d'inizio ----------
  calcioInizio(lato){
    const b = this.b;
    this.tutti.forEach((p) => { p.mx = p.lato ? Math.max(p.hx, 56) : Math.min(p.hx, 49); p.my = p.hy; p.vx = p.vy = 0; p.dec = 1; p.ferma = 0; p.tuffo = 0; });
    const k = this.sq[lato].filter((p) => !p.via && !p.gk).sort((a, c) => Math.abs(a.hx - 52.5) - Math.abs(c.hx - 52.5))[0];
    k.mx = 52.5 + (lato ? 0.6 : -0.6); k.my = 34;
    b.mx = 52.5; b.my = 34; b.vx = b.vy = 0; b.h = 0; b.vh = 0;
    this.dai(k); k.dec = 0.5;
  }
  dai(p){ const b = this.b; b.owner = p; b.vx = b.vy = 0; b.h = 0; b.vh = 0; b.tipo = null; b.passTo = null; b.ultimo = p.lato; p.dec = p.gk ? 1.1 : 0.45 + Math.random() * 0.9; p.chiesta = false; }
  // ---------- comandi ----------
  comando(a){
    if (a === 'simula') return this.simula();
    if (this.finito || this.pausaT > 0) return;
    const b = this.b, me = this.me;
    if (me.gk && a === 'tuffo'){
      if (b.owner === me) return this.passa(me, this.lontano(me), true);
      if ((me.tuffo || 0) <= 0 && (me.rec || 0) <= 0){
        const j = this.input(); let dy = j.y;
        if (Math.abs(dy) < 0.25){ const vx = b.vx || 0.001, tt = Math.max(0, (me.mx - b.mx) / vx); dy = Math.sign(b.my + b.vy * Math.min(tt, 1) - me.my); }
        me.tuffo = 0.5; me.tdy = Math.sign(dy) || 1;
        if (b.owner && b.owner.lato !== me.lato && this.dist(me, b.owner) < 2.2 && Math.random() < 0.55 + me.sk * 0.25) this.dai(me);
      }
      return;
    }
    if (b.owner === me){
      if (a === 'tiro') return this.tira(me);
      if (a === 'rinvio') return this.passa(me, this.lontano(me), true);
      if (a === 'passaggio' || a === 'filtrante'){ const c = this.scegliCompagno(me, true); if (c) this.passa(me, c, a === 'filtrante'); }
      return;
    }
    if (b.owner && b.owner.lato === me.lato){ b.owner.chiesta = true; b.owner.dec = Math.min(b.owner.dec, 0.08); return; }
    // contrasto
    if (b.owner && b.owner.lato !== me.lato && (me.tk || 0) <= 0){
      me.tk = 0.8;
      if (this.dist(me, b.owner) < 2){ const p = clamp(0.45 + (me.sk - b.owner.sk) * 0.5, 0.15, 0.75); if (Math.random() < p){ const vecchio = b.owner; vecchio.ferma = 0.6; this.dai(me); this.mostra('Palla rubata!', 'buono'); } else { me.ferma = 0.35; } }
    }
  }
  lontano(da){ return this.sq[da.lato].filter((p) => !p.via && !p.gk && p !== da).sort((a, c) => (c.mx - a.mx) * dirL(da.lato))[0]; }
  scegliCompagno(da, umano){
    let dx, dy;
    if (umano){ const j = this.input(); dx = j.x; dy = j.y; if (Math.hypot(dx, dy) < 0.3){ dx = dirL(da.lato); dy = 0; } }
    const nem = this.sq[1 - da.lato].filter((p) => !p.via);
    let best = null, bv = -99;
    this.sq[da.lato].forEach((c) => {
      if (c.via || c === da || (c.gk && !umano)) return;
      const vx = c.mx - da.mx, vy = c.my - da.my, d = Math.hypot(vx, vy) || 1;
      const libero = Math.min(8, ...nem.map((n) => this.dist(n, c)));
      let val = libero / 8 - d / 40 + (vx * dirL(da.lato)) / 35 - (d > 38 ? 1.5 : 0);
      if (umano){ val += ((vx * dx + vy * dy) / d / Math.hypot(dx, dy)) * 1.6; }
      else if (c.io) val += 0.55;
      if (c.gk) val -= 1.2;
      if (val > bv){ bv = val; best = c; }
    });
    return best;
  }
  passa(da, a, lungo){
    if (!a) return;
    const b = this.b, d = this.dist(da, a), vel = clamp(d * 0.85 + 9, 11, 26);
    const t = d / vel; let tx = a.mx + a.vx * t, ty = a.my + a.vy * t;
    if (lungo && !da.gk){ tx += dirL(da.lato) * 7; ty += (34 - ty) * 0.12; a.corsa = { x: tx, y: ty, t: 1.4 }; }
    const err = (1.25 - da.sk) * (lungo ? 2 : 1.1); tx += gauss() * err; ty += gauss() * err;
    const dd = Math.hypot(tx - b.mx, ty - b.my) || 1, v2 = vel * (lungo ? 1.08 : 1);
    b.owner = null; b.vx = (tx - b.mx) / dd * v2; b.vy = (ty - b.my) / dd * v2; b.h = 0; b.vh = lungo ? Math.min(7, d * 0.15) : 0;
    b.tipo = 'pass'; b.kicker = da; b.kickT = 0; b.passTo = a; b.ultimo = da.lato; b.intercett = new Set();
  }
  tira(chi){
    const b = this.b, L = chi.lato, gx = portaL(L), gk = this.sq[1 - L][0];
    const j = chi === this.me ? this.input() : { x: 0, y: 0 };
    const dist = Math.hypot(gx - chi.mx, 34 - chi.my);
    let ty = Math.abs(j.y) > 0.3 ? 34 + clamp(j.y, -1, 1) * 2.9 : 34 + (gk.my > 34 ? -2.6 : 2.6) + (Math.random() - 0.5);
    const ang = Math.abs(chi.my - 34) / Math.max(4, Math.abs(gx - chi.mx));
    const sd = (0.35 + dist / 15) * (1.55 - chi.sk) * (chi === this.me && this.scatto ? 1.25 : 1) * (1 + Math.min(1.2, ang) * 0.5);
    ty += gauss() * sd;
    const vel = clamp(30 - dist * 0.12, 20, 29), T = Math.max(0.15, Math.abs(gx - chi.mx) / vel);
    const hg = clamp(0.3 + Math.abs(gauss()) * sd * 0.45 + (dist > 25 ? 0.6 : 0), 0, 5);
    const dx = gx + dirL(L) * 0.5 - b.mx, dy = ty - b.my, dd = Math.hypot(dx, dy);
    b.owner = null; b.vx = dx / dd * vel; b.vy = dy / dd * vel; b.h = 0.15; b.vh = (hg - 0.15 + 4.9 * T * T) / T;
    b.tipo = 'tiro'; b.kicker = chi; b.kickT = 0; b.tiratore = chi; b.ultimo = L; b.blocchi = new Set();
    gk.reaz = 0.16 + (1 - gk.sk) * 0.18;
    this.D.st.tiri[L]++;
  }
  // ---------- ciclo ----------
  loop(t){
    if (this.chiuso) return;
    const dt = Math.min(0.04, (t - this.t) / 1000); this.t = t;
    if (this.pausaT > 0){ this.pausaT -= dt; if (this.pausaT <= 0 && this.dopoPausa){ const f = this.dopoPausa; this.dopoPausa = null; f(); } }
    else if (!this.finito) this.passo(dt);
    for (const p of this.tutti){ p.x = p.mx / CL; p.y = p.my / CA; const v = Math.hypot(p.vx / CL, p.vy / CA); p.v = p.v * 0.8 + v * 0.2; p.fase += dt * (4 + p.v * 60); if (Math.abs(p.vx) > 0.3) p.dir = p.vx > 0 ? 1 : -1; }
    this.palla.x = this.b.mx / CL; this.palla.y = this.b.my / CA;
    this.script = this.b.h > 0.05 ? { t: Math.asin(Math.min(1, this.b.h * 0.3 / 0.6)) / Math.PI * 0.7 } : null;
    const camT = clamp(this.b.mx / CL * 0.75 + this.me.mx / CL * 0.25, 0.24, 0.76);
    this.cam += (camT - this.cam) * Math.min(1, dt * 2);
    if (this.flash > 0) this.flash -= dt * 0.8;
    this.disegna(); this.hud();
    requestAnimationFrame(this._f);
  }
  hud(){
    const m = Math.min(this.durata, Math.floor(this.min));
    const ris = `${this.gol[0]} - ${this.gol[1]}`; if (this._ris !== ris){ this._ris = ris; this.elRis.textContent = ris; }
    const mm = this.finito ? 'Fine' : (m > 90 ? '90+' + (m - 90) : m > 45 && !this.meta ? '45+' + (m - 45) : m) + '’'; if (this._mm !== mm){ this._mm = mm; this.elMin.textContent = mm; }
    if (!this.me.gk){ const b = this.b, lt = b.owner && b.owner.lato !== this.me.lato ? 'CONTRASTO' : 'TIRO', lp = b.owner && b.owner.lato === this.me.lato && b.owner !== this.me ? 'DAMMI PALLA' : 'PASSAGGIO';
      if (this._lt !== lt){ this._lt = lt; this.bTiro.textContent = lt; } if (this._lp !== lp){ this._lp = lp; this.bPass.textContent = lp; } }
  }
  muovi(p, tx, ty, vmax, dt, acc = 6){
    const dx = tx - p.mx, dy = ty - p.my, d = Math.hypot(dx, dy);
    const v = d < 0.4 ? 0 : Math.min(vmax, d * 2.2);
    const wx = d ? dx / d * v : 0, wy = d ? dy / d * v : 0;
    p.vx += (wx - p.vx) * Math.min(1, dt * acc); p.vy += (wy - p.vy) * Math.min(1, dt * acc);
    p.mx = clamp(p.mx + p.vx * dt, 0.3, CL - 0.3); p.my = clamp(p.my + p.vy * dt, 0.3, CA - 0.3);
  }
  passo(dt){
    this.tempo += dt; this.min = this.tempo / this.reale * this.durata;
    const b = this.b;
    if (b.owner) this.poss[b.owner.lato] += dt;
    if (!this.meta && this.min >= 45 && !b.tipo){ this.meta = true; this.D.ev.push({ min: 45.5, tipo: 'int', t: 'Fine primo tempo. Tutti negli spogliatoi.' }); this.mostra('Fine primo tempo'); try { Suono.fischio(2); } catch (e) {} this.pausaT = 2; this.dopoPausa = () => { this.calcioInizio(1); this.mostra('Secondo tempo!', 'buono'); try { Suono.fischio(1); } catch (e) {} }; return; }
    if (this.min >= this.durata && !b.tipo) return this.fischioFinale();
    this.passoMe(dt);
    this.passoAI(dt);
    this.passoPalla(dt);
  }
  passoMe(dt){
    const me = this.me, b = this.b, j = this.input();
    me.tk = Math.max(0, (me.tk || 0) - dt);
    if (me.ferma > 0){ me.ferma -= dt; me.vx *= 0.85; me.vy *= 0.85; return; }
    if (me.gk){
      const x0 = miaPortaL(me.lato), dmin = Math.min(x0, CL - x0);
      if (me.tuffo > 0){ me.tuffo -= dt; me.vy = me.tdy * 7.6; me.vx *= 0.8; if (me.tuffo <= 0) me.rec = 0.5; }
      else if (me.rec > 0){ me.rec -= dt; me.vx *= 0.8; me.vy *= 0.8; }
      else { const v = this.scatto ? 6.4 : 5; me.vx += (j.x * v - me.vx) * Math.min(1, dt * 9); me.vy += (j.y * v - me.vy) * Math.min(1, dt * 9); }
      me.mx = clamp(me.mx + me.vx * dt, me.lato ? CL - 17 : 0.3, me.lato ? CL - 0.3 : 17); me.my = clamp(me.my + me.vy * dt, 13, 55);
      if (b.owner === me){ me.tieni = (me.tieni || 0) + dt; if (me.tieni > 5){ me.tieni = 0; this.passa(me, this.scegliCompagno(me, false), false); } } else me.tieni = 0;
      return;
    }
    const conPalla = b.owner === me, vmax = (this.scatto ? 8.6 : 6.3) * (conPalla ? 0.93 : 1) * (0.94 + me.sk * 0.12);
    me.vx += (j.x * vmax - me.vx) * Math.min(1, dt * 8); me.vy += (j.y * vmax * 0.85 - me.vy) * Math.min(1, dt * 8);
    me.mx = clamp(me.mx + me.vx * dt, 0.3, CL - 0.3); me.my = clamp(me.my + me.vy * dt, 0.3, CA - 0.3);
  }
  passoAI(dt){
    const b = this.b, R = Math.random, pos = b.owner || { mx: b.mx, my: b.my };
    const pt = b.owner ? b.owner.lato : b.ultimo;
    for (const L of [0, 1]){
      const sq = this.sq[L].filter((p) => !p.via), d = dirL(L);
      // chi va sul pallone: i due più vicini quando difendi, uno quando la palla è libera
      const caccia = new Set();
      if (pt !== L || !b.owner){ sq.filter((p) => !p.gk && !p.io).sort((a, c) => this.dist(a, pos) - this.dist(c, pos)).slice(0, b.owner ? 2 : 1).forEach((p) => caccia.add(p)); }
      sq.forEach((p) => {
        if (p.io) return;
        p.tk = Math.max(0, (p.tk || 0) - dt);
        if (p.ferma > 0){ p.ferma -= dt; p.vx *= 0.85; p.vy *= 0.85; p.mx += p.vx * dt; p.my += p.vy * dt; return; }
        const spd = 0.9 + p.sk * 0.2;
        if (b.owner === p) return this.portaPalla(p, dt, spd);
        if (p.gk) return this.portiereAI(p, dt);
        if (b.tipo === 'pass' && b.passTo === p && !b.owner){ const t = 0.35; return this.muovi(p, b.mx + b.vx * t, b.my + b.vy * t, 7 * spd, dt); }
        if (p.corsa && p.corsa.t > 0){ p.corsa.t -= dt; return this.muovi(p, p.corsa.x, p.corsa.y, 7.4 * spd, dt); }
        if (caccia.has(p)){ const k = b.owner ? 0.7 : 0; return this.muovi(p, pos.mx - d * k, pos.my, 6.3 * spd, dt, 5); }
        const att = pt === L, spinta = att ? 13 : -3;
        let tx = p.hx + d * spinta + (b.mx - 52.5) * 0.6, ty = p.hy + (b.my - p.hy) * 0.28 + Math.sin(this.tempo * 0.6 + p.i * 1.7) * 2.5;
        if (att && p.hx * d > (L ? -CL : 0) && Math.abs(p.hx - miaPortaL(L)) > 50) tx += d * 4;
        tx = clamp(tx, 3, CL - 3);
        // da difensore resta fra l'avversario e la porta
        if (!att){ const lim = miaPortaL(L) + d * 2; if ((tx - lim) * d < 0) tx = lim; }
        this.muovi(p, tx, clamp(ty, 3, CA - 3), 5.4 * spd, dt, 4);
        // contrasto
        if (b.owner && b.owner.lato !== L && !b.owner.gk && this.tempo > 0.5 && this.dist(p, b.owner) < 1.2 && p.tk <= 0){
          p.tk = 0.6; const ow = b.owner, pr = clamp(0.24 + (p.sk - ow.sk) * 0.5 - (ow === this.me && Math.hypot(ow.vx, ow.vy) > 5 ? 0.04 : 0) + (ow === this.me && this.scatto ? 0.05 : 0), 0.07, 0.5);
          if (R() < pr){ ow.ferma = 0.5; this.dai(p); if (ow === this.me) this.mostra('Palla persa', 'male'); }
        }
      });
      // anche chi caccia può contrastare
      caccia.forEach((p) => { if (b.owner && b.owner.lato !== L && !b.owner.gk && this.dist(p, b.owner) < 1.2 && p.tk <= 0 && this.tempo > 0.5){ p.tk = 0.6; const ow = b.owner, pr = clamp(0.26 + (p.sk - ow.sk) * 0.5 + (ow === this.me && this.scatto ? 0.05 : 0), 0.08, 0.5); if (R() < pr){ ow.ferma = 0.5; this.dai(p); if (ow === this.me) this.mostra('Palla persa', 'male'); } } });
    }
  }
  portaPalla(p, dt, spd){
    const b = this.b, L = p.lato, gx = portaL(L), R = Math.random;
    const nem = this.sq[1 - L].filter((x) => !x.via), press = Math.min(...nem.map((n) => this.dist(n, p)));
    if (p.gk){ this.muovi(p, miaPortaL(L) + dirL(L) * 6, 34, 3, dt); p.dec -= dt; if (p.dec <= 0) this.passa(p, this.scegliCompagno(p, false), R() < 0.4); return; }
    this.muovi(p, gx - dirL(L) * 4, 34 + (p.my - 34) * 0.7, 5.6 * spd, dt);
    p.dec -= dt * (press < 2.6 ? 2.2 : 1);
    if (p.chiesta && p.lato === this.me.lato){ p.chiesta = false; return this.passa(p, this.me, false); }
    if (p.dec > 0) return;
    const dg = Math.hypot(gx - p.mx, 34 - p.my), ang = Math.abs(p.my - 34) / Math.max(3, Math.abs(gx - p.mx));
    if (dg < 25 && ang < 1.1 && R() < 0.5 + (dg < 16 ? 0.25 : 0)) return this.tira(p);
    if (press > 7 && R() < 0.5){ p.dec = 0.6; return; }
    this.passa(p, this.scegliCompagno(p, false), R() < 0.15);
  }
  portiereAI(p, dt){
    const b = this.b, L = p.lato, x0 = miaPortaL(L), d = dirL(L);
    if (b.tipo === 'tiro' && !b.owner && b.ultimo !== L){
      p.reaz = (p.reaz || 0) - dt;
      if (p.reaz <= 0){ const tt = Math.max(0, (p.mx - b.mx) / (b.vx || 0.001)), py = b.my + b.vy * tt; this.muovi(p, x0 + d * 1, clamp(py, 29, 39), 7.2 + p.sk * 1.6, dt, 14); }
      return;
    }
    const vic = Math.abs(b.mx - x0) < 12 && Math.abs(b.my - 34) < 12;
    this.muovi(p, vic ? x0 + d * Math.min(6, Math.max(1.5, Math.abs(b.mx - x0) - 2)) : x0 + d * 1.5, clamp(34 + (b.my - 34) * (vic ? 0.8 : 0.3), 30.5, 37.5), vic ? 5.5 : 4, dt);
    if (vic && b.owner && b.owner.lato !== L && this.dist(p, b.owner) < 1.5 && Math.random() < dt * 2){ b.owner.ferma = 0.4; this.dai(p); if (b.owner === this.me) this.mostra('Il portiere prende palla', 'male'); }
  }
  passoPalla(dt){
    const b = this.b;
    if (b.owner){
      const o = b.owner, sp = Math.hypot(o.vx, o.vy), fx = sp > 0.5 ? o.vx / sp : dirL(o.lato), fy = sp > 0.5 ? o.vy / sp : 0;
      b.mx += (o.mx + fx * 0.75 - b.mx) * Math.min(1, dt * 14); b.my += (o.my + fy * 0.75 - b.my) * Math.min(1, dt * 14); b.h = 0;
      return;
    }
    b.kickT += dt;
    const ox = b.mx;
    b.mx += b.vx * dt; b.my += b.vy * dt;
    if (b.h > 0 || b.vh > 0){ b.h += b.vh * dt; b.vh -= 9.8 * dt; if (b.h <= 0){ b.h = 0; b.vh = b.tipo === 'tiro' ? 0 : -b.vh * 0.3; if (b.vh < 1) b.vh = 0; } }
    const attr = b.h > 0.1 ? 0.15 : (b.tipo === 'tiro' ? 0.25 : 0.9);
    b.vx *= Math.exp(-attr * dt); b.vy *= Math.exp(-attr * dt);
    if (b.tipo === 'tiro' && this.controllaTiro(ox)) return;
    if (b.my < 0 || b.my > CA) return this.rimessa();
    if (b.mx < 0 || b.mx > CL) return this.fondo(b.mx < 0 ? 0 : CL);
    this.prendePalla();
  }
  prendePalla(){
    const b = this.b; if (b.h > 2.2) return;
    let migliore = null, dm = 9;
    for (const p of this.tutti){
      if (p.via || p.ferma > 0 || (p === b.kicker && b.kickT < 0.35)) continue;
      const r = p.io ? 1.4 : p.gk ? 1.7 : 1.05, d = Math.hypot(p.mx - b.mx, p.my - b.my);
      if (d > r || (b.h > 1.7 && !p.gk)) continue;
      if (b.tipo === 'pass' && b.kicker && p.lato !== b.kicker.lato && b.intercett){ if (b.intercett.has(p)) continue; b.intercett.add(p); const sp = Math.hypot(b.vx, b.vy); if (Math.random() > (sp > 17 ? 0.4 : 0.7)) continue; }
      if (d < dm){ dm = d; migliore = p; }
    }
    if (!migliore) return;
    const p = migliore;
    if (b.tipo === 'pass' && b.kicker && b.kicker.lato === p.lato){ p.ricDa = b.kicker; p.ricT = this.tempo; }
    else { p.ricDa = null; }
    if (p.gk && b.tipo === 'tiro') return;
    this.dai(p);
    if (p === this.me && navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
  }
  controllaTiro(ox){
    const b = this.b, L = b.tiratore.lato, gx = portaL(L), gk = this.sq[1 - L][0], d = dirL(L), D = this.D;
    for (const p of this.sq[1 - L]){ if (p.via || p.gk || b.blocchi.has(p) || b.h > 1.2) continue; if (Math.hypot(p.mx - b.mx, p.my - b.my) < 0.9){ b.blocchi.add(p); if (Math.random() < 0.4){ b.vx *= -0.3; b.vy = (Math.random() - 0.5) * 8; b.tipo = null; b.ultimo = p.lato; return false; } } }
    if (!gk.via && (ox - gk.mx) * d < 0 && (b.mx - gk.mx) * d >= 0){
      const io = gk === this.me, reach = io ? ((gk.tuffo > 0 ? 1.75 : 0.95) + gk.sk * 0.3) : 1.15 + gk.sk * 0.55;
      if (Math.abs(gk.my - b.my) < reach && b.h < 2.5){
        D.st.porta[L]++; if (gk.p && D.pers[gk.p.id]) D.pers[gk.p.id].par++;
        const presa = Math.random() < 0.5;
        if (presa){ this.dai(gk); gk.dec = 1.2; } else { b.vx = -b.vx * 0.3; b.vy = (Math.random() - 0.5) * 10; b.vh = 3; b.tipo = null; b.ultimo = gk.lato; }
        if (io || b.tiratore === this.me || gk.lato === this.me.lato) this.mostra(io ? 'Che parata!' : 'Parata!', gk.lato === this.me.lato ? 'buono' : 'male');
        try { Suono.ooh(); } catch (e) {}
        if (io && this.D.pers[gk.p.id]) this.D.pers[gk.p.id].az = (this.D.pers[gk.p.id].az || 0) + 0.15;
        return true;
      }
    }
    if ((b.mx - gx) * d >= 0){
      const dy = Math.abs(b.my - 34);
      if (b.h < 2.44 && dy < CPO - 0.12){ this.segna(L); return true; }
      if (dy < CPO + 0.25 && b.h < 2.7){ b.vx *= -0.4; b.vy *= 0.5; b.tipo = null; b.mx = gx - d * 0.3; if (b.tiratore === this.me) this.mostra(b.h > 2.3 ? 'Traversa!' : 'Palo!', 'male'); try { Suono.ooh(); } catch (e) {} return true; }
      if (b.tiratore === this.me) this.mostra('Fuori!', 'male');
      this.fondo(gx); return true;
    }
    return false;
  }
  segna(L){
    const b = this.b, D = this.D, chi = b.tiratore, noi = this.o.D.noi;
    this.gol[L]++; D.gol[L]++; D.st.porta[L]++;
    const ass = chi.ricDa && this.tempo - chi.ricT < 9 && chi.ricDa.lato === L ? chi.ricDa : null;
    const min = Math.max(1, Math.ceil(this.min));
    if (chi.p && D.pers[chi.p.id]) D.pers[chi.p.id].gol++; if (ass && ass.p && D.pers[ass.p.id]) D.pers[ass.p.id].ass++;
    const nome = chi.p ? nomeG(chi.p) : chi.nome, nAss = ass && ass.p ? nomeG(ass.p) : '';
    D.marc.push({ lato: L, min, id: chi.p && chi.p.id, nome, ass: nAss, assId: ass && ass.p && ass.p.id });
    D.ev.push({ min: this.min, tipo: 'gol', lato: L, mio: L === noi, nome, t: (chi === this.me ? `GOOOL di ${nome}! L’hai segnato tu!` : frase(L === noi ? 'gol' : 'golAvv', nome)) + (nAss ? ` Assist di ${nAss}.` : '') });
    this.flash = 1; this.mostra(chi === this.me ? 'GOL TUO!' : 'GOL!', L === this.me.lato ? 'buono' : 'male');
    try { Suono.boato(L === this.me.lato ? 1.2 : 0.6); } catch (e) {}
    if (L === this.me.lato) try { coriandoli([this.o.colMio.c1, this.o.colMio.c2, '#d4af37', '#fff'], 90); if (navigator.vibrate) navigator.vibrate([80, 40, 120]); } catch (e) {}
    b.vx *= 0.2; b.vy *= 0.2; b.tipo = 'gol';
    this.pausaT = 2.2; this.dopoPausa = () => this.calcioInizio(1 - L);
  }
  rimessa(){
    const b = this.b, L = 1 - b.ultimo, y = b.my < 0 ? 0.8 : CA - 0.8, x = clamp(b.mx, 2, CL - 2);
    const p = this.sq[L].filter((q) => !q.via && !q.gk && !q.io).sort((a, c) => Math.hypot(a.mx - x, a.my - y) - Math.hypot(c.mx - x, c.my - y))[0];
    const me = this.me, chi = me.lato === L && !me.gk && Math.hypot(me.mx - x, me.my - y) < 8 ? me : p;
    chi.mx = x; chi.my = y; b.mx = x; b.my = y; this.dai(chi); chi.dec = 0.7;
  }
  fondo(x0){
    const b = this.b, difende = x0 === CL ? 1 : 0; // chi difende quella porta
    if (b.ultimo !== difende){ // rinvio dal fondo
      const gk = this.sq[difende][0]; gk.mx = x0 + dirL(difende) * 5; gk.my = 34; b.mx = gk.mx; b.my = 34; this.dai(gk); gk.dec = 1;
    } else { // calcio d'angolo
      const L = 1 - difende, y = b.my < 34 ? 0.8 : CA - 0.8, x = x0 === CL ? CL - 0.8 : 0.8;
      const p = this.sq[L].filter((q) => !q.via && !q.gk).sort((a, c) => Math.hypot(a.mx - x, a.my - y) - Math.hypot(c.mx - x, c.my - y))[0];
      p.mx = x; p.my = y; b.mx = x; b.my = y; this.dai(p); p.dec = 1; this.D.st.corner[L]++;
      this.sq[L].forEach((q) => { if (!q.via && !q.gk && q !== p && !q.io && Math.abs(q.hx - x0) < 60) { q.corsa = { x: x0 - dirL(L) * (6 + Math.random() * 8), y: 26 + Math.random() * 16, t: 1.5 }; } });
    }
    b.tipo = null;
  }
  // ---------- disegno ----------
  disegna(){
    Partita.prototype.disegna.call(this);
    const c = this.x, base = this.H / 300, me = this.me, b = this.b;
    if (b.owner === me && !me.gk){ const t = this.scegliCompagno(me, true); if (t){ const q = this.proietta(t.x, t.y), s = q.k * base; c.strokeStyle = 'rgba(56,189,248,.95)'; c.lineWidth = 2; c.beginPath(); c.ellipse(q.x, q.y, 10 * s, 3.6 * s, 0, 0, 7); c.stroke(); } }
    const q = this.proietta(me.x, me.y), s = q.k * base * 1.02, y = q.y - 47 * s, pul = Math.sin(performance.now() / 160) * 2;
    if (q.x < -4 || q.x > this.W + 4){ const sx = q.x < 0 ? 14 : this.W - 14, sy = clamp(q.y - 20, 30, this.H - 30), dd = q.x < 0 ? -1 : 1;
      c.fillStyle = '#22d3ee'; c.beginPath(); c.moveTo(sx + dd * 10, sy); c.lineTo(sx - dd * 4, sy - 9); c.lineTo(sx - dd * 4, sy + 9); c.closePath(); c.fill();
    } else { c.fillStyle = '#22d3ee'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(q.x - 6, y - 8 + pul); c.lineTo(q.x + 6, y - 8 + pul); c.lineTo(q.x, y + pul); c.closePath(); c.fill(); c.stroke(); }
    // radar del campo
    const rw = Math.min(112, this.W * 0.27), rh = rw * CA / CL, rx = (this.W - rw) / 2, ry = this.H - rh - 6;
    c.fillStyle = 'rgba(5,25,12,.55)'; c.fillRect(rx, ry, rw, rh); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.strokeRect(rx, ry, rw, rh); c.beginPath(); c.moveTo(rx + rw / 2, ry); c.lineTo(rx + rw / 2, ry + rh); c.stroke();
    this.tutti.forEach((p) => { c.fillStyle = p.io ? '#22d3ee' : (p.lato ? this.o.colA.c1 : this.o.colH.c1); c.beginPath(); c.arc(rx + p.x * rw, ry + p.y * rh, p.io ? 3 : 1.8, 0, 7); c.fill(); if (!p.io){ c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); } });
    c.fillStyle = '#fff'; c.beginPath(); c.arc(rx + this.palla.x * rw, ry + this.palla.y * rh, 2, 0, 7); c.fill();
  }
  // ---------- fine ----------
  esitoBase(){ const t = this.poss[0] + this.poss[1]; return { pos0: Math.round(this.poss[0] / t * 100), min: this.min }; }
  fischioFinale(){
    if (this.finito) return; this.finito = true;
    try { Suono.fischio(3); Suono.fermaFolla(); } catch (e) {}
    this.D.ev.push({ min: this.durata, tipo: 'fine', t: 'Triplice fischio! Partita finita.' });
    this.riepilogo(false);
  }
  simula(){
    if (this.finito) return;
    chiedi('Vuoi far finire la partita da sola? Il resto lo giocano i tuoi compagni.', () => { chiudiFoglio(true); this.finito = true; try { Suono.fermaFolla(); } catch (e) {} this.riepilogo(true); });
  }
  riepilogo(simulata){
    const r = Object.assign(this.esitoBase(), { simulata });
    this.o.fine(r); // aggiorna la partita (se simulata la finisce il motore)
    const D = this.D, me = this.me, P = (me.p && D.pers[me.p.id]) || {}, o = this.o;
    const box = document.createElement('div'); box.className = 'cg-fine';
    box.innerHTML = `<div class="cg-fine-in"><h2>Partita finita</h2><div class="cg-fris"><span>${esc(o.nomeH)}</span><b>${D.gol[0]} - ${D.gol[1]}</b><span>${esc(o.nomeA)}</span></div>
      <div class="cg-io"><div><small>Gol</small><b>${P.gol || 0}</b></div><div><small>Assist</small><b>${P.ass || 0}</b></div>${me.gk ? `<div><small>Parate</small><b>${P.par || 0}</b></div>` : ''}</div>
      ${simulata ? '<p class="tenue">Il resto della partita l’hanno giocato i tuoi compagni.</p>' : ''}
      <button class="btn largo oro" data-cg="ok">Continua</button></div>`;
    this.v.appendChild(box);
    box.querySelector('[data-cg=ok]').onclick = () => this.chiudi();
  }
  chiudi(){
    if (this.chiuso) return; this.chiuso = true;
    removeEventListener('resize', this._r); removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku);
    try { Suono.fermaFolla(); } catch (e) {}
    this.v.remove(); document.body.classList.remove('in-partita');
    this.o.dopo && this.o.dopo();
  }
}

// la carriera da giocatore: se sei in campo, la partita la giochi tu
function giocaPartitaVera(D){
  const noi = D.noi, avv = D.avv, club = S.club;
  const mioK = kitDi(club, !D.casa), stessi = (x, y) => String(x).toLowerCase() === String(y).toLowerCase();
  const loroK = { c1: stessi(avv.c1, mioK.c1) ? (avv.c2 || '#ffffff') : avv.c1, c2: stessi(avv.c1, mioK.c1) ? avv.c1 : (avv.c2 || '#ffffff') };
  const colH = D.casa ? mioK : loroK, colA = D.casa ? loroK : mioK;
  const tm = tierMedia(S.tier), sk = (p) => clamp(0.45 + (p.val - tm) / 40, 0.25, 0.95);
  const g = (sq, forza) => sq.slots.map((s) => s.p && !s.esp ? { p: s.p, num: s.p.num || '', nome: s.p.c, sk: forza != null ? clamp(sk(s.p) + forza, 0.2, 0.95) : sk(s.p) } : { via: true });
  // gli avversari: forza dalla loro squadra e dal livello
  const F = D.sq[1 - noi].forza || {}, mediaA = ((F.dif || tm) + (F.cen || tm) + (F.att || tm)) / 3, extra = (mediaA - tm) / 60 + (S.diff || 0) * 0.03 - 0.04;
  const nomeH = D.casa ? club.nome : avv.nome, nomeA = D.casa ? avv.nome : club.nome;
  new Campo({ D, colH: Object.assign({ nome: nomeH }, colH), colA: Object.assign({ nome: nomeA }, colA), colMio: mioK, nomeH, nomeA,
    modH: D.sq[0].mod, modA: D.sq[1].mod, giocH: g(D.sq[0], noi === 0 ? null : extra), giocA: g(D.sq[1], noi === 1 ? null : extra), minuti: S.opz.durataP || 3,
    fine: (r) => {
      const giocati = Math.max(1, Math.floor(r.min));
      D.st.poss = [r.pos0 * giocati, (100 - r.pos0) * giocati];
      if (r.simulata){ D.simMin = Math.min(giocati, 90 + D.rec - 1); finisciDiretta(D); }
      else { D.simMin = 90 + D.rec; D.fine = true; }
    },
    dopo: () => { chiudiDiretta(D); Dir = null; sincronizza(false, true); } });
}
