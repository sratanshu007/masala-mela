/* Masala Mela — screens, map, popups, story and game flow. (c) Deific Digital */
(function (G) {
  'use strict';
  const D = G.MM_DATA, LV = G.MM_LEVELS, S = G.MM_SAVE, AU = G.MM_AUDIO, ART = G.MM_ART, M = G.MM_MONETIZE, CH = (w, m) => G.MM_CHARS(w, m);
  const $ = s => document.querySelector(s);
  const VERSION = '1.0.0';
  const T = (hi, en) => (S.data && S.data.settings.lang === 'en' ? en : hi);
  const UI = { cur: null, game: null, board: null, level: null };

  const CFG = () => G.MM_CONFIG.get();
  const FT = () => G.MM_FEAT, BK = () => G.MM_BACKEND;
  function activeEvent() { return G.MM_CONFIG.activeEvent(); }
  function nextEvent() { return G.MM_CONFIG.nextEvent(); }

  // ---------- small helpers ----------
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function fmtTime(ms) { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
  function fmt(n) { return Math.round(n).toLocaleString('en-IN'); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  function press(btn) { if (!S.data) return; AU.play('click'); if (navigator.vibrate && S.data.settings.sfx) try { navigator.vibrate(8); } catch (e) { /* */ } }
  document.addEventListener('click', e => { const b = e.target.closest('button'); if (b) press(b); }, true);

  const ICON = {
    hammer: '<svg viewBox="0 0 40 40"><rect x="17" y="12" width="6" height="26" rx="3" fill="#C68B4E" stroke="#3b1f0e" stroke-width="2"/><rect x="6" y="4" width="28" height="12" rx="5" fill="#8D6E63" stroke="#3b1f0e" stroke-width="2"/><rect x="9" y="6" width="10" height="3" rx="1.5" fill="#fff" opacity=".4"/></svg>',
    shake: '<svg viewBox="0 0 40 40"><path d="M11 12h18l-2 24H13z" fill="#B0BEC5" stroke="#3b1f0e" stroke-width="2"/><rect x="9" y="6" width="22" height="8" rx="4" fill="#90A4AE" stroke="#3b1f0e" stroke-width="2"/><circle cx="15" cy="9" r="1.2" fill="#3b1f0e"/><circle cx="20" cy="9" r="1.2" fill="#3b1f0e"/><circle cx="25" cy="9" r="1.2" fill="#3b1f0e"/><path d="M14 22h12M14 28h12" stroke="#E53935" stroke-width="3"/></svg>',
    chimta: '<svg viewBox="0 0 40 40"><path d="M8 34L22 6M32 34L22 6" stroke="#607D8B" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="6" r="3.5" fill="#455A64" stroke="#3b1f0e" stroke-width="1.5"/><circle cx="8" cy="34" r="2.5" fill="#455A64"/><circle cx="32" cy="34" r="2.5" fill="#455A64"/></svg>',
    chai: '<svg viewBox="0 0 40 40"><path d="M9 14h20l-3 20H12z" fill="#fff" stroke="#3b1f0e" stroke-width="2"/><path d="M11 18h16l-1.5 9h-13z" fill="#C68B4E"/><path d="M29 18q6 0 5 6t-6 4" fill="none" stroke="#3b1f0e" stroke-width="2"/><path d="M15 10q2-4 0-7M21 10q2-4 0-7" stroke="#bbb" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
  };
  let spriteIcons = {};
  function specialIcon(kind) {
    if (!spriteIcons[kind]) { const cv = kind === 'dabba' ? ART.special(0, 'd', 96) : ART.special(2, 'k', 96); spriteIcons[kind] = cv.toDataURL(); }
    return '<img src="' + spriteIcons[kind] + '" style="width:44px;height:44px">';
  }
  function boosterIcon(k) { return k === 'dabba' || k === 'kadhai' ? specialIcon(k) : ICON[k]; }
  const BOOSTER_TEXT = {
    hammer: { name: 'Belan Hammer', desc: ['Ek piece seedha tod do', 'Smash any one piece'] },
    shake: { name: 'Masala Shake', desc: ['Board shuffle karo', 'Shuffle the board'] },
    chimta: { name: 'Chimta Swap', desc: ['Bina move kharch kiye 2 piece badlo', 'Swap any two pieces for free'] },
    dabba: { name: 'Pre-game Dabba', desc: ['Shuru mein ek Masala Dabba', 'Start with a Masala Dabba'] },
    kadhai: { name: 'Pre-game Kadhai', desc: ['Shuru mein ek Kadhai Dhamaka', 'Start with a Kadhai blast'] }
  };
  const BOOSTERS = {};
  Object.keys(BOOSTER_TEXT).forEach(k => Object.defineProperty(BOOSTERS, k, { enumerable: true, get: () => ({ name: BOOSTER_TEXT[k].name, desc: T(BOOSTER_TEXT[k].desc[0], BOOSTER_TEXT[k].desc[1]), price: CFG().economy.boosterPrices[k], unlock: CFG().economy.boosterUnlock[k] }) }));

  // ---------- screens & transitions ----------
  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); UI.cur = id; }
  async function lidTo(id, fn) {
    const lid = $('#lid');
    lid.className = 'close'; AU.play('whoosh');
    await wait(260);
    if (fn) await fn();
    show(id);
    lid.className = 'open';
  }

  // ---------- modal ----------
  let modalResolve = null;
  function modal(html, opts) {
    opts = opts || {};
    const m = $('#modal');
    m.innerHTML = ''; const card = h('<div class="card">' + html + '</div>');
    if (!opts.noClose) { const x = h('<button class="x" aria-label="close">✕</button>'); x.onclick = () => closeModal(opts.onClose); card.prepend(x); }
    m.appendChild(card); m.classList.add('on'); AU.duck(true);
    if (opts.bgClose) m.onclick = e => { if (e.target === m) closeModal(opts.onClose); }; else m.onclick = null;
    UI.modalOpen = true; UI.modalOnClose = opts.onClose;
    return card;
  }
  async function closeModal(cb) {
    const m = $('#modal'), card = m.querySelector('.card');
    if (card) { card.classList.add('out'); await wait(140); }
    m.classList.remove('on'); m.innerHTML = ''; AU.duck(false); UI.modalOpen = false;
    if (typeof cb === 'function') cb();
  }
  UI.closeModal = closeModal;
  UI.toast = function (msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.remove('on'), 2200); };
  UI.confirm = function (title, text, yes, no) {
    return new Promise(res => {
      const card = modal('<h2>' + title + '</h2><p>' + text + '</p><div class="row"><button class="btn grey" data-n>' + (no || T('Nahi', 'No')) + '</button><button class="btn" data-y>' + (yes || T('Haan', 'Yes')) + '</button></div>', { onClose: () => res(false) });
      card.querySelector('[data-y]').onclick = () => { closeModal(); res(true); };
      card.querySelector('[data-n]').onclick = () => { closeModal(); res(false); };
    });
  };
  // Web build stand-in for a rewarded ad
  UI.demoAd = function () {
    return new Promise(res => {
      const card = modal('<div class="adbox">' + T('Demo Ad', 'Demo Ad') + '<div class="count">3</div><small>' + T('App mein yahan asli rewarded video ad chalega', 'A real rewarded video plays here in the app') + '</small></div>', { noClose: true });
      let n = 3; const c = card.querySelector('.count');
      const iv = setInterval(() => { n--; c.textContent = n; if (n <= 0) { clearInterval(iv); closeModal(); res(true); } }, 1000);
    });
  };

  // ---------- praise ----------
  const PRAISE = { 2: ['Mast!', 'Tasty!'], 3: ['Wah!', 'Zabardast!'], 4: ['Maza aa gaya!'], 5: ['Kya baat hai!', 'Shabaash!'], 6: ['Dhamaka!', 'Ek number!'] };
  function praise(text, say) {
    const p = $('#praise'); p.innerHTML = ''; const d = h('<div>' + text + '</div>'); p.appendChild(d);
    if (say !== false) AU.say(text.replace('!', ''));
  }

  // ---------- confetti ----------
  function confetti(ms) {
    const cv = $('#confetti'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#FF8A3D', '#FFC83D', '#FF5C8A', '#1FB5A8', '#7CB342', '#7C5CBF'];
    const ps = Array.from({ length: S.data && G.MM_BoardView && UI.board && UI.board.lowQuality ? 70 : 140 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], w: 6 + Math.random() * 6 }));
    const end = performance.now() + (ms || 2200);
    (function step(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.restore(); });
      if (t < end) requestAnimationFrame(step); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(performance.now());
  }

  // ---------- story dialog ----------
  function playScene(lines) {
    return new Promise(res => {
      const bg = $('#storyBg'), dlg = $('#dlg');
      bg.classList.add('on'); dlg.classList.add('on');
      let i = 0, typing = null;
      const showLine = () => {
        if (i >= lines.length) { bg.classList.remove('on'); dlg.classList.remove('on'); dlg.onclick = null; bg.onclick = null; UI.dialogSkip = null; res(); return; }
        const L = lines[i];
        dlg.querySelector('.who').innerHTML = CH(L.who, L.mood || (L.who === 'seth' ? (lines === D.SCENES.finale ? 'happy' : 'angry') : 'happy'));
        dlg.querySelector('.name').textContent = D.NAMES[L.who];
        const txt = dlg.querySelector('.txt'); txt.textContent = '';
        let k = 0; clearInterval(typing);
        typing = setInterval(() => { k++; txt.textContent = L.t.slice(0, k); if (k % 3 === 0) AU.play('tik'); if (k >= L.t.length) { clearInterval(typing); typing = null; } }, 22);
        dlg.querySelector('.box').classList.remove('pop'); void dlg.offsetWidth;
      };
      const next = () => { if (typing) { clearInterval(typing); typing = null; dlg.querySelector('.txt').textContent = lines[i].t; return; } i++; showLine(); };
      dlg.onclick = next; bg.onclick = next; UI.dialogSkip = next;
      showLine();
    });
  }
  UI.playScene = playScene;

  // ---------- top bar ----------
  function refreshTop() {
    S.tickLives();
    const d = S.data;
    document.querySelectorAll('[data-lives]').forEach(e => { e.textContent = S.infinite() ? '∞' : d.lives; });
    document.querySelectorAll('[data-lifetime]').forEach(e => {
      const ms = S.nextLifeIn();
      e.textContent = S.infinite() ? fmtTime(d.infiniteUntil - Date.now()) : d.lives >= S.MAX_LIVES ? T('Full', 'Full') : fmtTime(ms);
    });
    document.querySelectorAll('[data-coins]').forEach(e => { e.textContent = fmt(d.coins); });
    const dot = $('#dailyDot'); if (dot) dot.style.display = S.dailyAvailable() ? 'grid' : 'none';
    const pl = $('#playBtn'); if (pl) pl.innerHTML = `<span>${T('Khelo', 'Play')}</span><b>Level ${d.level}</b>`;
  }
  setInterval(() => { if (S.data) refreshTop(); }, 1000);

  // ---------- map ----------
  const SPACING = 96, PAD = 190, BAND = 15 * SPACING + PAD;
  function nodeX(w, k, width) {
    const W = D.WORLDS[w - 1], m = 52, half = width / 2, amp = Math.min(half - m, 150);
    let f = 0;
    switch (W.path) {
      case 's': f = Math.sin(k * 0.62); break;
      case 'zig': { const t = (k % 4) / 4; f = t < 0.5 ? -1 + t * 4 : 3 - t * 4; break; }
      case 'river': f = Math.sin(k * 0.38) * 0.85 + Math.sin(k * 1.3) * 0.15; break;
      case 'spiral': f = Math.cos(k * 0.95) * (1 - k / 22); break;
      case 'hill': f = (k % 2 ? -0.35 : 0.35) * (k > 12 ? Math.cos(k) : 1); break;
    }
    return half + f * amp;
  }
  function nodePos(n, width, totalH) {
    const w = Math.ceil(n / 15), k = ((n - 1) % 15) + 1;
    const bandTop = totalH - w * BAND;
    return { x: nodeX(w, k, width), y: bandTop + BAND - 80 - (k - 1) * SPACING };
  }
  function decoSVG(W, width) {
    const parts = []; const rnd = LV.rngFrom(W.id * 99);
    const side = () => (rnd() < 0.5 ? 10 + rnd() * 50 : width - 60 - rnd() * 50);
    for (let i = 0; i < 9; i++) {
      const x = side(), y = 180 + i * (BAND - 260) / 9 + rnd() * 60, s = 0.8 + rnd() * 0.5;
      const g = (inner) => `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s.toFixed(2)})">${inner}</g>`;
      switch (W.id) {
        case 1: parts.push(g(i % 2 ? `<rect x="0" y="20" width="44" height="30" fill="#8D5524" rx="3"/><path d="M-4 22l26-18 26 18z" fill="${W.acc}"/><rect x="14" y="30" width="10" height="12" fill="#FFF3E0"/><circle cx="19" cy="18" r="4" fill="#fff" opacity=".7"/>`
          : `<path d="M0 0q25 14 50 0" stroke="#5D4037" fill="none"/>${[0, 1, 2, 3, 4].map(j => `<path d="M${j * 10} ${j % 2 ? 4 : 5}l5 12 5-12z" fill="${['#FF8A3D', '#1FB5A8', '#FFC83D', '#E63946', '#7CB342'][j]}"/>`).join('')}`)); break;
        case 2: parts.push(g([0, 1, 2, 3, 4, 5].map(j => `<circle cx="${j * 9}" cy="${Math.sin(j) * 5}" r="6" fill="${j % 2 ? '#FF9800' : '#FFC107'}"/>`).join('') + `<circle cx="20" cy="30" r="12" fill="#FF5C8A"/><circle cx="20" cy="30" r="5" fill="#FFC83D"/>`)); break;
        case 3: parts.push(g(`<path d="M20 0l18 20-18 24-18-24z" fill="${['#E63946', '#4DA3FF', '#FFC83D', '#7CB342'][i % 4]}" stroke="#3b1f0e"/><path d="M20 44q-6 14 6 30" stroke="#3b1f0e" fill="none"/>`)); break;
        case 4: parts.push(g(i % 3 ? `<path d="M0 30q10-30 20 0q10-30 20 0" fill="#F9D71C"/><rect x="0" y="30" width="40" height="8" fill="#6B8E23"/>`
          : `<rect x="0" y="10" width="54" height="24" rx="4" fill="${W.acc}"/><rect x="40" y="0" width="18" height="24" rx="3" fill="#FFC83D"/><circle cx="12" cy="36" r="6" fill="#333"/><circle cx="46" cy="36" r="6" fill="#333"/><path d="M4 16h30" stroke="#fff" stroke-dasharray="4 3"/>`)); break;
        case 5: parts.push(g(i % 2 ? `<path d="M0 20q15 10 50 0l-8 10h-34z" fill="#6D4C41"/><path d="M20 20v-22l14 18z" fill="#FFF3E0"/>`
          : `<path d="M20 50v-36" stroke="#6D4C41" stroke-width="4"/><path d="M20 14q-20-4-24 8M20 14q20-4 24 8M20 14q-8-14-20-12M20 14q8-14 20-12" stroke="#2E9E5B" stroke-width="5" fill="none"/>`)); break;
        case 6: parts.push(g(i % 2 ? `<rect x="0" y="10" width="50" height="34" fill="#E9B872"/><path d="M0 10h6v-6h6v6h6v-6h6v6h6v-6h6v6h6v-6h8v6" fill="#E9B872"/><rect x="20" y="26" width="10" height="18" rx="5" fill="#8D5524"/>`
          : `<path d="M0 30q25-26 50 0z" fill="#F4C27A"/>`)); break;
        case 7: parts.push(g(`<path d="M0 40l25-34 25 34z" fill="${W.main}"/><rect x="18" y="24" width="14" height="16" fill="#FFF3E0"/><circle cx="25" cy="16" r="4" fill="#FFC83D"/>`)); break;
        case 8: parts.push(g(`<rect x="0" y="10" width="8" height="40" fill="#E0C9A6"/><rect x="34" y="10" width="8" height="40" fill="#E0C9A6"/><rect x="0" y="26" width="42" height="24" fill="#EAD7B7"/><path d="M12 50v-12q9-10 18 0v12z" fill="#8D6E63"/><circle cx="4" cy="8" r="5" fill="${W.acc}"/><circle cx="38" cy="8" r="5" fill="${W.acc}"/>`)); break;
        case 9: parts.push(g(i % 2 ? `<path d="M0 40l22-34 22 34z" fill="#B0C4DE"/><path d="M14 18l8-12 8 12-4 3-4-3-4 3z" fill="#fff"/>` : `<path d="M20 50v-20" stroke="#6D4C41" stroke-width="4"/><circle cx="20" cy="22" r="14" fill="#C0392B"/><circle cx="14" cy="16" r="6" fill="#E74C3C"/>`)); break;
        case 10: parts.push(g(i % 2 ? `<path d="M0 44v-20q14-22 28 0v20z" fill="#FFC83D" opacity=".9"/><circle cx="14" cy="8" r="3" fill="#FFF59D"/>` : `<path d="M4 20q8 10 16 0z" fill="#BF6A3A"/><path d="M12 16q-3-6 0-12q3 6 0 12z" fill="#FFC83D"/>`)); break;
      }
    }
    return `<svg class="deco" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
  }
  function buildMap() {
    const map = $('#map'), inner = $('#mapInner');
    const width = map.clientWidth || innerWidth;
    const totalH = 10 * BAND + 140;
    inner.style.height = totalH + 'px'; inner.innerHTML = '';
    const d = S.data;
    for (let w = 1; w <= 10; w++) {
      const W = D.WORLDS[w - 1], top = totalH - w * BAND;
      const band = h(`<div class="world" style="top:${top}px;height:${BAND}px;background:linear-gradient(180deg, ${W.sky[1]}, ${W.sky[0]})"></div>`);
      if (G.MM_SCENES) {
        const sc = G.MM_SCENES.paintBand(W, Math.round(width), BAND);
        sc.className = 'bandscene'; band.appendChild(sc);
      } else band.innerHTML = decoSVG(W, width);
      // path line
      const pts = []; for (let k = 1; k <= 15; k++) { const p = nodePos((w - 1) * 15 + k, width, totalH); pts.push(p.x.toFixed(0) + ',' + (p.y - top).toFixed(0)); }
      if (w < 10) { const p = nodePos(w * 15 + 1, width, totalH); pts.push(p.x.toFixed(0) + ',' + (p.y - top).toFixed(0)); }
      band.insertAdjacentHTML('beforeend', `<svg class="deco" xmlns="http://www.w3.org/2000/svg"><polyline points="${pts.join(' ')}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts.join(' ')}" fill="none" stroke="${W.main}" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/></svg>`);
      band.appendChild(h(`<div class="banner"><b>${w}. ${W.name}</b><span>${D.WORLD_BEATS[w]}</span></div>`));
      inner.appendChild(band);
    }
    for (let n = 1; n <= LV.TOTAL; n++) {
      const p = nodePos(n, width, totalH), k = ((n - 1) % 15) + 1, W = D.WORLDS[Math.ceil(n / 15) - 1];
      const boss = k === 10 || k === 15;
      const locked = n > d.level, cur = n === d.level;
      const st = d.stars[n] || 0;
      const el = h(`<button class="node${boss ? ' boss' : ''}${locked ? ' locked' : ''}${cur ? ' cur' : ''}" style="left:${p.x}px;top:${p.y}px;--nc:${boss ? '#7B1FA2' : W.main}">${n}</button>`);
      if (!locked && !cur || st) el.appendChild(h(`<div class="stars">${[1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}">★</i>`).join('')}</div>`));
      if (boss) el.appendChild(h(`<div class="flag">${CH(n === 150 ? 'seth' : 'karela')}</div>`));
      el.onclick = () => { if (locked) { UI.toast(T('Pehle pichhla level jeeto!', 'Beat the previous level first!')); return; } openLevel(n); };
      inner.appendChild(el);
    }
    // Fika Fog over locked part of the map
    const cp = nodePos(Math.min(d.level, LV.TOTAL), width, totalH);
    inner.appendChild(h(`<div style="position:absolute;left:0;right:0;top:0;height:${Math.max(0, cp.y - 70)}px;background:linear-gradient(180deg, rgba(90,80,75,.4), rgba(110,100,92,.22) 85%, rgba(110,100,92,0));pointer-events:none;z-index:1"></div>`));
    const av = h(`<div class="avatar">${CH('meethi')}</div>`);
    av.style.left = (cp.x - 29) + 'px'; av.style.top = (cp.y - 100) + 'px';
    inner.appendChild(av);
    UI.scrollMap = () => { map.scrollTop = cp.y - map.clientHeight * 0.55; };
    UI.scrollMap();
  }

  UI.home = async function () {
    AU.playWorld(D.WORLDS[Math.min(9, Math.ceil(S.data.level / 15) - 1)], true);
    show('home');
    buildMap(); refreshTop();
    if (FT()) { FT().badges(); FT().refreshInbox(); }
  };

  // ---------- level entry ----------
  async function openLevel(n) {
    if (!S.hasLife()) { livesPopup(); return; }
    const level = LV.getLevel(n);
    const w = level.world, k = level.idx;
    // story beats
    if (n === 1 && !S.data.seen.intro) { await playScene(D.SCENES.intro); S.data.seen.intro = 1; S.save(); }
    else if (k === 1 && !S.data.seen['w' + w]) { await playScene([{ who: 'dadi', t: D.WORLD_BEATS[w] }, { who: 'dabbu', t: T('Chalo ' + D.WORLDS[w - 1].name + '! Bhookh lagi hai!', 'To ' + D.WORLDS[w - 1].name + '! I am hungry!') }]); S.data.seen['w' + w] = 1; S.save(); }
    if (n === 150 && !S.data.seen.prefinale) { await playScene(D.SCENES.preFinale); S.data.seen.prefinale = 1; S.save(); }
    preLevel(level);
  }

  function goalText(g) {
    const P = D.PIECES;
    switch (g.t) {
      case 'score': return { n: fmt(g.n), t: T('Score karo', 'Score') };
      case 'collect': return { n: g.n, t: P[g.c].name };
      case 'jelly': return { n: '', t: T('Saari chashni saaf', 'Clear all jelly') };
      case 'ing': return { n: g.n, t: T('Elaichi/Kesar neeche laao', 'Bring spices down') };
      case 'block': return { n: '', t: ({ tiffin: 'Steel Tiffin', matka: 'Matka', fog: 'Fika Fog', tawa: 'Garam Tawa', handi: 'Dum Handi', dor: 'Patang Dor', ice: 'Baraf' })[g.b] + T(' todo', ' – break all') };
    }
  }

  function preLevel(level) {
    const W = D.WORLDS[level.world - 1];
    document.documentElement.style.setProperty('--main', W.main);
    const chosen = {};
    const gc = level.goals.map(g => { const t = goalText(g); return `<div class="goalcard"><img src="${ART.goalIcon(g, 96)}"><b>${t.n}</b>${t.t}</div>`; }).join('');
    const pre = ['kadhai', 'dabba'].filter(k => level.id >= BOOSTERS[k].unlock);
    const card = modal(`<div class="ribbon">${level.boss ? '⚔ BOSS · ' : ''}Level ${level.id}</div>
      <h3>${W.name}</h3>
      ${level.boss ? `<p><b>${level.id === 150 ? 'Fika Seth' : 'Kadwa Karela'}</b> ${T('ko haraao!', 'must be defeated!')}</p>` : ''}
      <div class="goalcards">${gc}</div>
      <p>${level.moves} ${T('chaalein', 'moves')}</p>
      ${FT() && level.id > 5 ? FT().streakHtml() : ''}
      ${pre.length ? `<small>${T('Booster chuno', 'Pick boosters')}</small><div class="prebo">${pre.map(k => `<button class="boost" data-b="${k}">${boosterIcon(k)}<span class="n ${S.data.boosters[k] ? '' : 'plus'}">${S.data.boosters[k] || '+'}</span></button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn big" data-play>${T('KHELO', 'PLAY')}</button></div>`, { bgClose: true });
    card.querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
      const k = b.dataset.b;
      if (chosen[k]) { chosen[k] = false; b.classList.remove('sel'); return; }
      if (!S.data.boosters[k]) {
        if (!S.spend(BOOSTERS[k].price)) { UI.toast(T('Coins kam hain', 'Not enough coins')); return; }
        S.addBooster(k, 1); b.querySelector('.n').textContent = 1; b.querySelector('.n').classList.remove('plus'); refreshTop();
      }
      chosen[k] = true; b.classList.add('sel');
    });
    card.querySelector('[data-play]').onclick = async () => {
      await closeModal();
      Object.keys(chosen).forEach(k => { if (chosen[k]) S.useBooster(k); });
      startLevel(level, chosen);
    };
  }

  // ---------- game ----------
  async function startLevel(level, chosen) {
    const W = D.WORLDS[level.world - 1];
    UI.level = level;
    S.data.stats.played++; S.save();
    if (BK()) BK().track('levelsPlayed');
    await lidTo('game', () => {
      const root = document.documentElement.style;
      root.setProperty('--main', W.main); root.setProperty('--acc', W.acc);
      root.setProperty('--sky1', W.sky[0]); root.setProperty('--sky2', W.sky[1]);
      $('#game .bgdeco').innerHTML = decoSVG(W, innerWidth);
      $('#lvlName').innerHTML = (level.boss ? '⚔ ' : '') + 'Level ' + level.id + '<small>' + W.name + '</small>';
    });
    const board = UI.board;
    const game = new G.MM_Game(level, { emit: (e, d) => board.onEvent(e, d), wait: ms => board.wait(ms) });
    UI.game = game; UI.extraMovesBought = 0; UI.initial = { jelly: game.jellyLeft(), blocks: {} };
    level.goals.forEach(g => { if (g.t === 'block') UI.initial.blocks[g.b] = game.countBlock(g.b); });
    board.attach(game);
    if (G.MM_SCENES) G.MM_SCENES.start($('#bgfx'), W);
    if (chosen && chosen.kadhai) game.placeStartSpecial('k');
    if (chosen && chosen.dabba) game.placeStartSpecial('d');
    if (FT() && level.id > 5) { const sr = FT().streakRewards(); sr.forEach(k => game.placeStartSpecial(k === 'dabba' ? 'd' : 'k')); if (sr.length) setTimeout(() => UI.toast(T('Garam Streak inaam: ', 'Hot Streak bonus: ') + sr.map(k => BOOSTERS[k].name).join(' + ')), 1200); }
    buildHud(level);
    AU.playWorld(W, false); AU.setUrgent(false);
    setDabbu('happy');
    if (level.tip && !S.data.seen['tip' + level.id]) {
      await wait(900);
      await playScene([{ who: 'dadi', t: level.tip }]);
      S.data.seen['tip' + level.id] = 1; S.save();
    }
  }

  function buildHud(level) {
    const goals = $('#goals'); goals.innerHTML = '';
    level.goals.forEach((g, i) => {
      if (g.t === 'score') return;
      goals.appendChild(h(`<div class="goal" data-g="${i}"><img src="${ART.goalIcon(g, 72)}"><b></b></div>`));
    });
    const st = level.stars, max = st[2] || 1;
    $('#scorebar').innerHTML = `<div class="fill"></div><span class="sc">0</span>${[0, 1, 2].map(i => `<span class="st" style="left:${Math.max(6, Math.min(97, (st[i] / max) * 100))}%">★</span>`).join('')}`;
    const bb = $('#bossbar');
    bb.classList.toggle('on', !!level.boss);
    if (level.boss) bb.querySelector('.face').innerHTML = CH(level.id === 150 ? 'seth' : 'karela');
    // boosters
    const bo = $('#boosters'); bo.querySelectorAll('.boost').forEach(e => e.remove());
    ['hammer', 'shake', 'chimta'].forEach(k => {
      const lockd = level.id < BOOSTERS[k].unlock;
      const b = h(`<button class="boost${lockd ? ' lock' : ''}" data-k="${k}">${ICON[k]}<span class="n"></span></button>`);
      b.onclick = () => onBooster(k, b);
      bo.insertBefore(b, $('#dabbuGame'));
    });
    UI.lastGoalVals = {};
    refreshHud();
  }

  function progressFraction() {
    const g = UI.game; if (!g) return 0;
    const fr = g.goalStatus().map(s => {
      const go = s.g;
      if (s.done) return 1;
      if (go.t === 'score') return g.score / go.n;
      if (go.t === 'collect' || go.t === 'ing') return s.have / s.need;
      if (go.t === 'jelly') return UI.initial.jelly ? 1 - s.left / UI.initial.jelly : 1;
      if (go.t === 'block') { const i = UI.initial.blocks[go.b] || 1; return Math.max(0, 1 - s.left / i); }
      return 0;
    });
    return fr.reduce((a, b) => a + b, 0) / fr.length;
  }

  let hudQueued = false;
  function refreshHud() {
    if (hudQueued) return; hudQueued = true;
    requestAnimationFrame(() => {
      hudQueued = false;
      const g = UI.game; if (!g) return;
      const mv = $('#moves'); mv.querySelector('b').textContent = g.moves;
      const low = g.moves <= 5 && !g.won;
      mv.classList.toggle('low', low);
      g.goalStatus().forEach((s, i) => {
        const el = document.querySelector(`.goal[data-g="${i}"]`); if (!el) return;
        const val = s.g.t === 'jelly' || s.g.t === 'block' ? s.left : s.left;
        el.querySelector('b').textContent = s.done ? '' : val;
        el.classList.toggle('done', s.done);
        if (UI.lastGoalVals[i] != null && UI.lastGoalVals[i] !== val) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
        UI.lastGoalVals[i] = val;
      });
      const st = UI.level.stars, max = st[2] || 1;
      $('#scorebar .fill').style.width = Math.min(100, g.score / max * 100) + '%';
      $('#scorebar .sc').textContent = fmt(g.score);
      document.querySelectorAll('#scorebar .st').forEach((e, i) => e.classList.toggle('on', g.score >= st[i] && (i > 0 || g.won || st[0] > 0)));
      if (UI.level.boss) $('#bossbar .hp i').style.width = Math.max(0, (1 - progressFraction()) * 100) + '%';
      document.querySelectorAll('#boosters .boost').forEach(b => {
        const k = b.dataset.k, n = S.data.boosters[k] || 0, lockd = UI.level.id < BOOSTERS[k].unlock;
        const nn = b.querySelector('.n'); nn.textContent = lockd ? '🔒' : n || '+'; nn.classList.toggle('plus', !n && !lockd);
        b.classList.toggle('active', UI.board.mode === k);
      });
    });
  }

  function setDabbu(mood, dance) {
    const d = $('#dabbuGame'); d.innerHTML = CH('dabbu', mood);
    if (dance) { d.classList.remove('dance'); void d.offsetWidth; d.classList.add('dance'); }
  }

  async function onBooster(k, btn) {
    const g = UI.game; if (!g || g.busy || g.over) return;
    if (UI.level.id < BOOSTERS[k].unlock) { UI.toast(T('Level ' + BOOSTERS[k].unlock + ' se khulega', 'Unlocks at level ' + BOOSTERS[k].unlock)); return; }
    if (UI.board.mode === k) { UI.board.mode = null; refreshHud(); return; }
    if (!S.data.boosters[k]) {
      const ok = await UI.confirm(BOOSTERS[k].name, BOOSTERS[k].desc + '<br><br>' + T('Khareedein', 'Buy for') + ' <b>' + BOOSTERS[k].price + ' coins</b>?', T('Khareedo', 'Buy'));
      if (!ok) return;
      if (!S.spend(BOOSTERS[k].price)) { UI.toast(T('Coins kam hain — Shop dekho', 'Not enough coins — visit the Shop')); return; }
      S.addBooster(k, 1); refreshTop();
    }
    if (k === 'shake') {
      S.useBooster('shake'); refreshHud();
      await g.shake(); refreshHud();
      return;
    }
    UI.board.mode = k;
    UI.toast(k === 'hammer' ? T('Jis piece ko todna hai us par tap karo', 'Tap a piece to smash') : T('Koi bhi do paas wale piece swipe karo', 'Swipe any two neighbours'));
    refreshHud();
  }

  async function onBoosterTarget(k, a, b) {
    const g = UI.game;
    if (k === 'hammer') {
      UI.board.mode = null;
      const ok = await g.hammer(a[0], a[1]);
      if (ok) S.useBooster('hammer');
    } else if (k === 'chimta') {
      UI.board.mode = null;
      const ok = await g.trySwap(a, b, true);
      if (ok) S.useBooster('chimta');
    }
    refreshHud();
  }

  async function onSwap(a, b) {
    const g = UI.game; if (!g) return;
    await g.trySwap(a, b);
    refreshHud();
    if (g.moves <= 5 && g.moves > 0 && !g.over) { AU.play('heartbeat'); AU.setUrgent(true); setDabbu('wow'); }
  }

  function onEvent(ev, d) {
    const F = FT();
    if (F) {
      if (ev === 'special' && !d.bonus) F.track(d.sp === 'd' ? 'dabba' : d.sp === 'k' ? 'kadhai' : 'belan');
      else if (ev === 'pop' && d.color >= 0) F.track('c' + d.color);
      else if (ev === 'matched' && d.combo === 4) F.track('combo4');
      else if (ev === 'blockBreak') F.track('blocks');
    }
    switch (ev) {
      case 'matched':
        if (d.combo >= 2) { const arr = PRAISE[Math.min(6, d.combo)]; praise(arr[Math.floor(Math.random() * arr.length)]); setDabbu('happy', d.combo >= 4); }
        break;
      case 'praise': praise(Math.random() < 0.5 ? 'Amazing!' : 'Lo ji!'); break;
      case 'goalDone': praise(UI.level.boss ? 'Fika bhaag gaya!' : 'Zabardast!'); AU.play('win'); setDabbu('happy', true); if (UI.level.boss) AU.play('boss'); break;
      case 'win': setTimeout(() => onWin(d), 500); break;
      case 'lose': setTimeout(onLose, 600); break;
      case 'blockBreak': if (UI.level && UI.level.boss) AU.play('boss'); break;
    }
    refreshHud();
  }

  // ---------- win / lose ----------
  async function onWin(d) {
    const g = UI.game, level = UI.level;
    const stars = g.stars();
    const ev = activeEvent();
    const E = CFG().economy;
    let coins = (E.winCoinsBase + stars * E.winCoinsPerStar + (level.boss ? E.bossBonus : 0)) * (ev ? ev.mult : 1);
    const firstTime = !S.data.stars[level.id];
    const starGain = Math.max(0, stars - (S.data.stars[level.id] || 0));
    if (!firstTime) coins = Math.round(coins * E.replayFactor);
    if (FT()) { FT().track('wins'); if (starGain) FT().track('stars', starGain); FT().onWin(); }
    if (BK()) BK().track('levelsWon');
    S.completeLevel(level.id, stars, g.score);
    S.addCoins(coins);
    praise('Chhaa gaye!');
    confetti();
    const card = modal(`<div class="rays"></div><div class="ribbon">Level ${level.id}</div><h2>${T('Chhaa gaye!', 'Brilliant!')}</h2>
      <div class="bigstars"><span>★</span><span>★</span><span>★</span></div>
      <div class="score-big">${fmt(g.score)}</div>
      <div class="coinsrow"><span class="ic">₹</span><span id="winCoins">0</span></div>${ev ? `<div><small>${ev.name}: 2x coins!</small></div>` : ''}
      <div class="row">${level.id >= 21 && M.canOfferRewarded() ? `<button class="btn blue small" data-double>▶ ${T('Ad dekho, coins double', 'Watch ad, double coins')}</button>` : ''}</div>
      <div class="row"><button class="btn grey" data-map>${T('Map', 'Map')}</button><button class="btn big" data-next>${level.id < LV.TOTAL ? T('Agla Level', 'Next') : T('Mela!', 'Finish')}</button></div>`, { noClose: true });
    const sp = card.querySelectorAll('.bigstars span');
    for (let i = 0; i < 3; i++) { await wait(380); if (i < stars) sp[i].classList.add('on'); sp[i].classList.add('show'); if (i < stars) AU.play('star', i); }
    const wc = card.querySelector('#winCoins');
    for (let i = 1; i <= 12; i++) { await wait(45); wc.textContent = Math.round(coins * i / 12); if (i % 3 === 0) AU.play('coin', i); }
    refreshTop();
    const db = card.querySelector('[data-double]');
    if (db) db.onclick = async () => { db.disabled = true; if (await M.rewarded()) { S.addCoins(coins); wc.textContent = coins * 2; AU.play('coin', 5); refreshTop(); } };
    const leave = async (next) => {
      await closeModal();
      await M.afterWin(level.id);
      if (level.id === 10 && !S.data.seen.boss1) { await playScene(D.SCENES.boss1); S.data.seen.boss1 = 1; S.save(); }
      if (level.id === LV.TOTAL) { await playScene(D.SCENES.finale); credits(); return; }
      endGame();
      if (next) { await lidTo('home', () => UI.home()); openLevel(level.id + 1); }
      else await lidTo('home', () => UI.home());
    };
    card.querySelector('[data-map]').onclick = () => leave(false);
    card.querySelector('[data-next]').onclick = () => leave(true);
  }

  async function onLose() {
    const g = UI.game, level = UI.level;
    AU.play('lose'); setDabbu('sad'); praise('Koi baat nahi, phir se!', true);
    const price = CFG().economy.chaiBreakCost + UI.extraMovesBought * CFG().economy.chaiBreakStep;
    const left = g.goalStatus().filter(s => !s.done).map(s => `<div class="goalcard"><img src="${ART.goalIcon(s.g, 96)}"><b>${s.g.t === 'score' ? fmt(s.need - s.have) : s.left}</b>${T('baaki', 'left')}</div>`).join('');
    const card = modal(`<div class="ribbon">Level ${level.id}</div><h2>${T('Bas thoda sa reh gaya!', 'So close!')}</h2>
      <div class="goalcards">${left}</div>
      <p>${T('Chhotu Chaiwala ki Chai Break lo — +5 chaalein!', 'Take a Chai Break from Chhotu — +5 moves!')}</p>
      <div class="row"><button class="btn orange" data-coins>${ICON.chai.replace('<svg', '<svg style="width:26px;height:26px;vertical-align:middle"')} +5 · ${price} coins</button></div>
      ${level.id >= 21 && M.canOfferRewarded() ? `<div class="row"><button class="btn blue small" data-ad>▶ ${T('Ad dekho, +5 chaalein', 'Watch ad, +5 moves')}</button></div>` : ''}
      <div class="row"><button class="btn grey small" data-quit>${T('Haar maano', 'Give up')}</button></div>`, { noClose: true });
    const cont = async () => { UI.extraMovesBought++; await closeModal(); g.addMoves(5); AU.setUrgent(false); setDabbu('happy'); refreshHud(); };
    card.querySelector('[data-coins]').onclick = () => { if (!S.spend(price)) { UI.toast(T('Coins kam hain', 'Not enough coins')); return; } refreshTop(); cont(); };
    const ad = card.querySelector('[data-ad]'); if (ad) ad.onclick = async () => { if (await M.rewarded()) cont(); };
    card.querySelector('[data-quit]').onclick = async () => {
      S.loseLife(); refreshTop(); if (FT()) FT().onGiveUp(); if (BK()) BK().track('levelsLost');
      await closeModal();
      const again = S.hasLife();
      const c2 = modal(`<div class="portrait">${CH('dabbu', 'sad')}</div><h2>${T('Koi baat nahi!', 'No worries!')}</h2><p>${T('Ek life gayi. Phir se koshish karein?', 'You lost a life. Try again?')}</p>
        <div class="row"><button class="btn grey" data-map>Map</button>${again ? `<button class="btn big" data-retry>${T('Dobara', 'Retry')}</button>` : ''}</div>`, { noClose: true });
      c2.querySelector('[data-map]').onclick = async () => { await closeModal(); endGame(); await lidTo('home', () => UI.home()); if (!S.hasLife()) livesPopup(); };
      const r = c2.querySelector('[data-retry]'); if (r) r.onclick = async () => { await closeModal(); endGame(); preLevel(LV.getLevel(level.id)); };
    };
  }

  function endGame() { if (G.MM_SCENES) G.MM_SCENES.stop(); if (UI.board) UI.board.stop(); UI.game = null; AU.setUrgent(false); }

  UI.pause = function () {
    const g = UI.game; if (!g) return;
    const card = modal(`<h2>${T('Ruko zara', 'Paused')}</h2>
      <div class="toggle">${T('Sangeet', 'Music')}<div class="sw ${S.data.settings.music ? 'on' : ''}" data-s="music"></div></div>
      <div class="toggle">${T('Awaaz', 'Sound')}<div class="sw ${S.data.settings.sfx ? 'on' : ''}" data-s="sfx"></div></div>
      <div class="row"><button class="btn big" data-res>${T('Khelte raho', 'Resume')}</button></div>
      <div class="row"><button class="btn orange small" data-restart>${T('Dobara shuru', 'Restart')}</button><button class="btn grey small" data-quit>${T('Map par jao', 'Quit')}</button></div>
      <p><small>${T('Beech mein chhodne par ek life jaayegi.', 'Leaving mid-level costs a life.')}</small></p>`);
    bindSwitches(card);
    card.querySelector('[data-res]').onclick = () => closeModal();
    const quitCost = () => { if (g.movesUsed > 0 && !g.won) { S.loseLife(); if (FT()) FT().onGiveUp(); } };
    card.querySelector('[data-restart]').onclick = async () => { quitCost(); await closeModal(); endGame(); if (!S.hasLife()) { await lidTo('home', () => UI.home()); livesPopup(); return; } preLevel(LV.getLevel(UI.level.id)); };
    card.querySelector('[data-quit]').onclick = async () => { quitCost(); await closeModal(); endGame(); await lidTo('home', () => UI.home()); };
  };

  function bindSwitches(card) {
    card.querySelectorAll('.sw').forEach(sw => sw.onclick = () => {
      const k = sw.dataset.s; S.data.settings[k] = !S.data.settings[k]; S.save(); sw.classList.toggle('on', S.data.settings[k]);
      if (k === 'music') AU.setMusic(S.data.settings.music);
      if (k === 'sfx') AU.setSfx(S.data.settings.sfx);
      if (k === 'voice') { AU.voiceOn = S.data.settings.voice; if (AU.voiceOn) AU.say('Wah!'); }
    });
  }

  // ---------- lives ----------
  function livesPopup() {
    S.tickLives();
    const full = S.data.lives >= S.MAX_LIVES;
    const card = modal(`<div class="portrait">${CH('dadi')}</div><h2>${T('Dadi Maa ki Dua', "Dadi Maa's Blessing")}</h2>
      <div class="hearts">${Array.from({ length: S.MAX_LIVES }, (_, i) => `<span class="${i < S.data.lives ? '' : 'empty'}">${G.MM_ICON('heart')}</span>`).join('')}</div>
      <p>${full ? T('Saari lives bhari hain!', 'Lives are full!') : T('Agli life', 'Next life in') + ' <b data-lifetime></b>'}</p>
      ${full ? '' : `<div class="row"><button class="btn orange" data-refill>${T('Saari lives', 'Refill all')} · ${CFG().economy.refillLivesCost} coins</button></div>
      <div class="row">${M.canOfferRewarded() ? `<button class="btn blue small" data-ad>▶ ${T('Ad dekho, +1 life', 'Watch ad, +1 life')}</button>` : ''}<button class="btn pink small" data-ask>${T('Dost se maango', 'Ask a friend')}</button></div>`}`, { bgClose: true });
    refreshTop();
    const r = card.querySelector('[data-refill]');
    if (r) r.onclick = () => { if (!S.spend(CFG().economy.refillLivesCost)) { UI.toast(T('Coins kam hain', 'Not enough coins')); return; } S.addLives(5); AU.play('life'); refreshTop(); closeModal(); };
    const a = card.querySelector('[data-ad]');
    if (a) a.onclick = async () => { if (await M.rewarded()) { S.addLives(1); AU.play('life'); refreshTop(); closeModal(); } };
    const ask = card.querySelector('[data-ask]');
    if (ask) ask.onclick = () => share(T('Masala Mela khelo mere saath! Desi khaane ka match-3 game.', 'Play Masala Mela with me! A desi food match-3 game.'));
  }
  UI.livesPopup = livesPopup;

  async function share(text) {
    const url = 'https://play.google.com/store/apps/details?id=com.deificdigital.masalamela';
    try {
      const Sh = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.Share;
      if (Sh) await Sh.share({ title: 'Masala Mela', text, url });
      else if (navigator.share) await navigator.share({ title: 'Masala Mela', text, url });
      else { await navigator.clipboard.writeText(text + ' ' + url); UI.toast(T('Link copy ho gaya!', 'Link copied!')); }
    } catch (e) { /* cancelled */ }
  }

  // ---------- shop ----------
  function shopPopup() {
    const noAdsP = M.PRODUCTS.find(p => p.noAds);
    const noAdsHtml = `<div class="pack" style="grid-column:1/-1;display:flex;align-items:center;gap:10px;text-align:left;padding:10px 14px"><div class="bigicon sm">${G.MM_ICON('shop')}</div><div style="flex:1"><b>${T('Ads Hatao', 'Remove Ads')}</b><small>${T('Level ke beech wale ads hamesha ke liye band + 1,000 coins. Inaam wale ads aap chahein to dekh sakte hain.', 'No more between-level ads, forever, + 1,000 coins. Reward ads stay optional.')}</small></div>${S.data.noAds ? `<b style="color:var(--green)">${T('Kharida ✓', 'Owned ✓')}</b>` : `<button class="btn small" data-buy="${noAdsP.id}">${M.localPrice(noAdsP.id)}</button>`}</div>`;
    const packs = noAdsHtml + M.PRODUCTS.filter(p => !p.noAds).map(p => `<div class="pack">${p.id === CFG().shop.featured ? `<span class="tag">${CFG().shop.offerText || T('Sabse achha', 'Best value')}</span>` : ''}<b>${p.name}</b><div class="c">${G.MM_ICON('coin')}${fmt(p.coins)}</div>
      <div class="inc">${Object.entries(p.boosters).map(([k, n]) => n + '× ' + BOOSTERS[k].name.split(' ').pop()).join(', ')}${p.infiniteLivesMin ? '<br>+ ' + (p.infiniteLivesMin >= 1440 ? '24h' : '1h') + ' ∞ lives' : ''}</div>
      <button class="btn small" data-buy="${p.id}">${M.localPrice(p.id)}</button></div>`).join('');
    const items = Object.entries(BOOSTERS).map(([k, b]) => `<div class="bitem"><div class="boost">${boosterIcon(k)}<span class="n">${S.data.boosters[k] || 0}</span></div><div class="t"><b>${b.name}</b>${b.desc}</div><button class="btn orange small" data-coin="${k}">${G.MM_ICON('coin')}${b.price}</button></div>`).join('');
    const card = modal(`<div class="ribbon">${T('Dukaan', 'Shop')}</div><div class="coinsrow"><span class="ic">₹</span><span data-coins></span></div>
      <div class="shopgrid">${packs}</div><h3>${T('Boosters (coins se)', 'Boosters (with coins)')}</h3><div class="blist">${items}</div>
      <p><small>${T('Keematein store ke hisaab se dikhengi.', 'Prices shown are from the store.')}</small></p><div class="row"><button class="btn grey small" data-restore>${T('Purchases restore karo', 'Restore purchases')}</button></div>`, { bgClose: true });
    card.querySelector('[data-restore]').onclick = () => M.restore();
    refreshTop();
    card.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => M.buy(b.dataset.buy));
    card.querySelectorAll('[data-coin]').forEach(b => b.onclick = () => {
      const k = b.dataset.coin;
      if (!S.spend(BOOSTERS[k].price)) { UI.toast(T('Coins kam hain', 'Not enough coins')); return; }
      S.addBooster(k, 1); AU.play('coin'); refreshTop(); b.closest('.bitem').querySelector('.n').textContent = S.data.boosters[k];
    });
  }
  UI.grantPack = function (p) {
    if (p.noAds) { if (S.data.noAds) { return; } S.data.noAds = true; }
    S.addCoins(p.coins);
    Object.entries(p.boosters).forEach(([k, n]) => S.addBooster(k, n));
    if (p.infiniteLivesMin) { S.data.infiniteUntil = Math.max(Date.now(), S.data.infiniteUntil) + p.infiniteLivesMin * 60000; S.addLives(5); }
    S.save(); refreshTop(); AU.play('coin', 6); confetti(1500);
    UI.toast(p.name + T(' mil gaya! Shukriya!', ' received! Thank you!'));
  };

  // ---------- daily ----------
  function dailyPopup(auto) {
    const avail = S.dailyAvailable(), day = avail ? S.dailyDay() : (S.data.daily.streak - 1) % 7;
    const cells = S.DAILY.map((r, i) => `<div class="d ${i === day && avail ? 'today' : ''} ${i < day || (!avail && i <= day) ? 'got' : ''} ${i === 6 ? 'big' : ''}"><small>${T('Din', 'Day')} ${i + 1}</small><b>${G.MM_ICON(r.booster ? 'gift' : 'coin')}</b>${r.coins ? r.coins : ''}${r.booster ? (r.coins ? '+' : '') + BOOSTERS[r.booster].name.split(' ').pop() : ''}</div>`).join('');
    const card = modal(`<div class="ribbon">${T('Roz ka Inaam', 'Daily Reward')}</div><p class="sub">${T('Roz aao, streak banao — 7ve din bada inaam!', 'Come daily — big reward on day 7!')}</p>
      <div class="daily">${cells}</div>
      ${avail ? `<div class="row"><button class="btn big" data-claim>${T('Inaam lo', 'Claim')}</button></div>${S.data.level >= 21 && M.canOfferRewarded() ? `<div class="row"><button class="btn blue small" data-double>▶ ${T('Ad dekho, double inaam', 'Watch ad, double reward')}</button></div>` : ''}`
        : `<p>${T('Kal phir aana! Streak mat todna.', 'Come back tomorrow! Keep your streak.')}</p>`}`, { bgClose: true });
    const claim = async mult => { const { r } = S.claimDaily(mult); AU.play('coin', 4); confetti(1200); refreshTop(); await closeModal(); UI.toast(T('Inaam mil gaya: ', 'You got: ') + (r.coins ? r.coins * mult + ' coins ' : '') + (r.booster ? '+ ' + r.n * mult + ' ' + BOOSTERS[r.booster].name : '')); };
    const c = card.querySelector('[data-claim]'); if (c) c.onclick = () => claim(1);
    const d = card.querySelector('[data-double]'); if (d) d.onclick = async () => { if (await M.rewarded()) claim(2); };
  }

  // ---------- events ----------
  function eventsPopup() {
    const ev = activeEvent(), nx = nextEvent();
    modal(`<div class="ribbon">${T('Tyohaar', 'Events')}</div>
      ${ev ? `<div class="event"><b>🎉 ${ev.name}</b>${ev.desc}<br><small>${T('Khatam', 'Ends')}: ${ev.to}</small></div>` : `<p>${T('Abhi koi event nahi chal raha.', 'No event is running right now.')}</p>`}
      ${nx ? `<div class="event" style="opacity:.8"><b>${T('Agla', 'Next')}: ${nx.name}</b>${nx.desc}<br><small>${T('Shuru', 'Starts')}: ${nx.from}</small></div>` : ''}
      <h3>${T('Dost ko bulao', 'Invite friends')}</h3><p>${T('Dost ke saath khelo, lives bhejo-maango.', 'Play with friends and share lives.')}</p>
      <div class="row"><button class="btn pink" data-inv>${T('Invite bhejo', 'Send invite')}</button></div>`, { bgClose: true }).querySelector('[data-inv]').onclick = () => share(T('Masala Mela khelo! Desi khaane ka match-3 game.', 'Play Masala Mela! A desi food match-3 game.'));
  }

  // ---------- profile / settings ----------
  function profilePopup() {
    const d = S.data;
    const u = BK() && BK().user;
    const acct = u ? (u.provider === 'guest' ? T('Guest khiladi (sirf is phone par)', 'Guest (this phone only)') : u.phone ? u.phone : u.email || u.provider) : '';
    const card = modal(`<div class="portrait">${CH('meethi')}</div><h2>${T('Profile', 'Profile')}</h2>
      <input class="name" maxlength="18" value="${d.name.replace(/"/g, '')}">
      ${u ? `<div class="acct">${G.MM_ICON(u.provider === 'google' ? 'google' : u.provider === 'phone' ? 'phone' : 'profile')}<span>${acct}</span><button class="btn small grey" data-logout>${u.provider === 'guest' ? T('Login karo', 'Log in') : T('Logout', 'Log out')}</button></div>` : ''}
      <p>⭐ ${S.totalStars()} · Level ${d.level} · ${T('Jeete', 'Won')} ${d.stats.won}</p>
      <div class="toggle">${T('Sangeet', 'Music')}<div class="sw ${d.settings.music ? 'on' : ''}" data-s="music"></div></div>
      <div class="toggle">${T('Awaaz (effects)', 'Sound effects')}<div class="sw ${d.settings.sfx ? 'on' : ''}" data-s="sfx"></div></div>
      <div class="toggle">${T('Hindi bolne wali awaaz', 'Spoken praise (Hindi)')}<div class="sw ${d.settings.voice ? 'on' : ''}" data-s="voice"></div></div>
      <div class="toggle">${T('Bhasha', 'Language')}<button class="btn small blue" data-lang>${d.settings.lang === 'en' ? 'English' : 'Hinglish'}</button></div>
      <div class="links"><a href="privacy.html" target="_blank">Privacy Policy</a> · <a href="terms.html" target="_blank">Terms</a> · <a href="mailto:hello@deificdigital.com?subject=Masala%20Mela%20support">Support</a></div>
      <div class="row"><button class="btn grey small" data-reset>${T('Progress mitao', 'Reset progress')}</button>${u && u.provider !== 'guest' ? `<button class="btn grey small" data-delacct>${T('Account delete karo', 'Delete account')}</button>` : ''}</div>
      ${!(G.Capacitor && G.Capacitor.isNativePlatform && G.Capacitor.isNativePlatform()) ? `<div class="links"><a href="#admin">Admin panel (Deific Digital team)</a></div>` : ''}
      <p><small>Masala Mela v${VERSION}<br>© ${new Date().getFullYear()} Deific Digital · www.deificdigital.com</small></p>`, { bgClose: true });
    bindSwitches(card);
    const lo = card.querySelector('[data-logout]');
    if (lo) lo.onclick = async () => { await closeModal(); await BK().signOut(); show('none'); const nu = await FT().loginScreen(); await FT().afterLogin(nu); UI.home(); };
    const inp = card.querySelector('input.name');
    inp.onchange = () => { d.name = inp.value.trim() || 'Khiladi'; S.save(); };
    card.querySelector('[data-lang]').onclick = async () => { d.settings.lang = d.settings.lang === 'en' ? 'hi' : 'en'; S.save(); await closeModal(); applyLang(); UI.home(); };
    const da = card.querySelector('[data-delacct]');
    if (da) da.onclick = async () => {
      await closeModal();
      if (await UI.confirm(T('Account delete karein?', 'Delete your account?'), T('Aapka account, cloud progress aur leaderboard naam hamesha ke liye mit jaayega. Ye wapas nahi hoga.', 'Your account, cloud progress and leaderboard entry will be permanently deleted. This cannot be undone.'), T('Haan, delete karo', 'Yes, delete'))) {
        await BK().deleteAccount(); S.reset(); show('none'); const nu = await FT().loginScreen(); await FT().afterLogin(nu); UI.home();
      }
    };
    card.querySelector('[data-reset]').onclick = async () => {
      await closeModal();
      if (await UI.confirm(T('Pakka?', 'Are you sure?'), T('Saara progress, coins aur stars mit jaayenge.', 'All progress, coins and stars will be erased.'), T('Haan, mitao', 'Yes, erase'))) { S.reset(); UI.home(); }
    };
  }

  function credits() {
    endGame();
    const card = modal(`<div class="rays"></div><div class="portrait">${CH('seth', 'happy')}</div><h2>Mela shuru!</h2>
      <p>${T('Aapne saare 150 level jeet liye aur India ka swaad wapas le aaye. Fika Seth bhi ab halwa banata hai!', 'You beat all 150 levels and brought back the taste of India. Even Fika Seth makes halwa now!')}</p>
      <p><b>${T('Naye levels jaldi aa rahe hain!', 'New levels coming soon!')}</b></p>
      <p><small>A game by <b>Deific Digital</b><br>www.deificdigital.com</small></p>
      <div class="row"><button class="btn big" data-ok>${T('Map', 'Map')}</button></div>`, { noClose: true });
    confetti(4000);
    card.querySelector('[data-ok]').onclick = async () => { await closeModal(); await lidTo('home', () => UI.home()); };
  }

  function applyLang() {
    document.querySelectorAll('[data-t]').forEach(e => { const [hi, en] = e.dataset.t.split('|'); e.textContent = T(hi, en); });
  }

  // ---------- back button ----------
  UI.back = async function () {
    if (UI.dialogSkip) { UI.dialogSkip(); return; }
    if (UI.modalOpen) { if ($('#modal .x')) closeModal(UI.modalOnClose); return; }
    if (UI.cur === 'game') { UI.pause(); return; }
    if (UI.cur === 'home') {
      if (await UI.confirm(T('Game band karein?', 'Exit game?'), T('Kal phir aana — Kismat ka Kadhai intezaar karega!', 'Come back tomorrow for your daily reward!'), T('Band karo', 'Exit'), T('Khelte raho', 'Stay'))) {
        const App = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.App; if (App) App.exitApp();
      }
    }
  };

  // ---------- boot ----------
  UI.boot = async function () {
    S.load();
    AU.musicOn = S.data.settings.music; AU.sfxOn = S.data.settings.sfx; AU.voiceOn = S.data.settings.voice;
    applyLang();
    document.querySelectorAll('[data-icon]').forEach(e => { e.innerHTML = G.MM_ICON(e.dataset.icon); });
    UI.board = new G.MM_BoardView($('#board'), { onEvent, onSwap, onBoosterTarget, onCombo: () => {} });
    M.init(p => UI.grantPack(p));
    // splash
    $('#splash .dabbu').innerHTML = CH('dabbu');
    const bar = $('#splash .loadbar');
    bar.style.width = '8%';
    try { if (BK()) await BK().init(); } catch (e) { console.warn('backend offline', e); }
    // build the 3D art (falls back to 2D art if WebGL is missing)
    let ok3d = false;
    try { ok3d = G.MM_ART3D ? await G.MM_ART3D.build(f => { bar.style.width = (8 + f * 78) + '%'; }) : false; } catch (e) { console.warn('3D art unavailable', e); }
    try { if (ok3d && G.MM_CHARS3D) { await G.MM_CHARS3D.build(); bar.style.width = '96%'; } } catch (e) { console.warn('3D characters unavailable', e); }
    if (!ok3d) { for (let i = 1; i <= 10; i++) { await wait(80); bar.style.width = i * 10 + '%'; } [48, 64, 80, 96].forEach(s => { for (let c = 0; c < 6; c++) ART.piece(c, s); }); }
    bar.style.width = '100%';
    $('#splash .dabbu').innerHTML = CH('dabbu');
    $('#splash .hint').textContent = T('Swaad mil gaya!', 'Taste found!');
    const tap = $('#tapStart'); tap.style.display = 'inline-block';
    tap.onclick = async () => {
      AU.init(); AU.setMusic(S.data.settings.music); AU.setSfx(S.data.settings.sfx);
      const B = BK(), F = FT();
      if (CFG().maintenance && CFG().maintenance.on) { show('none'); F.blockScreen(T('Thoda intezaar', 'Back soon'), CFG().maintenance.message); return; }
      let user = B ? B.user : null;
      if (B && !user) { show('none'); user = await F.loginScreen(); }
      if (B && user) { const st = await F.afterLogin(user); if (st === 'banned') { F.blockScreen(T('Account band hai', 'Account suspended'), T('Is account ko niyam todne ke kaaran band kiya gaya hai.', 'This account was suspended for breaking the rules.')); return; } }
      await lidTo('home', () => UI.home());
      if (S.data.level === 1 && !S.data.seen.intro) setTimeout(() => openLevel(1), 400);
      else setTimeout(() => { if (S.dailyAvailable()) dailyPopup(true); else if (F) F.announcement(); }, 500);
    };
    // wiring
    $('#playBtn').onclick = () => openLevel(S.data.level);
    $('#pauseBtn').onclick = () => UI.pause();
    const F = FT();
    const opens = { lives: livesPopup, shop: shopPopup, daily: dailyPopup, events: eventsPopup, profile: profilePopup, map: () => UI.scrollMap && UI.scrollMap(),
      missions: () => F.missionsPopup(), wheel: () => F.wheelPopup(), chest: () => F.openChest(), starchest: () => F.openStarChest(), leaderboard: () => F.leaderboardPopup(), inbox: () => F.inboxPopup() };
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => opens[b.dataset.open]());
    document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) AU.ctx.suspend(); else AU.ctx.resume(); });
    const App = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.App;
    if (App) App.addListener('backButton', () => UI.back());
    window.addEventListener('keydown', e => { if (e.key === 'Escape') UI.back(); });
    try { const SB = G.Capacitor && G.Capacitor.Plugins.SplashScreen; if (SB) SB.hide(); } catch (e) { /* */ }
  };

  Object.assign(UI, { modal, h, T, fmt, fmtTime, wait, refreshTop, confetti, BOOSTERS, show, lidTo, livesPopup, shopPopup, dailyPopup, eventsPopup, profilePopup, openLevel });
  G.MM_UI = UI;
})(window);
