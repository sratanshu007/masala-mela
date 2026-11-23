/* Masala Mela — login, daily missions, Kismat ka Chakra (spin wheel), free chest,
 * star chest, win streak, leaderboard, inbox, announcements, maintenance.
 * Uses helpers exposed by ui.js (MM_UI.modal, toast, refreshTop …). (c) Deific Digital */
(function (G) {
  'use strict';
  const F = {};
  const CFG = () => G.MM_CONFIG.get();
  const S = () => G.MM_SAVE, B = () => G.MM_BACKEND, UI = () => G.MM_UI, AU = () => G.MM_AUDIO, M = () => G.MM_MONETIZE;
  const IC = n => G.MM_ICON(n);
  const $ = s => document.querySelector(s);
  const T = (hi, en) => UI().T(hi, en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- rewards ----------
  F.giveReward = function (r, mult) {
    mult = mult || 1; const d = S().data, parts = [];
    if (r.coins) { d.coins += r.coins * mult; parts.push((r.coins * mult) + ' coins'); }
    if (r.booster) { d.boosters[r.booster] = (d.boosters[r.booster] || 0) + (r.n || 1) * mult; parts.push('+' + (r.n || 1) * mult + ' ' + (UI().BOOSTERS[r.booster] || { name: r.booster }).name); }
    if (r.boosters) Object.entries(r.boosters).forEach(([k, n]) => { if (n) { d.boosters[k] = (d.boosters[k] || 0) + n * mult; parts.push('+' + n * mult + ' ' + (UI().BOOSTERS[k] || { name: k }).name); } });
    if (r.lives) { S().addLives(r.lives * mult); parts.push('+' + r.lives * mult + ' life'); }
    S().save(); UI().refreshTop();
    return parts.join(', ');
  };

  // =================== LOGIN ===================
  F.loginScreen = function () {
    return new Promise(resolve => {
      const scr = $('#login'); scr.classList.add('on');
      if (G.MM_SCENES) G.MM_SCENES.start($('#loginfx'), G.MM_DATA.WORLDS[0]);
      $('#loginChars').innerHTML = `<div class="lc lc1">${G.MM_CHARS('meethi')}</div><div class="lc lc2">${G.MM_CHARS('dabbu', 'happy')}</div>`;
      const box = $('#loginBox');
      const demo = B().mode === 'local';
      const done = async (u) => { if (G.MM_SCENES) G.MM_SCENES.stop(); scr.classList.remove('on'); resolve(u); };
      const err = (e) => { const el = box.querySelector('.err'); if (el) el.textContent = e.message || String(e); AU().play('bad'); };
      const busy = (btn, on) => { if (btn) { btn.disabled = on; btn.classList.toggle('loading', on); } };

      function start() {
        box.innerHTML = `<h2>${T('Swagat hai!', 'Welcome!')}</h2>
          <p class="sub">${T('Login karke apna progress har phone par surakshit rakho.', 'Log in to keep your progress safe on every phone.')}</p>
          <button class="lbtn phone" data-phone>${IC('phone')}<span>${T('Mobile number se login', 'Continue with mobile number')}</span></button>
          <button class="lbtn google" data-google>${IC('google')}<span>${T('Google se login', 'Continue with Google')}</span></button>
          <button class="lbtn guest" data-guest>${T('Guest ke roop mein khelo', 'Play as guest')}</button>
          <p class="err"></p>
          <p class="fine">${T('Aage badhkar aap', 'By continuing you accept the')} <a href="terms.html" target="_blank">Terms</a> ${T('aur', 'and')} <a href="privacy.html" target="_blank">Privacy Policy</a> ${T('maante hain.', '.')}</p>
          ${demo ? `<p class="demo">${T('Demo mode: Firebase abhi set nahi hai. OTP hamesha 123456.', 'Demo mode: Firebase not set up yet. OTP is always 123456.')}</p>` : ''}`;
        box.querySelector('[data-phone]').onclick = phoneStep;
        box.querySelector('[data-google]').onclick = async e => { busy(e.currentTarget, true); try { done(await B().signInGoogle()); } catch (x) { busy(e.currentTarget, false); err(x); } };
        box.querySelector('[data-guest]').onclick = guestStep;
      }
      function phoneStep() {
        box.innerHTML = `<h2>${T('Mobile number', 'Mobile number')}</h2>
          <p class="sub">${T('Hum aapko 6 ankon ka OTP bhejenge.', 'We will send you a 6-digit OTP.')}</p>
          <div class="field"><span class="cc">+91</span><input id="lgPhone" type="tel" inputmode="numeric" maxlength="10" placeholder="98765 43210" autocomplete="tel-national"></div>
          <div class="field"><input id="lgName" type="text" maxlength="18" placeholder="${T('Aapka naam', 'Your name')}" autocomplete="nickname"></div>
          <button class="btn big" data-send>${T('OTP bhejo', 'Send OTP')}</button>
          <p class="err"></p><button class="link" data-back>‹ ${T('Wapas', 'Back')}</button>`;
        box.querySelector('#lgPhone').focus();
        box.querySelector('[data-back]').onclick = start;
        box.querySelector('[data-send]').onclick = async e => {
          const phone = box.querySelector('#lgPhone').value.replace(/\D/g, ''), name = box.querySelector('#lgName').value.trim();
          if (phone.length !== 10) { err(new Error(T('10 ankon ka mobile number daalein', 'Enter a 10-digit mobile number'))); return; }
          busy(e.currentTarget, true);
          try { const r = await B().phoneStart('+91' + phone); otpStep(phone, name, r); } catch (x) { busy(e.currentTarget, false); err(x); }
        };
      }
      function otpStep(phone, name, r) {
        box.innerHTML = `<h2>OTP ${T('daalein', '')}</h2>
          <p class="sub">${T('OTP bheja gaya', 'OTP sent to')} +91 ${esc(phone)}</p>
          <div class="otp">${[0, 1, 2, 3, 4, 5].map(i => `<input inputmode="numeric" maxlength="1" data-i="${i}" aria-label="digit ${i + 1}">`).join('')}</div>
          ${r.demoCode ? `<p class="demo">Demo OTP: <b>${r.demoCode}</b></p>` : ''}
          <button class="btn big" data-verify>${T('Login karo', 'Verify')}</button>
          <p class="err"></p><button class="link" data-back>‹ ${T('Number badlo', 'Change number')}</button>`;
        const ins = [...box.querySelectorAll('.otp input')];
        ins[0].focus();
        ins.forEach((inp, i) => {
          inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every(x => x.value)) box.querySelector('[data-verify]').click(); };
          inp.onkeydown = e => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); };
          inp.onpaste = e => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t.length === 6) { e.preventDefault(); t.split('').forEach((c, k) => { ins[k].value = c; }); box.querySelector('[data-verify]').click(); } };
        });
        box.querySelector('[data-back]').onclick = phoneStep;
        box.querySelector('[data-verify]').onclick = async e => {
          const code = ins.map(x => x.value).join(''); if (code.length !== 6) return;
          busy(e.currentTarget, true);
          try { done(await B().phoneVerify(code, name)); } catch (x) { busy(e.currentTarget, false); err(x); ins.forEach(x => { x.value = ''; }); ins[0].focus(); }
        };
      }
      function guestStep() {
        box.innerHTML = `<h2>${T('Aapka naam?', 'Your name?')}</h2>
          <p class="sub">${T('Guest progress sirf is phone par rahega. Baad mein login kar sakte ho.', 'Guest progress stays on this phone. You can log in later.')}</p>
          <div class="field"><input id="lgGuest" type="text" maxlength="18" placeholder="Khiladi" value="${esc(S().data.name !== 'Khiladi' ? S().data.name : '')}"></div>
          <button class="btn big" data-go>${T('Shuru karo', 'Start')}</button><p class="err"></p><button class="link" data-back>‹ ${T('Wapas', 'Back')}</button>`;
        box.querySelector('#lgGuest').focus();
        box.querySelector('[data-back]').onclick = start;
        box.querySelector('[data-go]').onclick = async e => { busy(e.currentTarget, true); try { done(await B().signInGuest(box.querySelector('#lgGuest').value.trim() || 'Khiladi')); } catch (x) { busy(e.currentTarget, false); err(x); } };
      }
      start();
    });
  };

  // after login: merge cloud progress, new-account bonus, ban / reset checks
  F.afterLogin = async function (user) {
    const d = S().data;
    if (user.name && (d.name === 'Khiladi' || !d.name)) d.name = user.name;
    const flags = B().userFlags();
    if (flags.banned) return 'banned';
    const cloud = await B().loadProgress();
    if (flags.resetAt && (!d.resetSeen || d.resetSeen < flags.resetAt)) { S().reset(); S().data.resetSeen = flags.resetAt; S().data.name = user.name || 'Khiladi'; }
    else if (cloud && (cloud.level || 1) > (d.level || 1)) { S().replace(cloud); }
    if (B()._isNew || (user.createdAt && Date.now() - user.createdAt < 60000 && !d.welcomeBonus)) {
      if (!d.welcomeBonus) { d.welcomeBonus = 1; d.coins += CFG().economy.newAccountBonus; }
    }
    S().save();
    B().markActive();
    return 'ok';
  };

  F.blockScreen = function (title, text) {
    const scr = $('#login'); scr.classList.add('on');
    $('#loginBox').innerHTML = `<h2>${esc(title)}</h2><p class="sub">${esc(text)}</p><p class="fine">Support: hello@deificdigital.com</p>`;
  };

  // =================== DAILY MISSIONS ===================
  function seedRand(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
  F.missions = function () {
    const d = S().data, day = S().today(), cfg = CFG().missions;
    if (!cfg.on) return null;
    if (!d.missions || d.missions.day !== day) {
      const r = seedRand(day + (B().user ? B().user.uid : 'x'));
      const pool = cfg.pool.slice(); const pick = [];
      while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
      d.missions = { day, list: pick, prog: {}, claimed: {}, bonusClaimed: false };
      S().save();
    }
    return d.missions;
  };
  F.track = function (stat, n) {
    const m = F.missions(); if (!m) return;
    const cfg = CFG().missions.pool;
    let changed = false;
    m.list.forEach(id => { const def = cfg.find(x => x.id === id); if (def && def.stat === stat && !m.claimed[id]) { const before = m.prog[id] || 0; m.prog[id] = Math.min(def.n, before + (n || 1)); if (m.prog[id] !== before) changed = true; if (before < def.n && m.prog[id] >= def.n) UI().toast('✔ ' + T(def.text, def.en) + ' — ' + T('inaam lo!', 'claim it!')); } });
    if (changed) { S().data.missions = m; F.badges(); }
  };
  F.missionsReady = function () { const m = F.missions(); if (!m) return 0; const cfg = CFG().missions.pool; return m.list.filter(id => { const def = cfg.find(x => x.id === id); return def && (m.prog[id] || 0) >= def.n && !m.claimed[id]; }).length; };
  F.missionsPopup = function () {
    const m = F.missions(); if (!m) { UI().toast(T('Missions abhi band hain', 'Missions are off right now')); return; }
    const cfg = CFG().missions;
    const rows = m.list.map(id => {
      const def = cfg.pool.find(x => x.id === id); if (!def) return '';
      const p = m.prog[id] || 0, done = p >= def.n, got = m.claimed[id];
      return `<div class="mission ${got ? 'got' : done ? 'done' : ''}"><div class="mi">${IC(got ? 'star' : 'missions')}</div><div class="mt"><b>${esc(T(def.text, def.en))}</b><div class="bar"><i style="width:${Math.round(p / def.n * 100)}%"></i><span>${p}/${def.n}</span></div></div>
        ${got ? `<span class="ok">✓</span>` : `<button class="btn small ${done ? '' : 'grey'}" data-claim="${id}" ${done ? '' : 'disabled'}>${IC('coin')} ${def.coins}</button>`}</div>`;
    }).join('');
    const allGot = m.list.every(id => m.claimed[id]);
    const card = UI().modal(`<div class="ribbon">${T('Aaj ke Missions', "Today's Missions")}</div>
      <p class="sub">${T('Har din 3 naye missions. Raat 12 baje badalte hain.', '3 new missions every day. They refresh at midnight.')}</p>
      <div class="missions">${rows}</div>
      <div class="bonusbox ${allGot && !m.bonusClaimed ? 'ready' : ''}">${IC('chest')}<div><b>${T('Teeno poore karo', 'Finish all three')}</b><br><small>${cfg.allDoneBonus.coins} coins + ${cfg.allDoneBonus.n} ${UI().BOOSTERS[cfg.allDoneBonus.booster].name}</small></div>
      ${m.bonusClaimed ? '<span class="ok">✓</span>' : `<button class="btn small" data-bonus ${allGot ? '' : 'disabled'}>${T('Lo', 'Claim')}</button>`}</div>`, { bgClose: true });
    card.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
      const id = b.dataset.claim, def = cfg.pool.find(x => x.id === id);
      m.claimed[id] = true; S().data.missions = m; F.giveReward({ coins: def.coins }); AU().play('coin', 3); UI().confetti(900); B().track('missionsDone'); F.badges(); F.missionsPopup();
    });
    const bb = card.querySelector('[data-bonus]'); if (bb) bb.onclick = () => { m.bonusClaimed = true; S().data.missions = m; F.giveReward(cfg.allDoneBonus); AU().play('win'); UI().confetti(1500); F.badges(); F.missionsPopup(); };
  };

  // =================== KISMAT KA CHAKRA (spin wheel) ===================
  F.wheelState = function () { const d = S().data, day = S().today(); if (!d.wheel || d.wheel.day !== day) { d.wheel = { day, free: 1, ads: 0 }; } return d.wheel; };
  F.wheelPopup = function () {
    const W = CFG().wheel, st = F.wheelState(), prizes = W.prizes;
    const card = UI().modal(`<div class="ribbon">${T('Kismat ka Chakra', 'Wheel of Fortune')}</div>
      <div class="wheelwrap"><canvas id="wheelCv" width="560" height="560"></canvas><div class="wpin"></div><button class="wcenter" data-spin>${T('GHUMAO', 'SPIN')}</button></div>
      <p class="sub" id="wheelInfo"></p>
      <div class="row" id="wheelBtns"></div>`, { bgClose: true });
    const cv = card.querySelector('#wheelCv'), ctx = cv.getContext('2d'), R = 270, total = prizes.reduce((a, p) => a + p.w, 0);
    const seg = Math.PI * 2 / prizes.length;
    let angle = 0, spinning = false;
    function draw() {
      ctx.clearRect(0, 0, 560, 560); ctx.save(); ctx.translate(280, 280); ctx.rotate(angle);
      prizes.forEach((p, i) => {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 14, i * seg, (i + 1) * seg); ctx.closePath();
        const g = ctx.createRadialGradient(0, 0, 40, 0, 0, R); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, p.col); g.addColorStop(1, p.col);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.save(); ctx.rotate(i * seg + seg / 2); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = '800 34px Baloo, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(60,20,0,.55)';
        ctx.strokeText(p.label, R - 40, 12); ctx.fillText(p.label, R - 40, 12); ctx.restore();
      });
      ctx.restore();
      // rim with lights
      ctx.lineWidth = 22; ctx.strokeStyle = '#8D5524'; ctx.beginPath(); ctx.arc(280, 280, R - 4, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.fillStyle = (i + Math.floor(performance.now() / 300)) % 2 ? '#FFF59D' : '#FFB300'; ctx.beginPath(); ctx.arc(280 + Math.cos(a) * (R - 4), 280 + Math.sin(a) * (R - 4), 6, 0, Math.PI * 2); ctx.fill(); }
    }
    let raf; (function loop() { draw(); raf = requestAnimationFrame(loop); if (!document.body.contains(cv)) cancelAnimationFrame(raf); })();
    function info() {
      const extra = Math.max(0, W.extraSpinsByAd - st.ads);
      card.querySelector('#wheelInfo').textContent = st.free > 0 ? T('Aaj ka 1 free spin baaki hai!', 'You have 1 free spin today!') : extra > 0 ? T('Free spin ho gaya. Ad dekhkar ' + extra + ' aur spin.', 'Free spin used. Watch an ad for ' + extra + ' more.') : T('Aaj ke spin poore. Kal phir aana!', 'All spins used. Come back tomorrow!');
      const btns = card.querySelector('#wheelBtns');
      btns.innerHTML = st.free > 0 ? `<button class="btn big" data-spin2>${T('Free spin', 'Free spin')}</button>` : extra > 0 && M().canOfferRewarded() ? `<button class="btn blue" data-adspin>▶ ${T('Ad dekho, spin karo', 'Watch ad to spin')}</button>` : '';
      const s2 = btns.querySelector('[data-spin2]'); if (s2) s2.onclick = () => spin('free');
      const ad = btns.querySelector('[data-adspin]'); if (ad) ad.onclick = async () => { if (await M().rewarded()) { st.ads++; S().save(); spin('ad'); } };
    }
    card.querySelector('[data-spin]').onclick = () => { if (st.free > 0) spin('free'); };
    function spin(kind) {
      if (spinning) return; spinning = true;
      if (kind === 'free') st.free = 0; S().save();
      let r = Math.random() * total, idx = 0; for (; idx < prizes.length; idx++) { r -= prizes[idx].w; if (r <= 0) break; } idx = Math.min(idx, prizes.length - 1);
      // pointer at top (-90deg): final angle so that segment idx centre is under the pin
      const target = -Math.PI / 2 - (idx * seg + seg / 2) + (Math.random() - 0.5) * seg * 0.6;
      const TAU = Math.PI * 2, start = angle, delta = (((target - start) % TAU) + TAU) % TAU, end = start + TAU * 6 + delta;
      const dur = 4200, t0 = performance.now(); let lastTick = 0;
      (function anim(now) {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        angle = start + (end - start) * e;
        const tickIdx = Math.floor(angle / seg); if (tickIdx !== lastTick) { lastTick = tickIdx; AU().play('tik'); }
        if (k < 1) requestAnimationFrame(anim);
        else {
          spinning = false;
          const p = prizes[idx], txt = F.giveReward(p);
          AU().play('win'); UI().confetti(1500); F.track('spins'); B().track('spins');
          UI().toast(T('Kismat chamki: ', 'You won: ') + txt);
          F.badges(); info();
        }
      })(t0);
    }
    info();
  };

  // =================== FREE CHEST (every N hours) ===================
  F.chestLeft = function () { const h = CFG().freeChest.everyHours * 3600e3; return Math.max(0, (S().data.chestTs || 0) + h - Date.now()); };
  F.openChest = function () {
    if (F.chestLeft() > 0) { UI().toast(T('Agla chest ' + UI().fmtTime(F.chestLeft()) + ' mein', 'Next chest in ' + UI().fmtTime(F.chestLeft()))); return; }
    const c = CFG().freeChest, coins = Math.round(c.coinsMin + Math.random() * (c.coinsMax - c.coinsMin));
    const r = { coins }; if (Math.random() < c.boosterChance) { r.booster = ['hammer', 'shake', 'chimta'][Math.floor(Math.random() * 3)]; r.n = 1; }
    S().data.chestTs = Date.now();
    const card = UI().modal(`<div class="rays"></div><div class="ribbon">${T('Muft Chest', 'Free Chest')}</div><div class="bigicon pop">${IC('chest')}</div>
      <h2>+${coins} coins${r.booster ? ' + ' + UI().BOOSTERS[r.booster].name : ''}</h2>
      <div class="row">${M().canOfferRewarded() ? `<button class="btn blue" data-dbl>▶ ${T('Ad dekho, double karo', 'Watch ad to double')}</button>` : ''}<button class="btn big" data-take>${T('Le lo', 'Collect')}</button></div>`, { noClose: true });
    AU().play('special');
    card.querySelector('[data-take]').onclick = () => { F.giveReward(r); AU().play('coin', 4); UI().closeModal(); F.badges(); };
    const d = card.querySelector('[data-dbl]'); if (d) d.onclick = async () => { if (await M().rewarded()) { F.giveReward(r, 2); AU().play('coin', 6); UI().confetti(1200); UI().closeModal(); F.badges(); } };
  };

  // =================== STAR CHEST ===================
  F.starChest = function () { const every = CFG().starChest.every, stars = S().totalStars(), claimedAt = S().data.starChestAt || 0; return { every, progress: Math.min(every, stars - claimedAt), ready: stars - claimedAt >= every }; };
  F.openStarChest = function () {
    const sc = F.starChest(), cfg = CFG().starChest;
    if (!sc.ready) { UI().toast(T('Aur ' + (sc.every - sc.progress) + ' sitaare kamao', 'Earn ' + (sc.every - sc.progress) + ' more stars')); return; }
    S().data.starChestAt = (S().data.starChestAt || 0) + sc.every;
    const txt = F.giveReward(cfg);
    UI().modal(`<div class="rays"></div><div class="ribbon">${T('Sitaron ka Khazana', 'Star Chest')}</div><div class="bigicon pop">${IC('star')}</div><h2>${esc(txt)}</h2><div class="row"><button class="btn big" data-ok>${T('Wah!', 'Great!')}</button></div>`, { noClose: true }).querySelector('[data-ok]').onclick = () => UI().closeModal();
    AU().play('win'); UI().confetti(1600); F.badges();
  };

  // =================== WIN STREAK ("Garam Streak") ===================
  F.streakRewards = function () { const s = S().data.streak || 0; return CFG().streak.levels.filter(x => s >= x.need).map(x => x.give); };
  F.onWin = function () { S().data.streak = Math.min(9, (S().data.streak || 0) + 1); S().save(); };
  F.onGiveUp = function () { if (S().data.streak) { S().data.streak = 0; S().save(); } };
  F.streakHtml = function () {
    const s = S().data.streak || 0, lv = CFG().streak.levels;
    return `<div class="streak">${IC('fire')}<div><b>${T('Garam Streak', 'Hot Streak')}: ${s}</b><small>${T('Lagatar jeeto, muft booster pao', 'Win in a row for free boosters')}</small>
      <div class="sdots">${lv.map(x => `<span class="${s >= x.need ? 'on' : ''}">${x.need}✓ ${esc(UI().BOOSTERS[x.give].name.split(' ').pop())}</span>`).join('')}</div></div></div>`;
  };

  // =================== LEADERBOARD ===================
  F.leaderboardPopup = async function () {
    const card = UI().modal(`<div class="ribbon">${T('Top Khiladi', 'Leaderboard')}</div><div class="lb"><p class="sub">${T('Load ho raha hai…', 'Loading…')}</p></div>`, { bgClose: true });
    const list = await B().leaderboard(); const me = B().user && B().user.uid;
    card.querySelector('.lb').innerHTML = list.length ? list.map((u, i) => `<div class="lbrow ${u.uid === me ? 'me' : ''}"><span class="rk rk${i + 1}">${i + 1}</span><span class="nm">${esc(u.name || 'Khiladi')}</span><span class="lv">Lv ${u.level || 1}</span><span class="st">${IC('star')}${u.stars || 0}</span></div>`).join('')
      : `<p class="sub">${T('Abhi koi khiladi nahi. Pehle aap bano!', 'No players yet. Be the first!')}</p>`;
  };

  // =================== INBOX ===================
  F.inboxCount = 0;
  F.refreshInbox = async function () { try { const l = await B().inbox(); F.inboxCount = l.length; F._inbox = l; F.badges(); } catch (e) { /* offline */ } };
  F.inboxPopup = async function () {
    await F.refreshInbox();
    const l = F._inbox || [];
    const card = UI().modal(`<div class="ribbon">${T('Daak', 'Inbox')}</div><div class="inbox">${l.length ? l.map(m => `<div class="msg"><div class="mi">${IC(m.gift ? 'gift' : 'inbox')}</div><div class="mt"><b>${esc(m.title)}</b><small>${esc(m.text)}</small>${m.gift ? `<div class="gifttag">${m.gift.coins ? m.gift.coins + ' coins ' : ''}${m.gift.lives ? '+' + m.gift.lives + ' lives ' : ''}${Object.entries(m.gift.boosters || {}).filter(([, n]) => n).map(([k, n]) => '+' + n + ' ' + k).join(' ')}</div>` : ''}</div><button class="btn small" data-m="${esc(m.id)}">${m.gift ? T('Lo', 'Claim') : 'OK'}</button></div>`).join('') : `<p class="sub">${T('Koi nayi daak nahi.', 'No new messages.')}</p>`}</div>`, { bgClose: true });
    card.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
      const m = l.find(x => x.id === b.dataset.m); if (!m) return;
      b.disabled = true; await B().claim(m);
      if (m.gift) { const txt = F.giveReward(m.gift); AU().play('coin', 5); UI().toast(T('Mil gaya: ', 'Received: ') + txt); }
      F.inboxPopup();
    });
  };

  // =================== ANNOUNCEMENT / MAINTENANCE ===================
  F.announcement = function () {
    const a = CFG().announcement; if (!a || !a.on) return;
    const key = 'ann_' + (CFG().version || 0) + '_' + (a.title || '').length;
    if (S().data.seen[key]) return;
    S().data.seen[key] = 1; S().save();
    UI().modal(`<div class="ribbon">${T('Khabar', 'News')}</div><div class="bigicon">${IC('event')}</div><h2>${esc(a.title)}</h2><p>${esc(a.text)}</p><div class="row"><button class="btn big" data-ok>OK</button></div>`, { bgClose: true }).querySelector('[data-ok]').onclick = () => UI().closeModal();
  };

  // =================== HOME BADGES ===================
  F.badges = function () {
    const set = (sel, n) => { const e = document.querySelector(sel); if (!e) return; e.textContent = n > 0 ? n : ''; e.style.display = n > 0 ? 'grid' : 'none'; };
    set('#bMissions', F.missionsReady());
    set('#bInbox', F.inboxCount);
    const st = F.wheelState(); set('#bWheel', st.free > 0 ? 1 : 0);
    const left = F.chestLeft(), ct = document.querySelector('#chestTime');
    if (ct) ct.textContent = left > 0 ? UI().fmtTime(left) : T('Kholo!', 'Open!');
    const cb = document.querySelector('#chestBtn'); if (cb) cb.classList.toggle('ready', left <= 0);
    const sc = F.starChest(), sb = document.querySelector('#starBar');
    if (sb) { sb.querySelector('i').style.width = Math.round(sc.progress / sc.every * 100) + '%'; sb.querySelector('span').textContent = sc.ready ? T('Kholo!', 'Open!') : sc.progress + '/' + sc.every; sb.classList.toggle('ready', sc.ready); }
  };
  setInterval(() => { if (G.MM_SAVE && G.MM_SAVE.data && document.querySelector('#home.on')) F.badges(); }, 1000);

  G.MM_FEAT = F;
})(window);
