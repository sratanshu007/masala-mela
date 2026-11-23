/* Masala Mela — real 3D art. Every piece, special, blocker, board tile and Dabbu
 * is modelled in three.js, lit with a studio environment, and rendered ONCE at
 * startup into sprites. Gameplay then draws plain images, so it stays smooth on
 * low-end phones. Falls back to the 2D art if WebGL is unavailable.
 * (c) Deific Digital */
(function (G) {
  'use strict';
  let S = 192;               // sprite resolution (store assets render larger)
  const out = {};            // key -> canvas
  let T, R, scene, cam, camFlat;

  // ---------- helpers ----------
  function phys(color, o) {
    return new T.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15 }, o || {}));
  }
  function std(color, o) { return new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0 }, o || {})); }
  function steel(o) { return phys(0xdfe6ec, Object.assign({ metalness: 1, roughness: 0.22, clearcoat: 0.3 }, o || {})); }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function rnd(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }

  function snap(obj, opts) {
    opts = opts || {};
    scene.add(obj);
    R.render(scene, opts.flat ? camFlat : cam);
    scene.remove(obj);
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d');
    if (!opts.noShadow) {
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#2a1205';
      ctx.filter = 'blur(' + Math.round(S * 0.025) + 'px)';
      ctx.beginPath(); ctx.ellipse(S / 2, S * 0.86, S * 0.3, S * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.drawImage(R.domElement, 0, 0, S, S);
    if (opts.after) opts.after(ctx, S);
    return c;
  }

  // studio environment for reflections (warm softboxes like a festive stall)
  function makeEnv() {
    const env = new T.Scene();
    const g = new T.SphereGeometry(10, 32, 16);
    const cols = [];
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 10;
      const c = new T.Color().lerpColors(new T.Color(0x5a2c10), new T.Color(0xfff2dc), (y + 1) / 2);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    env.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    const box = (x, y, z, w, h, col, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    box(-4, 6, 5, 6, 4, 0xffffff, 3);
    box(6, 2, 3, 3, 6, 0xffd9a0, 2);
    box(-6, -1, -2, 3, 5, 0xffb070, 1.5);
    const pm = new T.PMREMGenerator(R);
    return pm.fromScene(env, 0.035).texture;
  }

  // ---------- the six pieces ----------
  function jalebi() {
    const pts = [];
    for (let t = 0; t <= Math.PI * 5; t += 0.08) {
      const r = 0.1 + t * 0.06;
      pts.push(new T.Vector3(Math.cos(t) * r, Math.sin(t) * r, Math.sin(t * 3) * 0.04));
    }
    const geo = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 400, 0.15, 14, false);
    const tex = canvasTex(256, 32, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#FFC23A'); g.addColorStop(1, '#F36F0F'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,240,180,0.35)'; c.fillRect(Math.random() * w, Math.random() * h, 3, 2); } });
    const m = new T.Mesh(geo, phys(0xffffff, { map: tex, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x3a1200, emissiveIntensity: 0.4 }));
    const gr = new T.Group(); gr.add(m); gr.rotation.set(-0.45, 0.25, 0);
    return gr;
  }
  function imli() {
    const geo = new T.IcosahedronGeometry(0.82, 6);
    const p = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.035 * Math.sin(v.x * 9) * Math.sin(v.y * 8) * Math.sin(v.z * 7); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    const gr = new T.Group();
    gr.add(new T.Mesh(geo, phys(0x8a4a1c, { roughness: 0.42, clearcoat: 0.8 })));
    const r = rnd(7), cols = [0xd63a2a, 0x6aa84f, 0xfff3e0, 0xd63a2a];
    for (let i = 0; i < 34; i++) {
      const th = r() * Math.PI * 2, ph = r() * 1.2;
      const s = new T.Mesh(new T.SphereGeometry(0.045 + r() * 0.03, 8, 6), std(cols[i % 4], { roughness: 0.8 }));
      s.position.set(Math.sin(ph) * Math.cos(th) * 0.84, Math.cos(ph) * 0.84, Math.sin(ph) * Math.sin(th) * 0.84);
      gr.add(s);
    }
    gr.rotation.x = 0.35;
    return gr;
  }
  function samosa() {
    const sh = new T.Shape();
    const A = [0, 1.0], B = [0.92, -0.72], C = [-0.92, -0.72], k = 0.22;
    const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
    const corner = (P, prev, next, first) => { const a = lerp(P, prev, k), b = lerp(P, next, k); if (first) sh.moveTo(a[0], a[1]); else sh.lineTo(a[0], a[1]); sh.quadraticCurveTo(P[0], P[1], b[0], b[1]); };
    corner(A, C, B, true); corner(B, A, C); corner(C, B, A); sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.2, bevelSegments: 10, curveSegments: 24 });
    geo.center();
    const bump = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); const r = rnd(3); for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, s = 3 + r() * 9; const g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(128,128,128,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } });
    bump.repeat.set(0.6, 0.6);
    const col = canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#F7B955'); g.addColorStop(1, '#B8620F'); c.fillStyle = g; c.fillRect(0, 0, w, h); const r = rnd(9); for (let i = 0; i < 120; i++) { c.fillStyle = 'rgba(150,80,10,' + (0.1 + r() * 0.2) + ')'; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); c.fill(); } });
    col.repeat.set(0.5, 0.5); col.offset.set(0.5, 0.5);
    const m = new T.Mesh(geo, phys(0xffffff, { map: col, bumpMap: bump, bumpScale: 4, roughness: 0.55, clearcoat: 0.25 }));
    const gr = new T.Group(); gr.add(m); gr.rotation.set(-0.3, 0.3, 0); gr.scale.setScalar(0.95);
    return gr;
  }
  function mirchi() {
    const prof = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new T.Vector2(0.02 + 0.27 * Math.pow(Math.sin(t * Math.PI * 0.55), 0.8) * (t > 0.92 ? Math.cos((t - 0.92) * 14) : 1), -1.0 + t * 1.85)); }
    const geo = new T.LatheGeometry(prof, 28);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + 0.32 * Math.pow((y + 1) / 1.85, 2) - 0.3 * ((y + 1) / 1.85)); }
    geo.computeVertexNormals();
    const gr = new T.Group();
    gr.add(new T.Mesh(geo, phys(0xd7261e, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x330000, emissiveIntensity: 0.3 })));
    const stemCurve = new T.CatmullRomCurve3([new T.Vector3(0.02, 0.8, 0), new T.Vector3(0.05, 1.0, 0), new T.Vector3(-0.12, 1.18, 0.02)]);
    gr.add(new T.Mesh(new T.TubeGeometry(stemCurve, 20, 0.07, 10, false), std(0x3f8f2f, { roughness: 0.5 })));
    const cap = new T.Mesh(new T.SphereGeometry(0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), std(0x4caf50, { roughness: 0.5 }));
    cap.position.y = 0.74; gr.add(cap);
    // besan batter crumbs
    const r = rnd(11);
    for (let i = 0; i < 16; i++) { const s = new T.Mesh(new T.SphereGeometry(0.04 + r() * 0.03, 8, 6), std(0xf2c46b, { roughness: 0.9 })); const y = -0.6 + r() * 1.2; s.position.set(0.32 * Math.pow((y + 1) / 1.85, 2) - 0.3 * ((y + 1) / 1.85) + (r() - 0.5) * 0.2, y, 0.2 + r() * 0.08); gr.add(s); }
    gr.rotation.set(0.1, 0, -0.75); gr.position.set(0.05, -0.05, 0); gr.scale.setScalar(1.22);
    return gr;
  }
  function thepla() {
    const sh = new T.Shape(); const r = rnd(5);
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rad = 0.95 + (r() - 0.5) * 0.06; if (!i) sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); else sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 6, curveSegments: 40 });
    geo.center();
    const tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#74AE3A'; c.fillRect(0, 0, w, h); const q = rnd(13); for (let i = 0; i < 26; i++) { const x = q() * w, y = q() * h, s = 6 + q() * 16; const g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, 'rgba(110,60,15,0.75)'); g.addColorStop(1, 'rgba(110,60,15,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } for (let i = 0; i < 70; i++) { c.fillStyle = '#2E6B1F'; c.save(); c.translate(q() * w, q() * h); c.rotate(q() * 3); c.fillRect(-4, -1.5, 8, 3); c.restore(); } });
    tex.repeat.set(0.5, 0.5); tex.offset.set(0.5, 0.5);
    const m = new T.Mesh(geo, phys(0xffffff, { map: tex, roughness: 0.72, clearcoat: 0.15 }));
    const gr = new T.Group(); gr.add(m); gr.rotation.set(-0.55, 0.2, 0);
    return gr;
  }
  function jamun() {
    const gr = new T.Group();
    const g = new T.SphereGeometry(0.8, 48, 32); g.scale(0.92, 1.05, 0.92);
    gr.add(new T.Mesh(g, phys(0x3a0f4c, { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.4, sheenColor: new T.Color(0x9c4dcc) })));
    const drop = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), phys(0xffb23e, { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9 }));
    drop.scale.set(1, 1.35, 1); drop.position.set(0.5, -0.5, 0.5); gr.add(drop);
    gr.rotation.z = 0.25;
    return gr;
  }
  const PIECES = [jalebi, imli, samosa, mirchi, thepla, jamun];

  // ---------- specials ----------
  function belan(dir) {
    const gr = new T.Group();
    const wood = phys(0xe0a868, { roughness: 0.45, clearcoat: 0.4 });
    const body = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 1.3, 24), wood); body.rotation.z = Math.PI / 2; gr.add(body);
    for (const s of [-1, 1]) {
      const h = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 0.42, 16), phys(0x8d5524, { roughness: 0.4 })); h.rotation.z = Math.PI / 2; h.position.x = s * 0.86; gr.add(h);
      const k = new T.Mesh(new T.SphereGeometry(0.12, 16, 12), phys(0x8d5524)); k.position.x = s * 1.08; gr.add(k);
    }
    // glowing magic bands
    for (const x of [-0.35, 0, 0.35]) { const b = new T.Mesh(new T.TorusGeometry(0.21, 0.025, 8, 32), phys(0xfff3b0, { emissive: 0xffd54f, emissiveIntensity: 1.2 })); b.rotation.y = Math.PI / 2; b.position.x = x; gr.add(b); }
    gr.position.z = 0.75;
    if (dir === 'v') gr.rotation.z = Math.PI / 2;
    return gr;
  }
  function kadhai(hot) {
    const gr = new T.Group();
    const bowl = new T.Mesh(new T.SphereGeometry(1.0, 40, 20, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), phys(hot ? 0x5a2a12 : 0x2f3438, { metalness: 0.85, roughness: 0.35, side: T.DoubleSide, emissive: hot ? 0xff4400 : 0x000000, emissiveIntensity: hot ? 0.5 : 0 }));
    bowl.position.y = 0.25; gr.add(bowl);
    const rim = new T.Mesh(new T.TorusGeometry(0.98, 0.06, 12, 48), phys(hot ? 0xff7a1a : 0x4a5258, { metalness: 0.9, roughness: 0.25, emissive: hot ? 0xff5500 : 0, emissiveIntensity: hot ? 1 : 0 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.08; gr.add(rim);
    for (const s of [-1, 1]) { const hnd = new T.Mesh(new T.TorusGeometry(0.17, 0.05, 10, 20, Math.PI), phys(0x2f3438, { metalness: 0.85, roughness: 0.3 })); hnd.position.set(s * 1.05, -0.05, 0); hnd.rotation.set(Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); gr.add(hnd); }
    gr.rotation.x = 0.55;
    return gr;
  }
  function dabba() {
    const gr = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(1, 1, 0.38, 64), steel()); gr.add(body);
    const rim = new T.Mesh(new T.TorusGeometry(1, 0.05, 12, 64), steel({ roughness: 0.12 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.19; gr.add(rim);
    const spices = [0xe53935, 0xfdd835, 0x6d4c41, 0xfb8c00, 0x43a047, 0xf5f5f5, 0x8e24aa];
    const place = (x, z, col) => {
      const cup = new T.Mesh(new T.CylinderGeometry(0.27, 0.24, 0.12, 32, 1, true), steel({ side: T.DoubleSide })); cup.position.set(x, 0.2, z); gr.add(cup);
      const m = new T.Mesh(new T.SphereGeometry(0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(col, { roughness: 0.95 })); m.scale.y = 0.55; m.position.set(x, 0.17, z); gr.add(m);
    };
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; place(Math.cos(a) * 0.6, Math.sin(a) * 0.6, spices[i]); }
    place(0, 0, spices[6]);
    gr.rotation.x = 0.95; gr.position.y = 0.05;
    return gr;
  }

  // ---------- ingredients ----------
  function elaichi() {
    const g = new T.SphereGeometry(0.5, 40, 24); g.scale(0.75, 1.5, 0.75);
    const p = g.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x); const k = 1 + 0.07 * Math.cos(a * 6); p.setX(i, v.x * k); p.setZ(i, v.z * k); }
    g.computeVertexNormals();
    const gr = new T.Group(); gr.add(new T.Mesh(g, phys(0x8bc34a, { roughness: 0.6, clearcoat: 0.3 })));
    const tip = new T.Mesh(new T.ConeGeometry(0.07, 0.18, 10), std(0x558b2f)); tip.position.y = 0.8; gr.add(tip);
    gr.rotation.z = 0.5; gr.scale.setScalar(1.25);
    return gr;
  }
  function kesar() {
    const gr = new T.Group();
    for (let i = 0; i < 9; i++) {
      const a = -0.8 + i * 0.2;
      const c = new T.CatmullRomCurve3([new T.Vector3(0, -0.8, 0), new T.Vector3(Math.sin(a) * 0.4, 0, Math.cos(i) * 0.1), new T.Vector3(Math.sin(a) * 0.9, 0.8, Math.sin(i) * 0.15)]);
      gr.add(new T.Mesh(new T.TubeGeometry(c, 20, 0.05, 8, false), phys(i % 2 ? 0xd32f2f : 0xff6f3c, { roughness: 0.4, emissive: 0x551100, emissiveIntensity: 0.4 })));
    }
    return gr;
  }

  // ---------- blockers ----------
  function tiffin() {
    const gr = new T.Group();
    for (let i = 0; i < 3; i++) {
      const c = new T.Mesh(new T.CylinderGeometry(0.78, 0.74, 0.42, 48), steel()); c.position.y = -0.55 + i * 0.46; gr.add(c);
      const rim = new T.Mesh(new T.TorusGeometry(0.78, 0.04, 10, 48), steel({ roughness: 0.15 })); rim.rotation.x = Math.PI / 2; rim.position.y = -0.34 + i * 0.46; gr.add(rim);
    }
    const lid = new T.Mesh(new T.SphereGeometry(0.78, 40, 12, 0, Math.PI * 2, 0, Math.PI / 5), steel()); lid.position.y = 0.06; lid.scale.y = 0.6; gr.add(lid);
    const handle = new T.Mesh(new T.TorusGeometry(0.42, 0.06, 12, 32, Math.PI), steel({ roughness: 0.3 })); handle.position.y = 0.42; gr.add(handle);
    for (const s of [-1, 1]) { const clip = new T.Mesh(new T.BoxGeometry(0.08, 1.4, 0.12), steel({ roughness: 0.35 })); clip.position.set(s * 0.8, -0.1, 0); gr.add(clip); }
    gr.rotation.x = 0.28; gr.position.y = -0.05; gr.scale.setScalar(0.95);
    return gr;
  }
  function matka() {
    const prof = []; for (let i = 0; i <= 30; i++) { const t = i / 30; prof.push(new T.Vector2(t < 0.9 ? 0.3 + 0.65 * Math.sin(t * Math.PI * 1.02) : 0.32 + (t - 0.9) * 1.2, -0.95 + t * 1.75)); }
    const tex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#B5532A'; c.fillRect(0, 0, w, h); c.fillStyle = '#F5E6C8'; c.fillRect(0, 44, w, 8); c.fillRect(0, 74, w, 5); c.strokeStyle = '#F5E6C8'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= w; x += 16) c.lineTo(x, x % 32 ? 56 : 70); c.stroke(); });
    const m = new T.Mesh(new T.LatheGeometry(prof, 40), phys(0xffffff, { map: tex, roughness: 0.85, clearcoat: 0.05, side: T.DoubleSide }));
    const gr = new T.Group(); gr.add(m);
    const neck = new T.Mesh(new T.TorusGeometry(0.42, 0.07, 12, 40), std(0x9c4220, { roughness: 0.85 })); neck.rotation.x = Math.PI / 2; neck.position.y = 0.8; gr.add(neck);
    gr.rotation.x = 0.2; gr.position.y = -0.05;
    return gr;
  }
  function fog() {
    const gr = new T.Group(); const r = rnd(21);
    const mat = phys(0x9a918a, { roughness: 1, clearcoat: 0, transparent: true, opacity: 0.96 });
    [[0, 0, 0.62], [-0.5, -0.15, 0.48], [0.52, -0.12, 0.5], [-0.25, 0.4, 0.42], [0.3, 0.42, 0.44], [0, -0.42, 0.45]].forEach(([x, y, s]) => { const b = new T.Mesh(new T.SphereGeometry(s, 24, 16), mat); b.position.set(x, y, (r() - 0.5) * 0.2); gr.add(b); });
    return gr;
  }
  function tawa(hot) {
    const gr = new T.Group();
    const m = new T.Mesh(new T.CylinderGeometry(0.92, 0.88, 0.14, 64), phys(hot ? 0x6b2410 : 0x2a2d30, { metalness: 0.75, roughness: 0.45, emissive: hot ? 0xff3300 : 0, emissiveIntensity: hot ? 0.9 : 0 }));
    gr.add(m);
    const h = new T.Mesh(new T.BoxGeometry(0.55, 0.1, 0.16), phys(0x5d4037, { roughness: 0.6 })); h.position.x = 1.1; gr.add(h);
    gr.rotation.x = 1.05;
    return gr;
  }
  function handi() {
    const prof = []; for (let i = 0; i <= 30; i++) { const t = i / 30; prof.push(new T.Vector2(0.25 + 0.75 * Math.sin(t * Math.PI * 0.95), -0.8 + t * 1.15)); }
    const gr = new T.Group();
    gr.add(new T.Mesh(new T.LatheGeometry(prof, 48), phys(0xc8702e, { metalness: 0.9, roughness: 0.28, side: T.DoubleSide })));
    const seal = new T.Mesh(new T.TorusGeometry(0.62, 0.1, 12, 48), std(0xf2deb3, { roughness: 0.9 })); seal.rotation.x = Math.PI / 2; seal.position.y = 0.37; gr.add(seal);
    const lid = new T.Mesh(new T.SphereGeometry(0.64, 40, 12, 0, Math.PI * 2, 0, Math.PI / 3), phys(0xd88a44, { metalness: 0.9, roughness: 0.25 })); lid.position.y = 0.05; gr.add(lid);
    const knob = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), phys(0x8d4a12, { metalness: 0.8, roughness: 0.3 })); knob.position.y = 0.72; gr.add(knob);
    gr.rotation.x = 0.3;
    return gr;
  }
  function ice() {
    const g = new T.BoxGeometry(1.75, 1.75, 1.2, 1, 1, 1);
    const m = new T.Mesh(g, phys(0xd8f3ff, { transparent: true, opacity: 0.42, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 }));
    const e = new T.LineSegments(new T.EdgesGeometry(g), new T.LineBasicMaterial({ color: 0xffffff }));
    const gr = new T.Group(); gr.add(m); gr.add(e); gr.rotation.set(0.25, 0.3, 0);
    return gr;
  }
  function tile(dark) {
    const sh = new T.Shape(); const s = 0.98, r = 0.24;
    sh.moveTo(-s + r, -s); sh.lineTo(s - r, -s); sh.quadraticCurveTo(s, -s, s, -s + r); sh.lineTo(s, s - r); sh.quadraticCurveTo(s, s, s - r, s);
    sh.lineTo(-s + r, s); sh.quadraticCurveTo(-s, s, -s, s - r); sh.lineTo(-s, -s + r); sh.quadraticCurveTo(-s, -s, -s + r, -s);
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 6 });
    geo.center();
    return new T.Mesh(geo, phys(dark ? 0x9b5f35 : 0xb0733f, { roughness: 0.5, clearcoat: 0.45 }));
  }
  function dabbuBody() {
    const gr = new T.Group();
    for (let i = 0; i < 4; i++) {
      const c = new T.Mesh(new T.CylinderGeometry(0.72, 0.7, 0.44, 48), steel()); c.position.y = -0.85 + i * 0.48; gr.add(c);
      const rim = new T.Mesh(new T.TorusGeometry(0.72, 0.035, 10, 48), steel({ roughness: 0.12 })); rim.rotation.x = Math.PI / 2; rim.position.y = -0.63 + i * 0.48; gr.add(rim);
    }
    const lid = new T.Mesh(new T.SphereGeometry(0.72, 40, 12, 0, Math.PI * 2, 0, Math.PI / 5), steel()); lid.scale.y = 0.6; lid.position.y = 0.58; gr.add(lid);
    const handle = new T.Mesh(new T.TorusGeometry(0.4, 0.06, 12, 32, Math.PI), steel({ roughness: 0.3 })); handle.position.y = 0.92; gr.add(handle);
    gr.rotation.x = 0.12; gr.scale.setScalar(0.9);
    return gr;
  }
  function dabbuFace(ctx, s, mood) {
    const cx = s / 2, ey = s * 0.44;
    ctx.fillStyle = '#fff';
    for (const dx of [-0.13, 0.13]) { ctx.beginPath(); ctx.ellipse(cx + dx * s, ey, s * 0.055, mood === 'sad' ? s * 0.03 : s * 0.07, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#2b1608';
    for (const dx of [-0.13, 0.13]) { ctx.beginPath(); ctx.arc(cx + dx * s + s * 0.01, ey + s * 0.01, s * 0.035, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + dx * s + s * 0.022, ey - s * 0.01, s * 0.012, 0, 7); ctx.fill(); ctx.fillStyle = '#2b1608'; }
    ctx.fillStyle = 'rgba(255,120,120,0.45)';
    for (const dx of [-0.21, 0.21]) { ctx.beginPath(); ctx.ellipse(cx + dx * s, ey + s * 0.09, s * 0.04, s * 0.025, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#3b1f0e'; ctx.lineWidth = s * 0.016; ctx.fillStyle = '#8B1E1E';
    if (mood === 'sad') { ctx.beginPath(); ctx.arc(cx, s * 0.62, s * 0.06, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
    else if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(cx, s * 0.6, s * 0.04, s * 0.05, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(cx - s * 0.08, s * 0.555); ctx.quadraticCurveTo(cx, s * 0.66, cx + s * 0.08, s * 0.555); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }

  function crackOver(ctx, s) {
    ctx.strokeStyle = 'rgba(20,20,20,0.85)'; ctx.lineWidth = s * 0.022; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.32, s * 0.28); ctx.lineTo(s * 0.46, s * 0.45); ctx.lineTo(s * 0.4, s * 0.56); ctx.lineTo(s * 0.55, s * 0.74); ctx.moveTo(s * 0.46, s * 0.45); ctx.lineTo(s * 0.64, s * 0.4); ctx.stroke();
  }
  function fogFace(ctx, s) {
    ctx.fillStyle = '#3E2723';
    ctx.beginPath(); ctx.arc(s * 0.41, s * 0.5, s * 0.035, 0, 7); ctx.arc(s * 0.59, s * 0.5, s * 0.035, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3E2723'; ctx.lineWidth = s * 0.025; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.35, s * 0.42); ctx.lineTo(s * 0.45, s * 0.45); ctx.moveTo(s * 0.65, s * 0.42); ctx.lineTo(s * 0.55, s * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.5, s * 0.66, s * 0.07, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  }
  function steam(ctx, s) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = s * 0.025; ctx.lineCap = 'round';
    for (const x of [0.38, 0.5, 0.62]) { ctx.beginPath(); ctx.moveTo(x * s, s * 0.3); ctx.quadraticCurveTo(x * s + s * 0.05, s * 0.2, x * s, s * 0.08); ctx.stroke(); }
  }
  function glowRing(ctx, s) { ctx.strokeStyle = 'rgba(255,215,64,0.9)'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.45, 0, 7); ctx.stroke(); }

  // ---------- build all sprites ----------
  async function build(progress, size) {
    if (!G.THREE) return false;
    if (size) S = size;
    T = G.THREE;
    try {
      R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    } catch (e) { return false; }
    if (!R.getContext()) return false;
    R.setPixelRatio(1); R.setSize(S, S, false); R.setClearColor(0x000000, 0);
    R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    scene = new T.Scene();
    scene.environment = makeEnv();
    scene.add(new T.HemisphereLight(0xfff4e0, 0x6b3a1a, 1.4));
    const key = new T.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new T.DirectionalLight(0xffc27a, 1.6); rim.position.set(4, 2, -3); scene.add(rim);
    cam = new T.PerspectiveCamera(30, 1, 0.1, 100); cam.position.set(0, 0.55, 5.7); cam.lookAt(0, 0, 0);
    camFlat = new T.OrthographicCamera(-1.08, 1.08, 1.08, -1.08, 0.1, 50); camFlat.position.set(0, 0, 10); camFlat.lookAt(0, 0, 0);

    const tick = async (f) => { progress && progress(f); await new Promise(r => setTimeout(r, 0)); };
    const pieceModels = PIECES.map(f => f());
    for (let c = 0; c < 6; c++) { out['p' + c] = snap(pieceModels[c]); }
    await tick(0.25);
    for (let c = 0; c < 6; c++) {
      for (const sp of ['h', 'v']) {
        const g = new T.Group(); const pm = PIECES[c](); pm.scale.multiplyScalar(0.88); g.add(pm); g.add(belan(sp));
        out['s' + c + sp] = snap(g);
      }
      for (const hot of [false, true]) {
        const g = new T.Group(); const pm = PIECES[c](); pm.scale.multiplyScalar(0.62); pm.position.set(0, 0.22, 0.25); g.add(kadhai(hot)); g.add(pm);
        out['s' + c + (hot ? 'k2' : 'k')] = snap(g);
      }
      await tick(0.25 + c * 0.08);
    }
    out.d = snap(dabba());
    out.ing1 = snap(elaichi(), { after: glowRing }); out.ing2 = snap(kesar(), { after: glowRing });
    const tf = tiffin(), mk = matka(), hd = handi();
    out.btiffin2 = snap(tf); out.btiffin1 = snap(tf, { after: crackOver });
    out.bmatka2 = snap(mk); out.bmatka1 = snap(mk, { after: crackOver });
    out.bhandi2 = snap(hd); out.bhandi1 = snap(hd, { after: crackOver });
    out.bfog1 = snap(fog(), { after: fogFace });
    out.btawa1 = snap(tawa(false)); out.btawa1h = snap(tawa(true), { after: steam });
    out.lice = snap(ice(), { noShadow: true });
    out.tile0 = snap(tile(false), { flat: true, noShadow: true }); out.tile1 = snap(tile(true), { flat: true, noShadow: true });
    const body = dabbuBody();
    for (const mood of ['happy', 'sad', 'wow']) out['dabbu_' + mood] = snap(body, { after: (ctx, s) => dabbuFace(ctx, s, mood) });
    await tick(1);
    R.dispose();
    install();
    return true;
  }

  // ---------- swap the 2D art for the 3D sprites ----------
  function install() {
    const A = G.MM_ART;
    const old = { piece: A.piece, special: A.special, ingredient: A.ingredient, block: A.block, lock: A.lock };
    A.piece = (c, size) => out['p' + c] || old.piece(c, size);
    A.special = (c, sp, size) => (sp === 'd' ? out.d : out['s' + c + sp]) || old.special(c, sp, size);
    A.ingredient = (k, size) => out['ing' + k] || old.ingredient(k, size);
    A.block = (type, hp, hot, size) => out['b' + type + Math.max(1, Math.min(2, hp)) + (hot ? 'h' : '')] || out['b' + type + '1' + (hot ? 'h' : '')] || old.block(type, hp, hot, size);
    A.lock = (type, size) => (type === 'ice' ? out.lice : old.lock(type, size));
    A.tile = (dark) => out['tile' + (dark ? 1 : 0)];
    A.is3D = true;
    A.goalIcon = function (goal, size) {
      size = size || 64;
      const cv = document.createElement('canvas'); cv.width = cv.height = size; const ctx = cv.getContext('2d');
      const draw = img => ctx.drawImage(img, 0, 0, size, size);
      if (goal.t === 'collect') draw(A.piece(goal.c));
      else if (goal.t === 'ing') draw(A.ingredient(1));
      else if (goal.t === 'block') { if (goal.b === 'dor' || goal.b === 'ice') { draw(A.piece(2)); draw(A.lock(goal.b, size)); } else draw(A.block(goal.b, 2, false)); }
      else if (goal.t === 'jelly') { const g = ctx.createLinearGradient(0, 0, 0, size); g.addColorStop(0, '#FF9BB8'); g.addColorStop(1, '#E0336A'); ctx.fillStyle = g; A.roundRect(ctx, size * 0.1, size * 0.1, size * 0.8, size * 0.8, size * 0.22); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(size * 0.35, size * 0.28, size * 0.15, size * 0.06, -0.4, 0, 7); ctx.fill(); }
      else if (goal.t === 'score') { ctx.fillStyle = '#FFC83D'; A.star(ctx, size / 2, size / 2, size * 0.42, size * 0.18); ctx.fill(); ctx.strokeStyle = '#7A4A00'; ctx.lineWidth = size * 0.05; ctx.stroke(); }
      return cv.toDataURL();
    };
    // 3D Dabbu for the HUD and splash
    const oldChars = G.MM_CHARS;
    const urls = {}; ['happy', 'sad', 'wow'].forEach(m => { urls[m] = out['dabbu_' + m].toDataURL(); });
    G.MM_CHARS = (who, mood) => (who === 'dabbu' ? `<img src="${urls[mood] || urls.happy}" alt="Dabbu" style="width:100%;display:block">` : oldChars(who, mood));
  }

  G.MM_ART3D = { build, sprites: out };
})(window);
