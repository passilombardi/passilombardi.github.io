/* =========================================================
   PRESIDENTE PM — GRAFICA
   Stemmi, disegno dello stadio, partita animata, coriandoli e suoni.
   ========================================================= */
'use strict';

let _gid = 0;
function luminosita(hex){ const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16); const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const testoSu = (hex) => luminosita(hex) > 0.62 ? '#111827' : '#ffffff';
function iniziali(nome){
  const w = String(nome || '').replace(/^(ASD|Pol\.|US|GS|FC|AC|Calcio|Oratorio|Virtus|Sporting|Atletico|Real|Unione|Pro|Dinamo|Olimpia|Inter)\s+/i, '').split(/\s+/).filter((x) => x && !/^\d+$/.test(x));
  if (!w.length) return 'PM';
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
}

// ---------- stemma ----------
const FORME = [
  'M10,8 H90 V55 C90,85 70,102 50,114 C30,102 10,85 10,55 Z',
  'M50,12 A48,48 0 1 1 49.9,12 Z',
  'M50,5 L93,19 V58 C93,88 71,104 50,115 C29,104 7,88 7,58 V19 Z',
  'M50,4 L94,30 V86 L50,114 L6,86 V30 Z'
];
const SIMBOLI = [
  // stella
  '<path d="M50 38 l6.2 12.6 13.9 2 -10 9.8 2.4 13.8 -12.5 -6.6 -12.4 6.6 2.4 -13.8 -10 -9.8 13.8 -2z"/>',
  // pallone
  '<circle cx="50" cy="58" r="17" fill="#fff" stroke="#111" stroke-width="2.4"/><path d="M50 49 l7 5 -2.7 8.2 h-8.6 L43 54z" fill="#111"/><path d="M50 41v8M57 54l9-3M54.3 62.2l5 7.5M45.7 62.2l-5 7.5M43 54l-9-3" stroke="#111" stroke-width="2.2" fill="none"/>',
  // corona
  '<path d="M30 70 L27 44 L39 55 L50 38 L61 55 L73 44 L70 70 Z"/><rect x="30" y="72" width="40" height="6" rx="2"/>',
  // fulmine
  '<path d="M56 34 L36 62 H49 L44 84 L66 54 H53 Z"/>',
  // torre
  '<path d="M36 82 V50 H32 V40 H39 V45 H46 V40 H54 V45 H61 V40 H68 V50 H64 V82 Z"/><rect x="46" y="66" width="8" height="16" rx="4" fill-opacity=".35"/>',
  // ali
  '<path d="M50 50 C42 40 30 38 20 42 C28 46 31 52 32 58 C38 54 44 54 50 62 C56 54 62 54 68 58 C69 52 72 46 80 42 C70 38 58 40 50 50Z"/><circle cx="50" cy="66" r="6"/>',
  // nulla: solo lettere
  ''
];
function stemmaSVG(s, size = 48, nome = ''){
  const id = 'st' + (++_gid);
  const c1 = s.c1 || '#2563eb', c2 = s.c2 || '#f8fafc', forma = FORME[s.st || 0];
  let fondo = '';
  switch (s.pat || 0){
    case 1: fondo = `<rect width="100" height="120" fill="${c1}"/>` + [0, 1, 2, 3, 4, 5].map((i) => i % 2 ? `<rect x="${i * 100 / 6}" width="${100 / 6}" height="120" fill="${c2}"/>` : '').join(''); break;
    case 2: fondo = `<rect width="50" height="120" fill="${c1}"/><rect x="50" width="50" height="120" fill="${c2}"/>`; break;
    case 3: fondo = `<rect width="100" height="120" fill="${c1}"/><path d="M-10 30 L30 -10 L120 80 L80 120Z" fill="${c2}"/>`; break;
    case 4: fondo = `<rect width="100" height="120" fill="${c1}"/><rect y="44" width="100" height="30" fill="${c2}"/>`; break;
    default: fondo = `<rect width="100" height="120" fill="${c1}"/>`;
  }
  const centro = s.pat === 4 ? c2 : c1;
  const ink = s.pat === 1 || s.pat === 2 ? '#ffffff' : testoSu(centro);
  const inkT = s.pat === 1 || s.pat === 2 ? '#ffffff' : testoSu(c1);
  const sim = SIMBOLI[s.sim || 0];
  const ini = iniziali(nome);
  const badge = (s.pat === 1 || s.pat === 2) ? `<circle cx="50" cy="${sim ? 58 : 60}" r="24" fill="${c1}" stroke="${c2}" stroke-width="3"/>` : '';
  const testo = sim ? `<text x="50" y="102" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="15" fill="${inkT}" letter-spacing="1" ${s.pat === 1 || s.pat === 2 ? 'stroke="#000" stroke-opacity=".35" stroke-width=".8"' : ''}>${ini}</text>`
    : `<text x="50" y="72" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="34" fill="${ink}">${ini}</text>`;
  return `<svg class="stemma" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120" aria-hidden="true"><defs><clipPath id="${id}"><path d="${forma}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>
<g clip-path="url(#${id})">${fondo}${badge}<g fill="${ink}">${sim}</g>${testo}<rect width="100" height="120" fill="url(#${id}g)"/></g>
<path d="${forma}" fill="none" stroke="#f5d06b" stroke-width="4.5"/><path d="${forma}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1" transform="translate(50 60) scale(.9) translate(-50 -60)"/></svg>`;
}

// ---------- stadio visto dall'alto ----------
function stadioSVG(S){
  const st = S.stadio, dz = designDi(S), c1 = dz.s1, c2 = dz.s2;
  const W = 400, H = 300, px = 120, py = 100, pw = 160, ph = 100;
  const T = st.tribune;
  let o = `<svg viewBox="0 0 ${W} ${H}" class="stadio-svg" role="img" aria-label="Il tuo stadio"><defs>
<pattern id="erba" width="20" height="100" patternUnits="userSpaceOnUse"><rect width="10" height="100" fill="#2f9e44"/><rect x="10" width="10" height="100" fill="#37b24d"/></pattern>
<pattern id="erba2" width="16" height="100" patternUnits="userSpaceOnUse"><rect width="8" height="100" fill="#2b8a3e"/><rect x="8" width="8" height="100" fill="#40c057"/></pattern>
<pattern id="posti" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${c1}"/><rect y="3" width="6" height="1.4" fill="#000" fill-opacity=".25"/><rect x="3" width="3" height="3" fill="${c2}" fill-opacity=".55"/></pattern>
<pattern id="posti2" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${c2}"/><rect y="3" width="6" height="1.4" fill="#000" fill-opacity=".25"/><rect x="3" width="3" height="3" fill="${c1}" fill-opacity=".45"/></pattern>
<pattern id="legno" width="8" height="5" patternUnits="userSpaceOnUse"><rect width="8" height="5" fill="#a16207"/><rect y="3.6" width="8" height="1.4" fill="#713f12"/></pattern>
<radialGradient id="faro" r=".5"><stop offset="0" stop-color="#fff9db" stop-opacity=".9"/><stop offset="1" stop-color="#fff9db" stop-opacity="0"/></radialGradient>
<linearGradient id="tetto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ecef"/><stop offset="1" stop-color="#adb5bd"/></linearGradient>
<filter id="omb" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".45"/></filter>
</defs>`;
  // terreno intorno
  o += `<rect width="${W}" height="${H}" fill="#1f3b2b"/><rect width="${W}" height="${H}" fill="url(#erba2)" opacity=".12"/>`;
  // strada
  o += `<path d="M0 282 H400" stroke="#3f4a52" stroke-width="22"/><path d="M0 282 H400" stroke="#ffd43b" stroke-width="1.5" stroke-dasharray="10 10"/>`;
  // parcheggio
  if (st.park > 0){
    const pw2 = 40 + st.park * 22;
    o += `<rect x="${W - pw2 - 8}" y="232" width="${pw2}" height="40" rx="4" fill="${st.park >= 2 ? '#495057' : '#8d6e4f'}" filter="url(#omb)"/>`;
    for (let i = 0; i < st.park * 5; i++) o += `<rect x="${W - pw2 - 2 + (i % (st.park * 3)) * 11}" y="${238 + Math.floor(i / (st.park * 3)) * 16}" width="7" height="11" rx="2" fill="${['#e03131','#1971c2','#f8f9fa','#fab005','#2f9e44','#212529'][i % 6]}"/>`;
    if (st.park >= 3) o += `<rect x="${W - pw2 - 8}" y="232" width="${pw2}" height="40" rx="4" fill="none" stroke="#ced4da" stroke-width="2"/>`;
  }
  // centro giovanile: campetto
  if (st.giov > 0){
    o += `<g filter="url(#omb)"><rect x="330" y="26" width="58" height="${38 + st.giov * 8}" rx="3" fill="url(#erba)"/><rect x="334" y="30" width="50" height="${30 + st.giov * 8}" fill="none" stroke="#fff" stroke-width="1.2"/><line x1="334" y1="${45 + st.giov * 4}" x2="384" y2="${45 + st.giov * 4}" stroke="#fff" stroke-width="1"/></g>`;
    if (st.giov >= 3) o += `<rect x="330" y="${72 + st.giov * 8}" width="58" height="22" rx="3" fill="#e9ecef" filter="url(#omb)"/><text x="359" y="${87 + st.giov * 8}" font-size="8" text-anchor="middle" font-family="Barlow Condensed" fill="#343a40">ACCADEMIA</text>`;
  }
  // negozio
  if (st.negozio > 0){
    const nw = 34 + st.negozio * 10;
    o += `<g filter="url(#omb)"><rect x="12" y="228" width="${nw}" height="36" rx="3" fill="#f8f9fa"/><rect x="12" y="228" width="${nw}" height="10" fill="${c1}"/>`;
    for (let i = 0; i < nw / 6; i++) o += `<rect x="${12 + i * 6}" y="238" width="3" height="5" fill="${c2}"/>`;
    o += `<text x="${12 + nw / 2}" y="257" font-size="8" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" fill="#343a40">${['', 'CHIOSCO', 'BAR', 'STORE', 'MEGASTORE'][st.negozio]}</text></g>`;
  }
  // spogliatoi
  const sw = 26 + st.spogl * 7;
  o += `<g filter="url(#omb)"><rect x="8" y="62" width="${sw}" height="26" rx="${st.spogl ? 3 : 1}" fill="${st.spogl ? '#dee2e6' : '#868e96'}"/>${st.spogl >= 3 ? `<rect x="8" y="62" width="${sw}" height="7" fill="${c1}"/>` : ''}${st.spogl >= 4 ? `<circle cx="${8 + sw - 9}" cy="79" r="5" fill="#66d9e8"/>` : ''}</g>`;
  // tribune
  const band = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const t = [0, 10, 14, 16, 18, 22, 30, 36, 42, 48][T];
  if (T === 0){
    o += `<rect x="${px - 8}" y="${py - 8}" width="${pw + 16}" height="${ph + 16}" fill="none" stroke="#adb5bd" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  } else if (T <= 2){
    o += `<g filter="url(#omb)">${band(px + 30, py + ph + 6, pw - 60, t, T === 1 ? 'url(#legno)' : 'url(#posti)')}${T === 2 ? `<rect x="${px + 26}" y="${py + ph + 4 + t}" width="${pw - 52}" height="5" fill="url(#tetto)"/>` : ''}</g>`;
  } else if (T <= 3){
    o += `<g filter="url(#omb)">${band(px + 6, py + ph + 6, pw - 12, t, 'url(#posti)')}${band(px + 6, py - 6 - t, pw - 12, t, 'url(#posti)')}</g>`;
  } else if (T <= 6){
    const g = 6;
    o += `<g filter="url(#omb)">`;
    o += band(px - 2, py + ph + g, pw + 4, t, 'url(#posti)') + band(px - 2, py - g - t, pw + 4, t, 'url(#posti)');
    o += band(px - g - t, py - 2, t, ph + 4, 'url(#posti2)') + band(px + pw + g, py - 2, t, ph + 4, 'url(#posti2)');
    if (T >= 5){ // angoli
      [[px - g - t, py - g - t], [px + pw + g - 2, py - g - t], [px - g - t, py + ph + g - 2], [px + pw + g - 2, py + ph + g - 2]].forEach(([x, y]) => { o += `<rect x="${x}" y="${y}" width="${t + 2}" height="${t + 2}" fill="url(#posti)"/>`; });
    }
    if (T >= 6){ // secondo anello
      o += `<rect x="${px - g - t}" y="${py - g - t}" width="${pw + 2 * (g + t)}" height="${ph + 2 * (g + t)}" fill="none" stroke="${c2}" stroke-opacity=".7" stroke-width="3"/>`;
      o += `<rect x="${px - g - t / 2}" y="${py - g - t / 2}" width="${pw + 2 * g + t}" height="${ph + 2 * g + t}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.5"/>`;
    }
    o += `</g>`;
  } else { // catino moderno con tetto
    const g = 6, R = 26 + (T - 7) * 6;
    const x0 = px - g - t, y0 = py - g - t, w0 = pw + 2 * (g + t), h0 = ph + 2 * (g + t);
    o += `<g filter="url(#omb)"><rect x="${x0}" y="${y0}" width="${w0}" height="${h0}" rx="${R}" fill="url(#posti)"/>`;
    o += `<rect x="${x0 + t * 0.45}" y="${y0 + t * 0.45}" width="${w0 - t * 0.9}" height="${h0 - t * 0.9}" rx="${R * 0.7}" fill="url(#posti2)" opacity=".85"/>`;
    o += `<rect x="${x0 - 4}" y="${y0 - 4}" width="${w0 + 8}" height="${h0 + 8}" rx="${R + 4}" fill="none" stroke="url(#tetto)" stroke-width="${T >= 8 ? 10 : 7}"/>`;
    if (T >= 9) o += `<rect x="${x0 - 4}" y="${y0 - 4}" width="${w0 + 8}" height="${h0 + 8}" rx="${R + 4}" fill="none" stroke="${c1}" stroke-width="2.5"><animate attributeName="stroke-opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/></rect>`;
    o += `</g>`;
  }
  // campo da gioco
  const usura = st.usura;
  let campo;
  if (st.campo === 0) campo = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#b08355"/><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="url(#erba)" opacity=".18"/>`;
  else if (st.campo === 1) campo = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#38b24f"/>`;
  else campo = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="url(#${st.campo >= 3 ? 'erba' : 'erba2'})"/>`;
  o += campo;
  if (usura < 75 && st.campo > 0){ const r2 = rng('usura'); for (let i = 0; i < (80 - usura) / 4; i++) o += `<ellipse cx="${px + 10 + r2() * (pw - 20)}" cy="${py + 10 + r2() * (ph - 20)}" rx="${3 + r2() * 7}" ry="${2 + r2() * 4}" fill="#8d6e4f" opacity=".75"/>`; }
  const L = 'stroke="#fff" stroke-opacity=".9" stroke-width="1.3" fill="none"';
  o += `<rect x="${px + 4}" y="${py + 4}" width="${pw - 8}" height="${ph - 8}" ${L}/><line x1="${px + pw / 2}" y1="${py + 4}" x2="${px + pw / 2}" y2="${py + ph - 4}" ${L}/><circle cx="${px + pw / 2}" cy="${py + ph / 2}" r="13" ${L}/>
  <rect x="${px + 4}" y="${py + ph / 2 - 22}" width="24" height="44" ${L}/><rect x="${px + pw - 28}" y="${py + ph / 2 - 22}" width="24" height="44" ${L}/>
  <rect x="${px + 1}" y="${py + ph / 2 - 7}" width="3" height="14" fill="#fff"/><rect x="${px + pw - 4}" y="${py + ph / 2 - 7}" width="3" height="14" fill="#fff"/>`;
  if (st.campo >= 4) o += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#ff922b" stroke-opacity=".5" stroke-width="2"/>`;
  // maxischermo
  if (st.maxi > 0){
    const mx = px + pw / 2 - (st.maxi === 2 ? 34 : 22), my = Math.max(4, py - (T >= 4 ? 6 + t + 26 : 30));
    o += `<g filter="url(#omb)"><rect x="${mx}" y="${my}" width="${st.maxi === 2 ? 68 : 44}" height="${st.maxi === 2 ? 20 : 14}" rx="2" fill="#111"/><rect x="${mx + 2}" y="${my + 2}" width="${st.maxi === 2 ? 64 : 40}" height="${st.maxi === 2 ? 16 : 10}" fill="${c1}"/><text x="${px + pw / 2}" y="${my + (st.maxi === 2 ? 14 : 10)}" text-anchor="middle" font-size="${st.maxi === 2 ? 9 : 7}" font-family="Barlow Condensed" font-weight="800" fill="${testoSu(c1)}">${st.maxi === 2 ? '⚽ ' + iniziali(S.club.nome) + ' ⚽' : iniziali(S.club.nome)}</text></g>`;
  }
  // luci
  if (st.luci > 0){
    const d = T >= 7 ? t + 6 : T >= 4 ? 10 + t : 14;
    const pts = [[px - d, py - d], [px + pw + d, py - d], [px - d, py + ph + d], [px + pw + d, py + ph + d]];
    pts.forEach(([x, y]) => {
      if (st.luci >= 2) o += `<circle cx="${(x + px + pw / 2) / 2}" cy="${(y + py + ph / 2) / 2}" r="${36 + st.luci * 8}" fill="url(#faro)" opacity="${0.18 + st.luci * 0.07}"/>`;
      o += `<circle cx="${x}" cy="${y}" r="${st.luci >= 2 ? 5 : 3}" fill="#343a40" stroke="#fff9db" stroke-width="${st.luci >= 2 ? 2.5 : 1.5}"/>`;
    });
    if (st.luci >= 3) o += `<rect x="${px - 3}" y="${py - 3}" width="${pw + 6}" height="${ph + 6}" fill="none" stroke="#a5d8ff" stroke-width="1.5"><animate attributeName="stroke-opacity" values=".9;.2;.9" dur="1.8s" repeatCount="indefinite"/></rect>`;
  }
  o += `</svg>`;
  return o;
}

// ---------- coriandoli ----------
function coriandoli(colori, quanti = 140){
  const cv = document.createElement('canvas'); cv.className = 'coriandoli';
  document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.scale(dpr, dpr);
  const P = Array.from({ length: quanti }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, c: colori[Math.floor(Math.random() * colori.length)] }));
  const t0 = performance.now();
  (function f(t){
    x.clearRect(0, 0, W, H);
    P.forEach((p) => { p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); x.restore(); });
    if (t - t0 < 3600) requestAnimationFrame(f); else cv.remove();
  })(t0);
}

// ---------- suoni (sintetizzati, nessun file) ----------
const Suono = {
  ctx: null, on: true, folla: null,
  init(){ if (this.ctx || !this.on) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
  rumore(sec){ const c = this.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; },
  fischio(n = 1){
    if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    for (let k = 0; k < n; k++){
      const t = c.currentTime + k * 0.42, dur = k === n - 1 && n > 1 ? 0.75 : 0.28;
      const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.frequency.value = 2900; l.frequency.value = 38; lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.02); g.gain.setValueAtTime(0.09, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); l.start(t); o.stop(t + dur); l.stop(t + dur);
    }
  },
  avviaFolla(){
    if (!this.on) return; this.init(); const c = this.ctx; if (!c || this.folla) return;
    const s = c.createBufferSource(); s.buffer = this.rumore(3); s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0.035; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    this.folla = { s, g };
  },
  fermaFolla(){ if (this.folla){ try { this.folla.s.stop(); } catch (e) {} this.folla = null; } },
  boato(forte = 1){
    if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = this.rumore(3);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.5;
    const g = c.createGain(), t = c.currentTime;
    g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.22 * forte, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 3);
  },
  ooh(){ if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = this.rumore(1.4); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = c.createGain(), t = c.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 1.4); },
  cassa(){ if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    [880, 1320].forEach((fr, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.07; o.type = 'triangle'; o.frequency.value = fr; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.26); }); },
  fanfara(){ if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    [523, 659, 784, 1047, 784, 1047].forEach((fr, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.16; o.type = 'sawtooth'; o.frequency.value = fr; g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + (i === 5 ? 0.9 : 0.2)); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 1); }); }
};

// ---------- la partita animata ----------
// Mostra in campo la partita già decisa (risultato e minuti dei gol) con azioni, parate e telecronaca.
class Partita {
  constructor(cv, info){
    this.cv = cv; this.x = cv.getContext('2d'); this.info = info; // info: {casa:{c1,c2,mod}, ospiti:{...}, eventi:[{min,tipo,lato}]}
    this.min = 0; this.vel = 2; this.pausa = 0; this.fine = false; this.cb = info.onEvento || (() => {}); this.onFine = info.onFine || (() => {});
    this.ev = info.eventi.slice().sort((a, b) => a.min - b.min); this.k = 0; this.durata = info.durata || 93;
    this.palla = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }; this.poss = 0; this.cambio = 0; this.script = null; this.flash = 0;
    this.sq = [this.formazione(info.casa.mod, 0), this.formazione(info.ospiti.mod, 1)];
    this.sq.forEach((sq, lato) => { const g = (lato ? info.ospiti : info.casa).giocatori || []; sq.forEach((p, i) => { const x = g[i] || {}; p.num = x.num || (i + 1); p.nome = x.nome || ''; const h = hashStr((x.nome || '') + lato + i); p.pelle = PELLI[h % PELLI.length]; p.capelli = CAPELLI[(h >> 4) % CAPELLI.length]; p.taglio = (h >> 8) % 4; p.dir = lato ? -1 : 1; }); });
    this.folla = Array.from({ length: 260 }, (_, k) => ({ x: Math.random(), y: Math.random(), c: Math.random() < 0.5 ? info.casa.c1 : (Math.random() < 0.5 ? info.casa.c2 : info.ospiti.c1), f: Math.random() * 6 }));
    this.palla.z = 0;
    this.vista = info.vista || 'tv';
    this.resize(); this._r = () => this.resize(); addEventListener('resize', this._r);
    this.t = performance.now(); this._f = (t) => this.loop(t); requestAnimationFrame(this._f);
  }
  formazione(mod, lato){
    const linee = [[1]].concat((MODULI[mod] || [4, 4, 2]).map((n) => [n]));
    const pts = []; const xs = [0.05, 0.24, 0.42, 0.62, 0.78];
    const lin = linee.length;
    linee.forEach(([n], li) => {
      const x = lin === 4 ? [0.05, 0.25, 0.47, 0.7][li] : xs[li];
      for (let i = 0; i < n; i++){ const y = (i + 1) / (n + 1); pts.push({ bx: lato ? 1 - x : x, by: y, x: lato ? 1 - x : x, y, n: pts.length + 1 }); }
    });
    return pts;
  }
  resize(){ const r = this.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = r.width * d; this.cv.height = r.height * d; this.x.setTransform(d, 0, 0, d, 0, 0); }
  // cambia giocatori o modulo durante la partita (cambi, espulsioni, nuovo modulo)
  aggiorna(lato, mod, giocatori){
    const vecchi = this.sq[lato], nuovi = this.formazione(mod, lato);
    nuovi.forEach((p, i) => { const v = vecchi[i]; if (v){ p.x = v.x; p.y = v.y; p.fase = v.fase; } const x = giocatori[i] || {}; p.num = x.num || ''; p.nome = x.nome || ''; p.via = !!x.via; const h = hashStr((x.nome || '') + lato + i); p.pelle = PELLI[h % PELLI.length]; p.capelli = CAPELLI[(h >> 4) % CAPELLI.length]; p.taglio = (h >> 8) % 4; p.dir = lato ? -1 : 1; });
    this.sq[lato] = nuovi;
  }
  stop(){ this.fine = true; removeEventListener('resize', this._r); }
  salta(){ while (this.k < this.ev.length){ this.cb(this.ev[this.k], true); this.k++; } this.min = this.durata; this.fine = true; this.onFine(); }
  loop(t){
    if (this.fine && this.k >= this.ev.length && this.min >= this.durata) { this.disegna(); return; }
    const dt = Math.min(0.05, (t - this.t) / 1000); this.t = t;
    if (this.pausa > 0){ this.pausa -= dt; }
    else {
      this.min += dt * this.vel * 3.2;
      while (this.k < this.ev.length && this.ev[this.k].min <= this.min){
        const e = this.ev[this.k]; this.k++; this.cb(e, false);
        if (e.tipo === 'gol'){ this.script = { tipo: 'gol', lato: e.lato, t: 0 }; this.pausa = 1.9; this.flash = 1; }
        else if (e.tipo === 'occ' || e.tipo === 'parata' || e.tipo === 'palo'){ this.script = { tipo: e.tipo, lato: e.lato, t: 0 }; this.pausa = 0.6; }
        else if (e.tipo === 'int'){ this.pausa = 1.2; this.palla.tx = 0.5; this.palla.ty = 0.5; }
      }
      // pre-azione: se fra poco c'è un evento, la palla va verso la porta
      const pros = this.ev[this.k];
      if (pros && (pros.tipo === 'gol' || pros.tipo === 'occ' || pros.tipo === 'parata' || pros.tipo === 'palo') && pros.min - this.min < 1.6){
        this.poss = pros.lato; const gx = pros.lato === 0 ? 0.86 : 0.14; this.palla.tx = gx; this.palla.ty = 0.5 + (Math.random() - 0.5) * 0.25;
      } else if ((this.cambio -= dt * this.vel) <= 0){
        this.cambio = 0.5 + Math.random() * 0.9;
        if (Math.random() < 0.18) this.poss = 1 - this.poss;
        const sq = this.sq[this.poss]; const pl = sq[1 + Math.floor(Math.random() * 10)];
        const avanti = this.poss === 0 ? 0.12 : -0.12;
        this.palla.tx = clamp(pl.x + avanti * Math.random(), 0.08, 0.92); this.palla.ty = clamp(pl.y + (Math.random() - 0.5) * 0.15, 0.06, 0.94);
      }
      if (this.min >= this.durata && this.k >= this.ev.length){ this.fine = true; this.onFine(); }
    }
    // script di tiro
    if (this.script){
      const s = this.script; s.t += dt;
      const gx = s.lato === 0 ? 1.0 : 0.0;
      if (s.tipo === 'gol'){ this.palla.tx = gx + (s.lato === 0 ? 0.015 : -0.015); this.palla.ty = 0.5 + Math.sin(s.t * 3) * 0.02; }
      else if (s.tipo === 'occ'){ this.palla.tx = gx; this.palla.ty = 0.3; }
      else if (s.tipo === 'palo'){ this.palla.tx = gx; this.palla.ty = 0.455; }
      else { this.palla.tx = s.lato === 0 ? 0.95 : 0.05; this.palla.ty = 0.5; }
      if (s.t > (s.tipo === 'gol' ? 1.8 : 0.6)){ this.script = null; this.palla.x = this.palla.tx = 0.5; this.palla.y = this.palla.ty = 0.5; if (s.tipo !== 'gol'){ this.palla.x = s.lato === 0 ? 0.92 : 0.08; } this.poss = s.tipo === 'gol' ? 1 - s.lato : 1 - s.lato; }
    }
    this.cam = (this.cam == null ? 0.5 : this.cam) + (clamp(this.palla.x, 0.28, 0.72) - (this.cam == null ? 0.5 : this.cam)) * Math.min(1, dt * 1.6);
    const sp = this.script ? 6 : 3;
    this.palla.x += (this.palla.tx - this.palla.x) * Math.min(1, dt * sp);
    this.palla.y += (this.palla.ty - this.palla.y) * Math.min(1, dt * sp);
    // giocatori: seguono la palla restando vicino al loro posto
    this.sq.forEach((sq, lato) => sq.forEach((p, i) => {
      const att = this.poss === lato;
      const spinta = (lato === 0 ? 1 : -1) * (att ? 0.1 : -0.04);
      let tx = p.bx + spinta + (this.palla.x - 0.5) * 0.35, ty = p.by + (this.palla.y - p.by) * (i === 0 ? 0.25 : 0.32);
      if (i > 0){ tx += Math.cos(this.min * 0.7 + i * 2.3 + lato) * 0.035; ty += Math.sin(this.min * 0.9 + i * 1.7 + lato * 3) * 0.06; }
      if (i === 0) tx = p.bx + (this.palla.x - (lato ? 1 : 0)) * 0.06;
      const ox = p.x, oy = p.y;
      p.x += (clamp(tx, 0.03, 0.97) - p.x) * Math.min(1, dt * 1.6); p.y += (clamp(ty, 0.04, 0.96) - p.y) * Math.min(1, dt * 1.6);
      const v = Math.hypot(p.x - ox, p.y - oy) / Math.max(dt, 0.001);
      p.v = (p.v || 0) * 0.85 + v * 0.15; p.fase = (p.fase || i) + dt * (4 + p.v * 60); if (Math.abs(p.x - ox) > 0.0004) p.dir = p.x > ox ? 1 : -1;
    }));
    if (this.flash > 0) this.flash -= dt * 0.8;
    this.disegna();
    requestAnimationFrame(this._f);
  }
  // campo in prospettiva: x lungo il campo (0..1), y in profondità (0 lontano, 1 vicino)
  proietta(x, y){
    const W = this.W, H = this.H, top = H * 0.22, bot = H * 0.95;
    const w = W * (0.66 + 0.3 * y) / 0.56;
    return { x: W / 2 + (x - (this.cam == null ? 0.5 : this.cam)) * w, y: top + (bot - top) * y, k: (0.62 + 0.42 * y) * 1.55 };
  }
  disegna(){
    if (this.vista === 'alto' || this.vista === 'numeri') return this.disegnaAlto(this.vista === 'numeri');
    const c = this.x, W = this.W, H = this.H; if (!W) return;
    const P = (x, y) => this.proietta(x, y);
    const t = performance.now() / 1000;
    // cielo di notte e tribune piene
    const cielo = c.createLinearGradient(0, 0, 0, H * 0.25); cielo.addColorStop(0, '#050b1a'); cielo.addColorStop(1, '#13233f');
    c.fillStyle = cielo; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1b2433'; c.fillRect(0, H * 0.06, W, H * 0.16);
    this.folla.forEach((f) => { const px = f.x * W, py = H * 0.07 + f.y * H * 0.14; const sal = this.flash > 0 ? Math.abs(Math.sin(t * 12 + f.f)) * 3 : Math.abs(Math.sin(t * 2 + f.f)) * 0.8;
      c.fillStyle = f.c; c.globalAlpha = 0.85; c.fillRect(px, py - sal, 3, 3); c.globalAlpha = 1; });
    for (let k = 0; k < 4; k++){ const fx = W * (0.12 + k * 0.25); const g = c.createRadialGradient(fx, H * 0.03, 0, fx, H * 0.03, W * 0.18); g.addColorStop(0, 'rgba(255,250,220,.55)'); g.addColorStop(1, 'rgba(255,250,220,0)'); c.fillStyle = g; c.fillRect(fx - W * 0.2, 0, W * 0.4, H * 0.3); }
    c.fillStyle = '#0c3b1f'; c.fillRect(0, H * 0.205, W, H);
    // erba a strisce
    const quad = (x0, y0, x1, y1) => { const a = P(x0, y0), b = P(x1, y0), d = P(x0, y1), e = P(x1, y1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.lineTo(d.x, d.y); c.closePath(); };
    for (let i = 0; i < 14; i++){ quad(-0.04 + i * 1.08 / 14, -0.06, -0.04 + (i + 1) * 1.08 / 14, 1.04); c.fillStyle = i % 2 ? '#2f9e44' : '#3cb553'; c.fill(); }
    const vign = c.createLinearGradient(0, H * 0.2, 0, H); vign.addColorStop(0, 'rgba(0,0,0,.28)'); vign.addColorStop(0.5, 'rgba(0,0,0,0)'); vign.addColorStop(1, 'rgba(0,0,0,.15)'); c.fillStyle = vign; c.fillRect(0, H * 0.2, W, H);
    // linee
    c.strokeStyle = 'rgba(255,255,255,.88)'; c.lineCap = 'round';
    const linea = (pts) => { c.beginPath(); pts.forEach(([x, y], k) => { const q = P(x, y); c.lineWidth = 1.2 + q.k * 1.2; k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke(); };
    linea([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]); linea([[0.5, 0], [0.5, 1]]);
    const cerchio = []; for (let a = 0; a <= 40; a++){ const an = a / 40 * Math.PI * 2; cerchio.push([0.5 + Math.cos(an) * 0.085, 0.5 + Math.sin(an) * 0.14]); } linea(cerchio);
    [[0, 1], [1, -1]].forEach(([x0, d]) => { linea([[x0, 0.22], [x0 + d * 0.16, 0.22], [x0 + d * 0.16, 0.78], [x0, 0.78]]); linea([[x0, 0.37], [x0 + d * 0.055, 0.37], [x0 + d * 0.055, 0.63], [x0, 0.63]]); });
    // porte con la rete
    const porta = (x0, d) => { const a = P(x0, 0.43), b = P(x0, 0.57), h1 = 26 * a.k * (H / 300), h2 = 26 * b.k * (H / 300), dx = d * -10 * a.k;
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + dx, a.y - h1 * 0.8); c.lineTo(b.x + dx, b.y - h2 * 0.8); c.lineTo(b.x, b.y); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.7; for (let k = 1; k < 6; k++){ const f = k / 6; c.beginPath(); c.moveTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f - (h1 + (h2 - h1) * f)); c.lineTo(a.x + (b.x - a.x) * f + dx, a.y + (b.y - a.y) * f - (h1 + (h2 - h1) * f) * 0.8); c.stroke(); }
      c.strokeStyle = '#fff'; c.lineWidth = 2.5 * a.k; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x, a.y - h1); c.lineTo(b.x, b.y - h2); c.lineTo(b.x, b.y); c.stroke(); };
    porta(0, 1); porta(1, -1);
    // giocatori e palla, dal più lontano al più vicino
    const col = [this.info.casa, this.info.ospiti];
    const tutti = [];
    this.sq.forEach((sq, lato) => sq.forEach((p, i) => { if (!p.via) tutti.push({ p, lato, i }); }));
    let vicino = null, dmin = 9;
    tutti.forEach((o) => { const d = Math.hypot(o.p.x - this.palla.x, (o.p.y - this.palla.y) * 0.6); if (d < dmin){ dmin = d; vicino = o; } });
    const z = this.script ? Math.sin(Math.min(1, this.script.t / 0.7) * Math.PI) * 0.6 : 0;
    tutti.push({ palla: true, p: { y: this.palla.y + 0.001 } });
    tutti.sort((a, b) => a.p.y - b.p.y);
    const base = H / 300;
    tutti.forEach((o) => {
      if (o.palla){
        const q = P(this.palla.x, this.palla.y), r = Math.max(2.5, 4.2 * q.k * base);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(q.x, q.y, r * 1.1, r * 0.45, 0, 0, 7); c.fill();
        const by = q.y - r - z * 40 * base * q.k;
        c.fillStyle = '#fff'; c.beginPath(); c.arc(q.x, by, r, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 0.8; c.stroke();
        c.fillStyle = '#222'; c.beginPath(); c.arc(q.x + Math.cos(t * 9) * r * 0.35, by + Math.sin(t * 9) * r * 0.35, r * 0.38, 0, 7); c.fill();
        return;
      }
      this.omino(o.p, col[o.lato], o.i === 0, o === vicino, base);
    });
    if (this.flash > 0){ c.fillStyle = `rgba(255,255,255,${this.flash * 0.3})`; c.fillRect(0, 0, W, H); }
  }
  // vista dall'alto: campo intero, giocatori visti da sopra (testa, spalle, numero) o solo numeri
  disegnaAlto(soloNumeri){
    const x = this.x, W = this.W, H = this.H; if (!W) return;
    const m = 14, fw = W - 2 * m, fh = H - 2 * m;
    x.fillStyle = '#1e7b34'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++){ x.fillStyle = i % 2 ? '#2f9e44' : '#37b24d'; x.fillRect(m + i * fw / 12, m, fw / 12 + 1, fh); }
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.6;
    x.strokeRect(m, m, fw, fh); x.beginPath(); x.moveTo(W / 2, m); x.lineTo(W / 2, H - m); x.stroke();
    x.beginPath(); x.arc(W / 2, H / 2, fh * 0.15, 0, 7); x.stroke();
    const aw = fw * 0.15, ah = fh * 0.5; x.strokeRect(m, H / 2 - ah / 2, aw, ah); x.strokeRect(W - m - aw, H / 2 - ah / 2, aw, ah);
    x.strokeRect(m, H / 2 - ah / 4, aw / 2.6, ah / 2); x.strokeRect(W - m - aw / 2.6, H / 2 - ah / 4, aw / 2.6, ah / 2);
    x.fillStyle = '#fff'; x.fillRect(m - 5, H / 2 - fh * 0.08, 5, fh * 0.16); x.fillRect(W - m, H / 2 - fh * 0.08, 5, fh * 0.16);
    const col = [this.info.casa, this.info.ospiti];
    const rr = Math.max(6, Math.min(11, W / 50));
    let vicino = null, dmin = 9;
    this.sq.forEach((sq, lato) => sq.forEach((p) => { const d = Math.hypot(p.x - this.palla.x, p.y - this.palla.y); if (d < dmin){ dmin = d; vicino = p; } }));
    this.sq.forEach((sq, lato) => sq.forEach((p, i) => {
      if (p.via) return;
      const px = m + p.x * fw, py = m + p.y * fh, gk = i === 0, maglia = gk ? '#fcc419' : col[lato].c1, bordo = gk ? '#111' : col[lato].c2;
      x.beginPath(); x.ellipse(px + 2, py + 3, rr, rr * 0.8, 0, 0, 7); x.fillStyle = 'rgba(0,0,0,.25)'; x.fill();
      if (soloNumeri){
        x.beginPath(); x.arc(px, py, rr, 0, 7); x.fillStyle = maglia; x.fill(); x.lineWidth = 2; x.strokeStyle = bordo; x.stroke();
      } else {
        // spalle e braccia che si muovono, poi la testa vista da sopra
        const sw = Math.sin(p.fase || 0) * rr * 0.35 * Math.min(1, (p.v || 0) * 25 + 0.15);
        x.fillStyle = gk ? '#f8f9fa' : p.pelle; x.beginPath(); x.arc(px + sw, py - rr * 0.95, rr * 0.28, 0, 7); x.arc(px - sw, py + rr * 0.95, rr * 0.28, 0, 7); x.fill();
        x.beginPath(); x.ellipse(px, py, rr * 0.62, rr * 1.0, 0, 0, 7); x.fillStyle = maglia; x.fill(); x.lineWidth = 1.6; x.strokeStyle = bordo; x.stroke();
        x.beginPath(); x.arc(px + (p.dir || 1) * rr * 0.12, py, rr * 0.48, 0, 7); x.fillStyle = p.capelli; x.fill();
      }
      x.font = `800 ${Math.round(rr * (soloNumeri ? 1.15 : 0.85))}px "Barlow Condensed",Arial Narrow,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const ty = soloNumeri ? py + 1 : py - rr * 1.55;
      x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.6)'; x.strokeText(p.num, px, ty); x.fillStyle = soloNumeri ? (gk ? '#111' : testoSu(maglia)) : '#fff';
      if (soloNumeri && !gk) { x.lineWidth = 0; } x.fillText(p.num, px, ty);
      if (p === vicino && p.nome && !soloNumeri){ x.font = `700 11px Barlow,system-ui,sans-serif`; const tw = x.measureText(p.nome).width + 8; x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(px - tw / 2, py + rr * 1.3, tw, 15); x.fillStyle = '#fff'; x.fillText(p.nome, px, py + rr * 1.3 + 8); }
    }));
    const bx = m + this.palla.x * fw, by = m + this.palla.y * fh, z = this.script ? Math.sin(Math.min(1, this.script.t / 0.7) * Math.PI) : 0;
    x.beginPath(); x.ellipse(bx + 2 + z * 4, by + 2 + z * 4, rr * 0.5, rr * 0.4, 0, 0, 7); x.fillStyle = 'rgba(0,0,0,.3)'; x.fill();
    x.beginPath(); x.arc(bx, by, rr * (0.5 + z * 0.25), 0, 7); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 1; x.strokeStyle = '#111'; x.stroke();
    if (this.flash > 0){ x.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`; x.fillRect(0, 0, W, H); }
  }
  // un giocatore: ombra, gambe che corrono, maglia con il numero, braccia, faccia con i capelli
  omino(p, col, portiere, conPalla, base){
    const c = this.x, q = this.proietta(p.x, p.y), s = q.k * base * 1.08;
    const x = q.x, y = q.y, dir = p.dir || 1;
    const corsa = Math.min(1, (p.v || 0) * 25 + 0.15), ang = Math.sin(p.fase || 0) * 0.65 * corsa;
    const maglia = portiere ? '#fcc419' : col.c1, bordo = portiere ? '#212529' : col.c2;
    const pantaloni = portiere ? '#212529' : (luminosita(col.c2) > 0.85 ? '#f1f3f5' : col.c2);
    c.fillStyle = 'rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(x, y, 8 * s, 2.8 * s, 0, 0, 7); c.fill();
    // gambe
    const anca = y - 13 * s;
    [ang, -ang].forEach((a, k) => { const fx = x + Math.sin(a) * 8 * s * dir + (k ? 1.5 : -1.5) * s, fy = y - Math.cos(a) * 1.2 * s;
      c.strokeStyle = maglia === '#fcc419' ? '#343a40' : col.c1; c.lineWidth = 3.2 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + (k ? 1.5 : -1.5) * s, anca); c.lineTo(fx, fy - 1 * s); c.stroke();
      c.fillStyle = '#111'; c.beginPath(); c.ellipse(fx + dir * 1.3 * s, fy, 2.4 * s, 1.3 * s, 0, 0, 7); c.fill(); });
    // pantaloncini
    c.fillStyle = pantaloni; c.beginPath(); c.roundRect ? c.roundRect(x - 5.2 * s, anca - 4.5 * s, 10.4 * s, 6 * s, 1.5 * s) : c.rect(x - 5.2 * s, anca - 4.5 * s, 10.4 * s, 6 * s); c.fill();
    // braccia
    [-ang, ang].forEach((a, k) => { const sx = x + (k ? 5.5 : -5.5) * s, sy = anca - 13 * s;
      c.strokeStyle = maglia; c.lineWidth = 2.8 * s; c.beginPath(); c.moveTo(sx, sy); const ex = sx + Math.sin(a) * 6 * s * dir, ey = sy + Math.cos(a) * 8 * s; c.lineTo(ex, ey); c.stroke();
      c.fillStyle = portiere ? '#f8f9fa' : p.pelle; c.beginPath(); c.arc(ex, ey, 1.7 * s, 0, 7); c.fill(); });
    // maglia
    const mx = x - 6 * s, my = anca - 15 * s, mw = 12 * s, mh = 12.5 * s;
    c.fillStyle = maglia; c.beginPath(); c.roundRect ? c.roundRect(mx, my, mw, mh, 3 * s) : c.rect(mx, my, mw, mh); c.fill();
    c.fillStyle = bordo; c.fillRect(mx, my + mh - 1.6 * s, mw, 1.6 * s); c.fillRect(x - 2.2 * s, my - 0.6 * s, 4.4 * s, 1.6 * s);
    if (s > 0.55){ c.font = `800 ${Math.round(7.5 * s)}px "Barlow Condensed",Arial Narrow,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 2 * s; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(p.num, x, my + mh * 0.5); c.fillStyle = portiere ? '#111' : testoSu(maglia); c.fillText(p.num, x, my + mh * 0.5); }
    // testa e faccia
    const hx = x + dir * 0.6 * s, hy = my - 4.6 * s, r = 4.4 * s;
    c.fillStyle = p.pelle; c.beginPath(); c.arc(hx, hy, r, 0, 7); c.fill();
    c.fillStyle = p.capelli; c.beginPath();
    if (p.taglio === 0) c.arc(hx, hy - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    else if (p.taglio === 1){ c.arc(hx, hy, r * 1.05, Math.PI, Math.PI * 2); c.lineTo(hx + r, hy - r * 0.1); }
    else if (p.taglio === 2){ c.arc(hx, hy - r * 0.3, r * 0.95, Math.PI * 0.95, Math.PI * 2.05); }
    else { c.ellipse(hx, hy - r * 0.55, r * 0.9, r * 0.6, 0, Math.PI, Math.PI * 2); }
    c.fill();
    if (s > 0.5){ c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(hx + dir * r * 0.38, hy + r * 0.05, Math.max(0.6, r * 0.13), 0, 7); c.arc(hx + dir * r * 0.0, hy + r * 0.05, Math.max(0.6, r * 0.13), 0, 7); c.fill();
      c.strokeStyle = 'rgba(120,40,30,.8)'; c.lineWidth = Math.max(0.6, r * 0.12); c.beginPath(); c.arc(hx + dir * r * 0.2, hy + r * 0.38, r * 0.22, 0.2, Math.PI - 0.2); c.stroke(); }
    // nome di chi ha la palla
    if (conPalla && p.nome){
      c.font = `700 ${Math.round(Math.max(10, 9 * s))}px Barlow,system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom';
      const tw = c.measureText(p.nome).width + 10; c.fillStyle = 'rgba(0,0,0,.7)'; c.beginPath(); c.roundRect ? c.roundRect(hx - tw / 2, hy - r - 18 * s, tw, 13 * s + 2, 4) : c.rect(hx - tw / 2, hy - r - 18 * s, tw, 13 * s + 2); c.fill();
      c.fillStyle = '#fff'; c.fillText(p.nome, hx, hy - r - 4 * s + 1);
      c.fillStyle = col.c1; c.beginPath(); c.moveTo(hx - 3, hy - r - 4 * s); c.lineTo(hx + 3, hy - r - 4 * s); c.lineTo(hx, hy - r - 1); c.fill();
    }
  }
}

const PELLI = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a8693f', '#5c3a21', '#f5d0a9'];
const CAPELLI = ['#2b1b0e', '#4a2c18', '#a0522d', '#d9b45a', '#111111', '#7a4b2a', '#1c1c1c', '#c9a227'];

// ---------- icone della barra in basso ----------
const ICONE = {
  casa: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  rosa: '<svg viewBox="0 0 24 24"><path d="M8 3 4 6v4l3-1v12h10V9l3 1V6l-4-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/></svg>',
  mercato: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15.9V19h-2v-1.1c-1.7-.3-3-1.4-3.1-3h2c.1.8.9 1.4 2.1 1.4 1.3 0 2-.6 2-1.3 0-.8-.6-1.1-2.3-1.5-2-.5-3.4-1.2-3.4-3 0-1.4 1.1-2.5 2.7-2.8V6.6h2v1.1c1.6.3 2.6 1.4 2.7 2.8h-2c-.1-.8-.7-1.3-1.8-1.3-1.1 0-1.7.5-1.7 1.1 0 .7.6 1 2.2 1.4 2.1.5 3.5 1.3 3.5 3.1 0 1.6-1.2 2.7-2.9 3.1z"/></svg>',
  stadio: '<svg viewBox="0 0 24 24"><path d="M12 5C6 5 2 6.8 2 9v7c0 2.2 4 4 10 4s10-1.8 10-4V9c0-2.2-4-4-10-4zm0 2c4.8 0 7.8 1.3 8 2-.2.7-3.2 2-8 2s-7.8-1.3-8-2c.2-.7 3.2-2 8-2zm-6 4.6c1.1.4 2.4.6 3.7.8v5.5c-1.4-.2-2.7-.5-3.7-.9zm8.3.8c1.3-.2 2.6-.4 3.7-.8v5.4c-1 .4-2.3.7-3.7.9z"/></svg>',
  classifica: '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z"/></svg>'
};

// ---------- stadio: il tuo progetto ----------
function designDi(S){
  const d = Object.assign({ nome: '', sedili: '', sedili2: '', tetto: '#e9ecef', forma: 0, scritta: true, bandiere: true, notte: true, fumogeni: false }, S.stadio.design || {});
  d.s1 = d.sedili || S.club.c1; d.s2 = d.sedili2 || S.club.c2;
  return d;
}
const nomeStadio = (S) => (S.stadio.design && S.stadio.design.nome) || ('Stadio ' + (S.club.citta || S.club.nome));

// ---------- stadio: vista panoramica, come dalla tribuna ----------
function stadioPanoramaSVG(S){
  const st = S.stadio, d = designDi(S), T = st.tribune, c1 = S.club.c1, c2 = S.club.c2;
  const W = 400, H = 250, r = rng('pano' + S.club.nome + T);
  const P = (x, y) => [200 + (x - 0.5) * 2 * (118 + 110 * y), 128 + 114 * y];
  const pts = (a) => a.map(([x, y]) => P(x, y).map((v) => v.toFixed(1)).join(',')).join(' ');
  const h = [0, 14, 22, 30, 38, 48, 58, 66, 74, 84][T];
  const occ = Math.min(1, calcPubblico(false) / postiStadio(S));
  let o = `<svg viewBox="0 0 ${W} ${H}" class="stadio-svg" role="img" aria-label="Il tuo stadio visto dalla tribuna"><defs>
  <linearGradient id="pcielo" x1="0" y1="0" x2="0" y2="1">${d.notte ? '<stop offset="0" stop-color="#050b1f"/><stop offset="1" stop-color="#1e3a5f"/>' : '<stop offset="0" stop-color="#4dabf7"/><stop offset="1" stop-color="#d0ebff"/>'}</linearGradient>
  <pattern id="psed" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${d.s1}"/><rect y="3.4" width="5" height="1.6" fill="#000" fill-opacity=".28"/></pattern>
  <pattern id="psed2" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${d.s2}"/><rect y="3.4" width="5" height="1.6" fill="#000" fill-opacity=".28"/></pattern>
  <linearGradient id="pgrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b8a3e"/><stop offset="1" stop-color="#51cf66"/></linearGradient>
  <radialGradient id="pfaro" r=".5"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>
  <linearGradient id="ptetto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.tetto}"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  </defs>`;
  o += `<rect width="${W}" height="${H}" fill="url(#pcielo)"/>`;
  if (d.notte) for (let i = 0; i < 40; i++) o += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * 60).toFixed(1)}" r="${(r() * 0.9 + 0.3).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  else o += `<circle cx="340" cy="28" r="14" fill="#fff3bf"/>`;
  // città e colline in fondo
  let skyline = 'M0 120 '; for (let x = 0; x <= W; x += 16){ const hh = 60 + r() * 50; skyline += `L${x} ${120 - hh * 0.5} L${x + 12} ${120 - hh * 0.5} `; } skyline += `L${W} 120 Z`;
  o += `<path d="${skyline}" fill="${d.notte ? '#0b1526' : '#91a7ff'}" opacity=".9"/>`;
  if (d.notte) for (let i = 0; i < 50; i++) o += `<rect x="${(r() * W).toFixed(0)}" y="${(70 + r() * 45).toFixed(0)}" width="1.6" height="1.6" fill="#ffe066" opacity=".7"/>`;
  o += `<path d="M0 128 Q100 108 200 116 T400 124 V130 H0Z" fill="${d.notte ? '#10301f' : '#69db7c'}"/>`;
  if (T === 0) for (let i = 0; i < 9; i++){ const x = 20 + i * 45 + r() * 10; o += `<rect x="${x - 1}" y="104" width="3" height="20" fill="#5c3d2e"/><circle cx="${x}" cy="100" r="${9 + r() * 4}" fill="${d.notte ? '#1b4332' : '#2f9e44'}"/>`; }
  // torri faro dietro
  if (st.luci > 0){
    [[28, 1], [372, -1]].forEach(([x, s]) => {
      const top = 128 - h - 52 - st.luci * 8;
      o += `<line x1="${x}" y1="128" x2="${x}" y2="${top}" stroke="#495057" stroke-width="${st.luci >= 2 ? 3 : 2}"/>`;
      if (d.notte || st.luci >= 2) o += `<circle cx="${x}" cy="${top}" r="${30 + st.luci * 12}" fill="url(#pfaro)" opacity="${0.4 + st.luci * 0.15}"/>`;
      o += `<rect x="${x - 9}" y="${top - 6}" width="18" height="10" rx="1.5" fill="#212529"/>`;
      for (let k = 0; k < 6; k++) o += `<rect x="${x - 7.5 + (k % 3) * 5}" y="${top - 4.5 + Math.floor(k / 3) * 4.5}" width="4" height="3.4" fill="#fff9db"/>`;
    });
  }
  // tribuna di fronte
  if (T > 0){
    const xl = 76, xr = 324, y0 = 128, ext = h * 0.55;
    const curva = d.forma === 1 ? ` Q200 ${y0 - h - 22}` : '';
    const top = d.forma === 1 ? `M${xl - ext} ${y0 - h}${curva} ${xr + ext} ${y0 - h}` : `M${xl - ext} ${y0 - h} L${xr + ext} ${y0 - h}`;
    o += `<path d="${top} L${xr} ${y0} L${xl} ${y0} Z" fill="url(#psed)"/>`;
    if (T >= 5) o += `<path d="M${xl - ext * 0.45} ${y0 - h * 0.45} L${xr + ext * 0.45} ${y0 - h * 0.45}" stroke="#000" stroke-opacity=".35" stroke-width="3"/><path d="M${xl - ext * 0.45} ${y0 - h * 0.45 - 2} L${xr + ext * 0.45} ${y0 - h * 0.45 - 2}" stroke="${d.s2}" stroke-width="1.6"/>`;
    // pubblico
    const n = Math.round(occ * (40 + T * 45));
    for (let i = 0; i < n; i++){ const fy = r(), yy = y0 - 3 - fy * (h - 6), sp = (xr - xl) / 2 + ext * fy; const xx = 200 + (r() * 2 - 1) * sp * 0.98;
      o += `<rect x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" width="2" height="2.2" fill="${pick([c1, c2, '#fff', c1, '#ffd8a8'], r)}"/>`; }
    if (d.scritta && h >= 22){ const fs = Math.min(h * 0.42, 30); o += `<text x="200" y="${y0 - h * 0.55 + fs * 0.35}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="${fs.toFixed(1)}" fill="${d.s2}" fill-opacity=".92" textLength="${Math.min(230, (xr - xl) * 0.9)}" lengthAdjust="spacingAndGlyphs">${esc(S.club.nome.toUpperCase())}</text>`; }
    // tetto
    if (T >= 2){ const th = 5 + T * 1.3;
      o += d.forma === 1 ? `<path d="M${xl - ext - 6} ${y0 - h - 2} Q200 ${y0 - h - 26} ${xr + ext + 6} ${y0 - h - 2} L${xr + ext + 6} ${y0 - h - 2 - th} Q200 ${y0 - h - 26 - th} ${xl - ext - 6} ${y0 - h - 2 - th} Z" fill="url(#ptetto)"/>`
        : `<rect x="${xl - ext - 6}" y="${y0 - h - th - 1}" width="${xr - xl + 2 * ext + 12}" height="${th}" fill="url(#ptetto)"/>`;
      if (st.luci >= 3) o += `<path d="M${xl - ext - 6} ${y0 - h - 1} ${d.forma === 1 ? `Q200 ${y0 - h - 25}` : 'L200 ' + (y0 - h - 1)} ${xr + ext + 6} ${y0 - h - 1}" stroke="${c1}" stroke-width="2.2" fill="none"><animate attributeName="stroke-opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></path>`;
      if (d.bandiere) for (let k = 0; k < 7; k++){ const fx = xl - ext + k * (xr - xl + 2 * ext) / 6, fyy = d.forma === 1 ? (y0 - h - th - 2 - Math.sin(k / 6 * Math.PI) * 13) : (y0 - h - th - 1);
        o += `<line x1="${fx}" y1="${fyy}" x2="${fx}" y2="${fyy - 12}" stroke="#ced4da" stroke-width="1"/><path d="M${fx} ${fyy - 12} l9 2.5 -9 2.5Z" fill="${k % 2 ? c2 : c1}"><animateTransform attributeName="transform" type="skewY" values="0;8;0;-6;0" dur="${1.4 + k * 0.1}s" repeatCount="indefinite" additive="sum"/></path>`; }
    }
    // maxischermo
    if (st.maxi > 0){ const mw = st.maxi === 2 ? 64 : 42, mh = st.maxi === 2 ? 26 : 16, my = y0 - h - (T >= 2 ? 12 + T * 1.3 : 4) - mh - (d.forma === 1 ? 14 : 2);
      o += `<rect x="${200 - mw / 2 - 2}" y="${my - 2}" width="${mw + 4}" height="${mh + 4}" rx="2" fill="#111"/><rect x="${200 - mw / 2}" y="${my}" width="${mw}" height="${mh}" fill="${c1}"/><text x="200" y="${my + mh * 0.68}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="${mh * 0.55}" fill="${testoSu(c1)}">${st.maxi === 2 ? '⚽ ' + iniziali(S.club.nome) + ' ⚽' : iniziali(S.club.nome)}</text><line x1="200" y1="${my + mh + 2}" x2="200" y2="${y0 - h - 4}" stroke="#495057" stroke-width="2"/>`; }
  }
  // tribune laterali
  if (T >= 4){
    const hs = h * 0.9;
    [[1, 'psed2'], [-1, 'psed2']].forEach(([s, pat]) => {
      const A = s > 0 ? [76, 128] : [324, 128], B = s > 0 ? [8, 242] : [392, 242];
      const C = [B[0] - s * hs * 1.1, B[1] - hs * 0.55], D = [A[0] - s * hs * 0.6, A[1] - hs];
      o += `<polygon points="${[A, B, C, D].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="url(#${pat})"/>`;
      o += `<polygon points="${[A, B, C, D].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="#000" opacity=".18"/>`;
      if (T >= 6){ o += `<line x1="${D[0]}" y1="${D[1]}" x2="${C[0]}" y2="${C[1]}" stroke="url(#ptetto)" stroke-width="${6 + T}"/>`; }
      const n = Math.round(occ * 30 * T); for (let i = 0; i < n; i++){ const a = r(), b = r(); const x = A[0] + (B[0] - A[0]) * a + (D[0] - A[0]) * b * 0.9, y = A[1] + (B[1] - A[1]) * a + (D[1] - A[1]) * b * 0.9 + (C[1] - B[1] - (D[1] - A[1])) * a * b * 0.9; o += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="2.2" height="2.4" fill="${pick([c1, c2, '#fff', '#ffd8a8'], r)}"/>`; }
    });
  }
  // campo
  const usura = st.usura;
  const colErba = st.campo === 0 ? ['#a9784a', '#b98a5a'] : st.campo === 1 ? ['#37b24d', '#40c057'] : ['#2f9e44', '#40c057'];
  for (let i = 0; i < 14; i++){ const x0 = -0.03 + i * 1.06 / 14, x1 = x0 + 1.06 / 14; o += `<polygon points="${pts([[x0, -0.02], [x1, -0.02], [x1, 1.06], [x0, 1.06]])}" fill="${colErba[i % 2]}"/>`; }
  if (st.campo > 0 && usura < 75) for (let i = 0; i < (80 - usura) / 3; i++){ const [x, y] = P(r(), r()); o += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(4 + r() * 6).toFixed(1)}" ry="${(1.5 + r() * 2).toFixed(1)}" fill="#8d6e4f" opacity=".7"/>`; }
  const L = 'fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.3"';
  o += `<polygon points="${pts([[0, 0], [1, 0], [1, 1], [0, 1]])}" ${L}/><polyline points="${pts([[0.5, 0], [0.5, 1]])}" ${L}/>`;
  const cer = []; for (let a = 0; a <= 36; a++){ const an = a / 36 * Math.PI * 2; cer.push([0.5 + Math.cos(an) * 0.08, 0.5 + Math.sin(an) * 0.15]); } o += `<polyline points="${pts(cer)}" ${L}/>`;
  o += `<polyline points="${pts([[0, 0.22], [0.15, 0.22], [0.15, 0.78], [0, 0.78]])}" ${L}/><polyline points="${pts([[1, 0.22], [0.85, 0.22], [0.85, 0.78], [1, 0.78]])}" ${L}/>`;
  [[0, 1], [1, -1]].forEach(([gx]) => { const [ax, ay] = P(gx, 0.44), [bx, by] = P(gx, 0.56); o += `<path d="M${ax} ${ay} V${ay - 10} L${bx} ${by - 13} V${by}" fill="rgba(255,255,255,.15)" stroke="#fff" stroke-width="1.8"/>`; });
  if (st.campo >= 4) o += `<polygon points="${pts([[0, 0], [1, 0], [1, 1], [0, 1]])}" fill="none" stroke="#ffa94d" stroke-opacity=".45" stroke-width="2"/>`;
  // recinzione o tribuna vicina (le teste dei tifosi davanti)
  if (T === 0) o += `<polyline points="${pts([[-0.02, 1.04], [1.02, 1.04]])}" fill="none" stroke="#adb5bd" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  if (T >= 3){ o += `<rect x="0" y="236" width="${W}" height="14" fill="#212529"/>`; for (let i = 0; i < 70; i++){ const x = i * 5.8 + r() * 3; o += `<circle cx="${x.toFixed(1)}" cy="${(241 + r() * 3).toFixed(1)}" r="${(3 + r()).toFixed(1)}" fill="${pick(['#2b1b0e', '#4a2c18', '#111', '#a0522d', '#d9b45a'], r)}"/>`; } if (d.fumogeni) for (let k = 0; k < 4; k++){ const x = 40 + k * 100; o += `<circle cx="${x}" cy="232" r="14" fill="${k % 2 ? c2 : c1}" opacity=".35"><animate attributeName="r" values="10;22;10" dur="${2 + k * 0.3}s" repeatCount="indefinite"/><animate attributeName="cy" values="236;214;236" dur="${2 + k * 0.3}s" repeatCount="indefinite"/></circle>`; } }
  if (d.fumogeni && T >= 1 && T < 3) o += `<circle cx="200" cy="${128 - h / 2}" r="10" fill="${c1}" opacity=".35"><animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite"/></circle>`;
  o += `</svg>`;
  return o;
}
