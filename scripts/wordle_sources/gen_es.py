"""One-off: builds data/wordle_es_2.json (the second run of Spanish Five Loaves answers) from the hand-written
lists here plus well-attested five-letter Bible names. Checks every word, reference and keyword."""
import json, random, re, sys, unicodedata
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / 'scripts'))
from grep_bible import parse_ref, passage, BOOKS
HERE = Path(__file__).parent
def plain(s):
    s = s.upper().replace('Ñ', '#'); s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn'); return s.replace('#', 'Ñ')
def text(ref):
    b, c1, v1, c2, v2 = parse_ref(ref); out = []
    for c in range(c1, c2 + 1):
        ch = BOOKS[b]['chapters'][c - 1]
        out += ch[(v1 if c == c1 else 1) - 1:(v2 if c == c2 else len(ch))]
    return ' '.join(out)
have = {a['w'] for a in json.loads((ROOT / 'data/wordle_es.json').read_text())}
es5 = set(json.loads((ROOT / 'data/vendor/wordlists/es5.json').read_text()))
vocab, bad = [], []
for f in sorted(HERE.glob('es_*.txt')):
    for line in f.read_text().splitlines():
        if not line.strip() or line.endswith('|x'): continue
        shown, ref, kw, exp = line.split('|', 3); w = plain(shown)
        if not re.fullmatch('[A-ZÑ]{5}', w): bad.append(('len', shown)); continue
        if w in have: bad.append(('dup', shown)); continue
        if not parse_ref(ref): bad.append(('ref', shown, ref)); continue
        if kw.lower() not in text(ref).lower(): bad.append(('kw', shown, ref, kw, text(ref)[:110])); continue
        if w not in es5: bad.append(('notword', shown))
        have.add(w); vocab.append({'w': w, 'shown': shown, 'explain': exp, 'ref': ref})
P = json.loads((ROOT / 'public/data/people.json').read_text())['people']; PE = json.loads((ROOT / 'public/data/people_es.json').read_text())
names = {}
for p in P:
    o = PE.get(p['id']) or {}; n = o.get('name') or ''
    if len(n) == 5 and n.isalpha() and o.get('summary') and p['mentions'] >= int(sys.argv[1] if len(sys.argv) > 1 else 5) and p['keyPassages'] and parse_ref(p['keyPassages'][0]):
        w = plain(n)
        if re.fullmatch('[A-ZÑ]{5}', w) and w not in have and (w not in names or p['mentions'] > names[w][0]['mentions']): names[w] = (p, o)
def first(t):
    m = re.match(r'^(.{30,260}?[.!?])(\s|$)', t); return m.group(1) if m else t
ns = [{'w': w, 'shown': o['name'].upper(), 'explain': first(o['summary']), 'ref': p['keyPassages'][0], 'person': p['id']} for w, (p, o) in sorted(names.items())]
for b in bad: print(b)
print(len(vocab), 'words;', len(ns), 'names; total with the first 200:', 200 + len(vocab) + len(ns))
random.Random(21).shuffle(vocab); random.Random(22).shuffle(ns)
out, k = [], len(vocab) / max(1, len(ns))
for i, v in enumerate(vocab):
    out.append(v)
    while ns and len(out) - (len(ns_used := [x for x in out if 'person' in x])) >= (len(ns_used) + 1) * k: out.append(ns.pop())
out += ns
(ROOT / 'data/wordle_es_2.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
print('written', len(out), [x['w'] for x in out[:24]])
