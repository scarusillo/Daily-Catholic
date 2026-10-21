"""Run after build_calendar.mjs: append a weekday-readings key to every day that has no
Sunday/feast key, and write data/liturgy/weekday_keys.json + celebrations.json."""
import collections
import datetime
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def weekday_key(d, season, week, cf, epiphany=None):
    dt = datetime.date.fromisoformat(d)
    wd = dt.strftime("%A").lower()
    if season == "advent" and dt.month == 12 and dt.day >= 17:
        return f"advent-dec{dt.day}"
    if season == "christmas":
        # before Epiphany the Lectionary goes by date (Dec 29-31, Jan 2-7); after it, by weekday
        if dt.month == 1 and epiphany and dt > epiphany:
            return f"christmas-after-epiphany-{wd}"
        return f"christmas-{dt.month:02d}{dt.day:02d}"
    if season == "ordinary":
        return f"ordinary-{week}-{wd}|{'I' if cf == 1 else 'II'}"
    return f"{season}-{week}-{wd}"


def main():
    p = ROOT / "public/data/calendar.json"
    cal = json.loads(p.read_text())
    keys, cels = collections.OrderedDict(), collections.OrderedDict()
    epiph = {d[:4]: datetime.date.fromisoformat(d) for d, v in cal.items() if any(c[3] == "epiphany" for c in v[4])}
    for d, v in sorted(cal.items()):
        season, week, cs, cf, celebs, k = v[:6]
        for t, col, rank, cid in celebs:
            if cid and rank != "Sunday":
                cels.setdefault(cid, {"title": t, "rank": rank, "colour": col, "dates": []})["dates"].append(d)
        wk = None if k else weekday_key(d, season, week, cf, epiph.get(d[:4]))
        cal[d] = v[:6] + [wk]
        if wk:
            keys.setdefault(wk, {"title": celebs[0][0], "dates": []})["dates"].append(d)
    p.write_text(json.dumps(cal, separators=(",", ":")))
    (ROOT / "data/liturgy/weekday_keys.json").write_text(json.dumps(keys, indent=0))
    (ROOT / "data/liturgy/celebrations.json").write_text(json.dumps(cels, indent=0))
    print(len(keys), "weekday keys,", len(cels), "celebrations")


if __name__ == "__main__":
    main()
