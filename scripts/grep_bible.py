"""Search helper for the parsed Bible.

  grep_bible.py 'Pattern' [book ...]     whole-word regex search, optional book-id filter
  grep_bible.py --ref 'gen 14:18-20'     print a passage; exits 1 if the ref is invalid
  grep_bible.py --count 'Pattern'        per-book counts
"""
import json
import re
import sys
from pathlib import Path

DATA = json.loads((Path(__file__).resolve().parent.parent / "public/data/bible.json").read_text(encoding="utf-8"))
BOOKS = {b["id"]: b for b in DATA["books"]}
REF = re.compile(r"^([1-3]?[a-z]{2,3}) (\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$")


def parse_ref(s):
    m = REF.match(s.strip())
    if not m or m.group(1) not in BOOKS:
        return None
    b, c1, v1, c2, v2 = m.groups()
    chs = BOOKS[b]["chapters"]
    c1 = int(c1)
    if v1 is None:
        v1, c2, v2 = 1, c1, (len(chs[c1 - 1]) if 0 < c1 <= len(chs) else 0)
    else:
        v1 = int(v1)
        c2 = int(c2) if c2 else c1
        v2 = int(v2) if v2 else v1
    if not (0 < c1 <= c2 <= len(chs)):
        return None
    if not (0 < v1 <= len(chs[c1 - 1]) and 0 < v2 <= len(chs[c2 - 1])):
        return None
    return b, c1, v1, c2, v2


def passage(s):
    p = parse_ref(s)
    if not p:
        return None
    b, c1, v1, c2, v2 = p
    out = []
    for c in range(c1, c2 + 1):
        chap = BOOKS[b]["chapters"][c - 1]
        lo = v1 if c == c1 else 1
        hi = v2 if c == c2 else len(chap)
        for v in range(lo, hi + 1):
            out.append((f"{b} {c}:{v}", chap[v - 1]))
    return out


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    if argv[0] == "--ref":
        rows = passage(argv[1])
        if rows is None:
            print(f"INVALID REF: {argv[1]}")
            return 1
        for r, t in rows:
            print(f"{r}  {t}")
        return 0
    count = argv[0] == "--count"
    if count:
        argv = argv[1:]
    pat = re.compile(r"(?<![\w’'])(?:" + argv[0] + r")(?![\w])")
    filt = set(argv[1:])
    hits = 0
    per = {}
    for b in DATA["books"]:
        if filt and b["id"] not in filt:
            continue
        for ci, chap in enumerate(b["chapters"], 1):
            for vi, t in enumerate(chap, 1):
                if pat.search(t):
                    hits += 1
                    per[b["id"]] = per.get(b["id"], 0) + 1
                    if not count and hits <= 200:
                        print(f"{b['id']} {ci}:{vi}  {t}")
    if count:
        print(" ".join(f"{k}:{v}" for k, v in per.items()))
    print(f"-- {hits} verses")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
