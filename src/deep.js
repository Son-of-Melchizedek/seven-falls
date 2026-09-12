// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Deep Moves
// Four mechanics ported from the research pass, each bound to a real part of
// this game rather than bolted on:
//
//  #3 Rudras — INSCRIPTION: the verse you are assembling declares itself (type,
//     word cost) and the cost is gated by a per-turn word budget. Friction you
//     can see and plan around, never a wall.
//  #4 Clawler — LINKS: the word pool is a grid, so same-type neighbours link and
//     pay a bonus when both are spent. Decoy tiles crowd the board as a fight
//     drags, and the HUD reports how many useful words are left.
//  #5 Grandia — CAST: a heavy demon move telegraphs for one turn with a visible
//     bar. Landing the demon's weak verse type in that window BREAKS it.
//  #7 Lonely Mountain — WITNESS: what a descent taught you is stamped into the
//     saved store, and later runs see it (map header, scholar, death screen).
//
// Everything here only reads globals that already exist in the main script and
// is called from it; nothing in the game reads from this module.
// ═══════════════════════════════════════════════════════════════

const Deep = (function(){

  // ─────────────────────────────────────────────────────────────
  // #3 INSCRIPTION — what am I assembling, and what does it cost?
  // ─────────────────────────────────────────────────────────────
  function tokType(tok){
    if (!tok || tok.v < 0 || !combat || !combat.verses) return null;
    const v = combat.verses[tok.v];
    return v ? v.type : null;
  }
  function selectedToks(){
    if (!combat || !combat.selected) return [];
    return combat.selected.map(i => combat.pool[i]).filter(Boolean);
  }
  // The verse declares its type from the words in hand — the dominant type wins.
  function dominantType(){
    const counts = {};
    for (const tok of selectedToks()){
      const t = tokType(tok);
      if (t) counts[t] = (counts[t] || 0) + 1;
    }
    let best = null, n = 0;
    for (const k in counts) if (counts[k] > n) { best = k; n = counts[k]; }
    return best;
  }
  function cost(){ return combat && combat.selected ? combat.selected.length : 0; }
  // Word budget. Calibrated against the verses this game actually plays: 7 words
  // on floors 1-2, 12 from floor 3 on. So a standard verse sits exactly at budget,
  // a short one is under it and pays an efficiency bonus, and only a heavy or
  // multi-verse combo exceeds it and takes the tax. The gate is a decision, not a
  // wall — and it never blocks a submission.
  const BUDGET = 12;
  function budget(){ return BUDGET; }
  function overBy(){ return Math.max(0, cost() - budget()); }
  function underBy(){ return Math.max(0, budget() - cost()); }
  // Efficiency: a short verse spends less of the allowance and hits a touch harder.
  function efficiencyBonus(){ return cost() ? 1 + Math.min(0.15, 0.03 * underBy()) : 1; }
  function costTax(){ const o = overBy(); return o ? Math.max(0.7, 1 - 0.08 * o) : 1; }
  function usefulCount(){
    if (!combat || !combat.pool) return 0;
    const sel = new Set(combat.selected || []);
    let n = 0;
    for (let i = 0; i < combat.pool.length; i++){
      if (combat.pool[i].v >= 0 && !sel.has(i)) n++;
    }
    return n;
  }
  function fatiguePressed(){
    if (typeof MECH === 'undefined' || !MECH.fatigueMult) return false;
    // fatigue lights up when the last three verses repeat a type
    const h = (combat && combat._typeHistory) || [];
    return h.length >= 3 && h[h.length - 1] === h[h.length - 2] && h[h.length - 2] === h[h.length - 3];
  }

  // ─────────────────────────────────────────────────────────────
  // #4 LINKS — adjacency in the pool grid
  // ─────────────────────────────────────────────────────────────
  const COLS = 4;
  function linkData(){
    if (!combat || !combat.pool) return { pairs: [], perTile: {} };
    const key = combat.pool.length + '|' + combat.pool.map(t => t.word + ':' + t.v).join(',');
    if (combat._linkKey === key) return combat._links;
    const pairs = [], perTile = {};
    const typeAt = i => tokType(combat.pool[i]);
    for (let i = 0; i < combat.pool.length; i++){
      const ti = typeAt(i);
      if (!ti) continue;
      const right = (i % COLS !== COLS - 1) ? i + 1 : -1;      // same row, next column
      const down = i + COLS;                                    // next row, same column
      for (const j of [right, down]){
        if (j < 0 || j >= combat.pool.length) continue;
        if (typeAt(j) !== ti) continue;
        pairs.push({ a: i, b: j, type: ti });
        perTile[i] = (perTile[i] || 0) + 1;
        perTile[j] = (perTile[j] || 0) + 1;
      }
    }
    combat._links = { pairs, perTile };
    combat._linkKey = key;
    return combat._links;
  }
  // Links spent in the current selection: both ends tapped.
  function spentLinks(){
    const { pairs } = linkData();
    const sel = new Set(combat ? combat.selected : []);
    let n = 0;
    for (const p of pairs) if (sel.has(p.a) && sel.has(p.b)) n++;
    return n;
  }
  function linkBonus(){ return 1 + 0.10 * Math.min(spentLinks(), 3); }
  // Decoys crowd the board as a fight drags — legibility pressure, no rule change.
  function clogLevel(){
    if (!combat) return 0;
    const turns = combat.turnCount || 0;
    return Math.max(0, Math.min(1, (turns - 2) / 10));
  }
  // Called from the tile loop. Draws connectors and the junk treatment.
  function decorateTile(i, tok, x, y, bw, bh, vcol){
    const { perTile, pairs } = linkData();
    const linked = perTile[i] > 0;
    const sel = combat && combat.selected ? combat.selected.includes(i) : false;
    // a link pip on the shared edge of every linked pair
    for (const p of pairs){
      if (p.a !== i && p.b !== i) continue;
      const other = p.a === i ? p.b : p.a;
      const oc = other % COLS, orow = Math.floor(other / COLS);
      const myrow = Math.floor(i / COLS);
      const col = (typeof verseTypeColor === 'function') ? verseTypeColor(p.type) : C.white;
      ctx.save();
      ctx.globalAlpha = (sel && combat.selected.includes(other)) ? 1 : 0.75;
      if (orow === myrow){                                    // horizontal neighbour
        rect(x + bw - 1, y + Math.floor(bh / 2) - 1, 2, 2, col);
      } else {                                                // vertical neighbour
        rect(x + Math.floor(bw / 2) - 1, y + bh - 1, 2, 2, col);
      }
      ctx.restore();
    }
    if (linked && !sel){
      ctx.save(); ctx.globalAlpha = 0.5;
      strokeRect(x, y, bw, bh, (typeof verseTypeColor === 'function') ? verseTypeColor(tokType(tok)) : C.white);
      ctx.restore();
    }
    // junk: decoys get louder/deader-looking as the fight drags
    if (tok.v < 0){
      const c = clogLevel();
      if (c > 0.05){
        ctx.save();
        ctx.globalAlpha = 0.20 + 0.45 * c;
        const jc = '#3a3a58';
        for (let d = 0; d < bw - 4; d += 4) rect(x + 2 + d, y + 2, 2, 1, jc);
        for (let d = 0; d < bw - 4; d += 4) rect(x + 2 + d, y + bh - 3, 2, 1, jc);
        ctx.restore();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // #5 CAST — the telegraph the player can break
  // ─────────────────────────────────────────────────────────────
  function castActive(){ return !!(combat && combat.cast); }
  function castName(){ return castActive() ? (combat.cast.name || 'a heavy blow') : ''; }
  // The type that breaks the charge. Unknown until the bestiary knows it — that
  // is the whole point: knowledge is the interrupt.
  function breakType(){ return (combat && combat.demon) ? combat.demon.weakTo : null; }
  function breakKnown(){
    if (!combat || !combat.demon) return false;
    if (combat.revealedWeak) return true;
    if (typeof KnowledgeSystem === 'undefined' || !KnowledgeSystem.getWeaknessHint) return false;
    const key = (typeof demonTypeKey === 'function') ? demonTypeKey(combat.demon) : combat.demon.type;
    const hint = KnowledgeSystem.getWeaknessHint(key);
    return !!hint && String(hint).indexOf('Unknown') !== 0;
  }
  function breakLabel(){ return breakKnown() ? String(breakType()).toUpperCase() : '?'; }

  // ─────────────────────────────────────────────────────────────
  // #7 WITNESS — what a descent taught you, kept across runs
  // ─────────────────────────────────────────────────────────────
  function witnessStore(){
    if (typeof KnowledgeSystem === 'undefined') return null;
    KnowledgeSystem.store.witness = KnowledgeSystem.store.witness || {};
    return KnowledgeSystem.store.witness;
  }
  // Called on a super-effective hit: that is the weakness, demonstrated.
  function stampWitness(demonName, verseType, floor){
    const w = witnessStore();
    if (!w || !demonName || !verseType) return false;
    const f = String(floor || game.floor || 1);
    w[f] = w[f] || {};
    if (w[f][demonName] === verseType) return false;      // already known
    w[f][demonName] = verseType;
    if (KnowledgeSystem.save) KnowledgeSystem.save();
    return true;
  }
  function witnessFor(floor){
    const w = witnessStore();
    return (w && w[String(floor || game.floor || 1)]) || {};
  }
  function witnessCount(){ return Object.keys(witnessFor(game.floor)).length; }
  function witnessTiers(){
    const w = witnessStore() || {};
    return Object.keys(w).map(Number).sort((a, b) => a - b);
  }
  // A row of dots, one per demon whose weakness this floor has taught you.
  function renderWitnessStrip(x, y, max){
    const known = witnessFor(game.floor);
    const names = Object.keys(known).slice(0, max || 6);
    if (!names.length){
      text('NO WITNESS YET', x, y, C.dim, 4, 'left');
      return 0;
    }
    let dx = x;
    for (const n of names){
      const col = (typeof verseTypeColor === 'function') ? verseTypeColor(known[n]) : C.gold;
      rect(dx, y, 4, 4, col);
      dx += 6;
    }
    text(String(names.length) + ' KNOWN', dx + 3, y, C.cyan, 4, 'left');
    return names.length;
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER — combat HUD additions
  // ─────────────────────────────────────────────────────────────
  // The inscription strip: declared type, word cost vs budget, useful words left.
  function renderInscription(y){
    const bw = W - 12;
    const t = dominantType();
    const n = cost(), cap = budget(), over = overBy();
    const tcol = t && typeof verseTypeColor === 'function' ? verseTypeColor(t) : C.dim;
    rect(6, y, bw, 10, '#0f1024');
    strokeRect(6, y, bw, 10, over ? C.red : (n ? C.holy : C.dim));
    // declared type
    rect(10, y + 3, 4, 4, tcol);
    text(t ? String(t).toUpperCase() : 'VERSE TYPE —', 18, y + 2, t ? tcol : C.dim, 5, 'left');
    // cost vs budget, with the fatigue flag
    const u = underBy();
    const ccol = over ? C.red : (n >= cap ? C.holy : C.green);
    text(n + '/' + cap + (over ? ' +' + over : (n && u ? ' EFF +' + Math.round((efficiencyBonus() - 1) * 100) + '%' : '')),
         W / 2 + 34, y + 2, ccol, 5, 'left');
    // The fatigue flag gets its own right-aligned slot: appended to the cost line it
    // pushed the string past its box and got clipped with an ellipsis.
    if (fatiguePressed()) text('FATIGUE', W - 10, y + 2, C.red, 5, 'right');
    // how many usable words remain in the pool
    text('USEFUL ' + usefulCount(), W - 10, y + 2, C.cyan, 5, 'right');
  }
  // The cast bar, drawn in the enemy's own stat column (x, y = that column's bar
  // origin). The charge is the demon's business, and this is the only band in the
  // combat layout that is empty on every frame: below the HP numbers, above the
  // weakness line, clear of the player row and of the verse box. The move's NAME
  // is already announced in the combat message, so the bar itself stays silent.
  function renderCastBar(x, y){
    if (!castActive()) return;
    const w = 150, h = 5;
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 160);
    // charge track
    rect(x, y, w, h, '#1a1020');
    // fill: full when the break type is known (the player can act on it), shorter
    // when it is still a mystery — the bar itself communicates what you know
    const frac = breakKnown() ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha = pulse;
    rect(x, y, Math.floor(w * frac), h, C.red);
    ctx.restore();
    strokeRect(x, y, w, h, C.gold);
    // the break requirement, right-aligned inside the column
    text('BREAK: ' + breakLabel(), x + w - 4, y - 5, breakKnown() ? C.gold : C.dim, 4, 'right');
  }

  // ─────────────────────────────────────────────────────────────
  // DAMAGE / RESOLUTION HOOKS (called from submitVerse)
  // ─────────────────────────────────────────────────────────────
  function applyLinks(dmg, notes){
    const n = spentLinks();
    if (!n) return dmg;
    notes.push(n + ' LINK' + (n > 1 ? 'S' : ''));
    return Math.floor(dmg * linkBonus());
  }
  // The Rudras gate, applied in both directions: under budget earns a small
  // efficiency bonus, over budget pays a tax.
  function applyCostTax(dmg, notes){
    const o = overBy();
    if (o){
      notes.push('HEAVY −' + Math.round((1 - costTax()) * 100) + '%');
      return Math.max(1, Math.floor(dmg * costTax()));
    }
    const u = underBy();
    if (u > 0 && cost() > 1){
      notes.push('EFFICIENT +' + Math.round((efficiencyBonus() - 1) * 100) + '%');
      return Math.floor(dmg * efficiencyBonus());
    }
    return dmg;
  }
  // Returns true if this verse broke a charge.
  function tryBreak(verse, notes){
    if (!castActive()) return false;
    if (!verse || verse.type !== breakType()) return false;
    combat.cast = null;
    notes.push('CAST BROKEN');
    if (typeof MECH !== 'undefined'){
      MECH.flowActive = true;
      MECH.flowTimer = Math.max(MECH.flowTimer || 0, 3);
    }
    return true;
  }

  return {
    // #3
    dominantType, cost, budget, overBy, underBy, costTax, efficiencyBonus, usefulCount, fatiguePressed, renderInscription,
    // #4
    linkData, spentLinks, linkBonus, clogLevel, decorateTile,
    // #5
    castActive, castName, breakType, breakKnown, breakLabel, renderCastBar, tryBreak,
    // #7
    stampWitness, witnessFor, witnessCount, witnessTiers, renderWitnessStrip,
    // damage
    applyLinks, applyCostTax,
  };
})();
