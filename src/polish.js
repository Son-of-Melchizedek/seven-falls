// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Polish / game feel
// One small layer that makes the same game read as a smooth, premium
// product instead of a series of hard cuts:
//   · screen crossfades on every state change
//   · HP bars that drain instead of teleporting
//   · floating damage numbers
//   · impact shake + flash on real hits
//   · press feedback on every canvas button
//   · a breathing hero, and music that crossfades instead of cutting
// Everything here is additive: if this file fails to load, the game still runs.
// ═══════════════════════════════════════════════════════════════
const Polish = (function(){
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    outQuad:  t => 1 - (1 - t) * (1 - t),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack:  t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  };
  // map a value from one range to another, clamped
  const norm = (v, a, b) => clamp((v - a) / (b - a), 0, 1);

  let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const pops = [];          // floating damage numbers
  const presses = [];       // button press ripples
  const bars = {};          // key -> displayed fraction (for the drain lerp)
  let shakeAmp = 0, shakeT = 0;
  let flashA = 0, flashColor = '#fff';
  let lastState = null;
  let heroBob = 0;
  let lastDt = 1 / 60;

  // ── damage numbers ────────────────────────────────────────────
  // The draw helpers report their coordinates each frame, so a number always
  // lands on the sprite no matter how the screen layout shifts.
  const where = {};
  function notePos(who, x, y){ where[who] = { x: x, y: y }; }
  function hit(who, amount, color, opts){
    const at = where[who] || { x: who === 'hero' ? 48 : 312, y: who === 'hero' ? 84 : 62 };
    amount = Math.round(amount);
    if (!isFinite(amount) || amount <= 0) return;
    const big = (opts && opts.big) || amount >= 12;
    pops.push({ x: at.x, y: at.y - 14, v: amount, c: color || '#ffd76a', t: 0,
                dur: big ? 1.15 : 0.85, big: big,
                dx: (Math.random() - 0.5) * 10, label: (opts && opts.label) || null });
    if (big) shake(2.6, 0.22);
    flash(color || '#ffffff', big ? 0.20 : 0.10);
  }

  // ── impact ────────────────────────────────────────────────────
  function shake(amp, dur){ shakeAmp = Math.max(shakeAmp, amp); shakeT = Math.max(shakeT, dur); }
  function flash(color, a){ flashColor = color; flashA = Math.max(flashA, a); }
  function shakeOffset(){
    if (shakeT <= 0) return { x: 0, y: 0 };
    const k = ease.outCubic(clamp(shakeT / 0.22, 0, 1)) * shakeAmp;
    return { x: Math.sin(shakeT * 90) * k, y: Math.cos(shakeT * 71) * k * 0.6 };
  }

  // ── HP drain ──────────────────────────────────────────────────
  // key: any string (one per bar). real is the true fraction.
  function hpFrac(key, real){
    const dt = lastDt;
    const cur = (key in bars) ? bars[key] : real;
    // snap on a heal or a new fight, drain smoothly when taking damage
    const speed = real > cur ? 6 : 2.6;
    const next = Math.abs(real - cur) < 0.002 ? real : cur + (real - cur) * clamp(speed * dt, 0, 1);
    bars[key] = next;
    return clamp(next, 0, 1);
  }
  function resetBars(){ for (const k of Object.keys(bars)) delete bars[k]; }

  // ── button press feedback ─────────────────────────────────────
  function onPress(e){
    try {
      if (typeof clickables === 'undefined' || !clickables.length || typeof toCanvas !== 'function') return;
      const p = toCanvas(e);
      for (let i = clickables.length - 1; i >= 0; i--){
        const c = clickables[i];
        if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h){
          presses.push({ x: c.x, y: c.y, w: c.w, h: c.h, t: 0, dur: 0.26 });
          break;
        }
      }
    } catch (_) { /* feedback is never worth a broken input */ }
  }

  // ── music crossfade ───────────────────────────────────────────
  function installMusicFade(){
    if (typeof MusicEngine === 'undefined' || MusicEngine.__polished) return;
    const orig = MusicEngine.playTrack;
    let fadeTimers = [];
    MusicEngine.playTrack = function(name){
      fadeTimers.forEach(clearInterval);
      fadeTimers = [];
      const from = MusicEngine.getVolume ? MusicEngine.getVolume() : 1;
      let v = from;
      const down = setInterval(() => {
        v -= from / 5;
        if (v <= 0.02){
          clearInterval(down);
          try { orig.call(MusicEngine, name); } catch (_) {}
          let up = 0.02;
          const rise = setInterval(() => {
            up += 1 / 5;
            MusicEngine.setVolume(Math.min(1, up));
            if (up >= 1) clearInterval(rise);
          }, 40);
          fadeTimers.push(rise);
        } else {
          MusicEngine.setVolume(v);
        }
      }, 40);
      fadeTimers.push(down);
    };
    MusicEngine.__polished = true;
  }

  // ── breathing hero ────────────────────────────────────────────
  function installHeroBob(){
    if (typeof SpriteStates === 'undefined' || SpriteStates.__bobbed) return;
    const orig = SpriteStates.drawHero;
    SpriteStates.drawHero = function(cx, cy, st, scale){
      const state = st && st.state;
      // breathe when idle, and settle rather than float during impact poses
      const amp = (state === 'idle' || state === 'pray' || !state) ? 1 : 0.35;
      const bob = Math.sin(heroBob * 2.1) * amp;
      orig.call(SpriteStates, cx, cy + bob, st, scale);
    };
    SpriteStates.__bobbed = true;
  }

  // ── per-frame ─────────────────────────────────────────────────
  function frame(){
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    lastDt = dt;
    heroBob += dt;

    let changed = false;
    if (shakeT > 0){ shakeT = Math.max(0, shakeT - dt); if (shakeT === 0) shakeAmp = 0; changed = true; }
    if (flashA > 0){ flashA = Math.max(0, flashA - dt * 2.4); changed = true; }
    for (let i = pops.length - 1; i >= 0; i--){ pops[i].t += dt; if (pops[i].t >= pops[i].dur) pops.splice(i, 1); changed = true; }
    for (let i = presses.length - 1; i >= 0; i--){ presses[i].t += dt; if (presses[i].t >= presses[i].dur) presses.splice(i, 1); changed = true; }

    // crossfade every screen change so nothing cuts hard
    try {
      const st = (typeof game !== 'undefined' && game) ? game.state : null;
      if (st && lastState === null) lastState = st;
      else if (st && st !== lastState){
        lastState = st;
        if (typeof ScreenFX !== 'undefined' && ScreenFX.fadeTo) ScreenFX.fadeTo('#000', 0.30);
        if (st === 'COMBAT') resetBars();
        changed = true;
      }
    } catch (_) {}

    if (!changed && !pops.length) return;
    draw();
  }

  function draw(){
    if (typeof ctx === 'undefined' || !ctx) return;
    ctx.save();
    // impact flash, under the overlays
    if (flashA > 0){
      ctx.globalAlpha = flashA;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // press ripples on buttons
    for (const p of presses){
      const k = norm(p.t, 0, p.dur);
      ctx.globalAlpha = (1 - k) * 0.30;
      ctx.fillStyle = '#ffeaa8';
      ctx.fillRect(p.x, p.y - 1, p.w, p.h + 2);
      ctx.globalAlpha = 1;
    }
    // damage numbers rise, drift and fade
    for (const p of pops){
      const k = norm(p.t, 0, p.dur);
      const rise = ease.outCubic(k) * (p.big ? 20 : 13);
      const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const pop = k < 0.18 ? 1 + (0.18 - k) * 1.6 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.save();
      ctx.translate(Math.round(p.x + p.dx * k), Math.round(p.y - rise));
      ctx.scale(pop, pop);
      const txt = p.label || ('-' + p.v);
      ctx.font = 'bold ' + (p.big ? 11 : 9) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(txt, 1, 1);
      ctx.fillStyle = p.c;
      ctx.fillText(txt, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  return {
    frame, draw, hit, notePos, shake, flash, hpFrac, resetBars, ease,
    get shakeOffset(){ return shakeOffset(); },
    install(){ installMusicFade(); installHeroBob();
      document.addEventListener('pointerdown', onPress, true); },
    get active(){ return { pops: pops.length, presses: presses.length, flash: +flashA.toFixed(2), shake: +shakeT.toFixed(2) }; },
  };
})();

if (typeof window !== 'undefined') window.Polish = Polish;

// Install as soon as the game modules are present. Everything is optional: a
// missing SpriteStates/MusicEngine just means that one nicety is skipped.
if (typeof window !== 'undefined') {
  const install = () => { try { Polish.install(); } catch (e) { /* never block the game */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}
