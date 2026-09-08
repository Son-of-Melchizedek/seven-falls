// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Verse Database
// Each verse is a combat "spell" made of words the player chains
// ═══════════════════════════════════════════════════════════════

const VERSE_TYPES = {
  PRaise: 'praise',       // Psalms — healing, shield, sustain
  WISDOM: 'wisdom',       // Proverbs — judgment, reveal, debuff
  WARFARE: 'warfare',     // Ephesians — armor, attack, smite
  FIRE: 'fire',           // Revelation — heavy damage, AoE
  MERCY: 'mercy',         // James — heal, purify, cleanse
};

// difficulty: 1 = short/famous, 2 = medium, 3 = long/obscure
const VERSES = [
  // ── PRAISE (Psalms) ──────────────────────────────────────
  {
    id: 'ps23_1', type: 'praise', difficulty: 1,
    text: 'The Lord is my shepherd',
    words: ['The','Lord','is','my','shepherd'],
    reference: 'Psalm 23:1',
    damage: 8, effect: 'heal_5',
  },
  {
    id: 'ps46_1', type: 'praise', difficulty: 1,
    text: 'God is our refuge and strength',
    words: ['God','is','our','refuge','and','strength'],
    reference: 'Psalm 46:1',
    damage: 10, effect: 'shield',
  },
  {
    id: 'ps91_1', type: 'praise', difficulty: 2,
    text: 'He that dwelleth in the secret place of the most High',
    words: ['He','that','dwelleth','in','the','secret','place','of','the','most','High'],
    reference: 'Psalm 91:1',
    damage: 15, effect: 'heal_10',
  },
  {
    id: 'ps118_24', type: 'praise', difficulty: 1,
    text: 'This is the day which the Lord hath made',
    words: ['This','is','the','day','which','the','Lord','hath','made'],
    reference: 'Psalm 118:24',
    damage: 7, effect: 'heal_3',
  },
  {
    id: 'ps27_1', type: 'praise', difficulty: 1,
    text: 'The Lord is my light and my salvation',
    words: ['The','Lord','is','my','light','and','my','salvation'],
    reference: 'Psalm 27:1',
    damage: 12, effect: 'smite',
  },

  // ── WISDOM (Proverbs) ────────────────────────────────────
  {
    id: 'prov3_5', type: 'wisdom', difficulty: 1,
    text: 'Trust in the Lord with all thine heart',
    words: ['Trust','in','the','Lord','with','all','thine','heart'],
    reference: 'Proverbs 3:5',
    damage: 9, effect: 'reveal_weakness',
  },
  {
    id: 'prov9_10', type: 'wisdom', difficulty: 2,
    text: 'The fear of the Lord is the beginning of wisdom',
    words: ['The','fear','of','the','Lord','is','the','beginning','of','wisdom'],
    reference: 'Proverbs 9:10',
    damage: 14, effect: 'judgment',
  },
  {
    id: 'prov18_21', type: 'wisdom', difficulty: 2,
    text: 'Death and life are in the power of the tongue',
    words: ['Death','and','life','are','in','the','power','of','the','tongue'],
    reference: 'Proverbs 18:21',
    damage: 13, effect: 'stun',
  },
  {
    id: 'prov24_16', type: 'wisdom', difficulty: 3,
    text: 'A just man falleth seven times and riseth up again',
    words: ['A','just','man','falleth','seven','times','and','riseth','up','again'],
    reference: 'Proverbs 24:16',
    damage: 20, effect: 'revive',
  },
  {
    id: 'prov15_1', type: 'wisdom', difficulty: 1,
    text: 'A soft answer turneth away wrath',
    words: ['A','soft','answer','turneth','away','wrath'],
    reference: 'Proverbs 15:1',
    damage: 8, effect: 'debuff',
  },

  // ── WARFARE (Ephesians) ──────────────────────────────────
  {
    id: 'eph6_10', type: 'warfare', difficulty: 1,
    text: 'Be strong in the Lord',
    words: ['Be','strong','in','the','Lord'],
    reference: 'Ephesians 6:10',
    damage: 11, effect: 'buff',
  },
  {
    id: 'eph6_11', type: 'warfare', difficulty: 2,
    text: 'Put on the whole armour of God',
    words: ['Put','on','the','whole','armour','of','God'],
    reference: 'Ephesians 6:11',
    damage: 13, effect: 'armor',
  },
  {
    id: 'eph6_16', type: 'warfare', difficulty: 2,
    text: 'The shield of faith quenching all fiery darts',
    words: ['The','shield','of','faith','quenching','all','fiery','darts'],
    reference: 'Ephesians 6:16',
    damage: 14, effect: 'shield',
  },
  {
    id: 'eph6_17', type: 'warfare', difficulty: 3,
    text: 'The sword of the Spirit which is the word of God',
    words: ['The','sword','of','the','Spirit','which','is','the','word','of','God'],
    reference: 'Ephesians 6:17',
    damage: 22, effect: 'smite',
  },

  // ── FIRE (Revelation) ────────────────────────────────────
  {
    id: 'rev12_11', type: 'fire', difficulty: 2,
    text: 'They overcame him by the blood of the Lamb',
    words: ['They','overcame','him','by','the','blood','of','the','Lamb'],
    reference: 'Revelation 12:11',
    damage: 16, effect: 'smite',
  },
  {
    id: 'rev21_4', type: 'fire', difficulty: 2,
    text: 'God shall wipe away all tears from their eyes',
    words: ['God','shall','wipe','away','all','tears','from','their','eyes'],
    reference: 'Revelation 21:4',
    damage: 12, effect: 'heal_15',
  },
  {
    id: 'rev19_15', type: 'fire', difficulty: 3,
    text: 'Out of his mouth goeth a sharp sword',
    words: ['Out','of','his','mouth','goeth','a','sharp','sword'],
    reference: 'Revelation 19:15',
    damage: 25, effect: 'smite',
  },

  // ── MERCY (James / 1 John / Romans) ──────────────────────
  {
    id: 'jam1_5', type: 'mercy', difficulty: 1,
    text: 'If any man lack wisdom let him ask of God',
    words: ['If','any','man','lack','wisdom','let','him','ask','of','God'],
    reference: 'James 1:5',
    damage: 10, effect: 'heal_8',
  },
  {
    id: '1jn4_8', type: 'mercy', difficulty: 1,
    text: 'God is love',
    words: ['God','is','love'],
    reference: '1 John 4:8',
    damage: 6, effect: 'heal_5',
  },
  {
    id: 'rom8_28', type: 'mercy', difficulty: 2,
    text: 'All things work together for good',
    words: ['All','things','work','together','for','good'],
    reference: 'Romans 8:28',
    damage: 11, effect: 'buff',
  },
  {
    id: 'rom8_31', type: 'mercy', difficulty: 2,
    text: 'If God be for us who can be against us',
    words: ['If','God','be','for','us','who','can','be','against','us'],
    reference: 'Romans 8:31',
    damage: 15, effect: 'shield',
  },
];

// Get verses available at a given floor depth (difficulty scales)
function getVersesForFloor(floor) {
  const maxDiff = Math.min(3, 1 + Math.floor(floor / 3));
  return VERSES.filter(v => v.difficulty <= maxDiff);
}

// Build the combat word pool from a QUEUE of verses (array, not a single verse).
//   verses    : ordered array; verses[0] is the ACTIVE target, the rest sit
//               queued below it. The UI presents them as one pool.
//   floor     : current floor depth (for decoy scaling).
//   usedWords : Set of words already used correctly — excluded so a finished
//               verse's words leave the pool and the next verse's words replace
//               them, keeping the visible pool at ~15-20 words.
// Returns a flat array of word strings (length clamped to [15,20] when possible).
function getCombatPool(verses, floor, usedWords) {
  usedWords = usedWords || new Set();
  if (!verses || verses.length === 0) return [];

  // ── Correct words: every not-yet-used word from the queued verses ──
  const correct = [];
  for (const v of verses) {
    for (const w of v.words) {
      if (!usedWords.has(w) && !correct.includes(w)) correct.push(w);
    }
  }

  // ── Decoys: words from verses NOT in this combat's queue ──
  const queuedIds = verses.map(v => v.id);
  const other = VERSES.filter(v => !queuedIds.includes(v.id));
  const uniqueDecoys = [...new Set(other.flatMap(v => v.words))];
  const shuffledDecoys = uniqueDecoys.sort(() => Math.random() - 0.5);

  // ── Keep ~15-20 visible words ──
  const TARGET_MIN = 15, TARGET_MAX = 20;
  const need = Math.max(0, TARGET_MIN - correct.length);
  let decoys = shuffledDecoys.slice(0, Math.min(need, shuffledDecoys.length));
  let combined = [...correct, ...decoys].sort(() => Math.random() - 0.5);
  // If still under target (very short verses), pad with more decoys up to TARGET_MAX
  if (combined.length < TARGET_MIN) {
    const extra = shuffledDecoys.slice(decoys.length, TARGET_MAX - correct.length);
    combined = [...combined, ...extra].sort(() => Math.random() - 0.5);
  }
  // Hard cap at TARGET_MAX
  if (combined.length > TARGET_MAX) combined = combined.slice(0, TARGET_MAX);
  return combined;
}

// Returns an ordered queue of 3-4 verses for the current combat.
//   knownVerseIds : verses the player has already discovered (preferred so the
//                   combat stays solvable), mixed with fresh floor verses to learn.
function getNextVerseQueue(knownVerseIds, floor) {
  knownVerseIds = knownVerseIds || [];
  const floorVerses = getVersesForFloor(floor);
  const known = floorVerses.filter(v => knownVerseIds.includes(v.id));
  const unknown = floorVerses.filter(v => !knownVerseIds.includes(v.id));
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  const queue = [];
  // Lead with known verses (solvable), then fold in new ones to learn.
  for (const v of shuffle(known)) { if (queue.length >= 2) break; queue.push(v); }
  for (const v of shuffle(unknown)) { if (queue.length >= 3) break; queue.push(v); }
  // Top up to at least 3 with anything available.
  for (const v of shuffle(floorVerses)) {
    if (queue.length >= 3) break;
    if (!queue.includes(v)) queue.push(v);
  }
  return queue.slice(0, 4);
}

// Check if selected words form one of the supplied target verses.
//   selected : array of word strings (the player's current chain)
//   verses   : array of candidate verse objects (the current queue)
// Returns the matched verse object, or null.
function checkVerse(selected, verses) {
  for (const vObj of verses) {
    const target = vObj.words;
    if (selected.length !== target.length) continue;
    if (selected.every((w, i) => w === target[i])) return vObj;
  }
  return null;
}

// Get a random verse for combat
function getRandomVerse(floor) {
  const available = getVersesForFloor(floor);
  return available[Math.floor(Math.random() * available.length)];
}
