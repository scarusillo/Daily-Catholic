// Build public/data/prayers.json from two openly licensed prayer packages
// (data/vendor/prayer-collection: CodexCommunion license, free use; data/vendor/rosario: MIT)
// plus the Rosary/Chaplet structure, mystery Scripture refs and fruits defined here, and the guided
// devotions (one decade, Angelus / Regina Caeli, Daily Examen, Stations of the Cross).
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
// ---------- guided devotions: one decade, Angelus / Regina Caeli, Examen, Stations of the Cross ----------
// A guided step is either { step: "<prayer id>" } or a card of its own:
// { title, eyebrow, vr: [{ v, r }], pray: "<prayer id>", body, say, text, ref, note, bead }, every text field bilingual.
const B = (en, es) => ({ en, es });
rosary.single = [{ step: "sign-of-the-cross" }, { step: "decade" }, { step: "sign-of-the-cross" }];
rosary.singleIntro = B("One decade of the Rosary: a single mystery, one Our Father, ten Hail Marys and a Glory Be. It takes about four minutes.",
  "Un misterio del Rosario: un Padre Nuestro, diez Avemarías y un Gloria mientras meditas un solo misterio. Dura unos cuatro minutos.");

// The Angelus: versicles and collect straight from the vendored package (traditional text).
const ang = JSON.parse(fs.readFileSync(path.join(PC, "angelus.json")));
const angParts = (lang) => {
  const out = [];
  for (const c of ang.translations[lang].content) {
    if (c.type === "prayer-reference") { out[out.length - 1].pray = c.value; continue; }
    const ls = split(c.value), cur = { vr: [], text: [] };
    for (const l of ls) {
      if (/^V\.\s/.test(l)) cur.vr.push({ v: l.replace(/^V\.\s*/, ""), r: "" });
      else if (/^R\.\s/.test(l)) cur.vr[cur.vr.length - 1].r = l.replace(/^R\.\s*/, "");
      else cur.text.push(l);
    }
    out.push(cur);
  }
  return out;
};
const aEn = angParts("en"), aEs = angParts("es");
if (aEn.length !== 4 || aEs.length !== 4) throw new Error("unexpected Angelus structure");
const letUs = (t, re) => { const m = t.match(re); return m ? [m[1].trim(), t.slice(m[0].length).trim()] : [null, t]; };
const angelus = {
  title: B("The Angelus", "El Ángelus"),
  intro: B("The Angelus recalls the moment the Son of God became man. It is traditionally prayed at 6 in the morning, at noon and at 6 in the evening, often when the church bells ring. It takes about two minutes.",
    "El Ángelus recuerda el momento en que el Hijo de Dios se hizo hombre. Por tradición se reza a las 6 de la mañana, al mediodía y a las 6 de la tarde, muchas veces al toque de las campanas. Dura unos dos minutos."),
  note: B("During the Easter season the Regina Caeli is prayed in place of the Angelus.", "En el tiempo de Pascua se reza el Regina Caeli en lugar del Ángelus."),
  steps: aEn.map((p, i) => {
    const [, bodyEn] = letUs(p.text.join(" "), /^(Let us pray):\s*/), [, bodyEs] = letUs(aEs[i].text.join(" "), /^(Oremos):\s*/);
    return { vr: p.vr.map((x, j) => ({ v: B(x.v, aEs[i].vr[j].v), r: B(x.r, aEs[i].vr[j].r) })), ...(p.pray ? { pray: p.pray } : {}),
      ...(p.text.length ? { lead: B("Let us pray.", "Oremos."), text: B([bodyEn], [bodyEs]) } : {}), bead: p.pray ? "small" : "large" };
  }),
};
const HM = B("Hail Mary…", "Dios te salve, María…");
prayers.push({ id: "angelus", group: "marian", guided: "angelus", ref: null,
  ...Object.fromEntries(["en", "es"].map((l) => [l, { title: angelus.title[l],
    text: angelus.steps.flatMap((s) => [...s.vr.flatMap((x) => [`V. ${x.v[l]}`, `R. ${x.r[l]}`]), ...(s.pray ? [HM[l]] : []), ...(s.text ? [`${s.lead[l]} ${s.text[l][0]}`] : [])]),
    note: l === "en" ? "Prayed morning, noon and evening in memory of the Incarnation" : "Se reza por la mañana, al mediodía y al atardecer en memoria de la Encarnación" }])) });

// Regina Caeli (Eastertide): the vendored antiphon as versicle and response, then the traditional versicle and collect.
const reginaCaeli = {
  title: B("Regina Caeli", "Regina Caeli"),
  intro: B("From Easter to Pentecost the Church greets Mary with the Regina Caeli, rejoicing with her that her Son is risen. It takes about a minute.",
    "Desde Pascua hasta Pentecostés la Iglesia saluda a María con el Regina Caeli, alegrándose con ella porque su Hijo ha resucitado. Dura cerca de un minuto."),
  steps: [
    { bead: "small", vr: [
      { v: B("Queen of heaven, rejoice, alleluia.", "Reina del cielo, alégrate, aleluya."), r: B("For He whom you did merit to bear, alleluia.", "Porque el que mereciste llevar, aleluya.") },
      { v: B("Has risen, as He said, alleluia.", "Ha resucitado como dijo, aleluya."), r: B("Pray for us to God, alleluia.", "Ruega por nosotros a Dios, aleluya.") }] },
    { bead: "small", vr: [{ v: B("Rejoice and be glad, O Virgin Mary, alleluia.", "Gózate y alégrate, Virgen María, aleluya."), r: B("For the Lord has truly risen, alleluia.", "Porque verdaderamente ha resucitado el Señor, aleluya.") }] },
    { bead: "large", lead: B("Let us pray.", "Oremos."), text: B(
      ["O God, who gave joy to the world through the resurrection of Thy Son, our Lord Jesus Christ, grant, we beseech Thee, that through the intercession of the Virgin Mary, His Mother, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen."],
      ["Oh Dios, que por la resurrección de tu Hijo, nuestro Señor Jesucristo, has llenado el mundo de alegría, concédenos, por intercesión de su Madre, la Virgen María, llegar a alcanzar los gozos eternos. Por Jesucristo nuestro Señor. Amén."]) },
  ],
};
{
  const rc = prayers.find((p) => p.id === "regina-caeli");
  const en = reginaCaeli.steps[0].vr.map((x) => `${x.v.en} ${x.r.en}`).join(" "), es = reginaCaeli.steps[0].vr.map((x) => `${x.v.es} ${x.r.es}`).join(" ");
  const same = (a, b) => a.replace(/[.:,]/g, "") === b.replace(/[.:,]/g, "");
  if (!rc || !same(rc.en.text.join(" "), en) || !same(rc.es.text.join(" "), es)) throw new Error("Regina Caeli antiphon no longer matches the vendored text");
  rc.guided = "angelus:regina";
}

// Daily Examen: the five Ignatian movements, in this app's own words.
const examen = {
  title: B("Daily Examen", "Examen diario"),
  intro: B("The Examen is a short prayer for the end of the day, taught by St. Ignatius of Loyola. In five steps you look back over your day with God. It takes about five minutes.",
    "El Examen es una oración breve para el final del día, enseñada por san Ignacio de Loyola. En cinco pasos repasas tu día junto a Dios. Dura unos cinco minutos."),
  steps: [
    { title: B("Give thanks", "Da gracias"),
      body: B("Be still for a moment; you are in God's presence. Think of the good things of this day, large and small: a person, a meal, a moment of peace. Thank him for each one.",
        "Quédate en silencio un momento; estás en la presencia de Dios. Piensa en las cosas buenas de este día, grandes y pequeñas: una persona, una comida, un momento de paz. Dale gracias por cada una."),
      say: B("Thank you, Lord, for everything you gave me today.", "Gracias, Señor, por todo lo que hoy me diste.") },
    { title: B("Ask for light", "Pide luz"),
      body: B("Ask the Holy Spirit to help you see your day as God sees it, honestly and without fear.", "Pídele al Espíritu Santo que te ayude a ver tu día como Dios lo ve, con sinceridad y sin miedo."),
      say: B("Come, Holy Spirit. Show me my day through your eyes.", "Ven, Espíritu Santo. Muéstrame mi día con tus ojos.") },
    { title: B("Review the day", "Repasa tu día"),
      body: B("Walk slowly through the day, from the morning until now. Where did you feel close to God, at peace, or able to love? Where did you feel far from him, impatient, or thinking only of yourself? Simply notice, with him beside you.",
        "Recorre el día con calma, desde la mañana hasta ahora. ¿Dónde te sentiste cerca de Dios, en paz o capaz de amar? ¿Dónde te sentiste lejos de él, con impaciencia o pensando solo en ti? Solo obsérvalo, con él a tu lado."),
      say: B("Lord, you were with me in every hour.", "Señor, estuviste conmigo en cada hora.") },
    { title: B("Ask forgiveness", "Pide perdón"),
      body: B("Tell God you are sorry for the times you did not love today, in what you did and in what you left undone. Trust in his mercy; he is always ready to forgive. If something serious weighs on you, plan to bring it to Confession.",
        "Dile a Dios que te arrepientes de las veces en que hoy no amaste, por lo que hiciste y por lo que dejaste de hacer. Confía en su misericordia; él siempre está dispuesto a perdonar. Si algo grave te pesa, proponte llevarlo a la Confesión."),
      say: B("Forgive me, Lord, and heal what I have hurt.", "Perdóname, Señor, y sana lo que he herido.") },
    { title: B("Look to tomorrow", "Mira hacia mañana"),
      body: B("Look ahead to tomorrow. What will you need: patience, courage, a kind word for someone? Choose one small thing you will do better, and ask for the grace to do it.",
        "Mira hacia el día de mañana. ¿Qué vas a necesitar: paciencia, valor, una palabra amable para alguien? Elige una cosa pequeña que quieras hacer mejor y pide la gracia para lograrlo."),
      say: B("Lord, stay with me tomorrow. Help me to love you more.", "Señor, quédate conmigo mañana. Ayúdame a amarte más.") },
  ],
  close: "our-father",
};

// Stations of the Cross: the fourteen traditional stations. Meditations are this app's own wording.
// ref: null marks a station handed down by tradition rather than recorded in the Gospels.
const ST = [
  ["Jesus is condemned to death", "Jesús es condenado a muerte", "mat 27:22-26",
    "Pilate knows Jesus is innocent, yet he gives in to the crowd. Jesus does not defend himself and accepts the sentence out of love for us. Lord, give me the courage to stand for what is right, even when it costs me.",
    "Pilato sabe que Jesús es inocente, pero cede ante la multitud. Jesús no se defiende y acepta la sentencia por amor a nosotros. Señor, dame valor para defender lo que es justo, aunque me cueste."],
  ["Jesus takes up his Cross", "Jesús carga con la cruz", "jhn 19:16-17",
    "The heavy wood is laid on Jesus' shoulders, and he does not refuse it. He willingly carries the weight of our sins. Lord, help me to take up my own cross each day and follow you.",
    "Ponen el pesado madero sobre los hombros de Jesús, y él no lo rechaza. Carga voluntariamente con el peso de nuestros pecados. Señor, ayúdame a tomar mi cruz de cada día y a seguirte."],
  ["Jesus falls the first time", "Jesús cae por primera vez", null,
    "Weak from the scourging, Jesus falls under the weight of the cross. The Son of God knows what it is to have no strength left. Lord, when I fall, help me to get up again and keep walking with you.",
    "Debilitado por los azotes, Jesús cae bajo el peso de la cruz. El Hijo de Dios sabe lo que es quedarse sin fuerzas. Señor, cuando yo caiga, ayúdame a levantarme y a seguir caminando contigo."],
  ["Jesus meets his Mother", "Jesús encuentra a su Madre", null,
    "Mary cannot take the cross from her Son, but she does not leave him. Their eyes meet, and the sword that Simeon foretold pierces her heart. Mary, stay close to me and to all who suffer.",
    "María no puede quitarle la cruz a su Hijo, pero no lo abandona. Sus miradas se encuentran, y la espada que anunció Simeón le atraviesa el corazón. María, quédate cerca de mí y de todos los que sufren."],
  ["Simon of Cyrene helps Jesus carry the Cross", "Simón de Cirene ayuda a Jesús a llevar la cruz", "mrk 15:21",
    "The soldiers pull Simon out of the crowd and make him carry the cross behind Jesus. He did not choose this burden, yet it brought him close to the Lord. Lord, let me see you today in those who need my help.",
    "Los soldados sacan a Simón de entre la gente y lo obligan a llevar la cruz detrás de Jesús. Él no eligió esa carga, pero ella lo acercó al Señor. Señor, que hoy te reconozca en quienes necesitan mi ayuda."],
  ["Veronica wipes the face of Jesus", "La Verónica limpia el rostro de Jesús", null,
    "A woman steps out of the crowd and gently wipes the blood and sweat from Jesus' face. It is a small act, but she does not let fear stop her. Lord, teach me to do the small kindness that is in front of me.",
    "Una mujer sale de entre la multitud y limpia con ternura la sangre y el sudor del rostro de Jesús. Es un gesto pequeño, pero ella no deja que el miedo la detenga. Señor, enséñame a hacer el pequeño bien que tengo delante."],
  ["Jesus falls the second time", "Jesús cae por segunda vez", null,
    "Jesus falls again, and again he rises. He will not turn back from the road that leads to our salvation. Lord, when I fall into the same sins, do not let me lose heart; lift me up by your mercy.",
    "Jesús cae de nuevo, y de nuevo se levanta. No abandona el camino que lleva a nuestra salvación. Señor, cuando vuelva a caer en los mismos pecados, no dejes que me desanime; levántame con tu misericordia."],
  ["Jesus meets the women of Jerusalem", "Jesús consuela a las mujeres de Jerusalén", "luk 23:27-31",
    "Even in his pain, Jesus stops to speak to the women who weep for him. He tells them to weep for themselves and for their children, calling them back to God. Lord, give me true sorrow for my sins and a heart that turns to you.",
    "Aun en medio de su dolor, Jesús se detiene a hablar con las mujeres que lloran por él. Les pide que lloren por ellas y por sus hijos, y las llama a volver a Dios. Señor, dame un verdadero dolor de mis pecados y un corazón que se vuelva a ti."],
  ["Jesus falls the third time", "Jesús cae por tercera vez", null,
    "Near the top of the hill, Jesus falls a third time, completely spent. Still he gets up, to finish the work the Father gave him to do. Lord, when I have no strength left and want to give up, give me your strength to go on.",
    "Cerca de la cima, Jesús cae por tercera vez, completamente agotado. Aun así se levanta, para cumplir hasta el final la obra que el Padre le encomendó. Señor, cuando ya no tenga fuerzas y quiera rendirme, dame tu fuerza para seguir."],
  ["Jesus is stripped of his garments", "Jesús es despojado de sus vestiduras", "jhn 19:23-24",
    "The soldiers take Jesus' clothes and cast lots for his tunic. He through whom all things were made is left with nothing. Lord, free my heart from clinging to things, and clothe me with your grace.",
    "Los soldados le quitan la ropa a Jesús y echan a suertes su túnica. Aquel por quien todo fue hecho se queda sin nada. Señor, libra mi corazón del apego a las cosas y revísteme de tu gracia."],
  ["Jesus is nailed to the Cross", "Jesús es clavado en la cruz", "luk 23:33-34",
    "Nails are driven through the hands that healed the sick and blessed the children. And Jesus prays for those who crucify him: “Father, forgive them.” Lord, teach me to forgive as you forgive.",
    "Los clavos atraviesan las manos que sanaron a los enfermos y bendijeron a los niños. Y Jesús reza por quienes lo crucifican: «Padre, perdónalos». Señor, enséñame a perdonar como tú perdonas."],
  ["Jesus dies on the Cross", "Jesús muere en la cruz", "luk 23:44-46",
    "After three hours on the cross, Jesus gives his spirit into the Father's hands and dies. No one has greater love than this: he has laid down his life for us. Stay a moment in silence. Lord Jesus, thank you for dying for me.",
    "Después de tres horas en la cruz, Jesús entrega su espíritu en las manos del Padre y muere. Nadie tiene amor más grande: ha dado la vida por nosotros. Quédate un momento en silencio. Señor Jesús, gracias por morir por mí."],
  ["Jesus is taken down from the Cross", "Jesús es bajado de la cruz", "luk 23:50-53",
    "Joseph of Arimathea takes the body of Jesus down from the cross, and by long tradition it is laid in the arms of his Mother. Mary holds the Son she once cradled in Bethlehem. Mary, pray for us, and comfort all who mourn.",
    "José de Arimatea baja de la cruz el cuerpo de Jesús y, según una antigua tradición, lo ponen en brazos de su Madre. María sostiene al Hijo que un día acunó en Belén. María, ruega por nosotros y consuela a todos los que lloran."],
  ["Jesus is laid in the tomb", "Jesús es colocado en el sepulcro", "mat 27:59-61",
    "The body of Jesus is wrapped in a linen cloth and laid in a new tomb, and a great stone is rolled across the entrance. All seems lost, but the grave will not hold him. Lord, in my darkest hours keep alive in me the hope of your Resurrection.",
    "Envuelven el cuerpo de Jesús en una sábana y lo ponen en un sepulcro nuevo, y hacen rodar una gran piedra a la entrada. Todo parece perdido, pero el sepulcro no podrá retenerlo. Señor, en mis horas más oscuras mantén viva en mí la esperanza de tu Resurrección."],
];
const stations = {
  title: B("Stations of the Cross", "Vía Crucis"),
  intro: B("The Stations of the Cross follow Jesus step by step from his condemnation to the tomb. Catholics pray them especially on Fridays and during Lent. It takes about 20 minutes.",
    "El Vía Crucis acompaña a Jesús paso a paso, desde su condena hasta el sepulcro. Los católicos lo rezamos especialmente los viernes y durante la Cuaresma. Dura unos 20 minutos."),
  note: B("Stations 3, 4, 6, 7 and 9 are not recorded in the Gospels; they come to us from the Church's long tradition of walking the Way of the Cross in Jerusalem.",
    "Las estaciones 3, 4, 6, 7 y 9 no aparecen en los Evangelios; nos llegan por la larga tradición de la Iglesia de recorrer el camino de la cruz en Jerusalén."),
  versicle: { v: B("We adore you, O Christ, and we praise you.", "Te adoramos, oh Cristo, y te bendecimos."), r: B("Because by your holy cross you have redeemed the world.", "Que por tu santa cruz redimiste al mundo.") },
  traditionNote: B("This station comes to us from tradition.", "Esta estación nos llega por la tradición."),
  opening: { title: B("Opening prayer", "Oración inicial"), text: B(
    ["Lord Jesus, I want to walk with you on the way of the Cross. Open my heart to see how much you love me, and give me true sorrow for my sins. Amen."],
    ["Señor Jesús, quiero acompañarte en el camino de la cruz. Abre mi corazón para ver cuánto me amas y dame un verdadero dolor de mis pecados. Amén."]) },
  closing: { title: B("Closing prayer", "Oración final"), text: B(
    ["Lord Jesus Christ, you gave your life for me on the Cross. May I never forget your love. Help me to carry my cross each day, and bring me at last to the joy of your Resurrection. Amen."],
    ["Señor Jesucristo, tú diste la vida por mí en la cruz. Que nunca olvide tu amor. Ayúdame a cargar mi cruz de cada día y llévame un día a la alegría de tu Resurrección. Amén."]) },
  after: ["our-father", "hail-mary", "glory-be"],
  items: ST.map(([en, es, ref, men, mes]) => ({ en, es, ref, meditation: B(men, mes) })),
};
prayers.push({ id: "stations-of-the-cross", group: "seasons", guided: "stations", ref: null,
  ...Object.fromEntries(["en", "es"].map((l) => [l, { title: stations.title[l],
    text: [`V. ${stations.versicle.v[l]}`, `R. ${stations.versicle.r[l]}`, ...stations.items.map((s, i) => `${i + 1}. ${s[l]}`)],
    note: l === "en" ? "Fourteen stations from Pilate's judgment to the tomb, prayed especially on Fridays and in Lent" : "Catorce estaciones, desde el juicio de Pilato hasta el sepulcro; se reza sobre todo los viernes y en Cuaresma" }])) });

const ids = new Set(prayers.map((p) => p.id));
for (const st of [...rosary.sequence, ...rosary.decade, ...rosary.single, ...chaplet.sequence, ...chaplet.decade])
  if (!["decade", "announce-mystery"].includes(st.step) && !ids.has(st.step)) throw new Error("missing prayer " + st.step);
for (const id of [...angelus.steps.map((s) => s.pray).filter(Boolean), examen.close, ...stations.after]) if (!ids.has(id)) throw new Error("missing prayer " + id);
// Editorial grouping and order (the source packages' categories put, for example, the Act of Faith under
// penitential prayers). Anything not listed keeps its source group and sorts after the listed ones.
const SHELF = {
  essential: ["sign-of-the-cross", "our-father", "hail-mary", "glory-be", "apostles-creed", "act-of-contrition", "act-of-faith", "act-of-hope", "act-of-love", "come-holy-spirit"],
  daily: ["morning-offering", "grace-before-meals", "grace-after-meals", "evening-prayer", "jesus-prayer", "prayer-of-st-francis", "canticle-of-zechariah", "canticle-of-simeon", "te-deum", "veni-creator-spiritus", "armor-of-god"],
  marian: ["memorare", "hail-holy-queen", "salve-regina", "magnificat", "angelus", "regina-caeli", "sub-tuum-praesidium", "fatima-prayer", "rosary-closing-prayer", "alma-redemptoris-mater", "ave-regina-caelorum", "litany-of-loreto"],
  eucharist: ["anima-christi", "prayer-before-crucifix", "litany-of-the-sacred-heart"],
  mercy: ["eternal-father", "for-the-sake-of-his-sorrowful-passion", "holy-god", "divine-mercy-closing-prayer"],
  saints: ["prayer-to-st-michael", "prayer-to-guardian-angel", "prayer-to-st-joseph", "prayer-to-st-anthony", "prayer-to-st-jude", "prayer-to-st-therese", "prayer-to-st-rita", "prayer-to-st-patrick", "chaplet-of-st-michael"],
  seasons: ["advent-antiphons", "christmas-prayer", "lenten-prayer", "stations-of-the-cross", "easter-prayer"],
  sorrow: ["confiteor", "eternal-rest", "prayer-for-the-dead"],
};
const shelf = {};
for (const [g, ids] of Object.entries(SHELF)) ids.forEach((id, i) => { shelf[id] = [g, i]; });
for (const p of prayers) if (shelf[p.id]) p.group = shelf[p.id][0];
prayers.sort((a, b) => (shelf[a.id]?.[1] ?? 99) - (shelf[b.id]?.[1] ?? 99));
fs.writeFileSync(path.join(ROOT, "public/data/prayers.json"), JSON.stringify({ prayers, rosary, chaplet, angelus, reginaCaeli, examen, stations, credit: "Prayer texts: CodexCommunion prayer-collection; rosario (MIT)." }));
console.log(prayers.length, "prayers;", Object.values(mysteries).reduce((a, m) => a + m.items.length, 0), "mysteries");
