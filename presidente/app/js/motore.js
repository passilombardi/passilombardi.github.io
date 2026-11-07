/* =========================================================
   PRESIDENTE PM — MOTORE
   Dati del gioco, giocatori, staff, stadio, partite e gironi.
   Lo stesso girone ("dati") serve sia da soli (bot) sia online:
   le squadre "bot" vengono sostituite dalle persone vere.
   ========================================================= */
'use strict';

// ---------- numeri casuali ----------
function hashStr(s){ s = String(s); let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++){ h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^ h >>> 16) >>> 0; }
function rng(seed){ let a = typeof seed === 'number' ? seed >>> 0 : hashStr(seed); return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RND = Math.random;
const pick = (a, r = RND) => a[Math.floor(r() * a.length)];
const ri = (a, b, r = RND) => a + Math.floor(r() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = (r = RND) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const uid = () => Date.now().toString(36) + Math.floor(RND() * 1e9).toString(36);

// ---------- soldi ----------
function euro(n){ n = Math.round(n); return (n < 0 ? '−' : '') + '€ ' + Math.abs(n).toLocaleString('it-IT'); }
function euroBreve(n){ const s = n < 0 ? '−' : ''; n = Math.abs(n);
  if (n >= 1e6) return s + '€ ' + (n / 1e6).toLocaleString('it-IT', { maximumFractionDigits: n >= 1e8 ? 0 : 1 }) + ' mln';
  if (n >= 1e4) return s + '€ ' + Math.round(n / 1e3).toLocaleString('it-IT') + ' mila';
  return s + '€ ' + Math.round(n).toLocaleString('it-IT'); }
const tondo = (n) => { if (n < 1000) return Math.round(n / 10) * 10; const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };

// ---------- i campionati: dalla Terza Categoria alla Serie A ----------
const TIERS = [
  { nome: 'Terza Categoria',   breve: '3ª Cat.',   sponsor: 2500,    tv: 0,       prezzo: 5,  premio: 30000,    pubblico: 120,   colore: '#9ca3af' },
  { nome: 'Seconda Categoria', breve: '2ª Cat.',   sponsor: 4000,    tv: 0,       prezzo: 6,  premio: 50000,    pubblico: 200,   colore: '#a3a3a3' },
  { nome: 'Prima Categoria',   breve: '1ª Cat.',   sponsor: 7000,    tv: 0,       prezzo: 8,  premio: 90000,    pubblico: 350,   colore: '#b45309' },
  { nome: 'Promozione',        breve: 'Promoz.',   sponsor: 18000,   tv: 0,       prezzo: 10, premio: 150000,   pubblico: 600,   colore: '#c2410c' },
  { nome: 'Eccellenza',        breve: 'Eccell.',   sponsor: 35000,   tv: 5000,    prezzo: 12, premio: 300000,   pubblico: 1000,  colore: '#0e7490' },
  { nome: 'Serie D',           breve: 'Serie D',   sponsor: 70000,   tv: 15000,   prezzo: 15, premio: 600000,   pubblico: 2000,  colore: '#1d4ed8' },
  { nome: 'Serie C',           breve: 'Serie C',   sponsor: 160000,  tv: 60000,   prezzo: 18, premio: 1500000,  pubblico: 5000,  colore: '#7c3aed' },
  { nome: 'Serie B',           breve: 'Serie B',   sponsor: 450000,  tv: 250000,  prezzo: 22, premio: 5000000,  pubblico: 12000, colore: '#be123c' },
  { nome: 'Serie A',           breve: 'Serie A',   sponsor: 1200000, tv: 1500000, prezzo: 30, premio: 20000000, pubblico: 30000, colore: '#d4a017' }
];
const TOP = TIERS.length; // livello 1..9
const tierMedia = (t) => 26 + (t - 1) * 6.5; // bravura media dei giocatori in quel campionato
const SQUADRE_GIRONE = 12;
const PROMOSSE = 2, RETROCESSE = 2;

// ---------- nomi inventati ----------
const NOMI = ['Marco','Luca','Andrea','Matteo','Davide','Simone','Federico','Lorenzo','Alessandro','Francesco','Giorgio','Riccardo','Stefano','Paolo','Nicola','Tommaso','Gabriele','Edoardo','Filippo','Pietro','Daniele','Emanuele','Giacomo','Leonardo','Samuele','Michele','Fabio','Mattia','Diego','Cristian','Enrico','Alberto','Antonio','Giuseppe','Salvatore','Vincenzo','Raffaele','Elia','Jacopo','Manuel','Kevin','Ivan','Omar','Yusuf','Mateo','Lucas','Tiago','Nikola','Jonas','Malik','Sami','Ilias','Adam','Noah','Dario','Bruno','Carlo','Walter','Sergio','Ettore','Ruben','Hugo','Iker','Felipe','Kofi','Amadou','Sven','Lars','Milan','Luka'];
const COGNOMI = ['Bertoli','Carraro','Galbiati','Fumagalli','Brambilla','Colombo','Mantovani','Pellegrini','Vitale','Gatti','Riva','Sala','Testa','Ferrario','Bonfanti','Castelli','Moretti','Fontana','Lombardi','Marchesi','Valsecchi','Zanetti','Bassi','Rinaldi','Ghezzi','Cattaneo','Longhi','Monti','Parisi','Ruggeri','Sartori','Tosi','Villa','Arnaboldi','Bellini','Corti','Donati','Fabbri','Guidi','Leone','Magni','Negri','Orlandi','Pagani','Quadri','Rota','Sironi','Tagliabue','Uboldi','Vergani','Zappa','Alberti','Barzaghi','Crippa','Dossena','Erba','Frigerio','Gorla','Invernizzi','Locatelli','Meroni','Nava','Oggioni','Perego','Redaelli','Spinelli','Terraneo','Usuelli','Viganò','Zucchi','Keller','Novak','Silva','Mendes','Diallo','Traoré','Larsen','Kovač','Petrov','Moreau','Ortega','Lindqvist','Okafor','Haddad','Weber','Costa','Duarte','Rahimi','Berg','Horvat'];
const PRE_PAESE = ['Borgo','Castel','Monte','San','Villa','Ponte','Rocca','Valle','Poggio','Pieve','Torre','Colle','Riva','Campo','Porto','Prato','Fonte','Serra','Bosco','Sasso'];
const RAD_PAESE = ['verde','fiore','alto','chiaro','bello','franco','lungo','rosso','nuovo','sereno','dorato','azzurro','forte','marino','lucente','argento','querce','cielo','sole','vento','rame','olmo','lago','pino'];
const PREF_CLUB = [['ASD','Pol.','US','GS','Oratorio','Virtus','Sporting','Atletico','Real'],['ASD','US','Virtus','Sporting','Atletico','Real','Unione','Pro'],['FC','AC','Calcio','Sporting','Atletico','Real','Unione','Dinamo','Olimpia','Inter']];
const COLORI = ['#e11d48','#dc2626','#ea580c','#f59e0b','#facc15','#84cc16','#16a34a','#059669','#0d9488','#0891b2','#0284c7','#2563eb','#1e3a8a','#4f46e5','#7c3aed','#9333ea','#c026d3','#db2777','#111827','#f8fafc','#78350f','#6b7280'];

function nomePaese(r = RND){
  const t = r();
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  if (t < 0.35) return pick(PRE_PAESE, r) + ' ' + cap(pick(RAD_PAESE, r));
  if (t < 0.7) return pick(PRE_PAESE, r) + pick(RAD_PAESE, r);
  return pick(['Val','Mont','Castel','Roc','Port'], r) + pick(RAD_PAESE, r);
}
function nomeClub(tier, r = RND){
  const lista = PREF_CLUB[tier <= 3 ? 0 : tier <= 6 ? 1 : 2];
  const paese = nomePaese(r).replace(/\s+/g, ' ');
  const p = pick(lista, r);
  if (r() < 0.12 && tier >= 5) return paese + ' ' + ri(1900, 1985, r);
  return p + ' ' + paese;
}
function stemmaCasuale(r = RND){
  let c1 = pick(COLORI, r), c2 = pick(COLORI, r); while (c2 === c1) c2 = pick(COLORI, r);
  return { c1, c2, st: ri(0, 3, r), pat: ri(0, 4, r), sim: ri(0, 6, r) };
}

// ---------- giocatori ----------
const RUOLI = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };
const RUOLI_PL = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };
function valoreDi(p){
  let m = p.eta <= 21 ? 1.25 + Math.max(0, p.pot - p.val) / 40 : p.eta <= 29 ? 1 : p.eta <= 32 ? 0.7 : 0.45;
  return tondo(2000 * Math.pow(1.13, p.val - 20) * m);
}
const stipDi = (p) => tondo(60 + 2000 * Math.pow(1.13, p.val - 20) / 115);
function nuovoGiocatore(tier, o = {}){
  const r = o.r || RND;
  const ruolo = o.ruolo || pick(['P','D','D','D','C','C','C','A','A'], r);
  const eta = o.eta || clamp(Math.round(25 + gauss(r) * 4.5), 16, 36);
  let val = Math.round(tierMedia(tier) + (o.bonus || 0) + gauss(r) * (o.spread || 6));
  val = clamp(val, 12, 94);
  let pot = val + (eta <= 19 ? ri(6, 24, r) : eta <= 22 ? ri(3, 16, r) : eta <= 26 ? ri(0, 7, r) : 0);
  pot = clamp(pot, val, 97);
  const p = { id: uid() + ri(0, 999, r), n: pick(NOMI, r), c: pick(COGNOMI, r), r: ruolo, eta, val, pot, forma: ri(85, 100, r), inf: 0, gol: 0, pres: 0, num: 0 };
  p.prezzo = valoreDi(p); p.stip = stipDi(p);
  return p;
}
const nomeG = (p) => p.n.charAt(0) + '. ' + p.c;
const efficienza = (p) => p.val * (0.72 + 0.28 * p.forma / 100);

// ---------- staff ----------
const STAFF = [
  { k: 'all', nome: 'Allenatore',            ico: '📋', eff: 'Più forte tutta la squadra',            obbl: true },
  { k: 'vice', nome: 'Vice allenatore',      ico: '🗒️', eff: 'Aiuta l’allenatore e i giovani a crescere' },
  { k: 'atl', nome: 'Preparatore atletico',  ico: '🏃', eff: 'Giocatori meno stanchi e meno infortuni' },
  { k: 'por', nome: 'Preparatore portieri',  ico: '🧤', eff: 'Portiere più bravo' },
  { k: 'med', nome: 'Medico',                ico: '🩺', eff: 'Guarigioni più veloci' },
  { k: 'oss', nome: 'Osservatore',           ico: '🔭', eff: 'Trova giocatori migliori al mercato' },
  { k: 'ds',  nome: 'Direttore sportivo',    ico: '💼', eff: 'Compri a meno e vendi a più' }
];
const STAFF_STIP = [0, 150, 500, 1800, 6000, 20000];
function nuovoStaff(k, liv, r = RND){
  const stip = tondo(STAFF_STIP[liv] * (0.85 + r() * 0.3));
  return { id: uid(), k, nome: pick(NOMI, r) + ' ' + pick(COGNOMI, r), liv, stip, ingaggio: tondo(stip * 12), eta: ri(32, 66, r) };
}
const livStaff = (S, k) => (S.staff[k] ? S.staff[k].liv : 0);

// ---------- stadio ----------
const STADIO = [
  { k: 'tribune', nome: 'Tribune', ico: '🏟️', eff: 'Più posti = più spettatori e più incassi',
    livelli: ['Solo una rete intorno al campo','Gradinata in legno','Tribuna coperta','Due tribune','Quattro tribune','Stadio comunale','Stadio a due anelli','Stadio moderno','Grande stadio','Stadio leggendario'],
    posti: [100, 300, 800, 2000, 5000, 10000, 20000, 35000, 55000, 80000],
    costi: [0, 40000, 120000, 350000, 1000000, 3000000, 8000000, 20000000, 45000000, 90000000], tempi: [0, 1, 2, 2, 3, 3, 4, 5, 6, 6] },
  { k: 'campo', nome: 'Campo', ico: '🌱', eff: 'In casa giochi meglio e ti fai meno male',
    livelli: ['Terra battuta','Erba sintetica','Erba naturale','Erba ibrida','Erba ibrida riscaldata'],
    costi: [0, 60000, 200000, 1500000, 6000000], tempi: [0, 1, 2, 3, 3] },
  { k: 'spogl', nome: 'Spogliatoi', ico: '🚿', eff: 'Morale più alto e giocatori più riposati',
    livelli: ['Container','Spogliatoi semplici','Spogliatoi con docce calde','Spogliatoi con palestra','Spogliatoi di lusso con spa'],
    costi: [0, 30000, 150000, 800000, 4000000], tempi: [0, 1, 1, 2, 3] },
  { k: 'luci', nome: 'Illuminazione', ico: '💡', eff: 'Partite la sera: più pubblico',
    livelli: ['Niente luci','Fari semplici','Torri faro','Luci LED da spettacolo'],
    costi: [0, 50000, 400000, 3000000], tempi: [0, 1, 2, 3] },
  { k: 'negozio', nome: 'Bar e negozio', ico: '🛍️', eff: 'Ogni spettatore spende di più',
    livelli: ['Niente','Chiosco','Bar e magliette','Negozio ufficiale','Megastore e ristorante'],
    costi: [0, 25000, 200000, 1500000, 8000000], tempi: [0, 1, 1, 2, 3] },
  { k: 'giov', nome: 'Centro giovanile', ico: '🧒', eff: 'Ogni anno arrivano ragazzi forti gratis',
    livelli: ['Niente','Scuola calcio','Settore giovanile','Accademia','Accademia d’élite'],
    costi: [0, 80000, 400000, 2500000, 10000000], tempi: [0, 2, 2, 3, 4] },
  { k: 'maxi', nome: 'Maxischermo', ico: '📺', eff: 'Più tifosi e più spettacolo',
    livelli: ['Niente','Tabellone luminoso','Maxischermo gigante'],
    costi: [0, 150000, 2000000], tempi: [0, 1, 2] },
  { k: 'park', nome: 'Parcheggio', ico: '🅿️', eff: 'Più facile arrivare: più pubblico',
    livelli: ['Prato','Parcheggio sterrato','Parcheggio grande','Parcheggio multipiano'],
    costi: [0, 40000, 300000, 2000000], tempi: [0, 1, 2, 3] }
];
const STADIO_K = Object.fromEntries(STADIO.map((s) => [s.k, s]));
const postiStadio = (S) => STADIO_K.tribune.posti[S.stadio.tribune];
const costoRestauro = (S) => tondo(1500 + STADIO_K.tribune.costi[S.stadio.tribune] * 0.012 * (100 - S.stadio.usura) / 40 + 200 * (100 - S.stadio.usura));

// ---------- moduli ----------
const MODULI = { '4-4-2': [4, 4, 2], '4-3-3': [4, 3, 3], '3-5-2': [3, 5, 2], '4-2-3-1': [4, 5, 1], '5-3-2': [5, 3, 2], '3-4-3': [3, 4, 3] };
const MENTALITA = ['Difensiva', 'Equilibrata', 'Offensiva'];

// ---------- calendario (girone di andata e ritorno) ----------
function calendario(n){
  const t = Array.from({ length: n }, (_, i) => i);
  const andata = [];
  for (let r = 0; r < n - 1; r++){
    const g = [];
    for (let i = 0; i < n / 2; i++){
      const a = t[i], b = t[n - 1 - i];
      g.push(i === 0 ? (r % 2 ? [b, a] : [a, b]) : (i % 2 ? [b, a] : [a, b]));
    }
    andata.push(g);
    t.splice(1, 0, t.pop());
  }
  return andata.concat(andata.map((g) => g.map(([a, b]) => [b, a])));
}
const giornateTot = (n) => 2 * (n - 1);

// ---------- partita ----------
// forza = {por, dif, cen, att}. Il risultato: gol, minuti dei gol, possesso, tiri.
function simPartita(r, fH, fA, bonusCasa = 2.5){
  const attH = fH.att * 0.7 + fH.cen * 0.3 + bonusCasa, defH = fH.dif * 0.65 + fH.por * 0.35 + bonusCasa;
  const attA = fA.att * 0.7 + fA.cen * 0.3,            defA = fA.dif * 0.65 + fA.por * 0.35;
  const mid = fH.cen - fA.cen;
  const lH = clamp(1.35 * Math.exp((attH - defA) / 15 + mid / 70), 0.1, 6);
  const lA = clamp(1.35 * Math.exp((attA - defH) / 15 - mid / 70), 0.1, 6);
  const mh = [], ma = [];
  const rec = ri(1, 5, r);
  for (let m = 1; m <= 90 + rec; m++){
    if (r() < lH / 93) mh.push(Math.min(m, 90 + rec));
    if (r() < lA / 93) ma.push(Math.min(m, 90 + rec));
  }
  const pos = Math.round(clamp(50 + mid * 0.9 + bonusCasa, 24, 76));
  return { gh: mh.length, ga: ma.length, mh, ma, pos, th: mh.length + ri(2, 4, r) + Math.round(lH * 3 * r()), ta: ma.length + ri(1, 4, r) + Math.round(lA * 3 * r()), rec };
}

// ---------- girone ----------
function forzaBot(tier, r){
  const base = tierMedia(tier) + (r() - 0.5) * 13;
  return { por: Math.round(base + gauss(r) * 3), dif: Math.round(base + gauss(r) * 3), cen: Math.round(base + gauss(r) * 3), att: Math.round(base + gauss(r) * 3) };
}
function nuovoBot(tier, r = RND){
  return Object.assign({ tipo: 'bot', uid: '', nome: nomeClub(tier, r), forza: forzaBot(tier, r), campo: Math.min(4, Math.floor(tier / 2.5)), pronto: -1 }, stemmaCasuale(r), statoZero());
}
const statoZero = () => ({ pt: 0, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, f: '' });
function nuovoGirone(tier, nomeGirone, r = RND){
  const squadre = [];
  for (let i = 0; i < SQUADRE_GIRONE; i++) squadre.push(nuovoBot(tier, r));
  return { nome: nomeGirone || 'Girone A', tier, n: SQUADRE_GIRONE, stagione: 1, giornata: 0, squadre, ris: {}, scad: 0, prev: null, attesa: [], seed: uid() };
}
const umani = (d) => d.squadre.filter((s) => s.tipo === 'umano');
function ordina(squadre){
  return squadre.map((s, i) => Object.assign({ i }, s)).sort((a, b) => b.pt - a.pt || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf || a.nome.localeCompare(b.nome));
}
function posizioneDi(d, i){ return ordina(d.squadre).findIndex((s) => s.i === i) + 1; }

// gioca la prossima giornata del girone (modifica d). Ritorna i risultati.
function giocaGiornataDati(d){
  const g = d.giornata;
  const cal = calendario(d.n)[g];
  const ris = cal.map(([h, a]) => {
    const H = d.squadre[h], A = d.squadre[a];
    const m = simPartita(rng(d.seed + '|' + d.stagione + '|' + g + '|' + h + '-' + a), H.forza, A.forza, 2 + (H.campo || 0) * 0.6);
    return { h, a, gh: m.gh, ga: m.ga, mh: m.mh, ma: m.ma, pos: m.pos, th: m.th, ta: m.ta, rec: m.rec };
  });
  ris.forEach((x) => {
    const H = d.squadre[x.h], A = d.squadre[x.a];
    H.g++; A.g++; H.gf += x.gh; H.gs += x.ga; A.gf += x.ga; A.gs += x.gh;
    if (x.gh > x.ga){ H.v++; A.p++; H.pt += 3; H.f = (H.f + 'V').slice(-5); A.f = (A.f + 'P').slice(-5); }
    else if (x.gh < x.ga){ A.v++; H.p++; A.pt += 3; A.f = (A.f + 'V').slice(-5); H.f = (H.f + 'P').slice(-5); }
    else { H.n++; A.n++; H.pt++; A.pt++; H.f = (H.f + 'N').slice(-5); A.f = (A.f + 'N').slice(-5); }
  });
  d.ris[g] = ris;
  d.giornata++;
  // i bot cambiano un pochino di forma durante l'anno
  const r = rng(d.seed + 'forma' + d.stagione + g);
  d.squadre.forEach((s) => { if (s.tipo === 'bot'){ const k = pick(['por','dif','cen','att'], r); s.forza[k] = clamp(s.forza[k] + ri(-1, 1, r), 10, 99); } });
  if (d.giornata >= giornateTot(d.n)) chiudiStagioneDati(d);
  return ris;
}

// fine stagione: salva la classifica finale, le persone che salgono o scendono lasciano il posto a un bot,
// chi era in lista d'attesa (Serie A piena) entra e il girone si allunga.
function chiudiStagioneDati(d){
  const tab = ordina(d.squadre).map((s, k) => ({ i: s.i, pos: k + 1, tipo: s.tipo, uid: s.uid, nome: s.nome, c1: s.c1, c2: s.c2, st: s.st, pat: s.pat, sim: s.sim, pt: s.pt, g: s.g, v: s.v, n: s.n, p: s.p, gf: s.gf, gs: s.gs }));
  d.prev = { stagione: d.stagione, n: d.n, tier: d.tier, tab, ris: d.ris };
  const r = rng(d.seed + 'nuova' + d.stagione);
  tab.forEach((t) => {
    const s = d.squadre[t.i];
    const sale = t.pos <= PROMOSSE && d.tier < TOP, scende = t.pos > d.n - RETROCESSE && d.tier > 1;
    if (s.tipo === 'umano' && (sale || scende)) d.squadre[t.i] = nuovoBot(d.tier, r);
  });
  (d.attesa || []).forEach((w) => d.squadre.push(Object.assign({}, w, { tipo: 'umano', pronto: -1 })));
  d.attesa = [];
  if (d.squadre.length % 2) d.squadre.push(nuovoBot(d.tier, r));
  d.n = d.squadre.length;
  d.squadre.forEach((s) => { Object.assign(s, statoZero()); if (s.tipo === 'bot'){ s.forza = forzaBot(d.tier, r); } s.pronto = -1; });
  d.stagione++; d.giornata = 0; d.ris = {};
}
