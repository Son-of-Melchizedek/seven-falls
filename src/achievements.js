// achievements.js — standalone achievements module for Seven Falls (pixel roguelike)
// Exposes global `Achievements`. Depends only on index.html globals:
//   ctx, W, H, S, C, rect(), text(), setFont(), wrapText()
// Does NOT edit index.html.

const Achievements = (() => {
  const STORAGE_KEY = 'seven_falls_achievements';
  const TOAST_DURATION = 3.0; // seconds

  // --- Definitions ---------------------------------------------------------
  const definitions = [
    { id: 'first_kill',    name: 'First Blood',        desc: 'Slay your first demon.',                icon: '⚔️' },
    { id: 'perfect_floor', name: 'Unblemished',        desc: 'Clear a floor without taking damage.',  icon: '🛡️' },
    { id: 'combo_master',  name: 'Combo Master',       desc: 'Reach a 10-hit combo.',                 icon: '🔥' },
    { id: 'verse_scholar', name: 'Verse Scholar',      desc: 'Learn 5 verses.',                       icon: '📜' },
    { id: 'depth_5',       name: 'Into the Deep',      desc: 'Descend to floor 5.',                   icon: '⬇️' },
    { id: 'depth_8',       name: 'Abyssal',            desc: 'Descend to floor 8.',                   icon: '🌊' },
    { id: 'depth_10',      name: 'The Bottom',         desc: 'Descend to floor 10.',                  icon: '⛰️' },
    { id: 'boss_slayer',   name: 'Boss Slayer',        desc: 'Defeat the Seven Falls warden.',        icon: '👑' },
    { id: 'flow_state',    name: 'Flow State',         desc: 'Reach a 20-hit combo.',                 icon: '🌟' },
    { id: 'ultimate_used', name: 'Unleashed',          desc: 'Use your ultimate ability.',            icon: '💥' },
    { id: 'sacrifice',     name: 'The Sacrifice',      desc: 'Offer a sacrifice.',                    icon: '🕯️' },
    { id: 'bestiary',      name: 'Bestiary',           desc: 'Discover 8 demon types.',              icon: '📖' },
    { id: 'daily',         name: 'Daily Devotion',     desc: 'Complete a daily challenge run.',       icon: '🗓️' },
    { id: 'nemesis_down',  name: 'Nemesis Down',       desc: 'Slay your personal nemesis.',           icon: '💀' },
    { id: 'no_death',      name: 'Untouched',          desc: 'Win a run without dying.',             icon: '✨' },
  ];

  const COMBO_MASTER_AT = 10;
  const FLOW_STATE_AT = 20;
  const VERSE_SCHOLAR_AT = 5;
  const BESTIARY_AT = 8;

  // --- Store (localStorage-backed unlocked ids) ----------------------------
  let store = loadStore();
  const toastQueue = [];

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) { /* storage unavailable — ignore */ }
  }

  // --- Core API ------------------------------------------------------------
  function has(id) {
    return store.indexOf(id) !== -1;
  }

  function unlock(id) {
    if (has(id)) return false;
    const def = definitions.find(d => d.id === id);
    if (!def) return false;
    store.push(id);
    saveStore();
    toastQueue.push({ id: def.id, name: def.name, icon: def.icon });
    return true;
  }

  // --- Run-end evaluation --------------------------------------------------
  function checkRunEnd(rs) {
    if (!rs) return;
    if (rs.demonsSlain > 0) unlock('first_kill');
    if (rs.noDamageFloor) unlock('perfect_floor');
    if (rs.maxCombo >= COMBO_MASTER_AT) unlock('combo_master');
    if (rs.maxCombo >= FLOW_STATE_AT) unlock('flow_state');
    if (rs.versesKnown >= VERSE_SCHOLAR_AT) unlock('verse_scholar');
    if (rs.floor >= 5) unlock('depth_5');
    if (rs.floor >= 8) unlock('depth_8');
    if (rs.floor >= 10) unlock('depth_10');
    if (rs.won) unlock('boss_slayer');
    if (rs.usedUltimate) unlock('ultimate_used');
    if (rs.usedSacrifice) unlock('sacrifice');
    if (Array.isArray(rs.discoveredTypes) && rs.discoveredTypes.length >= BESTIARY_AT) unlock('bestiary');
    if (rs.isDaily) unlock('daily');
    if (rs.nemesisKilled) unlock('nemesis_down');
    if (rs.won && !rs.diedThisRun) unlock('no_death');
  }

  // --- Rendering: panel ----------------------------------------------------
  function renderPanel(x, y, w, h) {
    // panel background
    rect(x, y, w, h, C.bg);
    rect(x, y, w, 1, C.stone);
    rect(x, y + h - 1, w, 1, C.stone);

    setFont(8);
    text('ACHIEVEMENTS', x + 4, y + 10, C.gold, 8, 'left');

    const startY = y + 18;
    const rowH = Math.floor((h - 22) / definitions.length);
    let cy = startY;
    for (const def of definitions) {
      const unlocked = has(def.id);
      const color = unlocked ? C.gold : C.dim;
      text(unlocked ? '✓' : '🔒', x + 4, cy, color, 7, 'left');
      text(def.icon, x + 16, cy, color, 7, 'left');
      const name = def.name;
      text(name, x + 30, cy, color, 7, 'left');
      // description wrapped to remaining width
      const lines = wrapText(def.desc, 22);
      for (let i = 0; i < lines.length; i++) {
        text(lines[i], x + 30, cy + 9 + i * 8, C.dim, 6, 'left');
      }
      cy += Math.max(rowH, 18);
    }
  }

  // --- Rendering: toasts ---------------------------------------------------
  function update(dt) {
    for (let i = toastQueue.length - 1; i >= 0; i--) {
      const t = toastQueue[i];
      t.age = (t.age || 0) + dt;
      if (t.age >= TOAST_DURATION) toastQueue.splice(i, 1);
    }
  }

  function renderToasts() {
    const n = toastQueue.length;
    if (n === 0) return;
    const tw = 200;
    const th = 18;
    let ty = 6;
    for (const t of toastQueue) {
      const cx = Math.floor(W / 2);
      const alpha = Math.min(1, (TOAST_DURATION - t.age) / 0.5); // fade in last 0.5s handled below
      const fade = t.age < 0.3 ? (t.age / 0.3) : (t.age > TOAST_DURATION - 0.5 ? (TOAST_DURATION - t.age) / 0.5 : 1);
      rect(cx - tw / 2, ty, tw, th, C.bg);
      rect(cx - tw / 2, ty, tw, 1, C.gold);
      rect(cx - tw / 2, ty + th - 1, tw, 1, C.gold);
      text(t.icon + '  ' + t.name, cx, ty + 12, C.gold, 8, 'center');
      ty += th + 4;
    }
  }

  return {
    definitions,
    get store() { return store; },
    set store(v) { store = v; },
    toastQueue,
    unlock,
    has,
    renderPanel,
    checkRunEnd,
    update,
    renderToasts,
  };
})();

// Global `Achievements` exposes: definitions, store, unlock(id), has(id),
// renderPanel(x,y,w,h), checkRunEnd(runState), toastQueue[], update(dt),
// renderToasts().
