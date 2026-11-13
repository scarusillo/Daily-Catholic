"""Build a standalone, installable website (PWA) into dist/.

  python3 scripts/build_web.py

dist/ can be uploaded to any static host (Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages)
and is also the web root that the Capacitor iOS/Android wrapper in app/ packages.
"""
import json
import re
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
    for f in ("favicon.svg", "og.png", "app.js", "app.css", "config.js", "i18n.js", "games.js", "today.js", "parish.js", "pray.js", "about.js"):
        shutil.copy(SITE / f, DIST / f)
    shutil.copytree(DATA, DIST / "data", dirs_exist_ok=True)
    shutil.copytree(SITE / "vendor", DIST / "vendor", dirs_exist_ok=True)
    body = (SITE / "index.html").read_text(encoding="utf-8")
    url = re.search(r'siteUrl:\s*"([^"]+)"', (SITE / "config.js").read_text(encoding="utf-8")).group(1)
    desc = "Daily Mass readings, the saint of the day, prayers and a guided Rosary, seven daily games, and every person in the Catholic Bible and how they connect. Free, no ads, no account."
    head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#27448f">
<meta name="description" content="{DESC}">
<link rel="canonical" href="{URL}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="The Daily Catholic">
<meta property="og:title" content="The Daily Catholic">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="{URL}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="apple-mobile-web-app-title" content="Daily Catholic">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<title>The Daily Catholic: daily readings, prayers and Bible games</title>
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
    head = head.replace("{DESC}", desc).replace("{URL}", url)
    body = body.replace("<title>The Daily Catholic</title>\n", "")
    body = body.replace('<meta charset="utf-8">\n', "")
    (DIST / "index.html").write_text(head + body + tail, encoding="utf-8")
    for n in (180, 192, 512):
        icon(n).save(DIST / f"icon-{n}.png")
    icon(512, maskable=True).save(DIST / "icon-maskable-512.png")
    (DIST / "manifest.webmanifest").write_text(json.dumps({
        "name": "The Daily Catholic", "short_name": "Daily Catholic", "start_url": "./#today", "display": "standalone",
        "description": desc, "lang": "en", "categories": ["education", "lifestyle", "books"],
        "background_color": "#eef0f3", "theme_color": "#27448f",
        "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }, indent=1), encoding="utf-8")
    files = ["./", "index.html", "app.js", "app.css", "config.js", "i18n.js", "games.js", "today.js", "parish.js", "pray.js", "about.js", "manifest.webmanifest", "icon-192.png", "favicon.svg"] + \
            [f"data/{f.relative_to(DATA).as_posix()}" for f in DATA.rglob("*.json")] + ["vendor/d3.min.js"] + [f"vendor/fonts/{f.name}" for f in sorted((SITE / "vendor/fonts").iterdir())]
    version = str(int(max(p.stat().st_mtime for p in DIST.rglob("*") if p.is_file())))
    (DIST / "sw.js").write_text(f"""// Offline support: cache the app shell and data; refresh in the background.
const CACHE = "bpm-{version}";
const FILES = {json.dumps(files)};
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(FILES.map((f) => c.add(f)))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// The app itself (page, scripts, styles) comes from the network when online, so a new version shows on the
// first visit after it ships; the saved copy is the fallback offline or on a slow connection (3 s).
// Data and fonts are served from the saved copy at once and refreshed in the background.
const SHELL = /([/]|[.]html|[.]js|[.]css|[.]webmanifest)$/;
self.addEventListener("fetch", (e) => {{
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const keep = (r) => {{ if (r.ok) {{ const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }} return r; }};
  if (SHELL.test(url.pathname)) {{
    e.respondWith(caches.match(e.request).then((hit) => {{
      const net = fetch(e.request).then(keep);
      if (!hit) return net;
      return Promise.race([net, new Promise((res) => setTimeout(() => res(hit), 3000))]).catch(() => hit);
    }}));
    return;
  }}
  e.respondWith(caches.match(e.request).then((hit) => {{
    const net = fetch(e.request).then(keep).catch(() => hit);
    return hit || net;
  }}));
}});
""", encoding="utf-8")
    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"dist/ built: {size // 1024} KB")


if __name__ == "__main__":
    main()
