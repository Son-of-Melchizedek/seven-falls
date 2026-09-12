// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — KILL-ONLY VENDETTA
//
// Persistent enemies whose stories end only three ways: they escape, they kill
// you, or you kill them for good. Replaces the old NemesisSystem, which was the
// exact failure mode this design forbids — one hardcoded "Stalker" that returned
// every third floor with the same name and a bigger HP number.
//
// Deliberate boundaries (see the blueprint):
//   · a conflict graph, not a ranked army tree — no ranks, no promotion ladders
//   · operational roles and local influence, no rank-correlated power
//   · permanent confirmed death — no routine resurrection
//   · no followers, recruitment, conversion or friendship state. Ever.
//   · no NPC-owned fort mutating from its owner's traits
//   · adaptations are authored recipes chosen from FACTUAL encounter tags, never
//     arbitrary parameter drift, and EVERY adaptation ships with a counterplay
//     opening — no hard immunity without a way through it
//   · succession through vacated operations, witnesses and material inheritance
//
// No stage invents an encounter, wound, witness, resource or relationship: every
// field below is written from something that actually happened in combat.
// ═══════════════════════════════════════════════════════════════

const VendettaSystem = (function(){
  const KEY = 'seven_falls_vendetta_v1';
  const MAX_ACTIVE = 4;          // the roster stays readable — recognition before complexity
  const DUE_AFTER = 2;           // floors of absence before a rival may intercept again

  // ── ADAPTATION RECIPES ────────────────────────────────────────
  // Each entry is a PROBLEM and an OPENING. The opening is not flavour: it is
  // wired into the damage pipeline in index.html.
  const ADAPT = {
    wary: {
      name: 'Wary of {type}',
      problem: 'resists {type} verses (-25% damage)',
      opening: 'a verse of any OTHER type in the same submission strikes +20%',
    },
    scarred: {
      name: 'Scarred Deep',
      problem: '+30% damage dealt',
      opening: '-15% max HP; below 40% HP its guard breaks and it takes +25%',
    },
    cadence: {
      name: 'Learned Your Cadence',
      problem: 'fatigue settles in a verse sooner',
      opening: 'its heavy move telegraphs a turn longer, so the break window is wider',
    },
    hunter: {
      name: 'Hunts You',
      problem: 'intercepts you sooner, and more often',
      opening: 'it arrives boasting, and names its own weakness',
    },
    vengeful: {
      name: 'Vengeful',
      problem: '+40% damage while you are below half HP',
      opening: 'its resistances fall away once it drops below 40% HP',
    },
  };

  // ── MOTIVES ───────────────────────────────────────────────────
  // One motive per rival, derived from facts. Motives change behaviour, never
  // allegiance: this game has no recruitment and no redemption.
  const MOTIVES = {
    wounded:   'It remembers the wound you gave it, and means to return it.',
    witness:   'It watched you die. It does not believe you are dangerous.',
    escaped:   'You ran from it once. It has not stopped following since.',
    ascendant: 'It has outlived you more than once, and now it performs for an audience.',
    debt:      'It counted every verse you threw at it, and it has an answer for the worst.',
  };

  // ── EVIDENCE ──────────────────────────────────────────────────
  // Foreshadowing is always a trace of something that happened, never a rumour
  // the system invented.
  const EVIDENCE = {
    scarred:  ['Furrows cut into the stone — a blade that already tasted its hide.',
               'Dried black blood on the wall, and none of it yours.',
               'A dark stain the shape of something that crawled away.'],
    hunter:   ['Tracks that double back on themselves. It is circling you.',
               'Scratches at eye height, fresh, and pointed the way you came.',
               'Something has been pacing this corridor for a while.'],
    wary:     ['Scorched floor arranged in a ring — it has been practising against you.',
               'A heap of shattered tile, all of it the same colour.',
               'Marks on the wall, counted. It knows how many times you struck.'],
    cadence:  ['A rhythm tapped into the dust. Yours.',
               'The same three marks, over and over, in the order you favour.',
               'It has been listening to how you fight.'],
    vengeful: ['A grave-sized hollow, empty. Something climbed out of it angry.',
               'Chains snapped at the links, not cut.',
               'The smell of iron and old grief.'],
  };

  let state = { rivals: [], vacancies: [], log: [] };

  // ── PERSISTENCE ───────────────────────────────────────────────
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){}
  }
  function init(){
    try {
      const raw = localStorage.getItem(KEY);
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.rivals)){
          state = { rivals: parsed.rivals, vacancies: parsed.vacancies || [], log: parsed.log || [] };
          return;
        }
      }
    } catch(e){}
    state = { rivals: [], vacancies: [], log: [] };
  }
  function reset(){ state = { rivals: [], vacancies: [], log: [] }; save(); }

  function active(){ return state.rivals.filter(r => r.status === 'active'); }
  function byId(id){ return state.rivals.find(r => r.id === id) || null; }
  function all(){ return state.rivals; }

  function log(line){
    state.log.push(line);
    if (state.log.length > 24) state.log.shift();
  }

  // ── STAGE 1: CONTACT ──────────────────────────────────────────
  // Build an EnemyIdentity. Every field is either structural (seed, archetype) or
  // observed in combat (facts), never invented.
  function newIdentity(demon, floor){
    const seed = (demon.id || demon.name || 'demon') + '_' + Date.now().toString(36).slice(-4);
    return {
      id: 'rv_' + seed,
      demonId: demon.id || null,
      archetype: demon.type || demon.sin || 'unknown',
      tier: (demon.tier !== undefined ? demon.tier : 0),
      name: demon.name || 'The Nameless',
      visualSeed: hash(seed),
      voice: pickVoice(demon),
      temperament: pickTemperament(demon),
      homeOperation: operationFor(demon, floor),
      loadout: (demon.twists && demon.twists[0]) || 'plain',
      // ── observed facts only ──
      facts: {
        hitsByType: {}, totalDamage: 0, biggestHit: 0, landedHits: 0,
        playerFled: 0, rivalFled: 0, killedPlayer: 0, survived: 0,
        lastFloor: floor, lastTwist: null, wounds: 0, verseSeen: {},
      },
      motive: null, adaptations: [], scars: 0,
      encounters: 1, status: 'active',
      due: DUE_AFTER + 1, lastSeen: floor, metFloor: floor,
      killedAtFloor: null, successorOf: null, inherited: null,
    };
  }
  function hash(s){ let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function pickVoice(d){
    const t = (d.type || d.sin || '');
    if (/pride/.test(t)) return 'theatrical';
    if (/deception|shadows/.test(t)) return 'whispering';
    if (/wrath|flames/.test(t)) return 'roaring';
    if (/greed/.test(t)) return 'bargaining';
    if (/despair|sloth/.test(t)) return 'flat';
    return 'cold';
  }
  function pickTemperament(d){
    const t = (d.type || d.sin || '');
    const out = [];
    if (/pride/.test(t)) out.push('theatrical', 'patient');
    if (/deception/.test(t)) out.push('cautious', 'cruel');
    if (/wrath|flames/.test(t)) out.push('reckless', 'cruel');
    if (/greed/.test(t)) out.push('patient', 'disciplined');
    if (!out.length) out.push('disciplined', 'patient');
    return out;
  }
  function operationFor(d, floor){
    const ops = ['the cattle gate', 'the bone stair', 'the third vault', 'the dry cistern',
                 'the choir loft', 'the furnace mouth', 'the flooded nave', 'the salt road'];
    return ops[(hash((d.type || 'x') + (floor || 1)) % ops.length)];
  }

  // ── STAGE 2: SELECTION ────────────────────────────────────────
  // Only a memorable survivor joins the active roster. Memory is what earns a
  // place; a demon you killed outright is simply dead.
  function isMemorable(r){
    const f = r.facts;
    return (f.playerFled > 0) || (f.killedPlayer > 0) || (f.survived >= 2) ||
           (f.biggestHit >= 25) || (f.rivalFled > 0) || (f.landedHits >= 4);
  }
  function promote(identity){
    if (active().length >= MAX_ACTIVE) return false;
    identity.motive = deriveMotive(identity);
    identity.adaptations = deriveAdaptations(identity);
    state.rivals.push(identity);
    log('A rival is remembered: ' + epithet(identity));
    save();
    return true;
  }

  // ── STAGE 3: INTERPRETATION ───────────────────────────────────
  // Factual tags in, one motive and up to two adaptations out. The victim of a
  // heavy hit resents it; the survivor of repeated fights performs; whoever you
  // ran from hunts; whoever killed you is contemptuous.
  function deriveMotive(r){
    const f = r.facts;
    if (f.killedPlayer > 0) return 'witness';
    if (f.playerFled > 0) return 'escaped';
    if (f.survived >= 2) return 'ascendant';
    if (f.biggestHit >= 25 || f.wounds > 0) return 'wounded';
    const top = topType(f);
    return top ? 'debt' : 'wounded';
  }
  function topType(f){
    let best = null, n = 0;
    for (const k in f.hitsByType) if (f.hitsByType[k] > n){ best = k; n = f.hitsByType[k]; }
    return best;
  }
  function deriveAdaptations(r){
    const f = r.facts, out = [];
    const top = topType(f);
    if (top && f.hitsByType[top] >= 2) out.push({ id: 'wary', arg: top });
    if (f.biggestHit >= 30 || f.wounds >= 2) out.push({ id: 'scarred' });
    if (f.landedHits >= 4 && out.length < 2) out.push({ id: 'cadence' });
    if (f.playerFled > 0 && out.length < 2) out.push({ id: 'hunter' });
    if (f.killedPlayer > 0 && out.length < 2) out.push({ id: 'vengeful' });
    return out.slice(0, 2);
  }
  function adaptLine(a){
    const def = ADAPT[a.id];
    if (!def) return '';
    return def.name.replace('{type}', a.arg || 'that');
  }
  function adaptProblem(a){
    const def = ADAPT[a.id];
    return def ? def.problem.replace('{type}', a.arg || 'that') : '';
  }
  function adaptOpening(a){
    const def = ADAPT[a.id];
    return def ? def.opening : '';
  }

  // Epithets come from what happened, so the same face is never the same story.
  function epithet(r){
    const f = r.facts;
    // A successor is a different person holding the same post, so it must not read
    // as the one it avenges ("Baalzebub, Avenger of Baalzebub" was the giveaway).
    if (r.successorOf){
      let nm = 'The Avenger of ' + r.successorOf;
      if (f.killedPlayer > 0) nm += ', Your Undoing';
      else if (f.playerFled > 0) nm += ', the Hunter';
      else if (f.survived >= 2) nm += ', Twice-Risen';
      return nm;
    }
    if (f.killedPlayer > 0) return r.name + ', Your Undoing';
    if (f.playerFled > 0) return r.name + ', the Hunter';
    if (f.survived >= 2) return r.name + ', Twice-Risen';
    if (f.biggestHit >= 30) return r.name + ', the Wounded';
    if (f.wounds > 0) return r.name + ' the Scarred';
    if (r.successorOf) return r.name + ', Avenger of ' + r.successorOf;
    return r.name;
  }

  // ── STAGE 4: FORESHADOWING ────────────────────────────────────
  // Only fires when there is something real to show.
  function foreshadow(floor){
    const cands = active().filter(r => r.due >= DUE_AFTER);
    if (!cands.length) return null;
    const r = cands[0];
    const key = r.adaptations.length ? r.adaptations[0].id : (r.motive === 'escaped' ? 'hunter' : 'scarred');
    const lines = EVIDENCE[key] || EVIDENCE.scarred;
    return { rival: r, text: lines[r.visualSeed % lines.length], epithet: epithet(r) };
  }

  // ── STAGE 5: COLLISION ────────────────────────────────────────
  // A rival intercepts an operation. Verified against real game state: only the
  // floor, the roster and the elapsed floors decide, never a timer alone.
  function collision(floor){
    const due = active().filter(r => floor - r.lastSeen >= DUE_AFTER);
    if (!due.length) return null;
    // Hunters push harder; theatrical ones wait for an audience (later floors)
    let best = null, bestScore = -1;
    for (const r of due){
      let score = 1 + (r.facts.playerFled > 0 ? 0.6 : 0) + r.encounters * 0.15;
      if (r.temperament.includes('theatrical') && floor >= 5) score += 0.4;
      if (r.temperament.includes('cautious') && game && game.hp < game.maxHp * 0.5) score += 0.5;
      if (score > bestScore){ bestScore = score; best = r; }
    }
    if (!best) return null;
    const chance = Math.min(0.75, 0.35 + bestScore * 0.1);
    if (Math.random() > chance) return null;
    return best;
  }

  // Decorate a demon object with the rival's identity and its adaptations.
  // The demon stays the demon — this changes no art, only its story and rules.
  function adapter(rival, demon){
    const f = rival.facts;
    const out = Object.assign({}, demon);
    const scale = 1 + rival.encounters * 0.12;      // survives, but not by inflating forever
    out.hp = Math.floor((demon.hp || 40) * scale);
    out.maxHp = out.hp;
    out.name = epithet(rival);
    out.combatMsg = openingLine(rival);
    out.isRival = true;
    out.rivalId = rival.id;
    out.gold = (demon.gold || 15) + 5 * rival.encounters;
    for (const a of rival.adaptations){
      if (a.id === 'scarred'){ out.hp = Math.floor(out.hp * 0.85); out.maxHp = out.hp; out._rivalAtk = 1.3; }
      if (a.id === 'wary' && a.arg) out._rivalResist = a.arg;
      if (a.id === 'cadence') out._rivalFatigue = true;
      if (a.id === 'hunter') out._rivalTaunt = true;      // names its own weakness on arrival
      if (a.id === 'vengeful') out._rivalVengeful = true;
    }
    return out;
  }
  function openingLine(r){
    const m = MOTIVES[r.motive] || MOTIVES.wounded;
    return m;
  }

  // ── DAMAGE MODIFIERS (called from the damage pipeline) ────────
  // Returns the multiplier the rival's adaptations impose on THIS submission, and
  // a note for the combat message. The opening half is what keeps it fair.
  function damageModifier(rival, verseType, selectedTypes, demon){
    if (!rival) return { mult: 1, notes: [] };
    const notes = [];
    let mult = 1;
    const f = rival.facts;
    for (const a of rival.adaptations){
      if (a.id === 'wary' && a.arg === verseType && !rival._resistanceBroken){
        mult *= 0.75;
        notes.push('WARY -25%');
        // the opening: a different type in the same submission lands harder
        if (selectedTypes && selectedTypes.some(t => t !== a.arg && t !== verseType)){ mult *= 1.2; notes.push('OPENING +20%'); }
      }
      if (a.id === 'scarred' && demon && demon.hp <= (demon.maxHp || 1) * 0.4){
        mult *= 1.25; notes.push('GUARD BROKEN +25%');
      }
      if (a.id === 'vengeful' && game && game.hp < game.maxHp * 0.5){
        // its bonus hurts the player, not this calculation — surfaced as a note
        notes.push('IT PRESSES ITS ADVANTAGE');
      }
    }
    return { mult, notes };
  }
  // The rival's outgoing damage multiplier (adaptations that make IT hit harder).
  function attackModifier(rival){
    if (!rival) return 1;
    let m = 1;
    const f = rival.facts;
    for (const a of rival.adaptations){
      if (a.id === 'scarred') m *= 1.3;
      if (a.id === 'vengeful' && game && game.hp < game.maxHp * 0.5) m *= 1.4;
    }
    return m;
  }
  // Fatigue pressure from 'cadence': the repeat penalty bites one verse sooner.
  function fatiguePressure(rival){ return !!(rival && rival.adaptations.some(a => a.id === 'cadence')); }

  // ── RECORDING (facts, from real combat only) ──────────────────
  function recordHit(rival, verseType, damage, floor, twist){
    if (!rival) return;
    const f = rival.facts;
    f.hitsByType[verseType] = (f.hitsByType[verseType] || 0) + 1;
    f.landedHits++;
    f.totalDamage += damage || 0;
    if ((damage || 0) > f.biggestHit){ f.biggestHit = damage; f.wounds++; }
    f.lastFloor = floor;
    if (twist) f.lastTwist = twist;
    rival.due = Math.max(0, rival.due - 1);
    save();
  }
  function recordPlayerFlee(rival, floor){
    if (!rival) return;
    rival.facts.playerFled++;
    rival.facts.survived++;
    rival.lastSeen = floor;
    rival.due = DUE_AFTER + 1;
    rival.motive = deriveMotive(rival);
    rival.adaptations = deriveAdaptations(rival);
    log(epithet(rival) + ' watched you run.');
    save();
  }
  function recordPlayerDefeat(rival, floor){
    if (!rival) return;
    rival.facts.killedPlayer++;
    rival.facts.survived++;
    rival.lastSeen = floor;
    rival.due = DUE_AFTER + 2;
    rival.motive = deriveMotive(rival);
    rival.adaptations = deriveAdaptations(rival);
    log(epithet(rival) + ' saw you fall.');
    save();
  }
  function recordRivalFlee(rival, floor){
    if (!rival) return;
    rival.facts.rivalFled++;
    rival.facts.survived++;
    rival.lastSeen = floor;
    rival.due = DUE_AFTER;                     // it comes back sooner, and angrier
    rival.motive = deriveMotive(rival);
    rival.adaptations = deriveAdaptations(rival);
    log(epithet(rival) + ' crawled away alive.');
    save();
  }

  // ── STAGE 6 + 7: RESOLUTION AND SUCCESSION ────────────────────
  // Confirmed kill: the person is gone. What they held does not vanish with them —
  // it becomes vacant, and vacancy has consequences.
  function recordKill(rival, floor){
    if (!rival) return null;
    rival.status = 'dead';
    rival.killedAtFloor = floor;
    const vac = {
      operation: rival.homeOperation,
      tier: rival.tier,
      floor: floor,
      held: rival.loadout,
      witnesses: rival.facts.playerFled + rival.facts.killedPlayer,
      inheritance: { gold: 25 + 10 * rival.encounters, verse: true },
      destabilized: Math.min(3, 1 + Math.floor(rival.encounters / 2)),
    };
    state.vacancies.push(vac);
    log(epithet(rival) + ' is dead for good at ' + rival.homeOperation + '.');
    // A successor can arise from the vacancy — same operation, a different person,
    // inheriting exactly one adaptation and a grudge.
    if (rival.adaptations.length){
      const heir = JSON.parse(JSON.stringify(rival));
      heir.id = 'rv_heir_' + Date.now().toString(36).slice(-4);
      heir.successorOf = rival.name;
      heir.encounters = 0;
      heir.adaptations = [rival.adaptations[0]];
      heir.inherited = adaptLine(rival.adaptations[0]);
      heir.facts = { hitsByType: {}, totalDamage: 0, biggestHit: 0, landedHits: 0,
                     playerFled: 0, rivalFled: 0, killedPlayer: 0, survived: 0,
                     lastFloor: floor, lastTwist: null, wounds: 0, verseSeen: {} };
      heir.motive = 'wounded';
      heir.status = 'active';
      heir.due = DUE_AFTER + 2;
      heir.lastSeen = floor;
      heir.pending = true;                        // enters the roster on the next floor
      state.vacancies[state.vacancies.length - 1].heir = heir.id;
      state.rivals.push(heir);
    }
    save();
    return vac;
  }
  // Called when a floor turns over: successors from vacancies step into the roster.
  function tickFloor(floor){
    let changed = false;
    for (const r of state.rivals){
      if (r.pending && floor >= r.lastSeen + 1){ r.pending = false; changed = true; }
      if (r.status === 'active' && !r.pending) r.due++;
    }
    // prune vacancies older than two floors (the world moves on)
    const before = state.vacancies.length;
    state.vacancies = state.vacancies.filter(v => floor - v.floor <= 2);
    if (state.vacancies.length !== before) changed = true;
    if (changed) save();
  }
  function vacancyConsequences(floor){
    return state.vacancies.filter(v => floor - v.floor <= 2);
  }
  // Destabilisation: a killed rival's operation leaves its neighbours jumpy.
  function aggressionBonus(floor){
    return vacancyConsequences(floor).reduce((s, v) => s + v.destabilized, 0);
  }

  // ── PRESENTATION ──────────────────────────────────────────────
  // The roster screen. Recognition before complexity: who they are, what they did
  // to you, what they have become, and how to beat it.
  function renderRoster(){
    const W2 = (typeof W !== 'undefined') ? W : 384, H2 = (typeof H !== 'undefined') ? H : 288;
    rect(8, 8, W2 - 16, H2 - 16, '#0b0917');          // opaque: this is a modal
    strokeRect(8, 8, W2 - 16, H2 - 16, C.red);
    text('VENDETTA', W2 / 2, 14, C.red, 10, 'center');
    const list = active();
    text(list.length + ' LIVING RIVAL' + (list.length === 1 ? '' : 'S') +
         (state.vacancies.length ? '  ·  ' + state.vacancies.length + ' VACANCY' : ''),
         W2 / 2, 28, C.dim, 5, 'center');
    if (!list.length){
      text('None have survived you yet.', W2 / 2, H2 / 2, C.dim, 7, 'center');
      text('Tap anywhere to close.', W2 / 2, H2 / 2 + 14, C.dim, 5, 'center');
      return;
    }
    // Wrap every block: a counter line is the single most important sentence on
    // this screen, so it must never be the thing that gets clipped. Three rivals
    // fit comfortably; a fourth would push the panel past its own border.
    const INNER = W2 - 38;
    let y = 40;
    const shown = list.slice(0, 3);
    for (const r of shown){
      text(epithet(r), 16, y, C.holy, 7, 'left'); y += 11;
      const f = r.facts;
      const hist = [];
      if (f.landedHits) hist.push(f.landedHits + ' hits taken');
      if (f.biggestHit) hist.push('worst ' + f.biggestHit);
      if (f.playerFled) hist.push('you fled x' + f.playerFled);
      if (f.killedPlayer) hist.push('killed you x' + f.killedPlayer);
      if (f.rivalFled) hist.push('escaped you x' + f.rivalFled);
      for (const l of wrapTextPx(hist.join(' · ') || 'no history yet', INNER, 4)){ text(l, 16, y, C.cyan, 4, 'left'); y += 6; }
      y += 2;
      if (r.motive){ for (const l of wrapTextPx(MOTIVES[r.motive] || '', INNER, 4)){ text(l, 16, y, C.white, 4, 'left'); y += 6; } }
      y += 2;
      for (const a of r.adaptations){
        for (const l of wrapTextPx('> ' + adaptProblem(a), INNER, 4)){ text(l, 16, y, C.gold, 4, 'left'); y += 6; }
        for (const l of wrapTextPx('  counter: ' + adaptOpening(a), INNER, 4)){ text(l, 16, y, C.green, 4, 'left'); y += 6; }
        y += 2;
      }
      if (r.pending){ text('  (not yet in the field)', 16, y, C.dim, 4, 'left'); y += 7; }
      y += 5;
    }
    if (list.length > shown.length)
      text('+' + (list.length - shown.length) + ' more in the field', 16, y, C.dim, 4, 'left');
    text('Tap anywhere to close.', W2 / 2, H2 - 15, C.dim, 5, 'center');
  }
  // A one-line strip for the map header: who is close, and what they carry.
  function renderStrip(x, y){
    const f = foreshadow(game.floor);
    if (!f){ text('NO RIVALS IN THE FIELD', x, y, C.dim, 4, 'left'); return; }
    text('* ' + f.epithet + ' — ' + (f.rival.adaptations.length ? adaptProblem(f.rival.adaptations[0]) : MOTIVES[f.rival.motive]), x, y, C.red, 4, 'left');
  }

  init();
  return {
    init, save, reset, all, active, byId,
    collision, adapter, openingLine,
    damageModifier, attackModifier, fatiguePressure,
    recordHit, recordPlayerFlee, recordPlayerDefeat, recordRivalFlee, recordKill,
    tickFloor, vacancyConsequences, aggressionBonus,
    foreshadow, epithet, adaptLine, adaptProblem, adaptOpening, deriveMotive, deriveAdaptations,
    renderRoster, renderStrip, isMemorable, newIdentity, promote, log,
    get state(){ return state; },
  };
})();
