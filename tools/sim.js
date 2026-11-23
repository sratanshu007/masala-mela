// Headless bot player for Masala Mela levels. Used by calibrate.js and tests.
const path = require('path');
const www = path.join(__dirname, '..', 'www', 'js');
require(path.join(www, 'worlds.js'));
require(path.join(www, 'levels.js'));
require(path.join(www, 'engine.js'));

function botPick(game, rng) {
  const moves = game.findMoves(false);
  if (!moves.length) return null;
  const goals = game.goalStatus();
  const wantJelly = goals.some(s => s.g.t === 'jelly' && !s.done);
  const wantIng = goals.some(s => s.g.t === 'ing' && !s.done);
  const wantCols = goals.filter(s => s.g.t === 'collect' && !s.done).map(s => s.g.c);
  let best = null, bestV = -1;
  for (const m of moves) {
    let v = m.value;
    const A = game.cell(m.a[0], m.a[1]), B = game.cell(m.b[0], m.b[1]);
    if (wantJelly) v += (A.jelly + B.jelly) * 1.5;
    if (wantCols.length && (wantCols.includes(A.p.c) || wantCols.includes(B.p.c))) v += 2;
    if (wantIng) {
      if (A.p.ing || B.p.ing) v += 3;
      for (const [r, c] of [m.a, m.b]) for (let rr = r - 1; rr >= 0; rr--) { const x = game.cell(rr, c); if (x.p && x.p.ing) { v += 3; break; } }
    }
    v += (m.a[0] + m.b[0]) * 0.15; // prefer lower moves (more cascades)
    v += rng() * 2.2; // human-like imperfection
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

async function playLevel(level, seed, maxMoves) {
  const game = new globalThis.MM_Game(level, { seed });
  const rng = globalThis.MM_LEVELS.rngFrom(seed * 31 + 7);
  let safety = 0;
  while (!game.over && safety++ < 300) {
    const m = botPick(game, rng);
    if (!m) { await game.shuffle(); continue; }
    await game.trySwap(m.a, m.b);
  }
  return { won: game.won, score: game.score, movesLeftAtWin: game.won ? null : 0, used: game.movesUsed };
}

module.exports = { playLevel, botPick };
