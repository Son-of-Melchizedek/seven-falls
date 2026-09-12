#!/usr/bin/env python3
"""Fix the clipped-text class of bugs in Seven Falls.

Root cause: renderers wrapped strings with wrapText(text, N_CHARS) — a character
count — while the canvas font is drawn at size*S (S=1.5) of a 1.0-em pixel font,
so a "38 character" line measures ~1.5x wider than the panel it was sized for.
text() then clipped the overflow with an ellipsis, so sentences stopped mid-word
on the intro, scholar note, event, bible and boss-intro screens.

Fix: wrap by MEASURED pixel width (wrapTextPx) using the real width of the panel
and the real font size of that call site. Verified by the QA harness, which fails
on any remaining ellipsis-clip event.
"""
import pathlib
import sys

HTML = pathlib.Path("/home/alpha_/blueprints/seven-falls/index.html")

EDITS = [
    # scholar note — inner panel width 342 (x=22 .. panel edge 370), body 7px, hint 6px
    ("  const lines = wrapText(note.text, 38);",
     "  const lines = wrapTextPx(note.text, 340, 7);"),
    ("  const hintLines = note.hint ? wrapText('> ' + note.hint, 38) : [];",
     "  const hintLines = note.hint ? wrapTextPx('> ' + note.hint, 340, 6) : [];"),
    # map node description — centred, keep clear of both edges
    ("  const lines = wrapText(desc, 34);",
     "  const lines = wrapTextPx(desc, 336, 7);"),
    # combat message + combo quote (centred under the message area)
    ("    const ml = wrapText(combat.message, 46);",
     "    const ml = wrapTextPx(combat.message, 356, 6);"),
    ("      const ql = wrapText(combat.comboResult.quote, 46);",
     "      const ql = wrapTextPx(combat.comboResult.quote, 356, 5);"),
    # event body
    ("  const lines = wrapText(ev.text, 36);",
     "  const lines = wrapTextPx(ev.text, 340, 7);"),
    # shop row (name + price), rows are 22px tall so keep it to two lines
    ("    const lines = wrapText(name + '  (' + it.cost + 'g)', 40);",
     "    const lines = wrapTextPx(name + '  (' + it.cost + 'g)', 356, 6);"),
    # treasure / reward body — centred, full width
    ("  const lines = wrapText(game.rewardText || '...', 36);",
     "  const lines = wrapTextPx(game.rewardText || '...', 356, 7);"),
    # death screen: quote + insight
    ("  const lines = wrapText(game.lastDeathText, 34);",
     "  const lines = wrapTextPx(game.lastDeathText, 356, 6);"),
    ("  const il = wrapText('Insight: ' + game.lastDeathInsight, 36);",
     "  const il = wrapTextPx('Insight: ' + game.lastDeathInsight, 356, 6);"),
    # boot only once the embedded pixel font is actually available: measuring or
    # drawing a frame against the fallback font mis-sizes every line.
    ("requestAnimationFrame(loop);\n</script>",
     "// Boot after the pixel font is ready so the first frame is laid out with the\n"
     "// real metrics (canvas fillText never waits for a font on its own).\n"
     "if (document.fonts && document.fonts.load){\n"
     "  Promise.race([\n"
     "    document.fonts.load('8px \"Press Start 2P\"').catch(() => {}),\n"
     "    new Promise(r => setTimeout(r, 1500)),\n"
     "  ]).then(() => requestAnimationFrame(loop));\n"
     "} else {\n"
     "  requestAnimationFrame(loop);\n"
     "}\n</script>"),
]

src = HTML.read_text()
for old, new in EDITS:
    n = src.count(old)
    if n != 1:
        sys.exit(f"ABORT: expected exactly 1 match, found {n} for:\n{old!r}")
    src = src.replace(old, new, 1)

leftover = src.count("wrapText(") - src.count("wrapTextPx(")
HTML.write_text(src)
print(f"applied {len(EDITS)} edits; remaining char-count wrapText call sites: {leftover}")
