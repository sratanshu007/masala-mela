# Masala Mela: Swaad Bachao

Desi food match-3 puzzle game for Android and iOS — by **Deific Digital**.

- 150 levels across 10 worlds (Chai Chowk → Rasoi Mahal), bot-balanced to the GDD difficulty curve
- 6 pieces (Jalebi, Imli Gola, Samosa, Mirchi Bhajiya, Methi Thepla, Kala Jamun)
- Specials: Belan Blast, Kadhai Dhamaka (double blast), Masala Dabba, plus all 6 special combos
- Blockers: Chashni Jelly (1–2 layers), Steel Tiffin, Fika Fog (spreads), Patang Dor, Garam Tawa (hot/cool), Matka, Dum Handi (hides a Belan), Baraf; Elaichi/Kesar ingredients
- Goals: score, collect, jelly, ingredients, blockers, boss levels with 2–3 goals
- Story cutscenes (Meethi, Dabbu, Dadi Maa, Fika Seth, Kadwa Karela), Dadi Maa tutorial tips
- Map with 5 path formations, lives (5, 25 min refill), coins, boosters (Hammer, Shake, Chimta, pre-game Dabba/Kadhai, Chai Break +5)
- "Dhamaka Time" win sequence, Hinglish praise ladder, confetti, screen shake, particles, hints, idle blinks
- Generated desi music per world + synthesized SFX on Bhupali notes
- Daily reward (7-day Kismat ka Kadhai), festival events with 2x coins, shop with 4 IAP packs
- AdMob rewarded + interstitial (none in the first 20 levels), Hinglish/English UI

- Login (mobile OTP / Google / guest), cloud save, leaderboard, inbox gifts — Firebase, with a built-in demo mode
- Daily missions, Kismat ka Chakra spin wheel, 4-hour free chest, star chest, win streak boosters
- Smart ads: only after wins, minimum gaps, daily caps, none for new players; all limits editable live
- **Admin panel** (`www/admin/`, or `#admin` on the web build): dashboard, players, live config, events, levels, gifts

## Run in a browser
```bash
npm run serve    # http://localhost:8080
```

## Build for the stores
See **docs/LAUNCH_GUIDE.md**.

## Project layout
```
www/                 the game (HTML5 + canvas, no framework)
  js/engine.js       match-3 rules (pure logic, bot-testable)
  js/levels.js       150-level generator; js/levels-data.js = bot-tuned values
  js/board.js        rendering, animation, particles, input
  js/art3d.js        real 3D models (three.js) rendered to sprites at startup
  js/scenes.js       animated layered world backgrounds
  js/art.js          2D fallback art
  js/audio.js        synthesized SFX + generative music
  js/ui.js           screens, map, popups, story, game flow
  js/monetize.js     AdMob + in-app purchases + smart ad policy
  js/config.js       live config defaults (admin panel overrides them)
  js/backend.js      login, cloud save, stats, inbox, leaderboard, admin API (Firebase or demo)
  js/features.js     login screen, missions, spin wheel, chests, streak, leaderboard, inbox
  admin/             admin panel
firebase/            Firestore security rules + indexes
android/  ios/       Capacitor native projects (configured)
tools/               calibrate.js (bot balancing), UI tests, asset renderers
store/               icon, feature graphic, screenshots, listing text
docs/                launch guide, level balance report
```

© 2026 Deific Digital (Deific Enterprises). All rights reserved.
