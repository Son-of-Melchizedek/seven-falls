// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Knowledge System
// Persists between runs. Knowledge IS the progression.
// ═══════════════════════════════════════════════════════════════

const KnowledgeSystem = {
  // ── Stored between runs (localStorage) ───────────────────
  store: {
    // Bestiary: what you've learned about each demon type
    bestiary: {},       // { demonType: { seen: 0, killed: 0, weakTo: null, notes: [] } }
    
    // Verses you've discovered (found on scrolls, bought, or learned from scholars)
    discoveredVerses: [],  // verse IDs
    
    // Scroll fragments found (partial knowledge before full verse)
    scrollFragments: {},   // { verseId: fragmentsFound: N }
    
    // Environmental observations
    observations: [],      // { type, text, location, floor }
    
    // Stats across all runs
    totalRuns: 0,
    bestFloor: 0,
    totalDemonsSlain: 0,
    totalVersesMemorized: 0,
    
    // Run-specific persistent data
    currentRun: null,
    
    // Scholar notes found (environmental storytelling)
    scholarNotesFound: [],
    
    // Death insights (what you learned from dying)
    deathInsights: [],
    
    // Store version for migration
    version: 1,
  },

  // ── Save/Load ──────────────────────────────────────────
  save() {
    try {
      localStorage.setItem('seven_falls_knowledge', JSON.stringify(this.store));
    } catch(e) { /* localStorage full or unavailable */ }
  },

  load() {
    try {
      const data = localStorage.getItem('seven_falls_knowledge');
      if (data) {
        const parsed = JSON.parse(data);
        Object.assign(this.store, parsed);
      }
    } catch(e) { /* corrupt data, start fresh */ }
  },

  reset() {
    localStorage.removeItem('seven_falls_knowledge');
    this.store = {
      bestiary: {},
      discoveredVerses: [],
      scrollFragments: {},
      observations: [],
      totalRuns: 0,
      bestFloor: 0,
      totalDemonsSlain: 0,
      totalVersesMemorized: 0,
      currentRun: null,
      scholarNotesFound: [],
      deathInsights: [],
      version: 1,
    };
  },

  // ── Bestiary ───────────────────────────────────────────
  observeDemon(demonType) {
    if (!this.store.bestiary[demonType]) {
      this.store.bestiary[demonType] = {
        seen: 0, killed: 0,
        weakTo: null, resistantTo: null,
        notes: [],
        firstSeen: Date.now(),
      };
    }
    this.store.bestiary[demonType].seen++;
    this.save();
  },

  slayDemon(demonType) {
    this.observeDemon(demonType);
    this.store.bestiary[demonType].killed++;
    this.store.totalDemonsSlain++;
    
    // After killing 1 of a type, you learn what it's weak to
    if (this.store.bestiary[demonType].killed === 1) {
      const weaknesses = WEAKNESS_MAP[demonType];
      if (weaknesses) {
        this.store.bestiary[demonType].weakTo = weaknesses.best;
        this.store.bestiary[demonType].notes.push(
          `Weak to ${weaknesses.best} verses.`
        );
      }
    }
    // After killing 3, you learn resistance
    if (this.store.bestiary[demonType].killed >= 3) {
      const weaknesses = WEAKNESS_MAP[demonType];
      if (weaknesses) {
        // Resistance is the type NOT best or good
        const allTypes = ['praise','wisdom','warfare','fire','mercy'];
        const resisted = allTypes.find(t => t !== weaknesses.best && t !== weaknesses.good);
        this.store.bestiary[demonType].resistantTo = resisted;
      }
    }
    this.save();
  },

  getBestiaryEntry(demonType) {
    return this.store.bestiary[demonType] || null;
  },

  getWeaknessHint(demonType) {
    const entry = this.store.bestiary[demonType];
    if (!entry) return null;
    if (entry.killed >= 1) return entry.weakTo;
    if (entry.seen >= 2) return 'Unknown — but you\'ve seen it enough to try.';
    return null;
  },

  // ── Verse Discovery ────────────────────────────────────
  discoverVerse(verseId) {
    if (!this.store.discoveredVerses.includes(verseId)) {
      this.store.discoveredVerses.push(verseId);
      this.store.totalVersesMemorized++;
      this.save();
    }
  },

  isVerseDiscovered(verseId) {
    return this.store.discoveredVerses.includes(verseId);
  },

  addScrollFragment(verseId) {
    if (!this.store.scrollFragments[verseId]) {
      this.store.scrollFragments[verseId] = { fragmentsFound: 0 };
    }
    this.store.scrollFragments[verseId].fragmentsFound++;
    
    // Find the verse to check fragment count
    const verse = VERSES.find(v => v.id === verseId);
    if (verse) {
      const needed = verse.difficulty; // 1-3 fragments needed
      if (this.store.scrollFragments[verseId].fragmentsFound >= needed) {
        this.discoverVerse(verseId);
        return { discovered: true, verse };
      }
    }
    this.save();
    return { discovered: false, fragments: this.store.scrollFragments[verseId].fragmentsFound };
  },

  // ── Scholar Notes (environmental storytelling) ──────────
  addScholarNote(note) {
    if (!this.store.scholarNotesFound.includes(note.id)) {
      this.store.scholarNotesFound.push(note.id);
      this.save();
    }
  },

  getScholarNote(id) {
    return SCHOLAR_NOTES.find(n => n.id === id) || null;
  },

  // ── Death Insights ─────────────────────────────────────
  recordDeathInsight(insight) {
    if (!this.store.deathInsights.includes(insight)) {
      this.store.deathInsights.push(insight);
      this.save();
    }
  },

  getDeathInsight(demonType, verseType) {
    // Generate contextual insight based on what happened
    const weaknesses = WEAKNESS_MAP[demonType];
    if (!weaknesses) return 'The darkness is unknowable.';
    
    if (verseType === weaknesses.best) {
      return 'Your verse struck true. This demon bows before ' + verseType + '.';
    } else if (verseType === weaknesses.good) {
      return 'Your verse weakened it, but something stronger exists. Try ' + weaknesses.best + '.';
    } else if (verseType && verseType !== weaknesses.best && verseType !== weaknesses.good) {
      const allTypes = ['praise','wisdom','warfare','fire','mercy'];
      const resisted = allTypes.find(t => t !== weaknesses.best && t !== weaknesses.good);
      if (verseType === resisted) {
        return 'This demon is resistant to ' + verseType + '. Try ' + weaknesses.best + ' — it is their bane.';
      }
      return 'Weak. ' + weaknesses.best + ' is their bane. Remember this.';
    }
    return 'You fell. But you learned something.';
  },

  // ── Run Management ─────────────────────────────────────
  startRun() {
    this.store.totalRuns++;
    this.store.currentRun = {
      startTime: Date.now(),
      floor: 1,
      versesUsed: [],
      demonsEncountered: [],
      notesFound: [],
    };
    this.save();
  },

  endRun(floor, survived = false) {
    if (this.store.currentRun) {
      this.store.currentRun.endTime = Date.now();
      this.store.currentRun.finalFloor = floor;
      this.store.currentRun.survived = survived;
    }
    if (floor > this.store.bestFloor) {
      this.store.bestFloor = floor;
    }
    this.save();
  },

  // ── Available verses for a run ─────────────────────────
  getAvailableVerses() {
    return this.store.discoveredVerses;
  },

  getRunStats() {
    return {
      runs: this.store.totalRuns,
      bestFloor: this.store.bestFloor,
      demonsSlain: this.store.totalDemonsSlain,
      versesKnown: this.store.discoveredVerses.length,
      totalVerses: VERSES.length,
      bestiaryEntries: Object.keys(this.store.bestiary).length,
      totalDemonTypes: Object.keys(DEMON_TYPES).length,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// Scholar Notes — Environmental Storytelling
// Found on walls, scrolls, and dying scholars in the dungeon
// ═══════════════════════════════════════════════════════════════

const SCHOLAR_NOTES = [
  // ── General wisdom ─────────────────────────────────────
  {
    id: 'note_intro',
    floor: 1,
    text: '"The demons here fear not swords, but Scripture. Each word you chain is a weapon."',
    hint: 'Combat is verse-based. Tap words to form Bible verses.',
  },
  {
    id: 'note_weakness',
    floor: 1,
    text: '"I watched a Lying Spirit recoil when a young scholar whispered Proverbs. The deception fled before wisdom."',
    hint: 'Different demons are weak to different verse types.',
  },
  {
    id: 'note_timer',
    floor: 1,
    text: '"The demons give you only moments. Chain your words quickly — the timer is merciless."',
    hint: 'You have limited time to form verses. Plan your words before the battle.',
  },
  
  // ── Demon-specific notes ───────────────────────────────
  {
    id: 'note_deception',
    floor: 2,
    text: '"The Lying Spirit twists truth. Only Wisdom can pierce its veil of deception."',
    demonType: 'deception',
    weakTo: 'wisdom',
  },
  {
    id: 'note_wrath',
    floor: 2,
    text: '"Wrath feeds on conflict. Praise silences it — the spirit of peace overwhelms rage."',
    demonType: 'wrath',
    weakTo: 'praise',
  },
  {
    id: 'note_pride',
    floor: 3,
    text: '"The Imp of Pride swells when you fight force with force. The armor of God humbles it."',
    demonType: 'pride',
    weakTo: 'warfare',
  },
  {
    id: 'note_lust',
    floor: 3,
    text: '"Lust preys on desire. Mercy and forgiveness starve it."',
    demonType: 'lust',
    weakTo: 'mercy',
  },
  {
    id: 'note_despair',
    floor: 4,
    text: '"Despair is a深渊. Only praise — lifting your voice to heaven — can pull you from its grip."',
    demonType: 'despair',
    weakTo: 'praise',
  },
  {
    id: 'note_false_prophet',
    floor: 5,
    text: '"The False Prophet speaks in half-truths. Fire purifies — Revelation burns away the lie."',
    demonType: 'false_prophet',
    weakTo: 'fire',
  },
  {
    id: 'note_leviathan',
    floor: 8,
    text: '"Leviathan... only fire can reach it. The beast is beyond mortal strength."',
    demonType: 'leviathan',
    weakTo: 'fire',
  },
  
  // ── Floor-specific hints ───────────────────────────────
  {
    id: 'note_floor3',
    floor: 3,
    text: '"The shrines grow rarer deeper down. When you find one, kneel — they heal and teach."',
    hint: 'Shrines heal you AND can teach new verses.',
  },
  {
    id: 'note_floor5',
    floor: 5,
    text: '"I saw scrolls hidden in treasure rooms. The words on them... they unlock new verses for battle."',
    hint: 'Treasure rooms may contain scrolls that teach new verses.',
  },
  {
    id: 'note_floor7',
    floor: 7,
    text: '"The deeper floors hold Mammon and Abaddon. They are not like the lesser demons."',
    hint: 'Boss demons appear on later floors. They have massive HP pools.',
  },
  {
    id: 'note_floor10',
    floor: 10,
    text: '"The Dragon awaits at the bottom. Only the Word itself can defeat it."',
    hint: 'The final boss requires powerful, long verses to defeat.',
  },
  
  // ── Lore / atmosphere ──────────────────────────────────
  {
    id: 'note_lore1',
    floor: 1,
    text: '"Seven times I have fallen. Seven times He has lifted me. The Proverb is true."',
    hint: 'Referencing Proverbs 24:16 — the game\'s central theme.',
  },
  {
    id: 'note_lore2',
    floor: 4,
    text: '"The dungeon was not built by man. It was carved from the space between heaven and earth."',
  },
  {
    id: 'note_lore3',
    floor: 6,
    text: '"I counted the demon types. Eight in total. Each one a corruption of something holy."',
    hint: 'There are 8 demon types, each with specific weaknesses.',
  },
  {
    id: 'note_lore4',
    floor: 8,
    text: '"The Dragon was an angel once. Before the fall. Remember that when you face it."',
  },
];

// Get a random scholar note for a floor
function getScholarNoteForFloor(floor) {
  const available = SCHOLAR_NOTES.filter(n => 
    n.floor <= floor && !KnowledgeSystem.store.scholarNotesFound.includes(n.id)
  );
  if (available.length === 0) {
    // All found — give a random one you already have
    return SCHOLAR_NOTES[Math.floor(RNG.random() * SCHOLAR_NOTES.length)];
  }
  return available[Math.floor(RNG.random() * available.length)];
}
