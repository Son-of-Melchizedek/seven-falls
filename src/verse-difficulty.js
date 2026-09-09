// verse-difficulty.js — standalone difficulty scaler for Seven Falls.
// Exposes global `VerseDifficulty`. Does NOT edit index.html or BIBLE_VERSES.
// Game reads `verse.playableWords` if present, else `verse.words`.

const VerseDifficulty = {
  setting: 'normal',

  // Validate and store the difficulty setting. Returns true on success.
  set(s) {
    const v = String(s == null ? '' : s).toLowerCase();
    if (v === 'easy' || v === 'normal' || v === 'hard') {
      this.setting = v;
      return true;
    }
    return false;
  },

  // Human-readable label: 'EASY' | 'NORMAL' | 'HARD'.
  getDifficultyLabel() {
    return this.setting.toUpperCase();
  },

  // Words the player must chain for a verse on a given floor.
  // Early floors = short 'easy core'; deeper floors = longer/harder.
  getPlayableWords(verse, floor) {
    const words = verse && Array.isArray(verse.words) ? verse.words : [];
    const f = Number(floor);
    const fl = isNaN(f) || f < 1 ? 1 : f;

    // 'easy' setting: always keep verses short (first 5-7 words).
    if (this.setting === 'easy') {
      return words.length > 7 ? words.slice(0, 7) : words.slice();
    }
    // 'hard' setting: always full verse.
    if (this.setting === 'hard') {
      return words.slice();
    }
    // 'normal' setting: floor-based scaling.
    if (fl <= 2) {
      // Floors 1-2: shortened easy core (max 7 words).
      return words.length > 7 ? words.slice(0, 7) : words.slice();
    }
    if (fl <= 5) {
      // Floors 3-5: medium (max ~12 words).
      return words.length > 12 ? words.slice(0, 12) : words.slice();
    }
    // Floors 6+: full verse (hard).
    return words.slice();
  },

  // Get a combat verse pair via the game's own getCombatVersePair, then
  // decorate each verse with `playableWords`. Optionally prefers verses that
  // fit the active setting (easy=short/easy, hard=long/hard).
  getScaledVersePair(floor, getCombatVersePair) {
    const call = () => {
      try {
        const r = getCombatVersePair(floor);
        return Array.isArray(r) ? r : [];
      } catch (e) {
        return [];
      }
    };

    let pair = call();

    const fits = (v) => {
      if (this.setting === 'easy') {
        return v && Array.isArray(v.words) && v.words.length <= 7 && (v.difficulty || 0) <= 1;
      }
      if (this.setting === 'hard') {
        return v && Array.isArray(v.words) && v.words.length >= 10 && (v.difficulty || 0) >= 2;
      }
      return true;
    };

    // Try to find a pair that matches the setting preference (a few attempts).
    if (this.setting !== 'normal' && pair.length === 2 &&
        (!fits(pair[0]) || !fits(pair[1]))) {
      for (let i = 0; i < 12; i++) {
        const alt = call();
        if (alt.length === 2 && fits(alt[0]) && fits(alt[1])) {
          pair = alt;
          break;
        }
      }
    }

    return pair.map((v) => {
      const out = Object.assign({}, v);
      out.playableWords = this.getPlayableWords(v, floor);
      return out;
    });
  }
};

// Global VerseDifficulty exposes: setting, set(s), getScaledVersePair(floor, getCombatVersePair),
// getPlayableWords(verse, floor), getDifficultyLabel().
if (typeof window !== 'undefined') window.VerseDifficulty = VerseDifficulty;
if (typeof module !== 'undefined' && module.exports) module.exports = VerseDifficulty;
