/* =========================================================
   CALCIOMANIA PM — SCHERMATE
   Home (cruscotto), Squadra (rosa, tattica, allenamento, giovanili),
   Mercato (cerca, campioni, svincolati, offerte, staff), Club (finanze, stadio,
   media, bacheca, personalizza), Campionato (classifica, calendario, risultati, scalata),
   schede dei giocatori, risultati delle partite e pannello segreto.
   ========================================================= */
'use strict';

const NAV = [['home', 'Home', 'home'], ['squadra', 'Squadra', 'squadra'], ['mercato', 'Mercato', 'mercato'], ['club', 'Club', 'club'], ['campionato', 'Campionato', 'coppa']];
const SUBS = {
  squadra: [['rosa', 'Rosa', 'utenti'], ['tattica', 'Tattica', 'tattica'], ['allenamento', 'Allenamento', 'allenamento'], ['giovanili', 'Giovanili', 'giovani']],
  mercato: [['cerca', 'Cerca', 'cerca'], ['campioni', 'Campioni', 'stella'], ['svincolati', 'Svincolati', 'contratto'], ['trattative', 'Offerte', 'mercato'], ['staff', 'Staff', 'staff']],
  club: [['finanze', 'Finanze', 'euro'], ['stadio', 'Stadio', 'stadio'], ['media', 'Media', 'notizie'], ['bacheca', 'Bacheca', 'coppa'], ['personalizza', 'Personalizza', 'pennello']],
  campionato: [['classifica', 'Classifica', 'lista'], ['calendario', 'Calendario', 'calendario'], ['risultati', 'Risultati', 'pallone'], ['scalata', 'Scalata', 'grafico']]
};

// ---------- pezzi riutilizzabili ----------
const coloreVal = (v) => v >= 80 ? 'v5' : v >= 68 ? 'v4' : v >= 54 ? 'v3' : v >= 40 ? 'v2' : 'v1';
const badgeVal = (v) => `<span class="val ${coloreVal(v)}">${v}</span>`;
const stelle = (n, max = 5) => `<span class="stelle">${'★'.repeat(n)}<i>${'★'.repeat(max - n)}</i></span>`;
const stemmaDi = (s, size) => stemmaSVG(s, size, s.nome);
const mioStemma = (size) => stemmaSVG(S.club, size, S.club.nome);
const barra = (p, cls = '') => `<span class="barra-p ${cls}"><i style="width:${clamp(p, 0, 100)}%"></i></span>`;
const pct = (v) => Math.round(clamp(v, 0, 100));
const giornate = (n) => n + ' giornat' + (n === 1 ? 'a' : 'e');
const coloriMiei = () => { const k = kitDi(S.club, false); return [k.c1, k.c2]; };
const carta = (tit, corpo, extra = '', cls = '') => `<section class="carta ${cls}">${tit ? `<div class="carta-tit"><h3>${tit}</h3>${extra}</div>` : ''}${corpo}</section>`;
function tagTipo(s){ if (s.uid && s.uid === mioId()) return '<span class="tag tu">TU</span>'; return s.tipo === 'umano' ? `<span class="tag umano" title="Persona vera">${ic('utente')}</span>` : '<span class="tag bot" title="Bot">BOT</span>'; }
const contrTxt = (p) => p.prestito ? 'in prestito' : p.contr <= 1 ? 'scade a fine stagione' : p.contr + ' stagioni';
function moraleIco(m){ m = m == null ? 70 : m; return `<span class="mor ${m >= 75 ? 'su' : m >= 50 ? 'ok' : 'giu'}" title="Morale ${Math.round(m)}">${m >= 75 ? '▲' : m >= 50 ? '●' : '▼'}</span>`; }
function tabsHTML(sez){
  const cur = sottoschermo[sez] || SUBS[sez][0][0];
  return `<nav class="subnav">${SUBS[sez].map(([k, n, i]) => `<button class="${cur === k ? 'on' : ''}" data-a="sub" data-s="${sez}" data-v="${k}">${ic(i)}<span>${n}</span>${badgeSub(sez, k)}</button>`).join('')}</nav>`;
}
function badgeSub(sez, k){
  if (sez === 'mercato' && k === 'trattative' && (S.offerte || []).length) return `<i class="num-b">${S.offerte.length}</i>`;
  if (sez === 'squadra' && k === 'giovanili' && (S.scoutGiov || []).length) return `<i class="num-b">${S.scoutGiov.length}</i>`;
  return '';
}

// ---------- layout ----------
function disegna(){
  const app = $('#app');
  if (!S){ app.innerHTML = ''; return; }
  const L = S.lega, T = TIERS[S.tier - 1];
  const sch = { home: schermoHome, squadra: schermoSquadra, mercato: schermoMercato, club: schermoClub, campionato: schermoCampionato }[schermo] || schermoHome;
  if (!SUBS[schermo] && schermo !== 'home') schermo = 'home';
  const badgeNav = (k) => k === 'mercato' && (S.offerte || []).length ? '<i class="pallino"></i>' : k === 'club' && S.stadio.cantieri.length ? '<i class="pallino blu"></i>' : k === 'squadra' && S.rosa.some((p) => p.inf > 0 || p.squal > 0) ? '<i class="pallino rosso"></i>' : '';
  app.innerHTML = `<div class="shell">
  <aside class="side">
    <div class="side-logo"><b>CALCIOMANIA</b><span>PM</span></div>
    <button class="side-club" data-a="vai" data-v="home">${mioStemma(44)}<span><b>${esc(S.club.nome)}</b><small>${T.nome} · stagione ${S.stagione}</small></span></button>
    <nav class="side-nav">${NAV.map(([k, n, i]) => `<button class="${schermo === k ? 'on' : ''}" data-a="vai" data-v="${k}">${ic(i)}<span>${n}</span>${badgeNav(k)}</button>`).join('')}</nav>
    <div class="side-soldi"><small>Cassa</small><b class="${S.soldi < 0 ? 'rosso' : ''}">${euro(S.soldi)}</b>${debitoTot() ? `<small>Debito ${euroBreve(debitoTot())}</small>` : ''}</div>
    <button class="side-menu" data-a="menu">${ic('ingranaggio')} Impostazioni</button>
  </aside>
  <div class="main">
    <header class="top">
      <button class="club" data-a="vai" data-v="home">${mioStemma(32)}<span><b>${esc(S.club.nome)}</b><small style="--c:${T.colore}">${T.nome}${L.online ? ' · <i class="online-dot"></i> online' : ''}${S.ospite ? ' · ospite' : ''}</small></span></button>
      <button class="soldi ${S.soldi < 0 ? 'rosso' : ''}" data-a="vai" data-v="club" data-sub="finanze" title="${euro(S.soldi)}">${ic('euro')}${euroBreve(S.soldi)}</button>
      <button class="menu-btn" data-a="menu" aria-label="Impostazioni">${ic('ingranaggio')}</button>
    </header>
    ${SUBS[schermo] ? tabsHTML(schermo) : ''}
    <main class="schermo" id="schermo">${sch()}</main>
  </div>
  <nav class="barra">${NAV.map(([k, n, i]) => `<button class="${schermo === k ? 'on' : ''}" data-a="vai" data-v="${k}">${ic(i)}<span>${n}</span>${badgeNav(k)}</button>`).join('')}</nav>
  </div>`;
  if (schermo === 'home') avviaContoAllaRovescia();
}

function prossimaPartita(k = 0){
  const L = S.lega, d = L.dati; if (!d || d.giornata + k >= giornateTot(d.n)) return null;
  const g = calendario(d.n)[d.giornata + k]; const m = g.find(([h, a]) => h === L.mio || a === L.mio);
  if (!m) return null;
  const casa = m[0] === L.mio; return { casa, avv: d.squadre[casa ? m[1] : m[0]], avvI: casa ? m[1] : m[0], g: d.giornata + k };
}

// ---------- HOME: il cruscotto ----------
function avvisiHome(){
  const A = [];
  problemiPerGiocare().forEach((p) => A.push(['rosso', 'avviso', p.t, p.vai, p.sub]));
  const inf = S.rosa.filter((p) => p.inf > 0), sq = S.rosa.filter((p) => p.squal > 0), sc = S.rosa.filter((p) => !p.prestito && p.contr <= 1);
  if (inf.length) A.push(['rosso', 'medico', `${inf.length} infortunat${inf.length === 1 ? 'o' : 'i'}: ${inf.slice(0, 3).map((p) => p.c).join(', ')}`, 'squadra', 'rosa']);
  if (sq.length) A.push(['giallo', 'cartellino', `Squalificat${sq.length === 1 ? 'o' : 'i'}: ${sq.map((p) => p.c).join(', ')}`, 'squadra', 'rosa']);
  if ((S.offerte || []).length) A.push(['oro', 'mercato', `${S.offerte.length} offert${S.offerte.length === 1 ? 'a' : 'e'} per i tuoi giocatori`, 'mercato', 'trattative']);
  if (sc.length) A.push(['giallo', 'contratto', `Contratti in scadenza: ${sc.slice(0, 3).map((p) => p.c).join(', ')}${sc.length > 3 ? '…' : ''}`, 'squadra', 'rosa']);
  if ((S.scoutGiov || []).length) A.push(['verde', 'giovani', `Gli osservatori hanno trovato ${S.scoutGiov.length} ragazzi`, 'squadra', 'giovanili']);
  if (S.soldi < 0) A.push(['rosso', 'euro', 'La cassa è in rosso: vendi o chiedi un prestito', 'club', 'finanze']);
  if (S.stadio.usura < 60) A.push(['giallo', 'stadio', `Stadio rovinato (${Math.round(S.stadio.usura)}%): restauralo`, 'club', 'stadio']);
  S.stadio.cantieri.forEach((c) => A.push(['blu', 'stadio', `Lavori: ${STADIO_K[c.k].nome} finiscono fra ${giornate(Math.max(0, c.fine - S.giornate))}`, 'club', 'stadio']));
  if (S.abbS !== S.stagione) A.push(['blu', 'biglietto', 'La campagna abbonamenti si chiude alla prima partita: scegli i prezzi', 'club', 'stadio']);
  if (S.scontoLavori && S.scontoLavori.fino >= S.giornate) A.push(['verde', 'regalo', 'Il comune paga metà del prossimo lavoro allo stadio', 'club', 'stadio']);
  return A;
}
function schermoHome(){
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
    if (pr.length) btn = `<div class="problemi">${pr.map((p) => `<button class="problema" data-a="vai" data-v="${p.vai}" data-sub="${p.sub}" ${p.ruolo ? `data-ruolo="${p.ruolo}"` : ''}>${ic('avviso')} ${p.t}<span>›</span></button>`).join('')}</div>`;
    else if (ioPronto) btn = `<div class="attesa"><b>Sei pronto!</b><p>Aspettiamo ${umaniNonPronti.map((s) => esc(s.nome)).join(', ') || 'gli altri'}. La giornata parte da sola <span id="conto" data-t="${d.scad || 0}"></span>.</p><button class="btn sec" data-a="gioca">Controlla adesso</button></div>`;
    else if (L.online) btn = `<button class="btn-gioca ${_occupato ? 'occupato' : ''}" data-a="gioca">${ic('play')} ${umaniNonPronti.length ? 'SONO PRONTO' : 'GIOCA LA PARTITA'}</button>${umaniNonPronti.length ? `<p class="nota">Nel tuo girone ci sono altre persone vere: si gioca quando siete tutti pronti, o al massimo <span id="conto" data-t="${d.scad || 0}"></span>.</p>` : ''}`;
    else btn = `<div class="gioca-riga"><button class="btn-gioca" data-a="gioca">${ic('play')} GIOCA IN DIRETTA</button><button class="btn-sim" data-a="giocaVeloce" title="Simula senza guardare">${ic('cronometro')}<span>Simula</span></button></div>`;
    const avvF = forzaTot(pp.avv.forza || f);
    blocco = `
      <div class="hm-top"><span>${T.nome} · ${esc(d.nome)}</span><span>Giornata ${pp.g + 1} di ${giornateTot(d.n)}</span></div>
      <div class="hm-squadre">
        <div class="hm-t">${pp.casa ? mioStemma(70) : stemmaDi(pp.avv, 70)}<b>${esc(pp.casa ? S.club.nome : pp.avv.nome)}</b><small>${pp.casa ? pos + '° · ' + me.pt + ' pt' : posizioneDi(d, pp.avvI) + '° · ' + pp.avv.pt + ' pt'} ${pp.casa ? '' : tagTipo(pp.avv)}</small></div>
        <div class="hm-vs"><b>VS</b><small>${pp.casa ? 'In casa' : 'In trasferta'}</small></div>
        <div class="hm-t">${pp.casa ? stemmaDi(pp.avv, 70) : mioStemma(70)}<b>${esc(pp.casa ? pp.avv.nome : S.club.nome)}</b><small>${pp.casa ? posizioneDi(d, pp.avvI) + '° · ' + pp.avv.pt + ' pt ' + tagTipo(pp.avv) : pos + '° · ' + me.pt + ' pt'}</small></div>
      </div>
      <div class="hm-conf"><span>Forza ${ft}</span><span class="hm-bar"><i style="width:${clamp(50 + (ft - avvF) * 3, 8, 92)}%"></i></span><span>${avvF} avversario</span></div>
      <div class="hm-info"><span>${ic('tattica')} ${S.tattica.mod} · ${MENTALITA[S.tattica.ment == null ? 2 : S.tattica.ment]}</span><button class="link" data-a="vai" data-v="squadra" data-sub="tattica">Cambia tattica ›</button></div>
      ${btn}`;
  }
  const todo = [
    { ok: !!S.staff.all, t: 'Ingaggia l’allenatore', vai: 'mercato', sub: 'staff' },
    { ok: S.rosa.length >= 11 && S.rosa.some((p) => p.r === 'P'), t: 'Compra almeno 11 giocatori (con un portiere)', vai: 'mercato', sub: 'cerca' },
    { ok: Object.keys(S.staff).length >= 3, t: 'Prendi altro staff (preparatore, medico…)', vai: 'mercato', sub: 'staff' },
    { ok: S.stadio.campo > 0 || S.stadio.tribune > 0 || S.stadio.cantieri.length > 0, t: 'Migliora lo stadio', vai: 'club', sub: 'stadio' },
    { ok: S.giornate > 0, t: 'Gioca la prima partita!', vai: 'home' }
  ];
  const mostraTodo = S.giornate < 3 && todo.some((x) => !x.ok);
  const vicini = ordina(d.squadre); const k = vicini.findIndex((s) => s.i === L.mio);
  const da = clamp(k - 2, 0, Math.max(0, vicini.length - 5));
  const avvisi = avvisiHome().filter((x) => !pr.some((p) => p.t === x[2]));
  const recenti = (S.risultati || []).filter((x) => x.s === S.stagione).slice(-5);
  const prossime = [1, 2, 3].map((k) => prossimaPartita(k)).filter(Boolean);
  const disp = S.rosa.filter(disponibile).length, inf = S.rosa.filter((p) => p.inf > 0).length, squal = S.rosa.filter((p) => p.squal > 0).length;
  const bomber = S.rosa.slice().sort((a, b) => (b.gol || 0) - (a.gol || 0))[0];
  const migl = S.rosa.filter((p) => p.nv).sort((a, b) => mediaVoto(b) - mediaVoto(a))[0];
  const ob = statoObiettivi();
  const tile = (val, n, sub, cls = '', p) => `<div class="tessera ${cls}">${p != null ? `<div class="anello" style="--p:${clamp(p, 0.03, 1)}"><b>${val}</b></div>` : `<div class="numero">${val}</div>`}<span>${n}</span><small>${sub}</small></div>`;
  return `
  <div class="dash">
  <section class="hero-match ${pp ? '' : 'vuoto'}">${blocco || `<div class="attesa"><b>La stagione è finita.</b><p>Si riparte presto!</p></div>`}</section>
  ${avvisi.length ? `<section class="carta avvisi"><div class="carta-tit"><h3>${ic('avviso')} Da fare</h3><span class="tenue">${avvisi.length}</span></div>${avvisi.slice(0, 6).map(([c, i, t, vai, sub]) => `<button class="avv-r ${c}" data-a="vai" data-v="${vai}" ${sub ? `data-sub="${sub}"` : ''}>${ic(i)}<span>${esc(t)}</span><b>›</b></button>`).join('')}</section>` : ''}
  ${mostraTodo ? `<section class="carta todo"><h3>Per iniziare</h3>${todo.map((x) => `<button class="todo-r ${x.ok ? 'ok' : ''}" data-a="vai" data-v="${x.vai}" ${x.sub ? `data-sub="${x.sub}"` : ''}><i>${x.ok ? ic('check') : ''}</i>${x.t}</button>`).join('')}${S.rosa.length < 11 ? `<button class="btn oro" data-a="squadraPronta">${ic('fulmine')} Squadra pronta in un tocco</button><p class="nota">Compra subito i giocatori adatti al tuo campionato e un allenatore, spendendo meno della metà dei soldi.</p>` : ''}</section>` : ''}
  <section class="tessere">
    ${tile(ft, 'Forza squadra', 'media campionato ' + media, '', (ft - media + 20) / 40)}
    ${tile(Math.round(S.morale), 'Morale', S.morale >= 80 ? 'alle stelle' : S.morale >= 55 ? 'buono' : 'basso', 'morale', S.morale / 100)}
    ${tile(Math.round(S.intesa || 50), 'Intesa', 'gioco di squadra', 'intesa', (S.intesa || 50) / 100)}
    ${tile(Math.round(S.prep || 50), 'Preparazione', 'atletica', 'prep', (S.prep || 50) / 100)}
    ${tile(pos + '°', 'Classifica', 'su ' + d.n + ' squadre')}
    ${tile(S.tifosi >= 10000 ? Math.round(S.tifosi / 1000) + 'k' : S.tifosi, 'Tifosi', postiStadio(S).toLocaleString('it-IT') + ' posti')}
  </section>
  <div class="griglia">
  ${carta('Classifica', `<p class="nota">${L.online ? `Girone online: <b>${umani(d).length}</b> persone vere e ${d.n - umani(d).length} bot.` : 'Giochi da solo contro i bot. Dal menu puoi andare online.'}</p>${tabellaHTML(vicini.slice(da, da + 5), d, true, da)}`, `<button class="link" data-a="vai" data-v="campionato" data-sub="classifica">Tutta ›</button>`)}
  ${cartaCoppe()}
  ${carta('Ultima partita', S.ultima ? `${cartaRisultato(S.ultima)}${S.ultima.motm ? `<p class="nota centro">${ic('stella')} Migliore in campo: <b>${esc(S.ultima.motm)}</b></p>` : ''}<div class="forma-r">${recenti.map((x) => `<span class="fr ${x.esito}" title="${esc(x.avv)} ${x.gf}-${x.gs}">${x.esito}</span>`).join('')}</div><div class="riga-btn"><button class="btn mini sec" data-a="ultimaRep">Pagelle e statistiche</button><button class="btn mini sec" data-a="rivedi">${ic('play')} Rivedi</button></div>` : '<p class="tenue">Ancora nessuna partita giocata.</p>')}
  ${carta('Prossime partite', prossime.length ? `<div class="cal">${prossime.map((x) => `<div class="cal-r"><span class="g">${x.g + 1}</span><span class="dove">${x.casa ? 'C' : 'T'}</span>${stemmaDi(x.avv, 22)}<span class="nm">${esc(x.avv.nome)}</span><span class="tenue">${posizioneDi(d, x.avvI)}°</span></div>`).join('')}</div>` : '<p class="tenue">Fine del calendario.</p>', `<button class="link" data-a="vai" data-v="campionato" data-sub="calendario">Calendario ›</button>`)}
  ${carta('Finanze', `<div class="fin-mini"><div><small>Cassa</small><b class="${S.soldi < 0 ? 'rosso' : ''}">${euroBreve(S.soldi)}</b></div><div><small>Ultima giornata</small><b class="${S.bilancio && S.bilancio.netto < 0 ? 'rosso' : 'verde'}">${S.bilancio ? (S.bilancio.netto >= 0 ? '+' : '') + euroBreve(S.bilancio.netto) : '—'}</b></div><div><small>Stipendi</small><b>${euroBreve(stipendiGiocatori() + stipendiStaff())}</b></div></div>${graficoLinea(S.soldiStoria, 320, 70, '#d4af37')}`, `<button class="link" data-a="vai" data-v="club" data-sub="finanze">Bilancio ›</button>`)}
  ${carta('Stato della rosa', `<div class="fin-mini"><div><small>Disponibili</small><b class="verde">${disp}</b></div><div><small>Infortunati</small><b class="${inf ? 'rosso' : ''}">${inf}</b></div><div><small>Squalificati</small><b class="${squal ? 'giallo' : ''}">${squal}</b></div></div>
    ${bomber && bomber.gol ? `<p class="nota">${ic('pallone')} Capocannoniere: <b>${esc(nomeG(bomber))}</b> (${bomber.gol} gol)</p>` : ''}${migl ? `<p class="nota">${ic('stella')} Media voto più alta: <b>${esc(nomeG(migl))}</b> (${mediaVoto(migl).toFixed(2)})</p>` : ''}`, `<button class="link" data-a="vai" data-v="squadra" data-sub="rosa">Rosa ›</button>`)}
  ${carta('Obiettivi della stagione', ob.length ? ob.map((o) => `<div class="ob"><div class="ob-t"><span>${o.ok ? ic('check', 'verde') : ic('bersaglio')} ${esc(o.t)}</span><small>${esc(o.val)}</small></div>${barra(o.p * 100, o.ok ? 'verde' : '')}</div>`).join('') : `<p class="tenue">Gli obiettivi arrivano alla prima partita della stagione. Il tuo obiettivo: <b>${AMBIZIONI[S.club.amb == null ? 1 : S.club.amb][0].toLowerCase()}</b>.</p>`)}
  ${carta('Notizie', `<div class="notizie">${S.notizie.slice(0, 6).map(rigaNotizia).join('')}</div>`, `<button class="link" data-a="vai" data-v="club" data-sub="media">Tutte ›</button>`, 'largo2')}
  </div></div>`;
}
function rigaNotizia(n){ const t = TIPI_NOTIZIA[n.tipo] || TIPI_NOTIZIA.societa; return `<div class="notizia t-${n.tipo}"><i>${ic(t[0])}</i><div><p>${esc(n.t)}</p><small>${esc(n.gio || '')}${n.s ? ' · stagione ' + n.s + (n.g ? ', giornata ' + n.g : '') : ''}</small></div></div>`; }
function cartaRisultato(rep){
  const io = { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim };
  const h = rep.casa ? io : rep.avv, a = rep.casa ? rep.avv : io;
  const gh = rep.casa ? rep.gf : rep.gs, ga = rep.casa ? rep.gs : rep.gf;
  return `<div class="risultato ${rep.esito}"><div>${stemmaDi(h, 40)}<span>${esc(h.nome)}</span></div><b>${gh} - ${ga}</b><div>${stemmaDi(a, 40)}<span>${esc(a.nome)}</span></div></div>
  ${rep.marcatori.length ? `<p class="marc">${ic('pallone')} ${rep.marcatori.map((m) => esc(m.nome) + ' ' + m.min + '’').join(' · ')}</p>` : ''}`;
}
function tabellaHTML(righe, d, mini, da = 0, mio = S.lega.mio){
  const n = d.n;
  return `<div class="tab-wrap"><table class="tab ${mini ? 'mini' : ''}"><thead><tr><th>#</th><th class="sx">Squadra</th>${mini ? '' : '<th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th>'}<th>DR</th><th>PT</th>${mini ? '' : '<th>Forma</th>'}</tr></thead><tbody>
  ${righe.map((s, k) => { const pos = da + k + 1; const zona = pos <= PROMOSSE && d.tier < TOP ? 'promo' : pos > n - RETROCESSE && d.tier > 1 ? 'retro' : (pos === 1 ? 'promo' : '');
    return `<tr class="${zona} ${s.i === mio ? 'io' : ''}"><td><span class="pos">${pos}</span></td><td class="sx"><span class="sq">${stemmaDi(s, 22)}<span>${esc(s.nome)}</span>${tagTipo(s)}</span></td>${mini ? '' : `<td>${s.g}</td><td>${s.v}</td><td>${s.n}</td><td>${s.p}</td><td>${s.gf}</td><td>${s.gs}</td>`}<td>${s.gf - s.gs > 0 ? '+' : ''}${s.gf - s.gs}</td><td><b>${s.pt}</b></td>${mini ? '' : `<td><span class="forma">${(s.f || '').split('').map((c) => `<i class="${c}">${c}</i>`).join('')}</span></td>`}</tr>`; }).join('')}
  </tbody></table></div>`;
}

// ---------- SQUADRA ----------
function schermoSquadra(){ const t = sottoschermo.squadra || 'rosa'; return ({ rosa: schermoRosa, tattica: schermoTattica, allenamento: schermoAllenamento, giovanili: schermoGiovanili })[t](); }
const ORD_G = [['val', 'Bravura'], ['pot', 'Potenziale'], ['eta', 'Età'], ['forma', 'Condizione'], ['mor', 'Morale'], ['prezzo', 'Valore'], ['stip', 'Stipendio'], ['contr', 'Contratto'], ['gol', 'Gol'], ['fm', 'Media voto']];
function ordinaGiocatori(L, k){ const f = { eta: (a, b) => a.eta - b.eta, contr: (a, b) => (a.contr || 0) - (b.contr || 0), fm: (a, b) => mediaVoto(b) - mediaVoto(a) }[k] || ((a, b) => (b[k] || 0) - (a[k] || 0)); return L.slice().sort(f); }
function filtriHTML(s, conRuolo = true, ordine = ORD_G){
  const r = sottoschermo[s + 'Ruolo'] || '';
  return `<div class="filtri">${conRuolo ? `<div class="chips">${[['', 'Tutti'], ['P', 'Portieri'], ['D', 'Difensori'], ['C', 'Centrocampisti'], ['A', 'Attaccanti']].map(([k, n]) => `<button class="chip ${r === k ? 'on' : ''}" data-a="filtro" data-k="${s}Ruolo" data-v="${k}">${n}</button>`).join('')}</div>` : ''}
  <div class="filtri-r"><label class="cerca">${ic('cerca')}<input data-ch="cerca" data-s="${s}" placeholder="Cerca per nome" value="${esc(sottoschermo[s + 'Cerca'] || '')}"></label>
  <label class="ordina">${ic('ordina')}<select data-ch="ordina" data-s="${s}">${ordine.map(([k, n]) => `<option value="${k}" ${(sottoschermo[s + 'Ord'] || ordine[0][0]) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></div>`;
}
function filtra(L, s){
  const r = sottoschermo[s + 'Ruolo'] || '', q = (sottoschermo[s + 'Cerca'] || '').trim().toLowerCase();
  return ordinaGiocatori(L.filter((p) => (!r || p.r === r) && (!q || (p.n + ' ' + p.c).toLowerCase().includes(q))), sottoschermo[s + 'Ord'] || 'val');
}
function schermoRosa(){
  const f = formazione(), titIds = new Set(f.filter((x) => x.p).map((x) => x.p.id));
  const lista = filtra(S.rosa, 'rosa');
  const valRosa = S.rosa.reduce((s, p) => s + p.prezzo, 0), etaM = S.rosa.length ? (S.rosa.reduce((s, p) => s + p.eta, 0) / S.rosa.length).toFixed(1) : '—';
  const gruppi = { P: [], D: [], C: [], A: [] }; lista.forEach((p) => gruppi[p.r].push(p));
  const raggruppa = !(sottoschermo.rosaRuolo) && (sottoschermo.rosaOrd || 'val') === 'val';
  return `
  <section class="carta"><div class="riass"><div><small>Giocatori</small><b>${S.rosa.length}/30</b></div><div><small>Età media</small><b>${etaM}</b></div><div><small>Valore rosa</small><b>${euroBreve(valRosa)}</b></div><div><small>Stipendi</small><b>${euroBreve(stipendiGiocatori())}</b><small>a giornata</small></div></div>
  ${filtriHTML('rosa')}</section>
  ${!S.rosa.length ? `<section class="carta vuoto"><p>Non hai ancora giocatori.</p><div class="riga-btn"><button class="btn" data-a="vai" data-v="mercato" data-sub="cerca">Vai al mercato</button><button class="btn oro" data-a="squadraPronta">${ic('fulmine')} Squadra pronta</button></div></section>`
    : raggruppa ? Object.entries(gruppi).map(([r, L]) => L.length ? carta(`${RUOLI_PL[r]} <span class="tenue">${L.length}</span>`, `<div class="lista-g">${L.map((p) => rigaGiocatore(p, titIds.has(p.id))).join('')}</div>`) : '').join('')
    : carta(`${lista.length} giocatori`, `<div class="lista-g">${lista.map((p) => rigaGiocatore(p, titIds.has(p.id))).join('') || '<p class="tenue">Nessun giocatore trovato.</p>'}</div>`)}
  ${(S.inPrestito || []).length ? carta('In prestito ad altre squadre', `<div class="lista-g">${S.inPrestito.map((x) => `<div class="gioc dis">${avatarSVG(x.p, 40)}<span class="info"><b>${esc(x.p.n)} ${esc(x.p.c)}</b><small>${RUOLI[x.p.r]} · al ${esc(x.club)} fino a fine stagione</small></span>${badgeVal(x.p.val)}</div>`).join('')}</div>`) : ''}`;
}
function rigaGiocatore(p, tit, extra = ''){
  const N = nazDi(p.naz);
  return `<button class="gioc" data-a="giocatore" data-id="${p.id}">${avatarSVG(p, 42, coloriMiei())}<span class="info"><b>${p.stella ? ic('stella', 'oro') : ''}${esc(p.n)} ${esc(p.c)} <span class="flag">${N.f}</span></b>
  <small><span class="ruolo r${p.r}">${p.r}</span> ${p.eta} anni${p.gol ? ' · ' + p.gol + ' gol' : ''}${p.nv ? ' · voto ' + mediaVoto(p).toFixed(1) : ''}${tit ? ' · <em>titolare</em>' : ''}${p.lista ? ' · <em class="giallo">in vendita</em>' : ''}${p.contr <= 1 && !p.prestito ? ' · <em class="rosso">contratto in scadenza</em>' : ''}${p.prestito ? ' · <em>in prestito</em>' : ''}</small>
  <span class="mini-barre">${barra(p.forma, p.forma < 60 ? 'rosso' : p.forma < 80 ? 'giallo' : '')}${moraleIco(p.mor)}</span></span>${statoG(p)}${extra}${badgeVal(p.val)}</button>`;
}
function schedaGiocatore(id){
  const p = S.rosa.find((x) => x.id === id) || trovaInMercato(id) || (S.giovanili || []).find((x) => x.id === id) || (S.scoutGiov || []).find((x) => x.id === id);
  if (!p) return;
  const mio = S.rosa.includes(p), giov = (S.giovanili || []).includes(p);
  const oss = livStaff(S, 'oss');
  const potTxt = mio || giov || oss >= 2 ? p.pot : oss >= 1 ? (p.pot > p.val + 8 ? 'alto' : 'normale') : '?';
  const N = nazDi(p.naz);
  const dato = (n, v, s = '') => `<div><small>${n}</small><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
  const voti = (p.voti || []).map((v) => `<span class="voto ${v >= 7 ? 'su' : v < 6 ? 'giu' : ''}">${v}</span>`).join('');
  const ist = (S.tattica.ist || {})[p.id] || '';
  foglio(`<div class="scheda-g">${avatarSVG(p, 76, mio ? coloriMiei() : null)}<div class="sg-n"><h2>${p.stella ? ic('stella', 'oro') : ''}${esc(p.n)} ${esc(p.c)}</h2><p class="tenue">${N.f} ${esc(N.n)} · ${RUOLI[p.r]} · ${p.eta} anni${p.num ? ' · n° ' + p.num : ''}</p>${p.club ? `<p class="tenue">Gioca nel ${esc(p.club)}</p>` : ''}${statoG(p)}</div><div class="sg-ovr">${badgeVal(p.val)}<small>POT ${potTxt}</small></div></div>
  <div class="dati-g">${dato('Bravura', p.val)}${dato('Potenziale', potTxt)}${dato('Condizione', pct(p.forma) + '%')}${dato('Morale', pct(p.mor == null ? 70 : p.mor))}${dato('Valore', euroBreve(p.prezzo))}${dato('Stipendio', euroBreve(p.stip), 'a giornata')}${mio || giov ? dato('Contratto', contrTxt(p)) : ''}${p.chiede ? dato('Chiedono', euroBreve(p.chiede)) : ''}</div>
  ${mio ? `<h3>Statistiche</h3><div class="dati-g">${dato('Presenze', p.pres || 0)}${dato('Gol', p.gol || 0, p.golTot ? 'carriera ' + (p.golTot + (p.gol || 0)) : '')}${dato('Assist', p.ass || 0)}${dato('Media voto', p.nv ? mediaVoto(p).toFixed(2) : '—')}${dato('Gialli', p.amm || 0)}${dato('Rossi', p.esp || 0)}${dato('Migliore in campo', p.motm || 0)}</div>${voti ? `<p class="nota">Ultimi voti: ${voti}</p>` : ''}` : ''}
  ${p.inf > 0 ? `<p class="avviso-in">${ic('medico')} ${esc(p.infT || 'Infortunato')}: torna fra ${giornate(p.inf)}.</p>` : ''}
  ${p.squal > 0 ? `<p class="avviso-in giallo">${ic('cartellino')} Squalificato per ${giornate(p.squal)}.</p>` : ''}
  ${mio ? `<div class="f-due"><label class="campo-t">Allenamento individuale<select data-ch="allenInd" data-id="${p.id}">${ALLEN_IND.map(([k, n]) => `<option value="${k}" ${(p.allen || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="campo-t">Istruzione in partita<select data-ch="istruz" data-id="${p.id}">${ISTRUZIONI.map(([k, n]) => `<option value="${k}" ${ist === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="riga-btn">${p.prestito ? '' : `<button class="btn" data-a="rinnova" data-id="${p.id}">${ic('contratto')} Rinnova</button><button class="btn sec" data-a="lista" data-id="${p.id}">${p.lista ? 'Togli dalla vendita' : 'Metti in vendita'}</button><button class="btn sec" data-a="presta" data-id="${p.id}">Presta</button><button class="btn rosso" data-a="vendi" data-id="${p.id}">Vendi subito · ${euroBreve(prezzoVendita(p))}</button>`}</div>`
    : giov ? `<div class="riga-btn"><button class="btn" data-a="promuovi" data-id="${p.id}">${ic('freccia_su')} Promuovi in prima squadra</button><button class="btn sec rosso" data-a="giovVia" data-id="${p.id}">Lascia andare</button></div>`
    : (S.scoutGiov || []).includes(p) ? `<div class="riga-btn"><button class="btn" data-a="giovIngaggia" data-id="${p.id}">Prendi nella Primavera · ${euroBreve(p.costo)}</button></div>`
    : `<div class="riga-btn"><button class="btn" data-a="tratta" data-id="${p.id}">${ic('contratto')} ${p.svinc ? 'Fai firmare' : 'Tratta l’acquisto'}</button>${p.svinc || p.stella ? '' : `<button class="btn sec" data-a="prestito" data-id="${p.id}">Chiedi in prestito</button>`}</div>`}`, null, 'scheda');
}
function schedaRinnovo(id){
  const p = S.rosa.find((x) => x.id === id); if (!p) return;
  const ch = richiestaRinnovo(p);
  foglio(`<div class="tr-testa">${avatarSVG(p, 60, coloriMiei())}<div><h2>Rinnovo di ${esc(p.c)}</h2><p class="tenue">Adesso guadagna ${euro(p.stip)} a giornata · contratto: ${contrTxt(p)}</p></div></div>
  <div class="dati-g"><div><small>Chiede circa</small><b>${euroBreve(ch)}</b><small>a giornata</small></div><div><small>Morale</small><b>${pct(p.mor || 70)}</b></div></div>
  <label class="campo-t">Stipendio che offri (a giornata)<input id="rnStip" type="number" inputmode="numeric" value="${ch}"></label>
  <div class="scelta"><span>Stagioni di contratto</span><div class="seg" id="rnAnni" data-v="3">${[1, 2, 3, 4, 5].map((a) => `<button class="${a === 3 ? 'on' : ''}" data-a="rnAnni" data-v="${a}">${a}</button>`).join('')}</div></div>
  <p class="nota">Con 4 o 5 stagioni chiede un po’ meno. Se è giù di morale chiede di più.</p>
  <div class="riga-btn"><button class="btn" data-a="rinnovaOk" data-id="${p.id}">${ic('contratto')} Proponi</button><button class="btn sec" data-a="giocatore" data-id="${p.id}">Indietro</button></div>`);
}
function sceltaSlot(k){
  const f = formazione(); const ruolo = f[k].ruolo;
  const disp = S.rosa.filter(disponibile).sort((a, b) => effInRuolo(b, ruolo) - effInRuolo(a, ruolo));
  foglio(`<h2>Chi gioca come ${RUOLI[ruolo].toLowerCase()}?</h2><div class="lista-g">${disp.map((p) => { const dove = f.findIndex((x) => x.p === p); return `<button class="gioc" data-a="metti" data-k="${k}" data-id="${p.id}">${avatarSVG(p, 40, coloriMiei())}<span class="info"><b>${esc(p.n)} ${esc(p.c)}</b><small>${RUOLI[p.r]}${p.r !== ruolo ? ' · fuori ruolo' : ''}${dove >= 0 ? ' · ora in campo' : ' · in panchina'} · condizione ${pct(p.forma)}%</small></span>${badgeVal(Math.round(effInRuolo(p, ruolo)))}</button>`; }).join('')}</div>`);
}
function metti(k, id){
  const f = formazione(); const ids = f.map((x) => x.p ? x.p.id : null);
  const j = ids.indexOf(id);
  if (j >= 0) ids[j] = ids[k];
  ids[k] = id; S.tattica.tit = ids;
  aggiornaMioSlot(); salva(); chiudiFoglio(); disegna();
}
function campoFormazione(f, mod, click = true){
  const m = MODULI[mod]; const yL = [91, 71, 45, 17]; const posti = [{ x: 50, y: yL[0] }];
  [m[0], m[1], m[2]].forEach((n, li) => { for (let i = 0; i < n; i++) posti.push({ x: (i + 1) * 100 / (n + 1), y: yL[li + 1] + (li === 1 && n >= 5 && (i === 0 || i === n - 1) ? -6 : 0) }); });
  const k = kitDi(S.club, false);
  return `<div class="campo-tat">${f.map((x, i) => `<button class="pt ${x.p && x.p.r !== x.ruolo ? 'fuori' : ''}" style="left:${posti[i].x}%;top:${posti[i].y}%" ${click ? `data-a="slot" data-k="${i}"` : ''}>${magliaSVG(i === 0 ? { t: 0, c1: '#facc15', c2: '#111827' } : k, 34, x.p ? x.p.num : '?')}<small>${x.p ? esc(x.p.c) : 'vuoto'}</small>${x.p ? `<em class="${coloreVal(x.p.val)}">${x.p.val}</em>` : ''}</button>`).join('')}</div>`;
}
function schermoTattica(){
  const f = formazione(), F = forzaMia(), ft = forzaTot(F), T = S.tattica;
  const usati = new Set(f.filter((x) => x.p).map((x) => x.p.id));
  const panca = S.rosa.filter((p) => disponibile(p) && !usati.has(p.id)).sort((a, b) => efficienza(b) - efficienza(a));
  const seg = (k, lista, cur) => `<div class="seg">${lista.map((n, i) => `<button class="${cur === i ? 'on' : ''}" data-a="tat" data-k="${k}" data-v="${i}">${n}</button>`).join('')}</div>`;
  const linea = (n, v) => `<div class="linea-f"><span>${n}</span>${barra(clamp((v - tierMedia(S.tier) + 25) * 2, 3, 100))}<b>${Math.round(v)}</b></div>`;
  const coach = S.staff.all;
  return `
  <div class="griglia tat">
  <section class="carta">
    <div class="carta-tit"><h3>Formazione</h3><span class="forza-b">Forza <b>${ft}</b></span></div>
    <div class="chips wrap">${Object.keys(MODULI).map((k) => `<button class="chip ${T.mod === k ? 'on' : ''}" data-a="modulo" data-v="${k}">${k}${coach && coach.mod === k ? ' ★' : ''}</button>`).join('')}</div>
    ${campoFormazione(f, T.mod)}
    <p class="nota">Tocca un giocatore in campo per cambiarlo. ${T.tit ? '<button class="link" data-a="autoForm">Torna alla formazione automatica</button>' : 'La formazione si sceglie da sola con i migliori.'}${coach && coach.mod ? ` Il tuo allenatore preferisce il <b>${coach.mod}</b> (★): con quel modulo la squadra rende di più.` : ''}</p>
  </section>
  <section class="carta">
    <h3>Come gioca la squadra</h3>
    <div class="scelta"><span>Mentalità</span><div class="seg cinque">${MENTALITA.map((n, i) => `<button class="${(T.ment == null ? 2 : T.ment) === i ? 'on' : ''}" data-a="ment" data-v="${i}">${n}</button>`).join('')}</div></div>
    <div class="scelta"><span>Stile di gioco</span><div class="stili">${STILI.map(([k, n, d]) => `<button class="${(T.stile || 'equi') === k ? 'on' : ''}" data-a="tat" data-k="stile" data-v="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>
    <div class="scelta"><span>Pressing</span>${seg('press', PRESSING, T.press == null ? 1 : T.press)}<p class="nota">Più pressing = più palloni recuperati, ma ci si stanca prima.</p></div>
    <div class="scelta"><span>Linea difensiva</span>${seg('linea', LINEA, T.linea == null ? 1 : T.linea)}<p class="nota">Alta: si attacca di più ma si rischia in contropiede.</p></div>
    <h3>Forza per reparto</h3>${linea('Portiere', F.por)}${linea('Difesa', F.dif)}${linea('Centrocampo', F.cen)}${linea('Attacco', F.att)}
  </section>
  ${carta('Istruzioni individuali', `<p class="nota">Dai un compito ai titolari. Chi «spinge in avanti» o «tira da fuori» segna più spesso.</p><div class="istr">${f.filter((x) => x.p).map((x) => `<div class="istr-r"><span class="ruolo r${x.ruolo}">${x.ruolo}</span><span>${esc(nomeG(x.p))}</span><select data-ch="istruz" data-id="${x.p.id}">${ISTRUZIONI.map(([k, n]) => `<option value="${k}" ${((T.ist || {})[x.p.id] || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('')}</div>`)}
  ${carta('Panchina', panca.length ? `<div class="lista-g">${panca.slice(0, 9).map((p) => rigaGiocatore(p, false)).join('')}</div><p class="nota">In partita puoi fare fino a ${MAX_CAMBI} cambi con i primi 9 della panchina.</p>` : '<p class="tenue">Nessuno in panchina.</p>')}
  </div>`;
}
function schermoAllenamento(){
  const A = S.allen || (S.allen = allenDefault()), n = (k) => A.sett.filter((x) => x === k).length;
  const ult = A.ultimo;
  return `<div class="griglia">
  ${carta('Programma della settimana', `<div class="sett">${A.sett.map((k, i) => `<div class="giorno"><small>${GIORNI_SETT[i]}</small><span class="g-ico">${ic(SEDUTE[k][1])}</span><select data-ch="allenGiorno" data-k="${i}">${Object.entries(SEDUTE).map(([kk, x]) => `<option value="${kk}" ${k === kk ? 'selected' : ''}>${x[0]}</option>`).join('')}</select></div>`).join('')}<div class="giorno partita"><small>Weekend</small><span class="g-ico">${ic('pallone')}</span><b>Partita</b></div></div>
    <div class="scelta"><span>Programmi pronti</span><div class="chips wrap"><button class="chip" data-a="allenPreset" data-v="eq">Equilibrato</button><button class="chip" data-a="allenPreset" data-v="dur">Duro</button><button class="chip" data-a="allenPreset" data-v="tec">Tecnico</button><button class="chip" data-a="allenPreset" data-v="rip">Leggero</button></div></div>
    <div class="scelta"><span>Intensità</span><div class="seg">${INTENSITA.map((x, i) => `<button class="${(A.int == null ? 1 : A.int) === i ? 'on' : ''}" data-a="allenInt" data-v="${i}">${x}</button>`).join('')}</div><p class="nota">Più intenso: crescono di più, ma si stancano e rischiano infortuni.</p></div>`)}
  ${carta('Effetti', `${Object.entries(SEDUTE).map(([k, x]) => `<div class="eff-r ${n(k) ? '' : 'spento'}">${ic(x[1])}<span><b>${x[0]}</b> ×${n(k)}<small>${x[2]}</small></span></div>`).join('')}
    <div class="linea-f"><span>Intesa</span>${barra(S.intesa || 50)}<b>${Math.round(S.intesa || 50)}</b></div><div class="linea-f"><span>Preparazione</span>${barra(S.prep || 50)}<b>${Math.round(S.prep || 50)}</b></div>
    <p class="nota">Staff e centro allenamento: allenatore ${stelle(livStaff(S, 'all'))} · preparatore ${stelle(livStaff(S, 'atl'))} · fisioterapista ${stelle(livStaff(S, 'fisio'))} · centro livello ${S.stadio.centro || 0}</p>`)}
  ${carta('Ultima settimana', ult ? `<p>${ult.migliorati.length ? `${ic('freccia_su', 'verde')} Migliorati: <b>${ult.migliorati.map(esc).join(', ')}</b>` : 'Nessuno è migliorato questa volta.'}</p>${ult.infortunati.length ? `<p class="rosso">${ic('medico')} Infortunati in allenamento: ${ult.infortunati.map(esc).join(', ')}</p>` : ''}<p class="nota">Intesa ${ult.intesa >= 0 ? '+' : ''}${ult.intesa}</p>` : '<p class="tenue">Il resoconto arriva dopo la prima giornata.</p>')}
  ${carta('Allenamento individuale', `<p class="nota">Ogni giocatore può avere un allenamento suo.</p><div class="istr">${S.rosa.slice().sort((a, b) => 'PDCA'.indexOf(a.r) - 'PDCA'.indexOf(b.r) || b.val - a.val).map((p) => `<div class="istr-r"><span class="ruolo r${p.r}">${p.r}</span><span>${esc(nomeG(p))} <small class="tenue">${p.val}/${p.pot}</small></span><select data-ch="allenInd" data-id="${p.id}">${ALLEN_IND.map(([k, x]) => `<option value="${k}" ${(p.allen || '') === k ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`).join('') || '<p class="tenue">Nessun giocatore.</p>'}</div>`, '', 'largo2')}
  </div>`;
}
function schermoGiovanili(){
  const G = S.giovanili || [], SC = S.scoutGiov || [];
  return `<div class="griglia">
  ${carta(esc(nomePrimavera()) + ` <span class="tenue">${G.length}/16</span>`, G.length ? `<div class="lista-g">${G.slice().sort((a, b) => b.pot - a.pot).map((p) => rigaGiocatore(p, false, `<small class="pot">POT ${p.pot}</small>`)).join('')}</div>` : '<p class="tenue">Nessun ragazzo: manda gli osservatori!</p>', `<span class="tenue">Centro giovanile liv. ${S.stadio.giov}</span>`)}
  ${carta('Osservatori', `<p class="nota">Manda gli osservatori a cercare ragazzi di talento. Più è bravo l’osservatore (${stelle(livStaff(S, 'oss'))}), più trovi giocatori forti.</p><div class="zone">${ZONE_SCOUT.map((z, i) => `<button class="zona" data-a="scout" data-v="${i}" ${S.soldi < costoScout(i) ? 'disabled' : ''}>${ic('mondo')}<b>${z[0]}</b><small>${euroBreve(costoScout(i))}</small></button>`).join('')}</div>
    ${SC.length ? `<h3>Trovati</h3><div class="lista-g">${SC.map((p) => `<div class="merc-r">${rigaGiocatore(p, false, `<small class="pot">POT ${livStaff(S, 'oss') >= 2 ? p.pot : p.pot > p.val + 15 ? 'alto' : '?'}</small>`)}<button class="btn mini" data-a="giovIngaggia" data-id="${p.id}" ${S.soldi < p.costo ? 'disabled' : ''}>${euroBreve(p.costo)}</button></div>`).join('')}</div><p class="nota">Restano disponibili per qualche giornata.</p>` : ''}`)}
  ${carta('Come funziona', `<p>I ragazzi crescono da soli ogni giornata, di più con un centro giovanile e un centro allenamento migliori. Quando sono pronti, promuovili in prima squadra. A 20 anni devono salire o lasciano la società.</p><p class="nota">Ogni estate arrivano ragazzi nuovi dal tuo settore giovanile.</p>`)}
  </div>`;
}

// ---------- MERCATO ----------
function schermoMercato(){ const t = sottoschermo.mercato || 'cerca'; return ({ cerca: () => schermoLista('cerca'), campioni: () => schermoLista('campioni'), svincolati: () => schermoLista('svincolati'), trattative: schermoOfferte, staff: schermoStaff })[t](); }
function schermoLista(tipo){
  const base = tipo === 'campioni' ? listaCampioni() : tipo === 'svincolati' ? (S.svincolati || []) : S.mercato.lista;
  const L = filtra(base, tipo);
  const oss = livStaff(S, 'oss');
  const intro = tipo === 'campioni' ? `<div class="carta-tit"><h3>${ic('stella', 'oro')} Calciatori veri</h3></div><p class="nota">I campioni della Serie A e d’Italia. Costano tanto: risparmia e sali di categoria per prenderli! La bravura la decide il gioco.</p>`
    : tipo === 'svincolati' ? `<div class="carta-tit"><h3>Svincolati</h3></div><p class="nota">Giocatori senza squadra: non costano niente per il cartellino, devi solo accordarti sullo stipendio. Spesso sono esperti.</p>`
    : `<div class="carta-tit"><h3>Giocatori delle altre squadre</h3><button class="link" data-a="ricerca">${ic('ricarica')} Nuova ricerca (${euroBreve(costoRicerca())})</button></div><p class="nota">Tratta il prezzo con la squadra, poi lo stipendio con il giocatore. Puoi anche chiederli in prestito.</p>`;
  return `<section class="carta">${intro}${filtriHTML(tipo)}
  ${S.rosa.length < 11 && tipo === 'cerca' ? `<button class="btn oro largo" data-a="squadraPronta">${ic('fulmine')} Squadra pronta in un tocco</button>` : ''}</section>
  <section class="carta"><div class="lista-g">${L.map((p) => `<div class="merc-r">${rigaGiocatore(p, false, `<small class="pot">${oss >= 1 && p.pot >= p.val + 10 ? 'talento' : ''}</small>`)}<div class="merc-az"><b>${tipo === 'svincolati' ? 'gratis' : euroBreve(p.stella ? p.prezzo : p.chiede || p.prezzo)}</b><button class="btn mini" data-a="tratta" data-id="${p.id}">${tipo === 'svincolati' ? 'Firma' : 'Tratta'}</button></div></div>`).join('') || '<p class="tenue">Nessuno: prova una nuova ricerca o cambia i filtri.</p>'}</div>
  ${tipo === 'cerca' ? '<p class="nota">La lista si rinnova da sola ogni 3 giornate. Con un osservatore più bravo trovi giocatori migliori.</p>' : ''}</section>`;
}
function schermoOfferte(){
  const O = S.offerte || [];
  const inLista = S.rosa.filter((p) => p.lista), inPrest = S.rosa.filter((p) => p.prestito);
  return `<div class="griglia">
  ${carta('Offerte ricevute', O.length ? O.map((o) => { const p = S.rosa.find((x) => x.id === o.pid); if (!p) return ''; return `<div class="offerta">${avatarSVG(p, 44, coloriMiei())}<div class="of-t"><b>${esc(o.club)}</b><small>vuole ${esc(p.n)} ${esc(p.c)} (${p.val}) · valore ${euroBreve(p.prezzo)}</small><b class="oro">${euro(o.imp)}</b><small>scade fra ${giornate(Math.max(1, o.scade - S.giornate))}</small></div><div class="of-b"><button class="btn mini" data-a="offAccetta" data-id="${o.id}">Accetta</button><button class="btn mini sec" data-a="offRilancia" data-id="${o.id}" ${o.rilancio ? 'disabled' : ''}>Chiedi di più</button><button class="btn mini sec rosso" data-a="offRifiuta" data-id="${o.id}">No</button></div></div>`; }).join('') : '<p class="tenue">Nessuna offerta per ora. Metti in vendita un giocatore (dalla sua scheda) per ricevere offerte.</p>')}
  ${carta('In vendita', inLista.length ? `<div class="lista-g">${inLista.map((p) => rigaGiocatore(p, false)).join('')}</div>` : '<p class="tenue">Nessun giocatore in vendita.</p>')}
  ${carta('Prestiti', `${inPrest.length ? `<h4>Arrivati in prestito</h4><div class="lista-g">${inPrest.map((p) => rigaGiocatore(p, false)).join('')}</div>` : ''}${(S.inPrestito || []).length ? `<h4>Mandati in prestito</h4>${S.inPrestito.map((x) => `<p>${esc(x.p.n)} ${esc(x.p.c)} al ${esc(x.club)}</p>`).join('')}` : ''}${!inPrest.length && !(S.inPrestito || []).length ? '<p class="tenue">Nessun prestito in corso.</p>' : ''}`)}
  ${carta('Movimenti di mercato', `<div class="mov">${(S.movimenti || []).filter((m) => ['acquisti', 'cessioni', 'commissioni'].includes(m.cat)).slice(0, 12).map((m) => `<div><span>${esc(m.t)}</span><b class="${m.v >= 0 ? 'verde' : 'rosso'}">${m.v >= 0 ? '+' : ''}${euroBreve(m.v)}</b></div>`).join('') || '<p class="tenue">Ancora nessun movimento.</p>'}</div>`)}
  </div>`;
}
function schermoStaff(){
  return `<div class="griglia">${STAFF.map((s) => { const c = S.staff[s.k]; const cand = S.staffMercato.lista.filter((x) => x.k === s.k && (!c || x.liv > c.liv));
    return `<section class="carta staff"><div class="carta-tit"><h3>${ic(IC_STAFF[s.k])} ${s.nome}${s.obbl ? ' <span class="obbl">obbligatorio</span>' : ''}</h3></div><p class="nota">${s.eff}</p>
    ${c ? `<button class="staff-c" data-a="staffInfo" data-id="${c.id}"><span><b>${esc(c.nome)}</b>${stelle(c.liv)}</span><small>${nazDi(c.naz).f} ${c.eta || ''} anni · ${euroBreve(c.stip)} a giornata${c.mod ? ' · ama il ' + c.mod : ''}</small><span class="att">${(STAFF_ATT[s.k] || []).map((n, i) => `<span>${n} <b>${c.att ? c.att[i] : '—'}</b></span>`).join('')}</span></button><button class="link rosso" data-a="licenzia" data-k="${s.k}">Licenzia</button>` : '<div class="staff-c vuoto">Nessuno</div>'}
    <div class="cand">${cand.map((x) => `<div class="cand-r"><button class="cand-n" data-a="staffInfo" data-id="${x.id}">${stelle(x.liv)}<b>${esc(x.nome)}</b><small>${euroBreve(x.stip)}/giornata</small></button><button class="btn mini" data-a="ingaggia" data-id="${x.id}" ${S.soldi < x.ingaggio && !trucco('gratis') ? 'disabled' : ''}>${euroBreve(trucco('gratis') ? 0 : x.ingaggio)}</button></div>`).join('') || '<p class="tenue">Hai già il migliore!</p>'}</div></section>`; }).join('')}</div>`;
}
function schedaStaff(id){
  const s = Object.values(S.staff).find((x) => x.id === id) || S.staffMercato.lista.find((x) => x.id === id); if (!s) return;
  const R = STAFF.find((x) => x.k === s.k), mio = S.staff[s.k] === s;
  foglio(`<div class="tr-testa">${avatarSVG({ id: s.id, n: s.nome, c: '', naz: s.naz, eta: s.eta || 45 }, 64)}<div><h2>${esc(s.nome)}</h2><p class="tenue">${esc(R.nome)} · ${nazDi(s.naz).f} ${s.eta || ''} anni</p>${stelle(s.liv)}</div></div>
  <div class="dati-g">${(STAFF_ATT[s.k] || []).map((n, i) => `<div><small>${n}</small><b>${s.att ? s.att[i] : '—'}</b><small>su 20</small></div>`).join('')}<div><small>Stipendio</small><b>${euroBreve(s.stip)}</b><small>a giornata</small></div>${mio ? '' : `<div><small>Ingaggio</small><b>${euroBreve(s.ingaggio)}</b></div>`}${s.mod ? `<div><small>Modulo preferito</small><b>${s.mod}</b></div>` : ''}</div>
  <p class="nota">${esc(R.eff)}.</p>
  <div class="riga-btn">${mio ? `<button class="btn rosso" data-a="licenzia" data-k="${s.k}">Licenzia</button>` : `<button class="btn" data-a="ingaggia" data-id="${s.id}">Ingaggia · ${euroBreve(trucco('gratis') ? 0 : s.ingaggio)}</button>`}<button class="btn sec" data-a="chiudi">Chiudi</button></div>`);
}

// ---------- CLUB ----------
function schermoClub(){ const t = sottoschermo.club || 'finanze'; return ({ finanze: schermoFinanze, stadio: schermoStadio, media: schermoMedia, bacheca: schermoBacheca, personalizza: schermoPersonalizza })[t](); }
function schermoFinanze(){
  const c = contiStagione(), e = totaleConti(c, 'e'), u = totaleConti(c, 'u'), b = S.bilancio;
  const righe = (lato, cat) => { const o = c[lato], mx = Math.max(1, ...Object.values(o)); return Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<div class="fin-r"><span>${ic((cat[k] || cat.altro)[1])} ${(cat[k] || cat.altro)[0]}</span>${barra(v / mx * 100, lato === 'e' ? 'verde' : 'rosso')}<b class="${lato === 'e' ? 'verde' : 'rosso'}">${lato === 'e' ? '+' : '−'}${euroBreve(v)}</b></div>`).join('') || '<p class="tenue">Ancora niente.</p>'; };
  const mp = maxPrestito(), libero = Math.max(0, Math.round(mp * 1.12 - debitoTot()) / 1.1);
  const tagli = [0.25, 0.5, 1].map((x) => tondo(mp * x)).filter((x, i, a) => a.indexOf(x) === i);
  const valRosa = S.rosa.reduce((s, p) => s + p.prezzo, 0);
  return `<div class="griglia">
  <section class="carta"><div class="riass"><div><small>Cassa</small><b class="${S.soldi < 0 ? 'rosso' : ''}">${euro(S.soldi)}</b></div><div><small>Debiti</small><b class="${debitoTot() ? 'rosso' : ''}">${euroBreve(debitoTot())}</b></div><div><small>Valore rosa</small><b>${euroBreve(valRosa)}</b></div><div><small>Bilancio stagione</small><b class="${e - u >= 0 ? 'verde' : 'rosso'}">${e - u >= 0 ? '+' : ''}${euroBreve(e - u)}</b></div></div>
  ${graficoLinea(S.soldiStoria, 320, 90, '#d4af37', [euroBreve(S.soldiStoria[0]), 'adesso ' + euroBreve(S.soldi)])}</section>
  ${carta('Entrate della stagione ' + S.stagione, righe('e', CAT_E), `<b class="verde">+${euroBreve(e)}</b>`)}
  ${carta('Uscite della stagione ' + S.stagione, righe('u', CAT_U), `<b class="rosso">−${euroBreve(u)}</b>`)}
  ${carta('Ogni giornata', b ? `<div class="bil">${b.biglietti ? `<div><span>Biglietti (${(b.spettatori - (b.abbonati || 0)).toLocaleString('it-IT')} paganti)</span><b class="verde">+${euroBreve(b.biglietti)}</b></div>` : ''}${b.negozio ? `<div><span>Bar e negozio</span><b class="verde">+${euroBreve(b.negozio)}</b></div>` : ''}<div><span>Sponsor ${esc(S.sponsor.nome)}</span><b class="verde">+${euroBreve(b.sponsor)}</b></div>${b.tv ? `<div><span>Diritti TV</span><b class="verde">+${euroBreve(b.tv)}</b></div>` : ''}<div><span>Stipendi giocatori</span><b class="rosso">−${euroBreve(b.stipendi)}</b></div>${b.staff ? `<div><span>Stipendi staff</span><b class="rosso">−${euroBreve(b.staff)}</b></div>` : ''}<div><span>Manutenzione</span><b class="rosso">−${euroBreve(b.manut)}</b></div>${b.rate ? `<div><span>Rate del prestito</span><b class="rosso">−${euroBreve(b.rate)}</b></div>` : ''}<div class="tot"><span>Ultima giornata</span><b class="${b.netto >= 0 ? 'verde' : 'rosso'}">${b.netto >= 0 ? '+' : ''}${euroBreve(b.netto)}</b></div></div>` : `<p class="tenue">Ogni giornata: sponsor ${euroBreve(S.sponsor.val)}, stipendi ${euroBreve(stipendiGiocatori() + stipendiStaff())}, manutenzione ${euroBreve(manutenzione())}.</p>`)}
  ${carta(`${ic('banca')} Banca`, `<p class="nota">La banca ti presta soldi da restituire in ${RATE_PRESTITO} rate (una per giornata), con il 10% di interessi.</p>
    <div class="riga-btn">${tagli.map((x) => `<button class="btn sec" data-a="prestitoBanca" data-v="${x}" ${x > libero ? 'disabled' : ''}>Chiedi ${euroBreve(x)}</button>`).join('')}</div>
    ${(S.debiti || []).length ? `<h4>Prestiti in corso</h4>${S.debiti.map((d) => `<div class="debito"><span><b>${euroBreve(d.cap)}</b><small>${d.rimaste} rate da ${euroBreve(d.rata)}</small></span><button class="btn mini sec" data-a="estingui" data-id="${d.id}">Chiudi · ${euroBreve(Math.round(d.rata * d.rimaste * 0.95))}</button></div>`).join('')}` : '<p class="tenue">Nessun prestito: bravo!</p>'}`)}
  ${carta('Ultimi movimenti', `<div class="mov">${(S.movimenti || []).slice(0, 16).map((m) => `<div><span>${esc(m.t || (CAT_E[m.cat] || CAT_U[m.cat] || ['Altro'])[0])}<small> · st. ${m.s}, g. ${m.g}</small></span><b class="${m.v >= 0 ? 'verde' : 'rosso'}">${m.v >= 0 ? '+' : ''}${euroBreve(m.v)}</b></div>`).join('') || '<p class="tenue">Ancora nessun movimento.</p>'}</div>`)}
  </div>`;
}
function schermoStadio(){
  const st = S.stadio, P = prezziDi();
  const prezzoBox = (k, nome, val, stima) => `<div class="prezzo"><span>${nome}</span><div class="stepper"><button class="btn sec mini" data-a="prezzo" data-k="${k}" data-v="-0.1">${ic('meno')}</button><b>${euro(val)}</b><button class="btn sec mini" data-a="prezzo" data-k="${k}" data-v="0.1">${ic('piu')}</button></div><small>${Math.round(P[k] * 100)}% del prezzo normale · ${stima}</small></div>`;
  return `
  <section class="carta stadio-c">
    <div class="stadio-wrap">${(sottoschermo.stadioV || 'pano') === 'pano' ? stadioPanoramaSVG(S) : stadioSVG(S)}<div class="stadio-nome">${esc(nomeStadio(S))}</div></div>
    <div class="tabs piccole">${[['pano', 'Panoramica'], ['alto', 'Dall’alto']].map(([k, n]) => `<button class="${(sottoschermo.stadioV || 'pano') === k ? 'on' : ''}" data-a="filtro" data-k="stadioV" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="riass"><div><small>Posti</small><b>${postiStadio(S).toLocaleString('it-IT')}</b></div><div><small>Pubblico previsto</small><b>${calcPubblico(false).toLocaleString('it-IT')}</b></div><div><small>Abbonati</small><b>${(S.abbS === S.stagione ? (S.abbonati || 0) : 0).toLocaleString('it-IT')}</b></div><div><small>Tifosi</small><b>${S.tifosi.toLocaleString('it-IT')}</b></div></div>
    <div class="usura"><div class="usura-t"><span>Stato dello stadio</span><b class="${st.usura < 60 ? 'rosso' : st.usura < 80 ? 'giallo' : 'verde'}">${Math.round(st.usura)}%</b></div>${barra(st.usura, st.usura < 60 ? 'rosso' : st.usura < 80 ? 'giallo' : 'verde')}
    <button class="btn ${st.usura < 80 ? 'oro' : 'sec'}" data-a="restaura" ${st.usura >= 99 ? 'disabled' : ''}>${ic('pennello')} Restaura tutto · ${euroBreve(trucco('gratis') ? 0 : costoRestauro(S))}</button><p class="nota">Ogni partita in casa rovina un po’ il campo. Sotto il 60% vengono meno tifosi.</p></div>
  </section>
  ${carta(`${ic('biglietto')} Biglietti e abbonamenti`, `<div class="prezzi">${prezzoBox('bigl', 'Biglietto', prezzoBiglietto(), 'più basso = più pubblico')}${prezzoBox('abb', 'Abbonamento stagionale', prezzoAbb(), S.abbS === S.stagione ? 'campagna chiusa' : 'circa ' + stimaAbbonati().toLocaleString('it-IT') + ' abbonati')}</div>
    <p class="nota">${S.abbS === S.stagione ? `Quest’anno hai ${(S.abbonati || 0).toLocaleString('it-IT')} abbonati: entrano gratis a ogni partita in casa.` : 'La campagna abbonamenti si chiude alla prima partita della stagione: gli abbonati pagano subito e poi entrano gratis.'}</p>`)}
  ${progettoStadio()}
  <div class="griglia">${STADIO.map((s) => { const liv = st[s.k] || 0, max = s.costi.length - 1, c = st.cantieri.find((x) => x.k === s.k), costo = liv < max ? costoLavoro(s.k, liv + 1) : 0;
    return `<section class="carta miglioria"><div class="mig-top"><span class="mig-ico">${ic(IC_STADIO[s.k] || 'stadio')}</span><div><h3>${s.nome}</h3><p>${s.livelli[liv]}${s.posti ? ' · ' + s.posti[liv].toLocaleString('it-IT') + ' posti' : ''}</p></div><span class="livelli">${Array.from({ length: max }, (_, i) => `<i class="${i < liv ? 'on' : c && i === liv ? 'lavori' : ''}"></i>`).join('')}</span></div>
    <p class="nota">${s.eff}</p>
    ${c ? `<div class="lavori-b">${ic('stadio')} Lavori in corso: ${s.livelli[c.liv]} · finiscono fra ${giornate(Math.max(0, c.fine - S.giornate))}</div>`
      : liv < max ? `<button class="btn mig-btn" data-a="costruisci" data-k="${s.k}" ${S.soldi < costo ? 'disabled' : ''}><span>${liv === 0 && !s.posti ? 'Costruisci' : 'Migliora'}: ${s.livelli[liv + 1]}${s.posti ? ' (' + s.posti[liv + 1].toLocaleString('it-IT') + ' posti)' : ''}</span><b>${euroBreve(costo)}${costo < s.costi[liv + 1] && !trucco('gratis') ? ' (−50%)' : ''} · ${s.tempi[liv + 1]} g.</b></button>` : '<div class="lavori-b max">Al massimo!</div>'}</section>`; }).join('')}</div>
  <p class="nota centro">Manutenzione: ${euro(manutenzione())} a giornata</p>`;
}
function progettoStadio(){
  const d = designDi(S), aperto = sottoschermo.progetto;
  const chipCol = (k, val, lista) => `<div class="colori">${lista.map((c) => `<button class="col ${val === c ? 'on' : ''}" style="--c:${c || S.club.c1}" data-a="design" data-k="${k}" data-v="${c}" aria-label="colore">${c ? '' : ic('scudo')}</button>`).join('')}</div>`;
  const tog = (k, nome) => `<button class="chip ${d[k] ? 'on' : ''}" data-a="design" data-k="${k}" data-v="${d[k] ? '0' : '1'}">${nome}</button>`;
  return `<section class="carta progetto"><button class="carta-tit apri" data-a="apriProgetto"><h3>${ic('pennello')} Progetta il tuo stadio</h3><span>${aperto ? '▲' : '▼'}</span></button>
  ${aperto ? `<label class="campo-t">Nome dello stadio<input id="nomeStadio" maxlength="30" placeholder="${esc('Stadio ' + (S.club.citta || S.club.nome))}" value="${esc((S.stadio.design || {}).nome || '')}"></label>
  <div class="scelta"><span>Colore dei seggiolini</span>${chipCol('sedili', (S.stadio.design || {}).sedili || '', [''].concat(COLORI))}</div>
  <div class="scelta"><span>Colore delle curve</span>${chipCol('sedili2', (S.stadio.design || {}).sedili2 || '', [''].concat(COLORI))}</div>
  <div class="scelta"><span>Colore del tetto</span>${chipCol('tetto', d.tetto, ['#e9ecef', '#adb5bd', '#343a40', '#f5c542', '#1971c2', '#c92a2a', '#2b8a3e', S.club.c1])}</div>
  <div class="scelta"><span>Forma</span><div class="chips">${['Classico', 'Ovale'].map((n, i) => `<button class="chip ${d.forma === i ? 'on' : ''}" data-a="design" data-k="forma" data-v="${i}">${n}</button>`).join('')}</div></div>
  <div class="scelta"><span>Dettagli</span><div class="chips wrap">${tog('scritta', 'Nome sulla tribuna')}${tog('bandiere', 'Bandiere')}${tog('fumogeni', 'Fumogeni dei tifosi')}${tog('notte', 'Di sera')}</div></div>
  <p class="nota">Più migliori le tribune, le luci e il maxischermo, più il tuo stadio diventa spettacolare.</p>` : '<p class="nota">Scegli il nome, i colori dei seggiolini, il tetto, la forma, le bandiere e i fumogeni.</p>'}</section>`;
}
function umoreTifosi(){
  const r = (S.risultati || []).slice(-5), v = r.filter((x) => x.esito === 'V').length, p = r.filter((x) => x.esito === 'P').length;
  const u = clamp(50 + (v - p) * 9 + (S.morale - 60) / 2, 5, 100);
  const frasi = u >= 75 ? ['Che squadra! Quest’anno si vola!', 'Abbonamento già rinnovato, forza ragazzi!', 'Il presidente è un genio!'] : u >= 45 ? ['Si può fare di più, ma ci crediamo.', 'Avanti così, ma serve qualche rinforzo.', 'Bella partita, peccato per qualche errore.'] : ['Così non va, presidente!', 'Servono acquisti, subito!', 'Vogliamo vedere più grinta in campo!'];
  return { u, frasi };
}
function schermoMedia(){
  const filtro = sottoschermo.notTipo || '';
  const N = S.notizie.filter((n) => !filtro || n.tipo === filtro);
  const U = umoreTifosi(), h = hashStr(String(S.giornate));
  const tipi = [...new Set(S.notizie.map((n) => n.tipo))];
  return `<div class="griglia">
  <section class="carta giornale"><div class="gio-testata"><b>${esc(GIORNALI[S.giornate % GIORNALI.length])}</b><small>Stagione ${S.stagione} · giornata ${S.lega.giocate}</small></div>${S.notizie[0] ? `<h2 class="gio-tit">${esc(S.notizie[0].t)}</h2>` : '<p class="tenue">Ancora nessuna notizia.</p>'}${S.notizie.slice(1, 3).map((n) => `<p class="gio-sub">${esc(n.t)}</p>`).join('')}</section>
  ${carta(`${ic('bandiera')} I tifosi`, `<div class="linea-f"><span>Umore</span>${barra(U.u, U.u >= 60 ? 'verde' : U.u >= 40 ? 'giallo' : 'rosso')}<b>${Math.round(U.u)}</b></div>${[0, 1].map((k) => `<div class="tweet">${ic('utente')}<p>«${esc(U.frasi[(h + k) % U.frasi.length])}»<small>@tifoso_${esc((S.club.sigla || 'pm').toLowerCase())}${(h >> (k + 2)) % 90 + 10}</small></p></div>`).join('')}`)}
  ${carta('Tutte le notizie', `<div class="chips wrap"><button class="chip ${!filtro ? 'on' : ''}" data-a="notizieTipo" data-v="">Tutte</button>${tipi.map((t) => `<button class="chip ${filtro === t ? 'on' : ''}" data-a="notizieTipo" data-v="${t}">${(TIPI_NOTIZIA[t] || ['', t])[1]}</button>`).join('')}</div><div class="notizie">${N.slice(0, 40).map(rigaNotizia).join('') || '<p class="tenue">Niente qui.</p>'}</div>`, '', 'largo2')}
  </div>`;
}
function schermoBacheca(){
  const tutti = S.rosa.concat((S.inPrestito || []).map((x) => x.p));
  const rec = (k, n) => { const p = tutti.slice().sort((a, b) => ((b[k + 'Tot'] || 0) + (b[k] || 0)) - ((a[k + 'Tot'] || 0) + (a[k] || 0)))[0]; return p ? `<div><small>${n}</small><b>${esc(nomeG(p))}</b><small>${(p[k + 'Tot'] || 0) + (p[k] || 0)}</small></div>` : ''; };
  return `<div class="griglia">
  ${carta(`${ic('coppa', 'oro')} Trofei`, S.trofei.length ? `<div class="trofei">${S.trofei.map((t) => `<div class="trofeo"><span>${ic('coppa')}</span><b>${esc(t.nome)}</b><small>Stagione ${t.stagione}</small></div>`).join('')}</div>` : '<p class="tenue">La bacheca aspetta il primo trofeo. Vinci il campionato!</p>')}
  ${carta('La tua storia', S.storico.length ? `<div class="storia">${S.storico.map((h) => `<div class="st-r"><b>Stagione ${h.stagione}</b><span>${TIERS[h.tier - 1].nome}</span><span class="pos-b">${h.pos}°</span><span class="tenue">${h.pt} pt · ${h.v}V ${h.n_}N ${h.p}P${h.bomber ? ' · ' + esc(h.bomber) : ''}</span></div>`).join('')}</div>` : '<p class="tenue">Finisci la prima stagione per scrivere la tua storia.</p>')}
  ${carta('Record del club', `<div class="dati-g">${rec('gol', 'Più gol')}${rec('ass', 'Più assist')}${rec('pres', 'Più presenze')}<div><small>Stagioni giocate</small><b>${S.stagione}</b></div><div><small>Partite</small><b>${S.giornate}</b></div><div><small>Miglior piazzamento</small><b>${(() => { const h = S.storico.slice().sort((x, y) => y.tier - x.tier || x.pos - y.pos)[0]; return h ? TIERS[h.tier - 1].breve + ' ' + h.pos + '°' : '—'; })()}</b></div></div>`)}
  </div>`;
}
function schermoPersonalizza(){
  const c = S.club;
  return `<div class="griglia">
  <section class="carta perso"><div class="anteprima">${mioStemma(96)}<div><b>${esc(c.nome)}</b><small>${esc(c.sigla || '')} · ${esc(c.citta || '')}</small><div class="kit-ant">${magliaSVG(kitDi(c, false), 50, 10)}${magliaSVG(kitDi(c, true), 50, 10)}</div></div></div>
  <div class="dati-g"><div><small>Presidente</small><b>${esc(c.mister || '—')}</b></div><div><small>Squadra giovanile</small><b>${esc(nomePrimavera())}</b></div><div><small>Stadio</small><b>${esc(nomeStadio(S))}</b></div><div><small>Obiettivo</small><b>${AMBIZIONI[c.amb == null ? 1 : c.amb][0]}</b></div><div><small>Livello</small><b>${DIFFICOLTA[livello()].ico} ${DIFFICOLTA[livello()].nome}</b></div></div>
  <div class="liv-box"><small>Il tuo livello · ${livello() + 1} di ${LIV_MAX + 1}</small>${scalaLivelli(livello())}<p class="nota">${livello() < LIV_MAX ? `Vinci la Serie A per passare a <b>${DIFFICOLTA[livello() + 1].nome}</b>.` : 'Sei al livello più alto: in Serie A giochi le coppe!'}${(S.livelli || []).length ? ' Livelli superati: ' + S.livelli.map((x) => DIFFICOLTA[x.d].nome + ' (stagione ' + x.s + ')').join(', ') + '.' : ''}</p></div>
  <button class="btn largo" data-a="modClub">${ic('pennello')} Cambia nome, stemma, maglie e nomi</button></section>
  ${carta('Partita', `<div class="scelta"><span>Velocità della partita</span><div class="seg">${[1, 2, 4].map((x) => `<button class="${(S.opz.vel || 2) === x ? 'on' : ''}" data-a="segOpz" data-k="vel" data-v="${x}">×${x}</button>`).join('')}</div></div><div class="scelta"><span>Telecamera</span><div class="seg">${[['tv', 'Telecamera'], ['alto', 'Dall’alto'], ['numeri', 'Solo numeri']].map(([k, n]) => `<button class="${(S.opz.vista || 'tv') === k ? 'on' : ''}" data-a="segOpz" data-k="vista" data-v="${k}">${n}</button>`).join('')}</div></div>`)}
  </div>`;
}

// ---------- CAMPIONATO ----------
function schermoCampionato(){ const t = sottoschermo.campionato || 'classifica'; return ({ classifica: schermoClassifica, calendario: schermoCalendario, risultati: schermoRisultati, scalata: schermoScalata })[t](); }
function schermoClassifica(){
  const L = S.lega, d = L.dati, umaniN = umani(d).length;
  const migliori = (k) => { const x = d.squadre.map((s, i) => Object.assign({ i }, s)).sort((a, b) => k === 'gs' ? a.gs - b.gs : b[k] - a[k])[0]; return x ? `${esc(x.nome)} (${x[k]})` : ''; };
  return `<section class="carta"><div class="carta-tit"><h3>${TIERS[d.tier - 1].nome} · ${esc(d.nome)}</h3><span class="tenue">Stagione ${d.stagione} · giornata ${Math.min(d.giornata + 1, giornateTot(d.n))}/${giornateTot(d.n)}</span></div>
    <div class="legenda"><span><i class="q promo"></i>${d.tier < TOP ? 'Promozione' : 'Campione'}</span>${d.tier > 1 ? '<span><i class="q retro"></i>Retrocessione</span>' : ''}<span>BOT = squadra del computer</span></div>
    ${tabellaHTML(ordina(d.squadre), d, false)}
    <p class="nota">${L.online ? `Girone online con ${umaniN} ${umaniN === 1 ? 'persona vera' : 'persone vere'}. ${d.tier === TOP ? 'Quando la Serie A è tutta di persone vere, la classifica si allunga!' : 'Quando entra un nuovo presidente prende il posto di un bot, con i suoi punti.'}` : 'Se vai online, le persone vere prendono il posto dei bot.'}</p></section>
  ${d.giornata ? carta('Numeri del girone', `<div class="dati-g"><div><small>Miglior attacco</small><b>${migliori('gf')}</b></div><div><small>Miglior difesa</small><b>${migliori('gs')}</b></div><div><small>Più vittorie</small><b>${migliori('v')}</b></div></div>`) : ''}`;
}
function schermoCalendario(){
  const L = S.lega, d = L.dati, cal = calendario(d.n);
  return carta('Le tue partite', `<div class="cal">${cal.map((g, r) => { const m = g.find(([h, a]) => h === L.mio || a === L.mio); if (!m) return ''; const casa = m[0] === L.mio; const avv = d.squadre[casa ? m[1] : m[0]];
    const x = d.ris[r] && d.ris[r].find((q) => q.h === m[0] && q.a === m[1]);
    let esito = ''; if (x){ const gf = casa ? x.gh : x.ga, gs = casa ? x.ga : x.gh; esito = `<b class="es ${gf > gs ? 'V' : gf < gs ? 'P' : 'N'}">${x.gh}-${x.ga}</b>`; }
    return `${r === giornateTot(d.n) / 2 ? '<div class="cal-sep">Girone di ritorno</div>' : ''}<div class="cal-r ${r === d.giornata ? 'ora' : ''}"><span class="g">${r + 1}</span><span class="dove">${casa ? 'C' : 'T'}</span>${stemmaDi(avv, 22)}<span class="nm">${esc(avv.nome)}</span>${esito || (r === d.giornata ? '<b class="es prossima">PROSSIMA</b>' : '<span class="tenue">—</span>')}</div>`; }).join('')}</div><p class="nota">C = in casa · T = in trasferta</p>`);
}
function schermoRisultati(){
  const d = S.lega.dati, giocate = Object.keys(d.ris).map(Number).sort((a, b) => a - b);
  if (!giocate.length) return carta('Risultati', '<p class="tenue">Ancora nessuna giornata giocata.</p>');
  const g = sottoschermo.risG != null && d.ris[sottoschermo.risG] ? +sottoschermo.risG : giocate[giocate.length - 1];
  return carta(`Giornata ${g + 1}`, `<div class="chips wrap scroll">${giocate.map((r) => `<button class="chip ${r === g ? 'on' : ''}" data-a="filtro" data-k="risG" data-v="${r}">${r + 1}</button>`).join('')}</div>
    <div class="altri">${d.ris[g].map((x) => `<div class="${x.h === S.lega.mio || x.a === S.lega.mio ? 'io' : ''}"><span>${esc(d.squadre[x.h].nome)}</span><b>${x.gh} - ${x.ga}</b><span>${esc(d.squadre[x.a].nome)}</span></div>`).join('')}</div>`);
}
function schermoScalata(){
  return `<div class="griglia">${carta('La scalata', `<p class="nota">Vinci il campionato o arriva secondo per salire. Gli ultimi due scendono. In cima c’è la Serie A!</p><div class="scala">${TIERS.map((t, i) => ({ t, i })).reverse().map(({ t, i }) => `<div class="gradino ${i + 1 === S.tier ? 'qui' : i + 1 < S.tier ? 'fatto' : ''}" style="--c:${t.colore};--w:${55 + i * 5}%"><span>${i + 1 === S.tier ? mioStemma(22) : ''}${t.nome}</span><small>${i + 1 === S.tier ? 'Sei qui' : i + 1 < S.tier ? ic('check') : euroBreve(t.premio)}</small></div>`).join('')}</div>`)}
  ${carta('Premi e incassi per categoria', `<div class="tab-wrap"><table class="tab"><thead><tr><th class="sx">Categoria</th><th>Sponsor</th><th>TV</th><th>Premio</th></tr></thead><tbody>${TIERS.map((t, i) => `<tr class="${i + 1 === S.tier ? 'io' : ''}"><td class="sx">${t.nome}</td><td>${euroBreve(t.sponsor)}</td><td>${t.tv ? euroBreve(t.tv) : '—'}</td><td>${euroBreve(t.premio)}</td></tr>`).join('')}</tbody></table></div><p class="nota">Sponsor e TV sono a giornata; il premio è per il primo posto.</p>`)}</div>`;
}

// ---------- risultato e fine stagione ----------
function mostraRisultati(rep, dopo){
  const d = S.lega.dati, b = rep.bil, st = rep.st;
  const i0 = st ? st.noi : 0, mio = (k) => st[k][i0], loro = (k) => st[k][1 - i0];
  const riga = (n, a, c) => { const t = Math.max(1, a + c); return `<div class="ms-r"><b>${a}</b><div><small>${n}</small><span class="ms-b"><i style="width:${a / t * 100}%;background:${S.club.c1}"></i><i style="width:${c / t * 100}%;background:${rep.avv.c1}"></i></span></div><b>${c}</b></div>`; };
  foglio(`<h2>${rep.esito === 'V' ? 'Vittoria!' : rep.esito === 'N' ? 'Pareggio' : 'Sconfitta'}</h2>${cartaRisultato(rep)}
  ${rep.motm ? `<div class="motm">${ic('stella')} Migliore in campo: <b>${esc(rep.motm)}</b></div>` : ''}
  <div class="m-stat">${riga('Possesso %', rep.pos, 100 - rep.pos)}${riga('Tiri', rep.tiri, rep.tiriAvv)}${st ? riga('Tiri in porta', mio('porta'), loro('porta')) + riga('Calci d’angolo', mio('corner'), loro('corner')) + riga('Falli', mio('falli'), loro('falli')) + riga('Gialli', mio('amm'), loro('amm')) + riga('Rossi', mio('esp'), loro('esp')) : ''}</div>
  ${(rep.voti || []).length ? `<h3>Pagelle</h3><div class="pagelle">${rep.voti.map((x) => `<div><span class="ruolo r${x.r}">${x.r}</span><span>${esc(x.n)}</span><b class="voto ${x.v >= 7 ? 'su' : x.v < 6 ? 'giu' : ''}">${x.v}</b></div>`).join('')}</div>` : ''}
  ${b ? `<h3>Cassa della giornata</h3><div class="bil">${b.biglietti ? `<div><span>Biglietti (${b.spettatori.toLocaleString('it-IT')} spettatori${b.abbonati ? ', ' + b.abbonati.toLocaleString('it-IT') + ' abbonati' : ''})</span><b class="verde">+${euroBreve(b.biglietti)}</b></div>` : ''}${b.negozio ? `<div><span>Bar e negozio</span><b class="verde">+${euroBreve(b.negozio)}</b></div>` : ''}<div><span>Sponsor</span><b class="verde">+${euroBreve(b.sponsor)}</b></div>${b.tv ? `<div><span>Diritti TV</span><b class="verde">+${euroBreve(b.tv)}</b></div>` : ''}<div><span>Stipendi giocatori</span><b class="rosso">−${euroBreve(b.stipendi)}</b></div>${b.staff ? `<div><span>Stipendi staff</span><b class="rosso">−${euroBreve(b.staff)}</b></div>` : ''}<div><span>Manutenzione</span><b class="rosso">−${euroBreve(b.manut)}</b></div>${b.rate ? `<div><span>Rate del prestito</span><b class="rosso">−${euroBreve(b.rate)}</b></div>` : ''}<div class="tot"><span>Totale</span><b class="${b.netto >= 0 ? 'verde' : 'rosso'}">${b.netto >= 0 ? '+' : ''}${euroBreve(b.netto)}</b></div></div>` : ''}
  <h3>Gli altri risultati</h3><div class="altri">${rep.ris.map((x) => `<div class="${x.h === rep.mio || x.a === rep.mio ? 'io' : ''}"><span>${esc(x.nh)}</span><b>${x.gh} - ${x.ga}</b><span>${esc(x.na)}</span></div>`).join('')}</div>
  <h3>Classifica${rep.r + 1 >= giornateTot(rep.n || d.n) ? ' finale' : ''}</h3>${rep.tab ? tabellaHTML(rep.tab, { n: rep.n, tier: rep.tier }, true, 0, rep.mio) : tabellaHTML(ordina(d.squadre), d, true)}
  <div class="riga-btn"><button class="btn largo" data-a="chiudi">Continua</button></div>`, dopo);
}
function mostraFineStagione(p, dopo){
  const titolo = p.campione && p.vecchioTier === TOP ? 'CAMPIONI D’ITALIA!' : p.campione ? 'CAMPIONI!' : p.sale ? 'PROMOSSI!' : p.scende ? 'Retrocessi' : 'Stagione finita';
  const sotto = p.sale ? `La ${esc(S.club.nome)} sale in <b>${TIERS[p.nuovoTier - 1].nome}</b>` : p.scende ? `Si riparte dalla <b>${TIERS[p.nuovoTier - 1].nome}</b>. Niente paura!` : `Restate in <b>${TIERS[p.nuovoTier - 1].nome}</b>`;
  const lista = (ico, t, L, cls = '') => L && L.length ? `<p class="${cls}">${ic(ico)} ${t}: ${L.map(esc).join(', ')}</p>` : '';
  foglio(`<div class="fine-st ${p.sale || p.campione ? 'festa' : p.scende ? 'triste' : ''}"><div class="coppa">${ic(p.campione ? 'coppa' : p.sale ? 'freccia_su' : p.scende ? 'freccia_giu' : 'calendario')}</div><h1>${titolo}</h1><p>${sotto}</p>
  <div class="dati-g"><div><small>Posizione</small><b>${p.pos}°</b><small>su ${p.n}</small></div><div><small>Punti</small><b>${p.pt}</b></div><div><small>Premio</small><b>${euroBreve(p.premio)}</b></div></div>
  ${(p.obiettivi || []).length ? `<h3>Obiettivi</h3><div class="ob-fine">${p.obiettivi.map(([ok, t, x]) => `<div class="${ok}">${ic(ok === 'ok' ? 'check' : 'x')}<span>${esc(t)}</span><small>${esc(x)}</small></div>`).join('')}</div>` : ''}
  ${p.bomber ? `<p>${ic('pallone')} Capocannoniere: <b>${esc(p.bomber)}</b></p>` : ''}${p.migliore ? `<p>${ic('stella')} Miglior media voto: <b>${esc(p.migliore)}</b></p>` : ''}
  ${(p.coppe || []).length ? `<p>${ic('coppa', 'oro')} Coppe vinte: <b>${p.coppe.map(esc).join(', ')}</b></p>` : ''}${p.livello ? `<p class="oro">${ic('stella')} Hai vinto la Serie A: sali al livello <b>${DIFFICOLTA[p.livello.a].nome}</b>!</p>` : ''}
  <p class="tenue">Podio: ${p.top.map((n, i) => ['1°', '2°', '3°'][i] + ' ' + esc(n)).join(' · ')}</p>
  ${lista('giovani', 'Nuovi ragazzi nella Primavera', p.giovani)}${lista('contratto', 'Contratti scaduti, se ne vanno', p.scaduti, 'tenue')}${lista('mercato', 'Tornano dal prestito', p.rientrati)}${lista('mercato', 'Finiscono il prestito', p.tornati, 'tenue')}${lista('cuore', 'Si ritirano', p.ritirati, 'tenue')}
  <button class="btn largo oro" data-a="chiudi">${p.livello ? 'Continua' : 'Inizia la stagione ' + S.stagione}</button></div>`, dopo);
  if (p.sale || p.campione){ Suono.fanfara(); coriandoli([S.club.c1, S.club.c2, '#d4af37', '#fff'], 200); setTimeout(() => coriandoli([S.club.c1, S.club.c2, '#d4af37'], 160), 900); }
}

// ---------- codice segreto ----------
function chiediCodice(){
  if (S.codice) return pannelloSegreto();
  foglio(`<h2>${ic('chiave')} Aggiungi codice</h2><p class="tenue">Hai un codice segreto? Scrivilo qui.</p><div class="login-f"><input id="codiceIn" placeholder="Codice" autocomplete="off" autocapitalize="none"><button class="btn" id="codiceOk">Sblocca</button><p class="rosso" id="codiceErr"></p></div>`);
  const ok = () => { const v = ($('#codiceIn').value || '').trim().toLowerCase(); if (v === 'arcangeli'){ S.codice = true; salva(); Suono.fanfara(); coriandoli(['#d4af37', '#22c55e', '#fff'], 120); pannelloSegreto(); } else { $('#codiceErr').textContent = 'Codice sbagliato'; } };
  $('#codiceOk').onclick = ok; $('#codiceIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); }); setTimeout(() => $('#codiceIn') && $('#codiceIn').focus(), 100);
}
function pannelloSegreto(){
  const on = S.lega.online;
  const T = S.trucchi || {};
  const b = (a, t, cls = 'sec') => `<button class="btn mini ${cls}" data-a="segreto" data-v="${a}" ${on ? 'disabled' : ''}>${t}</button>`;
  const tg = (k, t) => `<button class="chip ${T[k] ? 'on' : ''}" data-a="segreto" data-v="t-${k}" ${on ? 'disabled' : ''}>${t}</button>`;
  const sez = (i, t, corpo) => `<details class="seg-sez" ${sottoschermo['seg_' + i] ? 'open' : ''} data-seg="${i}"><summary>${ic(i)} ${t}</summary>${corpo}</details>`;
  foglio(`<h2>${ic('bacchetta')} Pannello segreto</h2>${on ? '<p class="avviso-in">Il pannello segreto funziona quando giochi da solo, così online è giusto per tutti.</p>' : '<p class="tenue">Puoi cambiare tutto quello che vuoi.</p>'}
  <div class="segreto">
  ${sez('euro', 'Soldi', `<div class="login-f"><input id="sSoldi" type="number" inputmode="numeric" value="${Math.round(S.soldi)}" ${on ? 'disabled' : ''}></div>
  <div class="riga-btn">${b('soldiImposta', 'Imposta', '')}${b('soldi1', '+1 mln')}${b('soldi10', '+10 mln')}${b('soldi100', '+100 mln')}${b('soldi1000', '+1 miliardo')}${b('debiti', 'Cancella i debiti')}${b('conti', 'Azzera il bilancio')}</div>`)}
  ${sez('bandiera', 'Tifosi, morale e squadra', `<div class="riga-btn">${b('tifosi', '+10.000 tifosi')}${b('tifosi100', '+100.000 tifosi')}${b('morale', 'Morale al massimo')}${b('intesa', 'Intesa 100')}${b('prep', 'Preparazione 100')}${b('abbonati', 'Stadio tutto abbonato')}</div>`)}
  ${sez('squadra', 'Giocatori', `<div class="riga-btn">${b('forti', 'Tutti +5')}${b('max', 'Tutti a 99')}${b('pot', 'Potenziale 99')}${b('cura', 'Tutti in forma e guariti')}${b('felici', 'Tutti felici')}${b('voti', 'Media voto 8')}${b('giovani', 'Tutti 20 anni')}${b('contratti', 'Contratti di 5 anni')}${b('stipendi0', 'Stipendi a zero')}${b('campione', 'Un campione gratis')}${b('squadraTop', '11 giocatori fortissimi')}</div>`)}
  ${sez('giovani', 'Primavera', `<div class="riga-btn">${b('talenti', '+3 talenti')}${b('giovMax', 'Primavera al massimo')}${b('scoutGratis', 'Osservatori in tutto il mondo')}</div>`)}
  ${sez('mercato', 'Mercato', `<div class="riga-btn">${b('mercato', 'Nuovo mercato gratis')}${b('mercatoForte', 'Mercato pieno di campioni')}${b('offerte', 'Fai arrivare offerte')}</div>`)}
  ${sez('stadio', 'Stadio e staff', `<div class="riga-btn">${b('lavori', 'Finisci subito i lavori')}${b('stadioMax', 'Stadio al massimo')}${b('nuovo', 'Stadio come nuovo')}${b('staff', 'Tutto lo staff a 5 stelle')}</div>`)}
  ${sez('coppa', 'Campionato', `<div class="login-f"><select id="sTier" ${on ? 'disabled' : ''}>${TIERS.map((t, i) => `<option value="${i + 1}" ${i + 1 === S.tier ? 'selected' : ''}>${t.nome}</option>`).join('')}</select></div>
  <div class="riga-btn">${b('tier', 'Vai a questo campionato', '')}${b('punti', '+3 punti')}${b('primo', 'Primo in classifica')}${b('fineStagione', 'Salta a fine stagione')}${b('trofeo', '+1 trofeo')}</div>`)}
  ${sez('stella', 'Livello e coppe', `<p class="nota">Adesso: <b>${testoLivello()}</b></p><div class="riga-btn">${b('livelloSu', 'Passa al livello dopo')}${b('fortissimo', 'Vai a Fortissimo in Serie A')}${b('europa', 'Qualificati in Coppa dei Campioni')}${b('coppaTurno', 'Passa il turno di coppa')}</div>`)}
  ${sez('fulmine', 'Imprevisti e notizie', `<div class="riga-btn">${b('imprevisto', 'Fai succedere un imprevisto')}${b('conferenza', 'Conferenza stampa')}${b('coriandoli', 'Festa con i coriandoli')}</div>`)}
  <h3>${ic('stella')} Trucchi sempre attivi</h3><div class="chips wrap">${tg('gratis', 'Tutto gratis')}${tg('super', 'Super squadra')}${tg('vinci', 'Vinci sempre')}${tg('noInf', 'Niente infortuni')}${tg('noImpr', 'Niente imprevisti')}${tg('noStip', 'Niente stipendi')}</div>
  <p class="nota">«Tutto gratis»: giocatori, campioni, staff e stadio costano zero e i lavori finiscono subito. «Super squadra»: fortissima. «Vinci sempre»: in partita segni tu.</p>
  </div><button class="btn largo" data-a="chiudi">Fatto</button>`, null, 'segreto-f');
  document.querySelectorAll('.seg-sez').forEach((d) => d.addEventListener('toggle', () => { sottoschermo['seg_' + d.dataset.seg] = d.open; }));
}
function segreto(v){
  if (S.lega.online) return;
  const fatto = (t) => { aggiornaMioSlot(); salva(); disegna(); avviso(t); };
  const soldi = { soldi1: 1e6, soldi10: 1e7, soldi100: 1e8, soldi1000: 1e9 };
  if (v.startsWith('t-')){ const k = v.slice(2); S.trucchi = S.trucchi || {}; S.trucchi[k] = !S.trucchi[k]; fatto(S.trucchi[k] ? 'Trucco attivato!' : 'Trucco spento'); return pannelloSegreto(); }
  if (soldi[v]){ movimento('altro', soldi[v], 'Pannello segreto'); S.soldiStoria.push(Math.round(S.soldi)); fatto('+' + euroBreve(soldi[v])); return pannelloSegreto(); }
  const tutti = (f) => S.rosa.forEach((p) => { f(p); p.prezzo = valoreDi(p); });
  switch (v){
    case 'soldiImposta': { const n = Math.max(-1e9, Math.min(1e12, Math.round(+($('#sSoldi').value) || 0))); S.soldi = n; S.soldiStoria.push(n); fatto('Soldi: ' + euroBreve(n)); break; }
    case 'debiti': S.debiti = []; fatto('Debiti cancellati!'); break;
    case 'livelloSu': { if (livello() >= LIV_MAX) return avviso('Sei già al livello più alto'); const x = ricominciaLivello(); disegna(); mostraLivello(x, () => mostraPendenti()); return; }
    case 'fortissimo': S.diff = LIV_MAX; if (S.tier !== TOP){ S.tier = TOP; nuovaLegaLocale(TOP); genMercato(); } S.coppe = null; fatto('Livello Fortissimo in Serie A: le coppe partono alla prossima partita!'); break;
    case 'europa': S.europa = { k: 'campioni', s: S.stagione }; S.coppe = null; fatto(coppeAttive() ? 'Sei in Coppa dei Campioni!' : 'Qualificato! Serve il livello Fortissimo in Serie A'); break;
    case 'coppaTurno': { const c = coppeDellaStagione().find((x) => x.vivo && !x.vinta); if (!c) return avviso('Nessuna coppa in corso'); const tv = (S.trucchi = S.trucchi || {}).vinci; S.trucchi.vinci = true; giocaCoppa(c); S.trucchi.vinci = tv; salva(); disegna(); return mostraPendenti(); }
    case 'conti': S.conti = {}; S.movimenti = []; fatto('Bilancio azzerato'); break;
    case 'tifosi': S.tifosi += 10000; fatto('+10.000 tifosi'); break;
    case 'tifosi100': S.tifosi += 100000; fatto('+100.000 tifosi'); break;
    case 'morale': S.morale = 100; fatto('Morale alle stelle!'); break;
    case 'intesa': S.intesa = 100; fatto('Intesa perfetta!'); break;
    case 'prep': S.prep = 100; fatto('Preparazione al massimo!'); break;
    case 'abbonati': S.abbS = S.stagione; S.abbonati = postiStadio(S); fatto('Stadio tutto abbonato!'); break;
    case 'forti': tutti((p) => { p.val = Math.min(99, p.val + 5); p.pot = Math.max(p.pot, p.val); }); fatto('Tutti più forti!'); break;
    case 'max': tutti((p) => { p.val = 99; p.pot = 99; }); fatto('Tutti a 99!'); break;
    case 'pot': tutti((p) => { p.pot = 99; }); (S.giovanili || []).forEach((p) => { p.pot = 99; }); fatto('Potenziale 99 per tutti!'); break;
    case 'cura': S.rosa.forEach((p) => { p.forma = 100; p.inf = 0; p.squal = 0; }); fatto('Tutti in forma!'); break;
    case 'felici': S.rosa.forEach((p) => { p.mor = 100; }); fatto('Tutti felici!'); break;
    case 'voti': S.rosa.forEach((p) => { p.voti = [8, 8, 8, 8, 8]; p.fm = 8; }); fatto('Tutti in forma da 8!'); break;
    case 'giovani': tutti((p) => { p.eta = 20; }); fatto('Tutti ventenni!'); break;
    case 'contratti': S.rosa.forEach((p) => { if (!p.prestito) p.contr = 5; }); fatto('Contratti di 5 anni!'); break;
    case 'stipendi0': S.rosa.forEach((p) => { p.stip = 0; }); fatto('Stipendi a zero!'); break;
    case 'campione': { const L = listaCampioni(); if (!L.length) return avviso('Hai già preso tutti i campioni'); const p = pick(L.slice(0, 20)); S.campioniPresi = (S.campioniPresi || []).concat([p.id]); p.id = p.id + '-' + uid(); p.num = numeroLibero(p.r); S.rosa.push(p); notizia(`COLPO DA CAMPIONE! Arriva ${p.n} ${p.c}!`, 'mercato'); coriandoli([S.club.c1, '#d4af37'], 120); fatto(`${p.n} ${p.c} è tuo!`); break; }
    case 'squadraTop': { ruoliDi('4-3-3').forEach((r) => { const p = nuovoGiocatore(TOP, { ruolo: r, bonus: 20, spread: 2, eta: ri(21, 27) }); p.num = numeroLibero(r); p.contr = 4; S.rosa.push(p); }); S.tattica.tit = null; fatto('Arrivati 11 fenomeni!'); break; }
    case 'talenti': for (let k = 0; k < 3; k++){ const p = nuovoGiovane(S.tier, 18); p.pot = ri(90, 97); S.giovanili.push(p); } fatto('3 talenti nella Primavera!'); break;
    case 'giovMax': (S.giovanili || []).forEach((p) => { p.val = Math.max(p.val, Math.min(p.pot, p.val + 15)); p.prezzo = valoreDi(p); }); fatto('Primavera più forte!'); break;
    case 'scoutGratis': { const c0 = S.soldi; ZONE_SCOUT.forEach((z, i) => scoutGiovani(i)); S.soldi = c0; fatto('Osservatori tornati da tutto il mondo!'); break; }
    case 'mercato': genMercato(); fatto('Nuovo mercato!'); break;
    case 'mercatoForte': genMercato(); S.mercato.lista.forEach((p) => { p.val = clamp(p.val + 15, 10, 97); p.pot = Math.max(p.pot, p.val); p.prezzo = valoreDi(p); p.chiede = tondo(p.prezzo); }); fatto('Mercato pieno di campioni!'); break;
    case 'offerte': S.rosa.slice(0, 3).forEach((p) => { const c = clubCasuale(); S.offerte = (S.offerte || []).filter((o) => o.pid !== p.id).concat([{ id: uid(), pid: p.id, club: c.nome, imp: tondo(p.prezzo * 1.4), scade: S.giornate + 3 }]); }); fatto('Arrivate nuove offerte!'); break;
    case 'lavori': S.stadio.cantieri.forEach((c) => { S.stadio[c.k] = c.liv; }); S.stadio.cantieri = []; fatto('Lavori finiti!'); break;
    case 'stadioMax': STADIO.forEach((x) => { S.stadio[x.k] = x.costi.length - 1; }); S.stadio.cantieri = []; S.stadio.usura = 100; fatto('Stadio al massimo!'); break;
    case 'nuovo': S.stadio.usura = 100; fatto('Stadio come nuovo!'); break;
    case 'staff': STAFF.forEach((x) => { S.staff[x.k] = Object.assign(nuovoStaff(x.k, 5), { stip: S.staff[x.k] ? S.staff[x.k].stip : STAFF_STIP[5] }); }); fatto('Staff a 5 stelle!'); break;
    case 'trofeo': S.trofei.push({ stagione: S.stagione, tier: S.tier, nome: 'Campioni ' + TIERS[S.tier - 1].nome }); fatto('+1 trofeo in bacheca!'); break;
    case 'punti': { const me = S.lega.dati.squadre[S.lega.mio]; me.pt += 3; fatto('+3 punti!'); break; }
    case 'primo': { const d = S.lega.dati, me = d.squadre[S.lega.mio], top = Math.max(...d.squadre.map((s) => s.pt)); me.pt = top + 3; fatto('Sei primo in classifica!'); break; }
    case 'tier': { const t = +$('#sTier').value; S.tier = t; S.sponsor = nuovoSponsor(t); nuovaLegaLocale(t); genMercato(); genStaffMercato(); notizia(`La ${S.club.nome} ora gioca in ${TIERS[t - 1].nome}!`, 'societa'); fatto('Ora sei in ' + TIERS[t - 1].nome); break; }
    case 'imprevisto': { const n = S.pendenti.length; for (let k = 0; k < 20 && S.pendenti.length === n; k++) imprevisto(); chiudiFoglio(true); salva(); disegna(); mostraPendenti(); return; }
    case 'conferenza': { const rep = S.ultima || { esito: 'N' }; const n = S.pendenti.length; for (let k = 0; k < 30 && S.pendenti.length === n; k++) conferenza(rep); chiudiFoglio(true); salva(); mostraPendenti(); return; }
    case 'coriandoli': coriandoli([S.club.c1, S.club.c2, '#d4af37', '#fff'], 220); Suono.fanfara(); break;
    case 'fineStagione': { chiudiFoglio(true); const st = S.stagione; let k = 0; while (S.stagione === st && k++ < 60){ const D = nuovaDiretta(); if (D){ finisciDiretta(D); chiudiDiretta(D); } else giocaGiornataDati(S.lega.dati); Dir = null; sincronizza(false); if (S.stagione !== st) break; S.pendenti = S.pendenti.filter((x) => x.tipo === 'stagione'); chiudiFoglio(true); } disegna(); return; }
  }
  pannelloSegreto();
}
