// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Demon Database
// Each demon is weak to specific verse types
// ═══════════════════════════════════════════════════════════════

const DEMON_TYPES = {
  DECEPTION: 'deception',     // Weak to WISDOM
  LUST: 'lust',               // Weak to MERCY
  WRATH: 'wrath',             // Weak to PRAISE
  PRIDE: 'pride',             // Weak to WARFARE
  DESPAIR: 'despair',         // Weak to PRAISE (sustaining)
  FALSE_PROPHET: 'false_prophet', // Weak to FIRE
  WHORE: 'whore',             // Weak to WISDOM
  LEVIATHAN: 'leviathan',     // Weak to FIRE
};

// Weakness map: demon type → best verse type (2x damage), good type (1.5x)
const WEAKNESS_MAP = {
  deception:     { best: 'wisdom',   good: 'warfare' },
  lust:          { best: 'mercy',    good: 'praise' },
  wrath:         { best: 'praise',   good: 'mercy' },
  pride:         { best: 'warfare',  good: 'fire' },
  despair:       { best: 'praise',   good: 'mercy' },
  false_prophet: { best: 'fire',     good: 'wisdom' },
  whore:         { best: 'wisdom',   good: 'fire' },
  leviathan:     { best: 'fire',     good: 'warfare' },
};

// Get damage multiplier based on demon weakness
function getDamageMultiplier(demonType, verseType) {
  const weaknesses = WEAKNESS_MAP[demonType];
  if (!weaknesses) return 1.0;
  if (weaknesses.best === verseType) return 2.0;
  if (weaknesses.good === verseType) return 1.5;
  // Resistance: wrong type does 0.5x
  return 0.5;
}

const DEMONS = [
  // ── FLOOR 1-3: Lesser Demons ─────────────────────────────
  {
    id: 'lying_spirit',
    name: 'Lying Spirit',
    type: 'deception',
    hp: 30, maxHp: 30,
    floor: 1,
    xp: 10, gold: 5,
    ascii: `
    .-"""-.
   /        \\
  |  O    O  |
  |    __    |
   \\  \\__/  /
    '-.  .-'
       ||
    `,
    desc: 'A whispering phantom that twists truth into lies.',
  },
  {
    id: 'shadow_of_doubt',
    name: 'Shadow of Doubt',
    type: 'despair',
    hp: 25, maxHp: 25,
    floor: 1,
    xp: 8, gold: 4,
    ascii: `
      /\\_/\\
     ( o.o )
      > ^ <
     /|   |\\
    (_|   |_)
    `,
    desc: 'It feeds on uncertainty and fear.',
  },
  {
    id: 'imp_of_pride',
    name: 'Imp of Pride',
    type: 'pride',
    hp: 35, maxHp: 35,
    floor: 2,
    xp: 12, gold: 6,
    ascii: `
     /\\___/\\
    ( =._.= )
     > ^ < \\
    /|     |\\
   (_|     |_)
    `,
    desc: 'Small but insufferably arrogant.',
  },
  {
    id: 'flame_wraith',
    name: 'Flame Wraith',
    type: 'wrath',
    hp: 40, maxHp: 40,
    floor: 2,
    xp: 14, gold: 7,
    ascii: `
      ) ( (
     (w_ _w)
      )   (
     (	Y	 )
      )   (
    `,
    desc: 'Born of righteous anger perverted into rage.',
  },
  {
    id: 'veiled_whisper',
    name: 'Veiled Whisper',
    type: 'lust',
    hp: 28, maxHp: 28,
    floor: 3,
    xp: 11, gold: 5,
    ascii: `
     .---.
    / o o \\
   |  \\_/  |
    \\     /
     '---'
    `,
    desc: 'Seduces with promises it never keeps.',
  },

  // ── FLOOR 4-6: Mid Demons ────────────────────────────────
  {
    id: 'the_accuser',
    name: 'The Accuser',
    type: 'pride',
    hp: 60, maxHp: 60,
    floor: 4,
    xp: 25, gold: 15,
    ascii: `
     /^^^^^\\
    | X _ X |
    |  ___  |
    | |   | |
     \\|___|/
      |||||
    `,
    desc: 'He points fingers and never offers help.',
  },
  {
    id: 'lord_of_flies',
    name: 'Lord of Flies',
    type: 'deception',
    hp: 55, maxHp: 55,
    floor: 4,
    xp: 22, gold: 12,
    ascii: `
    .::::::.
    |@@--@@|
    |  ()  |
    '::::::'
     /|  |\\
    /_|__|_\\
    `,
    desc: 'Beelzebub\'s lieutenant. Everything is rotten.',
  },
  {
    id: 'despair_incarnate',
    name: 'Despair Incarnate',
    type: 'despair',
    hp: 50, maxHp: 50,
    floor: 5,
    xp: 20, gold: 10,
    ascii: `
     .----.
    /  --  \\
   | -- --  |
   |  --    |
    \\ --  /
     '----'
    `,
    desc: 'The embodiment of hopelessness.',
  },
  {
    id: 'brimstone_sage',
    name: 'Brimstone Sage',
    type: 'false_prophet',
    hp: 65, maxHp: 65,
    floor: 5,
    xp: 28, gold: 18,
    ascii: `
     /=====\\
    | [o]  |
    |  __  |
    | |__| |
     \\----/
    `,
    desc: 'Speaks truth wrapped in lies. The most dangerous kind.',
  },

  // ── FLOOR 7-9: Boss Demons ───────────────────────────────
  {
    id: 'mammon',
    name: 'Mammon',
    type: 'pride',
    hp: 100, maxHp: 100,
    floor: 7,
    xp: 50, gold: 40,
    ascii: `
      .=======.
     /  GOLD   \\
    | $ | | $ |
    |  \\___/  |
    |  |||  |
     \\=======/
      |||||||
    `,
    desc: 'The demon of greed and worldly wealth.',
  },
  {
    id: 'abaddon',
    name: 'Abaddon',
    type: 'wrath',
    hp: 120, maxHp: 120,
    floor: 8,
    xp: 60, gold: 50,
    ascii: `
     /███████\\
    | ◆ ▲ ◆ |
    |  ╲█╱  |
    | /   \\ |
     /█████\\
    `,
    desc: 'The Destroyer. Angel of the abyss.',
  },

  // ── FLOOR 10: FINAL BOSS ─────────────────────────────────
  {
    id: 'the_dragon',
    name: 'The Dragon',
    type: 'leviathan',
    hp: 200, maxHp: 200,
    floor: 10,
    xp: 200, gold: 100,
    ascii: `
    .===###===.
   /  ◊     ◊  \\
  |  __/ \\__  |
  | |  ===  | |
  |  \\_____/  |
   \\_________/
    |  |   |  |
    `,
    desc: 'That ancient serpent, who is called the Devil and Satan.',
  },
];

// Get demon for a specific floor (random selection from eligible pool)
function getDemonForFloor(floor, usedDemons = []) {
  const eligible = DEMONS.filter(
    d => d.floor <= floor && d.floor >= floor - 2 && !usedDemons.includes(d.id)
  );
  if (eligible.length === 0) {
    // Fallback: generate a scaled generic demon
    return generateGenericDemon(floor);
  }
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// Generate a scaled generic demon when pool is exhausted
function generateGenericDemon(floor) {
  const types = Object.values(DEMON_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const hp = 20 + floor * 12;
  const names = [
    'Fiend', 'Tormentor', 'Harasser', 'Afflictor',
    'Tempter', 'Deceiver', 'Devourer', 'Oppressor',
  ];
  const name = names[Math.floor(Math.random() * names.length)];
  
  return {
    id: `generic_${floor}_${Date.now()}`,
    name: `${name} of the Abyss`,
    type,
    hp, maxHp: hp,
    floor,
    xp: 8 + floor * 5,
    gold: 3 + floor * 3,
    ascii: `
     .---.
    / o_o \\
   |  ___  |
    \\_____/
    `,
    desc: 'A demon born from the darkness of this floor.',
  };
}
