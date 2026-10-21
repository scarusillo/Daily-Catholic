/* Today (liturgical day, readings and who's in them, saints, person of the day),
   Journeys (guided reading plans) and the corrections inbox. */
(() => {
  "use strict";
  const C = () => window.BPM;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const COLOURS = { green: "#3c7a4a", violet: "#6b3fa0", white: "#d9cfa8", red: "#b3282d", rose: "#d97aa6", black: "#222" };
  const SEASON = { ordinary: "Ordinary Time", advent: "Advent", christmas: "Christmas", lent: "Lent", triduum: "Easter Triduum", easter: "Easter" };
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let CAL = null, READ = null, JOURNEYS = null, SAINTS = null, JES = null;
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

  async function renderToday(root) {
    const ctx = C(), T = (k) => window.I18N.T(k), L = (o) => window.I18N.L(o), loc = window.I18N.locale();
    root.innerHTML = `<p class="loading">…</p>`;
    try {
      [CAL, READ, SAINTS] = await Promise.all([CAL || ctx.getJSON("data/calendar.json"), READ || ctx.getJSON("data/readings.json").catch(() => ({})),
        SAINTS || ctx.getJSON("data/saints.json").catch(() => ({}))]);
    } catch { CAL = CAL || {}; READ = READ || {}; SAINTS = SAINTS || {}; }
    await Promise.all([ctx.loadBible(), ctx.loadMentions()]);
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
    root.innerHTML = `<div class="today">
      <section class="tband" style="--lit:${COLOURS[main?.[1]] || "var(--gold)"}">
        <div class="eyebrow">${esc(dateStr)}</div>
        <h1>${esc(main ? celTitle(main, day) : T("today"))}</h1>
        <p class="qmeta">${day ? `${esc(T("season." + day[0]))}${day[1] ? `, ${esc(T("week"))} ${day[1]}` : ""} · ${esc(T("colour"))}: ${esc(T("colours." + main?.[1]) !== "colours." + main?.[1] ? T("colours." + main?.[1]) : main?.[1] || "")}` : ""}</p>
        ${cel.slice(1).length ? `<p>${esc(T("alsoToday"))} ${cel.slice(1).map((c) => esc(celTitle(c))).join("; ")}</p>` : ""}
      </section>

      ${sotd.length ? `<section class="tsec"><h2>${esc(T("saintOfDay"))}</h2>${sotd.map(({ s }) => `<div class="saint">
          <b>${esc(L(s).title || s.name)}</b>${s.years ? ` <span class="qmeta">${esc(s.years)}</span>` : ""}
          <p>${esc(L(s).bio)}</p>${L(s).quote ? `<blockquote>${esc(L(s).quote)}</blockquote>` : ""}${s.patron ? `<p class="qmeta">${esc(s.patron)}</p>` : ""}
          ${(s.people || []).filter((id) => P[id]).length ? `<div class="chips">${s.people.filter((id) => P[id]).map((id) => ctx.chip(id)).join("")}</div>` : ""}</div>`).join("")}</section>` : ""}

      ${saints.filter((id) => !sotd.some(({ s }) => (s.people || []).includes(id))).length ? `<section class="tsec"><h2>${esc(T("biblicalSaints"))}</h2><div class="chips">${saints.map((id) => ctx.chip(id)).join("")}</div></section>` : ""}

      <section class="tsec"><h2>${rdate === dk ? esc(T("todayReadings")) : `${esc(T("sundayReadings"))} · ${new Date(rdate + "T12:00").toLocaleDateString(loc, { month: "long", day: "numeric" })}`}</h2>
        ${rd ? `<p class="qmeta">${esc(celTitle(rday[4][0], rday))}${rd.confidence && rd.confidence !== "high" ? ` · ${esc(T("unverified"))}` : ""}</p>
          ${T("scriptureEnglish") ? `<p class="qmeta">${esc(T("scriptureEnglish"))}</p>` : ""}
          <div class="readings">${[["firstReading", rd.first], ["psalm", rd.psalm], ["secondReading", rd.second], ["gospel", rd.gospel]].filter(([, r]) => r).map(([lbl, ref]) => {
            const r = ctx.parseRef(ref), who = peopleInRange(r).slice(0, 10);
            return `<details class="reading"><summary><span class="eyebrow">${esc(T(lbl))}</span> <b>${esc(ctx.refLabel(ref))}</b>${who.length ? `<span class="who">${who.slice(0, 4).map((id) => esc(P[id].name)).join(", ")}${who.length > 4 ? "…" : ""}</span>` : ""}</summary>
              <div class="passage"><p>${r ? ctx.verses(r).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ") : ""}</p><button class="ghost small" data-speak-ref="${esc(ref)}">${esc(T("listen"))}</button></div>
              ${who.length ? `<div class="chips"><span class="qmeta">${esc(T("peopleInReading"))}</span>${who.map((id) => ctx.chip(id)).join("")}</div>` : ""}</details>`;
          }).join("")}</div>
          <p class="gfoot">${esc(T("readingsNote"))}</p>` : ""}
      </section>

      <section class="tsec"><h2>${esc(T("personOfDay"))}</h2>
        <button class="potd" data-id="${potd.id}"><span class="eyebrow">${esc(potd.role)} · ${esc(potd.era)}</span><b>${esc(potd.name)}</b><span>${esc(potd.summary)}</span></button>
      </section>

      <section class="tsec"><h2>${esc(T("todaysGames"))}</h2>
        <div class="gmini">${G.GAMES.map((g) => `<button class="gm" data-go="${g.id}"><b>${esc(g.name)}</b><span>${G.playedToday(g.id) ? esc(T("played")) : esc(T("playNow"))}${G.streak(g.id) ? ` · ${G.streak(g.id)}🔥` : ""}</span></button>`).join("")}</div>
      </section>

      <section class="tsec" id="jcont"></section>
      <section class="tsec" id="remind"></section>
      <section class="tsec" id="inbox" hidden></section>
    </div>`;
    renderReminder($("#remind", root));
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
  // In the iPhone/Android app (Capacitor) this schedules a real local notification; on the web it
  // creates a repeating calendar event (.ics), which every phone calendar can import.
  function renderReminder(el) {
    const T = (k) => window.I18N.T(k), ctx = C();
    const st = ctx.store.get("bpm.remind", { time: "08:00" });
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (window.claude?.use && !LN) { el.hidden = true; return; } // downloads are blocked in the Claude preview
    el.innerHTML = `<h2>${esc(T("reminders"))}</h2><p class="qmeta">${esc(T("reminderLede"))}</p>
      <div class="findform"><label for="rtime">${esc(T("reminderTime"))}</label><input id="rtime" type="time" value="${esc(st.time)}"><button class="qnext" id="rset">${esc(T("addToCalendar"))}</button></div>
      <p class="qmeta" id="rmsg"></p>`;
    $("#rset", el).addEventListener("click", async () => {
      const time = $("#rtime", el).value || "08:00";
      ctx.store.set("bpm.remind", { time });
      const [h, m] = time.split(":").map(Number);
      const title = window.I18N.lang === "es" ? "The Daily Catholic: lecturas y juegos de hoy" : "The Daily Catholic: today's readings and games";
      const url = "https://scarusillo.github.io/Daily-Catholic/#today";
      if (LN) {
        try {
          await LN.requestPermissions();
          await LN.schedule({ notifications: [{ id: 1, title: "The Daily Catholic", body: title, schedule: { on: { hour: h, minute: m }, repeats: true } }] });
          $("#rmsg", el).textContent = `${T("reminderSet")} ${time}.`;
        } catch { $("#rmsg", el).textContent = "Notifications are turned off for this app in your phone's settings."; }
        return;
      }
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
      $("#rmsg", el).textContent = T("reminderIcs");
    });
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

  window.BPM_TODAY = { renderToday, renderJourneys };
})();
