#!/usr/bin/env python3
"""Inline every src/*.js of the game into one self-contained HTML for the APK.

Usage: inline.py <repo-dir> <output-html>
The Android WebView loads a single asset; separate <script src='src/...'> tags
are exactly what breaks in the packaged app (and the game must boot offline).
"""
import re, sys
from pathlib import Path

repo = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
out = Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/seven-falls.html')

html = (repo / 'index.html').read_text()
order = re.findall(r"<script src='(src/[^']+)'></script>", html)
assert order, 'no src/*.js script tags found — did index.html change shape?'
for rel in order:
    f = repo / rel
    assert f.exists(), f'missing {rel}'
    code = f.read_text()
    assert '</script>' not in code, f'{rel} contains a closing script tag'
    tag = f"<script src='{rel}'></script>"
    assert html.count(tag) == 1, f'{tag} is not unique'
    html = html.replace(tag, '<script>\n' + code + '\n</script>')
assert '<script src=' not in html, 'a script src survived inlining'

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)

blocks = re.findall(r'<script>(.*?)</script>', html, re.S)
print(f'inlined {len(order)} scripts, {len(blocks)} blocks total, {out} {out.stat().st_size/1e6:.2f} MB')
