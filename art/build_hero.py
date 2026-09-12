#!/usr/bin/env python3
"""Author the Child of God: a soldier in the whole armour of God (Ephesians 6).

Parts are ASCII pixel maps with a palette, composed per pose so the six states
share one design. Output: art/hero_atlas.png (6 cells, 32x30) + a zoomed preview.

  belt of truth      -> gold belt
  breastplate        -> steel cuirass with the gold cross
  shoes of the gospel-> greaves and boots
  shield of faith    -> cruciform shield, left arm
  helmet of salvation-> crested helm
  sword of the Spirit-> the Word, right hand
"""
from PIL import Image
import os

CELL = (32, 30)
PAL = {
    '.': None,
    'k': (26, 22, 34),      # outline
    's': (232, 180, 138),   # skin
    'd': (198, 142, 106),   # skin shade
    'h': (188, 196, 214),   # steel
    'H': (232, 240, 252),   # steel highlight
    'h2': (122, 132, 152),  # steel shade
    'G': (217, 178, 90),    # gold
    'g': (255, 226, 150),   # gold light
    'b': (59, 74, 140),     # blue tunic
    'B': (92, 112, 190),    # blue light
    'r': (168, 48, 56),     # red accent
    'w': (250, 250, 255),   # white/holy glow
    'n': (74, 53, 36),      # hair / leather
    'e': (30, 30, 46),      # eye
}

# ── parts (drawn in local space, pasted at pose offsets) ────────────────────
HELM = [
    '..kkkkkkkk..',
    '.kggGGGGggk.',
    'kGhhhhhhhhGk',
    'khhHHhhHHhhk',
    'khhhhhhhhhhk',
    'khhk.ss.khhk',
    'khk.ssss.khk',
    '.kk.sese.kk.',
]
FACE = [
    '..ssssss..',
    '.ssssssss.',
    '.sseesee s.',
    '.ssssssss.',
    '..sdddds..',
]
TORSO = [
    '..hkkkkkkh..',
    '.khHHhhhhHhk',
    'khhhhhhhhhhk',
    'khhhhGGhhhhk',
    'khhhGkGhhhhk',
    'khhhGGGhhhhk',
    'kghhhhhhhhgk',
    'kGGGGGGGGGGk',
    '.kbbbbbbbbk.',
    ' kbbBbbbBbk.',
    ' kkkkkkkkkk ',
]
SHIELD = [
    '.kkkkkk.',
    'khHHHHhk',
    'khkGGkhk',
    'khGGGGhk',
    'khkGGkhk',
    'khHHHHhk',
    'khhhhhhk',
    '.khhhhk.',
    '..khhk..',
    '...kk...',
]
SWORD_BLADE = [
    'kk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
    'Hk',
]
SWORD_HILT = [
    '.kkkk.',
    'kGGGGk',
    'kkGGkk',
    '.kGGk.',
    '.kkkk.',
]
LEGS = [
    'khhk.khhk',
    'khhk.khhk',
    'khhk.khhk',
    'khhk.khhk',
    'kHHk.kHHk',
    'knnk.knnk',
    'knnk.knnk',
    'kkkk.kkkk',
]
ARM = ['khhk', 'kHhk', 'khhk', 'khhk', 'khhk', 'khhk', 'knnk']


def part(rows, scale=1):
    w = max(len(r) for r in rows); h = len(rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = PAL.get(ch)
            if c:
                px[x, y] = (c[0], c[1], c[2], 255)
    return im


def paste(canvas, img, x, y, rot=0):
    if rot:
        img = img.rotate(rot, expand=True, resample=Image.NEAREST)
    canvas.alpha_composite(img, (int(x), int(y)))


def build_pose(name):
    c = Image.new('RGBA', CELL, (0, 0, 0, 0))
    helm, face, torso = part(HELM), part(FACE), part(TORSO)
    shield, legs = part(SHIELD), part(LEGS)
    blade, hilt, arm = part(SWORD_BLADE), part(SWORD_HILT), part(ARM)

    if name == 'idle':
        paste(c, torso, 10, 10); paste(c, legs, 11, 21)
        paste(c, arm, 21, 12); paste(c, face, 11, 6); paste(c, helm, 10, 2)
        paste(c, shield, 4, 10)
        paste(c, blade, 24, 5); paste(c, hilt, 22, 16)
    elif name == 'attack':
        paste(c, torso, 12, 10); paste(c, legs, 10, 21)
        paste(c, arm, 22, 13); paste(c, face, 13, 7); paste(c, helm, 12, 3)
        paste(c, shield, 5, 12)
        paste(c, blade, 15, 1, rot=62); paste(c, hilt, 22, 14)
    elif name == 'defend':
        paste(c, torso, 11, 12); paste(c, legs, 12, 22)
        paste(c, arm, 20, 14); paste(c, face, 12, 8); paste(c, helm, 11, 4)
        paste(c, shield, 5, 7, rot=8)
        paste(c, blade, 25, 8); paste(c, hilt, 23, 19)
    elif name == 'hit':
        paste(c, torso, 9, 11); paste(c, legs, 8, 22)
        paste(c, arm, 19, 13); paste(c, face, 11, 7); paste(c, helm, 9, 3)
        paste(c, shield, 3, 13, rot=-12)
        paste(c, blade, 24, 9); paste(c, hilt, 22, 20)
    elif name == 'pray':
        paste(c, torso, 11, 11); paste(c, legs, 11, 22)
        paste(c, arm, 19, 13); paste(c, face, 12, 8); paste(c, helm, 11, 4)
        paste(c, shield, 5, 15)
        paste(c, blade, 26, 6); paste(c, hilt, 24, 17)
    elif name == 'victory':
        paste(c, torso, 11, 10); paste(c, legs, 11, 21)
        paste(c, arm, 20, 10); paste(c, face, 12, 6); paste(c, helm, 11, 2)
        paste(c, shield, 6, 6, rot=-14)
        paste(c, blade, 24, 0); paste(c, hilt, 22, 11)
    # outline pass: any transparent pixel touching the figure turns to ink
    px = c.load()
    src = c.copy().load()
    for y in range(CELL[1]):
        for x in range(CELL[0]):
            if src[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < CELL[0] and 0 <= ny < CELL[1] and src[nx, ny][3] > 0:
                        px[x, y] = (26, 22, 34, 255)
                        break
    return c


POSES = ['idle', 'attack', 'defend', 'hit', 'pray', 'victory']
ART = '/home/alpha_/blueprints/seven-falls/art'
atlas = Image.new('RGBA', (CELL[0] * len(POSES), CELL[1]), (0, 0, 0, 0))
for i, p in enumerate(POSES):
    atlas.paste(build_pose(p), (i * CELL[0], 0))
atlas.save(f'{ART}/hero_atlas.png')

# zoomed preview with labels
from PIL import ImageDraw
Z = 7
prev = Image.new('RGB', (CELL[0] * len(POSES) * Z, CELL[1] * Z + 34), (16, 13, 26))
for i, p in enumerate(POSES):
    cellimg = atlas.crop((i * CELL[0], 0, (i + 1) * CELL[0], CELL[1])).resize((CELL[0] * Z, CELL[1] * Z), Image.NEAREST)
    prev.paste(cellimg, (i * CELL[0] * Z, 34), cellimg)
d = ImageDraw.Draw(prev)
for i, p in enumerate(POSES):
    d.text((i * CELL[0] * Z + 8, 10), p.upper(), fill=(235, 220, 170))
prev = prev.convert('P', palette=Image.ADAPTIVE, colors=256)
prev.save('/tmp/hero_preview.png', optimize=True)
print('hero atlas', atlas.size, 'bytes', os.path.getsize(f'{ART}/hero_atlas.png'))
