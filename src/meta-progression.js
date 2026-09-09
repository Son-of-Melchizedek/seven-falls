// meta-progression.js — standalone meta-progression module for Seven Falls
// Exposes global `MetaProg`. Do NOT edit index.html.
(function (global) {
  'use strict';

  const LS_PACKS = 'seven_falls_packs';
  const LS_DAILY_UNLOCKED = 'seven_falls_daily_unlocked';
  const LS_TYPES = 'seven_falls_types';
  const LS_HISTORY = 'seven_falls_history';

  const BESTIARY_TARGETS = ['demon', 'elite', 'boss', 'nemesis', 'lust', 'swarm', 'fallen_angel', 'power'];

  function readJSON(key, fallback) {
    try {
      const raw = global.localStorage && global.localStorage.getItem(key);
      if (!raw) return fallback;
      const val = JSON.parse(raw);
      return val === null ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage may be unavailable */ }
  }

  const MetaProg = {
    // ---- Seed sharing ----
    seedFromRun() {
      const s = (typeof global.game !== 'undefined' && global.game && global.game.seed) || 0;
      return (s >>> 0).toString(36);
    },

    parseSeed(str) {
      if (typeof str !== 'string') return 0;
      const n = parseInt(str.trim(), 36);
      return isNaN(n) ? 0 : (n >>> 0);
    },

    shareSeedCurrent() {
      const s = (typeof global.game !== 'undefined' && global.game && global.game.seed) || 0;
      return (s >>> 0).toString(36);
    },

    // ---- Daily challenge ----
    dailySeed() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const num = parseInt(y + m + day, 10); // YYYYMMDD
      return (num >>> 0);
    },

    isDailyUnlocked() {
      return readJSON(LS_DAILY_UNLOCKED, false) === true;
    },

    _setDailyUnlocked() {
      writeJSON(LS_DAILY_UNLOCKED, true);
    },

    // Called by index.html when floor 3 is reached at least once.
    noteFloorReached(floor) {
      if (floor >= 3) this._setDailyUnlocked();
    },

    // ---- Unlockable packs ----
    get packsOwned() {
      return readJSON(LS_PACKS, []);
    },

    unlockPack(id) {
      const owned = readJSON(LS_PACKS, []);
      if (!owned.includes(id)) {
        owned.push(id);
        writeJSON(LS_PACKS, owned);
      }
      return owned;
    },

    hasPack(id) {
      return readJSON(LS_PACKS, []).includes(id);
    },

    activePacks() {
      return readJSON(LS_PACKS, []);
    },

    // Auto-unlock checks based on deepest floor reached this run.
    checkFloorUnlocks(floor) {
      if (floor >= 5) this.unlockPack('epistles');
      if (floor >= 8) this.unlockPack('prophecy');
      return this.activePacks();
    },

    // ---- Bestiary bonus ----
    recordDiscoveredType(type) {
      if (!type) return;
      const types = readJSON(LS_TYPES, []);
      if (!types.includes(type)) {
        types.push(type);
        writeJSON(LS_TYPES, types);
      }
    },

    bestiaryBonusActive() {
      const types = readJSON(LS_TYPES, []);
      return BESTIARY_TARGETS.every(t => types.includes(t));
    },

    // ---- Run history ----
    addRun(record) {
      const history = readJSON(LS_HISTORY, []);
      const entry = Object.assign(
        { date: Date.now(), floor: 0, kills: 0, verses: 0, won: false, time: 0 },
        record || {}
      );
      history.push(entry);
      while (history.length > 10) history.shift();
      writeJSON(LS_HISTORY, history);
      return history;
    },

    getHistory() {
      return readJSON(LS_HISTORY, []);
    }
  };

  global.MetaProg = MetaProg;
  if (typeof window !== 'undefined') window.MetaProg = MetaProg;
  if (typeof globalThis !== 'undefined') globalThis.MetaProg = MetaProg;
})(typeof window !== 'undefined' ? window : this);

// Global MetaProg exposed.
