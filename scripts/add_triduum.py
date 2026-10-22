"""Add the full Easter Vigil (seven Old Testament readings with their psalms, Epistle, Gospel)
and a note on the Holy Thursday evening Mass to data/liturgy/readings.json as "extra" entries."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from grep_bible import parse_ref  # noqa: E402

L = lambda en, es: {"en": en, "es": es}
VIGIL = [
    (L("Reading I: Creation", "Lectura I: La creación"), "gen 1:1-2:2"),
    (L("Psalm 104", "Salmo 104"), "psa 104:1-35"),
    (L("Reading II: The sacrifice of Isaac", "Lectura II: El sacrificio de Isaac"), "gen 22:1-18"),
    (L("Psalm 16", "Salmo 16"), "psa 16:5-11"),
    (L("Reading III: Crossing the Red Sea", "Lectura III: El paso del mar Rojo"), "exo 14:15-15:1"),
    (L("Canticle of Moses", "Cántico de Moisés"), "exo 15:1-18"),
    (L("Reading IV: The Lord's everlasting love", "Lectura IV: El amor eterno del Señor"), "isa 54:5-14"),
    (L("Psalm 30", "Salmo 30"), "psa 30:1-12"),
    (L("Reading V: Come to the water", "Lectura V: Vengan por agua"), "isa 55:1-11"),
    (L("Canticle of Isaiah", "Cántico de Isaías"), "isa 12:2-6"),
    (L("Reading VI: The way of wisdom", "Lectura VI: El camino de la sabiduría"), "bar 3:9-4:4"),
    (L("Psalm 19", "Salmo 19"), "psa 19:7-10"),
    (L("Reading VII: A new heart and a new spirit", "Lectura VII: Un corazón nuevo y un espíritu nuevo"), "ezk 36:16-28"),
    (L("Psalms 42–43", "Salmos 42–43"), "psa 42:1-43:5"),
    (L("Epistle: Baptized into Christ's death", "Epístola: Bautizados en la muerte de Cristo"), "rom 6:3-11"),
    (L("Psalm 118: Alleluia", "Salmo 118: Aleluya"), "psa 118:1-23"),
]
GOSPEL = {"A": "mat 28:1-10", "B": "mrk 16:1-7", "C": "luk 24:1-12"}


def main():
    p = ROOT / "data/liturgy/readings.json"
    r = json.loads(p.read_text())
    for _, ref in VIGIL:
        assert parse_ref(ref), ref
    for cyc in "ABC":
        k = f"holy_saturday|{cyc}"
        r[k] = {"first": None, "psalm": None, "second": None, "gospel": None, "confidence": "high",
                "title": L("The Easter Vigil in the Holy Night", "Vigilia Pascual en la Noche Santa"),
                "note": L("Holy Saturday has no Mass during the day. After nightfall the Church keeps the Easter Vigil: the new fire, the Exsultet, up to nine readings, Baptism and the first Mass of Easter.",
                          "El Sábado Santo no hay Misa durante el día. Al caer la noche la Iglesia celebra la Vigilia Pascual: el fuego nuevo, el Pregón Pascual, hasta nueve lecturas, el Bautismo y la primera Misa de Pascua."),
                "extra": [{"label": lbl, "ref": ref} for lbl, ref in VIGIL] + [{"label": L("Gospel: He is risen", "Evangelio: Ha resucitado"), "ref": GOSPEL[cyc]}]}
        h = f"holy_thursday|{cyc}"
        r[h]["confidence"] = "high"
        r[h]["note"] = L("These are the readings of the evening Mass of the Lord's Supper, which begins the Easter Triduum. In the morning, the bishop celebrates the Chrism Mass at the cathedral.",
                         "Estas son las lecturas de la Misa vespertina de la Cena del Señor, que abre el Triduo Pascual. Por la mañana, el obispo celebra la Misa Crismal en la catedral.")
        g = f"good_friday|{cyc}"
        r[g]["note"] = L("Good Friday has no Mass. The Celebration of the Lord's Passion includes these readings, the Solemn Intercessions, the Adoration of the Cross and Holy Communion.",
                         "El Viernes Santo no hay Misa. La Celebración de la Pasión del Señor incluye estas lecturas, la Oración Universal, la Adoración de la Cruz y la Sagrada Comunión.")
    p.write_text(json.dumps(r, indent=0))
    print("ok")


if __name__ == "__main__":
    main()
