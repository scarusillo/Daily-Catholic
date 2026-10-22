"""Build public/data/wordle.json for the "Five Loaves" word game.

Answers = hand-written Catholic/biblical vocabulary (with a teaching line and a Scripture ref)
        + well-known five-letter Bible names drawn from people.json.
Valid guesses = every 5-letter English word (an-array-of-english-words, MIT) + all answers.
Also builds public/data/wordle_es.json from data/wordle_es.json (Spanish answers) and the
5-letter Spanish list in data/vendor/wordlists/es5.json (an-array-of-spanish-words, MIT, accents removed).
Usage: python3 build_wordle.py   (5-letter English list: data/vendor/wordlists/en5.json)
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from grep_bible import parse_ref  # noqa: E402

VOCAB = [
    ("ALTAR", "The table of sacrifice where the Eucharist is offered; it stands for Christ himself at the center of the church.", "heb 13:10"),
    ("ANGEL", "A spiritual creature who serves God as messenger; every believer has a guardian angel (CCC 336).", "mat 18:10"),
    ("ASHES", "Placed on the forehead on Ash Wednesday: 'Remember that you are dust.'", "gen 3:19"),
    ("BREAD", "Jesus took bread, blessed it and said 'This is my body': the Eucharist.", "luk 22:19"),
    ("BIBLE", "From the Greek for 'the books': the Catholic Bible has 73 of them.", "2ti 3:16"),
    ("CREED", "From the Latin credo, 'I believe': the Nicene Creed is professed at Sunday Mass.", "1co 15:3-5"),
    ("CROSS", "The sign of our salvation, traced over ourselves at the start of every prayer.", "gal 6:14"),
    ("CHANT", "Gregorian chant is the Church's own music, given 'pride of place' by Vatican II.", "col 3:16"),
    ("CHOIR", "Singers who lead the assembly's song; the area of the church where they sing.", "psa 150:1-6"),
    ("FAITH", "The theological virtue by which we believe God and all he has revealed.", "heb 11:1"),
    ("FEAST", "A day of celebration in the Church's calendar, ranked below a solemnity.", "lev 23:1-4"),
    ("GLORY", "The Gloria, the angels' hymn at Christ's birth, is sung on Sundays outside Advent and Lent.", "luk 2:14"),
    ("GRACE", "God's free gift of his own life, poured into the soul through the sacraments.", "eph 2:8"),
    ("HYMNS", "Songs of praise; St Paul urges the Church to sing psalms, hymns and spiritual songs.", "eph 5:19"),
    ("MANNA", "Bread from heaven that fed Israel in the desert, a sign of the Eucharist.", "exo 16:14-15"),
    ("MERCY", "God's love that forgives; the Sunday after Easter is Divine Mercy Sunday.", "luk 6:36"),
    ("PSALM", "A song from the Book of Psalms; one is sung at every Mass after the first reading.", "psa 23:1-6"),
    ("SAINT", "A holy one in heaven; the Church canonizes some as models and intercessors.", "rev 7:9"),
    ("VIGIL", "A watch on the eve of a feast; the Easter Vigil is 'the mother of all vigils'.", "mat 28:1"),
    ("STOLE", "The long narrow vestment worn by priests and deacons, a sign of ordained ministry.", "1pe 5:2"),
    ("MITRE", "The tall pointed hat worn by a bishop.", "exo 28:4"),
    ("AMICE", "A white linen cloth a priest may wear around the neck under the alb.", "eph 6:17"),
    ("NAVES", "The nave is the main body of a church where the people gather (from navis, 'ship').", "1pe 2:5"),
    ("ABBEY", "A monastery led by an abbot or abbess, such as the Benedictines of Monte Cassino.", "act 2:42"),
    ("FRIAR", "A member of a mendicant order such as the Franciscans or Dominicans.", "mat 10:9-10"),
    ("PIETY", "Devotion and reverence toward God; one of the seven gifts of the Holy Spirit.", "isa 11:2"),
    ("SPIRIT", None, None),
    ("TITHE", "A tenth of one's increase given to God; Abraham gave a tithe to Melchizedek.", "gen 14:20"),
    ("SEDER", "The Passover meal; the Last Supper took place in the setting of Passover.", "luk 22:15"),
    ("LAMBS", "Jesus told Peter, 'Feed my lambs': the shepherd's charge of the pope.", "jhn 21:15"),
    ("SHEEP", "'My sheep hear my voice': Christ is the Good Shepherd.", "jhn 10:27"),
    ("TOMBS", "Easter morning the women found the tomb empty.", "luk 24:2-3"),
    ("ADORE", "To worship God alone; Eucharistic adoration is prayer before the Blessed Sacrament.", "jhn 4:23"),
    ("BLESS", "To call down God's favor; the priest blesses the people at the end of Mass.", "num 6:24-26"),
    ("PRAYS", "Prayer is 'the raising of one's mind and heart to God' (CCC 2559).", "1th 5:17"),
    ("PEACE", "'Peace I leave with you': the sign of peace is exchanged before Communion.", "jhn 14:27"),
    ("LIGHT", "'I am the light of the world': the Easter candle is lit from the new fire.", "jhn 8:12"),
    ("WATER", "Baptism is new birth 'of water and the Spirit'.", "jhn 3:5"),
    ("TRUTH", "'I am the way, and the truth, and the life.'", "jhn 14:6"),
    ("HEART", "The Sacred Heart of Jesus, symbol of his love, is honored in June.", "mat 11:29"),
    ("CROWN", "Christ the King is honored on the last Sunday of the Church year.", "rev 19:16"),
    ("THORN", "The crown of thorns pressed on Jesus' head in the Passion.", "jhn 19:2"),
    ("NAILS", "Thomas would not believe until he saw the mark of the nails.", "jhn 20:25"),
    ("ROBES", "The white baptismal garment: 'you have clothed yourselves with Christ'.", "gal 3:27"),
    ("RISEN", "'He is not here, for he has risen.' The heart of the Gospel.", "mat 28:6"),
    ("REIGN", "'Your kingdom come': the Kingdom of God is the center of Jesus' preaching.", "mat 6:10"),
    ("ROYAL", "'A royal priesthood': the priesthood of all the baptized.", "1pe 2:9"),
    ("TEMPLE", None, None),
    ("ARMOR", "'Put on the whole armor of God' to stand against evil.", "eph 6:11"),
    ("SWORD", "'The sword of the Spirit, which is the word of God.'", "eph 6:17"),
    ("SEVEN", "Seven sacraments, seven gifts of the Holy Spirit, seven deadly sins.", "rev 1:4"),
    ("TWELVE", None, None),
    ("TRIBE", "The twelve tribes of Israel, descended from the sons of Jacob.", "gen 49:28"),
    ("FLOOD", "The flood in Noah's day is a figure of Baptism (1 Pet 3:20-21).", "gen 7:17"),
    ("WOMAN", "'Woman, behold your son': Jesus gives Mary to the beloved disciple.", "jhn 19:26"),
    ("VIRGIN", None, None),
    ("ROSES", "Our Lady of Guadalupe left roses in Juan Diego's tilma; roses are a Marian symbol.", "sng 2:1"),
    ("CANON", "The list of inspired books; also the Eucharistic Prayer (the Roman Canon).", "2pe 1:21"),
    ("GOSPEL", None, None),
    ("PARISH", None, None),
    ("RITES", "The Church's liturgical rites: Roman, Byzantine, Maronite and more, all Catholic.", "1co 14:40"),
    ("SYNOD", "A gathering of bishops to advise the pope or govern a region.", "act 15:6"),
    ("POPES", "The successors of Peter as Bishop of Rome.", "mat 16:18"),
    ("CLERGY", None, None),
    ("ELDER", "Presbyter, the Greek word behind 'priest', means 'elder'.", "jas 5:14"),
    ("SERVE", "'The Son of Man came not to be served but to serve.'", "mrk 10:45"),
    ("ALMS", None, None),
    ("FASTS", "Lent is a season of prayer, fasting and almsgiving.", "mat 6:16-18"),
    ("SINAI", "The mountain where God gave Moses the Ten Commandments.", "exo 19:20"),
    ("ZION", None, None),
    ("JORDAN", None, None),
    ("EGYPT", "Israel's land of slavery, and later the Holy Family's refuge.", "mat 2:14-15"),
    ("BABEL", "The tower of human pride; Pentecost reverses its confusion of tongues.", "gen 11:9"),
    ("EDENS", None, None),
    ("RAVEN", "Ravens fed Elijah by the brook Cherith.", "1ki 17:6"),
    ("DOVES", "The Spirit descended on Jesus like a dove at his baptism.", "mat 3:16"),
    ("LILAC", None, None),
    ("CEDAR", "Solomon built the Temple with cedars of Lebanon.", "1ki 5:6"),
    ("VINES", "'I am the vine, you are the branches.'", "jhn 15:5"),
    ("WHEAT", "'Unless a grain of wheat falls into the earth and dies…'", "jhn 12:24"),
    ("YEAST", "The Kingdom of heaven is like yeast leavening the whole loaf.", "mat 13:33"),
    ("SALTY", None, None),
    ("SAVOR", None, None),
    ("TALENT", None, None),
    ("PEARL", "The Kingdom of heaven is like a merchant who finds one pearl of great price.", "mat 13:45-46"),
    ("COINS", "The widow's two small coins gave more than all the rest.", "mrk 12:42-44"),
    ("BOATS", "Jesus called fishermen from their boats to be fishers of men.", "luk 5:11"),
    ("NETS", None, None),
    ("STONE", "The stone rejected by the builders has become the cornerstone.", "psa 118:22"),
    ("ROCKS", None, None),
    ("KEYS", None, None),
    ("SCROLL", None, None),
    ("TABLET", None, None),
    ("ARKS", None, None),
    ("JUDGE", "'He will come again to judge the living and the dead.'", "act 10:42"),
    ("KINGS", "The Magi, traditionally three kings, came to worship the newborn King.", "mat 2:1-2"),
    ("MAGI", None, None),
    ("MYRRH", "Gold, frankincense and myrrh: myrrh foreshadowed his burial.", "mat 2:11"),
    ("STARS", "The star went before the Magi until it stopped over the place where the child was.", "mat 2:9"),
    ("SHONE", None, None),
    ("WORDS", "'In the beginning was the Word, and the Word was with God.'", "jhn 1:1"),
    ("UNITY", "'That they may all be one': Christ's prayer for the unity of the Church.", "jhn 17:21"),
    ("HOSTS", "The consecrated Host is the Body of Christ; 'Lord God of hosts' means God of the heavenly armies.", "isa 6:3"),
    ("CHRISM", None, None),
    ("OILED", None, None),
    ("ANOINT", None, None),
    ("SHRINE", None, None),
    ("CRYPT", "A chamber beneath a church, often holding the relics of saints.", "rev 6:9"),
    ("RELIC", "A physical remain of a saint, honored as a sign of the resurrection.", "2ki 13:21"),
    ("ICONS", "Sacred images that are 'windows to heaven' in Eastern tradition.", "col 1:15"),
    ("BEADS", "The rosary is prayed on beads: five decades of Hail Marys.", "luk 1:28"),
    ("NOVENA", None, None),
    ("LAUDS", "Morning Prayer in the Liturgy of the Hours.", "psa 63:1"),
    ("MATINS", None, None),
    ("NONES", "Mid-afternoon prayer, at the hour Jesus died.", "act 3:1"),
    ("SEXT", None, None),
    ("CELLS", None, None),
    ("VOWED", None, None),
    ("CHASTE", None, None),
    ("HUMBLE", None, None),
    ("MEEKLY", None, None),
    ("SPARE", None, None),
    ("GUILT", None, None),
    ("SHRIVE", None, None),
    ("SHAME", None, None),
    ("SAVED", "'For by grace you have been saved through faith.'", "eph 2:8"),
    ("CLEAN", "'Create in me a clean heart, O God.'", "psa 51:10"),
    ("WHITE", "'Though your sins are like scarlet, they shall be as white as snow.'", "isa 1:18"),
    ("SNOWS", None, None),
    ("ALIVE", "'This my son was dead and is alive again': the prodigal son.", "luk 15:24"),
    ("HEAVEN", None, None),
    ("LIMBO", None, None),
    ("HADES", "The realm of the dead; Christ descended there to free the just (CCC 633).", "1pe 3:19"),
    ("DEVIL", "The fallen angel who tempted Jesus in the desert.", "mat 4:1"),
    ("SATAN", "Hebrew for 'adversary', the tempter defeated by Christ.", "luk 10:18"),
    ("DEMON", "Jesus cast out demons as a sign that the Kingdom had come.", "mrk 1:34"),
    ("EXILE", "Judah's exile in Babylon, and our life on earth 'in this valley of tears'.", "psa 137:1"),
    ("MOUNT", "The Sermon on the Mount: the Beatitudes.", "mat 5:1-3"),
]


def main():
    valid = set(json.loads((ROOT / "data/vendor/wordlists/en5.json").read_text()))
    answers = []
    for w, exp, ref in VOCAB:
        if exp is None or len(w) != 5:
            continue
        assert parse_ref(ref), (w, ref)
        answers.append({"w": w, "explain": exp, "ref": ref, "person": None})
    people = json.loads((ROOT / "public/data/people.json").read_text())["people"]
    seen = {a["w"] for a in answers}
    for p in people:
        n = p["name"].upper()
        if len(n) == 5 and n.isalpha() and p["mentions"] >= 12 and p["summary"] and n not in seen:
            seen.add(n)
            answers.append({"w": n, "explain": p["summary"].split(". ")[0].rstrip(".") + ".", "ref": (p["keyPassages"] or [None])[0], "person": p["id"]})
        if len(n) == 5 and n.isalpha():
            valid.add(n)
    for a in answers:
        valid.add(a["w"])
    random.Random(7).shuffle(answers)
    # keep the harder words (rare liturgical terms, minor names) out of the first two months
    hard = {"NONES", "LAUDS", "AMICE", "NAVES", "MITRE", "SEDER", "SYNOD", "CRYPT", "RITES", "HADES", "ELDER", "FRIAR", "ABBEY", "PIETY", "CANON"}
    known = {p["id"] for p in people if p["mentions"] >= 60}
    easy = [a for a in answers if a["w"] not in hard and (not a["person"] or a["person"] in known)]
    rest = [a for a in answers if a not in easy]
    answers = easy + rest
    # newer answers go after the original rotation so earlier days keep their words
    extra = json.loads((ROOT / "data/wordle_extra_en.json").read_text())
    random.Random(11).shuffle(extra)
    for a in extra:
        if a["w"] not in seen:
            seen.add(a["w"])
            answers.append({"w": a["w"], "explain": a["explain"], "ref": a.get("ref"), "person": None})
            valid.add(a["w"])
    out = {"answers": answers, "valid": sorted(valid)}
    (ROOT / "public/data/wordle.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(answers), "answers;", sum(1 for a in answers if a["person"]), "are people;", len(valid), "valid guesses")
    print([a["w"] for a in answers[:20]])
    # Spanish
    es_ans = json.loads((ROOT / "data/wordle_es.json").read_text())
    random.Random(5).shuffle(es_ans)
    es_valid = set(json.loads((ROOT / "data/vendor/wordlists/es5.json").read_text())) | {a["w"] for a in es_ans}
    for a in es_ans:
        assert parse_ref(a["ref"]), a
    (ROOT / "public/data/wordle_es.json").write_text(json.dumps({"answers": es_ans, "valid": sorted(es_valid)}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(es_ans), "Spanish answers;", len(es_valid), "Spanish valid guesses")


if __name__ == "__main__":
    main()
