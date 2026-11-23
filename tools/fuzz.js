// Fuzz: random play with boosters + forced special combos on every level. Checks invariants.
require('../www/js/worlds.js'); require('../www/js/levels.js'); require('../www/js/levels-data.js'); require('../www/js/engine.js');
const L = MM_LEVELS;
function check(g, n) {
  for (const row of g.cells) for (const c of row) {
    if (c.void && (c.p || c.block)) throw new Error('void has content L' + n);
    if (c.block && c.p) throw new Error('block+piece L' + n);
    if (!c.void && !c.block && !c.p) throw new Error('hole L' + n + ' ' + c.r + ',' + c.c);
    if (c.p && c.p.sp && !['h', 'v', 'k', 'k2', 'd'].includes(c.p.sp)) throw new Error('bad sp');
    if (c.jelly < 0) throw new Error('neg jelly');
  }
  if (g.moves < 0) throw new Error('negative moves L' + n);
}
(async () => {
  let games = 0, wins = 0, actions = 0;
  const t = Date.now();
  for (let n = 1; n <= 150; n++) for (let s = 0; s < 6; s++) {
    const g = new MM_Game(L.getLevel(n), { seed: n * 100 + s });
    const rng = L.rngFrom(n * 7 + s);
    if (s % 2) g.placeStartSpecial('d'); if (s % 3 === 0) g.placeStartSpecial('k');
    let k = 0;
    while (!g.over && k++ < 120) {
      const r = rng();
      actions++;
      if (r < 0.05) { await g.hammer(Math.floor(rng() * 9), Math.floor(rng() * 8)); }
      else if (r < 0.08) { await g.shake(); }
      else if (r < 0.12) { const a = [Math.floor(rng() * 9), Math.floor(rng() * 8)]; await g.trySwap(a, [a[0], a[1] + 1], true); }
      else if (r < 0.18) { // force a random special combo
        const opts = []; for (const row of g.cells) for (const c of row) if (g.movable(c) && !c.p.ing && g.movable(g.cell(c.r, c.c + 1)) && !g.cell(c.r, c.c + 1).p.ing) opts.push(c);
        if (opts.length) { const c = opts[Math.floor(rng() * opts.length)], d = g.cell(c.r, c.c + 1); const sps = ['h', 'v', 'k', 'd'];
          c.p.sp = sps[Math.floor(rng() * 4)]; d.p.sp = sps[Math.floor(rng() * 4)]; if (c.p.sp === 'd') c.p.c = -2; if (d.p.sp === 'd') d.p.c = -2;
          await g.trySwap([c.r, c.c], [d.r, d.c]); }
      } else {
        const ms = g.findMoves(false);
        if (!ms.length) { await g.shuffle(); continue; }
        const m = ms[Math.floor(rng() * ms.length)];
        await g.trySwap(m.a, m.b);
      }
      check(g, n);
      if (g.over && !g.won && rng() < 0.3) g.addMoves(5); // simulate Chai Break
    }
    games++; if (g.won) { wins++; if (g.stars() < 1) throw new Error('win without star'); }
  }
  console.log('fuzz ok:', games, 'games,', actions, 'actions,', wins, 'wins,', ((Date.now() - t) / 1000).toFixed(1) + 's');
})().catch(e => { console.error('FUZZ FAIL', e); process.exit(1); });
