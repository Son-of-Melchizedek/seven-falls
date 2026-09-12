// sprite-states.js — every sprite gets attack / defend / hit presentations.
//
// The art per demon is one cell; the state variants are pose rigs applied at draw
// time (lean, crouch, recoil, white hit-flash, lunge streaks, shield shimmer).
// That keeps the atlas at one cell per creature while the fight still reads:
// you can see who is swinging, who is guarding and who just took the blow.
//
// Depends on index.html globals: demonAtlas, DEMON_CELL_W/H.

const SpriteStates = (function(){
  const CACHE = {};                 // "idx|color|alpha" -> tinted 64x60 canvas
  const states = {};                // "hero" | "demon" -> {state, t, dur}
  const DUR = { idle: 0, attack: 0.42, defend: 0.6, hit: 0.34, cast: 0.7 };
  let heroImg = null;               // hero cell, cut from the atlas at boot
  // Cell geometry comes from index.html so art and renderer can never drift apart.
  const CW = (typeof HERO_CELL_W !== 'undefined') ? HERO_CELL_W : 64;
  const CH = (typeof HERO_CELL_H !== 'undefined') ? HERO_CELL_H : 60;
  let lastDraw = null;              // last applied pose (read by the QA harness)

  function set(who, state, dur){
    const d = dur || DUR[state] || 0.4;
    const cur = states[who];
    // An exchange happens inside one frame: the demon's counter would clobber the
    // player's lunge before it is ever drawn. Let a fresh state play out ~0.18s
    // before the next one takes the sprite, and queue the newcomer.
    if (cur && cur.dur > 0 && cur.t < 0.18){
      cur.queue = cur.queue || [];
      if (cur.queue.length < 2 && cur.state !== state) cur.queue.push({ state: state, dur: d });
      return;
    }
    states[who] = { state: state, t: 0, dur: d };
  }
  function get(who){
    const s = states[who];
    if (!s) return { state: 'idle', t: 0, u: 0 };
    const u = s.dur > 0 ? Math.min(1, s.t / s.dur) : 1;
    return { state: s.state, t: s.t, u: u };
  }
  function update(dt){
    for (const k in states){
      const s = states[k];
      s.t += dt;
      if (s.dur > 0 && s.t >= s.dur){
        const q = s.queue && s.queue.shift();
        if (q){ states[k] = { state: q.state, t: 0, dur: q.dur, queue: s.queue }; continue; }
        s.state = (s.state === 'hit' && s.defendAfter) ? 'defend' : 'idle';
        s.t = 0; s.dur = DUR[s.state] || 0; s.queue = null;
      }
    }
  }

  // White-washed copy of a cell, used for the getting-hit flash.
  function tintedCell(idx, color, alpha){
    const key = idx + '|' + color + '|' + alpha;
    if (CACHE[key]) return CACHE[key];
    const c = document.createElement('canvas');
    c.width = DEMON_CELL_W; c.height = DEMON_CELL_H;
    const g = c.getContext('2d');
    g.drawImage(demonAtlas, idx * DEMON_CELL_W, 0, DEMON_CELL_W, DEMON_CELL_H,
                0, 0, DEMON_CELL_W, DEMON_CELL_H);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = alpha; g.fillStyle = color;
    g.fillRect(0, 0, DEMON_CELL_W, DEMON_CELL_H);
    CACHE[key] = c;
    return c;
  }

  // Pose maths. u runs 0..1 over the state; every value is in logical pixels.
  function pose(st, sc){
    const u = st.u, out = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: 1, tint: 0 };
    const k = Math.sin(u * Math.PI);              // 0 -> 1 -> 0
    if (st.state === 'attack'){
      out.dx = 20 * k * (sc / 1.5);               // lunge at the enemy, hard
      out.dy = -8 * k * (sc / 1.5);
      out.sx = 1 + 0.16 * k;
      out.rot = -0.10 * k;
    } else if (st.state === 'defend'){
      out.dy = 5;                                 // plant and duck behind the shield
      out.sy = 0.86;
      out.sx = 1.10;
    } else if (st.state === 'hit'){
      out.dx = -16 * k * (sc / 1.5);              // knocked back
      out.dy = -4 * k;
      out.rot = 0.20 * k;
      out.tint = Math.max(0, 1 - u * 2.2);        // flash white, then fade
    } else if (st.state === 'cast'){
      out.dy = -6 * k;
      out.sy = 1 + 0.10 * k;
    } else {
      out.dy = Math.round(Math.sin(Date.now() / 420) * 1);   // idle breathing
    }
    return out;
  }

  // Draws one atlas cell with its pose applied. Mirrors drawDemonSpriteImg maths:
  // the cell bottom lands on cy+24 so the ground shadow stays under the feet.
  function drawCell(idx, cx, cy, sc, st){
    const p = pose(st, sc);
    const k = Math.sin(st.u * Math.PI);           // pose magnitude, same curve as pose()
    const u = st.u === undefined ? 1 : st.u;
    const w = DEMON_CELL_W * sc * p.sx, h = DEMON_CELL_H * sc * p.sy;
    const x = cx - w / 2 + p.dx, y = cy + 24 - h + p.dy;
    const img = p.tint > 0 ? tintedCell(idx, '#ffffff', p.tint) : demonAtlas;
    // Evidence hook for the test harness: what the renderer actually applied.
    lastDraw = { idx: idx, state: st.state, u: +st.u.toFixed(2), dx: +p.dx.toFixed(1),
                 dy: +p.dy.toFixed(1), sx: +p.sx.toFixed(2), tint: +p.tint.toFixed(2) };
    const sx = p.tint > 0 ? 0 : idx * DEMON_CELL_W;
    ctx.save();
    if (p.rot){
      ctx.translate(cx + p.dx, cy + 24 - h / 2 + p.dy);
      ctx.rotate(p.rot);
      ctx.drawImage(img, sx, 0, DEMON_CELL_W, DEMON_CELL_H, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(img, sx, 0, DEMON_CELL_W, DEMON_CELL_H, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    ctx.restore();
    if (st.state === 'attack'){                   // swing streaks + slash arc
      for (let i = 0; i < 4; i++){
        const yy = cy - 10 - i * 10;
        rect(cx + 10 + i * 4, yy, 20 - i * 4, 2, 'rgba(255,240,200,' + (0.75 - i * 0.16) * k + ')');
      }
      ctx.strokeStyle = 'rgba(255,236,180,' + (0.7 * k) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 6, cy - 2, 26 * k + 14, -1.0, 0.9);
      ctx.stroke();
    }
    if (st.state === 'defend'){                   // faith shield dome
      const a = 0.45 + 0.20 * Math.sin(Date.now() / 150);
      const rr = 20 * (sc / 1.5) + 14;
      const c2 = ctx.createRadialGradient(cx + p.dx, cy + 4, rr * 0.4, cx + p.dx, cy + 4, rr);
      c2.addColorStop(0, 'rgba(120,220,255,0)');
      c2.addColorStop(1, 'rgba(120,220,255,' + a + ')');
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(cx + p.dx, cy + 4, rr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(190,240,255,' + (a + 0.2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx + p.dx, cy + 4, rr, -1.25, 1.25); ctx.stroke();
    }
    if (st.state === 'hit'){                      // impact shards
      for (let i = 0; i < 5; i++){
        const ang = -0.9 + i * 0.45, d = 16 + 22 * k;
        rect(cx + Math.cos(ang) * d, cy - 4 + Math.sin(ang) * d, 2, 2,
             'rgba(255,255,255,' + (0.85 * (1 - u)) + ')');
      }
    }
  }

  // The hero sheet (six drawn poses) — preferred over the single-cell fallback.
  let heroSheet = null;
  function useHeroSheet(img){ heroSheet = img; }
  function heroCellIndex(state){
    const m = (typeof HERO_STATE_IDX !== 'undefined') ? HERO_STATE_IDX : null;
    return m && (state in m) ? m[state] : 0;
  }
  // The hero: the atlas cell picked for the player, cut at native cell size at boot.
  function initHero(cellIdx){
    const c = document.createElement('canvas');
    c.width = CW; c.height = CH;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;               // one-time resample, then crisp
    g.drawImage(demonAtlas, cellIdx * DEMON_CELL_W, 0, DEMON_CELL_W, DEMON_CELL_H, 0, 0, CW, CH);
    heroImg = c;
  }
  function drawHero(cx, cy, st, scale){
    const sheet = heroSheet;
    if (!heroImg && !sheet) return;
    const sc = (scale || 1) * 1.0;
    const p = pose(st, sc);
    const w = 32 * sc * p.sx, h = 30 * sc * p.sy;
    const sx = sheet ? heroCellIndex(st.state) * CW : 0;
    const flashing = p.tint > 0;
    const img = flashing ? tintedSmall(p.tint, sheet, sx) : (sheet || heroImg);
    const srcX = flashing ? 0 : sx;              // a tinted cell is already one cell wide
    ctx.save();
    if (p.rot){
      ctx.translate(cx + p.dx, cy - h / 2 + p.dy);
      ctx.rotate(p.rot);
      ctx.drawImage(img, srcX, 0, CW, CH, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(img, srcX, 0, CW, CH,
        Math.round(cx - w / 2 + p.dx), Math.round(cy - h + p.dy), Math.round(w), Math.round(h));
    }
    ctx.restore();
    if (st.state === 'defend'){                   // faith dome, so guard reads at hero size
      const a = 0.35 + 0.18 * Math.sin(Date.now() / 150);
      const g2 = ctx.createRadialGradient(cx, cy - 14, 8, cx, cy - 14, 30);
      g2.addColorStop(0, 'rgba(120,220,255,0)');
      g2.addColorStop(1, 'rgba(120,220,255,' + a + ')');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx, cy - 14, 30, 0, Math.PI * 2); ctx.fill();
    }
  }
  const SMALL = {};
  // White-flash copy of one hero cell. Takes the source image and the cell's x
  // offset so it works for both the sheet and the single-cell fallback.
  function tintedSmall(alpha, src, cellX){
    cellX = cellX || 0;
    const key = 'hero|' + Math.round(alpha * 4) + '|' + cellX;
    if (SMALL[key]) return SMALL[key];
    const c = document.createElement('canvas');
    c.width = CW; c.height = CH;
    const g = c.getContext('2d');
    const base = src || heroImg;
    if (!base) return null;
    g.drawImage(base, cellX, 0, CW, CH, 0, 0, CW, CH);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = Math.min(1, alpha * 1.4); g.fillStyle = '#ffffff';
    g.fillRect(0, 0, CW, CH);
    SMALL[key] = c;
    return c;
  }

  return { set, get, update, drawCell, drawHero, initHero, useHeroSheet, _states: states,
           get lastDraw(){ return lastDraw; } };
})();

if (typeof window !== 'undefined') window.SpriteStates = SpriteStates;
