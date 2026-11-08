/* =========================================================
   CALCIOMANIA PM — SISTEMI DEL GIOCO
   Soldi e bilancio, prestiti in banca, infortuni, allenamento, settore giovanile,
   contratti, mercato con trattative e prestiti, offerte per i tuoi giocatori,
   imprevisti, conferenze stampa, obiettivi della stagione, biglietti e abbonamenti.
   ========================================================= */
'use strict';

const SOLDI_INIZIO = 2500000;

// ---------- soldi: ogni entrata e uscita passa da qui e finisce nel bilancio ----------
const CAT_E = { biglietti: ['Biglietti', 'biglietto'], abbonamenti: ['Abbonamenti', 'biglietto'], negozio: ['Bar e negozio', 'negozio'], sponsor: ['Sponsor', 'contratto'], tv: ['Diritti TV', 'schermo'], premi: ['Premi', 'coppa'], cessioni: ['Cessioni', 'mercato'], prestiti: ['Prestito dalla banca', 'banca'], altro: ['Altre entrate', 'sacco'] };
const CAT_U = { stipendi: ['Stipendi giocatori', 'squadra'], staff: ['Stipendi staff', 'staff'], manutenzione: ['Manutenzione', 'stadio'], acquisti: ['Acquisti', 'mercato'], lavori: ['Lavori', 'stadio'], commissioni: ['Commissioni agenti', 'valigetta'], interessi: ['Rate del prestito', 'banca'], allenamento: ['Ritiri e allenamento', 'allenamento'], giovani: ['Settore giovanile', 'giovani'], altro: ['Altre spese', 'sacco'] };
function contiStagione(k = S.stagione){ S.conti = S.conti || {}; if (!S.conti[k]) S.conti[k] = { e: {}, u: {} }; return S.conti[k]; }
function movimento(cat, importo, testo){
  importo = Math.round(importo || 0); if (!importo) return;
  S.soldi += importo;
  const c = contiStagione(), lato = importo >= 0 ? 'e' : 'u';
  c[lato][cat] = (c[lato][cat] || 0) + Math.abs(importo);
  S.movimenti = S.movimenti || [];
  S.movimenti.unshift({ cat, v: importo, t: testo || '', s: S.stagione, g: S.lega ? S.lega.giocate : 0 });
  if (S.movimenti.length > 80) S.movimenti.length = 80;
}
const totaleConti = (c, lato) => Object.values((c || {})[lato] || {}).reduce((s, x) => s + x, 0);

// ---------- prestiti della banca ----------
const RATE_PRESTITO = 22;
const maxPrestito = () => tondo((TIERS[S.tier - 1].sponsor + TIERS[S.tier - 1].tv) * 22 * 0.7 + 150000);
const debitoTot = () => (S.debiti || []).reduce((s, d) => s + d.rata * d.rimaste, 0);
function prendiPrestito(imp){
  S.debiti = S.debiti || [];
  if (debitoTot() + imp * 1.1 > maxPrestito() * 1.12) return avviso('La banca non ti presta così tanto: prima restituisci una parte');
  const rata = Math.round(imp * 1.1 / RATE_PRESTITO);
  S.debiti.push({ id: uid(), cap: imp, rata, rimaste: RATE_PRESTITO, s: S.stagione });
  movimento('prestiti', imp, 'Prestito dalla banca');
  notizia(`La società chiede un prestito di ${euro(imp)} alla banca: lo restituirà in ${RATE_PRESTITO} rate da ${euro(rata)}.`, 'soldi');
  Suono.cassa(); salva(); disegna(); avviso('Prestito ricevuto: ' + euroBreve(imp));
}
function pagaRate(){
  (S.debiti || []).forEach((d) => { movimento('interessi', -d.rata, 'Rata del prestito'); d.rimaste--; });
  const finiti = (S.debiti || []).filter((d) => d.rimaste <= 0);
  if (finiti.length) notizia('Prestito restituito tutto alla banca: la società non ha più quel debito.', 'soldi');
  S.debiti = (S.debiti || []).filter((d) => d.rimaste > 0);
}
function estingui(id){
  const d = (S.debiti || []).find((x) => x.id === id); if (!d) return;
  const c = Math.round(d.rata * d.rimaste * 0.95);
  if (S.soldi < c) return avviso('Non hai abbastanza soldi per chiuderlo adesso');
  movimento('interessi', -c, 'Prestito chiuso in anticipo'); S.debiti = S.debiti.filter((x) => x !== d);
  notizia(`Prestito chiuso in anticipo: risparmiati ${euro(d.rata * d.rimaste - c)} di interessi.`, 'soldi');
  Suono.cassa(); salva(); disegna();
}

// ---------- infortuni ----------
function infortuna(p){
  const med = livStaff(S, 'med'), t = tipoInfortunio(RND, med);
  p.inf = Math.max(1, Math.round(ri(t[1], t[2]) * (1 - med * 0.06))); p.infT = t[0];
  return p;
}
const disponibile = (p) => p.inf <= 0 && !(p.squal > 0) && !p.via;
const statoG = (p) => p.inf > 0 ? `<span class="tag-st rosso">${ic('medico')} ${p.inf} g.</span>` : p.squal > 0 ? `<span class="tag-st giallo">${ic('cartellino')} squalificato</span>` : '';

// ---------- allenamento ----------
const SEDUTE = {
  atletico: ['Preparazione atletica', 'battito', 'Più resistenza: in partita si stancano meno'],
  tecnico: ['Allenamento tecnico', 'pallone', 'I giocatori migliorano di più'],
  tattico: ['Allenamento tattico', 'tattica', 'Più intesa: la squadra gioca meglio insieme'],
  collettivo: ['Partitella collettiva', 'utenti', 'Intesa e morale'],
  recupero: ['Recupero fisico', 'cuore', 'Recuperano la condizione fisica'],
  riposo: ['Riposo', 'nuvola', 'Riposano: condizione e morale']
};
const GIORNI_SETT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const INTENSITA = ['Leggera', 'Normale', 'Intensa'];
const ALLEN_IND = [['', 'Come la squadra'], ['tecnica', 'Tecnica extra (cresce di più)'], ['fisico', 'Fisico (più resistente)'], ['recupero', 'Recupero (guarisce prima)'], ['riposo', 'Riposo completo']];
function allenDefault(){ return { sett: ['atletico', 'tecnico', 'tattico', 'collettivo', 'recupero'], int: 1, ultimo: null }; }
// si applica dopo ogni giornata: condizione fisica, crescita, intesa, morale, infortuni in allenamento
function applicaAllenamento(titIds){
  const A = S.allen || (S.allen = allenDefault());
  const n = (k) => A.sett.filter((x) => x === k).length, I = [0.75, 1, 1.3][A.int == null ? 1 : A.int];
  const centro = S.stadio.centro || 0, coach = livStaff(S, 'all'), vice = livStaff(S, 'vice'), atl = livStaff(S, 'atl'), fisio = livStaff(S, 'fisio'), med = livStaff(S, 'med');
  const duri = n('atletico') + n('tecnico') + n('tattico') + n('collettivo');
  const out = { migliorati: [], infortunati: [], intesa: 0 };
  S.prep = clamp((S.prep == null ? 50 : S.prep) + n('atletico') * 2.2 * I - 2.5, 20, 100);
  S.rosa.forEach((p) => {
    if (p.via) return;
    const ind = p.allen || '', gioca = titIds.has(p.id);
    // condizione fisica
    let dc = 7 + n('recupero') * 4 + n('riposo') * 5 + atl * 1.5 + fisio * 2 + S.stadio.spogl * 1.2 + centro * 0.8 - duri * 1.6 * I + (gioca ? 0 : 6);
    if (ind === 'fisico') dc += 2; if (ind === 'riposo') dc += 8; if (ind === 'tecnica') dc -= 2;
    p.forma = clamp(p.forma + dc, 30, 100);
    if (p.inf > 0){ if (ind === 'recupero' && RND() < 0.5) p.inf = Math.max(0, p.inf - 1); if (RND() < fisio * 0.08) p.inf = Math.max(0, p.inf - 1); return; }
    // crescita
    if (p.val < p.pot && ind !== 'riposo'){
      const eta = p.eta <= 19 ? 2.4 : p.eta <= 22 ? 1.8 : p.eta <= 25 ? 1.2 : p.eta <= 29 ? 0.55 : 0.2;
      const ch = 0.022 * (1 + n('tecnico') * 0.28) * I * eta * (1 + coach * 0.08 + vice * 0.06) * (1 + centro * 0.12) * (ind === 'tecnica' ? 1.8 : 1) * (gioca ? 1.25 : 1);
      if (RND() < ch){ p.val++; p.prezzo = valoreDi(p); out.migliorati.push(p); }
    }
    // infortuni in allenamento
    const rischio = 0.0035 * duri * I * (p.forma < 55 ? 1.8 : 1) * (1 - atl * 0.07 - med * 0.05 - centro * 0.06) * (ind === 'fisico' ? 0.7 : 1);
    if (RND() < rischio){ infortuna(p); out.infortunati.push(p); }
    // morale
    if (n('riposo')) p.mor = clamp((p.mor || 70) + n('riposo') * 0.8, 10, 100);
    if (n('collettivo')) p.mor = clamp((p.mor || 70) + n('collettivo') * 0.5, 10, 100);
  });
  const di = (n('tattico') * 1.4 + n('collettivo') * 0.9) * I - 1.6;
  S.intesa = clamp((S.intesa == null ? 50 : S.intesa) + di, 10, 100); out.intesa = Math.round(di * 10) / 10;
  if (n('collettivo') || n('riposo')) S.morale = clamp(S.morale + n('collettivo') * 0.4 + n('riposo') * 0.5, 15, 100);
  out.infortunati.forEach((p) => notizia(`${nomeG(p)} si fa male in allenamento (${p.infT.toLowerCase()}): fuori ${p.inf} giornat${p.inf === 1 ? 'a' : 'e'}.`, 'infortunio'));
  if (out.migliorati.length >= 2) notizia(`L’allenamento funziona: migliorano ${out.migliorati.slice(0, 4).map((p) => p.c).join(', ')}${out.migliorati.length > 4 ? ' e altri' : ''}.`, 'squadra');
  A.ultimo = { migliorati: out.migliorati.map((p) => nomeG(p)), infortunati: out.infortunati.map((p) => nomeG(p)), intesa: out.intesa, g: S.giornate };
  return out;
}

// ---------- settore giovanile ----------
const nomePrimavera = () => S.club.primavera || ('Primavera ' + S.club.nome);
function nuovoGiovane(tier, bonus = 0, naz){
  const giov = S.stadio.giov || 0;
  const p = nuovoGiocatore(tier, { eta: ri(15, 18), bonus: -14 + giov * 2.5 + bonus, spread: 4, naz });
  p.pot = clamp(p.val + ri(12, 26) + giov * 2 + Math.round(bonus / 2), p.val, 97);
  p.stip = tondo(Math.max(30, p.stip * 0.25)); p.prezzo = valoreDi(p); p.contr = 3; p.giovane = true;
  return p;
}
const ZONE_SCOUT = [['Italia', 'IT', 1], ['Europa', 'EU', 1.6], ['Sudamerica', 'SA', 2.2], ['Africa', 'AF', 1.9]];
const costoScout = (z) => tondo((5000 + S.tier * 4000) * ZONE_SCOUT[z][2]);
function scoutGiovani(z){
  const c = costoScout(z); if (S.soldi < c) return avviso('Non hai abbastanza soldi per mandare gli osservatori');
  movimento('giovani', -c, 'Osservatori: ' + ZONE_SCOUT[z][0]);
  const oss = livStaff(S, 'oss'), naz = { IT: ['IT'], EU: ['ES', 'FR', 'DE', 'NL', 'PT', 'HR', 'RS', 'DK', 'SE'], SA: ['BR', 'AR', 'UY'], AF: ['SN', 'NG', 'MA', 'CI'] }[ZONE_SCOUT[z][1]];
  S.scoutGiov = (S.scoutGiov || []).concat(Array.from({ length: 3 }, () => { const p = nuovoGiovane(S.tier, oss * 2 + (z ? 3 : 0), pick(naz)); p.costo = tondo(Math.max(1500, p.prezzo * 0.15)); p.scade = S.giornate + 6; return p; }));
  notizia(`Gli osservatori tornano da ${ZONE_SCOUT[z][0] === 'Italia' ? 'un giro in Italia' : 'un viaggio in ' + ZONE_SCOUT[z][0]} con 3 ragazzi interessanti.`, 'giovani');
  Suono.cassa(); salva(); disegna();
}
function ingaggiaGiovane(id){
  const p = (S.scoutGiov || []).find((x) => x.id === id); if (!p) return;
  if ((S.giovanili || []).length >= 16) return avviso('La Primavera è piena (16 ragazzi)');
  if (S.soldi < p.costo) return avviso('Non hai abbastanza soldi');
  movimento('giovani', -p.costo, 'Ingaggio di ' + nomeG(p));
  S.scoutGiov = S.scoutGiov.filter((x) => x !== p); delete p.costo; delete p.scade;
  S.giovanili = (S.giovanili || []).concat([p]);
  notizia(`${p.n} ${p.c} (${p.eta} anni, ${nazDi(p.naz).n}) entra nella ${nomePrimavera()}.`, 'giovani');
  Suono.cassa(); salva(); disegna(); avviso(p.n + ' ' + p.c + ' è nella Primavera!');
}
function promuovi(id){
  const p = (S.giovanili || []).find((x) => x.id === id); if (!p) return;
  if (S.rosa.length >= 30) return avviso('La prima squadra è piena (30 giocatori)');
  S.giovanili = S.giovanili.filter((x) => x !== p);
  p.giovane = false; p.stip = tondo(Math.max(p.stip, stipDi(p) * 0.6)); p.contr = 3; p.num = numeroLibero(p.r); p.mor = clamp((p.mor || 70) + 15, 10, 100);
  S.rosa.push(p); S.intesa = clamp((S.intesa || 50) - 1, 10, 100);
  notizia(`${p.n} ${p.c} sale in prima squadra dalla ${nomePrimavera()}! Maglia numero ${p.num}.`, 'giovani');
  aggiornaMioSlot(); salva(); disegna(); avviso(p.c + ' è in prima squadra!');
}
function svincolaGiovane(id){ S.giovanili = (S.giovanili || []).filter((x) => x.id !== id); salva(); disegna(); }
function crescitaGiovani(){
  const giov = S.stadio.giov || 0, centro = S.stadio.centro || 0, vice = livStaff(S, 'vice');
  (S.giovanili || []).forEach((p) => { if (p.val < p.pot && RND() < 0.09 * (1 + giov * 0.2 + centro * 0.1 + vice * 0.08)){ p.val++; p.prezzo = valoreDi(p); } });
  S.scoutGiov = (S.scoutGiov || []).filter((p) => p.scade > S.giornate);
}

// ---------- contratti ----------
const richiestaRinnovo = (p) => tondo(Math.max(p.stip, stipDi(p)) * (1.06 + ((p.mor || 70) < 50 ? 0.18 : 0) + (p.stella ? 0.1 : 0)));
function rinnova(id, anni, stip){
  const p = S.rosa.find((x) => x.id === id); if (!p) return;
  const ch = richiestaRinnovo(p) * (anni >= 4 ? 0.96 : anni <= 1 ? 1.04 : 1);
  if (stip >= ch){
    p.stip = stip; p.contr = anni; p.mor = clamp((p.mor || 70) + 10, 10, 100);
    notizia(`${p.n} ${p.c} rinnova fino a ${anni} stagion${anni === 1 ? 'e' : 'i'}: ${euro(stip)} a giornata.`, 'mercato');
    Suono.cassa(); salva(); chiudiFoglio(true); disegna(); avviso('Contratto firmato!'); return true;
  }
  p.mor = clamp((p.mor || 70) - 3, 10, 100); salva();
  avviso(stip >= ch * 0.9 ? `Ci siamo quasi: vuole almeno ${euroBreve(Math.ceil(ch / 10) * 10)}` : 'Rifiuta: la tua offerta è troppo bassa');
  return false;
}

// ---------- mercato: giocatori delle altre squadre, svincolati, trattative ----------
function clubCasuale(r = RND){ const t = clamp(S.tier + ri(-1, 1, r), 1, TOP); return { nome: nomeClub(t, r), tier: t }; }
function genMercato(){
  const t = S.tier, oss = livStaff(S, 'oss'), L = [];
  const ruoli = ['P','P','P','D','D','D','D','D','D','D','D','C','C','C','C','C','C','C','C','C','A','A','A','A','A','A','A','A','D','C'];
  const bots = S.lega && S.lega.dati ? S.lega.dati.squadre.filter((s) => s.tipo === 'bot') : [];
  // in Serie A e Serie B il mercato è fatto di giocatori veri
  if (t >= 8) mercatoVero(t, 30).forEach((p) => L.push(p));
  ruoli.forEach((r, i) => {
    if (L.length >= 30) return;
    const bonus = i % 9 === 0 ? 9 + oss * 2 : -10 + RND() * 16 + oss * 1.4;
    const giovane = RND() < 0.2 + oss * 0.04;
    const p = nuovoGiocatore(t, { ruolo: r, bonus, spread: 3, eta: giovane ? ri(17, 21) : undefined });
    const c = bots.length && RND() < 0.4 ? { nome: pick(bots).nome, tier: t } : clubCasuale();
    p.club = c.nome; p.chiede = tondo(p.prezzo * (0.95 + RND() * 0.4));
    L.push(p);
  });
  S.mercato = { lista: L.sort((a, b) => b.val - a.val), agg: S.giornate };
  // svincolati: niente prezzo del cartellino, solo lo stipendio (e la firma)
  S.svincolati = Array.from({ length: 12 }, (_, i) => { const p = nuovoGiocatore(t, { ruolo: pick(['P','D','D','C','C','A','A']), bonus: -7 + RND() * 10 + oss, spread: 4, eta: RND() < 0.6 ? ri(29, 35) : undefined }); p.club = ''; p.chiede = 0; p.svinc = true; return p; }).sort((a, b) => b.val - a.val);
}
const commissione = (fee, p) => tondo(Math.max(fee * 0.08, stipDi(p) * (fee ? 2 : 12)) * (1 - livStaff(S, 'ds') * 0.05));
const richiestaStip = (p) => tondo(stipDi(p) * (1 + Math.max(0, (p.val - tierMedia(S.tier)) / 45)) * (p.stella ? 1.25 : 1));
const listaComprabili = () => S.mercato.lista.concat(S.svincolati || []);
function trovaInMercato(id){ return listaComprabili().find((x) => x.id === id) || (String(id).startsWith('cmp') ? listaCampioni().find((x) => x.id === id) : null); }
// la trattativa: prima con la squadra (prezzo), poi con il giocatore (stipendio e anni)
let T = null;
function apriTrattativa(id, prestito){
  const p = trovaInMercato(id); if (!p) return;
  if (S.rosa.length >= 30) return avviso('La rosa è piena (30 giocatori): vendi qualcuno prima');
  if (p.rifiuto === S.giornate) return avviso('Per oggi non vuole più parlare con te: riprova dopo la prossima giornata');
  const chiede = p.stella ? p.prezzo : (p.chiede || 0);
  T = { id, prestito: !!prestito, fase: p.svinc ? 'contratto' : 'club', chiede: prestito ? tondo(p.prezzo * 0.12) : (trucco('gratis') ? 0 : tondo(chiede * (1 - livStaff(S, 'ds') * 0.02))), offerta: 0, tent: 0, msg: '' };
  T.offerta = tondo(T.chiede * 0.85);
  T.rich = trucco('gratis') ? 0 : richiestaStip(p); T.stip = T.rich; T.anni = p.eta >= 32 ? 1 : p.eta >= 29 ? 2 : 3; T.parte = prestito ? 100 : 100;
  disegnaTrattativa();
}
function disegnaTrattativa(){
  const p = trovaInMercato(T.id); if (!p){ chiudiFoglio(true); return; }
  const cm = T.prestito ? 0 : commissione(T.chiede, p), tot = T.fase === 'contratto' ? (T.accordo || 0) + (T.prestito ? 0 : commissione(T.accordo || 0, p)) : 0;
  const testa = `<div class="tr-testa">${avatarSVG(p, 64)}<div><h2>${esc(p.n)} ${esc(p.c)}</h2><p class="tenue">${nazDi(p.naz).f} ${RUOLI[p.r]} · ${p.eta} anni · ${p.club ? 'gioca nel ' + esc(p.club) : p.stella ? 'campione' : 'svincolato'}</p></div>${badgeVal(p.val)}</div>`;
  let corpo = '';
  if (T.fase === 'club'){
    corpo = `<div class="tr-fase"><span class="step on">1 · ${T.prestito ? 'Prestito' : 'Prezzo'} con la squadra</span><span class="step">2 · Contratto</span></div>
    <div class="dati-g"><div><small>${T.prestito ? 'Costo del prestito' : 'Chiedono'}</small><b>${euroBreve(T.chiede)}</b></div><div><small>Valore</small><b>${euroBreve(p.prezzo)}</b></div><div><small>Tentativi</small><b>${3 - T.tent}</b><small>rimasti</small></div></div>
    <label class="campo-t">La tua offerta<div class="stepper"><button class="btn sec mini" data-a="trOff" data-v="-0.05">${ic('meno')}</button><input id="trOfferta" type="number" inputmode="numeric" value="${T.offerta}"><button class="btn sec mini" data-a="trOff" data-v="0.05">${ic('piu')}</button></div></label>
    ${T.msg ? `<p class="tr-msg">${T.msg}</p>` : ''}
    <div class="riga-btn"><button class="btn" data-a="trInvia">${ic('contratto')} Fai l’offerta</button><button class="btn sec" data-a="chiudi">Lascia stare</button></div>
    ${T.prestito ? '<p class="nota">In prestito resta da te fino a fine stagione e paghi tu lo stipendio. Poi torna alla sua squadra.</p>' : `<p class="nota">Il direttore sportivo ti fa risparmiare. All’agente andrà una commissione di circa ${euroBreve(cm)}.</p>`}`;
  } else {
    corpo = `<div class="tr-fase"><span class="step ${p.svinc ? '' : 'fatto'}">1 · ${p.svinc ? 'Svincolato' : T.prestito ? 'Prestito ok' : 'Prezzo ok: ' + euroBreve(T.accordo || 0)}</span><span class="step on">2 · Contratto</span></div>
    <div class="dati-g"><div><small>Chiede</small><b>${euroBreve(T.rich)}</b><small>a giornata</small></div><div><small>Adesso guadagna</small><b>${euroBreve(p.stip)}</b></div><div><small>${p.svinc ? 'Premio firma' : 'Commissione'}</small><b>${euroBreve(T.prestito ? 0 : commissione(T.accordo || 0, p))}</b></div></div>
    <label class="campo-t">Stipendio a giornata<div class="stepper"><button class="btn sec mini" data-a="trStip" data-v="-0.05">${ic('meno')}</button><input id="trStipendio" type="number" inputmode="numeric" value="${T.stip}"><button class="btn sec mini" data-a="trStip" data-v="0.05">${ic('piu')}</button></div></label>
    ${T.prestito ? '' : `<div class="scelta"><span>Anni di contratto</span><div class="seg">${[1, 2, 3, 4, 5].map((a) => `<button class="${T.anni === a ? 'on' : ''}" data-a="trAnni" data-v="${a}">${a}</button>`).join('')}</div></div>`}
    ${T.msg ? `<p class="tr-msg">${T.msg}</p>` : ''}
    <div class="riga-btn"><button class="btn" data-a="trFirma" ${S.soldi < tot ? 'disabled' : ''}>${ic('contratto')} Firma · ${euroBreve(tot)}</button><button class="btn sec" data-a="chiudi">Lascia stare</button></div>
    <p class="nota">Più anni gli offri, meno stipendio chiede. Con un ingaggio troppo basso rifiuta.</p>`;
  }
  foglio(`<div class="trattativa">${testa}${corpo}</div>`);
}
function inviaOfferta(){
  const p = trovaInMercato(T.id); if (!p) return;
  T.offerta = Math.max(0, Math.round(+($('#trOfferta').value) || 0)); T.tent++;
  if (T.offerta > S.soldi) { T.tent--; T.msg = 'Non hai abbastanza soldi per questa offerta.'; return disegnaTrattativa(); }
  if (T.offerta >= T.chiede * 0.98){ T.accordo = T.offerta; T.fase = 'contratto'; T.msg = `«Affare fatto!» dice il ${esc(p.club || 'club')}. Adesso parla con il giocatore.`; Suono.cassa(); }
  else if (T.offerta >= T.chiede * 0.8 && T.tent < 3){ T.chiede = tondo((T.chiede + T.offerta) / 2 * 1.02); T.msg = `Controfferta: vogliono ${euroBreve(T.chiede)}.`; }
  else if (T.tent >= 3 || T.offerta < T.chiede * 0.6){ p.rifiuto = S.giornate; T.msg = ''; chiudiFoglio(true); avviso('Il club chiude la trattativa: offerta troppo bassa'); notizia(`Trattativa saltata per ${p.n} ${p.c}: il ${p.club || 'club'} ha detto no.`, 'mercato'); salva(); return; }
  else T.msg = `Troppo poco. Chiedono ancora ${euroBreve(T.chiede)}.`;
  disegnaTrattativa();
}
function firmaContratto(){
  const p = trovaInMercato(T.id); if (!p) return;
  T.stip = Math.max(0, Math.round(+($('#trStipendio').value) || 0));
  const serve = T.rich * (T.anni >= 4 ? 0.94 : T.anni <= 1 ? 1.05 : 1) * (T.prestito ? 0.9 : 1);
  if (T.stip < serve && !trucco('gratis')){
    if (T.stip >= serve * 0.88){ T.rich = tondo((T.rich + T.stip) / 2 * 1.01); T.msg = `Ci pensa… poi chiede ${euroBreve(T.rich)}.`; }
    else { T.msg = 'Il giocatore rifiuta: è troppo poco.'; }
    return disegnaTrattativa();
  }
  const fee = T.prestito ? T.chiede : (T.accordo || 0), cm = T.prestito || trucco('gratis') ? 0 : commissione(fee, p);
  if (S.soldi < fee + cm) { T.msg = 'Non hai abbastanza soldi.'; return disegnaTrattativa(); }
  if (fee) movimento('acquisti', -fee, (T.prestito ? 'Prestito di ' : 'Acquisto di ') + nomeG(p));
  if (cm) movimento('commissioni', -cm, 'Commissione per ' + nomeG(p));
  S.mercato.lista = S.mercato.lista.filter((x) => x !== p); S.svincolati = (S.svincolati || []).filter((x) => x !== p);
  if (p.stella){ S.campioniPresi = (S.campioniPresi || []).concat([p.id]); p.id = p.id + '-' + uid(); }
  p.num = numeroLibero(p.r); p.forma = Math.max(p.forma, 88); p.stip = T.stip; p.contr = T.prestito ? 0 : T.anni; p.mor = clamp((p.mor || 70) + 10, 10, 100);
  if (T.prestito) p.prestito = { club: p.club, s: S.stagione };
  const da = p.club; delete p.chiede; delete p.club; delete p.svinc; delete p.rifiuto;
  S.rosa.push(p); S.intesa = clamp((S.intesa || 50) - 3, 10, 100);
  notizia(`${p.stella ? 'COLPO DA CAMPIONE! ' : T.prestito ? 'Arriva in prestito ' : 'Colpo di mercato! Arriva '}${p.n} ${p.c} (${RUOLI[p.r].toLowerCase()}, ${p.val})${da ? ' dal ' + da : ''}${fee ? ' per ' + euro(fee) : ''}. Firma per ${T.prestito ? 'questa stagione' : T.anni + ' anni'}.`, 'mercato');
  T = null; Suono.cassa(); aggiornaMioSlot(); salva(); chiudiFoglio(true); disegna(); avviso(`${p.n} ${p.c} è tuo!`);
}
// cessioni: offerte delle altre squadre per i tuoi giocatori
function offerteDalleSquadre(){
  S.offerte = (S.offerte || []).filter((o) => o.scade > S.giornate && S.rosa.some((p) => p.id === o.pid));
  const top = S.rosa.slice().sort((a, b) => b.val - a.val).slice(0, 3);
  S.rosa.forEach((p) => {
    if (p.prestito || p.via || S.offerte.some((o) => o.pid === p.id)) return;
    const ch = p.lista ? 0.42 : top.includes(p) ? 0.05 : 0.012;
    if (RND() < ch){
      const c = clubCasuale(), imp = tondo(p.prezzo * (p.lista ? 0.75 + RND() * 0.35 : 1 + RND() * 0.35) * (1 + livStaff(S, 'ds') * 0.03));
      S.offerte.push({ id: uid(), pid: p.id, club: c.nome, imp, scade: S.giornate + 3 });
      notizia(`Il ${c.nome} offre ${euro(imp)} per ${p.n} ${p.c}.`, 'mercato');
    }
  });
}
function accettaOfferta(oid){
  const o = (S.offerte || []).find((x) => x.id === oid); const p = o && S.rosa.find((x) => x.id === o.pid); if (!p) return;
  movimento('cessioni', o.imp, 'Cessione di ' + nomeG(p));
  togliDallaRosa(p);
  S.offerte = S.offerte.filter((x) => x.pid !== p.id);
  notizia(`${p.n} ${p.c} va al ${o.club} per ${euro(o.imp)}.`, 'mercato');
  Suono.cassa(); aggiornaMioSlot(); salva(); chiudiFoglio(true); disegna(); avviso('Venduto per ' + euroBreve(o.imp));
}
function rilancia(oid){
  const o = (S.offerte || []).find((x) => x.id === oid); if (!o) return;
  if (o.rilancio) return avviso('Hai già chiesto di più: ora accetta o rifiuta');
  o.rilancio = true;
  if (RND() < 0.55){ o.imp = tondo(o.imp * (1.08 + RND() * 0.1)); avviso(`Il ${o.club} alza a ${euroBreve(o.imp)}!`); }
  else { S.offerte = S.offerte.filter((x) => x !== o); avviso(`Il ${o.club} si ritira dalla trattativa`); }
  salva(); disegna();
}
function rifiutaOfferta(oid){ S.offerte = (S.offerte || []).filter((x) => x.id !== oid); salva(); disegna(); }
function togliDallaRosa(p){
  S.rosa = S.rosa.filter((x) => x !== p);
  if (S.tattica.tit) S.tattica.tit = S.tattica.tit.map((x) => x === p.id ? null : x);
  if (S.tattica.panc) S.tattica.panc = S.tattica.panc.filter((x) => x !== p.id);
}
function prestaGiocatore(id){
  const p = S.rosa.find((x) => x.id === id); if (!p) return;
  const c = clubCasuale(); togliDallaRosa(p);
  S.inPrestito = (S.inPrestito || []).concat([{ p, club: c.nome, s: S.stagione }]);
  notizia(`${p.n} ${p.c} va in prestito al ${c.nome} fino a fine stagione: giocherà di più e tu non paghi lo stipendio.`, 'mercato');
  aggiornaMioSlot(); salva(); chiudiFoglio(true); disegna(); avviso(p.c + ' va in prestito');
}

// ---------- notizie e giornali ----------
const GIORNALI = ['La Gazzetta del Pallone', 'Corriere del Calcio', 'Tuttocampo', 'Il Pallone Sera', 'Calcio & Calcio'];
const TIPI_NOTIZIA = { risultato: ['pallone', 'Risultati'], mercato: ['mercato', 'Mercato'], societa: ['club', 'Società'], tifosi: ['bandiera', 'Tifosi'], infortunio: ['medico', 'Infortuni'], evento: ['fulmine', 'Imprevisti'], stampa: ['microfono', 'Interviste'], stadio: ['stadio', 'Stadio'], giovani: ['giovani', 'Giovani'], soldi: ['euro', 'Soldi'], squadra: ['squadra', 'Squadra'], trofeo: ['coppa', 'Trofei'] };
const VECCHI_ICO = { '🏆': 'risultato', '🤝': 'societa', '😞': 'risultato', '🚑': 'infortunio', '✍️': 'mercato', '💸': 'mercato', '🏗️': 'stadio', '🏟️': 'stadio', '🧹': 'stadio', '🎉': 'societa', '⚠️': 'soldi', '🚀': 'trofeo', '📉': 'societa', '📅': 'societa', '👏': 'squadra', '🧒': 'giovani', '⚡': 'mercato', '📋': 'mercato', '👋': 'mercato', '🪄': 'societa' };

// ---------- biglietti e abbonamenti ----------
const prezziDi = () => (S.prezzi = S.prezzi || { bigl: 1, abb: 1 });
const prezzoBiglietto = () => Math.max(1, Math.round(TIERS[S.tier - 1].prezzo * prezziDi().bigl));
const prezzoAbb = () => tondo(TIERS[S.tier - 1].prezzo * (SQUADRE_GIRONE - 1) * 0.8 * prezziDi().abb);
function stimaAbbonati(){ return Math.round(Math.min(postiStadio(S) * 0.6, S.tifosi * 0.28 * Math.pow(1 / prezziDi().abb, 1.25) * (0.6 + S.morale / 200))); }
function vendiAbbonamenti(){
  const n = stimaAbbonati(), inc = n * prezzoAbb();
  S.abbonati = n; if (inc) movimento('abbonamenti', Math.round(inc * soldiDiff()), 'Campagna abbonamenti');
  if (n) notizia(`Campagna abbonamenti chiusa: ${n.toLocaleString('it-IT')} abbonati per ${euro(Math.round(inc * soldiDiff()))}.`, 'tifosi');
}

// ---------- obiettivi della stagione ----------
const AMBIZIONI = [['Salvezza tranquilla', 'Restare in categoria senza rischi'], ['Metà classifica', 'Finire nella parte alta'], ['Promozione', 'Salire di categoria']];
function nuoviObiettivi(){
  const d = S.lega && S.lega.dati; if (!d) return;
  const mia = forzaTot(forzaMia());
  const rank = d.squadre.filter((s, i) => i !== S.lega.mio && forzaTot(s.forza || { por: 0, dif: 0, cen: 0, att: 0 }) > mia).length + 1;
  const amb = S.club.amb == null ? 1 : S.club.amb;
  let max = clamp(Math.round(rank + (1 - amb) * 2 + 1), 1, d.n - RETROCESSE);
  if (amb === 2) max = Math.min(max, PROMOSSE);
  const testo = max <= 1 ? 'Vincere il campionato' : max <= PROMOSSE ? 'Conquistare la promozione' : max <= Math.ceil(d.n / 2) ? `Arrivare almeno ${max}°` : 'Salvarsi (non retrocedere)';
  S.obiettivi = { s: S.stagione, princ: { max: max > d.n / 2 ? d.n - RETROCESSE : max, testo }, gol: Math.round((d.n - 1) * 2 * (1.1 + (d.n - max) / d.n * 0.7)), soldi0: Math.round(S.soldi), tifosi: Math.round(S.tifosi * 1.15) };
  notizia(`Obiettivo della stagione: ${testo.toLowerCase()}. I tifosi ci credono!`, 'societa');
}
function statoObiettivi(){
  const O = S.obiettivi; if (!O || O.s !== S.stagione) return [];
  const d = S.lega.dati, pos = posizioneDi(d, S.lega.mio), me = d.squadre[S.lega.mio], tot = giornateTot(d.n);
  const gf = me ? me.gf : 0;
  return [
    { k: 'princ', t: O.princ.testo, val: `${pos}° adesso`, p: clamp((d.n - pos + 1) / (d.n - O.princ.max + 1), 0, 1), ok: pos <= O.princ.max, premio: 'Bonus dello sponsor e più tifosi' },
    { k: 'gol', t: `Segnare ${O.gol} gol`, val: `${gf} di ${O.gol}`, p: clamp(gf / O.gol, 0, 1), ok: gf >= O.gol, premio: 'Più tifosi' },
    { k: 'soldi', t: 'Chiudere con il bilancio in attivo', val: (S.soldi - O.soldi0 >= 0 ? '+' : '') + euroBreve(S.soldi - O.soldi0), p: S.soldi >= O.soldi0 ? 1 : clamp(1 + (S.soldi - O.soldi0) / Math.max(1, O.soldi0), 0, 1), ok: S.soldi >= O.soldi0, premio: 'Fiducia degli sponsor' },
    { k: 'tifosi', t: `Arrivare a ${O.tifosi.toLocaleString('it-IT')} tifosi`, val: S.tifosi.toLocaleString('it-IT'), p: clamp(S.tifosi / O.tifosi, 0, 1), ok: S.tifosi >= O.tifosi, premio: 'Bonus del negozio' }
  ].map((x) => Object.assign(x, { fine: d.giornata >= tot }));
}
function chiudiObiettivi(pos, n){
  const O = S.obiettivi; if (!O) return [];
  const T = TIERS[S.tier - 1], res = [];
  const princ = pos <= O.princ.max;
  if (princ){ const b = tondo(T.sponsor * 8 * soldiDiff()); movimento('premi', b, 'Obiettivo raggiunto'); S.tifosi = Math.round(S.tifosi * 1.1); res.push(['ok', O.princ.testo, '+' + euroBreve(b) + ' e più tifosi']); }
  else { S.tifosi = Math.round(S.tifosi * 0.92); S.morale = clamp(S.morale - 8, 15, 100); res.push(['no', O.princ.testo, 'Tifosi delusi']); }
  const me = S.lega.dati.prev ? S.lega.dati.prev.tab.find((t) => t.i === S.lega.mio) : null;
  if (me && me.gf >= O.gol){ S.tifosi = Math.round(S.tifosi * 1.04); res.push(['ok', `Segnare ${O.gol} gol`, 'Più tifosi']); } else res.push(['no', `Segnare ${O.gol} gol`, '']);
  if (S.soldi >= O.soldi0){ const b = tondo(T.sponsor * 3 * soldiDiff()); movimento('premi', b, 'Bilancio in attivo'); res.push(['ok', 'Bilancio in attivo', '+' + euroBreve(b)]); } else res.push(['no', 'Bilancio in attivo', '']);
  if (S.tifosi >= O.tifosi){ const b = tondo(T.sponsor * 2 * soldiDiff()); movimento('premi', b, 'Obiettivo tifosi'); res.push(['ok', 'Obiettivo tifosi', '+' + euroBreve(b)]); } else res.push(['no', 'Obiettivo tifosi', '']);
  return res;
}

// ---------- imprevisti ----------
// alcuni succedono e basta, altri ti chiedono di scegliere
const scala = () => tondo(TIERS[S.tier - 1].sponsor * 4 + 5000);
const IMPREVISTI = [
  { w: 3, se: () => S.stadio.spogl < 3, fai: () => { const c = scala() * 1.2; movimento('altro', -c, 'Riparazione spogliatoi'); return [`Scoppia un tubo negli spogliatoi! Riparazione urgente: ${euro(c)}.`, 'evento']; } },
  { w: 3, fai: () => { S.stadio.usura = clamp(S.stadio.usura - 8, 0, 100); return ['Una grandinata fortissima rovina il campo e i sedili: lo stadio perde l’8%.', 'evento']; } },
  { w: 2, fai: () => { const c = scala() * 2; movimento('altro', c, 'Donazione di un tifoso'); return [`Un imprenditore della città, grande tifoso, regala alla società ${euro(c)}!`, 'soldi']; } },
  { w: 3, fai: () => { const L = S.rosa.filter(disponibile).sort(() => RND() - 0.5).slice(0, 3); L.forEach((p) => p.forma = clamp(p.forma - 25, 30, 100)); return [L.length ? `Influenza nello spogliatoio: ${L.map((p) => p.c).join(', ')} sono stanchi e senza energie.` : 'Un po’ di influenza in città, ma la squadra sta bene.', 'infortunio']; } },
  { w: 2, fai: () => { S.tifosi = Math.round(S.tifosi * 1.05); return [`Il sindaco di ${S.club.citta || 'città'} premia la squadra in piazza: arrivano nuovi tifosi.`, 'tifosi']; } },
  { w: 2, fai: () => { const c = Math.round(scala() * 0.6); movimento('altro', -c, 'Multa della lega'); return [`Multa della lega per i petardi in curva: ${euro(c)}.`, 'evento']; } },
  { w: 2, se: () => S.ultima && S.ultima.esito === 'V', fai: () => { const c = scala(); movimento('sponsor', c, 'Bonus sponsor'); return [`Lo sponsor è felice per la vittoria e paga un bonus di ${euro(c)}.`, 'soldi']; } },
  { w: 2, fai: () => { const c = Math.round(scala() * 0.8); movimento('altro', -c, 'Furto in sede'); return [`Ladri in sede durante la notte: spariti palloni e magliette per ${euro(c)}.`, 'evento']; } },
  { w: 2, fai: () => { const t = Math.round(S.tifosi * 0.08) + 50; S.tifosi += t; return [`Un video della squadra diventa virale sui social: ${t.toLocaleString('it-IT')} nuovi tifosi!`, 'tifosi']; } },
  { w: 1, fai: () => { const c = Math.round(scala() * 1.5); movimento('altro', -c, 'Tasse arretrate'); return [`Controllo delle tasse: c’erano ${euro(c)} da pagare.`, 'soldi']; } },
  { w: 2, se: () => S.stadio.negozio > 0, fai: () => { const c = Math.round(scala() * (0.5 + S.stadio.negozio * 0.5)); movimento('negozio', c, 'Magliette a ruba'); return [`Le nuove magliette vanno a ruba al negozio: ${euro(c)} di incasso in più.`, 'soldi']; } },
  // scelte
  { w: 3, scelta: () => { const p = S.rosa.filter((x) => !x.prestito).sort((a, b) => b.val - a.val)[0]; if (!p) return null; const nuovo = tondo(p.stip * 1.3);
    return { t: `${p.n} ${p.c}, il tuo giocatore migliore, chiede un aumento: da ${euro(p.stip)} a ${euro(nuovo)} a giornata.`, ico: 'contratto',
      op: [{ t: 'Accetta l’aumento', f: () => { p.stip = nuovo; p.mor = clamp((p.mor || 70) + 20, 10, 100); return `${p.c} è felicissimo e darà il massimo.`; } },
           { t: 'Rifiuta', f: () => { p.mor = clamp((p.mor || 70) - 25, 10, 100); return `${p.c} è arrabbiato: il suo morale crolla.`; } }] }; } },
  { w: 2, scelta: () => { const c = scala() * 3; return { t: `Un’azienda offre ${euro(c)} per giocare un’amichevole in un’altra città. I giocatori però si stancheranno.`, ico: 'contratto',
      op: [{ t: 'Accetta', f: () => { movimento('sponsor', c, 'Amichevole'); S.rosa.forEach((p) => p.forma = clamp(p.forma - 12, 30, 100)); return `Incassati ${euro(c)}, ma la squadra è stanca.`; } }, { t: 'Rifiuta', f: () => 'La squadra resta a riposarsi.' }] }; } },
  { w: 2, scelta: () => ({ t: 'I tifosi chiedono biglietti meno cari per la prossima partita in casa.', ico: 'biglietto',
      op: [{ t: 'Abbassa i prezzi del 20%', f: () => { prezziDi().bigl = Math.max(0.5, Math.round(prezziDi().bigl * 0.8 * 100) / 100); S.tifosi = Math.round(S.tifosi * 1.04); return 'I tifosi ringraziano: lo stadio sarà più pieno.'; } },
           { t: 'Lascia i prezzi così', f: () => { S.tifosi = Math.round(S.tifosi * 0.98); return 'Qualche tifoso si lamenta sui social.'; } }] }) },
  { w: 1, scelta: () => ({ t: 'Il comune propone di pagare metà del prossimo lavoro allo stadio, se lo fai entro poco tempo.', ico: 'stadio',
      op: [{ t: 'Accetta', f: () => { S.scontoLavori = { fino: S.giornate + 8 }; return 'Il prossimo lavoro allo stadio (entro 8 giornate) costa la metà!'; } }, { t: 'No grazie', f: () => 'Va bene, sarà per un’altra volta.' }] }) },
  { w: 2, scelta: () => { const L = S.rosa.filter((x) => x.r !== 'P').sort(() => RND() - 0.5).slice(0, 2); if (L.length < 2) return null;
    return { t: `${L[0].c} e ${L[1].c} litigano in allenamento davanti a tutti.`, ico: 'avviso',
      op: [{ t: 'Multali tutti e due', f: () => { L.forEach((p) => p.mor = clamp((p.mor || 70) - 10, 10, 100)); movimento('altro', Math.round(scala() * 0.3), 'Multe ai giocatori'); S.morale = clamp(S.morale + 2, 15, 100); return 'Multa pagata: lo spogliatoio capisce che ci sono regole.'; } },
           { t: 'Chiudi un occhio', f: () => { S.morale = clamp(S.morale - 4, 15, 100); return 'Il resto della squadra non è contento.'; } }] }; } },
  { w: 2, scelta: () => { const c = scala() * 1.5; return { t: `Una TV locale vuole trasmettere la prossima partita in casa e paga ${euro(c)}. Allo stadio verrà meno gente.`, ico: 'schermo',
      op: [{ t: 'Accetta', f: () => { movimento('tv', c, 'TV locale'); S.menoPubblico = S.giornate + 2; return `Incassati ${euro(c)} dalla TV.`; } }, { t: 'Rifiuta', f: () => 'Lo stadio resterà pieno.' }] }; } },
  { w: 2, scelta: () => { const c = scala() * 1.4; return { t: `Il preparatore propone un ritiro di tre giorni in montagna. Costa ${euro(c)}.`, ico: 'tenda',
      op: [{ t: 'Andiamo!', f: () => { movimento('allenamento', -c, 'Ritiro in montagna'); S.rosa.forEach((p) => p.forma = clamp(p.forma + 15, 30, 100)); S.intesa = clamp((S.intesa || 50) + 8, 10, 100); return 'La squadra torna in gran forma e più unita.'; } }, { t: 'Restiamo a casa', f: () => 'Si continua con il solito allenamento.' }] }; } },
  { w: 1, scelta: () => { const p = S.rosa.slice().sort((a, b) => (b.gol || 0) - (a.gol || 0))[0]; if (!p) return null;
    return { t: `Un giornale vuole un’intervista esclusiva con ${p.n} ${p.c}.`, ico: 'microfono',
      op: [{ t: 'Sì, va bene', f: () => { S.tifosi = Math.round(S.tifosi * 1.03); p.mor = clamp((p.mor || 70) + 8, 10, 100); return 'L’intervista piace a tutti: nuovi tifosi.'; } }, { t: 'Meglio di no', f: () => 'Il giocatore resta concentrato sul campo.' }] }; } }
];
function imprevisto(){
  if (RND() > 0.3) return;
  const L = IMPREVISTI.filter((x) => !x.se || x.se());
  const tot = L.reduce((s, x) => s + x.w, 0); let x = RND() * tot, ev = L[0];
  for (const e of L){ x -= e.w; if (x <= 0){ ev = e; break; } }
  if (ev.fai){ const [t, tipo] = ev.fai(); notizia(t, tipo); S.pendenti.push({ tipo: 'info', t, ico: TIPI_NOTIZIA[tipo] ? TIPI_NOTIZIA[tipo][0] : 'fulmine' }); }
  else { const s = ev.scelta(); if (s){ const k = IMPREVISTI.indexOf(ev); S._scelte = S._scelte || {}; const id = uid(); S._scelte[id] = s; S.pendenti.push({ tipo: 'scelta', id, t: s.t, ico: s.ico, op: s.op.map((o) => o.t) }); } }
}
// la scelta viene rifatta quando la apri (le funzioni non si salvano): se la partita è stata ricaricata, si sceglie fra effetti generici
function rispondiScelta(id, i){
  const s = S._scelte && S._scelte[id];
  let t = 'Fatto.';
  if (s && s.op[i]) t = s.op[i].f();
  if (S._scelte) delete S._scelte[id];
  notizia(t, 'evento'); aggiornaMioSlot(); salva(); disegna();
  return t;
}

// ---------- conferenza stampa ----------
function conferenza(rep){
  if (RND() > 0.28) return;
  const V = rep.esito === 'V', P = rep.esito === 'P';
  const q = V ? 'Bella vittoria, presidente. Adesso siete i favoriti?' : P ? 'Brutta sconfitta. Cosa non ha funzionato?' : 'Un pareggio: è un punto guadagnato o due persi?';
  const op = V ? [['Restiamo umili, pensiamo alla prossima', { mor: 2 }], ['Sì! Quest’anno vinciamo tutto!', { tif: 4, mor: 4, press: 1 }], ['Merito dei ragazzi, sono fantastici', { mor: 5 }]]
    : P ? [['È colpa mia, mi assumo la responsabilità', { mor: 4, tif: -1 }], ['I giocatori devono dare di più', { mor: -5, tif: 1 }], ['L’arbitro ci ha penalizzato', { tif: 2, multa: 1 }]]
    : [['Un buon punto, andiamo avanti', { mor: 2 }], ['Due punti persi, dovevamo vincere', { mor: -2, tif: 2 }], ['Il pareggio è giusto', { mor: 1 }]];
  S.pendenti.push({ tipo: 'stampa', q, op: op.map((x) => x[0]), eff: op.map((x) => x[1]), g: S.giornate });
}
function rispondiStampa(p, i){
  const e = p.eff[i] || {};
  if (e.mor) S.morale = clamp(S.morale + e.mor, 15, 100);
  if (e.tif) S.tifosi = Math.max(10, Math.round(S.tifosi * (1 + e.tif / 100)));
  if (e.multa) movimento('altro', -Math.round(scala() * 0.4), 'Multa per le parole sull’arbitro');
  const g = pick(GIORNALI);
  notizia(`«${p.op[i]}». Il presidente della ${S.club.nome} in conferenza stampa.`, 'stampa', g);
  salva(); disegna();
}
