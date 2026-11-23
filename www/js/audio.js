/* Masala Mela — synthesized SFX + generative desi music (WebAudio).
 * No audio files: tabla, tanpura drone and raag-scale melodies are generated.
 * (c) Deific Digital */
(function (G) {
  'use strict';
  const A = {
    ctx: null, master: null, music: null, sfx: null, noiseBuf: null,
    musicOn: true, sfxOn: true, voiceOn: false,
    world: null, playing: false, step: 0, nextTime: 0, timer: null,
    tempoMul: 1, energy: 0, menu: false
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain(); A.master.gain.value = 0.9;
    const comp = A.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    A.master.connect(comp); comp.connect(A.ctx.destination);
    A.music = A.ctx.createGain(); A.music.gain.value = A.musicOn ? 0.32 : 0; A.music.connect(A.master);
    A.sfx = A.ctx.createGain(); A.sfx.gain.value = A.sfxOn ? 0.7 : 0; A.sfx.connect(A.master);
    const len = A.ctx.sampleRate;
    A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (A.pendingWorld) A.playWorld(A.pendingWorld, A.pendingMenu);
  };

  A.setMusic = function (on) { A.musicOn = on; if (A.music) A.music.gain.setTargetAtTime(on ? 0.32 : 0, A.ctx.currentTime, 0.1); };
  A.setSfx = function (on) { A.sfxOn = on; if (A.sfx) A.sfx.gain.setTargetAtTime(on ? 0.7 : 0, A.ctx.currentTime, 0.05); };
  A.duck = function (on) { if (A.music && A.musicOn) A.music.gain.setTargetAtTime(on ? 0.12 : 0.32, A.ctx.currentTime, 0.15); };

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function tone(o) {
    if (!A.ctx) return;
    const c = A.ctx, t = o.t != null ? o.t : c.currentTime;
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.d));
    const g = c.createGain();
    const v = o.v != null ? o.v : 0.3, at = o.a || 0.005, d = o.d || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + d);
    let node = osc;
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.f * 0.012; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + at + d + 0.05);
    }
    if (o.filter) { const f = c.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1200; f.Q.value = o.q || 1; node.connect(f); node = f; }
    node.connect(g);
    if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(o.out || A.sfx); }
    else g.connect(o.out || A.sfx);
    osc.start(t); osc.stop(t + at + d + 0.05);
  }
  function noise(o) {
    if (!A.ctx) return;
    const c = A.ctx, t = o.t != null ? o.t : c.currentTime;
    const src = c.createBufferSource(); src.buffer = A.noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.frequency.setValueAtTime(o.ff || 1500, t);
    if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + o.d);
    f.Q.value = o.q || 1;
    const g = c.createGain(); const v = o.v != null ? o.v : 0.3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + (o.a || 0.005) + o.d);
    src.connect(f); f.connect(g); g.connect(o.out || A.sfx);
    src.start(t, Math.random() * 0.5); src.stop(t + o.d + 0.1);
  }

  // Bhupali (Sa Re Ga Pa Dha) note for cascade pitch ladder
  const BHUP = [0, 2, 4, 7, 9];
  function bhup(i, base) { return mtof((base || 72) + BHUP[i % 5] + 12 * Math.floor(i / 5)); }

  const S = {
    tik() { tone({ f: 1800, d: 0.03, v: 0.08, type: 'triangle' }); },
    click() { tone({ f: 900, f2: 600, d: 0.06, v: 0.15, type: 'triangle' }); },
    swap() { noise({ ff: 800, ff2: 3000, d: 0.12, v: 0.1 }); tone({ f: 1320, d: 0.12, v: 0.06 }); },
    bad() { const t = A.ctx.currentTime; tone({ f: 520, d: 0.12, v: 0.15, type: 'triangle', t }); tone({ f: 390, d: 0.18, v: 0.15, type: 'triangle', t: t + 0.12 }); },
    match(combo) {
      const t = A.ctx.currentTime, f = bhup(Math.min(combo - 1, 12));
      tone({ f, d: 0.35, v: 0.22, t }); tone({ f: f * 4, d: 0.08, v: 0.05, t }); tone({ f: f * 2.01, d: 0.2, v: 0.06, type: 'triangle', t });
    },
    pop() { tone({ f: 600 + Math.random() * 300, f2: 200, d: 0.08, v: 0.05, type: 'sine' }); },
    special() { const t = A.ctx.currentTime; [0, 1, 2, 3].forEach(i => tone({ f: bhup(i + 5), d: 0.18, v: 0.12, t: t + i * 0.05, type: 'triangle' })); },
    belan(pan) { noise({ ff: 400, ff2: 5000, d: 0.3, v: 0.25 }); tabla(A.ctx.currentTime, 'dha', A.sfx, 0.5); },
    kadhai(second) { const t = A.ctx.currentTime; tone({ f: 110, f2: 45, d: 0.4, v: second ? 0.45 : 0.55 }); noise({ ff: 600, ff2: 200, d: 0.35, v: 0.35, filter: 'lowpass', t }); },
    dabba() { const t = A.ctx.currentTime; [1, 2.76, 5.4].forEach(r => tone({ f: 520 * r, d: 0.5, v: 0.08, t })); noise({ ff: 3000, ff2: 8000, d: 0.5, v: 0.15, t: t + 0.05 }); tone({ f: 200, f2: 2000, d: 0.4, v: 0.1, type: 'sawtooth', filter: 'bandpass', ff: 1500, t: t + 0.05 }); },
    tiffin() { const t = A.ctx.currentTime; [1, 2.4, 3.9, 5.3].forEach((r, i) => tone({ f: 780 * r, d: 0.25 - i * 0.04, v: 0.08, t })); },
    matka() { noise({ ff: 500, ff2: 150, d: 0.25, v: 0.35, filter: 'lowpass' }); tone({ f: 180, f2: 90, d: 0.15, v: 0.2 }); },
    jelly() { noise({ ff: 900, ff2: 300, d: 0.12, v: 0.2, q: 4 }); },
    fog() { noise({ ff: 300, ff2: 1200, d: 0.4, v: 0.12, q: 2 }); },
    hammer() { tone({ f: 150, f2: 60, d: 0.2, v: 0.5 }); noise({ ff: 2000, d: 0.1, v: 0.3 }); },
    boss() { tone({ f: 70, f2: 40, d: 0.5, v: 0.6 }); },
    star(i) { tone({ f: bhup(5 + i * 2), d: 0.6, v: 0.18 }); tone({ f: bhup(5 + i * 2) * 2, d: 0.3, v: 0.05 }); },
    coin(i) { const t = A.ctx.currentTime; tone({ f: 1800 + (i || 0) * 60, d: 0.08, v: 0.08, type: 'square', filter: 'highpass', ff: 1500, t }); tone({ f: 2700 + (i || 0) * 60, d: 0.15, v: 0.06, type: 'square', filter: 'highpass', ff: 1500, t: t + 0.06 }); },
    life() { const t = A.ctx.currentTime; tone({ f: 80, d: 0.12, v: 0.4, t }); tone({ f: 80, d: 0.15, v: 0.3, t: t + 0.18 }); },
    heartbeat() { const t = A.ctx.currentTime; tone({ f: 60, d: 0.1, v: 0.35, t }); tone({ f: 60, d: 0.12, v: 0.25, t: t + 0.15 }); },
    ingredient() { const t = A.ctx.currentTime; [0, 2, 4, 5].forEach(i => tone({ f: bhup(i + 3), d: 0.25, v: 0.12, t: t + i * 0.07 })); },
    win() {
      const t = A.ctx.currentTime;
      const mel = [0, 2, 4, 7, 9, 7, 12];
      mel.forEach((m, i) => shehnai(t + i * 0.16, mtof(67 + m), i === mel.length - 1 ? 0.9 : 0.16));
      for (let i = 0; i < 8; i++) tabla(t + i * 0.16, i % 2 ? 'na' : 'dha', A.sfx, 0.6);
    },
    lose() { const t = A.ctx.currentTime; [7, 4, 2, 0].forEach((m, i) => tone({ f: mtof(64 + m), d: 0.35, v: 0.15, type: 'triangle', t: t + i * 0.22 })); },
    whoosh() { noise({ ff: 300, ff2: 2500, d: 0.35, v: 0.12 }); },
    unlock() { const t = A.ctx.currentTime; tone({ f: 900, d: 0.06, v: 0.15, type: 'square', filter: 'lowpass', ff: 2000, t }); tone({ f: 1400, d: 0.3, v: 0.12, t: t + 0.08 }); }
  };

  function shehnai(t, f, d) {
    tone({ t, f, d, v: 0.12, a: 0.02, type: 'sawtooth', filter: 'bandpass', ff: 1400, q: 2, vib: 6 });
    tone({ t, f: f * 2, d, v: 0.03, a: 0.02, type: 'square', filter: 'bandpass', ff: 2200, q: 3 });
  }

  // tabla bols
  function tabla(t, bol, out, vol) {
    vol = vol || 1; out = out || A.music;
    if (bol === 'dha' || bol === 'ge' || bol === 'dhin') {
      tone({ t, f: 120, f2: bol === 'ge' ? 70 : 160, slide: 0.12, d: 0.35, v: 0.45 * vol, out });
    }
    if (bol === 'na' || bol === 'ta' || bol === 'dha' || bol === 'tin' || bol === 'dhin') {
      tone({ t, f: 520, d: 0.18, v: 0.16 * vol, out, type: 'sine' });
      tone({ t, f: 520 * 2.9, d: 0.06, v: 0.05 * vol, out });
      noise({ t, ff: 3500, d: 0.03, v: 0.06 * vol, out, q: 2 });
    }
    if (bol === 'ka') noise({ t, ff: 800, d: 0.05, v: 0.12 * vol, out, filter: 'lowpass' });
  }

  // instrument voices for melody
  function inst(name, t, f, d) {
    const out = A.music;
    switch (name) {
      case 'bansuri': tone({ t, f, d: d * 1.2, a: 0.06, v: 0.14, vib: 5, out }); noise({ t, ff: f * 2, d: 0.08, v: 0.02, q: 6, out }); break;
      case 'santoor': for (let i = 0; i < 3; i++) tone({ t: t + i * 0.06, f, d: 0.4, v: 0.1 - i * 0.025, type: 'triangle', out }); break;
      case 'harmonium': tone({ t, f, d, a: 0.04, v: 0.07, type: 'square', filter: 'lowpass', ff: 1400, out }); tone({ t, f: f * 2, d, a: 0.04, v: 0.03, type: 'sawtooth', filter: 'lowpass', ff: 1800, out }); break;
      case 'tumbi': tone({ t, f: f * 2, d: 0.18, v: 0.12, type: 'sawtooth', filter: 'bandpass', ff: 1800, q: 4, out }); break;
      case 'veena': tone({ t, f: f * 0.98, f2: f, slide: 0.06, d: 0.7, v: 0.13, type: 'triangle', out }); break;
      case 'sarangi': tone({ t, f, d: d * 1.3, a: 0.08, v: 0.1, type: 'sawtooth', filter: 'bandpass', ff: 1200, q: 2, vib: 5.5, out }); break;
      case 'ektara': tone({ t, f: f * 2, f2: f * 1.97, slide: 0.2, d: 0.3, v: 0.12, type: 'triangle', out }); break;
      case 'sitar': tone({ t, f: f * 0.97, f2: f, slide: 0.05, d: 0.9, v: 0.1, type: 'sawtooth', filter: 'bandpass', ff: 2400, q: 6, out }); tone({ t, f: f * 3, d: 0.4, v: 0.02, out }); break;
      case 'orchestra': tone({ t, f, d: d * 1.4, a: 0.05, v: 0.08, type: 'sawtooth', filter: 'lowpass', ff: 2000, vib: 5, out }); tone({ t, f: f * 1.5, d: d * 1.4, a: 0.05, v: 0.05, type: 'triangle', out }); break;
      default: tone({ t, f, d, v: 0.12, out });
    }
  }

  // 16-step patterns (teentaal-ish & bhangra-ish)
  const THEKA = ['dha', '', 'dhin', '', 'dhin', '', 'dha', 'ka', 'dha', '', 'dhin', '', 'dhin', '', 'dha', 'na',
    'dha', '', 'tin', '', 'tin', '', 'ta', 'ka', 'ta', '', 'dhin', '', 'dhin', '', 'dha', 'na'];
  const BHANGRA = ['dha', '', 'na', 'dha', '', 'na', 'dha', '', 'dha', '', 'na', 'dha', '', 'na', 'ge', 'na'];

  let melodyIdx = 0, phrase = [];
  function newPhrase(W) {
    phrase = [];
    let i = melodyIdx;
    for (let k = 0; k < 8; k++) {
      i = Math.max(0, Math.min(9, i + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      phrase.push(Math.random() < 0.25 ? null : i);
    }
    melodyIdx = i;
  }

  function schedule() {
    if (!A.ctx || !A.playing) return;
    const W = A.world;
    const spb = 60 / (W.bpm * A.tempoMul) / 2; // eighth notes
    while (A.nextTime < A.ctx.currentTime + 0.25) {
      const s = A.step, t = A.nextTime;
      const pat = W.inst === 'tumbi' ? BHANGRA : THEKA;
      const bol = pat[s % pat.length];
      if (bol && !A.menu) tabla(t, bol, A.music, 0.55);
      else if (bol && A.menu && s % 4 === 0) tabla(t, bol, A.music, 0.35);
      // tanpura drone every 2 bars: Pa Sa Sa Sa(low)
      if (s % 32 === 0) {
        const root = W.root;
        [7, 12, 12, 0].forEach((m, i) => tone({ t: t + i * spb * 4, f: mtof(root + m), d: 3.2, a: 0.08, v: 0.045, type: 'sawtooth', filter: 'lowpass', ff: 900, out: A.music }));
      }
      // melody: plays on quarter notes; more notes when energy is high (cascades)
      if (s % 16 === 0) newPhrase(W);
      const dense = A.energy > 0.3 || A.menu;
      if (s % 2 === 0 || (dense && Math.random() < 0.5)) {
        const n = phrase[(s >> 1) % 8];
        if (n != null && (s % 4 === 0 || dense)) {
          const sc = W.scale, deg = sc[n % sc.length] + 12 * Math.floor(n / sc.length);
          inst(W.inst, t, mtof(W.root + 12 + deg), spb * 2);
        }
      }
      A.energy *= 0.97;
      A.step++;
      A.nextTime += spb;
    }
  }

  A.playWorld = function (W, menu) {
    A.pendingWorld = W; A.pendingMenu = menu;
    if (!A.ctx) return;
    A.world = W; A.menu = !!menu; A.tempoMul = 1;
    if (!A.playing) { A.playing = true; A.step = 0; A.nextTime = A.ctx.currentTime + 0.1; A.timer = setInterval(schedule, 60); }
  };
  A.stopMusic = function () { A.playing = false; clearInterval(A.timer); };
  A.setUrgent = function (on) { A.tempoMul = on ? 1.1 : 1; };
  A.bump = function (x) { A.energy = Math.min(1, A.energy + x); };

  A.play = function (name, arg) {
    if (!A.ctx || !A.sfxOn) return;
    try { S[name] && S[name](arg); } catch (e) { /* ignore */ }
  };

  // Optional Hindi TTS for praise (real voice recordings should replace this)
  A.say = function (text) {
    if (!A.voiceOn || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'hi-IN'; u.pitch = 1.3; u.rate = 1.05; u.volume = 0.9;
      const v = speechSynthesis.getVoices().find(v => /hi[-_]IN/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  };

  G.MM_AUDIO = A;
})(window);
