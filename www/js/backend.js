/* Masala Mela — backend: login, cloud save, live config, stats, inbox, leaderboard, admin.
 *
 * Two modes behind one interface:
 *  - "firebase": production. Fill www/js/firebase-config.js with your Firebase
 *    project keys; Auth (phone OTP / Google / guest), Firestore and the admin
 *    panel then run on Firebase. Security rules are in firebase/firestore.rules.
 *  - "local": demo mode used automatically when no Firebase keys are set.
 *    Everything is stored in this browser so login and the admin panel can be
 *    tried without a server. OTP in demo mode is always 123456.
 * (c) Deific Digital */
(function (G) {
  'use strict';
  const DAY = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const B = { mode: 'local', user: null, ready: false, listeners: [] };
  const emit = () => B.listeners.forEach(f => f(B.user));
  B.onAuth = f => B.listeners.push(f);

  // =================== LOCAL DEMO MODE ===================
  const LKEY = 'mm_backend_db_v1', SKEY = 'mm_session_v1';
  const L = {
    db() { try { return Object.assign({ users: {}, stats: {}, messages: [], config: null, admins: { 'admin@deificdigital.com': 'mela@2026' } }, JSON.parse(localStorage.getItem(LKEY) || '{}')); } catch (e) { return { users: {}, stats: {}, messages: [], config: null, admins: {} }; } },
    put(db) { try { localStorage.setItem(LKEY, JSON.stringify(db)); } catch (e) { /* storage full */ } },
    uid() { return 'u_' + Math.random().toString(36).slice(2, 10); },
    session(uid) { try { if (uid === null) localStorage.removeItem(SKEY); else if (uid) localStorage.setItem(SKEY, uid); return localStorage.getItem(SKEY); } catch (e) { return null; } }
  };
  L.createUser = function (fields) {
    const db = L.db();
    let u = fields.phone ? Object.values(db.users).find(x => x.phone === fields.phone) : fields.email ? Object.values(db.users).find(x => x.email === fields.email) : null;
    const isNew = !u;
    if (!u) { u = Object.assign({ uid: L.uid(), createdAt: Date.now(), level: 1, stars: 0, coins: 0, spentInr: 0, purchases: 0, banned: false, claimed: [] }, fields); db.users[u.uid] = u; }
    u.lastSeen = Date.now(); db.users[u.uid] = u; L.put(db); L.session(u.uid);
    return { user: u, isNew };
  };

  // =================== FIREBASE MODE ===================
  let fb = null, fs = null, fauth = null, phoneConfirm = null;
  function fbAvailable() { const c = G.MM_FIREBASE_CONFIG; return !!(c && c.apiKey && !/YOUR_/.test(c.apiKey) && G.firebase); }
  function userFromFb(u, extra) { return u ? Object.assign({ uid: u.uid, name: u.displayName || (extra && extra.name) || 'Khiladi', phone: u.phoneNumber || null, email: u.email || null, provider: u.isAnonymous ? 'guest' : (u.providerData[0] && u.providerData[0].providerId) || 'firebase' }, extra || {}) : null; }

  // =================== PUBLIC API ===================
  B.init = async function () {
    if (fbAvailable()) {
      B.mode = 'firebase';
      fb = G.firebase.initializeApp(G.MM_FIREBASE_CONFIG); fs = G.firebase.firestore(); fauth = G.firebase.auth();
      await new Promise(res => { const off = fauth.onAuthStateChanged(async u => { off(); if (u) { const snap = await fs.collection('users').doc(u.uid).get().catch(() => null); B.user = userFromFb(u, snap && snap.exists ? snap.data() : {}); } res(); }); });
      try { const c = await fs.doc('config/live').get(); if (c.exists) G.MM_CONFIG.apply(c.data()); } catch (e) { /* offline: keep cached config */ }
    } else {
      B.mode = 'local';
      const db = L.db();
      if (db.config) G.MM_CONFIG.apply(db.config);
      const uid = L.session();
      if (uid && db.users[uid]) B.user = db.users[uid];
    }
    B.ready = true; emit();
    return B.user;
  };

  B.signInGuest = async function (name) {
    name = (name || 'Khiladi').slice(0, 18);
    if (B.mode === 'firebase') {
      const cred = await fauth.signInAnonymously(); await cred.user.updateProfile({ displayName: name });
      B.user = userFromFb(cred.user, { name }); await B._ensureDoc(true);
    } else { const r = L.createUser({ name, provider: 'guest' }); B.user = r.user; B._isNew = r.isNew; }
    B.track('newUsers'); emit(); return B.user;
  };

  B.phoneStart = async function (phone) {
    phone = phone.replace(/\s+/g, ''); if (!/^\+?\d{10,13}$/.test(phone)) throw new Error('Sahi mobile number daalein');
    if (!phone.startsWith('+')) phone = '+91' + phone.slice(-10);
    B._phone = phone;
    if (B.mode === 'firebase') {
      const native = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.FirebaseAuthentication;
      if (native) { // native OTP via @capacitor-firebase/authentication
        return new Promise((res, rej) => {
          native.addListener('phoneCodeSent', e => { B._verificationId = e.verificationId; res({ sent: true }); });
          native.addListener('phoneVerificationFailed', e => rej(new Error(e.message)));
          native.signInWithPhoneNumber({ phoneNumber: phone });
        });
      }
      if (!B._recaptcha) B._recaptcha = new G.firebase.auth.RecaptchaVerifier('recaptcha-box', { size: 'invisible' });
      phoneConfirm = await fauth.signInWithPhoneNumber(phone, B._recaptcha);
      return { sent: true };
    }
    return { sent: true, demoCode: '123456' };
  };

  B.phoneVerify = async function (code, name) {
    if (B.mode === 'firebase') {
      let user;
      if (B._verificationId) { const cred = G.firebase.auth.PhoneAuthProvider.credential(B._verificationId, code); user = (await fauth.signInWithCredential(cred)).user; }
      else user = (await phoneConfirm.confirm(code)).user;
      if (name && !user.displayName) await user.updateProfile({ displayName: name });
      B.user = userFromFb(user, { name: name || user.displayName }); const isNew = await B._ensureDoc(); if (isNew) B.track('newUsers');
    } else {
      if (code !== '123456') throw new Error('Galat OTP. Demo mein OTP 123456 hai.');
      const r = L.createUser({ name: name || 'Khiladi', phone: B._phone, provider: 'phone' }); B.user = r.user; B._isNew = r.isNew; if (r.isNew) B.track('newUsers');
    }
    emit(); return B.user;
  };

  B.signInGoogle = async function () {
    if (B.mode === 'firebase') {
      const native = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.FirebaseAuthentication;
      let user;
      if (native) { const r = await native.signInWithGoogle(); const cred = G.firebase.auth.GoogleAuthProvider.credential(r.credential.idToken); user = (await fauth.signInWithCredential(cred)).user; }
      else user = (await fauth.signInWithPopup(new G.firebase.auth.GoogleAuthProvider())).user;
      B.user = userFromFb(user); const isNew = await B._ensureDoc(); if (isNew) B.track('newUsers');
    } else {
      const r = L.createUser({ name: 'Google Player', email: 'player@gmail.com', provider: 'google' }); B.user = r.user; B._isNew = r.isNew; if (r.isNew) B.track('newUsers');
    }
    emit(); return B.user;
  };

  B.signOut = async function () {
    if (B.mode === 'firebase') await fauth.signOut(); else L.session(null);
    B.user = null; emit();
  };

  B.deleteAccount = async function () {
    if (!B.user) return;
    const uid = B.user.uid;
    if (B.mode === 'firebase') {
      await fs.collection('leaderboard').doc(uid).delete().catch(() => {});
      await fs.collection('users').doc(uid).delete().catch(() => {});
      try { await fauth.currentUser.delete(); } catch (e) { await fauth.signOut(); }
    } else { const db = L.db(); delete db.users[uid]; L.put(db); L.session(null); }
    B.user = null; emit();
  };

  B._ensureDoc = async function () {
    const ref = fs.collection('users').doc(B.user.uid);
    const snap = await ref.get();
    const isNew = !snap.exists;
    if (isNew) await ref.set({ name: B.user.name, phone: B.user.phone, email: B.user.email, provider: B.user.provider, createdAt: Date.now(), lastSeen: Date.now(), level: 1, stars: 0, coins: 0, spentInr: 0, purchases: 0, banned: false, claimed: [] });
    else Object.assign(B.user, snap.data());
    return isNew;
  };

  // ---- progress (cloud save) ----
  let saveTimer = null;
  B.saveProgress = function (data) {
    if (!B.user) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const summary = { name: data.name, level: data.level, stars: Object.values(data.stars || {}).reduce((a, b) => a + b, 0), coins: data.coins, lastSeen: Date.now(), progress: JSON.stringify(data) };
      if (B.mode === 'firebase') {
        fs.collection('users').doc(B.user.uid).set(summary, { merge: true }).catch(() => {});
        fs.collection('leaderboard').doc(B.user.uid).set({ name: summary.name, stars: summary.stars, level: summary.level, ts: Date.now() }).catch(() => {});
      }
      else { const db = L.db(); if (db.users[B.user.uid]) { Object.assign(db.users[B.user.uid], summary); L.put(db); } }
    }, 1500);
  };
  B.loadProgress = async function () {
    if (!B.user) return null;
    let p = null;
    if (B.mode === 'firebase') { const s = await fs.collection('users').doc(B.user.uid).get().catch(() => null); p = s && s.exists && s.data().progress; Object.assign(B.user, s && s.exists ? s.data() : {}); }
    else { const u = L.db().users[B.user.uid]; p = u && u.progress; if (u) Object.assign(B.user, u); }
    try { return p ? JSON.parse(p) : null; } catch (e) { return null; }
  };
  B.userFlags = function () { return B.user ? { banned: !!B.user.banned, resetAt: B.user.resetAt || 0 } : {}; };

  // ---- stats (daily counters for the admin dashboard) ----
  B.track = function (field, n, extra) {
    n = n || 1; const day = DAY();
    if (B.mode === 'firebase') {
      const inc = G.firebase.firestore.FieldValue.increment;
      const upd = { [field]: inc(n), day };
      if (extra && extra.inr) upd.revenueInr = inc(extra.inr);
      fs.doc('stats/' + day).set(upd, { merge: true }).catch(() => {});
    } else {
      const db = L.db(); const s = db.stats[day] = db.stats[day] || { day };
      s[field] = (s[field] || 0) + n; if (extra && extra.inr) s.revenueInr = (s.revenueInr || 0) + extra.inr;
      L.put(db);
    }
  };
  B.markActive = function () {
    const day = DAY(); let last = null; try { last = localStorage.getItem('mm_active_day'); } catch (e) { /* */ }
    if (last !== day) { B.track('dau'); try { localStorage.setItem('mm_active_day', day); } catch (e) { /* */ } }
  };
  B.recordPurchase = function (product, inr) {
    B.track('iapCount', 1, { inr });
    if (!B.user) return;
    if (B.mode === 'firebase') { const inc = G.firebase.firestore.FieldValue.increment; fs.collection('users').doc(B.user.uid).set({ spentInr: inc(inr), purchases: inc(1) }, { merge: true }).catch(() => {}); }
    else { const db = L.db(); const u = db.users[B.user.uid]; if (u) { u.spentInr = (u.spentInr || 0) + inr; u.purchases = (u.purchases || 0) + 1; L.put(db); } }
  };

  // ---- inbox (gifts and messages from the admin panel) ----
  B.inbox = async function () {
    if (!B.user) return [];
    const claimed = new Set(B.user.claimed || []);
    let list = [];
    if (B.mode === 'firebase') {
      const q = await fs.collection('messages').where('to', 'in', ['all', B.user.uid]).orderBy('ts', 'desc').limit(20).get().catch(() => null);
      if (q) list = q.docs.map(d => Object.assign({ id: d.id }, d.data()));
    } else list = L.db().messages.filter(m => m.to === 'all' || m.to === B.user.uid).sort((a, b) => b.ts - a.ts).slice(0, 20);
    return list.filter(m => !claimed.has(m.id) && (!m.expires || m.expires > Date.now()));
  };
  B.claim = async function (msg) {
    B.user.claimed = (B.user.claimed || []).concat(msg.id);
    if (B.mode === 'firebase') await fs.collection('users').doc(B.user.uid).set({ claimed: G.firebase.firestore.FieldValue.arrayUnion(msg.id) }, { merge: true }).catch(() => {});
    else { const db = L.db(); const u = db.users[B.user.uid]; if (u) { u.claimed = B.user.claimed; L.put(db); } }
  };

  // ---- leaderboard ----
  B.leaderboard = async function () {
    if (B.mode === 'firebase') {
      const q = await fs.collection('leaderboard').orderBy('stars', 'desc').limit(20).get().catch(() => null);
      return q ? q.docs.map(d => Object.assign({ uid: d.id }, d.data())) : [];
    }
    return Object.values(L.db().users).filter(u => !u.banned).sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 20);
  };

  // =================== ADMIN ===================
  const A = B.admin = { email: null };
  A.login = async function (email, pass) {
    if (B.mode === 'firebase') {
      const cred = await fauth.signInWithEmailAndPassword(email, pass);
      const tok = await cred.user.getIdTokenResult(true);
      if (!tok.claims.admin) { await fauth.signOut(); throw new Error('Is account ko admin access nahi hai.'); }
      A.email = email; return true;
    }
    const db = L.db();
    if (db.admins[email] && db.admins[email] === pass) { A.email = email; return true; }
    throw new Error('Email ya password galat hai.');
  };
  A.logout = async function () { A.email = null; if (B.mode === 'firebase') await fauth.signOut(); };
  A.users = async function () {
    if (B.mode === 'firebase') { const q = await fs.collection('users').orderBy('lastSeen', 'desc').limit(500).get(); return q.docs.map(d => Object.assign({ uid: d.id }, d.data())); }
    return Object.values(L.db().users).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  };
  A.updateUser = async function (uid, patch) {
    if (B.mode === 'firebase') return fs.collection('users').doc(uid).set(patch, { merge: true });
    const db = L.db(); if (db.users[uid]) { Object.assign(db.users[uid], patch); L.put(db); }
  };
  A.stats = async function (days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); }
    if (B.mode === 'firebase') { const snaps = await Promise.all(out.map(d => fs.doc('stats/' + d).get().catch(() => null))); return out.map((d, i) => Object.assign({ day: d }, snaps[i] && snaps[i].exists ? snaps[i].data() : {})); }
    const db = L.db(); return out.map(d => Object.assign({ day: d }, db.stats[d] || {}));
  };
  A.getConfig = async function () {
    if (B.mode === 'firebase') { const c = await fs.doc('config/live').get(); return c.exists ? c.data() : {}; }
    return L.db().config || {};
  };
  A.setConfig = async function (remote) {
    remote.version = (remote.version || 1) + 1; remote.updatedAt = Date.now(); remote.updatedBy = A.email;
    if (B.mode === 'firebase') await fs.doc('config/live').set(remote);
    else { const db = L.db(); db.config = remote; L.put(db); }
    G.MM_CONFIG.apply(remote);
    return remote;
  };
  A.sendMessage = async function (msg) {
    msg = Object.assign({ ts: Date.now(), from: A.email }, msg);
    if (B.mode === 'firebase') return fs.collection('messages').add(msg);
    const db = L.db(); msg.id = 'm_' + Math.random().toString(36).slice(2, 9); db.messages.push(msg); L.put(db);
  };
  A.messages = async function () {
    if (B.mode === 'firebase') { const q = await fs.collection('messages').orderBy('ts', 'desc').limit(50).get(); return q.docs.map(d => Object.assign({ id: d.id }, d.data())); }
    return L.db().messages.slice().sort((a, b) => b.ts - a.ts);
  };
  A.deleteMessage = async function (id) {
    if (B.mode === 'firebase') return fs.collection('messages').doc(id).delete();
    const db = L.db(); db.messages = db.messages.filter(m => m.id !== id); L.put(db);
  };
  // Demo-only: fill the local store with clearly-labelled sample players and stats
  A.seedDemo = function () {
    if (B.mode !== 'local') return;
    const db = L.db(); const names = ['Riya', 'Aman', 'Priya', 'Kabir', 'Sana', 'Vikram', 'Neha', 'Arjun', 'Pooja', 'Rohit', 'Isha', 'Dev', 'Meera', 'Yash', 'Tanvi', 'Karan', 'Anjali', 'Sahil', 'Nidhi', 'Farhan', 'Kavya', 'Rahul', 'Simran', 'Aditya'];
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    names.forEach((n, i) => {
      const uid = 'demo_' + i, level = Math.max(1, Math.round(Math.pow(r(), 1.6) * 120));
      db.users[uid] = { uid, demo: true, name: n + ' (demo)', phone: '+9198' + String(10000000 + Math.floor(r() * 89999999)), provider: ['phone', 'google', 'guest'][i % 3], createdAt: Date.now() - Math.floor(r() * 30) * 864e5, lastSeen: Date.now() - Math.floor(r() * 72) * 36e5, level, stars: Math.round(level * (1.6 + r())), coins: Math.round(200 + r() * 4000), spentInr: r() < 0.12 ? [29, 79, 149, 199][Math.floor(r() * 4)] : 0, purchases: 0, banned: false, claimed: [] };
    });
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 864e5); const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const growth = 1 + (29 - i) * 0.06, dau = Math.round((380 + r() * 90) * growth);
      const s = db.stats[day] || { day };
      Object.assign(s, { demo: true, dau: (s.dau || 0) + dau, newUsers: (s.newUsers || 0) + Math.round(dau * (0.18 + r() * 0.08)), levelsPlayed: Math.round(dau * 6.5), levelsWon: Math.round(dau * 4.1), adsRewarded: Math.round(dau * 0.9), adsInterstitial: Math.round(dau * 1.3), iapCount: Math.round(dau * 0.006 + r() * 2), revenueInr: Math.round(dau * 0.006 * 120 + r() * 300), spins: Math.round(dau * 0.7) });
      db.stats[day] = s;
    }
    L.put(db);
  };
  A.clearDemo = function () {
    if (B.mode !== 'local') return;
    const db = L.db(); Object.keys(db.users).forEach(k => { if (db.users[k].demo) delete db.users[k]; });
    Object.keys(db.stats).forEach(k => { if (db.stats[k].demo) delete db.stats[k]; }); L.put(db);
  };

  G.MM_BACKEND = B;
})(window);
