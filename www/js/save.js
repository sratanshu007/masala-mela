/* Masala Mela — save data, lives, coins, boosters, daily reward. (c) Deific Digital */
(function (G) {
  'use strict';
  const KEY = 'masala_mela_save_v1';
  const CFG = () => G.MM_CONFIG.get();
  const maxLives = () => CFG().economy.maxLives, lifeMs = () => CFG().economy.lifeRegenMin * 60000;

  const DEFAULT = () => ({
    v: 1, level: 1, stars: {}, best: {}, coins: G.MM_CONFIG.get().economy.startCoins, lives: G.MM_CONFIG.get().economy.maxLives, lifeTs: 0, infiniteUntil: 0,
    missions: { day: '', list: [], prog: {}, bonusClaimed: false }, wheel: { day: '', free: 0, ads: 0 }, chestTs: 0, starChestAt: 0, streak: 0,
    adLog: { day: '', inter: 0, rewarded: 0, lastInter: 0, winsSince: 0 }, avatar: 'meethi',
    boosters: { hammer: 2, shake: 2, chimta: 1, dabba: 1, kadhai: 1 },
    daily: { last: '', streak: 0 }, seen: {}, name: 'Khiladi',
    settings: { music: true, sfx: true, voice: false, lang: 'hi' },
    stats: { played: 0, won: 0, installTs: Date.now() }, noAds: false
  });

  const S = { data: null, listeners: [] };

  S.load = function () {
    try { const raw = localStorage.getItem(KEY); S.data = raw ? Object.assign(DEFAULT(), JSON.parse(raw)) : DEFAULT(); }
    catch (e) { S.data = DEFAULT(); }
    S.data.boosters = Object.assign(DEFAULT().boosters, S.data.boosters);
    S.data.settings = Object.assign(DEFAULT().settings, S.data.settings);
    S.tickLives();
    return S.data;
  };
  S.save = function () { try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { /* storage full */ } S.listeners.forEach(f => f()); if (G.MM_BACKEND) G.MM_BACKEND.saveProgress(S.data); };
  S.replace = function (data) { S.data = Object.assign(DEFAULT(), data); S.data.boosters = Object.assign(DEFAULT().boosters, S.data.boosters); S.data.settings = Object.assign(DEFAULT().settings, S.data.settings); try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { /* */ } };
  S.onChange = function (f) { S.listeners.push(f); };
  S.reset = function () { S.data = DEFAULT(); S.save(); };

  S.infinite = function () { return S.data.infiniteUntil > Date.now(); };
  S.tickLives = function () {
    const d = S.data;
    if (d.lives >= maxLives()) { d.lifeTs = 0; return; }
    if (!d.lifeTs) d.lifeTs = Date.now();
    const gained = Math.floor((Date.now() - d.lifeTs) / lifeMs());
    if (gained > 0) {
      d.lives = Math.min(maxLives(), d.lives + gained);
      d.lifeTs = d.lives >= maxLives() ? 0 : d.lifeTs + gained * lifeMs();
      S.save();
    }
  };
  S.nextLifeIn = function () { const d = S.data; if (d.lives >= maxLives() || !d.lifeTs) return 0; return Math.max(0, d.lifeTs + lifeMs() - Date.now()); };
  S.hasLife = function () { S.tickLives(); return S.infinite() || S.data.lives > 0; };
  S.loseLife = function () {
    if (S.infinite()) return;
    const d = S.data;
    if (d.lives >= maxLives()) d.lifeTs = Date.now();
    d.lives = Math.max(0, d.lives - 1); S.save();
  };
  S.addLives = function (n) { S.data.lives = Math.min(maxLives(), S.data.lives + n); if (S.data.lives >= maxLives()) S.data.lifeTs = 0; S.save(); };
  S.addCoins = function (n) { S.data.coins = Math.max(0, S.data.coins + n); S.save(); };
  S.spend = function (n) { if (S.data.coins < n) return false; S.data.coins -= n; S.save(); return true; };
  S.addBooster = function (k, n) { S.data.boosters[k] = (S.data.boosters[k] || 0) + n; S.save(); };
  S.useBooster = function (k) { if ((S.data.boosters[k] || 0) <= 0) return false; S.data.boosters[k]--; S.save(); return true; };

  S.completeLevel = function (n, stars, score) {
    const d = S.data;
    d.stars[n] = Math.max(d.stars[n] || 0, stars);
    d.best[n] = Math.max(d.best[n] || 0, score);
    if (d.level === n && n < G.MM_LEVELS.TOTAL) d.level = n + 1;
    if (d.level === n && n === G.MM_LEVELS.TOTAL) d.level = n; // finished all
    d.stats.won++;
    S.save();
  };
  S.totalStars = function () { return Object.values(S.data.stars).reduce((a, b) => a + b, 0); };

  // ---- Daily reward ("Kismat ka Kadhai") ----
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function yesterday() { const d = new Date(Date.now() - 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  S.dailyAvailable = function () { return S.data.daily.last !== today(); };
  S.dailyDay = function () { const dl = S.data.daily; const cont = dl.last === yesterday(); return cont ? dl.streak % 7 : 0; };
  S.claimDaily = function (mult) {
    const day = S.dailyDay(), r = CFG().daily[day] || CFG().daily[0];
    mult = mult || 1;
    if (r.coins) S.data.coins += r.coins * mult;
    if (r.booster) S.data.boosters[r.booster] = (S.data.boosters[r.booster] || 0) + r.n * mult;
    S.data.daily = { last: today(), streak: day + 1 };
    S.save();
    return { day, r };
  };

  Object.defineProperty(S, 'DAILY', { get: () => CFG().daily });
  Object.defineProperty(S, 'MAX_LIVES', { get: maxLives });
  S.today = today;
  G.MM_SAVE = S;
})(window);
