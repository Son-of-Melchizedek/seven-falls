// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Advanced Combat Mechanics Layer
// Loaded AFTER index.html main script; shares the same global scope,
// so it can read/write global `combat`, `game`, `combat.demon`, etc.
// Ponytail: each mechanic is one small function; no abstractions.
// ═══════════════════════════════════════════════════════════════

const MECH = {
  // ── #16 FLOW STATE: 3 correct verses in a row → double damage, timer frozen ──
  flowActive: false,
  flowTimer: 0,
  checkFlow() {
    if (combat.correctStreak >= 3 && !this.flowActive) {
      this.flowActive = true;
      this.flowTimer = 6;
      game.goldFlash = 0.6;
      if (typeof SFX !== 'undefined') SFX.play('combo');
      combat.message = 'FLOW STATE! Verse power doubled — timer frozen.';
      combat.msgTimer = 2.0;
    }
  },
  tickFlow(dt) {
    if (this.flowActive) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) { this.flowActive = false; this.flowTimer = 0; }
    }
  },

  // ── #24 CRITICAL HITS: 15% chance, 2x damage ──
  rollCrit(dmg) {
    if (RNG.random() < 0.15) {
      if (typeof SFX !== 'undefined') SFX.play('crit');
      return { dmg: Math.floor(dmg * 2), crit: true };
    }
    return { dmg, crit: false };
  },

  // ── #23 VERSE FATIGUE: same type 3x in a row → 0.7x ──
  fatigueMult() {
    const last3 = (combat._typeHistory || []).slice(-3);
    if (last3.length === 3 && last3.every(t => t === last3[0])) return 0.7;
    return 1.0;
  },
  recordType(t) {
    combat._typeHistory = combat._typeHistory || [];
    combat._typeHistory.push(t);
    if (combat._typeHistory.length > 6) combat._typeHistory.shift();
  },

  // ── #20 SYNERGY: Praise+Wisdom in last 4 types → Holy Wisdom passive (+20% wisdom) ──
  synergyBonus(t) {
    const h = combat._typeHistory || [];
    const recent = h.slice(-4);
    if (t === 'wisdom' && recent.includes('praise') && recent.includes('wisdom')) {
      return 1.2;
    }
    return 1.0;
  },

  // ── #21 ENEMY SHIELD PHASES: some demons shielded — only DEFENSE verses damage ──
  isShielded() {
    return combat.demon._shieldPhase && combat.demon._shieldPhase > 0;
  },
  // Call after damage applied; returns true if the hit was blocked by shield
  applyShield(dmg, verse) {
    if (this.isShielded()) {
      const cat = verseCardType(verse);
      if (cat !== 'DEFENSE') {
        combat.demon._shieldPhase--;
        combat.message += '  ⟿ Shield absorbed! (' + combat.demon._shieldPhase + ' left)';
        return true; // blocked
      } else {
        combat.demon._shieldPhase = 0;
        combat.message += '  ⟿ Shield broken by faith!';
      }
    }
    return false;
  },

  // ── #41 BOSS PHASES: at 50% HP, boss changes form/weakness ──
  checkBossPhase() {
    const d = combat.demon;
    if (combat.isBoss && !combat._phase2 && d.hp <= d.maxHp * 0.5) {
      combat._phase2 = true;
      d.tier = Math.min((DEMON_TIER.FALLEN_ANGEL || 6), (d.tier || 1) + 2);
      const types = ['praise', 'wisdom', 'warfare', 'fire', 'mercy'];
      d.weakTo = types[Math.floor(RNG.random() * types.length)];
      if (typeof SFX !== 'undefined') SFX.play('boss');
      game.flash = 0.6;
      combat.message = d.name + ' TRANSFORMS! New weakness: ' + d.weakTo.toUpperCase() + ' verses';
      combat.msgTimer = 2.4;
      if (typeof spawnTypedParticles !== 'undefined') spawnTypedParticles(240, 30, 24, '#ffcc00');
    }
  },

  // ── #38 ENEMY EVOLUTION: survives N turns untouched → grows stronger ──
  evolveCheck() {
    const d = combat.demon;
    if (!combat._enemyTurns) combat._enemyTurns = 0;
    // only counts turns where player did NOT damage (tracked in resolveVerse via _lastDmgTurn)
    if (combat._enemyTurns >= 3 && !combat._evolved) {
      combat._evolved = true;
      d._enrage = (d._enrage || 0) + 0.3;
      combat.message += '  ⟿ The fiend grows stronger!';
      if (typeof spawnTypedParticles !== 'undefined') spawnTypedParticles(240, 30, 14, '#aa66cc');
    }
  },

  // ── #39 ELEMENTAL IMMUNITY CYCLES: weakness rotates every 2 turns ──
  cycleWeakness() {
    if (combat.demon._cycleWeak) {
      const types = ['praise', 'wisdom', 'warfare', 'fire', 'mercy'];
      combat._cycleTick = (combat._cycleTick || 0) + 1;
      if (combat._cycleTick % 2 === 0) {
        combat.demon.weakTo = types[Math.floor(RNG.random() * types.length)];
      }
    }
  },

  // ── #25 ENEMY IMMUNITIES: floor 7+ immune to one type ──
  isImmune(t) {
    return combat.demon._immuneTo && combat.demon._immuneTo === t;
  },

  // ── #43 ENVIRONMENTAL HAZARDS: fire floor / poison cloud ──
  hazardTick() {
    if (combat._hazard === 'fire') {
      const dmg = 5;
      game.hp -= dmg;
      game.hazardNote = 'Fire scorches you (-' + dmg + ' HP)! Use a PRAISE verse to quench.';
    } else if (combat._hazard === 'poison') {
      combat.maxTimer = Math.max(4, combat.maxTimer); // shrinks timer effectively
      game.hp -= 3;
      game.hazardNote = 'Poison clouds choke you (-3 HP)!';
    }
  },

  // ── #42 ENEMY STEALING: steals an item mid-fight ──
  trySteal() {
    if (combat.demon._canSteal && game.items && game.items.length && !combat._stolen && RNG.random() < 0.25) {
      combat._stolen = true;
      const idx = Math.floor(RNG.random() * game.items.length);
      const stolen = game.items.splice(idx, 1)[0];
      combat.twistTriggered.push(combat.demon.name + ' snatched your ' + (ITEM_DEFS[stolen] ? ITEM_DEFS[stolen].name : 'item') + '!');
    }
  },

  // ── Called at start of every combat from startCombat setup ──
  initEnemy(demon, floor) {
    // Shield phase on elites/bosses occasionally
    if ((combat.isElite || combat.isBoss) && RNG.random() < 0.5) {
      demon._shieldPhase = combat.isBoss ? 2 : 1;
    }
    // Boss/floor-7 immunity
    if (floor >= 7 || combat.isBoss) {
      const types = ['praise', 'wisdom', 'warfare', 'fire', 'mercy'];
      demon._immuneTo = types[Math.floor(RNG.random() * types.length)];
    }
    // Cycling weakness for fallen angels
    if (demon.tier >= (DEMON_TIER.FALLEN_ANGEL || 6)) demon._cycleWeak = true;
    // Hazard on certain floors
    if (floor === 4) combat._hazard = 'fire';
    else if (floor === 6) combat._hazard = 'poison';
    // Steal ability for greed-type
    if (demon.type === 'greed' || demon.sin === 'Greed') demon._canSteal = true;
  },
};

// Global convenience for index.html checks
function enemyImmuneTo(t) { return MECH.isImmune(t); }
function enemyShielded() { return MECH.isShielded(); }

// Expose
if (typeof window !== 'undefined') window.MECH = MECH;
