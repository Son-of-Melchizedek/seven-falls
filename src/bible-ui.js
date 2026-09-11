// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — In-Game Bible Codex UI
// Draws the verse library on the canvas and handles navigation.
//
// Expects the following globals (all provided by index.html):
//   ctx, W, H, C, text, rect, strokeRect, bar, wrapText, button, clickables
//
// Public API:
//   renderBible(ctx, W, H, discoveredIds, currentPage, scrollY)
//   handleBibleClick(x, y, discoveredIds, currentPage, scrollY) -> {action,page,scrollY}
//   BIBLE_UI                      (live navigation state)
//   setBibleNavigate(cb)          (optional hook fired on nav changes)
//   bibleSetSearch(str)           (set the search filter)
//   bibleResetNav()               (back to overview / clear search)
// ═══════════════════════════════════════════════════════════════

// ── Navigation state ────────────────────────────────────
// currentPage is one of:
//   'overview' | 'attack' | 'defense' | 'buff' | 'debuff' | 'ultimate'
//   'detail:<verseId>' | 'search' | 'lore'
const BIBLE_UI = {
  page: 'overview',
  scrollY: 0,
  search: '',
  detailId: null,
  onNav: null,
};

const BIBLE_CAT_LABEL = {
  attack: 'ATTACK', defense: 'DEFENSE', buff: 'BUFF', debuff: 'DEBUFF', ultimate: 'ULTIMATE'
};
const BIBLE_CAT_ORDER = ['attack', 'defense', 'buff', 'debuff', 'ultimate'];

// Lore entries — unlocked as you descend
const LORE_ENTRIES = [
  { id: 'lore_abyss',    title: 'The Abyss',         floor: 1, text: 'Seven depths. Seven watchers. The abyss is not empty — it is occupied. Each floor is a fallen domain, and the Word is the only light that cuts the dark.' },
  { id: 'lore_word',     title: 'The Word',          floor: 1, text: 'You carry no sword. Your weapon is scripture itself. Each verse is a strike, a shield, a blessing. The demons fear the Word because it is truth, and truth cannot be defeated.' },
  { id: 'lore_demons',   title: 'The Seven Hierarchy',floor: 2, text: 'Seven tiers of fallen power: from whispering demons to the Dragon himself. Each tier grows stronger, prouder, more deceptive. But pride always falls before the Word.' },
  { id: 'lore_nemesis',  title: 'The Stalker',        floor: 3, text: 'It watches from the shadows. It learns your patterns. Every three floors it returns, stronger than before. It is your personal nemesis — the sin that knows you best.' },
  { id: 'lore_combos',   title: 'Chaining Scripture',  floor: 3, text: 'When verses chain together, their power multiplies. Attack upon attack, defense upon defense — the Word compounds. This is not magic. This is meditation. This is remembrance.' },
  { id: 'lore_floor5',   title: 'The Deep',           floor: 5, text: 'Below floor five, the air itself resists you. The demons here are ancient — fallen angels who remember heaven. They do not merely fight. They tempt.' },
  { id: 'lore_bosses',   title: 'The Wardens',        floor: 5, text: 'Each floor has a warden — a boss who guards the descent. They are named in the old texts. They are not metaphors. They are real, and they are waiting.' },
  { id: 'lore_floor8',   title: 'The Bottomless',     floor: 8, text: 'At floor eight, you approach the throne of the Dragon. The walls weep. The ground trembles. Every verse you have learned is tested here. There is no turning back.' },
  { id: 'lore_lucifer',  title: 'The Dragon',         floor: 9, text: 'Lucifer. The Light-Bearer. The most beautiful of all who fell. He does not roar — he whispers. He does not attack — he offers. His combat is seduction. His weapon is doubt.' },
  { id: 'lore_victory',  title: 'The Word Prevails',  floor: 10, text: 'The Dragon is bound. The abyss is sealed. But the Word endures forever. Every verse you learned, every chain you forged, every fall you rose from — it is written. It is eternal.' },
];

function setBibleNavigate(cb){ BIBLE_UI.onNav = cb; }
function bibleResetNav(){ BIBLE_UI.page = 'overview'; BIBLE_UI.scrollY = 0; BIBLE_UI.search = ''; BIBLE_UI.detailId = null; }
function bibleSetSearch(s){ BIBLE_UI.search = s || ''; BIBLE_UI.scrollY = 0; }

// Resolve the effective page (detail pages carry an id)
function _bibleEffectivePage(currentPage, detailId){
  if (currentPage && currentPage.indexOf('detail:') === 0) return 'detail';
  return currentPage || 'overview';
}
function _bibleNav(action, page, scrollY, detailId){
  BIBLE_UI.page = page;
  if (typeof scrollY === 'number') BIBLE_UI.scrollY = scrollY;
  if (detailId !== undefined) BIBLE_UI.detailId = detailId;
  if (typeof BIBLE_UI.onNav === 'function'){
    BIBLE_UI.onNav({ action, page, scrollY: BIBLE_UI.scrollY, detailId: BIBLE_UI.detailId });
  }
}

// ── Layout constants (canvas is 384x288) ───────────────
const BIBLE_HEADER_H = 32;
const BIBLE_TAB_Y = 18;
const BIBLE_TAB_H = 16;
const BIBLE_ROW_H = 24;
const BIBLE_SEARCH_BOX_H = 20;
const BIBLE_FOOTER_H = 14;
const BIBLE_SCROLL_COL = 18;

// ── Geometry builder (shared by draw + hit-test) ────────
// Returns list of regions: {x,y,w,h,kind,page,detailId,label,scroll}
function _bibleRegions(discoveredIds, currentPage, scrollY, W, H){
  const regions = [];
  const page = _bibleEffectivePage(currentPage, BIBLE_UI.detailId);
  const contentTop = BIBLE_HEADER_H;
  const contentH = H - contentTop - BIBLE_FOOTER_H;

  // Title bar (back / search affordance)
  regions.push({ x: 4, y: 4, w: 30, h: 9, kind: 'back', label: '< BIBLE', page: 'overview', scroll: 0 });

  if (page === 'overview'){
    // Search button top-right
    regions.push({ x: W - 54, y: 2, w: 50, h: 10, kind: 'btn', label: 'SEARCH', page: 'search', scroll: 0 });
    // Category summary rows (also clickable -> category page)
    let y = contentTop + 6;
    const stats = (typeof getBibleStats === 'function') ? getBibleStats(discoveredIds) : { total: 0, discovered: 0, pct: 0, byCategory: {} };
    regions.push({ x: 6, y: y, w: W - 12, h: 9, kind: 'btn', label: 'TOTAL  ' + stats.discovered + '/' + stats.total + '  (' + stats.pct + '%)', page: 'overview', scroll: 0 });
    y += 13;
    for (const c of BIBLE_CAT_ORDER){
      const s = (stats.byCategory && stats.byCategory[c]) || { total: 0, discovered: 0 };
      regions.push({ x: 6, y: y, w: W - 12, h: 16, kind: 'tab', page: c, label: BIBLE_CAT_LABEL[c], sub: s.discovered + '/' + s.total, scroll: 0 });
      y += 18;
    }
    // Lore tab (below categories)
    const maxFloor = (typeof game !== 'undefined' && game.floor) ? game.floor : 1;
    const loreUnlocked = (typeof LORE_ENTRIES !== 'undefined') ? LORE_ENTRIES.filter(e => e.floor <= maxFloor).length : 0;
    const loreTotal = (typeof LORE_ENTRIES !== 'undefined') ? LORE_ENTRIES.length : 0;
    regions.push({ x: 6, y: y, w: W - 12, h: 12, kind: 'tab', page: 'lore', label: 'LORE', sub: loreUnlocked + '/' + loreTotal, scroll: 0 });
    return regions;
  }

  if (page === 'search'){
    // search box (clicking focuses — handled as a region that clears to type via keydown)
    regions.push({ x: 4, y: contentTop, w: W - 8, h: BIBLE_SEARCH_BOX_H, kind: 'searchbox', label: BIBLE_UI.search || 'type to filter...', page: 'search', scroll: 0 });
    regions.push({ x: W - 40, y: 2, w: 36, h: 10, kind: 'btn', label: 'CLEAR', page: 'search', scroll: 0 });
    // results
    const q = (BIBLE_UI.search || '').toLowerCase();
    const matches = (typeof BIBLE_VERSES !== 'undefined') ? BIBLE_VERSES.filter(v =>
      !q || v.book.toLowerCase().indexOf(q) >= 0 || v.reference.toLowerCase().indexOf(q) >= 0 || v.text.toLowerCase().indexOf(q) >= 0
    ) : [];
    const listTop = contentTop + BIBLE_SEARCH_BOX_H + 4;
    const maxRows = Math.floor((H - listTop - BIBLE_FOOTER_H) / BIBLE_ROW_H);
    const maxScroll = Math.max(0, matches.length * BIBLE_ROW_H - (H - listTop - BIBLE_FOOTER_H));
    const sy = Math.max(0, Math.min(scrollY, maxScroll));
    let i = Math.floor(sy / BIBLE_ROW_H);
    let y = listTop - (sy - i * BIBLE_ROW_H);
    let drawn = 0;
    const rowW = W - 8 - BIBLE_SCROLL_COL;
    while (i < matches.length && drawn < maxRows + 1){
      const v = matches[i];
      regions.push({ x: 4, y: y, w: rowW, h: BIBLE_ROW_H, kind: 'row', page: 'detail', detailId: v.id, label: v.reference, sub: v, scroll: sy });
      y += BIBLE_ROW_H; i++; drawn++;
    }
    if (maxScroll > 0){
      regions.push({ x: W - BIBLE_SCROLL_COL, y: listTop, w: BIBLE_SCROLL_COL - 2, h: 9, kind: 'scrollup', page: 'search', scroll: sy });
      regions.push({ x: W - BIBLE_SCROLL_COL, y: H - BIBLE_FOOTER_H - 9, w: BIBLE_SCROLL_COL - 2, h: 9, kind: 'scrolldown', page: 'search', scroll: sy });
    }
    return regions;
  }

  if (page === 'detail'){
    const id = (currentPage && currentPage.indexOf('detail:') === 0) ? currentPage.slice(7) : BIBLE_UI.detailId;
    const v = (typeof getVerseById === 'function') ? getVerseById(id) : null;
    if (!v) return regions;
    let y = contentTop + 2;
    // reference header
    regions.push({ x: 4, y: y, w: W - 8, h: 11, kind: 'header', label: v.reference, sub: v, scroll: 0 });
    y += 14;
    // cross refs
    const cr = (typeof getCrossRefs === 'function') ? getCrossRefs(v.id) : [];
    if (cr.length){
      regions.push({ x: 4, y: y, w: W - 8, h: 9, kind: 'section', label: 'CROSS-REFS', scroll: 0 });
      y += 11;
      for (const c of cr){
        const known = discoveredIds.indexOf(c.id) >= 0;
        regions.push({ x: 8, y: y, w: W - 12, h: BIBLE_ROW_H, kind: 'row', page: 'detail', detailId: c.id, label: c.reference, sub: c, scroll: 0 });
        y += BIBLE_ROW_H;
      }
    }
    // combos
    const cb = (typeof getComboPartners === 'function') ? getComboPartners(v.id) : [];
    if (cb.length){
      regions.push({ x: 4, y: y, w: W - 8, h: 9, kind: 'section', label: 'COMBOS', scroll: 0 });
      y += 11;
      for (const c of cb){
        const known = discoveredIds.indexOf(c.id) >= 0;
        regions.push({ x: 8, y: y, w: W - 12, h: BIBLE_ROW_H, kind: 'row', page: 'detail', detailId: c.id, label: c.reference, sub: c, scroll: 0 });
        y += BIBLE_ROW_H;
      }
    }
    return regions;
  }

  // Category list page (attack/defense/buff/debuff/ultimate)
  const cat = page;
  // Tabs across the top
  const tabW = Math.floor((W - 8) / BIBLE_CAT_ORDER.length);
  for (let t = 0; t < BIBLE_CAT_ORDER.length; t++){
    const c = BIBLE_CAT_ORDER[t];
    regions.push({ x: 4 + t * tabW, y: BIBLE_TAB_Y, w: tabW - 1, h: BIBLE_TAB_H, kind: 'tab', page: c, label: BIBLE_CAT_LABEL[c], scroll: 0, active: (c === cat) });
  }
  const list = (typeof getVersesByCategory === 'function') ? getVersesByCategory(cat) : [];
  const listTop = BIBLE_HEADER_H + 2;
  const viewH = H - listTop - BIBLE_FOOTER_H;
  const maxScroll = Math.max(0, list.length * BIBLE_ROW_H - viewH);
  const sy = Math.max(0, Math.min(scrollY, maxScroll));
  let i = Math.floor(sy / BIBLE_ROW_H);
  let y = listTop - (sy - i * BIBLE_ROW_H);
  let drawn = 0;
  const rowW = W - 8 - BIBLE_SCROLL_COL;
  while (i < list.length && drawn < Math.floor(viewH / BIBLE_ROW_H) + 1){
    const v = list[i];
    regions.push({ x: 4, y: y, w: rowW, h: BIBLE_ROW_H, kind: 'row', page: 'detail', detailId: v.id, label: v.reference, sub: v, scroll: sy });
    y += BIBLE_ROW_H; i++; drawn++;
  }
  if (maxScroll > 0){
    regions.push({ x: W - BIBLE_SCROLL_COL, y: listTop, w: BIBLE_SCROLL_COL - 2, h: 9, kind: 'scrollup', page: cat, scroll: sy });
    regions.push({ x: W - BIBLE_SCROLL_COL, y: H - BIBLE_FOOTER_H - 9, w: BIBLE_SCROLL_COL - 2, h: 9, kind: 'scrolldown', page: cat, scroll: sy });
  }
  return regions;
}

// ── Drawing helpers ─────────────────────────────────────
function _bibleStars(diff){
  // difficulty 1..3 -> '*' count
  return '*'.repeat(Math.max(1, Math.min(3, diff || 1)));
}
function _bibleCatColor(cat){
  return (typeof BIBLE_CAT_COLOR !== 'undefined' && BIBLE_CAT_COLOR[cat]) ? BIBLE_CAT_COLOR[cat] : C.gold;
}
function _bibleCatIcon(cat){
  return (typeof BIBLE_CAT_ICON !== 'undefined' && BIBLE_CAT_ICON[cat]) ? BIBLE_CAT_ICON[cat] : '?';
}
function _biblePushClickable(r, discoveredIds){
  if (typeof clickables === 'undefined') return;
  const onClick = () => {
    if (r.kind === 'tab' || r.kind === 'btn' || r.kind === 'row'){
      const np = (r.kind === 'row') ? 'detail:' + r.detailId : r.page;
      _bibleNav(r.kind === 'row' ? 'detail' : 'nav', np, r.kind === 'row' ? 0 : (r.scroll || 0), r.detailId);
    } else if (r.kind === 'back'){
      _bibleNav('back', 'overview', 0, null);
    } else if (r.kind === 'scrollup'){
      _bibleNav('scroll', r.page, Math.max(0, (r.scroll || 0) - BIBLE_ROW_H * 3), null);
    } else if (r.kind === 'scrolldown'){
      _bibleNav('scroll', r.page, (r.scroll || 0) + BIBLE_ROW_H * 3, null);
    } else if (r.kind === 'searchbox'){
      // focus handled via keydown listener; just keep search page
      _bibleNav('nav', 'search', 0, null);
    }
  };
  clickables.push({ x: r.x, y: r.y, w: r.w, h: r.h, onClick });
}

// ── Main render ─────────────────────────────────────────
function renderBible(ctx, W, H, discoveredIds, currentPage, scrollY){
  const ids = discoveredIds || [];
  const page = _bibleEffectivePage(currentPage, BIBLE_UI.detailId);

  // keep module state in sync with caller
  if (currentPage) BIBLE_UI.page = currentPage;
  if (typeof scrollY === 'number') BIBLE_UI.scrollY = scrollY;

  // background
  rect(0, 0, W, H, C.bg);
  // header strip
  rect(0, 0, W, BIBLE_HEADER_H, C.stoneDark);
  strokeRect(0, 0, W, BIBLE_HEADER_H, C.gold);

  if (page === 'overview'){
    text('BIBLE CODEX', W/2, 6, C.gold, 10, 'center');
    const regions = _bibleRegions(ids, currentPage, scrollY, W, H);
    for (const r of regions){
      if (r.kind === 'back'){
        button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('back', 'overview', 0, null), C.red);
      } else if (r.kind === 'btn'){
        if (r.page === 'search') button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('nav', 'search', 0, null), C.cyan);
        else { text(r.label, r.x + 4, r.y + 3, C.white, 8, 'left'); _biblePushClickable(r, ids); }
      } else if (r.kind === 'tab'){
        const col = _bibleCatColor(r.page);
        // Colour codes the category; the label itself stays parchment so it is
        // always legible. Previously the text was drawn IN the saturated colour,
        // which made the darker categories (violet, blue) hard to read on black.
        panel(r.x, r.y, r.w, r.h, 3, C.panel);
        rect(r.x, r.y + 3, 3, r.h - 6, col);
        text(r.label, r.x + 10, r.y + 3, C.holy, 7, 'left');
        text(r.sub, r.x + r.w - 8, r.y + 3, col, 6, 'right');
        // Completion bar: the old thin underline did not read as progress.
        const seg = String(r.sub || '').split('/');
        const frac = (seg.length === 2) ? (parseFloat(seg[0]) / Math.max(1, parseFloat(seg[1]))) : 0;
        const bwidth = r.w - 20;
        rect(r.x + 10, r.y + r.h - 4, bwidth, 2, C.stone);
        if (frac > 0) rect(r.x + 10, r.y + r.h - 4, Math.max(1, bwidth * Math.min(1, frac)), 2, col);
        _biblePushClickable(r, ids);
      }
    }
    text('C = ' + (typeof getBibleStats === 'function' ? getBibleStats(ids).pct : 0) + '% found', 8, H - BIBLE_FOOTER_H + 2, C.dim, 7, 'left');
    return;
  }

  if (page === 'search'){
    text('SEARCH', W/2, 6, C.cyan, 10, 'center');
    const regions = _bibleRegions(ids, currentPage, scrollY, W, H);
    for (const r of regions){
      if (r.kind === 'back'){
        button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('back', 'overview', 0, null), C.red);
      } else if (r.kind === 'btn'){
        button(r.x, r.y, r.w, r.h, r.label, () => { BIBLE_UI.search = ''; _bibleNav('nav', 'search', 0, null); }, C.red);
      } else if (r.kind === 'searchbox'){
        rect(r.x, r.y, r.w, r.h, C.stoneDark);
        strokeRect(r.x, r.y, r.w, r.h, C.cyan);
        text(r.label, r.x + 4, r.y + 5, r.label === 'type to filter...' ? C.dim : C.white, 8, 'left');
        _biblePushClickable(r, ids);
      } else if (r.kind === 'row'){
        const v = r.sub;
        const known = ids.indexOf(v.id) >= 0;
        rect(r.x, r.y, r.w, r.h, C.stoneDark);
        strokeRect(r.x, r.y, r.w, r.h, known ? _bibleCatColor(v.category) : C.stone2);
        text(_bibleCatIcon(v.category), r.x + 4, r.y + 6, known ? _bibleCatColor(v.category) : C.dim, 8, 'left');
        text(known ? v.reference : '???', r.x + 18, r.y + 6, known ? C.holy : C.dim, 8, 'left');
        text(_bibleStars(v.difficulty), r.x + r.w - 20, r.y + 6, C.gold, 7, 'left');
        _biblePushClickable(r, ids);
      } else if (r.kind === 'scrollup' || r.kind === 'scrolldown'){
        const up = r.kind === 'scrollup';
        button(r.x, r.y, r.w, r.h, up ? '^' : 'v', () => _bibleNav('scroll', r.page, up ? Math.max(0, r.scroll - BIBLE_ROW_H * 3) : r.scroll + BIBLE_ROW_H * 3, null), C.cyan);
      }
    }
    text('a-z filter, backspace del', 8, H - BIBLE_FOOTER_H + 2, C.dim, 6, 'left');
    return;
  }

  if (page === 'detail'){
    const id = (currentPage && currentPage.indexOf('detail:') === 0) ? currentPage.slice(7) : BIBLE_UI.detailId;
    const v = (typeof getVerseById === 'function') ? getVerseById(id) : null;
    if (!v){ text('NOT FOUND', 8, 40, C.red, 8, 'left'); return; }
    const known = ids.indexOf(v.id) >= 0;
    text('VERSE', 36, 4, C.gold, 8, 'left');
    // back button
    button(4, 4, 30, 9, '< BIBLE', () => _bibleNav('back', 'overview', 0, null), C.red);

    const listTop = BIBLE_HEADER_H;
    const viewH = H - listTop - BIBLE_FOOTER_H;
    const maxChars = 42; // fits at font 7 in 384px canvas
    const lineH = 10;

    // Build all content lines
    const contentLines = [];
    // reference header
    contentLines.push({ text: (known ? v.reference : '??? : ?'), color: known ? C.gold : C.dim, size: 8, gap: 4 });
    // KJV text
    contentLines.push({ text: '--- KJV ---', color: C.dim, size: 5, gap: 2 });
    const kjvLines = wrapText(known ? v.text : '???  ???  ???', maxChars);
    for (const ln of kjvLines) contentLines.push({ text: ln, color: known ? C.holy : C.dim, size: 7, gap: 0 });
    // Translation variants
    if (known && v.nkjv){
      contentLines.push({ text: '--- NKJV ---', color: C.dim, size: 5, gap: 3 });
      for (const ln of wrapText(v.nkjv, maxChars)) contentLines.push({ text: ln, color: C.cyan, size: 6, gap: 0 });
    }
    if (known && v.niv){
      contentLines.push({ text: '--- NIV ---', color: C.dim, size: 5, gap: 3 });
      for (const ln of wrapText(v.niv, maxChars)) contentLines.push({ text: ln, color: C.green, size: 6, gap: 0 });
    }
    if (known && v.nlt){
      contentLines.push({ text: '--- NLT ---', color: C.dim, size: 5, gap: 3 });
      for (const ln of wrapText(v.nlt, maxChars)) contentLines.push({ text: ln, color: C.blue, size: 6, gap: 0 });
    }
    // Stats
    if (known){
      contentLines.push({ text: 'TYPE ' + v.verseType.toUpperCase() + '  ' + _bibleStars(v.difficulty), color: C.cyan, size: 6, gap: 4 });
      contentLines.push({ text: 'EFFECT ' + v.effect.toUpperCase() + (v.damage ? '  (' + v.damage + ')' : ''), color: C.green, size: 6, gap: 2 });
      if (v.desc){
        for (const ln of wrapText(v.desc, maxChars)) contentLines.push({ text: ln, color: C.dim, size: 5, gap: 0 });
      }
    }

    // Calculate total content height
    let totalH = 0;
    for (const l of contentLines) totalH += (l.gap || 0) + (l.size || 7);

    // Scrolling
    const scrollKey = 'detail_' + id;
    if (BIBLE_UI._detailScroll === undefined) BIBLE_UI._detailScroll = {};
    if (BIBLE_UI._detailScroll[scrollKey] === undefined) BIBLE_UI._detailScroll[scrollKey] = 0;
    const maxScroll = Math.max(0, totalH - viewH);
    let sy = Math.max(0, Math.min(BIBLE_UI._detailScroll[scrollKey] || 0, maxScroll));

    // Draw visible content
    let cy = listTop - sy;
    for (const l of contentLines){
      const nextY = cy + (l.gap || 0) + (l.size || 7);
      if (nextY > listTop - 10 && cy < H - BIBLE_FOOTER_H + 10){
        if (l.gap) cy += l.gap;
        if (cy >= listTop && cy < H - BIBLE_FOOTER_H){
          text(l.text, 8, cy, l.color, l.size, 'left');
        }
        cy += l.size || 7;
      } else {
        cy += (l.gap || 0) + (l.size || 7);
      }
    }

    // Scroll buttons
    if (maxScroll > 0){
      button(W - 14, listTop, 10, 9, '^', () => { BIBLE_UI._detailScroll[scrollKey] = Math.max(0, sy - 30); }, C.cyan);
      button(W - 14, H - BIBLE_FOOTER_H - 9, 10, 9, 'v', () => { BIBLE_UI._detailScroll[scrollKey] = Math.min(maxScroll, sy + 30); }, C.cyan);
    }
    return;
  }

  // Lore page
  if (page === 'lore'){
    text('LORE', 36, 4, C.purple, 8, 'left');
    const maxFloor = (typeof game !== 'undefined' && game.floor) ? game.floor : 1;
    const entries = (typeof LORE_ENTRIES !== 'undefined') ? LORE_ENTRIES.filter(e => e.floor <= maxFloor) : [];
    const locked = (typeof LORE_ENTRIES !== 'undefined') ? LORE_ENTRIES.filter(e => e.floor > maxFloor) : [];
    const listTop = BIBLE_HEADER_H + 2;
    const viewH = H - listTop - BIBLE_FOOTER_H;
    const ROW_H = 14;
    const allItems = entries.map(e => ({...e, locked: false})).concat(locked.map(e => ({...e, locked: true})));
    // Append unlocked secret verses
    if (typeof SecretVerses !== 'undefined'){
      for (const sv of SecretVerses._defs){
        if (SecretVerses.isUnlocked(sv.id)){
          allItems.push({ id: sv.id, title: sv.name, floor: 99, text: sv.desc + ' — ' + sv.ref, locked: false, isSecret: true });
        } else {
          allItems.push({ id: sv.id, title: '???', floor: 99, text: '???', locked: true, isSecret: true });
        }
      }
    }
    const maxScroll = Math.max(0, allItems.length * ROW_H - viewH);
    const sy = Math.max(0, Math.min(scrollY || 0, maxScroll));
    let i = Math.floor(sy / ROW_H);
    let y = listTop - (sy - i * ROW_H);
    let drawn = 0;
    // Back button
    button(4, 4, 30, 9, '< BIBLE', () => _bibleNav('back', 'overview', 0, null), C.red);
    while (i < allItems.length && drawn < Math.floor(viewH / ROW_H) + 1){
      const e = allItems[i];
      const isSecret = e.isSecret;
      const col = isSecret ? C.gold : (e.locked ? C.stone2 : C.purple);
      rect(4, y, W - 8, ROW_H, e.locked ? C.stoneDark : C.stone);
      strokeRect(4, y, W - 8, ROW_H, col);
      if (isSecret) text('★', 8, y + 3, e.locked ? C.dim : C.gold, 7, 'left');
      text(e.locked ? '???' : e.title, isSecret ? 16 : 8, y + 3, e.locked ? C.dim : (isSecret ? C.gold : C.holy), 7, 'left');
      text(e.locked ? 'Secret' : (isSecret ? 'SECRET' : 'F' + e.floor), W - 8, y + 3, e.locked ? C.dim : C.cyan, 6, 'right');
      if (!e.locked){
        const textLines = wrapText(e.text, Math.floor((W - 16) / 6));
        let ty = y + ROW_H;
        for (const tl of textLines.slice(0, 2)){
          text(tl, 8, ty, C.dim, 5, 'left');
          ty += 7;
        }
        // clickable to show full text (detail-like)
        const idx = i;
        clickables.push({ x: 4, y: y, w: W - 8, h: ROW_H, onClick: () => {
          BIBLE_UI._loreDetail = allItems[idx];
          _bibleNav('lore_detail', 'lore', sy, null);
        }});
      }
      y += ROW_H; i++; drawn++;
    }
    // Lore detail overlay
    if (BIBLE_UI._loreDetail){
      const e = BIBLE_UI._loreDetail;
      rect(4, listTop, W - 8, viewH, C.stoneDark);
      strokeRect(4, listTop, W - 8, viewH, C.purple);
      text(e.title, 8, listTop + 4, C.gold, 8, 'left');
      const tl = wrapText(e.text, Math.floor((W - 16) / 6));
      let ty = listTop + 16;
      for (const l of tl){ text(l, 8, ty, C.holy, 6, 'left'); ty += 9; }
      button(W/2 - 30, H - BIBLE_FOOTER_H - 14, 60, 10, 'BACK', () => { BIBLE_UI._loreDetail = null; _bibleNav('lore', 'lore', sy, null); }, C.red);
      return;
    }
    if (maxScroll > 0){
      button(W - 12, listTop, 10, 9, '^', () => _bibleNav('scroll', 'lore', Math.max(0, (scrollY || 0) - ROW_H * 3), null), C.cyan);
      button(W - 12, H - BIBLE_FOOTER_H - 9, 10, 9, 'v', () => _bibleNav('scroll', 'lore', (scrollY || 0) + ROW_H * 3, null), C.cyan);
    }
    return;
  }

  // Category list page
  const regions = _bibleRegions(ids, currentPage, scrollY, W, H);
  for (const r of regions){
    if (r.kind === 'back'){
      button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('back', 'overview', 0, null), C.red);
    } else if (r.kind === 'tab'){
      const col = _bibleCatColor(r.page);
      const isActive = (r.page === page);
      rect(r.x, r.y, r.w, r.h, isActive ? C.stone : C.stoneDark);
      strokeRect(r.x, r.y, r.w, r.h, col);
      text(r.label, r.x + 4, r.y + 4, isActive ? col : C.dim, 7, 'left');
      _biblePushClickable(r, ids);
    } else if (r.kind === 'row'){
      const v = r.sub;
      const known = ids.indexOf(v.id) >= 0;
      rect(r.x, r.y, r.w, r.h, C.stoneDark);
      strokeRect(r.x, r.y, r.w, r.h, known ? _bibleCatColor(v.category) : C.stone2);
      text(_bibleCatIcon(v.category), r.x + 4, r.y + 6, known ? _bibleCatColor(v.category) : C.dim, 8, 'left');
      text(known ? v.reference : '???', r.x + 18, r.y + 6, known ? C.holy : C.dim, 8, 'left');
      // text snippet (clipped)
      if (known){
        const clip = v.text.length > 30 ? v.text.slice(0, 29) + '…' : v.text;
        text(clip, r.x + 80, r.y + 6, C.white, 6, 'left');
      }
      text(_bibleStars(v.difficulty), r.x + r.w - 16, r.y + 3, C.gold, 6, 'left');
      _biblePushClickable(r, ids);
    } else if (r.kind === 'scrollup' || r.kind === 'scrolldown'){
      const up = r.kind === 'scrollup';
      button(r.x, r.y, r.w, r.h, up ? '^' : 'v', () => _bibleNav('scroll', r.page, up ? Math.max(0, r.scroll - BIBLE_ROW_H * 3) : r.scroll + BIBLE_ROW_H * 3, null), C.cyan);
    }
  }
  // progress caption
  const list = (typeof getVersesByCategory === 'function') ? getVersesByCategory(page) : [];
  const found = list.filter(v => ids.indexOf(v.id) >= 0).length;
  text(BIBLE_CAT_LABEL[page] + '  ' + found + '/' + list.length, 8, H - BIBLE_FOOTER_H + 2, C.dim, 7, 'left');
}

// ── Pure click navigator (alternative to clickables) ────
function handleBibleClick(x, y, discoveredIds, currentPage, scrollY){
  const cw = (typeof W !== 'undefined') ? W : 384;
  const ch = (typeof H !== 'undefined') ? H : 288;
  const regions = _bibleRegions(discoveredIds || [], currentPage || 'overview', scrollY || 0, cw, ch);
  let result = { action: 'none', page: currentPage || 'overview', scrollY: scrollY || 0 };
  // Prefer non-row hit regions (back / tab / scroll) so they win over overlapping rows.
  const priority = { back: 0, tab: 1, btn: 2, scrollup: 3, scrolldown: 4, searchbox: 5, row: 6 };
  let best = null, bestRank = 99;
  for (const r of regions){
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h){
      const rank = priority[r.kind] !== undefined ? priority[r.kind] : 9;
      if (rank < bestRank){ best = r; bestRank = rank; }
    }
  }
  if (best){
    const r = best;
    if (r.kind === 'tab' || r.kind === 'btn'){
      result = { action: 'nav', page: r.page, scrollY: 0 };
    } else if (r.kind === 'row'){
      result = { action: 'detail', page: 'detail:' + r.detailId, scrollY: 0 };
    } else if (r.kind === 'back'){
      result = { action: 'back', page: 'overview', scrollY: 0 };
    } else if (r.kind === 'scrollup'){
      result = { action: 'scroll', page: r.page, scrollY: Math.max(0, (r.scroll || 0) - BIBLE_ROW_H * 3) };
    } else if (r.kind === 'scrolldown'){
      result = { action: 'scroll', page: r.page, scrollY: (r.scroll || 0) + BIBLE_ROW_H * 3 };
    } else if (r.kind === 'searchbox'){
      result = { action: 'nav', page: 'search', scrollY: 0 };
    }
  }
  // sync module state for callers using renderBible's clickables too
  if (result.action !== 'none'){
    BIBLE_UI.page = result.page;
    BIBLE_UI.scrollY = result.scrollY;
    if (result.action === 'detail') BIBLE_UI.detailId = result.page.slice(7);
    if (typeof BIBLE_UI.onNav === 'function') BIBLE_UI.onNav(result);
  }
  return result;
}

// ── Keyboard support for the search field ──────────────
// Wire into the game's existing keydown loop: call this for each key.
function bibleHandleKey(e){
  if (BIBLE_UI.page !== 'search') return false;
  const k = (e.key || '');
  if (k === 'Backspace'){ BIBLE_UI.search = BIBLE_UI.search.slice(0, -1); BIBLE_UI.scrollY = 0; return true; }
  if (k === 'Escape'){ bibleResetNav(); return true; }
  if (k.length === 1 && /[a-zA-Z0-9 ]/.test(k)){ BIBLE_UI.search += k.toLowerCase(); BIBLE_UI.scrollY = 0; return true; }
  return false;
}
