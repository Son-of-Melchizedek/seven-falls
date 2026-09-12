# Demon sprite atlas

Pixel-art demon sprites for the combat screen, replacing the hand-coded
`drawDemonSprite32()` rectangles.

## Pipeline

    art/raw/demon_sheet_v1.png   2048x2048 Gemini-generated sheet (4x4 grid, green screen)
        -> art/cut_demons.py     chroma key -> kcentroid downscale -> 16 cells
        -> art/demon_atlas.png   512x30 strip (16 cells, 32x30, 1px margin)
        -> inlined as a base64 data URI in ../index.html

`cut_demons.py` needs sprite-gen's venv (`~/Developer/sprite-gen/.venv`) for
`pillow>=12` and `numpy>=2`. Re-run it after any regenerated sheet:

    cd art && ~/Developer/sprite-gen/.venv/bin/python cut_demons.py

Then re-inline the strip into index.html (it is embedded as a `data:image/png`
URI, so the game stays a single portable file with no external asset fetches).

## Cell contract

- Cell is 32x30 px; sprites are fitted into 30x28 with a 1px guard band, so no
  cell ever touches its neighbour.
- The strip is 16 cells wide (512 px). `DEMON_SPRITE_INDEX` in index.html maps
  demon `type` strings to cell indices; unknown types fall back to
  `drawDemonSprite32()`, which is still compiled in on purpose -- if the atlas
  ever fails to decode, combat still renders.

## Placement contract

`drawDemonSpriteImg()` must keep the creature's feet on its shadow:

- shadow: `drawShadow(cx, cy + 24, 1.5)` -- same offset `drawWarriorSprite()`
  uses. The 1.5 scale reproduces the radius the old 1.5x-transformed demon cast
  (22.5 x 6 on screen, not the unscaled 15 x 4).
- sprite: drawn at 2x (`DEMON_SPRITE_SC`) so the cell box bottom lands on
  `cy + 24` and the ink/feet land on `cy + 21`, i.e. sitting in the shadow
  ellipse rather than hovering above it.

Verify any change with the geometry probe (intercepts the real `drawImage` /
`ellipse` calls and prints the destination rect, feet line and shadow):

    node /tmp/spritetest/measure2.js

Expected: `feetY` ~= `shadowCY` (within the +-3 px bounce), `dw/dh` = 64/60,
`dh` destination inside the 384x288 canvas, `atlasReady: true`.
