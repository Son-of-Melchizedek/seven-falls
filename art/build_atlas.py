#!/usr/bin/env python3
"""Build art/demon_atlas.png: every demon id gets its own 32x30 cell.

Cells are bottom-aligned so feet land on the ground line the game draws.
Writes art/atlas_map.json = {id: index} in atlas order.
"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/home/alpha_/Developer/sprite-gen')
from sprite_gen.frames.extract import _kcentroid_downscale
from cut_sheets import ccl_boxes, content_mask

ART = '/home/alpha_/blueprints/seven-falls/art'
CELLS = f'{ART}/cells'
CW, CH, PAD = 64, 60, 2
FIT_W, FIT_H = CW - 2 * PAD, CH - PAD

SPRITES = [
    ('idle_shadow', 'v2_00'), ('lying_spirit', 'v2_01'), ('mote_greed', 'v2_02'),
    ('shadow_doubt', 'v2_03'), ('flame_wraith', 'v2_06'), ('imp_pride', 'v2_07'),
    ('veiled_whisper', 'v2_08'), ('whispering_cabal', 'v2_09'), ('wrath_pack', 'v2_12'),
    ('avarice_twins', 'v2_13'), ('vanity_court', 'v2_15'), ('despair_incarnate', 'v2_22'),
    ('legion_deception', 'v3_00'), ('legion_wrath', 'v3_01'), ('legion_pride', 'v3_02'),
    ('lord_flies', 'v3_03'), ('the_accuser', 'v3_04'), ('mammon', 'v3_05'),
    ('lord_depths', 'v3_07'), ('lord_shadows', 'v3_08'), ('lord_flames', 'v3_09'),
    ('lord_plagues', 'v3_10'), ('lord_chains', 'v3_12'), ('thor_fallen', 'v3_13'),
    ('loki_fallen', 'v3_15'), ('mercury_fallen', 'v3_16'), ('odin_fallen', 'v3_11'),
    ('beelzebub', 'v4_00'), ('satan_duke', 'v4_01'), ('lucifer', 'v4_02'),
    ('lucifer_duke', 'v4_03'), ('asmodeus', 'v4_05'), ('belial', 'v4_07'),
    ('belphegor', 'v4_08'), ('mammon_duke', 'v4_09'), ('azazel', 'v4_10'),
    ('mars_fallen', 'v4_11'), ('semjaza', 'v4_13'), ('rumeel', 'v4_14'),
    ('ares_fallen', 'v4_15'), ('hades_fallen', 'v4_16'), ('zeus_fallen', 'v4_17'),
    ('jupiter_fallen', 'v4_18'),
    # extra skins: elites, allies, unassigned art kept for later use
    ('x_reaper', 'v2_05'), ('x_brute', 'v2_19'), ('x_worm', 'v2_16'),
    ('x_angel_sword', 'v2_23'), ('x_death_lord', 'v4_06'), ('x_angel_star', 'v4_04'),
    ('x_devil_goblet', 'v4_12'), ('x_hell_pig', 'v2_17'), ('x_toad', 'v2_18'),
    ('x_lantern_monk', 'v2_20'), ('x_glow_hood', 'v2_21'), ('x_mirror_jester', 'v2_14'),
    ('x_spiked_brute', 'v2_10'), ('x_horned_imp', 'v2_11'), ('x_laughing_mask', 'v2_04'),
]

TRIM = {'v4_09'}   # cells holding two separate creatures: keep the main one only


def load_cell(tag):
    im = Image.open(f'{CELLS}/{tag}.png').convert('RGBA')
    if tag in TRIM:
        sheet = Image.new('RGB', im.size, (0, 255, 0))
        sheet.paste(im, (0, 0), im)
        mask = content_mask(sheet, im)
        boxes = ccl_boxes(mask)
        if boxes:
            b = max(boxes, key=lambda x: x[4])
            im = im.crop(tuple(int(v) for v in b[:4]))
    return im


def fit(im):
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w, h = im.size
    s = min(FIT_W / w, FIT_H / h)
    tw, th = max(1, int(round(w * s))), max(1, int(round(h * s)))
    small = _kcentroid_downscale(im, tw, th, detail_bias=True).convert('RGBA')
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    cell.paste(small, ((CW - tw) // 2, CH - th), small)
    return cell


n = len(SPRITES)
atlas = Image.new('RGBA', (CW * n, CH), (0, 0, 0, 0))
index = {}
for i, (key, tag) in enumerate(SPRITES):
    atlas.paste(fit(load_cell(tag)), (i * CW, 0))
    index[key] = i
atlas.save(f'{ART}/demon_atlas.png')
json.dump({'cell_w': CW, 'cell_h': CH, 'index': index, 'order': [k for k, _ in SPRITES]},
          open(f'{ART}/atlas_map.json', 'w'), indent=1)
print(f'atlas {atlas.size} cells={n} bytes={os.path.getsize(f"{ART}/demon_atlas.png")}')
