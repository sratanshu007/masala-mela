/* Masala Mela — 3D story characters (Meethi, Dadi Maa, Fika Seth, Kadwa Karela).
 * Modelled in three.js, rendered once per mood into images, then used by the
 * story dialogs, popups and map. (c) Deific Digital */
(function (G) {
  'use strict';
  const SZ = 320;
  let T, R, scene, cam;
  const urls = {};

  const mat = (c, o) => new T.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.3 }, o || {}));
  const skin = c => mat(c, { roughness: 0.6, clearcoat: 0.15, sheen: 0.3, sheenColor: new T.Color(0xffc0a0) });
  const sph = (r, m, x, y, z, sx, sy, sz) => { const s = new T.Mesh(new T.SphereGeometry(r, 40, 28), m); s.position.set(x || 0, y || 0, z || 0); s.scale.set(sx || 1, sy || 1, sz || 1); return s; };
  const tube = (pts, r, m) => new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2]))), 32, r, 10, false), m);
  const V = (x, y, z) => [x, y, z];

  // cartoon eyes: white + iris + pupil + glint, mood shapes the lids
  function eyes(gr, y, z, gap, size, mood, iris) {
    for (const s of [-1, 1]) {
      const e = new T.Group(); e.position.set(s * gap, y, z);
      e.add(sph(size, mat(0xffffff, { roughness: 0.2, clearcoat: 0.8 }), 0, 0, 0, 0.85, mood === 'sad' ? 0.6 : 1.05, 0.55));
      e.add(sph(size * 0.58, mat(iris || 0x4e2a12, { roughness: 0.2, clearcoat: 1 }), 0, -size * 0.05, size * 0.38, 1, mood === 'sad' ? 0.65 : 1, 0.4));
      e.add(sph(size * 0.3, mat(0x120802, { roughness: 0.1, clearcoat: 1 }), 0, -size * 0.05, size * 0.5, 1, 1, 0.4));
      e.add(sph(size * 0.12, new T.MeshBasicMaterial({ color: 0xffffff }), size * 0.18, size * 0.22, size * 0.6));
      gr.add(e);
    }
  }
  function mouth(gr, y, z, w, mood, col) {
    const m = mat(col || 0x7a1414, { roughness: 0.4 });
    if (mood === 'sad') gr.add(tube([V(-w, y - 0.04, z), V(0, y + 0.05, z + 0.03), V(w, y - 0.04, z)], 0.035, m));
    else if (mood === 'angry') gr.add(tube([V(-w, y, z), V(0, y + 0.02, z + 0.03), V(w, y, z)], 0.035, m));
    else if (mood === 'wow') gr.add(sph(w * 0.5, m, 0, y, z, 0.9, 1.1, 0.4));
    else { const sm = new T.Mesh(new T.SphereGeometry(w, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m); sm.scale.set(1, 0.7, 0.35); sm.position.set(0, y + 0.05, z); gr.add(sm); }
  }
  function brows(gr, y, z, gap, ang, col) {
    for (const s of [-1, 1]) { const b = new T.Mesh(new T.CapsuleGeometry(0.035, 0.16, 6, 10), mat(col || 0x1b1b1b)); b.rotation.z = Math.PI / 2 + s * ang; b.position.set(s * gap, y, z); gr.add(b); }
  }
  function cheeks(gr, y, z, gap) { for (const s of [-1, 1]) gr.add(sph(0.11, mat(0xff7a7a, { transparent: true, opacity: 0.45, roughness: 1 }), s * gap, y, z, 1, 0.6, 0.3)); }

  function meethi(mood) {
    const gr = new T.Group();
    // body: red kurta + yellow dupatta
    const body = new T.Mesh(new T.CylinderGeometry(0.45, 0.85, 1.3, 40), mat(0xd7263d, { roughness: 0.6 })); body.position.y = -1.25; gr.add(body);
    gr.add(tube([V(-0.42, -0.62, 0.32), V(-0.05, -0.95, 0.58), V(0.35, -1.35, 0.66), V(0.62, -1.75, 0.6)], 0.085, mat(0xffc83d, { roughness: 0.5 })));
    // neck + head
    gr.add(sph(0.18, skin(0xc98b5e), 0, -0.55, 0, 1, 1.2, 1));
    gr.add(sph(0.72, skin(0xc98b5e), 0, 0.15, 0));
    // hair: cap + side fringe + braid
    const hair = mat(0x1b120c, { roughness: 0.45, clearcoat: 0.6 });
    const cap = new T.Mesh(new T.SphereGeometry(0.76, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.52), hair); cap.position.set(0, 0.17, -0.04); cap.rotation.x = -0.25; gr.add(cap);
    for (let i = 0; i < 6; i++) gr.add(sph(0.16 - i * 0.012, hair, 0.55 + Math.sin(i * 0.6) * 0.05, -0.05 - i * 0.22, -0.35 - i * 0.02));
    gr.add(sph(0.07, mat(0xd7263d), 0.55, -1.33, -0.45));
    gr.add(sph(0.045, mat(0xd7263d, { clearcoat: 1 }), 0, 0.42, 0.7)); // bindi
    eyes(gr, 0.12, 0.6, 0.25, 0.14, mood);
    brows(gr, 0.36, 0.66, 0.25, mood === 'sad' ? -0.25 : 0.1);
    cheeks(gr, -0.08, 0.62, 0.42);
    gr.add(sph(0.06, skin(0xb57449), 0, 0.0, 0.72));
    mouth(gr, -0.22, 0.65, 0.17, mood);
    for (const s of [-1, 1]) gr.add(sph(0.08, mat(0xffc83d, { metalness: 0.9, roughness: 0.2 }), s * 0.72, -0.05, 0.05)); // earrings
    return gr;
  }
  function dadi() {
    const gr = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.5, 0.95, 1.3, 40), mat(0xfff8e6, { roughness: 0.7 })); body.position.y = -1.25; gr.add(body);
    gr.add(tube([V(-0.45, -0.62, 0.36), V(-0.05, -1.0, 0.6), V(0.4, -1.4, 0.7), V(0.68, -1.8, 0.66)], 0.08, mat(0xff8a3d)));
    gr.add(sph(0.7, skin(0xd9a27a), 0, 0.15, 0));
    const hair = mat(0xeeeeee, { roughness: 0.5 });
    const cap = new T.Mesh(new T.SphereGeometry(0.74, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.45), hair); cap.position.set(0, 0.17, -0.05); cap.rotation.x = -0.3; gr.add(cap);
    gr.add(sph(0.3, hair, 0, 0.82, -0.35));
    // glasses
    const gm = mat(0x6d4c41, { metalness: 0.6, roughness: 0.3 });
    for (const s of [-1, 1]) { const ring = new T.Mesh(new T.TorusGeometry(0.17, 0.025, 10, 32), gm); ring.position.set(s * 0.25, 0.12, 0.66); gr.add(ring); }
    gr.add(tube([V(-0.08, 0.14, 0.68), V(0, 0.17, 0.7), V(0.08, 0.14, 0.68)], 0.02, gm));
    eyes(gr, 0.12, 0.58, 0.25, 0.11, 'happy');
    cheeks(gr, -0.12, 0.6, 0.42);
    gr.add(sph(0.07, skin(0xc98b60), 0, -0.02, 0.7));
    mouth(gr, -0.25, 0.63, 0.15, 'happy');
    gr.add(sph(0.045, mat(0xd7263d), 0, 0.45, 0.66));
    return gr;
  }
  function seth(mood) {
    const gr = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.6, 0.9, 1.35, 40), mat(0x8d6e63, { roughness: 0.65 })); body.position.y = -1.25; gr.add(body);
    gr.add(sph(0.62, mat(0x8d6e63, { roughness: 0.65 }), 0, -1.2, 0.35, 1, 0.9, 0.7)); // belly
    for (let i = 0; i < 3; i++) gr.add(sph(0.05, mat(0xffc83d, { metalness: 0.9, roughness: 0.2 }), 0, -0.75 - i * 0.22, 0.74 - i * 0.04));
    gr.add(sph(0.74, skin(0xbcaaa4), 0, 0.12, 0));
    const hair = mat(0x5f5f5f, { roughness: 0.6 });
    for (const s of [-1, 1]) gr.add(sph(0.22, hair, s * 0.66, 0.25, -0.1, 0.7, 1, 1));
    // moustache: two curled tubes
    const mm = mat(0x2b1d16, { roughness: 0.5 });
    for (const s of [-1, 1]) gr.add(tube([V(0, -0.12, 0.74), V(s * 0.25, -0.16, 0.7), V(s * 0.45, -0.05, 0.6), V(s * 0.52, 0.06, 0.52)], 0.07, mm));
    gr.add(sph(0.1, skin(0xa89089), 0, 0.0, 0.76, 1, 1.2, 1));
    eyes(gr, 0.18, 0.62, 0.26, 0.12, mood === 'happy' ? 'happy' : 'sad');
    brows(gr, 0.38, 0.68, 0.26, mood === 'happy' ? 0.15 : -0.35, 0x3a2a20);
    mouth(gr, -0.34, 0.66, 0.13, mood === 'happy' ? 'happy' : 'angry', 0x4a1010);
    // topi
    const topi = new T.Mesh(new T.CylinderGeometry(0.5, 0.55, 0.32, 40), mat(0x4e342e, { roughness: 0.5 })); topi.position.y = 0.82; topi.rotation.x = -0.1; gr.add(topi);
    return gr;
  }
  function karela() {
    const gr = new T.Group();
    const prof = []; for (let i = 0; i <= 30; i++) { const t = i / 30; prof.push(new T.Vector2(0.05 + 0.62 * Math.pow(Math.sin(t * Math.PI), 0.75), -1.5 + t * 3)); }
    const g = new T.LatheGeometry(prof, 48);
    const p = g.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x); const k = 1 + 0.09 * Math.cos(a * 10) + 0.04 * Math.sin(v.y * 14) * Math.cos(a * 5); p.setX(i, v.x * k); p.setZ(i, v.z * k); }
    g.computeVertexNormals();
    gr.add(new T.Mesh(g, mat(0x6fae2f, { roughness: 0.45, clearcoat: 0.6 })));
    gr.add(tube([V(0, 1.45, 0), V(0.1, 1.7, 0), V(-0.15, 1.85, 0.05)], 0.07, mat(0x33691e)));
    eyes(gr, 0.3, 0.7, 0.24, 0.17, 'happy', 0x7a1010);
    brows(gr, 0.58, 0.8, 0.24, -0.45, 0x1b3a0a);
    mouth(gr, -0.12, 0.72, 0.17, 'angry', 0x2a0a0a);
    return gr;
  }

  function render(obj, camY, dist, size) {
    scene.add(obj);
    cam.position.set(0, camY - 0.15, dist * 0.84); cam.lookAt(0, camY - 0.42, 0);
    R.render(scene, cam);
    scene.remove(obj);
    const c = document.createElement('canvas'); c.width = c.height = size || SZ;
    c.getContext('2d').drawImage(R.domElement, 0, 0, c.width, c.height);
    return c.toDataURL();
  }

  async function build() {
    if (!G.THREE) return false;
    T = G.THREE;
    try { R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }); } catch (e) { return false; }
    if (!R.getContext()) return false;
    R.setPixelRatio(1); R.setSize(SZ, SZ, false); R.setClearColor(0, 0);
    R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping;
    scene = new T.Scene();
    const pm = new T.PMREMGenerator(R);
    const env = new T.Scene(); env.add(new T.Mesh(new T.SphereGeometry(10), new T.MeshBasicMaterial({ color: 0xffe8cc, side: T.BackSide })));
    scene.environment = pm.fromScene(env, 0.04).texture;
    scene.add(new T.HemisphereLight(0xfff4e0, 0x6b3a1a, 1.3));
    const key = new T.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 4, 6); scene.add(key);
    const rim = new T.DirectionalLight(0xffc27a, 1.8); rim.position.set(4, 3, -4); scene.add(rim);
    cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
    urls.meethi_happy = render(meethi('happy'), 0, 7.2);
    urls.meethi_sad = render(meethi('sad'), 0, 7.2);
    urls.dadi_happy = render(dadi(), 0, 7.2);
    urls.seth_happy = render(seth('happy'), 0.15, 7.6);
    urls.seth_angry = render(seth('angry'), 0.15, 7.6);
    urls.karela_happy = render(karela(), 0.65, 7.8);
    R.dispose();
    const prev = G.MM_CHARS;
    G.MM_CHARS = (who, mood) => {
      let key = who + '_' + (mood || 'happy');
      if (who === 'seth') key = mood === 'happy' ? 'seth_happy' : 'seth_angry';
      if (who === 'meethi' && mood !== 'sad') key = 'meethi_happy';
      if (who === 'dadi') key = 'dadi_happy';
      if (who === 'karela') key = 'karela_happy';
      return urls[key] ? `<img src="${urls[key]}" alt="${who}" style="width:100%;display:block">` : prev(who, mood);
    };
    return true;
  }

  G.MM_CHARS3D = { build, urls };
})(window);
