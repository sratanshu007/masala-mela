/* Masala Mela — procedural "clay" art for pieces, specials and blockers.
 * Everything is drawn once into cached sprites per cell size. (c) Deific Digital */
(function (G) {
  'use strict';
  const OUT = '#3b1f0e';
  const cache = {};

  function sprite(key, size, draw) {
    const k = key + '@' + size;
    if (cache[k]) return cache[k];
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    draw(ctx, size);
    cache[k] = cv;
    return cv;
  }

  function rg(ctx, x, y, r, c0, c1) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, c0); g.addColorStop(1, c1); return g;
  }
  function shine(ctx, x, y, rx, ry, a) {
    ctx.save(); ctx.globalAlpha = a || 0.55; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function shadow(ctx, s) {
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(s * 0.5, s * 0.86, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // ---------- the six pieces ----------
  const PIECE_DRAW = [
    // 0 Jalebi: orange spiral
    function (ctx, s) {
      shadow(ctx, s);
      const cx = s / 2, cy = s / 2;
      const pts = [];
      for (let t = 0; t < Math.PI * 5.2; t += 0.12) { const r = s * 0.035 + t * s * 0.0215; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
      const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
      path(); ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.17; ctx.stroke();
      path(); const g = ctx.createLinearGradient(0, s * 0.15, 0, s * 0.85); g.addColorStop(0, '#FFD23F'); g.addColorStop(1, '#F57C00');
      ctx.strokeStyle = g; ctx.lineWidth = s * 0.115; ctx.stroke();
      path(); ctx.strokeStyle = 'rgba(255,255,220,0.55)'; ctx.lineWidth = s * 0.03; ctx.translate(-s * 0.012, -s * 0.018); ctx.stroke(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      shine(ctx, s * 0.36, s * 0.3, s * 0.05, s * 0.03, 0.8);
    },
    // 1 Imli gola: glossy brown ball with masala specks
    function (ctx, s) {
      shadow(ctx, s);
      const cx = s / 2, cy = s * 0.5, r = s * 0.34;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = rg(ctx, cx, cy, r, '#C98A4B', '#5A3214'); ctx.fill();
      ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
      const sp = [[-.15, -.12, '#7CB342'], [.12, -.18, '#D32F2F'], [.18, .05, '#7CB342'], [-.05, .12, '#D32F2F'], [-.2, .08, '#FFF3E0'], [.05, -.02, '#FFF3E0'], [.1, .2, '#7CB342']];
      sp.forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, s * 0.025, 0, Math.PI * 2); ctx.fill(); });
      shine(ctx, cx - r * 0.38, cy - r * 0.45, r * 0.3, r * 0.17, 0.6);
    },
    // 2 Samosa: golden triangle with crimped edge
    function (ctx, s) {
      shadow(ctx, s);
      const p = [[s * 0.5, s * 0.13], [s * 0.85, s * 0.8], [s * 0.15, s * 0.8]];
      const tri = () => { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.quadraticCurveTo(s * 0.72, s * 0.42, p[1][0], p[1][1]); ctx.quadraticCurveTo(s * 0.5, s * 0.86, p[2][0], p[2][1]); ctx.quadraticCurveTo(s * 0.28, s * 0.42, p[0][0], p[0][1]); ctx.closePath(); };
      tri(); const g = ctx.createLinearGradient(0, s * 0.1, s * 0.3, s * 0.85); g.addColorStop(0, '#FFE08A'); g.addColorStop(0.55, '#F2B33D'); g.addColorStop(1, '#B9751C');
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
      // crimp line
      ctx.strokeStyle = 'rgba(120,70,10,0.6)'; ctx.lineWidth = s * 0.02;
      for (let i = 1; i < 7; i++) { const x = s * 0.2 + i * s * 0.085; ctx.beginPath(); ctx.moveTo(x, s * 0.72); ctx.lineTo(x + s * 0.02, s * 0.79); ctx.stroke(); }
      // bubbles
      ctx.fillStyle = 'rgba(255,240,200,0.7)';
      [[.45, .45], [.56, .58], [.4, .62], [.6, .42]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.022, 0, Math.PI * 2); ctx.fill(); });
      shine(ctx, s * 0.42, s * 0.32, s * 0.05, s * 0.09, 0.6);
    },
    // 3 Mirchi bhajiya: red chilli with green stem
    function (ctx, s) {
      shadow(ctx, s);
      ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(-0.6);
      const body = () => { ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.02); ctx.bezierCurveTo(-s * 0.28, -s * 0.18, s * 0.2, -s * 0.16, s * 0.4, s * 0.12); ctx.bezierCurveTo(s * 0.18, s * 0.06, -s * 0.2, s * 0.16, -s * 0.3, -s * 0.02); ctx.closePath(); };
      body(); const g = ctx.createLinearGradient(0, -s * 0.16, 0, s * 0.14); g.addColorStop(0, '#FF6B5B'); g.addColorStop(0.6, '#D62828'); g.addColorStop(1, '#8E1414');
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
      // besan batter crumbs
      ctx.fillStyle = 'rgba(255,214,120,0.75)';
      [[-.15, -.05], [0, -.07], [.12, -.02], [-.05, .03], [.2, .05]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.022, 0, Math.PI * 2); ctx.fill(); });
      // stem
      ctx.beginPath(); ctx.moveTo(-s * 0.29, -s * 0.03); ctx.quadraticCurveTo(-s * 0.4, -s * 0.06, -s * 0.42, -s * 0.18);
      ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.1; ctx.stroke(); ctx.strokeStyle = '#43A047'; ctx.lineWidth = s * 0.06; ctx.stroke();
      ctx.restore();
      shine(ctx, s * 0.42, s * 0.42, s * 0.09, s * 0.03, 0.55);
    },
    // 4 Methi thepla: green flat disc with roast spots
    function (ctx, s) {
      shadow(ctx, s);
      const cx = s / 2, cy = s * 0.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.37, s * 0.33, 0, 0, Math.PI * 2);
      ctx.fillStyle = rg(ctx, cx, cy, s * 0.36, '#B6E07A', '#3E8E2E'); ctx.fill();
      ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = 'rgba(110,70,20,0.55)';
      [[-.15, -.1, .05], [.12, -.12, .035], [.15, .1, .05], [-.08, .13, .04], [.02, -.01, .03]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(cx + x * s, cy + y * s, r * s, r * s * 0.7, 0.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#2E7D32';
      [[-.22, .02], [.22, -.03], [0, .2], [-.02, -.2]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(cx + x * s, cy + y * s, s * 0.03, s * 0.015, 0.8, 0, Math.PI * 2); ctx.fill(); });
      shine(ctx, cx - s * 0.15, cy - s * 0.17, s * 0.08, s * 0.035, 0.45);
    },
    // 5 Kala jamun: glossy purple oval with syrup drop
    function (ctx, s) {
      shadow(ctx, s);
      const cx = s / 2, cy = s * 0.52;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.3, s * 0.35, 0.25, 0, Math.PI * 2);
      ctx.fillStyle = rg(ctx, cx, cy, s * 0.35, '#B06AD6', '#3A0B57'); ctx.fill();
      ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
      shine(ctx, cx - s * 0.1, cy - s * 0.18, s * 0.09, s * 0.05, 0.75);
      ctx.fillStyle = 'rgba(255,190,90,0.9)';
      ctx.beginPath(); ctx.moveTo(cx + s * 0.18, cy + s * 0.16); ctx.quadraticCurveTo(cx + s * 0.25, cy + s * 0.27, cx + s * 0.18, cy + s * 0.3); ctx.quadraticCurveTo(cx + s * 0.11, cy + s * 0.27, cx + s * 0.18, cy + s * 0.16); ctx.fill();
    }
  ];

  function piece(color, size) { return sprite('p' + color, size, PIECE_DRAW[color]); }

  // ---------- specials ----------
  function belanOverlay(ctx, s, dir) {
    ctx.save(); ctx.translate(s / 2, s / 2); if (dir === 'v') ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = -2; i <= 2; i++) ctx.fillRect(-s * 0.42, i * s * 0.12 - s * 0.025, s * 0.84, s * 0.05);
    // rolling pin
    ctx.lineWidth = s * 0.02; ctx.strokeStyle = OUT;
    const g = ctx.createLinearGradient(0, -s * 0.08, 0, s * 0.08); g.addColorStop(0, '#F3D7A7'); g.addColorStop(1, '#B07B3D');
    ctx.fillStyle = g; roundRect(ctx, -s * 0.3, -s * 0.075, s * 0.6, s * 0.15, s * 0.07); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8D5524';
    roundRect(ctx, -s * 0.46, -s * 0.035, s * 0.17, s * 0.07, s * 0.035); ctx.fill(); ctx.stroke();
    roundRect(ctx, s * 0.29, -s * 0.035, s * 0.17, s * 0.07, s * 0.035); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function kadhaiOverlay(ctx, s, hot) {
    ctx.save();
    ctx.lineWidth = s * 0.07; ctx.strokeStyle = hot ? '#FF5722' : '#37474F';
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.43, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.43, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    ctx.lineWidth = s * 0.03; ctx.strokeStyle = hot ? '#FFC107' : '#90A4AE';
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.43, 1.2 * Math.PI, 1.45 * Math.PI); ctx.stroke();
    // handles
    ctx.fillStyle = hot ? '#E64A19' : '#263238';
    ctx.beginPath(); ctx.ellipse(s * 0.04, s / 2, s * 0.06, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.96, s / 2, s * 0.06, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function dabba(ctx, s) {
    shadow(ctx, s);
    const cx = s / 2, cy = s / 2, r = s * 0.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#C9D2DA'); g.addColorStop(1, '#7B8A97');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
    const spices = ['#E53935', '#FDD835', '#6D4C41', '#FB8C00', '#43A047', '#F5F5F5', '#8E24AA'];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r * 0.55, y = cy + Math.sin(a) * r * 0.55;
      ctx.beginPath(); ctx.arc(x, y, r * 0.24, 0, Math.PI * 2); ctx.fillStyle = '#9AA6B2'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r * 0.19, 0, Math.PI * 2); ctx.fillStyle = spices[i]; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.24, 0, Math.PI * 2); ctx.fillStyle = '#9AA6B2'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.19, 0, Math.PI * 2); ctx.fillStyle = spices[6]; ctx.fill();
    shine(ctx, cx - r * 0.45, cy - r * 0.5, r * 0.25, r * 0.12, 0.8);
  }

  function special(color, sp, size) {
    if (sp === 'd') return sprite('d', size, dabba);
    return sprite('s' + color + sp, size, (ctx, s) => {
      if (sp === 'k' || sp === 'k2') { ctx.drawImage(piece(color, s), s * 0.12, s * 0.12, s * 0.76, s * 0.76); kadhaiOverlay(ctx, s, sp === 'k2'); }
      else { ctx.drawImage(piece(color, s), 0, 0); belanOverlay(ctx, s, sp); }
    });
  }

  // ---------- ingredients ----------
  function ingredient(kind, size) {
    return sprite('ing' + kind, size, (ctx, s) => {
      shadow(ctx, s);
      if (kind === 1) { // elaichi pod
        ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(0.5);
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.18, s * 0.34, 0, 0, Math.PI * 2);
        const g = ctx.createLinearGradient(-s * 0.18, 0, s * 0.18, 0); g.addColorStop(0, '#C5E1A5'); g.addColorStop(1, '#558B2F');
        ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.strokeStyle = 'rgba(51,105,30,0.7)'; ctx.lineWidth = s * 0.02;
        for (const x of [-0.07, 0, 0.07]) { ctx.beginPath(); ctx.moveTo(x * s, -s * 0.28); ctx.quadraticCurveTo(x * s * 1.6, 0, x * s, s * 0.28); ctx.stroke(); }
        ctx.restore();
      } else { // kesar (saffron) bundle
        for (let i = 0; i < 7; i++) {
          const a = -0.9 + i * 0.3;
          ctx.save(); ctx.translate(s / 2, s * 0.78); ctx.rotate(a);
          ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.06, -s * 0.3, 0, -s * 0.55); ctx.stroke();
          ctx.strokeStyle = i % 2 ? '#E53935' : '#FF7043'; ctx.lineWidth = s * 0.04; ctx.stroke();
          ctx.restore();
        }
      }
      // glow ring so the player notices it
      ctx.strokeStyle = 'rgba(255,215,64,0.85)'; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2); ctx.stroke();
    });
  }

  // ---------- blockers ----------
  function tiffin(ctx, s, hp) {
    const x = s * 0.12, w = s * 0.76;
    for (let i = 0; i < 3; i++) {
      const y = s * 0.2 + i * s * 0.2;
      const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#8C99A6'); g.addColorStop(0.35, '#F4F7FA'); g.addColorStop(1, '#6E7B88');
      ctx.fillStyle = g; roundRect(ctx, x, y, w, s * 0.2, s * 0.05); ctx.fill();
      ctx.lineWidth = s * 0.03; ctx.strokeStyle = '#37474F'; ctx.stroke();
    }
    ctx.strokeStyle = '#37474F'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.arc(s / 2, s * 0.2, s * 0.17, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#B0BEC5'; ctx.beginPath(); ctx.ellipse(s / 2, s * 0.2, s * 0.38, s * 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (hp < 2) crack(ctx, s);
  }
  function matka(ctx, s, hp) {
    ctx.beginPath(); ctx.moveTo(s * 0.35, s * 0.18); ctx.lineTo(s * 0.65, s * 0.18);
    ctx.bezierCurveTo(s * 0.62, s * 0.28, s * 0.95, s * 0.4, s * 0.85, s * 0.66);
    ctx.bezierCurveTo(s * 0.78, s * 0.88, s * 0.22, s * 0.88, s * 0.15, s * 0.66);
    ctx.bezierCurveTo(s * 0.05, s * 0.4, s * 0.38, s * 0.28, s * 0.35, s * 0.18); ctx.closePath();
    ctx.fillStyle = rg(ctx, s / 2, s * 0.55, s * 0.4, '#E59866', '#8E3B12'); ctx.fill();
    ctx.lineWidth = s * 0.04; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#5D2A0C'; ctx.beginPath(); ctx.ellipse(s / 2, s * 0.18, s * 0.16, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFEB3B'; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.55); for (let i = 0; i <= 8; i++) ctx.lineTo(s * 0.18 + i * s * 0.08, s * 0.55 + (i % 2 ? -s * 0.04 : 0)); ctx.stroke();
    if (hp < 2) crack(ctx, s);
  }
  function fog(ctx, s) {
    ctx.fillStyle = 'rgba(120,110,100,0.92)';
    [[.3, .45, .22], [.55, .35, .25], [.7, .55, .22], [.4, .65, .22], [.55, .6, .22]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(170,160,150,0.9)';
    [[.38, .4, .13], [.6, .33, .12]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2); ctx.fill(); });
    // grumpy face
    ctx.fillStyle = '#3E2723';
    ctx.beginPath(); ctx.arc(s * 0.42, s * 0.52, s * 0.035, 0, Math.PI * 2); ctx.arc(s * 0.6, s * 0.52, s * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3E2723'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.arc(s * 0.51, s * 0.68, s * 0.07, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  }
  function tawa(ctx, s, hot) {
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = hot ? rg(ctx, s / 2, s / 2, s * 0.4, '#FF8A65', '#7F1D0B') : rg(ctx, s / 2, s / 2, s * 0.4, '#78909C', '#263238');
    ctx.fill(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.strokeStyle = hot ? 'rgba(255,235,59,0.8)' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.25, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4E342E'; roundRect(ctx, s * 0.82, s * 0.44, s * 0.17, s * 0.12, s * 0.04); ctx.fill();
    if (hot) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = s * 0.03;
      for (const x of [.38, .5, .62]) { ctx.beginPath(); ctx.moveTo(x * s, s * 0.32); ctx.quadraticCurveTo(x * s + s * 0.05, s * 0.22, x * s, s * 0.12); ctx.stroke(); }
    }
  }
  function handi(ctx, s, hp) {
    ctx.beginPath(); ctx.ellipse(s / 2, s * 0.6, s * 0.38, s * 0.27, 0, 0, Math.PI * 2);
    ctx.fillStyle = rg(ctx, s / 2, s * 0.6, s * 0.38, '#FFB74D', '#8D4A12'); ctx.fill();
    ctx.lineWidth = s * 0.04; ctx.strokeStyle = OUT; ctx.stroke();
    // lid sealed with dough (dum)
    ctx.fillStyle = '#F5DEB3'; ctx.beginPath(); ctx.ellipse(s / 2, s * 0.38, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rg(ctx, s / 2, s * 0.3, s * 0.25, '#FFD180', '#A0522D');
    ctx.beginPath(); ctx.ellipse(s / 2, s * 0.32, s * 0.25, s * 0.09, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5D4037'; ctx.beginPath(); ctx.arc(s / 2, s * 0.22, s * 0.045, 0, Math.PI * 2); ctx.fill();
    if (hp < 2) crack(ctx, s);
  }
  function crack(ctx, s) {
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.25); ctx.lineTo(s * 0.45, s * 0.45); ctx.lineTo(s * 0.38, s * 0.55); ctx.lineTo(s * 0.55, s * 0.75); ctx.moveTo(s * 0.45, s * 0.45); ctx.lineTo(s * 0.62, s * 0.4); ctx.stroke();
  }
  function block(type, hp, hot, size) {
    return sprite('b' + type + hp + (hot ? 'h' : ''), size, (ctx, s) => {
      if (type === 'tiffin') tiffin(ctx, s, hp);
      else if (type === 'matka') matka(ctx, s, hp);
      else if (type === 'fog') fog(ctx, s);
      else if (type === 'tawa') tawa(ctx, s, hot);
      else if (type === 'handi') handi(ctx, s, hp);
    });
  }
  function lock(type, size) {
    return sprite('l' + type, size, (ctx, s) => {
      if (type === 'dor') {
        ctx.strokeStyle = '#1565C0'; ctx.lineWidth = s * 0.05;
        ctx.beginPath(); ctx.moveTo(s * 0.05, s * 0.2); ctx.quadraticCurveTo(s * 0.5, s * 0.55, s * 0.95, s * 0.25); ctx.stroke();
        ctx.strokeStyle = '#E91E63';
        ctx.beginPath(); ctx.moveTo(s * 0.08, s * 0.8); ctx.quadraticCurveTo(s * 0.5, s * 0.45, s * 0.92, s * 0.82); ctx.stroke();
        // small kite
        ctx.fillStyle = '#FFC107'; ctx.strokeStyle = OUT; ctx.lineWidth = s * 0.02;
        ctx.beginPath(); ctx.moveTo(s * 0.82, s * 0.02); ctx.lineTo(s * 0.97, s * 0.14); ctx.lineTo(s * 0.84, s * 0.3); ctx.lineTo(s * 0.7, s * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(200,235,255,0.55)'; roundRect(ctx, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.16); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = s * 0.035; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.3); ctx.lineTo(s * 0.32, s * 0.16); ctx.moveTo(s * 0.68, s * 0.84); ctx.lineTo(s * 0.84, s * 0.68); ctx.stroke();
      }
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Goal icon as data URL for the DOM HUD
  function goalIcon(goal, size) {
    size = size || 64;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    if (goal.t === 'collect') ctx.drawImage(piece(goal.c, size), 0, 0);
    else if (goal.t === 'ing') ctx.drawImage(ingredient(1, size), 0, 0);
    else if (goal.t === 'jelly') { ctx.fillStyle = 'rgba(255,92,138,0.85)'; roundRect(ctx, size * 0.1, size * 0.1, size * 0.8, size * 0.8, size * 0.2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = size * 0.06; ctx.stroke(); shine(ctx, size * 0.35, size * 0.3, size * 0.12, size * 0.06, 0.7); }
    else if (goal.t === 'block') {
      if (goal.b === 'dor' || goal.b === 'ice') { ctx.drawImage(piece(2, size), 0, 0); ctx.drawImage(lock(goal.b, size), 0, 0); }
      else ctx.drawImage(block(goal.b, 2, false, size), 0, 0);
    } else if (goal.t === 'score') {
      ctx.fillStyle = '#FFC83D'; star(ctx, size / 2, size / 2, size * 0.42, size * 0.18); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = size * 0.05; ctx.stroke();
    }
    return cv.toDataURL();
  }
  function star(ctx, x, y, R, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath();
  }

  G.MM_ART = { piece, special, ingredient, block, lock, roundRect, goalIcon, star, PIECE_DRAW, dabba };
})(window);
