/* =========================================================
   CALCIOMANIA 2 — la grafica nuova (nero e oro, foto delle carriere)
   Questo file arriva dopo gioco.js e cambia solo le schermate:
   - accesso (Google, email e password, ospite)
   - "Scegli la carriera" a schermo intero con le tre carte grandi
   Il gioco sotto è lo stesso di Calciomania PM, con lo stesso account.
   ========================================================= */
'use strict';

const CHEV = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const PALLA2 = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.3l3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="currentColor"/><path d="M12 2.8v4.5M15.4 9.8l4.2-1.5M14.1 13.8l2.6 3.6M9.9 13.8l-2.6 3.6M8.6 9.8L4.4 8.3" stroke="currentColor" stroke-width="2"/></svg>';

// le "foto" delle tre carriere (disegnate, così il sito resta leggero e gratis)
const ARTE2 = {
  presidente: `<svg class="arte" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="aLamp" cx="35%" cy="58%" r="45%"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".55"/><stop offset=".5" stop-color="#d9ae3a" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="aMuro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1915"/><stop offset="1" stop-color="#0d0c0a"/></linearGradient>
    <linearGradient id="aTav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a1a"/><stop offset="1" stop-color="#140e08"/></linearGradient></defs>
    <rect width="400" height="200" fill="url(#aMuro)"/>
    <g opacity=".35" stroke="#2b261f" stroke-width="2">${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="140"/>`).join('')}</g>
    <rect x="250" y="22" width="90" height="62" rx="3" fill="#15130f" stroke="#3b3326" stroke-width="3"/><rect x="262" y="34" width="66" height="38" fill="#221d15"/><path d="M270 66l14-16 10 10 8-7 18 13z" fill="#3a3122"/>
    <rect width="400" height="200" fill="url(#aLamp)"/>
    <path d="M120 150V96" stroke="#2a2620" stroke-width="5"/><path d="M120 96l38-34" stroke="#2a2620" stroke-width="5"/><path d="M140 52l40 16-14 22-36-20z" fill="#2c2721"/><ellipse cx="160" cy="84" rx="16" ry="5" fill="#ffe7b0" opacity=".85" transform="rotate(30 160 84)"/>
    <ellipse cx="120" cy="152" rx="22" ry="5" fill="#2a2620"/>
    <rect x="0" y="150" width="400" height="50" fill="url(#aTav)"/><rect x="0" y="148" width="400" height="4" fill="#4a3622"/>
    <rect x="215" y="136" width="70" height="14" rx="2" fill="#e9e3d4" opacity=".75" transform="rotate(-4 250 143)"/><circle cx="315" cy="140" r="9" fill="#2b2016" stroke="#4a3622" stroke-width="2"/></svg>`,
  allenatore: `<svg class="arte" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="aErba" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f5a22"/><stop offset="1" stop-color="#173512"/></linearGradient>
    <radialGradient id="aSole" cx="70%" cy="10%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
    <rect width="400" height="200" fill="url(#aErba)"/>
    <g opacity=".22">${Array.from({ length: 10 }, (_, i) => `<polygon points="${-60 + i * 60},200 ${-20 + i * 60},200 ${100 + i * 60},0 ${60 + i * 60},0" fill="#0d2209"/>`).join('')}</g>
    <g fill="#9bd27a" opacity=".08">${Array.from({ length: 140 }, (_, i) => `<rect x="${(i * 53) % 400}" y="${(i * 37) % 200}" width="2" height="6" transform="rotate(${(i * 17) % 40 - 20} ${(i * 53) % 400} ${(i * 37) % 200})"/>`).join('')}</g>
    <path d="M228 -10C176 60 150 130 158 215" stroke="#f4f4ef" stroke-width="7" fill="none" opacity=".9"/>
    <path d="M330 -10c-6 70 6 150 40 215" stroke="#f4f4ef" stroke-width="5" fill="none" opacity=".55"/>
    <rect width="400" height="200" fill="url(#aSole)"/></svg>`,
  giocatore: `<svg class="arte" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="aNotte" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f14"/><stop offset=".7" stop-color="#151a12"/><stop offset="1" stop-color="#1f3517"/></linearGradient>
    <radialGradient id="aFaro" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe8"/><stop offset=".25" stop-color="#ffe9a8" stop-opacity=".6"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="aMaglia" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a1c"/><stop offset=".55" stop-color="#d9ae3a"/><stop offset="1" stop-color="#6e5414"/></linearGradient></defs>
    <rect width="400" height="200" fill="url(#aNotte)"/>
    <path d="M0 120l60-30h280l60 30v20H0z" fill="#10140f"/><g fill="#ffffff" opacity=".07">${Array.from({ length: 60 }, (_, i) => `<circle cx="${8 + i * 6.6}" cy="${108 + (i % 3) * 5}" r="1.4"/>`).join('')}</g>
    <circle cx="70" cy="40" r="40" fill="url(#aFaro)"/><circle cx="330" cy="36" r="44" fill="url(#aFaro)"/>
    <g fill="#fffbe8"><rect x="58" y="34" width="24" height="10" rx="2" opacity=".9"/><rect x="316" y="30" width="28" height="11" rx="2" opacity=".9"/></g>
    <g transform="translate(305 0)">
      <path d="M-78 210c2-40 16-64 40-72l22-6h32l22 6c24 8 38 32 40 72z" fill="url(#aMaglia)"/>
      <path d="M-16 132h32l-4 10h-24z" fill="#4d3a0e"/>
      <path d="M-14 132c2-14 4-22 14-22s12 8 14 22z" fill="#2a1c12"/>
      <ellipse cx="0" cy="92" rx="25" ry="29" fill="#20150d"/>
      <path d="M-25 88c0-20 10-32 25-32s25 12 25 32c-6-8-14-12-25-12s-19 4-25 12z" fill="#0b0705"/>
      <path d="M12 66c10 6 14 18 13 30l-6-6c0-10-2-18-7-24z" fill="#fff3c9" opacity=".35"/>
      <text x="0" y="192" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="52" fill="#16120a" opacity=".85">10</text>
    </g>
    <rect y="150" width="400" height="50" fill="#000" opacity=".15"/></svg>`
};

// ---------- schermata di accesso ----------
const ERR2 = {
  'auth/invalid-email': "L'email non è scritta bene", 'auth/missing-password': 'Scrivi la password', 'auth/weak-password': 'La password deve avere almeno 6 caratteri',
  'auth/email-already-in-use': "C'è già un account con questa email: premi «Entra»", 'auth/invalid-credential': 'Email o password sbagliate', 'auth/invalid-login-credentials': 'Email o password sbagliate',
  'auth/wrong-password': 'Password sbagliata', 'auth/user-not-found': "Non c'è nessun account con questa email", 'auth/too-many-requests': "Troppi tentativi: aspetta un po' e riprova",
  'auth/popup-closed-by-user': 'Hai chiuso la finestra di Google', 'auth/cancelled-popup-request': 'Hai chiuso la finestra di Google', 'auth/network-request-failed': 'Niente internet: riprova'
};
const errTesto2 = (e) => ERR2[e && e.code] || (e && e.message) || 'Qualcosa non ha funzionato';
let _registra = false;

function schermataIniziale(soloAccesso){
  S = null; chiudiFoglio(true);
  const on = window.Online && Online.loggato();
  if (soloAccesso !== true && (on || qualcheCarriera())) return schermataCarriere(false);
  document.body.classList.remove('in-partita');
  $('#app').innerHTML = `<div class="acc2"><div class="acc2-foto"></div><div class="acc2-c">
    <div class="acc2-logo">${PALLA2}</div>
    <h1 class="acc2-tit">CALCIOMANIA<span>2</span></h1>
    <p class="acc2-sotto">Presidente, allenatore, giocatore. Dalla Terza Categoria alla Serie A.</p>
    <button class="btn2 scuro" id="a2G"><svg viewBox="0 0 24 24" class="g2" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="currentColor" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" opacity=".75"/><path fill="currentColor" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" opacity=".55"/><path fill="currentColor" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" opacity=".9"/></svg>CONTINUA CON GOOGLE</button>
    <div class="acc2-o"><span>oppure</span></div>
    ${_registra ? `<label class="acc2-l">IL TUO NOME</label><input class="acc2-in" id="a2N" maxlength="30" placeholder="Come ti chiami?" autocomplete="name">` : ''}
    <label class="acc2-l">E-MAIL</label><input class="acc2-in" id="a2E" type="email" placeholder="nome@email.it" autocomplete="email">
    <label class="acc2-l">PASSWORD</label><input class="acc2-in" id="a2P" type="password" placeholder="Minimo 6 caratteri" autocomplete="${_registra ? 'new-password' : 'current-password'}">
    <p class="acc2-err" id="a2Err" role="alert"></p>
    <button class="btn2 oro" id="a2Ok">${_registra ? 'CREA ACCOUNT' : 'ENTRA'}</button>
    <button class="acc2-link" id="a2Sw">${_registra ? 'Hai già un account? <b>Entra</b>' : 'Non hai un account? <b>Registrati</b>'}</button>
    ${_registra ? '' : '<button class="acc2-link piccolo" id="a2R">Ho dimenticato la password</button>'}
    <div class="acc2-ospite"><button class="btn2 linea" data-a="ospite">${ic('play')} GIOCA COME OSPITE</button><p>Come ospite la partita non si salva quando chiudi.</p></div>
    <p class="acc2-nota">Lo stesso account del Gioco della Vita PM e di Calciomania PM. <button class="acc2-link piccolo" data-a="comeSiGioca">Come si gioca</button></p>
  </div></div>`;
  const msg = (t) => { const x = $('#a2Err'); if (x) x.textContent = t; };
  const occ = (b, si) => { b.disabled = si; b.classList.toggle('occupato', si); };
  const e = () => ($('#a2E').value || '').trim(), p = () => $('#a2P').value || '';
  $('#a2Sw').onclick = () => { _registra = !_registra; schermataIniziale(true); };
  $('#a2G').onclick = () => { msg(''); occ($('#a2G'), true); caricaOnline().then(() => Online.loginGoogle()).catch((x) => msg(errTesto2(x))).finally(() => { const b = $('#a2G'); if (b) occ(b, false); }); };
  $('#a2Ok').onclick = async () => {
    msg('');
    if (!e()) return msg('Scrivi la tua email');
    if (p().length < 6) return msg('La password deve avere almeno 6 caratteri');
    const b = $('#a2Ok'); occ(b, true);
    try {
      await caricaOnline(); const A = firebase.auth();
      if (_registra){ const c = await A.createUserWithEmailAndPassword(e(), p()); const n = ($('#a2N') && $('#a2N').value.trim()) || ''; if (n) await c.user.updateProfile({ displayName: n }); }
      else await A.signInWithEmailAndPassword(e(), p());
      _registra = false;
    } catch (x) { msg(errTesto2(x)); } finally { const bb = $('#a2Ok'); if (bb) occ(bb, false); }
  };
  [$('#a2E'), $('#a2P')].forEach((i) => i.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#a2Ok').click(); }));
  const r = $('#a2R'); if (r) r.onclick = () => { if (!e()) return msg('Scrivi prima la tua email'); caricaOnline().then(() => firebase.auth().sendPasswordResetEmail(e())).then(() => msg('Ti abbiamo mandato un’email per cambiare la password')).catch((x) => msg(errTesto2(x))); };
}

// ---------- scegli la carriera (a schermo intero) ----------
function qualcheCarriera(){ return Object.keys(CARRIERE).some((k) => { try { const t = localStorage.getItem(chiaveDi(k)); const c = t ? JSON.parse(t) : null; return !!(c && c.club); } catch (e) { return false; } }); }
let _ospite2 = false;
function nomeSaluto(){
  if (window.Online && Online.loggato()) return Online.nome();
  for (const k of ['giocatore', 'allenatore']){ const x = !_ospite2 && leggiCarriera(k); if (x){ const n = k === 'giocatore' ? x.mio && x.mio.nome : x.allenatore && x.allenatore.nome; if (n) return n.split(' ')[0]; } }
  return _ospite2 ? 'ospite' : '';
}
function infoCarriera(k){
  if (S && modo() === k) return S;
  if (_ospite2) return _ospiti[k] || null;
  const salvaS = S; if (S && S.ospite) S = null; // leggiCarriera guarda se sei ospite
  try { return leggiCarriera(k); } finally { S = salvaS; }
}
function cartaCarriera2(k){
  const c = CARRIERE[k], x = infoCarriera(k), ora = S && modo() === k;
  const sotto = x ? `<span class="car2-club">${stemmaSVG(x.club, 34, x.club.nome)}<span><b>${esc(x.club.nome)}</b><small>${TIERS[(x.tier || 1) - 1].nome} · Stagione ${x.stagione || 1}${x.lega && x.lega.giocate != null ? ' · Giornata ' + (x.lega.giocate + 1) : ''}</small></span></span>${ora ? '<em class="car2-badge ora">ORA</em>' : `<i class="car2-vai">${CHEV}</i>`}`
    : `<span class="car2-desc">${{ presidente: 'Fonda il club, gestisci soldi, stadio, staff e mercato.', allenatore: 'Modulo, tattica, allenamenti e la panchina che scotta.', giocatore: 'Crea il tuo calciatore, segna e arriva in Nazionale.' }[k]}</span><em class="car2-badge">NUOVA</em>`;
  return `<button class="car2 car2-${k}" data-a="${x ? 'carriera2' : 'nuovaCarriera'}" data-v="${k}" data-osp="${_ospite2 ? 1 : 0}">${ARTE2[k]}<span class="car2-velo"></span>
    <span class="car2-testo"><span class="car2-nome">${ic(c.ico)}${c.nome.toUpperCase()}</span><span class="car2-riga">${sotto}</span></span></button>`;
}
function schermataCarriere(ospite){
  if (ospite != null) _ospite2 = !!ospite;
  chiudiFoglio(true); document.body.classList.remove('in-partita');
  const n = nomeSaluto(), dentro = !!S;
  $('#app').innerHTML = `<div class="car2-pag">
    <div class="car2-testa"><div><small>${n ? 'CIAO ' + esc(n.toUpperCase()) : 'BENVENUTO'}</small><h1>Scegli la carriera</h1></div>
      <button class="car2-ing" data-a="${dentro ? 'car2Indietro' : 'car2Impost'}" aria-label="${dentro ? 'Torna al gioco' : 'Impostazioni'}">${ic(dentro ? 'x' : 'ingranaggio')}</button></div>
    <div class="car2-lista">${Object.keys(CARRIERE).map(cartaCarriera2).join('')}</div>
    <p class="car2-nota">${_ospite2 ? 'Stai giocando come ospite: le carriere non si salvano.' : 'Puoi fare tutte e tre le carriere: ognuna si salva per conto suo.'}</p>
  </div>`;
}
// dal menu: "Cambia carriera" ora apre la schermata grande
function cambiaCarriera(){ if (S) lasciaCarrieraAttuale(); schermataCarriere(S ? !!S.ospite : _ospite2); }
function scegliCarriera(ospite){ schermataCarriere(ospite); }

function impostazioni2(){
  const on = window.Online && Online.loggato();
  foglio(`<h2>${ic('ingranaggio')} Impostazioni</h2>
    ${on ? `<p>Sei dentro come <b>${esc(Online.nome())}</b>. Le carriere si salvano nel tuo account.</p><div class="riga-btn"><button class="btn sec" id="i2Esci">${ic('esci')} Esci dall’account</button></div>`
      : `<p>Non sei dentro con un account.</p><div class="riga-btn"><button class="btn" id="i2Entra">${ic('utente')} Entra o registrati</button></div>`}
    <h3>Altro</h3>
    <button class="riga-menu" data-a="comeSiGioca">${ic('aiuto')} Come si gioca</button>
    <button class="riga-menu" data-a="installa">${ic('scarica')} Metti l’app sul telefono</button>
    <p class="nota centro">Calciomania 2 · gratis, senza pubblicità · <a href="../">sito</a></p>`);
  const x = $('#i2Esci'); if (x) x.onclick = () => { Online.logout().then(() => { chiudiFoglio(true); _ospite2 = false; schermataIniziale(); avviso('Sei uscito dall’account'); }); };
  const y = $('#i2Entra'); if (y) y.onclick = () => { chiudiFoglio(true); _ospite2 = false; S = null; document.body.classList.remove('in-partita'); mostraAccesso(); };
}
function mostraAccesso(){ schermataIniziale(true); }

// pulsanti nuovi (si aggiungono a quelli del gioco)
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, v = b.dataset.v;
  if (a === 'carriera2'){
    ev.stopImmediatePropagation();
    if (S && modo() === v){ schermo = 'home'; disegna(); return; }
    const osp = b.dataset.osp === '1';
    if (osp){ const c = _ospiti[v]; if (!c) return nuovaCarriera(v, true); if (S) lasciaCarrieraAttuale(); S = c; S.ospite = true; }
    else { if (S) lasciaCarrieraAttuale(); const c = infoCarriera(v); if (!c) return nuovaCarriera(v, false); S = c; S.ospite = false; }
    segnaAttiva(v); migra(); Suono.on = S.opz.suono; schermo = 'home'; sottoschermo = {}; disegna(); avviso('Carriera: ' + CARRIERE[v].nome); mostraPendenti();
    if (!osp && S.lega && S.lega.online) caricaOnline().then(() => Online.riprendi()).catch(() => {});
  } else if (a === 'car2Indietro'){ ev.stopImmediatePropagation(); if (S){ schermo = 'home'; disegna(); } }
  else if (a === 'car2Impost'){ ev.stopImmediatePropagation(); impostazioni2(); }
  else if (a === 'ospite'){ ev.stopImmediatePropagation(); schermataCarriere(true); }
}, true);

// all'avvio: se hai già almeno una carriera, si parte da "Scegli la carriera" (come nell'app nuova)
window.addEventListener('load', () => {
  setTimeout(() => {
    if (S && !S.ospite && !document.querySelector('.velo') && qualcheCarriera()){ salva(true); S = null; schermataCarriere(false); }
  }, 0);
});

// ---------- guide "Come si fa" su Rosa, Tattica e Stadio (presidente e allenatore) ----------
function guida2(id, titolo, passi, extra = ''){
  let aperta = true; try { aperta = localStorage.getItem('cm2-guida-' + id) !== 'chiusa'; } catch (e) {}
  return `<details class="guida2" data-g="${id}" ${aperta ? 'open' : ''}><summary>${ic('aiuto')}<span>${titolo}</span><i>${CHEV}</i></summary>
    <ol>${passi.map((p) => `<li>${p}</li>`).join('')}</ol>${extra}</details>`;
}
document.addEventListener('toggle', (e) => { const d = e.target; if (d.classList && d.classList.contains('guida2')) { try { localStorage.setItem('cm2-guida-' + d.dataset.g, d.open ? 'aperta' : 'chiusa'); } catch (x) {} } }, true);

const RUOLI2 = { P: ['portiere', 'portieri', 2], D: ['difensore', 'difensori', 6], C: ['centrocampista', 'centrocampisti', 6], A: ['attaccante', 'attaccanti', 4] };
function consiglioRosa(){
  const conta = { P: 0, D: 0, C: 0, A: 0 }; S.rosa.forEach((p) => { if (conta[p.r] != null) conta[p.r]++; });
  const manca = Object.entries(RUOLI2).filter(([r, x]) => conta[r] < x[2]).map(([r, x]) => { const n = x[2] - conta[r]; return `<b>${n}</b> ${n === 1 ? x[0] : x[1]}`; });
  const righe = Object.entries(RUOLI2).map(([r, x]) => `<span class="r2 ${conta[r] >= x[2] ? 'ok' : ''}"><span class="ruolo r${r}">${r}</span>${conta[r]}/${x[2]}</span>`).join('');
  return `<div class="rosa2">${righe}</div>${manca.length ? `<p class="nota">Per una rosa completa ti servono ancora ${manca.join(', ')}.</p><button class="btn mini" data-a="vai" data-v="mercato">${ic('mercato')} Vai al mercato</button>` : '<p class="nota oro">La rosa è completa: bravo!</p>'}`;
}
function moduloConsigliato(){
  if (S.rosa.filter(disponibile).length < 11) return null;
  const T = S.tattica, mod = T.mod, tit = T.tit; let best = null;
  try { Object.keys(MODULI).forEach((k) => { T.mod = k; T.tit = null; const f = forzaTot(forzaMia()); if (!best || f > best.f) best = { k, f }; }); }
  finally { T.mod = mod; T.tit = tit; }
  return best;
}
const _rosaVecchia = schermoRosa, _tatticaVecchia = schermoTattica, _stadioVecchio = schermoStadio;
schermoRosa = function(){
  if (modo() === 'giocatore') return _rosaVecchia();
  return guida2('rosa', 'Come si fa la rosa', [
    'Ti servono <b>almeno 11 giocatori</b> con un <b>portiere</b>. Meglio averne 18: 2 portieri, 6 difensori, 6 centrocampisti e 4 attaccanti.',
    'Compra al <b>Mercato</b>: guarda il numero colorato (la bravura), l’età e lo stipendio. I giovani crescono, i vecchi costano meno ma calano.',
    'Tocca un giocatore per vederlo: puoi <b>rinnovargli il contratto</b>, venderlo o prestarlo.',
    'Tieni d’occhio il <b>morale</b> (▲ ● ▼) e gli infortuni: chi è stanco o giù gioca peggio.'
  ], carta('', consiglioRosa(), '', 'dentro2')) + _rosaVecchia();
};
schermoTattica = function(){
  if (modo() === 'giocatore') return _tatticaVecchia();
  const b = moduloConsigliato(), ora = forzaTot(forzaMia());
  const cons = b ? (b.k === S.tattica.mod ? `<p class="nota oro">Il <b>${b.k}</b> è già il modulo migliore per la tua squadra (forza ${b.f}).</p>`
    : `<p class="nota">Con i giocatori che hai, il modulo migliore è il <b>${b.k}</b>: forza <b>${b.f}</b> invece di ${ora}.</p><button class="btn mini" data-a="modulo" data-v="${b.k}">${ic('tattica')} Usa il ${b.k}</button>`)
    : '<p class="nota">Quando avrai 11 giocatori ti dirò quale modulo è il migliore.</p>';
  return guida2('tattica', 'Come si mette la tattica', [
    '<b>Scegli il modulo</b> (per esempio 4-4-2): sono i numeri di difensori, centrocampisti e attaccanti.',
    'I titolari si scelgono da soli con i migliori. Per cambiarne uno, <b>tocca il giocatore in campo</b> e scegli chi mettere.',
    '<b>Mentalità</b>: più offensiva = segni di più ma prendi più gol. Più difensiva = il contrario.',
    '<b>Stile, pressing e linea</b>: se sei più forte attacca e pressa; se sei più debole difendi e gioca in contropiede.',
    'Guarda la <b>Forza</b> in alto: più è alta, più vinci. Prova moduli diversi e tieni quello con la forza più alta.'
  ], carta('', cons, '', 'dentro2')) + _tatticaVecchia();
};
schermoStadio = function(){
  if (modo() === 'giocatore') return _stadioVecchio();
  return guida2('stadio', 'Come migliorare lo stadio', [
    '<b>Più posti</b> (tribune) = più biglietti venduti. Conviene quando lo stadio è quasi pieno.',
    'Tieni lo <b>stato del campo</b> sopra il 60%: sotto, vengono meno tifosi. Usa «Restaura».',
    '<b>Negozio, parcheggio e luci</b> portano soldi ogni partita. Il <b>centro di allenamento</b> fa crescere i giocatori.',
    'Scegli bene il <b>prezzo dei biglietti</b>: troppo caro e lo stadio resta vuoto.',
    'Con «Progetta il tuo stadio» scegli nome, colori dei seggiolini e tetto.'
  ]) + _stadioVecchio();
};
