// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — KILL-ONLY VENDETTA  (v2)
//
// Persistent rivals whose stories end three ways: escape, player defeat, or
// permanent death. Built to the full blueprint:
//
//   §5  event-sourced EncounterFacts · RivalState · AdaptationRecipes · conflict graph
//   §6  weighted candidacy score, active roster + dormant pool
//   §7  three dominant memories (personal / recent / identity), witness-gated
//   §8  two-sided adaptations: fact -> preparation -> tell -> challenge -> counterplay
//   §9  six hostility dimensions, hostility never becomes allegiance
//   §10 rematch director with eligibility, budget and indirect presence
//   §11 irreversible confirmed death, missing state, zero-or-one successor
//   §12 multi-channel presentation, semantic dialogue planner, knowledge-gated lines
//   §13 versioned idempotent commands + an event log with source references
//
// Hard rules enforced here, not documented and hoped for:
//   · the presentation layer cannot create memories, adaptations or survival —
//     it calls commands, and commands validate against real facts
//   · no lethal hit is ever secretly prevented to preserve a rival; escape must be
//     a legible, authored rule
//   · adaptations respond only to what THIS rival could know (it was present, or a
//     named witness told it)
//   · a confirmed kill never returns. There is no scars-after-decapitation path.
// ═══════════════════════════════════════════════════════════════

const VendettaSystem = (function(){
  const KEY = 'seven_falls_vendetta_v2';
  const SCHEMA = 2;

  const MAX_ACTIVE = 4;              // §6: 3-5 active
  const MAX_DORMANT = 6;
  const MAX_ADAPTATIONS = 3;         // §8
  const MEMORY_SLOTS = 3;            // §7

  // ── §10 director budget ────────────────────────────────────────
  const MIN_TICKS_BETWEEN = 3;       // ticks of absence before a collision is allowed
  const MIN_ORDINARY_BETWEEN = 1;    // at least one ordinary encounter between appearances
  const REPLACEMENT_SUPPRESSION = 2; // §11: suppress immediate replacement after a kill

  // ── §9 hostility dimensions ────────────────────────────────────
  const HOSTILITY_KEYS = ['hatred', 'respect', 'fear', 'obsession', 'discipline', 'cruelty'];

  // ── §8 adaptation recipes ──────────────────────────────────────
  // requires: fact tags that must exist in this rival's OWN knowledge.
  // forbids: recipes that cannot coexist (a rival cannot prepare for everything).
  // telegraph / counterplay are mandatory and asserted by the test suite.
  const RECIPES = {
    wary_of_type: {
      id: 'wary_of_type',
      requires: ['repeated_verse_type'],
      forbids: ['all_round_guard'],
      name: 'Wary of {arg}',
      behaviour_change: 'opens with a counter-guard and baits the type it fears',
      telegraph: 'it sets its stance before you choose, and will not turn its shoulder to you',
      counterplay: 'any other verse type in the same submission strikes +20%',
      resource_cost: 'one turn spent setting the guard instead of striking',
      expires_or_breaks_when: 'it drops below 40% HP',
      apply: (m) => m * 0.75,
      opening: (m) => m * 1.2,
      breaksBelow: 0.4,
    },
    scarred: {
      id: 'scarred',
      requires: ['heavy_wound'],
      forbids: [],
      name: 'Scarred Deep',
      behaviour_change: 'fights angrier and closes distance faster',
      telegraph: 'visible scar and a shorter breathing cycle between blows',
      counterplay: '-15% max HP, and below 40% HP its guard breaks for +25%',
      resource_cost: 'permanently lower vitality',
      expires_or_breaks_when: 'never — it is a wound',
      apply: () => 1,
      opening: () => 1,
      atk: 1.3,
      maxHpMult: 0.85,
    },
    cadence_breaker: {
      id: 'cadence_breaker',
      requires: ['repeated_verse_type', 'meaningful_survival'],
      forbids: [],
      name: 'Learned Your Cadence',
      behaviour_change: 'presses the moment your rhythm repeats',
      telegraph: 'it counts aloud as you tap, and its heavy move charges visibly',
      counterplay: 'its heavy move telegraphs a turn longer, so the break window is wider',
      resource_cost: 'it commits a turn to the count',
      expires_or_breaks_when: 'you break one of its charged moves',
      apply: () => 1,
      opening: () => 1,
      fatiguePressure: true,
    },
    hunter: {
      id: 'hunter',
      requires: ['player_escaped'],
      forbids: [],
      name: 'Hunts You',
      behaviour_change: 'appears sooner and will not let a retreat stand',
      telegraph: 'tracks and traces appear on the floor before it does',
      counterplay: 'it arrives boasting, and names its own weakness while it does',
      resource_cost: 'it spends preparation time tracking you instead of fortifying',
      expires_or_breaks_when: 'it is beaten decisively',
      apply: () => 1,
      opening: () => 1,
      revealsWeakness: true,
    },
    vengeful: {
      id: 'vengeful',
      requires: ['killed_player'],
      forbids: [],
      name: 'Vengeful',
      behaviour_change: 'saves its heaviest attack for when you are already hurt',
      telegraph: 'it waits for you to stagger before committing',
      counterplay: 'its resistances fall away once it drops below 40% HP',
      resource_cost: 'it holds back early, ceding tempo',
      expires_or_breaks_when: 'it drops below 40% HP',
      apply: () => 1,
      opening: () => 1,
      atk: 1.4, onlyWhenPlayerHurt: true,
      breaksBelow: 0.4,
    },
    spotters: {
      id: 'spotters',
      requires: ['repeated_positioning'],
      forbids: ['scarred'],
      name: 'Posted Spotters',
      behaviour_change: 'calls your position and keeps distance',
      telegraph: 'a spotter whistles your position before each exchange',
      counterplay: 'break line of sight with a different approach and its callout misses',
      resource_cost: 'one squadmate removed from the fight',
      expires_or_breaks_when: 'the fight moves',
      apply: () => 1,
      opening: () => 1,
    },
    suppressor: {
      id: 'suppressor',
      requires: ['repeated_healing'],
      forbids: [],
      name: 'Assigns a Suppressor',
      behaviour_change: 'one of its number presses your recovery instead of you',
      telegraph: 'a marked suppressor with a banded arm circles you',
      counterplay: 'kill or break from the suppressor and its pressure ends',
      resource_cost: 'a dedicated body that does no other work',
      expires_or_breaks_when: 'the suppressor dies',
      apply: () => 1,
      opening: () => 1,
    },
  };

  // ── §5 core motives ────────────────────────────────────────────
  const MOTIVES = {
    revenge:  'It wants you personally, and it will spend itself to get you.',
    duty:     'You are a target, not an enemy. It does not hate you and will not stop.',
    survival: 'It has learned that you are dangerous, and everything it does is to live.',
    ambition: 'It means to be seen defeating you, and it performs while it tries.',
    ideology: 'It believes your death is right, and it is patient about being correct.',
  };

  // ── state ──────────────────────────────────────────────────────
  let state = blank();

  function blank(){
    return {
      schema: SCHEMA,
      seed: 20260912,
      revision: 0,
      tick: 0,                     // global encounter/tick counter
      encountersSinceCollision: 0, // §10 ordinary-encounter breathing room
      lastCollisionTick: -99,
      suppressionUntilTick: -99,   // §11 replacement suppression after a kill
      rivals: [],                  // active + dormant (alive_state field decides)
      facts: [],                   // §5 EncounterFact records (event-sourced)
      witnesses: [],               // §13 witness transfers
      events: [],                  // §13 event log
      commands: {},                // §13 command_id -> {name, hash, revision, result}
      nodes: [],                   // §5 ConflictNode
      edges: [],                   // §5 ConflictEdge
      vacancies: [],
      kills: 0,
    };
  }

  // ── deterministic RNG: same seed + same commands => identical state (§15.1) ──
  function rnd(){
    state.seed = (state.seed + 0x6D2B79F5) | 0;
    let t = state.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hashStr(s){
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  }

  // ── §2/§15.14 persistence, fail closed on corrupt or forged history ──
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){}
  }
  function init(){
    let loaded = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch(e){ loaded = null; }
    if (!valid(loaded)){ state = blank(); return false; }
    state = loaded;
    return true;
  }
  // Anything that does not match the schema exactly fails closed: the system
  // starts empty rather than trusting a history it cannot verify.
  function valid(s){
    if (!s || typeof s !== 'object') return false;
    if (s.schema !== SCHEMA) return false;
    if (!Array.isArray(s.rivals) || !Array.isArray(s.facts) || !Array.isArray(s.events)) return false;
    if (typeof s.seed !== 'number' || typeof s.revision !== 'number') return false;
    for (const r of s.rivals){
      if (!r || typeof r.id !== 'string' || !r.alive_state) return false;
      if (!Array.isArray(r.adaptations) || !Array.isArray(r.wound_ids)) return false;
    }
    for (const ev of s.facts){
      if (!ev || typeof ev.encounter_id !== 'string' || !ev.outcome) return false;
      if (!Array.isArray(ev.participants)) return false;
    }
    return true;
  }
  function reset(){ state = blank(); save(); }

  // ── §13 COMMANDS: versioned, idempotent, replay-safe ───────────
  // Reusing a command id returns the original result. Reusing it with a DIFFERENT
  // payload is a conflict, and the conflict is reported rather than applied.
  function dispatch(name, payload){
    const id = payload && payload.command_id;
    if (!id) return { error: 'command_id required' };
    const hash = hashStr(JSON.stringify(payload, Object.keys(payload).sort()));
    const seen = state.commands[id];
    if (seen){
      if (seen.hash !== hash) return { error: 'conflict', command_id: id };
      return { result: seen.result, idempotent: true };
    }
    const result = apply(name, payload);
    state.commands[id] = { name, hash, revision: state.revision, result: result || null };
    // A refused command must be detectable by the caller: report the error at the
    // top level as well, exactly like a conflict, instead of burying it in result.
    if (result && result.error) return { result, error: result.error };
    return { result };
  }
  function emit(type, data){
    const ev = { type, tick: state.tick, revision: state.revision, sources: (data && data.sources) || [] };
    for (const k in data) if (k !== 'sources') ev[k] = data[k];
    state.events.push(ev);
    if (state.events.length > 400) state.events.shift();
    return ev;
  }

  function apply(name, p){
    switch (name){
      case 'ResolveEncounter':     return cmdResolveEncounter(p);
      case 'ConfirmEnemyDeath':    return cmdConfirmDeath(p);
      case 'ResolveEnemyEscape':   return cmdResolveEscape(p);
      case 'RecordWitnessTransfer':return cmdWitnessTransfer(p);
      case 'ApplyAdaptation':      return cmdApplyAdaptation(p);
      case 'ScheduleCollision':    return cmdScheduleCollision(p);
      default: return { error: 'unknown command ' + name };
    }
  }

  // ── §5 EncounterFact + §7 memory recording ─────────────────────
  function cmdResolveEncounter(p){
    const fact = {
      encounter_id: p.encounter_id || ('enc_' + (state.tick + 1) + '_' + hashStr(String(p.enemy_id) + state.tick)),
      enemy_id: p.enemy_id,
      tick: state.tick,
      location_id: p.location_id || 'unknown',
      participants: p.participants || [p.enemy_id],
      initiator: p.initiator || 'player',
      outcome: p.outcome,                       // enemy_escaped|player_escaped|player_defeated|enemy_killed
      damage_tags: p.damage_tags || [],
      player_tactic_tags: p.player_tactic_tags || [],
      witness_ids: p.witness_ids || [],
      casualty_ids: p.casualty_ids || [],
      evidence_ids: p.evidence_ids || [],
      known_by: [],                             // who may ever reference this fact
    };
    // the participants and any named witness know it happened
    fact.known_by = Array.from(new Set([].concat(fact.participants, fact.witness_ids)));
    state.facts.push(fact);
    state.revision++;
    state.tick++;
    state.encountersSinceCollision++;
    for (const ev of ['player_defeated', 'enemy_escaped', 'player_escaped', 'enemy_killed']){
      if (fact.outcome === ev) emit('EncounterResolved', { sources: [fact.encounter_id], outcome: ev, enemy_id: fact.enemy_id });
    }
    return { fact_id: fact.encounter_id };
  }

  // Candidacy (§6) — the exact weighted formula.
  function candidacy(enemyId){
    const f = factsFor(enemyId);
    const tally = { player_defeat: 0, enemy_escape: 0, repeated_contact: Math.max(0, f.length - 1),
                    named_ally_casualty: 0, unusual_tactic: 0, witnessed_event: 0 };
    for (const x of f){
      if (x.outcome === 'player_defeated') tally.player_defeat++;
      if (x.outcome === 'enemy_escaped') tally.enemy_escape++;
      if (x.casualty_ids && x.casualty_ids.length) tally.named_ally_casualty += x.casualty_ids.length;
      if (x.player_tactic_tags && x.player_tactic_tags.length > 1) tally.unusual_tactic++;
      if (x.witness_ids && x.witness_ids.length) tally.witnessed_event++;
    }
    let score = 3 * tally.player_defeat + 2 * tally.enemy_escape + 2 * tally.repeated_contact
              + 2 * tally.named_ally_casualty + 1 * tally.unusual_tactic + 1 * tally.witnessed_event;
    // penalties
    const rv = rivalOf(enemyId);
    const recentExposure = (rv && (state.tick - rv.last_seen) < 2) ? 3 : 0;
    score -= recentExposure;
    const sim = active().reduce((best, r) => Math.max(best, similarity(r, enemyId)), 0);
    score -= 2 * sim;
    return { score, tally };
  }
  function similarity(r, enemyId){
    const f = factsFor(enemyId);
    if (!f.length) return 0;
    let s = 0;
    if (r.archetype && f[0] && f[0].enemy_id && r.archetype === archetypeOf(enemyId)) s += 0.5;
    const tags = new Set();
    for (const x of f) for (const t of (x.player_tactic_tags || [])) tags.add(t);
    for (const t of tags) if ((r.seen_tags || []).indexOf(t) !== -1) s += 0.25;
    return Math.min(1, s);
  }

  // ── §6 promotion gates ─────────────────────────────────────────
  function considerPromotion(enemyId, ctx){
    const cand = candidacy(enemyId);
    if (cand.score < 4) return { promoted: false, reason: 'score too low', score: cand.score };
    const existing = rivalOf(enemyId);
    const f = factsFor(enemyId);
    if (!f.length) return { promoted: false, reason: 'no factual encounter' };
    const last = f[f.length - 1];
    // alive, or genuinely missing — never confirmed dead (§6/§11)
    if (existing && existing.alive_state === 'confirmed_dead')
      return { promoted: false, reason: 'confirmed dead cannot return' };
    if (active().length >= MAX_ACTIVE){
      const weakest = active().slice().sort((a, b) => a.rivalry_score - b.rivalry_score)[0];
      if (weakest && cand.score <= weakest.rivalry_score)
        return { promoted: false, reason: 'roster full and this candidate is not more distinctive' };
    }
    if (existing){
      existing.rivalry_score = cand.score;
      existing.stage = stageFor(cand.score);
      existing.last_seen = state.tick;
      refreshRival(existing);
      return { promoted: true, rival: existing.id, updated: true, score: cand.score };
    }
    const r = newRival(enemyId, ctx, cand.score, last);
    state.rivals.push(r);
    state.revision++;
    refreshRival(r);          // derive memories and any immediately-earned adaptation
    emit('RivalPromoted', { sources: f.map(x => x.encounter_id), enemy_id: enemyId, rival_id: r.id, score: cand.score });
    return { promoted: true, rival: r.id, score: cand.score };
  }
  function stageFor(score){
    if (score >= 14) return 'final';
    if (score >= 9)  return 'entrenched';
    if (score >= 5)  return 'hunting';
    return 'noticed';
  }

  // ── §5 RivalState ──────────────────────────────────────────────
  function newRival(enemyId, ctx, score, lastFact){
    ctx = ctx || {};
    const seedName = ctx.name || enemyId;
    const r = {
      id: 'rv_' + hashStr(enemyId + state.tick).slice(0, 8),
      enemy_id: enemyId,
      name: seedName,
      archetype: ctx.archetype || 'unknown',
      tier: (ctx.tier !== undefined ? ctx.tier : 0),
      visual_seed: Math.abs(parseInt(hashStr(enemyId), 10)) % 9973,
      voice_profile: pickVoice(ctx.archetype),
      temperament: pickTemperament(ctx.archetype),        // kept for older call sites
      core_motive: deriveCoreMotive(enemyId, lastFact),
      home_operation_id: operationFor(ctx.archetype, ctx.floor),
      combat_loadout_id: ctx.loadout || 'plain',
      alive_state: 'alive',                               // alive | missing | confirmed_dead
      survival_record: null,                              // §11 unresolved survival
      rivalry_score: score,
      stage: stageFor(score),
      dominant_memory_ids: [],                            // §7 three slots
      adaptation_ids: [],                                  // §8 max 3, ids reference RECIPES (+arg)
      adaptations: [],                                     // materialised recipes for older call sites
      wound_ids: [],
      grudge_targets: ['player'],
      confidence: 0.5,
      fear_tags: [],
      current_intent: 'reconnoitre',
      next_collision_window: MIN_TICKS_BETWEEN,
      exposure_budget: 1,                                  // §10 how many collisions it may still spend
      hostility: pickHostility(ctx.archetype),
      seen_tags: [],
      last_seen: state.tick,
      met_tick: state.tick,
      encounters: 1,
      encounters_survived: 0,
      confirmations: 0,
      successor_of: null,
      inherited_assets: null,
      pending: true,
      dossier: { known_motive: false, known_adaptations: [], known_crimes: [] },  // §12 player-known only
    };
    // §5 conflict graph: the rival's operation and the edge that binds it
    ensureNode(r.home_operation_id, 'operation', r.archetype);
    addEdge(r.enemy_id, r.home_operation_id, 'commands', 1);
    return r;
  }
  function pickVoice(a){
    a = a || '';
    if (/pride/.test(a)) return 'theatrical';
    if (/deception|shadows/.test(a)) return 'whispering';
    if (/wrath|flames/.test(a)) return 'roaring';
    if (/greed/.test(a)) return 'bargaining';
    if (/despair|sloth/.test(a)) return 'flat';
    return 'cold';
  }
  function pickTemperament(a){
    a = a || '';
    if (/pride/.test(a)) return ['theatrical', 'patient'];
    if (/deception/.test(a)) return ['cautious', 'cruel'];
    if (/wrath|flames/.test(a)) return ['reckless', 'cruel'];
    if (/greed/.test(a)) return ['patient', 'disciplined'];
    return ['disciplined', 'patient'];
  }
  // §9: six independent dimensions. Respect never becomes allegiance.
  function pickHostility(a){
    a = a || '';
    const h = { hatred: 0.5, respect: 0.4, fear: 0.3, obsession: 0.4, discipline: 0.5, cruelty: 0.4 };
    if (/pride/.test(a)){ h.hatred = 0.6; h.obsession = 0.7; h.discipline = 0.3; }
    if (/deception|shadows/.test(a)){ h.hatred = 0.4; h.fear = 0.5; h.cruelty = 0.7; h.discipline = 0.6; }
    if (/wrath|flames/.test(a)){ h.hatred = 0.9; h.obsession = 0.6; h.discipline = 0.2; }
    if (/greed/.test(a)){ h.hatred = 0.3; h.discipline = 0.8; h.cruelty = 0.5; }
    if (/despair|sloth/.test(a)){ h.hatred = 0.3; h.fear = 0.6; h.discipline = 0.4; }
    return h;
  }
  function deriveCoreMotive(enemyId, lastFact){
    const f = factsFor(enemyId);
    if (f.some(x => x.outcome === 'player_defeated')) return 'revenge';
    if (f.some(x => x.outcome === 'enemy_escaped')) return 'survival';
    const tags = new Set();
    for (const x of f) for (const t of (x.player_tactic_tags || [])) tags.add(t);
    if (tags.size > 2) return 'ambition';
    if (lastFact && lastFact.casualty_ids && lastFact.casualty_ids.length) return 'revenge';
    return 'duty';
  }
  function operationFor(a, floor){
    const ops = ['the cattle gate', 'the bone stair', 'the third vault', 'the dry cistern',
                 'the choir loft', 'the furnace mouth', 'the flooded nave', 'the salt road'];
    return ops[Math.abs(parseInt(hashStr((a || 'x') + (floor || 1)), 10)) % ops.length];
  }

  // ── §5 conflict graph ──────────────────────────────────────────
  function ensureNode(id, kind, tag){
    if (!state.nodes.find(n => n.id === id)) state.nodes.push({ id, kind, tag: tag || null, held: [] });
  }
  function addEdge(a, b, relation, weight){
    state.edges.push({ a, b, relation, weight: weight || 1 });
  }
  function edgesOf(id){ return state.edges.filter(e => e.a === id || e.b === id); }

  // ── helpers ────────────────────────────────────────────────────
  function factsFor(enemyId){ return state.facts.filter(f => f.enemy_id === enemyId || (f.participants || []).indexOf(enemyId) !== -1); }
  function archetypeOf(enemyId){ const r = rivalOf(enemyId); return r ? r.archetype : null; }
  function rivalOf(enemyId){ return state.rivals.find(r => r.enemy_id === enemyId) || null; }
  function byId(id){ return state.rivals.find(r => r.id === id) || null; }
  function active(){ return state.rivals.filter(r => r.alive_state !== 'confirmed_dead' && !r.pending && r.stage !== 'noticed'); }
  function dormant(){ return state.rivals.filter(r => r.alive_state !== 'confirmed_dead' && (r.pending || r.stage === 'noticed')); }
  function dead(){ return state.rivals.filter(r => r.alive_state === 'confirmed_dead'); }
  function all(){ return state.rivals; }

  // ── §7 MEMORY SELECTION: three slots, scored ───────────────────
  // most personal / most recent / most identity-defining. A memory may only be
  // referenced by an enemy that experienced it or received it from a named witness.
  function memoryScore(fact, rival, role){
    const age = Math.max(0, state.tick - fact.tick);
    const recency = 1 / (1 + age);
    let severity = 0;
    if (fact.outcome === 'player_defeated') severity += 1;
    if (fact.outcome === 'enemy_escaped') severity += 0.8;
    if (fact.outcome === 'enemy_killed') severity += 0.2;
    severity += 0.3 * (fact.casualty_ids || []).length;
    severity += 0.2 * (fact.damage_tags || []).length;
    const uniqueness = 1 / (1 + factsFor(fact.enemy_id).filter(x => x.outcome === fact.outcome).length);
    let relevance = 0.5;
    if (role === 'personal' && fact.outcome === 'player_defeated') relevance = 1;
    if (role === 'personal' && (fact.casualty_ids || []).length) relevance = 1;
    if (role === 'recent') relevance = recency;
    if (role === 'identity'){
      const m = rival ? rival.core_motive : null;
      if (m === 'revenge' && fact.outcome === 'player_defeated') relevance = 1;
      if (m === 'survival' && fact.outcome === 'enemy_escaped') relevance = 1;
      if (m === 'ambition' && (fact.player_tactic_tags || []).length > 1) relevance = 1;
    }
    return recency * 0.3 + severity * 0.4 + uniqueness * 0.1 + relevance * 0.2;
  }
  function selectMemories(rival){
    const known = factsFor(rival.enemy_id).filter(f =>
      (f.known_by || []).indexOf(rival.enemy_id) !== -1 || (f.participants || []).indexOf(rival.enemy_id) !== -1);
    if (!known.length) return [];
    const pick = (role) => known.slice().sort((a, b) => memoryScore(b, rival, role) - memoryScore(a, rival, role))[0];
    const slots = [];
    for (const role of ['personal', 'recent', 'identity']){
      const f = pick(role);
      if (f && slots.indexOf(f.encounter_id) === -1) slots.push(f.encounter_id);
    }
    for (const f of known){
      if (slots.length >= MEMORY_SLOTS) break;
      if (slots.indexOf(f.encounter_id) === -1) slots.push(f.encounter_id);
    }
    return slots.slice(0, MEMORY_SLOTS);
  }

  // ── §8 ADAPTATION from facts, knowledge-gated ──────────────────
  function factTagsFor(rival){
    const f = factsFor(rival.enemy_id).filter(x =>
      (x.known_by || []).indexOf(rival.enemy_id) !== -1 || (x.participants || []).indexOf(rival.enemy_id) !== -1);
    const tags = {};
    const types = {};
    const tactics = new Set();
    for (const x of f){
      for (const t of (x.player_tactic_tags || [])) tactics.add(t);
      for (const t of (x.damage_tags || [])){
        if (/^(praise|wisdom|warfare|fire|mercy|prophecy)$/.test(t)) types[t] = (types[t] || 0) + 1;
      }
      if (x.outcome === 'player_defeated') tags.killed_player = 1;
      if (x.outcome === 'player_escaped') tags.player_escaped = 1;
      if (x.outcome === 'enemy_escaped') tags.meaningful_survival = 1;
    }
    const top = Object.keys(types).sort((a, b) => types[b] - types[a])[0];
    if (top && types[top] >= 2){ tags.repeated_verse_type = 1; tags._topType = top; }
    for (const t of tactics){
      if (t === 'healing') tags.repeated_healing = 1;
      if (t === 'positioning') tags.repeated_positioning = 1;
    }
    // heavy wound: any single hit at or above 30 damage
    const big = Math.max(0, ...f.map(x => (x.damage_tags || []).some(t => t.startsWith('hit_')) ? parseInt(String((x.damage_tags || []).find(t => t.startsWith('hit_'))).slice(4), 10) || 0 : 0));
    if (big >= 30) tags.heavy_wound = 1;
    return tags;
  }
  function deriveAdaptations(rival){
    const tags = factTagsFor(rival);
    const have = (rival.adaptation_ids || []).map(a => a.split(':')[0]);
    const out = [];
    for (const id in RECIPES){
      if (have.indexOf(id) !== -1) continue;
      const rec = RECIPES[id];
      // prerequisites must be REAL facts about this rival (§15.6)
      if (!rec.requires.every(t => tags[t])) continue;
      // a rival cannot prepare for everything: recipes can forbid each other
      if (rec.forbids.some(x => have.indexOf(x) !== -1)) continue;
      out.push({ id, arg: (rec.name.indexOf('{arg}') !== -1 ? tags._topType : null) });
      if (have.length + out.length >= MAX_ADAPTATIONS) break;
    }
    return out;
  }

  // ── §15.4/§11 MISSING vs DEAD ──────────────────────────────────
  function cmdResolveEscape(p){
    const r = byId(p.rival_id) || rivalOf(p.enemy_id);
    if (!r) return { error: 'no rival' };
    if (r.alive_state === 'confirmed_dead') return { error: 'confirmed dead cannot escape' };
    const certain = !!p.certain;
    r.alive_state = certain ? 'alive' : 'missing';
    r.survival_record = certain ? null : {
      because: p.reason || 'it broke away; nothing confirmed a kill',
      resolve_before_tick: state.tick + 2,
      survival_chance: p.survival_chance !== undefined ? p.survival_chance : 0.85,
    };
    r.encounters_survived++;
    r.stage = stageFor(r.rivalry_score);
    r.confidence = Math.max(0, r.confidence - 0.1);
    r.last_seen = state.tick;
    r.next_collision_window = state.tick + MIN_TICKS_BETWEEN;
    addFactOutcome(r, 'enemy_escaped', p);
    refreshRival(r);
    emit('EnemyEscaped', { sources: (p.source_fact_ids || []), enemy_id: r.enemy_id, rival_id: r.id,
                           certain: certain, reason: p.reason || null });
    return { rival_id: r.id, alive_state: r.alive_state };
  }
  // Survival must be resolved before the rival can appear again, and it fails closed.
  function resolveSurvival(r){
    if (!r.survival_record) return r.alive_state === 'alive';
    // While the record is unresolved the rival simply cannot appear. It returns
    // only once survival has actually been decided, one way or the other.
    if (state.tick < r.survival_record.resolve_before_tick) return false;
    const roll = rnd();
    const survives = roll < r.survival_record.survival_chance;
    if (!survives){
      r.alive_state = 'confirmed_dead';
      r.survival_record = null;
      emit('EnemyConfirmedDeadAfterMissing', { sources: [], enemy_id: r.enemy_id, rival_id: r.id });
    } else {
      r.alive_state = 'alive';
      r.survival_record = null;
    }
    state.revision++;
    return r.alive_state === 'alive';
  }

  function addFactOutcome(r, outcome, p){
    // record the encounter as a fact, so memory and adaptation stay evidence-based
    dispatch('ResolveEncounter', {
      command_id: 'enc_' + r.id + '_' + state.tick + '_' + outcome,
      enemy_id: r.enemy_id,
      location_id: (p && p.location_id) || r.home_operation_id,
      participants: [r.enemy_id, 'player'],
      initiator: (p && p.initiator) || 'player',
      outcome: outcome,
      damage_tags: (p && p.damage_tags) || [],
      player_tactic_tags: (p && p.player_tactic_tags) || [],
      witness_ids: [],
      casualty_ids: (p && p.casualty_ids) || [],
      evidence_ids: (p && p.evidence_ids) || [],
    });
  }
  // Keep a rival's derived state consistent — this is the only place that writes
  // memories or adaptations, and it runs from facts, never from presentation.
  function refreshRival(r){
    r.dominant_memory_ids = selectMemories(r);
    const picks = deriveAdaptations(r);
    for (const p of picks){
      if (r.adaptation_ids.length >= MAX_ADAPTATIONS) break;
      r.adaptation_ids.push(p.id + (p.arg ? ':' + p.arg : ''));
      r.adaptations.push(materialise(p));
      emit('AdaptationPrepared', { sources: r.dominant_memory_ids, enemy_id: r.enemy_id,
                                   rival_id: r.id, recipe_id: p.id, arg: p.arg || null });
    }
    // wounds from any heavy hit fact
    for (const f of factsFor(r.enemy_id)){
      for (const t of (f.damage_tags || [])){
        if (t.startsWith('hit_') && (parseInt(t.slice(4), 10) || 0) >= 30 && r.wound_ids.indexOf(t) === -1) r.wound_ids.push(t);
      }
    }
    const cand = candidacy(r.enemy_id);
    r.rivalry_score = Math.max(r.rivalry_score, cand.score);
    r.stage = stageFor(r.rivalry_score);
    r.core_motive = deriveCoreMotive(r.enemy_id, factsFor(r.enemy_id).slice(-1)[0]);
    const tags = factTagsFor(r);
    for (const k in tags) if (k !== '_topType' && r.seen_tags.indexOf(k) === -1) r.seen_tags.push(k);
    // fear rises when the player repeatedly hurts it; respect rises with close fights
    r.hostility.fear = Math.min(1, r.hostility.fear + (r.wound_ids.length ? 0.05 : 0));
    r.hostility.respect = Math.min(1, r.hostility.respect + 0.03 * r.encounters_survived);
    r.confidence = Math.max(0.1, Math.min(1, 0.5 + 0.1 * r.encounters_survived - 0.05 * r.wound_ids.length));
  }
  function materialise(p){
    const rec = RECIPES[p.id];
    return {
      id: p.id, arg: p.arg || null,
      name: rec.name.replace('{arg}', p.arg || ''),
      behaviour_change: rec.behaviour_change,
      telegraph: rec.telegraph,
      counterplay: rec.counterplay,
      resource_cost: rec.resource_cost,
      expires_or_breaks_when: rec.expires_or_breaks_when,
    };
  }

  function cmdApplyAdaptation(p){
    const r = byId(p.rival_id) || rivalOf(p.enemy_id);
    if (!r) return { error: 'no rival' };
    if (r.alive_state === 'confirmed_dead') return { error: 'dead rivals cannot adapt' };
    const rec = RECIPES[p.recipe_id];
    if (!rec) return { error: 'unknown recipe' };
    if (r.adaptation_ids.length >= MAX_ADAPTATIONS) return { error: 'adaptation cap reached' };
    // §15.6: the prerequisites must be real facts involving this rival
    const tags = factTagsFor(r);
    if (!rec.requires.every(t => tags[t])) return { error: 'prerequisites are not real facts for this rival' };
    r.adaptation_ids.push(p.recipe_id + (p.arg ? ':' + p.arg : ''));
    r.adaptations.push(materialise({ id: p.recipe_id, arg: p.arg }));
    emit('AdaptationPrepared', { sources: p.source_fact_ids || r.dominant_memory_ids,
                                 enemy_id: r.enemy_id, rival_id: r.id, recipe_id: p.recipe_id });
    state.revision++;
    return { ok: true };
  }

  function cmdWitnessTransfer(p){
    const sender = p.sender, receiver = p.receiver, factId = p.fact_id;
    const fact = state.facts.find(f => f.encounter_id === factId);
    if (!fact) return { error: 'no such fact' };
    if ((fact.known_by || []).indexOf(sender) === -1) return { error: 'sender does not know this fact' };
    if (!receiver) return { error: 'receiver required' };
    fact.known_by.push(receiver);
    state.witnesses.push({ sender, receiver, fact_id: factId, tick: state.tick });
    emit('WitnessTransfer', { sources: [factId], sender, receiver });
    state.revision++;
    return { ok: true };
  }

  // ── §10 REMATCH DIRECTOR ───────────────────────────────────────
  function cmdScheduleCollision(p){
    const r = byId(p.rival_id) || rivalOf(p.enemy_id);
    if (!r) return { error: 'no rival' };
    const check = eligible(r, p);
    if (!check.ok) return { error: check.reason };
    r.exposure_budget = Math.max(0, r.exposure_budget - 1);
    r.last_seen = state.tick;
    r.next_collision_window = state.tick + MIN_TICKS_BETWEEN;
    state.lastCollisionTick = state.tick;
    state.encountersSinceCollision = 0;
    emit('RivalCollisionScheduled', { sources: p.source_fact_ids || [], enemy_id: r.enemy_id,
                                      rival_id: r.id, opportunity_id: p.opportunity_id || null,
                                      beat: currentBeat(r).kind });
    state.revision++;
    return { ok: true, rival_id: r.id };
  }
  function eligible(r, p){
    if (r.alive_state === 'confirmed_dead') return { ok: false, reason: 'dead' };
    if (r.alive_state === 'missing') return { ok: false, reason: 'survival unresolved' };
    if (r.exposure_budget <= 0) return { ok: false, reason: 'no exposure budget' };
    if (state.tick < r.next_collision_window) return { ok: false, reason: 'cooldown' };
    if (state.tick <= state.suppressionUntilTick) return { ok: false, reason: 'replacement suppressed' };
    if (state.encountersSinceCollision < MIN_ORDINARY_BETWEEN) return { ok: false, reason: 'needs an ordinary encounter between appearances' };
    const route = (p && p.route_id) || r.home_operation_id;
    if (!route) return { ok: false, reason: 'no physical route' };
    if (!(p && p.knows_player_location) && r.stage !== 'final') return { ok: false, reason: 'no knowledge of the player location' };
    return { ok: true };
  }
  // A new beat is required: adaptation, changed objective, consequence or final chance.
  function currentBeat(r){
    if (r.stage === 'final') return { kind: 'final', line: 'This is the last time one of us walks away.' };
    if (r.adaptation_ids.length) return { kind: 'adaptation', line: 'It has prepared for exactly what you did last time.' };
    if (r.alive_state === 'alive' && r.encounters_survived && r.wound_ids.length) return { kind: 'consequence', line: 'It carries what you did to it.' };
    if (r.core_motive) return { kind: 'objective', line: MOTIVES[r.core_motive] };
    return { kind: 'objective', line: 'It is here for something.' };
  }
  // The public entry the game calls.
  function collision(floor){
    state.tick++;
    state.encountersSinceCollision++;
    const pool = active().filter(r => r.exposure_budget > 0);
    const ready = [];
    for (const r of pool){
      if (r.alive_state === 'missing'){ resolveSurvival(r); if (r.alive_state !== 'alive') continue; }
      if (r.alive_state !== 'alive') continue;               // only the living take the field
      if (eligible(r, { knows_player_location: true, route_id: r.home_operation_id }).ok) ready.push(r);
    }
    if (!ready.length) return null;
    // score by causal relevance, proximity, novelty, unresolved stakes, pacing
    const lastSched = state.events.filter(e => e.type === 'RivalCollisionScheduled').slice(-1)[0];
    let best = null, bestScore = -1;
    for (const r of ready){
      // hard exclusion: the same enemy at the same place with the same beat shape
      // must never follow itself. A repeat is only allowed if something changed.
      if (lastSched && lastSched.rival_id === r.id && lastSched.opportunity_id === r.home_operation_id &&
          lastSched.beat === currentBeat(r).kind){
        continue;
      }
      let s = 0;
      s += r.rivalry_score * 0.15;
      if (r.adaptation_ids.length) s += 1.2;                       // novelty: something new is prepared
      if (r.core_motive === 'revenge') s += 0.8;
      if (r.hostility.obsession > 0.6) s += 0.6;
      if (r.stage === 'final') s += 1.0;                            // unresolved stakes
      if (r.hostility.discipline > 0.7) s += 0.3;
      if (r.encounters_survived > 2) s += 0.4;
      // §15.12: never repeat the same enemy+motive+location+outcome shape twice running
      if (lastSched && lastSched.rival_id === r.id) s -= 1.2;      // still discourage immediate repeats
      if (lastSched && lastSched.opportunity_id === r.home_operation_id) s -= 0.4;
      if (s > bestScore){ bestScore = s; best = r; }
    }
    if (!best) return null;
    const chance = Math.min(0.7, 0.3 + bestScore * 0.06);
    if (rnd() > chance){ return null; }        // the director proposes; it does not force
    const sched = dispatch('ScheduleCollision', {
      command_id: 'col_' + best.id + '_' + state.tick,
      rival_id: best.id, opportunity_id: best.home_operation_id,
      route_id: best.home_operation_id, knows_player_location: true,
    });
    if (sched.error) return null;
    return best;
  }
  // §10 indirect presence: presence should be rarer than influence.
  function indirectPresence(floor){
    const r = active().filter(x => x.alive_state === 'alive' && x.id !== (state.events.slice(-1)[0] || {}).rival_id)[0];
    if (!r) return null;
    const lines = [
      'Its squad falls back in better order than last time — it has been drilling them.',
      'The cache here is already stripped; someone prepared this ground before you arrived.',
      'A patrol turns away before you reach it. They were told not to engage you yet.',
      'The approach is fortified in one place only, exactly where you came through last time.',
    ];
    return { rival: r, text: lines[r.visual_seed % lines.length] };
  }

  // ── §11 CONFIRMED DEATH ────────────────────────────────────────
  function cmdConfirmDeath(p){
    const r = byId(p.rival_id) || rivalOf(p.enemy_id);
    if (!r) return { error: 'no rival' };
    if (r.alive_state === 'confirmed_dead') return { ok: true, already: true };   // irreversible, idempotent
    r.alive_state = 'confirmed_dead';
    r.survival_record = null;
    r.confirmations++;
    r.wound_ids.push('confirmed_death');
    state.kills++;
    // record the killing encounter as a fact
    addFactOutcome(r, 'enemy_killed', p);
    // vacate the operation and release what it held
    const vac = {
      operation: r.home_operation_id,          // alias: the game-facing name
      operation_id: r.home_operation_id,
      enemy_id: r.enemy_id,
      rival_id: r.id,
      tick: state.tick,
      cause_event_id: (p && p.cause_event_id) || null,
      witnesses: (p && p.witness_ids) || [],
      inheritance: { gold: 25 + 10 * r.encounters_survived, verse: true,
                     assets: (r.adaptation_ids || []).slice(0, 1).map(id => id.split(':')[0]) },
      destabilized: Math.min(3, 1 + Math.floor(r.encounters_survived / 2)),
      claimed_by: null,
    };
    state.vacancies.push(vac);
    emit('RivalKilled', { sources: [factsFor(r.enemy_id).slice(-1)[0].encounter_id], enemy_id: r.enemy_id,
                          rival_id: r.id, cause_event_id: vac.cause_event_id, witnesses: vac.witnesses });
    emit('OperationVacated', { sources: [], operation_id: vac.operation_id, rival_id: r.id });
    // §11: choose ZERO OR ONE successor, through a factual edge only
    const heir = chooseSuccessor(r, vac);
    if (heir){
      heir.pending = true;
      state.rivals.push(heir);
      vac.claimed_by = heir.id;
      emit('SuccessorClaimedAsset', { sources: [vac.operation_id], rival_id: heir.id,
                                      inherited_from: r.id, operation_id: vac.operation_id });
    }
    // §11: suppress immediate replacement so the kill can breathe
    state.suppressionUntilTick = state.tick + REPLACEMENT_SUPPRESSION;
    state.revision++;
    refreshActive();
    return { vacancy: vac, heir: heir ? heir.id : null };
  }
  // A successor inherits ASSETS and FACTS — never personality, never first-person
  // memory (§11/§15.11). It walks into a vacancy with a reason, not a biography.
  function chooseSuccessor(deadRival, vac){
    const edges = edgesOf(deadRival.enemy_id).filter(e => e.relation === 'commands' || e.relation === 'owes' ||
      e.relation === 'witnessed_death' || e.relation === 'seeks_revenge');
    if (!edges.length) return null;                       // zero is a valid answer
    if (state.kills >= 6) return null;                    // §15.15: no infinite replacement treadmill
    const seed = 'heir_' + hashStr(deadRival.enemy_id + state.tick).slice(0, 8);
    if (state.rivals.some(r => r.id === seed)) return null;
    const heir = newRival(deadRival.enemy_id + '_heir', {
      name: 'The Successor',
      archetype: deadRival.archetype,
      tier: deadRival.tier,
      loadout: vac.inheritance.assets[0] || 'plain',
      floor: 1,
    }, 3, null);
    heir.id = seed;
    heir.successor_of = deadRival.id;
    heir.inherited_assets = {
      operation_id: vac.operation_id,
      equipment: vac.inheritance.assets,
      evidence: factsFor(deadRival.enemy_id).map(f => f.encounter_id).slice(-2),
      debt: vac.inheritance.gold,
      reason: 'witnessed the death of ' + deadRival.name,
    };
    // a genuinely different person: fresh hostility, no memories, no adaptations
    heir.hostility = pickHostility(deadRival.archetype);
    heir.dominant_memory_ids = [];
    heir.adaptation_ids = [];
    heir.adaptations = [];
    heir.core_motive = 'revenge';
    heir.rivalry_score = 3;
    heir.stage = 'noticed';
    heir.exposure_budget = 1;
    heir.next_collision_window = state.tick + REPLACEMENT_SUPPRESSION;
    ensureNode(deadRival.enemy_id, 'enemy', deadRival.archetype);
    addEdge(heir.enemy_id, deadRival.enemy_id, 'witnessed_death', 1);
    addEdge(heir.enemy_id, vac.operation_id, 'commands', 1);
    return heir;
  }
  function refreshActive(){
    for (const r of state.rivals){
      if (r.alive_state === 'confirmed_dead') continue;
      r.stage = stageFor(r.rivalry_score);
    }
  }
  // Vacancy consequences: relief AND instability (§11). Killing one thing solves
  // something and unsettles something else.
  function vacancyConsequences(floor){
    return state.vacancies.filter(v => state.tick - v.tick <= 4);
  }
  function aggressionBonus(floor){
    return vacancyConsequences(floor).reduce((s, v) => s + v.destabilized, 0);
  }
  function reliefBonus(floor){
    // the vacated operation stops supplying its neighbours for a while
    return vacancyConsequences(floor).length;
  }

  // ── §12 PRESENTATION: dialogue planner, knowledge-gated ────────
  // speaker knowledge + dominant memory + motive + beat -> validated meaning packet
  // -> authored line family. It can never reference a fact this rival does not know.
  function planner(enemyId, beat){
    const r = rivalOf(enemyId) || byId(enemyId);
    if (!r) return { error: 'no rival' };
    if (r.alive_state === 'confirmed_dead') return { error: 'the dead do not speak' };
    const memories = (r.dominant_memory_ids || [])
      .map(id => state.facts.find(f => f.encounter_id === id))
      .filter(f => f && ((f.known_by || []).indexOf(r.enemy_id) !== -1 || (f.participants || []).indexOf(r.enemy_id) !== -1));
    if (!memories.length) return { meaning: null, line: null, reason: 'no known fact to speak from' };
    const mem = memories[0];
    const meaning = {
      speaker: r.enemy_id,
      motive: r.core_motive,
      beat: beat || currentBeat(r).kind,
      fact_id: mem.encounter_id,
      fact_outcome: mem.outcome,
      tags: (mem.damage_tags || []).concat(mem.player_tactic_tags || []),
      hostility: r.hostility,
      // never a hidden value: no HP, no unseen action
      reveal: { weakness: r.adaptations.some(a => a.id === 'hunter'), stage: r.stage },
    };
    const line = renderLine(meaning, mem, r);
    return { meaning, line };
  }
  function renderLine(meaning, fact, r){
    const tag = (fact.player_tactic_tags || [])[0] || (fact.damage_tags || [])[0] || null;
    const where = fact.location_id;
    const families = {
      player_defeated: [
        'I have watched you fall at ' + where + '. It did not surprise me.',
        'You died at ' + where + '. I was there. I remember what it cost you.',
      ],
      enemy_escaped: [
        'I smelled the oil before your spark this time. That is why I am still here.',
        'You had me at ' + where + '. I have thought about it every hour since.',
      ],
      player_escaped: [
        'You ran from me at ' + where + '. I have not stopped walking since.',
        'You left ' + where + ' quickly. I counted the steps.',
      ],
      enemy_killed: ['...'],
    };
    const fam = families[fact.outcome] || ['I know what happened at ' + where + '.'];
    let line = fam[r.visual_seed % fam.length];
    if (tag && meaning.hostility && meaning.hostility.respect > 0.6)
      line += ' You used ' + String(tag).replace(/_/g, ' ') + '. I have an answer for it.';
    if (meaning.reveal.weakness) line += ' My guard is open to mercy — I will not pretend otherwise.';
    return line;
  }
  // The public dossier may only show player-known facts (§15.13).
  function dossier(enemyId){
    const r = rivalOf(enemyId) || byId(enemyId);
    if (!r) return null;
    return {
      name: r.name,
      stage: r.stage,
      alive_state: r.alive_state,
      motive: r.dossier.known_motive ? MOTIVES[r.core_motive] : null,
      known_adaptations: r.dossier.known_adaptations.slice(),
      known_crimes: r.dossier.known_crimes.slice(),
      // deliberately absent: exact HP, unseen tactics, adaptation prerequisites
    };
  }
  // The player learns things by surviving contact with the rival.
  function learnAbout(rival, what){
    if (what === 'motive' && !rival.dossier.known_motive) rival.dossier.known_motive = true;
    if (what && what.adaptation && rival.dossier.known_adaptations.indexOf(what.adaptation) === -1)
      rival.dossier.known_adaptations.push(what.adaptation);
    if (what && what.crime && rival.dossier.known_crimes.indexOf(what.crime) === -1)
      rival.dossier.known_crimes.push(what.crime);
  }

  // ── game-facing wrappers (these are the ONLY paths the game uses) ──
  function recordHit(rival, verseType, damage, floor, twist){
    if (!rival) return;
    const r = byId(rival.id) || rival;
    const tags = [];
    if (verseType) tags.push(String(verseType));
    tags.push('hit_' + Math.max(0, Math.round(damage || 0)));
    dispatch('ResolveEncounter', {
      command_id: 'hit_' + r.id + '_' + state.tick + '_' + Math.round(damage || 0),
      enemy_id: r.enemy_id, location_id: r.home_operation_id,
      participants: [r.enemy_id, 'player'], initiator: 'player',
      outcome: 'enemy_wounded',
      damage_tags: tags,
      player_tactic_tags: [], witness_ids: [], casualty_ids: [], evidence_ids: [],
    });
    refreshRival(r);
    save();
  }
  function recordPlayerFlee(rival, floor){
    const r = byId(rival.id) || rival; if (!r) return;
    addFactOutcome(r, 'player_escaped', { location_id: r.home_operation_id });
    r.core_motive = deriveCoreMotive(r.enemy_id, factsFor(r.enemy_id).slice(-1)[0]);
    r.encounters_survived++;
    refreshRival(r);
    learnAbout(r, 'motive');
    save();
  }
  function recordPlayerDefeat(rival, floor){
    const r = byId(rival.id) || rival; if (!r) return;
    addFactOutcome(r, 'player_defeated', { location_id: r.home_operation_id, initiator: r.enemy_id });
    r.encounters_survived++;
    r.confidence = Math.min(1, r.confidence + 0.15);
    refreshRival(r);
    save();
  }
  function recordRivalFlee(rival, floor){
    const r = byId(rival.id) || rival; if (!r) return;
    dispatch('ResolveEnemyEscape', {
      command_id: 'esc_' + r.id + '_' + state.tick,
      rival_id: r.id, certain: true, reason: 'it broke away in the open',
      survival_chance: 1, location_id: r.home_operation_id,
    });
    refreshRival(r);
    save();
  }
  function recordKill(rival, floor){
    const r = byId(rival.id) || rival; if (!r) return null;
    const res = dispatch('ConfirmEnemyDeath', {
      command_id: 'kill_' + r.id + '_' + state.tick,
      rival_id: r.id, cause_event_id: 'combat_' + state.tick, witness_ids: [],
    });
    save();
    return res.result && res.result.vacancy ? res.result.vacancy : null;
  }
  function tickFloor(floor){
    state.tick++;
    for (const r of state.rivals){
      if (r.pending && state.tick >= r.last_seen + 1) r.pending = false;
      if (r.alive_state === 'missing' && r.survival_record && state.tick >= r.survival_record.resolve_before_tick) resolveSurvival(r);
      if (r.alive_state === 'alive') r.exposure_budget = Math.min(2, r.exposure_budget + (state.tick % 2 === 0 ? 1 : 0));
    }
    state.vacancies = state.vacancies.filter(v => state.tick - v.tick <= 4);
    save();
  }

  // ── §12 multi-channel presentation helpers ─────────────────────
  // Body / combat / world / aftermath: at least two channels per meaningful change.
  function visual(ctx){
    // body channel: a scarred rival reads differently in the roster and in combat
    return (state.rivals.filter(r => r.wound_ids.length && r.alive_state === 'alive').length);
  }
  function combatChannels(r){
    const out = [];
    if (!r) return out;
    out.push({ channel: 'combat', detail: r.adaptation_ids.length ? 'changed spacing: it keeps out of your favoured line' : 'no change yet' });
    if (r.hostility.discipline > 0.7) out.push({ channel: 'combat', detail: 'retreats in order rather than dying in place' });
    if (r.hostility.cruelty > 0.6) out.push({ channel: 'world', detail: 'leaves traps and expendable squads behind it' });
    if (r.wound_ids.length) out.push({ channel: 'body', detail: 'carries ' + r.wound_ids.length + ' visible wound(s)' });
    return out;
  }

  function epithet(r){
    if (!r) return '';
    if (r.successor_of) return 'The Successor at ' + (r.inherited_assets ? r.inherited_assets.operation_id : 'the vacancy');
    const f = factsFor(r.enemy_id);
    const killed = f.some(x => x.outcome === 'player_defeated');
    const fled = f.some(x => x.outcome === 'player_escaped');
    const survived = r.encounters_survived;
    if (killed) return r.name + ', Your Undoing';
    if (fled) return r.name + ', the Hunter';
    if (survived >= 2) return r.name + ', Twice-Risen';
    if (r.wound_ids.length) return r.name + ' the Scarred';
    return r.name;
  }
  function adaptLine(a){ return a && a.name ? a.name : ''; }
  function adaptProblem(a){ return a && a.behaviour_change ? a.behaviour_change : ''; }
  function adaptOpening(a){ return a && a.counterplay ? a.counterplay : ''; }
  function adaptTelegraph(a){ return a && a.telegraph ? a.telegraph : ''; }

  // ── damage / attack modifiers (unchanged surface, fact-driven internals) ──
  function damageModifier(rival, verseType, selectedTypes, demon){
    const r = rival ? (byId(rival.id) || rival) : null;
    if (!r || r.alive_state === 'confirmed_dead') return { mult: 1, notes: [] };
    const notes = [];
    let mult = 1;
    for (const a of (r.adaptations || [])){
      const rec = RECIPES[a.id];
      if (!rec) continue;
      const broken = rec.breaksBelow && demon && demon.hp <= (demon.maxHp || 1) * rec.breaksBelow;
      if (a.id === 'wary_of_type' && a.arg === verseType){
        if (broken){ notes.push('GUARD BROKEN'); }
        else {
          mult *= 0.75; notes.push('WARY -25%');
          if (selectedTypes && selectedTypes.some(t => t !== a.arg && t !== verseType)){
            mult *= 1.2; notes.push('OPENING +20%');
          }
        }
      }
      if (rec.atk && a.id === 'scarred' && demon && demon.hp <= (demon.maxHp || 1) * 0.4){
        mult *= 1.25; notes.push('GUARD BROKEN +25%');
      }
    }
    return { mult, notes };
  }
  function attackModifier(rival){
    const r = rival ? (byId(rival.id) || rival) : null;
    if (!r || r.alive_state !== 'alive') return 1;
    let m = 1;
    for (const a of (r.adaptations || [])){
      const rec = RECIPES[a.id];
      if (!rec || !rec.atk) continue;
      if (rec.onlyWhenPlayerHurt && !(game && game.hp < game.maxHp * 0.5)) continue;
      m *= rec.atk;
    }
    return m;
  }
  function fatiguePressure(rival){
    const r = rival ? (byId(rival.id) || rival) : null;
    return !!(r && (r.adaptations || []).some(a => a.id === 'cadence_breaker'));
  }
  function adapter(rival, demon){
    const f = factsFor(rival.enemy_id);
    const scale = 1 + Math.min(0.6, rival.encounters_survived * 0.12);   // survives, never inflates forever
    const out = Object.assign({}, demon);
    out.hp = Math.floor((demon.hp || 40) * scale);
    out.maxHp = out.hp;
    out.name = epithet(rival);
    out.isRival = true;
    out.rivalId = rival.id;
    out.gold = (demon.gold || 15) + 5 * rival.encounters_survived;
    for (const a of (rival.adaptations || [])){
      const rec = RECIPES[a.id];
      if (!rec) continue;
      if (rec.maxHpMult){ out.hp = Math.floor(out.hp * rec.maxHpMult); out.maxHp = out.hp; }
      if (a.id === 'wary_of_type') out._rivalResist = a.arg;
      if (rec.fatiguePressure) out._rivalFatigue = true;
      if (rec.revealsWeakness) out._rivalTaunt = true;
    }
    out.combatMsg = MOTIVES[rival.core_motive] || MOTIVES.duty;
    return out;
  }

  // ── foreshadowing ──────────────────────────────────────────────
  function foreshadow(floor){
    const ready = active().filter(r => r.alive_state === 'alive');
    if (!ready.length) return null;
    const r = ready.slice().sort((a, b) => b.rivalry_score - a.rivalry_score)[0];
    const a = (r.adaptations || [])[0];
    const lines = a ? [a.telegraph] : [
      'Tracks that double back on themselves. It is circling you.',
      'Scratches at eye height, fresh, and pointed the way you came.',
    ];
    return { rival: r, epithet: epithet(r), text: lines[r.visual_seed % lines.length],
             stage: r.stage, beat: currentBeat(r).kind };
  }
  function renderStrip(x, y){
    const f = foreshadow(game.floor);
    if (!f){ text('NO RIVALS IN THE FIELD', x, y, C.dim, 4, 'left'); return; }
    text('* ' + f.epithet + ' [' + f.stage + '] - ' + (f.rival.adaptations[0] ? f.rival.adaptations[0].name : MOTIVES[f.rival.core_motive]), x, y, C.red, 4, 'left');
  }

  // ── roster (dossier rules: player-known only) ──────────────────
  function renderRoster(){
    const W2 = W, H2 = H;
    rect(8, 8, W2 - 16, H2 - 16, '#0b0917');
    strokeRect(8, 8, W2 - 16, H2 - 16, C.red);
    text('VENDETTA', W2 / 2, 14, C.red, 10, 'center');
    const list = active();
    text(list.length + ' IN THE FIELD   ' + dormant().length + ' DORMANT   ' + dead().length + ' DEAD',
         W2 / 2, 27, C.dim, 4, 'center');
    if (!list.length){
      text('None have survived you yet.', W2 / 2, H2 / 2, C.dim, 7, 'center');
      text('Tap anywhere to close.', W2 / 2, H2 / 2 + 14, C.dim, 5, 'center');
      return;
    }
    const INNER = W2 - 38;
    const LINE = 6;
    const LIMIT = H2 - 26;               // reserve the close prompt at H2-15
    let y = 36;
    let shownCount = 0;
    const room = () => y < LIMIT;
    const linesFor = (txt, size) => wrapTextPx(txt, INNER, size || 4);
    // all-or-nothing: a sentence is emitted whole or not at all, so nothing is ever
    // cut mid-line at the panel edge.
    const emit = (txt, colour, size) => {
      const ls = linesFor(txt, size);
      if ((y + ls.length * LINE) > LIMIT) return false;
      for (const l of ls){ text(l, 16, y, colour, size || 4, 'left'); y += LINE; }
      return true;
    };
    for (const r of list.slice(0, 3)){
      if (!room()) break;
      shownCount++;
      if ((y + 11) > LIMIT) break;
      text(epithet(r), 16, y, C.holy, 7, 'left'); y += 10;
      const hist = [r.stage, 'met x' + r.encounters_survived];
      if (r.wound_ids.length) hist.push(r.wound_ids.length + ' wounds');
      if (!emit(hist.join(' · '), C.cyan)) break;
      if (!emit(MOTIVES[r.core_motive] || '', C.white)) break;
      const mem = (r.dominant_memory_ids || []).map(id => state.facts.find(x => x.encounter_id === id)).filter(Boolean)[0];
      if (mem){
        const canTell = r.dossier.known_crimes.length > 0 || r.dossier.known_motive;
        if (!emit(canTell ? ('it remembers: ' + mem.outcome.replace(/_/g, ' ') + ' at ' + mem.location_id)
                          : 'it remembers something you cannot name yet', C.dim)) break;
      }
      let truncated = false;
      for (const a of (r.adaptations || [])){
        // measure the whole adaptation first: behaviour + tell + counter travel together
        const trio = [
          ['> ' + a.name + ' - ' + a.behaviour_change, C.gold],
          ['  tell: ' + a.telegraph, C.cyan],
          ['  counter: ' + a.counterplay, C.green],
        ];
        const need = trio.reduce((n, t) => n + linesFor(t[0], 4).length, 0) * LINE + 2;
        if ((y + need) > LIMIT){ truncated = true; break; }
        for (const t of trio) emit(t[0], t[1]);
        y += 1;
      }
      if (truncated){ text('  ...', 16, y, C.dim, 4, 'left'); break; }
      y += 5;
    }
    if (list.length > shownCount)
      text('+' + (list.length - shownCount) + ' more in the field', 16, Math.min(y, LIMIT), C.dim, 4, 'left');
    text('Tap anywhere to close.', W2 / 2, H2 - 15, C.dim, 5, 'center');
  }

  // ── §15.1 snapshot: byte-identical for the same seed + commands ──
  function snapshot(){ return JSON.stringify(state); }

  init();
  return {
    // lifecycle
    init, save, reset, snapshot,
    // reads
    all, active, dormant, dead, byId, rivalOf, factsFor, candidacy,
    dominantMemories: selectMemories, dossier, planner, currentBeat, indirectPresence,
    combatChannels, edgesOf, vacancyConsequences, aggressionBonus, reliefBonus,
    // game-facing writes (all command-backed)
    considerPromotion, collision, adapter, openingLine: (r) => MOTIVES[r.core_motive] || MOTIVES.duty,
    damageModifier, attackModifier, fatiguePressure,
    recordHit, recordPlayerFlee, recordPlayerDefeat, recordRivalFlee, recordKill,
    tickFloor, learnAbout,
    // presentation
    epithet, foreshadow, renderStrip, renderRoster,
    adaptLine, adaptProblem, adaptOpening, adaptTelegraph,
    // introspection for the test suite
    _dispatch: dispatch, _events: () => state.events, _recipes: RECIPES,
    get stateRef(){ return state; },
    get state(){ return state; },
  };
})();
