// Build public/data/prayers.json from two openly licensed prayer packages
// (data/vendor/prayer-collection: CodexCommunion license, free use; data/vendor/rosario: MIT)
// plus the Rosary/Chaplet structure, mystery Scripture refs and fruits defined here.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PC = path.join(ROOT, "data/vendor/prayer-collection/prayers");
const ro = { en: (await import(path.join(ROOT, "data/vendor/rosario/src/lang/en.js"))).default, es: (await import(path.join(ROOT, "data/vendor/rosario/src/lang/es.js"))).default };
const { MYSTERIES } = await import(path.join(ROOT, "data/vendor/rosario/src/mysteries.js"));

const GROUP = { core: "essential", essential: "essential", marian: "marian", daily: "daily", saints: "saints", eucharistic: "eucharist", eucharist: "eucharist", penitential: "sorrow", death: "sorrow" };
const split = (t) => String(t || "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
const prayers = [];
for (const f of fs.readdirSync(PC).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(PC, f)));
  const m = d.metadata, tr = d.translations;
  if (!tr.en?.text || !tr.es?.text) continue; // structured chaplets are rebuilt below
  const group = GROUP[m.primary_category] || (m.labels || []).map((l) => GROUP[l]).find(Boolean) || "daily";
  prayers.push({ id: m.id, group, en: { title: m.title, text: split(tr.en.text), note: m.description || "" },
    es: { title: tr.es.title || m.title_es || null, text: split(tr.es.text), note: "" }, latin: tr.la?.text ? split(tr.la.text) : null, ref: null });
}
// Spanish titles: take the first words of the Spanish text when the package has no title field.
const ES_TITLES = { "sign-of-the-cross": "La Señal de la Cruz", "our-father": "Padre Nuestro", "hail-mary": "Ave María", "glory-be": "Gloria", "apostles-creed": "Credo de los Apóstoles",
  "act-of-contrition": "Acto de contrición", "act-of-faith": "Acto de fe", "act-of-hope": "Acto de esperanza", "act-of-love": "Acto de caridad", "angelus": "El Ángelus", "regina-caeli": "Regina Caeli",
  "memorare": "Acordaos", "salve-regina": "Dios te salve, Reina y Madre", "prayer-to-st-michael": "Oración a San Miguel Arcángel", "prayer-to-guardian-angel": "Oración al Ángel de la Guarda",
  "come-holy-spirit": "Ven, Espíritu Santo", "morning-offering": "Ofrecimiento de obras", "grace-before-meals": "Bendición de la mesa", "grace-after-meals": "Acción de gracias después de comer",
  "anima-christi": "Alma de Cristo", "eternal-rest": "Dale, Señor, el descanso eterno", "prayer-for-the-dead": "Oración por los difuntos", "prayer-of-st-francis": "Oración de San Francisco",
  "fatima-prayer": "Oración de Fátima", "magnificat": "Magníficat", "eternal-father": "Padre Eterno", "for-the-sake-of-his-sorrowful-passion": "Por su dolorosa Pasión", "holy-god": "Santo Dios",
  "divine-mercy-opening-prayer": "Oración inicial de la Coronilla", "divine-mercy-closing-prayer": "Oración final de la Coronilla", "confiteor": "Yo confieso", "te-deum": "Te Deum",
  "veni-creator-spiritus": "Veni Creator Spiritus", "sub-tuum-praesidium": "Bajo tu amparo", "litany-of-loreto": "Letanías de la Virgen", "litany-of-the-sacred-heart": "Letanías del Sagrado Corazón",
  "prayer-to-st-joseph": "Oración a San José", "prayer-to-st-jude": "Oración a San Judas Tadeo", "prayer-to-st-anthony": "Oración a San Antonio", "prayer-to-st-therese": "Oración a Santa Teresita",
  "prayer-to-st-rita": "Oración a Santa Rita", "prayer-to-st-patrick": "Coraza de San Patricio", "jesus-prayer": "Oración de Jesús", "evening-prayer": "Oración de la noche",
  "prayer-before-crucifix": "Oración ante el Crucifijo", "canticle-of-simeon": "Cántico de Simeón", "canticle-of-zechariah": "Benedictus", "armor-of-god": "La armadura de Dios",
  "advent-antiphons": "Antífonas de Adviento", "christmas-prayer": "Oración de Navidad", "easter-prayer": "Oración de Pascua", "lenten-prayer": "Oración de Cuaresma", "ave-regina-caelorum": "Ave Regina Caelorum", "alma-redemptoris-mater": "Alma Redemptoris Mater" };
for (const p of prayers) p.es.title = p.es.title || ES_TITLES[p.id] || p.en.title;
// Rosary-only prayers from the rosario package
const add = (id, group, key, titleEn, titleEs) => prayers.push({ id, group, en: { title: titleEn, text: split(ro.en.prayers[key]), note: "" }, es: { title: titleEs, text: split(ro.es.prayers[key]), note: "" }, ref: null });
if (!prayers.some((p) => p.id === "hail-holy-queen")) add("hail-holy-queen", "marian", "hailHolyQueen", "Hail, Holy Queen", "Dios te salve, Reina y Madre");
add("rosary-closing-prayer", "marian", "closingPrayer", "Closing Prayer of the Rosary", "Oración final del Rosario");
const REFS = { "our-father": "mat 6:9-13", "hail-mary": "luk 1:28-42", magnificat: "luk 1:46-55", "canticle-of-simeon": "luk 2:29-32", "canticle-of-zechariah": "luk 1:68-79", "armor-of-god": "eph 6:10-18" };
for (const p of prayers) p.ref = REFS[p.id] || null;

const MREF = { annunciation: "luk 1:26-38", visitation: "luk 1:39-56", nativity: "luk 2:1-20", presentation: "luk 2:22-38", findingInTemple: "luk 2:41-52",
  baptism: "mat 3:13-17", weddingAtCana: "jhn 2:1-11", proclaimingKingdom: "mrk 1:14-15", transfiguration: "mat 17:1-8", institutionEucharist: "luk 22:14-20",
  agonyInGarden: "luk 22:39-46", scourgingAtPillar: "jhn 19:1", crowningWithThorns: "mat 27:27-31", carryingCross: "jhn 19:16-17", crucifixion: "luk 23:33-46",
  resurrection: "mat 28:1-10", ascension: "act 1:6-11", descentHolySpirit: "act 2:1-4", assumption: "rev 12:1", coronation: "rev 12:1-5" };
const FRUIT = { annunciation: ["Humility", "Humildad"], visitation: ["Love of neighbor", "Amor al prójimo"], nativity: ["Poverty of spirit", "Pobreza de espíritu"], presentation: ["Obedience", "Obediencia"], findingInTemple: ["Joy in finding Jesus", "Alegría de encontrar a Jesús"],
  baptism: ["Openness to the Holy Spirit", "Docilidad al Espíritu Santo"], weddingAtCana: ["To Jesus through Mary", "A Jesús por María"], proclaimingKingdom: ["Repentance and trust", "Conversión y confianza"], transfiguration: ["Desire for holiness", "Deseo de santidad"], institutionEucharist: ["Adoration", "Adoración"],
  agonyInGarden: ["Sorrow for sin", "Dolor de los pecados"], scourgingAtPillar: ["Purity", "Pureza"], crowningWithThorns: ["Courage", "Valentía"], carryingCross: ["Patience", "Paciencia"], crucifixion: ["Perseverance", "Perseverancia"],
  resurrection: ["Faith", "Fe"], ascension: ["Hope", "Esperanza"], descentHolySpirit: ["Love of God", "Amor de Dios"], assumption: ["Grace of a happy death", "Gracia de una buena muerte"], coronation: ["Trust in Mary's intercession", "Confianza en la intercesión de María"] };
const SETS = { joyful: [["monday", "saturday"], "Joyful Mysteries", "Misterios Gozosos"], luminous: [["thursday"], "Luminous Mysteries", "Misterios Luminosos"],
  sorrowful: [["tuesday", "friday"], "Sorrowful Mysteries", "Misterios Dolorosos"], glorious: [["wednesday", "sunday"], "Glorious Mysteries", "Misterios Gloriosos"] };
const mysteries = {};
for (const [k, [days, en, es]] of Object.entries(SETS))
  mysteries[k] = { days, en, es, items: MYSTERIES[k].map((m) => ({ en: ro.en.mysteries[m], es: ro.es.mysteries[m], ref: MREF[m], fruit: { en: FRUIT[m][0], es: FRUIT[m][1] } })) };
const rosary = {
  intro: { en: "The Rosary walks through the life of Jesus with Mary. Each decade is one Our Father, ten Hail Marys and a Glory Be while you reflect on a mystery. It takes about 20 minutes.",
           es: "El Rosario recorre la vida de Jesús junto a María. Cada decena es un Padre Nuestro, diez Avemarías y un Gloria mientras meditas un misterio. Dura unos 20 minutos." },
  sundayNote: { en: "Many pray the Joyful Mysteries on Sundays of Advent and Christmas, and the Sorrowful Mysteries on Sundays of Lent.", es: "Muchos rezan los Misterios Gozosos los domingos de Adviento y Navidad, y los Dolorosos los domingos de Cuaresma." },
  sequence: [{ step: "sign-of-the-cross" }, { step: "apostles-creed", bead: "cross" }, { step: "our-father", bead: "large" },
    { step: "hail-mary", bead: "small", count: 3, intention: { en: "For an increase of faith, hope and charity", es: "Por el aumento de la fe, la esperanza y la caridad" } }, { step: "glory-be" },
    { step: "decade" }, { step: "decade" }, { step: "decade" }, { step: "decade" }, { step: "decade" },
    { step: "hail-holy-queen" }, { step: "rosary-closing-prayer" }, { step: "sign-of-the-cross" }],
  decade: [{ step: "announce-mystery" }, { step: "our-father", bead: "large" }, { step: "hail-mary", bead: "small", count: 10 }, { step: "glory-be" }, { step: "fatima-prayer" }],
  mysteries,
};
const chaplet = {
  intro: { en: "The Chaplet of Divine Mercy is prayed on ordinary rosary beads and takes about 10 minutes. Many pray it at 3 p.m., the hour of Jesus' death.",
           es: "La Coronilla de la Divina Misericordia se reza con un rosario común y dura unos 10 minutos. Muchos la rezan a las 3 de la tarde, la hora de la muerte de Jesús." },
  source: { en: "From the Diary of St. Faustina Kowalska (1930s). The Sunday after Easter is Divine Mercy Sunday.", es: "Del Diario de Santa Faustina Kowalska (década de 1930). El domingo después de Pascua es el Domingo de la Divina Misericordia." },
  sequence: [{ step: "sign-of-the-cross" }, ...(prayers.some((p) => p.id === "divine-mercy-opening-prayer") ? [{ step: "divine-mercy-opening-prayer" }] : []),
    { step: "our-father", bead: "large" }, { step: "hail-mary", bead: "small" }, { step: "apostles-creed", bead: "cross" },
    { step: "decade" }, { step: "decade" }, { step: "decade" }, { step: "decade" }, { step: "decade" },
    { step: "holy-god", count: 3 }, ...(prayers.some((p) => p.id === "divine-mercy-closing-prayer") ? [{ step: "divine-mercy-closing-prayer" }] : []), { step: "sign-of-the-cross" }],
  decade: [{ step: "eternal-father", bead: "large" }, { step: "for-the-sake-of-his-sorrowful-passion", bead: "small", count: 10 }],
};
const ids = new Set(prayers.map((p) => p.id));
for (const st of [...rosary.sequence, ...rosary.decade, ...chaplet.sequence, ...chaplet.decade])
  if (!["decade", "announce-mystery"].includes(st.step) && !ids.has(st.step)) throw new Error("missing prayer " + st.step);
fs.writeFileSync(path.join(ROOT, "public/data/prayers.json"), JSON.stringify({ prayers, rosary, chaplet, credit: "Prayer texts: CodexCommunion prayer-collection; rosario (MIT)." }));
console.log(prayers.length, "prayers;", Object.values(mysteries).reduce((a, m) => a + m.items.length, 0), "mysteries");
