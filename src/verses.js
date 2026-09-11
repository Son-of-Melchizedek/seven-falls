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

// Words the player must chain for this verse right now (easy-verse scaling aware).
// VerseDifficulty.getScaledVersePair sets `playableWords`; fall back to `.words`.
function verseWords(v) {
  return (v && v.playableWords && v.playableWords.length) ? v.playableWords : (v.words || []);
}

// Get verses available at a given floor depth (difficulty scales)
function ensureWords(v) {
  if (!v.words) {
    // Split text into words, filter to max 12 words for gameplay
    const raw = v.text.split(/\s+/).filter(w => w.length > 0);
    v.words = raw.slice(0, 12);
  }
  return v;
}

function getVersesForFloor(floor) {
  const maxDiff = Math.min(3, 1 + Math.floor(floor / 3));
  // Use BIBLE_VERSES (1050 verses) if available, else fall back to VERSES
  const source = (typeof BIBLE_VERSES !== 'undefined') ? BIBLE_VERSES : VERSES;
  return source.filter(v => v.difficulty <= maxDiff).map(ensureWords);
}

// Pick 2 distinct verses for a combat, preferring ones small enough to fit the
// on-screen pool (combined word count <= 16). Prefers known verses for comfort.
function getCombatVersePair(floor) {
  const pool = getVersesForFloor(floor);
  let known = pool;
  if (typeof KnowledgeSystem !== 'undefined' && KnowledgeSystem.store) {
    const d = KnowledgeSystem.store.discoveredVerses || [];
    const k = pool.filter(v => d.includes(v.id));
    if (k.length >= 2) known = k;
  }
  const s = known.slice();
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = s[i]; s[i] = s[j]; s[j] = t;
  }
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      if (verseWords(s[i]).length + verseWords(s[j]).length <= 16) return [s[i], s[j]];
    }
  }
  return [s[0], s[1] || s[0]];
}

// Build the combat word pool from a PAIR of verses (2 at a time).
// Returns an array of tokens { word, v } where `v` is the index of the owning
// verse in `verses` (or -1 for a decoy). This lets the UI colour each tile by
// its verse type and support forming ANY of the offered verses — which is what
// the combo system needs.
function getCombatPool(verses, floor, usedWords) {
  usedWords = usedWords || new Set();
  const correct = [];
  verses.forEach((v, vi) => {
    for (const w of verseWords(v)) if (!usedWords.has(w)) correct.push({ word: w, v: vi });
  });

  // Bible verses: add words from discovered verses (v=-2 marks them as "known")
  if (typeof KnowledgeSystem !== 'undefined' && typeof getVerseById === 'function'){
    const discIds = KnowledgeSystem.store.discoveredVerses || [];
    const offeredIds = verses.map(v => v.id);
    const bibleCandidates = discIds.filter(id => !offeredIds.includes(id));
    // Pick up to 2 random discovered verses
    const shuffled = bibleCandidates.sort(() => Math.random() - 0.5).slice(0, 2);
    for (const id of shuffled){
      const bv = getVerseById(id);
      if (bv){
        for (const w of verseWords(bv)) if (!usedWords.has(w)) correct.push({ word: w, v: -2, bibleId: id });
      }
    }
  }

  // Decoys: words from verses NOT in this combat's pair
  const queuedIds = verses.map(v => v.id);
  const other = VERSES.filter(v => !queuedIds.includes(v.id));
  const decoyWords = [...new Set(other.flatMap(v => verseWords(v)))];
  for (let i = decoyWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = decoyWords[i]; decoyWords[i] = decoyWords[j]; decoyWords[j] = t;
  }
  const numDecoys = Math.min(decoyWords.length, Math.max(3, 5 + floor));
  const decoys = decoyWords.slice(0, numDecoys).map(w => ({ word: w, v: -1 }));

  const all = [...correct, ...decoys];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = all[i]; all[i] = all[j]; all[j] = t;
  }
  return all;
}

// Check if the selected tokens form one of the supplied target verses.
//   selected : array of { word, v } tokens (the player's current chain)
//   verses   : array of candidate verse objects (the current pair)
// Returns the matched verse object, or null.
function checkVerse(selected, verses) {
  const sel = selected.map(s => s.word === undefined ? s : s.word);
  // Check offered verses first
  for (const vObj of verses) {
    const target = verseWords(vObj);
    if (sel.length !== target.length) continue;
    if (sel.every((w, i) => w === target[i])) return vObj;
  }
  // Check discovered Bible verses (reduced damage: 50%)
  if (typeof KnowledgeSystem !== 'undefined' && typeof getVerseById === 'function'){
    const discIds = KnowledgeSystem.store.discoveredVerses || [];
    const offeredIds = verses.map(v => v.id);
    for (const id of discIds){
      if (offeredIds.includes(id)) continue; // already checked above
      const bv = getVerseById(id);
      if (!bv) continue;
      const target = verseWords(bv);
      if (sel.length !== target.length) continue;
      if (sel.every((w, i) => w === target[i])) {
        // Return a wrapper that signals "bible verse" with reduced damage
        return Object.assign({}, bv, { _bibleUsed: true, damage: Math.max(3, Math.floor(bv.damage * 0.5)) });
      }
    }
  }
  return null;
}

// Get a random verse for combat
function getRandomVerse(floor) {
  const available = getVersesForFloor(floor);
  return available[Math.floor(Math.random() * available.length)];
}
