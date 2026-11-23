/* Masala Mela — Admin panel. Works with MM_BACKEND (Firebase or local demo).
 * Pages: Dashboard, Players, Live Config (ads/economy/rewards/wheel/missions/chests),
 * Events, Levels, Messages & Gifts, Setup. (c) Deific Digital */
(function (G) {
  'use strict';
  const B = () => G.MM_BACKEND, A = () => G.MM_BACKEND.admin, C = () => G.MM_CONFIG;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = n => Math.round(+n || 0).toLocaleString('en-IN');
  const inr = n => '₹' + fmt(n);
  const ago = ts => { if (!ts) return '—'; const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'abhi' : m < 60 ? m + ' min pehle' : m < 1440 ? Math.round(m / 60) + ' ghante pehle' : Math.round(m / 1440) + ' din pehle'; };
  const clone = o => JSON.parse(JSON.stringify(o));
  let root, page = 'dash', draft = null;

  function toast(t) { const d = document.createElement('div'); d.className = 'toast2'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2400); }

  // ---------------- charts (single y-axis, hover tooltips) ----------------
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function lineChart(el, o) {
    const W = Math.max(300, Math.round(el.clientWidth || 640)), H = 220, L = 46, Rr = 12, T = 12, Bt = 26;
    const all = o.series.flatMap(s => s.values), max = niceMax(Math.max(1, ...all));
    const x = i => L + (W - L - Rr) * (o.labels.length === 1 ? 0.5 : i / (o.labels.length - 1)), y = v => T + (H - T - Bt) * (1 - v / max);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); g += `<line x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}" stroke="var(--grid)" stroke-width="1"/><text class="ax" x="${L - 8}" y="${yy + 4}" text-anchor="end">${o.fmt ? o.fmt(v) : fmt(v)}</text>`; }
    const step = Math.ceil(o.labels.length / 6);
    o.labels.forEach((lb, i) => { if (i % step === 0 || i === o.labels.length - 1) g += `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(lb)}</text>`; });
    o.series.forEach(s => {
      const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      if (o.series.length === 1) g += `<polygon points="${L},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}" fill="${s.color}" opacity=".10"/>`;
      g += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const li = s.values.length - 1; g += `<circle cx="${x(li)}" cy="${y(s.values[li])}" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
    });
    el.innerHTML = (o.series.length > 1 ? `<div class="legend">${o.series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '') +
      `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || '')}">${g}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - Bt}" stroke="var(--ad-ink2)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/><rect x="${L}" y="${T}" width="${W - L - Rr}" height="${H - T - Bt}" fill="transparent"/></svg><div class="tip"></div></div>`;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
    const move = e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      const i = Math.max(0, Math.min(o.labels.length - 1, Math.round((px - L) / ((W - L - Rr) / Math.max(1, o.labels.length - 1)))));
      xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', '.6');
      tip.innerHTML = `<b>${esc(o.labels[i])}</b><br>` + o.series.map(s => `${esc(s.name)}: ${o.fmt ? o.fmt(s.values[i]) : fmt(s.values[i])}`).join('<br>');
      tip.style.left = (x(i) / W * 100) + '%'; tip.style.top = (y(Math.max(...o.series.map(s => s.values[i]))) / H * 100) + '%'; tip.classList.add('on');
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerleave', () => { tip.classList.remove('on'); xh.setAttribute('opacity', '0'); });
  }
  function barChart(el, o) {
    const W = Math.max(300, Math.round(el.clientWidth || 640)), H = 220, L = 46, Rr = 12, T = 12, Bt = 26, n = o.values.length;
    const max = niceMax(Math.max(1, ...o.values)), bw = (W - L - Rr) / n, y = v => T + (H - T - Bt) * (1 - v / max);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); g += `<line x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}" stroke="var(--grid)"/><text class="ax" x="${L - 8}" y="${yy + 4}" text-anchor="end">${o.fmt ? o.fmt(v) : fmt(v)}</text>`; }
    const step = Math.ceil(n / 6);
    o.values.forEach((v, i) => {
      const bx = L + i * bw + 1, w = Math.max(2, bw - 2), top = y(v), h = Math.max(0, y(0) - top), r = Math.min(4, w / 2, h);
      g += `<path data-i="${i}" d="M${bx},${y(0)} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + w - r} Q${bx + w},${top} ${bx + w},${top + r} V${y(0)} Z" fill="${o.color}"/>`;
      if (i % step === 0 || i === n - 1) g += `<text class="ax" x="${bx + w / 2}" y="${H - 6}" text-anchor="middle">${esc(o.labels[i])}</text>`;
    });
    el.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || '')}">${g}</svg><div class="tip"></div></div>`;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip');
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, i = Math.max(0, Math.min(n - 1, Math.floor((px - L) / bw)));
      tip.innerHTML = `<b>${esc(o.labels[i])}</b><br>${o.fmt ? o.fmt(o.values[i]) : fmt(o.values[i])}`;
      tip.style.left = ((L + i * bw + bw / 2) / W * 100) + '%'; tip.style.top = (y(o.values[i]) / H * 100) + '%'; tip.classList.add('on');
    });
    svg.addEventListener('pointerleave', () => tip.classList.remove('on'));
  }

  // ---------------- shell ----------------
  const NAV = [['dash', '◧', 'Dashboard'], ['players', '☺', 'Players'], ['config', '⚙', 'Live Config'], ['events', '✦', 'Events'], ['levels', '▦', 'Levels'], ['messages', '✉', 'Gifts & Messages'], ['setup', '?', 'Setup']];
  function shell() {
    root.innerHTML = `<aside class="ad-side"><div class="ad-brand"><span class="mk">M</span><div><b>Masala Mela</b><small>Admin · Deific Digital</small></div></div>
      <nav class="ad-nav">${NAV.map(([k, i, t]) => `<button data-p="${k}" class="${k === page ? 'on' : ''}"><span class="ni">${i}</span>${t}</button>`).join('')}</nav>
      <div class="ad-sidefoot"><span class="ad-mode ${B().mode}">${B().mode === 'firebase' ? 'Live · Firebase' : 'Demo mode'}</span><br>${esc(A().email || '')}<br><button class="abtn sm" data-logout style="margin-top:8px">Logout</button></div></aside>
      <main class="ad-main" id="adMain"></main>`;
    root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { page = b.dataset.p; shell(); });
    root.querySelector('[data-logout]').onclick = async () => { await A().logout(); login(); };
    ({ dash, players, config, events, levels, messages, setup })[page]();
  }
  const main = () => root.querySelector('#adMain');
  const head = (t, sub, actions) => `<div class="ad-head"><div><h1>${t}</h1><p>${sub}</p></div><div class="ad-actions">${actions || ''}</div></div>`;

  // ---------------- login ----------------
  function login() {
    root.innerHTML = `<div class="ad-login"><span class="ad-mode ${B().mode}">${B().mode === 'firebase' ? 'Live · Firebase' : 'Demo mode'}</span>
      <h1>Masala Mela Admin</h1><p>Deific Digital ki team ke liye.</p>
      <form id="adLogin"><label>Email<input id="adEmail" type="email" autocomplete="username" required></label>
      <label>Password<input id="adPass" type="password" autocomplete="current-password" required></label>
      <p class="err" id="adErr"></p><button class="abtn primary" style="width:100%">Login</button></form>
      ${B().mode === 'local' ? `<div class="demo">Demo login: <b>admin@deificdigital.com</b> / <b>mela@2026</b><br>Firebase jodne ke baad asli admin account se login hoga.</div>` : ''}
      <p style="margin-top:14px;font-size:13px"><a href="#" id="adBack">‹ Game par wapas</a></p></div>`;
    root.querySelector('#adBack').onclick = e => { e.preventDefault(); if (/\/admin\//.test(G.location.pathname)) G.location.href = '../index.html'; else { G.location.hash = ''; G.location.reload(); } };
    root.querySelector('#adLogin').onsubmit = async e => {
      e.preventDefault();
      try { await A().login(root.querySelector('#adEmail').value.trim(), root.querySelector('#adPass').value); page = 'dash'; shell(); }
      catch (x) { root.querySelector('#adErr').textContent = x.message; }
    };
  }

  // ---------------- dashboard ----------------
  async function dash() {
    main().innerHTML = head('Dashboard', 'Aaj aur pichhle 30 din ka haal.', B().mode === 'local' ? '<button class="abtn sm" data-seed>Demo data bharo</button><button class="abtn sm" data-clear>Demo data hatao</button>' : '') + '<div class="empty">Load ho raha hai…</div>';
    const [stats, users] = await Promise.all([A().stats(30), A().users()]);
    const t = stats[stats.length - 1] || {}, y = stats[stats.length - 2] || {};
    const sum = (k, arr) => (arr || stats).reduce((a, s) => a + (s[k] || 0), 0);
    const delta = (a, b) => b ? `<span class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}%</span> kal se` : '';
    const demoShown = stats.some(s => s.demo) || users.some(u => u.demo);
    const winRate = t.levelsPlayed ? Math.round((t.levelsWon || 0) / t.levelsPlayed * 100) : 0;
    const arpdau = t.dau ? (t.revenueInr || 0) / t.dau : 0;
    const labels = stats.map(s => s.day.slice(8) + '/' + s.day.slice(5, 7));
    // funnel: players by world reached
    const worlds = G.MM_DATA.WORLDS.map((W, i) => ({ name: (i + 1) + '. ' + W.name, n: users.filter(u => Math.ceil((u.level || 1) / 15) >= i + 1).length }));
    const top = users.filter(u => u.spentInr).sort((a, b) => b.spentInr - a.spentInr).slice(0, 6);
    main().innerHTML = head('Dashboard', 'Aaj aur pichhle 30 din ka haal.' + (demoShown ? ' <span class="pill2 demo">DEMO DATA</span>' : ''), B().mode === 'local' ? '<button class="abtn sm" data-seed>Demo data bharo</button><button class="abtn sm" data-clear>Demo data hatao</button>' : '') + `
      <div class="ad-grid kpis">
        <div class="kpi"><div class="lb">Kul players</div><div class="v">${fmt(users.length)}</div><div class="d">+${fmt(t.newUsers || 0)} aaj naye</div></div>
        <div class="kpi"><div class="lb">Aaj active (DAU)</div><div class="v">${fmt(t.dau || 0)}</div><div class="d">${delta(t.dau || 0, y.dau || 0)}</div></div>
        <div class="kpi"><div class="lb">Aaj ki kamai (IAP)</div><div class="v">${inr(t.revenueInr || 0)}</div><div class="d">${fmt(t.iapCount || 0)} purchases</div></div>
        <div class="kpi"><div class="lb">30 din ki kamai</div><div class="v">${inr(sum('revenueInr'))}</div><div class="d">IAP, ads alag (AdMob mein)</div></div>
        <div class="kpi"><div class="lb">Aaj ke ads</div><div class="v">${fmt((t.adsRewarded || 0) + (t.adsInterstitial || 0))}</div><div class="d">${fmt(t.adsRewarded || 0)} inaam · ${fmt(t.adsInterstitial || 0)} full-screen</div></div>
        <div class="kpi"><div class="lb">Level jeet dar</div><div class="v">${winRate}%</div><div class="d">${fmt(t.levelsPlayed || 0)} level khele gaye</div></div>
        <div class="kpi"><div class="lb">ARPDAU (IAP)</div><div class="v">₹${arpdau.toFixed(2)}</div><div class="d">kamai ÷ active players</div></div>
      </div>
      <div class="ad-grid two">
        <div class="panel"><h3>Roz ke active players</h3><p class="hint">Pichhle 30 din</p><div id="chDau"></div></div>
        <div class="panel"><h3>Roz ki kamai (₹)</h3><p class="hint">In-app purchases, Google/Apple fee se pehle</p><div id="chRev"></div></div>
        <div class="panel"><h3>Ads per din</h3><p class="hint">Inaam wale vs full-screen</p><div id="chAds"></div></div>
        <div class="panel funnel"><h3>Players kahan tak pahunche</h3><p class="hint">Har world tak pahunchne wale players. Bada girav = level mushkil hai.</p>
          ${worlds.map(w => `<div class="bar2"><span>${esc(w.name)}</span><div class="track"><i style="width:${users.length ? Math.round(w.n / users.length * 100) : 0}%"></i></div><span class="n">${fmt(w.n)}</span></div>`).join('')}</div>
      </div>
      <div class="panel" style="margin-top:14px"><h3>Sabse zyada kharch karne wale</h3><div class="tbl-wrap">${top.length ? `<table class="tbl"><thead><tr><th>Naam</th><th>Level</th><th class="num">Kharch</th><th>Last seen</th></tr></thead><tbody>${top.map(u => `<tr><td>${esc(u.name)}</td><td>${u.level || 1}</td><td class="num">${inr(u.spentInr)}</td><td>${ago(u.lastSeen)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Abhi koi purchase nahi.</div>'}</div></div>`;
    lineChart(main().querySelector('#chDau'), { labels, series: [{ name: 'DAU', values: stats.map(s => s.dau || 0), color: 'var(--series-1)' }], title: 'Daily active players' });
    barChart(main().querySelector('#chRev'), { labels, values: stats.map(s => s.revenueInr || 0), color: 'var(--series-1)', fmt: inr, title: 'Daily revenue' });
    lineChart(main().querySelector('#chAds'), { labels, series: [{ name: 'Inaam wale (rewarded)', values: stats.map(s => s.adsRewarded || 0), color: 'var(--series-1)' }, { name: 'Full-screen (interstitial)', values: stats.map(s => s.adsInterstitial || 0), color: 'var(--series-2)' }], title: 'Ads per day' });
    const sd = main().querySelector('[data-seed]'); if (sd) sd.onclick = () => { A().seedDemo(); toast('Demo data bhar diya'); dash(); };
    const cl = main().querySelector('[data-clear]'); if (cl) cl.onclick = () => { A().clearDemo(); toast('Demo data hata diya'); dash(); };
  }

  // ---------------- players ----------------
  async function players() {
    main().innerHTML = head('Players', 'Khoj, gift bhejo, ban ya reset karo.') + `<div class="search"><input id="pq" type="search" placeholder="Naam, phone ya email se khojo"><select id="pf"><option value="">Sab</option><option value="phone">Phone</option><option value="google">Google</option><option value="guest">Guest</option><option value="banned">Banned</option><option value="payer">Paying</option></select></div><div class="panel"><div class="tbl-wrap" id="ptbl"><div class="empty">Load ho raha hai…</div></div></div>`;
    const all = await A().users();
    const render = () => {
      const q = main().querySelector('#pq').value.toLowerCase(), f = main().querySelector('#pf').value;
      const list = all.filter(u => (!q || [u.name, u.phone, u.email].some(x => (x || '').toLowerCase().includes(q))) && (!f || (f === 'banned' ? u.banned : f === 'payer' ? u.spentInr > 0 : u.provider === f)));
      main().querySelector('#ptbl').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>Naam</th><th>Login</th><th>Phone / Email</th><th class="num">Level</th><th class="num">Stars</th><th class="num">Coins</th><th class="num">Kharch</th><th>Last seen</th><th>Status</th></tr></thead><tbody>
        ${list.slice(0, 300).map(u => `<tr class="click" data-u="${esc(u.uid)}"><td><b>${esc(u.name)}</b> ${u.demo ? '<span class="pill2 demo">demo</span>' : ''}</td><td><span class="pill2 ${esc(u.provider)}">${esc(u.provider)}</span></td><td>${esc(u.phone || u.email || '—')}</td><td class="num">${u.level || 1}</td><td class="num">${u.stars || 0}</td><td class="num">${fmt(u.coins)}</td><td class="num">${u.spentInr ? inr(u.spentInr) : '—'}</td><td>${ago(u.lastSeen)}</td><td>${u.banned ? '<span class="pill2 ban">Banned</span>' : '<span class="pill2 ok">Active</span>'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Koi player nahi mila.</div>';
      main().querySelectorAll('[data-u]').forEach(tr => tr.onclick = () => drawer(all.find(u => u.uid === tr.dataset.u), () => players()));
    };
    main().querySelector('#pq').oninput = render; main().querySelector('#pf').onchange = render;
    render();
  }
  function drawer(u, onDone) {
    const d = document.createElement('div'); d.className = 'drawer';
    d.innerHTML = `<div class="dr"><h2>${esc(u.name)}</h2><span class="pill2 ${esc(u.provider)}">${esc(u.provider)}</span> ${u.banned ? '<span class="pill2 ban">Banned</span>' : ''}
      <div class="kv"><span>User ID</span><b>${esc(u.uid)}</b><span>Phone / Email</span><b>${esc(u.phone || u.email || '—')}</b><span>Level</span><b>${u.level || 1}</b><span>Stars</span><b>${u.stars || 0}</b><span>Coins</span><b>${fmt(u.coins)}</b><span>Kharch</span><b>${u.spentInr ? inr(u.spentInr) : '—'}</b><span>Join kiya</span><b>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</b><span>Last seen</span><b>${ago(u.lastSeen)}</b></div>
      <h3 style="margin-top:14px">Gift bhejo</h3><div class="form" style="margin-top:8px"><label>Coins<input id="gC" type="number" min="0" value="500"></label><label>Lives<input id="gL" type="number" min="0" value="0"></label><label>Hammer<input id="gH" type="number" min="0" value="0"></label><label>Shake<input id="gS" type="number" min="0" value="0"></label><label class="full">Message<input id="gT" value="Masala Mela ki taraf se tohfa!"></label></div>
      <div class="ad-actions" style="margin-top:10px"><button class="abtn primary" data-gift>Gift bhejo</button></div>
      <h3 style="margin-top:18px">Account</h3><div class="ad-actions" style="margin-top:8px">
      <button class="abtn ${u.banned ? 'good' : 'danger'}" data-ban>${u.banned ? 'Unban karo' : 'Ban karo'}</button><button class="abtn danger" data-reset>Progress reset karo</button><button class="abtn" data-close>Band karo</button></div></div>`;
    document.body.appendChild(d);
    const close = () => { d.remove(); onDone && onDone(); };
    d.onclick = e => { if (e.target === d) close(); };
    d.querySelector('[data-close]').onclick = close;
    d.querySelector('[data-gift]').onclick = async () => {
      const v = id => Math.max(0, parseInt(d.querySelector(id).value, 10) || 0);
      await A().sendMessage({ to: u.uid, title: 'Aapke liye tohfa', text: d.querySelector('#gT').value, gift: { coins: v('#gC'), lives: v('#gL'), boosters: { hammer: v('#gH'), shake: v('#gS') } } });
      toast('Gift bhej diya — player ki Daak mein milega'); close();
    };
    d.querySelector('[data-ban]').onclick = async () => { await A().updateUser(u.uid, { banned: !u.banned }); toast(u.banned ? 'Unban ho gaya' : 'Ban ho gaya'); close(); };
    d.querySelector('[data-reset]').onclick = async () => { const b = d.querySelector('[data-reset]'); if (b.dataset.sure) { await A().updateUser(u.uid, { resetAt: Date.now() }); toast('Agli baar game kholne par progress reset hoga'); close(); } else { b.dataset.sure = 1; b.textContent = 'Pakka? Dobara dabao'; } };
  }

  // ---------------- live config ----------------
  function field(path, label, type, hint) {
    const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), draft);
    if (type === 'bool') return `<label class="chk"><input type="checkbox" data-f="${path}" ${v ? 'checked' : ''}>${label}</label>`;
    if (type === 'text') return `<label class="full">${label}${hint ? ` <small>${hint}</small>` : ''}<input data-f="${path}" value="${esc(v)}"></label>`;
    return `<label>${label}${hint ? ` <small>${hint}</small>` : ''}<input data-f="${path}" type="number" step="any" value="${esc(v)}"></label>`;
  }
  function bindFields(scope) {
    scope.querySelectorAll('[data-f]').forEach(inp => inp.onchange = () => {
      const keys = inp.dataset.f.split('.'); let o = draft; keys.slice(0, -1).forEach(k => { o = o[k] = o[k] || {}; });
      o[keys[keys.length - 1]] = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? +inp.value : inp.value;
    });
  }
  async function saveDraft(msg) { await A().setConfig(clone(draft)); toast(msg || 'Save ho gaya — players ko agli baar game kholne par milega'); }
  async function config() {
    draft = C().deepMerge(C().DEFAULTS, await A().getConfig());
    const BN = { hammer: 'Belan Hammer', shake: 'Masala Shake', chimta: 'Chimta Swap', dabba: 'Pre-game Dabba', kadhai: 'Pre-game Kadhai' };
    main().innerHTML = head('Live Config', 'Bina app update kiye game badlo. Save karte hi sab players par lagta hai.', `<button class="abtn" data-reset>Default par wapas</button><button class="abtn primary" data-save>Save karo</button>`) + `
      <div class="panel sec"><h3>Ads — player pareshan na ho</h3><p class="hint">Full-screen ads sirf level jeetne ke baad. Haarne par kabhi nahi.</p><div class="form">
        ${field('ads.noAdsBeforeLevel', 'Is level se pehle koi ad nahi')}${field('ads.interstitialEveryWins', 'Har kitni jeet par 1 full-screen ad')}${field('ads.interstitialMinGapMin', 'Do ads ke beech kam se kam (minute)')}
        ${field('ads.interstitialDailyCap', 'Ek din mein max full-screen ads')}${field('ads.firstSessionAdFreeMin', 'Game kholne ke baad ad-free (minute)')}${field('ads.rewardedDailyCap', 'Ek din mein max inaam wale ads')}</div></div>
      <div class="panel sec"><h3>Economy</h3><div class="form">
        ${field('economy.startCoins', 'Shuruaati coins')}${field('economy.newAccountBonus', 'Naye account ka bonus')}${field('economy.maxLives', 'Max lives')}${field('economy.lifeRegenMin', 'Ek life kitne minute mein')}${field('economy.refillLivesCost', 'Saari lives ka daam (coins)')}
        ${field('economy.chaiBreakCost', 'Chai Break +5 chaal (coins)')}${field('economy.winCoinsBase', 'Jeet par coins (base)')}${field('economy.winCoinsPerStar', 'Har sitaare par coins')}${field('economy.bossBonus', 'Boss jeet bonus')}${field('economy.replayFactor', 'Dobara jeet par hissa', '0–1')}
        ${Object.keys(BN).map(k => field('economy.boosterPrices.' + k, BN[k] + ' ka daam')).join('')}</div></div>
      <div class="panel sec"><h3>Roz ka Inaam (7 din)</h3><div class="rows">${draft.daily.map((d, i) => `<div class="rowf"><b>Din ${i + 1}</b><label>Coins<input type="number" data-f="daily.${i}.coins" value="${d.coins || 0}"></label><label>Booster<select data-f="daily.${i}.booster">${['', 'hammer', 'shake', 'chimta', 'dabba', 'kadhai'].map(b => `<option value="${b}" ${d.booster === b ? 'selected' : ''}>${b || '—'}</option>`).join('')}</select></label><label>Ginti<input type="number" data-f="daily.${i}.n" value="${d.n || 0}"></label></div>`).join('')}</div></div>
      <div class="panel sec"><h3>Kismat ka Chakra</h3><p class="hint">Weight jitna zyada, utna zyada milega. Roz 1 free spin + ad se extra.</p><div class="form" style="margin-bottom:10px">${field('wheel.extraSpinsByAd', 'Ad se extra spins (roz)')}</div>
        <div class="rows">${draft.wheel.prizes.map((p, i) => `<div class="rowf"><b>#${i + 1}</b><label>Label<input data-f="wheel.prizes.${i}.label" value="${esc(p.label)}"></label><label>Coins<input type="number" data-f="wheel.prizes.${i}.coins" value="${p.coins || 0}"></label><label>Booster / life<select data-f="wheel.prizes.${i}.booster">${['', 'hammer', 'shake', 'chimta', 'dabba', 'kadhai'].map(b => `<option value="${b}" ${p.booster === b ? 'selected' : ''}>${b || (p.lives ? 'life' : '—')}</option>`).join('')}</select></label><label>Weight<input type="number" data-f="wheel.prizes.${i}.w" value="${p.w}"></label></div>`).join('')}</div></div>
      <div class="panel sec"><h3>Daily Missions</h3><div class="form">${field('missions.on', 'Missions chalu', 'bool')}${field('missions.allDoneBonus.coins', 'Teeno poore karne ka bonus (coins)')}</div>
        <div class="rows" style="margin-top:10px">${draft.missions.pool.map((m, i) => `<div class="rowf"><b>${esc(m.id)}</b><label class="full" style="grid-column:span 2">Kaam<input data-f="missions.pool.${i}.text" value="${esc(m.text)}"></label><label>Lakshya<input type="number" data-f="missions.pool.${i}.n" value="${m.n}"></label><label>Coins<input type="number" data-f="missions.pool.${i}.coins" value="${m.coins}"></label></div>`).join('')}</div></div>
      <div class="panel sec"><h3>Chests aur Streak</h3><div class="form">${field('freeChest.everyHours', 'Muft chest har kitne ghante')}${field('freeChest.coinsMin', 'Chest min coins')}${field('freeChest.coinsMax', 'Chest max coins')}${field('starChest.every', 'Har kitne sitaaron par star chest')}${field('starChest.coins', 'Star chest coins')}</div></div>
      <div class="panel sec"><h3>Announcement</h3><div class="form">${field('announcement.on', 'Game kholte hi dikhao', 'bool')}${field('announcement.title', 'Title', 'text')}${field('announcement.text', 'Message', 'text')}</div></div>
      <div class="panel sec"><h3>Maintenance</h3><p class="hint">Chalu karne par players game nahi khel paayenge — sirf message dikhega.</p><div class="form">${field('maintenance.on', 'Maintenance mode', 'bool')}${field('maintenance.message', 'Message', 'text')}</div></div>
      <div class="panel sec"><h3>Dukaan</h3><div class="form"><label>Featured pack<select data-f="shop.featured">${G.MM_MONETIZE.PRODUCTS.map(p => `<option value="${p.id}" ${draft.shop.featured === p.id ? 'selected' : ''}>${esc(p.name)} (${esc(p.price)})</option>`).join('')}</select></label>${field('shop.offerText', 'Tag text', 'text')}</div>
        <p class="hint" style="margin-top:10px">Asli daam Play Console aur App Store Connect mein set hote hain.</p></div>
      <div class="savebar"><button class="abtn primary" data-save>Save karo</button></div>`;
    bindFields(main());
    main().querySelectorAll('[data-save]').forEach(b => b.onclick = () => saveDraft());
    main().querySelector('[data-reset]').onclick = async e => { const b = e.currentTarget; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Pakka? Dobara dabao'; return; } draft = clone(C().DEFAULTS); await saveDraft('Default settings wapas aa gayi'); config(); };
  }

  // ---------------- events ----------------
  async function events() {
    draft = C().deepMerge(C().DEFAULTS, await A().getConfig());
    const now = new Date();
    const status = e => now < new Date(e.from + 'T00:00:00') ? '<span class="pill2 demo">Aane wala</span>' : now > new Date(e.to + 'T23:59:59') ? '<span class="pill2">Khatam</span>' : '<span class="pill2 ok">Chalu</span>';
    main().innerHTML = head('Festival Events', 'Event ke dino mein har jeet par coins guna ho jaate hain.', '<button class="abtn primary" data-add>+ Naya event</button>') +
      `<div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Naam</th><th>Shuru</th><th>Khatam</th><th class="num">Coins ×</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody>
      ${draft.events.map((e, i) => `<tr><td><input data-f="events.${i}.name" value="${esc(e.name)}"></td><td><input type="date" data-f="events.${i}.from" value="${esc(e.from)}"></td><td><input type="date" data-f="events.${i}.to" value="${esc(e.to)}"></td><td class="num"><input type="number" step="0.5" style="width:70px" data-f="events.${i}.mult" value="${e.mult}"></td><td><input data-f="events.${i}.desc" value="${esc(e.desc)}"></td><td>${status(e)}</td><td><button class="abtn sm danger" data-del="${i}">Hatao</button></td></tr>`).join('')}</tbody></table></div>
      <div class="savebar"><button class="abtn primary" data-save>Save karo</button></div></div>`;
    bindFields(main());
    main().querySelector('[data-save]').onclick = async () => { await saveDraft(); events(); };
    main().querySelector('[data-add]').onclick = async () => { const d = new Date(), f = d.toISOString().slice(0, 10), t = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10); draft.events.push({ id: 'ev' + Date.now(), name: 'Naya Mela', from: f, to: t, desc: 'Har jeet par 2x coins!', mult: 2 }); await saveDraft('Event jud gaya'); events(); };
    main().querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { draft.events.splice(+b.dataset.del, 1); await saveDraft('Event hata diya'); events(); });
  }

  // ---------------- levels ----------------
  async function levels() {
    draft = C().deepMerge(C().DEFAULTS, await A().getConfig());
    const users = await A().users().catch(() => []);
    const tuned = G.MM_TUNED || {};
    const goalTxt = gs => gs.map(g => g.t === 'collect' ? g.n + ' ' + G.MM_DATA.PIECES[g.c].name : g.t === 'block' ? g.b : g.t === 'ing' ? g.n + ' elaichi' : g.t === 'score' ? 'score ' + fmt(g.n) : g.t).join(', ');
    let w = 1;
    const render = () => {
      const rows = [];
      for (let n = (w - 1) * 15 + 1; n <= w * 15; n++) {
        const base = G.MM_LEVELS.genLevel(n), t = tuned[n] || {}, stuck = users.filter(u => (u.level || 1) === n).length;
        rows.push(`<tr><td><b>${n}</b>${(n - 1) % 15 + 1 === 10 || (n - 1) % 15 + 1 === 15 ? ' <span class="pill2 ban">Boss</span>' : ''}</td><td>${esc(goalTxt(G.MM_LEVELS.getLevel(n).goals))}</td><td class="num">${t.moves || base.moves}</td><td class="num">${t.botWin != null ? Math.round(t.botWin * 100) + '%' : '—'}</td><td class="num">${t.target != null ? Math.round(t.target * 100) + '%' : '—'}</td><td class="num">${stuck}</td><td><input type="number" min="5" max="80" placeholder="—" data-lv="${n}" value="${draft.levelMoves[n] || ''}"></td></tr>`);
      }
      main().querySelector('#lvBody').innerHTML = rows.join('');
      main().querySelectorAll('[data-lv]').forEach(i => i.onchange = () => { const v = parseInt(i.value, 10); if (v) draft.levelMoves[i.dataset.lv] = v; else delete draft.levelMoves[i.dataset.lv]; });
    };
    main().innerHTML = head('Levels', 'Bot ne har level 40 baar khela hai. Koi level zyada mushkil lage to uski chaalein yahan badlo.', '<button class="abtn primary" data-save>Save karo</button>') +
      `<div class="search"><select id="lvW">${G.MM_DATA.WORLDS.map((W, i) => `<option value="${i + 1}">World ${i + 1}: ${esc(W.name)}</option>`).join('')}</select></div>
      <div class="panel lvtbl"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Level</th><th>Lakshya</th><th class="num">Chaalein</th><th class="num">Bot jeet</th><th class="num">Target</th><th class="num">Yahan atke</th><th>Nayi chaalein</th></tr></thead><tbody id="lvBody"></tbody></table></div></div>`;
    main().querySelector('#lvW').onchange = e => { w = +e.target.value; render(); };
    main().querySelector('[data-save]').onclick = () => saveDraft('Level settings save ho gayi');
    render();
  }

  // ---------------- messages ----------------
  async function messages() {
    const list = await A().messages();
    main().innerHTML = head('Gifts & Messages', 'Sabko ya kisi ek player ko message aur tohfa bhejo. Player ki "Daak" mein dikhega.') + `
      <div class="ad-grid two"><div class="panel"><h3>Naya message</h3><form class="form" id="msgF" style="margin-top:10px">
        <label>Kisko<select id="mTo"><option value="all">Sab players</option></select></label><label>Ya player ID<input id="mUid" placeholder="u_… (khaali = sab)"></label>
        <label class="full">Title<input id="mTitle" required value="Diwali ka tohfa!"></label><label class="full">Message<input id="mText" required value="Mela mein aapka swagat hai. Ye lo kuch coins!"></label>
        <label>Coins<input id="mC" type="number" min="0" value="200"></label><label>Lives<input id="mL" type="number" min="0" value="0"></label><label>Hammer<input id="mH" type="number" min="0" value="0"></label><label>Expiry (din)<input id="mE" type="number" min="1" value="7"></label>
        <div class="full"><button class="abtn primary">Bhejo</button></div></form></div>
      <div class="panel"><h3>Bheje gaye</h3>${list.length ? list.map(m => `<div class="msgitem"><div class="mt"><b>${esc(m.title)}</b> <span class="pill2 ${m.to === 'all' ? 'ok' : 'guest'}">${m.to === 'all' ? 'Sab' : esc(m.to)}</span><br><small>${esc(m.text)} · ${new Date(m.ts).toLocaleString('en-IN')}${m.gift && m.gift.coins ? ' · ' + m.gift.coins + ' coins' : ''}</small></div><button class="abtn sm danger" data-del="${esc(m.id)}">Hatao</button></div>`).join('') : '<div class="empty">Abhi koi message nahi bheja.</div>'}</div></div>`;
    main().querySelector('#msgF').onsubmit = async e => {
      e.preventDefault(); const v = id => Math.max(0, parseInt(main().querySelector(id).value, 10) || 0);
      const to = main().querySelector('#mUid').value.trim() || 'all';
      await A().sendMessage({ to, title: main().querySelector('#mTitle').value, text: main().querySelector('#mText').value, gift: { coins: v('#mC'), lives: v('#mL'), boosters: { hammer: v('#mH') } }, expires: Date.now() + v('#mE') * 864e5 });
      toast('Bhej diya'); messages();
    };
    main().querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await A().deleteMessage(b.dataset.del); messages(); });
  }

  // ---------------- setup ----------------
  function setup() {
    main().innerHTML = head('Setup', 'Admin panel ko asli players se jodne ke steps.') + `
      <div class="panel sec"><h3>Abhi ka mode: <span class="ad-mode ${B().mode}">${B().mode === 'firebase' ? 'Live · Firebase' : 'Demo'}</span></h3>
      <p class="hint">${B().mode === 'local' ? 'Demo mode mein sab data isi browser mein hai. Asli players ka data dekhne ke liye Firebase jodo.' : 'Firebase se juda hai. Sab badlav asli players par lagte hain.'}</p>
      <ol style="line-height:1.8;font-size:14px;padding-left:20px">
        <li>console.firebase.google.com par naya project banao (free Spark plan kaafi hai).</li>
        <li>Authentication mein <b>Phone</b>, <b>Google</b> aur <b>Anonymous</b> chalu karo; ek Email/Password admin user banao.</li>
        <li>Firestore Database banao, phir <code>firebase deploy --only firestore</code> se rules aur indexes daalo.</li>
        <li>Web app add karke uski keys <code>www/js/firebase-config.js</code> mein daalo.</li>
        <li><code>node tools/set-admin.js aapka@email.com</code> se apne account ko admin banao.</li>
        <li><code>firebase deploy --only hosting</code> — admin panel <code>aapka-project.web.app/admin</code> par khulega.</li>
      </ol></div>
      <div class="panel sec"><h3>Kya kahan control hota hai</h3><div class="tbl-wrap"><table class="tbl"><tbody>
        <tr><td>Ads ki ginti aur gap</td><td>Live Config → Ads</td></tr><tr><td>Coins, lives, booster daam</td><td>Live Config → Economy</td></tr>
        <tr><td>Roz ka inaam, Chakra, Missions</td><td>Live Config</td></tr><tr><td>Diwali/Holi jaise events</td><td>Events</td></tr>
        <tr><td>Kisi level ki mushkil</td><td>Levels</td></tr><tr><td>Tohfe aur announcement</td><td>Gifts & Messages, Live Config</td></tr>
        <tr><td>Asli ads ki kamai</td><td>AdMob dashboard (admob.google.com)</td></tr><tr><td>Pack ke daam</td><td>Play Console / App Store Connect</td></tr></tbody></table></div></div>`;
  }

  G.MM_ADMIN = {
    async boot(el) {
      root = el; root.hidden = false;
      if (!B().ready) await B().init();
      if (A().email) shell(); else login();
    }
  };
})(window);
