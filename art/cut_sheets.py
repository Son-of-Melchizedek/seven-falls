#!/usr/bin/env python3
"""Slice Gemini sprite sheets into individual sprites.

Gemini does not reliably honour a requested grid (it returned 6x4 for a "4x4"
prompt) and packed sprites leave no clean gutter, so projection splitting fails.
Instead: chroma-key the green, then find each creature as its own connected
component via a run-based union-find on a 4x-downsampled mask, merge fragments
that belong together, and order the boxes into reading order.

Outputs art/cells/<sheet>_<n>.png + a numbered contact sheet for eyeball mapping.
"""
import sys, os, json
import numpy as np
sys.path.insert(0, '/home/alpha_/Developer/sprite-gen')
from PIL import Image, ImageDraw
from sprite_gen.frames.extract import remove_chroma_background
from sprite_gen.frames.slice_sheet import (
    DEFAULT_KEY_THRESHOLD, DEFAULT_FRINGE_KEY_THRESHOLD, DEFAULT_FRINGE_DELTA)

ART = '/home/alpha_/blueprints/seven-falls/art'
CELLS = f'{ART}/cells'
DS = 4              # downsample factor for labelling
MERGE_DIST = 10     # px: glue fragments closer than this (floating masks, detached flames)
MIN_AREA = 900      # px of real content


def key_sheet(path):
    sheet = Image.open(path).convert('RGBA')
    return sheet, remove_chroma_background(
        sheet, (0, 255, 0), DEFAULT_KEY_THRESHOLD,
        DEFAULT_FRINGE_KEY_THRESHOLD, DEFAULT_FRINGE_DELTA, background_key=None)


def _shift(a, dy, dx):
    out = np.zeros_like(a)
    h, w = a.shape
    out[max(0, dy):min(h, h + dy), max(0, dx):min(w, w + dx)] = \
        a[max(0, -dy):min(h, h - dy), max(0, -dx):min(w, w - dx)]
    return out


def opening(a, k=2):
    """Morphological opening: erases structures thinner than 2k+1 px. The model
    paints 1-4px grid rules that are not white enough to detect by colour and
    which otherwise bridge every sprite into one blob."""
    e = a.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            e &= _shift(a, dy, dx)
    d = e.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            d |= _shift(e, dy, dx)
    return d


def content_mask(sheet, keyed):
    """Content = "not chroma green", by hue rather than alpha: the model leaves
    faint green noise that survives an alpha threshold and would glue the whole
    sheet into one blob."""
    rgb = np.array(sheet.convert('RGB')).astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    a = ~((g > 100) & (g > r + 30) & (g > b + 30))
    white = (r > 225) & (g > 225) & (b > 225)
    # grid rules span the sheet: kill near-white rows/cols that are almost all white
    for y in np.where(white.mean(axis=1) > 0.85)[0]:
        a[y, :] = False
    for x in np.where(white.mean(axis=0) > 0.85)[0]:
        a[:, x] = False
    return opening(a & (np.array(keyed.getchannel('A')) > 8), 2)


def ccl_boxes(mask):
    """Run-based connected components. Returns [(x0,y0,x1,y1,area)] in full-res px."""
    H, W = mask.shape
    h, w = H // DS, W // DS
    small = mask[:h * DS, :w * DS].reshape(h, DS, w, DS).any(axis=(1, 3))
    parent = []

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[rj] = ri

    runs, by_row = [], []
    for y in range(h):
        ids = []
        idx = np.where(small[y])[0]
        if idx.size:
            brk = np.where(np.diff(idx) > 1)[0]
            starts = np.r_[idx[0], idx[brk + 1]]
            ends = np.r_[idx[brk], idx[-1]]
            for s, e in zip(starts, ends):
                rid = len(runs)
                runs.append([y, int(s), int(e)])
                parent.append(rid)
                ids.append(rid)
        by_row.append(ids)
    for y in range(1, h):
        for a in by_row[y]:
            for b in by_row[y - 1]:
                if runs[a][1] <= runs[b][2] + 1 and runs[b][1] <= runs[a][2] + 1:
                    union(a, b)
    groups = {}
    for i in range(len(runs)):
        groups.setdefault(find(i), []).append(runs[i])
    out = []
    for g in groups.values():
        y0 = min(r[0] for r in g); y1 = max(r[0] for r in g)
        x0 = min(r[1] for r in g); x1 = max(r[2] for r in g)
        area = sum(r[2] - r[1] + 1 for r in g) * DS * DS
        if area >= MIN_AREA:
            out.append([x0 * DS, y0 * DS, (x1 + 1) * DS, (y1 + 1) * DS, area])
    return out


def merge_close(boxes, dist=MERGE_DIST):
    changed = True
    boxes = [list(b) for b in boxes]
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if (a[0] - dist < b[2] and b[0] - dist < a[2]
                        and a[1] - dist < b[3] and b[1] - dist < a[3]):
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]),
                                max(a[2], b[2]), max(a[3], b[3]), a[4] + b[4]]
                    boxes.pop(j)
                    changed = True
                    break
            if changed:
                break
    return boxes


def reading_order(boxes):
    """Group into rows by vertical overlap, then sort within each row by x."""
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        if not cur:
            cur = [b]; continue
        yc = (b[1] + b[3]) / 2
        ref = np.mean([(c[1] + c[3]) / 2 for c in cur])
        hh = np.mean([c[3] - c[1] for c in cur])
        if abs(yc - ref) < max(60, hh * 0.45):
            cur.append(b)
        else:
            rows.append(cur); cur = [b]
    if cur:
        rows.append(cur)
    ordered = []
    for r in rows:
        ordered += sorted(r, key=lambda b: b[0])
    return ordered


def slice_sheet(path, tag, grid=None):
    """grid=(cols, rows) forces equal-size cells. Needed whenever sprites touch
    their neighbours (overflowing flames, shared shadows), because then no
    component split can recover the original cells."""
    sheet, keyed = key_sheet(path)
    a = content_mask(sheet, keyed)
    W, H = keyed.size
    if grid:
        cols, rows = grid
        cw, ch = W / cols, H / rows
        boxes = []
        for r in range(rows):
            for c in range(cols):
                x0, y0 = int(c * cw), int(r * ch)
                x1, y1 = int((c + 1) * cw), int((r + 1) * ch)
                sub = a[y0:y1, x0:x1]
                ys, xs = np.where(sub)
                if len(xs) < 400:
                    continue
                # keep only the creature itself: the main component plus any
                # fragment near it (floating masks, detached flames all sit close).
                # Without this, a neighbour's overflowing flame inside our cell
                # arrives as a stray blob pinned to the far edge.
                comps = ccl_boxes(sub)
                if comps:
                    main = max(comps, key=lambda b: b[4])
                    mw, mh = main[2] - main[0], main[3] - main[1]
                    ex, ey = 0.22 * mw, 0.22 * mh
                    keep = [b for b in comps
                            if b[0] < main[2] + ex and main[0] - ex < b[2]
                            and b[1] < main[3] + ey and main[1] - ey < b[3]]
                    xs0 = min(b[0] for b in keep); ys0 = min(b[1] for b in keep)
                    xs1 = max(b[2] for b in keep); ys1 = max(b[3] for b in keep)
                else:
                    xs0, ys0, xs1, ys1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
                boxes.append([x0 + int(xs0), y0 + int(ys0), x0 + int(xs1), y0 + int(ys1), len(xs)])
    else:
        boxes = reading_order(merge_close(ccl_boxes(a)))
    print(f'{tag}: {keyed.size} -> {len(boxes)} sprites (grid={grid})')
    out = []
    for n, (x0, y0, x1, y1, area) in enumerate(boxes):
        sprite = keyed.crop((int(x0), int(y0), int(x1), int(y1)))
        f = f'{CELLS}/{tag}_{n:02d}.png'
        sprite.save(f)
        out.append({'sheet': tag, 'n': n, 'file': f, 'bbox': [int(x0), int(y0), int(x1), int(y1)],
                    'size': list(sprite.size), 'area': int(area)})
    return out


def contact(metas, tag, cols=6, box=140):
    rows = (len(metas) + cols - 1) // cols
    cs = Image.new('RGB', (cols * (box + 8) + 8, rows * (box + 30) + 8), (22, 18, 30))
    d = ImageDraw.Draw(cs)
    for i, m in enumerate(metas):
        r, c = divmod(i, cols)
        im = Image.open(m['file']).convert('RGBA')
        s = min((box - 6) / im.width, (box - 6) / im.height)
        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
        x, y = 8 + c * (box + 8), 8 + r * (box + 30)
        cs.paste(im, (x + (box - im.width) // 2, y + (box - im.height) // 2), im)
        d.text((x + 2, y + box + 6), f'{m["n"]:02d}', fill=(235, 225, 205))
    p = f'{ART}/cut_{tag}_contact.png'
    cs.save(p)
    return p


if __name__ == '__main__':
    os.makedirs(CELLS, exist_ok=True)
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    grid = None
    for a in sys.argv[1:]:
        if a.startswith('--grid='):
            grid = tuple(int(v) for v in a.split('=')[1].split('x'))
    allm = []
    for p in args:
        tag = os.path.splitext(os.path.basename(p))[0].replace('demon_sheet_', '')
        m = slice_sheet(p, tag, grid)
        print(f'  -> {len(m)} sprites; contact: {contact(m, tag)}')
        allm += m
    json.dump(allm, open(f'{ART}/cells_index.json', 'w'), indent=1)
    print(f'total {len(allm)} cells')
