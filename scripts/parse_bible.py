"""Parse the World English Bible — Catholic Edition (PDF-extracted markdown)
into clean per-verse JSON for all 73 books of the Catholic canon.

Output: public/data/bible.json
  { "books": [ {id, name, testament, section, chapters: [[v1, v2, ...], ...]} ] }

Validates verse counts against the clean protestant WEB JSON for the 66
shared books (excluding Esther/Daniel, whose Catholic editions are longer).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/raw/web_catholic.md"
OUT = ROOT / "public/data/bible.json"
CHECK = ROOT / "data/raw/web_protestant_json"

# (header name in source, id, display name, testament, section)
BOOKS = [
    ("Genesis", "gen", "Genesis", "OT", "Pentateuch"),
    ("Exodus", "exo", "Exodus", "OT", "Pentateuch"),
    ("Leviticus", "lev", "Leviticus", "OT", "Pentateuch"),
    ("Numbers", "num", "Numbers", "OT", "Pentateuch"),
    ("Deuteronomy", "deu", "Deuteronomy", "OT", "Pentateuch"),
    ("Joshua", "jos", "Joshua", "OT", "Historical"),
    ("Judges", "jdg", "Judges", "OT", "Historical"),
    ("Ruth", "rut", "Ruth", "OT", "Historical"),
    ("1 Samuel", "1sa", "1 Samuel", "OT", "Historical"),
    ("2 Samuel", "2sa", "2 Samuel", "OT", "Historical"),
    ("1 Kings", "1ki", "1 Kings", "OT", "Historical"),
    ("2 Kings", "2ki", "2 Kings", "OT", "Historical"),
    ("1 Chronicles", "1ch", "1 Chronicles", "OT", "Historical"),
    ("2 Chronicles", "2ch", "2 Chronicles", "OT", "Historical"),
    ("Ezra", "ezr", "Ezra", "OT", "Historical"),
    ("Nehemiah", "neh", "Nehemiah", "OT", "Historical"),
    ("Tobit", "tob", "Tobit", "OT", "Historical"),
    ("Judith", "jdt", "Judith", "OT", "Historical"),
    ("Esther (Greek)", "est", "Esther", "OT", "Historical"),
    ("1 Maccabees", "1ma", "1 Maccabees", "OT", "Historical"),
    ("2 Maccabees", "2ma", "2 Maccabees", "OT", "Historical"),
    ("Job", "job", "Job", "OT", "Wisdom"),
    ("Psalms", "psa", "Psalms", "OT", "Wisdom"),
    ("Proverbs", "pro", "Proverbs", "OT", "Wisdom"),
    ("Ecclesiastes", "ecc", "Ecclesiastes", "OT", "Wisdom"),
    ("Song of Solomon", "sng", "Song of Songs", "OT", "Wisdom"),
    ("Wisdom of Solomon", "wis", "Wisdom", "OT", "Wisdom"),
    ("Sirach", "sir", "Sirach", "OT", "Wisdom"),
    ("Isaiah", "isa", "Isaiah", "OT", "Prophets"),
    ("Jeremiah", "jer", "Jeremiah", "OT", "Prophets"),
    ("Lamentations", "lam", "Lamentations", "OT", "Prophets"),
    ("Baruch", "bar", "Baruch", "OT", "Prophets"),
    ("Ezekiel", "ezk", "Ezekiel", "OT", "Prophets"),
    ("Daniel (Greek)", "dan", "Daniel", "OT", "Prophets"),
    ("Hosea", "hos", "Hosea", "OT", "Prophets"),
    ("Joel", "jol", "Joel", "OT", "Prophets"),
    ("Amos", "amo", "Amos", "OT", "Prophets"),
    ("Obadiah", "oba", "Obadiah", "OT", "Prophets"),
    ("Jonah", "jon", "Jonah", "OT", "Prophets"),
    ("Micah", "mic", "Micah", "OT", "Prophets"),
    ("Nahum", "nam", "Nahum", "OT", "Prophets"),
    ("Habakkuk", "hab", "Habakkuk", "OT", "Prophets"),
    ("Zephaniah", "zep", "Zephaniah", "OT", "Prophets"),
    ("Haggai", "hag", "Haggai", "OT", "Prophets"),
    ("Zechariah", "zec", "Zechariah", "OT", "Prophets"),
    ("Malachi", "mal", "Malachi", "OT", "Prophets"),
    ("Matthew", "mat", "Matthew", "NT", "Gospels"),
    ("Mark", "mrk", "Mark", "NT", "Gospels"),
    ("Luke", "luk", "Luke", "NT", "Gospels"),
    ("John", "jhn", "John", "NT", "Gospels"),
    ("Acts", "act", "Acts", "NT", "Acts"),
    ("Romans", "rom", "Romans", "NT", "Letters"),
    ("1 Corinthians", "1co", "1 Corinthians", "NT", "Letters"),
    ("2 Corinthians", "2co", "2 Corinthians", "NT", "Letters"),
    ("Galatians", "gal", "Galatians", "NT", "Letters"),
    ("Ephesians", "eph", "Ephesians", "NT", "Letters"),
    ("Philippians", "php", "Philippians", "NT", "Letters"),
    ("Colossians", "col", "Colossians", "NT", "Letters"),
    ("1 Thessalonians", "1th", "1 Thessalonians", "NT", "Letters"),
    ("2 Thessalonians", "2th", "2 Thessalonians", "NT", "Letters"),
    ("1 Timothy", "1ti", "1 Timothy", "NT", "Letters"),
    ("2 Timothy", "2ti", "2 Timothy", "NT", "Letters"),
    ("Titus", "tit", "Titus", "NT", "Letters"),
    ("Philemon", "phm", "Philemon", "NT", "Letters"),
    ("Hebrews", "heb", "Hebrews", "NT", "Letters"),
    ("James", "jas", "James", "NT", "Letters"),
    ("1 Peter", "1pe", "1 Peter", "NT", "Letters"),
    ("2 Peter", "2pe", "2 Peter", "NT", "Letters"),
    ("1 John", "1jn", "1 John", "NT", "Letters"),
    ("2 John", "2jn", "2 John", "NT", "Letters"),
    ("3 John", "3jn", "3 John", "NT", "Letters"),
    ("Jude", "jud", "Jude", "NT", "Letters"),
    ("Revelation", "rev", "Revelation", "NT", "Revelation"),
]
SRC_NAMES = {b[0] for b in BOOKS}

HEADER = re.compile(r"^(.+?) (\d+):([\d\-–]+) (\d+) (.+?) (\d+):([\d\-–]+)\s*$")
# Single-chapter books and some pages carry "Book 1:1 1234 Book 1:9" too, but
# a few pages have only one side; accept "Book c:v PAGE" as a fallback.
HEADER2 = re.compile(r"^(.+?) (\d+):(\d+) (\d+)\s*$")
# single-chapter books: "Obadiah 1 1094 Obadiah 20"
HEADER3 = re.compile(r"^(.+?) (\d+) (\d+) (.+?) (\d+)\s*$")
FOOTNOTE = re.compile(r"^[†‡§∗*◊¶#]+ ?\d+:\d+")
MARKERS = re.compile(r"[†‡§∗◊¶]")
VERSE = re.compile(r"^(\d+) ?(.*)$")


def page_book(line):
    m = HEADER.match(line)
    if m and m.group(1) in SRC_NAMES:
        return m.group(1)
    m = HEADER2.match(line)
    if m and m.group(1) in SRC_NAMES:
        return m.group(1)
    m = HEADER3.match(line)
    if m and m.group(1) in SRC_NAMES and m.group(1) == m.group(4):
        return m.group(1)
    return None


def pages(lines):
    """Yield (book_src_name, [content lines]) per page, footnotes dropped."""
    cur, buf = None, []
    for line in lines:
        b = page_book(line)
        if b:
            if cur:
                yield cur, buf
            cur, buf = b, []
            continue
        if cur is None:
            continue
        buf.append(line)
    if cur:
        yield cur, buf


def strip_footnotes(buf):
    out = []
    for line in buf:
        if FOOTNOTE.match(line.strip()):
            break  # everything after the first footnote line is footnotes
        out.append(line)
    return out


def join_text(parts):
    s = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if s.endswith("-") and p[:1].islower():
            s = s[:-1] + p
        elif s:
            s += " " + p
        else:
            s = p
    s = MARKERS.sub("", s)
    s = re.sub(r"\s+([,.;:!?’”)])", r"\1", s)
    s = re.sub(r"([,;:!?])(?=[A-Za-z“‘])", r"\1 ", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def parse():
    lines = SRC.read_text(encoding="utf-8").splitlines()
    by_book = {}
    order = []
    for b, buf in pages(lines):
        if b not in by_book:
            by_book[b] = []
            order.append(b)
        by_book[b].extend(strip_footnotes(buf))

    result = []
    for src, bid, name, test, sect in BOOKS:
        body = by_book.get(src)
        if body is None:
            sys.exit(f"missing book {src}")
        chapters = {}
        ch, vs = 1, 0
        cur = None  # list of text parts for current verse
        started = False
        heads = {}  # psalm superscriptions: text between the chapter number and verse 1
        for raw in body:
            line = raw.strip()
            if not line:
                continue
            if re.fullmatch(r"\d+", line):
                n = int(line)
                if n == ch + 1 or (n == 1 and not started):
                    if started:
                        ch = n
                    vs, cur = 0, None
                    continue
            if line.startswith("BOOK ") and src == "Psalms":
                continue
            m = VERSE.match(line)
            if m:
                n = int(m.group(1))
                if n == vs + 1 or (vs == 0 and n == 1) or (n > vs + 1 and n <= vs + 3 and started and cur is not None):
                    # allow small gaps: some editions omit a verse (textual)
                    started = True
                    vs = n
                    cur = [m.group(2)]
                    chapters.setdefault(ch, {})[vs] = cur
                    continue
            if cur is not None:
                cur.append(line)
            elif src == "Psalms" and started or (src == "Psalms" and ch == 1):
                heads.setdefault(ch, []).append(line)
            # else: book title before verse 1 → dropped
        chap_list = []
        for c in sorted(chapters):
            vmap = chapters[c]
            mx = max(vmap)
            chap_list.append([join_text(vmap[v]) if v in vmap else "" for v in range(1, mx + 1)])
        book = {"id": bid, "name": name, "testament": test, "section": sect, "chapters": chap_list}
        if src == "Psalms":
            book["headings"] = {str(c): join_text(h) for c, h in heads.items() if c > 1 or not h[0].startswith("The Psalms")}
            book["headings"] = {c: t for c, t in book["headings"].items() if t and t != "The Psalms"}
        result.append(book)
    return result


WORD = re.compile(r"[A-Za-z’']+")


def fix_glued(books):
    """PDF extraction glued some words ("grandmotherLois", "Youare"). Split any
    token that is unknown to the clean WEB vocabulary but splits into two known words."""
    vocab = {}
    for f in CHECK.glob("*.json"):
        for row in json.loads(f.read_text(encoding="utf-8")):
            for w in WORD.findall(row.get("value", "")):
                vocab[w] = vocab.get(w, 0) + 1
    cat = {}
    for b in books:  # words frequent in the Catholic text itself are real (Greek names etc.)
        for ch in b["chapters"]:
            for v in ch:
                for w in WORD.findall(v):
                    cat[w] = cat.get(w, 0) + 1
    ref_known = lambda w: vocab.get(w, 0) >= 1 or vocab.get(w.lower(), 0) >= 1
    common = lambda w: vocab.get(w, 0) + vocab.get(w.lower(), 0) >= 20

    def splittable(w):
        return any(common(w[:i]) and common(w[i:]) for i in range(2, len(w) - 1))

    known = lambda w: ref_known(w) or (cat.get(w, 0) >= 3 and not splittable(w))
    fixed = 0

    def split(m):
        nonlocal fixed
        w = m.group(0)
        if known(w) or len(w) < 5:
            return w
        # segment into the fewest known words (2-4 pieces), preferring common words
        n = len(w)
        best = [None] * (n + 1)
        best[0] = (0, 0, [])
        for j in range(1, n + 1):
            for i in range(max(0, j - 20), j):
                if best[i] is None:
                    continue
                part = w[i:j]
                if len(part) < 2 and part.lower() not in ("a", "i"):
                    continue
                if not ref_known(part):
                    continue
                f = vocab.get(part, 0) + vocab.get(part.lower(), 0)
                cand = (best[i][0] + 1, best[i][1] - min(f, 50), best[i][2] + [part])
                if best[j] is None or cand[:2] < best[j][:2]:
                    best[j] = cand
        if best[n] and 2 <= best[n][0] <= 4:
            fixed += 1
            return " ".join(best[n][2])
        return w

    for b in books:
        for ch in b["chapters"]:
            for i, v in enumerate(ch):
                ch[i] = WORD.sub(split, v)
    return fixed


def validate(books):
    files = {p.stem: p for p in CHECK.glob("*.json")}
    problems = 0
    for b in books:
        key = b["name"].lower().replace(" ", "")
        key = {"songofsongs": "songofsolomon"}.get(key, key)
        if b["id"] in ("est", "dan") or key not in files:
            continue
        ref = {}
        for row in json.loads(files[key].read_text(encoding="utf-8")):
            if "chapterNumber" in row:
                c, v = row["chapterNumber"], row["verseNumber"]
                ref[c] = max(ref.get(c, 0), v)
        mine = {i + 1: len(c) for i, c in enumerate(b["chapters"])}
        if len(mine) != len(ref):
            print(f"  {b['name']}: chapters {len(mine)} vs {len(ref)}")
            problems += 1
        for c in ref:
            if mine.get(c) != ref[c]:
                print(f"  {b['name']} {c}: verses {mine.get(c)} vs {ref[c]}")
                problems += 1
        empties = [f"{i+1}:{j+1}" for i, ch in enumerate(b["chapters"]) for j, t in enumerate(ch) if not t]
        if empties:
            print(f"  {b['name']}: empty verses {empties[:8]}")
    return problems


if __name__ == "__main__":
    books = parse()
    print(f"split {fix_glued(books)} glued words")
    n = sum(len(v) for b in books for v in b["chapters"])
    print(f"{len(books)} books, {n} verses")
    p = validate(books)
    print(f"{p} verse-count mismatches vs reference")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"translation": "World English Bible — Catholic Edition (public domain, eBible.org)", "books": books}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
