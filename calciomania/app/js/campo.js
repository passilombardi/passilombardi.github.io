// ============ PARTITA GIOCATA: carriera da giocatore, comandi il tuo giocatore per tutta la partita ============
// Campo in metri: x 0..105, y 0..68. La squadra di casa (lato 0) attacca verso destra.
const CL = 105, CA = 68, CPO = 3.66;
const dirL = (l) => l ? -1 : 1;           // verso dove attacca
const portaL = (l) => l ? 0 : CL;         // la porta dove tira
const miaPortaL = (l) => l ? CL : 0;      // la porta che difende

class Campo {
  constructor(o){
    this.o = o; this.D = o.D; Campo.ultimo = this;
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
    const gk = this.me.gk, sigla = (n) => esc(String(n || '').replace(/^(US|ASD|AC|SS|FC|GS|Pol\.|Polisportiva|Atletico|Sporting|Real|Virtus|Oratorio|Unione|Sportiva)\s+/i, '').slice(0, 3).toUpperCase());
    v.innerHTML = `<div class="az-wrap"><canvas></canvas><div class="az-msg"></div></div>
      <div class="az-top"><div class="cg-sb"><i style="background:${o.colH.c1}"></i><span class="cg-sq">${sigla(o.nomeH)}</span><b class="cg-ris">0 - 0</b><span class="cg-sq">${sigla(o.nomeA)}</span><i style="background:${o.colA.c1}"></i><small class="cg-min">0’</small></div><button class="az-salta" data-az="simula">Simula</button></div><div class="cg-info"></div>
      <div class="az-ctrl"><div class="az-joy"><div class="az-pom"></div></div><div class="az-btns${gk ? '' : ' sei'}">
        ${gk ? `<button class="az-b filt" data-az="rinvio">RINVIO</button><button class="az-b tiro" data-az="tuffo">TUFFO</button>
        <button class="az-b pass" data-az="passaggio">PASSAGGIO</button><button class="az-b scatto" data-az="scatto"><span>SCATTO</span><em class="cg-fiato"><i></i></em></button>`
        : `<button class="az-b abil" data-az="abilita">ABILITÀ</button><button class="az-b cross" data-az="cross">CROSS</button><button class="az-b filt" data-az="filtrante">FILTRANTE</button>
        <button class="az-b scatto" data-az="scatto"><span>SCATTO</span><em class="cg-fiato"><i></i></em></button><button class="az-b pass" data-az="passaggio">PASSAGGIO</button><button class="az-b tiro" data-az="tiro"><span>TIRO</span><em class="cg-pot"><i></i></em></button>`}</div></div>
      <div class="cg-gira"><div class="cg-tel"></div><b>Gira il telefono in orizzontale</b><small>La partita si gioca col telefono girato, come alla TV. Se il telefono non gira, controlla che la rotazione automatica sia accesa.</small><button class="az-salta" data-az="simulaSubito">Simula la partita</button></div>`;
    document.body.appendChild(v); document.body.classList.add('in-partita'); this.v = v;
    this.cv = v.querySelector('canvas'); this.x = this.cv.getContext('2d'); this.msg = v.querySelector('.az-msg');
    this.elRis = v.querySelector('.cg-ris'); this.elMin = v.querySelector('.cg-min');
    this.bTiro = v.querySelector('[data-az=tiro] span,[data-az=tuffo]'); this.bPass = v.querySelector('[data-az=passaggio]');
    this.elPot = v.querySelector('.cg-pot i'); this.elFiato = v.querySelector('.cg-fiato i');
    this.bFilt = v.querySelector('[data-az=filtrante]'); this.bCross = v.querySelector('[data-az=cross]'); this.bAbil = v.querySelector('[data-az=abilita]'); this.elInfo = v.querySelector('.cg-info');
    // a schermo intero e in orizzontale (dove il telefono lo permette)
    try { const el = document.documentElement; const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
      const gira = () => { try { const r = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
      if (p && p.then) p.then(gira).catch(gira); else gira(); } catch (e) {}
    this.resize(); this._r = () => this.resize(); addEventListener('resize', this._r);
    const joy = v.querySelector('.az-joy'), pom = v.querySelector('.az-pom'); let pid = null;
    const muovi = (e) => { const r = joy.getBoundingClientRect(), R = r.width / 2; let dx = (e.clientX - r.left - R) / (R * 0.7), dy = (e.clientY - r.top - R) / (R * 0.7); const l = Math.hypot(dx, dy); if (l > 1){ dx /= l; dy /= l; } this.joy = { x: dx, y: dy }; pom.style.transform = `translate(${dx * R * 0.55}px,${dy * R * 0.55}px)`; };
    joy.addEventListener('pointerdown', (e) => { pid = e.pointerId; try { joy.setPointerCapture(pid); } catch (x) {} muovi(e); e.preventDefault(); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === pid) muovi(e); });
    const lascia = (e) => { if (e.pointerId !== pid) return; pid = null; this.joy = { x: 0, y: 0 }; pom.style.transform = ''; };
    joy.addEventListener('pointerup', lascia); joy.addEventListener('pointercancel', lascia);
    v.querySelectorAll('[data-az]').forEach((b) => {
      const a = b.dataset.az;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('giu'); if (a === 'scatto') this.scatto = true; else if (a === 'tiro') this.inizioTiro(); else this.comando(a); });
      const su = () => { if (!b.classList.contains('giu')) return; b.classList.remove('giu'); if (a === 'scatto') this.scatto = false; if (a === 'tiro') this.fineTiro(); };
      b.addEventListener('pointerup', su); b.addEventListener('pointerleave', su); b.addEventListener('pointercancel', su);
    });
    this._kd = (e) => { const k = e.key.toLowerCase(); if (this.tasti[k]) return; this.tasti[k] = true; if (k === 'shift') this.scatto = true;
      if (k === ' ' || k === 'k'){ e.preventDefault(); if (this.me.gk) this.comando('tuffo'); else this.inizioTiro(); } if (k === 'j') this.comando('passaggio'); if (k === 'l') this.comando(this.me.gk ? 'rinvio' : 'filtrante'); if (k === 'c' || k === 'u') this.comando('cross'); if (k === 'i' || k === 'e') this.comando('abilita'); };
    this._ku = (e) => { const k = e.key.toLowerCase(); this.tasti[k] = false; if (k === 'shift') this.scatto = false; if ((k === ' ' || k === 'k') && !this.me.gk) this.fineTiro(); };
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku);
  }
  // tieni premuto TIRO per caricare, lascia per tirare
  inizioTiro(){
    if (this.finito || this.pausaT > 0) return;
    const b = this.b;
    if (b.owner === this.me){ this.carica = this.me.rigore ? 0.25 : 0.05; return; }
    this.comando('tiro');
  }
  fineTiro(){
    if (this.carica == null) return;
    const pot = clamp(this.carica, 0.15, 1); this.carica = null; this.elPot && (this.elPot.style.width = '0%');
    if (this.b.owner === this.me && !this.finito) this.tira(this.me, pot);
  }
  resize(){
    const r = this.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = r.width * d; this.cv.height = r.height * d; this.x.setTransform(d, 0, 0, d, 0, 0);
    // telecamera TV: alta sulla tribuna, guarda il campo di sbieco
    const C = this.camera = { y: CA + 40, z: 30 }; let fy = 32 - C.y, fz = -C.z; const l = Math.hypot(fy, fz); fy /= l; fz /= l;
    C.fy = fy; C.fz = fz; C.uy = fz; C.uz = -fy;
    const H = this.H, W = this.W; C.F = Math.min(H * 2.05, W * 1.05);
    const n = this.p3(52.5, CA, 0, true);
    C.cy = H * 1.0 - n.y;
    if (this.camX == null) this.camX = 52.5;
  }
  // punto del campo (metri, altezza z) sullo schermo
  p3(X, Y, Z, crudo){
    const C = this.camera, py = Y - C.y, pz = Z - C.z, d = Math.max(0.5, py * C.fy + pz * C.fz), s = C.F / d;
    return { x: this.W / 2 + (X - (crudo ? 52.5 : this.camX)) * s, y: (C.cy || 0) - (py * C.uy + pz * C.uz) * s, s, d };
  }
  proietta(x, y){ const q = this.p3(x * CL, y * CA, 0); return { x: q.x, y: q.y, k: q.s * 1.85 / 40 / 1.02 * 1.65 }; }
  omino(...a){ return Partita.prototype.omino.apply(this, a); }
  banner(t){ const e = this.elInfo; if (!e) return; e.textContent = t; e.classList.remove('su'); void e.offsetWidth; e.classList.add('su'); clearTimeout(this._inf); this._inf = setTimeout(() => e.classList.remove('su'), 2600); }
  cartellino(col, nome){ const d = document.createElement('div'); d.className = 'cg-cart ' + col; d.innerHTML = `<i></i><b>${esc(nome)}</b><small>${col === 'giallo' ? 'Ammonito' : 'Espulso'}</small>`; this.v.appendChild(d); setTimeout(() => d.remove(), 2400); }
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
    this.tutti.forEach((p) => { p.mx = p.lato ? Math.max(p.hx, 56) : Math.min(p.hx, 49); p.my = p.hy; p.vx = p.vy = 0; p.dec = 1; p.ferma = 0; p.tuffo = 0; p.corsa = null; p.scivola = 0; p.aTerra = 0; p.barriera = 0; });
    this.piazzato = null; this.inRigore = false;
    const k = this.sq[lato].filter((p) => !p.via && !p.gk).sort((a, c) => Math.abs(a.hx - 52.5) - Math.abs(c.hx - 52.5))[0];
    k.mx = 52.5 + (lato ? 0.6 : -0.6); k.my = 34;
    b.mx = 52.5; b.my = 34; b.vx = b.vy = 0; b.h = 0; b.vh = 0;
    this.dai(k); k.dec = 0.5;
  }
  dai(p){ const b = this.b; b.owner = p; b.vx = b.vy = 0; b.h = 0; b.vh = 0; b.tipo = null; b.passTo = null; b.fuori = null; b.rigore = false; b.ultimo = p.lato; p.dec = p.gk ? 1.0 : 0.25 + Math.random() * 0.55; p.chiesta = false; p.punizione = p.rigore = p.angolo = p.noOff = false; }
  // la palla è partita da un calcio piazzato: tutti liberi di muoversi
  calciato(da){ da.punizione = da.rigore = da.angolo = false; this.piazzato = null; this.inRigore = false; this.tutti.forEach((p) => { p.barriera = 0; }); }
  // fuorigioco: u = quanto sei avanti verso la porta avversaria
  u(L, x){ return L ? CL - x : x; }
  lineaFuori(L){ const us = this.sq[1 - L].filter((p) => !p.via).map((p) => this.u(L, p.mx)).sort((a, c) => c - a); return Math.max(52.5, us.length > 1 ? us[1] : 52.5, this.u(L, this.b.mx)); }
  inFuori(p){ return !p.gk && this.u(p.lato, p.mx) > this.lineaFuori(p.lato) + 0.4; }
  // ---------- comandi ----------
  comando(a){
    if (a === 'simula') return this.simula();
    if (a === 'simulaSubito'){ if (this.finito) return; this.finito = true; try { Suono.fermaFolla(); } catch (e) {} return this.riepilogo(true); }
    if (this.finito || this.pausaT > 0 || this.me.via) return;
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
      if (me.rigore && a !== 'tiro') return;
      if (a === 'tiro') return this.tira(me);
      if (a === 'rinvio') return this.passa(me, this.lontano(me), true);
      if (a === 'passaggio' || a === 'filtrante'){ const c = this.scegliCompagno(me, true); if (c) this.passa(me, c, a === 'filtrante'); }
      if (a === 'cross') return this.cross(me);
      if (a === 'abilita') return this.finta(me);
      return;
    }
    // la palla ce l'ha un compagno: chiedila
    if (b.owner && b.owner.lato === me.lato){
      if (a === 'abilita') return;
      b.owner.chiesta = a === 'filtrante' ? 'lungo' : a === 'cross' ? 'cross' : true; b.owner.dec = Math.min(b.owner.dec, 0.08);
      if (a === 'filtrante'){ me.corsaIo = 1.2; this.banner('Lanciami!'); } else if (a === 'cross') this.banner('Crossa in area!');
      return;
    }
    if (this.piazzato || this.inRigore) return;
    if (a === 'abilita'){ this.pressT = 2.5; this.banner('Pressing!'); return; }
    if (a === 'cross') return this.scivolata(me);
    // colpo di testa: la palla è in aria vicino a te
    if (a === 'tiro' && !b.owner && b.h > 0.5 && Math.hypot(b.mx - me.mx, b.my - me.my) < 4.5){ me.testa = 0.6; me.saltoT = 0.5; return; }
    // contrasto
    if (a === 'tiro' && b.owner && b.owner.lato !== me.lato && (me.tk || 0) <= 0){
      me.tk = 0.8;
      if (this.dist(me, b.owner) < 2){
        const ow = b.owner, p = clamp(0.45 + (me.sk - ow.sk) * 0.5 - (ow.finta > 0 ? 0.3 : 0), 0.12, 0.75);
        if (Math.random() < p){ ow.ferma = 0.6; this.dai(me); this.mostra('Palla rubata!', 'buono'); }
        else if (Math.random() < 0.22) this.fallo(me, ow, 1);
        else me.ferma = 0.35;
      }
    }
  }
  // dribbling: finta, doppio passo, elastico... chi ti è vicino può restare sul posto
  finta(p){
    if ((p.fintaCd || 0) > 0 || p.punizione || p.rigore) return;
    p.finta = 0.55; p.fintaCd = 1.3; if (p.io) p.fiato = Math.max(0, (p.fiato == null ? 1 : p.fiato) - 0.1);
    const j = p.io ? this.input() : { x: dirL(p.lato), y: (Math.random() - 0.5) * 1.4 };
    let dx = j.x, dy = j.y; if (Math.hypot(dx, dy) < 0.3){ dx = dirL(p.lato); dy = 0; } const l = Math.hypot(dx, dy); p.fdx = dx / l; p.fdy = dy / l;
    let saltati = 0;
    this.sq[1 - p.lato].forEach((n) => { if (n.via || n.gk || this.dist(n, p) > 3.2) return; if (Math.random() < clamp(0.5 + (p.sk - n.sk) * 0.7, 0.2, 0.85)){ n.ferma = 0.75; n.tk = 1; saltati++; } });
    if (p.io){ const nomi = ['Doppio passo!', 'Elastico!', 'Veronica!', 'Finta di corpo!', 'Sombrero!', 'Tunnel!', 'Ruleta!']; this.banner(saltati ? nomi[(Math.random() * nomi.length) | 0] + (saltati > 1 ? ` Ne salti ${saltati}!` : '') : 'Finta!'); }
  }
  scivolata(p){
    if ((p.scivola || 0) > 0 || p.ferma > 0 || (p.tk || 0) > 0) return;
    const b = this.b, j = p.io ? this.input() : { x: 0, y: 0 };
    let dx = j.x, dy = j.y; const tg = b.owner || b;
    if (Math.hypot(dx, dy) < 0.3){ dx = tg.mx - p.mx; dy = tg.my - p.my; }
    const l = Math.hypot(dx, dy) || 1; p.sdx = dx / l; p.sdy = dy / l; p.scivola = 0.5; p.scHit = false; p.tk = 1.4; p.dir = p.sdx >= 0 ? 1 : -1;
    if (p.io) p.fiato = Math.max(0, (p.fiato == null ? 1 : p.fiato) - 0.08);
  }
  // in scivolata: scivoli in avanti, se prendi la palla è tua, se prendi l'uomo è fallo
  passoScivolata(p, dt){
    if (!(p.scivola > 0)) return false;
    const b = this.b; p.scivola -= dt; const v = 3 + 16 * Math.max(0, p.scivola);
    p.vx = p.sdx * v; p.vy = p.sdy * v; p.mx = clamp(p.mx + p.vx * dt, 0.3, CL - 0.3); p.my = clamp(p.my + p.vy * dt, 0.3, CA - 0.3);
    if (!p.scHit){
      const ow = b.owner;
      if (ow && ow.lato !== p.lato && !ow.gk && this.dist(p, ow) < 1.7){
        p.scHit = true;
        const sp = Math.hypot(ow.vx, ow.vy) || 1, dietro = ((ow.mx - p.mx) * ow.vx + (ow.my - p.my) * ow.vy) / sp / (this.dist(p, ow) || 1) > 0.55;
        const ok = clamp(0.55 + (p.sk - ow.sk) * 0.6 - (dietro ? 0.35 : 0) - (ow.finta > 0 ? 0.3 : 0), 0.1, 0.85);
        if (Math.random() < ok){ b.owner = null; b.vx = p.sdx * 9 + ow.vx * 0.3; b.vy = p.sdy * 9; b.h = 0; b.vh = 0; b.tipo = null; b.kicker = p; b.kickT = 0; b.ultimo = p.lato; ow.ferma = 0.6; ow.aTerra = 0.5; if (p.io || ow.io) this.mostra(p.io ? 'Scivolata!' : 'Palla persa', p.io ? 'buono' : 'male'); }
        else if (Math.random() < (dietro ? 0.85 : 0.5)) this.fallo(p, ow, dietro ? 2.2 : 1.5);
      } else if (!ow && b.h < 0.6 && Math.hypot(b.mx - p.mx, b.my - p.my) < 1.5){ p.scHit = true; b.vx = p.sdx * 10; b.vy = p.sdy * 10; b.kicker = p; b.kickT = 0; b.ultimo = p.lato; b.tipo = null; }
    }
    if (p.scivola <= 0){ p.ferma = 0.5; p.aTerra = 0.5; }
    return true;
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
      if (umano){ val += ((vx * dx + vy * dy) / d / Math.hypot(dx, dy)) * 1.6; if (!da.noOff && this.inFuori(c)) val -= 0.6; }
      else { if (c.io && !c.via) val += 0.95; if (!da.noOff && this.inFuori(c)) val -= 3; if (c.corsa && c.corsa.t > 0) val += 0.3; }
      if (c.gk) val -= 1.2;
      if (val > bv){ bv = val; best = c; }
    });
    return best;
  }
  passa(da, a, lungo){
    if (!a) return;
    const b = this.b, d = this.dist(da, a), vel = clamp(d * 0.9 + 10, 12, 28);
    const fuori = !da.noOff && this.inFuori(a) ? a : null; this.calciato(da);
    const t = d / vel; let tx = a.mx + a.vx * t, ty = a.my + a.vy * t;
    if (lungo && !da.gk){ tx += dirL(da.lato) * 7; ty += (34 - ty) * 0.12; a.corsa = { x: tx, y: ty, t: 1.4 }; }
    const err = (1.25 - da.sk) * (lungo ? 2 : 1.1); tx += gauss() * err; ty += gauss() * err;
    const dd = Math.hypot(tx - b.mx, ty - b.my) || 1, v2 = vel * (lungo ? 1.08 : 1);
    b.owner = null; b.vx = (tx - b.mx) / dd * v2; b.vy = (ty - b.my) / dd * v2; b.h = 0; b.vh = lungo ? Math.min(7, d * 0.15) : 0;
    b.tipo = 'pass'; b.kicker = da; b.kickT = 0; b.passTo = a; b.ultimo = da.lato; b.intercett = new Set(); b.fuori = fuori;
  }
  // cross in area: palla alta verso chi è in mezzo
  cross(da, a){
    const b = this.b, L = da.lato, d = dirL(L), gx = portaL(L), R = Math.random;
    if (!a || a.via){ const c = this.sq[L].filter((p) => !p.via && !p.gk && p !== da && Math.abs(gx - p.mx) < 22 && Math.abs(p.my - 34) < 15).sort((p, q) => (q.io ? 1.5 : 0) - (p.io ? 1.5 : 0) + Math.hypot(p.mx - (gx - d * 9), p.my - 34) / 10 - Math.hypot(q.mx - (gx - d * 9), q.my - 34) / 10); a = c[0] || null; }
    let tx, ty; if (a){ tx = a.mx + a.vx * 0.7; ty = a.my + a.vy * 0.7; } else { tx = gx - d * (8 + R() * 4); ty = 34 + (da.my < 34 ? 4 : -4); }
    const fuori = a && !da.noOff && this.inFuori(a) ? a : null; this.calciato(da);
    const err = (1.3 - da.sk) * 2.2; tx += gauss() * err; ty += gauss() * err;
    const dist = Math.max(4, Math.hypot(tx - b.mx, ty - b.my)), vel = clamp(dist * 0.5 + 10, 13, 24), T = dist / vel * 1.06;
    b.owner = null; b.vx = (tx - b.mx) / dist * vel; b.vy = (ty - b.my) / dist * vel; b.h = 0.1; b.vh = (1.7 - 0.1 + 4.9 * T * T) / T;
    b.tipo = 'cross'; b.kicker = da; b.kickT = 0; b.passTo = a; b.ultimo = L; b.intercett = new Set(); b.testate = new Set(); b.fuori = fuori;
    const posti = [[gx - d * 6, 30.5], [gx - d * 9.5, 34], [gx - d * 6.5, 38.5], [gx - d * 15, 34]]; let k = 0;
    this.sq[L].forEach((p) => { if (p.via || p.gk || p === da || p.io || p === a || k >= posti.length || Math.abs(gx - p.mx) > 45) return; const q = posti[k++]; p.corsa = { x: q[0], y: q[1] + (R() - 0.5) * 3, t: 1.8 }; });
    if (a && !a.io) a.corsa = { x: tx, y: ty, t: T + 0.3 };
    if (da.io) this.banner('Cross!');
  }
  tira(chi, pot, testa){
    pot = pot == null ? 0.55 + Math.random() * 0.3 : pot;
    const b = this.b, L = chi.lato, gx = portaL(L), gk = this.sq[1 - L][0], rig = !!chi.rigore, h0 = testa ? clamp(b.h, 1.2, 2.4) : 0.15;
    const j = chi === this.me ? this.input() : { x: 0, y: 0 };
    const dist = Math.hypot(gx - chi.mx, 34 - chi.my);
    let ty = Math.abs(j.y) > 0.3 ? 34 + clamp(j.y, -1, 1) * 2.9 : rig && chi === this.me ? 34 : 34 + (gk.my > 34 ? -2.6 : 2.6) + (Math.random() - 0.5);
    if (rig && chi !== this.me) ty = 34 + (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 1.1);
    b.puniz = !!chi.punizione; this.calciato(chi); b.rigore = rig; if (rig) gk.guess = Math.random() < 0.44 ? -1 : Math.random() < 0.8 ? 1 : 0;
    const ang = Math.abs(chi.my - 34) / Math.max(4, Math.abs(gx - chi.mx));
    const sd = (rig ? 0.3 : (0.35 + dist / 15) * (1 + Math.min(1.2, ang) * 0.5)) * (1.55 - chi.sk) * (chi === this.me && this.scatto ? 1.25 : 1) * (0.8 + Math.abs(pot - 0.6) * 0.9) * (testa ? 1.35 : 1);
    ty += gauss() * sd;
    const vel = testa ? 14 + chi.sk * 6 : clamp(30 - dist * 0.12, 20, 29) * (0.72 + pot * 0.4), T = Math.max(0.15, Math.abs(gx - chi.mx) / vel);
    const hg = testa ? clamp(0.25 + Math.abs(gauss()) * 0.9, 0, 3) : clamp(0.3 + Math.abs(gauss()) * sd * 0.45 + (dist > 25 ? 0.6 : 0) + Math.max(0, pot - 0.85) * 9, 0, 6);
    const dx = gx + dirL(L) * 0.5 - b.mx, dy = ty - b.my, dd = Math.hypot(dx, dy);
    b.owner = null; b.vx = dx / dd * vel; b.vy = dy / dd * vel; b.h = h0; b.vh = (hg - h0 + 4.9 * T * T) / T;
    if (testa){ chi.saltoT = 0.45; if (chi === this.me) this.banner('Colpo di testa!'); }
    b.tipo = 'tiro'; b.kicker = chi; b.kickT = 0; b.tiratore = chi; b.ultimo = L; b.blocchi = new Set();
    gk.reaz = 0.16 + (1 - gk.sk) * 0.18;
    this.D.st.tiri[L]++;
  }
  // ---------- ciclo ----------
  loop(t){
    if (this.chiuso) return;
    const dt = Math.min(0.04, (t - this.t) / 1000); this.t = t;
    const verticale = this.H > this.W * 1.05 && !this.finito; this.v.classList.toggle('verticale', verticale);
    if (this.carica != null){ this.carica = Math.min(1, this.carica + dt * 1.1); if (this.elPot) this.elPot.style.width = Math.round(this.carica * 100) + '%'; if (this.b.owner !== this.me){ this.carica = null; if (this.elPot) this.elPot.style.width = '0%'; } }
    if (verticale){ /* aspetta che giri il telefono */ }
    else if (this.pausaT > 0){ this.pausaT -= dt; if (this.pausaT <= 0 && this.dopoPausa){ const f = this.dopoPausa; this.dopoPausa = null; f(); } }
    else if (!this.finito) this.passo(dt);
    for (const p of this.tutti){ if (p.saltoT > 0) p.saltoT -= dt; if (p.aTerra > 0) p.aTerra -= dt; }
    for (const p of this.tutti){ p.x = p.mx / CL; p.y = p.my / CA; const v = Math.hypot(p.vx / CL, p.vy / CA); p.v = p.v * 0.8 + v * 0.2; p.fase += dt * (4 + p.v * 60); if (Math.abs(p.vx) > 0.3) p.dir = p.vx > 0 ? 1 : -1; }
    this.palla.x = this.b.mx / CL; this.palla.y = this.b.my / CA;
    this.script = this.b.h > 0.05 ? { t: Math.asin(Math.min(1, this.b.h * 0.3 / 0.6)) / Math.PI * 0.7 } : null;
    const camT = clamp(this.b.mx * 0.8 + this.me.mx * 0.2, 14, CL - 14);
    this.camX += (camT - this.camX) * Math.min(1, dt * 1.8);
    if (this.flash > 0) this.flash -= dt * 0.8;
    this.disegna(); this.hud();
    requestAnimationFrame(this._f);
  }
  hud(){
    const m = Math.min(this.durata, Math.floor(this.min));
    const ris = `${this.gol[0]} - ${this.gol[1]}`; if (this._ris !== ris){ this._ris = ris; this.elRis.textContent = ris; }
    const mm = this.finito ? 'Fine' : (m > 90 ? '90+' + (m - 90) : m > 45 && !this.meta ? '45+' + (m - 45) : m) + '’'; if (this._mm !== mm){ this._mm = mm; this.elMin.textContent = mm; }
    if (!this.me.gk){ const b = this.b, me = this.me, mia = b.owner === me, comp = b.owner && b.owner.lato === me.lato && !mia, loro = b.owner && b.owner.lato !== me.lato;
      const aria = !b.owner && b.h > 0.5 && Math.hypot(b.mx - me.mx, b.my - me.my) < 4.5;
      const lt = loro ? 'CONTRASTO' : aria ? 'TESTA' : 'TIRO', lp = comp ? 'DAMMI PALLA' : 'PASSAGGIO', lf = comp ? 'LANCIAMI' : 'FILTRANTE', lc = mia ? 'CROSS' : comp ? 'CROSSA!' : 'SCIVOLATA', la = mia ? 'ABILITÀ' : comp ? '–' : 'PRESSING';
      if (this._lt !== lt){ this._lt = lt; this.bTiro.textContent = lt; } if (this._lp !== lp){ this._lp = lp; this.bPass.textContent = lp; }
      if (this._lf !== lf){ this._lf = lf; this.bFilt.textContent = lf; } if (this._lc !== lc){ this._lc = lc; this.bCross.textContent = lc; } if (this._la !== la){ this._la = la; this.bAbil.textContent = la; } }
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
    if (me.via) return;
    me.tk = Math.max(0, (me.tk || 0) - dt); me.testa = Math.max(0, (me.testa || 0) - dt); me.fintaCd = Math.max(0, (me.fintaCd || 0) - dt); if (me.finta > 0) me.finta -= dt;
    if (this.passoScivolata(me, dt)) return;
    const pz = this.piazzato; if (pz && pz.L !== me.lato){ const dx = me.mx - pz.x, dy = me.my - pz.y, dd = Math.hypot(dx, dy) || 1; if (dd < 9.15){ me.mx = pz.x + dx / dd * 9.15; me.my = pz.y + dy / dd * 9.15; } }
    if (this.inRigore && b.owner !== me && !me.gk){ me.vx = me.vy = 0; return; }
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
    if (me.fiato == null) me.fiato = 1;
    const corre = this.scatto && me.fiato > 0.04 && Math.hypot(j.x, j.y) > 0.2;
    me.fiato = clamp(me.fiato + (corre ? -0.16 : 0.09) * dt, 0, 1);
    if (this.elFiato){ const fw = Math.round(me.fiato * 100); if (this._fw !== fw){ this._fw = fw; this.elFiato.style.width = fw + '%'; } }
    const conPalla = b.owner === me;
    if (conPalla && (me.punizione || me.rigore)){ me.vx = me.vy = 0; return; }
    if (me.finta > 0){ const v = 7.4 * (0.94 + me.sk * 0.12); me.vx += (me.fdx * v - me.vx) * Math.min(1, dt * 12); me.vy += (me.fdy * v - me.vy) * Math.min(1, dt * 12); me.mx = clamp(me.mx + me.vx * dt, 0.3, CL - 0.3); me.my = clamp(me.my + me.vy * dt, 0.3, CA - 0.3); return; }
    const vmax = (corre ? 8.6 : 6.2) * (conPalla ? 0.93 : 1) * (0.94 + me.sk * 0.12);
    me.vx += (j.x * vmax - me.vx) * Math.min(1, dt * 8); me.vy += (j.y * vmax * 0.85 - me.vy) * Math.min(1, dt * 8);
    me.mx = clamp(me.mx + me.vx * dt, 0.3, CL - 0.3); me.my = clamp(me.my + me.vy * dt, 0.3, CA - 0.3);
  }
  passoAI(dt){
    const b = this.b, R = Math.random, pos = b.owner || { mx: b.mx, my: b.my };
    const pt = b.owner ? b.owner.lato : b.ultimo, fermi = this.inRigore && b.owner && b.owner.rigore, pz = this.piazzato;
    if (this.pressT > 0) this.pressT -= dt;
    for (const L of [0, 1]){
      const sq = this.sq[L].filter((p) => !p.via), d = dirL(L), lf = this.lineaFuori(L);
      const possesso = b.owner && b.owner.lato === L;
      // chi va sul pallone: i due più vicini quando difendi (tre se chiedi pressing), uno quando la palla è libera
      const caccia = new Set();
      if (!fermi && !(pz && pz.L !== L) && (pt !== L || !b.owner)){
        const n = b.owner ? (L === this.me.lato && this.pressT > 0 ? 3 : 2) : 1;
        sq.filter((p) => !p.gk && !p.io && !(p.ferma > 0)).sort((a, c) => this.dist(a, pos) - this.dist(c, pos)).slice(0, n).forEach((p) => caccia.add(p));
      }
      sq.forEach((p) => {
        if (p.io) return;
        p.tk = Math.max(0, (p.tk || 0) - dt); p.fintaCd = Math.max(0, (p.fintaCd || 0) - dt); if (p.finta > 0) p.finta -= dt;
        if (this.passoScivolata(p, dt)) return;
        if (p.ferma > 0){ p.ferma -= dt; p.vx *= 0.85; p.vy *= 0.85; p.mx += p.vx * dt; p.my += p.vy * dt; return; }
        const spd = 0.9 + p.sk * 0.2;
        if (b.owner === p) return this.portaPalla(p, dt, spd);
        if (p.gk) return this.portiereAI(p, dt);
        if (fermi || p.barriera > 0){ p.vx *= 0.8; p.vy *= 0.8; return; }
        if ((b.tipo === 'pass' || b.tipo === 'cross') && b.passTo === p && !b.owner){ const t = 0.35; return this.muovi(p, b.mx + b.vx * t, b.my + b.vy * t, 7.2 * spd, dt); }
        if (p.corsa && p.corsa.t > 0){ p.corsa.t -= dt; return this.muovi(p, p.corsa.x, p.corsa.y, 7.6 * spd, dt); }
        if (caccia.has(p)){
          const k = b.owner ? 0.7 : 0; this.muovi(p, pos.mx - d * k, pos.my, 7 * spd, dt, 6);
          // scivolata degli avversari
          if (b.owner && b.owner.lato !== L && !b.owner.gk && p.tk <= 0 && this.dist(p, b.owner) < 3 && this.dist(p, b.owner) > 1.3 && R() < dt * 0.45) this.scivolata(p);
          return;
        }
        let tx, ty;
        if (possesso){
          // in attacco: si allarga, sale e ogni tanto scatta in profondità
          tx = p.hx + d * 15 + (b.mx - 52.5) * 0.55; ty = p.hy + (b.my - p.hy) * 0.18 + Math.sin(this.tempo * 0.7 + p.i * 1.7) * 3;
          if (Math.abs(p.hx - miaPortaL(L)) > 40 && R() < dt * 0.35 && b.owner && this.dist(p, b.owner) < 40){ const ut = Math.min(CL - 7, lf + 9 + R() * 5); p.corsa = { x: L ? CL - ut : ut, y: clamp(p.my + (34 - p.my) * 0.35 + (R() - 0.5) * 8, 6, CA - 6), t: 1.6 + R() * 0.6 }; }
          // resta in linea con l'ultimo difensore
          const ux = Math.min(this.u(L, tx), lf - 0.6); tx = L ? CL - ux : ux;
        } else {
          tx = p.hx - d * 3 + (b.mx - 52.5) * 0.65; ty = p.hy + (b.my - p.hy) * 0.32 + Math.sin(this.tempo * 0.6 + p.i * 1.7) * 2;
          const lim = miaPortaL(L) + d * 2; if ((tx - lim) * d < 0) tx = lim;
        }
        tx = clamp(tx, 3, CL - 3);
        this.muovi(p, tx, clamp(ty, 3, CA - 3), 5.8 * spd, dt, 4);
        if (pz && pz.L !== L){ const dx = p.mx - pz.x, dy = p.my - pz.y, dd = Math.hypot(dx, dy) || 1; if (dd < 9.15){ p.mx = pz.x + dx / dd * 9.15; p.my = pz.y + dy / dd * 9.15; } }
      });
      // contrasti
      if (!pz && !fermi) sq.forEach((p) => {
        if (p.io || p.gk || p.ferma > 0 || p.scivola > 0) return;
        const ow = b.owner; if (!ow || ow.lato === L || ow.gk || this.tempo < 0.5 || p.tk > 0 || this.dist(p, ow) > 1.2) return;
        p.tk = caccia.has(p) ? 0.55 : 0.65; this.nTk = (this.nTk || 0) + 1;
        if (ow.finta > 0){ p.ferma = 0.5; return; }
        const pr = clamp(0.27 + (p.sk - ow.sk) * 0.5 - (ow === this.me && Math.hypot(ow.vx, ow.vy) > 5 ? 0.04 : 0) + (ow === this.me && this.scatto ? 0.05 : 0), 0.08, 0.52);
        if (R() < pr){ ow.ferma = 0.5; this.dai(p); if (ow === this.me) this.mostra('Palla persa', 'male'); }
        else if (R() < 0.15) this.fallo(p, ow, 1);
      });
    }
  }
  portaPalla(p, dt, spd){
    const b = this.b, L = p.lato, gx = portaL(L), d = dirL(L), R = Math.random, me = this.me;
    const nem = this.sq[1 - L].filter((x) => !x.via), press = Math.min(...nem.map((n) => this.dist(n, p)));
    if (p.gk){ this.muovi(p, miaPortaL(L) + d * 6, 34, 3, dt); p.dec -= dt; if (p.dec <= 0) this.passa(p, this.scegliCompagno(p, false), R() < 0.4); return; }
    const piazz = p.punizione || p.rigore || p.angolo;
    if (piazz){ p.vx = p.vy = 0; }
    else if (p.finta > 0){ this.muovi(p, p.mx + p.fdx * 5, p.my + p.fdy * 5, 7.2 * spd, dt, 10); }
    else {
      // le ali corrono sulla fascia, gli altri puntano la porta
      const ala = Math.abs(p.my - 34) > 15 && Math.abs(gx - p.mx) > 14;
      this.muovi(p, gx - d * (ala ? 6 : 4), ala ? p.my : 34 + (p.my - 34) * 0.7, 6.2 * spd, dt);
      if (press < 2.2 && p.sk > 0.4 && R() < dt * 1.4) this.finta(p);
    }
    p.dec -= dt * (press < 2.6 && !piazz ? 2.2 : 1);
    if (p.chiesta && L === me.lato && !me.via){ const c = p.chiesta; p.chiesta = false; if (c === 'cross') return this.cross(p, me); return this.passa(p, me, c === 'lungo'); }
    if (p.dec > 0) return;
    const dg = Math.hypot(gx - p.mx, 34 - p.my), ang = Math.abs(p.my - 34) / Math.max(3, Math.abs(gx - p.mx));
    if (p.rigore) return this.tira(p, 0.7 + R() * 0.25);
    if (p.angolo) return this.cross(p);
    if (p.punizione && dg < 28 && ang < 1 && R() < 0.6) return this.tira(p, 0.6 + R() * 0.3);
    if (!p.punizione && dg < 25 && ang < 1.1 && R() < 0.5 + (dg < 16 ? 0.25 : 0)) return this.tira(p);
    // cross dalla fascia
    if (Math.abs(p.my - 34) > 13 && Math.abs(gx - p.mx) < 30 && R() < 0.55) return this.cross(p);
    // filtrante a chi scatta
    const run = this.sq[L].find((c) => !c.via && c !== p && c.corsa && c.corsa.t > 0.4 && (c.mx - p.mx) * d > 4 && (!this.inFuori(c) || R() < 0.12));
    if (run && R() < 0.55) return this.passa(p, run, true);
    if (!piazz && press > 7 && R() < 0.35){ p.dec = 0.4; return; }
    this.passa(p, this.scegliCompagno(p, false), R() < 0.15);
  }
  portiereAI(p, dt){
    const b = this.b, L = p.lato, x0 = miaPortaL(L), d = dirL(L);
    if (this.inRigore){ this.muovi(p, x0 + d * 0.4, 34, 3, dt); return; }
    if (b.tipo === 'tiro' && !b.owner && b.ultimo !== L && b.rigore){ p.reaz = (p.reaz || 0) - dt; if (p.reaz <= 0.08) this.muovi(p, x0 + d * 0.5, 34 + (p.guess || 0) * 2.9, 8, dt, 16); return; }
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
    if (b.tipo === 'cross' && b.h > 0.8 && b.h < 2.9 && this.aereo()) return;
    if (b.my < 0 || b.my > CA) return this.rimessa();
    if (b.mx < 0 || b.mx > CL) return this.fondo(b.mx < 0 ? 0 : CL);
    this.prendePalla();
  }
  prendePalla(){
    const b = this.b; if (b.h > 2.2 || b.tipo === 'fermo') return;
    let migliore = null, dm = 9;
    for (const p of this.tutti){
      if (p.via || p.ferma > 0 || (p === b.kicker && b.kickT < 0.35)) continue;
      const r = p.io ? 1.4 : p.gk ? 1.7 : 1.05, d = Math.hypot(p.mx - b.mx, p.my - b.my);
      if (d > r || (b.h > 1.7 && !p.gk) || (p.io && b.tipo === 'cross' && b.h > 1.2)) continue;
      if (b.tipo === 'pass' && b.kicker && p.lato !== b.kicker.lato && b.intercett){ if (b.intercett.has(p)) continue; b.intercett.add(p); const sp = Math.hypot(b.vx, b.vy); if (Math.random() > (sp > 17 ? 0.4 : 0.7)) continue; }
      if (d < dm){ dm = d; migliore = p; }
    }
    if (!migliore) return;
    const p = migliore;
    if (b.fuori && p === b.fuori) return this.fuorigioco(p);
    if (b.tipo === 'pass' && b.kicker && b.kicker.lato === p.lato){ p.ricDa = b.kicker; p.ricT = this.tempo; }
    else { p.ricDa = null; }
    if (p.gk && b.tipo === 'tiro') return;
    this.dai(p);
    if (p === this.me && navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
  }
  controllaTiro(ox){
    const b = this.b, L = b.tiratore.lato, gx = portaL(L), gk = this.sq[1 - L][0], d = dirL(L), D = this.D;
    for (const p of this.sq[1 - L]){ if (p.via || p.gk || b.blocchi.has(p) || b.h > (b.puniz ? 2 : 1.2)) continue; if (Math.hypot(p.mx - b.mx, p.my - b.my) < 0.9){ b.blocchi.add(p); if (Math.random() < (b.puniz ? 0.3 : 0.4)){ b.vx *= -0.3; b.vy = (Math.random() - 0.5) * 8; b.tipo = null; b.ultimo = p.lato; return false; } } }
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
    chi.mx = x; chi.my = y; b.mx = x; b.my = y; this.dai(chi); chi.dec = 0.7; chi.noOff = true;
    this.banner('Rimessa laterale');
  }
  fondo(x0){
    const b = this.b, difende = x0 === CL ? 1 : 0; // chi difende quella porta
    if (b.ultimo !== difende){ // rinvio dal fondo
      const gk = this.sq[difende][0]; gk.mx = x0 + dirL(difende) * 5; gk.my = 34; b.mx = gk.mx; b.my = 34; this.dai(gk); gk.dec = 1; gk.noOff = true; this.banner('Rimessa dal fondo');
    } else { // calcio d'angolo
      const L = 1 - difende, y = b.my < 34 ? 0.8 : CA - 0.8, x = x0 === CL ? CL - 0.8 : 0.8;
      const p = this.sq[L].filter((q) => !q.via && !q.gk).sort((a, c) => Math.hypot(a.mx - x, a.my - y) - Math.hypot(c.mx - x, c.my - y))[0];
      p.mx = x; p.my = y; b.mx = x; b.my = y; this.dai(p); p.dec = 1.3; p.angolo = true; p.noOff = true; this.D.st.corner[L]++; this.banner('Calcio d’angolo');
      this.sq[L].forEach((q) => { if (!q.via && !q.gk && q !== p && !q.io && Math.abs(q.hx - x0) < 60) { q.corsa = { x: x0 - dirL(L) * (6 + Math.random() * 8), y: 26 + Math.random() * 16, t: 1.5 }; } });
    }
    b.tipo = null;
  }
  // ---------- palle alte: colpi di testa ----------
  aereo(){
    const b = this.b; let best = null, bv = -9;
    for (const p of this.tutti){
      if (p.via || p.ferma > 0 || b.testate.has(p) || (p === b.kicker && b.kickT < 0.4)) continue;
      const d = Math.hypot(p.mx - b.mx, p.my - b.my);
      if (p.gk){ const area = Math.abs(p.mx - miaPortaL(p.lato)) < 16.5 && Math.abs(p.my - 34) < 20; if (!area || d > 2.2) continue; }
      else if (d > (p.io ? 1.6 : 1.25)) continue;
      // tu salti se premi TESTA, oppure da solo se il cross era per te ed eri in area
      if (p.io && !(p.testa > 0) && !(b.passTo === p && Math.abs(portaL(p.lato) - p.mx) < 18)) continue;
      b.testate.add(p);
      const v = p.sk + Math.random() * 0.7 - d * 0.3 + (p.io ? 0.35 : 0) + (p.gk ? 0.3 : 0);
      if (v > bv){ bv = v; best = p; }
    }
    if (!best) return false;
    const p = best, L = p.lato, R = Math.random;
    if (b.fuori === p) { this.fuorigioco(p); return true; }
    if (p.gk){ if (R() < 0.65){ this.dai(p); p.dec = 1.2; if (L !== this.me.lato) this.banner('Il portiere esce e la prende'); return true; } b.vx = dirL(L) * 12; b.vy = (R() - 0.5) * 10; b.vh = 4; b.tipo = null; b.ultimo = L; p.saltoT = 0.4; return true; }
    p.saltoT = 0.45; p.ricDa = b.kicker && b.kicker.lato === L ? b.kicker : null; p.ricT = this.tempo;
    if (Math.abs(portaL(L) - p.mx) < 17 && Math.abs(p.my - 34) < 13) { this.tira(p, 0.6, true); return true; }
    // di testa in difesa o a centrocampo: allontana o appoggia
    const c = p.io ? this.scegliCompagno(p, true) : null;
    if (c){ const h = b.h; this.passa(p, c, false); b.h = h; b.vh = 1; }
    else { b.owner = null; b.vx = dirL(L) * (12 + R() * 5); b.vy = (R() - 0.5) * 9; b.vh = 4.5; b.tipo = 'pass'; b.passTo = null; b.kicker = p; b.kickT = 0; b.ultimo = L; b.intercett = new Set(); b.fuori = null; }
    if (p.io) this.banner('Di testa!');
    return true;
  }
  // ---------- regole: fuorigioco, falli, cartellini, punizioni e rigori ----------
  fischio(t, cl, pausa, dopo){
    const b = this.b; b.owner = null; b.vx = b.vy = 0; b.vh = 0; b.h = 0; b.tipo = 'fermo';
    this.piazzato = null; this.inRigore = false;
    try { Suono.fischio(1); } catch (e) {}
    this.mostra(t, cl); this.pausaT = pausa; this.dopoPausa = dopo;
  }
  fuorigioco(p){
    const x = p.mx, y = p.my;
    this.banner(p.io ? 'Eri oltre l’ultimo difensore' : 'Bandierina alzata');
    this.fischio('Fuorigioco!', p.lato === this.me.lato ? 'male' : 'buono', 1.3, () => this.punizione(1 - p.lato, x, y));
  }
  fallo(chi, vitt, grav = 1){
    if (this.pausaT > 0 || this.finito || this.b.tipo === 'fermo') return;
    const D = this.D, L = chi.lato, V = vitt.lato, x = vitt.mx, y = vitt.my, R = Math.random;
    D.st.falli[L]++; vitt.aTerra = 1.4; vitt.ferma = 1.4;
    const P = chi.p && D.pers[chi.p.id], nome = chi.p ? nomeG(chi.p) : chi.nome, mio = L === D.noi;
    let cart = null; const r = R();
    if (!chi.gk && r < 0.01 * grav) cart = 'rosso';
    else if (r < 0.13 * grav) cart = P && P.amm ? (chi.gk ? null : 'rosso2') : 'giallo';
    if (cart === 'giallo'){ if (P) P.amm = 1; D.st.amm[L]++; D.ev.push({ min: this.min, tipo: 'giallo', lato: L, mio, t: `Cartellino giallo per ${nome}.` }); }
    else if (cart){ if (P){ if (cart === 'rosso2') P.amm = (P.amm || 0) + 1; P.esp = 1; } D.st.esp[L]++; D.ev.push({ min: this.min, tipo: 'rosso', lato: L, mio, t: cart === 'rosso2' ? `Secondo giallo per ${nome}: espulso!` : `Rosso diretto a ${nome}! Entrata durissima.` }); }
    const area = Math.abs(y - 34) < 20.16 && this.u(V, x) > CL - 16.5;
    this.fischio(area ? 'Rigore!' : 'Fallo!', V === this.me.lato ? 'buono' : 'male', cart ? 2.1 : 1.4, () => {
      if (cart && cart !== 'giallo') this.espelli(chi);
      if (this.me.via) return this.espulsoIo();
      area ? this.rigore(V) : this.punizione(V, x, y);
    });
    if (cart) setTimeout(() => !this.chiuso && this.cartellino(cart === 'giallo' ? 'giallo' : 'rosso', nome), 500);
    if (chi.io && !cart) this.banner('Fallo tuo');
  }
  espelli(p){
    p.via = true; p.mx = p.lato ? CL + 30 : -30; p.corsa = null;
    const s = this.D.sq[p.lato].slots.find((x) => x.p && x.p === p.p); if (s) s.esp = true;
  }
  espulsoIo(){
    if (this.finito) return; this.finito = true; this.espulso = true;
    try { Suono.fermaFolla(); } catch (e) {}
    this.riepilogo(true);
  }
  // punizione: chi la batte, la barriera a 9 metri, i compagni in area
  punizione(L, x, y){
    const b = this.b, d = dirL(L), gx = portaL(L), me = this.me, R = Math.random;
    x = clamp(x, 1, CL - 1); y = clamp(y, 1, CA - 1);
    this.tutti.forEach((p) => { p.corsa = null; p.scivola = 0; p.vx = p.vy = 0; p.barriera = 0; });
    const dg = Math.hypot(gx - x, 34 - y);
    const k = !me.gk && !me.via && me.lato === L && (dg < 32 || Math.hypot(me.mx - x, me.my - y) < 22) ? me
      : this.sq[L].filter((p) => !p.via && !p.gk).sort((a, c) => Math.hypot(a.mx - x, a.my - y) - Math.hypot(c.mx - x, c.my - y))[0];
    if (!k) return this.calcioInizio(L);
    k.mx = x - d * 0.7; k.my = y; b.mx = x; b.my = y;
    this.sq[1 - L].forEach((p) => { if (p.via) return; const dx = p.mx - x, dy = p.my - y, dd = Math.hypot(dx, dy) || 1; if (dd < 9.3){ p.mx = x + dx / dd * 9.4; p.my = clamp(y + dy / dd * 9.4, 0.5, CA - 0.5); } });
    if (dg < 32){
      const n = dg < 22 ? 4 : 3, ux = (gx - x) / dg, uy = (34 - y) / dg, wx = x + ux * 9.15, wy = y + uy * 9.15;
      this.sq[1 - L].filter((p) => !p.via && !p.gk).sort((a, c) => Math.hypot(a.mx - wx, a.my - wy) - Math.hypot(c.mx - wx, c.my - wy)).slice(0, n)
        .forEach((p, i) => { const off = (i - (n - 1) / 2) * 0.75; p.mx = wx - uy * off; p.my = wy + ux * off; p.barriera = 1; });
      let q = 0; this.sq[L].forEach((p) => { if (p.via || p.gk || p === k || p.io || Math.abs(p.hx - miaPortaL(L)) < 40 || q > 4) return; q++; p.mx = clamp(gx - d * (7 + R() * 9), 2, CL - 2); p.my = 34 + (R() - 0.5) * 22; });
    }
    this.dai(k); k.punizione = true; k.dec = 1.3 + R() * 0.8; b.tipo = null; this.piazzato = { x, y, L };
    this.banner(k === me ? (dg < 30 ? 'Punizione per te: tira o passa' : 'Punizione: batti tu') : dg < 30 ? 'Punizione dal limite' : 'Calcio di punizione');
  }
  rigore(L){
    const b = this.b, d = dirL(L), gx = portaL(L), sx = gx - d * 11, me = this.me, gk = this.sq[1 - L][0];
    const k = !me.gk && !me.via && me.lato === L ? me : this.sq[L].filter((p) => !p.via && !p.gk).sort((a, c) => c.sk - a.sk)[0];
    if (!k) return this.calcioInizio(L);
    let n = 0;
    this.tutti.forEach((p) => { p.corsa = null; p.scivola = 0; p.vx = p.vy = 0; p.barriera = 0; if (p.via || p === k || p.gk) return; n++; p.mx = gx - d * (18.5 + (n % 3) * 2.5); p.my = 34 + ((n % 8) - 3.5) * 4.2; });
    if (!gk.via){ gk.mx = gx - d * 0.4; gk.my = 34; }
    k.mx = sx - d * 1; k.my = 34; b.mx = sx; b.my = 34;
    this.dai(k); k.rigore = true; k.dec = 1.6 + Math.random() * 0.6; b.tipo = null; this.inRigore = true;
    this.D.ev.push({ min: this.min, tipo: 'occ', lato: L, mio: L === this.D.noi, t: `Calcio di rigore per ${L === 0 ? this.o.nomeH : this.o.nomeA}!` });
    this.banner(k === me ? 'Rigore! Scegli l’angolo col joystick e tieni premuto TIRO' : gk === me ? 'Para il rigore: joystick e TUFFO' : 'Calcio di rigore');
  }
  // ---------- disegno: stadio di giorno, campo grande, telecamera TV ----------
  disegna(){
    const c = this.x, W = this.W, H = this.H; if (!W || !this.camera) return;
    const P = (X, Y, Z = 0) => this.p3(X, Y, Z), t = performance.now() / 1000;
    const poly = (pts) => { c.beginPath(); pts.forEach(([X, Y, Z], k) => { const q = P(X, Y, Z || 0); k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.closePath(); };
    // cielo e tetto dello stadio
    const cielo = c.createLinearGradient(0, 0, 0, H * 0.3); cielo.addColorStop(0, '#5b7fa8'); cielo.addColorStop(1, '#a9c4dd'); c.fillStyle = cielo; c.fillRect(0, 0, W, H);
    // tribuna di fronte (in salita, piena di gente)
    const tr = this.tribuna || (this.tribuna = this.creaTribuna());
    poly([[-140, -3, 0], [245, -3, 0], [245, -40, 22], [-140, -40, 22]]); const tg = c.createLinearGradient(0, P(52.5, -40, 22).y, 0, P(52.5, -3, 0).y); tg.addColorStop(0, '#2c3442'); tg.addColorStop(1, '#3d4757'); c.fillStyle = tg; c.fill();
    for (const f of tr){ const q = P(f.x, f.y, f.z); if (q.x < -4 || q.x > W + 4) continue; const sal = this.flash > 0 ? Math.abs(Math.sin(t * 12 + f.f)) * 3 : Math.abs(Math.sin(t * 2.2 + f.f)) * 0.7; const r = Math.max(1.2, q.s * 0.32); c.fillStyle = f.c; c.fillRect(q.x - r / 2, q.y - r - sal, r, r * 1.3); }
    // tetto
    poly([[-140, -40, 22], [245, -40, 22], [245, -44, 27], [-140, -44, 27]]); c.fillStyle = '#1b2230'; c.fill();
    // fascia bordo campo
    poly([[-60, -3, 0], [165, -3, 0], [165, CA + 30, 0], [-60, CA + 30, 0]]); c.fillStyle = '#3f8f3a'; c.fill();
    // cartelloni a led
    const led = this.led || (this.led = ['CALCIOMANIA PM', (this.o.nomeH || '').toUpperCase(), 'FORZA RAGAZZI', (this.o.nomeA || '').toUpperCase(), 'STADIO PIENO', 'PRESIDENTE']);
    for (let k = -6; k < 17; k++){ const x0 = k * 10.5 - 3, a = P(x0, -1.6, 0), b2 = P(x0 + 10.5, -1.6, 0), a2 = P(x0, -1.6, 0.95); if (b2.x < 0 || a.x > W) continue;
      c.fillStyle = k % 2 ? '#0b2a6b' : '#0d1626'; c.fillRect(a.x, a2.y, b2.x - a.x + 1, a.y - a2.y);
      c.save(); c.beginPath(); c.rect(a.x, a2.y, b2.x - a.x, a.y - a2.y); c.clip(); c.font = `800 ${Math.max(7, (a.y - a2.y) * 0.62)}px "Barlow Condensed",Arial Narrow,sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'center';
      c.fillStyle = (k + Math.floor(t / 3)) % 3 ? '#ffd23f' : '#22c55e'; c.fillText(led[((k % led.length) + led.length) % led.length], (a.x + b2.x) / 2, (a.y + a2.y) / 2 + 1); c.restore(); }
    // erba a strisce, come nei campi veri
    const NS = 18;
    for (let i = 0; i < NS; i++){ poly([[i * CL / NS - (i ? 0 : 4), -0.8, 0], [(i + 1) * CL / NS + (i === NS - 1 ? 4 : 0), -0.8, 0], [(i + 1) * CL / NS + (i === NS - 1 ? 4 : 0), CA + 3, 0], [i * CL / NS - (i ? 0 : 4), CA + 3, 0]]); c.fillStyle = i % 2 ? '#4fa83d' : '#5cb848'; c.fill(); }
    { const lg = c.createLinearGradient(0, P(52.5, 0).y, 0, H); lg.addColorStop(0, 'rgba(0,0,0,.12)'); lg.addColorStop(0.5, 'rgba(255,255,220,.04)'); lg.addColorStop(1, 'rgba(0,0,0,.08)'); c.fillStyle = lg; c.fillRect(0, P(52.5, -0.8).y, W, H); }
    // linee del campo
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineCap = 'round'; c.lineJoin = 'round';
    const linea = (pts) => { c.beginPath(); pts.forEach(([X, Y], k) => { const q = P(X, Y); k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.lineWidth = Math.max(1, P(52.5, (pts[0][1] + pts[pts.length - 1][1]) / 2).s * 0.12); c.stroke(); };
    const arco = (cx, cy, r, a0, a1) => { const pts = []; for (let k = 0; k <= 32; k++){ const a = a0 + (a1 - a0) * k / 32; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } linea(pts); };
    linea([[0, 0], [CL, 0], [CL, CA], [0, CA], [0, 0]]); linea([[52.5, 0], [52.5, CA]]); arco(52.5, 34, 9.15, 0, Math.PI * 2);
    [[0, 1], [CL, -1]].forEach(([x0, d]) => { linea([[x0, 13.84], [x0 + d * 16.5, 13.84], [x0 + d * 16.5, 54.16], [x0, 54.16]]); linea([[x0, 24.84], [x0 + d * 5.5, 24.84], [x0 + d * 5.5, 43.16], [x0, 43.16]]);
      const a = Math.acos(5.5 / 9.15); arco(x0 + d * 11, 34, 9.15, d > 0 ? -a : Math.PI - a, d > 0 ? a : Math.PI + a);
      const q = P(x0 + d * 11, 34); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(q.x, q.y, Math.max(1.5, q.s * 0.2), Math.max(1, q.s * 0.08), 0, 0, 7); c.fill(); });
    { const q = P(52.5, 34); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(q.x, q.y, Math.max(1.5, q.s * 0.2), Math.max(1, q.s * 0.08), 0, 0, 7); c.fill(); }
    // porte con la rete
    const porta = (x0, d) => {
      const y1 = 34 - CPO, y2 = 34 + CPO, hh = 2.44, dd = -d * 2;
      c.fillStyle = 'rgba(255,255,255,.16)'; poly([[x0 + dd, y1, 0], [x0 + dd, y1, hh * 0.85], [x0 + dd, y2, hh * 0.85], [x0 + dd, y2, 0]]); c.fill();
      poly([[x0, y1, hh], [x0 + dd, y1, hh * 0.85], [x0 + dd, y2, hh * 0.85], [x0, y2, hh]]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.7;
      for (let k = 1; k < 12; k++){ const y = y1 + (y2 - y1) * k / 12, a = P(x0, y, hh), b2 = P(x0 + dd, y, hh * 0.85), e = P(x0 + dd, y, 0); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b2.x, b2.y); c.lineTo(e.x, e.y); c.stroke(); }
      for (let k = 1; k < 5; k++){ const z = hh * 0.85 * k / 5, a = P(x0 + dd, y1, z), b2 = P(x0 + dd, y2, z); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b2.x, b2.y); c.stroke(); }
      const A = P(x0, y1, 0), B = P(x0, y1, hh), Cc = P(x0, y2, hh), Dd = P(x0, y2, 0);
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, A.s * 0.14); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(Cc.x, Cc.y); c.lineTo(Dd.x, Dd.y); c.stroke();
    };
    porta(0, 1); porta(CL, -1);
    // giocatori e pallone, dal più lontano al più vicino
    const col = [this.o.colH, this.o.colA], b = this.b, me = this.me;
    const L = this.tutti.map((p) => ({ p, y: p.my })); L.push({ palla: true, y: b.my + 0.01 }); L.sort((a2, b3) => a2.y - b3.y);
    for (const o of L){
      if (o.palla){
        const g = P(b.mx, b.my, 0), q = P(b.mx, b.my, b.h + 0.11), r = Math.max(2.6, q.s * 0.2);
        c.fillStyle = `rgba(0,0,0,${clamp(0.38 - b.h * 0.05, 0.1, 0.38)})`; c.beginPath(); c.ellipse(g.x, g.y, r * 1.2, r * 0.45, 0, 0, 7); c.fill();
        const bg = c.createRadialGradient(q.x - r * 0.35, q.y - r * 0.35, r * 0.1, q.x, q.y, r); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#c9ced6');
        c.fillStyle = bg; c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.6; c.stroke();
        c.fillStyle = '#1f2937'; const rot = (b.mx + b.my) * 1.3; c.beginPath(); c.arc(q.x + Math.cos(rot) * r * 0.35, q.y + Math.sin(rot) * r * 0.35, r * 0.34, 0, 7); c.fill();
        continue;
      }
      const p = o.p; if (p.via) continue;
      const q = P(p.mx, p.my); if (q.x < -40 || q.x > W + 40) continue;
      const terra = p.scivola > 0 || p.aTerra > 0, salto = p.saltoT > 0 ? Math.sin(Math.min(1, p.saltoT / 0.45) * Math.PI) * q.s * 0.9 : 0;
      if (terra || salto){ c.save(); c.translate(q.x, q.y - salto); if (terra) c.rotate((p.dir || 1) * 1.25); c.translate(-q.x, -q.y); this.omino(p, col[p.lato], p.gk, false, 1); c.restore(); }
      else this.omino(p, col[p.lato], p.gk, false, 1);
    }
    // il tuo giocatore: freccia sopra e nome sotto (come in TV)
    const qm = P(me.mx, me.my), sm = qm.s;
    if (qm.x < -6 || qm.x > W + 6){ const sx = qm.x < 0 ? 16 : W - 16, sy = clamp(qm.y - 20, 60, H - 60), dd2 = qm.x < 0 ? -1 : 1;
      c.fillStyle = '#22d3ee'; c.beginPath(); c.moveTo(sx + dd2 * 12, sy); c.lineTo(sx - dd2 * 5, sy - 11); c.lineTo(sx - dd2 * 5, sy + 11); c.closePath(); c.fill(); }
    else {
      const pul = Math.sin(t * 6) * 2, ty = qm.y - sm * 1.85 * 1.65 - 6 + pul;
      c.fillStyle = '#22d3ee'; c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(qm.x - 7, ty - 10); c.lineTo(qm.x + 7, ty - 10); c.lineTo(qm.x, ty); c.closePath(); c.fill(); c.stroke();
      c.font = `600 ${Math.round(clamp(sm * 0.5, 11, 16))}px Barlow,system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(me.nome, qm.x, qm.y + 4); c.fillStyle = '#fff'; c.fillText(me.nome, qm.x, qm.y + 4);
      const off = b.owner && b.owner.lato === me.lato && b.owner !== me && this.inFuori(me);
      c.strokeStyle = off ? 'rgba(239,68,68,.95)' : 'rgba(34,211,238,.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(qm.x, qm.y, sm * 0.55, sm * 0.2, 0, 0, 7); c.stroke();
      if (off){ c.font = `700 ${Math.round(clamp(sm * 0.42, 10, 13))}px Barlow,system-ui,sans-serif`; c.fillStyle = '#fecaca'; c.fillText('in fuorigioco', qm.x, qm.y + 4 + Math.round(clamp(sm * 0.5, 11, 16)) + 2); }
    }
    // nome di chi ha la palla
    if (b.owner && b.owner !== me){ const q = P(b.owner.mx, b.owner.my); c.font = `600 ${Math.round(clamp(q.s * 0.45, 10, 14))}px Barlow,system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText(b.owner.nome, q.x, q.y + 4); c.fillStyle = 'rgba(255,255,255,.9)'; c.fillText(b.owner.nome, q.x, q.y + 4); }
    // a chi passi
    if (b.owner === me && !me.gk){ const tg2 = this.scegliCompagno(me, true); if (tg2){ const q = P(tg2.mx, tg2.my); c.strokeStyle = 'rgba(250,204,21,.95)'; c.lineWidth = 2; c.beginPath(); c.ellipse(q.x, q.y, q.s * 0.6, q.s * 0.22, 0, 0, 7); c.stroke(); } }
    // radar del campo
    const rw = Math.min(120, W * 0.13), rh = rw * CA / CL, rx = (W - rw) / 2, ry = H - rh - 10;
    c.fillStyle = 'rgba(10,40,15,.4)'; c.fillRect(rx, ry, rw, rh); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.strokeRect(rx, ry, rw, rh); c.beginPath(); c.moveTo(rx + rw / 2, ry); c.lineTo(rx + rw / 2, ry + rh); c.stroke();
    c.strokeRect(rx, ry + rh * 0.2, rw * 0.157, rh * 0.6); c.strokeRect(rx + rw * 0.843, ry + rh * 0.2, rw * 0.157, rh * 0.6);
    this.tutti.forEach((p) => { if (p.io) return; c.fillStyle = p.lato ? this.o.colA.c1 : this.o.colH.c1; c.beginPath(); c.arc(rx + p.mx / CL * rw, ry + p.my / CA * rh, 2.4, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.8; c.stroke(); });
    c.fillStyle = '#22d3ee'; c.beginPath(); c.arc(rx + me.mx / CL * rw, ry + me.my / CA * rh, 3.6, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(rx + b.mx / CL * rw, ry + b.my / CA * rh, 2.2, 0, 7); c.fill();
    if (this.flash > 0){ c.fillStyle = `rgba(255,255,255,${this.flash * 0.3})`; c.fillRect(0, 0, W, H); }
  }
  creaTribuna(){
    const o = this.o, cols = [o.colH.c1, o.colH.c2, o.colA.c1, '#e5e7eb', '#9ca3af', '#f59e0b', '#ef4444', '#1f2937'];
    const L = [];
    for (let r = 0; r < 26; r++) for (let k = 0; k < 120; k++){ const tt = r / 26; L.push({ x: -130 + k * 3.1 + (r % 2) * 1.5, y: -4.5 - tt * 34, z: 0.8 + tt * 20, c: Math.random() < 0.55 ? (Math.random() < 0.6 ? o.colH.c1 : o.colH.c2) : cols[(Math.random() * cols.length) | 0], f: Math.random() * 6 }); }
    return L;
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
      ${this.espulso ? '<p class="tenue">Sei stato espulso: il resto della partita l’hanno giocato i tuoi compagni.</p>' : simulata ? '<p class="tenue">Il resto della partita l’hanno giocato i tuoi compagni.</p>' : ''}
      <button class="btn largo oro" data-cg="ok">Continua</button></div>`;
    this.v.appendChild(box);
    box.querySelector('[data-cg=ok]').onclick = () => this.chiudi();
  }
  chiudi(){
    if (this.chiuso) return; this.chiuso = true;
    removeEventListener('resize', this._r); removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku);
    try { Suono.fermaFolla(); } catch (e) {}
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {}
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
