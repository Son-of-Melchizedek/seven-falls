// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Demon AI
// Higher tiers do not merely hit harder: they fight differently.
//   T0 COMMON        telegraphed basics (feint, snarl)
//   T1 SQUAD         coordination (pack rushes, flanking, rallying)
//   T2 LEGION        multiplication (multi-hit, hexes, wards, drains)
//   T3 POWER         status pressure (fatigue, chains, mirrors, summons)
//   T4 PRINCIPALITY  territory + phase shifts (immunity rotation, devastation)
//   T5 FALLEN ANGEL  a signature move per named angel
//   T6 LUCIFER       scripted three-phase fight
// Player-side debuffs are read back by playerDamageMult(); the engine only
// has to call that one function on the damage line and takeTurn() on its turn.
// ═══════════════════════════════════════════════════════════════
const DemonAI = (function(){
  function rng(){ return (typeof RNG !== 'undefined' && RNG.random) ? RNG.random() : Math.random(); }
  function pick(a){ return a[Math.floor(rng() * a.length)]; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // Same attack curve the old single-attack AI used, so base difficulty holds.
  function baseAtk(c, g, full){
    let atk = 4 + (g.floor || 1) * 2 + ((c.demon && c.demon.tier) || 0) * 2;
    if (typeof AdaptiveDifficulty !== 'undefined' && AdaptiveDifficulty.getModifier){
      atk = Math.floor(atk * (0.6 + AdaptiveDifficulty.getModifier() * 0.4));
    }
    if (g.defenseBuff) atk = Math.max(1, atk - g.defenseBuff);
    if (!full) atk = Math.floor(atk * 0.5);
    return Math.max(1, atk);
  }

  function say(c, text){
    c.message = (c.message ? c.message + '  ' : '') + text;
    c.msgTimer = Math.max(c.msgTimer || 0, 1.9);
  }

  function apiFor(c, g, full){
    const a = {
      say: (t) => say(c, t),
      sfx: (n) => { if (typeof SFX !== 'undefined') SFX.play(n); },
      hero: (s) => { if (typeof SpriteStates !== 'undefined') SpriteStates.set('hero', s); },
      demon: (s) => { if (typeof SpriteStates !== 'undefined') SpriteStates.set('demon', s); },
      set: (k, v) => { c[k] = v; },
      add: (k, v) => { c[k] = (c[k] || 0) + v; },
      // one physical blow, multiplied by an active feint telegraph
      dmg(mult, opts){
        opts = opts || {};
        let d = Math.max(1, Math.round(baseAtk(c, g, full) * (mult || 1)));
        if (c._tel && (mult || 1) >= 1 && !opts.plain) d = Math.round(d * c._tel.mult);
        const absorbed = Math.min(g.shield || 0, d);
        g.shield = Math.max(0, (g.shield || 0) - absorbed);
        d -= absorbed;
        g.hp -= d;
        if (d > 0 && typeof SpriteStates !== 'undefined') SpriteStates.set('hero', 'hit');
        if (d > 0 && typeof Polish !== 'undefined') Polish.hit('hero', d, '#ff7a6b', { label: '-' + d });
        if (typeof SFX !== 'undefined') SFX.play(d > 0 ? 'hurt' : 'block');
        if (absorbed > 0) say(c, 'BLOCK ' + absorbed);
        return d;
      },
      heal(n){ c.demon.hp = Math.min(c.demon.maxHp || c.demon.hp + n, c.demon.hp + n); },
      shield(n){ if (typeof MECH !== 'undefined' && MECH.applyShield) MECH.applyShield(n); else g.__demonShield = (g.__demonShield || 0) + n; },
      spawn(n){
        c.adds = c.adds || [];
        for (let i = 0; i < (n || 1); i++) c.adds.push({ name: 'Lesser Thrall', hp: 12, maxHp: 12 });
      },
      cycle(){ if (typeof MECH !== 'undefined' && MECH.cycleWeakness) MECH.cycleWeakness(); },
    };
    return a;
  }

  // ── move table ────────────────────────────────────────────────
  // w = selection weight, cd = turns before it can repeat, t = tiers that know it
  const M = {
    // ── TIER 0: common demons ──
    claw:   { n: 'CLAW', w: 4, t: [0], run: (c, g, a) => { const d = a.dmg(1.0); a.say('Rakes you for ' + d + '.'); } },
    feint:  { n: 'FEINT', w: 2, cd: 4, t: [0], run: (c, g, a) => {
                a.dmg(0.4, { plain: true });
                a.set('_tel', { mult: 1.8, turns: 2 });
                a.say('It pulls back, coiling — the next blow will land hard.'); } },
    snarl:  { n: 'SNARL', w: 2, cd: 3, t: [0], run: (c, g, a) => {
                a.dmg(0.3, { plain: true }); a.set('_hex', { mult: 0.85, turns: 2 });
                a.say('Its snarl shakes your grip — your words land lighter.'); } },

    // ── TIER 1: squads ──
    packRush: { n: 'PACK RUSH', w: 4, cd: 2, t: [1], run: (c, g, a) => {
                let tot = 0; for (let i = 0; i < 2; i++) tot += a.dmg(0.6, { plain: true });
                a.say('They come in pairs — ' + tot + ' total.'); } },
    flank:  { n: 'FLANK', w: 3, cd: 3, t: [1], run: (c, g, a) => {
                const d = a.dmg(0.8);
                a.cycle();
                a.say('Struck from the flank for ' + d + ' — and your weakness shifts!'); } },
    rally:  { n: 'RALLY', w: 2, cd: 3, t: [1], run: (c, g, a) => {
                a.heal(Math.round((c.demon.maxHp || 30) * 0.08)); a.shield(6);
                a.say('The squad closes ranks and binds its wounds.'); } },

    // ── TIER 2: legions ──
    rend:   { n: 'REND', w: 4, cd: 2, t: [2], run: (c, g, a) => {
                let tot = 0; for (let i = 0; i < 3; i++) tot += a.dmg(0.5, { plain: true });
                a.say('Three claws find you — ' + tot + ' total.'); } },
    hex:    { n: 'HEX', w: 3, cd: 3, t: [2, 3], run: (c, g, a) => {
                a.dmg(0.5, { plain: true });
                const types = ['wisdom', 'praise', 'mercy', 'warfare', 'faith'];
                a.set('_lockType', { type: pick(types), turns: 2 });
                a.say('It hexes a whole kind of scripture — ' + c._lockType.type.toUpperCase() + ' words turn to ash.'); } },
    ward:   { n: 'WARD', w: 2, cd: 3, t: [2], run: (c, g, a) => {
                a.shield(14); a.say('A black ward drinks the light around it.'); } },
    drain:  { n: 'DRAIN', w: 3, cd: 2, t: [2, 3], run: (c, g, a) => {
                const d = a.dmg(0.9);
                a.heal(Math.round(d * 0.6));
                a.say('It drains ' + d + ' and grows fatter on it.'); } },
    // ── TIER 3: powers ──
    oppressiveGaze: { n: 'OPPRESSIVE GAZE', w: 3, cd: 3, t: [3], pose: 'cast', run: (c, g, a) => {
                a.dmg(0.5, { plain: true }); a.set('_fatigue', { add: 1, turns: 3 });
                a.sfx('fear');
                a.say('Its gaze makes every verse cost more than it should.'); } },
    comboChain: { n: 'COMBO CHAIN', w: 3, cd: 3, t: [3], run: (c, g, a) => {
                const d = a.dmg(1.0); a.set('_follow', 1.4);
                a.say('It strikes for ' + d + ' — and is already winding up again.'); } },
    mirrorVeil: { n: 'MIRROR VEIL', w: 2, cd: 4, t: [3], pose: 'cast', run: (c, g, a) => {
                a.dmg(0.4, { plain: true }); a.set('_reflect', { mult: 0.5, turns: 2 });
                a.say('A veil of glass hangs between you — your next verse may be answered.'); } },
    summonMinion: { n: 'SUMMON', w: 2, cd: 4, t: [3], pose: 'cast', run: (c, g, a) => {
                a.spawn(2); a.sfx('summon');
                a.say('It calls up two thralls from the floor.'); } },
    silence: { n: 'SILENCE', w: 2, cd: 3, t: [3], pose: 'cast', run: (c, g, a) => {
                a.dmg(0.4, { plain: true }); a.set('_hex', { mult: 0.7, turns: 2 });
                a.say('The air goes mute — your words come out thin.'); } },

    // ── TIER 4: principalities ──
    territoryShift: { n: 'TERRITORY SHIFT', w: 3, cd: 3, t: [4], pose: 'cast', run: (c, g, a) => {
                const d = a.dmg(0.6, { plain: true });
                a.cycle(); a.cycle();
                a.say('The territory answers its lord (' + d + ') — your weakness is rewritten.'); } },
    devastation: { n: 'DEVASTATION', w: 2, cd: 5, t: [4], pose: 'cast', run: (c, g, a) => {
                a.set('_tel', { mult: 3.0, turns: 2 });
                a.sfx('fear');
                a.say('It begins to gather something enormous. DEFEND OR BREAK IT — NEXT BLOW IS HUGE.'); } },
    chains: { n: 'CHAINS', w: 3, cd: 3, t: [4], pose: 'cast', run: (c, g, a) => {
                a.dmg(0.7, { plain: true }); a.set('_noHeal', 2);
                a.say('Chains of iron fall across you — nothing mends you for two turns.'); } },
    dreadWave: { n: 'DREAD WAVE', w: 3, cd: 3, t: [4], pose: 'cast', run: (c, g, a) => {
                a.dmg(0.6, { plain: true }); a.set('_hex', { mult: 0.75, turns: 2 }); a.sfx('fear');
                a.say('Dread rolls over you and your words shake.'); } },
    trample: { n: 'TRAMPLE', w: 3, cd: 2, t: [4, 5], run: (c, g, a) => { const d = a.dmg(1.4); a.say('It tramples you for ' + d + '.'); } },
  };

  // ── TIER 5: one signature per named fallen angel ──────────────
  // m = damage multiple; x = extra effects (runs after the blow)
  const SIG = {
    lord_depths:  { n: 'THE DROWNING DARK', m: 1.2, x: (c, g, a) => { a.set('_noHeal', 2); a.say('You are pulled under — no healing reaches you.'); } },
    lord_shadows: { n: 'UNSEEING', m: 0.8, x: (c, g, a) => { a.set('_lockType', { type: 'wisdom', turns: 2 }); a.say('The dark eats every word of wisdom you have.'); } },
    lord_flames:  { n: 'BRIMSTONE FALL', m: 0.5, x: (c, g, a) => { a.set('_tel', { mult: 2.4, turns: 2 }); a.sfx('fear'); a.say('The sky above you fills with fire. PREPARE.'); } },
    lord_plagues: { n: 'ROT', m: 0.7, x: (c, g, a) => { a.set('_fatigue', { add: 2, turns: 3 }); a.say('Decay settles into your limbs — every verse drags.'); } },
    lord_chains:  { n: 'BIND THE WORD', m: 0.6, x: (c, g, a) => { a.set('_lockType', { type: pick(['praise', 'faith']), turns: 2 }); a.say('Two kinds of scripture are bound shut.'); } },
    lucifer_duke: { n: 'FALSE LIGHT', m: 1.0, x: (c, g, a) => { a.heal(Math.round((c.demon.maxHp || 60) * 0.1)); a.set('_hex', { mult: 0.8, turns: 2 }); a.say('He wears an angel\'s light and mends himself in it.'); } },
    beelzebub:    { n: 'SWARM OF FLIES', m: 0.5, x: (c, g, a) => { for (let i = 0; i < 2; i++) a.dmg(0.5, { plain: true }); a.set('_fatigue', { add: 1, turns: 2 }); a.say('Flies fill your mouth — words crawl out slowly.'); } },
    asmodeus:     { n: 'PROMISE OF PLEASURE', m: 1.6, x: (c, g, a) => { a.set('_noHeal', 2); a.say('He offers you everything. The price is your recovery.'); } },
    mammon_duke:  { n: 'TITHE', m: 0.9, x: (c, g, a) => { const take = Math.min(g.gold || 0, 10); g.gold = (g.gold || 0) - take; a.shield(12); a.say('He takes ' + take + ' gold and calls it worship.'); } },
    satan_duke:   { n: 'THE ACCUSATION', m: 1.3, x: (c, g, a) => { a.set('_hex', { mult: 0.8, turns: 3 }); a.say('Every failure you have ever had is read out aloud.'); } },
    belial:       { n: 'WORTHLESSNESS', m: 0.7, x: (c, g, a) => { a.set('_hex', { mult: 0.6, turns: 3 }); a.say('It whispers that nothing you do matters. The words fade in your hands.'); } },
    belphegor:    { n: 'THE OPENING', m: 0.0, x: (c, g, a) => { a.set('_fatigue', { add: 2, turns: 4 }); a.set('_noHeal', 2); a.say('Every limb wants to lie down. Sloth takes the wheel.'); } },
    zeus_fallen:  { n: 'THUNDERBOLT', m: 0.5, x: (c, g, a) => { a.set('_tel', { mult: 2.6, turns: 2 }); a.sfx('fear'); a.say('He raises the bolt. The air goes electric.'); } },
    ares_fallen:  { n: 'BLOOD FRENZY', m: 0.8, x: (c, g, a) => { const d2 = a.dmg(0.8, { plain: true }); a.heal(Math.round(d2 * 0.5)); a.say('He drinks the wound he gave you.'); } },
    hades_fallen: { n: 'GATES OF THE DEAD', m: 0.9, x: (c, g, a) => { a.spawn(2); a.sfx('summon'); a.say('The dead climb out behind him.'); } },
    odin_fallen:  { n: 'ALL-SEEING', m: 1.1, x: (c, g, a) => { a.cycle(); a.set('_lockType', { type: 'faith', turns: 2 }); a.say('He sees what you were about to say — and takes it.'); } },
    loki_fallen:  { n: 'SHAPECHANGE', m: 0.9, x: (c, g, a) => { a.cycle(); a.set('_reflect', { mult: 0.6, turns: 2 }); a.say('He becomes someone else, and wears your face while he does it.'); } },
    thor_fallen:  { n: 'HAMMER OF THE WRATHFUL', m: 0.5, x: (c, g, a) => { a.set('_tel', { mult: 2.2, turns: 2 }); a.say('The hammer goes up. It does not come down yet.'); } },
    jupiter_fallen:{ n: 'JUDGEMENT OF THE SKY', m: 1.3, x: (c, g, a) => { a.set('_fatigue', { add: 1, turns: 3 }); a.say('He judges you from above, and you feel smaller.'); } },
    mars_fallen:  { n: 'RED WAR', m: 0.55, x: (c, g, a) => { let t = 0; for (let i = 0; i < 3; i++) t += a.dmg(0.55, { plain: true }); a.say('Three strikes of the red god — ' + t + ' total.'); } },
    mercury_fallen:{ n: 'SILVER TONGUE', m: 0.8, x: (c, g, a) => { a.set('_hex', { mult: 0.65, turns: 2 }); a.set('_lockType', { type: 'praise', turns: 2 }); a.say('He talks you out of your own praise.'); } },
    semjaza:      { n: "WATCHER'S GAZE", m: 1.0, x: (c, g, a) => { a.set('_lockType', { type: pick(['wisdom', 'mercy']), turns: 3 }); a.say('The chief watcher marks the words you will not be allowed to use.'); } },
    azazel:       { n: 'BEARER OF BLADES', m: 0.8, x: (c, g, a) => { a.dmg(0.8, { plain: true }); a.say('A second blade he should not have.'); } },
    rumeel:       { n: 'THUNDER OF GOD', m: 0.5, x: (c, g, a) => { a.set('_tel', { mult: 2.4, turns: 2 }); a.sfx('fear'); a.say('Thunder rolls somewhere above the ceiling of the world.'); } },
    lucifer:      { n: 'MORNING STAR', m: 1.6, x: (c, g, a) => { a.set('_tel', { mult: 2.8, turns: 2 }); a.set('_noHeal', 2); a.say('Light-Bringer. He burns what he touches.'); } },
  };

  // Fallback signature so every tier-5 demon is distinct even without a hand-written one.
  function signatureFor(demon){
    if (SIG[demon.id]) return { id: demon.id, big: true, pose: 'attack', ...SIG[demon.id] };
    const seed = (demon.id || demon.name || 'x').length;
    const base = 0.9 + (seed % 5) * 0.12;
    return { id: demon.id, n: (demon.name || 'FALLEN').toUpperCase() + "'S WRATH", m: base, big: true, pose: 'attack',
             x: (c, g, a) => { if (seed % 3 === 0) a.set('_hex', { mult: 0.8, turns: 2 }); if (seed % 4 === 0) a.cycle(); a.say('It strikes with everything it remembers being.'); } };
  }

  const TIER_MOVES = { 0: ['claw', 'feint', 'snarl'], 1: ['packRush', 'flank', 'rally', 'claw'],
                       2: ['rend', 'hex', 'ward', 'drain'], 3: ['oppressiveGaze', 'comboChain', 'mirrorVeil', 'summonMinion', 'silence', 'rend'],
                       4: ['territoryShift', 'devastation', 'chains', 'dreadWave', 'trample'] };

  // Lucifer runs a script instead of a move pool: three phases by HP fraction.
  const LUCIFER_PHASES = [
    { at: 1.00, moves: ['pride', 'hex'] },
    { at: 0.60, moves: ['mirrorVeil', 'summonMinion', 'drain'] },
    { at: 0.30, moves: ['devastation', 'lucifer', 'trample'] },
  ];

  function available(c, g){
    const t = (c.demon.tier || 0);
    if (t >= 6){                                   // LUCIFER
      const frac = c.demon.hp / (c.demon.maxHp || c.demon.hp);
      const ph = LUCIFER_PHASES.filter(p => frac <= p.at).pop();
      return ph.moves.map(id => M[id] ? { id, ...M[id] } : { id, ...signatureFor(c.demon), big: true });
    }
    if (t >= 5){
      // a signature plus the principality arsenal, so angels still vary turn to turn
      const extra = ['devastation', 'chains', 'dreadWave', 'trample', 'hex', 'drain'].map(id => ({ id, ...M[id] }));
      return [{ id: '__sig', ...signatureFor(c.demon) }].concat(extra);
    }
    const ids = TIER_MOVES[t] || TIER_MOVES[0];
    return ids.map(id => ({ id, ...M[id] })).filter(m => m.run || m.x);
  }

  function choose(c, g){
    const cd = c._aiCd || (c._aiCd = {});
    let pool = available(c, g).filter(m => !(cd[m.id] > 0) && m.id !== c._aiLast);
    if (!pool.length) pool = available(c, g);
    const total = pool.reduce((s, m) => s + (m.w || 2), 0);
    let roll = rng() * total;
    for (const m of pool){ roll -= (m.w || 2); if (roll <= 0) return m; }
    return pool[pool.length - 1];
  }

  function tick(c){
    const dec = (o) => { if (o && typeof o === 'object' && 'turns' in o) o.turns--; };
    dec(c._tel); dec(c._hex); dec(c._lockType); dec(c._reflect);
    if (c._tel && c._tel.turns <= 0) c._tel = null;
    if (c._hex && c._hex.turns <= 0) c._hex = null;
    if (c._lockType && c._lockType.turns <= 0) c._lockType = null;
    if (c._reflect && c._reflect.turns <= 0) c._reflect = null;
    if (typeof c._noHeal === 'number' && c._noHeal > 0) c._noHeal--;
    if (c._fatigue && c._fatigue.turns > 0){ c._fatigue.turns--; if (c._fatigue.turns <= 0) c._fatigue = null; }
    if (c._aiCd) for (const k of Object.keys(c._aiCd)) if (c._aiCd[k] > 0) c._aiCd[k]--;
  }

  // ── player-side readback ──
  function playerDamageMult(c, type){
    let m = 1;
    if (c._hex && c._hex.turns > 0) m *= c._hex.mult;
    if (c._lockType && c._lockType.turns > 0 && type === c._lockType.type) m *= 0.5;
    if (c._fatigue && c._fatigue.turns > 0) m *= (1 - 0.12 * c._fatigue.add);
    if (c._tel && c._tel.turns > 0) m *= 1.1;             // the demon over-committed: a punish window
    return clamp(m, 0.15, 2.5);
  }
  function healMult(c){ return (typeof c._noHeal === 'number' && c._noHeal > 0) ? 0 : 1; }
  function onPlayerHit(c, g, dmg){
    if (c._reflect && c._reflect.turns > 0){
      const back = Math.max(1, Math.round(dmg * c._reflect.mult));
      g.hp -= back;
      say(c, 'The mirror answers — ' + back + ' reflected back at you!');
      if (typeof SpriteStates !== 'undefined') SpriteStates.set('hero', 'hit');
    }
  }

  // ── the enemy turn ──
  function takeTurn(c, g, full){
    if (!c || !c.demon) return;
    tick(c);
    if (c.stunTurns > 0){ c.stunTurns--; say(c, c.demon.name + ' is stunned and cannot act.'); return; }
    // ── GRANDIA: a charged move fires now, unless the player broke it ──
    if (c.cast && c.cast.mv){
      const cm = c.cast.mv;
      c.cast = null;
      const ca = apiFor(c, g, full);
      c._aiLast = cm.id; c._aiCd[cm.id] = cm.cd || 3;
      if (typeof SpriteStates !== 'undefined') SpriteStates.set('demon', cm.pose || 'attack');
      if (typeof SFX !== 'undefined') SFX.play('phase');
      if (c._follow){ const f = c._follow, od = ca.dmg; ca.dmg = (mul, o) => od((mul || 1) * f, o); c._follow = 0; }
      if (cm.x){
        const cd = cm.m ? ca.dmg(cm.m) : 0;
        say(c, c.demon.name + ' — ' + cm.n + '!' + (cd ? ' (' + cd + ' dmg)' : ''));
        cm.x(c, g, ca);
      } else {
        cm.run(c, g, ca);
      }
      c._aiLastMove = cm.n || cm.id;
      return;
    }
    const a = apiFor(c, g, full);
    const mv = choose(c, g);
    // ── GRANDIA: heavy moves telegraph for one turn behind a visible bar. The
    // player can cancel it by landing this demon's weak verse type in the window;
    // otherwise it lands as it always did. Below 20% HP the gloves come off and
    // it fires immediately, so a losing demon is still dangerous.
    const heavy = mv.big || (typeof mv.m === 'number' && mv.m >= 1.3);
    if (heavy && c.demon.hp > c.demon.maxHp * 0.2){
      c.cast = { mv: mv, name: mv.n || mv.id };
      c._aiLast = mv.id; c._aiCd[mv.id] = mv.cd || 3;
      if (typeof SpriteStates !== 'undefined') SpriteStates.set('demon', 'cast');
      if (typeof SFX !== 'undefined') SFX.play('phase');
      say(c, c.demon.name + ' gathers its strength — ' + (mv.n || 'a heavy blow') + ' approaches!');
      return;
    }
    c._aiLast = mv.id;
    c._aiCd[mv.id] = mv.cd || 2;
    if (typeof SpriteStates !== 'undefined') SpriteStates.set('demon', mv.pose || 'attack');
    if (typeof SFX !== 'undefined') SFX.play(mv.big ? 'phase' : 'swing');
    if (c._follow){ const f = c._follow, od = a.dmg; a.dmg = (mul, o) => od((mul || 1) * f, o); c._follow = 0; }
    if (mv.x) {                                              // signature entry
      const d = mv.m ? a.dmg(mv.m) : 0;
      say(c, c.demon.name + ' — ' + mv.n + '!' + (d ? ' (' + d + ' dmg)' : ''));
      mv.x(c, g, a);
    } else {
      mv.run(c, g, a);
    }
    c._aiLastMove = mv.n || mv.id;
  }

  return { takeTurn, choose, available, playerDamageMult, healMult, onPlayerHit, tick,
           _moves: M, _sig: SIG, timers: (c) => ({ tel: c._tel, hex: c._hex, lock: c._lockType, reflect: c._reflect,
             noHeal: c._noHeal, fatigue: c._fatigue, last: c._aiLastMove }) };
})();

