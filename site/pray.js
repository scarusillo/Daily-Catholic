/* Pray: prayers, guided Rosary and Divine Mercy Chaplet, Confession guide, the Mass explained. */
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

  async function render(view, root) {
    root.innerHTML = `<p class="loading">…</p>`;
    try {
      if (view === "confession") {
        CONF ??= await C().getJSON("data/confession.json");
        PR ??= await C().getJSON("data/prayers.json").catch(() => null);
        return renderConfession(root);
      }
      if (view === "massguide") { MASSG ??= await C().getJSON("data/mass.json"); return renderMassGuide(root); }
      PR ??= await C().getJSON("data/prayers.json");
      if (view === "rosary") return renderBeads(root, "rosary");
      if (view === "chaplet") return renderBeads(root, "chaplet");
      return renderPrayers(root);
    } catch {
      root.innerHTML = `${subnav(view)}<p class="loading">This section is being prepared.</p>`;
    }
  }

  /* ---------- prayers ---------- */
  function renderPrayers(root) {
    const groups = {};
    for (const p of PR.prayers) (groups[p.group] ??= []).push(p);
    const order = ["essential", "marian", "daily", "eucharist", "saints", "sorrow"];
    root.innerHTML = `${subnav("pray")}<div class="hub">
      <div class="ghead"><h1>${esc(T("pray"))}</h1></div><p class="lede">${esc(T("prayLede"))}</p>
      <div class="gcards two"><button class="gcard" data-go="rosary"><span class="gname">${esc(T("startRosary"))}</span><span class="gdesc">${esc(T("todaysMysteries"))}: ${esc(L(PR.rosary.mysteries[todaysSet()]))}</span></button>
      <button class="gcard" data-go="chaplet"><span class="gname">${esc(T("chaplet"))}</span><span class="gdesc">${esc(L(PR.chaplet.intro)).slice(0, 140)}…</span></button></div>
      ${order.filter((g) => groups[g]).map((g) => `<section class="tsec"><h2>${esc(T("group." + g))}</h2>
        ${groups[g].map((p) => `<details class="prayer" id="pr-${p.id}"><summary>${esc(L(p).title)}</summary><div class="ptext">${lines(L(p).text)}</div>
          ${L(p).note ? `<p class="qmeta">${esc(L(p).note)} ${refBtn(p.ref)}</p>` : ""}
          <button class="ghost small" data-speak-text="${esc((L(p).text || []).join(" "))}">${esc(T("listen"))}</button></details>`).join("")}</section>`).join("")}
    </div>`;
  }

  /* ---------- guided beads (Rosary & Chaplet) ---------- */
  function todaysSet() {
    const wd = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    return Object.keys(PR.rosary.mysteries).find((k) => PR.rosary.mysteries[k].days.includes(wd)) || "joyful";
  }
  const P = (id) => PR.prayers.find((p) => p.id === id);
  function flatten(kind, setId) {
    const src = PR[kind], out = [];
    let decadeNo = 0;
    const push = (st, extra = {}) => {
      const n = st.count || 1;
      for (let i = 1; i <= n; i++) out.push({ ...st, ...extra, i, n });
    };
    for (const st of src.sequence) {
      if (st.step === "decade") {
        decadeNo++;
        const mys = kind === "rosary" ? src.mysteries[setId].items[decadeNo - 1] : null;
        for (const d of src.decade || []) push(d, { decadeNo, mys });
      } else push(st);
    }
    return out;
  }
  function renderBeads(root, kind) {
    const ctx = C();
    const key = `bpm.${kind}`;
    const saved = ctx.store.get(key, {});
    let setId = kind === "rosary" ? saved.set || todaysSet() : null;
    let steps = flatten(kind, setId);
    let pos = saved.day === new Date().toDateString() && saved.set === setId ? Math.min(saved.pos || 0, steps.length) : 0;
    const save = () => ctx.store.set(key, { day: new Date().toDateString(), set: setId, pos });
    const src = PR[kind];
    function draw() {
      const done = pos >= steps.length;
      const st = steps[Math.min(pos, steps.length - 1)];
      let body;
      if (done) body = `<div class="beadcard"><h2>${esc(T("done"))}</h2><button class="qnext" id="brestart">${esc(T("restart"))}</button></div>`;
      else if (st.step === "announce-mystery" && st.mys) {
        body = `<div class="beadcard"><span class="eyebrow">${esc(T("decade"))} ${st.decadeNo} · ${esc(T("mystery"))}</span><h2>${esc(L(st.mys))}</h2>
          ${st.mys.meditation ? `<p>${esc(L(st.mys.meditation))}</p>` : ""}${st.mys.fruit ? `<p class="qmeta">${esc(T("fruit"))}: ${esc(L(st.mys.fruit))}</p>` : ""}${refBtn(st.mys.ref)}</div>`;
      } else {
        const p = P(st.step);
        body = `<div class="beadcard">${st.decadeNo ? `<span class="eyebrow">${esc(T("decade"))} ${st.decadeNo}${st.mys ? ` · ${esc(L(st.mys))}` : ""}</span>` : ""}
          <h2>${esc(p ? L(p).title : st.step)}${st.n > 1 ? ` <span class="cnt">${st.i} ${esc(T("of"))} ${st.n}</span>` : ""}</h2>
          ${st.intention ? `<p class="qmeta">${esc(L(st.intention))}</p>` : ""}
          <div class="ptext">${lines(p ? L(p).text : [])}</div></div>`;
      }
      const beads = steps.map((s, i) => (s.bead ? `<i class="bd ${s.bead}${i < pos ? " past" : ""}${i === pos ? " now" : ""}"></i>` : "")).join("");
      root.innerHTML = `${subnav(kind)}<div class="game beads">
        <div class="ghead"><h1>${esc(T(kind))}</h1>${!done ? `<span class="qmeta">${pos + 1} / ${steps.length}</span>` : ""}</div>
        ${kind === "rosary" ? `<div class="levels" role="group" aria-label="${esc(T("chooseMysteries"))}">${Object.keys(src.mysteries).map((k) => `<button data-set="${k}" class="${k === setId ? "on" : ""}">${esc(L(src.mysteries[k]).replace(/ Mysteries| Misterios/i, "").replace(/^Misterios /, ""))}</button>`).join("")}</div>` : `<p class="qmeta">${esc(L(src.source))}</p>`}
        ${pos === 0 ? `<p class="lede">${esc(L(src.intro))}</p>${kind === "rosary" && src.sundayNote ? `<p class="qmeta">${esc(L(src.sundayNote))}</p>` : ""}` : ""}
        <div class="beadstrip" aria-hidden="true">${beads}</div>
        ${body}
        ${!done ? `<div class="gbtns"><button class="ghost" id="bprev" ${pos === 0 ? "disabled" : ""}>${esc(T("prev"))}</button><button class="qnext" id="bnext">${esc(T("next"))}</button></div><p class="gfoot">${esc(T("tapToContinue"))}</p>` : ""}
      </div>`;
      $("#bnext", root)?.addEventListener("click", () => { pos++; save(); draw(); });
      $("#bprev", root)?.addEventListener("click", () => { pos = Math.max(0, pos - 1); save(); draw(); });
      $("#brestart", root)?.addEventListener("click", () => { pos = 0; save(); draw(); });
      root.querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => { setId = b.dataset.set; steps = flatten(kind, setId); pos = 0; save(); draw(); }));
    }
    draw();
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

  window.BPM_PRAY = { render, VIEWS: SUBS.map(([id]) => id) };
})();
