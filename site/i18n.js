/* Language toggle (English / Español). T(key) returns the UI string for the current language;
   L(obj) picks obj[lang] from bilingual content ({en, es}), falling back to English. */
(() => {
  "use strict";
  const STR = {
    en: {
      today: "Today", pray: "Pray", play: "Play", bible: "Bible", journeys: "Journeys", music: "Music", sacraments: "Sacraments", mass: "Find a Church",
      findPerson: "Find a person…", map: "Map", people: "People", books: "Books", games: "Games", back: "Back",
      footer: "Scripture: World English Bible, Catholic Edition (public domain). Teaching notes are study summaries; consult the Catechism of the Catholic Church for authoritative teaching.",
      scriptureEnglish: "",
      // today
      todayReadings: "Today's Mass readings", sundayReadings: "This Sunday's readings", firstReading: "First reading", psalm: "Responsorial Psalm", secondReading: "Second reading", gospel: "Gospel",
      peopleInReading: "People in this reading:", listen: "▶ Listen", stop: "■ Stop", saintOfDay: "Saint of the day", alsoToday: "Also today:", biblicalSaints: "Biblical saints celebrated today",
      personOfDay: "Person of the day", todaysGames: "Today's games", played: "✓ Played", playNow: "Play", continueJourney: "Continue your journey",
      readingsNote: "Readings follow the Lectionary for Mass (US). Verse numbers follow the World English Bible and can differ slightly from your missal.",
      unverified: "citation not yet verified, check your missal", reminders: "Daily reminder", reminderLede: "Get a reminder each day for the readings and today's puzzles.",
      reminderTime: "Time", addToCalendar: "Add to my calendar", reminderSet: "Daily reminder set for", reminderIcs: "A calendar file was created. Open it to add a daily reminder to your phone's calendar.",
      season: { ordinary: "Ordinary Time", advent: "Advent", christmas: "Christmas", lent: "Lent", triduum: "Easter Triduum", easter: "Easter" }, week: "week", colour: "liturgical colour",
      // pray
      prayers: "Prayers", rosary: "Rosary", chaplet: "Divine Mercy Chaplet", confession: "Confession", theMass: "The Mass",
      prayLede: "The prayers every Catholic knows, a guided Rosary and Divine Mercy Chaplet, a gentle guide to Confession, and the Mass explained step by step.",
      group: { essential: "Essential prayers", marian: "Prayers to Mary", daily: "Daily prayers", saints: "Saints and angels", eucharist: "The Eucharist", sorrow: "Sorrow and the dead" },
      startRosary: "Pray the Rosary", startChaplet: "Pray the Chaplet", todaysMysteries: "Today's mysteries", next: "Next", prev: "Back", restart: "Start over", decade: "Decade",
      of: "of", done: "Amen. You've finished.", tapToContinue: "Tap Next after each prayer.", mystery: "Mystery", fruit: "Fruit", chooseMysteries: "Choose mysteries",
      examination: "Examination of conscience", forWhom: "For", howToConfess: "How to go to Confession", faq: "Common questions", tips: "Good to know",
      posture: { stand: "Stand", sit: "Sit", kneel: "Kneel" }, youSay: "You", why: "Why",
      // games
      playLede: "new puzzles every day", progress: "Your progress", opened: "You've opened", ofPeople: "people", streak: "Streak", share: "Share result", copied: "Copied",
      // sacraments / music / mass
      sacTitle: "Sacraments: what you'll need", musicTitle: "Music at Mass", findMassTitle: "Find a Mass",
      contentEnglish: "Some content on this page is available only in English for now.",
      chapletShort: "Chaplet",
      mapTitle: "Everyone in the Catholic Bible, and how they connect",
      mapLede: "Each dot is a person, placed left to right by era, from Adam to the Apostolic Church. Lines are family ties and other links. Tap a person to see their family, every passage they appear in, and what the Church teaches about them.",
      canonTitle: "Who appears where",
      canonLede: "The 73 books of the Catholic canon run across the top. Each row is a person; the dot shows how many verses mention them in that book. Tap a row to open the person.",
      filterPeople: "Filter by name or role",
      panel: { family: "Family", parents: "Parents", siblings: "Siblings", spouses: "Spouses", children: "Children", connections: "Connections", across: "Across the books", catholic: "In Catholic teaching", know: "What to know", key: "Key passages", every: "Every passage that names", feast: "Feast", alias: "Also called", correction: "Suggest a correction" },
    },
    es: {
      today: "Hoy", pray: "Orar", play: "Jugar", bible: "Biblia", journeys: "Caminos", music: "Música", sacraments: "Sacramentos", mass: "Buscar Iglesia",
      findPerson: "Buscar una persona…", map: "Mapa", people: "Personas", books: "Libros", games: "Juegos", back: "Volver",
      footer: "Escritura: World English Bible, edición católica (dominio público; en inglés). Las notas son resúmenes de estudio; consulte el Catecismo de la Iglesia Católica para la enseñanza autorizada.",
      scriptureEnglish: "Los textos bíblicos se muestran en inglés por ahora.",
      todayReadings: "Lecturas de la Misa de hoy", sundayReadings: "Lecturas de este domingo", firstReading: "Primera lectura", psalm: "Salmo responsorial", secondReading: "Segunda lectura", gospel: "Evangelio",
      peopleInReading: "Personas en esta lectura:", listen: "▶ Escuchar", stop: "■ Detener", saintOfDay: "Santo del día", alsoToday: "También hoy:", biblicalSaints: "Santos bíblicos que se celebran hoy",
      personOfDay: "Personaje del día", todaysGames: "Juegos de hoy", played: "✓ Jugado", playNow: "Jugar", continueJourney: "Continúa tu camino",
      readingsNote: "Las lecturas siguen el Leccionario de la Misa (EE. UU.). La numeración de versículos sigue la World English Bible y puede variar un poco respecto a su misal.",
      unverified: "cita aún no verificada; revise su misal", reminders: "Recordatorio diario", reminderLede: "Recibe un recordatorio cada día para las lecturas y los juegos.",
      reminderTime: "Hora", addToCalendar: "Agregar a mi calendario", reminderSet: "Recordatorio diario a las", reminderIcs: "Se creó un archivo de calendario. Ábrelo para agregar un recordatorio diario al calendario de tu teléfono.",
      season: { ordinary: "Tiempo Ordinario", advent: "Adviento", christmas: "Navidad", lent: "Cuaresma", triduum: "Triduo Pascual", easter: "Pascua" }, week: "semana", colour: "color litúrgico",
      prayers: "Oraciones", rosary: "Rosario", chaplet: "Coronilla de la Divina Misericordia", confession: "Confesión", theMass: "La Misa",
      prayLede: "Las oraciones que todo católico conoce, el Rosario y la Coronilla guiados, una guía sencilla para confesarse y la Misa explicada paso a paso.",
      group: { essential: "Oraciones básicas", marian: "Oraciones a María", daily: "Oraciones diarias", saints: "Santos y ángeles", eucharist: "La Eucaristía", sorrow: "Arrepentimiento y difuntos" },
      startRosary: "Rezar el Rosario", startChaplet: "Rezar la Coronilla", todaysMysteries: "Misterios de hoy", next: "Siguiente", prev: "Atrás", restart: "Empezar de nuevo", decade: "Decena",
      of: "de", done: "Amén. Has terminado.", tapToContinue: "Toca Siguiente después de cada oración.", mystery: "Misterio", fruit: "Fruto", chooseMysteries: "Elegir misterios",
      examination: "Examen de conciencia", forWhom: "Para", howToConfess: "Cómo confesarse", faq: "Preguntas frecuentes", tips: "Para saber",
      posture: { stand: "De pie", sit: "Sentados", kneel: "De rodillas" }, youSay: "Tú", why: "Por qué",
      playLede: "nuevos juegos cada día", progress: "Tu progreso", opened: "Has abierto", ofPeople: "personas", streak: "Racha", share: "Compartir resultado", copied: "Copiado",
      sacTitle: "Sacramentos: lo que necesitas", musicTitle: "Música en la Misa", findMassTitle: "Buscar Misa",
      contentEnglish: "Parte del contenido de esta página está disponible solo en inglés por ahora.",
      chapletShort: "Coronilla",
      mapTitle: "Todas las personas de la Biblia católica y cómo se relacionan",
      mapLede: "Cada punto es una persona, ordenada de izquierda a derecha por época, desde Adán hasta la Iglesia apostólica. Las líneas son lazos familiares y otras relaciones. Toca una persona para ver su familia, cada pasaje donde aparece y lo que enseña la Iglesia. (Las fichas de personajes están en inglés por ahora.)",
      canonTitle: "Quién aparece dónde",
      canonLede: "Los 73 libros del canon católico aparecen arriba. Cada fila es una persona; el punto muestra cuántos versículos la mencionan en ese libro. Toca una fila para abrir la persona.",
      filterPeople: "Filtrar por nombre o función",
      panel: { family: "Familia", parents: "Padres", siblings: "Hermanos", spouses: "Cónyuges", children: "Hijos", connections: "Relaciones", across: "En los libros", catholic: "En la enseñanza católica", know: "Para saber", key: "Pasajes clave", every: "Todos los pasajes que nombran a", feast: "Fiesta", alias: "También llamado", correction: "Sugerir una corrección" },
      colours: { green: "verde", violet: "morado", white: "blanco", red: "rojo", rose: "rosa", black: "negro" },
      books: { gen: "Génesis", exo: "Éxodo", lev: "Levítico", num: "Números", deu: "Deuteronomio", jos: "Josué", jdg: "Jueces", rut: "Rut", "1sa": "1 Samuel", "2sa": "2 Samuel", "1ki": "1 Reyes", "2ki": "2 Reyes", "1ch": "1 Crónicas", "2ch": "2 Crónicas", ezr: "Esdras", neh: "Nehemías", tob: "Tobías", jdt: "Judit", est: "Ester", "1ma": "1 Macabeos", "2ma": "2 Macabeos", job: "Job", psa: "Salmos", pro: "Proverbios", ecc: "Eclesiastés", sng: "Cantar de los Cantares", wis: "Sabiduría", sir: "Eclesiástico (Sirácida)", isa: "Isaías", jer: "Jeremías", lam: "Lamentaciones", bar: "Baruc", ezk: "Ezequiel", dan: "Daniel", hos: "Oseas", jol: "Joel", amo: "Amós", oba: "Abdías", jon: "Jonás", mic: "Miqueas", nam: "Nahúm", hab: "Habacuc", zep: "Sofonías", hag: "Ageo", zec: "Zacarías", mal: "Malaquías", mat: "Mateo", mrk: "Marcos", luk: "Lucas", jhn: "Juan", act: "Hechos", rom: "Romanos", "1co": "1 Corintios", "2co": "2 Corintios", gal: "Gálatas", eph: "Efesios", php: "Filipenses", col: "Colosenses", "1th": "1 Tesalonicenses", "2th": "2 Tesalonicenses", "1ti": "1 Timoteo", "2ti": "2 Timoteo", tit: "Tito", phm: "Filemón", heb: "Hebreos", jas: "Santiago", "1pe": "1 Pedro", "2pe": "2 Pedro", "1jn": "1 Juan", "2jn": "2 Juan", "3jn": "3 Juan", jud: "Judas", rev: "Apocalipsis" },
    },
  };
  let lang = "en";
  try { lang = localStorage.getItem("bpm.lang") || (navigator.language || "").toLowerCase().startsWith("es") && "es" || "en"; } catch { /* default */ }
  if (!STR[lang]) lang = "en";
  const listeners = [];
  const I18N = {
    get lang() { return lang; },
    T(key) { return key.split(".").reduce((o, k) => o?.[k], STR[lang]) ?? key.split(".").reduce((o, k) => o?.[k], STR.en) ?? key; },
    L(obj) { if (obj == null) return ""; if (typeof obj === "string") return obj; return obj[lang] ?? obj.en ?? ""; },
    set(l) {
      if (!STR[l] || l === lang) return;
      lang = l;
      try { localStorage.setItem("bpm.lang", l); } catch { /* storage unavailable */ }
      apply(); listeners.forEach((f) => f(l));
    },
    on(f) { listeners.push(f); },
    locale() { return lang === "es" ? "es-US" : "en-US"; },
  };
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = I18N.T(el.dataset.t); });
    document.querySelectorAll("[data-t-ph]").forEach((el) => { el.placeholder = I18N.T(el.dataset.tPh); });
    document.querySelectorAll(".langtog button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  }
  window.I18N = I18N;
  document.addEventListener("DOMContentLoaded", apply);
  if (document.readyState !== "loading") apply();
})();
