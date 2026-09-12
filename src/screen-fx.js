// screen-fx.js — Seven Falls standalone screen-effects module.
// Fade transitions, dungeon-crawl walk, and boss intro card.
// Depends on index.html globals: ctx,W,H,S,C,rect,text,setFont,
// wrapText,drawWarriorSprite,drawDemonSprite32,TIER_NAMES,TIER_COLORS.

const ScreenFX = {
  // ---- Fade ----------------------------------------------------------------
  fadeAlpha: 0,
  _fadeColor: '#000',
  _fadeT: 0,
  _fadeDur: 0,
  _fadeMid: false,
  _fadeOnMid: null,
  _fadeOnDone: null,

  fadeTo(color, dur, onMid, onDone) {
    this._fadeColor = color || '#000';
    this._fadeDur = Math.max(0.0001, dur || 1);
    this._fadeT = 0;
    this.fadeAlpha = 0;
    this._fadeMid = false;
    this._fadeOnMid = onMid || null;
    this._fadeOnDone = onDone || null;
  },

  // ---- Crawl ---------------------------------------------------------------
  crawl: null,

  startCrawl(node, onDone) {
    this.crawl = { t: 0, dur: 1.6, node: node || null, onDone: onDone || null };
  },

  // ---- Boss intro ----------------------------------------------------------
  bossIntro: null,

  startBossIntro(demon, onDone) {
    this.bossIntro = { t: 0, dur: 2.2, demon: demon || {}, onDone: onDone || null };
  },

  // ---- Update --------------------------------------------------------------
  update(dt) {
    // Fade
    if (this._fadeDur > 0) {
      this._fadeT += dt;
      const half = this._fadeDur / 2;
      if (this._fadeT < half) {
        this.fadeAlpha = this._fadeT / half;
      } else if (this._fadeT < this._fadeDur) {
        this.fadeAlpha = 1 - (this._fadeT - half) / half;
      } else {
        this.fadeAlpha = 0;
        this._fadeDur = 0;
        if (this._fadeOnDone) { const cb = this._fadeOnDone; this._fadeOnDone = null; cb(); }
      }
      if (!this._fadeMid && this._fadeT >= half) {
        this._fadeMid = true;
        if (this._fadeOnMid) this._fadeOnMid();
      }
    }

    // Crawl
    if (this.crawl) {
      this.crawl.t += dt;
      if (this.crawl.t >= this.crawl.dur) {
        const cb = this.crawl.onDone;
        this.crawl = null;
        if (cb) cb();
      }
    }

    // Boss intro
    if (this.bossIntro) {
      this.bossIntro.t += dt;
      if (this.bossIntro.t >= this.bossIntro.dur) {
        const cb = this.bossIntro.onDone;
        this.bossIntro = null;
        if (cb) cb();
      }
    }
  },

  // ---- Render --------------------------------------------------------------
  render() {
    if (this.fadeAlpha > 0.001 && this._fadeColor) {
      rect(0, 0, W, H, this._fadeColor, this.fadeAlpha);
    }
  },

  renderCrawl() {
    if (!this.crawl) return;
    const p = Math.min(1, this.crawl.t / this.crawl.dur);

    // Corridor: dark stone with a warm pool of torchlight down the middle.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#08070f'); g.addColorStop(0.5, '#141227'); g.addColorStop(1, '#08070f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const tile = 24, horizon = 74, base = H - 46;
    // Floor and ceiling slabs recede toward the middle of the screen.
    for (let r = 0; r < 7; r++) {
      const t = r / 6;
      const yTop = horizon + Math.pow(t, 1.8) * (base - horizon);
      const yBot = horizon + Math.pow((r + 1) / 6, 1.8) * (base - horizon);
      const shade = r % 2 ? '#191632' : '#141126';
      rect(0, yTop, W, yBot - yTop + 1, shade);
      rect(0, H - yBot, W, yBot - yTop + 1, r % 2 ? '#100e1e' : '#0c0b17');
    }
    // Wall blocks left/right of the corridor mouth
    for (let x = 0; x < W; x += tile) {
      const h1 = 10 + ((x * 7919) % 5);
      rect(x, horizon - h1, tile - 1, h1, (x / tile) % 2 ? '#1d1936' : '#181430');
    }
    rect(0, horizon - 1, W, 2, '#2a2450');       // corridor lip
    rect(0, H - horizon + 1, W, 2, '#2a2450');

    // Torches: bracket + flame + the light each one throws on the floor.
    const flick = 0.62 + 0.38 * Math.abs(Math.sin(this.crawl.t * 9));
    for (let x = 56; x < W; x += 104) {
      const fy = horizon - 6;
      const lg = ctx.createRadialGradient(x, fy + 30, 2, x, fy + 30, 58);
      lg.addColorStop(0, 'rgba(255,170,70,' + (0.34 * flick) + ')');
      lg.addColorStop(1, 'rgba(255,170,70,0)');
      ctx.fillStyle = lg; ctx.fillRect(x - 60, fy - 20, 120, 110);
      rect(x - 5, fy - 12, 10, 9, '#ffd27a', 0.25 * flick);
      rect(x - 2, fy - 4, 4, 10, C.stoneDark);
      rect(x - 4, fy - 12, 8, 9, C.gold, flick);
      rect(x - 3, fy - 16, 6, 5, '#ffe9a8', 0.5 + 0.5 * flick);
    }
    // Dust motes drifting toward the far end
    for (let i = 0; i < 22; i++) {
      const t = (this.crawl.t * (0.10 + (i % 5) * 0.03) + i * 0.37) % 1;
      const dx = (i * 53) % W;
      const dy = horizon + 8 + ((i * 17) % (base - horizon - 10));
      rect(dx + t * 6, dy, 1, 1, '#cbb98d', 0.10 + 0.22 * Math.sin(t * Math.PI));
    }

    // The hero walks at 2x so every art pixel lands on a 4-device-px grid at RS=2.
    const wx = 30 + (W - 60) * p;
    const wy = H / 2 + 22;
    const bob = Math.sin(this.crawl.t * 7) * 1.5;
    // brick courses give the floor a material read instead of flat checker
    for (let r = 0; r < 6; r++) {
      const yb = horizon + 6 + r * 12;
      for (let bx = -((r % 2) * 12); bx < W; bx += 24) {
        rect(bx, yb, 22, 10, r % 2 ? '#191634' : '#1e1a3a');
        rect(bx, yb + 10, 24, 2, 'rgba(0,0,0,0.45)');
      }
    }
    ctx.save();
    ctx.translate(wx, wy + bob);
    ctx.scale(2, 2);
    // 0.5 because this block runs inside a 2x transform: keeps the crawl hero the
    // same on-screen size it has always been.
    drawWarriorSprite(0, 0, Math.sin(this.crawl.t * 6) * 0.5 + 0.5, 0.5);
    ctx.restore();
    drawShadow(wx, wy + 18 + bob, 2.1);

    // Fog rolling over the far end of the corridor
    const fog = ctx.createLinearGradient(0, horizon - 20, 0, horizon + 46);
    fog.addColorStop(0, 'rgba(10,9,20,0.85)');
    fog.addColorStop(1, 'rgba(10,9,20,0)');
    ctx.fillStyle = fog; ctx.fillRect(0, horizon - 20, W, 66);
  },

  renderBossIntro() {
    if (!this.bossIntro) return;
    const b = this.bossIntro;
    const p = Math.min(1, b.t / b.dur);
    const d = b.demon;
    const tier = d.tier || 1;
    const tierName = (typeof TIER_NAMES !== 'undefined' && TIER_NAMES[tier]) || ('TIER ' + tier);
    const tierCol = (typeof TIER_COLORS !== 'undefined' && TIER_COLORS[tier]) || C.red;

    rect(0, 0, W, H, '#07060e');
    // Blood-red glow blooming behind the guardian
    const glow = ctx.createRadialGradient(W / 2, 116, 8, W / 2, 116, 140);
    glow.addColorStop(0, 'rgba(190,40,50,' + (0.34 * p) + ')');
    glow.addColorStop(1, 'rgba(190,40,50,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // Card frame with corner brackets
    const pad = 14;
    rect(pad, pad, W - pad * 2, H - pad * 2, '#0d0b18', 0.92);
    ctx.strokeStyle = 'rgba(150,130,220,0.28)'; ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, pad + 0.5, W - pad * 2 - 1, H - pad * 2 - 1);
    const bl = 12;
    ctx.fillStyle = C.gold;
    ctx.fillRect(pad, pad, bl, 2); ctx.fillRect(pad, pad, 2, bl);
    ctx.fillRect(W - pad - bl, pad, bl, 2); ctx.fillRect(W - pad - 2, pad, 2, bl);
    ctx.fillRect(pad, H - pad - 2, bl, 2); ctx.fillRect(pad, H - pad - bl, 2, bl);
    ctx.fillRect(W - pad - bl, H - pad - 2, bl, 2);
    ctx.fillRect(W - pad - 2, H - pad - bl, 2, bl);

    setFont(7);
    text('FLOOR GUARDIAN', W / 2, pad + 10, C.dim, 7, 'center');

    // The real atlas sprite, sliding up into the frame, at 3x art scale
    const slide = (1 - p) * 26;
    const scale = 3;
    const cx = W / 2, cy = 128 + slide;
    // Lit dais: the guardian stands IN a pool of light, so a dark sprite still reads.
    const dais = ctx.createRadialGradient(cx, cy + 26, 6, cx, cy + 26, 118);
    dais.addColorStop(0, 'rgba(255,214,170,' + (0.30 * p) + ')');
    dais.addColorStop(0.45, 'rgba(150,90,80,' + (0.14 * p) + ')');
    dais.addColorStop(1, 'rgba(20,10,20,0)');
    ctx.fillStyle = dais; ctx.fillRect(cx - 130, cy - 70, 260, 210);
    for (let i = 1; i <= 3; i++) {
      const rr = 62 + i * 9;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 34, rr, rr * 0.28, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,190,150,' + (0.10 - i * 0.02) * p + ')';
      ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, p * 2.2);
    drawDemonAny(cx, cy, d, Math.sin(b.t * 2.4) * 2, scale, 'rgba(255,205,150,0.95)');
    ctx.restore();
    drawShadow(cx, cy + 34, 4.6);

    // Name: shrink to fit rather than clip, so no guardian ships as "Lying Spir…"
    let size = 15;
    const name = String(d.name || 'DEMON');
    ctx.textAlign = 'center';
    while (size > 7) {
      setFont(size);
      if (ctx.measureText(name).width <= W - 60) break;
      size -= 1;
    }
    text(name, W / 2, 210, C.gold, size, 'center');

    const sinName = d.sin || d.type || 'UNKNOWN';
    text(tierName + ' - ' + sinName, W / 2, 234, tierCol, 8, 'center');
    if (d.hp || d.maxHp) {
      const hp = d.maxHp || d.hp;
      text('HP ' + hp, W / 2, 248, C.dim, 7, 'center');
      bar(W / 2 - 70, 260, 140, 6, 1, tierCol);
    }
    text('PRESS TO CONTINUE', W / 2, H - 26, 'rgba(180,170,220,0.55)', 6, 'center');
  },
};

// global ScreenFX — fade transitions, dungeon-crawl walk, boss intro card.
