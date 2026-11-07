/* =========================================================
   PRESIDENTE PM — ONLINE
   Stesso account del Gioco della Vita PM (Firebase gioco-della-vita-pm).
   - calcio_salvataggi/{uid}: la tua società salvata online
   - calcio_gironi/{id}: i gironi condivisi. Ogni girone ha 12 squadre: bot e persone vere.
     Chi entra prende il posto di un bot (con i suoi punti). La giornata si gioca quando
     tutte le persone vere sono pronte, o al massimo 30 minuti dopo il primo "pronto".
     In Serie A, se sono tutte persone vere, la classifica si allunga.
   ========================================================= */
'use strict';
window.Online = (function(){
  const CFG = { apiKey: 'AIzaSyBJRUlGK_ArYn2K_pJ0ePChTUC3gkikwgY', authDomain: 'gioco-della-vita-pm.firebaseapp.com', projectId: 'gioco-della-vita-pm', storageBucket: 'gioco-della-vita-pm.firebasestorage.app', messagingSenderId: '83815479634', appId: '1:83815479634:web:86220d0844b898c5e1628b' };
  const COL = 'calcio_gironi', SAVE = 'calcio_salvataggi';
  const ATTESA_MAX = 30 * 60 * 1000;          // massimo 30 minuti di attesa per gli altri
  const INATTIVO = 14 * 24 * 3600 * 1000;     // dopo 14 giorni senza giocare il posto si libera
  const ERR = {
    'auth/invalid-email': "L'email non è scritta bene", 'auth/missing-password': 'Scrivi la password', 'auth/weak-password': 'La password deve avere almeno 6 caratteri',
    'auth/email-already-in-use': "C'è già un account con questa email: usa «Entra»", 'auth/invalid-credential': 'Email o password sbagliate', 'auth/invalid-login-credentials': 'Email o password sbagliate',
    'auth/wrong-password': 'Password sbagliata', 'auth/user-not-found': "Non c'è nessun account con questa email", 'auth/too-many-requests': "Troppi tentativi: aspetta un po' e riprova",
    'auth/popup-closed-by-user': 'Hai chiuso la finestra di Google', 'auth/cancelled-popup-request': 'Hai chiuso la finestra di Google', 'auth/network-request-failed': 'Niente internet: riprova',
    'auth/unauthorized-domain': 'Questo sito non è ancora autorizzato in Firebase: per ora entra con email e password', 'auth/operation-not-allowed': 'Questo tipo di accesso non è ancora attivo',
    'permission-denied': 'Il gioco online non è ancora attivo: mancano le regole in Firebase', 'unavailable': 'Niente internet: riprova'
  };
  const testoErr = (e) => ERR[e && e.code] || (e && e.message) || 'Qualcosa non ha funzionato';
  let A = null, D = null, user = null, err = '', unsub = null, gidAscolto = null, liveT = 0, primaVolta = true;
  const O = { pronto_: false };

  O.init = function(){
    if (!firebase.apps.length) firebase.initializeApp(CFG);
    A = firebase.auth(); D = firebase.firestore();
    A.getRedirectResult().catch((e) => { err = testoErr(e); });
    return new Promise((ok) => {
      A.onAuthStateChanged((u) => {
        const prima = user; user = u; O.pronto_ = true;
        try { if (u) localStorage.setItem('presidentepm-acc', '1'); else localStorage.removeItem('presidentepm-acc'); } catch (e) {}
        if (primaVolta){ primaVolta = false; ok(); }
        if (u && (!prima || prima.uid !== u.uid)) dopoLogin();
      });
    });
  };
  O.uid = () => user && user.uid;
  O.loggato = () => !!user;
  O.nome = () => user ? (user.displayName || (user.email || '').split('@')[0] || 'Presidente') : '';
  O.errore = () => err;

  O.loginGoogle = function(){
    const p = new firebase.auth.GoogleAuthProvider();
    return A.signInWithPopup(p).catch((e) => {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(p);
      avviso(testoErr(e)); throw e;
    });
  };
  O.logout = () => { if (unsub) unsub(); unsub = null; return A.signOut(); };
  O.finestraLogin = function(){
    foglio(`<h2>Il tuo account</h2><p class="tenue">Lo stesso account del Gioco della Vita PM. Serve per salvare la società online e giocare con le altre persone.</p>
    <button class="btn largo" id="lgG">Entra con Google</button>
    <div class="login-f"><input id="lgE" type="email" placeholder="Email" autocomplete="email"><input id="lgP" type="password" placeholder="Password (almeno 6 caratteri)" autocomplete="current-password"><input id="lgN" placeholder="Il tuo nome (solo per un account nuovo)">
    <div class="riga-btn"><button class="btn sec" id="lgIn">Entra</button><button class="btn sec" id="lgNew">Crea account</button></div><button class="link" id="lgR">Ho dimenticato la password</button><p class="rosso" id="lgErr"></p></div>`);
    const e = () => document.getElementById('lgE').value.trim(), p = () => document.getElementById('lgP').value, msg = (t) => { document.getElementById('lgErr').textContent = t; };
    document.getElementById('lgG').onclick = () => O.loginGoogle().then(() => chiudiFoglio(true)).catch((x) => msg(testoErr(x)));
    document.getElementById('lgIn').onclick = () => A.signInWithEmailAndPassword(e(), p()).then(() => chiudiFoglio(true)).catch((x) => msg(testoErr(x)));
    document.getElementById('lgNew').onclick = async () => { try { const c = await A.createUserWithEmailAndPassword(e(), p()); const n = document.getElementById('lgN').value.trim(); if (n) await c.user.updateProfile({ displayName: n }); chiudiFoglio(true); } catch (x) { msg(testoErr(x)); } };
    document.getElementById('lgR').onclick = () => { if (!e()) return msg('Scrivi la tua email'); A.sendPasswordResetEmail(e()).then(() => msg('Ti abbiamo mandato un’email per cambiare la password')).catch((x) => msg(testoErr(x))); };
  };

  // ---------- salvataggio della società ----------
  let saveT = 0;
  O.salvaCloud = function(stato){
    if (!user) return; clearTimeout(saveT);
    saveT = setTimeout(() => {
      D.collection(SAVE).doc(user.uid).set({ app: 'Presidente PM', nome: O.nome(), email: user.email || '', club: stato.club.nome, categoria: TIERS[stato.tier - 1].nome, stagione: stato.stagione, dati: JSON.stringify(stato), aggMs: stato.agg || Date.now(), agg: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => { err = ''; }).catch((e) => { err = testoErr(e); });
    }, 3000);
  };
  async function leggiCloud(){ const s = await D.collection(SAVE).doc(user.uid).get(); if (!s.exists) return null; try { return JSON.parse(s.data().dati); } catch (e) { return null; } }
  async function dopoLogin(){
    avviso('Ciao ' + O.nome() + '!');
    let c = null; try { c = await leggiCloud(); } catch (e) { err = testoErr(e); }
    if (!S){
      if (c && c.club){ S = c; migra(); Suono.on = S.opz.suono; schermo = 'casa'; disegna(); avviso('Ritrovata la tua ' + S.club.nome + '!'); O.riprendi(); }
      else avviso('Non c’è ancora una società salvata: fondane una!');
      return;
    }
    if (c && c.club && c.creato !== S.creato && (c.agg || 0) > (S.agg || 0)){
      foglio(`<h2>Hai un’altra società online</h2><p>Nel tuo account c’è <b>${esc(c.club.nome)}</b> (stagione ${c.stagione}, ${TIERS[c.tier - 1].nome}). Su questo telefono c’è <b>${esc(S.club.nome)}</b>.</p><p>Quale vuoi tenere?</p>
      <div class="riga-btn"><button class="btn" id="cTieni">${esc(c.club.nome)} (online)</button><button class="btn sec" id="cQui">${esc(S.club.nome)} (questo telefono)</button></div>`);
      document.getElementById('cTieni').onclick = () => { S = c; migra(); chiudiFoglio(true); salva(true); disegna(); O.riprendi(); };
      document.getElementById('cQui').onclick = () => { chiudiFoglio(true); O.salvaCloud(S); };
    } else if (c && c.creato === S.creato && (c.agg || 0) > (S.agg || 0) + 2000){ S = c; migra(); salva(true); disegna(); O.riprendi(); }
    else { O.salvaCloud(S); if (S.lega.online) O.riprendi(); }
    if (document.querySelector('.menu-top')) menu();
  }

  // ---------- gironi ----------
  const umaniUid = (d) => d.squadre.filter((s) => s.tipo === 'umano' && s.uid).map((s) => s.uid).concat((d.attesa || []).map((w) => w.uid));
  const libero = (s) => s.tipo === 'bot' || (s.tipo === 'umano' && Date.now() - (s.visto || 0) > INATTIVO);
  const apertoDi = (d) => d.squadre.some(libero) ? d.tier : -1;
  function scrivi(tx, ref, d, nuovo){
    const v = { tier: d.tier, aperto: apertoDi(d), membri: umaniUid(d), dati: JSON.stringify(d), agg: firebase.firestore.FieldValue.serverTimestamp() };
    if (nuovo) tx.set(ref, v); else tx.set(ref, v);
  }
  const pubblico = (sl) => ({ tipo: 'umano', uid: user.uid, nome: sl.nome, c1: sl.c1, c2: sl.c2, st: sl.st, pat: sl.pat, sim: sl.sim, forza: sl.forza, campo: sl.campo, visto: Date.now() });
  const lettere = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  async function entra(tier){
    const me = pubblico(mioSlot());
    // 1) un girone della tua categoria con un bot da sostituire
    const q = await D.collection(COL).where('aperto', '==', tier).limit(10).get();
    const docs = q.docs.sort(() => RND() - 0.5);
    for (const doc of docs){
      const r = await D.runTransaction(async (tx) => {
        const s = await tx.get(doc.ref); if (!s.exists) return null;
        const d = JSON.parse(s.data().dati);
        let i = d.squadre.findIndex((x) => x.uid === user.uid);
        let preso = null;
        if (i < 0){
          const liberi = d.squadre.map((x, k) => libero(x) ? k : -1).filter((k) => k >= 0);
          if (!liberi.length) return null;
          const bot = liberi.filter((k) => d.squadre[k].tipo === 'bot');
          i = (bot.length ? bot : liberi)[Math.floor(RND() * (bot.length || liberi.length))];
          preso = d.squadre[i].nome;
          const st = d.squadre[i];
          d.squadre[i] = Object.assign({}, me, { pt: st.pt, g: st.g, v: st.v, n: st.n, p: st.p, gf: st.gf, gs: st.gs, f: st.f, pronto: -1 });
        }
        scrivi(tx, doc.ref, d);
        return { gid: doc.id, d, i, preso };
      });
      if (r) return r;
    }
    // 2) Serie A piena: la classifica si allunga
    if (tier === TOP){
      const q2 = await D.collection(COL).where('tier', '==', TOP).limit(1).get();
      if (!q2.empty){
        const ref = q2.docs[0].ref;
        return await D.runTransaction(async (tx) => {
          const s = await tx.get(ref); const d = JSON.parse(s.data().dati);
          let i = d.squadre.findIndex((x) => x.uid === user.uid);
          if (i >= 0){ scrivi(tx, ref, d); return { gid: ref.id, d, i }; }
          if (d.giornata === 0){
            d.squadre.push(Object.assign({}, me, statoZero(), { pronto: -1 }));
            if (d.squadre.length % 2) d.squadre.push(nuovoBot(TOP));
            d.n = d.squadre.length; i = d.squadre.findIndex((x) => x.uid === user.uid);
            scrivi(tx, ref, d); return { gid: ref.id, d, i, allunga: true };
          }
          d.attesa = (d.attesa || []).filter((w) => w.uid !== user.uid).concat([me]);
          scrivi(tx, ref, d); return { gid: ref.id, d, i: -1, attesa: true };
        });
      }
    }
    // 3) nessun posto: si crea un nuovo girone (tu + 11 bot)
    const tutti = await D.collection(COL).where('tier', '==', tier).get();
    const d = nuovoGirone(tier, tier === TOP ? 'Serie A' : 'Girone ' + (lettere[tutti.size] || (tutti.size + 1)));
    const i = Math.floor(RND() * d.n);
    d.squadre[i] = Object.assign({}, me, statoZero(), { pronto: -1 });
    const ref = D.collection(COL).doc();
    await D.runTransaction(async (tx) => { scrivi(tx, ref, d, true); });
    return { gid: ref.id, d, i, nuovo: true };
  }

  function applicaIngresso(r){
    S.lega = { online: true, gid: r.gid, dati: r.d, mio: r.i, giocate: r.d.giornata, stagione: r.d.stagione, attesa: !!r.attesa, cambio: 0 };
    const T = TIERS[r.d.tier - 1].nome;
    if (r.attesa) notizia(`La Serie A online è piena: sei in lista d’attesa. Dalla prossima stagione la classifica si allunga!`, '⏳');
    else if (r.allunga) notizia(`La Serie A online era piena di persone vere: la classifica si è allungata a ${r.d.n} squadre!`, '📏');
    else if (r.preso) notizia(`Sei entrato nel girone online ${r.d.nome} di ${T}: hai preso il posto del bot ${r.preso}, con i suoi punti.`, '🌍');
    else notizia(`Hai aperto il girone online ${r.d.nome} di ${T}. Quando entrano altre persone, prendono il posto dei bot.`, '🌍');
    salva(true); ascolta(r.gid); disegna();
  }

  O.vaiOnline = async function(){
    if (!user) return avviso('Prima entra nel tuo account');
    const vecchia = S.lega;
    S.lega = Object.assign({}, vecchia, { cambio: S.tier }); disegna();
    try { applicaIngresso(await entra(S.tier)); avviso('Sei online!'); }
    catch (e){ S.lega = vecchia; err = testoErr(e); disegna(); avviso(err); }
  };
  O.cambiaCategoria = async function(tier){
    S.lega.cambio = tier; disegna();
    if (!user){ return; }
    try { if (unsub) unsub(); unsub = null; applicaIngresso(await entra(tier)); }
    catch (e){ err = testoErr(e); avviso('Non trovo il nuovo girone: riprovo fra poco'); setTimeout(() => S.lega.cambio && O.cambiaCategoria(S.lega.cambio), 15000); }
  };
  O.riprendi = function(){
    if (!S || !S.lega.online) return;
    if (!user){ return; }
    if (S.lega.cambio) return O.cambiaCategoria(S.lega.cambio);
    ascolta(S.lega.gid);
  };

  function ascolta(gid){
    if (unsub && gidAscolto === gid) return;
    if (unsub) unsub();
    gidAscolto = gid;
    unsub = D.collection(COL).doc(gid).onSnapshot((s) => { if (s.exists) quandoCambia(gid, JSON.parse(s.data().dati)); }, (e) => { err = testoErr(e); });
  }
  function quandoCambia(gid, d){
    const L = S && S.lega; if (!L || !L.online || L.gid !== gid || L.cambio) return;
    const i = d.squadre.findIndex((x) => x.uid === user.uid);
    if (L.attesa){
      if (i >= 0){ L.attesa = false; L.mio = i; L.stagione = d.stagione; L.giocate = d.giornata; notizia('Sei entrato in Serie A: la classifica si è allungata!', '🎉'); }
      L.dati = d; salva(); ridisegna(); return;
    }
    const nuovaStagione = d.stagione > L.stagione;
    L.dati = d;
    const live = liveT && Date.now() - liveT < 30000;
    const primaG = L.giocate, primaS = L.stagione;
    sincronizza(live);
    if (L.giocate !== primaG || L.stagione !== primaS) liveT = 0;
    if (L.cambio) return; // è salito o sceso: sta già cercando il nuovo girone
    if (i < 0){
      notizia('Non giocavi da tanto e un altro presidente ha preso il tuo posto. Ti cerchiamo un nuovo girone.', '🔁');
      O.cambiaCategoria(S.tier); return;
    }
    if (!nuovaStagione) L.mio = i; else L.mio = i;
    if (L.giocate === primaG && L.stagione === primaS) ridisegna();
  }
  function ridisegna(){ if (document.querySelector('.fonda')) return; disegna(); }

  O.pronto = async function(sl){
    const ref = D.collection(COL).doc(S.lega.gid);
    liveT = Date.now();
    const r = await D.runTransaction(async (tx) => {
      const s = await tx.get(ref); const d = JSON.parse(s.data().dati);
      const i = d.squadre.findIndex((x) => x.uid === user.uid);
      if (i < 0) throw new Error('Non sei più in questo girone');
      Object.assign(d.squadre[i], pubblico(sl), { pronto: d.giornata });
      const altri = d.squadre.filter((x) => x.tipo === 'umano' && x.uid !== user.uid && Date.now() - (x.visto || 0) < INATTIVO);
      if (d.scadG !== d.giornata){ d.scadG = d.giornata; d.scad = Date.now() + ATTESA_MAX; }
      const tutti = altri.every((x) => x.pronto === d.giornata);
      let giocata = false;
      if (tutti || Date.now() >= d.scad){ giocaGiornataDati(d); giocata = true; }
      scrivi(tx, ref, d);
      return { giocata };
    });
    if (!r.giocata) liveT = 0;
    return r;
  };
  let aggT = 0;
  O.aggiornaSquadra = function(sl){
    if (!user || !S.lega.online || S.lega.attesa) return; clearTimeout(aggT);
    aggT = setTimeout(() => {
      const ref = D.collection(COL).doc(S.lega.gid);
      D.runTransaction(async (tx) => { const s = await tx.get(ref); const d = JSON.parse(s.data().dati); const i = d.squadre.findIndex((x) => x.uid === user.uid); if (i < 0) return; const p = d.squadre[i].pronto; Object.assign(d.squadre[i], pubblico(sl), { pronto: p }); scrivi(tx, ref, d); }).catch((e) => { err = testoErr(e); });
    }, 2500);
  };
  O.esci = async function(){
    if (!user || !S.lega.gid) return;
    const ref = D.collection(COL).doc(S.lega.gid);
    if (unsub) unsub(); unsub = null; gidAscolto = null;
    await D.runTransaction(async (tx) => {
      const s = await tx.get(ref); if (!s.exists) return; const d = JSON.parse(s.data().dati);
      const i = d.squadre.findIndex((x) => x.uid === user.uid);
      if (i >= 0){ const st = d.squadre[i]; d.squadre[i] = Object.assign(nuovoBot(d.tier), { pt: st.pt, g: st.g, v: st.v, n: st.n, p: st.p, gf: st.gf, gs: st.gs, f: st.f }); }
      d.attesa = (d.attesa || []).filter((w) => w.uid !== user.uid);
      scrivi(tx, ref, d);
    });
  };
  return O;
})();
