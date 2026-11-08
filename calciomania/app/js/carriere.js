// ---------- le tre carriere: presidente, allenatore, giocatore ----------
// Con lo stesso account (o da ospite) si possono avere tutte e tre. Ognuna si salva per conto suo.
const CARRIERE = {
  presidente: { nome: 'Presidente', ico: 'corona', desc: 'Fondi la tua società: soldi, stadio, mercato, staff e squadra sono tutti tuoi.' },
  allenatore: { nome: 'Allenatore', ico: 'tattica', desc: 'Scegli una panchina: formazione, tattica, allenamenti e mercato con il budget della società. Se perdi troppo ti esonerano!' },
  giocatore:  { nome: 'Giocatore',  ico: 'pallone', desc: 'Crea il tuo calciatore: allenati, gioca le partite, segna e fatti comprare dalle squadre più forti.' }
};
const modo = () => (S && S.modo) || 'presidente';
const chiaveDi = (m) => !m || m === 'presidente' ? 'presidentepm-v1' : 'calciomania-' + m;
function carrieraAttiva(){ try { return localStorage.getItem('calciomania-attiva') || 'presidente'; } catch (e) { return 'presidente'; } }
function segnaAttiva(m){ try { localStorage.setItem('calciomania-attiva', m); } catch (e) {} }
const _ospiti = {};
function leggiCarriera(m){
  if (S && S.ospite) return _ospiti[m] || null;
  let c = null;
  try { const t = localStorage.getItem(chiaveDi(m)); c = t ? JSON.parse(t) : null; } catch (e) {}
  if (!(c && c.club) && window.Online && Online.carrieraCloud) c = Online.carrieraCloud(m);
  return c && c.club ? c : null;
}
function descrCarriera(x, m){
  const T = TIERS[(x.tier || 1) - 1].nome;
  if (m === 'giocatore' && x.mio) return `${esc(x.mio.nome)} · ${esc(x.club.nome)} · ${T}`;
  if (m === 'allenatore' && x.allenatore) return `${esc(x.allenatore.nome)} allena la ${esc(x.club.nome)} · ${T}`;
  return `${esc(x.club.nome)} · ${T} · stagione ${x.stagione}`;
}
function cambiaCarriera(){
  const att = modo();
  const righe = Object.entries(CARRIERE).map(([k, c]) => {
    const x = k === att ? S : leggiCarriera(k);
    const az = k === att ? '<span class="tag tu">ORA</span>' : x ? `<button class="btn mini" data-a="carriera" data-v="${k}">${ic('play')} Gioca</button>` : `<button class="btn mini oro" data-a="nuovaCarriera" data-v="${k}">${ic('piu')} Aggiungi</button>`;
    return `<div class="car-r ${k === att ? 'on' : ''}"><span class="car-ico">${ic(c.ico)}</span><div><b>${c.nome}</b><small>${x ? descrCarriera(x, k) : 'Non ancora iniziata'}</small></div>${az}</div>`;
  }).join('');
  foglio(`<h2>${ic('utenti')} Cambia carriera</h2><p class="tenue">Con lo stesso account puoi fare tutte e tre le carriere. Ognuna si salva per conto suo e la ritrovi quando torni.</p><div class="car-lista">${righe}</div>
    <h3>${ic('piu')} Aggiungi carriera</h3><div class="car-lista">${Object.entries(CARRIERE).map(([k, c]) => `<button class="car-add" data-a="nuovaCarriera" data-v="${k}">${ic(c.ico)}<span><b>${c.nome}</b><small>${c.desc}</small></span></button>`).join('')}</div>
    <p class="nota">Se aggiungi una carriera che hai già, quella vecchia viene sostituita.</p>`, null, 'carriere-f');
}
function lasciaCarrieraAttuale(){ if (!S) return false; const osp = !!S.ospite; if (osp) _ospiti[modo()] = S; else salva(true); return osp; }
function passaA(m){
  const osp = S ? !!S.ospite : false;
  const c = leggiCarriera(m);
  if (!c) return nuovaCarriera(m, osp);
  lasciaCarrieraAttuale();
  S = c; if (osp) S.ospite = true; segnaAttiva(m); migra(); Suono.on = S.opz.suono; schermo = 'home'; sottoschermo = {};
  chiudiFoglio(true); disegna(); avviso('Carriera: ' + CARRIERE[m].nome); mostraPendenti();
}
// scelta all'inizio (dopo "Gioca come ospite" o "Fonda")
function scegliCarriera(ospite){
  foglio(`<h2>Che carriera vuoi fare?</h2><p class="tenue">Puoi farle anche tutte e tre: dalle Impostazioni userai «Cambia carriera».</p>
    <div class="car-lista">${Object.entries(CARRIERE).map(([k, c]) => `<button class="car-add grande" data-a="nuovaCarriera" data-v="${k}" data-osp="${ospite ? 1 : 0}">${ic(c.ico)}<span><b>${c.nome}</b><small>${c.desc}</small></span></button>`).join('')}</div>`, null, 'carriere-f');
}
function nuovaCarriera(m, ospite){
  if (ospite == null) ospite = S ? !!S.ospite : false;
  chiudiFoglio(true);
  if (m === 'presidente'){ lasciaCarrieraAttuale(); return fondazione(false, ospite); }
  if (m === 'allenatore') return creaAllenatoreF(ospite);
  if (m === 'giocatore') return creaGiocatoreF(ospite);
}

// ---------- offerte di squadre (per allenatore e giocatore) ----------
function clubOfferta(tier){
  const s = stemmaCasuale(), nome = nomeClub(tier);
  const amb = tier <= 2 ? pick([1, 2]) : pick([0, 1, 1, 2]);
  return Object.assign({ nome, citta: nome.replace(/^(ASD|AC|US|SS|FC|Polisportiva|Real|Atletico|Sporting|Pol\.|AS|SSD|Calcio|Unione|Virtus)\s+/i, '').replace(/\s+\d{4}$/, ''), sigla: iniziali(nome).slice(0, 4).toUpperCase(), amb, tier,
    kit: [{ t: ri(0, 5), c1: s.c1, c2: s.c2 }, { t: 0, c1: '#f8fafc', c2: s.c1 }] }, s);
}
const offerteClub = (tier, n) => Array.from({ length: n }, () => clubOfferta(clamp(tier, 1, TOP)));
function cartaOfferta(o, i, extra = ''){
  return `<button class="off-club" data-a="offSel" data-v="${i}">${stemmaSVG(o, 52, o.nome)}<span><b>${esc(o.nome)}</b><small>${TIERS[o.tier - 1].nome} · obiettivo: ${AMBIZIONI[o.amb][0].toLowerCase()}${extra}</small></span><i>${ic('check')}</i></button>`;
}

// ---------- la squadra che trovi quando arrivi (allenatore e giocatore) ----------
function rosaDiPartenza(){
  const t = S.tier, veri = t >= 8 ? mercatoVero(t, 300) : [];
  const tieni = S.rosa.filter((p) => p.io);
  S.rosa = tieni.slice();
  const ruoli = { P: 2, D: 7, C: 7, A: 4 };
  if (tieni[0]) ruoli[tieni[0].r]--;
  Object.entries(ruoli).forEach(([r, n]) => { for (let i = 0; i < n; i++){
    let p = veri.find((x) => x.r === r); if (p) veri.splice(veri.indexOf(p), 1); else p = nuovoGiocatore(t, { ruolo: r, bonus: -1, spread: 5 });
    delete p.chiede; delete p.club; p.num = numeroLibero(r); p.contr = ri(1, 3); S.rosa.push(p);
  } });
  S.tattica.tit = null; S.tattica.panc = null;
  if (modo() === 'allenatore') S.staff = { all: staffIo() };
  else S.staff = { all: nuovoStaff('all', clamp(Math.round(t / 2), 1, 5)) };
  S.staff.atl = nuovoStaff('atl', clamp(Math.round(t / 3), 1, 4)); S.staff.med = nuovoStaff('med', clamp(Math.round(t / 3), 1, 4));
  if (modo() === 'allenatore') S.soldi = budgetSocieta(t);
  S.giovanili = (S.giovanili || []).slice(0, 4);
  aggiornaMioSlot();
}
// giocatore: la società compra da sola chi manca
function completaRosaAuto(){
  const t = S.tier, serve = { P: 2, D: 6, C: 6, A: 4 };
  S.rosa.forEach((p) => { if (serve[p.r] > 0) serve[p.r]--; });
  Object.entries(serve).forEach(([r, n]) => { for (let i = 0; i < n; i++){ const p = nuovoGiocatore(t, { ruolo: r, bonus: -1, spread: 5 }); p.num = numeroLibero(r); p.contr = ri(1, 3); S.rosa.push(p); } });
  if (!S.staff.all) S.staff.all = nuovoStaff('all', clamp(Math.round(t / 2), 1, 5));
  S.rosa.forEach((p) => { if (p.squal == null) p.squal = 0; });
}

// ---------- ALLENATORE ----------
const livAllenatore = () => clamp(1 + Math.floor(((S.allenatore && S.allenatore.rep) || 0) / 20), 1, 5);
const stipAllenatore = () => tondo(STAFF_STIP[livAllenatore()] * (1 + (S.tier - 1) * 0.35));
function staffIo(){
  const A = S.allenatore || {}, liv = livAllenatore();
  return { id: 'io', k: 'all', io: true, nome: A.nome || 'Tu', naz: 'IT', liv, stip: 0, ingaggio: 0, eta: A.eta || 40, att: (STAFF_ATT.all || [1, 2, 3]).map(() => clamp(Math.round(liv * 3.4), 1, 20)), mod: S.tattica ? S.tattica.mod : '4-4-2' };
}
const budgetSocieta = (t) => tondo(260000 * Math.pow(2.05, t - 1) * soldiDiff());
let _offerte = [];
function creaAllenatoreF(ospite){
  _offerte = offerteClub(1, 3);
  const disegna_ = (sel) => foglio(`<h2>${ic('tattica')} Carriera da allenatore</h2>
    <div class="login-f"><label>Come ti chiami?</label><input id="alNome" placeholder="Nome e cognome" maxlength="32" value="${esc((document.getElementById('alNome') || {}).value || '')}"></div>
    <h3>Tre squadre di Terza Categoria ti vogliono</h3><p class="tenue">Scegli la tua prima panchina. Il presidente ti dà un budget per il mercato: i soldi della società non li gestisci tu.</p>
    <div class="off-lista">${_offerte.map((o, i) => cartaOfferta(o, i).replace('class="off-club"', `class="off-club ${sel === i ? 'on' : ''}"`)).join('')}</div>
    <p class="nota">Si parte dal livello Principiante: vinci la Serie A per salire di livello.</p>
    <button class="btn largo oro" id="alOk" ${sel == null ? 'disabled' : ''}>Firma il contratto</button>`, null, 'carriere-f');
  let sel = null; disegna_(sel);
  const lega = () => { document.querySelectorAll('[data-a=offSel]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); sel = +b.dataset.v; disegna_(sel); lega(); }); const ok = document.getElementById('alOk'); if (ok) ok.onclick = () => { const n = (document.getElementById('alNome').value || '').trim() || 'Mister'; creaAllenatore(n, _offerte[sel], ospite); }; };
  lega();
}
function creaAllenatore(nome, club, ospite){
  lasciaCarrieraAttuale();
  segnaAttiva('allenatore');
  nuovaSocieta(Object.assign({}, club, { ospite, diff: 0, modo: 'allenatore', mister: nome }));
  S.allenatore = { nome, rep: 10, esoneri: 0, conto: 0, panchine: [{ club: club.nome, tier: 1, s: 1 }] };
  S.fiducia = 60;
  rosaDiPartenza();
  S.notizie = [];
  notizia(`${nome} è il nuovo allenatore della ${club.nome}! Il presidente chiede: ${AMBIZIONI[club.amb][0].toLowerCase()}.`, 'societa');
  notizia(`La società ti dà un budget di ${euro(S.soldi)} per il mercato.`, 'mercato');
  salva(true); schermo = 'home'; chiudiFoglio(true); disegna(); Suono.fanfara(); coriandoli([club.c1, club.c2, '#d4af37'], 140);
}
// cambia squadra (esonero o nuova offerta): tieni la tua storia, la squadra è tutta nuova
function nuovaPanchina(club){
  const vecchio = S, keep = ['allenatore', 'trofei', 'storico', 'notizie', 'opz', 'stagione', 'livelli', 'codice', 'trucchi', 'modVisto', 'creato', 'pendenti'];
  nuovaSocieta(Object.assign({}, club, { ospite: vecchio.ospite, diff: vecchio.diff, modo: 'allenatore', mister: vecchio.allenatore.nome }));
  keep.forEach((k) => { if (vecchio[k] !== undefined) S[k] = vecchio[k]; });
  S.tier = club.tier; S.sponsor = nuovoSponsor(club.tier); nuovaLegaLocale(club.tier); genMercato(); genStaffMercato();
  S.fiducia = 60; S.esonerato = null; S.offerteCarriera = null;
  S.allenatore.panchine = (S.allenatore.panchine || []).concat([{ club: club.nome, tier: club.tier, s: S.stagione }]);
  rosaDiPartenza();
  notizia(`${S.allenatore.nome} firma con la ${club.nome} (${TIERS[club.tier - 1].nome})! Obiettivo: ${AMBIZIONI[club.amb][0].toLowerCase()}.`, 'societa');
  salva(true);
}
const posObiettivo = (n) => [n - 3, Math.ceil(n / 2), 2][S.club.amb == null ? 1 : S.club.amb];

// ---------- GIOCATORE ----------
const RUOLI_N = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };
const FOCUS = { tecnica: ['Tecnica', 'pallone', 'Più bravura con la palla'], fisico: ['Fisico', 'battito', 'Più forza e resistenza'], tiro: ['Tiro e parate', 'bersaglio', 'Più gol (o più parate)'], riposo: ['Riposo', 'cuore', 'Recuperi energia e morale'] };
let _gBozza = null;
function creaGiocatoreF(ospite){
  _offerte = offerteClub(1, 3);
  _gBozza = _gBozza || { n: '', c: '', r: 'A', naz: 'IT', num: 9, pelle: 0 };
  let sel = null;
  const disegna_ = () => {
    const b = _gBozza;
    foglio(`<h2>${ic('pallone')} Carriera da giocatore</h2>
    <div class="login-f"><label>Nome</label><input id="gN" maxlength="18" value="${esc(b.n)}" placeholder="Nome"><label>Cognome</label><input id="gC" maxlength="20" value="${esc(b.c)}" placeholder="Cognome"></div>
    <div class="scelta"><span>Ruolo</span><div class="seg">${Object.entries(RUOLI_N).map(([k, n]) => `<button class="${b.r === k ? 'on' : ''}" data-gr="${k}">${n}</button>`).join('')}</div></div>
    <div class="scelta"><span>Numero di maglia</span><div class="login-f"><input id="gNum" type="number" min="1" max="99" value="${b.num}"></div></div>
    <div class="scelta"><span>Nazionalità</span><div class="login-f"><select id="gNaz">${Object.entries(NAZIONI).map(([k, x]) => `<option value="${k}" ${b.naz === k ? 'selected' : ''}>${x.f} ${x.n}</option>`).join('')}</select></div></div>
    <h3>Tre squadre di Terza Categoria ti vogliono</h3><p class="tenue">Hai 17 anni e tanta voglia. Gioca bene e le squadre più forti ti compreranno.</p>
    <div class="off-lista">${_offerte.map((o, i) => cartaOfferta(o, i).replace('class="off-club"', `class="off-club ${sel === i ? 'on' : ''}"`)).join('')}</div>
    <button class="btn largo oro" id="gOk" ${sel == null ? 'disabled' : ''}>Firma il primo contratto</button>`, null, 'carriere-f');
    const leggi = () => { b.n = $('#gN').value.trim(); b.c = $('#gC').value.trim(); b.num = clamp(+$('#gNum').value || 9, 1, 99); b.naz = $('#gNaz').value; };
    document.querySelectorAll('[data-gr]').forEach((x) => x.onclick = (e) => { e.stopPropagation(); leggi(); b.r = x.dataset.gr; disegna_(); });
    document.querySelectorAll('[data-a=offSel]').forEach((x) => x.onclick = (e) => { e.stopPropagation(); leggi(); sel = +x.dataset.v; disegna_(); });
    $('#gOk').onclick = () => { leggi(); if (!b.c) return avviso('Scrivi il tuo cognome'); creaGiocatore(Object.assign({}, b), _offerte[sel], ospite); };
  };
  disegna_();
}
function creaGiocatore(b, club, ospite){
  lasciaCarrieraAttuale();
  segnaAttiva('giocatore');
  nuovaSocieta(Object.assign({}, club, { ospite, diff: 0, modo: 'giocatore' }));
  const io = { id: 'io', io: true, n: b.n || '', c: b.c, r: b.r, eta: 17, val: Math.round(tierMedia(1) + 1), pot: 92, naz: b.naz, forma: 100, mor: 80, fm: 6, voti: [], inf: 0, squal: 0, gol: 0, ass: 0, pres: 0, amm: 0, esp: 0, num: b.num, contr: 9 };
  io.prezzo = valoreDi(io); io.stip = stipDi(io);
  S.rosa = [io];
  S.mio = { nome: ((b.n ? b.n + ' ' : '') + b.c).trim(), conto: 0, stip: Math.max(150, io.stip), focus: 'tecnica', prog: 0, st: statoIoZero(), carriera: [{ club: club.nome, tier: 1, s: 1 }], nazionale: 0, palloni: 0 };
  rosaDiPartenza();
  if (S.rosa.some((p) => !p.io && p.num === io.num)) S.rosa.filter((p) => !p.io && p.num === io.num).forEach((p) => { p.num = numeroLibero(p.r); });
  S.notizie = [];
  notizia(`Nasce una stella? ${S.mio.nome}, 17 anni, firma il primo contratto con la ${club.nome}!`, 'squadra');
  salva(true); schermo = 'home'; chiudiFoglio(true); disegna(); Suono.fanfara(); coriandoli([club.c1, club.c2, '#d4af37'], 140);
}
const statoIoZero = () => ({ gol: 0, ass: 0, pres: 0, sv: 0, nv: 0, motm: 0 });
const ioG = () => S.rosa.find((p) => p.io);
function trasferimento(club, stip){
  const vecchio = S, io = ioG(), keep = ['mio', 'trofei', 'storico', 'notizie', 'opz', 'stagione', 'livelli', 'codice', 'trucchi', 'modVisto', 'creato', 'pendenti'];
  nuovaSocieta(Object.assign({}, club, { ospite: vecchio.ospite, diff: vecchio.diff, modo: 'giocatore' }));
  keep.forEach((k) => { if (vecchio[k] !== undefined) S[k] = vecchio[k]; });
  S.tier = club.tier; S.sponsor = nuovoSponsor(club.tier); nuovaLegaLocale(club.tier); genMercato(); genStaffMercato();
  io.forma = 100; io.mor = 85; S.rosa = [io];
  rosaDiPartenza();
  S.rosa.filter((p) => !p.io && p.num === io.num).forEach((p) => { p.num = numeroLibero(p.r); });
  S.mio.stip = stip; S.offerteCarriera = null;
  S.mio.carriera = (S.mio.carriera || []).concat([{ club: club.nome, tier: club.tier, s: S.stagione }]);
  notizia(`UFFICIALE: ${S.mio.nome} è un nuovo giocatore della ${club.nome} (${TIERS[club.tier - 1].nome})!`, 'mercato');
  salva(true);
}
function offerteGiocatore(){
  const io = ioG(); if (!io) return [];
  const st = S.mio.st, media = st.nv ? st.sv / st.nv : 6;
  const L = [];
  [1, 2].forEach((salto) => { const t = S.tier + salto; if (t > TOP) return; if (io.val >= tierMedia(t) - 6 + salto * 2 || (salto === 1 && media >= 6.7 && st.pres >= 8)) L.push(Object.assign(clubOfferta(t), { stip: tondo(Math.max(S.mio.stip * 1.4, stipDi(Object.assign({}, io, { val: io.val + 2 })) * (1 + salto * 0.3))) })); });
  if (L.length && RND() < 0.6 && S.tier < TOP) L.push(Object.assign(clubOfferta(S.tier + 1), { stip: tondo(S.mio.stip * 1.25) }));
  return L.slice(0, 3);
}

// ---------- dopo ogni giornata e a fine stagione ----------
function dopoGiornataModo(rep, esito, voti, giocato){
  const m = modo();
  if (m === 'allenatore'){
    const A = S.allenatore; A.conto = (A.conto || 0) + stipAllenatore();
    const d = S.lega.dati, pos = posizioneDi(d, S.lega.mio), obj = posObiettivo(d.n);
    S.fiducia = clamp((S.fiducia == null ? 60 : S.fiducia) + (esito === 'V' ? 5 : esito === 'N' ? 1 : -6) + clamp((obj - pos) * 0.5, -3, 3), 0, 100);
    if (S.staff.all && S.staff.all.io){ S.staff.all.mod = S.tattica.mod; S.staff.all.liv = livAllenatore(); }
    if (S.fiducia <= 12 && S.lega.giocate >= 6 && !S.esonerato){
      A.esoneri = (A.esoneri || 0) + 1; A.rep = Math.max(0, (A.rep || 0) - 8);
      S.esonerato = offerteClub(Math.max(1, S.tier - (RND() < 0.5 ? 1 : 0)), 3);
      notizia(`ESONERATO! La ${S.club.nome} manda via ${A.nome}. Ma altre squadre ti cercano già.`, 'societa');
      S.pendenti.push({ tipo: 'esonero' });
    } else if (S.fiducia <= 25 && esito === 'P') notizia(`Il presidente della ${S.club.nome} non è contento: «Mister, servono risultati, e subito».`, 'societa');
  }
  if (m === 'giocatore'){
    const io = ioG(); if (!io) return;
    const M = S.mio; M.conto = (M.conto || 0) + M.stip;
    const giocaIo = giocato.has('io'), v = voti.io;
    if (giocaIo){ M.st.pres++; if (v != null){ M.st.sv += v; M.st.nv++; } }
    const golIo = (rep.marcatori || []).filter((x) => x.id === 'io' || x.nome === nomeG(io)).length;
    M.st.gol += golIo; M.st.ass += (rep.marcatori || []).filter((x) => x.assId === 'io' || x.ass === nomeG(io)).length;
    if (rep.motm === nomeG(io)) M.st.motm++;
    // allenamento personale
    const f = M.focus || 'tecnica';
    if (f === 'riposo'){ io.forma = clamp(io.forma + 18, 0, 100); io.mor = clamp((io.mor || 70) + 4, 0, 100); }
    else if (io.val < io.pot){
      M.prog = (M.prog || 0) + (io.eta <= 21 ? 0.24 : io.eta <= 26 ? 0.16 : io.eta <= 30 ? 0.08 : 0.03) * (f === 'tecnica' ? 1.15 : 1) * (1 + livStaff(S, 'all') * 0.04) * (giocaIo ? 1.2 : 1);
      if (f === 'fisico') io.forma = clamp(io.forma + 4, 0, 100);
      while (M.prog >= 1 && io.val < io.pot){ M.prog -= 1; io.val++; io.prezzo = valoreDi(io); notizia(`${M.nome} migliora: adesso vale ${io.val}!`, 'squadra'); }
    }
    rep.io = { gioca: giocaIo, voto: v, gol: golIo, panchina: !giocaIo && !io.inf && !io.squal, inf: io.inf, squal: io.squal };
    completaRosaAuto();
  }
}
// in fineStagione: prima che le statistiche si azzerino
function fineStagioneModo(rapporto){
  const m = modo();
  if (m === 'allenatore'){
    const A = S.allenatore;
    A.rep = clamp((A.rep || 0) + (rapporto.campione ? 15 : 0) + (rapporto.sale ? 12 : 0) + (rapporto.scende ? -8 : 0) + ((rapporto.obiettivi || []).filter((o) => o[0] === 'ok').length * 2), 0, 100);
    S.fiducia = clamp(60 + (rapporto.sale ? 15 : 0) + (rapporto.campione ? 10 : 0) - (rapporto.scende ? 15 : 0), 20, 95);
    S.soldi = budgetSocieta(S.tier) + Math.max(0, Math.round(S.soldi * 0.3));
    notizia(`Nuova stagione: la società ti dà ${euro(S.soldi)} per il mercato.`, 'mercato');
    if (S.tier < TOP && (rapporto.sale || rapporto.campione || A.rep >= 30) && RND() < 0.85){ S.offerteCarriera = offerteClub(Math.min(TOP, S.tier + 1), 2); rapporto.offerte = true; }
  }
  if (m === 'giocatore'){
    const io = ioG(), M = S.mio, st = M.st, media = st.nv ? st.sv / st.nv : 0;
    S.storico[0] && (S.storico[0].io = { gol: st.gol, pres: st.pres, media: Math.round(media * 100) / 100, val: io ? io.val : 0 });
    if (io && io.val >= 80 && st.pres >= 10){ M.nazionale = (M.nazionale || 0) + 1; notizia(`CONVOCATO IN NAZIONALE! ${M.nome} va con la ${nazDi(io.naz).n}.`, 'trofeo'); }
    if (io && S.tier === TOP && media >= 7.2 && st.gol + st.ass >= 15){ M.palloni = (M.palloni || 0) + 1; S.trofei.push({ stagione: S.stagione - 1, tier: TOP, nome: 'Pallone d’Oro' }); notizia(`${M.nome} vince il Pallone d’Oro!`, 'trofeo'); }
    const off = offerteGiocatore();
    M.st = statoIoZero();
    if (off.length){ S.offerteCarriera = off; rapporto.offerte = true; }
    completaRosaAuto();
  }
}
function mostraPendenteModo(p, dopo){
  if (p.tipo === 'esonero'){ mostraOfferte(true, dopo); return true; }
  if (p.tipo === 'offerteCarriera'){ mostraOfferte(false, dopo); return true; }
  return false;
}
function mostraOfferte(esonero, dopo){
  const m = modo(), L = esonero ? S.esonerato : S.offerteCarriera;
  if (!L || !L.length){ dopo && dopo(); return; }
  const extra = (o) => m === 'giocatore' ? ` · ${euroBreve(o.stip)} a giornata` : '';
  foglio(`<div class="evento"><span class="ev-ico">${ic(esonero ? 'avviso' : 'contratto')}</span>
    <h2>${esonero ? 'Sei stato esonerato' : m === 'giocatore' ? 'Ti vogliono comprare!' : 'Nuove offerte per te'}</h2>
    <p class="tenue">${esonero ? 'La società ha deciso di cambiare allenatore. Scegli la tua nuova squadra.' : m === 'giocatore' ? `Hai giocato bene e queste squadre ti vogliono. Adesso guadagni ${euroBreve(S.mio.stip)} a giornata.` : 'Hai fatto un ottimo lavoro: queste squadre di categoria più alta vogliono te in panchina.'}</p>
    <div class="off-lista">${L.map((o, i) => cartaOfferta(o, i, extra(o)).replace('data-a="offSel"', 'data-a="accettaOff"')).join('')}</div>
    ${esonero ? '' : `<button class="btn largo sec" data-a="rifiutaOff">Resto dove sono</button>`}</div>`, dopo);
}
function accettaOfferta(i){
  const m = modo(), L = S.esonerato || S.offerteCarriera; if (!L || !L[i]) return;
  const o = L[i];
  if (m === 'allenatore') nuovaPanchina(o); else if (m === 'giocatore') trasferimento(o, o.stip);
  chiudiFoglio(true); schermo = 'home'; disegna(); Suono.fanfara(); coriandoli([o.c1, o.c2, '#d4af37'], 160);
  setTimeout(() => mostraPendenti(), 300);
}

// ---------- che cosa si vede in ogni carriera ----------
const NAV_PRES = [['home', 'Home', 'home'], ['squadra', 'Squadra', 'squadra'], ['mercato', 'Mercato', 'mercato'], ['club', 'Club', 'club'], ['campionato', 'Campionato', 'coppa']];
function navM(){
  const m = modo();
  if (m === 'giocatore') return [['home', 'Home', 'home'], ['io', 'Io', 'utente'], ['squadra', 'Squadra', 'squadra'], ['club', 'Media', 'notizie'], ['campionato', 'Campionato', 'coppa']];
  if (m === 'allenatore') return [['home', 'Home', 'home'], ['squadra', 'Squadra', 'squadra'], ['mercato', 'Mercato', 'mercato'], ['club', 'Carriera', 'tattica'], ['campionato', 'Campionato', 'coppa']];
  return NAV_PRES;
}
function subsM(){
  const m = modo();
  if (m === 'giocatore') return Object.assign({}, SUBS, { io: [['profilo', 'Profilo', 'utente'], ['allenati', 'Allenamento', 'allenamento'], ['carriera', 'Carriera', 'grafico']], squadra: [['rosa', 'Compagni', 'utenti']], club: [['media', 'Media', 'notizie'], ['bacheca', 'Bacheca', 'coppa']] });
  if (m === 'allenatore') return Object.assign({}, SUBS, { club: [['panchina', 'La mia carriera', 'tattica'], ['media', 'Media', 'notizie'], ['bacheca', 'Bacheca', 'coppa']] });
  return SUBS;
}
function soldiVisti(){
  const m = modo();
  if (m === 'giocatore') return { t: 'Il mio conto', v: S.mio ? S.mio.conto : 0, vai: 'io', sub: 'carriera' };
  if (m === 'allenatore') return { t: 'Budget mercato', v: S.soldi, vai: 'club', sub: 'panchina' };
  return { t: 'Cassa', v: S.soldi, vai: 'club', sub: 'finanze' };
}
function avatarIo(p, size = 64){ return avatarSVG(p, size); }
function schermoIo(){
  const t = sottoschermo.io || 'profilo';
  return ({ profilo: ioProfilo, allenati: ioAllenamento, carriera: ioCarriera })[t] ? ({ profilo: ioProfilo, allenati: ioAllenamento, carriera: ioCarriera })[t]() : ioProfilo();
}
function cartaIo(){
  const io = ioG(), M = S.mio; if (!io || !M) return '';
  const st = M.st, media = st.nv ? (st.sv / st.nv).toFixed(2) : '—', u = S.ultima && S.ultima.io;
  const tit = formazione().some((x) => x.p && x.p.io);
  return `<section class="carta io-card"><div class="io-top">${avatarIo(io, 72)}<div><small>${RUOLI_N[io.r]} · ${io.eta} anni · n° ${io.num} ${nazDi(io.naz).f}</small><h2>${esc(M.nome)}</h2><span class="${tit ? 'verde' : 'giallo'}">${io.inf ? 'Infortunato' : io.squal ? 'Squalificato' : tit ? 'Titolare' : 'In panchina: allenati di più!'}</span></div>${badgeVal(io.val)}</div>
    <div class="io-pot"><small>Bravura ${io.val} · potenziale ${io.pot}</small>${barra((io.val / io.pot) * 100, 'verde')}<small>Prossimo miglioramento</small>${barra((M.prog || 0) * 100)}</div>
    <div class="dati-g"><div><small>Presenze</small><b>${st.pres}</b></div><div><small>Gol</small><b>${st.gol}</b></div><div><small>Media voto</small><b>${media}</b></div><div><small>Energia</small><b>${Math.round(io.forma)}</b></div></div>
    ${u ? `<p class="nota">${u.gioca ? `Ultima partita: voto <b>${u.voto != null ? u.voto : '—'}</b>${u.gol ? `, <b>${u.gol} gol</b>` : ''}` : u.panchina ? 'Ultima partita: sei rimasto in panchina.' : 'Ultima partita: non hai giocato.'}</p>` : ''}
    <div class="seg">${Object.entries(FOCUS).map(([k, f]) => `<button class="${M.focus === k ? 'on' : ''}" data-a="ioFocus" data-v="${k}">${f[0]}</button>`).join('')}</div></section>`;
}
function ioProfilo(){
  const io = ioG(), M = S.mio;
  return `<div class="griglia">${cartaIo()}
  ${carta('Contratto e soldi', `<div class="dati-g"><div><small>Squadra</small><b>${esc(S.club.nome)}</b></div><div><small>Stipendio</small><b>${euroBreve(M.stip)}</b><small>a giornata</small></div><div><small>Il mio conto</small><b class="verde">${euroBreve(M.conto)}</b></div><div><small>Valore</small><b>${euroBreve(io.prezzo || valoreDi(io))}</b></div></div>`)}
  ${carta('In carriera', `<div class="dati-g"><div><small>Gol totali</small><b>${(io.golTot || 0) + M.st.gol}</b></div><div><small>Presenze totali</small><b>${(io.presTot || 0) + M.st.pres}</b></div><div><small>Nazionale</small><b>${M.nazionale || 0}</b></div><div><small>Palloni d’Oro</small><b>${M.palloni || 0}</b></div></div>`)}</div>`;
}
function ioAllenamento(){
  const M = S.mio;
  return carta('Il tuo allenamento', `<p class="tenue">Scegli su cosa lavorare tra una partita e l'altra. Più sei giovane, più cresci in fretta. Se giochi titolare cresci ancora di più.</p>
    <div class="focus-lista">${Object.entries(FOCUS).map(([k, f]) => `<button class="focus-r ${M.focus === k ? 'on' : ''}" data-a="ioFocus" data-v="${k}">${ic(f[1])}<span><b>${f[0]}</b><small>${f[2]}</small></span></button>`).join('')}</div>`);
}
function ioCarriera(){
  const M = S.mio;
  return `<div class="griglia">${carta('Le mie squadre', `<div class="cal">${(M.carriera || []).map((x) => `<div class="cal-r"><span class="g">${x.s}</span><span class="nm">${esc(x.club)}</span><span class="tenue">${TIERS[x.tier - 1].nome}</span></div>`).join('')}</div>`)}
  ${carta('Stagioni', S.storico.length ? `<div class="cal">${S.storico.map((x) => `<div class="cal-r"><span class="g">${x.stagione}</span><span class="nm">${TIERS[x.tier - 1].nome} · ${x.pos}°</span><span class="tenue">${x.io ? `${x.io.gol} gol · ${x.io.pres} pres. · ${x.io.media || '—'}` : ''}</span></div>`).join('')}</div>` : '<p class="tenue">Ancora nessuna stagione finita.</p>')}
  ${S.offerteCarriera && S.offerteCarriera.length ? carta('Offerte', `<button class="btn" data-a="vediOfferte">Guarda le offerte (${S.offerteCarriera.length})</button>`) : ''}</div>`;
}
function schermoPanchina(){
  const A = S.allenatore || {}, f = S.fiducia == null ? 60 : S.fiducia, d = S.lega.dati;
  return `<div class="griglia">${carta(`${ic('tattica')} ${esc(A.nome || 'Mister')}`, `<div class="dati-g"><div><small>Squadra</small><b>${esc(S.club.nome)}</b></div><div><small>Reputazione</small><b>${A.rep || 0}/100</b></div><div><small>Livello mister</small><b>${stelle(livAllenatore())}</b></div><div><small>Esoneri</small><b>${A.esoneri || 0}</b></div></div>
    <div class="ob"><div class="ob-t"><span>${ic('cuore')} Fiducia del presidente</span><small>${Math.round(f)}/100</small></div>${barra(f, f < 25 ? 'rosso' : f < 50 ? '' : 'verde')}</div>
    <p class="nota">Obiettivo della società: <b>${AMBIZIONI[S.club.amb == null ? 1 : S.club.amb][0].toLowerCase()}</b> (almeno ${posObiettivo(d.n)}° posto). Se la fiducia scende troppo ti esonerano.</p>`)}
  ${carta('Soldi', `<div class="dati-g"><div><small>Budget mercato</small><b>${euroBreve(S.soldi)}</b></div><div><small>Il tuo stipendio</small><b>${euroBreve(stipAllenatore())}</b><small>a giornata</small></div><div><small>Il tuo conto</small><b class="verde">${euroBreve(A.conto || 0)}</b></div></div><p class="nota">Stadio, sponsor e stipendi li paga la società. Tu usi il budget per comprare giocatori e staff.</p>`)}
  ${carta('Le mie panchine', `<div class="cal">${(A.panchine || []).map((x) => `<div class="cal-r"><span class="g">${x.s}</span><span class="nm">${esc(x.club)}</span><span class="tenue">${TIERS[x.tier - 1].nome}</span></div>`).join('')}</div>`)}
  ${S.esonerato ? carta('Sei senza squadra', `<button class="btn oro" data-a="vediOfferte">Scegli la nuova squadra</button>`) : S.offerteCarriera && S.offerteCarriera.length ? carta('Offerte', `<button class="btn" data-a="vediOfferte">Guarda le offerte (${S.offerteCarriera.length})</button>`) : ''}</div>`;
}
// soldi: l'allenatore muove solo il budget del mercato, il giocatore non tocca i soldi della società
const CAT_ALLENATORE = new Set(['acquisti', 'cessioni', 'commissioni', 'altro', 'giovani', 'prestiti']);
function movimentoConta(cat){ const m = modo(); if (m === 'giocatore') return cat === 'altro'; if (m === 'allenatore') return CAT_ALLENATORE.has(cat); return true; }
