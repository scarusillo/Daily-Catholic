"""Merge Sunday/feast readings and weekday readings into public/data/readings.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIT = ROOT / "data/liturgy"
out = {}
for f in ("readings.json", "readings_ordinary_weekdays.json", "readings_seasonal_weekdays.json", "readings_extension.json"):
    p = LIT / f
    if p.exists():
        d = json.loads(p.read_text())
        out.update(d)
        print(f, len(d))
# Fixed-date feasts read the same every year: where a year's key is missing, reuse another cycle's.
cal = json.loads((ROOT / "public/data/calendar.json").read_text())
copied = 0
for day in cal.values():
    k = day[5]
    if k and k not in out and "-sunday|" not in k:
        sib = [out[x] for x in out if x.split("|")[0] == k.split("|")[0]]
        if sib:
            out[k] = sib[0]
            copied += 1
print("feast keys reused across cycles", copied)
(ROOT / "public/data/readings.json").write_text(json.dumps(out, separators=(",", ":")))
print("total", len(out))
