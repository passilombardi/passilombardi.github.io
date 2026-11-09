/* =========================================================
   CALCIOMANIA PM — PARTITA IN DIRETTA
   La partita si gioca minuto per minuto mentre la guardi: gol, tiri, parate,
   falli, cartellini, infortuni, cambi (massimo 5), pausa per cambiare tattica,
   statistiche, voti e migliore in campo.
   Online si guarda la partita già giocata dal girone (stessi gol e minuti).
   ========================================================= */
'use strict';

const MAX_CAMBI = 5;
const FRASI = {
  gol: ['GOL! {n} la mette dentro!', 'GOOOL! Che rete di {n}!', 'GOL! {n} non perdona!', 'GOL! Tiro secco di {n}, palla in rete!', 'GOL! Di testa {n}!', 'GOL! {n} fa esplodere lo stadio!'],
  golAvv: ['Gol degli avversari: segna {n}.', 'Rete di {n}. Si fa dura.', 'Segna {n}: gol per loro.'],
  occ: ['Tiro da fuori… alto di poco!', 'Colpo di testa, a lato!', 'Che occasione! Palla fuori di un soffio.', 'Diagonale velenoso, fuori!', 'Destro al volo, sopra la traversa.'],
  parata: ['Parata strepitosa del portiere!', 'Il portiere vola e la toglie dall’incrocio!', 'Tiro centrale, blocca il portiere.', 'Miracolo del portiere!', 'Il portiere respinge con i pugni.'],
  palo: ['PALO! Che sfortuna!', 'Traversa piena! Si salva la difesa.', 'Colpisce il palo interno, poi fuori!']
};
const frase = (k, n, r = RND) => pick(FRASI[k], r).replace('{n}', n || '');
const ruoliDi = (mod) => { const m = MODULI[mod] || [4, 4, 2]; return ['P'].concat(Array(m[0]).fill('D'), Array(m[1]).fill('C'), Array(m[2]).fill('A')); };

// ---------- motore della diretta ----------
let Dir = null;
function nuovaDiretta(){
  const L = S.lega, d = L.dati, g = d.giornata;
  const m = calendario(d.n)[g].find(([h, a]) => h === L.mio || a === L.mio); if (!m) return null;
  const casa = m[0] === L.mio, avvI = casa ? m[1] : m[0], avv = d.squadre[avvI], noi = casa ? 0 : 1;
  const f = formazione();
  // carriera da giocatore: tu giochi sempre (se non sei infortunato o squalificato)
  const ioP = modo() === 'giocatore' && S.rosa.find((p) => p.io);
  if (ioP && disponibile(ioP) && !f.some((x) => x.p === ioP)){
    const L = f.map((x, i) => ({ x, i })).filter(({ x }) => x.ruolo === ioP.r).sort((a, b) => (a.x.p ? efficienza(a.x.p) : -1) - (b.x.p ? efficienza(b.x.p) : -1));
    const k = L.length ? L[0].i : f.findIndex((x) => x.ruolo !== 'P'); if (k >= 0) f[k] = Object.assign({}, f[k], { p: ioP });
  }
  const usati = new Set(f.filter((x) => x.p).map((x) => x.p.id));
  const panca = S.rosa.filter((p) => disponibile(p) && !usati.has(p.id)).sort((a, b) => efficienza(b) - efficienza(a)).slice(0, 9);
  const rosaA = rosaDi(avv, d.tier, d.stagione), modA = avv.mod || pick(['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '4-5-1'], rng(avv.nome + d.stagione));
  const xiA = titolariDi(rosaA, modA), ruoliA = ruoliDi(modA);
  const D = { r: g, h: m[0], a: m[1], casa, noi, avvI, avv, simMin: 0, rec: ri(1, 5), gol: [0, 0], ev: [], marc: [], fine: false, pausaAuto: null,
    bc: 2 + (casa ? S.stadio.campo : (avv.campo || 0)) * 0.6,
    st: { tiri: [0, 0], porta: [0, 0], corner: [0, 0], falli: [0, 0], amm: [0, 0], esp: [0, 0], poss: [0, 0], par: [0, 0] },
    pers: {}, sq: [null, null] };
  D.sq[noi] = { mio: true, mod: S.tattica.mod, slots: f.map((x) => ({ ruolo: x.ruolo, p: x.p, en: x.p ? x.p.forma : 0 })), panca, cambi: 0, usciti: [] };
  D.sq[1 - noi] = { mio: false, mod: modA, forza: Object.assign({}, avv.forza), slots: xiA.map((p, i) => ({ ruolo: ruoliA[i], p, en: 97 })), panca: rosaA.filter((p) => !xiA.includes(p)).slice(0, 7), cambi: 0, usciti: [] };
  D.sq.forEach((sq) => sq.slots.forEach((s) => { if (s.p) D.pers[s.p.id] = { min0: 0, gol: 0, ass: 0, amm: 0, esp: 0, par: 0 }; }));
  D.ev.push({ min: 0, tipo: 'inizio', t: 'Fischio d’inizio! Si parte.' });
  return (Dir = D);
}
const attivi = (sq) => sq.slots.filter((s) => s.p && !s.esp);
// forza di una squadra in questo momento della partita
function forzaLato(D, lato){
  const sq = D.sq[lato], min = D.simMin;
  if (sq.mio){
    const f = forzaDa(sq.slots.map((s) => ({ ruolo: s.ruolo, p: s.esp ? null : s.p, en: s.en })));
    return f;
  }
  const out = Object.assign({}, sq.forza), rossi = sq.slots.filter((s) => s.esp).length;
  const stanchi = min > 65 ? (min - 65) / 25 * 2 * (1 - sq.cambi * 0.18) : 0;
  ['por', 'dif', 'cen', 'att'].forEach((k) => { out[k] = out[k] - rossi * (k === 'por' ? 2 : 5) - stanchi; });
  return out;
}
function pescaGiocatore(sq, pesi, r = RND, tranne){
  const L = attivi(sq).filter((s) => s.p !== tranne);
  const w = L.map((s) => (pesi[s.ruolo] || 0.1) * (s.p.val / 50) * (s.p.allen === 'tiro' || (sq.mio && (S.tattica.ist || {})[s.p.id] === 'tiro') ? 1.3 : 1) * (sq.mio && (S.tattica.ist || {})[s.p.id] === 'off' ? 1.4 : 1));
  let tot = w.reduce((a, b) => a + b, 0), x = r() * tot;
  for (let i = 0; i < L.length; i++){ x -= w[i]; if (x <= 0) return L[i]; }
  return L[0] || null;
}
function simMinuto(D){
  if (D.simMin >= 90 + D.rec) return;
  const m = ++D.simMin, R = RND, durata = 90 + D.rec, noi = D.noi;
  const F = [forzaLato(D, 0), forzaLato(D, 1)];
  const att = (i) => F[i].att * 0.7 + F[i].cen * 0.3 + (i === 0 ? D.bc : 0), def = (i) => F[i].dif * 0.65 + F[i].por * 0.35 + (i === 0 ? D.bc : 0);
  const mid = F[0].cen - F[1].cen;
  const lam = [clamp(1.35 * Math.exp((att(0) - def(1)) / 15 + mid / 70), 0.1, 6), clamp(1.35 * Math.exp((att(1) - def(0)) / 15 - mid / 70), 0.1, 6)];
  if (trucco('vinci')){ lam[noi] = Math.max(lam[noi], 3.2); lam[1 - noi] = Math.min(lam[1 - noi], 0.25); }
  const pos0 = clamp(50 + mid * 0.9 + D.bc, 24, 76); D.st.poss[0] += pos0; D.st.poss[1] += 100 - pos0;
  const t = (k) => m - 1 + k;
  for (let lato = 0; lato < 2; lato++){
    const sq = D.sq[lato], altro = D.sq[1 - lato];
    if (R() < lam[lato] / 93){
      const chi = pescaGiocatore(sq, { A: 6, C: 2.5, D: 0.7, P: 0.02 });
      const ass = R() < 0.72 ? pescaGiocatore(sq, { A: 2, C: 3.2, D: 1, P: 0.05 }, R, chi && chi.p) : null;
      D.gol[lato]++; D.st.tiri[lato]++; D.st.porta[lato]++;
      const nome = chi ? nomeG(chi.p) : 'Autogol';
      if (chi) D.pers[chi.p.id].gol++; if (ass) D.pers[ass.p.id].ass++;
      D.marc.push({ lato, min: m, id: chi && chi.p.id, nome, ass: ass ? nomeG(ass.p) : '', assId: ass && ass.p.id });
      D.ev.push({ min: t(0.5), tipo: 'gol', lato, mio: lato === noi, nome, t: frase(lato === noi ? 'gol' : 'golAvv', nome) + (ass ? ` Assist di ${nomeG(ass.p)}.` : '') });
    } else if (R() < lam[lato] * 2.1 / 93){
      const tipo = pick(['occ', 'occ', 'parata', 'parata', 'parata', 'palo'], R), chi = pescaGiocatore(sq, { A: 5, C: 3, D: 1, P: 0 });
      D.st.tiri[lato]++; if (tipo === 'parata'){ D.st.porta[lato]++; const por = altro.slots[0]; if (por && por.p && !por.esp) D.pers[por.p.id].par++; }
      D.ev.push({ min: t(0.4), tipo, lato, t: (chi ? nomeG(chi.p) + ': ' : '') + frase(tipo) });
      if (R() < 0.35) D.st.corner[lato]++;
    }
    if (R() < 0.05 * (lato === 0 ? pos0 : 100 - pos0) / 50) D.st.corner[lato]++;
    // falli e cartellini
    const press = sq.mio ? (S.tattica.press == null ? 1 : S.tattica.press) : 1;
    if (R() < 0.2 + press * 0.04){
      D.st.falli[lato]++;
      if (R() < 0.15){
        const s = pescaGiocatore(sq, { D: 3, C: 2.5, A: 1, P: 0.2 }); if (s){
          const P = D.pers[s.p.id];
          if (P.amm && R() < 0.85){ P.amm++; P.esp = 1; s.esp = true; D.st.esp[lato]++; D.ev.push({ min: t(0.7), tipo: 'rosso', lato, mio: lato === noi, t: `Secondo giallo per ${nomeG(s.p)}: espulso! ${lato === noi ? 'Restiamo in dieci.' : 'Avversari in inferiorità.'}` }); }
          else if (!P.amm){ P.amm = 1; D.st.amm[lato]++; D.ev.push({ min: t(0.7), tipo: 'giallo', lato, mio: lato === noi, t: `Cartellino giallo per ${nomeG(s.p)}.` }); }
        }
      } else if (R() < 0.004){
        const s = pescaGiocatore(sq, { D: 3, C: 2, A: 1, P: 0.1 }); if (s){ D.pers[s.p.id].esp = 1; s.esp = true; D.st.esp[lato]++; D.ev.push({ min: t(0.7), tipo: 'rosso', lato, mio: lato === noi, t: `Rosso diretto a ${nomeG(s.p)}! Entrata durissima.` }); }
      }
    }
    // infortuni
    if (!trucco('noInf') && R() < 0.0032){
      const s = pescaGiocatore(sq, { D: 1, C: 1, A: 1, P: 0.2 });
      if (s && !D.pers[s.p.id].inf){
        D.pers[s.p.id].inf = 1; s.en = Math.min(s.en, 25); s.ferito = true;
        D.ev.push({ min: t(0.8), tipo: 'infortunio', lato, mio: lato === noi, t: `${nomeG(s.p)} resta a terra: si è fatto male.` });
        if (!sq.mio || modo() === 'giocatore') cambioBot(D, lato, sq.slots.indexOf(s), m);
        else if (sq.cambi < MAX_CAMBI && sq.panca.length) D.pausaAuto = { min: t(0.8), slot: sq.slots.indexOf(s), t: `${nomeG(s.p)} si è fatto male: chi entra al suo posto?` };
      }
    }
    // stanchezza
    const atl = sq.mio ? livStaff(S, 'atl') : 2, pr = sq.mio ? (S.prep == null ? 50 : S.prep) : 55;
    sq.slots.forEach((s) => { if (s.p && !s.esp) s.en = Math.max(5, s.en - (s.ruolo === 'P' ? 0.1 : 0.36) * (0.85 + press * 0.15) * (1 - atl * 0.035) * (1.25 - pr / 200)); });
  }
  // cambi dei bot
  const lb = 1 - noi, sb = D.sq[lb];
  if (m >= 56 && m <= 84 && sb.cambi < 3 && R() < 0.1) cambioBot(D, lb, -1, m);
  if (modo() === 'giocatore' && m >= 58 && m <= 84 && D.sq[noi].cambi < 3 && R() < 0.1) cambioBot(D, noi, -1, m);
  if (m === 45) D.ev.push({ min: 45.5, tipo: 'int', t: 'Fine primo tempo. Tutti negli spogliatoi.' });
  if (m >= durata){ D.ev.push({ min: durata, tipo: 'fine', t: 'Triplice fischio! Partita finita.' }); D.fine = true; }
}
function cambioBot(D, lato, k, m){
  const sq = D.sq[lato]; if (sq.cambi >= MAX_CAMBI || !sq.panca.length) return;
  if (k < 0){ const L = sq.slots.map((s, i) => ({ s, i })).filter((x) => x.s.p && !x.s.esp && x.s.ruolo !== 'P').sort((a, b) => a.s.en - b.s.en); if (!L.length) return; k = L[0].i; }
  const s = sq.slots[k]; const dentro = sq.panca.find((p) => p.r === s.ruolo) || sq.panca[0];
  eseguiCambio(D, lato, k, dentro, m);
}
function eseguiCambio(D, lato, k, dentro, m){
  const sq = D.sq[lato], s = sq.slots[k], fuori = s.p;
  if (!dentro || !fuori || s.esp) return false;
  sq.panca = sq.panca.filter((p) => p !== dentro); sq.usciti.push(fuori); sq.cambi++;
  if (D.pers[fuori.id]) D.pers[fuori.id].min1 = m;
  D.pers[dentro.id] = { min0: m, gol: 0, ass: 0, amm: 0, esp: 0, par: 0 };
  s.p = dentro; s.en = dentro.forma || 97; s.ferito = false;
  D.ev.push({ min: m - 0.05, tipo: 'cambio', lato, mio: lato === D.noi, t: `Cambio: entra ${nomeG(dentro)}, esce ${nomeG(fuori)}.` });
  return true;
}
function finisciDiretta(D){ while (!D.fine) simMinuto(D); }

// voti e migliore in campo
function votiDiretta(D){
  const out = {}; let motm = null;
  D.sq.forEach((sq, lato) => {
    const diff = D.gol[lato] - D.gol[1 - lato], subiti = D.gol[1 - lato];
    const media = attivi(sq).reduce((s, x) => s + x.p.val, 0) / Math.max(1, attivi(sq).length);
    sq.slots.map((s) => s.p).concat(sq.usciti).forEach((p) => {
      if (!p) return; const P = D.pers[p.id]; if (!P) return;
      const min = (P.min1 == null ? 90 + D.rec : P.min1) - P.min0; if (min < 10 && !P.gol) return;
      let v = 6 + clamp(diff * 0.3, -0.9, 0.9) + P.gol * 0.95 + P.ass * 0.5 - P.amm * 0.25 - P.esp * 1.6 + (p.val - media) / 40 + gauss() * 0.35;
      if (p.r === 'P') v += P.par * 0.25 - subiti * 0.35 + (subiti === 0 ? 0.6 : 0); else if (p.r === 'D') v += (subiti === 0 ? 0.4 : -subiti * 0.15);
      if (P.inf) v -= 0.2; v += P.az || 0;
      v = clamp(Math.round(v * 2) / 2, 3.5, 10);
      out[p.id] = { v, lato, nome: nomeG(p), r: p.r, gol: P.gol, ass: P.ass, mio: lato === D.noi };
      if (!motm || v > out[motm].v || (v === out[motm].v && P.gol > out[motm].gol)) motm = p.id;
    });
  });
  return { voti: out, motm };
}
// la partita è finita: il risultato va nel girone e la tua squadra registra gol, voti, cartellini e infortuni
function chiudiDiretta(D){
  finisciDiretta(D);
  const { voti, motm } = votiDiretta(D);
  const tot = Math.max(1, D.simMin);
  const pos = Math.round(D.st.poss[0] / tot);
  const mh = D.marc.filter((x) => x.lato === 0).map((x) => x.min), ma = D.marc.filter((x) => x.lato === 1).map((x) => x.min);
  const fisso = { h: D.h, a: D.a, gh: D.gol[0], ga: D.gol[1], mh, ma, pos, th: D.st.tiri[0], ta: D.st.tiri[1], rec: D.rec };
  const mio = D.sq[D.noi];
  S._live = { r: D.r, s: S.lega.dati.stagione, voti, motm, st: D.st, noi: D.noi,
    marc: D.marc.filter((x) => x.lato === D.noi).map((x) => ({ min: x.min, nome: x.nome, id: x.id, ass: x.ass, assId: x.assId })),
    marcAvv: D.marc.filter((x) => x.lato !== D.noi).map((x) => ({ min: x.min, nome: x.nome, ass: x.ass })),
    pers: Object.fromEntries(Object.entries(D.pers).filter(([id]) => S.rosa.some((p) => p.id === id))),
    giocato: mio.slots.map((s) => s.p && s.p.id).concat(mio.usciti.map((p) => p.id)).filter(Boolean),
    ev: D.ev.filter((e) => e.tipo !== 'inizio').map((e) => ({ min: Math.round(e.min * 10) / 10, tipo: e.tipo, lato: e.lato, mio: e.mio, t: e.t })),
    motmNome: motm && voti[motm] ? voti[motm].nome : '', modA: D.sq[1 - D.noi].mod };
  giocaGiornataDati(S.lega.dati, fisso);
}

// ---------- la partita a schermo intero ----------
let _partita = null, _dirT = 0;
function apriMatch(o){
  chiudiFoglio(true);
  const io = { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim };
  const h = o.casa ? io : o.avv, a = o.casa ? o.avv : io;
  const mioK = kitDi(S.club, !o.casa), stessi = (x, y) => String(x).toLowerCase() === String(y).toLowerCase();
  const loroK = { c1: stessi(o.avv.c1, mioK.c1) ? (o.avv.c2 || '#ffffff') : o.avv.c1, c2: stessi(o.avv.c1, mioK.c1) ? o.avv.c1 : (o.avv.c2 || '#ffffff') };
  const colH = o.casa ? mioK : loroK, colA = o.casa ? loroK : mioK;
  const v = document.createElement('div'); v.className = 'match'; v.id = 'match';
  v.innerHTML = `<div class="sb"><div class="sbt">${stemmaDi(h, 42)}<b>${esc(h.nome)}</b></div><div class="score"><div><span id="gh">0</span><i>:</i><span id="ga">0</span></div><small id="orologio">0’</small></div><div class="sbt">${stemmaDi(a, 42)}<b>${esc(a.nome)}</b></div></div>
  <div class="campo-wrap"><canvas id="campo"></canvas><div class="golbig" id="golbig"></div><div class="m-banner" id="mBanner"></div></div>
  ${o.spett ? `<div class="spett">${ic('stadio')} ${o.spett}</div>` : ''}
  <div class="m-tabs">${[['cron', 'Cronaca'], ['stat', 'Statistiche'], ['form', 'Formazioni']].map(([k, n], i) => `<button data-mt="${k}" class="${i ? '' : 'on'}">${n}</button>`).join('')}</div>
  <div class="m-pan" id="mPan"><div class="cronaca" id="cronaca"></div></div>
  <div class="viste">${[['tv', 'Telecamera'], ['alto', 'Dall’alto'], ['numeri', 'Solo numeri']].map(([k, n]) => `<button data-vista="${k}" class="${(S.opz.vista || 'tv') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="mctrl"><span>Velocità</span>${[1, 2, 4].map((x) => `<button data-vel="${x}" class="${x === (S.opz.vel || 2) ? 'on' : ''}">×${x}</button>`).join('')}${o.diretta && modo() !== 'giocatore' ? `<button id="mPausa" class="pausa">${ic('cambio')} Pausa e cambi</button>` : ''}<button id="salta" class="salta">Salta ${ic('play')}</button></div>`;
  document.body.appendChild(v); document.body.classList.add('in-partita');
  let gh = 0, ga = 0, finito = false, tab = 'cron';
  const righe = [];
  Suono.avviaFolla();
  const fine = () => {
    if (finito) return; finito = true; Suono.fermaFolla(); clearInterval(_dirT);
    setTimeout(() => {
      $('.mctrl', v).innerHTML = `<button class="btn largo" id="continua">Continua ${ic('su', 'gira')}</button>`;
      $('#continua', v).onclick = () => { if (_partita) _partita.stop(); _partita = null; v.remove(); document.body.classList.remove('in-partita'); o.dopo && o.dopo(); };
    }, 300);
  };
  const gH = (o.diretta ? Dir.sq[0].slots.map((s) => s.p ? { num: s.p.num || '', nome: s.p.c } : {}) : o.giocH) || [];
  const gA = (o.diretta ? Dir.sq[1].slots.map((s) => s.p ? { num: s.p.num || '', nome: s.p.c } : {}) : o.giocA) || [];
  _partita = new Partita($('#campo', v), {
    casa: { c1: colH.c1, c2: colH.c2, t: colH.t, nome: h.nome, mod: o.modH, giocatori: gH }, ospiti: { c1: colA.c1, c2: colA.c2, t: colA.t, nome: a.nome, mod: o.modA, giocatori: gA },
    eventi: o.diretta ? Dir.ev.slice() : o.eventi, durata: o.durata, vista: S.opz.vista || 'tv',
    onEvento: (e, veloce) => {
      if (e.tipo === 'gol'){ if (e.lato === 0) gh++; else ga++; $('#gh', v).textContent = gh; $('#ga', v).textContent = ga;
        if (!veloce){ const g = $('#golbig', v); g.textContent = 'GOL!'; g.style.setProperty('--c', e.lato === 0 ? colH.c1 : colA.c1); g.classList.remove('via'); void g.offsetWidth; g.classList.add('via');
          Suono.boato(e.mio ? 1.2 : 0.6); if (e.mio) coriandoli([S.club.c1, S.club.c2, '#d4af37', '#ffffff'], 90); if (navigator.vibrate && e.mio) try { navigator.vibrate([80, 40, 120]); } catch (x) {} } }
      if (!veloce){ if (e.tipo === 'inizio' || e.tipo === 'int') Suono.fischio(e.tipo === 'int' ? 2 : 1); if (e.tipo === 'fine') Suono.fischio(3); if (e.tipo === 'parata' || e.tipo === 'occ' || e.tipo === 'palo') Suono.ooh(); if (e.tipo === 'rosso' || e.tipo === 'giallo') Suono.fischio(1); }
      if (o.diretta && (e.tipo === 'cambio' || e.tipo === 'rosso')) aggiornaSprite();
      righe.push(e); if (tab === 'cron') aggiungiRiga(e);
      if (e.tipo === 'fine') fine();
    },
    onFine: fine
  });
  _partita.vel = S.opz.vel || 2;
  function aggiungiRiga(e){
    const r = document.createElement('div'); r.className = 'cr ' + e.tipo + (e.mio ? ' mio' : '') + (e.lato === 1 ? ' osp' : '');
    const icoE = { gol: 'pallone', giallo: 'cartellino', rosso: 'cartellino', parata: 'scudo', palo: 'bersaglio', occ: 'fulmine', inizio: 'megafono', int: 'cronometro', fine: 'bandiera', cambio: 'cambio', infortunio: 'medico' }[e.tipo] || 'info';
    r.innerHTML = `<span>${e.tipo === 'inizio' ? '0' : Math.min(Math.ceil(e.min), o.durata)}’</span><i class="ci ${e.tipo}">${ic(icoE)}</i><p>${esc(e.t)}</p>`;
    const c = $('#cronaca', v); if (c) c.prepend(r);
  }
  function aggiornaSprite(){
    [0, 1].forEach((lato) => { const sq = Dir.sq[lato]; _partita.aggiorna(lato, sq.mod, sq.slots.map((s) => s.p ? { num: s.p.num || '', nome: s.p.c, via: s.esp } : { via: true })); });
  }
  function pannello(){
    const P = $('#mPan', v);
    if (tab === 'cron'){ P.innerHTML = '<div class="cronaca" id="cronaca"></div>'; cronRebuild($('#cronaca', P)); return; }
    if (tab === 'stat') return (P.innerHTML = statHTML());
    P.innerHTML = formHTML();
  }
  function cronRebuild(c){ c.innerHTML = ''; righe.forEach((e) => { const r = document.createElement('div'); r.className = 'cr ' + e.tipo + (e.mio ? ' mio' : '') + (e.lato === 1 ? ' osp' : ''); r.innerHTML = `<span>${e.tipo === 'inizio' ? '0' : Math.min(Math.ceil(e.min), o.durata)}’</span><i class="ci ${e.tipo}">${ic({ gol: 'pallone', giallo: 'cartellino', rosso: 'cartellino', parata: 'scudo', palo: 'bersaglio', occ: 'fulmine', inizio: 'megafono', int: 'cronometro', fine: 'bandiera', cambio: 'cambio', infortunio: 'medico' }[e.tipo] || 'info')}</i><p>${esc(e.t)}</p>`; c.prepend(r); }); }
  function statHTML(){
    const st = o.diretta ? Dir.st : null;
    const conta = (tipo, lato) => righe.filter((e) => e.tipo === tipo && e.lato === lato).length;
    const val = (k, lato) => st ? st[k][lato] : k === 'tiri' ? righe.filter((e) => ['gol', 'occ', 'parata', 'palo'].includes(e.tipo) && e.lato === lato).length : k === 'porta' ? righe.filter((e) => ['gol', 'parata'].includes(e.tipo) && e.lato === lato).length : k === 'amm' ? conta('giallo', lato) : k === 'esp' ? conta('rosso', lato) : 0;
    const posH = st ? Math.round(st.poss[0] / Math.max(1, Dir.simMin)) : (o.pos || 50);
    const riga = (n, a, b) => { const t = Math.max(1, a + b); return `<div class="ms-r"><b>${a}</b><div><small>${n}</small><span class="ms-b"><i style="width:${a / t * 100}%;background:${colH.c1}"></i><i style="width:${b / t * 100}%;background:${colA.c1}"></i></span></div><b>${b}</b></div>`; };
    return `<div class="m-stat">${riga('Possesso %', posH, 100 - posH)}${riga('Tiri', val('tiri', 0), val('tiri', 1))}${riga('Tiri in porta', val('porta', 0), val('porta', 1))}${st ? riga('Calci d’angolo', st.corner[0], st.corner[1]) + riga('Falli', st.falli[0], st.falli[1]) : ''}${riga('Gialli', val('amm', 0), val('amm', 1))}${riga('Rossi', val('esp', 0), val('esp', 1))}</div>`;
  }
  function formHTML(){
    const col = (lato, nome) => {
      if (o.diretta){ const sq = Dir.sq[lato]; return `<div class="mf-c"><h4>${esc(nome)} <small>${sq.mod}</small></h4>${sq.slots.map((s) => s.p ? `<div class="mf-r ${s.esp ? 'esp' : ''}"><span class="num r${s.ruolo}">${s.p.num || ''}</span><span>${esc(nomeG(s.p))}</span>${sq.mio ? `<span class="en"><i style="width:${s.en}%"></i></span>` : ''}${s.ferito ? ic('medico', 'rosso') : ''}${Dir.pers[s.p.id] && Dir.pers[s.p.id].amm ? '<i class="cart g"></i>' : ''}${s.esp ? '<i class="cart r"></i>' : ''}</div>` : '').join('')}${sq.usciti.length ? `<p class="nota">Usciti: ${sq.usciti.map((p) => esc(p.c)).join(', ')}</p>` : ''}</div>`; }
      const g = lato ? gA : gH; return `<div class="mf-c"><h4>${esc(nome)}</h4>${g.map((x) => x.nome ? `<div class="mf-r"><span class="num">${x.num || ''}</span><span>${esc(x.nome)}</span></div>` : '').join('')}</div>`;
    };
    return `<div class="m-form">${col(0, h.nome)}${col(1, a.nome)}</div>`;
  }
  v.querySelectorAll('[data-mt]').forEach((b) => b.onclick = () => { tab = b.dataset.mt; v.querySelectorAll('[data-mt]').forEach((x) => x.classList.toggle('on', x === b)); pannello(); });
  // la diretta: il motore resta 2 minuti avanti all'animazione
  if (o.diretta){
    _dirT = setInterval(() => {
      if (!_partita) return;
      while (!Dir.fine && Dir.simMin < _partita.min + 2.2){
        const n = Dir.ev.length; simMinuto(Dir);
        for (let i = n; i < Dir.ev.length; i++) _partita.ev.push(Dir.ev[i]);
        if (Dir.pausaAuto){ break; }
      }
      if (azioni.length && !finito && _partita.min >= azioni[0] && _partita.pausa <= 0 && !_partita.script && !$('#mCambi') && !$('#azione')){ azioni.shift(); avviaAzione(); }
      if (Dir.pausaAuto && _partita.min >= Dir.pausaAuto.min && !$('#mCambi')){ const pa = Dir.pausaAuto; Dir.pausaAuto = null; apriCambi(pa); }
      if (tab === 'stat' && !finito) $('#mPan', v).innerHTML = statHTML();
    }, 120);
  }
  // carriera da giocatore: ogni tanto la palla arriva a te e giochi tu l'azione
  const ioSlot = () => o.diretta && modo() === 'giocatore' ? Dir.sq[Dir.noi].slots.find((s) => s.p && s.p.io && !s.esp) : null;
  const azioni = ioSlot() ? azioniPartita(ioSlot().ruolo, o.durata) : [];
  function avviaAzione(){
    const sl = ioSlot(); if (!sl) return;
    const noi = Dir.noi, sqN = Dir.sq[noi], sqA = Dir.sq[1 - noi], tm = tierMedia(S.tier), io = sl.p;
    const sk = (p) => clamp(0.45 + (p.val - tm) / 40, 0.25, 0.95);
    const g = (p) => ({ num: p.num || '', nome: p.c, p, sk: sk(p) });
    const altri = attivi(sqN).filter((s) => s !== sl && s.ruolo !== 'P').sort((a, b) => ({ A: 0, C: 1, D: 2 }[a.ruolo] - { A: 0, C: 1, D: 2 }[b.ruolo]) || b.p.val - a.p.val);
    const comp = sl.ruolo === 'P' ? altri.filter((s) => s.ruolo === 'D').concat(altri).slice(0, 2) : altri.slice(0, 3);
    const avvA = attivi(sqA), per = (r) => avvA.filter((s) => s.ruolo === r).map((s) => g(s.p));
    const gen = (n) => Array.from({ length: n }, (_, i) => ({ num: 2 + i, nome: '', sk: 0.5 }));
    const dif = per('D').concat(gen(4)).slice(0, 4), cen = per('C').concat(gen(2)).slice(0, 2), att = per('A').concat(per('C')).concat(gen(2)).slice(0, 2);
    const gkS = avvA.find((s) => s.ruolo === 'P'), F = sqA.forza || { dif: tm, por: tm };
    const noiK = noi === 0 ? colH : colA, loroK = noi === 0 ? colA : colH;
    _partita.pausa = Infinity;
    new Azione({ tipo: sl.ruolo === 'P' ? 'portiere' : 'campo', min: _partita.min, punteggio: `${h.nome} ${gh} - ${ga} ${a.nome}`,
      colNoi: { c1: noiK.c1, c2: noiK.c2, t: noiK.t, nome: S.club.nome }, colLoro: { c1: loroK.c1, c2: loroK.c2, t: loroK.t, nome: (noi === 0 ? a : h).nome },
      io: { num: io.num || '', nome: io.c, r: sl.ruolo, p: io, sk: sk(io) }, mia: sk(io),
      compagni: comp.map((s) => g(s.p)), avv: { gk: gkS ? g(gkS.p) : { num: 1, nome: '' }, dif, cen, att },
      dspd: clamp(0.94 + ((F.dif || tm) - tm) / 70 + (S.diff || 0) * 0.025, 0.82, 1.15), gk: clamp(0.5 + ((F.por || tm) - tm) / 40 + (S.diff || 0) * 0.03, 0.25, 0.92),
      fine: (es) => { applicaAzione(es, sl); if (_partita) _partita.pausa = 0; } });
  }
  function applicaAzione(es, sl){
    const D = Dir, noi = D.noi, io = sl.p, min = Math.round((_partita.min + 0.05) * 100) / 100, P = (p) => D.pers[p.id] || (D.pers[p.id] = { min0: 0, gol: 0, ass: 0, amm: 0, esp: 0, par: 0 });
    const gkA = attivi(D.sq[1 - noi]).find((s) => s.ruolo === 'P');
    const ev = [];
    const bonus = (x) => { P(io).az = (P(io).az || 0) + x; };
    if (es.tipo === 'gol'){
      const chi = es.p || io, ass = es.io ? (es.assist && es.assist.p) : (es.passatoDaMe ? io : null);
      D.gol[noi]++; D.st.tiri[noi]++; D.st.porta[noi]++; P(chi).gol++; if (ass) P(ass).ass++;
      D.marc.push({ lato: noi, min: Math.ceil(min), id: chi.id, nome: nomeG(chi), ass: ass ? nomeG(ass) : '', assId: ass && ass.id });
      ev.push({ min, tipo: 'gol', lato: noi, mio: true, nome: nomeG(chi), t: (chi === io ? `GOOOL di ${nomeG(io)}! Lo hai segnato tu!` : frase('gol', nomeG(chi))) + (ass ? ` Assist di ${nomeG(ass)}.` : '') });
      if (chi !== io && ass === io) bonus(0.2);
    } else if (es.tipo === 'parata' && sl.ruolo === 'P'){
      P(io).par++; bonus(0.3); ev.push({ min, tipo: 'parata', lato: 1 - noi, t: `Grande parata di ${nomeG(io)}!` });
    } else if (es.tipo === 'presa'){
      bonus(es.difesa ? 0 : 0.2); ev.push({ min, tipo: 'parata', lato: 1 - noi, t: es.difesa ? 'La difesa salva tutto davanti a ' + nomeG(io) + '.' : `${nomeG(io)} esce e blocca il pallone!` });
    } else if (es.tipo === 'golSubito'){
      const chi = es.p || (attivi(D.sq[1 - noi]).find((s) => s.ruolo === 'A') || attivi(D.sq[1 - noi])[1] || {}).p;
      D.gol[1 - noi]++; D.st.tiri[1 - noi]++; D.st.porta[1 - noi]++; if (chi) P(chi).gol++; bonus(-0.2);
      D.marc.push({ lato: 1 - noi, min: Math.ceil(min), id: chi && chi.id, nome: chi ? nomeG(chi) : 'Avversario', ass: '' });
      ev.push({ min, tipo: 'gol', lato: 1 - noi, mio: false, nome: chi ? nomeG(chi) : '', t: frase('golAvv', chi ? nomeG(chi) : '') });
    } else if (es.tipo === 'parata' || es.tipo === 'fuori' || es.tipo === 'palo'){
      const chi = es.p || io; D.st.tiri[sl.ruolo === 'P' ? 1 - noi : noi]++;
      if (sl.ruolo === 'P'){ ev.push({ min, tipo: 'occ', lato: 1 - noi, t: 'Tiro degli avversari: fuori!' }); }
      else { if (es.tipo === 'parata' && !es.respinta){ D.st.porta[noi]++; if (gkA) P(gkA.p).par++; }
        if (chi === io) bonus(es.tipo === 'parata' ? 0.1 : es.tipo === 'palo' ? 0.1 : -0.05);
        ev.push({ min, tipo: es.tipo === 'fuori' ? 'occ' : es.tipo, lato: noi, t: `${nomeG(chi)}: ${es.tipo === 'parata' ? (es.respinta ? 'tiro respinto da un difensore!' : 'tiro parato dal portiere!') : es.tipo === 'palo' ? 'colpisce il palo!' : 'tiro fuori di poco!'}` }); }
    } else if (es.tipo === 'persa'){
      bonus(-0.15); ev.push({ min, tipo: 'info', lato: noi, t: `${nomeG(io)} perde il pallone.` });
    } else ev.push({ min, tipo: 'info', lato: noi, t: sl.ruolo === 'P' ? 'Pericolo passato.' : `L’azione di ${nomeG(io)} sfuma.` });
    ev.forEach((e) => { D.ev.push(e); _partita.ev.push(e); });
    D.ev.sort((x, y) => x.min - y.min); _partita.ev.sort((x, y) => x.min - y.min);
  }
  function apriCambi(pa){
    if (!o.diretta || finito) return;
    _partita.pausa = Infinity; Suono.fermaFolla();
    const sq = Dir.sq[Dir.noi]; let scelto = pa && pa.slot != null ? pa.slot : -1;
    const box = document.createElement('div'); box.className = 'm-cambi'; box.id = 'mCambi';
    const draw = () => {
      box.innerHTML = `<div class="mc-in"><div class="mc-top"><h3>${ic('cambio')} Pausa · ${Math.floor(_partita.min)}’</h3><span class="tag-st">${sq.cambi}/${MAX_CAMBI} cambi</span></div>
      ${pa && pa.t ? `<p class="avviso-in">${esc(pa.t)}</p>` : ''}
      <p class="nota">Tocca chi esce, poi chi entra dalla panchina.</p>
      <div class="mc-col"><div><h4>In campo</h4>${sq.slots.map((s, i) => s.p ? `<button class="mc-g ${scelto === i ? 'on' : ''} ${s.esp ? 'esp' : ''}" data-k="${i}" ${s.esp ? 'disabled' : ''}><span class="num r${s.ruolo}">${s.p.num || ''}</span><span class="mc-n">${esc(nomeG(s.p))}<small>${RUOLI[s.ruolo]}${s.p.r !== s.ruolo ? ' (fuori ruolo)' : ''}</small></span><span class="en ${s.en < 45 ? 'basso' : ''}"><i style="width:${s.en}%"></i></span>${s.ferito ? ic('medico', 'rosso') : ''}</button>` : '').join('')}</div>
      <div><h4>Panchina</h4>${sq.panca.map((p) => `<button class="mc-g panca" data-id="${p.id}" ${sq.cambi >= MAX_CAMBI || scelto < 0 ? 'disabled' : ''}><span class="num r${p.r}">${p.num || ''}</span><span class="mc-n">${esc(nomeG(p))}<small>${RUOLI[p.r]} · ${p.val}</small></span>${badgeVal(p.val)}</button>`).join('') || '<p class="tenue">Nessuno in panchina</p>'}</div></div>
      <h4>Tattica</h4>
      <div class="chips wrap">${Object.keys(MODULI).map((k) => `<button class="chip ${sq.mod === k ? 'on' : ''}" data-mod="${k}">${k}</button>`).join('')}</div>
      <div class="seg cinque">${MENTALITA.map((n, i) => `<button class="${(S.tattica.ment == null ? 2 : S.tattica.ment) === i ? 'on' : ''}" data-ment="${i}">${n}</button>`).join('')}</div>
      <div class="seg">${PRESSING.map((n, i) => `<button class="${(S.tattica.press == null ? 1 : S.tattica.press) === i ? 'on' : ''}" data-press="${i}">Pressing ${n.toLowerCase()}</button>`).join('')}</div>
      <button class="btn largo" id="mRiprendi">${ic('play')} Riprendi la partita</button></div>`;
      box.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { scelto = +b.dataset.k; draw(); });
      box.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { const p = sq.panca.find((x) => x.id === b.dataset.id); if (eseguiCambio(Dir, Dir.noi, scelto, p, Math.max(1, Math.ceil(_partita.min)))){ _partita.ev.push(Dir.ev[Dir.ev.length - 1]); _partita.ev.sort((x, y) => x.min - y.min); aggiornaSprite(); scelto = -1; pa = null; Suono.fischio(1); } draw(); });
      box.querySelectorAll('[data-mod]').forEach((b) => b.onclick = () => { cambiaModulo(sq, b.dataset.mod); aggiornaSprite(); draw(); });
      box.querySelectorAll('[data-ment]').forEach((b) => b.onclick = () => { S.tattica.ment = +b.dataset.ment; draw(); });
      box.querySelectorAll('[data-press]').forEach((b) => b.onclick = () => { S.tattica.press = +b.dataset.press; draw(); });
      $('#mRiprendi', box).onclick = () => { box.remove(); _partita.pausa = 0; Suono.avviaFolla(); };
    };
    draw(); v.appendChild(box);
  }
  function cambiaModulo(sq, mod){
    const ruoli = ruoliDi(mod), gioc = sq.slots.filter((s) => s.p && !s.esp), esp = sq.slots.filter((s) => s.esp).length, usati = new Set();
    const out = ruoli.map(() => null);
    ruoli.forEach((r, k) => { const c = gioc.filter((s) => !usati.has(s) && s.p.r === r).sort((a, b) => efficienza(b.p) - efficienza(a.p))[0]; if (c){ out[k] = c; usati.add(c); } });
    ruoli.forEach((r, k) => { if (out[k]) return; const c = gioc.filter((s) => !usati.has(s)).sort((a, b) => effInRuolo(b.p, r) - effInRuolo(a.p, r))[0]; if (c){ out[k] = c; usati.add(c); } });
    let e = esp; sq.slots = ruoli.map((r, k) => out[k] ? Object.assign({}, out[k], { ruolo: r }) : (e-- > 0 ? { ruolo: r, p: null, esp: true, en: 0 } : { ruolo: r, p: null, en: 0 }));
    sq.mod = mod; S.tattica.mod = mod;
  }
  if (o.diretta && $('#mPausa', v)) $('#mPausa', v).onclick = () => apriCambi(null);
  const orologio = $('#orologio', v);
  const tick = () => { if (!_partita || !document.body.contains(v)) return; const m = Math.floor(_partita.min); orologio.textContent = _partita.pausa === Infinity ? 'PAUSA' : (m > 90 ? '90+' + (m - 90) : m) + '’'; if (!_partita.fine) requestAnimationFrame(tick); else orologio.textContent = 'FINE'; };
  tick();
  v.querySelectorAll('[data-vel]').forEach((b) => b.onclick = () => { _partita.vel = +b.dataset.vel; S.opz.vel = +b.dataset.vel; v.querySelectorAll('[data-vel]').forEach((x) => x.classList.toggle('on', x === b)); });
  v.querySelectorAll('[data-vista]').forEach((b) => b.onclick = () => { S.opz.vista = b.dataset.vista; _partita.vista = b.dataset.vista; v.querySelectorAll('[data-vista]').forEach((x) => x.classList.toggle('on', x === b)); if (_partita.fine) _partita.disegna(); });
  $('#salta', v).onclick = () => {
    const box = $('#mCambi', v); if (box) box.remove(); azioni.length = 0; const az = $('#azione'); if (az) az.remove();
    if (o.diretta){ // i cambi per gli infortuni li fa l'allenatore
      while (!Dir.fine){ const n = Dir.ev.length; simMinuto(Dir); if (Dir.pausaAuto){ const pa = Dir.pausaAuto; Dir.pausaAuto = null; const sq = Dir.sq[Dir.noi], s = sq.slots[pa.slot]; const dentro = sq.panca.find((p) => s && p.r === s.ruolo) || sq.panca[0]; eseguiCambio(Dir, Dir.noi, pa.slot, dentro, Dir.simMin); } for (let i = n; i < Dir.ev.length; i++) if (!_partita.ev.includes(Dir.ev[i])) _partita.ev.push(Dir.ev[i]); }
      _partita.ev.sort((x, y) => x.min - y.min); _partita.pausa = 0;
    }
    _partita.salta(); orologio.textContent = 'FINE'; pannello();
  };
}

// la partita giocata in diretta (da solo)
function giocaInDiretta(){
  const D = nuovaDiretta(); if (!D) return;
  if (modo() === 'giocatore' && D.sq[D.noi].slots.some((s) => s.p && s.p.io)) return giocaPartitaVera(D);
  const io = S.club, avv = D.avv;
  const sp = D.casa ? calcPubblico(false).toLocaleString('it-IT') + ' spettatori attesi' : '';
  apriMatch({ diretta: true, casa: D.casa, avv, modH: D.sq[0].mod, modA: D.sq[1].mod, durata: 90 + D.rec, spett: sp,
    dopo: () => { chiudiDiretta(D); Dir = null; sincronizza(false, true); } });
}
// rivedere una partita (o guardare quella giocata dal girone online)
function mostraPartita(rep, dopo){
  const evs = rep.ev && rep.ev.length ? [{ min: 0, tipo: 'inizio', t: 'Fischio d’inizio! Si parte.' }].concat(rep.ev) : eventiPartita(rep);
  const mod = rep.mod || S.tattica.mod;
  const miei = formazione().map((x) => x.p ? { num: x.p.num || '', nome: x.p.c } : {});
  const rosaA = rosaDi(rep.avv, rep.tier || S.tier, S.lega.dati.stagione), modA = rep.modA || '4-4-2';
  const loro = titolariDi(rosaA, modA).map((p) => ({ num: p.num, nome: p.c }));
  apriMatch({ diretta: false, casa: rep.casa, avv: rep.avv, modH: rep.casa ? mod : modA, modA: rep.casa ? modA : mod, giocH: rep.casa ? miei : loro, giocA: rep.casa ? loro : miei,
    eventi: evs, durata: 90 + (rep.rec || 3), pos: rep.casa ? rep.pos : 100 - rep.pos, spett: rep.casa && rep.bil && rep.bil.spettatori ? rep.bil.spettatori.toLocaleString('it-IT') + ' spettatori' : '', dopo });
}
// telecronaca ricostruita dai gol (online e partite vecchie)
function eventiPartita(rep){
  const r = rng('ev' + S.stagione + rep.r + rep.avv.nome);
  const lato = rep.casa ? 0 : 1, altro = 1 - lato;
  const E = [{ min: 0, tipo: 'inizio', t: 'Fischio d’inizio! Si parte.' }];
  rep.marcatori.forEach((m) => E.push({ min: m.min - 0.5, tipo: 'gol', lato, mio: true, nome: m.nome, t: frase('gol', m.nome, r) + (m.ass ? ` Assist di ${m.ass}.` : '') }));
  rep.marcAvv.forEach((m) => E.push({ min: m.min - 0.5, tipo: 'gol', lato: altro, mio: false, nome: m.nome, t: frase('golAvv', m.nome, r) }));
  const f = formazione().filter((x) => x.p).map((x) => x.p);
  const nOcc = ri(5, 9, r);
  for (let i = 0; i < nOcc; i++){
    const tipo = pick(['occ', 'occ', 'parata', 'parata', 'palo'], r), chi = r() < 0.5 + (rep.pos - 50) / 100 ? lato : altro;
    const campo = f.filter((p) => p.r !== 'P');
    const nome = chi === lato && campo.length ? nomeG(pick(campo, r)) : '';
    E.push({ min: ri(3, 89, r) + 0.3, tipo, lato: chi, t: (nome ? nome + ': ' : '') + frase(tipo, '', r) });
  }
  (rep.cart || []).forEach((c) => E.push(c));
  E.push({ min: 45.5, tipo: 'int', t: 'Fine primo tempo. Tutti negli spogliatoi.' });
  E.push({ min: 90 + (rep.rec || 3), tipo: 'fine', t: 'Triplice fischio! Partita finita.' });
  return E.sort((a, b) => a.min - b.min);
}
