/* Loads the Firebase SDK only when real Firebase keys are configured, then boots the app. */
(function () {
  const c = window.MM_FIREBASE_CONFIG;
  const real = c && c.apiKey && !/YOUR_/.test(c.apiKey);
  const files = real ? ['js/vendor/firebase/firebase-app-compat.js', 'js/vendor/firebase/firebase-auth-compat.js', 'js/vendor/firebase/firebase-firestore-compat.js'] : [];
  const base = (document.currentScript && document.currentScript.dataset.base) || '';
  let done; window.MM_READY = new Promise(r => { done = r; });
  function next(i) {
    if (i >= files.length) { done(); return; }
    const s = document.createElement('script'); s.src = base + files[i]; s.onload = () => next(i + 1); s.onerror = () => next(i + 1); document.head.appendChild(s);
  }
  next(0);
})();
