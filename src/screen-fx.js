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

    // Floor
    rect(0, 0, W, H, C.stoneDark);
    const tile = 24;
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        const shade = ((x + y) / tile) % 2 ? C.stone : C.stoneDark;
        rect(x, y, tile, tile, shade);
      }
    }

    // Corridor walls (top & bottom stone bands)
    rect(0, 0, W, 40, C.stone);
    rect(0, H - 40, W, 40, C.stone);
    rect(0, 38, W, 2, C.dim);
    rect(0, H - 40, W, 2, C.dim);

    // Torches with flicker
    const flick = 0.6 + 0.4 * Math.abs(Math.sin(this.crawl.t * 9));
    for (let x = 48; x < W; x += 96) {
      rect(x - 2, 30, 4, 12, C.stoneDark);
      rect(x - 3, 26, 6, 6, C.gold, flick);
      rect(x - 2, H - 42, 4, 12, C.stoneDark);
      rect(x - 3, H - 36, 6, 6, C.gold, flick);
    }

    // Warrior walking left -> right
    const wx = 24 + (W - 48) * p;
    const wy = H / 2;
    drawWarriorSprite(wx, wy, Math.sin(this.crawl.t * 6) * 0.5 + 0.5);
  },

  renderBossIntro() {
    if (!this.bossIntro) return;
    const b = this.bossIntro;
    const p = Math.min(1, b.t / b.dur);
    const d = b.demon;
    const tier = d.tier || 1;
    const tierName = (typeof TIER_NAMES !== 'undefined' && TIER_NAMES[tier]) ||
      ('TIER ' + tier);
    const tierCol = (typeof TIER_COLORS !== 'undefined' && TIER_COLORS[tier]) || C.red;
    const sinName = d.sin || d.type || 'UNKNOWN';

    // Dark card backdrop
    rect(0, 0, W, H, C.bg);
    const pad = 24;
    rect(pad, pad, W - pad * 2, H - pad * 2, C.bg, 0.92);
    rect(pad, pad, W - pad * 2, 3, C.gold);
    rect(pad, H - pad - 3, W - pad * 2, 3, C.gold);

    // FLOOR GUARDIAN subtitle
    setFont(8);
    text('FLOOR GUARDIAN', W / 2, H / 2 - 70, C.dim, 'center');

    // Pulsing demon sprite
    const pulse = 1 + 0.08 * Math.sin(b.t * 6);
    drawDemonSprite32(W / 2, H / 2 - 6, tierCol, Math.sin(b.t * 4) * 2);
    // subtle glow ring
    rect(W / 2 - 18 * pulse, H / 2 - 6 - 18 * pulse, 36 * pulse, 36 * pulse, tierCol, 0.06);

    // Demon name (gold, large)
    setFont(16);
    text(d.name || 'DEMON', W / 2, H / 2 + 44, C.gold, 'center');

    // Tier label (red)
    setFont(10);
    text(tierName + '  ·  ' + sinName, W / 2, H / 2 + 64, tierCol, 'center');

    // Vignette
    const vig = 0.5 * (1 - p * 0.6);
    rect(0, 0, W, 40, '#000', vig);
    rect(0, H - 40, W, 40, '#000', vig);
  }
};

// global ScreenFX — fade transitions, dungeon-crawl walk, boss intro card.
