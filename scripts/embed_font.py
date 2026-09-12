#!/usr/bin/env python3
"""Embed Press Start 2P as a data URI so the game's metrics never depend on the network.

Why: the font was loaded from fonts.googleapis.com only. Offline, or behind a blocked
CDN, the browser falls back to a system monospace with different advance widths —
every layout tuned for the pixel font then overflows and text() ellipsises sentences.
Embedding 12.5 KB (16 KB base64) makes typography identical everywhere, including
file:// and inlined single-file builds.
Re-runnable: it replaces an existing embedded block instead of duplicating it.
"""
import base64
import pathlib
import re

ROOT = pathlib.Path("/home/alpha_/blueprints/seven-falls")
HTML = ROOT / "index.html"
FONT = ROOT / "src" / "fonts" / "PressStart2P.woff2"
START = "<!-- embedded-font:start -->"
END = "<!-- embedded-font:end -->"

b64 = base64.b64encode(FONT.read_bytes()).decode()
block = (
    START + "\n"
    "  <style>\n"
    "    /* Press Start 2P (SIL OFL 1.1) embedded inline so text metrics are identical\n"
    "       offline, behind a blocked CDN, and inside single-file/APK builds. Source of\n"
    "       truth: src/fonts/PressStart2P.woff2 — regenerate with scripts/embed_font.py. */\n"
    "    @font-face {\n"
    "      font-family: 'Press Start 2P';\n"
    "      font-style: normal;\n"
    "      font-weight: 400;\n"
    "      font-display: block;\n"
    f"      src: url(data:font/woff2;base64,{b64}) format('woff2');\n"
    "    }\n"
    "  </style>\n"
    "  " + END
)

src = HTML.read_text()
src = re.sub(re.escape(START) + r".*?" + re.escape(END), "", src, flags=re.S)

anchor = '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">'
if anchor not in src:
    raise SystemExit("anchor link tag not found — aborting")
# keep the CDN link as a harmless second source, embedded font wins because it is declared first
src = src.replace(anchor, block + "\n  " + anchor, 1)
HTML.write_text(src)
print(f"embedded {len(b64)//1024} KB base64 font into {HTML}")
