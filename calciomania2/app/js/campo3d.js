// ============ PARTITA IN 3D: stadio, luci, ombre e giocatori tridimensionali (Three.js) ============
// Coordinate: X = lungo il campo (0..105 → -52.5..52.5), Z = largo (0..68 → -34..34, verso la telecamera), Y = altezza.
class Grafica3D {
  static carica(){
    if (window.THREE) return Promise.resolve(true);
    if (Grafica3D._p) return Grafica3D._p;
    return (Grafica3D._p = new Promise((ok) => {
      try { const t = document.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) return ok(false); } catch (e) { return ok(false); }
      const s = document.createElement('script'); s.src = 'js/vendor/three.min.js'; s.onload = () => ok(!!window.THREE); s.onerror = () => ok(false); document.head.appendChild(s);
    }));
  }
  constructor(campo){
    const T = THREE; this.c = campo;
    const wrap = campo.cv.parentNode;
    this.r = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap;
    this.r.outputEncoding = T.sRGBEncoding; this.r.toneMapping = T.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.05;
    const el = this.r.domElement; el.className = 'cg-3d'; wrap.insertBefore(el, campo.cv);
    campo.cv.style.position = 'absolute'; campo.cv.style.inset = '0';
    this.sc = new T.Scene(); this.sc.fog = new T.Fog(0x9fb8cf, 230, 420);
    this.cam = new T.PerspectiveCamera(20, 2, 5, 900);
    this.creaLuci(); this.creaCampo(); this.creaStadio(); this.creaPorte(); this.creaPalla();
    this.gioc = campo.tutti.map((p) => this.creaGiocatore(p));
    this.ok = true; this.resize();
  }
  distruggi(){ this.ok = false; try { this.r.dispose(); this.r.domElement.remove(); } catch (e) {} }
  resize(){
    const r = this.c.cv.getBoundingClientRect(); this.W = r.width; this.H = r.height;
    this.r.setSize(r.width, r.height, false); this.r.domElement.style.width = '100%'; this.r.domElement.style.height = '100%';
    this.cam.aspect = r.width / Math.max(1, r.height);
    // circa 58 metri in larghezza, campo intero in profondità
    const hf = 58 / 2 / 128; this.cam.fov = 2 * Math.atan(hf / this.cam.aspect) * 180 / Math.PI; this.cam.fov = Math.max(this.cam.fov, 12.5);
    this.cam.updateProjectionMatrix();
  }
  // ---------- texture disegnate ----------
  tela(w, h, f){ const k = document.createElement('canvas'); k.width = w; k.height = h; f(k.getContext('2d'), w, h); const t = new THREE.CanvasTexture(k); t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, this.r.capabilities.getMaxAnisotropy()); return t; }
  creaLuci(){
    const T = THREE;
    this.sc.add(new T.HemisphereLight(0xdfefff, 0x3a5a2a, 0.62));
    const sole = this.sole = new T.DirectionalLight(0xfff3dd, 1.05); sole.position.set(-30, 70, -45); sole.castShadow = true;
    sole.shadow.mapSize.set(2048, 2048); const sc = sole.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 10; sc.far = 200; sole.shadow.bias = -0.0004; sole.shadow.normalBias = 0.04;
    this.sc.add(sole); this.sc.add(sole.target);
    // cielo
    this.sc.background = this.tela(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a78b0'); gr.addColorStop(0.6, '#9cc0e0'); gr.addColorStop(1, '#dfe9f2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  }
  creaCampo(){
    const T = THREE, M = 14, PW = 105 + M * 2, PH = 68 + M * 2, px = 16; // pixel per metro
    const tex = this.tela(PW * px, PH * px, (g, w, h) => {
      g.fillStyle = '#3d8a2c'; g.fillRect(0, 0, w, h);
      // strisce del tagliaerba
      const NS = 20; for (let i = 0; i < NS; i++){ g.fillStyle = i % 2 ? '#3e8b2d' : '#4a9a37'; g.fillRect((M + i * 105 / NS) * px, 0, 105 / NS * px + 1, h); }
      g.fillStyle = '#3a8229'; g.fillRect(0, 0, M * px, h); g.fillRect((M + 105) * px, 0, M * px, h);
      // fili d'erba
      for (let i = 0; i < 60000; i++){ const l = Math.random() < 0.5; g.fillStyle = l ? `rgba(190,240,150,${0.04 + Math.random() * 0.06})` : `rgba(0,35,0,${0.05 + Math.random() * 0.07})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 3); }
      for (let i = 0; i < 220; i++){ const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 90, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, Math.random() < 0.5 ? 'rgba(200,250,160,.06)' : 'rgba(0,30,0,.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
      // linee
      const X = (m) => (M + m) * px, Y = (m) => (M + m) * px; g.strokeStyle = 'rgba(255,255,255,.93)'; g.lineWidth = 0.12 * px; g.lineJoin = 'round';
      g.strokeRect(X(0), Y(0), 105 * px, 68 * px); g.beginPath(); g.moveTo(X(52.5), Y(0)); g.lineTo(X(52.5), Y(68)); g.stroke();
      g.beginPath(); g.arc(X(52.5), Y(34), 9.15 * px, 0, 7); g.stroke();
      [[0, 1], [105, -1]].forEach(([x0, d]) => {
        const a = (x, y) => [X(x0 + d * x), Y(y)];
        g.beginPath(); g.moveTo(...a(0, 13.84)); g.lineTo(...a(16.5, 13.84)); g.lineTo(...a(16.5, 54.16)); g.lineTo(...a(0, 54.16)); g.stroke();
        g.beginPath(); g.moveTo(...a(0, 24.84)); g.lineTo(...a(5.5, 24.84)); g.lineTo(...a(5.5, 43.16)); g.lineTo(...a(0, 43.16)); g.stroke();
        const an = Math.acos(5.5 / 9.15); g.beginPath(); if (d > 0) g.arc(X(11), Y(34), 9.15 * px, -an, an); else g.arc(X(94), Y(34), 9.15 * px, Math.PI - an, Math.PI + an); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(X(x0 + d * 11), Y(34), 0.2 * px, 0, 7); g.fill();
        [0, 68].forEach((y) => { g.beginPath(); g.arc(X(x0), Y(y), 1 * px, d > 0 ? (y ? -Math.PI / 2 : 0) : (y ? Math.PI : Math.PI / 2), d > 0 ? (y ? 0 : Math.PI / 2) : (y ? Math.PI * 1.5 : Math.PI)); g.stroke(); });
      });
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(52.5), Y(34), 0.22 * px, 0, 7); g.fill();
    });
    const m = new T.Mesh(new T.PlaneGeometry(PW, PH), new T.MeshLambertMaterial({ map: tex, color: 0xb4b4b4 }));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; this.sc.add(m);
    // bordo campo (pista scura) e terreno attorno
    const fuori = new T.Mesh(new T.PlaneGeometry(420, 300), new T.MeshLambertMaterial({ color: 0x26491f })); fuori.rotation.x = -Math.PI / 2; fuori.position.y = -0.02; fuori.receiveShadow = true; this.sc.add(fuori);
    // bandierine del calcio d'angolo
    [[-52.5, -34], [52.5, -34], [-52.5, 34], [52.5, 34]].forEach(([x, z]) => {
      const a = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.5, 6), new T.MeshLambertMaterial({ color: 0xffffff })); a.position.set(x, 0.75, z); a.castShadow = true; this.sc.add(a);
      const f = new T.Mesh(new T.PlaneGeometry(0.45, 0.32), new T.MeshLambertMaterial({ color: 0xffd23f, side: T.DoubleSide })); f.position.set(x + 0.22, 1.33, z); this.sc.add(f);
    });
  }
  creaStadio(){
    const T = THREE, o = this.c.o;
    // cartelloni pubblicitari a led (scorrono)
    const scritte = ['CALCIOMANIA PM', (o.nomeH || '').toUpperCase(), 'FORZA RAGAZZI', (o.nomeA || '').toUpperCase(), 'STADIO PIENO', 'PRESIDENTE'];
    this.led = this.tela(2048, 64, (g, w, h) => { scritte.forEach((t, i) => { const x = i * w / scritte.length, bw = w / scritte.length; g.fillStyle = i % 2 ? '#0b2a6b' : '#0d1626'; g.fillRect(x, 0, bw, h); g.fillStyle = i % 2 ? '#ffd23f' : '#22e05a'; g.font = '800 40px "Barlow Condensed",Arial Narrow,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x + bw / 2, h / 2 + 2); }); });
    this.led.wrapS = T.RepeatWrapping; this.led.repeat.set(3, 1);
    const ledM = new T.MeshBasicMaterial({ map: this.led });
    const lungo = new T.Mesh(new T.BoxGeometry(150, 0.95, 0.2), [0, 0, 0, 0, ledM, ledM].map((x) => x || new T.MeshLambertMaterial({ color: 0x111827 })));
    lungo.position.set(0, 0.48, -38.5); lungo.castShadow = true; this.sc.add(lungo);
    [-1, 1].forEach((d) => { const s = new T.Mesh(new T.BoxGeometry(0.2, 0.95, 60), new T.MeshBasicMaterial({ map: this.led })); s.position.set(d * 58.5, 0.48, -2); this.sc.add(s); });
    // pubblico: tribune a gradoni piene di gente
    const folla = (w, h) => this.tela(w, h, (g) => {
      g.fillStyle = '#2a3140'; g.fillRect(0, 0, w, h);
      const cols = [o.colH.c1, o.colH.c2, o.colA.c1, '#e5e7eb', '#9ca3af', '#f59e0b', '#ef4444', '#1f2937', '#60a5fa'];
      for (let y = 0; y < h; y += 6){ g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + 5, w, 1);
        for (let x = (y / 6) % 2 * 2; x < w; x += 4){ if (Math.random() < 0.07) continue; g.fillStyle = Math.random() < 0.55 ? (Math.random() < 0.6 ? o.colH.c1 : o.colH.c2) : cols[(Math.random() * cols.length) | 0]; g.fillRect(x, y + 1 + Math.random(), 3, 3); g.fillStyle = PELLI[(Math.random() * PELLI.length) | 0]; g.fillRect(x + 0.5, y, 2, 1.5); } }
      // striscioni
      for (let i = 0; i < 6; i++){ const x = Math.random() * (w - 120), y = Math.random() * (h * 0.7); g.fillStyle = i % 2 ? o.colH.c1 : o.colH.c2; g.fillRect(x, y, 90 + Math.random() * 60, 14); g.fillStyle = i % 2 ? o.colH.c2 : o.colH.c1; g.font = '700 11px Arial'; g.fillText('FORZA ' + (o.nomeH || '').toUpperCase().slice(0, 14), x + 4, y + 11); }
    });
    const tribuna = (lung, prof, alt, x, z, rotY) => {
      const grp = new T.Group(), n = 14, mat = new T.MeshLambertMaterial({ map: folla(1024, 256), color: 0x8c8c8c });
      mat.map.wrapS = T.RepeatWrapping; mat.map.repeat.set(Math.max(1, Math.round(lung / 60)), 1);
      // una rampa unica con la folla e un muro dietro
      const ramp = new T.Mesh(new T.PlaneGeometry(lung, Math.hypot(prof, alt)), mat); ramp.rotation.x = -Math.atan2(alt, prof) + 0; ramp.position.set(0, alt / 2 + 1.2, -prof / 2);
      ramp.rotation.x = -(Math.PI / 2 - Math.atan2(alt, prof)); grp.add(ramp);
      const muro = new T.Mesh(new T.BoxGeometry(lung, 1.2, 0.5), new T.MeshLambertMaterial({ color: 0x374151 })); muro.position.set(0, 0.6, 0); grp.add(muro);
      const tetto = new T.Mesh(new T.BoxGeometry(lung + 4, 0.8, prof * 0.75), new T.MeshLambertMaterial({ color: 0x1f2937 })); tetto.position.set(0, alt + 7, -prof * 0.6); grp.add(tetto);
      const fondo = new T.Mesh(new T.BoxGeometry(lung + 4, alt + 8, 1), new T.MeshLambertMaterial({ color: 0x252c38 })); fondo.position.set(0, (alt + 8) / 2, -prof - 0.5); grp.add(fondo);
      grp.position.set(x, 0, z); grp.rotation.y = rotY; this.sc.add(grp); return grp;
    };
    this.tribune = [tribuna(190, 34, 26, 0, -42, 0), tribuna(100, 30, 22, -66, 0, Math.PI / 2), tribuna(100, 30, 22, 66, 0, -Math.PI / 2)];
    // riflettori
    [[-70, -60], [70, -60], [-70, 60], [70, 60]].forEach(([x, z]) => {
      const pal = new T.Mesh(new T.CylinderGeometry(0.5, 0.8, 50, 8), new T.MeshLambertMaterial({ color: 0x6b7280 })); pal.position.set(x, 25, z); this.sc.add(pal);
      const pan = new T.Mesh(new T.BoxGeometry(9, 5, 1), new T.MeshBasicMaterial({ color: 0xfffbe8 })); pan.position.set(x, 51, z); pan.lookAt(0, 0, 0); this.sc.add(pan);
    });
    // panchine
  }
  creaPorte(){
    const T = THREE, bianco = new T.MeshLambertMaterial({ color: 0xffffff });
    const rete = this.tela(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.5; for (let x = 0; x <= w; x += 8){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 8){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    const reteM = new T.MeshBasicMaterial({ map: rete, transparent: true, side: T.DoubleSide, opacity: 0.75, depthWrite: false });
    [-1, 1].forEach((d) => {
      const x0 = d * 52.5, g = new T.Group(), Hh = 2.44, Wg = 7.32, D = 2;
      const palo = (h, x, y, z, rz, rx) => { const m = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, h, 10), bianco); m.position.set(x, y, z); if (rz) m.rotation.z = rz; if (rx) m.rotation.x = rx; m.castShadow = true; g.add(m); };
      palo(Hh, 0, Hh / 2, -Wg / 2); palo(Hh, 0, Hh / 2, Wg / 2); palo(Wg + 0.12, 0, Hh, 0, 0, Math.PI / 2);
      const pr = (w, h, x, y, z, ry, rx) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), reteM); m.position.set(x, y, z); if (ry) m.rotation.y = ry; if (rx) m.rotation.x = rx; g.add(m); };
      pr(Wg, Hh * 0.85, d * D, Hh * 0.42, 0, Math.PI / 2);
      pr(D, Hh, d * D / 2, Hh / 2, -Wg / 2); pr(D, Hh, d * D / 2, Hh / 2, Wg / 2);
      const top = new T.Mesh(new T.PlaneGeometry(D, Wg), reteM); top.rotation.x = -Math.PI / 2; top.position.set(d * D / 2, Hh * 0.93, 0); g.add(top);
      g.position.set(x0, 0, 0); this.sc.add(g);
    });
  }
  creaPalla(){
    const T = THREE;
    const tex = this.tela(256, 128, (g, w, h) => { g.fillStyle = '#f8fafc'; g.fillRect(0, 0, w, h); g.fillStyle = '#111827'; for (let i = 0; i < 12; i++){ const x = (i % 6) * w / 6 + (i < 6 ? 0 : w / 12), y = i < 6 ? h * 0.3 : h * 0.72; g.beginPath(); for (let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); } g.fill(); } });
    this.palla = new T.Mesh(new T.SphereGeometry(0.16, 20, 14), new T.MeshLambertMaterial({ map: tex })); this.palla.castShadow = true; this.sc.add(this.palla);
  }
  // ---------- giocatori ----------
  creaGiocatore(p){
    const T = THREE, o = this.c.o, col = p.lato ? o.colA : o.colH, gk = p.gk;
    const maglia = gk ? (String(col.c1).toLowerCase() === '#fcc419' ? '#22d3ee' : '#fcc419') : col.c1, rif = gk ? '#1f2937' : col.c2;
    const pant = gk ? '#1f2937' : (luminosita(col.c2) > 0.85 ? '#f1f3f5' : col.c2), calze = gk ? '#1f2937' : col.c1;
    const L = (c) => new T.MeshLambertMaterial({ color: new T.Color(c).convertSRGBToLinear() });
    const mM = L(maglia), mP = L(pant), mC = L(calze), mS = L(p.pelle || '#e0ac69'), mH = L(p.capelli || '#2b1d0e'), mB = L(SCARPE[(p.num || 1) % SCARPE.length]);
    const g = new T.Group(), corpo = new T.Group(); g.add(corpo);
    const add = (geo, mat, x, y, z, par = corpo) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    // busto (davanti verso +X) con numero sulla schiena
    const busto = add(new T.CylinderGeometry(0.22, 0.16, 0.56, 12), mM, 0, 1.24, 0); busto.scale.set(0.66, 1, 1);
    add(new T.SphereGeometry(0.2, 12, 8), mM, 0, 1.48, 0).scale.set(0.6, 0.35, 1);
    const num = this.tela(64, 64, (c2) => { c2.fillStyle = rif; c2.font = '800 46px "Barlow Condensed",Arial Narrow,sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(p.num || '', 32, 34); });
    const nm = new T.Mesh(new T.PlaneGeometry(0.26, 0.26), new T.MeshLambertMaterial({ map: num, transparent: true })); nm.position.set(-0.127, 1.27, 0); nm.rotation.y = -Math.PI / 2; corpo.add(nm);
    add(new T.CylinderGeometry(0.165, 0.17, 0.24, 12), mP, 0, 0.9, 0).scale.set(0.75, 1, 1);
    add(new T.CylinderGeometry(0.05, 0.055, 0.08, 8), mS, 0, 1.56, 0);
    const testa = add(new T.SphereGeometry(0.115, 14, 10), mS, 0.01, 1.68, 0); testa.scale.set(0.95, 1.08, 0.9);
    const cap = add(new T.SphereGeometry(0.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * (p.taglio === 2 ? 0.32 : 0.5)), mH, -0.01, 1.7, 0); cap.scale.set(0.98, 1.05, 0.95); cap.rotation.z = 0.25;
    // gambe e braccia con le articolazioni
    const gambe = [-1, 1].map((s) => {
      const anca = new T.Group(); anca.position.set(0, 0.9, s * 0.09); corpo.add(anca);
      add(new T.CylinderGeometry(0.075, 0.06, 0.44, 8), mS, 0, -0.22, 0, anca);
      add(new T.CylinderGeometry(0.08, 0.077, 0.12, 8), mP, 0, -0.04, 0, anca);
      const gin = new T.Group(); gin.position.set(0, -0.44, 0); anca.add(gin);
      add(new T.CylinderGeometry(0.058, 0.045, 0.42, 8), mC, 0, -0.21, 0, gin);
      add(new T.BoxGeometry(0.24, 0.07, 0.09), mB, 0.05, -0.44, 0, gin);
      return { anca, gin };
    });
    const braccia = [-1, 1].map((s) => {
      const sp = new T.Group(); sp.position.set(0, 1.45, s * 0.21); corpo.add(sp);
      add(new T.CylinderGeometry(0.052, 0.045, 0.28, 8), mM, 0, -0.14, 0, sp);
      const gom = new T.Group(); gom.position.set(0, -0.28, 0); sp.add(gom);
      add(new T.CylinderGeometry(0.04, 0.035, 0.26, 8), gk ? L('#f8fafc') : mS, 0, -0.13, 0, gom);
      return { sp, gom };
    });
    // ombra morbida sotto i piedi (oltre a quella del sole)
    const om = new T.Mesh(new T.CircleGeometry(0.42, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })); om.rotation.x = -Math.PI / 2; om.position.y = 0.015; g.add(om);
    g.scale.set(1.3, 1.3, 1.45); // un po' più grandi del vero, come nei videogiochi
    g.userData = { gambe, braccia, corpo, ang: p.lato ? Math.PI : 0 };
    this.sc.add(g); return g;
  }
  aggiornaGiocatore(g, p, dt){
    const u = g.userData, T = THREE;
    g.visible = !p.via; if (p.via) return;
    g.position.set(p.mx - 52.5, 0, p.my - 34);
    const v = Math.hypot(p.vx, p.vy);
    // si gira verso dove corre (o verso la palla se è fermo)
    let ta = u.ang; const b = this.c.b;
    if (p.scivola > 0) ta = Math.atan2(-(p.sdy || 0), p.sdx || 1);
    else if (v > 0.6) ta = Math.atan2(-p.vy, p.vx);
    else ta = Math.atan2(-(b.my - p.my), b.mx - p.mx);
    let da = ((ta - u.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI; u.ang += da * Math.min(1, dt * 10); g.rotation.y = u.ang;
    // corsa: le gambe e le braccia oscillano, il busto si piega in avanti
    const run = Math.min(1, v / 7.5), ph = (u.ph = (u.ph || 0) + dt * (5 + v * 1.25));
    u.gambe.forEach((L, k) => { const f = ph + k * Math.PI; L.anca.rotation.z = Math.sin(f) * 0.75 * run; L.gin.rotation.z = -Math.max(0, -Math.cos(f)) * 1.3 * run - 0.05; });
    u.braccia.forEach((A, k) => { const f = ph + (1 - k) * Math.PI; A.sp.rotation.z = Math.sin(f) * 0.7 * run; A.gom.rotation.z = 0.5 + run * 0.7; A.sp.rotation.x = (k ? 1 : -1) * 0.12; });
    u.corpo.rotation.z = -run * 0.16; u.corpo.position.y = Math.abs(Math.sin(ph)) * 0.04 * run;
    // tuffo del portiere, scivolata, a terra, salto di testa
    let rx = 0, rz = -run * 0.16, y = 0;
    if (p.tuffo > 0){ rx = (p.tdy || 1) * (p.lato ? 1 : -1) * 1.3; y = 0.35; }
    else if (p.scivola > 0){ rz = 1.25; y = -0.55; }
    else if (p.aTerra > 0){ rz = 1.45; y = -0.75; }
    if (p.saltoT > 0) y += Math.sin(Math.min(1, p.saltoT / 0.45) * Math.PI) * 0.55;
    u.corpo.rotation.x = rx; u.corpo.rotation.z = rz; u.corpo.position.y += y;
  }
  // ---------- disegno ----------
  render(){
    const C = this.c, now = performance.now(), dt = Math.min(0.05, (now - (this._t || now)) / 1000); this._t = now;
    for (let i = 0; i < this.gioc.length; i++) this.aggiornaGiocatore(this.gioc[i], C.tutti[i], dt);
    const b = C.b; this.palla.position.set(b.mx - 52.5, 0.16 + b.h, b.my - 34);
    const sp = Math.hypot(b.vx, b.vy); if (b.owner){ const o = b.owner; this.palla.rotation.z -= Math.hypot(o.vx, o.vy) * dt * 6; } else { this.palla.rotation.z -= sp * dt * 6; this.palla.rotation.y = Math.atan2(-b.vy, b.vx); }
    this.led.offset.x = (now / 1000 * 0.02) % 1;
    // telecamera TV: in alto sulla tribuna centrale, segue la palla
    const cx = C.camX - 52.5;
    this.cam.position.set(cx * 0.92, 31, 34 + 92); this.cam.lookAt(cx, 0, 5.5);
    this.sole.position.set(cx - 30, 70, -45); this.sole.target.position.set(cx, 0, 0);
    // gol: lampi dei flash in tribuna
    const fl = Math.max(0, C.flash || 0); this.r.toneMappingExposure = 1.05 + fl * 0.35;
    this.r.render(this.sc, this.cam);
  }
  // dal campo (metri) allo schermo, per i segni sopra la partita
  proietta(X, Y, Z){
    const v = this._v || (this._v = new THREE.Vector3()), w = this.W, h = this.H;
    v.set(X - 52.5, Z, Y - 34).project(this.cam); const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
    v.set(X - 52.5 + 1, Z, Y - 34).project(this.cam); const s = Math.abs((v.x + 1) / 2 * w - x);
    return { x, y, s, d: 1 };
  }
}
