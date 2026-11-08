// ---------- livelli della carriera e coppe ----------
// Tutti partono da Principiante. Chi vince la Serie A passa al livello dopo e riparte dalla Terza Categoria.
// Al livello più alto (Fortissimo), in Serie A, si giocano la Coppa Italia e le coppe europee.
const LIV_MAX = DIFFICOLTA.length - 1;
const livello = () => (S && S.diff != null) ? S.diff : 2;
function scalaLivelli(att){
  return `<div class="scala-liv">${DIFFICOLTA.map((x, i) => `<div class="sl ${i < att ? 'fatto' : ''} ${i === att ? 'ora' : ''}"><b>${x.ico}</b><span>${x.nome}</span></div>`).join('<i></i>')}</div>`;
}
function testoLivello(){ const l = livello(); return `${DIFFICOLTA[l].ico} ${DIFFICOLTA[l].nome} · livello ${l + 1} di ${LIV_MAX + 1}`; }

const COPPE = {
  italia:   { nome: 'Coppa Italia',       turni: ['Ottavi', 'Quarti', 'Semifinale', 'Finale'],           g: [3, 8, 13, 18],      forza: [0, 1, 2, 3],    premio: [400000, 800000, 1500000, 8000000],  colore: '#16a34a' },
  europa:   { nome: 'Coppa Europa',       turni: ['Girone', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'], g: [2, 6, 10, 15, 20],  forza: [0, 2, 3, 4, 5], premio: [1500000, 2000000, 3000000, 5000000, 15000000], colore: '#f97316' },
  campioni: { nome: 'Coppa dei Campioni', turni: ['Girone', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'], g: [1, 5, 11, 16, 21],  forza: [2, 4, 5, 6, 7], premio: [3000000, 4000000, 6000000, 10000000, 35000000], colore: '#2563eb' }
};
// squadre straniere inventate per le coppe europee
const EUROPEE = [['Real Montebravo', '#f8fafc', '#7c3aed'], ['Atlético Sierra Alta', '#dc2626', '#f8fafc'], ['FC Rheinburg', '#dc2626', '#111827'], ['Olympique Lavande', '#38bdf8', '#f8fafc'],
  ['Sporting Alvorada', '#16a34a', '#f8fafc'], ['Dinamo Kovarsk', '#2563eb', '#f8fafc'], ['AFC Nordhavn', '#facc15', '#111827'], ['Union Saint-Lys', '#f8fafc', '#1e3a8a'],
  ['Galata Yildiz', '#f59e0b', '#b91c1c'], ['SV Eindbergen', '#dc2626', '#f8fafc'], ['Borussia Altstadt', '#facc15', '#111827'], ['Crvena Zora', '#b91c1c', '#f8fafc'],
  ['Hellas Olympos', '#1d4ed8', '#f8fafc'], ['Royal Brabançon', '#7c3aed', '#facc15'], ['Celtic Dunmore', '#16a34a', '#f8fafc'], ['Lokomotiv Severny', '#dc2626', '#16a34a'],
  ['FC Porto Alegre do Mar', '#1e3a8a', '#f8fafc'], ['Inter Valencia Nord', '#111827', '#f97316']];

const coppeAttive = () => livello() === LIV_MAX && S.tier === TOP && !(S.lega && S.lega.online);
const nuovaCoppa = (k) => ({ k, t: 0, vivo: true, vinta: false, partite: [] });
// all'inizio della stagione: Coppa Italia e, se ti sei qualificato, la coppa europea
function preparaCoppe(){
  if (S.coppe && S.coppe.s === S.stagione) return;
  S.coppe = { s: S.stagione, lista: [] };
  if (!coppeAttive()) return;
  S.coppe.lista.push(nuovaCoppa('italia'));
  if (S.europa && S.europa.s === S.stagione) S.coppe.lista.push(nuovaCoppa(S.europa.k));
  S.coppe.lista.forEach((c) => { const C = COPPE[c.k]; notizia(`Comincia la ${C.nome}! Primo turno (${C.turni[0]}) dopo la giornata ${C.g[0] + 1}.`, 'trofeo'); });
}
function coppeDellaStagione(){ return S.coppe && S.coppe.s === S.stagione ? S.coppe.lista : []; }
// dopo ogni giornata di campionato: se c'è un turno di coppa, si gioca
function turnoCoppe(r){
  coppeDellaStagione().forEach((c) => { const C = COPPE[c.k]; if (c.vivo && !c.vinta && C.g[c.t] === r) giocaCoppa(c); });
}
function avversarioCoppa(c){
  let a;
  if (c.k === 'italia'){
    const d = S.lega.dati, altri = d.squadre.filter((s, i) => i !== S.lega.mio);
    a = Object.assign({}, pick(altri));
  } else {
    const usati = new Set(c.partite.map((x) => x.avv.nome));
    const e = pick(EUROPEE.filter((x) => !usati.has(x[0])));
    const h = hashStr(e[0]);
    a = { nome: e[0], c1: e[1], c2: e[2], st: h % 4, pat: (h >> 3) % 5, sim: (h >> 6) % 7 };
  }
  return { nome: a.nome, c1: a.c1, c2: a.c2, st: a.st, pat: a.pat, sim: a.sim };
}
function giocaCoppa(c){
  const C = COPPE[c.k], turno = C.turni[c.t], finale = c.t === C.turni.length - 1;
  const avv = avversarioCoppa(c);
  const mia = forzaMia(), sua = forzaBot(TOP, RND, DIFFICOLTA[livello()].bot + C.forza[c.t] + (c.k === 'italia' ? 0 : 2));
  const casa = finale ? null : RND() < 0.5;
  let gf, gs;
  if (casa === false){ const m = simPartita(RND, sua, mia, 2.5); gf = m.ga; gs = m.gh; }
  else { const m = simPartita(RND, mia, sua, casa ? 2.5 : 0); gf = m.gh; gs = m.ga; }
  if (trucco('vinci') && gf <= gs) gf = gs + 1;
  let rig = null, passa = gf > gs;
  if (gf === gs){
    passa = RND() < clamp(0.5 + (mia.por - sua.por) / 80, 0.25, 0.75);
    const w = ri(4, 5), l = ri(2, w - 1); rig = passa ? [w, l] : [l, w];
  }
  const p = { turno, avv, gf, gs, rig, passa, casa };
  c.partite.push(p);
  if (passa){
    const premio = tondo(C.premio[c.t] * soldiDiff());
    movimento('premi', premio, `${C.nome}: ${turno} superato`);
    c.t++;
    if (c.t >= C.turni.length){
      c.vinta = true;
      S.trofei.push({ stagione: S.stagione, tier: TOP, nome: C.nome, coppa: c.k });
      S.tifosi = Math.round(S.tifosi * 1.12 + 5000); S.morale = clamp(S.morale + 15, 30, 100);
      notizia(`LA ${C.nome.toUpperCase()} È NOSTRA! La ${S.club.nome} batte ${avv.nome} in finale e alza la coppa!`, 'trofeo');
    } else notizia(`${C.nome}: la ${S.club.nome} supera ${avv.nome} (${gf}-${gs}${rig ? `, ${rig[0]}-${rig[1]} ai rigori` : ''}) e va ${C.turni[c.t] === 'Finale' ? 'in finale' : 'ai ' + C.turni[c.t].toLowerCase()}.`, 'trofeo');
    S.morale = clamp(S.morale + 3, 30, 100);
  } else {
    c.vivo = false;
    notizia(`${C.nome}: eliminati da ${avv.nome} (${gf}-${gs}${rig ? `, ${rig[0]}-${rig[1]} ai rigori` : ''}) ${finale ? 'in finale. Che peccato!' : 'al turno ' + turno.toLowerCase() + '.'}`, 'societa');
    S.morale = clamp(S.morale - 4, 30, 100);
  }
  S.pendenti.push(Object.assign({ tipo: 'coppa', k: c.k, vinta: c.vinta, premio: passa ? tondo(C.premio[c.t - 1] * soldiDiff()) : 0, prossimo: c.vinta || !passa ? '' : C.turni[c.t], prossimoG: c.vinta || !passa ? 0 : C.g[c.t] + 1 }, p));
}
function mostraCoppa(p, dopo){
  const C = COPPE[p.k];
  const io = { nome: S.club.nome, c1: S.club.c1, c2: S.club.c2, st: S.club.st, pat: S.club.pat, sim: S.club.sim };
  const h = p.casa === false ? p.avv : io, a = p.casa === false ? io : p.avv, gh = p.casa === false ? p.gs : p.gf, ga = p.casa === false ? p.gf : p.gs;
  const titolo = p.vinta ? 'HAI VINTO LA COPPA!' : p.passa ? 'Passaggio del turno!' : 'Eliminati';
  foglio(`<div class="coppa-f ${p.vinta ? 'festa' : p.passa ? '' : 'triste'}" style="--cc:${C.colore}">
    <div class="cf-testa">${coppaSVG(p.k, 64)}<div><small>${esc(C.nome)}</small><b>${esc(p.turno)}${p.casa == null ? ' · campo neutro' : p.casa ? ' · in casa' : ' · in trasferta'}</b></div></div>
    <div class="risultato ${p.passa ? 'V' : 'P'}"><div>${stemmaDi(h, 46)}<span>${esc(h.nome)}</span></div><b>${gh} - ${ga}</b><div>${stemmaDi(a, 46)}<span>${esc(a.nome)}</span></div></div>
    ${p.rig ? `<p class="centro">Ai rigori: <b>${p.rig[0]} - ${p.rig[1]}</b> per ${p.passa ? 'noi' : esc(p.avv.nome)}</p>` : ''}
    <h2 class="centro">${titolo}</h2>
    <p class="centro tenue">${p.vinta ? `La coppa va in bacheca. Premio: <b>${euroBreve(p.premio)}</b>` : p.passa ? `Premio: <b>${euroBreve(p.premio)}</b>. Prossimo turno: <b>${esc(p.prossimo)}</b> dopo la giornata ${p.prossimoG}.` : 'Ci riproviamo la prossima stagione!'}</p>
    <button class="btn largo ${p.vinta ? 'oro' : ''}" data-a="chiudi">Continua</button></div>`, dopo);
  if (p.vinta){ Suono.fanfara(); coriandoli([S.club.c1, S.club.c2, '#d4af37', '#fff'], 220); setTimeout(() => coriandoli([C.colore, '#d4af37'], 160), 900); }
  else if (p.passa) Suono.cassa();
}
// disegno della coppa (tre forme diverse)
function coppaSVG(k, size = 48){
  const C = COPPE[k] || COPPE.italia, id = 'cg' + k + size;
  const corpo = k === 'campioni'
    ? '<path d="M18 10h28v8c0 10-6 17-14 17s-14-7-14-17z"/><path d="M18 14c-8 0-10 4-10 7 0 5 5 8 11 8M46 14c8 0 10 4 10 7 0 5-5 8-11 8" fill="none" stroke="url(#' + id + ')" stroke-width="4"/>'
    : k === 'europa'
      ? '<path d="M22 8h20l-3 22c-1 4-4 6-7 6s-6-2-7-6z"/><circle cx="32" cy="16" r="4" fill="#fff" opacity=".35"/>'
      : '<path d="M16 8h32v6c0 11-7 20-16 20S16 25 16 14z"/><path d="M16 12H9c0 7 4 11 9 12M48 12h7c0 7-4 11-9 12" fill="none" stroke="url(#' + id + ')" stroke-width="3"/>';
  return `<svg class="coppa-svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".45" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6a12"/></linearGradient></defs>
    <g fill="url(#${id})">${corpo}<rect x="28" y="35" width="8" height="10" rx="2"/><path d="M20 46h24l3 10H17z"/></g><rect x="22" y="49" width="20" height="4" rx="1" fill="${C.colore}"/></svg>`;
}
// riquadro in Home con le coppe della stagione
function cartaCoppe(){
  const L = coppeDellaStagione();
  if (!L.length){
    if (livello() === LIV_MAX && S.tier !== TOP) return carta(`${ic('coppa', 'oro')} Coppe`, `<p class="tenue">Sei al livello Fortissimo: arriva in <b>Serie A</b> per giocare la Coppa Italia e le coppe europee.</p>`);
    if (livello() === LIV_MAX && S.tier === TOP && !(S.coppe && S.coppe.s === S.stagione)) return carta(`${ic('coppa', 'oro')} Coppe`, `<p class="tenue">Le coppe cominciano con la prima partita della stagione.</p>`);
    return '';
  }
  return carta(`${ic('coppa', 'oro')} Coppe`, L.map((c) => { const C = COPPE[c.k], u = c.partite[c.partite.length - 1];
    const stato = c.vinta ? '<b class="verde">VINTA!</b>' : !c.vivo ? '<span class="rosso">Eliminati</span>' : `<span>${esc(C.turni[c.t])} · dopo la giornata ${C.g[c.t] + 1}</span>`;
    return `<div class="coppa-r" style="--cc:${C.colore}">${coppaSVG(c.k, 38)}<div><b>${esc(C.nome)}</b><small>${stato}${u ? ` · ultima: ${u.gf}-${u.gs} con ${esc(u.avv.nome)}` : ''}</small></div><div class="cr-turni">${C.turni.map((t, i) => `<i class="${i < c.t ? 'ok' : i === c.t && c.vivo && !c.vinta ? 'ora' : ''}" title="${esc(t)}"></i>`).join('')}</div></div>`; }).join('')
    + (S.europa && S.europa.s === S.stagione + 1 ? `<p class="nota">${ic('stella')} Sei già qualificato per la ${COPPE[S.europa.k].nome} della prossima stagione.</p>` : ''));
}
// fine stagione: chi si qualifica per l'Europa
function qualificaEuropa(pos, tier, online){
  if (online || livello() !== LIV_MAX || tier !== TOP){ return null; }
  S.europa = pos <= 2 ? { k: 'campioni', s: S.stagione + 1 } : pos <= 4 ? { k: 'europa', s: S.stagione + 1 } : null;
  if (S.europa) notizia(`Qualificati per la ${COPPE[S.europa.k].nome}! La prossima stagione si gioca anche in Europa.`, 'trofeo');
  return S.europa;
}
// vinci la Serie A: si sale di livello e si riparte dalla Terza Categoria
function ricominciaLivello(){
  const vecchio = S, da = livello(), a = Math.min(LIV_MAX, da + 1);
  const club = Object.assign({}, vecchio.club, { diff: a, stadio: (vecchio.stadio.design && vecchio.stadio.design.nome) || '', ospite: vecchio.ospite, modo: vecchio.modo || 'presidente' });
  nuovaSocieta(club);
  const nuovo = S, salta = new Set(['coppe', 'europa', '_live', 'abbonati']);
  Object.keys(vecchio).forEach((k) => { if (!(k in nuovo) && !salta.has(k)) nuovo[k] = vecchio[k]; });
  Object.assign(nuovo, { trofei: vecchio.trofei, storico: vecchio.storico, opz: vecchio.opz, stagione: vecchio.stagione, pendenti: vecchio.pendenti,
    notizie: nuovo.notizie.concat(vecchio.notizie).slice(0, 80), livelli: (vecchio.livelli || []).concat([{ d: da, s: vecchio.stagione - 1 }]) });
  if (modo() === 'allenatore'){ S.fiducia = 60; rosaDiPartenza(); }
  notizia(`NUOVO LIVELLO: ${DIFFICOLTA[a].nome.toUpperCase()}! Dopo aver vinto la Serie A, la ${S.club.nome} riparte dalla Terza Categoria con ${euro(SOLDI_INIZIO)}. Bot più forti, stessa voglia di vincere!`, 'trofeo');
  salva(true);
  return { da, a };
}
function mostraLivello(p, dopo){
  const fine = p.a === LIV_MAX;
  foglio(`<div class="livello-f festa"><div class="lf-ico">${DIFFICOLTA[p.a].ico}</div><h1>Nuovo livello!</h1>
    <p>Hai vinto la Serie A a livello <b>${DIFFICOLTA[p.da].nome}</b>. Adesso giochi a livello <b>${DIFFICOLTA[p.a].nome}</b>.</p>
    ${scalaLivelli(p.a)}
    <p class="tenue">Riparti dalla Terza Categoria con ${euroBreve(SOLDI_INIZIO)} e una squadra tutta da rifare. Il nome, lo stemma, le maglie, i trofei e la storia restano tuoi.</p>
    ${fine ? `<p>${ic('coppa', 'oro')} Questo è l'ultimo livello: quando arrivi in Serie A giochi anche la <b>Coppa Italia</b> e le <b>coppe europee</b>!</p>` : ''}
    <button class="btn largo oro" data-a="chiudi">Si riparte!</button></div>`, dopo);
  Suono.fanfara(); coriandoli(['#d4af37', '#22c55e', '#fff', S.club.c1], 240); setTimeout(() => coriandoli(['#d4af37', S.club.c2], 180), 1000);
}
