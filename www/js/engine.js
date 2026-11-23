/* Masala Mela — match-3 engine. Pure game logic, no DOM.
 * Rendering hooks in via opts.emit(event, data) and opts.wait(ms|'settle').
 * (c) Deific Digital */
(function (G) {
  'use strict';
  const L = G.MM_LEVELS;
  const COLS = L.COLS, ROWS = L.ROWS;
  const CH2BLOCK = { T: 'tiffin', M: 'matka', F: 'fog', H: 'tawa', U: 'handi' };
  const BLOCK_HP = { tiffin: 2, matka: 2, fog: 1, tawa: 1, handi: 2 };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  let PID = 1;

  class Game {
    constructor(level, opts) {
      opts = opts || {};
      this.level = level;
      this.rng = L.rngFrom(opts.seed != null ? opts.seed : (Date.now() & 0xffffffff));
      this.emit = opts.emit || function () {};
      this.wait = opts.wait || function () { return Promise.resolve(); };
      this.moves = level.moves;
      this.score = 0;
      this.combo = 0;
      this.collected = [0, 0, 0, 0, 0, 0];
      this.ingCollected = 0;
      this.ingSpawned = 0;
      this.busy = false;
      this.over = false;
      this.won = false;
      this.fogHitThisMove = false;
      this.tawaTick = 0;
      this.movesUsed = 0;
      this.colorCount = level.colors;
      this.build();
    }

    // ---------------- setup ----------------
    build() {
      const lv = this.level;
      this.cells = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          const ch = lv.board[r][c];
          const cell = { r, c, void: ch === '#', jelly: lv.jelly ? +lv.jelly[r][c] || 0 : 0, block: null, p: null };
          if (cell.void) cell.jelly = 0;
          if (CH2BLOCK[ch]) cell.block = { type: CH2BLOCK[ch], hp: BLOCK_HP[CH2BLOCK[ch]], hot: false };
          row.push(cell);
        }
        this.cells.push(row);
      }
      // spawn cell per column = topmost playable cell
      this.spawnRow = [];
      this.exitRow = [];
      for (let c = 0; c < COLS; c++) {
        let top = -1, bot = -1;
        for (let r = 0; r < ROWS; r++) if (!this.cells[r][c].void) { if (top < 0) top = r; bot = r; }
        this.spawnRow[c] = top; this.exitRow[c] = bot;
      }
      // fill pieces without initial matches
      for (let attempt = 0; attempt < 50; attempt++) {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const cell = this.cells[r][c];
          if (cell.void || cell.block) { cell.p = null; continue; }
          let col, tries = 0;
          do { col = this.randColor(); tries++; }
          while (tries < 20 && ((c >= 2 && this.colorAt(r, c - 1) === col && this.colorAt(r, c - 2) === col) ||
            (r >= 2 && this.colorAt(r - 1, c) === col && this.colorAt(r - 2, c) === col)));
          cell.p = this.newPiece(col);
          cell.p.x = c; cell.p.y = r - ROWS - 1 + (ROWS - r) * 0.15; // drop-in on start
          const ch = lv.board[r][c];
          if (ch === 'D') cell.p.lock = 'dor';
          if (ch === 'I') cell.p.lock = 'ice';
        }
        if (this.findMoves(true).length > 0) break;
      }
      // initial ingredients on the top row
      const want = Math.min(lv.ing || 0, 2);
      for (let i = 0; i < want; i++) {
        const cols = [];
        for (let c = 0; c < COLS; c++) { const r = this.spawnRow[c]; if (r >= 0 && this.cells[r][c].p && !this.cells[r][c].p.lock) cols.push(c); }
        if (!cols.length) break;
        const c = cols[Math.floor(this.rng() * cols.length)];
        const cell = this.cells[this.spawnRow[c]][c];
        const np = this.newIng(); np.x = cell.p.x; np.y = cell.p.y; cell.p = np;
        this.ingSpawned++;
      }
      this.updateTawa(true);
    }

    newPiece(c, sp) { return { id: PID++, c, sp: sp || null, ing: 0, lock: null }; }
    newIng() { return { id: PID++, c: -1, sp: null, ing: 1 + (this.ingSpawned % 2), lock: null }; }
    randColor() { return Math.floor(this.rng() * this.colorCount); }

    inside(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
    cell(r, c) { return this.inside(r, c) ? this.cells[r][c] : null; }
    colorAt(r, c) {
      const cell = this.cell(r, c);
      if (!cell || cell.void || cell.block || !cell.p) return -9;
      const p = cell.p;
      if (p.ing || p.sp === 'd') return -9;
      return p.c;
    }
    movable(cell) { return cell && !cell.void && !cell.block && cell.p && !cell.p.lock; }

    // ---------------- goals ----------------
    countBlock(type) {
      let n = 0;
      for (const row of this.cells) for (const cell of row) {
        if (cell.block && cell.block.type === type) n++;
        if (cell.p && cell.p.lock === type) n++;
      }
      return n;
    }
    jellyLeft() { let n = 0; for (const row of this.cells) for (const cell of row) n += cell.jelly; return n; }

    goalStatus() {
      return this.level.goals.map(g => {
        switch (g.t) {
          case 'score': return { g, have: this.score, need: g.n, done: this.score >= g.n };
          case 'collect': { const have = Math.min(this.collected[g.c], g.n); return { g, have, need: g.n, left: g.n - have, done: have >= g.n }; }
          case 'jelly': { const left = this.jellyLeft(); return { g, left, done: left === 0 }; }
          case 'ing': return { g, have: this.ingCollected, need: g.n, left: g.n - this.ingCollected, done: this.ingCollected >= g.n };
          case 'block': { const left = this.countBlock(g.b); return { g, left, done: left === 0 }; }
        }
        return { g, done: true };
      });
    }
    allDone() { return this.goalStatus().every(s => s.done); }
    stars() { const s = this.level.stars || [0, 1e12, 1e12]; let n = 0; for (let i = 0; i < 3; i++) if (this.score >= s[i]) n = i + 1; return this.won ? Math.max(1, n) : 0; }

    addScore(n) { this.score += n; }

    // ---------------- matching ----------------
    findRuns() {
      const runs = [];
      for (let r = 0; r < ROWS; r++) {
        let c = 0;
        while (c < COLS) {
          const col = this.colorAt(r, c);
          if (col < 0) { c++; continue; }
          let e = c + 1; while (e < COLS && this.colorAt(r, e) === col) e++;
          if (e - c >= 3) { const cells = []; for (let i = c; i < e; i++) cells.push([r, i]); runs.push({ dir: 'h', cells, color: col }); }
          c = e;
        }
      }
      for (let c = 0; c < COLS; c++) {
        let r = 0;
        while (r < ROWS) {
          const col = this.colorAt(r, c);
          if (col < 0) { r++; continue; }
          let e = r + 1; while (e < ROWS && this.colorAt(e, c) === col) e++;
          if (e - r >= 3) { const cells = []; for (let i = r; i < e; i++) cells.push([i, c]); runs.push({ dir: 'v', cells, color: col }); }
          r = e;
        }
      }
      return runs;
    }

    findGroups() {
      const runs = this.findRuns();
      if (!runs.length) return [];
      // union runs sharing a cell
      const parent = runs.map((_, i) => i);
      const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const owner = {};
      runs.forEach((run, i) => run.cells.forEach(([r, c]) => {
        const k = r * COLS + c;
        if (owner[k] != null) parent[find(i)] = find(owner[k]); else owner[k] = i;
      }));
      const groups = {};
      runs.forEach((run, i) => { const g = find(i); (groups[g] = groups[g] || []).push(run); });
      return Object.values(groups).map(rs => {
        const set = new Map();
        rs.forEach(run => run.cells.forEach(([r, c]) => set.set(r * COLS + c, [r, c])));
        const maxLen = Math.max(...rs.map(x => x.cells.length));
        const hasH = rs.some(x => x.dir === 'h'), hasV = rs.some(x => x.dir === 'v');
        let sp = null;
        if (maxLen >= 5) sp = 'd';
        else if (hasH && hasV) sp = 'k';
        else if (maxLen === 4) sp = rs[0].dir === 'h' ? 'v' : 'h';
        // intersection for crosses
        let cross = null;
        if (hasH && hasV) {
          const counts = {};
          rs.forEach(run => run.cells.forEach(([r, c]) => { const k = r * COLS + c; counts[k] = (counts[k] || 0) + 1; }));
          for (const k in counts) if (counts[k] > 1) { cross = set.get(+k); break; }
        }
        return { runs: rs, cells: [...set.values()], color: rs[0].color, sp, cross, size: set.size };
      });
    }

    // ---------------- possible moves / hint ----------------
    swapCells(a, b) { const t = a.p; a.p = b.p; b.p = t; }

    lineLen(r, c, dr, dc, col) { let n = 0; r += dr; c += dc; while (this.colorAt(r, c) === col) { n++; r += dr; c += dc; } return n; }
    localMatch(r, c) {
      const col = this.colorAt(r, c);
      if (col < 0) return 0;
      const h = 1 + this.lineLen(r, c, 0, -1, col) + this.lineLen(r, c, 0, 1, col);
      const v = 1 + this.lineLen(r, c, -1, 0, col) + this.lineLen(r, c, 1, 0, col);
      let s = 0;
      if (h >= 3) s += h;
      if (v >= 3) s += v;
      if (h >= 3 && v >= 3) s += 3; // kadhai
      if (h >= 5 || v >= 5) s += 6;
      else if (h === 4 || v === 4) s += 2;
      return s;
    }

    // returns list of {a:[r,c], b:[r,c], value}
    findMoves(firstOnly) {
      const out = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const A = this.cells[r][c];
        if (!this.movable(A)) continue;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const B = this.cell(r + dr, c + dc);
          if (!this.movable(B)) continue;
          const pa = A.p, pb = B.p;
          let value = 0;
          const spA = pa.sp && !pa.ing, spB = pb.sp && !pb.ing;
          if ((pa.sp === 'd' && !pb.ing) || (pb.sp === 'd' && !pa.ing)) value = 30 + (spA && spB ? 30 : 0);
          else if (spA && spB) value = 25;
          else {
            this.swapCells(A, B);
            value = this.localMatch(r, c) + this.localMatch(r + dr, c + dc);
            this.swapCells(A, B);
          }
          if (value > 0) {
            out.push({ a: [r, c], b: [r + dr, c + dc], value });
            if (firstOnly) return out;
          }
        }
      }
      return out;
    }

    // ---------------- destruction ----------------
    damageBlock(cell, viaSpecial) {
      const b = cell.block;
      if (!b) return false;
      if (b.type === 'tawa' && b.hot) { this.emit('tawaHot', { r: cell.r, c: cell.c }); return false; }
      if (b.type === 'fog') this.fogHitThisMove = true;
      b.hp--;
      this.emit('blockHit', { r: cell.r, c: cell.c, type: b.type, hp: b.hp });
      if (b.hp <= 0) {
        cell.block = null;
        this.addScore(200);
        this.emit('blockBreak', { r: cell.r, c: cell.c, type: b.type });
        if (b.type === 'handi') {
          // hidden Belan under the Dum Handi lid
          const p = this.newPiece(this.randColor(), this.rng() < 0.5 ? 'h' : 'v');
          p.x = cell.c; p.y = cell.r; p.scale = 0.2;
          cell.p = p;
          this.emit('reveal', { r: cell.r, c: cell.c });
        }
      }
      return true;
    }

    // remove one cell's content. ctx = {via:'match'|'special', queue:[]}
    destroy(r, c, ctx) {
      const cell = this.cell(r, c);
      if (!cell || cell.void) return;
      const k = r * COLS + c;
      if (ctx.done.has(k)) return;
      ctx.done.add(k);
      if (cell.block) { this.damageBlock(cell, ctx.via === 'special'); return; }
      const p = cell.p;
      if (!p) { if (cell.jelly > 0) { cell.jelly--; this.addScore(100); this.emit('jelly', { r, c, left: cell.jelly }); } return; }
      if (p.ing) return; // ingredients can't be destroyed
      if (p.lock) {
        const was = p.lock; p.lock = null;
        this.emit('unlock', { r, c, type: was });
        this.addScore(100);
        return;
      }
      if (cell.jelly > 0) { cell.jelly--; this.addScore(100); this.emit('jelly', { r, c, left: cell.jelly }); }
      if (p.sp && !p.fired) {
        if (p.sp === 'k') {
          // first Kadhai blast; piece stays as k2 and blasts again after gravity
          p.sp = 'k2'; p.fired = false;
          ctx.queue.push({ r, c, p, kind: 'k' });
          ctx.done.delete(k); // allow its own second blast later
          return;
        }
        p.fired = true;
        ctx.queue.push({ r, c, p, kind: p.sp });
      }
      cell.p = null;
      if (p.c >= 0) this.collected[p.c]++;
      this.addScore(20 * Math.max(1, this.combo));
      this.emit('pop', { r, c, color: p.c, sp: p.sp, id: p.id });
    }

    runQueue(ctx) {
      let guard = 0;
      while (ctx.queue.length && guard++ < 500) {
        const a = ctx.queue.shift();
        this.activate(a, ctx);
      }
    }

    areaCells(kind, r, c, dir) {
      const out = [];
      if (kind === 'h') for (let i = 0; i < COLS; i++) out.push([r, i]);
      else if (kind === 'v') for (let i = 0; i < ROWS; i++) out.push([i, c]);
      else if (kind === 'k' || kind === 'k2') { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push([r + i, c + j]); }
      return out.filter(([a, b]) => this.inside(a, b));
    }

    activate(a, ctx) {
      const { r, c, p, kind } = a;
      this.addScore(kind === 'd' ? 500 : 250);
      if (kind === 'h' || kind === 'v') {
        this.emit('belan', { r, c, dir: kind });
        for (const [x, y] of this.areaCells(kind, r, c)) this.destroy(x, y, ctx);
      } else if (kind === 'k' || kind === 'k2') {
        this.emit('kadhai', { r, c, second: kind === 'k2' });
        for (const [x, y] of this.areaCells('k', r, c)) if (!(x === r && y === c)) this.destroy(x, y, ctx);
        if (kind === 'k2') { const cell = this.cell(r, c); if (cell.p === p) { cell.p = null; this.emit('pop', { r, c, color: p.c, sp: 'k2', id: p.id }); } }
      } else if (kind === 'd') {
        // clear most common colour
        const col = a.color != null ? a.color : this.mostCommonColor();
        const targets = [];
        for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (this.colorAt(i, j) === col) targets.push([i, j]);
        this.emit('dabba', { r, c, targets, color: col });
        for (const [x, y] of targets) this.destroy(x, y, ctx);
      } else if (kind === 'all') {
        this.emit('dabba', { r, c, targets: [], color: -1, all: true });
        for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) this.destroy(i, j, ctx);
      }
    }

    mostCommonColor() {
      const n = [0, 0, 0, 0, 0, 0];
      for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) { const col = this.colorAt(i, j); if (col >= 0) n[col]++; }
      let best = 0; for (let i = 1; i < 6; i++) if (n[i] > n[best]) best = i;
      return best;
    }

    newCtx(via) { return { via, queue: [], done: new Set() }; }

    // resolve matches once; returns true if anything matched
    resolveMatches(swapA, swapB) {
      const groups = this.findGroups();
      if (!groups.length) return false;
      this.combo++;
      const ctx = this.newCtx('match');
      const creations = [];
      const adjHit = new Set();
      for (const grp of groups) {
        // pick spawn cell for special
        if (grp.sp) {
          let spawn = null;
          const inGrp = rc => rc && grp.cells.some(([r, c]) => r === rc[0] && c === rc[1]);
          if (inGrp(swapB)) spawn = swapB; else if (inGrp(swapA)) spawn = swapA;
          else if (grp.cross) spawn = grp.cross;
          else { const longest = grp.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a)); spawn = longest.cells[Math.floor(longest.cells.length / 2)]; }
          const sc = this.cell(spawn[0], spawn[1]);
          if (sc.p && !sc.p.sp && !sc.p.lock) creations.push({ r: spawn[0], c: spawn[1], sp: grp.sp, color: grp.color });
        }
        // adjacent blocker damage (once per blocker per step)
        for (const [r, c] of grp.cells) for (const [dr, dc] of DIRS) {
          const n = this.cell(r + dr, c + dc);
          if (!n || n.void) continue;
          const key = (r + dr) * COLS + c + dc;
          if (adjHit.has(key)) continue;
          if (n.block) { adjHit.add(key); this.damageBlock(n, false); }
          else if (n.p && n.p.lock === 'ice' && !grp.cells.some(([a, b]) => a === r + dr && b === c + dc)) {
            adjHit.add(key); n.p.lock = null; this.emit('unlock', { r: r + dr, c: c + dc, type: 'ice' }); this.addScore(100);
          }
        }
      }
      const created = new Set(creations.map(x => x.r * COLS + x.c));
      for (const grp of groups) for (const [r, c] of grp.cells) {
        if (created.has(r * COLS + c)) {
          // the piece that becomes special: clear jelly underneath and count it
          const cell = this.cells[r][c];
          if (cell.jelly > 0) { cell.jelly--; this.emit('jelly', { r, c, left: cell.jelly }); }
          this.collected[cell.p.c]++;
          ctx.done.add(r * COLS + c);
          continue;
        }
        this.destroy(r, c, ctx);
      }
      for (const cr of creations) {
        const cell = this.cells[cr.r][cr.c];
        if (!cell.p) continue;
        cell.p.sp = cr.sp;
        if (cr.sp === 'd') cell.p.c = -2;
        cell.p.scale = 0.4;
        this.addScore(cr.sp === 'd' ? 300 : 150);
        this.emit('special', { r: cr.r, c: cr.c, sp: cr.sp });
      }
      this.runQueue(ctx);
      const total = groups.reduce((s, g) => s + g.size, 0);
      this.emit('matched', { combo: this.combo, size: total, groups: groups.length });
      return true;
    }

    // ---------------- gravity ----------------
    gravity() {
      let changed = false, guard = 0, moved = true;
      while (moved && guard++ < 200) {
        moved = false;
        for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) {
          const cell = this.cells[r][c];
          if (cell.void || cell.block || cell.p) continue;
          // look straight up through void cells
          let rr = r - 1;
          while (rr >= 0 && this.cells[rr][c].void) rr--;
          if (rr < 0) { this.spawnInto(cell); moved = true; continue; }
          const up = this.cells[rr][c];
          if (this.movable(up) || (up.p && up.p.ing && !up.block)) {
            cell.p = up.p; up.p = null; moved = true; continue;
          }
          if (!up.p && !up.block) continue; // will fill later
          // blocked above -> diagonal slide
          for (const dc of [-1, 1]) {
            const side = this.cell(r - 1, c + dc);
            const below = this.cell(r, c + dc);
            if (!side || !this.movable(side) && !(side.p && side.p.ing && !side.block)) continue;
            if (below && !below.void && !below.block && !below.p) continue; // it will fall straight instead
            cell.p = side.p; side.p = null; moved = true; break;
          }
        }
        if (moved) changed = true;
      }
      // starved cells (under a blocker with no diagonal feeder) get a piece that pops in
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const cell = this.cells[r][c];
        if (cell.void || cell.block || cell.p) continue;
        const p = this.newPiece(this.randColor());
        p.x = c; p.y = r; p.scale = 0.05;
        cell.p = p; changed = true;
      }
      return changed;
    }

    spawnInto(cell) {
      let p;
      const lv = this.level;
      const ingOnBoard = this.countIng();
      if (lv.ing && this.ingSpawned < lv.ing && ingOnBoard < 2 && this.ingCollected + ingOnBoard < lv.ing &&
          this.movesUsed > 0 && (ingOnBoard === 0 || this.rng() < 0.25)) {
        p = this.newIng(); this.ingSpawned++;
      } else p = this.newPiece(this.randColor());
      // start above the column top; renderer animates
      const above = this.colFill[cell.c] = (this.colFill[cell.c] || 0) + 1;
      p.x = cell.c; p.y = this.spawnRow[cell.c] - above;
      cell.p = p;
    }

    countIng() { let n = 0; for (const row of this.cells) for (const cell of row) if (cell.p && cell.p.ing) n++; return n; }

    collectIngredients() {
      let any = false;
      for (let c = 0; c < COLS; c++) {
        // an ingredient exits when nothing passable is left below it
        let r = -1;
        for (let rr = ROWS - 1; rr >= 0; rr--) {
          const x = this.cells[rr][c];
          if (x.p && x.p.ing) { r = rr; break; }
          if (!x.void && !x.block) break;
        }
        if (r < 0) continue;
        const cell = this.cells[r][c];
        if (cell.p && cell.p.ing) {
          this.emit('ingredient', { r, c, kind: cell.p.ing });
          cell.p = null; this.ingCollected++; this.addScore(1000); any = true;
        }
      }
      return any;
    }

    async fall() {
      this.colFill = {};
      this.gravity();
      this.colFill = {};
      await this.wait('settle');
      while (this.collectIngredients()) { this.gravity(); this.colFill = {}; await this.wait('settle'); }
    }

    // after gravity, fire any pending second Kadhai blasts
    pendingK2() {
      const list = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = this.cells[r][c].p; if (p && p.sp === 'k2') list.push({ r, c, p, kind: 'k2' }); }
      return list;
    }

    async cascade(swapA, swapB) {
      let first = true;
      for (let loop = 0; loop < 60; loop++) {
        const k2 = this.pendingK2();
        if (k2.length) {
          const ctx = this.newCtx('special');
          k2.forEach(a => { a.p.fired = true; ctx.queue.push(a); });
          this.runQueue(ctx);
          this.emit('shake', { power: 1 });
          await this.wait(260);
          await this.fall();
          continue;
        }
        const matched = this.resolveMatches(first ? swapA : null, first ? swapB : null);
        first = false;
        if (!matched) break;
        await this.wait(this.combo > 1 ? 200 : 230);
        await this.fall();
      }
    }

    // ---------------- player actions ----------------
    canSwap(a, b) {
      if (!a || !b) return false;
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return false;
      return this.movable(this.cell(a[0], a[1])) && this.movable(this.cell(b[0], b[1]));
    }

    async trySwap(a, b, free) {
      if (this.busy || this.over || !this.canSwap(a, b)) return false;
      this.busy = true;
      const A = this.cell(a[0], a[1]), B = this.cell(b[0], b[1]);
      this.swapCells(A, B);
      this.emit('swap', { a, b });
      await this.wait(150);
      this.combo = 0;
      this.fogHitThisMove = false;
      const handled = this.specialSwap(A, B);
      if (!handled) this.combo = 0;
      if (!handled && !this.findGroups().length) {
        if (free) { // chimta swap booster: allowed without match
          this.endMoveCommon(true);
          await this.afterMove(); this.busy = false; return true;
        }
        this.swapCells(A, B);
        this.emit('badSwap', { a, b });
        await this.wait(200);
        this.busy = false;
        return false;
      }
      if (!free) { this.moves--; }
      this.movesUsed++;
      if (handled) {
        this.emit('shake', { power: 2 });
        await this.wait(300);
        await this.fall();
      }
      await this.cascade(a, b);
      await this.afterMove();
      this.busy = false;
      return true;
    }

    specialSwap(A, B) {
      const pa = A.p, pb = B.p;
      if (pa.ing || pb.ing) return false;
      const ctx = this.newCtx('special');
      this.combo = 1;
      const fire = (cell) => { if (cell.p) { cell.p.fired = true; } };
      if (pa.sp === 'd' || pb.sp === 'd') {
        const D = pa.sp === 'd' ? A : B, O = D === A ? B : A;
        const op = O.p;
        if (op.sp === 'd') {
          fire(A); fire(B);
          A.p = null; B.p = null;
          this.activate({ r: B.r, c: B.c, kind: 'all' }, ctx);
        } else if (op.sp === 'h' || op.sp === 'v' || op.sp === 'k') {
          const col = op.c;
          D.p.fired = true; D.p = null;
          this.emit('dabba', { r: D.r, c: D.c, targets: [], color: col });
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const cell = this.cells[r][c];
            if (this.colorAt(r, c) === col && cell.p && !cell.p.sp) cell.p.sp = op.sp === 'k' ? 'k' : (this.rng() < 0.5 ? 'h' : 'v');
          }
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.colorAt(r, c) === col) this.destroy(r, c, ctx);
        } else {
          const col = op.c;
          D.p.fired = true; D.p = null; ctx.done.add(D.r * COLS + D.c);
          this.activate({ r: D.r, c: D.c, kind: 'd', color: col }, ctx);
        }
        this.runQueue(ctx);
        this.emit('praise', { key: 'special' });
        return true;
      }
      const isLine = s => s === 'h' || s === 'v';
      const isK = s => s === 'k' || s === 'k2';
      if (pa.sp && pb.sp) {
        const r = B.r, c = B.c;
        A.p.fired = true; B.p.fired = true;
        const area = new Map();
        const add = (x, y) => { if (this.inside(x, y)) area.set(x * COLS + y, [x, y]); };
        if (isLine(pa.sp) && isLine(pb.sp)) {
          for (let i = 0; i < COLS; i++) add(r, i); for (let i = 0; i < ROWS; i++) add(i, c);
          this.emit('belan', { r, c, dir: 'h' }); this.emit('belan', { r, c, dir: 'v' });
        } else if (isK(pa.sp) && isK(pb.sp)) {
          for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) add(r + i, c + j);
          this.emit('kadhai', { r, c, big: true });
        } else {
          for (let d = -1; d <= 1; d++) { for (let i = 0; i < COLS; i++) add(r + d, i); for (let i = 0; i < ROWS; i++) add(i, c + d); }
          for (let d = -1; d <= 1; d++) { this.emit('belan', { r: r + d, c, dir: 'h' }); this.emit('belan', { r, c: c + d, dir: 'v' }); }
        }
        A.p = null; B.p = null;
        this.addScore(1000);
        for (const [x, y] of area.values()) this.destroy(x, y, ctx);
        this.runQueue(ctx);
        this.emit('praise', { key: 'special' });
        return true;
      }
      return false;
    }

    endMoveCommon() {}

    async afterMove() {
      // Fika Fog spreads if the player didn't hit any fog this move
      if (!this.fogHitThisMove && this.countBlock('fog') > 0 && !this.over) {
        const fogs = [];
        for (const row of this.cells) for (const cell of row) if (cell.block && cell.block.type === 'fog') fogs.push(cell);
        const opts = [];
        for (const f of fogs) for (const [dr, dc] of DIRS) {
          const n = this.cell(f.r + dr, f.c + dc);
          if (n && !n.void && !n.block && n.p && !n.p.sp && !n.p.ing && !n.p.lock) opts.push(n);
        }
        if (opts.length) {
          const t = opts[Math.floor(this.rng() * opts.length)];
          t.p = null; t.block = { type: 'fog', hp: 1 };
          this.emit('fogSpread', { r: t.r, c: t.c });
          await this.wait(250);
        }
      }
      this.updateTawa(false);
      if (this.allDone()) { await this.winSequence(); return; }
      if (this.moves <= 0) { this.over = true; this.won = false; this.emit('lose', {}); return; }
      if (!this.findMoves(true).length) await this.shuffle();
    }

    updateTawa(initial) {
      if (!initial) this.tawaTick++;
      const hot = Math.floor(this.tawaTick / 2) % 2 === 1;
      for (const row of this.cells) for (const cell of row)
        if (cell.block && cell.block.type === 'tawa') { if (cell.block.hot !== hot) { cell.block.hot = hot; this.emit('tawa', { r: cell.r, c: cell.c, hot }); } }
    }

    async shuffle() {
      const slots = [];
      for (const row of this.cells) for (const cell of row) if (this.movable(cell) && !cell.p.ing) slots.push(cell);
      const pieces = slots.map(s => s.p);
      for (let attempt = 0; attempt < 60; attempt++) {
        for (let i = pieces.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
        if (attempt > 30) pieces.forEach(p => { if (!p.sp) p.c = this.randColor(); });
        slots.forEach((s, i) => { s.p = pieces[i]; });
        if (!this.findGroups().length && this.findMoves(true).length) break;
      }
      this.emit('shuffle', {});
      await this.wait('settle');
      await this.cascade(null, null);
    }

    // ---- boosters ----
    async hammer(r, c) {
      if (this.busy || this.over) return false;
      const cell = this.cell(r, c);
      if (!cell || cell.void || (!cell.p && !cell.block && !cell.jelly)) return false;
      if (cell.p && cell.p.ing) return false;
      this.busy = true; this.combo = 1; this.fogHitThisMove = true;
      const ctx = this.newCtx('special');
      this.emit('hammer', { r, c });
      await this.wait(200);
      this.destroy(r, c, ctx); this.runQueue(ctx);
      await this.wait(150);
      await this.fall();
      await this.cascade(null, null);
      if (this.allDone()) await this.winSequence();
      else if (!this.findMoves(true).length) await this.shuffle();
      this.busy = false;
      return true;
    }
    async shake() {
      if (this.busy || this.over) return false;
      this.busy = true; await this.shuffle(); this.busy = false; return true;
    }
    addMoves(n) { this.moves += n; this.over = false; this.emit('moves', { moves: this.moves }); }
    placeStartSpecial(sp) {
      const opts = [];
      for (const row of this.cells) for (const cell of row) if (this.movable(cell) && !cell.p.sp && !cell.p.ing) opts.push(cell);
      if (!opts.length) return;
      const cell = opts[Math.floor(this.rng() * opts.length)];
      if (sp === 'd') { cell.p.sp = 'd'; cell.p.c = -2; } else cell.p.sp = sp;
      this.emit('special', { r: cell.r, c: cell.c, sp });
    }

    // ---- "Dhamaka Time": leftover moves become Belans and blast ----
    async winSequence() {
      this.won = true;
      this.emit('goalDone', {});
      await this.wait(700);
      let extra = Math.min(this.moves, 12);
      while (extra-- > 0) {
        const opts = [];
        for (const row of this.cells) for (const cell of row) if (this.movable(cell) && !cell.p.sp && !cell.p.ing) opts.push(cell);
        if (!opts.length) break;
        const cell = opts[Math.floor(this.rng() * opts.length)];
        cell.p.sp = this.rng() < 0.5 ? 'h' : 'v';
        this.moves--; this.addScore(300);
        this.emit('special', { r: cell.r, c: cell.c, sp: cell.p.sp, bonus: true });
        await this.wait(90);
      }
      this.score += this.moves * 300; this.moves = 0;
      for (let loop = 0; loop < 20; loop++) {
        const sps = [];
        for (const row of this.cells) for (const cell of row) if (cell.p && cell.p.sp && !cell.p.ing) sps.push(cell);
        if (!sps.length) break;
        const ctx = this.newCtx('special'); this.combo = 1;
        for (const cell of sps) this.destroy(cell.r, cell.c, ctx);
        this.runQueue(ctx);
        this.emit('shake', { power: 2 });
        await this.wait(300);
        await this.fall();
        await this.cascade(null, null);
      }
      this.over = true;
      this.emit('win', { score: this.score, stars: this.stars() });
    }
  }

  G.MM_Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
