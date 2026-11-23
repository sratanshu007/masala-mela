/* Masala Mela — animated, layered scenes for all 10 worlds.
 * Each world paints its static landscape once (landmarks, buildings, fields)
 * and animates a few light elements (bunting, kites, boats, snow, fireworks)
 * at max 30 fps. The same painter is used for the map bands.
 * (c) Deific Digital */
(function (G) {
  'use strict';
  const SC = { raf: 0, cv: null, ctx: null, W: null, stat: null, t: 0, last: 0, parts: [] };
  function rnd(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
  const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16) + (((pb >> 16) - (pa >> 16)) * k), g = ((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * k), bl = (pa & 255) + (((pb & 255) - (pa & 255)) * k); return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')'; };
  const lg = (ctx, y0, y1, stops) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; };

  // ---------- shared painters ----------
  function skyGlow(ctx, w, h, x, y, r, col) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  function buildings(ctx, w, base, colA, colB, seed, minH, maxH, windows, arches) {
    const r = rnd(seed); let x = -10;
    while (x < w + 10) {
      const bw = 34 + r() * 50, bh = minH + r() * (maxH - minH), top = base - bh;
      ctx.fillStyle = mix(colA, colB, r()); ctx.fillRect(x, top, bw, bh + 4);
      ctx.fillStyle = mix(colA, '#3b1f0e', 0.18); ctx.fillRect(x - 2, top - 4, bw + 4, 5);
      if (r() < 0.3) { ctx.fillStyle = '#5b6b78'; ctx.fillRect(x + bw * 0.6, top - 16, 12, 12); }
      if (windows) for (let wy = top + 10; wy < base - 14; wy += 20) for (let wx = x + 7; wx < x + bw - 12; wx += 15) {
        ctx.fillStyle = r() < 0.18 ? '#FFE9A8' : 'rgba(60,30,15,0.28)';
        ctx.beginPath(); ctx.moveTo(wx, wy + 12); ctx.lineTo(wx, wy + 4);
        if (arches) ctx.quadraticCurveTo(wx + 4, wy - 2, wx + 8, wy + 4); else ctx.lineTo(wx + 8, wy + 4);
        ctx.lineTo(wx + 8, wy + 12); ctx.fill();
      }
      x += bw + 2 + r() * 6;
    }
  }
  function hills(ctx, w, h, base, amp, freq, col, seed) {
    const r = rnd(seed); const ph = r() * 6;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 8) ctx.lineTo(x, base - (Math.sin(x * freq + ph) * 0.6 + Math.sin(x * freq * 2.3 + ph * 2) * 0.4 + 1) * amp);
    ctx.lineTo(w, h); ctx.fill();
  }
  function palm(ctx, x, y, s, lean) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lean * 20, -60, lean * 30, -120); ctx.stroke();
    ctx.translate(lean * 30, -120);
    ctx.fillStyle = '#2E8B57';
    for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(32, 6, 34, 8, 0.35, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#6d4c2a'; ctx.beginPath(); ctx.arc(-4, 4, 5, 0, 7); ctx.arc(5, 5, 5, 0, 7); ctx.fill();
    ctx.restore();
  }
  function tree(ctx, x, y, s, col, trunk) {
    ctx.fillStyle = trunk || '#6d4c41'; ctx.fillRect(x - 3 * s, y - 30 * s, 6 * s, 30 * s);
    ctx.fillStyle = col;
    [[0, -48, 24], [-16, -38, 17], [16, -38, 17], [0, -64, 16]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); });
  }
  function dome(ctx, x, base, wdt, hgt, col, finial) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - wdt / 2, base);
    ctx.bezierCurveTo(x - wdt / 2, base - hgt * 0.9, x - wdt * 0.1, base - hgt * 0.9, x, base - hgt);
    ctx.bezierCurveTo(x + wdt * 0.1, base - hgt * 0.9, x + wdt / 2, base - hgt * 0.9, x + wdt / 2, base); ctx.fill();
    if (finial) { ctx.fillStyle = finial; ctx.fillRect(x - 1.5, base - hgt - 10, 3, 10); ctx.beginPath(); ctx.arc(x, base - hgt - 11, 3, 0, 7); ctx.fill(); }
  }
  function ground(ctx, w, h, y, stops) { ctx.fillStyle = lg(ctx, y, h, stops); ctx.fillRect(0, y, w, h - y); }
  function water(ctx, w, h, y, top, bottom) {
    ctx.fillStyle = lg(ctx, y, h, [top, bottom]); ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; const r = rnd(4);
    for (let i = 0; i < 40; i++) ctx.fillRect(r() * w, y + 6 + r() * (h - y), 14 + r() * 26, 2);
  }
  function chaiThela(ctx, x, y, s, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
    ctx.fillStyle = '#8D5524'; ctx.fillRect(-60, -40, 120, 34); ctx.fillStyle = '#A86B32'; ctx.fillRect(-60, -46, 120, 8);
    ctx.fillStyle = '#1FB5A8'; ctx.fillRect(-56, -36, 112, 6);
    for (const wx of [-38, 38]) { ctx.fillStyle = '#3b1f0e'; ctx.beginPath(); ctx.arc(wx, -2, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#c9a26b'; ctx.beginPath(); ctx.arc(wx, -2, 5, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#E63946'; ctx.beginPath(); ctx.moveTo(-70, -100); ctx.lineTo(70, -100); ctx.lineTo(60, -82); ctx.lineTo(-60, -82); ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = -60; i < 60; i += 20) { ctx.beginPath(); ctx.moveTo(i, -82); ctx.lineTo(i + 10, -82); ctx.lineTo(i + 5, -74); ctx.fill(); }
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(-58, -82, 4, 40); ctx.fillRect(54, -82, 4, 40);
    ctx.fillStyle = '#B0BEC5'; ctx.beginPath(); ctx.ellipse(-20, -56, 16, 12, 0, 0, 7); ctx.fill(); ctx.fillRect(-26, -72, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 4; i++) { ctx.fillRect(18 + i * 9, -60, 7, 14); }
    ctx.fillStyle = '#C68B4E'; for (let i = 0; i < 4; i++) ctx.fillRect(19 + i * 9, -55, 5, 8);
    ctx.restore();
  }
  function sweetShop(ctx, x, base, wdt, hgt, col, seed) {
    const r = rnd(seed);
    ctx.fillStyle = col; ctx.fillRect(x, base - hgt, wdt, hgt);
    ctx.fillStyle = mix('#ffffff', col, 0.3); ctx.fillRect(x, base - hgt, wdt, 10);
    // awning stripes
    for (let i = 0; i < wdt; i += 12) { ctx.fillStyle = (i / 12) % 2 ? '#ffffff' : '#FF5C8A'; ctx.fillRect(x + i, base - hgt * 0.62, 12, 12); }
    // glass counter with laddoo pyramids
    ctx.fillStyle = 'rgba(220,240,255,.7)'; ctx.fillRect(x + 4, base - hgt * 0.42, wdt - 8, hgt * 0.38);
    for (let k = 0; k < 3; k++) { const cx = x + 10 + k * (wdt - 20) / 3 + 6, cy = base - hgt * 0.1; const col2 = ['#FFB300', '#FF7043', '#FFF3E0'][k];
      for (let row = 0; row < 3; row++) for (let j = 0; j <= 2 - row; j++) { ctx.fillStyle = col2; ctx.beginPath(); ctx.arc(cx + j * 7 + row * 3.5, cy - row * 6, 3.6, 0, 7); ctx.fill(); } }
    ctx.fillStyle = '#7A1F0E'; ctx.font = '700 9px Baloo, sans-serif'; ctx.fillText(['MISHTHAN', 'HALWAI', 'SWEETS'][Math.floor(r() * 3)], x + 6, base - hgt + 9);
  }
  function truck(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#F4A300'; ctx.fillRect(0, -50, 90, 40); ctx.fillStyle = '#D7263D'; ctx.fillRect(0, -50, 90, 8);
    ctx.fillStyle = '#1FB5A8'; for (let i = 6; i < 90; i += 14) { ctx.beginPath(); ctx.arc(i, -26, 4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#2E9E5B'; ctx.fillRect(90, -40, 34, 30); ctx.fillStyle = '#bfe7ff'; ctx.fillRect(100, -36, 18, 12);
    ctx.fillStyle = '#222'; for (const wx of [20, 70, 108]) { ctx.beginPath(); ctx.arc(wx, -8, 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.font = '700 10px Baloo, sans-serif'; ctx.fillText('HORN OK', 18, -14);
    ctx.restore();
  }
  function fort(ctx, cx, base, wdt, hgt, col, dark) {
    ctx.fillStyle = col; ctx.fillRect(cx - wdt / 2, base - hgt, wdt, hgt);
    for (let x = cx - wdt / 2; x < cx + wdt / 2; x += 10) ctx.fillRect(x, base - hgt - 7, 6, 7);
    for (const tx of [cx - wdt / 2, cx + wdt / 2 - 22]) { ctx.fillStyle = col; ctx.fillRect(tx, base - hgt * 1.35, 22, hgt * 1.35); dome(ctx, tx + 11, base - hgt * 1.35, 26, 16, dark, '#FFC83D'); }
    // chhatri
    ctx.fillStyle = dark; ctx.fillRect(cx - 18, base - hgt - 22, 36, 4); dome(ctx, cx, base - hgt - 22, 40, 22, dark, '#FFC83D');
    ctx.fillStyle = mix(col, '#3b1f0e', 0.35);
    for (let x = cx - wdt / 2 + 30; x < cx + wdt / 2 - 30; x += 18) { ctx.beginPath(); ctx.moveTo(x, base - 6); ctx.lineTo(x, base - 22); ctx.quadraticCurveTo(x + 5, base - 30, x + 10, base - 22); ctx.lineTo(x + 10, base - 6); ctx.fill(); }
  }
  function charminar(ctx, cx, base, s) {
    ctx.save(); ctx.translate(cx, base); ctx.scale(s, s);
    const stone = '#E8D3AE', dark = '#C9AF85';
    ctx.fillStyle = stone; ctx.fillRect(-60, -70, 120, 70);
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26, -40); ctx.quadraticCurveTo(0, -72, 26, -40); ctx.lineTo(26, 0); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(-62, -78, 124, 8); ctx.fillRect(-56, -96, 112, 18);
    for (let x = -50; x < 50; x += 12) { ctx.fillStyle = '#8D6E63'; ctx.fillRect(x, -92, 6, 10); }
    for (const mx of [-64, 56]) {
      ctx.fillStyle = stone; ctx.fillRect(mx, -170, 8, 170);
      for (let y = -150; y > -170; y -= 30) {} ctx.fillStyle = dark; ctx.fillRect(mx - 3, -120, 14, 4); ctx.fillRect(mx - 3, -150, 14, 4);
      dome(ctx, mx + 4, -170, 16, 18, stone, '#C9A227');
    }
    ctx.restore();
  }
  function pandal(ctx, cx, base, s, col) {
    ctx.save(); ctx.translate(cx, base); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(-90, -70); ctx.lineTo(0, -140); ctx.lineTo(90, -70); ctx.lineTo(90, 0); ctx.fill();
    ctx.fillStyle = '#FFF3E0'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-40, -60); ctx.quadraticCurveTo(0, -100, 40, -60); ctx.lineTo(40, 0); ctx.fill();
    ctx.fillStyle = '#FFC83D'; for (let x = -84; x <= 84; x += 12) { ctx.beginPath(); ctx.arc(x, -70 + Math.abs(x) * 0, 3, 0, 7); ctx.fill(); }
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(-80 + k * 10, -70 - k * 7.7, 3, 0, 7); ctx.arc(80 - k * 10, -70 - k * 7.7, 3, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function palace(ctx, cx, base, s) {
    ctx.save(); ctx.translate(cx, base); ctx.scale(s, s);
    const gold = '#E8B53A', light = '#FFD86B';
    ctx.fillStyle = '#F4D27A'; ctx.fillRect(-120, -80, 240, 80);
    ctx.fillStyle = '#7A4A00'; for (let x = -110; x < 110; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -30); ctx.quadraticCurveTo(x + 8, -44, x + 16, -30); ctx.lineTo(x + 16, 0); ctx.fill(); }
    ctx.fillStyle = '#FFE9A8'; for (let x = -110; x < 110; x += 22) { ctx.beginPath(); ctx.moveTo(x + 4, -48); ctx.lineTo(x + 4, -60); ctx.quadraticCurveTo(x + 8, -66, x + 12, -60); ctx.lineTo(x + 12, -48); ctx.fill(); }
    dome(ctx, 0, -80, 110, 90, gold, light);
    for (const dx of [-90, 90]) { ctx.fillStyle = '#F4D27A'; ctx.fillRect(dx - 12, -150, 24, 150); dome(ctx, dx, -150, 34, 34, gold, light); }
    for (const dx of [-50, 50]) dome(ctx, dx, -80, 40, 34, gold, light);
    ctx.restore();
  }
  function shikara(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#5D4037'; ctx.beginPath(); ctx.moveTo(-60, -6); ctx.quadraticCurveTo(0, 14, 60, -6); ctx.lineTo(70, -16); ctx.lineTo(56, -8); ctx.lineTo(-56, -8); ctx.lineTo(-70, -16); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(-26, -32, 52, 22); ctx.fillStyle = '#FFC83D'; ctx.fillRect(-30, -36, 60, 6);
    ctx.fillStyle = '#FFF3E0'; for (let i = -22; i < 22; i += 11) ctx.fillRect(i, -28, 7, 12);
    ctx.restore();
  }
  function houseboat(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.moveTo(-80, -8); ctx.quadraticCurveTo(0, 16, 80, -8); ctx.lineTo(90, -20); ctx.lineTo(-90, -20); ctx.fill();
    ctx.fillStyle = '#C8A26B'; ctx.beginPath(); ctx.moveTo(-60, -20); ctx.quadraticCurveTo(-60, -56, 0, -58); ctx.quadraticCurveTo(60, -56, 60, -20); ctx.fill();
    ctx.strokeStyle = '#8D6E3A'; ctx.lineWidth = 2; for (let i = -50; i <= 50; i += 10) { ctx.beginPath(); ctx.moveTo(i, -20); ctx.lineTo(i * 0.9, -52); ctx.stroke(); }
    ctx.restore();
  }
  function kite(ctx, x, y, s, col, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.7) * 0.25); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 0); ctx.lineTo(0, 20); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 20); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-4, 27); ctx.lineTo(4, 27); ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,10,.35)'; ctx.beginPath(); ctx.moveTo(0, 20); ctx.quadraticCurveTo(8 + Math.sin(t * 2) * 6, 60, -4, 120); ctx.stroke();
    ctx.restore();
  }
  function bunting(ctx, w, y0, sag, t, phase, cols, marigold) {
    const sway = Math.sin(t * 1.3 + phase) * 4;
    ctx.strokeStyle = 'rgba(70,40,20,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, y0); ctx.quadraticCurveTo(w / 2, y0 + sag + sway, w + 10, y0); ctx.stroke();
    const n = Math.floor(w / (marigold ? 9 : 22));
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = -10 + k * (w + 20), y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * (y0 + sag + sway) + k * k * y0;
      if (marigold) { ctx.fillStyle = i % 2 ? '#FF9800' : '#FFC107'; ctx.beginPath(); ctx.arc(x, y + 3, 4.5, 0, 7); ctx.fill(); continue; }
      const flap = Math.sin(t * 3 + i * 0.7 + phase) * 2;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + flap, y + 15); ctx.closePath(); ctx.fill();
    }
  }
  function diyaRow(ctx, w, y, t, step) {
    for (let x = 12; x < w; x += step) {
      ctx.fillStyle = '#B5532A'; ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI); ctx.fill();
      const f = 1 + Math.sin(t * 9 + x) * 0.15;
      const g = ctx.createRadialGradient(x, y - 6, 0, x, y - 6, 16 * f); g.addColorStop(0, 'rgba(255,220,120,.9)'); g.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 6, 16 * f, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFE082'; ctx.beginPath(); ctx.ellipse(x, y - 6, 2.5, 5 * f, 0, 0, 7); ctx.fill();
    }
  }

  // ---------- world landscapes (static) ----------
  // horizon ~ 0.34h: the strip between the HUD and the board, so landmarks show in play
  const PAINT = {
    1(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#FFC98F', '#FFE6C4', '#F3C089']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.78, h * 0.1, w * 0.6, 'rgba(255,255,230,.85)');
      buildings(ctx, w, h * 0.42, '#E9B98C', '#F2CBA0', 11, h * 0.08, h * 0.2, false);
      buildings(ctx, w, h * 0.5, '#E59866', '#D98057', 23, h * 0.1, h * 0.24, true, true);
      ground(ctx, w, h, h * 0.5, ['#C98A5A', '#8E5634']);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let y = h * 0.56; y < h; y += 26) ctx.fillRect(0, y, w, 2);
      chaiThela(ctx, 34, h - 10, 0.75, false); chaiThela(ctx, w - 30, h - 6, 0.6, true);
    },
    2(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#FF8FB0', '#FFD1DE', '#FFC1A1']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.2, h * 0.16, w * 0.55, 'rgba(255,240,200,.8)');
      buildings(ctx, w, h * 0.4, '#F4A6BE', '#F7C3D2', 5, h * 0.06, h * 0.16, false);
      const r = rnd(9); let x = -6; while (x < w) { const sw = 70 + r() * 30; sweetShop(ctx, x, h * 0.48, sw, h * 0.16, ['#C2185B', '#FF8A3D', '#7C5CBF', '#1FB5A8'][Math.floor(r() * 4)], Math.abs(x | 0) + 7); x += sw + 4; }
      ground(ctx, w, h, h * 0.48, ['#E8A3B5', '#A8506E']);
    },
    3(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#5FB4FF', '#BDE3FF', '#FFF6D8']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.8, h * 0.08, w * 0.4, 'rgba(255,255,220,.9)');
      const r = rnd(3); let x = -8;
      while (x < w) { const bw = 40 + r() * 34, bh = h * (0.08 + r() * 0.1), base = h * 0.46;
        ctx.fillStyle = '#FFFDF5'; ctx.fillRect(x, base - bh, bw, bh); ctx.fillStyle = ['#F4D03F', '#4DA3FF', '#E63946', '#2E9E5B'][Math.floor(r() * 4)]; ctx.fillRect(x + bw * 0.35, base - 22, bw * 0.3, 22);
        ctx.fillStyle = '#E8D9B5'; ctx.beginPath(); ctx.moveTo(x - 4, base - bh); ctx.lineTo(x + bw / 2, base - bh - 16); ctx.lineTo(x + bw + 4, base - bh); ctx.fill(); x += bw + 3; }
      ground(ctx, w, h, h * 0.46, ['#F2D27A', '#C9922E']);
    },
    4(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#8FD3FF', '#E8F6FF', '#FFF3C4']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.75, h * 0.1, w * 0.5, 'rgba(255,250,200,.95)');
      hills(ctx, w, h, h * 0.38, h * 0.02, 0.015, '#A7C957', 2);
      for (let row = 0; row < 7; row++) { const y = h * (0.4 + row * 0.085); ctx.fillStyle = row % 2 ? '#F9D71C' : '#EEC20E'; ctx.fillRect(0, y, w, h * 0.09); ctx.fillStyle = '#6B8E23'; for (let x = (row * 7) % 14; x < w; x += 14) ctx.fillRect(x, y + h * 0.05, 2, h * 0.04); }
      // dhaba hut + charpai
      ctx.fillStyle = '#C68B4E'; ctx.fillRect(w * 0.06, h * 0.33, w * 0.26, h * 0.08); ctx.fillStyle = '#8D5524'; ctx.beginPath(); ctx.moveTo(w * 0.03, h * 0.335); ctx.lineTo(w * 0.19, h * 0.27); ctx.lineTo(w * 0.35, h * 0.335); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 11px Baloo, sans-serif'; ctx.fillText('DHABA', w * 0.13, h * 0.37);
      truck(ctx, w * 0.56, h * 0.42, 0.8);
    },
    5(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#9EE6D0', '#DFFAF0', '#BFEAD9']); ctx.fillRect(0, 0, w, h);
      hills(ctx, w, h, h * 0.36, h * 0.03, 0.02, '#4CAF7A', 5);
      water(ctx, w, h, h * 0.38, '#3FB8C4', '#1B6F6A');
      for (const [x, s, l] of [[w * 0.06, 0.8, 1], [w * 0.2, 0.6, -0.6], [w * 0.82, 0.75, -1], [w * 0.95, 0.55, 0.5]]) palm(ctx, x, h * 0.39, s, l);
    },
    6(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#FFB65C', '#FFE1A8', '#F2C27A']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.15, h * 0.08, w * 0.5, 'rgba(255,240,200,.85)');
      hills(ctx, w, h, h * 0.4, h * 0.03, 0.012, '#E8B06A', 7);
      fort(ctx, w * 0.55, h * 0.4, w * 0.62, h * 0.09, '#D9975A', '#B5652F');
      hills(ctx, w, h, h * 0.47, h * 0.04, 0.01, '#F0C27F', 11);
      ground(ctx, w, h, h * 0.5, ['#F2C27F', '#C98A4A']);
      // camel
      ctx.fillStyle = '#8D5A2B'; ctx.save(); ctx.translate(w * 0.14, h * 0.47); ctx.beginPath(); ctx.ellipse(0, 0, 18, 9, 0, 0, 7); ctx.ellipse(-2, -7, 8, 7, 0, 0, 7); ctx.fill(); ctx.fillRect(-16, 4, 3, 16); ctx.fillRect(12, 4, 3, 16); ctx.beginPath(); ctx.moveTo(14, -2); ctx.quadraticCurveTo(26, -18, 24, -24); ctx.lineTo(30, -24); ctx.lineTo(28, -18); ctx.quadraticCurveTo(22, -6, 18, 2); ctx.fill(); ctx.restore();
    },
    7(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#3B1F5A', '#B04A6A', '#FFB38A']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.5, h * 0.36, w * 0.6, 'rgba(255,200,120,.5)');
      buildings(ctx, w, h * 0.38, '#6A2E4E', '#7E3A55', 13, h * 0.05, h * 0.12, true, true);
      pandal(ctx, w * 0.5, h * 0.42, Math.min(1, w / 360), '#E63946');
      water(ctx, w, h, h * 0.44, '#5A3A6E', '#22123A');
    },
    8(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#FFC864', '#FFE7B3', '#F7D08A']); ctx.fillRect(0, 0, w, h);
      skyGlow(ctx, w, h, w * 0.5, h * 0.15, w * 0.55, 'rgba(255,250,220,.9)');
      buildings(ctx, w, h * 0.42, '#E6C79A', '#D9B784', 17, h * 0.05, h * 0.12, true, true);
      charminar(ctx, w * 0.5, h * 0.43, Math.min(1, w / 400));
      ground(ctx, w, h, h * 0.43, ['#D9B07A', '#9E6E3A']);
      const r = rnd(8); for (let i = 0; i < 6; i++) { const x = r() * w; ctx.fillStyle = ['#047857', '#C2185B', '#F59E0B'][i % 3]; ctx.beginPath(); ctx.moveTo(x - 24, h * 0.5); ctx.lineTo(x, h * 0.47); ctx.lineTo(x + 24, h * 0.5); ctx.fill(); }
    },
    9(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#9CC9F5', '#E3F1FF', '#F6FAFF']); ctx.fillRect(0, 0, w, h);
      // snowy peaks
      const r = rnd(19);
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = layer ? '#8FA9C9' : '#B5C8E0'; ctx.beginPath(); ctx.moveTo(0, h * 0.4);
        let x = 0; while (x < w + 40) { const pk = h * (0.16 + r() * 0.1 + layer * 0.05); ctx.lineTo(x + 35, pk); ctx.lineTo(x + 70, h * 0.36); x += 60; }
        ctx.lineTo(w, h * 0.4); ctx.fill();
      }
      ctx.fillStyle = '#ffffff'; x = 0; const r2 = rnd(19); r2(); let xx = 0;
      while (xx < w + 40) { const pk = h * (0.16 + r2() * 0.1); ctx.beginPath(); ctx.moveTo(xx + 35, pk); ctx.lineTo(xx + 22, pk + 18); ctx.lineTo(xx + 48, pk + 18); ctx.fill(); xx += 60; }
      for (const [tx, s] of [[w * 0.08, 0.9], [w * 0.9, 0.8]]) tree(ctx, tx, h * 0.41, s, '#D84315', '#5D4037');
      water(ctx, w, h, h * 0.41, '#7FB3D5', '#3E6E99');
    },
    10(ctx, w, h) {
      ctx.fillStyle = lg(ctx, 0, h, ['#140A33', '#2B1B5A', '#4B2C7A']); ctx.fillRect(0, 0, w, h);
      const r = rnd(10); ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.3 + r() * 0.7; ctx.fillRect(r() * w, r() * h * 0.35, 1.5, 1.5); } ctx.globalAlpha = 1;
      skyGlow(ctx, w, h, w * 0.5, h * 0.32, w * 0.7, 'rgba(255,200,61,.35)');
      palace(ctx, w * 0.5, h * 0.42, Math.min(1.05, w / 380));
      ground(ctx, w, h, h * 0.42, ['#5A3A8A', '#24124A']);
    }
  };
  let x; // used by world 9 painter

  function paintStatic(W, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
    (PAINT[W.id] || PAINT[1])(ctx, w, h);
    const v = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, h * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,15,0,0.32)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    return c;
  }

  // ---------- per-world animation ----------
  const FEST = ['#FF8A3D', '#1FB5A8', '#FFC83D', '#E63946', '#7CB342'];
  function animate(ctx, W, w, h, t, dt) {
    const id = W.id, P = SC.parts;
    const cols = id === 1 ? FEST : [W.main, W.acc, '#FFC83D', '#ffffff'];
    if (id === 1 || id === 3) {
      kite(ctx, (w * 0.18 + t * 6) % (w + 60) - 30, h * 0.12 + Math.sin(t * 0.6) * 10, 0.9, '#E63946', t);
      kite(ctx, (w * 0.7 + t * 4) % (w + 60) - 30, h * 0.2 + Math.sin(t * 0.8 + 1) * 8, 0.7, '#4DA3FF', t + 1);
      if (id === 3) { kite(ctx, (w * 0.45 + t * 5) % (w + 60) - 30, h * 0.08 + Math.sin(t * 0.7 + 2) * 9, 0.8, '#F4D03F', t + 2); kite(ctx, (w * 0.9 + t * 3) % (w + 60) - 30, h * 0.26, 0.6, '#2E9E5B', t + 3); }
    }
    if (id === 5) houseboat(ctx, ((t * 9) % (w + 220)) - 110, h * 0.45 + Math.sin(t * 1.4) * 2, Math.min(0.8, w / 480));
    if (id === 9) shikara(ctx, w - ((t * 7) % (w + 160)) + 80, h * 0.46 + Math.sin(t * 1.2) * 2, 0.7, '#C0392B');
    if (id === 7) diyaRow(ctx, w, h * 0.46, t, 34);
    if (id === 10) diyaRow(ctx, w, h * 0.45, t, 28);
    if (id === 4) truck(ctx, w + 140 - ((t * 14) % (w + 300)), h * 0.88, 0.6);
    // garlands / bunting
    if (id === 2 || id === 7) { bunting(ctx, w, h * 0.16, h * 0.05, t, 0, cols, true); bunting(ctx, w, h * 0.26, h * 0.04, t, 2, cols, true); }
    else if (id !== 10) { bunting(ctx, w, h * 0.17, h * 0.05, t, 0, cols); bunting(ctx, w, h * 0.27, h * 0.04, t, 2, cols.slice().reverse()); }
    // particles
    if (P.length < 60 && Math.random() < 0.5) {
      if (id === 1) { if (Math.random() < 0.25) P.push({ x: 18 + Math.random() * 8, y: h - 52, vx: (Math.random() - 0.3) * 5, vy: -14 - Math.random() * 6, r: 2 + Math.random() * 2, life: 1.6, t: 0, k: 'steam' }); }
      else if (id === 9) P.push({ x: Math.random() * w, y: -5, vx: (Math.random() - 0.5) * 10, vy: 18 + Math.random() * 14, r: 1.5 + Math.random() * 2, life: 30, t: 0, k: 'snow' });
      else if (id === 10) { if (Math.random() < 0.04) firework(w, h); }
      else if (id === 6) P.push({ x: -5, y: h * (0.4 + Math.random() * 0.5), vx: 30 + Math.random() * 30, vy: (Math.random() - 0.5) * 6, r: 1.2, life: 15, t: 0, k: 'sand' });
      else if (id === 7 || id === 8) P.push({ x: Math.random() * w, y: h * 0.46, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 10, r: 1.6, life: 4, t: 0, k: 'spark' });
      else P.push({ x: Math.random() * w, y: -5, vx: (Math.random() - 0.5) * 14, vy: 14 + Math.random() * 10, r: 3, life: 30, t: 0, k: 'petal', col: id === 4 ? '#F9D71C' : Math.random() < 0.5 ? '#FFB300' : '#FF7043', rot: Math.random() * 6 });
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt; p.x += (p.vx + (p.k === 'fw' ? 0 : Math.sin(t + i) * 4)) * dt; p.y += p.vy * dt;
      if (p.k === 'fw') p.vy += 25 * dt;
      if (p.t > p.life || p.y > h + 10 || p.y < -20 || p.x > w + 20) { P.splice(i, 1); continue; }
      const a = 1 - p.t / p.life;
      if (p.k === 'steam') { ctx.fillStyle = 'rgba(255,255,255,' + 0.28 * a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.t * 0.6), 0, 7); ctx.fill(); }
      else if (p.k === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.k === 'spark' || p.k === 'fw') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col ? p.col.replace('A', a.toFixed(2)) : 'rgba(255,200,61,' + a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      else if (p.k === 'sand') { ctx.fillStyle = 'rgba(255,230,180,' + 0.6 * a + ')'; ctx.fillRect(p.x, p.y, 2, 1); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 7); ctx.fill(); ctx.restore(); }
    }
  }
  function firework(w, h) {
    const cx = w * (0.15 + Math.random() * 0.7), cy = h * (0.06 + Math.random() * 0.18);
    const hue = ['rgba(255,200,61,A)', 'rgba(255,92,138,A)', 'rgba(120,220,255,A)', 'rgba(180,255,120,A)'][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, s = 40 + Math.random() * 30; SC.parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.8, life: 1.4, t: 0, k: 'fw', col: hue }); }
  }

  function frame(now) {
    if (!SC.cv) return;
    SC.raf = requestAnimationFrame(frame);
    if (now - SC.last < 33) return;
    const dt = Math.min(0.1, (now - (SC.last || now)) / 1000); SC.last = now; SC.t += dt;
    const ctx = SC.ctx;
    ctx.setTransform(SC.dpr, 0, 0, SC.dpr, 0, 0);
    ctx.drawImage(SC.stat, 0, 0, SC.w, SC.h);
    animate(ctx, SC.W, SC.w, SC.h, SC.t, dt);
  }

  SC.start = function (canvas, W) {
    SC.stop();
    SC.cv = canvas; SC.ctx = canvas.getContext('2d'); SC.W = W; SC.parts = []; SC.t = 0; SC.last = 0;
    const box = canvas.parentElement.getBoundingClientRect();
    SC.dpr = Math.min(window.devicePixelRatio || 1, 2); SC.w = box.width; SC.h = box.height;
    canvas.width = Math.round(SC.w * SC.dpr); canvas.height = Math.round(SC.h * SC.dpr);
    SC.stat = paintStatic(W, Math.round(SC.w), Math.round(SC.h));
    canvas.parentElement.classList.add('scene3d');
    SC.raf = requestAnimationFrame(frame);
  };
  SC.stop = function () { cancelAnimationFrame(SC.raf); SC.cv = null; };

  // static postcard for map bands (no animation): landscape on top, ground below
  SC.paintBand = function (W, w, h) {
    // map version: same landscape, ground washed lighter so level buttons read clearly
    const c = paintStatic(W, w, h), ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, h * 0.4, 0, h);
    g.addColorStop(0, 'rgba(255,248,235,0)'); g.addColorStop(0.25, 'rgba(255,248,235,.32)'); g.addColorStop(1, 'rgba(255,248,235,.42)');
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.4, w, h * 0.6);
    return c;
  };
  SC.paintStatic = paintStatic;

  G.MM_SCENES = SC;
})(window);
