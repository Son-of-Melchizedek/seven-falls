// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Demon Hierarchy
// From common demons to the Fallen Angel Gods
// ═══════════════════════════════════════════════════════════════

// ── HIERARCHY TIERS ─────────────────────────────────────────
// Demons → Squads → Legions → Powers → Principalities → Fallen Angels → Lucifer

const DEMON_TIER = {
  COMMON:    0,  // Common demons (floors 1-3)
  SQUAD:     1,  // Coordinated demon groups (floors 3-4)
  LEGION:    2,  // Legion leaders (floors 5-6)
  POWER:     3,  // Powers — sin generals (floors 6-7)
  PRINCIPALITY: 4, // Principalities — territory lords (floors 7-8)
  FALLEN_ANGEL: 5, // The big names (floors 8-9)
  LUCIFER:   6,  // Final boss (floor 10)
};

// ── SIN TYPES (shared by demons through powers) ─────────────
const SIN_TYPE = {
  DECEPTION: 'deception',
  LUST:      'lust',
  WRATH:     'wrath',
  PRIDE:     'pride',
  DESPAIR:   'despair',
  GREED:     'greed',
  SLOTH:     'sloth',
};

// ── TERRITORY TYPES (principalities) ────────────────────────
const TERRITORY = {
  DEPTHS:    'depths',      // Oceans, abyss, drowning
  SHADOWS:   'shadows',     // Darkness, blindness, whispers
  FLAMES:    'flames',      // Fire, brimstone, destruction
  PLAGUES:   'plagues',     // Disease, decay, corruption
  CHAINS:    'chains',      // Binding, imprisonment, silence
  DECEPTION: 'deception_t', // Lies, false visions, mirrors
  DESOLATION:'desolation',  // Waste, emptiness, forgotten things
};

// ── FALLEN ANGEL CATEGORIES ─────────────────────────────────
const FALLEN_CATEGORY = {
  DUKE:         'duke',          // 7 Dukes of Hell
  OLYMPIAN:     'olympian',      // Greek gods
  NORSE:        'norse',         // Norse gods
  ROMAN:        'roman',         // Roman gods
  WATCHER:      'watcher',       // Book of Enoch watchers
};

// ═══════════════════════════════════════════════════════════════
// FLOOR → TIER MAPPING
// ═══════════════════════════════════════════════════════════════

const FLOOR_TIERS = [
  { floor: 1,  tiers: [DEMON_TIER.COMMON],       label: 'The Mouth' },
  { floor: 2,  tiers: [DEMON_TIER.COMMON],        label: 'The Shallows' },
  { floor: 3,  tiers: [DEMON_TIER.COMMON, DEMON_TIER.SQUAD], label: 'The Descent' },
  { floor: 4,  tiers: [DEMON_TIER.SQUAD, DEMON_TIER.LEGION], label: 'The Corruption' },
  { floor: 5,  tiers: [DEMON_TIER.LEGION, DEMON_TIER.POWER], label: 'The Burning Court' },
  { floor: 6,  tiers: [DEMON_TIER.POWER],         label: 'The Throne of Sin' },
  { floor: 7,  tiers: [DEMON_TIER.PRINCIPALITY],   label: 'The Dominion' },
  { floor: 8,  tiers: [DEMON_TIER.PRINCIPALITY, DEMON_TIER.FALLEN_ANGEL], label: 'The Forgotten Realm' },
  { floor: 9,  tiers: [DEMON_TIER.FALLEN_ANGEL],   label: 'The Fallen Court' },
  { floor: 10, tiers: [DEMON_TIER.LUCIFER],        label: 'The Throne of the Dragon' },
];

// ═══════════════════════════════════════════════════════════════
// DEMON DATABASE — All tiers
// ═══════════════════════════════════════════════════════════════

const DEMONS = [
  // ═══════════════════════════════════════════════════════════
  // TIER 0: COMMON DEMONS (Floors 1-3)
  // Divided by TYPE OF SIN
  // ═══════════════════════════════════════════════════════════
  {
    id:'lying_spirit', name:'Lying Spirit', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.DECEPTION, sin:'Deception',
    hp:30, maxHp:30, floor:1, xp:10, gold:5,
    weakTo:'wisdom', goodAgainst:'warfare',
    ascii:'  .-"""-.  \n /  O  O  \\\n |   __   |\n  \\  \\/  /\n   \'-.  .-\'\n      ||',
    desc:'A whispering phantom that twists truth into lies.',
    combatMsg:'The Lying Spirit distorts reality around you...',
  },
  {
    id:'shadow_doubt', name:'Shadow of Doubt', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.DESPAIR, sin:'Despair',
    hp:25, maxHp:25, floor:1, xp:8, gold:4,
    weakTo:'praise', goodAgainst:'mercy',
    ascii:'   /\\_/\\\n  ( o.o )\n   > ^ <',
    desc:'It feeds on uncertainty and fear.',
    combatMsg:'Doubt creeps in. Can you really win this?',
  },
  {
    id:'imp_pride', name:'Imp of Pride', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.PRIDE, sin:'Pride',
    hp:35, maxHp:35, floor:2, xp:12, gold:6,
    weakTo:'warfare', goodAgainst:'fire',
    ascii:'  /\\___/\\\n ( =._.= )\n  > ^ <',
    desc:'Small but insufferably arrogant.',
    combatMsg:'The Imp puffs itself up to enormous size.',
  },
  {
    id:'flame_wraith', name:'Flame Wraith', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.WRATH, sin:'Wrath',
    hp:40, maxHp:40, floor:2, xp:14, gold:7,
    weakTo:'praise', goodAgainst:'wisdom',
    ascii:'   ( ) (\n  (w_ _w)\n   )   (',
    desc:'Born of righteous anger perverted into rage.',
    combatMsg:'Heat radiates from the Flame Wraith. It burns with fury.',
  },
  {
    id:'veiled_whisper', name:'Veiled Whisper', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.LUST, sin:'Lust',
    hp:28, maxHp:28, floor:3, xp:11, gold:5,
    weakTo:'mercy', goodAgainst:'praise',
    ascii:'  .---.\n / o o \\\n |  \\_/  |\n  \\     /\n   \'---\'',
    desc:'Seduces with promises it never keeps.',
    combatMsg:'The Veiled Whisper shows you visions of desire...',
  },
  {
    id:'mote_greed', name:'Mote of Greed', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.GREED, sin:'Greed',
    hp:32, maxHp:32, floor:1, xp:9, gold:10,
    weakTo:'mercy', goodAgainst:'wisdom',
    ascii:'   $$$\n  (o_o)\n   \\_/',
    desc:'A tiny demon that hoards everything it touches.',
    combatMsg:'The Mote of Greed clutches stolen gold.',
  },
  {
    id:'idle_shadow', name:'Idle Shadow', tier:DEMON_TIER.COMMON,
    type:SIN_TYPE.SLOTH, sin:'Sloth',
    hp:20, maxHp:20, floor:1, xp:6, gold:3,
    weakTo:'fire', goodAgainst:'praise',
    ascii:'   zzz\n  (-.-)\n  /| |\\',
    desc:'It drains your will to act.',
    combatMsg:'Your limbs feel heavy. The Idle Shadow saps your resolve.',
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 1: SQUADS (Floors 3-4)
  // Groups of coordinated demons
  // ═══════════════════════════════════════════════════════════
  {
    id:'whispering_cabal', name:'Whispering Cabal', tier:DEMON_TIER.SQUAD,
    type:SIN_TYPE.DECEPTION, sin:'Deception',
    hp:60, maxHp:60, floor:3, xp:20, gold:12,
    weakTo:'wisdom', goodAgainst:'fire',
    ascii:'  .-. .-.\n /o o\\/o o\\\n |  __  |\n  \\/  \\/',
    desc:'Three spirits that speak in unison, each lie different.',
    combatMsg:'The Cabal speaks in three voices. Which one is true?',
    squadSize: 3,
  },
  {
    id:'wrath_pack', name:'Wrath Pack', tier:DEMON_TIER.SQUAD,
    type:SIN_TYPE.WRATH, sin:'Wrath',
    hp:70, maxHp:70, floor:3, xp:22, gold:14,
    weakTo:'praise', goodAgainst:'wisdom',
    ascii:'   ><> <>\n  (O  O)\n   \\  /\n    \\/',
    desc:'A pack that hunts in coordinated fury.',
    combatMsg:'The Wrath Pack circles you like wolves.',
    squadSize: 4,
  },
  {
    id:'vanity_court', name:'Vanity Court', tier:DEMON_TIER.SQUAD,
    type:SIN_TYPE.PRIDE, sin:'Pride',
    hp:55, maxHp:55, floor:4, xp:18, gold:10,
    weakTo:'warfare', goodAgainst:'mercy',
    ascii:'  crown\n [o_o]\n  |||',
    desc:'Demons that admire their own reflection.',
    combatMsg:'The Vanity Court poses before shattered mirrors.',
    squadSize: 3,
  },
  {
    id:'avarice_twins', name:'Avarice Twins', tier:DEMON_TIER.SQUAD,
    type:SIN_TYPE.GREED, sin:'Greed',
    hp:50, maxHp:50, floor:4, xp:16, gold:20,
    weakTo:'mercy', goodAgainst:'fire',
    ascii:'  $$ $$\n (o_o)(o_o)\n  \\_/\n  \\_/',
    desc:'They fight over everything, including you.',
    combatMsg:'The Twins reach for you with grasping hands.',
    squadSize: 2,
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 2: LEGIONS (Floors 5-6)
  // Led by a commander demon
  // ═══════════════════════════════════════════════════════════
  {
    id:'legion_deception', name:'Legion of Whispers', tier:DEMON_TIER.LEGION,
    type:SIN_TYPE.DECEPTION, sin:'Deception',
    hp:120, maxHp:120, floor:5, xp:40, gold:30,
    weakTo:'wisdom', goodAgainst:'praise',
    ascii:'  <<||>>\n (X_ _X)\n  ||  ||',
    desc:'A thousand voices speaking as one. None tell the truth.',
    combatMsg:'The Legion of Whispers speaks. You cannot tell friend from foe.',
    legionCommander: true,
  },
  {
    id:'legion_wrath', name:'Legion of Fury', tier:DEMON_TIER.LEGION,
    type:SIN_TYPE.WRATH, sin:'Wrath',
    hp:140, maxHp:140, floor:5, xp:45, gold:35,
    weakTo:'praise', goodAgainst:'wisdom',
    ascii:'  /^^^^\\ |\n | >_< |\n | \\_/ |\n  \\===/',
    desc:'An army of rage incarnate. The commander feeds on battle.',
    combatMsg:'The Legion of Fury charges. The earth shakes.',
    legionCommander: true,
  },
  {
    id:'legion_pride', name:'Legion of Exaltation', tier:DEMON_TIER.LEGION,
    type:SIN_TYPE.PRIDE, sin:'Pride',
    hp:130, maxHp:130, floor:6, xp:42, gold:32,
    weakTo:'warfare', goodAgainst:'fire',
    ascii:'  crown\n /^^^^\\ \n |  ^  |\n  \\___/',
    desc:'Demons that worship their own commander as a god.',
    combatMsg:'The Legion kneels before its commander. It expects you to kneel too.',
    legionCommander: true,
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 3: POWERS (Floors 6-7)
  // Generals of sin. Still divided by type.
  // ═══════════════════════════════════════════════════════════
  {
    id:'the_accuser', name:'The Accuser', tier:DEMON_TIER.POWER,
    type:SIN_TYPE.PRIDE, sin:'Pride',
    hp:160, maxHp:160, floor:6, xp:50, gold:40,
    weakTo:'warfare', goodAgainst:'fire',
    ascii:'  /^^^^^\\ \n | X _ X |\n |  ___  |\n  \\|___|/',
    desc:'He points fingers and never offers help. Satan\'s tongue.',
    combatMsg:'The Accuser lists your every sin. Each word cuts.',
  },
  {
    id:'lord_flies', name:'Lord of Flies', tier:DEMON_TIER.POWER,
    type:SIN_TYPE.DECEPTION, sin:'Deception',
    hp:150, maxHp:150, floor:6, xp:48, gold:38,
    weakTo:'wisdom', goodAgainst:'mercy',
    ascii:'  .::::::.\n |@@--@@|\n |  ()  |\n  \'::::::\'',
    desc:'Beelzebub\'s lieutenant. Everything is rotten around it.',
    combatMsg:'The air fills with the buzzing of a thousand lies.',
  },
  {
    id:'despair_incarnate', name:'Despair Incarnate', tier:DEMON_TIER.POWER,
    type:SIN_TYPE.DESPAIR, sin:'Despair',
    hp:140, maxHp:140, floor:7, xp:45, gold:35,
    weakTo:'praise', goodAgainst:'wisdom',
    ascii:'  .----.\n /  --  \\\n| -- --  |\n \\ --  /\n  \'----\'',
    desc:'The embodiment of hopelessness. Looking at it makes you want to stop.',
    combatMsg:'Despair Incarnate stares into you. You feel... tired.',
  },
  {
    id:'mammon', name:'Mammon', tier:DEMON_TIER.POWER,
    type:SIN_TYPE.GREED, sin:'Greed',
    hp:170, maxHp:170, floor:7, xp:55, gold:50,
    weakTo:'mercy', goodAgainst:'praise',
    ascii:'  .=======.\n /  GOLD   \\\n| $ | | $ |\n \\=======/',
    desc:'The demon of wealth. Even touching its gold corrupts.',
    combatMsg:'Mammon offers you riches. The price is your soul.',
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 4: PRINCIPALITIES (Floors 7-8)
  // Lords of TERRITORY, not sin. Each rules a domain.
  // ═══════════════════════════════════════════════════════════
  {
    id:'lord_depths', name:'Lord of the Depths', tier:DEMON_TIER.PRINCIPALITY,
    territory:TERRITORY.DEPTHS,
    hp:200, maxHp:200, floor:7, xp:60, gold:45,
    weakTo:'fire', goodAgainst:'praise',
    ascii:'  ~~~~~~\n (O  O)~\n  ~\\  /~\n   ~~~',
    desc:'Rules the drowned places. Water is its weapon and armor.',
    combatMsg:'Water rises around you. The Lord of the Depths has awakened.',
  },
  {
    id:'lord_shadows', name:'Lord of Shadows', tier:DEMON_TIER.PRINCIPALITY,
    territory:TERRITORY.SHADOWS,
    hp:190, maxHp:190, floor:7, xp:58, gold:43,
    weakTo:'praise', goodAgainst:'fire',
    ascii:'  ..... \n (o . o)\n  . ^ . \n   ...',
    desc:'Rules the dark places where light cannot reach.',
    combatMsg:'The shadows deepen. You cannot see. The Lord of Shadows sees you.',
  },
  {
    id:'lord_flames', name:'Lord of Flames', tier:DEMON_TIER.PRINCIPALITY,
    territory:TERRITORY.FLAMES,
    hp:210, maxHp:210, floor:8, xp:65, gold:50,
    weakTo:'praise', goodAgainst:'wisdom',
    ascii:'  /^^^\\\n | >_< |\n |  Y  |\n  \\___/',
    desc:'Rules the burning plains. Fire bows to it.',
    combatMsg:'The ground ignites. The Lord of Flames descends.',
  },
  {
    id:'lord_plagues', name:'Lord of Plagues', tier:DEMON_TIER.PRINCIPALITY,
    territory:TERRITORY.PLAGUES,
    hp:180, maxHp:180, floor:8, xp:55, gold:40,
    weakTo:'fire', goodAgainst:'mercy',
    ascii:'  .---.\n / x_x \\\n |  ~  |\n  \\___/',
    desc:'Rules disease and decay. Its touch corrupts all living things.',
    combatMsg:'A sickness fills the air. The Lord of Plagues smiles.',
  },
  {
    id:'lord_chains', name:'Lord of Chains', tier:DEMON_TIER.PRINCIPALITY,
    territory:TERRITORY.CHAINS,
    hp:220, maxHp:220, floor:8, xp:68, gold:52,
    weakTo:'fire', goodAgainst:'warfare',
    ascii:'  [===]\n | X_X |\n  [ | ]\n   |||',
    desc:'Rules imprisonment and silence. Its chains bind the soul.',
    combatMsg:'Chains materialize around you. The Lord of Chains pulls tight.',
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 5: FALLEN ANGELS (Floors 8-9)
  // The 7 Dukes of Hell, Greek/Norse/Roman gods, the Watchers
  // ═══════════════════════════════════════════════════════════

  // ── THE 7 DUKES OF HELL ──────────────────────────────────
  {
    id:'lucifer_duke', name:'Lucifer, Light-Bringer', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:300, maxHp:300, floor:9, xp:100, gold:80,
    weakTo:'praise', goodAgainst:'fire',
    ascii:'  /^^^^\\\n | * * |\n |  Y  |\n  \\___/',
    desc:'The first to fall. Morning star turned prince of darkness.',
    combatMsg:'Lucifer appears in blinding light. It hurts to look at him.',
    isDuke: true,
  },
  {
    id:'beelzebub', name:'Beelzebub, Lord of Flies', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:280, maxHp:280, floor:9, xp:90, gold:70,
    weakTo:'wisdom', goodAgainst:'praise',
    ascii:'  .::::::.\n |##--##|\n |  ()  |\n  \'::::::\'',
    desc:'The Prince of Demons. Commander of the fly legion.',
    combatMsg:'Beelzebub descends. A cloud of darkness follows.',
    isDuke: true,
  },
  {
    id:'asmodeus', name:'Asmodeus, Prince of Lust', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:260, maxHp:260, floor:9, xp:85, gold:65,
    weakTo:'mercy', goodAgainst:'fire',
    ascii:'  /===\\\n | ; ; |\n |  Y  |\n  \\___/',
    desc:'The demon of burning desire. Three heads: ox, man, ram.',
    combatMsg:'Asmodeus shows you everything you ever wanted. It\'s a trap.',
    isDuke: true,
  },
  {
    id:'mammon_duke', name:'Mammon, Prince of Avarice', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:270, maxHp:270, floor:9, xp:88, gold:100,
    weakTo:'mercy', goodAgainst:'praise',
    ascii:'  .=======.\n /  $$$  \\\n| $   $ |\n \\=======/',
    desc:'The wealthiest of the fallen. Gold drips from his fingertips.',
    combatMsg:'The room fills with gold coins. Each one is a soul.',
    isDuke: true,
  },
  {
    id:'satan_duke', name:'Satan, The Adversary', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:290, maxHp:290, floor:9, xp:95, gold:75,
    weakTo:'fire', goodAgainst:'mercy',
    ascii:'  /^^^^\\\n | X X |\n |  ^  |\n  \\___/',
    desc:'The enemy of mankind. Accuser, tempter, destroyer.',
    combatMsg:'Satan speaks with a voice like grinding teeth.',
    isDuke: true,
  },
  {
    id:'belial', name:'Belial, Worthlessness', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:250, maxHp:250, floor:9, xp:82, gold:62,
    weakTo:'warfare', goodAgainst:'wisdom',
    ascii:'  .-===-.\n | - _ - |\n |  ---  |\n  \'-===-\'',
    desc:'The embodiment of worthlessness and lawlessness.',
    combatMsg:'Belial makes you feel like nothing matters.',
    isDuke: true,
  },
  {
    id:'belphegor', name:'Belphegor, Lord of the Opening', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.DUKE,
    hp:240, maxHp:240, floor:9, xp:80, gold:60,
    weakTo:'praise', goodAgainst:'warfare',
    ascii:'  .-~~~-.\n | o _ o |\n |  ___  |\n  \'~~~~~\'',
    desc:'The demon who discovers inventions and inspires sloth.',
    combatMsg:'Belphegor shows you the easy path. It leads nowhere.',
    isDuke: true,
  },

  // ── GREEK GODS (FALLEN) ──────────────────────────────────
  {
    id:'zeus_fallen', name:'Zeus, the Fallen King', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.OLYMPIAN,
    hp:350, maxHp:350, floor:9, xp:110, gold:85,
    weakTo:'warfare', goodAgainst:'praise',
    ascii:'  /^^^\\\n | Y.Y |\n |  |  |\n  \\___/',
    desc:'King of Olympus, now king of nothing. His lightning is corrupted.',
    combatMsg:'Thunder shakes the abyss. Zeus hurls black lightning.',
  },
  {
    id:'ares_fallen', name:'Ares, the Blood-Bringer', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.OLYMPIAN,
    hp:320, maxHp:320, floor:9, xp:100, gold:78,
    weakTo:'praise', goodAgainst:'mercy',
    ascii:'  /^^^\\\n | >.< |\n |  Y  |\n  \\___/',
    desc:'God of war, fallen. He only knows how to destroy.',
    combatMsg:'Ares charges. His spear drips with ichor.',
  },
  {
    id:'hades_fallen', name:'Hades, Lord of the Dead', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.OLYMPIAN,
    hp:330, maxHp:330, floor:9, xp:105, gold:82,
    weakTo:'fire', goodAgainst:'praise',
    ascii:'  .-===-.\n | ^ _ ^ |\n |  ___  |\n  \'-===-\'',
    desc:'King of the underworld. Even the dead fear him.',
    combatMsg:'The temperature drops. Hades calls the dead to fight for him.',
  },

  // ── NORSE GODS (FALLEN) ──────────────────────────────────
  {
    id:'odin_fallen', name:'Odin, the One-Eyed', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.NORSE,
    hp:340, maxHp:340, floor:9, xp:108, gold:83,
    weakTo:'fire', goodAgainst:'wisdom',
    ascii:'  /^^^\\\n | -._ |\n |  Y  |\n  \\___/',
    desc:'All-Father, now father of lies. His wisdom became cunning.',
    combatMsg:'Odin whispers secrets. They are all true. That\'s the problem.',
  },
  {
    id:'loki_fallen', name:'Loki, the Trickster', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.NORSE,
    hp:280, maxHp:280, floor:9, xp:92, gold:72,
    weakTo:'wisdom', goodAgainst:'fire',
    ascii:'  /===\\\n | ^_^ |\n |  Y  |\n  \\___/',
    desc:'God of mischief, now god of chaos. Nothing is what it seems.',
    combatMsg:'Loki appears as your ally. Then as your enemy. Then as both.',
  },
  {
    id:'thor_fallen', name:'Thor, the Wrathful', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.NORSE,
    hp:360, maxHp:360, floor:9, xp:112, gold:88,
    weakTo:'praise', goodAgainst:'mercy',
    ascii:'  /^^^\\\n | >.< |\n | M.M |\n  \\___/',
    desc:'God of thunder, now god of blind fury.',
    combatMsg:'Thor\'s hammer cracks the earth. Run.',
  },

  // ── ROMAN GODS (FALLEN) ──────────────────────────────────
  {
    id:'jupiter_fallen', name:'Jupiter, the Fallen', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.ROMAN,
    hp:340, maxHp:340, floor:9, xp:106, gold:80,
    weakTo:'warfare', goodAgainst:'fire',
    ascii:'  /^^^\\\n | Y.Y |\n |  |  |\n  \\___/',
    desc:'King of the Roman gods, now a shadow of divine authority.',
    combatMsg:'Jupiter commands you to kneel. You refuse.',
  },
  {
    id:'mars_fallen', name:'Mars, the Red God', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.ROMAN,
    hp:310, maxHp:310, floor:9, xp:98, gold:76,
    weakTo:'praise', goodAgainst:'wisdom',
    ascii:'  /^^^\\\n | >.< |\n |  Y  |\n  \\___/',
    desc:'God of war. In Rome\'s shadow, he was glorious. Now he is blood.',
    combatMsg:'Mars paints the walls with your blood.',
  },
  {
    id:'mercury_fallen', name:'Mercury, the Silver Tongue', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.ROMAN,
    hp:270, maxHp:270, floor:9, xp:88, gold:70,
    weakTo:'wisdom', goodAgainst:'mercy',
    ascii:'  /===\\\n | ^_^ |\n |  Y  |\n  \\___/',
    desc:'Messenger of the gods, now spreader of misinformation.',
    combatMsg:'Mercury speaks in riddles. Every answer is a trap.',
  },

  // ── THE WATCHERS (Book of Enoch) ─────────────────────────
  {
    id:'semjaza', name:'Semjâzâ, Chief Watcher', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.WATCHER,
    hp:300, maxHp:300, floor:9, xp:95, gold:75,
    weakTo:'fire', goodAgainst:'warfare',
    ascii:'  /^^^\\\n | * * |\n |  Y  |\n  \\___/',
    desc:'Led the Watchers to Earth. Taught humans forbidden knowledge.',
    combatMsg:'Semjâzâ remembers when angels walked the earth.',
  },
  {
    id:'azazel', name:'Âzâzêl, the Bearer', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.WATCHER,
    hp:290, maxHp:290, floor:9, xp:92, gold:72,
    weakTo:'fire', goodAgainst:'praise',
    ascii:'  /^^^\\\n | + + |\n |  Y  |\n  \\___/',
    desc:'Taught humans metallurgy and warfare. Bound in chains of fire.',
    combatMsg:'Âzâzêl breaks its chains. The forge ignites.',
  },
  {
    id:'rumeel', name:'Râmêêl, Thunder of God', tier:DEMON_TIER.FALLEN_ANGEL,
    fallenCategory:FALLEN_CATEGORY.WATCHER,
    hp:285, maxHp:285, floor:9, xp:90, gold:70,
    weakTo:'praise', goodAgainst:'fire',
    ascii:'  /^^^\\\n | - - |\n |  Y  |\n  \\___/',
    desc:'Guides the dead to judgment. His judgment is corrupted.',
    combatMsg:'Râmêêl judges you unworthy. He reaches for your soul.',
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 6: LUCIFER (Floor 10)
  // The Final Boss
  // ═══════════════════════════════════════════════════════════
  {
    id:'lucifer', name:'LUCIFER, Morning Star', tier:DEMON_TIER.LUCIFER,
    hp:500, maxHp:500, floor:10, xp:500, gold:0,
    weakTo:'all_verse_types', // Must use ALL verse types to defeat
    ascii:'      .===###===.\\n     /  ◊  Y  ◊  \\\\\\n    |  __/ \\\\__  |\\n    | |  ===  | |\\n    |  \\\\_____/  |\\n     \\\\_________/\\n      |  |   |  |',
    desc:'The Light-Bringer. The first to rebel. The last enemy.',
    combatMsg:'LUCIFER descends. The abyss brightens. Light itself has been corrupted.',
    isFinalBoss: true,
  },
];

// ── DEMON LOOKUP ────────────────────────────────────────────
function getDemonById(id) { return DEMONS.find(d => d.id === id); }

function getDemonsByTier(tier) { return DEMONS.filter(d => d.tier === tier); }

function getDemonsByFloor(floor) {
  const tierInfo = FLOOR_TIERS.find(f => f.floor === floor);
  if (!tierInfo) return [];
  return DEMONS.filter(d => tierInfo.tiers.includes(d.tier));
}

// Get a random demon for a floor
function getDemonForFloor(floor, usedDemons = []) {
  const eligible = getDemonsByFloor(floor).filter(d => !usedDemons.includes(d.id));
  if (eligible.length === 0) {
    // Fallback: scaled generic
    return generateGenericDemon(floor);
  }
  return { ...RNG.choice(eligible) };
}

// Generate scaled generic demon for floors with no specific demon
function generateGenericDemon(floor) {
  const types = Object.values(SIN_TYPE);
  const type = RNG.choice(types);
  const sinNames = {deception:'Deceiver',lust:'Tempter',wrath:'Rager',pride:'Arrogant',despair:'Despairer',greed:'Hoarding',sloth:'Lethargic'};
  const hp = 20 + floor * 15;
  return {
    id:`generic_${floor}_${Date.now()}`, name:`${sinNames[type]} of the Abyss`,
    tier: DEMON_TIER.COMMON, type, sin: type,
    hp, maxHp:hp, floor, xp:8+floor*5, gold:3+floor*3,
    weakTo: type === 'deception'?'wisdom':type === 'wrath'?'praise':type === 'pride'?'warfare':type === 'lust'?'mercy':type === 'despair'?'praise':type === 'greed'?'mercy':'fire',
    goodAgainst:'praise',
    ascii:'  .---.\n / o_o \\\n |  ___  |\n  \\_____/',
    desc:'A demon born from the darkness of this floor.',
    combatMsg:'A lesser demon blocks your path.',
  };
}

// ── TIER LABELS ─────────────────────────────────────────────
const TIER_NAMES = {
  [DEMON_TIER.COMMON]:      'Demon',
  [DEMON_TIER.SQUAD]:       'Squad',
  [DEMON_TIER.LEGION]:      'Legion',
  [DEMON_TIER.POWER]:       'Power',
  [DEMON_TIER.PRINCIPALITY]:'Principality',
  [DEMON_TIER.FALLEN_ANGEL]:'Fallen Angel',
  [DEMON_TIER.LUCIFER]:     'The Dragon',
};

const TIER_COLORS = {
  [DEMON_TIER.COMMON]:      '#8877aa',
  [DEMON_TIER.SQUAD]:       '#aa7744',
  [DEMON_TIER.LEGION]:      '#cc5533',
  [DEMON_TIER.POWER]:       '#aa33cc',
  [DEMON_TIER.PRINCIPALITY]:'#33aacc',
  [DEMON_TIER.FALLEN_ANGEL]:'#ffcc00',
  [DEMON_TIER.LUCIFER]:     '#ff4444',
};

// Get damage multiplier for combat
function getDamageMultiplier(demonType, verseType, demonWeakTo) {
  if (demonWeakTo === 'all_verse_types') return 1.2; // Lucifer takes neutral from all
  if (demonWeakTo === verseType) return 2.0;
  // Check goodAgainst
  const demon = DEMONS.find(d => d.type === demonType || d.weakTo === demonWeakTo);
  if (demon && demon.goodAgainst === verseType) return 1.5;
  return 0.5;
}

// ── COMBAT MESSAGES BY TIER ─────────────────────────────────
const TIER_INTROS = {
  [DEMON_TIER.COMMON]:      'A lesser demon appears.',
  [DEMON_TIER.SQUAD]:       'A group of demons coordinate their attack.',
  [DEMON_TIER.LEGION]:      'A legion materializes. Their commander leads the charge.',
  [DEMON_TIER.POWER]:       'A Power descends. The air thickens with dread.',
  [DEMON_TIER.PRINCIPALITY]:'A Principality awakens. The territory itself bows.',
  [DEMON_TIER.FALLEN_ANGEL]:'A fallen angel appears. You feel the weight of heaven\'s judgment.',
  [DEMON_TIER.LUCIFER]:     'LUCIFER descends. The abyss itself trembles.',
};
