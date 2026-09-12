// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Map System (Slay the Spire style)
// Branching paths, events, shops, rest sites, elite encounters
// ═══════════════════════════════════════════════════════════════

// ── NODE TYPES ──────────────────────────────────────────────
const NODE_TYPE = {
  COMBAT:    'combat',     // Regular demon fight
  ELITE:     'elite',      // Harder demon, better rewards
  EVENT:     'event',      // Random event (choice-based)
  SHOP:      'shop',       // Buy verses, items, heal
  REST:      'rest',       // Heal or upgrade verse
  TREASURE:  'treasure',   // Free loot
  BOSS:      'boss',       // Floor boss
  START:     'start',      // Entry point
};

// ── EVENT TYPES ─────────────────────────────────────────────
const EVENTS = [
  {
    id: 'dying_scholar',
    title: 'Dying Scholar',
    text: 'A scholar lies dying. He clutches a scroll. "Take it... learn what I could not..."',
    choices: [
      { text: 'Take the scroll', effect: 'learn_verse', weight: 1 },
      { text: 'Pray for him', effect: 'heal_20', weight: 1 },
      { text: 'Leave him', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'golden_idol',
    title: 'Golden Idol',
    text: 'A golden idol sits on a pedestal. It radiates warmth. You feel drawn to it.',
    choices: [
      { text: 'Take the idol', effect: 'gold_30_curse', weight: 1 },
      { text: 'Smash it', effect: 'reveal_weakness', weight: 1 },
      { text: 'Leave it', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'whispering_well',
    title: 'Whispering Well',
    text: 'A well whispers forgotten verses. The water glows faintly.',
    choices: [
      { text: 'Drink from the well', effect: 'learn_verse', weight: 1 },
      { text: 'Listen to the whispers', effect: 'reveal_floor_map', weight: 1 },
      { text: 'Walk away', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'fallen_angel_remnant',
    title: 'Fallen Angel Remnant',
    text: 'A broken angel kneels here. Its wings are torn. It looks at you with hollow eyes.',
    choices: [
      { text: '"What can you teach me?"', effect: 'learn_verse', weight: 1 },
      { text: 'Attack it', effect: 'elite_fight', weight: 1 },
      { text: 'Pass by', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'merchant_demon',
    title: 'Merchant Demon',
    text: '"Buying? Selling? I have... things... things you need..." The demon grins.',
    choices: [
      { text: 'Trade 20 gold for a verse', effect: 'shop_verse', cost: 20, weight: 1 },
      { text: 'Trade HP for knowledge', effect: 'hp_cost_verse', cost: 10, weight: 1 },
      { text: 'Decline', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'battlefield',
    title: 'Ancient Battlefield',
    text: 'The remains of a great battle. Scrolls and weapons litter the ground.',
    choices: [
      { text: 'Search the scrolls', effect: 'learn_verse', weight: 1 },
      { text: 'Search for weapons', effect: 'buff_attack', weight: 1 },
      { text: 'Search for armor', effect: 'buff_defense', weight: 1 },
    ],
  },
  {
    id: 'prison_cell',
    title: 'Prison Cell',
    text: 'A figure is chained in the cell. "Free me and I will teach you what I know."',
    choices: [
      { text: 'Free the prisoner', effect: 'learn_verse', weight: 1 },
      { text: 'Leave them', effect: 'nothing', weight: 1 },
      { text: 'Take their chains', effect: 'buff_defense', weight: 1 },
    ],
  },
  {
    id: 'mirror_room',
    title: 'Mirror Room',
    text: 'Mirrors cover every wall. Your reflection moves independently.',
    choices: [
      { text: 'Look into the mirror', effect: 'reveal_self', weight: 1 },
      { text: 'Shatter a mirror', effect: 'random_buff_or_debuff', weight: 1 },
      { text: 'Leave quickly', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'withered_fig',
    title: 'The Withered Fig Tree',
    text: 'A fig tree stands in the road with blackened bark and not one leaf. A single fruit hangs from it, overripe, weeping juice onto the dust.',
    choices: [
      { text: 'Eat the fruit', effect: 'random_buff_or_debuff', weight: 1 },
      { text: 'Pray over the tree', effect: 'buff_defense', weight: 1 },
      { text: 'Pass it by', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'dry_bones',
    title: 'Valley of Dry Bones',
    text: 'The valley floor is white with bones. As you watch, they begin to gather themselves into shapes that still remember being men.',
    choices: [
      { text: 'Speak to the bones', effect: 'reveal_weakness', weight: 1 },
      { text: 'Search the dust', effect: 'gold_30_curse', weight: 1 },
      { text: 'Walk on in silence', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'torn_veil',
    title: 'The Torn Veil',
    text: 'A veil hangs across the passage, rent from top to bottom. Behind it the air is very still and very dark.',
    choices: [
      { text: 'Step through the tear', effect: 'reveal_self', weight: 1 },
      { text: 'Tear it wider', effect: 'random_buff_or_debuff', weight: 1 },
      { text: 'Mend it and leave', effect: 'buff_defense', weight: 1 },
    ],
  },
  {
    id: 'still_waters',
    title: 'Still Waters',
    text: 'A lake lies without a single ripple. It shows no reflection of the sky above — only of you.',
    choices: [
      { text: 'Wade into the water', effect: 'heal_20', weight: 1 },
      { text: 'Study your reflection', effect: 'reveal_weakness', weight: 1 },
      { text: 'Drink deeply', effect: 'hp_cost_verse', cost: 10, weight: 1 },
    ],
  },
  {
    id: 'fiery_furnace',
    title: 'The Fourth in the Fire',
    text: 'A furnace burns in the road without fuel. Four figures walk inside it, and only three of them are bound.',
    choices: [
      { text: 'Walk into the furnace', effect: 'buff_defense', weight: 1 },
      { text: 'Call out to the fourth', effect: 'learn_verse', weight: 1 },
      { text: 'Draw near the flames', effect: 'elite_fight', weight: 1 },
    ],
  },
  {
    id: 'salt_pillar',
    title: 'Pillar of Salt',
    text: 'A woman of salt stands at the roadside, her face turned back toward a burning plain that is no longer there.',
    choices: [
      { text: 'Look back with her', effect: 'hp_cost_verse', cost: 8, weight: 1 },
      { text: 'Scrape salt from her hands', effect: 'gold_30_curse', weight: 1 },
      { text: 'Keep your eyes ahead', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'angel_wrestler',
    title: 'The Wrestler at the Ford',
    text: 'A man waits at the ford, and his face is not a man\'s face. He does not step aside, and the water does not hide him.',
    choices: [
      { text: 'Wrestle him until daybreak', effect: 'elite_fight', weight: 1 },
      { text: 'Ask his name', effect: 'learn_verse', weight: 1 },
      { text: 'Cross downstream', effect: 'nothing', weight: 1 },
    ],
  },
  {
    id: 'still_small_voice',
    title: 'The Still Small Voice',
    text: 'A wind tears at the rocks, then fire, then nothing at all. In the silence after, something small and quiet speaks your name.',
    choices: [
      { text: 'Listen to the voice', effect: 'reveal_floor_map', weight: 1 },
      { text: 'Answer it aloud', effect: 'learn_verse', weight: 1 },
      { text: 'Stand still and be strengthened', effect: 'buff_attack', weight: 1 },
    ],
  },
];

// ── SHOP ITEMS ──────────────────────────────────────────────
const SHOP_ITEMS = [
  { type: 'verse', name: 'Scroll of Praise', verseType: 'praise', cost: 25 },
  { type: 'verse', name: 'Scroll of Wisdom', verseType: 'wisdom', cost: 30 },
  { type: 'verse', name: 'Scroll of Warfare', verseType: 'warfare', cost: 30 },
  { type: 'verse', name: 'Scroll of Fire', verseType: 'fire', cost: 35 },
  { type: 'verse', name: 'Scroll of Mercy', verseType: 'mercy', cost: 25 },
  { type: 'heal', name: 'Holy Water', healAmount: 20, cost: 15 },
  { type: 'heal', name: 'Divine Elixir', healAmount: 40, cost: 30 },
  { type: 'buff', name: 'Iron Faith', buff: 'defense', amount: 2, cost: 35 },
  { type: 'buff', name: 'Burning Zeal', buff: 'attack', amount: 3, cost: 40 },
];

// ── MAP GENERATION ──────────────────────────────────────────
function generateFloorMap(floor) {
  const rows = 8 + floor; // More rows on deeper floors
  const cols = 5;
  const nodes = [];
  
  // Start node (always col 2, row 0)
  nodes.push({ id: 0, row: 0, col: 2, type: NODE_TYPE.START, connections: [] });
  
  // Generate rows
  for (let row = 1; row < rows; row++) {
    const isBoss = row === rows - 1;
    const nodesInRow = isBoss ? 1 : RNG.randint(2, Math.min(cols, 2 + Math.floor(row / 2)));
    
    // Pick which columns have nodes
    const usedCols = new Set();
    const nodeCount = isBoss ? 1 : nodesInRow;
    
    for (let n = 0; n < nodeCount; n++) {
      let col;
      if (isBoss) { col = 2; }
      else {
        do { col = RNG.randint(0, cols - 1); } while (usedCols.has(col));
        usedCols.add(col);
      }
      
      // Determine type
      let type;
      if (isBoss) { type = NODE_TYPE.BOSS; }
      else if (row === 1) { type = NODE_TYPE.COMBAT; }
      else if (row === rows - 2) { type = RNG.choice([NODE_TYPE.COMBAT, NODE_TYPE.ELITE]); }
      else {
        const roll = RNG.random();
        if (roll < 0.40) type = NODE_TYPE.COMBAT;
        else if (roll < 0.55) type = NODE_TYPE.EVENT;
        else if (roll < 0.65) type = NODE_TYPE.SHOP;
        else if (roll < 0.75) type = NODE_TYPE.REST;
        else if (roll < 0.85) type = NODE_TYPE.TREASURE;
        else type = NODE_TYPE.ELITE;
      }
      
      nodes.push({ id: nodes.length, row, col, type, connections: [] });
    }
  }
  
  // Create connections (each node connects to 1-2 nodes in next row)
  for (let row = 0; row < rows - 1; row++) {
    const currentRow = nodes.filter(n => n.row === row);
    const nextRow = nodes.filter(n => n.row === row + 1);
    
    for (const node of currentRow) {
      // Connect to nearest node in next row
      const sorted = [...nextRow].sort((a, b) => Math.abs(a.col - node.col) - Math.abs(b.col - node.col));
      // Always connect to closest
      if (sorted.length > 0) node.connections.push(sorted[0].id);
      // Maybe connect to second closest (not for start node to avoid too many paths)
      if (sorted.length > 1 && RNG.random() < 0.4 && row > 0) {
        node.connections.push(sorted[1].id);
      }
    }
    
    // Ensure every node in next row has at least one incoming connection
    for (const next of nextRow) {
      const hasIncoming = currentRow.some(n => n.connections.includes(next.id));
      if (!hasIncoming) {
        // Connect from closest node in current row
        const closest = [...currentRow].sort((a, b) => Math.abs(a.col - next.col) - Math.abs(b.col - next.col))[0];
        if (closest && !closest.connections.includes(next.id)) {
          closest.connections.push(next.id);
        }
      }
    }
  }
  
  return {
    nodes,
    currentNodeId: 0,
    totalRows: rows,
    visited: new Set([0]),
  };
}

// ── MAP STATE ───────────────────────────────────────────────
const mapState = {
  currentFloor: 1,
  map: null,
  currentNodeId: 0,
  path: [0], // History of visited nodes
};

function initMap(floor) {
  mapState.currentFloor = floor;
  mapState.map = generateFloorMap(floor);
  mapState.currentNodeId = 0;
  mapState.path = [0];
}

function canMoveTo(nodeId) {
  if (!mapState.map) return false;
  const current = mapState.map.nodes.find(n => n.id === mapState.currentNodeId);
  return current && current.connections.includes(nodeId) && !mapState.map.visited.has(nodeId);
}

function moveToNode(nodeId) {
  if (!canMoveTo(nodeId)) return null;
  mapState.currentNodeId = nodeId;
  mapState.map.visited.add(nodeId);
  mapState.path.push(nodeId);
  
  const node = mapState.map.nodes.find(n => n.id === nodeId);
  return node;
}

// ── NODE TYPE → GAME EVENT MAPPING ──────────────────────────
function getNodeEvent(node) {
  switch (node.type) {
    case NODE_TYPE.COMBAT:
      return { action: 'combat', demon: getDemonForFloor(mapState.currentFloor) };
    case NODE_TYPE.ELITE:
      return { action: 'elite_combat', demon: getEliteDemon(mapState.currentFloor) };
    case NODE_TYPE.BOSS:
      return { action: 'boss_combat', demon: getBossForFloor(mapState.currentFloor) };
    case NODE_TYPE.EVENT:
      return { action: 'event', event: RNG.choice(EVENTS) };
    case NODE_TYPE.SHOP:
      return { action: 'shop', items: generateShopItems(mapState.currentFloor) };
    case NODE_TYPE.REST:
      return { action: 'rest' };
    case NODE_TYPE.TREASURE:
      return { action: 'treasure' };
    default:
      return null;
  }
}

function getEliteDemon(floor) {
  const demon = getDemonForFloor(floor);
  // Elites get 50% more HP and better rewards
  demon.hp = Math.floor(demon.hp * 1.5);
  demon.maxHp = demon.hp;
  demon.xp = Math.floor(demon.xp * 2);
  demon.gold = Math.floor(demon.gold * 2);
  demon.isElite = true;
  return demon;
}

function getBossForFloor(floor) {
  // Bosses are specific to floor tier
  const tierInfo = FLOOR_TIERS.find(f => f.floor === floor);
  if (!tierInfo) return getDemonForFloor(floor);
  
  const bossDemons = DEMONS.filter(d => 
    tierInfo.tiers.includes(d.tier) && 
    (d.isDuke || d.isFinalBoss || d.legionCommander || d.tier >= DEMON_TIER.POWER)
  );
  
  if (bossDemons.length > 0) {
    const boss = { ...RNG.choice(bossDemons) };
    boss.hp = Math.floor(boss.hp * 1.3);
    boss.maxHp = boss.hp;
    boss.xp = Math.floor(boss.xp * 3);
    boss.gold = Math.floor(boss.gold * 3);
    boss.isBoss = true;
    return boss;
  }
  
  return getEliteDemon(floor);
}

function generateShopItems(floor) {
  const items = [];
  const seen = new Set();
  const count = 4 + Math.floor(RNG.random() * 3);
  for (let i = 0; i < count; i++) {
    // A shop that stocks the same scroll twice reads as a bug, not a gamble.
    let item, key, tries = 0;
    do {
      item = { ...RNG.choice(SHOP_ITEMS) };
      // Scale prices with floor
      item.cost = Math.floor(item.cost * (1 + floor * 0.1));
      if (item.type === 'verse') {
        // Pick a specific verse of this type
        const available = VERSES.filter(v => v.type === item.verseType && v.difficulty <= 2);
        if (available.length > 0) {
          const verse = RNG.choice(available);
          item.verseId = verse.id;
          item.name = `${item.name}: "${verse.text}"`;
        }
      }
      key = item.verseId || item.name;
    } while (seen.has(key) && ++tries < 8);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

// ── NEMESIS SYSTEM ──────────────────────────────────────────
// A recurring enemy that grows stronger each run
const NemesisSystem = {
  nemesis: null,
  
  init() {
    // Load saved nemesis or create new one
    try {
      const saved = localStorage.getItem('seven_falls_nemesis');
      if (saved) { this.nemesis = JSON.parse(saved); return; }
    } catch(e) {}
    
    // Create initial nemesis
    this.nemesis = {
      name: 'The Stalker',
      type: SIN_TYPE.DECEPTION,
      baseHp: 50,
      hp: 50,
      killCount: 0,
      encounterCount: 0,
      lastFloor: 0,
    };
  },
  
  save() {
    try { localStorage.setItem('seven_falls_nemesis', JSON.stringify(this.nemesis)); } catch(e) {}
  },
  
  // Nemesis appears every 3 floors
  shouldAppear(floor) {
    return floor % 3 === 0 && floor > 1;
  },
  
  // Get scaled nemesis for current run
  getScaled() {
    const scaling = 1 + (this.nemesis.encounterCount * 0.2); // +20% each encounter
    return {
      ...this.nemesis,
      hp: Math.floor(this.nemesis.baseHp * scaling),
      maxHp: Math.floor(this.nemesis.baseHp * scaling),
      tier: DEMON_TIER.LEGION,
      floor: game.floor,
      xp: 30 + this.nemesis.encounterCount * 10,
      gold: 20 + this.nemesis.encounterCount * 5,
      weakTo: 'wisdom',
      combatMsg: `The Stalker returns. It has grown stronger. Encounter #${this.nemesis.encounterCount + 1}`,
    };
  },
  
  onEncounter() {
    this.nemesis.encounterCount++;
    this.nemesis.lastFloor = game.floor;
    this.save();
  },
  
  onKill() {
    this.nemesis.killCount++;
    this.nemesis.baseHp += 15; // Permanently stronger next time
    this.save();
  },
  
  onDeath() {
    // Nemesis grows when player dies
    this.nemesis.baseHp += 10;
    this.save();
  },
};

// ── ADAPTIVE DIFFICULTY ─────────────────────────────────────
const AdaptiveDifficulty = {
  stats: {
    wins: 0,
    losses: 0,
    avgFloorReached: 0,
    totalFloors: 0,
    perfectCombats: 0, // Combats won without taking damage
    totalCombats: 0,
  },
  
  init() {
    try {
      const saved = localStorage.getItem('seven_falls_adaptive');
      if (saved) Object.assign(this.stats, JSON.parse(saved));
    } catch(e) {}
  },
  
  save() {
    try { localStorage.setItem('seven_falls_adaptive', JSON.stringify(this.stats)); } catch(e) {}
  },
  
  recordWin(floor, perfectCombat = false) {
    this.stats.wins++;
    this.stats.totalFloors += floor;
    this.stats.avgFloorReached = this.stats.totalFloors / this.stats.wins;
    if (perfectCombat) this.stats.perfectCombats++;
    this.save();
  },
  
  recordLoss(floor) {
    this.stats.losses++;
    this.stats.totalFloors += floor;
    this.stats.avgFloorReached = this.stats.totalFloors / (this.stats.wins + this.stats.losses);
    this.save();
  },
  
  // Get difficulty modifier based on player performance
  getModifier() {
    const total = this.stats.wins + this.stats.losses;
    if (total < 3) return 1.0; // No adjustment for first few runs
    
    const winRate = this.stats.wins / total;
    const avgFloor = this.stats.avgFloorReached;
    
    // Player doing well → harder
    if (winRate > 0.7 && avgFloor > 5) return 1.3;
    if (winRate > 0.5 && avgFloor > 3) return 1.1;
    
    // Player struggling → easier
    if (winRate < 0.3) return 0.7;
    if (winRate < 0.5 && avgFloor < 3) return 0.85;
    
    return 1.0;
  },
  
  // Apply difficulty to demon stats
  applyToDemon(demon) {
    const mod = this.getModifier();
    demon.hp = Math.floor(demon.hp * mod);
    demon.maxHp = demon.hp;
    return demon;
  },
  
  // Get hint frequency (more hints when struggling)
  getHintFrequency() {
    const total = this.stats.wins + this.stats.losses;
    if (total < 3) return 0.8; // Frequent hints early
    const winRate = this.stats.wins / total;
    if (winRate < 0.3) return 0.9; // Very frequent hints
    if (winRate < 0.5) return 0.6;
    return 0.3;
  },
};
