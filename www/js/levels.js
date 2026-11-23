/* Masala Mela — level generator for 150 launch levels (10 worlds x 15).
 * Levels are generated deterministically from rules in the GDD, then
 * tools/calibrate.js bot-tests every level and writes levels-data.js with
 * tuned moves / score targets / star thresholds. (c) Deific Digital */
(function (G) {
  'use strict';
  const COLS = 8, ROWS = 9;

  function rngFrom(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Board masks: '#' = no cell, '.' = playable
  const MASKS = [
    ['........', '........', '........', '........', '........', '........', '........', '........', '........'],
    ['#......#', '........', '........', '........', '........', '........', '........', '........', '#......#'],
    ['##....##', '#......#', '........', '........', '........', '........', '........', '#......#', '##....##'],
    ['........', '........', '........', '...##...', '...##...', '...##...', '........', '........', '........'],
    ['###..###', '#......#', '........', '........', '........', '........', '........', '........', '........'],
    ['........', '........', '........', '#......#', '##....##', '#......#', '........', '........', '........'],
    ['#.#..#.#', '........', '........', '........', '........', '........', '........', '........', '........'],
    ['........', '........', '.##..##.', '........', '........', '........', '.##..##.', '........', '........']
  ];

  // Introduction level of each element (GDD 4.4 + world gimmicks)
  const INTRO = { jelly: 5, tiffin: 8, ing: 9, fog: 10, jelly2: 16, dor: 31, tawa: 46, matka: 76, handi: 106, ice: 121 };
  const BLOCK_CH = { tiffin: 'T', matka: 'M', fog: 'F', tawa: 'H', handi: 'U' };
  const LOCK_CH = { dor: 'D', ice: 'I' };

  function makeGrid(mask) { return mask.map(r => r.split('')); }
  function playable(g, r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS && g[r][c] !== '#'; }

  // set with mirror symmetry
  function put(g, r, c, ch, mirror) {
    if (playable(g, r, c)) g[r][c] = ch;
    if (mirror) { const mc = COLS - 1 - c; if (playable(g, r, mc)) g[r][mc] = ch; }
  }

  // Jelly layer is stored separately (0,1,2)
  function addJelly(J, g, rect, layers) {
    for (let r = rect[0]; r <= rect[2]; r++)
      for (let c = rect[1]; c <= rect[3]; c++)
        if (playable(g, r, c)) J[r][c] = Math.max(J[r][c], layers);
  }

  function placeBlockers(g, rng, type, count, zone) {
    // zone: 'bottom' | 'mid' | 'top' | 'ring' | 'corners' | 'rows'
    const ch = BLOCK_CH[type] || LOCK_CH[type];
    const cells = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS / 2; c++) {
      if (!playable(g, r, c) || g[r][c] !== '.') continue;
      let ok = true;
      if (zone === 'bottom') ok = r >= 6;
      else if (zone === 'mid') ok = r >= 3 && r <= 6;
      else if (zone === 'top') ok = r >= 1 && r <= 3;
      else if (zone === 'corners') ok = (r >= 6 && c <= 1) || (r <= 2 && c <= 1);
      else if (zone === 'ring') ok = (r === 2 || r === 6 || c === 1) && r >= 2 && r <= 6;
      else if (zone === 'rows') ok = r === 4 || r === 5;
      if (r === 0 && ch !== 'D' && ch !== 'I') ok = false; // keep spawn row free of solid blockers
      if (ok) cells.push([r, c]);
    }
    // shuffle
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const pairs = Math.ceil(count / 2);
    for (let i = 0; i < Math.min(pairs, cells.length); i++) put(g, cells[i][0], cells[i][1], ch, true);
  }

  function countCh(g, ch) { let n = 0; g.forEach(r => r.forEach(x => { if (x === ch) n++; })); return n; }

  // Serialize: board strings + jelly strings
  function finish(spec, g, J) {
    spec.board = g.map(r => r.join(''));
    spec.jelly = J.map(r => r.join(''));
    return spec;
  }

  function blank(maskIdx) {
    const g = makeGrid(MASKS[maskIdx]);
    const J = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    return { g, J };
  }

  // ---- World 1: hand-designed from GDD table 5.3 ----
  function world1(n) {
    const rng = rngFrom(n * 977);
    const spec = { id: n, world: 1, idx: n, boss: n === 10 || n === 15, colors: n <= 5 ? 4 : 5, ing: 0, goals: [] };
    let { g, J } = blank([0, 0, 1, 0, 2, 1, 0, 3, 1, 4, 0, 1, 2, 3, 5][n - 1]);
    switch (n) {
      case 1: spec.moves = 20; spec.goals = [{ t: 'score', n: 1500 }]; break;
      case 2: spec.moves = 20; spec.goals = [{ t: 'collect', c: 0, n: 36 }]; break;
      case 3: spec.moves = 22; spec.goals = [{ t: 'score', n: 3000 }]; break;
      case 4: spec.moves = 22; spec.goals = [{ t: 'collect', c: 0, n: 28 }, { t: 'collect', c: 2, n: 28 }]; break;
      case 5: spec.moves = 25; addJelly(J, g, [6, 2, 7, 5], 1); spec.goals = [{ t: 'jelly' }]; break;
      case 6: spec.moves = 24; spec.goals = [{ t: 'score', n: 5000 }]; break;
      case 7: spec.moves = 22; spec.goals = [{ t: 'collect', c: 1, n: 45 }]; break;
      case 8: spec.moves = 26; addJelly(J, g, [5, 1, 7, 6], 1); placeBlockers(g, rng, 'tiffin', 4, 'top'); spec.goals = [{ t: 'jelly' }]; break;
      case 9: spec.moves = 28; spec.ing = 2; spec.goals = [{ t: 'ing', n: 2 }]; break;
      case 10: spec.moves = 30; placeBlockers(g, rng, 'fog', 4, 'bottom'); placeBlockers(g, rng, 'tiffin', 4, 'mid'); spec.goals = [{ t: 'score', n: 8000 }, { t: 'block', b: 'fog' }]; break;
      case 11: spec.moves = 24; addJelly(J, g, [3, 3, 5, 4], 1); spec.goals = [{ t: 'score', n: 6000 }]; break;
      case 12: spec.moves = 24; placeBlockers(g, rng, 'tiffin', 6, 'mid'); spec.goals = [{ t: 'collect', c: 3, n: 55 }]; break;
      case 13: spec.moves = 28; addJelly(J, g, [4, 0, 8, 7], 1); placeBlockers(g, rng, 'tiffin', 4, 'top'); spec.goals = [{ t: 'jelly' }, { t: 'block', b: 'tiffin' }]; break;
      case 14: spec.moves = 30; spec.ing = 3; placeBlockers(g, rng, 'fog', 4, 'corners'); spec.goals = [{ t: 'ing', n: 3 }]; break;
      case 15: spec.moves = 32; addJelly(J, g, [6, 1, 8, 6], 1); placeBlockers(g, rng, 'tiffin', 4, 'top'); placeBlockers(g, rng, 'fog', 4, 'mid');
        spec.goals = [{ t: 'jelly' }, { t: 'block', b: 'tiffin' }, { t: 'block', b: 'fog' }]; break;
    }
    return finish(spec, g, J);
  }

  // ---- Worlds 2..10: rule-based ----
  function genLevel(n) {
    if (n <= 15) return world1(n);
    const w = Math.ceil(n / 15), k = ((n - 1) % 15) + 1;
    const W = G.MM_DATA.WORLDS[w - 1];
    const rng = rngFrom(n * 7919 + 13);
    const avail = Object.keys(INTRO).filter(x => INTRO[x] <= n);
    let prim = W.gimmick;
    if (prim === 'all') prim = ['fog', 'dor', 'tawa', 'matka', 'handi', 'ice'][k % 6];
    const second = (() => {
      const pool = avail.filter(x => x !== prim && x !== 'jelly' && x !== 'ing' && x !== 'jelly2');
      return pool.length ? pool[Math.floor(rng() * pool.length)] : 'tiffin';
    })();
    const maskIdx = Math.floor(rng() * MASKS.length);
    let { g, J } = blank(maskIdx);
    const boss = k === 10 || k === 15;
    const spec = { id: n, world: w, idx: k, boss, ing: 0, goals: [] };
    spec.colors = n <= 60 ? 5 : (k === 11 || k === 1 ? 5 : 6);

    // collect colours always from the first 5 so easing to 5 colours never strands a goal
    const c1 = Math.floor(rng() * 5);
    let c2 = (c1 + 1 + Math.floor(rng() * 4)) % 5;
    const jl = prim === 'jelly2' ? 2 : 1;
    const isBlock = b => !!(BLOCK_CH[b] || LOCK_CH[b]);
    const addPrim = (cnt, zone) => {
      if (prim === 'jelly2') addJelly(J, g, zone === 'bottom' ? [6, 1, 8, 6] : [3, 2, 5, 5], 2);
      else placeBlockers(g, rng, prim, cnt, zone);
    };
    const primGoal = () => (prim === 'jelly2' ? { t: 'jelly' } : { t: 'block', b: prim });
    const tier = n <= 50 ? 0 : n <= 100 ? 1 : 2;
    const extra = tier * 2;

    switch (k) {
      case 1: addPrim(4, 'mid'); spec.goals = [{ t: 'score', n: 0 }]; break;
      case 2: addPrim(4, 'top'); spec.goals = [{ t: 'collect', c: c1, n: 55 + extra * 4 }]; break;
      case 3: addJelly(J, g, [5, 1, 8, 6], jl); spec.goals = [{ t: 'jelly' }]; break;
      case 4: addPrim(2, 'corners'); spec.goals = [{ t: 'collect', c: c1, n: 40 + extra * 2 }, { t: 'collect', c: c2, n: 40 + extra * 2 }]; break;
      case 5: addPrim(8 + extra, 'mid'); spec.goals = [primGoal()]; break;
      case 6: spec.ing = 2 + tier; addPrim(4, 'mid'); spec.goals = [{ t: 'ing', n: spec.ing }]; break;
      case 7: addJelly(J, g, [4, 1, 7, 6], jl); addPrim(4, 'ring'); spec.goals = [{ t: 'jelly' }]; break;
      case 8: addPrim(6, 'rows'); if (isBlock(second)) placeBlockers(g, rng, second, 4, 'bottom'); spec.goals = [{ t: 'score', n: 0 }]; break;
      case 9: addPrim(6, 'bottom'); spec.goals = [{ t: 'collect', c: c1, n: 60 + extra * 4 }, primGoal()]; break;
      case 10: addPrim(8 + extra, 'mid'); if (isBlock(second)) placeBlockers(g, rng, second, 4, 'top');
        spec.goals = [primGoal(), { t: 'score', n: 0 }]; break;
      case 11: addPrim(2, 'corners'); spec.goals = [{ t: 'score', n: 0 }]; break;
      case 12: spec.ing = 2 + tier; addJelly(J, g, [6, 2, 8, 5], 1); spec.goals = [{ t: 'ing', n: spec.ing }, { t: 'jelly' }]; break;
      case 13: addJelly(J, g, [4, 0, 8, 7], jl); placeBlockers(g, rng, 'tiffin', 6, 'ring'); spec.goals = [{ t: 'jelly' }]; break;
      case 14: addPrim(10 + extra, 'mid'); placeBlockers(g, rng, 'fog', 2, 'corners'); spec.goals = [primGoal()]; break;
      case 15: addJelly(J, g, [6, 0, 8, 7], 1); addPrim(8 + extra, 'mid'); if (isBlock(second)) placeBlockers(g, rng, second, 4, 'top');
        spec.goals = [{ t: 'jelly' }, primGoal(), { t: 'collect', c: c1, n: 45 + extra * 2 }]; break;
    }
    // Remove goals for blockers that ended up with zero count
    spec.goals = spec.goals.filter(go => {
      if (go.t !== 'block') return true;
      const ch = BLOCK_CH[go.b] || LOCK_CH[go.b];
      return countCh(g, ch) > 0;
    });
    if (!spec.goals.length) spec.goals = [{ t: 'score', n: 0 }];
    spec.moves = 22 + (boss ? 6 : 0) + tier * 2 + spec.goals.length * 2;
    return finish(spec, g, J);
  }

  function difficultyTarget(n) {
    // design win-rate targets from GDD 5.1
    const k = ((n - 1) % 15) + 1;
    if (n <= 15) return 0.92;
    if (n <= 50) return k % 5 === 0 ? 0.68 : 0.8;
    if (n <= 100) { if (k === 10 || k === 15) return 0.45; if (k === 11 || k === 1) return 0.8; return 0.65; }
    if (k === 15) return 0.32; if (k === 10) return 0.42; if (k === 11 || k === 1) return 0.72; return 0.58;
  }

  function getLevel(n) {
    const base = genLevel(n);
    const tuned = G.MM_TUNED && G.MM_TUNED[n];
    if (tuned) {
      base.moves = tuned.moves;
      base.stars = tuned.stars;
      if (tuned.colors) base.colors = tuned.colors;
      if (tuned.board) base.board = tuned.board;
      if (tuned.jelly) base.jelly = tuned.jelly;
      if (tuned.goals) base.goals = tuned.goals.map(g => Object.assign({}, g));
      if (tuned.ing != null) base.ing = tuned.ing;
      // goal order may differ (score goal appended last during tuning) — match by type
      const tg = (tuned.goalsN || []).slice();
      base.goals.forEach(go => { if (go.t === 'score' && tuned.score) go.n = tuned.score; });
      const nonScore = base.goals.filter(g => g.t !== 'score');
      nonScore.forEach((go, i) => { if (tg[i] != null && go.n != null) go.n = tg[i]; });
    }
    base.goals.forEach(go => { if (go.t === 'score' && !go.n) go.n = 4000 + n * 120; });
    if (!base.stars) {
      const s = base.goals.find(g => g.t === 'score');
      const b = s ? s.n : 2000 + n * 80;
      base.stars = [s ? b : 0, Math.round(b * 1.6), Math.round(b * 2.3)];
    }
    base.goals.forEach(go => { if (go.t === 'collect' && go.c >= base.colors) go.c = go.c % base.colors; });
    const live = G.MM_CONFIG && G.MM_CONFIG.get().levelMoves; // admin panel override
    if (live && live[n]) base.moves = +live[n];
    base.tip = G.MM_DATA.TIPS[n] || null;
    return base;
  }

  G.MM_LEVELS = { COLS, ROWS, TOTAL: 150, genLevel, getLevel, difficultyTarget, rngFrom, INTRO };
})(typeof window !== 'undefined' ? window : globalThis);
