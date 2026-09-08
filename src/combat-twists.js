// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Combat Twist System
// Enemies that don't fight fair. No more "attack attack attack".
// Expanded: 33 twists + bossTwistCombo system.
// ═══════════════════════════════════════════════════════════════

const CombatTwists = {
  // ── TWIST TYPES (constants, kept for integration) ────────
  REINFORCEMENTS: 'reinforcements',
  FLEE_ATTACK:    'flee_attack',
  SWARM:          'swarm',
  ADAPTIVE:       'adaptive',
  BAIT:           'bait',
  MIRROR:         'mirror',
  SACRIFICE:      'sacrifice',
  PHASE_SHIFT:    'phase_shift',
  SUMMON_CIRCLE:  'summon_circle',
  DESPERATION:    'desperation',
  // ── NEW TWIST TYPES ──────────────────────────────────────
  HEALING_AURA:   'healing_aura',
  THORNS:         'thorns',
  PHASE_WALK:     'phase_walk',
  BLOOD_PRICE:    'blood_price',
  CURSE:          'curse',
  ABSORB:         'absorb',
  SHADOW_CLONE:   'shadow_clone',
  TIME_SLOW:      'time_slow',
  RAGE_MODE:      'rage_mode',
  SHIELD_GENERATOR: 'shield_generator',
  TRAP_LAY:       'trap_lay',
  FEAR_AURA:      'fear_aura',
  DRAIN_LIFE:     'drain_life',
  VOLATILE:       'volatile',
  UNDYING:        'undying',
  SPLIT:          'split',
  CONTAMINATE:    'contaminate',
  MUTE:           'mute',
  STEAL:          'steal',
  REVENGE:        'revenge',
  CONSECUTIVE:    'consecutive',
  PARRY:          'parry',
  ADAPTIVE_SHIELD:'adaptive_shield',

  // ── TWIST DATABASE ────────────────────────────────────────
  twists: [
    {
      type: 'reinforcements',
      name: 'Call for Aid',
      description: 'The demon screams for help. Reinforcements incoming!',
      trigger: 'hp_below_50',
      effect: (combat, game) => {
        const count = RNG.randint(1, 3);
        const adds = [];
        for (let i = 0; i < count; i++) {
          const add = generateGenericDemon(game.floor);
          add.hp = Math.floor(add.hp * 0.5);
          add.maxHp = add.hp;
          add.name = `Lesser ${add.name}`;
          adds.push(add);
        }
        return {
          adds,
          message: `Reinforcements! ${count} lesser demon${count > 1 ? 's' : ''} appear!`,
        };
      },
    },
    {
      type: 'flee_attack',
      name: 'Coward\'s Strike',
      description: 'The demon retreats... but watches, waiting.',
      trigger: 'hp_below_30',
      effect: (combat, game) => ({
        flee: true,
        message: `${combat.demon.name} flees into the shadows!`,
        returnCondition: 'player_hp_below_50',
        returnMessage: `${combat.demon.name} returns while you\'re weakened!`,
        returnDamage: Math.floor(combat.demon.maxHp * 0.3),
      }),
    },
    {
      type: 'swarm',
      name: 'Legion\'s Swarm',
      description: 'A swarm of lesser demons rushes you! Survive!',
      trigger: 'boss_only',
      effect: (combat, game) => ({
        timerMode: true,
        timer: 20,
        swarmCount: 5 + game.floor,
        message: 'The swarm attacks! Survive for 20 seconds!',
        reward: 'stun_boss',
      }),
    },
    {
      type: 'adaptive',
      name: 'Learns Your Ways',
      description: 'The demon watches your verses. It begins to adapt.',
      trigger: 'always',
      effect: (combat, game) => {
        const usedTypes = combat.playerVerseHistory || [];
        if (usedTypes.length >= 2) {
          const lastType = usedTypes[usedTypes.length - 1];
          return {
            resistance: lastType,
            message: `${combat.demon.name} resists ${lastType}! It learned from your last verse!`,
          };
        }
        return null;
      },
    },
    {
      type: 'bait',
      name: 'False Weakness',
      description: 'The demon shows a fake weakness. Punish the wrong choice.',
      trigger: 'random_30',
      effect: (combat, game) => {
        const realWeak = combat.demon.weakTo;
        const allTypes = ['praise', 'wisdom', 'warfare', 'fire', 'mercy'];
        const fakeTypes = allTypes.filter(t => t !== realWeak);
        const fakeWeak = RNG.choice(fakeTypes);
        return {
          showWeakness: fakeWeak,
          realWeakness: realWeak,
          message: `${combat.demon.name} seems vulnerable to ${fakeWeak}...`,
        };
      },
    },
    {
      type: 'mirror',
      name: 'Mirror Image',
      description: 'The demon copies your last attack.',
      trigger: 'after_player_attack',
      effect: (combat, game) => {
        if (combat.lastPlayerDamage > 0) {
          return {
            mirrorDamage: Math.floor(combat.lastPlayerDamage * 0.7),
            message: `${combat.demon.name} mirrors your attack! -${Math.floor(combat.lastPlayerDamage * 0.7)} HP!`,
          };
        }
        return null;
      },
    },
    {
      type: 'sacrifice',
      name: 'Dark Communion',
      description: 'The demon sacrifices its allies to heal itself.',
      trigger: 'minions_alive',
      effect: (combat, game) => {
        if (combat.adds && combat.adds.length > 0) {
          const sacrificed = combat.adds.shift();
          const heal = Math.floor(sacrificed.maxHp * 0.8);
          combat.demon.hp = Math.min(combat.demon.maxHp, combat.demon.hp + heal);
          return {
            message: `${combat.demon.name} devours ${sacrificed.name}! +${heal} HP!`,
          };
        }
        return null;
      },
    },
    {
      type: 'phase_shift',
      name: 'Phase Shift',
      description: 'The demon becomes intangible. Only specific verses can hurt it.',
      trigger: 'hp_below_40',
      effect: (combat, game) => ({
        immuneTo: ['praise', 'mercy'],
        message: `${combat.demon.name} shifts out of reality! Only Warfare, Fire, and Wisdom can reach it!`,
        duration: 2,
      }),
    },
    {
      type: 'summon_circle',
      name: 'Summoning Circle',
      description: 'A circle of fire appears. Break it or face what comes through.',
      trigger: 'turn_3',
      effect: (combat, game) => ({
        miniObjective: 'destroy_circle',
        circleHp: 30 + game.floor * 5,
        message: 'A summoning circle appears! Destroy it before something comes through!',
        failure: 'summon_boss',
        success: 'stun_demon',
      }),
    },
    {
      type: 'desperation',
      name: 'Enrage',
      description: 'At death\'s door, the demon unleashes its true power.',
      trigger: 'hp_below_15',
      effect: (combat, game) => ({
        attackBuff: 2.0,
        speedBuff: 1.5,
        message: `${combat.demon.name} ENRAGES! It attacks with desperate fury!`,
      }),
    },

    // ═════════════════════════════════════════════════════════
    // NEW TWISTS
    // ═════════════════════════════════════════════════════════
    {
      type: 'healing_aura',
      name: 'Healing Aura',
      description: 'The demon radiates foul light, mending itself each turn.',
      trigger: 'always',
      effect: (combat, game) => ({
        healPerTurn: Math.floor(combat.demon.maxHp * 0.05),
        message: `${combat.demon.name} heals ${Math.floor(combat.demon.maxHp * 0.05)} HP from its aura.`,
      }),
    },
    {
      type: 'thorns',
      name: 'Thorns of Sin',
      description: 'Your attacks bounce back. Damage reflects to you.',
      trigger: 'always',
      effect: (combat, game) => {
        const reflect = combat.lastPlayerDamage > 0 ? Math.floor(combat.lastPlayerDamage * 0.4) : 0;
        if (reflect > 0) {
          return {
            reflectDamage: reflect,
            message: `Thorns! ${reflect} of your damage reflects back! -${reflect} HP.`,
          };
        }
        return null;
      },
    },
    {
      type: 'phase_walk',
      name: 'Phase Walk',
      description: 'The demon slips between worlds — untargetable for a turn.',
      trigger: 'turn_even',
      effect: (combat, game) => ({
        untargetable: 1,
        message: `${combat.demon.name} phases out of reach! Your next verse misses.`,
      }),
    },
    {
      type: 'blood_price',
      name: 'Blood Price',
      description: 'Every wound the demon deals empowers it.',
      trigger: 'after_enemy_attack',
      effect: (combat, game) => {
        const dmg = combat.lastEnemyDamage > 0 ? combat.lastEnemyDamage : 0;
        if (dmg > 0) {
          return {
            enemyBuff: Math.floor(dmg * 0.2),
            message: `${combat.demon.name} drinks your blood! +${Math.floor(dmg * 0.2)} attack.`,
          };
        }
        return null;
      },
    },
    {
      type: 'curse',
      name: 'Lingering Curse',
      description: 'A debuff clings to you across turns.',
      trigger: 'always',
      effect: (combat, game) => ({
        curse: { type: RNG.choice(['weaken', 'blind', 'slow']), duration: 3 },
        message: `A curse takes hold: ${RNG.choice(['your verses weaken', 'your sight dims', 'your timer slows'])} for 3 turns.`,
      }),
    },
    {
      type: 'absorb',
      name: 'Verse Absorption',
      description: 'The demon drinks your verse and gains its effect.',
      trigger: 'after_player_attack',
      effect: (combat, game) => {
        if (combat.lastPlayerVerseType) {
          return {
            absorbType: combat.lastPlayerVerseType,
            message: `${combat.demon.name} absorbs your ${combat.lastPlayerVerseType} verse and turns it against you!`,
          };
        }
        return null;
      },
    },
    {
      type: 'shadow_clone',
      name: 'Shadow Clone',
      description: 'The demon splits off a copy of itself.',
      trigger: 'hp_below_60',
      effect: (combat, game) => {
        const clone = generateGenericDemon(game.floor);
        clone.hp = Math.floor(combat.demon.hp * 0.4);
        clone.maxHp = clone.hp;
        clone.name = `Shadow of ${combat.demon.name}`;
        return {
          adds: [clone],
          message: `${combat.demon.name} spawns a shadow clone!`,
        };
      },
    },
    {
      type: 'time_slow',
      name: 'Time Slow',
      description: 'The demon warps time. Your timer crawls.',
      trigger: 'always',
      effect: (combat, game) => ({
        timePenalty: 3,
        message: `${combat.demon.name} slows time. Your timer loses 3 seconds.`,
      }),
    },
    {
      type: 'rage_mode',
      name: 'Rage Mode',
      description: 'The demon attacks twice every turn.',
      trigger: 'hp_below_50',
      effect: (combat, game) => ({
        extraAttack: 1,
        message: `${combat.demon.name} enters RAGE! It strikes twice!`,
      }),
    },
    {
      type: 'shield_generator',
      name: 'Shield Generator',
      description: 'Each turn the demon forges a shield.',
      trigger: 'always',
      effect: (combat, game) => ({
        shieldPerTurn: 12 + game.floor,
        message: `${combat.demon.name} generates a ${12 + game.floor} shield.`,
      }),
    },
    {
      type: 'trap_lay',
      name: 'Trap Layer',
      description: 'The demon seeds traps that bite on your turn.',
      trigger: 'turn_odd',
      effect: (combat, game) => ({
        trapDamage: RNG.randint(4, 10),
        message: `${combat.demon.name} lays a trap. ${RNG.randint(4, 10)} damage waits on your move.`,
      }),
    },
    {
      type: 'fear_aura',
      name: 'Fear Aura',
      description: 'Dread thickens the air. Your timer slips away.',
      trigger: 'always',
      effect: (combat, game) => ({
        timePenalty: 5,
        message: `${combat.demon.name}'s fear aura drains 5 seconds from your timer.`,
      }),
    },
    {
      type: 'drain_life',
      name: 'Life Drain',
      description: 'Each wound it deals, it drinks to heal.',
      trigger: 'after_enemy_attack',
      effect: (combat, game) => {
        const dmg = combat.lastEnemyDamage > 0 ? combat.lastEnemyDamage : 0;
        if (dmg > 0) {
          const heal = Math.floor(dmg * 0.5);
          return {
            drainHeal: heal,
            message: `${combat.demon.name} drains ${heal} HP from you!`,
          };
        }
        return null;
      },
    },
    {
      type: 'volatile',
      name: 'Volatile',
      description: 'On death the demon detonates, dealing damage.',
      trigger: 'on_death',
      effect: (combat, game) => ({
        deathDamage: Math.floor(combat.demon.maxHp * 0.4),
        message: `${combat.demon.name} EXPLODES on death! -${Math.floor(combat.demon.maxHp * 0.4)} HP.`,
      }),
    },
    {
      type: 'undying',
      name: 'Undying',
      description: 'The demon revives once at 1 HP.',
      trigger: 'on_death',
      effect: (combat, game) => {
        if (!combat._undyingUsed) {
          combat._undyingUsed = true;
          return {
            reviveHp: 1,
            message: `${combat.demon.name} REFUSES death! It rises at 1 HP!`,
          };
        }
        return null;
      },
    },
    {
      type: 'split',
      name: 'Split',
      description: 'On death the demon divides into two lesser foes.',
      trigger: 'on_death',
      effect: (combat, game) => {
        const a = generateGenericDemon(game.floor);
        const b = generateGenericDemon(game.floor);
        a.hp = b.hp = Math.floor(combat.demon.maxHp * 0.3);
        a.maxHp = b.maxHp = a.hp;
        a.name = `Fragment of ${combat.demon.name}`;
        b.name = `Fragment of ${combat.demon.name}`;
        return {
          adds: [a, b],
          message: `${combat.demon.name} splits into two fragments!`,
        };
      },
    },
    {
      type: 'contaminate',
      name: 'Contaminate',
      description: 'The demon poisons your word pool with false verses.',
      trigger: 'always',
      effect: (combat, game) => ({
        poisonWords: RNG.randint(1, 2),
        message: `${combat.demon.name} contaminates ${RNG.randint(1,2)} word(s) in your pool with wrong verses.`,
      }),
    },
    {
      type: 'mute',
      name: 'Mute',
      description: 'The demon silences a random verse from your pool.',
      trigger: 'turn_2',
      effect: (combat, game) => ({
        muteVerse: true,
        message: `${combat.demon.name} mutes one of your verses! It cannot be used this fight.`,
      }),
    },
    {
      type: 'steal',
      name: 'Plunderer',
      description: 'The demon rips away your shield or buff.',
      trigger: 'after_enemy_attack',
      effect: (combat, game) => ({
        stealShield: true,
        stealBuff: true,
        message: `${combat.demon.name} steals your shield and buff!`,
      }),
    },
    {
      type: 'revenge',
      name: 'Revenge',
      description: 'After you strike, its next attack hits harder.',
      trigger: 'after_player_attack',
      effect: (combat, game) => ({
        revengeBuff: 1.5,
        message: `${combat.demon.name} coils for revenge: next attack +50%!`,
      }),
    },
    {
      type: 'consecutive',
      name: 'Consecutive Fury',
      description: 'Each hit it lands makes the next stronger.',
      trigger: 'after_enemy_attack',
      effect: (combat, game) => {
        combat._consecutive = (combat._consecutive || 0) + 1;
        return {
          stackBuff: 0.15 * combat._consecutive,
          message: `${combat.demon.name} builds momentum! Attack +${Math.round(15 * combat._consecutive)}%.`,
        };
      },
    },
    {
      type: 'parry',
      name: 'Parry',
      description: 'Uses the same verse type twice? It blocks the next.',
      trigger: 'after_player_attack',
      effect: (combat, game) => {
        const hist = combat.playerVerseHistory || [];
        if (hist.length >= 2 && hist[hist.length - 1] === hist[hist.length - 2]) {
          return {
            blockNext: hist[hist.length - 1],
            message: `${combat.demon.name} parries your repeated ${hist[hist.length - 1]} verse!`,
          };
        }
        return null;
      },
    },
    {
      type: 'adaptive_shield',
      name: 'Adaptive Shield',
      description: 'Forges a shield against your most-used verse type.',
      trigger: 'always',
      effect: (combat, game) => {
        const hist = combat.playerVerseHistory || [];
        const counts = {};
        hist.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
        const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        if (top) {
          return {
            shieldVs: top,
            shieldAmount: 15,
            message: `${combat.demon.name} raises a 15 shield vs ${top}.`,
          };
        }
        return null;
      },
    },
  ],

  // ── BOSS TWIST COMBO SYSTEM ──────────────────────────────
  // Bosses can run 2-3 twists simultaneously. Combos keyed by floor/name.
  bossTwistCombo: {
    // Floor 7 boss: Phase Walk + Reinforcements
    7: {
      name: 'The Chained Seraph',
      twists: ['phase_walk', 'reinforcements'],
      description: 'Phases out of reach while calling reinforcements.',
    },
    // Floor 9 boss (Lucifer): ALL twists active, rotating
    9: {
      name: 'Lucifer, the Lightbringer',
      twists: 'ALL_ROTATING',
      description: 'Every twist active. Each turn a new twist rotates into dominance.',
    },
    // The Stalker nemesis: Adaptive + Flee Attack + Revenge
    stalker: {
      name: 'The Stalker',
      twists: ['adaptive_shield', 'flee_attack', 'revenge'],
      description: 'Shields against you, flees when weak, strikes back with revenge.',
    },
    // Extra flavor combos
    3: {
      name: 'The Gatekeeper',
      twists: ['shield_generator', 'phase_shift'],
      description: 'Shields and phases to deny progress.',
    },
    5: {
      name: 'The Devourer',
      twists: ['sacrifice', 'drain_life', 'rage_mode'],
      description: 'Eats its young, drinks your life, rages at half.',
    },
    11: {
      name: 'Abaddon, the Destroyer',
      twists: ['swarm', 'volatile', 'summon_circle'],
      description: 'Unleashes the swarm, detonates on death, summons more.',
    },
  },

  // Resolve a boss combo into active twist objects for a given key.
  getBossCombo(key) {
    const combo = this.bossTwistCombo[key];
    if (!combo) return null;
    if (combo.twists === 'ALL_ROTATING') {
      return {
        name: combo.name,
        description: combo.description,
        rotating: true,
        allTwistTypes: this.twists.map(t => t.type),
      };
    }
    const twistObjs = combo.twists
      .map(t => this.twists.find(x => x.type === t))
      .filter(Boolean);
    return {
      name: combo.name,
      description: combo.description,
      rotating: false,
      twistObjs,
    };
  },

  // ── TWIST MANAGER ─────────────────────────────────────────
  activeTwists: [],
  playerVerseHistory: [],
  fleeingEnemy: null,
  swarmMode: false,
  swarmTimer: 0,
  swarmCount: 0,

  init() {
    this.activeTwists = [];
    this.playerVerseHistory = [];
    this.fleeingEnemy = null;
    this.swarmMode = false;
  },

  // Check for applicable twists based on combat state
  checkTwists(combat, game) {
    const triggered = [];
    const demon = combat.demon;

    for (const twist of this.twists) {
      if (this.activeTwists.find(t => t.type === twist.type)) continue;

      let shouldTrigger = false;

      switch (twist.trigger) {
        case 'hp_below_50':
          shouldTrigger = demon.hp <= demon.maxHp * 0.5 && demon.hp > demon.maxHp * 0.3;
          break;
        case 'hp_below_30':
          shouldTrigger = demon.hp <= demon.maxHp * 0.3 && demon.hp > demon.maxHp * 0.15;
          break;
        case 'hp_below_15':
          shouldTrigger = demon.hp <= demon.maxHp * 0.15;
          break;
        case 'hp_below_40':
          shouldTrigger = demon.hp <= demon.maxHp * 0.4 && demon.hp > demon.maxHp * 0.2;
          break;
        case 'hp_below_60':
          shouldTrigger = demon.hp <= demon.maxHp * 0.6 && demon.hp > demon.maxHp * 0.4;
          break;
        case 'boss_only':
          shouldTrigger = demon.isBoss || demon.isDuke || demon.tier >= 5;
          break;
        case 'always':
          shouldTrigger = true;
          break;
        case 'random_30':
          shouldTrigger = RNG.random() < 0.3 && game.floor >= 3;
          break;
        case 'after_player_attack':
          shouldTrigger = combat.lastPlayerDamage > 0 || combat.lastPlayerVerseType;
          break;
        case 'after_enemy_attack':
          shouldTrigger = combat.lastEnemyDamage > 0;
          break;
        case 'minions_alive':
          shouldTrigger = combat.adds && combat.adds.length > 0;
          break;
        case 'turn_2':
          shouldTrigger = combat.turnCount === 2;
          break;
        case 'turn_3':
          shouldTrigger = combat.turnCount === 3;
          break;
        case 'turn_even':
          shouldTrigger = combat.turnCount % 2 === 0;
          break;
        case 'turn_odd':
          shouldTrigger = combat.turnCount % 2 === 1;
          break;
        case 'on_death':
          shouldTrigger = combat.demon.hp <= 0;
          break;
      }

      if (shouldTrigger) {
        const result = twist.effect(combat, game);
        if (result) {
          this.activeTwists.push({ ...twist, result });
          triggered.push({ twist, result });
        }
      }
    }

    return triggered;
  },

  // Record player verse type for adaptive AI
  recordVerseType(type) {
    this.playerVerseHistory.push(type);
    if (this.playerVerseHistory.length > 10) this.playerVerseHistory.shift();
  },

  // Check if a verse type is resisted by adaptive AI
  isResisted(type) {
    const adaptive = this.activeTwists.find(t => t.type === 'adaptive');
    if (adaptive && adaptive.result && adaptive.result.resistance === type) {
      return true;
    }
    return false;
  },

  // Handle fleeing enemy return
  checkFleeReturn(playerHp, playerMaxHp) {
    if (this.fleeingEnemy && playerHp <= playerMaxHp * 0.5) {
      const enemy = this.fleeingEnemy;
      this.fleeingEnemy = null;
      return {
        return: true,
        demon: enemy,
        message: enemy.returnMessage,
        damage: enemy.returnDamage,
      };
    }
    return null;
  },

  // Swarm mode updates
  updateSwarm(dt) {
    if (this.swarmMode) {
      this.swarmTimer -= dt;
      if (this.swarmTimer <= 0) {
        this.swarmMode = false;
        return { expired: true };
      }
      return { active: true, timer: this.swarmTimer, count: this.swarmCount };
    }
    return null;
  },

  // Get twist description for UI
  getActiveTwistInfo() {
    return this.activeTwists.map(t => ({
      name: t.name,
      description: t.description,
      type: t.type,
    }));
  },
};
