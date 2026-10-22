/* Daily games: Threads (word-path search), Lineage Links (group four), Hidden Name (acrostic),
   Holy Land Tap (map). Everything is seeded by the local date so everyone gets the same puzzle. */
(() => {
  "use strict";
  const C = () => window.BPM; // shared context from app.js
  const SITE = window.BPM_CONFIG?.siteUrl || "https://scarusillo.github.io/Daily-Catholic/";
  const X = (en, es) => (window.I18N?.lang === "es" ? es : en);
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
     THREADS — find the theme words hidden as letter paths; the golden thread
     names the theme and touches two opposite sides of the grid.
     ===================================================================== */
  const COLS = 7;
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
      for (const rows of [7, 6]) {
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
        <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Threads</h1><span class="qmeta">#${dayNumber()}</span></div>
        <div class="tclue"><span class="eyebrow">${X("Today's theme", "Tema de hoy")}</span><b>${esc(pz.theme.clue || pz.theme.title)}</b></div>
        <p class="qmeta" id="tprog"></p>
        <div class="tgrid-wrap"><svg class="tlines" id="tlines"></svg><div class="tgrid" id="tgrid" style="grid-template-rows:repeat(${pz.rows},1fr)">${pz.grid.map((ch, i) => `<button class="tcell" data-i="${i}" aria-label="${ch}">${ch}</button>`).join("")}</div></div>
        <div class="tword" id="tword" aria-live="polite">&nbsp;</div>
        <div class="gbtns"><button id="thint" class="ghost">${X("Hint", "Pista")}</button><button id="tclear" class="ghost">${X("Clear", "Borrar")}</button></div>
        <div id="tdone"></div>
        <p class="gfoot">Drag across touching letters (any direction, diagonals too), or tap letters one by one and tap the last letter again to submit. Every letter belongs to exactly one word. The <b>golden thread</b> names the theme and runs from one edge of the board to the opposite edge.</p>
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
        $("#tword", root).textContent = hit.span ? `${word} · ${X("Golden thread!", "¡Hilo de oro!")}` : word;
        sel = []; draw(); flash(hit.span ? X("Golden thread!", "¡Hilo de oro!") : X("Found", "¡Encontrada!"));
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
      const emoji = st.log.map((x) => (x === "S" ? "✨" : x === "H" ? "🕯️" : "🧵")).join("");
      const people = pz.placed.filter((p) => p.person).map((p) => C().chip(p.person)).join("");
      $("#tdone", root).innerHTML = `<div class="qcard"><h2>${esc(t.title)}</h2><p>${esc(t.explain || "")} ${t.ref ? `<button class="ref" data-ref="${esc(t.ref)}">${esc(C().refLabel(t.ref))}</button>` : ""}</p>
        <div class="chips">${people}</div><p class="qmeta">${X("Streak", "Racha")}: ${streak("threads")} day${streak("threads") === 1 ? "" : "s"}</p><button class="qnext" id="tshare">${X("Share result", "Compartir resultado")}</button></div>`;
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
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Lineage Links</h1><span class="qmeta">#${dayNumber()}</span></div>
      <p class="lede">${X("Find four groups of four people who share something: a family, an office, a book, a role in salvation history.", "Encuentra cuatro grupos de cuatro personas que tienen algo en común: una familia, un oficio, un libro, un papel en la historia de la salvación.")}</p>
      <div id="lsolved" class="lsolved"></div><div id="lgrid" class="lgrid"></div>
      <p class="qmeta" id="lmist"></p>
      <div class="gbtns"><button id="lshuf" class="ghost">${X("Shuffle", "Mezclar")}</button><button id="ldes" class="ghost">${X("Deselect", "Quitar selección")}</button><button id="lsub" class="qnext">Submit</button></div>
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
      $("#lmist", root).innerHTML = over ? "" : `${X("Mistakes left", "Errores restantes")}: ${"●".repeat(4 - st.mistakes)}${"○".repeat(st.mistakes)}`;
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
      const sq = ["", "⚪", "🟢", "🔴", "🟣"];
      const grid = st.guesses.map((gs) => gs.map((g) => sq[groups[g].t.difficulty || 2]).join("")).join("\n");
      $("#ldone", root).innerHTML = `<div class="qcard"><h2>${won ? (st.mistakes ? "Solved" : "Perfect!") : "Out of tries"}</h2>
        ${groups.map((g) => `<p><b>${esc(g.t.title)}.</b> ${esc(g.t.explain || "")}</p>`).join("")}
        <p class="qmeta">${X("Streak", "Racha")}: ${streak("links")}</p><button class="qnext" id="lshare">${X("Share result", "Compartir resultado")}</button></div>`;
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
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Hidden Name</h1><span class="qmeta">#${dayNumber()}</span></div>
      <p class="lede">${X("Name each person from the clue. The first letters of the answers spell a hidden figure from Scripture.", "Nombra a cada persona según la pista. Las primeras letras de las respuestas forman el nombre de un personaje bíblico oculto.")}</p>
      <div class="ahidden" id="ahid"></div>
      <ol class="aclues" id="aclues"></ol>
      <div id="adone"></div></div>`;
    $("#aclues", root).innerHTML = pz.clues.map((p, i) => `
      <li class="aclue" data-i="${i}">
        <p>${esc(maskText(p, firstSentence(p.summary)))}</p>
        <div class="arow"><input id="ac${i}" class="ain" maxlength="${p.name.length}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Answer ${i + 1}, ${p.name.length} letters" placeholder="${"_ ".repeat(p.name.length).trim()}">
        <span class="qmeta">${p.name.length} ${X("letters", "letras")}</span><button class="ghost small" data-hint="${i}">${X("Hint", "Pista")}</button></div>
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
        <p class="qmeta">${hints ? `${hints} hint${hints > 1 ? "s" : ""} used · ` : "No hints! · "}${X("Streak", "Racha")}: ${streak("acrostic")}</p><button class="qnext" id="ashare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#ashare", root).onclick = (e) => share(`The Daily Catholic · Hidden Name #${dayNumber()}\n${pz.clues.map((_, i) => (st.reveals[i] ? "🕯️" : "✝️")).join("")} ${h.name.length} letters\n${SITE}`, e.target);
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
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Holy Land Tap</h1><span class="qmeta">#${dayNumber()}</span></div>
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
      if (answered) reveal(); else $("#tapbar", root).innerHTML = `<span class="qmeta">${X("Tap the map to drop a pin.", "Toca el mapa para marcar un punto.")}</span><button class="qnext" id="tapok" disabled>Lock in</button>`;
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
        <button class="qnext" id="tapnext">${st.i + 1 < rounds.length ? X("Next round", "Siguiente ronda") : X("See score", "Ver puntuación")}</button></div>`;
      $("#tapnext", root).onclick = () => { st.i++; save(); show(); };
    }
    function finish() {
      const total = st.guesses.reduce((a, x) => a + x.s, 0);
      if (!playedToday("tap")) record("tap", { score: total });
      const bar = (s) => (s >= 900 ? "📍" : s >= 500 ? "🧭" : s > 0 ? "🐾" : "▫️");
      $("#tapq", root).innerHTML = `<span class="eyebrow">Final score</span><b>${total.toLocaleString()} / 5,000</b>`;
      root.querySelector(".tapmap").hidden = true;
      $("#tapbar", root).innerHTML = "";
      $("#tapdone", root).innerHTML = `<div class="qcard">${rounds.map((r, i) => `<p>${bar(st.guesses[i].s)} <b>${esc(r.place.name)}</b>: ${esc(r.event.q)} <span class="qmeta">${Math.round(st.guesses[i].d)} km · ${st.guesses[i].s} pts</span></p>`).join("")}
        <p class="qmeta">${X("Streak", "Racha")}: ${streak("tap")}</p><button class="qnext" id="tapshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#tapshare", root).onclick = (e) => share(`The Daily Catholic · Holy Land Tap #${dayNumber()}\n${st.guesses.map((x) => bar(x.s)).join("")} ${total}/5000\n${SITE}`, e.target);
    }
    new ResizeObserver(() => { if (svgEl.isConnected && st.guesses.length < rounds.length) show(); }).observe(svgEl);
    show();
  }


  /* =====================================================================
     FIVE LOAVES — guess the five-letter word of the day in six tries.
     ===================================================================== */
  let WORDLE = null, WORDLE_ES = null, loavesAbort = null;
  function scoreGuess(g, ans) {
    const res = Array(5).fill("absent"), left = {};
    for (let i = 0; i < 5; i++) if (g[i] === ans[i]) res[i] = "correct"; else left[ans[i]] = (left[ans[i]] || 0) + 1;
    for (let i = 0; i < 5; i++) if (res[i] !== "correct" && left[g[i]]) { res[i] = "present"; left[g[i]]--; }
    return res;
  }
  async function renderLoaves(root) {
    root.innerHTML = `<p class="loading">Loading…</p>`;
    const es = window.I18N?.lang === "es";
    let W;
    if (es) { WORDLE_ES ??= await C().getJSON("data/wordle_es.json").catch(() => null); W = WORDLE_ES; }
    if (!W) { WORDLE ??= await C().getJSON("data/wordle.json"); W = WORDLE; }
    const spanish = W === WORDLE_ES;
    const VALID = new Set(W.valid);
    const n = dayNumber();
    const ans = W.answers[((n - 1) % W.answers.length + W.answers.length) % W.answers.length];
    const key = `bpm.loaves.${spanish ? "es." : ""}${dayKey()}`;
    const st = C().store.get(key, { guesses: [] });
    const save = () => C().store.set(key, st);
    let cur = "";
    const KB = spanish ? ["QWERTYUIOP", "ASDFGHJKLÑ", "↵ZXCVBNM⌫"] : ["QWERTYUIOP", "ASDFGHJKL", "↵ZXCVBNM⌫"];
    root.innerHTML = `<div class="game loaves">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Five Loaves</h1><span class="qmeta">#${n}</span></div>
      <p class="lede">${X("Guess today's five-letter word of faith in six tries. It may be a word from the Mass, the Bible or Church life, or a person from Scripture.", "Adivina la palabra de fe de hoy, de cinco letras, en seis intentos: términos de la Misa, la Biblia, la vida de la Iglesia o personajes bíblicos. Los acentos no cuentan.")}</p>
      <div class="wgrid" id="wgrid"></div>
      <p class="tword" id="wmsg">&nbsp;</p>
      <div class="kb" id="kb">${KB.map((r) => `<div class="kbrow">${[...r].map((k) => `<button data-k="${k}" class="${k === "↵" || k === "⌫" ? "wide" : ""}" aria-label="${k === "↵" ? "Enter" : k === "⌫" ? "Delete" : k}">${k === "↵" ? "Enter" : k}</button>`).join("")}</div>`).join("")}</div>
      <div id="wdone"></div></div>`;
    const over = () => st.guesses.includes(ans.w) || st.guesses.length >= 6;
    function draw() {
      const rows = [];
      for (let r = 0; r < 6; r++) {
        const g = st.guesses[r], live = r === st.guesses.length && !over();
        const letters = g ? [...g] : live ? [...cur.padEnd(5)] : [..."     "];
        const sc = g ? scoreGuess(g, ans.w) : [];
        rows.push(`<div class="wrow">${letters.map((ch, i) => `<span class="wt ${sc[i] || (ch.trim() ? "filled" : "")}">${ch.trim()}</span>`).join("")}</div>`);
      }
      $("#wgrid", root).innerHTML = rows.join("");
      const best = {};
      const rank = { correct: 3, present: 2, absent: 1 };
      for (const g of st.guesses) scoreGuess(g, ans.w).forEach((v, i) => { if ((rank[v] || 0) > (rank[best[g[i]]] || 0)) best[g[i]] = v; });
      root.querySelectorAll("#kb button").forEach((b) => { b.className = (b.className.includes("wide") ? "wide " : "") + (best[b.dataset.k] || ""); });
      if (over()) finish();
    }
    function msg(t) { const el = $("#wmsg", root); el.textContent = t; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    function press(k) {
      if (over()) return;
      if (k === "⌫") cur = cur.slice(0, -1);
      else if (k === "↵") {
        if (cur.length < 5) return msg(X("Not enough letters", "Faltan letras"));
        if (!VALID.has(cur)) return msg(X("Not in the word list", "No está en la lista de palabras"));
        st.guesses.push(cur); cur = ""; save();
        if (st.guesses.at(-1) === ans.w) msg((spanish ? ["¡Milagroso!", "¡Glorioso!", "¡Maravilloso!", "¡Muy bien!", "¡Bien!", "¡Uf!"] : ["Miraculous!", "Glorious!", "Wonderful!", "Well done!", "Good!", "Phew!"])[st.guesses.length - 1]);
        else $("#wmsg", root).textContent = " ";
      } else if (/^[A-ZÑ]$/.test(k) && cur.length < 5) cur += k;
      draw();
    }
    $("#kb", root).addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) press(b.dataset.k); });
    loavesAbort?.abort(); loavesAbort = new AbortController();
    window.addEventListener("keydown", (e) => {
      if (!root.isConnected || root.closest("[hidden]") || e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input,textarea,select")) return;
      if (e.key === "Enter") press("↵"); else if (e.key === "Backspace") press("⌫"); else if (/^[a-zñ]$/i.test(e.key)) press(e.key.toUpperCase()); else return;
      e.preventDefault();
    }, { signal: loavesAbort.signal });
    function finish() {
      if ($("#wdone", root).childElementCount) return;
      const won = st.guesses.includes(ans.w);
      if (!playedToday("loaves")) record("loaves", { won, tries: st.guesses.length });
      $("#kb", root).hidden = true;
      const grid = st.guesses.map((g) => scoreGuess(g, ans.w).map((v) => (v === "correct" ? "🍞" : v === "present" ? "🐟" : "▫️")).join("")).join("\n");
      $("#wdone", root).innerHTML = `<div class="qcard"><span class="eyebrow">${won ? X(`Solved in ${st.guesses.length}`, `Resuelto en ${st.guesses.length}`) : X("Today's word", "La palabra de hoy")}</span><h2>${esc(ans.shown || ans.w)}</h2>
        <p>${esc(ans.explain)}</p>
        <div class="chips">${ans.person ? C().chip(ans.person) : ""}${ans.ref ? `<button class="ref" data-ref="${esc(ans.ref)}">${esc(C().refLabel(ans.ref))}</button>` : ""}</div>
        <p class="qmeta">${X("Streak", "Racha")}: ${streak("loaves")}</p><button class="qnext" id="wshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#wshare", root).onclick = (e) => share(`The Daily Catholic · Five Loaves #${n} ${won ? st.guesses.length : "X"}/6\n${grid}\n${SITE}`, e.target);
    }
    draw();
  }


  /* =====================================================================
     PILGRIMAGE — our own daily game. A hidden figure from Scripture; four
     stations (Word, Place, Verse, Family) each unlock a clue. Name the
     pilgrim as early as you can. Candles measure how well you did.
     ===================================================================== */
  const WORD_RE = /[A-Za-z]+/g;
  function pickPilgrim(dk) {
    const R = rng(seedOf("pilgrim" + dk));
    const P = C().P;
    const atPlace = {};
    for (const pl of PLACES) for (const ev of pl.events) for (const id of ev.people || []) (atPlace[id] ??= []).push({ pl, ev });
    const rel = (p) => [p.father, p.mother, ...p.spouses, ...p.children].filter((x) => x && P[x]);
    const cands = C().PEOPLE.filter((p) => atPlace[p.id] && /^[A-Za-z]{3,10}$/.test(p.name) && p.mentions >= 12 && p.summary.length > 100 && p.keyPassages.length && rel(p).length >= 2);
    // a fixed shuffled rotation, so nobody repeats until everyone has had a day
    const order = shuffle(rng(seedOf("pilgrim-rotation-v1")), cands.sort((x, y) => (x.id < y.id ? -1 : 1)));
    const idx = Math.floor((Date.parse(dk) - Date.parse("2026-10-20")) / 864e5);
    const p = order[((idx % order.length) + order.length) % order.length];
    const names = [p.name, ...p.aliases].filter(Boolean);
    const mask = (t) => names.reduce((acc, n) => acc.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "▢▢▢"), t);
    // Word station: a telling word from their role or story (not their name)
    const bad = new Set(["which", "their", "there", "about", "after", "later", "first", "where", "would", "under", "whose", "other", "being", "these", "those", "should", "could", "shall", "before", "because", "against", "among", "every", "while", "until", "upon", "unto", "therefore", "himself", "herself", "themselves", "people", "great", "things", "again", "whom", "what", "when", "also", "into", "from", "with", "said", "says", "saying"]);
    const pool = [...(p.role.match(WORD_RE) || []), ...(p.summary.match(WORD_RE) || [])].filter((w) => w.length >= 5 && w.length <= 9 && !bad.has(w.toLowerCase()) && !names.some((n) => n.toLowerCase() === w.toLowerCase()) && w[0] === w[0].toLowerCase() || /^(King|Prophet|Patriarch|Judge|Priest|Apostle|Queen|Matriarch)$/.test(w));
    const roleWords = (p.role.match(WORD_RE) || []).filter((w) => w.length >= 4 && w.length <= 10 && !names.some((n) => n.toLowerCase() === w.toLowerCase()) && !/^(of|the|and|son|daughter|wife|husband|father|mother|brother|sister)$/i.test(w));
    const word = (roleWords.sort((a, b) => b.length - a.length)[0] || pool.sort((a, b) => b.length - a.length)[Math.floor(R() * Math.min(4, pool.length))] || "faith").toUpperCase();
    let scr = word; for (let i = 0; i < 20 && scr === word; i++) scr = shuffle(R, [...word]).join("");
    // Place station
    const { pl, ev } = atPlace[p.id][Math.floor(R() * atPlace[p.id].length)];
    // Verse station: a key-passage verse naming them; blank another word, 4 choices
    const verses = [];
    for (const ref of p.keyPassages) { const r = C().parseRef(ref); if (r) for (const v of C().verses(r)) if (names.some((n) => v.t.includes(n))) verses.push({ ...v, b: r.b }); }
    const vv = verses.length ? verses[Math.floor(R() * verses.length)] : null;
    let verse = null;
    if (vv) {
      const words = (vv.t.match(/[A-Za-z]{5,}/g) || []).filter((w) => !names.includes(w) && !bad.has(w.toLowerCase()));
      if (words.length) {
        const ans = words[Math.floor(R() * words.length)];
        const decoys = [...new Set(shuffle(R, C().PEOPLE.slice(0, 400).flatMap((x) => (x.summary.match(/\b[a-z]{5,9}\b/g) || []))
          .filter((w) => !bad.has(w) && w !== ans.toLowerCase() && Math.abs(w.length - ans.length) <= 2)))].slice(0, 3);
        verse = { ref: `${vv.b} ${vv.c}:${vv.v}`, text: mask(vv.t).replace(new RegExp(`\\b${ans}\\b`), "_____"), ans, opts: shuffle(R, [ans, ...decoys.map((d) => (ans[0] === ans[0].toUpperCase() ? d[0].toUpperCase() + d.slice(1) : d))]) };
      }
    }
    // Family station
    const fam = rel(p);
    const famIds = new Set(fam);
    const decoyPeople = shuffle(R, C().PEOPLE.filter((x) => x.era === p.era && x.id !== p.id && !famIds.has(x.id) && x.mentions >= 5 && !rel(x).includes(p.id))).slice(0, 6 - Math.min(fam.length, 3));
    const famPick = shuffle(R, fam).slice(0, 3);
    const family = { right: famPick, opts: shuffle(R, [...famPick, ...decoyPeople.map((x) => x.id)]) };
    return { p, names, mask, word, scr, pl, ev, verse, family };
  }
  async function renderPilgrimage(root) {
    root.innerHTML = `<p class="loading">…</p>`;
    [PLACES, GEO] = await Promise.all([PLACES || C().getJSON("data/places.json"), GEO || C().getJSON("data/geo.json")]);
    await C().loadBible();
    const dk = dayKey(), n = dayNumber();
    const g = pickPilgrim(dk);
    const P = C().P;
    const key = `bpm.pilgrim.${dk}`;
    const st = C().store.get(key, { done: {}, good: {}, guesses: [], won: false, station: 0 });
    const save = () => C().store.set(key, st);
    const STATIONS = [
      { id: "word", icon: "✠", name: X("The Word", "La Palabra"), hint: X("Unscramble a word from this person's story.", "Ordena las letras de una palabra de su historia.") },
      { id: "place", icon: "⌖", name: X("The Place", "El Lugar"), hint: X("Find on the map where part of their story happened.", "Encuentra en el mapa dónde ocurrió parte de su historia.") },
      { id: "verse", icon: "¶", name: X("The Verse", "El Versículo"), hint: X("Complete a verse that speaks of them.", "Completa un versículo que habla de esta persona.") },
      { id: "family", icon: "⚭", name: X("The Family", "La Familia"), hint: X("Pick out their relatives.", "Elige a sus familiares.") },
    ].filter((x) => x.id !== "verse" || g.verse);
    const candles = () => Math.max(0, STATIONS.filter((x) => st.good[x.id]).length + (st.won ? 1 : 0) + (st.won && st.wonEarly ? 1 : 0) - st.guesses.filter((x) => x !== "✓").length);
    const maxC = STATIONS.length + 2;
    const over = () => st.won || st.guesses.filter((x) => x !== "✓").length >= 3 && Object.keys(st.done).length >= STATIONS.length;
    const clue = (id) => ({
      word: `${X("Role", "Función")}: ${g.mask(g.p.role)} · ${X("Era", "Época")}: ${g.p.era}`,
      place: `${g.mask(g.ev.q.replace(/^(Where|Dónde)\s*/i, ""))} ${X("It happened at", "Ocurrió en")} ${g.pl.name}.`,
      verse: g.verse ? `${g.verse.text.replace("_____", g.verse.ans)} (${C().refLabel(g.verse.ref)})` : "",
      family: `${X("Relatives", "Familiares")}: ${g.family.right.map((id) => P[id].name).join(", ")}`,
    }[id]);
    root.innerHTML = `<div class="game pilgrim">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>${X("Pilgrimage", "Peregrinación")}</h1><span class="qmeta">#${n}</span></div>
      <p class="lede">${X("Someone from Scripture is today's pilgrim. Visit the four stations; each one you complete reveals a clue. Name the pilgrim as early as you can to light more candles.", "Un personaje de la Escritura es el peregrino de hoy. Visita las cuatro estaciones; cada una que completes revela una pista. Adivina quién es lo antes posible para encender más velas.")}</p>
      <div class="candles" id="pcand"></div>
      <ol class="stations" id="pst"></ol>
      <div class="pguess" id="pguess"></div>
      <div id="pdone"></div></div>`;
    function drawCandles() { const c = candles(); $("#pcand", root).innerHTML = Array.from({ length: maxC }, (_, i) => `<span class="cdl ${i < c ? "lit" : ""}" aria-hidden="true"></span>`).join("") + `<span class="qmeta">${c} / ${maxC} ${X("candles", "velas")}</span>`; }
    function drawStations() {
      $("#pst", root).innerHTML = STATIONS.map((x, i) => {
        const done = st.done[x.id];
        return `<li class="station${done ? " done" : ""}${!done && !over() && i === firstOpen() ? " open" : ""}" data-st="${x.id}">
          <div class="sthead"><span class="sticon">${x.icon}</span><b>${esc(x.name)}</b>${done ? `<span class="qmeta">${st.good[x.id] ? "✓" : "·"}</span>` : ""}</div>
          ${done ? `<p class="clue">${esc(clue(x.id))}</p>` : `<p class="qmeta">${esc(x.hint)}</p><div class="stbody"></div>`}</li>`;
      }).join("");
      const open = root.querySelector(".station.open .stbody");
      if (open) mountStation(open.closest(".station").dataset.st, open);
    }
    const firstOpen = () => STATIONS.findIndex((x) => !st.done[x.id]);
    function finishStation(id, good) { st.done[id] = true; st.good[id] = good; save(); refresh(); }
    function mountStation(id, el) {
      if (id === "word") {
        let cur = [];
        const letters = [...g.scr];
        const draw = () => {
          el.innerHTML = `<div class="tiles">${letters.map((ch, i) => `<button class="lt${cur.includes(i) ? " used" : ""}" data-i="${i}">${ch}</button>`).join("")}</div>
            <div class="answer">${cur.map((i) => letters[i]).join("") || "&nbsp;"}</div>
            <div class="gbtns"><button class="ghost small" id="wback">⌫</button><button class="ghost small" id="wskip">${X("Reveal", "Revelar")}</button></div>`;
          el.querySelectorAll(".lt").forEach((b) => b.onclick = () => { const i = +b.dataset.i; if (cur.includes(i)) return; cur.push(i); if (cur.length === letters.length) { const w = cur.map((k) => letters[k]).join(""); if (w === g.word) return finishStation("word", true); cur = []; el.querySelector(".answer")?.classList.add("shake"); } draw(); });
          el.querySelector("#wback").onclick = () => { cur.pop(); draw(); };
          el.querySelector("#wskip").onclick = () => finishStation("word", false);
        };
        draw();
      } else if (id === "place") {
        el.innerHTML = `<p><b>${esc(g.mask(g.ev.q))}</b></p><div class="tapmap small"><svg role="img" aria-label="Map"></svg></div><div class="gbtns"><button class="qnext" disabled>${X("Lock in", "Confirmar")}</button></div>`;
        const svgEl = el.querySelector("svg"), btn = el.querySelector("button");
        const near = g.pl.lon >= 33.6 && g.pl.lon <= 37.2 && g.pl.lat >= 29.3 && g.pl.lat <= 33.9;
        const b = near ? [33.6, 29.3, 37.2, 33.9] : [9, 21, 56, 44];
        requestAnimationFrame(() => {
          const W = svgEl.clientWidth || 600, H = svgEl.clientHeight || 320;
          svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
          const proj = d3.geoMercator().fitSize([W, H], { type: "MultiPoint", coordinates: [[b[0], b[1]], [b[2], b[3]]] });
          const path = d3.geoPath(proj), svg = d3.select(svgEl);
          svg.append("rect").attr("class", "sea").attr("width", W).attr("height", H);
          svg.append("path").attr("class", "land").attr("d", path(GEO.land));
          svg.selectAll(".lake").data(GEO.water.features).join("path").attr("class", "lake").attr("d", path);
          let pin = null;
          svg.on("click", (e) => { const [x, y] = d3.pointer(e, svgEl); pin = proj.invert([x, y]); svg.selectAll(".pin").remove(); svg.append("circle").attr("class", "pin").attr("cx", x).attr("cy", y).attr("r", 6); btn.disabled = false; });
          btn.onclick = () => {
            const d = haversine(pin, [g.pl.lon, g.pl.lat]);
            const a = proj([g.pl.lon, g.pl.lat]);
            svg.append("circle").attr("class", "ans").attr("cx", a[0]).attr("cy", a[1]).attr("r", 6);
            btn.disabled = true;
            setTimeout(() => finishStation("place", d <= (near ? 25 : 300)), 900);
          };
        });
      } else if (id === "verse") {
        el.innerHTML = `<p class="vq">“${esc(g.verse.text)}” <span class="qmeta">${esc(C().refLabel(g.verse.ref))}</span></p><div class="qopts">${g.verse.opts.map((o) => `<button data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
        el.querySelectorAll("[data-o]").forEach((b) => b.onclick = () => finishStation("verse", b.dataset.o === g.verse.ans));
      } else if (id === "family") {
        const sel = new Set();
        const draw = () => {
          el.innerHTML = `<p>${X(`Choose the ${g.family.right.length} relatives of today's pilgrim.`, `Elige a los ${g.family.right.length} familiares del peregrino de hoy.`)}</p>
            <div class="chips">${g.family.opts.map((id) => `<button class="pchip${sel.has(id) ? " on" : ""}" data-f="${id}">${esc(P[id].name)}</button>`).join("")}</div>
            <div class="gbtns"><button class="qnext" id="fok" ${sel.size === g.family.right.length ? "" : "disabled"}>${X("Check", "Comprobar")}</button></div>`;
          el.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { const id = b.dataset.f; sel.has(id) ? sel.delete(id) : sel.size < g.family.right.length && sel.add(id); draw(); });
          el.querySelector("#fok").onclick = () => finishStation("family", g.family.right.every((id) => sel.has(id)));
        };
        draw();
      }
    }
    function drawGuess() {
      if (over()) { $("#pguess", root).innerHTML = ""; return; }
      const len = g.p.name.length;
      $("#pguess", root).innerHTML = `<form id="pgf" class="findform"><label for="pgi">${X("Who is the pilgrim?", "¿Quién es el peregrino?")}</label>
        <input id="pgi" autocomplete="off" maxlength="${len}" placeholder="${"_ ".repeat(len).trim()}" aria-label="${len} letters"><button class="qnext">${X("Guess", "Adivinar")}</button></form>
        <p class="qmeta">${len} ${X("letters", "letras")} · ${X("wrong guesses blow out a candle", "cada error apaga una vela")}${st.guesses.length ? ` · ${st.guesses.filter((x) => x !== "✓").map(esc).join(", ")}` : ""}</p>`;
      $("#pgf", root).onsubmit = (e) => {
        e.preventDefault();
        const v = $("#pgi", root).value.trim();
        if (!v) return;
        if (g.names.some((nm) => nm.toLowerCase() === v.toLowerCase())) { st.won = true; st.wonEarly = Object.keys(st.done).length < STATIONS.length; st.guesses.push("✓"); for (const x of STATIONS) st.done[x.id] = true; }
        else st.guesses.push(v);
        save(); refresh();
      };
    }
    function finish() {
      if (!over()) { $("#pdone", root).innerHTML = ""; return; }
      const c = candles();
      if (!playedToday("pilgrim")) record("pilgrim", { won: st.won, candles: c });
      $("#pdone", root).innerHTML = `<div class="qcard"><span class="eyebrow">${st.won ? X("You found today's pilgrim", "Encontraste al peregrino de hoy") : X("Today's pilgrim was", "El peregrino de hoy era")}</span>
        <h2>${esc(g.p.name)}</h2><p>${esc(g.p.summary)}</p><div class="chips">${C().chip(g.p.id)}</div>
        <p class="qmeta">${c} / ${maxC} ${X("candles", "velas")} · ${X("Streak", "Racha")}: ${streak("pilgrim")}</p>
        <button class="qnext" id="pshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#pshare", root).onclick = (e) => share(`The Daily Catholic · ${X("Pilgrimage", "Peregrinación")} #${n}\n${STATIONS.map((x) => (st.good[x.id] ? "🕯️" : "▫️")).join("")}${st.won ? (st.wonEarly ? " ✨" : " ✝️") : " ✖️"}  ${c}/${maxC}\n${SITE}`, e.target);
    }
    function refresh() { drawCandles(); drawStations(); drawGuess(); finish(); }
    refresh();
  }

  /* =====================================================================
     HUB
     ===================================================================== */
  const GAMES = [
    { id: "pilgrim", get name() { return X("Pilgrimage", "Peregrinación"); }, get desc() { return X("Our signature game: four stations, one hidden figure from Scripture.", "Nuestro juego principal: cuatro estaciones, un personaje bíblico oculto."); }, needs: "places" },
    { id: "loaves", name: "Five Loaves", get desc() { return X("Guess the five-letter word of faith in six tries.", "Adivina la palabra de fe de cinco letras en seis intentos."); }, needs: "wordle" },
    { id: "threads", name: "Threads", get desc() { return X("Find the hidden names in a grid of letters. One golden thread names today's theme.", "Encuentra los nombres ocultos en una cuadrícula de letras. Un hilo de oro nombra el tema."); }, needs: "themes" },
    { id: "links", name: "Lineage Links", get desc() { return X("Sixteen people, four hidden groups. Find what connects them.", "Dieciséis personas, cuatro grupos ocultos. Descubre qué los une."); }, needs: "themes" },
    { id: "acrostic", name: "Hidden Name", get desc() { return X("Solve the clues; their first letters spell a mystery figure.", "Resuelve las pistas; sus primeras letras forman un nombre misterioso."); }, needs: null },
    { id: "tap", name: "Holy Land Tap", get desc() { return X("Five moments from Scripture. Tap where on the map they happened.", "Cinco momentos de la Escritura. Toca en el mapa dónde ocurrieron."); }, needs: "places" },
    { id: "quiz", get name() { return X("Daily Quiz", "Quiz diario"); }, get desc() { return X("Five questions on who's who, in three difficulty levels.", "Cinco preguntas sobre personajes bíblicos, en tres niveles."); }, needs: null },
  ];
  function renderHub(root) {
    const ctx = C();
    const explored = ctx.explored();
    const badges = ctx.badges();
    root.innerHTML = `<div class="hub">
      <div class="ghead"><h1>${X("Play", "Jugar")}</h1><span class="qmeta">${new Date().toLocaleDateString(window.I18N?.locale(), { weekday: "long", month: "long", day: "numeric" })} · new puzzles every day</span></div>
      <div class="gcards">${GAMES.map((g) => {
        const done = playedToday(g.id), s = streak(g.id);
        return `<button class="gcard" data-go="${g.id}"><span class="gname">${g.name}</span><span class="gdesc">${g.desc}</span>
          <span class="gstat">${done ? X("✓ Played today", "✓ Jugado hoy") : X("Ready", "Listo")}${s ? ` · ${X(`${s}-day streak`, `racha de ${s} días`)}` : ""}</span></button>`;
      }).join("")}</div>
      <h2>${X("Your progress", "Tu progreso")}</h2>
      <p class="qmeta">${X(`You've opened ${explored} of ${ctx.PEOPLE.length} people.`, `Has abierto ${explored} de ${ctx.PEOPLE.length} personas.`)}</p>
      <div class="badges">${badges.map((b) => `<div class="badge${b.got ? " got" : ""}"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join("")}</div>
    </div>`;
  }

  async function mount(view, root) {
    try {
      if (view === "play") return renderHub(root);
      if (view === "threads" || view === "links") { await themes(); return view === "threads" ? renderThreads(root) : renderLinks(root); }
      if (view === "acrostic") return renderAcrostic(root);
      if (view === "loaves") return renderLoaves(root);
      if (view === "pilgrim") return renderPilgrimage(root);
      if (view === "tap") return renderTap(root);
    } catch (e) {
      root.innerHTML = `<p class="loading">This game could not load (${esc(e.message)}). Reload to try again.</p>`;
    }
  }
  window.BPM_GAMES = { mount, playedToday, streak, GAMES, dayKey, _score: scoreGuess, _pilgrim: (d) => pickPilgrim(d), _build: { threads: buildThreads, links: buildLinks, acrostic: buildAcrostic } };
})();
