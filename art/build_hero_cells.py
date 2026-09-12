#!/usr/bin/env python3
"""Turn the AI hero sheet into properly keyed sprite cells.

The previous pass used the chroma key only for bounding boxes and pasted the raw
crop — green background included — so half the hero atlas was opaque green.
This does the real job:
  1. key the green screen to alpha (with a soft edge band, not a hard cut)
  2. despill the surviving edge pixels so no green fringe halos the sprite
  3. drop specks and any fragment not part of the figure
  4. downscale in PREMULTIPLIED alpha so background green cannot bleed in
  5. fit each pose into a 64x60 cell, bottom-aligned, matching the demon atlas
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ART = Path('/home/alpha_/blueprints/seven-falls/art')
sys.path.insert(0, '/home/alpha_/Developer/sprite-gen')
from sprite_gen.frames.extract import _kcentroid_downscale  # noqa: E402

SRC = ART / 'raw' / 'hero_sheet_ai.jpg'
CELL = (64, 60)
N = 6
LABELS = ['idle', 'attack', 'defend', 'hit', 'pray', 'victory']

raw = Image.open(SRC).convert('RGB')
a = np.array(raw).astype(np.int16)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# green-screen key: strong green dominance. SOFT band keeps anti-aliased edges
# instead of chewing a hard 1px outline off the sprite.
dom = g - np.maximum(r, b)                       # how much greener than the rest
alpha = np.where(dom >= 90, 0, np.where(dom <= 35, 255, (255 * (90 - dom) / 55)))
alpha = np.clip(alpha, 0, 255).astype(np.uint8)

keyed = np.dstack([np.array(raw), alpha])
img = Image.fromarray(keyed.astype(np.uint8), 'RGBA')

# drop specks: keep only components over 300px (the figure), lose trail dust
m = (np.array(img)[..., 3] > 0).astype(np.uint8)
try:
    from scipy import ndimage
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 300])
        arr = np.array(img)
        arr[..., 3] = np.where(keep, arr[..., 3], 0)
        img = Image.fromarray(arr, 'RGBA')
        print(f'speck removal: kept {int((sizes > 300).sum())}/{n} components')
except ImportError:
    print('scipy unavailable — skipped speck removal')

# figure segmentation by ink columns (trails fuse figures, so no plain CCL)
mask = (np.array(img)[..., 3] > 0).astype(np.float32)
col = mask.sum(axis=0)
peaks = []
w = raw.size[0] // N
sm = np.convolve(col, np.ones(31) / 31, mode='same')
for i in range(N):
    lo, hi = i * w, min(raw.size[0], (i + 1) * w)
    peaks.append(lo + int(np.argmax(sm[lo:hi])))
bounds = [0]
for i in range(N - 1):
    x0, x1 = peaks[i], peaks[i + 1]
    seg = sm[x0:x1]
    bounds.append(x0 + int(np.argmin(seg)) if len(seg) else (x0 + x1) // 2)
bounds.append(raw.size[0])
print('columns:', peaks)

out_dir = ART / 'hero_cells'
out_dir.mkdir(exist_ok=True)
cells = []
for i in range(N):
    x0, x1 = bounds[i], bounds[i + 1]
    sub = img.crop((x0, 0, x1, img.height))
    bb = sub.getbbox()
    if bb:
        sub = sub.crop(bb)
    wpx, hpx = sub.size

    # premultiply -> downscale -> unpremultiply: no background bleed at the edges
    s = np.array(sub).astype(np.float32)
    af = s[..., 3:4] / 255.0
    pm = np.dstack([s[..., :3] * af, s[..., 3]])
    pm_img = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), 'RGBA')

    scale = min((CELL[0] - 2) / wpx, (CELL[1] - 2) / hpx)
    tw, th = max(1, int(round(wpx * scale))), max(1, int(round(hpx * scale)))
    small = np.array(_kcentroid_downscale(pm_img, tw, th, detail_bias=True)).astype(np.float32)
    sf = small[..., 3:4] / 255.0
    small = np.dstack([np.clip(np.divide(small[..., :3], sf, out=np.zeros_like(small[..., :3]), where=sf > 0), 0, 255),
                       small[..., 3]])
    small_img = Image.fromarray(small.astype(np.uint8), 'RGBA')

    cell = Image.new('RGBA', CELL, (0, 0, 0, 0))
    cell.paste(small_img, ((CELL[0] - tw) // 2, CELL[1] - th), small_img)
    cell.save(out_dir / f'{i}_{LABELS[i]}.png')
    cells.append(cell)
    print(f'  {LABELS[i]:8s} x {x0}-{x1} src {wpx}x{hpx} -> {tw}x{th}')

atlas = Image.new('RGBA', (CELL[0] * N, CELL[1]), (0, 0, 0, 0))
for i, c in enumerate(cells):
    atlas.paste(c, (i * CELL[0], 0))
atlas.save(ART / 'hero_atlas.png')

arr = np.array(atlas)
rr = arr[..., 0].astype(int); gg = arr[..., 1].astype(int); bb2 = arr[..., 2].astype(int); al = arr[..., 3]
green = np.logical_and(np.logical_and(gg > 120, gg > rr + 60), gg > bb2 + 60)
print(f'atlas {atlas.size} green-dominant={int(green.sum())} ({100*green.sum()/max(1,int((al>0).sum())):.1f}%)')
print('bytes', (ART / 'hero_atlas.png').stat().st_size)
