/* Catholic Bible People Map — vanilla JS + d3 (force layout, zoom). */
(() => {
  "use strict";
  const ERAS = ["Primeval", "Patriarchs", "Exodus & Wilderness", "Conquest & Judges", "United Monarchy",
    "Divided Kingdom", "Exile", "Return & Restoration", "Maccabean", "Life of Christ", "Apostolic Church"];
  const ERA_SHORT = ["Primeval", "Patriarchs", "Exodus", "Judges", "Monarchy", "Divided", "Exile", "Return", "Maccabees", "Christ", "Church"];
  const DEUTERO = new Set(["tob", "jdt", "1ma", "2ma", "wis", "sir", "bar"]);
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  let HEADINGS = {}, BOOKS = [], BOOK = {}, PEOPLE = [], P = {}, MENTIONS = null, BIBLE = null, biblePromise = null;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const eraIdx = (e) => { const i = ERAS.indexOf(e); return i < 0 ? 5 : i; };
  let eraColor = () => "#888";
  function buildEraColors() {
    const a = cssVar("--gold"), b = cssVar("--lapis");
    const mid = cssVar("--rubric");
    const s = d3.scaleLinear().domain([0, 5, 10]).range([a, mid, b]).interpolate(d3.interpolateLab);
    eraColor = (e) => s(eraIdx(e));
  }

  /* ---------- data ---------- */
  async function getJSON(u) {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`${u}: ${r.status}`);
    return r.json();
  }
  function loadBible() {
    biblePromise ??= getJSON("data/bible.json").then((d) => {
      BIBLE = {};
      for (const b of d.books) { BIBLE[b.id] = b.chapters; if (b.headings) HEADINGS[b.id] = b.headings; }
    });
    return biblePromise;
  }
  async function loadMentions() { MENTIONS ??= await getJSON("data/mentions.json"); return MENTIONS; }

  function parseRef(s) {
    const m = /^([1-3]?[a-z]{2,3}) (\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/.exec(s || "");
    if (!m) return null;
    const [, b, c1, v1, c2, v2] = m;
    if (!v1) return { b, c1: +c1, v1: 1, c2: +c1, v2: 999 };
    return { b, c1: +c1, v1: +v1, c2: c2 ? +c2 : +c1, v2: v2 ? +v2 : +v1 };
  }
  function refLabel(s) {
    const r = parseRef(s);
    if (!r || !BOOK[r.b]) return s;
    const tail = s.slice(s.indexOf(" ") + 1);
    return `${BOOK[r.b].name} ${tail}`;
  }
  function verses(r) {
    const out = [], chs = BIBLE[r.b];
    for (let c = r.c1; c <= r.c2 && c <= chs.length; c++) {
      const ch = chs[c - 1];
      const lo = c === r.c1 ? r.v1 : 1, hi = c === r.c2 ? Math.min(r.v2, ch.length) : ch.length;
      if (lo === 1 && HEADINGS[r.b]?.[c]) out.push({ c, v: "", t: HEADINGS[r.b][c] });
      for (let v = lo; v <= hi; v++) out.push({ c, v, t: ch[v - 1] });
    }
    return out;
  }

  function highlight(text, names) {
    let h = esc(text);
    for (const n of names) {
      if (!n || n.length < 2) continue;
      h = h.replace(new RegExp(`(?<![\\w’'])(${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?!\\w)`, "g"), "<mark>$1</mark>");
    }
    return h;
  }

  /* ---------- routing ---------- */
  const VIEWS = ["today", "map", "canon", "people", "journeys", "play"];
  const GAME_VIEWS = ["threads", "links", "acrostic", "tap", "quiz"];
  const rendered = {};
  function route() {
    const h = location.hash.slice(1);
    let view = VIEWS.includes(h) || GAME_VIEWS.includes(h) ? h : null;
    if (!view && P[h]) { openPerson(h, false); view = store.get("bpm.view", "today"); }
    view ||= "today";
    const section = GAME_VIEWS.includes(view) ? "play" : view;
    for (const v of VIEWS) $(`#view-${v}`).hidden = v !== section;
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.view === section));
    store.set("bpm.view", view);
    const el = $(`#view-${section}`);
    if (section === "today") window.BPM_TODAY.renderToday(el);
    else if (section === "journeys") window.BPM_TODAY.renderJourneys(el, journeyReq);
    else if (view === "quiz") renderQuiz(el);
    else if (section === "play") window.BPM_GAMES.mount(view, el);
    else if (!rendered[view]) { rendered[view] = true; ({ map: renderMap, canon: renderCanon, people: renderPeople })[view](); }
    journeyReq = undefined;
    if (view === "map") resizeMap();
    if (section !== "map") window.scrollTo(0, 0);
  }
  let journeyReq;

  /* ---------- search ---------- */
  function setupSearch() {
    const q = $("#q"), box = $("#qres");
    const idx = PEOPLE.map((p) => ({ p, s: [p.name, ...p.aliases].join(" ").toLowerCase() }));
    q.addEventListener("input", () => {
      const t = q.value.trim().toLowerCase();
      if (!t) { box.hidden = true; return; }
      const hits = idx.filter((x) => x.s.includes(t))
        .sort((a, b) => (b.s.startsWith(t) - a.s.startsWith(t)) || b.p.mentions - a.p.mentions).slice(0, 12);
      box.innerHTML = hits.length ? hits.map(({ p }) => `<button data-id="${p.id}">${esc(p.name)} <small>${esc(p.role)}</small></button>`).join("")
        : `<button disabled>No one named “${esc(q.value)}”</button>`;
      box.hidden = false;
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]");
      if (b) { openPerson(b.dataset.id); box.hidden = true; q.value = ""; }
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { const b = box.querySelector("button[data-id]"); if (b) b.click(); }
      if (e.key === "Escape") box.hidden = true;
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".search")) box.hidden = true; });
  }

  /* ---------- network map ---------- */
  let G = null;
  function renderMap() {
    const canvas = $("#graph");
    const nodes = PEOPLE.map((p) => ({ id: p.id, p, r: 2.5 + Math.sqrt(p.mentions || 1) * 0.9 }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links = [], seen = new Set();
    const add = (a, b, kind) => {
      if (!byId[a] || !byId[b]) return;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(k)) return;
      seen.add(k); links.push({ source: a, target: b, kind });
    };
    for (const p of PEOPLE) {
      if (p.father) add(p.id, p.father, "family");
      if (p.mother) add(p.id, p.mother, "family");
      p.spouses.forEach((s) => add(p.id, s, "family"));
      p.relations.forEach((r) => add(p.id, r.to, "other"));
    }
    const W = 2600, H = 1500;
    const xs = d3.scaleLinear().domain([0, ERAS.length - 1]).range([-W / 2 + 120, W / 2 - 120]);
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance((l) => (l.kind === "family" ? 22 : 60)).strength((l) => (l.kind === "family" ? 0.7 : 0.08)))
      .force("charge", d3.forceManyBody().strength(-26).distanceMax(260))
      .force("x", d3.forceX((d) => xs(eraIdx(d.p.era))).strength(0.22))
      .force("y", d3.forceY(0).strength(0.035))
      .force("collide", d3.forceCollide((d) => d.r + 1.5))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();

    const neighbors = {};
    for (const l of links) {
      (neighbors[l.source.id] ??= new Set()).add(l.target.id);
      (neighbors[l.target.id] ??= new Set()).add(l.source.id);
    }
    G = { canvas, nodes, links, neighbors, t: d3.zoomIdentity, sel: null, hover: null, W, H, xs };
    const ctx = canvas.getContext("2d");

    const zoom = d3.zoom().scaleExtent([0.15, 8]).on("zoom", (e) => { G.t = e.transform; draw(); });
    G.zoom = zoom;
    d3.select(canvas).call(zoom).on("dblclick.zoom", null);
    $("#zin").onclick = () => d3.select(canvas).transition().duration(250).call(zoom.scaleBy, 1.5);
    $("#zout").onclick = () => d3.select(canvas).transition().duration(250).call(zoom.scaleBy, 1 / 1.5);
    $("#zfit").onclick = fit;

    const pick = (ev) => {
      const [mx, my] = d3.pointer(ev, canvas);
      const [x, y] = G.t.invert([mx, my]);
      let best = null, bd = Infinity;
      for (const n of nodes) {
        const d = (n.x - x) ** 2 + (n.y - y) ** 2;
        const rr = Math.max(n.r, 7 / G.t.k);
        if (d < rr * rr && d < bd) { bd = d; best = n; }
      }
      return best;
    };
    const tip = $("#tip");
    canvas.addEventListener("mousemove", (ev) => {
      const n = pick(ev);
      if (n !== G.hover) { G.hover = n; draw(); }
      canvas.style.cursor = n ? "pointer" : "grab";
      if (n) {
        const [mx, my] = d3.pointer(ev, canvas);
        tip.innerHTML = `<b>${esc(n.p.name)}</b><br>${esc(n.p.role)} · ${esc(n.p.era)}`;
        tip.style.left = Math.min(mx + 14, canvas.clientWidth - 270) + "px";
        tip.style.top = my + 14 + "px";
        tip.hidden = false;
      } else tip.hidden = true;
    });
    canvas.addEventListener("mouseleave", () => { tip.hidden = true; G.hover = null; draw(); });
    canvas.addEventListener("click", (ev) => { const n = pick(ev); if (n) openPerson(n.id); });

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { t } = G;
      ctx.save();
      ctx.translate(t.x, t.y); ctx.scale(t.k, t.k);
      const focus = G.sel || G.hover?.id;
      const nb = focus ? G.neighbors[focus] || new Set() : null;
      const lineC = cssVar("--line"), fg = cssVar("--fg"), muted = cssVar("--muted"), lapis = cssVar("--lapis"), gold = cssVar("--gold");

      for (const l of links) {
        const on = focus && (l.source.id === focus || l.target.id === focus);
        ctx.globalAlpha = focus ? (on ? 0.95 : 0.08) : 0.45;
        ctx.strokeStyle = on ? lapis : lineC;
        ctx.lineWidth = (on ? 1.8 : 1) / Math.sqrt(t.k);
        ctx.setLineDash(l.kind === "other" ? [4 / t.k, 3 / t.k] : []);
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const n of nodes) {
        const dim = focus && n.id !== focus && !nb.has(n.id);
        ctx.globalAlpha = dim ? 0.15 : 1;
        ctx.fillStyle = eraColor(n.p.era);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 2 * Math.PI); ctx.fill();
        if (n.id === focus) { ctx.strokeStyle = fg; ctx.lineWidth = 2 / t.k; ctx.stroke(); }
      }
      // labels: big nodes always, small ones as you zoom, focused neighborhood always
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      for (const n of nodes) {
        const show = (focus && (n.id === focus || nb.has(n.id))) || (!focus && n.r * t.k > 9) || (focus && n.r * t.k > 14);
        if (!show) continue;
        ctx.globalAlpha = 1;
        ctx.font = `${n.id === focus ? 700 : 500} ${Math.max(11, Math.min(15, n.r * t.k * 0.9)) / t.k}px "Alegreya Sans", sans-serif`;
        ctx.lineWidth = 3 / t.k; ctx.strokeStyle = cssVar("--surface");
        ctx.strokeText(n.p.name, n.x + n.r + 3 / t.k, n.y);
        ctx.fillStyle = n.id === focus ? gold : fg;
        ctx.fillText(n.p.name, n.x + n.r + 3 / t.k, n.y);
      }
      ctx.restore();
      // era labels in screen space, so they stay legible at any zoom
      ctx.globalAlpha = 1; ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = `600 11px "Alegreya Sans", sans-serif`;
      const gap = t.k * (xs(1) - xs(0));
      const every = gap < 55 ? 3 : gap < 80 ? 2 : 1;
      ERAS.forEach((e, i) => {
        const x = t.applyX(xs(i));
        if (x < -60 || x > w + 60 || i % every) return;
        ctx.fillText((gap < 120 ? ERA_SHORT[i] : e).toUpperCase(), x, 12);
      });
    }
    G.draw = draw;
    function fit() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const k = Math.min(w / W, h / H) * 1.05;
      d3.select(canvas).transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(k));
    }
    G.fit = fit;
    resizeMap(); fit();
    window.addEventListener("resize", resizeMap);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { buildEraColors(); draw(); });

    $("#legend").innerHTML = ERAS.map((e) => `<span><i style="background:${eraColor(e)}"></i>${e}</span>`).join("") +
      `<span><span class="ln"></span>Family</span><span><span class="ln d"></span>Other link</span>`;
  }
  function resizeMap() { if (G) { G.canvas.width = 0; G.draw(); } }
  function focusOnMap(id) {
    if (!G) return;
    G.sel = id;
    const n = G.nodes.find((x) => x.id === id);
    if (n && !$("#view-map").hidden) {
      const w = G.canvas.clientWidth, h = G.canvas.clientHeight, k = Math.max(G.t.k, 1.4);
      d3.select(G.canvas).transition().duration(500).call(G.zoom.transform, d3.zoomIdentity.translate(w / 2 - n.x * k - (w > 900 ? 200 : 0), h / 2 - n.y * k).scale(k));
    }
    G.draw();
  }

  /* ---------- canon matrix ---------- */
  function renderCanon() {
    const sel = $("#canonFilter");
    sel.value = store.get("bpm.canon", "top");
    const draw = () => {
      store.set("bpm.canon", sel.value);
      let rows = PEOPLE.filter((p) => p.mentions > 0);
      if (sel.value === "cross") rows = rows.filter((p) => Object.keys(p.books).some((b) => BOOK[b]?.testament === "OT") && Object.keys(p.books).some((b) => BOOK[b]?.testament === "NT"));
      if (sel.value === "deutero") rows = rows.filter((p) => Object.keys(p.books).some((b) => DEUTERO.has(b)));
      if (sel.value === "women") rows = rows.filter((p) => p.gender === "f");
      rows = rows.slice(0, 80);
      const cw = 13, rh = 20, left = 178, top = 120;
      const W = left + BOOKS.length * cw + 20, H = top + rows.length * rh + 10;
      const max = d3.max(rows, (p) => d3.max(Object.values(p.books))) || 1;
      const rs = d3.scaleSqrt().domain([0, max]).range([0, cw / 2 - 0.5]);
      let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="People by book">`;
      let lastSec = null;
      BOOKS.forEach((b, i) => {
        const x = left + i * cw + cw / 2;
        if (b.section !== lastSec) {
          svg += `<line x1="${x - cw / 2}" x2="${x - cw / 2}" y1="${top - 100}" y2="${H}" stroke="var(--line)"/>`;
          svg += `<text x="${x - cw / 2 + 3}" y="${top - 92}" font-size="10" style="fill:var(--gold)" font-weight="700">${esc(b.section.toUpperCase())}</text>`;
          lastSec = b.section;
        }
        svg += `<text transform="translate(${x + 3},${top - 6}) rotate(-60)" font-size="10.5"${DEUTERO.has(b.id) ? ' style="fill:var(--rubric)"' : ""}>${esc(b.name)}</text>`;
      });
      rows.forEach((p, j) => {
        const y = top + j * rh;
        svg += `<g class="row" data-id="${p.id}"><rect class="hl" x="0" y="${y}" width="${W}" height="${rh}" fill="transparent"/>`;
        const nm = p.name.length > 24 ? p.name.slice(0, 23) + "…" : p.name;
        svg += `<text x="${left - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="12.5">${esc(nm)}</text>`;
        const c = eraColor(p.era);
        for (const [b, n] of Object.entries(p.books)) {
          const i = BOOKS.findIndex((x) => x.id === b);
          if (i < 0) continue;
          svg += `<circle cx="${left + i * cw + cw / 2}" cy="${y + rh / 2}" r="${Math.max(1.6, rs(n))}" fill="${c}"><title>${esc(p.name)} · ${esc(BOOK[b].name)}: ${n} verse${n === 1 ? "" : "s"}</title></circle>`;
        }
        svg += `</g>`;
      });
      $("#canon").innerHTML = svg + "</svg>";
    };
    sel.onchange = draw;
    $("#canon").onclick = (e) => { const g = e.target.closest(".row"); if (g) openPerson(g.dataset.id); };
    draw();
  }

  /* ---------- people directory ---------- */
  function renderPeople() {
    $("#pera").innerHTML += ERAS.map((e) => `<option>${esc(e)}</option>`).join("");
    $("#pbook").innerHTML += BOOKS.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
    const draw = () => {
      const t = $("#pf").value.trim().toLowerCase(), era = $("#pera").value, bk = $("#pbook").value;
      const rows = PEOPLE.filter((p) => (!era || p.era === era) && (!bk || bk in p.books) &&
        (!t || p.name.toLowerCase().includes(t) || p.role.toLowerCase().includes(t) || p.aliases.some((a) => a.toLowerCase().includes(t))));
      rows.sort((a, b) => (bk ? (b.books[bk] || 0) - (a.books[bk] || 0) : 0) || b.mentions - a.mentions);
      $("#pcount").textContent = `${rows.length} of ${PEOPLE.length} people`;
      $("#plist").innerHTML = rows.slice(0, 400).map((p) => `<li><button data-id="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.role)}${p.role && p.era ? " · " : ""}${esc(p.era)} · ${p.mentions} verses</span></button></li>`).join("");
    };
    ["#pf", "#pera", "#pbook"].forEach((s) => $(s).addEventListener("input", draw));
    $("#plist").onclick = (e) => { const b = e.target.closest("button[data-id]"); if (b) openPerson(b.dataset.id); };
    draw();
  }

  /* ---------- person panel ---------- */
  function chip(id, extra = "") {
    const p = P[id];
    return p ? `<button class="chip ${extra}" data-id="${id}">${esc(p.name)}</button>` : "";
  }
  function siblings(p) {
    const s = new Set();
    for (const par of [p.father, p.mother]) if (par && P[par]) P[par].children.forEach((c) => c !== p.id && s.add(c));
    return [...s];
  }
  function bookStrip(p) {
    const cw = 7, h = 90, base = 70, W = BOOKS.length * cw + 8;
    const idx = BOOKS.map((b) => b.id);
    const present = idx.map((id, i) => [i, p.books[id]]).filter(([, n]) => n !== undefined);
    const max = d3.max(present, (d) => d[1]) || 1;
    let svg = `<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="Books ${esc(p.name)} appears in">`;
    // arcs weave each appearance to the next one in canonical order
    for (let k = 1; k < present.length; k++) {
      const x1 = 4 + present[k - 1][0] * cw + cw / 2, x2 = 4 + present[k][0] * cw + cw / 2;
      const r = (x2 - x1) / 2;
      svg += `<path d="M${x1},${base} A${r},${Math.min(r, base - 6)} 0 0 1 ${x2},${base}" fill="none" stroke="${eraColor(p.era)}" stroke-width="1.3" opacity=".75"/>`;
    }
    BOOKS.forEach((b, i) => {
      const n = p.books[b.id];
      const x = 4 + i * cw;
      const hh = n === undefined ? 3 : 4 + (n / max) * 14;
      svg += `<rect x="${x + 1}" y="${base + 2}" width="${cw - 2}" height="${hh}" rx="1" fill="${n === undefined ? "var(--line)" : eraColor(p.era)}"><title>${esc(b.name)}${n !== undefined ? `: ${n} verse${n === 1 ? "" : "s"}` : ""}</title></rect>`;
    });
    const ntX = 4 + BOOKS.findIndex((b) => b.testament === "NT") * cw;
    svg += `<text x="4" y="${h - 1}" font-size="9">Genesis</text><text x="${ntX}" y="${h - 1}" font-size="9">Matthew</text><text x="${W - 4}" y="${h - 1}" font-size="9" text-anchor="end">Revelation</text>`;
    return svg + "</svg>";
  }

  let current = null;
  async function openPerson(id, push = true) {
    const p = P[id];
    if (!p) return;
    current = id;
    const seen = store.get("bpm.seen", {});
    if (!seen[id]) { seen[id] = 1; store.set("bpm.seen", seen); }
    if (push && location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
    const names = [p.name, ...p.aliases];
    const sib = siblings(p);
    const fam = [
      ["Parents", [p.father, p.mother].filter(Boolean)],
      ["Siblings", sib],
      ["Spouses", p.spouses],
      ["Children", p.children],
    ].filter(([, a]) => a.length);
    const booksIn = Object.keys(p.books);
    $("#pbody").innerHTML = `
      <div class="p-eyebrow">${esc(p.role || "Person")} · ${esc(p.era)}</div>
      <h2 class="p-name">${esc(p.name)}</h2>
      ${p.aliases.length ? `<div class="p-alias">Also called ${esc(p.aliases.join(", "))}</div>` : ""}
      ${p.feast ? `<div class="feast">Feast: ${esc(p.feast)}</div>` : ""}
      <div class="p-actions">${"speechSynthesis" in window ? `<button class="ghost small" data-speak-person="${p.id}">▶ Listen</button>` : ""}<button class="ghost small" id="fixbtn">Suggest a correction</button></div>
      <form id="fixform" class="fixform" hidden>
        <label for="fixfield">What needs fixing?</label>
        <select id="fixfield"><option>Summary</option><option>Catholic teaching</option><option>Family links</option><option>Passages</option><option>Feast day</option><option>Other</option></select>
        <label for="fixtext">Your correction (cite Scripture or the Catechism if you can)</label>
        <textarea id="fixtext" rows="4" required></textarea>
        <div class="gbtns"><button class="qnext" type="submit">Send correction</button><button class="ghost" type="button" id="fixcancel">Cancel</button></div>
        <p class="qmeta" id="fixmsg"></p>
      </form>
      ${p.summary ? `<div class="p-sec"><p>${esc(p.summary)}</p></div>` : ""}
      ${fam.length ? `<div class="p-sec"><h3>Family</h3><div class="tree">${fam.map(([l, a]) => `<div class="gen"><span class="lbl">${l}</span>${a.map((x) => chip(x)).join("")}</div>`).join("")}</div></div>` : ""}
      ${p.relations.length ? `<div class="p-sec"><h3>Connections</h3><ul class="rels">${p.relations.map((r) => `<li><span class="t">${esc(r.type)}</span>${chip(r.to)}${r.ref ? `<button class="ref" data-ref="${esc(r.ref)}">${esc(refLabel(r.ref))}</button>` : ""}</li>`).join("")}</ul></div>` : ""}
      <div class="p-sec"><h3>Across the books</h3>
        <p class="qmeta">${p.mentions ? `Named in ${p.mentions} verse${p.mentions === 1 ? "" : "s"} across ${booksIn.length} book${booksIn.length === 1 ? "" : "s"}.` : `Appears in ${booksIn.map((b) => BOOK[b]?.name).join(", ")}.`}</p>
        <div class="strip">${bookStrip(p)}</div></div>
      ${p.catholic ? `<div class="p-sec"><h3>In Catholic teaching</h3><p class="catholic">${esc(p.catholic)}</p></div>` : ""}
      ${p.know.length ? `<div class="p-sec"><h3>What to know</h3><ul class="know">${p.know.map((k) => `<li>${esc(k)}</li>`).join("")}</ul></div>` : ""}
      ${p.keyPassages.length ? `<div class="p-sec"><h3>Key passages</h3><div id="kp" class="p-sec" style="margin:0"><p class="loading">Loading Scripture…</p></div></div>` : ""}
      <div class="p-sec"><h3>Every passage that names ${esc(p.name)}</h3><div id="allm"><p class="loading">Loading…</p></div></div>`;
    $("#panel").hidden = false;
    $("#panel").scrollTop = 0;
    focusOnMap(id);

    await Promise.all([loadBible(), loadMentions()]);
    if (current !== id) return;
    const kp = $("#kp");
    if (kp) kp.innerHTML = p.keyPassages.map((ref) => {
      const r = parseRef(ref);
      return `<div class="passage"><h4>${esc(refLabel(ref))}</h4><p>${verses(r).map((v) => `<sup>${v.v}</sup>${highlight(v.t, names)}`).join(" ")}</p></div>`;
    }).join("");
    const m = MENTIONS[id] || {};
    const bks = Object.keys(m);
    $("#allm").innerHTML = bks.length ? bks.map((b) => {
      const refs = m[b].split(" ");
      return `<details class="bk" data-b="${b}"><summary>${esc(BOOK[b].name)} <span>${refs.length}</span></summary><div class="vv"></div></details>`;
    }).join("") : `<p class="qmeta">No verse names ${esc(p.name)} directly in this translation; see the key passages above.</p>`;
    $("#allm").querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => {
      const box = d.querySelector(".vv");
      if (!d.open || box.childElementCount) return;
      const b = d.dataset.b;
      box.innerHTML = m[b].split(" ").map((cv) => {
        const [c, v] = cv.split(":").map(Number);
        const t = v === 0 ? HEADINGS[b]?.[c] : BIBLE[b][c - 1][v - 1];
        return `<p><b>${v === 0 ? `${c}, title` : `${c}:${v}`}</b>${highlight(t || "", names)}</p>`;
      }).join("");
    }));
  }
  function setupPanel() {
    $("#pclose").onclick = closePanel;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#panel").hidden) closePanel(); });
    $("#pbody").addEventListener("submit", sendCorrection);
    document.addEventListener("click", async (e) => {
      const go = e.target.closest("[data-go]");
      if (go) { e.preventDefault(); location.hash = go.dataset.go; if (location.hash.slice(1) === go.dataset.go) route(); return; }
      const jr = e.target.closest("[data-journey]");
      if (jr) { journeyReq = jr.dataset.journey || null; store.set("bpm.journeyOpen", journeyReq); if (location.hash !== "#journeys") location.hash = "journeys"; else route(); return; }
      const c = e.target.closest(".chip[data-id], .potd[data-id]");
      if (c && !c.classList.contains("self")) return openPerson(c.dataset.id);
      const sp = e.target.closest("[data-speak-person]");
      if (sp) { const p = P[sp.dataset.speakPerson]; return speak(`${p.name}. ${p.summary} ${p.catholic}`, sp); }
      const sr = e.target.closest("[data-speak-ref]");
      if (sr) { await loadBible(); return speak(verses(parseRef(sr.dataset.speakRef)).map((v) => v.t).join(" "), sr); }
      if (e.target.closest("#fixbtn")) { $("#fixform").hidden = false; $("#fixtext").focus(); return; }
      if (e.target.closest("#fixcancel")) { $("#fixform").hidden = true; return; }
      const r = e.target.closest(".ref[data-ref]");
      if (r) {
        await loadBible();
        const ref = parseRef(r.dataset.ref);
        if (r.nextElementSibling?.classList.contains("passage")) { r.nextElementSibling.remove(); return; }
        const div = document.createElement("div");
        div.className = "passage"; div.style.flexBasis = "100%";
        div.innerHTML = `<p>${verses(ref).map((v) => `<sup>${v.v}</sup>${esc(v.t)}`).join(" ")}</p>`;
        r.after(div);
      }
    });
  }
  function closePanel() {
    $("#panel").hidden = true; current = null;
    if (G) { G.sel = null; G.draw(); }
    history.replaceState(null, "", "#" + store.get("bpm.view", "today"));
  }

  /* ---------- daily quiz ---------- */
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  const LEVELS = { easy: { min: 40, label: "Easy" }, medium: { min: 10, label: "Medium" }, hard: { min: 3, label: "Hard" } };
  function makeQuiz(dateKey, level = "medium") {
    const R = rng([...(dateKey + level)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const pickFrom = (arr) => arr[Math.floor(R() * arr.length)];
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const lv = LEVELS[level];
    const notable = PEOPLE.filter((p) => p.summary.length > 80 && p.mentions >= lv.min && (level !== "hard" || p.mentions < 60));
    const distract = (right, pool, n = 3) => {
      const opts = new Set([right]);
      let guard = 0;
      while (opts.size < n + 1 && guard++ < 200) opts.add(pickFrom(pool));
      return shuffle([...opts]);
    };
    const mask = (p, text) => {
      let t = text;
      for (const n of [p.name, ...p.aliases].sort((a, b) => b.length - a.length)) t = t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "____");
      return t;
    };
    const makers = [
      () => { // who is described
        const p = pickFrom(notable);
        const pool = notable.filter((x) => x.era === p.era && x.id !== p.id).map((x) => x.name);
        if (pool.length < 3) return null;
        return { prompt: `Who is this? “${mask(p, p.summary)}”`, opts: distract(p.name, pool), answer: p.name, id: p.id };
      },
      () => { // parent
        const kids = notable.filter((p) => p.father && P[p.father]);
        const p = pickFrom(kids);
        const pool = PEOPLE.filter((x) => x.gender === "m" && x.children.length && x.era === P[p.father].era && x.id !== p.father).map((x) => x.name);
        if (pool.length < 3) return null;
        return { prompt: `Who was the father of ${p.name}?`, opts: distract(P[p.father].name, pool), answer: P[p.father].name, id: p.id };
      },
      () => { // spouse
        const ps = notable.filter((p) => p.spouses.length === 1);
        const p = pickFrom(ps); const s = P[p.spouses[0]];
        const pool = PEOPLE.filter((x) => x.gender === s.gender && x.spouses.length && x.id !== s.id).map((x) => x.name);
        return { prompt: `Who was married to ${p.name}?`, opts: distract(s.name, pool), answer: s.name, id: p.id };
      },
      () => { // book most mentioned
        const p = pickFrom(notable.filter((x) => Object.keys(x.books).length >= 2));
        const [best] = Object.entries(p.books).sort((a, b) => b[1] - a[1]);
        const pool = BOOKS.map((b) => b.name);
        return { prompt: `In which book is ${p.name} mentioned most often?`, opts: distract(BOOK[best[0]].name, pool), answer: BOOK[best[0]].name, id: p.id };
      },
      () => { // feast
        const fs = PEOPLE.filter((p) => p.feast);
        if (fs.length < 4) return null;
        const p = pickFrom(fs);
        return { prompt: `On what day does the Church celebrate ${p.name}?`, opts: distract(p.feast, [...new Set(fs.map((x) => x.feast))]), answer: p.feast, id: p.id };
      },
      () => { // fact
        const p = pickFrom(notable.filter((x) => x.know.length));
        const pool = notable.filter((x) => x.id !== p.id && x.era === p.era).map((x) => x.name);
        if (pool.length < 3) return null;
        return { prompt: `Which person fits this fact? “${mask(p, pickFrom(p.know))}”`, opts: distract(p.name, pool), answer: p.name, id: p.id };
      },
    ];
    const qs = [], used = new Set();
    let guard = 0;
    while (qs.length < 5 && guard++ < 100) {
      const q = makers[qs.length % makers.length === 4 && R() < 0.5 ? 4 : Math.floor(R() * makers.length)]();
      if (q && !used.has(q.prompt) && q.opts.length >= 3) { used.add(q.prompt); qs.push(q); }
    }
    return qs;
  }
  function renderQuiz(root) {
    const key = todayKey();
    const level = store.get("bpm.quizLevel", "medium");
    const qs = makeQuiz(key, level);
    const saved = store.get("bpm.quiz", {});
    let st = saved.day === key && saved.level === level ? saved : { day: key, level, i: 0, picks: [] };
    const hist = store.get("bpm.quizHist", {});
    const save = () => store.set("bpm.quiz", st);
    const draw = () => {
      const done = st.picks.length >= qs.length;
      const score = st.picks.filter((x, i) => x === qs[i].answer).length;
      const dots = qs.map((q, i) => `<i class="${i < st.picks.length ? (st.picks[i] === q.answer ? "ok" : "no") : i === st.i ? "cur" : ""}"></i>`).join("");
      let streak = 0;
      for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (hist[k] !== undefined) streak++; else break;
      }
      let body;
      if (done) {
        hist[key] = score; store.set("bpm.quizHist", hist);
        const gs = store.get("bpm.g.quiz", { days: {} }); gs.days[key] = { score, level }; store.set("bpm.g.quiz", gs);
        body = `<div class="qcard"><h2>${score} of ${qs.length} today</h2>
          <p class="qexp">${score === qs.length ? "A perfect round." : "Open the people you missed to read their stories."} A new quiz arrives tomorrow.</p>
          <div class="tree">${qs.map((q, i) => `<div class="gen"><span class="lbl">${st.picks[i] === q.answer ? "Right" : "Missed"}</span>${chip(q.id)}</div>`).join("")}</div></div>`;
      } else {
        const q = qs[st.i];
        const answered = st.picks.length > st.i;
        body = `<div class="qcard"><div class="qprompt">${esc(q.prompt)}</div>
          <div class="qopts">${q.opts.map((o) => {
            const cls = answered ? (o === q.answer ? "right" : o === st.picks[st.i] ? "wrong" : "") : "";
            return `<button class="${cls}" data-o="${esc(o)}" ${answered ? "disabled" : ""}>${esc(o)}</button>`;
          }).join("")}</div>
          ${answered ? `<p class="qexp">${st.picks[st.i] === q.answer ? "Correct." : `The answer is ${esc(q.answer)}.`} ${chip(q.id)}</p><button class="qnext">${st.i + 1 < qs.length ? "Next question" : "See results"}</button>` : ""}
        </div>`;
      }
      root.innerHTML = `<div class="quiz game"><div class="ghead"><button class="back" data-go="play">‹ Games</button><h1>Daily Quiz</h1><span class="qmeta">${streak} day streak</span></div>
        <div class="levels" role="group" aria-label="Difficulty">${Object.entries(LEVELS).map(([k, v]) => `<button class="${k === level ? "on" : ""}" data-level="${k}">${v.label}</button>`).join("")}</div>
        <div class="dots">${dots}</div>${body}</div>`;
    };
    root.onclick = (e) => {
      const lv = e.target.closest("[data-level]");
      if (lv) { store.set("bpm.quizLevel", lv.dataset.level); renderQuiz(root); return; }
      const o = e.target.closest("button[data-o]");
      if (o && st.picks.length === st.i) { st.picks.push(o.dataset.o); save(); draw(); return; }
      if (e.target.closest(".qnext")) { st.i++; save(); draw(); return; }
    };
    draw();
  }

  /* ---------- listen (text to speech) ---------- */
  let speaking = null;
  function speak(text, btn) {
    const ss = window.speechSynthesis;
    if (!ss) return;
    if (speaking === btn) { ss.cancel(); btn.textContent = "▶ Listen"; speaking = null; return; }
    ss.cancel();
    if (speaking) speaking.textContent = "▶ Listen";
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => { if (speaking === btn) { btn.textContent = "▶ Listen"; speaking = null; } };
    speaking = btn; btn.textContent = "■ Stop";
    ss.speak(u);
  }

  /* ---------- corrections ---------- */
  let dbP = null, userP = null;
  const useCap = (n) => (window.claude?.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
  const db = () => (dbP ??= useCap("db"));
  const user = () => (userP ??= useCap("user"));
  async function sendCorrection(e) {
    if (e.target.id !== "fixform") return;
    e.preventDefault();
    const msg = $("#fixmsg"), text = $("#fixtext").value.trim();
    if (!text) return;
    const [d, u] = await Promise.all([db(), user()]);
    const uid = u && (await u.id());
    if (!d || !uid) { msg.textContent = "Corrections can only be sent while signed in to Claude on this page."; return; }
    msg.textContent = "Sending…";
    try {
      const ref = d.doc(`corrections/${uid}`);
      const snap = await ref.get();
      const reports = (snap.exists && Array.isArray(snap.data?.reports) ? snap.data.reports : []).slice(-199);
      reports.push({ person: current, field: $("#fixfield").value, text: text.slice(0, 2000), at: new Date().toISOString() });
      await ref.set({ reports });
      $("#fixtext").value = "";
      msg.textContent = "Thank you. Your correction was sent for review.";
    } catch {
      msg.textContent = "Your correction could not be sent. Your sharing level may not allow it; ask the owner for Contributor access.";
    }
  }

  /* ---------- progress ---------- */
  const explored = () => Object.keys(store.get("bpm.seen", {})).length;
  function badges() {
    const n = explored(), seen = store.get("bpm.seen", {});
    const games = ["threads", "links", "acrostic", "tap", "quiz"];
    const plays = games.reduce((a, g) => a + Object.keys(store.get(`bpm.g.${g}`, { days: {} }).days).length, 0);
    const best = Math.max(0, ...games.map((g) => window.BPM_GAMES?.streak(g) || 0));
    const apostles = ["peter", "andrew", "james-son-of-zebedee", "john-apostle", "philip-apostle", "bartholomew", "matthew", "thomas", "james-son-of-alphaeus", "jude-thaddeus", "simon-the-zealot", "matthias"];
    const deutero = PEOPLE.filter((p) => ["restoration"].includes(p.section) && p.mentions >= 5).map((p) => p.id);
    return [
      { name: "First Steps", desc: "Open your first person", got: n >= 1 },
      { name: "Disciple", desc: "Open 25 people", got: n >= 25 },
      { name: "Scribe", desc: "Open 100 people", got: n >= 100 },
      { name: "Doctor of the Church", desc: "Open 400 people", got: n >= 400 },
      { name: "The Twelve", desc: "Meet every apostle", got: apostles.every((a) => seen[a]) },
      { name: "Deuterocanon", desc: "Meet 15 people from Tobit to Maccabees", got: deutero.filter((id) => seen[id]).length >= 15 },
      { name: "Faithful", desc: "A 7-day game streak", got: best >= 7 },
      { name: "Pilgrim", desc: "Play 30 daily games", got: plays >= 30 },
    ];
  }

  /* ---------- boot ---------- */
  async function boot() {
    buildEraColors();
    try {
      const d = await getJSON("data/people.json");
      BOOKS = d.books; BOOK = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
      PEOPLE = d.people; P = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
    } catch (e) {
      $("main").innerHTML = `<p class="loading">The people data could not load (${esc(e.message)}). Reload the page to try again.</p>`;
      return;
    }
    window.BPM = {
      store, getJSON, esc, chip, refLabel, parseRef, verses, loadBible, loadMentions, openPerson, explored, badges, db, user,
      get PEOPLE() { return PEOPLE; }, get P() { return P; }, get BOOKS() { return BOOKS; }, MENTIONS: () => MENTIONS,
    };
    setupSearch(); setupPanel();
    window.addEventListener("hashchange", route);
    route();
    loadBible();
  }
  boot();
})();
