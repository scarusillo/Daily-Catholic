"""Merge the Spanish profile batches (data/people_es_*.json) into public/data/people_es.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
out = {}
for f in sorted((ROOT / "data").glob("people_es_*.json")):
    out.update(json.loads(f.read_text()))
ids = {p["id"] for p in json.loads((ROOT / "public/data/people.json").read_text())["people"]}
(ROOT / "public/data/people_es.json").write_text(json.dumps({k: v for k, v in out.items() if k in ids}, ensure_ascii=False, separators=(",", ":")))
print(len(out), "Spanish profiles")
