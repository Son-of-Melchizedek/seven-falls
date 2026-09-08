// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Verse Combo System (Magica / Noita style)
// Chain verse types to unlock devastating combinations
// ═══════════════════════════════════════════════════════════════

const VerseComboSystem = {
  // ── COMBO TIER STRUCTURE ──────────────────────────────────
  // Tier 1: Single verse (basic attack)
  // Tier 2: Two-verse combo (type A + type B = special effect)
  // Tier 3: Three-verse combo (A + B + C = devastating)
  // Tier 4: Divine verse (rare, floor-specific)
  // Tier 5: Ultimate verse (requires specific conditions)

  // ── TWO-VERSE COMBOS ──────────────────────────────────────
  combos: [
    // ── Fire + Praise = Cleansing Fire (AoE damage + heal)
    {
      id: 'cleansing_fire',
      tier: 2,
      types: ['fire', 'praise'],
      name: 'Cleansing Fire',
      description: 'Holy fire that burns the wicked and heals the righteous.',
      effect: 'aoe_heal',
      damage: 30,
      heal: 15,
      quote: '"Our God is a consuming fire." — Hebrews 12:29',
    },
    // ── Wisdom + Warfare = Sword of the Spirit
    {
      id: 'sword_spirit',
      tier: 2,
      types: ['wisdom', 'warfare'],
      name: 'Sword of the Spirit',
      description: 'The Word of God, sharper than any two-edged sword.',
      effect: 'pierce',
      damage: 35,
      ignoreArmor: true,
      quote: '"The sword of the Spirit, which is the word of God." — Ephesians 6:17',
    },
    // ── Mercy + Praise = Psalm of Deliverance
    {
      id: 'psalm_deliverance',
      tier: 2,
      types: ['mercy', 'praise'],
      name: 'Psalm of Deliverance',
      description: 'A song that breaks chains and sets captives free.',
      effect: 'cleanse_debuffs',
      damage: 20,
      cleanse: true,
      quote: '"He sent from above, he took me, he drew me out of many waters." — Psalm 18:16',
    },
    // ── Wisdom + Fire = Refiner's Fire
    {
      id: 'refiners_fire',
      tier: 2,
      types: ['wisdom', 'fire'],
      name: "Refiner's Fire",
      description: 'Fire that burns away lies, leaving only truth.',
      effect: 'truth_burn',
      damage: 40,
      revealAll: true,
      quote: '"He will sit as a refiner and purifier of silver." — Malachi 3:3',
    },
    // ── Warfare + Mercy = Shield of Faith
    {
      id: 'shield_faith',
      tier: 2,
      types: ['warfare', 'mercy'],
      name: 'Shield of Faith',
      description: 'Faith that quenches all the fiery darts of the wicked.',
      effect: 'mega_shield',
      shield: 25,
      quote: '"Above all, taking the shield of faith." — Ephesians 6:16',
    },
    // ── Praise + Wisdom = Hallelujah Wisdom
    {
      id: 'hallelujah_wisdom',
      tier: 2,
      types: ['praise', 'wisdom'],
      name: 'Hallelujah Wisdom',
      description: 'Wisdom that sings. Truth that dances.',
      effect: 'double_next',
      damage: 15,
      doubleNext: true,
      quote: '"The fear of the Lord is the beginning of wisdom." — Proverbs 9:10',
    },
    // ── Fire + Mercy = Judgment and Grace
    {
      id: 'judgment_grace',
      tier: 2,
      types: ['fire', 'mercy'],
      name: 'Judgment and Grace',
      description: 'Justice and mercy meet at the cross.',
      effect: 'execute_low',
      damage: 25,
      executeThreshold: 0.3,
      quote: '"Mercy and truth are met together; righteousness and peace have kissed each other." — Psalm 85:10',
    },
    // ── Warfare + Fire = Holy War
    {
      id: 'holy_war',
      tier: 2,
      types: ['warfare', 'fire'],
      name: 'Holy War',
      description: 'The armies of heaven ride forth.',
      effect: 'multi_hit',
      damage: 15,
      hits: 3,
      quote: '"The Lord is a man of war: the Lord is his name." — Exodus 15:3',
    },
    // ── Praise + Warfare = Battle Hymn
    {
      id: 'battle_hymn',
      tier: 2,
      types: ['praise', 'warfare'],
      name: 'Battle Hymn',
      description: 'When the walls of Jericho fell, it was a song that brought them down.',
      effect: 'stun_all',
      damage: 18,
      stunTurns: 2,
      quote: '"And the walls came tumbling down." — Joshua 6:20',
    },
    // ── Wisdom + Mercy = Gentle Answer
    {
      id: 'gentle_answer',
      tier: 2,
      types: ['wisdom', 'mercy'],
      name: 'Gentle Answer',
      description: 'A soft answer turns away wrath, but grievous words stir up anger.',
      effect: 'debuff_enemy',
      damage: 12,
      debuffAttack: 0.5,
      quote: '"A soft answer turneth away wrath." — Proverbs 15:1',
    },

    // ── THREE-VERSE COMBOS ─────────────────────────────────
    // Fire + Wisdom + Warfare = Threefold Cord
    {
      id: 'threefold_cord',
      tier: 3,
      types: ['fire', 'wisdom', 'warfare'],
      name: 'Threefold Cord',
      description: 'A threefold cord is not quickly broken.',
      effect: 'mega_damage',
      damage: 80,
      quote: '"A threefold cord is not quickly broken." — Ecclesiastes 4:12',
    },
    // Praise + Mercy + Wisdom = Trinity Shield
    {
      id: 'trinity_shield',
      tier: 3,
      types: ['praise', 'mercy', 'wisdom'],
      name: 'Trinity Shield',
      description: 'The Father, Son, and Holy Spirit — three in one.',
      effect: 'invincibility',
      shield: 100,
      invincibleTurns: 2,
      quote: '"I and my Father are one." — John 10:30',
    },
    // All five types = Full Armor of God
    {
      id: 'full_armor',
      tier: 3,
      types: ['praise', 'wisdom', 'warfare', 'fire', 'mercy'],
      name: 'Full Armor of God',
      description: 'Put on the whole armor of God, that you may be able to stand.',
      effect: 'full_armor',
      damage: 60,
      shield: 40,
      buffAll: true,
      quote: '"Put on the whole armour of God." — Ephesians 6:11',
    },

    // ── ULTIMATE VERSES (Tier 5) ────────────────────────────
    // Triggered by chaining 3+ correct verses in one combat without mistakes
    {
      id: 'greater_is_he',
      tier: 5,
      name: 'Greater Is He',
      trigger: 'perfect_streak_3',
      description: '"Greater is He that is in you than he that is in the world."',
      effect: 'ultimate_smite',
      damage: 150,
      quote: '"Greater is he that is in you, than he that is in the world." — 1 John 4:4',
    },
    {
      id: 'no_weapon',
      tier: 5,
      name: 'No Weapon Shall Prosper',
      trigger: 'perfect_streak_3',
      description: '"No weapon formed against you shall prosper."',
      effect: 'ultimate_shield',
      shield: 80,
      immuneTurns: 3,
      quote: '"No weapon that is formed against thee shall prosper." — Isaiah 54:17',
    },
    {
      id: 'i_can_do',
      tier: 5,
      name: 'I Can Do All Things',
      trigger: 'perfect_streak_3',
      description: '"I can do all things through Christ who strengthens me."',
      effect: 'ultimate_buff',
      buffMultiplier: 3.0,
      buffDuration: 4,
      quote: '"I can do all things through Christ which strengtheneth me." — Philippians 4:13',
    },
    {
      id: 'all_things_work',
      tier: 5,
      name: 'All Things Work Together',
      trigger: 'floor_5_plus',
      description: '"All things work together for good."',
      effect: 'ultimate_convert',
      damage: 100,
      healToFull: true,
      quote: '"All things work together for good to them that love God." — Romans 8:28',
    },
    {
      id: 'lion_judah',
      tier: 5,
      name: 'Lion of Judah',
      trigger: 'boss_fight',
      description: '"The Lion of the tribe of Judah hath prevailed."',
      effect: 'ultimate_boss_slayer',
      damage: 200,
      bossMultiplier: 3.0,
      quote: '"The Lion of the tribe of Judah hath prevailed." — Revelation 5:5',
    },
  ],

  // ── COMBO DETECTION ───────────────────────────────────────
  // Called with array of verse types used in this combat
  detectCombo(typesUsed, combatContext) {
    const unique = [...new Set(typesUsed)];
    const results = [];
    
    for (const combo of this.combos) {
      if (combo.tier === 5) {
        // Ultimate verses have special triggers
        if (this.checkUltimateTrigger(combo, combatContext)) {
          results.push(combo);
        }
      } else if (combo.tier === 3) {
        // Three-verse combos
        if (combo.types.every(t => unique.includes(t))) {
          results.push(combo);
        }
      } else if (combo.tier === 2) {
        // Two-verse combos
        if (combo.types.every(t => unique.includes(t))) {
          results.push(combo);
        }
      }
    }
    
    return results;
  },

  checkUltimateTrigger(combo, ctx) {
    if (combo.trigger === 'perfect_streak_3' && ctx.correctStreak >= 3) return true;
    if (combo.trigger === 'floor_5_plus' && ctx.floor >= 5) return true;
    if (combo.trigger === 'boss_fight' && ctx.isBoss) return true;
    return false;
  },

  // ── APPLY COMBO EFFECT ────────────────────────────────────
  applyCombo(combo, combat, game) {
    const results = { messages: [], damage: 0, heal: 0, shield: 0 };
    
    switch (combo.effect) {
      case 'aoe_heal':
        results.damage = combo.damage;
        results.heal = combo.heal;
        results.messages.push(`🔥 ${combo.name}! Burns ${combo.damage}, heals ${combo.heal}!`);
        break;
      case 'pierce':
        results.damage = combo.damage;
        results.ignoreArmor = true;
        results.messages.push(`⚔️ ${combo.name}! Pierces armor!`);
        break;
      case 'cleanse_debuffs':
        results.damage = combo.damage;
        results.cleanse = true;
        results.messages.push(`🎵 ${combo.name}! Chains broken!`);
        break;
      case 'truth_burn':
        results.damage = combo.damage;
        results.revealAll = true;
        results.messages.push(`🔥 ${combo.name}! All weaknesses revealed!`);
        break;
      case 'mega_shield':
        results.shield = combo.shield;
        results.messages.push(`🛡️ ${combo.name}! Shield: ${combo.shield}!`);
        break;
      case 'double_next':
        results.damage = combo.damage;
        results.doubleNext = true;
        results.messages.push(`✨ ${combo.name}! Next verse doubled!`);
        break;
      case 'execute_low':
        if (combat.demon.hp <= combat.demon.maxHp * combo.executeThreshold) {
          results.damage = combat.demon.hp; // Execute
          results.messages.push(`💀 ${combo.name}! EXECUTE!`);
        } else {
          results.damage = combo.damage;
          results.messages.push(`⚔️ ${combo.name}! ${combo.damage} damage.`);
        }
        break;
      case 'multi_hit':
        results.damage = combo.damage * combo.hits;
        results.messages.push(`⚔️ ${combo.name}! ${combo.hits} hits!`);
        break;
      case 'stun_all':
        results.damage = combo.damage;
        results.stunTurns = combo.stunTurns;
        results.messages.push(`🎵 ${combo.name}! Stunned ${combo.stunTurns} turns!`);
        break;
      case 'debuff_enemy':
        results.damage = combo.damage;
        results.debuffAttack = combo.debuffAttack;
        results.messages.push(`📜 ${combo.name}! Enemy weakened!`);
        break;
      case 'mega_damage':
        results.damage = combo.damage;
        results.messages.push(`⚡ ${combo.name}! DEVASTATING!`);
        break;
      case 'invincibility':
        results.shield = combo.shield;
        results.invincibleTurns = combo.invincibleTurns;
        results.messages.push(`✝️ ${combo.name}! INVINCIBLE ${combo.invincibleTurns} turns!`);
        break;
      case 'full_armor':
        results.damage = combo.damage;
        results.shield = combo.shield;
        results.buffAll = true;
        results.messages.push(`🛡️ ${combo.name}! FULL POWER!`);
        break;
      case 'ultimate_smite':
        results.damage = combo.damage;
        results.messages.push(`🌟 ULTIMATE: ${combo.name}! ${combo.damage} DAMAGE!`);
        break;
      case 'ultimate_shield':
        results.shield = combo.shield;
        results.messages.push(`🌟 ULTIMATE: ${combo.name}! IMMOVABLE!`);
        break;
      case 'ultimate_buff':
        results.buffMultiplier = combo.buffMultiplier;
        results.buffDuration = combo.buffDuration;
        results.messages.push(`🌟 ULTIMATE: ${combo.name}! POWER ×${combo.buffMultiplier}!`);
        break;
      case 'ultimate_convert':
        results.damage = combo.damage;
        results.healToFull = true;
        results.messages.push(`🌟 ULTIMATE: ${combo.name}! RESTORED!`);
        break;
      case 'ultimate_boss_slayer':
        results.damage = combo.damage * (combat.isBoss ? combo.bossMultiplier : 1);
        results.messages.push(`🌟 ULTIMATE: ${combo.name}! ${results.damage} TO THE BEAST!`);
        break;
    }
    
    return results;
  },

  // ── COMBO DISPLAY DATA ────────────────────────────────────
  getComboHint(typesUsed) {
    const unique = [...new Set(typesUsed)];
    if (unique.length < 2) return null;
    
    // Check what combos are possible with current types
    for (const combo of this.combos) {
      if (combo.tier === 2 && combo.types.every(t => unique.includes(t))) {
        return { name: combo.name, types: combo.types, tier: combo.tier };
      }
    }
    return null;
  },

  // ── GET ALL COMBOS FOR DISPLAY ────────────────────────────
  getAllCombos() {
    return this.combos.map(c => ({
      id: c.id,
      name: c.name,
      tier: c.tier,
      types: c.types || [],
      description: c.description,
      quote: c.quote,
    }));
  },
};
