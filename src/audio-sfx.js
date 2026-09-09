// audio-sfx.js — 8-bit retro sound effects for Seven Falls (Web Audio API only)
const SFX = (() => {
  let actx = null;
  let master = null;
  let volume = 0.5;

  function init() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = volume;
    master.connect(actx.destination);
  }

  function tone(freq, start, dur, type, gainPeak) {
    const t0 = actx.currentTime + start;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gainPeak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(start, dur, gainPeak) {
    const t0 = actx.currentTime + start;
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    g.gain.setValueAtTime(gainPeak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(master);
    src.start(t0);
  }

  const sounds = {
    select() { tone(660, 0, 0.08, 'square', 0.25); },
    verse() {
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.06, 0.12, 'triangle', 0.22));
    },
    hit() {
      noise(0, 0.12, 0.3);
      tone(300, 0, 0.1, 'square', 0.2);
      tone(120, 0.02, 0.12, 'square', 0.2);
    },
    crit() {
      tone(988, 0, 0.06, 'square', 0.25);
      tone(1319, 0.06, 0.12, 'square', 0.25);
    },
    heal() {
      tone(440, 0, 0.18, 'sine', 0.2);
      tone(660, 0.1, 0.18, 'sine', 0.2);
    },
    shield() {
      tone(880, 0, 0.1, 'square', 0.2);
      tone(1175, 0.05, 0.14, 'square', 0.18);
    },
    death() {
      [440, 392, 349, 294].forEach((f, i) => tone(f, i * 0.08, 0.16, 'triangle', 0.25));
    },
    victory() {
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.22, 'square', 0.25));
    },
    item() {
      tone(988, 0, 0.05, 'square', 0.22);
      tone(1319, 0.05, 0.12, 'square', 0.22);
    },
    levelup() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.05, 0.1, 'triangle', 0.22));
    },
    click() { tone(880, 0, 0.03, 'square', 0.15); },
    error() { tone(110, 0, 0.18, 'square', 0.25); },
    combo() {
      tone(784, 0, 0.05, 'square', 0.22);
      tone(1175, 0.05, 0.1, 'square', 0.22);
    },
    ultimate() {
      [262, 330, 392, 523].forEach((f, i) => tone(f, i * 0.02, 0.45, 'sawtooth', 0.2));
      tone(784, 0.02, 0.45, 'triangle', 0.18);
    },
    boss() {
      tone(110, 0, 0.4, 'sawtooth', 0.28);
      tone(116, 0.02, 0.4, 'square', 0.15);
    },
  };

  return {
    init,
    play(name) {
      if (SFX.muted) return;
      init();
      if (actx.state === 'suspended') actx.resume();
      (sounds[name] || (() => {}))();
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
    setMuted(b) { SFX.muted = !!b; },
    muted: false,
  };
})();
// Exposes global SFX: init(), play(name), setVolume(v), setMuted(b), muted
