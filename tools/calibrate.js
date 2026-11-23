// Bot-tests all 150 levels and tunes moves / score targets / star thresholds
// to the GDD 5.1 win-rate curve. Writes www/js/levels-data.js.
// Usage: node tools/calibrate.js [N=40]
const fs = require('fs');
const path = require('path');
const { playLevel } = require('./sim');
const N = +process.argv[2] || 40;
const Lv = globalThis.MM_LEVELS;

function q(arr, p) { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * s.length)))]; }
const round = (x, m) => Math.max(m, Math.round(x / m) * m);

async function runMany(level, n, tag) {
  const res = [];
  for (let s = 0; s < n; s++) {
    const game = new globalThis.MM_Game(level, { seed: 1000 + s * 17 + tag });
    let atGoal = null;
    game.emit = (ev) => { if (ev === 'goalDone') atGoal = game.score; };
    const rng = Lv.rngFrom(s * 131 + 5 + tag);
    const { botPick } = require('./sim');
    let safety = 0;
    while (!game.over && safety++ < 300) {
      const m = botPick(game, rng);
      if (!m) { await game.shuffle(); continue; }
      await game.trySwap(m.a, m.b);
    }
    res.push({ won: game.won, score: game.score, atGoal, endScore: game.score });
  }
  return res;
}
const winRate = r => r.filter(x => x.won).length / r.length;

async function tuneMoves(level, target) {
  let lo = 15, hi = 50, best = hi, bestRes = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    level.moves = mid;
    const r = await runMany(level, N, mid);
    if (winRate(r) >= target) { best = mid; bestRes = r; hi = mid - 1; } else lo = mid + 1;
  }
  level.moves = best;
  if (!bestRes) bestRes = await runMany(level, N, 999);
  return bestRes;
}

(async () => {
  const out = {};
  const eased = {};
  const boardChanged = {};
  const report = [];
  for (let n = 1; n <= Lv.TOTAL; n++) {
    const level = Lv.genLevel(n);
    const target = Lv.difficultyTarget(n);
    const scoreGoal = level.goals.find(g => g.t === 'score');
    const others = level.goals.filter(g => g.t !== 'score');
    let res, score = 0;
    if (!others.length) {
      // pure score level: keep moves from design, find score target by quantile
      if (n > 15) level.moves = 20 + Math.floor(((n - 1) % 15) / 5) * 2;
      scoreGoal.n = 1e12;
      const r = await runMany(level, N, 1);
      const pre = r.map(x => x.endScore);
      score = round(q(pre, 1 - target), 500);
      scoreGoal.n = score;
      res = await runMany(level, N, 2);
    } else {
      if (scoreGoal) {
        const keep = scoreGoal.n; level.goals = others;
        res = await tuneMoves(level, Math.min(0.97, target + 0.08));
        const atGoal = res.filter(x => x.won).map(x => x.atGoal);
        score = round(q(atGoal, 0.35), 500);
        level.goals = [...others, scoreGoal]; scoreGoal.n = score || keep;
        res = await tuneMoves(level, target);
      } else {
        res = await tuneMoves(level, target);
      }
    }
    // auto-ease levels the bot can't win at max moves
    for (let step = 0; step < 4 && winRate(res) < target - 0.05; step++) {
      if (level.colors === 6) level.colors = 5;
      else if (step <= 1 && level.goals.some(g => g.t === 'collect' || g.t === 'ing'))
        level.goals.forEach(g => { if (g.t === 'collect') g.n = Math.round(g.n * 0.75); if (g.t === 'ing' && g.n > 1) { g.n--; level.ing = g.n; } });
      else {
        // thin out blockers: remove every other blocker cell, and the top jelly row
        let k = 0;
        level.board = level.board.map(row => row.split('').map(ch => ('TMFHUDI'.includes(ch) && (k++ % 2 === 0)) ? '.' : ch).join(''));
        const jr = level.jelly.findIndex(r => /[12]/.test(r));
        if (jr >= 0 && level.jelly.filter(r => /[12]/.test(r)).length > 2) level.jelly[jr] = '00000000';
        level.goals = level.goals.filter(g => g.t !== 'block' || level.board.some(r => r.includes({ tiffin: 'T', matka: 'M', fog: 'F', tawa: 'H', handi: 'U', dor: 'D', ice: 'I' }[g.b])));
        if (!level.goals.length) level.goals = [{ t: 'jelly' }];
        boardChanged[n] = true;
      }
      res = await tuneMoves(level, target);
      eased[n] = true;
    }
    const wins = res.filter(x => x.won).map(x => x.score);
    const base = scoreGoal ? score : 0;
    let s2 = round(Math.max(base * 1.2, q(wins, 0.45)), 500);
    let s3 = round(Math.max(s2 * 1.15, q(wins, 0.82)), 500);
    out[n] = { moves: level.moves, score: score || undefined, stars: [base, s2, s3], botWin: +winRate(res).toFixed(2), target, colors: level.colors, goalsN: level.goals.map(g => g.n == null ? null : g.n), ing: level.ing };
    if (boardChanged[n]) { out[n].board = level.board; out[n].jelly = level.jelly; out[n].goals = level.goals; }
    report.push(`${n}\tw${level.world}\tmoves ${level.moves}\tcolors ${level.colors}${eased[n] ? ' (eased)' : ''}\twin ${winRate(res).toFixed(2)} (target ${target})\t${level.goals.map(g => g.t + (g.b ? ':' + g.b : '') + (g.t === 'score' ? ':' + score : '')).join(',')}`);
    if (n % 15 === 0) console.log('calibrated through level', n);
  }
  const js = '/* Auto-generated by tools/calibrate.js — bot-tested level tuning. Do not edit by hand. */\n' +
    '(function(G){G.MM_TUNED=' + JSON.stringify(out) + ';})(typeof window!=="undefined"?window:globalThis);\n';
  fs.writeFileSync(path.join(__dirname, '..', 'www', 'js', 'levels-data.js'), js);
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'LEVEL_BALANCE_REPORT.txt'), 'Level\tWorld\tMoves\tBot win rate\tGoals\n' + report.join('\n') + '\n');
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
