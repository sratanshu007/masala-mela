/* Masala Mela — Ads (AdMob) + In-app purchases (Google Play Billing / StoreKit).
 * Native builds use @capacitor-community/admob and cordova-plugin-purchase.
 * The browser build falls back to a demo flow so the game is fully playable.
 *
 * BEFORE RELEASE: replace the TEST ad unit IDs below with your real AdMob IDs
 * (and the App IDs in AndroidManifest.xml / Info.plist), and create the
 * products below in Play Console + App Store Connect with the same IDs.
 * (c) Deific Digital */
(function (G) {
  'use strict';

  const CFG = {
    // Google's official TEST ad units. Swap for real ones before release.
    android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
    ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
    testing: true,
    noAdsBeforeLevel: 21,      // GDD: no ads in first 20 levels
    interstitialEveryWins: 3   // GDD: after every 3-4 wins, never mid-level
  };

  // Product catalogue (prices are set in the stores; these are display fallbacks)
  const PRODUCTS = [
    { id: 'mm_no_ads', name: 'Ads Hatao', price: '₹149', coins: 1000, boosters: {}, noAds: true, nonConsumable: true },
    { id: 'mm_chhota_dabba', name: 'Chhota Dabba', price: '₹29', coins: 800, boosters: { hammer: 1, shake: 1 } },
    { id: 'mm_mela_pack', name: 'Mela Pack', price: '₹79', coins: 2500, boosters: { hammer: 1, shake: 1, chimta: 1 }, infiniteLivesMin: 60 },
    { id: 'mm_thali_pack', name: 'Thali Pack', price: '₹199', coins: 7000, boosters: { hammer: 3, shake: 3, chimta: 3, dabba: 2, kadhai: 2 }, best: true },
    { id: 'mm_raja_pack', name: 'Raja Pack', price: '₹499', coins: 20000, boosters: { hammer: 6, shake: 6, chimta: 6, dabba: 5, kadhai: 5 }, infiniteLivesMin: 1440 }
  ];

  const M = { ready: false, native: false, platform: 'web', winsSinceAd: 0, onGrant: null, store: null };

  function cap() { return G.Capacitor && G.Capacitor.isNativePlatform && G.Capacitor.isNativePlatform() ? G.Capacitor : null; }

  M.init = async function (onGrant) {
    M.onGrant = onGrant;
    const C = cap();
    if (!C) { M.ready = true; return; }
    M.native = true; M.platform = C.getPlatform();
    // Cordova plugins (IAP) are ready after 'deviceready'
    await new Promise(res => { document.addEventListener('deviceready', res, { once: true }); setTimeout(res, 3000); });
    // --- AdMob ---
    try {
      const AdMob = C.Plugins.AdMob;
      if (AdMob) {
        await AdMob.initialize({ initializeForTesting: CFG.testing, tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false });
        try { const s = await AdMob.requestConsentInfo(); if (s && s.isConsentFormAvailable && s.status === 'REQUIRED') await AdMob.showConsentForm(); } catch (e) { /* UMP optional */ }
        M.AdMob = AdMob;
      }
    } catch (e) { console.warn('AdMob init failed', e); }
    // --- In-app purchases (cordova-plugin-purchase v13) ---
    try {
      const CP = G.CdvPurchase;
      if (CP) {
        const { store, ProductType, Platform } = CP;
        const plat = M.platform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
        store.register(PRODUCTS.map(p => ({ id: p.id, type: p.nonConsumable ? ProductType.NON_CONSUMABLE : ProductType.CONSUMABLE, platform: plat })));
        store.when()
          .approved(tx => tx.verify())
          .verified(receipt => receipt.finish())
          .finished(tx => { tx.products.forEach(p => grant(p.id)); });
        await store.initialize([plat]);
        M.store = store;
      }
    } catch (e) { console.warn('IAP init failed', e); }
    M.ready = true;
  };

  function grant(id) {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return;
    if (p.noAds && G.MM_SAVE.data.noAds) return; // restore of an owned item: nothing new
    const inr = parseInt(String(p.price).replace(/[^0-9]/g, ''), 10) || 0;
    if (G.MM_BACKEND) G.MM_BACKEND.recordPurchase(p.id, inr);
    if (M.onGrant) M.onGrant(p);
  }

  M.localPrice = function (id) {
    try { const p = M.store && M.store.get(id); const o = p && p.pricing; if (o && o.price) return o.price; } catch (e) { /* ignore */ }
    const p = PRODUCTS.find(x => x.id === id); return p ? p.price : '';
  };

  M.restore = async function () {
    if (M.store) { try { await M.store.restorePurchases(); G.MM_UI.toast('Purchases restore ho gaye'); } catch (e) { G.MM_UI.toast('Restore abhi nahi ho saka'); } }
    else G.MM_UI.toast('Restore sirf app mein chalta hai');
  };

  M.buy = async function (id) {
    if (M.store) {
      const p = M.store.get(id); const offer = p && p.getOffer();
      if (offer) { const err = await offer.order(); if (err) G.MM_UI && G.MM_UI.toast('Payment cancel ho gaya'); }
      else G.MM_UI && G.MM_UI.toast('Store abhi uplabdh nahi hai');
      return;
    }
    // Web demo
    const ok = await G.MM_UI.confirm('Demo purchase', 'Ye web demo hai. App mein yahan Google Play / App Store ka payment khulega. Demo mein pack muft lein?', 'Haan, lo', 'Rehne do');
    if (ok) grant(id);
  };

  // ---------- Smart ad policy (all limits come from the admin panel) ----------
  // Rules: no ads for new players; full-screen ads only after a WIN, never after a
  // loss or mid-level; a minimum gap between them; a daily cap; none in the first
  // minutes of a session; "Ads Hatao" turns them off. Reward ads are always the
  // player's choice and show exactly what they give.
  const sessionStart = Date.now();
  function adLog() {
    const S = G.MM_SAVE, d = S.data, day = S.today();
    if (!d.adLog || d.adLog.day !== day) d.adLog = { day, inter: 0, rewarded: 0, lastInter: (d.adLog && d.adLog.lastInter) || 0, winsSince: (d.adLog && d.adLog.winsSince) || 0 };
    return d.adLog;
  }
  M.rewardedLeft = function () { const A = G.MM_CONFIG.get().ads; return Math.max(0, A.rewardedDailyCap - adLog().rewarded); };
  M.canOfferRewarded = function () { return M.rewardedLeft() > 0; };

  // Rewarded: resolves true if the player earned the reward
  M.rewarded = async function () {
    if (!M.canOfferRewarded()) { G.MM_UI.toast('Aaj ke inaam wale ads poore ho gaye. Kal phir!'); return false; }
    let ok = false;
    if (M.AdMob) {
      try {
        const ids = CFG[M.platform] || CFG.android;
        await M.AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: CFG.testing });
        G.MM_AUDIO.duck(true);
        const r = await M.AdMob.showRewardVideoAd();
        G.MM_AUDIO.duck(false);
        ok = !!r;
      } catch (e) { G.MM_AUDIO.duck(false); G.MM_UI.toast('Ad abhi load nahi hua. Thodi der baad try karein.'); return false; }
    } else ok = await G.MM_UI.demoAd();
    if (ok) { adLog().rewarded++; G.MM_SAVE.save(); G.MM_BACKEND && G.MM_BACKEND.track('adsRewarded'); }
    return ok;
  };

  // Interstitial: only called after a win
  M.afterWin = async function (levelNum) {
    const A = G.MM_CONFIG.get().ads, S = G.MM_SAVE, log = adLog();
    if (levelNum < A.noAdsBeforeLevel || S.data.noAds) return;
    log.winsSince++;
    const gapOk = Date.now() - log.lastInter > A.interstitialMinGapMin * 60000;
    const sessionOk = Date.now() - sessionStart > A.firstSessionAdFreeMin * 60000;
    if (log.winsSince < A.interstitialEveryWins || !gapOk || !sessionOk || log.inter >= A.interstitialDailyCap) { S.save(); return; }
    log.winsSince = 0; log.inter++; log.lastInter = Date.now(); S.save();
    G.MM_BACKEND && G.MM_BACKEND.track('adsInterstitial');
    if (M.AdMob) {
      try {
        const ids = CFG[M.platform] || CFG.android;
        await M.AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: CFG.testing });
        await M.AdMob.showInterstitial();
      } catch (e) { /* no fill — ignore */ }
    }
  };

  M.PRODUCTS = PRODUCTS;
  M.CFG = CFG;
  G.MM_MONETIZE = M;
})(window);
