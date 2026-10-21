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

  let CAL = null, READ = null, JOURNEYS = null;

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
    const ctx = C();
    root.innerHTML = `<p class="loading">Loading today…</p>`;
    try { [CAL, READ] = await Promise.all([CAL || ctx.getJSON("data/calendar.json"), READ || ctx.getJSON("data/readings.json").catch(() => ({}))]); }
    catch { CAL = CAL || {}; READ = READ || {}; }
    await Promise.all([ctx.loadBible(), ctx.loadMentions()]);
    const now = new Date(), dk = dayKey(now), day = CAL[dk];
    const fi = feastIndex();
    const md = dk.slice(5);
    const saints = fi[md] || [];
    // readings: today if it has its own Sunday/feast readings, otherwise the coming Sunday
    let rdate = null;
    for (let i = 0; i < 8; i++) { const d = new Date(now); d.setDate(d.getDate() + i); const k = dayKey(d); if (CAL[k]?.[5] && READ[CAL[k][5]]) { rdate = k; break; } }
    const rday = rdate && CAL[rdate], rd = rday && READ[rday[5]];
    const P = ctx.P;
    const notable = ctx.PEOPLE.filter((p) => p.summary.length > 120 && p.mentions >= 10);
    const potd = notable[Math.floor((Date.parse(dk) / 864e5) * 7919) % notable.length];
    const cel = day?.[4] || [];
    const main = cel[0];
    const G = window.BPM_GAMES;
    root.innerHTML = `<div class="today">
      <section class="tband" style="--lit:${COLOURS[main?.[1]] || "var(--gold)"}">
        <div class="eyebrow">${now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
        <h1>${esc(main?.[0] || "Today")}</h1>
        <p class="qmeta">${day ? `${esc(SEASON[day[0]] || day[0])}${day[1] ? `, week ${day[1]}` : ""} · Sunday cycle ${esc(day[2])} · weekday cycle ${esc(day[3] === 1 ? "I" : "II")} · liturgical colour ${esc(main?.[1] || "")}` : "Liturgical calendar unavailable for this date."}</p>
        ${cel.slice(1).length ? `<p>Also today: ${cel.slice(1).map((c) => esc(c[0])).join("; ")}</p>` : ""}
      </section>

      ${saints.length ? `<section class="tsec"><h2>Biblical saints celebrated today</h2><div class="chips">${saints.map((id) => ctx.chip(id)).join("")}</div></section>` : ""}

      <section class="tsec"><h2>${rdate === dk ? "Today's Mass readings" : rd ? `This Sunday's readings · ${new Date(rdate + "T12:00").toLocaleDateString(undefined, { month: "long", day: "numeric" })}` : "Sunday readings"}</h2>
        ${rd ? `<p class="qmeta">${esc(rday[4][0][0])}${rd.confidence && rd.confidence !== "high" ? " · citation not yet verified, check your missal" : ""}</p>
          <div class="readings">${[["First reading", rd.first], ["Responsorial Psalm", rd.psalm], ["Second reading", rd.second], ["Gospel", rd.gospel]].filter(([, r]) => r).map(([lbl, ref]) => {
            const r = ctx.parseRef(ref), who = peopleInRange(r).slice(0, 10);
            return `<details class="reading"><summary><span class="eyebrow">${lbl}</span> <b>${esc(ctx.refLabel(ref))}</b>${who.length ? `<span class="who">${who.slice(0, 4).map((id) => esc(P[id].name)).join(", ")}${who.length > 4 ? "…" : ""}</span>` : ""}</summary>
              <div class="passage"><p>${r ? ctx.verses(r).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ") : ""}</p><button class="ghost small" data-speak-ref="${esc(ref)}">▶ Listen</button></div>
              ${who.length ? `<div class="chips"><span class="qmeta">People in this reading:</span>${who.map((id) => ctx.chip(id)).join("")}</div>` : ""}</details>`;
          }).join("")}</div>
          <p class="gfoot">Readings follow the Lectionary for Mass (US) for Sundays and holy days; weekday readings are not included yet. Verse numbers follow the World English Bible and can differ slightly from your missal.</p>`
        : `<p class="qmeta">Sunday readings are being prepared.</p>`}
      </section>

      <section class="tsec"><h2>Person of the day</h2>
        <button class="potd" data-id="${potd.id}"><span class="eyebrow">${esc(potd.role)} · ${esc(potd.era)}</span><b>${esc(potd.name)}</b><span>${esc(potd.summary)}</span></button>
      </section>

      <section class="tsec"><h2>Today's games</h2>
        <div class="gmini">${G.GAMES.map((g) => `<button class="gm" data-go="${g.id}"><b>${g.name}</b><span>${G.playedToday(g.id) ? "✓ Played" : "Play"}${G.streak(g.id) ? ` · ${G.streak(g.id)}🔥` : ""}</span></button>`).join("")}</div>
      </section>

      <section class="tsec" id="jcont"></section>
      <section class="tsec" id="inbox" hidden></section>
    </div>`;
    // continue a journey
    try {
      JOURNEYS ??= await ctx.getJSON("data/journeys.json");
      const prog = ctx.store.get("bpm.journeys", {});
      const active = JOURNEYS.find((j) => prog[j.id] && prog[j.id].length < j.steps.length);
      if (active) {
        const n = prog[active.id].length;
        $("#jcont", root).innerHTML = `<h2>Continue your journey</h2><button class="potd" data-go="journeys" data-journey="${active.id}"><span class="eyebrow">${esc(active.title)} · step ${n + 1} of ${active.steps.length}</span><b>${esc(active.steps[n].title)}</b></button>`;
      }
    } catch { /* journeys not available yet */ }
    renderInbox($("#inbox", root));
  }

  /* ---------- journeys ---------- */
  async function renderJourneys(root, openId) {
    const ctx = C();
    root.innerHTML = `<p class="loading">Loading journeys…</p>`;
    try { JOURNEYS ??= await ctx.getJSON("data/journeys.json"); }
    catch { root.innerHTML = `<h1>Journeys</h1><p class="loading">Guided journeys are being prepared.</p>`; return; }
    await ctx.loadBible();
    const prog = ctx.store.get("bpm.journeys", {});
    openId ??= ctx.store.get("bpm.journeyOpen", null);
    const j = JOURNEYS.find((x) => x.id === openId);
    if (!j) {
      root.innerHTML = `<div class="hub"><div class="ghead"><h1>Journeys</h1></div>
        <p class="lede">Guided paths through Scripture, one person a day, with a short reading and a question to reflect on. Good for families, classrooms, OCIA and Bible studies.</p>
        <div class="gcards">${JOURNEYS.map((x) => {
          const done = (prog[x.id] || []).length;
          return `<button class="gcard" data-journey="${x.id}"><span class="gname">${esc(x.title)}</span><span class="gdesc">${esc(x.blurb)}</span>
            <span class="gstat">${x.steps.length} steps${done ? ` · ${done} done` : ""}</span><span class="pbar"><i style="width:${(done / x.steps.length) * 100}%"></i></span></button>`;
        }).join("")}</div></div>`;
      return;
    }
    ctx.store.set("bpm.journeyOpen", j.id);
    const done = new Set(prog[j.id] || []);
    const next = j.steps.findIndex((_, i) => !done.has(i));
    root.innerHTML = `<div class="journey"><div class="ghead"><button class="back" data-journey="">‹ All journeys</button><h1>${esc(j.title)}</h1></div>
      <p class="lede">${esc(j.blurb)}</p><span class="pbar wide"><i style="width:${(done.size / j.steps.length) * 100}%"></i></span>
      <ol class="steps">${j.steps.map((s, i) => {
        const r = ctx.parseRef(s.read), open = i === (next < 0 ? -1 : next);
        return `<li class="step${done.has(i) ? " done" : ""}"><details ${open ? "open" : ""}><summary><span class="sn">${i + 1}</span><b>${esc(s.title)}</b>${ctx.P[s.person] ? `<span class="qmeta">${esc(ctx.P[s.person].name)}</span>` : ""}</summary>
          <div class="stepbody">${ctx.chip(s.person)}
            <div class="passage"><h4>${esc(ctx.refLabel(s.read))}</h4><p>${r ? ctx.verses(r).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ") : ""}</p><button class="ghost small" data-speak-ref="${esc(s.read)}">▶ Listen</button></div>
            <p class="reflect"><span class="eyebrow">Reflect</span>${esc(s.reflect)}</p>
            <button class="qnext" data-step="${i}">${done.has(i) ? "Mark not done" : "Mark done"}</button></div></details></li>`;
      }).join("")}</ol></div>`;
    root.querySelectorAll("[data-step]").forEach((b) => b.onclick = () => {
      const i = +b.dataset.step, set = new Set(prog[j.id] || []);
      set.has(i) ? set.delete(i) : set.add(i);
      prog[j.id] = [...set].sort((a, b) => a - b);
      ctx.store.set("bpm.journeys", prog);
      renderJourneys(root, j.id);
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
