#!/usr/bin/env python3
"""Download Google Fonts woff2 (cyrillic+latin subsets) for offline use in Берлога."""
import re, os, urllib.request, pathlib

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

FAMILIES = [
    ("unbounded", "https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap"),
    ("inter",     "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap"),
    ("jetbrains", "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"),
]

OUT = pathlib.Path("/home/z/my-project/public/fonts")
OUT.mkdir(parents=True, exist_ok=True)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def css(url):
    return fetch(url).decode("utf-8")

fontcss_all = []
total = 0
for name, url in FAMILIES:
    raw = css(url)
    # only keep blocks with cyrillic/cyrillic-ext/latin/latin-ext/greek subsets
    blocks = re.findall(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{[^}]+\})", raw)
    idx = 0
    for subset, block in blocks:
        if subset not in ("cyrillic", "cyrillic-ext", "latin", "latin-ext", "greek"):
            continue
        m = re.search(r"url\((https://[^)]+\.woff2)\)", block)
        if not m:
            continue
        u = m.group(1)
        idx += 1
        fname = f"{name}-{idx:02d}.woff2"
        data = fetch(u)
        total += len(data)
        (OUT / fname).write_bytes(data)
        block = block.replace(u, f"/fonts/{fname}")
        block = re.sub(r"\s*font-display:\s*swap;", "", block)
        fontcss_all.append(f"/* {name} :: {subset} */\n{block}")
        print(f"{fname:22s} {len(data)//1024:5d} KB  {name} {subset}")

css_out = "\n".join(fontcss_all)
(OUT / "fonts.css").write_text(css_out, encoding="utf-8")
print(f"\nTOTAL: {total//1024} KB, css -> {OUT/'fonts.css'}")
