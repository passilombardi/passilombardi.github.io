/* =========================================================
   CALCIOMANIA PM — IL CUORE DEL GIOCO
   Stato della partita, salvataggi, società, formazione e forza, giornate,
   fine stagione, finestre, menu, fondazione del club, tocchi e avvio.
   Le schermate sono in schermi.js, la partita in diretta in partita.js.
   ========================================================= */
'use strict';

const CHIAVE = 'presidentepm-v1';
const VERSIONE_DATI = 2;
let S = null;              // lo stato della partita
let schermo = 'home';
let sottoschermo = {};     // tab interne e filtri delle schermate
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const mioId = () => (S && S.lega && S.lega.online && window.Online && Online.uid()) || 'me';

// ---------- salvataggio ----------
let _salvaT = 0;
function salva(subito){
  if (!S) return;
  S.agg = Date.now();
  if (S.ospite) return;            // come ospite la partita non si salva
  clearTimeout(_salvaT);
  const f = () => { try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch (e) {} if (window.Online && Online.loggato()) Online.salvaCloud(S); };
  if (subito) f(); else _salvaT = setTimeout(f, 400);
}
function carica(){ try { const t = localStorage.getItem(CHIAVE); const c = t ? JSON.parse(t) : null; return c && c.club ? c : null; } catch (e) { return null; } }
// salvataggi manuali (3 slot) e copia automatica a inizio stagione
const SLOT_K = (i) => 'calciomania-slot-' + i;
function leggiSlot(i){ try { const t = localStorage.getItem(SLOT_K(i)); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function scriviSlot(i){ try { localStorage.setItem(SLOT_K(i), JSON.stringify({ t: Date.now(), nome: S.club.nome, st: S.stagione, tier: S.tier, g: S.lega ? S.lega.giocate : 0, dati: S })); return true; } catch (e) { return false; } }
function codiceDi(stato){ return btoa(unescape(encodeURIComponent(JSON.stringify(stato)))); }
function daCodice(t){ try { const s = JSON.parse(decodeURIComponent(escape(atob(String(t).trim().replace(/\s+/g, ''))))); return s && s.club && s.rosa ? s : null; } catch (e) { return null; } }

// ---------- notizie ----------
function notizia(testo, tipo = 'societa', giornale){
  if (!TIPI_NOTIZIA[tipo]) tipo = VECCHI_ICO[tipo] || 'societa';
  S.notizie.unshift({ t: testo, tipo, gio: giornale || pick(GIORNALI), s: S.stagione, g: S.lega ? S.lega.giocate : 0 });
  S.notizie = S.notizie.slice(0, 60);
}

// ---------- nuova società ----------
const SPONSOR_A = ['Pizzeria','Latteria','Ferramenta','Autofficina','Panificio','Gelateria','Trasporti','Costruzioni','Assicurazioni','Energia','Banca','Telefonia','Supermercati','Compagnia aerea'];
function nuovoSponsor(tier){
  const r = RND, a = tier <= 3 ? SPONSOR_A.slice(0, 8) : tier <= 6 ? SPONSOR_A.slice(4, 12) : SPONSOR_A.slice(8);
  return { nome: pick(a, r) + ' ' + nomePaese(r), val: tondo(TIERS[tier - 1].sponsor * (0.9 + r() * 0.25)) };
}
function nuovaSocieta(club){
  const ospite = !!club.ospite; delete club.ospite;
  S = {
    v: VERSIONE_DATI, club, diff: club.diff == null ? 1 : club.diff, soldi: SOLDI_INIZIO, stagione: 1, tier: 1,
    rosa: [], staff: {}, stadio: { tribune: 0, campo: 0, spogl: 0, luci: 0, negozio: 0, giov: 0, maxi: 0, park: 0, centro: 0, usura: 92, cantieri: [], design: club.stadio ? { nome: club.stadio } : {} },
    tattica: { mod: '4-4-2', ment: 2, stile: 'equi', press: 1, linea: 1, tit: null, ist: {} }, morale: 70, tifosi: 80,
    lega: null, mercato: { lista: [], agg: -99 }, svincolati: [], staffMercato: { lista: [], s: 0 }, sponsor: nuovoSponsor(1),
    notizie: [], storico: [], trofei: [], giornate: 0, bilancio: null, ultima: null, soldiStoria: [SOLDI_INIZIO], pendenti: [],
    opz: { suono: true, vel: 2 }, allen: allenDefault(), prezzi: { bigl: 1, abb: 1 }, conti: {}, movimenti: [], intesa: 50, prep: 50,
    giovanili: [], scoutGiov: [], debiti: [], offerte: [], inPrestito: [], creato: Date.now(), agg: Date.now(), ospite
  };
  delete S.club.stadio;
  nuovaLegaLocale(1);
  genMercato(); genStaffMercato();
  for (let k = 0; k < 4; k++) S.giovanili.push(nuovoGiovane(1));
  notizia(`È nata la ${club.nome}! Il comune di ${club.citta || 'casa tua'} festeggia. Hai ${euro(SOLDI_INIZIO)} per costruire la squadra.`, 'societa');
  notizia(`Primo sponsor: ${S.sponsor.nome}, ${euro(S.sponsor.val)} a giornata.`, 'societa');
  notizia(`Nella ${nomePrimavera()} ci sono già 4 ragazzi: falli crescere!`, 'giovani');
  salva(true);
}
function mioSlot(){
  return Object.assign({ tipo: 'umano', uid: mioId(), nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim, forza: forzaMia(), campo: S.stadio.campo, mod: S.tattica.mod, visto: Date.now() });
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
  Object.assign(s, { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim, forza: forzaMia(), campo: S.stadio.campo, mod: S.tattica.mod });
}

// ---------- formazione e forza ----------
function slotRuoli(){ return ruoliDi(S.tattica.mod); }
function effInRuolo(p, ruolo){ let v = efficienza(p); if (p.r !== ruolo) v *= (ruolo === 'P' || p.r === 'P') ? 0.4 : 0.78; return v; }
function formazione(){
  const ruoli = slotRuoli();
  const disp = S.rosa.filter(disponibile);
  const usati = new Set();
  const out = ruoli.map(() => null);
  if (S.tattica.tit && S.tattica.tit.length === ruoli.length){
    S.tattica.tit.forEach((id, k) => { const p = disp.find((x) => x.id === id); if (p && !usati.has(p.id)){ out[k] = p; usati.add(p.id); } });
  }
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
// forza di una formazione: bravura in ruolo, energia, staff, morale, intesa, preparazione e tattica
function forzaDa(f){
  const media = (r) => { const a = f.filter((x) => x.ruolo === r); return a.reduce((s, x) => s + (x.p ? effInRuolo(x.p, r) * (x.en == null ? 1 : 0.8 + 0.2 * x.en / 100) : 6), 0) / Math.max(1, a.length); };
  const T = S.tattica, m = (T.ment == null ? 2 : T.ment) - 2, press = T.press == null ? 1 : T.press, linea = T.linea == null ? 1 : T.linea;
  const coach = S.staff.all && S.staff.all.mod === T.mod ? 1.5 : 0;
  const bonus = (trucco('super') ? 30 : 0) + livStaff(S, 'all') * 1.8 + livStaff(S, 'vice') * 0.5 + (S.morale - 60) / 8 + S.stadio.spogl * 0.4 - (S.staff.all ? 0 : 6)
    + ((S.intesa == null ? 50 : S.intesa) - 50) / 12 + ((S.prep == null ? 50 : S.prep) - 50) / 20 + coach;
  const st = { equi: [0, 0, 0], poss: [0, 2, -0.5], contro: [1.5, -1.5, 1], lanci: [0, -2, 1.5] }[T.stile || 'equi'] || [0, 0, 0];
  const k = (v) => Math.round(v * 10) / 10;
  return { por: k(media('P') + livStaff(S, 'por') * 1.5 + bonus), dif: k(media('D') + bonus - m * 1.5 + st[0] + (1 - linea)), cen: k(media('C') + bonus + st[1] + (press - 1) * 1.5), att: k(media('A') + bonus + m * 1.5 + st[2] + (linea - 1)) };
}
const forzaMia = () => forzaDa(formazione());
const forzaTot = (f) => Math.round((f.por + f.dif * 1.4 + f.cen * 1.3 + f.att * 1.3) / 5);
function problemiPerGiocare(){
  const pr = [];
  const sani = S.rosa.filter(disponibile);
  if (!S.staff.all) pr.push({ t: 'Ingaggia un allenatore', vai: 'mercato', sub: 'staff' });
  if (sani.length < 11) pr.push({ t: `Ti servono almeno 11 giocatori disponibili (ne hai ${sani.length})`, vai: 'mercato', sub: 'cerca' });
  if (!sani.some((p) => p.r === 'P')) pr.push({ t: 'Ti serve un portiere', vai: 'mercato', sub: 'cerca', ruolo: 'P' });
  return pr;
}

// ---------- mercato ----------
const soldiDiff = () => (S.lega && S.lega.online) ? 1 : DIFFICOLTA[S.diff == null ? 2 : S.diff].soldi;
const trucco = (k) => !!(S && S.trucchi && S.trucchi[k] && !(S.lega && S.lega.online));
const prezzoVendita = (p) => tondo(p.prezzo * (0.7 + livStaff(S, 'ds') * 0.04));
function genStaffMercato(){
  const L = [];
  STAFF.forEach((s) => { for (let l = 1; l <= 5; l++) L.push(nuovoStaff(s.k, l)); });
  S.staffMercato = { lista: L, s: S.stagione };
}
function listaCampioni(){ const presi = new Set(S.campioniPresi || []); return CAMPIONI.map((c, k) => campioneDa(k, S.stagione)).filter((p) => !presi.has(p.id) && p.eta <= 38).sort((a, b) => b.val - a.val); }
const inVendita = (id) => trovaInMercato(id);
const costoRicerca = () => tondo(Math.max(1500, TIERS[S.tier - 1].sponsor * 0.8));
// vendita veloce: un club compra subito, ma paga meno che con un'offerta vera
function vendi(id){
  const p = S.rosa.find((x) => x.id === id); if (!p) return;
  if (p.prestito) return avviso('È in prestito: a fine stagione torna alla sua squadra');
  const v = prezzoVendita(p);
  movimento('cessioni', v, 'Cessione di ' + nomeG(p));
  togliDallaRosa(p);
  S.offerte = (S.offerte || []).filter((o) => o.pid !== id);
  notizia(`${p.n} ${p.c} è stato venduto per ${euro(v)}.`, 'mercato');
  Suono.cassa(); aggiornaMioSlot(); salva(); chiudiFoglio(true); disegna();
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
  movimento('acquisti', -costo, 'Ingaggio di ' + s.nome);
  S.staff[s.k] = s; S.staffMercato.lista = S.staffMercato.lista.filter((x) => x !== s);
  const nome = STAFF.find((x) => x.k === s.k).nome;
  notizia(`${nome}: arriva ${s.nome} (${'★'.repeat(s.liv)}).${vecchio ? ' Saluta ' + vecchio.nome + '.' : ''}`, 'mercato');
  Suono.cassa(); aggiornaMioSlot(); salva(); chiudiFoglio(true); disegna(); avviso(`${s.nome} è il tuo ${nome.toLowerCase()}!`);
}
function licenzia(k){ const s = S.staff[k]; if (!s) return; const buon = trucco('gratis') ? 0 : s.stip * 4; if (buon) movimento('staff', -buon, 'Buonuscita di ' + s.nome); delete S.staff[k]; notizia(`${s.nome} lascia la società${buon ? ' con una buonuscita di ' + euro(buon) : ''}.`, 'mercato'); aggiornaMioSlot(); salva(); disegna(); }

// Squadra pronta: compra in un colpo i giocatori che mancano e un allenatore
function squadraPronta(){
  const t = S.tier, budget = Math.min(S.soldi * 0.45, 2000000 * Math.pow(2.1, t - 1));
  const serve = { P: 2, D: 6, C: 6, A: 4 };
  S.rosa.forEach((p) => { if (serve[p.r] > 0) serve[p.r]--; });
  const lista = []; Object.entries(serve).forEach(([r, n]) => { for (let i = 0; i < n; i++) lista.push(r); });
  if (!lista.length && S.staff.all) return avviso('La squadra è già completa');
  let spesa = 0; const presi = [];
  const per = budget / Math.max(1, lista.length);
  const prezzo = (p) => trucco('gratis') ? 0 : tondo(p.prezzo * (1 - livStaff(S, 'ds') * 0.04));
  lista.forEach((r) => {
    let bonus = 6; let p;
    for (let k = 0; k < 12; k++){ p = nuovoGiocatore(t, { ruolo: r, bonus, spread: 2 }); if (prezzo(p) <= per) break; bonus -= 2; }
    const c = prezzo(p);
    if (spesa + c <= budget && S.soldi - spesa - c > 0 && S.rosa.length + presi.length < 30){ spesa += c; presi.push(p); }
  });
  presi.forEach((p) => { p.num = numeroLibero(p.r); p.contr = ri(2, 3); S.rosa.push(p); });
  movimento('acquisti', -spesa, 'Squadra pronta (' + presi.length + ' giocatori)');
  if (!S.staff.all){ const liv = Math.min(5, 1 + Math.floor(t / 2)); const all = nuovoStaff('all', liv); if (S.soldi > all.ingaggio){ movimento('acquisti', -all.ingaggio, 'Ingaggio di ' + all.nome); S.staff.all = all; notizia(`Allenatore: arriva ${all.nome} (${'★'.repeat(liv)}).`, 'mercato'); } }
  notizia(`Squadra pronta! Arrivano ${presi.length} giocatori per ${euro(spesa)}.`, 'mercato');
  Suono.cassa(); aggiornaMioSlot(); salva(); disegna(); avviso(`Arrivati ${presi.length} giocatori!`);
}

// ---------- stadio ----------
function costoLavoro(k, liv){ const c = STADIO_K[k].costi[liv]; return trucco('gratis') ? 0 : S.scontoLavori && S.scontoLavori.fino >= S.giornate ? Math.round(c / 2) : c; }
function costruisci(k){
  const s = STADIO_K[k], liv = S.stadio[k] + 1;
  if (liv >= s.costi.length) return;
  if (S.stadio.cantieri.some((c) => c.k === k)) return avviso('Ci sono già i lavori in corso');
  const c = costoLavoro(k, liv);
  if (S.soldi < c) return avviso('Non hai abbastanza soldi');
  if (c < s.costi[liv] && !trucco('gratis')) delete S.scontoLavori;
  movimento('lavori', -c, s.nome + ': ' + s.livelli[liv]);
  S.stadio.cantieri.push({ k, liv, fine: S.giornate + (trucco('gratis') ? 0 : s.tempi[liv]) });
  if (trucco('gratis')){ S.stadio[k] = liv; S.stadio.cantieri = S.stadio.cantieri.filter((x) => x.k !== k); }
  notizia(`Iniziati i lavori: ${s.nome} → ${s.livelli[liv]} (${s.tempi[liv]} giornat${s.tempi[liv] === 1 ? 'a' : 'e'}).`, 'stadio');
  Suono.cassa(); salva(); disegna();
}
function restaura(){
  const c = trucco('gratis') ? 0 : costoRestauro(S);
  if (S.stadio.usura >= 99) return avviso('Lo stadio è già come nuovo');
  if (S.soldi < c) return avviso('Non hai abbastanza soldi');
  movimento('manutenzione', -c, 'Restauro dello stadio'); S.stadio.usura = 100;
  notizia(`Stadio restaurato: erba, sedili e vernice come nuovi (${euro(c)}).`, 'stadio');
  Suono.cassa(); salva(); disegna();
}
// pubblico: tifosi, morale, servizi dello stadio, prezzo del biglietto e abbonati
function calcPubblico(casuale = true){
  const st = S.stadio, posti = postiStadio(S), abb = Math.min(S.abbS === S.stagione ? (S.abbonati || 0) : 0, posti);
  let b = S.tifosi * (0.55 + S.morale / 220) * (1 + st.luci * 0.08 + st.park * 0.06 + st.maxi * 0.07) * (st.usura < 60 ? 0.75 : 1) * Math.pow(1 / prezziDi().bigl, 0.9);
  if (S.menoPubblico && S.menoPubblico > S.giornate) b *= 0.7;
  if (casuale) b *= 0.9 + RND() * 0.2;
  const paganti = clamp(Math.round(b - abb * 0.5), 0, posti - abb);
  return Math.max(20, abb + paganti);
}
const tettoTifosi = (t) => Math.round(TIERS[t - 1].pubblico * 2.6 * (1 + S.trofei.length * 0.08 + S.stadio.maxi * 0.1));
const spesaNegozio = () => [0, 2, 4, 7, 12][S.stadio.negozio] * (1 + (S.tier - 1) * 0.2);
const stipendiGiocatori = () => trucco('noStip') ? 0 : S.rosa.reduce((s, p) => s + p.stip, 0);
const stipendiStaff = () => trucco('noStip') ? 0 : Object.values(S.staff).reduce((s, x) => s + x.stip, 0);
const manutenzione = () => tondo(STADIO.reduce((s, x) => s + x.costi[S.stadio[x.k] || 0], 0) * 0.0015 + 100);

// ---------- giocare ----------
let _occupato = false;
async function gioca(veloce){
  if (_occupato) return;
  const pr = problemiPerGiocare();
  if (pr.length) return avviso(pr[0].t);
  Suono.init();
  if (!S.obiettivi || S.obiettivi.s !== S.stagione) nuoviObiettivi();
  preparaCoppe();
  if (S.abbS !== S.stagione){ S.abbS = S.stagione; vendiAbbonamenti(); }
  aggiornaMioSlot();
  if (S.lega.online){
    if (!window.Online || !Online.loggato()) return avviso('Entra nel tuo account per giocare online');
    _occupato = true; disegna();
    try { const r = await Online.pronto(mioSlot()); if (!r.giocata){ avviso('Sei pronto! Aspettiamo gli altri presidenti.'); } }
    catch (e) { avviso('Non riesco a collegarmi: ' + (e.message || e)); }
    _occupato = false; disegna();
    return;
  }
  if (veloce){ const D = nuovaDiretta(); if (!D) return; finisciDiretta(D); chiudiDiretta(D); Dir = null; sincronizza(false, true); return; }
  giocaInDiretta();
}

// Allinea la tua carriera con il girone: applica le giornate giocate, chiude la stagione, mostra la partita.
function sincronizza(live, giaVista){
  const L = S.lega, d = L.dati; if (!d) return;
  let ultima = null, fine = null;
  if (d.stagione > L.stagione){
    if (d.prev && d.prev.stagione === L.stagione){
      const nomi = (i) => d.prev.tab.find((t) => t.i === i);
      for (let r = L.giocate; r < giornateTot(d.prev.n); r++){ if (d.prev.ris[r]){ ultima = applicaGiornata(d.prev.ris[r], r, nomi, d.prev.n, d.prev.tier) || ultima; if (!L.online) turnoCoppe(r); } }
      if (ultima) Object.assign(ultima, { tab: d.prev.tab.map(rigaMini), mio: L.mio, tier: d.prev.tier, n: d.prev.n });
      fine = fineStagione(d.prev);
    } else { L.stagione = d.stagione; L.giocate = 0; }
  } else {
    const nomi = (i) => d.squadre[i];
    for (let r = L.giocate; r < d.giornata; r++){ if (d.ris[r]){ ultima = applicaGiornata(d.ris[r], r, nomi, d.n, d.tier) || ultima; if (!L.online) turnoCoppe(r); } }
    if (ultima) Object.assign(ultima, { tab: ordina(d.squadre).map(rigaMini), mio: L.mio, tier: d.tier, n: d.n });
  }
  S._live = null;
  if (fine){ S.pendenti.push(fine); if (fine.livello) S.pendenti.push(Object.assign({ tipo: 'livello' }, fine.livello)); }
  salva(true);
  if (ultima && giaVista){ dopoPartita(ultima); }
  else if (ultima && live){ mostraPartita(ultima, () => dopoPartita(ultima)); }
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
  const live = S._live && S._live.r === r && S._live.s === L.stagione ? S._live : null;
  const f = formazione();
  const tit = f.filter((x) => x.p).map((x) => x.p);
  const esito = gf > gs ? 'V' : gf < gs ? 'P' : 'N';
  // squalifiche scontate e infortuni che passano
  S.rosa.forEach((p) => { if (p.inf > 0) p.inf--; if (p.squal > 0) p.squal--; });
  // marcatori, cartellini e voti
  let marcatori, marcAvv, voti = {}, motm = '', cart = [];
  const giocato = new Set(live ? live.giocato : tit.map((p) => p.id));
  const infortunati = [];
  if (live){
    marcatori = live.marc; marcAvv = live.marcAvv; motm = live.motmNome;
    Object.entries(live.voti).forEach(([id, x]) => { if (x.mio) voti[id] = x.v; });
    Object.entries(live.pers).forEach(([id, P]) => {
      const p = S.rosa.find((x) => x.id === id); if (!p) return;
      p.gol = (p.gol || 0) + P.gol; p.ass = (p.ass || 0) + P.ass;
      if (P.esp){ p.esp = (p.esp || 0) + 1; p.squal = P.amm >= 2 ? 1 : 2; notizia(`${nomeG(p)} è stato espulso: salta ${p.squal === 1 ? 'la prossima partita' : 'le prossime 2 partite'}.`, 'squadra'); }
      else if (P.amm){ p.amm = (p.amm || 0) + 1; p.diffide = (p.diffide || 0) + 1; if (p.diffide >= 4){ p.diffide = 0; p.squal = 1; notizia(`${nomeG(p)} era diffidato: con il quarto giallo salta la prossima partita.`, 'squadra'); } }
      if (P.inf && !trucco('noInf')){ infortuna(p); infortunati.push(p); }
    });
  } else {
    const pesi = { A: 6, C: 2.5, D: 0.7, P: 0.02 };
    const scegli = (w, tranne) => { const L2 = tit.filter((p) => p !== tranne); let tot = L2.reduce((s, p) => s + (w[p.r] || 0.1) * (p.val / 50), 0), x = RND() * tot; for (const p of L2){ x -= (w[p.r] || 0.1) * (p.val / 50); if (x <= 0) return p; } return L2[0]; };
    marcatori = minGf.map((min) => {
      const chi = scegli(pesi), ass = RND() < 0.7 ? scegli({ A: 2, C: 3.2, D: 1, P: 0.05 }, chi) : null;
      if (chi) chi.gol = (chi.gol || 0) + 1; if (ass) ass.ass = (ass.ass || 0) + 1;
      return { min, nome: chi ? nomeG(chi) : 'Autogol', id: chi && chi.id, ass: ass ? nomeG(ass) : '' };
    });
    const ra = rng(avv.nome + r);
    marcAvv = minGs.map((min) => ({ min, nome: pick(NOMI, ra).charAt(0) + '. ' + pick(COGNOMI, ra) }));
    tit.forEach((p) => {
      if (RND() < 0.09){ p.amm = (p.amm || 0) + 1; p.diffide = (p.diffide || 0) + 1; cart.push({ min: ri(10, 88) + 0.6, tipo: 'giallo', lato: casa ? 0 : 1, mio: true, t: `Cartellino giallo per ${nomeG(p)}.` }); if (p.diffide >= 4){ p.diffide = 0; p.squal = 1; } }
      if (!trucco('noInf') && RND() < 0.025 * (1 - livStaff(S, 'med') * 0.1 - S.stadio.campo * 0.04)){ infortuna(p); infortunati.push(p); }
      const g = marcatori.filter((x) => x.id === p.id).length;
      voti[p.id] = clamp(Math.round((6 + clamp((gf - gs) * 0.3, -0.9, 0.9) + g * 0.9 + gauss() * 0.4) * 2) / 2, 4, 10);
    });
    const best = Object.entries(voti).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 7){ const p = S.rosa.find((x) => x.id === best[0]); motm = p ? nomeG(p) : ''; }
  }
  // presenze, voti, fatica della partita e morale dei giocatori
  const mediaRosa = S.rosa.reduce((s, p) => s + p.val, 0) / Math.max(1, S.rosa.length);
  S.rosa.forEach((p) => {
    if (giocato.has(p.id)){
      p.pres = (p.pres || 0) + 1;
      const P = live && live.pers[p.id], min = P ? ((P.min1 == null ? 90 : P.min1) - P.min0) : 90;
      p.forma = clamp(p.forma - ri(6, 11) * min / 90 + livStaff(S, 'atl') * 0.5, 30, 100);
      if (voti[p.id] != null){ p.sv = (p.sv || 0) + voti[p.id]; p.nv = (p.nv || 0) + 1; p.voti = (p.voti || []).concat([voti[p.id]]).slice(-5); p.fm = Math.round(p.voti.reduce((a, b) => a + b, 0) / p.voti.length * 10) / 10; }
      p.mor = clamp((p.mor == null ? 70 : p.mor) + 1.5 + (esito === 'V' ? 2 : esito === 'P' ? -1.5 : 0), 10, 100);
    } else if (p.val >= mediaRosa && !p.inf) p.mor = clamp((p.mor == null ? 70 : p.mor) - 1.5, 10, 100);
  });
  if (motm){ const p = S.rosa.find((x) => nomeG(x) === motm); if (p) p.motm = (p.motm || 0) + 1; }
  infortunati.forEach((p) => notizia(`${p.n} ${p.c} si è fatto male (${(p.infT || 'infortunio').toLowerCase()}): starà fuori ${p.inf} giornat${p.inf === 1 ? 'a' : 'e'}.`, 'infortunio'));
  // soldi della giornata
  const b = { sponsor: S.sponsor.val, tv: T.tv, biglietti: 0, negozio: 0, stipendi: stipendiGiocatori(), staff: stipendiStaff(), manut: manutenzione(), rate: (S.debiti || []).reduce((s, x) => s + x.rata, 0), spettatori: 0, abbonati: 0 };
  if (casa){ b.spettatori = calcPubblico(); b.abbonati = Math.min(b.spettatori, S.abbS === S.stagione ? (S.abbonati || 0) : 0); b.biglietti = Math.round((b.spettatori - b.abbonati) * prezzoBiglietto()); b.negozio = Math.round(b.spettatori * spesaNegozio()); }
  const mul = soldiDiff(); ['sponsor', 'tv', 'biglietti', 'negozio'].forEach((k) => { b[k] = Math.round(b[k] * mul); });
  movimento('sponsor', b.sponsor, 'Sponsor ' + S.sponsor.nome); movimento('tv', b.tv, 'Diritti TV'); movimento('biglietti', b.biglietti, 'Biglietti'); movimento('negozio', b.negozio, 'Bar e negozio');
  movimento('stipendi', -b.stipendi, 'Stipendi giocatori'); movimento('staff', -b.staff, 'Stipendi staff'); movimento('manutenzione', -b.manut, 'Manutenzione');
  pagaRate();
  b.entrate = b.sponsor + b.tv + b.biglietti + b.negozio; b.uscite = b.stipendi + b.staff + b.manut + b.rate; b.netto = b.entrate - b.uscite;
  S.bilancio = b;
  // allenamento della settimana: condizione, crescita, intesa
  applicaAllenamento(giocato);
  // morale e tifosi
  S.morale = clamp(S.morale + (esito === 'V' ? 7 : esito === 'N' ? 1 : -6) + (S.stadio.spogl >= 3 ? 1 : 0), 15, 100);
  const tetto = tettoTifosi(tier || S.tier);
  S.tifosi = Math.round(esito === 'V' ? S.tifosi + Math.max(3, (tetto - S.tifosi) * 0.07) : esito === 'N' ? S.tifosi + Math.max(1, (tetto - S.tifosi) * 0.02) : S.tifosi * 0.98);
  S.tifosi = Math.max(Math.round(T.pubblico * 0.4), S.tifosi + S.stadio.maxi * 2);
  if (casa) S.stadio.usura = clamp(S.stadio.usura - Math.max(0.8, 3 - S.stadio.campo * 0.45), 0, 100);
  S.soldiStoria.push(Math.round(S.soldi)); S.soldiStoria = S.soldiStoria.slice(-40);
  // lavori finiti, mercato, offerte, giovani
  S.giornate++;
  S.stadio.cantieri = S.stadio.cantieri.filter((c) => {
    if (S.giornate >= c.fine){ S.stadio[c.k] = c.liv; const s = STADIO_K[c.k]; notizia(`Lavori finiti! ${s.nome}: ${s.livelli[c.liv]}.${c.k === 'tribune' ? ' Ora ci stanno ' + s.posti[c.liv].toLocaleString('it-IT') + ' spettatori.' : ''}`, 'stadio'); return false; }
    return true;
  });
  if (S.giornate - S.mercato.agg >= 3) genMercato();
  offerteDalleSquadre();
  crescitaGiovani();
  if (r === Math.floor(giornateTot(n) / 2)){ const sc = S.rosa.filter((p) => !p.prestito && p.contr <= 1); if (sc.length) notizia(`Contratti in scadenza a fine stagione: ${sc.map((p) => p.c).join(', ')}. Rinnovali o se ne andranno!`, 'mercato'); }
  if (S.soldi < 0) notizia('Attenzione: la cassa è in rosso! Vendi qualche giocatore, chiedi un prestito o risparmia.', 'soldi');
  const titolo = esito === 'V' ? 'Vittoria' : esito === 'N' ? 'Pareggio' : 'Sconfitta';
  notizia(`${titolo} ${casa ? 'in casa' : 'in trasferta'}: ${casa ? S.club.nome + ' ' + gf + '-' + gs + ' ' + avv.nome : avv.nome + ' ' + gs + '-' + gf + ' ' + S.club.nome}.${marcatori.length ? ' Gol di ' + marcatori.map((x) => x.nome).join(', ') + '.' : ''}${motm ? ' Migliore in campo: ' + motm + '.' : ''}`, 'risultato');
  const rep = { r, casa, gf, gs, minGf, minGs, marcatori, marcAvv, esito, pos: casa ? m.pos : 100 - m.pos, tiri: casa ? m.th : m.ta, tiriAvv: casa ? m.ta : m.th, rec: m.rec || 3,
    avv: { nome: avv.nome, c1: avv.c1, c2: avv.c2, st: avv.st, pat: avv.pat, sim: avv.sim, tipo: avv.tipo, forza: avv.forza },
    mod: S.tattica.mod, modA: live ? live.modA : (avv.mod || '4-4-2'), bil: b, motm, cart,
    voti: Object.entries(voti).map(([id, v]) => { const p = S.rosa.find((x) => x.id === id); return p ? { id, n: nomeG(p), r: p.r, v, num: p.num } : null; }).filter(Boolean).sort((a, b) => 'PDCA'.indexOf(a.r) - 'PDCA'.indexOf(b.r)),
    st: live ? { tiri: live.st.tiri, porta: live.st.porta, corner: live.st.corner, falli: live.st.falli, amm: live.st.amm, esp: live.st.esp, noi: live.noi } : null,
    ev: live ? live.ev : null,
    ris: ris.map((x) => ({ h: x.h, a: x.a, gh: x.gh, ga: x.ga, nh: (nomi(x.h) || {}).nome, na: (nomi(x.a) || {}).nome })) };
  S.ultima = rep;
  S.risultati = (S.risultati || []).concat([{ s: S.stagione, r, casa, avv: avv.nome, gf, gs, esito }]).slice(-60);
  if (!trucco('noImpr')) imprevisto();
  conferenza(rep);
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
  movimento('premi', premio, 'Premio di fine stagione (' + pos + '°)');
  const obiettivi = chiudiObiettivi(pos, prev.n);
  const capocannoniere = S.rosa.slice().sort((a, b) => (b.gol || 0) - (a.gol || 0))[0];
  const migliore = S.rosa.filter((p) => p.nv >= 5).sort((a, b) => mediaVoto(b) - mediaVoto(a))[0];
  S.storico.unshift({ stagione: S.stagione, tier: prev.tier, pos, n: prev.n, pt: me ? me.pt : 0, v: me ? me.v : 0, n_: me ? me.n : 0, p: me ? me.p : 0, gf: me ? me.gf : 0, gs: me ? me.gs : 0, bomber: capocannoniere && capocannoniere.gol ? nomeG(capocannoniere) + ' (' + capocannoniere.gol + ')' : '', migliore: migliore ? nomeG(migliore) + ' (' + mediaVoto(migliore).toFixed(2) + ')' : '', online: L.online, soldi: Math.round(S.soldi) });
  if (pos === 1) S.trofei.push({ stagione: S.stagione, tier: prev.tier, nome: 'Campioni ' + T.nome });
  const salitoLiv = pos === 1 && prev.tier === TOP && !L.online && livello() < LIV_MAX;
  if (!salitoLiv) qualificaEuropa(pos, prev.tier, L.online);
  if (pos === 1 && prev.tier === TOP && !L.online && livello() === LIV_MAX) notizia(`Campioni d’Italia al livello Fortissimo: la ${S.club.nome} è nella leggenda!`, 'trofeo');
  const vecchioTier = prev.tier;
  const nuovoTier = sale ? prev.tier + 1 : scende ? prev.tier - 1 : prev.tier;
  // giocatori: un anno in più, i giovani crescono, i vecchi calano, qualcuno smette
  const ritirati = [], scaduti = [], tornati = [], rientrati = [];
  const crescita = 0.6 + livStaff(S, 'all') * 0.08 + livStaff(S, 'vice') * 0.06 + S.stadio.giov * 0.05 + (S.stadio.centro || 0) * 0.05;
  const invecchia = (p) => {
    p.eta++;
    if (p.eta <= 23) p.val = Math.min(p.pot, p.val + Math.round((ri(1, 3) + (p.pot - p.val) / 5) * crescita));
    else if (p.eta <= 29) p.val = Math.min(p.pot + 2, p.val + ri(-1, 2));
    else if (p.eta <= 32) p.val -= ri(0, 2);
    else p.val -= ri(1, 4);
    p.val = clamp(p.val, 10, 99); p.pot = Math.max(p.pot, p.val);
    p.prezzo = valoreDi(p);
    p.forma = 100; p.inf = 0; p.squal = 0; p.diffide = 0; p.golTot = (p.golTot || 0) + (p.gol || 0); p.assTot = (p.assTot || 0) + (p.ass || 0); p.presTot = (p.presTot || 0) + (p.pres || 0);
    p.gol = 0; p.ass = 0; p.pres = 0; p.amm = 0; p.esp = 0; p.sv = 0; p.nv = 0; p.motm = 0;
  };
  S.rosa.forEach((p) => {
    invecchia(p);
    if (p.prestito){ tornati.push(p); return; }
    p.contr = (p.contr == null ? 2 : p.contr) - 1;
    if (p.contr <= 0) scaduti.push(p);
    else if (p.eta >= 38 || (p.eta >= 34 && RND() < (p.eta - 32) * 0.18)) ritirati.push(p);
  });
  [].concat(ritirati, scaduti, tornati).forEach((p) => togliDallaRosa(p));
  ritirati.forEach((p) => notizia(`${p.n} ${p.c} smette di giocare a ${p.eta} anni. Grazie campione!`, 'squadra'));
  scaduti.forEach((p) => notizia(`${p.n} ${p.c} aveva il contratto in scadenza e se ne va a parametro zero.`, 'mercato'));
  tornati.forEach((p) => notizia(`${p.n} ${p.c} finisce il prestito e torna al ${p.prestito.club || 'suo club'}.`, 'mercato'));
  (S.inPrestito || []).forEach((x) => { const p = x.p; invecchia(p); if (p.eta <= 24) p.val = Math.min(p.pot, p.val + ri(0, 3)); p.prezzo = valoreDi(p); p.num = numeroLibero(p.r); S.rosa.push(p); rientrati.push(p); notizia(`${p.n} ${p.c} torna dal prestito al ${x.club}: adesso vale ${p.val}.`, 'mercato'); });
  S.inPrestito = [];
  // settore giovanile: crescono, i più grandi devono salire o andare via, arrivano ragazzi nuovi
  const usciti = [];
  S.giovanili = (S.giovanili || []).filter((p) => { invecchia(p); if (p.eta >= 20){ usciti.push(p); return false; } return true; });
  usciti.forEach((p) => notizia(`${p.n} ${p.c} ha 20 anni ed è troppo grande per la ${nomePrimavera()}: lascia la società.`, 'giovani'));
  const giovani = [];
  for (let k = 0; k < [1, 1, 2, 3, 4][S.stadio.giov]; k++){ if (S.giovanili.length >= 16) break; const p = nuovoGiovane(nuovoTier, S.stadio.giov * 2); S.giovanili.push(p); giovani.push(p); }
  giovani.forEach((p) => notizia(`Nella ${nomePrimavera()} arriva ${p.n} ${p.c}, ${p.eta} anni: può diventare forte!`, 'giovani'));
  // tifosi, sponsor, staff
  S.tifosi = Math.round(Math.min(tettoTifosi(nuovoTier), S.tifosi * (sale ? 1.4 : scende ? 0.8 : 1.03) + (sale ? TIERS[nuovoTier - 1].pubblico * 0.3 : 0)));
  S.tier = nuovoTier;
  S.sponsor = nuovoSponsor(nuovoTier);
  if (pos === 1) S.sponsor.val = tondo(S.sponsor.val * 1.15);
  S.stagione++;
  S.morale = clamp(S.morale + (sale ? 15 : scende ? -10 : 0), 30, 100);
  S.offerte = []; S.obiettivi = null;
  S.rosa.forEach((p) => { p.stip = Math.max(p.stip, Math.round(stipDi(p) * 0.6)); });
  genMercato(); genStaffMercato();
  if (sale) notizia(`PROMOZIONE! La ${S.club.nome} sale in ${TIERS[nuovoTier - 1].nome}!`, 'trofeo');
  else if (scende) notizia(`Retrocessione: la ${S.club.nome} scende in ${TIERS[nuovoTier - 1].nome}. Si riparte più forti!`, 'societa');
  else notizia(`Stagione finita al ${pos}° posto. Si riparte in ${TIERS[nuovoTier - 1].nome}!`, 'societa');
  notizia(`Nuovo sponsor: ${S.sponsor.nome}, ${euro(S.sponsor.val)} a giornata.`, 'societa');
  // nuovo girone
  if (L.online){
    L.stagione = S.lega.dati.stagione; L.giocate = 0;
    if (sale || scende){ L.cambio = nuovoTier; setTimeout(() => window.Online && Online.cambiaCategoria(nuovoTier), 50); }
  } else {
    if (sale || scende) nuovaLegaLocale(nuovoTier);
    else { L.stagione = L.dati.stagione; L.giocate = 0; }
  }
  aggiornaMioSlot();
  if (!S.ospite) setTimeout(() => scriviSlot('auto'), 100);
  const rapporto = { tipo: 'stagione', pos, n: prev.n, sale, scende, premio, vecchioTier, nuovoTier, campione: pos === 1, pt: me ? me.pt : 0, ritirati: ritirati.map((p) => p.n + ' ' + p.c), giovani: giovani.map((p) => p.n + ' ' + p.c),
    scaduti: scaduti.map((p) => p.n + ' ' + p.c), tornati: tornati.map((p) => p.n + ' ' + p.c), rientrati: rientrati.map((p) => p.n + ' ' + p.c), obiettivi,
    bomber: S.storico[0].bomber, migliore: S.storico[0].migliore, top: prev.tab.slice(0, 3).map((t) => t.nome), coppe: coppeDellaStagione().filter((c) => c.vinta).map((c) => COPPE[c.k].nome) };
  if (salitoLiv) rapporto.livello = ricominciaLivello();
  return rapporto;
}

function dopoPartita(rep){ disegna(); mostraRisultati(rep, () => mostraPendenti()); }
function mostraPendenti(){
  const p = S.pendenti.shift(); if (!p){ salva(); disegna(); return; }
  salva();
  if (p.tipo === 'stagione') mostraFineStagione(p, () => mostraPendenti());
  else if (p.tipo === 'partita') foglio(`<h2>Si è giocata la giornata ${p.rep.r + 1}</h2><p class="tenue">Gli altri presidenti erano pronti: ecco com'è andata.</p>${cartaRisultato(p.rep)}<div class="riga-btn"><button class="btn" data-a="rivedi">${ic('play')} Guarda la partita</button><button class="btn sec" data-a="chiudi">Ok</button></div>`, () => mostraPendenti());
  else if (p.tipo === 'coppa') mostraCoppa(p, () => mostraPendenti());
  else if (p.tipo === 'livello') mostraLivello(p, () => mostraPendenti());
  else if (p.tipo === 'info') foglio(`<div class="evento"><span class="ev-ico">${ic(p.ico || 'fulmine')}</span><h2>Imprevisto</h2><p>${esc(p.t)}</p><button class="btn largo" data-a="chiudi">Ok</button></div>`, () => mostraPendenti());
  else if (p.tipo === 'scelta'){
    foglio(`<div class="evento"><span class="ev-ico">${ic(p.ico || 'fulmine')}</span><h2>Devi decidere</h2><p>${esc(p.t)}</p><div class="scelte">${p.op.map((o, i) => `<button class="btn ${i ? 'sec' : ''}" data-scelta="${i}">${esc(o)}</button>`).join('')}</div></div>`, () => mostraPendenti());
    document.querySelectorAll('[data-scelta]').forEach((b) => b.onclick = () => { const t = rispondiScelta(p.id, +b.dataset.scelta); foglio(`<div class="evento"><span class="ev-ico">${ic('check')}</span><h2>Fatto</h2><p>${esc(t)}</p><button class="btn largo" data-a="chiudi">Ok</button></div>`, () => mostraPendenti()); });
  } else if (p.tipo === 'stampa'){
    foglio(`<div class="evento"><span class="ev-ico">${ic('microfono')}</span><h2>Conferenza stampa</h2><p class="tenue">${esc(pick(GIORNALI))} chiede:</p><p class="domanda">«${esc(p.q)}»</p><div class="scelte">${p.op.map((o, i) => `<button class="btn sec" data-stampa="${i}">${esc(o)}</button>`).join('')}</div><button class="link" data-a="chiudi">Non rispondo</button></div>`, () => mostraPendenti());
    document.querySelectorAll('[data-stampa]').forEach((b) => b.onclick = () => { rispondiStampa(p, +b.dataset.stampa); chiudiFoglio(); });
  } else mostraPendenti();
}

// ---------- avvisi e fogli ----------
function avviso(t){
  const d = document.createElement('div'); d.className = 'avviso'; d.textContent = t; document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add('su')); setTimeout(() => { d.classList.remove('su'); setTimeout(() => d.remove(), 400); }, 2600);
}
let _dopoFoglio = null;
function foglio(html, dopo, cls = ''){
  chiudiFoglio(true);
  const d = document.createElement('div'); d.className = 'velo'; d.id = 'velo';
  d.innerHTML = `<div class="foglio ${cls}" role="dialog"><button class="x" data-a="chiudi" aria-label="Chiudi">${ic('x')}</button>${html}</div>`;
  document.body.appendChild(d); requestAnimationFrame(() => d.classList.add('su'));
  _dopoFoglio = dopo || null;
  d.addEventListener('click', (e) => { if (e.target === d) chiudiFoglio(); });
}
function chiudiFoglio(silenzioso){
  const d = $('#velo'); if (d){ d.remove(); }
  const f = _dopoFoglio; _dopoFoglio = null;
  if (f && !silenzioso) f();
}
// domanda sì/no dentro il gioco (le finestre del browser in alcune app non si aprono)
function chiedi(testo, si){
  foglio(`<h2>Sei sicuro?</h2><p>${esc(testo)}</p><div class="riga-btn"><button class="btn rosso" id="chiediSi">Sì</button><button class="btn sec" data-a="chiudi">No</button></div>`);
  $('#chiediSi').onclick = () => { chiudiFoglio(true); si(); };
}

// ---------- menu ----------
function menu(){
  const on = window.Online && Online.loggato();
  const L = S.lega;
  foglio(`<div class="menu-top">${mioStemma(54)}<div><h2>${esc(S.club.nome)}</h2><p class="tenue">${esc(S.club.citta || '')} · stagione ${S.stagione} · ${TIERS[S.tier - 1].nome}</p><p class="liv-tag">Livello: <b>${testoLivello()}</b></p></div></div>
  ${S.ospite ? `<section class="menu-sez avviso-sez"><h3>${ic('utente')} Stai giocando come ospite</h3><p>Quando chiudi l’app la partita non si salva. Entra con il tuo account per tenerla.</p><div class="riga-btn"><button class="btn" data-a="loginGoogle">Entra con Google</button><button class="btn sec" data-a="loginEmail">Entra con email</button></div></section>` : ''}
  <section class="menu-sez online-sez"><h3>${ic('mondo')} Account e gioco online</h3>
    ${!on ? (S.ospite ? '' : `<p>Entra con il tuo account (lo stesso del Gioco della Vita PM): la società si salva online e puoi entrare nei gironi con altre persone vere.</p>
      <div class="riga-btn"><button class="btn" data-a="loginGoogle">Entra con Google</button><button class="btn sec" data-a="loginEmail">Entra con email</button></div>`)
    : `<p>Sei dentro come <b>${esc(Online.nome())}</b>. La tua società si salva online da sola.</p>
      ${L.online ? `<p><i class="online-dot"></i> Stai giocando nel girone online <b>${esc(L.dati.nome)}</b> di ${TIERS[L.dati.tier - 1].nome}.</p><div class="riga-btn"><button class="btn sec" data-a="esciOnline">Torna a giocare da solo</button></div>`
        : `<p>Adesso giochi da solo contro i bot.</p><div class="riga-btn"><button class="btn oro" data-a="vaiOnline">Entra in un girone online</button></div><p class="nota">La stagione ricomincia in un girone di ${TIERS[S.tier - 1].nome} con altre persone vere: prendi il posto di un bot, con i suoi punti.</p>`}
      <div class="riga-btn"><button class="link" data-a="logout">Esci dall’account</button></div>`}
    ${window.Online && Online.errore() ? `<p class="rosso">${esc(Online.errore())}</p>` : ''}
  </section>
  <section class="menu-sez">
  <button class="riga-menu" data-a="salvataggi">${ic('salva')} Salvataggi<span>${S.ospite ? 'ospite' : 'automatico attivo'}</span></button>
  <button class="riga-menu" data-a="vai" data-v="club" data-sub="personalizza">${ic('pennello')} Personalizza club, maglie e nomi</button>
  <button class="riga-menu oro" data-a="codice">${ic(S.codice ? 'bacchetta' : 'chiave')} ${S.codice ? 'Pannello segreto' : 'Aggiungi codice'}</button>
  <button class="riga-menu" data-a="comeSiGioca">${ic('aiuto')} Come si gioca</button>
  <button class="riga-menu" data-a="suono">${ic(S.opz.suono ? 'suono' : 'muto')} ${S.opz.suono ? 'Suoni attivi' : 'Suoni spenti'}</button>
  <button class="riga-menu" data-a="installa">${ic('scarica')} Metti l’app sul telefono</button>
  <button class="riga-menu rosso" data-a="ricomincia">${ic('cestino')} Ricomincia da capo</button></section>
  <p class="nota centro">Calciomania PM · gratis, senza pubblicità · <a href="../">sito</a></p>`, null, 'menu');
}
function salvataggi(){
  if (S.ospite) return foglio(`<h2>${ic('salva')} Salvataggi</h2><p>Come ospite la partita non si salva. Entra con il tuo account e potrai salvare, caricare e ripristinare le partite.</p><div class="riga-btn"><button class="btn" data-a="loginGoogle">Entra con Google</button><button class="btn sec" data-a="loginEmail">Entra con email</button></div>`);
  const slot = (i) => { const x = leggiSlot(i); return `<div class="slot"><div><b>${i === 'auto' ? 'Inizio stagione (automatico)' : 'Slot ' + i}</b><small>${x ? esc(x.nome) + ' · stagione ' + x.st + ' · ' + TIERS[x.tier - 1].nome + ' · ' + new Date(x.t).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'vuoto'}</small></div>${i === 'auto' ? '' : `<button class="btn mini" data-a="slotSalva" data-v="${i}">Salva</button>`}${x ? `<button class="btn mini sec" data-a="slotCarica" data-v="${i}">${i === 'auto' ? 'Ripristina' : 'Carica'}</button>` : ''}</div>`; };
  foglio(`<h2>${ic('salva')} Salvataggi</h2><p class="nota">Il gioco si salva da solo dopo ogni azione${window.Online && Online.loggato() ? ', anche online nel tuo account' : ''}. Qui puoi fare copie e tornare indietro.</p>
  <div class="slots">${[1, 2, 3, 'auto'].map(slot).join('')}</div>
  <h3>Codice della partita</h3><p class="nota">Copia il codice per spostare la partita su un altro telefono, oppure incolla un codice per caricarla.</p>
  <div class="riga-btn"><button class="btn sec" data-a="esporta">${ic('copia')} Copia il codice</button><button class="btn sec" data-a="importa">${ic('cartella')} Incolla un codice</button></div>
  <p class="nota">Ultimo salvataggio: ${new Date(S.agg || Date.now()).toLocaleString('it-IT')}</p>`);
}
function comeSiGioca(){
  foglio(`<h2>Come si gioca</h2><div class="guida">
  <p><b>1. Sei il presidente.</b> Fondi la tua società in Terza Categoria con ${euro(SOLDI_INIZIO)}.</p>
  <p><b>2. Ingaggia.</b> Prendi un allenatore e almeno 11 giocatori (con un portiere). Al mercato tratti il prezzo con la squadra e lo stipendio con il giocatore. Lo staff ti aiuta: preparatori, medico, fisioterapista, osservatore, direttore sportivo.</p>
  <p><b>3. Allena la squadra.</b> Scegli il programma della settimana: atletica, tecnica, tattica, partitelle, recupero. Ogni giocatore può avere un allenamento suo.</p>
  <p><b>4. Scegli la tattica.</b> Modulo, mentalità, stile di gioco, pressing e linea difensiva.</p>
  <p><b>5. Gioca le partite in diretta.</b> Puoi mettere in pausa, fare fino a 5 cambi e cambiare tattica. Attento a infortuni e cartellini!</p>
  <p><b>6. Sistema lo stadio.</b> Più posti, campo, luci, negozio, centro di allenamento e settore giovanile. Decidi tu i prezzi di biglietti e abbonamenti.</p>
  <p><b>7. Sali di categoria.</b> I primi due salgono, gli ultimi due scendono: Terza, Seconda, Prima Categoria, Promozione, Eccellenza, Serie D, C, B e Serie A!</p>
  <p><b>Soldi:</b> entrano con biglietti, abbonamenti, negozio, sponsor, TV, cessioni e premi. Escono con stipendi, staff, lavori, commissioni e rate dei prestiti. Non andare in rosso!</p>
  <p><b>Imprevisti:</b> infortuni, multe, regali, richieste dei giocatori e conferenze stampa. A volte devi scegliere tu.</p></div>
  <button class="btn largo" data-a="chiudi">Ho capito</button>`);
}

// ---------- schermata iniziale e fondazione ----------
let bozza = null;
function schermataIniziale(){
  const c = carica();
  const on = window.Online && Online.loggato();
  $('#app').innerHTML = `<div class="intro"><div class="intro-luci"></div><div class="intro-c">
    <div class="intro-logo">${stemmaSVG({ c1: '#0f3b2a', c2: '#d4af37', st: 2, pat: 4, sim: 1 }, 104, 'PM')}</div>
    <h1>CALCIOMANIA<span>PM</span></h1><p>Il manageriale di calcio. Fonda il tuo club,<br>dalla Terza Categoria alla Serie A.</p>
    ${c ? `<button class="btn largo oro" data-a="continua">${ic('play')} Continua con ${esc(c.club.nome)}</button>` : ''}
    ${on ? `<p class="tenue">Sei dentro come <b>${esc(Online.nome())}</b>.</p><button class="btn largo ${c ? 'sec' : 'oro'}" data-a="fonda">${ic('scudo')} Fonda una nuova società</button>`
      : `<button class="btn largo ${c ? 'sec' : 'oro'}" data-a="introLogin">${ic('utente')} Entra con il tuo account</button><p class="nota">Lo stesso account del Gioco della Vita PM: la partita si salva e la ritrovi su ogni telefono.</p>
    <button class="btn largo sec" data-a="ospite">${ic('play')} Gioca come ospite</button><p class="nota">Come ospite la partita non si salva quando chiudi.</p>`}
    <button class="link" data-a="comeSiGioca">Come si gioca</button>
  </div></div>`;
}
const AMB_ICO = ['scudo', 'bilancia', 'coppa'];
function fondazione(modifica, ospite){
  const r = RND;
  bozza = modifica ? JSON.parse(JSON.stringify(S.club)) : Object.assign({ nome: '', citta: '', sigla: '', mister: '', primavera: '', stadio: '' }, stemmaCasuale(r));
  if (!modifica){ Object.assign(bozza, { c1: '#0f3b2a', c2: '#d4af37', st: 0, pat: 1, sim: 0, diff: 0, amb: 1 }); bozza.ospite = !!ospite; }
  if (modifica) bozza.stadio = (S.stadio.design || {}).nome || '';
  bozza.kit = bozza.kit || [{ t: 1, c1: bozza.c1, c2: bozza.c2 }, { t: 0, c1: '#f8fafc', c2: bozza.c1 }];
  const sigla = () => (bozza.sigla || iniziali(bozza.nome || 'PM')).slice(0, 4).toUpperCase();
  const html = () => `<div class="fonda"><div class="fonda-testa"><h1>${modifica ? 'Personalizza il club' : 'Fonda la tua società'}</h1>${!modifica && bozza.ospite ? '<span class="tag-st giallo">Ospite: non si salva</span>' : ''}</div>
    <div class="anteprima" id="ant">${stemmaSVG(bozza, 110, bozza.nome || 'PM')}<div><b>${esc(bozza.nome || 'Nome della squadra')}</b><small>${esc(sigla())} · ${esc(bozza.citta || 'Città')}</small><div class="kit-ant">${magliaSVG(bozza.kit[0], 44, 10)}${magliaSVG(bozza.kit[1], 44, 10)}</div></div></div>
    <section class="f-sez"><h3>${ic('club')} Identità</h3>
    <label>Nome della squadra<input id="fNome" maxlength="28" placeholder="es. Real Borgoverde" value="${esc(bozza.nome)}"></label>
    <div class="f-due"><label>Sigla<input id="fSigla" maxlength="4" placeholder="${esc(sigla())}" value="${esc(bozza.sigla || '')}"></label><label>Città<input id="fCitta" maxlength="24" placeholder="es. Borgoverde" value="${esc(bozza.citta)}"></label></div>
    <label>Nome dello stadio<input id="fStadio" maxlength="30" placeholder="Stadio ${esc(bozza.citta || 'Comunale')}" value="${esc(bozza.stadio || '')}"></label>
    <div class="f-due"><label>Il tuo nome (presidente)<input id="fMister" maxlength="24" placeholder="es. Daniela" value="${esc(bozza.mister || '')}"></label><label>Squadra giovanile<input id="fPrim" maxlength="28" placeholder="Primavera ${esc(bozza.nome || '')}" value="${esc(bozza.primavera || '')}"></label></div></section>
    <section class="f-sez"><h3>${ic('scudo')} Stemma</h3>
    <div class="scelta"><span>Colore 1</span><div class="colori">${COLORI.map((c) => `<button class="col ${bozza.c1 === c ? 'on' : ''}" style="--c:${c}" data-a="fcol" data-k="c1" data-v="${c}" aria-label="colore"></button>`).join('')}</div></div>
    <div class="scelta"><span>Colore 2</span><div class="colori">${COLORI.map((c) => `<button class="col ${bozza.c2 === c ? 'on' : ''}" style="--c:${c}" data-a="fcol" data-k="c2" data-v="${c}" aria-label="colore"></button>`).join('')}</div></div>
    <div class="scelta"><span>Forma</span><div class="opz">${[0, 1, 2, 3].map((i) => `<button class="${bozza.st === i ? 'on' : ''}" data-a="fopz" data-k="st" data-v="${i}">${stemmaSVG(Object.assign({}, bozza, { st: i, sim: 6 }), 30, ' ')}</button>`).join('')}</div></div>
    <div class="scelta"><span>Disegno</span><div class="opz">${[0, 1, 2, 3, 4].map((i) => `<button class="${bozza.pat === i ? 'on' : ''}" data-a="fopz" data-k="pat" data-v="${i}">${stemmaSVG(Object.assign({}, bozza, { pat: i, sim: 6 }), 30, ' ')}</button>`).join('')}</div></div>
    <div class="scelta"><span>Simbolo</span><div class="opz">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<button class="${bozza.sim === i ? 'on' : ''}" data-a="fopz" data-k="sim" data-v="${i}">${stemmaSVG(Object.assign({}, bozza, { sim: i }), 30, bozza.nome || 'PM')}</button>`).join('')}</div></div></section>
    <section class="f-sez"><h3>${ic('squadra')} Maglie</h3>${[0, 1].map((k) => `<div class="kit-ed"><div class="kit-big">${magliaSVG(bozza.kit[k], 64, 10)}<small>${k ? 'Trasferta' : 'Casa'}</small></div><div>
      <div class="opz">${DISEGNI_MAGLIA.map((n, i) => `<button class="${bozza.kit[k].t === i ? 'on' : ''}" data-a="fkit" data-k="${k}" data-c="t" data-v="${i}" title="${n}">${magliaSVG({ t: i, c1: bozza.kit[k].c1, c2: bozza.kit[k].c2 }, 28)}</button>`).join('')}</div>
      <div class="colori pic">${COLORI.concat(['#f8fafc', '#0b0d10']).map((c) => `<button class="col ${bozza.kit[k].c1 === c ? 'on' : ''}" style="--c:${c}" data-a="fkit" data-k="${k}" data-c="c1" data-v="${c}" aria-label="colore"></button>`).join('')}</div>
      <div class="colori pic">${COLORI.concat(['#f8fafc', '#0b0d10']).map((c) => `<button class="col ${bozza.kit[k].c2 === c ? 'on' : ''}" style="--c:${c}" data-a="fkit" data-k="${k}" data-c="c2" data-v="${c}" aria-label="colore"></button>`).join('')}</div></div></div>`).join('')}</section>
    ${modifica ? '' : `<section class="f-sez"><h3>${ic('bersaglio')} Obiettivi e difficoltà</h3>
    <div class="scelta"><span>Obiettivo iniziale</span><div class="diff">${AMBIZIONI.map((x, i) => `<button class="${bozza.amb === i ? 'on' : ''}" data-a="fopz" data-k="amb" data-v="${i}">${ic(AMB_ICO[i])}<span>${x[0]}</span></button>`).join('')}</div><p class="nota">${AMBIZIONI[bozza.amb][1]}. Puoi sempre fare di più!</p></div>
    <div class="scelta"><span>Livello</span>${scalaLivelli(0)}<p class="nota">Tutti partono da <b>Principiante</b>. Vinci la Serie A e passi al livello dopo, ripartendo dalla Terza Categoria. Al livello Fortissimo ci sono la Coppa Italia e le coppe europee!</p></div></section>`}
    <button class="btn largo oro" data-a="${modifica ? 'salvaClub' : 'creaClub'}">${modifica ? 'Salva le modifiche' : 'Fonda la società · ' + euroBreve(SOLDI_INIZIO)}</button>
    ${modifica ? '<button class="btn largo sec" data-a="annullaClub">Annulla</button>' : '<button class="link" data-a="indietroIntro">‹ Indietro</button>'}</div>`;
  const leggi = () => { const g = (id) => { const e = $(id); return e ? e.value : null; }; if ($('#fNome')){ bozza.nome = g('#fNome'); bozza.citta = g('#fCitta'); bozza.sigla = g('#fSigla'); bozza.stadio = g('#fStadio'); bozza.mister = g('#fMister'); bozza.primavera = g('#fPrim'); } };
  const draw = () => {
    leggi(); const y = window.scrollY; $('#app').innerHTML = html(); window.scrollTo(0, y);
    const ant = () => { leggi(); $('#ant').innerHTML = `${stemmaSVG(bozza, 110, bozza.nome || 'PM')}<div><b>${esc(bozza.nome || 'Nome della squadra')}</b><small>${esc(sigla())} · ${esc(bozza.citta || 'Città')}</small><div class="kit-ant">${magliaSVG(bozza.kit[0], 44, 10)}${magliaSVG(bozza.kit[1], 44, 10)}</div></div>`; };
    ['#fNome', '#fCitta', '#fSigla'].forEach((id) => $(id).addEventListener('input', ant));
  };
  fondazione.draw = draw; fondazione.leggi = leggi; $('#app').innerHTML = html(); fondazione.draw(); window.scrollTo(0, 0);
}
function pulisciBozza(){
  fondazione.leggi();
  ['nome', 'citta', 'sigla', 'stadio', 'mister', 'primavera'].forEach((k) => { bozza[k] = String(bozza[k] || '').trim(); });
  if (bozza.nome.length < 2){ avviso('Scrivi il nome della squadra'); return false; }
  if (!bozza.sigla) bozza.sigla = iniziali(bozza.nome).slice(0, 4).toUpperCase();
  return true;
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

// ---------- tocchi ----------
const VECCHI_SCHERMI = { casa: 'home', rosa: 'squadra', stadio: 'club', classifica: 'campionato' };
document.addEventListener('change', (e) => {
  const t = e.target; if (!t || !S) return;
  if (t.id === 'nomeStadio'){ S.stadio.design = Object.assign({}, S.stadio.design || {}, { nome: t.value.trim().slice(0, 30) }); salva(); disegna(); }
  if (t.dataset && t.dataset.ch === 'allenGiorno'){ S.allen.sett[+t.dataset.k] = t.value; salva(); disegna(); }
  if (t.dataset && t.dataset.ch === 'allenInd'){ const p = S.rosa.find((x) => x.id === t.dataset.id); if (p){ p.allen = t.value; salva(); } }
  if (t.dataset && t.dataset.ch === 'istruz'){ S.tattica.ist = S.tattica.ist || {}; if (t.value) S.tattica.ist[t.dataset.id] = t.value; else delete S.tattica.ist[t.dataset.id]; salva(); }
  if (t.dataset && t.dataset.ch === 'ordina'){ sottoschermo[t.dataset.s + 'Ord'] = t.value; disegna(); }
  if (t.dataset && t.dataset.ch === 'prezzo'){ const v = clamp(+t.value || 100, 30, 300) / 100; prezziDi()[t.dataset.k] = v; salva(); disegna(); }
});
document.addEventListener('input', (e) => {
  const t = e.target; if (!t || !t.dataset || t.dataset.ch !== 'cerca') return;
  sottoschermo[t.dataset.s + 'Cerca'] = t.value; const pos = t.selectionStart; disegna(); const n = document.querySelector(`[data-ch="cerca"][data-s="${t.dataset.s}"]`); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, v = b.dataset.v;
  Suono.init();
  switch (a){
    case 'vai': schermo = VECCHI_SCHERMI[v] || v; if (b.dataset.sub) sottoschermo[schermo] = b.dataset.sub; if (b.dataset.ruolo !== undefined) sottoschermo.ruolo = b.dataset.ruolo; chiudiFoglio(true); disegna(); window.scrollTo(0, 0); break;
    case 'sub': sottoschermo[b.dataset.s] = v; disegna(); window.scrollTo(0, 0); break;
    case 'filtro': sottoschermo[b.dataset.k] = v; disegna(); break;
    case 'ruolo': sottoschermo.ruolo = v; disegna(); break;
    case 'gioca': gioca(false); break;
    case 'giocaVeloce': gioca(true); break;
    case 'menu': menu(); break;
    case 'chiudi': chiudiFoglio(); break;
    case 'giocatore': schedaGiocatore(b.dataset.id); break;
    case 'compra': case 'tratta': apriTrattativa(b.dataset.id, false); break;
    case 'prestito': apriTrattativa(b.dataset.id, true); break;
    case 'trOff': { const i = $('#trOfferta'); if (i){ T.offerta = Math.max(0, tondo((+i.value || 0) * (1 + +v))); i.value = T.offerta; } break; }
    case 'trStip': { const i = $('#trStipendio'); if (i){ T.stip = Math.max(0, tondo((+i.value || 0) * (1 + +v))); i.value = T.stip; } break; }
    case 'trAnni': { const i = $('#trStipendio'); if (i) T.stip = +i.value || T.stip; T.anni = +v; disegnaTrattativa(); break; }
    case 'trInvia': inviaOfferta(); break;
    case 'trFirma': firmaContratto(); break;
    case 'vendi': chiedi('Vuoi venderlo subito? Con un’offerta vera di un club di solito guadagni di più.', () => { vendi(b.dataset.id); }); break;
    case 'lista': { const p = S.rosa.find((x) => x.id === b.dataset.id); if (p){ p.lista = !p.lista; salva(); avviso(p.lista ? 'Messo nella lista dei trasferimenti: arriveranno offerte' : 'Tolto dalla lista dei trasferimenti'); schedaGiocatore(p.id); disegna(); } break; }
    case 'presta': chiedi('Vuoi mandarlo in prestito fino a fine stagione?', () => prestaGiocatore(b.dataset.id)); break;
    case 'rinnova': schedaRinnovo(b.dataset.id); break;
    case 'rinnovaOk': { const s = +($('#rnStip').value) || 0; rinnova(b.dataset.id, +($('#rnAnni').dataset.v || 3), s); break; }
    case 'rnAnni': { $('#rnAnni').dataset.v = v; document.querySelectorAll('[data-a="rnAnni"]').forEach((x) => x.classList.toggle('on', x === b)); break; }
    case 'offAccetta': accettaOfferta(b.dataset.id); break;
    case 'offRilancia': rilancia(b.dataset.id); break;
    case 'offRifiuta': rifiutaOfferta(b.dataset.id); break;
    case 'ingaggia': ingaggia(b.dataset.id); break;
    case 'staffInfo': schedaStaff(b.dataset.id); break;
    case 'licenzia': chiedi('Vuoi davvero licenziarlo? Dovrai pagargli una buonuscita.', () => { licenzia(b.dataset.k); }); break;
    case 'squadraPronta': squadraPronta(); break;
    case 'ricerca': { const c = costoRicerca(); if (S.soldi < c) return avviso('Non hai abbastanza soldi'); movimento('altro', -c, 'Nuova ricerca di mercato'); genMercato(); salva(); disegna(); avviso('Nuovi giocatori al mercato!'); break; }
    case 'costruisci': costruisci(b.dataset.k); break;
    case 'restaura': restaura(); break;
    case 'prestitoBanca': prendiPrestito(+v); break;
    case 'estingui': estingui(b.dataset.id); break;
    case 'prezzo': { const P = prezziDi(); P[b.dataset.k] = clamp(Math.round((P[b.dataset.k] + +v) * 100) / 100, 0.3, 3); salva(); disegna(); break; }
    case 'modulo': S.tattica.mod = v; S.tattica.tit = null; aggiornaMioSlot(); salva(); disegna(); break;
    case 'ment': S.tattica.ment = +v; aggiornaMioSlot(); salva(); disegna(); break;
    case 'tat': S.tattica[b.dataset.k] = b.dataset.k === 'stile' ? v : +v; aggiornaMioSlot(); salva(); disegna(); break;
    case 'autoForm': S.tattica.tit = null; aggiornaMioSlot(); salva(); disegna(); break;
    case 'slot': sceltaSlot(+b.dataset.k); break;
    case 'metti': metti(+b.dataset.k, b.dataset.id); break;
    case 'allenInt': S.allen.int = +v; salva(); disegna(); break;
    case 'allenPreset': S.allen.sett = ({ eq: ['atletico', 'tecnico', 'tattico', 'collettivo', 'recupero'], dur: ['atletico', 'atletico', 'tecnico', 'tattico', 'collettivo'], tec: ['tecnico', 'tecnico', 'tattico', 'tecnico', 'recupero'], rip: ['recupero', 'tecnico', 'riposo', 'tattico', 'recupero'] })[v]; salva(); disegna(); avviso('Programma cambiato'); break;
    case 'scout': scoutGiovani(+v); break;
    case 'giovIngaggia': ingaggiaGiovane(b.dataset.id); break;
    case 'promuovi': promuovi(b.dataset.id); break;
    case 'giovVia': chiedi('Vuoi lasciarlo andare?', () => svincolaGiovane(b.dataset.id)); break;
    case 'segOpz': S.opz[b.dataset.k] = b.dataset.k === 'vel' ? +v : v; salva(); disegna(); break;
    case 'notizieTipo': sottoschermo.notTipo = v; disegna(); break;
    case 'rivedi': if (S.ultima){ const rep = S.ultima; chiudiFoglio(true); mostraPartita(rep, () => { disegna(); mostraPendenti(); }); } break;
    case 'ultimaRep': if (S.ultima) mostraRisultati(S.ultima, null); break;
    case 'codice': chiediCodice(); break;
    case 'segreto': segreto(v); break;
    case 'apriProgetto': sottoschermo.progetto = !sottoschermo.progetto; disegna(); break;
    case 'design': { S.stadio.design = Object.assign({}, S.stadio.design || {}); const k = b.dataset.k; S.stadio.design[k] = ['forma'].includes(k) ? +v : ['scritta', 'bandiere', 'fumogeni', 'notte'].includes(k) ? v === '1' : v; salva(); disegna(); break; }
    case 'suono': S.opz.suono = !S.opz.suono; Suono.on = S.opz.suono; salva(); menu(); break;
    case 'comeSiGioca': comeSiGioca(); break;
    case 'salvataggi': salvataggi(); break;
    case 'slotSalva': if (scriviSlot(v)){ avviso('Partita salvata nello slot ' + v); salvataggi(); } else avviso('Non c’è spazio per salvare'); break;
    case 'slotCarica': chiedi('Vuoi caricare questo salvataggio? La partita di adesso verrà sostituita.', () => { const x = leggiSlot(v); if (!x) return; const ospite = S.ospite; S = x.dati; S.ospite = ospite; migra(); salva(true); schermo = 'home'; disegna(); avviso('Partita caricata!'); }); break;
    case 'esporta': { const c = codiceDi(S); foglio(`<h2>${ic('copia')} Codice della partita</h2><p class="nota">Copialo e incollalo su un altro telefono (Menu → Salvataggi → Incolla un codice).</p><textarea id="codTxt" class="cod" readonly>${c}</textarea><div class="riga-btn"><button class="btn" id="codCopia">Copia</button><button class="btn sec" data-a="salvataggi">Indietro</button></div>`); $('#codCopia').onclick = () => { const t = $('#codTxt'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(() => avviso('Codice copiato!')).catch(() => { try { document.execCommand('copy'); avviso('Codice copiato!'); } catch (x) { avviso('Tieni premuto sul testo per copiarlo'); } }); }; break; }
    case 'importa': foglio(`<h2>${ic('cartella')} Incolla un codice</h2><textarea id="codIn" class="cod" placeholder="Incolla qui il codice della partita"></textarea><p class="rosso" id="codErr"></p><div class="riga-btn"><button class="btn" id="codOk">Carica la partita</button><button class="btn sec" data-a="salvataggi">Indietro</button></div>`); $('#codOk').onclick = () => { const s = daCodice($('#codIn').value); if (!s) return ($('#codErr').textContent = 'Il codice non è giusto'); const ospite = S.ospite; S = s; S.ospite = ospite; migra(); salva(true); chiudiFoglio(true); schermo = 'home'; disegna(); avviso('Partita caricata: ' + S.club.nome); }; break;
    case 'installa': foglio(`<h2>Metti l’app sul telefono</h2><div class="guida"><p><b>Android (Chrome):</b> tocca i tre puntini in alto a destra e poi «Installa app» o «Aggiungi a schermata Home».</p><p><b>iPhone (Safari):</b> tocca il quadrato con la freccia in basso e poi «Aggiungi alla schermata Home».</p><p>Così Calciomania PM si apre come una vera app, a schermo intero.</p></div><button class="btn largo" data-a="chiudi">Ok</button>`); break;
    case 'ricomincia': chiedi('Vuoi cancellare la tua società e ricominciare da capo?', () => { if (S.lega.online && window.Online) Online.esci().catch(() => {}); try { if (!S.ospite) localStorage.removeItem(CHIAVE); } catch (e) {} S = null; chiudiFoglio(true); schermataIniziale(); }); break;
    case 'modClub': chiudiFoglio(true); fondazione(true); break;
    case 'continua': S = carica(); if (!S) return schermataIniziale(); migra(); Suono.on = S.opz.suono; schermo = 'home'; disegna(); if (S.lega.online) caricaOnline().then(() => Online.riprendi()).catch(() => {}); mostraPendenti(); break;
    case 'fonda': fondazione(false, false); break;
    case 'ospite': fondazione(false, true); break;
    case 'indietroIntro': schermataIniziale(); break;
    case 'fcol': fondazione.leggi(); bozza[b.dataset.k] = v; if (bozza.kit && b.dataset.k === 'c1'){ bozza.kit[0].c1 = v; bozza.kit[1].c2 = v; } if (bozza.kit && b.dataset.k === 'c2') bozza.kit[0].c2 = v; fondazione.draw(); break;
    case 'fopz': bozza[b.dataset.k] = +v; fondazione.draw(); break;
    case 'fkit': bozza.kit[+b.dataset.k][b.dataset.c] = b.dataset.c === 't' ? +v : v; fondazione.draw(); break;
    case 'creaClub': { if (!pulisciBozza()) return; nuovaSocieta(Object.assign({}, bozza)); schermo = 'home'; disegna(); coriandoli([bozza.c1, bozza.c2, '#d4af37'], 160); Suono.fanfara(); setTimeout(comeSiGioca, 900); break; }
    case 'salvaClub': { if (!pulisciBozza()) return; const st = bozza.stadio; delete bozza.stadio; delete bozza.ospite; S.club = Object.assign({}, bozza); S.stadio.design = Object.assign({}, S.stadio.design || {}, { nome: st }); aggiornaMioSlot(); if (S.lega.online && window.Online) Online.aggiornaSquadra(mioSlot()); salva(); disegna(); avviso('Club aggiornato!'); break; }
    case 'annullaClub': disegna(); break;
    case 'loginGoogle': caricaOnline().then(() => Online.loginGoogle()).catch((er) => avviso((er && er.message) || 'Non riesco ad entrare')); break;
    case 'loginEmail': case 'introLogin': caricaOnline().then(() => Online.finestraLogin()).catch((er) => avviso((er && er.message) || 'Non riesco a collegarmi')); break;
    case 'logout': if (S.lega.online) return avviso('Prima torna a giocare da solo'); Online.logout(); chiudiFoglio(true); disegna(); avviso('Sei uscito dall’account'); break;
    case 'vaiOnline': if (S.ospite) return avviso('Prima entra nel tuo account'); chiedi('La stagione in corso ricomincia in un girone online. Va bene?', () => { chiudiFoglio(true); Online.vaiOnline(); }); break;
    case 'esciOnline': chiedi('Vuoi lasciare il girone online? Il tuo posto torna a un bot.', () => { chiudiFoglio(true); Online.esci().then(() => { nuovaLegaLocale(S.tier); salva(true); disegna(); avviso('Ora giochi da solo'); }).catch((er) => avviso(er.message || 'Errore')); }); break;
  }
});

// ---------- partite vecchie: aggiunge tutto quello che serve alle cose nuove ----------
function migra(){
  if (!S) return;
  S.pendenti = S.pendenti || []; S.opz = Object.assign({ suono: true, vel: 2 }, S.opz || {}); S.soldiStoria = S.soldiStoria || [S.soldi];
  S.notizie = (S.notizie || []).map((n) => n.tipo ? n : { t: n.t, tipo: VECCHI_ICO[n.ico] || 'societa', gio: pick(GIORNALI), s: n.s, g: n.g });
  if ((S.v || 1) < 2){
    if (S.tattica && S.tattica.ment != null && S.tattica.ment <= 2) S.tattica.ment = S.tattica.ment + 1;
    S.v = 2;
  }
  S.tattica = Object.assign({ mod: '4-4-2', ment: 2, stile: 'equi', press: 1, linea: 1, tit: null, ist: {} }, S.tattica || {});
  if (!MODULI[S.tattica.mod]) S.tattica.mod = '4-4-2';
  S.stadio = Object.assign({ tribune: 0, campo: 0, spogl: 0, luci: 0, negozio: 0, giov: 0, maxi: 0, park: 0, centro: 0, usura: 92, cantieri: [] }, S.stadio || {});
  const giocatore = (p) => { Object.entries({ naz: 'IT', mor: 70, fm: 6, voti: [], squal: 0, ass: 0, amm: 0, esp: 0, contr: 2, inf: 0, gol: 0, pres: 0 }).forEach(([k, x]) => { if (p[k] == null) p[k] = Array.isArray(x) ? [] : x; }); };
  (S.rosa || []).forEach(giocatore);
  Object.entries({ allen: allenDefault(), prezzi: { bigl: 1, abb: 1 }, conti: {}, movimenti: [], intesa: 55, prep: 55, giovanili: [], scoutGiov: [], debiti: [], offerte: [], inPrestito: [], svincolati: [], storico: [], trofei: [], risultati: [] })
    .forEach(([k, x]) => { if (S[k] == null) S[k] = x; });
  S.giovanili.forEach(giocatore);
  Object.values(S.staff || {}).forEach((s) => { if (!s.att) s.att = (STAFF_ATT[s.k] || [1, 2, 3]).map(() => clamp(Math.round(s.liv * 3.4), 1, 20)); if (!s.naz) s.naz = 'IT'; });
  if (!S.svincolati.length && S.mercato) S.svincolati = [];
  (S.mercato.lista || []).forEach((p) => { giocatore(p); if (!p.chiede) p.chiede = p.prezzo; });
  if (S.club && !S.club.kit) S.club.kit = [{ t: 1, c1: S.club.c1, c2: S.club.c2 }, { t: 0, c1: '#f8fafc', c2: S.club.c1 }];
  if (S.club && !S.club.sigla) S.club.sigla = iniziali(S.club.nome).slice(0, 4).toUpperCase();
  if (S.club && S.club.amb == null) S.club.amb = 1;
  // la lega da solo deve essere della categoria giusta (se l'amministratrice l'ha cambiata)
  if (S.lega && !S.lega.online && S.lega.dati && S.lega.dati.tier !== S.tier) nuovaLegaLocale(S.tier);
  if (S.ultima && S.ultima.marcatori == null) S.ultima = null;
  aggiornaMioSlot();
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
