"""Merge section files into the site's people graph.

Reads data/people/*.json, then:
  - dedupes ids (richer entry wins, family/relations unioned)
  - makes family links symmetric (child <-> parent, spouse <-> spouse)
  - drops links to unknown ids (reported)
  - validates every passage ref against the Bible text
  - auto-detects every verse mentioning each person (search.names / search.books)
Writes:
  public/data/people.json    person records + per-book mention counts + edges
  public/data/mentions.json  id -> {book: "c:v c:v ..."}
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from grep_bible import BOOKS, DATA, parse_ref  # noqa: E402

BOOK_ORDER = [b["id"] for b in DATA["books"]]
LIST_FIELDS = ("aliases", "spouses", "children", "know", "keyPassages")
TEXT_FIELDS = ("summary", "catholic", "role", "era", "feast", "name", "gender")

# Cross-book links the section owners could not write themselves.
EXTRA_RELATIONS = [
    ("mary-mother-of-jesus", "eve", "New Eve", "gen 3:15"),
    ("mary-mother-of-jesus", "michael-archangel", "Woman clothed with the sun (Rev 12)", "rev 12:1-7"),
    ("jesus", "melchizedek", "priest forever in the order of", "heb 7:1-17"),
    ("jesus", "adam", "the New Adam", "rom 5:12-19"),
    ("jesus", "moses", "prophet like", "act 3:22"),
    ("john-the-baptist", "elijah", "comes in the spirit of", "luk 1:17"),
]


# Verses where a matching name belongs to a namesake (merge-time corrections).
EXCLUDE = {
    "paul": ["act 13:21"],
    "cain": ["gen 4:22"],
    "jacob": ["mat 1:15-16"],
    "jonah": ["mat 16:17"],
}


# Same person written under two ids by different sections → canonical id.
ID_MERGE = {
    "machir-son-of-manasseh": "machir",
    "heman": "heman-the-singer",
    "jotham": "jotham-king-of-judah",
    "jozadak": "jehozadak",
}

# Parent links no single section could write (child and parent owned by different sections).
EXTRA_PARENTS = [
    ("gemariah-son-of-shaphan", "father", "shaphan"),
    ("cainan-son-of-arphaxad", "father", "arpachshad"),
]


def canon(x):
    return ID_MERGE.get(x, x)


def remap(p):
    p["id"] = canon(p["id"])
    for k in ("father", "mother"):
        if p.get(k):
            p[k] = canon(p[k])
    for k in ("spouses", "children"):
        p[k] = [canon(x) for x in p.get(k) or []]
    for r in p.get("relations") or []:
        r["to"] = canon(r.get("to"))


def load_sections():
    people = {}
    owner = {}
    for f in sorted((ROOT / "data/people").glob("*.json")):
        try:
            rows = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"!! {f.name}: {e}")
            continue
        for p in rows:
            if p.get("id"):
                remap(p)
            pid = p.get("id")
            if not pid:
                continue
            p["section"] = f.stem
            if pid not in people:
                people[pid] = p
                owner[pid] = f.stem
                continue
            merge_into(people[pid], p)
    return people


def richness(p):
    return len(p.get("summary") or "") + len(p.get("catholic") or "")


def merge_into(a, b):
    if richness(b) > richness(a):
        for k in TEXT_FIELDS + ("section",):
            if b.get(k):
                a[k] = b[k]
        if b.get("search"):
            a["search"] = b["search"]
    for k in ("father", "mother"):
        if not a.get(k) and b.get(k):
            a[k] = b[k]
    for k in LIST_FIELDS:
        seen = list(a.get(k) or [])
        for x in b.get(k) or []:
            if x not in seen:
                seen.append(x)
        a[k] = seen
    rels = a.get("relations") or []
    keys = {(r.get("to"), r.get("type")) for r in rels}
    for r in b.get("relations") or []:
        if (r.get("to"), r.get("type")) not in keys:
            rels.append(r)
    a["relations"] = rels


def norm(people):
    issues = defaultdict(list)
    for pid, p in people.items():
        for k in ("father", "mother"):
            if p.get(k) and p[k] not in people:
                issues["unknown parent"].append(f"{pid}.{k}={p[k]}")
                p[k] = None
        for k in ("spouses", "children"):
            keep = []
            for x in p.get(k) or []:
                if x in people and x != pid:
                    keep.append(x)
                else:
                    issues[f"unknown {k}"].append(f"{pid}->{x}")
            p[k] = keep
        keep = []
        for r in p.get("relations") or []:
            if r.get("to") in people and r["to"] != pid:
                if r.get("ref") and not parse_ref(r["ref"]):
                    issues["bad relation ref"].append(f"{pid}: {r['ref']}")
                    r["ref"] = None
                keep.append(r)
            else:
                issues["unknown relation"].append(f"{pid}->{r.get('to')}")
        p["relations"] = keep
        good = []
        for ref in p.get("keyPassages") or []:
            (good.append(ref) if parse_ref(ref) else issues["bad keyPassage"].append(f"{pid}: {ref}"))
        p["keyPassages"] = good

    for child, slot, par in EXTRA_PARENTS:
        if child in people and par in people and not people[child].get(slot):
            people[child][slot] = par

    # symmetry
    for pid, p in people.items():
        for c in p["children"]:
            ch = people[c]
            slot = "mother" if p.get("gender") == "f" else "father"
            if not ch.get(slot):
                ch[slot] = pid
        for s in p["spouses"]:
            if pid not in people[s]["spouses"]:
                people[s]["spouses"].append(pid)
    for pid, p in people.items():
        for k in ("father", "mother"):
            par = p.get(k)
            if par and pid not in people[par]["children"]:
                people[par]["children"].append(pid)

    for a, b, t, ref in EXTRA_RELATIONS:
        if a in people and b in people:
            if not any(r["to"] == b for r in people[a]["relations"]):
                people[a]["relations"].append({"to": b, "type": t, "ref": ref})
    return issues


def scope_filter(books):
    """search.books → {book_id: set(chapters) or None}"""
    if not books:
        return None
    out = {}
    for item in books:
        if ":" in item:
            b, rng = item.split(":", 1)
            lo, _, hi = rng.partition("-")
            chs = set(range(int(lo), int(hi or lo) + 1))
            if out.get(b, set()) is None:
                continue
            out.setdefault(b, set()).update(chs)
        else:
            out[item] = None
    return out


def find_mentions(people):
    # Build one regex per distinct name, then assign verses to people by scope.
    by_name = defaultdict(list)
    for pid, p in people.items():
        s = p.get("search") or {}
        names = s.get("names")
        if names is None:
            names = [p["name"]] + list(p.get("aliases") or [])
        for n in names:
            # "Saul@act:7-13,act:22" scopes a single name more narrowly than the person
            n, _, own = (n or "").partition("@")
            if n and len(n) > 1:
                scope = scope_filter(own.split(",")) if own else scope_filter(s.get("books"))
                by_name[n].append((pid, scope))
    excl = defaultdict(set)
    for pid, p in people.items():
        for ref in list((p.get("search") or {}).get("exclude") or []) + EXCLUDE.get(pid, []):
            r = parse_ref(ref)
            if r:
                b, c1, v1, c2, v2 = r
                for c in range(c1, c2 + 1):
                    for v in range(v1 if c == c1 else 1, (v2 if c == c2 else len(BOOKS[b]["chapters"][c - 1])) + 1):
                        excl[pid].add((b, c, v))
    mentions = defaultdict(lambda: defaultdict(list))
    for name, owners in by_name.items():
        pat = re.compile(r"(?<![\w’'])" + re.escape(name) + r"(?![\w])")
        for b in DATA["books"]:
            bid = b["id"]
            interested = [(pid, sc) for pid, sc in owners if sc is None or bid in sc]
            if not interested:
                continue
            heads = b.get("headings") or {}
            for ci, chap in enumerate(b["chapters"], 1):
                # verse 0 = psalm superscription ("A Psalm by David...")
                rows = ([(0, heads[str(ci)])] if str(ci) in heads else []) + list(enumerate(chap, 1))
                for vi, t in rows:
                    if name in t and pat.search(t):
                        for pid, sc in interested:
                            if (sc is None or sc[bid] is None or ci in sc[bid]) and (bid, ci, vi) not in excl[pid]:
                                lst = mentions[pid][bid]
                                if not lst or lst[-1] != (ci, vi):
                                    if (ci, vi) not in lst[-5:]:
                                        lst.append((ci, vi))
    return mentions


def main():
    people = load_sections()
    if not people:
        sys.exit("no section files yet")
    issues = norm(people)
    mentions = find_mentions(people)

    out_people = []
    out_mentions = {}
    for pid, p in people.items():
        m = mentions.get(pid, {})
        for bid in m:
            m[bid] = sorted(set(m[bid]))
        counts = {bid: len(m[bid]) for bid in BOOK_ORDER if bid in m}
        # books named in keyPassages count as appearances even if search found none
        for ref in p["keyPassages"]:
            bid = ref.split()[0]
            counts.setdefault(bid, 0)
        out_mentions[pid] = {bid: " ".join(f"{c}:{v}" for c, v in m[bid]) for bid in BOOK_ORDER if bid in m}
        out_people.append({
            "id": pid,
            "name": p.get("name") or pid,
            "aliases": p.get("aliases") or [],
            "gender": p.get("gender") or "u",
            "role": p.get("role") or "",
            "era": p.get("era") or "",
            "section": p.get("section"),
            "summary": p.get("summary") or "",
            "catholic": p.get("catholic") or "",
            "know": p.get("know") or [],
            "feast": p.get("feast") or None,
            "keyPassages": p["keyPassages"],
            "father": p.get("father"),
            "mother": p.get("mother"),
            "spouses": p["spouses"],
            "children": p["children"],
            "relations": [{"to": r["to"], "type": r.get("type") or "", "ref": r.get("ref")} for r in p["relations"]],
            "books": {bid: counts[bid] for bid in BOOK_ORDER if bid in counts},
            "mentions": sum(counts.values()),
        })
    out_people.sort(key=lambda x: (-x["mentions"], x["name"]))
    meta = [{"id": b["id"], "name": b["name"], "testament": b["testament"], "section": b["section"],
             "chapters": len(b["chapters"])} for b in DATA["books"]]
    (ROOT / "public/data/people.json").write_text(json.dumps({"books": meta, "people": out_people}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "public/data/mentions.json").write_text(json.dumps(out_mentions, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"{len(out_people)} people, {sum(p['mentions'] for p in out_people)} verse mentions")
    for k, v in issues.items():
        print(f"  {k}: {len(v)}  e.g. {v[:6]}")
    zero = [p["id"] for p in out_people if p["mentions"] == 0 and p["keyPassages"]]
    print(f"  no auto-mentions: {len(zero)} e.g. {zero[:10]}")


if __name__ == "__main__":
    main()
