/* Today (liturgical day, the Start today steps, readings and who's in them, saints, person of the day),
   the first-visit welcome, daily reminders, Journeys (guided reading plans) and the corrections inbox. */
(() => {
  "use strict";
  const C = () => window.BPM;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const COLOURS = { green: "#3c7a4a", violet: "#6b3fa0", white: "#d9cfa8", red: "#b3282d", rose: "#d97aa6", black: "#222" };
  const SEASON = { ordinary: "Ordinary Time", advent: "Advent", christmas: "Christmas", lent: "Lent", triduum: "Easter Triduum", easter: "Easter" };
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let CAL = null, READ = null, JOURNEYS = null, SAINTS = null, JES = null, BYDATE = null;
  const X = (en, es) => (window.I18N?.lang === "es" ? es : en);
  // Spanish overlay for journeys (titles, blurbs, step titles and reflections)
  const jx = (j) => { const o = window.I18N?.lang === "es" && JES?.[j.id]; return o ? { ...j, title: o.title || j.title, blurb: o.blurb || j.blurb, steps: j.steps.map((s, i) => ({ ...s, ...(o.steps?.[i] || {}) })) } : j; };

  /* feasts: "October 18" / "June 29 (Sts Peter and Paul); February 22 (...)" → people by month-day */
  function feastIndex() {
    const idx = {};
    for (const p of C().PEOPLE) {
      if (!p.feast) continue;
      const re = new RegExp(`(${MONTHS.join("|")})\\s+(\\d{1,2})|(\\d{1,2})\\s+(${MONTHS.join("|")})`, "gi");
      for (const m of p.feast.matchAll(re)) {
        const mon = MONTHS.indexOf((m[1] || m[4]).toLowerCase()) + 1, day = +(m[2] || m[3]);
        const k = `${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        (idx[k] ??= []).includes(p.id) || idx[k].push(p.id);
      }
    }
    return idx;
  }

  function peopleInRange(r) {
    const M = C().MENTIONS(), out = new Map();
    if (!M || !r) return [];
    for (const [id, books] of Object.entries(M)) {
      const s = books[r.b]; if (!s) continue;
      for (const cv of s.split(" ")) {
        const [c, v] = cv.split(":").map(Number);
        const after = c > r.c1 || (c === r.c1 && v >= r.v1), before = c < r.c2 || (c === r.c2 && v <= r.v2);
        if (after && before) { out.set(id, (out.get(id) || 0) + 1); }
      }
    }
    return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }

  const H = () => window.BPM_HABIT;
  const SITE = () => window.BPM_CONFIG?.siteUrl || "https://scarusillo.github.io/Daily-Catholic/";
  // the official text of a day's readings on the US bishops' site (the reading date as MMDDYY); the only outside link here
  const usccb = (dk) => `https://bible.usccb.org/${X("bible/readings", "es/bible/lecturas")}/${dk.slice(5, 7)}${dk.slice(8)}${dk.slice(2, 4)}.cfm`;
  const patronOf = (s) => window.I18N.L(s).patron || s.patron;
  // only people count as "saints met"; feasts of the Lord and other celebrations have cards too but are not collected
  const isSaint = (s) => !s.kind || s.kind === "saint" || s.kind === "mary";
  function saintCard(id, s) {
    const ctx = C(), L = (o) => window.I18N.L(o), P = ctx.P, who = (s.people || []).filter((x) => P[x]);
    return `<div class="saint"${isSaint(s) ? ` data-saint="${esc(id)}"` : ""}>
      <b>${esc(L(s).title || s.name)}</b>${s.years ? ` <span class="qmeta">${esc(s.years)}</span>` : ""}
      <p>${esc(L(s).bio)}</p>${L(s).quote ? `<blockquote>${esc(L(s).quote)}</blockquote>` : ""}${patronOf(s) ? `<p class="qmeta">${esc(patronOf(s))}</p>` : ""}
      ${who.length ? `<div class="chips">${who.map((x) => ctx.chip(x)).join("")}</div>` : ""}</div>`;
  }
  // a saint card counts as read once it has really been on screen
  function watchSaints(root) {
    const cards = root.querySelectorAll(".saint[data-saint]");
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { H()?.collect("saints", e.target.dataset.saint); io.unobserve(e.target); } }), { threshold: 0.35 });
    cards.forEach((c) => io.observe(c));
  }

  async function renderToday(root) {
    const ctx = C(), T = (k) => window.I18N.T(k), L = (o) => window.I18N.L(o), loc = window.I18N.locale();
    root.innerHTML = `<p class="loading">…</p>`;
    try {
      [CAL, READ, SAINTS] = await Promise.all([CAL || ctx.getJSON("data/calendar.json"), READ || ctx.getJSON("data/readings.json").catch(() => ({})),
        SAINTS || ctx.getJSON("data/saints.json").catch(() => ({}))]);
    } catch { CAL = CAL || {}; READ = READ || {}; SAINTS = SAINTS || {}; }
    // Don't hold the page for the Bible text (the largest download): draw now, fill passages in when it arrives.
    const ready = ctx.bibleReady();
    if (!ready) Promise.all([ctx.loadBible(), ctx.loadMentions()]).then(() => { if (root.isConnected && !root.hidden && !root.querySelector("details[open]")) renderToday(root); else root.querySelectorAll(".passage p").forEach((el) => { const r = ctx.parseRef(el.dataset.ref); if (r) el.innerHTML = ctx.verses(r).map((v) => `<sup>${v.v}</sup>${ctx.esc(v.t)}`).join(" "); }); }).catch(() => {});
    const now = new Date(), dk = dayKey(now), day = CAL[dk];
    const fi = feastIndex();
    const saints = fi[dk.slice(5)] || [];
    // today's own readings (Sunday/feast key, else weekday key); fall back to the coming Sunday
    const todayKeyR = day && (day[5] || day[6]);
    let rdate = todayKeyR && READ[todayKeyR] ? dk : null;
    if (!rdate) for (let i = 1; i < 8; i++) { const d = new Date(now); d.setDate(d.getDate() + i); const k = dayKey(d); if (CAL[k]?.[5] && READ[CAL[k][5]]) { rdate = k; break; } }
    const rday = rdate && CAL[rdate], rd = rday && READ[rday[5] || rday[6]];
    const P = ctx.P;
    const notable = ctx.PEOPLE.filter((p) => p.summary.length > 120 && p.mentions >= 10);
    const potd = notable[Math.floor((Date.parse(dk) / 864e5) * 7919) % notable.length];
    const cel = day?.[4] || [];
    const main = cel[0];
    const G = window.BPM_GAMES;
    // saint of the day: today's memorials/feasts with a write-up
    const sotd = cel.map((c) => c[3] && SAINTS[c[3]] ? { id: c[3], s: SAINTS[c[3]] } : null).filter(Boolean);
    const dateStr = now.toLocaleDateString(loc, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const celTitle = (c, dayRow = null) => (c[3] && SAINTS[c[3]] ? L(SAINTS[c[3]]).title || c[0] : esTitle(c[0], dayRow) || c[0]);
    // A day with no saint in the calendar still has a face: the saint remembered on this date. That file is
    // only fetched on such days, after the page is drawn, and the page is whole without it.
    let also = null;
    const alsoReady = sotd.length ? Promise.resolve() : (BYDATE ? Promise.resolve(BYDATE) : ctx.getJSON("data/saints_by_date.json")).then((d) => { BYDATE = d; also = d?.[dk.slice(5)] || null; }).catch(() => {});
    // tomorrow, for the line that closes the day: its saint or feast, and its game
    const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
    const tk = dayKey(tmr), trow = CAL[tk], tcel = trow?.[4] || [], tc = tcel.find((c) => c[3] && SAINTS[c[3]]) || tcel[0];
    const feat = G.featured(dk), playedN = G.GAMES.filter((g) => G.playedToday(g.id)).length;
    RIT = { dk, gospel: rd?.gospel || null, gospelDay: rdate, game: feat, potd, colour: COLOURS[main?.[1]] || "var(--gold)", also: alsoReady,
      saint: () => (sotd.find(({ s }) => isSaint(s)) || sotd[0] || (also ? { id: also.id, s: also, also: true } : null)),
      teaser: `${X("Tomorrow", "Mañana")}: ${[tc && celTitle(tc, trow), G.featured(tk).name].filter(Boolean).join(" · ")}` };
    root.innerHTML = `<div class="today">
      <section class="tband" style="--lit:${COLOURS[main?.[1]] || "var(--gold)"}">
        <div class="eyebrow">${esc(dateStr)}</div>
        <h1>${esc(main ? celTitle(main, day) : T("today"))}</h1>
        <p class="qmeta">${day ? `${esc(T("season." + day[0]))}${day[1] ? `, ${esc(T("week"))} ${day[1]}` : ""} · ${esc(T("colour"))}: ${esc(T("colours." + main?.[1]) !== "colours." + main?.[1] ? T("colours." + main?.[1]) : main?.[1] || "")}` : ""}</p>
        ${cel.slice(1).length ? `<p>${esc(T("alsoToday"))} ${cel.slice(1).map((c) => esc(celTitle(c))).join("; ")}</p>` : ""}
      </section>

      <section class="start" id="start"></section>
      ${ctx.store.get("bpm.welcomed", false) ? "" : `<section class="welcome" id="welcome"></section>`}

      <section class="tsec"><h2>${rdate === dk ? esc(T("todayReadings")) : `${esc(T("sundayReadings"))} · ${new Date(rdate + "T12:00").toLocaleDateString(loc, { month: "long", day: "numeric" })}`}</h2>
        ${rd ? `<p class="qmeta">${esc(rd.title ? L(rd.title) : celTitle(rday[4][0], rday))}${rd.confidence && rd.confidence !== "high" ? ` · ${esc(T("unverified"))}` : ""}</p>
          ${rd.note ? `<p>${esc(L(rd.note))}</p>` : ""}
          ${T("scriptureEnglish") ? `<p class="qmeta">${esc(T("scriptureEnglish"))}</p>` : ""}
          <div class="readings">${[["firstReading", rd.first], ["psalm", rd.psalm], ["secondReading", rd.second], ["gospel", rd.gospel], ...(rd.extra || []).map((x) => [x.label, x.ref])].filter(([, r]) => r).map(([lbl, ref]) => {
            const r = ctx.parseRef(ref), who = ready ? peopleInRange(r).slice(0, 10) : [];
            return `<details class="reading" data-book="${esc(r?.b || "")}"${lbl === "gospel" && rdate === dk ? " data-gospel" : ""}><summary><span class="eyebrow">${esc(typeof lbl === "string" ? T(lbl) : L(lbl))}</span> <b>${esc(ctx.refLabel(ref))}</b>${who.length ? `<span class="who">${who.slice(0, 4).map((id) => esc(P[id].name)).join(", ")}${who.length > 4 ? "…" : ""}</span>` : ""}</summary>
              <div class="passage"><p data-ref="${esc(ref)}">${!ready ? "…" : r ? ctx.verses(r).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ") : ""}</p><button class="ghost small" data-speak-ref="${esc(ref)}">${esc(T("listen"))}</button></div>
              ${who.length ? `<div class="chips"><span class="qmeta">${esc(T("peopleInReading"))}</span>${who.map((id) => ctx.chip(id)).join("")}</div>` : ""}</details>`;
          }).join("")}</div>
          <a class="qnext usccb" href="${usccb(rdate)}" target="_blank" rel="noopener">${X("Official readings (USCCB)", rdate === dk ? "Leer las lecturas de hoy en español" : "Leer las lecturas del domingo en español")} ↗</a>
          <p class="gfoot">${esc(T("readingsNote"))}</p>` : ""}
      </section>

      ${sotd.length ? `<section class="tsec"><h2>${esc(T("saintOfDay"))}</h2>${sotd.map(({ id, s }) => saintCard(id, s)).join("")}</section>` : `<section class="tsec" id="also" hidden></section>`}

      ${saints.filter((id) => !sotd.some(({ s }) => (s.people || []).includes(id))).length ? `<section class="tsec"><h2>${esc(T("biblicalSaints"))}</h2><div class="chips">${saints.map((id) => ctx.chip(id)).join("")}</div></section>` : ""}

      <section class="tsec"><h2>${esc(T("personOfDay"))}</h2>
        <button class="potd" data-id="${potd.id}"><span class="eyebrow">${esc(potd.role)} · ${esc(potd.era)}</span><b>${esc(potd.name)}</b><span>${esc(potd.summary)}</span></button>
      </section>

      <section class="tsec"><h2>${esc(T("todaysGames"))}</h2>
        <p class="qmeta">${X(`${playedN} of ${G.GAMES.length} played today`, `${playedN} de ${G.GAMES.length} jugados hoy`)}</p>
        <div class="gmini">${[feat, ...G.GAMES.filter((g) => g !== feat)].map((g) => `<button class="gm${g === feat ? " feat" : ""}" data-go="${g.id}"><b>${esc(g.name)}</b><span>${g === feat ? `${X("Featured today", "Destacado hoy")} · ` : ""}${G.playedToday(g.id) ? esc(T("played")) : esc(T("playNow"))}${G.streak(g.id) ? ` · ${G.streak(g.id)}🔥` : ""}</span></button>`).join("")}</div>
      </section>

      <section class="tsec" id="jcont"></section>
      <section class="tsec" id="remind"></section>
      <section class="tsec" id="inbox" hidden></section>
    </div>`;
    drawStart($("#start", root));
    if ($("#welcome", root)) renderWelcome($("#welcome", root));
    // a reading that is opened lights its book in My pilgrimage; today's Gospel left open for ten seconds is a day with God
    root.querySelectorAll("details.reading").forEach((d) => d.addEventListener("toggle", () => {
      if (!d.open) return;
      H()?.collect("books", d.dataset.book);
      if ("gospel" in d.dataset) setTimeout(() => { if (d.open && d.isConnected && !root.hidden && dayKey(new Date()) === dk) H()?.mark("gospel", dk); }, 10000);
    }));
    alsoReady.then(() => {
      const el = $("#also", root);
      if (!el || !also) return;
      el.hidden = false;
      el.innerHTML = `<h2>${X("Also remembered today", "También recordamos hoy")}</h2>${saintCard(also.id, also)}`;
      watchSaints(el);
    });
    watchSaints(root);
    renderReminder($("#remind", root));
    syncReminders().catch(() => {});
    if (resume) { resume = false; openRitual(); }
    // continue a journey
    try {
      JOURNEYS ??= await ctx.getJSON("data/journeys.json");
      const prog = ctx.store.get("bpm.journeys", {});
      const active = JOURNEYS.map(jx).find((j) => prog[j.id] && prog[j.id].length < j.steps.length);
      if (active) {
        const n = prog[active.id].length;
        $("#jcont", root).innerHTML = `<h2>${X("Continue your journey", "Continúa tu camino")}</h2><button class="potd" data-go="journeys" data-journey="${active.id}"><span class="eyebrow">${esc(active.title)} · ${X("step", "paso")} ${n + 1} ${X("of", "de")} ${active.steps.length}</span><b>${esc(active.steps[n].title)}</b></button>`;
      }
    } catch { /* journeys not available yet */ }
    renderInbox($("#inbox", root));
  }

  /* ---------- Start today: four short steps and a finish line ----------
     Word (today's Gospel), Witness (the saint), Play (the featured game), Amen (a closing prayer). One screen at a
     time over the page, a bar of four on top, tap or swipe to go on, Skip on every step, and then it is over:
     "Done for today". The steps taken are kept in the habit state, so the day can be picked up where it was left. */
  let RIT = null, ritualOpen = null, resume = false;
  const STEPS = ["word", "witness", "play", "amen"];
  function drawStart(el) {
    const h = H(), r = RIT;
    if (!el || !r || !h) return;
    const st = h.ritual(r.dk), began = st.pos > 0 || Object.keys(st.steps).length > 0, at = Math.min(st.pos, STEPS.length - 1) + 1;
    el.innerHTML = st.done
      ? `<div class="startcard done"><span class="eyebrow">${X("Done for today", "Hecho por hoy")} ✓</span><b>${X("Go in peace.", "Ve en paz.")}</b>
          ${h.flame()}<p class="qmeta">${esc(r.teaser)}</p>
          <div class="gbtns"><button class="qnext" id="startshare">${X("Share today", "Compartir el día")}</button><button class="ghost" id="startbtn">${X("See today's steps again", "Ver de nuevo los pasos de hoy")}</button></div></div>`
      : `<div class="startcard"><button class="qnext big" id="startbtn">${began ? X(`Continue today · step ${at} of ${STEPS.length}`, `Continuar hoy · paso ${at} de ${STEPS.length}`) : X("Start today", "Empezar hoy")}</button>
          <p class="qmeta">${X("Gospel · saint · game · prayer. About 3 minutes.", "Evangelio · santo · juego · oración. Unos 3 minutos.")}</p>${h.flame()}</div>`;
    $("#startbtn", el).onclick = () => openRitual();
    const sh = $("#startshare", el);
    if (sh) sh.onclick = (e) => shareDay(e.currentTarget);
  }
  // the finished day as a picture: the four steps and the streak, nothing of the game inside
  function shareDay(btn) {
    const r = RIT, h = H(), s = h.summary(), st = h.ritual(r.dk);
    const date = new Date(r.dk + "T12:00").toLocaleDateString(window.I18N.locale(), { weekday: "long", month: "long", day: "numeric" });
    return h.share(`The Daily Catholic · ${date}\n${X("Today's Gospel, saint, game and prayer: done.", "Evangelio, santo, juego y oración de hoy: hecho.")}${s.current ? `\n${h.flameText(s)}` : ""}\n${SITE()}`, btn,
      { title: X("Today with God", "Hoy con Dios"), sub: date, cells: [STEPS.map((x) => (st.steps[x] === "done" ? "on" : "off"))], big: X("Done for today", "Hecho por hoy"), foot: r.gospel ? C().refLabel(r.gospel) : "" });
  }
  async function openRitual() {
    if (ritualOpen || !RIT || !H()) return;
    const ctx = C(), h = H(), r = RIT, G = window.BPM_GAMES, T = (k) => window.I18N.T(k), L = (o) => window.I18N.L(o);
    ritualOpen = true; // (taken at once, so a double tap opens one)
    await Promise.race([r.also, new Promise((res) => setTimeout(res, 1500))]); // the date's saint, if it is still on its way
    const steps = STEPS.filter((x) => x !== "word" || r.gospel), st = h.ritual(r.dk), saint = r.saint();
    let pos = st.done ? 0 : Math.min(st.pos, steps.length - 1), fin = false, timer = 0, swiped = 0;
    const el = document.createElement("div"), back = document.activeElement, ac = new AbortController();
    el.className = "ritual"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", X("Start today", "Empezar hoy"));
    el.style.setProperty("--lit", r.colour);
    document.body.append(el); document.documentElement.classList.add("ritual-on");
    ritualOpen = el;
    const save = () => h.setRitual({ pos, steps: st.steps, done: st.done, news: st.news }, r.dk);
    const NAME = { word: X("The Word", "La Palabra"), witness: X("A witness", "Un testigo"), play: X("Play", "Jugar"), amen: X("Amen", "Amén") };
    const vhtml = (ref) => { const p = ctx.parseRef(ref); return p && ctx.bibleReady() ? ctx.verses(p).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ") : "…"; };
    const body = {
      word: () => `<span class="eyebrow">${r.gospelDay === r.dk ? X("Today's Gospel", "Evangelio de hoy") : X("This Sunday's Gospel", "Evangelio de este domingo")}</span><h2>${esc(ctx.refLabel(r.gospel))}</h2>
        ${T("scriptureEnglish") ? `<p class="qmeta">${esc(T("scriptureEnglish"))}</p>` : ""}
        <div class="passage"><p id="rverses">${vhtml(r.gospel)}</p></div>
        <div class="gbtns"><button class="ghost" data-speak-ref="${esc(r.gospel)}">${esc(T("listen"))}</button><a class="ghost" href="${usccb(r.gospelDay)}" target="_blank" rel="noopener">${X("Official readings (USCCB)", "Leer en español (USCCB)")} ↗</a></div>`,
      witness: () => (saint ? `<span class="eyebrow">${saint.also ? X("Also remembered today", "También recordamos hoy") : esc(T("saintOfDay"))}</span><h2>${esc(L(saint.s).title || saint.s.name)}</h2>
          ${saint.s.years ? `<p class="qmeta">${esc(saint.s.years)}</p>` : ""}<p>${esc(L(saint.s).bio)}</p>${L(saint.s).quote ? `<blockquote>${esc(L(saint.s).quote)}</blockquote>` : ""}${patronOf(saint.s) ? `<p class="qmeta">${esc(patronOf(saint.s))}</p>` : ""}`
        : `<span class="eyebrow">${esc(T("personOfDay"))}</span><h2>${esc(r.potd.name)}</h2><p class="qmeta">${esc(r.potd.role)} · ${esc(r.potd.era)}</p><p>${esc(r.potd.summary)}</p>`),
      play: () => `<span class="eyebrow">${X("Today's featured game", "El juego destacado de hoy")}</span><h2 class="gname">${G.icon(r.game.id)}${esc(r.game.name)}</h2><p>${esc(r.game.desc)}</p>
        ${G.playedToday(r.game.id) ? `<p class="rok">${X("✓ Played today", "✓ Jugado hoy")}</p>`
          : `<button class="qnext big" id="rplay">${X("Play now", "Jugar ahora")}</button><p class="qmeta">${X("You'll come back here when you finish. Or tap Next and leave the game for later.", "Volverás aquí al terminar. O toca Siguiente y deja el juego para después.")}</p>`}`,
      amen: () => `<span class="eyebrow">${X("A closing prayer", "Oración final")}</span>
        <blockquote class="rprayer">${X("In the name of the Father, and of the Son, and of the Holy Spirit.", "En el nombre del Padre, y del Hijo, y del Espíritu Santo.")}<br><br>${X("Lord, thank you for your Word today. Stay with me in all I do, and bring me back to you tomorrow.", "Señor, gracias por tu Palabra de hoy. Quédate conmigo en todo lo que haga y tráeme de nuevo a ti mañana.")}</blockquote>
        <p class="qmeta">${X("Tap Amen to finish.", "Toca Amén para terminar.")}</p>`,
    };
    // what today added to the collection, told once at the end
    const news = () => (st.news || []).map(([k, id]) => (k === "saint"
      ? `<p class="rnew">✦ ${X("New saint in your collection", "Nuevo santo en tu colección")}: <b>${esc(saint?.id === id ? L(saint.s).title || saint.s.name : id)}</b></p>`
      : `<p class="rnew">✦ ${X("New book heard", "Nuevo libro escuchado")}: <b>${esc(ctx.refLabel(`${id} 1`).replace(/ 1$/, ""))}</b> · ${X(`${h.count("books")} of ${ctx.BOOKS.length} books`, `${h.count("books")} de ${ctx.BOOKS.length} libros`)}</p>`)).join("");
    const doneHtml = () => { const s = h.summary(); return `<div class="rdone"><div class="rflame">${h.flameIcon}</div>
      <h2>${X("Done for today", "Hecho por hoy")}</h2><p class="rlead">${X("Go in peace.", "Ve en paz.")}</p>
      <p><b>${esc(h.flameText(s))}</b></p><p class="qmeta">${X(`Best: ${h.nDays(s.best)} · In all: ${h.nDays(s.total)}`, `Mejor racha: ${h.nDays(s.best)} · En total: ${h.nDays(s.total)}`)}</p>
      ${news()}<p class="rteaser">${esc(r.teaser)}</p>
      <div class="gbtns"><button class="qnext" id="rshare">${X("Share today", "Compartir el día")}</button><button class="ghost" id="rdone">${X("Close", "Cerrar")}</button></div>
      <p class="gfoot">${X("That is everything for today. The rest of the app is here whenever you want more.", "Eso es todo por hoy. El resto de la app está aquí cuando quieras más.")}</p></div>`; };
    function draw() {
      clearTimeout(timer);
      try { window.speechSynthesis?.cancel(); } catch { /* no speech here */ }
      const id = steps[pos], last = pos === steps.length - 1;
      el.innerHTML = `<div class="rit">
        <div class="rbar" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${fin ? steps.length : pos}" aria-label="${X("Today's steps", "Pasos de hoy")}">${steps.map((_, i) => `<i class="${fin || i < pos ? "on" : i === pos ? "cur" : ""}"></i>`).join("")}</div>
        <div class="rtop"><span class="eyebrow">${fin ? X("Today", "Hoy") : `${X("Step", "Paso")} ${pos + 1} ${X("of", "de")} ${steps.length} · ${NAME[id]}`}</span>${fin || last ? "" : `<button class="ghost" id="rskip">${X("Skip", "Saltar")}</button>`}<button class="ghost" id="rclose" aria-label="${X("Close", "Cerrar")}">×</button></div>
        <div class="rcard" id="rcard" tabindex="-1">${fin ? doneHtml() : body[id]()}</div>
        ${fin ? "" : `<div class="rnav"><button class="ghost" id="rprev"${pos ? "" : " disabled"}>‹ ${X("Back", "Atrás")}</button><button class="qnext" id="rnext">${last ? X("Amen", "Amén") : X("Next", "Siguiente")} ›</button></div>`}</div>`;
      if (fin) return $("#rshare", el).focus({ preventScroll: true });
      const got = (k, v) => { if (v && h.collect(k === "saint" ? "saints" : "books", v)) { (st.news ??= []).push([k, v]); save(); } };
      if (id === "word") {
        got("book", ctx.parseRef(r.gospel)?.b);
        if (r.gospelDay === r.dk) timer = setTimeout(() => h.mark("gospel", r.dk), 10000);
        if (!ctx.bibleReady()) ctx.loadBible().then(() => { const p = $("#rverses", el); if (p) p.innerHTML = vhtml(r.gospel); }).catch(() => {});
      }
      if (id === "witness" && saint && isSaint(saint.s)) got("saint", saint.id);
      $("#rnext", el).focus({ preventScroll: true });
    }
    function step(d, how) {
      if (fin) return;
      if (d > 0) {
        const id = steps[pos];
        st.steps[id] = how || (id === "play" && !G.playedToday(r.game.id) ? "skip" : "done");
        if (pos === steps.length - 1) { st.done = fin = true; save(); h.mark("flow", r.dk); return draw(); }
        pos++;
      } else if (pos) pos--; else return;
      save(); draw();
    }
    function close(refocus = true) {
      clearTimeout(timer); ac.abort();
      try { window.speechSynthesis?.cancel(); } catch { /* no speech here */ }
      el.remove(); document.documentElement.classList.remove("ritual-on"); ritualOpen = null;
      drawStart($("#start"));
      if (refocus) ($("#startbtn") || back)?.focus?.({ preventScroll: true });
    }
    el.addEventListener("click", (e) => {
      const on = (s) => e.target.closest(s);
      if (on("#rclose") || on("#rdone")) return close();
      if (on("#rskip")) return step(1, "skip");
      if (on("#rnext")) return step(1);
      if (on("#rprev")) return step(-1);
      if (on("#rshare")) return shareDay(on("#rshare"));
      if (on("#rplay")) { resume = true; close(false); location.hash = r.game.id; return; }
      // as in Stories: a tap on the card itself goes on, a tap near its left edge goes back
      const card = on(".rcard");
      if (!card || fin || on("button, a, input, summary") || Date.now() - swiped < 400 || String(window.getSelection?.() || "")) return;
      const b = card.getBoundingClientRect();
      step(e.clientX - b.left < b.width * 0.28 ? -1 : 1);
    });
    let sx = null, sy = 0;
    el.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (sx == null) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = Date.now(); step(dx < 0 ? 1 : -1); }
    }, { passive: true });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" && !e.target.closest?.("input")) step(1);
      else if (e.key === "ArrowLeft" && !e.target.closest?.("input")) step(-1);
    }, { signal: ac.signal });
    window.addEventListener("hashchange", () => close(false), { signal: ac.signal }); // the phone's Back button, or a link
    draw();
  }
  // after the featured game was opened from the steps, its result card offers the way back to them
  window.addEventListener("bpm:habit", (e) => {
    if (e.detail?.kind === "game" && resume) queueMicrotask(() => {
      const game = document.querySelector("#view-play:not([hidden]) .game");
      if (game && !game.querySelector(".rback")) game.insertAdjacentHTML("beforeend", `<a class="qnext rback" href="#today">${X("Back to today's steps", "Volver a los pasos de hoy")} ›</a>`);
    });
    if (e.detail?.kind !== "pray") drawStart($("#start"));
    syncReminders().catch(() => {});
  });

  /* ---------- first visit: three short screens, shown once ---------- */
  let wstep = 0;
  function renderWelcome(el) {
    const ctx = C(), T = (k) => window.I18N.T(k), LN = window.Capacitor?.Plugins?.LocalNotifications;
    const canRemind = !!LN || !window.claude?.use; // file downloads are blocked in the Claude preview
    const installed = matchMedia("(display-mode: standalone)").matches || !!window.Capacitor;
    const end = () => { ctx.store.set("bpm.welcomed", true); el.remove(); };
    const screens = [
      () => `<h2>${X("Welcome to The Daily Catholic", "Bienvenido a The Daily Catholic")}</h2>
        <p>${X("A few quiet minutes with God each day: the Gospel, the saint of the day, a short game and a prayer. And when you want more: the Rosary, everyone in the Bible, Mass and Confession near you.", "Unos minutos tranquilos con Dios cada día: el Evangelio, el santo del día, un juego breve y una oración. Y cuando quieras más: el Rosario, todas las personas de la Biblia, Misa y Confesión cerca de ti.")}</p>
        <ul class="wlist"><li>${X("Free, forever", "Gratis, siempre")}</li><li>${X("No ads", "Sin anuncios")}</li><li>${X("No account: your progress stays on this device", "Sin cuenta: tu progreso se queda en este dispositivo")}</li></ul>
        <div class="gbtns"><button class="qnext" id="wnext">${X("Next", "Siguiente")}</button><a class="ghost" href="#about">${X("Our promise", "Nuestra promesa")}</a></div>`,
      () => `<h2>${X("When would you like to pray?", "¿A qué hora quieres orar?")}</h2>
        <p>${X("Pick a time that already belongs to your day: with your coffee, on the bus, before bed.", "Elige una hora que ya sea parte de tu día: con el café, en el autobús, antes de dormir.")} ${canRemind ? (LN ? X("We'll remind you once a day, never more.", "Te lo recordaremos una vez al día, nunca más.") : X("Add a daily reminder to your phone's calendar.", "Agrega un recordatorio diario al calendario de tu teléfono.")) : ""}</p>
        <div class="findform"><label for="wtime">${esc(T("reminderTime"))}</label><input id="wtime" type="time" value="${esc(ctx.store.get("bpm.remind", {}).time || "08:00")}">${canRemind ? `<button class="qnext" id="wset">${LN ? X("Remind me", "Recordármelo") : esc(T("addToCalendar"))}</button>` : ""}</div>
        <p class="qmeta" id="wmsg" aria-live="polite"></p>
        <div class="gbtns"><button class="${canRemind ? "ghost" : "qnext"}" id="wnext">${canRemind ? X("Not now", "Ahora no") : X("Next", "Siguiente")}</button></div>`,
      () => `<h2>${X("Start today", "Empieza hoy")}</h2>
        <p>${X("Four short steps, about three minutes, and then you are done for the day. Each day you come keeps your days with God going; miss one and a rest day covers it.", "Cuatro pasos breves, unos tres minutos, y has terminado por hoy. Cada día que vienes continúan tus días con Dios; si faltas uno, un día de descanso lo cubre.")}</p>
        ${installed ? "" : `<p class="qmeta">${X("Tip: add this page to your home screen to open it like an app, even offline. It also keeps your progress safe.", "Consejo: añade esta página a tu pantalla de inicio para abrirla como una app, incluso sin conexión. Así también se conserva tu progreso.")}</p>`}
        <div class="gbtns"><button class="qnext big" id="wstart">${X("Start today", "Empezar hoy")}</button></div>`,
    ];
    const draw = (focus) => {
      wstep = Math.max(0, Math.min(wstep, screens.length - 1));
      el.innerHTML = `<button class="wclose" id="wclose" aria-label="${X("Close the welcome", "Cerrar la bienvenida")}">×</button>${screens[wstep]()}
        <div class="wdots" role="img" aria-label="${X(`Screen ${wstep + 1} of ${screens.length}`, `Pantalla ${wstep + 1} de ${screens.length}`)}">${screens.map((_, i) => `<i class="${i === wstep ? "on" : ""}"></i>`).join("")}</div>`;
      if (focus) (el.querySelector("#wstart, #wset, #wnext"))?.focus({ preventScroll: true });
    };
    el.onclick = async (e) => {
      const on = (s) => e.target.closest(s);
      if (on("#wclose")) return end();
      if (on("#wnext")) { const t = $("#wtime", el); if (t) ctx.store.set("bpm.remind", { ...ctx.store.get("bpm.remind", {}), time: t.value || "08:00" }); wstep++; return draw(true); }
      if (on("#wset")) {
        const msg = await setReminder($("#wtime", el).value || "08:00");
        if (!el.isConnected) return;
        $("#wmsg", el).textContent = msg;
        const nb = $("#wnext", el); nb.textContent = X("Next", "Siguiente"); nb.className = "qnext"; on("#wset").className = "ghost";
        renderReminder($("#remind"));
        return;
      }
      if (on("#wstart")) { end(); openRitual(); }
    };
    draw();
  }

  /* ---------- journeys ---------- */
  async function renderJourneys(root, openId) {
    const ctx = C();
    root.innerHTML = `<p class="loading">Loading journeys…</p>`;
    try {
      JOURNEYS ??= await ctx.getJSON("data/journeys.json");
      if (window.I18N?.lang === "es") JES ??= await ctx.getJSON("data/journeys_es.json").catch(() => null);
    } catch { root.innerHTML = `<h1>${X("Journeys", "Caminos")}</h1><p class="loading">…</p>`; return; }
    await ctx.loadBible();
    const prog = ctx.store.get("bpm.journeys", {});
    openId ??= ctx.store.get("bpm.journeyOpen", null);
    const jl = JOURNEYS.map(jx);
    const j = jl.find((x) => x.id === openId);
    if (!j) {
      root.innerHTML = `<div class="hub"><div class="ghead"><h1>${X("Journeys", "Caminos")}</h1></div>
        <p class="lede">${X("Guided paths through Scripture, one person a day, with a short reading and a question to reflect on. Good for families, classrooms, OCIA and Bible studies.", "Caminos guiados por la Escritura, una persona al día, con una lectura breve y una pregunta para reflexionar. Para familias, clases, OCIA y grupos bíblicos.")}</p>
        <div class="gcards">${jl.map((x) => {
          const done = (prog[x.id] || []).length;
          return `<button class="gcard" data-journey="${x.id}"><span class="gname">${esc(x.title)}</span><span class="gdesc">${esc(x.blurb)}</span>
            <span class="gstat">${x.steps.length} ${X("steps", "pasos")}${done ? ` · ${done} ${X("done", "hechos")}` : ""}</span><span class="pbar"><i style="width:${(done / x.steps.length) * 100}%"></i></span></button>`;
        }).join("")}</div></div>`;
      return;
    }
    ctx.store.set("bpm.journeyOpen", j.id);
    const done = new Set(prog[j.id] || []);
    const next = j.steps.findIndex((_, i) => !done.has(i));
    root.innerHTML = `<div class="journey"><div class="ghead"><button class="back" data-journey="">‹ ${X("All journeys", "Todos los caminos")}</button><h1>${esc(j.title)}</h1></div>
      <p class="lede">${esc(j.blurb)}</p><span class="pbar wide"><i style="width:${(done.size / j.steps.length) * 100}%"></i></span>
      <ol class="steps">${j.steps.map((s, i) => {
        const r = ctx.parseRef(s.read), open = i === (next < 0 ? -1 : next);
        return `<li class="step${done.has(i) ? " done" : ""}"><details ${open ? "open" : ""}><summary><span class="sn">${i + 1}</span><b>${esc(s.title)}</b>${ctx.P[s.person] ? `<span class="qmeta">${esc(ctx.P[s.person].name)}</span>` : ""}</summary>
          <div class="stepbody">${ctx.chip(s.person)}
            <div class="passage"><h4>${esc(ctx.refLabel(s.read))}</h4><p>${r ? ctx.verses(r).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ") : ""}</p><button class="ghost small" data-speak-ref="${esc(s.read)}">${window.I18N.T("listen")}</button></div>
            <p class="reflect"><span class="eyebrow">${X("Reflect", "Reflexiona")}</span>${esc(s.reflect)}</p>
            <button class="qnext" data-step="${i}">${done.has(i) ? X("Mark not done", "Marcar como pendiente") : X("Mark done", "Marcar como hecho")}</button></div></details></li>`;
      }).join("")}</ol></div>`;
    root.querySelectorAll("[data-step]").forEach((b) => b.onclick = () => {
      const i = +b.dataset.step, set = new Set(prog[j.id] || []);
      set.has(i) ? set.delete(i) : set.add(i);
      prog[j.id] = [...set].sort((a, b) => a - b);
      ctx.store.set("bpm.journeys", prog);
      renderJourneys(root, j.id);
    });
  }

  /* Spanish names for Sundays and weekdays (proper feasts come from saints.json) */
  function esTitle(en, dayRow) {
    if (window.I18N.lang !== "es" || !dayRow) return null;
    const SEAS = { ordinary: "del Tiempo Ordinario", advent: "de Adviento", lent: "de Cuaresma", easter: "de Pascua", christmas: "de Navidad" };
    const DAYS = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado" };
    const [season, week] = dayRow;
    let m = /^(\d+)\w\w Sunday (?:in|of)/.exec(en);
    if (m && SEAS[season]) return `${m[1]}.º Domingo ${SEAS[season]}`;
    m = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) of the (\d+)\w\w Week/.exec(en);
    if (m && SEAS[season]) return `${DAYS[m[1].toLowerCase()]} de la ${m[2]}.ª semana ${SEAS[season]}`;
    m = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) after Ash Wednesday/.exec(en);
    if (m) return `${DAYS[m[1].toLowerCase()]} después del Miércoles de Ceniza`;
    return null;
  }

  /* ---------- daily reminder ---------- */
  // In the iPhone/Android app (Capacitor) these are real local notifications, one a day for the next 30 days, each
  // naming that day's saint or feast and its Gospel. They are set again every time the app is opened, so if it is
  // not opened they run out by themselves, and the last one says so. Nothing is sent anywhere: the phone keeps them.
  // On the web a repeating calendar event (.ics) is created, which every phone calendar can import.
  const REMIND_DAYS = 30;
  const notifier = () => window.Capacitor?.Plugins?.LocalNotifications;
  function reminderPlan(time, now = new Date(), days = REMIND_DAYS) {
    const ctx = C(), es = window.I18N.lang === "es", [h, m] = String(time || "08:00").split(":").map(Number), out = [];
    const prayed = H()?.summary(dayKey(now)).doneToday;
    for (let i = 0; out.length < days && i <= days; i++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h || 0, m || 0, 0, 0), dk = dayKey(at), row = CAL?.[dk];
      if (at <= now || (i === 0 && prayed)) continue; // that time has passed, or today is already prayed: no reminder needed
      const rd = row && READ?.[row[5] || row[6]], gospel = rd?.gospel ? ctx.refLabel(rd.gospel) : "";
      // the day's saint or feast: one with a write-up first, else the day itself unless it is a plain weekday
      const cel = row?.[4] || [], c = cel.find((x) => x[3] && SAINTS?.[x[3]]) || (cel[0] && cel[0][2] !== "ferial" ? cel[0] : null);
      const name = c ? (c[3] && SAINTS?.[c[3]] ? window.I18N.L(SAINTS[c[3]]).title : "") || esTitle(c[0], row) || (es ? "" : c[0]) : "";
      const body = out.length === days - 1 ? X("We'll stop the reminders now. The door is always open.", "Dejamos de enviarte recordatorios. La puerta siempre está abierta.")
        : name && gospel ? X(`Today: ${name}. Gospel: ${gospel}. 3 minutes.`, `Hoy: ${name}. Evangelio: ${gospel}. 3 minutos.`)
        : gospel ? X(`Today's Gospel: ${gospel}. 3 minutes.`, `Evangelio de hoy: ${gospel}. 3 minutos.`)
        : name ? X(`Today: ${name}. 3 minutes.`, `Hoy: ${name}. 3 minutos.`)
        : X("Today's readings and saint are ready. 3 minutes.", "Las lecturas y el santo de hoy están listos. 3 minutos.");
      out.push({ id: out.length + 1, title: "The Daily Catholic", body, schedule: { at, allowWhileIdle: true } });
    }
    return out;
  }
  // (re)schedules the reminders if they are switched on; one run at a time
  let syncing = Promise.resolve();
  function syncReminders(ask = false) {
    return (syncing = syncing.catch(() => {}).then(async () => {
      const LN = notifier(), st = C().store.get("bpm.remind", {});
      if (!LN || !st.on || !CAL) return false;
      if (ask) { const p = await LN.requestPermissions(); if (p?.display && p.display !== "granted") throw new Error("denied"); }
      // ids 1 to 30 are ours (1 was the old repeating reminder): clear them, then set the days ahead
      await LN.cancel({ notifications: Array.from({ length: REMIND_DAYS }, (_, i) => ({ id: i + 1 })) }).catch(() => {});
      const plan = reminderPlan(st.time);
      if (plan.length) await LN.schedule({ notifications: plan });
      return true;
    }));
  }
  // switches the reminder on at this time and says, in the person's language, what happened
  async function setReminder(time) {
    const T = (k) => window.I18N.T(k), ctx = C(), LN = notifier();
    const [h, m] = time.split(":").map(Number);
    if (LN) {
      ctx.store.set("bpm.remind", { time, on: true });
      try {
        await syncReminders(true);
        return `${T("reminderSet")} ${time}. ${X("Each one names that day's saint or Gospel. One a day, never more; if you stop opening the app they end by themselves after 30 days.", "Cada uno nombra al santo o el Evangelio de ese día. Uno al día, nunca más; si dejas de abrir la app, terminan solos a los 30 días.")}`;
      } catch {
        ctx.store.set("bpm.remind", { time, on: false });
        return X("Notifications are turned off for this app in your phone's settings.", "Las notificaciones están desactivadas para esta app en los ajustes de tu teléfono.");
      }
    }
    ctx.store.set("bpm.remind", { ...ctx.store.get("bpm.remind", {}), time });
    const title = window.I18N.lang === "es" ? "The Daily Catholic: lecturas y juegos de hoy" : "The Daily Catholic: today's readings and games";
    const url = SITE() + "#today";
    const d = new Date(); d.setHours(h, m, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Daily Catholic//EN", "BEGIN:VEVENT", `UID:daily-catholic-reminder@scarusillo.github.io`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART:${stamp}`, "DURATION:PT10M", "RRULE:FREQ=DAILY",
      `SUMMARY:${title}`, `DESCRIPTION:${url}`, `URL:${url}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${title}`, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "daily-catholic-reminder.ics";
    document.body.append(a); a.click(); a.remove();
    return T("reminderIcs");
  }
  function renderReminder(el) {
    if (!el) return;
    const T = (k) => window.I18N.T(k), ctx = C(), LN = notifier();
    const st = { time: "08:00", ...ctx.store.get("bpm.remind", {}) };
    if (window.claude?.use && !LN) { el.hidden = true; return; } // downloads are blocked in the Claude preview
    el.innerHTML = `<h2>${esc(T("reminders"))}</h2><p class="qmeta">${LN ? X("One reminder a day at the time you choose, naming that day's saint or Gospel. Never more than one.", "Un recordatorio al día a la hora que elijas, con el santo o el Evangelio de ese día. Nunca más de uno.") : esc(T("reminderLede"))}</p>
      <div class="findform"><label for="rtime">${esc(T("reminderTime"))}</label><input id="rtime" type="time" value="${esc(st.time)}"><button class="qnext" id="rset">${LN ? (st.on ? X("Change the time", "Cambiar la hora") : X("Remind me", "Recordármelo")) : esc(T("addToCalendar"))}</button>${LN && st.on ? `<button class="ghost" id="roff">${X("Turn off", "Desactivar")}</button>` : ""}</div>
      <p class="qmeta" id="rmsg" aria-live="polite">${LN && st.on ? `${esc(T("reminderSet"))} ${esc(st.time)}.` : ""}</p>`;
    $("#rset", el).onclick = async () => {
      const msg = await setReminder($("#rtime", el).value || "08:00");
      if (!el.isConnected) return;
      if (LN) renderReminder(el);
      $("#rmsg", el).textContent = msg;
    };
    const off = $("#roff", el);
    if (off) off.onclick = async () => {
      ctx.store.set("bpm.remind", { time: st.time, on: false });
      try { await LN.cancel({ notifications: Array.from({ length: REMIND_DAYS }, (_, i) => ({ id: i + 1 })) }); } catch { /* nothing was set */ }
      renderReminder(el);
      $("#rmsg", el).textContent = X("Reminders are off.", "Los recordatorios están desactivados.");
    };
  }

  /* ---------- corrections (owner inbox) ---------- */
  async function renderInbox(el) {
    const db = await C().db(), user = await C().user();
    if (!db || !user?.isOwner()) return;
    try {
      const snap = await db.collection("corrections").get();
      const items = [];
      snap.docs?.forEach((d) => (d.data?.reports || []).forEach((r) => items.push(r)));
      items.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
      el.hidden = false;
      el.innerHTML = `<h2>Corrections inbox <span class="qmeta">(only you see this)</span></h2>${items.length ? `<ul class="inbox">${items.slice(0, 50).map((r) => `<li>${C().chip(r.person)} <span class="qmeta">${esc(r.field)} · ${esc((r.at || "").slice(0, 10))}</span><p>${esc(r.text)}</p></li>`).join("")}</ul>` : `<p class="qmeta">No corrections yet. Reviewers can send one from any person's page.</p>`}`;
    } catch { /* not readable */ }
  }

  window.BPM_TODAY = { renderToday, renderJourneys, openRitual, _reminderPlan: reminderPlan, _syncReminders: syncReminders };
})();
