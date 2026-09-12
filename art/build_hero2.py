#!/usr/bin/env python3
"""Child of God v2 — a soldier in the whole armour of God, drawn as real armour.

Fixes from the critique of v1: steel ramps instead of white, a cross that is
actually a cross, a sword with a crossguard, weapons physically gripped by a
fist, a slash instead of a punch, and hit/pray silhouettes that differ.
"""
from PIL import Image, ImageDraw
import os

W, H = 32, 30
P = {
    'k': (24, 20, 32), '1': (92, 100, 120), '2': (150, 162, 182), '3': (208, 218, 236),
    '4': (246, 250, 255), 'G': (214, 176, 88), 'g': (255, 232, 160), 'b': (58, 74, 140),
    'B': (96, 116, 196), 's': (232, 180, 138), 'd': (196, 140, 104), 'e': (28, 28, 44),
    'n': (76, 54, 36), 'r': (170, 52, 58),
}
ART = '/home/alpha_/blueprints/seven-falls/art'


class Cv:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.px = self.im.load()

    def p(self, x, y, c):
        if 0 <= x < W and 0 <= y < H and c in P:
            self.px[x, y] = P[c] + (255,)

    def r(self, x, y, w, h, c):
        for j in range(h):
            for i in range(w):
                self.p(x + i, y + j, c)

    def r2(self, x, y, w, h, c):          # mirrored rect about the centre axis
        self.r(x, y, w, h, c)
        self.r(W - x - w, y, w, h, c)


def legs(c, dx=0, dy=0, stride=False):
    o = dx, dy
    c.r2(12 + o[0], 21 + o[1], 3, 6, '2')
    c.r2(12 + o[0], 21 + o[1], 1, 6, '1')
    c.r2(12 + o[0], 23 + o[1], 3, 2, '3')          # greaves
    if stride:                                     # front foot planted forward
        c.r(11 + o[0], 27 + o[1], 5, 3, 'n')
        c.r(18 + o[0], 27 + o[1], 4, 3, 'n')
    else:
        c.r2(11 + o[0], 27 + o[1], 4, 3, 'n')


def torso(c, dx=0, dy=0, lean=0):
    x, y = 16 + dx, 9 + dy
    for k in range(8):                             # tapered cuirass
        hw = 5 if k < 5 else 4
        c.r(x - hw, y + k, hw * 2, 1, '2')
        c.p(x - hw, y + k, '1'); c.p(x + hw - 1, y + k, '1')
    c.r(x - 3, y + 1, 1, 5, '3')                   # chest highlight
    c.r2(x - 7, y, 3, 3, '3')                      # pauldrons
    c.r2(x - 7, y, 3, 1, '4')
    c.r2(x - 7, y + 2, 3, 1, '1')
    c.r(x - 1, y + 1, 2, 6, 'G')                   # cross: upright
    c.r(x - 4, y + 3, 8, 2, 'G')                   # cross: crossbar
    c.p(x - 1, y + 1, 'g')
    c.r(x - 5, y + 8, 10, 2, 'G')                  # belt of truth
    c.r(x - 2, y + 8, 4, 2, 'g')
    c.r(x - 4, y + 10, 8, 2, 'b')                  # tunic under the tassets
    c.r2(x - 4, y + 10, 3, 2, '2')


def head(c, dx=0, dy=0, bow=0):
    x, y = 16 + dx, 6 + dy + bow
    c.r(x - 1, y - 2, 2, 2, 'd')                   # neck
    c.r(x - 3, y, 6, 5, 's')                       # face
    c.p(x - 2, y + 1, 'e'); c.p(x + 1, y + 1, 'e')
    c.r(x - 1, y + 3, 2, 1, 'd')
    c.r(x - 4, y - 4, 8, 4, '2')                   # helm dome
    c.r(x - 3, y - 5, 6, 1, '2')
    c.r(x - 3, y - 5, 6, 1, '3')
    c.r(x - 4, y - 1, 8, 1, '1')                   # brow
    c.r(x - 1, y - 1, 2, 4, '3')                   # nose guard of salvation
    c.r2(x - 4, y - 1, 1, 3, '2')                  # cheek plates
    c.r(x - 1, y - 7, 2, 2, 'r')                   # crest
    c.r(x - 2, y - 6, 4, 1, 'G')


def shield(c, x=6, y=9, tilt=0):
    c.r(x + 1, y - 1, 7, 9, '2')                   # heater shield
    c.r(x, y, 9, 8, '2')
    c.r(x + 1, y + 8, 7, 1, '1')
    c.r(x + 2, y + 9, 5, 1, '2')
    c.r(x + 3, y + 10, 3, 1, '1')
    c.r(x + 1, y + 1, 7, 6, 'b')                   # blue field
    c.r(x + 4, y + 2, 2, 5, 'G')                   # cross on the shield
    c.r(x + 2, y + 3, 6, 1, 'G')
    c.r(x, y, 9, 1, '3'); c.r(x, y, 1, 8, '3')
    c.r(x + 6, y - 1, 2, 2, 's')                   # fist gripping the shield
    c.r(x + 7, y + 3, 1, 3, 'n')                   # strap


def blade(c, kind='up', hx=21, hy=14):
    if kind == 'up':
        c.r(hx, hy - 11, 2, 11, '3')
        c.r(hx, hy - 11, 1, 11, '4')
        c.r(hx - 2, hy, 6, 1, 'G')                 # crossguard
        c.r(hx, hy - 1, 2, 1, 'G')
        c.r(hx, hy + 1, 2, 2, 'n')                 # grip
        c.r(hx, hy + 3, 2, 1, 'G')                 # pommel
    elif kind == 'slash':                          # swung across, 45 degrees
        for i in range(9):
            c.r(hx - 9 + i, hy - 6 + i, 2, 2, '3')
            c.p(hx - 9 + i, hy - 6 + i, '4')
        c.r(hx - 11, hy - 8, 5, 1, 'G')
        c.r(hx + 1, hy + 2, 2, 2, 'n')
        c.r(hx + 3, hy + 4, 2, 1, 'G')
    elif kind == 'low':                            # held low after a blow
        c.r(hx, hy + 1, 2, 10, '3')
        c.r(hx, hy + 1, 1, 10, '4')
        c.r(hx - 2, hy + 1, 6, 1, 'G')
        c.r(hx, hy - 1, 2, 2, 'n')
        c.r(hx, hy - 2, 2, 1, 'G')
    elif kind == 'planted':                        # point down, hands on the hilt
        c.r(hx, hy + 2, 2, 11, '3')
        c.r(hx + 1, hy + 2, 1, 11, '4')
        c.r(hx - 2, hy + 1, 6, 1, 'G')
        c.r(hx - 1, hy - 2, 4, 3, 'n')
        c.r(hx - 1, hy - 3, 4, 1, 'G')
    elif kind == 'raised':
        c.r(hx, hy - 14, 2, 13, '3')
        c.r(hx, hy - 14, 1, 13, '4')
        c.r(hx - 2, hy - 1, 6, 1, 'G')
        c.r(hx, hy, 2, 2, 'n')
        c.r(hx, hy + 2, 2, 1, 'G')


def arm(c, sx, sy, ex, ey, tone='2'):              # simple two-segment arm
    for y in range(min(sy, ey), max(sy, ey) + 1):
        c.p(sx, y, tone)
    for x in range(min(sx, ex), max(sx, ex) + 1):
        c.p(x, ey, tone)
    c.r(ex - 1, ey - 1, 3, 3, 's')                 # fist


def build(pose):
    c = Cv()
    if pose == 'idle':
        legs(c); torso(c); head(c); shield(c, 6, 9)
        arm(c, 20, 11, 21, 15)
        blade(c, 'up', 21, 15)
    elif pose == 'attack':
        legs(c, 0, 0, stride=True); torso(c, 1, 0); head(c, 2, 0)
        shield(c, 5, 11)
        arm(c, 21, 11, 20, 12)
        blade(c, 'slash', 22, 12)
    elif pose == 'defend':
        legs(c, -1, 1); torso(c, -1, 2); head(c, -1, 2, bow=1)
        shield(c, 7, 6)                            # shield up, centred
        arm(c, 19, 13, 17, 15)
        blade(c, 'up', 22, 17)
    elif pose == 'hit':
        legs(c, -1, 0); torso(c, -2, 1); head(c, -3, 1)
        shield(c, 3, 13)
        arm(c, 18, 14, 17, 16)
        blade(c, 'low', 23, 15)
    elif pose == 'pray':
        legs(c, 0, 2); torso(c, 0, 2); head(c, 0, 2, bow=2)
        shield(c, 4, 15)
        blade(c, 'planted', 20, 15)
        arm(c, 19, 13, 19, 16)
    elif pose == 'victory':
        legs(c, 0, 0); torso(c, 0, -1); head(c, 0, -1)
        shield(c, 6, 5)
        arm(c, 21, 10, 21, 13)
        blade(c, 'raised', 21, 13)
    # outline pass
    src = c.im.copy().load()
    for y in range(H):
        for x in range(W):
            if src[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and src[nx, ny][3] > 0:
                        c.px[x, y] = P['k'] + (255,)
                        break
    return c.im


POSES = ['idle', 'attack', 'defend', 'hit', 'pray', 'victory']
atlas = Image.new('RGBA', (W * len(POSES), H), (0, 0, 0, 0))
for i, p in enumerate(POSES):
    atlas.paste(build(p), (i * W, 0))
atlas.save(f'{ART}/hero_atlas.png')

Z = 8
prev = Image.new('RGB', (W * len(POSES) * Z, H * Z + 30), (16, 13, 26))
for i in range(len(POSES)):
    cell = atlas.crop((i * W, 0, (i + 1) * W, H)).resize((W * Z, H * Z), Image.NEAREST)
    prev.paste(cell, (i * W * Z, 30), cell)
d = ImageDraw.Draw(prev)
for i, p in enumerate(POSES):
    d.text((i * W * Z + 10, 10), p.upper(), fill=(235, 220, 170))
prev.convert('P', palette=Image.ADAPTIVE, colors=256).save('/tmp/hero_preview.png', optimize=True)
print('hero v2 atlas', atlas.size, os.path.getsize(f'{ART}/hero_atlas.png'), 'bytes')
