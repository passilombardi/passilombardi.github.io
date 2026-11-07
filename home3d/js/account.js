/* =========================================================
   ACCOUNT: lo stesso account del Gioco della Vita PM (Firebase gioco-della-vita-pm).
   Le case si salvano online in home3d/{uid}, così si ritrovano su ogni dispositivo
   e si vedono nell'app account.
   ========================================================= */
const CFG = { apiKey: 'AIzaSyBJRUlGK_ArYn2K_pJ0ePChTUC3gkikwgY', authDomain: 'gioco-della-vita-pm.firebaseapp.com', projectId: 'gioco-della-vita-pm', storageBucket: 'gioco-della-vita-pm.firebasestorage.app', messagingSenderId: '83815479634', appId: '1:83815479634:web:86220d0844b898c5e1628b' };
const ERR = {
  'auth/invalid-email': "L'email non è scritta bene",
  'auth/missing-password': 'Scrivi la password',
  'auth/weak-password': 'La password deve avere almeno 6 caratteri',
  'auth/email-already-in-use': "C'è già un account con questa email: usa «Entra»",
  'auth/invalid-credential': 'Email o password sbagliate',
  'auth/invalid-login-credentials': 'Email o password sbagliate',
  'auth/wrong-password': 'Password sbagliata',
  'auth/user-not-found': "Non c'è nessun account con questa email",
  'auth/too-many-requests': "Troppi tentativi: aspetta un po' e riprova",
  'auth/popup-closed-by-user': 'Hai chiuso la finestra di Google',
  'auth/cancelled-popup-request': 'Hai chiuso la finestra di Google',
  'auth/network-request-failed': 'Niente internet: riprova',
  'auth/unauthorized-domain': 'Questo sito non è ancora autorizzato in Firebase: per ora entra con email e password',
  'auth/operation-not-allowed': 'Questo tipo di accesso non è ancora attivo',
  'auth/requires-recent-login': 'Per sicurezza esci, rientra e riprova',
  'permission-denied': 'Il salvataggio online non è ancora attivo (regole Firebase)'
};
export const errText = (e) => ERR[e && e.code] || (e && e.message) || 'Qualcosa non ha funzionato';

let A = null, D = null, ready = false;
export const acc = { user: null, status: 'off', last: 0, error: '' };
const listeners = [];
export function onAccount(fn){ listeners.push(fn); }
const emit = () => listeners.forEach((f) => { try { f(acc); } catch (e) { console.error(e); } });

export function accountAvailable(){ return typeof window.firebase !== 'undefined'; }

export function initAccount(){
  if (!accountAvailable()) return Promise.resolve(null);
  try {
    if (!firebase.apps.length) firebase.initializeApp(CFG);
    A = firebase.auth(); D = firebase.firestore();
  } catch (e){ console.warn('firebase', e); return Promise.resolve(null); }
  return new Promise((res) => {
    let first = true;
    A.getRedirectResult().catch((e) => { acc.error = errText(e); emit(); });
    A.onAuthStateChanged((u) => {
      acc.user = u; ready = true;
      if (first){ first = false; res(u); }
      emit();
    });
  });
}

export function signInGoogle(){
  const p = new firebase.auth.GoogleAuthProvider();
  return A.signInWithPopup(p).catch((e) => {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(p);
    throw e;
  });
}
export function signInEmail(email, pw){ return A.signInWithEmailAndPassword(email.trim(), pw); }
export async function register(name, email, pw){
  const c = await A.createUserWithEmailAndPassword(email.trim(), pw);
  if (name) { try { await c.user.updateProfile({ displayName: name.trim() }); } catch (e) { /* non grave */ } }
  return c.user;
}
export function resetPassword(email){ return A.sendPasswordResetEmail(email.trim()); }
export function signOut(){ return A ? A.signOut() : Promise.resolve(); }
export function displayName(u = acc.user){ if (!u) return ''; return u.displayName || (u.email ? u.email.split('@')[0] : 'Account'); }

function summary(DB){
  let nr = 0, ni = 0;
  const case_ = DB.houses.map((h) => { const items = h.rooms.reduce((a, r) => a + r.items.length, 0); nr += h.rooms.length; ni += items; return { id: h.id, nome: h.name, stanze: h.rooms.length, oggetti: items, upd: h.upd || 0 }; });
  return { case: case_.slice(0, 60), nCase: DB.houses.length, nStanze: nr, nOggetti: ni };
}

// legge le case salvate online (null se non ce ne sono ancora)
export async function cloudLoad(){
  if (!acc.user || !D) return null;
  const s = await D.collection('home3d').doc(acc.user.uid).get();
  if (!s.exists) return null;
  const d = s.data();
  let dati = null; try { dati = JSON.parse(d.dati || 'null'); } catch (e) { dati = null; }
  return dati ? { dati, ms: d.aggMs || 0 } : null;
}

let saveT = 0, saving = null;
export function cloudSaveSoon(DB, ms = 2500){ if (!acc.user || !D) return; clearTimeout(saveT); saveT = setTimeout(() => cloudSave(DB), ms); }
export async function cloudSave(DB){
  if (!acc.user || !D) return false;
  clearTimeout(saveT);
  const u = acc.user;
  const dati = JSON.stringify({ v: 1, houses: DB.houses, favs: DB.favs, settings: DB.settings });
  if (dati.length > 950000){ acc.status = 'big'; acc.error = 'Le case sono troppo grandi per il salvataggio online: elimina qualche progetto'; emit(); return false; }
  acc.status = 'saving'; emit();
  const now = Date.now();
  try {
    saving = D.collection('home3d').doc(u.uid).set(Object.assign({
      app: 'Home 3D Design PM', nome: displayName(u), email: u.email || '', accesso: (u.providerData[0] && u.providerData[0].providerId === 'google.com') ? 'Google' : 'Email',
      dati, aggMs: now, agg: firebase.firestore.FieldValue.serverTimestamp()
    }, summary(DB)));
    await saving;
    acc.status = 'ok'; acc.last = now; acc.error = '';
    DB.cloud = { uid: u.uid, ms: now };
    emit(); return true;
  } catch (e){
    acc.status = 'err'; acc.error = errText(e); emit(); return false;
  } finally { saving = null; }
}
