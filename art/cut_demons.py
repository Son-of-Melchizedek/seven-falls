#!/usr/bin/env python3
"""Cut the Gemini 4x4 demon sheet into a game-ready 16-sprite atlas.

Uses sprite-gen's proven chroma removal + kcentroid downscale so 1px dark
outlines survive the aggressive shrink from ~490px render to a 44x38 sprite.
"""
import sys, json
sys.path.insert(0, '/home/alpha_/Developer/sprite-gen')
from PIL import Image, ImageDraw
from sprite_gen.frames.extract import remove_chroma_background, _kcentroid_downscale
from sprite_gen.frames.slice_sheet import (
    DEFAULT_KEY_THRESHOLD, DEFAULT_FRINGE_KEY_THRESHOLD, DEFAULT_FRINGE_DELTA)

RAW = '/home/alpha_/blueprints/seven-falls/art/raw/demon_sheet_v1.png'
OUT = '/home/alpha_/blueprints/seven-falls/art'
CELL_W, CELL_H = 32, 30          # atlas cell = 1x draw box; drawn at 2x => 64x60 on screen
FIT_W, FIT_H = 30, 28            # 1px safety margin so nothing clips at cell edges

# reading order -> the 14 demon types the game uses (+2 spares for bosses)
NAMES = ['deception','lust','wrath','pride','despair','greed','sloth','depths',
         'shadows','flames','plagues','chains','desolation','fallen',
         'knight','worm']

sheet = Image.open(RAW).convert('RGBA')
print(f'raw sheet {sheet.size}')
keyed = remove_chroma_background(sheet, (0, 255, 0), DEFAULT_KEY_THRESHOLD,
                                 DEFAULT_FRINGE_KEY_THRESHOLD, DEFAULT_FRINGE_DELTA,
                                 background_key=None)
print(f'keyed, alpha>0 fraction = {sum(1 for p in keyed.getchannel("A").getdata() if p > 8) / (sheet.size[0]*sheet.size[1]):.3f}')

W, H = keyed.size
cw, ch = W // 4, H // 4
atlas = Image.new('RGBA', (CELL_W * 16, CELL_H), (0, 0, 0, 0))
meta = []
for idx in range(16):
    r, c = divmod(idx, 4)
    cell = keyed.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))
    bbox = cell.getbbox()
    if not bbox:
        print(f'  !! cell {idx} empty'); continue
    sprite = cell.crop(bbox)
    sw, sh = sprite.size
    # fit into the cell box preserving aspect
    scale = min(FIT_W / sw, FIT_H / sh)
    tw, th = max(1, round(sw * scale)), max(1, round(sh * scale))
    small = _kcentroid_downscale(sprite, tw, th, detail_bias=True)
    ox = (CELL_W - tw) // 2
    oy = CELL_H - th
    atlas.paste(small, (idx * CELL_W + ox, oy), small)
    # count opaque pixels after shrink to catch sprites that collapsed to mush
    op = sum(1 for p in small.getchannel('A').getdata() if p > 8)
    meta.append({'i': idx, 'name': NAMES[idx], 'src': [sw, sh], 'dst': [tw, th],
                 'opaque_px': op, 'opaque_pct': round(100*op/(tw*th), 1)})
    print(f'  {idx:2d} {NAMES[idx]:11s} src {sw:3d}x{sh:<3d} -> {tw:2d}x{th:<2d}  opaque {op:4d} ({100*op/(tw*th):4.1f}%)')

atlas.save(f'{OUT}/demon_atlas.png')
json.dump(meta, open(f'{OUT}/demon_atlas.json', 'w'), indent=1)

# 8x preview strip + a labelled contact sheet for review
atlas.resize((atlas.width * 8, atlas.height * 8), Image.NEAREST).save(f'{OUT}/atlas_preview_8x.png')
sheet_w, sheet_h = CELL_W * 8, CELL_H * 8
cs = Image.new('RGB', (sheet_w * 4 + 40, (sheet_h + 26) * 4 + 20), (24, 20, 34))
d = ImageDraw.Draw(cs)
for idx in range(16):
    r, c = divmod(idx, 4)
    cell = atlas.crop((idx * CELL_W, 0, (idx + 1) * CELL_W, CELL_H))
    cell = cell.resize((sheet_w, sheet_h), Image.NEAREST)
    x, y = 10 + c * (sheet_w + 10), 10 + r * (sheet_h + 26)
    cs.paste(cell, (x, y), cell)
    d.text((x + 2, y + sheet_h + 4), f'{idx}: {NAMES[idx]}', fill=(230, 220, 200))
cs.save(f'{OUT}/atlas_contact_sheet.png')
print(f'\natlas {atlas.size} -> {OUT}/demon_atlas.png')
