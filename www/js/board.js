/* Masala Mela — board renderer, animations, particles and touch input.
 * (c) Deific Digital */
(function (G) {
  'use strict';
  const ART = G.MM_ART, AU = G.MM_AUDIO;
  const COLS = G.MM_LEVELS.COLS, ROWS = G.MM_LEVELS.ROWS;
  const PCOL = G.MM_DATA.PIECES.map(p => p.col);
  const MAX_PARTICLES = 220;

  class BoardView {
    constructor(canvas, hooks) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.hooks = hooks || {};
      this.game = null;
      this.parts = []; this.pops = []; this.fx = []; this.floats = []; this.popBuf = []; this.flash = 0;
      this.shakeT = 0; this.shakePow = 0;
      this.waiters = [];
      this.sel = null; this.drag = null;
      this.mode = null; // 'hammer' | 'chimta'
      this.lastInput = performance.now();
      this.hint = null;
      this.lowQuality = (navigator.hardwareConcurrency || 4) <= 4;
      this.time = 0;
      this.running = false;
      this.bindInput();
      window.addEventListener('resize', () => this.resize());
    }

    attach(game) {
      this.game = game;
      this.parts = []; this.pops = []; this.fx = []; this.floats = []; this.popBuf = []; this.flash = 0; this.lastScore = 0;
      this.sel = null; this.mode = null; this.frameCache = null; this.hint = null;
      this.lastInput = performance.now();
      this.resize();
      if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }
    }
    stop() { this.running = false; this.game = null; this.waiters.forEach(w => w.res()); this.waiters = []; }

    resize() {
      const box = this.cv.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.cv.width = Math.floor(box.width * dpr); this.cv.height = Math.floor(box.height * dpr);
      this.cv.style.width = box.width + 'px'; this.cv.style.height = box.height + 'px';
      const cs = Math.floor(Math.min(box.width / (COLS + 0.4), box.height / (ROWS + 0.4)));
      this.cs = cs;
      this.ox = Math.floor((box.width - cs * COLS) / 2);
      this.oy = Math.floor((box.height - cs * ROWS) / 2);
      this.spriteSize = Math.round(cs * dpr);
      this.frameCache = null;
    }

    // wooden board frame + 3D tiles, painted once per level/resize
    buildFrame() {
      const g = this.game, cs = this.cs, dpr = this.dpr, pad = Math.round(cs * 0.16);
      const c = document.createElement('canvas');
      c.width = Math.round((cs * COLS + pad * 2) * dpr); c.height = Math.round((cs * ROWS + pad * 2) * dpr);
      const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.translate(pad, pad);
      const cellPath = (inf) => { ctx.beginPath(); for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) if (!g.cells[r][q].void) { const x = q * cs - inf, y = r * cs - inf, w = cs + inf * 2; ctx.moveTo(x + inf, y); ctx.arcTo(x + w, y, x + w, y + w, inf); ctx.arcTo(x + w, y + w, x, y + w, inf); ctx.arcTo(x, y + w, x, y, inf); ctx.arcTo(x, y, x + w, y, inf); ctx.closePath(); } };
      // outer wood with drop shadow
      ctx.save(); ctx.shadowColor = 'rgba(40,15,0,.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
      const wood = ctx.createLinearGradient(0, -pad, 0, cs * ROWS + pad); wood.addColorStop(0, '#B97A45'); wood.addColorStop(0.5, '#8B5428'); wood.addColorStop(1, '#6A3A18');
      ctx.fillStyle = wood; cellPath(pad * 0.9); ctx.fill('nonzero'); ctx.restore();
      ctx.strokeStyle = 'rgba(255,220,170,.45)'; ctx.lineWidth = 2; cellPath(pad * 0.9); ctx.stroke();
      // inner well
      ctx.fillStyle = '#5A3014'; cellPath(pad * 0.25); ctx.fill('nonzero');
      for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
        if (g.cells[r][q].void) continue;
        const tile = ART.tile && ART.tile((r + q) % 2);
        if (tile) ctx.drawImage(tile, q * cs + 1, r * cs + 1, cs - 2, cs - 2);
        else { ctx.fillStyle = (r + q) % 2 ? '#E9CFA6' : '#F6E3C0'; ART.roundRect(ctx, q * cs + 2, r * cs + 2, cs - 4, cs - 4, cs * 0.18); ctx.fill(); }
      }
      this.frameCache = { c, pad };
    }

    // ---------- engine hooks ----------
    wait(ms) {
      return new Promise(res => {
        if (!this.game) return res();
        if (ms === 'settle') this.waiters.push({ settle: true, res, until: performance.now() + 1600 });
        else this.waiters.push({ until: performance.now() + ms, res });
      });
    }

    onEvent(ev, d) {
      const cs = this.cs;
      switch (ev) {
        case 'pop': {
          if (d.color >= 0 || d.sp) {
            const spr = d.sp === 'd' ? ART.special(0, 'd', this.spriteSize) : ART.piece(Math.max(0, d.color), this.spriteSize);
            this.pops.push({ x: d.c, y: d.r, t: 0, spr });
            this.popBuf.push([d.c, d.r]);
            this.burst(d.c, d.r, d.color >= 0 ? PCOL[d.color] : '#FFC83D', this.lowQuality ? 5 : 9);
          }
          break;
        }
        case 'swap': AU.play('swap'); break;
        case 'badSwap': AU.play('bad'); this.fx.push({ k: 'wobble', a: d.a, b: d.b, t: 0, d: 0.25 }); break;
        case 'matched': {
          AU.play('match', d.combo); AU.bump(0.25); this.hooks.onCombo && this.hooks.onCombo(d.combo, d.size);
          const gs = this.game ? this.game.score : 0, gain = gs - this.lastScore; this.lastScore = gs;
          if (this.popBuf.length && gain > 0) {
            const cx = this.popBuf.reduce((a, p) => a + p[0], 0) / this.popBuf.length, cy = this.popBuf.reduce((a, p) => a + p[1], 0) / this.popBuf.length;
            this.floats.push({ x: cx, y: cy, t: 0, text: '+' + gain, big: d.combo > 2, color: d.combo > 2 ? '#FFD23F' : '#FFFFFF' });
          }
          this.popBuf = [];
          break;
        }
        case 'special': AU.play(d.bonus ? 'tik' : 'special'); this.fx.push({ k: 'glow', x: d.c, y: d.r, t: 0, d: 0.45 }); this.fx.push({ k: 'wave', x: d.c, y: d.r, t: 0, d: 0.45, col: '255,230,140' }); break;
        case 'belan': AU.play('belan'); this.fx.push({ k: 'beam', x: d.c, y: d.r, dir: d.dir, t: 0, d: 0.4 }); this.flash = Math.max(this.flash, 0.2); break;
        case 'kadhai': AU.play('kadhai', d.second); this.fx.push({ k: 'ring', x: d.c, y: d.r, t: 0, d: 0.35, big: d.big }); this.fx.push({ k: 'wave', x: d.c, y: d.r, t: 0, d: 0.5, col: '255,140,60', big: true }); this.flash = Math.max(this.flash, d.big ? 0.8 : 0.4); this.shake(d.big ? 10 : 5); break;
        case 'dabba': AU.play('dabba'); this.fx.push({ k: 'bolt', x: d.c, y: d.r, targets: d.targets, t: 0, d: 0.55, all: d.all }); this.fx.push({ k: 'wave', x: d.c, y: d.r, t: 0, d: 0.6, col: '255,128,200', big: true }); this.flash = Math.max(this.flash, d.all ? 1 : 0.5); if (d.all) this.shake(12); break;
        case 'blockHit': AU.play(d.type === 'tiffin' ? 'tiffin' : d.type === 'fog' ? 'fog' : 'matka'); this.burst(d.c, d.r, d.type === 'fog' ? '#9E9E9E' : d.type === 'tiffin' ? '#CFD8DC' : '#BF6A3A', 7); break;
        case 'blockBreak': this.burst(d.c, d.r, '#FFD54F', 10); this.fx.push({ k: 'wave', x: d.c, y: d.r, t: 0, d: 0.4, col: '255,255,255' }); this.hooks.onBlockBreak && this.hooks.onBlockBreak(d); break;
        case 'jelly': AU.play('jelly'); this.burst(d.c, d.r, '#FF5C8A', 6); break;
        case 'unlock': AU.play('unlock'); this.burst(d.c, d.r, d.type === 'ice' ? '#B3E5FC' : '#E91E63', 8); break;
        case 'fogSpread': AU.play('fog'); this.burst(d.c, d.r, '#8D8D8D', 10); break;
        case 'ingredient': AU.play('ingredient'); this.fx.push({ k: 'glow', x: d.c, y: d.r, t: 0, d: 0.6 }); this.burst(d.c, d.r, '#FFD740', 14); break;
        case 'hammer': AU.play('hammer'); this.fx.push({ k: 'hammer', x: d.c, y: d.r, t: 0, d: 0.3 }); this.shake(6); break;
        case 'shake': this.shake(d.power * 4); break;
        case 'shuffle': AU.play('whoosh'); this.hooks.onShuffle && this.hooks.onShuffle(); break;
        case 'tawaHot': this.burst(d.c, d.r, '#FF7043', 4); break;
        case 'reveal': AU.play('special'); this.fx.push({ k: 'glow', x: d.c, y: d.r, t: 0, d: 0.5 }); break;
      }
      this.hooks.onEvent && this.hooks.onEvent(ev, d);
    }

    shake(p) { this.shakePow = Math.min(12, Math.max(this.shakePow, p)); this.shakeT = 0.3; }

    burst(c, r, color, n) {
      for (let i = 0; i < n && this.parts.length < MAX_PARTICLES; i++) {
        const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
        this.parts.push({ x: c + 0.5, y: r + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 0.5 + Math.random() * 0.4, t: 0, color, size: 0.06 + Math.random() * 0.07, rot: Math.random() * 6 });
      }
      const sparks = this.lowQuality ? 1 : 3;
      for (let i = 0; i < sparks && this.parts.length < MAX_PARTICLES; i++) {
        const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 2;
        this.parts.push({ spark: true, x: c + 0.5, y: r + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: 0.45 + Math.random() * 0.3, t: 0, color: '#FFE9A0', size: 0.08 + Math.random() * 0.06, rot: Math.random() * 6 });
      }
    }

    // ---------- input ----------
    cellAt(e) {
      const rect = this.cv.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.ox) / this.cs, y = (e.clientY - rect.top - this.oy) / this.cs;
      const c = Math.floor(x), r = Math.floor(y);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return [r, c];
    }
    bindInput() {
      const cv = this.cv;
      cv.addEventListener('pointerdown', e => {
        if (!this.game) return;
        AU.init();
        this.lastInput = performance.now(); this.hint = null;
        const cell = this.cellAt(e);
        if (!cell) return;
        if (this.mode === 'hammer') { this.hooks.onBoosterTarget && this.hooks.onBoosterTarget('hammer', cell); return; }
        if (this.game.busy || this.game.over) return;
        const C = this.game.cell(cell[0], cell[1]);
        if (!this.game.movable(C)) { this.sel = null; return; }
        if (this.sel && Math.abs(this.sel[0] - cell[0]) + Math.abs(this.sel[1] - cell[1]) === 1) {
          const a = this.sel; this.sel = null; this.doSwap(a, cell); return;
        }
        AU.play('tik');
        this.sel = cell;
        this.drag = { cell, x: e.clientX, y: e.clientY };
        cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', e => {
        if (!this.drag || !this.game) return;
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cs * 0.35) return;
        const a = this.drag.cell;
        const b = Math.abs(dx) > Math.abs(dy) ? [a[0], a[1] + Math.sign(dx)] : [a[0] + Math.sign(dy), a[1]];
        this.drag = null; this.sel = null;
        this.doSwap(a, b);
      });
      const end = () => { this.drag = null; };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    }
    doSwap(a, b) {
      if (this.mode === 'chimta') { this.hooks.onBoosterTarget && this.hooks.onBoosterTarget('chimta', a, b); return; }
      this.hooks.onSwap && this.hooks.onSwap(a, b);
    }

    // ---------- frame ----------
    frame(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.time += dt;
      if (this.game) { this.update(dt, now); this.draw(); }
      requestAnimationFrame(t => this.frame(t));
    }

    update(dt, now) {
      const g = this.game;
      let moving = false;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const p = g.cells[r][c].p;
        if (!p) continue;
        if (p.x == null) { p.x = c; p.y = r; }
        if (p.scale == null) p.scale = 1;
        if (p.scale < 1) p.scale = Math.min(1, p.scale + dt * 4);
        const dx = c - p.x, dy = r - p.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) { p.x = c; p.y = r; p.vy = 0; continue; }
        moving = true;
        if (dy > 0.001) { // falling with gravity
          p.vy = Math.min((p.vy || 2) + 45 * dt, 16);
          p.y = Math.min(r, p.y + p.vy * dt);
          if (p.y >= r) { p.y = r; p.land = 1; p.vy = 0; }
        } else if (dy < -0.001) { p.y = Math.max(r, p.y - 7 * dt); }
        if (Math.abs(dx) > 0.001) { const s = 7 * dt; p.x = Math.abs(dx) <= s ? c : p.x + Math.sign(dx) * s; }
        if (p.land) p.land = Math.max(0, p.land - dt * 5);
      }
      // waiters
      for (let i = this.waiters.length - 1; i >= 0; i--) {
        const w = this.waiters[i];
        if ((w.settle && !moving) || now >= w.until) { this.waiters.splice(i, 1); w.res(); }
      }
      // particles
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i]; p.t += dt;
        if (p.t >= p.life) { this.parts.splice(i, 1); continue; }
        p.vy += 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8;
      }
      for (let i = this.floats.length - 1; i >= 0; i--) { this.floats[i].t += dt; if (this.floats[i].t > 0.9) this.floats.splice(i, 1); }
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
      for (let i = this.pops.length - 1; i >= 0; i--) { this.pops[i].t += dt; if (this.pops[i].t > 0.22) this.pops.splice(i, 1); }
      for (let i = this.fx.length - 1; i >= 0; i--) { this.fx[i].t += dt; if (this.fx[i].t > this.fx[i].d) this.fx.splice(i, 1); }
      if (this.shakeT > 0) this.shakeT -= dt;
      // hint after 5s idle
      if (!g.busy && !g.over && !this.hint && now - this.lastInput > 5000) {
        const m = g.findMoves(false).sort((a, b) => b.value - a.value)[0];
        if (m) this.hint = m;
      }
      // idle blink
      if (!this.blinkAt || now > this.blinkAt) {
        this.blinkAt = now + 4000 + Math.random() * 2000;
        const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
        const p = g.cells[r][c].p; if (p) p.blink = 1;
      }
    }

    draw() {
      const ctx = this.ctx, cs = this.cs, dpr = this.dpr, g = this.game;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      let sx = 0, sy = 0;
      if (this.shakeT > 0) { const k = this.shakeT / 0.3; sx = (Math.random() - 0.5) * this.shakePow * k; sy = (Math.random() - 0.5) * this.shakePow * k; }
      ctx.translate(this.ox + sx, this.oy + sy);
      const spr = this.spriteSize;

      // wooden frame + 3D tiles (cached)
      if (!this.frameCache) this.buildFrame();
      const fc = this.frameCache;
      ctx.drawImage(fc.c, -fc.pad, -fc.pad, fc.c.width / dpr, fc.c.height / dpr);
      // glossy chashni jelly
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const cell = g.cells[r][c];
        if (cell.void || !cell.jelly) continue;
        const x = c * cs + 3, y = r * cs + 3, w = cs - 6;
        const jg = ctx.createLinearGradient(0, y, 0, y + w);
        if (cell.jelly > 1) { jg.addColorStop(0, 'rgba(240,80,140,.92)'); jg.addColorStop(1, 'rgba(160,20,80,.92)'); }
        else { jg.addColorStop(0, 'rgba(255,150,185,.82)'); jg.addColorStop(1, 'rgba(230,60,120,.82)'); }
        ctx.fillStyle = jg; ART.roundRect(ctx, x, y, w, w, cs * 0.2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x + w * 0.3, y + w * 0.2, w * 0.16, w * 0.06, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x + w * 0.78, y + w * 0.75, w * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      // selected highlight: pulsing golden glow
      if (this.sel) {
        const k = 0.5 + Math.sin(this.time * 8) * 0.2;
        const sx0 = (this.sel[1] + 0.5) * cs, sy0 = (this.sel[0] + 0.5) * cs;
        const sg = ctx.createRadialGradient(sx0, sy0, cs * 0.2, sx0, sy0, cs * 0.62);
        sg.addColorStop(0, 'rgba(255,240,170,' + k + ')'); sg.addColorStop(1, 'rgba(255,200,61,0)');
        ctx.fillStyle = sg; ctx.fillRect(sx0 - cs, sy0 - cs, cs * 2, cs * 2);
      }

      // blockers
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const b = g.cells[r][c].block;
        if (b) ctx.drawImage(ART.block(b.type, b.hp, b.hot, spr), c * cs, r * cs, cs, cs);
      }

      // pieces
      const hintIds = new Set();
      if (this.hint) { const a = g.cell(this.hint.a[0], this.hint.a[1]), b = g.cell(this.hint.b[0], this.hint.b[1]); if (a && a.p) hintIds.add(a.p.id); if (b && b.p) hintIds.add(b.p.id); }
      ctx.save();
      ctx.beginPath(); ctx.rect(-cs, 0, cs * (COLS + 2), cs * ROWS); ctx.clip(); // hide spawning pieces above board
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const p = g.cells[r][c].p;
        if (!p) continue;
        let img;
        if (p.ing) img = ART.ingredient(p.ing, spr);
        else if (p.sp) img = ART.special(p.c, p.sp, spr);
        else img = ART.piece(p.c, spr);
        const base = ART.is3D ? 1.12 : 0.9; let w = cs * base, h = cs * base, x = (p.x + 0.5) * cs, y = (p.y + 0.5) * cs;
        const sc = p.scale != null ? p.scale : 1;
        w *= sc; h *= sc;
        if (p.land) { w *= 1 + p.land * 0.12; h *= 1 - p.land * 0.12; y += p.land * cs * 0.05; }
        if (p.vy > 3) { h *= 1.08; w *= 0.94; }
        if (hintIds.has(p.id)) { const k = Math.sin(this.time * 10) * 0.06; w *= 1 + k; h *= 1 - k; }
        if (p.blink) { h *= 1 - Math.sin(p.blink * Math.PI) * 0.15; p.blink = Math.max(0, p.blink - 0.08); }
        if (p.sp === 'd' || p.sp === 'k2') {
          ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(this.time * 6) * 0.15; ctx.fillStyle = p.sp === 'd' ? '#FFF59D' : '#FF7043';
          ctx.beginPath(); ctx.arc(x, y, cs * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (p.sp === 'd') { ctx.save(); ctx.translate(x, y); ctx.rotate(this.time * 0.8); ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore(); }
        else ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
        if (p.lock) ctx.drawImage(ART.lock(p.lock, spr), p.x * cs, p.y * cs, cs, cs);
      }
      ctx.restore();

      // pops
      for (const p of this.pops) {
        const k = p.t / 0.22, s = k < 0.35 ? 1 + k * 0.85 : 1.3 * (1 - (k - 0.35) / 0.65);
        ctx.globalAlpha = 1 - k * 0.5;
        const ps = ART.is3D ? 1.12 : 0.9; ctx.drawImage(p.spr, (p.x + 0.5 - ps / 2 * s) * cs, (p.y + 0.5 - ps / 2 * s) * cs, cs * ps * s, cs * ps * s);
        ctx.globalAlpha = 1;
      }

      // effects
      for (const f of this.fx) this.drawFx(ctx, f, cs);

      // particles (crumbs) and additive glow sparks
      for (const p of this.parts) {
        const a = 1 - p.t / p.life;
        ctx.globalAlpha = a;
        if (p.spark) {
          ctx.globalCompositeOperation = 'lighter';
          const s = p.size * cs * (1 + (1 - a));
          ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x * cs, p.y * cs); ctx.rotate(p.rot);
          ART.star(ctx, 0, 0, s, s * 0.38); ctx.fill(); ctx.restore();
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x * cs, p.y * cs); ctx.rotate(p.rot);
          const s = p.size * cs; ctx.beginPath(); ctx.ellipse(0, 0, s / 2, s * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      // floating score numbers
      for (const f of this.floats) {
        const k = f.t / 0.9;
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        ctx.font = '800 ' + Math.round(cs * (0.42 + (f.big ? 0.18 : 0)) * (k < 0.15 ? k / 0.15 : 1)) + 'px Baloo, sans-serif';
        ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = cs * 0.09; ctx.strokeStyle = '#5a1e00';
        const fy = (f.y + 0.5) * cs - k * cs * 0.9;
        ctx.strokeText(f.text, (f.x + 0.5) * cs, fy); ctx.fillStyle = f.color; ctx.fillText(f.text, (f.x + 0.5) * cs, fy);
      }
      ctx.globalAlpha = 1;
      // full-board light flash for big blasts
      if (this.flash > 0) { ctx.fillStyle = 'rgba(255,248,220,' + this.flash * 0.55 + ')'; ctx.fillRect(-cs, -cs, cs * (COLS + 2), cs * (ROWS + 2)); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    drawFx(ctx, f, cs) {
      const k = f.t / f.d;
      if (f.k === 'beam') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        const grd = f.dir === 'h' ? ctx.createLinearGradient(0, (f.y + 0.2) * cs, 0, (f.y + 0.8) * cs) : ctx.createLinearGradient((f.x + 0.2) * cs, 0, (f.x + 0.8) * cs, 0);
        grd.addColorStop(0, 'rgba(255,200,61,0)'); grd.addColorStop(0.5, 'rgba(255,248,200,0.95)'); grd.addColorStop(1, 'rgba(255,200,61,0)');
        ctx.fillStyle = grd; ctx.globalCompositeOperation = 'lighter';
        if (f.dir === 'h') ctx.fillRect(0, (f.y + 0.1) * cs, COLS * cs, cs * 0.8); else ctx.fillRect((f.x + 0.1) * cs, 0, cs * 0.8, ROWS * cs);
        // rolling pins travelling out
        const d = k * Math.max(COLS, ROWS);
        ctx.fillStyle = '#C68B4E'; ctx.strokeStyle = '#3b1f0e'; ctx.lineWidth = 2;
        const pins = f.dir === 'h' ? [[f.x - d, f.y], [f.x + d, f.y]] : [[f.x, f.y - d], [f.x, f.y + d]];
        for (const [px, py] of pins) {
          ctx.save(); ctx.translate((px + 0.5) * cs, (py + 0.5) * cs); if (f.dir === 'v') ctx.rotate(Math.PI / 2);
          ctx.rotate(Math.sin(k * 20) * 0.2);
          ART.roundRect(ctx, -cs * 0.35, -cs * 0.09, cs * 0.7, cs * 0.18, cs * 0.08); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
      } else if (f.k === 'wave') {
        const R = cs * (0.3 + k * (f.big ? 2.4 : 1.2));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(' + f.col + ',' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = cs * 0.14 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc((f.x + 0.5) * cs, (f.y + 0.5) * cs, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      } else if (f.k === 'ring') {
        const R = (f.big ? 2.6 : 1.6) * cs * (0.3 + k);
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#FF7043'; ctx.lineWidth = cs * 0.25 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc((f.x + 0.5) * cs, (f.y + 0.5) * cs, R, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,235,59,' + (0.5 * (1 - k)) + ')'; ctx.fill(); ctx.restore();
      } else if (f.k === 'bolt') {
        ctx.save(); ctx.globalAlpha = 1 - k * 0.8;
        ctx.strokeStyle = Math.random() < 0.5 ? '#FFF59D' : '#FF80AB'; ctx.lineWidth = 3;
        const sx = (f.x + 0.5) * cs, sy = (f.y + 0.5) * cs;
        for (const [r, c] of f.targets) {
          ctx.beginPath(); ctx.moveTo(sx, sy);
          const tx = (c + 0.5) * cs, ty = (r + 0.5) * cs;
          for (let i = 1; i <= 4; i++) ctx.lineTo(sx + (tx - sx) * i / 4 + (i < 4 ? (Math.random() - 0.5) * cs * 0.4 : 0), sy + (ty - sy) * i / 4 + (i < 4 ? (Math.random() - 0.5) * cs * 0.4 : 0));
          ctx.stroke();
        }
        if (f.all) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; ctx.fillRect(0, 0, COLS * cs, ROWS * cs); }
        ctx.restore();
      } else if (f.k === 'glow') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        const grd = ctx.createRadialGradient((f.x + 0.5) * cs, (f.y + 0.5) * cs, 0, (f.x + 0.5) * cs, (f.y + 0.5) * cs, cs * (0.6 + k * 0.6));
        grd.addColorStop(0, 'rgba(255,255,220,0.95)'); grd.addColorStop(1, 'rgba(255,200,61,0)');
        ctx.fillStyle = grd; ctx.fillRect((f.x - 1) * cs, (f.y - 1) * cs, cs * 3, cs * 3); ctx.restore();
      } else if (f.k === 'hammer') {
        ctx.save(); ctx.translate((f.x + 0.8) * cs, (f.y + 0.2) * cs); ctx.rotate(-1 + k * 1.2);
        ctx.fillStyle = '#C68B4E'; ctx.strokeStyle = '#3b1f0e'; ctx.lineWidth = 2;
        ART.roundRect(ctx, -cs * 0.1, -cs * 0.1, cs * 0.2, cs * 0.9, cs * 0.08); ctx.fill(); ctx.stroke();
        ART.roundRect(ctx, -cs * 0.35, -cs * 0.25, cs * 0.7, cs * 0.25, cs * 0.1); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (f.k === 'wobble') {
        // handled by bad swap sound; small red flash
        for (const [r, c] of [f.a, f.b]) { ctx.fillStyle = 'rgba(255,0,0,' + 0.25 * (1 - k) + ')'; ART.roundRect(ctx, c * cs, r * cs, cs, cs, cs * 0.16); ctx.fill(); }
      }
    }
  }

  G.MM_BoardView = BoardView;
})(window);
