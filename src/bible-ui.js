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
//   'detail:<verseId>' | 'search'
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

// ── Layout constants (canvas is 256x192) ───────────────
const BIBLE_HEADER_H = 28;
const BIBLE_TAB_Y = 14;
const BIBLE_TAB_H = 11;
const BIBLE_ROW_H = 14;
const BIBLE_SEARCH_BOX_H = 14;
const BIBLE_FOOTER_H = 8;
const BIBLE_SCROLL_COL = 12;   // reserved right-edge column for scroll buttons

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
      regions.push({ x: 6, y: y, w: W - 12, h: 12, kind: 'tab', page: c, label: BIBLE_CAT_LABEL[c], sub: s.discovered + '/' + s.total, scroll: 0 });
      y += 14;
    }
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
    text('BIBLE CODEX', 36, 4, C.gold, 8, 'left');
    const regions = _bibleRegions(ids, currentPage, scrollY, W, H);
    for (const r of regions){
      if (r.kind === 'back'){
        button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('back', 'overview', 0, null), C.red);
      } else if (r.kind === 'btn'){
        if (r.page === 'search') button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('nav', 'search', 0, null), C.cyan);
        else { text(r.label, r.x + 2, r.y + 1, C.white, 8, 'left'); _biblePushClickable(r, ids); }
      } else if (r.kind === 'tab'){
        const col = _bibleCatColor(r.page);
        rect(r.x, r.y, r.w, r.h, C.stone);
        strokeRect(r.x, r.y, r.w, r.h, col);
        text(r.label, r.x + 6, r.y + 2, col, 7, 'left');
        text(r.sub, r.x + r.w - 4, r.y + 2, C.dim, 7, 'right');
        _biblePushClickable(r, ids);
      }
    }
    text('C = ' + (typeof getBibleStats === 'function' ? getBibleStats(ids).pct : 0) + '% found', 4, H - 8, C.dim, 6, 'left');
    return;
  }

  if (page === 'search'){
    text('SEARCH', 36, 4, C.cyan, 8, 'left');
    const regions = _bibleRegions(ids, currentPage, scrollY, W, H);
    for (const r of regions){
      if (r.kind === 'back'){
        button(r.x, r.y, r.w, r.h, r.label, () => _bibleNav('back', 'overview', 0, null), C.red);
      } else if (r.kind === 'btn'){
        button(r.x, r.y, r.w, r.h, r.label, () => { BIBLE_UI.search = ''; _bibleNav('nav', 'search', 0, null); }, C.red);
      } else if (r.kind === 'searchbox'){
        rect(r.x, r.y, r.w, r.h, C.stoneDark);
        strokeRect(r.x, r.y, r.w, r.h, C.cyan);
        text(r.label, r.x + 2, r.y + 4, r.label === 'type to filter...' ? C.dim : C.white, 7, 'left');
        _biblePushClickable(r, ids);
      } else if (r.kind === 'row'){
        const v = r.sub;
        const known = ids.indexOf(v.id) >= 0;
        rect(r.x, r.y, r.w, r.h, C.stoneDark);
        strokeRect(r.x, r.y, r.w, r.h, known ? _bibleCatColor(v.category) : C.stone2);
        text(_bibleCatIcon(v.category), r.x + 2, r.y + 3, known ? _bibleCatColor(v.category) : C.dim, 7, 'left');
        text(known ? v.reference : '???', r.x + 12, r.y + 3, known ? C.holy : C.dim, 7, 'left');
        text(_bibleStars(v.difficulty), r.x + r.w - 16, r.y + 3, C.gold, 6, 'left');
        _biblePushClickable(r, ids);
      } else if (r.kind === 'scrollup' || r.kind === 'scrolldown'){
        const up = r.kind === 'scrollup';
        button(r.x, r.y, r.w, r.h, up ? '^' : 'v', () => _bibleNav('scroll', r.page, up ? Math.max(0, r.scroll - BIBLE_ROW_H * 3) : r.scroll + BIBLE_ROW_H * 3, null), C.cyan);
      }
    }
    text('keys: a-z filter, backspace', 4, H - 8, C.dim, 6, 'left');
    return;
  }

  if (page === 'detail'){
    const id = (currentPage && currentPage.indexOf('detail:') === 0) ? currentPage.slice(7) : BIBLE_UI.detailId;
    const v = (typeof getVerseById === 'function') ? getVerseById(id) : null;
    if (!v){ text('NOT FOUND', 8, 40, C.red, 8, 'left'); return; }
    const known = ids.indexOf(v.id) >= 0;
    text('VERSE', 36, 4, C.gold, 8, 'left');
    const regions = _bibleRegions(ids, currentPage, scrollY, W, H);
    // back button
    for (const r of regions){
      if (r.kind === 'back'){ /* handled below */ }
    }
    button(4, 4, 30, 9, '< BIBLE', () => _bibleNav('back', 'overview', 0, null), C.red);

    let y = BIBLE_HEADER_H + 4;
    // reference + category icon
    rect(4, y, W - 8, 14, C.stoneDark);
    strokeRect(4, y, W - 8, 14, _bibleCatColor(v.category));
    text(_bibleCatIcon(v.category), 8, y + 4, _bibleCatColor(v.category), 9, 'left');
    text(known ? v.reference : '??? : ?', 18, y + 4, known ? C.gold : C.dim, 8, 'left');
    y += 18;

    // full text
    const tlines = wrapText(known ? v.text : '???  ???  ???', Math.floor((W - 16) / 6));
    for (const ln of tlines){ text(ln, 8, y, known ? C.holy : C.dim, 7, 'left'); y += 10; }

    if (known){
      y += 2;
      text('TYPE ' + v.verseType.toUpperCase() + '  ' + _bibleStars(v.difficulty), 8, y, C.cyan, 6, 'left');
      y += 9;
      text('EFFECT ' + v.effect.toUpperCase() + (v.damage ? '  (' + v.damage + ')' : ''), 8, y, C.green, 6, 'left');
      y += 9;
      const dl = wrapText(v.desc, Math.floor((W - 16) / 6));
      for (const ln of dl){ text(ln, 8, y, C.dim, 6, 'left'); y += 8; }
    }
    y += 4;
    // cross-refs + combos (regions)
    for (const r of regions){
      if (r.kind === 'section'){
        text(r.label, r.x, r.y, C.cyan, 7, 'left');
      } else if (r.kind === 'row'){
        const cv = r.sub;
        const cknown = ids.indexOf(cv.id) >= 0;
        rect(r.x, r.y, r.w, r.h, C.stoneDark);
        strokeRect(r.x, r.y, r.w, r.h, cknown ? _bibleCatColor(cv.category) : C.stone2);
        text(_bibleCatIcon(cv.category), r.x + 2, r.y + 3, cknown ? _bibleCatColor(cv.category) : C.dim, 7, 'left');
        text(cknown ? cv.reference : '???', r.x + 12, r.y + 3, cknown ? C.holy : C.dim, 7, 'left');
        _biblePushClickable(r, ids);
      }
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
      text(r.label, r.x + 6, r.y + 2, isActive ? col : C.dim, 7, 'left');
      _biblePushClickable(r, ids);
    } else if (r.kind === 'row'){
      const v = r.sub;
      const known = ids.indexOf(v.id) >= 0;
      rect(r.x, r.y, r.w, r.h, C.stoneDark);
      strokeRect(r.x, r.y, r.w, r.h, known ? _bibleCatColor(v.category) : C.stone2);
      text(_bibleCatIcon(v.category), r.x + 2, r.y + 3, known ? _bibleCatColor(v.category) : C.dim, 7, 'left');
      text(known ? v.reference : '???', r.x + 12, r.y + 3, known ? C.holy : C.dim, 7, 'left');
      // text snippet (clipped)
      if (known){
        const clip = v.text.length > 26 ? v.text.slice(0, 25) + '…' : v.text;
        text(clip, r.x + 70, r.y + 3, C.white, 6, 'left');
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
  text(BIBLE_CAT_LABEL[page] + '  ' + found + '/' + list.length, 4, H - 8, C.dim, 6, 'left');
}

// ── Pure click navigator (alternative to clickables) ────
function handleBibleClick(x, y, discoveredIds, currentPage, scrollY){
  const cw = (typeof W !== 'undefined') ? W : 256;
  const ch = (typeof H !== 'undefined') ? H : 192;
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
