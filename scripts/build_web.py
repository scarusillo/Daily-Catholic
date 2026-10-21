"""Build a standalone, installable website (PWA) into dist/.

  python3 scripts/build_web.py

dist/ can be uploaded to any static host (Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages)
and is also the web root that the Capacitor iOS/Android wrapper in app/ packages.
"""
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SITE, DATA, DIST = ROOT / "site", ROOT / "public/data", ROOT / "dist"
LAPIS, GOLD, VELLUM = (39, 68, 143), (216, 179, 92), (238, 240, 243)


def icon(size, maskable=False):
    img = Image.new("RGB", (size, size), LAPIS)
    d = ImageDraw.Draw(img)
    s = size * (0.62 if maskable else 0.78)
    cx, cy, w = size / 2, size / 2, max(2, int(size * 0.075))
    top, bot = cy - s / 2, cy + s / 2
    d.line([(cx, top), (cx, bot)], fill=GOLD, width=w)
    arm = cy - s * 0.16
    d.line([(cx - s * 0.3, arm), (cx + s * 0.3, arm)], fill=GOLD, width=w)
    # three nodes: the "people map"
    r = size * 0.045
    for x, y in [(cx - s * 0.3, arm), (cx + s * 0.3, arm), (cx, bot)]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=VELLUM)
    return img


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "data").mkdir(parents=True)
    for f in ("app.js", "app.css", "games.js", "today.js"):
        shutil.copy(SITE / f, DIST / f)
    for f in DATA.glob("*.json"):
        shutil.copy(f, DIST / "data" / f.name)
    body = (SITE / "index.html").read_text(encoding="utf-8")
    head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#27448f">
<meta name="description" content="Every person in the Catholic Bible: family ties, every passage, Catholic teaching, daily games and Sunday readings.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}[hidden]{display:none!important}</style>
</head>
<body>
"""
    tail = """
<script>if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));</script>
</body>
</html>
"""
    body = body.replace('<meta charset="utf-8">\n', "")
    (DIST / "index.html").write_text(head + body + tail, encoding="utf-8")
    for n in (180, 192, 512):
        icon(n).save(DIST / f"icon-{n}.png")
    icon(512, maskable=True).save(DIST / "icon-maskable-512.png")
    (DIST / "manifest.webmanifest").write_text(json.dumps({
        "name": "Bible People Map", "short_name": "Bible People", "start_url": "./#today", "display": "standalone",
        "background_color": "#eef0f3", "theme_color": "#27448f",
        "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }, indent=1), encoding="utf-8")
    files = ["./", "index.html", "app.js", "app.css", "games.js", "today.js", "manifest.webmanifest", "icon-192.png"] + \
            [f"data/{f.name}" for f in DATA.glob("*.json")] + ["https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"]
    version = str(int(max(p.stat().st_mtime for p in DIST.rglob("*") if p.is_file())))
    (DIST / "sw.js").write_text(f"""// Offline support: cache the app shell and data; refresh in the background.
const CACHE = "bpm-{version}";
const FILES = {json.dumps(files)};
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {{
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then((hit) => {{
    const net = fetch(e.request).then((r) => {{ if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone())); return r; }}).catch(() => hit);
    return hit || net;
  }}));
}});
""", encoding="utf-8")
    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"dist/ built: {size // 1024} KB")


if __name__ == "__main__":
    main()
