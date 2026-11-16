/* Pray: prayers; guided Rosary, single decade, Divine Mercy Chaplet, Angelus, Examen and Stations of the Cross;
   Confession guide; the Mass explained. */
(() => {
  "use strict";
  const C = () => window.BPM;
  const { T, L } = { T: (k) => window.I18N.T(k), L: (o) => window.I18N.L(o) };
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SUBS = [["pray", "prayers"], ["rosary", "rosary"], ["chaplet", "chapletShort"], ["confession", "confession"], ["massguide", "theMass"]];
  let PR = null, CONF = null, MASSG = null;
  const subnav = (cur) => `<nav class="subnav">${SUBS.map(([id, k]) => `<a href="#${id}" class="${id === cur ? "on" : ""}">${esc(T(k))}</a>`).join("")}</nav>`;
  const lines = (arr) => (arr || []).map((x) => `<p>${esc(x)}</p>`).join("");
  const refBtn = (r) => (r ? `<button class="ref" data-ref="${esc(r)}">${esc(C().refLabel(r))}</button>` : "");

  const X = (en, es) => (window.I18N.lang === "es" ? es : en);

  /* ---------- what was prayed today ----------
     localStorage "bpm.prayed" = { "YYYY-MM-DD" (local date): ["rosary" | "decade" | "chaplet" | "stations" | "angelus" | "examen", ...] }
     and a window "bpm:prayed" event with detail.kind. The app-wide streak reads exactly this key, shape and event. */
  const KIND = { rosary: ["Rosary", "Rosario"], decade: ["One decade", "Un misterio"], chaplet: ["Divine Mercy Chaplet", "Coronilla"],
    stations: ["Stations of the Cross", "Vía Crucis"], angelus: ["Angelus", "Ángelus"], examen: ["Examen", "Examen"] };
  const DEVOTIONS = ["decade", "angelus", "examen", "stations"]; // guided devotions shown inside the Pray page
  const isoToday = () => { const d = new Date(), z = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
  const prayedToday = () => { const a = C().store.get("bpm.prayed", {})?.[isoToday()]; return Array.isArray(a) ? a : []; };
  function recordPrayed(kind) {
    const ctx = C(), saved = ctx.store.get("bpm.prayed", {}), all = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    const day = isoToday(), list = Array.isArray(all[day]) ? all[day] : [];
    if (!list.includes(kind)) list.push(kind);
    all[day] = list;
    ctx.store.set("bpm.prayed", all);
    try { window.dispatchEvent(new CustomEvent("bpm:prayed", { detail: { kind } })); } catch { /* very old browsers */ }
  }

  /* ---------- liturgical season (for the Regina Caeli in Eastertide and the Stations in Lent) ---------- */
  let CAL = null, calPromise = null;
  const loadSeason = () => (calPromise ??= C().getJSON("data/calendar.json").then((c) => { CAL = c || {}; }).catch(() => { CAL = {}; }));
  const season = () => CAL?.[isoToday()]?.[0] || null;

  /* ---------- which guided devotion is open inside the Pray page ----------
     The app routes #pray, #rosary, #chaplet, #confession and #massguide. The other devotions open inside #pray
     and are remembered in history.state, so the browser's Back button returns to the prayer list. */
  let sub = null;
  try { sub = history.state?.dev || null; } catch { /* no history state */ }
  const prayRoot = () => document.getElementById("view-pray");
  function openDevotion(kind, root) {
    sub = kind;
    try { history.pushState({ dev: kind }, "", "#pray"); } catch { /* stay in place */ }
    renderGuided(root, kind);
    window.scrollTo(0, 0);
  }
  function closeDevotion(root) {
    if (history.state?.dev) return history.back(); // popstate below redraws the list
    sub = null;
    if (location.hash === "#pray") renderPrayers(root); else location.hash = "pray";
  }
  window.addEventListener("popstate", () => {
    const dev = history.state?.dev || null, root = prayRoot();
    if (dev === sub) return;
    sub = dev;
    if (PR && root && !root.hidden && location.hash === "#pray") { if (sub) renderGuided(root, sub); else renderPrayers(root); }
  });
  window.addEventListener("hashchange", () => { sub = history.state?.dev || null; });
  function wire(root) {
    if (root.dataset.prayWired) return;
    root.dataset.prayWired = "1";
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dev]");
      if (b) {
        e.preventDefault();
        if (!b.dataset.dev) return closeDevotion(root);
        if (b.dataset.set) C().store.set(`bpm.${b.dataset.dev}`, { day: new Date().toDateString(), set: b.dataset.set, pos: 0 });
        return openDevotion(b.dataset.dev, root);
      }
      if (sub && e.target.closest('.subnav a[href="#pray"]')) { e.preventDefault(); closeDevotion(root); }
    });
  }

  async function render(view, root) {
    wire(root);
    root.innerHTML = `<p class="loading">…</p>`;
    try {
      if (view === "confession") {
        CONF ??= await C().getJSON("data/confession.json");
        PR ??= await C().getJSON("data/prayers.json").catch(() => null);
        return renderConfession(root);
      }
      if (view === "massguide") { MASSG ??= await C().getJSON("data/mass.json"); return renderMassGuide(root); }
      PR ??= await C().getJSON("data/prayers.json");
      if (view === "rosary" || view === "chaplet") return renderGuided(root, view);
      if (DEVOTIONS.includes(view)) sub = view; // ready for direct routes, should the app add them
      if (sub && !DEVOTIONS.includes(sub)) sub = null;
      if (sub) return renderGuided(root, sub);
      return renderPrayers(root);
    } catch {
      root.innerHTML = `${subnav(view)}<p class="loading">${esc(X("This section is being prepared.", "Esta sección se está preparando."))}</p>`;
    }
  }

  /* ---------- prayers ---------- */
  const P = (id) => PR.prayers.find((p) => p.id === id);
  const minutes = (n) => (n === 1 ? X("about a minute", "cerca de un minuto") : X(`about ${n} min`, `unos ${n} min`));
  function renderPrayers(root) {
    const groups = {};
    for (const p of PR.prayers) (groups[p.group] ??= []).push(p);
    const order = ["essential", "daily", "marian", "eucharist", "mercy", "saints", "seasons", "sorrow"];
    const prayed = prayedToday(), sea = season(), friday = new Date().getDay() === 5;
    const mys = todaysMystery();
    const stationsWhy = sea === "lent" ? X("A devotion for Lent", "Devoción de Cuaresma") : friday ? X("A Friday devotion", "Devoción de los viernes") : "";
    const tile = (kind, attrs, name, desc, mins, why = "") => `<button class="gcard pcard${why ? " feat" : ""}${prayed.includes(kind) ? " done" : ""}" ${attrs}>
        ${why ? `<span class="eyebrow">${esc(why)}</span>` : ""}<span class="gname">${esc(name)}</span><span class="gdesc">${esc(desc)}</span>
        <span class="gstat">${prayed.includes(kind) ? `✓ ${esc(X("Prayed today", "Rezado hoy"))}` : esc(minutes(mins))}</span></button>`;
    const tiles = [
      ["rosary", tile("rosary", `data-go="rosary"`, T("startRosary"), `${T("todaysMysteries")}: ${L(PR.rosary.mysteries[todaysSet()])}`, 20)],
      ["decade", tile("decade", `data-dev="decade"`, X("Pray one decade", "Reza un misterio"), `${X("Today's mystery", "Misterio de hoy")}: ${L(mys.item)}`, 4)],
      ["chaplet", tile("chaplet", `data-go="chaplet"`, T("chaplet"), X("On ordinary rosary beads. Many pray it at 3 p.m., the hour of mercy.", "Con un rosario común. Muchos la rezan a las 3 de la tarde, la hora de la misericordia."), 10)],
      ["angelus", sea === "easter"
        ? tile("angelus", `data-dev="angelus"`, L(PR.reginaCaeli.title), X("The Easter greeting to Mary, prayed in place of the Angelus until Pentecost.", "El saludo pascual a María, que se reza en lugar del Ángelus hasta Pentecostés."), 1, X("Easter season", "Tiempo de Pascua"))
        : tile("angelus", `data-dev="angelus"`, L(PR.angelus.title), X("Morning, noon and evening: the Word was made flesh.", "Mañana, mediodía y tarde: el Verbo se hizo carne."), 2)],
      ["examen", tile("examen", `data-dev="examen"`, L(PR.examen.title), X("Look back over your day with God, in five short steps.", "Repasa tu día junto a Dios, en cinco pasos breves."), 5)],
      ["stations", tile("stations", `data-dev="stations"`, L(PR.stations.title), X("Walk with Jesus from Pilate's court to the tomb, in fourteen stations.", "Acompaña a Jesús desde el pretorio hasta el sepulcro, en catorce estaciones."), 20, stationsWhy)],
    ];
    if (stationsWhy) tiles.unshift(tiles.pop());
    const guidedBtn = (p) => (p.guided ? `<button class="ghost small" data-dev="${esc(p.guided.split(":")[0])}"${p.guided.includes(":") ? ` data-set="${esc(p.guided.split(":")[1])}"` : ""}>${esc(X("Pray it step by step", "Rezar paso a paso"))}</button>` : "");
    root.innerHTML = `${subnav("pray")}<div class="hub">
      <div class="ghead"><h1>${esc(T("pray"))}</h1></div><p class="lede">${esc(T("prayLede"))}</p>
      ${prayed.length ? `<p class="prayedtoday" role="status"><b>✓ ${esc(X("Prayed today", "Rezado hoy"))}:</b> ${prayed.filter((k) => KIND[k]).map((k) => esc(X(...KIND[k]))).join(" · ")}</p>` : ""}
      <section class="tsec"><h2>${esc(X("Guided prayer", "Oración guiada"))}</h2><div class="gcards two">${tiles.map((t) => t[1]).join("")}</div></section>
      ${order.filter((g) => groups[g]).map((g) => `<section class="tsec"><h2>${esc(T("group." + g))}</h2>
        ${groups[g].map((p) => `<details class="prayer" id="pr-${p.id}"><summary>${esc(L(p).title)}</summary><div class="ptext">${lines(L(p).text)}</div>
          ${L(p).note ? `<p class="qmeta">${esc(L(p).note)} ${refBtn(p.ref)}</p>` : ""}
          <div class="gbtns">${guidedBtn(p)}<button class="ghost small" data-speak-text="${esc((L(p).text || []).join(" "))}">${esc(T("listen"))}</button></div></details>`).join("")}</section>`).join("")}
    </div>`;
    if (!CAL) loadSeason().then(() => { if (["lent", "easter"].includes(season()) && !sub && !root.hidden && location.hash === "#pray" && $(".hub", root)) renderPrayers(root); });
  }

  /* ---------- guided prayer: the steps of each devotion ---------- */
  function todaysSet() {
    const wd = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    return Object.keys(PR.rosary.mysteries).find((k) => PR.rosary.mysteries[k].days.includes(wd)) || "joyful";
  }
  // One decade: today's set of mysteries, moving through its five by day of the year.
  function todaysMystery() {
    const now = new Date(), set = todaysSet();
    const doy = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / 864e5);
    return { set, idx: doy % 5, item: PR.rosary.mysteries[set].items[doy % 5] };
  }
  // Expand a bead sequence (Rosary, Chaplet) into one step per prayer said. mysteryAt(n) gives the mystery of the nth decade.
  function flatten(sequence, decade, mysteryAt) {
    const out = [];
    let decadeNo = 0;
    const push = (st, extra = {}) => {
      const n = st.count || 1;
      for (let i = 1; i <= n; i++) out.push({ ...st, ...extra, i, n });
    };
    for (const st of sequence) {
      if (st.step === "decade") {
        decadeNo++;
        const m = mysteryAt ? mysteryAt(decadeNo) : null;
        for (const d of decade || []) push(d, m ? { decadeNo: m.no, mys: m.item, of: m.of } : { decadeNo });
      } else push(st);
    }
    return out;
  }
  const mysteryNames = () => Object.keys(PR.rosary.mysteries).map((k) => ({ id: k, label: L(PR.rosary.mysteries[k]).replace(/ Mysteries| Misterios/i, "").replace(/^Misterios /, "") }));
  // Each devotion: { kind (recorded when finished), nav, title, intro, notes, sets, set, steps(set) }.
  const DEV = {
    rosary: () => ({ kind: "rosary", nav: "rosary", title: T("rosary"), intro: L(PR.rosary.intro), notes: PR.rosary.sundayNote ? [L(PR.rosary.sundayNote)] : [],
      sets: mysteryNames(), setsLabel: T("chooseMysteries"), set: todaysSet(), more: ["decade", X("Short on time? Pray one decade", "¿Poco tiempo? Reza un misterio")],
      steps: (set) => flatten(PR.rosary.sequence, PR.rosary.decade, (n) => ({ no: n, item: PR.rosary.mysteries[set].items[n - 1] })) }),
    decade: () => {
      const m = todaysMystery();
      return { kind: "decade", nav: "rosary", back: true, title: X("One decade", "Un misterio"), intro: L(PR.rosary.singleIntro), set: `${m.set}:${m.idx}`,
        more: ["rosary", X("Pray the whole Rosary", "Rezar el Rosario completo"), "go"],
        steps: () => flatten(PR.rosary.single, PR.rosary.decade, () => ({ no: m.idx + 1, item: m.item, of: L(PR.rosary.mysteries[m.set]) })) };
    },
    chaplet: () => ({ kind: "chaplet", nav: "chaplet", title: T("chaplet"), intro: L(PR.chaplet.intro), source: L(PR.chaplet.source), set: null,
      steps: () => flatten(PR.chaplet.sequence, PR.chaplet.decade) }),
    angelus: () => ({ kind: "angelus", nav: "pray", back: true, title: (set) => L((set === "regina" ? PR.reginaCaeli : PR.angelus).title), intro: (set) => L((set === "regina" ? PR.reginaCaeli : PR.angelus).intro),
      notes: [L(PR.angelus.note)], sets: [{ id: "angelus", label: X("Angelus", "Ángelus") }, { id: "regina", label: "Regina Caeli" }], setsLabel: X("Choose the prayer", "Elegir la oración"),
      set: season() === "easter" ? "regina" : "angelus",
      steps: (set) => (set === "regina" ? PR.reginaCaeli : PR.angelus).steps }),
    examen: () => ({ kind: "examen", nav: "pray", back: true, title: L(PR.examen.title), intro: L(PR.examen.intro), set: null,
      steps: () => [...PR.examen.steps.map((s, i, a) => ({ ...s, bead: "large", eyebrow: X(`Step ${i + 1} of ${a.length}`, `Paso ${i + 1} de ${a.length}`) })), { step: PR.examen.close }] }),
    stations: () => ({ kind: "stations", nav: "pray", back: true, title: L(PR.stations.title), intro: L(PR.stations.intro), notes: [L(PR.stations.note)], set: null,
      steps: () => {
        const S = PR.stations, n = S.items.length;
        return [{ step: "sign-of-the-cross" }, { ...S.opening },
          ...S.items.flatMap((it, i) => {
            const eyebrow = X(`Station ${i + 1} of ${n}`, `Estación ${i + 1} de ${n}`);
            return [{ eyebrow, title: it, vr: [S.versicle], ref: it.ref, note: it.ref ? null : S.traditionNote, body: it.meditation, bead: "large" },
              ...S.after.map((id) => ({ step: id, eyebrow: `${eyebrow} · ${L(it)}`, bead: "small" }))];
          }),
          { ...S.closing }, { step: "sign-of-the-cross" }];
      } }),
  };

  // One card for any step: a mystery, a prayer by id, or a card with its own title, versicles, reflection and text.
  function stepCard(st) {
    if (st.step === "announce-mystery" && st.mys) {
      return `<div class="beadcard"><span class="eyebrow">${st.of ? `${esc(st.of)} · ${esc(T("mystery"))} ${st.decadeNo}` : `${esc(T("decade"))} ${st.decadeNo} · ${esc(T("mystery"))}`}</span><h2>${esc(L(st.mys))}</h2>
        ${st.mys.meditation ? `<p>${esc(L(st.mys.meditation))}</p>` : ""}${st.mys.fruit ? `<p class="qmeta">${esc(T("fruit"))}: ${esc(L(st.mys.fruit))}</p>` : ""}${refBtn(st.mys.ref)}</div>`;
    }
    const p = st.step ? P(st.step) : null, also = st.pray ? P(st.pray) : null;
    const eyebrow = st.eyebrow ? esc(L(st.eyebrow)) : st.mys ? (st.of ? esc(L(st.mys)) : `${esc(T("decade"))} ${st.decadeNo} · ${esc(L(st.mys))}`) : st.decadeNo ? `${esc(T("decade"))} ${st.decadeNo}` : "";
    const title = st.title ? L(st.title) : p ? L(p).title : st.step || "";
    return `<div class="beadcard">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
      ${title ? `<h2>${esc(title)}${st.n > 1 ? ` <span class="cnt">${st.i} ${esc(T("of"))} ${st.n}</span>` : ""}</h2>` : ""}
      ${st.intention ? `<p class="qmeta">${esc(L(st.intention))}</p>` : ""}
      ${(st.vr || []).length ? `<div class="vr">${st.vr.map((x) => `<p><abbr title="${esc(X("Leader", "Guía"))}">V.</abbr> ${esc(L(x.v))}</p><p class="resp"><abbr title="${esc(X("All respond", "Todos responden"))}">R.</abbr> ${esc(L(x.r))}</p>`).join("")}</div>` : ""}
      ${st.ref ? `<div class="stref">${refBtn(st.ref)}</div>` : ""}${st.note ? `<p class="qmeta">${esc(L(st.note))}</p>` : ""}
      ${st.body ? `<p class="medit">${esc(L(st.body))}</p>` : ""}
      ${st.say ? `<p class="say">${esc(L(st.say))}</p>` : ""}
      ${also ? `<div class="ptext"><span class="eyebrow">${esc(L(also).title)}</span>${lines(L(also).text)}</div>` : ""}
      ${st.lead ? `<p class="qmeta">${esc(L(st.lead))}</p>` : ""}
      ${p || st.text ? `<div class="ptext">${lines(st.text ? L(st.text) : L(p).text)}</div>` : ""}</div>`;
  }

  /* ---------- guided prayer: one engine for every devotion ----------
     Position is kept per devotion in "bpm.<kind>" as { day, set, pos } and resumes for the rest of that day. */
  function renderGuided(root, name) {
    const ctx = C(), dev = DEV[name](), key = `bpm.${name}`;
    const saved = ctx.store.get(key, {}) || {};
    const sameDay = saved.day === new Date().toDateString();
    const valid = (s) => (dev.sets ? dev.sets.some((x) => x.id === s) : s === dev.set);
    let setId = dev.sets ? (sameDay && valid(saved.set) ? saved.set : dev.set) : dev.set;
    let steps = dev.steps(setId);
    let pos = sameDay && saved.set === setId ? Math.max(0, Math.min(saved.pos || 0, steps.length)) : 0;
    const save = () => ctx.store.set(key, { day: new Date().toDateString(), set: setId, pos });
    const pick = (v) => (typeof v === "function" ? v(setId) : v);
    function draw(focus) {
      const done = pos >= steps.length;
      const body = done
        ? `<div class="beadcard amen" role="status"><span class="amenmark" aria-hidden="true">✓</span><h2>${esc(X("Amen — prayed today", "Amén — rezado hoy"))}</h2>
            <p class="qmeta">${esc(pick(dev.title))} · ${esc(new Date().toLocaleDateString(window.I18N.locale(), { weekday: "long", month: "long", day: "numeric" }))}</p>
            <div class="gbtns"><button class="qnext" data-dev="">${esc(X("Back to prayers", "Volver a las oraciones"))}</button><button class="ghost" id="brestart">${esc(X("Pray it again", "Rezar otra vez"))}</button></div></div>`
        : stepCard(steps[pos]);
      const beads = steps.map((s, i) => (s.bead ? `<i class="bd ${s.bead}${i < pos ? " past" : ""}${i === pos ? " now" : ""}"></i>` : "")).join("");
      root.innerHTML = `${subnav(dev.nav)}<div class="game beads">
        <div class="ghead">${dev.back ? `<button class="back" data-dev="">‹ ${esc(T("prayers"))}</button>` : ""}<h1>${esc(pick(dev.title))}</h1>${!done ? `<span class="qmeta">${pos + 1} / ${steps.length}</span>` : ""}</div>
        ${dev.sets ? `<div class="levels" role="group" aria-label="${esc(dev.setsLabel)}">${dev.sets.map((s) => `<button data-set="${s.id}" class="${s.id === setId ? "on" : ""}"${s.id === setId ? ` aria-pressed="true"` : ""}>${esc(s.label)}</button>`).join("")}</div>` : ""}
        ${dev.source ? `<p class="qmeta">${esc(dev.source)}</p>` : ""}
        ${pos === 0 ? `<p class="lede">${esc(pick(dev.intro))}</p>${(dev.notes || []).map((n) => `<p class="qmeta">${esc(n)}</p>`).join("")}
          ${dev.more ? `<button class="ref morelink" data-${dev.more[2] || "dev"}="${dev.more[0]}">${esc(dev.more[1])}</button>` : ""}` : ""}
        ${beads ? `<div class="beadstrip" aria-hidden="true">${beads}</div>` : ""}
        <div class="stepwrap" tabindex="-1">${body}</div>
        ${!done ? `<div class="gbtns"><button class="ghost" id="bprev" ${pos === 0 ? "disabled" : ""}>${esc(T("prev"))}</button><button class="qnext" id="bnext">${esc(pos === steps.length - 1 ? X("Amen", "Amén") : T("next"))}</button></div><p class="gfoot">${esc(T("tapToContinue"))}</p>` : ""}
      </div>`;
      $("#bnext", root)?.addEventListener("click", () => { pos++; save(); if (pos >= steps.length) recordPrayed(dev.kind); draw(true); });
      $("#bprev", root)?.addEventListener("click", () => { pos = Math.max(0, pos - 1); save(); draw(true); });
      $("#brestart", root)?.addEventListener("click", () => { pos = 0; save(); draw(true); });
      root.querySelectorAll(".levels [data-set]").forEach((b) => b.addEventListener("click", () => { setId = b.dataset.set; steps = dev.steps(setId); pos = 0; save(); draw(); }));
      if (focus) { const w = $(".stepwrap", root); if (w && w.getBoundingClientRect().top < 0) w.scrollIntoView({ block: "start" }); }
    }
    draw();
    if (name === "angelus" && !CAL) loadSeason().then(() => { if (season() === "easter" && sub === "angelus" && pos === 0 && !(sameDay && saved.set) && $(".beads", root)) renderGuided(root, name); });
  }

  /* ---------- confession ---------- */
  function renderConfession(root) {
    const ctx = C();
    const who = ctx.store.get("bpm.exam", "adults");
    const ex = CONF.examinations.find((e) => e.id === who) || CONF.examinations[0];
    root.innerHTML = `${subnav("confession")}<div class="game guide">
      <div class="ghead"><h1>${esc(T("confession"))}</h1></div>
      <p class="lede">${esc(L(CONF.intro))}</p>
      <a class="qnext findconf" href="#confess">${window.I18N.lang === "es" ? "Buscar dónde confesarme cerca de mí" : "Find Confession near me"}</a>
      <section class="tsec"><h2>${esc(T("howToConfess"))}</h2><ol class="steplist">${CONF.steps.map((s) => `<li>${esc(L(s))}</li>`).join("")}</ol>
        ${CONF.afterNote ? `<p class="qmeta">${esc(L(CONF.afterNote))}</p>` : ""}
        ${P && PR?.prayers && P("act-of-contrition") ? `<details class="prayer"><summary>${esc(L(P("act-of-contrition")).title)}</summary><div class="ptext">${lines(L(P("act-of-contrition")).text)}</div></details>` : ""}</section>
      <section class="tsec"><h2>${esc(T("examination"))}</h2>
        <div class="levels" role="group">${CONF.examinations.map((e) => `<button data-exam="${e.id}" class="${e.id === ex.id ? "on" : ""}">${esc(L(e.title))}</button>`).join("")}</div>
        ${ex.sections.map((s) => `<details class="exsec" open><summary>${esc(L(s.heading))} ${refBtn(s.ref)}</summary><ul class="know">${s.questions.map((q) => `<li>${esc(L(q))}</li>`).join("")}</ul></details>`).join("")}
      </section>
      ${(CONF.faq || []).length ? `<section class="tsec"><h2>${esc(T("faq"))}</h2>${CONF.faq.map((f) => `<details class="faq"><summary>${esc(L(f.q))}</summary><p>${esc(L(f.a))}</p></details>`).join("")}</section>` : ""}
    </div>`;
    root.querySelectorAll("[data-exam]").forEach((b) => b.addEventListener("click", () => { ctx.store.set("bpm.exam", b.dataset.exam); renderConfession(root); }));
  }

  /* ---------- the Mass explained ---------- */
  function renderMassGuide(root) {
    const icon = { stand: "⇧", sit: "▭", kneel: "⌄" };
    root.innerHTML = `${subnav("massguide")}<div class="game guide">
      <div class="ghead"><h1>${esc(T("theMass"))}</h1></div>
      <p class="lede">${esc(L(MASSG.intro))}</p>
      ${MASSG.parts.map((part) => `<section class="tsec"><h2>${esc(L(part.title))}</h2>
        <ol class="mguide">${part.steps.map((s) => `<li><details><summary><b>${esc(L(s.title))}</b>${s.posture ? `<span class="posture p-${s.posture}">${icon[s.posture] || ""} ${esc(T("posture." + s.posture))}</span>` : ""}</summary>
          <p>${esc(L(s.what))}</p>${s.youSay ? `<p><span class="eyebrow">${esc(T("youSay"))}</span>${esc(L(s.youSay))}</p>` : ""}
          ${s.why ? `<p class="qmeta"><b>${esc(T("why"))}:</b> ${esc(L(s.why))} ${refBtn(s.ref)}</p>` : ""}</details></li>`).join("")}</ol></section>`).join("")}
      ${(MASSG.tips || []).length ? `<section class="tsec"><h2>${esc(T("tips"))}</h2><ul class="know">${MASSG.tips.map((t) => `<li>${esc(L(t))}</li>`).join("")}</ul></section>` : ""}
    </div>`;
  }

  window.BPM_PRAY = { render, VIEWS: [...SUBS.map(([id]) => id), ...DEVOTIONS], prayedToday };
})();
