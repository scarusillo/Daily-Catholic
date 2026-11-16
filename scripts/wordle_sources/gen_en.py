"""One-off: builds data/wordle_extra_en_2.json (the third run of English Five Loaves answers): Bible vocabulary with the
verse that uses it, Bible places, Church words written by hand (en_church.txt) and well-attested five-letter Bible names."""
import json, random, re, sys, collections
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / 'scripts'))
from grep_bible import parse_ref, BOOKS, DATA
HERE = Path(__file__).parent
W = json.loads((ROOT / 'public/data/wordle.json').read_text()); have = {a['w'] for a in W['answers']}
en5 = set(json.loads((ROOT / 'data/vendor/wordlists/en5.json').read_text()))
def text(ref):
    b, c1, v1, c2, v2 = parse_ref(ref); out = []
    for c in range(c1, c2 + 1):
        ch = BOOKS[b]['chapters'][c - 1]; out += ch[(v1 if c == c1 else 1) - 1:(v2 if c == c2 else len(ch))]
    return ' '.join(out)
DROP = set("""SANDY GUILT MERIT PLEAS SALTY HOPES LAISH GRIND HEDGE PLOTS FORTH WIVES JOINS PLAYS SHEDS THEIR SHALL WHICH THERE THOSE THESE AMONG EVERY AFTER WOULD UNTIL AGAIN MIGHT ABOUT WHERE OTHER UNDER THING BEING WHOSE WHILE COULD SINCE ALONG DOING YOURS OFTEN OUGHT MEANS SEEMS ASIDE FULLY USING SORTS MAYBE BADLY LATER BELOW FEWER NEWLY TERMS BASIS CASES EVENT ISSUE STATE LOCAL EXIST STUFF MEANT APPLY EXACT AWARE DEFER POINT SPACE LEVEL STOCK ALIKE WORSE WORST USUAL
SLAIN DRUNK HATES KILLS LUSTS SEMEN VOMIT THIGH BELLY LOINS WAIST LIVER SLAVE ABHOR CRUEL SIEGE FILTH SORES BOILS PANGS BRIBE ABUSE CRIME VENOM COBRA CRAZY AGONY FATAL RAZOR DYING LIARS LYING SCORN SPITE FISTS WHIPS BLOWS DECAY WORMS BOOTY GROPE DROSS EVILS HARSH LOVER HAIRY GIRLS MAIDS MALES DOWRY PANTS BLAST HOMER FILMS CLUBS RIVAL STRIP SHAVE CHEWS BREED SLEEK WINKS RAGED SCOFF ANNUL STUCK NAKED HATED BOSOM TOOTH NECKS BACKS SAKES LOOPS LOCKS SWELL CREEP HEAVE SHAFT HABIT
FOURS MOLDS SURGE DRIES SHUTS WILLS CLAIM CARED SLIPS SPOTS BRINK STRAP LIKEN FOODS BOLTS FRAME PAIRS HEEDS EDGED ALTER ACTED NOBLY PLUMB SOLES SLACK LEDGE DARED SPIED WAVED SACKS RANKS WARES BINDS STAYS FORMS MEETS STOPS PICKS LOSES LOADS SELLS DEALS MOVES WANTS LOOSE SPLIT GOING SIDES POSTS LOWER OUTER THICK ROUND AHEAD SEIZE FORCE WIDTH FRONT APART LARGE EQUAL BLOCK URGED STIFF BASES ENTRY PITCH REPLY AMEND""".split())
LESS = set("""SINEW QUOTA SWARM SPELT FINED THEFT SNUFF FORKS GRABS HUNTS ERRED AXLES ALMUG WIPES COSTS ALGUM BLUSH USURY TRIES PERIL GUILE LIMIT HANGS ALOOF STARE GLOAT TAUNT PROWL TWIST DREGS GNASH TRAPS ENVOY STAIN MAGIC REVEL MISER SIEVE BLOWN FACED EXITS CARGO VALID WOMBS FARED PLANE ADDER PILED GORES GORED LEASE SWING WRING HERON OWNED TOTAL UNCUT WEDGE MOLDY RAPED PANIC HAUNT BALDY ROUTE URINE POLLS ODORS AWFUL RAZED LUMPS SCANT STUDS CREPT PARTY FUNDS MATCH SUITS STAMP GAMES SHEER SCALP SCARE DITCH EASED NOOSE CALVE VAULT HURLS BROOM ADMIT IRONS HURTS SLIDE BLUNT TILLS SHUNS RAGES HIRES SINKS HENNA DROWN TRACE FANGS DRAIN PEERS LIKES FRAUD STEEL ANVIL VEXED ANKLE WAILS HATCH DIMLY SWOON DOTED SEAMS CHOKE FOAMS PRINT STING RIOTS""".split())
ONCE = 'BLAZE CARTS CLANS CLAPS CLASP CURES EBONY FARMS FEATS FENCE FOALS JEWEL JOINS LEAPS LEAPT LOYAL LUTES MERIT MILLS OVENS PACES PAPER PILOT PLAYS POETS PONDS QUEST RIPEN ROBED SAILS SALTY SHAPE SMITH SNOWY SOARS START SWIMS TASKS TUNES UNITE WAGON WIDER YEARN GRAND GRASP ROLLS RIDGE SANDY ACRES BRIEF KNOTS NOTES'.split()
PLACES = """SELAH SHEOL RAMAH EKRON MEDES HAZOR MEDIA GEZER PARAN GERAR TEKOA GIHON ARIEL INDIA TROAS MARAH ACHOR GOLAN LYDDA DERBE GAIUS MOREH ENDOR NISAN ORION PERGA ALPHA OMEGA MODIN JABIN ELIHU SARAI NAHOR JORAM ITTAI APHEK JEBUS ARNON BAALS""".split()
BAD = re.compile(r"prostitut|harlot|whor|rape|concubin|dung|breast|circumcis|lust|adulter|fornicat|sexual|slaughter|corpse|dead bod|bowels|womb|urine|vomit|naked|slay|slew|kill|murder|curse|hate|blood|destroy|devour|perish|wicked|sword|struck|smite|smote|strike|war\b|enemies|wrath|burn|die\b|dead|death", re.I)
PRI = {**{b: 0 for b in 'mat mrk luk jhn psa'.split()}, **{b: 1 for b in 'pro isa rom 1co 2co gal eph php col 1th 2th 1ti 2ti tit heb jas 1pe 2pe 1jn rev act sir wis gen exo'.split()}}
cnt = collections.Counter(); verses = []
for b in DATA['books']:
    for ci, ch in enumerate(b['chapters']):
        for vi, v in enumerate(ch):
            verses.append((b['id'], ci + 1, vi + 1, v))
            for w in re.findall(r"[A-Za-z]+", v):
                if len(w) == 5 and w[0].islower(): cnt[w.upper()] += 1
def best(word, proper=False):
    pat = re.compile(r"(?<![A-Za-z’'])" + (word.capitalize() if proper else f"(?:{word.lower()}|{word.capitalize()})") + r"(?![A-Za-z’'])"); out = None
    for b, c, v, t in verses:
        if not pat.search(t) or not 30 <= len(t) <= 210: continue
        whole = t[0].isupper() or t[0] in '“‘' ; ends = t.rstrip()[-1] in '.!?”’'
        s = PRI.get(b, 2) * 30 + (0 if whole else 25) + (0 if ends else 25) + (60 if BAD.search(t) else 0) + abs(len(t) - 95) / 4 + (15 if t.count('“') != t.count('”') else 0)
        if out is None or s < out[0]: out = (s, f"{b} {c}:{v}", t)
    return out
P = json.loads((ROOT / 'public/data/people.json').read_text())['people']; pn = {p['name'].upper() for p in P}
out, seen, skipped = [], set(have), []
def quote(t): return '“' + t.strip().replace('“', '‘').replace('”', '’') + '”'
for line in (HERE / 'en_church.txt').read_text().splitlines():
    if not line.strip() or line.endswith('|x'): continue
    w, ref, kw, exp = line.split('|', 3)
    if w in seen: print('dup', w); continue
    assert len(w) == 5 and parse_ref(ref), line
    if kw.lower() not in text(ref).lower(): print('KW', w, ref, kw, '::', text(ref)[:120]); continue
    seen.add(w); out.append({'w': w, 'explain': exp, 'ref': ref})
nch = len(out)
vocab = [w for w, c in cnt.most_common() if c >= 4 and w in en5 and w not in have and w not in pn and w not in DROP] + [w for w, c in cnt.most_common() if 2 <= c <= 3 and w in en5 and w not in have and w not in pn and w not in LESS] + ONCE
for w in vocab:
    if w in seen: continue
    r = best(w)
    if not r or r[0] > 125: skipped.append((w, r and round(r[0]))); continue
    seen.add(w); out.append({'w': w, 'explain': quote(r[2]), 'ref': r[1]})
nv = len(out) - nch
for w in PLACES:
    if w in seen: continue
    r = best(w, True)
    if not r or r[0] > 110: skipped.append((w, r and round(r[0]))); continue
    seen.add(w); out.append({'w': w, 'explain': quote(r[2]), 'ref': r[1]})
npl = len(out) - nv - nch
names = {}
for p in P:
    n = p['name'].upper()
    if len(n) == 5 and n.isalpha() and n.isascii() and p['summary'] and p['mentions'] >= int(sys.argv[1] if len(sys.argv) > 1 else 3) and n not in seen and p['keyPassages'] and (n not in names or p['mentions'] > names[n]['mentions']): names[n] = p
ns = [{'w': n, 'explain': p['summary'].split('. ')[0].rstrip('.') + '.', 'ref': p['keyPassages'][0], 'person': p['id']} for n, p in sorted(names.items())]
print('skipped', skipped)
print(nv, 'Bible words;', npl, 'places;', nch, 'Church words;', len(ns), 'names; total with the first', len(have), ':', len(have) + len(out) + len(ns))
random.Random(31).shuffle(out); random.Random(32).shuffle(ns)
res, k = [], len(out) / max(1, len(ns)); used = 0
for v in out:
    res.append(v)
    while ns and (len(res) - used) >= (used + 1) * k: res.append(ns.pop()); used += 1
res += ns
(ROOT / 'data/wordle_extra_en_2.json').write_text(json.dumps(res, ensure_ascii=False, indent=0), encoding='utf-8')
for a in random.Random(1).sample(res, 45): print(a['w'], '|', a['ref'], '|', a['explain'][:150])
