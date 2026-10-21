/* Daily games: Threads (word-path search), Lineage Links (group four), Hidden Name (acrostic),
   Holy Land Tap (map). Everything is seeded by the local date so everyone gets the same puzzle. */
(() => {
  "use strict";
  const C = () => window.BPM; // shared context from app.js
  const SITE = "https://scarusillo.github.io/Daily-Catholic/";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- seeded helpers ---------- */
  function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  function shuffle(R, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayNumber = () => Math.floor((Date.parse(dayKey()) - Date.parse("2026-10-20")) / 864e5) + 1;

  /* ---------- stats / streaks ---------- */
  function stats(game) { return C().store.get(`bpm.g.${game}`, { days: {} }); }
  function record(game, result) {
    const s = stats(game);
    s.days[dayKey()] = result;
    C().store.set(`bpm.g.${game}`, s);
  }
  function streak(game) {
    const s = stats(game);
    let n = 0;
    for (const d = new Date(); s.days[dayKey(d)]; d.setDate(d.getDate() - 1)) n++;
    return n;
  }
  const playedToday = (game) => !!stats(game).days[dayKey()];

  async function share(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.className = "sharebox"; ta.readOnly = true;
      btn.after(ta); ta.select(); btn.textContent = "Select and copy the text below";
    }
  }

  let THEMES = null, PLACES = null, GEO = null, threadsAbort = null;
  async function themes() { THEMES ??= await C().getJSON("data/themes.json"); return THEMES; }

  /* =====================================================================
     THREADS — find the theme words hidden as letter paths; the spangram
     names the theme and touches two opposite sides of the grid.
     ===================================================================== */
  const COLS = 6;
  function hamiltonPath(R, rows) {
    // random Hamiltonian path on a rows×COLS grid via backbite moves
    const N = rows * COLS, id = (r, c) => r * COLS + c;
    let path = [];
    for (let r = 0; r < rows; r++) for (let k = 0; k < COLS; k++) path.push(id(r, r % 2 ? COLS - 1 - k : k));
    const nb = (x) => { const r = Math.floor(x / COLS), c = x % COLS, o = []; if (r) o.push(x - COLS); if (r < rows - 1) o.push(x + COLS); if (c) o.push(x - 1); if (c < COLS - 1) o.push(x + 1); return o; };
    for (let it = 0; it < N * 60; it++) {
      if (R() < 0.5) path.reverse();
      const end = path[path.length - 1];
      const cand = nb(end).filter((x) => x !== path[path.length - 2]);
      const n = pick(R, cand);
      const i = path.indexOf(n);
      // reverse the tail after n so the path stays Hamiltonian
      path = path.slice(0, i + 1).concat(path.slice(i + 1).reverse());
    }
    return path;
  }
  function subsetSum(R, words, spLen, target) {
    const idx = shuffle(R, words.map((_, i) => i));
    for (let mask = (1 << idx.length) - 1; mask > 0; mask--) {
      const chosen = idx.filter((_, k) => mask & (1 << k));
      if (chosen.length < 3) continue;
      if (chosen.reduce((a, i) => a + words[i].w.length, 0) + spLen === target) return chosen.map((i) => words[i]);
    }
    return null;
  }
  function buildThreads(dk) {
    const R = rng(seedOf("threads" + dk));
    const pool = shuffle(R, THEMES.filter((t) => t.words.length >= 4));
    for (const t of pool) {
      for (const rows of [8, 7, 6]) {
        const words = subsetSum(R, t.words, t.spangram.length, rows * COLS);
        if (!words) continue;
        for (let attempt = 0; attempt < 400; attempt++) {
          const path = hamiltonPath(R, rows);
          const items = shuffle(R, [...words.map((w) => ({ ...w, span: false })), { w: t.spangram, span: true }]);
          let k = 0;
          const placed = items.map((it) => { const cells = path.slice(k, k + it.w.length); k += it.w.length; return { ...it, cells }; });
          const sp = placed.find((p) => p.span);
          const rs = sp.cells.map((x) => Math.floor(x / COLS)), cs = sp.cells.map((x) => x % COLS);
          const spans = (Math.min(...cs) === 0 && Math.max(...cs) === COLS - 1) || (Math.min(...rs) === 0 && Math.max(...rs) === rows - 1);
          if (!spans) continue;
          const grid = new Array(rows * COLS);
          for (const p of placed) { if (R() < 0.5) p.cells.reverse(); p.cells.forEach((x, i) => (grid[x] = p.w[i])); }
          return { theme: t, rows, grid, placed };
        }
      }
    }
    return null;
  }
  function renderThreads(root) {
    const dk = dayKey();
    const pz = buildThreads(dk);
    if (!pz) { root.innerHTML = `<p class="loading">Today's puzzle could not be built. Try again tomorrow.</p>`; return; }
    const key = `bpm.threads.${dk}`;
    const st = C().store.get(key, { found: [], hints: 0, log: [], hinted: null });
    const save = () => C().store.set(key, st);
    let sel = [];
    const adj = (a, b) => Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1 && a !== b;
    const total = pz.placed.length;
    root.innerHTML = `
      <div class="game">
        <div class="ghead"><button class="back" data-go="play">‹ Games</button><h1>Threads</h1><span class="qmeta">#${dayNumber()}</span></div>
        <div class="tclue"><span class="eyebrow">Today's theme</span><b>${esc(pz.theme.clue || pz.theme.title)}</b></div>
        <p class="qmeta" id="tprog"></p>
        <div class="tgrid-wrap"><svg class="tlines" id="tlines"></svg><div class="tgrid" id="tgrid" style="grid-template-rows:repeat(${pz.rows},1fr)">${pz.grid.map((ch, i) => `<button class="tcell" data-i="${i}" aria-label="${ch}">${ch}</button>`).join("")}</div></div>
        <div class="tword" id="tword" aria-live="polite">&nbsp;</div>
        <div class="gbtns"><button id="thint" class="ghost">Hint</button><button id="tclear" class="ghost">Clear</button></div>
        <div id="tdone"></div>
        <p class="gfoot">Drag across touching letters (any direction, diagonals too), or tap letters one by one and tap the last letter again to submit. Every letter belongs to exactly one word. The <b>spangram</b> names the theme and stretches from one side of the grid to the other.</p>
      </div>`;
    const cells = [...root.querySelectorAll(".tcell")];
    const svg = $("#tlines", root);
    function center(i) { const el = cells[i], g = $("#tgrid", root).getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - g.left + r.width / 2, r.top - g.top + r.height / 2]; }
    function draw() {
      if (!$("#tgrid", root)) return; // navigated away
      const foundCells = new Map();
      for (const w of st.found) { const p = pz.placed.find((x) => x.w === w); p.cells.forEach((c) => foundCells.set(c, p.span ? "span" : "found")); }
      const hintP = st.hinted && !st.found.includes(st.hinted) ? pz.placed.find((x) => x.w === st.hinted) : null;
      cells.forEach((el, i) => {
        el.className = "tcell" + (foundCells.has(i) ? " " + foundCells.get(i) : "") + (sel.includes(i) ? " sel" : "") + (hintP?.cells.includes(i) ? " hinted" : "");
      });
      const g = $("#tgrid", root).getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${g.width} ${g.height}`);
      let lines = "";
      const seg = (arr, cls) => { for (let k = 1; k < arr.length; k++) { const [x1, y1] = center(arr[k - 1]), [x2, y2] = center(arr[k]); lines += `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; } };
      for (const w of st.found) { const p = pz.placed.find((x) => x.w === w); seg(p.cells, p.span ? "ls" : "lf"); }
      seg(sel, "lsel");
      svg.innerHTML = lines;
      $("#tword", root).textContent = sel.map((i) => pz.grid[i]).join("") || " ";
      $("#tprog", root).textContent = `${st.found.length} of ${total} theme words found${st.hints ? ` · ${st.hints} hint${st.hints > 1 ? "s" : ""}` : ""}`;
      if (st.found.length === total) finish();
    }
    function submit() {
      if (sel.length < 3) { sel = []; draw(); return; }
      const word = sel.map((i) => pz.grid[i]).join("");
      const hit = pz.placed.find((p) => p.cells.length === sel.length && p.cells.every((c, k) => c === sel[k]) && !st.found.includes(p.w));
      if (hit) {
        st.found.push(hit.w); st.log.push(hit.span ? "S" : "W"); save();
        $("#tword", root).textContent = hit.span ? `${word} · Spangram!` : word;
        sel = []; draw(); flash(hit.span ? "Spangram!" : "Found");
      } else {
        const taken = pz.placed.find((p) => p.w === word && st.found.includes(p.w));
        sel = []; draw(); flash(taken ? "Already found" : "Not a theme word");
      }
    }
    function flash(t) { const el = $("#tword", root); el.dataset.msg = t; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    let down = false, moved = false, tapSubmit = false;
    threadsAbort?.abort(); threadsAbort = new AbortController();
    const sig = { signal: threadsAbort.signal };
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y)?.closest(".tcell"); return el && root.contains(el) ? +el.dataset.i : null; };
    const used = (i) => st.found.some((w) => pz.placed.find((p) => p.w === w).cells.includes(i));
    $("#tgrid", root).addEventListener("pointerdown", (e) => {
      const i = cellAt(e.clientX, e.clientY); if (i == null || used(i)) return;
      e.preventDefault(); down = true; moved = false;
      tapSubmit = sel.length > 1 && sel[sel.length - 1] === i;
      if (!tapSubmit) { if (sel.length && adj(sel[sel.length - 1], i) && !sel.includes(i)) sel.push(i); else sel = [i]; }
      draw();
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i == null || used(i)) return;
      const last = sel[sel.length - 1];
      if (i === last) return;
      if (sel.length > 1 && i === sel[sel.length - 2]) { sel.pop(); moved = true; draw(); return; }
      if (!sel.includes(i) && adj(last, i)) { sel.push(i); moved = true; draw(); }
    }, sig);
    window.addEventListener("pointerup", () => {
      if (!down) return; down = false;
      if (moved || tapSubmit) submit();
    }, sig);
    $("#tclear", root).onclick = () => { sel = []; draw(); };
    $("#thint", root).onclick = () => {
      const left = pz.placed.filter((p) => !st.found.includes(p.w) && !p.span);
      const target = left[0] || pz.placed.find((p) => !st.found.includes(p.w));
      if (!target) return;
      st.hinted = target.w; st.hints++; st.log.push("H"); save(); draw();
    };
    function finish() {
      if ($("#tdone", root).childElementCount) return;
      if (!playedToday("threads")) record("threads", { hints: st.hints });
      const t = pz.theme;
      const emoji = st.log.map((x) => (x === "S" ? "🟡" : x === "H" ? "💡" : "🔵")).join("");
      const people = pz.placed.filter((p) => p.person).map((p) => C().chip(p.person)).join("");
      $("#tdone", root).innerHTML = `<div class="qcard"><h2>${esc(t.title)}</h2><p>${esc(t.explain || "")} ${t.ref ? `<button class="ref" data-ref="${esc(t.ref)}">${esc(C().refLabel(t.ref))}</button>` : ""}</p>
        <div class="chips">${people}</div><p class="qmeta">Streak: ${streak("threads")} day${streak("threads") === 1 ? "" : "s"}</p><button class="qnext" id="tshare">Share result</button></div>`;
      $("#tshare", root).onclick = (e) => share(`The Daily Catholic · Threads #${dayNumber()}\n“${t.title}”\n${emoji}\n${SITE}`, e.target);
      $("#thint", root).disabled = true;
    }
    new ResizeObserver(draw).observe($("#tgrid", root));
    draw();
  }

  /* =====================================================================
     LINEAGE LINKS — sixteen names, four hidden groups of four.
     ===================================================================== */
  function buildLinks(dk) {
    const R = rng(seedOf("links" + dk));
    const P = C().P;
    const pool = THEMES.filter((t) => t.conn && t.words.filter((w) => w.person && P[w.person]).length >= 4);
    for (let attempt = 0; attempt < 500; attempt++) {
      const chosen = [];
      const byDiff = [1, 2, 3, 4].map((d) => shuffle(R, pool.filter((t) => (t.difficulty || 2) === d)));
      for (let d = 0; d < 4; d++) { const t = byDiff[d].find((x) => !chosen.includes(x)) || pick(R, pool); chosen.push(t); }
      if (new Set(chosen).size < 4) continue;
      const groups = chosen.map((t) => ({ t, items: shuffle(R, t.words.filter((w) => w.person && P[w.person])).slice(0, 4) }));
      const all = groups.flatMap((g) => g.items.map((w) => w.person));
      if (new Set(all).size !== 16) continue;
      if (new Set(groups.flatMap((g) => g.items.map((w) => w.w))).size !== 16) continue;
      // a name may not also fit another chosen group
      const ok = groups.every((g, gi) => groups.every((h, hi) => hi === gi || h.items.every((w) => !(g.t.excl || []).includes(w.person) && !g.t.words.some((x) => x.person === w.person))));
      if (!ok) continue;
      return groups;
    }
    return null;
  }
  function renderLinks(root) {
    const dk = dayKey();
    const groups = buildLinks(dk);
    if (!groups) { root.innerHTML = `<p class="loading">Today's puzzle could not be built. Try again tomorrow.</p>`; return; }
    const P = C().P;
    const key = `bpm.links.${dk}`;
    const st = C().store.get(key, { solved: [], mistakes: 0, guesses: [], order: null });
    const R = rng(seedOf("linksorder" + dk));
    st.order ??= shuffle(R, groups.flatMap((g) => g.items.map((w) => w.person)));
    const save = () => C().store.set(key, st);
    let sel = [];
    const groupOf = (id) => groups.findIndex((g) => g.items.some((w) => w.person === id));
    const label = (id) => { const w = groups.flatMap((g) => g.items).find((x) => x.person === id).w; return w[0] + w.slice(1).toLowerCase(); };
    root.innerHTML = `<div class="game">
      <div class="ghead"><button class="back" data-go="play">‹ Games</button><h1>Lineage Links</h1><span class="qmeta">#${dayNumber()}</span></div>
      <p class="lede">Find four groups of four people who share something: a family, an office, a book, a role in salvation history.</p>
      <div id="lsolved" class="lsolved"></div><div id="lgrid" class="lgrid"></div>
      <p class="qmeta" id="lmist"></p>
      <div class="gbtns"><button id="lshuf" class="ghost">Shuffle</button><button id="ldes" class="ghost">Deselect</button><button id="lsub" class="qnext">Submit</button></div>
      <div id="ldone"></div></div>`;
    function draw() {
      const over = st.solved.length === 4 || st.mistakes >= 4;
      const shownGroups = over ? [...st.solved, ...[0, 1, 2, 3].filter((g) => !st.solved.includes(g))] : st.solved;
      $("#lsolved", root).innerHTML = shownGroups.map((gi) => {
        const g = groups[gi];
        return `<div class="lgroup d${g.t.difficulty || 2}"><b>${esc(g.t.title)}</b><span>${g.items.map((w) => C().chip(w.person)).join(" ")}</span></div>`;
      }).join("");
      const left = st.order.filter((id) => !shownGroups.includes(groupOf(id)));
      $("#lgrid", root).innerHTML = left.map((id) => `<button class="ltile${sel.includes(id) ? " on" : ""}" data-pid="${id}">${esc(label(id))}</button>`).join("");
      $("#lmist", root).innerHTML = over ? "" : `Mistakes left: ${"●".repeat(4 - st.mistakes)}${"○".repeat(st.mistakes)}`;
      $("#lsub", root).disabled = sel.length !== 4 || over;
      root.querySelector(".gbtns").hidden = over;
      if (over) finish();
    }
    $("#lgrid", root).onclick = (e) => {
      const b = e.target.closest(".ltile"); if (!b) return;
      const id = b.dataset.pid;
      if (sel.includes(id)) sel = sel.filter((x) => x !== id); else if (sel.length < 4) sel.push(id);
      draw();
    };
    $("#lshuf", root).onclick = () => { st.order = shuffle(Math.random, st.order); save(); draw(); };
    $("#ldes", root).onclick = () => { sel = []; draw(); };
    $("#lsub", root).onclick = () => {
      const gs = sel.map(groupOf);
      st.guesses.push(gs);
      const counts = {}; gs.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
      const best = Math.max(...Object.values(counts));
      if (best === 4) { st.solved.push(gs[0]); sel = []; }
      else { st.mistakes++; toast(best === 3 ? "One away…" : "Not a group"); }
      save(); draw();
    };
    function toast(t) { $("#lmist", root).dataset.msg = t; const el = $("#lmist", root); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    function finish() {
      if ($("#ldone", root).childElementCount) return;
      const won = st.solved.length === 4;
      if (!playedToday("links")) record("links", { won, mistakes: st.mistakes });
      const sq = ["", "🟨", "🟩", "🟦", "🟪"];
      const grid = st.guesses.map((gs) => gs.map((g) => sq[groups[g].t.difficulty || 2]).join("")).join("\n");
      $("#ldone", root).innerHTML = `<div class="qcard"><h2>${won ? (st.mistakes ? "Solved" : "Perfect!") : "Out of tries"}</h2>
        ${groups.map((g) => `<p><b>${esc(g.t.title)}.</b> ${esc(g.t.explain || "")}</p>`).join("")}
        <p class="qmeta">Streak: ${streak("links")}</p><button class="qnext" id="lshare">Share result</button></div>`;
      $("#lshare", root).onclick = (e) => share(`The Daily Catholic · Lineage Links #${dayNumber()}\n${grid}\n${SITE}`, e.target);
    }
    draw();
  }

  /* =====================================================================
     HIDDEN NAME — an acrostic: solve each clue; the first letters of the
     answers spell a hidden biblical figure.
     ===================================================================== */
  const ALPHA = /^[A-Za-z]+$/;
  function buildAcrostic(dk) {
    const R = rng(seedOf("acrostic" + dk));
    const { PEOPLE } = C();
    const good = PEOPLE.filter((p) => ALPHA.test(p.name) && p.name.length >= 3 && p.name.length <= 10 && p.mentions >= 6 && p.summary.length > 60);
    const byLetter = {};
    for (const p of good) (byLetter[p.name[0].toUpperCase()] ??= []).push(p);
    const hiddenPool = shuffle(R, good.filter((p) => p.name.length >= 4 && p.name.length <= 8 && p.mentions >= 15));
    for (const h of hiddenPool) {
      const used = new Set([h.id]), clues = [];
      for (const ch of h.name.toUpperCase()) {
        const cands = shuffle(R, (byLetter[ch] || []).filter((p) => !used.has(p.id)));
        if (!cands.length) break;
        const c = cands.sort((a, b) => b.mentions - a.mentions)[Math.floor(R() * Math.min(4, cands.length))];
        used.add(c.id); clues.push(c);
      }
      if (clues.length === h.name.length) return { hidden: h, clues };
    }
    return null;
  }
  function maskText(p, text) {
    let t = text;
    for (const n of [p.name, ...p.aliases].filter(Boolean).sort((a, b) => b.length - a.length)) t = t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "▢▢▢");
    return t;
  }
  function firstSentence(t) { const m = /^(.{40,220}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.slice(0, 200); }
  function renderAcrostic(root) {
    const dk = dayKey();
    const pz = buildAcrostic(dk);
    if (!pz) { root.innerHTML = `<p class="loading">Today's puzzle could not be built. Try again tomorrow.</p>`; return; }
    const key = `bpm.acrostic.${dk}`;
    const st = C().store.get(key, { solved: [], reveals: {} });
    const save = () => C().store.set(key, st);
    root.innerHTML = `<div class="game">
      <div class="ghead"><button class="back" data-go="play">‹ Games</button><h1>Hidden Name</h1><span class="qmeta">#${dayNumber()}</span></div>
      <p class="lede">Name each person from the clue. The first letters of the answers spell a hidden figure from Scripture.</p>
      <div class="ahidden" id="ahid"></div>
      <ol class="aclues" id="aclues"></ol>
      <div id="adone"></div></div>`;
    $("#aclues", root).innerHTML = pz.clues.map((p, i) => `
      <li class="aclue" data-i="${i}">
        <p>${esc(maskText(p, firstSentence(p.summary)))}</p>
        <div class="arow"><input id="ac${i}" class="ain" maxlength="${p.name.length}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Answer ${i + 1}, ${p.name.length} letters" placeholder="${"_ ".repeat(p.name.length).trim()}">
        <span class="qmeta">${p.name.length} letters</span><button class="ghost small" data-hint="${i}">Hint</button></div>
        <p class="qmeta ahint" id="ah${i}"></p>
      </li>`).join("");
    function draw() {
      $("#ahid", root).innerHTML = pz.clues.map((p, i) => `<span class="${st.solved.includes(i) ? "on" : ""}">${st.solved.includes(i) ? p.name[0].toUpperCase() : ""}</span>`).join("");
      pz.clues.forEach((p, i) => {
        const inp = $(`#ac${i}`, root), done = st.solved.includes(i);
        if (done) { inp.value = p.name.toUpperCase(); inp.disabled = true; inp.closest(".aclue").classList.add("ok"); }
        const r = st.reveals[i] || 0;
        $(`#ah${i}`, root).textContent = r ? (r === 1 ? `Role: ${p.role}` : `Starts with ${p.name.slice(0, r - 1).toUpperCase()}…  ·  Role: ${p.role}`) : "";
      });
      if (st.solved.length === pz.clues.length) finish();
    }
    $("#aclues", root).addEventListener("input", (e) => {
      const inp = e.target.closest(".ain"); if (!inp) return;
      const i = +inp.closest(".aclue").dataset.i, p = pz.clues[i];
      const v = inp.value.trim().toLowerCase();
      if ([p.name, ...p.aliases].some((n) => n.toLowerCase() === v)) {
        st.solved.push(i); save(); draw();
        const next = root.querySelector(".ain:not(:disabled)"); next?.focus();
      }
    });
    $("#aclues", root).addEventListener("click", (e) => {
      const b = e.target.closest("[data-hint]"); if (!b) return;
      const i = +b.dataset.hint;
      st.reveals[i] = Math.min((st.reveals[i] || 0) + 1, pz.clues[i].name.length);
      save(); draw();
    });
    function finish() {
      if ($("#adone", root).childElementCount) return;
      const hints = Object.values(st.reveals).reduce((a, b) => a + b, 0);
      if (!playedToday("acrostic")) record("acrostic", { hints });
      const h = pz.hidden;
      $("#adone", root).innerHTML = `<div class="qcard"><span class="eyebrow">The hidden name</span><h2>${esc(h.name)}</h2><p>${esc(h.summary)}</p>
        <div class="chips">${C().chip(h.id)}${pz.clues.map((p) => C().chip(p.id)).join("")}</div>
        <p class="qmeta">${hints ? `${hints} hint${hints > 1 ? "s" : ""} used · ` : "No hints! · "}Streak: ${streak("acrostic")}</p><button class="qnext" id="ashare">Share result</button></div>`;
      $("#ashare", root).onclick = (e) => share(`The Daily Catholic · Hidden Name #${dayNumber()}\n${pz.clues.map((_, i) => (st.reveals[i] ? "🟨" : "🟩")).join("")} ${h.name.length} letters\n${SITE}`, e.target);
    }
    draw();
  }

  /* =====================================================================
     HOLY LAND TAP — five events a day; tap where they happened.
     ===================================================================== */
  const EXTENTS = {
    near: { box: [33.6, 29.3, 37.2, 33.9], full: 4, zero: 90, label: "The Holy Land" },
    wide: { box: [9, 21, 56, 44], full: 30, zero: 1100, label: "The biblical world" },
  };
  function haversine(a, b) {
    const R = 6371, t = Math.PI / 180;
    const dLat = (b[1] - a[1]) * t, dLon = (b[0] - a[0]) * t;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function inBox(p, box) { return p.lon >= box[0] && p.lon <= box[2] && p.lat >= box[1] && p.lat <= box[3]; }
  function buildTap(dk) {
    const R = rng(seedOf("tap" + dk));
    const near = PLACES.filter((p) => inBox(p, EXTENTS.near.box) && p.certainty !== "traditional" || (inBox(p, EXTENTS.near.box) && R() < 0.3));
    const far = PLACES.filter((p) => !inBox(p, EXTENTS.near.box));
    const picks = [...shuffle(R, near).slice(0, 3), ...shuffle(R, far).slice(0, 2)];
    return shuffle(R, picks).map((pl) => ({ place: pl, event: pick(R, pl.events), ext: inBox(pl, EXTENTS.near.box) ? "near" : "wide" }));
  }
  async function renderTap(root) {
    root.innerHTML = `<p class="loading">Loading the map…</p>`;
    [PLACES, GEO] = await Promise.all([PLACES || C().getJSON("data/places.json"), GEO || C().getJSON("data/geo.json")]);
    const dk = dayKey();
    const rounds = buildTap(dk);
    const key = `bpm.tap.${dk}`;
    const st = C().store.get(key, { i: 0, guesses: [] });
    const save = () => C().store.set(key, st);
    root.innerHTML = `<div class="game">
      <div class="ghead"><button class="back" data-go="play">‹ Games</button><h1>Holy Land Tap</h1><span class="qmeta">#${dayNumber()}</span></div>
      <div class="tapq" id="tapq"></div>
      <div class="tapmap"><svg id="tapsvg" role="img" aria-label="Map"></svg><div class="maptag" id="maptag"></div></div>
      <div class="tapbar" id="tapbar"></div>
      <div id="tapdone"></div></div>`;
    const svgEl = $("#tapsvg", root);
    const svg = d3.select(svgEl);
    let pin = null, proj, path, zoomT = d3.zoomIdentity;
    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([1, 12]).on("zoom", (e) => { zoomT = e.transform; g.attr("transform", zoomT); g.selectAll(".dot,.pin,.ans").attr("r", 6 / zoomT.k).attr("stroke-width", 2 / zoomT.k); g.selectAll(".gline").attr("stroke-width", 2 / zoomT.k); g.selectAll(".plabel").attr("font-size", 13 / zoomT.k); });
    svg.call(zoom);
    function score(d, ext) { const e = EXTENTS[ext]; if (d <= e.full) return 1000; return Math.round(1000 * Math.max(0, 1 - (d - e.full) / (e.zero - e.full)) ** 1.6); }
    function drawMap(ext) {
      const W = svgEl.clientWidth || 600, H = svgEl.clientHeight || 500;
      svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const b = EXTENTS[ext].box;
      const boxGeo = { type: "MultiPoint", coordinates: [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]] };
      proj = d3.geoMercator().fitSize([W, H], boxGeo);
      path = d3.geoPath(proj);
      g.selectAll("*").remove();
      g.append("rect").attr("class", "sea").attr("x", -W * 5).attr("y", -H * 5).attr("width", W * 11).attr("height", H * 11);
      g.append("path").attr("class", "land").attr("d", path(GEO.land));
      g.selectAll(".lake").data(GEO.water.features).join("path").attr("class", "lake").attr("d", path);
      g.append("path").attr("class", "river").attr("d", d3.line()(GEO.jordan.map((p) => proj(p))));
      svg.call(zoom.transform, d3.zoomIdentity);
      $("#maptag", root).textContent = EXTENTS[ext].label + " · pinch or scroll to zoom";
    }
    function show() {
      const done = st.guesses.length >= rounds.length;
      if (done) return finish();
      const r = rounds[st.i];
      const answered = st.guesses.length > st.i;
      $("#tapq", root).innerHTML = `<span class="eyebrow">Round ${st.i + 1} of ${rounds.length}</span><b>${esc(r.event.q)}</b>`;
      drawMap(r.ext);
      pin = null;
      if (answered) reveal(); else $("#tapbar", root).innerHTML = `<span class="qmeta">Tap the map to drop a pin.</span><button class="qnext" id="tapok" disabled>Lock in</button>`;
      const ok = $("#tapok", root); if (ok) ok.onclick = lock;
    }
    svg.on("click", (e) => {
      if (st.guesses.length > st.i) return;
      const [mx, my] = zoomT.invert(d3.pointer(e, svgEl));
      const [lon, lat] = proj.invert([mx, my]);
      pin = [lon, lat];
      g.selectAll(".pin").remove();
      g.append("circle").attr("class", "pin").attr("cx", mx).attr("cy", my).attr("r", 6 / zoomT.k).attr("stroke-width", 2 / zoomT.k);
      const b = $("#tapok", root); if (b) b.disabled = false;
    });
    function lock() {
      if (!pin) return;
      const r = rounds[st.i];
      const d = haversine(pin, [r.place.lon, r.place.lat]);
      st.guesses.push({ pin, d, s: score(d, r.ext) }); save(); reveal();
    }
    function reveal() {
      const r = rounds[st.i], gs = st.guesses[st.i];
      const a = proj([r.place.lon, r.place.lat]), p = proj(gs.pin);
      g.selectAll(".pin,.ans,.gline,.plabel").remove();
      g.append("line").attr("class", "gline").attr("x1", p[0]).attr("y1", p[1]).attr("x2", a[0]).attr("y2", a[1]).attr("stroke-width", 2 / zoomT.k);
      g.append("circle").attr("class", "pin").attr("cx", p[0]).attr("cy", p[1]).attr("r", 6 / zoomT.k);
      g.append("circle").attr("class", "ans").attr("cx", a[0]).attr("cy", a[1]).attr("r", 6 / zoomT.k);
      g.append("text").attr("class", "plabel").attr("x", a[0] + 9).attr("y", a[1] + 4).attr("font-size", 13 / zoomT.k).text(r.place.name);
      const people = (r.event.people || []).filter((id) => C().P[id]).map((id) => C().chip(id)).join("");
      $("#tapbar", root).innerHTML = `<div class="tapres"><div><b>${esc(r.place.name)}</b> · ${gs.d < 1 ? "spot on" : `${Math.round(gs.d)} km away`} · <b>${gs.s}</b> pts</div>
        <p class="qmeta">${esc(r.place.note || "")}${r.place.certainty !== "known" ? ` (${r.place.certainty} location)` : ""}</p>
        <div class="chips">${people}<button class="ref" data-ref="${esc(r.event.ref)}">${esc(C().refLabel(r.event.ref))}</button></div>
        <button class="qnext" id="tapnext">${st.i + 1 < rounds.length ? "Next round" : "See score"}</button></div>`;
      $("#tapnext", root).onclick = () => { st.i++; save(); show(); };
    }
    function finish() {
      const total = st.guesses.reduce((a, x) => a + x.s, 0);
      if (!playedToday("tap")) record("tap", { score: total });
      const bar = (s) => (s >= 900 ? "🟩" : s >= 500 ? "🟨" : s > 0 ? "🟧" : "⬛");
      $("#tapq", root).innerHTML = `<span class="eyebrow">Final score</span><b>${total.toLocaleString()} / 5,000</b>`;
      root.querySelector(".tapmap").hidden = true;
      $("#tapbar", root).innerHTML = "";
      $("#tapdone", root).innerHTML = `<div class="qcard">${rounds.map((r, i) => `<p>${bar(st.guesses[i].s)} <b>${esc(r.place.name)}</b>: ${esc(r.event.q)} <span class="qmeta">${Math.round(st.guesses[i].d)} km · ${st.guesses[i].s} pts</span></p>`).join("")}
        <p class="qmeta">Streak: ${streak("tap")}</p><button class="qnext" id="tapshare">Share result</button></div>`;
      $("#tapshare", root).onclick = (e) => share(`The Daily Catholic · Holy Land Tap #${dayNumber()}\n${st.guesses.map((x) => bar(x.s)).join("")} ${total}/5000\n${SITE}`, e.target);
    }
    new ResizeObserver(() => { if (svgEl.isConnected && st.guesses.length < rounds.length) show(); }).observe(svgEl);
    show();
  }

  /* =====================================================================
     HUB
     ===================================================================== */
  const GAMES = [
    { id: "threads", name: "Threads", desc: "Find the hidden names in a grid of letters. One spangram names today's theme.", needs: "themes" },
    { id: "links", name: "Lineage Links", desc: "Sixteen people, four hidden groups. Find what connects them.", needs: "themes" },
    { id: "acrostic", name: "Hidden Name", desc: "Solve the clues; their first letters spell a mystery figure.", needs: null },
    { id: "tap", name: "Holy Land Tap", desc: "Five moments from Scripture. Tap where on the map they happened.", needs: "places" },
    { id: "quiz", name: "Daily Quiz", desc: "Five questions on who's who, in three difficulty levels.", needs: null },
  ];
  function renderHub(root) {
    const ctx = C();
    const explored = ctx.explored();
    const badges = ctx.badges();
    root.innerHTML = `<div class="hub">
      <div class="ghead"><h1>Play</h1><span class="qmeta">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · new puzzles every day</span></div>
      <div class="gcards">${GAMES.map((g) => {
        const done = playedToday(g.id), s = streak(g.id);
        return `<button class="gcard" data-go="${g.id}"><span class="gname">${g.name}</span><span class="gdesc">${g.desc}</span>
          <span class="gstat">${done ? "✓ Played today" : "Ready"}${s ? ` · ${s}-day streak` : ""}</span></button>`;
      }).join("")}</div>
      <h2>Your progress</h2>
      <p class="qmeta">You've opened ${explored} of ${ctx.PEOPLE.length} people.</p>
      <div class="badges">${badges.map((b) => `<div class="badge${b.got ? " got" : ""}"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join("")}</div>
    </div>`;
  }

  async function mount(view, root) {
    try {
      if (view === "play") return renderHub(root);
      if (view === "threads" || view === "links") { await themes(); return view === "threads" ? renderThreads(root) : renderLinks(root); }
      if (view === "acrostic") return renderAcrostic(root);
      if (view === "tap") return renderTap(root);
    } catch (e) {
      root.innerHTML = `<p class="loading">This game could not load (${esc(e.message)}). Reload to try again.</p>`;
    }
  }
  window.BPM_GAMES = { mount, playedToday, streak, GAMES, dayKey, _build: { threads: buildThreads, links: buildLinks, acrostic: buildAcrostic } };
})();
