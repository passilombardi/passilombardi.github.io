/* =========================================================
   PRESIDENTE PM — GIOCO
   La tua società: soldi, rosa, staff, stadio, campionato, schermate.
   ========================================================= */
'use strict';

const CHIAVE = 'presidentepm-v1';
let S = null;              // lo stato della partita
let schermo = 'casa';
let sottoschermo = {};     // tab interne delle schermate
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const mioId = () => (S && S.lega && S.lega.online && window.Online && Online.uid()) || 'me';

// ---------- salvataggio ----------
let _salvaT = 0;
function salva(subito){
  if (!S) return;
  S.agg = Date.now();
  clearTimeout(_salvaT);
  const f = () => { try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch (e) {} if (window.Online && Online.loggato()) Online.salvaCloud(S); };
  if (subito) f(); else _salvaT = setTimeout(f, 400);
}
function carica(){ try { const t = localStorage.getItem(CHIAVE); return t ? JSON.parse(t) : null; } catch (e) { return null; } }

// ---------- notizie ----------
function notizia(testo, ico = '📰'){ S.notizie.unshift({ t: testo, ico, s: S.stagione, g: S.lega ? S.lega.giocate : 0 }); S.notizie = S.notizie.slice(0, 40); }

// ---------- nuova società ----------
const SPONSOR_A = ['Pizzeria','Latteria','Ferramenta','Autofficina','Panificio','Gelateria','Trasporti','Costruzioni','Assicurazioni','Energia','Banca','Telefonia','Supermercati','Compagnia aerea'];
function nuovoSponsor(tier){
  const r = RND, a = tier <= 3 ? SPONSOR_A.slice(0, 8) : tier <= 6 ? SPONSOR_A.slice(4, 12) : SPONSOR_A.slice(8);
  return { nome: pick(a, r) + ' ' + nomePaese(r), val: tondo(TIERS[tier - 1].sponsor * (0.9 + r() * 0.25)) };
}
function nuovaSocieta(club){
  S = {
    v: 1, club, diff: club.diff == null ? 1 : club.diff, soldi: 1000000, stagione: 1, tier: 1,
    rosa: [], staff: {}, stadio: { tribune: 0, campo: 0, spogl: 0, luci: 0, negozio: 0, giov: 0, maxi: 0, park: 0, usura: 92, cantieri: [] },
    tattica: { mod: '4-4-2', ment: 1, tit: null }, morale: 70, tifosi: 80,
    lega: null, mercato: { lista: [], agg: -99 }, staffMercato: { lista: [], s: 0 }, sponsor: nuovoSponsor(1),
    notizie: [], storico: [], trofei: [], giornate: 0, bilancio: null, ultima: null, soldiStoria: [1000000], pendenti: [],
    opz: { suono: true }, creato: Date.now(), agg: Date.now()
  };
  nuovaLegaLocale(1);
  genMercato(); genStaffMercato();
  notizia(`È nata la ${club.nome}! Il comune di ${club.citta || 'casa tua'} festeggia. Hai 1.000.000 € per costruire la squadra.`, '🎉');
  notizia(`Primo sponsor: ${S.sponsor.nome}, ${euro(S.sponsor.val)} a giornata.`, '🤝');
  salva(true);
}
function mioSlot(){
  return Object.assign({ tipo: 'umano', uid: mioId(), nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim, forza: forzaMia(), campo: S.stadio.campo, visto: Date.now() });
}
function nuovaLegaLocale(tier){
  const d = nuovoGirone(tier, 'Girone ' + 'ABCDEFGH'[ri(0, 7)], RND, DIFFICOLTA[S.diff == null ? 2 : S.diff].bot);
  const i = ri(0, d.n - 1);
  d.squadre[i] = Object.assign(d.squadre[i], mioSlot(), statoZero(), { pronto: -1 });
  S.lega = { online: false, gid: null, dati: d, mio: i, giocate: 0, stagione: d.stagione };
}
function aggiornaMioSlot(){
  const L = S.lega; if (!L || !L.dati) return;
  const s = L.dati.squadre[L.mio]; if (!s || s.uid !== mioId()) return;
  Object.assign(s, { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim, forza: forzaMia(), campo: S.stadio.campo });
}

// ---------- formazione e forza ----------
function slotRuoli(){ const m = MODULI[S.tattica.mod]; return ['P'].concat(Array(m[0]).fill('D'), Array(m[1]).fill('C'), Array(m[2]).fill('A')); }
function effInRuolo(p, ruolo){ let v = efficienza(p); if (p.r !== ruolo) v *= (ruolo === 'P' || p.r === 'P') ? 0.4 : 0.78; return v; }
function formazione(){
  const ruoli = slotRuoli();
  const disp = S.rosa.filter((p) => p.inf <= 0);
  const usati = new Set();
  const out = ruoli.map(() => null);
  if (S.tattica.tit && S.tattica.tit.length === ruoli.length){
    S.tattica.tit.forEach((id, k) => { const p = disp.find((x) => x.id === id); if (p && !usati.has(p.id)){ out[k] = p; usati.add(p.id); } });
  }
  // riempi i posti vuoti: prima giocatori del ruolo giusto, poi i migliori rimasti
  ruoli.forEach((r, k) => {
    if (out[k]) return;
    const c = disp.filter((p) => !usati.has(p.id) && p.r === r).sort((a, b) => efficienza(b) - efficienza(a))[0];
    if (c){ out[k] = c; usati.add(c.id); }
  });
  ruoli.forEach((r, k) => {
    if (out[k]) return;
    const c = disp.filter((p) => !usati.has(p.id)).sort((a, b) => effInRuolo(b, r) - effInRuolo(a, r))[0];
    if (c){ out[k] = c; usati.add(c.id); }
  });
  return ruoli.map((r, k) => ({ ruolo: r, p: out[k] }));
}
function forzaMia(){
  const f = formazione();
  const media = (r) => { const a = f.filter((x) => x.ruolo === r); return a.reduce((s, x) => s + (x.p ? effInRuolo(x.p, r) : 8), 0) / Math.max(1, a.length); };
  const bonus = (trucco('super') ? 30 : 0) + livStaff(S, 'all') * 1.8 + livStaff(S, 'vice') * 0.5 + (S.morale - 60) / 8 + S.stadio.spogl * 0.4 - (S.staff.all ? 0 : 6);
  const m = S.tattica.ment;
  const k = (v) => Math.round(v * 10) / 10;
  return { por: k(media('P') + livStaff(S, 'por') * 1.5 + bonus), dif: k(media('D') + bonus + (m === 0 ? 3 : m === 2 ? -3 : 0)), cen: k(media('C') + bonus), att: k(media('A') + bonus + (m === 2 ? 3 : m === 0 ? -3 : 0)) };
}
const forzaTot = (f) => Math.round((f.por + f.dif * 1.4 + f.cen * 1.3 + f.att * 1.3) / 5);
function problemiPerGiocare(){
  const pr = [];
  const sani = S.rosa.filter((p) => p.inf <= 0);
  if (!S.staff.all) pr.push({ t: 'Ingaggia un allenatore', vai: 'mercato', sub: 'staff' });
  if (sani.length < 11) pr.push({ t: `Ti servono almeno 11 giocatori sani (ne hai ${sani.length})`, vai: 'mercato', sub: 'giocatori' });
  if (!sani.some((p) => p.r === 'P')) pr.push({ t: 'Ti serve un portiere', vai: 'mercato', sub: 'giocatori', ruolo: 'P' });
  return pr;
}

// ---------- mercato ----------
const soldiDiff = () => (S.lega && S.lega.online) ? 1 : DIFFICOLTA[S.diff == null ? 2 : S.diff].soldi;
const trucco = (k) => !!(S.trucchi && S.trucchi[k] && !(S.lega && S.lega.online));
const scontoDS = () => 1 - livStaff(S, 'ds') * 0.04;
const prezzoAcquisto = (p) => trucco('gratis') ? 0 : tondo(p.prezzo * scontoDS());
const prezzoVendita = (p) => tondo(p.prezzo * (0.7 + livStaff(S, 'ds') * 0.04));
function genMercato(){
  const t = S.tier, oss = livStaff(S, 'oss'), L = [];
  const ruoli = ['P','P','P','D','D','D','D','D','D','D','D','C','C','C','C','C','C','C','C','C','A','A','A','A','A','A','A','A'];
  ruoli.forEach((r, i) => {
    const bonus = i % 9 === 0 ? 9 + oss * 2 : -10 + RND() * 16 + oss * 1.4;
    const giovane = RND() < 0.2 + oss * 0.04;
    L.push(nuovoGiocatore(t, { ruolo: r, bonus, spread: 3, eta: giovane ? ri(17, 21) : undefined }));
  });
  S.mercato = { lista: L.sort((a, b) => b.val - a.val), agg: S.giornate };
}
function genStaffMercato(){
  const L = [];
  STAFF.forEach((s) => { for (let l = 1; l <= 5; l++) L.push(nuovoStaff(s.k, l)); });
  S.staffMercato = { lista: L, s: S.stagione };
}
function listaCampioni(){ const presi = new Set(S.campioniPresi || []); return CAMPIONI.map((c, k) => campioneDa(k, S.stagione)).filter((p) => !presi.has(p.id) && p.eta <= 38).sort((a, b) => b.val - a.val); }
const inVendita = (id) => S.mercato.lista.find((x) => x.id === id) || (String(id).startsWith('cmp') ? listaCampioni().find((x) => x.id === id) : null);
const costoRicerca = () => tondo(Math.max(1500, TIERS[S.tier - 1].sponsor * 0.8));
function compra(id){
  const p = inVendita(id); if (!p) return;
  const c = prezzoAcquisto(p);
  if (S.rosa.length >= 28) return avviso('La rosa è piena (28 giocatori): vendi qualcuno prima');
  if (S.soldi < c) return avviso('Non hai abbastanza soldi');
  S.soldi -= c; S.mercato.lista = S.mercato.lista.filter((x) => x !== p);
  if (p.stella){ S.campioniPresi = (S.campioniPresi || []).concat([p.id]); p.id = p.id + '-' + uid(); }
  p.num = numeroLibero(p.r); p.forma = Math.max(p.forma, 90);
  S.rosa.push(p);
  notizia(`${p.stella ? '⭐ COLPO DA CAMPIONE! ' : 'Colpo di mercato! '}Arriva ${p.n} ${p.c} (${RUOLI[p.r].toLowerCase()}, ${p.val}) per ${euro(c)}.`, '✍️');
  Suono.cassa(); aggiornaMioSlot(); salva(); disegna(); avviso(`${p.n} ${p.c} è tuo!`);
}
function vendi(id){
  const p = S.rosa.find((x) => x.id === id); if (!p) return;
  const v = prezzoVendita(p);
  S.soldi += v; S.rosa = S.rosa.filter((x) => x !== p);
  if (S.tattica.tit) S.tattica.tit = S.tattica.tit.map((x) => x === id ? null : x);
  notizia(`${p.n} ${p.c} è stato venduto per ${euro(v)}.`, '💸');
  Suono.cassa(); aggiornaMioSlot(); salva(); chiudiFoglio(); disegna();
}
function numeroLibero(r){
  const usati = new Set(S.rosa.map((p) => p.num));
  const pref = { P: [1, 12, 22, 33], D: [2, 3, 4, 5, 6, 13, 15, 23, 24, 26], C: [8, 10, 14, 16, 17, 18, 20, 21, 25], A: [9, 7, 11, 19, 27, 29, 30, 31] }[r];
  for (const n of pref) if (!usati.has(n)) return n;
  for (let n = 2; n < 99; n++) if (!usati.has(n)) return n;
  return 99;
}
function ingaggia(id){
  const s = S.staffMercato.lista.find((x) => x.id === id); if (!s) return;
  const costo = trucco('gratis') ? 0 : s.ingaggio;
  if (S.soldi < costo) return avviso('Non hai abbastanza soldi per l’ingaggio');
  const vecchio = S.staff[s.k];
  S.soldi -= costo; S.staff[s.k] = s; S.staffMercato.lista = S.staffMercato.lista.filter((x) => x !== s);
  const nome = STAFF.find((x) => x.k === s.k).nome;
  notizia(`${nome}: arriva ${s.nome} (${'★'.repeat(s.liv)}).${vecchio ? ' Saluta ' + vecchio.nome + '.' : ''}`, STAFF.find((x) => x.k === s.k).ico);
  Suono.cassa(); aggiornaMioSlot(); salva(); disegna(); avviso(`${s.nome} è il tuo ${nome.toLowerCase()}!`);
}
function licenzia(k){ const s = S.staff[k]; if (!s) return; delete S.staff[k]; notizia(`${s.nome} lascia la società.`, '👋'); aggiornaMioSlot(); salva(); disegna(); }

// Squadra pronta: compra in un colpo 18 giocatori giusti per il campionato e un allenatore se manca
function squadraPronta(){
  const t = S.tier, budget = Math.min(S.soldi * 0.45, 2000000 * Math.pow(2.1, t - 1));
  const serve = { P: 2, D: 6, C: 6, A: 4 };
  S.rosa.forEach((p) => { if (serve[p.r] > 0) serve[p.r]--; });
  const lista = []; Object.entries(serve).forEach(([r, n]) => { for (let i = 0; i < n; i++) lista.push(r); });
  if (!lista.length && S.staff.all) return avviso('La squadra è già completa');
  let spesa = 0; const presi = [];
  const per = budget / Math.max(1, lista.length);
  lista.forEach((r) => {
    let bonus = 6; let p;
    for (let k = 0; k < 12; k++){ p = nuovoGiocatore(t, { ruolo: r, bonus, spread: 2 }); if (prezzoAcquisto(p) <= per) break; bonus -= 2; }
    const c = prezzoAcquisto(p);
    if (spesa + c <= budget && S.soldi - spesa - c > 0 && S.rosa.length + presi.length < 28){ spesa += c; presi.push(p); }
  });
  presi.forEach((p) => { p.num = numeroLibero(p.r); S.rosa.push(p); });
  S.soldi -= spesa;
  if (!S.staff.all){ const liv = Math.min(5, 1 + Math.floor(t / 2)); const all = nuovoStaff('all', liv); if (S.soldi > all.ingaggio){ S.soldi -= all.ingaggio; S.staff.all = all; notizia(`Allenatore: arriva ${all.nome} (${'★'.repeat(liv)}).`, '📋'); } }
  notizia(`Squadra pronta! Arrivano ${presi.length} giocatori per ${euro(spesa)}.`, '⚡');
  Suono.cassa(); aggiornaMioSlot(); salva(); disegna(); avviso(`Arrivati ${presi.length} giocatori!`);
}

// ---------- stadio ----------
function costruisci(k){
  const s = STADIO_K[k], liv = S.stadio[k] + 1;
  if (liv >= s.costi.length) return;
  if (S.stadio.cantieri.some((c) => c.k === k)) return avviso('Ci sono già i lavori in corso');
  const c = trucco('gratis') ? 0 : s.costi[liv];
  if (S.soldi < c) return avviso('Non hai abbastanza soldi');
  S.soldi -= c;
  S.stadio.cantieri.push({ k, liv, fine: S.giornate + (trucco('gratis') ? 0 : s.tempi[liv]) });
  if (trucco('gratis')){ S.stadio[k] = liv; S.stadio.cantieri = S.stadio.cantieri.filter((x) => x.k !== k); }
  notizia(`Iniziati i lavori: ${s.nome} → ${s.livelli[liv]} (${s.tempi[liv]} giornat${s.tempi[liv] === 1 ? 'a' : 'e'}).`, '🏗️');
  Suono.cassa(); salva(); disegna();
}
function restaura(){
  const c = costoRestauro(S);
  if (S.stadio.usura >= 99) return avviso('Lo stadio è già come nuovo');
  if (S.soldi < c) return avviso('Non hai abbastanza soldi');
  S.soldi -= c; S.stadio.usura = 100;
  notizia(`Stadio restaurato: erba, sedili e vernice come nuovi (${euro(c)}).`, '🧹');
  Suono.cassa(); salva(); disegna();
}
function calcPubblico(casuale = true){
  const st = S.stadio;
  let b = S.tifosi * (0.55 + S.morale / 220) * (1 + st.luci * 0.08 + st.park * 0.06 + st.maxi * 0.07) * (st.usura < 60 ? 0.75 : 1);
  if (casuale) b *= 0.9 + RND() * 0.2;
  return Math.max(20, Math.round(Math.min(postiStadio(S), b)));
}
const tettoTifosi = (t) => Math.round(TIERS[t - 1].pubblico * 2.6 * (1 + S.trofei.length * 0.08 + S.stadio.maxi * 0.1));
const prezzoBiglietto = () => TIERS[S.tier - 1].prezzo;
const spesaNegozio = () => [0, 2, 4, 7, 12][S.stadio.negozio] * (1 + (S.tier - 1) * 0.2);
const stipendiGiocatori = () => S.rosa.reduce((s, p) => s + p.stip, 0);
const stipendiStaff = () => Object.values(S.staff).reduce((s, x) => s + x.stip, 0);
const manutenzione = () => tondo(STADIO.reduce((s, x) => s + x.costi[S.stadio[x.k]], 0) * 0.0015 + 100);

// ---------- giocare ----------
let _occupato = false;
async function gioca(){
  if (_occupato) return;
  const pr = problemiPerGiocare();
  if (pr.length) return avviso(pr[0].t);
  Suono.init();
  aggiornaMioSlot();
  if (S.lega.online){
    if (!window.Online || !Online.loggato()) return avviso('Entra nel tuo account per giocare online');
    _occupato = true; disegna();
    try { const r = await Online.pronto(mioSlot()); if (!r.giocata){ avviso('Sei pronto! Aspettiamo gli altri presidenti.'); } }
    catch (e) { avviso('Non riesco a collegarmi: ' + (e.message || e)); }
    _occupato = false; disegna();
    return;
  }
  giocaGiornataDati(S.lega.dati);
  sincronizza(true);
}

// Allinea la tua carriera con il girone: applica le giornate giocate, chiude la stagione, mostra la partita.
function sincronizza(live){
  const L = S.lega, d = L.dati; if (!d) return;
  let ultima = null, fine = null;
  if (d.stagione > L.stagione){
    if (d.prev && d.prev.stagione === L.stagione){
      const nomi = (i) => d.prev.tab.find((t) => t.i === i);
      for (let r = L.giocate; r < giornateTot(d.prev.n); r++){ if (d.prev.ris[r]) ultima = applicaGiornata(d.prev.ris[r], r, nomi, d.prev.n, d.prev.tier) || ultima; }
      if (ultima) Object.assign(ultima, { tab: d.prev.tab.map(rigaMini), mio: L.mio, tier: d.prev.tier, n: d.prev.n });
      fine = fineStagione(d.prev);
    } else { L.stagione = d.stagione; L.giocate = 0; }
  } else {
    const nomi = (i) => d.squadre[i];
    for (let r = L.giocate; r < d.giornata; r++){ if (d.ris[r]) ultima = applicaGiornata(d.ris[r], r, nomi, d.n, d.tier) || ultima; }
    if (ultima) Object.assign(ultima, { tab: ordina(d.squadre).map(rigaMini), mio: L.mio, tier: d.tier, n: d.n });
  }
  if (fine) S.pendenti.push(fine);
  salva(true);
  if (ultima && live){ mostraPartita(ultima, () => dopoPartita(ultima)); }
  else {
    if (ultima){ S.pendenti.unshift({ tipo: 'partita', rep: ultima }); }
    disegna(); mostraPendenti();
  }
}

const rigaMini = (t) => ({ i: t.i, tipo: t.tipo, uid: t.uid, nome: t.nome, c1: t.c1, c2: t.c2, st: t.st, pat: t.pat, sim: t.sim, pt: t.pt, g: t.g, v: t.v, n: t.n, p: t.p, gf: t.gf, gs: t.gs, f: t.f || '' });
function applicaGiornata(ris, r, nomi, n, tier){
  const L = S.lega;
  const m = ris.find((x) => x.h === L.mio || x.a === L.mio);
  L.giocate = r + 1;
  if (!m) return null;
  const casa = m.h === L.mio, gf = casa ? m.gh : m.ga, gs = casa ? m.ga : m.gh;
  const minGf = casa ? m.mh : m.ma, minGs = casa ? m.ma : m.mh;
  const avv = nomi(casa ? m.a : m.h) || { nome: 'Avversario', c1: '#888', c2: '#fff' };
  const T = TIERS[(tier || S.tier) - 1];
  const f = formazione();
  const tit = f.filter((x) => x.p).map((x) => x.p);
  const atl = livStaff(S, 'atl'), med = livStaff(S, 'med');
  // marcatori
  const pesi = { A: 6, C: 2.5, D: 0.7, P: 0.02 };
  const marcatori = minGf.map((min) => {
    let tot = tit.reduce((s, p) => s + pesi[p.r] * (p.val / 50), 0), x = RND() * tot, chi = tit[0];
    for (const p of tit){ x -= pesi[p.r] * (p.val / 50); if (x <= 0){ chi = p; break; } }
    if (chi) chi.gol = (chi.gol || 0) + 1;
    return { min, nome: chi ? nomeG(chi) : 'Autogol', id: chi && chi.id };
  });
  const ra = rng(avv.nome + r);
  const marcAvv = minGs.map((min) => ({ min, nome: pick(NOMI, ra).charAt(0) + '. ' + pick(COGNOMI, ra) }));
  // soldi
  const b = { sponsor: S.sponsor.val, tv: T.tv, biglietti: 0, negozio: 0, stipendi: stipendiGiocatori(), staff: stipendiStaff(), manut: manutenzione(), spettatori: 0 };
  if (casa){ b.spettatori = calcPubblico(); b.biglietti = Math.round(b.spettatori * prezzoBiglietto()); b.negozio = Math.round(b.spettatori * spesaNegozio()); }
  const mul = soldiDiff(); ['sponsor', 'tv', 'biglietti', 'negozio'].forEach((k) => { b[k] = Math.round(b[k] * mul); });
  b.entrate = b.sponsor + b.tv + b.biglietti + b.negozio; b.uscite = b.stipendi + b.staff + b.manut; b.netto = b.entrate - b.uscite;
  S.soldi += b.netto; S.bilancio = b;
  S.soldiStoria.push(Math.round(S.soldi)); S.soldiStoria = S.soldiStoria.slice(-40);
  // giocatori: stanchezza, infortuni, crescita
  const infortunati = [];
  S.rosa.forEach((p) => { if (p.inf > 0) p.inf--; });
  S.rosa.forEach((p) => {
    if (tit.includes(p)){
      p.pres = (p.pres || 0) + 1;
      p.forma = clamp(p.forma - ri(7, 13) + atl, 35, 100);
      if (RND() < 0.03 * (1 - med * 0.1 - S.stadio.campo * 0.04 - atl * 0.06)){ p.inf = Math.max(1, ri(1, 6) - Math.floor(med / 2)); infortunati.push(p); }
      if (p.val < p.pot && RND() < 0.05 + livStaff(S, 'all') * 0.01 + livStaff(S, 'vice') * 0.015){ p.val++; p.prezzo = valoreDi(p); }
    } else p.forma = clamp(p.forma + 12 + atl * 3 + S.stadio.spogl * 2, 35, 100);
  });
  infortunati.forEach((p) => notizia(`${p.n} ${p.c} si è fatto male: starà fuori ${p.inf} giornat${p.inf === 1 ? 'a' : 'e'}.`, '🚑'));
  // morale e tifosi
  const esito = gf > gs ? 'V' : gf < gs ? 'P' : 'N';
  S.morale = clamp(S.morale + (esito === 'V' ? 7 : esito === 'N' ? 1 : -6) + (S.stadio.spogl >= 3 ? 1 : 0), 15, 100);
  const tetto = tettoTifosi(tier || S.tier);
  S.tifosi = Math.round(esito === 'V' ? S.tifosi + Math.max(3, (tetto - S.tifosi) * 0.07) : esito === 'N' ? S.tifosi + Math.max(1, (tetto - S.tifosi) * 0.02) : S.tifosi * 0.98);
  S.tifosi = Math.max(Math.round(T.pubblico * 0.4), S.tifosi + S.stadio.maxi * 2);
  if (casa) S.stadio.usura = clamp(S.stadio.usura - Math.max(0.8, 3 - S.stadio.campo * 0.45), 0, 100);
  // lavori finiti
  S.giornate++;
  S.stadio.cantieri = S.stadio.cantieri.filter((c) => {
    if (S.giornate >= c.fine){ S.stadio[c.k] = c.liv; const s = STADIO_K[c.k]; notizia(`Lavori finiti! ${s.nome}: ${s.livelli[c.liv]}.${c.k === 'tribune' ? ' Ora ci stanno ' + s.posti[c.liv].toLocaleString('it-IT') + ' spettatori.' : ''}`, '🏟️'); return false; }
    return true;
  });
  if (S.giornate - S.mercato.agg >= 3) genMercato();
  if (S.soldi < 0) notizia('Attenzione: la cassa è in rosso! Vendi qualche giocatore o risparmia.', '⚠️');
  const titolo = esito === 'V' ? 'Vittoria' : esito === 'N' ? 'Pareggio' : 'Sconfitta';
  notizia(`${titolo} ${casa ? 'in casa' : 'in trasferta'}: ${casa ? S.club.nome + ' ' + gf + '-' + gs + ' ' + avv.nome : avv.nome + ' ' + gs + '-' + gf + ' ' + S.club.nome}.${marcatori.length ? ' Gol di ' + marcatori.map((x) => x.nome).join(', ') + '.' : ''}`, esito === 'V' ? '🏆' : esito === 'N' ? '🤝' : '😞');
  const rep = { r, casa, gf, gs, minGf, minGs, marcatori, marcAvv, esito, pos: casa ? m.pos : 100 - m.pos, tiri: casa ? m.th : m.ta, tiriAvv: casa ? m.ta : m.th, rec: m.rec || 3,
    avv: { nome: avv.nome, c1: avv.c1, c2: avv.c2, st: avv.st, pat: avv.pat, sim: avv.sim, tipo: avv.tipo },
    mod: S.tattica.mod, bil: b, ris: ris.map((x) => ({ h: x.h, a: x.a, gh: x.gh, ga: x.ga, nh: (nomi(x.h) || {}).nome, na: (nomi(x.a) || {}).nome })) };
  S.ultima = rep;
  aggiornaMioSlot();
  return rep;
}

function fineStagione(prev){
  const L = S.lega;
  const me = prev.tab.find((t) => t.i === L.mio);
  const pos = me ? me.pos : prev.n;
  const T = TIERS[prev.tier - 1];
  const sale = pos <= PROMOSSE && prev.tier < TOP, scende = pos > prev.n - RETROCESSE && prev.tier > 1;
  const premio = tondo(T.premio * (prev.n - pos + 1) / prev.n * soldiDiff());
  S.soldi += premio;
  const capocannoniere = S.rosa.slice().sort((a, b) => (b.gol || 0) - (a.gol || 0))[0];
  S.storico.unshift({ stagione: S.stagione, tier: prev.tier, pos, n: prev.n, pt: me ? me.pt : 0, v: me ? me.v : 0, n_: me ? me.n : 0, p: me ? me.p : 0, gf: me ? me.gf : 0, gs: me ? me.gs : 0, bomber: capocannoniere && capocannoniere.gol ? nomeG(capocannoniere) + ' (' + capocannoniere.gol + ')' : '', online: L.online });
  if (pos === 1) S.trofei.push({ stagione: S.stagione, tier: prev.tier, nome: 'Campioni ' + T.nome });
  const vecchioTier = prev.tier;
  const nuovoTier = sale ? prev.tier + 1 : scende ? prev.tier - 1 : prev.tier;
  // giocatori: un anno in più, i giovani crescono, i vecchi calano, qualcuno smette
  const ritirati = [];
  const crescita = 0.6 + livStaff(S, 'all') * 0.08 + livStaff(S, 'vice') * 0.06 + S.stadio.giov * 0.05;
  S.rosa.forEach((p) => {
    p.eta++;
    if (p.eta <= 23) p.val = Math.min(p.pot, p.val + Math.round((ri(1, 3) + (p.pot - p.val) / 5) * crescita));
    else if (p.eta <= 29) p.val = Math.min(p.pot + 2, p.val + ri(-1, 2));
    else if (p.eta <= 32) p.val -= ri(0, 2);
    else p.val -= ri(1, 4);
    p.val = clamp(p.val, 10, 97); p.pot = Math.max(p.pot, p.val);
    p.prezzo = valoreDi(p); p.stip = Math.max(p.stip, stipDi(p));
    p.forma = 100; p.inf = 0; p.golTot = (p.golTot || 0) + (p.gol || 0); p.gol = 0; p.pres = 0;
    if (p.eta >= 38 || (p.eta >= 34 && RND() < (p.eta - 32) * 0.18)) ritirati.push(p);
  });
  S.rosa = S.rosa.filter((p) => !ritirati.includes(p));
  if (S.tattica.tit) S.tattica.tit = S.tattica.tit.map((id) => ritirati.some((p) => p.id === id) ? null : id);
  ritirati.forEach((p) => notizia(`${p.n} ${p.c} smette di giocare a ${p.eta} anni. Grazie campione!`, '👏'));
  // ragazzi dal settore giovanile
  const giovani = [];
  for (let k = 0; k < [0, 1, 1, 2, 3][S.stadio.giov]; k++){
    if (S.rosa.length >= 28) break;
    const p = nuovoGiocatore(nuovoTier, { eta: ri(16, 18), bonus: -12 + S.stadio.giov * 3, spread: 3 });
    p.pot = clamp(p.val + ri(14, 26) + S.stadio.giov * 2, p.val, 97); p.prezzo = valoreDi(p); p.stip = tondo(p.stip * 0.5); p.num = numeroLibero(p.r);
    S.rosa.push(p); giovani.push(p);
  }
  giovani.forEach((p) => notizia(`Dal settore giovanile arriva ${p.n} ${p.c}, ${p.eta} anni: può diventare fortissimo!`, '🧒'));
  // tifosi, sponsor, staff
  S.tifosi = Math.round(Math.min(tettoTifosi(nuovoTier), S.tifosi * (sale ? 1.4 : scende ? 0.8 : 1.03) + (sale ? TIERS[nuovoTier - 1].pubblico * 0.3 : 0)));
  S.tier = nuovoTier;
  S.sponsor = nuovoSponsor(nuovoTier);
  if (pos === 1) S.sponsor.val = tondo(S.sponsor.val * 1.15);
  S.stagione++;
  S.morale = clamp(S.morale + (sale ? 15 : scende ? -10 : 0), 30, 100);
  genMercato(); genStaffMercato();
  if (sale) notizia(`PROMOZIONE! La ${S.club.nome} sale in ${TIERS[nuovoTier - 1].nome}!`, '🚀');
  else if (scende) notizia(`Retrocessione: la ${S.club.nome} scende in ${TIERS[nuovoTier - 1].nome}. Si riparte più forti!`, '📉');
  else notizia(`Stagione finita al ${pos}° posto. Si riparte in ${TIERS[nuovoTier - 1].nome}!`, '📅');
  notizia(`Nuovo sponsor: ${S.sponsor.nome}, ${euro(S.sponsor.val)} a giornata.`, '🤝');
  // nuovo girone
  if (L.online){
    L.stagione = S.lega.dati.stagione; L.giocate = 0;
    if (sale || scende){ L.cambio = nuovoTier; setTimeout(() => window.Online && Online.cambiaCategoria(nuovoTier), 50); }
  } else {
    if (sale || scende) nuovaLegaLocale(nuovoTier);
    else { L.stagione = L.dati.stagione; L.giocate = 0; }
  }
  aggiornaMioSlot();
  return { tipo: 'stagione', pos, n: prev.n, sale, scende, premio, vecchioTier, nuovoTier, campione: pos === 1, pt: me ? me.pt : 0, ritirati: ritirati.map((p) => p.n + ' ' + p.c), giovani: giovani.map((p) => p.n + ' ' + p.c), bomber: S.storico[0].bomber, top: prev.tab.slice(0, 3).map((t) => t.nome) };
}

function dopoPartita(rep){ disegna(); mostraRisultati(rep, () => mostraPendenti()); }
function mostraPendenti(){
  const p = S.pendenti.shift(); if (!p){ salva(); return; }
  salva();
  if (p.tipo === 'stagione') mostraFineStagione(p, () => mostraPendenti());
  else if (p.tipo === 'partita') foglio(`<h2>Si è giocata la giornata ${p.rep.r + 1}</h2><p class="tenue">Gli altri presidenti erano pronti: ecco com'è andata.</p>${cartaRisultato(p.rep)}<div class="riga-btn"><button class="btn" data-a="rivedi">▶ Guarda la partita</button><button class="btn sec" data-a="chiudi">Ok</button></div>`, () => mostraPendenti());
}

// ---------- telecronaca ----------
function eventiPartita(rep){
  const r = rng('ev' + S.stagione + rep.r + rep.avv.nome);
  const lato = rep.casa ? 0 : 1, altro = 1 - lato;
  const E = [{ min: 0, tipo: 'inizio', t: 'Fischio d’inizio! Si parte.' }];
  rep.marcatori.forEach((m) => E.push({ min: m.min, tipo: 'gol', lato, mio: true, nome: m.nome, t: `GOL! ${m.nome} la mette dentro!` }));
  rep.marcAvv.forEach((m) => E.push({ min: m.min, tipo: 'gol', lato: altro, mio: false, nome: m.nome, t: `Gol degli avversari: segna ${m.nome}.` }));
  const f = formazione().filter((x) => x.p).map((x) => x.p);
  const nOcc = ri(5, 9, r);
  const frasi = {
    occ: ['Tiro da fuori… alto di poco!', 'Colpo di testa, a lato!', 'Che occasione! Palla fuori di un soffio.', 'Diagonale velenoso, fuori!'],
    parata: ['Parata strepitosa del portiere!', 'Il portiere vola e la toglie dall’incrocio!', 'Tiro centrale, blocca il portiere.', 'Miracolo del portiere!'],
    palo: ['PALO! Che sfortuna!', 'Traversa piena! Si salva la difesa.']
  };
  for (let i = 0; i < nOcc; i++){
    const tipo = pick(['occ', 'occ', 'parata', 'parata', 'palo'], r), chi = r() < 0.5 + (rep.pos - 50) / 100 ? lato : altro;
    const nome = chi === lato && f.length ? nomeG(pick(f.filter((p) => p.r !== 'P').length ? f.filter((p) => p.r !== 'P') : f, r)) : '';
    E.push({ min: ri(3, 89, r), tipo, lato: chi, t: (nome ? nome + ': ' : '') + pick(frasi[tipo], r) });
  }
  for (let i = 0; i < ri(0, 3, r); i++){ const chi = r() < 0.5 ? lato : altro; E.push({ min: ri(10, 88, r), tipo: 'giallo', lato: chi, t: chi === lato && f.length ? `Cartellino giallo per ${nomeG(pick(f, r))}.` : 'Ammonito un giocatore avversario.' }); }
  E.push({ min: 45.5, tipo: 'int', t: 'Fine primo tempo. Tutti negli spogliatoi.' });
  E.push({ min: 90 + rep.rec, tipo: 'fine', t: 'Triplice fischio! Partita finita.' });
  return E.sort((a, b) => a.min - b.min);
}

// ---------- avvisi e fogli ----------
function avviso(t){
  const d = document.createElement('div'); d.className = 'avviso'; d.textContent = t; document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add('su')); setTimeout(() => { d.classList.remove('su'); setTimeout(() => d.remove(), 400); }, 2600);
}
let _dopoFoglio = null;
function foglio(html, dopo){
  chiudiFoglio(true);
  const d = document.createElement('div'); d.className = 'velo'; d.id = 'velo';
  d.innerHTML = `<div class="foglio" role="dialog"><button class="x" data-a="chiudi" aria-label="Chiudi">✕</button>${html}</div>`;
  document.body.appendChild(d); requestAnimationFrame(() => d.classList.add('su'));
  _dopoFoglio = dopo || null;
  d.addEventListener('click', (e) => { if (e.target === d) chiudiFoglio(); });
}
function chiudiFoglio(silenzioso){
  const d = $('#velo'); if (d){ d.remove(); }
  const f = _dopoFoglio; _dopoFoglio = null;
  if (f && !silenzioso) f();
}

// ---------- disegno delle schermate ----------
const coloreVal = (v) => v >= 80 ? 'v5' : v >= 68 ? 'v4' : v >= 54 ? 'v3' : v >= 40 ? 'v2' : 'v1';
const badgeVal = (v) => `<span class="val ${coloreVal(v)}">${v}</span>`;
const stelle = (n, max = 5) => `<span class="stelle">${'★'.repeat(n)}<i>${'★'.repeat(max - n)}</i></span>`;
const stemmaDi = (s, size) => stemmaSVG(s, size, s.nome);
const mioStemma = (size) => stemmaSVG(S.club, size, S.club.nome);
function tagTipo(s){ if (s.uid && s.uid === mioId()) return '<span class="tag tu">TU</span>'; return s.tipo === 'umano' ? '<span class="tag umano" title="Persona vera">👤</span>' : '<span class="tag bot" title="Bot">🤖</span>'; }

function disegna(){
  const app = $('#app');
  if (!S){ app.innerHTML = ''; return; }
  const L = S.lega, T = TIERS[S.tier - 1];
  const cantieri = S.stadio.cantieri.length;
  app.innerHTML = `
  <header class="top">
    <button class="club" data-a="vai" data-v="casa">${mioStemma(30)}<span><b>${esc(S.club.nome)}</b><small style="--c:${T.colore}">${T.nome}${L.online ? ' · <i class="online-dot"></i> online' : ''}</small></span></button>
    <div class="soldi ${S.soldi < 0 ? 'rosso' : ''}" title="${euro(S.soldi)}">${euroBreve(S.soldi)}</div>
    <button class="menu-btn" data-a="menu" aria-label="Impostazioni"><svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg></button>
  </header>
  <main class="schermo" id="schermo">${({ casa: schermoCasa, rosa: schermoRosa, mercato: schermoMercato, stadio: schermoStadio, classifica: schermoClassifica })[schermo]()}</main>
  <nav class="barra">
    ${[['casa', 'Società'], ['rosa', 'Squadra'], ['mercato', 'Mercato'], ['stadio', 'Stadio'], ['classifica', 'Classifica']].map(([k, n]) => `<button class="${schermo === k ? 'on' : ''}" data-a="vai" data-v="${k}">${ICONE[k]}<span>${n}</span>${k === 'stadio' && cantieri ? '<i class="pallino"></i>' : ''}</button>`).join('')}
  </nav>`;
  if (schermo === 'casa') avviaContoAllaRovescia();
}

function prossimaPartita(){
  const L = S.lega, d = L.dati; if (!d || d.giornata >= giornateTot(d.n)) return null;
  const g = calendario(d.n)[d.giornata]; const m = g.find(([h, a]) => h === L.mio || a === L.mio);
  if (!m) return null;
  const casa = m[0] === L.mio; return { casa, avv: d.squadre[casa ? m[1] : m[0]], avvI: casa ? m[1] : m[0], g: d.giornata };
}

function schermoCasa(){
  const L = S.lega, d = L.dati, T = TIERS[S.tier - 1];
  const pp = prossimaPartita();
  const pr = problemiPerGiocare();
  const f = forzaMia(), ft = forzaTot(f), media = Math.round(tierMedia(S.tier));
  const pos = posizioneDi(d, L.mio), me = d.squadre[L.mio];
  let blocco = '';
  if (L.cambio){ blocco = `<div class="attesa"><div class="spin"></div><b>Stiamo cercando il tuo nuovo girone in ${TIERS[L.cambio - 1].nome}…</b></div>`; }
  else if (L.attesa){ blocco = `<div class="attesa"><b>La Serie A online è piena e sta giocando.</b><p>Sei in lista d’attesa: dalla prossima stagione la classifica si allunga ed entri anche tu.</p></div>`; }
  else if (pp){
    const umaniNonPronti = L.online ? umani(d).filter((s) => s.uid !== mioId() && s.pronto !== d.giornata) : [];
    const ioPronto = L.online && me.pronto === d.giornata;
    let btn;
    if (pr.length) btn = `<div class="problemi">${pr.map((p) => `<button class="problema" data-a="vai" data-v="${p.vai}" data-sub="${p.sub}" ${p.ruolo ? `data-ruolo="${p.ruolo}"` : ''}>⚠️ ${p.t}<span>›</span></button>`).join('')}</div>`;
    else if (ioPronto) btn = `<div class="attesa"><b>Sei pronto!</b><p>Aspettiamo ${umaniNonPronti.map((s) => esc(s.nome)).join(', ') || 'gli altri'}. La giornata parte da sola <span id="conto" data-t="${d.scad || 0}"></span>.</p><button class="btn sec" data-a="gioca">Controlla adesso</button></div>`;
    else btn = `<button class="btn-gioca ${_occupato ? 'occupato' : ''}" data-a="gioca"><span>▶</span> ${L.online && umaniNonPronti.length ? 'SONO PRONTO' : 'GIOCA LA PARTITA'}</button>${L.online && umaniNonPronti.length ? `<p class="nota">Nel tuo girone ci sono altre persone vere: si gioca quando siete tutti pronti, o al massimo <span id="conto" data-t="${d.scad || 0}"></span>.</p>` : ''}`;
    blocco = `
      <div class="hm-top"><span>${T.nome} · ${esc(d.nome)}</span><span>Giornata ${pp.g + 1} di ${giornateTot(d.n)}</span></div>
      <div class="hm-squadre">
        <div class="hm-t ${pp.casa ? '' : 'dx'}">${pp.casa ? mioStemma(66) : stemmaDi(pp.avv, 66)}<b>${esc(pp.casa ? S.club.nome : pp.avv.nome)}</b><small>${pp.casa ? pos + '° · ' + me.pt + ' pt' : posizioneDi(d, pp.avvI) + '° · ' + pp.avv.pt + ' pt'} ${pp.casa ? '' : tagTipo(pp.avv)}</small></div>
        <div class="hm-vs"><b>VS</b><small>${pp.casa ? '🏠 In casa' : '🚌 Trasferta'}</small></div>
        <div class="hm-t">${pp.casa ? stemmaDi(pp.avv, 66) : mioStemma(66)}<b>${esc(pp.casa ? pp.avv.nome : S.club.nome)}</b><small>${pp.casa ? posizioneDi(d, pp.avvI) + '° · ' + pp.avv.pt + ' pt ' + tagTipo(pp.avv) : pos + '° · ' + me.pt + ' pt'}</small></div>
      </div>
      ${btn}`;
  }
  const todo = [
    { ok: !!S.staff.all, t: 'Ingaggia l’allenatore', vai: 'mercato', sub: 'staff' },
    { ok: S.rosa.length >= 11 && S.rosa.some((p) => p.r === 'P'), t: 'Compra almeno 11 giocatori (con un portiere)', vai: 'mercato', sub: 'giocatori' },
    { ok: Object.keys(S.staff).length >= 3, t: 'Prendi altro staff (preparatore, medico…)', vai: 'mercato', sub: 'staff' },
    { ok: S.stadio.campo > 0 || S.stadio.tribune > 0 || S.stadio.cantieri.length > 0, t: 'Migliora lo stadio', vai: 'stadio' },
    { ok: S.giornate > 0, t: 'Gioca la prima partita!', vai: 'casa' }
  ];
  const mostraTodo = S.giornate < 3 && todo.some((x) => !x.ok);
  const vicini = ordina(d.squadre); const k = vicini.findIndex((s) => s.i === L.mio);
  const da = clamp(k - 2, 0, Math.max(0, vicini.length - 5));
  const umaniN = umani(d).length;
  return `
  <section class="hero-match">${blocco}</section>
  ${mostraTodo ? `<section class="carta todo"><h3>Per iniziare</h3>${todo.map((x) => `<button class="todo-r ${x.ok ? 'ok' : ''}" data-a="vai" data-v="${x.vai}" ${x.sub ? `data-sub="${x.sub}"` : ''}><i>${x.ok ? '✓' : ''}</i>${x.t}</button>`).join('')}${S.rosa.length < 11 ? `<button class="btn oro" data-a="squadraPronta">⚡ Squadra pronta in un tocco</button><p class="nota">Compra subito 18 giocatori adatti al tuo campionato e un allenatore, spendendo meno della metà dei soldi.</p>` : ''}</section>` : ''}
  <section class="tessere">
    <div class="tessera"><div class="anello" style="--p:${clamp((ft - media + 20) / 40, 0.05, 1)}"><b>${ft}</b></div><span>Forza squadra</span><small>media campionato ${media}</small></div>
    <div class="tessera"><div class="anello morale" style="--p:${S.morale / 100}"><b>${S.morale}</b></div><span>Morale</span><small>${S.morale >= 80 ? 'alle stelle' : S.morale >= 55 ? 'buono' : 'basso'}</small></div>
    <div class="tessera"><div class="numero">${S.tifosi >= 10000 ? Math.round(S.tifosi / 1000) + 'k' : S.tifosi}</div><span>Tifosi</span><small>stadio: ${postiStadio(S).toLocaleString('it-IT')} posti</small></div>
    <div class="tessera"><div class="numero">${pos}°</div><span>In classifica</span><small>su ${d.n} squadre</small></div>
  </section>
  <section class="carta">
    <div class="carta-tit"><h3>Classifica</h3><button class="link" data-a="vai" data-v="classifica">Vedi tutta ›</button></div>
    <p class="nota">${L.online ? `🌍 Girone online: <b>${umaniN}</b> ${umaniN === 1 ? 'persona vera' : 'persone vere'} e ${d.n - umaniN} bot.` : '🤖 Giochi da solo contro i bot. Vai online dal menu: quando entra una persona vera, un bot se ne va.'}</p>
    ${tabellaHTML(vicini.slice(da, da + 5), d, true, da)}
  </section>
  ${S.ultima ? `<section class="carta"><div class="carta-tit"><h3>Ultima partita</h3><button class="link" data-a="rivedi">▶ Rivedi</button></div>${cartaRisultato(S.ultima)}</section>` : ''}
  ${S.bilancio ? `<section class="carta"><div class="carta-tit"><h3>Soldi</h3><span class="${S.bilancio.netto >= 0 ? 'verde' : 'rosso'}">${S.bilancio.netto >= 0 ? '+' : ''}${euroBreve(S.bilancio.netto)} l’ultima giornata</span></div>${grafSoldi()}</section>` : ''}
  <section class="carta"><h3>Notizie</h3><div class="notizie">${S.notizie.slice(0, 8).map((n) => `<div class="notizia"><i>${n.ico}</i><p>${esc(n.t)}</p></div>`).join('')}</div></section>`;
}
function grafSoldi(){
  const a = S.soldiStoria; if (a.length < 2) return '';
  const min = Math.min(0, ...a), max = Math.max(...a), W = 300, H = 70;
  const pts = a.map((v, i) => [i / (a.length - 1) * W, H - 6 - (v - min) / Math.max(1, max - min) * (H - 12)]);
  const p = pts.map((x) => x.map((v) => v.toFixed(1)).join(',')).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="graf" preserveAspectRatio="none"><defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5c542" stop-opacity=".45"/><stop offset="1" stop-color="#f5c542" stop-opacity="0"/></linearGradient></defs><polygon points="0,${H} ${p} ${W},${H}" fill="url(#gs)"/><polyline points="${p}" fill="none" stroke="#f5c542" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg><div class="graf-leg"><span>${euroBreve(a[0])}</span><span>adesso ${euroBreve(a[a.length - 1])}</span></div>`;
}
function cartaRisultato(rep){
  const io = { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim };
  const h = rep.casa ? io : rep.avv, a = rep.casa ? rep.avv : io;
  const gh = rep.casa ? rep.gf : rep.gs, ga = rep.casa ? rep.gs : rep.gf;
  return `<div class="risultato ${rep.esito}"><div>${stemmaDi(h, 38)}<span>${esc(h.nome)}</span></div><b>${gh} - ${ga}</b><div>${stemmaDi(a, 38)}<span>${esc(a.nome)}</span></div></div>
  ${rep.marcatori.length ? `<p class="marc">⚽ ${rep.marcatori.map((m) => esc(m.nome) + ' ' + m.min + '’').join(' · ')}</p>` : ''}`;
}
function tabellaHTML(righe, d, mini, da = 0, mio = S.lega.mio){
  const n = d.n;
  return `<table class="tab ${mini ? 'mini' : ''}"><thead><tr><th>#</th><th class="sx">Squadra</th>${mini ? '' : '<th>G</th><th>V</th><th>N</th><th>P</th>'}<th>DR</th><th>PT</th>${mini ? '' : '<th>Forma</th>'}</tr></thead><tbody>
  ${righe.map((s, k) => { const pos = da + k + 1; const zona = pos <= PROMOSSE && d.tier < TOP ? 'promo' : pos > n - RETROCESSE && d.tier > 1 ? 'retro' : (pos === 1 ? 'promo' : '');
    return `<tr class="${zona} ${s.i === mio ? 'io' : ''}"><td><span class="pos">${pos}</span></td><td class="sx"><span class="sq">${stemmaDi(s, 22)}<span>${esc(s.nome)}</span>${tagTipo(s)}</span></td>${mini ? '' : `<td>${s.g}</td><td>${s.v}</td><td>${s.n}</td><td>${s.p}</td>`}<td>${s.gf - s.gs > 0 ? '+' : ''}${s.gf - s.gs}</td><td><b>${s.pt}</b></td>${mini ? '' : `<td><span class="forma">${(s.f || '').split('').map((c) => `<i class="${c}">${c}</i>`).join('')}</span></td>`}</tr>`; }).join('')}
  </tbody></table>`;
}

function schermoClassifica(){
  const L = S.lega, d = L.dati, tab = sottoschermo.classifica || 'tab';
  const tabs = `<div class="tabs">${[['tab', 'Classifica'], ['cal', 'Calendario'], ['scala', 'Campionati']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-a="sub" data-s="classifica" data-v="${k}">${n}</button>`).join('')}</div>`;
  let corpo = '';
  if (tab === 'tab'){
    const umaniN = umani(d).length;
    corpo = `<section class="carta"><div class="carta-tit"><h3>${TIERS[d.tier - 1].nome} · ${esc(d.nome)}</h3><span class="tenue">Stagione ${d.stagione} · giornata ${Math.min(d.giornata + 1, giornateTot(d.n))}/${giornateTot(d.n)}</span></div>
      <div class="legenda"><span><i class="q promo"></i>${d.tier < TOP ? 'Promozione' : 'Campione'}</span>${d.tier > 1 ? '<span><i class="q retro"></i>Retrocessione</span>' : ''}<span>🤖 bot</span><span>👤 persona vera</span></div>
      ${tabellaHTML(ordina(d.squadre), d, false)}
      <p class="nota">${L.online ? `Girone online con ${umaniN} ${umaniN === 1 ? 'persona vera' : 'persone vere'}. ${d.tier === TOP ? 'Quando la Serie A è tutta di persone vere, la classifica si allunga!' : 'Quando entra un nuovo presidente prende il posto di un bot, con i suoi punti.'}` : 'Ogni squadra con 🤖 è un bot. Se vai online, le persone vere prendono il posto dei bot.'}</p></section>`;
  } else if (tab === 'cal'){
    const cal = calendario(d.n);
    corpo = `<section class="carta"><h3>Le tue partite</h3><div class="cal">${cal.map((g, r) => { const m = g.find(([h, a]) => h === L.mio || a === L.mio); if (!m) return ''; const casa = m[0] === L.mio; const avv = d.squadre[casa ? m[1] : m[0]];
      const x = d.ris[r] && d.ris[r].find((q) => q.h === m[0] && q.a === m[1]);
      let esito = ''; if (x){ const gf = casa ? x.gh : x.ga, gs = casa ? x.ga : x.gh; esito = `<b class="es ${gf > gs ? 'V' : gf < gs ? 'P' : 'N'}">${x.gh}-${x.ga}</b>`; }
      return `<div class="cal-r ${r === d.giornata ? 'ora' : ''}"><span class="g">${r + 1}</span><span>${casa ? '🏠' : '🚌'}</span>${stemmaDi(avv, 22)}<span class="nm">${esc(avv.nome)}</span>${esito || (r === d.giornata ? '<b class="es prossima">PROSSIMA</b>' : '<span class="tenue">—</span>')}</div>`; }).join('')}</div></section>`;
  } else {
    corpo = `<section class="carta"><h3>La scalata</h3><p class="nota">Vinci il campionato o arriva secondo per salire. Gli ultimi due scendono. In cima c’è la Serie A!</p><div class="scala">${TIERS.map((t, i) => ({ t, i })).reverse().map(({ t, i }) => `<div class="gradino ${i + 1 === S.tier ? 'qui' : i + 1 < S.tier ? 'fatto' : ''}" style="--c:${t.colore};--w:${55 + i * 5}%"><span>${i + 1 === S.tier ? mioStemma(22) : ''}${t.nome}</span><small>${i + 1 === S.tier ? 'Sei qui' : i + 1 < S.tier ? '✓' : ''}</small></div>`).join('')}</div></section>
    <section class="carta"><h3>La tua storia</h3>${S.storico.length ? `<div class="storia">${S.storico.map((h) => `<div class="st-r"><b>Stagione ${h.stagione}</b><span>${TIERS[h.tier - 1].nome}</span><span class="pos-b">${h.pos}°</span><span class="tenue">${h.pt} pt${h.bomber ? ' · ⚽ ' + esc(h.bomber) : ''}</span></div>`).join('')}</div>` : '<p class="tenue">Finisci la prima stagione per scrivere la tua storia.</p>'}
    ${S.trofei.length ? `<div class="trofei">${S.trofei.map((t) => `<div class="trofeo"><span>🏆</span><b>${esc(t.nome)}</b><small>Stagione ${t.stagione}</small></div>`).join('')}</div>` : ''}</section>`;
  }
  return tabs + corpo;
}

function schermoRosa(){
  const f = formazione(), ft = forzaTot(forzaMia());
  const ruoli = { P: [], D: [], C: [], A: [] };
  S.rosa.slice().sort((a, b) => b.val - a.val).forEach((p) => ruoli[p.r].push(p));
  const titIds = new Set(f.filter((x) => x.p).map((x) => x.p.id));
  // posizioni in campo (verticale: porta in basso)
  const m = MODULI[S.tattica.mod];
  const yL = [92, 72, 46, 18];
  const posti = [{ x: 50, y: yL[0] }];
  [m[0], m[1], m[2]].forEach((n, li) => { for (let i = 0; i < n; i++) posti.push({ x: (i + 1) * 100 / (n + 1), y: yL[li + 1] + (li === 1 && n >= 5 && (i === 0 || i === n - 1) ? -6 : 0) }); });
  const campo = `<div class="campo-tat">${f.map((x, k) => `<button class="pt ${x.p && x.p.r !== x.ruolo ? 'fuori' : ''}" style="left:${posti[k].x}%;top:${posti[k].y}%" data-a="slot" data-k="${k}"><span class="maglia" style="--c1:${S.club.c1};--c2:${S.club.c2}">${x.p ? x.p.num : '?'}</span><small>${x.p ? esc(x.p.c) : 'vuoto'}</small>${x.p ? `<em class="${coloreVal(x.p.val)}">${x.p.val}</em>` : ''}</button>`).join('')}</div>`;
  return `
  <section class="carta">
    <div class="carta-tit"><h3>Formazione</h3><span class="forza-b">Forza <b>${ft}</b></span></div>
    <div class="chips">${Object.keys(MODULI).map((k) => `<button class="chip ${S.tattica.mod === k ? 'on' : ''}" data-a="modulo" data-v="${k}">${k}</button>`).join('')}</div>
    ${campo}
    <div class="seg">${MENTALITA.map((n, i) => `<button class="${S.tattica.ment === i ? 'on' : ''}" data-a="ment" data-v="${i}">${['🛡️', '⚖️', '⚔️'][i]} ${n}</button>`).join('')}</div>
    <p class="nota">Tocca un giocatore in campo per cambiarlo. ${S.tattica.tit ? '<button class="link" data-a="autoForm">Torna alla formazione automatica</button>' : 'La formazione si sceglie da sola con i migliori.'}</p>
  </section>
  ${S.rosa.length ? Object.entries(ruoli).map(([r, lista]) => lista.length ? `<section class="carta"><h3>${RUOLI_PL[r]} <span class="tenue">${lista.length}</span></h3>${lista.map((p) => rigaGiocatore(p, titIds.has(p.id))).join('')}</section>` : '').join('')
    : `<section class="carta vuoto"><p>Non hai ancora giocatori.</p><button class="btn" data-a="vai" data-v="mercato" data-sub="giocatori">Vai al mercato</button><button class="btn oro" data-a="squadraPronta">⚡ Squadra pronta</button></section>`}
  <p class="nota centro">Stipendi: ${euro(stipendiGiocatori())} a giornata · ${S.rosa.length}/28 giocatori</p>`;
}
function rigaGiocatore(p, tit){
  return `<button class="gioc" data-a="giocatore" data-id="${p.id}"><span class="num r${p.r}">${p.num || ''}</span><span class="info"><b>${p.stella ? '⭐ ' : ''}${esc(p.n)} ${esc(p.c)}</b><small>${RUOLI[p.r]} · ${p.eta} anni${p.gol ? ' · ⚽ ' + p.gol : ''}${tit ? ' · <em>titolare</em>' : ''}</small><span class="barra-forma"><i style="width:${p.forma}%"></i></span></span>${p.inf > 0 ? `<span class="inf">🚑 ${p.inf}</span>` : ''}${badgeVal(p.val)}</button>`;
}
function schedaGiocatore(id){
  const p = S.rosa.find((x) => x.id === id) || inVendita(id);
  if (!p) return;
  const mio = S.rosa.includes(p);
  const oss = livStaff(S, 'oss');
  const potTxt = mio || oss >= 2 ? p.pot : oss >= 1 ? (p.pot > p.val + 8 ? 'alto' : 'normale') : '?';
  foglio(`<div class="scheda-g"><span class="maglia big" style="--c1:${mio ? S.club.c1 : '#334155'};--c2:${mio ? S.club.c2 : '#94a3b8'}">${p.num || RUOLI[p.r][0]}</span><div><h2>${esc(p.n)} ${esc(p.c)}</h2><p class="tenue">${RUOLI[p.r]} · ${p.eta} anni</p></div>${badgeVal(p.val)}</div>
  <div class="dati-g"><div><small>Bravura</small><b>${p.val}</b></div><div><small>Può arrivare a</small><b>${potTxt}</b></div><div><small>Forma</small><b>${p.forma}%</b></div><div><small>Stipendio</small><b>${euroBreve(p.stip)}</b><small>a giornata</small></div><div><small>Valore</small><b>${euroBreve(p.prezzo)}</b></div><div><small>Gol</small><b>${p.gol || 0}</b><small>${p.golTot ? 'in carriera ' + (p.golTot + (p.gol || 0)) : 'quest’anno'}</small></div></div>
  ${p.inf > 0 ? `<p class="avviso-in">🚑 Infortunato: torna fra ${p.inf} giornat${p.inf === 1 ? 'a' : 'e'}.</p>` : ''}
  ${mio ? `<div class="riga-btn"><button class="btn rosso" data-a="vendi" data-id="${p.id}">Vendi per ${euroBreve(prezzoVendita(p))}</button></div>`
    : `<div class="riga-btn"><button class="btn" data-a="compra" data-id="${p.id}" ${S.soldi < prezzoAcquisto(p) ? 'disabled' : ''}>Compra per ${euroBreve(prezzoAcquisto(p))}</button></div>`}`);
}
function sceltaSlot(k){
  const f = formazione(); const ruolo = f[k].ruolo;
  const disp = S.rosa.filter((p) => p.inf <= 0).sort((a, b) => effInRuolo(b, ruolo) - effInRuolo(a, ruolo));
  foglio(`<h2>Chi gioca come ${RUOLI[ruolo].toLowerCase()}?</h2><div class="lista-scelta">${disp.map((p) => { const dove = f.findIndex((x) => x.p === p); return `<button class="gioc" data-a="metti" data-k="${k}" data-id="${p.id}"><span class="num r${p.r}">${p.num}</span><span class="info"><b>${esc(p.n)} ${esc(p.c)}</b><small>${RUOLI[p.r]}${p.r !== ruolo ? ' · fuori ruolo' : ''}${dove >= 0 ? ' · ora in campo' : ' · in panchina'} · forma ${p.forma}%</small></span>${badgeVal(Math.round(effInRuolo(p, ruolo)))}</button>`; }).join('')}</div>`);
}
function metti(k, id){
  const f = formazione(); const ids = f.map((x) => x.p ? x.p.id : null);
  const j = ids.indexOf(id);
  if (j >= 0) ids[j] = ids[k];
  ids[k] = id; S.tattica.tit = ids;
  aggiornaMioSlot(); salva(); chiudiFoglio(); disegna();
}

function schermoMercato(){
  const tab = sottoschermo.mercato || 'giocatori';
  const tabs = `<div class="tabs">${[['giocatori', 'Giocatori'], ['campioni', '⭐ Campioni'], ['staff', 'Staff'], ['vendi', 'I tuoi']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-a="sub" data-s="mercato" data-v="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 'staff'){
    return tabs + STAFF.map((s) => { const c = S.staff[s.k]; const cand = S.staffMercato.lista.filter((x) => x.k === s.k);
      return `<section class="carta staff"><div class="carta-tit"><h3>${s.ico} ${s.nome}${s.obbl ? ' <span class="obbl">obbligatorio</span>' : ''}</h3></div><p class="nota">${s.eff}</p>
      ${c ? `<div class="staff-c"><b>${esc(c.nome)}</b>${stelle(c.liv)}<small>${euroBreve(c.stip)} a giornata</small><button class="link rosso" data-a="licenzia" data-k="${s.k}">Licenzia</button></div>` : '<div class="staff-c vuoto">Nessuno</div>'}
      <div class="cand">${cand.filter((x) => !c || x.liv > c.liv).map((x) => `<div class="cand-r"><span>${stelle(x.liv)}<b>${esc(x.nome)}</b><small>${euroBreve(x.stip)}/giornata</small></span><button class="btn mini" data-a="ingaggia" data-id="${x.id}" ${S.soldi < x.ingaggio ? 'disabled' : ''}>${euroBreve(x.ingaggio)}</button></div>`).join('') || '<p class="tenue">Hai già il migliore!</p>'}</div></section>`; }).join('');
  }
  if (tab === 'vendi'){
    return tabs + (S.rosa.length ? `<section class="carta"><p class="nota">Tocca un giocatore per venderlo. Il direttore sportivo ti fa guadagnare di più.</p>${S.rosa.slice().sort((a, b) => b.prezzo - a.prezzo).map((p) => rigaGiocatore(p)).join('')}</section>` : '<section class="carta vuoto"><p>Non hai giocatori da vendere.</p></section>');
  }
  const ruolo = sottoschermo.ruolo || '';
  const campioni = tab === 'campioni';
  const lista = (campioni ? listaCampioni() : S.mercato.lista).filter((p) => !ruolo || p.r === ruolo);
  const oss = livStaff(S, 'oss');
  return tabs + `
  <section class="carta">${campioni ? '<div class="carta-tit"><h3>⭐ Calciatori veri</h3></div><p class="nota">I campioni veri della Serie A e d’Italia. Costano tanto: risparmia e sali di categoria per comprarli! La bravura la decide il gioco.</p>' : `<div class="carta-tit"><h3>Giocatori liberi</h3><button class="link" data-a="ricerca">🔎 Nuova ricerca (${euroBreve(costoRicerca())})</button></div>`}
  <div class="chips">${[['', 'Tutti'], ['P', 'Portieri'], ['D', 'Difensori'], ['C', 'Centrocampisti'], ['A', 'Attaccanti']].map(([k, n]) => `<button class="chip ${ruolo === k ? 'on' : ''}" data-a="ruolo" data-v="${k}">${n}</button>`).join('')}</div>
  ${S.rosa.length < 11 && !campioni ? `<button class="btn oro largo" data-a="squadraPronta">⚡ Squadra pronta in un tocco</button>` : ''}
  <div class="merc">${lista.map((p) => `<div class="merc-r"><button class="gioc" data-a="giocatore" data-id="${p.id}"><span class="num r${p.r}">${p.stella ? '⭐' : p.r}</span><span class="info"><b>${esc(p.n)} ${esc(p.c)}</b><small>${p.eta} anni · ${euroBreve(p.stip)}/giornata${oss >= 1 && p.pot >= p.val + 10 ? ' · <em>💎 talento</em>' : ''}</small></span>${badgeVal(p.val)}</button><button class="btn mini" data-a="compra" data-id="${p.id}" ${S.soldi < prezzoAcquisto(p) ? 'disabled' : ''}>${euroBreve(prezzoAcquisto(p))}</button></div>`).join('') || '<p class="tenue">Nessuno: prova una nuova ricerca.</p>'}</div>
  ${campioni ? '' : '<p class="nota">La lista si rinnova da sola ogni 3 giornate. Con un osservatore più bravo trovi giocatori migliori.</p>'}</section>`;
}

function schermoStadio(){
  const st = S.stadio;
  return `
  <section class="carta stadio-c">
    <div class="stadio-wrap">${(sottoschermo.stadio || 'pano') === 'pano' ? stadioPanoramaSVG(S) : stadioSVG(S)}<div class="stadio-nome">${esc(nomeStadio(S))}</div></div>
    <div class="tabs piccole">${[['pano', '🏟️ Panoramica'], ['alto', '🛰️ Dall’alto']].map(([k, n]) => `<button class="${(sottoschermo.stadio || 'pano') === k ? 'on' : ''}" data-a="sub" data-s="stadio" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="stadio-dati"><div><small>Posti</small><b>${postiStadio(S).toLocaleString('it-IT')}</b></div><div><small>Pubblico previsto</small><b>${calcPubblico(false).toLocaleString('it-IT')}</b></div><div><small>Biglietto</small><b>${euro(prezzoBiglietto())}</b></div></div>
    <div class="usura"><div class="usura-t"><span>Stato dello stadio</span><b class="${st.usura < 60 ? 'rosso' : st.usura < 80 ? 'giallo' : 'verde'}">${Math.round(st.usura)}%</b></div><div class="barra-u"><i class="${st.usura < 60 ? 'rosso' : st.usura < 80 ? 'giallo' : ''}" style="width:${st.usura}%"></i></div>
    <button class="btn ${st.usura < 80 ? 'oro' : 'sec'}" data-a="restaura" ${st.usura >= 99 ? 'disabled' : ''}>🧹 Restaura tutto · ${euroBreve(costoRestauro(S))}</button><p class="nota">Ogni partita in casa rovina un po’ il campo. Sotto il 60% vengono meno tifosi.</p></div>
  </section>
  ${progettoStadio()}
  ${STADIO.map((s) => { const liv = st[s.k], max = s.costi.length - 1, c = st.cantieri.find((x) => x.k === s.k);
    return `<section class="carta miglioria"><div class="mig-top"><span class="mig-ico">${s.ico}</span><div><h3>${s.nome}</h3><p>${s.livelli[liv]}${s.posti ? ' · ' + s.posti[liv].toLocaleString('it-IT') + ' posti' : ''}</p></div><span class="livelli">${Array.from({ length: max }, (_, i) => `<i class="${i < liv ? 'on' : c && i === liv ? 'lavori' : ''}"></i>`).join('')}</span></div>
    <p class="nota">${s.eff}</p>
    ${c ? `<div class="lavori-b">🏗️ Lavori in corso: ${s.livelli[c.liv]} · finiscono fra ${c.fine - S.giornate} giornat${c.fine - S.giornate === 1 ? 'a' : 'e'}</div>`
      : liv < max ? `<button class="btn mig-btn" data-a="costruisci" data-k="${s.k}" ${S.soldi < s.costi[liv + 1] ? 'disabled' : ''}><span>${liv === 0 && !s.posti ? 'Costruisci' : 'Migliora'}: ${s.livelli[liv + 1]}${s.posti ? ' (' + s.posti[liv + 1].toLocaleString('it-IT') + ' posti)' : ''}</span><b>${euroBreve(s.costi[liv + 1])} · ${s.tempi[liv + 1]} g.</b></button>` : '<div class="lavori-b max">⭐ Al massimo!</div>'}</section>`; }).join('')}
  <p class="nota centro">Manutenzione: ${euro(manutenzione())} a giornata</p>`;
}

function progettoStadio(){
  const d = designDi(S), aperto = sottoschermo.progetto;
  const chipCol = (k, val, lista) => `<div class="colori">${lista.map((c) => `<button class="col ${val === c ? 'on' : ''}" style="--c:${c || S.club.c1}" data-a="design" data-k="${k}" data-v="${c}" aria-label="colore">${c ? '' : '<i>🛡️</i>'}</button>`).join('')}</div>`;
  const tog = (k, nome) => `<button class="chip ${d[k] ? 'on' : ''}" data-a="design" data-k="${k}" data-v="${d[k] ? '0' : '1'}">${nome}</button>`;
  return `<section class="carta progetto"><button class="carta-tit apri" data-a="apriProgetto"><h3>🎨 Progetta il tuo stadio</h3><span>${aperto ? '▲' : '▼'}</span></button>
  ${aperto ? `<label class="campo-t">Nome dello stadio<input id="nomeStadio" maxlength="30" placeholder="${esc('Stadio ' + (S.club.citta || S.club.nome))}" value="${esc((S.stadio.design || {}).nome || '')}"></label>
  <div class="scelta"><span>Colore dei seggiolini</span>${chipCol('sedili', (S.stadio.design || {}).sedili || '', [''].concat(COLORI))}</div>
  <div class="scelta"><span>Colore delle curve</span>${chipCol('sedili2', (S.stadio.design || {}).sedili2 || '', [''].concat(COLORI))}</div>
  <div class="scelta"><span>Colore del tetto</span>${chipCol('tetto', d.tetto, ['#e9ecef', '#adb5bd', '#343a40', '#f5c542', '#1971c2', '#c92a2a', '#2b8a3e', S.club.c1])}</div>
  <div class="scelta"><span>Forma</span><div class="chips">${['Classico', 'Ovale'].map((n, i) => `<button class="chip ${d.forma === i ? 'on' : ''}" data-a="design" data-k="forma" data-v="${i}">${n}</button>`).join('')}</div></div>
  <div class="scelta"><span>Dettagli</span><div class="chips wrap">${tog('scritta', '🔤 Nome sulla tribuna')}${tog('bandiere', '🚩 Bandiere')}${tog('fumogeni', '💨 Fumogeni dei tifosi')}${tog('notte', '🌙 Di sera')}</div></div>
  <p class="nota">Più migliori le tribune, le luci e il maxischermo, più il tuo stadio diventa spettacolare.</p>` : '<p class="nota">Scegli il nome, i colori dei seggiolini, il tetto, la forma, le bandiere e i fumogeni.</p>'}</section>`;
}

// ---------- codice segreto ----------
function chiediCodice(){
  if (S.codice) return pannelloSegreto();
  foglio(`<h2>🔑 Aggiungi codice</h2><p class="tenue">Hai un codice segreto? Scrivilo qui.</p><div class="login-f"><input id="codiceIn" placeholder="Codice" autocomplete="off" autocapitalize="none"><button class="btn" id="codiceOk">Sblocca</button><p class="rosso" id="codiceErr"></p></div>`);
  const ok = () => { const v = ($('#codiceIn').value || '').trim().toLowerCase(); if (v === 'arcangeli'){ S.codice = true; salva(); Suono.fanfara(); coriandoli(['#f5c542', '#c6ff3d', '#fff'], 120); pannelloSegreto(); } else { $('#codiceErr').textContent = 'Codice sbagliato'; } };
  $('#codiceOk').onclick = ok; $('#codiceIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); }); setTimeout(() => $('#codiceIn') && $('#codiceIn').focus(), 100);
}
function pannelloSegreto(){
  const on = S.lega.online;
  const T = S.trucchi || {};
  const b = (a, t, cls = 'sec') => `<button class="btn mini ${cls}" data-a="segreto" data-v="${a}" ${on ? 'disabled' : ''}>${t}</button>`;
  const tg = (k, t) => `<button class="chip ${T[k] ? 'on' : ''}" data-a="segreto" data-v="t-${k}" ${on ? 'disabled' : ''}>${t}</button>`;
  foglio(`<h2>🪄 Pannello segreto</h2>${on ? '<p class="avviso-in">Il pannello segreto funziona quando giochi da solo, così online è giusto per tutti.</p>' : '<p class="tenue">Puoi cambiare tutto quello che vuoi.</p>'}
  <div class="segreto">
  <h3>💶 Soldi</h3><div class="login-f"><input id="sSoldi" type="number" inputmode="numeric" value="${Math.round(S.soldi)}" ${on ? 'disabled' : ''}></div>
  <div class="riga-btn">${b('soldiImposta', 'Imposta', '')}${b('soldi1', '+1 mln')}${b('soldi10', '+10 mln')}${b('soldi100', '+100 mln')}${b('soldi1000', '+1 miliardo')}</div>
  <h3>❤️ Tifosi e morale</h3><div class="riga-btn">${b('tifosi', '+10.000 tifosi')}${b('tifosi100', '+100.000 tifosi')}${b('morale', 'Morale al massimo')}</div>
  <h3>👕 Squadra</h3><div class="riga-btn">${b('forti', 'Tutti +5')}${b('max', 'Tutti a 99')}${b('cura', 'Tutti in forma e guariti')}${b('giovani', 'Tutti 20 anni')}</div>
  <h3>🏟️ Stadio</h3><div class="riga-btn">${b('lavori', 'Finisci subito i lavori')}${b('stadioMax', 'Stadio al massimo')}${b('nuovo', 'Stadio come nuovo')}</div>
  <h3>📋 Staff</h3><div class="riga-btn">${b('staff', 'Tutto lo staff a 5 stelle')}</div>
  <h3>🏆 Campionato</h3><div class="login-f"><select id="sTier" ${on ? 'disabled' : ''}>${TIERS.map((t, i) => `<option value="${i + 1}" ${i + 1 === S.tier ? 'selected' : ''}>${t.nome}</option>`).join('')}</select></div>
  <div class="riga-btn">${b('tier', 'Vai a questo campionato', '')}${b('fineStagione', 'Salta a fine stagione')}${b('trofeo', '+1 trofeo')}</div>
  <h3>✨ Trucchi sempre attivi</h3><div class="chips wrap">${tg('gratis', '🆓 Tutto gratis')}${tg('super', '🦸 Super squadra')}</div>
  <p class="nota">«Tutto gratis»: giocatori, campioni, staff e stadio costano zero e i lavori finiscono subito. «Super squadra»: la tua squadra diventa fortissima.</p>
  </div><button class="btn largo" data-a="chiudi">Fatto</button>`);
}
function segreto(v){
  if (S.lega.online) return;
  const fatto = (t) => { aggiornaMioSlot(); salva(); disegna(); avviso(t); };
  const soldi = { soldi1: 1e6, soldi10: 1e7, soldi100: 1e8, soldi1000: 1e9 };
  if (v.startsWith('t-')){ const k = v.slice(2); S.trucchi = S.trucchi || {}; S.trucchi[k] = !S.trucchi[k]; fatto(S.trucchi[k] ? 'Trucco attivato!' : 'Trucco spento'); return pannelloSegreto(); }
  if (soldi[v]){ S.soldi += soldi[v]; S.soldiStoria.push(Math.round(S.soldi)); fatto('+' + euroBreve(soldi[v])); return pannelloSegreto(); }
  switch (v){
    case 'soldiImposta': { const n = Math.max(0, Math.min(1e12, Math.round(+($('#sSoldi').value) || 0))); S.soldi = n; S.soldiStoria.push(n); fatto('Soldi: ' + euroBreve(n)); break; }
    case 'tifosi': S.tifosi += 10000; fatto('+10.000 tifosi'); break;
    case 'tifosi100': S.tifosi += 100000; fatto('+100.000 tifosi'); break;
    case 'morale': S.morale = 100; fatto('Morale alle stelle!'); break;
    case 'forti': S.rosa.forEach((p) => { p.val = Math.min(99, p.val + 5); p.pot = Math.max(p.pot, p.val); p.prezzo = valoreDi(p); }); fatto('Tutti più forti!'); break;
    case 'max': S.rosa.forEach((p) => { p.val = 99; p.pot = 99; p.prezzo = valoreDi(p); }); fatto('Tutti a 99!'); break;
    case 'cura': S.rosa.forEach((p) => { p.forma = 100; p.inf = 0; }); fatto('Tutti in forma!'); break;
    case 'giovani': S.rosa.forEach((p) => { p.eta = 20; p.prezzo = valoreDi(p); }); fatto('Tutti ventenni!'); break;
    case 'lavori': S.stadio.cantieri.forEach((c) => { S.stadio[c.k] = c.liv; }); S.stadio.cantieri = []; fatto('Lavori finiti!'); break;
    case 'stadioMax': STADIO.forEach((x) => { S.stadio[x.k] = x.costi.length - 1; }); S.stadio.cantieri = []; S.stadio.usura = 100; fatto('Stadio al massimo!'); break;
    case 'nuovo': S.stadio.usura = 100; fatto('Stadio come nuovo!'); break;
    case 'staff': STAFF.forEach((x) => { S.staff[x.k] = Object.assign(nuovoStaff(x.k, 5), { stip: S.staff[x.k] ? S.staff[x.k].stip : STAFF_STIP[5] }); }); fatto('Staff a 5 stelle!'); break;
    case 'trofeo': S.trofei.push({ stagione: S.stagione, tier: S.tier, nome: 'Campioni ' + TIERS[S.tier - 1].nome }); fatto('+1 trofeo in bacheca!'); break;
    case 'tier': { const t = +$('#sTier').value; S.tier = t; S.sponsor = nuovoSponsor(t); nuovaLegaLocale(t); genMercato(); genStaffMercato(); notizia(`La ${S.club.nome} ora gioca in ${TIERS[t - 1].nome}!`, '🪄'); fatto('Ora sei in ' + TIERS[t - 1].nome); break; }
    case 'fineStagione': { chiudiFoglio(true); const st = S.stagione; let k = 0; while (S.stagione === st && k++ < 60){ giocaGiornataDati(S.lega.dati); sincronizza(false); if (S.stagione !== st) break; S.pendenti = S.pendenti.filter((x) => x.tipo === 'stagione'); chiudiFoglio(true); } disegna(); return; }
  }
  pannelloSegreto();
}

// ---------- partita a schermo intero ----------
let _partita = null;
function mostraPartita(rep, dopo){
  chiudiFoglio(true);
  const io = { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim };
  const h = rep.casa ? io : rep.avv, a = rep.casa ? rep.avv : io;
  const v = document.createElement('div'); v.className = 'match'; v.id = 'match';
  const sp = rep.casa ? calcPubblicoTesto(rep) : '';
  v.innerHTML = `<div class="sb"><div class="sbt">${stemmaDi(h, 40)}<b>${esc(h.nome)}</b></div><div class="score"><div><span id="gh">0</span><i>-</i><span id="ga">0</span></div><small id="orologio">0’</small></div><div class="sbt">${stemmaDi(a, 40)}<b>${esc(a.nome)}</b></div></div>
  <div class="campo-wrap"><canvas id="campo"></canvas><div class="golbig" id="golbig"></div></div>
  ${sp ? `<div class="spett">🏟️ ${sp}</div>` : ''}
  <div class="cronaca" id="cronaca"></div>
  <div class="viste">${[['tv', '📺 Telecamera'], ['alto', '🛰️ Dall’alto'], ['numeri', '🔢 Solo numeri']].map(([k, n]) => `<button data-vista="${k}" class="${(S.opz.vista || 'tv') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="mctrl"><span>Velocità</span>${[1, 2, 4].map((x) => `<button data-vel="${x}" class="${x === 2 ? 'on' : ''}">×${x}</button>`).join('')}<button id="salta" class="salta">Salta ⏭</button></div>`;
  document.body.appendChild(v);
  const cron = $('#cronaca', v); let gh = 0, ga = 0, finito = false;
  const evs = eventiPartita(rep);
  const mod = rep.mod || S.tattica.mod;
  const miei = formazione().map((x) => x.p ? { num: x.p.num || '', nome: x.p.c } : { num: '', nome: '' });
  const ra = rng('rosa' + rep.avv.nome);
  const loro = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => ({ num: n, nome: pick(COGNOMI, ra) }));
  Suono.avviaFolla();
  const fine = () => {
    if (finito) return; finito = true; Suono.fermaFolla();
    setTimeout(() => {
      $('.mctrl', v).innerHTML = `<button class="btn largo" id="continua">Continua ›</button>`;
      $('#continua', v).onclick = () => { if (_partita) _partita.stop(); _partita = null; v.remove(); dopo && dopo(); };
    }, 300);
  };
  _partita = new Partita($('#campo', v), {
    casa: { c1: h.c1, c2: h.c2, mod: rep.casa ? mod : '4-4-2', giocatori: rep.casa ? miei : loro }, ospiti: { c1: a.c1, c2: a.c2, mod: rep.casa ? '4-4-2' : mod, giocatori: rep.casa ? loro : miei }, eventi: evs, durata: 90 + rep.rec, vista: S.opz.vista || 'tv',
    onEvento: (e, veloce) => {
      if (e.tipo === 'gol'){ if (e.lato === 0) gh++; else ga++; $('#gh', v).textContent = gh; $('#ga', v).textContent = ga;
        if (!veloce){ const g = $('#golbig', v); g.textContent = 'GOL!'; g.style.setProperty('--c', e.lato === 0 ? h.c1 : a.c1); g.classList.remove('via'); void g.offsetWidth; g.classList.add('via');
          Suono.boato(e.mio ? 1.2 : 0.6); if (e.mio) coriandoli([S.club.c1, S.club.c2, '#ffd43b', '#ffffff'], 90); if (navigator.vibrate && e.mio) navigator.vibrate([80, 40, 120]); } }
      if (!veloce){ if (e.tipo === 'inizio' || e.tipo === 'int') Suono.fischio(e.tipo === 'int' ? 2 : 1); if (e.tipo === 'fine') Suono.fischio(3); if (e.tipo === 'parata' || e.tipo === 'occ' || e.tipo === 'palo') Suono.ooh(); }
      const r = document.createElement('div'); r.className = 'cr ' + e.tipo + (e.mio ? ' mio' : '') + (e.lato === 1 ? ' osp' : '');
      r.innerHTML = `<span>${Math.min(Math.floor(e.min), 90 + rep.rec)}’</span><p>${{ gol: '⚽', giallo: '🟨', parata: '🧤', palo: '🥅', occ: '💨', inizio: '📣', int: '⏸️', fine: '🏁' }[e.tipo] || ''} ${esc(e.t)}</p>`;
      cron.prepend(r);
      if (e.tipo === 'fine') fine();
    },
    onFine: fine
  });
  const orologio = $('#orologio', v);
  const tick = () => { if (!_partita || !document.body.contains(v)) return; const m = Math.floor(_partita.min); orologio.textContent = (m > 90 ? '90+' + (m - 90) : m) + '’'; if (!_partita.fine) requestAnimationFrame(tick); else orologio.textContent = 'FINE'; };
  tick();
  v.querySelectorAll('[data-vel]').forEach((b) => b.onclick = () => { _partita.vel = +b.dataset.vel * 1; v.querySelectorAll('[data-vel]').forEach((x) => x.classList.toggle('on', x === b)); });
  v.querySelectorAll('[data-vista]').forEach((b) => b.onclick = () => { S.opz.vista = b.dataset.vista; _partita.vista = b.dataset.vista; salva(); v.querySelectorAll('[data-vista]').forEach((x) => x.classList.toggle('on', x === b)); if (_partita.fine) _partita.disegna(); });
  $('#salta', v).onclick = () => { _partita.salta(); orologio.textContent = 'FINE'; };
}
function calcPubblicoTesto(rep){ return rep.bil && rep.bil.spettatori ? rep.bil.spettatori.toLocaleString('it-IT') + ' spettatori' : ''; }

function mostraRisultati(rep, dopo){
  const d = S.lega.dati;
  const b = rep.bil;
  foglio(`<h2>${rep.esito === 'V' ? 'Vittoria! 🎉' : rep.esito === 'N' ? 'Pareggio' : 'Sconfitta'}</h2>${cartaRisultato(rep)}
  <div class="stat-p"><div><span>${rep.pos}%</span><small>Possesso</small><span>${100 - rep.pos}%</span></div><div class="barra2"><i style="width:${rep.pos}%;background:${S.club.c1}"></i></div>
  <div><span>${rep.tiri}</span><small>Tiri</small><span>${rep.tiriAvv}</span></div></div>
  <h3>Cassa della giornata</h3>
  <div class="bil">${b.biglietti ? `<div><span>🎟️ Biglietti (${b.spettatori.toLocaleString('it-IT')} spettatori)</span><b class="verde">+${euroBreve(b.biglietti)}</b></div>` : ''}${b.negozio ? `<div><span>🛍️ Bar e negozio</span><b class="verde">+${euroBreve(b.negozio)}</b></div>` : ''}<div><span>🤝 Sponsor</span><b class="verde">+${euroBreve(b.sponsor)}</b></div>${b.tv ? `<div><span>📺 Diritti TV</span><b class="verde">+${euroBreve(b.tv)}</b></div>` : ''}<div><span>👕 Stipendi giocatori</span><b class="rosso">−${euroBreve(b.stipendi)}</b></div>${b.staff ? `<div><span>📋 Stipendi staff</span><b class="rosso">−${euroBreve(b.staff)}</b></div>` : ''}<div><span>🔧 Manutenzione</span><b class="rosso">−${euroBreve(b.manut)}</b></div><div class="tot"><span>Totale</span><b class="${b.netto >= 0 ? 'verde' : 'rosso'}">${b.netto >= 0 ? '+' : ''}${euroBreve(b.netto)}</b></div></div>
  <h3>Gli altri risultati</h3><div class="altri">${rep.ris.map((x) => `<div class="${x.h === rep.mio || x.a === rep.mio ? 'io' : ''}"><span>${esc(x.nh)}</span><b>${x.gh} - ${x.ga}</b><span>${esc(x.na)}</span></div>`).join('')}</div>
  <h3>Classifica${rep.r + 1 >= giornateTot(rep.n || d.n) ? ' finale' : ''}</h3>${rep.tab ? tabellaHTML(rep.tab, { n: rep.n, tier: rep.tier }, true, 0, rep.mio) : tabellaHTML(ordina(d.squadre), d, true)}
  <div class="riga-btn"><button class="btn largo" data-a="chiudi">Continua</button></div>`, dopo);
}

function mostraFineStagione(p, dopo){
  const titolo = p.campione && p.vecchioTier === TOP ? 'CAMPIONI D’ITALIA!' : p.campione ? 'CAMPIONI!' : p.sale ? 'PROMOSSI!' : p.scende ? 'Retrocessi' : 'Stagione finita';
  const sotto = p.sale ? `La ${esc(S.club.nome)} sale in <b>${TIERS[p.nuovoTier - 1].nome}</b>` : p.scende ? `Si riparte dalla <b>${TIERS[p.nuovoTier - 1].nome}</b>. Niente paura!` : `Restate in <b>${TIERS[p.nuovoTier - 1].nome}</b>`;
  foglio(`<div class="fine-st ${p.sale || p.campione ? 'festa' : p.scende ? 'triste' : ''}"><div class="coppa">${p.campione ? '🏆' : p.sale ? '🚀' : p.scende ? '🌧️' : '📅'}</div><h1>${titolo}</h1><p>${sotto}</p>
  <div class="dati-g"><div><small>Posizione</small><b>${p.pos}°</b><small>su ${p.n}</small></div><div><small>Punti</small><b>${p.pt}</b></div><div><small>Premio</small><b>${euroBreve(p.premio)}</b></div></div>
  ${p.bomber ? `<p>⚽ Capocannoniere: <b>${esc(p.bomber)}</b></p>` : ''}
  <p class="tenue">Podio: ${p.top.map((n, i) => ['🥇', '🥈', '🥉'][i] + ' ' + esc(n)).join(' · ')}</p>
  ${p.giovani.length ? `<p>🧒 Dal settore giovanile: ${p.giovani.map(esc).join(', ')}</p>` : ''}
  ${p.ritirati.length ? `<p class="tenue">👏 Si ritirano: ${p.ritirati.map(esc).join(', ')}</p>` : ''}
  <button class="btn largo oro" data-a="chiudi">Inizia la stagione ${S.stagione}</button></div>`, dopo);
  if (p.sale || p.campione){ Suono.fanfara(); coriandoli([S.club.c1, S.club.c2, '#ffd43b', '#fff'], 200); setTimeout(() => coriandoli([S.club.c1, S.club.c2, '#ffd43b'], 160), 900); }
}

// ---------- menu ----------
function menu(){
  const on = window.Online && Online.loggato();
  const L = S.lega;
  foglio(`<div class="menu-top">${mioStemma(54)}<div><h2>${esc(S.club.nome)}</h2><p class="tenue">${esc(S.club.citta || '')} · stagione ${S.stagione} · ${TIERS[S.tier - 1].nome} · ${DIFFICOLTA[S.diff == null ? 2 : S.diff].ico} ${DIFFICOLTA[S.diff == null ? 2 : S.diff].nome}</p></div></div>
  <section class="menu-sez online-sez"><h3>🌍 Gioca online</h3>
    ${!on ? `<p>Entra con il tuo account (lo stesso del Gioco della Vita PM): la tua società viene salvata online e puoi entrare nei gironi con altre persone vere. Ogni persona che entra prende il posto di un bot.</p>
      <div class="riga-btn"><button class="btn" data-a="loginGoogle">Entra con Google</button><button class="btn sec" data-a="loginEmail">Entra con email</button></div>`
    : `<p>Sei dentro come <b>${esc(Online.nome())}</b>. La tua società si salva online da sola.</p>
      ${L.online ? `<p>🟢 Stai giocando nel girone online <b>${esc(L.dati.nome)}</b> di ${TIERS[L.dati.tier - 1].nome}.</p><div class="riga-btn"><button class="btn sec" data-a="esciOnline">Torna a giocare da solo</button></div>`
        : `<p>Adesso giochi da solo contro i bot.</p><div class="riga-btn"><button class="btn oro" data-a="vaiOnline">Entra in un girone online</button></div><p class="nota">La stagione ricomincia in un girone di ${TIERS[S.tier - 1].nome} con altre persone vere: prendi il posto di un bot, con i suoi punti.</p>`}
      <div class="riga-btn"><button class="link" data-a="logout">Esci dall’account</button></div>`}
    ${window.Online && Online.errore() ? `<p class="rosso">${esc(Online.errore())}</p>` : ''}
  </section>
  <section class="menu-sez"><button class="riga-menu oro" data-a="codice">${S.codice ? '🪄 Pannello segreto' : '🔑 Aggiungi codice'}</button><button class="riga-menu" data-a="modClub">🎨 Cambia nome, colori e stemma</button>
  <button class="riga-menu" data-a="comeSiGioca">❓ Come si gioca</button>
  <button class="riga-menu" data-a="suono">${S.opz.suono ? '🔊 Suoni attivi' : '🔇 Suoni spenti'}</button>
  <button class="riga-menu" data-a="installa">📲 Metti l’app sul telefono</button>
  <button class="riga-menu rosso" data-a="ricomincia">🗑️ Ricomincia da capo</button></section>
  <p class="nota centro">Calciomania PM · gratis, senza pubblicità · <a href="../">sito</a></p>`);
}
function comeSiGioca(){
  foglio(`<h2>Come si gioca</h2><div class="guida">
  <p><b>1. Sei il presidente.</b> Fondi la tua società in Terza Categoria con 1.000.000 €.</p>
  <p><b>2. Ingaggia.</b> Prendi un allenatore e almeno 11 giocatori (con un portiere). Lo staff ti aiuta: preparatore, medico, osservatore…</p>
  <p><b>3. Sistema lo stadio.</b> Più posti, campo in erba, luci, negozio. Ogni tanto restauralo: le partite lo rovinano.</p>
  <p><b>4. Gioca le giornate.</b> Guardi la partita in diretta. Vincere porta tifosi, morale e soldi.</p>
  <p><b>5. Sali di categoria.</b> I primi due salgono, gli ultimi due scendono: Terza, Seconda, Prima Categoria, Promozione, Eccellenza, Serie D, C, B e Serie A!</p>
  <p><b>6. Online.</b> Nel girone ci sei tu e tanti bot 🤖. Quando entra una persona vera 👤 il bot se ne va e lei prende il suo posto. In Serie A, quando sono tutti persone vere, la classifica si allunga.</p>
  <p><b>Soldi:</b> entrano con biglietti, negozio, sponsor, TV e premi a fine stagione. Escono con stipendi e manutenzione. Non andare in rosso!</p></div>
  <button class="btn largo" data-a="chiudi">Ho capito</button>`);
}

// ---------- fondazione ----------
let bozza = null;
function schermataIniziale(){
  const c = carica();
  $('#app').innerHTML = `<div class="intro"><div class="intro-luci"></div><div class="intro-c">
    <div class="intro-logo">${stemmaSVG({ c1: '#0b3d2e', c2: '#f5c542', st: 2, pat: 4, sim: 1 }, 110, 'PM')}</div>
    <h1>CALCIOMANIA<span>PM</span></h1><p>Fonda la tua squadra di calcio.<br>Dalla Terza Categoria alla Serie A.</p>
    ${c ? `<button class="btn largo oro" data-a="continua">▶ Continua con ${esc(c.club.nome)}</button>` : ''}
    <button class="btn largo ${c ? 'sec' : 'oro'}" data-a="fonda">${c ? 'Fonda una nuova società' : '⚽ Fonda la tua società'}</button>
    <button class="link" data-a="introLogin">Hai già giocato su un altro telefono? Entra nel tuo account</button>
  </div></div>`;
}
function fondazione(modifica){
  const r = RND;
  bozza = modifica ? Object.assign({}, S.club) : Object.assign({ nome: '', citta: '' }, stemmaCasuale(r));
  if (!modifica){ bozza.c1 = '#1e3a8a'; bozza.c2 = '#facc15'; bozza.st = 0; bozza.pat = 1; bozza.sim = 0; bozza.diff = 1; }
  const html = () => `<div class="fonda"><h1>${modifica ? 'La tua società' : 'Fonda la tua società'}</h1>
    <div class="anteprima" id="ant">${stemmaSVG(bozza, 120, bozza.nome || 'PM')}<b>${esc(bozza.nome || 'Nome della squadra')}</b></div>
    <label>Nome della squadra<input id="fNome" maxlength="28" placeholder="es. Real Borgoverde" value="${esc(bozza.nome)}"></label>
    <label>Città<input id="fCitta" maxlength="24" placeholder="es. Borgoverde" value="${esc(bozza.citta)}"></label>
    ${modifica ? '' : `<div class="scelta"><span>Difficoltà</span><div class="diff">${DIFFICOLTA.map((x, i) => `<button class="${bozza.diff === i ? 'on' : ''}" data-a="fopz" data-k="diff" data-v="${i}"><b>${x.ico}</b><span>${x.nome}</span></button>`).join('')}</div><p class="nota">${DIFFICOLTA[bozza.diff].desc}</p></div>`}
    <div class="scelta"><span>Colore 1</span><div class="colori">${COLORI.map((c) => `<button class="col ${bozza.c1 === c ? 'on' : ''}" style="--c:${c}" data-a="fcol" data-k="c1" data-v="${c}" aria-label="colore"></button>`).join('')}</div></div>
    <div class="scelta"><span>Colore 2</span><div class="colori">${COLORI.map((c) => `<button class="col ${bozza.c2 === c ? 'on' : ''}" style="--c:${c}" data-a="fcol" data-k="c2" data-v="${c}" aria-label="colore"></button>`).join('')}</div></div>
    <div class="scelta"><span>Forma</span><div class="opz">${[0, 1, 2, 3].map((i) => `<button class="${bozza.st === i ? 'on' : ''}" data-a="fopz" data-k="st" data-v="${i}">${stemmaSVG(Object.assign({}, bozza, { st: i, sim: 6 }), 30, ' ')}</button>`).join('')}</div></div>
    <div class="scelta"><span>Disegno</span><div class="opz">${[0, 1, 2, 3, 4].map((i) => `<button class="${bozza.pat === i ? 'on' : ''}" data-a="fopz" data-k="pat" data-v="${i}">${stemmaSVG(Object.assign({}, bozza, { pat: i, sim: 6 }), 30, ' ')}</button>`).join('')}</div></div>
    <div class="scelta"><span>Simbolo</span><div class="opz">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<button class="${bozza.sim === i ? 'on' : ''}" data-a="fopz" data-k="sim" data-v="${i}">${stemmaSVG(Object.assign({}, bozza, { sim: i }), 30, bozza.nome || 'PM')}</button>`).join('')}</div></div>
    <button class="btn largo oro" data-a="${modifica ? 'salvaClub' : 'creaClub'}">${modifica ? 'Salva' : 'Fonda la società · 1.000.000 €'}</button>
    ${modifica ? '<button class="btn largo sec" data-a="annullaClub">Annulla</button>' : '<button class="link" data-a="indietroIntro">‹ Indietro</button>'}</div>`;
  const draw = () => { const n = $('#fNome'), c = $('#fCitta'); if (n){ bozza.nome = n.value; bozza.citta = c.value; } $('#app').innerHTML = html(); const nn = $('#fNome'); nn.addEventListener('input', () => { bozza.nome = nn.value; $('#ant').innerHTML = stemmaSVG(bozza, 120, bozza.nome || 'PM') + `<b>${esc(bozza.nome || 'Nome della squadra')}</b>`; }); $('#fCitta').addEventListener('input', (e) => { bozza.citta = e.target.value; }); };
  fondazione.draw = draw; draw(); window.scrollTo(0, 0);
}

// ---------- conto alla rovescia online ----------
let _contoT = 0;
function avviaContoAllaRovescia(){
  clearInterval(_contoT);
  const el = $('#conto'); if (!el) return;
  const f = () => {
    const t = +el.dataset.t; const s = Math.max(0, Math.round((t - Date.now()) / 1000));
    el.textContent = s > 0 ? 'fra ' + (s >= 3600 ? Math.floor(s / 3600) + ' h ' : '') + Math.floor(s % 3600 / 60) + ' min' : 'adesso';
    if (s <= 0 && S.lega.online && !_occupato){ clearInterval(_contoT); const me = S.lega.dati.squadre[S.lega.mio]; if (me && me.pronto === S.lega.dati.giornata) gioca(); }
  };
  f(); _contoT = setInterval(f, 15000);
}

document.addEventListener('change', (e) => { if (e.target && e.target.id === 'nomeStadio' && S){ S.stadio.design = Object.assign({}, S.stadio.design || {}, { nome: e.target.value.trim().slice(0, 30) }); salva(); disegna(); } });
// ---------- tocchi ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, v = b.dataset.v;
  Suono.init();
  switch (a){
    case 'vai': schermo = v; if (b.dataset.sub) sottoschermo[v] = b.dataset.sub; if (b.dataset.ruolo !== undefined) sottoschermo.ruolo = b.dataset.ruolo; chiudiFoglio(true); disegna(); window.scrollTo(0, 0); break;
    case 'sub': sottoschermo[b.dataset.s] = v; disegna(); break;
    case 'ruolo': sottoschermo.ruolo = v; disegna(); break;
    case 'gioca': gioca(); break;
    case 'menu': menu(); break;
    case 'chiudi': chiudiFoglio(); break;
    case 'giocatore': schedaGiocatore(b.dataset.id); break;
    case 'compra': compra(b.dataset.id); if ($('#velo')) chiudiFoglio(true); break;
    case 'vendi': if (confirm('Vuoi davvero venderlo?')) vendi(b.dataset.id); break;
    case 'ingaggia': ingaggia(b.dataset.id); break;
    case 'licenzia': if (confirm('Vuoi davvero licenziarlo?')) licenzia(b.dataset.k); break;
    case 'squadraPronta': squadraPronta(); break;
    case 'ricerca': { const c = costoRicerca(); if (S.soldi < c) return avviso('Non hai abbastanza soldi'); S.soldi -= c; genMercato(); salva(); disegna(); avviso('Nuovi giocatori al mercato!'); break; }
    case 'costruisci': costruisci(b.dataset.k); break;
    case 'restaura': restaura(); break;
    case 'modulo': S.tattica.mod = v; S.tattica.tit = null; aggiornaMioSlot(); salva(); disegna(); break;
    case 'ment': S.tattica.ment = +v; aggiornaMioSlot(); salva(); disegna(); break;
    case 'autoForm': S.tattica.tit = null; aggiornaMioSlot(); salva(); disegna(); break;
    case 'slot': sceltaSlot(+b.dataset.k); break;
    case 'metti': metti(+b.dataset.k, b.dataset.id); break;
    case 'rivedi': if (S.ultima){ const rep = S.ultima; chiudiFoglio(true); mostraPartita(rep, () => { disegna(); mostraPendenti(); }); } break;
    case 'codice': chiediCodice(); break;
    case 'segreto': segreto(v); break;
    case 'apriProgetto': sottoschermo.progetto = !sottoschermo.progetto; disegna(); break;
    case 'design': { S.stadio.design = Object.assign({}, S.stadio.design || {}); const k = b.dataset.k; S.stadio.design[k] = ['forma'].includes(k) ? +v : ['scritta', 'bandiere', 'fumogeni', 'notte'].includes(k) ? v === '1' : v; salva(); disegna(); break; }
    case 'suono': S.opz.suono = !S.opz.suono; Suono.on = S.opz.suono; salva(); menu(); break;
    case 'comeSiGioca': comeSiGioca(); break;
    case 'installa': foglio(`<h2>Metti l’app sul telefono</h2><div class="guida"><p><b>Android (Chrome):</b> tocca i tre puntini in alto a destra e poi «Installa app» o «Aggiungi a schermata Home».</p><p><b>iPhone (Safari):</b> tocca il quadrato con la freccia in basso e poi «Aggiungi alla schermata Home».</p><p>Così Calciomania PM si apre come una vera app, a schermo intero.</p></div><button class="btn largo" data-a="chiudi">Ok</button>`); break;
    case 'ricomincia': if (confirm('Vuoi cancellare la tua società e ricominciare da capo?')){ if (S.lega.online && window.Online) Online.esci().catch(() => {}); localStorage.removeItem(CHIAVE); S = null; chiudiFoglio(true); schermataIniziale(); } break;
    case 'modClub': chiudiFoglio(true); fondazione(true); break;
    case 'continua': S = carica(); migra(); Suono.on = S.opz.suono; schermo = 'casa'; disegna(); if (S.lega.online && window.Online) Online.riprendi(); mostraPendenti(); break;
    case 'fonda': fondazione(false); break;
    case 'indietroIntro': schermataIniziale(); break;
    case 'fcol': bozza[b.dataset.k] = v; fondazione.draw(); break;
    case 'fopz': bozza[b.dataset.k] = +v; fondazione.draw(); break;
    case 'creaClub': { bozza.nome = ($('#fNome').value || '').trim(); bozza.citta = ($('#fCitta').value || '').trim(); if (bozza.nome.length < 2) return avviso('Scrivi il nome della squadra'); nuovaSocieta(Object.assign({}, bozza)); schermo = 'casa'; disegna(); coriandoli([bozza.c1, bozza.c2, '#ffd43b'], 160); Suono.fanfara(); setTimeout(comeSiGioca, 900); break; }
    case 'salvaClub': { bozza.nome = ($('#fNome').value || '').trim(); bozza.citta = ($('#fCitta').value || '').trim(); if (bozza.nome.length < 2) return avviso('Scrivi il nome della squadra'); S.club = Object.assign({}, bozza); aggiornaMioSlot(); if (S.lega.online && window.Online) Online.aggiornaSquadra(mioSlot()); salva(); disegna(); break; }
    case 'annullaClub': disegna(); break;
    case 'loginGoogle': caricaOnline().then(() => Online.loginGoogle()).catch((er) => avviso(er.message || 'Non riesco ad entrare')); break;
    case 'loginEmail': case 'introLogin': caricaOnline().then(() => Online.finestraLogin()).catch((er) => avviso(er.message || 'Non riesco a collegarmi')); break;
    case 'logout': if (S.lega.online) return avviso('Prima torna a giocare da solo'); Online.logout(); chiudiFoglio(true); disegna(); avviso('Sei uscito dall’account'); break;
    case 'vaiOnline': if (confirm('La stagione in corso ricomincia in un girone online. Va bene?')){ chiudiFoglio(true); Online.vaiOnline(); } break;
    case 'esciOnline': if (confirm('Vuoi lasciare il girone online? Il tuo posto torna a un bot.')){ chiudiFoglio(true); Online.esci().then(() => { nuovaLegaLocale(S.tier); salva(true); disegna(); avviso('Ora giochi da solo'); }).catch((er) => avviso(er.message || 'Errore')); } break;
  }
});

function migra(){
  if (!S) return;
  S.pendenti = S.pendenti || []; S.opz = S.opz || { suono: true }; S.soldiStoria = S.soldiStoria || [S.soldi];
}

// ---------- caricamento online (Firebase solo quando serve) ----------
let _onlineP = null;
function caricaOnline(){
  if (window.Online && Online.pronto_) return Promise.resolve();
  if (_onlineP) return _onlineP;
  const s = (src) => new Promise((ok, ko) => { const x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = () => ko(new Error('Niente internet: riprova')); document.head.appendChild(x); });
  _onlineP = s('fb/firebase-app-compat.js').then(() => Promise.all([s('fb/firebase-auth-compat.js'), s('fb/firebase-firestore-compat.js')])).then(() => s('js/online.js')).then(() => Online.init()).catch((e) => { _onlineP = null; throw e; });
  return _onlineP;
}

// ---------- avvio ----------
window.addEventListener('load', () => {
  const c = carica();
  if (c && c.club){ S = c; migra(); Suono.on = S.opz.suono; disegna(); mostraPendenti(); }
  else schermataIniziale();
  // se c'era un account, ricollegalo in silenzio
  try { if (localStorage.getItem('presidentepm-acc')) caricaOnline().catch(() => {}); } catch (e) {}
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
