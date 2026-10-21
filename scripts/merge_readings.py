"""Merge Sunday/feast readings and weekday readings into public/data/readings.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIT = ROOT / "data/liturgy"
out = {}
for f in ("readings.json", "readings_ordinary_weekdays.json", "readings_seasonal_weekdays.json"):
    p = LIT / f
    if p.exists():
        d = json.loads(p.read_text())
        out.update(d)
        print(f, len(d))
(ROOT / "public/data/readings.json").write_text(json.dumps(out, separators=(",", ":")))
print("total", len(out))
