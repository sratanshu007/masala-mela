/* Masala Mela — live game configuration.
 * Defaults live here; the admin panel overrides any of them remotely
 * (Firestore doc config/live, cached on the device). (c) Deific Digital */
(function (G) {
  'use strict';
  const DEFAULTS = {
    version: 1,
    maintenance: { on: false, message: 'Mela sajaya ja raha hai — thodi der mein wapas aayein!' },
    announcement: { on: true, title: 'Diwali aa rahi hai!', text: 'Diya Jalao event mein har jeet par 2x coins.' },
    ads: {
      noAdsBeforeLevel: 21,        // no ads at all for new players
      interstitialEveryWins: 3,    // only after wins
      interstitialMinGapMin: 4,    // at least this many minutes between full-screen ads
      interstitialDailyCap: 8,     // never more than this per day
      firstSessionAdFreeMin: 10,   // no full-screen ad in the first minutes of a session
      rewardedDailyCap: 25,        // reward ads per day (player-chosen)
      showAfterLoss: false         // never punish a loss with an ad
    },
    economy: {
      startCoins: 500, maxLives: 5, lifeRegenMin: 25, refillLivesCost: 400,
      chaiBreakCost: 300, chaiBreakStep: 300, winCoinsBase: 30, winCoinsPerStar: 20, bossBonus: 100, replayFactor: 0.5,
      newAccountBonus: 500,
      boosterPrices: { hammer: 300, shake: 200, chimta: 350, dabba: 400, kadhai: 300 },
      boosterUnlock: { hammer: 10, shake: 15, chimta: 20, dabba: 16, kadhai: 6 }
    },
    daily: [
      { coins: 100 }, { booster: 'hammer', n: 1 }, { coins: 200 }, { booster: 'shake', n: 1 },
      { coins: 300 }, { booster: 'chimta', n: 1 }, { coins: 500, booster: 'dabba', n: 1 }
    ],
    wheel: {
      extraSpinsByAd: 2,
      prizes: [
        { label: '50', coins: 50, w: 22, col: '#FFC83D' },
        { label: '100', coins: 100, w: 18, col: '#FF8A3D' },
        { label: 'Hammer', booster: 'hammer', n: 1, w: 10, col: '#1FB5A8' },
        { label: '200', coins: 200, w: 12, col: '#FF5C8A' },
        { label: 'Shake', booster: 'shake', n: 1, w: 10, col: '#7C5CBF' },
        { label: '+1 ❤', lives: 1, w: 12, col: '#E63946' },
        { label: 'Dabba', booster: 'dabba', n: 1, w: 6, col: '#2E9E5B' },
        { label: '1000', coins: 1000, w: 2, col: '#2B1B5A' }
      ]
    },
    missions: {
      on: true,
      pool: [
        { id: 'win3', text: '3 level jeeto', en: 'Win 3 levels', stat: 'wins', n: 3, coins: 150 },
        { id: 'belan5', text: '5 Belan Blast banao', en: 'Make 5 Belan Blasts', stat: 'belan', n: 5, coins: 120 },
        { id: 'kadhai3', text: '3 Kadhai Dhamaka banao', en: 'Make 3 Kadhai blasts', stat: 'kadhai', n: 3, coins: 150 },
        { id: 'dabba1', text: '1 Masala Dabba banao', en: 'Make a Masala Dabba', stat: 'dabba', n: 1, coins: 150 },
        { id: 'jalebi60', text: '60 Jalebi ikattha karo', en: 'Collect 60 Jalebis', stat: 'c0', n: 60, coins: 100 },
        { id: 'samosa60', text: '60 Samosa ikattha karo', en: 'Collect 60 Samosas', stat: 'c2', n: 60, coins: 100 },
        { id: 'stars6', text: '6 sitaare kamao', en: 'Earn 6 stars', stat: 'stars', n: 6, coins: 180 },
        { id: 'combo4', text: '4 ka combo banao (2 baar)', en: 'Make a 4x combo twice', stat: 'combo4', n: 2, coins: 120 },
        { id: 'blocks15', text: '15 rukawatein todo', en: 'Break 15 blockers', stat: 'blocks', n: 15, coins: 130 },
        { id: 'spin1', text: 'Kismat ka Chakra ghumao', en: 'Spin the wheel', stat: 'spins', n: 1, coins: 60 }
      ],
      allDoneBonus: { coins: 200, booster: 'hammer', n: 1 }
    },
    freeChest: { everyHours: 4, coinsMin: 40, coinsMax: 120, boosterChance: 0.25 },
    starChest: { every: 30, coins: 400, booster: 'kadhai', n: 1 },
    streak: { levels: [ { need: 2, give: 'kadhai' }, { need: 4, give: 'dabba' } ] },
    events: [
      { id: 'diwali', name: 'Diya Jalao (Diwali)', from: '2026-11-04', to: '2026-11-14', desc: 'Har jeet par 2x coins! Diye jalao, mela sajao.', mult: 2 },
      { id: 'winter', name: 'Winter Mela', from: '2026-12-22', to: '2027-01-02', desc: 'Saal ke ant ka mela — 2x coins.', mult: 2 },
      { id: 'pongal', name: 'Rangoli Utsav (Pongal)', from: '2027-01-13', to: '2027-01-18', desc: 'Phoolon ki rangoli — 2x coins.', mult: 2 },
      { id: 'holi', name: 'Rang Barse (Holi)', from: '2027-03-19', to: '2027-03-24', desc: 'Rangon ka tyohaar — 2x coins.', mult: 2 },
      { id: 'independence', name: 'Tiranga Challenge', from: '2027-08-13', to: '2027-08-17', desc: 'Desh-bhakti theme — 2x coins.', mult: 2 }
    ],
    levelMoves: {},               // { "37": 28 } — admin can retune any level live
    shop: { featured: 'mm_thali_pack', offerText: 'Sabse achha' }
  };

  const CACHE = 'mm_remote_cfg_v1';
  function deepMerge(a, b) {
    if (Array.isArray(b)) return b.slice();
    if (b && typeof b === 'object') { const o = Object.assign({}, a); for (const k in b) o[k] = (a && typeof a[k] === 'object' && !Array.isArray(a[k])) ? deepMerge(a[k], b[k]) : (Array.isArray(b[k]) ? b[k].slice() : b[k]); return o; }
    return b === undefined ? a : b;
  }
  let remote = {};
  try { remote = JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch (e) { remote = {}; }
  let merged = deepMerge(DEFAULTS, remote);

  const C = {
    DEFAULTS,
    get: () => merged,
    remote: () => remote,
    apply(r) { remote = r || {}; merged = deepMerge(DEFAULTS, remote); try { localStorage.setItem(CACHE, JSON.stringify(remote)); } catch (e) { /* */ } C.listeners.forEach(f => f(merged)); },
    listeners: [],
    onChange(f) { C.listeners.push(f); },
    activeEvent() { const now = new Date(); return (merged.events || []).find(e => now >= new Date(e.from + 'T00:00:00') && now <= new Date(e.to + 'T23:59:59')); },
    nextEvent() { const now = new Date(); return (merged.events || []).filter(e => new Date(e.from + 'T00:00:00') > now).sort((a, b) => a.from.localeCompare(b.from))[0]; },
    deepMerge
  };
  G.MM_CONFIG = C;
})(typeof window !== 'undefined' ? window : globalThis);
