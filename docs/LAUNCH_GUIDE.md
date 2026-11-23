# Masala Mela — Launch Guide (Android + iOS)

**Developer:** Deific Digital (Deific Enterprises) · hello@deificdigital.com
**App ID / Bundle ID:** `com.deificdigital.masalamela` · **Version:** 1.0.0 (build 1)

This project is one HTML5 game (`www/`) wrapped with **Capacitor 8** into native Android and iOS apps. Both native projects are already generated and configured (`android/`, `ios/`), including icons, splash screens, portrait lock, AdMob and in-app purchase plugins.

---

## 0. What you need

| For | Need |
| --- | --- |
| Android build | Android Studio (latest), JDK 21, Node.js 20+ |
| iOS build | A Mac with Xcode 16+, Node.js 20+ |
| Play Store | Google Play Console account (one-time US$25) |
| App Store | Apple Developer Program (US$99/year) |
| Ads | Google AdMob account |

> **Play Console tip:** new *personal* developer accounts must run a closed test with at least 12 testers for 14 days before they can publish to production. Registering as an **organization** (Deific Enterprises, needs a D-U-N-S number) avoids this.

## 1. Install

```bash
npm install
npx cap sync
```

## 2. Before you build — replace placeholders (important)

| What | Where | Now |
| --- | --- | --- |
| AdMob **App ID** (Android) | `android/app/src/main/AndroidManifest.xml` → `com.google.android.gms.ads.APPLICATION_ID` | Google TEST id |
| AdMob **App ID** (iOS) | `ios/App/App/Info.plist` → `GADApplicationIdentifier` | Google TEST id |
| AdMob **ad unit IDs** | `www/js/monetize.js` → `CFG.android` / `CFG.ios`, and set `testing: false` | Google TEST ids |
| SKAdNetwork IDs (iOS) | `Info.plist` → `SKAdNetworkItems` — paste Google's full list from the AdMob iOS docs | Google's main id only |
| IAP products | Create in Play Console + App Store Connect with **exactly** these IDs. Consumable: `mm_chhota_dabba` (₹29), `mm_mela_pack` (₹79), `mm_thali_pack` (₹199), `mm_raja_pack` (₹499). **Non-consumable:** `mm_no_ads` (₹149, removes between-level ads) | — |
| Play Store link used by "Invite" | `www/js/ui.js` → `share()` | already your package name |
| Privacy policy URL | Host `www/privacy.html` at e.g. `https://www.deificdigital.com/masala-mela/privacy` | — |

After editing anything in `www/`, run `npx cap sync` again.

## 3. Android — build the signed AAB

1. Create an upload key (once — keep it safe, you need it for every update):
   ```bash
   keytool -genkey -v -keystore masala-mela-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Put the `.jks` in `android/` and create `android/keystore.properties`:
   ```
   storeFile=../masala-mela-upload.jks
   storePassword=YOUR_PASSWORD
   keyAlias=upload
   keyPassword=YOUR_PASSWORD
   ```
   (Both are git-ignored. Never share them.)
3. Build: `npx cap open android` → Android Studio → **Build › Generate Signed App Bundle** (or `cd android && ./gradlew bundleRelease`).
   Output: `android/app/build/outputs/bundle/release/app-release.aab`.
4. Test on a real low-end phone first: `./gradlew installDebug` or Run in Android Studio.
5. Every update: increase `versionCode` (and `versionName`) in `android/app/build.gradle`.

Targets **API 36**, min API 24 (Android 7.0).

## 4. iOS — build and upload

1. `npx cap open ios` (on the Mac). Packages resolve via Swift Package Manager automatically.
2. Xcode → target **App** → Signing & Capabilities → choose your Team; add the **In-App Purchase** capability.
3. Set version/build under General (1.0.0 / 1).
4. Product › Archive → Distribute App → App Store Connect.

iPhone-only, portrait.

## 4b. Firebase (login, cloud save) + Admin panel

1. Create a project at console.firebase.google.com (free Spark plan is enough to start).
2. **Authentication** → enable *Phone*, *Google* and *Anonymous*. Add your admin as an *Email/Password* user. Under Settings → Authorized domains keep `localhost` (the app's WebView) and add your hosting domain.
3. **Firestore** → create database (production mode, region `asia-south1` Mumbai).
4. Add a **Web app** and paste its config into `www/js/firebase-config.js`.
5. Install the CLI and deploy rules + admin hosting:
   ```bash
   npm i -g firebase-tools && firebase login && firebase use --add
   firebase deploy --only firestore,hosting
   ```
6. Make yourself admin: download a service-account key to `tools/service-account.json` (never commit it), then
   ```bash
   npm i firebase-admin && node tools/set-admin.js you@deificdigital.com
   ```
7. Open `https://<project>.web.app/admin` and log in. Everything you change there (ads limits, rewards, wheel, missions, events, level moves, gifts, bans) reaches players the next time they open the game — no app update needed.
8. Run `npx cap sync` so the app ships the new keys.

**Admin panel pages:** Dashboard (players, DAU, revenue, ads, win rate, where players get stuck) · Players (search, gift, ban, reset) · Live Config · Events · Levels (bot win rates, retune moves) · Gifts & Messages · Setup.
Ad revenue itself is reported in the **AdMob** dashboard; store revenue in **Play Console / App Store Connect**.

## 5. Store listing

All text is in `store/STORE_LISTING.md`. Graphics in `store/`:

- `icon-512.png` — Play Store icon
- `feature-graphic-1024x500.png` — Play feature graphic
- `screenshots-android/` — 6 × 1080×1920
- `screenshots-iphone-6.9/` — 6 × 1320×2868 (App Store 6.9")

## 6. Play Console forms (answers)

**Data safety**
- Data collected: *Device or other IDs* (Advertising ID) — collected by AdMob, shared with Google for advertising/analytics, processed ephemerally? **No**. Optional? **No**.
- *App activity / App interactions* and *App info & performance (crash logs, diagnostics)* — by AdMob SDK, for advertising/fraud prevention.
- *Approximate location* (from IP) — by AdMob, for advertising.
- *Personal info → Name, Phone number, Email address* — collected when the player logs in (optional: guests can skip), used for **Account management** and **App functionality**, not shared. Stored in Firebase.
- *App activity → Other user-generated content* (game progress) — App functionality, not shared.
- *Purchase history* — App functionality (shown in the admin panel).
- Account deletion: **Yes** — in-app (Profile → Account delete karo) and by email (hello@deificdigital.com). Paste the privacy policy URL as the web deletion resource.
- Financial info: **No** (purchases handled by Google Play).
- Data encrypted in transit: **Yes**. Users can request deletion: **Yes** (local data — reset/uninstall; email for anything else).

**Ads:** Contains ads — **Yes**.
**Target audience:** 13+ (do **not** select under-13 age groups, otherwise Families policy + certified ad SDK rules apply).
**Content rating (IARC):** Puzzle game, no violence/gore, no user interaction/chat, no gambling (no real-money rewards; the daily reward is fixed, not random), in-app purchases yes. Expected rating: Everyone / 3+ / PEGI 3.
**App category:** Game › Puzzle.

## 7. App Store Connect answers

**App Privacy:** Identifiers (Device ID) — used for Third-Party Advertising, linked to user: No, used for tracking: Yes (only after ATT consent). Usage Data (Advertising Data, Product Interaction) — Third-Party Advertising. Diagnostics — App Functionality.
**Age rating:** 4+ (Infrequent/Mild: none). **Category:** Games › Puzzle, secondary Games › Casual.
**Export compliance:** uses no non-exempt encryption (`ITSAppUsesNonExemptEncryption = NO` already set).

## 8. Pre-launch checklist

- [ ] Real AdMob IDs in place, `testing: false`, test on device with your device as AdMob test device
- [ ] IAP products created and **active** in both stores; test with Play licence testers / App Store Sandbox
- [ ] Play: internal testing track → closed testing → production
- [ ] Privacy policy URL live
- [ ] Played levels 1–20 on a low-RAM Android phone (smooth, sound OK)
- [ ] Check festival dates in `www/js/ui.js` → `EVENTS` (they are config, verify each year)

## 9. Known limits of v1.0 (honest list)

- **Login and cloud save run on Firebase.** Until `www/js/firebase-config.js` has real keys, the game and admin panel run in **demo mode** (data in the browser only, OTP 123456). "Send life to friend" uses an invite link; friend lists are a later feature.
- **Native login:** phone OTP works through Firebase's web flow (invisible reCAPTCHA). Google sign-in inside the Android/iOS app needs the native plugin: `npm i @capacitor-firebase/authentication`, add `google-services.json` / `GoogleService-Info.plist`, then `npx cap sync`. The code already uses that plugin automatically when present.
- **Stats counters are written by the app**, which is fine at launch scale; for very large scale move them to Firebase Analytics / BigQuery.
- **Purchase verification is on-device.** For larger revenue add server-side receipt validation (cordova-plugin-purchase supports a validator URL).
- **Voice lines** use the phone's Hindi text-to-speech (off by default). Record real Hindi/Hinglish voice lines for the GDD's praise ladder when budget allows.
- **Art** is real 3D: every piece, special, blocker, board tile and Dabbu is modelled in three.js (`www/js/art3d.js`) and rendered once at startup into sprites, so gameplay stays light on low-end phones (2D fallback if a phone has no WebGL). Characters other than Dabbu (Meethi, Dadi Maa, Fika Seth, Karela) are still 2D illustrations; an artist's 3D renders can replace them later. Each world has an animated layered background (`www/js/scenes.js`); Chai Chowk has the full street scene, other worlds use a palette-matched version.
- **Music** is generated live (tabla, tanpura, bansuri/santoor-style melodies per world). A composer's recorded tracks can be dropped in later.

## 10. Updating levels

Levels are generated from rules in `www/js/levels.js`, then bot-tested by `npm run calibrate` (plays every level 40× per setting and tunes moves to the GDD win-rate curve). Results: `docs/LEVEL_BALANCE_REPORT.txt`. To add a new world: extend `WORLDS` in `worlds.js`, raise `TOTAL` in `levels.js`, run calibrate, then `npx cap sync`.
